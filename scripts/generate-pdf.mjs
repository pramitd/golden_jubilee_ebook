// Generates both PDF editions FROM THE ONLINE READER, so the PDF is page-for-page identical to the web book.
// It builds the site, serves it locally, opens the reader's built-in print mode (?pdf=1, A4 pages) in headless
// Chromium and prints it. Run:  npm run pdf:generate   (needs Ghostscript for the low-res edition: brew install ghostscript)
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const HIGH = resolve('public/golden-jubilee-high-resolution.pdf');
const LOW = resolve('public/golden-jubilee-low-resolution.pdf');

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
  await page.pdf({ path: HIGH, format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  console.log('High-res PDF:', (statSync(HIGH).size / 1e6).toFixed(1), 'MB');
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(r));
}
const gs = spawnSync('gs', ['-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5', '-dPDFSETTINGS=/ebook', '-dNOPAUSE', '-dBATCH', '-dQUIET', `-sOutputFile=${LOW}`, HIGH], { stdio: 'inherit' });
if (gs.error || gs.status !== 0) console.log('Ghostscript not found/failed - low-res PDF NOT updated. Install it with: brew install ghostscript');
else console.log('Low-res PDF:', (statSync(LOW).size / 1e6).toFixed(1), 'MB');
