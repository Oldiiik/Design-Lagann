const metricFallback = (
  alias,
  sourceFamily,
  sizeAdjust,
  ascentOverride,
  descentOverride,
  lineGapOverride = "0%"
) => ({
  alias,
  sourceFamily,
  sizeAdjust,
  ascentOverride,
  descentOverride,
  lineGapOverride,
  calibration: "catalog-estimate"
});

const freezeFamily = (family) => Object.freeze({
  ...family,
  voices: Object.freeze([...family.voices]),
  scripts: Object.freeze([...family.scripts]),
  weights: Object.freeze([...family.weights]),
  variableRange: family.variableRange ? Object.freeze([...family.variableRange]) : null,
  fallbacks: Object.freeze([...family.fallbacks]),
  roleWeights: Object.freeze({ ...family.roleWeights }),
  metrics: Object.freeze({ ...family.metrics }),
  typeCharacter: Object.freeze({ ...family.typeCharacter }),
  metricFallback: Object.freeze({ ...family.metricFallback })
});

export const CURATED_FAMILIES = Object.freeze([
  freezeFamily({
    family: "Fraunces",
    slug: "fraunces",
    kind: "serif",
    voices: ["warm", "editorial", "crafted", "expressive", "sensory"],
    scripts: ["Latin"],
    weights: [300, 400, 500, 600, 700, 800, 900],
    variableRange: [300, 900],
    fallbacks: ["Georgia", "Times New Roman", "serif"],
    roleWeights: { display: 700, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 7.7, specificity: 9.2 },
    typeCharacter: {
      width: "compact",
      contrast: "high",
      xHeight: "medium",
      opticalCharacter: "Soft high-contrast oldstyle forms with an expressive display silhouette."
    },
    metricFallback: metricFallback(
      "Fraunces Fallback",
      "Georgia",
      "97%",
      "91%",
      "24%"
    ),
    estimatedSubsetKb: 58,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Newsreader",
    slug: "newsreader",
    kind: "serif",
    voices: ["calm", "literary", "editorial", "authoritative", "considered"],
    scripts: ["Latin"],
    weights: [200, 300, 400, 500, 600, 700, 800],
    variableRange: [200, 800],
    fallbacks: ["Georgia", "Times New Roman", "serif"],
    roleWeights: { display: 600, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.4, specificity: 8.5 },
    typeCharacter: {
      width: "normal",
      contrast: "high",
      xHeight: "medium",
      opticalCharacter: "Quiet literary serif texture with restrained display contrast."
    },
    metricFallback: metricFallback(
      "Newsreader Fallback",
      "Georgia",
      "99%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 54,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Bricolage Grotesque",
    slug: "bricolage-grotesque",
    kind: "sans",
    voices: ["playful", "crafted", "bold", "youthful", "expressive"],
    scripts: ["Latin"],
    weights: [200, 300, 400, 500, 600, 700, 800],
    variableRange: [200, 800],
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 700, body: 400, utility: 650, data: 500 },
    metrics: { legibility: 7.8, specificity: 9.1 },
    typeCharacter: {
      width: "normal",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Irregular grotesque construction with a crafted, animated rhythm."
    },
    metricFallback: metricFallback(
      "Bricolage Grotesque Fallback",
      "Arial",
      "103%",
      "92%",
      "23%"
    ),
    estimatedSubsetKb: 61,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Space Grotesk",
    slug: "space-grotesk",
    kind: "sans",
    voices: ["technical", "precise", "contemporary", "engineered", "direct"],
    scripts: ["Latin"],
    weights: [300, 400, 500, 600, 700],
    variableRange: [300, 700],
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 650, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.3, specificity: 8.1 },
    typeCharacter: {
      width: "normal",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Squared geometric grotesque with a precise technical cadence."
    },
    metricFallback: metricFallback(
      "Space Grotesk Fallback",
      "Arial",
      "101%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 46,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Archivo Black",
    slug: "archivo-black",
    kind: "sans",
    voices: ["bold", "poster", "direct", "athletic", "compressed"],
    scripts: ["Latin"],
    weights: [400],
    variableRange: null,
    fallbacks: ["Arial Black", "Arial", "sans-serif"],
    roleWeights: { display: 400, body: 400, utility: 400, data: 400 },
    metrics: { legibility: 6.9, specificity: 8.3 },
    typeCharacter: {
      width: "compact",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Dense poster grotesque built for short, forceful display lines."
    },
    metricFallback: metricFallback(
      "Archivo Black Fallback",
      "Arial Black",
      "102%",
      "91%",
      "23%"
    ),
    estimatedSubsetKb: 27,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Source Sans 3",
    slug: "source-sans-3",
    kind: "sans",
    voices: ["clear", "human", "editorial", "accessible", "neutral"],
    scripts: ["Latin", "Cyrillic", "Greek"],
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    variableRange: [200, 900],
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 700, body: 400, utility: 650, data: 500 },
    metrics: { legibility: 9.4, specificity: 6.8 },
    typeCharacter: {
      width: "normal",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Open humanist sans texture tuned for sustained reading."
    },
    metricFallback: metricFallback(
      "Source Sans 3 Fallback",
      "Arial",
      "101%",
      "93%",
      "24%"
    ),
    estimatedSubsetKb: 45,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "IBM Plex Sans",
    slug: "ibm-plex-sans",
    kind: "sans",
    voices: ["technical", "human", "precise", "institutional", "clear"],
    scripts: ["Latin", "Cyrillic", "Greek"],
    weights: [100, 200, 300, 400, 500, 600, 700],
    variableRange: null,
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 600, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 9.1, specificity: 7.6 },
    typeCharacter: {
      width: "compact",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Industrial humanist grotesque with compact, engineered proportions."
    },
    metricFallback: metricFallback(
      "IBM Plex Sans Fallback",
      "Arial",
      "102%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 34,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Atkinson Hyperlegible Next",
    slug: "atkinson-hyperlegible-next",
    kind: "sans",
    voices: ["accessible", "friendly", "clear", "human", "practical"],
    scripts: ["Latin"],
    weights: [200, 300, 400, 500, 600, 700, 800],
    variableRange: [200, 800],
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 700, body: 400, utility: 650, data: 500 },
    metrics: { legibility: 10, specificity: 7.3 },
    typeCharacter: {
      width: "wide",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Highly differentiated humanist forms optimized for character recognition."
    },
    metricFallback: metricFallback(
      "Atkinson Hyperlegible Next Fallback",
      "Arial",
      "100%",
      "94%",
      "24%"
    ),
    estimatedSubsetKb: 49,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Noto Sans",
    slug: "noto-sans",
    kind: "sans",
    voices: ["global", "clear", "neutral", "accessible", "practical"],
    scripts: ["Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Devanagari", "Han", "Hiragana", "Katakana", "Hangul", "Thai"],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variableRange: [100, 900],
    fallbacks: ["Arial", "Helvetica", "sans-serif"],
    roleWeights: { display: 700, body: 400, utility: 650, data: 500 },
    metrics: { legibility: 9.3, specificity: 6.1 },
    typeCharacter: {
      width: "normal",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Neutral global sans construction designed to stay coherent across scripts."
    },
    metricFallback: metricFallback(
      "Noto Sans Fallback",
      "Arial",
      "101%",
      "93%",
      "24%"
    ),
    estimatedSubsetKb: 51,
    license: "OFL-1.1",
    provenance: "Curated open-source superfamily; bundle verified per-script subsets."
  }),
  freezeFamily({
    family: "Noto Serif",
    slug: "noto-serif",
    kind: "serif",
    voices: ["global", "editorial", "authoritative", "calm", "cultural"],
    scripts: ["Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Devanagari", "Han", "Hiragana", "Katakana", "Hangul", "Thai"],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variableRange: [100, 900],
    fallbacks: ["Georgia", "Times New Roman", "serif"],
    roleWeights: { display: 650, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.8, specificity: 7.2 },
    typeCharacter: {
      width: "normal",
      contrast: "medium",
      xHeight: "medium",
      opticalCharacter: "Global transitional serif texture with measured authority across scripts."
    },
    metricFallback: metricFallback(
      "Noto Serif Fallback",
      "Georgia",
      "98%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 57,
    license: "OFL-1.1",
    provenance: "Curated open-source superfamily; bundle verified per-script subsets."
  }),
  freezeFamily({
    family: "IBM Plex Mono",
    slug: "ibm-plex-mono",
    kind: "mono",
    voices: ["technical", "precise", "engineered", "data", "human"],
    scripts: ["Latin", "Cyrillic", "Greek"],
    weights: [100, 200, 300, 400, 500, 600, 700],
    variableRange: null,
    fallbacks: ["Consolas", "Courier New", "monospace"],
    roleWeights: { display: 600, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.5, specificity: 7.8 },
    typeCharacter: {
      width: "monospaced",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Humanized industrial monospace with calm, tabular rhythm."
    },
    metricFallback: metricFallback(
      "IBM Plex Mono Fallback",
      "Consolas",
      "100%",
      "91%",
      "24%"
    ),
    estimatedSubsetKb: 31,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "JetBrains Mono",
    slug: "jetbrains-mono",
    kind: "mono",
    voices: ["technical", "precise", "youthful", "data", "engineered"],
    scripts: ["Latin", "Cyrillic", "Greek"],
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    variableRange: [100, 800],
    fallbacks: ["Consolas", "Courier New", "monospace"],
    roleWeights: { display: 650, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.8, specificity: 8 },
    typeCharacter: {
      width: "monospaced",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Crisp technical monospace with compact punctuation and strong numerals."
    },
    metricFallback: metricFallback(
      "JetBrains Mono Fallback",
      "Consolas",
      "99%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 44,
    license: "OFL-1.1",
    provenance: "Curated open-source family; pin a verified upstream release before bundling."
  }),
  freezeFamily({
    family: "Noto Sans Mono",
    slug: "noto-sans-mono",
    kind: "mono",
    voices: ["global", "technical", "clear", "data", "neutral"],
    scripts: ["Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Devanagari", "Han", "Hiragana", "Katakana", "Hangul", "Thai"],
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    variableRange: [100, 900],
    fallbacks: ["Consolas", "Courier New", "monospace"],
    roleWeights: { display: 650, body: 400, utility: 600, data: 500 },
    metrics: { legibility: 8.9, specificity: 6.5 },
    typeCharacter: {
      width: "monospaced",
      contrast: "low",
      xHeight: "high",
      opticalCharacter: "Neutral global monospace with stable cell rhythm across scripts."
    },
    metricFallback: metricFallback(
      "Noto Sans Mono Fallback",
      "Consolas",
      "100%",
      "92%",
      "24%"
    ),
    estimatedSubsetKb: 48,
    license: "OFL-1.1",
    provenance: "Curated open-source superfamily; bundle verified per-script subsets."
  })
]);

const pairingDirection = ({
  contrastStrategy,
  displayCase = "sentence",
  displayTracking = "-0.03em",
  displayLineHeight = 0.94,
  bodyTracking = "0em",
  bodyLineHeight = 1.58,
  utilityCase = "uppercase",
  utilityTextTransform = utilityCase === "uppercase" ? "uppercase" : "none",
  utilityTracking = "0.11em",
  utilityLineHeight = 1.18,
  dataCase = "preserve",
  dataTextTransform = "none",
  dataTracking = "0.015em",
  dataLineHeight = 1.2,
  measureCh = { mobile: 11, tablet: 12.5, desktop: 14 },
  maxLines = { mobile: 4, tablet: 3, desktop: 3 },
  opticalSizing = "auto"
}) => ({
  contrastStrategy,
  roles: {
    display: {
      case: displayCase,
      textTransform: displayCase === "uppercase" ? "uppercase" : "none",
      letterSpacing: displayTracking,
      lineHeight: displayLineHeight,
      opticalSizing
    },
    body: {
      case: "sentence",
      textTransform: "none",
      letterSpacing: bodyTracking,
      lineHeight: bodyLineHeight,
      opticalSizing: "auto"
    },
    utility: {
      case: utilityCase,
      textTransform: utilityTextTransform,
      letterSpacing: utilityTracking,
      lineHeight: utilityLineHeight,
      opticalSizing: "auto"
    },
    data: {
      case: dataCase,
      textTransform: dataTextTransform,
      letterSpacing: dataTracking,
      lineHeight: dataLineHeight,
      opticalSizing: "auto"
    }
  },
  headline: {
    strategy: "balance-then-curate",
    measureCh,
    maxLines,
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
});

const freezeRoleDirections = (roles) => Object.freeze(
  Object.fromEntries(
    Object.entries(roles).map(([role, definition]) => [
      role,
      Object.freeze({ ...definition })
    ])
  )
);

const freezePairing = (pairing) => Object.freeze({
  ...pairing,
  roles: Object.freeze({ ...pairing.roles }),
  voices: Object.freeze([...pairing.voices]),
  densities: Object.freeze([...pairing.densities]),
  rationale: Object.freeze([...pairing.rationale]),
  artDirection: Object.freeze({
    ...pairing.artDirection,
    roles: freezeRoleDirections(pairing.artDirection.roles),
    headline: Object.freeze({
      ...pairing.artDirection.headline,
      measureCh: Object.freeze({ ...pairing.artDirection.headline.measureCh }),
      maxLines: Object.freeze({ ...pairing.artDirection.headline.maxLines }),
      forbiddenOrphanWords: Object.freeze([
        ...pairing.artDirection.headline.forbiddenOrphanWords
      ])
    })
  })
});

export const CURATED_PAIRINGS = Object.freeze([
  freezePairing({
    id: "editorial-warmth",
    label: "Editorial warmth",
    roles: {
      display: "Fraunces",
      body: "Source Sans 3",
      utility: "Source Sans 3",
      data: "IBM Plex Mono"
    },
    voices: ["warm", "editorial", "crafted", "expressive", "sensory", "human"],
    densities: ["low", "medium"],
    artDirection: pairingDirection({
      contrastStrategy: "A compact high-contrast serif carries the memorable phrase; an open humanist sans handles reading; tracked uppercase utility copy becomes the quiet editorial grid.",
      displayTracking: "-0.022em",
      displayLineHeight: 0.92,
      utilityTracking: "0.12em",
      measureCh: { mobile: 10.5, tablet: 12, desktop: 14 },
      maxLines: { mobile: 4, tablet: 3, desktop: 3 }
    }),
    rationale: [
      "A characterful display face carries the brand voice.",
      "A high-legibility humanist sans protects reading comfort.",
      "Monospace is reserved for prices, times, measurements, and state."
    ]
  }),
  freezePairing({
    id: "serif-led-journey",
    label: "Serif-led journey",
    roles: {
      display: "Newsreader",
      body: "Newsreader",
      utility: "Source Sans 3",
      data: "Newsreader"
    },
    voices: ["calm", "literary", "editorial", "authoritative", "considered", "crafted", "cultural", "human"],
    densities: ["low", "medium", "high"],
    artDirection: pairingDirection({
      contrastStrategy: "One restrained literary serif owns the headline, reading copy, place names, and numerals; a small tracked sans is confined to navigation and micro-labels so the page reads as an editorial object rather than a UI kit.",
      displayTracking: "-0.014em",
      displayLineHeight: 0.98,
      bodyTracking: "0em",
      bodyLineHeight: 1.42,
      utilityTracking: "0.16em",
      utilityLineHeight: 1.15,
      dataTracking: "0em",
      dataLineHeight: 1.1,
      measureCh: { mobile: 12, tablet: 14, desktop: 15.5 },
      maxLines: { mobile: 3, tablet: 2, desktop: 2 }
    }),
    rationale: [
      "A serif-led role system preserves compact editorial continuity across headline, body, place names, and numerals.",
      "A restrained sans companion appears only in navigation and small labels.",
      "Hierarchy comes from optical size, measure, whitespace, and redaction-like accents instead of billboard scale."
    ]
  }),
  freezePairing({
    id: "global-serif-led-journey",
    label: "Global serif-led journey",
    roles: {
      display: "Noto Serif",
      body: "Noto Serif",
      utility: "Noto Sans",
      data: "Noto Serif"
    },
    voices: ["global", "calm", "literary", "editorial", "authoritative", "cultural", "human"],
    densities: ["low", "medium", "high"],
    artDirection: pairingDirection({
      contrastStrategy: "A multiscript transitional serif owns display, reading, place names, and numerals while a script-compatible sans is restricted to navigation and micro-labels; every script preserves the same quiet editorial hierarchy.",
      displayTracking: "-0.012em",
      displayLineHeight: 0.99,
      bodyLineHeight: 1.43,
      utilityCase: "script-aware",
      utilityTextTransform: "none",
      utilityTracking: "0em",
      utilityLineHeight: 1.18,
      dataTracking: "0em",
      dataLineHeight: 1.12,
      measureCh: { mobile: 12, tablet: 14, desktop: 15.5 },
      maxLines: { mobile: 3, tablet: 2, desktop: 2 }
    }),
    rationale: [
      "A serif-led global superfamily prevents CJK or other scripts from falling into an unrelated browser sans.",
      "Utility copy remains script-aware and avoids Latin-only uppercase or tracking behavior.",
      "The display and body hierarchy stays quiet, compact, and editorial across scripts."
    ]
  }),
  freezePairing({
    id: "engineered-clarity",
    label: "Engineered clarity",
    roles: {
      display: "Space Grotesk",
      body: "IBM Plex Sans",
      utility: "IBM Plex Sans",
      data: "IBM Plex Mono"
    },
    voices: ["technical", "precise", "engineered", "contemporary", "direct", "institutional"],
    densities: ["medium", "high"],
    artDirection: pairingDirection({
      contrastStrategy: "A squared grotesque display voice stays broad and decisive while a compact industrial sans carries dense text; restrained uppercase labels and mono data preserve operational hierarchy.",
      displayTracking: "-0.035em",
      displayLineHeight: 0.93,
      utilityTracking: "0.09em",
      measureCh: { mobile: 11, tablet: 13, desktop: 15 },
      maxLines: { mobile: 4, tablet: 3, desktop: 3 }
    }),
    rationale: [
      "A geometric display voice creates a clear technical signature.",
      "The Plex text system handles dense operational content.",
      "A related mono face distinguishes data without changing the cultural register."
    ]
  }),
  freezePairing({
    id: "playful-workshop",
    label: "Playful workshop",
    roles: {
      display: "Bricolage Grotesque",
      body: "Atkinson Hyperlegible Next",
      utility: "Atkinson Hyperlegible Next",
      data: "JetBrains Mono"
    },
    voices: ["playful", "crafted", "bold", "youthful", "friendly", "accessible"],
    densities: ["low", "medium"],
    artDirection: pairingDirection({
      contrastStrategy: "Irregular display rhythm creates the signature while a wide, highly differentiated body face protects reading; utility labels become small tracked anchors rather than miniature headlines.",
      displayTracking: "-0.034em",
      displayLineHeight: 0.9,
      utilityTracking: "0.1em",
      measureCh: { mobile: 11, tablet: 12.5, desktop: 13.5 },
      maxLines: { mobile: 4, tablet: 4, desktop: 3 }
    }),
    rationale: [
      "The display face supplies irregularity without sacrificing a readable silhouette.",
      "The body face makes the expressive direction accessible at text sizes.",
      "Data remains compact and visibly functional."
    ]
  }),
  freezePairing({
    id: "literary-calm",
    label: "Literary calm",
    roles: {
      display: "Newsreader",
      body: "Source Sans 3",
      utility: "Source Sans 3",
      data: "IBM Plex Mono"
    },
    voices: ["calm", "literary", "editorial", "authoritative", "considered", "human"],
    densities: ["low", "medium", "high"],
    artDirection: pairingDirection({
      contrastStrategy: "A quiet literary serif establishes cadence through contrast and spacing; the humanist sans disappears into long reading; uppercase utility and mono data mark the supporting system.",
      displayTracking: "-0.018em",
      displayLineHeight: 0.96,
      utilityTracking: "0.115em",
      measureCh: { mobile: 11.5, tablet: 13, desktop: 15 },
      maxLines: { mobile: 4, tablet: 3, desktop: 3 }
    }),
    rationale: [
      "A restrained text-informed serif establishes authority.",
      "The sans body face prevents long-form content from becoming mannered.",
      "The data role stays narrow and deliberately secondary."
    ]
  }),
  freezePairing({
    id: "global-clarity",
    label: "Global clarity",
    roles: {
      display: "Noto Serif",
      body: "Noto Sans",
      utility: "Noto Sans",
      data: "Noto Sans Mono"
    },
    voices: ["global", "cultural", "clear", "accessible", "neutral", "authoritative"],
    densities: ["low", "medium", "high"],
    artDirection: pairingDirection({
      contrastStrategy: "Serif and sans categories create hierarchy without Latin-only tricks; utility case and tracking remain script-aware while mono numerals preserve data alignment.",
      displayTracking: "-0.015em",
      displayLineHeight: 0.98,
      utilityCase: "script-aware",
      utilityTextTransform: "none",
      utilityTracking: "0em",
      measureCh: { mobile: 12, tablet: 14, desktop: 16 },
      maxLines: { mobile: 4, tablet: 4, desktop: 3 }
    }),
    rationale: [
      "A coordinated superfamily keeps the hierarchy coherent across scripts.",
      "Per-script subsets make coverage and transfer cost explicit.",
      "The role contrast comes from category and rhythm rather than unsupported stylistic synthesis."
    ]
  }),
  freezePairing({
    id: "poster-signal",
    label: "Poster signal",
    roles: {
      display: "Archivo Black",
      body: "IBM Plex Sans",
      utility: "IBM Plex Sans",
      data: "IBM Plex Mono"
    },
    voices: ["bold", "poster", "direct", "athletic", "compressed", "institutional"],
    densities: ["low", "medium"],
    artDirection: pairingDirection({
      contrastStrategy: "A compact uppercase poster face is confined to short headline bursts; a quieter industrial sans carries every reading role and mono data supplies measured counter-rhythm.",
      displayCase: "uppercase",
      displayTracking: "-0.012em",
      displayLineHeight: 0.88,
      utilityTracking: "0.1em",
      measureCh: { mobile: 9.5, tablet: 11, desktop: 12 },
      maxLines: { mobile: 4, tablet: 3, desktop: 3 },
      opticalSizing: "none"
    }),
    rationale: [
      "A single real display weight creates a forceful headline silhouette.",
      "The body and utility roles keep the compressed voice out of paragraphs.",
      "No fake intermediate display weights are requested."
    ]
  })
]);

export const SYSTEM_DEFAULT_FAMILIES = Object.freeze([
  "arial",
  "arial black",
  "calibri",
  "cambria",
  "courier new",
  "georgia",
  "helvetica",
  "roboto",
  "segoe ui",
  "system-ui",
  "tahoma",
  "times new roman",
  "trebuchet ms",
  "ui-monospace",
  "ui-sans-serif",
  "ui-serif",
  "verdana",
  "sans-serif",
  "serif",
  "monospace"
]);
