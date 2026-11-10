import {photoBox} from '../pagination/utils.js';
import {Page} from './Paper.jsx';

export function IdentityHead({p}) {
  const photo = p.photos?.[0];
  return (
    <>
      <div className="identity-head">
        <div className="section-kicker">A LIFE IN THE MAKING · {p.branch || 'GOLDEN JUBILEE BATCH'}</div>
        <div className="identity-layout">
          <div className="identity-copy">
            <p className="profile-overline">THE CLASS OF 1976</p>
            <h2 className="profile-name">{p.name}</h2>
            {p.nickname && <p className="profile-nickname">“{p.nickname}”</p>}
            <div className="identity-meta">
              <span>{p.branch}</span>
              <span>{p.location}</span>
            </div>
          </div>
          {photo && (
            <figure className="hero-photo">
              <img src={photo.src} alt={photo.alt} />
              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>
          )}
        </div>
      </div>
      <div className="profile-details">
        <div className="detail-item"><span>EDUCATION</span><p>{p.education || '—'}</p></div>
        <div className="detail-item"><span>CURRENT LOCATION</span><p>{p.location || '—'}</p></div>
        <div className="detail-item"><span>EMAIL</span><p>{p.email || '—'}</p></div>
        <div className="detail-item"><span>PHONE</span><p>{p.phone || '—'}</p></div>
      </div>
    </>
  );
}

export function FlowItem({p, item, sizes}) {
  if (item.type === 'text') {
    return (
      <section className={`flow-section${item.cont ? ' is-cont' : ''}`}>
        <h2>{item.cont ? `${item.title} · continued` : item.title}</h2>
        <div className="gold-rule" />
        {item.content.split(/\n\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>
    );
  }
  return (
    <div className="flow-photos">
      {item.heading && (
        <div className="flow-photos-head">
          <div className="section-kicker">PHOTOGRAPHS &amp; MEMORIES</div>
          <h2>Moments, held close</h2>
          <div className="gold-rule" />
        </div>
      )}
      <div className="flow-photo-row">
        {item.photos.map((ph) => {
          const b = photoBox(sizes[ph.src] || {w: 800, h: 600}, item.maxW, item.maxH);
          const cardW = Math.round(Math.max(b.w, 50 * (96 / 25.4)) + 30);
          return (
            <figure className="photo-card" key={ph.src} style={{width: cardW}}>
              <div className="photo-mat">
                <img src={ph.src} alt={ph.alt || p.name} style={{width: b.w, height: b.h}} />
              </div>
              {ph.caption && <figcaption>{ph.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
    </div>
  );
}

export function ProfilePage({p, first, items, n, sizes}) {
  return (
    <Page n={n} className={`flow-page ${first ? 'identity-page' : 'story-page continuation-page'}`}>
      {first ? (
        <IdentityHead p={p} />
      ) : (
        <div className="story-running">
          <span>{p.name}</span>
          <span>{p.branch}</span>
        </div>
      )}
      <div className="flow-body">
        {items.map((it, i) => (
          <FlowItem key={i} p={p} item={it} sizes={sizes} />
        ))}
      </div>
    </Page>
  );
}
