export const MOTION_TOKENS = {
  duration: { instant: 80, press: 160, fast: 180, standard: 260, deliberate: 420, editorial: 720 },
  easing: {
    out: "cubic-bezier(0.23, 1, 0.32, 1)",
    inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
    drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
    exit: "cubic-bezier(0.7, 0, 0.84, 0)"
  },
  distance: { micro: 4, standard: 18, major: 28 },
  stagger: { tight: 45, standard: 60, relaxed: 80 }
};

export function createMotionSystem(input = {}, capabilities = {}) {
  const requestedVideo = Boolean(input.videoAnimation || input.videoOutput);
  const videoAvailable = requestedVideo && capabilities.motionVideo !== false;
  return {
    kind: "design-lagann-motion-system",
    thesis: input.thesis || "Motion explains state, hierarchy, spatial continuity, and direct manipulation.",
    tokens: MOTION_TOKENS,
    families: ["state-transition", "editorial-entrance", "group-stagger", "layout-continuity", "direct-manipulation"],
    forbidden: ["random floating", "ambient particle drift", "unrelated parallax", "attention loops without product meaning"],
    reducedMotion: {
      media: "(prefers-reduced-motion: reduce)",
      rule: "Remove travel, scale, clipping, looping, and stagger delays; preserve 180ms opacity and color state communication."
    },
    videoStage: requestedVideo
      ? (videoAvailable
          ? { enabled: true, engine: "remotion", stage: "motion-video", fallbackRequired: true }
          : { enabled: false, status: "capability-unavailable", fallback: "browser motion plus static poster specification" })
      : { enabled: false, status: "not-requested" }
  };
}

export function motionForState(state, reduced = false) {
  if (reduced) return { duration: 180, transform: "none", opacity: 1, properties: ["opacity", "color"] };
  const map = {
    hover: { duration: MOTION_TOKENS.duration.press, easing: MOTION_TOKENS.easing.out, distance: MOTION_TOKENS.distance.micro },
    active: { duration: MOTION_TOKENS.duration.press, easing: MOTION_TOKENS.easing.out, scale: 0.97 },
    drawer: { duration: 280, easing: MOTION_TOKENS.easing.drawer, distance: MOTION_TOKENS.distance.standard },
    dialog: { duration: 280, easing: MOTION_TOKENS.easing.out, distance: MOTION_TOKENS.distance.standard, scale: 0.98 },
    reveal: { duration: MOTION_TOKENS.duration.editorial, easing: MOTION_TOKENS.easing.out, distance: MOTION_TOKENS.distance.major },
    loading: { duration: MOTION_TOKENS.duration.standard, easing: "linear", loop: true },
    success: { duration: MOTION_TOKENS.duration.standard, easing: MOTION_TOKENS.easing.out, distance: MOTION_TOKENS.distance.standard },
    error: { duration: MOTION_TOKENS.duration.fast, easing: MOTION_TOKENS.easing.inOut, distance: MOTION_TOKENS.distance.micro }
  };
  return map[state] || { duration: MOTION_TOKENS.duration.standard, easing: MOTION_TOKENS.easing.inOut, distance: 0 };
}

export function auditMotionCoverage(components = [], bindings = []) {
  const bound = new Set(bindings.map((binding) => typeof binding === "string" ? binding : binding.component));
  const important = components.filter((component) => component?.important !== false);
  const missing = important.filter((component) => !bound.has(component.id)).map((component) => ({
    id: component.id,
    role: component.role || "content",
    recommendation: component.interactive ? "state-transition" : "editorial-entrance"
  }));
  return {
    kind: "design-lagann-motion-coverage",
    total: important.length,
    bound: important.length - missing.length,
    coverage: important.length ? Math.round(((important.length - missing.length) / important.length) * 100) : 100,
    missing
  };
}

export function createMotionChoreography(input = {}) {
  const sections = input.sections || [];
  const interactions = input.interactions || [];
  const bindings = [
    ...sections.map((section, index) => ({
      component: section.id || `section-${index + 1}`,
      family: index === 0 ? "opening-sequence" : "editorial-entrance",
      trigger: index === 0 ? "page-ready" : "intersection-12-percent",
      duration: index === 0 ? 860 : 720,
      easing: MOTION_TOKENS.easing.out,
      stagger: MOTION_TOKENS.stagger.standard,
      properties: ["transform", "opacity", "clip-path"]
    })),
    ...interactions.map((interaction, index) => ({
      component: interaction.id || `interaction-${index + 1}`,
      family: interaction.kind === "drawer" ? "spatial-continuity" : "state-transition",
      trigger: interaction.trigger || "user-action",
      duration: interaction.kind === "drawer" || interaction.kind === "dialog" ? 280 : 160,
      easing: interaction.kind === "drawer" ? MOTION_TOKENS.easing.drawer : MOTION_TOKENS.easing.out,
      properties: ["transform", "opacity"]
    }))
  ];
  const components = [...sections, ...interactions];
  return {
    kind: "design-lagann-motion-choreography",
    thesis: input.thesis || "Motion stages hierarchy and preserves spatial continuity without ambient decoration.",
    tokens: MOTION_TOKENS,
    bindings,
    coverage: auditMotionCoverage(components, bindings),
    implementationRules: [
      "Keep control feedback at or below 300ms.",
      "Gate hover-only movement behind (hover: hover) and (pointer: fine).",
      "Animate direct transform and opacity values; never transition all properties.",
      "Make open/close transitions interruptible and delay hidden cleanup until exit completes."
    ],
    reducedMotion: createMotionSystem().reducedMotion
  };
}
