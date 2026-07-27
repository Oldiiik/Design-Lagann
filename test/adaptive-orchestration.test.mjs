import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
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
} from "../packages/orchestrator/src/adaptive.mjs";
import { ART_DIRECTION_DIMENSIONS, VISION_RUBRIC_IDS } from "../packages/schemas/src/index.mjs";
import { routeTypography } from "../packages/type-router/src/index.mjs";
import { evaluateArtDirection } from "../packages/visual-evaluator/src/index.mjs";

const profiles = ["fast", "balanced", "quality"];

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-adaptive-"));
}

function visionReport(score) {
  return {
    schemaVersion: "0.4.0",
    evidence: {
      requestId: "adaptive-profile-parity",
      stage: "after",
      screenshots: [{ viewport: "desktop", sha256: "a".repeat(64) }]
    },
    provenance: {
      critic: "independent-art-director",
      model: "vision-fixture",
      generatedAt: "2026-07-23T12:00:00.000Z",
      independentOfRepair: true
    },
    confidence: 0.92,
    verdict: "accept",
    rubricCoverage: VISION_RUBRIC_IDS.map((id) => ({
      id,
      score: score / 2.5,
      gatesPassed: true,
      evidence: `${id} has screenshot-bound evidence.`
    })),
    scorecard: Object.fromEntries(
      ART_DIRECTION_DIMENSIONS.map((dimension) => [
        dimension.id,
        {
          score,
          evidence: `${dimension.id} is visibly resolved in the supplied frame.`,
          blocker: false
        }
      ])
    ),
    thesis: {
      statement: "The product object controls the editorial reading path.",
      visibleProof: ["The object interrupts and anchors the headline axis."],
      contradictions: []
    },
    aiLikelihood: { score: 0.1, tells: [] },
    memoryHook: "The product object cutting through the headline.",
    strongestMoment: "The opening object and type lockup.",
    weakestMoment: "The restrained transition into details.",
    structuralBlockers: [],
    findings: []
  };
}

test("profiles change effort but share one immutable elite-v1 acceptance contract", async () => {
  assert.deepEqual(normalizeWorkflowProfile("economy"), {
    requested: "economy",
    profile: "fast",
    legacyAlias: true
  });
  assert.equal(ELITE_QUALITY_CONTRACT.id, "elite-v1");
  assert.match(ELITE_QUALITY_CONTRACT_DIGEST, /^[a-f0-9]{64}$/);
  assert.deepEqual(workflowProfile("fast").targetMinutes, [8, 15]);
  assert.deepEqual(workflowProfile("balanced").targetMinutes, [20, 35]);
  assert.deepEqual(workflowProfile("quality").targetMinutes, [45, 90]);
  assert.deepEqual(workflowProfile("quality").referenceTarget, [5, 7]);
  assert.deepEqual(workflowProfile("fast").iterationViewports, ["desktop", "mobile"]);
  assert.deepEqual(workflowProfile("quality").iterationViewports, ["desktop", "tablet", "mobile"]);

  const plans = [];
  for (const profile of profiles) {
    const projectRoot = await temporaryProject();
    plans.push(await createAdaptivePlan({
      projectRoot,
      profile,
      brief: { goal: "Build a focused product page.", references: [] },
      createdAt: "2026-07-23T12:00:00.000Z"
    }));
  }
  assert.deepEqual(
    plans.map((plan) => plan.qualityContractDigest),
    profiles.map(() => ELITE_QUALITY_CONTRACT_DIGEST)
  );
  assert.ok(plans.every((plan) => plan.qualityContract.semanticScoreFloor === 8.8));
  assert.ok(plans.every((plan) => (
    plan.tasks.find((task) => task.id === "acceptance-proof").status === "run"
  )));
  assert.ok(plans.every((plan) => (
    plan.capturePlan.acceptanceViewports.join(",") === "desktop,tablet,mobile"
  )));
  assert.ok(plans.every((plan) => validateAdaptivePlan(plan) === plan));
  assert.throws(
    () => validateAdaptivePlan({
      ...plans[0],
      tasks: plans[0].tasks.map((task) => (
        task.id === "acceptance-proof" ? { ...task, status: "skip" } : task
      ))
    }),
    /cannot skip required task acceptance-proof/i
  );
});

test("identical final evidence has identical acceptance in every profile", () => {
  const below = profiles.map((profile) => evaluateArtDirection(visionReport(8.7), profile));
  assert.ok(below.every((result) => result.passed === false));
  assert.ok(below.every((result) => result.threshold === 8.8));

  const qualified = profiles.map((profile) => evaluateArtDirection(visionReport(9.2), profile));
  assert.ok(qualified.every((result) => result.passed === true));
  assert.deepEqual(
    qualified.map((result) => result.acceptancePolicy),
    profiles.map(() => "elite-v1")
  );
});

test("typography quality cannot be downgraded by a faster profile", () => {
  const input = {
    brandVoice: ["warm", "editorial", "crafted"],
    contentDensity: "medium",
    languages: ["en"]
  };
  const routed = profiles.map((mode) => routeTypography({ ...input, mode }));
  assert.ok(routed.every((result) => result.selection.id === "editorial-warmth"));
  assert.ok(routed.every((result) => result.quality.score >= 8.2));
  assert.deepEqual(
    routed.map((result) => result.quality.score),
    profiles.map(() => routed[0].quality.score)
  );
});

test("auto chooses depth from scope signals without changing the quality contract", async () => {
  const fast = await createAdaptivePlan({
    projectRoot: await temporaryProject(),
    profile: "auto",
    brief: {
      goal: "Build a small pickup page.",
      sections: ["Hero", "Proof", "Pickup"],
      references: [{ url: "https://example.com", approved: true }]
    },
    signals: { strongReference: true, smallScope: true },
    createdAt: "2026-07-23T12:00:00.000Z"
  });
  assert.equal(fast.profile, "fast");
  assert.equal(fast.qualityContractDigest, ELITE_QUALITY_CONTRACT_DIGEST);
  assert.equal(
    fast.tasks.find((task) => task.id === "deep-discovery").status,
    "skip"
  );
  assert.equal(
    fast.tasks.find((task) => task.id === "visual-orientation").status,
    "run",
    "a strong-reference label alone cannot replace current adopted direction evidence"
  );

  const quality = await createAdaptivePlan({
    projectRoot: await temporaryProject(),
    profile: "auto",
    brief: {
      goal: "Build a flagship campaign showcase.",
      references: []
    },
    signals: { showcaseRisk: true },
    createdAt: "2026-07-23T12:00:00.000Z"
  });
  assert.equal(quality.profile, "quality");
  assert.equal(quality.qualityContractDigest, ELITE_QUALITY_CONTRACT_DIGEST);
});

test("triage routes only justified specialists and regional repair stays bounded", () => {
  const triage = createCriticTriage({
    profile: "balanced",
    dimensions: { sectionRhythm: 7.4, materialDiscipline: 9.1 },
    findings: []
  });
  assert.deepEqual(triage.specialists, ["page-rhythm"]);

  const repair = createRegionalRepairPlan([
    {
      id: "process-rhythm",
      category: "rhythm",
      severity: 2,
      region: "#process",
      viewport: "mobile",
      rootCause: "The process steps collapse into one undifferentiated block.",
      recommendation: "Restore the intended stepped reading rhythm.",
      files: ["styles.css"]
    },
    {
      id: "process-rhythm-duplicate",
      category: "rhythm",
      severity: 1,
      region: "#process",
      rootCause: "The process steps collapse into one undifferentiated block.",
      files: ["styles.css"]
    }
  ], { profile: "fast" });
  assert.equal(repair.repairs.length, 1);
  assert.equal(repair.repairs[0].screenshotEvidence.cropRequired, true);
  assert.equal(repair.maxRepairPasses, 1);
  assert.deepEqual(repair.allowedFiles, ["styles.css"]);
  assert.deepEqual(repair.acceptanceRequiresFreshWholePage, ["desktop", "tablet", "mobile"]);
});

test("risk escalates effort depth without changing the acceptance policy", () => {
  const fast = recommendProfileEscalation({
    profile: "fast",
    blockers: ["generic-composition"]
  });
  assert.equal(fast.escalated, true);
  assert.equal(fast.to, "balanced");

  const balanced = recommendProfileEscalation({
    profile: "balanced",
    semanticScore: 7.7,
    responsiveUncertainty: true
  });
  assert.equal(balanced.to, "quality");
  assert.match(balanced.rule, /never lowers or bypasses elite-v1/i);

  const quality = recommendProfileEscalation({
    profile: "quality",
    hardGateFailures: ["contrast"]
  });
  assert.equal(quality.escalated, false);
  assert.equal(quality.to, "quality");
});

test("telemetry never fabricates tokens or quality gain", () => {
  const incomplete = summarizeRunTelemetry({
    profile: "fast",
    startedAt: "2026-07-23T12:00:00.000Z",
    finishedAt: "2026-07-23T12:10:00.000Z",
    tokens: null,
    qualityBefore: 7,
    qualityAfter: 9,
    evidenceComplete: false
  });
  assert.equal(incomplete.tokens.status, "unreported");
  assert.equal(incomplete.tokens.total, null);
  assert.equal(incomplete.quality.gain, null);
  assert.equal(incomplete.efficiency.valueIndex, null);

  const complete = summarizeRunTelemetry({
    profile: "quality",
    startedAt: "2026-07-23T12:00:00.000Z",
    finishedAt: "2026-07-23T13:00:00.000Z",
    tokens: { input: 30_000, output: 10_000 },
    qualityBefore: 7.5,
    qualityAfter: 9,
    evidenceComplete: true
  });
  assert.equal(complete.quality.gain, 1.5);
  assert.equal(complete.tokens.total, 40_000);
  assert.equal(complete.efficiency.qualityGainPerMinute, 0.025);
  assert.equal(complete.efficiency.qualityGainPer10kTokens, 0.375);
});
