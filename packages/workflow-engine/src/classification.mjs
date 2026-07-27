const OPERATIONS = ["create", "redesign", "edit", "extend", "repair", "transform"];

const SIGNALS = {
  repair: ["fix", "broken", "bug", "overflow", "wrong", "repair", "not working", "accessibility"],
  edit: ["change", "replace", "rename", "adjust", "tweak", "update copy", "only"],
  extend: ["add", "new section", "new page", "extend", "include", "integrate"],
  transform: ["convert", "migrate", "transform", "port", "adapt for", "change stack"],
  redesign: ["redesign", "refresh", "rework", "make it look", "visual overhaul", "new direction"],
  create: ["create", "build", "make a", "start", "new site", "landing page"]
};

const PROFILE_ALIASES = {
  quick: "fast",
  fast: "fast",
  balanced: "balanced",
  default: "balanced",
  quality: "quality",
  "super-quality": "quality",
  showcase: "quality"
};

export function normalizeProfile(value = "balanced") {
  return PROFILE_ALIASES[String(value).toLowerCase()] || "balanced";
}

export function classifyRequest(request = {}, project = {}) {
  const text = `${request.goal || ""} ${request.message || ""}`.toLowerCase();
  const explicit = String(request.operation || "").toLowerCase();
  let operation = OPERATIONS.includes(explicit) ? explicit : null;

  if (!operation) {
    const ranked = Object.entries(SIGNALS)
      .map(([candidate, terms]) => ({
        candidate,
        score: terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0)
      }))
      .sort((a, b) => b.score - a.score);
    operation = ranked[0].score > 0 ? ranked[0].candidate : (project.exists ? "edit" : "create");
  }

  const existingRequired = operation !== "create";
  return {
    kind: "design-lagann-request",
    operation,
    profile: normalizeProfile(request.profile || request.mode),
    inspectFirst: existingRequired,
    minimumScope: operation === "edit" || operation === "repair",
    preserveApproved: existingRequired,
    confidence: explicit ? "explicit" : "inferred",
    blockers: existingRequired && project.exists === false
      ? [`${operation} requires an existing project; reclassify as create or provide the project.`]
      : []
  };
}

export function estimateScope({ classification, project = {}, request = {} }) {
  const base = {
    create: 5,
    redesign: 5,
    edit: 1,
    extend: 3,
    repair: 2,
    transform: 6
  }[classification.operation];
  const routes = Number(project.routeCount || 1);
  const stateFactor = request.productUI ? 2 : 0;
  const assetFactor = Array.isArray(request.assets) ? Math.min(request.assets.length, 4) : 0;
  const score = base + Math.ceil(routes / 4) + stateFactor + assetFactor;
  return {
    score,
    level: score <= 3 ? "small" : score <= 7 ? "medium" : "large",
    likelyPasses: classification.profile === "fast" ? 1 : classification.profile === "quality" ? 3 : 2,
    rationale: `${classification.operation} across ${routes} route(s), ${request.productUI ? "with" : "without"} product-state coverage.`
  };
}
