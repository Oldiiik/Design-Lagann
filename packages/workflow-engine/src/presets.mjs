export const PRODUCT_STATES = [
  "default", "hover", "active", "focus-visible", "disabled", "loading", "empty",
  "success", "warning", "error", "offline", "permission-denied", "no-results",
  "onboarding", "populated", "long-content", "responsive"
];

export const STRUCTURE_PRESETS = {
  marketing: ["utility-navigation", "hero", "proof", "value-narrative", "feature-detail", "objections", "primary-action", "footer"],
  commerce: ["navigation", "merchandising-hero", "category-access", "product-grid", "product-detail", "cart", "checkout", "support"],
  application: ["global-navigation", "workspace", "primary-task", "secondary-context", "system-feedback", "account-and-settings"],
  platform: ["navigation", "problem-frame", "capability-map", "workflow-proof", "integration-story", "security-and-trust", "conversion"],
  content: ["masthead", "topic-navigation", "lead-story", "content-stream", "related-content", "subscription-or-contact", "footer"]
};

const PRESET_SIGNALS = {
  commerce: ["shop", "product", "cart", "checkout", "buy", "store"],
  application: ["dashboard", "app", "workspace", "admin", "settings", "saas"],
  platform: ["platform", "api", "developer", "integration", "infrastructure"],
  content: ["news", "editorial", "blog", "publication", "service", "agency"],
  marketing: ["landing", "campaign", "launch", "company", "brand"]
};

export function selectStructurePreset(input = {}) {
  const explicit = String(input.preset || input.productType || "").toLowerCase();
  if (STRUCTURE_PRESETS[explicit]) return explicit;
  const text = `${input.goal || ""} ${input.audience || ""}`.toLowerCase();
  const ranked = Object.entries(PRESET_SIGNALS)
    .map(([name, terms]) => ({ name, score: terms.filter((term) => text.includes(term)).length }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].score ? ranked[0].name : "marketing";
}

export function createInformationArchitecture(input = {}) {
  const preset = selectStructurePreset(input);
  const base = STRUCTURE_PRESETS[preset];
  const sections = (input.requiredSections || base).filter((section) => !(input.excludeSections || []).includes(section));
  return {
    preset,
    sections,
    primaryAction: input.primaryAction || "complete the primary product action",
    responsiveRule: "Recompose priority and reading order; do not merely stack desktop containers.",
    productStates: preset === "application" || preset === "commerce" ? PRODUCT_STATES : ["default", "hover", "focus-visible", "loading", "error", "responsive"]
  };
}
