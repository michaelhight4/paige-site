# Aurelith city plan diagram (Pillow, HPND licence). Playable area 64x48 squares.
from PIL import Image, ImageDraw, ImageFont
W,H,S=64,48,16
img=Image.new('RGB',(W*S+40,H*S+70),'white'); d=ImageDraw.Draw(img); ox,oy=30,40
f=ImageFont.load_default()
def R(x,y,w,h,c,t=''):
    d.rectangle([ox+x*S,oy+y*S,ox+(x+w)*S-1,oy+(y+h)*S-1],fill=c,outline='black')
    if t:
        for i,l in enumerate(t.split('\n')): d.text((ox+x*S+3,oy+y*S+3+i*11),l,fill='black',font=f)
R(0,0,W,H,'#b9d98a')                          # park/greenery base
# roads (grey) and pavements are implicit 1-square margins
for r in [(0,19,64,3),(30,0,4,48),(0,12,64,2),(0,32,64,2),(14,12,2,36),(48,12,2,36)]: R(*r,'#9a9a9a')
R(30,19,4,3,'#9a9a9a','')
R(16,0,30,11,'#f2c879','GAMES DISTRICT\nAurelith Games Stadium 18x9 (x22-39,y1-9)\nNorth gate -> aurelith_arena')
R(22,1,18,9,'#e0913a','STADIUM 18x9\nlobby door (30,9)\nAurora at plaza steps')
R(2,1,12,10,'#c9b8e8','CIVIC\nCapitol / Govt\nAirspace office\n10x7')
R(50,1,12,10,'#c9b8e8','MUSEUM /\nGames Hall\nof Fame 10x7')
R(0,22,14,10,'#9fc5e8','RAIL QUARTER  (west exit route_east)')
R(1,24,12,7,'#6fa8dc','GRAND TERMINAL 12x7\nstation_int 2F\nrail = only arrival\nfast-travel point')
R(17,22,12,9,'#ffffff','')
R(17,22,12,9,'#e6e6e6','CROWN PLAZA 12x9\nLumen Spire landmark 2x2\nfountain, benches')
R(22,25,2,2,'#f6e05e')
R(35,22,12,9,'#e6e6e6','PLAZA EAST\nmarket stalls 1x2 x6')
R(16,14,6,5,'#f4cccc','HEAL\nCENTRE\n6x5')
R(23,14,6,5,'#f4cccc','MART\n5x4')
R(35,14,12,5,'#f9cb9c','GALLERIA DEPT STORE 12x5\n5 floors + roof')
R(50,14,12,5,'#d9d2e9','RT COMPANY HQ 8x5\ntower, 3 enterable F')
R(50,22,14,10,'#9fc5e8','EAST GATE\ngatehouse 6x4\n-> route_aurelith_saltmere')
R(0,14,14,5,'#d5e8d4','HOTEL 8x5\n(lobby + 1F)')
R(0,34,14,14,'#d9ead3','RESIDENTIAL W\nterraces 6x4 x4\napartment 6x5')
R(16,34,14,14,'#d9ead3','RESIDENTIAL C\nflats 6x5 x2\ncafe, school')
R(34,34,14,14,'#fff2cc','SOUTH GATE\n-> route_cindervale\ngatehouse 6x4')
R(50,34,14,14,'#d9ead3','CANAL PARK\ntrainer garden\nberry plots')
# grid
for x in range(W+1): d.line([ox+x*S,oy,ox+x*S,oy+H*S],fill=(0,0,0,40) if x%4 else 'gray',width=1 if x%4 else 1)
for y in range(H+1): d.line([ox,oy+y*S,ox+W*S,oy+y*S],fill='gray' if y%4==0 else '#cccccc')
for x in range(0,W+1,8): d.text((ox+x*S-4,oy-12),str(x),fill='black',font=f)
for y in range(0,H+1,8): d.text((4,oy+y*S-5),str(y),fill='black',font=f)
d.text((ox,6),'AURELITH CITY PLAN - playable 64x48 squares (map 88x62 incl. 12/7 padding), 1 cell = 1 square, grey = roads 2-4 wide',fill='black',font=f)
d.text((ox,22),'PLAN ONLY - not built. Main roads: Crown Avenue (N-S x30-33), Rail Boulevard (E-W y19-21)',fill='black',font=f)
img.save('layout.png')
