# V3.2 — text-safe page recalibration

- Reduced story chunk target from 720 to 340 characters, preserving paragraph boundaries where possible and splitting long paragraphs at word boundaries.
- Reserved a larger footer safe area on story pages.
- Reduced story heading/body scale and spacing to make typography more consistent across pages.
- Removed the decorative story sign-off that overlapped the final paragraph and footer.
- Added print/PDF-specific safe-area overrides.
- Tightened profile-page details spacing and enabled aggressive wrapping for long email/contact fields.
- No source profile wording or captions are intentionally removed by these layout changes.

Run `npm install`, `npm run build`, and inspect the longest Professional Journey profile before publishing.
