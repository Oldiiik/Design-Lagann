import { createHash } from "node:crypto";
import { classifyRequest, estimateScope } from "./classification.mjs";
import { createPreservationContract } from "./context.mjs";
import { createInformationArchitecture } from "./presets.mjs";
import { createAssetPlan, resolveHostCapabilities } from "./asset-policy.mjs";
import { createMotionChoreography, createMotionSystem } from "./motion-system.mjs";
import { createReferenceAcquisitionPlan } from "./reference-acquisition.mjs";

export const WORKFLOW_STAGES = [
  "classify-request",
  "inspect-project",
  "load-project-context",
  "set-preservation-boundary",
  "estimate-scope",
  "select-structure-preset",
  "define-information-architecture",
  "acquire-qualified-references",
  "set-art-direction",
  "plan-intentional-assets",
  "plan-product-states",
  "plan-motion-system",
  "write-implementation-contract",
  "implement-signature-relationship",
  "implement-responsive-system",
  "implement-functional-states",
  "capture-rendered-evidence",
  "critique-high-impact-gaps",
  "repair-bounded-scope",
  "verify-change-and-accessibility",
  "stop-or-report"
];

function stagePolicy(profile, operation) {
  if (profile === "fast") {
    return { directionCandidates: operation === "create" || operation === "redesign" ? 1 : 0, repairPasses: 1, viewports: ["desktop", "mobile"] };
  }
  if (profile === "quality") {
    return { directionCandidates: operation === "create" || operation === "redesign" ? 3 : 1, repairPasses: 3, viewports: ["desktop", "tablet", "mobile"] };
  }
  return { directionCandidates: operation === "create" || operation === "redesign" ? 2 : 0, repairPasses: 2, viewports: ["desktop", "tablet", "mobile"] };
}

export function createExecutionPlan({ request = {}, project = {}, context = {}, host = "codex", capabilityOverrides = {} } = {}) {
  const classification = classifyRequest(request, project);
  const capabilities = resolveHostCapabilities(host, capabilityOverrides);
  const scope = estimateScope({ classification, project, request });
  const preservation = createPreservationContract(context, classification, request);
  const informationArchitecture = createInformationArchitecture(request);
  const assets = createAssetPlan(request.assets || [], host, capabilityOverrides);
  const references = createReferenceAcquisitionPlan({
    brief: request,
    host,
    capabilities,
    strategy: request.referenceStrategy || "auto"
  });
  const motion = {
    ...createMotionSystem(request.motion || request, capabilities),
    choreography: createMotionChoreography({
      thesis: request.motion?.thesis,
      sections: informationArchitecture.sections.map((id) => ({ id, role: "section" })),
      interactions: request.interactions || [
        { id: "primary-action", kind: "control", interactive: true },
        { id: "navigation", kind: "drawer", interactive: true },
        { id: "dialog-or-panel", kind: "dialog", interactive: true }
      ]
    })
  };
  const profilePolicy = stagePolicy(classification.profile, classification.operation);
  const activeStages = WORKFLOW_STAGES.filter((stage) => {
    if (classification.operation === "create" && stage === "inspect-project") return false;
    if (!["create", "redesign"].includes(classification.operation) && stage === "set-art-direction" && !request.replaceArtDirection) return false;
    if (classification.operation === "edit" && stage === "select-structure-preset") return false;
    return true;
  });
  return {
    kind: "design-lagann-execution-plan",
    version: 1,
    host: capabilities.host,
    classification,
    capabilities,
    scope,
    preservation,
    informationArchitecture,
    references,
    assets,
    motion,
    profilePolicy,
    stages: activeStages.map((id, index) => ({ index: index + 1, id, status: index === 0 ? "ready" : "pending" })),
    acceptance: {
      invariantAcrossProfiles: true,
      required: ["functional", "responsive", "accessible", "scope-preserved", "rendered-evidence", "no-unintentional-decoration"]
    }
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function snapshotDigest(snapshot = {}) {
  return createHash("sha256").update(JSON.stringify(stable(snapshot))).digest("hex");
}

export function detectChange(before = {}, after = {}, evidence = {}) {
  const beforeDigest = snapshotDigest(before);
  const afterDigest = snapshotDigest(after);
  const changed = beforeDigest !== afterDigest;
  const changedFiles = evidence.changedFiles || [];
  const forbidden = new Set(evidence.protectedPaths || []);
  const scopeViolations = changedFiles.filter((file) => forbidden.has(file));
  return {
    changed,
    beforeDigest,
    afterDigest,
    changedFiles,
    scopeViolations,
    meaningful: changed && (evidence.renderDelta === undefined || evidence.renderDelta > 0),
    status: !changed ? "no-change" : scopeViolations.length ? "scope-violation" : "changed"
  };
}

export function evaluateStop({ requestedOutcomeMet = false, verification = {}, change = {}, passes = 0, maxPasses = 2 } = {}) {
  const blockers = [
    verification.functional === false && "function",
    verification.responsive === false && "responsive",
    verification.accessible === false && "accessibility",
    change.scopeViolations?.length && "scope-preservation"
  ].filter(Boolean);
  if (requestedOutcomeMet && blockers.length === 0) {
    return { stop: true, reason: "requested-outcome-proven", status: "accepted" };
  }
  if (change.status === "no-change") {
    return { stop: true, reason: "no-change-detected", status: requestedOutcomeMet ? "accepted" : "unverified" };
  }
  if (passes >= maxPasses) {
    return { stop: true, reason: "bounded-pass-limit", status: blockers.length ? "unverified" : "accepted", blockers };
  }
  return { stop: false, reason: "highest-impact-gap-remains", status: "continue", blockers };
}
