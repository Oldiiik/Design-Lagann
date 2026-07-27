import test from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_STATES,
  classifyRequest,
  createAssetPlan,
  createExecutionPlan,
  createMotionSystem,
  createMotionChoreography,
  createReferenceAcquisitionPlan,
  createProjectContext,
  detectChange,
  evaluateStop,
  progressMessage,
  routeAsset,
  updateProjectContext
} from "../packages/workflow-engine/src/index.mjs";

test("01 creates a SaaS workflow with application states", () => {
  const plan = createExecutionPlan({ request: { goal: "Create a SaaS dashboard", productUI: true }, project: { exists: false } });
  assert.equal(plan.classification.operation, "create");
  assert.equal(plan.informationArchitecture.preset, "application");
  assert.ok(plan.informationArchitecture.productStates.includes("empty"));
});

test("02 selects commerce structure for ecommerce", () => {
  const plan = createExecutionPlan({ request: { goal: "Build an ecommerce shop with cart and checkout" }, project: { exists: false } });
  assert.equal(plan.informationArchitecture.preset, "commerce");
  assert.ok(plan.informationArchitecture.sections.includes("checkout"));
});

test("03 keeps a bakery landing practical", () => {
  const plan = createExecutionPlan({ request: { goal: "Create a bakery landing page", primaryAction: "order bread" }, project: { exists: false } });
  assert.equal(plan.informationArchitecture.preset, "marketing");
  assert.equal(plan.informationArchitecture.primaryAction, "order bread");
});

test("04 classifies dashboard as create when no project exists", () => {
  assert.equal(classifyRequest({ message: "Build a dashboard" }, { exists: false }).operation, "create");
});

test("05 redesign inspects and preserves approved work", () => {
  const result = classifyRequest({ message: "Redesign this product" }, { exists: true });
  assert.equal(result.operation, "redesign");
  assert.equal(result.inspectFirst, true);
  assert.equal(result.preserveApproved, true);
});

test("06 edit uses minimum scope", () => {
  const result = classifyRequest({ operation: "edit" }, { exists: true });
  assert.equal(result.minimumScope, true);
});

test("07 extend retains current direction by default", () => {
  const plan = createExecutionPlan({ request: { operation: "extend", goal: "Add a pricing page" }, project: { exists: true }, context: { artDirection: "editorial precision" } });
  assert.equal(plan.preservation.preserveDirection, true);
  assert.ok(!plan.stages.some((stage) => stage.id === "set-art-direction"));
});

test("08 repair protects unrelated paths", () => {
  const plan = createExecutionPlan({ request: { operation: "repair", mutablePaths: ["src/form.ts"] }, project: { exists: true }, context: { protectedPaths: ["src/brand.ts", "src/form.ts"] } });
  assert.deepEqual(plan.preservation.protectedPaths, ["src/brand.ts"]);
});

test("09 transform gets a large-enough scope estimate", () => {
  const plan = createExecutionPlan({ request: { operation: "transform" }, project: { exists: true, routeCount: 12 } });
  assert.equal(plan.scope.level, "large");
});

test("10 follow-up context preserves approved sections", () => {
  const original = createProjectContext({ approvedSections: ["hero"], rejectedIdeas: ["glowing blob"] });
  const next = updateProjectContext(original, { approvedSections: ["pricing"], recentRequest: "change footer" }, "2026-07-27T00:00:00.000Z");
  assert.deepEqual(next.approvedSections, ["hero", "pricing"]);
  assert.deepEqual(next.rejectedIdeas, ["glowing blob"]);
});

test("11 rejects automatic decorative particles", () => {
  const route = routeAsset({ role: "ambient particle field", category: "explicit-request" });
  assert.equal(route.status, "rejected");
  assert.equal(route.strategy, "omit");
});

test("12 accepts every intentional asset category", () => {
  const categories = ["background", "section-background", "hero-image", "product-image", "editorial-image", "foreground-transparent", "subtle-texture", "brand-illustration", "explicit-request"];
  const plan = createAssetPlan(categories.map((category) => ({ category, description: "named content role" })));
  assert.equal(plan.routes.every(({ route }) => route.accepted), true);
});

test("13 Claude does not require an image engine", () => {
  const plan = createAssetPlan([{ category: "hero-image", description: "aircraft photograph" }], "claude");
  assert.equal(plan.capabilities.imageGeneration, false);
  assert.equal(plan.routes[0].route.status, "acquisition-needed");
  assert.notEqual(plan.routes[0].route.strategy, "generate-raster");
});

test("14 transparent asset stays isolated", () => {
  const route = routeAsset({ category: "foreground-transparent", description: "whale only" });
  assert.match(route.constraint, /only the named subject/i);
  assert.match(route.constraint, /never bake in page/i);
});

test("15 fast mode has one bounded repair pass", () => {
  const plan = createExecutionPlan({ request: { operation: "create", profile: "fast" }, project: { exists: false } });
  assert.equal(plan.profilePolicy.repairPasses, 1);
  assert.deepEqual(plan.profilePolicy.viewports, ["desktop", "mobile"]);
});

test("16 no-change detector stops speculative iteration", () => {
  const change = detectChange({ files: ["a"] }, { files: ["a"] });
  const stop = evaluateStop({ change, requestedOutcomeMet: false });
  assert.equal(change.status, "no-change");
  assert.equal(stop.stop, true);
});

test("17 reduced motion removes travel and duration", () => {
  const motion = createMotionSystem({}, { motionVideo: false });
  assert.match(motion.reducedMotion.media, /prefers-reduced-motion/);
  assert.match(motion.reducedMotion.rule, /Remove travel/);
});

test("18 progress wording varies without random behavior", () => {
  const first = progressMessage({ operation: "repair", stage: "inspect", variant: 0 });
  const second = progressMessage({ operation: "repair", stage: "inspect", variant: 1 });
  assert.notEqual(first, second);
  assert.equal(first, progressMessage({ operation: "repair", stage: "inspect", variant: 0 }));
});

test("19 scope violations block acceptance", () => {
  const change = detectChange({ x: 1 }, { x: 2 }, { changedFiles: ["brand.css"], protectedPaths: ["brand.css"] });
  const stop = evaluateStop({ requestedOutcomeMet: true, change, verification: { functional: true, responsive: true, accessible: true } });
  assert.equal(stop.stop, false);
  assert.ok(stop.blockers.includes("scope-preservation"));
});

test("20 product state inventory is complete", () => {
  for (const state of ["hover", "active", "focus-visible", "disabled", "loading", "empty", "success", "warning", "error", "offline", "permission-denied", "no-results", "onboarding", "populated", "long-content", "responsive"]) {
    assert.ok(PRODUCT_STATES.includes(state), `missing ${state}`);
  }
});

test("21 acquires references without asking the user to find them", () => {
  const plan = createReferenceAcquisitionPlan({ brief: { goal: "Create an original restaurant landing" }, host: "codex" });
  assert.equal(plan.selfAcquisition, true);
  assert.equal(plan.strategy, "hybrid");
  assert.ok(plan.actions.some((action) => action.executor === "host-web-search"));
  assert.ok(plan.actions.some((action) => action.executor === "host-image-generation"));
});

test("22 Claude reference acquisition falls back to search", () => {
  const plan = createReferenceAcquisitionPlan({ brief: { goal: "Create an original restaurant landing" }, host: "claude", strategy: "generate" });
  assert.equal(plan.strategy, "search");
  assert.equal(plan.actions.some((action) => action.executor === "host-image-generation"), false);
});

test("23 motion choreography binds every important component", () => {
  const plan = createMotionChoreography({
    sections: [{ id: "hero" }, { id: "story" }, { id: "menu" }],
    interactions: [{ id: "drawer", kind: "drawer", interactive: true }, { id: "booking", kind: "dialog", interactive: true }]
  });
  assert.equal(plan.coverage.coverage, 100);
  assert.ok(plan.bindings.filter((binding) => binding.duration <= 300).length >= 2);
  assert.ok(plan.implementationRules.some((rule) => /pointer: fine/.test(rule)));
});
