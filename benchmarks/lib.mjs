import { createHash } from "node:crypto";

const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT_SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const OPAQUE_ARTIFACT_ID = /^[A-Z0-9_-]{12,64}$/;
const MAX_REPORTED_ISSUES = 100;

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const isInteger = (value) => Number.isInteger(value);
const asTimestamp = (value) => {
  if (!isText(value)) return Number.NaN;
  return Date.parse(value);
};
const pairKey = (left, right) => [left, right].sort().join("::");
const slotKey = (briefId, variantId, repetition) =>
  `${briefId}::${variantId}::${repetition}`;
const sha256 = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

function createVariantMappingHash(runs, salt) {
  const mapping = (runs ?? [])
    .map((run) =>
      [
        run.blindArtifactId,
        run.briefId,
        run.repetition,
        run.variantId
      ].join("::")
    )
    .sort()
    .join("\n");
  return sha256(`${salt}\n${mapping}`);
}

function addIssue(collection, path, message) {
  collection.push({ path, message });
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function providerReportedTokens(tokens) {
  return (
    isObject(tokens?.provenance) &&
    tokens.provenance.source === "provider-reported" &&
    isText(tokens.provenance.provider)
  );
}

function runQualityIndex(run, requiredMetrics) {
  const normalized = [];
  for (const [metric, range] of Object.entries(requiredMetrics ?? {})) {
    const [minimum, maximum] = range;
    const value = run.metrics?.[metric];
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      maximum <= minimum
    ) {
      return null;
    }
    normalized.push(((value - minimum) / (maximum - minimum)) * 10);
  }
  return normalized.length ? round(mean(normalized)) : null;
}

function wilson95(score, count) {
  if (!count) return [null, null];
  const z = 1.959963984540054;
  const proportion = score / count;
  const denominator = 1 + (z ** 2) / count;
  const center = (proportion + (z ** 2) / (2 * count)) / denominator;
  const spread =
    (z / denominator) *
    Math.sqrt(
      (proportion * (1 - proportion)) / count +
        (z ** 2) / (4 * count ** 2)
    );
  return [round(Math.max(0, center - spread)), round(Math.min(1, center + spread))];
}

function validateProtocol(protocol, briefs, errors) {
  if (!isObject(protocol)) {
    addIssue(errors, "protocol", "Protocol must be an object.");
    return;
  }
  if (!isText(protocol.version)) {
    addIssue(errors, "protocol.version", "A protocol version is required.");
  }
  const variantIds = Object.keys(protocol.variants ?? {});
  if (variantIds.length < 2) {
    addIssue(errors, "protocol.variants", "At least two variants are required.");
  }
  const repetitions = protocol.runPolicy?.independentRunsPerCell;
  if (!isInteger(repetitions) || repetitions < 1) {
    addIssue(
      errors,
      "protocol.runPolicy.independentRunsPerCell",
      "Independent runs per cell must be a positive integer."
    );
  }
  const minimumRaters = protocol.blindEvaluation?.minimumRatersPerPair;
  if (!isInteger(minimumRaters) || minimumRaters < 1) {
    addIssue(
      errors,
      "protocol.blindEvaluation.minimumRatersPerPair",
      "Minimum raters per pair must be a positive integer."
    );
  }
  if (!Array.isArray(briefs) || !briefs.length) {
    addIssue(errors, "briefs", "At least one benchmark brief is required.");
  }
  const seenBriefs = new Set();
  for (const [index, brief] of (briefs ?? []).entries()) {
    const location = `briefs[${index}]`;
    if (!isText(brief?.id) || seenBriefs.has(brief.id)) {
      addIssue(errors, `${location}.id`, "Brief IDs must be non-empty and unique.");
    } else {
      seenBriefs.add(brief.id);
    }
    if (!isText(brief?.prompt)) {
      addIssue(errors, `${location}.prompt`, "A canonical prompt is required.");
    }
  }
}

function validateRun(run, index, context) {
  const { protocol, briefsById, variantIds, errors } = context;
  const location = `results.runs[${index}]`;
  const before = errors.length;
  if (!isObject(run)) {
    addIssue(errors, location, "Run must be an object.");
    return false;
  }
  if (!isText(run.id)) addIssue(errors, `${location}.id`, "Run ID is required.");
  if (!briefsById.has(run.briefId)) {
    addIssue(errors, `${location}.briefId`, "Run references an unknown brief.");
  }
  if (!variantIds.includes(run.variantId)) {
    addIssue(errors, `${location}.variantId`, "Run references an unknown variant.");
  }
  const repetitions = protocol.runPolicy.independentRunsPerCell;
  if (!isInteger(run.repetition) || run.repetition < 1 || run.repetition > repetitions) {
    addIssue(
      errors,
      `${location}.repetition`,
      `Repetition must be between 1 and ${repetitions}.`
    );
  }
  if (
    !isText(run.blindArtifactId) ||
    !OPAQUE_ARTIFACT_ID.test(run.blindArtifactId)
  ) {
    addIssue(
      errors,
      `${location}.blindArtifactId`,
      "A 12–64 character opaque artifact ID is required."
    );
  } else {
    const normalizedId = run.blindArtifactId.toLowerCase();
    const leakedVariant = variantIds.find((variantId) =>
      normalizedId.includes(variantId.toLowerCase())
    );
    if (leakedVariant) {
      addIssue(
        errors,
        `${location}.blindArtifactId`,
        `Artifact ID leaks variant identity (${leakedVariant}).`
      );
    }
  }

  for (const [metric, range] of Object.entries(
    protocol.runPolicy.requiredMetrics ?? {}
  )) {
    const value = run.metrics?.[metric];
    if (
      !Number.isFinite(value) ||
      value < range[0] ||
      value > range[1]
    ) {
      addIssue(
        errors,
        `${location}.metrics.${metric}`,
        `Metric must be a finite number from ${range[0]} to ${range[1]}.`
      );
    }
  }

  const evidence = run.evidence;
  if (!isObject(evidence)) {
    addIssue(errors, `${location}.evidence`, "Structured run evidence is required.");
    return false;
  }

  const brief = briefsById.get(run.briefId);
  const prompt = evidence.prompt;
  if (!isObject(prompt) || !isText(prompt.text) || !SHA256.test(prompt.sha256 ?? "")) {
    addIssue(
      errors,
      `${location}.evidence.prompt`,
      "Prompt text and a SHA-256 digest are required."
    );
  } else {
    if (brief && prompt.text !== brief.prompt) {
      addIssue(
        errors,
        `${location}.evidence.prompt.text`,
        "Run prompt does not match the canonical brief prompt."
      );
    }
    if (sha256(prompt.text) !== prompt.sha256.toLowerCase()) {
      addIssue(
        errors,
        `${location}.evidence.prompt.sha256`,
        "Prompt SHA-256 does not match its text."
      );
    }
  }

  const commit = evidence.commit;
  if (
    !isObject(commit) ||
    !COMMIT_SHA.test(commit.sha ?? "") ||
    !isText(commit.repository) ||
    commit.dirty !== false
  ) {
    addIssue(
      errors,
      `${location}.evidence.commit`,
      "A repository, valid commit SHA, and dirty=false are required."
    );
  }

  for (const [viewport, dimensions] of Object.entries(
    protocol.runPolicy.requiredScreenshots ?? {}
  )) {
    const screenshot = evidence.screenshots?.[viewport];
    if (
      !isObject(screenshot) ||
      !isText(screenshot.path) ||
      !SHA256.test(screenshot.sha256 ?? "") ||
      screenshot.width !== dimensions.width ||
      screenshot.height !== dimensions.height
    ) {
      addIssue(
        errors,
        `${location}.evidence.screenshots.${viewport}`,
        `A ${dimensions.width}×${dimensions.height} screenshot path and SHA-256 are required.`
      );
    }
  }

  const timing = evidence.timing;
  const startedAt = asTimestamp(timing?.startedAt);
  const finishedAt = asTimestamp(timing?.finishedAt);
  if (
    !isObject(timing) ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(finishedAt) ||
    finishedAt <= startedAt ||
    !Number.isFinite(timing.elapsedMs) ||
    timing.elapsedMs <= 0 ||
    Math.abs(finishedAt - startedAt - timing.elapsedMs) > 1000
  ) {
    addIssue(
      errors,
      `${location}.evidence.timing`,
      "Valid start/finish timestamps and a consistent positive elapsedMs are required."
    );
  }

  const tokens = evidence.tokens;
  if (
    !isObject(tokens) ||
    !isInteger(tokens.input) ||
    tokens.input < 0 ||
    !isInteger(tokens.output) ||
    tokens.output < 0 ||
    !isInteger(tokens.total) ||
    tokens.total !== tokens.input + tokens.output
  ) {
    addIssue(
      errors,
      `${location}.evidence.tokens`,
      "Non-negative integer input/output tokens and their exact total are required."
    );
  }

  const criticReports = evidence.criticReports;
  if (!Array.isArray(criticReports)) {
    addIssue(
      errors,
      `${location}.evidence.criticReports`,
      "Critic reports must be an array."
    );
  } else {
    const seenCritics = new Set();
    for (const [criticIndex, report] of criticReports.entries()) {
      const reportLocation = `${location}.evidence.criticReports[${criticIndex}]`;
      if (!isText(report?.criticId) || seenCritics.has(report.criticId)) {
        addIssue(
          errors,
          `${reportLocation}.criticId`,
          "Critic IDs must be non-empty and unique per run."
        );
      } else {
        seenCritics.add(report.criticId);
      }
      if (
        !isText(report?.version) ||
        !isText(report?.reportPath) ||
        !SHA256.test(report?.sha256 ?? "") ||
        !isInteger(report?.findingCount) ||
        report.findingCount < 0 ||
        !isInteger(report?.criticalCount) ||
        report.criticalCount < 0 ||
        report.criticalCount > report.findingCount ||
        !Number.isFinite(report?.score) ||
        report.score < 0 ||
        report.score > 10
      ) {
        addIssue(
          errors,
          reportLocation,
          "Each critic report needs versioned, hashed evidence and valid finding counts/score."
        );
      }
    }
    for (const criticId of protocol.runPolicy.requiredCritics ?? []) {
      if (!seenCritics.has(criticId)) {
        addIssue(
          errors,
          `${location}.evidence.criticReports`,
          `Missing required critic report: ${criticId}.`
        );
      }
    }
  }

  const regression = evidence.regressionNotes;
  if (
    !isObject(regression) ||
    !["none", "improved", "regressed"].includes(regression.status) ||
    !Array.isArray(regression.notes) ||
    !regression.notes.length ||
    regression.notes.some((note) => !isText(note)) ||
    !isInteger(regression.criticalRegressions) ||
    regression.criticalRegressions < 0
  ) {
    addIssue(
      errors,
      `${location}.evidence.regressionNotes`,
      "Regression status, non-empty notes, and critical regression count are required."
    );
  }
  return errors.length === before;
}

function validateRating(rating, index, context) {
  const {
    errors,
    protocol,
    validArtifacts,
    sealedAt,
    ratingsClosedAt,
    mappingRevealedAt
  } = context;
  const location = `results.pairwiseRatings[${index}]`;
  const before = errors.length;
  if (!isObject(rating)) {
    addIssue(errors, location, "Rating must be an object.");
    return false;
  }
  for (const forbiddenKey of [
    "variant",
    "variantId",
    "leftVariantId",
    "rightVariantId",
    "variantLabel"
  ]) {
    if (forbiddenKey in rating) {
      addIssue(
        errors,
        `${location}.${forbiddenKey}`,
        "Blind ratings must not contain variant identity."
      );
    }
  }
  if (!isText(rating.id)) addIssue(errors, `${location}.id`, "Rating ID is required.");
  if (!isText(rating.raterId)) {
    addIssue(errors, `${location}.raterId`, "Independent rater ID is required.");
  }
  const left = validArtifacts.get(rating.leftArtifactId);
  const right = validArtifacts.get(rating.rightArtifactId);
  if (!left || !right || left === right) {
    addIssue(
      errors,
      `${location}.leftArtifactId`,
      "Rating must reference two different valid blind artifacts."
    );
  } else if (
    left.briefId !== right.briefId ||
    left.repetition !== right.repetition ||
    left.variantId === right.variantId
  ) {
    addIssue(
      errors,
      location,
      "Paired artifacts must share a brief/repetition and represent different variants."
    );
  }
  if (
    left &&
    (rating.briefId !== left.briefId || rating.repetition !== left.repetition)
  ) {
    addIssue(
      errors,
      `${location}.briefId`,
      "Rating brief/repetition must match its artifacts."
    );
  }
  if (!["left", "right", "tie"].includes(rating.preference)) {
    addIssue(
      errors,
      `${location}.preference`,
      "Pairwise preference must be left, right, or tie."
    );
  }
  for (const dimension of protocol.blindEvaluation.requiredDimensions ?? []) {
    if (!["left", "right", "tie"].includes(rating.dimensionChoices?.[dimension])) {
      addIssue(
        errors,
        `${location}.dimensionChoices.${dimension}`,
        "Every required dimension needs a left, right, or tie choice."
      );
    }
  }
  for (const side of ["left", "right"]) {
    const likelihood = rating.aiGeneratedLikelihood?.[side];
    if (!Number.isFinite(likelihood) || likelihood < 0 || likelihood > 100) {
      addIssue(
        errors,
        `${location}.aiGeneratedLikelihood.${side}`,
        "AI-generated likelihood must be from 0 to 100."
      );
    }
    if (typeof rating.fiveMinuteRecall?.[side] !== "boolean") {
      addIssue(
        errors,
        `${location}.fiveMinuteRecall.${side}`,
        "Five-minute recall must be recorded as a boolean."
      );
    }
    const intent = rating.saveShareIntent?.[side];
    if (!isInteger(intent) || intent < 1 || intent > 5) {
      addIssue(
        errors,
        `${location}.saveShareIntent.${side}`,
        "Save/share intent must be an integer from 1 to 5."
      );
    }
  }
  if (
    !Number.isFinite(rating.fiveMinuteRecall?.delayMinutes) ||
    rating.fiveMinuteRecall.delayMinutes < 5 ||
    !isText(rating.fiveMinuteRecall?.notes)
  ) {
    addIssue(
      errors,
      `${location}.fiveMinuteRecall`,
      "Recall must be tested after at least five minutes with non-empty notes."
    );
  }
  const submittedAt = asTimestamp(rating.submittedAt);
  if (
    !Number.isFinite(submittedAt) ||
    !Number.isFinite(sealedAt) ||
    !Number.isFinite(ratingsClosedAt) ||
    !Number.isFinite(mappingRevealedAt) ||
    submittedAt <= sealedAt ||
    submittedAt > ratingsClosedAt ||
    submittedAt >= mappingRevealedAt
  ) {
    addIssue(
      errors,
      `${location}.submittedAt`,
      "Rating must be submitted after sealing and before ratings close/mapping reveal."
    );
  }
  return errors.length === before;
}

function buildAnalysis(validRuns, validRatings, protocol) {
  const variantIds = Object.keys(protocol.variants);
  const referenceVariantId =
    protocol.efficiency?.referenceVariantId ??
    (variantIds.includes("base")
      ? "base"
      : variantIds.find(
          (variantId) => protocol.variants[variantId]?.reference === true
        ) ?? null);
  const requiredMetrics = protocol.runPolicy.requiredMetrics ?? {};
  const runsBySlot = new Map(
    validRuns.map((run) => [
      slotKey(run.briefId, run.variantId, run.repetition),
      run
    ])
  );
  const aggregates = new Map(
    variantIds.map((variantId) => [
      variantId,
      {
        variantId,
        label: protocol.variants[variantId].label,
        wins: 0,
        ties: 0,
        losses: 0,
        ai: [],
        recall: [],
        saveShare: [],
        tokens: [],
        elapsedMs: [],
        qualityIndices: [],
        criticalRegressions: 0,
        perBrief: new Map(),
        dimensions: new Map()
      }
    ])
  );
  const artifactToRun = new Map(
    validRuns.map((run) => [run.blindArtifactId, run])
  );
  for (const run of validRuns) {
    const aggregate = aggregates.get(run.variantId);
    aggregate.tokens.push(run.evidence.tokens.total);
    aggregate.elapsedMs.push(run.evidence.timing.elapsedMs);
    const qualityIndex = runQualityIndex(run, requiredMetrics);
    if (qualityIndex !== null) aggregate.qualityIndices.push(qualityIndex);
    aggregate.criticalRegressions +=
      run.evidence.regressionNotes.criticalRegressions;
  }

  const comparisonMap = new Map();
  for (const rating of validRatings) {
    const leftRun = artifactToRun.get(rating.leftArtifactId);
    const rightRun = artifactToRun.get(rating.rightArtifactId);
    if (!leftRun || !rightRun) continue;
    const leftAggregate = aggregates.get(leftRun.variantId);
    const rightAggregate = aggregates.get(rightRun.variantId);
    leftAggregate.ai.push(rating.aiGeneratedLikelihood.left);
    rightAggregate.ai.push(rating.aiGeneratedLikelihood.right);
    leftAggregate.recall.push(Number(rating.fiveMinuteRecall.left));
    rightAggregate.recall.push(Number(rating.fiveMinuteRecall.right));
    leftAggregate.saveShare.push(rating.saveShareIntent.left);
    rightAggregate.saveShare.push(rating.saveShareIntent.right);

    const updateDimension = (aggregate, dimension, outcome) => {
      const current = aggregate.dimensions.get(dimension) ?? {
        wins: 0,
        ties: 0,
        losses: 0
      };
      current[outcome] += 1;
      aggregate.dimensions.set(dimension, current);
    };
    for (const dimension of protocol.blindEvaluation.requiredDimensions ?? []) {
      const choice = rating.dimensionChoices[dimension];
      if (choice === "left") {
        updateDimension(leftAggregate, dimension, "wins");
        updateDimension(rightAggregate, dimension, "losses");
      } else if (choice === "right") {
        updateDimension(rightAggregate, dimension, "wins");
        updateDimension(leftAggregate, dimension, "losses");
      } else {
        updateDimension(leftAggregate, dimension, "ties");
        updateDimension(rightAggregate, dimension, "ties");
      }
    }

    const updateBrief = (aggregate, outcome) => {
      const current = aggregate.perBrief.get(rating.briefId) ?? {
        wins: 0,
        ties: 0,
        losses: 0
      };
      current[outcome] += 1;
      aggregate.perBrief.set(rating.briefId, current);
    };
    if (rating.preference === "left") {
      leftAggregate.wins += 1;
      rightAggregate.losses += 1;
      updateBrief(leftAggregate, "wins");
      updateBrief(rightAggregate, "losses");
    } else if (rating.preference === "right") {
      rightAggregate.wins += 1;
      leftAggregate.losses += 1;
      updateBrief(rightAggregate, "wins");
      updateBrief(leftAggregate, "losses");
    } else {
      leftAggregate.ties += 1;
      rightAggregate.ties += 1;
      updateBrief(leftAggregate, "ties");
      updateBrief(rightAggregate, "ties");
    }

    const orderedVariants = [leftRun.variantId, rightRun.variantId].sort();
    const comparisonId = pairKey(...orderedVariants);
    const comparison =
      comparisonMap.get(comparisonId) ?? {
        leftVariantId: orderedVariants[0],
        rightVariantId: orderedVariants[1],
        leftWins: 0,
        rightWins: 0,
        ties: 0
      };
    if (rating.preference === "tie") {
      comparison.ties += 1;
    } else {
      const winner =
        rating.preference === "left" ? leftRun.variantId : rightRun.variantId;
      if (winner === comparison.leftVariantId) comparison.leftWins += 1;
      else comparison.rightWins += 1;
    }
    comparisonMap.set(comparisonId, comparison);
  }

  const rankings = [...aggregates.values()]
    .map((aggregate) => {
      const comparisons = aggregate.wins + aggregate.ties + aggregate.losses;
      const weightedScore = aggregate.wins + aggregate.ties * 0.5;
      const perBriefWinRate = Object.fromEntries(
        [...aggregate.perBrief.entries()].map(([briefId, result]) => {
          const count = result.wins + result.ties + result.losses;
          return [
            briefId,
            round((result.wins + result.ties * 0.5) / count)
          ];
        })
      );
      const dimensionWinRates = Object.fromEntries(
        [...aggregate.dimensions.entries()].map(([dimension, result]) => {
          const count = result.wins + result.ties + result.losses;
          return [
            dimension,
            round((result.wins + result.ties * 0.5) / count)
          ];
        })
      );
      const variantRuns = validRuns.filter(
        (run) => run.variantId === aggregate.variantId
      );
      const pairedRuns = variantRuns.map((run) => ({
        run,
        referenceRun: referenceVariantId
          ? runsBySlot.get(
              slotKey(run.briefId, referenceVariantId, run.repetition)
            )
          : null
      }));
      const comparableEvidence =
        Boolean(referenceVariantId) &&
        pairedRuns.length > 0 &&
        pairedRuns.every(
          ({ run, referenceRun }) =>
            Boolean(referenceRun) &&
            runQualityIndex(run, requiredMetrics) !== null &&
            runQualityIndex(referenceRun, requiredMetrics) !== null
        );
      const pairedProviderTokenEvidence =
        comparableEvidence &&
        pairedRuns.every(
          ({ run, referenceRun }) =>
            providerReportedTokens(run.evidence.tokens) &&
            providerReportedTokens(referenceRun.evidence.tokens)
        );
      const pairedEfficiency = [];
      let efficiencyReason = null;
      if (!referenceVariantId) {
        efficiencyReason =
          "No reference variant is configured for relative efficiency.";
      } else if (!comparableEvidence) {
        efficiencyReason =
          "Comparable reference quality evidence is missing for one or more run slots.";
      } else if (!pairedProviderTokenEvidence) {
        efficiencyReason =
          "Provider-reported token provenance is missing for one or more paired runs.";
      } else {
        for (const { run, referenceRun } of pairedRuns) {
          const qualityIndex = runQualityIndex(run, requiredMetrics);
          const referenceQualityIndex = runQualityIndex(
            referenceRun,
            requiredMetrics
          );
          const minutes = run.evidence.timing.elapsedMs / 60_000;
          const tokenUnits = run.evidence.tokens.total / 10_000;
          if (minutes <= 0 || tokenUnits <= 0) {
            efficiencyReason =
              "Positive elapsed time and provider-reported token usage are required.";
            break;
          }
          const qualityGain = qualityIndex - referenceQualityIndex;
          pairedEfficiency.push({
            qualityGain,
            qualityGainPerMinute: qualityGain / minutes,
            qualityGainPer10kProviderTokens: qualityGain / tokenUnits,
            qualityGainPerMinutePer10kProviderTokens:
              qualityGain / (minutes * tokenUnits)
          });
        }
      }
      const efficiencyComputable =
        efficiencyReason === null &&
        variantRuns.length > 0 &&
        pairedEfficiency.length === variantRuns.length;
      return {
        variantId: aggregate.variantId,
        label: aggregate.label,
        pairwise: {
          wins: aggregate.wins,
          ties: aggregate.ties,
          losses: aggregate.losses,
          weightedWinRate: round(weightedScore / comparisons),
          wilson95: wilson95(weightedScore, comparisons),
          perBriefWinRate,
          dimensionWinRates
        },
        humanSignals: {
          meanAiGeneratedLikelihood: round(mean(aggregate.ai), 2),
          fiveMinuteRecallRate: round(mean(aggregate.recall)),
          meanSaveShareIntent: round(mean(aggregate.saveShare), 2)
        },
        efficiency: {
          medianTokens: median(aggregate.tokens),
          medianElapsedMs: median(aggregate.elapsedMs),
          qualityIndex: {
            median: median(aggregate.qualityIndices),
            scale: [0, 10],
            metrics: Object.keys(requiredMetrics),
            evidence: "required-run-metrics"
          },
          relativeToReference: {
            status: efficiencyComputable ? "computable" : "not-computable",
            referenceVariantId,
            comparablePairs: efficiencyComputable
              ? pairedEfficiency.length
              : 0,
            comparableEvidence,
            providerTokenEvidence: pairedProviderTokenEvidence,
            qualityGain: efficiencyComputable
              ? round(median(pairedEfficiency.map((entry) => entry.qualityGain)))
              : null,
            qualityGainPerMinute: efficiencyComputable
              ? round(
                  median(
                    pairedEfficiency.map(
                      (entry) => entry.qualityGainPerMinute
                    )
                  )
                )
              : null,
            qualityGainPer10kProviderTokens: efficiencyComputable
              ? round(
                  median(
                    pairedEfficiency.map(
                      (entry) => entry.qualityGainPer10kProviderTokens
                    )
                  )
                )
              : null,
            qualityGainPerMinutePer10kProviderTokens: efficiencyComputable
              ? round(
                  median(
                    pairedEfficiency.map(
                      (entry) =>
                        entry.qualityGainPerMinutePer10kProviderTokens
                    )
                  )
                )
              : null,
            reason: efficiencyComputable ? null : efficiencyReason,
            claimBoundary:
              "Cost-normalized benchmark summaries are descriptive and do not establish profile or product superiority."
          }
        },
        criticalRegressions: aggregate.criticalRegressions
      };
    })
    .sort(
      (left, right) =>
        right.pairwise.weightedWinRate - left.pairwise.weightedWinRate ||
        left.humanSignals.meanAiGeneratedLikelihood -
          right.humanSignals.meanAiGeneratedLikelihood
    )
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  const comparisons = [...comparisonMap.values()].map((comparison) => {
    const total =
      comparison.leftWins + comparison.rightWins + comparison.ties;
    return {
      ...comparison,
      ratings: total,
      leftWeightedWinRate: round(
        (comparison.leftWins + comparison.ties * 0.5) / total
      ),
      rightWeightedWinRate: round(
        (comparison.rightWins + comparison.ties * 0.5) / total
      )
    };
  });
  return {
    rankings,
    comparisons,
    efficiencyPolicy: {
      referenceVariantId,
      qualityIndex:
        "Mean of required run metrics normalized to a 0-10 scale, then summarized by median.",
      comparison:
        "Quality gain is paired by brief and repetition against the configured reference variant.",
      providerTokenRequirement:
        "Token-normalized values require evidence.tokens.provenance.source=provider-reported and a named provider on both paired runs.",
      claimBoundary:
        "Efficiency metrics are descriptive for this complete benchmark corpus and authorize no superiority claim."
    }
  };
}

function evaluateClaimGate(analysis, protocol, complete) {
  const gate = protocol.claimGate;
  const reasons = [];
  if (!complete || !analysis) {
    return {
      qualityClaimAllowed: false,
      subjectVariantId: gate.subjectVariantId,
      reasons: ["The evidence corpus is incomplete or invalid."],
      scope: gate.claimLanguage
    };
  }
  const subject = analysis.rankings.find(
    (entry) => entry.variantId === gate.subjectVariantId
  );
  if (!subject) {
    reasons.push("The claim subject is missing from analysis.");
  } else {
    if (
      subject.pairwise.weightedWinRate < gate.minimumOverallPairwiseWinRate
    ) {
      reasons.push(
        `Overall pairwise win rate ${subject.pairwise.weightedWinRate} is below ${gate.minimumOverallPairwiseWinRate}.`
      );
    }
    if (subject.pairwise.wilson95[0] < gate.minimumWilson95LowerBound) {
      reasons.push(
        `Wilson 95% lower bound ${subject.pairwise.wilson95[0]} is below ${gate.minimumWilson95LowerBound}.`
      );
    }
    for (const [briefId, rate] of Object.entries(
      subject.pairwise.perBriefWinRate
    )) {
      if (rate < gate.minimumPerBriefWinRate) {
        reasons.push(
          `${briefId} pairwise win rate ${rate} is below ${gate.minimumPerBriefWinRate}.`
        );
      }
    }
    if (
      subject.humanSignals.meanAiGeneratedLikelihood >
      gate.maximumAiGeneratedLikelihood
    ) {
      reasons.push(
        `AI-generated likelihood ${subject.humanSignals.meanAiGeneratedLikelihood} exceeds ${gate.maximumAiGeneratedLikelihood}.`
      );
    }
    if (
      subject.humanSignals.fiveMinuteRecallRate <
      gate.minimumFiveMinuteRecallRate
    ) {
      reasons.push(
        `Five-minute recall ${subject.humanSignals.fiveMinuteRecallRate} is below ${gate.minimumFiveMinuteRecallRate}.`
      );
    }
    if (
      subject.humanSignals.meanSaveShareIntent <
      gate.minimumSaveShareIntent
    ) {
      reasons.push(
        `Save/share intent ${subject.humanSignals.meanSaveShareIntent} is below ${gate.minimumSaveShareIntent}.`
      );
    }
    if (subject.criticalRegressions > gate.maximumCriticalRegressions) {
      reasons.push(
        `Critical regressions ${subject.criticalRegressions} exceed ${gate.maximumCriticalRegressions}.`
      );
    }
  }
  for (const comparison of analysis.comparisons) {
    if (
      comparison.leftVariantId !== gate.subjectVariantId &&
      comparison.rightVariantId !== gate.subjectVariantId
    ) {
      continue;
    }
    const rate =
      comparison.leftVariantId === gate.subjectVariantId
        ? comparison.leftWeightedWinRate
        : comparison.rightWeightedWinRate;
    const opponent =
      comparison.leftVariantId === gate.subjectVariantId
        ? comparison.rightVariantId
        : comparison.leftVariantId;
    if (rate < gate.minimumHeadToHeadWinRate) {
      reasons.push(
        `Head-to-head win rate against ${opponent} (${rate}) is below ${gate.minimumHeadToHeadWinRate}.`
      );
    }
  }
  return {
    qualityClaimAllowed: reasons.length === 0,
    subjectVariantId: gate.subjectVariantId,
    reasons:
      reasons.length > 0
        ? reasons
        : ["Every evidence, blinding, coverage, and quality threshold passed."],
    scope: gate.claimLanguage
  };
}

export function analyzeBenchmark({ protocol, briefs, results }) {
  const errors = [];
  const warnings = [];
  validateProtocol(protocol, briefs, errors);
  const variantIds = Object.keys(protocol?.variants ?? {});
  const repetitions = protocol?.runPolicy?.independentRunsPerCell ?? 0;
  const minimumRaters =
    protocol?.blindEvaluation?.minimumRatersPerPair ?? 0;
  const expectedRuns = (briefs?.length ?? 0) * variantIds.length * repetitions;
  const variantPairs = (variantIds.length * (variantIds.length - 1)) / 2;
  const expectedRatings =
    (briefs?.length ?? 0) *
    repetitions *
    variantPairs *
    minimumRaters;

  let dataset = results;
  if (Array.isArray(dataset)) {
    addIssue(
      errors,
      "results",
      "Legacy run arrays are not claimable; use the versioned dataset object."
    );
    dataset = { runs: dataset, pairwiseRatings: [] };
  }
  if (!isObject(dataset)) {
    addIssue(errors, "results", "Results must be a versioned dataset object.");
    dataset = { runs: [], pairwiseRatings: [] };
  }
  if (dataset.protocolVersion !== protocol?.version) {
    addIssue(
      errors,
      "results.protocolVersion",
      `Dataset must declare protocolVersion ${protocol?.version}.`
    );
  }
  if (!isText(dataset.benchmarkId)) {
    addIssue(errors, "results.benchmarkId", "Benchmark dataset ID is required.");
  }
  if (!Array.isArray(dataset.runs)) {
    addIssue(errors, "results.runs", "Runs must be an array.");
    dataset.runs = [];
  }
  if (!Array.isArray(dataset.pairwiseRatings)) {
    addIssue(
      errors,
      "results.pairwiseRatings",
      "Pairwise ratings must be an array."
    );
    dataset.pairwiseRatings = [];
  }

  const blinding = dataset.blinding;
  const sealedAt = asTimestamp(blinding?.mappingSealedAt);
  const ratingsClosedAt = asTimestamp(blinding?.ratingsClosedAt);
  const mappingRevealedAt = asTimestamp(blinding?.mappingRevealedAt);
  if (
    !isObject(blinding) ||
    blinding.method !== protocol?.blindEvaluation?.method ||
    !SHA256.test(blinding.evaluatorPacketHash ?? "") ||
    !SHA256.test(blinding.variantMappingHash ?? "") ||
    !isText(blinding.variantMappingSalt) ||
    blinding.variantMappingSalt.length < 32 ||
    !Number.isFinite(sealedAt) ||
    !Number.isFinite(ratingsClosedAt) ||
    !Number.isFinite(mappingRevealedAt) ||
    !(sealedAt < ratingsClosedAt && ratingsClosedAt < mappingRevealedAt)
  ) {
    addIssue(
      errors,
      "results.blinding",
      "Valid hashes and seal < close < reveal chronology are required for blind evaluation."
    );
  }
  if (
    isText(blinding?.variantMappingSalt) &&
    SHA256.test(blinding?.variantMappingHash ?? "") &&
    createVariantMappingHash(dataset.runs, blinding.variantMappingSalt) !==
      blinding.variantMappingHash.toLowerCase()
  ) {
    addIssue(
      errors,
      "results.blinding.variantMappingHash",
      "Salted mapping commitment does not match the run artifact-to-variant mapping."
    );
  }

  const briefsById = new Map((briefs ?? []).map((brief) => [brief.id, brief]));
  const validRuns = [];
  const slots = new Map();
  const artifacts = new Map();
  const runIds = new Set();
  for (const [index, run] of dataset.runs.entries()) {
    const valid = validateRun(run, index, {
      protocol,
      briefsById,
      variantIds,
      errors
    });
    if (isText(run?.id)) {
      if (runIds.has(run.id)) {
        addIssue(errors, `results.runs[${index}].id`, "Run ID is duplicated.");
      }
      runIds.add(run.id);
    }
    if (isText(run?.blindArtifactId)) {
      if (artifacts.has(run.blindArtifactId)) {
        addIssue(
          errors,
          `results.runs[${index}].blindArtifactId`,
          "Blind artifact ID is duplicated."
        );
      } else if (valid) {
        artifacts.set(run.blindArtifactId, run);
      }
    }
    if (
      briefsById.has(run?.briefId) &&
      variantIds.includes(run?.variantId) &&
      isInteger(run?.repetition)
    ) {
      const key = slotKey(run.briefId, run.variantId, run.repetition);
      if (slots.has(key)) {
        addIssue(
          errors,
          `results.runs[${index}]`,
          `Duplicate run slot ${key}.`
        );
      } else if (valid) {
        slots.set(key, run);
        validRuns.push(run);
      }
    }
  }
  for (const brief of briefs ?? []) {
    for (const variantId of variantIds) {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        const key = slotKey(brief.id, variantId, repetition);
        if (!slots.has(key)) {
          addIssue(errors, `coverage.runs.${key}`, "Required run is missing or invalid.");
        }
      }
    }
  }

  for (const run of validRuns) {
    const regression = run.evidence.regressionNotes;
    const base = slots.get(slotKey(run.briefId, "base", run.repetition));
    if (run.variantId === "base") {
      if (regression.baselineArtifactId !== null) {
        addIssue(
          errors,
          `crossEvidence.${run.id}.regressionNotes.baselineArtifactId`,
          "Base runs must use a null baselineArtifactId."
        );
      }
    } else if (!base || regression.baselineArtifactId !== base.blindArtifactId) {
      addIssue(
        errors,
        `crossEvidence.${run.id}.regressionNotes.baselineArtifactId`,
        "Non-base runs must reference the matching blind Base artifact."
      );
    }
  }

  const validRatings = [];
  const ratingIds = new Set();
  const ratingGroups = new Map();
  for (const [index, rating] of dataset.pairwiseRatings.entries()) {
    const valid = validateRating(rating, index, {
      errors,
      protocol,
      validArtifacts: artifacts,
      sealedAt,
      ratingsClosedAt,
      mappingRevealedAt
    });
    if (isText(rating?.id)) {
      if (ratingIds.has(rating.id)) {
        addIssue(
          errors,
          `results.pairwiseRatings[${index}].id`,
          "Rating ID is duplicated."
        );
      }
      ratingIds.add(rating.id);
    }
    if (valid) {
      const key = `${rating.briefId}::${rating.repetition}::${pairKey(
        rating.leftArtifactId,
        rating.rightArtifactId
      )}`;
      const group = ratingGroups.get(key) ?? [];
      if (group.some((entry) => entry.raterId === rating.raterId)) {
        addIssue(
          errors,
          `results.pairwiseRatings[${index}].raterId`,
          "A rater may score each artifact pair only once."
        );
      } else {
        group.push(rating);
        ratingGroups.set(key, group);
        validRatings.push(rating);
      }
    }
  }

  for (const brief of briefs ?? []) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (let leftIndex = 0; leftIndex < variantIds.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < variantIds.length;
          rightIndex += 1
        ) {
          const left = slots.get(
            slotKey(brief.id, variantIds[leftIndex], repetition)
          );
          const right = slots.get(
            slotKey(brief.id, variantIds[rightIndex], repetition)
          );
          if (!left || !right) continue;
          const key = `${brief.id}::${repetition}::${pairKey(
            left.blindArtifactId,
            right.blindArtifactId
          )}`;
          const count = ratingGroups.get(key)?.length ?? 0;
          if (count < minimumRaters) {
            addIssue(
              errors,
              `coverage.ratings.${key}`,
              `Pair has ${count}/${minimumRaters} independent ratings.`
            );
          }
        }
      }
    }
  }

  const complete =
    errors.length === 0 &&
    slots.size === expectedRuns &&
    validRatings.length >= expectedRatings;
  const analysis = complete
    ? buildAnalysis(validRuns, validRatings, protocol)
    : null;
  const claimGate = evaluateClaimGate(analysis, protocol, complete);
  if (
    complete &&
    validRatings.length > expectedRatings
  ) {
    addIssue(
      warnings,
      "coverage.ratings",
      `Dataset includes ${validRatings.length - expectedRatings} ratings beyond the required minimum.`
    );
  }

  return {
    protocolVersion: protocol?.version ?? null,
    benchmarkId: dataset.benchmarkId ?? null,
    generatedAt: new Date().toISOString(),
    status: complete ? "ready-for-analysis" : "evidence-incomplete",
    coverage: {
      briefs: briefs?.length ?? 0,
      variants: variantIds.length,
      repetitionsPerCell: repetitions,
      expectedRuns,
      validRuns: slots.size,
      minimumExpectedPairwiseRatings: expectedRatings,
      validPairwiseRatings: validRatings.length
    },
    dataIntegrity: {
      valid: errors.length === 0,
      errorCount: errors.length,
      errors: errors.slice(0, MAX_REPORTED_ISSUES),
      errorsTruncated: errors.length > MAX_REPORTED_ISSUES,
      warningCount: warnings.length,
      warnings: warnings.slice(0, MAX_REPORTED_ISSUES)
    },
    analysis,
    claimGate,
    claim:
      claimGate.qualityClaimAllowed
        ? `Design Lagann passed every bounded quality gate for benchmark ${dataset.benchmarkId}.`
        : "No quality or superiority claim is permitted from this dataset."
  };
}

export { createVariantMappingHash, sha256 };
