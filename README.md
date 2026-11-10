# Golden Jubilee ’76

Commemorative ebook for the NIT Raipur class of 1976.

## This branch (`mac_reversed_engg`)

Rebuildable source restored on macOS by reverse-engineering the production
Vercel bundles (mobile reader, fullscreen, scrollable pinch-zoom, participants
drawer) plus the 51-person album data.

### Develop

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

Output goes to `dist/` (Vercel `outputDirectory`). Keep
`public/loaderio-*.txt` so domain verification survives rebuilds.

### Regenerate the high-res PDF (page-identical to the web reader)

```bash
npx playwright install chromium   # once
npm run pdf:generate
```

Requires Ghostscript only if you also want the optional low-res derivative
(`brew install ghostscript`). Production ships the high-res PDF only.

### Notes

- Album data: `public/public_data.json` (51 contributors).
- Upright profile photos for Ranjana Deshpande Muley (`photo-1`) and
  Umesh Chitlangia (`photo-2`) are baked into the JPEGs under
  `public/assets/profiles/` (and therefore into both web and PDF).
- Mobile pinch zoom uses the post-revert **scrollable** model (viewport size
  × scale + overflow), not the earlier transform-origin experiments.
