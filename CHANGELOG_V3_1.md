# Golden Jubilee e-book — V3.1 layout recalibration

## Changes
- Reduced story-page text chunk size so long professional journeys and family stories create additional continuation pages before the fixed footer area is reached.
- Changed additional-photo pagination to one photograph per page, giving each image a dedicated editorial spread and more space for its full caption.
- Updated profile-page layout to reduce the hero image footprint, wrap long email/phone/education values, and keep the identity strip in normal document flow rather than overlaying the footer.
- Increased reserved safe area above the footer for story pages and PDF export.
- Preserved image aspect ratio (`object-fit: contain`) and full caption wrapping.

## Build and inspect
```bash
npm install
npm run build
npm run dev
```
Inspect at least: a long professional journey, a long email address, a profile with multiple photos and long captions, and a contributor with no college memory.

This package has source-level changes. It has not been browser-rendered or production-deployed in this environment; visual QA on the target browser and regenerated PDFs is still required before publication.
