import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  MOBILE_PINCH_MAX,
  MOBILE_PINCH_MIN,
  PAGE_H,
  PAGE_W,
  PDF_HREF,
  SWIPE_THRESHOLD,
} from '../constants.js';
import {useFullscreen} from '../hooks/useFullscreen.js';
import {identityPageIndex} from '../pages/buildPages.jsx';
import {fitScale} from '../pagination/utils.js';
import {ContribBrowse, ParticipantsList} from './ParticipantsList.jsx';

function FsIcon() {
  return (
    <svg className="fs-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M7 3H3v4h2V5h2V3zm14 0h-4v2h2v2h2V3zM5 17H3v4h4v-2H5v-2zm16 0h-2v2h-2v2h4v-4z" />
    </svg>
  );
}

export function MobileReader({data, pages, current, setCurrent}) {
  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const pinchRef = useRef(1);
  const gestureRef = useRef(null);

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [pinch, setPinch] = useState(1);
  const [stageSize, setStageSize] = useState({w: 320, h: 480});
  const [immersive, setImmersive] = useState(false);

  const {nativeFs, toggle: toggleFs} = useFullscreen(shellRef);
  const fsActive = nativeFs || immersive;

  const page = pages[current];
  const isIndex = !!(page && (page.key === 'index' || page.key.startsWith('index-')));
  const baseFit = fitScale(stageSize.w, stageSize.h, {
    margin: fsActive ? 2 : 6,
    max: fsActive ? 1.45 : 1.15,
  });
  const scale = baseFit * pinch;
  const zoomed = pinch > 1.02;

  useEffect(() => {
    pinchRef.current = pinch;
  }, [pinch]);

  useEffect(() => {
    setPinch(1);
  }, [current]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageSize({w: el.clientWidth || 320, h: el.clientHeight || 480});
    });
    ro.observe(el);
    setStageSize({w: el.clientWidth || 320, h: el.clientHeight || 480});
    return () => ro.disconnect();
  }, []);

  const go = (dir) => {
    const next = current + dir;
    if (next < 0 || next >= pages.length) return;
    setCurrent(next);
  };

  const onSelectPage = (idx) => {
    setCurrent(idx);
    setPeopleOpen(false);
  };

  const onSelectId = (id) => {
    const idx = identityPageIndex(pages, id);
    if (idx >= 0) onSelectPage(idx);
  };

  const handleFs = async () => {
    if (nativeFs) {
      try {
        await toggleFs();
      } catch {
        /* ignore */
      }
      setImmersive(false);
      return;
    }
    if (immersive) {
      setImmersive(false);
      return;
    }
    try {
      await toggleFs();
    } catch {
      setImmersive(true);
    }
  };

  // Scrollable pinch-zoom (post-revert model)
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || peopleOpen || isIndex) return;

    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const mid = (a, b) => ({
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    });

    const onStart = (e) => {
      if (e.touches.length === 2) {
        const d = dist(e.touches[0], e.touches[1]);
        const m = mid(e.touches[0], e.touches[1]);
        const rect = stage.getBoundingClientRect();
        gestureRef.current = {
          mode: 'pinch',
          startDist: d,
          startScale: pinchRef.current,
          anchorX: m.x - rect.left,
          anchorY: m.y - rect.top,
          startScrollLeft: stage.scrollLeft,
          startScrollTop: stage.scrollTop,
        };
        if (pinchRef.current <= 1.02) {
          // seed scroll so top-left aligns for expansion
          stage.scrollLeft = 0;
          stage.scrollTop = 0;
        }
      } else if (e.touches.length === 1) {
        gestureRef.current = {
          mode: 'swipe',
          x0: e.touches[0].clientX,
          y0: e.touches[0].clientY,
          pinched: false,
        };
      }
    };

    const onMove = (e) => {
      const g = gestureRef.current;
      if (!g) return;
      if (e.touches.length === 2 && g.mode === 'pinch') {
        e.preventDefault();
        const d = dist(e.touches[0], e.touches[1]);
        const ratio = d / (g.startDist || 1);
        const next = Math.min(MOBILE_PINCH_MAX, Math.max(MOBILE_PINCH_MIN, g.startScale * ratio));
        const scaleRatio = next / (pinchRef.current || 1);
        const ax = g.anchorX;
        const ay = g.anchorY;
        const newLeft = (stage.scrollLeft + ax) * scaleRatio - ax;
        const newTop = (stage.scrollTop + ay) * scaleRatio - ay;
        setPinch(next);
        requestAnimationFrame(() => {
          stage.scrollLeft = newLeft;
          stage.scrollTop = newTop;
          requestAnimationFrame(() => {
            stage.scrollLeft = newLeft;
            stage.scrollTop = newTop;
          });
        });
        if (gestureRef.current) gestureRef.current.pinched = true;
      }
    };

    const onEnd = (e) => {
      const g = gestureRef.current;
      if (!g) return;
      if (g.mode === 'swipe' && !g.pinched && pinchRef.current <= 1.02 && e.changedTouches[0]) {
        const dx = e.changedTouches[0].clientX - g.x0;
        if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
      }
      if (pinchRef.current <= 1.02) {
        stage.scrollLeft = 0;
        stage.scrollTop = 0;
      }
      if (e.touches.length === 0) gestureRef.current = null;
    };

    stage.addEventListener('touchstart', onStart, {passive: true});
    stage.addEventListener('touchmove', onMove, {passive: false});
    stage.addEventListener('touchend', onEnd);
    stage.addEventListener('touchcancel', onEnd);
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchmove', onMove);
      stage.removeEventListener('touchend', onEnd);
      stage.removeEventListener('touchcancel', onEnd);
    };
  }, [peopleOpen, isIndex, current, pages.length]);

  const shellClass = [
    'mobile-shell',
    peopleOpen ? 'mobile-people-open' : '',
    fsActive ? 'mobile-fs-active' : '',
    immersive && !nativeFs ? 'mobile-immersive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stageClass = [
    'mobile-stage',
    !isIndex ? 'mobile-stage--book' : '',
    zoomed ? 'mobile-stage--zoomed' : '',
    isIndex ? 'mobile-stage--list' : '',
    peopleOpen ? 'mobile-stage--behind' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass} ref={shellRef}>
      <header className="mobile-header">
        <div className="mobile-brand">
          <p className="mobile-kicker">NIT Raipur · Batch of 1976</p>
          <h1>
            Golden Jubilee <span>’76</span>
          </h1>
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="mobile-people-btn"
            aria-expanded={peopleOpen}
            aria-controls="mobile-people-sheet"
            onClick={() => setPeopleOpen((v) => !v)}
          >
            {peopleOpen ? 'Close' : 'Participants'}
          </button>
          <a className="mobile-pdf" href={PDF_HREF}>
            PDF
          </a>
        </div>
      </header>

      {peopleOpen && (
        <>
          <div className="mobile-sheet-backdrop" onClick={() => setPeopleOpen(false)} />
          <aside
            className="mobile-sheet"
            id="mobile-people-sheet"
            role="dialog"
            aria-label="In this album"
          >
            <div className="mobile-sheet-head">
              <strong>In this album</strong>
              <button
                type="button"
                className="mobile-sheet-close"
                aria-label="Close participants"
                onClick={() => setPeopleOpen(false)}
              >
                Close
              </button>
            </div>
            <ParticipantsList participants={data.participants} pages={pages} onSelect={onSelectPage} />
          </aside>
        </>
      )}

      <div className={stageClass} ref={stageRef} aria-hidden={peopleOpen}>
        {isIndex ? (
          <ContribBrowse participants={data.participants} onSelectId={onSelectId} />
        ) : (
          <div
            className="book-viewport mobile-viewport"
            style={{width: `${PAGE_W * scale}px`, height: `${PAGE_H * scale}px`, '--viewer-scale': scale}}
          >
            <div className="book mobile-book" aria-label="Golden Jubilee album page">
              {page?.render(current + 1)}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-bar">
        <button
          type="button"
          className="mobile-nav"
          onClick={() => go(-1)}
          disabled={current === 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="mobile-page">
          Page {current + 1} <i>/</i> {pages.length}
        </span>
        <button
          type="button"
          className={`mobile-fs${fsActive ? ' is-active' : ''}`}
          onClick={handleFs}
          aria-label={fsActive ? 'Exit full screen' : 'Full screen'}
          title={fsActive ? 'Exit full screen' : 'Full screen — larger page'}
        >
          <FsIcon />
        </button>
        <button
          type="button"
          className="mobile-nav"
          onClick={() => go(1)}
          disabled={current === pages.length - 1}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
      {!peopleOpen && !fsActive ? (
        <p className="mobile-hint">Pinch to zoom · Swipe to turn pages when not zoomed</p>
      ) : null}
    </div>
  );
}
