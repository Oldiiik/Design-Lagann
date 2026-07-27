# Soft Crumb design system

## Creative idea

A bakery counter staged like a small sculpture exhibition: pastries become oversized clay objects, while the interface stays crisp enough to make pickup effortless.

## Color

Committed color strategy:

- Blueberry field: `oklch(0.47 0.19 275)`
- Deep blueberry: `oklch(0.23 0.10 276)`
- Lilac clay: `oklch(0.79 0.11 304)`
- Coral signal: `oklch(0.66 0.19 31)`
- Golden bake: `oklch(0.77 0.14 75)`
- White: `oklch(1 0 0)`

## Typography

Anybody is the malleable display face; its broad, heavy forms echo modeled clay. Atkinson Hyperlegible Next handles copy and controls for clarity. Display tracking never exceeds `-0.035em`.

## Shape and depth

The interface now behaves like a bakery display tray. Navigation, product rows, process blocks, the pickup door, and ordering controls use paired directional shadows with inset highlights or pressed wells. Cards and sections stay at 12–16px radii; only buttons, chips, knobs, and crumbs become pills or circles. Clay depth is role-based rather than a decorative skin on every surface.

## Layout

Hero copy and pastry image sit on separate raised slabs inside one saturated blueberry field. The counter details bridge the hero and menu as an inset tray. Product rows step laterally to break repetition; process blocks use a different stacked rhythm; pickup resolves with one oversized sculpted door. Mobile flattens offsets, preserves image → headline → CTA → detail order, and keeps every control touch-safe.

## Motion

Short 180–280ms state transitions; one slow, ambient hero float; scroll reveals enhance already-visible content. Reduced motion disables translation and replaces it with instant state changes.
