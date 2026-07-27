import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { captureUrl, DEFAULT_VIEWPORTS } from "../../browser/src/index.mjs";
import { StaticImpeccableCritic } from "../../impeccable-adapter/src/index.mjs";
import { analyzeCaptureVisuals, compareReports, mergeCritiques, planRepair, stoppingConditions } from "../../visual-evaluator/src/index.mjs";
import { exists, readJson, walk, writeJson } from "../../shared/src/index.mjs";
import { validateVisionReport } from "../../schemas/src/index.mjs";
import { inspectRepository } from "./inspect.mjs";
import { inspectPipelineStatus } from "./pipeline-status.mjs";
import {
  ELITE_QUALITY_CONTRACT,
  ELITE_QUALITY_CONTRACT_DIGEST,
  createAdaptivePlan,
  createCriticTriage,
  createRegionalRepairPlan,
  normalizeWorkflowProfile,
  recommendProfileEscalation,
  summarizeRunTelemetry
} from "./adaptive.mjs";

const REVIEWABLE = /\.(css|scss|sass|less|html|mjs|cjs|js|jsx|ts|tsx|vue|svelte|astro)$/i;
const RUBRIC_IDS = [
  "evidence-gate",
  "direction-evidence",
  "visual-orientation",
  "asset-and-type-direction",
  "anti-ai-patterns",
  "art-direction",
  "whole-page",
  "responsive",
  "design-dna-consistency",
  "material-discipline",
  "conversion",
  "memorability",
  "impeccable"
];
const RUBRIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../rubrics");

async function loadRubrics() {
  return Promise.all(RUBRIC_IDS.map((id) => readJson(path.join(RUBRIC_ROOT, `${id}.json`))));
}

function commandFor(packageManager, script) {
  if (packageManager === "pnpm") return { command: "pnpm", args: ["run", script] };
  if (packageManager === "yarn") return { command: "yarn", args: [script] };
  if (packageManager === "bun") return { command: "bun", args: ["run", script] };
  return { command: "npm", args: ["run", script] };
}

function portFromScript(script) {
  const match = String(script || "").match(/(?:--port(?:=|\s+)|-p\s+)(\d{2,5})/);
  return match ? Number(match[1]) : null;
}

export async function detectReviewTarget(projectRoot, repository = null) {
  const root = path.resolve(projectRoot);
  const report = repository || await inspectRepository(root);
  const scriptName = ["dev", "start", "serve", "preview"].find((name) => report.scripts?.[name]);
  if (scriptName) {
    const selected = commandFor(report.packageManager, scriptName);
    const port = portFromScript(report.scripts[scriptName]) ||
      (scriptName === "preview" ? 4173 : report.framework === "Vite" ? 5173 : report.framework === "Astro" ? 4321 : 3000);
    return {
      kind: "dev-command",
      ...selected,
      script: scriptName,
      cwd: root,
      expectedUrl: `http://127.0.0.1:${port}/`,
      confidence: portFromScript(report.scripts[scriptName]) ? "computed" : "inferred"
    };
  }
  if (await exists(path.join(root, "index.html"))) {
    return { kind: "static", cwd: root, entry: "index.html", confidence: "exact" };
  }
  throw new Error("Could not detect a dev command or root index.html. Pass --url to review an already running app.");
}

async function waitForHttp(url, child, timeoutMs = 45_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    if (child && child.exitCode !== null) throw new Error(`Dev command exited before ${url} became reachable.`);
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.ok || response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

function mimeFor(target) {
  const extension = path.extname(target).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".woff2": "font/woff2"
  })[extension] || "application/octet-stream";
}

async function startStaticServer(root) {
  const server = createServer(async (request, response) => {
    try {
      const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
      const target = path.resolve(root, relative);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      response.writeHead(200, { "content-type": mimeFor(target) });
      response.end(await readFile(target));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/`,
    stop: () => new Promise((resolve) => server.close(resolve)),
    output: []
  };
}

async function startDevCommand(target) {
  const output = [];
  const child = spawn(target.command, target.args, {
    cwd: target.cwd,
    shell: process.platform === "win32",
    windowsHide: true,
    env: { ...process.env, BROWSER: "none", HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let discoveredUrl = null;
  const collect = (chunk) => {
    const text = chunk.toString();
    output.push(text);
    const match = text.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/\S*)?/);
    if (match) discoveredUrl = match[0].replace("localhost", "127.0.0.1");
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const candidates = [target.expectedUrl];
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    const url = discoveredUrl || candidates[0];
    try {
      await waitForHttp(url, child, 1_200);
      return {
        url,
        output,
        stop: async () => {
          if (child.exitCode === null) {
            child.kill();
            await new Promise((resolve) => {
              child.once("exit", resolve);
              setTimeout(resolve, 2_000);
            });
          }
        }
      };
    } catch (error) {
      if (child.exitCode !== null) throw new Error(`Dev command failed:\n${output.join("").slice(-3000)}`);
    }
  }
  child.kill();
  throw new Error(`Dev server did not become reachable. Output:\n${output.join("").slice(-3000)}`);
}

async function startReviewTarget(projectRoot, explicitUrl, repository) {
  if (explicitUrl) {
    await waitForHttp(explicitUrl, null, 10_000);
    return { url: explicitUrl, output: [], stop: async () => {} };
  }
  const target = await detectReviewTarget(projectRoot, repository);
  return target.kind === "static" ? startStaticServer(target.cwd) : startDevCommand(target);
}

async function runShellCommand(command, cwd, environment, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ code, stdout, stderr });
      else reject(new Error(`Command failed (${code}): ${command}\n${stderr || stdout}`));
    });
  });
}

async function fileSnapshot(root) {
  const entries = [];
  for (const file of (await walk(root)).filter((target) => REVIEWABLE.test(target) && !target.includes(`${path.sep}.design-lagann${path.sep}`))) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    entries.push([relative, hash]);
  }
  return new Map(entries);
}

function changedFiles(before, after) {
  const files = new Set([...before.keys(), ...after.keys()]);
  return [...files].filter((file) => before.get(file) !== after.get(file)).sort();
}

function snapshotDigest(snapshot) {
  return createHash("sha256")
    .update(JSON.stringify([...snapshot.entries()].sort(([left], [right]) => left.localeCompare(right))))
    .digest("hex");
}

async function candidateFiles(projectRoot) {
  const files = (await walk(projectRoot))
    .map((file) => path.relative(projectRoot, file).replaceAll("\\", "/"))
    .filter((file) => REVIEWABLE.test(file) && !file.startsWith(".design-lagann/"));
  const styles = files.filter((file) => /\.(css|scss|sass|less)$/.test(file));
  const views = files.filter((file) => /\.(html|jsx|tsx|vue|svelte|astro)$/.test(file));
  return { styles, views };
}

async function createRepairPlan(projectRoot, findings) {
  const candidates = await candidateFiles(projectRoot);
  const enriched = findings.map((finding) => {
    if (finding.file || finding.files?.length) return finding;
    const files =
      ["typography", "decoration", "direction", "component"].includes(finding.category)
        ? candidates.styles.slice(0, 3)
        : [...candidates.views.slice(0, 2), ...candidates.styles.slice(0, 2)];
    return { ...finding, files };
  });
  return planRepair(enriched, 3);
}

async function optionalJson(target) {
  return await exists(target) ? readJson(target) : null;
}

async function loadReviewContext(projectRoot) {
  const stateDir = path.join(projectRoot, ".design-lagann");
  const [brief, projectDna, adaptivePlan, assetManifest, typeManifest] = await Promise.all([
    optionalJson(path.join(stateDir, "brief.json")),
    optionalJson(path.join(stateDir, "project-design-dna.json")),
    optionalJson(path.join(stateDir, "adaptive-plan.json")),
    optionalJson(path.join(stateDir, "asset-manifest.json")),
    optionalJson(path.join(stateDir, "type-manifest.json"))
  ]);
  const missing = [];
  if (!brief?.goal) missing.push(".design-lagann/brief.json with a concrete goal");
  for (const key of ["audience", "primaryAction", "desiredRecall"]) {
    if (!brief?.[key]) missing.push(`brief.${key}`);
  }
  if (!Array.isArray(brief?.brandTruths) || !brief.brandTruths.length) missing.push("brief.brandTruths");
  if (!Array.isArray(brief?.forbiddenPatterns)) missing.push("brief.forbiddenPatterns");
  const requiredDirection = [
    "thesis",
    "designArgument",
    "desiredRecall",
    "signatureMoment",
    "compositionGrammar",
    "materialContract",
    "antiPatterns",
    "killCriteria"
  ];
  for (const key of requiredDirection) {
    if (!projectDna?.creativeDirection?.[key]) missing.push(`projectDesignDna.creativeDirection.${key}`);
  }
  if (!typeManifest?.gates?.passed || !typeManifest?.roles) {
    missing.push(".design-lagann/type-manifest.json with a qualified reference-aware type contract");
  }
  const requiredRasterAssets = (assetManifest?.assets || []).filter((asset) => (
    asset?.implementation === "transparent-raster" ||
    asset?.medium === "transparent-raster"
  ));
  let assetMaterialization = null;
  if (requiredRasterAssets.length) {
    const pipelineStatus = await inspectPipelineStatus(projectRoot);
    assetMaterialization = pipelineStatus.stages.find((stage) => stage.id === "asset-acquisition");
    if (assetMaterialization?.evidenceComplete !== true) {
      missing.push(
        `materialized production assets: ${assetMaterialization?.missing?.map((item) => item.message).join("; ") || "asset acquisition proof is missing"}`
      );
    }
  }
  return {
    brief,
    projectDna,
    adaptivePlan,
    assetManifest,
    typeManifest,
    assetMaterialization,
    ready: missing.length === 0,
    missing
  };
}

async function hashedScreenshots(capture) {
  return Promise.all(capture.captures.map(async (item) => ({
    viewport: item.name,
    path: item.screenshot,
    width: item.viewport.width,
    height: item.viewport.height,
    capturedAt: item.capturedAt,
    sha256: createHash("sha256").update(await readFile(item.screenshot)).digest("hex")
  })));
}

async function visionRequest(capture, stage, context) {
  const screenshots = await hashedScreenshots(capture);
  const rubricSuite = await loadRubrics();
  const directionTrack = context.adaptivePlan?.directionEvidence?.track || "exploratory-orientation";
  const rubrics = rubricSuite.filter((rubric) => {
    if (["evidence-gate", "impeccable"].includes(rubric.id)) return false;
    if (rubric.id === "visual-orientation" && directionTrack !== "exploratory-orientation") return false;
    return true;
  });
  const requestId = createHash("sha256").update(JSON.stringify({
    stage,
    screenshots: screenshots.map(({ viewport, sha256 }) => ({ viewport, sha256 })),
    brief: context.brief,
    projectDna: context.projectDna,
    rubrics
  })).digest("hex");
  return {
    schemaVersion: "0.4.0",
    requestId,
    rubricIds: rubrics.map((rubric) => rubric.id),
    stage,
    instruction: [
      "Judge the screenshots as authored visual communication, not as a defect checklist.",
      "Test whether one brief-specific creative thesis is visibly legible, whether the composition could belong to 500 unrelated AI landing pages, and what a viewer would remember five minutes later.",
      "Prioritize composition, focal relationships, object-layout integration, narrative rhythm, section transitions, typography/imagery direction, and responsive recomposition before effects.",
      "Treat glow, blur, shadow, radius, floating panels, and motion as invalid substitutes for structural direction.",
      "Use only visible screenshot evidence. Do not infer quality from source code and do not award points for the absence of findings.",
      "Return every required field exactly. A malformed, stale, or screenshot-mismatched report is rejected."
    ].join(" "),
    context: {
      brief: context.brief,
      creativeDirection: context.projectDna?.creativeDirection || null,
      creativeThesis: context.projectDna?.creativeThesis || null,
      originalityRules: context.projectDna?.originalityRules || [],
      forbiddenPatterns: context.brief?.forbiddenPatterns || context.projectDna?.creativeDirection?.antiPatterns || [],
      desiredRecall: context.brief?.desiredRecall || context.projectDna?.creativeDirection?.desiredRecall || null,
      directionEvidence: context.adaptivePlan?.directionEvidence || null
    },
    rubrics,
    screenshots,
    outputSchema: {
      schemaVersion: "0.4.0",
      evidence: {
        requestId,
        stage,
        screenshots: screenshots.map(({ viewport, sha256 }) => ({ viewport, sha256 }))
      },
      provenance: {
        critic: "string",
        model: "string",
        generatedAt: "ISO timestamp",
        independentOfRepair: "boolean; must be true for acceptance"
      },
      confidence: "0..1",
      verdict: "reject|repair|accept",
      rubricCoverage: rubrics.map((rubric) => ({
        id: rubric.id,
        score: "0..4 using the supplied anchors",
        gatesPassed: "boolean",
        evidence: "specific visible evidence and check coverage"
      })),
      scorecard: Object.fromEntries([
        "creativeThesis",
        "briefSpecificity",
        "composition",
        "objectIntegration",
        "sectionRhythm",
        "materialDiscipline",
        "typographyImagery",
        "interactionIntent",
        "memorability",
        "antiAiSpecificity",
        "responsiveArtDirection"
      ].map((id) => [id, { score: "0..10", evidence: "specific visible evidence", blocker: "boolean" }])),
      thesis: { statement: "detected visible thesis", visibleProof: ["specific proof"], contradictions: ["specific contradiction"] },
      aiLikelihood: { score: "0..1", tells: ["replaceability or template tells"] },
      memoryHook: "the one thing a viewer would recall",
      strongestMoment: "specific visible moment",
      weakestMoment: "specific visible moment",
      structuralBlockers: ["stable blocker names"],
      findings: [{
        id: "string",
        fingerprint: "stable semantic fingerprint",
        category: "thesis|composition|object-integration|rhythm|direction|memorability|originality|material|typography|assets|interaction|responsive|functionality|accessibility",
        severity: "0..3",
        blocker: "boolean",
        repairKind: "structural|system|polish",
        message: "string",
        evidence: "specific visible evidence",
        impact: "string",
        rootCause: "structural cause, not symptom",
        recommendation: "concrete repair",
        successCriterion: "visibly testable outcome",
        forbiddenFixes: ["superficial fixes that cannot solve the cause"],
        viewport: "desktop|tablet|mobile",
        region: "visible region",
        files: ["optional project-relative candidates"]
      }]
    }
  };
}

async function obtainVisionReport({ capture, stage, runDir, command, suppliedReport, projectRoot, context }) {
  const requestPath = path.join(runDir, `vision-request-${stage}.json`);
  const outputPath = path.join(runDir, `vision-report-${stage}.json`);
  const request = await visionRequest(capture, stage, context);
  await writeJson(requestPath, request);
  if (suppliedReport) {
    const suppliedPath = path.resolve(suppliedReport);
    const report = await readJson(suppliedPath);
    validateVisionReport(report, request);
    return { report, request, requestPath, outputPath: suppliedPath, mode: "supplied" };
  }
  if (!command) return { report: null, request, requestPath, outputPath, mode: "not-configured" };
  const result = await runShellCommand(command, projectRoot, {
    DESIGN_LAGANN_VISION_REQUEST: requestPath,
    DESIGN_LAGANN_VISION_OUTPUT: outputPath,
    DESIGN_LAGANN_REVIEW_STAGE: stage
  });
  if (!(await exists(outputPath))) {
    try {
      await writeJson(outputPath, JSON.parse(result.stdout));
    } catch {
      throw new Error(`Vision command must write JSON to DESIGN_LAGANN_VISION_OUTPUT or print JSON to stdout.`);
    }
  }
  const report = await readJson(outputPath);
  validateVisionReport(report, request);
  return { report, request, requestPath, outputPath, mode: "command" };
}

async function evaluateStage({ projectRoot, capture, stage, runDir, visionCommand, visionReport, context, mode }) {
  const vision = await obtainVisionReport({
    capture,
    stage,
    runDir,
    command: visionCommand,
    suppliedReport: visionReport,
    projectRoot,
    context
  });
  const [visual, staticReport] = await Promise.all([
    analyzeCaptureVisuals(capture, { visionReport: vision.report, mode }),
    new StaticImpeccableCritic().analyze({ projectRoot })
  ]);
  const findings = mergeCritiques([visual, staticReport]);
  return { vision, visual, staticReport, findings };
}

function scriptCommand(packageManager, name) {
  if (packageManager === "pnpm") return `pnpm run ${name}`;
  if (packageManager === "yarn") return `yarn ${name}`;
  if (packageManager === "bun") return `bun run ${name}`;
  return `npm run ${name}`;
}

async function runVerification({ projectRoot, repository, capture, context, options }) {
  const checks = [];
  const recordCommand = async (kind, command) => {
    if (!command) {
      checks.push({ kind, status: "not-configured", passed: true, command: null });
      return;
    }
    try {
      const result = await runShellCommand(command, projectRoot, {}, Number(options.verificationTimeout || 180_000));
      checks.push({ kind, status: "passed", passed: true, command, stdout: result.stdout, stderr: result.stderr });
    } catch (error) {
      checks.push({ kind, status: "failed", passed: false, command, error: error.message });
    }
  };
  const buildCommand = options.buildCommand ||
    (repository.scripts?.build ? scriptCommand(repository.packageManager, "build") : null);
  const testCommand = options.testCommand ||
    (repository.scripts?.test ? scriptCommand(repository.packageManager, "test") : null);
  await recordCommand("build", buildCommand);
  await recordCommand("test", testCommand);
  await recordCommand("interaction", options.interactionCommand || null);
  await recordCommand("accessibility", options.accessibilityCommand || null);

  const captures = capture?.captures || [];
  const expected = Object.keys(DEFAULT_VIEWPORTS);
  const captured = new Set(captures.map((item) => item.name));
  const missingViewports = expected.filter((name) => !captured.has(name));
  const runtimeErrors = captures.flatMap((item) => [
    ...(item.evidence.runtime?.pageErrors || []),
    ...(item.evidence.runtime?.failedRequests || [])
  ]);
  checks.push({
    kind: "browser-readiness",
    status: !missingViewports.length && !runtimeErrors.length ? "passed" : "failed",
    passed: !missingViewports.length && !runtimeErrors.length,
    missingViewports,
    runtimeErrors
  });
  const prohibitedSvg = captures.flatMap((item) => {
    const evidence = item.evidence?.prohibitedSvg || {};
    return [
      ...(evidence.inline || []).map((entry) => ({
        viewport: item.name,
        kind: "inline-svg",
        entry
      })),
      ...(evidence.references || []).map((entry) => ({
        viewport: item.name,
        kind: "svg-reference",
        entry
      })),
      ...(evidence.computedStyles || []).map((entry) => ({
        viewport: item.name,
        kind: "svg-computed-style",
        entry
      })),
      ...(evidence.network || []).map((entry) => ({
        viewport: item.name,
        kind: "svg-network-request",
        entry
      }))
    ];
  });
  checks.push({
    kind: "prohibited-svg-runtime",
    status: prohibitedSvg.length ? "failed" : "passed",
    passed: prohibitedSvg.length === 0,
    issues: prohibitedSvg,
    policy: "The rendered interface must contain zero SVG elements, references, data payloads, computed SVG images, or SVG network responses."
  });
  const typeManifest = context.typeManifest;
  const typographyIssues = [];
  const normalizeFamily = (value) => String(value || "")
    .toLowerCase()
    .replaceAll('"', "")
    .replaceAll("'", "")
    .trim();
  const numericCss = (value) => Number.parseFloat(String(value ?? ""));
  if (!typeManifest?.gates?.passed || !typeManifest?.roles) {
    typographyIssues.push({
      kind: "type-manifest-missing",
      message: "A qualified type manifest is required for rendered typography verification."
    });
  } else {
    for (const item of captures) {
      const typography = item.evidence?.typography || {};
      if (typography.fontSetStatus !== "loaded") {
        typographyIssues.push({
          viewport: item.name,
          kind: "font-set-not-ready",
          actual: typography.fontSetStatus
        });
      }
      const fontChecks = Object.entries(typography.fontChecks || {});
      for (const font of typeManifest.fontFaces || []) {
        const match = fontChecks.find(([family]) =>
          normalizeFamily(family) === normalizeFamily(font.family)
        );
        if (match?.[1] !== true) {
          typographyIssues.push({
            viewport: item.name,
            kind: "font-check-failed",
            family: font.family
          });
        }
      }
      const viewportContract = typeManifest.screenshotValidation?.viewports
        ?.find((viewport) => viewport.id === item.name);
      for (const role of typeManifest.screenshotValidation?.requiredComputedRoles || []) {
        const expected = typeManifest.roles[role];
        const actual = typography.roleTypography?.[role];
        if (!actual) {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "type-role-evidence-missing",
            message: `Add data-type-role="${role}" to one visible representative element.`
          });
          continue;
        }
        if (!normalizeFamily(actual.fontFamily).includes(normalizeFamily(expected.family))) {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "computed-family-drift",
            expected: expected.family,
            actual: actual.fontFamily
          });
        }
        if (actual.fontSynthesis !== "none") {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "font-synthesis-enabled",
            actual: actual.fontSynthesis
          });
        }
        if (
          expected.textTransform
          && actual.textTransform !== expected.textTransform
        ) {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "text-transform-drift",
            expected: expected.textTransform,
            actual: actual.textTransform
          });
        }
        const fontSize = numericCss(actual.fontSize);
        const actualLineHeight = numericCss(actual.lineHeight);
        if (
          Number.isFinite(fontSize)
          && fontSize > 0
          && Number.isFinite(actualLineHeight)
          && Math.abs(actualLineHeight / fontSize - Number(expected.lineHeight)) > 0.08
        ) {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "line-height-drift",
            expected: expected.lineHeight,
            actual: Number((actualLineHeight / fontSize).toFixed(3))
          });
        }
        const expectedTracking = numericCss(expected.letterSpacing);
        const actualTrackingPx = numericCss(actual.letterSpacing);
        if (
          Number.isFinite(fontSize)
          && fontSize > 0
          && Number.isFinite(expectedTracking)
          && Number.isFinite(actualTrackingPx)
          && Math.abs(actualTrackingPx / fontSize - expectedTracking) > 0.012
        ) {
          typographyIssues.push({
            viewport: item.name,
            role,
            kind: "tracking-drift",
            expected: expected.letterSpacing,
            actual: `${Number((actualTrackingPx / fontSize).toFixed(3))}em`
          });
        }
        if (role === "display") {
          const exactLines = viewportContract?.display?.exactLines;
          const maxLines = viewportContract?.display?.maxLines;
          if (
            exactLines !== null
            && exactLines !== undefined
            && Number(actual.lineCount) !== Number(exactLines)
          ) {
            typographyIssues.push({
              viewport: item.name,
              role,
              kind: "reference-line-count-drift",
              expected: exactLines,
              actual: actual.lineCount
            });
          } else if (
            Number.isFinite(Number(maxLines))
            && Number(actual.lineCount) > Number(maxLines)
          ) {
            typographyIssues.push({
              viewport: item.name,
              role,
              kind: "display-line-count-overflow",
              maximum: maxLines,
              actual: actual.lineCount
            });
          }
        }
      }
    }
  }
  checks.push({
    kind: "typography-runtime-contract",
    status: typographyIssues.length ? "failed" : "passed",
    passed: typographyIssues.length === 0,
    issues: typographyIssues,
    policy: "The declared local fonts, role families, synthesis setting, tracking, line-height, and reference-authored line structure must be browser-proven at every viewport."
  });
  const accessibilityBaseline = captures.flatMap((item) => [
    ...(item.evidence.accessibility?.unnamedInteractive || []).map((entry) => ({
      viewport: item.name,
      kind: "unnamed-interactive",
      entry
    })),
    ...(item.evidence.accessibility?.missingAlt || []).map((entry) => ({
      viewport: item.name,
      kind: "missing-alt",
      entry
    })),
    ...(item.evidence.accessibility?.duplicateIds || []).map((entry) => ({
      viewport: item.name,
      kind: "duplicate-id",
      entry
    })),
    ...(item.evidence.scroll?.width > item.evidence.viewport?.width
      ? [{
          viewport: item.name,
          kind: "horizontal-overflow",
          entry: `${item.evidence.scroll.width}px content in ${item.evidence.viewport.width}px viewport`
        }]
      : [])
  ]);
  checks.push({
    kind: "accessibility-browser-baseline",
    status: accessibilityBaseline.length ? "failed" : "passed",
    passed: accessibilityBaseline.length === 0,
    issues: accessibilityBaseline
  });
  const accessibilityCheck = checks.find((check) => check.kind === "accessibility");
  if (accessibilityCheck.status === "not-configured") {
    checks.push({
      kind: "complete-accessibility-evidence",
      status: "failed",
      passed: false,
      error: "elite-v1 requires an explicit keyboard, focus, contrast, touch-target, zoom, and reduced-motion verification command."
    });
  }

  const declaredInteractions = context.brief?.interactions || context.brief?.requiredInteractions || [];
  const interactionCheck = checks.find((check) => check.kind === "interaction");
  if (declaredInteractions.length && interactionCheck.status === "not-configured") {
    checks.push({
      kind: "declared-interaction-evidence",
      status: "failed",
      passed: false,
      required: declaredInteractions,
      error: "The brief declares interactions, but no explicit interaction command was executed."
    });
  }
  return {
    version: "0.4.0",
    passed: checks.every((check) => check.passed),
    executed: checks.filter((check) => check.status !== "not-configured").length,
    checks
  };
}

async function resumeReview(options, projectRoot) {
  if (!options.afterVisionReport) {
    throw new Error("Resuming a review requires --after-vision-report.");
  }
  const runDir = path.join(projectRoot, ".design-lagann", "reviews", options.resumeRun);
  const reviewPath = path.join(runDir, "review.json");
  if (!(await exists(reviewPath))) throw new Error(`Review run not found: ${options.resumeRun}`);
  const prior = await readJson(reviewPath);
  if (!prior.after?.capture || !prior.before?.capture) {
    throw new Error("The review run has no completed before/after capture pair to resume.");
  }
  if (!prior.agent?.sourceDigest) {
    throw new Error("The review run predates resumable source-integrity evidence.");
  }
  const currentDigest = snapshotDigest(await fileSnapshot(projectRoot));
  if (currentDigest !== prior.agent.sourceDigest) {
    throw new Error("Reviewable project files changed after the captured after-state; start a new review.");
  }
  const requestPath = prior.after.vision?.request || path.join(runDir, "vision-request-after.json");
  const request = await readJson(requestPath);
  const reportPath = path.resolve(options.afterVisionReport);
  const report = await readJson(reportPath);
  validateVisionReport(report, request);
  const priorProfile =
    prior.executionProfile || prior.mode || prior.before.executionProfile || prior.before.mode || "balanced";
  if (
    (priorProfile === "economy" || prior.mode === "economy" || prior.before?.mode === "economy") &&
    !prior.acceptancePolicy
  ) {
    throw new Error(
      "This is a legacy v0.4 Economy review with a weaker acceptance policy. Start a fresh review so elite-v1 evidence can be captured; it cannot be relabeled during resume."
    );
  }
  const resumedProfile = normalizeWorkflowProfile(priorProfile);
  const mode = resumedProfile.profile === "auto" ? "balanced" : resumedProfile.profile;
  const [visual, staticReport] = await Promise.all([
    analyzeCaptureVisuals(prior.after.capture, { visionReport: report, mode }),
    new StaticImpeccableCritic().analyze({ projectRoot })
  ]);
  const findings = mergeCritiques([visual, staticReport]);
  const comparison = compareReports(
    {
      findings: prior.before.findings,
      artDirection: prior.before.artDirection,
      mode
    },
    {
      findings,
      artDirection: visual.artDirection,
      mode
    },
    { mode }
  );
  comparison.modifiedFiles = prior.agent.modifiedFiles;
  comparison.beforeMetrics = prior.comparison?.beforeMetrics || prior.before.reports?.[0]?.metrics;
  comparison.afterMetrics = visual.metrics;
  const stopping = stoppingConditions({
    verification: prior.verification,
    screenshots: { before: prior.before.capture, after: prior.after.capture },
    findings,
    comparison,
    artDirection: visual.artDirection,
    mode,
    contextReady: prior.before.context?.ready ?? prior.context?.ready ?? false
  });
  const resumedAt = new Date().toISOString();
  const priorTelemetryStartedAt =
    prior.telemetry?.timing?.startedAt ||
    prior.startedAt;
  const telemetryStartedAt =
    Number.isFinite(Date.parse(priorTelemetryStartedAt)) &&
    Date.parse(priorTelemetryStartedAt) < Date.parse(resumedAt)
      ? priorTelemetryStartedAt
      : new Date(Math.max(0, Date.parse(resumedAt) - 1)).toISOString();
  const telemetry = summarizeRunTelemetry({
    profile: mode,
    startedAt: telemetryStartedAt,
    finishedAt: resumedAt,
    phases: [
      ...(prior.telemetry?.phases || []).filter((phase) => phase.id !== "acceptance-proof"),
      {
        id: "acceptance-proof",
        status: "completed-on-resume",
        startedAt: request.issuedAt || null,
        finishedAt: resumedAt,
        elapsedMs: request.issuedAt && Number.isFinite(Date.parse(request.issuedAt))
          ? Math.max(0, Date.parse(resumedAt) - Date.parse(request.issuedAt))
          : null
      }
    ],
    tokens: prior.telemetry?.tokens?.status === "reported"
      ? {
          input: prior.telemetry.tokens.input,
          output: prior.telemetry.tokens.output
        }
      : null,
    qualityBefore: prior.before.artDirection?.weightedScore,
    qualityAfter: visual.artDirection?.weightedScore,
    evidenceComplete: comparison.evidenceComplete
  });
  const result = {
    ...prior,
    executionProfile: mode,
    acceptancePolicy: ELITE_QUALITY_CONTRACT.id,
    qualityContractDigest: ELITE_QUALITY_CONTRACT_DIGEST,
    phase: comparison.passed && stopping.passed ? "accepted" : "rejected",
    verdict: comparison.passed && stopping.passed ? "accepted" : "rejected",
    after: {
      ...prior.after,
      reports: [visual, staticReport],
      findings,
      artDirection: visual.artDirection,
      qualityGate: visual.qualityGate,
      vision: {
        mode: "supplied-on-resume",
        request: requestPath,
        report: reportPath
      }
    },
    comparison,
    stopping,
    telemetry,
    resumedAt
  };
  await Promise.all([
    writeJson(path.join(runDir, "vision-report-after.json"), report),
    writeJson(path.join(runDir, "art-direction-after.json"), visual.artDirection),
    writeJson(path.join(runDir, "critique-after.json"), result.after),
    writeJson(path.join(runDir, "comparison.json"), comparison),
    writeJson(path.join(runDir, "telemetry.json"), telemetry),
    writeJson(reviewPath, result)
  ]);
  return result;
}

export async function reviewProject(options) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  if (options.resumeRun) return resumeReview(options, projectRoot);
  const reviewStartedAtMs = Date.now();
  const reviewStartedAt = new Date(reviewStartedAtMs).toISOString();
  const phaseSpans = [];
  const startPhase = (id) => ({ id, startedAtMs: Date.now() });
  const finishPhase = (phase, status = "completed", extra = {}) => {
    const finishedAtMs = Math.max(Date.now(), phase.startedAtMs + 1);
    const span = {
      id: phase.id,
      status,
      startedAt: new Date(phase.startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      elapsedMs: finishedAtMs - phase.startedAtMs,
      ...extra
    };
    phaseSpans.push(span);
    return span;
  };
  const repository = await inspectRepository(projectRoot);
  const context = await loadReviewContext(projectRoot);
  let adaptivePlan = await createAdaptivePlan({
    projectRoot,
    brief: context.brief || {
      goal: "Review the current frontend.",
      references: [],
      executionProfile: options.mode || "balanced"
    },
    profile: options.mode || context.brief?.executionProfile || context.brief?.mode || "balanced",
    repository
  });
  context.adaptivePlan = adaptivePlan;
  let mode = adaptivePlan.profile;
  const runId = options.runId || new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(projectRoot, ".design-lagann", "reviews", runId);
  await mkdir(runDir, { recursive: true });
  const target = await startReviewTarget(projectRoot, options.url, repository);
  try {
    const captureBeforePhase = startPhase("capture-before");
    const beforeCapture = await captureUrl({
      url: target.url,
      outDir: path.join(runDir, "screenshots", "before"),
      id: "app",
      viewports: DEFAULT_VIEWPORTS
    });
    finishPhase(captureBeforePhase);
    const criticTriagePhase = startPhase("critic-triage");
    const before = await evaluateStage({
      projectRoot,
      capture: beforeCapture,
      stage: "before",
      runDir,
      visionCommand: options.visionCommand,
      visionReport: options.visionReport,
      context,
      mode
    });
    const escalation = recommendProfileEscalation({
      profile: mode,
      semanticScore: before.visual.artDirection?.weightedScore,
      blockers: [
        ...(before.visual.artDirection?.blockers || []),
        ...before.findings.filter((finding) => finding.blocker).map((finding) => finding.id)
      ],
      hardGateFailures: before.visual.qualityGate?.failures || [],
      responsiveUncertainty: before.findings.some((finding) =>
        finding.category === "responsive" && (finding.blocker || finding.severity >= 2)
      ),
      weakReference:
        context.adaptivePlan?.signals?.strongReference === true &&
        (
          context.adaptivePlan?.signals?.referenceEvidenceCurrent !== true ||
          context.adaptivePlan?.signals?.referenceAdopted !== true
        ),
      repositoryRisk: repository.fileCount > 1_000,
      complexArtwork: context.adaptivePlan?.signals?.complexArtwork
    });
    if (escalation.escalated) {
      const originalPlan = adaptivePlan;
      adaptivePlan = await createAdaptivePlan({
        projectRoot,
        brief: context.brief || {
          goal: "Review the current frontend.",
          references: []
        },
        profile: escalation.to,
        repository,
        signals: {
          ...originalPlan.signals,
          baselineEvidenceComplete: Boolean(before.visual.artDirection),
          baselineSemanticScore: before.visual.artDirection?.weightedScore,
          baselineBlockers: escalation.reasons
        }
      });
      adaptivePlan.requestedProfile = originalPlan.requestedProfile;
      adaptivePlan.selection = {
        source: "baseline-auto-escalation",
        reasons: escalation.reasons
      };
      adaptivePlan.escalationHistory = [
        ...(originalPlan.escalationHistory || []),
        {
          from: escalation.from,
          to: escalation.to,
          reasons: escalation.reasons,
          triggeredAt: new Date().toISOString(),
          evidenceStage: "before"
        }
      ];
      await writeJson(path.join(projectRoot, ".design-lagann", "adaptive-plan.json"), adaptivePlan);
      context.adaptivePlan = adaptivePlan;
      mode = adaptivePlan.profile;
    }
    const repairPlan = await createRepairPlan(projectRoot, before.findings);
    const criticTriage = createCriticTriage({
      profile: mode,
      dimensions: Object.fromEntries(
        Object.entries(before.visual.artDirection?.scorecard || {})
          .map(([id, entry]) => [id, entry?.score])
      ),
      findings: before.findings
    });
    const regionalRepairPlan = createRegionalRepairPlan(repairPlan, { profile: mode });
    finishPhase(criticTriagePhase);
    const baseline = {
      version: "0.4.0",
      runId,
      projectRoot,
      url: target.url,
      repository,
      context: {
        ready: context.ready,
        missing: context.missing,
        brief: context.brief,
        projectDna: context.projectDna,
        adaptivePlan: context.adaptivePlan
      },
      mode,
      executionProfile: mode,
      acceptancePolicy: ELITE_QUALITY_CONTRACT.id,
      qualityContractDigest: ELITE_QUALITY_CONTRACT_DIGEST,
      adaptivePlan: ".design-lagann/adaptive-plan.json",
      capture: beforeCapture,
      reports: [before.visual, before.staticReport],
      findings: before.findings,
      repairPlan,
      criticTriage,
      regionalRepairPlan,
      vision: {
        mode: before.vision.mode,
        request: before.vision.requestPath,
        report: before.vision.report ? before.vision.outputPath : null
      },
      artDirection: before.visual.artDirection,
      qualityGate: before.visual.qualityGate
    };
    await Promise.all([
      writeJson(path.join(runDir, "critique-before.json"), baseline),
      writeJson(path.join(runDir, "repair-plan.json"), repairPlan),
      writeJson(path.join(runDir, "critic-triage.json"), criticTriage),
      writeJson(path.join(runDir, "regional-repair-plan.json"), regionalRepairPlan),
      writeJson(path.join(runDir, "art-direction-before.json"), before.visual.artDirection || {
        status: "insufficient-evidence",
        reason: "No validated semantic vision report was supplied."
      })
    ]);

    if (!options.agentCommand) {
      const structural = before.findings.some(
        (finding) => finding.blocker || (finding.severity >= 2 &&
          ["thesis", "composition", "object-integration", "rhythm", "direction", "memorability", "originality"].includes(finding.category))
      );
      const phase =
        !context.ready ? "context-required" :
        !before.vision.report ? "vision-required" :
        before.visual.qualityGate.passed && !before.findings.length ? "qualified-baseline" :
        structural ? "structural-repair-required" :
        "repair-ready";
      const finishedAt = new Date(Math.max(Date.now(), reviewStartedAtMs + 1)).toISOString();
      const telemetry = summarizeRunTelemetry({
        profile: mode,
        startedAt: reviewStartedAt,
        finishedAt,
        phases: [
          ...phaseSpans,
          { id: "regional-repair", status: "not-started", startedAt: null, finishedAt: null, elapsedMs: null }
        ],
        tokens: null,
        qualityBefore: before.visual.artDirection?.weightedScore,
        qualityAfter: null,
        evidenceComplete: false
      });
      const result = {
        ...baseline,
        phase,
        verdict: "unverified",
        telemetry,
        limitation: before.visual.limitation,
        next:
          !context.ready ? `Create the missing project context: ${context.missing.join("; ")}.` :
          !before.vision.report ? "Have an independent vision-capable critic answer the generated request, then rerun with --vision-report." :
          before.visual.qualityGate.passed && !before.findings.length
            ? "This baseline clears the absolute bar, but acceptance requires an independently verified before/after repair cycle."
            : "Run again with --agent-command to apply the structural-first repair plan and produce independent before/after evidence."
      };
      await Promise.all([
        writeJson(path.join(runDir, "review.json"), result),
        writeJson(path.join(runDir, "telemetry.json"), telemetry)
      ]);
      return result;
    }

    const regionalRepairPhase = startPhase("regional-repair");
    const beforeFiles = await fileSnapshot(projectRoot);
    const agentResult = await runShellCommand(options.agentCommand, projectRoot, {
      DESIGN_LAGANN_PROJECT: projectRoot,
      DESIGN_LAGANN_REPAIR_PLAN: path.join(runDir, "repair-plan.json"),
      DESIGN_LAGANN_REGIONAL_REPAIR_PLAN: path.join(runDir, "regional-repair-plan.json"),
      DESIGN_LAGANN_ALLOWED_FILES: regionalRepairPlan.allowedFiles.join(path.delimiter),
      DESIGN_LAGANN_CRITIQUE: path.join(runDir, "critique-before.json")
    }, Number(options.agentTimeout || 300_000));
    const afterFiles = await fileSnapshot(projectRoot);
    const sourceDigest = snapshotDigest(afterFiles);
    const modifiedFiles = changedFiles(beforeFiles, afterFiles);
    if (!modifiedFiles.length) throw new Error("The configured agent command completed without changing any reviewable project file.");
    finishPhase(regionalRepairPhase, "completed", { modifiedFiles });

    const captureAfterPhase = startPhase("capture-after");
    const afterCapture = await captureUrl({
      url: target.url,
      outDir: path.join(runDir, "screenshots", "after"),
      id: "app",
      viewports: DEFAULT_VIEWPORTS
    });
    finishPhase(captureAfterPhase);
    const acceptanceProofPhase = startPhase("acceptance-proof");
    const after = await evaluateStage({
      projectRoot,
      capture: afterCapture,
      stage: "after",
      runDir,
      visionCommand: options.visionCommand,
      visionReport: options.afterVisionReport,
      context,
      mode
    });
    const verification = await runVerification({
      projectRoot,
      repository,
      capture: afterCapture,
      context,
      options
    });
    const allowedFiles = new Set(
      regionalRepairPlan.allowedFiles.map((file) => String(file).replaceAll("\\", "/"))
    );
    const unauthorizedFiles = allowedFiles.size
      ? modifiedFiles.filter((file) => !allowedFiles.has(file))
      : [];
    verification.checks.push({
      kind: "regional-change-scope",
      status: unauthorizedFiles.length ? "failed" : allowedFiles.size ? "passed" : "not-enforced",
      passed: unauthorizedFiles.length === 0,
      allowedFiles: [...allowedFiles],
      unauthorizedFiles,
      limitation: allowedFiles.size
        ? null
        : "The critic did not produce a file-bounded regional plan, so scope enforcement was unavailable."
    });
    verification.passed = verification.checks.every((check) => check.passed);
    const comparison = compareReports(
      { findings: before.findings, artDirection: before.visual.artDirection, mode },
      { findings: after.findings, artDirection: after.visual.artDirection, mode },
      { mode }
    );
    comparison.modifiedFiles = modifiedFiles;
    comparison.beforeMetrics = before.visual.metrics;
    comparison.afterMetrics = after.visual.metrics;
    const stopping = stoppingConditions({
      verification,
      screenshots: { before: beforeCapture, after: afterCapture },
      findings: after.findings,
      comparison,
      artDirection: after.visual.artDirection,
      mode,
      contextReady: context.ready
    });
    finishPhase(
      acceptanceProofPhase,
      after.vision.report ? "completed" : "awaiting-vision"
    );
    await Promise.all([
      writeJson(path.join(runDir, "comparison.json"), comparison),
      writeJson(path.join(runDir, "verification.json"), verification),
      writeJson(path.join(runDir, "art-direction-after.json"), after.visual.artDirection || {
        status: "insufficient-evidence",
        reason: "No validated semantic vision report was supplied."
      })
    ]);
    let rollback = null;
    if (comparison.evidenceComplete && (!comparison.passed || !stopping.passed) && options.rollbackCommand) {
      rollback = await runShellCommand(options.rollbackCommand, projectRoot, {
        DESIGN_LAGANN_PROJECT: projectRoot,
        DESIGN_LAGANN_MODIFIED_FILES: modifiedFiles.join(path.delimiter),
        DESIGN_LAGANN_COMPARISON: path.join(runDir, "comparison.json")
      });
    }
    const finishedAt = new Date(Math.max(Date.now(), reviewStartedAtMs + 1)).toISOString();
    const telemetry = summarizeRunTelemetry({
      profile: mode,
      startedAt: reviewStartedAt,
      finishedAt,
      phases: phaseSpans,
      tokens: null,
      qualityBefore: before.visual.artDirection?.weightedScore,
      qualityAfter: after.visual.artDirection?.weightedScore,
      evidenceComplete: comparison.evidenceComplete
    });
    const result = {
      version: "0.4.0",
      runId,
      projectRoot,
      url: target.url,
      executionProfile: mode,
      acceptancePolicy: ELITE_QUALITY_CONTRACT.id,
      qualityContractDigest: ELITE_QUALITY_CONTRACT_DIGEST,
      phase: !after.vision.report
        ? "awaiting-after-vision" :
        comparison.passed && stopping.passed
        ? "accepted"
        : rollback ? "rejected-and-rolled-back" :
          comparison.evidenceComplete
            ? (comparison.resolved.length || comparison.scoreDelta > 0 ? "improved-below-bar" : "rated-below-bar")
            : "insufficient-evidence",
      verdict: !after.vision.report || !comparison.evidenceComplete
        ? "unverified"
        : comparison.passed && stopping.passed ? "accepted" : "rejected",
      before: baseline,
      after: {
        capture: afterCapture,
        reports: [after.visual, after.staticReport],
        findings: after.findings,
        artDirection: after.visual.artDirection,
        qualityGate: after.visual.qualityGate,
        vision: {
          mode: after.vision.mode,
          request: after.vision.requestPath,
          report: after.vision.report ? after.vision.outputPath : null
        }
      },
      agent: {
        command: options.agentCommand,
        stdout: agentResult.stdout,
        stderr: agentResult.stderr,
        modifiedFiles,
        sourceDigest
      },
      verification,
      comparison,
      stopping,
      telemetry,
      rollback: rollback ? { command: options.rollbackCommand, stdout: rollback.stdout, stderr: rollback.stderr } : null,
      next: !after.vision.report
        ? `Have an independent critic answer ${after.vision.requestPath}, then run review with --resume-run ${runId} --after-vision-report <path>.`
        : null
    };
    await Promise.all([
      writeJson(path.join(runDir, "critique-after.json"), result.after),
      writeJson(path.join(runDir, "comparison.json"), comparison),
      writeJson(path.join(runDir, "telemetry.json"), telemetry),
      writeJson(path.join(runDir, "review.json"), result)
    ]);
    return result;
  } finally {
    await target.stop();
  }
}
