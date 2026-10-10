# V3.4 — Browser-measured story pagination (experimental)

- Replaces fixed character thresholds with rendered-height measurement of actual story pages.
- Packs whole paragraphs on each page where they fit, splitting paragraphs by words only when necessary.
- Keeps compact continuation headings and reserves a protected footer area.
- Recomputes page counts and contributor page indexes after pagination.

## Important limitations
- Browser measurement currently uses a fixed 794 × 1123 reference canvas. Browser resizing and different print dimensions can change text metrics; verify pages at deployment and PDF export size.
- The separate Python ReportLab PDF generator does not yet use this React pagination algorithm. The two outputs are not guaranteed page-identical.
- Build and screenshot verification have not been completed in this environment (Vite dependencies are not installed).
