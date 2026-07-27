const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const text = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value : value === undefined ? [] : [value];

export const MEDIA_TYPES = Object.freeze([
  "transparent-raster",
  "css",
  "rive",
  "lottie",
  "canvas",
  "three-js-r3f",
  "video",
  "chart-library"
]);

export const VISUAL_INTENTS = Object.freeze([
  "product",
  "food",
  "character",
  "hero-object",
  "decorative",
  "interface-icon",
  "brand-mark",
  "data-visualization",
  "motion-graphic",
  "generative-visual",
  "spatial-3d",
  "cinematic-scene",
  "editorial-image"
]);

export const SVG_HARD_GATE_INTENTS = VISUAL_INTENTS;

export const PROHIBITED_MEDIA_TYPES = Object.freeze([
  "svg",
  "icon-library"
]);

const RANKED_MEDIA_TYPES = Object.freeze([
  ...MEDIA_TYPES,
  ...PROHIBITED_MEDIA_TYPES
]);

export const NO_SVG_POLICY = Object.freeze({
  id: "no-svg-anywhere",
  severity: "hard",
  svgAllowed: false,
  allowedRasterFormats: Object.freeze(["png", "jpg", "jpeg", "webp", "avif"]),
  allowedCodeGeometry: Object.freeze(["html", "css", "canvas"]),
  forbiddenArtifacts: Object.freeze([
    "SVG files or .svg asset paths",
    "inline <svg> markup",
    "data:image/svg+xml payloads",
    "CSS url(), mask, clip-path, or background references to SVG",
    "icon-library components that render SVG",
    "SVG renderers or SVG fallbacks from animation, chart, or visualization libraries"
  ]),
  verification: Object.freeze([
    "Scan project filenames and source text before browser review.",
    "Inspect the rendered DOM and network requests at desktop, tablet, and mobile.",
    "Fail the run when any SVG file, markup node, data URI, request, renderer, or fallback is present."
  ])
});

export const ASSET_QUALITY_DIMENSIONS = Object.freeze([
  { id: "intentFidelity", weight: 25 },
  { id: "compositionUtility", weight: 20 },
  { id: "artDirectionCoherence", weight: 15 },
  { id: "sourceQuality", weight: 10 },
  { id: "responsiveReadiness", weight: 10 },
  { id: "provenanceReadiness", weight: 8 },
  { id: "performanceReadiness", weight: 7 },
  { id: "accessibilityReadiness", weight: 5 }
]);

const MEDIA_CATALOG = Object.freeze({
  "transparent-raster": {
    label: "Transparent raster / art-directed image",
    complexity: "medium",
    defaultBudgetBytes: 450_000
  },
  css: {
    label: "CSS",
    complexity: "low",
    defaultBudgetBytes: 8_000
  },
  "icon-library": {
    label: "Icon library",
    complexity: "low",
    defaultBudgetBytes: 30_000
  },
  rive: {
    label: "Rive",
    complexity: "medium",
    defaultBudgetBytes: 250_000
  },
  lottie: {
    label: "Lottie",
    complexity: "medium",
    defaultBudgetBytes: 180_000
  },
  canvas: {
    label: "Canvas",
    complexity: "medium",
    defaultBudgetBytes: 60_000
  },
  "three-js-r3f": {
    label: "Three.js / React Three Fiber",
    complexity: "high",
    defaultBudgetBytes: 650_000
  },
  video: {
    label: "Video",
    complexity: "high",
    defaultBudgetBytes: 1_500_000
  },
  svg: {
    label: "SVG",
    complexity: "low",
    defaultBudgetBytes: 60_000
  },
  "chart-library": {
    label: "Chart library",
    complexity: "medium",
    defaultBudgetBytes: 180_000
  }
});

const INTENT_ALIASES = Object.freeze({
  product: "product",
  "product-render": "product",
  merchandise: "product",
  food: "food",
  pastry: "food",
  culinary: "food",
  character: "character",
  mascot: "character",
  portrait: "character",
  person: "character",
  hero: "hero-object",
  "hero-object": "hero-object",
  centerpiece: "hero-object",
  decorative: "decorative",
  decoration: "decorative",
  ornament: "decorative",
  icon: "interface-icon",
  "ui-icon": "interface-icon",
  "interface-icon": "interface-icon",
  logo: "brand-mark",
  "brand-mark": "brand-mark",
  chart: "data-visualization",
  graph: "data-visualization",
  "data-visualization": "data-visualization",
  animation: "motion-graphic",
  motion: "motion-graphic",
  "motion-graphic": "motion-graphic",
  generative: "generative-visual",
  particles: "generative-visual",
  "generative-visual": "generative-visual",
  "3d": "spatial-3d",
  spatial: "spatial-3d",
  "spatial-3d": "spatial-3d",
  cinematic: "cinematic-scene",
  video: "cinematic-scene",
  "cinematic-scene": "cinematic-scene",
  editorial: "editorial-image",
  photograph: "editorial-image",
  photo: "editorial-image",
  "editorial-image": "editorial-image"
});

const MEDIUM_ALIASES = Object.freeze({
  png: "transparent-raster",
  jpg: "transparent-raster",
  jpeg: "transparent-raster",
  webp: "transparent-raster",
  avif: "transparent-raster",
  raster: "transparent-raster",
  image: "transparent-raster",
  photo: "transparent-raster",
  photograph: "transparent-raster",
  "transparent-raster": "transparent-raster",
  css: "css",
  "css-art": "css",
  icon: "icon-library",
  icons: "icon-library",
  "icon-library": "icon-library",
  rive: "rive",
  lottie: "lottie",
  canvas: "canvas",
  "canvas-2d": "canvas",
  three: "three-js-r3f",
  threejs: "three-js-r3f",
  "three.js": "three-js-r3f",
  r3f: "three-js-r3f",
  "three-js-r3f": "three-js-r3f",
  video: "video",
  mp4: "video",
  webm: "video",
  svg: "svg",
  ".svg": "svg",
  "image/svg+xml": "svg",
  "data:image/svg+xml": "svg",
  "inline-svg": "svg",
  chart: "chart-library",
  charts: "chart-library",
  "chart-library": "chart-library"
});

const BASE_SCORES = Object.freeze({
  product: {
    "transparent-raster": 100, video: 82, "three-js-r3f": 76, rive: 42,
    lottie: 36, canvas: 28, css: 16, "icon-library": 4, svg: 0, "chart-library": 0
  },
  food: {
    "transparent-raster": 100, video: 88, "three-js-r3f": 52, rive: 34,
    lottie: 28, canvas: 24, css: 14, "icon-library": 2, svg: 0, "chart-library": 0
  },
  character: {
    "transparent-raster": 100, rive: 88, lottie: 82, video: 78,
    "three-js-r3f": 68, canvas: 54, css: 18, "icon-library": 4, svg: 0, "chart-library": 0
  },
  "hero-object": {
    "transparent-raster": 100, video: 90, "three-js-r3f": 84, rive: 70,
    lottie: 62, canvas: 58, css: 28, "icon-library": 2, svg: 0, "chart-library": 0
  },
  decorative: {
    "transparent-raster": 100, css: 72, canvas: 68, rive: 76,
    lottie: 70, "three-js-r3f": 58, video: 48, "icon-library": 12, svg: 0, "chart-library": 0
  },
  "interface-icon": {
    css: 100, canvas: 58, "transparent-raster": 36, rive: 32,
    lottie: 28, "icon-library": 0, svg: 0, "three-js-r3f": 2, video: 0, "chart-library": 0
  },
  "brand-mark": {
    "transparent-raster": 100, css: 44, rive: 36, lottie: 32,
    canvas: 18, "icon-library": 0, svg: 0, video: 8, "three-js-r3f": 4, "chart-library": 0
  },
  "data-visualization": {
    "chart-library": 100, svg: 84, canvas: 78, css: 44,
    "transparent-raster": 22, rive: 12, lottie: 10, "icon-library": 8, "three-js-r3f": 4, video: 0
  },
  "motion-graphic": {
    rive: 100, lottie: 94, video: 80, css: 72,
    canvas: 68, "three-js-r3f": 58, svg: 42, "transparent-raster": 32, "icon-library": 8, "chart-library": 0
  },
  "generative-visual": {
    canvas: 100, "three-js-r3f": 90, css: 68, video: 52,
    "transparent-raster": 46, rive: 34, lottie: 30, svg: 28, "icon-library": 2, "chart-library": 0
  },
  "spatial-3d": {
    "three-js-r3f": 100, video: 78, "transparent-raster": 64, canvas: 56,
    rive: 42, lottie: 34, css: 20, svg: 10, "icon-library": 2, "chart-library": 0
  },
  "cinematic-scene": {
    video: 100, "transparent-raster": 84, "three-js-r3f": 58, canvas: 36,
    rive: 28, lottie: 26, css: 18, svg: 8, "icon-library": 0, "chart-library": 0
  },
  "editorial-image": {
    "transparent-raster": 100, video: 74, canvas: 32, css: 26,
    "three-js-r3f": 24, rive: 20, lottie: 18, svg: 14, "icon-library": 4, "chart-library": 0
  }
});

const INTENT_REASONS = Object.freeze({
  product: "Preserve material, lighting, edge, and product-detail fidelity.",
  food: "Preserve appetizing texture, translucency, crumb, and lighting detail.",
  character: "Preserve anatomical, facial, costume, and expression fidelity.",
  "hero-object": "Use a high-fidelity object that can carry the focal composition.",
  decorative: "Prefer a controlled authored system over improvised vector illustration.",
  "interface-icon": "Use an established, optically consistent symbol system.",
  "brand-mark": "Preserve exact, scalable brand geometry.",
  "data-visualization": "Preserve semantic data mapping, labels, and interaction.",
  "motion-graphic": "Choose a motion format based on statefulness and interaction.",
  "generative-visual": "Use a runtime designed for procedural, responsive drawing.",
  "spatial-3d": "Use a spatial renderer only when dimensional behavior is essential.",
  "cinematic-scene": "Preserve temporal, photographic, and atmospheric information.",
  "editorial-image": "Preserve photographic or illustrative art direction and crop control."
});

function assetText(asset) {
  return [
    asset.visualIntent,
    asset.intent,
    asset.type,
    asset.kind,
    asset.role,
    asset.subject,
    asset.name,
    asset.title,
    asset.description,
    asset.prompt,
    ...list(asset.tags)
  ].map(text).filter(Boolean).join(" ").toLowerCase();
}

const SVG_USAGE_PATTERNS = Object.freeze([
  { id: "inline-svg", pattern: /<\s*\/?\s*svg\b/i },
  { id: "svg-data-uri", pattern: /\bdata\s*:\s*image\/svg\+xml\b/i },
  { id: "svg-mime", pattern: /\bimage\/svg\+xml\b/i },
  { id: "svg-file", pattern: /(?:^|[("'`\s=:/\\])[^"'`\s<>]*\.svg(?:[?#][^"'`\s<>]*)?(?=$|[)"'`\s<>])/i },
  { id: "svg-renderer", pattern: /\b(?:renderer|renderAs|outputFormat|format)\s*[:=]\s*["']?svg\b/i },
  {
    id: "svg-dom-construction",
    pattern: /(?:createElement(?:NS)?\s*\([^)]*["'`]svg["'`]|(?:jsx|jsxs)\s*\(\s*["'`]svg["'`])/i
  }
]);

const SVG_ICON_LIBRARY_PATTERN =
  /(?:^|[/"'])(?:lucide(?:-react)?|@heroicons(?:\/|$)|@phosphor-icons\/react|phosphor-react|react-icons(?:\/|$)|@fortawesome(?:\/|$))/i;

function scalarEntries(value, path = "$", seen = new Set()) {
  if (typeof value === "string") return [{ path, value }];
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => scalarEntries(item, `${path}[${index}]`, seen));
  }
  return Object.entries(value).flatMap(([key, item]) =>
    scalarEntries(item, `${path}.${key}`, seen)
  );
}

/**
 * Detects concrete SVG artifacts in briefs, manifests, source snippets, or rendered markup.
 * A bare "svg" value is treated as an explicit format/renderer request by requestedMedium().
 */
export function auditSvgUsage(value) {
  const violations = [];
  for (const entry of scalarEntries(value)) {
    for (const signal of SVG_USAGE_PATTERNS) {
      if (signal.pattern.test(entry.value)) {
        violations.push({ id: signal.id, path: entry.path });
      }
    }
  }
  return {
    policyId: NO_SVG_POLICY.id,
    passed: violations.length === 0,
    violations: [...new Map(violations.map((violation) => [
      `${violation.id}:${violation.path}`,
      violation
    ])).values()]
  };
}

function requestsSvgIconLibrary(value) {
  return scalarEntries(value).some((entry) => SVG_ICON_LIBRARY_PATTERN.test(entry.value));
}

function explicitIntent(asset) {
  for (const field of [asset.visualIntent, asset.intent, asset.kind]) {
    const normalized = text(field).toLowerCase();
    if (INTENT_ALIASES[normalized]) return INTENT_ALIASES[normalized];
  }
  return null;
}

/**
 * Classifies what the asset needs to communicate, independent of implementation.
 */
export function classifyVisualIntent(asset = {}) {
  const normalizedAsset = typeof asset === "string" ? { description: asset } : asset || {};
  const explicit = explicitIntent(normalizedAsset);
  if (explicit) return explicit;

  const haystack = assetText(normalizedAsset);
  const has = (pattern) => pattern.test(haystack);

  if (has(/\b(chart|graph|plot|dashboard|data[- ]?viz|time series|analytics|metric)\b/)) return "data-visualization";
  if (has(/\b(food|pastr(?:y|ies)|bread|cake|croissant|meal|dish|beverage|drink|culinary)\b/)) return "food";
  if (has(/\b(character|mascot|person|people|portrait|face|human|creature|avatar)\b/)) return "character";
  if (has(/\b(product|package|packaging|device|bottle|furniture|shoe|garment|merchandise)\b/)) return "product";
  if (has(/\b(hero|centerpiece|signature object|focal object|key visual)\b/)) return "hero-object";
  if (has(/\b(logo|wordmark|brand mark|identity mark|emblem)\b/)) return "brand-mark";
  if (has(/\b(icon|glyph|pictogram|control symbol|interface symbol)\b/)) return "interface-icon";
  if (has(/\b(generative|particle|flow field|procedural|noise field|simulation)\b/)) return "generative-visual";
  if (has(/\b(three[- ]?d|3d|spatial|mesh|model|webgl|immersive)\b/)) return "spatial-3d";
  if (has(/\b(video|film|cinematic|footage|showreel|ambient scene)\b/)) return "cinematic-scene";
  if (has(/\b(animation|animated|motion|micro[- ]?interaction|state machine|loop)\b/)) return "motion-graphic";
  if (has(/\b(decorative|decoration|ornament|flourish|sticker|doodle|illustration|visual motif|background shape|blob|divider|rule line|contour|scribble|editorial line|textured line)\b/)) return "decorative";
  return "editorial-image";
}

export function normalizeMedium(value) {
  const normalized = text(value).toLowerCase();
  return MEDIUM_ALIASES[normalized] || null;
}

function requestedMedium(asset) {
  const sourceDescriptor = typeof asset.source === "object"
    ? text(asset.source.type)
    : text(asset.source);
  if (
    classifyVisualIntent(asset) === "interface-icon" &&
    /\b(library|package|npm)\b/i.test(sourceDescriptor)
  ) return "icon-library";
  if (requestsSvgIconLibrary(asset)) return "icon-library";
  if (!auditSvgUsage(asset).passed) return "svg";
  for (const field of [
    asset.preferredMedium,
    asset.medium,
    asset.media,
    asset.implementation,
    asset.format,
    typeof asset.source === "string" ? asset.source : null,
    asset.renderer
  ]) {
    const normalized = normalizeMedium(field);
    if (normalized) return normalized;
  }
  return null;
}

/**
 * Hard media gates are compatibility rules, not soft score penalties.
 */
function noSvgReplacement(intent) {
  if (intent === "interface-icon") return "css";
  if (intent === "data-visualization") return "chart-library";
  if (["motion-graphic", "generative-visual"].includes(intent)) return "canvas";
  if (intent === "spatial-3d") return "three-js-r3f";
  if (intent === "cinematic-scene") return "video";
  return "transparent-raster";
}

export function evaluateMediaGate(intent, medium) {
  if (medium === "svg") {
    return {
      allowed: false,
      id: NO_SVG_POLICY.id,
      severity: "hard",
      reason: `SVG is prohibited globally for ${intent}: no .svg file, inline markup, data URI, renderer, fallback, or generated substitute may enter the site.`,
      replacement: noSvgReplacement(intent)
    };
  }
  if (medium === "icon-library") {
    return {
      allowed: false,
      id: "no-svg-icon-library",
      severity: "hard",
      reason: "Icon-library components are prohibited because their emitted SVG markup cannot satisfy the global no-SVG guarantee. Build simple control geometry with semantic HTML/CSS/Canvas and keep the visible text label.",
      replacement: intent === "interface-icon" ? "css" : noSvgReplacement(intent)
    };
  }
  return {
    allowed: true,
    id: "medium-compatible",
    severity: "none",
    reason: `${MEDIA_CATALOG[medium]?.label || medium} is not blocked for ${intent}.`,
    replacement: null
  };
}

function routingSignals(asset, projectDna) {
  const haystack = assetText(asset);
  const constraints = list(asset.constraints).concat(list(projectDna?.constraints)).map(text).join(" ").toLowerCase();
  return {
    animated: asset.animated === true || asset.motion === true || /\b(animated|animation|motion|loop|transition)\b/.test(haystack),
    interactive: asset.interactive === true || /\b(interactive|cursor|drag|state machine|scrub|responds)\b/.test(haystack),
    dimensional: asset.dimensional === true || /\b(3d|three\.?js|r3f|spatial|mesh|webgl)\b/.test(haystack),
    procedural: asset.procedural === true || /\b(generative|procedural|particle|simulation|flow field)\b/.test(haystack),
    functionalGeometry: asset.functionalGeometry === true ||
      /\b(focus ring|hit area|layout border|input underline|table grid|status dot|control geometry)\b/.test(haystack),
    identityArtwork: asset.identityArtwork === true ||
      /\b(divider|rule line|decorative line|editorial line|textured line|contour|scribble|ornament|flourish|wave line|identity line)\b/.test(haystack),
    lowBandwidth: /\b(low bandwidth|performance first|no heavy|lightweight|no webgl|no video)\b/.test(constraints),
    noJavaScript: /\b(no javascript|no-js|css only)\b/.test(constraints),
    requested: requestedMedium(asset)
  };
}

function candidateAdjustments(medium, signals) {
  const adjustments = [];
  if (signals.animated) {
    if (medium === "rive") adjustments.push({ amount: 12, reason: "Stateful animation requested." });
    if (medium === "lottie") adjustments.push({ amount: 10, reason: "Authored timeline animation requested." });
    if (medium === "video") adjustments.push({ amount: 5, reason: "Temporal content requested." });
    if (medium === "css") adjustments.push({ amount: 4, reason: "Simple motion can stay native." });
    if (medium === "transparent-raster") adjustments.push({ amount: -15, reason: "A still image cannot carry required motion." });
  }
  if (signals.interactive) {
    if (medium === "rive") adjustments.push({ amount: 12, reason: "Interactive state changes favor Rive." });
    if (medium === "three-js-r3f") adjustments.push({ amount: 12, reason: "Interactive spatial behavior requested." });
    if (medium === "canvas") adjustments.push({ amount: 10, reason: "Interactive drawing behavior requested." });
    if (medium === "chart-library") adjustments.push({ amount: 8, reason: "Data interaction requested." });
    if (medium === "video" || medium === "lottie") adjustments.push({ amount: -8, reason: "Timeline playback is less stateful." });
    if (medium === "transparent-raster") adjustments.push({ amount: -10, reason: "A still image cannot express interactive state." });
  }
  if (signals.dimensional) {
    if (medium === "three-js-r3f") adjustments.push({ amount: 18, reason: "Dimensional behavior is explicit." });
    if (medium === "transparent-raster") adjustments.push({ amount: -8, reason: "A flat image cannot provide spatial behavior." });
  }
  if (signals.procedural) {
    if (medium === "canvas") adjustments.push({ amount: 18, reason: "Procedural drawing is explicit." });
    if (medium === "three-js-r3f") adjustments.push({ amount: 12, reason: "Procedural spatial drawing is viable." });
    if (medium === "video" || medium === "transparent-raster") adjustments.push({ amount: -10, reason: "Pre-rendered media loses procedural responsiveness." });
  }
  if (signals.functionalGeometry) {
    if (medium === "css") adjustments.push({ amount: 100, reason: "Explicitly functional interface geometry should stay semantic and CSS-native." });
    if (medium === "canvas") adjustments.push({ amount: 8, reason: "Canvas remains available when functional geometry must respond to runtime data." });
    if (medium === "transparent-raster") adjustments.push({ amount: -100, reason: "A raster is unnecessary for explicitly functional interface geometry." });
  }
  if (signals.identityArtwork) {
    if (medium === "transparent-raster") adjustments.push({ amount: 45, reason: "Identity-bearing lines and contours must be generated as real transparent raster artwork." });
    if (medium === "css") adjustments.push({ amount: -100, reason: "CSS cannot substitute for identity-bearing line art." });
    if (medium === "canvas") adjustments.push({ amount: -60, reason: "Runtime drawing cannot substitute for authored identity artwork." });
  }
  if (signals.lowBandwidth) {
    if (["video", "three-js-r3f"].includes(medium)) adjustments.push({ amount: -30, reason: "The brief requires a light transfer/runtime budget." });
    if (medium === "css") adjustments.push({ amount: 12, reason: "The brief favors a light transfer/runtime budget." });
  }
  if (signals.noJavaScript) {
    if (["rive", "lottie", "canvas", "three-js-r3f", "chart-library"].includes(medium)) {
      adjustments.push({ amount: -80, reason: "The brief prohibits a JavaScript runtime." });
    }
    if (medium === "css") adjustments.push({ amount: 20, reason: "CSS satisfies the no-JavaScript constraint." });
  }
  if (signals.requested === medium) adjustments.push({ amount: 4, reason: "The brief names this medium; compatibility still takes precedence." });
  return adjustments;
}

/**
 * Returns supported media in deterministic preference order.
 * Globally prohibited request types remain visible at the bottom for auditability.
 */
export function rankMedia(intentOrAsset, maybeAsset = {}, projectDna = {}) {
  const explicitIntentInput = typeof intentOrAsset === "string" && VISUAL_INTENTS.includes(intentOrAsset);
  const asset = typeof intentOrAsset === "string" && VISUAL_INTENTS.includes(intentOrAsset)
    ? (maybeAsset || {})
    : (intentOrAsset || {});
  const intent = explicitIntentInput
    ? intentOrAsset
    : classifyVisualIntent(asset);
  const resolvedProjectDna = explicitIntentInput
    ? projectDna
    : Object.keys(projectDna || {}).length ? projectDna : maybeAsset;
  const signals = routingSignals(asset, resolvedProjectDna || {});
  const base = BASE_SCORES[intent] || BASE_SCORES["editorial-image"];

  const candidates = RANKED_MEDIA_TYPES.map((medium) => {
    const gate = evaluateMediaGate(intent, medium);
    const adjustments = candidateAdjustments(medium, signals);
    const rawScore = (base[medium] || 0) + adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
    return {
      medium,
      label: MEDIA_CATALOG[medium].label,
      eligible: gate.allowed,
      score: gate.allowed ? clamp(rawScore) : 0,
      reason: `${INTENT_REASONS[intent]} ${adjustments.map((item) => item.reason).join(" ")}`.trim(),
      gate: gate.allowed ? null : gate,
      adjustments,
      complexity: MEDIA_CATALOG[medium].complexity,
      defaultBudgetBytes: MEDIA_CATALOG[medium].defaultBudgetBytes
    };
  }).sort((left, right) => {
    if (left.eligible !== right.eligible) return left.eligible ? -1 : 1;
    if (left.score !== right.score) return right.score - left.score;
    return RANKED_MEDIA_TYPES.indexOf(left.medium) - RANKED_MEDIA_TYPES.indexOf(right.medium);
  });

  return candidates.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function sourceType(asset, medium) {
  const source = typeof asset.source === "object"
    ? text(asset.source.type)
    : text(asset.source);
  const normalized = source.toLowerCase();
  if (/user|provided|supplied|owned/.test(normalized)) return "user-supplied";
  if (/licensed|stock|commission/.test(normalized)) return "licensed";
  if (/generated|ai|model/.test(normalized)) return "generated";
  if (/original|code|procedural|in-house/.test(normalized)) return "original-code";
  if (/library|package|npm/.test(normalized) || ["icon-library", "chart-library"].includes(medium)) return "library";
  return "unknown";
}

function provenanceRecord(asset, medium) {
  const type = sourceType(asset, medium);
  const source = typeof asset.source === "object" ? asset.source : {};
  const origin = text(asset.origin) || text(source.origin) || text(asset.sourceUrl) || text(asset.path);
  const license = text(asset.license) || text(source.license);
  const attribution = text(asset.attribution) || text(source.attribution);
  const provider = text(asset.provider) || text(source.provider) || text(asset.model);
  const prompt = text(asset.generationPrompt) || text(source.prompt) || text(asset.prompt);
  const packageName = text(asset.package) || text(source.package);
  const version = text(asset.packageVersion) || text(source.version);
  const requirements = [];
  let status = "incomplete";

  if (type === "user-supplied") {
    requirements.push("Confirm the contributor has publication rights and retain the original path or content hash.");
    status = origin ? "ready" : "partial";
  } else if (type === "licensed") {
    requirements.push("Record source URL or creator, license terms, permitted channels, expiry, and required attribution.");
    status = origin && license ? "ready" : "incomplete";
  } else if (type === "generated") {
    requirements.push("Record generator/provider, model or tool version, prompt, seed when available, and human edits.");
    requirements.push("Check the result for protected characters, logos, signatures, and reference-copying risk.");
    status = provider && prompt ? "ready" : "incomplete";
  } else if (type === "original-code") {
    requirements.push("Record author or repository commit and licenses for any borrowed algorithms or shaders.");
    status = origin ? "ready" : "partial";
  } else if (type === "library") {
    requirements.push("Pin package and version, record its license, and import only the used asset or module.");
    status = packageName && version && license ? "ready" : "incomplete";
  } else {
    requirements.push("Identify creator, origin, usage rights, license, and attribution before release.");
  }

  return {
    status,
    sourceType: type,
    origin: origin || null,
    license: license || null,
    attribution: attribution || null,
    provider: provider || null,
    promptRecorded: Boolean(prompt),
    package: packageName || null,
    version: version || null,
    requirements
  };
}

function performanceRecord(asset, medium) {
  const catalog = MEDIA_CATALOG[medium];
  const suppliedBytes = Number(asset.fileSizeBytes ?? asset.bytes);
  const targetBudgetBytes = Number.isFinite(Number(asset.targetBudgetBytes))
    ? Number(asset.targetBudgetBytes)
    : catalog.defaultBudgetBytes;
  const requirements = [];

  if (medium === "transparent-raster") {
    requirements.push("Export AVIF/WebP plus a compatible fallback, intrinsic dimensions, and width-based srcset.");
    requirements.push("Art-direct crop and resolution independently for desktop, tablet, and mobile.");
  } else if (medium === "css") {
    requirements.push("Keep paint and layout cost measurable; avoid filters or effects that trigger large repaints.");
  } else if (medium === "rive") {
    requirements.push("Lazy-load the runtime, pause offscreen, and expose a reduced-motion state.");
  } else if (medium === "lottie") {
    requirements.push("Trim hidden layers and keyframes, lazy-load JSON, pause offscreen, and configure the Canvas renderer explicitly.");
  } else if (medium === "canvas") {
    requirements.push("Cap device pixel ratio, resize deliberately, pause offscreen, and avoid per-frame allocation.");
  } else if (medium === "three-js-r3f") {
    requirements.push("Lazy-load the scene; compress meshes and textures; cap DPR; dispose resources on teardown.");
    requirements.push("Measure main-thread time, GPU memory, transfer size, and input responsiveness on a mid-tier mobile device.");
  } else if (medium === "video") {
    requirements.push("Provide an optimized poster, responsive encodes, explicit dimensions, and pause when offscreen.");
    requirements.push("Avoid mandatory autoplay and never make video the only carrier of essential information.");
  } else if (medium === "chart-library") {
    requirements.push("Import only required chart modules, select a Canvas/HTML renderer explicitly, and virtualize or aggregate dense datasets.");
  }

  const measured = Number.isFinite(suppliedBytes);
  const withinBudget = measured ? suppliedBytes <= targetBudgetBytes : null;
  return {
    risk: catalog.complexity,
    targetBudgetBytes,
    measuredBytes: measured ? suppliedBytes : null,
    withinBudget,
    status: measured ? (withinBudget ? "ready" : "over-budget") : "unverified",
    requirements
  };
}

function accessibilityRecord(asset, intent, medium) {
  const decorative = intent === "decorative" || asset.decorative === true;
  const alt = asset.alt === "" ? "" : text(asset.alt) || text(asset.textAlternative);
  const animated = ["rive", "lottie", "canvas", "three-js-r3f", "video"].includes(medium);
  const requirements = [];

  if (decorative) {
    requirements.push("Use alt=\"\" for img elements or aria-hidden=\"true\" for non-semantic rendered media.");
    requirements.push("The composition and task must remain understandable when the asset is removed.");
  } else if (intent === "interface-icon") {
    requirements.push("Give the parent control an accessible name; do not rely on the glyph alone.");
  } else if (intent === "data-visualization") {
    requirements.push("Provide a text summary and accessible table or equivalent data view.");
    requirements.push("Do not encode meaning by color alone; expose labels and focus states.");
  } else {
    requirements.push("Write a concise text alternative that communicates the asset's content and purpose in context.");
  }
  if (animated) {
    requirements.push("Honor prefers-reduced-motion and provide a still or no-motion state.");
    requirements.push("Pause or stop continuous motion and avoid flashes that violate WCAG thresholds.");
  }

  const ready = decorative
    ? asset.decorative === true || asset.alt === ""
    : intent === "interface-icon"
      ? Boolean(text(asset.accessibleName) || text(asset.label))
      : intent === "data-visualization"
        ? Boolean(text(asset.dataSummary) && (asset.tableFallback || asset.dataTable))
        : Boolean(alt);
  const reducedMotionReady = !animated || asset.reducedMotion === true || Boolean(asset.reducedMotionFallback);

  return {
    semanticRole: decorative ? "presentation" : intent === "data-visualization" ? "figure" : "image",
    textAlternative: decorative ? "" : alt || null,
    reducedMotionRequired: animated,
    reducedMotionReady,
    status: ready && reducedMotionReady ? "ready" : ready || reducedMotionReady ? "partial" : "incomplete",
    requirements
  };
}

function fallbackRecord(asset, intent, medium) {
  const explicit = text(asset.fallback);
  const explicitAllowed = explicit && auditSvgUsage(explicit).passed;
  let fallbackMedium = null;
  let behavior;

  if (explicitAllowed) {
    behavior = explicit;
  } else if (medium === "video") {
    fallbackMedium = "transparent-raster";
    behavior = "Show the art-directed poster and preserve the same crop, copy relationship, and action.";
  } else if (["rive", "lottie", "canvas", "three-js-r3f"].includes(medium)) {
    fallbackMedium = "transparent-raster";
    behavior = "Render a supplied still poster; do not replace the signature object with an improvised SVG.";
  } else if (medium === "chart-library") {
    behavior = "Show the accessible data table and concise trend summary.";
  } else if (intent === "decorative") {
    behavior = "Omit the asset while preserving spacing, hierarchy, and task comprehension.";
  } else {
    behavior = "Preserve aspect ratio and adjacent textual context; do not insert a low-fidelity vector substitute.";
  }

  return {
    medium: fallbackMedium,
    behavior,
    required: ["video", "rive", "lottie", "canvas", "three-js-r3f", "chart-library"].includes(medium),
    requirements: [
      ...(explicit && !explicitAllowed
        ? ["Discard the requested SVG fallback and replace it with raster, HTML/CSS, or Canvas under the global no-SVG gate."]
        : []),
      "Fallback must preserve layout stability and essential information.",
      "Test the fallback at desktop, tablet, and mobile."
    ]
  };
}

function implementationPolicy(intent, medium) {
  const common = {
    policyId: NO_SVG_POLICY.id,
    svgAllowed: false,
    forbiddenArtifacts: [...NO_SVG_POLICY.forbiddenArtifacts],
    verification: [...NO_SVG_POLICY.verification]
  };

  if (medium === "transparent-raster") {
    return {
      ...common,
      renderSurface: "img-or-picture",
      allowedOutputFormats: [...NO_SVG_POLICY.allowedRasterFormats],
      materialization: {
        required: true,
        capability: "raster-image-generation",
        rule: "Any newly created image or artwork must be returned by the available image generator as a real PNG, JPEG, WebP, or AVIF bitmap and saved locally before implementation."
      }
    };
  }
  if (medium === "css") {
    return {
      ...common,
      renderSurface: "semantic-html-and-css",
      scope: "Simple UI geometry only; do not recreate imagery, illustration, logos, or artwork with CSS.",
      disallowedCss: ["SVG url() references", "SVG masks", "SVG clip paths", "SVG data URIs"]
    };
  }
  if (medium === "canvas") {
    return {
      ...common,
      renderSurface: "canvas",
      scope: intent === "data-visualization"
        ? "Draw the visualization into Canvas and preserve an accessible HTML data view."
        : "Use Canvas only for runtime drawing or simple/procedural geometry."
    };
  }
  if (medium === "lottie") {
    return {
      ...common,
      renderSurface: "canvas",
      renderer: "canvas-only",
      rule: "Configure the Canvas renderer explicitly; SVG and HTML renderers and SVG poster fallbacks are forbidden."
    };
  }
  if (medium === "rive") {
    return {
      ...common,
      renderSurface: "canvas-or-webgl",
      renderer: "canvas-or-webgl-only",
      rule: "Mount Rive only on Canvas/WebGL and use a raster no-motion fallback."
    };
  }
  if (medium === "chart-library") {
    return {
      ...common,
      renderSurface: "canvas-or-html",
      renderer: "canvas-or-html-only",
      rule: "Use a library only when its renderer is explicitly Canvas or HTML; reject any package, plugin, export, tooltip, legend, or fallback that inserts SVG."
    };
  }
  if (medium === "three-js-r3f") {
    return {
      ...common,
      renderSurface: "webgl-canvas",
      renderer: "canvas-only",
      rule: "Render into WebGL Canvas; textures and fallbacks must be raster, never SVG."
    };
  }
  if (medium === "video") {
    return {
      ...common,
      renderSurface: "video",
      rule: "Use raster poster frames and raster thumbnails; no SVG placeholder or fallback is permitted."
    };
  }
  throw new Error(`No implementation policy exists for medium ${medium}`);
}

function evidenceScore(condition, whenPresent, whenMissing) {
  return condition ? whenPresent : whenMissing;
}

function sourceQualityScore(asset, medium) {
  if (medium !== "transparent-raster" && medium !== "video") {
    const verified = asset.optimized === true || asset.qualityVerified === true;
    return {
      score: verified ? 90 : 62,
      evidence: verified
        ? "The brief marks the authored asset as optimized or quality-verified."
        : "Visual/source quality is unverified; the score reflects medium suitability only.",
      missing: verified ? [] : ["rendered quality evidence"]
    };
  }

  const width = Number(asset.width ?? asset.pixelWidth);
  const height = Number(asset.height ?? asset.pixelHeight);
  const pixelsKnown = Number.isFinite(width) && Number.isFinite(height);
  const shortEdge = pixelsKnown ? Math.min(width, height) : 0;
  const score = medium === "video"
    ? pixelsKnown ? shortEdge >= 1080 ? 92 : shortEdge >= 720 ? 76 : 48 : 42
    : pixelsKnown ? shortEdge >= 1800 ? 96 : shortEdge >= 1200 ? 84 : shortEdge >= 800 ? 68 : 42 : 38;
  return {
    score,
    evidence: pixelsKnown
      ? `Declared source dimensions are ${width}×${height}px.`
      : "No source dimensions or rendered fidelity evidence were supplied.",
    missing: pixelsKnown ? [] : ["source pixel dimensions", "rendered crop/fidelity review"]
  };
}

function dimension(id, score, evidence, missing = []) {
  const definition = ASSET_QUALITY_DIMENSIONS.find((item) => item.id === id);
  return {
    id,
    weight: definition.weight,
    score: Math.round(clamp(score)),
    evidence,
    missingEvidence: missing
  };
}

/**
 * Produces a metadata-readiness score. It never claims screenshot-level visual quality.
 */
export function computeAssetQualityScore(asset, routing, projectDna = {}) {
  const selected = routing.selectedCandidate;
  const provenance = routing.provenance;
  const performance = routing.performance;
  const accessibility = routing.accessibility;
  const sourceQuality = sourceQualityScore(asset, selected.medium);
  const hasRole = Boolean(text(asset.role));
  const hasRelationship = Boolean(
    text(asset.compositionRole) ||
    text(asset.layoutRelationship) ||
    text(asset.objectRole)
  );
  const hasArtDirection = Boolean(
    text(asset.artDirection) ||
    text(asset.crop) ||
    text(asset.lighting) ||
    text(asset.material)
  );
  const hasDna = Boolean(text(projectDna?.creativeThesis) || text(projectDna?.creativeIdea));
  const hasResponsive = Boolean(
    text(asset.responsiveBehavior) ||
    asset.responsive && typeof asset.responsive === "object"
  );
  const gateViolation = routing.gates.hardBlocks.length > 0;

  const dimensions = [
    dimension(
      "intentFidelity",
      gateViolation ? Math.min(25, selected.score) : selected.score,
      gateViolation
        ? `The requested medium was blocked; ${selected.label} is the compatible reroute.`
        : `${selected.label} scored ${selected.score}/100 for ${routing.intent}.`,
      gateViolation ? ["replacement asset or implementation"] : []
    ),
    dimension(
      "compositionUtility",
      evidenceScore(hasRole, 58, 30) + evidenceScore(hasRelationship, 34, 0),
      hasRelationship
        ? "The asset declares how it anchors, bridges, interrupts, reveals, or enables the layout."
        : "No explicit object-to-layout relationship was supplied.",
      hasRelationship ? [] : ["compositionRole or layoutRelationship"]
    ),
    dimension(
      "artDirectionCoherence",
      evidenceScore(hasArtDirection, 72, 36) + evidenceScore(hasDna, 18, 0),
      hasArtDirection
        ? "Crop, lighting, material, or art-direction constraints are explicit."
        : "The medium is routed, but its crop, lighting, or material direction remains unspecified.",
      hasArtDirection ? [] : ["crop, lighting, material, or artDirection"]
    ),
    dimension("sourceQuality", sourceQuality.score, sourceQuality.evidence, sourceQuality.missing),
    dimension(
      "responsiveReadiness",
      hasResponsive ? 90 : 38,
      hasResponsive
        ? "A responsive behavior or viewport-specific asset plan is declared."
        : "No viewport-specific crop, relocation, or rendering behavior is declared.",
      hasResponsive ? [] : ["desktop/tablet/mobile behavior"]
    ),
    dimension(
      "provenanceReadiness",
      provenance.status === "ready" ? 100 : provenance.status === "partial" ? 58 : 20,
      `Provenance status is ${provenance.status} for source type ${provenance.sourceType}.`,
      provenance.status === "ready" ? [] : ["origin and applicable rights/license metadata"]
    ),
    dimension(
      "performanceReadiness",
      performance.status === "ready" ? 100 : performance.status === "over-budget" ? 20 : 48,
      performance.status === "unverified"
        ? `No measured byte size was supplied; target budget is ${performance.targetBudgetBytes} bytes.`
        : `Measured asset is ${performance.status} against ${performance.targetBudgetBytes} bytes.`,
      performance.status === "unverified" ? ["measured transfer size"] : []
    ),
    dimension(
      "accessibilityReadiness",
      accessibility.status === "ready" ? 100 : accessibility.status === "partial" ? 58 : 20,
      `Accessibility metadata is ${accessibility.status}; semantic role is ${accessibility.semanticRole}.`,
      accessibility.status === "ready" ? [] : ["text alternative or semantic fallback", ...(accessibility.reducedMotionReady ? [] : ["reduced-motion state"])]
    )
  ];

  const weightedScore = dimensions.reduce(
    (sum, item) => sum + item.score * item.weight / 100,
    0
  );
  const missingEvidence = [...new Set(dimensions.flatMap((item) => item.missingEvidence))];
  const score = Math.round(weightedScore * 10) / 10;
  return {
    score,
    grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "E",
    status: gateViolation ? "reroute-required" : score >= 80 ? "ready" : score >= 60 ? "needs-evidence" : "not-ready",
    confidence: missingEvidence.length === 0 ? "high" : missingEvidence.length <= 3 ? "medium" : "low",
    claimBoundary: "This score measures declared fitness and implementation readiness; rendered visual quality still requires screenshot review.",
    dimensions,
    missingEvidence
  };
}

function normalizeAsset(asset, index = 0) {
  if (typeof asset === "string") {
    return {
      id: `asset-${index + 1}`,
      description: asset,
      role: "supporting",
      source: "unknown"
    };
  }
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
    throw new TypeError(`brief.assets[${index}] must be an object or string`);
  }
  return {
    ...asset,
    id: text(asset.id) || `asset-${index + 1}`,
    role: text(asset.role) || "supporting",
    source: asset.source || "unknown"
  };
}

function compositionContract(asset, intent, medium) {
  const description = assetText(asset);
  const explicit = text(asset.compositionMode || asset.isolationMode).toLowerCase();
  const isolatedIntent = ["product", "food", "character", "hero-object", "brand-mark", "decorative"].includes(intent);
  const isolated = medium === "transparent-raster" && (
    ["isolated", "isolated-object", "cutout", "transparent-overlay"].includes(explicit) ||
    isolatedIntent ||
    /\b(isolated|cutout|transparent background|without (?:a )?background|overlay asset)\b/.test(description)
  );
  if (!isolated) {
    return {
      mode: explicit === "full-scene" ? "full-scene" : "contextual-image",
      alphaRequired: false,
      subjectCount: null,
      forbiddenContext: []
    };
  }
  return {
    mode: intent === "decorative" ? "transparent-overlay" : "isolated-object",
    alphaRequired: true,
    subjectCount: 1,
    requirement: "Return only the named subject or artwork with clean alpha edges; the page supplies the environment and atmosphere.",
    forbiddenContext: [
      "sky",
      "horizon",
      "landscape or ocean scene",
      "room or studio sweep",
      "page background",
      "headline or UI",
      "website mockup",
      "full entrance or hero composition"
    ]
  };
}

/**
 * Routes one asset from semantic intent to an implementation medium and requirements.
 */
export function routeAsset(asset, { projectDna = {}, index = 0 } = {}) {
  const normalized = normalizeAsset(asset, index);
  const intent = classifyVisualIntent(normalized);
  const ranking = rankMedia(intent, normalized, projectDna);
  const selectedCandidate = ranking.find((candidate) => candidate.eligible);
  if (!selectedCandidate || PROHIBITED_MEDIA_TYPES.includes(selectedCandidate.medium)) {
    throw new Error(`No SVG-safe implementation medium is available for ${intent}`);
  }
  const requested = requestedMedium(normalized);
  const requestedGate = requested ? evaluateMediaGate(intent, requested) : null;
  const hardBlocks = requestedGate && !requestedGate.allowed ? [requestedGate] : [];
  const sourceSvgAudit = auditSvgUsage(normalized);
  const svgInputAudit = requested === "svg" && sourceSvgAudit.passed
    ? {
        ...sourceSvgAudit,
        passed: false,
        violations: [{ id: "explicit-svg-medium", path: "$.implementation" }]
      }
    : sourceSvgAudit;
  const provenance = provenanceRecord(normalized, selectedCandidate.medium);
  const performance = performanceRecord(normalized, selectedCandidate.medium);
  const accessibility = accessibilityRecord(normalized, intent, selectedCandidate.medium);
  const fallback = fallbackRecord(normalized, intent, selectedCandidate.medium);
  const selectedImplementationPolicy = implementationPolicy(intent, selectedCandidate.medium);
  const assetComposition = compositionContract(normalized, intent, selectedCandidate.medium);
  const decisionStatus = requested
    ? requested === selectedCandidate.medium ? "accepted" : "rerouted"
    : "selected";

  const routed = {
    id: normalized.id,
    role: normalized.role,
    description: text(normalized.description) || text(normalized.subject) || text(normalized.name) || null,
    intent,
    source: normalized.source,
    requestedMedium: requested,
    implementation: selectedCandidate.medium,
    decision: {
      status: decisionStatus,
      selectedMedium: selectedCandidate.medium,
      selectedLabel: selectedCandidate.label,
      reason: selectedCandidate.reason,
      alternatives: ranking
        .filter((candidate) => candidate.eligible && candidate.medium !== selectedCandidate.medium)
        .slice(0, 3)
        .map(({ medium, label, score, reason }) => ({ medium, label, score, reason }))
    },
    ranking,
    gates: {
      passed: hardBlocks.length === 0,
      hardBlocks,
      svgInputAudit,
      excludedMedia: ranking
        .filter((candidate) => !candidate.eligible)
        .map((candidate) => ({ medium: candidate.medium, ...candidate.gate }))
    },
    implementationPolicy: selectedImplementationPolicy,
    compositionContract: assetComposition,
    provenance,
    performance,
    accessibility,
    fallback,
    responsiveBehavior: text(normalized.responsiveBehavior) || "Define art-directed desktop, tablet, and mobile behavior before implementation."
  };
  const qualityInput = typeof asset === "string" ? { description: asset } : asset;
  routed.assetQualityScore = computeAssetQualityScore(qualityInput, {
    ...routed,
    selectedCandidate
  }, projectDna);
  return routed;
}

function manifestBudget(assets, projectDna) {
  const selected = assets.map((asset) => asset.implementation);
  if (
    selected.some((medium) => ["video", "three-js-r3f"].includes(medium)) ||
    /\b(3d|webgl|video)\b/i.test(text(projectDna?.system?.motionLanguage))
  ) return "heavy-with-required-fallback";
  if (selected.some((medium) => ["rive", "lottie", "canvas", "chart-library"].includes(medium))) {
    return "medium";
  }
  return "light";
}

const IMAGE_GENERATOR_MEDIA = new Set(["transparent-raster"]);

export function createAssetBatchPlan(assets = [], brief = {}, projectDna = {}) {
  const candidates = assets.filter((asset) =>
    IMAGE_GENERATOR_MEDIA.has(asset.implementation) &&
    (
      asset.provenance?.sourceType === "generated" ||
      !["user-supplied", "licensed", "library"].includes(asset.provenance?.sourceType)
    )
  );
  const artDirection = brief.assetArtDirection && typeof brief.assetArtDirection === "object"
    ? brief.assetArtDirection
    : {};
  const contract = {
    light: text(artDirection.light) ||
      text(projectDna?.system?.lightModel) ||
      "One declared key-light direction and one shared shadow softness.",
    camera: text(artDirection.camera) ||
      "Use one compatible focal-length and viewpoint family unless an asset role explicitly requires a documented exception.",
    material: text(artDirection.material) ||
      text(projectDna?.system?.depthModel) ||
      "Follow one declared material vocabulary; do not mix unrelated rendering treatments.",
    isolation: text(artDirection.isolation) ||
      "Use transparent or deliberately removable backgrounds for composition-bound objects.",
    resolution: text(artDirection.resolution) ||
      "Generate for the largest declared rendered size, then export responsive derivatives without upscaling.",
    colorManagement: text(artDirection.colorManagement) ||
      "Use one color space and preserve intentional edge color for the target page background.",
    outputPolicy: "New image and artwork outputs must be real PNG, JPEG, WebP, or AVIF bitmaps returned by the available image generator. SVG files, markup, data URIs, renderers, and fallbacks are forbidden."
  };
  return {
    version: "1.0.0",
    status: candidates.length ? "planned" : "not-required",
    strategy: "Coordinate compatible generation under one art-direction contract, materialize image/artwork as raster bitmaps through the available image generator, and preserve separate files, provenance, hashes, and rejection decisions.",
    svgPolicy: NO_SVG_POLICY,
    contract,
    batches: candidates.length
      ? [{
          id: "asset-batch-1",
          contract,
          assets: candidates.map((asset) => {
            const isolated = asset.compositionContract?.alphaRequired === true;
            const expectedOutput = `assets/generated/${asset.id}.${isolated ? "png" : "webp"}`;
            const prompt = [
              `Create one production-ready ${asset.intent} asset for the role "${asset.role}".`,
              `Subject: ${asset.description || asset.id}.`,
              `Light: ${contract.light}`,
              `Camera: ${contract.camera}`,
              `Material: ${contract.material}`,
              `Isolation/background: ${contract.isolation}`,
              isolated
                ? `Composition boundary: ${asset.compositionContract.requirement} Forbidden context: ${asset.compositionContract.forbiddenContext.join(", ")}.`
                : "Composition boundary: this role may include context only when the asset plan explicitly requires a contextual image.",
              `Resolution: ${contract.resolution}`,
              `Color management: ${contract.colorManagement}`,
              "Output a real raster bitmap for every newly created image or artwork. Never output SVG, vector markup, an SVG data URI, or an icon-library substitute.",
              "Return only the production asset, not a website mockup, concept board, contact sheet, UI frame, text layout, or presentation.",
              "This output must be generated separately from every direction frame and saved as its own project-local file."
            ].join("\n");
            return {
              id: asset.id,
              role: asset.role,
              intent: asset.intent,
              medium: asset.implementation,
              expectedOutput,
              generationRequest: {
                capability: "raster-image-generation",
                outputRole: "production-asset",
                allowedOutputFormats: [...NO_SVG_POLICY.allowedRasterFormats],
                prompt,
                mustExecuteWhenProviderAvailable: true,
                saveReturnedBitmapLocally: true,
                separateFromDirectionFrames: true,
                compositionMode: asset.compositionContract?.mode || "contextual-image",
                alphaRequired: isolated,
                forbiddenContext: asset.compositionContract?.forbiddenContext || [],
                forbiddenSubstitutes: [
                  "direction-frame crop",
                  "remote chat image",
                  "prompt-only record",
                  "placeholder",
                  "SVG file or proxy",
                  "inline <svg> markup",
                  "data:image/svg+xml payload",
                  "icon-library SVG output",
                  "CSS proxy",
                  "gradient"
                ]
              },
              provenanceRequired: true,
              sha256: null,
              status: "planned",
              blocksImplementation: true,
              conceptFrameAllowed: false
            };
          })
        }]
      : [],
    claimBoundary: "A batch coordinates art direction. Planned is not generated: every output remains a separate real project file that must be independently hash-bound, reviewable, replaceable, and rejectable before implementation."
  };
}

/**
 * Routes every asset named by the brief. No asset bypasses classification or gates.
 */
export function createAssetManifest(brief = {}, projectDna = {}) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    throw new TypeError("brief must be an object");
  }
  if (brief.assets !== undefined && !Array.isArray(brief.assets)) {
    throw new TypeError("brief.assets must be an array");
  }
  const requested = brief.assets || [];
  const assets = requested.map((asset, index) => routeAsset(asset, { projectDna, index }));
  const counts = Object.fromEntries(MEDIA_TYPES.map((medium) => [
    medium,
    assets.filter((asset) => asset.implementation === medium).length
  ]));
  const assetBatchPlan = createAssetBatchPlan(assets, brief, projectDna);

  return {
    version: "1.0.0",
    strategy: "Route semantic visual intent to an SVG-free medium that preserves fidelity, composition, behavior, and evidence. Materialize newly created images and artwork as local raster bitmaps through the available image generator; reserve HTML/CSS/Canvas for simple UI or runtime geometry.",
    svgPolicy: NO_SVG_POLICY,
    requestedAssetCount: requested.length,
    routedAssetCount: assets.length,
    assets,
    assetBatchPlan,
    renderingBudget: manifestBudget(assets, projectDna),
    summary: {
      byMedium: counts,
      hardGateReroutes: assets.filter((asset) => asset.gates.hardBlocks.length).map((asset) => asset.id),
      svgReroutes: assets
        .filter((asset) => asset.requestedMedium === "svg")
        .map((asset) => asset.id),
      prohibitedMediaRequests: assets
        .filter((asset) => PROHIBITED_MEDIA_TYPES.includes(asset.requestedMedium))
        .map((asset) => asset.id),
      provenanceIncomplete: assets.filter((asset) => asset.provenance.status !== "ready").map((asset) => asset.id),
      accessibilityIncomplete: assets.filter((asset) => asset.accessibility.status !== "ready").map((asset) => asset.id),
      averageAssetQualityScore: assets.length
        ? Math.round(assets.reduce((sum, asset) => sum + asset.assetQualityScore.score, 0) / assets.length * 10) / 10
        : null
    },
    rules: [
      "Classify visual intent before choosing a file format or runtime.",
      "Never create, copy, import, reference, render, request, or fall back to SVG anywhere in the project.",
      "Reject .svg files, inline <svg> markup, data:image/svg+xml payloads, SVG CSS references, SVG renderers, and icon-library SVG output.",
      "Materialize every newly created image or artwork through the available image generator as PNG, JPEG, WebP, or AVIF before implementation.",
      "Use semantic HTML/CSS/Canvas only for simple UI geometry; never use them as proxies for missing imagery or artwork.",
      "Do not recreate protected logos, characters, illustrations, or photographs.",
      "Record provenance and rights for every supplied, licensed, generated, coded, or library asset.",
      "Require viewport-specific behavior, measurable performance budgets, accessible semantics, and tested fallbacks.",
      "Coordinate compatible generated assets through one batch art-direction contract while retaining separate provenance and hashes.",
      "Treat Asset Quality Score as readiness evidence, not a substitute for rendered screenshot review."
    ]
  };
}
