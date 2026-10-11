# V3.9 — Compact story flow

## Layout changes
- Kept the dedicated identity page for each alumnus.
- Removed the redundant Education & Qualifications continuation page because education is already displayed on the identity page.
- Grouped Professional Journey, Family, and A Memory from College Days into compact story pages, allowing short sections to share a page instead of starting a new page each.
- Kept story chunks within the same alumnus and retained the existing measured text chunking logic.
- Kept additional photos grouped by two per page, in source order, with their captions.

## Data integrity
- No edits were made to `public/public_data.json`, `public_data.json`, or participant photo assets.
- The change is limited to reader page layout and associated CSS, plus this changelog.

## Validation note
- A production build was attempted in the packaging environment but could not run because Vite dependencies were not available there. Run `npm ci` and `npm run build` locally before deployment, then visually inspect the reader and exported PDF.
