#!/usr/bin/env python3
"""Builds the CHAT portal sprite set. Usage: python3 build_portal.py (needs Pillow, numpy)."""
import math, numpy as np
from PIL import Image, ImageDraw, ImageFilter
GOLD=(224,180,92); GREEN=(127,176,105); LGREEN=(159,208,122); CREAM=(254,249,229); BOARD=(31,30,22)
W,H=128,160; SS=4  # supersample

def glow_layer(s, phase):
    """swirl vortex: green-gold spiral arms in an ellipse; phase in [0,1)."""
    w,h=W*s,H*s; cx,cy=w/2,h*0.56; rx,ry=38*s,52*s
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    dx=(xx-cx)/rx; dy=(yy-cy)/ry; r=np.sqrt(dx*dx+dy*dy); a=np.arctan2(dy,dx)
    arms=0.5+0.5*np.cos(3*(a+2*math.pi*phase/3)+r*5.5)
    inside=np.clip((1-r)/0.12,0,1)
    core=np.exp(-(r/0.35)**2)
    t=np.clip(r,0,1)[...,None]
    col=np.array(GREEN)*(1-t)+np.array(GOLD)*t
    col=col*(0.55+0.45*arms[...,None])+np.array(CREAM)*core[...,None]*0.6
    alpha=inside*(0.35+0.5*arms**1.5)+core*0.5
    halo=np.exp(-((r-1)/0.12)**2)*0.55*(r>1)
    alpha=np.clip(alpha*(r<=1)+halo,0,1)
    col=np.where((r>1)[...,None],np.array(LGREEN,dtype=np.float64),col)
    img=np.dstack([np.clip(col,0,255),alpha*235]).astype(np.uint8)
    return Image.fromarray(img,'RGBA').filter(ImageFilter.GaussianBlur(s*0.6))

def base_layer(s):
    w,h=W*s,H*s; im=Image.new('RGBA',(w,h)); d=ImageDraw.Draw(im)
    cx,cy=w/2,h*0.56; rx,ry=44*s,58*s
    # dark stone ring with gold trim
    d.ellipse([cx-rx-6*s,cy-ry-6*s,cx+rx+6*s,cy+ry+6*s],fill=(42,36,26,255))
    d.ellipse([cx-rx-6*s,cy-ry-6*s,cx+rx+6*s,cy+ry+6*s],outline=GOLD+(255,),width=int(3*s))
    d.ellipse([cx-rx+1*s,cy-ry+1*s,cx+rx-1*s,cy+ry-1*s],outline=(150,118,60,255),width=int(2*s))
    # punch out interior
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).ellipse([cx-rx+3*s,cy-ry+3*s,cx+rx-3*s,cy+ry-3*s],fill=255)
    a=np.array(im); a[...,3]=np.where(np.array(m)>0,0,a[...,3]); im=Image.fromarray(a)
    d=ImageDraw.Draw(im)
    # 4 gold rune studs + keystone
    for ang in (0,90,180,270):
        x=cx+(rx+1.5*s)*math.cos(math.radians(ang)); y=cy+(ry+1.5*s)*math.sin(math.radians(ang)); r=4*s
        d.polygon([(x,y-r),(x+r,y),(x,y+r),(x-r,y)],fill=GOLD+(255,),outline=(90,66,30,255))
    kx,ky=cx,cy-ry-4*s
    d.polygon([(kx-9*s,ky-6*s),(kx+9*s,ky-6*s),(kx+6*s,ky+7*s),(kx-6*s,ky+7*s)],fill=GOLD+(255,),outline=(90,66,30,255))
    d.ellipse([kx-3*s,ky-2*s,kx+3*s,ky+4*s],fill=GREEN+(255,))
    # plinth
    d.rounded_rectangle([cx-30*s,h-12*s,cx+30*s,h-3*s],radius=3*s,fill=(42,36,26,255),outline=GOLD+(255,),width=int(2*s))
    return im

def down(im,scale): return im.resize((W*scale,H*scale),Image.LANCZOS)
def frame(s,phase,pulse):
    g=glow_layer(s,phase); a=np.array(g).astype(float); a[...,3]*=pulse; g=Image.fromarray(a.astype(np.uint8))
    out=Image.new('RGBA',g.size); out.alpha_composite(g); out.alpha_composite(base_layer(s)); return out

for scale,suf in ((1,''),(2,'@2x')):
    s=SS*scale
    down(base_layer(s),scale).save(f'portal_base{suf}.png')
    down(glow_layer(s,0),scale).save(f'portal_glow{suf}.png')
    for i in range(4):
        down(frame(s,i/4,0.85+0.15*math.sin(i/4*2*math.pi)),scale).save(f'portal_{i}{suf}.png')
# previews
f1=[Image.open(f'portal_{i}.png') for i in range(4)]; f2=Image.open('portal_0@2x.png')
pv=Image.new('RGBA',(W*4+40+W*2+20,H*2+40),BOARD+(255,))
for i,f in enumerate(f1): pv.alpha_composite(f,(10+i*W,10))
pv.alpha_composite(f2,(30+W*4+10,20)); pv.convert('RGB').save('preview.png')
gif=[]
for i in range(12):
    bg=Image.new('RGBA',(W*2,H*2),BOARD+(255,)); bg.alpha_composite(down(frame(SS*2,i/12,0.85+0.15*math.sin(i/12*2*math.pi)),2)); gif.append(bg.convert('RGB'))
gif[0].save('preview.gif',save_all=True,append_images=gif[1:],duration=83,loop=0)
