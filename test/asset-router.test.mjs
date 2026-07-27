import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSET_QUALITY_DIMENSIONS,
  MEDIA_TYPES,
  NO_SVG_POLICY,
  PROHIBITED_MEDIA_TYPES,
  VISUAL_INTENTS,
  auditSvgUsage,
  classifyVisualIntent,
  computeAssetQualityScore,
  createAssetManifest,
  evaluateMediaGate,
  rankMedia,
  routeAsset
} from "../packages/asset-router/src/index.mjs";

test("classifies visual intent independently of implementation", () => {
  assert.equal(classifyVisualIntent({ description: "Macro photograph of a laminated pistachio croissant" }), "food");
  assert.equal(classifyVisualIntent({ role: "hero", description: "A focal abstract object" }), "hero-object");
  assert.equal(classifyVisualIntent({ description: "Interactive revenue chart with tooltips" }), "data-visualization");
  assert.equal(classifyVisualIntent({ visualIntent: "character", description: "Animated mascot" }), "character");
  assert.equal(classifyVisualIntent("Procedural particle flow field"), "generative-visual");
});

test("ranks supported media deterministically while keeping prohibited SVG routes ineligible and auditable", () => {
  const first = rankMedia("motion-graphic", {
    animated: true,
    interactive: true,
    description: "A stateful onboarding animation"
  });
  const second = rankMedia("motion-graphic", {
    animated: true,
    interactive: true,
    description: "A stateful onboarding animation"
  });

  assert.deepEqual(first, second);
  assert.equal(first.length, MEDIA_TYPES.length + PROHIBITED_MEDIA_TYPES.length);
  assert.equal(first[0].medium, "rive");
  assert.ok(first.every((candidate) => candidate.reason && Number.isFinite(candidate.score)));
  assert.deepEqual(
    new Set(first.filter((candidate) => candidate.eligible).map((candidate) => candidate.medium)),
    new Set(MEDIA_TYPES)
  );
  assert.deepEqual(
    new Set(first.filter((candidate) => !candidate.eligible).map((candidate) => candidate.medium)),
    new Set(PROHIBITED_MEDIA_TYPES)
  );
  assert.ok(!MEDIA_TYPES.includes("svg"));
  assert.ok(!MEDIA_TYPES.includes("icon-library"));
});

test("the hard no-SVG gate covers every intent and blocks icon-library SVG output", () => {
  for (const intent of VISUAL_INTENTS) {
    const gate = evaluateMediaGate(intent, "svg");
    assert.equal(gate.allowed, false, `${intent} should reject SVG`);
    assert.equal(gate.severity, "hard");
    assert.equal(gate.id, NO_SVG_POLICY.id);
    assert.ok(MEDIA_TYPES.includes(gate.replacement));
  }
  const libraryGate = evaluateMediaGate("interface-icon", "icon-library");
  assert.equal(libraryGate.allowed, false);
  assert.equal(libraryGate.severity, "hard");
  assert.equal(libraryGate.replacement, "css");
});

test("reroutes an attempted food SVG to a transparent raster with an auditable gate", () => {
  const routed = routeAsset({
    id: "hero-pastry",
    role: "hero",
    description: "Macro hero photograph of a glossy seasonal pastry",
    implementation: "svg",
    source: "generated",
    provider: "fixture-image-model",
    generationPrompt: "Studio-lit pastry on a neutral sweep",
    alt: "Seasonal pastry with berry glaze",
    width: 2400,
    height: 1800,
    fileSizeBytes: 320_000,
    responsiveBehavior: "Wide crop on desktop; tight pastry crop on mobile",
    compositionRole: "Anchors the headline baseline",
    lighting: "Single soft key from upper left",
    reducedMotion: true
  });

  assert.equal(routed.intent, "food");
  assert.equal(routed.requestedMedium, "svg");
  assert.equal(routed.implementation, "transparent-raster");
  assert.equal(routed.decision.status, "rerouted");
  assert.equal(routed.gates.passed, false);
  assert.equal(routed.gates.hardBlocks[0].id, NO_SVG_POLICY.id);
  assert.equal(routed.ranking.find((candidate) => candidate.medium === "svg").eligible, false);
  assert.equal(routed.implementationPolicy.svgAllowed, false);
  assert.equal(routed.implementationPolicy.materialization.capability, "raster-image-generation");
  assert.deepEqual(routed.implementationPolicy.allowedOutputFormats, ["png", "jpg", "jpeg", "webp", "avif"]);
  assert.match(routed.fallback.behavior, /low-fidelity vector substitute/i);
});

test("detects SVG files, markup, data URIs, and renderer requests before routing", () => {
  const attempts = [
    { visualIntent: "brand-mark", description: "Company wordmark", path: "assets/company.svg" },
    { visualIntent: "interface-icon", description: "Toolbar search control", markup: "<svg><path /></svg>" },
    { visualIntent: "hero-object", description: "Hero artwork", src: "data:image/svg+xml;base64,PHN2Zz4=" },
    { visualIntent: "data-visualization", description: "Revenue trend", renderer: "svg" }
  ];
  for (const attempt of attempts) {
    const routed = routeAsset(attempt);
    assert.equal(routed.requestedMedium, "svg");
    assert.equal(routed.gates.passed, false);
    assert.equal(routed.gates.hardBlocks[0].id, NO_SVG_POLICY.id);
    assert.ok(!PROHIBITED_MEDIA_TYPES.includes(routed.implementation));
  }

  assert.equal(auditSvgUsage("mask-image: url('/icons/search.svg')").passed, false);
  assert.equal(auditSvgUsage("document.createElementNS(ns, 'svg')").passed, false);
  assert.equal(auditSvgUsage("<div class=\"shape\"></div>").passed, true);
});

test("routes UI geometry away from SVG-producing icon libraries and constrains SVG-capable renderers", () => {
  const icon = routeAsset({ description: "Search icon for a labeled toolbar control" });
  assert.equal(icon.implementation, "css");
  assert.match(icon.implementationPolicy.scope, /simple UI geometry only/i);

  const requestedLibrary = routeAsset({
    visualIntent: "interface-icon",
    description: "Search control glyph",
    implementation: "icon-library"
  });
  assert.equal(requestedLibrary.implementation, "css");
  assert.equal(requestedLibrary.gates.hardBlocks[0].id, "no-svg-icon-library");

  const knownSvgLibrary = routeAsset({
    visualIntent: "interface-icon",
    description: "Search control glyph",
    source: { type: "library", package: "lucide-react" }
  });
  assert.equal(knownSvgLibrary.requestedMedium, "icon-library");
  assert.equal(knownSvgLibrary.implementation, "css");
  assert.equal(knownSvgLibrary.gates.hardBlocks[0].id, "no-svg-icon-library");

  const chart = routeAsset({ description: "Interactive sales chart with a table fallback" });
  assert.equal(chart.implementation, "chart-library");
  assert.equal(chart.implementationPolicy.renderer, "canvas-or-html-only");
  assert.match(chart.implementationPolicy.rule, /reject.*SVG/i);

  assert.equal(routeAsset({ description: "Procedural particle flow field responding to pointer input" }).implementation, "canvas");
  assert.equal(routeAsset({ description: "Interactive 3D shoe model with drag rotation" }).implementation, "three-js-r3f");
  assert.equal(routeAsset({ description: "Cinematic workshop footage for the story section" }).implementation, "video");
  assert.equal(routeAsset({
    visualIntent: "character",
    description: "A mascot reacting to selection state",
    animated: true,
    interactive: true
  }).implementation, "rive");
});

test("materializes identity artwork as raster while reserving CSS for explicitly functional geometry", () => {
  const artwork = routeAsset({
    visualIntent: "decorative",
    description: "Botanical collage illustration"
  });
  assert.equal(artwork.implementation, "transparent-raster");
  assert.equal(artwork.implementationPolicy.materialization.required, true);

  const geometry = routeAsset({
    visualIntent: "decorative",
    description: "Simple divider line",
    simpleGeometry: true
  });
  assert.equal(geometry.implementation, "transparent-raster");

  const functional = routeAsset({
    visualIntent: "interface-icon",
    description: "Focus ring for a labeled control",
    functionalGeometry: true
  });
  assert.equal(functional.implementation, "css");
});

test("Asset Quality Score is weighted, explainable, bounded, and honest about evidence", () => {
  const routed = routeAsset({
    id: "product",
    description: "Art-directed product bottle",
    source: { type: "licensed", origin: "fixture-studio", license: "commercial-web" },
    alt: "Amber bottle with a black pump",
    width: 2400,
    height: 3000,
    fileSizeBytes: 280_000,
    compositionRole: "Interrupts the title axis",
    artDirection: "Warm edge light on an ink background",
    responsiveBehavior: "Full silhouette on desktop; shoulder crop on mobile"
  }, {
    projectDna: { creativeThesis: "The bottle divides the page into ritual steps." }
  });
  const score = routed.assetQualityScore;

  assert.equal(score.dimensions.length, ASSET_QUALITY_DIMENSIONS.length);
  assert.ok(score.score >= 80 && score.score <= 100);
  assert.equal(score.dimensions.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.match(score.claimBoundary, /requires screenshot review/i);

  const sparse = routeAsset({ description: "Editorial photograph" });
  assert.ok(sparse.assetQualityScore.score < score.score);
  assert.equal(sparse.assetQualityScore.confidence, "low");
  assert.ok(sparse.assetQualityScore.missingEvidence.length >= 4);

  const recomputed = computeAssetQualityScore(
    { description: "Editorial photograph" },
    {
      ...sparse,
      selectedCandidate: sparse.ranking.find((candidate) => candidate.medium === sparse.implementation)
    }
  );
  assert.equal(recomputed.score, sparse.assetQualityScore.score);
});

test("records media-specific provenance, performance, accessibility, and fallback requirements", () => {
  const routed = routeAsset({
    id: "ambient-film",
    intent: "cinematic",
    source: "licensed",
    origin: "fixture-filmmaker",
    license: "web-campaign",
    description: "Ambient workshop film",
    alt: "A bookbinder sewing a paper signature",
    width: 1920,
    height: 1080,
    fileSizeBytes: 1_200_000,
    reducedMotionFallback: "workshop-poster.avif"
  });

  assert.equal(routed.implementation, "video");
  assert.equal(routed.provenance.status, "ready");
  assert.equal(routed.performance.withinBudget, true);
  assert.equal(routed.accessibility.reducedMotionRequired, true);
  assert.equal(routed.accessibility.reducedMotionReady, true);
  assert.equal(routed.fallback.medium, "transparent-raster");
  assert.ok(routed.provenance.requirements.length);
  assert.ok(routed.performance.requirements.length);
  assert.ok(routed.accessibility.requirements.length);
  assert.ok(routed.fallback.requirements.length);
});

test("createAssetManifest routes every brief asset and reports aggregate risk", () => {
  const brief = {
    goal: "Launch an expressive bakery",
    assets: [
      {
        id: "pastry",
        description: "Hero croissant",
        implementation: "svg",
        source: "user-supplied"
      },
      {
        id: "basket",
        description: "Shopping basket icon",
        source: { type: "library", package: "fixture-icons", version: "1.0.0", license: "MIT" },
        accessibleName: "Open basket"
      },
      "Animated decorative flour particles"
    ]
  };
  const manifest = createAssetManifest(brief, {
    creativeThesis: "The pastry interrupts the order slip.",
    system: { motionLanguage: "Restrained responsive motion" }
  });

  assert.equal(manifest.requestedAssetCount, 3);
  assert.equal(manifest.routedAssetCount, 3);
  assert.equal(manifest.assets.length, brief.assets.length);
  assert.deepEqual(manifest.assets.map((asset) => asset.id), ["pastry", "basket", "asset-3"]);
  assert.deepEqual(manifest.summary.hardGateReroutes, ["pastry", "basket"]);
  assert.deepEqual(manifest.summary.svgReroutes, ["pastry"]);
  assert.deepEqual(manifest.summary.prohibitedMediaRequests, ["pastry", "basket"]);
  assert.equal(manifest.summary.byMedium["transparent-raster"], 1);
  assert.equal(manifest.summary.byMedium.css, 1);
  assert.equal(manifest.summary.byMedium.svg, undefined);
  assert.equal(manifest.svgPolicy.id, NO_SVG_POLICY.id);
  assert.ok(Number.isFinite(manifest.summary.averageAssetQualityScore));
  assert.ok(manifest.assets.every((asset) =>
    asset.provenance && asset.performance && asset.accessibility && asset.fallback
  ));
  assert.equal(manifest.assetBatchPlan.version, "1.0.0");
  assert.equal(manifest.assetBatchPlan.status, "not-required");
});

test("generated assets share one batch contract without losing per-output provenance", () => {
  const manifest = createAssetManifest({
    goal: "Create a tactile pastry launch",
    generateAssets: true,
    assetArtDirection: {
      light: "Warm upper-left key light with short soft shadows.",
      camera: "Three-quarter tabletop view at a consistent focal length."
    },
    assets: [
      {
        id: "hero-pastry",
        role: "hero-object",
        description: "Photoreal laminated pastry isolated on transparency",
        source: { type: "generated", provider: "fixture", prompt: "fixture prompt" }
      },
      {
        id: "secondary-pastry",
        role: "section-bridge",
        description: "Photoreal laminated pastry isolated on transparency",
        source: { type: "generated", provider: "fixture", prompt: "fixture prompt two" }
      }
    ]
  }, {
    system: { depthModel: "Soft tactile pastry, quiet flat interface surfaces." }
  });
  assert.equal(manifest.assetBatchPlan.status, "planned");
  assert.equal(manifest.assetBatchPlan.batches.length, 1);
  assert.equal(manifest.assetBatchPlan.batches[0].assets.length, 2);
  assert.match(manifest.assetBatchPlan.contract.light, /upper-left/i);
  assert.ok(manifest.assetBatchPlan.batches[0].assets.every((asset) => (
    asset.medium === "transparent-raster" &&
    asset.generationRequest.capability === "raster-image-generation"
  )));
  assert.ok(manifest.assetBatchPlan.batches[0].assets.every((asset) => (
    asset.sha256 === null && asset.provenanceRequired === true
  )));
  assert.ok(manifest.assetBatchPlan.batches[0].assets.every((asset) => (
    asset.generationRequest.mustExecuteWhenProviderAvailable === true &&
    asset.generationRequest.separateFromDirectionFrames === true &&
    asset.generationRequest.allowedOutputFormats.includes("webp") &&
    /production asset, not a website mockup/i.test(asset.generationRequest.prompt)
  )));
  assert.ok(manifest.assetBatchPlan.batches[0].assets.every((asset) => (
    /\.png$/i.test(asset.expectedOutput) &&
    /never output svg/i.test(asset.generationRequest.prompt) &&
    asset.generationRequest.forbiddenSubstitutes.includes("inline <svg> markup") &&
    asset.generationRequest.forbiddenSubstitutes.includes("data:image/svg+xml payload")
  )));
  assert.equal(manifest.assetBatchPlan.svgPolicy.id, NO_SVG_POLICY.id);
  assert.match(manifest.assetBatchPlan.claimBoundary, /independently hash-bound/i);
});

test("manifest and asset validation reject malformed input", () => {
  assert.throws(() => createAssetManifest(null), /brief must be an object/);
  assert.throws(() => createAssetManifest({ assets: {} }), /brief.assets must be an array/);
  assert.throws(() => routeAsset([], { index: 2 }), /brief\.assets\[2\]/);
});
