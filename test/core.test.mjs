import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { inspectRepository } from "../packages/orchestrator/src/inspect.mjs";
import { initializeProject } from "../packages/orchestrator/src/index.mjs";
import { detectReviewTarget, reviewProject } from "../packages/orchestrator/src/review.mjs";
import { NativeDesignDnaProvider } from "../packages/design-dna-adapter/src/index.mjs";
import { NativeImpeccableProvider, StaticImpeccableCritic } from "../packages/impeccable-adapter/src/index.mjs";
import { compareReports, evaluateArtDirection, mergeCritiques, planRepair } from "../packages/visual-evaluator/src/index.mjs";
import { ART_DIRECTION_DIMENSIONS, scoreVisionReport, validateVisionReport } from "../packages/schemas/src/index.mjs";
import { handleRequest } from "../packages/mcp-server/src/server.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function temporaryProject() {
  return mkdtemp(path.join(os.tmpdir(), "design-lagann-"));
}

function captureFixture() {
  const styles = [
    { color: "rgb(20, 30, 25)", backgroundColor: "rgb(255, 255, 255)", fontFamily: "Inter", fontSize: "16px", borderRadius: "8px", borderColor: "rgb(220, 225, 220)", boxShadow: "none", gap: "16px" },
    { color: "rgb(20, 30, 25)", backgroundColor: "rgb(255, 255, 255)", fontFamily: "Inter", fontSize: "32px", borderRadius: "0px", borderColor: "rgb(220, 225, 220)", boxShadow: "none", gap: "24px" }
  ];
  return {
    id: "fixture",
    url: "https://example.com/",
    captures: [{
      name: "desktop",
      viewport: { width: 1440, height: 1000 },
      evidence: { title: "Fixture", landmarks: { headings: 2, sections: 4 }, scroll: { height: 3200 }, styles }
    }]
  };
}

const visionRubricIds = [
  "visual-orientation",
  "anti-ai-patterns",
  "asset-and-type-direction",
  "art-direction",
  "whole-page",
  "responsive",
  "design-dna-consistency",
  "material-discipline",
  "conversion",
  "memorability"
];

function visionFinding(overrides = {}) {
  return {
    id: "generic-composition",
    fingerprint: "composition:generic-focal-relationship",
    category: "composition",
    severity: 2,
    blocker: true,
    repairKind: "structural",
    message: "The focal relationship is generic.",
    evidence: "The headline and object occupy disconnected columns.",
    impact: "The opening can be relabeled for another brand.",
    rootCause: "The object does not define the layout geometry.",
    recommendation: "Recompose type, object, and action as one spatial sentence.",
    successCriterion: "The object visibly anchors or interrupts the type axis.",
    forbiddenFixes: ["Do not add glow, shadow, blur, or another panel."],
    viewport: "desktop",
    region: "hero",
    ...overrides
  };
}

function visionReport({ score = 9.2, verdict = "accept", stage = "after", findings = [], ai = 0.1, confidence = 0.92 } = {}) {
  const screenshotHash = stage === "before" ? "a".repeat(64) : "b".repeat(64);
  return {
    schemaVersion: "0.4.0",
    evidence: {
      requestId: `${stage}-request`,
      stage,
      screenshots: [{ viewport: "desktop", sha256: screenshotHash }]
    },
    provenance: {
      critic: "independent-art-director",
      model: "fixture-vision-model",
      generatedAt: "2026-07-23T10:00:00.000Z",
      independentOfRepair: true
    },
    confidence,
    verdict,
    rubricCoverage: visionRubricIds.map((id) => ({
      id,
      score: Math.min(4, score / 2.5),
      gatesPassed: !findings.some((finding) => finding.blocker),
      evidence: `${id} was assessed across the supplied screenshot set.`
    })),
    scorecard: Object.fromEntries(ART_DIRECTION_DIMENSIONS.map((dimension) => [
      dimension.id,
      {
        score,
        evidence: `${dimension.id} has specific visible proof in the focal relationship.`,
        blocker: false
      }
    ])),
    thesis: {
      statement: "The product object physically directs the reading path.",
      visibleProof: ["The object interrupts and anchors the headline axis."],
      contradictions: []
    },
    aiLikelihood: { score: ai, tells: ai > 0.3 ? ["replaceable split hero"] : [] },
    memoryHook: "The object cutting through the headline.",
    strongestMoment: "The opening type/object lockup.",
    weakestMoment: "The quiet information transition.",
    structuralBlockers: findings.filter((finding) => finding.blocker).map((finding) => finding.id),
    findings
  };
}

test("repository inspection detects stack and assets", async () => {
  const project = await temporaryProject();
  await mkdir(path.join(project, "src"), { recursive: true });
  await writeFile(path.join(project, "package.json"), JSON.stringify({ dependencies: { react: "19.0.0", vite: "7.0.0", tailwindcss: "4.0.0" }, scripts: { dev: "vite" } }));
  await writeFile(path.join(project, "src", "app.css"), ":root { color: black; }");
  await writeFile(path.join(project, "src", "logo.svg"), "<svg/>");
  const report = await inspectRepository(project);
  assert.equal(report.framework, "Vite");
  assert.ok(report.styling.includes("Tailwind CSS"));
  assert.deepEqual(report.assets, ["src/logo.svg"]);
});

test("initialization writes durable state artifacts", async () => {
  const project = await temporaryProject();
  const result = await initializeProject({ projectRoot: project, brief: { goal: "Build a focused product interface.", references: [] } });
  assert.equal(result.brief.goal, "Build a focused product interface.");
  assert.equal(JSON.parse(await readFile(path.join(project, ".design-lagann", "brief.json"), "utf8")).mode, "balanced");
});

test("Design DNA extraction labels computed and inferred evidence", async () => {
  const provider = new NativeDesignDnaProvider();
  const dna = await provider.extract({ capture: captureFixture(), role: "typography and rhythm" });
  assert.equal(dna.system.colors.confidence, "computed");
  assert.equal(dna.confidence.style, "computed");
  assert.equal(dna.style.composition.confidence, "computed");
  const project = await provider.synthesize([dna], { goal: "Build an original editorial product page." });
  assert.match(project.creativeIdea, /original editorial product page/i);
  assert.equal(project.version, "0.4.0");
  assert.equal(project.compositionRules.length, 3);
  assert.equal(project.motionRules.length, 3);
  assert.ok(project.palette.foundation);
  assert.ok(project.originalityRules.length >= 3);
  assert.equal(project.directionCandidates.length, 3);
  assert.match(project.creativeDirection.signatureMoment.mechanism, /one composition/i);
});

test("Design DNA carries a vision-classified typography reference into synthesis", async () => {
  const provider = new NativeDesignDnaProvider();
  const referenceContract = {
    required: true,
    roles: {
      display: { familyClass: "serif", strokeContrast: "high", width: "compact" },
      body: { familyClass: "serif", strokeContrast: "medium", width: "normal" },
      utility: { familyClass: "sans", case: "uppercase" },
      data: { familyClass: "serif" }
    },
    headline: {
      text: "The journey written in ink.",
      authoredLines: { desktop: ["The journey", "written in ink."] }
    }
  };
  const dna = await provider.extract({
    capture: captureFixture(),
    role: "typography and rhythm",
    vision: { typography: { referenceContract } }
  });
  assert.deepEqual(dna.system.typography.value.referenceContract, referenceContract);
  const project = await provider.synthesize(
    [dna],
    { goal: "Build an editorial journey.", references: [] }
  );
  assert.deepEqual(project.referenceTypography, referenceContract);
  assert.match(project.creativeDirection.typographyDirection, /family class/i);
});

test("Impeccable adapter detects anti-patterns and missing reduced motion", async () => {
  const project = await temporaryProject();
  await writeFile(path.join(project, "bad.css"), ".title{background-clip:text;animation:fade 1s}.card{border-radius:40px;z-index:9999}");
  const report = await new NativeImpeccableProvider().analyze({ projectRoot: project });
  const ids = report.findings.map((item) => item.id);
  assert.ok(ids.some((id) => id.startsWith("gradient-text")));
  assert.ok(ids.some((id) => id.startsWith("over-rounded")));
  assert.ok(ids.includes("missing-reduced-motion"));
  const honest = await new StaticImpeccableCritic().analyze({ projectRoot: project });
  assert.equal(honest.capability, "static anti-pattern scan");
  assert.match(honest.limitation, /does not judge whole-page/i);
});

test("structural findings are repaired before decorative polish", () => {
  const reports = [{ findings: [
    { id: "a", critic: "responsive", category: "responsive", severity: 2, message: "Horizontal overflow", evidence: "390px" },
    { ...visionFinding(), critic: "vision" },
    { id: "b", critic: "impeccable", category: "decoration", severity: 1, message: "Decorative stripes", evidence: "CSS pattern" }
  ] }];
  const merged = mergeCritiques(reports);
  assert.equal(merged[0].category, "responsive");
  const repair = planRepair(merged, 3);
  assert.equal(repair.length, 2);
  assert.ok(repair.every((item) => item.category !== "decoration"));
  assert.match(repair.find((item) => item.category === "composition").forbiddenFixes[0], /glow/i);
  const comparison = compareReports({ findings: merged }, { findings: [] });
  assert.equal(comparison.passed, false);
  assert.match(comparison.claim, /fewer findings alone/i);
  const renamed = compareReports(
    { findings: [visionFinding({ id: "before-id" })] },
    { findings: [visionFinding({ id: "after-id" })] }
  );
  assert.deepEqual(renamed.resolved, []);
  assert.deepEqual(renamed.introduced, []);
});

test("vision reports are strict, screenshot-bound, and provenance-bearing", () => {
  const report = visionReport();
  assert.equal(validateVisionReport(report), report);
  assert.throws(
    () => validateVisionReport({ ...report, evidence: { ...report.evidence, requestId: "stale" } }, {
      requestId: "after-request",
      stage: "after",
      screenshots: [{ viewport: "desktop", sha256: "b".repeat(64) }],
      rubricIds: visionRubricIds
    }),
    /requestId does not match/
  );
  assert.throws(
    () => validateVisionReport(report, {
      requestId: "after-request",
      stage: "after",
      screenshots: [{
        viewport: "desktop",
        sha256: "b".repeat(64),
        capturedAt: "2026-07-23T10:01:00.000Z"
      }],
      rubricIds: visionRubricIds
    }),
    /predates the screenshots/
  );
  assert.throws(() => validateVisionReport({ findings: [] }), /schemaVersion/);
});

test("art-direction gate rejects polished generic work and accepts a qualified report", () => {
  const qualified = evaluateArtDirection(visionReport(), "quality");
  assert.equal(qualified.passed, true);
  const generic = evaluateArtDirection(visionReport({ score: 7.5, verdict: "repair", ai: 0.7 }), "quality");
  assert.equal(generic.passed, false);
  assert.ok(generic.failures.some((failure) => /AI-template likelihood/.test(failure)));
});

test("comparison requires absolute quality and non-regressive improvement", () => {
  const beforeFinding = visionFinding();
  const before = scoreVisionReport(visionReport({
    score: 7.4,
    verdict: "repair",
    stage: "before",
    findings: [beforeFinding],
    ai: 0.48
  }));
  const after = scoreVisionReport(visionReport());
  const comparison = compareReports(
    { findings: [beforeFinding], artDirection: before, mode: "quality" },
    { findings: [], artDirection: after, mode: "quality" },
    { mode: "quality" }
  );
  assert.equal(comparison.passed, true);
  assert.ok(comparison.scoreDelta > 1);
  const worseAfter = scoreVisionReport(visionReport({
    score: 6.8,
    verdict: "repair",
    ai: 0.5
  }));
  const regressed = compareReports(
    { findings: [beforeFinding], artDirection: before, mode: "quality" },
    { findings: [], artDirection: worseAfter, mode: "quality" },
    { mode: "quality" }
  );
  assert.equal(regressed.passed, false);
  assert.ok(regressed.scoreDelta < 0);
});

test("MCP server exposes bounded orchestration tools", async () => {
  const response = await handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const names = response.result.tools.map((tool) => tool.name);
  assert.ok(names.includes("extract_design_dna"));
  assert.ok(names.includes("critique_project"));
  assert.ok(names.includes("review_project"));
  assert.ok(names.includes("compare_reports"));
  assert.ok(names.includes("plan_adaptive_workflow"));
  assert.ok(names.includes("cache_reference"));
  assert.ok(names.includes("capture_repair_regions"));
  assert.ok(names.includes("create_optimized_visual_orientation_plan"));
  const initialized = await handleRequest({ jsonrpc: "2.0", id: 2, method: "initialize", params: {} });
  assert.equal(initialized.result.serverInfo.version, "1.0.0");
});

test("review target detection supports package scripts and static sites", async () => {
  const scripted = await temporaryProject();
  await writeFile(path.join(scripted, "package.json"), JSON.stringify({
    dependencies: { vite: "7.0.0" },
    scripts: { dev: "vite --port 4310" }
  }));
  const dev = await detectReviewTarget(scripted);
  assert.equal(dev.kind, "dev-command");
  assert.equal(dev.expectedUrl, "http://127.0.0.1:4310/");
  assert.equal(dev.confidence, "computed");

  const staticProject = await temporaryProject();
  await writeFile(path.join(staticProject, "index.html"), "<!doctype html><title>Static</title>");
  const staticTarget = await detectReviewTarget(staticProject);
  assert.equal(staticTarget.kind, "static");
});

test("resumed reviews reject source changes after the captured after-state", async () => {
  const project = await temporaryProject();
  await writeFile(path.join(project, "index.html"), "<!doctype html><title>Changed</title>");
  const runDir = path.join(project, ".design-lagann", "reviews", "resume-fixture");
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "review.json"), JSON.stringify({
    before: { capture: { captures: [] } },
    after: { capture: { captures: [] } },
    agent: { sourceDigest: "0".repeat(64) }
  }));
  await assert.rejects(
    reviewProject({
      projectRoot: project,
      resumeRun: "resume-fixture",
      afterVisionReport: path.join(project, "after.json")
    }),
    /changed after the captured after-state/
  );
});

test("CLI help is executable", async () => {
  const { stdout } = await execFileAsync(process.execPath, [path.join(root, "apps", "cli", "src", "cli.mjs"), "help"]);
  assert.match(stdout, /Design Lagann 1\.0\.0/);
  assert.match(stdout, /extract-dna/);
  assert.match(stdout, /capture-regions/);
  assert.match(stdout, /orientation-opt-finalize/);
  assert.match(stdout, /review/);
});

test("CLI welcomes first-time users when no command is provided", async () => {
  const { stdout } = await execFileAsync(process.execPath, [path.join(root, "apps", "cli", "src", "cli.mjs")]);
  assert.match(stdout, /Welcome to Design Lagann/i);
  assert.match(stdout, /without losing approved work/i);
  assert.match(stdout, /design-lagann run --project <root> --brief <brief\.json>/);
  assert.doesNotMatch(stdout, /strict pipeline|unverified|blocker/i);
});
