export const CONTEXT_VERSION = 1;

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function createProjectContext(seed = {}) {
  return {
    kind: "design-lagann-project-context",
    version: CONTEXT_VERSION,
    updatedAt: seed.updatedAt || new Date().toISOString(),
    artDirection: seed.artDirection || null,
    approvedReferences: unique(seed.approvedReferences),
    tokens: seed.tokens || {},
    components: unique(seed.components),
    assets: seed.assets || [],
    motion: seed.motion || null,
    pages: unique(seed.pages),
    approvedSections: unique(seed.approvedSections),
    rejectedIdeas: unique(seed.rejectedIdeas),
    unresolvedProblems: unique(seed.unresolvedProblems),
    recentRequest: seed.recentRequest || null,
    protectedPaths: unique(seed.protectedPaths),
    decisions: seed.decisions || []
  };
}

export function updateProjectContext(current, patch, now = new Date().toISOString()) {
  const base = createProjectContext(current);
  return createProjectContext({
    ...base,
    ...patch,
    updatedAt: now,
    approvedReferences: unique([...(base.approvedReferences || []), ...(patch.approvedReferences || [])]),
    components: unique([...(base.components || []), ...(patch.components || [])]),
    pages: unique([...(base.pages || []), ...(patch.pages || [])]),
    approvedSections: unique([...(base.approvedSections || []), ...(patch.approvedSections || [])]),
    rejectedIdeas: unique([...(base.rejectedIdeas || []), ...(patch.rejectedIdeas || [])]),
    unresolvedProblems: patch.resolvedProblems
      ? base.unresolvedProblems.filter((problem) => !patch.resolvedProblems.includes(problem))
      : unique([...(base.unresolvedProblems || []), ...(patch.unresolvedProblems || [])]),
    decisions: [...(base.decisions || []), ...(patch.decisions || [])].slice(-40)
  });
}

export function createPreservationContract(context, classification, request = {}) {
  const explicitlyMutable = new Set(request.mutablePaths || []);
  const protectedPaths = (context.protectedPaths || []).filter((value) => !explicitlyMutable.has(value));
  return {
    operation: classification.operation,
    protectedPaths,
    approvedSections: context.approvedSections || [],
    preserveDirection: classification.preserveApproved && !request.replaceArtDirection,
    allowedScope: request.mutablePaths || (classification.minimumScope ? ["request-target-only"] : ["project-approved-scope"]),
    rule: "Change only what the request requires; do not erase approved direction or unrelated user work."
  };
}
