import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createAdaptivePlan,
  formatWorkflowProfileDisclosure,
  normalizeWorkflowProfile
} from "../packages/orchestrator/src/adaptive.mjs";
import {
  artDirectionThreshold,
  validateBrief
} from "../packages/schemas/src/index.mjs";
import { normalizeTypographyBrief } from "../packages/type-router/src/index.mjs";
import { createVisualOrientationPlan } from "../packages/visual-orienter/src/index.mjs";

const superQualityAliases = ["super-quality", "superquality", "super_quality"];

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-mode-disclosure-"));
}

test("super quality aliases resolve to the canonical quality profile everywhere", () => {
  for (const alias of superQualityAliases) {
    assert.deepEqual(normalizeWorkflowProfile(alias), {
      requested: alias,
      profile: "quality",
      legacyAlias: false
    });
    assert.equal(validateBrief({ goal: "Create a flagship site.", mode: alias }).mode, alias);
    assert.equal(
      validateBrief({ goal: "Create a flagship site.", executionProfile: alias }).executionProfile,
      alias
    );
    assert.equal(artDirectionThreshold(alias), 8.8);
    assert.equal(normalizeTypographyBrief({ mode: alias }).mode, "quality");
    assert.equal(
      createVisualOrientationPlan({ goal: "Create a flagship site.", mode: alias }).candidates.length,
      5
    );
  }
});

test("every adaptive plan exposes its mode, target depth, reason, and invariant bar", async () => {
  const expectedLabels = new Map([
    ["fast", "FAST"],
    ["balanced", "BALANCED"],
    ["quality", "QUALITY"]
  ]);
  for (const [profile, displayLabel] of expectedLabels) {
    const plan = await createAdaptivePlan({
      projectRoot: await temporaryProject(),
      profile,
      brief: { goal: "Create a distinctive product site.", references: [] },
      createdAt: "2026-07-24T08:00:00.000Z"
    });
    assert.equal(plan.profile, profile);
    assert.equal(plan.displayLabel, displayLabel);
    assert.match(plan.modeBanner, new RegExp(`DESIGN LAGANN MODE: ${displayLabel}`));
    assert.match(plan.targetDepth, /depth:/i);
    assert.ok(plan.selectionReason.length > 0);
    assert.deepEqual(plan.qualityBarDisclosure, {
      id: "elite-v1",
      invariantAcrossModes: true,
      statement: "elite-v1 is invariant: the mode changes exploration and repair depth, never the final quality bar. Acceptance still requires fresh desktop, tablet, and mobile evidence."
    });
    assert.deepEqual(plan.deliveryPolicy, {
      implementationTarget: "local-workspace",
      designDelegationToSites: false,
      sitesUse: "deployment-only",
      sitesDeploymentCondition: "explicit-user-request-or-existing-openai-hosting-json",
      statement: "Create and edit the website in the current local workspace. Do not delegate design or implementation to Sites; use Sites only for deployment when the user explicitly requests it or the project already contains .openai/hosting.json."
    });
  }
});

test("aliases remain visible while execution stays canonical", async () => {
  const superQuality = await createAdaptivePlan({
    projectRoot: await temporaryProject(),
    profile: "super_quality",
    brief: { goal: "Create a launch-quality editorial site.", references: [] },
    createdAt: "2026-07-24T08:00:00.000Z"
  });
  assert.equal(superQuality.requestedProfile, "super_quality");
  assert.equal(superQuality.profile, "quality");
  assert.equal(superQuality.profileAlias, "super_quality->quality");
  assert.equal(superQuality.displayLabel, "QUALITY");

  const economy = await createAdaptivePlan({
    projectRoot: await temporaryProject(),
    profile: "economy",
    brief: { goal: "Create a small focused site.", references: [] },
    createdAt: "2026-07-24T08:00:00.000Z"
  });
  assert.equal(economy.profile, "fast");
  assert.equal(economy.legacyModeAlias, "economy->fast");
  assert.equal(economy.displayLabel, "FAST");
});

test("the formatter is deterministic and profile-specific", () => {
  const selection = { reasons: ["A flagship release requires maximum exploration."] };
  const disclosure = formatWorkflowProfileDisclosure("superquality", selection);
  assert.equal(disclosure.displayLabel, "QUALITY");
  assert.match(disclosure.targetDepth, /5 desktop directions/i);
  assert.equal(disclosure.selectionReason, selection.reasons[0]);
  assert.match(disclosure.banner, /elite-v1 \(invariant\)/i);
});
