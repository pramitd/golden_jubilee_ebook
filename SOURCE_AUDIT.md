# Source extraction audit

Source: `Compilation of GForm Inputs from Contributors - Vol 3.docx` (33 pages)

- Contributor index entries: **15**
- Complete profile tables extracted: **14**
- Embedded profile photographs extracted: **42**
- Profile order in the publication: alphabetical
- Photo presentation: uncropped (`object-fit: contain` in the website; aspect-ratio-preserving fit in PDFs)
- Text source: profile table values are copied into `public/public_data.json` without editorial rewriting.
- Captions: extracted from Word text boxes associated with photo tables where available. Some photos in the source have no caption.
- Missing source profile: **Bijan K. Dutta** is listed in the contributor index but no corresponding profile table or profile photos were present in the supplied Word document. The publication identifies this gap instead of creating a fictitious profile.

## Fields carried into each profile

`name`, `nickname`, `branch`, `email`, `phone`, `location`, `education`, `career`, `family`, `memory`, and `photos[]` (source image path, caption, alt text, order).

## Public-contact note

The Word compilation includes email addresses, telephone numbers and at least one detailed street address. This edition preserves these source fields as requested. Before making the website public, confirm that publication of those contact details is intended and consented to.
