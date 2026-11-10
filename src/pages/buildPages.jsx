import {INDEX_CHUNK} from '../constants.js';
import {chunk} from '../pagination/utils.js';
import {Closing} from './Closing.jsx';
import {Cover} from './Cover.jsx';
import {IndexPage} from './IndexPage.jsx';
import {ProfilePage} from './ProfileFlow.jsx';

export function identityPageIndex(pages, participantId) {
  return pages.findIndex((p) => p.key === `${participantId}-identity`);
}

export function indexPageIndex(pages) {
  return pages.findIndex((p) => p.key === 'index' || p.key.startsWith('index-'));
}

/**
 * Production order: cover → index chunk(s) → profiles → closing.
 * Index pages are spliced after cover; folio numbers point at identity pages.
 */
export function buildPages(data, plan, {pdfLinks = false, onSelectId} = {}) {
  const pages = [{key: 'cover', render: (n) => <Cover book={data.book} n={n} />}];

  for (const p of data.participants) {
    (plan.profiles[p.participant_id] || []).forEach((pg, i) => {
      pages.push({
        key: i === 0 ? `${p.participant_id}-identity` : `${p.participant_id}-flow-${i}`,
        person: p.name,
        pdfAnchor: i === 0 ? p.participant_id : null,
        outlineTitle: i === 0 ? p.name : null,
        render: (n) => (
          <ProfilePage p={p} first={pg.first} items={pg.items} n={n} sizes={plan.sizes} />
        ),
      });
    });
  }

  pages.push({key: 'closing', render: (n) => <Closing n={n} />});

  const groups = chunk(
    data.participants.map((p) => ({
      id: p.participant_id,
      name: p.name,
      branch: p.branch || '',
    })),
    INDEX_CHUNK,
  );
  const totalParts = groups.length;
  groups.reverse().forEach((group, revIdx) => {
    const part = totalParts - revIdx;
    const offset = (part - 1) * INDEX_CHUNK;
    pages.splice(1, 0, {
      key: totalParts === 1 ? 'index' : `index-${part}`,
      render: (n) => (
        <IndexPage
          entries={group.map((e) => ({
            ...e,
            folio: pages.findIndex((pg) => pg.key === `${e.id}-identity`) + 1,
          }))}
          n={n}
          continued={part > 1}
          part={part}
          totalParts={totalParts}
          pdfLinks={pdfLinks}
          offset={offset}
          onSelectId={onSelectId}
        />
      ),
    });
  });

  return pages;
}
