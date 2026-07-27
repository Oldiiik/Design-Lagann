export const INTENTIONAL_ASSET_CATEGORIES = [
  "background",
  "section-background",
  "hero-image",
  "product-image",
  "editorial-image",
  "foreground-transparent",
  "subtle-texture",
  "brand-illustration",
  "explicit-request"
];

const FORBIDDEN_DECORATION = [
  "particle", "ribbon", "belt", "blob", "glow", "noise", "sparkle", "floating ornament",
  "decorative divider", "decorative line", "random shape"
];

export function resolveHostCapabilities(host = "codex", overrides = {}) {
  const normalized = String(host).toLowerCase();
  const defaults = normalized === "claude"
    ? {
        host: "claude",
        imageGeneration: false,
        imageUnderstanding: true,
        browserComposition: true,
        rasterEditing: false,
        motionVideo: false
      }
    : normalized === "cursor"
      ? {
          host: "cursor",
          imageGeneration: true,
          imageUnderstanding: true,
          browserComposition: true,
          rasterEditing: true,
          motionVideo: false
        }
      : {
        host: "codex",
        imageGeneration: true,
        imageUnderstanding: true,
        browserComposition: true,
        rasterEditing: true,
        motionVideo: true
        };
  return { ...defaults, ...overrides };
}

export function classifyAssetIntent(asset = {}) {
  const text = `${asset.category || ""} ${asset.role || ""} ${asset.description || ""}`.toLowerCase();
  if (FORBIDDEN_DECORATION.some((term) => text.includes(term))) {
    return { accepted: false, category: "decoration", reason: "Automatic decoration is outside the Design Lagann asset policy." };
  }
  const category = INTENTIONAL_ASSET_CATEGORIES.includes(asset.category)
    ? asset.category
    : asset.explicitlyRequested ? "explicit-request" : null;
  if (!category) {
    return { accepted: false, category: null, reason: "The asset does not have an intentional content or brand role." };
  }
  return { accepted: true, category, reason: "The asset has a named compositional or content responsibility." };
}

function claudeRoute(asset, classification) {
  if (asset.localPath) return { strategy: "use-local", status: "ready", source: asset.localPath };
  if (asset.referenceUrl) return { strategy: "qualify-reference", status: "needs-rights-check", source: asset.referenceUrl };
  if (classification.category === "subtle-texture") {
    return { strategy: "css-or-canvas-texture", status: "authorable", source: null };
  }
  return {
    strategy: "acquire-raster",
    status: "acquisition-needed",
    source: null,
    guidance: "Request a user-owned/licensed raster asset or provide a precise external-generation brief. Continue the layout without inventing a decorative substitute."
  };
}

export function routeAsset(asset, capabilities = resolveHostCapabilities()) {
  const classification = classifyAssetIntent(asset);
  if (!classification.accepted) return { ...classification, status: "rejected", strategy: "omit" };
  if (capabilities.host === "claude" || !capabilities.imageGeneration) {
    return { ...classification, ...claudeRoute(asset, classification), host: capabilities.host };
  }
  if (asset.localPath) {
    return { ...classification, host: capabilities.host, strategy: "use-local", status: "ready", source: asset.localPath };
  }
  return {
    ...classification,
    host: capabilities.host,
    strategy: "generate-raster",
    status: "generation-authorized",
    output: classification.category === "foreground-transparent" ? "png-alpha" : "png-or-webp",
    constraint: classification.category === "foreground-transparent"
      ? "Generate only the named subject with clean alpha; never bake in page, sky, horizon, copy, or background."
      : "Generate only the named image role; do not turn it into a full-page mockup."
  };
}

export function createAssetPlan(assets = [], host = "codex", overrides = {}) {
  const capabilities = resolveHostCapabilities(host, overrides);
  const routes = assets.map((asset) => ({ asset, route: routeAsset(asset, capabilities) }));
  return {
    kind: "design-lagann-asset-plan",
    host: capabilities.host,
    capabilities,
    routes,
    rejectedDecorationCount: routes.filter(({ route }) => route.category === "decoration").length,
    ready: routes.every(({ route }) => !["acquisition-needed", "needs-rights-check"].includes(route.status)),
    rule: "Assets serve content, product, brand, or composition. Nothing is generated merely to fill space."
  };
}
