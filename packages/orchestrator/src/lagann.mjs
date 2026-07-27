import path from "node:path";
import { mkdir } from "node:fs/promises";
import { exists, readJson, writeJson } from "../../shared/src/index.mjs";
import { inspectRepository } from "./inspect.mjs";
import {
  createExecutionPlan,
  createProjectContext,
  progressMessage,
  updateProjectContext
} from "../../workflow-engine/src/index.mjs";

export function designLagannPaths(projectRoot) {
  const root = path.resolve(projectRoot);
  const stateRoot = path.join(root, ".design-lagann");
  return {
    root,
    stateRoot,
    context: path.join(stateRoot, "project-context.json"),
    plan: path.join(stateRoot, "execution-plan.json")
  };
}

export async function loadDesignLagannContext(projectRoot) {
  const paths = designLagannPaths(projectRoot);
  return await exists(paths.context) ? createProjectContext(await readJson(paths.context)) : createProjectContext();
}

export async function saveDesignLagannContext(projectRoot, patch) {
  const paths = designLagannPaths(projectRoot);
  const current = await loadDesignLagannContext(projectRoot);
  const next = updateProjectContext(current, patch);
  await mkdir(paths.stateRoot, { recursive: true });
  await writeJson(paths.context, next);
  return next;
}

export async function planDesignLagannRun({ projectRoot, request = {}, host = "codex", capabilityOverrides = {} }) {
  const paths = designLagannPaths(projectRoot);
  const hasProject = await exists(paths.root);
  const context = await loadDesignLagannContext(paths.root);
  let inspection = { exists: hasProject, routeCount: 0 };
  if (hasProject && request.operation !== "create") {
    const report = await inspectRepository(paths.root);
    inspection = {
      exists: true,
      routeCount: report.routes?.length || report.summary?.routes || 1,
      stack: report.stack || report.framework || null,
      report
    };
  }
  const plan = createExecutionPlan({ request, project: inspection, context, host, capabilityOverrides });
  await mkdir(paths.stateRoot, { recursive: true });
  await writeJson(paths.plan, plan);
  await saveDesignLagannContext(paths.root, {
    recentRequest: request,
    decisions: [{ at: new Date().toISOString(), operation: plan.classification.operation, profile: plan.classification.profile }]
  });
  return {
    ...plan,
    message: progressMessage({ operation: plan.classification.operation, stage: plan.classification.inspectFirst ? "inspect" : "plan" })
  };
}
