import { resolveHostCapabilities } from "./asset-policy.mjs";

export const REFERENCE_ROLES = Object.freeze([
  "category-pattern",
  "composition",
  "typography",
  "interaction",
  "content-tone",
  "asset-treatment"
]);

function normalizeStrategy(strategy, capabilities, request) {
  const requested = String(strategy || "auto").toLowerCase();
  if (!["auto", "search", "generate", "hybrid"].includes(requested)) {
    throw new Error("reference strategy must be auto, search, generate, or hybrid");
  }
  if (requested === "generate" && !capabilities.imageGeneration) return "search";
  if (requested !== "auto") return requested;
  if (request?.exactReference || request?.referenceUrl || request?.realBrand) return "search";
  return capabilities.imageGeneration ? "hybrid" : "search";
}

function searchQueries(brief) {
  const subject = brief.brand || brief.product || brief.name || brief.goal || "digital product";
  const audience = brief.audience ? ` for ${brief.audience}` : "";
  const mood = brief.artDirection || brief.mood || "distinctive editorial";
  return [
    `${subject}${audience} best website information architecture`,
    `${subject} ${mood} typography editorial layout`,
    `${subject} interaction patterns responsive website`,
    `${subject} photography art direction color material references`
  ];
}

function generationPrompt(brief) {
  const subject = brief.brand || brief.product || brief.name || brief.goal || "digital product";
  const audience = brief.audience || "its intended audience";
  const action = brief.primaryAction || "complete the primary task";
  const direction = brief.artDirection || brief.mood || "a distinctive, product-specific art direction";
  return [
    `Create a single desktop website direction frame for ${subject}.`,
    `Audience: ${audience}. Primary action: ${action}.`,
    `Direction: ${direction}. Show hierarchy, typography, composition, material, and realistic content density.`,
    "This is a reference frame, not a production asset: no device mockup, no annotations, no logos copied from other brands, no generic card-grid filler."
  ].join(" ");
}

export function createReferenceAcquisitionPlan(input = {}) {
  const brief = input.brief || input.request || {};
  const host = String(input.host || "codex").toLowerCase();
  const capabilities = { ...resolveHostCapabilities(host), ...(input.capabilities || {}) };
  const strategy = normalizeStrategy(input.strategy, capabilities, brief);
  const actions = [];

  if (strategy === "search" || strategy === "hybrid") {
    actions.push({
      id: "search-reference-set",
      executor: "host-web-search",
      required: true,
      queries: searchQueries(brief),
      expectedRoles: REFERENCE_ROLES,
      completion: "Return 3–6 qualified references with source URLs and one reusable principle per reference."
    });
  }

  if (strategy === "generate" || strategy === "hybrid") {
    actions.push({
      id: "generate-direction-frame",
      executor: "host-image-generation",
      required: strategy === "generate",
      prompt: generationPrompt(brief),
      output: "one raster desktop direction frame plus a separately planned mobile transformation",
      unavailableFallback: "Use the searched reference set and compose the direction directly in browser code."
    });
  }

  return {
    kind: "design-lagann-reference-acquisition-plan",
    host,
    strategy,
    selfAcquisition: true,
    capabilities,
    actions,
    policy: {
      userInput: "Do not ask the user to find references when the host can search or generate them.",
      rights: "Use found references for relationships and principles only unless the user owns or licenses the source.",
      originality: "Never copy another brand's logo, copy, distinctive illustration, or section geometry.",
      provenance: "Record source URL or generation provenance for every accepted reference.",
      approval: "Treat generated direction frames as proposals, never as factual source material or final acceptance evidence."
    }
  };
}

