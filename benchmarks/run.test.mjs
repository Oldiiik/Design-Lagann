import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeBenchmark,
  createVariantMappingHash,
  sha256
} from "./lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const protocol = JSON.parse(
  await readFile(path.join(root, "protocol.json"), "utf8")
);
const briefs = JSON.parse(
  await readFile(path.join(root, "briefs.json"), "utf8")
);

function artifactId(sequence) {
  return `BLIND_${String(sequence).padStart(12, "0")}`;
}

function completeFixture() {
  const variants = Object.keys(protocol.variants);
  const repetitions = protocol.runPolicy.independentRunsPerCell;
  const runs = [];
  const bySlot = new Map();
  let artifactSequence = 0;
  for (const brief of briefs) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      let baseArtifactId = null;
      for (const [variantIndex, variantId] of variants.entries()) {
        artifactSequence += 1;
        const blindArtifactId = artifactId(artifactSequence);
        if (variantId === "base") baseArtifactId = blindArtifactId;
        const startedAt = Date.parse("2026-01-01T01:00:00.000Z") +
          artifactSequence * 120_000;
        const elapsedMs = 60_000 + variantIndex * 10_000;
        const quality = 6 + variantIndex;
        const run = {
          id: `run-${brief.id}-${variantId}-${repetition}`,
          briefId: brief.id,
          variantId,
          repetition,
          blindArtifactId,
          metrics: Object.fromEntries(
            Object.keys(protocol.runPolicy.requiredMetrics).map((metric) => [
              metric,
              quality
            ])
          ),
          evidence: {
            prompt: {
              text: brief.prompt,
              sha256: sha256(brief.prompt)
            },
            commit: {
              repository: "https://example.test/design-benchmark.git",
              sha: sha256(
                `${brief.id}-${variantId}-${repetition}-commit`
              ).slice(0, 40),
              dirty: false
            },
            screenshots: Object.fromEntries(
              Object.entries(protocol.runPolicy.requiredScreenshots).map(
                ([viewport, dimensions]) => [
                  viewport,
                  {
                    path: `artifacts/${blindArtifactId}/${viewport}.png`,
                    sha256: sha256(`${blindArtifactId}-${viewport}`),
                    ...dimensions
                  }
                ]
              )
            ),
            timing: {
              startedAt: new Date(startedAt).toISOString(),
              finishedAt: new Date(startedAt + elapsedMs).toISOString(),
              elapsedMs
            },
            tokens: {
              input: 10_000,
              output: 4_000 + variantIndex * 500,
              total: 14_000 + variantIndex * 500
            },
            criticReports: protocol.runPolicy.requiredCritics.map(
              (criticId) => ({
                criticId,
                version: "1.0.0",
                reportPath: `artifacts/${blindArtifactId}/critics/${criticId}.json`,
                sha256: sha256(`${blindArtifactId}-${criticId}`),
                findingCount: variantIndex === 3 ? 0 : 3 - variantIndex,
                criticalCount: 0,
                score: quality
              })
            ),
            regressionNotes: {
              status: variantId === "base" ? "none" : "improved",
              baselineArtifactId:
                variantId === "base" ? null : baseArtifactId,
              notes: [
                variantId === "base"
                  ? "No baseline regressions are applicable."
                  : "No behavioral regressions; art-direction measures improved."
              ],
              criticalRegressions: 0
            }
          }
        };
        runs.push(run);
        bySlot.set(`${brief.id}::${repetition}::${variantId}`, run);
      }
    }
  }

  const variantStrength = new Map(
    variants.map((variantId, index) => [variantId, index])
  );
  const pairwiseRatings = [];
  let ratingSequence = 0;
  for (const brief of briefs) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (let leftIndex = 0; leftIndex < variants.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < variants.length;
          rightIndex += 1
        ) {
          const first = bySlot.get(
            `${brief.id}::${repetition}::${variants[leftIndex]}`
          );
          const second = bySlot.get(
            `${brief.id}::${repetition}::${variants[rightIndex]}`
          );
          for (
            let rater = 1;
            rater <= protocol.blindEvaluation.minimumRatersPerPair;
            rater += 1
          ) {
            ratingSequence += 1;
            const reverse = (ratingSequence + rater) % 2 === 0;
            const left = reverse ? second : first;
            const right = reverse ? first : second;
            const winner =
              variantStrength.get(left.variantId) >
              variantStrength.get(right.variantId)
                ? "left"
                : "right";
            const leftIsDesignGod = left.variantId === "design-lagann";
            const rightIsDesignGod = right.variantId === "design-lagann";
            pairwiseRatings.push({
              id: `rating-${ratingSequence}`,
              briefId: brief.id,
              repetition,
              raterId: `rater-${rater}`,
              leftArtifactId: left.blindArtifactId,
              rightArtifactId: right.blindArtifactId,
              preference: winner,
              dimensionChoices: Object.fromEntries(
                protocol.blindEvaluation.requiredDimensions.map((dimension) => [
                  dimension,
                  winner
                ])
              ),
              aiGeneratedLikelihood: {
                left: leftIsDesignGod ? 20 : 55,
                right: rightIsDesignGod ? 20 : 55
              },
              fiveMinuteRecall: {
                delayMinutes: 5,
                left: leftIsDesignGod,
                right: rightIsDesignGod,
                notes: "Unaided recall was recorded after the timed interruption."
              },
              saveShareIntent: {
                left: leftIsDesignGod ? 5 : 3,
                right: rightIsDesignGod ? 5 : 3
              },
              submittedAt: "2026-01-10T12:00:00.000Z"
            });
          }
        }
      }
    }
  }
  const variantMappingSalt = "fixture-only-mapping-salt-0000000000000001";
  return {
    protocolVersion: protocol.version,
    benchmarkId: "fixture-complete",
    blinding: {
      method: protocol.blindEvaluation.method,
      evaluatorPacketHash: sha256("evaluator-packet"),
      variantMappingSalt,
      variantMappingHash: createVariantMappingHash(runs, variantMappingSalt),
      mappingSealedAt: "2026-01-09T00:00:00.000Z",
      ratingsClosedAt: "2026-01-11T00:00:00.000Z",
      mappingRevealedAt: "2026-01-12T00:00:00.000Z"
    },
    runs,
    pairwiseRatings
  };
}

test("incomplete evidence cannot produce analysis or a quality claim", () => {
  const fixture = completeFixture();
  delete fixture.runs[0].evidence.tokens;
  const report = analyzeBenchmark({ protocol, briefs, results: fixture });
  assert.equal(report.status, "evidence-incomplete");
  assert.equal(report.analysis, null);
  assert.equal(report.claimGate.qualityClaimAllowed, false);
  assert.match(report.claim, /No quality or superiority claim/);
  assert.ok(
    report.dataIntegrity.errors.some(({ path: issuePath }) =>
      issuePath.endsWith("evidence.tokens")
    )
  );
});

test("a complete blind fixture produces reference-relative analysis", () => {
  const report = analyzeBenchmark({
    protocol,
    briefs,
    results: completeFixture()
  });
  assert.equal(report.status, "ready-for-analysis");
  assert.equal(report.dataIntegrity.valid, true);
  assert.equal(report.coverage.validRuns, report.coverage.expectedRuns);
  assert.equal(
    report.coverage.validPairwiseRatings,
    report.coverage.minimumExpectedPairwiseRatings
  );
  assert.ok(report.analysis);
  assert.equal(report.analysis.rankings[0].variantId, "design-lagann");
  assert.equal(
    report.analysis.rankings[0].pairwise.dimensionWinRates.memorability,
    1
  );
  assert.equal(report.analysis.comparisons.length, 6);
  assert.equal(report.claimGate.qualityClaimAllowed, true);
});

test("quality indices remain available while unproven token efficiency stays null", () => {
  const report = analyzeBenchmark({
    protocol,
    briefs,
    results: completeFixture()
  });
  const base = report.analysis.rankings.find(
    (entry) => entry.variantId === "base"
  );
  const designGod = report.analysis.rankings.find(
    (entry) => entry.variantId === "design-lagann"
  );

  assert.equal(base.efficiency.qualityIndex.median, 6);
  assert.equal(designGod.efficiency.qualityIndex.median, 9);
  assert.equal(
    designGod.efficiency.relativeToReference.status,
    "not-computable"
  );
  assert.equal(
    designGod.efficiency.relativeToReference.providerTokenEvidence,
    false
  );
  assert.equal(designGod.efficiency.relativeToReference.qualityGain, null);
  assert.equal(
    designGod.efficiency.relativeToReference.qualityGainPerMinute,
    null
  );
  assert.match(
    designGod.efficiency.relativeToReference.reason,
    /Provider-reported token provenance/
  );
});

test("paired provider evidence enables bounded quality-time-token efficiency", () => {
  const fixture = completeFixture();
  for (const run of fixture.runs) {
    run.evidence.tokens.provenance = {
      source: "provider-reported",
      provider: "fixture-provider"
    };
  }

  const report = analyzeBenchmark({ protocol, briefs, results: fixture });
  const designGod = report.analysis.rankings.find(
    (entry) => entry.variantId === "design-lagann"
  );
  const relative = designGod.efficiency.relativeToReference;

  assert.equal(report.status, "ready-for-analysis");
  assert.equal(relative.status, "computable");
  assert.equal(relative.referenceVariantId, "base");
  assert.equal(relative.comparablePairs, briefs.length * 3);
  assert.equal(relative.providerTokenEvidence, true);
  assert.equal(relative.qualityGain, 3);
  assert.equal(relative.qualityGainPerMinute, 2);
  assert.equal(relative.qualityGainPer10kProviderTokens, 1.9355);
  assert.equal(
    relative.qualityGainPerMinutePer10kProviderTokens,
    1.2903
  );
  assert.match(relative.claimBoundary, /do not establish/);
  assert.match(report.analysis.efficiencyPolicy.claimBoundary, /no superiority claim/);
});

test("one unproven paired token record makes that variant not-computable", () => {
  const fixture = completeFixture();
  for (const run of fixture.runs) {
    run.evidence.tokens.provenance = {
      source: "provider-reported",
      provider: "fixture-provider"
    };
  }
  const target = fixture.runs.find(
    (run) => run.variantId === "design-lagann"
  );
  delete target.evidence.tokens.provenance;

  const report = analyzeBenchmark({ protocol, briefs, results: fixture });
  const designGod = report.analysis.rankings.find(
    (entry) => entry.variantId === "design-lagann"
  );
  const impeccable = report.analysis.rankings.find(
    (entry) => entry.variantId === "base-impeccable"
  );

  assert.equal(
    designGod.efficiency.relativeToReference.status,
    "not-computable"
  );
  assert.equal(designGod.efficiency.relativeToReference.qualityGain, null);
  assert.equal(
    designGod.efficiency.relativeToReference.qualityGainPer10kProviderTokens,
    null
  );
  assert.equal(
    impeccable.efficiency.relativeToReference.status,
    "computable"
  );
});

test("ratings submitted after mapping reveal invalidate blindness", () => {
  const fixture = completeFixture();
  fixture.blinding.mappingRevealedAt = "2026-01-10T11:00:00.000Z";
  const report = analyzeBenchmark({ protocol, briefs, results: fixture });
  assert.equal(report.status, "evidence-incomplete");
  assert.equal(report.analysis, null);
  assert.equal(report.claimGate.qualityClaimAllowed, false);
  assert.ok(
    report.dataIntegrity.errors.some(({ path: issuePath }) =>
      issuePath.endsWith("submittedAt")
    )
  );
});

test("tampering with the sealed artifact mapping invalidates the corpus", () => {
  const fixture = completeFixture();
  fixture.runs[0].blindArtifactId = "BLIND_999999999999";
  const report = analyzeBenchmark({ protocol, briefs, results: fixture });
  assert.equal(report.status, "evidence-incomplete");
  assert.equal(report.claimGate.qualityClaimAllowed, false);
  assert.ok(
    report.dataIntegrity.errors.some(
      ({ path: issuePath }) =>
        issuePath === "results.blinding.variantMappingHash"
    )
  );
});

test("legacy result arrays remain explicitly non-claimable", () => {
  const report = analyzeBenchmark({ protocol, briefs, results: [] });
  assert.equal(report.status, "evidence-incomplete");
  assert.equal(report.claimGate.qualityClaimAllowed, false);
  assert.ok(
    report.dataIntegrity.errors.some(
      ({ path: issuePath }) => issuePath === "results"
    )
  );
});
