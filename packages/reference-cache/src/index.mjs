import { createHash } from "node:crypto";
import path from "node:path";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exists, readJson, writeJson } from "../../shared/src/index.mjs";
import { validateReferenceDna } from "../../schemas/src/index.mjs";

export const REFERENCE_CACHE_VERSION = "0.5.0";
const KEY = /^[a-f0-9]{64}$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  }
  return value;
}

function digest(value) {
  const payload = Buffer.isBuffer(value)
    ? value
    : Buffer.from(JSON.stringify(stable(value)));
  return createHash("sha256").update(payload).digest("hex");
}

function referenceUrl(reference) {
  const value = typeof reference === "string"
    ? reference
    : reference?.url || reference?.path;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("reference source must be a URL or local path");
  }
  const trimmed = value.trim();
  if (/^(?:https?|file):/i.test(trimmed)) return new URL(trimmed).toString();
  return pathToFileURL(path.resolve(trimmed)).toString();
}

function safeEntry(root, key) {
  if (!KEY.test(key)) throw new Error("reference cache key must be a SHA-256 digest");
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, key);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("reference cache entry resolves outside the cache root");
  }
  return target;
}

export function referenceCacheRoot(projectRoot, override) {
  return path.resolve(override || path.join(projectRoot, ".design-lagann", "reference-cache"));
}

export async function resolveReferenceSource(reference, {
  fetchImpl = globalThis.fetch
} = {}) {
  const url = referenceUrl(reference);
  if (url.startsWith("file:")) {
    const localPath = fileURLToPath(url);
    const bytes = await readFile(localPath);
    const metadata = await stat(localPath);
    return {
      status: "verified",
      kind: "local-file",
      url,
      sourceDigest: digest(bytes),
      bytes: metadata.size,
      validator: { type: "content-sha256", value: digest(bytes) }
    };
  }
  const supplied = typeof reference === "object" ? reference : {};
  if (KEY.test(supplied.sourceDigest || "")) {
    return {
      status: "verified",
      kind: "remote",
      url,
      sourceDigest: supplied.sourceDigest.toLowerCase(),
      validator: { type: "supplied-content-digest", value: supplied.sourceDigest.toLowerCase() }
    };
  }
  if (typeof fetchImpl !== "function") {
    return {
      status: "unverifiable",
      kind: "remote",
      url,
      sourceDigest: null,
      reason: "No fetch implementation is available to revalidate the remote reference."
    };
  }
  try {
    const response = await fetchImpl(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok) {
      return {
        status: "unverifiable",
        kind: "remote",
        url,
        sourceDigest: null,
        reason: `Remote reference revalidation returned HTTP ${response.status}.`
      };
    }
    const etag = response.headers.get("etag");
    const lastModified = response.headers.get("last-modified");
    const contentLength = response.headers.get("content-length");
    if (!etag && !lastModified) {
      return {
        status: "unverifiable",
        kind: "remote",
        url,
        sourceDigest: null,
        reason: "Remote reference exposes neither ETag nor Last-Modified; a URL-only cache hit would be unsafe."
      };
    }
    const validator = {
      type: etag ? "etag" : "last-modified",
      etag: etag || null,
      lastModified: lastModified || null,
      contentLength: contentLength || null
    };
    return {
      status: "verified",
      kind: "remote",
      url,
      sourceDigest: digest({ url, validator }),
      validator
    };
  } catch (error) {
    return {
      status: "unverifiable",
      kind: "remote",
      url,
      sourceDigest: null,
      reason: `Remote reference could not be revalidated: ${error.message}`
    };
  }
}

export function referenceCacheKey({
  source,
  reference,
  captureContract = { viewports: ["desktop", "mobile"], version: "0.4.0" },
  extractorVersion = "0.4.0",
  visionDigest = null
}) {
  if (source?.status !== "verified" || !KEY.test(source.sourceDigest || "")) {
    throw new Error("a verified source digest is required before computing a reference cache key");
  }
  const descriptor = typeof reference === "string" ? { url: reference } : reference;
  return digest({
    cacheVersion: REFERENCE_CACHE_VERSION,
    sourceDigest: source.sourceDigest,
    role: descriptor?.role || "visual principle",
    borrow: descriptor?.strengths || descriptor?.borrow || [],
    reject: descriptor?.weaknesses || descriptor?.reject || [],
    similarityRisk: descriptor?.similarityRisk || null,
    captureContract,
    extractorVersion,
    visionDigest
  });
}

export async function storeReferenceDna({
  cacheRoot,
  key,
  source,
  reference,
  dna,
  capture = null,
  createdAt = new Date().toISOString()
}) {
  validateReferenceDna(dna);
  if (source?.status !== "verified") {
    throw new Error("unverified source evidence cannot be stored as a reusable reference cache hit");
  }
  const entry = safeEntry(cacheRoot, key);
  const dnaPath = path.join(entry, "design-dna.json");
  const capturePath = path.join(entry, "capture.json");
  const dnaSha256 = digest(dna);
  const captureSha256 = capture ? digest(capture) : null;
  if (capture) await writeJson(capturePath, capture);
  await writeJson(dnaPath, dna);
  const manifest = {
    version: REFERENCE_CACHE_VERSION,
    key,
    createdAt,
    source,
    reference: typeof reference === "string" ? { url: reference } : reference,
    artifacts: {
      dna: { path: "design-dna.json", sha256: dnaSha256 },
      capture: capture
        ? { path: "capture.json", sha256: captureSha256 }
        : null
    },
    confidenceBoundary: "Cached DNA retains its original exact/computed/estimated/inferred labels and never counts as current acceptance evidence."
  };
  await writeJson(path.join(entry, "manifest.json"), manifest);
  return { status: "stored", key, entry, manifest };
}

export async function loadReferenceDna({
  cacheRoot,
  key,
  source
}) {
  const entry = safeEntry(cacheRoot, key);
  const manifestPath = path.join(entry, "manifest.json");
  if (!(await exists(manifestPath))) {
    return { status: "miss", key, reason: "No manifest exists for this source and extraction contract." };
  }
  try {
    const manifest = await readJson(manifestPath);
    if (manifest.version !== REFERENCE_CACHE_VERSION || manifest.key !== key) {
      return { status: "stale", key, reason: "Cache schema or key no longer matches." };
    }
    if (source?.status !== "verified" || manifest.source?.sourceDigest !== source.sourceDigest) {
      return { status: "stale", key, reason: "The source validator changed or cannot be revalidated." };
    }
    const dnaPath = path.join(entry, manifest.artifacts?.dna?.path || "");
    if (!(await exists(dnaPath))) {
      return { status: "partial", key, reason: "The cache manifest exists but Design DNA is missing." };
    }
    const dna = await readJson(dnaPath);
    validateReferenceDna(dna);
    if (digest(dna) !== manifest.artifacts.dna.sha256) {
      return { status: "corrupt", key, reason: "The cached Design DNA hash does not match its manifest." };
    }
    if (manifest.artifacts.capture) {
      const capturePath = path.join(entry, manifest.artifacts.capture.path);
      if (!(await exists(capturePath))) {
        return { status: "partial", key, reason: "The cache manifest expects capture evidence that is missing." };
      }
      const capture = await readJson(capturePath);
      if (digest(capture) !== manifest.artifacts.capture.sha256) {
        return { status: "corrupt", key, reason: "The cached capture hash does not match its manifest." };
      }
    }
    return {
      status: "hit",
      key,
      dna,
      manifest,
      claimBoundary: "This hit may replace repeated extraction, not current rendered or acceptance evidence."
    };
  } catch (error) {
    return { status: "corrupt", key, reason: error.message };
  }
}

export async function listReferenceCache(cacheRoot) {
  if (!(await exists(cacheRoot))) return [];
  const entries = [];
  for (const name of (await readdir(cacheRoot)).sort()) {
    if (!KEY.test(name)) continue;
    const manifestPath = path.join(safeEntry(cacheRoot, name), "manifest.json");
    if (!(await exists(manifestPath))) {
      entries.push({ key: name, status: "partial" });
      continue;
    }
    try {
      const manifest = await readJson(manifestPath);
      entries.push({
        key: name,
        status: manifest.version === REFERENCE_CACHE_VERSION ? "available" : "stale",
        createdAt: manifest.createdAt,
        source: manifest.source,
        role: manifest.reference?.role || "visual principle"
      });
    } catch (error) {
      entries.push({ key: name, status: "corrupt", reason: error.message });
    }
  }
  return entries;
}

export { digest as referenceDigest, referenceUrl };
