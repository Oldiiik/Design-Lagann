export class DesignCriticProvider {
  async analyze(_input) {
    throw new Error("DesignCriticProvider.analyze must be implemented");
  }

  async suggestRepairs(_report) {
    throw new Error("DesignCriticProvider.suggestRepairs must be implemented");
  }
}

export function externalImpeccableDescriptor(path) {
  return {
    mode: "external-skill",
    path,
    allowedStages: ["critique", "distill", "bolder", "quieter", "typeset", "layout", "polish", "audit"],
    selectionRequired: true,
    note: "Select operations from rendered evidence; never run every operation automatically."
  };
}
