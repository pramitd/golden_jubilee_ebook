# V7 — Compact continuous flow (fewer pages per alumnus)

## Problem
Forced page breaks left most pages 30–60% empty: the identity page ended at ~40% and the story always
started on a new page, each section was paginated as if it owned a page, and every pair of extra photos
got its own page inside a fixed-height box.

## Change
Every alumnus still **starts on a new page** (the identity page). From there everything flows continuously,
with no forced page breaks, and a page is closed only when it is genuinely full:

1. Identity block (unchanged design) → Professional Journey → Family → A Memory from College Days
   follow directly beneath it on the same page.
2. Text flows to the footer line and continues on the next page (headings are never stranded at the bottom;
   a section moves on only if fewer than ~3 lines would fit).
3. Extra photographs follow the text in source order, up to two per row with their captions. A row shrinks to fit the space left only down to 85% of its ideal size; otherwise it moves to the next page at full size. Scaled
   (uncropped) to the largest size that fits the space left; a row moves to the next page only if it
   cannot fit even at the smallest size.

Applied to both renderers:
- `src/main.jsx` / `src/styles.css` — web reader and browser PDF export (browser-measured at real A4 geometry).
- `scripts/generate-pdfs.py` — the two downloadable PDFs (removed the `PageBreak()` after the identity page
  and between photo pairs; closing page now on its own page; low-res fallback when Ghostscript is absent).

Colours, fonts, ornaments, footer, identity-page design and the cover/index/closing pages are unchanged.

## Result (same data)
| | Before | After |
|---|---|---|
| Web reader / browser PDF | 60 pages | 32 pages |
| Downloadable PDFs (ReportLab) | 64 pages | 37 pages |

## Data integrity
- `public_data.json` and all photo assets are untouched.
- Pagination verifies at runtime that each section's chunks re-join to the exact source text and throws otherwise.
- Independent audit: every content paragraph of the Word file is present in the JSON (only field labels /
  headers differ), and all 272 text units (every field line + photo caption) were found in the rendered PDFs.

## No generated text (V7)
- Removed the fallback captions the original project inserted when a photo had none (`A recent photograph`
  in the reader, `Recent photograph` and `Photograph not available in source.` in the PDF script). A photo
  without a caption in the Word file now shows no caption.
- All 39 captions in `public_data.json` were verified verbatim against the Word file.
- Remaining non-source text is fixed layout furniture only (section labels, cover, closing page, footer,
  and the note that Bijan K. Dutta has no profile in the source).

## Reader zoom
- Added zoom out / zoom in buttons with a live percentage (click the percentage to return to fit-to-screen).
- Keyboard: `+` zoom in, `-` zoom out, `0` fit. Ctrl/Cmd + scroll wheel over the page also zooms.
- Zoomed pages scroll inside the reading frame; range 50%–300% of fit. PDF export is unaffected.

## Cover redesign
- Much larger gold "50" seal (lining figures), refined title block, and a new "Edited by Bijon Dutta" line.
- The NIT Raipur campus gate rises from the foot of the page, tinted to the emerald palette and faded into the background (`public/assets/cover/campus-gate.webp`).
- Applied to both the web reader and the downloadable PDFs (`scripts/generate-pdfs.py`).

## Closing page redesign
- Same large gold "50" seal as the cover, the "Edited by Bijon Dutta" credit, and the closing line "Years pass. Friendship remains." on the dark emerald background.
- Applied to both the web reader and the downloadable PDFs (the PDF closing page is now dark like the cover).

## Download buttons
- Header buttons read "DOWNLOAD LOW RES ↓" and "DOWNLOAD HIGH RES ↓" (the two files genuinely differ in size and photo resolution).
