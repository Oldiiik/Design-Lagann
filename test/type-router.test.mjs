import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CURATED_FAMILIES,
  TYPE_ROLES,
  TYPOGRAPHY_SCREENSHOT_VIEWPORTS,
  TYPOGRAPHY_SCORE_DIMENSIONS,
  TypographyQualityError,
  choreographHeadline,
  createTypeManifest,
  normalizeTypographyBrief,
  rankTypographyCandidates,
  routeTypography,
  scoreTypographyPlan,
  validateTypographyPlan,
  validateTypographyScreenshotReport
} from "../packages/type-router/src/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function providedFontFixture() {
  return [
    {
      family: "Forge Serif",
      kind: "serif",
      roles: ["display"],
      voices: ["warm", "crafted", "editorial"],
      scripts: ["Latin"],
      weights: [400, 700],
      files: [
        { path: "/fonts/forge-serif-400.woff2", format: "woff2", weight: 400, estimatedKb: 32 },
        { path: "/fonts/forge-serif-700.woff2", format: "woff2", weight: 700, estimatedKb: 34 }
      ],
      fallbacks: ["Georgia", "serif"],
      typeCharacter: {
        width: "compact",
        contrast: "high",
        xHeight: "medium",
        opticalCharacter: "Sharp editorial serif with compact display proportions."
      },
      metricFallback: {
        alias: "Forge Serif Fallback",
        sourceFamily: "Georgia",
        sizeAdjust: "98%",
        ascentOverride: "92%",
        descentOverride: "24%",
        lineGapOverride: "0%",
        calibration: "client-estimate"
      },
      license: "Client-owned commercial webfont license",
      provenance: "Client supplied release 2.1 with checksum in the asset register.",
      metrics: { legibility: 8.5, specificity: 9.4 }
    },
    {
      family: "Plain Text",
      kind: "sans",
      roles: ["body", "utility"],
      voices: ["clear", "human"],
      scripts: ["Latin"],
      weights: [400, 600],
      files: [
        { path: "/fonts/plain-text-400.woff2", format: "woff2", weight: 400, estimatedKb: 26 },
        { path: "/fonts/plain-text-600.woff2", format: "woff2", weight: 600, estimatedKb: 27 }
      ],
      fallbacks: ["Arial", "sans-serif"],
      typeCharacter: {
        width: "normal",
        contrast: "low",
        xHeight: "high",
        opticalCharacter: "Open humanist reading texture."
      },
      metricFallback: {
        alias: "Plain Text Fallback",
        sourceFamily: "Arial",
        sizeAdjust: "101%",
        ascentOverride: "93%",
        descentOverride: "24%",
        lineGapOverride: "0%",
        calibration: "client-estimate"
      },
      license: "Client-owned commercial webfont license",
      provenance: "Client supplied release 4.0 with checksum in the asset register.",
      metrics: { legibility: 9.7, specificity: 7.5 }
    },
    {
      family: "Grid Mono",
      kind: "mono",
      roles: ["data"],
      voices: ["precise", "data"],
      scripts: ["Latin"],
      weights: [500],
      files: [
        { path: "/fonts/grid-mono-500.woff2", format: "woff2", weight: 500, estimatedKb: 24 }
      ],
      fallbacks: ["Consolas", "monospace"],
      typeCharacter: {
        width: "monospaced",
        contrast: "low",
        xHeight: "high",
        opticalCharacter: "Compact tabular data texture."
      },
      metricFallback: {
        alias: "Grid Mono Fallback",
        sourceFamily: "Consolas",
        sizeAdjust: "100%",
        ascentOverride: "92%",
        descentOverride: "24%",
        lineGapOverride: "0%",
        calibration: "client-estimate"
      },
      license: "Client-owned commercial webfont license",
      provenance: "Client supplied release 1.3 with checksum in the asset register.",
      metrics: { legibility: 9.1, specificity: 8.2 }
    }
  ];
}

function systemDefaultBrief(justification = "") {
  return {
    mode: "quality",
    brandVoice: ["clear"],
    providedStrategy: "required",
    systemDefaultJustification: justification,
    singleFamilyJustification: "The operating-system native shell is itself the documented product behavior.",
    providedFonts: [{
      family: "Arial",
      kind: "sans",
      roles: TYPE_ROLES,
      voices: ["clear"],
      scripts: ["Latin"],
      weights: [400, 700],
      files: [
        { path: "/fonts/arial-400.woff2", format: "woff2", weight: 400, estimatedKb: 28 },
        { path: "/fonts/arial-700.woff2", format: "woff2", weight: 700, estimatedKb: 29 }
      ],
      fallbacks: ["Helvetica", "sans-serif"],
      typeCharacter: {
        width: "normal",
        contrast: "low",
        xHeight: "high",
        opticalCharacter: "Neutral neo-grotesque system texture."
      },
      metricFallback: {
        alias: "Arial Fallback",
        sourceFamily: "Helvetica",
        sizeAdjust: "100%",
        ascentOverride: "92%",
        descentOverride: "24%",
        lineGapOverride: "0%",
        calibration: "client-estimate"
      },
      license: "Documented internal webfont license",
      provenance: "Client-supplied files with checksum and procurement record.",
      metrics: { legibility: 8.6, specificity: 2.5 }
    }]
  };
}

function screenshotReportFixture(manifest) {
  return {
    captures: manifest.screenshotValidation.viewports.map((viewport, index) => ({
      viewport: viewport.id,
      width: viewport.width,
      height: viewport.height,
      screenshotPath: `/evidence/type-${viewport.id}.png`,
      screenshotSha256: String(index + 1).repeat(64),
      fontsLoaded: true,
      fontSetStatus: "loaded",
      fontChecks: Object.fromEntries(
        manifest.fontFaces.map((font) => [font.family, true])
      ),
      measurements: {
        displayLineCount: Math.min(2, viewport.display.maxLines),
        shortestDisplayLineFillRatio: 0.68,
        singleWordDisplayLines: 0,
        lastDisplayLineCharacters: 8,
        bodyMeasureCh: viewport.body.measureCh.target,
        displayToBodySizeRatio: 3.2,
        fontLoadLayoutShift: 0.008,
        horizontalOverflowPx: 0,
        computedFamilies: Object.fromEntries(TYPE_ROLES.map((role) => [
          role,
          manifest.roles[role].family
        ])),
        computedTypography: Object.fromEntries(TYPE_ROLES.map((role) => [
          role,
          {
            fontFamily: manifest.roles[role].family,
            fontSize: "16px",
            fontWeight: String(manifest.roles[role].weight),
            fontStyle: manifest.roles[role].style,
            fontStretch: "100%",
            fontOpticalSizing: manifest.roles[role].fontOpticalSizing,
            fontVariationSettings: "normal",
            fontSynthesis: "none",
            lineHeight: String(manifest.roles[role].lineHeight),
            letterSpacing: manifest.roles[role].letterSpacing,
            textTransform: manifest.roles[role].textTransform,
            lineCount: role === "display" ? Math.min(2, viewport.display.maxLines) : 1
          }
        ]))
      },
      judgments: Object.fromEntries(
        manifest.screenshotValidation.requiredJudgments.map((judgment) => [judgment, true])
      )
    }))
  };
}

test("brief normalization maps voice, language, density, and performance constraints deterministically", () => {
  const brief = normalizeTypographyBrief({
    mode: "quality",
    brandVoice: ["Premium / friendly", "precise"],
    contentDensity: "high",
    languages: ["ru-RU", "ar"],
    performance: { maxFontFiles: 4, maxTransferKb: 180, preloadLimit: 2 }
  });
  assert.deepEqual(brief.brandVoice, ["authoritative", "human", "precise"]);
  assert.deepEqual(brief.scripts, ["Cyrillic", "Arabic"]);
  assert.equal(brief.contentDensity, "high");
  assert.equal(brief.performance.maxFontFiles, 4);
  assert.equal(brief.performance.localOnly, true);
});

test("curated families carry width, optical character, and metric-compatible fallback evidence", () => {
  assert.ok(CURATED_FAMILIES.length > 0);
  for (const font of CURATED_FAMILIES) {
    assert.ok(["condensed", "compact", "normal", "wide", "monospaced"].includes(
      font.typeCharacter.width
    ));
    assert.ok(["low", "medium", "high", "monoline"].includes(
      font.typeCharacter.contrast
    ));
    assert.ok(font.typeCharacter.opticalCharacter.length > 20);
    assert.ok(font.metricFallback.alias);
    assert.ok(font.fallbacks.includes(font.metricFallback.sourceFamily));
    assert.match(font.metricFallback.sizeAdjust, /^\d+(?:\.\d+)?%$/);
    assert.match(font.metricFallback.ascentOverride, /^\d+(?:\.\d+)?%$/);
    assert.match(font.metricFallback.descentOverride, /^\d+(?:\.\d+)?%$/);
    assert.match(font.metricFallback.lineGapOverride, /^\d+(?:\.\d+)?%$/);
  }
});

test("warm editorial voice deterministically selects the thesis-compatible pairing", () => {
  const input = {
    mode: "quality",
    brandVoice: ["warm", "editorial", "crafted"],
    contentDensity: "medium",
    languages: ["en"]
  };
  const first = routeTypography(input);
  const second = routeTypography(input);
  assert.equal(first.selection.id, "editorial-warmth");
  assert.equal(first.selection.roles.display.family, "Fraunces");
  assert.equal(first.selection.roles.body.family, "Source Sans 3");
  assert.deepEqual(
    first.ranking.map(({ id, rankScore }) => ({ id, rankScore })),
    second.ranking.map(({ id, rankScore }) => ({ id, rankScore }))
  );
});

test("editorial routing specifies optical contrast, case, tracking, measure, and independent responsive scales", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "editorial", "crafted"]
  });
  const { display, body, utility, data } = result.manifest.roles;

  assert.equal(display.kind, "serif");
  assert.equal(display.typeCharacter.width, "compact");
  assert.equal(display.typeCharacter.contrast, "high");
  assert.match(display.typeCharacter.opticalCharacter, /display silhouette/i);
  assert.equal(display.case, "sentence");
  assert.equal(display.letterSpacing, "-0.022em");
  assert.equal(utility.case, "uppercase");
  assert.equal(utility.textTransform, "uppercase");
  assert.equal(utility.letterSpacing, "0.12em");
  assert.equal(body.case, "sentence");
  assert.equal(data.fontVariantNumeric, "tabular-nums lining-nums");
  assert.ok(display.measure.desktop.max <= 18);
  assert.ok(display.responsiveScale.desktop / display.responsiveScale.mobile > 2);
  assert.ok(body.responsiveScale.desktop / body.responsiveScale.mobile < 1.2);
  assert.notEqual(
    display.responsiveScale.desktop / display.responsiveScale.mobile,
    body.responsiveScale.desktop / body.responsiveScale.mobile
  );
  assert.match(result.manifest.cssVariables["--font-display-size"], /^clamp\(/);
  assert.equal(result.manifest.cssVariables["--font-utility-text-transform"], "uppercase");
});

test("headline choreography balances the reference phrase and prevents isolated glue words", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "editorial"]
  });
  const choreography = choreographHeadline(
    "The journey written in ink.",
    result.selection.headline
  );
  assert.deepEqual(choreography.suggestions.desktop, [
    "The journey",
    "written in ink."
  ]);
  for (const lines of Object.values(choreography.suggestions)) {
    assert.ok(lines.length <= 4);
    assert.ok(lines.every((line) => line.trim().split(/\s+/).length > 1));
    assert.ok(!lines.some((line) => ["a", "an", "the", "in", "of", "to"].includes(
      line.trim().toLowerCase()
    )));
  }
});

test("an adopted editorial reference selects a serif-led multiscript system and preserves authored line structure", () => {
  const referenceTypography = {
    required: true,
    sourceId: "kisetsu-reference",
    sourceHash: "a".repeat(64),
    roles: {
      display: {
        familyClass: "serif",
        widths: ["normal", "compact"],
        strokeContrast: ["medium", "high"],
        xHeight: "medium",
        lineHeight: [0.95, 1.02],
        measureCh: { mobile: 14, tablet: 15, desktop: 15.5 }
      },
      body: {
        familyClass: "serif",
        widths: ["normal", "compact"],
        strokeContrast: ["medium", "high"],
        xHeight: "medium",
        lineHeight: [1.35, 1.48],
        measureCh: { mobile: 28, tablet: 30, desktop: 32 }
      },
      utility: {
        familyClass: "sans",
        case: "script-aware",
        trackingEm: 0
      },
      data: {
        familyClass: "serif",
        widths: ["normal", "compact"],
        strokeContrast: ["medium", "high"]
      }
    },
    headline: {
      text: "The journey written in ink.",
      emphasis: ["ink."],
      accentOnly: ["ink."],
      authoredLines: {
        desktop: ["The journey", "written in ink."],
        tablet: ["The journey", "written in ink."],
        mobile: ["The journey", "written in ink."]
      }
    },
    scriptCompanions: [{
      scripts: ["Han", "Hiragana", "Katakana"],
      kind: "serif",
      character: "Mincho-compatible"
    }]
  };
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["calm", "editorial", "cultural"],
    languages: ["en", "ja"],
    referenceTypography
  });

  assert.equal(result.selection.id, "global-serif-led-journey");
  assert.equal(result.manifest.roles.display.kind, "serif");
  assert.equal(result.manifest.roles.body.kind, "serif");
  assert.equal(result.manifest.roles.utility.kind, "sans");
  assert.equal(result.manifest.roles.data.kind, "serif");
  assert.deepEqual(
    result.manifest.artDirection.headline.choreography.suggestions.desktop,
    ["The journey", "written in ink."]
  );
  assert.equal(result.manifest.artDirection.headline.exactLineCounts.desktop, 2);
  assert.equal(result.quality.dimensions.referenceFidelity.score, 10);
  assert.equal(result.manifest.context.referenceTypography.sourceId, "kisetsu-reference");
});

test("a high aggregate family score cannot excuse reference family-class drift", () => {
  const input = {
    mode: "quality",
    brandVoice: ["calm", "editorial"],
    referenceTypography: {
      required: true,
      roles: {
        display: { familyClass: "serif" },
        body: { familyClass: "serif" },
        utility: { familyClass: "sans" },
        data: { familyClass: "serif" }
      }
    }
  };
  const valid = routeTypography(input);
  const drifted = structuredClone(valid.selection);
  const sans = drifted.families.find((font) => font.kind === "sans");
  drifted.roles.body.family = sans.family;
  drifted.roles.body.kind = sans.kind;
  drifted.roles.body.typeCharacter = { ...sans.typeCharacter };

  const validation = validateTypographyPlan(drifted, input);
  assert.equal(validation.passed, false);
  assert.ok(validation.hardFailures.some((failure) =>
    failure.id === "reference-typography-mismatch"
    && failure.role === "body"
    && failure.dimension === "familyClass"
  ));
});

test("dense technical content routes to an engineered role system", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["technical", "precise", "engineered"],
    contentDensity: "high"
  });
  assert.equal(result.selection.id, "engineered-clarity");
  assert.equal(result.selection.roles.display.family, "Space Grotesk");
  assert.equal(result.selection.roles.data.family, "IBM Plex Mono");
  assert.notEqual(result.selection.roles.display.family, result.selection.roles.body.family);
});

test("multiscript routing selects a complete per-script family and stays inside default budgets", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["global", "cultural", "clear"],
    languages: ["en", "ar"]
  });
  assert.equal(result.selection.id, "global-clarity");
  assert.equal(result.quality.dimensions.coverage.score, 10);
  assert.equal(result.manifest.performance.fileCount, 6);
  assert.ok(result.manifest.performance.estimatedTransferKb <= 360);
  assert.ok(result.manifest.fontFaces.every((font) =>
    ["Latin", "Arabic"].every((script) => font.scripts.includes(script))
  ));
});

test("provided licensed fonts can own explicit roles when their evidence is complete", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "crafted", "editorial"],
    providedStrategy: "required",
    providedFonts: providedFontFixture()
  });
  assert.equal(result.selection.id, "provided-led");
  assert.equal(result.selection.roles.display.family, "Forge Serif");
  assert.equal(result.selection.roles.body.family, "Plain Text");
  assert.equal(result.selection.roles.data.family, "Grid Mono");
  assert.equal(result.gates.passed, true);
  assert.ok(result.quality.score >= 8.2);
});

test("quality mode hard-fails an unjustified system-default direction", () => {
  assert.throws(
    () => routeTypography(systemDefaultBrief()),
    (error) => {
      assert.ok(error instanceof TypographyQualityError);
      assert.equal(error.code, "DESIGN_LAGANN_TYPE_QUALITY_GATE");
      assert.ok(error.details.hardFailures.some((failure) =>
        failure.id === "system-default-unjustified"
      ));
      return true;
    }
  );
});

test("quality mode treats a generic webfont default as a direction requiring justification", () => {
  const brief = systemDefaultBrief();
  const font = brief.providedFonts[0];
  font.family = "Inter";
  font.files = font.files.map((file) => ({
    ...file,
    path: file.path.replace("arial", "inter")
  }));
  assert.throws(
    () => routeTypography(brief),
    (error) => {
      assert.ok(error.details.hardFailures.some((failure) =>
        failure.id === "system-default-unjustified"
      ));
      return true;
    }
  );
});

test("a substantive system-default justification removes that gate but not other quality judgment", () => {
  const candidates = rankTypographyCandidates(systemDefaultBrief(
    "The product mirrors a native municipal workstation where familiarity is a safety requirement."
  ));
  const ids = candidates[0].hardFailures.map((failure) => failure.id);
  assert.ok(!ids.includes("system-default-unjustified"));
  assert.ok(ids.includes("role-contrast-collapse"));
});

test("quality mode rejects supplied fonts without provenance, license, or measured role evidence", () => {
  const fonts = providedFontFixture();
  delete fonts[0].license;
  delete fonts[0].provenance;
  delete fonts[0].metrics;
  fonts[0].scripts = [];
  assert.throws(
    () => routeTypography({
      mode: "quality",
      brandVoice: ["warm", "crafted"],
      providedStrategy: "required",
      providedFonts: fonts
    }),
    (error) => {
      const unproven = error.details.hardFailures.find((failure) =>
        failure.id === "unproven-font"
      );
      assert.ok(unproven.families.includes("Forge Serif"));
      assert.ok(error.details.hardFailures.some((failure) =>
        failure.id === "script-coverage" && failure.family === "Forge Serif"
      ));
      return true;
    }
  );
});

test("monospace-for-everything and fabricated font weights are forbidden", () => {
  const valid = routeTypography({
    mode: "quality",
    brandVoice: ["technical", "precise"],
    contentDensity: "high"
  });

  const monoPlan = structuredClone(valid.selection);
  for (const role of TYPE_ROLES) {
    monoPlan.roles[role].family = "IBM Plex Mono";
    monoPlan.roles[role].kind = "mono";
    monoPlan.roles[role].weight = 500;
  }
  const monoIds = validateTypographyPlan(monoPlan, { mode: "quality" })
    .hardFailures.map((failure) => failure.id);
  assert.ok(monoIds.includes("mono-everywhere"));
  assert.ok(monoIds.includes("mono-primary-roles"));

  const fakeWeightPlan = structuredClone(valid.selection);
  fakeWeightPlan.roles.body.weight = 550;
  const fakeWeight = validateTypographyPlan(fakeWeightPlan, { mode: "quality" })
    .hardFailures.find((failure) => failure.id === "fake-weight");
  assert.equal(fakeWeight.family, "IBM Plex Sans");
  assert.equal(fakeWeight.weight, 550);
});

test("local WOFF2, preload, font-display, and fallback plans are hard gates", () => {
  const valid = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "editorial"]
  });
  const broken = structuredClone(valid.selection);
  const display = broken.families.find((font) => font.family === broken.roles.display.family);
  const body = broken.families.find((font) => font.family === broken.roles.body.family);
  const data = broken.families.find((font) => font.family === broken.roles.data.family);
  display.files = [];
  body.fallbacks = [];
  data.fontDisplay = "block";

  const ids = validateTypographyPlan(broken, { mode: "quality" })
    .hardFailures.map((failure) => failure.id);
  assert.ok(ids.includes("missing-font-source"));
  assert.ok(ids.includes("preload-plan-required"));
  assert.ok(ids.includes("fallback-plan-required"));
  assert.ok(ids.includes("font-display-required"));
});

test("art-direction, metric-fallback, responsive-recomposition, and screenshot contracts are hard gates", () => {
  const valid = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "editorial"]
  });
  const broken = structuredClone(valid.selection);
  broken.roles.display.typeCharacter.opticalCharacter = "";
  broken.families[0].metricFallback = {};
  broken.screenshotValidation = null;
  for (const role of TYPE_ROLES) {
    broken.roles[role].responsiveScale.mobile = 1;
    broken.roles[role].responsiveScale.tablet = 1.5;
    broken.roles[role].responsiveScale.desktop = 2;
  }

  const ids = validateTypographyPlan(broken, {
    mode: "quality",
    brandVoice: ["warm", "editorial"]
  }).hardFailures.map((failure) => failure.id);

  assert.ok(ids.includes("role-art-direction-required"));
  assert.ok(ids.includes("metric-fallback-required"));
  assert.ok(ids.includes("uniform-responsive-scaling"));
  assert.ok(ids.includes("screenshot-validation-required"));
});

test("remote WOFF2 sources and non-local strategies cannot qualify", () => {
  const fonts = providedFontFixture();
  fonts[0].files[1] = {
    path: "https://fonts.example/forge-serif-700.woff2",
    format: "woff2",
    weight: 700,
    estimatedKb: 95
  };
  const candidates = rankTypographyCandidates({
    mode: "balanced",
    providedStrategy: "required",
    providedFonts: fonts,
    performance: { localOnly: false }
  });
  const ids = candidates[0].hardFailures.map((failure) => failure.id);
  assert.ok(ids.includes("local-only-required"));
  assert.ok(ids.includes("local-woff2-required"));
});

test("performance constraints affect eligibility and expose concrete budget failures", () => {
  assert.throws(
    () => routeTypography({
      mode: "quality",
      brandVoice: ["global", "cultural"],
      languages: ["en", "ar"],
      performance: { maxFontFiles: 3, maxTransferKb: 200, preloadLimit: 2 }
    }),
    (error) => {
      const ids = error.details.hardFailures.map((failure) => failure.id);
      assert.ok(ids.includes("font-file-budget"));
      assert.ok(ids.includes("font-transfer-budget"));
      return true;
    }
  );
});

test("Typography Quality Score contains every weighted dimension and sums deterministically", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["calm", "literary", "authoritative"]
  });
  const scoredAgain = scoreTypographyPlan(result.selection, {
    mode: "quality",
    brandVoice: ["calm", "literary", "authoritative"]
  });
  assert.equal(result.quality.score, scoredAgain.score);
  assert.deepEqual(
    Object.keys(result.quality.dimensions),
    TYPOGRAPHY_SCORE_DIMENSIONS.map((dimension) => dimension.id)
  );
  assert.equal(
    TYPOGRAPHY_SCORE_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0),
    1
  );
  assert.ok(result.quality.percentage >= 82);
});

test("manifest generation is deterministic and contains implementable role and loading data", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["playful", "crafted", "accessible"]
  });
  const first = createTypeManifest(result.selection, {
    mode: "quality",
    brandVoice: ["playful", "crafted", "accessible"]
  });
  const second = createTypeManifest(result.selection, {
    mode: "quality",
    brandVoice: ["playful", "crafted", "accessible"]
  });
  assert.deepEqual(first, second);
  assert.equal(first.decision.status, "qualified");
  assert.deepEqual(Object.keys(first.roles), TYPE_ROLES);
  assert.equal(first.preloads.length, 2);
  assert.ok(first.preloads.every((preload) =>
    preload.href.endsWith(".woff2")
    && preload.type === "font/woff2"
    && preload.crossorigin === "anonymous"
  ));
  assert.ok(first.fontFaces.every((font) =>
    font.sources.every((source) =>
      source.format === "woff2"
      && ["swap", "optional", "fallback"].includes(source.fontDisplay)
    )
  ));
  assert.match(first.cssVariables["--font-display"], /Bricolage Grotesque/);
  assert.match(first.cssVariables["--font-display-size"], /^clamp\(/);
  assert.equal(first.cssVariables["--font-utility-text-transform"], "uppercase");
  assert.equal(first.roles.data.fontVariantNumeric, "tabular-nums lining-nums");
  assert.deepEqual(Object.keys(first.responsiveTokens), ["mobile", "tablet", "desktop"]);
  assert.ok(first.fontFaces.every((font) =>
    font.metricFallback.alias
    && font.metricFallback.src.startsWith("local(")
    && first.roles[font.usedBy[0]].fallbackStack.includes(font.metricFallback.alias)
  ));
  assert.equal(first.screenshotValidation.status, "required-before-acceptance");
  assert.deepEqual(
    first.screenshotValidation.viewports.map((viewport) => ({
      id: viewport.id,
      width: viewport.width,
      height: viewport.height
    })),
    TYPOGRAPHY_SCREENSHOT_VIEWPORTS
  );
});

test("screenshot report validation blocks wrapping, fallback shift, and missing viewport evidence", () => {
  const result = routeTypography({
    mode: "quality",
    brandVoice: ["warm", "editorial"],
    headlineText: "The journey written in ink."
  });
  const validReport = screenshotReportFixture(result.manifest);
  assert.equal(
    validateTypographyScreenshotReport(result.manifest, validReport).passed,
    true
  );

  const broken = structuredClone(validReport);
  broken.captures = broken.captures.filter((capture) => capture.viewport !== "tablet");
  const mobile = broken.captures.find((capture) => capture.viewport === "mobile");
  mobile.measurements.singleWordDisplayLines = 1;
  mobile.measurements.fontLoadLayoutShift = 0.08;
  mobile.judgments.wrapsIntentional = false;

  const failures = validateTypographyScreenshotReport(result.manifest, broken).hardFailures;
  const ids = failures.map((failure) => failure.id);
  assert.ok(ids.includes("screenshot-viewport-missing"));
  assert.ok(ids.includes("display-orphan-line"));
  assert.ok(ids.includes("font-load-layout-shift"));
  assert.ok(ids.includes("typography-judgment-failed"));
});

test("router does not mutate caller input", () => {
  const input = {
    mode: "quality",
    brandVoice: ["warm", "editorial"],
    languages: ["en"],
    performance: { maxFontFiles: 5 }
  };
  const before = structuredClone(input);
  routeTypography(input);
  assert.deepEqual(input, before);
});

test("type manifest template is valid and keeps all four roles and score dimensions explicit", async () => {
  const template = JSON.parse(await readFile(
    path.join(root, "templates", "type-manifest.json"),
    "utf8"
  ));
  assert.equal(template.schemaVersion, "1.0");
  assert.equal(template.generatedBy, "@design-lagann/type-router");
  assert.deepEqual(Object.keys(template.roles), TYPE_ROLES);
  assert.deepEqual(
    Object.keys(template.quality.dimensions),
    TYPOGRAPHY_SCORE_DIMENSIONS.map((dimension) => dimension.id)
  );
  assert.equal(template.performance.localOnly, true);
  assert.equal(template.artDirection.headline.strategy, "balance-then-curate");
  assert.equal(template.screenshotValidation.status, "required-before-acceptance");
  assert.deepEqual(
    template.screenshotValidation.viewports.map(({ id, width, height }) => ({
      id,
      width,
      height
    })),
    TYPOGRAPHY_SCREENSHOT_VIEWPORTS
  );
});
