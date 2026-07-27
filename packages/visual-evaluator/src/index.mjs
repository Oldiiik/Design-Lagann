import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { priorityFor } from "../../shared/src/index.mjs";
import {
  ART_DIRECTION_DIMENSIONS,
  artDirectionThreshold,
  scoreVisionReport,
  validateFinding
} from "../../schemas/src/index.mjs";

export {
  REFERENCE_COMPARISON_DIMENSIONS,
  compareReferenceToBuild,
  createReferenceEvidenceBinding,
  digestReferenceContract,
  validateReferenceEvidenceBinding,
  validateReferenceVisionReport
} from "./reference-comparison.mjs";

const STRUCTURAL_CATEGORIES = new Set([
  "thesis",
  "composition",
  "object-integration",
  "rhythm",
  "direction",
  "memorability",
  "originality"
]);
const HARD_CATEGORIES = new Set(["functionality", "responsive", "accessibility"]);
const SEVERITY_TWO_BLOCKING = new Set([...STRUCTURAL_CATEGORIES, ...HARD_CATEGORIES, "assets"]);

function normalize(message) {
  return message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function semanticKey(finding) {
  return finding.fingerprint || `${finding.category}:${normalize(finding.rootCause || finding.message || finding.id)}`;
}

export function mergeCritiques(reports) {
  const merged = new Map();
  for (const report of reports.filter(Boolean)) {
    for (const candidate of report.findings ?? []) {
      const finding = validateFinding(candidate);
      const key = semanticKey(finding);
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { ...finding, fingerprint: key, critics: [finding.critic] });
      } else {
        current.severity = Math.max(current.severity, finding.severity);
        current.critics = [...new Set([...current.critics, finding.critic])];
        current.blocker = Boolean(current.blocker || finding.blocker);
        if (!current.evidence && finding.evidence) current.evidence = finding.evidence;
      }
    }
  }
  return [...merged.values()].sort(
    (a, b) => priorityFor(a.category) - priorityFor(b.category) || b.severity - a.severity
  );
}

export function planRepair(findings, limit = 3) {
  const ordered = [...findings].sort(
    (a, b) => priorityFor(a.category) - priorityFor(b.category) || b.severity - a.severity
  );
  const structuralBlockers = ordered.filter(
    (finding) => (finding.blocker || finding.severity >= 2) && STRUCTURAL_CATEGORIES.has(finding.category)
  );
  const hardFailures = ordered.filter(
    (finding) => (finding.blocker || finding.severity >= 2) && HARD_CATEGORIES.has(finding.category)
  );
  const candidates = structuralBlockers.length
    ? [...hardFailures, ...structuralBlockers].filter(
        (finding, index, array) => array.findIndex((item) => semanticKey(item) === semanticKey(finding)) === index
      )
    : ordered;
  return candidates.slice(0, Math.max(1, Math.min(limit, 5))).map((finding, index) => ({
    order: index + 1,
    findingId: finding.id,
    fingerprint: semanticKey(finding),
    category: finding.category,
    severity: finding.severity,
    repairKind: finding.repairKind || (STRUCTURAL_CATEGORIES.has(finding.category) ? "structural" : "system"),
    action: finding.rootCause || finding.message,
    evidence: finding.evidence,
    impact: finding.impact || "This weakens whole-page clarity or implementation quality.",
    instruction: finding.recommendation || finding.message,
    successCriterion: finding.successCriterion || "The next screenshot must visibly remove the diagnosed root cause without creating a new one.",
    forbiddenFixes: finding.forbiddenFixes || (
      STRUCTURAL_CATEGORIES.has(finding.category)
        ? ["Do not compensate with more glow, blur, shadow, radius, floating panels, or decorative motion."]
        : []
    ),
    viewport: finding.viewport || null,
    region: finding.region || null,
    files: finding.files || (finding.file ? [finding.file] : [])
  }));
}

export function evaluateArtDirection(report, mode = "balanced") {
  const executionProfile = mode === "economy"
    ? "fast"
    : mode === "auto"
      ? "balanced"
      : mode;
  if (!report) {
    return {
      passed: false,
      status: "insufficient-evidence",
      mode: executionProfile,
      acceptancePolicy: "elite-v1",
      threshold: artDirectionThreshold(executionProfile),
      failures: ["A validated semantic vision report is required."]
    };
  }
  const scored = report.weightedScore === undefined ? scoreVisionReport(report) : report;
  const threshold = artDirectionThreshold(executionProfile);
  const dimensionFloor = 8;
  const aiCeiling = 0.2;
  const confidenceFloor = 0.8;
  const failures = [];
  if (scored.verdict !== "accept") failures.push(`Vision verdict is ${scored.verdict}, not accept.`);
  if (scored.weightedScore < threshold) failures.push(`Weighted art-direction score ${scored.weightedScore} is below ${threshold}.`);
  if (scored.rubricScore < threshold) failures.push(`Weighted rubric score ${scored.rubricScore} is below ${threshold}.`);
  if (scored.failedRubricGates?.length) {
    failures.push(`Rubric hard gates failed: ${scored.failedRubricGates.join(", ")}.`);
  }
  if (scored.aiLikelihood.score > aiCeiling) {
    failures.push(`AI-template likelihood ${scored.aiLikelihood.score} exceeds ${aiCeiling}.`);
  }
  if ((scored.confidence ?? 0) < confidenceFloor) {
    failures.push(`Critic confidence ${scored.confidence ?? 0} is below ${confidenceFloor}.`);
  }
  if (scored.provenance?.independentOfRepair !== true) {
    failures.push("The semantic critic is not attested as independent of the repair agent.");
  }
  if (scored.blockers?.length) failures.push(`Structural blockers remain: ${scored.blockers.join(", ")}.`);
  const belowFloor = ART_DIRECTION_DIMENSIONS
    .filter((dimension) => dimension.structural && scored.scorecard[dimension.id].score < dimensionFloor)
    .map((dimension) => `${dimension.id}=${scored.scorecard[dimension.id].score}`);
  if (belowFloor.length) failures.push(`Structural dimension floors are not met: ${belowFloor.join(", ")}.`);
  const disqualifying = (scored.findings || []).filter(
    (finding) => finding.blocker || finding.severity >= 3 ||
      (finding.severity >= 2 && SEVERITY_TWO_BLOCKING.has(finding.category))
  );
  if (disqualifying.length) failures.push(`Disqualifying findings remain: ${disqualifying.map((item) => item.id).join(", ")}.`);
  return {
    ...scored,
    mode: executionProfile,
    acceptancePolicy: "elite-v1",
    threshold,
    dimensionFloor,
    aiCeiling,
    confidenceFloor,
    passed: failures.length === 0,
    status: failures.length ? "rated-below-bar" : "provisional-pass",
    failures
  };
}

function reportFindings(report) {
  return Array.isArray(report) ? report : report?.findings || [];
}

export function compareReports(before, after, options = {}) {
  const beforeFindings = reportFindings(before);
  const afterFindings = reportFindings(after);
  const beforeByKey = new Map(beforeFindings.map((item) => [semanticKey(item), item]));
  const afterByKey = new Map(afterFindings.map((item) => [semanticKey(item), item]));
  const resolved = [...beforeByKey.keys()].filter((key) => !afterByKey.has(key));
  const introduced = [...afterByKey.keys()].filter((key) => !beforeByKey.has(key));
  const persistentRegressions = [...afterByKey.entries()]
    .filter(([key, finding]) => beforeByKey.has(key) && finding.severity > beforeByKey.get(key).severity)
    .map(([key]) => key);
  const mode = options.mode || after?.mode || before?.mode || "balanced";
  const beforeArtDirection = before?.artDirection || null;
  const afterArtDirection = after?.artDirection || null;
  const beforeScore = beforeArtDirection?.weightedScore ?? null;
  const afterScore = afterArtDirection?.weightedScore ?? null;
  const scoreDelta = beforeScore === null || afterScore === null ? null : Number((afterScore - beforeScore).toFixed(2));
  const afterGate = evaluateArtDirection(afterArtDirection, mode);
  const evidenceComplete = Boolean(beforeArtDirection && afterArtDirection);
  const materialImprovement = resolved.length > 0 || (scoreDelta !== null && scoreDelta >= 0.2);
  const passed =
    evidenceComplete &&
    afterGate.passed &&
    introduced.length === 0 &&
    persistentRegressions.length === 0 &&
    (scoreDelta === null || scoreDelta >= -0.1) &&
    materialImprovement;
  return {
    passed,
    evidenceComplete,
    beforeCount: beforeByKey.size,
    afterCount: afterByKey.size,
    resolved,
    introduced,
    persistentRegressions,
    beforeScore,
    afterScore,
    scoreDelta,
    afterGate,
    claim: passed
      ? "The repair cleared the absolute art-direction gate and improved measured evidence without regressions."
      : "Acceptance is not established; fewer findings alone is not proof of high-quality art direction."
  };
}

export function stoppingConditions({ verification, screenshots, findings, comparison, artDirection, mode, contextReady = true }) {
  const failures = [];
  if (!verification?.passed) failures.push("Executed build, test, or browser readiness checks did not pass.");
  if (!contextReady) failures.push("A valid brief and project creative direction are required.");
  if (!screenshots?.before || !screenshots?.after) failures.push("Before/after screenshot evidence is incomplete.");
  const disqualifying = (findings ?? []).filter(
    (item) => item.blocker || item.severity >= 3 ||
      (item.severity >= 2 && SEVERITY_TWO_BLOCKING.has(item.category))
  );
  if (disqualifying.length) {
    failures.push(`Critical technical or structural findings remain: ${disqualifying.map((item) => item.id).join(", ")}.`);
  }
  const artGate = evaluateArtDirection(artDirection, mode);
  if (!artGate.passed) failures.push(...artGate.failures);
  if (!comparison?.evidenceComplete) failures.push("Validated before/after art-direction evidence is incomplete.");
  if (!comparison?.passed) failures.push("Before/after comparison did not establish a non-regressive improvement.");
  return { passed: failures.length === 0, failures };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("Unsupported screenshot format: expected PNG");
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  const idat = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG encoding: bitDepth=${bitDepth}, colorType=${colorType}`);
  }
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 })[colorType];
  const rowBytes = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * channels);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset++];
    const rowOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const source = raw[sourceOffset++];
      const left = x >= channels ? pixels[rowOffset + x - channels] : 0;
      const up = y > 0 ? pixels[rowOffset - rowBytes + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[rowOffset - rowBytes + x - channels] : 0;
      const value =
        filter === 0 ? source :
        filter === 1 ? source + left :
        filter === 2 ? source + up :
        filter === 3 ? source + Math.floor((left + up) / 2) :
        filter === 4 ? source + paeth(left, up, upLeft) :
        source;
      pixels[rowOffset + x] = value & 255;
    }
  }
  return { width, height, channels, colorType, pixels };
}

function rgbAt(image, x, y) {
  const index = (y * image.width + x) * image.channels;
  if (image.colorType === 0 || image.colorType === 4) {
    const value = image.pixels[index];
    return [value, value, value];
  }
  return [image.pixels[index], image.pixels[index + 1], image.pixels[index + 2]];
}

function luminance([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function distance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

export async function analyzeScreenshot(screenshot) {
  const image = decodePng(await readFile(screenshot));
  const stride = Math.max(1, Math.floor(Math.min(image.width, image.height) / 180));
  const colors = new Map();
  let samples = 0;
  let luminosity = 0;
  let edgeSamples = 0;
  let edgeHits = 0;
  for (let y = 0; y < image.height; y += stride) {
    for (let x = 0; x < image.width; x += stride) {
      const rgb = rgbAt(image, x, y);
      const key = rgb.map((value) => Math.min(255, Math.round(value / 32) * 32)).join(",");
      colors.set(key, (colors.get(key) || 0) + 1);
      luminosity += luminance(rgb);
      samples += 1;
      if (x + stride < image.width) {
        edgeSamples += 1;
        if (distance(rgb, rgbAt(image, x + stride, y)) > 90) edgeHits += 1;
      }
    }
  }
  const dominant = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const background = dominant[0][0].split(",").map(Number);
  let massX = 0;
  let massY = 0;
  let mass = 0;
  let leftMass = 0;
  let rightMass = 0;
  let blankBands = 0;
  const bandCount = 24;
  for (let band = 0; band < bandCount; band += 1) {
    const startY = Math.floor((band / bandCount) * image.height);
    const endY = Math.max(startY + 1, Math.floor(((band + 1) / bandCount) * image.height));
    let bandMass = 0;
    let bandSamples = 0;
    for (let y = startY; y < endY; y += stride) {
      for (let x = 0; x < image.width; x += stride) {
        const weight = Math.min(1, distance(rgbAt(image, x, y), background) / 255);
        if (weight > 0.12) {
          massX += x * weight;
          massY += y * weight;
          mass += weight;
          bandMass += weight;
          if (x < image.width / 2) leftMass += weight;
          else rightMass += weight;
        }
        bandSamples += 1;
      }
    }
    if (bandMass / Math.max(1, bandSamples) < 0.035) blankBands += 1;
  }
  const visualCenter = mass
    ? { x: Number((massX / mass / image.width).toFixed(3)), y: Number((massY / mass / image.height).toFixed(3)) }
    : { x: 0.5, y: 0.5 };
  return {
    screenshot,
    width: image.width,
    height: image.height,
    dominantColors: dominant.map(([rgb, count]) => ({ rgb: `rgb(${rgb})`, share: Number((count / samples).toFixed(3)) })),
    meanLuminance: Number((luminosity / samples).toFixed(3)),
    edgeDensity: Number((edgeHits / Math.max(1, edgeSamples)).toFixed(3)),
    visualCenter,
    horizontalBalance: Number((Math.min(leftMass, rightMass) / Math.max(1, Math.max(leftMass, rightMass))).toFixed(3)),
    blankBandRatio: Number((blankBands / bandCount).toFixed(3)),
    confidence: "estimated"
  };
}

function sectionSignature(section) {
  const columns = section.gridColumns && section.gridColumns !== "none" ? section.gridColumns.trim().split(/\s+/).length : 0;
  const aspect = section.width ? Math.round((section.height / section.width) * 4) / 4 : 0;
  return `${section.display}:${columns}:${section.flexDirection}:${aspect}`;
}

function normalizeVisionFinding(finding, index) {
  return {
    id: finding.id || `vision:${index + 1}`,
    fingerprint: finding.fingerprint,
    critic: "vision",
    category: finding.category || "composition",
    severity: Number.isInteger(finding.severity) ? finding.severity : 2,
    blocker: Boolean(finding.blocker),
    repairKind: finding.repairKind,
    message: finding.message || finding.issue,
    evidence: finding.evidence || "Vision model whole-page assessment.",
    impact: finding.impact,
    rootCause: finding.rootCause,
    recommendation: finding.recommendation || finding.repair,
    successCriterion: finding.successCriterion,
    forbiddenFixes: finding.forbiddenFixes || [],
    viewport: finding.viewport || null,
    region: finding.region || null,
    files: finding.files || []
  };
}

export async function analyzeCaptureVisuals(capture, options = {}) {
  const artDirection = options.visionReport ? scoreVisionReport(options.visionReport) : null;
  const metrics = [];
  for (const item of capture.captures) metrics.push({ name: item.name, ...(await analyzeScreenshot(item.screenshot)) });
  const findings = [];
  const observations = [];
  for (const item of capture.captures) {
    const metric = metrics.find((entry) => entry.name === item.name);
    const evidence = item.evidence;
    observations.push({
      viewport: item.name,
      visualCenter: metric.visualCenter,
      horizontalBalance: metric.horizontalBalance,
      blankBandRatio: metric.blankBandRatio,
      sectionCount: evidence.sections?.length || evidence.landmarks.sections
    });
    const runtimeFailures = [
      ...(evidence.runtime?.pageErrors || []),
      ...(evidence.runtime?.failedRequests || [])
    ];
    if (runtimeFailures.length) {
      findings.push({
        id: `runtime-failure:${item.name}`,
        critic: "browser-readiness",
        category: "functionality",
        severity: 3,
        blocker: true,
        message: `${item.name} produced browser runtime or network failures.`,
        evidence: JSON.stringify(runtimeFailures.slice(0, 5)),
        recommendation: "Fix uncaught exceptions and required resource failures, then recapture the same viewport.",
        viewport: item.name
      });
    }
    if (evidence.runtime?.consoleErrors?.length) {
      findings.push({
        id: `console-error:${item.name}`,
        critic: "browser-readiness",
        category: "functionality",
        severity: 2,
        message: `${item.name} emitted console errors.`,
        evidence: evidence.runtime.consoleErrors.slice(0, 5).join(" | "),
        recommendation: "Resolve application console errors or explicitly prove that a third-party message is non-impacting.",
        viewport: item.name
      });
    }
    const accessibility = evidence.accessibility || {};
    if (accessibility.unnamedInteractive?.length || accessibility.missingAlt?.length || accessibility.duplicateIds?.length) {
      findings.push({
        id: `accessibility-basics:${item.name}`,
        critic: "browser-accessibility",
        category: "accessibility",
        severity: 2,
        message: `${item.name} has basic accessible-name, image-alt, or duplicate-ID failures.`,
        evidence: JSON.stringify({
          unnamedInteractive: accessibility.unnamedInteractive?.slice(0, 5) || [],
          missingAlt: accessibility.missingAlt?.slice(0, 5) || [],
          duplicateIds: accessibility.duplicateIds?.slice(0, 5) || []
        }),
        recommendation: "Give every interactive control an accessible name, define intentional image alternatives, and make IDs unique.",
        viewport: item.name
      });
    }
    if (evidence.scroll.width > item.viewport.width + 2) {
      findings.push({
        id: `overflow:${item.name}`,
        critic: "responsive",
        category: "responsive",
        severity: 3,
        message: `${item.name} has horizontal overflow.`,
        evidence: `${evidence.scroll.width}px document width exceeds the ${item.viewport.width}px viewport.`,
        recommendation: "Locate the overflowing region and replace fixed widths or off-canvas positioning with a bounded responsive rule.",
        viewport: item.name
      });
    }
    if (metric.horizontalBalance < 0.28 && metric.edgeDensity > 0.01) {
      findings.push({
        id: `visual-imbalance:${item.name}`,
        critic: "pixel-composition",
        category: "composition",
        severity: 1,
        message: `${item.name} has strongly asymmetric aggregate visual mass that needs semantic confirmation.`,
        evidence: `Estimated visual center x=${metric.visualCenter.x}; horizontal balance=${metric.horizontalBalance}.`,
        recommendation: "Rebalance the focal object, headline measure, or negative space while preserving intentional asymmetry.",
        viewport: item.name,
        region: "whole page"
      });
    }
    if (metric.blankBandRatio > 0.42) {
      findings.push({
        id: `blank-space:${item.name}`,
        critic: "pixel-composition",
        category: "rhythm",
        severity: 1,
        message: `${item.name} contains unusually many visually empty horizontal bands.`,
        evidence: `Estimated blank-band ratio=${metric.blankBandRatio}.`,
        recommendation: "Inspect section padding and content staging; keep deliberate pauses but remove accidental dead zones.",
        viewport: item.name,
        region: "whole page"
      });
    }
    const sections = evidence.sections || [];
    const counts = new Map();
    for (const section of sections) {
      const signature = sectionSignature(section);
      counts.set(signature, (counts.get(signature) || 0) + 1);
    }
    const repeated = [...counts.values()].sort((a, b) => b - a)[0] || 0;
    if (sections.length >= 4 && repeated >= Math.ceil(sections.length * 0.6)) {
      findings.push({
        id: `repetitive-rhythm:${item.name}`,
        critic: "dom-composition",
        category: "rhythm",
        severity: 1,
        message: `${item.name} may repeat one measured section archetype across most of the page.`,
        evidence: `${repeated} of ${sections.length} measured sections share one layout signature.`,
        recommendation: "Introduce one structural climax and avoid repeating the same split/card composition in adjacent sections.",
        viewport: item.name,
        region: "section sequence"
      });
    }
    if (item.name === "desktop" && sections.length >= 3) {
      const displayHeadings = (evidence.headings || []).filter((heading) => Number.parseFloat(heading.fontSize) >= 48);
      if (displayHeadings.length >= Math.ceil(sections.length * 0.75)) {
        findings.push({
          id: "repeated-display-scale:desktop",
          critic: "dom-composition",
          category: "typography",
          severity: 1,
          message: "Large display typography is repeated across most major sections.",
          evidence: `${displayHeadings.length} headings are at least 48px across ${sections.length} measured sections.`,
          recommendation: "Keep the hero’s extreme scale, then create more contrast in later chapters with one quieter information-led section.",
          viewport: "desktop",
          region: "section headings"
        });
      }
    }
  }
  const desktopCapture = capture.captures.find((item) => item.name === "desktop");
  const mobileCapture = capture.captures.find((item) => item.name === "mobile");
  if (desktopCapture && mobileCapture) {
    const desktopScreens = desktopCapture.evidence.scroll.height / desktopCapture.viewport.height;
    const mobileScreens = mobileCapture.evidence.scroll.height / mobileCapture.viewport.height;
    if (mobileScreens > 6.5 && mobileScreens / desktopScreens > 1.5) {
      findings.push({
        id: "mobile-rhythm-expansion",
        critic: "responsive",
        category: "responsive",
        severity: 1,
        message: "The mobile composition expands into a substantially longer reading experience.",
        evidence: `Desktop spans ${desktopScreens.toFixed(1)} viewport heights; mobile spans ${mobileScreens.toFixed(1)}.`,
        recommendation: "Tighten mobile chapter spacing and product/detail stacking without shrinking touch targets or collapsing the narrative.",
        viewport: "mobile",
        region: "whole page"
      });
    }
  }
  if (options.visionReport?.findings) {
    findings.push(...options.visionReport.findings.map(normalizeVisionFinding).filter((finding) => finding.message));
  }
  return {
    critic: options.visionReport ? "whole-page-vision+pixel" : "pixel-and-dom-evidence",
    visionMode: options.visionReport ? "vision-model" : "local-heuristic",
    limitation: options.visionReport ? null : "No vision-model report was supplied; pixel statistics and DOM geometry cannot judge semantics, emotional closure, asset quality, or reference similarity.",
    metrics,
    observations,
    artDirection,
    qualityGate: evaluateArtDirection(artDirection, options.mode || "balanced"),
    findings
  };
}
