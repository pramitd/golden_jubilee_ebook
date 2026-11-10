import {useEffect, useMemo, useRef, useState} from 'react';
import {useIsMobile} from './hooks/useIsMobile.js';
import {measureAlbum} from './pagination/planProfile.jsx';
import {buildPages, identityPageIndex} from './pages/buildPages.jsx';
import {PdfExport} from './pdf/PdfExport.jsx';
import {DesktopReader} from './reader/DesktopReader.jsx';
import {MobileReader} from './reader/MobileReader.jsx';

export default function App() {
  const [data, setData] = useState(null);
  const [measured, setMeasured] = useState(null);
  const [current, setCurrent] = useState(0);
  const isMobile = useIsMobile();
  const pdfMode = new URLSearchParams(location.search).get('pdf') === '1';
  const selectIdRef = useRef(null);

  useEffect(() => {
    fetch('/public_data.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(window.BOOK_DATA || null));
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await measureAlbum(data);
        if (!cancelled) setMeasured(result);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    if (pdfMode) return;
    document.documentElement.classList.toggle('reader-mobile', isMobile);
    document.documentElement.classList.toggle('reader-desktop', !isMobile);
    return () => {
      document.documentElement.classList.remove('reader-mobile', 'reader-desktop');
    };
  }, [isMobile, pdfMode]);

  const pages = useMemo(() => {
    if (!data || !measured) return [];
    return buildPages(data, measured, {
      pdfLinks: pdfMode,
      onSelectId: (id) => selectIdRef.current?.(id),
    });
  }, [data, measured, pdfMode]);

  useEffect(() => {
    selectIdRef.current = (id) => {
      const idx = identityPageIndex(pages, id);
      if (idx >= 0) setCurrent(idx);
    };
  }, [pages]);

  if (!data || !measured || !pages.length) {
    return <div className="loading">Preparing the Golden Jubilee album…</div>;
  }

  if (pdfMode) return <PdfExport pages={pages} />;

  if (isMobile) {
    return <MobileReader data={data} pages={pages} current={current} setCurrent={setCurrent} />;
  }

  return (
    <DesktopReader data={data} pages={pages} current={current} setCurrent={setCurrent} />
  );
}
