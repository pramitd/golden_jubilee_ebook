import {Page} from './Paper.jsx';

/** Contributor index page — matches production Se() with optional PDF anchor links. */
export function IndexPage({
  entries,
  n,
  continued = false,
  part = 1,
  totalParts = 1,
  pdfLinks = false,
  offset = 0,
  onSelectId,
}) {
  return (
    <Page n={n} className="index-page">
      <div className="section-kicker">THE CONTRIBUTORS</div>
      <h2 className="display-title">{continued ? 'Contributors · continued' : 'A lifetime, in names'}</h2>
      <p className="intro-copy">
        {pdfLinks ? 'Tap a name to jump to that profile.' : 'Tap a name to open that profile.'}
        {totalParts > 1 ? ` Part ${part} of ${totalParts}.` : ''}
      </p>
      <div className="index-grid">
        {entries.map((entry, i) => {
          const no = String(offset + i + 1).padStart(2, '0');
          const body = (
            <>
              <span className="index-no">{no}</span>
              <div>
                <strong>{entry.name}</strong>
                <small>{entry.branch}</small>
              </div>
              <span className="index-folio">{String(entry.folio).padStart(2, '0')}</span>
              <span className="index-line" />
            </>
          );
          if (pdfLinks && entry.id) {
            return (
              <a className="index-entry index-entry-link" href={`#${entry.id}`} key={entry.id}>
                {body}
              </a>
            );
          }
          return (
            <button
              type="button"
              className="index-entry index-entry-link"
              key={entry.id || entry.name}
              onClick={() => onSelectId?.(entry.id)}
            >
              {body}
            </button>
          );
        })}
      </div>
    </Page>
  );
}
