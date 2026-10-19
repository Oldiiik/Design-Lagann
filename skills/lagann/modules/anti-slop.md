# Anti-slop

Slop is not a style. It is **design nobody decided**: elements that appear because they are the
statistical default, not because this product, this content or this user needed them. Any pattern can be
excellent when chosen and executed for a reason. The same pattern is slop when it arrives on its own.

So this module never bans. It detects, questions, and changes only with a defensible reason.

## Three orders of slop

1. **First order: the generator's defaults.** Violet-to-blue gradients, centred SaaS hero with two
   buttons and a screenshot, three icon cards, soft grey shadow under every rounded box, glowing
   buttons, emoji bullets, "Elevate your workflow".
2. **Second order: the overcorrection that became a look.** Responding to first-order slop by making
   every site the same restrained page: warm cream or bone ground, high-contrast serif display (often
   one italic word), terracotta or rust accent, hairline rules, tiny tracked mono labels, broadsheet
   columns, generous emptiness passed off as taste. Also: near-black with one acid accent; brutalist
   costume (hard offset shadows, black boxes); and the anti-slop house style itself applied to everything
   (flat fills, giant type, square buttons, one huge accent block, no shadows anywhere, regardless of subject).
3. **Third order: originality theatre.** Novelty that costs the user: experimental navigation on an
   app people work in, unreadable display type for body content, scroll-jacking, a redesign of
   distinctive work just to look different. Also *removing* things that worked because a rule said so.

Never replace one cliché with another. Every proposed fix gets the same scrutiny as the original.

## The five questions (ask for every flagged pattern)

1. **Was it selected automatically?** Can you trace it to a reason in the brief, the content, the
   identity or the function? "It's what pages like this have" is not a reason.
2. **Does it serve a real purpose?** Visual (hierarchy, focus, rhythm), functional (grouping, status,
   affordance), or brand (a recognisable motif, the product's own material).
3. **Does it belong to the product's established design language?** If it is part of the identity
   (context file, repeated deliberately across the product), it stays. Identity outranks specialist taste.
4. **Would changing it meaningfully improve the interface?** For the user, the brand, or the clarity,
   not just for novelty. If the gain is marginal, leave it.
5. **Could the replacement become another cliché?** If the fix is what any "make it less AI" advice would
   suggest (cream + serif, giant type, remove all shadows, square everything), it is probably next
   season's slop. Find the fix in the subject instead.

Recommend a change only when 1 or 2 fails, 3 does not protect it, 4 is a clear yes, and 5 is a no.

## Tests that produce evidence

- **Category guess**: could someone guess this look from the category alone ("it's a fintech, so dark
  navy with a green accent")? Then the look belongs to the category, not the product.
- **Competitor swap**: replace the product name with its nearest competitor. If nothing else needs to
  change, the design has no idea of its own.
- **Content removal**: blur or delete all text. Is what remains still recognisably this product's
  world, or a generic layout?
- **Decision trace**: list the 6–10 most visible elements; next to each, the reason it exists. Blank
  reasons are the candidates. This is the core of every audit.
- **Density honesty**: is the space filled with content, data and real imagery, or with chrome
  (labels, dividers, decorative shapes, cards around single sentences)? Empty is also a failure when
  the section was simply underbuilt.
- **Effects off**: mentally remove gradients, glow, blur, shadows, glass and decorative motion. Is the
  design still specific? If the hierarchy or the idea disappears, the effects were standing in for composition.
- **Cluster**: three or more symptoms sharing one root cause (split hero + floating render + glow; card on
  card on card; stock copy + stock imagery + default CTA pair) are one finding about that cause, not three
  cosmetic ones. Fix the cause.
- **Detached decoration**: does every floating shape, render or ornament connect to alignment, meaning,
  a transition or an interaction? If not, it is filling space.
- **Repetition**: do neighbouring sections, cards or panels share one layout for no reason? On Operate
  surfaces consistency is a virtue; on Persuade pages it is usually a missed decision.
- **Specificity of copy**: would the headline work for any product in the category? Is any proof invented?

## Symptom catalogue

Each row is a *possible* symptom. "Legit when" is the defence that makes it a decision.

**Composition**

| Symptom | Legit when |
|---|---|
| Centred hero: headline, sub, two buttons, screenshot below | One message must dominate and the product shot is the proof; executed with a real idea in the type or image |
| Hero-metric template (big number, small label, stat row, accent) | The number *is* the story and it is real |
| Stock section order: hero, logos, three features, testimonial, pricing, CTA | The argument genuinely runs in that order and each block carries real content |
| Bento grid of rounded tiles | Content truly has mixed weight; tiles differ in content, not just size |
| Identical card rows; cards inside cards | Items really are parallel objects (products, files); nesting never |
| Everything centred and symmetrical | A formal, ceremonial or poster-like subject |
| Huge empty sections | One deliberate rest per page |

**Surface and colour**

| Symptom | Legit when |
|---|---|
| Violet / indigo / blue gradients, mesh orbs, glows | The brand's real colours, light as subject matter (a lighting company), or a deliberate atmosphere the rest of the system supports |
| Glass and backdrop blur | Something truly floats over moving content (sheet, sticky bar, overlay) |
| Soft grey shadow under every surface | Elevation encodes hierarchy, light direction is consistent, and few things are raised |
| Hairline rules, 1px outlined boxes, ruled grids | Real tables, forms, data, or a documentary/technical world the brand owns |
| Cream ground + serif + terracotta | The subject's own materials (a ceramics studio, a print shop) or the user pinned it |
| Near-black + one neon accent | Night-use scene, a terminal-native audience, or the brand colour |
| Noise, grain, texture overlays | The material is part of the subject (paper, film, fabric) |

**Typography**

| Symptom | Legit when |
|---|---|
| One word in italic serif or accent colour | Never as a reflex; only when the word is the concept and the system repeats the device |
| Tiny tracked uppercase eyebrow above every heading | It carries information (category, date, status) or is a repeated identity motif, not chrome |
| Monospace for labels and captions | Code, data, measurements, or a product whose users live in terminals |
| 01 / 02 / 03 numbering | The content is a real sequence and order matters |
| Default-list faces (Inter, Poppins, Space Grotesk, Playfair, Instrument Serif...) | Chosen for a stated reason: script support, the product's existing identity, Operate legibility |
| Nine near-equal font sizes | Never; it means no scale was chosen |

**Components**

| Symptom | Legit when |
|---|---|
| Pill everything (buttons, badges, nav, inputs) | Roundness is the system's shape idea and hierarchy still reads |
| One medium radius (12–16px) on everything | The project's established radius; otherwise vary by size and hierarchy |
| Floating glass pill nav | The direction's identity, never alongside a second nav style |
| Icon-in-rounded-square + heading + text features | Icons are real, specific and scannable in an Operate context |
| Filled + ghost button pair everywhere | Two genuinely distinct actions |
| Fake UI built from grey bars, donut charts and sparklines | Never on a page that could show the real product; label synthetic data |

**Content and copy**

| Symptom | Legit when |
|---|---|
| "Elevate", "seamless", "unleash", "supercharge", "next-gen" | Never |
| Generic CTAs: Get started, Learn more, Submit | The action really is generic; usually name it ("Book a table") |
| Invented logos, testimonials, ratings, "10,000+ teams" | Never. Real proof or none |
| Placeholder names, lorem, round fake numbers | Never shipped; sample content is labelled for the client |

**Motion**

| Symptom | Legit when |
|---|---|
| Fade-and-rise on every section; staggered everything | The project's motion language uses it, or order carries meaning |
| Blur-in reveals, bouncing or pulsing dots, spinning logos on hover | A single authored moment the direction calls for; never on frequent UI |
| Hover lift and shadow on every card | Cards are clickable and the lift is the affordance |

**Operate surfaces (dashboards, tools)**

| Symptom | Legit when |
|---|---|
| Left sidebar + KPI cards row + line chart + table, regardless of domain | Users really need those KPIs first; order follows their decisions, not the template |
| KPI tiles with arrows and percentages that mean nothing | Each metric has a comparison period, a unit and an action |
| Decorative charts | The chart answers a question the user asks; otherwise a number or a table |
| Low density with huge padding | Infrequent, high-stakes tasks; daily tools usually want more density |

## Verdicts

For each candidate, choose one and write it in the report:

- **Keep**: chosen and working. Say why, so nobody "fixes" it later.
- **Keep, execute better**: right decision, weak execution (the gradient is right, its banding is not).
- **Question**: could go either way; ask the user or note it as optional.
- **Change**: fails the five questions. Give the reason, the replacement, where the replacement comes
  from in the subject, and why the replacement is not the next cliché.

## Preserve first

Before any change list, write what is already distinctive and working: a motif, a component, a type
treatment, a colour field, an interaction. Those are protected. A redesign that loses them has failed
even if it removed every tell.

## Direction check (Stage 2, before code)

- Does the idea sentence pass the competitor swap?
- Could the palette, type and composition be guessed from the category?
- Is the direction one of the second-order looks without the brief asking for it?
- Is the boldness spent in one place, or sprinkled?
- Would the first viewport be described an hour later as something specific, or as "clean and modern"?

## Tools that feed this module

- `node ~/.claude/skills/lagann/scripts/inspect.mjs <url|file>`: its `signal` findings are pattern
  detections (gradient, shadow, eyebrow, mono, hairline, card rows, palette families, still page...).
  Each one is a question for this module, never an automatic fix.
- `node ~/.claude/skills/taste-skill/scripts/lint.mjs <src>`: static scan for the same patterns plus
  stock copy and motion habits. Same rule: signals, not verdicts.
- impeccable's detector (`impeccable detect`, via its launcher): only after the user approves the download.
- Calibration sources when you need more depth: `taste-skill/references/tells.md` (dated registry),
  `frontend-design/SKILL.md` (the five AI clusters), `impeccable/reference/new-work.md` §4 (rendition
  priors), `taste-skill/references/copy.md` §6 (generated-sounding copy).
