import {CONTACT_EMAIL, SITE_URL} from '../constants.js';

export function Folio({page, bookPage = true}) {
  return (
    <div className="folio">
      <span>{bookPage ? 'GOLDEN JUBILEE • 1976–2026' : 'GOLDEN JUBILEE'}</span>
      <span className="folio-number">{page}</span>
      <span className="folio-contact">
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <span className="folio-sep">|</span>
        <a href={SITE_URL} target="_blank" rel="noreferrer">boroai.in</a>
      </span>
    </div>
  );
}

export function Page({children, n, className = ''}) {
  return (
    <section className={`paper ${className}`}>
      <div className="paper-frame">
        {children}
        <Folio page={n} />
      </div>
    </section>
  );
}
