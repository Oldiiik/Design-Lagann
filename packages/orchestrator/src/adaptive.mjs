import { createHash } from "node:crypto";
import path from "node:path";
import { validateBrief } from "../../schemas/src/index.mjs";
import { priorityFor, writeJson } from "../../shared/src/index.mjs";
import { inspectRepository } from "./inspect.mjs";
import { createSitePlan } from "./site-plan.mjs";
import { createMotionVideoStage } from "./motion-video.mjs";

export const ADAPTIVE_PLAN_VERSION = "1.0.0";
export const ELITE_QUALITY_CONTRACT = Object.freeze({
  id: "elite-v1",
  semanticScoreFloor: 8.8,
  structuralDimensionFloor: 8,
  aiLikelihoodCeiling: 0.2,
  criticConfidenceFloor: 0.8,
  typographyScoreFloor: 8.2,
  requiredFinalViewports: Object.freeze(["desktop", "tablet", "mobile"]),
  requiresIndependentBeforeAfterVision: true,
  requiresRuntimeAndInteractionProof: true,
  immutableAcrossProfiles: true,
  hardGates: Object.freeze([
    "truthful evidence and provenance",
    "working build and declared primary interactions",
    "keyboard, focus, contrast, touch-target, and reduced-motion accessibility",
    "no horizontal overflow in every claimed viewport",
    "one visible style-independent thesis",
    "one content-specific signature spatial relationship",
    "effect-free compositional strength",
    "structural object-layout integration",
    "no blocking AI-pattern cluster",
    "intent-appropriate assets and explicit typography roles",
    "no unresolved severity-3 finding or severity-2 regression"
  ])
});
export const ELITE_QUALITY_CONTRACT_DIGEST = createHash("sha256")
  .update(JSON.stringify(ELITE_QUALITY_CONTRACT))
  .digest("hex");

const PROFILE_DEFINITIONS = Object.freeze({
  fast: Object.freeze({
    id: "fast",
    displayLabel: "FAST",
    targetDepth: "Focused depth: 3 desktop directions, one selected mobile reference, and up to 1 repair pass.",
    targetMinutes: Object.freeze([8, 15]),
    referenceTarget: Object.freeze([1, 1]),
    orientationCandidateTarget: 3,
    iterationViewports: Object.freeze(["desktop", "mobile"]),
    repairPasses: 1,
    repairLimit: 3,
    specialistCriticLimit: 1,
    fullPageCapturesPerStage: 1,
    research: "only when the brief lacks a usable primary reference",
    assetBatches: 1
  }),
  balanced: Object.freeze({
    id: "balanced",
    displayLabel: "BALANCED",
    targetDepth: "Expanded depth: 3 desktop directions, bounded evidence gathering, and up to 1 repair pass.",
    targetMinutes: Object.freeze([20, 35]),
    referenceTarget: Object.freeze([1, 3]),
    orientationCandidateTarget: 3,
    iterationViewports: Object.freeze(["desktop", "mobile"]),
    repairPasses: 1,
    repairLimit: 4,
    specialistCriticLimit: 2,
    fullPageCapturesPerStage: 1,
    research: "bounded and gap-driven",
    assetBatches: 1
  }),
  quality: Object.freeze({
    id: "quality",
    displayLabel: "QUALITY",
    targetDepth: "Maximum depth: 5 desktop directions, deep risk-driven evidence, specialist criticism, and up to 3 repair passes.",
    targetMinutes: Object.freeze([45, 90]),
    referenceTarget: Object.freeze([5, 7]),
    orientationCandidateTarget: 5,
    iterationViewports: Object.freeze(["desktop", "tablet", "mobile"]),
    repairPasses: 3,
    repairLimit: 5,
    specialistCriticLimit: 5,
    fullPageCapturesPerStage: 1,
    research: "deep only where evidence or originality risk requires it",
    assetBatches: 1
  })
});

const SPECIALISTS = Object.freeze({
  creativeThesis: "creative-composition",
  briefSpecificity: "creative-composition",
  composition: "creative-composition",
  objectIntegration: "creative-composition",
  sectionRhythm: "page-rhythm",
  materialDiscipline: "material-direction",
  typographyImagery: "typography-and-image",
  interactionIntent: "product-and-conversion",
  responsiveArtDirection: "responsive-and-accessibility",
  accessibility: "responsive-and-accessibility",
  functionality: "product-and-conversion",
  antiAiSpecificity: "anti-ai-pattern",
  memorability: "creative-composition"
});

function array(value) {
  return Array.isArray(value) ? value : [];
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function ratingIsWeak(value) {
  if (typeof value === "number") return value < 8;
  return ["weak", "fail", "failed", "blocked", "repair"].includes(String(value || "").toLowerCase());
}

export function normalizeWorkflowProfile(value = "balanced") {
  const normalized = String(value || "balanced").trim().toLowerCase();
  if (normalized === "economy") {
    return { requested: "economy", profile: "fast", legacyAlias: true };
  }
  if (["super-quality", "superquality", "super_quality"].includes(normalized)) {
    return { requested: normalized, profile: "quality", legacyAlias: false };
  }
  if (["fast", "balanced", "quality", "auto"].includes(normalized)) {
    return { requested: normalized, profile: normalized, legacyAlias: false };
  }
  throw new Error("workflow profile must be fast, balanced, quality/super-quality, or auto; economy remains a legacy alias for fast");
}

export function workflowProfile(value = "balanced") {
  const normalized = normalizeWorkflowProfile(value);
  if (normalized.profile === "auto") {
    throw new Error("auto must be resolved from project signals before reading a workflow profile");
  }
  return PROFILE_DEFINITIONS[normalized.profile];
}

export function formatWorkflowProfileDisclosure(profile, selection = {}) {
  const policy = workflowProfile(profile);
  const reasons = array(selection.reasons)
    .map((reason) => String(reason || "").trim())
    .filter(Boolean);
  const selectionReason = reasons.join(" ") ||
    `${policy.displayLabel} was selected for this run.`;
  return {
    displayLabel: policy.displayLabel,
    targetDepth: policy.targetDepth,
    selectionReason,
    qualityBarDisclosure: {
      id: ELITE_QUALITY_CONTRACT.id,
      invariantAcrossModes: true,
      statement: "elite-v1 is invariant: the mode changes exploration and repair depth, never the final quality bar. Acceptance still requires fresh desktop, tablet, and mobile evidence."
    },
    banner: `[DESIGN LAGANN MODE: ${policy.displayLabel}] ${policy.targetDepth} Quality bar: elite-v1 (invariant).`
  };
}

function projectSignals(brief, repository, supplied = {}) {
  const references = array(brief.references);
  const assets = array(brief.assets);
  const sections = array(brief.sections);
  const interactions = array(brief.interactions ?? brief.requiredInteractions);
  const intent = [
    brief.intent,
    brief.releaseStage,
    brief.goal,
    ...array(brief.constraints)
  ].filter(Boolean).join(" ").toLowerCase();
  const strongReference = supplied.strongReference ??
    references.some((reference) =>
      reference?.approved === true ||
      ["primary", "strong", "authoritative"].includes(String(reference?.strength || reference?.priority || "").toLowerCase())
    );
  const showcaseRisk = supplied.showcaseRisk ??
    /\b(showcase|launch|campaign|benchmark|award|portfolio flagship|production-scale)\b/.test(intent);
  const smallScope = supplied.smallScope ??
    (sections.length <= 5 && interactions.length <= 2 && !showcaseRisk);
  const repositoryStyled = supplied.repositoryStyled ??
    Boolean(repository.styling?.length);
  const existingAssetsSufficient = supplied.existingAssetsSufficient ??
    (repository.assets?.length > 0 && assets.length === 0);
  const requiresRasterGeneration = supplied.requiresRasterGeneration ??
    assets.some((asset) => {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) return false;
      const source = String(asset.source || asset.provenance?.sourceType || "").toLowerCase();
      if (["user-supplied", "licensed", "library"].includes(source)) return false;
      const description = [
        asset.visualIntent,
        asset.intent,
        asset.kind,
        asset.role,
        asset.description,
        asset.subject,
        asset.implementation,
        asset.medium
      ].filter(Boolean).join(" ");
      return /\b(food|pastr(?:y|ies)|bread|product|photo(?:graph(?:y|ic)?)?|editorial[- ]image|hero[- ]object|character|portrait|transparent[- ]raster)\b/i.test(description);
    });
  const complexArtwork = supplied.complexArtwork ??
    (requiresRasterGeneration || assets.some((asset) => {
      const text = typeof asset === "string"
        ? asset
        : [asset?.description, asset?.subject, asset?.implementation, asset?.medium].filter(Boolean).join(" ");
      return /\b(3d|webgl|three|video|rive|lottie|character|cinematic|photoreal|complex)\b/i.test(text);
    }));
  return {
    referenceCount: references.length,
    strongReference,
    showcaseRisk,
    smallScope,
    repositoryStyled,
    preserveExistingTokens: asBoolean(supplied.preserveExistingTokens ?? brief.preserveExistingTokens),
    existingAssetsSufficient,
    requiresRasterGeneration,
    complexArtwork,
    approvedVisualReference: asBoolean(supplied.approvedVisualReference ?? brief.approvedVisualReference),
    referenceEvidenceCurrent: asBoolean(supplied.referenceEvidenceCurrent ?? brief.referenceEvidenceCurrent),
    referenceAdopted: asBoolean(supplied.referenceAdopted ?? brief.referenceAdopted),
    existingSystemEvidenceComplete: asBoolean(
      supplied.existingSystemEvidenceComplete ?? brief.existingSystemEvidenceComplete
    ),
    directionAdopted: asBoolean(supplied.directionAdopted ?? brief.directionAdopted),
    baselineEvidenceComplete: asBoolean(supplied.baselineEvidenceComplete),
    baselineSemanticScore: Number.isFinite(Number(supplied.baselineSemanticScore))
      ? Number(supplied.baselineSemanticScore)
      : null,
    baselineBlockers: array(supplied.baselineBlockers),
    mobileOnlyFailure: asBoolean(supplied.mobileOnlyFailure),
    explicitAssetGeneration: asBoolean(supplied.explicitAssetGeneration ?? brief.generateAssets),
    ...supplied
  };
}

function resolveAutoProfile(signals) {
  if (signals.showcaseRisk || signals.complexArtwork) return "quality";
  if (signals.smallScope && signals.strongReference) return "fast";
  return "balanced";
}

function task(id, status, reason, extra = {}) {
  return { id, status, reason, ...extra };
}

function directionEvidenceTrack(profile, signals) {
  if (signals.approvedVisualReference) {
    return {
      track: "approved-visual-reference",
      reason: "A current, hash-bound, human-approved visual reference already exists.",
      explorationClaimAllowed: false
    };
  }
  if (
    profile === "fast" &&
    signals.strongReference &&
    signals.referenceEvidenceCurrent &&
    signals.referenceAdopted
  ) {
    return {
      track: "direct-reference",
      reason: "Fast mode has a current, hash-bound, explicitly adopted primary reference; extract its DNA without pretending multi-direction exploration occurred.",
      explorationClaimAllowed: false
    };
  }
  if (
    signals.repositoryStyled &&
    signals.preserveExistingTokens &&
    signals.existingSystemEvidenceComplete &&
    signals.directionAdopted
  ) {
    return {
      track: "existing-system",
      reason: "The repository has an explicit preservation instruction; retain its qualified token system and create a new thesis around it.",
      explorationClaimAllowed: false
    };
  }
  return {
    track: "exploratory-orientation",
    reason: "No approved direct evidence makes visual discovery safely skippable.",
    explorationClaimAllowed: true
  };
}

export function createCriticTriage({
  profile = "balanced",
  dimensions = {},
  findings = []
} = {}) {
  const policy = workflowProfile(profile);
  const requested = [];
  for (const [dimension, rating] of Object.entries(dimensions || {})) {
    if (ratingIsWeak(rating) && SPECIALISTS[dimension]) requested.push(SPECIALISTS[dimension]);
  }
  for (const finding of findings || []) {
    if ((finding.blocker || finding.severity >= 2) && SPECIALISTS[finding.category]) {
      requested.push(SPECIALISTS[finding.category]);
    }
  }
  const specialists = [...new Set(requested)]
    .slice(0, policy.specialistCriticLimit);
  return {
    version: ADAPTIVE_PLAN_VERSION,
    profile: policy.id,
    triageCritic: "whole-page-triage",
    specialists,
    skippedSpecialists: [...new Set(Object.values(SPECIALISTS))]
      .filter((critic) => !specialists.includes(critic)),
    rule: "Run one whole-page triage first. Add only specialists justified by a weak or blocked dimension.",
    limitation: "Skipping an unnecessary specialist reduces review cost; it never converts missing semantic evidence into a pass."
  };
}

export function recommendProfileEscalation({
  profile = "balanced",
  semanticScore = null,
  blockers = [],
  hardGateFailures = [],
  responsiveUncertainty = false,
  weakReference = false,
  repositoryRisk = false,
  complexArtwork = false
} = {}) {
  const current = workflowProfile(profile).id;
  const reasons = [];
  const score = Number(semanticScore);
  if (Number.isFinite(score) && score < ELITE_QUALITY_CONTRACT.structuralDimensionFloor) {
    reasons.push(`Baseline semantic score ${score} is below the structural readiness floor.`);
  }
  if (array(blockers).length) reasons.push("The first critic found structural or hard-gate blockers.");
  if (array(hardGateFailures).length) reasons.push("The first critic reported unresolved hard-gate failures.");
  if (responsiveUncertainty) reasons.push("Responsive behavior remains uncertain or materially defective.");
  if (weakReference) reasons.push("The governing reference is missing, weak, stale, or not adopted.");
  if (repositoryRisk) reasons.push("Repository complexity or regression risk exceeds the current effort budget.");
  if (complexArtwork) reasons.push("The direction requires complex generated, animated, or spatial artwork.");
  const next = !reasons.length || current === "quality"
    ? current
    : current === "fast"
      ? "balanced"
      : "quality";
  return {
    version: ADAPTIVE_PLAN_VERSION,
    escalated: next !== current,
    from: current,
    to: next,
    reasons,
    rule: "Escalation may add evidence, critics, and repair depth. It never lowers or bypasses elite-v1."
  };
}

export function createRegionalRepairPlan(findings = [], { profile = "balanced" } = {}) {
  const policy = workflowProfile(profile);
  const ordered = [...findings]
    .filter((finding) => finding && typeof finding === "object")
    .sort((left, right) =>
      Number(Boolean(right.blocker)) - Number(Boolean(left.blocker)) ||
      (right.severity ?? 0) - (left.severity ?? 0) ||
      priorityFor(left.category) - priorityFor(right.category) ||
      String(left.id || "").localeCompare(String(right.id || ""))
    );
  const seen = new Set();
  const repairs = [];
  for (const finding of ordered) {
    const region = finding.region || "whole-page";
    const findingId = finding.id || finding.findingId;
    const rootCause =
      finding.fingerprint ||
      finding.rootCause ||
      finding.action ||
      finding.message ||
      findingId;
    const key = `${region}::${rootCause}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const files = [...new Set([
      ...array(finding.files),
      ...array(finding.affectedFiles),
      finding.file
    ].filter(Boolean))];
    const viewports = [...new Set([
      ...array(finding.viewports),
      finding.viewport
    ].filter(Boolean))];
    repairs.push({
      id: `repair-${findingId || repairs.length + 1}`,
      findingIds: [findingId].filter(Boolean),
      rootCauseFingerprint: finding.fingerprint || rootCause,
      region,
      viewports,
      files,
      action:
        finding.instruction ||
        finding.recommendation ||
        finding.recommendedChange ||
        finding.repair ||
        finding.action ||
        finding.message,
      successCriterion: finding.successCriterion || finding.verification || "The repaired region visibly clears the cited root cause without regression.",
      designDnaFields: array(finding.designDnaFields ?? finding.contractFields),
      screenshotEvidence: {
        fullPageContext: repairs.length === 0,
        cropRequired: region !== "whole-page",
        cropLabel: region
      },
      readScope: {
        include: [
          ...files,
          "the closest related style source",
          `the ${region} screenshot crop`,
          "only the cited Design DNA fields"
        ],
        exclude: "Unrelated project files and unrelated screenshot regions"
      },
      regressionRisks: array(finding.regressionRisks),
      forbiddenFixes: array(finding.forbiddenFixes)
    });
    if (repairs.length >= policy.repairLimit) break;
  }
  const allowedFiles = [...new Set(repairs.flatMap((repair) => repair.files))].sort();
  return {
    version: ADAPTIVE_PLAN_VERSION,
    profile: policy.id,
    repairs,
    allowedFiles,
    maxRepairPasses: policy.repairPasses,
    acceptanceRequiresFreshWholePage: ["desktop", "tablet", "mobile"],
    rule: "Repair bounded regions and their shared root causes. Re-open whole-project context only when the critic identifies a page-level structural cause."
  };
}

export function summarizeRunTelemetry({
  profile = "balanced",
  startedAt,
  finishedAt,
  phases = [],
  tokens = null,
  qualityBefore = null,
  qualityAfter = null,
  evidenceComplete = false
} = {}) {
  const start = Date.parse(startedAt);
  const finish = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish <= start) {
    throw new Error("telemetry requires valid startedAt and finishedAt timestamps with finishedAt after startedAt");
  }
  const elapsedMs = finish - start;
  const inputTokens = Number(tokens?.input);
  const outputTokens = Number(tokens?.output);
  const tokenEvidence = Number.isInteger(inputTokens) && inputTokens >= 0 &&
    Number.isInteger(outputTokens) && outputTokens >= 0;
  const totalTokens = tokenEvidence ? inputTokens + outputTokens : null;
  const before = Number(qualityBefore);
  const after = Number(qualityAfter);
  const qualityEvidence = evidenceComplete &&
    Number.isFinite(before) && Number.isFinite(after) &&
    before >= 0 && before <= 10 && after >= 0 && after <= 10;
  const qualityGain = qualityEvidence ? Number((after - before).toFixed(3)) : null;
  const minutes = elapsedMs / 60_000;
  const gainPerMinute = qualityGain === null ? null : Number((qualityGain / minutes).toFixed(4));
  const gainPer10kTokens = qualityGain === null || !totalTokens
    ? null
    : Number((qualityGain / (totalTokens / 10_000)).toFixed(4));
  const valueIndex = qualityGain === null || !totalTokens
    ? null
    : Number((qualityGain / minutes / (totalTokens / 10_000)).toFixed(4));
  return {
    version: ADAPTIVE_PLAN_VERSION,
    profile: workflowProfile(profile).id,
    timing: { startedAt, finishedAt, elapsedMs, elapsedMinutes: Number(minutes.toFixed(3)) },
    phases,
    tokens: tokenEvidence
      ? { input: inputTokens, output: outputTokens, total: totalTokens, status: "reported" }
      : { input: null, output: null, total: null, status: "unreported" },
    quality: {
      before: qualityEvidence ? before : null,
      after: qualityEvidence ? after : null,
      gain: qualityGain,
      evidenceComplete: qualityEvidence
    },
    efficiency: {
      qualityGainPerMinute: gainPerMinute,
      qualityGainPer10kTokens: gainPer10kTokens,
      valueIndex
    },
    claimBoundary: qualityEvidence
      ? "Efficiency is supporting evidence for this evidence-bound run; it is not a universal quality or superiority claim."
      : "Quality efficiency is not computed until independent before/after semantic evidence is complete."
  };
}

export function validateAdaptivePlan(plan) {
  if (!plan || typeof plan !== "object") throw new Error("adaptive plan must be an object");
  if (plan.version !== ADAPTIVE_PLAN_VERSION) {
    throw new Error(`adaptive plan version must be ${ADAPTIVE_PLAN_VERSION}`);
  }
  if (!["fast", "balanced", "quality"].includes(plan.profile)) {
    throw new Error("adaptive plan profile must resolve to fast, balanced, or quality");
  }
  if (!String(plan.runId || "").trim()) {
    throw new Error("adaptive plan must declare a stable runId");
  }
  if (plan.qualityContract?.id !== ELITE_QUALITY_CONTRACT.id) {
    throw new Error("adaptive plan must use the elite-v1 acceptance contract");
  }
  if (plan.qualityContractDigest !== ELITE_QUALITY_CONTRACT_DIGEST) {
    throw new Error("adaptive plan quality-contract digest does not match elite-v1");
  }
  const expectedDisclosure = formatWorkflowProfileDisclosure(plan.profile, plan.selection);
  if (
    plan.displayLabel !== expectedDisclosure.displayLabel ||
    plan.targetDepth !== expectedDisclosure.targetDepth ||
    plan.selectionReason !== expectedDisclosure.selectionReason ||
    plan.qualityBarDisclosure?.id !== ELITE_QUALITY_CONTRACT.id ||
    plan.qualityBarDisclosure?.invariantAcrossModes !== true ||
    !String(plan.qualityBarDisclosure?.statement || "").includes("never the final quality bar") ||
    plan.modeBanner !== expectedDisclosure.banner
  ) {
    throw new Error("adaptive plan must prominently disclose its mode, target depth, selection reason, and invariant elite-v1 quality bar");
  }
  if (
    plan.deliveryPolicy?.implementationTarget !== "local-workspace" ||
    plan.deliveryPolicy?.designDelegationToSites !== false ||
    plan.deliveryPolicy?.sitesUse !== "deployment-only" ||
    plan.deliveryPolicy?.sitesDeploymentCondition !== "explicit-user-request-or-existing-openai-hosting-json"
  ) {
    throw new Error("adaptive plan must keep implementation local and reserve Sites for explicitly requested or preconfigured deployment");
  }
  if (!Array.isArray(plan.tasks)) throw new Error("adaptive plan tasks must be an array");
  const tasks = new Map(plan.tasks.map((item) => [item.id, item]));
  for (const required of [
    "plan-site",
    "inspect-repository",
    "synthesize-project-direction",
    "implement-signature-skeleton",
    "capture-and-triage",
    "acceptance-proof"
  ]) {
    if (tasks.get(required)?.status !== "run") {
      throw new Error(`adaptive plan cannot skip required task ${required}`);
    }
  }
  const acceptance = tasks.get("acceptance-proof");
  if (
    JSON.stringify(acceptance.viewports) !==
    JSON.stringify(ELITE_QUALITY_CONTRACT.requiredFinalViewports)
  ) {
    throw new Error("acceptance proof must capture desktop, tablet, and mobile");
  }
  for (const item of plan.tasks) {
    if (!["run", "skip", "conditional"].includes(item.status)) {
      throw new Error(`adaptive task ${item.id} has an invalid status`);
    }
    if (!String(item.reason || "").trim()) {
      throw new Error(`adaptive task ${item.id} must record a decision reason`);
    }
  }
  if (
    tasks.get("visual-orientation")?.status === "skip" &&
    plan.directionEvidence?.track === "exploratory-orientation"
  ) {
    throw new Error("visual orientation cannot be skipped without an alternate direction-evidence track");
  }
  if (
    !Array.isArray(tasks.get("implement-signature-skeleton")?.dependsOn) ||
    !tasks.get("implement-signature-skeleton").dependsOn.includes("generate-assets-batch") ||
    !tasks.get("implement-signature-skeleton").dependsOn.includes("motion-video-stage")
  ) {
    throw new Error("local implementation must depend on production asset routing and the resolved optional motion-video stage");
  }
  if (plan.motionVideoStage?.status === "requested" && tasks.get("motion-video-stage")?.status !== "run") {
    throw new Error("requested video animation must use the single Remotion motion-video stage");
  }
  if (
    plan.signals?.requiresRasterGeneration === true &&
    tasks.get("generate-assets-batch")?.status !== "run"
  ) {
    throw new Error("required raster/photo roles cannot skip production asset generation");
  }
  return plan;
}

export async function createAdaptivePlan({
  projectRoot = process.cwd(),
  brief = {},
  profile,
  mode,
  signals: suppliedSignals = {},
  repository = null,
  createdAt = new Date().toISOString()
} = {}) {
  const root = path.resolve(projectRoot);
  const normalizedBrief = validateBrief({
    goal: "Create a coherent, original, responsive frontend.",
    references: [],
    ...brief,
    mode: brief.mode === "economy" ? "economy" : brief.mode
  });
  const repositoryEvidence = repository || await inspectRepository(root);
  const requested = normalizeWorkflowProfile(profile ?? mode ?? brief.profile ?? brief.mode ?? "balanced");
  const signals = projectSignals(normalizedBrief, repositoryEvidence, suppliedSignals);
  const resolvedProfile = requested.profile === "auto"
    ? resolveAutoProfile(signals)
    : requested.profile;
  const policy = workflowProfile(resolvedProfile);
  const runId = `design-lagann-${createHash("sha256")
    .update(JSON.stringify({ projectRoot: root, goal: normalizedBrief.goal }))
    .digest("hex")
    .slice(0, 16)}`;
  const directionEvidence = directionEvidenceTrack(resolvedProfile, signals);
  const skipDiscovery =
    directionEvidence.track !== "exploratory-orientation" ||
    signals.strongReference;
  const skipTokenSynthesis = signals.repositoryStyled && signals.preserveExistingTokens;
  const skipAssetGeneration = !signals.explicitAssetGeneration &&
    (signals.existingAssetsSufficient || !signals.complexArtwork);
  const skipStructuralRepair = signals.baselineEvidenceComplete &&
    signals.baselineSemanticScore >= ELITE_QUALITY_CONTRACT.semanticScoreFloor &&
    signals.baselineBlockers.length === 0;
  const criticPlan = createCriticTriage({ profile: resolvedProfile });
  const sitePlan = createSitePlan(normalizedBrief, { profile: resolvedProfile, createdAt });
  const motionVideoStage = createMotionVideoStage(normalizedBrief);
  const selection = requested.profile === "auto"
    ? { source: "adaptive", reasons: signals.showcaseRisk || signals.complexArtwork
        ? ["Showcase or complex-art risk requires Quality depth."]
        : signals.smallScope && signals.strongReference
          ? ["Small scope plus a declared strong reference qualifies for Fast depth."]
          : ["Balanced is the safe default when neither Fast nor Quality conditions dominate."] }
    : { source: "explicit-or-default", reasons: [`${policy.displayLabel} was requested or selected as the default.`] };
  const modeDisclosure = formatWorkflowProfileDisclosure(resolvedProfile, selection);
  const tasks = [
    task("plan-site", "run", "Lock the site structure, real content commitments, reference-fidelity mode, asset composition boundaries, responsive transformations, and optional video output before visual creation.", {
      output: ".design-lagann/site-plan.json"
    }),
    task("inspect-repository", "run", "Repository evidence is required to preserve the existing stack and user changes.", {
      parallelGroup: "orientation-inputs",
      output: ".design-lagann/repository.json"
    }),
    task("extract-reference-dna", signals.referenceCount ? "run" : "conditional", signals.referenceCount
      ? "Extract or reuse cache-bound DNA for the references that actually govern the direction."
      : "Run only when a reference is supplied or a specific evidence gap requires one.", {
      parallelGroup: "orientation-inputs",
      cache: ".design-lagann/reference-cache/"
    }),
    task("inventory-assets", "run", "Resolve existing asset quality and missing-media risk before generation.", {
      parallelGroup: "orientation-inputs"
    }),
    task("structure-content", "run", "Build the real content and interaction architecture while repository and reference inspection run.", {
      parallelGroup: "orientation-inputs"
    }),
    task("deep-discovery", skipDiscovery ? "skip" : "conditional", skipDiscovery
      ? directionEvidence.track !== "exploratory-orientation"
        ? directionEvidence.reason
        : "A strong primary reference is already present, so broad discovery would repeat evidence; orientation still runs because current adoption proof is incomplete."
      : policy.research),
    task("synthesize-project-direction", "run", "Use one consolidated design-director pass to produce project DNA, blueprint, asset plan, risks, and repair priorities.", {
      dependsOn: ["plan-site", "inspect-repository", "extract-reference-dna", "inventory-assets", "structure-content"]
    }),
    task("synthesize-new-tokens", skipTokenSynthesis ? "skip" : "run", skipTokenSynthesis
      ? "The brief explicitly preserves a styled repository; validate and reuse its qualified token roles."
      : "No explicit qualified preservation signal permits skipping token synthesis.", {
      dependsOn: ["synthesize-project-direction"]
    }),
    task("visual-orientation", directionEvidence.track === "exploratory-orientation" ? "run" : "skip", directionEvidence.reason, {
      track: directionEvidence.track,
      generationStrategy: "desktop-candidates-then-selected-mobile",
      candidateTarget: directionEvidence.track === "exploratory-orientation"
        ? policy.orientationCandidateTarget
        : 0,
      candidateViewports: ["desktop"],
      selectedReferenceViewports: ["desktop", "mobile"],
      selectedPairCriticRequired: true,
      dependsOn: ["synthesize-project-direction"]
    }),
    task("generate-assets-batch", skipAssetGeneration ? "skip" : "run", skipAssetGeneration
      ? "Existing assets or code-native geometry satisfy the declared roles."
      : "Generate one visually consistent batch after the asset plan fixes light, viewpoint, material, isolation, and resolution.", {
      maximumBatches: policy.assetBatches,
      dependsOn: ["synthesize-project-direction"]
    }),
    task("motion-video-stage", motionVideoStage.status === "requested" ? "run" : "skip", motionVideoStage.integrationBoundary, {
      engine: motionVideoStage.engine,
      stageCount: motionVideoStage.stageCount,
      dependsOn: ["synthesize-project-direction", "generate-assets-batch"]
    }),
    task("implement-signature-skeleton", "run", "Build semantics, primary interactions, responsive skeleton, and the signature relationship before effects.", {
      dependsOn: ["synthesize-project-direction", "generate-assets-batch", "motion-video-stage"]
    }),
    task("capture-and-triage", "run", "Capture the iteration viewport set once, then run one whole-page triage critic.", {
      viewports: policy.iterationViewports,
      fullPageCaptures: policy.fullPageCapturesPerStage,
      dependsOn: ["implement-signature-skeleton"]
    }),
    task("specialist-critics", "conditional", "Run only the specialists selected by weak or blocked triage dimensions.", {
      maximum: policy.specialistCriticLimit,
      dependsOn: ["capture-and-triage"]
    }),
    task("regional-repair", skipStructuralRepair ? "skip" : "run", skipStructuralRepair
      ? "Independent semantic evidence already clears the immutable elite contract with no blockers."
      : "Repair only the highest-impact regions and shared root causes selected by triage.", {
      maximumPasses: policy.repairPasses,
      maximumRootCauses: policy.repairLimit,
      dependsOn: ["capture-and-triage", "specialist-critics"]
    }),
    task("acceptance-proof", "run", "Required before any accepted, showcase, benchmark, or universal responsive claim.", {
      viewports: ["desktop", "tablet", "mobile"],
      requiresBeforeAfterVision: true,
      requiresComparison: true,
      dependsOn: ["regional-repair"]
    })
  ];
  const plan = {
    version: ADAPTIVE_PLAN_VERSION,
    runId,
    createdAt,
    projectRoot: root,
    requestedProfile: requested.requested,
    profile: resolvedProfile,
    legacyModeAlias: requested.legacyAlias ? "economy->fast" : null,
    profileAlias: !requested.legacyAlias && requested.requested !== resolvedProfile
      ? `${requested.requested}->${resolvedProfile}`
      : null,
    escalationHistory: [],
    selection,
    displayLabel: modeDisclosure.displayLabel,
    targetDepth: modeDisclosure.targetDepth,
    selectionReason: modeDisclosure.selectionReason,
    qualityBarDisclosure: modeDisclosure.qualityBarDisclosure,
    modeBanner: modeDisclosure.banner,
    policy,
    qualityContract: ELITE_QUALITY_CONTRACT,
    qualityContractDigest: ELITE_QUALITY_CONTRACT_DIGEST,
    directionEvidence,
    signals,
    capturePlan: {
      iterationViewports: policy.iterationViewports,
      regionCropsAfterTriage: true,
      acceptanceViewports: ["desktop", "tablet", "mobile"],
      acceptanceRequiresFreshBeforeAfterVision: true
    },
    criticPlan,
    sitePlan: ".design-lagann/site-plan.json",
    motionVideoStage,
    repairPolicy: {
      maximumPasses: policy.repairPasses,
      maximumRootCauses: policy.repairLimit,
      regionalByDefault: true,
      wholeProjectReadOnlyForPageLevelRootCause: true
    },
    assetPolicy: {
      batchGeneration: true,
      maximumBatches: policy.assetBatches,
      generationSkipped: skipAssetGeneration,
      consistencyFields: ["light", "camera", "material", "background isolation", "resolution"]
    },
    parallelGroups: {
      "orientation-inputs": ["inspect-repository", "extract-reference-dna", "inventory-assets", "structure-content"]
    },
    tasks,
    telemetryContract: {
      record: ["phase timings", "tool calls", "reported model calls", "reported input/output tokens", "cache hits", "repair regions"],
      efficiencyFormula: "quality gain / elapsed minutes / (reported tokens / 10,000)",
      qualityGainRequires: "independent, screenshot-bound before/after semantic evidence",
      missingTokenPolicy: "Record unreported; never estimate or fabricate token counts."
    },
    claimPolicy: {
      implementationClaims: "May describe executed implementation and verified runtime checks.",
      semanticAcceptance: "Requires the full acceptance-proof task regardless of profile.",
      benchmarkOrBestInWorldClaim: "Requires the separate blind human benchmark claim gate; automated runs cannot authorize it."
    },
    deliveryPolicy: {
      implementationTarget: "local-workspace",
      designDelegationToSites: false,
      sitesUse: "deployment-only",
      sitesDeploymentCondition: "explicit-user-request-or-existing-openai-hosting-json",
      statement: "Create and edit the website in the current local workspace. Do not delegate design or implementation to Sites; use Sites only for deployment when the user explicitly requests it or the project already contains .openai/hosting.json."
    }
  };
  validateAdaptivePlan(plan);
  await writeJson(path.join(root, ".design-lagann", "site-plan.json"), sitePlan);
  await writeJson(path.join(root, ".design-lagann", "adaptive-plan.json"), plan);
  return plan;
}
