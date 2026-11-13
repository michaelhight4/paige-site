import sys
root = sys.argv[1]
def sub(rel, old, new):
    p = f"{root}/{rel}"; s = open(p).read()
    assert s.count(old) == 1, (rel, old[:60], s.count(old)); open(p, 'w').write(s.replace(old, new))

# 1) ui_sd.js: say() drops the caught-sprite layout; failed capture fully restores the foe; caught shows the follower sprite
sub('src/battle/ui_sd.js',
"    const m = $('#b-msg'); m.innerHTML = `${esc(t)}${auto ? '' : '<span class=\"more\">▼</span>'}`; mode = 'msg';",
"    const m = $('#b-msg'); m.classList.remove('b-msg-caught'); m.innerHTML = `${esc(t)}${auto ? '' : '<span class=\"more\">▼</span>'}`; mode = 'msg';")
sub('src/battle/ui_sd.js',
"  const sideOf = (ident) => ident.slice(0, 2);",
"""  // Failed capture (Gary 3:14 PM CT Oct 23 2026, "after using dominance crystal"): the capture FX drives the foe sprite with inline
  // opacity / transform / filter (anime.js tweens, fx_art.js frame timers, .ax-lit) and only restored it from late async callbacks,
  // so a stalled tween or a late frame timer could leave it ghosted. Stop every script animation on it, clear the capture styles and
  // classes (capDone tells fx_art.js's leftover frame timers to keep off), then a short pop back (static under reduced motion).
  const restoreFoe = (img) => {
    if (!img) return; img.dataset.capDone = '1';
    try { const A = ui.fx?._A?.(); A?.utils?.remove?.(img); A?.remove?.(img); } catch { /* anime.js absent */ }
    img.getAnimations?.().forEach((a) => { if (!(globalThis.CSSAnimation && a instanceof CSSAnimation) && !(globalThis.CSSTransition && a instanceof CSSTransition)) a.cancel(); });
    img.classList.remove('ax-lit', ...MOTION); ['opacity', 'filter', 'transform', 'visibility', 'animation', 'translate', 'scale', 'rotate'].forEach((k) => img.style.removeProperty(k));
    img.classList.add('idle');
    if (!ui.fx?.reduced?.()) img.animate?.([{ transform: 'scale(.82)' }, { transform: 'scale(1.06)', offset: 0.6 }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
  };
  // Caught announcement (Gary 3:15 PM CT): the creature's small overworld follower sprite (art/characters/pixel/creatures/<id>/overworld/
  // <id>_ow_sheet.png, 64x64 frames, row 0 = facing down, col 0) centred under the text. Pops in; static under reduced motion. No sheet -> nothing.
  const caughtMon = (sp) => new Promise((res) => {
    if (!sp) return res(null); const url = `art/characters/pixel/creatures/${sp}/overworld/${sp}_ow_sheet.png`, im = new Image();
    im.onload = () => res(im.naturalWidth >= 64 && im.naturalHeight >= 64 ? { url, w: im.naturalWidth, h: im.naturalHeight } : null); im.onerror = () => res(null);
    im.src = url; setTimeout(() => res(null), 1500);
  });
  const showCaughtMon = (m, info) => {
    if (!m || !info) return; const d = document.createElement('i'); d.className = 'b-caught-mon'; d.setAttribute('aria-hidden', 'true');
    d.style.backgroundImage = `url(${info.url})`; d.style.backgroundSize = `${info.w}px ${info.h}px`;
    m.classList.add('b-msg-caught'); const more = m.querySelector('.more'); m.insertBefore(d, more);
    if (!ui.fx?.reduced?.()) d.animate?.([{ transform: 'translateY(6px) scale(.4)', opacity: 0 }, { transform: 'translateY(-2px) scale(1.12)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out' });
  };
  const sideOf = (ident) => ident.slice(0, 2);""")
sub('src/battle/ui_sd.js',
"""          if (ok) { img.style.opacity = '0'; await say(P1('caught', '{creature} is with you now!', { creature: who }) /* PH */, 0); }
          else await say(P1('crystal_escape', '{creature} broke free!', { creature: who }) /* PH */, 700);""",
"""          if (ok) { img.style.opacity = '0'; const mi = await caughtMon(mon.p2?.species); const said = say(P1('caught', '{creature} is with you now!', { creature: who }) /* PH */, 0); showCaughtMon($('#b-msg'), mi); await said; }
          else { restoreFoe(img); await say(P1('crystal_escape', '{creature} broke free!', { creature: who }) /* PH */, 700); }""")

# 2) fx_art.js: late breakout frame timers / tail don't touch the foe once the battle restored it
sub('src/ui/fx_art.js',
"const j = ref.frames.indexOf(i); if (foe && j >= 0) {",
"const j = ref.frames.indexOf(i); if (foe && j >= 0 && !foe.dataset.capDone) {")
sub('src/ui/fx_art.js',
".then(() => { b.remove(); if (foe) { foe.style.opacity = ''; foe.style.animation = ''; } }); });",
".then(() => { b.remove(); if (foe) { foe.classList.remove('ax-lit'); foe.style.opacity = ''; foe.style.animation = ''; } }); });")

# 3) ui_tools2.js: a new capture clears the restored flag
sub('src/ui/ui_tools2.js',
"    const pulses = Math.max(1, Math.min(4, Math.round(o.pulses) || 1)), caught = !!o.caught, A = this._A();",
"    const pulses = Math.max(1, Math.min(4, Math.round(o.pulses) || 1)), caught = !!o.caught, A = this._A();\n    if (o.foe) delete o.foe.dataset.capDone; // ui_sd.js restoreFoe sets it after a break-free")

# 4) ui.css: caught sprite under the message text
sub('src/ui/ui.css',
".b-msg .more {",
""".b-msg.b-msg-caught { flex-direction: column; justify-content: center; gap: 4px; text-align: center; }
.b-msg .b-caught-mon { display: block; width: 64px; height: 64px; flex: none; background-repeat: no-repeat; background-position: 0 0; image-rendering: pixelated; }
.b-msg .more {""")
print('ok', root)
