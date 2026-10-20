# Conflict rulings

The precedence model in SKILL.md §3 decides every conflict. These rows record the recurring ones so they
are decided once. Each ruling says which tier wins. When you apply an override in a task, name it in one
line ("taste's no-shadow rule lost to the project's elevation system, tier 3").

## Hard vs. soft

**Hard (tier 1–2, never traded away for style):** the user's explicit requirements; WCAG AA contrast;
keyboard operability and visible focus; reduced-motion support; touch targets; no horizontal scroll;
semantic structure; no layout-shifting animation on content; truthful content (no invented proof, no
deceptive data); security basics; not running external binaries without permission.

**Soft (tier 4–6, judgement):** everything about style: gradients, shadows, radius, borders, glass,
type families, eyebrows, numbering, imagery counts, motion quantity, density, symmetry. A soft rule from a
specialist is a signal for the anti-slop questions, never an automatic edit.

## Rulings

| Topic | Disagreement | Ruling |
|---|---|---|
| Eyebrows / kickers | impeccable: absolute ban; taste: banned; soft-skill: required on every H1/H2 | Signal. Remove when it is chrome; keep when it carries information or is an established motif (a product whose mono kickers are its signature keeps them, tier 3). Never add one by reflex. |
| Gradients | taste: banned; soft-skill: mesh orbs; minimalist: banned | Follow the direction and the brand. A gradient needs a reason (light, material, brand) and clean execution (no banding, no muddy midpoints). Gradient text: almost never. |
| Shadows and elevation | taste: none at rest; soft: diffused everywhere; redesign: tinted | One elevation system per product, encoding hierarchy, consistent light. Project system wins. |
| Glass / blur | taste: one bar max; soft: heavy glass; craft-floor: specific effect only | Only where something floats over moving content, and never on scrolling containers (performance). |
| Rules and borders | taste: no hairlines, no outlined boxes; minimalist: 1px #EAEAEA everywhere | Lines for tables, forms, data and worlds that own them. Otherwise space and tone steps. Project wins. |
| Radius | taste: square or fully round; soft: 2rem squircles; minimalist: ≤ 12px | One radius language per product, varied by size. A user-pinned radius wins, even the "weak" 12px. |
| Fonts | soft bans Inter/Roboto; impeccable lists ~16 "default" faces; redesign recommends Outfit/Geist; minimalist recommends Newsreader/Playfair; lint warns Poppins/Inter | These lists contradict each other because they are fashion. User/project font wins. New worlds: choose for a stated reason; script coverage for the real audience is required. |
| Monospace | taste/impeccable: only for code; minimalist: for metadata | For code, data, measurement, or an identity that owns it. |
| Section numbering | | Only for real sequences. |
| Icons | soft bans Lucide/Material; redesign says Phosphor or Heroicons; minimalist bans Heroicons | One family per product, one stroke weight. Project's family wins. Default Phosphor if none. Never emoji as icons. Never hand-draw icon paths when a library icon exists. |
| Imagery | taste: ≥ 4 real pictures, video; redesign/minimalist: picsum placeholders | Honest imagery only: project's own, generated, credited open collections, or drawn from the subject. No remote placeholders in shipped work. Picture counts are a lane rule. User rejecting photos wins. Real product screenshots beat div mockups. |
| Hand-drawn SVG | taste/impeccable discourage decorative SVG | Allowed for brand marks and systematic brand shapes; drawn illustration when no honest picture exists, in one consistent language. No fake diagrams or ornament. |
| Bento grids | soft likes them; minimalist requires them; others warn | Only when content has real mixed weight. Signal otherwise. |
| Motion quantity | taste: ≥ 8 moving elements, entrance per section; frontend-design/impeccable: one authored moment; animate: stagger lists | Project motion language first. Otherwise: Operate → minimal and functional; Persuade/Experience → one authored moment plus feedback on controls, more only if the direction calls for it. |
| Motion durations | soft: 700ms+ everywhere; emil/animate: UI < 300ms | User-triggered UI 120–250ms (dialogs and drawers up to ~400ms). One-time scroll reveals may run longer when the project allows them. |
| Stagger, blur-in, rise | taste/soft/minimalist/animate encourage | Not by default. Only when order carries meaning or the project's motion language uses it. |
| Scroll handling | | No scroll event listeners for animation; IntersectionObserver or CSS scroll-driven animation. |
| Dark mode | taste: both modes; impeccable: from the use scene | Use scene decides; a user-pinned theme ("white only") ships alone and is said so. |
| Em dash | taste-skill: banned in copy | Avoid as decorative separator in UI labels (a tell). In prose, follow the project's voice (the context file records it). |
| Asking questions | impeccable: 2–3 structured questions before new work; designing-ux: proposal before substantial change | Ask only what blocks. Substantial IA/flow changes still need a proposal and a yes. |
| Font swap first | redesign-skill fix priority | Rejected for refinement. Type changes are direction decisions (Stage 2), made only in Create or re-direct Redesign. |
| "Organic" fake data | redesign-skill: randomise dates, messy numbers to look real | Rejected (deceptive). Sample data is labelled as sample. |
| Review format | emil: Before/After/Why table required | Use it for motion and component findings inside the Lagann report; the report structure is Lagann's. |
| Critique protocol | impeccable: two sub-agents + detector required | Only when the user asks for an impeccable critique. Lagann's Verify stage is the default. |
| Specialists' own "mandatory" checklists | soft-skill, minimalist "must" lists | Lane-internal. Never applied outside a direction that chose the lane. |
