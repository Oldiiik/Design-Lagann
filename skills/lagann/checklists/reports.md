# Report formats

Short, specific, honest. Lead with the answer. Never claim a check you did not run.

## Audit report

```
Verdict: <one sentence: is it professional / where it stands / the single biggest issue>
Rendered: <how: inspector at 1440/768/390, browser pane, or "not rendered (code only)">

Keep (distinctive and working)
- <decision> — <why it works; protect it>

Critical defects
- <what> — <where (file:line or screen/state)> — <evidence> — <fix>

Significant usability problems
- ...

Visual improvements
- ...

Generic / unchosen patterns (anti-slop)
- <pattern> — <verdict: keep / execute better / question / change> — <reason> — <replacement and why it is not the next cliché>

Optional creative suggestions
- ...

Not checked: <items and why>
Next: <top 3 fixes in order>
```

Severity tiers are defined in `stages/4-verify.md` §3. Motion and component findings may use emil's
`| Before | After | Why |` table inside their section.

For "why does this feel AI-generated?" lead the report with the decision trace (anti-slop.md, Tests):
the visible elements, the reason each exists, and which ones have none.

## Create report

- Direction: thesis, chosen over which alternatives, and why. Seed/redraws if taste-skill `draw.mjs` was used.
- What was built (files), and the signature element.
- Verification: what was rendered and tested, at which widths and states; final remaining issues.
- Sample content to replace before launch; found images with credits; anything stubbed (forms, checkout).
- Context file: what was recorded.

## Redesign plan (before building, for re-direct depth or IA changes)

- Keep: identity cues, content, behaviour, distinctive decisions.
- Change: the problems, each tied to an audit finding.
- Direction: the replacement world or the refinement scope.
- Risks and what the user should confirm.

## Modify / Continuous QA

One or two lines: what changed, what was checked (Verified / Code-read), anything spotted outside scope.
