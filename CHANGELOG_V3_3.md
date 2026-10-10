# V3.3 — Content-first story pagination

- Replaced the 340-character chunk threshold with a 1,400-character packing target, packing complete paragraphs together before adding another page.
- Oversized paragraphs are divided at sentence boundaries first; word-boundary splitting is only a fallback for unusually long sentences.
- Continuation pages no longer repeat the large section title and decorative rule. They use a compact “SECTION · CONTINUED” marker to preserve room for story text.
- Updated web and print typography/spacing for story pages while retaining the reserved footer safe area.
- Empty/placeholder memory suppression and one-photo-per-feature-page behaviour are retained.

This is a layout-source correction; the browser/PDF render still needs to be run locally to validate actual font metrics at deployment size.
