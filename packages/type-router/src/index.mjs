import {
  CURATED_FAMILIES,
  CURATED_PAIRINGS,
  SYSTEM_DEFAULT_FAMILIES
} from "./catalog.mjs";

export { CURATED_FAMILIES, CURATED_PAIRINGS, SYSTEM_DEFAULT_FAMILIES };

export const TYPE_ROLES = Object.freeze(["display", "body", "utility", "data"]);

export const TYPOGRAPHY_SCORE_DIMENSIONS = Object.freeze([
  Object.freeze({ id: "legibility", weight: 0.14 }),
  Object.freeze({ id: "specificity", weight: 0.1 }),
  Object.freeze({ id: "roleContrast", weight: 0.12 }),
  Object.freeze({ id: "artDirection", weight: 0.12 }),
  Object.freeze({ id: "referenceFidelity", weight: 0.18 }),
  Object.freeze({ id: "coverage", weight: 0.12 }),
  Object.freeze({ id: "weightRange", weight: 0.06 }),
  Object.freeze({ id: "fallbackCompatibility", weight: 0.06 }),
  Object.freeze({ id: "provenanceLicense", weight: 0.05 }),
  Object.freeze({ id: "performance", weight: 0.05 })
]);

export const TYPOGRAPHY_SCREENSHOT_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "desktop", width: 1440, height: 1000 }),
  Object.freeze({ id: "tablet", width: 1024, height: 900 }),
  Object.freeze({ id: "mobile", width: 390, height: 844 })
]);

const familyCatalog = new Map(
  CURATED_FAMILIES.map((font) => [font.family.toLowerCase(), font])
);
const genericQualityDefaults = new Set([
  ...SYSTEM_DEFAULT_FAMILIES,
  "inter",
  "lato",
  "montserrat",
  "open sans",
  "poppins"
]);
const genericFallbacks = new Set(["serif", "sans-serif", "monospace"]);
const allowedFontDisplay = new Set(["swap", "optional", "fallback"]);
const allowedCases = new Set(["sentence", "uppercase", "lowercase", "preserve", "script-aware"]);
const allowedTextTransforms = new Set(["none", "uppercase", "lowercase"]);
const allowedFontKinds = new Set(["serif", "sans", "mono", "display"]);
const allowedWidthClasses = new Set(["condensed", "compact", "normal", "wide", "monospaced"]);
const allowedContrastClasses = new Set(["low", "medium", "high", "monoline"]);
const allowedXHeights = new Set(["low", "medium", "high"]);
const scoreMinimums = Object.freeze({
  fast: 8.2,
  balanced: 8.2,
  quality: 8.2
});
const superQualityAliases = new Set(["super-quality", "superquality", "super_quality"]);
const viewportIds = Object.freeze(["mobile", "tablet", "desktop"]);

const languageScripts = Object.freeze({
  ar: ["Arabic"],
  bg: ["Cyrillic"],
  de: ["Latin"],
  el: ["Greek"],
  en: ["Latin"],
  es: ["Latin"],
  fa: ["Arabic"],
  fr: ["Latin"],
  he: ["Hebrew"],
  hi: ["Devanagari"],
  it: ["Latin"],
  ja: ["Han", "Hiragana", "Katakana"],
  kk: ["Cyrillic"],
  ko: ["Hangul"],
  pl: ["Latin"],
  pt: ["Latin"],
  ru: ["Cyrillic"],
  th: ["Thai"],
  tr: ["Latin"],
  uk: ["Cyrillic"],
  ur: ["Arabic"],
  vi: ["Latin"],
  zh: ["Han"]
});

const scriptNames = new Map(
  [
    "Arabic",
    "Cyrillic",
    "Devanagari",
    "Greek",
    "Han",
    "Hangul",
    "Hebrew",
    "Hiragana",
    "Katakana",
    "Latin",
    "Thai"
  ].map((script) => [script.toLowerCase(), script])
);

const voiceAliases = Object.freeze({
  futuristic: "technical",
  friendly: "human",
  luxury: "authoritative",
  luxurious: "authoritative",
  minimal: "calm",
  premium: "authoritative",
  quirky: "playful",
  serious: "authoritative",
  sophisticated: "considered"
});

const roleDefaults = Object.freeze({
  display: Object.freeze({
    desiredWeight: 700,
    lineHeight: 0.95,
    sizes: Object.freeze({
      low: Object.freeze({ mobile: 2.75, tablet: 5.25, desktop: 7.5 }),
      medium: Object.freeze({ mobile: 2.5, tablet: 4.5, desktop: 6.75 }),
      high: Object.freeze({ mobile: 2.25, tablet: 4, desktop: 5.75 })
    })
  }),
  body: Object.freeze({
    desiredWeight: 400,
    lineHeight: 1.55,
    sizes: Object.freeze({
      low: Object.freeze({ mobile: 1.05, tablet: 1.1, desktop: 1.18 }),
      medium: Object.freeze({ mobile: 1, tablet: 1.05, desktop: 1.125 }),
      high: Object.freeze({ mobile: 0.95, tablet: 1, desktop: 1.05 })
    })
  }),
  utility: Object.freeze({
    desiredWeight: 600,
    lineHeight: 1.2,
    sizes: Object.freeze({
      low: Object.freeze({ mobile: 0.72, tablet: 0.76, desktop: 0.8 }),
      medium: Object.freeze({ mobile: 0.69, tablet: 0.73, desktop: 0.78 }),
      high: Object.freeze({ mobile: 0.67, tablet: 0.71, desktop: 0.75 })
    })
  }),
  data: Object.freeze({
    desiredWeight: 500,
    lineHeight: 1.2,
    sizes: Object.freeze({
      low: Object.freeze({ mobile: 0.82, tablet: 0.88, desktop: 0.94 }),
      medium: Object.freeze({ mobile: 0.78, tablet: 0.84, desktop: 0.9 }),
      high: Object.freeze({ mobile: 0.75, tablet: 0.8, desktop: 0.86 })
    })
  })
});

const asArray = (value) => {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
};

const unique = (items) => [...new Set(items)];
const round = (value, places = 2) => Number(value.toFixed(places));
const clamp = (value, min = 0, max = 10) => Math.min(max, Math.max(min, value));
const keyOf = (value) => String(value ?? "").trim().toLowerCase();
const slugify = (value) => keyOf(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function normalizeTokens(value) {
  const tokens = asArray(value).flatMap((item) =>
    String(item)
      .toLowerCase()
      .split(/[\s,;/|]+/)
      .map((token) => token.trim())
      .filter(Boolean)
  );
  return unique(tokens.map((token) => voiceAliases[token] ?? token)).sort();
}

function normalizeScripts(scripts, languages) {
  const explicit = asArray(scripts)
    .map((script) => scriptNames.get(keyOf(script)) ?? String(script).trim())
    .filter(Boolean);
  if (explicit.length > 0) return unique(explicit);

  const inferred = asArray(languages).flatMap((language) => {
    const code = keyOf(language).split(/[-_]/)[0];
    return languageScripts[code] ?? ["Latin"];
  });
  return unique(inferred.length > 0 ? inferred : ["Latin"]);
}

function normalizeFiles(files = []) {
  return asArray(files).map((file) => {
    const item = typeof file === "string" ? { path: file } : { ...file };
    const format = String(
      item.format ??
      (String(item.path ?? "").toLowerCase().endsWith(".woff2") ? "woff2" : "")
    ).toLowerCase();
    return {
      path: String(item.path ?? ""),
      format,
      script: item.script ? (scriptNames.get(keyOf(item.script)) ?? String(item.script)) : null,
      weight: item.weight ?? null,
      style: item.style ?? "normal",
      estimatedKb: Number.isFinite(Number(item.estimatedKb))
        ? Math.max(0, Number(item.estimatedKb))
        : 45
    };
  });
}

function normalizeTypeCharacter(character = {}) {
  const width = keyOf(character.width);
  const contrast = keyOf(character.contrast);
  const xHeight = keyOf(character.xHeight);
  return {
    width: allowedWidthClasses.has(width) ? width : "unknown",
    contrast: allowedContrastClasses.has(contrast) ? contrast : "unknown",
    xHeight: allowedXHeights.has(xHeight) ? xHeight : "unknown",
    opticalCharacter: String(character.opticalCharacter ?? "").trim()
  };
}

function normalizeAllowedList(value, allowed) {
  return unique(
    asArray(value)
      .map(keyOf)
      .filter((item) => allowed.has(item))
  );
}

function numericRange(value, fallback = null) {
  if (Array.isArray(value) && value.length >= 2) {
    const numbers = value.slice(0, 2).map(Number);
    if (numbers.every(Number.isFinite)) {
      return { min: Math.min(...numbers), max: Math.max(...numbers) };
    }
  }
  if (value && typeof value === "object") {
    const minimum = Number(value.min ?? value.minimum ?? value.from);
    const maximum = Number(value.max ?? value.maximum ?? value.to);
    if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
      return { min: Math.min(minimum, maximum), max: Math.max(minimum, maximum) };
    }
    const target = Number(value.target ?? value.value);
    if (Number.isFinite(target)) return { min: target, max: target };
  }
  const parsed = Number.parseFloat(String(value ?? "").replace(/em$/i, ""));
  if (Number.isFinite(parsed)) return { min: parsed, max: parsed };
  return fallback;
}

function viewportNumbers(value, { integer = false } = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(viewportIds.flatMap((viewport) => {
    const parsed = Number(source[viewport]);
    if (!Number.isFinite(parsed)) return [];
    return [[viewport, integer ? Math.max(1, Math.round(parsed)) : parsed]];
  }));
}

function viewportLines(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(viewportIds.flatMap((viewport) => {
    const lines = asArray(source[viewport])
      .map((line) => String(line).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return lines.length ? [[viewport, lines]] : [];
  }));
}

function normalizeReferenceRole(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const caseValue = keyOf(source.case);
  const textTransform = keyOf(source.textTransform);
  return {
    required: source.required !== false,
    kinds: normalizeAllowedList(
      source.kinds ?? source.kind ?? source.familyClasses ?? source.familyClass,
      allowedFontKinds
    ),
    widths: normalizeAllowedList(source.widths ?? source.width, allowedWidthClasses),
    contrasts: normalizeAllowedList(
      source.contrasts ?? source.contrast ?? source.strokeContrast,
      allowedContrastClasses
    ),
    xHeights: normalizeAllowedList(source.xHeights ?? source.xHeight, allowedXHeights),
    case: allowedCases.has(caseValue) ? caseValue : null,
    textTransform: allowedTextTransforms.has(textTransform) ? textTransform : null,
    trackingEm: numericRange(
      source.trackingEm ?? source.trackingRange ?? source.letterSpacing
    ),
    lineHeight: numericRange(source.lineHeight ?? source.lineHeightRange),
    measuresCh: viewportNumbers(source.measureCh ?? source.measuresCh),
    lineCounts: viewportNumbers(
      source.lineCounts ?? source.exactLineCounts,
      { integer: true }
    ),
    roleDescription: String(
      source.roleDescription ?? source.ownership ?? source.role ?? ""
    ).trim()
  };
}

function normalizeReferenceTypography(value) {
  const source = value && typeof value === "object" ? value : {};
  const rolesSource = source.roles && typeof source.roles === "object"
    ? source.roles
    : {};
  const roles = Object.fromEntries(TYPE_ROLES.map((role) => [
    role,
    normalizeReferenceRole(rolesSource[role] ?? source[role])
  ]));
  const headlineSource = source.headline && typeof source.headline === "object"
    ? source.headline
    : {};
  const authoredLines = viewportLines(
    headlineSource.authoredLines ?? headlineSource.lines
  );
  const lineCounts = {
    ...viewportNumbers(
      headlineSource.lineCounts ?? headlineSource.exactLineCounts,
      { integer: true }
    ),
    ...Object.fromEntries(
      Object.entries(authoredLines).map(([viewport, lines]) => [viewport, lines.length])
    )
  };
  const scriptCompanions = asArray(
    source.scriptCompanions ?? source.multilingualCompanions
  ).map((companion) => {
    const item = companion && typeof companion === "object" ? companion : {};
    const suppliedScripts = asArray(item.scripts).filter((script) => String(script).trim());
    const suppliedLanguages = asArray(item.languages).filter((language) => String(language).trim());
    return {
      scripts: suppliedScripts.length || suppliedLanguages.length
        ? normalizeScripts(suppliedScripts, suppliedLanguages)
        : [],
      kind: allowedFontKinds.has(keyOf(item.kind ?? item.familyClass))
        ? keyOf(item.kind ?? item.familyClass)
        : null,
      character: String(item.character ?? item.style ?? "").trim()
    };
  }).filter((item) => item.scripts.length || item.kind || item.character);
  const hasRoleEvidence = Object.values(roles).some((role) => (
    role.kinds.length
    || role.widths.length
    || role.contrasts.length
    || role.xHeights.length
    || role.case
    || role.textTransform
    || role.trackingEm
    || role.lineHeight
    || Object.keys(role.measuresCh).length
    || Object.keys(role.lineCounts).length
    || role.roleDescription
  ));
  const text = String(
    headlineSource.text ?? source.headlineText ?? ""
  ).replace(/\s+/g, " ").trim();
  const emphasis = asArray(
    headlineSource.emphasis ?? source.emphasis
  ).map((entry) => String(entry).trim()).filter(Boolean);
  if (
    !hasRoleEvidence
    && !text
    && !Object.keys(authoredLines).length
    && !scriptCompanions.length
  ) return null;
  return {
    required: source.required !== false,
    sourceId: String(source.sourceId ?? source.referenceId ?? source.id ?? "").trim(),
    sourceHash: String(source.sourceHash ?? source.sha256 ?? "").trim(),
    confidence: String(source.confidence ?? "reference-conditioned").trim(),
    roles,
    headline: {
      text,
      emphasis,
      accentOnly: asArray(headlineSource.accentOnly)
        .map((entry) => String(entry).trim())
        .filter(Boolean),
      authoredLines,
      lineCounts
    },
    scriptCompanions
  };
}

function normalizeMetricFallback(fallback = {}) {
  return {
    alias: String(fallback.alias ?? "").trim(),
    sourceFamily: String(fallback.sourceFamily ?? fallback.family ?? "").trim(),
    sizeAdjust: String(fallback.sizeAdjust ?? "").trim(),
    ascentOverride: String(fallback.ascentOverride ?? "").trim(),
    descentOverride: String(fallback.descentOverride ?? "").trim(),
    lineGapOverride: String(fallback.lineGapOverride ?? "").trim(),
    calibration: String(fallback.calibration ?? "").trim()
  };
}

function normalizeProvidedFont(font, index) {
  if (!font || typeof font !== "object") {
    throw new TypeError(`providedFonts[${index}] must be an object.`);
  }
  const family = String(font.family ?? "").trim();
  if (!family) throw new TypeError(`providedFonts[${index}].family is required.`);

  const variableRange = Array.isArray(font.variableRange) && font.variableRange.length === 2
    ? font.variableRange.map(Number)
    : null;
  const weights = unique(
    asArray(font.weights).map(Number).filter((weight) => Number.isFinite(weight))
  ).sort((a, b) => a - b);
  const files = normalizeFiles(font.files);
  const suppliedScripts = asArray(font.scripts).map(String).filter((script) => script.trim());
  const scripts = suppliedScripts.length > 0 ? normalizeScripts(suppliedScripts, []) : [];
  const kind = ["serif", "sans", "mono", "display"].includes(keyOf(font.kind))
    ? keyOf(font.kind)
    : family.toLowerCase().includes("mono")
      ? "mono"
      : "sans";

  return {
    family,
    slug: slugify(family),
    kind,
    voices: normalizeTokens(font.voices),
    scripts,
    roles: unique(asArray(font.roles).map(keyOf).filter((role) => TYPE_ROLES.includes(role))),
    weights,
    variableRange,
    fallbacks: asArray(font.fallbacks).map(String).filter(Boolean),
    roleWeights: { ...font.roleWeights },
    metrics: {
      legibility: clamp(Number(font.metrics?.legibility ?? 5)),
      specificity: clamp(Number(font.metrics?.specificity ?? 4))
    },
    typeCharacter: normalizeTypeCharacter(font.typeCharacter),
    metricFallback: normalizeMetricFallback(font.metricFallback),
    metricsProven: typeof font.metricsProven === "boolean"
      ? font.metricsProven
      : Number.isFinite(Number(font.metrics?.legibility))
        && Number.isFinite(Number(font.metrics?.specificity)),
    estimatedSubsetKb: Number.isFinite(Number(font.estimatedSubsetKb))
      ? Math.max(1, Number(font.estimatedSubsetKb))
      : 45,
    license: String(font.license ?? "").trim(),
    provenance: String(font.provenance ?? "").trim(),
    fontDisplay: String(font.fontDisplay ?? "").trim().toLowerCase(),
    files,
    source: "provided"
  };
}

export function normalizeTypographyBrief(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Typography brief must be an object.");
  }

  const requestedMode = String(input.mode || "balanced").trim().toLowerCase();
  const mode = requestedMode === "economy"
    ? "fast"
    : superQualityAliases.has(requestedMode)
      ? "quality"
    : requestedMode === "auto"
      ? "balanced"
      : ["fast", "balanced", "quality"].includes(requestedMode)
        ? requestedMode
        : "balanced";
  const density = ["low", "medium", "high"].includes(input.contentDensity)
    ? input.contentDensity
    : "medium";
  const languages = unique(
    asArray(input.languages ?? "en").map((language) => String(language).trim()).filter(Boolean)
  );
  const providedFonts = asArray(input.providedFonts).map(normalizeProvidedFont);
  const providedStrategy = ["ignore", "prefer", "required"].includes(input.providedStrategy)
    ? input.providedStrategy
    : providedFonts.length > 0
      ? "prefer"
      : "ignore";
  const performance = input.performance && typeof input.performance === "object"
    ? input.performance
    : {};
  const referenceTypography = normalizeReferenceTypography(
    input.referenceTypography ?? input.typographyReference ?? input.reference
  );
  const headlineInput = input.headline && typeof input.headline === "object"
    ? input.headline
    : {};
  const headlineText = String(
    headlineInput.text
      ?? input.headlineText
      ?? referenceTypography?.headline?.text
      ?? ""
  ).replace(/\s+/g, " ").trim();

  return {
    mode,
    brandVoice: normalizeTokens(input.brandVoice ?? ["clear", "specific"]),
    contentDensity: density,
    languages,
    scripts: normalizeScripts(input.scripts, languages),
    providedFonts,
    providedStrategy,
    rolePreferences: Object.fromEntries(
      Object.entries(input.rolePreferences ?? {})
        .filter(([role, family]) => TYPE_ROLES.includes(role) && String(family).trim())
        .map(([role, family]) => [role, String(family).trim()])
    ),
    systemDefaultJustification: String(
      input.systemDefaultJustification ?? input.genericTypographyJustification ?? ""
    ).trim(),
    singleFamilyJustification: String(input.singleFamilyJustification ?? "").trim(),
    referenceTypography,
    headline: {
      text: headlineText,
      emphasis: asArray(
        headlineInput.emphasis
          ?? input.headlineEmphasis
          ?? referenceTypography?.headline?.emphasis
      )
        .map((value) => String(value).trim())
        .filter(Boolean)
    },
    performance: {
      localOnly: performance.localOnly !== false,
      maxFontFiles: Number.isFinite(Number(performance.maxFontFiles))
        ? Math.max(1, Math.floor(Number(performance.maxFontFiles)))
        : 6,
      maxTransferKb: Number.isFinite(Number(performance.maxTransferKb))
        ? Math.max(1, Number(performance.maxTransferKb))
        : 360,
      preloadLimit: Number.isFinite(Number(performance.preloadLimit))
        ? Math.max(1, Math.floor(Number(performance.preloadLimit)))
        : 2,
      fontDisplay: allowedFontDisplay.has(String(performance.fontDisplay).toLowerCase())
        ? String(performance.fontDisplay).toLowerCase()
        : "swap"
    }
  };
}

function supportsWeight(font, weight) {
  if (!Number.isFinite(Number(weight))) return false;
  const numericWeight = Number(weight);
  if (font.variableRange) {
    return numericWeight >= font.variableRange[0] && numericWeight <= font.variableRange[1];
  }
  return font.weights.includes(numericWeight);
}

function chooseWeight(font, role) {
  const requested = Number(font.roleWeights?.[role] ?? roleDefaults[role].desiredWeight);
  if (supportsWeight(font, requested)) return requested;
  if (font.variableRange) {
    return Math.min(font.variableRange[1], Math.max(font.variableRange[0], requested));
  }
  if (font.weights.length === 0) return requested;
  return [...font.weights].sort((a, b) =>
    Math.abs(a - requested) - Math.abs(b - requested) || a - b
  )[0];
}

function responsiveScale(role, density) {
  const sizes = roleDefaults[role].sizes[density];
  const preferred = role === "display"
    ? "calc(1.35rem + 4.9vw)"
    : role === "body"
      ? "calc(0.94rem + 0.18vw)"
      : role === "utility"
        ? "calc(0.65rem + 0.1vw)"
        : "calc(0.73rem + 0.14vw)";
  return {
    strategy: "fluid-clamp",
    unit: "rem",
    mobile: sizes.mobile,
    tablet: sizes.tablet,
    desktop: sizes.desktop,
    css: `clamp(${sizes.mobile}rem, ${preferred}, ${sizes.desktop}rem)`
  };
}

function measureRange(target, spread) {
  return {
    min: round(Math.max(1, target - spread), 1),
    target: round(target, 1),
    max: round(target + spread, 1)
  };
}

function roleMeasure(role, headline, referenceTypography = null) {
  const referenceMeasures = referenceTypography?.roles?.[role]?.measuresCh ?? {};
  const resolvedMeasure = (viewport, fallback) => (
    Number.isFinite(Number(referenceMeasures[viewport]))
      ? Number(referenceMeasures[viewport])
      : fallback
  );
  if (role === "display") {
    return {
      unit: "ch",
      mobile: measureRange(resolvedMeasure("mobile", headline.measureCh.mobile), 2),
      tablet: measureRange(resolvedMeasure("tablet", headline.measureCh.tablet), 2.5),
      desktop: measureRange(resolvedMeasure("desktop", headline.measureCh.desktop), 3)
    };
  }
  if (role === "body") {
    return {
      unit: "ch",
      mobile: measureRange(resolvedMeasure("mobile", 34), 8),
      tablet: measureRange(resolvedMeasure("tablet", 54), 12),
      desktop: measureRange(resolvedMeasure("desktop", 62), 12)
    };
  }
  if (role === "utility") {
    return {
      unit: "ch",
      mobile: measureRange(resolvedMeasure("mobile", 22), 12),
      tablet: measureRange(resolvedMeasure("tablet", 28), 14),
      desktop: measureRange(resolvedMeasure("desktop", 32), 16)
    };
  }
  return {
    unit: "ch",
    mobile: measureRange(resolvedMeasure("mobile", 12), 8),
    tablet: measureRange(resolvedMeasure("tablet", 16), 10),
    desktop: measureRange(resolvedMeasure("desktop", 18), 10)
  };
}

function roleMetrics(font, role, density, direction, headline, referenceTypography = null) {
  const roleDirection = direction.roles[role];
  return {
    family: font.family,
    kind: font.kind,
    weight: chooseWeight(font, role),
    style: "normal",
    lineHeight: roleDirection.lineHeight,
    letterSpacing: roleDirection.letterSpacing,
    case: roleDirection.case,
    textTransform: roleDirection.textTransform,
    fontOpticalSizing: roleDirection.opticalSizing,
    fontSynthesis: "none",
    typeCharacter: { ...font.typeCharacter },
    responsiveScale: responsiveScale(role, density),
    measure: roleMeasure(role, headline, referenceTypography),
    fontVariantNumeric: role === "data" ? "tabular-nums lining-nums" : "normal"
  };
}

function bareWord(value) {
  return keyOf(value).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function balanceHeadlineWords(words, contract, viewport) {
  if (words.length === 0) return [];
  const target = Number(contract.measureCh[viewport]);
  const maxLines = Math.max(1, Number(contract.maxLines[viewport]));
  const totalCharacters = words.join(" ").length;
  const desiredLines = Math.max(
    1,
    Math.min(maxLines, Math.round(totalCharacters / Math.max(1, target)))
  );
  const minimumLines = totalCharacters > target * 1.2
    ? Math.max(2, desiredLines)
    : 1;
  const forbidden = new Set(contract.forbiddenOrphanWords.map(keyOf));
  const memo = new Map();

  const solve = (start, linesLeft) => {
    const memoKey = `${start}:${linesLeft}`;
    if (memo.has(memoKey)) return memo.get(memoKey);
    if (linesLeft === 1) {
      const lineWords = words.slice(start);
      if (lineWords.length === 0) return null;
      const length = lineWords.join(" ").length;
      const singleWordPenalty = lineWords.length === 1 && words.length > 1 ? 180 : 0;
      const shortLastPenalty = length < contract.minLastLineCharacters ? 220 : 0;
      const orphanPenalty = forbidden.has(bareWord(lineWords[0])) ? 35 : 0;
      const result = {
        cost: Math.pow(length - target, 2)
          + singleWordPenalty
          + shortLastPenalty
          + orphanPenalty,
        lines: [lineWords.join(" ")]
      };
      memo.set(memoKey, result);
      return result;
    }

    let best = null;
    const lastEnd = words.length - (linesLeft - 1);
    for (let end = start + 1; end <= lastEnd; end += 1) {
      const lineWords = words.slice(start, end);
      const remainder = solve(end, linesLeft - 1);
      if (!remainder) continue;
      const length = lineWords.join(" ").length;
      const singleWordPenalty = lineWords.length === 1 ? 180 : 0;
      const weakStartPenalty = start > 0 && forbidden.has(bareWord(lineWords[0])) ? 45 : 0;
      const weakEndPenalty = forbidden.has(bareWord(lineWords.at(-1))) ? 80 : 0;
      const overMeasurePenalty = length > target * 1.45
        ? Math.pow(length - target * 1.45, 2) * 4
        : 0;
      const candidate = {
        cost: Math.pow(length - target, 2)
          + singleWordPenalty
          + weakStartPenalty
          + weakEndPenalty
          + overMeasurePenalty
          + remainder.cost,
        lines: [lineWords.join(" "), ...remainder.lines]
      };
      if (!best || candidate.cost < best.cost) best = candidate;
    }
    memo.set(memoKey, best);
    return best;
  };

  let best = null;
  const firstLineCount = Math.min(
    totalCharacters > target * 1.2 ? 2 : 1,
    words.length
  );
  const lastLineCount = Math.min(maxLines, words.length);
  for (let lineCount = firstLineCount; lineCount <= lastLineCount; lineCount += 1) {
    const result = solve(0, lineCount);
    if (!result) continue;
    const candidate = {
      ...result,
      cost: result.cost
        + Math.abs(lineCount - minimumLines) * 12
        + Math.max(0, lineCount - desiredLines) * 8
    };
    if (!best || candidate.cost < best.cost) best = candidate;
  }
  return best?.lines ?? [words.join(" ")];
}

export function choreographHeadline(text, contract) {
  const sourceText = String(text ?? "").replace(/\s+/g, " ").trim();
  const words = sourceText ? sourceText.split(" ") : [];
  const authoredLines = contract?.authoredLines ?? {};
  return {
    sourceText,
    copyRequiredAtImplementation: words.length === 0,
    strategy: contract.strategy,
    suggestions: Object.fromEntries(
      ["desktop", "tablet", "mobile"].map((viewport) => {
        const authored = asArray(authoredLines[viewport])
          .map((line) => String(line).replace(/\s+/g, " ").trim())
          .filter(Boolean);
        const authoredText = authored.join(" ").replace(/\s+/g, " ").trim();
        return [
          viewport,
          authored.length && authoredText === sourceText
            ? authored
            : balanceHeadlineWords(words, contract, viewport)
        ];
      })
    )
  };
}

function createHeadlineContract(direction, brief) {
  const referenceHeadline = brief.referenceTypography?.headline ?? {};
  const exactLineCounts = {
    ...(referenceHeadline.lineCounts ?? {})
  };
  const contract = {
    ...direction.headline,
    measureCh: { ...direction.headline.measureCh },
    maxLines: Object.fromEntries(viewportIds.map((viewport) => [
      viewport,
      exactLineCounts[viewport] ?? direction.headline.maxLines[viewport]
    ])),
    forbiddenOrphanWords: [...direction.headline.forbiddenOrphanWords],
    emphasis: [...brief.headline.emphasis],
    accentOnly: [...(referenceHeadline.accentOnly ?? [])],
    authoredLines: Object.fromEntries(
      Object.entries(referenceHeadline.authoredLines ?? {}).map(([viewport, lines]) => [
        viewport,
        [...lines]
      ])
    ),
    exactLineCounts
  };
  return {
    ...contract,
    choreography: choreographHeadline(brief.headline.text, contract)
  };
}

function midpoint(range) {
  return range ? round((Number(range.min) + Number(range.max)) / 2, 3) : null;
}

function applyReferenceArtDirection(direction, brief) {
  const reference = brief.referenceTypography;
  if (!reference) return direction;
  const roles = Object.fromEntries(TYPE_ROLES.map((role) => {
    const base = direction.roles[role];
    const expected = reference.roles[role];
    const tracking = midpoint(expected?.trackingEm);
    const lineHeight = midpoint(expected?.lineHeight);
    return [role, {
      ...base,
      ...(expected?.case ? { case: expected.case } : {}),
      ...(expected?.textTransform ? { textTransform: expected.textTransform } : {}),
      ...(Number.isFinite(tracking) ? { letterSpacing: `${tracking}em` } : {}),
      ...(Number.isFinite(lineHeight) ? { lineHeight } : {})
    }];
  }));
  const displayMeasures = reference.roles.display?.measuresCh ?? {};
  const lineCounts = {
    ...(reference.roles.display?.lineCounts ?? {}),
    ...(reference.headline?.lineCounts ?? {})
  };
  return {
    ...direction,
    roles,
    headline: {
      ...direction.headline,
      measureCh: Object.fromEntries(viewportIds.map((viewport) => [
        viewport,
        displayMeasures[viewport] ?? direction.headline.measureCh[viewport]
      ])),
      maxLines: Object.fromEntries(viewportIds.map((viewport) => [
        viewport,
        lineCounts[viewport] ?? direction.headline.maxLines[viewport]
      ]))
    }
  };
}

function createScreenshotValidationContract(roles, headline) {
  return {
    schemaVersion: "1.0",
    status: "required-before-acceptance",
    viewports: TYPOGRAPHY_SCREENSHOT_VIEWPORTS.map((viewport) => ({
      ...viewport,
      display: {
        maxLines: headline.maxLines[viewport.id],
        exactLines: headline.exactLineCounts?.[viewport.id] ?? null,
        measureCh: { ...roles.display.measure[viewport.id] }
      },
      body: {
        measureCh: { ...roles.body.measure[viewport.id] }
      }
    })),
    thresholds: {
      minDisplayToBodySizeRatio: 2.35,
      minShortestDisplayLineFillRatio: headline.minLineFillRatio,
      maxSingleWordDisplayLines: headline.maxSingleWordLines,
      minLastDisplayLineCharacters: headline.minLastLineCharacters,
      maxFontLoadLayoutShift: 0.02,
      maxHorizontalOverflowPx: 0
    },
    requiredComputedRoles: [...TYPE_ROLES],
    requiredComputedProperties: [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "fontStretch",
      "fontOpticalSizing",
      "fontVariationSettings",
      "fontSynthesis",
      "lineHeight",
      "letterSpacing",
      "textTransform",
      "lineCount"
    ],
    requireDocumentFontsReady: true,
    requireFamilyChecks: true,
    requiredJudgments: [
      "hierarchyDistinct",
      "wrapsIntentional",
      "typePersonalityMatches",
      "fallbackStable"
    ],
    requiredEvidence: [
      "fresh screenshot path",
      "SHA-256 screenshot hash",
      "loaded-font confirmation",
      "document.fonts.check confirmation for every declared family",
      "computed family per role",
      "computed typography properties per role",
      "measured wrap and line-length data"
    ]
  };
}

function generatedCatalogFiles(font, usedRoles, brief) {
  const requiredScripts = brief.scripts.filter((script) => font.scripts.includes(script));
  const subsetScripts = [];
  const japaneseScripts = new Set(["Han", "Hiragana", "Katakana"]);
  if (requiredScripts.some((script) => japaneseScripts.has(script))) {
    subsetScripts.push("Japanese");
  }
  subsetScripts.push(...requiredScripts.filter((script) => !japaneseScripts.has(script)));
  const weights = unique(usedRoles.map((role) => chooseWeight(font, role))).sort((a, b) => a - b);
  return unique(subsetScripts).flatMap((script) => {
    if (font.variableRange) {
      return [{
        path: `/fonts/${font.slug}-${slugify(script)}-variable.woff2`,
        format: "woff2",
        script,
        weight: `${font.variableRange[0]} ${font.variableRange[1]}`,
        style: "normal",
        estimatedKb: font.estimatedSubsetKb
      }];
    }
    return weights.map((weight) => ({
      path: `/fonts/${font.slug}-${slugify(script)}-${weight}.woff2`,
      format: "woff2",
      script,
      weight,
      style: "normal",
      estimatedKb: font.estimatedSubsetKb
    }));
  });
}

function materializePlan({
  id,
  label,
  roleFamilies,
  rationale,
  voices,
  densities,
  artDirection,
  familyLookup,
  source
}, brief) {
  const resolvedArtDirection = applyReferenceArtDirection(artDirection, brief);
  const headline = createHeadlineContract(resolvedArtDirection, brief);
  const roles = Object.fromEntries(TYPE_ROLES.map((role) => {
    const font = familyLookup.get(keyOf(roleFamilies[role]));
    if (!font) throw new Error(`Unknown font family for ${role}: ${roleFamilies[role]}`);
    return [role, roleMetrics(
      font,
      role,
      brief.contentDensity,
      resolvedArtDirection,
      headline,
      brief.referenceTypography
    )];
  }));

  const usedFamilyNames = unique(TYPE_ROLES.map((role) => roles[role].family));
  const families = usedFamilyNames.map((familyName) => {
    const font = familyLookup.get(keyOf(familyName));
    const usedRoles = TYPE_ROLES.filter((role) => roles[role].family === familyName);
    const files = font.source === "provided"
      ? font.files.map((file) => ({ ...file }))
      : generatedCatalogFiles(font, usedRoles, brief);
    return {
      ...font,
      voices: [...font.voices],
      scripts: [...font.scripts],
      weights: [...font.weights],
      variableRange: font.variableRange ? [...font.variableRange] : null,
      fallbacks: [...font.fallbacks],
      roleWeights: { ...font.roleWeights },
      metrics: { ...font.metrics },
      typeCharacter: { ...font.typeCharacter },
      metricFallback: { ...font.metricFallback },
      usedBy: usedRoles,
      files
    };
  });

  return {
    id,
    label,
    source,
    voices: [...voices],
    densities: [...densities],
    rationale: [...rationale],
    artDirection: {
      contrastStrategy: resolvedArtDirection.contrastStrategy,
      referenceConditioned: Boolean(brief.referenceTypography)
    },
    headline,
    roles,
    families,
    screenshotValidation: createScreenshotValidationContract(roles, headline)
  };
}

function catalogPlan(pairing, brief) {
  return materializePlan({
    id: pairing.id,
    label: pairing.label,
    roleFamilies: pairing.roles,
    rationale: pairing.rationale,
    voices: pairing.voices,
    densities: pairing.densities,
    artDirection: pairing.artDirection,
    familyLookup: familyCatalog,
    source: "curated"
  }, brief);
}

function voiceMatch(font, brief) {
  if (brief.brandVoice.length === 0) return 5;
  const fontVoices = new Set(font.voices);
  return brief.brandVoice.filter((voice) => fontVoices.has(voice)).length / brief.brandVoice.length;
}

function providedArtDirection(display, body, brief) {
  const latinOnly = brief.scripts.every((script) => script === "Latin");
  const displayTracking = display.kind === "serif" ? "-0.02em" : "-0.032em";
  return {
    contrastStrategy: `Use ${display.family}'s ${display.typeCharacter.width} ${display.typeCharacter.opticalCharacter || "display character"} against ${body.family}'s reading texture; distinguish utility and data through case, tracking, scale, and numeric behavior rather than family names alone.`,
    roles: {
      display: {
        case: "sentence",
        textTransform: "none",
        letterSpacing: displayTracking,
        lineHeight: display.kind === "serif" ? 0.95 : 0.92,
        opticalSizing: "auto"
      },
      body: {
        case: "sentence",
        textTransform: "none",
        letterSpacing: "0em",
        lineHeight: 1.58,
        opticalSizing: "auto"
      },
      utility: {
        case: latinOnly ? "uppercase" : "script-aware",
        textTransform: latinOnly ? "uppercase" : "none",
        letterSpacing: latinOnly ? "0.11em" : "0em",
        lineHeight: 1.18,
        opticalSizing: "auto"
      },
      data: {
        case: "preserve",
        textTransform: "none",
        letterSpacing: "0.015em",
        lineHeight: 1.2,
        opticalSizing: "auto"
      }
    },
    headline: {
      strategy: "balance-then-curate",
      measureCh: { mobile: 11, tablet: 12.5, desktop: 14 },
      maxLines: { mobile: 4, tablet: 3, desktop: 3 },
      minLineFillRatio: 0.42,
      minLastLineCharacters: 4,
      maxSingleWordLines: 0,
      forbiddenOrphanWords: [
        "a",
        "an",
        "and",
        "at",
        "by",
        "for",
        "from",
        "in",
        "of",
        "or",
        "the",
        "to",
        "with"
      ]
    }
  };
}

function providedPlan(brief) {
  if (brief.providedFonts.length === 0) return null;
  const lookup = new Map(brief.providedFonts.map((font) => [keyOf(font.family), font]));

  const best = (role, filter = () => true) => {
    const preference = brief.rolePreferences[role];
    if (preference && lookup.has(keyOf(preference))) return lookup.get(keyOf(preference));
    const explicit = brief.providedFonts.filter((font) => font.roles.includes(role) && filter(font));
    const pool = explicit.length > 0 ? explicit : brief.providedFonts.filter(filter);
    return [...pool].sort((a, b) => {
      const roleMetric = role === "body" ? "legibility" : "specificity";
      return voiceMatch(b, brief) - voiceMatch(a, brief)
        || b.metrics[roleMetric] - a.metrics[roleMetric]
        || a.family.localeCompare(b.family);
    })[0] ?? null;
  };

  const display = best("display", (font) => font.kind !== "mono");
  const body = best("body", (font) => font.kind !== "mono") ?? display;
  const utility = best("utility", (font) => font.kind !== "mono") ?? body;
  const data = best("data", (font) => font.kind === "mono") ?? body;
  if (!display || !body || !utility || !data) return null;

  return materializePlan({
    id: "provided-led",
    label: "Provided-font direction",
    roleFamilies: {
      display: display.family,
      body: body.family,
      utility: utility.family,
      data: data.family
    },
    rationale: [
      "Use supplied font files only where their role, coverage, and provenance are documented.",
      "Keep display, reading, utility, and data behavior explicit.",
      "Reject the direction if the supplied evidence cannot satisfy the loading and quality gates."
    ],
    voices: unique(brief.providedFonts.flatMap((font) => font.voices)),
    densities: ["low", "medium", "high"],
    artDirection: providedArtDirection(display, body, brief),
    familyLookup: lookup,
    source: "provided"
  }, brief);
}

function familyForRole(plan, role) {
  const familyName = plan.roles?.[role]?.family;
  return plan.families?.find((font) => font.family === familyName) ?? null;
}

function scriptCoverage(font, scripts) {
  if (!font || scripts.length === 0) return 0;
  return scripts.filter((script) => font.scripts.includes(script)).length / scripts.length;
}

function roleContrastScore(plan) {
  const display = familyForRole(plan, "display");
  const body = familyForRole(plan, "body");
  const utility = familyForRole(plan, "utility");
  const data = familyForRole(plan, "data");
  if (!display || !body || !utility || !data) return 0;

  let score = 1;
  if (display.family !== body.family) score += 2.5;
  if (display.kind !== body.kind) score += 1.5;
  if (display.typeCharacter?.width !== body.typeCharacter?.width) score += 0.75;
  if (display.typeCharacter?.contrast !== body.typeCharacter?.contrast) score += 0.75;
  if (
    display.family === body.family
    && Math.abs(Number(plan.roles.display.weight) - Number(plan.roles.body.weight)) >= 150
  ) score += 1.25;
  const displayDesktop = Number(plan.roles.display.responsiveScale?.desktop);
  const bodyDesktop = Number(plan.roles.body.responsiveScale?.desktop);
  if (displayDesktop / Math.max(0.1, bodyDesktop) >= 2.35) score += 1.5;
  if (Number(plan.roles.display.lineHeight) + 0.2 <= Number(plan.roles.body.lineHeight)) {
    score += 0.75;
  }
  if (
    Number(plan.roles.display.measure?.desktop?.target)
    < Number(plan.roles.body.measure?.desktop?.target) * 0.5
  ) score += 0.75;
  if (
    plan.roles.utility.case !== plan.roles.body.case
    || plan.roles.utility.letterSpacing !== plan.roles.body.letterSpacing
  ) score += 1;
  if (utility.family !== body.family) score += 1;
  if (data.kind === "mono") score += 1;
  if (data.family !== body.family) score += 0.5;
  if (plan.roles.data.fontVariantNumeric === "tabular-nums lining-nums") score += 0.5;
  if (
    utility.family === body.family
    && plan.roles.utility.weight !== plan.roles.body.weight
  ) score += 0.5;
  return clamp(score);
}

function inRange(value, range, tolerance = 0.0001) {
  if (!range) return true;
  const numeric = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(numeric)
    && numeric >= Number(range.min) - tolerance
    && numeric <= Number(range.max) + tolerance;
}

function referenceRoleChecks(plan, brief, role) {
  const referenceRole = brief.referenceTypography?.roles?.[role];
  if (!referenceRole) return [];
  const rolePlan = plan.roles?.[role];
  const font = familyForRole(plan, role);
  const checks = [];
  const add = (dimension, expected, actual, passed) => {
    if (!expected || (Array.isArray(expected) && expected.length === 0)) return;
    checks.push({ role, dimension, expected, actual, passed });
  };
  add("familyClass", referenceRole.kinds, font?.kind, referenceRole.kinds.length === 0
    || referenceRole.kinds.includes(font?.kind));
  add("width", referenceRole.widths, font?.typeCharacter?.width, referenceRole.widths.length === 0
    || referenceRole.widths.includes(font?.typeCharacter?.width));
  add("strokeContrast", referenceRole.contrasts, font?.typeCharacter?.contrast, referenceRole.contrasts.length === 0
    || referenceRole.contrasts.includes(font?.typeCharacter?.contrast));
  add("xHeight", referenceRole.xHeights, font?.typeCharacter?.xHeight, referenceRole.xHeights.length === 0
    || referenceRole.xHeights.includes(font?.typeCharacter?.xHeight));
  add("case", referenceRole.case, rolePlan?.case, !referenceRole.case
    || referenceRole.case === rolePlan?.case);
  add("textTransform", referenceRole.textTransform, rolePlan?.textTransform, !referenceRole.textTransform
    || referenceRole.textTransform === rolePlan?.textTransform);
  add("trackingEm", referenceRole.trackingEm, rolePlan?.letterSpacing, inRange(
    rolePlan?.letterSpacing,
    referenceRole.trackingEm
  ));
  add("lineHeight", referenceRole.lineHeight, rolePlan?.lineHeight, inRange(
    rolePlan?.lineHeight,
    referenceRole.lineHeight
  ));
  for (const viewport of viewportIds) {
    const expectedMeasure = referenceRole.measuresCh?.[viewport];
    if (Number.isFinite(Number(expectedMeasure))) {
      const actual = rolePlan?.measure?.[viewport]?.target;
      add(`measureCh.${viewport}`, expectedMeasure, actual, Math.abs(
        Number(actual) - Number(expectedMeasure)
      ) <= 0.2);
    }
  }
  return checks;
}

function referenceTypographyChecks(plan, brief) {
  if (!brief.referenceTypography) return [];
  const checks = TYPE_ROLES.flatMap((role) => referenceRoleChecks(plan, brief, role));
  const headline = plan.headline ?? {};
  for (const viewport of viewportIds) {
    const expected = brief.referenceTypography.headline?.lineCounts?.[viewport]
      ?? brief.referenceTypography.roles?.display?.lineCounts?.[viewport];
    if (!Number.isFinite(Number(expected))) continue;
    const actual = headline.choreography?.suggestions?.[viewport]?.length;
    checks.push({
      role: "display",
      dimension: `headlineLineCount.${viewport}`,
      expected: Number(expected),
      actual,
      passed: Number(actual) === Number(expected)
    });
  }
  for (const companion of brief.referenceTypography.scriptCompanions ?? []) {
    for (const role of ["display", "body", "data"]) {
      const font = familyForRole(plan, role);
      const requiredByRole = brief.referenceTypography.roles?.[role]?.kinds ?? [];
      const expectedKind = companion.kind && (
        requiredByRole.length === 0 || requiredByRole.includes(companion.kind)
      )
        ? companion.kind
        : null;
      if (expectedKind) {
        checks.push({
          role,
          dimension: "scriptCompanion.familyClass",
          expected: expectedKind,
          actual: font?.kind,
          scripts: companion.scripts,
          passed: font?.kind === expectedKind
        });
      }
      if (companion.scripts.length) {
        const missingScripts = companion.scripts.filter((script) =>
          !font?.scripts?.includes(script)
        );
        checks.push({
          role,
          dimension: "scriptCompanion.coverage",
          expected: companion.scripts,
          actual: font?.scripts ?? [],
          character: companion.character,
          passed: missingScripts.length === 0
        });
      }
    }
  }
  return checks;
}

function referenceFidelityScore(plan, brief) {
  const checks = referenceTypographyChecks(plan, brief);
  if (!brief.referenceTypography || checks.length === 0) return 10;
  return clamp(checks.filter((check) => check.passed).length / checks.length * 10);
}

function hasProof(value) {
  const normalized = keyOf(value);
  return normalized.length > 0 && !["unknown", "unverified", "none", "n/a"].includes(normalized);
}

function isGenericQualityDefault(family) {
  return genericQualityDefaults.has(keyOf(family));
}

function sourceMatchesWeight(source, weight) {
  if (typeof source.weight === "number") return source.weight === Number(weight);
  const match = String(source.weight ?? "").match(/^(\d+)\s+(\d+)$/);
  if (match) return Number(weight) >= Number(match[1]) && Number(weight) <= Number(match[2]);
  return source.weight === null || source.weight === undefined;
}

function buildSourcePlan(plan, input = {}) {
  const brief = normalizeTypographyBrief(input);
  const primaryScript = brief.scripts[0];
  const preloadFamilies = unique(["display", "body"].map((role) => plan.roles?.[role]?.family).filter(Boolean));
  let preloadsRemaining = brief.performance.preloadLimit;

  const fonts = (plan.families ?? []).map((font) => {
    const preferredWeight = plan.roles?.display?.family === font.family
      ? plan.roles.display.weight
      : plan.roles?.body?.family === font.family
        ? plan.roles.body.weight
        : null;
    const preferredIndex = font.files.findIndex((source) =>
      (!source.script || source.script === primaryScript)
      && (preferredWeight === null || sourceMatchesWeight(source, preferredWeight))
    );
    const preloadIndex = preferredIndex >= 0 ? preferredIndex : 0;
    const shouldPreload = preloadFamilies.includes(font.family)
      && preloadIndex >= 0
      && preloadsRemaining > 0;
    if (shouldPreload) preloadsRemaining -= 1;

    const sources = font.files.map((source, index) => ({
      ...source,
      preload: shouldPreload && index === preloadIndex,
      fontDisplay: font.fontDisplay || brief.performance.fontDisplay
    }));
    return {
      family: font.family,
      kind: font.kind,
      usedBy: [...font.usedBy],
      scripts: [...font.scripts],
      license: font.license,
      provenance: font.provenance,
      fallbacks: [...font.fallbacks],
      typeCharacter: { ...font.typeCharacter },
      metricFallback: { ...font.metricFallback },
      sources
    };
  });

  const sources = fonts.flatMap((font) =>
    font.sources.map((source) => ({ ...source, family: font.family }))
  );
  return {
    fonts,
    preloads: sources.filter((source) => source.preload),
    fileCount: sources.length,
    totalEstimatedKb: round(sources.reduce((sum, source) => sum + source.estimatedKb, 0), 1)
  };
}

function validPercentDescriptor(value, { min = 0, max = 200 } = {}) {
  const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!match) return false;
  const numeric = Number(match[1]);
  return numeric >= min && numeric <= max;
}

function hasMetricFallback(font) {
  const fallback = font?.metricFallback ?? {};
  return Boolean(
    fallback.alias
    && fallback.sourceFamily
    && fallback.alias !== fallback.sourceFamily
    && font.fallbacks?.some((family) => keyOf(family) === keyOf(fallback.sourceFamily))
    && validPercentDescriptor(fallback.sizeAdjust, { min: 50, max: 200 })
    && validPercentDescriptor(fallback.ascentOverride, { min: 50, max: 150 })
    && validPercentDescriptor(fallback.descentOverride, { min: 0, max: 100 })
    && validPercentDescriptor(fallback.lineGapOverride, { min: 0, max: 100 })
  );
}

function roleArtDirectionChecks(rolePlan) {
  const scale = rolePlan?.responsiveScale ?? {};
  const measure = rolePlan?.measure ?? {};
  return [
    allowedCases.has(rolePlan?.case),
    allowedTextTransforms.has(rolePlan?.textTransform),
    /^-?\d+(?:\.\d+)?em$/.test(String(rolePlan?.letterSpacing ?? "")),
    ["auto", "none"].includes(rolePlan?.fontOpticalSizing),
    rolePlan?.fontSynthesis === "none",
    allowedWidthClasses.has(rolePlan?.typeCharacter?.width),
    allowedContrastClasses.has(rolePlan?.typeCharacter?.contrast),
    allowedXHeights.has(rolePlan?.typeCharacter?.xHeight),
    hasProof(rolePlan?.typeCharacter?.opticalCharacter),
    ["mobile", "tablet", "desktop"].every((viewport) =>
      Number.isFinite(Number(scale[viewport]))
    ),
    scale.strategy === "fluid-clamp" && hasProof(scale.css),
    ["mobile", "tablet", "desktop"].every((viewport) =>
      Number.isFinite(Number(measure[viewport]?.min))
      && Number.isFinite(Number(measure[viewport]?.target))
      && Number.isFinite(Number(measure[viewport]?.max))
    )
  ];
}

function artDirectionReadinessScore(plan) {
  const roleChecks = TYPE_ROLES.flatMap((role) => roleArtDirectionChecks(plan.roles?.[role]));
  const headline = plan.headline ?? {};
  const headlineChecks = [
    hasProof(plan.artDirection?.contrastStrategy),
    headline.strategy === "balance-then-curate",
    ["mobile", "tablet", "desktop"].every((viewport) =>
      Number.isFinite(Number(headline.measureCh?.[viewport]))
      && Number.isFinite(Number(headline.maxLines?.[viewport]))
    ),
    Number(headline.minLineFillRatio) >= 0.35,
    Number(headline.minLastLineCharacters) >= 3,
    Array.isArray(headline.forbiddenOrphanWords)
      && headline.forbiddenOrphanWords.length >= 6,
    plan.screenshotValidation?.status === "required-before-acceptance",
    plan.screenshotValidation?.viewports?.length === TYPOGRAPHY_SCREENSHOT_VIEWPORTS.length
  ];
  const checks = [...roleChecks, ...headlineChecks];
  return clamp(checks.filter(Boolean).length / Math.max(1, checks.length) * 10);
}

export function scoreTypographyPlan(plan, input = {}) {
  const brief = normalizeTypographyBrief(input);
  const roleFonts = Object.fromEntries(
    TYPE_ROLES.map((role) => [role, familyForRole(plan, role)])
  );
  const sourcePlan = buildSourcePlan(plan, brief);

  const legibility = clamp(
    (roleFonts.body?.metrics.legibility ?? 0) * 0.55
    + (roleFonts.utility?.metrics.legibility ?? 0) * 0.15
    + (roleFonts.display?.metrics.legibility ?? 0) * 0.15
    + (roleFonts.data?.metrics.legibility ?? 0) * 0.15
  );
  const distinctFamilies = unique(TYPE_ROLES.map((role) => plan.roles?.[role]?.family).filter(Boolean));
  const specificity = clamp(
    (roleFonts.display?.metrics.specificity ?? 0) * 0.65
    + (roleFonts.body?.metrics.specificity ?? 0) * 0.2
    + Math.min(10, distinctFamilies.length * 2.5) * 0.15
  );
  const roleContrast = roleContrastScore(plan);
  const artDirection = artDirectionReadinessScore(plan);
  const referenceFidelity = referenceFidelityScore(plan, brief);
  const coverage = clamp(
    TYPE_ROLES.reduce((sum, role) => sum + scriptCoverage(roleFonts[role], brief.scripts), 0)
    / TYPE_ROLES.length
    * 10
  );
  const weightRange = clamp(
    (plan.families ?? []).reduce((sum, font) => {
      const familyScore = font.variableRange
        ? 10
        : Math.min(10, 3 + font.weights.length * 1.4);
      return sum + familyScore;
    }, 0) / Math.max(1, plan.families?.length ?? 0)
  );
  const provenanceLicense = clamp(
    (plan.families ?? []).reduce((sum, font) =>
      sum + (hasProof(font.license) ? 5 : 0) + (hasProof(font.provenance) ? 5 : 0), 0
    ) / Math.max(1, plan.families?.length ?? 0)
  );
  const fallbackCompatibility = clamp(
    (plan.families ?? []).filter(hasMetricFallback).length
    / Math.max(1, plan.families?.length ?? 0)
    * 10
  );
  const localWoff2Ratio = sourcePlan.fileCount === 0
    ? 0
    : sourcePlan.fonts.flatMap((font) => font.sources).filter((source) =>
      source.format === "woff2" && source.path.toLowerCase().endsWith(".woff2")
    ).length / sourcePlan.fileCount;
  const fileBudgetRatio = Math.min(1, brief.performance.maxFontFiles / Math.max(1, sourcePlan.fileCount));
  const transferBudgetRatio = Math.min(
    1,
    brief.performance.maxTransferKb / Math.max(1, sourcePlan.totalEstimatedKb)
  );
  const preloadBudgetRatio = Math.min(
    1,
    brief.performance.preloadLimit / Math.max(1, sourcePlan.preloads.length)
  );
  const performance = clamp(
    (localWoff2Ratio * 0.4 + fileBudgetRatio * 0.25 + transferBudgetRatio * 0.25 + preloadBudgetRatio * 0.1) * 10
  );

  const rawDimensions = {
    legibility,
    specificity,
    roleContrast,
    artDirection,
    referenceFidelity,
    coverage,
    weightRange,
    fallbackCompatibility,
    provenanceLicense,
    performance
  };
  const dimensions = Object.fromEntries(TYPOGRAPHY_SCORE_DIMENSIONS.map((dimension) => [
    dimension.id,
    {
      score: round(rawDimensions[dimension.id]),
      weight: dimension.weight,
      evidence: dimension.id === "coverage"
        ? `${round(rawDimensions[dimension.id])}/10 coverage across ${brief.scripts.join(", ")}.`
        : dimension.id === "referenceFidelity"
          ? brief.referenceTypography
            ? `${round(rawDimensions[dimension.id])}/10 match against the adopted reference typography contract.`
            : "10/10; no adopted typography reference constrains this run."
        : dimension.id === "performance"
          ? `${sourcePlan.fileCount} local files, approximately ${sourcePlan.totalEstimatedKb} KB, ${sourcePlan.preloads.length} preloads.`
          : `${round(rawDimensions[dimension.id])}/10 computed from the selected role plan.`
    }
  ]));
  const score = round(TYPOGRAPHY_SCORE_DIMENSIONS.reduce(
    (sum, dimension) => sum + rawDimensions[dimension.id] * dimension.weight,
    0
  ));
  const minimum = scoreMinimums[brief.mode];

  return {
    score,
    percentage: round(score * 10, 1),
    minimum,
    passed: score >= minimum,
    dimensions
  };
}

function issue(id, message, details = {}) {
  return { id, message, ...details };
}

export function validateTypographyPlan(plan, input = {}) {
  const brief = normalizeTypographyBrief(input);
  const hardFailures = [];
  const warnings = [];
  const roles = plan?.roles ?? {};
  const families = plan?.families ?? [];

  const missingRoles = TYPE_ROLES.filter((role) => !roles[role]?.family);
  if (missingRoles.length > 0) {
    hardFailures.push(issue(
      "missing-role",
      `Typography plan is missing roles: ${missingRoles.join(", ")}.`,
      { roles: missingRoles }
    ));
  }

  const roleFonts = Object.fromEntries(
    TYPE_ROLES.map((role) => [role, familyForRole(plan, role)])
  );

  for (const role of TYPE_ROLES) {
    const rolePlan = roles[role];
    const checks = roleArtDirectionChecks(rolePlan);
    if (checks.some((passed) => !passed)) {
      hardFailures.push(issue(
        "role-art-direction-required",
        `${role} requires explicit width/optical character, case, tracking, fluid scale, and measure decisions.`,
        {
          role,
          failedChecks: checks
            .map((passed, index) => ({ passed, index }))
            .filter((check) => !check.passed)
            .map((check) => check.index)
        }
      ));
    }
    const scale = rolePlan?.responsiveScale;
    if (
      scale
      && !(
        Number(scale.mobile) <= Number(scale.tablet)
        && Number(scale.tablet) <= Number(scale.desktop)
      )
    ) {
      hardFailures.push(issue(
        "responsive-type-scale",
        `${role} must use a monotonic mobile, tablet, and desktop type scale.`,
        { role, scale }
      ));
    }
  }

  const roleScaleRatios = TYPE_ROLES.map((role) => {
    const scale = roles[role]?.responsiveScale;
    return Number(scale?.desktop) / Math.max(0.1, Number(scale?.mobile));
  }).filter(Number.isFinite);
  if (
    roleScaleRatios.length === TYPE_ROLES.length
    && Math.max(...roleScaleRatios) - Math.min(...roleScaleRatios) < 0.2
  ) {
    hardFailures.push(issue(
      "uniform-responsive-scaling",
      "Mobile typography cannot be a uniformly scaled desktop system; display, reading, utility, and data roles must transform independently."
    ));
  }

  const contrastScore = roleContrastScore(plan);
  if (contrastScore < 7.5) {
    hardFailures.push(issue(
      "role-contrast-collapse",
      `The role contrast contract scores ${contrastScore}/10; display, body, utility, and data are not optically distinct enough.`,
      { actual: contrastScore, minimum: 7.5 }
    ));
  }

  const utilityTracking = Number.parseFloat(roles.utility?.letterSpacing);
  if (
    roles.utility?.case === "uppercase"
    && !(utilityTracking >= 0.06 && utilityTracking <= 0.16)
  ) {
    hardFailures.push(issue(
      "utility-case-tracking",
      "Uppercase utility text requires restrained tracking between 0.06em and 0.16em.",
      { actual: roles.utility?.letterSpacing }
    ));
  }
  if (
    roles.utility?.case === "script-aware"
    && Math.abs(utilityTracking) > 0.001
  ) {
    hardFailures.push(issue(
      "utility-case-tracking",
      "Script-aware utility text must not apply Latin-style tracking globally.",
      { actual: roles.utility?.letterSpacing }
    ));
  }

  const headline = plan?.headline;
  const headlineValid = headline
    && headline.strategy === "balance-then-curate"
    && ["mobile", "tablet", "desktop"].every((viewport) =>
      Number(headline.measureCh?.[viewport]) >= 8
      && Number(headline.measureCh?.[viewport]) <= 18
      && Number(headline.maxLines?.[viewport]) >= 1
      && Number(headline.maxLines?.[viewport]) <= 5
    )
    && Number(headline.minLineFillRatio) >= 0.35
    && Number(headline.minLineFillRatio) <= 0.75
    && Number(headline.minLastLineCharacters) >= 3
    && Number(headline.maxSingleWordLines) === 0
    && Array.isArray(headline.forbiddenOrphanWords)
    && headline.forbiddenOrphanWords.length >= 6;
  if (!headlineValid) {
    hardFailures.push(issue(
      "headline-choreography-required",
      "Display type requires bounded measures, viewport line limits, orphan rules, and a balance-then-curate break strategy."
    ));
  }

  if (headline?.choreography?.sourceText) {
    for (const viewport of ["mobile", "tablet", "desktop"]) {
      const lines = headline.choreography.suggestions?.[viewport] ?? [];
      const singleWordLines = lines.filter((line) => line.trim().split(/\s+/).length === 1);
      const weakLines = lines.filter((line) =>
        headline.forbiddenOrphanWords.includes(bareWord(line.split(/\s+/)[0]))
        && line.trim().split(/\s+/).length === 1
      );
      if (
        lines.length > Number(headline.maxLines[viewport])
        || singleWordLines.length > Number(headline.maxSingleWordLines)
        || weakLines.length > 0
      ) {
        hardFailures.push(issue(
          "headline-break-failure",
          `The suggested ${viewport} headline breaks violate the line-count or orphan contract.`,
          { viewport, lines }
        ));
      }
    }
  }

  if (brief.referenceTypography?.required) {
    for (const mismatch of referenceTypographyChecks(plan, brief).filter((check) => !check.passed)) {
      hardFailures.push(issue(
        "reference-typography-mismatch",
        `${mismatch.role} ${mismatch.dimension} does not match the adopted typography reference.`,
        mismatch
      ));
    }
  }

  const screenshotContract = plan?.screenshotValidation;
  const screenshotIds = screenshotContract?.viewports?.map((viewport) => viewport.id) ?? [];
  if (
    screenshotContract?.status !== "required-before-acceptance"
    || !TYPOGRAPHY_SCREENSHOT_VIEWPORTS.every((viewport) =>
      screenshotIds.includes(viewport.id)
    )
    || !TYPE_ROLES.every((role) =>
      screenshotContract?.requiredComputedRoles?.includes(role)
    )
    || screenshotContract?.requireDocumentFontsReady !== true
    || screenshotContract?.requireFamilyChecks !== true
    || !["fontFamily", "fontSynthesis", "lineCount"].every((property) =>
      screenshotContract?.requiredComputedProperties?.includes(property)
    )
    || !["hierarchyDistinct", "wrapsIntentional", "typePersonalityMatches", "fallbackStable"]
      .every((judgment) => screenshotContract?.requiredJudgments?.includes(judgment))
  ) {
    hardFailures.push(issue(
      "screenshot-validation-required",
      "The type plan must require hash-bound desktop, tablet, and mobile screenshot evidence with computed roles, wrap measurements, and qualitative judgments."
    ));
  }

  if (TYPE_ROLES.every((role) => roleFonts[role]?.kind === "mono")) {
    hardFailures.push(issue(
      "mono-everywhere",
      "Monospace cannot serve display, body, utility, and data roles simultaneously."
    ));
  }
  if (["display", "body", "utility"].every((role) => roleFonts[role]?.kind === "mono")) {
    hardFailures.push(issue(
      "mono-primary-roles",
      "Monospace cannot carry every primary reading role; reserve it for data or a bounded utility use."
    ));
  } else if (roleFonts.body?.kind === "mono") {
    warnings.push(issue(
      "monospace-body",
      "Body copy uses monospace; verify reading comfort and content fit."
    ));
  }
  if (roleFonts.data && roleFonts.data.kind !== "mono") {
    warnings.push(issue(
      "non-mono-data",
      "The data role is not monospaced; retain tabular numerals and verify column alignment."
    ));
  }

  for (const role of TYPE_ROLES) {
    const font = roleFonts[role];
    if (!font || !roles[role]) continue;
    if (!supportsWeight(font, roles[role].weight)) {
      hardFailures.push(issue(
        "fake-weight",
        `${font.family} does not provide weight ${roles[role].weight} for ${role}.`,
        { role, family: font.family, weight: roles[role].weight }
      ));
    }
  }

  const allSameFamily = unique(
    TYPE_ROLES.map((role) => roles[role]?.family).filter(Boolean)
  ).length === 1;
  if (allSameFamily && !brief.singleFamilyJustification) {
    warnings.push(issue(
      "single-family-system",
      "All roles use one family without a documented contrast strategy."
    ));
  }

  const systemFamilies = families.filter((font) => isGenericQualityDefault(font.family));
  if (systemFamilies.length > 0 && brief.systemDefaultJustification.length < 20) {
    hardFailures.push(issue(
      "system-default-unjustified",
      `The elite-v1 quality contract rejects unjustified generic/default typography: ${systemFamilies.map((font) => font.family).join(", ")}.`,
      { families: systemFamilies.map((font) => font.family) }
    ));
  }
  const unproven = families.filter((font) =>
    !hasProof(font.license) || !hasProof(font.provenance) || font.metricsProven === false
  );
  if (unproven.length > 0) {
    hardFailures.push(issue(
      "unproven-font",
      `The elite-v1 quality contract requires license, provenance, and measured role metrics for: ${unproven.map((font) => font.family).join(", ")}.`,
      { families: unproven.map((font) => font.family) }
    ));
  }

  for (const role of TYPE_ROLES) {
    const font = roleFonts[role];
    if (!font) continue;
    const missingScripts = brief.scripts.filter((script) => !font.scripts.includes(script));
    if (missingScripts.length > 0) {
      hardFailures.push(issue(
        "script-coverage",
        `${font.family} does not cover ${missingScripts.join(", ")} for ${role}.`,
        { role, family: font.family, scripts: missingScripts }
      ));
    }
  }

  const sourcePlan = buildSourcePlan(plan, brief);
  if (!brief.performance.localOnly) {
    hardFailures.push(issue(
      "local-only-required",
      "Design Lagann type plans require locally hosted font files."
    ));
  }
  for (const font of sourcePlan.fonts) {
    if (font.sources.length === 0) {
      hardFailures.push(issue(
        "missing-font-source",
        `${font.family} has no local source plan.`,
        { family: font.family }
      ));
      continue;
    }
    const invalidSources = font.sources.filter((source) =>
      source.format !== "woff2"
      || !source.path.toLowerCase().endsWith(".woff2")
      || /^(?:https?:)?\/\//i.test(source.path)
      || /^(?:data|blob):/i.test(source.path)
    );
    if (invalidSources.length > 0) {
      hardFailures.push(issue(
        "local-woff2-required",
        `${font.family} must use local WOFF2 sources only.`,
        { family: font.family, paths: invalidSources.map((source) => source.path) }
      ));
    }
    if (font.sources.some((source) => !allowedFontDisplay.has(source.fontDisplay))) {
      hardFailures.push(issue(
        "font-display-required",
        `${font.family} requires font-display: swap, optional, or fallback.`,
        { family: font.family }
      ));
    }
    const finalFallback = keyOf(font.fallbacks.at(-1));
    if (font.fallbacks.length < 2 || !genericFallbacks.has(finalFallback)) {
      hardFailures.push(issue(
        "fallback-plan-required",
        `${font.family} requires a metric-compatible named fallback and a generic family.`,
        { family: font.family }
      ));
    }
    if (!hasMetricFallback(font)) {
      hardFailures.push(issue(
        "metric-fallback-required",
        `${font.family} requires a local fallback alias with size-adjust, ascent, descent, and line-gap overrides tied to a named fallback.`,
        { family: font.family, metricFallback: font.metricFallback }
      ));
    }
  }

  const criticalFamilies = unique(
    ["display", "body"].map((role) => roles[role]?.family).filter(Boolean)
  );
  const missingPreloads = criticalFamilies.filter((family) =>
    !sourcePlan.preloads.some((source) => source.family === family)
  );
  if (missingPreloads.length > 0) {
    hardFailures.push(issue(
      "preload-plan-required",
      `Display and body sources need a bounded preload plan: ${missingPreloads.join(", ")}.`,
      { families: missingPreloads }
    ));
  }

  if (sourcePlan.fileCount > brief.performance.maxFontFiles) {
    hardFailures.push(issue(
      "font-file-budget",
      `The plan needs ${sourcePlan.fileCount} files; the budget allows ${brief.performance.maxFontFiles}.`,
      { actual: sourcePlan.fileCount, maximum: brief.performance.maxFontFiles }
    ));
  }
  if (sourcePlan.totalEstimatedKb > brief.performance.maxTransferKb) {
    hardFailures.push(issue(
      "font-transfer-budget",
      `The plan is approximately ${sourcePlan.totalEstimatedKb} KB; the budget allows ${brief.performance.maxTransferKb} KB.`,
      { actual: sourcePlan.totalEstimatedKb, maximum: brief.performance.maxTransferKb }
    ));
  }
  if (sourcePlan.preloads.length > brief.performance.preloadLimit) {
    hardFailures.push(issue(
      "font-preload-budget",
      `The plan preloads ${sourcePlan.preloads.length} files; the budget allows ${brief.performance.preloadLimit}.`
    ));
  }

  const quality = scoreTypographyPlan(plan, brief);
  if (!quality.passed) {
    hardFailures.push(issue(
      "quality-score",
      `Typography Quality Score ${quality.score} is below the ${brief.mode} minimum of ${quality.minimum}.`,
      { actual: quality.score, minimum: quality.minimum }
    ));
  }

  return {
    passed: hardFailures.length === 0,
    hardFailures,
    warnings,
    quality,
    sourcePlan
  };
}

export function validateTypographyScreenshotReport(manifest, report = {}) {
  const hardFailures = [];
  const warnings = [];
  const contract = manifest?.screenshotValidation;
  const captures = Array.isArray(report?.captures) ? report.captures : [];

  if (!contract || contract.status !== "required-before-acceptance") {
    return {
      passed: false,
      hardFailures: [issue(
        "screenshot-contract-missing",
        "A qualified type manifest with a screenshot-validation contract is required."
      )],
      warnings
    };
  }

  const captureIds = captures.map((capture) => capture?.viewport);
  const duplicateIds = unique(captureIds.filter((id, index) =>
    id && captureIds.indexOf(id) !== index
  ));
  if (duplicateIds.length > 0) {
    hardFailures.push(issue(
      "duplicate-screenshot-viewport",
      `Screenshot report repeats viewports: ${duplicateIds.join(", ")}.`,
      { viewports: duplicateIds }
    ));
  }

  for (const viewportContract of contract.viewports) {
    const capture = captures.find((candidate) =>
      candidate?.viewport === viewportContract.id
    );
    if (!capture) {
      hardFailures.push(issue(
        "screenshot-viewport-missing",
        `Screenshot report is missing ${viewportContract.id}.`,
        { viewport: viewportContract.id }
      ));
      continue;
    }

    if (
      Number(capture.width) !== Number(viewportContract.width)
      || Number(capture.height) !== Number(viewportContract.height)
    ) {
      hardFailures.push(issue(
        "screenshot-viewport-mismatch",
        `${viewportContract.id} must be captured at ${viewportContract.width}×${viewportContract.height}.`,
        {
          viewport: viewportContract.id,
          expected: { width: viewportContract.width, height: viewportContract.height },
          actual: { width: capture.width, height: capture.height }
        }
      ));
    }

    if (
      !hasProof(capture.screenshotPath)
      || !/^[a-f0-9]{64}$/i.test(String(capture.screenshotSha256 ?? ""))
    ) {
      hardFailures.push(issue(
        "screenshot-evidence-missing",
        `${viewportContract.id} requires a fresh screenshot path and SHA-256 hash.`,
        { viewport: viewportContract.id }
      ));
    }
    if (
      capture.fontsLoaded !== true
      || (
        contract.requireDocumentFontsReady
        && capture.fontSetStatus !== "loaded"
      )
    ) {
      hardFailures.push(issue(
        "font-load-unconfirmed",
        `${viewportContract.id} did not confirm document.fonts readiness.`,
        { viewport: viewportContract.id }
      ));
    }
    if (contract.requireFamilyChecks) {
      const failedFamilies = unique((manifest.fontFaces ?? []).map((font) => font.family))
        .filter((family) => capture.fontChecks?.[family] !== true);
      if (failedFamilies.length) {
        hardFailures.push(issue(
          "font-family-check-failed",
          `${viewportContract.id} did not pass document.fonts.check for ${failedFamilies.join(", ")}.`,
          { viewport: viewportContract.id, families: failedFamilies }
        ));
      }
    }

    const measurements = capture.measurements ?? {};
    const thresholds = contract.thresholds;
    if (
      !Number.isFinite(Number(measurements.displayLineCount))
      || Number(measurements.displayLineCount) > viewportContract.display.maxLines
    ) {
      hardFailures.push(issue(
        "display-line-count",
        `${viewportContract.id} display copy exceeds its ${viewportContract.display.maxLines}-line limit.`,
        { viewport: viewportContract.id, actual: measurements.displayLineCount }
      ));
    }
    if (
      viewportContract.display.exactLines !== null
      && viewportContract.display.exactLines !== undefined
      && Number.isFinite(Number(viewportContract.display.exactLines))
      && Number(measurements.displayLineCount) !== Number(viewportContract.display.exactLines)
    ) {
      hardFailures.push(issue(
        "display-reference-line-count",
        `${viewportContract.id} must preserve the adopted ${viewportContract.display.exactLines}-line display composition.`,
        {
          viewport: viewportContract.id,
          expected: viewportContract.display.exactLines,
          actual: measurements.displayLineCount
        }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.shortestDisplayLineFillRatio))
      || Number(measurements.shortestDisplayLineFillRatio)
        < thresholds.minShortestDisplayLineFillRatio
    ) {
      hardFailures.push(issue(
        "display-line-fill",
        `${viewportContract.id} contains an under-filled display line.`,
        {
          viewport: viewportContract.id,
          actual: measurements.shortestDisplayLineFillRatio,
          minimum: thresholds.minShortestDisplayLineFillRatio
        }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.singleWordDisplayLines))
      || Number(measurements.singleWordDisplayLines) > thresholds.maxSingleWordDisplayLines
    ) {
      hardFailures.push(issue(
        "display-orphan-line",
        `${viewportContract.id} contains a forbidden one-word display line.`,
        { viewport: viewportContract.id, actual: measurements.singleWordDisplayLines }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.lastDisplayLineCharacters))
      || Number(measurements.lastDisplayLineCharacters)
        < thresholds.minLastDisplayLineCharacters
    ) {
      hardFailures.push(issue(
        "display-last-line",
        `${viewportContract.id} ends the display phrase with an under-sized last line.`,
        { viewport: viewportContract.id, actual: measurements.lastDisplayLineCharacters }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.bodyMeasureCh))
      || Number(measurements.bodyMeasureCh) < viewportContract.body.measureCh.min
      || Number(measurements.bodyMeasureCh) > viewportContract.body.measureCh.max
    ) {
      hardFailures.push(issue(
        "body-measure",
        `${viewportContract.id} body measure must stay between ${viewportContract.body.measureCh.min}ch and ${viewportContract.body.measureCh.max}ch.`,
        { viewport: viewportContract.id, actual: measurements.bodyMeasureCh }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.displayToBodySizeRatio))
      || Number(measurements.displayToBodySizeRatio)
        < thresholds.minDisplayToBodySizeRatio
    ) {
      hardFailures.push(issue(
        "rendered-role-contrast",
        `${viewportContract.id} display-to-body scale contrast is too weak.`,
        { viewport: viewportContract.id, actual: measurements.displayToBodySizeRatio }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.fontLoadLayoutShift))
      || Number(measurements.fontLoadLayoutShift) > thresholds.maxFontLoadLayoutShift
    ) {
      hardFailures.push(issue(
        "font-load-layout-shift",
        `${viewportContract.id} fallback-to-webfont layout shift exceeds ${thresholds.maxFontLoadLayoutShift}.`,
        { viewport: viewportContract.id, actual: measurements.fontLoadLayoutShift }
      ));
    }
    if (
      !Number.isFinite(Number(measurements.horizontalOverflowPx))
      || Number(measurements.horizontalOverflowPx) > thresholds.maxHorizontalOverflowPx
    ) {
      hardFailures.push(issue(
        "type-overflow",
        `${viewportContract.id} typography causes horizontal overflow.`,
        { viewport: viewportContract.id, actual: measurements.horizontalOverflowPx }
      ));
    }

    for (const role of contract.requiredComputedRoles) {
      const expectedFamily = keyOf(manifest.roles?.[role]?.family);
      const computed = measurements.computedTypography?.[role] ?? {};
      const actualFamily = keyOf(
        computed.fontFamily ?? measurements.computedFamilies?.[role]
      );
      if (!expectedFamily || !actualFamily.includes(expectedFamily)) {
        hardFailures.push(issue(
          "computed-role-family",
          `${viewportContract.id} did not render the declared ${role} family.`,
          {
            viewport: viewportContract.id,
            role,
            expected: manifest.roles?.[role]?.family,
            actual: computed.fontFamily ?? measurements.computedFamilies?.[role]
          }
        ));
      }
      const missingProperties = (contract.requiredComputedProperties ?? [])
        .filter((property) => computed[property] === undefined || computed[property] === null);
      if (missingProperties.length) {
        hardFailures.push(issue(
          "computed-role-properties",
          `${viewportContract.id} is missing computed typography evidence for ${role}.`,
          { viewport: viewportContract.id, role, properties: missingProperties }
        ));
      }
      if (computed.fontSynthesis !== "none") {
        hardFailures.push(issue(
          "font-synthesis-enabled",
          `${viewportContract.id} ${role} must render with font-synthesis: none.`,
          { viewport: viewportContract.id, role, actual: computed.fontSynthesis }
        ));
      }
    }

    for (const judgment of contract.requiredJudgments) {
      if (capture.judgments?.[judgment] !== true) {
        hardFailures.push(issue(
          "typography-judgment-failed",
          `${viewportContract.id} did not pass the ${judgment} screenshot judgment.`,
          { viewport: viewportContract.id, judgment }
        ));
      }
    }
  }

  return {
    passed: hardFailures.length === 0,
    hardFailures,
    warnings
  };
}

function candidateFit(plan, brief) {
  const planVoices = new Set(plan.voices);
  const matchedVoices = brief.brandVoice.filter((voice) => planVoices.has(voice));
  const brandFit = brief.brandVoice.length === 0
    ? 5
    : matchedVoices.length / brief.brandVoice.length * 10;
  const densityFit = plan.densities.includes(brief.contentDensity) ? 10 : 4;
  const scriptFit = TYPE_ROLES.reduce((sum, role) =>
    sum + scriptCoverage(familyForRole(plan, role), brief.scripts), 0
  ) / TYPE_ROLES.length * 10;
  const providedFit = plan.source === "provided"
    ? brief.providedStrategy === "prefer" || brief.providedStrategy === "required" ? 10 : 0
    : brief.providedStrategy === "required" ? 0 : 5;
  const referenceFit = referenceFidelityScore(plan, brief);
  return { brandFit, densityFit, scriptFit, providedFit, referenceFit, matchedVoices };
}

export function rankTypographyCandidates(input = {}) {
  const brief = normalizeTypographyBrief(input);
  const plans = brief.providedStrategy === "required"
    ? [providedPlan(brief)].filter(Boolean)
    : [
      ...CURATED_PAIRINGS.map((pairing) => catalogPlan(pairing, brief)),
      ...(brief.providedStrategy === "prefer" ? [providedPlan(brief)].filter(Boolean) : [])
    ];
  if (plans.length === 0) {
    throw new Error("No typography candidates can be built from the supplied fonts.");
  }

  return plans.map((plan) => {
    const validation = validateTypographyPlan(plan, brief);
    const fit = candidateFit(plan, brief);
    const failurePenalty = validation.hardFailures.length * 1.25;
    const rankScore = round(brief.referenceTypography
      ? validation.quality.score * 0.38
        + fit.referenceFit * 0.34
        + fit.brandFit * 0.12
        + fit.densityFit * 0.04
        + fit.scriptFit * 0.09
        + fit.providedFit * 0.03
        - failurePenalty
      : validation.quality.score * 0.52
        + fit.brandFit * 0.24
        + fit.densityFit * 0.08
        + fit.scriptFit * 0.12
        + fit.providedFit * 0.04
        - failurePenalty);
    return {
      id: plan.id,
      label: plan.label,
      rankScore,
      eligible: validation.passed,
      fit: {
        brandVoice: round(fit.brandFit),
        contentDensity: round(fit.densityFit),
        scriptCoverage: round(fit.scriptFit),
        providedFonts: round(fit.providedFit),
        referenceTypography: round(fit.referenceFit),
        matchedVoices: fit.matchedVoices
      },
      quality: validation.quality,
      hardFailures: validation.hardFailures,
      warnings: validation.warnings,
      plan
    };
  }).sort((a, b) =>
    b.rankScore - a.rankScore
    || Number(b.eligible) - Number(a.eligible)
    || a.id.localeCompare(b.id)
  ).map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function quotedFamily(family) {
  return /[\s]/.test(family) ? `"${family}"` : family;
}

export function createTypeManifest(plan, input = {}) {
  const brief = normalizeTypographyBrief(input);
  const validation = validateTypographyPlan(plan, brief);
  const sourcePlan = validation.sourcePlan;
  const fontsByFamily = new Map(sourcePlan.fonts.map((font) => [font.family, font]));

  const roles = Object.fromEntries(TYPE_ROLES.map((role) => {
    const rolePlan = plan.roles[role];
    const font = fontsByFamily.get(rolePlan.family);
    const fallbackStack = unique([
      rolePlan.family,
      font.metricFallback.alias,
      ...font.fallbacks
    ]).filter(Boolean);
    return [role, {
      ...rolePlan,
      fallbackStack: fallbackStack.map(quotedFamily).join(", ")
    }];
  }));

  return {
    schemaVersion: "1.0",
    generatedBy: "@design-lagann/type-router",
    mode: brief.mode,
    decision: {
      status: validation.passed ? "qualified" : "rejected",
      candidateId: plan.id,
      candidateLabel: plan.label,
      rationale: [...plan.rationale]
    },
    artDirection: {
      contrastStrategy: plan.artDirection.contrastStrategy,
      headline: {
        ...plan.headline,
        measureCh: { ...plan.headline.measureCh },
        maxLines: { ...plan.headline.maxLines },
        forbiddenOrphanWords: [...plan.headline.forbiddenOrphanWords],
        emphasis: [...plan.headline.emphasis],
        accentOnly: [...(plan.headline.accentOnly ?? [])],
        authoredLines: Object.fromEntries(
          Object.entries(plan.headline.authoredLines ?? {}).map(([viewport, lines]) => [
            viewport,
            [...lines]
          ])
        ),
        exactLineCounts: { ...(plan.headline.exactLineCounts ?? {}) },
        choreography: {
          ...plan.headline.choreography,
          suggestions: Object.fromEntries(
            Object.entries(plan.headline.choreography.suggestions).map(([viewport, lines]) => [
              viewport,
              [...lines]
            ])
          )
        }
      }
    },
    context: {
      brandVoice: [...brief.brandVoice],
      contentDensity: brief.contentDensity,
      languages: [...brief.languages],
      scripts: [...brief.scripts],
      referenceTypography: brief.referenceTypography
        ? structuredClone(brief.referenceTypography)
        : null
    },
    roles,
    fontFaces: sourcePlan.fonts.map((font) => ({
      family: font.family,
      kind: font.kind,
      usedBy: font.usedBy,
      scripts: font.scripts,
      license: font.license,
      provenance: font.provenance,
      fallbacks: font.fallbacks,
      typeCharacter: font.typeCharacter,
      metricFallback: {
        ...font.metricFallback,
        src: `local(${quotedFamily(font.metricFallback.sourceFamily)})`
      },
      sources: font.sources
    })),
    preloads: sourcePlan.preloads.map((source) => ({
      href: source.path,
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous",
      family: source.family
    })),
    cssVariables: Object.fromEntries(TYPE_ROLES.flatMap((role) => {
      const rolePlan = roles[role];
      return [
        [`--font-${role}`, rolePlan.fallbackStack],
        [`--font-${role}-weight`, String(rolePlan.weight)],
        [`--font-${role}-line-height`, String(rolePlan.lineHeight)],
        [`--font-${role}-letter-spacing`, rolePlan.letterSpacing],
        [`--font-${role}-size`, rolePlan.responsiveScale.css],
        [`--font-${role}-text-transform`, rolePlan.textTransform],
        [`--font-${role}-optical-sizing`, rolePlan.fontOpticalSizing],
        [`--font-${role}-synthesis`, rolePlan.fontSynthesis],
        [`--font-${role}-measure`, `${rolePlan.measure.desktop.target}ch`]
      ];
    })),
    responsiveTokens: Object.fromEntries(
      ["mobile", "tablet", "desktop"].map((viewport) => [
        viewport,
        Object.fromEntries(TYPE_ROLES.map((role) => [
          role,
          {
            fontSizeRem: roles[role].responsiveScale[viewport],
            measureCh: { ...roles[role].measure[viewport] },
            lineHeight: roles[role].lineHeight,
            letterSpacing: roles[role].letterSpacing,
            textTransform: roles[role].textTransform,
            fontSynthesis: roles[role].fontSynthesis
          }
        ]))
      ])
    ),
    performance: {
      localOnly: brief.performance.localOnly,
      fileCount: sourcePlan.fileCount,
      estimatedTransferKb: sourcePlan.totalEstimatedKb,
      preloadCount: sourcePlan.preloads.length,
      budgets: { ...brief.performance }
    },
    quality: validation.quality,
    gates: {
      passed: validation.passed,
      hardFailures: validation.hardFailures,
      warnings: validation.warnings
    },
    screenshotValidation: {
      ...plan.screenshotValidation,
      viewports: plan.screenshotValidation.viewports.map((viewport) => ({
        ...viewport,
        display: {
          ...viewport.display,
          measureCh: { ...viewport.display.measureCh }
        },
        body: {
          ...viewport.body,
          measureCh: { ...viewport.body.measureCh }
        }
      })),
      thresholds: { ...plan.screenshotValidation.thresholds },
      requiredComputedRoles: [...plan.screenshotValidation.requiredComputedRoles],
      requiredComputedProperties: [...plan.screenshotValidation.requiredComputedProperties],
      requiredJudgments: [...plan.screenshotValidation.requiredJudgments],
      requiredEvidence: [...plan.screenshotValidation.requiredEvidence]
    },
    rules: [
      "Bundle verified local WOFF2 files; do not load remote font CSS in production.",
      "Preload only the bounded display/body sources listed in this manifest.",
      "Use only declared real or variable weights; never synthesize bold or italic.",
      "Set font-synthesis: none on the root and every declared type role.",
      "Reserve monospace for the data role or a documented bounded utility use.",
      "Emit each metricFallback alias as a local() @font-face with the declared metric overrides before the named and generic fallbacks.",
      "Implement role case, tracking, optical character, independent responsive scale, and measure tokens; family selection alone does not satisfy the type direction.",
      "Balance headline wrapping within the declared measure, then curate explicit breaks only when the supplied copy is stable; never isolate an article or preposition.",
      "When reference-authored headline lines exist, implement those exact breaks and verify the exact line count at every bound viewport.",
      "Re-run script coverage and transfer-budget checks when languages change.",
      "Wait for document.fonts.ready, require document.fonts.check for every declared family, and reject browser fallback substitution.",
      "Do not accept typography until the hash-bound desktop, tablet, and mobile screenshot report passes this manifest's validation contract."
    ]
  };
}

export class TypographyQualityError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "TypographyQualityError";
    this.code = "DESIGN_LAGANN_TYPE_QUALITY_GATE";
    this.details = details;
  }
}

export function routeTypography(input = {}) {
  const brief = normalizeTypographyBrief(input);
  const ranking = rankTypographyCandidates(brief);
  const selectedCandidate = ranking.find((candidate) => candidate.eligible) ?? ranking[0];
  const validation = validateTypographyPlan(selectedCandidate.plan, brief);

  if (!validation.passed) {
    throw new TypographyQualityError(
      `No typography direction passed the ${brief.mode} gate. ${validation.hardFailures.map((failure) => failure.message).join(" ")}`,
      {
        selectedCandidate: selectedCandidate.id,
        hardFailures: validation.hardFailures,
        ranking: ranking.map((candidate) => ({
          id: candidate.id,
          rank: candidate.rank,
          rankScore: candidate.rankScore,
          eligible: candidate.eligible
        }))
      }
    );
  }

  const manifest = createTypeManifest(selectedCandidate.plan, brief);
  return {
    schemaVersion: "1.0",
    status: "qualified",
    mode: brief.mode,
    selection: selectedCandidate.plan,
    quality: validation.quality,
    gates: {
      passed: true,
      hardFailures: [],
      warnings: validation.warnings
    },
    ranking,
    manifest
  };
}
