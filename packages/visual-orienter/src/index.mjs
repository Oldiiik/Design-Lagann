import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const SCHEMA_VERSION = "0.4.0";
export const VISUAL_ORIENTATION_SCHEMA_VERSION = SCHEMA_VERSION;
const OPTIMIZED_SCHEMA_VERSION = "0.5.0";
export const OPTIMIZED_VISUAL_ORIENTATION_SCHEMA_VERSION = OPTIMIZED_SCHEMA_VERSION;
const VIEWPORTS = Object.freeze(["desktop", "mobile"]);
const LOCAL_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const SUPER_QUALITY_ALIASES = new Set(["super-quality", "superquality", "super_quality"]);

export const ORIENTATION_SCORE_DIMENSIONS = Object.freeze([
  { id: "originality", weight: 1.3, direction: "higher" },
  { id: "productFit", weight: 1.4, direction: "higher" },
  { id: "hierarchy", weight: 1.2, direction: "higher" },
  { id: "feasibility", weight: 1.0, direction: "higher" },
  { id: "responsiveViability", weight: 1.2, direction: "higher" },
  { id: "implementationDifficulty", weight: 0.6, direction: "lower" },
  { id: "accessibilityFakeUiRisk", weight: 1.2, direction: "lower" },
  { id: "assetMediumImplications", weight: 0.8, direction: "higher" }
]);

const ARCHETYPES = Object.freeze([
  {
    id: "object-axis",
    name: "Object as binding",
    mechanism: (subject) => `${subject} becomes the page axis: type, evidence, and action align to it, cross it, or are revealed by it.`,
    narrative: "Begin with the object setting the reading geometry, move through proof that physically changes its role, pause, then resolve the primary action against its final state.",
    objectRole: "anchor and bridge",
    materialRestraint: "Keep the page mostly flat; grant depth only to the focal object and controls that manipulate it.",
    mobile: "Turn the desktop axis into a crop, hinge, or edge relationship that changes reading order instead of stacking two columns.",
    medium: "Use a high-fidelity image-generated transparent raster, qualified real product capture, video poster, or justified 3D asset. SVG is globally forbidden for every role and fallback.",
    refuses: ["default split hero", "detached product render", "effects substituting for object integration"]
  },
  {
    id: "editorial-index",
    name: "Evidence as publication",
    mechanism: (subject) => `Treat the evidence around ${subject} as an indexed publication whose folios, crops, and marginal notes organize the page.`,
    narrative: "Open with a cover-like thesis, reveal an annotated sequence of proof, interrupt it with one full-bleed argument, and close on a concise colophon/action.",
    objectRole: "reveal and interrupt",
    materialRestraint: "Use type scale, crop, rules, and paper-like tonal shifts before shadow, blur, or ornamental depth.",
    mobile: "Convert the spread into a single-page reading sequence with a persistent folio or edge marker; preserve editorial tension through crop and indentation.",
    medium: "Use art-directed raster imagery for editorial crops, CSS for rules and typography, and established iconography only for utilities.",
    refuses: ["repeated card grid", "magazine styling without narrative logic", "tiny decorative editorial labels everywhere"]
  },
  {
    id: "action-stage",
    name: "Action changes the stage",
    mechanism: (_subject, action) => `Make the interface state around “${action}” the spatial event: the page visibly reorganizes as the visitor approaches or completes the action.`,
    narrative: "State the promise, demonstrate the action in its resting state, reveal supporting proof as consequences of that state, then show a calm completion state.",
    objectRole: "utility and anchor",
    materialRestraint: "Reserve movement and elevation for real state transitions; all explanatory content remains quiet and materially subordinate.",
    mobile: "Move the action into the thumb zone and let state changes replace desktop simultaneity; never shrink a desktop control tableau.",
    medium: "Use semantic DOM/CSS for real controls; use Canvas for a justified interactive state machine and always provide a raster reduced-motion equivalent. Never emit or fall back to SVG.",
    refuses: ["fake dashboard controls", "decorative interaction demos", "CTA repeated without state or consequence"]
  },
  {
    id: "process-continuum",
    name: "Process becomes continuity",
    mechanism: (subject) => `A single process trace travels through the page and changes how ${subject} is cropped, labeled, and understood at each stage.`,
    narrative: "Introduce the unresolved input, advance through materially distinct process stages, create one dense transformation beat, then finish in a spacious outcome/action.",
    objectRole: "bridge",
    materialRestraint: "One trace, one accent, and one motion grammar; do not decorate every stage with its own material effect.",
    mobile: "Turn the trace into a vertical progression with deliberate stage compression and one retained cross-axis interruption.",
    medium: "Prefer CSS for a simple trace, Canvas for genuinely procedural behavior, and a still raster fallback for any runtime-dependent signature moment.",
    refuses: ["timeline component with identical steps", "process cards", "particles without semantic process meaning"]
  },
  {
    id: "threshold-reveal",
    name: "Understanding through thresholds",
    mechanism: (subject) => `Reveal ${subject} through a sequence of apertures, occlusions, or covers so each section resolves a specific question before exposing the next.`,
    narrative: "Arrive at a partially withheld thesis, cross two information thresholds, reach a full visual reveal at the climax, then return to a direct action.",
    objectRole: "reveal and interrupt",
    materialRestraint: "Use one masking or cover behavior; avoid layering multiple blur, glass, glow, and parallax effects.",
    mobile: "Translate lateral reveals into vertical covers or crop changes with an explicit tap/scroll alternative and no hidden essential copy.",
    medium: "Use an art-directed raster or video poster for the revealed subject; CSS masks may frame it, but cannot replace the subject asset.",
    refuses: ["mystery that obscures the offer", "scroll-jacking", "blurred content as decoration"]
  }
]);

const string = (value) => typeof value === "string" ? value.trim() : "";
const array = (value) => Array.isArray(value) ? value : [];
const clamp = (value, minimum = 0, maximum = 10) =>
  Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));

function requiredString(value, label) {
  if (!string(value)) throw new Error(`${label} must be a non-empty string`);
}

function scoreRange(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 10) {
    throw new Error(`${label} must be a number from 0 to 10`);
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

export function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

function briefContract(brief, projectDna) {
  const briefBrandTruth = array(brief.brandTruths)[0] || array(brief.businessTruths)[0];
  const dnaBrandTruth = string(projectDna?.creativeDirection?.brandTruth);
  const brandTruth = briefBrandTruth || dnaBrandTruth || string(brief.goal);
  const briefPrimaryAction = string(brief.primaryAction);
  const primaryAction = briefPrimaryAction || "complete the primary task";
  const briefDesiredRecall = string(brief.desiredRecall);
  const dnaDesiredRecall = string(projectDna?.creativeDirection?.desiredRecall);
  const desiredRecall = briefDesiredRecall ||
    dnaDesiredRecall ||
    `the central visual argument behind ${brief.goal}`;
  const subject = string(brief.primarySubject) ||
    string(brief.assets?.[0]?.description) ||
    string(brief.assets?.[0]?.subject) ||
    string(brief.assets?.[0]?.id) ||
    "the primary product or brand object";
  return {
    goal: string(brief.goal),
    audience: string(brief.audience) || null,
    brandTruth,
    primaryAction,
    desiredRecall,
    subject,
    sections: array(brief.sections).map((item) =>
      typeof item === "string" ? item : string(item?.title) || string(item?.purpose)
    ).filter(Boolean),
    requiredInteractions: array(brief.interactions).map(String),
    requiredStates: array(brief.requiredStates).map(String),
    constraints: array(brief.constraints).map(String),
    forbiddenPatterns: array(brief.forbiddenPatterns).map(String),
    fieldEvidence: {
      goal: { source: "brief", confidence: "exact" },
      brandTruth: briefBrandTruth
        ? { source: "brief", confidence: "exact" }
        : dnaBrandTruth
          ? { source: "project-dna", confidence: "inferred" }
          : { source: "brief.goal fallback", confidence: "inferred" },
      primaryAction: briefPrimaryAction
        ? { source: "brief", confidence: "exact" }
        : { source: "orienter fallback", confidence: "inferred" },
      desiredRecall: briefDesiredRecall
        ? { source: "brief", confidence: "exact" }
        : dnaDesiredRecall
          ? { source: "project-dna", confidence: "inferred" }
          : { source: "orienter fallback", confidence: "inferred" }
    },
    assets: array(brief.assets).map((asset, index) => ({
      id: string(asset?.id) || `asset-${index + 1}`,
      role: string(asset?.role) || "unspecified",
      description: typeof asset === "string" ? asset : string(asset?.description) || string(asset?.subject) || null,
      requiredMedium: string(asset?.implementation) || string(asset?.medium) || null
    }))
  };
}

function exactRequirements(contract) {
  const requirements = [
    { id: "goal", source: "brief", confidence: "exact", value: contract.goal }
  ];
  if (contract.fieldEvidence.brandTruth.confidence === "exact") {
    requirements.push({ id: "brand-truth", source: "brief", confidence: "exact", value: contract.brandTruth });
  }
  if (contract.fieldEvidence.primaryAction.confidence === "exact") {
    requirements.push({ id: "primary-action", source: "brief", confidence: "exact", value: contract.primaryAction });
  }
  if (contract.audience) requirements.push({ id: "audience", source: "brief", confidence: "exact", value: contract.audience });
  if (contract.sections.length) requirements.push({ id: "sections", source: "brief", confidence: "exact", value: contract.sections });
  if (contract.requiredInteractions.length) {
    requirements.push({ id: "interactions", source: "brief", confidence: "exact", value: contract.requiredInteractions });
  }
  if (contract.requiredStates.length) {
    requirements.push({ id: "states", source: "brief", confidence: "exact", value: contract.requiredStates });
  }
  if (contract.constraints.length) {
    requirements.push({ id: "constraints", source: "brief", confidence: "exact", value: contract.constraints });
  }
  return requirements;
}

function promptFor(candidate, viewport, contract) {
  const mobile = viewport === "mobile";
  const size = mobile ? "390×844 mobile viewport, shown as one complete tall page" : "1440×1000 desktop viewport, shown as one complete wide page";
  const sections = contract.sections.length
    ? contract.sections.join(" → ")
    : "opening thesis → product or service proof → signature structural moment → practical closing action";
  const interactionFacts = contract.requiredInteractions.length
    ? `Real required interactions to represent without inventing new controls: ${contract.requiredInteractions.join("; ")}.`
    : "Do not invent dashboards, settings, form fields, controls, or product states that are not required by the brief.";
  const responsive = mobile
    ? `Mobile transformation: ${candidate.responsiveMutation}`
    : "Compose for desktop simultaneity and generous negative space while keeping the primary reading path unmistakable.";
  const forbidden = [
    ...candidate.refuses,
    ...contract.forbiddenPatterns,
    "generic left-copy/right-image hero",
    "three-card or bento-grid filler",
    "stock-looking imagery",
    "universal rounded containers",
    "decorative effects used as the main idea"
  ];
  return [
    "Create a high-fidelity, full-page website visual concept for creative direction review.",
    `Target: ${size}; no browser chrome, device frame, design-tool canvas, annotations, or presentation board.`,
    `Product goal: ${contract.goal}. Brand truth: ${contract.brandTruth}. Audience: ${contract.audience || "use the product context implied by the brief"}.`,
    `Primary action: ${contract.primaryAction}. Desired five-minute recall: ${contract.desiredRecall}.`,
    `Direction thesis: ${candidate.thesis}`,
    `Organizing relationship: ${candidate.signatureRelationship}`,
    `Page narrative: ${candidate.pageNarrative}`,
    `Object role: ${candidate.objectRole}. Material restraint: ${candidate.materialRestraint}`,
    `Content sequence: ${sections}. ${interactionFacts}`,
    `Asset direction: ${candidate.assetMediumHypothesis}`,
    responsive,
    "Use believable, legible product copy from the supplied facts. When facts are absent, use restrained neutral copy rather than fabricated metrics, testimonials, prices, awards, or claims.",
    `Explicitly avoid: ${[...new Set(forbidden)].join("; ")}.`,
    "This image is a creative reference, never an implementation specification. Do not show CSS values, components, tokens, breakpoints, code, measurements, or engineering annotations.",
    "Favor one memorable composition and coherent page rhythm over many effects. Make the complete page feel human-directed and specific to this brief."
  ].join("\n");
}

function attachPrompts(candidate, contract, promptOverrides = {}) {
  candidate.prompts = Object.fromEntries(VIEWPORTS.map((viewport) => {
    const override = promptOverrides?.[viewport];
    const prompt = string(
      typeof override === "string"
        ? override
        : override?.prompt
    ) || promptFor(candidate, viewport, contract);
    return [viewport, {
      id: `${candidate.id}-${viewport}`,
      targetModel: "gpt-image-2",
      viewport,
      aspect: viewport === "mobile" ? "portrait" : "landscape",
      fullPage: true,
      creativeReferenceOnly: true,
      prompt,
      sha256: sha256Text(prompt)
    }];
  }));
  return candidate;
}

function candidateFromArchetype(archetype, index, contract, projectDna) {
  const dnaThesis = string(projectDna?.creativeThesis) || string(projectDna?.creativeIdea);
  const mechanism = archetype.mechanism(contract.subject, contract.primaryAction);
  const thesis = index === 0 && dnaThesis
    ? `${dnaThesis} Express it through this mechanism: ${mechanism}`
    : `Express “${contract.brandTruth}” through ${mechanism.charAt(0).toLowerCase()}${mechanism.slice(1)}`;
  const candidate = {
    id: archetype.id,
    name: archetype.name,
    thesis,
    organizingMechanism: archetype.id,
    signatureRelationship: mechanism,
    pageNarrative: archetype.narrative,
    objectRole: archetype.objectRole,
    materialRestraint: archetype.materialRestraint,
    responsiveMutation: archetype.mobile,
    assetMediumHypothesis: archetype.medium,
    recallTarget: contract.desiredRecall,
    refuses: archetype.refuses,
    differenceProof: `This candidate is organized by ${archetype.id}; changing its palette or typeface would not turn it into another candidate.`
  };
  candidate.fingerprint = sha256Text(stableJson({
    mechanism: candidate.organizingMechanism,
    relationship: candidate.signatureRelationship,
    narrative: candidate.pageNarrative,
    mobile: candidate.responsiveMutation
  })).slice(0, 16);
  return attachPrompts(candidate, contract);
}

function candidateFromDirection(direction, index, contract) {
  if (!direction || typeof direction !== "object" || Array.isArray(direction)) {
    throw new Error(`directionCandidates[${index}] must be an object`);
  }
  const id = string(direction.id) || `direction-${index + 1}`;
  requiredString(direction.thesis, `directionCandidates[${index}].thesis`);
  requiredString(direction.signatureRelationship, `directionCandidates[${index}].signatureRelationship`);
  requiredString(direction.responsiveMutation, `directionCandidates[${index}].responsiveMutation`);
  const candidate = {
    id,
    name: string(direction.name) || `Direction ${index + 1}`,
    thesis: string(direction.thesis),
    organizingMechanism: string(direction.organizingMechanism) || id,
    signatureRelationship: string(direction.signatureRelationship),
    pageNarrative: string(direction.pageNarrative) ||
      "Open with the thesis, let the signature relationship reorganize proof and process, then resolve the primary action.",
    objectRole: string(direction.objectRole) || "anchor and bridge",
    materialRestraint: string(direction.materialRestraint) ||
      "Use one coherent material system and reserve depth for the focal relationship.",
    responsiveMutation: string(direction.responsiveMutation),
    assetMediumHypothesis: string(direction.assetMediumHypothesis) ||
      "Route dominant product imagery to art-directed raster assets and preserve semantic controls as HTML/CSS.",
    recallTarget: string(direction.recallTarget) || contract.desiredRecall,
    refuses: array(direction.refuses).map(String).filter(Boolean),
    differenceProof: string(direction.differenceProof) ||
      `Direction ${index + 1} is defined by ${string(direction.organizingMechanism) || id}, not by palette or effects.`
  };
  candidate.fingerprint = sha256Text(stableJson({
    mechanism: candidate.organizingMechanism,
    relationship: candidate.signatureRelationship,
    narrative: candidate.pageNarrative,
    mobile: candidate.responsiveMutation
  })).slice(0, 16);
  return attachPrompts(candidate, contract, direction.prompts);
}

function normalizeApproval(approval) {
  const source = approval && typeof approval === "object" ? approval : {};
  const status = string(source.status) || "pending";
  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("humanApproval.status must be pending, approved, or rejected");
  }
  const normalized = {
    status,
    candidateId: string(source.candidateId) || null,
    decidedBy: string(source.decidedBy) || null,
    decidedAt: string(source.decidedAt) || null,
    note: string(source.note) || null,
    evidenceSource: string(source.evidenceSource) || null
  };
  if (status !== "pending") {
    if (!normalized.decidedBy) {
      throw new Error("humanApproval.decidedBy is required for an approval or rejection");
    }
    if (!normalized.decidedAt || Number.isNaN(Date.parse(normalized.decidedAt))) {
      throw new Error("humanApproval.decidedAt must be an ISO-compatible timestamp for an approval or rejection");
    }
    if (!normalized.note && !normalized.evidenceSource) {
      throw new Error("humanApproval.note or humanApproval.evidenceSource is required for an approval or rejection");
    }
  }
  if (status === "approved" && !normalized.candidateId) {
    throw new Error("humanApproval.candidateId is required for approval");
  }
  return normalized;
}

export function validateVisualOrientationPlan(plan) {
  if (!plan || typeof plan !== "object") throw new Error("visual orientation plan must be an object");
  if (plan.schemaVersion !== SCHEMA_VERSION) throw new Error(`visual orientation plan schemaVersion must be ${SCHEMA_VERSION}`);
  requiredString(plan.id, "plan.id");
  if (!plan.generationContract || plan.generationContract.execution !== "external-only") {
    throw new Error("plan.generationContract must declare external-only execution");
  }
  if (plan.generationContract.targetModel !== "gpt-image-2") {
    throw new Error("plan generation target must be gpt-image-2");
  }
  if (!Array.isArray(plan.candidates) || plan.candidates.length < 3 || plan.candidates.length > 5) {
    throw new Error("plan.candidates must contain 3 to 5 candidates");
  }
  const ids = new Set();
  const fingerprints = new Set();
  for (const [index, candidate] of plan.candidates.entries()) {
    requiredString(candidate.id, `candidates[${index}].id`);
    requiredString(candidate.thesis, `candidates[${index}].thesis`);
    requiredString(candidate.signatureRelationship, `candidates[${index}].signatureRelationship`);
    requiredString(candidate.responsiveMutation, `candidates[${index}].responsiveMutation`);
    if (ids.has(candidate.id)) throw new Error(`duplicate candidate id ${candidate.id}`);
    if (fingerprints.has(candidate.fingerprint)) throw new Error("orientation candidates are not materially distinct");
    ids.add(candidate.id);
    fingerprints.add(candidate.fingerprint);
    for (const viewport of VIEWPORTS) {
      const prompt = candidate.prompts?.[viewport];
      if (!prompt || prompt.targetModel !== "gpt-image-2" || prompt.viewport !== viewport) {
        throw new Error(`${candidate.id} is missing its ${viewport} GPT Image 2 prompt`);
      }
      if (prompt.creativeReferenceOnly !== true || prompt.fullPage !== true) {
        throw new Error(`${candidate.id}.${viewport} prompt must be a full-page creative reference`);
      }
      requiredString(prompt.prompt, `${candidate.id}.${viewport}.prompt`);
      if (prompt.sha256 !== sha256Text(prompt.prompt)) {
        throw new Error(`${candidate.id}.${viewport} prompt hash does not match`);
      }
    }
  }
  normalizeApproval(plan.humanApproval);
  return plan;
}

/**
 * Creates prompts only. It never calls GPT Image 2 or any other image service.
 */
export function createVisualOrientationPlan(brief, projectDna = {}, options = {}) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) throw new Error("brief must be an object");
  requiredString(brief.goal, "brief.goal");
  const authoredDirections = options.directionCandidates ?? brief.directionCandidates;
  if (authoredDirections !== undefined && !Array.isArray(authoredDirections)) {
    throw new Error("directionCandidates must be an array");
  }
  const requestedProfile = String(brief.executionProfile || brief.mode || "balanced").trim().toLowerCase();
  const orientationProfile = SUPER_QUALITY_ALIASES.has(requestedProfile)
    ? "quality"
    : requestedProfile;
  const requestedCount = authoredDirections?.length ?? options.candidateCount ?? brief.orientationCandidateCount ??
    (["economy", "fast"].includes(orientationProfile)
      ? 3
      : orientationProfile === "balanced"
        ? 3
        : 5);
  if (!Number.isInteger(requestedCount) || requestedCount < 3 || requestedCount > 5) {
    throw new Error("candidateCount must be an integer from 3 to 5");
  }
  const contract = briefContract(brief, projectDna);
  const candidates = authoredDirections
    ? authoredDirections.map((direction, index) => candidateFromDirection(direction, index, contract))
    : ARCHETYPES
      .slice(0, requestedCount)
      .map((archetype, index) => candidateFromArchetype(archetype, index, contract, projectDna));
  const id = `orientation-${sha256Text(stableJson({
    contract,
    projectThesis: projectDna?.creativeThesis || projectDna?.creativeIdea || null,
    candidateFingerprints: candidates.map((candidate) => candidate.fingerprint)
  })).slice(0, 12)}`;
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    id,
    briefContract: contract,
    exactRequirements: exactRequirements(contract),
    generationContract: {
      targetModel: "gpt-image-2",
      execution: "external-only",
      localNodeGeneration: false,
      statement: "This package emits production-oriented prompts and validates externally generated local files. It does not call GPT Image 2.",
      outputRole: "creative-reference",
      groundTruth: false
    },
    candidates,
    requiredEvidence: {
      viewports: [...VIEWPORTS],
      localFiles: true,
      sha256Binding: true,
      generationProvenance: [
        "provider",
        "requestedModel",
        "reportedModel or explicit unreported",
        "generatedAt",
        "generationMode",
        "humanEdits"
      ],
      independentCritic: true,
      criticDimensions: ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id)
    },
    groundTruthPolicy: {
      generatedImagesAreGroundTruth: false,
      pixelSimilarityIsAcceptance: false,
      exactValuesMayBeInferredFromImage: false,
      implementationRequiresBrowserVerification: true
    },
    humanApproval: normalizeApproval(options.humanApproval)
  };
  return validateVisualOrientationPlan(plan);
}

function candidateMap(plan) {
  return new Map(plan.candidates.map((candidate) => [candidate.id, candidate]));
}

function promptHashFor(candidate, viewport) {
  return candidate.prompts[viewport].sha256;
}

function inputImages(submission) {
  return {
    desktop: submission.images?.desktop || (
      submission.desktopPath ? { path: submission.desktopPath, promptSha256: submission.desktopPromptSha256 } : null
    ),
    mobile: submission.images?.mobile || (
      submission.mobilePath ? { path: submission.mobilePath, promptSha256: submission.mobilePromptSha256 } : null
    )
  };
}

function ensureLocalPath(rawPath, label) {
  requiredString(rawPath, label);
  if (/^(?:https?|data|file):/i.test(rawPath)) {
    throw new Error(`${label} must be a local filesystem path, not a URL or data URI`);
  }
  const extension = path.extname(rawPath).toLowerCase();
  if (!LOCAL_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`${label} must be a local PNG, JPEG, WebP, or AVIF image`);
  }
}

function portablePath(resolved, root) {
  const relative = path.relative(root, resolved);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.split(path.sep).join("/")
    : resolved;
}

function inspectImageDimensions(bytes, extension) {
  const unknown = {
    width: null,
    height: null,
    aspect: null,
    status: "unverified"
  };
  try {
    if (
      extension === ".png" &&
      bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.subarray(12, 16).toString("ascii") === "IHDR"
    ) {
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return {
          width,
          height,
          aspect: width > height ? "landscape" : height > width ? "portrait" : "square",
          status: "verified-from-file"
        };
      }
    }
    if ([".jpg", ".jpeg"].includes(extension) && bytes.length >= 4) {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = bytes[offset + 1];
        const length = bytes.readUInt16BE(offset + 2);
        if ([
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
          0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
        ].includes(marker)) {
          const height = bytes.readUInt16BE(offset + 5);
          const width = bytes.readUInt16BE(offset + 7);
          return {
            width,
            height,
            aspect: width > height ? "landscape" : height > width ? "portrait" : "square",
            status: "verified-from-file"
          };
        }
        if (!Number.isFinite(length) || length < 2) break;
        offset += 2 + length;
      }
    }
    if (
      extension === ".webp" &&
      bytes.length >= 30 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      const variant = bytes.subarray(12, 16).toString("ascii");
      let width = null;
      let height = null;
      if (variant === "VP8X") {
        width = 1 + bytes.readUIntLE(24, 3);
        height = 1 + bytes.readUIntLE(27, 3);
      } else if (variant === "VP8 " && bytes.length >= 30) {
        width = bytes.readUInt16LE(26) & 0x3fff;
        height = bytes.readUInt16LE(28) & 0x3fff;
      } else if (variant === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
        const packed = bytes.readUInt32LE(21);
        width = 1 + (packed & 0x3fff);
        height = 1 + ((packed >> 14) & 0x3fff);
      }
      if (width > 0 && height > 0) {
        return {
          width,
          height,
          aspect: width > height ? "landscape" : height > width ? "portrait" : "square",
          status: "verified-from-file"
        };
      }
    }
  } catch {
    return unknown;
  }
  return unknown;
}

function validateGenerationProvenance(provenance, plan, candidateId) {
  if (!provenance || typeof provenance !== "object") {
    throw new Error(`${candidateId}.provenance is required`);
  }
  requiredString(provenance.provider, `${candidateId}.provenance.provider`);
  const requestedModel = string(provenance.requestedModel) || plan.generationContract.targetModel;
  const reportedModel = string(provenance.reportedModel) || string(provenance.model);
  requiredString(reportedModel, `${candidateId}.provenance.reportedModel`);
  requiredString(provenance.generatedAt, `${candidateId}.provenance.generatedAt`);
  if (Number.isNaN(Date.parse(provenance.generatedAt))) {
    throw new Error(`${candidateId}.provenance.generatedAt must be an ISO-compatible timestamp`);
  }
  if (requestedModel !== plan.generationContract.targetModel) {
    throw new Error(`${candidateId}.provenance.requestedModel must match ${plan.generationContract.targetModel}`);
  }
  if (provenance.generationMode !== "external") {
    throw new Error(`${candidateId}.provenance.generationMode must be external`);
  }
  if (provenance.humanEdits === undefined) {
    throw new Error(`${candidateId}.provenance.humanEdits must be recorded`);
  }
  return {
    provider: provenance.provider,
    requestedModel,
    reportedModel,
    modelStatus: reportedModel === "unreported"
      ? "unreported-by-host"
      : reportedModel === requestedModel
        ? "target-confirmed"
        : "different-model-reported",
    generatedAt: provenance.generatedAt,
    generationMode: provenance.generationMode,
    generationId: string(provenance.generationId) || null,
    humanEdits: provenance.humanEdits,
    notes: string(provenance.notes) || null
  };
}

async function bindImage(image, candidate, viewport, root, provenance) {
  if (!image || typeof image !== "object") throw new Error(`${candidate.id}.images.${viewport} is required`);
  ensureLocalPath(image.path, `${candidate.id}.images.${viewport}.path`);
  const resolved = path.resolve(root, image.path);
  const metadata = await stat(resolved).catch(() => null);
  if (!metadata?.isFile() || metadata.size < 1) {
    throw new Error(`${candidate.id}.images.${viewport}.path must resolve to a non-empty local file`);
  }
  const promptSha256 = string(image.promptSha256) || string(image.promptHash);
  const expectedPromptHash = promptHashFor(candidate, viewport);
  if (promptSha256 !== expectedPromptHash) {
    throw new Error(`${candidate.id}.images.${viewport}.promptSha256 does not match the emitted prompt`);
  }
  const bytes = await readFile(resolved);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (image.sha256 && image.sha256 !== sha256) {
    throw new Error(`${candidate.id}.images.${viewport}.sha256 does not match the local file`);
  }
  return {
    viewport,
    localPath: portablePath(resolved, root),
    sha256,
    bytes: metadata.size,
    promptId: candidate.prompts[viewport].id,
    promptSha256,
    requestedModel: provenance.requestedModel,
    model: provenance.reportedModel,
    modelStatus: provenance.modelStatus,
    dimensions: inspectImageDimensions(bytes, path.extname(resolved).toLowerCase())
  };
}

/**
 * Binds files that were generated outside Node. It performs no image generation.
 */
export async function bindExternalOrientationImages(plan, submissions, { projectRoot = process.cwd() } = {}) {
  validateVisualOrientationPlan(plan);
  if (!Array.isArray(submissions)) throw new Error("submissions must be an array");
  const root = path.resolve(projectRoot);
  const byId = new Map(submissions.map((submission) => [submission?.candidateId, submission]));
  if (byId.size !== submissions.length) throw new Error("submissions contain a duplicate or missing candidateId");
  const candidates = [];
  for (const candidate of plan.candidates) {
    const submission = byId.get(candidate.id);
    if (!submission) throw new Error(`submission is missing candidate ${candidate.id}`);
    const provenance = validateGenerationProvenance(submission.provenance, plan, candidate.id);
    const images = inputImages(submission);
    const desktop = await bindImage(images.desktop, candidate, "desktop", root, provenance);
    const mobile = await bindImage(images.mobile, candidate, "mobile", root, provenance);
    candidates.push({
      candidateId: candidate.id,
      images: { desktop, mobile },
      provenance
    });
  }
  if (byId.size !== plan.candidates.length) {
    const extras = [...byId.keys()].filter((id) => !candidateMap(plan).has(id));
    if (extras.length) throw new Error(`submissions contain unknown candidates: ${extras.join(", ")}`);
  }
  const binding = {
    schemaVersion: SCHEMA_VERSION,
    planId: plan.id,
    bindingId: `binding-${sha256Text(stableJson(candidates.map((candidate) => ({
      id: candidate.candidateId,
      desktop: candidate.images.desktop.sha256,
      mobile: candidate.images.mobile.sha256,
      provenance: candidate.provenance
    })))).slice(0, 16)}`,
    projectRoot: root,
    candidates,
    statement: "Local files were hashed and bound to emitted prompts. No image generation occurred in this package."
  };
  validateBoundEvidenceStructure(plan, binding);
  return binding;
}

function validateBoundEvidenceStructure(plan, evidence) {
  if (!evidence || typeof evidence !== "object") throw new Error("bound orientation evidence is required");
  if (evidence.schemaVersion !== SCHEMA_VERSION) throw new Error(`bound evidence schemaVersion must be ${SCHEMA_VERSION}`);
  if (evidence.planId !== plan.id) throw new Error("bound evidence planId does not match");
  if (!Array.isArray(evidence.candidates)) throw new Error("bound evidence candidates must be an array");
  const byId = new Map(evidence.candidates.map((candidate) => [candidate.candidateId, candidate]));
  if (byId.size !== plan.candidates.length || evidence.candidates.length !== plan.candidates.length) {
    throw new Error("bound evidence must cover every candidate exactly once");
  }
  for (const candidate of plan.candidates) {
    const bound = byId.get(candidate.id);
    if (!bound) throw new Error(`bound evidence is missing ${candidate.id}`);
    const provenance = validateGenerationProvenance(bound.provenance, plan, candidate.id);
    for (const viewport of VIEWPORTS) {
      const image = bound.images?.[viewport];
      requiredString(image?.localPath, `${candidate.id}.images.${viewport}.localPath`);
      if (!/^[a-f0-9]{64}$/i.test(image?.sha256 || "")) {
        throw new Error(`${candidate.id}.images.${viewport}.sha256 must be a SHA-256 digest`);
      }
      if (image.promptSha256 !== promptHashFor(candidate, viewport)) {
        throw new Error(`${candidate.id}.images.${viewport} is bound to the wrong prompt`);
      }
      if (
        image.requestedModel !== provenance.requestedModel ||
        image.model !== provenance.reportedModel ||
        image.modelStatus !== provenance.modelStatus
      ) {
        throw new Error(`${candidate.id}.images.${viewport} has inconsistent model provenance`);
      }
      if (
        image.dimensions?.status === "verified-from-file" &&
        image.dimensions.aspect !== candidate.prompts[viewport].aspect
      ) {
        throw new Error(
          `${candidate.id}.images.${viewport} is ${image.dimensions.aspect}, expected ${candidate.prompts[viewport].aspect}`
        );
      }
    }
  }
  return evidence;
}

export async function verifyBoundOrientationImages(plan, evidence, { projectRoot = evidence?.projectRoot || process.cwd() } = {}) {
  try {
    validateVisualOrientationPlan(plan);
    validateBoundEvidenceStructure(plan, evidence);
  } catch (error) {
    return { valid: false, issues: [{ code: "INVALID_BINDING", message: error.message }] };
  }
  const root = path.resolve(projectRoot);
  const issues = [];
  for (const candidate of evidence.candidates) {
    for (const viewport of VIEWPORTS) {
      const image = candidate.images[viewport];
      const resolved = path.isAbsolute(image.localPath) ? image.localPath : path.resolve(root, image.localPath);
      try {
        const metadata = await stat(resolved);
        if (!metadata.isFile() || metadata.size < 1) {
          issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: candidate.candidateId, viewport, message: `${resolved} is not a non-empty file` });
          continue;
        }
        const actual = await sha256File(resolved);
        if (actual !== image.sha256) {
          issues.push({ code: "IMAGE_HASH_MISMATCH", candidateId: candidate.candidateId, viewport, message: `${viewport} image changed after binding` });
        }
        const bytes = await readFile(resolved);
        const dimensions = inspectImageDimensions(bytes, path.extname(resolved).toLowerCase());
        if (
          dimensions.status === "verified-from-file" &&
          dimensions.aspect !== candidateMap(plan).get(candidate.candidateId).prompts[viewport].aspect
        ) {
          issues.push({
            code: "VIEWPORT_ASPECT_MISMATCH",
            candidateId: candidate.candidateId,
            viewport,
            message: `${viewport} image is ${dimensions.width}×${dimensions.height} (${dimensions.aspect})`
          });
        }
        if (
          image.dimensions?.status === "verified-from-file" &&
          (
            image.dimensions.width !== dimensions.width ||
            image.dimensions.height !== dimensions.height
          )
        ) {
          issues.push({
            code: "IMAGE_DIMENSION_MISMATCH",
            candidateId: candidate.candidateId,
            viewport,
            message: `${viewport} image dimensions changed after binding`
          });
        }
      } catch {
        issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: candidate.candidateId, viewport, message: `${resolved} cannot be read` });
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

function evidenceMap(evidence) {
  return new Map(evidence.candidates.map((candidate) => [candidate.candidateId, candidate]));
}

function reportMap(report) {
  return new Map(report.candidateReports.map((candidate) => [candidate.candidateId, candidate]));
}

export function validateOrientationCriticReport(report, { plan, evidence } = {}) {
  validateVisualOrientationPlan(plan);
  validateBoundEvidenceStructure(plan, evidence);
  if (!report || typeof report !== "object") throw new Error("orientation critic report must be an object");
  if (report.schemaVersion !== SCHEMA_VERSION) throw new Error(`critic report schemaVersion must be ${SCHEMA_VERSION}`);
  if (report.planId !== plan.id) throw new Error("critic report planId does not match");
  if (!report.critic || typeof report.critic !== "object") throw new Error("critic metadata is required");
  requiredString(report.critic.provider, "critic.provider");
  requiredString(report.critic.model, "critic.model");
  requiredString(report.critic.criticId, "critic.criticId");
  requiredString(report.critic.generatedAt, "critic.generatedAt");
  if (Number.isNaN(Date.parse(report.critic.generatedAt))) throw new Error("critic.generatedAt must be an ISO-compatible timestamp");
  if (report.critic.independentOfGeneration !== true) {
    throw new Error("critic must attest independentOfGeneration=true");
  }
  if (
    report.limitations?.generatedImagesAreCreativeReferences !== true ||
    report.limitations?.pixelSimilarityIsNotAcceptance !== true ||
    report.limitations?.implementationRequiresVerification !== true
  ) {
    throw new Error("critic report must acknowledge the generated-image and pixel-similarity limitations");
  }
  if (!Array.isArray(report.candidateReports)) throw new Error("candidateReports must be an array");
  const reports = reportMap(report);
  if (reports.size !== plan.candidates.length || report.candidateReports.length !== plan.candidates.length) {
    throw new Error("critic report must cover every candidate exactly once");
  }
  const bound = evidenceMap(evidence);
  const requiredDimensions = ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id);
  const latestGeneration = Math.max(...evidence.candidates.map((candidate) => Date.parse(candidate.provenance.generatedAt)));
  if (Date.parse(report.critic.generatedAt) < latestGeneration) {
    throw new Error("critic report predates the generated visual evidence");
  }

  for (const candidate of plan.candidates) {
    const item = reports.get(candidate.id);
    if (!item) throw new Error(`critic report is missing ${candidate.id}`);
    if (!["reject", "consider", "shortlist"].includes(item.verdict)) {
      throw new Error(`${candidate.id}.verdict must be reject, consider, or shortlist`);
    }
    if (
      item.coverage?.fullPage !== true ||
      !VIEWPORTS.every((viewport) => item.coverage?.viewports?.includes(viewport)) ||
      !requiredDimensions.every((dimension) => item.coverage?.dimensions?.includes(dimension))
    ) {
      throw new Error(`${candidate.id}.coverage is incomplete`);
    }
    const candidateEvidence = bound.get(candidate.id);
    for (const viewport of VIEWPORTS) {
      if (item.evidence?.imageHashes?.[viewport] !== candidateEvidence.images[viewport].sha256) {
        throw new Error(`${candidate.id}.evidence.${viewport} hash does not match bound evidence`);
      }
    }
    for (const dimension of ORIENTATION_SCORE_DIMENSIONS) {
      const entry = item.scorecard?.[dimension.id];
      if (!entry || typeof entry !== "object") throw new Error(`${candidate.id}.scorecard.${dimension.id} is required`);
      scoreRange(entry.score, `${candidate.id}.scorecard.${dimension.id}.score`);
      requiredString(entry.evidence, `${candidate.id}.scorecard.${dimension.id}.evidence`);
      if (typeof entry.blocker !== "boolean") {
        throw new Error(`${candidate.id}.scorecard.${dimension.id}.blocker must be boolean`);
      }
    }
    for (const key of ["dominantRelationship", "hierarchy", "responsiveTransformation"]) {
      requiredString(item.observations?.[key], `${candidate.id}.observations.${key}`);
    }
    for (const key of ["implementationRisks", "fakeUiRisks", "assetMediumImplications"]) {
      if (!Array.isArray(item.observations?.[key])) throw new Error(`${candidate.id}.observations.${key} must be an array`);
    }
    if (!Array.isArray(item.findings)) throw new Error(`${candidate.id}.findings must be an array`);
  }
  return report;
}

export function scoreOrientationCandidate(candidateReport) {
  const dimensions = ORIENTATION_SCORE_DIMENSIONS.map((definition) => {
    const entry = candidateReport.scorecard[definition.id];
    const effectiveScore = definition.direction === "lower" ? 10 - entry.score : entry.score;
    return {
      id: definition.id,
      rawScore: entry.score,
      effectiveScore,
      direction: definition.direction,
      weight: definition.weight,
      blocker: entry.blocker,
      evidence: entry.evidence
    };
  });
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const weightedScore = dimensions.reduce(
    (sum, dimension) => sum + dimension.effectiveScore * dimension.weight,
    0
  ) / totalWeight;
  const blockers = dimensions.filter((dimension) => dimension.blocker).map((dimension) => dimension.id);
  if (candidateReport.verdict === "reject") blockers.push("critic-verdict");
  if (candidateReport.scorecard.accessibilityFakeUiRisk.score >= 8) blockers.push("high-accessibility-or-fake-ui-risk");
  if (candidateReport.scorecard.productFit.score < 5) blockers.push("insufficient-product-fit");
  if (candidateReport.scorecard.responsiveViability.score < 5) blockers.push("insufficient-responsive-viability");
  return {
    candidateId: candidateReport.candidateId,
    score: Math.round(weightedScore * 100) / 100,
    eligible: blockers.length === 0,
    blockers: [...new Set(blockers)],
    dimensions
  };
}

export async function assessOrientationReadiness({ plan, evidence, report, projectRoot } = {}) {
  const issues = [];
  try {
    validateVisualOrientationPlan(plan);
  } catch (error) {
    issues.push({ code: "INVALID_PLAN", message: error.message });
    return { ready: false, issues };
  }
  if (!evidence) {
    issues.push({ code: "MISSING_IMAGE_EVIDENCE", message: "Bound desktop and mobile files are required for every candidate." });
  } else {
    const verification = await verifyBoundOrientationImages(plan, evidence, { projectRoot: projectRoot || evidence.projectRoot });
    issues.push(...verification.issues);
  }
  if (!report) {
    issues.push({ code: "MISSING_CRITIC_REPORT", message: "An independent structured critic report is required for every candidate." });
  } else if (evidence) {
    try {
      validateOrientationCriticReport(report, { plan, evidence });
    } catch (error) {
      issues.push({ code: "INVALID_CRITIC_REPORT", message: error.message });
    }
  }
  return { ready: issues.length === 0, issues };
}

function selectionSort(left, right, reports, planOrder) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
  if (left.score !== right.score) return right.score - left.score;
  const leftReport = reports.get(left.candidateId);
  const rightReport = reports.get(right.candidateId);
  const criteria = [
    ["productFit", "higher"],
    ["originality", "higher"],
    ["responsiveViability", "higher"],
    ["accessibilityFakeUiRisk", "lower"],
    ["implementationDifficulty", "lower"]
  ];
  for (const [id, direction] of criteria) {
    const l = leftReport.scorecard[id].score;
    const r = rightReport.scorecard[id].score;
    if (l !== r) return direction === "higher" ? r - l : l - r;
  }
  return planOrder.get(left.candidateId) - planOrder.get(right.candidateId);
}

function imageHashes(boundCandidate) {
  return {
    desktop: boundCandidate.images.desktop.sha256,
    mobile: boundCandidate.images.mobile.sha256
  };
}

export function createSelectedVisualReferenceContract({
  plan,
  evidence,
  report,
  candidateId,
  score,
  humanApproval
}) {
  const candidate = candidateMap(plan).get(candidateId);
  const bound = evidenceMap(evidence).get(candidateId);
  const criticism = reportMap(report).get(candidateId);
  if (!candidate || !bound || !criticism) throw new Error(`cannot create visual reference contract for ${candidateId}`);
  const approval = normalizeApproval(humanApproval);
  const hashes = imageHashes(bound);
  const inferredRelationships = [
    {
      id: "candidate-signature",
      confidence: "inferred",
      claim: candidate.signatureRelationship,
      evidence: { imageHashes: hashes, source: "candidate thesis plus generated visual reference" }
    },
    {
      id: "dominant-relationship",
      confidence: "inferred",
      claim: criticism.observations.dominantRelationship,
      evidence: { imageHashes: hashes, source: `independent critic ${report.critic.criticId}` }
    },
    {
      id: "hierarchy",
      confidence: "inferred",
      claim: criticism.observations.hierarchy,
      evidence: { imageHashes: hashes, source: `independent critic ${report.critic.criticId}` }
    },
    {
      id: "responsive-transformation",
      confidence: "inferred",
      claim: criticism.observations.responsiveTransformation,
      evidence: { imageHashes: hashes, source: "desktop/mobile critic comparison" }
    }
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: "selected-generated-visual-reference",
    planId: plan.id,
    candidateId,
    status: approval.status === "approved" && approval.candidateId === candidateId
      ? "human-approved-reference"
      : approval.status === "rejected"
        ? "human-rejected-reference-not-adopted"
        : "provisional-reference-awaiting-human-approval",
    recommendationScore: score,
    humanApproval: approval,
    exactRequirements: plan.exactRequirements,
    inferredRelationships,
    imageEvidence: {
      role: "creative-reference",
      groundTruth: false,
      desktop: bound.images.desktop,
      mobile: bound.images.mobile,
      generationProvenance: bound.provenance,
      criticProvenance: report.critic
    },
    assetMediumImplications: criticism.observations.assetMediumImplications.map((item) => ({
      confidence: "inferred",
      value: item
    })),
    implementationRisks: criticism.observations.implementationRisks,
    fakeUiAndAccessibilityRisks: criticism.observations.fakeUiRisks,
    unknowns: [
      "Exact colors, font files, spacing, dimensions, breakpoints, and animation timing are not established by the generated image.",
      "DOM semantics, focus order, contrast, overflow, runtime performance, and interaction correctness require implementation evidence.",
      "Asset licensing, source fidelity, crop behavior, and fallback behavior require separate verification."
    ],
    designDnaExtraction: {
      status: "ready-for-extraction",
      referenceId: `${plan.id}/${candidateId}`,
      sourceRole: "creative orientation only",
      evidenceConfidence: "inferred",
      extract: [
        "focal and secondary relationships",
        "alignment and negative-space behavior",
        "object roles and crop hypotheses",
        "page rhythm and transition hypotheses",
        "desktop-to-mobile transformation hypotheses",
        "material and typography direction as qualitative relationships"
      ],
      neverExtractAsExact: [
        "pixel coordinates",
        "color values sampled from the image",
        "font identity inferred from appearance",
        "component dimensions",
        "breakpoints",
        "interaction semantics",
        "implementation technology"
      ]
    },
    acceptanceBoundary: {
      generatedImageIsGroundTruth: false,
      pixelSimilarityIsAcceptance: false,
      implementationMustReinterpretNotTrace: true,
      finalAcceptanceRequiresRenderedBrowserEvidence: true
    }
  };
}

/**
 * Produces a deterministic recommendation only after complete evidence.
 * Human approval remains a separate, preserved decision.
 */
export async function selectVisualOrientation({
  plan,
  evidence,
  report,
  humanApproval = plan?.humanApproval,
  projectRoot
} = {}) {
  const readiness = await assessOrientationReadiness({ plan, evidence, report, projectRoot });
  if (!readiness.ready) {
    return {
      status: "refused",
      reason: "incomplete-or-invalid-evidence",
      recommendedCandidateId: null,
      selectedCandidateId: null,
      issues: readiness.issues,
      humanApproval: normalizeApproval(humanApproval)
    };
  }
  const reports = reportMap(report);
  const order = new Map(plan.candidates.map((candidate, index) => [candidate.id, index]));
  const ranking = plan.candidates
    .map((candidate) => scoreOrientationCandidate(reports.get(candidate.id)))
    .sort((left, right) => selectionSort(left, right, reports, order));
  const recommendation = ranking.find((candidate) => candidate.eligible);
  const approval = normalizeApproval(humanApproval);
  if (!recommendation) {
    return {
      status: "refused",
      reason: "no-eligible-candidate",
      recommendedCandidateId: null,
      selectedCandidateId: null,
      ranking,
      issues: ranking.flatMap((candidate) =>
        candidate.blockers.map((blocker) => ({ code: "CANDIDATE_BLOCKED", candidateId: candidate.candidateId, message: blocker }))
      ),
      humanApproval: approval
    };
  }

  let status = "awaiting-human-approval";
  let selectedCandidateId = null;
  let contractCandidateId = recommendation.candidateId;
  let humanOverride = false;
  if (approval.status === "rejected") {
    status = "human-rejected";
  } else if (approval.status === "approved") {
    const approvedScore = ranking.find((candidate) => candidate.candidateId === approval.candidateId);
    if (!approvedScore?.eligible) {
      return {
        status: "refused",
        reason: "human-approval-target-is-not-eligible",
        recommendedCandidateId: recommendation.candidateId,
        selectedCandidateId: null,
        ranking,
        issues: [{ code: "INVALID_APPROVAL_TARGET", candidateId: approval.candidateId, message: "Approved candidate is missing or blocked." }],
        humanApproval: approval
      };
    }
    status = "human-approved";
    selectedCandidateId = approval.candidateId;
    contractCandidateId = approval.candidateId;
    humanOverride = approval.candidateId !== recommendation.candidateId;
  }
  const contractScore = ranking.find((candidate) => candidate.candidateId === contractCandidateId);
  return {
    status,
    reason: status === "awaiting-human-approval"
      ? "Evidence supports a deterministic recommendation, but human approval is still pending."
      : status === "human-rejected"
        ? "The human reviewer rejected adoption; the evidence-backed recommendation is retained for audit."
        : "The human reviewer approved an eligible evidence-backed direction.",
    recommendedCandidateId: recommendation.candidateId,
    selectedCandidateId,
    humanOverride,
    ranking,
    issues: [],
    humanApproval: approval,
    visualReferenceContract: createSelectedVisualReferenceContract({
      plan,
      evidence,
      report,
      candidateId: contractCandidateId,
      score: contractScore.score,
      humanApproval: approval
    })
  };
}

/**
 * v0.5 optimized orientation keeps the proven v0.4 path intact while avoiding
 * mobile generation for candidates that will never be adopted.
 *
 * The mobile prompt is committed in the plan, but its only authorized external
 * generation request is emitted after independent desktop criticism and an
 * explicit human approval. Desktop-only evidence can never produce a selected
 * visual-reference contract.
 */
export function createOptimizedVisualOrientationPlan(brief, projectDna = {}, options = {}) {
  const legacy = createVisualOrientationPlan(brief, projectDna, options);
  const candidates = legacy.candidates.map((candidate) => ({
    ...candidate,
    prompts: {
      desktop: {
        ...candidate.prompts.desktop,
        stage: "desktop-candidate-generation"
      },
      mobile: {
        ...candidate.prompts.mobile,
        stage: "deferred-selected-mobile-generation",
        generationAuthorized: false
      }
    }
  }));
  const plan = {
    ...legacy,
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    id: `orientation-optimized-${sha256Text(stableJson({
      legacyPlanId: legacy.id,
      strategy: "desktop-candidates-selected-mobile",
      candidateFingerprints: candidates.map((candidate) => candidate.fingerprint)
    })).slice(0, 12)}`,
    strategy: "desktop-candidates-selected-mobile",
    generationContract: {
      ...legacy.generationContract,
      statement: "This package emits prompts and validates externally generated local files. Generate every desktop candidate first; generate only the explicitly approved candidate's mobile frame after Design Lagann emits its selected-mobile request.",
      stages: [
        {
          id: "desktop-candidate-generation",
          candidateScope: "all",
          viewports: ["desktop"],
          requires: ["plan"]
        },
        {
          id: "selected-mobile-generation",
          candidateScope: "human-approved-candidate-only",
          viewports: ["mobile"],
          requires: [
            "bound-desktop-evidence",
            "independent-desktop-critic-report",
            "explicit-human-approval",
            "selected-mobile-generation-request"
          ]
        }
      ]
    },
    candidates,
    requiredEvidence: {
      ...legacy.requiredEvidence,
      generationOrder: [
        "all desktop candidates",
        "independent desktop critique",
        "deterministic recommendation",
        "explicit human approval",
        "selected mobile only",
        "independent selected-pair critique"
      ],
      desktopCandidateViewports: ["desktop"],
      selectedPairViewports: ["desktop", "mobile"],
      independentDesktopCritic: true,
      independentSelectedPairCritic: true
    },
    groundTruthPolicy: {
      ...legacy.groundTruthPolicy,
      desktopSelectionIsFinalReference: false,
      selectedMobileBindingIsFinalReference: false,
      selectedPairCriticRequiredBeforeReference: true,
      finalAcceptanceRequiresFreshRenderedDesktopTabletMobileEvidence: true
    }
  };
  return validateOptimizedVisualOrientationPlan(plan);
}

export function validateOptimizedVisualOrientationPlan(plan) {
  if (!plan || typeof plan !== "object") throw new Error("optimized visual orientation plan must be an object");
  if (plan.schemaVersion !== OPTIMIZED_SCHEMA_VERSION) {
    throw new Error(`optimized visual orientation plan schemaVersion must be ${OPTIMIZED_SCHEMA_VERSION}`);
  }
  if (plan.strategy !== "desktop-candidates-selected-mobile") {
    throw new Error("optimized visual orientation plan must declare desktop-candidates-selected-mobile");
  }
  requiredString(plan.id, "plan.id");
  if (
    plan.generationContract?.execution !== "external-only" ||
    plan.generationContract?.targetModel !== "gpt-image-2"
  ) {
    throw new Error("optimized plan must declare external-only GPT Image 2 generation");
  }
  if (!Array.isArray(plan.candidates) || plan.candidates.length < 3 || plan.candidates.length > 5) {
    throw new Error("optimized plan.candidates must contain 3 to 5 candidates");
  }
  const ids = new Set();
  const fingerprints = new Set();
  for (const [index, candidate] of plan.candidates.entries()) {
    requiredString(candidate.id, `candidates[${index}].id`);
    requiredString(candidate.thesis, `candidates[${index}].thesis`);
    requiredString(candidate.signatureRelationship, `candidates[${index}].signatureRelationship`);
    requiredString(candidate.responsiveMutation, `candidates[${index}].responsiveMutation`);
    if (ids.has(candidate.id)) throw new Error(`duplicate candidate id ${candidate.id}`);
    if (fingerprints.has(candidate.fingerprint)) throw new Error("optimized orientation candidates are not materially distinct");
    ids.add(candidate.id);
    fingerprints.add(candidate.fingerprint);
    for (const viewport of VIEWPORTS) {
      const prompt = candidate.prompts?.[viewport];
      if (
        !prompt ||
        prompt.targetModel !== "gpt-image-2" ||
        prompt.viewport !== viewport ||
        prompt.fullPage !== true ||
        prompt.creativeReferenceOnly !== true
      ) {
        throw new Error(`${candidate.id} is missing its ${viewport} GPT Image 2 creative-reference prompt`);
      }
      requiredString(prompt.prompt, `${candidate.id}.${viewport}.prompt`);
      if (prompt.sha256 !== sha256Text(prompt.prompt)) {
        throw new Error(`${candidate.id}.${viewport} prompt hash does not match`);
      }
    }
    if (
      candidate.prompts.desktop.stage !== "desktop-candidate-generation" ||
      candidate.prompts.mobile.stage !== "deferred-selected-mobile-generation" ||
      candidate.prompts.mobile.generationAuthorized !== false
    ) {
      throw new Error(`${candidate.id} does not preserve the optimized generation order`);
    }
  }
  if (
    plan.groundTruthPolicy?.desktopSelectionIsFinalReference !== false ||
    plan.groundTruthPolicy?.selectedMobileBindingIsFinalReference !== false ||
    plan.groundTruthPolicy?.selectedPairCriticRequiredBeforeReference !== true ||
    plan.groundTruthPolicy?.finalAcceptanceRequiresFreshRenderedDesktopTabletMobileEvidence !== true
  ) {
    throw new Error("optimized plan must preserve the selected-reference and final-acceptance boundaries");
  }
  normalizeApproval(plan.humanApproval);
  return plan;
}

function optimizedCandidateMap(plan) {
  return new Map(plan.candidates.map((candidate) => [candidate.id, candidate]));
}

function desktopInput(submission) {
  return submission?.images?.desktop || (
    submission?.desktopPath
      ? { path: submission.desktopPath, promptSha256: submission.desktopPromptSha256 }
      : null
  );
}

function validateOptimizedDesktopEvidenceStructure(plan, evidence) {
  validateOptimizedVisualOrientationPlan(plan);
  if (!evidence || typeof evidence !== "object") throw new Error("optimized desktop evidence is required");
  if (evidence.schemaVersion !== OPTIMIZED_SCHEMA_VERSION) {
    throw new Error(`optimized desktop evidence schemaVersion must be ${OPTIMIZED_SCHEMA_VERSION}`);
  }
  if (evidence.kind !== "optimized-desktop-evidence-binding") {
    throw new Error("optimized desktop evidence kind is invalid");
  }
  if (evidence.planId !== plan.id) throw new Error("optimized desktop evidence planId does not match");
  requiredString(evidence.bindingId, "desktopEvidence.bindingId");
  if (!Array.isArray(evidence.candidates)) throw new Error("optimized desktop evidence candidates must be an array");
  const byId = new Map(evidence.candidates.map((candidate) => [candidate.candidateId, candidate]));
  if (byId.size !== plan.candidates.length || evidence.candidates.length !== plan.candidates.length) {
    throw new Error("optimized desktop evidence must cover every candidate exactly once");
  }
  for (const candidate of plan.candidates) {
    const bound = byId.get(candidate.id);
    if (!bound) throw new Error(`optimized desktop evidence is missing ${candidate.id}`);
    const provenance = validateGenerationProvenance(bound.provenance, plan, candidate.id);
    const image = bound.images?.desktop;
    requiredString(image?.localPath, `${candidate.id}.images.desktop.localPath`);
    if (!/^[a-f0-9]{64}$/i.test(image?.sha256 || "")) {
      throw new Error(`${candidate.id}.images.desktop.sha256 must be a SHA-256 digest`);
    }
    if (image.promptSha256 !== candidate.prompts.desktop.sha256) {
      throw new Error(`${candidate.id}.images.desktop is bound to the wrong prompt`);
    }
    if (
      image.requestedModel !== provenance.requestedModel ||
      image.model !== provenance.reportedModel ||
      image.modelStatus !== provenance.modelStatus
    ) {
      throw new Error(`${candidate.id}.images.desktop has inconsistent model provenance`);
    }
    if (image.dimensions?.status === "verified-from-file" && image.dimensions.aspect !== "landscape") {
      throw new Error(`${candidate.id}.images.desktop is ${image.dimensions.aspect}, expected landscape`);
    }
    if (bound.images?.mobile) {
      throw new Error(`${candidate.id} desktop-candidate binding must not include mobile evidence`);
    }
  }
  return evidence;
}

/**
 * Binds one desktop frame for every candidate. Mobile submissions are rejected.
 */
export async function bindExternalDesktopOrientationImages(
  plan,
  submissions,
  { projectRoot = process.cwd() } = {}
) {
  validateOptimizedVisualOrientationPlan(plan);
  if (!Array.isArray(submissions)) throw new Error("desktop submissions must be an array");
  const root = path.resolve(projectRoot);
  const byId = new Map(submissions.map((submission) => [submission?.candidateId, submission]));
  if (byId.size !== submissions.length) throw new Error("desktop submissions contain a duplicate or missing candidateId");
  const candidates = [];
  for (const candidate of plan.candidates) {
    const submission = byId.get(candidate.id);
    if (!submission) throw new Error(`desktop submission is missing candidate ${candidate.id}`);
    if (submission.images?.mobile || submission.mobilePath) {
      throw new Error(`${candidate.id} must not submit a mobile frame during desktop candidate binding`);
    }
    const provenance = validateGenerationProvenance(submission.provenance, plan, candidate.id);
    const desktop = await bindImage(desktopInput(submission), candidate, "desktop", root, provenance);
    candidates.push({
      candidateId: candidate.id,
      images: { desktop },
      provenance
    });
  }
  const extras = [...byId.keys()].filter((id) => !optimizedCandidateMap(plan).has(id));
  if (extras.length) throw new Error(`desktop submissions contain unknown candidates: ${extras.join(", ")}`);
  const binding = {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "optimized-desktop-evidence-binding",
    planId: plan.id,
    bindingId: `desktop-binding-${sha256Text(stableJson(candidates.map((candidate) => ({
      id: candidate.candidateId,
      desktop: candidate.images.desktop.sha256,
      provenance: candidate.provenance
    })))).slice(0, 16)}`,
    projectRoot: root,
    candidates,
    statement: "Every desktop candidate was SHA-256-bound to its emitted prompt. No mobile image is accepted at this stage and no image generation occurred in this package.",
    acceptanceBoundary: {
      canSelectFinalVisualReference: false,
      canGrantImplementationAcceptance: false
    }
  };
  return validateOptimizedDesktopEvidenceStructure(plan, binding);
}

export async function verifyBoundDesktopOrientationImages(
  plan,
  evidence,
  { projectRoot = evidence?.projectRoot || process.cwd() } = {}
) {
  try {
    validateOptimizedDesktopEvidenceStructure(plan, evidence);
  } catch (error) {
    return { valid: false, issues: [{ code: "INVALID_DESKTOP_BINDING", message: error.message }] };
  }
  const root = path.resolve(projectRoot);
  const issues = [];
  for (const candidate of evidence.candidates) {
    const image = candidate.images.desktop;
    const resolved = path.isAbsolute(image.localPath) ? image.localPath : path.resolve(root, image.localPath);
    try {
      const metadata = await stat(resolved);
      if (!metadata.isFile() || metadata.size < 1) {
        issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: candidate.candidateId, viewport: "desktop", message: `${resolved} is not a non-empty file` });
        continue;
      }
      const actual = await sha256File(resolved);
      if (actual !== image.sha256) {
        issues.push({ code: "IMAGE_HASH_MISMATCH", candidateId: candidate.candidateId, viewport: "desktop", message: "desktop image changed after binding" });
      }
      const bytes = await readFile(resolved);
      const dimensions = inspectImageDimensions(bytes, path.extname(resolved).toLowerCase());
      if (dimensions.status === "verified-from-file" && dimensions.aspect !== "landscape") {
        issues.push({ code: "VIEWPORT_ASPECT_MISMATCH", candidateId: candidate.candidateId, viewport: "desktop", message: `desktop image is ${dimensions.width}Г—${dimensions.height} (${dimensions.aspect})` });
      }
    } catch {
      issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: candidate.candidateId, viewport: "desktop", message: `${resolved} cannot be read` });
    }
  }
  return { valid: issues.length === 0, issues };
}

function validateIndependentCritic(critic, label) {
  if (!critic || typeof critic !== "object") throw new Error(`${label} critic metadata is required`);
  requiredString(critic.provider, `${label}.critic.provider`);
  requiredString(critic.model, `${label}.critic.model`);
  requiredString(critic.criticId, `${label}.critic.criticId`);
  requiredString(critic.generatedAt, `${label}.critic.generatedAt`);
  if (Number.isNaN(Date.parse(critic.generatedAt))) {
    throw new Error(`${label}.critic.generatedAt must be an ISO-compatible timestamp`);
  }
  if (critic.independentOfGeneration !== true) {
    throw new Error(`${label} critic must attest independentOfGeneration=true`);
  }
}

function validateCriticLimitations(limitations, label) {
  if (
    limitations?.generatedImagesAreCreativeReferences !== true ||
    limitations?.pixelSimilarityIsNotAcceptance !== true ||
    limitations?.implementationRequiresVerification !== true
  ) {
    throw new Error(`${label} must acknowledge generated-image and pixel-similarity limitations`);
  }
}

function validateScorecardAndObservations(item, candidateId) {
  for (const dimension of ORIENTATION_SCORE_DIMENSIONS) {
    const entry = item.scorecard?.[dimension.id];
    if (!entry || typeof entry !== "object") throw new Error(`${candidateId}.scorecard.${dimension.id} is required`);
    scoreRange(entry.score, `${candidateId}.scorecard.${dimension.id}.score`);
    requiredString(entry.evidence, `${candidateId}.scorecard.${dimension.id}.evidence`);
    if (typeof entry.blocker !== "boolean") {
      throw new Error(`${candidateId}.scorecard.${dimension.id}.blocker must be boolean`);
    }
  }
  for (const key of ["dominantRelationship", "hierarchy", "responsiveTransformation"]) {
    requiredString(item.observations?.[key], `${candidateId}.observations.${key}`);
  }
  for (const key of ["implementationRisks", "fakeUiRisks", "assetMediumImplications"]) {
    if (!Array.isArray(item.observations?.[key])) {
      throw new Error(`${candidateId}.observations.${key} must be an array`);
    }
  }
  if (!Array.isArray(item.findings)) throw new Error(`${candidateId}.findings must be an array`);
}

export function validateDesktopOrientationCriticReport(report, { plan, evidence } = {}) {
  validateOptimizedVisualOrientationPlan(plan);
  validateOptimizedDesktopEvidenceStructure(plan, evidence);
  if (!report || typeof report !== "object") throw new Error("desktop orientation critic report must be an object");
  if (report.schemaVersion !== OPTIMIZED_SCHEMA_VERSION) {
    throw new Error(`desktop critic report schemaVersion must be ${OPTIMIZED_SCHEMA_VERSION}`);
  }
  if (report.kind !== "optimized-desktop-critic-report") throw new Error("desktop critic report kind is invalid");
  if (report.planId !== plan.id || report.desktopBindingId !== evidence.bindingId) {
    throw new Error("desktop critic report is not bound to the plan and desktop evidence");
  }
  validateIndependentCritic(report.critic, "desktop report");
  validateCriticLimitations(report.limitations, "desktop report");
  if (report.limitations.mobileImagesReviewed !== false) {
    throw new Error("desktop report must attest mobileImagesReviewed=false");
  }
  if (!Array.isArray(report.candidateReports)) throw new Error("desktop candidateReports must be an array");
  const reports = new Map(report.candidateReports.map((candidate) => [candidate.candidateId, candidate]));
  if (reports.size !== plan.candidates.length || report.candidateReports.length !== plan.candidates.length) {
    throw new Error("desktop critic report must cover every candidate exactly once");
  }
  const latestGeneration = Math.max(...evidence.candidates.map((candidate) => Date.parse(candidate.provenance.generatedAt)));
  if (Date.parse(report.critic.generatedAt) < latestGeneration) {
    throw new Error("desktop critic report predates the generated desktop evidence");
  }
  const evidenceById = new Map(evidence.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const requiredDimensions = ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id);
  for (const candidate of plan.candidates) {
    const item = reports.get(candidate.id);
    if (!item) throw new Error(`desktop critic report is missing ${candidate.id}`);
    if (!["reject", "consider", "shortlist"].includes(item.verdict)) {
      throw new Error(`${candidate.id}.verdict must be reject, consider, or shortlist`);
    }
    if (
      item.coverage?.fullPage !== true ||
      !Array.isArray(item.coverage?.viewports) ||
      item.coverage.viewports.length !== 1 ||
      item.coverage.viewports[0] !== "desktop" ||
      item.coverage?.responsiveBasis !== "authored-responsive-mutation-contract" ||
      !requiredDimensions.every((dimension) => item.coverage?.dimensions?.includes(dimension))
    ) {
      throw new Error(`${candidate.id}.coverage is incomplete for desktop-stage criticism`);
    }
    if (item.evidence?.imageHashes?.desktop !== evidenceById.get(candidate.id).images.desktop.sha256) {
      throw new Error(`${candidate.id}.desktop evidence hash does not match bound evidence`);
    }
    if (item.evidence?.imageHashes?.mobile !== undefined) {
      throw new Error(`${candidate.id}.desktop critic must not claim mobile image evidence`);
    }
    if (item.evidence?.responsiveMutationSha256 !== sha256Text(candidate.responsiveMutation)) {
      throw new Error(`${candidate.id}.responsive assessment is not bound to the authored mutation contract`);
    }
    validateScorecardAndObservations(item, candidate.id);
  }
  return report;
}

function optimizedSelectionSort(left, right, reports, planOrder) {
  return selectionSort(left, right, reports, planOrder);
}

function approvedMetadata(approval) {
  if (approval.status !== "approved") return;
  requiredString(approval.candidateId, "humanApproval.candidateId");
  requiredString(approval.decidedBy, "humanApproval.decidedBy");
  requiredString(approval.decidedAt, "humanApproval.decidedAt");
  if (Number.isNaN(Date.parse(approval.decidedAt))) {
    throw new Error("humanApproval.decidedAt must be an ISO-compatible timestamp");
  }
}

function selectedMobileRequest(plan, candidate, desktopEvidence, selectionId) {
  const bound = desktopEvidence.candidates.find((item) => item.candidateId === candidate.id);
  const request = {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "selected-mobile-generation-request",
    planId: plan.id,
    desktopBindingId: desktopEvidence.bindingId,
    desktopSelectionId: selectionId,
    candidateId: candidate.id,
    candidateFingerprint: candidate.fingerprint,
    desktopImageSha256: bound.images.desktop.sha256,
    targetModel: "gpt-image-2",
    viewport: "mobile",
    aspect: "portrait",
    fullPage: true,
    creativeReferenceOnly: true,
    promptId: candidate.prompts.mobile.id,
    prompt: candidate.prompts.mobile.prompt,
    promptSha256: candidate.prompts.mobile.sha256,
    authorization: "generate-this-selected-mobile-only",
    acceptanceBoundary: {
      requestIsFinalReference: false,
      boundMobileIsFinalReference: false,
      independentSelectedPairCriticRequired: true,
      finalAcceptanceRequiresFreshRenderedDesktopTabletMobileEvidence: true
    }
  };
  return {
    ...request,
    requestId: `mobile-request-${sha256Text(stableJson(request)).slice(0, 16)}`
  };
}

export async function selectDesktopVisualOrientation({
  plan,
  evidence,
  report,
  humanApproval = plan?.humanApproval,
  projectRoot
} = {}) {
  try {
    validateDesktopOrientationCriticReport(report, { plan, evidence });
  } catch (error) {
    return {
      status: "refused",
      stage: "desktop-selection",
      reason: "incomplete-or-invalid-desktop-evidence",
      recommendedCandidateId: null,
      selectedCandidateId: null,
      mobileGenerationRequest: null,
      issues: [{ code: "INVALID_DESKTOP_CRITIC_REPORT", message: error.message }],
      acceptanceGranted: false
    };
  }
  const verification = await verifyBoundDesktopOrientationImages(plan, evidence, { projectRoot });
  if (!verification.valid) {
    return {
      status: "refused",
      stage: "desktop-selection",
      reason: "stale-or-invalid-desktop-files",
      recommendedCandidateId: null,
      selectedCandidateId: null,
      mobileGenerationRequest: null,
      issues: verification.issues,
      acceptanceGranted: false
    };
  }
  const reports = new Map(report.candidateReports.map((candidate) => [candidate.candidateId, candidate]));
  const order = new Map(plan.candidates.map((candidate, index) => [candidate.id, index]));
  const ranking = plan.candidates
    .map((candidate) => scoreOrientationCandidate(reports.get(candidate.id)))
    .sort((left, right) => optimizedSelectionSort(left, right, reports, order));
  const recommendation = ranking.find((candidate) => candidate.eligible);
  const approval = normalizeApproval(humanApproval);
  approvedMetadata(approval);
  if (!recommendation) {
    return {
      status: "refused",
      stage: "desktop-selection",
      reason: "no-eligible-desktop-candidate",
      recommendedCandidateId: null,
      selectedCandidateId: null,
      ranking,
      mobileGenerationRequest: null,
      issues: ranking.flatMap((candidate) =>
        candidate.blockers.map((blocker) => ({ code: "CANDIDATE_BLOCKED", candidateId: candidate.candidateId, message: blocker }))
      ),
      humanApproval: approval,
      acceptanceGranted: false
    };
  }
  if (approval.status === "rejected") {
    return {
      status: "human-rejected",
      stage: "desktop-selection",
      reason: "The human reviewer rejected adoption before mobile generation.",
      recommendedCandidateId: recommendation.candidateId,
      selectedCandidateId: null,
      ranking,
      mobileGenerationRequest: null,
      issues: [],
      humanApproval: approval,
      acceptanceGranted: false
    };
  }
  if (approval.status !== "approved") {
    return {
      status: "awaiting-human-approval",
      stage: "desktop-selection",
      reason: "Desktop evidence supports a recommendation, but mobile generation is not authorized until a human approves an eligible direction.",
      recommendedCandidateId: recommendation.candidateId,
      selectedCandidateId: null,
      ranking,
      mobileGenerationRequest: null,
      issues: [],
      humanApproval: approval,
      acceptanceGranted: false
    };
  }
  const approvedScore = ranking.find((candidate) => candidate.candidateId === approval.candidateId);
  if (!approvedScore?.eligible) {
    return {
      status: "refused",
      stage: "desktop-selection",
      reason: "human-approval-target-is-not-eligible",
      recommendedCandidateId: recommendation.candidateId,
      selectedCandidateId: null,
      ranking,
      mobileGenerationRequest: null,
      issues: [{ code: "INVALID_APPROVAL_TARGET", candidateId: approval.candidateId, message: "Approved desktop candidate is missing or blocked." }],
      humanApproval: approval,
      acceptanceGranted: false
    };
  }
  const candidate = optimizedCandidateMap(plan).get(approval.candidateId);
  const selectionSeed = {
    planId: plan.id,
    desktopBindingId: evidence.bindingId,
    criticId: report.critic.criticId,
    criticGeneratedAt: report.critic.generatedAt,
    criticReportSha256: sha256Text(stableJson(report)),
    approvedCandidateId: approval.candidateId,
    approvalDecidedBy: approval.decidedBy,
    approvalDecidedAt: approval.decidedAt
  };
  const selectionId = `desktop-selection-${sha256Text(stableJson(selectionSeed)).slice(0, 16)}`;
  return {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "optimized-desktop-selection",
    selectionId,
    status: "human-approved",
    stage: "selected-mobile-generation-required",
    reason: "An eligible desktop direction was explicitly approved. Generate and bind only the emitted selected-mobile request.",
    recommendedCandidateId: recommendation.candidateId,
    selectedCandidateId: approval.candidateId,
    humanOverride: approval.candidateId !== recommendation.candidateId,
    ranking,
    issues: [],
    humanApproval: {
      ...approval,
      scope: "direction-selected-from-bound-desktop-candidates"
    },
    desktopEvidence: {
      bindingId: evidence.bindingId,
      imageSha256: evidence.candidates.find((item) => item.candidateId === approval.candidateId).images.desktop.sha256,
      critic: report.critic,
      criticReportSha256: selectionSeed.criticReportSha256
    },
    mobileGenerationRequest: selectedMobileRequest(plan, candidate, evidence, selectionId),
    referenceStatus: "not-ready-mobile-and-pair-critique-required",
    acceptanceGranted: false
  };
}

function validateApprovedDesktopSelection(plan, evidence, selection) {
  if (!selection || selection.schemaVersion !== OPTIMIZED_SCHEMA_VERSION) {
    throw new Error("an optimized desktop selection is required");
  }
  if (
    selection.kind !== "optimized-desktop-selection" ||
    selection.status !== "human-approved" ||
    selection.stage !== "selected-mobile-generation-required"
  ) {
    throw new Error("desktop selection must be human-approved before mobile binding");
  }
  if (selection.humanApproval?.status !== "approved" || selection.humanApproval?.candidateId !== selection.selectedCandidateId) {
    throw new Error("desktop selection human approval is missing or inconsistent");
  }
  approvedMetadata(normalizeApproval(selection.humanApproval));
  const candidate = optimizedCandidateMap(plan).get(selection.selectedCandidateId);
  if (!candidate) throw new Error("desktop selection candidate is missing from the plan");
  if (selection.desktopEvidence?.bindingId !== evidence.bindingId) {
    throw new Error("desktop selection is bound to different desktop evidence");
  }
  const bound = evidence.candidates.find((item) => item.candidateId === candidate.id);
  if (selection.desktopEvidence?.imageSha256 !== bound?.images?.desktop?.sha256) {
    throw new Error("desktop selection image hash does not match bound evidence");
  }
  if (!/^[a-f0-9]{64}$/i.test(selection.desktopEvidence?.criticReportSha256 || "")) {
    throw new Error("desktop selection critic report digest is missing");
  }
  const expectedSelectionId = `desktop-selection-${sha256Text(stableJson({
    planId: plan.id,
    desktopBindingId: evidence.bindingId,
    criticId: selection.desktopEvidence.critic?.criticId,
    criticGeneratedAt: selection.desktopEvidence.critic?.generatedAt,
    criticReportSha256: selection.desktopEvidence.criticReportSha256,
    approvedCandidateId: selection.humanApproval.candidateId,
    approvalDecidedBy: selection.humanApproval.decidedBy,
    approvalDecidedAt: selection.humanApproval.decidedAt
  })).slice(0, 16)}`;
  if (selection.selectionId !== expectedSelectionId) {
    throw new Error("desktop selection id does not match its evidence and approval lineage");
  }
  const expectedRequest = selectedMobileRequest(plan, candidate, evidence, selection.selectionId);
  if (
    selection.mobileGenerationRequest?.requestId !== expectedRequest.requestId ||
    selection.mobileGenerationRequest?.promptSha256 !== expectedRequest.promptSha256 ||
    selection.mobileGenerationRequest?.candidateId !== candidate.id
  ) {
    throw new Error("selected mobile generation request is stale or inconsistent");
  }
  return { candidate, bound, request: expectedRequest };
}

function validateSelectedPairEvidenceStructure(plan, desktopEvidence, desktopSelection, evidence) {
  validateOptimizedVisualOrientationPlan(plan);
  validateOptimizedDesktopEvidenceStructure(plan, desktopEvidence);
  const { candidate, bound, request } = validateApprovedDesktopSelection(plan, desktopEvidence, desktopSelection);
  if (!evidence || typeof evidence !== "object") throw new Error("selected-pair evidence is required");
  if (evidence.schemaVersion !== OPTIMIZED_SCHEMA_VERSION || evidence.kind !== "optimized-selected-pair-evidence-binding") {
    throw new Error("selected-pair evidence schema or kind is invalid");
  }
  if (
    evidence.planId !== plan.id ||
    evidence.desktopBindingId !== desktopEvidence.bindingId ||
    evidence.desktopSelectionId !== desktopSelection.selectionId ||
    evidence.mobileRequestId !== request.requestId ||
    evidence.candidateId !== candidate.id
  ) {
    throw new Error("selected-pair evidence lineage does not match the approved desktop selection");
  }
  requiredString(evidence.bindingId, "selectedPairEvidence.bindingId");
  if (evidence.images?.desktop?.sha256 !== bound.images.desktop.sha256) {
    throw new Error("selected-pair desktop hash does not match canonical desktop evidence");
  }
  const desktopProvenance = validateGenerationProvenance(
    evidence.provenance?.desktop,
    plan,
    `${candidate.id}.desktop`
  );
  const mobileProvenance = validateGenerationProvenance(
    evidence.provenance?.mobile,
    plan,
    `${candidate.id}.mobile`
  );
  for (const [viewport, provenance] of [["desktop", desktopProvenance], ["mobile", mobileProvenance]]) {
    const image = evidence.images?.[viewport];
    requiredString(image?.localPath, `${candidate.id}.images.${viewport}.localPath`);
    if (!/^[a-f0-9]{64}$/i.test(image?.sha256 || "")) {
      throw new Error(`${candidate.id}.images.${viewport}.sha256 must be a SHA-256 digest`);
    }
    if (image.promptSha256 !== candidate.prompts[viewport].sha256) {
      throw new Error(`${candidate.id}.images.${viewport} is bound to the wrong prompt`);
    }
    if (
      image.requestedModel !== provenance.requestedModel ||
      image.model !== provenance.reportedModel ||
      image.modelStatus !== provenance.modelStatus
    ) {
      throw new Error(`${candidate.id}.images.${viewport} has inconsistent model provenance`);
    }
  }
  if (
    evidence.images.mobile.dimensions?.status === "verified-from-file" &&
    evidence.images.mobile.dimensions.aspect !== "portrait"
  ) {
    throw new Error(`${candidate.id}.images.mobile is not portrait`);
  }
  if (Date.parse(mobileProvenance.generatedAt) < Date.parse(desktopSelection.humanApproval.decidedAt)) {
    throw new Error("selected mobile image predates the explicit desktop-direction approval");
  }
  return evidence;
}

/**
 * Binds exactly one mobile image and refuses mobile images for unselected candidates.
 */
export async function bindSelectedMobileOrientationImage({
  plan,
  desktopEvidence,
  desktopSelection,
  submission,
  projectRoot = desktopEvidence?.projectRoot || process.cwd()
} = {}) {
  validateOptimizedVisualOrientationPlan(plan);
  validateOptimizedDesktopEvidenceStructure(plan, desktopEvidence);
  const verification = await verifyBoundDesktopOrientationImages(plan, desktopEvidence, { projectRoot });
  if (!verification.valid) {
    throw new Error(`desktop evidence is stale or invalid: ${verification.issues.map((issue) => issue.message).join("; ")}`);
  }
  const { candidate, bound, request } = validateApprovedDesktopSelection(plan, desktopEvidence, desktopSelection);
  if (!submission || typeof submission !== "object") throw new Error("selected mobile submission is required");
  if (submission.candidateId !== candidate.id) {
    throw new Error(`mobile submission must target the approved candidate ${candidate.id}`);
  }
  if (submission.requestId !== request.requestId) {
    throw new Error("mobile submission requestId does not match the selected-mobile generation request");
  }
  if (submission.images?.desktop || submission.desktopPath) {
    throw new Error("selected mobile submission must not replace the canonical desktop image");
  }
  const provenance = validateGenerationProvenance(submission.provenance, plan, `${candidate.id}.mobile`);
  if (Date.parse(provenance.generatedAt) < Date.parse(desktopSelection.humanApproval.decidedAt)) {
    throw new Error("selected mobile image must be generated after explicit desktop-direction approval");
  }
  const mobileInput = submission.images?.mobile || submission.image || (
    submission.mobilePath
      ? { path: submission.mobilePath, promptSha256: submission.mobilePromptSha256 }
      : null
  );
  const root = path.resolve(projectRoot);
  const mobile = await bindImage(mobileInput, candidate, "mobile", root, provenance);
  const pair = {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "optimized-selected-pair-evidence-binding",
    planId: plan.id,
    desktopBindingId: desktopEvidence.bindingId,
    desktopSelectionId: desktopSelection.selectionId,
    mobileRequestId: request.requestId,
    candidateId: candidate.id,
    projectRoot: root,
    images: {
      desktop: bound.images.desktop,
      mobile
    },
    provenance: {
      desktop: bound.provenance,
      mobile: provenance
    },
    statement: "The approved candidate's desktop and mobile files are SHA-256-bound to their exact prompt and selection lineage. No image generation occurred in this package.",
    acceptanceBoundary: {
      selectedPairIsGroundTruth: false,
      selectedPairIsFinalAcceptance: false,
      independentSelectedPairCriticRequired: true,
      finalAcceptanceRequiresFreshRenderedDesktopTabletMobileEvidence: true
    }
  };
  pair.bindingId = `selected-pair-${sha256Text(stableJson({
    planId: pair.planId,
    desktopSelectionId: pair.desktopSelectionId,
    candidateId: pair.candidateId,
    desktop: pair.images.desktop.sha256,
    mobile: pair.images.mobile.sha256,
    mobileProvenance: pair.provenance.mobile
  })).slice(0, 16)}`;
  return validateSelectedPairEvidenceStructure(plan, desktopEvidence, desktopSelection, pair);
}

export async function verifyOptimizedSelectedPairImages(
  plan,
  desktopEvidence,
  desktopSelection,
  evidence,
  { projectRoot = evidence?.projectRoot || process.cwd() } = {}
) {
  try {
    validateSelectedPairEvidenceStructure(plan, desktopEvidence, desktopSelection, evidence);
  } catch (error) {
    return { valid: false, issues: [{ code: "INVALID_SELECTED_PAIR_BINDING", message: error.message }] };
  }
  const root = path.resolve(projectRoot);
  const issues = [];
  for (const viewport of VIEWPORTS) {
    const image = evidence.images[viewport];
    const resolved = path.isAbsolute(image.localPath) ? image.localPath : path.resolve(root, image.localPath);
    try {
      const metadata = await stat(resolved);
      if (!metadata.isFile() || metadata.size < 1) {
        issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: evidence.candidateId, viewport, message: `${resolved} is not a non-empty file` });
        continue;
      }
      const actual = await sha256File(resolved);
      if (actual !== image.sha256) {
        issues.push({ code: "IMAGE_HASH_MISMATCH", candidateId: evidence.candidateId, viewport, message: `${viewport} image changed after binding` });
      }
      const bytes = await readFile(resolved);
      const dimensions = inspectImageDimensions(bytes, path.extname(resolved).toLowerCase());
      const expected = viewport === "desktop" ? "landscape" : "portrait";
      if (dimensions.status === "verified-from-file" && dimensions.aspect !== expected) {
        issues.push({ code: "VIEWPORT_ASPECT_MISMATCH", candidateId: evidence.candidateId, viewport, message: `${viewport} image is ${dimensions.width}Г—${dimensions.height} (${dimensions.aspect})` });
      }
    } catch {
      issues.push({ code: "LOCAL_IMAGE_MISSING", candidateId: evidence.candidateId, viewport, message: `${resolved} cannot be read` });
    }
  }
  return { valid: issues.length === 0, issues };
}

export function validateSelectedPairCriticReport(
  report,
  { plan, desktopEvidence, desktopSelection, evidence } = {}
) {
  validateSelectedPairEvidenceStructure(plan, desktopEvidence, desktopSelection, evidence);
  if (!report || typeof report !== "object") throw new Error("selected-pair critic report must be an object");
  if (report.schemaVersion !== OPTIMIZED_SCHEMA_VERSION || report.kind !== "optimized-selected-pair-critic-report") {
    throw new Error("selected-pair critic report schema or kind is invalid");
  }
  if (
    report.planId !== plan.id ||
    report.selectedPairBindingId !== evidence.bindingId ||
    report.candidateId !== evidence.candidateId
  ) {
    throw new Error("selected-pair critic report is not bound to the selected pair");
  }
  if (!["approve", "revise", "reject"].includes(report.verdict)) {
    throw new Error("selected-pair critic verdict must be approve, revise, or reject");
  }
  validateIndependentCritic(report.critic, "selected-pair report");
  validateCriticLimitations(report.limitations, "selected-pair report");
  if (
    report.coverage?.fullPage !== true ||
    !VIEWPORTS.every((viewport) => report.coverage?.viewports?.includes(viewport)) ||
    !ORIENTATION_SCORE_DIMENSIONS.every((dimension) => report.coverage?.dimensions?.includes(dimension.id))
  ) {
    throw new Error("selected-pair critic coverage must include full-page desktop, mobile, and every score dimension");
  }
  if (
    report.evidence?.imageHashes?.desktop !== evidence.images.desktop.sha256 ||
    report.evidence?.imageHashes?.mobile !== evidence.images.mobile.sha256
  ) {
    throw new Error("selected-pair critic image hashes do not match bound evidence");
  }
  const latestGeneration = Math.max(
    Date.parse(evidence.provenance.desktop.generatedAt),
    Date.parse(evidence.provenance.mobile.generatedAt)
  );
  if (Date.parse(report.critic.generatedAt) < latestGeneration) {
    throw new Error("selected-pair critic report predates the selected visual evidence");
  }
  validateScorecardAndObservations(report, evidence.candidateId);
  return report;
}

function selectedPairQuality(report) {
  const scored = scoreOrientationCandidate({
    candidateId: report.candidateId,
    verdict: report.verdict === "approve" ? "shortlist" : "reject",
    scorecard: report.scorecard
  });
  const blockers = [...scored.blockers];
  if (report.verdict !== "approve") blockers.push(`pair-verdict-${report.verdict}`);
  if (scored.score < 7.5) blockers.push("selected-pair-score-below-7.5");
  if (report.scorecard.productFit.score < 6) blockers.push("selected-pair-product-fit-below-6");
  if (report.scorecard.hierarchy.score < 6) blockers.push("selected-pair-hierarchy-below-6");
  if (report.scorecard.responsiveViability.score < 7) blockers.push("selected-pair-responsive-viability-below-7");
  if (report.scorecard.accessibilityFakeUiRisk.score > 4) blockers.push("selected-pair-accessibility-or-fake-ui-risk-above-4");
  return {
    ...scored,
    eligible: blockers.length === 0,
    blockers: [...new Set(blockers)]
  };
}

function createOptimizedSelectedVisualReferenceContract({
  plan,
  desktopSelection,
  evidence,
  report,
  score
}) {
  const candidate = optimizedCandidateMap(plan).get(evidence.candidateId);
  const hashes = {
    desktop: evidence.images.desktop.sha256,
    mobile: evidence.images.mobile.sha256
  };
  const criticSource = `independent selected-pair critic ${report.critic.criticId}`;
  return {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "selected-generated-visual-reference",
    planId: plan.id,
    candidateId: candidate.id,
    status: "human-approved-reference",
    recommendationScore: score,
    humanApproval: {
      ...desktopSelection.humanApproval,
      scope: "direction-selected-from-bound-desktop-candidates",
      selectedMobileFrameSeparatelyHumanApproved: false
    },
    pairVerification: {
      status: "independent-pair-critic-approved",
      bindingId: evidence.bindingId,
      critic: report.critic,
      criticReportSha256: sha256Text(stableJson(report)),
      score,
      qualityFloor: 7.5
    },
    exactRequirements: plan.exactRequirements,
    inferredRelationships: [
      {
        id: "candidate-signature",
        confidence: "inferred",
        claim: candidate.signatureRelationship,
        evidence: { imageHashes: hashes, source: "candidate thesis plus selected-pair visual evidence" }
      },
      {
        id: "dominant-relationship",
        confidence: "inferred",
        claim: report.observations.dominantRelationship,
        evidence: { imageHashes: hashes, source: criticSource }
      },
      {
        id: "hierarchy",
        confidence: "inferred",
        claim: report.observations.hierarchy,
        evidence: { imageHashes: hashes, source: criticSource }
      },
      {
        id: "responsive-transformation",
        confidence: "inferred",
        claim: report.observations.responsiveTransformation,
        evidence: { imageHashes: hashes, source: criticSource }
      }
    ],
    imageEvidence: {
      role: "creative-reference",
      groundTruth: false,
      desktop: evidence.images.desktop,
      mobile: evidence.images.mobile,
      generationProvenance: evidence.provenance.mobile,
      desktopGenerationProvenance: evidence.provenance.desktop,
      criticProvenance: report.critic
    },
    assetMediumImplications: report.observations.assetMediumImplications.map((item) => ({
      confidence: "inferred",
      value: item
    })),
    implementationRisks: report.observations.implementationRisks,
    fakeUiAndAccessibilityRisks: report.observations.fakeUiRisks,
    unknowns: [
      "Exact colors, font files, spacing, dimensions, breakpoints, and animation timing are not established by generated images.",
      "DOM semantics, focus order, contrast, overflow, runtime performance, and interaction correctness require implementation evidence.",
      "The selected mobile frame passed independent pair criticism but was not separately approved by the human direction owner."
    ],
    designDnaExtraction: {
      status: "ready-for-extraction",
      referenceId: `${plan.id}/${candidate.id}`,
      sourceRole: "creative orientation only",
      evidenceConfidence: "inferred",
      extract: [
        "focal and secondary relationships",
        "alignment and negative-space behavior",
        "object roles and crop hypotheses",
        "page rhythm and transition hypotheses",
        "desktop-to-mobile transformation hypotheses",
        "material and typography direction as qualitative relationships"
      ],
      neverExtractAsExact: [
        "pixel coordinates",
        "color values sampled from the image",
        "font identity inferred from appearance",
        "component dimensions",
        "breakpoints",
        "interaction semantics",
        "implementation technology"
      ]
    },
    optimization: {
      strategy: "desktop-candidates-selected-mobile",
      desktopCandidateCount: plan.candidates.length,
      generatedMobileCandidateCount: 1,
      avoidedMobileCandidateCount: plan.candidates.length - 1
    },
    acceptanceBoundary: {
      generatedImageIsGroundTruth: false,
      pixelSimilarityIsAcceptance: false,
      implementationMustReinterpretNotTrace: true,
      selectedReferenceIsFinalAcceptance: false,
      finalAcceptanceRequiresFreshRenderedBrowserEvidence: true,
      finalAcceptanceViewports: ["desktop", "tablet", "mobile"]
    }
  };
}

export async function finalizeOptimizedVisualOrientation({
  plan,
  desktopEvidence,
  desktopSelection,
  evidence,
  report,
  projectRoot
} = {}) {
  try {
    validateSelectedPairCriticReport(report, {
      plan,
      desktopEvidence,
      desktopSelection,
      evidence
    });
  } catch (error) {
    return {
      status: "refused",
      stage: "selected-pair-verification",
      reason: "incomplete-or-invalid-selected-pair-criticism",
      selectedCandidateId: null,
      visualReferenceContract: null,
      issues: [{ code: "INVALID_SELECTED_PAIR_CRITIC_REPORT", message: error.message }],
      acceptanceGranted: false
    };
  }
  const verification = await verifyOptimizedSelectedPairImages(
    plan,
    desktopEvidence,
    desktopSelection,
    evidence,
    { projectRoot }
  );
  if (!verification.valid) {
    return {
      status: "refused",
      stage: "selected-pair-verification",
      reason: "stale-or-invalid-selected-pair-files",
      selectedCandidateId: null,
      visualReferenceContract: null,
      issues: verification.issues,
      acceptanceGranted: false
    };
  }
  const quality = selectedPairQuality(report);
  if (!quality.eligible) {
    return {
      status: "refused",
      stage: "selected-pair-verification",
      reason: "selected-pair-failed-quality-gates",
      selectedCandidateId: null,
      pairQuality: quality,
      visualReferenceContract: null,
      issues: quality.blockers.map((blocker) => ({ code: "SELECTED_PAIR_BLOCKED", message: blocker })),
      acceptanceGranted: false
    };
  }
  const contract = createOptimizedSelectedVisualReferenceContract({
    plan,
    desktopSelection,
    evidence,
    report,
    score: quality.score
  });
  return {
    schemaVersion: OPTIMIZED_SCHEMA_VERSION,
    kind: "optimized-visual-orientation-selection",
    status: "human-approved",
    stage: "creative-reference-ready",
    reason: "The human-approved desktop direction now has a prompt-bound selected mobile frame and an independent selected-pair critic approval.",
    recommendedCandidateId: desktopSelection.recommendedCandidateId,
    selectedCandidateId: evidence.candidateId,
    humanApproval: desktopSelection.humanApproval,
    pairQuality: quality,
    visualReferenceContract: contract,
    issues: [],
    acceptanceGranted: false,
    acceptanceBoundary: contract.acceptanceBoundary
  };
}

// Concise aliases for callers that already operate inside a visual-orientation namespace.
export const createOrientationPlan = createVisualOrientationPlan;
export const bindOrientationEvidence = bindExternalOrientationImages;
export const validateOrientationReport = validateOrientationCriticReport;
export const selectOrientation = selectVisualOrientation;
export const createVisualReferenceContract = createSelectedVisualReferenceContract;
