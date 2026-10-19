# Contributing

Lagann is judgment written down, so changes are mostly prose. Good contributions:

- **A miss from real use**: the mode, stage or ruling that led somewhere wrong, the task, and what should
  have happened. These usually become a row in `modules/conflicts.md` or an entry in `modules/specialists.md`.
- **A new specialist**: read the skill's files, then add an entry in the same shape as the others (best at,
  what to read for which need, dependencies, lane or not, where Lagann overrules it). Point at its files;
  never copy its instructions into Lagann.
- **A script fix** with the command that reproduces the bug.

Rules: keep `SKILL.md` small (it loads every time), say each thing once, no personal paths or project
names in the skill, no new style bans (only signals with the conditions under which they are legitimate).

Before opening a pull request:

```bash
node scripts/validate.mjs
```
