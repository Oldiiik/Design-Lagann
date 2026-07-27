const list = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

export function requestsVideoMotion(brief = {}) {
  const haystack = [
    brief.video,
    brief.videoAnimation,
    brief.motionOutput,
    brief.output,
    ...list(brief.outputs),
    ...list(brief.interactions),
    ...list(brief.requiredStates)
  ].filter(Boolean).join(" ").toLowerCase();
  return brief.video === true || brief.videoAnimation === true ||
    /\b(remotion|render(?:ed)? video|video animation|mp4|webm|motion film|launch video)\b/.test(haystack);
}

export function createMotionVideoStage(brief = {}) {
  const requested = requestsVideoMotion(brief);
  return {
    version: "1.0.0",
    id: "motion-video",
    status: requested ? "requested" : "not-requested",
    stageCount: requested ? 1 : 0,
    engine: requested ? "remotion" : null,
    officialSource: requested ? "https://www.remotion.dev/" : null,
    packages: requested ? ["remotion", "@remotion/renderer"] : [],
    pipeline: requested ? [
      "author one deterministic React composition from approved design and production assets",
      "preview the composition locally",
      "render the requested MP4/WebM and one PNG poster fallback",
      "verify frame determinism, timing, audio rights, output dimensions, and reduced-motion behavior"
    ] : [],
    assetPolicy: requested ? {
      svgAllowed: false,
      rasterAndVideoAssetsOnly: true,
      animationClock: "useCurrentFrame/useVideoConfig",
      cssAnimationAllowed: false,
      remoteAssetFallbackAllowed: false
    } : null,
    integrationBoundary: requested
      ? "Remotion is a single optional output stage after direction approval and asset acquisition; it does not become a second design workflow."
      : "Do not install or initialize Remotion when the requested deliverable is only an interactive website.",
    claimBoundary: "A stage plan is not a rendered video. Completion requires a local output file and verified render evidence."
  };
}

