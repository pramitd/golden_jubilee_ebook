import {Page} from './Paper.jsx';

export function Closing({n}) {
  return (
    <Page n={n} className="closing-page">
      <div className="closing-content">
        <div className="seal"><span>50</span></div>
        <div className="closing-kicker">GOLDEN JUBILEE · 1976–2026</div>
        <h2>Years pass.<br /><em>Friendship remains.</em></h2>
        <div className="cover-rule"><span>✦</span></div>
        <p>To the classmates, families and memories that made this journey extraordinary.</p>
        <strong>NIT RAIPUR · THE CLASS OF 1976</strong>
        <div className="cover-editor">
          <span className="cover-editor-label">Edited by</span>
          <span className="cover-editor-name">Bijon Dutta</span>
        </div>
      </div>
    </Page>
  );
}
