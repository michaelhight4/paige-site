from PIL import Image, ImageDraw, ImageFont
C=22  # cell px
COL={'T':(46,94,58),'.':(150,200,120),'=':(214,190,140),'G':(60,140,70),'v':(120,90,60),'R':(220,60,60),'S':(250,250,250),
     'i':(250,220,60),'s':(255,150,150),'P':(60,110,230),'L':(240,200,40),'D':(120,70,40),'#':(110,110,110),'~':(80,140,220)}
panels=[
("1  LEDGE LOOP: long way out, short way home",
["T==TTTTTTTTTTTTT",
 "T==...........TT",
 "T==GGGGGGGGGG.TT",
 "TGGGGGGGGGGGGGTT",
 "T.GGGGGGGGGGGG=T",
 "T==..........==T",
 "Tvvvvvv#vvvvv==T",
 "T==.........==.T",
 "T==S=========..T",
 "T==............T",
 "TTTTTTTTTTTTTTTT"],
["Out (north): ledge blocks the short way; take the",
 "east trail and cross the grass belt: ~1.2-1.7x the map's",
 "long side, 4-19 grass steps.",
 "Home (south): jump the ledge row v: way home",
 "is 2-44% shorter (Crosley, 9 routes)."]),
("2  GRASS: blob, not slab",
["................",
 "..GGGG..........",
 ".GGGGGGG....GG..",
 ".GGG.iGGG..GGGG.",
 "..GGG.GGGGGGGG..",
 "...GGGGGG.GGG...",
 "....GG..........",
 "................",
 ".GGGGGGGGGGGGG..",
 ".GGGGGGGGGGGGG..",
 ".GGGGGGGGGGGGG.."],
["Top: ragged edge, notched corners, 1-tile holes",
 "(one hides an item i), no lone stray tiles,",
 "patch 12-40 tiles. Bottom: the slab to avoid",
 "(perfect rectangle, reads as a carpet)."]),
("3  TRAINER SIGHT vs CORRIDOR",
["TTTTTTTTTTTTTTTT",
 "T..............T",
 "T==============T",
 "T======R<ssss==T",
 "T..............T",
 "TTTTTTTTTTTTTTTT",
 "TTTT==TTTTTTTTTT",
 "T...==.........T",
 "T.R>ss.........T",
 "T...==.........T",
 "TTTT==TTTTTTTTTT"],
["Top: looking ALONG a 2-wide road covers 1 lane",
 "(50% catch, skippable). Bottom: standing BESIDE",
 "the road looking ACROSS covers both lanes",
 "(mandatory). Sight 2-3 early, 4-5 mid, up to 7."]),
("4  PATH HIERARCHY + JUNCTION",
["TT....==......TT",
 "T#..D.==.D.....T",
 "T#..=.==.=.....T",
 "T===========S..T",
 "T===========...T",
 "T....=====.....T",
 "T....=L===.....T",
 "T....=====.....T",
 "T===========...T",
 "T...D...==.....T",
 "TT.....====...TT"],
["Town: main road 2-3, plaza 4-6 at the crossing",
 "with a landmark L, 1-wide door spurs, sign S on",
 "the corner the player arrives at. Route trail",
 "keeps one width; widen only at forks/landmarks."]),
]
pw=16*C+20; ph=11*C+150
img=Image.new('RGB',(pw*2+130,ph*2+80),(250,248,240)); d=ImageDraw.Draw(img)
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13); fb=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15); ft=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
except: f=fb=ft=ImageFont.load_default()
d.text((10,8),"Kilumen: generic path & grass patterns (original diagram, not any real map)",fill=(20,20,20),font=ft)
for k,(title,g,notes) in enumerate(panels):
    ox=10+(k%2)*(pw+60); oy=40+(k//2)*(ph+10)
    d.text((ox,oy),title,fill=(20,20,20),font=fb)
    for y,row in enumerate(g):
        for x,ch in enumerate(row):
            base=ch
            if ch in '<>': base='s'
            x0=ox+x*C; y0=oy+24+y*C
            d.rectangle([x0,y0,x0+C-1,y0+C-1],fill=COL.get(base,(200,200,200)),outline=(0,0,0,40))
            if ch=='G': d.line([x0+5,y0+C-4,x0+7,y0+5],fill=(30,90,40),width=2); d.line([x0+13,y0+C-4,x0+15,y0+6],fill=(30,90,40),width=2)
            if ch=='v': d.polygon([(x0+3,y0+5),(x0+C-3,y0+5),(x0+C//2,y0+C-4)],fill=(240,230,200))
            if ch in 'RSLDi<>': d.text((x0+6,y0+3),{'<':'<','>':'>'}.get(ch,ch),fill=(0,0,0),font=f)
    for j,line in enumerate(notes):
        d.text((ox,oy+30+11*C+j*16),line,fill=(40,40,40),font=f)
d.text((10,img.height-42),"Legend: dark green tree | light green open ground | tan path | striped green tall grass | triangle ledge (jump south)",fill=(20,20,20),font=f)
d.text((10,img.height-24),"R trainer, pink = sight cells | S sign | i item | D door | L landmark | grey fence/lamp",fill=(20,20,20),font=f)
img.save('/workspace/kilumen/design/path_grass_patterns.png'); print(img.size)
