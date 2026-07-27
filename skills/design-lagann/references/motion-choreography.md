# Motion choreography

Write a compact motion plan before implementation. List each important section and interactive component, its trigger, family, duration, easing, properties, and reduced-motion behavior. Every important item needs a binding or an explicit reason to remain static.

## Shared grammar

- Ease out: `cubic-bezier(0.23, 1, 0.32, 1)`
- Ease in-out: `cubic-bezier(0.77, 0, 0.175, 1)`
- Drawer: `cubic-bezier(0.32, 0.72, 0, 1)`
- Press feedback: 100–160ms and `scale(.97)` when appropriate
- Menus and dropdowns: 150–250ms
- Drawers and dialogs: 200–500ms
- Group stagger: 30–80ms
- Editorial reveal: 560–860ms, once per content entry

Animate transform and opacity for performance. Clip-path may be used for a deliberate one-time editorial reveal. Avoid width, height, top, left, margin, padding, and other layout properties.

## Required coverage

Consider the page opening, section headings, editorial imagery, grouped content, navigation, mobile drawers, tabs, dialogs, form loading/success/error, and meaningful scroll relationships. Reject one generic reveal applied to every block.

Open/close components must be interruptible. Delay `hidden` cleanup until the exit finishes and cancel stale timers or animations on re-entry. Gate hover movement behind `(hover: hover) and (pointer: fine)` and still provide press feedback for touch.

Under reduced motion, keep brief opacity and color transitions but remove travel, scale, clipping, parallax, looping, and stagger delay.

