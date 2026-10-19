# Change check (Modify and Continuous QA)

Run only the rows for what you changed. Each takes seconds. The goal is "the change is right and nothing
around it broke", not a fresh audit.

## Always

- [ ] Used existing tokens and components; no new hard-coded colour, size, radius, shadow or duration.
- [ ] Matches the nearest existing example of the same thing in this project.
- [ ] Copy uses the product's voice and names the action.
- [ ] Rendered the affected area at the widths it ships (or said why not), and compared with before.
- [ ] No console errors introduced.

## By change type

**Button, link, control**
- [ ] Hover (gated to `(hover: hover)`), focus-visible, active/pressed, disabled, loading if async.
- [ ] Accessible name; target ≥ 44px on touch; contrast of label and focus ring.
- [ ] Hierarchy still clear: one primary action per region.

**Spacing, alignment, layout**
- [ ] On the spacing scale; more space above a heading than below; shared edges still align.
- [ ] No overflow or wrap regressions at 390 / 768 / 1440.

**Dropdown, menu, popover, tooltip, dialog**
- [ ] Keyboard: open, move, select, Escape, focus returns to trigger.
- [ ] Positioning near viewport edges; scroll containers; z-index from the scale.
- [ ] Motion: origin-aware, 150–250ms, interruptible, reduced-motion path (or no motion if frequent).

**Form field or form**
- [ ] Visible label, helper text where needed, error next to the field in words, required marking.
- [ ] Correct input type and `autocomplete`; paste works; long values fit.
- [ ] Submit: loading, success, failure with recovery.

**Data display (table, list, card, chart)**
- [ ] Empty, loading, error, partial, very long and very many states.
- [ ] Tabular numerals; units and comparison periods; truncation with access to the full value.

**Typography or colour change**
- [ ] It is a token change, applied everywhere it should be, or a deliberate local exception noted in the context file.
- [ ] Contrast in every theme the product ships.

**Motion change**
- [ ] Fits the project's motion language (context file).
- [ ] Purpose named; frequency gate passed; transform/opacity; reduced motion handled.

**New section or component inside an established page**
- [ ] Inherits the page's world; differs from neighbours only where the content needs it.
- [ ] Quick anti-slop pass on the new part only (is anything here unchosen?).

## Report (one or two lines)

What changed, what was checked and how (Verified / Code-read), anything noticed outside scope.
