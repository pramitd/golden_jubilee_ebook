# V3.5 — Per-page typography scaling

- Added page-specific typography scaling based on each story page's text load.
- Sparse pages retain 12 pt body text; denser pages step down gradually (11.4, 10.8, 10.08, or 9.36 pt equivalent) instead of shrinking all pages globally.
- Source text remains unchanged. Word wrapping and widow/orphan rules are retained.

Validation note: source-level update only. Run the browser build and visually inspect long Professional Journey, Family and Memory pages before release. This density-based scale is a guardrail; final overflow validation still depends on the measured pagination probe matching the rendered page.
