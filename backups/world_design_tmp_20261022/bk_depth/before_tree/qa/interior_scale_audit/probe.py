import audit as A, cam as C
def test(n, cell, stand):
    a = A.analyse(n); out=[]
    for vi in A.VI:
        if vi['plat']!='mobile': continue
        c = C.cam_for(stand, a, vi)
        for z in C.zones(vi):
            for what, cc in (('target', cell), ('player', stand)):
                o = C.overlap(C.cell_rect_css(*cc, c, vi), z)
                if o>0.05: out.append((vi['name'][:14], what, z[0], round(o,2)))
    return out
# safe mask: for every walkable stand cell, which own cells are covered (player under thumb)
def mask(n):
    a=A.analyse(n); col=a['m']['layers']['collision']; rows=[]
    for y in range(a['H']):
        s=''
        for x in range(a['W']):
            worst=0
            for vi in A.VI:
                if vi['plat']!='mobile' or 'Tablet' in vi['name']: continue
                c=C.cam_for((x,y),a,vi)
                for z in C.zones(vi): worst=max(worst,C.overlap(C.cell_rect_css(x,y,c,vi),z))
            s+= ('#' if col[y][x]==1 else '.') if worst<0.25 else ('X' if col[y][x]!=1 else 'x')
        rows.append(s)
    return rows
for n in ['heal_brookhollow','lab_brookhollow','fernwick_hall_int','office_int','house_1f','shop_int']:
    print(n); print('\n'.join(mask(n)))
print('heal sofa new', test('heal_brookhollow',(1,3),(1,4)))
print('lab aide new', test('lab_brookhollow',(10,6),(10,7)))
print('hall helper1 x4', test('fernwick_hall_int',(4,12),(4,11)))
