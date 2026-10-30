// Generates the publication PDF from the online reader (?pdf=1). Run: npm run pdf:generate
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const OUT = resolve('public/golden-jubilee-high-resolution.pdf');

console.log('Building the site...');
await build({ logLevel: 'warn' });
const server = await preview({ preview: { port: 4174, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('page error:', String(e)));
  console.log('Laying out every page in the browser (this takes a minute)...');
  await page.goto('http://127.0.0.1:4174/?pdf=1', { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForSelector('.pdf-export .pdf-sheet', { timeout: 300000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  await page.waitForTimeout(1500);
  const sheets = await page.locator('.pdf-sheet').count();
  console.log(`Reader pages: ${sheets}`);
  const pdfMeta = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('.pdf-sheet')];
    const outline = [];
    sheets.forEach((el, i) => {
      const title = el.getAttribute('data-outline');
      if (title) outline.push({ title, page: i });
    });
    const indexSheet = document.querySelector('.pdf-sheet .index-page');
    if (indexSheet) {
      const idx = sheets.findIndex(s => s.contains(indexSheet));
      if (idx >= 0) outline.unshift({ title: 'Contributors index', page: idx });
    }
    const cover = document.querySelector('.pdf-sheet .cover-page');
    if (cover) {
      const idx = sheets.findIndex(s => s.contains(cover));
      if (idx >= 0) outline.unshift({ title: 'Cover', page: idx });
    }
    const links = [];
    sheets.forEach((sheet, pageIndex) => {
      const sheetRect = sheet.getBoundingClientRect();
      if (!sheetRect.width || !sheetRect.height) return;
      sheet.querySelectorAll('a.index-entry-link').forEach(a => {
        const id = (a.getAttribute('href') || '').replace(/^#/, '');
        const dest = id && document.getElementById(id);
        const destSheet = dest && dest.closest('.pdf-sheet');
        const destPage = destSheet ? sheets.indexOf(destSheet) : -1;
        if (destPage < 0) return;
        const r = a.getBoundingClientRect();
        links.push({
          page: pageIndex,
          dest: destPage,
          x: (r.left - sheetRect.left) / sheetRect.width,
          y: (r.top - sheetRect.top) / sheetRect.height,
          w: r.width / sheetRect.width,
          h: r.height / sheetRect.height,
        });
      });
    });
    return { outline, links };
  });
  console.log(`Contributor links: ${pdfMeta.links.length}`);
  await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  console.log('PDF:', (statSync(OUT).size / 1e6).toFixed(1), 'MB');
  const { writeFileSync } = await import('node:fs');
  const { spawnSync } = await import('node:child_process');
  const metaPath = resolve('scripts/.pdf-meta.json');
  writeFileSync(metaPath, JSON.stringify(pdfMeta));
  const py = spawnSync('python', ['scripts/add-pdf-outline.py', OUT, metaPath], {
    cwd: resolve('.'),
    encoding: 'utf8',
  });
  if (py.stdout) console.log(py.stdout.trim());
  if (py.stderr) console.log(py.stderr.trim());
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}
