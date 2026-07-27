import assert from "node:assert/strict";
import test from "node:test";

import {
  REFERENCE_COMPARISON_DIMENSIONS,
  compareReferenceToBuild,
  createReferenceEvidenceBinding,
  digestReferenceContract,
  validateReferenceEvidenceBinding,
  validateReferenceVisionReport
} from "../packages/visual-evaluator/src/index.mjs";

const hashes = {
  referenceDesktop: "a".repeat(64),
  referenceMobile: "b".repeat(64),
  buildDesktop: "c".repeat(64),
  buildMobile: "d".repeat(64)
};

function bindingFixture() {
  return createReferenceEvidenceBinding({
    contract: {
      id: "orbit-as-schedule",
      source: "DESIGN.md",
      content: "# Direction\nThe event route is also the booking schedule.\n",
      updatedAt: "2026-07-23T09:55:00.000Z",
      expectations: {
        composition: "One orbital route must organize the title, session timing, and primary action.",
        hierarchy: "The orbit, current session, and booking action form the first three reading beats.",
        typographyRoles: "Display type names the place; utility type labels sessions; data type carries time and price.",
        colorMaterialRelationships: "Chrome belongs to the route and action while deep plum remains quiet.",
        objectPlacement: "Every timing node sits on the orbital path instead of floating beside it.",
        sectionRhythm: "The single circuit moves from arrival through session selection to venue details.",
        spacingGeometry: "Viewport-relative whitespace bands and section heights preserve the orbital reading cadence.",
        headlineWrapping: "The display headline keeps its authored breaks, measure, and line count at each viewport.",
        assetCrop: "The orbital route keeps the same visible silhouette, focal crossing, and edge exits.",
        responsiveTransformation: "The wide orbit becomes a tall racetrack while preserving timing order and booking state."
      }
    },
    referenceFrames: [
      {
        id: "reference-mobile",
        viewport: "mobile",
        sha256: hashes.referenceMobile,
        capturedAt: "2026-07-23T10:00:00.000Z",
        width: 390,
        height: 844
      },
      {
        id: "reference-desktop",
        viewport: "desktop",
        sha256: hashes.referenceDesktop,
        capturedAt: "2026-07-23T10:00:00.000Z",
        width: 1440,
        height: 1000
      }
    ],
    buildCaptures: [
      {
        id: "build-mobile",
        viewport: "mobile",
        sha256: hashes.buildMobile,
        capturedAt: "2026-07-23T10:03:00.000Z",
        width: 390,
        height: 844
      },
      {
        id: "build-desktop",
        viewport: "desktop",
        sha256: hashes.buildDesktop,
        capturedAt: "2026-07-23T10:03:00.000Z",
        width: 1440,
        height: 1000
      }
    ],
    requiredViewports: ["desktop", "mobile"],
    rubricIds: ["responsive", "art-direction", "design-dna-consistency"],
    criticRequirements: {
      allowedCritics: ["independent-reference-director"],
      allowedModels: ["fixture-vision-model"]
    },
    issuedAt: "2026-07-23T10:05:00.000Z"
  });
}

function comparisonEntry(dimension, overrides = {}) {
  const responsive = dimension === "responsiveTransformation";
  return {
    dimension,
    status: "aligned",
    severity: 0,
    confidence: 0.91,
    evidenceType: "structured-vision",
    viewports: responsive ? ["desktop", "mobile"] : ["desktop"],
    referenceEvidence: `The reference visibly defines ${dimension} through the orbital route.`,
    buildEvidence: `The build visibly preserves the same ${dimension} relationship.`,
    divergence: "",
    impact: "",
    limitation: "",
    ...overrides
  };
}

function reportFixture(binding = bindingFixture()) {
  const comparisons = REFERENCE_COMPARISON_DIMENSIONS.map((dimension) =>
    comparisonEntry(dimension.id)
  );
  const compositionIndex = comparisons.findIndex((entry) => entry.dimension === "composition");
  comparisons[compositionIndex] = comparisonEntry("composition", {
    status: "diverged",
    severity: 2,
    confidence: 0.94,
    referenceEvidence: "The reference orbit crosses the title and terminates at the booking action.",
    buildEvidence: "The build orbit sits beneath the title and no longer determines the action position.",
    divergence: "The organizing object became a decorative background ring.",
    impact: "The signature spatial relationship and first-screen silhouette are weakened."
  });
  const typographyIndex = comparisons.findIndex((entry) => entry.dimension === "typographyRoles");
  comparisons[typographyIndex] = comparisonEntry("typographyRoles", {
    status: "partial",
    severity: 1,
    confidence: 0.88,
    referenceEvidence: "Reference utility labels and time numerals have visibly separate type roles.",
    buildEvidence: "Build times retain contrast, but session labels use the same display treatment as the title.",
    divergence: "The utility role is visually absorbed into the display voice.",
    impact: "Session scanning is slower and the title loses exclusivity."
  });

  return {
    schemaVersion: "1.0",
    method: "structured-vision",
    evidence: {
      requestId: binding.requestId,
      contractDigest: binding.contract.digest,
      referenceFrames: binding.referenceFrames.map(({ id, viewport, sha256 }) => ({
        id,
        viewport,
        sha256
      })),
      buildCaptures: binding.buildCaptures.map(({ id, viewport, sha256 }) => ({
        id,
        viewport,
        sha256
      }))
    },
    viewportsReviewed: ["desktop", "mobile"],
    provenance: {
      critic: "independent-reference-director",
      model: "fixture-vision-model",
      generatedAt: "2026-07-23T10:06:00.000Z",
      visionCapable: true,
      independentOfImplementation: true
    },
    rubricCoverage: binding.rubricIds.map((id) => ({
      id,
      evidence: `${id} was assessed against every bound viewport and the reference contract.`
    })),
    comparisons,
    limitations: []
  };
}

function alignedReport(binding = bindingFixture()) {
  const report = reportFixture(binding);
  report.comparisons = REFERENCE_COMPARISON_DIMENSIONS.map((dimension) =>
    comparisonEntry(dimension.id)
  );
  return report;
}

test("contract digests are deterministic across key order and text line endings", () => {
  assert.equal(
    digestReferenceContract({ b: 2, a: { d: 4, c: 3 } }),
    digestReferenceContract({ a: { c: 3, d: 4 }, b: 2 })
  );
  assert.equal(
    digestReferenceContract("# Direction\r\nOne orbit.\r\n"),
    digestReferenceContract("# Direction\nOne orbit.\n")
  );
});

test("evidence binding seals sorted image identities, contract digest, viewports, rubrics, and timestamps", () => {
  const first = bindingFixture();
  const second = bindingFixture();
  assert.deepEqual(first, second);
  assert.match(first.requestId, /^reference-build-[a-f0-9]{24}$/);
  assert.deepEqual(first.referenceFrames.map((frame) => frame.viewport), ["desktop", "mobile"]);
  assert.deepEqual(first.buildCaptures.map((frame) => frame.viewport), ["desktop", "mobile"]);
  assert.deepEqual(first.rubricIds, ["art-direction", "design-dna-consistency", "responsive"]);
  assert.equal(validateReferenceEvidenceBinding(first).valid, true);
});

test("binding refuses a contract digest that does not match supplied DESIGN content", () => {
  const valid = bindingFixture();
  assert.throws(
    () => createReferenceEvidenceBinding({
      contract: {
        ...valid.contract,
        content: "Different contract content.",
        digest: "e".repeat(64)
      },
      referenceFrames: valid.referenceFrames,
      buildCaptures: valid.buildCaptures,
      requiredViewports: valid.requiredViewports,
      rubricIds: valid.rubricIds,
      issuedAt: valid.issuedAt
    }),
    /does not match contract\.content/
  );
});

test("a complete bound vision report produces dimension-specific divergence findings", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  const validation = validateReferenceVisionReport(report, binding, {
    evaluatedAt: "2026-07-23T10:10:00.000Z"
  });
  assert.equal(validation.valid, true);

  const result = compareReferenceToBuild({
    binding,
    report,
    evaluatedAt: "2026-07-23T10:10:00.000Z"
  });
  assert.equal(result.status, "verified-comparison");
  assert.equal(result.verdict, "diverged");
  assert.equal(result.semanticComparison.complete, true);
  assert.deepEqual(
    result.semanticComparison.dimensionsReviewed,
    REFERENCE_COMPARISON_DIMENSIONS.map((dimension) => dimension.id)
  );
  assert.deepEqual(result.findings.map((finding) => finding.category), [
    "composition",
    "typography"
  ]);
  assert.ok(result.findings.every((finding) =>
    finding.sourceEvidence === "structured-vision"
    && finding.repairClaim === null
    && finding.repairStatus === "not-evaluated"
    && finding.supportingMetricsUsed === false
  ));
});

test("an aligned report is a bounded comparison, not automatic acceptance or repair proof", () => {
  const binding = bindingFixture();
  const result = compareReferenceToBuild({
    binding,
    report: alignedReport(binding),
    evaluatedAt: "2026-07-23T10:10:00.000Z"
  });
  assert.equal(result.status, "verified-comparison");
  assert.equal(result.verdict, "aligned");
  assert.deepEqual(result.findings, []);
  assert.match(result.claim, /not proof of pixel identity, automatic acceptance, or repair completion/i);
  assert.deepEqual(result.repair, { status: "not-evaluated", automaticClaim: false });
});

test("mismatched reference image hash refuses semantic comparison", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.evidence.referenceFrames[0].sha256 = "f".repeat(64);
  const result = compareReferenceToBuild({ binding, report });
  assert.equal(result.status, "unverified");
  assert.equal(result.verdict, "unverified");
  assert.equal(result.semanticComparison, null);
  assert.deepEqual(result.findings, []);
  assert.ok(result.evidence.errors.some((error) => error.code === "reference-image-mismatch"));
});

test("mismatched build image and viewport identities refuse semantic comparison", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.evidence.buildCaptures[0].sha256 = "1".repeat(64);
  report.viewportsReviewed = ["desktop", "tablet"];
  const result = compareReferenceToBuild({ binding, report });
  const codes = result.evidence.errors.map((error) => error.code);
  assert.ok(codes.includes("build-image-mismatch"));
  assert.ok(codes.includes("viewport-review-mismatch"));
  assert.deepEqual(result.findings, []);
});

test("contract digest and request id mismatches are unverified", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.evidence.contractDigest = "2".repeat(64);
  report.evidence.requestId = "stale-request";
  const result = compareReferenceToBuild({ binding, report });
  const codes = result.evidence.errors.map((error) => error.code);
  assert.ok(codes.includes("contract-digest-mismatch"));
  assert.ok(codes.includes("request-id-mismatch"));
});

test("critic provenance must be vision-capable, independent, and newer than every bound artifact", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.provenance.generatedAt = "2026-07-23T10:01:00.000Z";
  report.provenance.visionCapable = false;
  report.provenance.independentOfImplementation = false;
  report.provenance.critic = "implementation-agent";
  report.provenance.model = "unknown-model";
  const result = compareReferenceToBuild({ binding, report });
  const codes = result.evidence.errors.map((error) => error.code);
  assert.ok(codes.includes("stale-critic-report"));
  assert.ok(codes.includes("vision-capability"));
  assert.ok(codes.includes("critic-independence"));
  assert.ok(codes.includes("critic-identity-mismatch"));
  assert.ok(codes.includes("critic-model-mismatch"));
  assert.deepEqual(result.findings, []);
});

test("evidence age and future timestamps are evaluated against an explicit deterministic clock", () => {
  const binding = bindingFixture();
  const expired = compareReferenceToBuild({
    binding,
    report: reportFixture(binding),
    evaluatedAt: "2026-07-23T12:06:00.000Z",
    maxAgeMs: 60 * 60 * 1000
  });
  assert.ok(expired.evidence.errors.some((error) => error.code === "expired-critic-report"));

  const futureReport = reportFixture(binding);
  futureReport.provenance.generatedAt = "2026-07-23T11:00:00.000Z";
  const future = compareReferenceToBuild({
    binding,
    report: futureReport,
    evaluatedAt: "2026-07-23T10:10:00.000Z"
  });
  assert.ok(future.evidence.errors.some((error) => error.code === "future-critic-report"));
});

test("missing rubric coverage or a comparison dimension makes the report unverified", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.rubricCoverage = report.rubricCoverage.filter((entry) => entry.id !== "responsive");
  report.comparisons = report.comparisons.filter(
    (entry) => entry.dimension !== "sectionRhythm"
  );
  const result = compareReferenceToBuild({ binding, report });
  const codes = result.evidence.errors.map((error) => error.code);
  assert.ok(codes.includes("rubric-coverage-missing"));
  assert.ok(codes.includes("comparison-dimensions-missing"));
  assert.deepEqual(result.findings, []);
});

test("responsive transformation must cover every bound viewport", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  const responsive = report.comparisons.find(
    (entry) => entry.dimension === "responsiveTransformation"
  );
  responsive.viewports = ["mobile"];
  const result = compareReferenceToBuild({ binding, report });
  assert.ok(result.evidence.errors.some((error) =>
    error.code === "responsive-viewport-coverage"
  ));
});

test("an explicit not-verifiable dimension prevents complete alignment without erasing valid divergences", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  const material = report.comparisons.find(
    (entry) => entry.dimension === "colorMaterialRelationships"
  );
  Object.assign(material, {
    status: "not-verifiable",
    severity: 0,
    referenceEvidence: "",
    buildEvidence: "",
    limitation: "The reference crop does not show enough quiet surface area to compare the material budget."
  });
  const result = compareReferenceToBuild({ binding, report });
  assert.equal(result.evidence.valid, true);
  assert.equal(result.status, "unverified");
  assert.equal(result.verdict, "unverified");
  assert.equal(result.semanticComparison.complete, false);
  assert.deepEqual(
    result.semanticComparison.notVerifiable.map((entry) => entry.dimension),
    ["colorMaterialRelationships"]
  );
  assert.ok(result.findings.some((finding) => finding.category === "composition"));
});

test("pixel and numeric metrics remain supporting-only and cannot create or erase semantic divergence", () => {
  const binding = bindingFixture();
  const report = alignedReport(binding);
  const withoutMetrics = compareReferenceToBuild({ binding, report });
  const withMetrics = compareReferenceToBuild({
    binding,
    report,
    supportingMetrics: [
      {
        id: "visual-center-x",
        viewport: "desktop",
        referenceValue: 0.2,
        buildValue: 0.92,
        unit: "normalized",
        source: "pixel-analysis"
      },
      {
        id: "edge-density",
        viewport: "mobile",
        referenceValue: 0.01,
        buildValue: 0.95,
        source: "pixel-analysis"
      }
    ]
  });
  assert.equal(withMetrics.verdict, withoutMetrics.verdict);
  assert.deepEqual(withMetrics.findings, withoutMetrics.findings);
  assert.equal(withMetrics.supportingMetrics.observations.length, 2);
  assert.ok(withMetrics.supportingMetrics.observations.every((metric) =>
    metric.evidenceRole === "supporting-only"
    && metric.influencesSemanticVerdict === false
    && metric.mayTriggerRepair === false
  ));
  assert.match(withMetrics.supportingMetrics.policy, /do not alter semantic findings/i);
});

test("invalid supporting metrics are ignored with warnings rather than promoted to judgments", () => {
  const binding = bindingFixture();
  const result = compareReferenceToBuild({
    binding,
    report: alignedReport(binding),
    supportingMetrics: [
      { id: "blank-bands", viewport: "tablet", referenceValue: 1, buildValue: 99 },
      { id: "visual-center", viewport: "desktop", referenceValue: "unknown", buildValue: 0.5 }
    ]
  });
  assert.equal(result.verdict, "aligned");
  assert.deepEqual(result.findings, []);
  assert.equal(result.supportingMetrics.observations.length, 0);
  assert.equal(
    result.evidence.warnings.filter((warning) => warning.code === "metric-ignored").length,
    2
  );
});

test("tampering with a sealed binding invalidates subsequent reports", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  binding.buildCaptures[0].sha256 = "9".repeat(64);
  const bindingValidation = validateReferenceEvidenceBinding(binding);
  assert.equal(bindingValidation.valid, false);
  assert.ok(bindingValidation.errors.some((error) => error.code === "binding-tampered"));
  const result = compareReferenceToBuild({ binding, report });
  assert.equal(result.status, "unverified");
  assert.deepEqual(result.findings, []);
});

test("malformed semantic severity cannot be rescued by otherwise complete evidence", () => {
  const binding = bindingFixture();
  const report = reportFixture(binding);
  report.comparisons[0].severity = 7;
  const result = compareReferenceToBuild({ binding, report });
  assert.equal(result.status, "unverified");
  assert.ok(result.evidence.errors.some((error) => error.code === "comparison-severity"));
  assert.deepEqual(result.findings, []);
});
