"""Generate an original 2.5D diorama, controlled lighting comparison and frame sheets."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from time import perf_counter

import numpy as np
from PIL import Image, ImageDraw

W, H, FPS, SECONDS = 176, 144, 16, 12
FLOWER = (131, 77)
Y, X = np.mgrid[:H, :W]


def smooth(a, b, t):
    u = min(1, max(0, (t - a) / (b - a)))
    return u * u * (3 - 2 * u)


def poly(draw, pts, fill):
    draw.polygon([(round(x), round(y)) for x, y in pts], fill)


def line(draw, pts, fill, width=1):
    draw.line([(round(x), round(y)) for x, y in pts], fill, width)


def oval(draw, cx, cy, rx, ry, color):
    draw.ellipse((round(cx-rx), round(cy-ry), round(cx+rx), round(cy+ry)), color)


def leaf(draw, x, y, dx, dy, width, colors):
    length = math.hypot(dx, dy)
    nx, ny = -dy / length * width, dx / length * width
    tip = x + dx, y + dy
    p = (x + .52 * dx + nx, y + .52 * dy + ny)
    q = (x + .35 * dx - nx, y + .35 * dy - ny)
    poly(draw, [(x, y), p, tip, q], colors[0])
    poly(draw, [(x, y), p, tip], colors[1])
    line(draw, [(x + dx * .13, y + dy * .13), (x + dx * .76, y + dy * .76)], colors[2])


def state(t, gain):
    advance = smooth(1.35, 5.5, t)
    retreat = smooth(9.05, 11.1, t)
    x = 29 + 67 * advance - 18 * retreat
    reach = smooth(4.95, 6.3, t) * (1 - smooth(8.0, 9.4, t))
    bob = math.sin(t * 5.4) * (smooth(1.35, 1.8, t) - smooth(4.9, 5.5, t))
    head = x + 15 + 4 * reach, 90 - 4 * reach + bob
    bulb = head[0] + 6 + 5 * reach, head[1] - 15 + 6 * reach
    power = gain * (.72 + .06 * math.cos(t * 2.7) + .28 * reach)
    irradiance = power / (1 + ((bulb[0]-FLOWER[0])**2 + (bulb[1]-FLOWER[1])**2) / 105)
    return x, head, bulb, power, irradiance, bob, reach


def world(t, cam, sx, base):
    # Beyond the glass: three terrain bands have separate depth and silhouettes.
    for depth, horizon, amplitude, color in [
        (.08, 58, 12, (113,119,143)), (.16, 68, 12, (74,111,126)), (.29, 79, 13, (48,92,103))]:
        pts = [(x, horizon + amplitude * math.sin((x + depth * cam)/32 + depth*22)
                + 4 * math.cos((x + depth * cam)/9)) for x in range(-4,W+5,3)]
        poly(base, pts + [(W,H),(0,H)], color)
    for i in range(5):
        x = i * 58 - 20 - .46 * cam
        line(base, [(x,81),(x,49),(x+20,16),(x+36,-4)], (55,85,99), 2)
        line(base, [(x+1,48),(x+20,18)], (157,153,133))
    line(base, [(0,43),(W,43)], (111,131,136))
    # Ferns and a stone arcade stand between the glass and the front terrace.
    for i in range(9):
        px=i*31-15-.39*cam
        horizon=74+3*math.sin(i*5)
        base.arc((round(px-9),round(horizon-16),round(px+21),round(horizon+8)),182,358,
                 fill=(87,119,120),width=3)
        line(base,[(px+21,horizon-5),(px+21,93)],(82,112,112),4)
        line(base,[(px+20,horizon-5),(px+20,90)],(110,137,129))
    for i in range(17):
        x = ((i * 67) % 219) - 19 - .59 * cam
        high = 83 - 24 * ((i * 73) % 19) / 19
        sway=2*math.sin(t*.57 + i*1.62)
        dx=5*math.cos(i*.9)+sway
        end=(x+dx,high)
        line(base,[(x,100),(x+dx*.33,89),end],(39,84,83),2)
        for n in range(4):
            u=.16+n*.23
            r=(5.4-2.6*u)*(-1 if (n+i)%2 else 1)
            qx=x+dx*u; qy=97+(high-97)*u
            leaf(base,qx,qy,r*1.4,-3-n*.3,1.6,( (51,92,85),(70,108,94),(81,117,102) ))
    # A canopy vine frames the opening without crossing the central event.
    for side in [0,1]:
        root=(7 if side==0 else 175)-.76*cam
        sign=1 if side==0 else -1
        stem=[(root-6*sign,-3),(root+4*sign,9),(root+11*sign,14),(root+17*sign,22)]
        line(base,stem,(45,86,84),2)
        for n in range(7):
            x=root+sign*n*2.2; y=n*2.8
            leaf(base,x,y,(-1 if n%2 else 1)*6,5+n%3,2.2,((46,88,79),(86,119,88),(117,135,99)))
        for n in range(3):
            x=root+sign*(6+n*3.2); y=11+n*3
            line(base,[(x,y),(x+1,y+6)],(78,104,82))
            oval(base,x+1,y+7,1.4,1.8,(173,129,88))
    # Terrace with perspective joints.
    poly(base, [(0,100),(W,94),(W,121),(0,131)], (84,87,78))
    line(base, [(0,100),(W,94)], (144,146,114),2)
    for i in range(-1,11):
        x = i*27 - sx - 1
        line(base, [(x,100),(x-13,123)], (59,66,66))
        line(base, [(x+1,101),(x-3,108)], (120,118,91))
    line(base, [(0,109),(W,103)], (104,105,84), 1)
    line(base, [(0,126),(W,118)], (148,127,93), 2)
    poly(base, [(0,128),(W,120),(W,H),(0,H)], (53,59,61))
    for i in range(11):
        x = i*20 - sx
        line(base, [(x,128-x*.04),(x+2,134),(x+1,142)], (41,49,51))


def night_sky():
    bands=np.array([[28,55,84],[71,104,132],[151,152,157],[229,184,137],[94,124,128]])
    v=np.clip(Y/94*4,0,3.999)
    lo=v.astype(int)
    a=(v-lo)[...,None]
    grain=(((X*17+Y*23+X*Y*3)%7)-3)[...,None]*.65
    return np.uint8(np.clip(bands[lo]*(1-a)+bands[lo+1]*a+grain,0,255))


def lit_color(color, x, y, bulb, power, strength=1):
    dx,dy=x-bulb[0],y-bulb[1]
    k=power*strength/(1+(dx*dx+dy*dy)/145)
    return tuple(min(255,round(c+d*k)) for c,d in zip(color,(118,65,19)))


def shell(image, x, y, bulb, power):
    # A spiral relief perturbs the surface normals before illumination.
    yy,xx=np.mgrid[-19:20,-20:21]
    nx,ny=xx/19,yy/18
    rr=nx*nx+ny*ny
    zz=np.sqrt(np.maximum(0,1-rr))
    phi=np.arctan2(ny,nx)
    spiral=np.sin(17*np.sqrt(rr)-phi*1.65-.8)
    edge=(rr>.87)
    nxp=nx+.13*np.cos(phi)*spiral
    nyp=ny+.13*np.sin(phi)*spiral
    dx,dy=bulb[0]-(x+xx),bulb[1]-(y+yy)
    lightnorm=np.sqrt(dx*dx+dy*dy+14**2)
    lambert=np.maximum(0,(nxp*dx+nyp*dy+zz*14)/lightnorm)
    point=power*lambert/(1+(dx*dx+dy*dy)/460)
    sky=np.maximum(0,-.48*nxp-.7*nyp+.45*zz)
    rgb=np.array([41,58,78])+sky[...,None]*np.array([41,75,69])
    rgb+=np.maximum(spiral-.40,0)[...,None]*np.array([75,45,10])
    rgb+=point[...,None]*np.array([145,88,31])
    rgb[edge]*=.57
    rgba=np.dstack((np.uint8(np.clip(rgb,0,255)),np.uint8((rr<=1)*255)))
    patch=Image.fromarray(rgba)
    image.paste(patch,(round(x)-20,round(y)-19),patch)


def creature(image, sx, t, bulb, power, head, x, bob):
    d=ImageDraw.Draw(image)
    skin=lambda c,ox,oy:lit_color(c,ox,oy,bulb,power,1.15)
    hx,hy=head
    oval(d,x-1,107,21,3,(54,60,59))
    body=[(x-27,103),(x-16,102),(x-6,99),(x+3,92),(hx-8,hy-1),(hx+7,hy),
          (hx+8,hy+7),(x+14,104),(x+6,107),(x-11,107),(x-23,106)]
    poly(d,body,(34,59,65))
    poly(d,[(x-23,103),(x-9,102),(x+9,96),(hx+4,hy+3),(x+12,103),(x-8,105)],
         skin((110,145,115),hx,hy))
    line(d,[(x-22,105),(x-10,106),(x+5,106),(x+12,103)],(181,168,112))
    # Curved foot folds keep the body visibly in contact with stone.
    for j in range(6):
        qx=x-16+j*4
        line(d,[(qx,104),(qx+1,103+(j%2)),(qx+3,104)],(185,175,125))
    # Two connected feelers; the warm bulb belongs to the long one.
    far=(hx+6+math.sin(t)*1.2,hy-12)
    line(d,[(hx+1,hy-1),far],(52,74,75),2);oval(d,*far,2,2,(140,153,114))
    shell(image,x-3,87 + bob*.48,bulb,power)
    d=ImageDraw.Draw(image)
    oval(d,hx,hy,10,8,skin((51,86,86),hx,hy))
    oval(d,hx+1,hy-2,8,6,skin((103,148,123),hx+1,hy-2))
    oval(d,hx+3,hy-3,5,3.8,skin((139,170,132),hx+3,hy-3))
    for ox,oy in [(-4,1),(-2,3),(-1,0),(1,2)]:
        d.point((round(hx+ox),round(hy+oy)),(105,124,92))
    line(d,[(hx+3,hy-5),(hx+5,hy-6),(hx+7,hy-5)],skin((88,106,93),hx+5,hy-5))
    line(d,[(hx+4,hy-5),(hx+9,hy-10),bulb],(50,71,70),3)
    line(d,[(hx+5,hy-6),(hx+9,hy-10),bulb],(171,161,98),1)
    blink=.72 if 4.45<t<4.63 or 9.1<t<9.25 else 2.5
    oval(d,hx+4,hy-2,2.6,blink,(243,223,166))
    oval(d,hx+5,hy-2,1,blink*.75,(22,47,58))
    line(d,[(hx+6,hy+3),(hx+8,hy+2)],(59,80,71))
    oval(d,*bulb,3.3,4.1,lit_color((126,92,53),*bulb,bulb,power))
    oval(d,bulb[0],bulb[1]-1,2.1,2.6,lit_color((136,142,91),*bulb,bulb,power,1.7))
    if power>.4: d.point((round(bulb[0]),round(bulb[1])-2),(255,251,199))


def plant(d, sx, t, opened, bulb, power):
    fx,fy=FLOWER[0]-sx,FLOWER[1]-6*opened
    line(d,[(fx+4,108),(fx+1,92),(fx,fy+2)],(32,67,67),3)
    line(d,[(fx+3,106),(fx,86)],lit_color((105,143,99),fx,90,bulb,power))
    cols=((49,98,86),(74,133,96),(133,163,107))
    leaf(d,fx+1,94,10,-6,3,cols);leaf(d,fx+2,98,-11,-7,3,cols)
    oval(d,fx+4,109,10,3,(48,61,59))
    poly(d,[(fx-5,99),(fx+13,99),(fx+10,109),(fx-2,109)],(117,83,69))
    line(d,[(fx-5,99),(fx+13,99)],lit_color((158,120,83),fx,99,bulb,power),3)
    poly(d,[(fx-4,101),(fx+4,101),(fx+4,108),(fx-2,108)],lit_color((143,97,76),fx-1,104,bulb,power))
    line(d,[(fx-4,102),(fx+12,102)],lit_color((186,138,93),fx+3,102,bulb,power))
    line(d,[(fx-1,106),(fx+1,104),(fx+3,106),(fx+5,104),(fx+7,106)],(176,137,94))
    # Seven petals remain attached to the same receptacle as they unfurl.
    for idx,u in enumerate([-.72,.72,-1,1,-.43,.43,0]):
        spread=(2.5+15*opened)*u
        top=(11.5 - abs(u)*4)*(1-opened) + (5+3*math.sin(idx))*opened
        tip=(fx+spread,fy-top + abs(u)*2*opened)
        color=lit_color((int(132+idx*4+18*opened),int(54+idx*4+27*opened),84+idx*3),tip[0],tip[1],bulb,power)
        crest=lit_color((int(201+idx*3+13*opened),int(98+idx*3+64*opened),int(117+24*opened)),tip[0],tip[1],bulb,power)
        leaf(d,fx,fy,tip[0]-fx,tip[1]-fy,(2.2+opened*1.4), (color,crest,(241,166,125)))
    if opened>.96 and t<10.6:
        # Released pollen starts at the open cup; grains rise on the same breeze as the leaves.
        for index in range(6):
            age=t-(7.58+.29*index)
            if 0<age<1.7:
                qx=fx+9*age+2*math.sin(age*2.7+index)
                qy=fy-1-9*age-2*math.sin(age*1.6)
                oval(d,qx,qy,.7,.75,(238,197,121))
    if opened>.15:
        oval(d,fx,fy-1,1+opened*3,1+opened*1.6,(244,184,94))
        line(d,[(fx-2,fy-1),(fx-1,fy-3),(fx,fy-2),(fx+2,fy-3)],(255,230,139))


def close_leaves(d, cam, t):
    # The near frond crosses the rear of the shell in the first part of the walk.
    base=56-1.55*cam
    line(d,[(base-16,148),(base-9,129),(base-7,112),(base-11,98)],(23,54,61),2)
    cols=((33,65,68),(45,91,82),(71,111,91))
    for i in range(5):
        y=129-i*6
        side=1 if i%2 else -1
        leaf(d,base-9,y,side*(9-i*.9)+math.sin(t+i),-5-i*.55,3.2,cols)
    for k in [0,1]:
        x=6 if k==0 else 171
        for n in range(4):
            leaf(d,x+n*3,146,(-1 if k else 1)*(5+n*2)+math.sin(t*.6+n),-12-n*3,4,cols)


def render(frame, gain, dose, sky, foreground=True):
    t=frame/FPS
    x,hd,bulb,powr,lux,bob,reach=state(t,gain)
    cam=smooth(1,7,t)*9 - smooth(9,11.3,t)*2
    sx=cam
    b=(bulb[0]-sx,bulb[1]);head=(hd[0]-sx,hd[1])
    pillow=Image.fromarray(sky.copy())
    d=ImageDraw.Draw(pillow)
    oval(d,146-.05*cam,27,8,8,(231,204,161));oval(d,146-.05*cam,26,6,6,(240,214,175))
    world(t,cam,sx,d)
    bg=np.asarray(pillow).astype(float)
    # Atmosphere and reflections follow the same world point as the Lambert term.
    dist=(X-b[0])**2+(Y-b[1])**2
    air=powr*np.exp(-dist/123)*.43
    ground=powr*np.exp(-((X-b[0])**2/420+(Y-104)**2/26))*.93
    bg+=((air+ground)[...,None])*np.array([111,68,25])
    im=Image.fromarray(np.uint8(np.clip(bg,0,255)));d=ImageDraw.Draw(im)
    opened=smooth(.20,1.05,dose)
    plant(d,sx,t,opened,b,powr)
    creature(im,sx,t,b,powr,head,x-sx,bob)
    if foreground:
        close_leaves(ImageDraw.Draw(im),cam,t)
    return im, opened, lux


def generate(dest):
    started=perf_counter()
    dest.mkdir(parents=True,exist_ok=True)
    sky=night_sky()
    numbers=[0,43,89,111,145,191]
    report={}
    selected={}
    for label,gain in [('light',1.),('weak',.12)]:
        sequence=[]
        dose=0.
        first=None
        for i in range(FPS*SECONDS):
            lux=state(i/FPS,gain)[4]
            dose+=max(0,lux-.28)/FPS
            img,opened,_=render(i,gain,dose,sky)
            if opened>.99 and first is None: first=i
            if i in numbers: selected[label,i]=img.copy()
            sequence.append(img)
        if label=='light':
            # Carry a single deterministic palette through the film to avoid per-frame quantization shimmer.
            palette_image=Image.new('RGB',(W*3,H*2))
            for idx,n in enumerate(numbers):
                palette_image.paste(sequence[n],(idx%3*W,idx//3*H))
            palette=palette_image.quantize(256)
            quantized=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in sequence]
            times=[int((i+1)*100/FPS)*10-int(i*100/FPS)*10 for i in range(len(sequence))]
            quantized[0].save(dest/'episode.gif',save_all=True,append_images=quantized[1:],duration=times,
                              optimize=False,disposal=1)
        report[label]=dict(final_dose=round(dose,5),first_open_frame=first,final_open=round(opened,5))
    for label in ['light','weak']:
        sheet=Image.new('RGB',(W*3,(H+16)*2),'#18252e')
        for idx,n in enumerate(numbers):
            x,y=idx%3*W,idx//3*(H+16)
            sheet.paste(selected[label,n],(x,y))
            ImageDraw.Draw(sheet).text((x+4,y+H+1),f'{n}  |  {n/FPS:.2f} s',fill='#e7d9c4')
        sheet.save(dest/('sheet.png' if label=='light' else 'control.png'))
    selected['light',145].save(dest/'cover.png')
    # Before any opening compare the same objects and the same pose under a weaker light.
    report['regions_frame_89'] = {}
    rgb=np.asarray(selected['light',89]).astype(int)
    control=np.asarray(selected['weak',89]).astype(int)
    for name,box in [('shell', (78,76,94,90)),('pot',(119,100,128,108)),
                     ('pavement',(101,101,112,108)),('sky',(61,8,78,21))]:
        left,top,right,bottom=box
        delta=(rgb-control)[top:bottom,left:right,:]
        report['regions_frame_89'][name]={'box_xyxy_exclusive':box,
            'mean_red_delta_8bit':round(float(delta[:,:,0].mean()),2)}
    frame=43
    cut,_,_=render(frame,1.,0.,sky,foreground=False)
    t=frame/FPS
    xpos,_,_,_,_,bob,_=state(t,1.)
    campos=smooth(1,7,t)*9 - smooth(9,11.3,t)*2
    shell_mask=((X-(xpos-3-campos))/19)**2+((Y-(87+bob*.48))/18)**2<=1
    delta=(np.asarray(selected['light',frame])!=np.asarray(cut)).any(axis=2)
    report['shell_pixels_changed_by_foreground_at_43']=int((delta & shell_mask).sum())
    report['frames']=FPS*SECONDS
    report['fps']=FPS
    report['wall_seconds']=round(perf_counter()-started,3)
    report['gif_bytes']=(dest/'episode.gif').stat().st_size
    report['cover_rgb_sha256']=hashlib.sha256(selected['light',145].tobytes()).hexdigest()
    with Image.open(dest/'episode.gif') as gif:
        duration=0
        for i in range(gif.n_frames):
            gif.seek(i);duration+=gif.info['duration']
        report['decoded_frames']=gif.n_frames
        report['decoded_duration_ms']=duration
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('out',type=Path)
    generate(parser.parse_args().out)
