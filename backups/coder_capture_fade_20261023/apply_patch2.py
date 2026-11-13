import sys
root = sys.argv[1]
def sub(rel, old, new):
    p = f"{root}/{rel}"; s = open(p).read()
    assert s.count(old) == 1, (rel, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))
U = 'src/battle/ui_sd.js'
# A) model swap: the empty-party fallback Rillop was battle-only, so a catch became the whole real party (next battle: the catch leads)
sub(U, "  const partySrc = ui.party().length ? ui.party() : [{ species: 'rillop', rt: 'RT-0147' }];",
"""  // Model swap (Gary 3:16 PM CT Oct 23 2026, "model changed after using crystal"): with an empty real party the fallback Rillop used to
  // exist in this battle only, so a catch became the whole real party and led the next battle. With systems attached it now joins
  // the real party first (Party.list fills in uid/stats), so results, catches and the next battle all see the same team. Not saved here.
  const sysP = ui.demo ? null : ui.scene?.systems?.party;
  if (!ui.party().length && sysP && ui.scene) { ui.scene.party = [{ species: 'rillop', rt: 'RT-0147', level: statsFor({ species: 'rillop' }, 0).level }]; void sysP.list; ui.scene.onPartyChange?.(true); }
  const partySrc = ui.party().length ? ui.party() : [{ species: 'rillop', rt: 'RT-0147' }];""")
# B) ally ghosting: restore the player's sprite after any capture too
sub(U, "          if (ok) { img.style.opacity = '0'; const mi",
"          restoreAlly($('#p1-mon'));\n          if (ok) { img.style.opacity = '0'; const mi")
sub(U, "  // Caught announcement (Gary 3:15 PM CT)",
"""  // the capture FX dims the player's creature to .35 while the crystal is up; its lower step reverted to that dimmed inline value
  // (gary_fade.png: Rillop ghosted). Clear it outright once the capture is over (both outcomes).
  const restoreAlly = (el) => { if (!el) return; try { const A = ui.fx?._A?.(); A?.utils?.remove?.(el); A?.remove?.(el); } catch { /* no anime */ }
    el.getAnimations?.().forEach((a) => { if (!(globalThis.CSSAnimation && a instanceof CSSAnimation) && !(globalThis.CSSTransition && a instanceof CSSTransition)) a.cancel(); });
    ['opacity', 'filter', 'transform', 'visibility', 'translate', 'scale', 'rotate'].forEach((k) => el.style.removeProperty(k)); };
  // Caught announcement (Gary 3:15 PM CT)""")
# C) forced switch (Gary 3:17 PM CT): only creatures that can fight, no back-out, no stray A from the faint text
sub(U, """    const team = kb.request().team;
    showList(forced ? 'forced' : 'team', team.map((c, i) => ({""",
"""    const team = kb.request().team;
    // forced (the active one is out cold, Gary 3:17 PM CT "pick the next one until they are all dead"): list only the ones that can
    // still fight, no Back; a press already held from the faint text can't pick (input opens 350 ms later)
    if (forced) { pickAt = performance.now() + 350;
      return showList('forced', team.map((c, i) => ({ c, i })).filter(({ c, i }) => i > 0 && !c.fainted).map(({ c, i }) => ({ t: `${c.name} Lv.${c.level}`, s: `HP ${c.hp}/${c.maxhp}`,
        el: speciesById(c.species.id).el[0], go: () => act(`switch ${i + 1}`) })), P1('send_next', 'Who goes in next?') /* PH */); }
    showList(forced ? 'forced' : 'team', team.map((c, i) => ({""")
sub(U, "  const showTeam = (forced) => {", "  let pickAt = 0;\n  const showTeam = (forced) => {")
sub(U, """    if (busy) return;
    list[i]?.go?.();""", """    if (busy || (mode === 'forced' && performance.now() < pickAt)) return;
    list[i]?.go?.();""")
# D) capture_fx lower: don't revert the ally to the dimmed inline value
sub('src/ui/capture_fx.js', "onComplete: (a) => a.revert() });", "onComplete: () => c.ally.style.removeProperty('opacity') }); // not revert(): that restored raise's inline .35 (ghosted ally)")
print('ok', root)
