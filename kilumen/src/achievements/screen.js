// Badges tab (Pack, last tab) behind globalThis.KILUMEN_BADGES_TAB (default off; ?badges=1 turns it on, src/alpha.js).
// A display case: 8 Master coin slots on a felt shelf (earned = coin art, not yet = an empty socket), then titles,
// town events (coming soon) and milestones with dates. New earns shine once; a stacked entry whose count went up
// bumps its xN counter. Reduced motion (body.ui-reduce or the media query) drops the shine sweep, sparkles and bump.
// v2: each coin slot = its own coin (looping in-place spin + shine) or its own shaped socket; titles/events/major = the
// sport ribbon medal, or its grey ? silhouette until earned (xN stacking unchanged). Milestones keep the v1 art below.
// v1 art: Kilumen's own master_coin frame (art/characters/pixel/soul/battle_feedback/transitions/master_coin, frame 00)
// and palette recolours of it (tools: art/ui/achievements/*.png). Strings: system_badges.* (Text Bot), fallbacks below.
import { ACH_DEFS } from './defs.js?v=v0.2.67-alpha';
import { sync, view, markSeen } from './engine.js?v=v0.2.67-alpha';
import { coinAnim, coinSocket, sportOf, sportPng } from './coin_art.js?v=v0.2.67-alpha'; // v2: Animator's coins + sport medals

export const badgesOn = () => !!globalThis.KILUMEN_BADGES_TAB;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ART = (k) => new URL(`../../art/ui/achievements/${k}.png`, import.meta.url).href;

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./badges.css?v=v0.2.67-alpha', import.meta.url).href; document.head.appendChild(l);
}

export const holderOf = (scene) => scene.systems?.state || (scene._achHolder ||= {});
export const ctxOf = (scene) => ({ flags: scene.flags || new Set(), kilindex: scene.systems?.kilindex || null,
  sports: (scene.systems?.state || scene._sportsState || {}).sports || null });

/** Called by the Pack screen; T = ui.T. -> { rows, html }. */
export function renderBadges(scene, T) {
  css();
  const holder = holderOf(scene), ctx = ctxOf(scene);
  sync(ACH_DEFS, holder, ctx);
  const rows = view(ACH_DEFS, holder, ctx);
  const L = (k, fb) => T(`system_badges.labels.${k}`, fb);
  const nm = (r) => T(`system_badges.${r.id}.name`, r.ph);
  const date = (r) => (r.first ? (r.count > 1 && r.last !== r.first ? `${esc(L('first', 'First'))} ${r.first} · ${esc(L('latest', 'Latest'))} ${r.last}` : `${esc(L('earned_on', 'Earned'))} ${r.first}`) : '');
  const coins = rows.filter((r) => r.kind === 'coin'), rest = rows.filter((r) => r.kind !== 'coin');
  const got = coins.filter((r) => r.earned).length;
  const fx = (r) => `${r.isNew ? ' is-new' : ''}${r.bumped ? ' is-bump' : ''}`;
  const SPARK = '<i class="bdg-spark"></i><i class="bdg-spark s2"></i><i class="bdg-spark s3"></i>';
  const sp = (r) => sportOf(r.id);
  const medal = (r) => sp(r) ? `<span class="bdg-medal sport"><img src="${sportPng(sp(r))}" alt="" draggable="false">${r.isNew ? SPARK : ''}</span>` : `<span class="bdg-medal${r.ribbon ? ' rib-' + r.ribbon : ''}"><img src="${ART(r.art)}" alt="" draggable="false">${r.isNew ? '<i class="bdg-spark"></i><i class="bdg-spark s2"></i><i class="bdg-spark s3"></i>' : ''}</span>`;
  const stack = (r) => (r.stack && r.count > 1 ? `<b class="bdg-count${r.bumped ? ' bump' : ''}" aria-label="${esc(L('times', 'times'))} ${r.count}">×${r.count}</b>` : '');
  const caseHtml = `<div class="bdg-case" role="list" aria-label="${esc(L('case', 'Master coins'))}">
    <div class="bdg-case-head"><span>${esc(L('case', 'Master coins'))}</span><span class="bdg-tally">${got} / ${coins.length}</span></div>
    <div class="bdg-shelf">${coins.map((r) => `<div class="bdg-slot${r.earned ? ' on' : ''}${fx(r)}" role="listitem" data-k="${r.id}" title="${esc(nm(r))}${r.first ? ' · ' + r.first : ''}">
      ${r.earned ? `<span class="bdg-medal">${coinAnim(r.town, '', (r.slot % 4) * 0.28)}${r.isNew ? SPARK : ''}</span>` : coinSocket(r.town)}<span class="bdg-no">${r.slot}</span></div>`).join('')}</div></div>`;
  const group = (kind, head) => {
    const rs = rest.filter((r) => r.kind === kind); if (!rs.length) return '';
    return `<h3 class="bdg-h">${esc(head)}</h3><ul class="bdg-list">${rs.map((r) => `<li class="bdg-row${r.earned ? ' on' : ''}${r.soon ? ' soon' : ''}${r.major ? ' major' : ''}${fx(r)}" data-k="${r.id}">
      <span class="bdg-ico">${r.earned ? medal(r) : sp(r) ? `<img class="bdg-lock" src="${sportPng(sp(r), true)}" alt="" draggable="false">` : `<span class="bdg-socket sm"></span>`}${stack(r)}</span>
      <span class="grow"><b class="bdg-name">${esc(nm(r))}</b><span class="bdg-sub soft">${r.soon ? esc(L('coming_soon', 'Coming soon')) : r.earned ? date(r) : r.max ? `${r.prog} / ${r.max}` : esc(L('locked', 'Not yet'))}</span>
      ${!r.earned && !r.soon && r.max ? `<span class="bdg-bar"><i style="width:${Math.round((100 * r.prog) / r.max)}%"></i></span>` : ''}</span>
      ${r.soon ? `<span class="bdg-soon">${esc(L('soon_tag', 'Soon'))}</span>` : ''}</li>`).join('')}</ul>`;
  };
  const html = `<div class="ui-panel ui-pad ui-grow ui-scroll bdg-wrap" data-scr="badges" data-scroll>${caseHtml}
    ${group('title', L('titles', 'Tournament titles'))}${group('event', L('events', 'Town events'))}${group('milestone', L('milestones', 'Milestones'))}</div>`;
  return { rows, html, settle: () => setTimeout(() => markSeen(holder), 50) };
}
export const BADGE_TAB_ICON = () => (css(), `<img class="bdg-tabico" src="${new URL('../../art/ui/achievements/coins/coin_fernwick.png', import.meta.url).href}" alt="" aria-hidden="true">`);
