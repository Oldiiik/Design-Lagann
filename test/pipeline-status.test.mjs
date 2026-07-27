import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PipelineStageOrderError,
  assertPipelineStageAllowed,
  guardPipelineStage,
  inspectPipelineStatus,
  validatePipelineStatus
} from "../packages/orchestrator/src/pipeline-status.mjs";
import { createSitePlan } from "../packages/orchestrator/src/site-plan.mjs";

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-pipeline-"));
}

async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function webpFixture(label) {
  const payload = Buffer.from(label, "utf8");
  const buffer = Buffer.alloc(20 + payload.length);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(12 + payload.length, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8 ", 12, "ascii");
  buffer.writeUInt32LE(payload.length, 16);
  payload.copy(buffer, 20);
  return buffer;
}

async function writeHashedFile(root, relative, buffer) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return {
    target,
    relative: relative.replaceAll("\\", "/"),
    sha256: sha256(buffer)
  };
}

async function writePlanIntake(root, profile = "quality") {
  const brief = {
    goal: "Build a distinctive independent bakery website.",
    executionProfile: profile
  };
  await writeJson(path.join(root, ".design-lagann", "brief.json"), brief);
  await writeJson(path.join(root, ".design-lagann", "adaptive-plan.json"), {
    version: "1.0.0",
    profile,
    acceptancePolicy: "elite-v1"
  });
  await writeJson(
    path.join(root, ".design-lagann", "site-plan.json"),
    createSitePlan(brief, { profile, createdAt: "2026-07-24T09:00:00.000Z" })
  );
}

async function writeDirectionFrames(root) {
  const desktop = await writeHashedFile(
    root,
    ".design-lagann/visual-orientation/frames/crumb-desktop.webp",
    webpFixture("creative-desktop")
  );
  await writeJson(
    path.join(root, ".design-lagann", "visual-orientation", "optimized-plan.json"),
    {
      schemaVersion: "0.5.0",
      kind: "optimized-visual-orientation-plan",
      candidates: [{ id: "crumb-direction" }]
    }
  );
  await writeJson(
    path.join(root, ".design-lagann", "visual-orientation", "optimized-desktop-evidence-binding.json"),
    {
      schemaVersion: "0.5.0",
      kind: "optimized-desktop-evidence-binding",
      candidates: [{
        candidateId: "crumb-direction",
        images: {
          desktop: {
            localPath: desktop.relative,
            sha256: desktop.sha256
          }
        }
      }]
    }
  );
  return { desktop };
}

async function writeSelectedPair(root, desktop) {
  const mobile = await writeHashedFile(
    root,
    ".design-lagann/visual-orientation/frames/crumb-mobile.webp",
    webpFixture("creative-mobile")
  );
  const humanApproval = {
    status: "approved",
    candidateId: "crumb-direction",
    decidedBy: "design owner",
    decidedAt: "2026-07-24T10:00:00.000Z"
  };
  await writeJson(
    path.join(root, ".design-lagann", "visual-orientation", "optimized-selection.json"),
    {
      schemaVersion: "0.5.0",
      kind: "optimized-visual-orientation-selection",
      status: "human-approved",
      selectedCandidateId: "crumb-direction",
      humanApproval
    }
  );
  await writeJson(
    path.join(root, ".design-lagann", "visual-orientation", "selected-visual-reference.json"),
    {
      schemaVersion: "0.5.0",
      kind: "selected-generated-visual-reference",
      status: "human-approved-reference",
      candidateId: "crumb-direction",
      humanApproval,
      pairVerification: {
        status: "independent-pair-critic-approved"
      },
      imageEvidence: {
        role: "creative-reference",
        groundTruth: false,
        desktop: {
          localPath: desktop.relative,
          sha256: desktop.sha256
        },
        mobile: {
          localPath: mobile.relative,
          sha256: mobile.sha256
        }
      },
      acceptanceBoundary: {
        selectedReferenceIsFinalAcceptance: false,
        finalAcceptanceRequiresFreshRenderedBrowserEvidence: true
      }
    }
  );
  return { desktop, mobile };
}

async function writeDesignContract(root) {
  await writeFile(
    path.join(root, "DESIGN.md"),
    `# Soft Crumb design contract

The pastry physically interrupts the editorial headline and directs the reading path.
Every responsive state must preserve that relationship without tracing generated frame pixels.
Typography, asset roles, interaction, accessibility, and section rhythm remain explicit implementation requirements.
`,
    "utf8"
  );
  await writeJson(path.join(root, ".design-lagann", "project-design-dna.json"), {
    creativeThesis: "The pastry interrupts the order slip and becomes the page's reading hinge."
  });
  await writeJson(path.join(root, ".design-lagann", "type-manifest.json"), {
    roles: {
      display: { family: "Fraunces" },
      body: { family: "Source Sans 3" }
    },
    quality: { passed: true, score: 9 },
    gates: { passed: true }
  });
  await writeJson(path.join(root, ".design-lagann", "asset-manifest.json"), {
    version: "0.5.0",
    assets: [{
      id: "hero-pastry",
      role: "hero-object",
      intent: "food",
      implementation: "transparent-raster",
      provenance: { sourceType: "generated" }
    }]
  });
  await writeJson(path.join(root, ".design-lagann", "design-artifacts.json"), {
    version: "0.5.0",
    projectDna: ".design-lagann/project-design-dna.json",
    assetManifest: ".design-lagann/asset-manifest.json",
    typeManifest: ".design-lagann/type-manifest.json"
  });
}

async function writeRealAsset(root) {
  const image = await writeHashedFile(
    root,
    "public/assets/hero-pastry.webp",
    webpFixture("real-project-pastry")
  );
  await writeJson(path.join(root, ".design-lagann", "asset-acquisition.json"), {
    version: "0.5.0",
    assets: [{
      id: "hero-pastry",
      kind: "generated-raster",
      status: "approved",
      path: image.relative,
      sha256: image.sha256,
      provenance: {
        provider: "fixture image provider",
        model: "fixture-image-model",
        generationId: "pastry-1"
      }
    }]
  });
  return image;
}

async function writeImplementation(root) {
  await writeFile(
    path.join(root, "index.html"),
    `<!doctype html>
<html lang="en">
  <head><style>body { margin: 0; background: #f4d7c7; } main { display: grid; min-height: 100vh; }</style></head>
  <body><main><h1>Soft Crumb</h1><button type="button">Reserve a pastry</button></main></body>
</html>
`,
    "utf8"
  );
}

async function writeScreenshots(root, run, stage) {
  const captures = [];
  for (const viewport of ["desktop", "tablet", "mobile"]) {
    const label = Buffer.from(`${stage}-${viewport}`, "utf8");
    const screenshot = Buffer.alloc(24 + label.length);
    Buffer.from("89504e470d0a1a0a", "hex").copy(screenshot, 0);
    screenshot.writeUInt32BE(13, 8);
    screenshot.write("IHDR", 12, "ascii");
    screenshot.writeUInt32BE(viewport === "mobile" ? 390 : viewport === "tablet" ? 1024 : 1440, 16);
    screenshot.writeUInt32BE(viewport === "mobile" ? 844 : viewport === "tablet" ? 900 : 1000, 20);
    label.copy(screenshot, 24);
    const file = await writeHashedFile(
      root,
      `.design-lagann/reviews/${run}/screenshots/${stage}/app/${viewport}.png`,
      screenshot
    );
    captures.push({
      name: viewport,
      screenshot: file.target,
      capturedAt: "2026-07-24T11:00:00.000Z"
    });
  }
  return {
    version: "0.5.0",
    id: "app",
    url: "http://127.0.0.1:4173/",
    captures
  };
}

async function writeAcceptedReview(root) {
  const run = "2026-07-24T11-00-00-000Z";
  const runDir = path.join(root, ".design-lagann", "reviews", run);
  const beforeCapture = await writeScreenshots(root, run, "before");
  const afterCapture = await writeScreenshots(root, run, "after");
  const before = {
    capture: beforeCapture,
    reports: [{ critic: "independent-whole-page-critic" }],
    vision: { report: path.join(runDir, "vision-report-before.json") },
    qualityGate: { passed: false }
  };
  const after = {
    capture: afterCapture,
    reports: [{ critic: "independent-whole-page-critic" }],
    vision: { report: path.join(runDir, "vision-report-after.json") },
    qualityGate: { passed: true },
    findings: []
  };
  const comparison = { evidenceComplete: true, passed: true, scoreDelta: 1.2 };
  const verification = { passed: true, checks: [{ kind: "accessibility", passed: true }] };
  const review = {
    version: "0.5.0",
    phase: "accepted",
    verdict: "accepted",
    acceptancePolicy: "elite-v1",
    before,
    after,
    agent: {
      modifiedFiles: ["index.html"],
      sourceDigest: "a".repeat(64)
    },
    comparison,
    verification,
    stopping: { passed: true, failures: [] }
  };
  await Promise.all([
    writeJson(path.join(runDir, "critique-before.json"), before),
    writeJson(path.join(runDir, "repair-plan.json"), [{ id: "hero-hierarchy" }]),
    writeJson(path.join(runDir, "regional-repair-plan.json"), {
      repairs: [{ id: "hero-hierarchy", files: ["index.html"] }]
    }),
    writeJson(path.join(runDir, "critique-after.json"), after),
    writeJson(path.join(runDir, "comparison.json"), comparison),
    writeJson(path.join(runDir, "verification.json"), verification),
    writeJson(path.join(runDir, "review.json"), review),
    writeJson(path.join(runDir, "vision-report-before.json"), { verdict: "repair" }),
    writeJson(path.join(runDir, "vision-report-after.json"), { verdict: "accept" })
  ]);
}

test("shows active mode and refuses to call a direction-frame-only run implementation-ready", async () => {
  const root = await temporaryProject();
  await writePlanIntake(root, "quality");
  await writeDirectionFrames(root);

  const status = await inspectPipelineStatus(root, {
    generatedAt: "2026-07-24T12:00:00.000Z"
  });
  assert.equal(status.mode.profile, "quality");
  assert.equal(status.mode.label, "QUALITY");
  assert.equal(status.mode.isSuperQuality, true);
  assert.equal(status.mode.banner, "DESIGN LAGANN MODE: QUALITY");
  assert.equal(status.runClassification, "creative-reference-only");
  assert.equal(status.readiness.implementation, false);
  assert.equal(status.current.id, "approved-selected-pair");
  assert.equal(status.next.id, "design-contract");
  assert.deepEqual(status.completed, ["plan-intake", "direction-frames"]);
  assert.ok(
    status.stages
      .find((stage) => stage.id === "direction-frames")
      .evidence
      .filter((item) => item.kind === "direction-frame")
      .every((item) => item.referenceOnly === true)
  );
  assert.equal(validatePipelineStatus(status), status);

  assert.throws(
    () => assertPipelineStageAllowed(status, "implementation"),
    (error) => (
      error instanceof PipelineStageOrderError &&
      error.code === "DESIGN_LAGANN_PIPELINE_STAGE_ORDER" &&
      error.details.currentStage === "approved-selected-pair"
    )
  );
  assert.equal(
    (await guardPipelineStage({
      projectRoot: root,
      requestedStage: "selected-pair"
    })).allowed,
    true
  );
});

test("a concept frame cannot masquerade as an acquired project photo", async () => {
  const root = await temporaryProject();
  await writePlanIntake(root, "balanced");
  const frames = await writeDirectionFrames(root);
  await writeSelectedPair(root, frames.desktop);
  await writeDesignContract(root);
  await writeImplementation(root);
  await writeJson(path.join(root, ".design-lagann", "asset-acquisition.json"), {
    assets: [{
      id: "hero-pastry",
      kind: "generated-raster",
      status: "approved",
      path: frames.desktop.relative,
      sha256: frames.desktop.sha256,
      provenance: { provider: "fixture" }
    }]
  });

  const status = await inspectPipelineStatus(root);
  const assets = status.stages.find((stage) => stage.id === "asset-acquisition");
  const implementation = status.stages.find((stage) => stage.id === "implementation-source");
  assert.equal(status.current.id, "asset-acquisition");
  assert.equal(assets.status, "current");
  assert.equal(assets.evidenceComplete, false);
  assert.ok(assets.missing.some((item) => item.code === "CONCEPT_FRAME_NOT_PROJECT_ASSET"));
  assert.equal(implementation.status, "blocked");
  assert.equal(implementation.evidenceComplete, true, "source exists but strict stage order still blocks it");
  assert.equal(status.readiness.implementation, false);
  await assert.rejects(
    inspectPipelineStatus(root, { requestedStage: "implementation-source" }),
    /blocked by strict pipeline order/i
  );
});

test("implementation source hard-blocks files, markup, references, data payloads, and libraries that render SVG", async () => {
  const root = await temporaryProject();
  await writePlanIntake(root, "quality");
  const frames = await writeDirectionFrames(root);
  await writeSelectedPair(root, frames.desktop);
  await writeDesignContract(root);
  await writeRealAsset(root);
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "public"), { recursive: true });
  await writeFile(
    path.join(root, "index.html"),
    `<!doctype html>
<html lang="en">
  <head><style>body { margin: 0; } .mark { background-image: url("/route.svg"); }</style></head>
  <body>
    <main>
      <svg viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>
      <img alt="" src="data:image/svg+xml,%3Csvg/%3E">
      <h1>Soft Crumb</h1>
    </main>
  </body>
</html>
`,
    "utf8"
  );
  await writeFile(
    path.join(root, "src", "icons.js"),
    `import { ArrowRight } from "lucide";
export const icon = ArrowRight;
export const vector = document.createElementNS("http://www.w3.org/2000/svg", "svg");
export const chartOptions = { renderer: "svg" };
`,
    "utf8"
  );
  await writeFile(path.join(root, "public", "route.svg"), "<svg/>", "utf8");

  const status = await inspectPipelineStatus(root);
  const implementation = status.stages.find((stage) => stage.id === "implementation-source");
  const codes = new Set(implementation.missing.map((item) => item.code));

  assert.equal(status.current.id, "implementation-source");
  assert.equal(implementation.evidenceComplete, false);
  assert.ok(codes.has("SVG_FILE_FORBIDDEN"));
  assert.ok(codes.has("INLINE_SVG_FORBIDDEN"));
  assert.ok(codes.has("SVG_DATA_URI_FORBIDDEN"));
  assert.ok(codes.has("SVG_REFERENCE_FORBIDDEN"));
  assert.ok(codes.has("SVG_ICON_RENDERER_FORBIDDEN"));
  assert.ok(codes.has("SVG_DOM_CONSTRUCTION_FORBIDDEN"));
  assert.ok(codes.has("SVG_RENDERER_CONFIG_FORBIDDEN"));
  assert.equal(status.readiness.implementationEvidence, false);
});

test("real hash-bound assets, source, rendered critique, repair, and final proof complete the pipeline", async () => {
  const root = await temporaryProject();
  await writePlanIntake(root, "fast");
  const frames = await writeDirectionFrames(root);
  await writeSelectedPair(root, frames.desktop);
  await writeDesignContract(root);
  const realAsset = await writeRealAsset(root);
  await writeImplementation(root);
  await writeAcceptedReview(root);

  const status = await inspectPipelineStatus(root, {
    generatedAt: "2026-07-24T12:30:00.000Z"
  });
  assert.equal(status.mode.profile, "fast");
  assert.equal(status.mode.isSuperQuality, false);
  assert.match(status.mode.statement, /elite-v1 final quality bar is unchanged/i);
  assert.equal(status.verdict, "accepted");
  assert.equal(status.runClassification, "accepted-implementation");
  assert.equal(status.current, null);
  assert.equal(status.next, null);
  assert.equal(status.readiness.implementation, true);
  assert.equal(status.readiness.implementationEvidence, true);
  assert.equal(status.readiness.finalAcceptance, true);
  assert.ok(status.stages.every((stage) => stage.status === "completed"));
  const assetEvidence = status.stages
    .find((stage) => stage.id === "asset-acquisition")
    .evidence
    .find((item) => item.kind === "project-raster-asset");
  assert.equal(assetEvidence.path, realAsset.relative);
  assert.equal(assetEvidence.referenceOnly, false);
  assert.equal(assetEvidence.valid, true);
  assert.equal(
    status.stages
      .find((stage) => stage.id === "final-proof")
      .evidence
      .filter((item) => item.kind === "browser-rendered-screenshot")
      .length,
    3
  );
  assert.equal(assertPipelineStageAllowed(status, "final").id, "final-proof");
});
