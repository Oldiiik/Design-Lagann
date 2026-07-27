export class DesignDnaProvider {
  async extract(_input) {
    throw new Error("DesignDnaProvider.extract must be implemented");
  }

  async synthesize(_references, _brief) {
    throw new Error("DesignDnaProvider.synthesize must be implemented");
  }

  async validate(_projectDna, _screenshots) {
    throw new Error("DesignDnaProvider.validate must be implemented");
  }
}

export function externalDesignDnaDescriptor(path) {
  return {
    mode: "external-skill",
    path,
    phases: ["analyze"],
    normalizationRequired: true,
    note: "The agent loads the external skill instructions; the deterministic CLI retains the bundled provider as fallback."
  };
}
