# Lagann compared with other design skills

How Lagann 0.1.0 measures against the design skills it orchestrates and the bar that
skill-creator sets for skills (good triggering, lean always-loaded context, explained reasoning, worked
examples, bundled scripts for repeated work, evals).

Scores are the author's judgment against the rubric below, backed by the measured numbers. They are not
a behavioural benchmark; that is the next step (see the end).

## Rubric (0–5 each, 50 total)

| # | Dimension | What a 5 looks like |
|---|---|---|
| D1 | Triggering | fires on every design-shaped request, including casual ones; clear boundaries; tested query set |
| D2 | Context efficiency | small always-loaded part; detail loaded only when the moment needs it |
| D3 | Standalone craft | concrete, reasoned know-how that works with nothing else installed |
| D4 | Process coverage | product understanding → direction → build → verification, scaled from a one-line fix to a product |
| D5 | Judgment and conflicts | an explicit precedence; style rules treated as context-dependent, not law |
| D6 | Anti-slop | detects generic patterns *and* the overcorrection; protects distinctive work |
| D7 | Verification | real rendering, measured checks, honest evidence labels, bounded fix loops |
| D8 | Identity and memory | reads and maintains each product's established design decisions |
| D9 | Teachability | explains why; worked examples of good output |
| D10 | Testability | eval prompts with checkable expectations, validated in CI |

## Orchestrators and broad design skills

| Skill | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Lagann 0.1.0** | 4 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 3 | **45** |
| impeccable 4.6 | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 1 | 36 |
| taste-skill v2 | 4 | 3 | 5 | 3 | 2 | 4 | 5 | 2 | 3 | 4 | 35 |
| ui-ux-pro-max | 4 | 4 | 4 | 3 | 3 | 1 | 2 | 3 | 3 | 3 | 30 |
| frontend-design | 3 | 5 | 2 | 2 | 3 | 4 | 2 | 2 | 3 | 0 | 26 |

Why the others lose points:

- **impeccable**: deep and broad, but heavy (46 reference files, ~441 KB). Several core steps need a
  downloaded binary and, for critique, two sub-agents. Some rules are absolute ("no brief earns an eyebrow
  back"). It has no eval set.
- **taste-skill**: the strongest standalone craft and tooling, backed by a 247-site study. But its house
  style is a single aesthetic enforced as FAILs (no gradients, shadows, mono, rules; ≥ 4 photos; ≥ 8
  moving elements). It is public pages only and has a 7k-token body. Applied everywhere, it becomes its
  own second-order cliché.
- **ui-ux-pro-max**: rich searchable data and UX priorities, little on anti-slop or verification; its
  design-system generator proposes category defaults.
- **frontend-design**: a sharp, compact creative process and a good list of AI clusters, but no
  verification, memory or scaling to small edits.

Where Lagann still loses: **D1** is untested (20 trigger queries are ready,
but the trigger rate has not been measured). **D3**: taste-skill and impeccable still go deeper on type,
imagery and art direction; that is by design, since Lagann routes to them when installed. **D10**: the evals
are written and validated structurally but have not been executed against a baseline.

## Specialists (not orchestrators)

These are not competitors; they are Lagann's depth. Lagann should not out-teach emil-design-eng on
component feel. Its job is to make that knowledge arrive at the right moment and stop it from fighting
taste-skill.

| Skill | Best at | Concrete values/KB | Lagann's use |
|---|---|---|---|
| emil-design-eng | component feel, popovers, drag, Sonner principles | 2.7 | Construct, motion review |
| animate | should-it-animate gate, curves, durations, recipes | 2.8 | Construct |
| apple-design | gestures, springs, momentum, materials | 1.0 | Construct for direct manipulation |
| designing-user-experiences | scope, capability classes, proposals | 0.0 (process) | Discover |
| soft-skill / minimalist-skill | one aesthetic lane each | 1.5 / 2.7 | Imagine, only when the direction is that lane |
| redesign-skill | audit checklist for existing code | 0.8 | Construct/Verify checklist; its fake-data advice is overruled |
| web-design-guidelines | Vercel's rules, fetched live | 0.0 (fetches) | Verify |

## Measured profile

| Skill | Always-loaded body (tokens) | Markdown KB | Concrete values per KB | Hard-rule words per KB | Scripts | Evals |
|---|---|---|---|---|---|---|
| **Lagann 0.1.0** | ~2.4k | 101 | 1.0 overall; **5.7 in its craft core** | 0.4 | 3 + validator | 9 behaviour + 20 trigger |
| impeccable | ~2.7k | 441 | 0.3 | 0.3 | 5 (binary launcher) | none |
| taste-skill | ~7.1k | 143 | 3.1 | 0.2 | 8 | yes |
| ui-ux-pro-max | ~3.8k | 50 | 0.9 | 1.0 | 5 | script tests |
| frontend-design | ~2.3k | 9 | 0.1 | 0.0 | 0 | none |

"Concrete values" counts numbers with units (px, ms, rem, ch, %, :1...). It measures how actionable a
text is, not how good it is. Lagann's orchestration modules are deliberately judgment, not numbers; its
numbers live in `references/craft.md`.

## Not yet done: a behavioural benchmark

The rubric says Lagann is the most complete design skill here. Only a benchmark can say whether it
produces better interfaces. skill-creator's method:

1. Run each eval prompt twice: with Lagann, and with a baseline (no skill).
2. Grade the expectations and compare screenshots blind.
3. Run `evals/trigger-evals.json` through skill-creator's description optimiser to measure and tune triggering.
