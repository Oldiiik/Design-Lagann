import { CONFIDENCE } from "../../shared/src/index.mjs";

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function finiteRange(value, label, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a number from ${minimum} to ${maximum}`);
  }
}

export const ART_DIRECTION_DIMENSIONS = Object.freeze([
  { id: "creativeThesis", weight: 1.4, structural: true },
  { id: "briefSpecificity", weight: 1.1, structural: true },
  { id: "composition", weight: 1.4, structural: true },
  { id: "objectIntegration", weight: 1.3, structural: true },
  { id: "sectionRhythm", weight: 1.0, structural: true },
  { id: "materialDiscipline", weight: 0.8, structural: false },
  { id: "typographyImagery", weight: 0.8, structural: false },
  { id: "interactionIntent", weight: 0.5, structural: false },
  { id: "memorability", weight: 1.3, structural: true },
  { id: "antiAiSpecificity", weight: 1.2, structural: true },
  { id: "responsiveArtDirection", weight: 0.7, structural: false }
]);

export const RUBRIC_WEIGHTS = Object.freeze({
  "evidence-gate": 0,
  "visual-orientation": 0,
  "anti-ai-patterns": 0,
  "asset-and-type-direction": 0,
  "art-direction": 25,
  "whole-page": 15,
  responsive: 15,
  "design-dna-consistency": 10,
  "material-discipline": 10,
  conversion: 10,
  memorability: 10,
  impeccable: 5
});
export const VISION_RUBRIC_IDS = Object.freeze(
  Object.keys(RUBRIC_WEIGHTS).filter((id) => !["evidence-gate", "impeccable"].includes(id))
);

const WORKFLOW_PROFILE_INPUTS = Object.freeze([
  "economy",
  "fast",
  "balanced",
  "quality",
  "super-quality",
  "superquality",
  "super_quality",
  "auto"
]);

export function validateBrief(brief) {
  if (!brief || typeof brief !== "object") throw new Error("brief must be an object");
  requiredString(brief.goal, "brief.goal");
  if (brief.mode && !WORKFLOW_PROFILE_INPUTS.includes(brief.mode)) {
    throw new Error("brief.mode must be fast, balanced, quality/super-quality, or auto; economy remains a legacy alias");
  }
  if (
    brief.executionProfile &&
    !WORKFLOW_PROFILE_INPUTS.filter((profile) => profile !== "economy").includes(brief.executionProfile)
  ) {
    throw new Error("brief.executionProfile must be fast, balanced, quality/super-quality, or auto");
  }
  if (brief.acceptancePolicy && brief.acceptancePolicy !== "elite-v1") {
    throw new Error("brief.acceptancePolicy must be elite-v1");
  }
  if (brief.references && !Array.isArray(brief.references)) throw new Error("brief.references must be an array");
  for (const key of ["brandTruths", "businessTruths", "forbiddenPatterns", "interactions", "requiredStates"]) {
    if (brief[key] !== undefined && !Array.isArray(brief[key])) throw new Error(`brief.${key} must be an array`);
  }
  return brief;
}

export function validateReferenceDna(dna) {
  for (const key of ["identity", "system", "style", "effects", "application", "confidence"]) {
    if (!dna?.[key] || typeof dna[key] !== "object") throw new Error(`design DNA is missing ${key}`);
  }
  for (const value of Object.values(dna.confidence)) {
    if (!CONFIDENCE.includes(value)) throw new Error(`invalid DNA confidence: ${value}`);
  }
  return dna;
}

export function validateFinding(finding) {
  requiredString(finding.id, "finding.id");
  requiredString(finding.critic, "finding.critic");
  requiredString(finding.category, "finding.category");
  requiredString(finding.message, "finding.message");
  requiredString(finding.evidence, "finding.evidence");
  if (![0, 1, 2, 3].includes(finding.severity)) throw new Error("finding.severity must be 0..3");
  return finding;
}

export function validateVisionReport(report, expected = {}) {
  if (!report || typeof report !== "object") throw new Error("vision report must be an object");
  if (report.schemaVersion !== "0.4.0") throw new Error("vision report schemaVersion must be 0.4.0");
  if (!report.evidence || typeof report.evidence !== "object") throw new Error("vision report is missing evidence binding");
  requiredString(report.evidence.requestId, "evidence.requestId");
  if (!["before", "after"].includes(report.evidence.stage)) throw new Error("evidence.stage must be before or after");
  if (!Array.isArray(report.evidence.screenshots) || !report.evidence.screenshots.length) {
    throw new Error("evidence.screenshots must contain viewport hashes");
  }
  for (const [index, screenshot] of report.evidence.screenshots.entries()) {
    requiredString(screenshot.viewport, `evidence.screenshots[${index}].viewport`);
    if (!/^[a-f0-9]{64}$/i.test(screenshot.sha256 || "")) {
      throw new Error(`evidence.screenshots[${index}].sha256 must be a SHA-256 digest`);
    }
  }
  if (!report.provenance || typeof report.provenance !== "object") throw new Error("vision report is missing provenance");
  requiredString(report.provenance.critic, "provenance.critic");
  requiredString(report.provenance.model, "provenance.model");
  requiredString(report.provenance.generatedAt, "provenance.generatedAt");
  if (typeof report.provenance.independentOfRepair !== "boolean") {
    throw new Error("provenance.independentOfRepair must be boolean");
  }
  if (Number.isNaN(Date.parse(report.provenance.generatedAt))) {
    throw new Error("provenance.generatedAt must be an ISO-compatible timestamp");
  }
  finiteRange(report.confidence, "confidence", 0, 1);
  if (!["reject", "repair", "accept"].includes(report.verdict)) {
    throw new Error("vision report verdict must be reject, repair, or accept");
  }
  if (!Array.isArray(report.rubricCoverage)) throw new Error("vision report is missing rubricCoverage");
  const rubricCoverage = new Map();
  for (const [index, item] of report.rubricCoverage.entries()) {
    requiredString(item.id, `rubricCoverage[${index}].id`);
    finiteRange(item.score, `rubricCoverage[${index}].score`, 0, 4);
    if (typeof item.gatesPassed !== "boolean") {
      throw new Error(`rubricCoverage[${index}].gatesPassed must be boolean`);
    }
    requiredString(item.evidence, `rubricCoverage[${index}].evidence`);
    rubricCoverage.set(item.id, item);
  }
  for (const id of expected.rubricIds || VISION_RUBRIC_IDS) {
    if (!rubricCoverage.has(id)) throw new Error(`vision report is missing rubric coverage for ${id}`);
  }
  if (!report.scorecard || typeof report.scorecard !== "object") throw new Error("vision report is missing scorecard");
  for (const dimension of ART_DIRECTION_DIMENSIONS) {
    const entry = report.scorecard[dimension.id];
    if (!entry || typeof entry !== "object") throw new Error(`vision report is missing scorecard.${dimension.id}`);
    finiteRange(entry.score, `scorecard.${dimension.id}.score`, 0, 10);
    requiredString(entry.evidence, `scorecard.${dimension.id}.evidence`);
    if (typeof entry.blocker !== "boolean") throw new Error(`scorecard.${dimension.id}.blocker must be boolean`);
  }
  if (!report.thesis || typeof report.thesis !== "object") throw new Error("vision report is missing thesis");
  requiredString(report.thesis.statement, "thesis.statement");
  if (!Array.isArray(report.thesis.visibleProof) || !report.thesis.visibleProof.length) {
    throw new Error("thesis.visibleProof must contain at least one visible proof point");
  }
  if (!Array.isArray(report.thesis.contradictions)) throw new Error("thesis.contradictions must be an array");
  if (!report.aiLikelihood || typeof report.aiLikelihood !== "object") throw new Error("vision report is missing aiLikelihood");
  finiteRange(report.aiLikelihood.score, "aiLikelihood.score", 0, 1);
  if (!Array.isArray(report.aiLikelihood.tells)) throw new Error("aiLikelihood.tells must be an array");
  requiredString(report.memoryHook, "memoryHook");
  requiredString(report.strongestMoment, "strongestMoment");
  requiredString(report.weakestMoment, "weakestMoment");
  if (!Array.isArray(report.structuralBlockers)) throw new Error("structuralBlockers must be an array");
  for (const [index, blocker] of report.structuralBlockers.entries()) {
    requiredString(blocker, `structuralBlockers[${index}]`);
  }
  if (!Array.isArray(report.findings)) throw new Error("vision report findings must be an array");
  for (const [index, finding] of report.findings.entries()) {
    requiredString(finding.id, `findings[${index}].id`);
    requiredString(finding.category, `findings[${index}].category`);
    requiredString(finding.message || finding.issue, `findings[${index}].message`);
    requiredString(finding.evidence, `findings[${index}].evidence`);
    requiredString(finding.recommendation || finding.repair, `findings[${index}].recommendation`);
    if (![0, 1, 2, 3].includes(finding.severity)) throw new Error(`findings[${index}].severity must be 0..3`);
    if (typeof finding.blocker !== "boolean") throw new Error(`findings[${index}].blocker must be boolean`);
    if (!["structural", "system", "polish"].includes(finding.repairKind)) {
      throw new Error(`findings[${index}].repairKind must be structural, system, or polish`);
    }
    requiredString(finding.rootCause, `findings[${index}].rootCause`);
    requiredString(finding.successCriterion, `findings[${index}].successCriterion`);
    if (!Array.isArray(finding.forbiddenFixes)) throw new Error(`findings[${index}].forbiddenFixes must be an array`);
  }
  if (expected.requestId && report.evidence.requestId !== expected.requestId) {
    throw new Error(`vision report requestId does not match ${expected.requestId}`);
  }
  if (expected.stage && report.evidence.stage !== expected.stage) {
    throw new Error(`vision report stage does not match ${expected.stage}`);
  }
  if (expected.screenshots) {
    const reported = new Map(report.evidence.screenshots.map((item) => [item.viewport, item.sha256.toLowerCase()]));
    for (const screenshot of expected.screenshots) {
      if (reported.get(screenshot.viewport) !== screenshot.sha256.toLowerCase()) {
        throw new Error(`vision report screenshot hash does not match viewport ${screenshot.viewport}`);
      }
    }
    const latestCapture = Math.max(
      ...expected.screenshots.map((screenshot) => Date.parse(screenshot.capturedAt || 0)).filter(Number.isFinite)
    );
    if (Number.isFinite(latestCapture) && Date.parse(report.provenance.generatedAt) < latestCapture) {
      throw new Error("vision report predates the screenshots it claims to judge");
    }
  }
  return report;
}

export function scoreVisionReport(report) {
  validateVisionReport(report);
  const totalWeight = ART_DIRECTION_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0);
  const weightedScore = ART_DIRECTION_DIMENSIONS.reduce(
    (sum, dimension) => sum + report.scorecard[dimension.id].score * dimension.weight,
    0
  ) / totalWeight;
  const dimensionBlockers = ART_DIRECTION_DIMENSIONS
    .filter((dimension) => dimension.structural && report.scorecard[dimension.id].blocker)
    .map((dimension) => dimension.id);
  const rubricById = new Map(report.rubricCoverage.map((item) => [item.id, item]));
  const coveredWeightedRubrics = Object.entries(RUBRIC_WEIGHTS)
    .filter(([id, weight]) => weight > 0 && rubricById.has(id));
  const weightedRubricTotal = coveredWeightedRubrics.reduce((sum, [, weight]) => sum + weight, 0);
  const rubricScore = coveredWeightedRubrics.reduce(
    (sum, [id, weight]) => sum + rubricById.get(id).score * weight,
    0
  ) / Math.max(1, weightedRubricTotal) / 4 * 10;
  const failedRubricGates = report.rubricCoverage
    .filter((item) => !item.gatesPassed)
    .map((item) => item.id);
  return {
    schemaVersion: report.schemaVersion,
    verdict: report.verdict,
    weightedScore: Number(weightedScore.toFixed(2)),
    rubricScore: Number(rubricScore.toFixed(2)),
    rubricCoverage: report.rubricCoverage,
    failedRubricGates,
    scorecard: report.scorecard,
    thesis: report.thesis,
    aiLikelihood: report.aiLikelihood,
    memoryHook: report.memoryHook,
    strongestMoment: report.strongestMoment,
    weakestMoment: report.weakestMoment,
    confidence: report.confidence,
    evidence: report.evidence,
    provenance: report.provenance,
    blockers: [...new Set([
      ...dimensionBlockers,
      ...report.structuralBlockers,
      ...report.findings.filter((finding) => finding.blocker).map((finding) => finding.id)
    ])],
    findings: report.findings
  };
}

export function artDirectionThreshold(mode = "balanced") {
  if (!WORKFLOW_PROFILE_INPUTS.includes(mode)) {
    throw new Error("art-direction profile must be fast, balanced, quality/super-quality, or auto");
  }
  return 8.8;
}

export const artifactVersion = "0.4.0";
