"""Ondravel summit v2 (Coder, Oct 30 2026; Gary: "a towering figure that splits the clouds", no crystal wall).
Post-patch for art/world/overworld/maps/fin_lab1_now.json AFTER build_climb.py: the crystal ring ('*'), the plinth ('O'),
the crystal props ('C'), violet moss and mystic floor are gone; the north is an open rock edge over the cloud sea ('~').
Ondravel is drawn by src/region9/summit_fx.js as a screen-scale giant beyond the edge (nothing touches him).
fin_dome is now the lookout: a blocked cloud-edge cell with the stand cell below it.  Run: python3 tools/wellspire/summit_open_peak.py"""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MP = os.path.join(ROOT, 'art', 'world', 'overworld', 'maps', 'fin_lab1_now.json')
PEAK = [
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~",
 "~~~~~~~.....~.....~~~~~~~",   # the edge; (12,4) = lookout (fin_dome)
 "~~~~~...............~~~~~",
 "~~~#.................#~~~",
 "~~#...................#~~",
 "~~#...................#~~",
 "~~#...................#~~",
 "~~#...................#~~",
 "~~#..k................#~~",
 "~~~#.................#~~~",
 "~~~~##.............##~~~~",
 "~~~~~~##....U....##~~~~~~",
 "~~~~~~~~~~~~~~~~~~~~~~~~~"]
ROCK = [21, 21, 21, 21]  # dark rock base tile (summit_fx paints the sunlit rock over it)
def build():
    j = json.load(open(MP)); L = j['layers']; H, W = len(PEAK), len(PEAK[0]); assert (W, H) == (j['width'], j['height'])
    for y, r in enumerate(PEAK):
        for x, ch in enumerate(r):
            g, d, c = 21, 0, 0
            if ch == '~': d, c = 11017, 1
            elif ch == '#': d, c = 507, 1
            elif ch == 'k': d, c = 7427, 1
            elif ch == 'U': d, c = 7322, 4
            L['ground'][y][x], L['decoration'][y][x], L['collision'][y][x] = g, d, c
            L['overlay'][y][x] = 0; L['encounter'][y][x] = 0
    j['interact_spots'] = [s for s in j['interact_spots'] if s['id'] != 'fin_dome'] + [
        {'id': 'fin_dome', 'kind': 'prop', 'x': 12, 'y': 4, 'stand': [12, 5], 'face': 'up', 'region9': True}]
    j['ondravel'] = {'x': 12, 'y': 3, 'w': 4, 'h': 4, 'giant': True, 'sheet': j['ondravel']['sheet']}
    j['staging'] = {'cave': [12, 13], 'stop': [12, 5], 'speech': [12, 5], 'face': 'up',
                    'note': "Animator v4 preview cells (64px, 640x1152 scene): cave_exit (5,17) -> (12,13), the tile in front of the cave mouth door (12,14); walk_stop = speech_start (5,13) -> (12,5), the far rock edge under Ondravel (fin_dome stand). Same column through the scene centre; the real platform is deeper, so the forced walk is 8 tiles instead of 4."}
    j['peak'] = {'cloud': [y * W + x for y, r in enumerate(PEAK) for x, c in enumerate(r) if c == '~' and (x, y) != (12, 4)], 'keep': [y * W + x for y, r in enumerate(PEAK) for x, c in enumerate(r) if c in 'kU']}  # summit_peak.js: cloud cells / cells the rock painter leaves alone
    j['sky'] = 'sunset_cloud_sea'; j['tint'] = {'color': '#ff8a3c', 'alpha': 0.08, 'grade': 'dusk', '_why': 'summit locked to the sunset look (Gary Oct 30 2026): clock.js gradeFor -> dusk in every phase'}; j['source'] += '' if 'summit_open_peak' in j['source'] else ' + tools/wellspire/summit_open_peak.py'
    json.dump(j, open(MP, 'w'), indent=1)
    gp = os.path.join(ROOT, 'src', 'region9', 'points.gen.js'); s = open(gp).read()
    head, body = s.split('export const POINTS = ', 1); pts = json.loads(body.rstrip().rstrip(';'))
    pts['fin_lab1_now']['fin_dome'] = {'x': 12, 'y': 5, 'facing': 'up'}
    open(gp, 'w').write(head + 'export const POINTS = ' + json.dumps(pts, indent=1) + ';\n')
if __name__ == '__main__': build()
