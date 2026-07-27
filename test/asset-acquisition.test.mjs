import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { bindAssetAcquisition } from "../packages/orchestrator/src/asset-acquisition.mjs";
import { createSitePlan } from "../packages/orchestrator/src/site-plan.mjs";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
  "base64"
);

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-lagann-assets-"));
  await mkdir(path.join(root, ".design-lagann"), { recursive: true });
  await mkdir(path.join(root, "assets", "generated"), { recursive: true });
  const orientation = path.join(root, ".design-lagann", "visual-orientation");
  await mkdir(path.join(orientation, "frames"), { recursive: true });
  const desktopRelative = ".design-lagann/visual-orientation/frames/desktop.png";
  const mobileRelative = ".design-lagann/visual-orientation/frames/mobile.png";
  const desktopBytes = Buffer.concat([ONE_PIXEL_PNG, Buffer.from("direction-desktop")]);
  const mobileBytes = Buffer.concat([ONE_PIXEL_PNG, Buffer.from("direction-mobile")]);
  await writeFile(path.join(root, desktopRelative), desktopBytes);
  await writeFile(path.join(root, mobileRelative), mobileBytes);
  const desktopHash = createHash("sha256").update(desktopBytes).digest("hex");
  const mobileHash = createHash("sha256").update(mobileBytes).digest("hex");
  const approval = {
    status: "approved",
    candidateId: "soft-crumb-direction",
    decidedAt: "2026-07-24T00:00:00.000Z"
  };
  await writeFile(
    path.join(root, ".design-lagann", "brief.json"),
    JSON.stringify({ goal: "Create a bakery page.", executionProfile: "quality" })
  );
  await writeFile(
    path.join(root, ".design-lagann", "adaptive-plan.json"),
    JSON.stringify({ version: "1.0.0", profile: "quality", acceptancePolicy: "elite-v1" })
  );
  await writeFile(
    path.join(root, ".design-lagann", "site-plan.json"),
    JSON.stringify(createSitePlan({ goal: "Create a bakery page." }, {
      profile: "quality",
      createdAt: "2026-07-24T00:00:00.000Z"
    }))
  );
  await writeFile(
    path.join(orientation, "optimized-plan.json"),
    JSON.stringify({ schemaVersion: "0.5.0", candidates: [{ id: "soft-crumb-direction" }] })
  );
  await writeFile(
    path.join(orientation, "optimized-desktop-evidence-binding.json"),
    JSON.stringify({
      schemaVersion: "0.5.0",
      candidates: [{
        candidateId: "soft-crumb-direction",
        images: { desktop: { localPath: desktopRelative, sha256: desktopHash } }
      }]
    })
  );
  await writeFile(
    path.join(orientation, "optimized-selection.json"),
    JSON.stringify({
      schemaVersion: "0.5.0",
      status: "human-approved",
      selectedCandidateId: "soft-crumb-direction",
      humanApproval: approval
    })
  );
  await writeFile(
    path.join(orientation, "selected-visual-reference.json"),
    JSON.stringify({
      schemaVersion: "0.5.0",
      kind: "selected-generated-visual-reference",
      status: "human-approved-reference",
      candidateId: "soft-crumb-direction",
      humanApproval: approval,
      pairVerification: { status: "independent-pair-critic-approved" },
      imageEvidence: {
        role: "creative-reference",
        groundTruth: false,
        desktop: { localPath: desktopRelative, sha256: desktopHash },
        mobile: { localPath: mobileRelative, sha256: mobileHash }
      }
    })
  );
  await writeFile(
    path.join(root, "DESIGN.md"),
    "# Soft Crumb implementation contract\n\nThe pastry interrupts the order slip and changes the reading path. The responsive implementation preserves that relationship through crop, overlap, type scale, and reading order."
  );
  await writeFile(
    path.join(root, ".design-lagann", "project-design-dna.json"),
    JSON.stringify({ creativeThesis: "The pastry interrupts the order slip." })
  );
  await writeFile(
    path.join(root, ".design-lagann", "type-manifest.json"),
    JSON.stringify({
      roles: { display: { family: "Display" }, body: { family: "Body" } },
      quality: { passed: true },
      gates: { passed: true }
    })
  );
  await writeFile(
    path.join(root, ".design-lagann", "asset-manifest.json"),
    JSON.stringify({
      assets: [{
        id: "hero-pastry",
        role: "hero",
        intent: "food",
        implementation: "transparent-raster",
        responsiveBehavior: "Recompose the crop while preserving the pastry edge and headline relationship."
      }]
    })
  );
  await writeFile(
    path.join(root, ".design-lagann", "design-artifacts.json"),
    JSON.stringify({
      projectDna: ".design-lagann/project-design-dna.json",
      assetManifest: ".design-lagann/asset-manifest.json",
      typeManifest: ".design-lagann/type-manifest.json"
    })
  );
  return root;
}

function generatedSubmission(pathname, overrides = {}) {
  return {
    id: "hero-pastry",
    path: pathname,
    kind: "generated-photo",
    status: "generated",
    sourcePrompt: "A separate editorial pastry photograph on a transparent background.",
    provenance: {
      provider: "test-generator",
      generatedAt: "2026-07-24T00:00:00.000Z",
      reportedModel: "test-model"
    },
    width: 1,
    height: 1,
    ...overrides
  };
}

test("bindAssetAcquisition materializes a separate local hash-bound raster", async () => {
  const root = await fixture();
  const relative = "assets/generated/hero-pastry.png";
  await writeFile(path.join(root, relative), ONE_PIXEL_PNG);
  const result = await bindAssetAcquisition({
    projectRoot: root,
    submissions: [generatedSubmission(relative)]
  });
  assert.equal(result.phase, "implementation-required");
  assert.equal(result.receipt.status, "materialized");
  assert.equal(result.receipt.assets[0].localPath, relative);
  assert.equal(
    result.receipt.assets[0].sha256,
    createHash("sha256").update(ONE_PIXEL_PNG).digest("hex")
  );
  assert.equal(result.receipt.assets[0].directionFrame, false);
  const saved = JSON.parse(await readFile(
    path.join(root, ".design-lagann", "asset-acquisition.json"),
    "utf8"
  ));
  assert.equal(saved.allRequiredAssetsMaterialized, true);
});

test("bindAssetAcquisition rejects a concept-frame path", async () => {
  const root = await fixture();
  const relative = ".design-lagann/visual-orientation/hero-pastry.png";
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), ONE_PIXEL_PNG);
  await assert.rejects(
    bindAssetAcquisition({
      projectRoot: root,
      submissions: [generatedSubmission(relative)]
    }),
    /cannot reuse a visual direction frame/i
  );
});

test("bindAssetAcquisition refuses prompt-only or missing required imagery", async () => {
  const root = await fixture();
  await assert.rejects(
    bindAssetAcquisition({
      projectRoot: root,
      submissions: [{
        id: "hero-pastry",
        kind: "generated-photo",
        sourcePrompt: "Prompt without a generated file."
      }]
    }),
    /path is required/i
  );
});
