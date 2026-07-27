import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { exists, readJson, writeJson, writeText } from "../../shared/src/index.mjs";
import { validateBrief } from "../../schemas/src/index.mjs";
import { inspectRepository } from "./inspect.mjs";
import { normalizeReferences } from "../../reference-search/src/index.mjs";
import { captureUrl } from "../../browser/src/index.mjs";
import { NativeDesignDnaProvider } from "../../design-dna-adapter/src/index.mjs";
import { StaticImpeccableCritic, detectExternalIntegrations } from "../../impeccable-adapter/src/index.mjs";
import { createAssetManifest } from "../../asset-router/src/index.mjs";
import { routeTypography } from "../../type-router/src/index.mjs";
import { mergeCritiques, planRepair } from "../../visual-evaluator/src/index.mjs";
import {
  listReferenceCache,
  loadReferenceDna,
  referenceCacheKey,
  referenceCacheRoot,
  resolveReferenceSource,
  storeReferenceDna
} from "../../reference-cache/src/index.mjs";
import {
  createOptimizedOrientationPlan,
  visualOrientationPaths
} from "./orientation.mjs";
import { bindAssetAcquisition } from "./asset-acquisition.mjs";
import {
  guardPipelineStage,
  inspectPipelineStatus
} from "./pipeline-status.mjs";
import {
  ADAPTIVE_PLAN_VERSION,
  ELITE_QUALITY_CONTRACT,
  ELITE_QUALITY_CONTRACT_DIGEST,
  createAdaptivePlan,
  createCriticTriage,
  createRegionalRepairPlan,
  normalizeWorkflowProfile,
  recommendProfileEscalation,
  summarizeRunTelemetry,
  validateAdaptivePlan,
  workflowProfile
} from "./adaptive.mjs";

export {
  bindOrientationImages,
  bindVisualReferenceToBuild,
  bindVisualOrientationWorkflow,
  compareVisualReference,
  createOrientationPlan,
  createVisualOrientationWorkflow,
  evaluateOrientation,
  loadVisualOrientationState,
  referenceContractFromSelection,
  selectVisualOrientationWorkflow,
  visualOrientationPaths
} from "./orientation.mjs";

export {
  ADAPTIVE_PLAN_VERSION,
  ELITE_QUALITY_CONTRACT,
  ELITE_QUALITY_CONTRACT_DIGEST,
  createAdaptivePlan,
  createCriticTriage,
  createRegionalRepairPlan,
  normalizeWorkflowProfile,
  recommendProfileEscalation,
  summarizeRunTelemetry,
  validateAdaptivePlan,
  workflowProfile
} from "./adaptive.mjs";

export {
  PIPELINE_STAGES,
  PipelineStageOrderError,
  assertPipelineStageAllowed,
  guardPipelineStage,
  inspectPipelineStatus,
  resolvePipelineStageId,
  validatePipelineStatus
} from "./pipeline-status.mjs";

export { bindAssetAcquisition } from "./asset-acquisition.mjs";

export { createSitePlan, validateSitePlan } from "./site-plan.mjs";
export { createMotionVideoStage, requestsVideoMotion } from "./motion-video.mjs";
export {
  designLagannPaths,
  loadDesignLagannContext,
  planDesignLagannRun,
  saveDesignLagannContext
} from "./lagann.mjs";

export {
  WORKFLOW_STAGES,
  classifyAssetIntent,
  classifyRequest,
  createAssetPlan,
  createExecutionPlan,
  createInformationArchitecture,
  createMotionSystem,
  createProjectContext,
  detectChange,
  estimateScope,
  evaluateStop,
  progressMessage,
  resolveHostCapabilities,
  routeAsset,
  updateProjectContext
} from "../../workflow-engine/src/index.mjs";

export {
  listReferenceCache,
  loadReferenceDna,
  referenceCacheKey,
  referenceCacheRoot,
  resolveReferenceSource,
  storeReferenceDna
} from "../../reference-cache/src/index.mjs";

function typographySection(typeManifest) {
  if (!typeManifest?.roles) return "No qualified type manifest has been generated.";
  const roles = Object.entries(typeManifest.roles)
    .map(([role, definition]) => `- ${role}: ${definition.family}, ${definition.kind}, ${definition.typeCharacter?.width || "unclassified"} width, ${definition.typeCharacter?.contrast || "unclassified"} contrast, weight ${definition.weight}, ${definition.fallbackStack}`)
    .join("\n");
  const referenceStatus = typeManifest.context?.referenceTypography
    ? "Reference-conditioned: family class, width, contrast, role ownership, measures, and line structure are hard gates."
    : "No adopted typography reference was supplied; the manifest is thesis- and content-conditioned.";
  return `${roles}

Typography Quality Score: ${typeManifest.quality.score}/10 (${typeManifest.gates.passed ? "qualified" : "rejected"}).

${referenceStatus}

Implementation source of truth: \`.design-lagann/type-manifest.json\`. Bundle the declared local WOFF2 sources, set \`font-synthesis: none\`, preserve authored line contracts, and pass browser font checks before treating this plan as implemented.`;
}

function visualReferenceSection(visualReference, selection) {
  if (visualReference?.status === "human-approved-reference") {
    const inferred = (visualReference.inferredRelationships || [])
      .map((item) => `- ${item.claim} (${item.confidence}; ${item.id})`)
      .join("\n");
    return `Human-approved candidate: ${visualReference.candidateId}

Plan: ${visualReference.planId}

Reference status: ${visualReference.status}

The generated desktop/mobile images are creative references, not implementation specifications or pixel targets. Measured visual relationships may enter Design DNA and the type contract; exact font files still come from the qualified type manifest.

Inferred relationships:

${inferred || "- No inferred relationships recorded."}

Do not invent exact source tokens, font filenames, semantics, or implementation technology from pixels. Extract family class, contrast, width, role ownership, measures, line structure, and responsive transformation as evidence with explicit confidence.`;
  }
  if (selection?.recommendedCandidateId) {
    return `Recommendation ${selection.recommendedCandidateId} exists with status ${selection.status}, but no visual direction has been human-approved for adoption. Do not use the provisional image as an implementation target.`;
  }
  return "No evidence-complete, human-approved visual orientation is attached.";
}

function designMarkdown(projectDna, typeManifest, visualReference, selection) {
  return `# Project design system

## Creative idea

${projectDna.creativeThesis || projectDna.creativeIdea}

## Design argument

${projectDna.creativeDirection?.designArgument || "Define one brief-specific visual argument before implementation."}

Desired recall: ${projectDna.creativeDirection?.desiredRecall || projectDna.memorabilityHook || "Define the intended memory hook."}

Signature moment: ${projectDna.creativeDirection?.signatureMoment?.description || "Define one structural signature moment."}

## Color

${projectDna.system.colorStrategy}

Candidate computed colors: ${projectDna.system.paletteCandidates.join(", ") || "Define from brief and evidence"}.

## Typography

${typographySection(typeManifest)}

## Selected visual reference

${visualReferenceSection(visualReference, selection)}

## Spacing and depth

${projectDna.system.spacingRule}

Depth model: ${projectDna.system.depthModel}.

## Composition

${(projectDna.compositionRules || []).map((rule) => `- ${rule}`).join("\n")}

## Depth rules

${(projectDna.depthRules || []).map((rule) => `- ${rule}`).join("\n")}

## Motion

${projectDna.system.motionLanguage}

${(projectDna.motionRules || []).map((rule) => `- ${rule}`).join("\n")}

## Originality

${projectDna.originalityRules.map((rule) => `- ${rule}`).join("\n")}

## Kill criteria

${(projectDna.creativeDirection?.killCriteria || []).map((rule) => `- ${rule}`).join("\n")}
`;
}

function typographyInput(brief, projectDna = null, referenceDnas = []) {
  const typography = brief.typography && typeof brief.typography === "object"
    ? brief.typography
    : {};
  const referenceTypography = typography.referenceTypography
    ?? typography.reference
    ?? brief.referenceTypography
    ?? projectDna?.referenceTypography
    ?? referenceDnas
      .map((dna) => dna?.system?.typography?.value?.referenceContract)
      .find((contract) => contract && typeof contract === "object")
    ?? null;
  return {
    mode: brief.executionProfile || brief.mode || "balanced",
    brandVoice: typography.brandVoice ?? brief.brandVoice ?? brief.voice ?? ["clear", "specific"],
    contentDensity: typography.contentDensity ?? brief.contentDensity ?? "medium",
    languages: typography.languages ?? brief.languages ?? brief.language ?? ["en"],
    ...((typography.scripts ?? brief.scripts)
      ? { scripts: typography.scripts ?? brief.scripts }
      : {}),
    providedFonts: typography.providedFonts ?? brief.providedFonts ?? [],
    ...((typography.providedStrategy ?? brief.providedStrategy)
      ? { providedStrategy: typography.providedStrategy ?? brief.providedStrategy }
      : {}),
    rolePreferences: typography.rolePreferences ?? brief.typeRolePreferences ?? {},
    systemDefaultJustification: typography.systemDefaultJustification ?? brief.systemDefaultJustification ?? "",
    singleFamilyJustification: typography.singleFamilyJustification ?? brief.singleFamilyJustification ?? "",
    ...((typography.headline ?? brief.headline ?? brief.headlineText)
      ? {
          headline: typeof (typography.headline ?? brief.headline) === "object"
            ? (typography.headline ?? brief.headline)
            : { text: typography.headline ?? brief.headline ?? brief.headlineText }
        }
      : {}),
    ...(referenceTypography ? { referenceTypography } : {}),
    performance: typography.performance ?? brief.typographyPerformance ?? {}
  };
}

function visualReferenceMetadata(contract) {
  if (!contract) return null;
  return {
    planId: contract.planId,
    candidateId: contract.candidateId,
    status: contract.status,
    humanApproval: contract.humanApproval,
    referenceRole: contract.imageEvidence?.role || "creative-reference",
    imageHashes: {
      desktop: contract.imageEvidence?.desktop?.sha256 || null,
      mobile: contract.imageEvidence?.mobile?.sha256 || null
    },
    exactRequirementIds: (contract.exactRequirements || []).map((item) => item.id),
    inferredRelationshipIds: (contract.inferredRelationships || []).map((item) => item.id),
    generatedImageIsGroundTruth: false,
    pixelSimilarityIsAcceptance: false,
    source: ".design-lagann/visual-orientation/selected-visual-reference.json"
  };
}

async function persistedOrientation(projectRoot, suppliedReference) {
  const paths = visualOrientationPaths(projectRoot);
  const selection = await exists(paths.selection) ? await readJson(paths.selection) : null;
  const selected = suppliedReference ||
    (await exists(paths.selectedVisualReference)
      ? await readJson(paths.selectedVisualReference)
      : null);
  const approved = selected?.status === "human-approved-reference" &&
    (!selection || (
      selection.status === "human-approved" &&
      selection.selectedCandidateId === selected.candidateId &&
      selection.humanApproval?.status === "approved" &&
      selection.humanApproval?.decidedAt === selected.humanApproval?.decidedAt
    ))
    ? selected
    : null;
  return { selection, selected: approved, metadata: visualReferenceMetadata(approved) };
}

async function persistPipelineSnapshot(projectRoot) {
  const status = await inspectPipelineStatus(projectRoot);
  const target = path.join(path.resolve(projectRoot), ".design-lagann", "run-state.json");
  await writeJson(target, {
    ...status,
    kind: "design-lagann-strict-run-state",
    updatedAt: status.generatedAt,
    sourceOfTruth: "Validated project artifacts; planned work never counts as executed."
  });
  return { status, target };
}

async function orientationPendingResult(projectRoot, status) {
  const paths = visualOrientationPaths(projectRoot);
  const selection = await exists(paths.selection) ? await readJson(paths.selection) : null;
  const desktopEvidence = await exists(paths.optimizedDesktopEvidence)
    ? await readJson(paths.optimizedDesktopEvidence)
    : null;
  const selectedPairEvidence = await exists(paths.optimizedSelectedPairEvidence)
    ? await readJson(paths.optimizedSelectedPairEvidence)
    : null;
  const legacyEvidence = await exists(paths.evidence) ? await readJson(paths.evidence) : null;
  let phase = "direction-image-generation-required";
  let message = "Generate every authorized direction frame with the host image generator, save the returned bitmaps locally, and bind them before critique.";
  if (desktopEvidence && !selection?.recommendedCandidateId) {
    phase = "independent-desktop-orientation-critique-required";
    message = "The desktop direction files are bound. Complete the independent direction critique before approval or mobile generation.";
  } else if (selection?.status === "awaiting-human-approval") {
    phase = "human-approval-required-before-mobile";
    message = "The evidence-backed recommendation is ready, but explicit direction approval is required before mobile generation.";
  } else if (selection?.status === "human-approved" && !selectedPairEvidence) {
    phase = "selected-mobile-image-generation-required";
    message = "Generate only the approved direction's authorized mobile frame, save it locally, and bind it to the selected desktop.";
  } else if (selectedPairEvidence) {
    phase = "independent-selected-pair-critique-required";
    message = "The approved desktop/mobile pair is bound. Complete its independent pair critique before the implementation contract.";
  } else if (legacyEvidence && !selection?.recommendedCandidateId) {
    phase = "independent-orientation-critique-required";
    message = "The direction files are bound. Complete the independent direction critique and explicit approval.";
  }
  return { phase, message, status };
}

function phaseForStatus(status) {
  const current = status.current?.id;
  if (status.verdict === "accepted") {
    return {
      phase: "accepted",
      message: "The local implementation passed every ordered elite-v1 evidence gate."
    };
  }
  if (current === "asset-acquisition") {
    return {
      phase: "asset-generation-required",
      message: "Generate or acquire every required production raster/photo as a separate local file, then bind its dimensions, provenance, and SHA-256. Direction frames and placeholders are forbidden substitutes."
    };
  }
  if (current === "implementation-source") {
    return {
      phase: "implementation-required",
      message: "The approved contract and production assets are ready. Build the real responsive source in the local workspace; Sites is not an implementation surface."
    };
  }
  if (current === "rendered-critique") {
    return {
      phase: "rendered-critique-required",
      message: "Run the local build and capture fresh desktop, tablet, and mobile evidence for structured critique."
    };
  }
  if (current === "repair") {
    return {
      phase: "repair-required",
      message: "Apply only the bounded, evidence-backed root-cause repairs, then recapture the full page."
    };
  }
  if (current === "final-proof") {
    return {
      phase: "final-verification-required",
      message: "Complete fresh after evidence, comparison, accessibility, interaction, and regression proof before acceptance."
    };
  }
  return {
    phase: "pipeline-blocked",
    message: status.current?.missing?.[0]?.message || "Complete the current strict pipeline gate."
  };
}

function blueprintMarkdown(brief, projectDna) {
  const sections = brief.sections?.length ? brief.sections : ["Hero / primary task", "Narrative or product proof", "Details and interaction", "Closing action"];
  return `# Page blueprint

## Goal

${brief.goal}

## Central direction

${projectDna.creativeIdea}

## Signature moment

${projectDna.creativeDirection?.signatureMoment?.description || projectDna.memorabilityHook}

## Narrative

${sections.map((section, index) => `${index + 1}. ${section}`).join("\n")}

## Responsive composition

- Desktop: establish the full hierarchy and primary focal relationship.
- Tablet: recompute columns and heading measures; do not merely shrink.
- Mobile: preserve reading order, crop assets deliberately, and keep controls touch-safe.

## Verification

Capture desktop, tablet, and mobile; bind semantic judgments to screenshot hashes; check thesis legibility, brand specificity, composition, object integration, rhythm, material discipline, memorability, overflow, reading order, focus, contrast, reduced motion, asset crop, and CTA hierarchy.
`;
}

export async function initializeProject({ projectRoot, brief }) {
  const root = path.resolve(projectRoot);
  const stateDir = path.join(root, ".design-lagann");
  await mkdir(stateDir, { recursive: true });
  const inputBrief = validateBrief({
    mode: brief?.executionProfile || brief?.mode || "balanced",
    references: [],
    ...brief
  });
  const repository = await inspectRepository(root);
  const integrations = await detectExternalIntegrations(root);
  const adaptivePlan = await createAdaptivePlan({
    projectRoot: root,
    brief: inputBrief,
    profile: inputBrief.executionProfile || inputBrief.mode,
    repository
  });
  const normalizedBrief = validateBrief({
    ...inputBrief,
    mode: adaptivePlan.profile,
    executionProfile: adaptivePlan.profile,
    acceptancePolicy: ELITE_QUALITY_CONTRACT.id
  });
  await Promise.all([
    writeJson(path.join(stateDir, "brief.json"), normalizedBrief),
    writeJson(path.join(stateDir, "repository.json"), repository),
    writeJson(path.join(stateDir, "integrations.json"), integrations)
  ]);
  return { stateDir, brief: normalizedBrief, repository, integrations, adaptivePlan };
}

export async function buildDesignArtifacts({ projectRoot, brief, referenceDnas, selectedVisualReference }) {
  const root = path.resolve(projectRoot);
  const stateDir = path.join(root, ".design-lagann");
  const orientation = await persistedOrientation(root, selectedVisualReference);
  if (!orientation.selected) {
    throw new Error(
      "Design contract is blocked: one independently reviewed desktop/mobile direction pair must be explicitly approved first"
    );
  }
  const provider = new NativeDesignDnaProvider();
  const synthesizedDna = await provider.synthesize(referenceDnas || [], brief);
  const projectDna = orientation.metadata
    ? { ...synthesizedDna, selectedVisualReference: orientation.metadata }
    : synthesizedDna;
  const assetManifest = createAssetManifest(brief, projectDna);
  const typeRouting = routeTypography(typographyInput(brief, projectDna, referenceDnas || []));
  const typeManifest = typeRouting.manifest;
  const designArtifacts = {
    version: ADAPTIVE_PLAN_VERSION,
    projectDna: ".design-lagann/project-design-dna.json",
    assetManifest: ".design-lagann/asset-manifest.json",
    assetBatchPlan: ".design-lagann/asset-batch-plan.json",
    typeManifest: ".design-lagann/type-manifest.json",
    selectedVisualReference: orientation.metadata
  };
  await Promise.all([
    writeJson(path.join(stateDir, "project-design-dna.json"), projectDna),
    writeJson(path.join(stateDir, "asset-manifest.json"), assetManifest),
    writeJson(path.join(stateDir, "asset-batch-plan.json"), assetManifest.assetBatchPlan),
    writeJson(path.join(stateDir, "type-manifest.json"), typeManifest),
    writeJson(path.join(stateDir, "design-artifacts.json"), designArtifacts),
    writeText(path.join(root, "DESIGN.md"), designMarkdown(
      projectDna,
      typeManifest,
      orientation.selected,
      orientation.selection
    )),
    writeText(path.join(stateDir, "page-blueprint.md"), blueprintMarkdown(brief, projectDna)),
    writeText(
      path.join(stateDir, "creative-direction.md"),
      `# Creative direction\n\n## Thesis\n\n${projectDna.creativeDirection?.thesis || projectDna.creativeIdea}\n\n` +
      `## Design argument\n\n${projectDna.creativeDirection?.designArgument || ""}\n\n` +
      `## Desired recall\n\n${projectDna.creativeDirection?.desiredRecall || ""}\n\n` +
      `## Signature moment\n\n${projectDna.creativeDirection?.signatureMoment?.description || ""}\n\n` +
      `## Anti-patterns\n\n${(projectDna.creativeDirection?.antiPatterns || []).map((item) => `- ${item}`).join("\n")}\n`
    )
  ]);
  return {
    projectDna,
    assetManifest,
    typeManifest,
    typeRouting: {
      status: typeRouting.status,
      selection: typeRouting.selection,
      quality: typeRouting.quality,
      gates: typeRouting.gates
    },
    visualReference: orientation.metadata,
    designArtifacts
  };
}

export async function critiqueProject(projectRoot) {
  const impeccable = new StaticImpeccableCritic();
  const impeccableReport = await impeccable.analyze({ projectRoot: path.resolve(projectRoot) });
  const findings = mergeCritiques([impeccableReport]);
  return {
    version: ADAPTIVE_PLAN_VERSION,
    createdAt: new Date().toISOString(),
    reports: [impeccableReport],
    findings,
    repairPlan: planRepair(findings)
  };
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => consume())
  );
  return output;
}

export async function cacheReference({
  projectRoot,
  reference,
  vision = null,
  cacheRoot: suppliedCacheRoot
}) {
  const root = path.resolve(projectRoot);
  const normalized = normalizeReferences([reference])[0];
  const cacheRoot = referenceCacheRoot(root, suppliedCacheRoot);
  const source = await resolveReferenceSource(normalized);
  const captureContract = {
    version: "0.4.0",
    viewports: {
      desktop: { width: 1440, height: 1000 },
      mobile: { width: 390, height: 844 }
    }
  };
  const key = source.status === "verified"
    ? referenceCacheKey({
        source,
        reference: normalized,
        captureContract,
        extractorVersion: "0.4.0",
        visionDigest: vision?.digest || null
      })
    : null;
  if (key) {
    const cached = await loadReferenceDna({ cacheRoot, key, source });
    if (cached.status === "hit") {
      const destination = path.join(root, ".design-lagann", "references", normalized.id);
      await Promise.all([
        writeJson(path.join(destination, "design-dna.json"), cached.dna),
        writeJson(path.join(destination, "cache-hit.json"), {
          version: ADAPTIVE_PLAN_VERSION,
          key,
          source,
          reusedAt: new Date().toISOString(),
          claimBoundary: cached.claimBoundary
        })
      ]);
      return {
        reference: normalized,
        dna: cached.dna,
        capture: null,
        cache: { status: "hit", key, source }
      };
    }
  }
  const capture = await captureUrl({
    url: normalized.url,
    id: normalized.id,
    outDir: path.join(root, ".design-lagann", "references"),
    viewports: captureContract.viewports
  });
  const provider = new NativeDesignDnaProvider();
  const dna = await provider.extract({
    capture,
    role: normalized.role,
    borrow: normalized.strengths,
    reject: normalized.weaknesses,
    similarityRisks: [normalized.similarityRisk],
    ...(vision ? { vision } : {})
  });
  await writeJson(
    path.join(root, ".design-lagann", "references", normalized.id, "design-dna.json"),
    dna
  );
  let cache = {
    status: source.status === "verified" ? "miss" : "unverifiable",
    key,
    source,
    reason: source.reason || null
  };
  if (key) {
    await storeReferenceDna({
      cacheRoot,
      key,
      source,
      reference: normalized,
      dna,
      capture
    });
    cache = { status: "stored", key, source };
  }
  return { reference: normalized, dna, capture, cache };
}

export async function listCachedReferences({ projectRoot, cacheRoot: suppliedCacheRoot } = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  return listReferenceCache(referenceCacheRoot(root, suppliedCacheRoot));
}

export async function createWorkflow({ projectRoot, brief }) {
  const root = path.resolve(projectRoot);
  const initialized = await initializeProject({ projectRoot: root, brief });
  const references = normalizeReferences(initialized.brief.references);
  const processedReferences = references.length
    ? await mapLimit(references, 2, (reference) =>
        cacheReference({ projectRoot: root, reference })
      )
    : [];
  const referenceDnas = processedReferences.map((result) => result.dna);
  const referenceCache = processedReferences.map((result) => ({
    referenceId: result.reference.id,
    ...result.cache
  }));
  let status = await inspectPipelineStatus(root);
  const base = {
    ...initialized,
    references,
    referenceCache,
    modeBanner: initialized.adaptivePlan.modeBanner,
    displayLabel: initialized.adaptivePlan.displayLabel,
    selectionReason: initialized.adaptivePlan.selectionReason,
    qualityBarDisclosure: initialized.adaptivePlan.qualityBarDisclosure,
    deliveryPolicy: initialized.adaptivePlan.deliveryPolicy
  };

  if (status.current?.id === "direction-frames") {
    const paths = visualOrientationPaths(root);
    if (!(await exists(paths.optimizedPlan))) {
      const provisionalDna = referenceDnas.length
        ? await new NativeDesignDnaProvider().synthesize(referenceDnas, initialized.brief)
        : {};
      const orientation = await createOptimizedOrientationPlan({
        projectRoot: root,
        brief: initialized.brief,
        projectDna: provisionalDna
      });
      ({ status } = await persistPipelineSnapshot(root));
      return {
        ...base,
        ...orientation,
        status,
        nextGate: status.current
      };
    }
    const plan = await readJson(paths.optimizedPlan);
    ({ status } = await persistPipelineSnapshot(root));
    return {
      ...base,
      phase: "external-desktop-image-generation-required",
      plan,
      generationPerformed: false,
      status,
      nextGate: status.current,
      message: "Execute every authorized desktop direction request through the host image generator, save each returned bitmap locally, and bind it. Emitting prompts is not generation."
    };
  }

  if (status.current?.id === "approved-selected-pair") {
    ({ status } = await persistPipelineSnapshot(root));
    return {
      ...base,
      ...await orientationPendingResult(root, status),
      nextGate: status.current
    };
  }

  if (status.current?.id === "design-contract") {
    await guardPipelineStage({
      projectRoot: root,
      requestedStage: "design-contract"
    });
    const artifacts = await buildDesignArtifacts({
      projectRoot: root,
      brief: initialized.brief,
      referenceDnas
    });
    ({ status } = await persistPipelineSnapshot(root));
    const phase = phaseForStatus(status);
    return {
      ...base,
      ...artifacts,
      ...phase,
      status,
      nextGate: status.current,
      assetGenerationPlan: artifacts.assetManifest.assetBatchPlan
    };
  }

  ({ status } = await persistPipelineSnapshot(root));
  const phase = phaseForStatus(status);
  return {
    ...base,
    ...phase,
    status,
    nextGate: status.current,
    assetGenerationPlan: status.current?.id === "asset-acquisition" && await exists(
      path.join(root, ".design-lagann", "asset-batch-plan.json")
    )
      ? await readJson(path.join(root, ".design-lagann", "asset-batch-plan.json"))
      : null
  };
}

export async function loadJsonList(csv) {
  if (!csv) return [];
  return Promise.all(csv.split(",").filter(Boolean).map(async (target) => JSON.parse(await readFile(path.resolve(target), "utf8"))));
}
