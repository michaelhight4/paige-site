import sys
root = sys.argv[1]
p = root + '/src/battle/ui_sd.js'; s = open(p).read()
def rep(o, n):
    global s
    assert s.count(o) == 1, o[:70]; s = s.replace(o, n)
rep("""${trainer ? '<img class="b-trainer-fig foe" id="tr-p2" alt="" hidden>' : ''}""",
    """${trainer ? `<img class="b-trainer-fig foe" id="tr-p2" alt="" hidden><div class="b-tr-spot" id="tr-spot" hidden><img class="b-plat far b-tr-plat" alt="" src="${drawPlatform(biome, 'far')}" style="--plat-w:${PLATFORM_SIZES.far.w}"></div>` : ''}""")
rep("""    if (s === 'p2') $('#tr-p2')?.classList.add('aside');""",
"""    if (s === 'p2') { // the trainer steps onto their own platform beside the creature's (same feet line), kept on screen
      const f = $('#tr-p2'), spot = $('#tr-spot'), box = rb?.querySelector('.b-foe');
      if (f && spot && box && !f.hidden) {
        spot.hidden = false; spot.appendChild(f); f.classList.add('aside');
        const over = spot.getBoundingClientRect().right - (ui.layer.getBoundingClientRect().right - 8);
        if (over > 0) box.style.right = `${(parseFloat(getComputedStyle(box).right) || 0) + over}px`;
      }
    }""")
open(p, 'w').write(s)
c = root + '/src/ui/ui.css'; t = open(c).read()
t += """
/* foe trainer's own platform (Gary 3:33 PM CT): same biome platform as the creature's, same feet line, to its right with a gap;
   the trainer stands on it for the whole fight (ui_sd endIntro moves the figure in and nudges .b-foe left to stay on screen) */
.ui-battle[data-engine="sd"] .b-tr-spot { position: absolute; left: calc(100% + 18px); bottom: 0; width: calc(var(--plat-w-tr, 70) * var(--b-plat-px, 2) * var(--ui-sprite-scale, 2) * .8); height: 0; z-index: 0; }
.ui-battle[data-engine="sd"] .b-tr-spot .b-tr-plat { width: 100%; }
.ui-battle[data-engine="sd"] .b-tr-spot .b-trainer-fig.foe.aside { bottom: 0; left: 50%; translate: -50% 0; height: min(24vh, 190px); opacity: 1; z-index: 1; transition: none; }
body.platform-mobile .ui-battle[data-engine="sd"] .b-tr-spot { left: calc(100% + 10px); }
body.platform-mobile .ui-battle[data-engine="sd"] .b-tr-spot .b-trainer-fig.foe.aside { height: min(30vh, 112px); }
"""
open(c, 'w').write(t)
print('ok', root)
