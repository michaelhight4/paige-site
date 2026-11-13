import json,sys
GB='/workspace/kilumen/art/world/overworld/'
T={t['id']:t['name'] for t in json.load(open(GB+'tileset.json'))['tiles']}
def grid(n,d=None):
    d=d or json.load(open(GB+'maps/'+n+'.json'));L=d['layers'];W,H=d['width'],d['height']
    out=['    '+''.join(str(x%10) for x in range(W))]
    marks={}
    for s in d['signs']: marks[(s['x'],s['y'])]='S'
    for i in d['items']: marks[(i['x'],i['y'])]='i'
    for p in d['npcs']: marks[(p['x'],p['y'])]='N' if 'trainer' not in p['id'] else 'R'
    for w in d['warps']: marks[(w['x'],w['y'])]='D'
    for y in range(H):
        row=''
        for x in range(W):
            c=L['collision'][y][x];g=T.get(L['ground'][y][x],'');e=L['encounter'][y][x]
            if (x,y) in marks: ch=marks[(x,y)]
            elif c==2: ch='v'
            elif c==3: ch='~'
            elif c==8: ch='b'
            elif c==6: ch='6'
            elif c==4: ch='D'
            elif c==1: ch='T' if ('tree' in T.get(L['decoration'][y][x],'') or 'tree' in T.get(L['overlay'][y][x],'')) else '#'
            elif e: ch='G'
            elif g.startswith('path') or g.startswith('cobble') or 'path' in g: ch='='
            elif 'sand' in g: ch=':'
            elif 'mud' in g: ch='m'
            else: ch='.'
            row+=ch
        out.append(f'{y:3d} '+row)
    return '\n'.join(out)
if __name__=='__main__':
    for n in sys.argv[1:]: print('=====',n); print(grid(n))
