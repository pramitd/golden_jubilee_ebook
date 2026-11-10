import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProfilePage} from '../pages/ProfileFlow.jsx';
import {
  FOOTER_GAP,
  FRESH_HEIGHTS,
  MIN_PHOTO_SCALE,
  MIN_TOKENS_ON_PAGE,
  MM,
  PAIR_W,
  PHOTO_HEIGHTS,
  SINGLE_W,
  STORY_FIELDS,
  cleanText,
  hasMeaningfulContent,
  loadImageSizes,
  photoBox,
} from './utils.js';

/** Extra squeeze heights used for a single leftover photo on the current page (production). */
const SINGLE_SQUEEZE_HEIGHTS = [200, 180, 160, 140, 130, 120, 110, ...PHOTO_HEIGHTS];

/**
 * Production paginator (function `O` in origin/main dist bundle).
 * Key difference vs the older local script: leftover photos on a fresh page are
 * placed ONE AT A TIME at the largest height that fits — not packed into dense
 * multi-photo grids. That yields ~165 pages instead of ~124 for the same data.
 */
export function planProfile(p, sizes, host, root) {
  const fits = (first, items) => {
    flushSync(() => root.render(<ProfilePage p={p} first={first} items={items} n={1} sizes={sizes} />));
    const body = host.querySelector('.flow-body');
    const folio = host.querySelector('.folio');
    if (!body || !folio) return false;
    return body.getBoundingClientRect().bottom <= folio.getBoundingClientRect().top - FOOTER_GAP;
  };

  const pages = [{first: true, items: []}];
  const cur = () => pages[pages.length - 1];
  const newPage = () => pages.push({first: false, items: []});
  const joined = {};

  for (const [key, title] of STORY_FIELDS) {
    const text = cleanText(p[key]);
    if (!hasMeaningfulContent(text)) continue;
    const tokens = text.match(/\S+\s*|\s+/g) || [text];
    let off = 0;
    let cont = false;
    joined[key] = '';
    while (off < tokens.length) {
      const pg = cur();
      const rem = tokens.length - off;
      const mk = (k) => ({type: 'text', key, title, cont, content: tokens.slice(off, off + k).join('')});
      if (fits(pg.first, [...pg.items, mk(rem)])) {
        pg.items.push(mk(rem));
        joined[key] += mk(rem).content;
        off = tokens.length;
        break;
      }
      let lo = 1;
      let hi = rem - 1;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (fits(pg.first, [...pg.items, mk(mid)])) {
          best = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (best < Math.min(rem, MIN_TOKENS_ON_PAGE) && (pg.items.length > 0 || pg.first)) {
        newPage();
        continue;
      }
      if (best === 0) throw new Error(`A4 pagination could not fit content for ${p.name} - ${title}.`);
      let cut = best;
      const floorCut = Math.max(1, Math.floor(best * 0.85));
      for (let j = best; j >= floorCut; j--) {
        if (/\n\s*$/.test(tokens[off + j - 1] || '')) {
          cut = j;
          break;
        }
      }
      const chunk = mk(cut);
      pg.items.push(chunk);
      joined[key] += chunk.content;
      off += cut;
      cont = true;
      newPage();
    }
    if (joined[key] !== text) throw new Error(`Pagination changed source text for ${p.name} - ${title}`);
  }

  const extra = (p.photos || []).slice(1);
  let headed = false;
  let idx = 0;
  const sz = (ph) => sizes[ph.src] || {w: 800, h: 600};
  const mkItem = (row, maxW, maxH, heading) => ({type: 'photos', photos: row, maxW, maxH, heading});
  const areaMm2 = (ph, maxW, maxH) => {
    const b = photoBox(sz(ph), maxW, maxH);
    return (b.w * b.h) / (MM * MM);
  };

  /** Try to place a row onto the current page at the largest height that still fits (and respects MIN_PHOTO_SCALE). */
  const trySqueeze = (row, maxW, heights) => {
    const ideal = row.map((ph) => photoBox(sz(ph), maxW, heights[0]));
    for (const H of heights) {
      if (!row.every((ph, i) => photoBox(sz(ph), maxW, H).w >= ideal[i].w * MIN_PHOTO_SCALE)) break;
      const item = mkItem(row, maxW, H, !headed);
      if (fits(cur().first, [...cur().items, item])) {
        return {
          item,
          n: row.length,
          area: row.reduce((a, ph) => a + areaMm2(ph, maxW, H), 0),
        };
      }
    }
    return null;
  };

  while (idx < extra.length) {
    let placed = false;
    if (cur().items.length > 0 || cur().first) {
      const pair = extra.slice(idx, idx + 2);
      const single = trySqueeze([extra[idx]], SINGLE_W, SINGLE_SQUEEZE_HEIGHTS);
      const duo = pair.length === 2 ? trySqueeze(pair, PAIR_W, PHOTO_HEIGHTS) : null;
      // Production heuristic: prefer the single if its area beats half the pair by 35%.
      const chosen =
        single && duo ? (single.area > (duo.area / 2) * 1.35 ? single : duo) : single || duo;
      if (chosen) {
        cur().items.push(chosen.item);
        headed = true;
        idx += chosen.n;
        placed = true;
      }
    }
    if (placed) continue;

    if (cur().items.length > 0 || cur().first) newPage();
    const pg = cur();
    let fitted = null;
    for (const H of FRESH_HEIGHTS) {
      const item = mkItem([extra[idx]], SINGLE_W, H, !headed);
      if (fits(pg.first, [...pg.items, item])) {
        fitted = {items: [item], k: 1};
        break;
      }
    }
    if (!fitted) throw new Error(`A4 pagination could not fit photographs for ${p.name}.`);
    fitted.items.forEach((it) => pg.items.push(it));
    headed = true;
    idx += fitted.k;
    if (idx < extra.length) newPage();
  }

  return pages;
}

export async function measureAlbum(data) {
  const host = document.createElement('div');
  host.className = 'pagination-probe';
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await document.fonts.ready;
    const sizes = await loadImageSizes(data);
    const profiles = {};
    for (const p of data.participants) {
      profiles[p.participant_id] = planProfile(p, sizes, host, root);
    }
    return {profiles, sizes};
  } finally {
    root.unmount();
    host.remove();
  }
}
