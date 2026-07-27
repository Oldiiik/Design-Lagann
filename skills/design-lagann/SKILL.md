---
name: design-lagann
description: Create, redesign, edit, extend, repair, or transform distinctive frontend interfaces with minimum-scope changes, persistent project context, intentional raster assets, coherent motion, complete product states, and responsive browser proof. Use for landing pages, sites, dashboards, apps, ecommerce, frontend design reviews, UI repairs, visual transformations, or follow-up design changes.
---

# Design Lagann

Build interfaces that feel authored, usable, and specific. Plan before implementation. Preserve approved work. Treat assets and motion as product decisions, not decoration.

## Start naturally

Respond to the actual request instead of repeating a canned greeting. State the inferred operation and immediate scope in one sentence when that helps. Do not narrate internal adapters, scoring systems, or every tool call.

Use one of six operations:

- `create`: make a new experience;
- `redesign`: replace or substantially evolve the visual system;
- `edit`: change a bounded existing part;
- `extend`: add a page, section, state, or capability within the current system;
- `repair`: correct a defect while preserving intended behavior and appearance;
- `transform`: migrate medium, framework, interaction model, or product shape while preserving declared invariants.

For every operation except `create`, inspect the project before proposing or changing it. Prefer the smallest coherent modification scope. Never overwrite unrelated user work.

Read [references/workflow.md](references/workflow.md) before implementation. Read [references/reference-acquisition.md](references/reference-acquisition.md) before seeking or generating visual references. Read [references/motion-choreography.md](references/motion-choreography.md) before motion implementation or review. Read [references/claude-host.md](references/claude-host.md) when running in Claude Code or whenever image generation is unavailable. Read [references/quality-and-proof.md](references/quality-and-proof.md) before critique, repair, or final acceptance.

## Persist project memory

Read `.design-lagann/project-context.json` when present. Update it after material decisions. Preserve:

- approved art direction and references;
- tokens, components, asset roles, motion language, and pages;
- approved sections and protected paths;
- rejected ideas and their reasons;
- unresolved problems;
- the recent request and decisions.

Do not reopen approved choices on a follow-up unless the user asks, new evidence invalidates them, or they block the requested outcome.

## Plan before building

Before code changes, establish:

1. operation and execution profile;
2. project map and preservation boundary;
3. audience, primary task, and content truth;
4. information architecture and section responsibilities;
5. one art-direction thesis tied to product truth;
6. responsive transformations;
7. intentional asset roles and acquisition status;
8. functional states and interaction behavior;
9. motion language and reduced-motion behavior;
10. verification and stop conditions.

Persist this as `.design-lagann/execution-plan.json`. For a tiny edit or repair, keep the plan tiny. Planning must reduce risk, not create ceremony.

## Choose a practical structure

Select and adapt one structure family:

- marketing: hero, proof, value narrative, detail, objections, action;
- commerce: merchandising, discovery, product, cart, checkout, support;
- application: navigation, workspace, primary task, context, feedback, settings;
- platform: problem, capability, workflow proof, integration, trust, conversion;
- content or service: masthead, navigation, lead, stream, related material, contact.

Do not force every page into a landing-page formula. Let information architecture follow the real task.

## Direct the visual system

Write one brief-specific thesis that names:

- the product or brand truth driving the design;
- the unique spatial relationship expressing it;
- the intended memory hook;
- the responsive behavior that preserves the idea;
- patterns explicitly forbidden for this project.

Reject style-only theses such as “premium minimal,” “glassmorphism,” or “editorial.” Do not repair weak composition with glow, gradients, shadows, blur, rounded cards, or animation.

Avoid familiar AI-shaped defaults when they replace a specific idea: centered eyebrow/headline/CTA stacks, generic left-copy/right-image heroes, repeated three-card grids, universal rounded containers, decorative blobs, stock benefit copy, and mobile pages that merely stack desktop boxes.

## Use assets intentionally

Allowed asset categories are:

- backgrounds and section backgrounds;
- hero, product, and editorial images;
- transparent PNG foreground subjects;
- subtle textures with a real material role;
- brand illustrations;
- images explicitly requested by the user.

Do not automatically add particles, ribbons, belts, blobs, glows, noise, sparkles, floating ornaments, or decorative dividers. Do not generate assets merely to fill empty space.

When a foreground subject is required, isolate only that subject. A whale asset contains the whale, not sky, ocean, horizon, copy, or the hero composition.

Prefer PNG/WebP/JPEG/AVIF for raster delivery. Do not create SVG in projects that declare a zero-SVG constraint. Use CSS for interface geometry and Canvas only for genuinely procedural or data-driven visuals, not as a loophole for forbidden decoration.

Keep provenance truthful. Never call synthetic imagery real photography. When licensed or real photography is required, use qualified supplied assets or record acquisition as unresolved.

## Acquire references autonomously

Do not make the user find references when the host can search or generate them. Decide among search, generation, or a hybrid from the brief and available capabilities:

- search when the task concerns a real brand, exact category behavior, factual content, or an explicit source;
- generate a raster direction frame when originality and composition exploration matter and image generation is available;
- use a hybrid for new showcase work: search for real category principles, then generate one original direction frame;
- in Claude or another host without image generation, search and compose the direction directly in browser code.

Gather only the smallest useful set. Give each reference one role: category pattern, composition, typography, interaction, content tone, or asset treatment. Record source URLs or generation provenance. Extract relationships and principles; never copy another brand's logo, copy, distinctive illustration, or section geometry. A generated frame is a proposal, not factual evidence or final acceptance proof.

## Build complete states

For product interfaces, implement and verify the applicable states: default, hover, active, focus-visible, disabled, loading, empty, populated, success, warning, error, offline, permission denied, no results, onboarding, long content, and responsive behavior.

Use semantic HTML, keyboard access, visible focus, adequate touch targets, useful error copy, and stable loading geometry. Never let a polished default state conceal an unusable failure state.

## Use coherent motion

Motion must explain state, hierarchy, spatial continuity, or direct manipulation. Define shared duration, easing, distance, and stagger tokens. Plan the opening sequence, section entrances, grouped reveals, navigation transitions, panel swaps, dialogs, loading, success, and error states before implementation. Audit every important section and interactive component for a motion binding; do not stop at a generic fade class.

Keep control feedback below 300ms. Use 100–160ms for press feedback, 150–250ms for menus and dropdowns, and 200–500ms for dialogs. Editorial entrances may be longer when they are triggered once. Animate transform and opacity directly. Never use `transition: all`, layout-affecting animation, random variants, or unrelated ambient motion. Gate hover-only movement behind `(hover: hover) and (pointer: fine)`.

Provide `prefers-reduced-motion` behavior. Remove travel, scale, clipping, looping, and stagger delays under reduced motion while preserving short opacity and color state communication. Reject ambient floating, unrelated parallax, random reveal variants, and attention loops without product meaning.

When the user explicitly requests rendered video animation and the host supports it, add one `motion-video` stage using Remotion. Require a deterministic composition, MP4/WebM output, and a static poster or reduced-motion fallback. Keep the stage absent for website-only work.

## Adapt effort, not acceptance

Use Balanced unless the request or evidence supports another profile.

- Fast: one direction, tight inspection, one bounded repair pass, desktop and mobile proof. Best for small, clear scopes.
- Balanced: limited direction comparison, full responsive proof, two repair passes. Default.
- Quality: deeper exploration, stronger critique, desktop/tablet/mobile proof, up to three bounded repair passes. Best for showcase or complex work.

Every profile must remain functional, responsive, accessible, scope-preserving, and honestly verified. Never call incomplete proof accepted.

## Verify and stop

Run the project. Inspect the rendered result at required viewports. Test primary interactions, states, keyboard behavior, focus, contrast, touch targets, zoom, overflow, long content, and reduced motion. Compare against approved references by relationships and hierarchy, not superficial pixels.

Repair the highest-impact root cause first:

1. broken function, accessibility, or overflow;
2. missing thesis or hierarchy;
3. generic composition or detached objects;
4. weak narrative and rhythm;
5. incoherent typography or imagery;
6. inconsistent materials;
7. motion and micro-polish.

After each pass, detect actual source and rendered change. Stop when the requested outcome is proven, no meaningful change occurred, or the bounded pass limit is reached. Report unresolved evidence plainly.

## Communicate like a collaborator

Give updates only when they help the user verify direction, scope, a meaningful finding, or a blocker. Vary wording based on the operation and current evidence. Lead final handoff with the outcome, local URL or artifact, verification performed, and any unresolved asset or proof requirement.
