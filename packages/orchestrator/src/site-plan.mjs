import { createHash } from "node:crypto";
import { createReferenceFidelityContract, resolveReferenceSources } from "../../reference-search/src/index.mjs";
import { createMotionVideoStage } from "./motion-video.mjs";

const list = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const clean = (value) => String(value || "").trim();

function defaultSections(brief) {
  return list(brief.sections).length
    ? list(brief.sections)
    : ["Opening / primary promise", "Evidence / product truth", "Details / interaction", "Closing action"];
}

export function validateSitePlan(plan) {
  if (!plan || typeof plan !== "object") throw new Error("site plan must be an object");
  if (plan.version !== "1.0.0") throw new Error("site plan version must be 1.0.0");
  if (!clean(plan.goal)) throw new Error("site plan goal is required");
  if (!Array.isArray(plan.sections) || plan.sections.length < 1) throw new Error("site plan needs at least one section");
  if (!plan.assetBoundaries?.isolatedObjectRule) throw new Error("site plan must define isolated-object asset boundaries");
  if (!plan.referenceFidelity?.mode) throw new Error("site plan must define reference fidelity mode");
  if (!plan.motionVideoStage?.status) throw new Error("site plan must resolve the optional video stage");
  if (!Array.isArray(plan.creationGates) || plan.creationGates[0] !== "site-plan-approved-or-explicitly-adopted") {
    throw new Error("site plan must gate creation on plan adoption");
  }
  return plan;
}

export function createSitePlan(brief = {}, { profile = "balanced", createdAt = new Date().toISOString() } = {}) {
  const goal = clean(brief.goal) || "Create a coherent, original, responsive frontend.";
  const references = list(brief.references);
  const adoptedReference = references.find((reference) =>
    reference && typeof reference === "object" && reference.approved === true && reference.sourceDigest
  );
  const ownership = adoptedReference?.ownership || adoptedReference?.rights || "inspiration-only";
  const fidelity = adoptedReference
    ? createReferenceFidelityContract({
        referenceId: adoptedReference.id || "adopted-reference",
        sourceDigest: adoptedReference.sourceDigest,
        ownership,
        approved: true
      })
    : {
        version: "1.0.0",
        mode: "principle-synthesis",
        measurableRelationships: [],
        protectionBoundary: "No approved, hash-bound reference authorizes close reproduction.",
        claimBoundary: "Build an original project system and record any reference influence."
      };
  const plan = {
    version: "1.0.0",
    id: `site-plan-${createHash("sha256").update(JSON.stringify({ goal, profile })).digest("hex").slice(0, 16)}`,
    createdAt,
    profile,
    goal,
    audience: clean(brief.audience) || "Define the primary audience before copy and interaction implementation.",
    primaryAction: clean(brief.primaryAction || brief.cta) || "Define one primary action and its success state.",
    sections: defaultSections(brief).map((section, index) => ({
      id: `section-${index + 1}`,
      purpose: typeof section === "string" ? section : clean(section.purpose || section.title),
      contentStatus: "must-use-real-or-approved-copy",
      responsiveTransformationRequired: true
    })),
    uiSources: resolveReferenceSources().map(({ id, label, kind, url, ingestion }) => ({ id, label, kind, url, ingestion })),
    referenceFidelity: fidelity,
    assetBoundaries: {
      isolatedObjectRule: "When the layout needs a whale, product, food item, character, mark, ornament, or line overlay, generate only that isolated subject as a transparent PNG; do not bake in sky, horizon, scene, page background, headline, or UI.",
      identityArtworkRule: "Identity-bearing lines, dividers, contours, flourishes, and textured ornaments are generated raster assets. CSS/Canvas may not imitate them.",
      functionalGeometryRule: "CSS is limited to semantic functional geometry such as focus rings, control hit areas, and structural borders.",
      directionFrameRule: "A full-page direction frame is reference evidence and can never be cropped into a production asset.",
      svgAllowed: false
    },
    implementationSequence: [
      "lock content, actions, sections, and responsive behavior",
      "bind reference evidence and measurable fidelity targets",
      "approve a direction track",
      "generate isolated production assets and raster identity artwork",
      "build the signature skeleton and responsive transformations",
      "compare matched captures, repair divergences, and verify runtime behavior"
    ],
    motionVideoStage: createMotionVideoStage(brief),
    creationGates: [
      "site-plan-approved-or-explicitly-adopted",
      "reference-rights-and-fidelity-mode-resolved",
      "asset-composition-boundaries-resolved",
      "direction-evidence-track-resolved"
    ],
    claimBoundary: "This artifact plans the site before implementation. It does not count as direction approval, generated assets, implementation, or final proof."
  };
  return validateSitePlan(plan);
}

