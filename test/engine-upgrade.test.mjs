import assert from "node:assert/strict";
import test from "node:test";

import {
  REFERENCE_SOURCE_REGISTRY,
  createReferenceFidelityContract,
  normalizeReferences,
  resolveReferenceSources
} from "../packages/reference-search/src/index.mjs";
import { createAssetManifest, routeAsset } from "../packages/asset-router/src/index.mjs";
import { createMotionVideoStage } from "../packages/orchestrator/src/motion-video.mjs";
import { createSitePlan, validateSitePlan } from "../packages/orchestrator/src/site-plan.mjs";

test("registers Watermelon UI, Variant, and GrayBlocks according to their real source roles", () => {
  assert.deepEqual(REFERENCE_SOURCE_REGISTRY.map((source) => source.id), [
    "watermelon-ui",
    "variant",
    "grayblocks"
  ]);
  assert.deepEqual(resolveReferenceSources().map((source) => source.kind), [
    "component-system",
    "inspiration-feed",
    "cross-tool-block-library"
  ]);
  const normalized = normalizeReferences(["https://variant.com/"])[0];
  assert.equal(normalized.registrySource.id, "variant");
  assert.match(normalized.registrySource.ingestion, /never as an assumed installable UI package/i);
});

test("reference-close mode requires approval, rights, and a bound source digest", () => {
  const sourceDigest = "a".repeat(64);
  const close = createReferenceFidelityContract({
    referenceId: "owned-reference",
    sourceDigest,
    ownership: "user-owned",
    approved: true
  });
  assert.equal(close.mode, "reference-close");
  assert.equal(close.tolerances.headlineLineCountDelta, 0);
  assert.ok(close.measurableRelationships.some((item) => /asset crop/i.test(item)));

  const inspiration = createReferenceFidelityContract({
    referenceId: "public-inspiration",
    sourceDigest,
    ownership: "inspiration-only",
    approved: true
  });
  assert.equal(inspiration.mode, "principle-synthesis");
  assert.equal(inspiration.tolerances, null);
});

test("site planning precedes creation and resolves the optional video output stage", () => {
  const plan = createSitePlan({
    goal: "Launch an ocean conservation experience.",
    audience: "People ready to fund whale-habitat restoration.",
    primaryAction: "Adopt a migration corridor",
    sections: ["Whale encounter", "Migration evidence", "Funding action"],
    videoAnimation: true
  }, { profile: "balanced", createdAt: "2026-07-26T00:00:00.000Z" });
  assert.equal(validateSitePlan(plan), plan);
  assert.equal(plan.motionVideoStage.engine, "remotion");
  assert.equal(plan.motionVideoStage.stageCount, 1);
  assert.equal(plan.assetBoundaries.svgAllowed, false);
  assert.match(plan.assetBoundaries.isolatedObjectRule, /whale.*transparent PNG/i);
});

test("Remotion remains absent for website-only work and collapses video work into one stage", () => {
  const website = createMotionVideoStage({ goal: "Build a responsive landing page" });
  assert.equal(website.status, "not-requested");
  assert.equal(website.stageCount, 0);
  assert.deepEqual(website.packages, []);

  const video = createMotionVideoStage({ outputs: ["launch video MP4"] });
  assert.equal(video.status, "requested");
  assert.equal(video.stageCount, 1);
  assert.deepEqual(video.packages, ["remotion", "@remotion/renderer"]);
  assert.equal(video.assetPolicy.svgAllowed, false);
});

test("identity lines route to generated raster while functional geometry stays CSS-native", () => {
  const line = routeAsset({
    id: "tidal-line",
    description: "Textured editorial wave divider line",
    source: "generated",
    provider: "image-2",
    prompt: "A hand-inked tidal line"
  });
  assert.equal(line.intent, "decorative");
  assert.equal(line.implementation, "transparent-raster");
  assert.equal(line.compositionContract.mode, "transparent-overlay");
  assert.equal(line.compositionContract.alphaRequired, true);

  const focus = routeAsset({
    id: "focus-ring",
    description: "Focus ring for the primary action",
    functionalGeometry: true
  });
  assert.equal(focus.implementation, "css");
});

test("an isolated whale becomes a PNG-only production object with full-scene context forbidden", () => {
  const manifest = createAssetManifest({
    goal: "Create an ocean landing page",
    generateAssets: true,
    assets: [{
      id: "hero-whale",
      role: "hero-object",
      description: "A humpback whale for the entrance composition",
      source: { type: "generated", provider: "image-2", prompt: "Humpback whale" }
    }]
  });
  const routed = manifest.assets[0];
  const generated = manifest.assetBatchPlan.batches[0].assets[0];
  assert.equal(routed.compositionContract.mode, "isolated-object");
  assert.equal(routed.compositionContract.alphaRequired, true);
  assert.match(generated.expectedOutput, /hero-whale\.png$/);
  assert.equal(generated.generationRequest.alphaRequired, true);
  assert.ok(generated.generationRequest.forbiddenContext.includes("sky"));
  assert.match(generated.generationRequest.prompt, /full entrance or hero composition/i);
});

