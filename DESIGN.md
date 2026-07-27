# Design System

## Intent

Design Lagann’s own surfaces should feel like a precise instrument: restrained, evidence-first, and quietly distinctive. The physical scene is a daylight studio review table where annotated proofs, not decoration, carry attention.

## Color

Use a restrained palette anchored by the generated moss seed.

```css
:root {
  --dg-bg: oklch(1 0 0);
  --dg-surface: oklch(0.965 0.006 140);
  --dg-ink: oklch(0.19 0.025 145);
  --dg-muted: oklch(0.47 0.025 145);
  --dg-primary: oklch(0.52 0.105 140);
  --dg-accent: oklch(0.42 0.13 28);
  --dg-border: oklch(0.86 0.014 140);
}
```

Use primary for active state and progress. Use accent only for high-severity critique or comparison deltas. Keep data and evidence legible without relying on hue alone.

## Typography

Use one high-quality system sans stack for CLI-adjacent or product surfaces. Keep the scale compact and fixed. Use tabular numerals for measurements, scores, and timings. Cap prose at 72ch.

## Shape and elevation

Use 6–12px radii. Prefer borders or tonal separation to large shadows. Never pair a thin border with a wide decorative shadow.

## Layout

Organize information as a sequence of evidence, decisions, and actions. Use dense tables for comparable data and plain grouped sections for narrative. Do not turn every report into a card grid.

## Motion

Use 150–220ms state transitions with exponential ease-out. Motion must explain capture, analysis, comparison, or state change. Always support reduced motion.

## Voice

Lead with the decision or failure. Name the evidence and confidence. Avoid hype, anthropomorphic mystique, and unsupported quality claims.
