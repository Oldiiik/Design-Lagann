import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ORIENTATION_SCORE_DIMENSIONS,
  assessOrientationReadiness,
  bindExternalOrientationImages,
  createVisualOrientationPlan,
  scoreOrientationCandidate,
  selectVisualOrientation,
  sha256File,
  validateOrientationCriticReport,
  verifyBoundOrientationImages
} from "../packages/visual-orienter/src/index.mjs";

const dimensions = ORIENTATION_SCORE_DIMENSIONS.map((dimension) => dimension.id);

function fixtureBrief(mode = "economy") {
  return {
    goal: "Help readers reserve a small-press first edition",
    audience: "Readers of contemporary translated fiction",
    primaryAction: "reserve a numbered copy",
    brandTruths: ["Each edition is physically made and intentionally scarce"],
    desiredRecall: "The book opening the page itself",
    mode,
    sections: ["Featured edition", "Opening excerpt", "Autumn list", "Reservation"],
    interactions: ["open the featured book", "reserve or release a copy"],
    requiredStates: ["closed book", "open book", "reserved"],
    constraints: ["local assets only"],
    forbiddenPatterns: ["generic split hero"],
    assets: [{ id: "book-cover", role: "hero", description: "Art-directed physical book cover" }]
  };
}

function projectDna() {
  return {
    creativeThesis: "A new book physically opens the page.",
    creativeDirection: {
      brandTruth: "The book is an object made to be handled.",
      desiredRecall: "The book cover becoming the page."
    }
  };
}

async function imageWorkspace(plan) {
  const root = await mkdtemp(path.join(os.tmpdir(), "visual-orienter-"));
  const submissions = [];
  for (const [index, candidate] of plan.candidates.entries()) {
    const desktop = `${candidate.id}-desktop.png`;
    const mobile = `${candidate.id}-mobile.webp`;
    await writeFile(path.join(root, desktop), Buffer.from(`desktop-${index}-${candidate.fingerprint}`));
    await writeFile(path.join(root, mobile), Buffer.from(`mobile-${index}-${candidate.fingerprint}`));
    submissions.push({
      candidateId: candidate.id,
      images: {
        desktop: { path: desktop, promptSha256: candidate.prompts.desktop.sha256 },
        mobile: { path: mobile, promptSha256: candidate.prompts.mobile.sha256 }
      },
      provenance: {
        provider: "OpenAI",
        model: "gpt-image-2",
        generatedAt: `2026-07-23T10:0${index}:00.000Z`,
        generationMode: "external",
        generationId: `generation-${index}`,
        humanEdits: "none"
      }
    });
  }
  return { root, submissions };
}

function pngHeader(width, height) {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function criticReport(plan, evidence, scores = {}) {
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
      const candidateScores = scores[candidate.id] || {};
      const score = (id) => candidateScores[id] ?? (
        id === "implementationDifficulty" ? 3 + index :
        id === "accessibilityFakeUiRisk" ? 2 :
        8 - index * 0.4
      );
      const bound = evidence.candidates.find((item) => item.candidateId === candidate.id);
      return {
        candidateId: candidate.id,
        verdict: candidateScores.verdict || (index === 0 ? "shortlist" : "consider"),
        coverage: {
          fullPage: true,
          viewports: ["desktop", "mobile"],
          dimensions
        },
        evidence: {
          imageHashes: {
            desktop: bound.images.desktop.sha256,
            mobile: bound.images.mobile.sha256
          }
        },
        scorecard: Object.fromEntries(dimensions.map((id) => [id, {
          score: score(id),
          evidence: `${id} was judged against both full-page bound images.`,
          blocker: candidateScores.blockers?.includes(id) || false
        }])),
        observations: {
          dominantRelationship: `${candidate.name} visibly organizes type, object, and action around one relationship.`,
          hierarchy: "The primary action follows the focal object without competing modules.",
          responsiveTransformation: "The mobile concept changes crop and reading order while retaining the thesis.",
          implementationRisks: ["The signature relationship needs an effect-free CSS proof."],
          fakeUiRisks: [],
          assetMediumImplications: [candidate.assetMediumHypothesis]
        },
        findings: []
      };
    })
  };
}

test("creates three to five materially distinct GPT Image 2 prompt pairs without generating images", () => {
  const economy = createVisualOrientationPlan(fixtureBrief("economy"), projectDna());
  const quality = createVisualOrientationPlan(fixtureBrief("quality"), projectDna());

  assert.equal(economy.candidates.length, 3);
  assert.equal(quality.candidates.length, 5);
  assert.equal(new Set(quality.candidates.map((candidate) => candidate.fingerprint)).size, 5);
  assert.equal(quality.generationContract.execution, "external-only");
  assert.equal(quality.generationContract.localNodeGeneration, false);
  assert.equal(quality.groundTruthPolicy.generatedImagesAreGroundTruth, false);

  for (const candidate of quality.candidates) {
    for (const viewport of ["desktop", "mobile"]) {
      const prompt = candidate.prompts[viewport];
      assert.equal(prompt.targetModel, "gpt-image-2");
      assert.equal(prompt.fullPage, true);
      assert.equal(prompt.creativeReferenceOnly, true);
      assert.match(prompt.prompt, /creative reference, never an implementation specification/i);
      assert.doesNotMatch(prompt.prompt, /write the CSS|implement in React/i);
      assert.match(prompt.sha256, /^[a-f0-9]{64}$/);
    }
  }
});

test("plan identity and prompts are deterministic", () => {
  const first = createVisualOrientationPlan(fixtureBrief("balanced"), projectDna());
  const second = createVisualOrientationPlan(fixtureBrief("balanced"), projectDna());
  assert.deepEqual(first, second);
  assert.equal(first.candidates.length, 3);
  const sparse = createVisualOrientationPlan(
    { goal: "Introduce an experimental reading tool", mode: "economy" },
    { creativeDirection: { brandTruth: "Reading is nonlinear." } }
  );
  assert.deepEqual(sparse.exactRequirements.map((item) => item.id), ["goal"]);
  assert.equal(sparse.briefContract.fieldEvidence.brandTruth.confidence, "inferred");
  assert.throws(
    () => createVisualOrientationPlan(fixtureBrief(), projectDna(), { candidateCount: 2 }),
    /3 to 5/
  );
});

test("preserves authored direction theses and exact external-generation prompts", () => {
  const directionCandidates = ["fold", "receipt", "window"].map((id, index) => ({
    id,
    name: `Direction ${index + 1}`,
    thesis: `${id} becomes the page architecture`,
    organizingMechanism: id,
    signatureRelationship: `The focal pastry participates in the ${id} structure.`,
    responsiveMutation: `Recompose the ${id} relationship as a mobile edge and reading hinge.`,
    prompts: {
      desktop: `Exact desktop prompt for ${id}.`,
      mobile: { prompt: `Exact mobile prompt for ${id}.` }
    }
  }));
  const plan = createVisualOrientationPlan(
    fixtureBrief("economy"),
    projectDna(),
    { directionCandidates }
  );

  assert.deepEqual(plan.candidates.map((candidate) => candidate.id), ["fold", "receipt", "window"]);
  assert.equal(plan.candidates[1].thesis, "receipt becomes the page architecture");
  assert.equal(plan.candidates[2].prompts.desktop.prompt, "Exact desktop prompt for window.");
  assert.match(plan.candidates[2].prompts.desktop.sha256, /^[a-f0-9]{64}$/);
  assert.throws(
    () => createVisualOrientationPlan(
      fixtureBrief("economy"),
      projectDna(),
      { directionCandidates: directionCandidates.slice(0, 2) }
    ),
    /3 to 5/
  );
});

test("binds externally generated local images to prompts, hashes, and provenance", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });

  assert.equal(evidence.candidates.length, plan.candidates.length);
  assert.match(evidence.bindingId, /^binding-/);
  assert.match(evidence.statement, /No image generation occurred/i);
  for (const candidate of evidence.candidates) {
    for (const viewport of ["desktop", "mobile"]) {
      const image = candidate.images[viewport];
      assert.equal(image.sha256, await sha256File(path.join(fixture.root, image.localPath)));
      assert.equal(image.model, "gpt-image-2");
      assert.match(image.promptSha256, /^[a-f0-9]{64}$/);
    }
  }
  assert.equal((await verifyBoundOrientationImages(plan, evidence)).valid, true);
});

test("binding rejects remote files, wrong prompt hashes, and false local-generation provenance", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const remote = structuredClone(fixture.submissions);
  remote[0].images.desktop.path = "https://example.com/mockup.png";
  await assert.rejects(
    bindExternalOrientationImages(plan, remote, { projectRoot: fixture.root }),
    /local filesystem path/
  );

  const stale = structuredClone(fixture.submissions);
  stale[0].images.desktop.promptSha256 = "0".repeat(64);
  await assert.rejects(
    bindExternalOrientationImages(plan, stale, { projectRoot: fixture.root }),
    /does not match the emitted prompt/
  );

  const localClaim = structuredClone(fixture.submissions);
  localClaim[0].provenance.generationMode = "local";
  await assert.rejects(
    bindExternalOrientationImages(plan, localClaim, { projectRoot: fixture.root }),
    /must be external/
  );
});

test("records an unreported host model honestly without substituting the requested model", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  for (const submission of fixture.submissions) {
    submission.provenance.requestedModel = "gpt-image-2";
    submission.provenance.model = "unreported";
    submission.provenance.notes = "The host image tool did not expose an actual model id.";
  }
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });

  for (const candidate of evidence.candidates) {
    assert.equal(candidate.provenance.requestedModel, "gpt-image-2");
    assert.equal(candidate.provenance.reportedModel, "unreported");
    assert.equal(candidate.provenance.modelStatus, "unreported-by-host");
    assert.equal(candidate.images.desktop.model, "unreported");
    assert.equal(candidate.images.desktop.requestedModel, "gpt-image-2");
  }
  assert.equal((await verifyBoundOrientationImages(plan, evidence)).valid, true);
});

test("rejects a portrait file submitted as desktop evidence", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  await writeFile(
    path.join(fixture.root, fixture.submissions[0].images.desktop.path),
    pngHeader(864, 1821)
  );

  await assert.rejects(
    bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root }),
    /is portrait, expected landscape/
  );
});

test("validates independent per-candidate criticism and complete score coverage", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });
  const report = criticReport(plan, evidence);
  assert.equal(validateOrientationCriticReport(report, { plan, evidence }), report);

  const missing = structuredClone(report);
  delete missing.candidateReports[0].scorecard.originality;
  assert.throws(
    () => validateOrientationCriticReport(missing, { plan, evidence }),
    /scorecard\.originality/
  );

  const dependent = structuredClone(report);
  dependent.critic.independentOfGeneration = false;
  assert.throws(
    () => validateOrientationCriticReport(dependent, { plan, evidence }),
    /independentOfGeneration/
  );

  const wrongHash = structuredClone(report);
  wrongHash.candidateReports[0].evidence.imageHashes.mobile = "f".repeat(64);
  assert.throws(
    () => validateOrientationCriticReport(wrongHash, { plan, evidence }),
    /hash does not match/
  );
});

test("scoring rewards quality while reversing difficulty and accessibility/fake-UI risk", () => {
  const base = {
    candidateId: "candidate",
    verdict: "shortlist",
    scorecard: Object.fromEntries(dimensions.map((id) => [id, {
      score: id === "implementationDifficulty" || id === "accessibilityFakeUiRisk" ? 2 : 8,
      evidence: "Complete evidence.",
      blocker: false
    }]))
  };
  const safe = scoreOrientationCandidate(base);
  const riskyReport = structuredClone(base);
  riskyReport.scorecard.implementationDifficulty.score = 9;
  riskyReport.scorecard.accessibilityFakeUiRisk.score = 9;
  const risky = scoreOrientationCandidate(riskyReport);

  assert.ok(safe.score > risky.score);
  assert.equal(safe.eligible, true);
  assert.equal(risky.eligible, false);
  assert.ok(risky.blockers.includes("high-accessibility-or-fake-ui-risk"));
});

test("refuses selection when images or critic coverage are missing", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const noEvidence = await selectVisualOrientation({ plan });
  assert.equal(noEvidence.status, "refused");
  assert.equal(noEvidence.selectedCandidateId, null);
  assert.ok(noEvidence.issues.some((issue) => issue.code === "MISSING_IMAGE_EVIDENCE"));
  assert.ok(noEvidence.issues.some((issue) => issue.code === "MISSING_CRITIC_REPORT"));

  const readiness = await assessOrientationReadiness({ plan });
  assert.equal(readiness.ready, false);
});

test("selects deterministically after evidence while preserving pending human approval", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });
  const report = criticReport(plan, evidence);
  const result = await selectVisualOrientation({ plan, evidence, report });

  assert.equal(result.status, "awaiting-human-approval");
  assert.equal(result.recommendedCandidateId, plan.candidates[0].id);
  assert.equal(result.selectedCandidateId, null);
  assert.equal(result.humanApproval.status, "pending");
  assert.equal(result.visualReferenceContract.status, "provisional-reference-awaiting-human-approval");
  assert.ok(result.visualReferenceContract.exactRequirements.every((item) => item.confidence === "exact"));
  assert.ok(result.visualReferenceContract.inferredRelationships.every((item) => item.confidence === "inferred"));
  assert.equal(result.visualReferenceContract.acceptanceBoundary.pixelSimilarityIsAcceptance, false);
  assert.equal(result.visualReferenceContract.designDnaExtraction.status, "ready-for-extraction");
});

test("human approval may adopt any eligible candidate without hiding the deterministic recommendation", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });
  const report = criticReport(plan, evidence);
  const approvedId = plan.candidates[1].id;
  const result = await selectVisualOrientation({
    plan,
    evidence,
    report,
    humanApproval: {
      status: "approved",
      candidateId: approvedId,
      decidedBy: "design owner",
      decidedAt: "2026-07-23T12:00:00.000Z",
      note: "Better fit for the available editorial assets."
    }
  });

  assert.equal(result.status, "human-approved");
  assert.equal(result.selectedCandidateId, approvedId);
  assert.notEqual(result.recommendedCandidateId, approvedId);
  assert.equal(result.humanOverride, true);
  assert.equal(result.visualReferenceContract.humanApproval.decidedBy, "design owner");
});

test("selection rehashes files and refuses evidence modified after binding", async () => {
  const plan = createVisualOrientationPlan(fixtureBrief(), projectDna());
  const fixture = await imageWorkspace(plan);
  const evidence = await bindExternalOrientationImages(plan, fixture.submissions, { projectRoot: fixture.root });
  const report = criticReport(plan, evidence);
  const target = evidence.candidates[0].images.desktop.localPath;
  await writeFile(path.join(fixture.root, target), Buffer.from("tampered"));

  const verification = await verifyBoundOrientationImages(plan, evidence);
  assert.equal(verification.valid, false);
  assert.ok(verification.issues.some((issue) => issue.code === "IMAGE_HASH_MISMATCH"));
  const result = await selectVisualOrientation({ plan, evidence, report });
  assert.equal(result.status, "refused");
  assert.ok(result.issues.some((issue) => issue.code === "IMAGE_HASH_MISMATCH"));
});
