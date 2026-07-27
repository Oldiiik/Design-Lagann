import { createHash } from "node:crypto";

export const REFERENCE_COMPARISON_DIMENSIONS = Object.freeze([
  Object.freeze({
    id: "composition",
    label: "composition",
    category: "composition",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "hierarchy",
    label: "hierarchy",
    category: "hierarchy",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "typographyRoles",
    label: "typography roles",
    category: "typography",
    repairKind: "system"
  }),
  Object.freeze({
    id: "colorMaterialRelationships",
    label: "color and material relationships",
    category: "material",
    repairKind: "system"
  }),
  Object.freeze({
    id: "objectPlacement",
    label: "object placement",
    category: "object-integration",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "sectionRhythm",
    label: "section rhythm",
    category: "rhythm",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "spacingGeometry",
    label: "spacing geometry",
    category: "composition",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "headlineWrapping",
    label: "headline measure and wrapping",
    category: "typography",
    repairKind: "system"
  }),
  Object.freeze({
    id: "assetCrop",
    label: "asset crop and silhouette",
    category: "object-integration",
    repairKind: "structural"
  }),
  Object.freeze({
    id: "responsiveTransformation",
    label: "responsive transformation",
    category: "responsive",
    repairKind: "structural"
  })
]);

const dimensionById = new Map(
  REFERENCE_COMPARISON_DIMENSIONS.map((dimension) => [dimension.id, dimension])
);
const comparisonStatuses = new Set(["aligned", "partial", "diverged", "not-verifiable"]);
const hashPattern = /^[a-f0-9]{64}$/i;
const roleOnlyMessage =
  "Numeric and pixel metrics are supporting evidence only. They do not alter semantic findings, establish reference fidelity, or authorize an automatic repair claim.";

const lexicalCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const asArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const unique = (items) => [...new Set(items)];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(lexicalCompare)
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function digestReferenceContract(value) {
  if (typeof value === "string") {
    return sha256(value.normalize("NFC").replace(/\r\n?/g, "\n"));
  }
  if (!value || typeof value !== "object") {
    throw new TypeError("Reference contract content must be a string or object.");
  }
  return sha256(canonicalJson(value));
}

function timestamp(value, path) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${path} must be an ISO-8601 timestamp.`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(`${path} must be an ISO-8601 timestamp.`);
  }
  return { iso: new Date(milliseconds).toISOString(), milliseconds };
}

function normalizeHash(value, path) {
  const normalized = String(value ?? "").toLowerCase();
  if (!hashPattern.test(normalized)) {
    throw new TypeError(`${path} must be a SHA-256 hex digest.`);
  }
  return normalized;
}

function normalizeIdentity(item, index, kind) {
  if (!item || typeof item !== "object") {
    throw new TypeError(`${kind}[${index}] must be an object.`);
  }
  const id = String(item.id ?? "").trim();
  const viewport = String(item.viewport ?? item.name ?? "").trim();
  if (!id) throw new TypeError(`${kind}[${index}].id is required.`);
  if (!viewport) throw new TypeError(`${kind}[${index}].viewport is required.`);
  const capturedAt = timestamp(item.capturedAt, `${kind}[${index}].capturedAt`);
  const width = item.width === undefined ? null : Number(item.width);
  const height = item.height === undefined ? null : Number(item.height);
  if (width !== null && (!Number.isFinite(width) || width <= 0)) {
    throw new TypeError(`${kind}[${index}].width must be positive when supplied.`);
  }
  if (height !== null && (!Number.isFinite(height) || height <= 0)) {
    throw new TypeError(`${kind}[${index}].height must be positive when supplied.`);
  }
  return {
    id,
    viewport,
    sha256: normalizeHash(item.sha256, `${kind}[${index}].sha256`),
    capturedAt: capturedAt.iso,
    ...(width === null ? {} : { width }),
    ...(height === null ? {} : { height })
  };
}

function sortIdentities(items) {
  return [...items].sort((a, b) =>
    lexicalCompare(a.viewport, b.viewport) || lexicalCompare(a.id, b.id)
  );
}

function assertUniqueIdentities(items, kind) {
  const ids = new Set();
  const identities = new Set();
  for (const item of items) {
    const identity = `${item.viewport}:${item.id}`;
    if (ids.has(item.id)) throw new TypeError(`${kind} contains duplicate id ${item.id}.`);
    if (identities.has(identity)) throw new TypeError(`${kind} contains duplicate identity ${identity}.`);
    ids.add(item.id);
    identities.add(identity);
  }
}

function normalizeExpectations(expectations) {
  if (!expectations || typeof expectations !== "object") {
    throw new TypeError("contract.expectations must define all comparison dimensions.");
  }
  return Object.fromEntries(REFERENCE_COMPARISON_DIMENSIONS.map((dimension) => {
    const value = String(expectations[dimension.id] ?? "").trim();
    if (!value) {
      throw new TypeError(`contract.expectations.${dimension.id} is required.`);
    }
    return [dimension.id, value];
  }));
}

function normalizeContract(contract) {
  if (!contract || typeof contract !== "object") {
    throw new TypeError("contract is required.");
  }
  const id = String(contract.id ?? "").trim();
  const source = String(contract.source ?? "").trim();
  if (!id) throw new TypeError("contract.id is required.");
  if (!source) throw new TypeError("contract.source is required.");
  const updatedAt = timestamp(contract.updatedAt, "contract.updatedAt");
  const computedDigest = contract.content === undefined
    ? null
    : digestReferenceContract(contract.content);
  const digest = normalizeHash(
    contract.digest ?? computedDigest,
    "contract.digest"
  );
  if (computedDigest && digest !== computedDigest) {
    throw new TypeError("contract.digest does not match contract.content.");
  }
  return {
    id,
    source,
    digest,
    updatedAt: updatedAt.iso,
    expectations: normalizeExpectations(contract.expectations)
  };
}

function bindingCore(binding) {
  return {
    schemaVersion: binding.schemaVersion,
    contract: binding.contract,
    referenceFrames: binding.referenceFrames,
    buildCaptures: binding.buildCaptures,
    requiredViewports: binding.requiredViewports,
    rubricIds: binding.rubricIds,
    criticRequirements: binding.criticRequirements,
    issuedAt: binding.issuedAt
  };
}

function requestIdFor(binding) {
  return `reference-build-${sha256(canonicalJson(bindingCore(binding))).slice(0, 24)}`;
}

function normalizeRubricIds(rubricIds) {
  const normalized = unique(
    asArray(rubricIds).map((id) => String(id).trim()).filter(Boolean)
  ).sort(lexicalCompare);
  if (normalized.length === 0) {
    throw new TypeError("rubricIds must contain at least one rubric.");
  }
  return normalized;
}

function normalizeCriticRequirements(requirements = {}) {
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) {
    throw new TypeError("criticRequirements must be an object.");
  }
  const allowedCritics = unique(
    asArray(requirements.allowedCritics).map((item) => String(item).trim()).filter(Boolean)
  ).sort(lexicalCompare);
  const allowedModels = unique(
    asArray(requirements.allowedModels).map((item) => String(item).trim()).filter(Boolean)
  ).sort(lexicalCompare);
  const maxAgeMs = requirements.maxAgeMs == null
    ? null
    : Number(requirements.maxAgeMs);
  if (maxAgeMs !== null && (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0)) {
    throw new TypeError("criticRequirements.maxAgeMs must be positive when supplied.");
  }
  return {
    visionCapable: true,
    independentOfImplementation: true,
    allowedCritics,
    allowedModels,
    maxAgeMs
  };
}

export function createReferenceEvidenceBinding(input = {}) {
  const contract = normalizeContract(input.contract);
  const referenceFrames = sortIdentities(
    asArray(input.referenceFrames).map((item, index) =>
      normalizeIdentity(item, index, "referenceFrames")
    )
  );
  const buildCaptures = sortIdentities(
    asArray(input.buildCaptures).map((item, index) =>
      normalizeIdentity(item, index, "buildCaptures")
    )
  );
  if (referenceFrames.length === 0) {
    throw new TypeError("At least one selected reference frame is required.");
  }
  if (buildCaptures.length === 0) {
    throw new TypeError("At least one build capture is required.");
  }
  assertUniqueIdentities(referenceFrames, "referenceFrames");
  assertUniqueIdentities(buildCaptures, "buildCaptures");

  const buildViewports = unique(buildCaptures.map((item) => item.viewport)).sort(lexicalCompare);
  const requiredViewports = unique(
    asArray(input.requiredViewports ?? buildViewports)
      .map((viewport) => String(viewport).trim())
      .filter(Boolean)
  ).sort(lexicalCompare);
  const missingBuildViewports = requiredViewports.filter((viewport) =>
    !buildViewports.includes(viewport)
  );
  if (missingBuildViewports.length > 0) {
    throw new TypeError(
      `Build captures are missing required viewports: ${missingBuildViewports.join(", ")}.`
    );
  }

  const issuedAt = timestamp(input.issuedAt, "issuedAt");
  const evidenceTimes = [
    Date.parse(contract.updatedAt),
    ...referenceFrames.map((item) => Date.parse(item.capturedAt)),
    ...buildCaptures.map((item) => Date.parse(item.capturedAt))
  ];
  if (Math.max(...evidenceTimes) > issuedAt.milliseconds) {
    throw new TypeError("issuedAt must not predate the contract or any bound image capture.");
  }

  const binding = {
    schemaVersion: "1.0",
    requestId: "",
    contract,
    referenceFrames,
    buildCaptures,
    requiredViewports,
    rubricIds: normalizeRubricIds(input.rubricIds),
    criticRequirements: normalizeCriticRequirements(input.criticRequirements),
    issuedAt: issuedAt.iso
  };
  binding.requestId = input.requestId
    ? String(input.requestId).trim()
    : requestIdFor(binding);
  if (!binding.requestId) throw new TypeError("requestId cannot be blank.");
  if (input.requestId && binding.requestId !== requestIdFor(binding)) {
    throw new TypeError("Explicit requestId does not match the deterministic evidence binding.");
  }
  return binding;
}

function validationIssue(code, path, message) {
  return { code, path, message };
}

function validateBindingShape(binding) {
  const errors = [];
  if (!binding || typeof binding !== "object") {
    return [validationIssue("binding-missing", "binding", "Reference evidence binding is required.")];
  }
  if (binding.schemaVersion !== "1.0") {
    errors.push(validationIssue(
      "binding-schema",
      "binding.schemaVersion",
      "Binding schemaVersion must be 1.0."
    ));
  }
  let contract = null;
  try {
    contract = normalizeContract(binding.contract);
  } catch (error) {
    errors.push(validationIssue(
      "contract-shape",
      "binding.contract",
      error.message
    ));
  }
  let referenceFrames = [];
  if (!Array.isArray(binding.referenceFrames) || binding.referenceFrames.length === 0) {
    errors.push(validationIssue(
      "reference-frames",
      "binding.referenceFrames",
      "Binding needs at least one reference frame."
    ));
  } else {
    for (const [index, item] of binding.referenceFrames.entries()) {
      try {
        referenceFrames.push(normalizeIdentity(item, index, "binding.referenceFrames"));
      } catch (error) {
        errors.push(validationIssue(
          "reference-frame-shape",
          `binding.referenceFrames[${index}]`,
          error.message
        ));
      }
    }
    try {
      assertUniqueIdentities(referenceFrames, "binding.referenceFrames");
    } catch (error) {
      errors.push(validationIssue(
        "reference-frame-identity",
        "binding.referenceFrames",
        error.message
      ));
    }
  }
  let buildCaptures = [];
  if (!Array.isArray(binding.buildCaptures) || binding.buildCaptures.length === 0) {
    errors.push(validationIssue(
      "build-captures",
      "binding.buildCaptures",
      "Binding needs at least one build capture."
    ));
  } else {
    for (const [index, item] of binding.buildCaptures.entries()) {
      try {
        buildCaptures.push(normalizeIdentity(item, index, "binding.buildCaptures"));
      } catch (error) {
        errors.push(validationIssue(
          "build-capture-shape",
          `binding.buildCaptures[${index}]`,
          error.message
        ));
      }
    }
    try {
      assertUniqueIdentities(buildCaptures, "binding.buildCaptures");
    } catch (error) {
      errors.push(validationIssue(
        "build-capture-identity",
        "binding.buildCaptures",
        error.message
      ));
    }
  }
  let requiredViewports = [];
  if (!Array.isArray(binding.requiredViewports) || binding.requiredViewports.length === 0) {
    errors.push(validationIssue(
      "required-viewports",
      "binding.requiredViewports",
      "Binding needs required viewport identities."
    ));
  } else {
    requiredViewports = binding.requiredViewports.map((viewport) => String(viewport).trim());
    if (
      requiredViewports.some((viewport) => !viewport)
      || unique(requiredViewports).length !== requiredViewports.length
    ) {
      errors.push(validationIssue(
        "required-viewport-shape",
        "binding.requiredViewports",
        "Required viewport identities must be non-empty and unique."
      ));
    }
    const buildViewports = unique(buildCaptures.map((capture) => capture.viewport));
    const missing = requiredViewports.filter((viewport) => !buildViewports.includes(viewport));
    if (missing.length > 0) {
      errors.push(validationIssue(
        "required-viewport-capture",
        "binding.requiredViewports",
        `Build captures are missing required viewports: ${missing.join(", ")}.`
      ));
    }
  }
  if (!Array.isArray(binding.rubricIds) || binding.rubricIds.length === 0) {
    errors.push(validationIssue(
      "rubric-ids",
      "binding.rubricIds",
      "Binding needs rubric coverage requirements."
    ));
  } else {
    try {
      const normalizedRubrics = normalizeRubricIds(binding.rubricIds);
      if (
        normalizedRubrics.length !== binding.rubricIds.length
        || binding.rubricIds.some((id) => !String(id).trim())
      ) {
        errors.push(validationIssue(
          "rubric-id-shape",
          "binding.rubricIds",
          "Rubric identities must be non-empty and unique."
        ));
      }
    } catch (error) {
      errors.push(validationIssue("rubric-id-shape", "binding.rubricIds", error.message));
    }
  }
  try {
    const normalizedRequirements = normalizeCriticRequirements(binding.criticRequirements);
    if (canonicalJson(normalizedRequirements) !== canonicalJson(binding.criticRequirements)) {
      errors.push(validationIssue(
        "critic-requirements-shape",
        "binding.criticRequirements",
        "Critic requirements must be canonical, explicit evidence constraints."
      ));
    }
  } catch (error) {
    errors.push(validationIssue(
      "critic-requirements-shape",
      "binding.criticRequirements",
      error.message
    ));
  }
  let issuedAt = null;
  try {
    issuedAt = timestamp(binding.issuedAt, "binding.issuedAt");
  } catch (error) {
    errors.push(validationIssue("binding-timestamp", "binding.issuedAt", error.message));
  }
  if (issuedAt && contract && referenceFrames.length && buildCaptures.length) {
    const latestEvidence = Math.max(
      Date.parse(contract.updatedAt),
      ...referenceFrames.map((item) => Date.parse(item.capturedAt)),
      ...buildCaptures.map((item) => Date.parse(item.capturedAt))
    );
    if (latestEvidence > issuedAt.milliseconds) {
      errors.push(validationIssue(
        "binding-stale",
        "binding.issuedAt",
        "Binding request predates its contract or image evidence."
      ));
    }
  }
  if (errors.length === 0 && binding.requestId !== requestIdFor(binding)) {
    errors.push(validationIssue(
      "binding-tampered",
      "binding.requestId",
      "Binding requestId does not match its sealed contract, image, viewport, rubric, and timestamp data."
    ));
  }
  return errors;
}

export function validateReferenceEvidenceBinding(binding) {
  const errors = validateBindingShape(binding);
  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? "verified-binding" : "unverified",
    errors
  };
}

function reportIdentity(item, index, path) {
  if (!item || typeof item !== "object") {
    return { error: validationIssue("identity-shape", `${path}[${index}]`, "Image identity must be an object.") };
  }
  const id = String(item.id ?? "").trim();
  const viewport = String(item.viewport ?? "").trim();
  const hash = String(item.sha256 ?? "").toLowerCase();
  if (!id || !viewport || !hashPattern.test(hash)) {
    return {
      error: validationIssue(
        "identity-shape",
        `${path}[${index}]`,
        "Image identity needs id, viewport, and SHA-256."
      )
    };
  }
  return { value: { id, viewport, sha256: hash } };
}

function identityProjection(items) {
  return sortIdentities(items.map((item) => ({
    id: item.id,
    viewport: item.viewport,
    sha256: item.sha256,
    capturedAt: "1970-01-01T00:00:00.000Z"
  }))).map(({ id, viewport, sha256 }) => ({ id, viewport, sha256 }));
}

function sameIdentities(actual, expected) {
  return canonicalJson(identityProjection(actual)) === canonicalJson(identityProjection(expected));
}

function normalizeComparison(item, index, requiredViewports, errors) {
  const path = `report.comparisons[${index}]`;
  if (!item || typeof item !== "object") {
    errors.push(validationIssue("comparison-shape", path, "Comparison entry must be an object."));
    return null;
  }
  const dimension = String(item.dimension ?? "");
  const status = String(item.status ?? "");
  const definition = dimensionById.get(dimension);
  if (!definition) {
    errors.push(validationIssue(
      "comparison-dimension",
      `${path}.dimension`,
      `Unknown comparison dimension: ${dimension || "(blank)"}.`
    ));
  }
  if (!comparisonStatuses.has(status)) {
    errors.push(validationIssue(
      "comparison-status",
      `${path}.status`,
      `Unknown comparison status: ${status || "(blank)"}.`
    ));
  }
  const severity = Number(item.severity);
  if (!Number.isInteger(severity) || severity < 0 || severity > 3) {
    errors.push(validationIssue(
      "comparison-severity",
      `${path}.severity`,
      "Comparison severity must be an integer from 0 to 3."
    ));
  } else if ((status === "aligned" || status === "not-verifiable") && severity !== 0) {
    errors.push(validationIssue(
      "comparison-severity-status",
      `${path}.severity`,
      `${status} comparisons must use severity 0.`
    ));
  } else if ((status === "partial" || status === "diverged") && severity < 1) {
    errors.push(validationIssue(
      "comparison-severity-status",
      `${path}.severity`,
      `${status} comparisons need severity 1, 2, or 3.`
    ));
  }
  const confidence = Number(item.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push(validationIssue(
      "comparison-confidence",
      `${path}.confidence`,
      "Comparison confidence must be between 0 and 1."
    ));
  }
  if (item.evidenceType !== "structured-vision") {
    errors.push(validationIssue(
      "semantic-evidence-type",
      `${path}.evidenceType`,
      "Semantic comparison entries must identify structured-vision evidence."
    ));
  }
  const viewports = unique(asArray(item.viewports).map(String).filter(Boolean)).sort(lexicalCompare);
  if (viewports.length === 0 || viewports.some((viewport) => !requiredViewports.includes(viewport))) {
    errors.push(validationIssue(
      "comparison-viewports",
      `${path}.viewports`,
      "Comparison viewports must be non-empty identities from the evidence binding."
    ));
  }
  if (
    dimension === "responsiveTransformation"
    && canonicalJson(viewports) !== canonicalJson([...requiredViewports].sort(lexicalCompare))
  ) {
    errors.push(validationIssue(
      "responsive-viewport-coverage",
      `${path}.viewports`,
      "Responsive transformation must assess every required viewport."
    ));
  }
  const referenceEvidence = String(item.referenceEvidence ?? "").trim();
  const buildEvidence = String(item.buildEvidence ?? "").trim();
  if (status !== "not-verifiable" && (referenceEvidence.length < 12 || buildEvidence.length < 12)) {
    errors.push(validationIssue(
      "visible-evidence",
      path,
      "Verifiable comparisons need specific visible evidence for both reference and build."
    ));
  }
  const divergence = String(item.divergence ?? "").trim();
  const impact = String(item.impact ?? "").trim();
  if ((status === "partial" || status === "diverged") && (!divergence || !impact)) {
    errors.push(validationIssue(
      "divergence-detail",
      path,
      "Partial and diverged comparisons need divergence and impact statements."
    ));
  }
  const limitation = String(item.limitation ?? "").trim();
  if (status === "not-verifiable" && !limitation) {
    errors.push(validationIssue(
      "comparison-limitation",
      `${path}.limitation`,
      "Not-verifiable comparisons need an explicit limitation."
    ));
  }
  return {
    dimension,
    status,
    severity,
    confidence,
    evidenceType: "structured-vision",
    viewports,
    referenceEvidence,
    buildEvidence,
    divergence,
    impact,
    limitation
  };
}

function validateReportTimestamps(report, binding, options, errors) {
  const path = "report.provenance.generatedAt";
  let generated;
  try {
    generated = timestamp(report.provenance?.generatedAt, path);
  } catch (error) {
    errors.push(validationIssue("critic-timestamp", path, error.message));
    return;
  }
  const newestEvidence = Math.max(
    Date.parse(binding.issuedAt),
    Date.parse(binding.contract.updatedAt),
    ...binding.referenceFrames.map((item) => Date.parse(item.capturedAt)),
    ...binding.buildCaptures.map((item) => Date.parse(item.capturedAt))
  );
  if (generated.milliseconds < newestEvidence) {
    errors.push(validationIssue(
      "stale-critic-report",
      path,
      "Critic report predates the bound contract, request, or image evidence."
    ));
  }
  if (options.evaluatedAt !== undefined) {
    let evaluated;
    try {
      evaluated = timestamp(options.evaluatedAt, "options.evaluatedAt");
    } catch (error) {
      errors.push(validationIssue("evaluation-timestamp", "options.evaluatedAt", error.message));
      return;
    }
    if (generated.milliseconds > evaluated.milliseconds) {
      errors.push(validationIssue(
        "future-critic-report",
        path,
        "Critic report timestamp is later than evaluatedAt."
      ));
    }
    if (
      options.maxAgeMs != null
      && Number.isFinite(Number(options.maxAgeMs))
      && evaluated.milliseconds - generated.milliseconds > Number(options.maxAgeMs)
    ) {
      errors.push(validationIssue(
        "expired-critic-report",
        path,
        "Critic report is older than the allowed evidence age."
      ));
    }
  }
}

export function validateReferenceVisionReport(report, binding, options = {}) {
  const bindingValidation = validateReferenceEvidenceBinding(binding);
  const errors = [...bindingValidation.errors];
  const warnings = [];
  if (!report || typeof report !== "object") {
    errors.push(validationIssue(
      "report-missing",
      "report",
      "A structured reference-vs-build vision report is required."
    ));
    return { valid: false, status: "unverified", errors, warnings, comparisons: [] };
  }
  if (report.schemaVersion !== "1.0") {
    errors.push(validationIssue(
      "report-schema",
      "report.schemaVersion",
      "Report schemaVersion must be 1.0."
    ));
  }
  if (report.method !== "structured-vision") {
    errors.push(validationIssue(
      "report-method",
      "report.method",
      "Reference-vs-build semantic comparison requires method=structured-vision."
    ));
  }
  if (report.evidence?.requestId !== binding?.requestId) {
    errors.push(validationIssue(
      "request-id-mismatch",
      "report.evidence.requestId",
      "Report requestId does not match the sealed evidence request."
    ));
  }
  if (
    String(report.evidence?.contractDigest ?? "").toLowerCase()
    !== String(binding?.contract?.digest ?? "").toLowerCase()
  ) {
    errors.push(validationIssue(
      "contract-digest-mismatch",
      "report.evidence.contractDigest",
      "Report contract digest does not match DESIGN.md/reference-contract evidence."
    ));
  }

  const reportReferenceFrames = [];
  for (const [index, item] of asArray(report.evidence?.referenceFrames).entries()) {
    const normalized = reportIdentity(item, index, "report.evidence.referenceFrames");
    if (normalized.error) errors.push(normalized.error);
    else reportReferenceFrames.push(normalized.value);
  }
  if (!sameIdentities(reportReferenceFrames, binding?.referenceFrames ?? [])) {
    errors.push(validationIssue(
      "reference-image-mismatch",
      "report.evidence.referenceFrames",
      "Reference image hashes or viewport identities do not match the binding."
    ));
  }

  const reportBuildCaptures = [];
  for (const [index, item] of asArray(report.evidence?.buildCaptures).entries()) {
    const normalized = reportIdentity(item, index, "report.evidence.buildCaptures");
    if (normalized.error) errors.push(normalized.error);
    else reportBuildCaptures.push(normalized.value);
  }
  if (!sameIdentities(reportBuildCaptures, binding?.buildCaptures ?? [])) {
    errors.push(validationIssue(
      "build-image-mismatch",
      "report.evidence.buildCaptures",
      "Build image hashes or viewport identities do not match the binding."
    ));
  }

  const reviewedViewports = unique(
    asArray(report.viewportsReviewed).map(String).filter(Boolean)
  ).sort(lexicalCompare);
  if (canonicalJson(reviewedViewports) !== canonicalJson(binding?.requiredViewports ?? [])) {
    errors.push(validationIssue(
      "viewport-review-mismatch",
      "report.viewportsReviewed",
      "Report must review every bound viewport identity and no unbound viewport."
    ));
  }

  if (!String(report.provenance?.critic ?? "").trim()) {
    errors.push(validationIssue(
      "critic-provenance",
      "report.provenance.critic",
      "Critic identity is required."
    ));
  }
  if (!String(report.provenance?.model ?? "").trim()) {
    errors.push(validationIssue(
      "critic-model",
      "report.provenance.model",
      "Vision model identity is required."
    ));
  }
  if (report.provenance?.visionCapable !== true) {
    errors.push(validationIssue(
      "vision-capability",
      "report.provenance.visionCapable",
      "Critic must attest that it inspected the supplied images."
    ));
  }
  if (report.provenance?.independentOfImplementation !== true) {
    errors.push(validationIssue(
      "critic-independence",
      "report.provenance.independentOfImplementation",
      "Critic must be independent of implementation and repair execution."
    ));
  }
  const allowedCritics = binding?.criticRequirements?.allowedCritics ?? [];
  if (
    allowedCritics.length > 0
    && !allowedCritics.includes(String(report.provenance?.critic ?? "").trim())
  ) {
    errors.push(validationIssue(
      "critic-identity-mismatch",
      "report.provenance.critic",
      "Critic identity is not permitted by the sealed evidence binding."
    ));
  }
  const allowedModels = binding?.criticRequirements?.allowedModels ?? [];
  if (
    allowedModels.length > 0
    && !allowedModels.includes(String(report.provenance?.model ?? "").trim())
  ) {
    errors.push(validationIssue(
      "critic-model-mismatch",
      "report.provenance.model",
      "Vision model identity is not permitted by the sealed evidence binding."
    ));
  }
  if (bindingValidation.valid) {
    validateReportTimestamps(report, binding, {
      ...options,
      maxAgeMs: options.maxAgeMs ?? binding.criticRequirements.maxAgeMs
    }, errors);
  }

  const coverage = new Map();
  for (const [index, entry] of asArray(report.rubricCoverage).entries()) {
    const id = String(entry?.id ?? "").trim();
    const evidence = String(entry?.evidence ?? "").trim();
    if (!id || evidence.length < 12) {
      errors.push(validationIssue(
        "rubric-coverage-shape",
        `report.rubricCoverage[${index}]`,
        "Every rubric coverage entry needs an id and specific evidence."
      ));
      continue;
    }
    if (coverage.has(id)) {
      errors.push(validationIssue(
        "rubric-coverage-duplicate",
        `report.rubricCoverage[${index}].id`,
        `Duplicate rubric coverage entry: ${id}.`
      ));
    }
    coverage.set(id, entry);
  }
  const missingRubrics = (binding?.rubricIds ?? []).filter((id) => !coverage.has(id));
  if (missingRubrics.length > 0) {
    errors.push(validationIssue(
      "rubric-coverage-missing",
      "report.rubricCoverage",
      `Report is missing required rubric coverage: ${missingRubrics.join(", ")}.`
    ));
  }

  const comparisons = asArray(report.comparisons)
    .map((item, index) =>
      normalizeComparison(item, index, binding?.requiredViewports ?? [], errors)
    )
    .filter(Boolean);
  const counts = new Map();
  for (const comparison of comparisons) {
    counts.set(comparison.dimension, (counts.get(comparison.dimension) ?? 0) + 1);
  }
  const missingDimensions = REFERENCE_COMPARISON_DIMENSIONS
    .map((dimension) => dimension.id)
    .filter((id) => !counts.has(id));
  const duplicateDimensions = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  if (missingDimensions.length > 0) {
    errors.push(validationIssue(
      "comparison-dimensions-missing",
      "report.comparisons",
      `Report is missing comparison dimensions: ${missingDimensions.join(", ")}.`
    ));
  }
  if (duplicateDimensions.length > 0) {
    errors.push(validationIssue(
      "comparison-dimensions-duplicate",
      "report.comparisons",
      `Report repeats comparison dimensions: ${duplicateDimensions.join(", ")}.`
    ));
  }
  if (!Array.isArray(report.limitations)) {
    errors.push(validationIssue(
      "report-limitations",
      "report.limitations",
      "Report limitations must be an array, even when empty."
    ));
  }

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? "verified-report" : "unverified",
    errors,
    warnings,
    comparisons
  };
}

function normalizeSupportingMetrics(metrics, knownViewports) {
  const accepted = [];
  const warnings = [];
  for (const [index, metric] of asArray(metrics).entries()) {
    const path = `supportingMetrics[${index}]`;
    if (!metric || typeof metric !== "object") {
      warnings.push(validationIssue(
        "metric-ignored",
        path,
        "Supporting metric was ignored because it is not an object."
      ));
      continue;
    }
    const id = String(metric.id ?? metric.metric ?? "").trim();
    const viewport = String(metric.viewport ?? "").trim();
    const referenceValue = Number(metric.referenceValue);
    const buildValue = Number(metric.buildValue);
    if (
      !id
      || !knownViewports.includes(viewport)
      || !Number.isFinite(referenceValue)
      || !Number.isFinite(buildValue)
    ) {
      warnings.push(validationIssue(
        "metric-ignored",
        path,
        "Supporting metric needs a bound viewport and finite reference/build values."
      ));
      continue;
    }
    accepted.push({
      id,
      viewport,
      referenceValue,
      buildValue,
      delta: Number((buildValue - referenceValue).toFixed(6)),
      unit: String(metric.unit ?? ""),
      source: String(metric.source ?? "pixel-or-numeric"),
      evidenceRole: "supporting-only",
      influencesSemanticVerdict: false,
      mayTriggerRepair: false
    });
  }
  return { accepted, warnings };
}

function findingFromComparison(comparison, critic) {
  const definition = dimensionById.get(comparison.dimension);
  return {
    id: `reference-divergence:${comparison.dimension}`,
    fingerprint: `reference:${comparison.dimension}:${comparison.viewports.join("+")}`,
    critic,
    rubricCheck: `reference-${comparison.dimension}`,
    category: definition.category,
    severity: comparison.severity,
    blocker: comparison.severity === 3,
    confidence: comparison.confidence,
    stage: "reference-vs-build",
    viewports: [...comparison.viewports],
    viewport: comparison.viewports.length === 1 ? comparison.viewports[0] : null,
    region: "whole-page relationship",
    message: `The build ${comparison.status === "partial" ? "partially diverges" : "diverges"} from the selected reference contract in ${definition.label}.`,
    evidence: `Reference: ${comparison.referenceEvidence} Build: ${comparison.buildEvidence}`,
    impact: comparison.impact,
    divergence: comparison.divergence,
    repairKind: definition.repairKind,
    sourceEvidence: "structured-vision",
    supportingMetricsUsed: false,
    recommendedChange: null,
    repairClaim: null,
    repairStatus: "not-evaluated"
  };
}

function unverifiedResult(validation, supporting, reason) {
  return {
    schemaVersion: "1.0",
    status: "unverified",
    verdict: "unverified",
    evidence: {
      valid: false,
      errors: validation.errors,
      warnings: [...validation.warnings, ...supporting.warnings]
    },
    semanticComparison: null,
    comparisons: [],
    findings: [],
    supportingMetrics: {
      evidenceRole: "supporting-only",
      policy: roleOnlyMessage,
      observations: supporting.accepted
    },
    repair: {
      status: "not-evaluated",
      automaticClaim: false
    },
    claim: reason
  };
}

export function compareReferenceToBuild({
  binding,
  report,
  supportingMetrics = [],
  evaluatedAt,
  maxAgeMs
} = {}) {
  const knownViewports = Array.isArray(binding?.requiredViewports)
    ? binding.requiredViewports
    : [];
  const supporting = normalizeSupportingMetrics(supportingMetrics, knownViewports);
  const validation = validateReferenceVisionReport(report, binding, {
    evaluatedAt,
    maxAgeMs
  });
  if (!validation.valid) {
    return unverifiedResult(
      validation,
      supporting,
      "Reference-vs-build judgment is refused because the image, viewport, contract, rubric, timestamp, or critic evidence is missing, stale, or mismatched."
    );
  }

  const unverifiable = validation.comparisons.filter(
    (comparison) => comparison.status === "not-verifiable"
  );
  const divergenceComparisons = validation.comparisons.filter(
    (comparison) => comparison.status === "partial" || comparison.status === "diverged"
  );
  const findings = divergenceComparisons.map((comparison) =>
    findingFromComparison(comparison, report.provenance.critic)
  );
  const counts = Object.fromEntries(
    [...comparisonStatuses].sort(lexicalCompare).map((status) => [
      status,
      validation.comparisons.filter((comparison) => comparison.status === status).length
    ])
  );
  const complete = unverifiable.length === 0;
  const verdict = complete
    ? findings.length > 0
      ? "diverged"
      : "aligned"
    : "unverified";

  return {
    schemaVersion: "1.0",
    status: complete ? "verified-comparison" : "unverified",
    verdict,
    evidence: {
      valid: true,
      requestId: binding.requestId,
      contractDigest: binding.contract.digest,
      critic: {
        id: report.provenance.critic,
        model: report.provenance.model,
        generatedAt: new Date(Date.parse(report.provenance.generatedAt)).toISOString(),
        visionCapable: true,
        independentOfImplementation: true
      },
      rubricIds: [...binding.rubricIds],
      viewports: [...binding.requiredViewports],
      errors: [],
      warnings: [...validation.warnings, ...supporting.warnings]
    },
    semanticComparison: {
      complete,
      method: "structured-vision",
      counts,
      dimensionsReviewed: validation.comparisons.map((comparison) => comparison.dimension),
      notVerifiable: unverifiable.map((comparison) => ({
        dimension: comparison.dimension,
        limitation: comparison.limitation
      }))
    },
    comparisons: validation.comparisons,
    findings,
    supportingMetrics: {
      evidenceRole: "supporting-only",
      policy: roleOnlyMessage,
      observations: supporting.accepted
    },
    repair: {
      status: "not-evaluated",
      automaticClaim: false
    },
    claim: complete
      ? findings.length > 0
        ? "Structured screenshot vision found reference-contract divergences. This comparison does not prescribe or verify a repair and is not an absolute quality judgment."
        : "Structured screenshot vision found no divergence within the bound dimensions. This is not proof of pixel identity, automatic acceptance, or repair completion."
      : "The bound report contains one or more explicitly not-verifiable dimensions, so complete reference alignment is not established."
  };
}
