import { createHash } from "node:crypto";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";

import { readJson, writeJson } from "../../shared/src/index.mjs";
import { guardPipelineStage } from "./pipeline-status.mjs";

const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
const READY_STATUSES = new Set(["acquired", "approved", "ready", "complete", "completed", "generated"]);
const RASTER_KINDS = new Set([
  "generated-raster",
  "generated-photo",
  "photo",
  "licensed-photo",
  "user-photo",
  "raster"
]);

function portable(value) {
  return value.replaceAll("\\", "/");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function requiredRasterAssets(manifest) {
  return (manifest?.assets || []).filter((asset) => (
    asset?.implementation === "transparent-raster" ||
    asset?.medium === "transparent-raster"
  ));
}

function normalizeSubmissions(submissions) {
  const list = Array.isArray(submissions)
    ? submissions
    : Array.isArray(submissions?.assets)
      ? submissions.assets
      : [];
  if (!list.length) throw new Error("asset submissions must contain at least one asset");
  const byId = new Map();
  for (const [index, submission] of list.entries()) {
    if (!submission || typeof submission !== "object" || Array.isArray(submission)) {
      throw new TypeError(`asset submissions[${index}] must be an object`);
    }
    const id = String(submission.id || "").trim();
    if (!id) throw new Error(`asset submissions[${index}].id is required`);
    if (byId.has(id)) throw new Error(`asset submissions contains duplicate id ${id}`);
    byId.set(id, submission);
  }
  return byId;
}

function rasterSignature(bytes, extension) {
  if (
    extension === ".png" &&
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return {
      format: "png",
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20)
    };
  }
  if (
    [".jpg", ".jpeg"].includes(extension) &&
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8
  ) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      if ([
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
      ].includes(marker)) {
        return {
          format: "jpeg",
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7)
        };
      }
      if (!Number.isFinite(length) || length < 2) break;
      offset += 2 + length;
    }
    return { format: "jpeg", width: null, height: null };
  }
  if (
    extension === ".webp" &&
    bytes.length >= 30 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    const variant = bytes.subarray(12, 16).toString("ascii");
    if (variant === "VP8X") {
      return {
        format: "webp",
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3)
      };
    }
    if (variant === "VP8 " && bytes.length >= 30) {
      return {
        format: "webp",
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff
      };
    }
    if (variant === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
      const packed = bytes.readUInt32LE(21);
      return {
        format: "webp",
        width: 1 + (packed & 0x3fff),
        height: 1 + ((packed >> 14) & 0x3fff)
      };
    }
    return { format: "webp", width: null, height: null };
  }
  if (
    extension === ".avif" &&
    bytes.length >= 16 &&
    bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
    /avif|avis/.test(bytes.subarray(8, 16).toString("ascii"))
  ) {
    return { format: "avif", width: null, height: null };
  }
  return null;
}

async function collectDirectionHashes(root) {
  const orientation = path.join(root, ".design-lagann", "visual-orientation");
  const files = [
    "evidence-binding.json",
    "optimized-desktop-evidence-binding.json",
    "optimized-selected-pair-evidence-binding.json",
    "selected-visual-reference.json"
  ];
  const hashes = new Set();
  for (const file of files) {
    try {
      const content = await readFile(path.join(orientation, file), "utf8");
      for (const match of content.matchAll(/\b[a-f0-9]{64}\b/gi)) hashes.add(match[0].toLowerCase());
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return hashes;
}

function validateProvenance(submission, id) {
  const kind = String(submission.kind || submission.type || "").trim().toLowerCase();
  if (!RASTER_KINDS.has(kind)) {
    throw new Error(`${id}.kind must identify a real raster or photo asset`);
  }
  const provenance = submission.provenance || submission.source;
  if (!provenance || (typeof provenance === "object" && !Object.keys(provenance).length)) {
    throw new Error(`${id}.provenance is required`);
  }
  if (kind.startsWith("generated-")) {
    if (typeof provenance !== "object" || Array.isArray(provenance)) {
      throw new Error(`${id}.provenance must record the generator for a generated asset`);
    }
    if (!String(provenance.provider || "").trim()) {
      throw new Error(`${id}.provenance.provider is required`);
    }
    if (!String(provenance.generatedAt || "").trim() || Number.isNaN(Date.parse(provenance.generatedAt))) {
      throw new Error(`${id}.provenance.generatedAt must be an ISO-compatible timestamp`);
    }
    if (!String(submission.sourcePrompt || submission.prompt || "").trim()) {
      throw new Error(`${id}.sourcePrompt is required for a generated asset`);
    }
  }
  return { kind, provenance };
}

async function bindOne({ root, requiredAsset, submission, directionHashes }) {
  const id = requiredAsset.id;
  const suppliedPath = String(
    submission.localPath ||
    submission.path ||
    submission.outputPath ||
    ""
  ).trim();
  if (!suppliedPath) throw new Error(`${id}.path is required`);
  const target = path.resolve(root, suppliedPath);
  if (!inside(root, target)) throw new Error(`${id}.path must stay inside the project root`);
  const relative = portable(path.relative(root, target));
  if (relative.toLowerCase().startsWith(".design-lagann/visual-orientation/")) {
    throw new Error(`${id}.path cannot reuse a visual direction frame`);
  }
  const extension = path.extname(target).toLowerCase();
  if (!RASTER_EXTENSIONS.has(extension)) {
    throw new Error(`${id}.path must be a PNG, JPEG, WebP, or AVIF raster file`);
  }
  const metadata = await stat(target).catch(() => null);
  if (!metadata?.isFile() || metadata.size < 1) {
    throw new Error(`${id}.path must resolve to a non-empty local file`);
  }
  const bytes = await readFile(target);
  const signature = rasterSignature(bytes, extension);
  if (!signature) throw new Error(`${id}.path does not contain a valid raster signature`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (submission.sha256 && String(submission.sha256).toLowerCase() !== sha256) {
    throw new Error(`${id}.sha256 does not match the local file`);
  }
  if (directionHashes.has(sha256)) {
    throw new Error(`${id} reuses a visual direction frame; production assets must be generated or acquired separately`);
  }
  const { kind, provenance } = validateProvenance(submission, id);
  const width = Number(submission.width || signature.width);
  const height = Number(submission.height || signature.height);
  if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
    throw new Error(`${id} must have verified positive width and height`);
  }
  const status = String(submission.status || (kind.startsWith("generated-") ? "generated" : "acquired")).toLowerCase();
  if (!READY_STATUSES.has(status)) throw new Error(`${id}.status is not materialized`);
  const responsiveBehavior = String(
    submission.responsiveBehavior ||
    requiredAsset.responsiveBehavior ||
    ""
  ).trim();
  if (!responsiveBehavior) throw new Error(`${id}.responsiveBehavior is required`);
  return {
    id,
    role: requiredAsset.role || "supporting",
    intent: requiredAsset.intent || "editorial-image",
    medium: "transparent-raster",
    kind,
    status,
    localPath: relative,
    sha256,
    bytes: metadata.size,
    format: signature.format,
    width,
    height,
    sourcePrompt: String(submission.sourcePrompt || submission.prompt || "").trim() || null,
    provenance,
    responsiveBehavior,
    accessibleName: submission.accessibleName || submission.alt || null,
    renderedUse: {
      status: "pending-browser-proof",
      requirement: "Verify crop, edge quality, loading, role, and responsive use in fresh desktop, tablet, and mobile captures."
    },
    directionFrame: false
  };
}

export async function bindAssetAcquisition({ projectRoot, submissions }) {
  const root = path.resolve(projectRoot || process.cwd());
  const pipelineGate = await guardPipelineStage({
    projectRoot: root,
    requestedStage: "asset-acquisition"
  });
  const manifestPath = path.join(root, ".design-lagann", "asset-manifest.json");
  const manifest = await readJson(manifestPath);
  if (!Array.isArray(manifest?.assets)) {
    throw new Error("A valid .design-lagann/asset-manifest.json is required before asset acquisition");
  }
  const required = requiredRasterAssets(manifest);
  const byId = normalizeSubmissions(submissions);
  const directionHashes = await collectDirectionHashes(root);
  const assets = [];
  for (const requiredAsset of required) {
    const submission = byId.get(requiredAsset.id);
    if (!submission) {
      throw new Error(`Required raster/photo asset ${requiredAsset.id} is missing from submissions`);
    }
    assets.push(await bindOne({ root, requiredAsset, submission, directionHashes }));
  }
  if (!required.length) {
    throw new Error("The asset manifest does not require any raster/photo acquisition");
  }
  const receipt = {
    schemaVersion: "1.0.0",
    kind: "design-lagann-asset-acquisition",
    runId: pipelineGate?.status?.runId || null,
    status: "materialized",
    createdAt: new Date().toISOString(),
    projectRoot: root,
    assets,
    requiredAssetIds: required.map((asset) => asset.id),
    allRequiredAssetsMaterialized: true,
    directionFramesUsedAsAssets: false,
    claimBoundary: "This receipt proves local file identity and acquisition provenance. Rendered asset quality and use remain pending until fresh desktop, tablet, and mobile browser proof."
  };
  const target = path.join(root, ".design-lagann", "asset-acquisition.json");
  await writeJson(target, receipt);
  return {
    phase: "implementation-required",
    artifact: target,
    receipt,
    message: "Every required raster/photo asset is a separate local hash-bound file. Implement the local source, then prove rendered use at desktop, tablet, and mobile."
  };
}
