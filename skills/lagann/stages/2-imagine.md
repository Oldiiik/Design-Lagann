# Stage 2: Imagine (creative direction)

Decide what the interface looks and feels like, and why that look belongs to this product and no other.
Think as a creative director choosing among real alternatives, not as a component generator reaching
for the nearest template.

## First: how much is already decided?

| Situation | Imagine's job |
|---|---|
| Established world (tokens, components, a recognisable look in code) | Inherit it. Decide only composition, hierarchy and the page's one idea. No new palette or type. |
| Incomplete brand (a logo, a colour, a font, nothing else) | Keep every confirmed asset; extend the system around them. |
| Redesign, re-direct depth | Keep identity cues and content; the old look is evidence of the subject, not authority. |
| Nothing exists | Create a world (below). |

Pinned facts from the user (a named font, colour, era, reference, "white theme only") are tier 1. Build
them at full strength even when a specialist calls them a cliché.

## Creating a world

1. **Find the idea in the subject, not the category.** Use the Stage 1 inventory. Write:
   *"On this surface, [something only this product has] becomes [the visual device]."*
   Competitor test: put the nearest competitor in the sentence. If it still works, the idea belongs to
   the category; find another. (Method: `taste-skill/SKILL.md` §4.)
2. **Generate real alternatives.** At least three directions that differ in kind, not in accent colour.
   Lagann's own method works with nothing else installed:
   - Write the rut first: the page this category always ships, and its predictable opposite. Neither may
     be a candidate.
   - Build each candidate from a *different* inventory item, and make the candidates differ on at least
     three of these axes: composition topology (poster, asymmetric split, full-bleed media, index/grid,
     scroll narrative, tool-as-page), colour strategy, type voice, material (flat, tactile, line-built,
     photographic, illustrated, generative), density, imagery mode, motion character.
   - Give each one a "live thing" (taste-skill's term): the one interaction made from the subject.
   - Compare on subject fit, competitor swap, feasibility with the real assets, and risk.
   A full worked example: [../references/examples.md](../references/examples.md) §1.
   Other sources, when installed:
   - `node ~/.claude/skills/taste-skill/scripts/draw.mjs --sector <s> --brief "<one line>" --sections <roles> --options 3`
     for Persuade/Experience pages. It deals researched directions locally, no network. Treat the sheet
     as a strong proposal, not a contract: Lagann's precedence still applies.
   - impeccable's method without its binary: name the product's mechanism, the audience's real scene and
     cultural home; list seven concrete visual systems, artifacts, places or rituals from that world;
     turn the best into directions (`impeccable/reference/new-work.md` §3). Leave out the page the
     category always ships and its predictable opposite.
   - `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <tone>" --design-system`
     for palettes, type pairs and patterns as raw options (useful for Operate products). Options, never orders.
3. **Choose one** and write one line on why it beats the others for *this* brief. Present the choice
   to the user when the stakes are high (a new brand, a full product) or the brief was open; otherwise
   state it and build.
4. **Run the anti-slop check on the direction** before any code ([../modules/anti-slop.md](../modules/anti-slop.md),
   §Direction check). Revise the parts that came from habit; name what you changed.

## References

Find them yourself when the host can search or generate; ask the user only for private material or an
exact source only they control.

- **Route**: *search* for real brands, category conventions, factual products and licensed photography;
  *generate* a raster direction frame when originality matters and an image tool exists; *hybrid* (search
  the category, generate one original frame) for showcase work; *browser-compose* (build the direction in
  HTML/CSS and screenshot it) when nothing can be generated.
- **3–6 sources, one role each**: category pattern, composition, typography, interaction, content tone, or
  asset treatment. For each, note the source or generation provenance, the one relationship to reuse, and
  one thing not to copy. A mood board with no roles is not research.
- **Rights**: extract relationships (focal position, scale contrast, crop, rhythm), never logos, brand copy,
  distinctive illustration or a source's full section geometry. A generated frame is a proposal, never
  evidence or a production asset.

## Deciding the parts

Each axis is open. Choose by reason; "it looks premium" is not a reason. The mechanical defaults behind
every axis (scales, ratios, ramps, contrast, radius logic) are in [../references/craft.md](../references/craft.md).

- **Colour strategy** first, colours second: Restrained (tinted neutrals + one accent), Committed (one
  saturated colour carries 30–60% of the surface), Full palette (3–4 named roles), Drenched (the surface
  is the colour). Operate surfaces usually want Restrained with colour doing real jobs (status, selection,
  data). Light or dark from the use scene, not the category. Detail: `impeccable/reference/colorize.md`,
  `taste-skill/references/colour.md`.
- **Typography**: faces chosen like objects from the subject's world; one family is normal, two is
  usually the limit; a clear scale with few, far-apart steps on Persuade, a tight functional scale on
  Operate. Check script coverage (Cyrillic, CJK) for the real audience. A face from a "training-data
  default" list (Inter, Playfair, Space Grotesk, DM Sans, Outfit, Fraunces, Instrument Serif...) needs a
  one-line reason, not a ban. Detail: `impeccable/reference/typeset.md`, `taste-skill/references/type.md`,
  `frontend-design/SKILL.md`.
- **Composition**: grid, margins, rhythm, density, where the one dominant thing sits, how neighbouring
  sections differ. Detail: `impeccable/reference/layout.md`, `taste-skill/references/layout.md`.
- **Shape and surface**: radius language, borders, elevation, texture, decided once as a system and
  varied by hierarchy, not at random.
- **Imagery**: what honest pictures exist (project's own > generated > credited open collections via
  `taste-skill/scripts/assets.mjs` > drawn from the subject > type and colour alone). Every asset has a
  role (background, hero, product, editorial, isolated subject, material texture, brand illustration);
  none is generated to fill space. An isolated subject contains only the subject. Provenance stays true:
  synthetic is never called photography. Missing photography is recorded as needed (role, crop, size,
  rights), not hidden behind a blob or placeholder. Never fake UI screenshots built from divs when real
  screenshots can be taken. Detail: `taste-skill/references/imagery.md`.
- **Motion character** (decided here, built in Stage 3): calm or lively, which one moment is authored,
  what never moves. Inherit the project's motion language when it has one.
- **Signature**: the one memorable thing. Spend boldness in one place; keep the rest disciplined
  (`frontend-design/SKILL.md`, Restraint).
- **Copy voice**: the product's own words; headlines short enough to hold their size
  (`taste-skill/references/copy.md` §2; `frontend-design/SKILL.md`, writing).

## Aesthetic lanes

Some specialists are a single style. Use one only when the chosen direction *is* that style:

| Lane | Skill | Fits | Watch for |
|---|---|---|---|
| Soft, tactile, premium agency | `soft-skill` | consumer products, luxury, where depth and polish are the brand | purple glass orbs, eyebrow pills, blur-in reveals: its own defaults are slop signals |
| Quiet document-style minimalism | `minimalist-skill` | writing tools, workspaces, knowledge products | warm-cream editorial sameness (second-order slop), faux macOS chrome, placeholder photos |
| Flat, ornament-free gallery style | `taste-skill` house rules | public pages that want award-gallery directness | its bans are one author's taste; inside the lane, follow them; outside it, they are signals |
| Bold / quiet / delightful / experimental pushes | `impeccable` `bolder.md`, `quieter.md`, `delight.md`, `overdrive.md` | a direction that needs amplifying or calming | overdrive on an Operate surface |

No lane fits? Build the world from the subject directly. That is the normal case.

## Output: the direction record

Before Construct, write in notes (and in `.design-lagann/context.md` when it is a durable decision):

- **Thesis**: the idea sentence, and the default arrangement this surface refuses.
- **World**: colour strategy and tokens (4–6 named values), type roles and scale, shape/radius rule,
  surface and elevation rule, imagery plan.
- **Composition**: first viewport or first screen in one or two lines; how sections or panels vary.
- **Signature**: the one memorable element or interaction.
- **Motion character**: what moves, how calmly, what never moves.
- **Risks**: where this could fail (legibility, performance, fit) and how Verify will check it.

## Exit criteria

- One direction, chosen over real alternatives, with a stated reason tied to the subject or brief.
- It passes the anti-slop direction check, including the second-order check.
- It respects every tier 1–3 fact (user words, accessibility, existing identity).
- It is buildable with the assets, stack and performance budget that actually exist.
