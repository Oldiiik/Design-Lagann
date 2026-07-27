import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadReferenceDna,
  referenceCacheKey,
  resolveReferenceSource,
  storeReferenceDna
} from "../packages/reference-cache/src/index.mjs";

async function temporaryDirectory() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-cache-"));
}

function dnaFixture() {
  return {
    identity: { source: "fixture" },
    system: { colors: { values: ["#f4d4ad"], confidence: "computed" } },
    style: { composition: { value: "editorial overlap", confidence: "inferred" } },
    effects: { depth: { value: "soft directional relief", confidence: "inferred" } },
    application: { borrow: ["reading rhythm"], reject: ["literal copying"] },
    confidence: {
      identity: "exact",
      system: "computed",
      style: "inferred",
      effects: "inferred",
      application: "exact"
    }
  };
}

test("reference cache keys source bytes and extraction contract, not local filenames", async () => {
  const root = await temporaryDirectory();
  const firstPath = path.join(root, "reference-a.png");
  const secondPath = path.join(root, "renamed-reference.png");
  await Promise.all([
    writeFile(firstPath, Buffer.from("same-image-bytes")),
    writeFile(secondPath, Buffer.from("same-image-bytes"))
  ]);
  const [firstSource, secondSource] = await Promise.all([
    resolveReferenceSource(firstPath),
    resolveReferenceSource(secondPath)
  ]);
  assert.equal(firstSource.sourceDigest, secondSource.sourceDigest);

  const contract = {
    viewports: ["desktop", "mobile"],
    captureVersion: "0.5.0"
  };
  const firstKey = referenceCacheKey({
    source: firstSource,
    reference: { path: firstPath, role: "composition" },
    captureContract: contract,
    extractorVersion: "0.5.0"
  });
  const secondKey = referenceCacheKey({
    source: secondSource,
    reference: { path: secondPath, role: "composition" },
    captureContract: contract,
    extractorVersion: "0.5.0"
  });
  assert.equal(firstKey, secondKey);

  await writeFile(secondPath, Buffer.from("changed-image-bytes"));
  const changedSource = await resolveReferenceSource(secondPath);
  const changedKey = referenceCacheKey({
    source: changedSource,
    reference: { path: secondPath, role: "composition" },
    captureContract: contract,
    extractorVersion: "0.5.0"
  });
  assert.notEqual(changedKey, firstKey);
});

test("reference cache returns verified hits and rejects tampered DNA", async () => {
  const root = await temporaryDirectory();
  const cacheRoot = path.join(root, "cache");
  const sourcePath = path.join(root, "reference.webp");
  await writeFile(sourcePath, Buffer.from("reference-image"));
  const source = await resolveReferenceSource(sourcePath);
  const reference = { path: sourcePath, role: "material language" };
  const key = referenceCacheKey({
    source,
    reference,
    captureContract: { viewports: ["desktop", "mobile"], captureVersion: "0.5.0" },
    extractorVersion: "0.5.0"
  });
  await storeReferenceDna({
    cacheRoot,
    key,
    source,
    reference,
    dna: dnaFixture(),
    capture: { id: "capture", captures: [{ name: "desktop" }] },
    createdAt: "2026-07-23T12:00:00.000Z"
  });

  const hit = await loadReferenceDna({ cacheRoot, key, source });
  assert.equal(hit.status, "hit");
  assert.equal(hit.dna.confidence.style, "inferred");
  assert.match(hit.claimBoundary, /not current rendered or acceptance evidence/i);

  const dnaPath = path.join(cacheRoot, key, "design-dna.json");
  const tampered = JSON.parse(await readFile(dnaPath, "utf8"));
  tampered.identity.source = "tampered";
  await writeFile(dnaPath, JSON.stringify(tampered, null, 2));
  const corrupt = await loadReferenceDna({ cacheRoot, key, source });
  assert.equal(corrupt.status, "corrupt");
});

test("URL-only remote references cannot become unsafe cache hits", async () => {
  const source = await resolveReferenceSource("https://example.com/reference", {
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => null }
    })
  });
  assert.equal(source.status, "unverifiable");
  assert.match(source.reason, /neither ETag nor Last-Modified/i);
  assert.throws(
    () => referenceCacheKey({
      source,
      reference: { url: "https://example.com/reference" }
    }),
    /verified source digest/i
  );
});
