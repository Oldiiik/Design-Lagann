import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { exists, walk } from "../../shared/src/index.mjs";

const RULES = [
  {
    id: "gradient-text",
    category: "direction",
    severity: 1,
    pattern: /background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/i,
    message: "Gradient-clipped text is a generic decorative pattern; use solid color and hierarchy."
  },
  {
    id: "side-stripe",
    category: "component",
    severity: 1,
    pattern: /border-(left|right)\s*:\s*([2-9]|\d{2,})px/i,
    message: "Colored side-stripe callouts are banned; use structure, tone, or a complete border."
  },
  {
    id: "over-rounded",
    category: "component",
    severity: 1,
    pattern: /border-radius\s*:\s*(3[2-9]|[4-9]\d|\d{3,})px/i,
    ignore: /border-radius\s*:\s*999px/i,
    message: "Large non-pill radii often create generic soft-card UI; verify the shape is intentional."
  },
  {
    id: "repeating-stripes",
    category: "decoration",
    severity: 1,
    pattern: /repeating-linear-gradient\s*\(/i,
    message: "Decorative repeating stripe backgrounds are an AI-default texture."
  },
  {
    id: "arbitrary-z-index",
    category: "component",
    severity: 1,
    pattern: /z-index\s*:\s*(999|9999|\d{5,})/i,
    message: "Use a semantic z-index scale instead of arbitrary extreme values."
  },
  {
    id: "tiny-type",
    category: "typography",
    severity: 1,
    pattern: /font-size\s*:\s*(?:[0-9]|1[01])px/i,
    message: "Text below 12px is likely unreadable for body or interface content."
  }
];

function finding(rule, file, line, evidence) {
  return {
    id: `${rule.id}:${file}:${line}`,
    critic: "static-impeccable",
    category: rule.category,
    severity: rule.severity,
    message: rule.message,
    evidence,
    file,
    line,
    operation: rule.id === "tiny-type" ? "typeset" : rule.category === "decoration" ? "distill" : "critique"
  };
}

export async function detectExternalIntegrations(projectRoot) {
  const home = os.homedir();
  const candidates = {
    impeccable: [
      process.env.DESIGN_LAGANN_IMPECCABLE,
      path.join(projectRoot, ".agents", "skills", "impeccable", "SKILL.md"),
      path.join(home, ".codex", "skills", "impeccable", "SKILL.md"),
      path.join(home, ".agents", "skills", "impeccable", "SKILL.md")
    ].filter(Boolean),
    designDna: [
      process.env.DESIGN_LAGANN_DESIGN_DNA,
      path.join(projectRoot, ".agents", "skills", "design-dna", "SKILL.md"),
      path.join(home, ".codex", "skills", "design-dna", "SKILL.md"),
      path.join(home, ".agents", "skills", "design-dna", "SKILL.md")
    ].filter(Boolean)
  };
  const result = {};
  for (const [name, paths] of Object.entries(candidates)) {
    const found = [];
    for (const candidate of paths) if (await exists(candidate)) found.push(candidate);
    result[name] = { available: found.length > 0, paths: found };
  }
  return result;
}

export class StaticImpeccableCritic {
  async analyze({ projectRoot }) {
    const files = (await walk(projectRoot)).filter((file) => /\.(css|scss|sass|less|html|jsx|tsx|vue|svelte|astro)$/.test(file));
    const findings = [];
    let hasMotion = false;
    let hasReducedMotion = false;
    for (const file of files) {
      const source = await readFile(file, "utf8");
      hasMotion ||= /@keyframes|animation\s*:|transition\s*:/.test(source);
      hasReducedMotion ||= /prefers-reduced-motion/.test(source);
      const lines = source.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        for (const rule of RULES) {
          if (rule.pattern.test(lines[index]) && !rule.ignore?.test(lines[index])) {
            findings.push(finding(rule, file, index + 1, lines[index].trim()));
          }
        }
      }
    }
    if (hasMotion && !hasReducedMotion) {
      findings.push({
        id: "missing-reduced-motion",
        critic: "static-impeccable",
        category: "functionality",
        severity: 2,
        message: "Motion exists without a prefers-reduced-motion alternative.",
        evidence: "Animation or transition declarations were found, but no reduced-motion media query was found.",
        operation: "audit"
      });
    }
    return {
      critic: "static-impeccable",
      capability: "static anti-pattern scan",
      limitation: "This critic does not judge whole-page hierarchy, composition, emotional closure, or visual similarity.",
      filesScanned: files.length,
      findings,
      selectedOperations: [...new Set(findings.map((item) => item.operation))].slice(0, 3)
    };
  }

  async suggestRepairs(report) {
    return [...report.findings]
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5)
      .map((item) => ({ findingId: item.id, operation: item.operation, action: item.message, file: item.file }));
  }
}

// Backward-compatible export for v0.1 consumers. New code should use the honest name.
export class NativeImpeccableProvider extends StaticImpeccableCritic {}
