# GAZU — editorial fashion storefront

A frontend-only homepage for a fictional contemporary clothing brand. Monochrome
warm-neutral system, oversized wordmark, image-led composition. No backend, no
build step, no framework, no dependencies — plain HTML, CSS and ~60 lines of JS.

```
index.html
styles.css
script.js      progressive enhancement only — the page is fully readable without it
assets/        13 photographs (see credits)
```

## Run it

Any static server. From this directory:

```bash
python -m http.server 5503
```

Then open `http://localhost:5503/`. Opening `index.html` over `file://` also
works — everything is relative.

## Structure

Announcement bar → navigation → hero → category strip → new-season editorial →
service strip → product grid. The density deliberately alternates: dense nav,
very spacious hero, dense black category strip, large editorial image, minimal
trust strip, product grid.

Breakpoints: desktop 1200px+, tablet 768–1199px, mobile below 768px. Mobile is
recomposed rather than scaled — the hero stacks, the category strip becomes a
horizontal snap-scroll row, services go 2×2, products go 2-up.

## Decisions that depart from the brief, and why

Each of these was a conflict inside the brief itself, resolved deliberately.

**Muted text darkened — `#777672` → `#5C5B58`.** Measured against the grounds it
is actually used on, the specified value gives 3.44:1 on `--color-bg` (cart
count, service descriptions) and 4.17:1 on `--color-surface` (product swatch),
at 9–12px. All below the 4.5:1 AA floor. The brief asks for both this palette
and accessible controls; where they conflict, legibility wins. The replacement
is the same warm neutral one step darker — 5.1:1 and 6.2:1 — and still reads as
clearly recessive against `--color-secondary`.

**The editorial banner is a split composition, not type over photography.** The
brief asks for a full-width photographic band 270–330px tall with the headline
over it, and separately forbids a heavy overlay. With portrait source imagery
those cannot both hold: cover-cropping a 1800×2250 frame to a 330px band zooms
into the model's face and leaves the headline dark-on-dark. Rather than add the
scrim the brief rules out, the photograph keeps the right half at its own
proportions and the type gets clean ground on the left. Contrast becomes
deterministic instead of depending on which pixels the crop happens to land on.

**The hero photograph is feathered, not cut out.** The brief wants the image
integrated into the composition rather than reading as an image card, with the
wordmark behind the model. The source is a studio shot whose backdrop measures
163,154,147 at top-left to 209,209,209 at mid-right against a page of
225,224,220 — a 46-point spread with a heavy vignette, so no uniform correction
flattens it into the page, and the lift needed at the darkest corner would blow
out the figure. `mix-blend-mode: multiply` keeps the dark wordmark readable
through the backdrop; a soft edge mask dissolves the boundary. What remains
reads as a studio vignette behind the model rather than a pasted rectangle.

**Category images are strongly desaturated and lifted** (`grayscale(88%)
brightness(1.22)`). They come from three different shoots; on a black strip any
surviving colour cast reads as inconsistency, and two of the three are low-key
enough to render as black shapes without the lift.

## Known gap

**Inter is not bundled.** The stack is `"Inter", "Helvetica Neue", Helvetica,
Arial, sans-serif`, so machines without Inter installed fall back to Helvetica
or Arial. The brief asks for Inter but also for no unnecessary dependencies, and
linking Google Fonts adds a third-party request on every load. Self-hosting a
subset in `assets/` would close this properly — worth doing before this is
treated as finished.

## Verified

Checked in headless Chromium at 1440, 900 and 390px wide:

- Zero console errors, zero failed requests.
- Zero horizontal page overflow at every breakpoint — the usual failure mode for
  a wordmark set at `23vw`.
- **Contrast measured, not assumed:** 21 probes across every text role, each
  against the background actually composited behind it, checked to WCAG AA with
  the large-text threshold applied by computed size and weight. All 21 pass; the
  three that failed first are what prompted the muted-text change above.
- JavaScript disabled: all content renders. The reveal animation starts from
  `opacity: 0`, so it is gated on a `.js` class set inline in `<head>` — without
  that gate a scriptless visitor gets an invisible page.
- Mobile menu: opens, sets `aria-expanded`, locks body scroll, closes on Escape,
  closes when a link is chosen, and auto-closes if the viewport is resized past
  the breakpoint.
- `prefers-reduced-motion: reduce`: content renders opaque with animation off.
- Skip link is the first tab stop.

## Image credits

All photographs from [Unsplash](https://unsplash.com), used under the
[Unsplash License](https://unsplash.com/license). Referenced by photo ID:

| File | Unsplash ID |
|---|---|
| `hero.jpg` | `f1bGNPDeDO0` |
| `banner.jpg` | `CvzOUDjMHtY` |
| `cat-men.jpg` | `3STLQyg3DH8` |
| `cat-women.jpg` | `ThZwoUcVQM4` |
| `cat-kids.jpg` | `roOk3_WVNRI` |
| `p1.jpg` | `BY9i9My-cbk` |
| `p2.jpg` | `Qy8IEssqkYU` |
| `p3.jpg` | `V0RVqZ69JEg` |
| `p4.jpg` | `M2oO37DV49A` |
| `p5.jpg` | `E8HWUBF4HSg` |
| `p6.jpg` | `Cj6ILijUorQ` |
| `p7.jpg` | `EwZWYzoJjao` |
| `p8.jpg` | `brBy3WN7FbU` |

GAZU is a fictional brand. Prices, product names and copy are invented for
layout purposes.
