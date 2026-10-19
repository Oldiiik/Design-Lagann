# Project design context

Lagann keeps a small, living record of each project's design identity in
`<project-root>/.design-lagann/context.md`. It exists so a button fix next week respects the decisions
made today, and so no specialist's house style quietly overwrites the product's own.

It is a memory of decisions, not a rulebook. It must never stop the product from evolving.

## Where the truth lives

1. **The code** (tokens, CSS, components, assets) is the primary source. When the file and the code
   disagree, the code wins: fix the file and mention the drift.
2. **The user's words** in the current conversation outrank both; record new durable preferences.
3. **Existing design docs** (`DESIGN.md`, `PRODUCT.md`, `design-system/*/MASTER.md`,
   `.taste-skill/direction.json`, CLAUDE.md sections): link to them from the context file; do not copy
   them. Lagann's file holds what they do not: motion language, intentional exceptions, decisions,
   rejections and the verification setup.
4. **The user's profile** (`~/.design-lagann/profile.md`): standing preferences the user stated, across
   projects or for named ones. Treat them as the user's words until newer words override them.
5. **Memory tools and host memory** are hints. Confirm against the code before relying on them.

Legacy: some projects have `.design-lagann/project-context.json` and `execution-plan.json` from an
earlier Lagann. Read them as history. When you next record a decision, write `context.md` and leave the
JSON files in place.

## When to read, create, update

- **Read** at the start of every mode (SKILL.md §0). It is short by design.
- **Create** the first time Lagann does real work in a project that lacks one: run
  `node ~/.claude/skills/lagann/scripts/context-scan.mjs <root>`, read the main stylesheet or theme and one
  or two representative components, then write the file from the template. Only facts you verified.
- **Update** when a durable decision is made (a new token, a pattern adopted, a direction chosen, a
  preference stated, something rejected). One line per decision, dated. Not for one-off tweaks.
- **Respect it on follow-ups.** Approved sections, protected paths and recorded decisions are not reopened
  unless the user asks, new evidence invalidates them, or they block the request. A local edit never
  resets the direction.

Keep it under ~120 lines. If it grows, it is copying the code; replace values with pointers.

## The user's profile

`~/.design-lagann/profile.md` lives outside every project, so personal rules never ship with a repository
or a published skill. Keep it short: cross-project taste, rules for named projects (a motion language,
a pinned palette), local servers and screenshot workflows, and pointers to each project's context file.
Create it only when the user states a preference that spans projects or belongs to no repository.

## Privacy and shipping

The folder is development context. Never reference it from shipped code, and check that the project's
static server or build does not publish dot-folders (Vite and most frameworks do not; a custom server
might). It may contain the user's preferences; it never contains secrets.

## Template

```markdown
# <Product> design context
Updated: <YYYY-MM-DD> · Sources: <main token file>, <design docs if any>

## Identity
<2–4 lines: what the product is, for whom, its tone, what it must never feel like.>

## Surfaces
<route or area → mode (Persuade / Operate / Read / Experience), one line each.>

## System (pointers first, key values second)
- Tokens: <file:line>. Colour roles: <ground, ink, accent, semantic>.
- Type: <families, weights, scale source>. Script coverage needed: <e.g. Cyrillic>.
- Shape: <radius scale, border rule, elevation rule>.
- Icons: <family, weight>.
- Imagery: <what is real and allowed: screenshots, photos, drawn marks; what is not>.

## Components and layout conventions
<the recurring patterns worth reusing, with file paths.>

## Motion language
<curves and durations tokens; what moves, what never moves; reduced-motion approach.>

## Copy voice
<tone, words to avoid, punctuation rules.>

## Accessibility requirements
<anything beyond WCAG AA; known gaps.>

## Protected
<approved sections, files or paths that must not change without an explicit request.>

## Intentional exceptions
<patterns a specialist would flag that are deliberate here, with the reason. Lagann keeps these.>

## Open
<what is explicitly free to explore, so this file does not freeze the design.>

## Decisions
- <YYYY-MM-DD> <decision> (<why>)

## Rejected
- <YYYY-MM-DD> <idea> (<why>)

## Verification
- Run: <command / launch config / URL>. Check it responds before use.
- Widths: <e.g. 1440, 768, 390>. Key pages and states to check: <list>.
- Screenshot workflow: <how product shots are made, where they live>.
```
