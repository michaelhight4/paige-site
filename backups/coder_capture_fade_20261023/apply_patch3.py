import sys, re
root = sys.argv[1]
p = root + '/src/battle/ui_sd.js'; s = open(p).read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:60], s.count(old)); s = s.replace(old, new)
rep("const KEY = 'system_battle';", """// player-side facing (Gary, Oct 23 2026): these back sprites were drawn facing LEFT (away from the foe), so the player side
// mirrors them (.b-flip) to face right. Visual review of all back sprites; the art can be redrawn later and the id dropped here.
const BACK_FACES_LEFT = new Set(['tumbloam', 'belfrydove', 'gnawford', 'ledgedove', 'hearthkit', 'kilnpaw', 'velvetabby', 'stonepede', 'pandember',
  'thistlepup', 'glarekit', 'somnarch', 'cinderwyrm', 'ondravel', 'charlurcher', 'foalgust', 'geysirox']);
// trainer intro (Gary, Oct 23 2026): player back view (cal; mira shares it) and the trainer's own battle sprite
const PIXD = 'art/characters/pixel/';
const PLAYER_BACK = PIXD + 'capture_poses/player/cal_back_capture_lowered.png';
const trainerSrcs = (sid) => sid ? [`${PIXD}npcs/${sid}/trainer/${sid}_trainer_64x128_2x.png`, `${PIXD}humans/${sid}/trainer/${sid}_trainer_64x128_2x.png`] : [];
const loadInto = (img, srcs) => new Promise((res) => {
  const go = (i) => { if (!img || i >= srcs.length) return res(false); img.onload = () => res(true); img.onerror = () => go(i + 1); img.src = srcs[i]; };
  go(0);
});

const KEY = 'system_battle';""")
# trainer label + sprite id from trainer data (overworld lines: name / trainer_class; npc_sprite_map: sprite_id)
rep("  const kb = new KilumenBattle(", """  const tInfo = trainer ? (async () => {
    const w = opts.who || {}; let e = {};
    try { e = (w.map && w.id && ui.scene?._entryFor?.(w.map, { id: w.id })) || {}; } catch { e = {}; }
    const cls = e.trainer_class || '', nm = e.name || '';
    const label = opts.trainerName || (cls && nm && cls !== nm ? `${cls} ${nm}` : nm || cls) || opts.foeName || 'Trainer';
    let sid = opts.trainerSprite || null;
    if (!sid && w.map && w.id) try { sid = (await (await fetch(PIXD + 'npcs/npc_sprite_map.json')).json()).map?.[`${w.map}.${w.id}`]?.sprite_id || null; } catch { sid = null; }
    return { label, sid };
  })() : null;
  const kb = new KilumenBattle(""")
rep("""      ${side === 'p1' || trainer ? `<div class="b-party" id="${side}-party" role="img"></div>` : ''}</div></div>`;""",
"""      ${side === 'p1' ? '<div class="b-party" id="p1-party" role="img"></div>' : trainer ? '<div class="b-trbar"><span class="b-trname" id="p2-trname"></span><div class="b-party" id="p2-party" role="img"></div></div>' : ''}</div></div>`;""")
rep("""<div class="ui-battle" data-scr="battle" data-engine="sd" data-biome="${esc(biome)}">""", """<div class="ui-battle${trainer ? ' b-intro' : ''}" data-scr="battle" data-engine="sd" data-biome="${esc(biome)}">""")
rep("""<img class="ui-sprite b-mon" id="p2-mon" alt="" style="opacity:0"></div>""", """${trainer ? '<img class="b-trainer-fig foe" id="tr-p2" alt="" hidden>' : ''}<img class="ui-sprite b-mon" id="p2-mon" alt="" style="opacity:0"></div>""")
rep("""<img class="ui-sprite b-mon" id="p1-mon" alt="" style="opacity:0"></div>
        ${plateHtml('p2')}${plateHtml('p1')}</div>""", """${trainer ? '<img class="b-trainer-fig ally" id="tr-p1" alt="" hidden>' : ''}<img class="ui-sprite b-mon" id="p1-mon" alt="" style="opacity:0"></div>
        ${plateHtml('p2')}${plateHtml('p1')}${trainer ? '<div class="b-intro-row foe" id="intro-p2" aria-hidden="true"></div><div class="b-intro-row ally" id="intro-p1" aria-hidden="true"></div>' : ''}</div>""")
# intro + send-out handling
rep("  const sideOf = (ident) => ident.slice(0, 2);", """  // trainer intro: both trainers on their platforms, '<trainer> wants to battle!', large 6-slot crystal rows per side;
  // at send-out the rows give way to the small rows on the cards, the foe trainer steps aside (stays for the fight) and
  // the player's trainer slides off. Wild battles skip all of this.
  const introRow = (s, list) => {
    const el = $(`#intro-${s}`); if (!el) return;
    el.innerHTML = Array.from({ length: 6 }, (_, i) => `<i data-st="${i >= list.length ? 'empty' : list[i].hp === 0 ? 'out' : 'ok'}"></i>`).join('');
  };
  const intro = async () => {
    const t = await tInfo; if (!t) return;
    const nmEl = $('#p2-trname'); if (nmEl) nmEl.textContent = t.label;
    const [okF, okA] = await Promise.all([loadInto($('#tr-p2'), trainerSrcs(t.sid)), loadInto($('#tr-p1'), [PLAYER_BACK])]);
    if (okF) $('#tr-p2').hidden = false; if (okA) $('#tr-p1').hidden = false;
    introRow('p2', foes); introRow('p1', party);
    await say(P1('trainer_wants', '{trainer} wants to battle!', { trainer: t.label }) /* PH */, 0);
  };
  const endIntro = (s) => {
    const root = $('.ui-battle'); if (!root?.classList.contains('b-intro') && !root?.classList.contains('b-intro-out')) return;
    root.classList.remove('b-intro'); root.classList.add('b-intro-out');
    if (s === 'p2') $('#tr-p2')?.classList.add('aside');
    if (s === 'p1') { const f = $('#tr-p1'); if (f && !f.hidden) { f.classList.add('gone'); setTimeout(() => { f.hidden = true; }, 450); } }
  };
  const sideOf = (ident) => ident.slice(0, 2);""")
rep("""          const img = $(`#${s}-mon`); img.src = s === 'p2' ? front(sp) : back(sp); img.style.opacity = '1'; setFeet(img);""",
"""          if (trainer && first) endIntro(s);
          const img = $(`#${s}-mon`); img.src = s === 'p2' ? front(sp) : back(sp); img.classList.toggle('b-flip', s === 'p1' && BACK_FACES_LEFT.has(sp)); img.style.opacity = '1'; setFeet(img);""")
rep("const run = () => guard((async () => { await wait(300); await play(kb.drain());", "const run = () => guard((async () => { await wait(300); if (trainer) await intro(); await play(kb.drain());")
open(p, 'w').write(s)

c = root + '/src/ui/ui.css'; t = open(c).read()
anchor = ".b-party { display: flex; gap: 3px; align-items: center; justify-content: flex-end; margin-top: 4px; }"
assert t.count(anchor) == 1
t += """
/* ---- facing, trainer intro, team crystal pips (Gary, Oct 23 2026) ----
   .b-flip: player-side back sprites drawn facing left are mirrored (CSS `scale`, so the transform keyframes still apply).
   Pips: one small crystal per team member, dimmed when fainted; the foe row (with the trainer's name) hangs under the foe
   card, the player's row sits on top of the player card. Intro: large 6-slot rows on bars (empty outline = unused slot). */
.ui-battle[data-scr="battle"] .b-mon.b-flip { scale: -1 1; }
.ui-battle[data-scr="battle"] .b-plate .b-party, .ui-battle[data-scr="battle"] .b-plate.ally .plate > .b-party { position: absolute; margin: 0; gap: 3px; padding: 3px 7px; background: var(--plate); border: 2px solid var(--outline); border-radius: 8px; }
.ui-battle[data-scr="battle"] .b-plate.ally .b-party { right: 14px; bottom: calc(100% - 2px); }
.ui-battle[data-scr="battle"] .b-trbar { position: absolute; left: 14px; top: calc(100% - 2px); display: flex; align-items: center; gap: 6px; max-width: calc(100% - 20px); }
.ui-battle[data-scr="battle"] .b-trbar .b-party { position: static; }
.ui-battle[data-scr="battle"] .b-trname { font-size: .72em; line-height: 1.2; padding: 3px 8px; background: var(--night, #2a2238); color: var(--on-night, #fff); border: 2px solid var(--outline); border-radius: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.ui-battle[data-scr="battle"] .b-trname:empty { display: none; }
.ui-battle[data-scr="battle"] .b-party i, body.platform-mobile .ui-battle[data-scr="battle"] .b-party i { width: 11px; height: 15px; border: 0; border-radius: 0; box-shadow: none; clip-path: polygon(50% 0, 100% 38%, 50% 100%, 0 38%); background: var(--outline); position: relative; }
.ui-battle[data-scr="battle"] .b-party i::after, .b-intro-row i::after { content: ''; position: absolute; inset: 2px; clip-path: polygon(50% 0, 100% 38%, 50% 100%, 0 38%); background: linear-gradient(160deg, #e9ddff 0 22%, #a77cf2 23% 60%, #6a45c4 61%); }
.ui-battle[data-scr="battle"] .b-party i[data-lvl=warn]::after { background: linear-gradient(160deg, #fff3c4 0 22%, var(--warn) 23%); }
.ui-battle[data-scr="battle"] .b-party i[data-lvl=bad]::after { background: linear-gradient(160deg, #ffd1c9 0 22%, var(--bad) 23%); }
.ui-battle[data-scr="battle"] .b-party i[data-lvl=out] { opacity: .5; }
.ui-battle[data-scr="battle"] .b-party i[data-lvl=out]::after, .b-intro-row i[data-st=out]::after { background: #4a4058; }
.ui-battle[data-scr="battle"] .b-party i.on { filter: drop-shadow(0 0 2px var(--sun)); outline: none; }
body.platform-mobile .ui-battle[data-scr="battle"] .b-party i { width: 9px; height: 12px; }
body.platform-mobile .ui-battle[data-scr="battle"] .b-trname { font-size: .62em; padding: 1px 6px; }
.b-trainer-fig { position: absolute; bottom: calc(var(--b-fig-feet, 14%)); left: 50%; translate: -50% 0; height: min(30vh, 250px); width: auto; image-rendering: pixelated; z-index: 0;
  transition: translate .45s ease-out, opacity .45s ease-out, height .45s ease-out; }
.b-trainer-fig.foe { --b-fig-feet: 18%; }
.b-trainer-fig.ally { height: min(40vh, 340px); --b-fig-feet: 8%; }
.b-trainer-fig.foe.aside { height: min(20vh, 170px); translate: 75% -6%; opacity: .95; }
.b-trainer-fig.ally.gone { translate: -260% 0; opacity: 0; }
.ui-battle[data-scr="battle"] .b-foe .b-mon, .ui-battle[data-scr="battle"] .b-ally .b-mon { position: relative; z-index: 1; }
.ui-battle.b-intro .b-plate { visibility: hidden; }
.b-intro-row { position: absolute; display: flex; gap: 10px; padding: 8px 26px 10px; background: linear-gradient(transparent 62%, var(--outline) 62% 72%, transparent 72%); pointer-events: none; z-index: 3; transition: opacity .3s; }
.b-intro-row.foe { left: 0; top: 10%; animation: ui-plate-l 500ms var(--ease-pop, ease-out) both; }
.b-intro-row.ally { right: 0; bottom: 6%; animation: ui-plate-r 500ms var(--ease-pop, ease-out) both; }
.b-intro-row i { position: relative; width: 26px; height: 36px; clip-path: polygon(50% 0, 100% 38%, 50% 100%, 0 38%); background: var(--outline); }
.b-intro-row i[data-st=out] { opacity: .55; }
.b-intro-row i[data-st=empty]::after { background: rgba(255, 255, 255, .18); }
.ui-battle:not(.b-intro) .b-intro-row { opacity: 0; }
body.platform-mobile .b-intro-row { gap: 6px; padding: 4px 14px 6px; }
body.platform-mobile .b-intro-row i { width: 17px; height: 24px; }
body.platform-mobile .b-trainer-fig.foe { height: min(34vh, 150px); }
body.platform-mobile .b-trainer-fig.ally { height: min(46vh, 190px); }
body.platform-mobile .b-trainer-fig.foe.aside { height: min(24vh, 100px); translate: 55% -4%; }
body.ui-reduce .b-trainer-fig, body.ui-reduce .b-intro-row { transition: none; animation: none; }
@media (prefers-reduced-motion: reduce) { .b-trainer-fig, .b-intro-row { transition: none; animation: none; } }
"""
open(c, 'w').write(t)
print('ok', root)
