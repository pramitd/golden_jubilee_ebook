# Golden Jubilee ’76 — NIT Raipur Commemorative E-book

An emerald-and-gold editorial flipbook built from the curated Word compilation supplied for the Golden Jubilee class of 1976. The website uses structured profile data and extracted photographs; it does **not** render screenshots of the Word pages.

## Data integrity

- `public/public_data.json` is the publication data extracted from `Compilation of GForm Inputs from Contributors - Vol 3.docx`.
- `public/assets/profiles/` contains the extracted photographs.
- Profile text is retained as supplied; pagination splits long text at paragraph/word boundaries and does not intentionally truncate it.
- Images use `object-fit: contain` to preserve the full image without forced cropping.
- Source audit: 15 names in the contributor index, 14 complete profiles in the source, and 42 extracted photographs. Bijan K. Dutta appears in the index but the supplied Word file does not include a corresponding profile. This is explicitly disclosed in the index rather than inventing a profile.
- The Word source contains contact details; the site includes them because the requested publication scope is to preserve all supplied data. Review public-contact consent before production publication.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Vite prints the local URL.

## Build

```bash
npm run build
npm run preview
```

The production site is written to `dist/`.

## Generate the PDF

From the project root:

```bash
npm install
npm run pdf:generate
```

The command prints the web reader (`?pdf=1`) to `public/golden-jubilee-high-resolution.pdf` (A4 portrait).

## Deploy

Import this repository into Vercel. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`. Add `boroai.in` or a subdomain in Vercel Project Settings → Domains after the deployment is verified.

## Notes

This project is a new editorial composition using the Word document for data, not a conversion of the original Word pages into images. A profile starts with a designed portrait page, followed by content-driven story pages and uncropped photo/caption pages. `boroai.in` appears in the footer of every book page.

## V3.6 layout correction

The reader page has a single A4 portrait specification (210 × 297 mm). The web reader scales the whole sheet down to fit the viewport instead of allowing `max-height` to distort the page. Story pagination is measured at the same natural A4 dimensions, with matching margins and footer clearance. Source text chunks are whitespace-preserving and checked for exact concatenation before pages are committed.

### Build and regenerate

```bash
npm install
npm run build
npm run dev
```

To regenerate the separate A4 PDF editions from `public/public_data.json`:

```bash
python3 -m pip install -r requirements.txt
npm run pdf:generate
```

The PDF generator skips blank or placeholder-only memory sections (`--`, `---`, `n/a`, `none`) just as the online book does. After generation, inspect a long career page, a multi-paragraph family page, and a blank-memory profile before deploying.

## V7 compact flow
Each alumnus starts on a new page; the story and extra photos then flow continuously without forced page
breaks. See `CHANGELOG_V7_COMPACT_FLOW.md`.
