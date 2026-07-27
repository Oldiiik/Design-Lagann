const OPENERS = {
  create: ["I’ve mapped the product story and the first buildable direction.", "The brief is now a concrete experience plan."],
  redesign: ["I found the visual system worth preserving and the parts that are holding it back.", "The redesign boundary is set; approved behavior stays intact."],
  edit: ["I isolated the requested change and protected everything around it.", "The edit is scoped to the exact target."],
  extend: ["The extension now fits the existing information architecture.", "I found the cleanest place for the new capability."],
  repair: ["The failure is reproduced and the repair boundary is narrow.", "I traced the issue to its root instead of polishing the symptom."],
  transform: ["The migration contract is mapped before any structural change.", "I separated behavior to preserve from implementation to replace."]
};

export function progressMessage({ operation = "create", stage = "plan", variant = 0, detail } = {}) {
  const choices = OPENERS[operation] || OPENERS.create;
  const opener = choices[Math.abs(Number(variant)) % choices.length];
  const stageCopy = {
    inspect: "I’m checking routes, tokens, assets, states, and protected areas.",
    plan: "Next I’m locking hierarchy, assets, responsive behavior, and proof criteria.",
    implement: "The system is settled; implementation is moving through the highest-impact relationship first.",
    verify: "The build is ready for responsive, interaction, accessibility, and change-scope proof.",
    stop: "The requested outcome is proven and further iteration would be speculative."
  }[stage] || "The workflow is advancing with the approved scope intact.";
  return [opener, detail, stageCopy].filter(Boolean).join(" ");
}
