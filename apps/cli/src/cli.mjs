#!/usr/bin/env node
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { exists, parseArgs, readJson, writeJson } from "../../../packages/shared/src/index.mjs";
import { inspectRepository } from "../../../packages/orchestrator/src/inspect.mjs";
import {
  bindAssetAcquisition,
  buildDesignArtifacts,
  cacheReference,
  critiqueProject,
  initializeProject,
  inspectPipelineStatus,
  listCachedReferences,
  loadJsonList,
  planDesignLagannRun
} from "../../../packages/orchestrator/src/index.mjs";
import {
  bindOptimizedDesktopOrientationImages,
  bindOptimizedSelectedMobileOrientation,
  bindOrientationImages,
  bindVisualReferenceToBuild,
  compareVisualReference,
  createOptimizedOrientationPlan,
  createOrientationPlan,
  evaluateOptimizedDesktopOrientation,
  finalizeOptimizedOrientation,
  evaluateOrientation
} from "../../../packages/orchestrator/src/orientation.mjs";
import { reviewProject } from "../../../packages/orchestrator/src/review.mjs";
import { captureRegions, captureUrl, DEFAULT_VIEWPORTS } from "../../../packages/browser/src/index.mjs";
import { NativeDesignDnaProvider } from "../../../packages/design-dna-adapter/src/index.mjs";
import { detectExternalIntegrations } from "../../../packages/impeccable-adapter/src/index.mjs";
import { compareReports, planRepair } from "../../../packages/visual-evaluator/src/index.mjs";
import { createReferenceAcquisitionPlan } from "../../../packages/workflow-engine/src/index.mjs";

const WELCOME = `Welcome to Design Lagann.

Create something new or evolve an existing interface without losing approved work.
The workflow inspects first, plans the smallest safe scope, builds complete states,
and verifies the rendered result.

Start here:
  design-lagann run --project <root> --brief <brief.json>

Need the full command list?
  design-lagann help
`;

const HELP = `Design Lagann 1.0.0

Plan the experience. Approve the direction. Ship verified local source.

Usage: design-lagann <command> [options]

Commands:
  run           Classify, inspect, and plan a Design Lagann project
                (--project, --brief, --operation create|redesign|edit|extend|repair|transform,
                 --profile fast|balanced|quality, --host codex|claude)
  status        See what is complete, what is waiting, and what happens next
                (--project)
  asset-bind    Bind separately generated/acquired production raster assets
                (--project, --submissions)
  plan          Save the Fast/Balanced/Quality project plan
                (--project, --brief, --profile fast|balanced|quality, --host codex|claude)
  reference     Manage the content-addressed relationship-evidence cache:
                  design-lagann reference acquire --goal "..." --host codex|claude|cursor
                  design-lagann reference add --project <root> --url <url-or-file>
                  design-lagann reference list --project <root>
  init          Prepare a project for Design Lagann (--project, --goal, --brief)
  inspect       Inspect a repository (--project, --out)
  integrations  Detect optional local pipeline providers (--project)
  capture       Capture a URL with Playwright (--url, --out, --id)
  capture-regions
                Capture selector-bound repair crops with full-page lineage
                (--url, --regions <json>, --viewport desktop|tablet|mobile, --out, --id)
  extract-dna   Extract reusable visual relationships from capture.json (--capture, --out, --role)
  synthesize    Synthesize local implementation-contract evidence (--brief, --dna a.json,b.json, --out)
  blueprint     Write DESIGN.md and blueprint (--project, --brief, --dna)
  critique      Run the supporting source-pattern scan (--project, --out)
  repair-plan   Select the top 3–5 issues (--critique, --out)
  compare       Compare screenshot-bound art-direction reports (--before, --after, --out)
  orientation-plan
                Emit and persist 3–5 direction-frame generation requests
                (--project, --brief, --dna, --candidate-count)
  orientation-bind
                Bind externally generated local mockups to prompt hashes and provenance
                (--project, --submissions, --plan)
  orientation-select
                Validate independent criticism, recommend deterministically, and preserve
                human approval (--project, --report, --approval, --plan, --evidence)
  orientation-opt-plan
                Emit 3вЂ“5 desktop candidate prompts and defer every mobile generation
                (--project, --brief, --dna, --candidate-count)
  orientation-opt-desktop-bind
                Bind one external desktop frame per candidate (--project, --submissions)
  orientation-opt-desktop-select
                Validate independent desktop criticism and emit one approved mobile request
                (--project, --report, --approval)
  orientation-opt-mobile-bind
                Bind only the selected candidate's post-approval mobile frame
                (--project, --submission)
  orientation-opt-finalize
                Validate independent selected-pair criticism and create a creative reference
                (--project, --report)
  reference-bind
                Bind an approved visual reference to current build captures for semantic
                comparison (--project, --input)
  reference-compare
                Validate and persist an independent reference-vs-build critic report
                (--project, --report, --binding, --supporting, --evaluated-at, --max-age-ms)
  review        Review a local project with browser, vision, and repair evidence
                (--project, --url, --vision-command, --vision-report,
                --agent-command, --build-command, --test-command,
                --interaction-command, --accessibility-command, --rollback-command,
                --profile fast|balanced|quality)
                Resume final proof with --resume-run and --after-vision-report
  create        Deprecated alias for run (--project, --brief)
`;

function required(options, key) {
  if (!options[key]) throw new Error(`Missing required option --${key}`);
  return options[key];
}

function output(value) {
  const status = value?.kind === "design-lagann-strict-pipeline-status"
    ? value
    : value?.status;
  const banner = value?.modeBanner ||
    value?.adaptivePlan?.modeBanner ||
    status?.mode?.banner;
  if (banner) {
    const quality = value?.qualityBarDisclosure?.statement ||
      value?.adaptivePlan?.qualityBarDisclosure?.statement ||
      "elite-v1 is invariant across modes.";
    const reason = value?.selectionReason ||
      value?.adaptivePlan?.selectionReason ||
      status?.mode?.statement ||
      "The persisted execution profile is active.";
    const current = status?.current?.label || value?.phase || "plan / intake";
    const nextGate = status?.current?.missing?.[0]?.message ||
      value?.message ||
      "Complete the current stage evidence.";
    process.stderr.write(
      `${banner}\nWhy this mode: ${reason}\nQuality promise: ${quality}\nNow: ${current}\nNext: ${nextGate}\n`
    );
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function briefFrom(options, { resumeExisting = false } = {}) {
  if (
    resumeExisting &&
    !options.brief &&
    !options.goal &&
    !options.profile &&
    !options.mode
  ) {
    const persisted = path.join(
      path.resolve(options.project || process.cwd()),
      ".design-lagann",
      "brief.json"
    );
    if (await exists(persisted)) return readJson(persisted);
  }
  const profile = options.profile || options.mode || "balanced";
  if (options.brief) {
    const brief = await readJson(path.resolve(options.brief));
    return options.profile || options.mode
      ? { ...brief, mode: profile, executionProfile: profile, acceptancePolicy: "elite-v1" }
      : brief;
  }
  return {
    goal: options.goal || "Create a coherent, original, responsive frontend.",
    references: [],
    mode: profile,
    executionProfile: profile,
    acceptancePolicy: "elite-v1"
  };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    process.stdout.write(WELCOME);
    return;
  }
  const { command, options } = parseArgs(argv);
  if (command === "help" || command === "--help" || options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (command === "status") {
    output(await inspectPipelineStatus(options.project || process.cwd()));
    return;
  }
  if (command === "asset-bind") {
    output(await bindAssetAcquisition({
      projectRoot: options.project || process.cwd(),
      submissions: await readJson(path.resolve(required(options, "submissions")))
    }));
    return;
  }
  if (command === "run") {
    const request = await briefFrom(options, { resumeExisting: true });
    output(await planDesignLagannRun({
      projectRoot: options.project || process.cwd(),
      request: {
        ...request,
        ...(options.operation ? { operation: options.operation } : {})
      },
      host: options.host || process.env.DESIGN_LAGANN_HOST || "codex"
    }));
    return;
  }
  if (command === "inspect") {
    const result = await inspectRepository(options.project || process.cwd());
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "integrations") {
    output(await detectExternalIntegrations(path.resolve(options.project || process.cwd())));
    return;
  }
  if (command === "plan") {
    const brief = await briefFrom(options);
    output(await planDesignLagannRun({
      projectRoot: options.project || process.cwd(),
      request: {
        ...brief,
        ...(options.operation ? { operation: options.operation } : {}),
        profile: options.profile || options.mode || brief.executionProfile || brief.mode
      },
      host: options.host || process.env.DESIGN_LAGANN_HOST || "codex"
    }));
    return;
  }
  if (command === "reference") {
    const action = options._[0] || "list";
    if (action === "acquire") {
      output(createReferenceAcquisitionPlan({
        brief: await briefFrom(options),
        host: options.host || process.env.DESIGN_LAGANN_HOST || "codex",
        strategy: options.strategy || "auto"
      }));
      return;
    }
    if (action === "list") {
      output(await listCachedReferences({ projectRoot: options.project || process.cwd() }));
      return;
    }
    if (action === "add") {
      const source = options.url || options.path || options._[1];
      if (!source) throw new Error("Missing reference source. Pass --url or --path.");
      output(await cacheReference({
        projectRoot: options.project || process.cwd(),
        reference: {
          url: source,
          role: options.role || "visual principle",
          reason: options.reason || "User-provided primary reference",
          strength: options.strength || "primary",
          approved: options.approved === true || options.approved === "true"
        }
      }));
      return;
    }
    throw new Error("reference action must be acquire, add, or list");
  }
  if (command === "init") {
    const result = await initializeProject({ projectRoot: options.project || process.cwd(), brief: await briefFrom(options) });
    output(result);
    return;
  }
  if (command === "capture") {
    output(await captureUrl({ url: required(options, "url"), outDir: options.out || ".design-lagann/references", id: options.id }));
    return;
  }
  if (command === "capture-regions") {
    const viewportName = options.viewport || "mobile";
    if (!DEFAULT_VIEWPORTS[viewportName]) {
      throw new Error("--viewport must be desktop, tablet, or mobile");
    }
    output(await captureRegions({
      url: required(options, "url"),
      outDir: options.out || ".design-lagann/regions",
      id: options.id,
      regions: await readJson(path.resolve(required(options, "regions"))),
      viewport: DEFAULT_VIEWPORTS[viewportName]
    }));
    return;
  }
  if (command === "extract-dna") {
    const provider = new NativeDesignDnaProvider();
    const result = await provider.extract({
      capture: await readJson(path.resolve(required(options, "capture"))),
      role: options.role,
      ...(options.vision ? { vision: await readJson(path.resolve(options.vision)) } : {})
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "synthesize") {
    const provider = new NativeDesignDnaProvider();
    const result = await provider.synthesize(await loadJsonList(required(options, "dna")), await readJson(path.resolve(required(options, "brief"))));
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "blueprint") {
    const brief = await readJson(path.resolve(required(options, "brief")));
    const result = await buildDesignArtifacts({
      projectRoot: options.project || process.cwd(),
      resumeRun: options["resume-run"],
      brief,
      referenceDnas: await loadJsonList(required(options, "dna"))
    });
    output(result);
    return;
  }
  if (command === "critique") {
    const result = await critiqueProject(options.project || process.cwd());
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "repair-plan") {
    const report = await readJson(path.resolve(required(options, "critique")));
    const result = planRepair(report.findings ?? report, Number(options.limit || 5));
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "compare") {
    const result = compareReports(
      await readJson(path.resolve(required(options, "before"))),
      await readJson(path.resolve(required(options, "after")))
    );
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-plan") {
    const result = await createOrientationPlan({
      projectRoot: options.project || process.cwd(),
      brief: (options.brief || options.goal) ? await briefFrom(options) : undefined,
      projectDna: options.dna ? await readJson(path.resolve(options.dna)) : undefined,
      candidateCount: options["candidate-count"]
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-bind") {
    const result = await bindOrientationImages({
      projectRoot: options.project || process.cwd(),
      submissions: await readJson(path.resolve(required(options, "submissions"))),
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-select") {
    const result = await evaluateOrientation({
      projectRoot: options.project || process.cwd(),
      report: options.report ? await readJson(path.resolve(options.report)) : undefined,
      humanApproval: options.approval ? await readJson(path.resolve(options.approval)) : undefined,
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined,
      evidence: options.evidence ? await readJson(path.resolve(options.evidence)) : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-opt-plan") {
    const result = await createOptimizedOrientationPlan({
      projectRoot: options.project || process.cwd(),
      brief: (options.brief || options.goal) ? await briefFrom(options) : undefined,
      projectDna: options.dna ? await readJson(path.resolve(options.dna)) : undefined,
      candidateCount: options["candidate-count"]
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-opt-desktop-bind") {
    const result = await bindOptimizedDesktopOrientationImages({
      projectRoot: options.project || process.cwd(),
      submissions: await readJson(path.resolve(required(options, "submissions"))),
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-opt-desktop-select") {
    const result = await evaluateOptimizedDesktopOrientation({
      projectRoot: options.project || process.cwd(),
      report: options.report ? await readJson(path.resolve(options.report)) : undefined,
      humanApproval: options.approval ? await readJson(path.resolve(options.approval)) : undefined,
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined,
      evidence: options.evidence ? await readJson(path.resolve(options.evidence)) : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-opt-mobile-bind") {
    const result = await bindOptimizedSelectedMobileOrientation({
      projectRoot: options.project || process.cwd(),
      submission: await readJson(path.resolve(required(options, "submission"))),
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined,
      desktopEvidence: options["desktop-evidence"]
        ? await readJson(path.resolve(options["desktop-evidence"]))
        : undefined,
      desktopSelection: options["desktop-selection"]
        ? await readJson(path.resolve(options["desktop-selection"]))
        : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "orientation-opt-finalize") {
    const result = await finalizeOptimizedOrientation({
      projectRoot: options.project || process.cwd(),
      report: options.report ? await readJson(path.resolve(options.report)) : undefined,
      plan: options.plan ? await readJson(path.resolve(options.plan)) : undefined,
      desktopEvidence: options["desktop-evidence"]
        ? await readJson(path.resolve(options["desktop-evidence"]))
        : undefined,
      desktopSelection: options["desktop-selection"]
        ? await readJson(path.resolve(options["desktop-selection"]))
        : undefined,
      evidence: options.evidence ? await readJson(path.resolve(options.evidence)) : undefined
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "reference-bind") {
    const input = await readJson(path.resolve(required(options, "input")));
    const result = await bindVisualReferenceToBuild({
      ...input,
      projectRoot: options.project || process.cwd()
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "reference-compare") {
    const result = await compareVisualReference({
      projectRoot: options.project || process.cwd(),
      report: await readJson(path.resolve(required(options, "report"))),
      binding: options.binding ? await readJson(path.resolve(options.binding)) : undefined,
      supportingMetrics: options.supporting
        ? await readJson(path.resolve(options.supporting))
        : [],
      evaluatedAt: options["evaluated-at"],
      maxAgeMs: options["max-age-ms"] === undefined
        ? undefined
        : Number(options["max-age-ms"])
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "review") {
    const result = await reviewProject({
      projectRoot: options.project || process.cwd(),
      url: options.url,
      runId: options["run-id"],
      visionCommand: options["vision-command"] || process.env.DESIGN_LAGANN_VISION_COMMAND,
      visionReport: options["vision-report"],
      afterVisionReport: options["after-vision-report"],
      agentCommand: options["agent-command"] || process.env.DESIGN_LAGANN_AGENT_COMMAND,
      agentTimeout: options["agent-timeout"],
      buildCommand: options["build-command"],
      testCommand: options["test-command"],
      interactionCommand: options["interaction-command"],
      accessibilityCommand: options["accessibility-command"],
      verificationTimeout: options["verification-timeout"],
      mode: options.profile || options.mode,
      rollbackCommand: options["rollback-command"] || process.env.DESIGN_LAGANN_ROLLBACK_COMMAND
    });
    if (options.out) await writeJson(path.resolve(options.out), result);
    output(result);
    return;
  }
  if (command === "create") {
    const request = await briefFrom(options, { resumeExisting: true });
    output(await planDesignLagannRun({
      projectRoot: options.project || process.cwd(),
      request: { ...request, operation: "create" },
      host: options.host || process.env.DESIGN_LAGANN_HOST || "codex"
    }));
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${HELP}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`design-lagann: ${error.message}\n`);
    process.exitCode = 1;
  });
}
