# Stage 1: Discover (product and UX intelligence)

Understand what is being built before deciding what it looks like. The output of this stage contains
no colours, fonts or layouts.

## Scale the effort to the task

- Small surface (a dialog, an empty state, one section): five lines of notes. No questions.
- A page or a screen: the brief below, filled from the request, the code and the context file.
- A product or multi-screen flow: the brief, plus task flows and a capability classification.

Infer and state your reading in one line rather than interrogating. Ask only when a missing fact blocks
the work (no product name, no idea who the user is, an irreversible structural choice). One focused
question, or two or three related ones through the question tool, never a questionnaire.

## For existing products: inspect before deciding

Read the routes or pages, the component library, the tokens, the copy, and render the current UI if it
runs. Note what users can do today before proposing to simplify anything; inventory before you remove.

## The brief (write it in notes, not in the product)

- **Purpose**: the one job of this surface in a sentence.
- **Users and scene**: who, where, on what device, how often, in what state of mind.
- **Primary action**: what success looks like for the visitor, and for the business.
- **Surface mode**: Persuade / Operate / Read / Experience (see SKILL.md §2).
- **Content inventory**: what real content, data, proof and imagery actually exist. Do not plan around
  assets that do not exist. For Persuade pages also list 8–12 things that belong to this subject and no
  competitor (taste-skill's inventory, `taste-skill/SKILL.md` §1): it feeds Stage 2.
- **Information hierarchy**: what must be seen first, second, on demand.
- **States**: loading, empty, partial, error, success, disabled, permission-limited, offline, first run,
  long content, missing content. Only the ones the product really has.
- **Constraints**: platform, stack, existing design system, i18n and scripts (e.g. Cyrillic), legal,
  performance budget, accessibility requirements beyond WCAG AA.

## Specialists for this stage

| Need | Read |
|---|---|
| Scope and capability classification; when a change needs approval first | `designing-user-experiences/SKILL.md` (Route by Scope; the classification table) |
| Task discovery, mode, questions worth asking | `impeccable/reference/shape.md`; mode files `mode-operate.md`, `mode-read.md`, `mode-persuade.md` |
| Operate surfaces (dashboards, tools) | [../references/craft.md](../references/craft.md) §6; `impeccable/reference/operate.md`; worked example in [../references/examples.md](../references/examples.md) §4 |
| UX rules by priority (accessibility, touch, nav, forms) | `ui-ux-pro-max/SKILL.md` priority table; details on demand from `references/quick-reference.md` or `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<outcome>" --domain ux` |
| Landing argument: claims and their proof, section order | `taste-skill/references/copy.md` §1 |
| First-run, onboarding, empty states | `impeccable/reference/onboard.md` |
| Charts and data-heavy screens | the `dataviz` skill; `ui-ux-pro-max --domain chart` |
| Platform conventions (iOS, Android, macOS feel) | `impeccable/reference/ios.md` / `android.md`; `apple-design/SKILL.md` §16; `designing-user-experiences/references/apple-hig.md` |

## Information architecture and flows (multi-screen work only)

1. Organise by user intent and decision order, not by the data model or the org chart.
2. Classify each capability: primary (direct, prominent), supporting (visible, quieter), contextual
   (revealed with its object), advanced (labelled disclosure), safety/status (visible when it matters).
3. Walk the primary task end to end: entry, steps, decision points, cancel/undo, failure, recovery, exit.
4. Keep navigation shallow and the vocabulary consistent: an action keeps its name through the flow.

## Exit criteria

- The brief exists (in proportion to the task) and names the surface mode.
- You can say what the user must be able to do, what they see first, and which states exist.
- Unknowns are labelled as assumptions, not filled with invented facts.
- Nothing about the look has been decided yet, unless the user or the project already decided it.
