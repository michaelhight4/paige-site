import numpy as np
from PIL import Image
from scipy import ndimage
def cutout(img, box=None, thr=228):
    im=img.convert('RGB')
    if box: im=im.crop(box)
    c=np.array(im).astype(int)
    white=c.min(2)>thr
    lab,_=ndimage.label(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    fg=~np.isin(lab,list(border))
    fl,n=ndimage.label(fg)
    if n:
        sizes=ndimage.sum(fg,fl,range(1,n+1)); big=int(sizes.argmax())+1
        edge=set(np.unique(np.concatenate([fl[:,0],fl[:,-1]])))
        keep=[big]+[i+1 for i,s in enumerate(sizes) if i+1!=big and s>0.003*sizes.max() and (i+1) not in edge]
        fg=np.isin(fl,keep)
    ys,xs=np.where(fg); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    return c[y0:y1,x0:x1], fg[y0:y1,x0:x1], (x0+(box[0] if box else 0), y0+(box[1] if box else 0))
def snap(img, box, target_h=None, target_w=None, ncol=24, outline=True, thr=228):
    """returns RGBA native pixel sprite (tight), scale factor, origin offset"""
    c,fg,org=cutout(img,box,thr)
    h,w=fg.shape
    s = target_h/h if target_h else target_w/w
    if target_h and target_w: s=min(target_h/h,target_w/w)
    nw,nh=max(1,round(w*s)),max(1,round(h*s))
    # box downscale of premultiplied colour
    rgb=Image.fromarray((c*fg[...,None]).astype('uint8')); a=Image.fromarray((fg*255).astype('uint8'))
    rs=np.array(rgb.resize((nw,nh),Image.BOX)).astype(float); ra=np.array(a.resize((nw,nh),Image.BOX)).astype(float)/255
    mask=ra>0.45
    col=np.where(ra[...,None]>0, rs/np.maximum(ra[...,None],1e-3),0).clip(0,255)
    if outline: col,mask=add_outline(col,mask)
    out=quantize(col,mask,ncol)
    out=clean(out,mask)
    rgba=np.dstack([out,mask*255]).astype('uint8')
    return Image.fromarray(rgba,'RGBA'), s, org
def quantize(col,mask,ncol):
    px=col[mask].astype('uint8')
    if len(px)==0: return col
    pim=Image.fromarray(px.reshape(1,-1,3))
    q=pim.quantize(colors=ncol,method=Image.Quantize.MEDIANCUT,kmeans=3,dither=Image.Dither.NONE).convert('RGB')
    out=col.copy(); out[mask]=np.array(q).reshape(-1,3); out[~mask]=0
    return out
def clean(out,mask):
    # replace isolated pixels (no 4-neighbour of same colour) with most common neighbour colour
    h,w,_=out.shape; o=out.copy()
    key=(out[...,0].astype(int)<<16)|(out[...,1].astype(int)<<8)|out[...,2].astype(int)
    for y in range(1,h-1):
        for x in range(1,w-1):
            if not mask[y,x]: continue
            k=key[y,x]; nb=[(y-1,x),(y+1,x),(y,x-1),(y,x+1)]
            if any(mask[p] and key[p]==k for p in nb): continue
            ks=[key[p] for p in nb if mask[p]]
            if len(ks)<3: continue
            vals,cnt=np.unique(ks,return_counts=True)
            if cnt.max()>=2:
                kk=vals[cnt.argmax()]; o[y,x]=[(kk>>16)&255,(kk>>8)&255,kk&255]
    # remove orphan alpha pixels
    lab,n=ndimage.label(mask)
    if n>1:
        sz=ndimage.sum(mask,lab,range(1,n+1))
        for i,s in enumerate(sz):
            if s<3: mask[lab==i+1]=False
    o[~mask]=0
    return o
def add_outline(out,mask):
    # darken edge pixels of the silhouette to a dark outline colour derived from neighbour (sel-out style)
    er=ndimage.binary_erosion(mask)
    edge=mask&~er
    o=out.copy().astype(float)
    o[edge]=o[edge]*0.35+np.array([20,12,18])*0.65
    return o.astype('uint8'),mask
def place(spr,W,H,bottom=True,pad_b=1):
    cv=Image.new('RGBA',(W,H),(0,0,0,0)); x=(W-spr.width)//2; y=H-spr.height-pad_b if bottom else (H-spr.height)//2
    cv.paste(spr,(x,y),spr); return cv,(x,y)
def up(im,k): return im.resize((im.width*k,im.height*k),Image.NEAREST)
def ncolors(im):
    a=np.array(im.convert('RGBA')); return len(np.unique(a[a[...,3]>0][:,:3],axis=0))
def find_boxes(img,n,thr=228,dil=8):
    c=np.array(img.convert('RGB')).astype(int); m=c.min(2)<=thr
    m=ndimage.binary_dilation(m,iterations=dil)
    lab,k=ndimage.label(m); sz=ndimage.sum(m,lab,range(1,k+1))
    idx=np.argsort(sz)[::-1][:n]+1
    sl=ndimage.find_objects(lab)
    bx=[(sl[i-1][1].start,sl[i-1][0].start,sl[i-1][1].stop,sl[i-1][0].stop) for i in idx]
    return sorted(bx)
