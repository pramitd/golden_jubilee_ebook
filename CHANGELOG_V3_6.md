# V3.6 — Fixed A4 page geometry and footer-safe measured pagination

## Root-cause correction
- The previous viewer used a portrait `aspect-ratio` together with a `max-height` constraint. In some viewport sizes, the page was visually constrained without preserving the A4 page geometry.
- The previous pagination probe used millimetre padding while the visible story page used percentage padding. It therefore measured more usable text area than the visible page actually had.

## Changes
- The live flipbook now has a fixed internal A4 portrait sheet (210 × 297 mm) and scales the *whole sheet* to the available browser viewport. It does not distort or independently reflow the page to fit the viewport.
- The pagination probe and visible story pages now share the same physical story margins, heading metrics, body font rules, line height, and footer placement.
- Story body pagination continues to use rendered DOM measurements rather than a character quota. It preserves page-chunk order and checks page content against the reserved footer region.
- The profile identity footer-like slogan was removed from the content area because it was competing with the publication footer in dense profiles. The required `boroai.in` footer remains.
- Story and identity page frames reserve a 30 mm lower safe area; the folio remains fixed 8 mm from the lower page edge.

## Validation / release notes
- Fixed single-page orientation: A4 portrait throughout.
- Source-level checks are included; browser rendering and PDF regeneration should be run locally before public deployment.
- Existing PDFs are not silently represented as regenerated output by this source update; use `npm run pdf:generate` to regenerate editions from the project's current data.

- Fixed the short-section split bug: sentence-boundary preference is only considered when some source text genuinely remains outside the page. If all remaining content fits, it stays together on one page.
- Boundary preference cannot create a tiny orphan continuation; it is used only when at least 180 source characters remain for the next page.
- Smoke-tested all 53 non-placeholder narrative sections with the same A4 story styles at 1680×900, 1440×800, and 390×844 viewports: no measured footer overflows; all short sections stayed on one page. Also checked 14 profile-introduction layouts for footer overlap.
