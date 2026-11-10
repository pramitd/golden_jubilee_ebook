export function cleanText(s = '') {
  return String(s).replace(/\r/g, '').trim();
}

export function hasMeaningfulContent(s = '') {
  const t = cleanText(s);
  return !!t && !/^(?:[-–—_•.\s]|n\/?a|none|not applicable)+$/i.test(t);
}

export const MM = 96 / 25.4;
export const STORY_FIELDS = [
  ['career', 'Professional Journey'],
  ['family', 'Family'],
  ['memory', 'A Memory from College Days'],
];
export const FOOTER_GAP = 10;
export const MIN_TOKENS_ON_PAGE = 30;
export const PHOTO_HEIGHTS = [105, 92, 80, 70, 60, 52, 44];
export const FRESH_HEIGHTS = [250, 230, 210, 190, 170, 150, 135, 120, 108, 96, 86, 76, 68, 60];
export const PAIR_W = 72;
export const SINGLE_W = 158;
export const MAX_PER_PAGE = 8;
export const MIN_PHOTO_AREA_MM2 = 4000;
export const MIN_PHOTO_SCALE = 0.85;

export function photoBox(size, maxWmm, maxHmm) {
  const sc = Math.min((maxWmm * MM) / size.w, (maxHmm * MM) / size.h, 2);
  return {w: Math.round(size.w * sc), h: Math.round(size.h * sc)};
}

export function loadImageSizes(data) {
  const srcs = new Set();
  data.participants.forEach((p) => (p.photos || []).forEach((ph) => srcs.add(ph.src)));
  const sizes = {};
  return Promise.all(
    [...srcs].map(
      (src) =>
        new Promise((res) => {
          const im = new Image();
          im.onload = () => {
            sizes[src] = {w: im.naturalWidth || 800, h: im.naturalHeight || 600};
            res();
          };
          im.onerror = () => {
            sizes[src] = {w: 800, h: 600};
            res();
          };
          im.src = src;
        }),
    ),
  ).then(() => sizes);
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out.length ? out : [[]];
}

/** Fit an A4 page into a stage box (used by mobile scrollable pinch). */
export function fitScale(stageW, stageH, {margin = 16, max = 2.5} = {}) {
  const w = Math.max(200, stageW - margin);
  const h = Math.max(200, stageH - margin);
  const s = Math.min(w / 794, h / 1123);
  return Math.max(0.28, Math.min(max, s));
}

/**
 * Production desktop fit (`C` in the shipped bundle).
 * Uses window size + fixed chrome deductions — NOT the book element's own box
 * (that creates a circular shrink).
 *
 * @param {boolean} fullpage  fullscreen / reader-fullpage mode
 * @param {boolean} navOpen   TOC sidebar visible (reserves width)
 */
export function desktopFitScale(fullpage = false, navOpen = true) {
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 900;
  const pad = vw <= 650 ? 20 : 36;
  const sidebar = navOpen && vw > 650 ? (vw <= 900 ? 167 : 248) : 0;
  const shell = Math.min(vw, 1680);
  let availW;
  let chromeH;
  if (fullpage) {
    availW = Math.max(260, shell - pad * 2 - sidebar);
    chromeH = vw <= 650 ? 210 : 198;
  } else {
    availW =
      vw <= 650
        ? Math.min(vw - 20, 500)
        : Math.min(800, Math.max(260, shell - pad * 2 - sidebar));
    chromeH = 235;
  }
  const availH = Math.max(300, vh - chromeH);
  const raw = Math.min(availW / 794, availH / 1123);
  return Math.max(0.32, fullpage ? raw : Math.min(1, raw));
}
