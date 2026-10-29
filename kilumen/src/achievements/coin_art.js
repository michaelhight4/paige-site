// Animator's Master coin + sport ribbon medal art (art/ui/achievements/coins, /sports; source /workspace/kilumen_master_coins,
// index.json copied alongside). 2x PNGs drawn at 1x size, nearest. Coin sheet: 14 frames (0-8 bob + edge spin, 9-13 shine
// sweep), 70 ms each, last 140 ms -> a 1.12 s loop played in place by CSS steps() (badges.css .cna). Reduced motion = static.
// Used by the Badges tab, Pack > Key Items coin rows and the in-place coin award card (no full-screen zoom).
export const coinArtOn = () => !!(globalThis.KILUMEN_COIN_ART || globalThis.KILUMEN_BADGES_TAB);
const A = (p) => new URL(`../../art/ui/achievements/${p}.png`, import.meta.url).href;
export const COIN_TOWNS = ['fernwick', 'saltmere', 'revival_heights', 'frostspire', 'mirefen', 'tidewater_coast', 'lanternport', 'cindervale'];
export const coinPng = (town) => A(`coins/coin_${town}`);
export const socketPng = (town) => A(`coins/socket_${town}`);
export const sheetPng = (town) => A(`coins/coin_${town}_sheet`);
export const sportPng = (sport, locked) => A(`sports/sport_${sport}${locked ? '_locked' : ''}`);
/** Achievement id -> sport art id (sports/index.json achievement_ids). */
export const sportOf = (id) => (id === 'games_aurelith_major' ? 'aurelith_major' : /^(event|title)_/.test(id) ? id.replace(/^(event|title)_/, '') : null);
let cssDone = false;
export function coinCss() {
  if (cssDone || typeof document === 'undefined') return; cssDone = true;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./badges.css?v=v0.2.79-alpha', import.meta.url).href; document.head.appendChild(l);
}
/** Looping in-place idle shine for an earned coin (static icon underneath for reduced motion). delay in s staggers a row. */
export const coinAnim = (town, cls = '', delay = 0) => (coinCss(), `<span class="cna ${cls}" style="--cs:url('${sheetPng(town)}');animation-delay:-${delay}s"><img src="${coinPng(town)}" alt="" draggable="false"></span>`);
export const coinSocket = (town, cls = '') => (coinCss(), `<img class="cns ${cls}" src="${socketPng(town)}" alt="" draggable="false">`);

/** In-place award card: the coin plays its spin + shine where the card sits (top centre), then the card fades. */
export function showCoinAward(town, name) {
  if (typeof document === 'undefined' || !COIN_TOWNS.includes(town)) return null; coinCss();
  const el = document.createElement('div'); el.className = 'cna-award'; el.setAttribute('role', 'status');
  el.innerHTML = `${coinAnim(town, 'big')}<i class="bdg-spark"></i><i class="bdg-spark s2"></i><i class="bdg-spark s3"></i><b>${String(name ?? '').replace(/[&<>"]/g, '')}</b>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3700);
  return el;
}
