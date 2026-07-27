import { createHash } from "node:crypto";
import path from "node:path";
import {
  access,
  readFile,
  readdir,
  stat
} from "node:fs/promises";

const SCHEMA_VERSION = "1.0.0";
const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const IMPLEMENTATION_MARKUP = new Set([".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro"]);
const IMPLEMENTATION_STYLES = new Set([".css", ".scss", ".sass", ".less", ".styl"]);
const IMPLEMENTATION_SCRIPTS = new Set([".js", ".mjs", ".cjs", ".ts"]);
const FORBIDDEN_SVG_SOURCE_PATTERNS = Object.freeze([
  Object.freeze({
    code: "INLINE_SVG_FORBIDDEN",
    pattern: /<\s*svg\b/i,
    message: "Inline SVG markup is forbidden. Use semantic HTML/CSS for interface geometry, Canvas for procedural drawing, or a generated PNG/WebP asset."
  }),
  Object.freeze({
    code: "SVG_DATA_URI_FORBIDDEN",
    pattern: /(?:data:|image\/)svg\+xml/i,
    message: "Embedded SVG data and SVG MIME payloads are forbidden. Materialize visible artwork as a generated PNG/WebP asset."
  }),
  Object.freeze({
    code: "SVG_REFERENCE_FORBIDDEN",
    pattern: /\.svg(?:[?#][^"'()\s]*)?(?:["'()\s]|$)/i,
    message: "SVG file references are forbidden. Replace them with verified raster assets or code-native HTML/CSS/Canvas behavior."
  }),
  Object.freeze({
    code: "SVG_ICON_RENDERER_FORBIDDEN",
    pattern: /(?:from\s*["']|require\(\s*["']|import\(\s*["'])(?:lucide(?:-react)?|@heroicons\/|@phosphor-icons\/react|phosphor-react|react-icons(?:\/|["'])|@fortawesome\/)/i,
    message: "SVG-rendering icon libraries are forbidden by the project media policy. Use text, CSS, Canvas, an icon font, or approved raster symbols."
  }),
  Object.freeze({
    code: "SVG_DOM_CONSTRUCTION_FORBIDDEN",
    pattern: /(?:createElement(?:NS)?\s*\([^)]*["'`]svg["'`]|(?:jsx|jsxs)\s*\(\s*["'`]svg["'`])/i,
    message: "Programmatic SVG DOM construction is forbidden. Use semantic HTML/CSS, Canvas, or a verified generated raster asset."
  }),
  Object.freeze({
    code: "SVG_RENDERER_CONFIG_FORBIDDEN",
    pattern: /\b(?:renderer|renderAs|outputFormat|outputType|format)\s*[:=]\s*["'`]svg["'`]/i,
    message: "An SVG runtime renderer is configured. Select a Canvas/HTML renderer or replace the output with a verified raster asset."
  })
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".design-lagann",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage"
]);

export const PIPELINE_STAGES = Object.freeze([
  Object.freeze({
    id: "plan-intake",
    label: "Plan / intake",
    ordinal: 1,
    purpose: "Resolve the brief, repository intake, execution profile, and immutable acceptance policy."
  }),
  Object.freeze({
    id: "direction-frames",
    label: "Direction evidence",
    ordinal: 2,
    purpose: "Generate and bind competing creative frames, or qualify a permitted adopted current/reference track."
  }),
  Object.freeze({
    id: "approved-selected-pair",
    label: "Approved selected pair",
    ordinal: 3,
    purpose: "Adopt one independently reviewed desktop/mobile direction pair."
  }),
  Object.freeze({
    id: "design-contract",
    label: "DESIGN contract",
    ordinal: 4,
    purpose: "Turn the approved direction into an explicit, implementable design contract."
  }),
  Object.freeze({
    id: "asset-acquisition",
    label: "Asset acquisition",
    ordinal: 5,
    purpose: "Acquire and hash-bind every required real raster or photographic project asset."
  }),
  Object.freeze({
    id: "implementation-source",
    label: "Implementation source",
    ordinal: 6,
    purpose: "Create real responsive interface source outside Design Lagann state."
  }),
  Object.freeze({
    id: "rendered-critique",
    label: "Rendered captures / critique",
    ordinal: 7,
    purpose: "Critique fresh browser-rendered desktop, tablet, and mobile evidence."
  }),
  Object.freeze({
    id: "repair",
    label: "Repair",
    ordinal: 8,
    purpose: "Apply bounded repairs and capture a fresh after-state."
  }),
  Object.freeze({
    id: "final-proof",
    label: "Final proof",
    ordinal: 9,
    purpose: "Accept only independently verified, non-regressive, elite-v1 final evidence."
  })
]);

const STAGE_ALIASES = Object.freeze({
  plan: "plan-intake",
  intake: "plan-intake",
  "plan/intake": "plan-intake",
  direction: "direction-frames",
  frames: "direction-frames",
  selection: "approved-selected-pair",
  selected: "approved-selected-pair",
  "selected-pair": "approved-selected-pair",
  design: "design-contract",
  "design.md": "design-contract",
  assets: "asset-acquisition",
  implementation: "implementation-source",
  build: "implementation-source",
  capture: "rendered-critique",
  critique: "rendered-critique",
  review: "rendered-critique",
  repairs: "repair",
  proof: "final-proof",
  final: "final-proof",
  acceptance: "final-proof"
});

function normalizedSlash(value) {
  return String(value || "").replaceAll("\\", "/");
}

function insideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function displayPath(root, target) {
  if (!target) return null;
  const absolute = path.resolve(target);
  return insideRoot(root, absolute)
    ? normalizedSlash(path.relative(root, absolute)) || "."
    : absolute;
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function fileInfo(target) {
  try {
    const info = await stat(target);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

async function readJsonSafe(target) {
  try {
    return { exists: true, value: JSON.parse(await readFile(target, "utf8")), error: null };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, value: null, error: null };
    return { exists: true, value: null, error: error.message };
  }
}

async function sha256File(target) {
  return createHash("sha256").update(await readFile(target)).digest("hex");
}

function artifact(root, target, {
  kind,
  role,
  valid = true,
  referenceOnly = false,
  details
} = {}) {
  return {
    kind,
    path: displayPath(root, target),
    role,
    valid,
    referenceOnly,
    ...(details ? { details } : {})
  };
}

function missing(code, artifactPath, message) {
  return { code, artifact: normalizedSlash(artifactPath), message };
}

function checkResult(id, complete, evidence, missingArtifacts, notes = []) {
  return {
    id,
    evidenceComplete: Boolean(complete),
    evidence,
    missing: missingArtifacts,
    notes
  };
}

function resolveLocalPath(root, value) {
  if (!value || typeof value !== "string") return null;
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function conceptFramePath(root, target) {
  if (!target) return false;
  const relative = normalizedSlash(path.relative(root, target)).toLowerCase();
  return (
    relative.startsWith(".design-lagann/visual-orientation/") ||
    relative.includes("/visual-orientation/") ||
    relative.includes("/visual-orienter/") ||
    /(^|\/)(concepts?|mockups?|direction-frames?)(\/|$)/.test(relative)
  );
}

function imageEntries(value) {
  if (!value || typeof value !== "object") return [];
  return ["desktop", "tablet", "mobile"]
    .filter((viewport) => value[viewport])
    .map((viewport) => ({ viewport, ...value[viewport] }));
}

async function verifyImageEntry(root, entry, {
  requireRasterSignature = false,
  forbidConceptFrame = false
} = {}) {
  const rawPath = entry.localPath || entry.path || entry.outputPath || entry.expectedOutput;
  const target = resolveLocalPath(root, rawPath);
  if (!target || !insideRoot(root, target)) {
    return {
      valid: false,
      code: "ASSET_PATH_OUTSIDE_PROJECT",
      message: "Image evidence must resolve to a file inside the project root.",
      target
    };
  }
  if (forbidConceptFrame && conceptFramePath(root, target)) {
    return {
      valid: false,
      code: "CONCEPT_FRAME_NOT_PROJECT_ASSET",
      message: "A visual concept frame is reference-only and cannot satisfy project asset acquisition.",
      target
    };
  }
  if (!RASTER_EXTENSIONS.has(path.extname(target).toLowerCase())) {
    return {
      valid: false,
      code: "NON_RASTER_PROJECT_ASSET",
      message: "The required project image must be a PNG, JPEG, WebP, or AVIF file.",
      target
    };
  }
  const info = await fileInfo(target);
  if (!info || info.size === 0) {
    return {
      valid: false,
      code: "IMAGE_FILE_MISSING",
      message: "The bound image file is missing or empty.",
      target
    };
  }
  const digest = await sha256File(target);
  if (!/^[a-f0-9]{64}$/i.test(entry.sha256 || "")) {
    return {
      valid: false,
      code: "IMAGE_HASH_MISSING",
      message: "The image must be bound to a SHA-256 digest.",
      target,
      digest
    };
  }
  if (digest.toLowerCase() !== entry.sha256.toLowerCase()) {
    return {
      valid: false,
      code: "IMAGE_HASH_MISMATCH",
      message: "The bound image digest does not match the current file.",
      target,
      digest
    };
  }
  if (requireRasterSignature) {
    const bytes = await readFile(target);
    if (!rasterSignature(bytes)) {
      return {
        valid: false,
        code: "INVALID_RASTER_FILE",
        message: "The project asset has a raster extension but no recognized raster file signature.",
        target,
        digest
      };
    }
  }
  return { valid: true, target, digest };
}

function rasterSignature(buffer) {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
    buffer.subarray(12, 16).toString("ascii") === "IHDR" &&
    buffer.readUInt32BE(16) > 0 &&
    buffer.readUInt32BE(20) > 0
  ) return "png";
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 2).toString("hex") === "ffd8" &&
    buffer.subarray(-2).toString("hex") === "ffd9"
  ) return "jpeg";
  if (
    buffer.length >= 16 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(buffer.subarray(12, 16).toString("ascii"))
  ) return "webp";
  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    /avif|avis|mif1|msf1/.test(buffer.subarray(8, 12).toString("ascii"))
  ) return "avif";
  return null;
}

function profileName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "economy") return "fast";
  if (["fast", "balanced", "quality"].includes(normalized)) return normalized;
  return null;
}

function modeDescription(profile, source) {
  const label = profile === "quality"
    ? "QUALITY"
    : profile === "fast"
      ? "FAST"
      : "BALANCED";
  return {
    profile,
    label,
    banner: `DESIGN LAGANN MODE: ${label}`,
    isSuperQuality: profile === "quality",
    acceptancePolicy: "elite-v1",
    source,
    statement: profile === "quality"
      ? "Maximum exploration, specialist criticism, and repair depth are active."
      : `${label[0]}${label.slice(1).toLowerCase()} effort is active; the elite-v1 final quality bar is unchanged.`
  };
}

async function resolveMode(root, planArtifact, briefArtifact) {
  const planValue = planArtifact.value;
  const planProfile = profileName(
    planValue?.profile ||
    planValue?.executionProfile ||
    planValue?.mode
  );
  if (planProfile) {
    return modeDescription(planProfile, ".design-lagann/adaptive-plan.json");
  }
  const briefValue = briefArtifact.value;
  const briefProfile = profileName(
    briefValue?.executionProfile ||
    briefValue?.mode
  );
  if (briefProfile) {
    return modeDescription(briefProfile, ".design-lagann/brief.json");
  }
  return modeDescription("balanced", "default");
}

async function inspectPlanIntake(root, context) {
  const evidence = [];
  const absent = [];
  const briefPath = path.join(root, ".design-lagann", "brief.json");
  const planPath = path.join(root, ".design-lagann", "adaptive-plan.json");
  const sitePlanPath = path.join(root, ".design-lagann", "site-plan.json");
  if (!context.brief.exists) {
    absent.push(missing("BRIEF_MISSING", ".design-lagann/brief.json", "A concrete project brief is required."));
  } else if (context.brief.error || !String(context.brief.value?.goal || "").trim()) {
    absent.push(missing("BRIEF_INVALID", ".design-lagann/brief.json", "The project brief must be valid JSON with a concrete goal."));
    evidence.push(artifact(root, briefPath, { kind: "brief", role: "intake", valid: false }));
  } else {
    evidence.push(artifact(root, briefPath, { kind: "brief", role: "intake" }));
  }
  const planProfile = profileName(
    context.plan.value?.profile ||
    context.plan.value?.executionProfile ||
    context.plan.value?.mode
  );
  if (!context.plan.exists) {
    absent.push(missing("ADAPTIVE_PLAN_MISSING", ".design-lagann/adaptive-plan.json", "The execution profile and ordered plan must be persisted."));
  } else if (context.plan.error || !planProfile) {
    absent.push(missing("ADAPTIVE_PLAN_INVALID", ".design-lagann/adaptive-plan.json", "The adaptive plan must declare Fast, Balanced, or Quality."));
    evidence.push(artifact(root, planPath, { kind: "adaptive-plan", role: "stage-order", valid: false }));
  } else {
    evidence.push(artifact(root, planPath, {
      kind: "adaptive-plan",
      role: "stage-order",
      details: { profile: planProfile, acceptancePolicy: "elite-v1" }
    }));
  }
  if (!context.sitePlan.exists) {
    absent.push(missing("SITE_PLAN_MISSING", ".design-lagann/site-plan.json", "The site structure, asset boundaries, reference-fidelity mode, and optional video stage must be planned before visual creation."));
  } else if (
    context.sitePlan.error ||
    context.sitePlan.value?.version !== "1.0.0" ||
    !Array.isArray(context.sitePlan.value?.creationGates) ||
    context.sitePlan.value?.creationGates?.[0] !== "site-plan-approved-or-explicitly-adopted"
  ) {
    absent.push(missing("SITE_PLAN_INVALID", ".design-lagann/site-plan.json", "The site plan is invalid or does not gate creation on plan adoption."));
    evidence.push(artifact(root, sitePlanPath, { kind: "site-plan", role: "pre-creation-plan", valid: false }));
  } else {
    evidence.push(artifact(root, sitePlanPath, {
      kind: "site-plan",
      role: "pre-creation-plan",
      details: {
        referenceFidelityMode: context.sitePlan.value.referenceFidelity?.mode,
        motionVideoStatus: context.sitePlan.value.motionVideoStage?.status,
        svgAllowed: context.sitePlan.value.assetBoundaries?.svgAllowed
      }
    }));
  }
  return checkResult("plan-intake", absent.length === 0, evidence, absent);
}

async function inspectDirectionFrames(root) {
  const orientation = path.join(root, ".design-lagann", "visual-orientation");
  const optimizedPlanPath = path.join(orientation, "optimized-plan.json");
  const optimizedEvidencePath = path.join(orientation, "optimized-desktop-evidence-binding.json");
  const legacyPlanPath = path.join(orientation, "plan.json");
  const legacyEvidencePath = path.join(orientation, "evidence-binding.json");
  const selectedPath = path.join(orientation, "selected-visual-reference.json");
  const [
    optimizedPlan,
    optimizedEvidence,
    legacyPlan,
    legacyEvidence,
    selected
  ] = await Promise.all([
    readJsonSafe(optimizedPlanPath),
    readJsonSafe(optimizedEvidencePath),
    readJsonSafe(legacyPlanPath),
    readJsonSafe(legacyEvidencePath),
    readJsonSafe(selectedPath)
  ]);
  const evidence = [];
  const absent = [];
  const optimized = optimizedPlan.exists || optimizedEvidence.exists;
  const plan = optimized ? optimizedPlan : legacyPlan;
  const binding = optimized ? optimizedEvidence : legacyEvidence;
  const planPath = optimized ? optimizedPlanPath : legacyPlanPath;
  const bindingPath = optimized ? optimizedEvidencePath : legacyEvidencePath;

  if (!plan.exists || plan.error || !Array.isArray(plan.value?.candidates) || !plan.value.candidates.length) {
    absent.push(missing(
      "DIRECTION_PLAN_MISSING",
      optimized ? ".design-lagann/visual-orientation/optimized-plan.json" : ".design-lagann/visual-orientation/plan.json",
      "A persisted multi-direction frame plan is required."
    ));
  } else {
    evidence.push(artifact(root, planPath, {
      kind: "direction-plan",
      role: "creative-reference-plan",
      referenceOnly: true,
      details: { candidateCount: plan.value.candidates.length }
    }));
  }

  let frameEntries = [];
  if (binding.exists && !binding.error) {
    frameEntries = (binding.value?.candidates || []).flatMap((candidate) => {
      const entries = imageEntries(candidate.images);
      return optimized ? entries.filter((entry) => entry.viewport === "desktop") : entries;
    });
    evidence.push(artifact(root, bindingPath, {
      kind: "direction-frame-binding",
      role: "creative-reference-evidence",
      referenceOnly: true
    }));
  } else if (selected.exists && !selected.error) {
    frameEntries = imageEntries(selected.value?.imageEvidence);
    evidence.push(artifact(root, selectedPath, {
      kind: "selected-visual-reference",
      role: "creative-reference-evidence",
      referenceOnly: true
    }));
  } else {
    absent.push(missing(
      "DIRECTION_FRAME_BINDING_MISSING",
      optimized
        ? ".design-lagann/visual-orientation/optimized-desktop-evidence-binding.json"
        : ".design-lagann/visual-orientation/evidence-binding.json",
      "Generated direction frames must be bound to their local files and hashes."
    ));
  }
  if (!frameEntries.length) {
    absent.push(missing("DIRECTION_FRAMES_MISSING", ".design-lagann/visual-orientation/", "No bound creative direction frame files were found."));
  }
  for (const entry of frameEntries) {
    const verified = await verifyImageEntry(root, entry);
    evidence.push(artifact(root, verified.target || resolveLocalPath(root, entry.localPath || entry.path), {
      kind: "direction-frame",
      role: `${entry.viewport || "unknown"} creative reference`,
      referenceOnly: true,
      valid: verified.valid
    }));
    if (!verified.valid) {
      absent.push(missing(verified.code, displayPath(root, verified.target) || ".design-lagann/visual-orientation/", verified.message));
    }
  }
  return checkResult(
    "direction-frames",
    Boolean(plan.exists && !plan.error && frameEntries.length && absent.length === 0),
    evidence,
    absent,
    ["Direction frames are creative references only. They never count as project assets, source code, rendered proof, or acceptance."]
  );
}

async function inspectSelectedPair(root) {
  const orientation = path.join(root, ".design-lagann", "visual-orientation");
  const selectedPath = path.join(orientation, "selected-visual-reference.json");
  const selectionPath = path.join(orientation, "selection.json");
  const optimizedSelectionPath = path.join(orientation, "optimized-selection.json");
  const [selected, selection, optimizedSelection] = await Promise.all([
    readJsonSafe(selectedPath),
    readJsonSafe(selectionPath),
    readJsonSafe(optimizedSelectionPath)
  ]);
  const evidence = [];
  const absent = [];
  const adoptedSelection = optimizedSelection.exists ? optimizedSelection : selection;
  const adoptedSelectionPath = optimizedSelection.exists ? optimizedSelectionPath : selectionPath;
  const contract = selected.value;

  if (
    !selected.exists ||
    selected.error ||
    contract?.kind !== "selected-generated-visual-reference" ||
    contract?.status !== "human-approved-reference" ||
    contract?.humanApproval?.status !== "approved" ||
    contract?.imageEvidence?.role !== "creative-reference" ||
    contract?.imageEvidence?.groundTruth !== false
  ) {
    absent.push(missing(
      "APPROVED_SELECTED_PAIR_MISSING",
      ".design-lagann/visual-orientation/selected-visual-reference.json",
      "One desktop/mobile pair must be human-approved and explicitly bounded as a non-ground-truth creative reference."
    ));
  } else {
    evidence.push(artifact(root, selectedPath, {
      kind: "selected-visual-reference",
      role: "approved creative reference",
      referenceOnly: true,
      details: { candidateId: contract.candidateId }
    }));
  }
  if (
    !adoptedSelection.exists ||
    adoptedSelection.error ||
    adoptedSelection.value?.status !== "human-approved" ||
    adoptedSelection.value?.selectedCandidateId !== contract?.candidateId
  ) {
    absent.push(missing(
      "SELECTION_LINEAGE_MISSING",
      ".design-lagann/visual-orientation/selection.json",
      "The approved pair must match the persisted human selection."
    ));
  } else {
    evidence.push(artifact(root, adoptedSelectionPath, {
      kind: "direction-selection",
      role: "human approval lineage",
      referenceOnly: true
    }));
  }
  const selectedImages = imageEntries(contract?.imageEvidence);
  const viewports = new Set(selectedImages.map((entry) => entry.viewport));
  for (const required of ["desktop", "mobile"]) {
    if (!viewports.has(required)) {
      absent.push(missing(
        "SELECTED_VIEWPORT_MISSING",
        ".design-lagann/visual-orientation/selected-visual-reference.json",
        `The selected creative reference is missing its ${required} frame.`
      ));
    }
  }
  for (const entry of selectedImages.filter((item) => ["desktop", "mobile"].includes(item.viewport))) {
    const verified = await verifyImageEntry(root, entry);
    evidence.push(artifact(root, verified.target || resolveLocalPath(root, entry.localPath || entry.path), {
      kind: "selected-direction-frame",
      role: `${entry.viewport} selected creative reference`,
      referenceOnly: true,
      valid: verified.valid
    }));
    if (!verified.valid) {
      absent.push(missing(verified.code, displayPath(root, verified.target) || selectedPath, verified.message));
    }
  }
  if (
    contract?.schemaVersion === "0.5.0" &&
    contract?.pairVerification?.status !== "independent-pair-critic-approved"
  ) {
    absent.push(missing(
      "PAIR_CRITIC_APPROVAL_MISSING",
      ".design-lagann/visual-orientation/optimized-selected-pair-critic-report.json",
      "The optimized selected pair must pass its independent pair critic."
    ));
  }
  return checkResult("approved-selected-pair", absent.length === 0, evidence, absent, [
    "Approval adopts a direction; it does not approve the implementation."
  ]);
}

async function inspectDesignContract(root) {
  const requirements = [
    {
      relative: "DESIGN.md",
      kind: "design-contract",
      valid: async (target) => {
        if (!(await exists(target))) return false;
        return (await readFile(target, "utf8")).trim().length >= 100;
      },
      message: "DESIGN.md must contain a substantive implementation contract."
    },
    {
      relative: ".design-lagann/project-design-dna.json",
      kind: "project-design-dna",
      valid: async (target, data) => (
        Boolean(data && !data.error && (
          data.value?.creativeThesis ||
          data.value?.creativeIdea ||
          data.value?.creativeDirection?.thesis
        ))
      ),
      json: true,
      message: "Project Design DNA with a concrete creative thesis is required."
    },
    {
      relative: ".design-lagann/type-manifest.json",
      kind: "type-contract",
      valid: async (target, data) => (
        data && !data.error &&
        data.value?.gates?.passed === true &&
        data.value?.quality?.passed === true &&
        Object.keys(data.value?.roles || {}).length >= 2
      ),
      json: true,
      message: "A qualified type manifest is required."
    },
    {
      relative: ".design-lagann/asset-manifest.json",
      kind: "asset-contract",
      valid: async (target, data) => (
        data && !data.error && Array.isArray(data.value?.assets)
      ),
      json: true,
      message: "An asset manifest declaring every required visual medium is required."
    },
    {
      relative: ".design-lagann/design-artifacts.json",
      kind: "design-artifact-index",
      valid: async (target, data) => Boolean(data && !data.error && data.value?.projectDna),
      json: true,
      message: "The persisted design artifact index is required."
    }
  ];
  const evidence = [];
  const absent = [];
  for (const requirement of requirements) {
    const target = path.join(root, requirement.relative);
    const data = requirement.json ? await readJsonSafe(target) : null;
    const valid = await requirement.valid(target, data);
    evidence.push(...(await exists(target)
      ? [artifact(root, target, {
          kind: requirement.kind,
          role: "implementation contract",
          valid
        })]
      : []));
    if (!valid) {
      absent.push(missing(
        `${requirement.kind.replaceAll("-", "_").toUpperCase()}_MISSING_OR_INVALID`,
        requirement.relative,
        requirement.message
      ));
    }
  }
  return checkResult("design-contract", absent.length === 0, evidence, absent);
}

function acquisitionReceipts(value) {
  if (!value || typeof value !== "object") return [];
  const direct = Array.isArray(value.assets)
    ? value.assets
    : Array.isArray(value.outputs)
      ? value.outputs
      : [];
  const batches = Array.isArray(value.batches)
    ? value.batches.flatMap((batch) => Array.isArray(batch.assets) ? batch.assets : [])
    : [];
  return [...direct, ...batches];
}

function requiredRasterAssets(manifest) {
  return (manifest?.assets || []).filter((asset) => (
    asset?.implementation === "transparent-raster" ||
    asset?.medium === "transparent-raster"
  ));
}

async function inspectAssetAcquisition(root) {
  const manifestPath = path.join(root, ".design-lagann", "asset-manifest.json");
  const acquisitionPath = path.join(root, ".design-lagann", "asset-acquisition.json");
  const batchPath = path.join(root, ".design-lagann", "asset-batch-plan.json");
  const [manifest, acquisition, batch] = await Promise.all([
    readJsonSafe(manifestPath),
    readJsonSafe(acquisitionPath),
    readJsonSafe(batchPath)
  ]);
  const evidence = [];
  const absent = [];
  if (!manifest.exists || manifest.error || !Array.isArray(manifest.value?.assets)) {
    absent.push(missing("ASSET_MANIFEST_MISSING", ".design-lagann/asset-manifest.json", "A valid asset manifest is required before acquisition."));
    return checkResult("asset-acquisition", false, evidence, absent);
  }
  evidence.push(artifact(root, manifestPath, { kind: "asset-manifest", role: "asset requirements" }));
  const required = requiredRasterAssets(manifest.value);
  if (!required.length) {
    return checkResult("asset-acquisition", true, evidence, [], [
      "The asset manifest requires no raster or photographic files."
    ]);
  }
  const receiptArtifact = acquisition.exists ? acquisition : batch;
  const receiptPath = acquisition.exists ? acquisitionPath : batchPath;
  const receipts = acquisitionReceipts(receiptArtifact.value);
  if (!receiptArtifact.exists || receiptArtifact.error || !receipts.length) {
    absent.push(missing(
      "ASSET_ACQUISITION_RECEIPT_MISSING",
      ".design-lagann/asset-acquisition.json",
      "Required raster/photo assets need an acquisition receipt with local path, SHA-256, status, and provenance."
    ));
    return checkResult("asset-acquisition", false, evidence, absent);
  }
  evidence.push(artifact(root, receiptPath, {
    kind: "asset-acquisition-receipt",
    role: "project asset provenance"
  }));
  const byId = new Map(receipts.map((receipt) => [receipt.id, receipt]));
  for (const requiredAsset of required) {
    const receipt = byId.get(requiredAsset.id);
    if (!receipt) {
      absent.push(missing(
        "REQUIRED_RASTER_ASSET_MISSING",
        `.design-lagann/asset-acquisition.json#${requiredAsset.id}`,
        `Required raster/photo asset ${requiredAsset.id} has no acquisition receipt.`
      ));
      continue;
    }
    const status = String(receipt.status || "").toLowerCase();
    const provenance = receipt.provenance || receipt.source;
    const kind = String(receipt.kind || receipt.type || "").toLowerCase();
    const semanticKind = [
      "generated-raster",
      "generated-photo",
      "photo",
      "licensed-photo",
      "user-photo",
      "raster"
    ].includes(kind);
    if (!["acquired", "approved", "ready", "complete", "completed", "generated"].includes(status)) {
      absent.push(missing(
        "ASSET_NOT_ACQUIRED",
        `.design-lagann/asset-acquisition.json#${requiredAsset.id}`,
        `${requiredAsset.id} is not marked acquired or approved.`
      ));
    }
    if (!semanticKind || !provenance || (typeof provenance === "object" && !Object.keys(provenance).length)) {
      absent.push(missing(
        "ASSET_PROVENANCE_MISSING",
        `.design-lagann/asset-acquisition.json#${requiredAsset.id}`,
        `${requiredAsset.id} must declare raster/photo kind and source or generation provenance.`
      ));
    }
    const verified = await verifyImageEntry(root, receipt, {
      requireRasterSignature: true,
      forbidConceptFrame: true
    });
    evidence.push(artifact(root, verified.target || resolveLocalPath(
      root,
      receipt.localPath || receipt.path || receipt.outputPath || receipt.expectedOutput
    ), {
      kind: "project-raster-asset",
      role: requiredAsset.role || requiredAsset.intent || "project visual",
      referenceOnly: false,
      valid: verified.valid,
      details: { id: requiredAsset.id, sha256: verified.digest || receipt.sha256 || null }
    }));
    if (!verified.valid) {
      absent.push(missing(
        verified.code,
        displayPath(root, verified.target) || `.design-lagann/asset-acquisition.json#${requiredAsset.id}`,
        `${requiredAsset.id}: ${verified.message}`
      ));
    }
  }
  return checkResult("asset-acquisition", absent.length === 0, evidence, absent, [
    "Creative direction frames are excluded even when their file extension and hash are valid."
  ]);
}

async function walkImplementation(root, maximum = 2_000) {
  const files = [];
  async function visit(directory) {
    if (files.length >= maximum) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maximum) return;
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(root);
  return files;
}

async function inspectImplementationSource(root) {
  const files = await walkImplementation(root);
  const candidates = [];
  const svgFiles = files.filter((target) => path.extname(target).toLowerCase() === ".svg");
  for (const target of files) {
    const extension = path.extname(target).toLowerCase();
    if (
      !IMPLEMENTATION_MARKUP.has(extension) &&
      !IMPLEMENTATION_STYLES.has(extension) &&
      !IMPLEMENTATION_SCRIPTS.has(extension)
    ) continue;
    const relative = normalizedSlash(path.relative(root, target)).toLowerCase();
    if (
      relative.startsWith("test/") ||
      relative.startsWith("tests/") ||
      relative.includes("/__tests__/") ||
      /\.test\.[cm]?[jt]sx?$/.test(relative) ||
      /\.spec\.[cm]?[jt]sx?$/.test(relative)
    ) continue;
    const content = await readFile(target, "utf8");
    if (content.trim().length < 40) continue;
    candidates.push({ target, extension, content });
  }
  const markup = candidates.filter((item) => IMPLEMENTATION_MARKUP.has(item.extension));
  const styles = candidates.filter((item) => IMPLEMENTATION_STYLES.has(item.extension));
  const hasInlineStyles = markup.some((item) => (
    /<style[\s>]/i.test(item.content) ||
    /\bstyle=\{?/.test(item.content)
  ));
  const evidence = candidates.map((item) => artifact(root, item.target, {
    kind: IMPLEMENTATION_MARKUP.has(item.extension)
      ? "interface-markup"
      : IMPLEMENTATION_STYLES.has(item.extension)
        ? "interface-styles"
        : "interface-script",
    role: "implementation source",
    referenceOnly: false
  }));
  const absent = [];
  if (!markup.length) {
    absent.push(missing(
      "IMPLEMENTATION_MARKUP_MISSING",
      "src/ or index.html",
      "Real page/component markup is required; visual frames are not implementation."
    ));
  }
  if (!styles.length && !hasInlineStyles) {
    absent.push(missing(
      "IMPLEMENTATION_STYLES_MISSING",
      "src/ or index.html",
      "Real responsive styling source is required."
    ));
  }
  for (const target of svgFiles) {
    absent.push(missing(
      "SVG_FILE_FORBIDDEN",
      displayPath(root, target),
      "SVG files are forbidden anywhere in the implementation. Generate or acquire a verified PNG/WebP replacement before continuing."
    ));
  }
  for (const item of candidates) {
    for (const rule of FORBIDDEN_SVG_SOURCE_PATTERNS) {
      if (!rule.pattern.test(item.content)) continue;
      absent.push(missing(rule.code, displayPath(root, item.target), rule.message));
    }
  }
  return checkResult("implementation-source", absent.length === 0, evidence, absent);
}

async function reviewDirectories(root) {
  const reviews = path.join(root, ".design-lagann", "reviews");
  let entries = [];
  try {
    entries = await readdir(reviews, { withFileTypes: true });
  } catch {
    return [];
  }
  const directories = [];
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const target = path.join(reviews, entry.name);
    const info = await stat(target);
    directories.push({ name: entry.name, target, mtimeMs: info.mtimeMs });
  }
  return directories.sort((left, right) => (
    right.mtimeMs - left.mtimeMs || right.name.localeCompare(left.name)
  ));
}

async function screenshotEvidence(root, capture, requiredViewports, runDir, stage) {
  const evidence = [];
  const absent = [];
  const captures = Array.isArray(capture?.captures) ? capture.captures : [];
  for (const viewport of requiredViewports) {
    const item = captures.find((candidate) => candidate.name === viewport);
    const target = resolveLocalPath(root, item?.screenshot);
    const info = target ? await fileInfo(target) : null;
    const format = info && info.size > 0
      ? rasterSignature(await readFile(target))
      : null;
    const validLocation = target && insideRoot(root, target) &&
      normalizedSlash(path.relative(root, target)).toLowerCase().startsWith(
        normalizedSlash(path.relative(root, path.join(runDir, "screenshots"))).toLowerCase()
      );
    const valid = Boolean(
      info &&
      info.size > 0 &&
      path.extname(target).toLowerCase() === ".png" &&
      format === "png" &&
      validLocation &&
      !conceptFramePath(root, target)
    );
    if (target) {
      evidence.push(artifact(root, target, {
        kind: "browser-rendered-screenshot",
        role: `${stage} ${viewport} full-page evidence`,
        referenceOnly: false,
        valid
      }));
    }
    if (!valid) {
      absent.push(missing(
        "RENDERED_VIEWPORT_MISSING",
        displayPath(root, target) || `${displayPath(root, runDir)}/screenshots/${stage}/${viewport}.png`,
        `Fresh browser-rendered ${viewport} evidence is missing or outside the review run.`
      ));
    }
  }
  return { evidence, missing: absent };
}

async function reviewArtifacts(root) {
  const runs = [];
  for (const directory of await reviewDirectories(root)) {
    const [review, beforeCritique, afterCritique, repairPlan, regionalRepairPlan, comparison, verification] =
      await Promise.all([
        readJsonSafe(path.join(directory.target, "review.json")),
        readJsonSafe(path.join(directory.target, "critique-before.json")),
        readJsonSafe(path.join(directory.target, "critique-after.json")),
        readJsonSafe(path.join(directory.target, "repair-plan.json")),
        readJsonSafe(path.join(directory.target, "regional-repair-plan.json")),
        readJsonSafe(path.join(directory.target, "comparison.json")),
        readJsonSafe(path.join(directory.target, "verification.json"))
      ]);
    runs.push({
      ...directory,
      review,
      beforeCritique,
      afterCritique,
      repairPlan,
      regionalRepairPlan,
      comparison,
      verification
    });
  }
  return runs;
}

function baselineFromRun(run) {
  const review = run.review.value;
  if (review?.before?.capture) {
    return {
      capture: review.before.capture,
      vision: review.before.vision,
      qualityGate: review.before.qualityGate,
      reports: review.before.reports
    };
  }
  const critique = run.beforeCritique.value || review;
  return critique
    ? {
        capture: critique.capture,
        vision: critique.vision,
        qualityGate: critique.qualityGate,
        reports: critique.reports
      }
    : null;
}

async function inspectRenderedCritique(root, reviews) {
  const evidence = [];
  const absent = [];
  let chosen = null;
  for (const run of reviews) {
    const baseline = baselineFromRun(run);
    if (!baseline?.capture) continue;
    const screenshotCheck = await screenshotEvidence(
      root,
      baseline.capture,
      ["desktop", "tablet", "mobile"],
      run.target,
      "before"
    );
    const hasCritique = Boolean(
      baseline.vision?.report &&
      baseline.qualityGate &&
      Array.isArray(baseline.reports) &&
      baseline.reports.length
    );
    if (screenshotCheck.missing.length === 0 && hasCritique) {
      chosen = { run, baseline, screenshotCheck };
      break;
    }
  }
  if (!chosen) {
    absent.push(missing(
      "RENDERED_CRITIQUE_MISSING",
      ".design-lagann/reviews/<run>/critique-before.json",
      "A full desktop/tablet/mobile browser capture and an independent critique report are required."
    ));
    return checkResult("rendered-critique", false, evidence, absent);
  }
  evidence.push(...chosen.screenshotCheck.evidence);
  evidence.push(artifact(root, path.join(chosen.run.target, "critique-before.json"), {
    kind: "rendered-critique",
    role: "before-state whole-page critique",
    referenceOnly: false
  }));
  return checkResult("rendered-critique", true, evidence, [], [], {
    run: chosen.run
  });
}

async function inspectRepair(root, reviews) {
  const evidence = [];
  const absent = [];
  let chosen = null;
  for (const run of reviews) {
    const review = run.review.value;
    if (
      !review?.before?.capture ||
      !review?.after?.capture ||
      !Array.isArray(review?.agent?.modifiedFiles) ||
      !review.agent.modifiedFiles.length ||
      !run.repairPlan.exists ||
      !run.regionalRepairPlan.exists ||
      !(run.afterCritique.exists || review.after) ||
      !(run.comparison.exists || review.comparison)
    ) continue;
    const afterScreenshots = await screenshotEvidence(
      root,
      review.after.capture,
      ["desktop", "tablet", "mobile"],
      run.target,
      "after"
    );
    if (afterScreenshots.missing.length === 0) {
      chosen = { run, review, afterScreenshots };
      break;
    }
  }
  if (!chosen) {
    absent.push(missing(
      "REPAIR_EVIDENCE_MISSING",
      ".design-lagann/reviews/<run>/review.json",
      "A bounded repair must modify implementation files and produce a fresh critiqued after-state."
    ));
    return checkResult("repair", false, evidence, absent);
  }
  evidence.push(
    artifact(root, path.join(chosen.run.target, "repair-plan.json"), {
      kind: "repair-plan",
      role: "bounded repair instructions"
    }),
    artifact(root, path.join(chosen.run.target, "regional-repair-plan.json"), {
      kind: "regional-repair-plan",
      role: "bounded repair scope"
    }),
    ...chosen.afterScreenshots.evidence,
    artifact(root, path.join(chosen.run.target, "critique-after.json"), {
      kind: "after-critique",
      role: "post-repair critique"
    })
  );
  return checkResult("repair", true, evidence, [], [
    `Modified implementation files: ${chosen.review.agent.modifiedFiles.join(", ")}`
  ]);
}

async function inspectFinalProof(root, reviews) {
  const evidence = [];
  const absent = [];
  let chosen = null;
  for (const run of reviews) {
    const review = run.review.value;
    const comparison = review?.comparison || run.comparison.value;
    const verification = review?.verification || run.verification.value;
    if (
      review?.phase !== "accepted" ||
      review?.verdict !== "accepted" ||
      review?.acceptancePolicy !== "elite-v1" ||
      !review?.after?.vision?.report ||
      !Array.isArray(review?.after?.reports) ||
      !review.after.reports.length ||
      review?.after?.qualityGate?.passed !== true ||
      comparison?.evidenceComplete !== true ||
      comparison?.passed !== true ||
      verification?.passed !== true ||
      review?.stopping?.passed !== true ||
      !review?.agent?.sourceDigest
    ) continue;
    const afterScreenshots = await screenshotEvidence(
      root,
      review.after.capture,
      ["desktop", "tablet", "mobile"],
      run.target,
      "after"
    );
    if (afterScreenshots.missing.length === 0) {
      chosen = { run, review, comparison, verification, afterScreenshots };
      break;
    }
  }
  if (!chosen) {
    absent.push(missing(
      "FINAL_PROOF_MISSING",
      ".design-lagann/reviews/<run>/review.json",
      "Final proof requires elite-v1 acceptance, passing verification, non-regressive comparison, source integrity, and fresh desktop/tablet/mobile renders."
    ));
    return checkResult("final-proof", false, evidence, absent);
  }
  evidence.push(
    ...chosen.afterScreenshots.evidence,
    artifact(root, path.join(chosen.run.target, "review.json"), {
      kind: "accepted-review",
      role: "elite-v1 final proof",
      details: {
        verdict: chosen.review.verdict,
        acceptancePolicy: chosen.review.acceptancePolicy
      }
    }),
    artifact(root, path.join(chosen.run.target, "verification.json"), {
      kind: "verification",
      role: "technical and accessibility verification"
    }),
    artifact(root, path.join(chosen.run.target, "comparison.json"), {
      kind: "before-after-comparison",
      role: "non-regressive improvement proof"
    })
  );
  return checkResult("final-proof", true, evidence, [], [
    "Acceptance applies to the browser-rendered implementation, never to its creative reference frames."
  ]);
}

function orderChecks(checks) {
  const byId = new Map(checks.map((check) => [check.id, check]));
  return PIPELINE_STAGES.map((stage) => byId.get(stage.id));
}

function materializeStages(checks) {
  const firstIncomplete = checks.findIndex((check) => !check.evidenceComplete);
  return PIPELINE_STAGES.map((definition, index) => {
    const check = checks[index];
    const status = firstIncomplete === -1 || index < firstIncomplete
      ? "completed"
      : index === firstIncomplete
        ? "current"
        : "blocked";
    return {
      ...definition,
      status,
      evidenceComplete: check.evidenceComplete,
      blockedBy: status === "blocked" ? PIPELINE_STAGES[firstIncomplete].id : null,
      evidence: check.evidence,
      missing: check.missing,
      notes: check.notes
    };
  });
}

export function resolvePipelineStageId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const direct = PIPELINE_STAGES.find((stage) => stage.id === normalized);
  const resolved = direct?.id || STAGE_ALIASES[normalized];
  if (!resolved) {
    throw new Error(`Unknown Design Lagann pipeline stage: ${value}`);
  }
  return resolved;
}

export class PipelineStageOrderError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "PipelineStageOrderError";
    this.code = "DESIGN_LAGANN_PIPELINE_STAGE_ORDER";
    this.details = details;
  }
}

export function validatePipelineStatus(status) {
  if (!status || typeof status !== "object") throw new Error("pipeline status must be an object");
  if (status.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`pipeline status schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (!["fast", "balanced", "quality"].includes(status.mode?.profile)) {
    throw new Error("pipeline status must expose Fast, Balanced, or Quality mode");
  }
  if (!String(status.runId || "").trim()) {
    throw new Error("pipeline status must expose a stable runId");
  }
  if (status.mode?.isSuperQuality !== (status.mode.profile === "quality")) {
    throw new Error("pipeline status super-quality flag does not match its profile");
  }
  if (
    status.pipelinePolicy?.strictStageOrder !== true ||
    status.pipelinePolicy?.implementationTarget !== "local-workspace" ||
    status.pipelinePolicy?.designDelegationToSites !== false ||
    status.pipelinePolicy?.sitesUse !== "deployment-only-after-local-verification"
  ) {
    throw new Error("pipeline status must enforce strict local implementation and deployment-only Sites usage");
  }
  if (!Array.isArray(status.stages) || status.stages.length !== PIPELINE_STAGES.length) {
    throw new Error("pipeline status must contain every ordered stage");
  }
  const ids = status.stages.map((stage) => stage.id);
  if (ids.join(",") !== PIPELINE_STAGES.map((stage) => stage.id).join(",")) {
    throw new Error("pipeline stages are out of order");
  }
  let incompleteSeen = false;
  let currentCount = 0;
  for (const stage of status.stages) {
    if (stage.status === "completed") {
      if (incompleteSeen || !stage.evidenceComplete) {
        throw new Error(`completed stage ${stage.id} violates strict stage order`);
      }
    } else {
      incompleteSeen = true;
      if (stage.status === "current") currentCount += 1;
      if (stage.status === "blocked" && !stage.blockedBy) {
        throw new Error(`blocked stage ${stage.id} must identify its prerequisite`);
      }
    }
    for (const item of stage.evidence || []) {
      if (
        stage.id === "asset-acquisition" &&
        item.kind === "project-raster-asset" &&
        item.valid !== false &&
        (item.referenceOnly || /visual-orientation|concept|mockup/i.test(item.path || ""))
      ) {
        throw new Error("creative reference frames cannot be project asset evidence");
      }
      if (
        ["direction-frames", "approved-selected-pair"].includes(stage.id) &&
        /direction-frame|visual-reference/.test(item.kind || "") &&
        item.referenceOnly !== true
      ) {
        throw new Error("visual direction evidence must be marked referenceOnly");
      }
    }
  }
  if (status.verdict === "in-progress" && currentCount !== 1) {
    throw new Error("an in-progress pipeline must have exactly one current stage");
  }
  if (
    status.readiness?.implementation === true &&
    !status.stages.slice(0, 5).every((stage) => stage.status === "completed")
  ) {
    throw new Error("implementation readiness requires all pre-implementation gates");
  }
  if (
    status.readiness?.finalAcceptance === true &&
    !status.stages.every((stage) => stage.status === "completed")
  ) {
    throw new Error("final acceptance requires every pipeline stage");
  }
  if (
    status.runClassification === "creative-reference-only" &&
    status.readiness?.implementation !== false
  ) {
    throw new Error("a creative-reference-only run cannot be implementation-ready");
  }
  return status;
}

export function assertPipelineStageAllowed(status, requestedStage, options = {}) {
  validatePipelineStatus(status);
  const stageId = resolvePipelineStageId(requestedStage);
  const stage = status.stages.find((item) => item.id === stageId);
  const allowCompleted = options.allowCompleted !== false;
  if (stage.status === "current" || (allowCompleted && stage.status === "completed")) {
    return stage;
  }
  const current = status.current;
  throw new PipelineStageOrderError(
    `${stage.label} is blocked by strict pipeline order. Complete ${current?.label || stage.blockedBy} first.`,
    {
      requestedStage: stage.id,
      requestedStatus: stage.status,
      currentStage: current?.id || null,
      blockedBy: stage.blockedBy,
      missingRequiredArtifacts: current?.missing || []
    }
  );
}

export async function inspectPipelineStatus(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const briefPath = path.join(root, ".design-lagann", "brief.json");
  const planPath = path.join(root, ".design-lagann", "adaptive-plan.json");
  const sitePlanPath = path.join(root, ".design-lagann", "site-plan.json");
  const [brief, plan, sitePlan] = await Promise.all([
    readJsonSafe(briefPath),
    readJsonSafe(planPath),
    readJsonSafe(sitePlanPath)
  ]);
  const context = { brief, plan, sitePlan };
  const reviews = await reviewArtifacts(root);
  const unorderedChecks = await Promise.all([
    inspectPlanIntake(root, context),
    inspectDirectionFrames(root),
    inspectSelectedPair(root),
    inspectDesignContract(root),
    inspectAssetAcquisition(root),
    inspectImplementationSource(root),
    inspectRenderedCritique(root, reviews),
    inspectRepair(root, reviews),
    inspectFinalProof(root, reviews)
  ]);
  const checks = orderChecks(unorderedChecks);
  const stages = materializeStages(checks);
  const current = stages.find((stage) => stage.status === "current") || null;
  const currentIndex = current ? stages.findIndex((stage) => stage.id === current.id) : -1;
  const next = currentIndex >= 0 && currentIndex + 1 < stages.length
    ? stages[currentIndex + 1]
    : null;
  const mode = await resolveMode(root, plan, brief);
  const implementationReady = stages.slice(0, 5).every((stage) => stage.status === "completed");
  const implementationEvidenceReady = stages.slice(0, 6).every((stage) => stage.status === "completed");
  const finalAcceptance = stages.every((stage) => stage.status === "completed");
  const hasDirectionFrames = checks.find((check) => check.id === "direction-frames")?.evidenceComplete === true;
  const implementationCheck = checks.find((check) => check.id === "implementation-source");
  const hasImplementationAttempt = (implementationCheck?.evidence || []).length > 0;
  const creativeReferenceOnly = hasDirectionFrames && !hasImplementationAttempt;
  const requiredMissingArtifacts = stages
    .filter((stage) => stage.status !== "completed")
    .flatMap((stage) => stage.missing.map((item) => ({ stageId: stage.id, ...item })));
  const status = {
    schemaVersion: SCHEMA_VERSION,
    kind: "design-lagann-strict-pipeline-status",
    runId: plan.value?.runId || `design-lagann-${createHash("sha256").update(root).digest("hex").slice(0, 16)}`,
    projectRoot: root,
    generatedAt: options.generatedAt || new Date().toISOString(),
    mode,
    acceptancePolicy: {
      id: "elite-v1",
      invariantAcrossModes: true
    },
    pipelinePolicy: {
      strictStageOrder: true,
      implementationTarget: "local-workspace",
      designDelegationToSites: false,
      sitesUse: "deployment-only-after-local-verification",
      sitesDeploymentCondition: "explicit-user-request-or-existing-openai-hosting-json",
      visualFramesAreReferenceOnly: true,
      conceptFramesCanSatisfyProjectAssets: false,
      conceptFramesCanSatisfyImplementation: false,
      conceptFramesCanSatisfyFinalProof: false,
      externalSiteBuilderRequired: false
    },
    verdict: finalAcceptance ? "accepted" : "in-progress",
    runClassification: finalAcceptance
      ? "accepted-implementation"
      : creativeReferenceOnly
        ? "creative-reference-only"
        : implementationEvidenceReady
          ? "implemented-unverified"
          : implementationReady
            ? "implementation-ready"
            : "pre-implementation",
    readiness: {
      implementation: implementationReady,
      implementationEvidence: implementationEvidenceReady,
      finalAcceptance
    },
    completed: stages.filter((stage) => stage.status === "completed").map((stage) => stage.id),
    blocked: stages.filter((stage) => stage.status === "blocked").map((stage) => stage.id),
    current,
    next,
    requiredMissingArtifacts,
    stages
  };
  validatePipelineStatus(status);
  if (options.requestedStage) {
    assertPipelineStageAllowed(status, options.requestedStage, options);
  }
  return status;
}

export async function guardPipelineStage({
  projectRoot,
  requestedStage,
  allowCompleted = true,
  generatedAt
} = {}) {
  if (!requestedStage) throw new Error("requestedStage is required");
  const status = await inspectPipelineStatus(projectRoot, { generatedAt });
  const stage = assertPipelineStageAllowed(status, requestedStage, { allowCompleted });
  return {
    allowed: true,
    stage,
    mode: status.mode,
    status
  };
}
