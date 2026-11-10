import {useEffect, useRef, useState} from 'react';
import {
  CONTACT_EMAIL,
  DESKTOP_MQ,
  DESKTOP_ZOOM_MAX,
  DESKTOP_ZOOM_MIN,
  PAGE_H,
  PAGE_TURN_MS,
  PAGE_W,
  PDF_HREF,
  SITE_URL,
} from '../constants.js';
import {exitFs, useFullscreen} from '../hooks/useFullscreen.js';
import {identityPageIndex, indexPageIndex} from '../pages/buildPages.jsx';
import {desktopFitScale, fitScale as stageFitScale} from '../pagination/utils.js';

function NavIcon({open}) {
  return (
    <svg className="nav-tab-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d={open ? 'M9 8h10M9 12h10M9 16h10M5 8h2M5 12h2M5 16h2' : 'M8 8h11M8 12h11M8 16h11'} stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function FsIcon() {
  return (
    <svg className="fs-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M7 3H3v4h2V5h2V3zm14 0h-4v2h2v2h2V3zM5 17H3v4h4v-2H5v-2zm16 0h-2v2h-2v2h4v-4z" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function DesktopReader({data, pages, current, setCurrent, onSelectId}) {
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const scrollRef = useRef(null);
  const lock = useRef(false);
  const goRef = useRef(null);

  const [turn, setTurn] = useState(null);
  const [zoom, setZoom] = useState(1);
  // Production modes: 'fit' (normal) | 'full' (reader-fullpage / fullscreen)
  const [viewMode, setViewMode] = useState('fit');
  const [navOpen, setNavOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  );
  // Mirror production u/f/m: window-based fit, window-based fullpage, optional measured fullpage.
  const [fitScale, setFitScale] = useState(() =>
    typeof window !== 'undefined' ? desktopFitScale(false, window.innerWidth > 650) : 0.7,
  );
  const [fullScale, setFullScale] = useState(() =>
    typeof window !== 'undefined' ? desktopFitScale(true, window.innerWidth > 650) : 0.85,
  );
  const [measuredFull, setMeasuredFull] = useState(null);

  const {nativeFs, enter, exit} = useFullscreen(shellRef);
  const fullLayout = viewMode === 'full' || nativeFs;

  // Production: on resize, refresh both window-based scales from nav state.
  useEffect(() => {
    const sync = () => {
      setFitScale(desktopFitScale(false, navOpen));
      setFullScale(desktopFitScale(true, navOpen));
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [navOpen]);

  // Production: only in fullpage, optionally override with page-scroll box measure (te()).
  // Never measure in normal fit — that caused the circular shrink to ~28%.
  useEffect(() => {
    if (!fullLayout) {
      setMeasuredFull(null);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setMeasuredFull(stageFitScale(el.clientWidth, el.clientHeight, {margin: 16, max: 2.5}));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullLayout, pages.length]);

  // Be = (fullpage ? measuredFull ?? fullScale : fitScale) * zoom
  const eff = (fullLayout ? measuredFull ?? fullScale : fitScale) * zoom;

  const zoomBy = (f) =>
    setZoom((z) => Math.min(DESKTOP_ZOOM_MAX, Math.max(DESKTOP_ZOOM_MIN, +(z * f).toFixed(3))));

  const go = (dir) => {
    if (lock.current) return;
    const target = current + dir;
    if (target < 0 || target >= pages.length) return;
    lock.current = true;
    setTurn({from: current, to: target, dir});
    setTimeout(() => {
      setCurrent(target);
      setTurn(null);
      lock.current = false;
    }, PAGE_TURN_MS);
  };
  goRef.current = go;

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') goRef.current?.(1);
      if (e.key === 'ArrowLeft') goRef.current?.(-1);
      if (e.key === '+' || e.key === '=') zoomBy(1.25);
      if (e.key === '-' || e.key === '_') zoomBy(1 / 1.25);
      if (e.key === '0') setZoom(1);
      if (e.key === 'Escape' && nativeFs) exit().catch(() => {});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nativeFs, exit]);

  useEffect(() => {
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey) || !e.target.closest?.('.page-scroll')) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    window.addEventListener('wheel', onWheel, {passive: false});
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  const enterFull = async () => {
    setViewMode('full');
    setZoom(1);
    if (window.matchMedia(DESKTOP_MQ).matches) setNavOpen(false);
    try {
      await enter();
    } catch {
      /* CSS fullpage still applies via reader-fullpage */
    }
  };

  // Production "Compact" control: return to normal fit and exit native FS.
  const toFit = async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await exitFs();
    } catch {
      /* ignore */
    }
    setViewMode('fit');
    setZoom(1);
  };

  const exitFull = async () => {
    await toFit();
  };

  const shown = turn ? turn.to : current;
  const indexIdx = indexPageIndex(pages);

  const shellClass = [
    'app-shell',
    fullLayout ? 'reader-fullpage' : '',
    nativeFs ? 'reader-native-fs' : '',
    navOpen ? 'nav-open' : 'nav-collapsed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass} ref={shellRef}>
      <header className="site-header">
        <div className="header-leading">
          <button
            type="button"
            className={`nav-tab-toggle${navOpen ? ' is-open' : ''}`}
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-controls="album-nav"
            title={navOpen ? 'Hide participant list' : 'Show participant list'}
          >
            <NavIcon open={navOpen} />
            <span className="nav-tab-label">Participants</span>
          </button>
          <div className="header-title">
            <h1>
              Golden Jubilee <span>’76</span>
              <span className="header-place">NIT Raipur</span>
            </h1>
          </div>
        </div>
        <div className="header-actions">
          {!(nativeFs || viewMode === 'full') ? (
            <a href={PDF_HREF} download="golden-jubilee-high-resolution.pdf">
              DOWNLOAD PDF ↓
            </a>
          ) : null}
          <button
            type="button"
            className="fs-exit-btn"
            onClick={exitFull}
            hidden={!(nativeFs || viewMode === 'full')}
          >
            Exit full screen
          </button>
        </div>
      </header>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <div className="reader-layout">
        <aside className="contents" id="album-nav">
          <div className="contents-title">IN THIS ALBUM</div>
          <button className={current === 0 ? 'selected' : ''} onClick={() => setCurrent(0)}>
            Cover <span>01</span>
          </button>
          {indexIdx >= 0 && (
            <button
              className={current === indexIdx ? 'selected' : ''}
              onClick={() => setCurrent(indexIdx)}
            >
              Contributors <span>{String(indexIdx + 1).padStart(2, '0')}</span>
            </button>
          )}
          {data.participants.map((p) => {
            const idx = identityPageIndex(pages, p.participant_id);
            return (
              <button
                key={p.participant_id}
                className={current === idx ? 'selected' : ''}
                onClick={() => setCurrent(idx)}
              >
                {p.name}
                <span>{String(idx + 1).padStart(2, '0')}</span>
              </button>
            );
          })}
        </aside>

        <main className="stage" ref={stageRef}>
          <div className="page-scroll" ref={scrollRef}>
            <div
              className="book-viewport"
              style={{width: `${PAGE_W * eff}px`, height: `${PAGE_H * eff}px`, '--viewer-scale': eff}}
            >
              <div className="book" aria-label="Golden Jubilee flipbook">
                <div className="page-layer base">{pages[shown]?.render(shown + 1)}</div>
                {turn && (
                  <div className={`page-layer turn ${turn.dir > 0 ? 'next' : 'prev'}`}>
                    {pages[turn.from].render(turn.from + 1)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="controls">
            <button onClick={() => go(-1)} disabled={current === 0 || !!turn} aria-label="Previous page">
              ‹
            </button>
            <span>
              PAGE {String(current + 1).padStart(2, '0')} <i>/</i> {pages.length}
            </span>
            <button
              onClick={() => go(1)}
              disabled={current === pages.length - 1 || !!turn}
              aria-label="Next page"
            >
              ›
            </button>

            <div className="view-controls">
              <button
                type="button"
                className={`fs-toggle${viewMode === 'fit' && !nativeFs ? ' active' : ''}`}
                aria-label="Compact"
                title="Compact page size"
                onClick={toFit}
              >
                <CompactIcon />
              </button>
              <button
                type="button"
                className={`fs-toggle${fullLayout ? ' active' : ''}`}
                title={fullLayout ? 'Exit full screen (Esc)' : 'Full screen — hides the browser bar'}
                onClick={() => (fullLayout ? exitFull() : enterFull())}
              >
                <FsIcon />
              </button>
            </div>

            <div className="zoom-controls">
              <button onClick={() => zoomBy(1 / 1.25)} disabled={zoom <= DESKTOP_ZOOM_MIN} aria-label="Zoom out" title="Zoom out (-)">
                −
              </button>
              <button className="zoom-reset" onClick={() => setZoom(1)} title="Reset zoom (0)">
                {Math.round(eff * 100)}%
              </button>
              <button onClick={() => zoomBy(1.25)} disabled={zoom >= DESKTOP_ZOOM_MAX} aria-label="Zoom in" title="Zoom in (+)">
                +
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="site-footer">
        <span>Preserving the stories of a remarkable batch.</span>
        <span className="folio-contact">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <span className="folio-sep">|</span>
          <a href={SITE_URL} target="_blank" rel="noreferrer">boroai.in</a>
        </span>
      </footer>
    </div>
  );
}
