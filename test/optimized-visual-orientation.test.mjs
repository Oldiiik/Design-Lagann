import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  ORIENTATION_SCORE_DIMENSIONS,
  bindExternalDesktopOrientationImages,
  bindSelectedMobileOrientationImage,
  createOptimizedVisualOrientationPlan,
  createVisualOrientationPlan,
  finalizeOptimizedVisualOrientation,
  selectDesktopVisualOrientation,
  sha256Text,
  validateDesktopOrientationCriticReport,
  validateSelectedPairCriticReport,
  verifyOptimizedSelectedPairImages
} from "../packages/visual-orienter/src/index.mjs";
import {
  bindOptimizedDesktopOrientationImages,
  bindOptimizedSelectedMobileOrientation,
  bindVisualReferenceToBuild,
  createOptimizedOrientationPlan,
  evaluateOptimizedDesktopOrientation,
  finalizeOptimizedOrientation,
  visualOrientationPaths
} from "../packages/orchestrator/src/orientation.mjs";
import { handleRequest } from "../packages/mcp-server/src/server.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const dimensionIds = ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id);

function brief() {
  return {
    goal: "Help readers reserve a hand-bound first edition",
    audience: "Readers of contemporary translated fiction",
    primaryAction: "reserve a numbered copy",
    brandTruths: ["Every edition is physically made and intentionally scarce"],
    desiredRecall: "The book opening the page itself",
    executionProfile: "balanced",
    sections: ["Edition", "Excerpt", "Process", "Reservation"],
    interactions: ["open the featured book", "reserve or release a copy"],
    requiredStates: ["closed book", "open book", "reserved"],
    constraints: ["local assets only"],
    forbiddenPatterns: ["generic split hero"]
  };
}

function dna() {
  return {
    creativeThesis: "A new book physically opens the page.",
    creativeDirection: {
      brandTruth: "The book is an object made to be handled.",
      desiredRecall: "The book cover becoming the page."
    }
  };
}

async function desktopWorkspace(plan) {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-lagann-optimized-orientation-"));
  const submissions = [];
  for (const [index, candidate] of plan.candidates.entries()) {
    const filename = `${candidate.id}-desktop.png`;
    await writeFile(
      path.join(root, filename),
      Buffer.from(`desktop-${index}-${candidate.fingerprint}`)
    );
    submissions.push({
      candidateId: candidate.id,
      images: {
        desktop: {
          path: filename,
          promptSha256: candidate.prompts.desktop.sha256
        }
      },
      provenance: {
        provider: "OpenAI",
        model: "gpt-image-2",
        generatedAt: `2026-07-23T10:0${index}:00.000Z`,
        generationMode: "external",
        generationId: `desktop-${index}`,
        humanEdits: "none"
      }
    });
  }
  return { root, submissions };
}

function scorecard({
  base = 8.4,
  responsiveViability = 8.2,
  risk = 1.5,
  difficulty = 2.5
} = {}) {
  return Object.fromEntries(dimensionIds.map((id) => [
    id,
    {
      score: id === "responsiveViability"
        ? responsiveViability
        : id === "accessibilityFakeUiRisk"
          ? risk
          : id === "implementationDifficulty"
            ? difficulty
            : base,
      evidence: `${id} is grounded in the bound full-page evidence and declared direction contract.`,
      blocker: false
    }
  ]));
}

function observations(candidate) {
  return {
    dominantRelationship: `${candidate.name} binds the physical book, editorial type, and reservation action.`,
    hierarchy: "The physical object leads to the title, proof, and then the reservation action.",
    responsiveTransformation: "Mobile changes crop and reading order while retaining the same object relationship.",
    implementationRisks: ["The focal relationship needs browser-rendered proof."],
    fakeUiRisks: [],
    assetMediumImplications: [candidate.assetMediumHypothesis]
  };
}

function desktopCriticReport(plan, evidence) {
  return {
    schemaVersion: "0.5.0",
    kind: "optimized-desktop-critic-report",
    planId: plan.id,
    desktopBindingId: evidence.bindingId,
    critic: {
      provider: "Independent Critic Lab",
      model: "critic-model-3",
      criticId: "blind-desktop-direction-critic",
      generatedAt: "2026-07-23T11:00:00.000Z",
      independentOfGeneration: true
    },
    limitations: {
      generatedImagesAreCreativeReferences: true,
      pixelSimilarityIsNotAcceptance: true,
      implementationRequiresVerification: true,
      mobileImagesReviewed: false
    },
    candidateReports: plan.candidates.map((candidate, index) => {
      const bound = evidence.candidates.find(
        (item) => item.candidateId === candidate.id
      );
      return {
        candidateId: candidate.id,
        verdict: index === 0 ? "shortlist" : "consider",
        coverage: {
          fullPage: true,
          viewports: ["desktop"],
          responsiveBasis: "authored-responsive-mutation-contract",
          dimensions: dimensionIds
        },
        evidence: {
          imageHashes: { desktop: bound.images.desktop.sha256 },
          responsiveMutationSha256: sha256Text(candidate.responsiveMutation)
        },
        scorecard: scorecard({
          base: 8.6 - index * 0.35,
          difficulty: 2.5 + index * 0.4
        }),
        observations: observations(candidate),
        findings: []
      };
    })
  };
}

async function readyDesktopSelection() {
  const plan = createOptimizedVisualOrientationPlan(brief(), dna());
  const workspace = await desktopWorkspace(plan);
  const evidence = await bindExternalDesktopOrientationImages(
    plan,
    workspace.submissions,
    { projectRoot: workspace.root }
  );
  const report = desktopCriticReport(plan, evidence);
  const pending = await selectDesktopVisualOrientation({
    plan,
    evidence,
    report,
    projectRoot: workspace.root
  });
  const selection = await selectDesktopVisualOrientation({
    plan,
    evidence,
    report,
    humanApproval: {
      status: "approved",
      candidateId: pending.recommendedCandidateId,
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:00:00.000Z",
      note: "Approved after reviewing every bound desktop candidate."
    },
    projectRoot: workspace.root
  });
  return { plan, workspace, evidence, report, pending, selection };
}

async function bindSelectedMobile(fixture) {
  const candidate = fixture.plan.candidates.find(
    (item) => item.id === fixture.selection.selectedCandidateId
  );
  const filename = `${candidate.id}-mobile.webp`;
  await writeFile(
    path.join(fixture.workspace.root, filename),
    Buffer.from(`mobile-${candidate.fingerprint}`)
  );
  const submission = {
    candidateId: candidate.id,
    requestId: fixture.selection.mobileGenerationRequest.requestId,
    images: {
      mobile: {
        path: filename,
        promptSha256: candidate.prompts.mobile.sha256
      }
    },
    provenance: {
      provider: "OpenAI",
      model: "gpt-image-2",
      generatedAt: "2026-07-23T12:05:00.000Z",
      generationMode: "external",
      generationId: "selected-mobile-1",
      humanEdits: "none"
    }
  };
  const pair = await bindSelectedMobileOrientationImage({
    plan: fixture.plan,
    desktopEvidence: fixture.evidence,
    desktopSelection: fixture.selection,
    submission,
    projectRoot: fixture.workspace.root
  });
  return { candidate, submission, pair };
}

function pairCriticReport(fixture, pair) {
  return {
    schemaVersion: "0.5.0",
    kind: "optimized-selected-pair-critic-report",
    planId: fixture.plan.id,
    selectedPairBindingId: pair.bindingId,
    candidateId: pair.candidateId,
    verdict: "approve",
    critic: {
      provider: "Independent Critic Lab",
      model: "critic-model-3",
      criticId: "blind-selected-pair-critic",
      generatedAt: "2026-07-23T12:10:00.000Z",
      independentOfGeneration: true
    },
    limitations: {
      generatedImagesAreCreativeReferences: true,
      pixelSimilarityIsNotAcceptance: true,
      implementationRequiresVerification: true
    },
    coverage: {
      fullPage: true,
      viewports: ["desktop", "mobile"],
      dimensions: dimensionIds
    },
    evidence: {
      imageHashes: {
        desktop: pair.images.desktop.sha256,
        mobile: pair.images.mobile.sha256
      }
    },
    scorecard: scorecard(),
    observations: observations(
      fixture.plan.candidates.find((item) => item.id === pair.candidateId)
    ),
    findings: []
  };
}

test("v0.5 plan defers mobile generation while preserving the v0.4 API unchanged", () => {
  const legacy = createVisualOrientationPlan(brief(), dna());
  const optimized = createOptimizedVisualOrientationPlan(brief(), dna());

  assert.equal(legacy.schemaVersion, "0.4.0");
  assert.equal(legacy.strategy, undefined);
  assert.equal(optimized.schemaVersion, "0.5.0");
  assert.equal(optimized.strategy, "desktop-candidates-selected-mobile");
  assert.deepEqual(
    optimized.generationContract.stages.map((stage) => stage.candidateScope),
    ["all", "human-approved-candidate-only"]
  );
  assert.ok(optimized.candidates.every(
    (candidate) =>
      candidate.prompts.desktop.stage === "desktop-candidate-generation" &&
      candidate.prompts.mobile.stage === "deferred-selected-mobile-generation" &&
      candidate.prompts.mobile.generationAuthorized === false
  ));
  assert.equal(optimized.groundTruthPolicy.desktopSelectionIsFinalReference, false);
  assert.equal(
    optimized.groundTruthPolicy.finalAcceptanceRequiresFreshRenderedDesktopTabletMobileEvidence,
    true
  );
});

test("desktop evidence yields no reference and authorizes exactly one mobile only after approval", async () => {
  const fixture = await readyDesktopSelection();

  assert.equal(
    validateDesktopOrientationCriticReport(fixture.report, {
      plan: fixture.plan,
      evidence: fixture.evidence
    }),
    fixture.report
  );
  assert.equal(fixture.pending.status, "awaiting-human-approval");
  assert.equal(fixture.pending.mobileGenerationRequest, null);
  assert.equal(fixture.pending.visualReferenceContract, undefined);
  assert.equal(fixture.pending.acceptanceGranted, false);

  assert.equal(fixture.selection.status, "human-approved");
  assert.equal(
    fixture.selection.mobileGenerationRequest.candidateId,
    fixture.selection.selectedCandidateId
  );
  assert.equal(
    fixture.selection.mobileGenerationRequest.authorization,
    "generate-this-selected-mobile-only"
  );
  assert.equal(fixture.selection.referenceStatus, "not-ready-mobile-and-pair-critique-required");
  assert.equal(fixture.selection.visualReferenceContract, undefined);
  assert.equal(fixture.selection.acceptanceGranted, false);
});

test("selected mobile binding rejects unselected, stale, and pre-approval submissions", async () => {
  const fixture = await readyDesktopSelection();
  const selected = fixture.plan.candidates.find(
    (candidate) => candidate.id === fixture.selection.selectedCandidateId
  );
  const unselected = fixture.plan.candidates.find(
    (candidate) => candidate.id !== fixture.selection.selectedCandidateId
  );
  const filename = `${selected.id}-mobile.webp`;
  await writeFile(path.join(fixture.workspace.root, filename), Buffer.from("selected-mobile"));
  const base = {
    candidateId: selected.id,
    requestId: fixture.selection.mobileGenerationRequest.requestId,
    images: {
      mobile: {
        path: filename,
        promptSha256: selected.prompts.mobile.sha256
      }
    },
    provenance: {
      provider: "OpenAI",
      model: "gpt-image-2",
      generatedAt: "2026-07-23T12:05:00.000Z",
      generationMode: "external",
      generationId: "selected-mobile",
      humanEdits: "none"
    }
  };
  await assert.rejects(
    bindSelectedMobileOrientationImage({
      plan: fixture.plan,
      desktopEvidence: fixture.evidence,
      desktopSelection: fixture.selection,
      submission: { ...base, candidateId: unselected.id },
      projectRoot: fixture.workspace.root
    }),
    /must target the approved candidate/
  );
  await assert.rejects(
    bindSelectedMobileOrientationImage({
      plan: fixture.plan,
      desktopEvidence: fixture.evidence,
      desktopSelection: fixture.selection,
      submission: { ...base, requestId: "mobile-request-stale" },
      projectRoot: fixture.workspace.root
    }),
    /requestId does not match/
  );
  const early = structuredClone(base);
  early.provenance.generatedAt = "2026-07-23T11:59:59.000Z";
  await assert.rejects(
    bindSelectedMobileOrientationImage({
      plan: fixture.plan,
      desktopEvidence: fixture.evidence,
      desktopSelection: fixture.selection,
      submission: early,
      projectRoot: fixture.workspace.root
    }),
    /after explicit desktop-direction approval/
  );
});

test("only an independently approved selected pair becomes a creative reference, never acceptance proof", async () => {
  const fixture = await readyDesktopSelection();
  const { pair } = await bindSelectedMobile(fixture);
  const report = pairCriticReport(fixture, pair);

  assert.equal(
    validateSelectedPairCriticReport(report, {
      plan: fixture.plan,
      desktopEvidence: fixture.evidence,
      desktopSelection: fixture.selection,
      evidence: pair
    }),
    report
  );
  assert.equal(
    (await verifyOptimizedSelectedPairImages(
      fixture.plan,
      fixture.evidence,
      fixture.selection,
      pair
    )).valid,
    true
  );

  const finalized = await finalizeOptimizedVisualOrientation({
    plan: fixture.plan,
    desktopEvidence: fixture.evidence,
    desktopSelection: fixture.selection,
    evidence: pair,
    report,
    projectRoot: fixture.workspace.root
  });
  assert.equal(finalized.status, "human-approved");
  assert.equal(finalized.visualReferenceContract.status, "human-approved-reference");
  assert.equal(finalized.visualReferenceContract.optimization.generatedMobileCandidateCount, 1);
  assert.equal(
    finalized.visualReferenceContract.optimization.avoidedMobileCandidateCount,
    fixture.plan.candidates.length - 1
  );
  assert.equal(finalized.acceptanceGranted, false);
  assert.equal(
    finalized.visualReferenceContract.acceptanceBoundary.selectedReferenceIsFinalAcceptance,
    false
  );
  assert.deepEqual(
    finalized.visualReferenceContract.acceptanceBoundary.finalAcceptanceViewports,
    ["desktop", "tablet", "mobile"]
  );

  const weakReport = structuredClone(report);
  weakReport.scorecard.responsiveViability.score = 5;
  const refused = await finalizeOptimizedVisualOrientation({
    plan: fixture.plan,
    desktopEvidence: fixture.evidence,
    desktopSelection: fixture.selection,
    evidence: pair,
    report: weakReport,
    projectRoot: fixture.workspace.root
  });
  assert.equal(refused.status, "refused");
  assert.ok(refused.issues.some(
    (issue) => /responsive-viability-below-7/.test(issue.message)
  ));
});

test("orchestrator persists staged artifacts and creates no selected file before pair finalization", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "design-lagann-optimized-workflow-"));
  const planned = await createOptimizedOrientationPlan({
    projectRoot,
    brief: brief(),
    projectDna: dna()
  });
  const workspace = await desktopWorkspace(planned.plan);
  const submissions = [];
  for (const submission of workspace.submissions) {
    const source = path.join(workspace.root, submission.images.desktop.path);
    const target = path.join(projectRoot, submission.images.desktop.path);
    await writeFile(target, await readFile(source));
    submissions.push(submission);
  }
  const bound = await bindOptimizedDesktopOrientationImages({
    projectRoot,
    submissions
  });
  const report = desktopCriticReport(planned.plan, bound.evidence);
  const pending = await evaluateOptimizedDesktopOrientation({
    projectRoot,
    report
  });
  const selected = await evaluateOptimizedDesktopOrientation({
    projectRoot,
    humanApproval: {
      status: "approved",
      candidateId: pending.selection.recommendedCandidateId,
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:00:00.000Z",
      note: "Approved after reviewing every evidence-bound desktop direction."
    }
  });
  const paths = visualOrientationPaths(projectRoot);
  await assert.rejects(readFile(paths.selectedVisualReference, "utf8"), /ENOENT/);

  const candidate = planned.plan.candidates.find(
    (item) => item.id === selected.selection.selectedCandidateId
  );
  const mobile = `${candidate.id}-mobile.webp`;
  await writeFile(path.join(projectRoot, mobile), Buffer.from("selected-mobile"));
  const pair = await bindOptimizedSelectedMobileOrientation({
    projectRoot,
    submission: {
      candidateId: candidate.id,
      requestId: selected.selection.mobileGenerationRequest.requestId,
      images: {
        mobile: {
          path: mobile,
          promptSha256: candidate.prompts.mobile.sha256
        }
      },
      provenance: {
        provider: "OpenAI",
        model: "gpt-image-2",
        generatedAt: "2026-07-23T12:05:00.000Z",
        generationMode: "external",
        humanEdits: "none"
      }
    }
  });
  await assert.rejects(readFile(paths.selectedVisualReference, "utf8"), /ENOENT/);

  const finalized = await finalizeOptimizedOrientation({
    projectRoot,
    report: pairCriticReport(
      {
        plan: planned.plan,
        selection: selected.selection
      },
      pair.evidence
    )
  });
  assert.equal(finalized.phase, "visual-reference-selected");
  assert.equal(
    JSON.parse(await readFile(paths.selectedVisualReference, "utf8")).candidateId,
    candidate.id
  );
  const referenceBinding = await bindVisualReferenceToBuild({
    projectRoot,
    buildCaptures: [
      {
        id: "build-desktop",
        viewport: "desktop",
        sha256: "c".repeat(64),
        capturedAt: "2026-07-23T12:15:00.000Z",
        width: 1440,
        height: 1000
      },
      {
        id: "build-mobile",
        viewport: "mobile",
        sha256: "d".repeat(64),
        capturedAt: "2026-07-23T12:15:00.000Z",
        width: 390,
        height: 844
      }
    ],
    issuedAt: "2026-07-23T12:20:00.000Z"
  });
  assert.equal(
    referenceBinding.phase,
    "independent-reference-comparison-required"
  );
  assert.equal(referenceBinding.binding.referenceFrames.length, 2);
});

test("CLI and MCP expose the optimized path with explicit quality boundaries", async () => {
  const cliPath = path.join(repositoryRoot, "apps", "cli", "src", "cli.mjs");
  const { stdout } = await execFileAsync(process.execPath, [cliPath, "help"], {
    cwd: repositoryRoot
  });
  for (const command of [
    "orientation-opt-plan",
    "orientation-opt-desktop-bind",
    "orientation-opt-desktop-select",
    "orientation-opt-mobile-bind",
    "orientation-opt-finalize"
  ]) {
    assert.match(stdout, new RegExp(command));
  }

  const listed = await handleRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  });
  const tools = new Map(listed.result.tools.map((tool) => [tool.name, tool]));
  for (const name of [
    "create_optimized_visual_orientation_plan",
    "bind_optimized_orientation_desktops",
    "select_optimized_orientation_desktop",
    "bind_optimized_selected_mobile",
    "finalize_optimized_visual_orientation"
  ]) {
    assert.ok(tools.has(name), `${name} should be listed`);
  }
  assert.match(
    tools.get("finalize_optimized_visual_orientation").description,
    /never grants implementation acceptance/i
  );
  assert.match(
    tools.get("bind_optimized_orientation_desktops").description,
    /desktop-only evidence cannot become a selected reference/i
  );
});
