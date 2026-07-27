#!/usr/bin/env node
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { inspectRepository } from "../../orchestrator/src/inspect.mjs";
import {
  bindAssetAcquisition,
  cacheReference,
  createAdaptivePlan,
  critiqueProject,
  inspectPipelineStatus,
  listCachedReferences,
  planDesignLagannRun
} from "../../orchestrator/src/index.mjs";
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
} from "../../orchestrator/src/orientation.mjs";
import { reviewProject } from "../../orchestrator/src/review.mjs";
import { captureRegions, DEFAULT_VIEWPORTS } from "../../browser/src/index.mjs";
import { NativeDesignDnaProvider } from "../../design-dna-adapter/src/index.mjs";
import { detectExternalIntegrations } from "../../impeccable-adapter/src/index.mjs";
import { compareReports, planRepair } from "../../visual-evaluator/src/index.mjs";
import { createMotionChoreography, createReferenceAcquisitionPlan } from "../../workflow-engine/src/index.mjs";

const TOOLS = [
  {
    name: "run_design_lagann_workflow",
    description: "Classify, inspect, and plan a scoped create, redesign, edit, extend, repair, or transform workflow with persistent context and host-aware assets.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        request: { type: "object" },
        host: { type: "string", enum: ["codex", "claude"] }
      },
      required: ["projectRoot", "request"]
    }
  },
  {
    name: "get_design_lagann_status",
    description: "Inspect the artifact-backed pipeline ledger: active mode, current stage, completed gates, missing evidence, next gate, and acceptance readiness.",
    inputSchema: {
      type: "object",
      properties: { projectRoot: { type: "string" } },
      required: ["projectRoot"]
    }
  },
  {
    name: "plan_reference_acquisition",
    description: "Plan autonomous, rights-aware reference search or generated raster direction frames using the current host's capabilities. The host executes the returned actions without making the user source references.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "object" },
        host: { type: "string", enum: ["codex", "claude", "cursor"] },
        strategy: { type: "string", enum: ["auto", "search", "generate", "hybrid"] },
        capabilities: { type: "object" }
      },
      required: ["brief"]
    }
  },
  {
    name: "plan_motion_choreography",
    description: "Create a complete motion binding for important sections and interactions, including calibrated timings, coverage gaps, performance rules, and meaningful reduced-motion behavior.",
    inputSchema: {
      type: "object",
      properties: {
        thesis: { type: "string" },
        sections: { type: "array", items: { type: "object" } },
        interactions: { type: "array", items: { type: "object" } }
      }
    }
  },
  {
    name: "bind_production_assets",
    description: "Bind separately generated or acquired production raster/photo files to required asset roles. Validates local paths, real raster signatures, dimensions, provenance, and SHA-256, and rejects direction-frame reuse.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        submissions: {
          oneOf: [
            { type: "array", minItems: 1, items: { type: "object" } },
            {
              type: "object",
              properties: {
                assets: { type: "array", minItems: 1, items: { type: "object" } }
              },
              required: ["assets"]
            }
          ]
        }
      },
      required: ["projectRoot", "submissions"]
    }
  },
  {
    name: "capture_repair_regions",
    description: "Capture selector-bound regional screenshots with exact bounding boxes, crop hashes, and full-page screenshot lineage. Crops support repair only and never satisfy final acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        outDir: { type: "string" },
        id: { type: "string" },
        viewport: { type: "string", enum: ["desktop", "tablet", "mobile"] },
        regions: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              selector: { type: "string" },
              padding: { type: "number", minimum: 0, maximum: 160 }
            },
            required: ["selector"]
          }
        }
      },
      required: ["url", "outDir", "regions"]
    }
  },
  {
    name: "plan_adaptive_workflow",
    description: "Create a deterministic Fast, Balanced, or Quality execution graph. Profiles change effort and iteration depth only; every profile retains the same acceptance contract.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        brief: { type: "object" },
        profile: { type: "string", enum: ["fast", "balanced", "quality", "super-quality", "superquality", "super_quality", "auto", "economy"] },
        signals: { type: "object" }
      },
      required: ["projectRoot", "brief"]
    }
  },
  {
    name: "cache_reference",
    description: "Capture a user-provided URL or local file, extract reusable visual relationships, and store a content-validated cache entry. Cache hits never count as current acceptance evidence.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        reference: { type: "object" },
        vision: { type: "object" }
      },
      required: ["projectRoot", "reference"]
    }
  },
  {
    name: "list_reference_cache",
    description: "List reusable local relationship-evidence cache entries and their available, stale, partial, or corrupt status.",
    inputSchema: {
      type: "object",
      properties: { projectRoot: { type: "string" } },
      required: ["projectRoot"]
    }
  },
  {
    name: "inspect_repository",
    description: "Inspect framework, package manager, routes, styles, assets, and protected files.",
    inputSchema: { type: "object", properties: { projectRoot: { type: "string" } }, required: ["projectRoot"] }
  },
  {
    name: "detect_integrations",
    description: "Detect optional local pipeline providers without modifying them. Provider identities remain internal implementation details.",
    inputSchema: { type: "object", properties: { projectRoot: { type: "string" } }, required: ["projectRoot"] }
  },
  {
    name: "extract_design_dna",
    description: "Extract computed visual relationships from a browser capture manifest.",
    inputSchema: {
      type: "object",
      properties: { capture: { type: "object" }, role: { type: "string" } },
      required: ["capture"]
    }
  },
  {
    name: "synthesize_project_dna",
    description: "Synthesize one original implementation contract from independently extracted reference relationships.",
    inputSchema: {
      type: "object",
      properties: { references: { type: "array" }, brief: { type: "object" } },
      required: ["references", "brief"]
    }
  },
  {
    name: "create_visual_orientation_plan",
    description: "Create and persist 3-5 desktop/mobile creative-reference prompts. This tool never calls GPT Image 2 or claims image generation; images must be generated externally.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        brief: { type: "object" },
        projectDna: { type: "object" },
        candidateCount: { type: "integer", minimum: 3, maximum: 5 },
        humanApproval: { type: "object" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "bind_visual_orientation_images",
    description: "Hash and bind externally generated local desktop/mobile mockups to emitted prompt hashes and declared generation provenance. This tool does not generate or judge images.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        submissions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "object" }
        },
        plan: { type: "object" }
      },
      required: ["projectRoot", "submissions"]
    }
  },
  {
    name: "select_visual_orientation",
    description: "Validate a separately produced, evidence-bound critic report and compute a deterministic recommendation. Adoption still requires explicit human approval; this tool never treats a generated image as ground truth.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        report: { type: "object" },
        humanApproval: { type: "object" },
        plan: { type: "object" },
        evidence: { type: "object" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "create_optimized_visual_orientation_plan",
    description: "Create the optimized desktop-candidates/selected-mobile stage plan. It emits 3-5 desktop requests, commits deferred mobile requests, and requires real externally generated files. Only a later human-approved candidate may receive an authorized mobile request.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        brief: { type: "object" },
        projectDna: { type: "object" },
        candidateCount: { type: "integer", minimum: 3, maximum: 5 },
        humanApproval: { type: "object" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "bind_optimized_orientation_desktops",
    description: "Bind exactly one externally generated desktop frame for every optimized candidate. Mobile files are rejected and desktop-only evidence cannot become a selected reference.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        submissions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "object" }
        },
        plan: { type: "object" }
      },
      required: ["projectRoot", "submissions"]
    }
  },
  {
    name: "select_optimized_orientation_desktop",
    description: "Validate independent criticism of every bound desktop candidate and compute a deterministic recommendation. Only explicit approval of an eligible direction emits one hash-bound selected-mobile generation request; no visual reference is created.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        report: { type: "object" },
        humanApproval: { type: "object" },
        plan: { type: "object" },
        evidence: { type: "object" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "bind_optimized_selected_mobile",
    description: "Bind one externally generated mobile frame to the approved candidate, exact deferred prompt, desktop hash, approval timestamp, and mobile request. Unselected or pre-approval mobile files are rejected.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        submission: { type: "object" },
        plan: { type: "object" },
        desktopEvidence: { type: "object" },
        desktopSelection: { type: "object" }
      },
      required: ["projectRoot", "submission"]
    }
  },
  {
    name: "finalize_optimized_visual_orientation",
    description: "Validate an independent, hash-bound desktop/mobile pair critic report and enforce selected-pair quality floors before persisting a creative reference. This never grants implementation acceptance; final proof still requires fresh rendered desktop/tablet/mobile evidence.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        report: { type: "object" },
        plan: { type: "object" },
        desktopEvidence: { type: "object" },
        desktopSelection: { type: "object" },
        evidence: { type: "object" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "bind_visual_reference_to_build",
    description: "Bind a human-approved creative reference and current build captures for later semantic comparison. Pixel similarity is explicitly excluded as an acceptance criterion.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        buildCaptures: {
          type: "array",
          minItems: 1,
          items: { type: "object" }
        },
        issuedAt: { type: "string" },
        requiredViewports: { type: "array", items: { type: "string" } },
        rubricIds: { type: "array", items: { type: "string" } },
        criticRequirements: { type: "object" },
        contractUpdatedAt: { type: "string" },
        selectedVisualReference: { type: "object" },
        plan: { type: "object" },
        typeManifest: { type: "object" }
      },
      required: ["projectRoot", "buildCaptures", "issuedAt"]
    }
  },
  {
    name: "compare_visual_reference",
    description: "Validate and persist an independent semantic reference-vs-build report against the evidence binding. This tool refuses unverifiable fidelity claims and does not grant final design acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        report: { type: "object" },
        binding: { type: "object" },
        supportingMetrics: { type: "array", items: { type: "object" } },
        evaluatedAt: { type: "string" },
        maxAgeMs: { type: "number", minimum: 0 }
      },
      required: ["projectRoot", "report"]
    }
  },
  {
    name: "critique_project",
    description: "Run the supporting source-pattern scan. This is not a whole-page visual judgment.",
    inputSchema: { type: "object", properties: { projectRoot: { type: "string" } }, required: ["projectRoot"] }
  },
  {
    name: "review_project",
    description: "Capture desktop/tablet/mobile, bind an independent semantic critic to screenshot hashes, enforce the immutable elite-v1 anti-generic quality contract, plan structural-first repairs, execute verification, and compare before/after evidence.",
    inputSchema: {
      type: "object",
      properties: {
        projectRoot: { type: "string" },
        url: { type: "string" },
        runId: { type: "string" },
        resumeRun: { type: "string", description: "Existing run ID awaiting an independently produced after-vision report." },
        mode: { type: "string", enum: ["economy", "fast", "balanced", "quality", "super-quality", "superquality", "super_quality", "auto"] },
        visionReport: { type: "string", description: "Path to a screenshot-bound v0.4 semantic vision report JSON." },
        afterVisionReport: { type: "string" },
        visionCommand: { type: "string" },
        agentCommand: { type: "string" },
        buildCommand: { type: "string" },
        testCommand: { type: "string" },
        interactionCommand: { type: "string" },
        accessibilityCommand: {
          type: "string",
          description: "Explicit WCAG/accessibility verification command. Browser baselines alone remain partial evidence."
        },
        rollbackCommand: { type: "string" }
      },
      required: ["projectRoot"]
    }
  },
  {
    name: "plan_repair",
    description: "Select and order the highest-impact 3–5 critique findings.",
    inputSchema: {
      type: "object",
      properties: { findings: { type: "array" }, limit: { type: "number", minimum: 1, maximum: 5 } },
      required: ["findings"]
    }
  },
  {
    name: "compare_reports",
    description: "Compare semantic fingerprints and art-direction scores; fewer findings alone can never pass.",
    inputSchema: {
      type: "object",
      properties: { before: { type: "object" }, after: { type: "object" } },
      required: ["before", "after"]
    }
  }
];

async function callTool(name, args) {
  if (name === "run_design_lagann_workflow") return planDesignLagannRun(args);
  if (name === "get_design_lagann_status") return inspectPipelineStatus(args.projectRoot);
  if (name === "plan_reference_acquisition") return createReferenceAcquisitionPlan(args);
  if (name === "plan_motion_choreography") return createMotionChoreography(args);
  if (name === "bind_production_assets") return bindAssetAcquisition(args);
  if (name === "capture_repair_regions") {
    const viewportName = args.viewport || "mobile";
    if (!DEFAULT_VIEWPORTS[viewportName]) throw new Error("viewport must be desktop, tablet, or mobile");
    return captureRegions({ ...args, viewport: DEFAULT_VIEWPORTS[viewportName] });
  }
  if (name === "plan_adaptive_workflow") return createAdaptivePlan(args);
  if (name === "cache_reference") return cacheReference(args);
  if (name === "list_reference_cache") return listCachedReferences(args);
  if (name === "inspect_repository") return inspectRepository(args.projectRoot);
  if (name === "detect_integrations") return detectExternalIntegrations(args.projectRoot);
  if (name === "extract_design_dna") return new NativeDesignDnaProvider().extract(args);
  if (name === "synthesize_project_dna") return new NativeDesignDnaProvider().synthesize(args.references, args.brief);
  if (name === "create_visual_orientation_plan") return createOrientationPlan(args);
  if (name === "bind_visual_orientation_images") return bindOrientationImages(args);
  if (name === "select_visual_orientation") return evaluateOrientation(args);
  if (name === "create_optimized_visual_orientation_plan") return createOptimizedOrientationPlan(args);
  if (name === "bind_optimized_orientation_desktops") return bindOptimizedDesktopOrientationImages(args);
  if (name === "select_optimized_orientation_desktop") return evaluateOptimizedDesktopOrientation(args);
  if (name === "bind_optimized_selected_mobile") return bindOptimizedSelectedMobileOrientation(args);
  if (name === "finalize_optimized_visual_orientation") return finalizeOptimizedOrientation(args);
  if (name === "bind_visual_reference_to_build") return bindVisualReferenceToBuild(args);
  if (name === "compare_visual_reference") return compareVisualReference(args);
  if (name === "critique_project") return critiqueProject(args.projectRoot);
  if (name === "review_project") return reviewProject(args);
  if (name === "plan_repair") return planRepair(args.findings, args.limit);
  if (name === "compare_reports") return compareReports(args.before, args.after);
  throw new Error(`Unknown tool: ${name}`);
}

export async function handleRequest(request) {
  if (request.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: request.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "design-lagann", version: "1.0.0" }
      }
    };
  }
  if (request.method === "tools/list") {
    return { jsonrpc: "2.0", id: request.id, result: { tools: TOOLS } };
  }
  if (request.method === "tools/call") {
    try {
      const value = await callTool(request.params?.name, request.params?.arguments ?? {});
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] }
      };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { isError: true, content: [{ type: "text", text: error.message }] }
      };
    }
  }
  if (request.method?.startsWith("notifications/")) return null;
  return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: `Method not found: ${request.method}` } };
}

async function serve() {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let response;
    try {
      response = await handleRequest(JSON.parse(line));
    } catch (error) {
      response = { jsonrpc: "2.0", id: null, error: { code: -32700, message: error.message } };
    }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  serve().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
