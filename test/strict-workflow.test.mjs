import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createWorkflow,
  inspectPipelineStatus
} from "../packages/orchestrator/src/index.mjs";
import { handleRequest } from "../packages/mcp-server/src/server.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("a zero-reference brief enters visual direction instead of blocking on references", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "design-lagann-run-"));
  const result = await createWorkflow({
    projectRoot,
    brief: {
      goal: "Create a distinctive weekend bakery reservation page.",
      mode: "super-quality",
      references: [],
      assets: [{
        id: "hero-pastry",
        role: "hero",
        visualIntent: "food",
        description: "A real art-directed laminated pastry photograph."
      }]
    }
  });
  assert.equal(result.phase, "external-desktop-image-generation-required");
  assert.equal(result.references.length, 0);
  assert.equal(result.adaptivePlan.profile, "quality");
  assert.equal(result.displayLabel, "QUALITY");
  assert.match(result.modeBanner, /QUALITY/);
  assert.equal(result.deliveryPolicy.designDelegationToSites, false);
  assert.equal(result.status.current.id, "direction-frames");
  assert.ok(result.plan.candidates.length >= 3);
  assert.doesNotMatch(result.message, /references-required/i);
  const runState = JSON.parse(await readFile(
    path.join(projectRoot, ".design-lagann", "run-state.json"),
    "utf8"
  ));
  assert.equal(runState.current.id, "direction-frames");
});

test("strict status exposes the current and next ordered gates", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "design-lagann-status-"));
  await createWorkflow({
    projectRoot,
    brief: {
      goal: "Create a local editorial page.",
      references: []
    }
  });
  const status = await inspectPipelineStatus(projectRoot);
  assert.equal(status.mode.label, "BALANCED");
  assert.equal(status.acceptancePolicy.id, "elite-v1");
  assert.equal(status.pipelinePolicy.strictStageOrder, true);
  assert.equal(status.pipelinePolicy.externalSiteBuilderRequired, false);
  assert.equal(status.readiness.implementation, false);
  assert.equal(status.current.id, "direction-frames");
  assert.equal(status.next.id, "approved-selected-pair");
});

test("auto mode recognizes missing food photography as production-asset risk", async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "design-lagann-food-risk-"));
  const result = await createWorkflow({
    projectRoot,
    brief: {
      goal: "Launch a weekend pastry pickup page.",
      mode: "auto",
      references: [],
      assets: [{
        id: "seasonal-danish",
        role: "hero",
        visualIntent: "food",
        description: "A tactile seasonal Danish photograph."
      }]
    }
  });
  assert.equal(result.adaptivePlan.profile, "quality");
  assert.equal(result.adaptivePlan.displayLabel, "QUALITY");
  assert.equal(result.adaptivePlan.signals.requiresRasterGeneration, true);
  assert.equal(
    result.adaptivePlan.tasks.find((task) => task.id === "generate-assets-batch").status,
    "run"
  );
  assert.ok(
    result.adaptivePlan.tasks
      .find((task) => task.id === "implement-signature-skeleton")
      .dependsOn.includes("generate-assets-batch")
  );
});

test("activation instructions carry the scoped, host-aware design contract", async () => {
  const skill = await readFile(path.join(repositoryRoot, "skills", "design-lagann", "SKILL.md"), "utf8");
  assert.match(skill, /create.+redesign.+edit.+extend.+repair.+transform/is);
  assert.match(skill, /Fast.+Balanced.+Quality/is);
  assert.match(skill, /smallest coherent modification scope/i);
  assert.match(skill, /project-context\.json/);
  assert.match(skill, /Do not automatically add particles/i);
  assert.match(skill, /prefers-reduced-motion/);
  assert.match(skill, /Never call synthetic imagery real photography/i);
});

test("MCP exposes one primary run/status surface plus strict production-asset binding", async () => {
  const listed = await handleRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  });
  const tools = new Map(listed.result.tools.map((tool) => [tool.name, tool]));
  for (const name of [
    "run_design_lagann_workflow",
    "get_design_lagann_status",
    "bind_production_assets"
  ]) {
    assert.ok(tools.has(name), `${name} must be exposed`);
  }
  assert.match(tools.get("run_design_lagann_workflow").description, /create, redesign, edit, extend, repair, or transform/i);
  assert.match(tools.get("bind_production_assets").description, /rejects direction-frame reuse/i);
  assert.doesNotMatch(tools.get("run_design_lagann_workflow").description, /Impeccable|Visual Orienter/i);
});
