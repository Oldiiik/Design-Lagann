import path from "node:path";

import { exists, readJson, writeJson } from "../../shared/src/index.mjs";
import {
  bindExternalDesktopOrientationImages,
  bindExternalOrientationImages,
  bindSelectedMobileOrientationImage,
  createOptimizedVisualOrientationPlan,
  createVisualOrientationPlan,
  finalizeOptimizedVisualOrientation,
  selectDesktopVisualOrientation,
  selectVisualOrientation,
  validateDesktopOrientationCriticReport,
  validateOrientationCriticReport,
  validateSelectedPairCriticReport,
  verifyBoundDesktopOrientationImages,
  verifyOptimizedSelectedPairImages,
  verifyBoundOrientationImages
} from "../../visual-orienter/src/index.mjs";
import {
  REFERENCE_COMPARISON_DIMENSIONS,
  compareReferenceToBuild,
  createReferenceEvidenceBinding
} from "../../visual-evaluator/src/reference-comparison.mjs";

export function visualOrientationPaths(projectRoot) {
  const root = path.resolve(projectRoot);
  const stateDir = path.join(root, ".design-lagann");
  const orientationDir = path.join(stateDir, "visual-orientation");
  return {
    root,
    stateDir,
    orientationDir,
    plan: path.join(orientationDir, "plan.json"),
    evidence: path.join(orientationDir, "evidence-binding.json"),
    criticReport: path.join(orientationDir, "critic-report.json"),
    selection: path.join(orientationDir, "selection.json"),
    visualReference: path.join(orientationDir, "visual-reference.json"),
    selectedVisualReference: path.join(orientationDir, "selected-visual-reference.json"),
    optimizedPlan: path.join(orientationDir, "optimized-plan.json"),
    optimizedDesktopEvidence: path.join(orientationDir, "optimized-desktop-evidence-binding.json"),
    optimizedDesktopCriticReport: path.join(orientationDir, "optimized-desktop-critic-report.json"),
    optimizedDesktopSelection: path.join(orientationDir, "optimized-desktop-selection.json"),
    optimizedSelectedPairEvidence: path.join(orientationDir, "optimized-selected-pair-evidence-binding.json"),
    optimizedPairCriticReport: path.join(orientationDir, "optimized-selected-pair-critic-report.json"),
    optimizedSelection: path.join(orientationDir, "optimized-selection.json"),
    referenceBinding: path.join(orientationDir, "reference-build-binding.json"),
    referenceCriticReport: path.join(orientationDir, "reference-build-critic-report.json"),
    referenceComparison: path.join(orientationDir, "reference-build-comparison.json")
  };
}

async function readRequired(target, label) {
  if (!(await exists(target))) throw new Error(`${label} is missing at ${target}`);
  return readJson(target);
}

async function resolveBrief(paths, supplied) {
  if (supplied) return supplied;
  return readRequired(path.join(paths.stateDir, "brief.json"), "Project brief");
}

async function resolveProjectDna(paths, supplied) {
  if (supplied) return supplied;
  const target = path.join(paths.stateDir, "project-design-dna.json");
  return await exists(target) ? readJson(target) : {};
}

export async function createOrientationPlan({
  projectRoot,
  brief,
  projectDna,
  candidateCount,
  humanApproval
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedBrief = await resolveBrief(paths, brief);
  const resolvedDna = await resolveProjectDna(paths, projectDna);
  const plan = createVisualOrientationPlan(resolvedBrief, resolvedDna, {
    ...(candidateCount === undefined ? {} : { candidateCount: Number(candidateCount) }),
    ...(humanApproval ? { humanApproval } : {})
  });
  await writeJson(paths.plan, plan);
  return {
    phase: "external-image-generation-required",
    artifact: paths.plan,
    plan,
    generationPerformed: false,
    message: "Orientation prompts were emitted and persisted. Generate every desktop/mobile mockup externally with GPT Image 2, then bind the returned local files; Design Lagann did not call an image model."
  };
}

export async function createOptimizedOrientationPlan({
  projectRoot,
  brief,
  projectDna,
  candidateCount,
  humanApproval
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedBrief = await resolveBrief(paths, brief);
  const resolvedDna = await resolveProjectDna(paths, projectDna);
  const plan = createOptimizedVisualOrientationPlan(resolvedBrief, resolvedDna, {
    ...(candidateCount === undefined ? {} : { candidateCount: Number(candidateCount) }),
    ...(humanApproval ? { humanApproval } : {})
  });
  const inProgressSelection = {
    schemaVersion: "0.5.0",
    kind: "optimized-visual-orientation-selection",
    status: "orientation-in-progress",
    stage: "desktop-candidate-generation",
    planId: plan.id,
    recommendedCandidateId: null,
    selectedCandidateId: null,
    humanApproval: { status: "pending" },
    acceptanceGranted: false
  };
  await Promise.all([
    writeJson(paths.optimizedPlan, plan),
    writeJson(paths.plan, plan),
    writeJson(paths.selection, inProgressSelection)
  ]);
  return {
    phase: "external-desktop-image-generation-required",
    artifact: paths.optimizedPlan,
    plan,
    generationPerformed: false,
    message: "Generate and bind one desktop frame for every candidate. Mobile prompts are committed but deferred; Design Lagann will authorize only the human-approved candidate's mobile frame."
  };
}

export async function bindOptimizedDesktopOrientationImages({
  projectRoot,
  submissions,
  plan
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan ||
    await readRequired(paths.optimizedPlan, "Optimized visual orientation plan");
  const evidence = await bindExternalDesktopOrientationImages(
    resolvedPlan,
    submissions,
    { projectRoot: paths.root }
  );
  await writeJson(paths.optimizedDesktopEvidence, evidence);
  return {
    phase: "independent-desktop-orientation-critique-required",
    artifact: paths.optimizedDesktopEvidence,
    evidence,
    generationPerformed: false,
    message: "Every desktop candidate is prompt- and hash-bound. Obtain one independent structured desktop-stage critic report; it must acknowledge that no mobile images were reviewed."
  };
}

export async function evaluateOptimizedDesktopOrientation({
  projectRoot,
  report,
  humanApproval,
  plan,
  evidence
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan ||
    await readRequired(paths.optimizedPlan, "Optimized visual orientation plan");
  const resolvedEvidence = evidence ||
    await readRequired(paths.optimizedDesktopEvidence, "Optimized desktop evidence binding");
  const resolvedReport = report ||
    await readRequired(paths.optimizedDesktopCriticReport, "Optimized desktop critic report");
  validateDesktopOrientationCriticReport(resolvedReport, {
    plan: resolvedPlan,
    evidence: resolvedEvidence
  });
  const selection = await selectDesktopVisualOrientation({
    plan: resolvedPlan,
    evidence: resolvedEvidence,
    report: resolvedReport,
    humanApproval: humanApproval || resolvedPlan.humanApproval,
    projectRoot: paths.root
  });
  await Promise.all([
    writeJson(paths.optimizedDesktopCriticReport, resolvedReport),
    writeJson(paths.optimizedDesktopSelection, selection),
    writeJson(paths.selection, selection)
  ]);
  return {
    phase: selection.status === "human-approved"
      ? "selected-mobile-image-generation-required"
      : selection.status === "awaiting-human-approval"
        ? "human-approval-required-before-mobile"
        : selection.status === "human-rejected"
          ? "visual-orientation-rejected-before-mobile"
          : "optimized-orientation-refused",
    artifacts: {
      report: paths.optimizedDesktopCriticReport,
      selection: paths.optimizedDesktopSelection,
      selectedVisualReference: null
    },
    selection,
    generationPerformed: false,
    message: selection.status === "human-approved"
      ? "Generate only selection.mobileGenerationRequest. Desktop selection is not a selected visual reference and grants no implementation acceptance."
      : "No mobile generation is authorized until an eligible desktop direction is explicitly approved."
  };
}

export async function bindOptimizedSelectedMobileOrientation({
  projectRoot,
  submission,
  plan,
  desktopEvidence,
  desktopSelection
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan ||
    await readRequired(paths.optimizedPlan, "Optimized visual orientation plan");
  const resolvedDesktopEvidence = desktopEvidence ||
    await readRequired(paths.optimizedDesktopEvidence, "Optimized desktop evidence binding");
  const resolvedDesktopSelection = desktopSelection ||
    await readRequired(paths.optimizedDesktopSelection, "Optimized desktop selection");
  const evidence = await bindSelectedMobileOrientationImage({
    plan: resolvedPlan,
    desktopEvidence: resolvedDesktopEvidence,
    desktopSelection: resolvedDesktopSelection,
    submission,
    projectRoot: paths.root
  });
  await writeJson(paths.optimizedSelectedPairEvidence, evidence);
  return {
    phase: "independent-selected-pair-critique-required",
    artifact: paths.optimizedSelectedPairEvidence,
    evidence,
    generationPerformed: false,
    message: "The selected desktop/mobile pair is prompt-, hash-, timestamp-, and selection-bound. It is still not a selected reference until an independent pair critic approves it."
  };
}

export async function finalizeOptimizedOrientation({
  projectRoot,
  report,
  plan,
  desktopEvidence,
  desktopSelection,
  evidence
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan ||
    await readRequired(paths.optimizedPlan, "Optimized visual orientation plan");
  const resolvedDesktopEvidence = desktopEvidence ||
    await readRequired(paths.optimizedDesktopEvidence, "Optimized desktop evidence binding");
  const resolvedDesktopSelection = desktopSelection ||
    await readRequired(paths.optimizedDesktopSelection, "Optimized desktop selection");
  const resolvedEvidence = evidence ||
    await readRequired(paths.optimizedSelectedPairEvidence, "Optimized selected-pair evidence binding");
  const resolvedReport = report ||
    await readRequired(paths.optimizedPairCriticReport, "Optimized selected-pair critic report");
  validateSelectedPairCriticReport(resolvedReport, {
    plan: resolvedPlan,
    desktopEvidence: resolvedDesktopEvidence,
    desktopSelection: resolvedDesktopSelection,
    evidence: resolvedEvidence
  });
  const selection = await finalizeOptimizedVisualOrientation({
    plan: resolvedPlan,
    desktopEvidence: resolvedDesktopEvidence,
    desktopSelection: resolvedDesktopSelection,
    evidence: resolvedEvidence,
    report: resolvedReport,
    projectRoot: paths.root
  });
  await Promise.all([
    writeJson(paths.optimizedPairCriticReport, resolvedReport),
    writeJson(paths.optimizedSelection, selection),
    writeJson(paths.selection, selection),
    ...(selection.visualReferenceContract
      ? [
          writeJson(paths.visualReference, selection.visualReferenceContract),
          writeJson(paths.selectedVisualReference, selection.visualReferenceContract)
        ]
      : [])
  ]);
  return {
    phase: selection.status === "human-approved"
      ? "visual-reference-selected"
      : "optimized-orientation-refused",
    artifacts: {
      report: paths.optimizedPairCriticReport,
      selection: paths.optimizedSelection,
      visualReference: selection.visualReferenceContract ? paths.visualReference : null,
      selectedVisualReference: selection.visualReferenceContract
        ? paths.selectedVisualReference
        : null
    },
    selection,
    message: selection.status === "human-approved"
      ? "The selected pair passed independent criticism and is persisted as a creative reference. It grants no final acceptance; fresh rendered desktop/tablet/mobile proof is still required."
      : "The selected pair was not adopted. Inspect the pair quality gates and evidence issues."
  };
}

export async function bindOrientationImages({
  projectRoot,
  submissions,
  plan
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan || await readRequired(paths.plan, "Visual orientation plan");
  const evidence = await bindExternalOrientationImages(
    resolvedPlan,
    submissions,
    { projectRoot: paths.root }
  );
  await writeJson(paths.evidence, evidence);
  return {
    phase: "independent-orientation-critique-required",
    artifact: paths.evidence,
    evidence,
    generationPerformed: false,
    message: "Local mockups were SHA-256-bound to their emitted prompts and generation provenance. Obtain an independent structured critic report for every candidate."
  };
}

export async function evaluateOrientation({
  projectRoot,
  report,
  humanApproval,
  plan,
  evidence
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedPlan = plan || await readRequired(paths.plan, "Visual orientation plan");
  const resolvedEvidence = evidence || await readRequired(paths.evidence, "Visual orientation evidence binding");
  const resolvedReport = report || await readRequired(paths.criticReport, "Visual orientation critic report");

  validateOrientationCriticReport(resolvedReport, {
    plan: resolvedPlan,
    evidence: resolvedEvidence
  });
  const selection = await selectVisualOrientation({
    plan: resolvedPlan,
    evidence: resolvedEvidence,
    report: resolvedReport,
    humanApproval: humanApproval || resolvedPlan.humanApproval,
    projectRoot: paths.root
  });
  await Promise.all([
    writeJson(paths.criticReport, resolvedReport),
    writeJson(paths.selection, selection),
    ...(selection.visualReferenceContract
      ? [writeJson(paths.visualReference, selection.visualReferenceContract)]
      : []),
    ...(selection.status === "human-approved" && selection.visualReferenceContract
      ? [writeJson(paths.selectedVisualReference, selection.visualReferenceContract)]
      : [])
  ]);
  const phase = selection.status === "human-approved"
    ? "visual-reference-selected"
    : selection.status === "awaiting-human-approval"
      ? "human-approval-required"
      : selection.status === "human-rejected"
        ? "visual-reference-rejected"
        : "orientation-refused";
  return {
    phase,
    artifacts: {
      report: paths.criticReport,
      selection: paths.selection,
      visualReference: selection.visualReferenceContract ? paths.visualReference : null,
      selectedVisualReference: selection.status === "human-approved"
        ? paths.selectedVisualReference
        : null
    },
    selection,
    message: selection.status === "human-approved"
      ? "An eligible evidence-backed direction was explicitly approved by a human and persisted as the selected creative reference."
      : selection.status === "awaiting-human-approval"
        ? "Evidence supports a deterministic recommendation, but it has not been adopted. Human approval is still required."
        : "No visual direction was adopted. Inspect the persisted selection result and its refusal or human-rejection reason."
  };
}

function inferredClaim(contract, id, fallback) {
  return contract.inferredRelationships?.find((item) => item.id === id)?.claim || fallback;
}

function typeExpectation(typeManifest) {
  if (!typeManifest?.roles) {
    return "Extract family class, contrast, width, role ownership, measures, line structure, and script pairing from the adopted reference; exact files still come from a separately validated type manifest.";
  }
  const roles = Object.entries(typeManifest.roles)
    .map(([role, definition]) =>
      `${role}: ${definition.family} ${definition.kind}, ${definition.typeCharacter?.width || "unclassified"} width, ${definition.typeCharacter?.contrast || "unclassified"} contrast, weight ${definition.weight}`
    )
    .join("; ");
  const lines = typeManifest.artDirection?.headline?.exactLineCounts || {};
  const lineContract = Object.keys(lines).length
    ? ` Authored headline line counts: ${Object.entries(lines).map(([viewport, count]) => `${viewport} ${count}`).join(", ")}.`
    : "";
  return `Preserve the reference-conditioned role relationships and browser-prove the selected files; do not invent font filenames from pixels. Current type manifest roles: ${roles}.${lineContract}`;
}

export function referenceContractFromSelection({
  selectedVisualReference,
  plan,
  typeManifest,
  updatedAt
}) {
  if (selectedVisualReference?.status !== "human-approved-reference") {
    throw new Error("Reference comparison requires a human-approved selected visual reference");
  }
  const candidate = plan?.candidates?.find(
    (item) => item.id === selectedVisualReference.candidateId
  );
  if (!candidate) throw new Error("Selected visual reference candidate is missing from the orientation plan");
  const contractUpdatedAt = updatedAt ||
    selectedVisualReference.humanApproval?.decidedAt ||
    selectedVisualReference.imageEvidence?.criticProvenance?.generatedAt;
  if (!contractUpdatedAt) {
    throw new Error("A selected-reference updatedAt timestamp is required for evidence binding");
  }
  return {
    id: `${selectedVisualReference.planId}/${selectedVisualReference.candidateId}`,
    source: "human-approved-visual-orientation",
    content: selectedVisualReference,
    updatedAt: contractUpdatedAt,
    expectations: {
      composition: inferredClaim(
        selectedVisualReference,
        "candidate-signature",
        candidate.signatureRelationship
      ),
      hierarchy: inferredClaim(
        selectedVisualReference,
        "hierarchy",
        "Preserve the qualitative focal order while re-solving exact geometry in the browser."
      ),
      typographyRoles: typeExpectation(typeManifest),
      colorMaterialRelationships: "Preserve qualitative material hierarchy and color-role relationships only; never sample generated pixels as exact tokens.",
      objectPlacement: inferredClaim(
        selectedVisualReference,
        "dominant-relationship",
        candidate.signatureRelationship
      ),
      sectionRhythm: `${candidate.pageNarrative} Preserve this narrative cadence without tracing section geometry.`,
      spacingGeometry: "Compare viewport-relative section heights, whitespace bands, alignment offsets, and overlap distances; document intentional accessibility or content-driven deviations.",
      headlineWrapping: typeExpectation(typeManifest),
      assetCrop: inferredClaim(
        selectedVisualReference,
        "asset-crop",
        "Preserve the approved subject silhouette, focal point, overlap, and edge exits while using separate production assets."
      ),
      responsiveTransformation: inferredClaim(
        selectedVisualReference,
        "responsive-transformation",
        candidate.responsiveMutation
      )
    }
  };
}

function currentSelectionApproves(selection, selected) {
  if (selected?.status !== "human-approved-reference") return false;
  if (!selection) return true;
  return selection.status === "human-approved" &&
    selection.selectedCandidateId === selected.candidateId &&
    selection.humanApproval?.status === "approved" &&
    selection.humanApproval?.decidedAt === selected.humanApproval?.decidedAt;
}

function assertSelectedEvidenceMatches(selected, evidence) {
  const candidate = evidence?.kind === "optimized-selected-pair-evidence-binding"
    ? evidence.candidateId === selected.candidateId
      ? { images: evidence.images }
      : null
    : evidence?.candidates?.find(
        (item) => item.candidateId === selected.candidateId
      );
  if (!candidate?.images) {
    throw new Error("Selected visual reference is missing from the canonical evidence binding");
  }
  for (const viewport of ["desktop", "mobile"]) {
    if (
      candidate.images?.[viewport]?.sha256 !==
      selected.imageEvidence?.[viewport]?.sha256
    ) {
      throw new Error(`Selected ${viewport} reference hash does not match the canonical evidence binding`);
    }
  }
}

export async function bindVisualReferenceToBuild({
  projectRoot,
  buildCaptures,
  issuedAt,
  requiredViewports,
  rubricIds,
  criticRequirements,
  contractUpdatedAt,
  selectedVisualReference,
  plan,
  typeManifest
}) {
  const paths = visualOrientationPaths(projectRoot);
  const selected = selectedVisualReference ||
    await readRequired(paths.selectedVisualReference, "Human-approved selected visual reference");
  const resolvedPlan = plan || (
    selected.schemaVersion === "0.5.0" && await exists(paths.optimizedPlan)
      ? await readRequired(paths.optimizedPlan, "Optimized visual orientation plan")
      : await readRequired(paths.plan, "Visual orientation plan")
  );
  const optimized = resolvedPlan.schemaVersion === "0.5.0" &&
    resolvedPlan.strategy === "desktop-candidates-selected-mobile";
  const currentSelectionPath = optimized ? paths.optimizedSelection : paths.selection;
  const currentSelection = await exists(currentSelectionPath)
    ? await readJson(currentSelectionPath)
    : null;
  if (!currentSelectionApproves(currentSelection, selected)) {
    throw new Error("The current orientation selection does not approve this visual reference");
  }
  const orientationEvidence = await readRequired(
    optimized ? paths.optimizedSelectedPairEvidence : paths.evidence,
    "Visual orientation evidence binding"
  );
  assertSelectedEvidenceMatches(selected, orientationEvidence);
  const verification = optimized
    ? await verifyOptimizedSelectedPairImages(
        resolvedPlan,
        await readRequired(
          paths.optimizedDesktopEvidence,
          "Optimized desktop evidence binding"
        ),
        await readRequired(
          paths.optimizedDesktopSelection,
          "Optimized desktop selection"
        ),
        orientationEvidence,
        { projectRoot: paths.root }
      )
    : await verifyBoundOrientationImages(
        resolvedPlan,
        orientationEvidence,
        { projectRoot: paths.root }
      );
  if (!verification.valid) {
    throw new Error(
      `Selected visual reference evidence is stale or invalid: ${verification.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }
  const typePath = path.join(paths.stateDir, "type-manifest.json");
  const resolvedTypeManifest = typeManifest || (await exists(typePath) ? await readJson(typePath) : null);
  const contract = referenceContractFromSelection({
    selectedVisualReference: selected,
    plan: resolvedPlan,
    typeManifest: resolvedTypeManifest,
    updatedAt: contractUpdatedAt
  });
  const generatedAt = selected.imageEvidence.generationProvenance.generatedAt;
  const referenceFrames = ["desktop", "mobile"].map((viewport) => ({
    id: `${selected.candidateId}-${viewport}`,
    viewport,
    sha256: selected.imageEvidence[viewport].sha256,
    capturedAt: generatedAt
  }));
  const binding = createReferenceEvidenceBinding({
    contract,
    referenceFrames,
    buildCaptures,
    issuedAt,
    requiredViewports,
    rubricIds: rubricIds?.length
      ? rubricIds
      : REFERENCE_COMPARISON_DIMENSIONS.map((dimension) => dimension.id),
    criticRequirements: criticRequirements || {}
  });
  await writeJson(paths.referenceBinding, binding);
  return {
    phase: "independent-reference-comparison-required",
    artifact: paths.referenceBinding,
    binding,
    message: "The approved creative reference and current build captures are evidence-bound. A separate vision-capable critic must now produce the structured reference-vs-build report; pixel similarity is not an acceptance criterion."
  };
}

export async function compareVisualReference({
  projectRoot,
  report,
  binding,
  supportingMetrics = [],
  evaluatedAt,
  maxAgeMs
}) {
  const paths = visualOrientationPaths(projectRoot);
  const resolvedBinding = binding ||
    await readRequired(paths.referenceBinding, "Reference-to-build evidence binding");
  const comparison = compareReferenceToBuild({
    binding: resolvedBinding,
    report,
    supportingMetrics,
    evaluatedAt,
    maxAgeMs
  });
  await Promise.all([
    ...(report ? [writeJson(paths.referenceCriticReport, report)] : []),
    writeJson(paths.referenceComparison, comparison)
  ]);
  return {
    phase: comparison.status === "verified-comparison"
      ? "reference-comparison-complete"
      : "reference-comparison-unverified",
    artifacts: {
      report: report ? paths.referenceCriticReport : null,
      comparison: paths.referenceComparison
    },
    comparison,
    message: comparison.status === "verified-comparison"
      ? "The semantic reference comparison is evidence-complete. It is still not automatic design acceptance or proof of implementation quality."
      : "Reference comparison remains unverified; inspect the evidence errors before making any fidelity claim."
  };
}

export async function loadVisualOrientationState(projectRoot) {
  const paths = visualOrientationPaths(projectRoot);
  const result = { paths };
  for (const [key, target] of Object.entries({
    plan: paths.plan,
    evidence: paths.evidence,
    report: paths.criticReport,
    selection: paths.selection,
    visualReference: paths.visualReference,
    selectedVisualReference: paths.selectedVisualReference,
    optimizedPlan: paths.optimizedPlan,
    optimizedDesktopEvidence: paths.optimizedDesktopEvidence,
    optimizedDesktopCriticReport: paths.optimizedDesktopCriticReport,
    optimizedDesktopSelection: paths.optimizedDesktopSelection,
    optimizedSelectedPairEvidence: paths.optimizedSelectedPairEvidence,
    optimizedPairCriticReport: paths.optimizedPairCriticReport,
    optimizedSelection: paths.optimizedSelection,
    referenceBinding: paths.referenceBinding,
    referenceComparison: paths.referenceComparison
  })) {
    result[key] = await exists(target) ? await readJson(target) : null;
  }
  return result;
}

export const createVisualOrientationWorkflow = createOrientationPlan;
export const bindVisualOrientationWorkflow = bindOrientationImages;
export const selectVisualOrientationWorkflow = evaluateOrientation;
export const createOptimizedVisualOrientationWorkflow = createOptimizedOrientationPlan;
export const bindOptimizedDesktopVisualOrientationWorkflow = bindOptimizedDesktopOrientationImages;
export const selectOptimizedDesktopVisualOrientationWorkflow = evaluateOptimizedDesktopOrientation;
export const bindOptimizedSelectedMobileVisualOrientationWorkflow = bindOptimizedSelectedMobileOrientation;
export const finalizeOptimizedVisualOrientationWorkflow = finalizeOptimizedOrientation;
