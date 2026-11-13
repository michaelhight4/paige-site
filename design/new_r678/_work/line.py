src=open('_work/compose.py').read()
exec(src[:src.index("grid={")])
grid=cells('_work/r8_raw.jpg')
items=[("emberkip","Emberkip","Lv 58-61",grid[2]),("flarekite","Flarekite","Lv 62",np.array(Image.open('_work/flarekite_raw.jpg').convert('RGB')).astype(int)),("pyrevane","Pyrevane","Lv 68",np.array(Image.open('_work/pyrevane_raw.jpg').convert('RGB')).astype(int))]
B=112;CW=150;sheet=Image.new('RGB',(3*CW+20,210),'#1d1b26');d=ImageDraw.Draw(sheet)
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
d.text((10,8),"Cindervale - Emberkip line (DRAFT)",fill='#e8e0ff',font=F(14))
for k,(i,n,lv,a) in enumerate(items):
  s=sprite(a,box=B);q=np.array(s);w=(q[...,:3].min(2)>215)&(q[...,3]>0)
  if i=='pyrevane': q[w,3]=0
  s=Image.fromarray(q);s.save(f'_work/cut/{i}.png');x=10+k*CW
  d.rectangle((x+2,32,x+CW-4,202),fill='#262433',outline='#9a4a2a',width=2)
  sheet.paste(s,(x+(CW-B)//2,40),s)
  if k: d.text((x-12,90),">",fill='#f0b070',font=F(18))
  for t,yy,f in((n,160,F(13)),(lv,180,F(11))):
    w=d.textlength(t,font=f);d.text((x+(CW-w)/2,yy),t,fill='white',font=f)
print('border hits',sum(CHECK),'of',len(CHECK))
sheet.resize((sheet.width*3,sheet.height*3),Image.NEAREST).save('emberkip_line.png')
z=Image.new('RGBA',(3*B*4,B*4),'#262433')
for k,(i,*_ ) in enumerate(items):
  im=Image.open(f'_work/cut/{i}.png').resize((B*4,B*4),0);z.paste(im,(k*B*4,0),im)
z.save('_work/zoom_line.png')
