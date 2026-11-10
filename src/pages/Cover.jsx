import {Page} from './Paper.jsx';

export function Cover({book, n}) {
  return (
    <Page n={n} className="cover-page">
      <img className="cover-gate" src="/assets/cover/campus-gate.webp" alt="" aria-hidden="true" />
      <div className="cover-ornament top">✦　✦　✦</div>
      <div className="cover-inner">
        <div className="seal"><span>50</span></div>
        <p className="eyebrow">GOLDEN JUBILEE • THE CLASS OF 1976</p>
        <h1>{book.title}</h1>
        <div className="cover-rule"><span>✦</span></div>
        <h2>{book.subtitle}</h2>
        <p className="cover-note">A commemorative album of lives, friendships, family and memories</p>
        <div className="cover-years">1976 <i>—</i> 2026</div>
        <p className="cover-institution">NATIONAL INSTITUTE OF TECHNOLOGY · RAIPUR</p>
        <div className="cover-editor">
          <span className="cover-editor-label">Edited by</span>
          <span className="cover-editor-name">Bijon Dutta</span>
        </div>
      </div>
    </Page>
  );
}
