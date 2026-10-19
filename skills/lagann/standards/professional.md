# Professional standards

What "production-ready" means, split into **hard requirements** (fix before calling it done) and
**recommendations** (do when they apply; a reasoned exception is fine). Each item says how to test it.
Report every item as Verified / Code-read / Not checked.

A quick automated sweep for a rendered page: run the contents of
`~/.claude/skills/lagann/scripts/browser-checks.js` through the browser pane's `javascript_tool`
(or any DevTools console). It returns overflow, unnamed controls, unlabelled inputs, images without alt,
heading order, small targets, contrast samples, LCP and CLS. It is a sweep, not a full audit.

## Accessibility (hard: WCAG 2.2 AA)

| Requirement | Test |
|---|---|
| Text contrast ≥ 4.5:1, large text (≥ 24px, or ≥ 19px bold) ≥ 3:1, UI components and focus indicators ≥ 3:1 | inspector `contrast`; browser-checks; computed colours |
| Every interactive element reachable and operable by keyboard, in a logical order | Tab through the page in the browser |
| Focus always visible, never removed without replacement, not hidden under sticky headers | Tab and screenshot |
| Every control has an accessible name; icon-only buttons have labels | `read_page`; browser-checks |
| Form fields have visible labels; errors are next to the field, in text, announced | Submit an invalid form |
| Meaningful images have alt text; decorative ones `alt=""` | browser-checks |
| One `h1`, headings in order, landmarks (`header`, `nav`, `main`, `footer`) | `read_page` |
| Colour is never the only carrier of meaning | Look at states and charts in greyscale |
| `prefers-reduced-motion` honoured: travel removed, comprehension kept | Emulate in DevTools, or read CSS |
| Content reflows at 320px CSS width and 200% zoom without loss | Resize to 320 |
| Touch targets ≥ 24×24px (AA), 44×44px recommended for primary touch UI | browser-checks |
| Dialogs trap and return focus; Escape closes; background inert | Open each dialog |
| `lang` on `<html>` | `read_page` |

## Responsive (hard)

- No horizontal scroll at 390, 768, 1024, 1440 (and 320 for reflow).
- Phone layout is composed, not squeezed: readable type (body ≥ 16px), thumb-reachable primary action.
- `100dvh`/`100svh` instead of `100vh` for full-height sections; safe-area insets on fixed UI for notched phones.
- Real copy at every width: no clipped headings, no overflowing buttons, no orphan-heavy headlines.

## Performance (hard where measurable; targets from Core Web Vitals)

| Metric | Target | Test |
|---|---|---|
| LCP | ≤ 2.5s | browser-checks (local numbers are optimistic; say so) |
| CLS | ≤ 0.1 | browser-checks; reserve space for images, embeds, fonts |
| INP | ≤ 200ms | interact; long tasks in DevTools performance panel |

Recommendations: images sized with `width`/`height`, `loading="lazy"` below the fold, modern formats
(AVIF/WebP), responsive `srcset`; fonts subset, `font-display: swap`, preload the display face; animate
compositor properties; blur and backdrop-filter only on small or fixed layers; no scroll listeners for
animation; avoid shipping a motion library for a fade. Deeper: `impeccable/reference/optimize.md`,
`ui-ux-pro-max --domain react` / `--stack <stack>`.

## Production readiness (hard)

- No console errors on a fresh load (a fresh tab, not one with stale HMR state).
- No dead links (`href="#"`), no buttons that do nothing, no fake forms or payment fields.
- No lorem ipsum, no placeholder names, no invented proof; sample content listed in the report.
- No debug artefacts, commented-out blocks, or `alert()`.
- Loading, empty and error states exist for every async surface.
- Favicon and page `<title>`.

## Public pages: SEO and sharing (recommendations; hard if the page is meant to be found)

`<title>` and meta description unique per page; Open Graph and Twitter card tags with a real image;
canonical URL; `lang`; one `h1`; descriptive link text; `robots` not accidentally blocking; sitemap for
multi-page sites; structured data only when true.

## Frontend security (hard)

- No secrets, API keys or service tokens in client code or HTML. Public keys only where the provider
  intends it.
- No `innerHTML` / `dangerouslySetInnerHTML` with untrusted content without sanitising.
- `rel="noopener noreferrer"` on `target="_blank"` links to other origins.
- No sensitive data in URLs or query strings.
- Forms post over HTTPS; `autocomplete` attributes on auth and address fields.
- Third-party scripts and fonts from trusted origins only; note them in the report.

## Internationalisation (recommendations; hard when the audience needs it)

Glyph coverage for the audience's scripts (Cyrillic, Kazakh letters, CJK); layouts tolerate 30–40%
longer strings; dates, numbers and currency formatted by locale; logical CSS properties if RTL is in scope.

## Cross-browser (test what is available; never claim more)

The headless inspector and the browser pane are Chromium. Note Safari-specific risks in code review:
`backdrop-filter` needs `-webkit-` on older Safari, `100vh` on iOS, date and select styling, `:has()`
and view transitions support, scrollbar styling. Report them as Code-read, not Verified.
