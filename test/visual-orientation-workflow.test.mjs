import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  bindOrientationImages,
  bindVisualReferenceToBuild,
  compareVisualReference,
  createOrientationPlan,
  evaluateOrientation,
  visualOrientationPaths
} from "../packages/orchestrator/src/orientation.mjs";
import { buildDesignArtifacts } from "../packages/orchestrator/src/index.mjs";
import { NativeDesignDnaProvider } from "../packages/design-dna-adapter/src/index.mjs";
import { ORIENTATION_SCORE_DIMENSIONS } from "../packages/visual-orienter/src/index.mjs";
import { REFERENCE_COMPARISON_DIMENSIONS } from "../packages/visual-evaluator/src/reference-comparison.mjs";
import { handleRequest } from "../packages/mcp-server/src/server.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const orientationDimensions = ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id);

function fixtureBrief() {
  return {
    goal: "Help readers reserve a small-press first edition",
    audience: "Readers of contemporary translated fiction",
    primaryAction: "reserve a numbered copy",
    brandTruths: ["Each edition is physically made and intentionally scarce"],
    desiredRecall: "The book opening the page itself",
    mode: "economy",
    sections: ["Featured edition", "Opening excerpt", "Autumn list", "Reservation"],
    interactions: ["open the featured book", "reserve or release a copy"],
    requiredStates: ["closed book", "open book", "reserved"],
    constraints: ["local assets only"],
    forbiddenPatterns: ["generic split hero"],
    brandVoice: ["warm", "editorial", "crafted"],
    languages: ["en"],
    assets: [{
      id: "book-cover",
      role: "hero",
      description: "Art-directed physical book cover",
      visualIntent: "product"
    }]
  };
}

function orientationDna() {
  return {
    creativeThesis: "A new book physically opens the page.",
    creativeDirection: {
      brandTruth: "The book is an object made to be handled.",
      desiredRecall: "The book cover becoming the page."
    }
  };
}

function captureFixture() {
  const styles = [
    {
      color: "rgb(28, 24, 20)",
      backgroundColor: "rgb(248, 242, 231)",
      fontFamily: "Georgia",
      fontSize: "16px",
      borderRadius: "0px",
      borderColor: "rgb(28, 24, 20)",
      boxShadow: "none",
      gap: "16px"
    },
    {
      color: "rgb(28, 24, 20)",
      backgroundColor: "rgb(224, 107, 72)",
      fontFamily: "Georgia",
      fontSize: "48px",
      borderRadius: "8px",
      borderColor: "rgb(28, 24, 20)",
      boxShadow: "0 8px 24px rgba(28, 24, 20, 0.12)",
      gap: "32px"
    }
  ];
  return {
    id: "editorial-reference",
    url: "https://example.com/editorial-reference",
    captures: [{
      name: "desktop",
      viewport: { width: 1440, height: 1000 },
      evidence: {
        title: "Editorial reference",
        landmarks: { headings: 3, sections: 4 },
        scroll: { height: 3200 },
        styles
      }
    }]
  };
}

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-orientation-"));
}

async function writeOrientationImages(projectRoot, plan) {
  const submissions = [];
  for (const [index, candidate] of plan.candidates.entries()) {
    const desktop = `${candidate.id}-desktop.png`;
    const mobile = `${candidate.id}-mobile.webp`;
    await writeFile(
      path.join(projectRoot, desktop),
      Buffer.from(`desktop-${index}-${candidate.fingerprint}`)
    );
    await writeFile(
      path.join(projectRoot, mobile),
      Buffer.from(`mobile-${index}-${candidate.fingerprint}`)
    );
    submissions.push({
      candidateId: candidate.id,
      images: {
        desktop: {
          path: desktop,
          promptSha256: candidate.prompts.desktop.sha256
        },
        mobile: {
          path: mobile,
          promptSha256: candidate.prompts.mobile.sha256
        }
      },
      provenance: {
        provider: "OpenAI",
        model: "gpt-image-2",
        generatedAt: `2026-07-23T10:0${index}:00.000Z`,
        generationMode: "external",
        generationId: `external-generation-${index}`,
        humanEdits: "none"
      }
    });
  }
  return submissions;
}

function criticReport(plan, evidence) {
  return {
    schemaVersion: "0.4.0",
    planId: plan.id,
    critic: {
      provider: "Independent Critic Lab",
      model: "critic-model-2",
      criticId: "blind-orientation-critic",
      generatedAt: "2026-07-23T11:00:00.000Z",
      independentOfGeneration: true
    },
    limitations: {
      generatedImagesAreCreativeReferences: true,
      pixelSimilarityIsNotAcceptance: true,
      implementationRequiresVerification: true
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
          viewports: ["desktop", "mobile"],
          dimensions: orientationDimensions
        },
        evidence: {
          imageHashes: {
            desktop: bound.images.desktop.sha256,
            mobile: bound.images.mobile.sha256
          }
        },
        scorecard: Object.fromEntries(orientationDimensions.map((id) => [
          id,
          {
            score: id === "implementationDifficulty"
              ? 3 + index
              : id === "accessibilityFakeUiRisk"
                ? 2
                : 8 - index * 0.4,
            evidence: `${id} was judged against both bound full-page images.`,
            blocker: false
          }
        ])),
        observations: {
          dominantRelationship: `${candidate.name} organizes object, type, and action as one relationship.`,
          hierarchy: "The focal object leads to the title and then the reservation action.",
          responsiveTransformation: "Mobile changes crop and reading order while retaining the same thesis.",
          implementationRisks: ["The signature relationship needs browser-rendered proof."],
          fakeUiRisks: [],
          assetMediumImplications: [candidate.assetMediumHypothesis]
        },
        findings: []
      };
    })
  };
}

async function approvedWorkflow(projectRoot) {
  const brief = fixtureBrief();
  const planResult = await createOrientationPlan({
    projectRoot,
    brief,
    projectDna: orientationDna()
  });
  const bindResult = await bindOrientationImages({
    projectRoot,
    submissions: await writeOrientationImages(projectRoot, planResult.plan)
  });
  const report = criticReport(planResult.plan, bindResult.evidence);
  const pending = await evaluateOrientation({ projectRoot, report });
  const approved = await evaluateOrientation({
    projectRoot,
    humanApproval: {
      status: "approved",
      candidateId: pending.selection.recommendedCandidateId,
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:00:00.000Z",
      note: "The evidence-backed relationship fits the product truth."
    }
  });
  return {
    brief,
    plan: planResult.plan,
    evidence: bindResult.evidence,
    pending,
    approved
  };
}

test("orientation workflow persists external evidence and never adopts a provisional recommendation", async () => {
  const projectRoot = await temporaryProject();
  const brief = fixtureBrief();
  const paths = visualOrientationPaths(projectRoot);
  const planned = await createOrientationPlan({
    projectRoot,
    brief,
    projectDna: orientationDna()
  });

  assert.equal(planned.phase, "external-image-generation-required");
  assert.equal(planned.generationPerformed, false);
  assert.equal(planned.plan.generationContract.execution, "external-only");
  assert.equal(
    JSON.parse(await readFile(paths.plan, "utf8")).id,
    planned.plan.id
  );

  const bound = await bindOrientationImages({
    projectRoot,
    submissions: await writeOrientationImages(projectRoot, planned.plan)
  });
  assert.equal(bound.phase, "independent-orientation-critique-required");
  assert.match(bound.evidence.statement, /No image generation occurred/i);
  assert.equal(
    JSON.parse(await readFile(paths.evidence, "utf8")).bindingId,
    bound.evidence.bindingId
  );

  const pending = await evaluateOrientation({
    projectRoot,
    report: criticReport(planned.plan, bound.evidence)
  });
  assert.equal(pending.phase, "human-approval-required");
  assert.equal(pending.selection.status, "awaiting-human-approval");
  assert.equal(pending.artifacts.selectedVisualReference, null);
  await assert.rejects(readFile(paths.selectedVisualReference, "utf8"), /ENOENT/);

  const approved = await evaluateOrientation({
    projectRoot,
    humanApproval: {
      status: "approved",
      candidateId: pending.selection.recommendedCandidateId,
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:00:00.000Z",
      note: "Approved after reviewing the bound desktop and mobile directions."
    }
  });
  assert.equal(approved.phase, "visual-reference-selected");
  assert.equal(approved.selection.status, "human-approved");
  assert.equal(
    JSON.parse(await readFile(paths.selectedVisualReference, "utf8")).status,
    "human-approved-reference"
  );
});

test("design artifacts persist qualified type routing beside approved visual-reference metadata", async () => {
  const projectRoot = await temporaryProject();
  const workflow = await approvedWorkflow(projectRoot);
  const provider = new NativeDesignDnaProvider();
  const referenceDna = await provider.extract({
    capture: captureFixture(),
    role: "typography and editorial rhythm"
  });
  const artifacts = await buildDesignArtifacts({
    projectRoot,
    brief: workflow.brief,
    referenceDnas: [referenceDna]
  });

  assert.equal(artifacts.typeRouting.status, "qualified");
  assert.equal(artifacts.typeRouting.gates.passed, true);
  assert.deepEqual(
    Object.keys(artifacts.typeManifest.roles),
    ["display", "body", "utility", "data"]
  );
  assert.equal(
    artifacts.visualReference.candidateId,
    workflow.approved.selection.selectedCandidateId
  );

  const stateDir = path.join(projectRoot, ".design-lagann");
  const typeManifest = JSON.parse(
    await readFile(path.join(stateDir, "type-manifest.json"), "utf8")
  );
  const assetManifest = JSON.parse(
    await readFile(path.join(stateDir, "asset-manifest.json"), "utf8")
  );
  const designArtifacts = JSON.parse(
    await readFile(path.join(stateDir, "design-artifacts.json"), "utf8")
  );
  const projectDna = JSON.parse(
    await readFile(path.join(stateDir, "project-design-dna.json"), "utf8")
  );
  const designMarkdown = await readFile(path.join(projectRoot, "DESIGN.md"), "utf8");

  assert.equal(typeManifest.generatedBy, "@design-lagann/type-router");
  assert.equal(typeManifest.gates.passed, true);
  assert.equal(assetManifest.routedAssetCount, 1);
  assert.equal(
    designArtifacts.selectedVisualReference.candidateId,
    workflow.approved.selection.selectedCandidateId
  );
  assert.equal(projectDna.selectedVisualReference.pixelSimilarityIsAcceptance, false);
  assert.match(designMarkdown, /Implementation source of truth: `\.design-lagann\/type-manifest\.json`/);
  assert.match(designMarkdown, /creative references, not implementation specifications or pixel targets/i);
});

test("approved reference binding requires a separate semantic critic and preserves unverified refusal", async () => {
  const projectRoot = await temporaryProject();
  await approvedWorkflow(projectRoot);
  const paths = visualOrientationPaths(projectRoot);
  const bound = await bindVisualReferenceToBuild({
    projectRoot,
    buildCaptures: [
      {
        id: "build-desktop",
        viewport: "desktop",
        sha256: "c".repeat(64),
        capturedAt: "2026-07-23T12:10:00.000Z",
        width: 1440,
        height: 1000
      },
      {
        id: "build-mobile",
        viewport: "mobile",
        sha256: "d".repeat(64),
        capturedAt: "2026-07-23T12:10:00.000Z",
        width: 390,
        height: 844
      }
    ],
    issuedAt: "2026-07-23T12:20:00.000Z"
  });

  assert.equal(bound.phase, "independent-reference-comparison-required");
  assert.match(bound.message, /pixel similarity is not an acceptance criterion/i);
  assert.deepEqual(
    Object.keys(bound.binding.contract.expectations),
    REFERENCE_COMPARISON_DIMENSIONS.map((dimension) => dimension.id)
  );
  assert.equal(
    JSON.parse(await readFile(paths.referenceBinding, "utf8")).requestId,
    bound.binding.requestId
  );

  const comparison = await compareVisualReference({
    projectRoot,
    report: null,
    evaluatedAt: "2026-07-23T12:25:00.000Z"
  });
  assert.equal(comparison.phase, "reference-comparison-unverified");
  assert.equal(comparison.comparison.status, "unverified");
  assert.equal(comparison.comparison.evidence.valid, false);
  assert.equal(
    JSON.parse(await readFile(paths.referenceComparison, "utf8")).status,
    "unverified"
  );
});

test("a later human rejection prevents stale approved-reference reuse while retaining its audit file", async () => {
  const projectRoot = await temporaryProject();
  await approvedWorkflow(projectRoot);
  const paths = visualOrientationPaths(projectRoot);
  const rejected = await evaluateOrientation({
    projectRoot,
    humanApproval: {
      status: "rejected",
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:30:00.000Z",
      note: "The direction is no longer approved for implementation."
    }
  });
  assert.equal(rejected.phase, "visual-reference-rejected");
  assert.equal(rejected.selection.status, "human-rejected");
  assert.equal(
    JSON.parse(await readFile(paths.selectedVisualReference, "utf8")).status,
    "human-approved-reference"
  );

  await assert.rejects(
    bindVisualReferenceToBuild({
      projectRoot,
      buildCaptures: [{
        id: "build-desktop",
        viewport: "desktop",
        sha256: "c".repeat(64),
        capturedAt: "2026-07-23T12:40:00.000Z"
      }],
      issuedAt: "2026-07-23T12:45:00.000Z"
    }),
    /current orientation selection does not approve/i
  );

  const provider = new NativeDesignDnaProvider();
  const referenceDna = await provider.extract({
    capture: captureFixture(),
    role: "typography and editorial rhythm"
  });
  await assert.rejects(
    buildDesignArtifacts({
      projectRoot,
      brief: fixtureBrief(),
      referenceDnas: [referenceDna]
    }),
    /direction pair must be explicitly approved first/i
  );
});

test("CLI and MCP expose bounded orientation tools without claiming local image generation", async () => {
  const cliPath = path.join(repositoryRoot, "apps", "cli", "src", "cli.mjs");
  const { stdout: help } = await execFileAsync(process.execPath, [cliPath, "help"], {
    cwd: repositoryRoot
  });
  assert.match(help, /orientation-plan/);
  assert.match(help, /orientation-bind/);
  assert.match(help, /orientation-select/);
  assert.match(help, /reference-bind/);
  assert.match(help, /reference-compare/);
  assert.doesNotMatch(help, /(?:locally|inside Design Lagann).{0,30}(?:call|generate).{0,30}GPT Image 2/i);

  const listed = await handleRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  });
  const names = listed.result.tools.map((tool) => tool.name);
  for (const name of [
    "create_visual_orientation_plan",
    "bind_visual_orientation_images",
    "select_visual_orientation",
    "bind_visual_reference_to_build",
    "compare_visual_reference"
  ]) {
    assert.ok(names.includes(name), `${name} should be listed`);
  }
  const planTool = listed.result.tools.find(
    (tool) => tool.name === "create_visual_orientation_plan"
  );
  assert.match(planTool.description, /never calls GPT Image 2/i);

  const projectRoot = await temporaryProject();
  const called = await handleRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "create_visual_orientation_plan",
      arguments: {
        projectRoot,
        brief: fixtureBrief(),
        projectDna: orientationDna()
      }
    }
  });
  assert.equal(called.result.isError, undefined);
  const value = JSON.parse(called.result.content[0].text);
  assert.equal(value.phase, "external-image-generation-required");
  assert.equal(value.generationPerformed, false);
});
