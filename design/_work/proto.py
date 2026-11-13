exec(open('/workspace/kilumen/design/_work/stats.py').read().split("for n in ['route1'")[0])
exec(open('/workspace/kilumen/design/_work/grid.py').read().split("if __name__")[0])
def report(d,pairs):
    ex=exits_cells(d)
    for a,b in pairs:
        print(a,'->',b,'shortest',path(d,ex[a],set(ex[b]),0),'min-grass',path(d,ex[a],set(ex[b]),1000))
