import {identityPageIndex, indexPageIndex} from '../pages/buildPages.jsx';

export function ParticipantsList({participants, pages, onSelect}) {
  const indexIdx = indexPageIndex(pages);
  return (
    <nav className="mobile-people-list" aria-label="Participants">
      <button type="button" className="mobile-people-item" onClick={() => onSelect(0)}>
        <span className="mobile-people-no">01</span>
        <span className="mobile-people-name">Cover</span>
      </button>
      {indexIdx >= 0 && (
        <button type="button" className="mobile-people-item" onClick={() => onSelect(indexIdx)}>
          <span className="mobile-people-no">{String(indexIdx + 1).padStart(2, '0')}</span>
          <span className="mobile-people-name">Contributors</span>
        </button>
      )}
      {participants.map((p) => {
        const idx = identityPageIndex(pages, p.participant_id);
        if (idx < 0) return null;
        return (
          <button
            type="button"
            key={p.participant_id}
            className="mobile-people-item"
            onClick={() => onSelect(idx)}
          >
            <span className="mobile-people-no">{String(idx + 1).padStart(2, '0')}</span>
            <span className="mobile-people-copy">
              <span className="mobile-people-name">{p.name}</span>
              {p.branch && <span className="mobile-people-meta">{p.branch}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** Mobile replacement UI when landing on an index page. */
export function ContribBrowse({participants, onSelectId}) {
  return (
    <div className="mobile-contrib-browse">
      <div className="mobile-contrib-kicker">The contributors</div>
      <h2 className="mobile-contrib-title">Tap a name</h2>
      <p className="mobile-contrib-note">Opens that classmate&apos;s profile in the album.</p>
      <ul className="mobile-contrib-ul">
        {participants.map((p, i) => (
          <li key={p.participant_id}>
            <button type="button" className="mobile-contrib-row" onClick={() => onSelectId(p.participant_id)}>
              <span className="mobile-contrib-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="mobile-contrib-copy">
                <strong>{p.name}</strong>
                {p.branch && <small>{p.branch}</small>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
