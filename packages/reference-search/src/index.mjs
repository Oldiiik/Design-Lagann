import { slugify } from "../../shared/src/index.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function normalizeReferenceUrl(value) {
  const source = String(value || "").trim();
  if (!source) throw new Error("Reference URL or local path is required");
  if (/^(?:https?|file):/i.test(source)) return new URL(source).toString();
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) && !/^[a-z]:[\\/]/i.test(source)) {
    return new URL(source).toString();
  }
  return pathToFileURL(path.resolve(source)).toString();
}

function sourceLabel(url) {
  const parsed = new URL(url);
  if (parsed.protocol === "file:") {
    return path.basename(decodeURIComponent(parsed.pathname));
  }
  return parsed.hostname;
}

export const REFERENCE_SOURCE_REGISTRY = Object.freeze([
  Object.freeze({
    id: "watermelon-ui",
    label: "Watermelon UI",
    kind: "component-system",
    url: "https://watermelon.sh/",
    hostnames: Object.freeze(["watermelon.sh"]),
    strengths: Object.freeze(["production-ready component patterns", "interaction states", "startup product UI"]),
    ingestion: "Inspect public documentation and approved component examples; copy code only when its license and the selected component provenance are recorded."
  }),
  Object.freeze({
    id: "variant",
    label: "Variant",
    kind: "inspiration-feed",
    url: "https://variant.com/",
    hostnames: Object.freeze(["variant.com"]),
    strengths: Object.freeze(["rapid visual-option discovery", "interaction concepts", "uncommon interface compositions"]),
    ingestion: "Use as visual discovery evidence, never as an assumed installable UI package or a source of unlicensed code."
  }),
  Object.freeze({
    id: "grayblocks",
    label: "GrayBlocks",
    kind: "cross-tool-block-library",
    url: "https://grayblocks.net/",
    hostnames: Object.freeze(["grayblocks.net", "www.grayblocks.net"]),
    strengths: Object.freeze(["section architecture", "responsive block patterns", "Figma, Framer, and Webflow structures"]),
    ingestion: "Use only components the user can access and license; record the originating tool, block identity, and adaptation decisions."
  })
]);

const sourceById = new Map(REFERENCE_SOURCE_REGISTRY.map((source) => [source.id, source]));

export function resolveReferenceSources(values = ["watermelon-ui", "variant", "grayblocks"]) {
  const requested = Array.isArray(values) ? values : [values];
  return requested.map((value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
    const direct = sourceById.get(normalized);
    if (direct) return direct;
    let hostname = "";
    try { hostname = new URL(String(value)).hostname.toLowerCase(); } catch {}
    const matched = REFERENCE_SOURCE_REGISTRY.find((source) => source.hostnames.includes(hostname));
    if (matched) return matched;
    throw new Error(`Unknown reference source: ${value}`);
  });
}

export function createReferenceFidelityContract({
  referenceId,
  sourceDigest,
  ownership = "inspiration-only",
  approved = false,
  viewports = ["desktop", "tablet", "mobile"]
} = {}) {
  if (!String(referenceId || "").trim()) throw new Error("referenceId is required");
  if (!/^[a-f0-9]{64}$/i.test(String(sourceDigest || ""))) {
    throw new Error("sourceDigest must be a SHA-256 digest");
  }
  const closeReproductionAllowed = approved && ["user-owned", "licensed", "authorized"].includes(ownership);
  return {
    version: "1.0.0",
    referenceId,
    sourceDigest: sourceDigest.toLowerCase(),
    mode: closeReproductionAllowed ? "reference-close" : "principle-synthesis",
    viewports: [...new Set(viewports)],
    measurableRelationships: [
      "viewport-relative section geometry and whitespace bands",
      "headline family class, measure, authored breaks, line count, and baseline position",
      "asset crop, visible silhouette, focal point, overlap, and edge treatment",
      "object-to-type and object-to-action alignment",
      "color and material role ownership",
      "section order, height rhythm, and transition landmarks",
      "component states and responsive recomposition"
    ],
    tolerances: closeReproductionAllowed
      ? {
          geometryPercent: 3,
          focalPointPercent: 3,
          headlineLineCountDelta: 0,
          sectionOrderDelta: 0,
          stateCoverage: "all-visible-and-requested"
        }
      : null,
    requiredEvidence: [
      "current hash-bound reference captures",
      "fresh build captures at matching viewport dimensions",
      "structured vision comparison for every measurable relationship",
      "documented deviations and their product, accessibility, or licensing reason"
    ],
    protectionBoundary: closeReproductionAllowed
      ? "Close reproduction is authorized for this bound source; protected copy, logos, and unrelated third-party assets still require explicit rights."
      : "Borrow principles and relationships only. Do not reproduce protected copy, logos, imagery, or distinctive page geometry closely.",
    claimBoundary: "Reference-close is a measured target, not a claim of pixel identity. Acceptance still requires semantic, responsive, accessibility, and runtime proof."
  };
}

export function normalizeReferences(references = []) {
  const seen = new Set();
  return references.map((reference, index) => {
    const item = typeof reference === "string" ? { url: reference } : reference;
    const url = normalizeReferenceUrl(item.url || item.path);
    if (seen.has(url)) throw new Error(`Duplicate reference URL: ${url}`);
    seen.add(url);
    const hostname = new URL(url).hostname.toLowerCase();
    const registrySource = REFERENCE_SOURCE_REGISTRY.find((source) => source.hostnames.includes(hostname));
    return {
      id: item.id || `${String(index + 1).padStart(2, "0")}-${slugify(sourceLabel(url))}`,
      url,
      role: item.role || "visual principle",
      reason: item.reason || "User-provided reference",
      strengths: item.strengths ?? [],
      weaknesses: item.weaknesses ?? [],
      similarityRisk: item.similarityRisk ?? "Review during synthesis",
      ...(registrySource ? {
        registrySource: {
          id: registrySource.id,
          label: registrySource.label,
          kind: registrySource.kind,
          ingestion: registrySource.ingestion
        }
      } : {}),
      ...(item.sourceDigest ? { sourceDigest: item.sourceDigest } : {}),
      ...(item.strength ? { strength: item.strength } : {}),
      ...(item.approved !== undefined ? { approved: item.approved } : {})
    };
  });
}
