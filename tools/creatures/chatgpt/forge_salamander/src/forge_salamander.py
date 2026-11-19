"""Gornila: self-contained procedural rig and complete animated forge picture.

Run: python forge_salamander.py out/
Dependencies: Python 3, Pillow, NumPy. No network or external assets.
Default: all 26 clips, forge scene, showreel, life and ZIP; --stage 1/2: earlier subsets.
Recovered design; no encoded assets. Optional --reference is for comparison only.
"""
from __future__ import annotations
"""Small deterministic orthographic pixel renderer. Only numpy and Pillow.

World: +x right, +y forward, +z up. Native pixels are point samples, never
supersampled. Ellipsoids and tapered capsules are intersected analytically;
planes use a conventional z-buffer. A separate emission image is exposed.
"""
from dataclasses import dataclass, field, replace
import math
import numpy as np
from PIL import Image, ImageDraw

INK = (21, 15, 11)


def unit(v):
    v = np.asarray(v, dtype=float)
    return v / max(float(np.linalg.norm(v)), 1e-12)


def rgb(value):
    if isinstance(value, str):
        return tuple(int(value.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    return tuple(value[:3])


@dataclass
class Material:
    name: str
    tones: tuple
    pattern: str = 'none'
    emission: float = 0.0

    def __post_init__(self):
        if len(self.tones) != 4:
            raise ValueError('Each material has exactly four tones')
        self.palette = np.asarray([rgb(c) for c in self.tones], dtype=np.uint8)


@dataclass
class F:
    origin: np.ndarray = field(default_factory=lambda: np.zeros(3))
    R: np.ndarray = field(default_factory=lambda: np.eye(3))

    def __post_init__(self):
        self.origin = np.asarray(self.origin, dtype=float)
        self.R = np.asarray(self.R, dtype=float)

    @property
    def o(self):
        return self.origin

    def p(self, x=0, y=0, z=0):
        a = np.asarray(x if not np.isscalar(x) else (x,y,z), dtype=float)
        return self.origin + self.R @ a

    def v(self, x=0, y=0, z=0):
        a = np.asarray(x if not np.isscalar(x) else (x,y,z), dtype=float)
        return self.R @ a

    def at(self, x=0, y=0, z=0):
        return F(self.p(x,y,z), self.R.copy())

    def rx(self, degrees):
        a=math.radians(degrees); c=math.cos(a); s=math.sin(a)
        return F(self.origin.copy(), self.R @ np.array([[1,0,0],[0,c,-s],[0,s,c]]))

    def ry(self, degrees):
        a=math.radians(degrees); c=math.cos(a); s=math.sin(a)
        return F(self.origin.copy(), self.R @ np.array([[c,0,s],[0,1,0],[-s,0,c]]))

    def rz(self, degrees):
        a=math.radians(degrees); c=math.cos(a); s=math.sin(a)
        return F(self.origin.copy(), self.R @ np.array([[c,-s,0],[s,c,0],[0,0,1]]))


class Rig:
    def __init__(self):
        self.primitives=[]
        self.tags={}

    @property
    def size(self):
        return len(self.primitives)

    def ell(self, frame, center, radii, mat, group='body'):
        self.primitives.append(dict(kind='ell',frame=frame.at(center),
                                    radii=np.maximum(np.asarray(radii,float),0.04),mat=mat,group=group))
        return self

    def cap(self, p1, p2, r1, r2, mat, group='body'):
        a=np.asarray(p1,float); b=np.asarray(p2,float); delta=b-a
        length=float(np.linalg.norm(delta))
        if length<1e-6:
            return self.ell(F(a), (0,0,0), (r1,r1,r1), mat, group)
        z=delta/length
        guide=np.array([0,0,1.0]) if abs(z[2])<0.9 else np.array([0,1.0,0])
        x=unit(np.cross(guide,z)); y=np.cross(z,x)
        self.primitives.append(dict(kind='cap',frame=F(a,np.column_stack((x,y,z))),
                                    length=length,r1=float(r1),r2=float(r2),mat=mat,group=group))
        return self

    def box(self, frame, center, size, mat, group='body'):
        self.primitives.append(dict(kind='box',frame=frame.at(center),size=np.asarray(size,float),mat=mat,group=group))
        return self

    def poly(self, points, mat, group='body'):
        self.primitives.append(dict(kind='poly',points=np.asarray(points,float),mat=mat,group=group))
        return self

    def line(self, p1, p2, width, mat, group='body'):
        return self.cap(p1,p2,width/2,width/2,mat,group)

    def dot(self, p, r, mat, group='body'):
        return self.ell(F(p),(0,0,0),(r,r,r),mat,group)


class Renderer:
    def __init__(self,width=160,height=128,feet=(77,99),azimuth=35,elevation=35,scale=1):
        self.width=int(width); self.height=int(height); self.feet=tuple(feet); self.scale=float(scale)
        az=math.radians(azimuth); el=math.radians(elevation)
        self.right=np.array([math.cos(az),-math.sin(az),0.0])
        self.up=np.array([-math.sin(az)*math.sin(el),-math.cos(az)*math.sin(el),math.cos(el)])
        self.view=np.array([math.sin(az)*math.cos(el),math.cos(az)*math.cos(el),math.sin(el)])
        self.light=unit(-0.70*self.right+0.65*self.up+1.65*self.view)
        self.rim=unit(0.9*self.right-0.15*self.up+0.25*self.view)
        yy,xx=np.mgrid[0:self.height,0:self.width]
        self.raybase=((xx-self.feet[0])/self.scale)[...,None]*self.right+((self.feet[1]-yy)/self.scale)[...,None]*self.up

    def project(self,p):
        p=np.asarray(p,float)
        return np.stack([self.feet[0]+p@self.right*self.scale,
                         self.feet[1]-p@self.up*self.scale,p@self.view],axis=-1)

    def _bounds(self,x0,y0,x1,y1):
        a=max(0,int(math.floor(x0))); b=max(0,int(math.floor(y0)))
        c=min(self.width,int(math.ceil(x1))+1); d=min(self.height,int(math.ceil(y1))+1)
        if a>=c or b>=d: return None
        return a,b,c,d

    def _colors(self,mat,n,q):
        """Four exact palette values; texels are tied to object coordinates."""
        light=np.maximum(0,np.sum(n*self.light,axis=-1))
        light=0.27+0.73*light
        # A quiet rim keeps a dark material legible without adding extra tones.
        rim=np.maximum(0,np.sum(n*self.rim,axis=-1))
        grazing=1-np.maximum(0,np.sum(n*self.view,axis=-1))
        light=np.maximum(light,0.31*((rim>0.78)&(grazing>0.55)))
        level=np.digitize(light,[0.30,0.44,0.82]).astype(np.int8)
        x,y,z=q[...,0],q[...,1],q[...,2]
        pat=mat.pattern
        # Hash cell indices, never the screen and never an animation frame.
        def hashed(a,b,c):
            return np.mod(np.sin(a*127.1+b*311.7+c*74.7)*43758.5453,1.0)
        if pat=='skin':
            # Designed-size scale clusters: broad two-pixel steps, not pepper.
            # Every scale has a coherent lower shade and small upper glint.
            row=np.floor(z/3.2); col=np.floor((x+row%2*1.8)/3.6)
            hx=np.mod(x+row%2*1.8,3.6)/3.6
            hz=np.mod(z,3.2)/3.2
            h=hashed(col,np.floor(y/3.6),row)
            pebble=((hx-.49)**2/0.19+(hz-.5)**2/0.17)<0.85
            lower=pebble&(hz>.59)&(h>.45)
            upper=pebble&(hz<.34)&(h>.64)&(light>.45)
            level-=lower.astype(np.int8)
            level+=upper.astype(np.int8)
        elif pat=='leather':
            h=hashed(np.floor(x*1.1),np.floor(y*.9),np.floor(z*1.2))
            grain=(h>.87)&(light>.25)
            level-=grain.astype(np.int8)
            scuff=(np.sin(x*1.15+z*.38)>.94)&(np.sin(z*.95-y*.4)>.7)&(light>.49)
            level+=scuff.astype(np.int8)
            worn=(np.sin(x*.42+z*.17)*np.sin(z*.44-y*.36)>.64)&(light>.40)
            level+=worn.astype(np.int8)
            fold=(np.abs(np.sin(y*.58+z*.34+.55*np.sin(x*.46)))<.16)&(light>.3)
            level-=fold.astype(np.int8)
        elif pat=='steel':
            h=hashed(np.floor(x*.65),np.floor(y*.65),np.floor(z*.85))
            scratch=(np.mod(x*.55+z*1.55,8)<.27)&(h>.3)
            level+=scratch.astype(np.int8)
            level-=((h>.94)&(light<.7)).astype(np.int8)
            spec=np.sum(n*unit(self.light+self.view),axis=-1)
            level=np.where(spec>.97,3,level)
            grind=np.mod(x*.68+y*.35+z*.37,6.5)<.44
            level-=grind.astype(np.int8)
        elif pat=='brass':
            spec=np.sum(n*unit(self.light+self.view),axis=-1)
            level=np.where(spec>.94,3,level)
            level-=((np.mod(x*1.2+z*.6,9)<.35)&(light<.6)).astype(np.int8)
        elif pat=='bone':
            level+=((np.mod(x*.9+z*.4,5)<.55)&(light>.5)).astype(np.int8)
        elif pat=='dark':
            h=hashed(np.floor(x/2),np.floor(y/2),np.floor(z/2))
            level-=((h>.92)&(light<.75)).astype(np.int8)
        elif pat=='wood':
            grain=np.sin(x*2.4+np.sin(z*.24+y*.6)*1.5)
            level-=(grain>.89).astype(np.int8)
            level+=((grain<-.96)&(light>.45)).astype(np.int8)
        elif pat=='cloth':
            level-=(((np.floor(x)+np.floor(z))%5==0)&(light<.7)).astype(np.int8)
        elif pat=='ember':
            level=np.maximum(level,2)
            level+=((np.sin(x*1.8+z*.9)>.55)&(np.cos(y*2-z*.5)>.1)).astype(np.int8)
        if mat.emission>0:
            level=np.maximum(level,2)
        level=np.clip(level,0,3)
        colors=mat.palette[level]
        # Optional second pigment uses its OWN four-tone palette. Its boundaries
        # are a stable volumetric texture, so markings turn with each bone.
        if hasattr(mat,'pigment_palette'):
            if hasattr(mat,'spot_centers'):
                pigment=np.zeros(x.shape,dtype=bool)
                for center,radius in zip(mat.spot_centers,mat.spot_radii):
                    delta=q-center
                    pigment|=np.sum(delta*delta,axis=-1)<radius*radius
            else:
                islands=np.sin(x*.43+np.sin(z*.22)*.78)+np.cos(z*.47+y*.23)+.32*np.sin(y*.49-x*.19)
                pigment=islands>.98
            colors=np.where(pigment[...,None],mat.pigment_palette[level],colors)
        return colors

    def _paint(self,bounds,depth,normal,q,mask,mat,gid,pid):
        a,b,c,d=bounds
        z=self.depth[b:d,a:c]
        hit=mask&(depth>z+1e-5)
        if not np.any(hit): return
        colors=self._colors(mat,normal,q)
        z[hit]=depth[hit]
        self.color[b:d,a:c][hit]=colors[hit]
        self.group[b:d,a:c][hit]=gid
        self.part[b:d,a:c][hit]=pid
        self.material[b:d,a:c][hit]=self.mat_ids[mat.name]
        self.normals[b:d,a:c][hit]=normal[hit]
        self.emission[b:d,a:c][hit]=float(mat.emission)

    def _ell(self,p,gid,pid):
        f=p['frame']; r=p['radii']; center=f.origin
        pr=self.project(center)
        ex=np.linalg.norm((self.right@f.R)*r)*self.scale
        ey=np.linalg.norm((self.up@f.R)*r)*self.scale
        bounds=self._bounds(pr[0]-ex,pr[1]-ey,pr[0]+ex,pr[1]+ey)
        if bounds is None:return
        a,b,c,d=bounds
        q0=(self.raybase[b:d,a:c]-center)@f.R
        direction=self.view@f.R
        o=q0/r; v=direction/r
        A=float(v@v); B=np.sum(o*v,axis=-1); C=np.sum(o*o,axis=-1)-1
        disc=B*B-A*C; mask=disc>=0
        depth=(-B+np.sqrt(np.maximum(disc,0)))/A
        q=q0+depth[...,None]*direction
        n=(q/(r*r))@f.R.T
        n/=np.maximum(np.linalg.norm(n,axis=-1,keepdims=True),1e-12)
        self._paint(bounds,depth,n,q,mask,p['mat'],gid,pid)

    def _cap(self,p,gid,pid):
        f=p['frame']; L=p['length']; r1=p['r1']; r2=p['r2']
        ends=self.project(np.array([f.origin,f.p(0,0,L)])); r=max(r1,r2)*self.scale
        bounds=self._bounds(np.min(ends[:,0])-r,np.min(ends[:,1])-r,
                            np.max(ends[:,0])+r,np.max(ends[:,1])+r)
        if bounds is None:return
        a,b,c,d=bounds
        o=(self.raybase[b:d,a:c]-f.origin)@f.R; v=self.view@f.R
        k=(r2-r1)/L; R=r1+k*o[...,2]
        A=v[0]**2+v[1]**2-(k*v[2])**2
        B=o[...,0]*v[0]+o[...,1]*v[1]-R*k*v[2]
        C=o[...,0]**2+o[...,1]**2-R**2
        disc=B*B-A*C
        depth=np.full(o.shape[:2],-1e9); nlocal=np.zeros_like(o)
        if abs(A)>1e-9:
            for sign in (1,-1):
                t=(-B+sign*np.sqrt(np.maximum(disc,0)))/A
                q=o+t[...,None]*v
                valid=(disc>=0)&(q[...,2]>=0)&(q[...,2]<=L)&(t>depth)
                normal=np.stack([q[...,0],q[...,1],-k*(r1+k*q[...,2])],axis=-1)
                depth[valid]=t[valid];nlocal[valid]=normal[valid]
        for zz,rr in ((0,r1),(L,r2)):
            oo=o-np.array([0,0,zz]); BB=np.sum(oo*v,axis=-1)
            CC=np.sum(oo*oo,axis=-1)-rr*rr; dd=BB*BB-CC
            t=-BB+np.sqrt(np.maximum(dd,0)); valid=(dd>=0)&(t>depth)
            q=oo+t[...,None]*v
            depth[valid]=t[valid];nlocal[valid]=q[valid]
        mask=depth>-1e8
        q=o+depth[...,None]*v
        n=nlocal@f.R.T;n/=np.maximum(np.linalg.norm(n,axis=-1,keepdims=True),1e-12)
        self._paint(bounds,depth,n,q,mask,p['mat'],gid,pid)

    def _triangle(self,world,local,mat,gid,pid):
        pp=self.project(world)
        bounds=self._bounds(np.min(pp[:,0]),np.min(pp[:,1]),np.max(pp[:,0]),np.max(pp[:,1]))
        if bounds is None:return
        n=np.cross(world[1]-world[0],world[2]-world[0]);norm=float(np.linalg.norm(n))
        if norm<1e-8:return
        n/=norm
        if n@self.view<0:n=-n
        a,b,c,d=bounds;yy,xx=np.mgrid[b:d,a:c]
        x0,y0=pp[0,:2];x1,y1=pp[1,:2];x2,y2=pp[2,:2]
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<1e-8:return
        w0=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/den
        w1=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/den
        w2=1-w0-w1;mask=(w0>=-1e-8)&(w1>=-1e-8)&(w2>=-1e-8)
        weights=np.stack([w0,w1,w2],axis=-1)
        depth=weights@pp[:,2];q=weights@local
        normal=np.broadcast_to(n,q.shape)
        self._paint(bounds,depth,normal,q,mask,mat,gid,pid)

    def _poly(self,points,mat,gid,pid,local=None):
        points=np.asarray(points,float)
        if len(points)<3:return
        if local is None:
            # A stable local planar frame anchors scuffs to the mesh.
            e1=unit(points[1]-points[0]);e3=unit(np.cross(e1,points[2]-points[0]));e2=np.cross(e3,e1)
            local=(points-points[0])@np.column_stack((e1,e2,e3))
        for i in range(1,len(points)-1):
            ix=[0,i,i+1]
            self._triangle(points[ix],local[ix],mat,gid,pid)

    def _box(self,p,gid,pid):
        f=p['frame'];s=p['size']/2
        q=np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
                    [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],float)*s
        world=q@f.R.T+f.origin
        faces=((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7))
        for ix in faces:
            ix=list(ix);v=world[ix];n=np.cross(v[1]-v[0],v[2]-v[0])
            if n@self.view<=0:continue
            self._poly(v,p['mat'],gid,pid,q[ix])

    @staticmethod
    def _shift(a,dy,dx,fill):
        out=np.full_like(a,fill)
        ys=slice(max(0,dy),a.shape[0]+min(0,dy)); xs=slice(max(0,dx),a.shape[1]+min(0,dx))
        sy=slice(max(0,-dy),a.shape[0]-max(0,dy));sx=slice(max(0,-dx),a.shape[1]-max(0,dx))
        out[ys,xs]=a[sy,sx]
        return out

    def render(self,rig,shadow=True,shadow_radius=(24,7),shadow_alpha=65,internal_lines=True):
        h,w=self.height,self.width
        self.depth=np.full((h,w),-1e9);self.group=np.full((h,w),-1,dtype=np.int16)
        self.part=np.full((h,w),-1,dtype=np.int32);self.material=np.full((h,w),-1,dtype=np.int16)
        self.color=np.zeros((h,w,3),dtype=np.uint8);self.normals=np.zeros((h,w,3),dtype=float)
        self.emission=np.zeros((h,w),dtype=float)
        self.group_names=list(dict.fromkeys(p['group'] for p in rig.primitives))
        gids={n:i for i,n in enumerate(self.group_names)}
        self.mat_ids={n:i for i,n in enumerate(dict.fromkeys(p['mat'].name for p in rig.primitives))}
        for pid,p in enumerate(rig.primitives):
            gid=gids[p['group']]
            if p['kind']=='ell':self._ell(p,gid,pid)
            elif p['kind']=='cap':self._cap(p,gid,pid)
            elif p['kind']=='box':self._box(p,gid,pid)
            elif p['kind']=='poly':self._poly(p['points'],p['mat'],gid,pid)
        occupied=self.group>=0
        border=np.zeros((h,w),bool);inside=np.zeros((h,w),bool)
        for dy,dx in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)):
            neighbor=self._shift(occupied,dy,dx,False)
            border|=(~occupied)&neighbor
            if internal_lines and abs(dx)+abs(dy)==1:
                nz=self._shift(self.depth,dy,dx,-1e9);ng=self._shift(self.group,dy,dx,-1)
                # Draw the line on the occluded side of a real depth jump.
                inside|=occupied&neighbor&(ng!=self.group)&((nz-self.depth)>2.8)
        canvas=Image.new('RGBA',(w,h),(0,0,0,0))
        if shadow:
            d=ImageDraw.Draw(canvas);cx,cy=self.feet;rx,ry=shadow_radius
            d.ellipse((round(cx-rx),round(cy-ry),round(cx+rx),round(cy+ry)),fill=INK+(int(shadow_alpha),))
            d.ellipse((round(cx-rx*.68),round(cy-ry*.68),round(cx+rx*.68),round(cy+ry*.68)),fill=INK+(min(100,int(shadow_alpha*1.32)),))
        out=np.asarray(canvas).copy()
        out[occupied,:3]=self.color[occupied];out[occupied,3]=255
        out[border,:3]=INK;out[border,3]=255
        out[inside,:3]=INK
        # An exact, independent emissive mask. No diffusion or soft image filter.
        lit=np.zeros((h,w,4),np.uint8);glowing=occupied&(self.emission>0)
        lit[glowing,:3]=self.color[glowing]
        lit[glowing,3]=np.minimum(255,self.emission[glowing]*255).astype(np.uint8)
        self.lit=Image.fromarray(lit,'RGBA')
        self.body_mask=Image.fromarray((occupied|border).astype(np.uint8)*255,'L')
        self.stats={'primitives':rig.size,'visible_pixels':int(occupied.sum()),
                    'outline_pixels':int(border.sum()+inside.sum()),'groups':len(gids),
                    'materials':len(self.mat_ids),'lit_pixels':int(glowing.sum())}
        return Image.fromarray(out,'RGBA')



"""Articulated-frame smith props for Gornila; no raster-space drawing."""


def _pick(materials, key, tones, pattern='none', emission=0):
    return materials.get(key) or Material(key, tones, pattern, emission)


def _prop_mats(materials):
    return {
        'steel': _pick(materials,'steel',('#302b35','#55505b','#878089','#c2bbc0'),'steel'),
        'steel_light': _pick(materials,'steel_light',('#55535d','#85838d','#b8b5bb','#ece4d5'),'steel'),
        'brass': _pick(materials,'brass',('#58381f','#9b632c','#d49c4e','#f3cc76'),'brass'),
        'dark': _pick(materials,'dark',('#17171c','#29252c','#3d343a','#57434a'),'dark'),
        'wood': _pick(materials,'wood',('#493022','#7e502a','#ae753c','#d4a35d'),'wood'),
        'leather': _pick(materials,'leather',('#2a1e1b','#4d3026','#734b34','#a0754d'),'leather'),
        'leather_edge': _pick(materials,'leather_edge',('#533925','#805533','#b0824b','#d4b078'),'leather'),
        'ember': _pick(materials,'ember',('#7a251e','#c65225','#f7a143','#ffdf89'),'ember',1),
        'stone': _pick(materials,'stone',('#272630','#46404a','#66575a','#8c7670'),'dark'),
        'coal_crust': _pick(materials,'skin_clean',('#6b2c24','#a74429','#d66b34','#f29a50'),'skin'),
    }


def _poly(rig, frame, points, mat, group):
    rig.poly([frame.p(p) for p in points],mat,group)


def _line(rig,frame,points,width,mat,group):
    for a,b in zip(points,points[1:]):
        rig.line(frame.p(a),frame.p(b),width,mat,group)


def _oct_yz(w,h,bevel):
    return [(-w+bevel,-h),(w-bevel,-h),(w,-h+bevel),(w,h-bevel),
            (w-bevel,h),(-w+bevel,h),(-w,h-bevel),(-w,-h+bevel)]


def draw_hammer(rig,H,materials):
    """H origin is the right hand's grip; shaft follows local +Z.

    Head: x±9, y±4.5, z17…27. Returned hammerFace is the lowest head
    surface in this neutral frame and can be used as the exact contact goal.
    """
    m=_prop_mats(materials);start=rig.size
    rig.cap(H.p(0,0,-12),H.p(0,0,22),1.45,1.6,m['wood'],'hammer_shaft')
    # Leather binding remains under the palm and continues below it.
    rig.cap(H.p(0,0,-9.8),H.p(0,0,3),1.8,1.7,m['leather'],'hammer_grip')
    for z in (-8,-5,-2,1):
        _line(rig,H,[(-1.7,.65,z-1.3),(.1,1.85,z),
                     (1.7,.5,z+1.1)],.58,m['leather_edge'],'hammer_grip')
    # One stable longitudinal grain on the exposed wood; no moving noise.
    _line(rig,H,[(.6,1.52,5),(.35,1.58,10),(.7,1.62,16)],.42,m['leather_edge'],'hammer_shaft')
    # Long middle section plus bevelled striking faces, 26 actual 3D planes.
    outer=_oct_yz(4.5,5,1.1);inner=_oct_yz(3.55,4.05,.85)
    for i in range(8):
        j=(i+1)%8
        _poly(rig,H,[(-7.7,outer[i][0],22+outer[i][1]),
                     (7.7,outer[i][0],22+outer[i][1]),
                     (7.7,outer[j][0],22+outer[j][1]),
                     (-7.7,outer[j][0],22+outer[j][1])],m['steel'],'hammer_head')
        for side in (-1,1):
            _poly(rig,H,[(side*7.7,outer[i][0],22+outer[i][1]),
                         (side*9,inner[i][0],22+inner[i][1]),
                         (side*9,inner[j][0],22+inner[j][1]),
                         (side*7.7,outer[j][0],22+outer[j][1])],m['steel_light'],'hammer_head')
    for side in (-1,1):
        _poly(rig,H,[(side*9,y,22+z) for y,z in inner],m['steel_light'],'hammer_face')
    # Bronze centre strap is a coherent metal wrap around all four sides.
    rig.box(H,(0,0,22),(2.6,9.7,10.7),m['brass'],'hammer_band')
    for side in (-1,1):
        for z in (18.6,25.3):
            rig.ell(H,(0,side*5.04,z),(.59,.32,.59),m['brass'],'hammer_rivet')
    rig.ell(H,(0,0,27.55),(.77,.77,.38),m['brass'],'hammer_rivet')
    # A small warm seam on each face has a dark neighbouring scored line.
    # The marks stay in the tool's coordinates in every view and animation.
    for side in (-1,1):
        yy=side*4.56
        _line(rig,H,[(2.3,yy,19.3),(4.9,yy,20.8),(6.4,yy,23.8)],.55,m['ember'],'hammer_heat')
        _line(rig,H,[(4.9,yy,20.8),(6.9,yy,20.1)],.45,m['ember'],'hammer_heat')
        _line(rig,H,[(-6.4,yy,23.5),(-4.7,yy,21.5)],.5,m['dark'],'hammer_score')
    # One worn top nick gives a readable asymmetry at native scale.
    _line(rig,H,[(-5.7,-1.5,27.03),(-4.2,.2,27.03)],.65,m['steel_light'],'hammer_score')
    return {
        'hammerGripR':H.p(0,0,0),
        'hammerGripL':H.p(0,0,-7),
        'hammerFace':H.p(-9,0,22),
        'hammerPalmFace':H.p(-4.5,0,17),
        'hammerStrikingEnd':H.p(-9,0,22),
        'hammerTop':H.p(0,0,27.6),
        'hammerHead':H.p(0,0,22),
        'hammerPrimitiveCount':rig.size-start,
    }


def draw_anvil(rig,A,materials,coal_positions=None,coal_heat=None):
    """A origin is the floor under a 19×16 basalt carry pedestal.

    Work plane z31; horn points +X and reaches x18. Body starts x−9,
    so the widest span including the horn is 27 world units.
    """
    m=_prop_mats(materials);start=rig.size
    # An eight-sided block, with irregular stones represented by relief seams.
    plan=[(-7,-8),(7,-8),(9.5,-5.5),(9.5,5.5),(7,8),(-7,8),(-9.5,5.5),(-9.5,-5.5)]
    top=[(x*.94,y*.94,10) for x,y in plan]
    bottom=[(x,y,0) for x,y in plan]
    _poly(rig,A,top,m['stone'],'anvil_pedestal')
    for i in range(8):
        j=(i+1)%8
        _poly(rig,A,[bottom[i],bottom[j],top[j],top[i]],m['stone'],'anvil_pedestal')
    # Stone seams have irregular heights rather than brick rows.
    for side in (1,):
        yy=side*7.82
        _line(rig,A,[(-6.2,yy,5.5),(-3.4,yy,4.4),(-.3,yy,5.7),
                     (3,yy,4.9),(6.2,yy,5.7)],.55,m['dark'],'anvil_stone_seam')
        _line(rig,A,[(-3.4,yy,4.4),(-2.8,yy,.8)],.5,m['dark'],'anvil_stone_seam')
        _line(rig,A,[(3,yy,4.9),(3.4,yy,9.2)],.5,m['dark'],'anvil_stone_seam')
    # Classic forged silhouette. Each tapered band has convex quad faces;
    # the concave outline is never sent to a triangle-fan rasterizer.
    rings=[(11,9,5.7),(14,8.8,5.4),(18,4.2,3.5),
           (22,4.5,3.5),(27,8.5,4.8),(31,9,4.9)]
    for lower,upper in zip(rings,rings[1:]):
        z0,x0,y0=lower;z1,x1,y1=upper
        bot=[(-x0,-y0,z0),(x0,-y0,z0),(x0,y0,z0),(-x0,y0,z0)]
        top_ring=[(-x1,-y1,z1),(x1,-y1,z1),(x1,y1,z1),(-x1,y1,z1)]
        for i in range(4):
            j=(i+1)%4
            _poly(rig,A,[bot[i],bot[j],top_ring[j],top_ring[i]],m['steel'],'anvil_body')
    # Forged horn: three differently sized rectangular cross-sections,
    # triangulated side facets make it point outward instead of being a blob.
    sections=[(7.8,4.1,26.6,30.6),(12.6,2.8,27.8,30.3),(18,.55,29,29.8)]
    for s0,s1 in zip(sections,sections[1:]):
        x0,w0,b0,t0=s0;x1,w1,b1,t1=s1
        for side in (-1,1):
            _poly(rig,A,[(x0,side*w0,b0),(x1,side*w1,b1),
                         (x1,side*w1,t1),(x0,side*w0,t0)],m['steel'],'anvil_horn')
        _poly(rig,A,[(x0,-w0,t0),(x1,-w1,t1),(x1,w1,t1),(x0,w0,t0)],m['steel_light'],'anvil_horn')
        _poly(rig,A,[(x0,-w0,b0),(x1,-w1,b1),(x1,w1,b1),(x0,w0,b0)],m['steel'],'anvil_horn')
    # Work plane and its worn bright front edge.
    _poly(rig,A,[(-8.6,-4.5,31.05),(7.9,-4.5,31.05),(7.9,4.5,31.05),(-8.6,4.5,31.05)],m['steel_light'],'anvil_top')
    _line(rig,A,[(-8.5,4.94,30.5),(7.7,4.94,30.5)],.65,m['steel_light'],'anvil_edge')
    # Hardy hole is a dark inset plane, surrounded by actual metal.
    _poly(rig,A,[(-4.5,-1.7,31.13),(-2.6,-1.7,31.13),(-2.6,.2,31.13),(-4.5,.2,31.13)],m['dark'],'anvil_hardy')
    rig.ell(A,(1.1,1.5,31.13),(1.0,.8,.11),m['dark'],'anvil_dent')
    rig.ell(A,(4,-1.1,31.12),(.65,.6,.1),m['steel'],'anvil_dent')
    # A modest engraved V on each shoulder, never an unrelated drawn decal.
    for side in (1,):
        yy=side*5.03
        _line(rig,A,[(-5.8,yy,27.8),(-.4,yy,24.9),(5.3,yy,27.8)],.85,m['brass'],'anvil_engraving')
    # Two front U-rings carry the pedestal; rear crossbar is the harness hook.
    for side in (1,):
        yy=side*8.15
        for xx in (-6.1,6.1):
            rig.box(A,(xx,side*7.72,7.3),(2,1.0,2),m['brass'],'anvil_ring_mount')
            _line(rig,A,[(xx-1.15,yy,7.1),(xx-1.15,yy,3.2),
                         (xx+1.15,yy,3.2),(xx+1.15,yy,7.1)],.85,m['brass'],'anvil_ring')
    _line(rig,A,[(-5,-7.85,7),(5,-7.85,7)],1.0,m['brass'],'anvil_harness_bar')
    rig.box(A,(0,-7.5,6.8),(2.5,1.4,3),m['leather'],'anvil_harness_mount')
    # Front charcoal pocket and three separate, glowing coals with dark crust.
    rig.box(A,(0,6.1,10.2),(7.8,3.8,3),m['dark'],'anvil_coal_pocket')
    for index,(xx,yy,zz,rr) in enumerate([(-2.45,6.55,11.7,1.45),(0,6.8,12,1.60),(2.4,6.45,11.7,1.40)]):
        C=A.at(xx,yy,zz) if coal_positions is None else F(np.asarray(coal_positions[index],float),A.R)
        heat=1. if coal_heat is None else float(np.clip(coal_heat[index],0.,1.))
        crust,hot=m['coal_crust'],m['ember']
        if heat<.75:
            level=0 if heat<.2 else 1 if heat<.45 else 2
            palettes=(('#2b2024','#48302a','#6e372b','#91442b'),
                      ('#4c251f','#8f3525','#b95126','#d97331'),
                      ('#7a2b20','#c94e26','#f58d38','#ffc36a'))
            hot=Material('cooling_coal_core',palettes[level],'ember',(0.,.12,.45)[level])
            crust=Material('cooling_coal_crust',palettes[max(0,level-1)],'dark')
        rig.ell(C,(0,0,0),(rr,rr*.87,rr),crust,'anvil_coal')
        rig.ell(C,(0,.4,.25),(rr*.71,rr*.69,rr*.73),hot,'anvil_ember')
        rig.tags['coal'+str(index)]=C.o
    return {
        'anvilTop':A.p(0,0,31.05),
        'anvilStrike':A.p(2,1,31.05),
        'coalPocket':A.p(0,6.8,12),
        'anvilCarry':A.p(0,-4,16),
        'anvilHandleR':A.p(-6.1,8.15,5.1),
        'anvilHandleL':A.p(6.1,8.15,5.1),
        'anvilHarnessR':A.p(-5,-7.85,7),
        'anvilHarnessL':A.p(5,-7.85,7),
        'anvilPrimitiveCount':rig.size-start,
    }



"""Gornila's original articulated model; all detail exists in three dimensions."""
from dataclasses import dataclass, field

M = {
    'skin':Material('terracotta_skin',('#6b2c24','#a74429','#d66b34','#f29a50'),'skin'),
    'skin_clean':Material('face_skin',('#6b2c24','#a74429','#d66b34','#f29a50'),'skin'),
    'belly':Material('ochre_throat',('#845035','#b8814d','#ddb176','#f2d19a'),'skin'),
    'spots':Material('charcoal_pigment',('#222432','#34303e','#4b3a47','#644956'),'dark'),
    'leather':Material('apron_leather',('#302322','#50352d','#77503b','#a77951'),'leather'),
    'leather_edge':Material('leather_cut_edge',('#4f3328','#78523b','#ad8158','#d9ac71'),'leather'),
    'steel':Material('forged_iron',('#242b33','#3d4756','#687787','#9ba8ad'),'steel'),
    'steel_light':Material('polished_steel',('#454955','#747c8c','#a4aab5','#d5d3ce'),'steel'),
    'brass':Material('brass_hardware',('#64432a','#9c6d3b','#d3a25b','#f0d69a'),'brass'),
    'dark':Material('recess',('#150f0b','#251c18','#39281e','#51372a'),'dark'),
    'wood':Material('hammer_wood',('#503427','#795036','#af7b48','#d5a565'),'wood'),
    'ember':Material('ember_light',('#a63e21','#ed7627','#ffbd55','#fff0aa'),'ember',0.9),
    'bone':Material('blunt_claws',('#665747','#9a8767','#d0b991','#efe0b6'),'bone'),
    'cloth':Material('linen',('#8c694d','#ba956d','#e0c392','#fae6b9'),'cloth'),
    'stone':Material('basalt',('#29282b','#423b40','#61524d','#827066'),'dark'),
    'eye':Material('amber_iris',('#76351b','#bc6d20','#edab3d','#ffe2a1'),'brass'),
    'pupil':Material('eye_ink',('#150f0b','#1b1411','#211915','#2b211b'),'none'),
}
M['skin'].pigment_palette=M['spots'].palette


def patterned_skin(base,centers,radii):
    m=Material(base.name,base.tones,base.pattern)
    m.pigment_palette=M['spots'].palette
    m.spot_centers=np.asarray(centers,float)
    m.spot_radii=np.asarray(radii,float)
    return m


def frame_between(a,b):
    a=np.asarray(a,float); b=np.asarray(b,float)
    z=unit(b-a); guide=np.array([0,1.,0])
    if abs(guide@z)>.92:guide=np.array([1.,0,0])
    x=unit(np.cross(guide,z)); y=np.cross(z,x)
    return F((a+b)*.5,np.column_stack((x,y,z)))


def limb(r,a,b,width,depth,mat,group):
    f=frame_between(a,b)
    length=np.linalg.norm(np.asarray(b)-a)
    r.ell(f,(0,0,0),(width,depth,length*.56),mat,group)
    return f


def two_bone_ik(shoulder,wrist,pole,upper=17.0,forearm=14.5):
    """Fixed-length two-bone chain. The wrist is locked to the tool grip."""
    shoulder=np.asarray(shoulder,float);wrist=np.asarray(wrist,float)
    delta=wrist-shoulder;distance=float(np.linalg.norm(delta))
    if distance>upper+forearm+1e-6 or distance<abs(upper-forearm)-1e-6:
        raise ValueError('Unreachable wrist: adjust the body/tool pose, not bone length')
    axis=unit(delta)
    hint=np.asarray(pole,float)-shoulder
    direction=hint-axis*np.dot(hint,axis)
    if np.linalg.norm(direction)<1e-7:direction=np.cross(axis,[0,1,0])
    direction=unit(direction)
    along=(upper*upper-forearm*forearm+distance*distance)/(2*max(distance,1e-8))
    height=math.sqrt(max(0,upper*upper-along*along))
    return shoulder+axis*along+direction*height


def polyline(r,points,width,mat,group):
    for a,b in zip(points,points[1:]):r.line(a,b,width,mat,group)


def seam(r,points,mat=None,width=.78,spacing=2.55,group='apron'):
    mat=mat or M['leather_edge']
    for a,b in zip(points,points[1:]):
        a=np.array(a,float); b=np.array(b,float); d=b-a; length=np.linalg.norm(d)
        count=max(1,int(length/spacing))
        for j in range(count):
            u=(j+.18)/count; v=min((j+.62)/count,.99)
            r.line(a+u*d,a+v*d,width,mat,group)


def buckle(r,f,width=4.0,height=4.4,group='hardware'):
    w=width/2; h=height/2
    r.box(f,(0,-.3,0),(width+.6,.8,height+.6),M['dark'],group)
    for a,b in [((-w,.3,-h),(-w,.3,h)),((w,.3,-h),(w,.3,h)),((-w,.3,h),(w,.3,h)),((-w,.3,-h),(w,.3,-h))]:
        r.line(f.p(a),f.p(b),.75,M['brass'],group)
    r.line(f.p(-.3,.65,0),f.p(w,.65,0),.55,M['brass'],group)


def strap(r,points,width=3.3,group='harness',stitches=True):
    pts=np.asarray(points,float)
    for a,b in zip(pts,pts[1:]):
        axis=unit(b-a); across=unit(np.cross(axis,np.array([0.,1.,0.])))
        if np.linalg.norm(across)<.01:across=np.array([1.,0,0])
        w=across*width/2
        r.poly([a-w,a+w,b+w,b-w],M['leather'],group)
        r.line(a-w,b-w,.58,M['leather_edge'],group)
        r.line(a+w,b+w,.58,M['leather_edge'],group)
        if stitches:
            offset=np.array([0,.16 if a[1]+b[1]>0 else -.16,0])
            seam(r,[a-w*.65+offset,b-w*.65+offset],width=.40,spacing=3.0,group=group)


def ell_patch(r,f,center,radii,theta,phi,size,group='skin'):
    """Pigment patch sits on the actual ellipsoid, not in screen space."""
    # Parametric surface directions theta longitude, phi latitude, in radians.
    center=np.array(center,float); radii=np.array(radii,float)
    def p(t,p):return center+radii*np.array([math.cos(p)*math.sin(t),math.cos(p)*math.cos(t),math.sin(p)])
    q=p(theta,phi)
    normal=unit((q-center)/(radii*radii))
    tx=unit(p(theta+.001,phi)-q); tz=unit(np.cross(tx,normal))
    # Eight uneven points follow surface curvature and retain the four-tone skin pattern.
    points=[]
    for j in range(10):
        a=math.tau*j/10; rr=size*(1+.12*math.sin(j*4.1+theta))
        q1=q+rr*(math.cos(a)*tx+math.sin(a)*tz)
        ellq=(q1-center)/radii; ellq/=np.linalg.norm(ellq)
        points.append(f.p(center+radii*ellq+normal*.10))
    # Slightly curved triangular fan avoids a large planar sticker.
    c=f.p(q+normal*.14)
    for a,b in zip(points,points[1:]+points[:1]):r.poly([c,a,b],M['spots'],group)


def skin_pebbles(r,f,center,radii,placements,group='skin_body'):
    """A few sculpted scale clusters, fixed to the local ellipsoid surface.

    Placements are designed landmarks, not random pixels. Each shallow bead
    receives the same four skin tones as its parent and turns with that bone.
    """
    center=np.asarray(center,float);radii=np.asarray(radii,float)
    for theta,phi,size in placements:
        direction=np.array([math.cos(phi)*math.sin(theta),
                            math.cos(phi)*math.cos(theta),math.sin(phi)])
        q=center+radii*direction
        normal=unit(direction/radii)
        tangent=unit(np.array([math.cos(theta),-math.sin(theta),0.]))
        tangent=unit(tangent-normal*np.dot(tangent,normal))
        up=unit(np.cross(tangent,normal))
        local=np.column_stack((tangent,normal,up))
        pebble=F(f.p(q+normal*.10),f.R@local)
        r.ell(pebble,(0,0,0),(size,.40,size*.72),M['skin_clean'],group)


@dataclass
class Pose:
    root_z:float=0.
    body_x:float=0.
    body_y:float=0.
    body_z:float=0.
    body_pitch:float=0.
    body_roll:float=0.
    body_yaw:float=0.
    head_yaw:float=0.
    head_pitch:float=14.
    smile:float=.15
    blink:float=0.
    tail:tuple=(0.,0.,0.,0.,0.,0.)
    apron:tuple=(0.,0.)
    straps:tuple=(0.,0.)
    crest:float=0.
    cloth:float=0.
    tongs:float=0.
    hammer_pos:tuple=(-25.,9.,62.)
    hammer_rot:tuple=(1.,-11.,-2.)
    left_hand:tuple=(22.,10.,45.)
    right_elbow:tuple=(-24.,1.,52.)
    left_elbow:tuple=(22.,1.,54.)
    foot_r:tuple=(0.,0.,0.)
    foot_l:tuple=(0.,0.,0.)
    anvil_carry:float=0.
    hammer_basis:tuple|None=None
    hammer_free:bool=False
    right_hand:tuple=(-25.,9.,62.)
    hand_open:float=0.
    left_grip:float=0.
    jaw_open:float=0.
    eye_gaze:float=0.
    secondary_gain:float=1.
    tail_points:tuple|None=None
    knee_r:tuple|None=None
    knee_l:tuple|None=None
    glove_basis:tuple|None=None
    anvil_position:tuple|None=None
    anvil_basis:tuple|None=None
    coal_positions:tuple|None=None
    coal_heat:tuple|None=None


def head(r,body,p):
    H=body.at(0,2,82).rz(p.head_yaw).rx(p.head_pitch)
    g='head'
    skull=patterned_skin(M['skin_clean'],[(-7.7,-4.0,2.8),(7.7,-4.0,2.8),(-10.5,-1.0,1.9),(10.5,-1.0,1.9)],[3.0,3.0,2.5,2.5])
    r.ell(H,(0,0,0),(12.5,8.0,5.3),skull,g)
    r.ell(H,(0,6.5,-1.1),(12.0,10.5,3.45),M['skin_clean'],g)
    r.ell(H,(0,9.0,-3.0-p.jaw_open*.9),(10.9,8.4,1.75),M['belly'],'jaw')
    if p.jaw_open>.05:
        r.ell(H,(0,17.0,-1.8),(4.0,1.15,.4+1.3*p.jaw_open),M['dark'],'jaw')
    # A lower lip is geometry: the short dark mouth line follows the rounded snout.
    mouth=[]
    for x in np.linspace(-9.2,9.2,14):
        yy=7.5+9.9*math.sqrt(max(0,1-(x/12.0)**2))
        zz=-1.25+1.10*(abs(x)/9.2)**1.65+p.smile*.52*(abs(x)/9.2)
        mouth.append(H.p(x,yy,zz))
    polyline(r,mouth,.76,M['dark'],g)
    for s in (-1,1):
        r.ell(H,(s*8.0,6.7,2.4),(3.2,3.2,2.3),M['skin_clean'],g)
        E=H.at(s*8.8,9.5,3.0).rz(-s*38).rx(22)
        height=max(.12,1.55*(1-p.blink))
        if p.blink<.92:
            # Long, adult almond eyes: a dark socket survives the amber iris.
            r.ell(E,(0,0,0),(2.78,.90,height+.52),M['pupil'],g)
            gaze=float(np.clip(p.eye_gaze,-1.,1.))*.72
            r.ell(E,(gaze*.55,.83,0),(2.02,.38,height),M['eye'],g)
            r.ell(E,(s*.04+gaze,1.22,-.03),(.87,.22,max(.12,height*.90)),M['pupil'],g)
            if p.blink<.6:
                r.ell(E,(-.72+gaze,1.46,.73),(.65,.20,.59),M['cloth'],g)
        else:
            # The closed lid has no remaining iris, pupil or floating sparkle.
            r.ell(E,(0,.25,0),(2.68,.83,1.12),M['skin_clean'],g)
            polyline(r,[E.p(-2.2,1.03,.05),E.p(0,1.18,-.28),
                        E.p(2.2,1.03,.05)],.58,M['dark'],g)
        brow=[E.p(-2.45,.72,1.35),E.p(-.6,.90,1.65),E.p(1.95,.73,1.51)]
        polyline(r,brow,.62,M['dark'],g)
        r.ell(H,(s*4.0,15.7,.6),(.67,.52,.47),M['pupil'],g)
        r.dot(H.p(s*4.65,15.35,1.1),.31,M['belly'],g)
        # Cheek pore pairs and a short visible crease beside the eye.
        for k in range(2):r.dot(H.p(s*(8.0-k*.9),9.2+k*.72,-.9),.32,M['spots'],g)
        # One smile dimple and two grouped snout freckles, clear of the eyes.
        r.cap(H.p(s*9.05,14.1,.03),H.p(s*9.5,13.4,.65),.34,.25,M['dark'],g)
        for xx,yy,zz,rr in [(5.8,12.8,1.7,.39),(7.1,12.3,1.55,.31)]:
            r.ell(H,(s*xx,yy,zz),(rr,.32,rr*.65),M['spots'],g)
    skin_pebbles(r,H,(0,0,0),(12.5,8.,5.3),
                 [(-.55,.68,.95),(-.27,.82,.85),(.12,.92,.95),
                  (.52,.72,.92),(1.03,.28,.85),(-1.0,.27,.86)],g)
    for i in range(3):
        xx=(i-1)*5.5; zz=5.1+(.5 if i==1 else 0)+p.crest*.2
        r.ell(H,(xx,-2.7,zz),(1.5,1.55,1.2),M['brass'],'crest')
    for th,ph,sz in [(-1.3,.7,1.5),(1.3,.7,1.5),(2.15,.4,2.5),(-2.15,.45,2.4),(2.9,.15,2.3)]:
        ell_patch(r,H,(0,0,0),(10.2,7.6,7.0),th,ph,sz,g)
    r.tags['head']=H.o;r.tags['mouth']=H.p(0,17.5,-2.8-p.jaw_open*.3)
    return H


def build_tail(r,root,p):
    points=[(0,-7,33),(-3,-15,25),(-11,-24,16),(-22,-28,10),(-32,-27,7),(-38,-19,6),(-39,-12,6.5)]
    widths=[8.1,7.8,6.4,5.1,3.7,2.5,.75]
    points=np.array(points,float)
    # The heavy root remains attached to the pelvis during a crouch. Distal
    # segments keep their floor support, instead of pulling the entire tail up.
    if p.tail_points is None:
        attachment=stage2_body_frame(p).p(points[0])-points[0]
        for i,weight in enumerate((1.,.72,.36,.15,.04,0.,0.)):
            points[i]+=attachment*weight
    else:
        points=np.asarray(p.tail_points,float).copy()
    for i in range(1,len(points)):
        points[i,0]+=p.tail[min(i-1,5)]*.25
        points[i,2]+=p.tail[min(i-1,5)]*.15
    points[:,2]=np.maximum(points[:,2],np.asarray(widths))
    for i in range(len(points)-1):
        a=root.p(points[i]); b=root.p(points[i+1]); Ftail=frame_between(a,b)
        length=np.linalg.norm(b-a)
        r.cap(a,b,widths[i],widths[i+1],M['skin'],'tail')
        # Designed pigment islands sampled on the capsule's real curved surface.
        # No overlay discs: they cannot sink into or detach from the skin.
        capsule=r.primitives[-1]
        axis=unit(b-a);up=unit(np.array([0.,0,1.])-axis*np.dot(axis,[0.,0,1.]))
        facing=unit(np.array([0.,1.,.35])-axis*np.dot(axis,[0.,1.,.35]))
        spots=[];radii=[]
        for u,outward,frac in [(.31,up,.70),(.72,up,.56),(.56,facing,.56)]:
            rad=widths[i]*(1-u)+widths[i+1]*u
            pos=a*(1-u)+b*u+outward*rad
            spots.append((pos-capsule['frame'].origin)@capsule['frame'].R)
            radii.append(max(.75,rad*frac))
        capsule['mat']=patterned_skin(M['skin'],spots,radii)
        # Underside strips follow the articulated tail, hidden correctly by the depth buffer.
        lowa=a+root.v(0,1.3,-widths[i]*.66)
        lowb=b+root.v(0,1.0,-widths[i+1]*.66)
        r.cap(lowa,lowb,widths[i]*.33,widths[i+1]*.31,M['belly'],'tail')
        for j in range(2):
            u=(j+.35)/2; q=a*(1-u)+b*u; rad=widths[i]*(1-u)+widths[i+1]*u
            r.ell(F(q+root.v(0,0,rad*.83)),(0,0,0),(rad*.40,rad*.48,.30),M['spots'],'tail')
        mid=(a+b)*.5+root.v(0,0,(widths[i]+widths[i+1])*.43)
        r.ell(F(mid).ry(-20),(0,0,0),(1.25,1.8,1.45),M['brass'],'tail_crest')
    r.tags['tailTip']=root.p(points[-1])
    r.tags['tailContact']=root.p(points[-1]-np.array([0.,0.,widths[-1]]))


def apron(r,body,p):
    def surface(x,z,extra=.0):
        # Two broad gathered folds pull towards the shoulder straps. Their
        # normals, rather than screen-painted streaks, make the heavy bib read.
        left=-5.6+.15*(z-59)
        right=5.0-.12*(z-59)
        gather=1.9*math.exp(-((x-left)/2.0)**2)+1.5*math.exp(-((x-right)/2.15)**2)
        y=11.7-1.6*(x/15)**2+.8*math.cos(x*.31)+.6*math.sin((z-43)*.30)+gather+extra
        return body.p(x,y,z)
    # A denser curved surface keeps each fold coherent across the whole bib.
    zs=[68.,65.,62.,59.,56.,53.,50.,47.,44.5]
    widths=[10.8,11.8,12.65,13.35,13.7,13.8,13.7,13.55,13.4]
    columns=(-1.,-.82,-.65,-.48,-.30,-.15,0.,.15,.30,.48,.65,.82,1.)
    for row in range(len(zs)-1):
        for u0,u1 in zip(columns,columns[1:]):
            points=[surface(u0*widths[row],zs[row]),surface(u1*widths[row],zs[row]),surface(u1*widths[row+1],zs[row+1]),surface(u0*widths[row+1],zs[row+1])]
            r.poly(points,M['leather'],'apron')
    for s in (-1,1):
        edge=[surface(s*w,z,.15) for w,z in zip(widths,zs)]
        polyline(r,edge,.75,M['leather_edge'],'apron')
        seam(r,[surface(s*(w-1.1),z,.28) for w,z in zip(widths,zs)],group='apron')
    seam(r,[surface(-9,67.6,.2),surface(9,67.6,.2)],group='apron')
    # Split apron below the belt. Each flap has a separate articulated parent.
    for s,lag in [(-1,p.apron[0]),(1,p.apron[1])]:
        A=body.at(s*7.5,10.5,43.5).rx(lag).ry(-s*2)
        def q(x,z):
            return A.p(x,1.2*math.sin((x+7)*.45)+.03*z,z)
        for row in range(3):
            z0=-row*7.2;z1=-(row+1)*7.2
            for col in range(3):
                x0=-6.7+col*4.35;x1=x0+4.35
                r.poly([q(x0,z0),q(x1,z0),q(x1,z1),q(x0,z1)],M['leather'],'apron_'+str(s))
        boundary=[q(-6.7,0),q(-6.7,-21.6),q(6.35,-21.6),q(6.35,0)]
        polyline(r,boundary,.85,M['leather_edge'],'apron_'+str(s))
        seam(r,[q(-5.5,0),q(-5.5,-20.4),q(5.1,-20.4),q(5.1,0)],group='apron_'+str(s))
        if s==1:
            # Sewn repair patch with real slightly raised edges.
            Q=A.at(.5,1.5,-13).rz(-8)
            r.box(Q,(0,0,0),(6.4,.5,5.0),M['leather_edge'],'apron_'+str(s))
            for x in (-3.35,3.35):
                for z in (-1.7,0,1.7):r.line(Q.p(x-.65,.4,z),Q.p(x+.65,.4,z),.47,M['cloth'],'apron_'+str(s))
            for x in (-2.,0,2.):
                for z in (-2.5,2.5):r.line(Q.p(x,.4,z-.6),Q.p(x,.4,z+.6),.47,M['cloth'],'apron_'+str(s))
    # Two front suspender segments and riveted fasteners.
    for s in (-1,1):
        pts=[body.p(s*11.0,8.7,66),body.p(s*13.4,4.2,71.5),body.p(s*11.5,-3.2,71.6)]
        strap(r,pts,3.6,group='harness')
        buckle(r,F(body.p(s*11,10.3,67.7),body.R).ry(s*3),3.5,4.4,'harness')
        r.dot(body.p(s*10.8,11.6,64.4),1.08,M['brass'],'harness')
    # Thick horizontal waist belt wraps all the way around the trunk.
    count=20
    for j in range(count):
        a=math.tau*j/count; b=math.tau*(j+1)/count
        def bp(t,z):return body.p(14.6*math.sin(t),14.1*math.cos(t),z)
        r.poly([bp(a,42.4),bp(b,42.4),bp(b,47.1),bp(a,47.1)],M['leather'],'belt')
        r.line(bp(a,47.1),bp(b,47.1),.5,M['leather_edge'],'belt')
    buckle(r,body.at(0,15.3,44.8),6.5,4.7,'belt')
    for x in (-9,-6,6,9):r.dot(body.p(x,14.3-.02*x*x,45),.55,M['dark'],'belt')
    # Visible short central and flank back skirt, under the harness.
    for s in (-1,1):
        r.poly([body.p(s*1,-10.8,42.3),body.p(s*13.5,-7.1,42.3),body.p(s*14.4,-5.8,30.0),body.p(s*1.5,-10.9,30.8)],M['leather'],'back_apron')
        seam(r,[body.p(s*2,-11.1,40.5),body.p(s*2,-11.1,31.7),body.p(s*13.3,-6.9,31.3)],group='back_apron')


def back_harness(r,body,p):
    # Actual crossing straps behind the torso. They remain present in all views.
    strap(r,[body.p(-11.5,-3.5,71.5),body.p(-7.5,-9.5,64),body.p(0,-11,57),body.p(12,-9.1,47)],3.4,'harness')
    strap(r,[body.p(11.5,-3.6,71.6),body.p(7.6,-9.65,64),body.p(0,-11.45,57),body.p(-12,-9.4,47)],3.4,'harness')
    buckle(r,body.at(0,-12.0,57).rz(180),5,3.6,'harness')
    for s,angle in [(-1,p.straps[0]),(1,p.straps[1])]:
        B=body.at(s*9.2,-9.6,45).rx(angle).rz(180)
        # Free leather loop with a bronze D-shaped clasp and an independent end.
        strap(r,[B.p(0,0,0),B.p(0,1,-3),B.p(0,.6,-7)],2.9,'harness',stitches=False)
        pts=[B.p(-1.8,1.4,-2),B.p(-1.9,1.4,-5.0),B.p(-1,1.5,-6),B.p(1,1.5,-6),B.p(1.9,1.4,-5),B.p(1.8,1.4,-2)]
        polyline(r,pts,.85,M['brass'],'harness')


def feet_and_legs(r,root,p):
    for s,shift in [(-1,p.foot_r),(1,p.foot_l)]:
        g='leg_'+str(s)
        off=np.asarray(shift,float)
        ankle=np.array([s*11,-1.0,5])+off
        knee=np.array([s*11.2+p.body_x*.35,.5+p.body_y*.3+max(0.,-p.body_z)*.7,20+p.body_z*.3])+off*.5
        specified_knee=p.knee_r if s==-1 else p.knee_l
        if specified_knee is not None:knee=np.asarray(specified_knee,float)
        hip=stage2_body_frame(p).p(s*8.5,-.8,36)
        limb(r,root.p(hip),root.p(knee),7.1,6.9,M['skin'],g)
        limb(r,root.p(knee),root.p(ankle),5.2,5.2,M['skin'],g)
        K=root.at(knee)
        r.ell(K,(0,4.9,1.5),(4.0,1.4,3),M['skin_clean'],g)
        r.line(K.p(-2.4,5.9,1.1),K.p(2.4,5.9,.6),.48,M['belly'],g)
        foot=root.at(ankle+np.array([s*.4,4.3,-1.3])).rz(s*-7)
        r.ell(foot,(0,0,0),(6.3,7.8,3.6),M['skin'],g)
        for j,x in enumerate((-3.8,0,3.8)):
            y=5.6+(.6 if j==1 else 0)
            r.ell(foot,(x,y,-.7),(2.3,3.0,2.2),M['skin_clean'],g)
            r.ell(foot,(x,y+2.0,-.9),(1.25,1.70,1.20),M['bone'],g)
        for th,ph,sz in [(-.8,.3,1.7),(.65,.25,1.9),(2.7,.1,2.2)]:
            ell_patch(r,root.at((hip+knee)*.5),(0,0,0),(7.1,6.9,12),th,ph,sz,g)
        r.tags['footRContact' if s==-1 else 'footLContact']=root.p(ankle+np.array([0,1,-5]))
        r.tags['kneeR' if s==-1 else 'kneeL']=root.p(knee)


def arms(r,body,root,p,H):
    shoulders={-1:body.p(-16.0,0,65.0),1:body.p(16.,0,65.)}
    grip=root.p(p.right_hand) if p.hammer_free else H.p(0,0,0)
    left=root.p(p.left_hand)*(1.-p.left_grip)+H.p(0,0,-7)*p.left_grip
    hand_frame=F(grip,root.R).rx(-5) if p.hammer_free else H
    for s,goal,pole in [(-1,grip,root.p(p.right_elbow)),(1,left,root.p(p.left_elbow))]:
        g='skin_body';shoulder=shoulders[s]
        elbow=two_bone_ik(shoulder,goal,pole)
        r.tags['elbowR' if s==-1 else 'elbowL']=elbow
        r.tags['shoulderR' if s==-1 else 'shoulderL']=shoulder
        shoulder_frame=F(shoulder,body.R)
        r.ell(shoulder_frame,(0,0,0),(7.8,7.4,9.2),M['skin'],g)
        skin_pebbles(r,shoulder_frame,(0,0,0),(7.8,7.4,9.2),
                     [(s*.44,.65,1.22),(s*.77,.48,1.08),
                      (s*1.02,.26,.94),(s*.32,.28,.95)],g)
        upper=limb(r,shoulder,elbow,6.8,6.5,M['skin'],g)
        upper_length=np.linalg.norm(elbow-shoulder)*.56
        skin_pebbles(r,upper,(0,0,0),(6.8,6.5,upper_length),
                     [(-.72,.22,1.12),(-.44,.48,.97),(.37,.10,.96)],g)
        lower=limb(r,elbow,goal,5.0,5.2,M['skin'],g)
        lower_length=np.linalg.norm(goal-elbow)*.56
        skin_pebbles(r,lower,(0,0,0),(5.0,5.2,lower_length),
                     [(-.68,.20,1.03),(-.36,.50,.91),(.32,.20,.91)],g)
        for th,ph,sz in [(-.25,.4,2.8),(.95,.20,2.1),(2.7,.25,3.)]:
            ell_patch(r,F(shoulder,body.R),(0,0,0),(8.4,7.7,9.4),th,ph,sz,g)
        # Flat irregular pigment on forearms, plus an elbow crease.
        ell_patch(r,lower,(0,0,0),(5.0,5.2,np.linalg.norm(goal-elbow)*.56),.4,.2,1.5,g)
        if s==1:
            G=F(goal).rx(-10).rz(-5)
            if p.glove_basis is not None:G=F(goal,np.asarray(p.glove_basis,float))
            if p.left_grip>0:
                G=F(goal,_stage2_rotation_mix(G.R,H.R,p.left_grip))
            cuff=goal+(elbow-goal)*.34
            C=frame_between(goal,elbow)
            C=F(cuff,C.R)
            r.ell(C,(0,0,0),(6.4,6.2,4.0),M['leather'],'glove')
            for z in (-3.0,2.7):
                pts=[C.p(5.9*math.sin(t),5.7*math.cos(t),z) for t in np.linspace(0,math.tau,17)]
                polyline(r,pts,.9,M['leather_edge'],'glove')
            for x in (-3.7,0,3.7):r.dot(C.p(x,5.7,2.8),.62,M['brass'],'glove')
            r.ell(G,(0,1,-2.2),(5.1,3.7,5.0),M['leather'],'glove')
            for j in range(3):
                xx=-3.1+j*2.6
                r.ell(G,(xx,4.7,-5.2),(1.65,2.6,3.0),M['leather'],'glove')
                r.line(G.p(xx,7.0,-4.5),G.p(xx,6.7,-6.2),.62,M['leather_edge'],'glove')
            r.ell(G,(-4.3,3.4,-.5),(2.5,2.8,3.4),M['leather'],'glove')
            seam(r,[G.p(-3.8,5.3,-1),G.p(3.8,5.3,-1)],group='glove')
        else:
            # The right fist is built around the SAME rigid shaft transform.
            r.ell(hand_frame,(0,0,0),(4.5,4.2,5.0),M['skin_clean'],g)
            if p.hammer_free and p.hand_open>.02:
                for j in (-1,0,1):
                    r.cap(hand_frame.p(j*2.4,2,-1),hand_frame.p(j*(2.4+1.2*p.hand_open),3.5+5*p.hand_open,1.5+1.6*p.hand_open),1.3,1.0,M['skin_clean'],g)
            for z in (() if p.hammer_free and p.hand_open>.02 else (-2.8,.0,2.8)):
                r.cap(hand_frame.p(-2.5,2.7,z),hand_frame.p(2.2,2.7,z),1.45,1.35,M['skin_clean'],g)
                r.line(hand_frame.p(-2.1,3.85,z-.95),hand_frame.p(1.6,3.85,z-.95),.42,M['spots'],g)
            r.ell(hand_frame,(3.0,1.0,2.4),(2.15,2.9,3.25),M['skin_clean'],g)
    r.tags['handR']=grip;r.tags['handL']=left


def belt_tools(r,body,p):
    # Left-hip tongs, jointed steel jaws, one pivot and two unequal handles.
    T=body.at(12.8,10.2,42.5).ry(-8).rx(p.tongs)
    for s in (-1,1):
        pts=[T.p(s*1.25,1.0,0),T.p(s*2.8,1.0,-3),T.p(s*1.8,1.2,-7.5),T.p(s*.25,1.2,-8.8),T.p(-s*1.5,1.2,-17.0)]
        polyline(r,pts,1.15,M['steel_light'],'tongs')
        r.cap(T.p(-s*1.5,1.2,-17),T.p(-s*1.8,1.2,-18.4),.8,.55,M['steel'],'tongs')
    r.dot(T.p(0,1.7,-8.7),1.05,M['brass'],'tongs')
    r.line(T.p(-1.5,1.0,.5),T.p(1.5,1.0,.5),.8,M['leather_edge'],'tongs')
    # Three layered linen folds beside the belt, not a flat rectangular decal.
    C=body.at(-8.1,14.6,42.7).rx(p.cloth).rz(-5)
    for j in range(3):
        x=-3.3+j*2.0
        pts=[C.p(x,.1,0),C.p(x+2.4,.6,0),C.p(x+2.0,1.3,-15.4+j*1.1),C.p(x-.4,1,-15.8+j*.8)]
        r.poly(pts,M['cloth'],'cloth')
        r.line(pts[1],pts[2],.55,M['leather_edge'],'cloth')
        seam(r,[C.p(x+.1,1.1,-14.9+j*.9),C.p(x+1.5,1.3,-14.8+j*.9)],M['bone'],.45,2.,'cloth')


def build_model(p=None,with_anvil=True):
    p=p or Pose()
    yaw=p.body_yaw
    # Construct every joint, strap and pigment in one character-local space.
    # A single final transform also rotates the frames used by the textures.
    p=replace(p,body_yaw=0.)
    r=Rig()
    root=F().rz(p.body_yaw)
    body=stage2_body_frame(p)
    build_tail(r,root,p)
    feet_and_legs(r,root,p)
    r.ell(body,(0,0,36),(13.6,8.9,12),M['skin'],'skin_body')
    r.ell(body,(0,0,56),(16.1,10.0,17.8),M['skin'],'skin_body')
    r.ell(body,(0,-1.0,67.3),(13.8,7.8,7.5),M['skin'],'skin_body')
    r.ell(body,(0,.5,74.5),(6.5,5.9,6.2),M['belly'],'neck')
    for z in (72.2,75.1):
        r.cap(body.p(-4.7,4.4,z),body.p(4.7,4.4,z),.45,.45,M['leather_edge'],'neck')
    # Back pigment patches live under crossed leather harness.
    for th,ph,sz in [(2.8,.5,2.7),(-2.75,.6,2.7),(3.14,-.1,2.2),(2.2,-.45,1.8),(-2.2,-.5,1.8)]:
        ell_patch(r,body,(0,0,56),(16.1,10.0,17.8),th,ph,sz,'torso')
    for z in (70,65.5,60.5,55.5):r.ell(body,(0,-9.25,z),(1.2,1.2,1.8),M['brass'],'crest')
    apron(r,body,p)
    back_harness(r,body,p)
    belt_tools(r,body,p)
    head(r,body,p)
    H=(F(np.asarray(p.hammer_pos),np.asarray(p.hammer_basis)) if p.hammer_basis is not None else
       root.at(p.hammer_pos).rx(p.hammer_rot[0]).ry(p.hammer_rot[1]).rz(p.hammer_rot[2]))
    tags=draw_hammer(r,H,M)
    r.tags.update(tags)
    arms(r,body,root,p,H)
    if with_anvil:
        if p.anvil_position is not None:
            A=F(np.asarray(p.anvil_position,float),
                np.asarray(p.anvil_basis,float) if p.anvil_basis is not None else F().rz(35).R)
        elif p.anvil_carry:
            A=body.at(0,-16.5,42).rx(85)
        else:A=F().at(31.,30.,0.).rz(35)
        r.tags.update(draw_anvil(r,A,M,p.coal_positions,p.coal_heat))
        r.tags['anvilGround']=A.o
        if p.anvil_carry>.001:
            rotation=F().rz(yaw).R
            lift=np.array([0.,0.,p.root_z])
            for side,s in [('R',-1),('L',1)]:
                hook=r.tags['anvilHarness'+side]
                if p.anvil_position is not None:hook=rotation.T@(hook-lift)
                belt=body.p(s*12,-9,47)
                if np.linalg.norm(hook-belt)<35:
                    strap(r,[body.p(s*10,-5,69),body.p(s*10,-12,52),hook,belt],
                          2.8*min(1.,p.anvil_carry),'carry_straps')
    r.tags['feet']=np.zeros(3)
    r.tags['chest']=body.p(0,0,56)
    if yaw or p.root_z:
        rotation=F().rz(yaw).R
        lift=np.array([0.,0.,p.root_z])
        grounded_anvil_tags={'anvilTop','anvilStrike','coalPocket','anvilCarry','anvilGround',
                             'anvilHandleR','anvilHandleL','anvilHarnessR','anvilHarnessL',
                             'coal0','coal1','coal2'}
        for primitive in r.primitives:
            # The free-standing anvil belongs to the scene, not to the torso.
            if (not p.anvil_carry or p.anvil_position is not None) and primitive['group'].startswith('anvil_'):
                continue
            if primitive['kind']=='poly':
                primitive['points']=primitive['points']@rotation.T+lift
            else:
                frame=primitive['frame']
                primitive['frame']=F(rotation@frame.origin+lift,rotation@frame.R)
        for name,value in r.tags.items():
            if (not p.anvil_carry or p.anvil_position is not None) and name in grounded_anvil_tags:
                continue
            if isinstance(value,np.ndarray) and value.shape==(3,):
                r.tags[name]=rotation@value+lift
    return r


# Plain Markdown specification, also committed as card.md.
CARD_TEXT = r'''# Саламандра-кузнец Горнила

## Статус: этап 3, полный комплект

**Реализованы все три этапа:** 26 клипов, 1128 кадров, 72-фазная кузня, полный `showreel` и связный `life` около 31 секунды. Все кадры строятся кодом; новых вызовов imagegen в попытке 3 **0**. В GitHub сохраняются только этот текст и единственный автономный генератор.

Нейтраль: **956 примитивов, 43 группы, рост тела 81 px**, опора `(77,99)`. В число примитивов входит микрогеометрия, это не число суставов. Лицо и кожа доработаны в принятом этапе 2: рамка глаза, блик, надбровье, улыбка, 26 сгруппированных бугорков и четыре ступени тона. Нейтраль этапа 3 побайтно совпадает с принятой нейтралью этапа 2; пропорции и облик не переизобретались.

До остальных клипов исправлены три замечания. В трюке настоящий апекс головки поднят с 114 до 128 мировых единиц; молот выполняет **два полных экранных оборота**. В вершине между всем молотом с контуром и макушкой **28 свободных рядов пикселей**; требование ≥25 px выполняется на кадрах 30–34. Камера, размер молота и масштаб не меняются. Кольцо имеет внешний диаметр **28 px**, проекцию осей **24.44/14.14 px**; молот проходит его на подъёме в 25. Клубы огня и дыма начинаются в настоящем `mouth` на 20–29. Кольцо видно на 23–31.

`tech_anvil`: **32 искры**, подъём до **29.41 px**, полёт/остывание **20 кадров, 26–45**; горячий след на наковальне и пылевая волна у основания. На пике `happy` из настоящей угольной лунки выходят **16 угольков**, видимых на 27–40. У этих эффектов передний слой не перекрывает лицо. Подробные измерения перепроверяются генератором и записываются в `stage3-checks.json`.

Пять пружин дают наблюдаемое отставание примерно **3/2/4/2/3 кадра**; явная очередь входных значений равна 1/0/2/0/1, остальное добавляет фильтр. Теперь пружины добавляют движение к авторским складкам и опорам, а не заменяют их. Во всех петлях используется периодическая история.

| Поле | Значение |
|---|---|
| ID, редкость, тема | `forge_salamander`, редкая, «Вулкан» |
| Характер | Добрая взрослая сильная мастерица, гордится работой |
| Среда | Python 3 + Pillow + NumPy, ортографический 3D-риг, буфер глубины |
| Ячейка, опора, частота | `160×128`, `(77,99)`, 24 кадра/с |
| Камера | Азимут `−35°`, высота `35°`, вид спереди-справа |
| Масштаб, голова | Проекция `0.94`, `head_pitch = +14°` |
| Границы тела | `(34,28,107,109)`, высота 81 px без реквизита |
| Контур, свет | 1 px `#150f0b`, внутренний по глубине; сверху-слева; четыре тона |

Опора — середина наземных точек лап, не нижний пиксель силуэта. Направленная к камере лапа может выступать ниже y=99.

### Источники

Прочитаны в `bosses-art`: `.agents/skills/pixel-bosses/references/9-catalog.md` (§9.7, запись 26), `2-pipeline.md` (§2.3–2.4), `4-style.md`; `tools/creatures/c/meadow_colossus.card.json`, `moon_warden.card.json`, первые 150 строк `moon_warden-skin.ts`. Код и спрайты других существ не переносятся.

[Частное ТЗ-Г1, включая изменённый п. 7](https://github.com/SkyTmin/coco-mining-sim/blob/bosses-art/docs/tz/TZ-G1-chatgpt-gornila.md) имеет приоритет: поле 160×128, рост 70–84 px, четыре тона, трюк и разовый `turn` по 96 кадров. Сверка с Исполином проведена по архивным файлам проекта: `docs/reports/creatures/b3/references/meadow_colossus/idle.png` и `tools/creatures/viewer/atlases/meadow_colossus/p-0.webp` из снимка `bf6bf1386d179cd88d6f85c33c8d138f875639c3` в `/workspace/scratch/66570368f5f2/pr15-repository-snapshot/`. Новые эталонные вложения текущего сообщения не были доступны; для сравнения использован этот архив. Просмотр использован для проверки плотности деталей, контраста и чтения лица, а не как численное доказательство равенства художественного качества.

## 1. Сохранённый облик

Тяжёлая взрослая саламандра: широкие плечи, сильные предплечья, разнесённые лапы и длинный пятнистый хвост. Низкая голова примерно в пятую часть роста: эллипсоид `(12.5,8.0,5.3)`, морда `(12.0,10.5,3.45)`, челюсть `(10.9,8.4,1.75)`. Малые янтарные глаза с тёмной рамкой и отдельным бликом, спокойные надбровья, читаемая улыбка, три низких верхних бугорка. Дополнительные малые бугорки закреплены на коже в локальных координатах и не являются экранным шумом. Кожа терракотовая с угольными пятнами; горло и низ хвоста охристые. Гряда низкая, без крыльев, больших шипов, клыков и глаз-блюдец.

Широкий кожаный фартук до колен разделён на две тяжёлые полы. Сзади перекрещённые ремни и переносные петли. Слева большая крага, на поясе щипцы и сложенная тряпка. Справа молот: прямоугольная головка, тёмный средний пояс, бронзовая обойма, дерево и кожаный хват.

Наковальня с коротким рогом, пяткой и угольной лункой стоит на переносном базальтовом основании в `(+31,+30,0)`, поворот `+35°` вокруг Z. Вынос перед левым боком сохраняет профиль. Вторая или уменьшенная копия не создаётся.

Три признака на 48 px: широкоплечая терракотовая фигура с хвостом; тёмный разделённый фартук и молот; отдельная наковальня сбоку. В основном виде открыты лицо, крага и лапы. В кульминации эффекты и фартук закрывают не больше половины тела.

## 2. Материалы

Палитры сохранённого рига от тени к свету; четыре тона на подповерхность, несколько материальных семейств.

| Ключ | Четыре тона | Поверхность |
|---|---|---|
| `skin`, `skin_clean` | `#6b2c24 #a74429 #d66b34 #f29a50` | Терракотовая кожа, с пятнами / чистая |
| `belly` | `#845035 #b8814d #ddb176 #f2d19a` | Горло, челюсть, низ хвоста |
| `spots` | `#222432 #34303e #4b3a47 #644956` | Угольный пигмент |
| `leather` | `#302322 #50352d #77503b #a77951` | Фартук, ремни, крага |
| `leather_edge` | `#4f3328 #78523b #ad8158 #d9ac71` | Швы, складки, потёртые кромки |
| `wood` | `#503427 #795036 #af7b48 #d5a565` | Волокно рукояти |
| `steel` | `#242b33 #3d4756 #687787 #9ba8ad` | Тёмные металлические грани |
| `steel_light` | `#454955 #747c8c #a4aab5 #d5d3ce` | Рабочие грани, фаски, щипцы |
| `brass` | `#64432a #9c6d3b #d3a25b #f0d69a` | Пряжки, заклёпки, обойма |
| `dark` | `#150f0b #251c18 #39281e #51372a` | Швы, рот, углубления |
| `ember` | `#a63e21 #ed7627 #ffbd55 #fff0aa` | Жар, emission `0.9` |
| `bone` | `#665747 #9a8767 #d0b991 #efe0b6` | Тупые когти, светлые стежки |
| `cloth` | `#8c694d #ba956d #e0c392 #fae6b9` | Тряпка, малые блики |
| `stone` | `#29282b #423b40 #61524d #827066` | Базальтовое основание |
| `eye` | `#76351b #bc6d20 #edab3d #ffe2a1` | Радужки |
| `pupil` | `#150f0b #1b1411 #211915 #2b211b` | Зрачки, ноздри |

Локальная фактура движется вместе с поверхностями, без нового случайного рисунка на каждом кадре. Рендер сразу 160×128 без сглаживания; увеличение NEAREST. Слабый холодный кант в тени, отдельное свечение с перекрытиями, наземные тени тела и наковальни.

## 3. Подробности для визуальной проверки

56 признаков облика и целей детализации: каждый визуально сверяется хотя бы в одном виде. Наличие геометрии не доказывает читаемость на основном ракурсе.

| № | Голова, кожа и хвост |
|---:|---|
| 1–4 | Низкая верхняя плоскость морды; светлая кромка челюсти; две объёмные ноздри; спокойные надбровные складки |
| 5–8 | Янтарные радужки; зрачки с отдельными бликами; линия рта с уголком; светлая полоса горла |
| 9–12 | Две складки под челюстью; затылочные бугорки; крупное пятно ближнего плеча; мелкие пятна дальнего плеча |
| 13–16 | Пятна и бугорки предплечья; светлая локтевая складка; коленные щитки; разделённые пальцы лап |
| 17–21 | Тупые когти; стёртые кончики; разные пятна хвоста; верхние хвостовые бугорки; светлый низ хвоста |

| № | Одежда и принадлежности |
|---:|---|
| 22–25 | Изношенная кромка нагрудника; два заклёпочных крепления; боковая строчка; разрез с тёмной изнанкой |
| 26–29 | Разные складки двух полов; заплата со швом; потёртые уголки; широкий пояс с бронзовой пряжкой |
| 30–33 | Отверстия и конец пояса; перекрестие ремней; задние пряжки и заклёпки; две свободные переносные петли |
| 34–37 | Толстая манжета краги; шов и складки костяшек; отдельный большой палец; два рычага щипцов |
| 38–40 | Шарнир щипцов; поясная петля; сложенная тряпка со светлой кромкой |

| № | Молот и наковальня |
|---:|---|
| 41–44 | Светлая ударная грань; тёмный бок и фаски; бронзовая обойма; пятна окалины |
| 45–48 | Две направленные царапины; короткий верхний блик; нахлёст обмотки; деревянная пята рукояти |
| 49–52 | Светлая площадка наковальни; короткий рог; пятка с насечкой; две отметины площадки |
| 53–56 | Тёмная шейка; широкие опорные края; переносная проушина; боковая лунка с тремя заранее видимыми угольками |

## 4. Устройство рига и хват

Эллипсоиды, капсулы, коробки и ленты привязаны к суставам; глаза к голове, швы к фартуку, пятна к коже, обойма к молоту. Без экранной подмены тела.

Оси: `+X` к левому боку, `−X` к правому, `+Y` вперёд, `+Z` вверх. Опоры лап `(-11,0,0)` и `(11,0,0)`, их середина проецируется в `(77,99)`. Хват молота `(-25,9,62)`, цель краги `(22,10,45)`. Наковальня живёт в мировой системе, независимо от `turn` тела.

Узлы: корень, таз, грудь, шея, голова, челюсть и глаза; плечо–локоть–кисть и бедро–колено–стопа каждой стороны; шесть звеньев хвоста; полы фартука, ремни, гряда, тряпка, щипцы; молот и наковальня.

`two_bone_ik`: плечо 17.0, предплечье 14.5, pole hint локтя; кисть и рукоять в общей системе. Недостижимая цель — ошибка, не растяжение. Каждый кадр проходит проверку достижимости и постоянных длин рук; итоговые контакты и стыки фиксируются в отчёте сборки, а не предполагаются по наличию IK.

Опорные точки для анимации: `feet`, `footLContact`, `footRContact`, `hammerGripR/L`, `hammerPalmFace`, `hammerFace`, `hammerStrikingEnd`, `anvilTop`, `anvilCarry`, `anvilHandleR/L`, `anvilHarnessR/L`, `mouth`, `coalPocket`, `coal0/1/2`, `tailTip`, `tailContact`, `kneeR/L`. Эффект должен совпадать с реальным контактом.

Разделены две поверхности молота: `hammerPalmFace = H(-4.5,0,17)` — нижняя грань для лёгких постукиваний по краге; `hammerFace` и `hammerStrikingEnd = H(-9,0,22)` — настоящий рабочий торец для кузнечного удара. В кадре `hit` плоскость торца горизонтальна, хват выше наковальни; кости не растягиваются.

### Предметы не исчезают

Покой/приёмы: молот справа, наковальня на полу. На подготовке и ударе реализована двухручная поддержка рукояти. Трюк: хват→полёт→ловля того же предмета; в полёте правая ладонь отделена от инструмента, вращение идёт вокруг тяжёлой головки. Отдельная напольная тень молота сжимается и бледнеет с высотой.

Во сне молот опирается головкой на пол при сохранённом хвате, голова лежит на краге у наковальни. В ходьбе наковальня с основанием закреплена сзади, молот остаётся в руке. Щипцы и тряпка остаются в своих петлях. В `fidget_a` инструмент протирается верхом рабочей краги; это явное уточнение прежнего сценария с тряпкой.

Перенос: присед→крага за настоящую U-проушину→наклон основания и поддержка хвостом→подъём сбоку дугой→закрепление ремней→освободить хвост. Обратный путь ставит тот же предмет на пол. Наковальня задаётся единой мировой жёсткой матрицей; переключения двух положений и изменения масштаба нет. На спине к настоящим креплениям подходят два нагрузочных ремня.

`take_anvil`: 0–10 присед/переступания и хват; 10–13 наклон базы на стоящем крае и подвод хвоста; 13–17 вертикальный отрыв; 17–25 боковая дуга; 25–31 посадка за спину; 31–35 освобождение краги и хвоста. Ремни затягиваются на 24–31, кадр 35 — точный `carry_pose`. Технический хвост 36–47 проходит тот же путь обратно.

`put_anvil`: 0–7 технический подъём; 7 перенос; 8–12 подхват; 12–28 обратная боковая дуга; 28–33 спуск до опорного края; 33–36 установка всей базы на пол; 36–47 руки, ноги и хвост в idle. Хват проушины сохраняется на 12–35, поддержка хвостом на 12–32. Конечное крепление груза — `body.at(0,-16.5,42).rx(85)`: зазор от корня хвоста проверен, масштаб постоянен.

## 5. Вторичные цепи

Пять независимых затухающих пружин получают драйвер из истории основной позы, а не из несвязанных синусов. Движение следует за телом с задержкой; после остановки есть перелёт и затухание. Для всех петель используется периодическая история. Точность замыкания петли и концов разовых клипов проверяется итоговой сборкой; результат заносится в `report.md`.

| Цепь | Задержка, кадры | Поведение |
|---|---:|---|
| Хвост (`tail`) | 3 | Волна по шести звеньям вслед за тазом |
| Две полы (`apron`) | 2 | Тяжёлая кожа, малый перелёт |
| Задние ремни (`straps`) | 4 | Свободный маятник вслед за плечами |
| Гряда (`crest`) | 2 | Малая упругая реакция головы и спины |
| Тряпка (`cloth`) | 3 | Мягкий доворот после остановки |

Щипцы остаются отдельной деталью рига и получают короткий металлический отскок от цепи ткани; это не шестая независимо проверенная пружина. Для полного `turn` хвост реагирует на кратчайшую угловую скорость, чтобы накопленные 360° не растягивали его.

## 6. Реестр клипов и статус

Нумерация с нуля: время ключа `frame/24`, длительность `frames/24`. Кадр 47 = 1.958 с; клип 48 кадров = 2 с. **Готовы все строки таблицы.**

| Клип | Кадров | Секунд | Петля | Содержание |
|---|---:|---:|---|---|
| `idle` | 84 | 3.5 | Да | Готов: дыхание, касания краги на 24/36, взгляд, хвост |
| `fidget_a`, `fidget_b` | По 48 | По 2 | Нет | Протирка молота; сдувание окалины |
| `look` | 36 | 1.5 | Нет | Глаза → голова → плечи |
| `happy` | 48 | 2 | Нет | Готов: притопы 14/23, подскок, посадка 35, показ молота |
| `trick` | 96 | 4 | Нет | Готов: отпуск 18, ловля 46, удар 56, звезда, поклон |
| `walk_n/ne/e/se/s/sw/w/nw` | По 24 | По 1 | Да | Ходьба на месте, наковальня за спиной |
| `turn` | 96 | 4 | Нет | Круг на месте и исходная стойка |
| `sleep_in`, `sleep_out` | По 30 | По 1.25 | Нет | Вход и выход из сна |
| `sleep` | 84 | 3.5 | Да | Медленное дыхание, тлеющий выдох |
| `wake_startled` | 24 | 1 | Нет | Испуг, бережный хват, посадка |
| `hatch`, `tired` | По 36 | По 1.5 | Нет | Выход с молотом на плече; усталость |
| `tech_anvil` | 48 | 2 | Нет | Готов: двухручная поддержка, удар; `hit: [26]` |
| `tech_ember_wave` | 48 | 2 | Нет | Три угля; `hit: [27, 30, 33]` |
| `tech_tail_stamp` | 48 | 2 | Нет | Клеймо хвостом; `hit: [25]` |
| `take_anvil`, `put_anvil` | По 48 | По 2 | Нет | Дополнительные видимые переходы к переноске и обратно |

### Стыки сна и переноски

Полные разовые файлы имеют `idle[0] → idle[0]`. `stitch` задаёт рабочий диапазон для `life`; `showreel` показывает всё. Это реализованный и явно объявленный компромисс между переходами состояний и требованием idle-концов всех разовых файлов. У `sleep` и направленных `walk` свои опорные позы.

| Клип | Ключи полного файла | Рабочий диапазон `life`, включительно |
|---|---|---|
| `sleep_in` | 0 idle → 23 сон → 29 idle | `[0, 23]`; 23 точно равен `sleep[0]` |
| `sleep_out` | 0 idle → 5 сон → 29 idle | `[5, 29]`; 5 точно равен `sleep[0]` |
| `wake_startled` | 0 idle → 3 сон → 23 idle | `[3, 23]` |
| `hatch` | 0 idle → 5 сжатая поза → 35 idle | `[5, 35]` |
| `take_anvil` | 0 наземный idle → 35 перенос → 47 наземный idle | `[0, 35]`; точная опорная поза `carry_pose`; до направленной ходьбы — живой переход |
| `put_anvil` | 0 наземный idle → 7 перенос → 47 наземный idle | `[7, 47]` |

Вне `stitch` тоже выполняется непрерывное движение. Обязательные длины сохранены. Нельзя одновременно совместить одну позу переноса со всеми восемью направлениями: в `life` начало/конец шага и смена yaw используют дополнительные 10-кадровые переступания тем же ригом, без отдельной экспортной полосы.

## 7. Покой и жесты

`idle`, реализован: 0–11 вдох, плечи +1–2 px; 12–22 раскрытие краги и подвод молота; **24 первый контакт, 36 второй**; между ними короткие отскоки и податливость краги. На 34–38 моргание, 39–57 руки освобождают лицо и корпус, взгляд на наковальню; 58–83 выдох и петля. Контакт на 24/36 строится по верхней поверхности краги и `hammerPalmFace`, не по центрам кистей и не по рабочему торцу. Итоговая точность контакта — в отчёте.

`fidget_a`, «Чистая грань»: 7 осмотр; 12 видимый зазор; 15–21 первая протирка, 24–28 обратная; 32 разъединение; 36 проверка светлой грани; 47 idle. Рабочий торец движется по общей касательной плоскости верхней части краги, контакт проверяется. Тряпка всё время на поясе.

`fidget_b`, «Лишняя окалина»: 0–10 наклон; 11–18 вдох; 19–25 выдох от `mouth`, три крошки с рабочей плоскости; 26–34 падение к основанию и взгляд; 35–47 выпрямление, крошка с краги, idle. Масштаб меньше сильного приёма.

`look`: 4 глаза; затем голова и грудь; 14 поворот головы до 29°; пауза до 20; 23 взгляд возвращается; 28 малый перелёт −6°; 35 idle. Молот удерживается, наковальня стоит.

## 8. Радость: `happy`, 48 кадров

Реализовано. «Хорошо вышло»: два тяжёлых притопа на **14 и 23**, прыжок с `root_z=8` (около 6 экранных px) и **посадкой на 35**, показ инструмента и 16 угольков из лунки на 27–40. Отличие силуэта заметно до кадра 12; прыжок поднимает всё тело, наковальня остаётся на полу.

| Кадры | Секунды | Действие |
|---|---|---|
| 0 | 0 | Точный idle |
| 1–6 | 0.042–0.25 | Полуприсед, разворот груди, крага уже движется |
| 7–11 | 0.292–0.458 | Молот поднят диагонально, раскрытая крага над грудью; силуэт отличается до кадра 12 |
| 12–18 | 0.5–0.75 | Первый тяжёлый контакт на 14, кивок, малые искры |
| 19–26 | 0.792–1.083 | Второй контакт на 23, подготовка подскока, хвост противовесом |
| 27–34 | 1.125–1.417 | Подскок: `root_z` до 8, около 6 px; хват цел, тень меньше и светлее |
| 35–38 | 1.458–1.583 | Посадка на 35 со сжатием, полы догоняют тело |
| 39–43 | 1.625–1.792 | Показывает рабочую грань, довольный прищур |
| 44–47 | 1.833–1.958 | Возвращает молот, ноги и весь силуэт в idle |

## 9. Трюк: `trick`, 96 кадров

Реализовано. «Через горнило»: подготовка→риск→звезда→поклон. Отпуск **18**, ловля **46**, удар **56**; правую ладонь в полёте видно отдельно. Молот вращается вокруг тяжёлой головки, его собственная напольная тень зависит от высоты. Головка крупнее 7 px, проекция рукояти в полёте не короче 9.88 px; два оборота читаются и на узкой фазе. В вершине весь молот выше макушки на 28 свободных пиксельных рядов, границы ячейки не пересекаются. Геометрия неизменна; лицо и минимум половина тела открыты.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–9 | 0–0.375 | Шире лапы, взгляд на дугу, молот назад; тени плотные |
| 10–17 | 0.417–0.708 | Присед, толчок ногами/тазом, разгон снизу; крага балансирует, искры обоймы |
| 18–25 | 0.75–1.042 | Отпуск на 18; огненно-дымный выдох от рта с 20; кольцо с 23; проход кольца на подъёме в 25 |
| 26–34 | 1.083–1.417 | Молот продолжает подниматься над кольцом; присед, апекс около 32; зазор всего молота ≥25 px на 30–34 |
| 35–41 | 1.458–1.708 | Завершение второго оборота и снижение; рука открыта к ловле, кольцо уже погасло |
| 42–49 | 1.75–2.042 | Рукоять в ладонь, хват на 46; тяжесть тянет руку, колени проседают, хвост балансирует |
| 50–57 | 2.083–2.375 | Проседание в замах; контакт `hammerFace == anvilTop` на 56, вспышка/фонтан, отдача на 57 |
| 58–69 | 2.417–2.875 | Выпрямление и взгляд на полую звезду из пяти ветвей искр над наковальней |
| 70–81 | 2.917–3.375 | Молот к плечу, поклон от таза, крага на груди; искры падают, отскакивают и гаснут |
| 82–95 | 3.417–3.958 | Голова, лапы, молот в idle; затухают вторичные части и угольки |

Риск — высота и вес ловли, без боли. В полёте хват открыт; бросок, кольцо, ловля и поклон обязательны.

## 10. Три разных приёма

Реализованы `tech_anvil`, `tech_ember_wave` и `tech_tail_stamp`. Внешние фото/видео не выдаются за исследованные источники. Ключи движения: покой, подготовка, разгон, контакт, отдача, возврат. Требования: лицо видно, сила проходит через тело, руки поддерживают инструмент.

### `tech_anvil`: «Верный удар», 48 кадров, `hit: [26]`

Реализован кузнечный удар по своей наковальне: ноги→таз→плечо→руки→молот. Подготовка и удар используют двухручную поддержку. Событие `hit` на 26; численная точность геометрического контакта проверяется в отчёте сборки.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–9 | 0–0.375 | Idle, взгляд на контакт, вес назад, лапа открывает дугу |
| 10–19 | 0.417–0.792 | Грудь и молот назад-вверх; крага помогает хвату |
| 20–22 | 0.833–0.917 | Крайний замах, присед, пауза; лицо открыто |
| 23–25 | 0.958–1.042 | Ноги толкают, плечо ведёт, крага поддерживает рукоять |
| 26 | 1.083 | Рабочий торец `hammerFace == anvilTop`, его плоскость горизонтальна; стоп без проникновения |
| 27–31 | 1.125–1.292 | Отскок молота, локоть и колени гасят отдачу |
| 32–38 | 1.333–1.583 | Подбородок вверх, любуется искрами |
| 39–47 | 1.625–1.958 | Хват, стойка и вторичные цепи в idle |

След: 2–3 ступенчатых серпа по пути грани, выборки 1/48 с. Из контакта 32 искры в трёх горячих тонах со ступенчатым свечением; дуги поднимаются до 29.41 px и видны 20 кадров. На поверхности светится след удара, на полу короткая расходящаяся волна пыли и остывающие крошки. Наковальня не отрывается от пола.

### `tech_ember_wave`: «Дыхание горна», 48 кадров, `hit: [27,30,33]`

Выдох разгоняет три заранее видимых угля из лунки. Аналог — раздуть угли; опора в ногах, сила в сжатии груди. Молот удерживается в стороне.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–8 | 0–0.333 | Присед, открытая зрителю лунка, голова к углям |
| 9–17 | 0.375–0.708 | Вдох, грудь шире, крага не закрывает рот |
| 18–22 | 0.75–0.917 | Выдох от `mouth`, угли загораются на месте |
| 23–26 | 0.958–1.083 | Три последовательных отрыва по видимым дугам |
| 27/30/33 | 1.125/1.25/1.375 | Разные касания пола, тени, отскоки, пятна |
| 34–39 | 1.417–1.625 | Выдох стихает, взгляд следит за посадками |
| 40–47 | 1.667–1.958 | Обратные тлеющие дуги в лунку; idle |

Возвращение углей явно сказочное, но непрерывное. Если 8 кадров мало, сокращается дальность, не добавляется телепортация. След: горячий ломаный веер и хвосты углей; три разнесённых остывающих пятна с тёмной кромкой, без фонтана.

### `tech_tail_stamp`: «Клеймо мастерицы», 48 кадров, `hit: [25]`

Кончик хвоста ставит печать на свободном полу сбоку. Аналог — контролируемая тяжёлая плеть, волна от таза; молот противовесом.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–8 | 0–0.333 | Вес на противоположную лапу, взгляд на пол |
| 9–18 | 0.375–0.75 | Таз против удара, S-хвост поднят, конец нагрет |
| 19–21 | 0.792–0.875 | Крайняя подготовка; хвост не пересекает лапы |
| 22–24 | 0.917–1 | Разворот таза, волна к кончику |
| 25 | 1.042 | `tailContact` на полу; печать возникает здесь |
| 26–31 | 1.083–1.292 | Конец отскакивает, середина догоняет, лапа гасит отдачу |
| 32–39 | 1.333–1.625 | Оценивает знак, крага на груди |
| 40–47 | 1.667–1.958 | Хвост в idle, печать остывает в пыль |

След: узкая S-полоса по пути конца за три кадра. Контакт: овальный знак, центральная полоса, угольная крошка, боковой дымок. `tailTip` — центр кончика; `tailContact` — его нижняя поверхность, именно она касается z=0. Без букв, чужих логотипов и жертв.

## 11. Ходьба и полный поворот

Ходьба на месте, перемещение делает `life`. `n` вверх по экрану в глубину, `e` вправо. Повороты модели настоящие 3D, без зеркалирования; принадлежности сохраняют стороны. Наковальня закреплена сзади, корпус чуть вперёд под грузом.

Цикл: 0–5 первый контакт; 6–11 перенос другой лапы; 12–17 второй контакт; 18–23 возврат первой. Опорная лапа отводится относительно root со скоростью его движения в `life`; носок на переносе 3–5 px. Груз не прыгает отдельно от ремней.

Скорость по полу 18 px/s; `speed` — **экранные px/s**, сдвиг кадра = speed/24. Глубина сжата `sin(35°)`; числа проверяются по реальному шагу. Мировая скорость равна `18/0.94`; yaw для n/ne/e/se/s/sw/w/nw равны −145/−100/−55/−10/35/80/125/170°:

| dir | n | ne | e | se | s | sw | w | nw |
|---|---|---|---|---|---|---|---|---|
| `[dx,dy]` | `[0,-10.324]` | `[12.728,-7.300]` | `[18,0]` | `[12.728,7.300]` | `[0,10.324]` | `[-12.728,7.300]` | `[-18,0]` | `[-12.728,-7.300]` |

В `life` направление сначала меняется десятью кадрами переступания на месте. Внутри каждого 24-кадрового прохода четыре кадра уходят на косинусный разгон и четыре на торможение; средняя скорость равна указанной, пиковая — ×1.2. Дробная фаза одновременно управляет перемещением корня и первичной IK лап, поэтому опорная лапа не скользит. Вторичные смещения берутся из той же походки. Начальная/конечная скорость нулевая, весь маршрут E→N→W→S замкнут.

`turn`: 0–11 переступания; 12–71 полный круг; 72–87 торможение; 88–95 исходная стойка. Наковальня неподвижна на полу; хвост и ремни показывают объём.

## 12. Сон, появление, усталость

`sleep_in`: выдох, переступания на 9/13; 17 глубокий присед с опорой крагой; 21 головка молота полностью на полу; 23 голова на краге и точный `sleep[0]`. На 24–29 технический возврат, в `life` его не играют. Колени решаются с постоянными длинами; подол, ткань и щипцы заранее складываются над бёдрами.

`sleep`: два разных медленных вдоха; расслабляется палец, дрожит конец хвоста. Одна искорка из ноздри с дымной оболочкой остывает и гаснет, без Z. Голова и предметы не скользят; петля замыкает позу и скорость.

`sleep_out`: вход на 5 в сон; 7 глаза; 10 голова; 15 подъём с опорой крагой; переступания на 20/24; 29 idle. На 0–4 входное обрамление.

`wake_startled`: вход на 3 из сна; 5 испуг; 9 отрыв; 11 вершина с `root_z=7`, около 5.4 px и меньшей тенью; 15 тяжёлая посадка; 18 проверка наковальни; 23 idle. Молот остаётся в руке.

`hatch`: 0 idle; 5 компактная поза, молот у плеча; 10 подъём; 15 перелёт с `root_z=1.8`; 19 сжатие и кивок; 24 рабочий хват; 35 idle. Наковальня видна всё время, яйцо рисует игра.

`tired`: плечи вниз, выдох; 11–17 опора крагой на наковальню; 21–24 протирка выпуклой кожи над глазом; 26 крага выходит наружу; 35 idle. Хвост балансирует. Усталость без ранения и гибели.

## 13. Эффекты и сцена

Язык: жар, уголь, окалина, искры, дым. У частицы корка, тёплая середина, светлая кромка. Остывание ступенями жёлтый→янтарный→красный→угольный; размер и яркость убывают отдельно. Частицы имеют мировую высоту, падение, один отскок и затухание; seed фиксирован. У всех трёх приёмов свои эффекты. В `tech_ember_wave` перемещаются три исходных геометрических угля, лунка становится пустой; после касаний тепло меняется ступенями. Их копии на исходном месте не остаются.

Тени остаются на полу: при подскоке тень тела меньше и бледнее; отдельная тень молота зависит от его высоты. Свечение учитывает заслонение поверхностями.

В этапе 2 реализована сцена для превью «Кузня у вулкана»: непрозрачные 160×128, 72 фазы при 24 кадрах/с. y≈99 внутри пола из базальтовых плит; редкие швы и окалина впереди; горн, уголь и тёмная ниша сбоку; склон и узкая лава вдали. Контраст ниже героя, ярких линий за лицом и ногами нет.

В петле угли меняют четыре ступени с разными фазами, две дымные пряди растворяются, лава течёт по фиксированному руслу, редкие искры не закрывают лицо. Сцена используется во всех GIF, включая ходьбу, сон и связный `life`; фаза привязана к глобальному времени ролика. Наземная наковальня не сдвигается вместе с героем: маршрут с грузом сначала замыкается в исходную точку.

## 14. Автономное восстановление и сдача

`python src/forge_salamander.py out/` **по умолчанию строит полный этап 3** с нуля: Python 3 + Pillow + NumPy, без сети, готовых PNG, внешних шрифтов и других файлов репозитория. `--stage 1` строит облик, `--stage 2` — четыре первых клипа с исправленными эффектами.

Вывод: 26 прозрачных `clips/<clip>.png`, 72-фазная `scene/scene.png`, манифест, отдельные GIF ×3, общий `preview/showreel.gif` ×2, `preview/life.gif` ×2, ключи и численные отчёты. Рядом с папкой вывода создаётся ZIP с тем же именем. Самодостаточный исходник и карточка входят в архив.

`life` около 31 с: полный покой → два жеста → кузнечный удар → трюк → радость → видимый подъём наковальни → E/N/W/S по прямоугольнику с живыми поворотами → возврат и разгрузка → усталость → засыпание → сон. Все восемь направлений присутствуют в отдельных полосах и `showreel`. Оба общих ролика проигрываются один раз; `life` останавливается во сне, `showreel` после последнего клипа. Это сохраняет настоящие фазы фона без скачка при принудительном повторе. Точная хронология и длительность находятся в `life-timeline.json` и манифесте; отдельные GIF клипов повторяются.

**`look/reference.png` по умолчанию — процедурный восстановленный лист из той же 3D-геометрии** на `#FF00FF`. Это не imagegen-оригинал и не независимая проверка сходства. Без исходных пикселей оригинал точно восстановить нельзя.

Опция `--reference /path/original.png` сохраняет отдельно предоставленный оригинал и создаёт `comparison-x4.png`. Прежний лист найден локально и использован для сравнения; его пиксели, base64, сжатые данные и шрифтовые payload не встраиваются и не идут в GitHub. В попытке 3 новой генерации нет; число генераций прошлых чатов неизвестно.

Три этапа завершены. В этапе 3 сначала исправлены три замечания к принятому этапу 2, затем добавлены остальные клипы, итоговые превью и архив. GIF больше 25 МиБ делится на части, пути перечисляются в манифесте. В чат выдаются не больше двух изображений и одна ссылка на ZIP; один коммит в конце этапа.

GitHub: ветка `chatgpt-gornila`, папка `tools/creatures/chatgpt/forge_salamander/`, **только `src/forge_salamander.py` и `card.md` текстом**. Без картинок, GIF, zip, base64 и бинарных payload; другие пути не меняются, PR не открывается. В чат без кода, максимум две картинки за этап. Лимит ТЗ на образцы — шесть генераций; анимация кодом.

Финальный локальный вывод: `look/reference.png`, `look/rig-4views.png`, прозрачные `clips/<clip>.png`, непрозрачная `scene/scene.png`, `manifest.json`, `preview/showreel.gif`, `preview/life.gif`, `report.md`. Манифест содержит id, fps, cell, feet, frames, loop, hit, speed, stitch. Эти файлы создаются генератором, не коммитятся.

Проверка облика этапа 2: высоты 77/84/79/81 px, основная 81 px; опора `(77,99)`; 956 примитивов, 43 группы. Маски силуэта совпадают с этапом 1 на >99.7%; при закрытии век радужки и блики скрываются. Статическое вращение модели с наземной и переносимой наковальней проверено отдельно от анимационных контактов.

Финальные проверки: размеры и прозрачность полос, обрезание, контур и NEAREST; idle-концы и петли; длины костей, хват, контакты, высота и тени; пять задерживающихся цепей; 15+ читаемых деталей основного вида и полный список по четырём; открытое лицо и разные приёмы. Отчёт указывает время, строки кода, примитивы, генерации, готовность и отклонения. Сравнение с Исполином использует архивные файлы указанного снимка, не новые вложения. Равенство художественного качества не выдаётся за измеренный факт. Численные результаты контактов и стыков в этой карточке не выдумываются: их фиксирует итоговая проверка генератора.

'''


# Export only procedural geometry. No encoded images, fonts, or cached frames.
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import time
from PIL import ImageFont

CELL = (160, 128)
FEET = (77, 99)
FPS = 24
SCALE = .94
VIEWS = [('front', 0, 'FRONT'), ('right', -90, 'RIGHT PROFILE'),
         ('back', 180, 'BACK'), ('three_quarter', -35, 'THREE QUARTERS')]
BASE_COMMIT = '501dd5c2385d21d3fe48ab1c6fa95f935d33b646'


def ui_font(size):
    """Pillow's bundled font: no system-font or binary-payload dependency."""
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def subset_rig(rig, predicate):
    out = Rig()
    out.primitives = [p for p in rig.primitives if predicate(p)]
    return out


def render_cell(rig, angle=-35):
    renderer = Renderer(width=CELL[0], height=CELL[1], feet=FEET,
                        azimuth=angle, elevation=35, scale=SCALE)
    figure = renderer.render(rig, shadow=True,
                             shadow_radius=(24, 7), shadow_alpha=61)
    floor = Image.new('RGBA', CELL, (0, 0, 0, 0))
    if 'anvilGround' in rig.tags and abs(rig.tags['anvilGround'][2]) < 1e-6:
        x, y, _ = renderer.project(rig.tags['anvilGround'])
        d = ImageDraw.Draw(floor)
        d.ellipse((round(x-11), round(y-4), round(x+11), round(y+4)),
                  fill=INK+(72,))
        d.ellipse((round(x-7), round(y-2), round(x+7), round(y+2)),
                  fill=INK+(98,))
    floor.alpha_composite(figure)
    return floor, renderer


def calculate_checks(rig, angle=-35):
    renderer = Renderer(azimuth=angle, elevation=35, scale=SCALE)
    body = subset_rig(rig, lambda p: not p['group'].startswith(('hammer_', 'anvil_')))
    renderer.render(body, shadow=False)
    body_bbox = renderer.body_mask.getbbox()
    feet = subset_rig(rig, lambda p: p['group'].startswith('leg_'))
    renderer.render(feet, shadow=False)
    feet_bbox = renderer.body_mask.getbbox()
    head_rig = subset_rig(rig, lambda p: p['group'] in ('head', 'jaw', 'crest'))
    renderer.render(head_rig, shadow=False)
    head_bbox = renderer.body_mask.getbbox()
    contacts = (rig.tags['footRContact']+rig.tags['footLContact'])*.5
    anchor = renderer.project(contacts)[:2]
    lengths = {}
    for side in ('R', 'L'):
        shoulder = rig.tags['shoulder'+side]
        elbow = rig.tags['elbow'+side]
        hand = rig.tags['hand'+side]
        lengths[side] = [float(np.linalg.norm(shoulder-elbow)),
                         float(np.linalg.norm(elbow-hand))]
    return dict(body_bbox=body_bbox, head_bbox=head_bbox, feet_bbox=feet_bbox,
                standing_height_px=feet_bbox[3]-head_bbox[1],
                feet_anchor=anchor.tolist(), arm_lengths=lengths)


def normalize_reference(reference, view_checks):
    """Align the recovered 2x2 concept sheet for comparison, never trace it.

    Landmarks were measured on the 1402x1122 image from the first attempt.
    The optional input must be that same four-view sheet (rescaling is OK).
    This function only lays out the comparison; animation uses no reference
    pixels, texture sampling, pasted parts, or image deformation.
    """
    raw = reference.convert('RGBA')
    cw, ch = raw.width//2, raw.height//2
    landmarks = [(311, 17, 525), (250, 8, 527),
                 (320, 16, 529), (324, 14, 541)]
    cells = []
    for i, (anchor_x, top, bottom) in enumerate(landmarks):
        scale_x, scale_y = cw/701., ch/561.
        anchor_x, top, bottom = anchor_x*scale_x, top*scale_y, bottom*scale_y
        crop = raw.crop(((i % 2)*cw, (i//2)*ch, (i % 2+1)*cw, (i//2+1)*ch))
        check = view_checks[VIEWS[i][0]]
        factor = check['standing_height_px']/float(bottom-top)
        size = (max(1, round(cw*factor)), max(1, round(ch*factor)))
        scaled = crop.resize(size, Image.Resampling.NEAREST)
        origin = (77-round(anchor_x*factor),
                  check['feet_bbox'][3]-round(bottom*factor))
        tile = Image.new('RGBA', CELL, '#ff00ff')
        tile.alpha_composite(scaled, origin)
        cells.append(tile)
    return cells


def make_grid(cells):
    grid = Image.new('RGBA', (320, 256), '#ff00ff')
    for i, tile in enumerate(cells):
        grid.paste(tile, ((i % 2)*160, (i//2)*128))
    return grid


def comparison_sheet(reference_cells, rig_cells, checks):
    width, header, row_h, footer = 1344, 132, 557, 64
    sheet = Image.new('RGB', (width, header+row_h*4+footer), '#24232a')
    d = ImageDraw.Draw(sheet)
    d.text((24, 17), 'GORNILA / STAGE 1', font=ui_font(30), fill='#efd4a0')
    d.text((24, 60), 'ORIGINAL CONCEPT', font=ui_font(19), fill='#d2c7bb')
    d.text((688, 60), 'PYTHON 3D RIG', font=ui_font(19), fill='#d2c7bb')
    d.text((24, 93), 'Aligned standing height / native 160x128 cells at exact 4x',
           font=ui_font(17), fill='#afa9a4')
    for i, ((name, angle, title), ref, rig) in enumerate(zip(VIEWS, reference_cells, rig_cells)):
        y = header+i*row_h
        d.text((24, y), title, font=ui_font(18), fill='#d9bc84')
        d.text((688, y), '160x128 / camera %s / elevation 35' % angle,
               font=ui_font(17), fill='#afa9a4')
        for tile, x in ((ref, 24), (rig, 688)):
            sheet.paste(tile.convert('RGB').resize((640, 512), Image.Resampling.NEAREST),
                        (x, y+30))
    height = checks['three_quarter']['standing_height_px']
    d.text((24, header+row_h*4+9),
           '3/4 height: %s px / feet: (77, 99) / four material tones' % height,
           font=ui_font(18), fill='#d2c7bb')
    return sheet


def stage1_report(checks, render_seconds):
    original = checks['reference']['kind'] == 'supplied_original'
    reference_note = (
        'Передан исходный лист через `--reference`: в `look/reference.png` сохранён '
        'оригинал, создан лист `look/comparison-x4.png`. Изображение не используется '
        'для рисования геометрии, фактуры или кадров.' if original else
        '`look/reference.png` — программно восстановленный лист из того же рига, '
        '**не исходная генерация**. Оригинал не может пересоздаваться побайтно '
        'без его файла или встроенных бинарных данных. Для сравнения передай '
        'сохранённый лист через `--reference /path/reference.png`. Без него '
        'самосравнение рига с собой не создаётся.')
    heights = ', '.join('%s: %s px' % (name, check['standing_height_px'])
                        for name, check in checks['views'].items())
    return f'''# Горнила: этап 1

## Результат

Восстановлены геометрия и облик из предыдущей попытки. Собран автономный статический
Python-риг: четыре вида, кадр покоя, отдельный слой свечения и подробная карточка.
В GitHub предназначены только `src/forge_salamander.py` и `card.md`; все изображения
строятся локально. Двоичных вложений, закодированных картинок и шрифтов в исходнике нет.

{reference_note}

## Измерения

| Параметр | Значение |
|---|---:|
| Ячейка | 160 × 128 px |
| Опора | (77, 99) |
| Рост в основном ракурсе | {checks['views']['three_quarter']['standing_height_px']} px |
| Примитивы в покое | {checks['primitives']} |
| Группы геометрии | {checks['groups']} |
| Примитивы молота | {checks['hammer_primitives']} |
| Примитивы наковальни | {checks['anvil_primitives']} |
| Строк исходника | {checks['source_lines']} |
| Размер исходника | {checks['source_bytes']} байт |
| Генерации картинок в этой попытке | 0 |
| Новые кадры анимации | 0 |
| Время построения этого комплекта | {render_seconds:.2f} с |

Рост по видам: {heights}. Время выше — повторный рендер, а не длительность разработки.
Предыдущая попытка использовала один лист imagegen; новая генерация не выполнялась.
Полный набор измерений и контрольные суммы записаны в `stage1-checks.json`.

## Устройство

Ортографическая камера в основном ракурсе имеет азимут −35° и высоту 35°.
Эллипсоиды и сужающиеся капсулы пересекаются с лучами аналитически; грани коробок
и лент проходят тот же буфер глубины. Шаг — один пиксель, сглаживания нет.
Фактуры заданы в координатах деталей. Каждая палитра содержит четыре тона;
внешний контур — один пиксель `#150f0b`, внутренний определяется перекрытиями.
Свечение лежит отдельно в `look/idle0-lit.png`, тени находятся под фигурой.

Модель хранит точки ладоней, хвата, ударной части молота, поверхности наковальни,
ступней и кончика хвоста. Руки имеют решатель двух костей 17 и 14,5 единицы.
Наковальня и молот — постоянные геометрические объекты, а не вставленные картинки.

## Проверки

Проверены размер всех четырёх ячеек, отсутствие обрезания, высота 70–84 px,
центр опоры (77, 99), длины рук, четыре тона материалов и слой свечения.
Изображения строятся детерминированно; анимация в этой стадии отсутствует.
`manifest.json` честно содержит пустой `clips`: один статический кадр не выдаётся
за 84-кадровый idle. Пять вторичных цепей пока заданы параметрами, без пружин во времени.

## Ограничения

Оригинальный образец и программный риг отличаются рисунком отдельных пятен,
складок и граней. У рига заметнее вид сверху, металл светлее, глаз компактнее.
Два эталонных изображения исполина в доступных вложениях этой попытки отсутствуют;
сравнение «не хуже» по ним не проводилось. Восстановленный исходный лист Горнилы
доступен локально и используется только как образец облика.

Анимации, фон, GIF, полосы клипов и итоговый ZIP относятся к этапам 2–3.
Текущая версия ждёт слова «дальше» после просмотра этапа 1.

## Запуск

`python src/forge_salamander.py out/` — весь автономный комплект этапа 1.

`python src/forge_salamander.py out/ --reference original.png` — тот же комплект
и сравнение с исходным четырёхвидовым листом. Нужны только Python 3, Pillow и NumPy.
'''


def generate_stage1(out, reference=None):
    started = time.perf_counter()
    out = Path(out)
    look, srcdir = out/'look', out/'src'
    # Read first: the reference may itself be from an older output directory.
    supplied = None
    supplied_png_bytes = None
    if reference is not None:
        with Image.open(reference) as im:
            if im.format == 'PNG':
                supplied_png_bytes = Path(reference).read_bytes()
            supplied = im.convert('RGBA')
        if supplied.width < 4 or supplied.height < 4:
            raise ValueError('Reference must be the original four-view sheet')
    look.mkdir(parents=True, exist_ok=True)
    srcdir.mkdir(parents=True, exist_ok=True)
    rig = build_model()
    cells, view_checks = [], {}
    for name, angle, title in VIEWS:
        rgba, renderer = render_cell(rig, angle)
        rgba.save(look/(name+'.png'))
        tile = Image.new('RGBA', CELL, '#ff00ff')
        tile.alpha_composite(rgba)
        cells.append(tile)
        check = calculate_checks(rig, angle)
        check['render_stats'] = dict(renderer.stats)
        check['image_bbox'] = rgba.getbbox()
        view_checks[name] = check
        if name == 'three_quarter':
            rgba.save(look/'idle0.png')
            renderer.lit.save(look/'idle0-lit.png')
            solid = Image.new('RGBA', CELL, '#39333c')
            solid.alpha_composite(rgba)
            solid.convert('RGB').resize((640, 512), Image.Resampling.NEAREST).save(look/'idle0-x4.png')
    grid = make_grid(cells)
    grid.save(look/'rig-4views.png')
    grid.resize((1280, 1024), Image.Resampling.NEAREST).save(look/'rig-4views-x4.png')
    if supplied is not None:
        if supplied_png_bytes is not None:
            (look/'reference.png').write_bytes(supplied_png_bytes)
        else:
            supplied.save(look/'reference.png')
        refs = normalize_reference(supplied, view_checks)
        make_grid(refs).save(look/'reference-normalized.png')
        comparison_sheet(refs, cells, view_checks).save(look/'comparison-x4.png')
        reference_info = {'kind': 'supplied_original',
                          'animation_uses_reference_pixels': False}
    else:
        grid.save(look/'reference.png')
        reference_info = {'kind': 'procedural_reconstruction',
                          'is_original_imagegen': False,
                          'animation_uses_reference_pixels': False}
        # Remove only this generator's optional stale comparison files.
        for filename in ('comparison-x4.png', 'reference-normalized.png'):
            old = look/filename
            if old.exists():
                old.unlink()
    (look/'reference-info.json').write_text(
        json.dumps(reference_info, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    source = Path(__file__).read_bytes()
    destination = srcdir/'forge_salamander.py'
    if destination.resolve() != Path(__file__).resolve():
        destination.write_bytes(source)
    (out/'card.md').write_text(CARD_TEXT, encoding='utf-8')
    checks = {
        'id': 'forge_salamander', 'stage': 1, 'stage_status': 'awaiting_user_review',
        'fps': FPS, 'cell': list(CELL), 'feet': list(FEET),
        'base_branch': 'bosses-art', 'base_commit': BASE_COMMIT,
        'image_generations_this_attempt': 0, 'previous_reference_generations': 1,
        'primitives': rig.size, 'groups': len(set(p['group'] for p in rig.primitives)),
        'primitive_types': dict(Counter(p['kind'] for p in rig.primitives)),
        'hammer_primitives': rig.tags['hammerPrimitiveCount'],
        'anvil_primitives': rig.tags['anvilPrimitiveCount'],
        'material_tones': {k: list(m.tones) for k, m in M.items()},
        'views': view_checks, 'source_lines': len(source.splitlines()),
        'source_bytes': len(source), 'source_sha256': hashlib.sha256(source).hexdigest(),
        'reference': reference_info, 'secondary_motion_rendered': False,
        'animation_clips_rendered': []}
    for check in view_checks.values():
        if not np.allclose(check['feet_anchor'], FEET, atol=1e-9):
            raise RuntimeError('Feet anchor is not (77, 99)')
        if not 70 <= check['standing_height_px'] <= 84:
            raise RuntimeError('Standing height is outside 70..84 pixels')
        x0, y0, x1, y1 = check['image_bbox']
        if not (0 < x0 < x1 < CELL[0] and 0 < y0 < y1 < CELL[1]):
            raise RuntimeError('A view is clipped by the cell edge')
        for lengths in check['arm_lengths'].values():
            if not np.allclose(lengths, [17., 14.5], atol=1e-9):
                raise RuntimeError('IK changed an arm length')
    manifest = {'id': 'forge_salamander', 'fps': FPS,
                'cell': list(CELL), 'feet': list(FEET), 'clips': {},
                'stage': 1, 'stage_status': 'awaiting_user_review',
                'reference': reference_info}
    for filename, data in (('stage1-checks.json', checks), ('manifest.json', manifest)):
        (out/filename).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    seconds = time.perf_counter()-started
    (out/'report.md').write_text(stage1_report(checks, seconds), encoding='utf-8')
    print(json.dumps({'out': str(out.resolve()), 'stage': 1,
                      'primitives': rig.size,
                      'height': checks['views']['three_quarter']['standing_height_px'],
                      'reference': reference_info['kind'],
                      'render_seconds': round(seconds, 3)}, ensure_ascii=False))



# Stage 2: deterministic key poses, physical prop flight and delayed springs.
CLIP_SPECS = {
    'idle': {'frames': 84, 'loop': True},
    'trick': {'frames': 96, 'loop': False, 'release': 18, 'catch': 46, 'hit': [56]},
    'happy': {'frames': 48, 'loop': False, 'foot_contact': [14, 23, 35]},
    'tech_anvil': {'frames': 48, 'loop': False, 'hit': [26]},
}


def stage2_smooth(t):
    t = float(np.clip(t, 0., 1.))
    return t*t*(3.-2.*t)


def stage2_key_pose(keys, frame):
    """All keys are complete poses relative to the same neutral defaults."""
    neutral = Pose()
    if frame <= keys[0][0]:
        return dict(keys[0][1])
    if frame >= keys[-1][0]:
        return dict(keys[-1][1])
    for (fa, a), (fb, b) in zip(keys, keys[1:]):
        if fa <= frame <= fb:
            t = stage2_smooth((frame-fa)/(fb-fa))
            out = {}
            for name in set(a) | set(b):
                av, bv = a.get(name, getattr(neutral, name)), b.get(name, getattr(neutral, name))
                if isinstance(av, bool):
                    out[name] = av if t < .5 else bv
                elif isinstance(av, tuple):
                    out[name] = tuple(np.asarray(av)*(1.-t)+np.asarray(bv)*t)
                else:
                    out[name] = float(av)*(1.-t)+float(bv)*t
            return out
    raise RuntimeError('Unsorted animation keys')


def stage2_body_frame(p):
    return F().at(p.body_x, p.body_y, p.body_z).at(0,0,40).rx(p.body_pitch).ry(p.body_roll).at(0,0,-40)


def stage2_world_hammer(p, origin, rotation):
    """Specify the prop in world space; convert once into the rotating rig."""
    yaw = F().rz(p.body_yaw).R
    local_origin = yaw.T @ (np.asarray(origin, float)-np.array([0.,0.,p.root_z]))
    return replace(p, hammer_pos=tuple(local_origin),
                   hammer_basis=tuple(map(tuple, yaw.T @ rotation)))


def stage2_hammer_frame(p):
    rotation = (np.asarray(p.hammer_basis) if p.hammer_basis is not None else
                F().rx(p.hammer_rot[0]).ry(p.hammer_rot[1]).rz(p.hammer_rot[2]).R)
    yaw = F().rz(p.body_yaw).R
    return F(yaw @ np.asarray(p.hammer_pos)+np.array([0.,0.,p.root_z]), yaw @ rotation)


def stage2_strike_rotation():
    # The real striking face is local -X. Its normal points straight down;
    # the handle remains horizontal between the hands and the anvil.
    up = np.array([0., 0., 1.])
    shaft = unit([.8, .6, 0.])
    side = np.cross(shaft, up)
    return np.column_stack((up, side, shaft))


def stage2_contact_pose(p, lift=0.):
    contact = np.array([31.,30.,31.05])+np.array([0.,0.,float(lift)])
    rotation = stage2_strike_rotation()
    return stage2_world_hammer(p, contact-rotation @ np.array([-9.,0.,22.]), rotation)


def tech_anvil_target(frame):
    f = float(frame)
    keys = [
        (0, {}),
        (8, dict(body_z=-3, body_pitch=7, body_roll=-5, body_yaw=-4,
                 head_yaw=14, hammer_pos=(-22,0,66), hammer_rot=(-25,-24,-5),
                 left_hand=(12,8,60))),
        (18, dict(body_z=-6, body_pitch=11, body_roll=-7, body_yaw=-16,
                  head_yaw=16, hammer_pos=(-20,-6,70), hammer_rot=(-20,-40,-8),
                  left_grip=1., left_hand=(-6,0,70))),
        (22, dict(body_z=-7, body_pitch=12, body_roll=-8, body_yaw=-17,
                  head_yaw=18, hammer_pos=(-20,-6,70), hammer_rot=(-20,-40,-8),
                  left_grip=1., left_hand=(-5,1,70))),
        (26, dict(body_x=8, body_y=3, body_z=-8, body_pitch=-24, body_roll=7,
                  body_yaw=-24, head_yaw=22, head_pitch=19, left_grip=1.)),
        (27, dict(body_x=8, body_y=3, body_z=-8, body_pitch=-24, body_roll=7,
                  body_yaw=-24, head_yaw=22, head_pitch=19, left_grip=1.)),
        (31, dict(body_x=6, body_y=2, body_z=-5, body_pitch=-12, body_roll=4,
                  body_yaw=-20, head_yaw=16, head_pitch=11, left_grip=.65,
                  hammer_pos=(6,14,61), hammer_rot=(53,-16,-5), left_hand=(17,14,52))),
        (37, dict(body_z=1, body_pitch=-3, body_roll=2, head_yaw=15, head_pitch=5,
                  body_yaw=-5, hammer_pos=(-9,12,66), hammer_rot=(15,-30,-8),
                  left_hand=(20,12,54), smile=.9)),
        (42, dict(body_z=-.5, head_yaw=5, head_pitch=10,
                  hammer_pos=(-22,10,64), hammer_rot=(3,-15,-3))),
        (47, {}),
    ]
    p = replace(Pose(), **stage2_key_pose(keys, f))
    # The last four frames of the swing interpolate the actual prop frame,
    # not a disconnected effect. Both hands use that frame as their IK goal.
    if 22 <= f <= 27:
        prepared = replace(Pose(), **dict(keys[3][1]))
        hp = stage2_hammer_frame(prepared)
        hit = stage2_contact_pose(p)
        hh = stage2_hammer_frame(hit)
        u = stage2_smooth((f-22)/4.)
        # Rotation follows an explicit arc with the face ending exactly flat.
        rot = _stage2_rotation_mix(hp.R, hh.R, u)
        head_start, head_end = hp.p(0,0,22), hh.p(0,0,22)
        head = head_start*(1-u)+head_end*u+np.array([0.,-5*math.sin(math.pi*u),8*math.sin(math.pi*u)])
        p = stage2_world_hammer(p, head-rot @ np.array([0.,0.,22.]), rot)
    elif 27 < f < 31:
        hit_p = stage2_contact_pose(p)
        hit_h, end_h = stage2_hammer_frame(hit_p), stage2_hammer_frame(p)
        u = stage2_smooth((f-27)/4.)
        rot = _stage2_rotation_mix(hit_h.R, end_h.R, u)
        center = hit_h.p(0,0,22)*(1-u)+end_h.p(0,0,22)*u
        p = stage2_world_hammer(p, center-rot @ np.array([0.,0.,22.]), rot)
    return p


def _stage2_rotation_mix(a, b, t):
    # Shortest rotation on SO(3), preserving rigid prop dimensions throughout.
    delta = a.T @ b
    angle = math.acos(float(np.clip((np.trace(delta)-1)*.5, -1., 1.)))
    if angle < 1e-8:
        return a.copy()
    axis = unit([delta[2,1]-delta[1,2], delta[0,2]-delta[2,0], delta[1,0]-delta[0,1]])
    if np.linalg.norm(axis) < .5:
        vals, vecs = np.linalg.eig(delta)
        axis = unit(np.real(vecs[:,np.argmin(np.abs(vals-1))]))
    x,y,z = axis
    skew = np.array([[0,-z,y],[z,0,-x],[-y,x,0]])
    theta = angle*float(t)
    return a @ (np.eye(3)+math.sin(theta)*skew+(1-math.cos(theta))*(skew@skew))


def stage2_flight(u):
    """A real 3-D parabola, rotating about the heavy hammer head."""
    start = np.array([2.,18.,88.])
    end = np.array([-21.,6.,82.])
    u = float(np.clip(u,0.,1.))
    center = start*(1-u)+end*u+np.array([0.,0.,4*43*u*(1-u)])
    # Two complete rigid turns, visible as an ellipse in the fixed camera.
    # The oblique axis limits the handle's vertical sweep, not its real size.
    az, el = math.radians(-35.), math.radians(35.)
    right = np.array([math.cos(az),-math.sin(az),0.])
    up = np.array([-math.sin(az)*math.sin(el),-math.cos(az)*math.sin(el),math.cos(el)])
    view = np.array([math.sin(az)*math.cos(el),math.cos(az)*math.cos(el),math.sin(el)])
    axis = unit(up*.975+view*.22)
    # The wide striking ends face into depth at the apex; the shaft still
    # traces two full visible ellipses without changing any prop dimensions.
    basis = np.column_stack((unit(np.cross(right,axis)),-axis,right))
    x, y, z = axis
    skew = np.array([[0.,-z,y],[z,0.,-x],[-y,x,0.]])
    angle = 2.*math.tau*u
    spin = np.eye(3)+math.sin(angle)*skew+(1-math.cos(angle))*(skew@skew)
    rotation = spin @ basis
    return center, rotation


def trick_target(frame):
    f = float(frame)
    keys = [
        (0, {}),
        (9, dict(body_z=-4, body_pitch=8, body_roll=-5, head_pitch=8,
                 hammer_pos=(-29,5,57), hammer_rot=(17,-35,-8),
                 left_hand=(24,8,52))),
        (14, dict(body_z=-8, body_pitch=13, body_roll=-7, head_pitch=5,
                  hammer_pos=(-27,0,49), hammer_rot=(48,-55,-4),
                  left_hand=(25,6,55))),
        (18, dict(body_z=1, body_pitch=-4, body_roll=4, head_pitch=16,
                  right_hand=(-8,19,67), left_hand=(26,9,58), jaw_open=.10)),
        (25, dict(body_z=-16, body_pitch=5, body_roll=-2, head_pitch=35, head_yaw=8,
                  right_hand=(-22,14,57), left_hand=(25,11,51), hand_open=1., jaw_open=.85)),
        (33, dict(body_z=-20, body_pitch=0, body_roll=1, head_pitch=30,
                  head_yaw=15, right_hand=(-20,16,53), left_hand=(25,9,48),
                  hand_open=1., jaw_open=.20)),
        (40, dict(body_z=-12, body_pitch=4, body_roll=4, head_pitch=24,
                  head_yaw=18, right_hand=(-8,17,60), left_hand=(26,10,51),
                  hand_open=1., jaw_open=0.)),
        (46, dict(body_z=0, body_pitch=-4, body_roll=3, head_pitch=12, head_yaw=16,
                  right_hand=(5,19,64), left_hand=(21,14,55))),
        (49, dict(body_z=-8, body_pitch=5, body_roll=-5, body_yaw=-8,
                  hammer_pos=(-25,-3,70), hammer_rot=(-17,-32,-6),
                  head_yaw=14, left_grip=.8, left_hand=(13,10,61))),
        (52, dict(body_z=-7, body_pitch=11, body_roll=-7, body_yaw=-17,
                  hammer_pos=(-20,-6,70), hammer_rot=(-20,-40,-8),
                  head_yaw=18, left_grip=1.)),
        (56, dict(body_x=8, body_y=3, body_z=-8, body_pitch=-24, body_roll=7,
                  body_yaw=-24, head_yaw=22, head_pitch=19, left_grip=1.)),
        (57, dict(body_x=8, body_y=3, body_z=-8, body_pitch=-24, body_roll=7,
                  body_yaw=-24, head_yaw=22, head_pitch=19, left_grip=1.)),
        (63, dict(body_z=-2, body_pitch=-4, body_roll=2, body_yaw=-8,
                  head_yaw=12, head_pitch=2, hammer_pos=(-17,10,66),
                  hammer_rot=(5,-17,-2), left_hand=(20,12,57), smile=1.)),
        (70, dict(body_z=1, body_pitch=-5, body_roll=-2, head_pitch=5,
                  head_yaw=8, left_hand=(10,17,62), smile=1.)),
        (78, dict(body_z=-5, body_pitch=-25, body_roll=1, head_pitch=30,
                  hammer_pos=(-25,18,54), hammer_rot=(18,-15,-8),
                  left_hand=(8,23,55), smile=.7)),
        (84, dict(body_z=-2, body_pitch=-9, head_pitch=21,
                  hammer_pos=(-25,11,60), hammer_rot=(8,-12,-4),
                  left_hand=(14,17,51))),
        (89, {}), (95, {}),
    ]
    p = replace(Pose(), **stage2_key_pose(keys, f))
    if 14 <= f < 18:
        start_p = replace(Pose(), **keys[2][1])
        first = stage2_hammer_frame(start_p)
        center, rot = stage2_flight(0.)
        u = stage2_smooth((f-14)/4.)
        basis = _stage2_rotation_mix(first.R, rot, u)
        c = first.p(0,0,22)*(1-u)+center*u
        p = stage2_world_hammer(p, c-basis @ np.array([0.,0.,22.]), basis)
    elif 18 <= f <= 46:
        u = (f-18)/28.
        center, rot = stage2_flight(u)
        p = stage2_world_hammer(p, center-rot @ np.array([0.,0.,22.]), rot)
        p = replace(p, hammer_free=(f < 46))
        # Release and catch have the exact same hand/tool position. The open
        # palm then follows its own reachable arc, never chasing the prop.
        if f < 21:
            hand = np.asarray(p.hammer_pos)*(1-stage2_smooth((f-18)/3.)) + np.array([-20.,14.,67.])*stage2_smooth((f-18)/3.)
            p = replace(p,right_hand=tuple(hand),hand_open=stage2_smooth((f-18)/3.))
        if f > 42:
            end_center,end_rot = stage2_flight(1.)
            end_hand = end_center-end_rot @ np.array([0.,0.,22.])
            u_c = stage2_smooth((f-42)/4.)
            p = replace(p,right_hand=tuple(np.asarray(p.right_hand)*(1-u_c)+end_hand*u_c),
                        hand_open=1-u_c)
    elif 46 < f < 49:
        end_center,end_rot = stage2_flight(1.)
        h = stage2_hammer_frame(p)
        u = stage2_smooth((f-46)/3.)
        basis = _stage2_rotation_mix(end_rot,h.R,u)
        center = end_center*(1-u)+h.p(0,0,22)*u
        p = stage2_world_hammer(p,center-basis @ np.array([0.,0.,22.]),basis)
    elif 52 <= f <= 57:
        # Reuse the evaluated strike arc, retaining this clip's head expression.
        hit_motion = tech_anvil_target(f-30)
        p = replace(p,hammer_pos=hit_motion.hammer_pos,hammer_basis=hit_motion.hammer_basis)
    elif 57 < f < 63:
        hit = stage2_hammer_frame(stage2_contact_pose(p))
        h = stage2_hammer_frame(p)
        u = stage2_smooth((f-57)/6.)
        basis = _stage2_rotation_mix(hit.R,h.R,u)
        center = hit.p(0,0,22)*(1-u)+h.p(0,0,22)*u
        p = stage2_world_hammer(p,center-basis @ np.array([0.,0.,22.]),basis)
    return p


def stage2_raw_pose(clip, frame):
    count = CLIP_SPECS[clip]['frames']
    if clip != 'idle' and (frame <= 0 or frame >= count-1):
        return Pose()
    if clip == 'idle': return replace(Pose(), **idle_target(float(frame) % count))
    if clip == 'happy': return replace(Pose(), **happy_target(frame))
    if clip == 'trick': return trick_target(frame)
    if clip == 'tech_anvil': return tech_anvil_target(frame)
    raise ValueError('Unknown clip '+clip)


def stage2_secondary(clip, poses):
    """Five damped systems, each driven by a different delayed body motion."""
    count = len(poses)
    loop = bool(CLIP_SPECS[clip]['loop'])
    targets = np.array([[p.body_yaw*.32-p.body_roll*.9+p.body_pitch*.18,
                         p.body_pitch*.65-p.body_z*.6,
                         p.body_roll*.65+p.body_pitch*.22,
                         (p.head_pitch-Pose().head_pitch)*.25,
                         p.body_pitch*.48+p.body_roll*.6] for p in poses])
    if clip=='turn':
        # A full revolution stores no spring displacement. Use shortest-angle
        # angular velocity, so the equivalent 360 -> 0 reset gives zero speed.
        yaw=np.array([p.body_yaw for p in poses])
        velocity=np.r_[0.,(np.diff(yaw)+180.)%360.-180.]
        velocity=np.convolve(np.pad(velocity,(1,1),mode='edge'),[.25,.5,.25],mode='valid')
        targets[:,0]=velocity*.96-np.array([p.body_roll*.9-p.body_pitch*.18 for p in poses])
    # The explicit queue plus this spring filter yields measured lags 3/2/4/2/3.
    delays = np.array([1,0,2,0,1])
    stiffness = np.array([.22,.30,.26,.33,.24])
    damping = np.array([.63,.58,.62,.54,.64])
    state = np.zeros(5); velocity = np.zeros(5); output=[]
    cycles = 5 if loop else 1
    for index in range(count*cycles):
        f=index % count
        delayed=np.array([targets[(f-int(d)) % count,j] if loop or f>=d else 0.
                          for j,d in enumerate(delays)])
        velocity=(velocity+(delayed-state)*stiffness)*damping
        state=state+velocity
        if index >= count*(cycles-1):output.append(state.copy())
    output=np.asarray(output)
    if loop:output-=output[0]
    result=[]
    for f,(p,values) in enumerate(zip(poses,output)):
        fade=1. if loop else stage2_smooth(f/4.)*stage2_smooth((count-1-f)/8.)
        tail,apron_lag,strap_lag,crest_lag,cloth_lag=values*fade
        wave=[tail*(.5+j*.18) for j in range(6)]
        if clip=='idle':
            wave=[v*3.0+.1*(math.sin(math.tau*f/count-j*.35)-math.sin(-j*.35)) for j,v in enumerate(wave)]
        gain=float(p.secondary_gain)
        p=replace(p,tail=tuple(a+gain*b for a,b in zip(p.tail,wave)),
                  apron=(p.apron[0]+gain*apron_lag,p.apron[1]+gain*apron_lag*.82),
                  straps=(p.straps[0]+gain*strap_lag,p.straps[1]+gain*strap_lag*.8),
                  crest=p.crest+gain*crest_lag,cloth=p.cloth+gain*cloth_lag,
                  tongs=p.tongs+gain*cloth_lag*.67)
        if not loop and (f in (0,count-1) or (clip=='turn' and f>=88)):p=Pose()
        result.append(p)
    return result


def stage2_meta(clip, frame, pose, tags):
    hit=CLIP_SPECS[clip].get('hit',[None])[0]
    meta={'hit_frame':hit,'contact':tuple(tags['anvilTop']),
          'air':bool(pose.hammer_free),'air_height':0.,
          'hammer_center':tuple(tags['hammerHead']),
          'ring_center':None,'ring_radius':0.,'ring_normal':None,'ring_progress':0.,
          'plume_active':False,'plume_progress':0.,'star':clip=='trick'}
    if clip=='trick':
        # Cross the gate on the ascent, then rise another nine world units.
        center,_=stage2_flight(.25)
        if 19 <= frame <= 32:
            meta.update(ring_center=tuple(center),ring_radius=13.,
                        ring_normal=tuple(unit([-23.,-12.,80.])),
                        ring_crossing_frame=25,ring_progress=(frame-22)/10.,
                        plume_active=19 <= frame <= 30,
                        plume_progress=(frame-19)/11.)
        meta['air_height']=max(0.,float(tags['hammerHead'][2]))
    if clip=='happy':
        meta['foot_contacts']={14:tuple(tags['footRContact']),23:tuple(tags['footLContact']),35:(0.,0.,0.)}
    if clip in ('trick','tech_anvil') and hit is not None and hit-4 <= frame <= hit+2:
        points=[]
        for delta in (2.,1.5,1.,.5,0.):
            q=stage2_raw_pose(clip,max(0.,frame-delta))
            points.append(tuple(stage2_hammer_frame(q).p(-9,0,22)))
        meta['smear_points']=points
    return meta

# Stage 2 authored motion targets. Paste below Pose/F in the generator.
# All coordinates are absolute character-local Pose targets. Secondary motion
# belongs to the shared spring pass, never to these key tracks.

def _ih_rotate_xyz(point, degrees):
    """Rx @ Ry @ Rz, matching F.rx(...).ry(...).rz(...)."""
    x, y, z = map(float, point)
    ax, ay, az = (math.radians(float(a)) for a in degrees)
    x, y = math.cos(az)*x-math.sin(az)*y, math.sin(az)*x+math.cos(az)*y
    x, z = math.cos(ay)*x+math.sin(ay)*z, -math.sin(ay)*x+math.cos(ay)*z
    y, z = math.cos(ax)*y-math.sin(ax)*z, math.sin(ax)*y+math.cos(ax)*z
    return (x, y, z)


def _ih_palm_wrist(hammer_pos, hammer_rot):
    """Wrist whose actual glove top touches the underside of the head.

    The glove palm ellipsoid lives at G(0,1,-2.2), rz=-5/rx=-10,
    radius z=5. Its top is G(0,1,2.8), not the wrist origin.
    At both contacts the head underside and glove tangent planes match,
    even though the head is turned around its shaft to expose the glove.
    """
    face = _ih_rotate_xyz((-4.5, 0., 17.), hammer_rot)
    palm = _ih_rotate_xyz((0., 1., 2.8), (-10., 0., -5.))
    return tuple(float(a+b-c) for a,b,c in zip(hammer_pos, face, palm))


def _ih_key_pose(keys, frame):
    """Missing fields at EACH key mean Pose() values, not carried values.

    Optional third key item is the easing toward the following key:
    'smooth' for deliberate motion, 'in' to accelerate into an impact,
    'out' for a fast rebound. Tuple-valued targets interpolate componentwise.
    """
    neutral = Pose()
    fields = set().union(*(row[1] for row in keys))
    if frame <= keys[0][0]:
        return dict(keys[0][1])
    if frame >= keys[-1][0]:
        return dict(keys[-1][1])
    for left, right in zip(keys, keys[1:]):
        if left[0] <= frame <= right[0]:
            u = (float(frame)-left[0])/(right[0]-left[0])
            ease = left[2] if len(left)>2 else 'smooth'
            if ease == 'in':
                u = u*u
            elif ease == 'out':
                u = 1.-(1.-u)*(1.-u)
            else:
                u = u*u*(3.-2.*u)
            result = {}
            for field in fields:
                default = getattr(neutral, field, 0.)
                a = left[1].get(field, default)
                b = right[1].get(field, default)
                if isinstance(a, (tuple,list)):
                    result[field] = tuple(float(x+(y-x)*u) for x,y in zip(a,b))
                else:
                    result[field] = float(a+(b-a)*u)
            return result
    return {}


_IH_TAP_POS = (2., 22., 45.)
_IH_TAP_ROT = (-10., 0., 175.)
_IH_PALM = _ih_palm_wrist(_IH_TAP_POS, _IH_TAP_ROT)
_IH_PALM_YIELD = tuple(v-(.65 if i==2 else 0.) for i,v in enumerate(_IH_PALM))
_IH_PALM_PREP = tuple(v-(8. if i==2 else 0.) for i,v in enumerate(_IH_PALM))
_IH_PALM_NEAR = tuple(v-(4. if i==2 else 0.) for i,v in enumerate(_IH_PALM))
_IH_IDLE_TAP_FRAMES = (24, 36)

# Prepare the glove low in front, then let it rise gently into each tap.
# Contact frames 24 and 36 share EXACT face/palm tangent points. Both hands
# then leave the centre, opening the chest and face for the quiet idle tail.
# The gesture is low and forward: the glove projects beside the apron.
# Cocking the head forward before each tap shows a 3+ px diagonal gap;
# the lifted snout stays separate from the moving head of the hammer.
_IH_IDLE_KEYS = [
    (0, {}),
    (8, dict(body_z=1.05, body_roll=-.65, head_pitch=15.,
             hammer_pos=(-25.4,9.,63.), left_hand=(22.5,10.,46.))),
    (14, dict(body_z=-1.1, body_pitch=-2.8, body_roll=.6,
              head_pitch=16., head_yaw=-3.,
              hammer_pos=(-10.,19.,54.), hammer_rot=(-18.,6.,85.),
              left_hand=(7.,22.,54.),
              right_elbow=(-25.,8.,48.), left_elbow=(28.,9.,54.))),
    (20, dict(body_z=-2.8, body_pitch=-6., body_roll=1.4,
              head_pitch=19., head_yaw=-3.,
              hammer_pos=(5.5,23.,57.), hammer_rot=(-27.,0.,175.),
              left_hand=_IH_PALM_PREP,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,53.))),
    (22, dict(body_z=-2.8, body_pitch=-6., body_roll=1.4,
              head_pitch=19., head_yaw=-3.,
              hammer_pos=(4.,23.,56.), hammer_rot=(-20.,0.,175.),
              left_hand=_IH_PALM_NEAR,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,53.)), 'in'),
    (24, dict(body_z=-3.5, body_pitch=-6.2, body_roll=1.4,
              head_pitch=18., head_yaw=-3.,
              hammer_pos=_IH_TAP_POS, hammer_rot=_IH_TAP_ROT,
              left_hand=_IH_PALM,
              right_elbow=(-22.,10.,44.), left_elbow=(28.,11.,52.5)), 'out'),
    (26, dict(body_z=-3.2, body_pitch=-6.4, body_roll=1.2,
              head_pitch=18.5, head_yaw=-2.,
              hammer_pos=(4.5,23.,54.8), hammer_rot=(-23.,0.,175.),
              left_hand=_IH_PALM_YIELD,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,52.))),
    (31, dict(body_z=-2.8, body_pitch=-6., body_roll=1.4,
              head_pitch=19., head_yaw=-1.,
              hammer_pos=(5.5,23.,56.8), hammer_rot=(-27.,0.,175.),
              left_hand=_IH_PALM_PREP,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,53.))),
    (34, dict(body_z=-2.8, body_pitch=-6., body_roll=1.4,
              head_pitch=19., head_yaw=-1.,
              hammer_pos=(4.,23.,56.), hammer_rot=(-20.,0.,175.),
              left_hand=_IH_PALM_NEAR,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,53.)), 'in'),
    (36, dict(body_z=-3.5, body_pitch=-6.2, body_roll=1.4,
              head_pitch=18., head_yaw=-1.,
              hammer_pos=_IH_TAP_POS, hammer_rot=_IH_TAP_ROT,
              left_hand=_IH_PALM,
              right_elbow=(-22.,10.,44.), left_elbow=(28.,11.,52.5)), 'out'),
    (38, dict(body_z=-3.1, body_pitch=-6., body_roll=1.1,
              head_pitch=19., head_yaw=1.,
              hammer_pos=(4.,23.,54.5), hammer_rot=(-22.,0.,175.),
              left_hand=_IH_PALM_YIELD,
              right_elbow=(-23.,10.,45.), left_elbow=(28.,11.,52.))),
    (44, dict(body_z=-1.3, body_pitch=-3., body_roll=.3,
              head_pitch=15., head_yaw=5.,
              hammer_pos=(-8.,19.,53.), hammer_rot=(-16.,-3.,90.),
              left_hand=(8.,20.,53.), right_elbow=(-25.,7.,48.),
              left_elbow=(28.,7.,53.))),
    (54, dict(body_z=.5, body_pitch=.5, body_roll=-.8,
              head_pitch=13., head_yaw=9.,
              hammer_pos=(-24.,9.,62.7), left_hand=(23.,10.,46.))),
    (65, dict(body_z=-.65, body_pitch=.25, body_roll=-.45,
              head_pitch=14., head_yaw=3.,
              hammer_pos=(-25.,9.,61.4), left_hand=(22.,10.,44.6))),
    (74, dict(body_z=-.3, head_pitch=14.3, head_yaw=.8,
              hammer_pos=(-25.,9.,61.8), left_hand=(22.,10.,44.8))),
    (84, {}),
]

def idle_target(frame):
    """84-frame periodic idle, two quiet real head-to-palm taps."""
    f = float(frame) % 84.
    if f == 0.:
        return {}
    result = _ih_key_pose(_IH_IDLE_KEYS, f)
    if 34. < f < 38.:
        result['blink'] = math.sin(math.pi*(f-34.)/4.)**2
    return result


# Dance beats are not one sine wave: gather, open, two weighted contacts,
# gather again, airborne accent, compressed landing, proud presentation.
_IH_HAPPY_KEYS = [
    (0, {}),
    (4, dict(body_z=-4., body_pitch=-6., body_roll=-3.,
             head_pitch=10., head_yaw=-4., smile=.7,
             hammer_pos=(-27.,11.,58.), hammer_rot=(-12.,-28.,-4.),
             left_hand=(27.,12.,54.), left_elbow=(30.,3.,54.))),
    (9, dict(body_z=1.5, body_pitch=-1., body_roll=-3.,
             head_pitch=20., head_yaw=-7., smile=.95,
             hammer_pos=(-34.,7.,73.), hammer_rot=(8.,-31.,-14.),
             left_hand=(38.,8.,69.), left_elbow=(32.,1.,56.),
             foot_r=(0.,0.,5.5))),
    (12, dict(body_z=2.5, body_pitch=-2., body_roll=-4.,
              head_pitch=18., head_yaw=-5., smile=.95,
              hammer_pos=(-33.,8.,73.), hammer_rot=(8.,-31.,-14.),
              left_hand=(37.,8.,68.), left_elbow=(32.,1.,56.),
              foot_r=(0.,0.,5.)), 'in'),
    (14, dict(body_z=-3.5, body_pitch=-4., body_roll=-3.,
              head_pitch=10., head_yaw=-3., smile=.85,
              hammer_pos=(-31.,8.,68.), hammer_rot=(4.,-28.,-12.),
              left_hand=(36.,10.,65.), left_elbow=(30.,1.,54.)), 'out'),
    (17, dict(body_z=1.6, body_pitch=1., body_roll=2.5,
              head_pitch=18., head_yaw=4., smile=.95,
              hammer_pos=(-32.,8.,72.), hammer_rot=(7.,-27.,-10.),
              left_hand=(35.,10.,69.), left_elbow=(31.,1.,56.),
              foot_l=(0.,0.,2.))),
    (20, dict(body_z=2.0, body_pitch=-1., body_roll=4.,
              head_pitch=19., head_yaw=6., smile=.95,
              hammer_pos=(-33.,9.,73.), hammer_rot=(9.,-30.,-10.),
              left_hand=(36.,10.,69.), left_elbow=(31.,1.,56.),
              foot_l=(0.,0.,5.5)), 'in'),
    (23, dict(body_z=-3.8, body_pitch=-4., body_roll=3.5,
              head_pitch=10., head_yaw=4., smile=.85,
              hammer_pos=(-30.,12.,66.), hammer_rot=(1.,-25.,-8.),
              left_hand=(32.,13.,62.), left_elbow=(29.,2.,53.)), 'out'),
    (25, dict(body_z=-5.5, body_pitch=-8., body_roll=-1.,
              head_pitch=12., smile=.9,
              hammer_pos=(-28.,14.,61.), hammer_rot=(-9.,-25.,-9.),
              left_hand=(27.,15.,58.), left_elbow=(29.,3.,51.)), 'in'),
    (28, dict(root_z=6., body_z=.3, body_pitch=2., body_roll=1.,
              head_pitch=21., head_yaw=-4., smile=1.,
              hammer_pos=(-34.,8.,76.), hammer_rot=(10.,-32.,-12.),
              left_hand=(36.,12.,72.), left_elbow=(32.,1.,57.),
              foot_r=(0.,0.,1.5), foot_l=(0.,0.,1.5))),
    (30, dict(root_z=8., body_z=1., body_pitch=3., body_roll=2.,
              head_pitch=22., head_yaw=-5., smile=1.,
              hammer_pos=(-34.,6.,76.), hammer_rot=(10.,-32.,-12.),
              left_hand=(37.,10.,73.), left_elbow=(32.,1.,57.),
              foot_r=(0.,0.,1.7), foot_l=(0.,0.,1.7))),
    (32, dict(root_z=5.2, body_z=0., body_pitch=0., body_roll=.5,
              head_pitch=18., head_yaw=-2., smile=.95,
              hammer_pos=(-32.,9.,73.), hammer_rot=(7.,-29.,-10.),
              left_hand=(35.,12.,69.), left_elbow=(31.,2.,55.),
              foot_r=(0.,0.,.5), foot_l=(0.,0.,.5)), 'in'),
    (34, dict(root_z=0., body_z=-5., body_pitch=-8., body_roll=-1.,
              head_pitch=9., smile=.85,
              hammer_pos=(-28.,14.,63.), hammer_rot=(-7.,-22.,-7.),
              left_hand=(30.,14.,60.), left_elbow=(29.,3.,52.)), 'out'),
    (36, dict(body_z=-3.2, body_pitch=-5., body_roll=-1.3,
              head_pitch=11., head_yaw=2., smile=.9,
              hammer_pos=(-24.,15.,61.), hammer_rot=(-9.,-13.,-6.),
              left_hand=(27.,15.,60.), left_elbow=(28.,3.,53.))),
    (39, dict(body_z=1.25, body_pitch=1., body_roll=-2.,
              head_pitch=17., head_yaw=-6., smile=.95,
              hammer_pos=(-8.,17.,53.), hammer_rot=(-8.,18.,-3.),
              left_hand=(19.,18.,59.), right_elbow=(-25.,5.,49.),
              left_elbow=(29.,3.,53.))),
    (42, dict(body_z=.7, body_pitch=.3, body_roll=-1.4,
              head_pitch=16., head_yaw=-4., smile=.9,
              hammer_pos=(-9.,15.,55.), hammer_rot=(-8.,18.,-3.),
              left_hand=(17.,18.,61.), right_elbow=(-25.,5.,50.),
              left_elbow=(29.,3.,54.))),
    (44, dict(body_z=.3, body_pitch=0., body_roll=-.5,
              head_pitch=15., head_yaw=-1., smile=.6,
              hammer_pos=(-18.,12.,59.), hammer_rot=(0.,0.,-4.),
              left_hand=(23.,12.,53.))),
    (47, {}),
]


def happy_target(frame):
    """48-frame pride dance. Foot contacts 14/23; jump apex 30; land 34."""
    f = min(47., max(0., float(frame)))
    if f == 0. or f == 47.:
        return {}
    result = _ih_key_pose(_IH_HAPPY_KEYS, f)
    if 33. < f < 36.:
        result['blink'] = .65*math.sin(math.pi*(f-33.)/3.)**2
    return result


# The preview forge and its effects are drawn at native resolution, without AA.
def forge_scene(frame):
    phase = (int(frame) % 72) / 72.0
    im = Image.new('RGB', (160, 128), '#25232d')
    d = ImageDraw.Draw(im)
    # A distant caldera, recessed behind a broken basalt arch.
    d.polygon([(32, 0), (160, 0), (160, 67), (118, 74), (29, 66)], fill='#302a32')
    d.polygon([(72, 47), (102, 20), (117, 26), (130, 12), (159, 43), (159, 72)], fill='#392c33')
    d.polygon([(108, 54), (131, 30), (142, 37), (159, 29), (159, 72)], fill='#47313a')
    d.line([(130, 31), (127, 39), (132, 44), (128, 53), (139, 62)], fill='#663a37', width=3)
    d.line([(130, 32), (128, 39), (133, 44), (129, 53), (139, 62)], fill='#a14d38', width=1)
    d.polygon([(117, 65), (139, 62), (159, 65), (159, 70), (138, 68)], fill='#693b37')
    d.line([(119, 66), (137, 64), (158, 67)], fill='#ad5439', width=1)
    for i in range(5):
        x = 120 + ((i*9 + int(phase*36)) % 36)
        y = 66 if x < 140 else 67
        d.line((x, y, min(158, x+3), y), fill=('#bb653e' if i % 2 else '#864238'))
    d.polygon([(0, 0), (57, 0), (42, 8), (35, 17), (28, 29), (27, 76), (0, 87)], fill='#1c1d26')
    d.polygon([(0, 0), (44, 0), (29, 11), (18, 35), (17, 81), (0, 86)], fill='#292630')
    d.line([(5, 0), (20, 12), (16, 30), (9, 35), (8, 66)], fill='#3d3239', width=2)
    d.line([(28, 3), (21, 10), (19, 22)], fill='#504047', width=1)
    d.polygon([(140, 0), (160, 0), (160, 82), (151, 76), (148, 26)], fill='#24222b')
    d.line([(151, 6), (153, 24), (156, 32), (154, 55), (159, 63)], fill='#413139')
    # The brick hearth remains at the edge; its orange mouth never sits behind the face.
    d.polygon([(0, 39), (9, 32), (25, 34), (32, 43), (30, 73), (0, 79)], fill='#46343b')
    for y, a, b in ((37, 4, 24), (44, 0, 31), (53, 0, 30), (63, 0, 30), (72, 0, 27)):
        d.line((a, y, b, y-1), fill='#211e25')
        d.line((a+1, y+1, b-1, y), fill='#62433f')
        d.line((12+(y % 3)*4, y-7, 11+(y % 3)*4, y), fill='#292329')
    d.polygon([(5, 50), (9, 44), (21, 44), (26, 51), (25, 69), (4, 70)], fill='#211a20')
    d.polygon([(7, 55), (11, 49), (20, 49), (24, 55), (23, 68), (6, 69)], fill='#68372b')
    for i, (x, y) in enumerate(((8, 63), (12, 61), (16, 64), (20, 60), (22, 66))):
        heat = math.sin(math.tau*phase + i*1.8)
        d.polygon([(x-2, y), (x, y-2), (x+3, y), (x+1, y+3), (x-2, y+2)], fill='#a55030')
        d.line((x-1, y, x+1, y), fill='#da853e' if heat > .1 else '#bd6936')
        if heat > .62:
            d.point((x, y-1), fill='#eab65c')
    d.line((3, 71, 27, 69), fill='#936044', width=2)
    # Smoke consists of small, quiet, stepped puffs, with a clean loop.
    smoke = ImageDraw.Draw(im, 'RGBA')
    for i in range(4):
        u = (phase + i*.25) % 1.0
        x, y = 13 + round(math.sin(u*5+i)*2), 42-round(29*u)
        radius = 2+int(2*u)
        opacity = int(95*math.sin(math.pi*u))
        smoke.polygon([(x-radius, y), (x-radius+1, y-radius), (x+1, y-radius-1),
                       (x+radius, y-1), (x+radius-1, y+2), (x-1, y+3)], fill=(63, 52, 59, opacity))
    # Broad flagstones in receding rows. No per-pixel random texture.
    d.polygon([(0, 82), (30, 72), (105, 73), (160, 77), (160, 128), (0, 128)], fill='#3c343c')
    d.polygon([(0, 87), (28, 77), (57, 78), (48, 92), (0, 104)], fill='#4c3b3e')
    d.polygon([(0, 104), (48, 93), (88, 96), (73, 113), (0, 127)], fill='#44363b')
    d.polygon([(96, 76), (155, 80), (159, 89), (91, 87)], fill='#3b323a')
    d.polygon([(90, 88), (158, 91), (159, 105), (94, 101)], fill='#41363d')
    seams = [[(0, 90), (25, 82), (76, 82), (117, 85), (160, 84)],
             [(0, 105), (31, 94), (89, 94), (128, 99), (160, 98)],
             [(0, 127), (45, 111), (95, 112), (143, 120), (160, 119)],
             [(24, 82), (29, 93)], [(76, 82), (65, 94)], [(118, 85), (128, 99)],
             [(31, 94), (45, 111)], [(89, 94), (95, 112)], [(145, 99), (143, 120)]]
    for path in seams:
        d.line(path, fill='#282630', width=1)
    for path in [[(4, 102), (29, 94), (51, 95)], [(48, 110), (77, 111)],
                 [(100, 113), (123, 117)], [(95, 87), (118, 89)], [(5, 89), (22, 83)]]:
        d.line(path, fill='#514249')
    for path in [[(54, 84), (50, 87), (52, 91)], [(111, 101), (108, 104), (115, 108)],
                 [(17, 113), (24, 112), (26, 116)], [(136, 80), (132, 82)]]:
        d.line(path, fill='#302b34')
    # A foreground basalt lip and two quiet piles of clinker.
    for x, y, w in ((3, 119, 11), (13, 124, 10), (147, 121, 12), (155, 116, 8)):
        d.polygon([(x-w//2, y), (x-2, y-3), (x+w//2, y-2), (x+w//2+2, y+3), (x-w//2, y+4)], fill='#25232d')
        d.line((x-w//2+1, y, x+1, y-2), fill='#4b3a42')
    for i in range(3):
        u = (phase+i/3) % 1
        if .08 < u < .88:
            x, y = 11+round(3*math.sin(i*2+u*4)), 63-round(u*35)
            d.point((x, y), fill='#98613f' if u < .6 else '#65443b')
    return im


def _fx_xy(renderer, point):
    q = renderer.project(point)
    return (int(round(q[0])), int(round(q[1])))


def _fx_spark(draw, xy, age, large=False, alpha=255):
    x, y = xy
    colors = [(255, 228, 151), (248, 164, 65), (208, 94, 39), (109, 55, 40)]
    tone = min(3, max(0, int(age*3.8)))
    core = colors[tone]+(max(0, min(255, int(alpha))),)
    if large:
        draw.line((x-2, y, x+2, y), fill=(144, 64, 34, int(alpha*.58)))
        draw.line((x, y-2, x, y+2), fill=(144, 64, 34, int(alpha*.58)))
        draw.line((x-1, y, x+1, y), fill=colors[min(3, tone+1)]+(int(alpha*.85),))
        draw.line((x, y-1, x, y+1), fill=colors[min(3, tone+1)]+(int(alpha*.85),))
    draw.point((x, y), fill=core)


def _fx_dust(draw, renderer, point, age, strength=1.0):
    if not 0 <= age < 8:
        return
    x, y = _fx_xy(renderer, point)
    alpha = int(110*(1-age/8)*strength)
    for j in range(5):
        side = -1 if j % 2 else 1
        dx = side*(2+j+age*.70)
        yy = y - (j % 2) - math.sin(age*math.pi/8)*2
        rr = 1 + (j % 2)
        draw.ellipse((round(x+dx-rr), round(yy-1), round(x+dx+rr), round(yy+1)), fill=(103, 79, 65, alpha))
        draw.point((round(x+dx), round(yy-1)), fill=(159, 114, 72, int(alpha*.60)))


def _fx_ballistic(origin, velocity, t, gravity=260.):
    origin = np.asarray(origin, float)
    velocity = np.asarray(velocity, float)
    t = max(0., float(t))
    point = origin + velocity*t
    point[2] -= gravity*t*t*.5
    if point[2] < 0:
        land = (velocity[2]+math.sqrt(velocity[2]**2+2*gravity*max(0., origin[2])))/gravity
        rest = max(0., t-land)
        landing = origin+velocity*land
        point[:2] = landing[:2]+velocity[:2]*rest*.44
        bounce = abs(velocity[2]-gravity*land)*.22
        point[2] = max(0., bounce*rest-gravity*rest*rest*.5)
    return point


def _fx_jet(draw, renderer, origin, age, celebration=False):
    """A compact burst with actual ballistic arcs and measured screen-space rise."""
    origin = np.asarray(origin, float)
    count, life = (16, 14) if celebration else (32, 20)
    result = {'particles': 0, 'unique_particles': 0, 'rise_px': 0., 'origin_error': 0.}
    if not 0 <= age < life:
        return result
    forward = np.array([renderer.view[0], renderer.view[1], 0.])
    forward /= max(1e-9, np.linalg.norm(forward))
    source_y = renderer.project(origin)[1]
    visible = set()
    for j in range(count):
        birth = j % 3 if not celebration else (j % 2)*2
        if age < birth:
            continue
        sideways = (-22+(j*13 % 9)*8) if not celebration else (-12+(j*5 % 7)*5)
        ahead = 12+(j % 4)*7 if not celebration else 6+(j % 3)*4
        vz = 180+(j*11 % 7)*4 if not celebration else 148+(j*7 % 4)*8
        if not celebration and j % 8 == 0:
            vz = 125+j % 5*5
        velocity = renderer.right*sideways+forward*ahead+np.array([0., 0., vz])
        gravity = 500. if not celebration else 360.
        result['origin_error'] = max(result['origin_error'], float(np.linalg.norm(_fx_ballistic(origin, velocity, 0., gravity)-origin)))
        t = (age-birth)/24.
        pos = _fx_ballistic(origin, velocity, t, gravity)
        prev = _fx_ballistic(origin, velocity, max(0., t-1/48), gravity)
        x, y = _fx_xy(renderer, pos)
        fade = min(1., max(0., (life-age)/5.))
        alpha = int(245*fade)
        if not (0 <= x < 160 and 0 <= y < 128 and alpha > 8):
            continue
        tail = [_fx_xy(renderer, prev), (x, y)]
        draw.line(tail, fill=(136, 53, 31, int(alpha*.42)), width=4)
        draw.line(tail, fill=(231, 106, 38, int(alpha*.9)), width=2)
        _fx_spark(draw, (x, y), max(0., (age-life*.57)/(life*.48)), j % 4 == 0, alpha)
        if j % 3 == 0:
            draw.point((x+1, y), fill=(251, 170, 65, int(alpha*.8)))
        visible.add((x, y))
        result['particles'] += 1
        result['rise_px'] = max(result['rise_px'], float(source_y-renderer.project(pos)[1]))
    result['unique_particles'] = len(visible)
    return result


def _fx_dust_wave(draw, renderer, origin, age):
    if not 0 <= age <= 10:
        return
    center = np.asarray(origin, float)
    radius, alpha = 4+age*1.6, int(120*(1-age/11.))
    for j in range(9):
        a = math.tau*(j+.15)/9
        p = center+np.array([math.cos(a)*radius, math.sin(a)*radius, .25])
        q = center+np.array([math.cos(a+.13)*radius, math.sin(a+.13)*radius, .25])
        path = [_fx_xy(renderer, p), _fx_xy(renderer, q)]
        draw.line(path, fill=(54, 43, 39, int(alpha*.6)), width=3)
        draw.line(path, fill=(123, 91, 65, alpha), width=2)
        draw.point(path[0], fill=(174, 125, 77, int(alpha*.7)))


def _fx_fire_gate(back, front, renderer, tags, meta):
    bd, fd = ImageDraw.Draw(back), ImageDraw.Draw(front)
    metrics = {'ring_visible': False, 'ring_projected_diameter_px': 0.,
               'ring_minor_diameter_px': 0., 'ring_visible_diameter_px': 0,
               'breath_visible': False, 'breath_source_error': 0., 'breath_pixels': 0}
    center = np.asarray(meta['ring_center'], float)
    normal = np.asarray(meta.get('ring_normal', renderer.view*.86-renderer.up*.51), float)
    normal /= max(1e-9, np.linalg.norm(normal))
    u = renderer.right-normal*np.dot(renderer.right, normal)
    if np.linalg.norm(u) < 1e-6:
        u = renderer.up-normal*np.dot(renderer.up, normal)
    u /= max(1e-9, np.linalg.norm(u))
    v = np.cross(normal, u)
    if np.dot(v, renderer.up) < 0:
        v = -v
    radius = max(0., float(meta.get('ring_radius', 13.)))
    progress = float(meta.get('ring_progress', 0.))
    fade = min(1., max(0., progress*5), max(0., (1-progress)*5))
    if radius > 1 and fade > .02:
        projected = np.array([[renderer.right@u, renderer.right@v], [renderer.up@u, renderer.up@v]])
        diameters = np.linalg.svd(projected*radius*renderer.scale, compute_uv=False)*2
        metrics['ring_projected_diameter_px'], metrics['ring_minor_diameter_px'] = map(float, diameters)
        mask = Image.new('L', CELL); md = ImageDraw.Draw(mask)
        for j in range(56):
            a, b = math.tau*j/56, math.tau*(j+1)/56
            p, q = center+radius*(u*math.cos(a)+v*math.sin(a)), center+radius*(u*math.cos(b)+v*math.sin(b))
            path = [_fx_xy(renderer, p), _fx_xy(renderer, q)]
            x, y, depth = renderer.project((p+q)*.5)
            xx, yy = int(round(x)), int(round(y))
            behind = 0 <= xx < 160 and 0 <= yy < 128 and depth < renderer.depth[yy, xx]-.05
            draw = bd if behind else fd
            draw.line(path, fill=(104, 39, 30, int(190*fade)), width=5)
            draw.line(path, fill=(226, 88, 31, int(245*fade)), width=3)
            draw.line(path, fill=(255, 177, 60, int(255*fade)), width=2)
            if j % 4 != 0:
                draw.line(path, fill=(255, 230, 147, int(235*fade)), width=1)
            md.line(path, fill=255, width=5)
        bbox = mask.getbbox()
        metrics['ring_visible_diameter_px'] = max(bbox[2]-bbox[0], bbox[3]-bbox[1]) if bbox else 0
        metrics['ring_visible'] = True
    plume_active = bool(meta.get('plume_active', 0. <= progress <= 1.))
    pp = float(meta.get('plume_progress', progress))
    strength = min(1., max(0., pp*5), max(0., (1-pp)*3.5))
    if plume_active and strength > .01:
        mouth = np.asarray(tags['mouth'], float)
        toward = mouth-center
        radial = u*np.dot(toward, u)+v*np.dot(toward, v)
        radial /= max(1e-9, np.linalg.norm(radial))
        end = center+radial*radius
        forward = mouth-np.asarray(tags.get('head', mouth-[0, 10, 0]), float)
        forward /= max(1e-9, np.linalg.norm(forward))
        p1 = mouth+forward*7+np.array([0., 0., 3.])
        p2 = end+renderer.right*10-renderer.up*3
        curve = [(1-t)**3*mouth+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*end for t in np.linspace(0, 1, 18)]
        path = [_fx_xy(renderer, p) for p in curve]
        plume = Image.new('RGBA', CELL); pd = ImageDraw.Draw(plume)
        for j in (3, 7, 11, 15):
            x, y = path[j]; rr = 2+min(2, j//5)
            x += 1+j//6+round(math.sin(pp*math.tau+j*.7))
            y -= 1
            pd.polygon([(x-rr, y), (x-rr+1, y-rr), (x+1, y-rr-1), (x+rr, y-2),
                        (x+rr+1, y+1), (x+2, y+rr), (x-1, y+rr+1)], fill=(67, 45, 43, int(175*strength)))
            pd.polygon([(x-rr+1, y), (x-1, y-rr+1), (x+2, y-rr+2),
                        (x+rr, y), (x+1, y+rr-1), (x-1, y+1)], fill=(152, 65, 31, int(210*strength)))
            pd.line((x-rr+1, y-1, x, y-rr+1, x+2, y-rr+2), fill=(238, 112, 35, int(235*strength)), width=2)
            pd.point((x, y-1), fill=(255, 206, 103, int(245*strength)))
            if j > 7:
                pd.polygon([(x+rr, y-2), (x+rr+1, y-5), (x+rr+4, y-5),
                            (x+rr+5, y-2), (x+rr+2, y)], fill=(77, 51, 45, int(100*strength)))
        pd.line(path, fill=(145, 49, 29, int(200*strength)), width=5)
        pd.line(path, fill=(238, 107, 35, int(245*strength)), width=3)
        pd.line(path, fill=(255, 194, 90, int(255*strength)), width=1)
        for j in (4, 8, 12, 16):
            x, y = path[j]; pd.point((x+1, y-1), fill=(255, 226, 144, int(230*strength)))
        back.alpha_composite(plume)
        metrics.update(breath_visible=True, breath_source_error=float(np.linalg.norm(curve[0]-mouth)),
                       breath_source_world=mouth.tolist(), breath_source_screen=list(path[0]),
                       breath_path_length_px=float(sum(np.linalg.norm(np.subtract(b, a)) for a, b in zip(path, path[1:]))),
                       breath_pixels=int(np.count_nonzero(np.asarray(plume)[..., 3])))
    return metrics


def stage2_effects(clip, frame, renderer, tags, meta, history):
    back = Image.new('RGBA', (160, 128))
    front = Image.new('RGBA', (160, 128))
    bd, fd = ImageDraw.Draw(back), ImageDraw.Draw(front)
    metrics = {'particles': 0, 'ring_visible': False, 'star_visible': False,
               'trail_samples': 0, 'front_pixels': 0, 'back_pixels': 0,
               'fountain_particles': 0, 'fountain_unique_particles': 0, 'fountain_rise_px': 0.,
               'fountain_origin_error': 0., 'impact_glow_visible': False, 'dust_wave_visible': False,
               'coal_particles': 0, 'coal_unique_particles': 0, 'coal_rise_px': 0., 'coal_origin_error': 0.,
               'ring_projected_diameter_px': 0., 'ring_minor_diameter_px': 0., 'ring_visible_diameter_px': 0,
               'breath_visible': False, 'breath_source_error': 0., 'breath_pixels': 0, 'face_fx_pixels': 0}
    last = {'idle': 83, 'happy': 47, 'trick': 95, 'tech_anvil': 47}.get(clip)
    if frame == 0 or frame == last:
        return back, front, metrics
    if clip == 'trick' and meta.get('air', False):
        center = np.asarray(meta.get('hammer_center', tags['hammerHead']), float)
        height = max(0., float(meta.get('air_height', center[2])))
        floor = center.copy(); floor[2] = 0
        x, y = _fx_xy(renderer, floor)
        radius = max(1.2, 5.8-height*.038)
        alpha = int(max(16, 78-height*.47))
        bd.ellipse((round(x-radius), y-1, round(x+radius), y+1), fill=INK+(alpha,))
        trail = [h['hammerHead'] for h in history[-3:] if 'hammerHead' in h]
        if len(trail) > 1:
            path = [_fx_xy(renderer, p) for p in trail]
            bd.line(path, fill=(168, 84, 42, 90), width=3)
            bd.line(path, fill=(241, 164, 74, 160), width=1)
            metrics['trail_samples'] = len(path)
    center = meta.get('ring_center')
    if clip == 'trick' and center is not None:
        metrics.update(_fx_fire_gate(back, front, renderer, tags, meta))
        # alpha_composite may replace the backing image buffer.
        bd, fd = ImageDraw.Draw(back), ImageDraw.Draw(front)
    hit = meta.get('hit_frame')
    if hit is not None:
        age = frame-int(hit)
        contact = np.asarray(meta.get('contact', tags.get('anvilTop', (31, 30, 31))), float)
        if -2 <= age <= 1:
            points = meta.get('smear_points')
            if points is None:
                points = [h['hammerFace'] for h in history[-3:] if 'hammerFace' in h]
            if len(points) > 1:
                path = [_fx_xy(renderer, p) for p in points]
                bd.line(path, fill=(128, 55, 33, 90), width=5)
                bd.line(path, fill=(226, 117, 43, 135), width=3)
                bd.line(path, fill=(250, 197, 96, 185), width=1)
                metrics['trail_samples'] = len(path)
        if 0 <= age < 3:
            x, y = _fx_xy(renderer, contact)
            rad = 2+age*2
            fd.polygon([(x-rad, y), (x, y-rad), (x+rad, y), (x, y+rad)], fill=(255, 179, 88, 105-age*28))
            _fx_spark(fd, (x, y), age*.15, True, 235-age*50)
        if clip == 'tech_anvil' and 0 <= age < 20:
            jet = _fx_jet(fd, renderer, contact, age)
            metrics['particles'] += jet['particles']
            metrics.update(fountain_particles=jet['particles'], fountain_unique_particles=jet['unique_particles'],
                           fountain_rise_px=jet['rise_px'], fountain_source_world=contact.tolist(),
                           fountain_source_screen=list(_fx_xy(renderer, contact)), fountain_origin_error=jet['origin_error'])
            # Hot scratches lie on the real horizontal working face, not in the air.
            fade = min(1., (20-age)/8.)
            for offsets in (((-6, 0, .05), (-3, -1, .05), (0, 0, .05), (4, 1, .05), (7, 0, .05)),
                            ((0, 0, .05), (1, 2, .05), (3, 3, .05))):
                path = [_fx_xy(renderer, contact+np.asarray(p)) for p in offsets]
                fd.line(path, fill=(139, 56, 30, int(180*fade)), width=3)
                fd.line(path, fill=(240, 121, 37, int(235*fade)), width=2)
                fd.line(path, fill=(255, 219, 126, int(255*fade)), width=1)
            _fx_dust_wave(bd, renderer, tags.get('anvilGround', contact*[1, 1, 0]), age)
            metrics['impact_glow_visible'] = True
            metrics['dust_wave_visible'] = age <= 10
        elif clip != 'tech_anvil' and 0 <= age < 34:
            life = 21 if clip == 'tech_anvil' else 34
            for j in range(16):
                angle = j*2.39996323
                velocity = [math.cos(angle)*(16+j % 5*5), math.sin(angle)*(13+j % 4*6), 20+j % 6*7]
                pos = _fx_ballistic(contact, velocity, age/24)
                prev = _fx_ballistic(contact, velocity, max(0., age/24-1/48))
                alpha = int(255*max(0., 1-age/life)**.55)
                fd.line([_fx_xy(renderer, prev), _fx_xy(renderer, pos)], fill=(187, 77, 36, int(alpha*.80)), width=2)
                _fx_spark(fd, _fx_xy(renderer, pos), age/life, j % 5 == 0, alpha)
                metrics['particles'] += 1
            _fx_dust(bd, renderer, tags.get('anvilGround', contact*[1, 1, 0]), age, .9)
        if clip == 'trick' and meta.get('star', True) and 1 <= age < 36:
            star_center = contact + renderer.right*6 + np.array([0., 0., 30.])
            vertices = [star_center+renderer.right*(math.cos(math.pi/2+j*math.pi/5)*(12 if j % 2 == 0 else 5.4))
                        +renderer.up*(math.sin(math.pi/2+j*math.pi/5)*(12 if j % 2 == 0 else 5.4)) for j in range(10)]
            targets = [vertices[j]*(1-u)+vertices[(j+1) % 10]*u for j in range(10) for u in (0., .5)]
            if 8 <= age <= 14:
                path = [_fx_xy(renderer, p) for p in vertices+[vertices[0]]]
                fd.line(path, fill=(126, 49, 32, 190), width=3)
                fd.line(path, fill=(244, 153, 58, 245), width=2)
                fd.line(path, fill=(255, 224, 132, 250), width=1)
                metrics['star_visible'] = True
            for j, target in enumerate(targets):
                if age < 9:
                    u = min(1., age/8.)
                    pos = contact*(1-u)+target*u+np.array([0., 0., math.sin(math.pi*u)*(8+j % 4)])
                elif age <= 14:
                    pos = target
                else:
                    direction = target-star_center
                    velocity = direction*.85+np.array([0., 0., 12+j % 3*3])
                    pos = _fx_ballistic(target, velocity, (age-14)/24., 120.)
                alpha = int(255*min(1., max(0., (36-age)/12)))
                _fx_spark(fd, _fx_xy(renderer, pos), max(0., (age-15)/24), j % 4 == 0, alpha)
                metrics['particles'] += 1
    if clip == 'happy':
        for event, names in ((14, ('footRContact',)), (23, ('footLContact',)), (35, ('footRContact', 'footLContact'))):
            age = frame-event
            sample = history[event] if len(history) > event else tags
            for name in names:
                if name in sample:
                    _fx_dust(bd, renderer, sample[name], age, .9 if event == 35 else .65)
        if 27 <= frame <= 40:
            source = np.asarray(tags['coalPocket'], float)
            jet = _fx_jet(fd, renderer, source, frame-27, celebration=True)
            metrics['particles'] += jet['particles']
            metrics.update(coal_particles=jet['particles'], coal_unique_particles=jet['unique_particles'], coal_rise_px=jet['rise_px'],
                           coal_source_world=source.tolist(), coal_source_screen=list(_fx_xy(renderer, source)),
                           coal_origin_error=jet['origin_error'])
    metrics['front_pixels'] = int(np.count_nonzero(np.asarray(front)[..., 3]))
    metrics['back_pixels'] = int(np.count_nonzero(np.asarray(back)[..., 3]))
    face_groups = [i for i, name in enumerate(renderer.group_names) if name in ('head', 'jaw', 'crest')]
    metrics['face_fx_pixels'] = int(np.count_nonzero((np.asarray(front)[..., 3] > 80)&np.isin(renderer.group, face_groups)))
    return back, front, metrics


# Export all completed stage-two work from one plain-text Python file.
def stage2_render(pose, clip, frame, history):
    rig=build_model(pose)
    renderer=Renderer(width=160,height=128,feet=FEET,azimuth=-35,elevation=35,scale=SCALE)
    lift=max(0.,pose.root_z)
    scale=max(.58,1.-lift*.045)
    figure=renderer.render(rig,shadow=True,
                           shadow_radius=(24*scale,7*scale),
                           shadow_alpha=round(61*max(.35,1.-lift*.055)))
    history.append({k:v.copy() if isinstance(v,np.ndarray) else v for k,v in rig.tags.items()})
    meta=stage2_meta(clip,frame,pose,rig.tags)
    back,front,fx_metrics=stage2_effects(clip,frame,renderer,rig.tags,meta,history)
    result=Image.new('RGBA',CELL,(0,0,0,0))
    result.alpha_composite(back)
    # The anvil remains on the ground throughout every stage-two clip.
    x,y,_=renderer.project(rig.tags['anvilGround'])
    draw=ImageDraw.Draw(result)
    draw.ellipse((round(x-11),round(y-4),round(x+11),round(y+4)),fill=INK+(72,))
    draw.ellipse((round(x-7),round(y-2),round(x+7),round(y+2)),fill=INK+(98,))
    result.alpha_composite(figure)
    result.alpha_composite(front)
    metrics={'body_bbox':renderer.body_mask.getbbox(),
             'fx_pixels':fx_metrics,
             'hand_grip_error':float(np.linalg.norm(rig.tags['handR']-rig.tags['hammerGripR'])),
             'contact_error':float(np.linalg.norm(rig.tags['hammerFace']-rig.tags['anvilTop'])),
             'root_lift':pose.root_z,
             'hammer_head_screen':renderer.project(rig.tags['hammerHead'])[:2].tolist(),
             'head_screen':renderer.project(rig.tags['head'])[:2].tolist(),
             'arm_lengths':{s:[float(np.linalg.norm(rig.tags['shoulder'+s]-rig.tags['elbow'+s])),
                               float(np.linalg.norm(rig.tags['elbow'+s]-rig.tags['hand'+s]))]
                            for s in ('R','L')}}
    return result,metrics,rig.tags


def stage2_strip(frames):
    strip=Image.new('RGBA',(CELL[0]*len(frames),CELL[1]),(0,0,0,0))
    for i,frame in enumerate(frames):strip.paste(frame,(i*CELL[0],0))
    return strip


def stage2_on_scene(frame, phase):
    scene=forge_scene(phase).convert('RGBA')
    scene.alpha_composite(frame)
    return scene.convert('RGB')


def stage2_gif(frames, destination, zoom=3):
    """One shared palette, no colour dithering, exact average 24 fps.

    GIF stores hundredths of a second, so 4/5-centisecond durations alternate.
    The PNG strip is the exact lossless 24-fps source; GIF is a review proxy.
    """
    count=len(frames)
    sample=Image.new('RGB',(160*8,128*int(math.ceil(count/8.))))
    for i,frame in enumerate(frames):sample.paste(frame,((i%8)*160,(i//8)*128))
    palette=sample.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
    converted=[f.quantize(palette=palette,dither=Image.Dither.NONE).resize(
        (160*zoom,128*zoom),Image.Resampling.NEAREST) for f in frames]
    durations=[10*(round((i+1)*100/24)-round(i*100/24)) for i in range(count)]
    converted[0].save(destination,save_all=True,append_images=converted[1:],
                      duration=durations,loop=0,optimize=False,disposal=2)


def stage2_keys(clip, frames, key_frames, destination):
    cols=4;scale=3;tile_w=480;tile_h=408
    sheet=Image.new('RGB',(cols*tile_w,int(math.ceil(len(key_frames)/cols))*tile_h),'#201c23')
    d=ImageDraw.Draw(sheet)
    for index,f in enumerate(key_frames):
        x=(index%cols)*tile_w;y=(index//cols)*tile_h
        d.text((x+8,y+4),'%s  %02d  %.3fs'%(clip,f,f/24.),font=ui_font(14),fill='#e6c699')
        tile=stage2_on_scene(frames[f],f).resize((480,384),Image.Resampling.NEAREST)
        sheet.paste(tile,(x,y+24))
    sheet.save(destination)


def stage2_report(checks,seconds):
    rows=[]
    for name,item in checks['clips'].items():
        contact=item.get('contact_errors',{})
        details='; '.join('f%s: %.3g'%(f,v) for f,v in contact.items()) or '—'
        rows.append('| `%s` | %d | %s | %s |'%(name,item['frames'],
                    'да' if item['loop'] else 'нет',details))
    return '''# Горнила: отчёт этапа 2

## Выполнено

Сначала доработаны лицо и фактура кожи, затем построены четыре клипа.
Глаза получили тёмную рамку, блик и надбровье; улыбка стала заметнее.
На коже появились 26 сгруппированных геометрических бугорков и связные ступени
тона. Фактура закреплена в деталях; камера, взрослые пропорции и основной силуэт
сохранены. В каждой палитре по четыре тона. Кадры полностью рисуются 3D-ригом.

Для сверки использованы `idle.png` и `p-0.webp` Лугового исполина из сохранённого
снимка проекта `bf6bf1386d179cd88d6f85c33c8d138f875639c3`. Новые вложения этой
реплики не появились в доступных файлах; архивные изображения не выдаются за них.
Пиксели и геометрия Исполина не копируются. Генераций изображений в этапе 2: **0**.

## Клипы

| Клип | Кадров | Петля | Ошибка торца молота в контакте, мировые единицы |
|---|---:|---|---|
'''+ '\n'.join(rows)+'''

Idle содержит два реальных касания нижней гранью головки верхней части краги.
Happy включает раскрытие силуэта до кадра 12, два притопа, небольшой прыжок,
посадку со сжатием и показ инструмента. Трюк: бросок → полёт с оборотом и кольцом
→ ловля → удар и звезда из искр → поклон. Tech_anvil использует отдельную длинную
подготовку, короткий разгон, контакт, отдачу и любование результатом.

Молот всегда существует. В полёте он вращается вокруг тяжёлой головки по 3D-параболе,
ладонь движется отдельно; в кадре ловли хват совпадает с рукоятью. Отдельная тень
молота с высотой уменьшается и бледнеет. При ударе горизонтальной площадки касается
реальный торец `hammerFace == hammerStrikingEnd`; нижняя грань для краги называется
`hammerPalmFace`. След удара строится из фактических точек через 1/48 секунды.

Вторичное движение: хвост, полы фартука, ремни, гребень и полотенце имеют отдельные
пружины с затуханием и запаздыванием. Начало и конец разовых клипов равны `idle[0]`
побайтно. Финальное успокоение плавно гасит остаточное движение, а не подменяет
последний кадр чужой картинкой. Наковальня на протяжении этих четырёх клипов остаётся
на одном месте, без подмены масштаба и положения.

## Проверка и размеры

Число примитивов нейтрали: **%d**, групп: **%d**. Рост основного вида: **81 px**,
ячейка **160×128**, опора сцены **(77, 99)**. Во время прыжка лапы отрываются от этой
неизменной точки пола. Все кадры проверены на длины костей рук 17/14,5, достижимость
IK, хват, попадание в наковальню и отсутствие обрезания тела краем ячейки.

Фон кузни: 72 непрозрачные фазы с лавой, дымом, углями и искрами. Он используется
в превью; сами полосы персонажа остаются прозрачными. GIF увеличены ближайшим
соседом ×3. Чередование длительности 40/50 мс даёт точные средние 24 кадра/с;
исходные PNG-полосы остаются без потери цвета.

Самостоятельный исходник: **%d строк**, **%d байт** обычного текста.
Повторное построение этого комплекта заняло **%.2f с**; это время рендера,
а не длительность разработки. Полное время ручной постановки отдельно не замерялось.
Полные измерения: `stage2-checks.json`.

## Автономность и следующий этап

`python src/forge_salamander.py out/` создаёт все готовые материалы этапов 1–2
с нуля. Нужны только Python 3, Pillow и NumPy. Сеть, npm, внешние шрифты,
закодированные изображения и заранее сохранённые кадры не используются.
`--stage 1` строит только текущий лист облика. `--reference original.png` добавляет
сравнение с прежним листом; без него `look/reference.png` обозначен как программная
реконструкция. Оригинал не служит текстурой и не входит в код.

В GitHub меняются только `src/forge_salamander.py` и `card.md`, одним коммитом
в конце этапа. Остальные клипы, перенос наковальни, полный 30-секундный `life`
и итоговый архив остаются этапу 3. Текущая работа ждёт слова «дальше».
'''%(checks['primitives'],checks['groups'],checks['source_lines'],checks['source_bytes'],seconds)


def generate_stage2(out,reference=None):
    started=time.perf_counter()
    out=Path(out)
    generate_stage1(out,reference)
    for folder in ('clips','scene','preview','tech-keys'):(out/folder).mkdir(parents=True,exist_ok=True)
    scene_frames=[forge_scene(i).convert('RGBA') for i in range(72)]
    stage2_strip(scene_frames).convert('RGB').save(out/'scene/scene.png')
    neutral,_,_=stage2_render(Pose(),'idle',0,[])
    checks={'id':'forge_salamander','stage':2,'fps':FPS,'cell':list(CELL),
            'feet':list(FEET),'clips':{},'image_generations_this_stage':0,
            'primitives':build_model().size,'groups':len(set(p['group'] for p in build_model().primitives)),
            'scene_frames':72,'scene_loop_exact':forge_scene(0).tobytes()==forge_scene(72).tobytes(),
            'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'source_lines':len(Path(__file__).read_text().splitlines()),
            'source_bytes':Path(__file__).stat().st_size}
    showreel=[]
    keyframes={'idle':[0,14,24,26,36,44,65,83],
               'trick':[0,14,18,25,32,40,46,49,56,63,78,95],
               'happy':[0,4,9,14,23,30,35,47],
               'tech_anvil':[0,8,18,22,24,26,31,47]}
    for clip,spec in CLIP_SPECS.items():
        count=spec['frames'];history=[];frames=[];measurements=[]
        poses=stage2_secondary(clip,[stage2_raw_pose(clip,f) for f in range(count)])
        for f,p in enumerate(poses):
            try:im,met,tags=stage2_render(p,clip,f,history)
            except Exception as exc:raise RuntimeError('%s frame %d: %s'%(clip,f,exc)) from exc
            x0,y0,x1,y1=met['body_bbox']
            if not(0<x0<x1<160 and 0<y0<y1<128):
                raise RuntimeError('%s frame %d body clipped: %s'%(clip,f,met['body_bbox']))
            for lengths in met['arm_lengths'].values():
                if not np.allclose(lengths,[17.,14.5],atol=1e-8):
                    raise RuntimeError('%s frame %d arm bone changed length'%(clip,f))
            if not p.hammer_free and met['hand_grip_error']>1e-8:
                raise RuntimeError('%s frame %d hand detached'%(clip,f))
            frames.append(im);measurements.append(met)
        exact_start=frames[0].tobytes()==neutral.tobytes()
        exact_end=frames[-1].tobytes()==neutral.tobytes()
        if not exact_start or (not spec['loop'] and not exact_end):
            raise RuntimeError(clip+' does not return exactly to the neutral frame')
        contacts={str(f):measurements[f]['contact_error'] for f in spec.get('hit',[])}
        if any(v>1e-7 for v in contacts.values()):raise RuntimeError(clip+' missed the anvil')
        stage2_strip(frames).save(out/'clips'/(clip+'.png'))
        # Background phase makes one complete 72-phase cycle per review GIF,
        # so its first/last seam does not distract from the character loop.
        preview=[stage2_on_scene(im,round(i*72/count)) for i,im in enumerate(frames)]
        stage2_gif(preview,out/'preview'/(clip+'.gif'),3)
        scene_start=len(showreel)
        showreel.extend(stage2_on_scene(im,scene_start+i) for i,im in enumerate(frames))
        stage2_keys(clip,frames,keyframes[clip],out/'tech-keys'/(clip+'.png'))
        before=np.asarray(frames[-1]).astype(int);after=np.asarray(frames[0]).astype(int)
        checks['clips'][clip]={'frames':count,'loop':spec['loop'],
            'exact_neutral_start':exact_start,'exact_neutral_end':exact_end,
            'seam_changed_pixels':int(np.any(before!=after,axis=2).sum()),
            'contact_errors':contacts,'max_lift_world':max(p.root_z for p in poses),
            'min_body_margin':min(min(m['body_bbox'][0],m['body_bbox'][1],160-m['body_bbox'][2],128-m['body_bbox'][3]) for m in measurements),
            'max_held_grip_error':max(m['hand_grip_error'] for m,p in zip(measurements,poses) if not p.hammer_free),
            'hammer_peak_above_head_px':max(m['head_screen'][1]-m['hammer_head_screen'][1] for m in measurements),
            'secondary_delays_frames':[3,2,4,2,3]}
        (out/'preview'/(clip+'-checks.json')).write_text(json.dumps(measurements,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'clip':clip,'frames':count,'complete':True}),flush=True)
    stage2_gif(showreel,out/'preview/showreel_stage2.gif',2)
    manifest={'id':'forge_salamander','fps':FPS,'cell':list(CELL),'feet':list(FEET),
              'stage':2,'stage_status':'awaiting_user_review',
              'clips':CLIP_SPECS,'scene':{'frames':72,'loop':True},
              'reference':json.loads((out/'look/reference-info.json').read_text()),
              'preview_background':'One 72-phase cycle per individual GIF; scene strip remains 24 fps.'}
    for filename,data in (('manifest.json',manifest),('stage2-checks.json',checks)):
        (out/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    seconds=time.perf_counter()-started
    (out/'report.md').write_text(stage2_report(checks,seconds),encoding='utf-8')
    print(json.dumps({'out':str(out.resolve()),'stage':2,'clips':4,'frames':276,
                      'render_seconds':round(seconds,3)},ensure_ascii=False))


# Stage 3: authored small gestures and a physically supported sleep family.
# This fragment uses the shared Pose/F, fixed-length IK and SO(3) interpolator.

GESTURE_SPECS = {
    'fidget_a': {'frames': 48, 'loop': False},
    'fidget_b': {'frames': 48, 'loop': False},
    'look': {'frames': 36, 'loop': False},
    'sleep_in': {'frames': 30, 'loop': False, 'stitch': [0, 23]},
    'sleep': {'frames': 84, 'loop': True},
    'sleep_out': {'frames': 30, 'loop': False, 'stitch': [5, 29]},
    'wake_startled': {'frames': 24, 'loop': False, 'stitch': [3, 23]},
    'hatch': {'frames': 36, 'loop': False, 'stitch': [5, 35]},
    'tired': {'frames': 36, 'loop': False},
}


def _gest_matrix(matrix):
    return tuple(tuple(float(x) for x in row) for row in matrix)


def _gest_hammer_basis(p):
    return (np.asarray(p.hammer_basis, float) if p.hammer_basis is not None else
            F().rx(p.hammer_rot[0]).ry(p.hammer_rot[1]).rz(p.hammer_rot[2]).R)


def _gest_glove_basis(p):
    return (np.asarray(p.glove_basis, float) if p.glove_basis is not None else
            F().rx(-10).rz(-5).R)


def _gest_mix(a, b, amount):
    """Complete pose blend; optional rigid bases never interpolate as scalars."""
    t = float(np.clip(amount, 0., 1.))
    if t <= 0.: return a
    if t >= 1.: return b
    changes = {}
    for name in Pose.__dataclass_fields__:
        av, bv = getattr(a, name), getattr(b, name)
        if name in ('hammer_basis', 'glove_basis'):
            if av is None and bv is None: continue
            reader = _gest_hammer_basis if name == 'hammer_basis' else _gest_glove_basis
            changes[name] = _gest_matrix(_stage2_rotation_mix(reader(a), reader(b), t))
        elif name in ('knee_r', 'knee_l'):
            # Knees are solved after the other joints have been interpolated.
            continue
        elif av is None and bv is None:
            continue
        elif isinstance(av, bool):
            changes[name] = av if t < .5 else bv
        elif isinstance(av, tuple):
            changes[name] = tuple(np.asarray(av)*(1.-t)+np.asarray(bv)*t)
        else:
            changes[name] = float(av)*(1.-t)+float(bv)*t
    return replace(Pose(), **changes)


def _gest_keys(keys, frame):
    if frame <= keys[0][0]:
        return keys[0][1]
    if frame >= keys[-1][0]:
        return keys[-1][1]
    for left, right in zip(keys, keys[1:]):
        if left[0] <= frame <= right[0]:
            t = (float(frame)-left[0])/(right[0]-left[0])
            ease = left[2] if len(left) > 2 else 'smooth'
            if ease == 'in': t = t*t
            elif ease == 'out': t = 1.-(1.-t)*(1.-t)
            else: t = t*t*(3.-2.*t)
            return _gest_mix(left[1], right[1], t)
    raise ValueError('Unsorted gesture keys')


def _gest_legs(p):
    """Keep the original two leg-bone lengths through deep kneeling poses."""
    upper = math.sqrt(2.7**2+1.3**2+16.**2)
    lower = math.sqrt(.2**2+1.5**2+15.**2)
    body = stage2_body_frame(p)
    result = {}
    for side, offset, name in ((-1, p.foot_r, 'knee_r'), (1, p.foot_l, 'knee_l')):
        off = np.asarray(offset, float)
        hip = body.p(side*8.5, -.8, 36)
        ankle = np.array((side*11., -1., 5.))+off
        pole = np.array((side*11.2+p.body_x*.35,
                         .5+p.body_y*.3+max(0., -p.body_z)*.7,
                         20.+p.body_z*.3))+off*.5
        knee = two_bone_ik(hip, ankle, pole, upper, lower)
        result[name] = tuple(float(x) for x in knee)
    return replace(p, **result)


def sleep_rest():
    """One exact rest: jaw on glove, glove on anvil, hammer head on floor."""
    pitch = -57.
    a = math.radians(pitch)
    glove_rotation = F().rx(89.).R
    palm_radii = np.array((5.1,3.7,5.))
    palm_center = glove_rotation @ np.array((0.,1.,-2.2))
    extent = float(np.linalg.norm(glove_rotation[2]*palm_radii))
    tangent = (glove_rotation @ (palm_radii*palm_radii*glove_rotation[2]))/extent
    # A one-degree wrist inclination keeps the cuff clear of the steel top.
    # The actual palm ellipsoid, rather than its origin, rests on z31.05.
    glove_position = (25.-palm_center[0]-tangent[0],
                      30.9-palm_center[1]-tangent[1],
                      31.05-palm_center[2]+extent)
    jaw_contact_z = 31.05+2.*extent
    head_z = jaw_contact_z+3.+1.75
    head_y = 30.9-9.
    p = replace(Pose(), body_x=25.,
                body_y=head_y-(2.*math.cos(a)-42.*math.sin(a)),
                body_z=head_z-40.-(2.*math.sin(a)+42.*math.cos(a)),
                body_pitch=pitch, head_pitch=-pitch,
                blink=1., smile=.22, secondary_gain=0.,
                hammer_pos=(0.,27.,27.93), hammer_rot=(180.,0.,0.),
                left_hand=glove_position, glove_basis=_gest_matrix(glove_rotation),
                right_elbow=(-12.,12.,34.), left_elbow=(34.,12.,85.),
                foot_r=(10.,-2.,0.), foot_l=(10.,-2.,0.))
    return _gest_legs(p)


def _gest_wipe_pose(slide=0., clearance=0.):
    """The real striking end slides on the gauntlet's upper tangent plane."""
    glove = F((7.,23.,54.5)).rx(-10).rz(-5)
    normal, across = glove.R[:,2], glove.R[:,0]
    rotation = np.column_stack((normal, np.cross(across, normal), across))
    contact = glove.p(0,1,2.8)+across*float(slide)+normal*float(clearance)
    origin = contact-rotation@np.array((-9.,0.,22.))
    return replace(Pose(), body_x=2., body_z=-2.4, body_pitch=-5., body_roll=-.5,
                   head_pitch=20., head_yaw=10., eye_gaze=-.5,
                   hammer_pos=tuple(origin), hammer_basis=_gest_matrix(rotation),
                   left_hand=tuple(glove.o), glove_basis=_gest_matrix(glove.R),
                   right_elbow=(-28.,8.,60.), left_elbow=(28.,6.,56.))


def _gest_fidget_a(frame):
    hold = _gest_wipe_pose(-3.)
    keys = [
        (0, Pose()),
        (7, replace(Pose(), body_z=-.8, body_roll=-1.2, head_yaw=19.,
                    head_pitch=8., eye_gaze=-1., hammer_pos=(-25.,11.,70.),
                    hammer_rot=(-20.,-35.,5.), left_hand=(20.,13.,49.))),
        (12, _gest_wipe_pose(-3.,5.)),
        (15, hold),
        (21, _gest_wipe_pose(3.2)),
        (24, replace(_gest_wipe_pose(2.5), head_yaw=7., head_pitch=18.)),
        (28, replace(_gest_wipe_pose(-2.5), head_yaw=7., head_pitch=18.)),
        (32, replace(_gest_wipe_pose(-2.5,6.), eye_gaze=-.8, head_pitch=12.,
                     left_hand=(9.,22.,49.))),
        (36, replace(Pose(), body_z=-1., head_yaw=16., head_pitch=10.,
                     smile=.48, hammer_pos=(-23.,14.,68.), hammer_rot=(-8.,-35.,5.),
                     left_hand=(22.,16.,49.))),
        (42, replace(Pose(), body_z=-.25, head_yaw=3., smile=.25,
                     hammer_pos=(-25.,10.,63.), hammer_rot=(1.,-15.,-2.),
                     left_hand=(22.,11.,46.))),
        (47, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_fidget_b(frame):
    lean = replace(Pose(), body_x=8., body_y=-4., body_z=-8., body_pitch=-25.,
                   head_yaw=-20., head_pitch=-12., eye_gaze=.7,
                   hammer_pos=(-20.,4.,57.), hammer_rot=(-5.,-20.,-5.),
                   left_hand=(28.,23.,40.), right_elbow=(-25.,0.,47.),
                   left_elbow=(35.,10.,45.))
    inhale = replace(lean, body_z=-7.3, body_pitch=-22., head_pitch=-9.,
                     jaw_open=.16, blink=.20, left_hand=(28.,23.,41.))
    blow = replace(lean, body_z=-8.8, body_pitch=-29., head_pitch=-16.,
                   jaw_open=.86, blink=.42, smile=.05)
    keys = [
        (0, Pose()),
        (5, replace(Pose(), body_x=2., body_z=-2., body_pitch=-8.,
                    head_yaw=-10., head_pitch=7., eye_gaze=.6,
                    hammer_pos=(-24.,7.,60.), left_hand=(26.,16.,44.))),
        (10, lean),
        (16, inhale),
        (18, inhale, 'in'),
        (20, blow),
        (23, replace(blow, jaw_open=.72, head_yaw=-22., body_pitch=-30.)),
        (25, replace(lean, jaw_open=.35, head_yaw=-25., head_pitch=-15.)),
        (30, replace(lean, body_x=7., body_z=-6., body_pitch=-20.,
                     head_yaw=-27., head_pitch=-18., jaw_open=0.)),
        (35, replace(Pose(), body_x=3., body_z=-3., body_pitch=-8.,
                     head_yaw=-14., head_pitch=8., eye_gaze=.5,
                     hammer_pos=(-23.,9.,59.), left_hand=(24.,15.,52.))),
        (37, replace(Pose(), body_z=-1.7, body_roll=2., head_yaw=-12.,
                     hammer_pos=(-24.,9.,60.), left_hand=(29.,22.,56.),
                     glove_basis=_gest_matrix(F().rx(30).rz(-20).R)), 'out'),
        (40, replace(Pose(), body_z=-.8, head_yaw=-4.,
                     hammer_pos=(-25.,9.,61.), left_hand=(23.,14.,47.))),
        (44, replace(Pose(), head_yaw=1., smile=.25)),
        (47, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_look(frame):
    keys = [
        (0, Pose()),
        (4, replace(Pose(), eye_gaze=-1., head_pitch=13.)),
        (10, replace(Pose(), eye_gaze=-1., head_yaw=18., head_pitch=10.,
                     body_z=-.3, body_roll=-1., hammer_pos=(-25.,10.,62.5))),
        (14, replace(Pose(), eye_gaze=-.65, head_yaw=29., head_pitch=11.,
                     body_z=-.7, body_roll=-2.5, body_pitch=2.,
                     hammer_pos=(-25.,10.,63.), left_hand=(22.,11.,46.))),
        (20, replace(Pose(), eye_gaze=-.65, head_yaw=29., head_pitch=11.,
                     body_z=-.7, body_roll=-2.5, body_pitch=2.,
                     hammer_pos=(-25.,10.,63.), left_hand=(22.,11.,46.))),
        (23, replace(Pose(), eye_gaze=.4, head_yaw=20., head_pitch=12.,
                     body_z=-.4, body_roll=-1.2)),
        (28, replace(Pose(), eye_gaze=.1, head_yaw=-6., head_pitch=15.,
                     body_z=-.15, body_roll=.8)),
        (32, replace(Pose(), head_yaw=1.2, head_pitch=14.)),
        (35, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_sleep_in(frame):
    rest = sleep_rest()
    keys = [
        (0, Pose()),
        (5, replace(Pose(), body_x=1., body_y=1., body_z=-2., body_pitch=-7.,
                    head_pitch=12., blink=.35, hammer_pos=(-23.,11.,59.),
                    hammer_rot=(16.,-8.,-2.), left_hand=(25.,15.,44.),
                    secondary_gain=.45)),
        (9, replace(Pose(), body_x=5., body_y=-3., body_z=-5., body_pitch=-18.,
                    head_pitch=25., blink=.6, hammer_pos=(-15.,15.,52.),
                    hammer_rot=(50.,-8.,5.), left_hand=(29.,23.,40.),
                    glove_basis=_gest_matrix(F().rx(30).R), foot_r=(4.,-1.,2.5),
                    right_elbow=(-21.,7.,43.), left_elbow=(35.,12.,51.),
                    secondary_gain=.15)),
        (13, replace(Pose(), body_x=13., body_y=-5., body_z=-11., body_pitch=-34.,
                     head_pitch=39., blink=.85, hammer_pos=(-5.,25.,39.),
                     hammer_rot=(120.,0.,0.), left_hand=(28.,29.,36.),
                     glove_basis=_gest_matrix(F().rx(75).R), foot_r=(10.,-2.,0.),
                     foot_l=(4.,-1.,2.), right_elbow=(-15.,11.,34.),
                     left_elbow=(35.,12.,72.), secondary_gain=0.)),
        (17, replace(rest, body_x=21., body_y=-11., body_z=-16., body_pitch=-50.,
                     head_pitch=50., blink=.95, hammer_pos=(0.,27.,30.),
                     hammer_rot=(174.,0.,0.), foot_l=(10.,-2.,0.))),
        (21, replace(rest, body_z=rest.body_z+.45, head_pitch=56.5)),
        (23, rest),
        (29, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_sleep(frame):
    f = float(frame) % 84.
    p = sleep_rest()
    if f == 0.: return p
    if f <= 44.:
        breath = math.sin(math.pi*f/44.)**2
    else:
        breath = .72*math.sin(math.pi*(f-44.)/40.)**2
    # Chest breathes beneath a completely supported, immobile head and glove.
    pitch = p.body_pitch+.72*breath
    a = math.radians(pitch)
    resting_head = stage2_body_frame(p).p(0,2,82)
    head_z, head_y = float(resting_head[2]), float(resting_head[1])
    p = replace(p, body_pitch=pitch, head_pitch=-pitch,
                body_z=head_z-40.-(2.*math.sin(a)+42.*math.cos(a)),
                body_y=head_y-(2.*math.cos(a)-42.*math.sin(a)),
                tail=(0.,0.,0.,.12*breath,.25*breath,.48*breath))
    return p


def _gest_sleep_out(frame):
    rest = sleep_rest()
    keys = [
        (0, Pose()),
        (5, rest),
        (7, replace(rest, blink=.5)),
        (10, replace(rest, blink=0., body_z=rest.body_z+1.8,
                     head_pitch=61., eye_gaze=.3)),
        (15, replace(Pose(), body_x=16., body_y=-8., body_z=-11., body_pitch=-35.,
                     head_pitch=40., hammer_pos=(-9.,23.,41.), hammer_rot=(125.,0.,0.),
                     left_hand=rest.left_hand, glove_basis=rest.glove_basis,
                     left_elbow=(34.,12.,85.), right_elbow=(-20.,9.,38.),
                     foot_r=(10.,-2.,0.), foot_l=(10.,-2.,0.),
                     secondary_gain=0., smile=.4)),
        (20, replace(Pose(), body_x=6., body_y=-3., body_z=-4., body_pitch=-12.,
                     head_pitch=24., hammer_pos=(-22.,18.,55.), hammer_rot=(60.,-12.,-4.),
                     left_hand=(24.,20.,47.), foot_r=(5.,-1.,2.), foot_l=(10.,-2.,0.),
                     right_elbow=(-28.,8.,47.), left_elbow=(30.,8.,53.),
                     secondary_gain=.15, smile=.45)),
        (24, replace(Pose(), body_x=1., body_z=-1.5, body_pitch=-3., head_pitch=16.,
                     hammer_pos=(-25.,10.,62.), hammer_rot=(10.,-14.,-2.),
                     left_hand=(22.,13.,47.), foot_l=(4.,-1.,2.), secondary_gain=.5)),
        (27, replace(Pose(), body_z=-.5, head_pitch=15., smile=.25)),
        (29, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_startled(frame):
    rest = sleep_rest()
    keys = [
        (0, Pose()),
        (3, rest),
        (5, replace(rest, blink=0., eye_gaze=.65, body_z=rest.body_z+2.2,
                    head_pitch=64., smile=.03)),
        (7, replace(Pose(), body_x=15., body_y=-8., body_z=-11., body_pitch=-35.,
                    head_pitch=35., hammer_pos=(-14.,24.,42.), hammer_rot=(125.,0.,0.),
                    left_hand=(27.,24.,42.), glove_basis=_gest_matrix(F().rx(65).R),
                    foot_r=(10.,-2.,0.), foot_l=(10.,-2.,0.),
                    right_elbow=(-22.,8.,33.), secondary_gain=0., blink=0., smile=.02)),
        (9, replace(Pose(), root_z=4., body_x=6., body_y=-3., body_z=-5., body_pitch=-12.,
                    head_pitch=25., hammer_pos=(-24.,22.,49.), hammer_rot=(100.,0.,0.),
                    left_hand=(25.,19.,50.), foot_r=(4.,-1.,0.), foot_l=(5.,-1.,0.),
                    right_elbow=(-29.,7.,39.), secondary_gain=.15, smile=.02)),
        (11, replace(Pose(), root_z=7., body_x=1., body_z=-2., body_pitch=3.,
                     head_pitch=21., hammer_pos=(-23.,14.,63.), hammer_rot=(35.,-12.,0.),
                     left_hand=(26.,14.,62.), foot_r=(-1.,0.,0.), foot_l=(2.,0.,0.),
                     secondary_gain=.35, smile=.05)),
        (13, replace(Pose(), root_z=2.5, body_z=-3., body_pitch=-2.,
                     head_pitch=16., hammer_pos=(-25.,10.,62.), hammer_rot=(12.,-12.,-2.),
                     left_hand=(27.,15.,57.), foot_r=(-1.,0.,0.), foot_l=(2.,0.,0.),
                     secondary_gain=.5)),
        (15, replace(Pose(), body_z=-7., body_pitch=-8., head_pitch=21.,
                     hammer_pos=(-25.,9.,57.), hammer_rot=(8.,-11.,-2.),
                     left_hand=(24.,15.,43.), foot_r=(-1.,0.,0.), foot_l=(2.,0.,0.),
                     blink=.65, secondary_gain=.55)),
        (18, replace(Pose(), body_z=-2., head_yaw=-18., eye_gaze=.7,
                     hammer_pos=(-25.,9.,61.), left_hand=(23.,11.,45.), smile=.3)),
        (21, replace(Pose(), head_yaw=-5., smile=.5, blink=.35)),
        (23, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_hatch(frame):
    compact = replace(Pose(), body_y=-1., body_z=-13., body_pitch=-20.,
                      head_pitch=33., blink=.75, hammer_pos=(-18.,-6.,59.),
                      hammer_rot=(-35.,-45.,-10.), left_hand=(12.,15.,50.),
                      left_elbow=(25.,4.,42.), foot_r=(-2.,-2.,0.), foot_l=(2.,-2.,0.),
                      secondary_gain=.1)
    keys = [
        (0, Pose()), (5, compact),
        (10, replace(compact, body_z=-7., body_pitch=-12., head_pitch=25., blink=.2,
                     hammer_pos=(-20.,-3.,65.), left_hand=(17.,16.,54.), secondary_gain=.4)),
        (15, replace(Pose(), root_z=1.8, body_z=-1., body_pitch=2., head_pitch=20.,
                     hammer_pos=(-23.,1.,69.), hammer_rot=(-25.,-35.,-5.),
                     left_hand=(25.,15.,55.), smile=.6)),
        (19, replace(Pose(), body_z=-2.5, body_pitch=-4., head_pitch=9.,
                     hammer_pos=(-24.,5.,66.), hammer_rot=(-10.,-27.,-3.),
                     left_hand=(25.,14.,49.), blink=.4, smile=.45)),
        (24, replace(Pose(), body_z=-.4, head_pitch=16., smile=.45,
                     hammer_pos=(-25.,8.,63.), hammer_rot=(1.,-15.,-2.),
                     left_hand=(23.,11.,47.))),
        (30, replace(Pose(), smile=.25)),
        (35, Pose()),
    ]
    return _gest_keys(keys, frame)


def _gest_brow_contact(p, lateral):
    """Wipe the brow's convex skin from above instead of burying the glove."""
    H = stage2_body_frame(p).at(0,2,82).rz(p.head_yaw).rx(p.head_pitch)
    x = float(lateral)
    z = 2.3*math.sqrt(1.-(x/3.2)**2)
    normal = unit((x/(3.2**2), 0., z/(2.3**2)))
    tilt = math.degrees(math.atan2(normal[0], normal[2]))
    rotation = H.R @ F().ry(tilt).rx(180).R
    contact = H.p(8.+x, 6.7, 2.4+z)
    wrist = contact-rotation@np.array((0.,1.,2.8))
    return replace(p, left_hand=tuple(wrist), glove_basis=_gest_matrix(rotation),
                   left_elbow=(32.,7.,71.))


def _gest_tired(frame):
    support = replace(Pose(), body_x=8., body_y=-2., body_z=-10., body_pitch=-24.,
                      head_pitch=12., head_yaw=-12., eye_gaze=.35, blink=.55,
                      hammer_pos=(-18.,14.,51.), hammer_rot=(20.,-15.,-8.),
                      left_hand=(29.,27.,33.75), glove_basis=_gest_matrix(F().rx(90).R),
                      left_elbow=(34.,9.,73.), right_elbow=(-24.,7.,42.),
                      secondary_gain=.3, smile=.08)
    keys = [
        (0, Pose()),
        (6, replace(Pose(), body_z=-3., body_pitch=-7., head_pitch=7., blink=.45,
                    hammer_pos=(-25.,10.,58.), left_hand=(26.,16.,42.), smile=.08)),
        (11, support),
        (17, replace(support, body_pitch=-25., head_pitch=8., blink=.75)),
        (21, replace(Pose(), body_x=4., body_z=-4., body_pitch=-10., head_pitch=16.,
                     head_yaw=-6., blink=.8, hammer_pos=(-23.,9.,59.),
                     left_hand=(12.,12.,77.), left_elbow=(30.,3.,65.),
                     glove_basis=_gest_matrix(F().rx(-12).rz(15).R), secondary_gain=.5)),
        (24, replace(Pose(), body_x=3., body_z=-3., body_pitch=-7., head_pitch=17.,
                     head_yaw=-4., blink=1., hammer_pos=(-24.,9.,60.),
                     left_hand=(5.,16.,78.), left_elbow=(27.,5.,65.),
                     glove_basis=_gest_matrix(F().rx(-15).rz(-12).R), secondary_gain=.5)),
        (26, replace(Pose(), body_x=1.5, body_z=-2., body_pitch=-3., head_pitch=17.,
                     hammer_pos=(-25.,9.,61.), left_hand=(28.,23.,73.), smile=.3,
                     glove_basis=_gest_matrix(F().rx(20).rz(-20).R))),
        (27, replace(Pose(), body_x=1., body_z=-2., body_pitch=-3., head_pitch=17.,
                     hammer_pos=(-25.,9.,61.), left_hand=(18.,17.,65.), smile=.35)),
        (31, replace(Pose(), body_z=-.5, left_hand=(23.,12.,48.), smile=.3)),
        (35, Pose()),
    ]
    keys = [(f, _gest_brow_contact(p, 2.1 if f==21 else -1.8) if f in (21,24) else p)
            for f,p in keys]
    return _gest_keys(keys, frame)


def gestures_target(clip, frame):
    """Nine finished authored targets; one-shots return the literal idle pose."""
    spec = GESTURE_SPECS[clip]
    f = float(frame)
    if spec['loop']:
        f %= spec['frames']
    elif f <= 0. or f >= spec['frames']-1:
        return Pose()
    target = {
        'fidget_a': _gest_fidget_a,
        'fidget_b': _gest_fidget_b,
        'look': _gest_look,
        'sleep_in': _gest_sleep_in,
        'sleep': _gest_sleep,
        'sleep_out': _gest_sleep_out,
        'wake_startled': _gest_startled,
        'hatch': _gest_hatch,
        'tired': _gest_tired,
    }[clip]
    return _gest_legs(target(f))


def _gest_surface_support(primitive, direction):
    """Exact support of the renderer's primitive for contact/floor reporting."""
    d = unit(direction)
    kind = primitive['kind']
    if kind == 'poly':
        points = primitive['points']
        return points[int(np.argmax(points@d))]
    frame = primitive['frame']
    local = frame.R.T@d
    if kind == 'ell':
        radii = primitive['radii']
        return frame.o+frame.R@(local*radii*radii/max(np.linalg.norm(local*radii),1e-12))
    if kind == 'box':
        return frame.o+frame.R@(np.sign(local)*primitive['size']*.5)
    if kind == 'cap':
        a = frame.o+d*primitive['r1']
        b = frame.p(0,0,primitive['length'])+d*primitive['r2']
        return a if a@d >= b@d else b
    raise ValueError('Unknown contact primitive '+kind)


def _gest_same_pose(a, b):
    for name in Pose.__dataclass_fields__:
        av, bv = getattr(a,name), getattr(b,name)
        if av is None or bv is None:
            if av is not bv: return False
        elif not np.array_equal(np.asarray(av), np.asarray(bv)):
            return False
    return True


def gesture_contact_checks():
    """Small reproducible geometry audit used by the stage-three exporter.

    Whole-clip endpoint/clipping checks belong to the exporter. These samples
    additionally prove the intended material contacts from the actual solids.
    """
    sleeping = {'jaw_glove_error_max':0., 'glove_anvil_error_max':0.,
                'hammer_floor_error_max':0., 'floor_min':float('inf'),
                'leg_floor_min':float('inf'), 'apron_floor_min':float('inf'),
                'cloth_floor_min':float('inf'), 'skin_floor_min':float('inf'),
                'palm_contact_inside_work_plane':True}
    legs = {'upper_length_error_max':0., 'lower_length_error_max':0.}
    upper = math.sqrt(2.7**2+1.3**2+16.**2)
    lower = math.sqrt(.2**2+1.5**2+15.**2)
    A = F().at(31,30,0).rz(35)
    sleep_frames = (0.,11.,22.,33.,44.,55.,66.,77.,84.)
    for f in sleep_frames:
        p = gestures_target('sleep', f)
        rig = build_model(p)
        palm = next(q for q in rig.primitives if q['group']=='glove' and
                    q['kind']=='ell' and np.allclose(q['radii'],(5.1,3.7,5.)))
        jaw = next(q for q in rig.primitives if q['group']=='jaw' and
                   q['kind']=='ell' and np.allclose(q['radii'],(10.9,8.4,1.75)))
        high = _gest_surface_support(palm,(0,0,1))
        low = _gest_surface_support(palm,(0,0,-1))
        jaw_low = _gest_surface_support(jaw,(0,0,-1))
        sleeping['jaw_glove_error_max'] = max(sleeping['jaw_glove_error_max'],
                                              float(np.linalg.norm(jaw_low-high)))
        sleeping['glove_anvil_error_max'] = max(sleeping['glove_anvil_error_max'],
                                                abs(float(low[2]-rig.tags['anvilTop'][2])))
        q = (low-A.o)@A.R
        sleeping['palm_contact_inside_work_plane'] &= bool(-8.6<=q[0]<=7.9 and -4.5<=q[1]<=4.5)
        hammer_floor = float('inf')
        for primitive in rig.primitives:
            z = float(_gest_surface_support(primitive,(0,0,-1))[2])
            group = primitive['group']
            sleeping['floor_min'] = min(sleeping['floor_min'],z)
            if group.startswith('hammer_'):hammer_floor=min(hammer_floor,z)
            for prefix,key in (('leg_','leg_floor_min'),('apron','apron_floor_min'),
                               ('cloth','cloth_floor_min'),('skin_body','skin_floor_min')):
                if group.startswith(prefix): sleeping[key]=min(sleeping[key],z)
        sleeping['hammer_floor_error_max'] = max(sleeping['hammer_floor_error_max'],abs(hammer_floor))
        body = stage2_body_frame(p)
        for sign,side,off in ((-1,'R',p.foot_r),(1,'L',p.foot_l)):
            hip=body.p(sign*8.5,-.8,36)
            ankle=np.array((sign*11.,-1.,5.))+np.asarray(off)
            knee=rig.tags['knee'+side]
            legs['upper_length_error_max']=max(legs['upper_length_error_max'],
                                               abs(float(np.linalg.norm(knee-hip))-upper))
            legs['lower_length_error_max']=max(legs['lower_length_error_max'],
                                               abs(float(np.linalg.norm(ankle-knee))-lower))
    wipe = {'plane_error_max':0., 'normal_error_max':0., 'contact_inside_striking_face':True}
    wipe_frames = tuple(float(x) for x in np.arange(15.,28.001,.5))
    for f in wipe_frames:
        p=gestures_target('fidget_a',f)
        rig=build_model(p)
        palm=next(q for q in rig.primitives if q['group']=='glove' and
                  q['kind']=='ell' and np.allclose(q['radii'],(5.1,3.7,5.)))
        normal=palm['frame'].R[:,2]
        contact=_gest_surface_support(palm,normal)
        H=stage2_hammer_frame(p)
        face=rig.tags['hammerFace']
        wipe['plane_error_max']=max(wipe['plane_error_max'],abs(float((face-contact)@normal)))
        wipe['normal_error_max']=max(wipe['normal_error_max'],float(np.linalg.norm(H.R[:,0]-normal)))
        q=H.R.T@(contact-H.o)
        wipe['contact_inside_striking_face'] &= bool(abs(q[0]+9)<1e-8 and abs(q[1])<=3.55 and abs(q[2]-22)<=4.05)
    rest=sleep_rest()
    stitch={name+'_'+str(f):_gest_same_pose(gestures_target(name,f),rest)
            for name,f in (('sleep_in',23),('sleep_out',5),('wake_startled',3),('sleep',0),('sleep',84))}
    endpoints={name:(_gest_same_pose(gestures_target(name,0),Pose()) and
                     _gest_same_pose(gestures_target(name,spec['frames']-1),Pose()))
               for name,spec in GESTURE_SPECS.items() if not spec['loop']}
    return {'sleep_sample_frames':list(sleep_frames),'wipe_sample_frames':list(wipe_frames),
            'sleep':sleeping,'fidget_a':wipe,'legs':legs,'stitch':stitch,
            'one_shot_endpoints_exact':endpoints}


# Stage 3: one world-space gait, planted-foot turns and a continuous load.
_LOCO_YAWS = dict(n=-145., ne=-100., e=-55., se=-10., s=35., sw=80., w=125., nw=170.)
_LOCO_WORLD_SPEED = 18./.94
_LOCO_GROUND = F().at(31.,30.,0.).rz(35)
_LOCO_HANDLE = np.array([6.1,8.15,5.1])
_LOCO_FINGER = np.array([-.5,4.7,-5.2])
_LOCO_TAIL_BASE = np.array([(0,-7,33),(-3,-15,25),(-11,-24,16),
                            (-22,-28,10),(-32,-27,7),(-38,-19,6),(-39,-12,6.5)],float)
_LOCO_TAIL_RADII = np.array([8.1,7.8,6.4,5.1,3.7,2.5,.75])


def locomotion_speed(direction):
    """Actual projected velocity in pixels/second, including camera scale."""
    name=str(direction).lower().removeprefix('walk_')
    velocity=F().rz(_LOCO_YAWS[name]).v(0.,_LOCO_WORLD_SPEED,0.)
    camera=Renderer(azimuth=-35.,elevation=35.,scale=.94)
    value=np.array([np.dot(camera.right,velocity),-np.dot(camera.up,velocity)])*.94
    value[np.abs(value)<1e-12]=0.
    return tuple(map(float,value))


LOCOMOTION_SPECS = {
    **{'walk_'+direction:dict(frames=24,loop=True,speed=locomotion_speed(direction),
                             body_yaw=yaw,foot_contact=[0,12])
       for direction,yaw in _LOCO_YAWS.items()},
    'turn':dict(frames=96,loop=False,foot_contact=[12,27,42,57,72]),
    'take_anvil':dict(frames=48,loop=False,grip=[10,31],tail_support=[13,31],carry=35),
    'put_anvil':dict(frames=48,loop=False,grip=[12,35],tail_support=[12,32],carry=7),
}


def _loco_tuple(value):
    value=np.asarray(value,float)
    return tuple(map(tuple,value)) if value.ndim==2 else tuple(value)


def _loco_carry_frame(p):
    # The original -13 position intersected the thick tail root. The real
    # harness holds the rigid pedestal 3.5 units farther behind the pelvis.
    local=stage2_body_frame(p).at(0,-16.5,42.).rx(85.)
    yaw=F().rz(p.body_yaw).R
    return F(yaw@local.o+np.array([0.,0.,p.root_z]),yaw@local.R)


def _loco_set_anvil(p,frame):
    return replace(p,anvil_position=_loco_tuple(frame.o),anvil_basis=_loco_tuple(frame.R))


def _loco_bind_hands(p):
    """Rest hands follow the chest without stretching either two-bone arm."""
    body=stage2_body_frame(p)
    neutral=Pose()
    rotation=F().rx(neutral.hammer_rot[0]).ry(neutral.hammer_rot[1]).rz(neutral.hammer_rot[2]).R
    return replace(p,hammer_pos=_loco_tuple(body.p(neutral.hammer_pos)),
                   hammer_basis=_loco_tuple(body.R@rotation),
                   left_hand=_loco_tuple(body.p(neutral.left_hand)),
                   right_elbow=_loco_tuple(body.p(neutral.right_elbow)),
                   left_elbow=_loco_tuple(body.p(neutral.left_elbow)))


def _loco_knees(p):
    """The two leg lengths are measured once from the original standing rig."""
    body=stage2_body_frame(p)
    knees=[]
    for side,offset in ((-1,p.foot_r),(1,p.foot_l)):
        neutral_hip=np.array([side*8.5,-.8,36.])
        neutral_knee=np.array([side*11.2,.5,20.])
        neutral_ankle=np.array([side*11.,-1.,5.])
        upper=float(np.linalg.norm(neutral_knee-neutral_hip))
        lower=float(np.linalg.norm(neutral_ankle-neutral_knee))
        hip=body.p(neutral_hip);ankle=neutral_ankle+np.asarray(offset)
        old_pole=neutral_knee+np.array([p.body_x*.35,p.body_y*.3,p.body_z*.3])+np.asarray(offset)*.5
        bend=stage2_smooth(max(0.,-p.body_z)/10.)
        pole=old_pole*(1.-bend)+(hip+np.array([side*2.7,22.,12.]))*bend
        knee=two_bone_ik(hip,ankle,pole,upper,lower)
        knees.append(_loco_tuple(knee))
    return replace(p,knee_r=knees[0],knee_l=knees[1])


def carry_pose():
    """One canonical rest pose used exactly at take[35] and put[7]."""
    p=Pose(body_z=-1.5,body_pitch=-4.,head_pitch=18.,anvil_carry=1.,secondary_gain=0.)
    p=_loco_knees(_loco_bind_hands(p))
    return _loco_set_anvil(p,_loco_carry_frame(p))


def _loco_step(phase,side):
    """18 planted frames, 6 returning frames; both joins match foot velocity."""
    phase=float(phase)%24.
    rate=_LOCO_WORLD_SPEED/24.
    half=rate*9.
    if phase<=18.:
        return np.array([0.,half-rate*phase,0.])
    t=(phase-18.)/6.
    # Cubic Hermite, with the planted backward velocity at both ends.
    h00=2*t**3-3*t*t+1;h10=t**3-2*t*t+t
    h01=-2*t**3+3*t*t;h11=t**3-t*t
    y=h00*(-half)+h10*(-rate*6)+h01*half+h11*(-rate*6)
    lift=math.sin(math.pi*t)**2
    return np.array([side*.7*lift,y,5.2*lift])


def walk_target(direction,frame):
    """The same carried gait rotated in true 3-D into eight camera directions."""
    direction=str(direction).lower().removeprefix('walk_')
    f=float(frame)%24.;angle=math.tau*f/24.
    p=replace(carry_pose(),body_yaw=_LOCO_YAWS[direction],
              body_z=-3.0-1.05*math.cos(2*angle-math.pi/3)-.28*math.cos(angle-math.pi/3),
              body_pitch=-4.-1.2*math.sin(2*angle-.45),
              body_roll=1.35*math.sin(angle-.4),
              head_pitch=18.+.8*math.sin(2*angle-1.),
              foot_r=_loco_tuple(_loco_step(f,-1)),
              foot_l=_loco_tuple(_loco_step(f+12.,1)),
              secondary_gain=1.)
    p=_loco_bind_hands(p)
    p=replace(p,hammer_pos=_loco_tuple(np.asarray(p.hammer_pos)+[.5*math.sin(angle),0.,.8*math.sin(angle-.6)]),
              left_hand=_loco_tuple(np.asarray(p.left_hand)+[.3*math.sin(angle),.8*math.sin(angle+1),0.]))
    p=_loco_knees(p)
    return _loco_set_anvil(p,_loco_carry_frame(p))


def _loco_blend_pose(a,b,t):
    """Numeric pose interpolation; optional rigid frames stay rigid."""
    t=float(np.clip(t,0.,1.))
    if t<=0.:return a
    if t>=1.:return b
    out={}
    for name in Pose.__dataclass_fields__:
        av,bv=getattr(a,name),getattr(b,name)
        if name in ('anvil_position','anvil_basis','knee_r','knee_l','tail_points','coal_positions'):
            continue
        if name in ('hammer_basis','glove_basis'):
            if av is None and bv is None:out[name]=None
            elif av is not None and bv is not None:out[name]=_loco_tuple(_stage2_rotation_mix(np.asarray(av),np.asarray(bv),t))
            else:out[name]=av if t<.5 else bv
        elif av is None and bv is None:out[name]=None
        elif isinstance(av,bool):out[name]=av if t<.5 else bv
        elif isinstance(av,tuple):out[name]=_loco_tuple(np.asarray(av)*(1-t)+np.asarray(bv)*t)
        else:out[name]=float(av)*(1-t)+float(bv)*t
    return replace(Pose(),**out)


def _loco_stepping_feet(a,b,p,t,lift=4.5):
    """Each foot changes its world position only during its own swing."""
    old_yaw=F().rz(a.body_yaw).R;new_yaw=F().rz(b.body_yaw).R
    current=F().rz(p.body_yaw).R
    values=[]
    for side,name,start in ((-1,'foot_r',0.),(1,'foot_l',.5)):
        base=np.array([side*11.,0.,0.])
        source=old_yaw@(base+np.asarray(getattr(a,name)))
        target=new_yaw@(base+np.asarray(getattr(b,name)))
        u=float(np.clip((t-start)*2.,0.,1.));v=stage2_smooth(u)
        contact=source*(1-v)+target*v
        contact[2]+=lift*math.sin(math.pi*u)**2
        values.append(_loco_tuple(current.T@contact-base))
    return replace(p,foot_r=values[0],foot_l=values[1])


def life_carry_transition(a,b,t):
    """Ten-frame, stationary-offset stepping transition. Endpoints are exact.

    Caller renders t=1/10,...,1.  Incoming and outgoing walk phases are zero.
    Return type is Pose; no hidden root or screen translation is required.
    """
    t=float(np.clip(t,0.,1.))
    if t<=0.:return a
    if t>=1.:return b
    smooth=stage2_smooth(t)
    p=_loco_blend_pose(a,b,smooth)
    delta=(b.body_yaw-a.body_yaw+180.)%360.-180.
    p=replace(p,body_yaw=a.body_yaw+delta*smooth,
              body_z=p.body_z-1.35*math.sin(math.pi*t)**2,
              head_yaw=p.head_yaw+8.*math.sin(math.pi*t)*np.sign(delta),
              secondary_gain=0.)
    p=_loco_stepping_feet(a,b,p,t)
    p=_loco_knees(p)
    return _loco_set_anvil(p,_loco_carry_frame(p))


def _loco_turn(frame):
    f=float(frame)
    if f<=0. or f>=88.:return Pose()
    if f<12.:
        u=stage2_smooth(f/12.)
        p=Pose(body_z=-2.*u,body_pitch=-2.*u,head_pitch=14.+1.5*u,head_yaw=12.*math.sin(math.pi*f/24.),
               body_roll=-2.*math.sin(math.pi*f/12.))
    elif f<72.:
        q=(f-12.)/15.;quarter=min(3,int(q));t=q-quarter
        old=Pose(body_yaw=90.*quarter);new=Pose(body_yaw=90.*(quarter+1))
        p=Pose(body_yaw=90.*quarter+90.*stage2_smooth(t),body_z=-2.-1.2*math.sin(math.pi*t)**2,
               body_pitch=-2.,body_roll=2.*math.sin(math.tau*t),
               head_yaw=12.+8.*math.sin(math.pi*t),head_pitch=15.5)
        p=_loco_stepping_feet(old,new,p,t,4.8)
    else:
        t=stage2_smooth((f-72.)/16.)
        p=Pose(body_yaw=360.,body_z=-2.*(1.-t),body_pitch=-2.*(1.-t),
               head_yaw=12.*(1.-t),head_pitch=14.+1.5*(1.-t))
    p=_loco_bind_hands(p)
    p=_loco_knees(p)
    normal=_loco_normal_tail(p)
    compact=np.array([(0,-7,33),(-3,-15,25),(-11,-21,16),
                      (-19,-16,10),(-23,-7,7),(-22,2,6),(-15,11,6.5)],float)
    compact+=normal-_LOCO_TAIL_BASE
    weight=stage2_smooth(f/12.)*(1.-stage2_smooth((f-72.)/16.))
    p=replace(p,tail_points=_loco_tuple(normal*(1.-weight)+compact*weight))
    return p


def _loco_lift_body(f):
    # All positions are local to the fixed placement origin. The feet step
    # under the lowered pelvis instead of lengthening either leg.
    keys=[(0,{}),
          (5,dict(body_x=1.,body_y=10.,body_z=-12.,body_pitch=-23.,head_pitch=23.)),
          (10,dict(body_x=2.,body_y=23.,body_z=-24.,body_pitch=-30.,head_pitch=25.)),
          (13,dict(body_x=2.,body_y=23.,body_z=-24.,body_pitch=-30.,head_pitch=25.)),
          (17,dict(body_x=3.,body_y=21.,body_z=-20.,body_pitch=-27.,head_pitch=25.)),
          (21,dict(body_x=8.,body_y=10.,body_z=-12.,body_pitch=-18.,head_pitch=23.)),
          (25,dict(body_x=5.,body_y=-2.,body_z=-4.,body_pitch=-8.,head_pitch=20.)),
          (28,dict(body_x=2.,body_z=-2.,body_pitch=-5.,head_pitch=18.)),
          (31,dict(body_z=-1.5,body_pitch=-4.,head_pitch=18.)),
          (35,dict(body_z=-1.5,body_pitch=-4.,head_pitch=18.))]
    p=replace(Pose(),**stage2_key_pose(keys,f),secondary_gain=0.)
    # The two leather flaps fold over the thighs in the deep squat; their
    # original hanging lengths cannot pass through the floor under the load.
    fold=stage2_smooth((-p.body_z-5.)/19.)
    p=replace(p,apron=(88.*fold,94.*fold),cloth=90.*fold,tongs=95.*fold)
    feet=[]
    for goal,start,end,back0,back1 in [((0.,26.,0.),5.,10.,16.,21.),((-4.,30.,0.),0.,5.,21.,27.)]:
        if f<start:off=np.zeros(3)
        elif f<end:
            u=(f-start)/(end-start);off=np.asarray(goal)*stage2_smooth(u);off[2]+=4.8*math.sin(math.pi*u)**2
        elif f<=back0:off=np.asarray(goal)
        elif f<back1:
            u=(f-back0)/(back1-back0);off=np.asarray(goal)*(1.-stage2_smooth(u));off[2]+=4.8*math.sin(math.pi*u)**2
        else:off=np.zeros(3)
        feet.append(_loco_tuple(off))
    p=replace(p,foot_r=feet[0],foot_l=feet[1])
    return _loco_knees(_loco_bind_hands(p))


def _loco_lift_frame(f):
    carry=_loco_carry_frame(carry_pose())
    if f<=10.:return _LOCO_GROUND
    if f<13.:
        angle=-8.*stage2_smooth((f-10.)/3.)
        rotation=_LOCO_GROUND.rx(angle).R
        base=np.array([[x,y,0.] for x,y in [(-7,-8),(7,-8),(9.5,-5.5),(9.5,5.5),
                                          (7,8),(-7,8),(-9.5,5.5),(-9.5,-5.5)]])
        return F([31.,30.,-float(np.min(base@rotation[2]))],rotation)
    tilt=_LOCO_GROUND.rx(-8.).R
    keys=[(13,F([31.,30.,8.*math.sin(math.radians(8.))],tilt)),
          (17,F([31.,30.,10.],tilt)),
          (21,F([35.,12.,24.],F().rz(15.).rx(35.).R)),
          (25,F([32.,-13.,37.],F().rx(78.).R)),
          (28,F([16.,-16.,42.],F().rx(85.).R)),
          (31,carry),(35,carry)]
    for (fa,a),(fb,b) in zip(keys,keys[1:]):
        if fa<=f<=fb:
            t=stage2_smooth((f-fa)/(fb-fa))
            return F(a.o*(1-t)+b.o*t,_stage2_rotation_mix(a.R,b.R,t))
    return carry


def _loco_normal_tail(p):
    points=_LOCO_TAIL_BASE.copy()
    move=stage2_body_frame(p).p(points[0])-points[0]
    points+=np.array([1.,.72,.36,.15,.04,0.,0.])[:,None]*move
    points[:,2]=np.maximum(points[:,2],_LOCO_TAIL_RADII)
    return points


def _loco_support_tail(p,A,f):
    base=stage2_body_frame(p).p(_LOCO_TAIL_BASE[0])
    # A sphere at the final joint touches the same underside material point.
    end=A.p(-6.,-6.,0.)-A.v(0.,0.,.75)
    front=np.array([base,base+[-2,-11,-3.5],base+[6,-18,-9],base+[18,-16,-13],
                    end+[1,-15,-8],end+[3,-6,-3],end])
    back=np.array([base,base+[-3,-10,-5],base+[-12,-17,-11],base+[-22,-18,-10],
                   base+[-23,-11,-5],base+[-17,-6,-1],end])
    w=stage2_smooth((f-23.)/8.)
    points=front*(1-w)+back*w
    points[:,2]=np.maximum(points[:,2],_LOCO_TAIL_RADII)
    return points


def _loco_take_work(frame):
    f=float(np.clip(frame,0.,35.))
    if f<=0.:return Pose()
    if f>=35.:return carry_pose()
    p=_loco_lift_body(f);A=_loco_lift_frame(f)
    grip_rotation=A.rz(180.).R
    wrist=A.p(_LOCO_HANDLE)-grip_rotation@_LOCO_FINGER
    free=np.asarray(p.left_hand)
    default_glove=F().rx(-10.).rz(-5.).R
    grasp=stage2_smooth((f-6.)/4.)
    if f<=31.:
        hand=free*(1-grasp)+wrist*grasp
        rotation=_stage2_rotation_mix(default_glove,grip_rotation,grasp)
    else:
        # Release above the pedestal, then around the outside of the shoulder.
        points=[(31.,wrist),(32.,np.array([26.,-18.,62.])),
                (33.,np.array([32.,-4.,56.])),(35.,free)]
        for (fa,a),(fb,b) in zip(points,points[1:]):
            if fa<=f<=fb:
                t=stage2_smooth((f-fa)/(fb-fa));hand=a*(1-t)+b*t;break
        grasp=1.-stage2_smooth((f-31.)/4.)
        rotation=_stage2_rotation_mix(default_glove,grip_rotation,grasp)
    pole=A.p(6.1,22.,22.)
    p=replace(p,left_hand=_loco_tuple(hand),glove_basis=_loco_tuple(rotation),
              left_elbow=_loco_tuple(np.asarray(p.left_elbow)*(1-grasp)+pole*grasp),
              anvil_carry=stage2_smooth((f-24.)/7.))
    normal=_loco_normal_tail(p)
    supported=_loco_support_tail(p,A,min(f,31.))
    weight=stage2_smooth((f-6.)/7.)*(1.-stage2_smooth((f-31.)/4.))
    tail=normal*(1-weight)+supported*weight
    p=replace(p,tail_points=_loco_tuple(tail))
    return _loco_set_anvil(p,A)


def locomotion_target(clip,frame):
    if clip.startswith('walk_'):return walk_target(clip,frame)
    f=float(frame)
    if f<=0. or f>=LOCOMOTION_SPECS[clip]['frames']-1:return Pose()
    if clip=='turn':return _loco_turn(f)
    if clip=='take_anvil':return _loco_take_work(f if f<=35. else 35.*(47.-f)/12.)
    if clip=='put_anvil':return _loco_take_work(35.*f/7. if f<=7. else 35.*(47.-f)/40.)
    raise ValueError('Unknown locomotion clip '+clip)


def _loco_anvil_min_z(A,primitives):
    lowest=float('inf')
    for item in primitives:
        kind=item['kind']
        if kind=='poly':z=float(np.min(item['points']@A.R[2]+A.o[2]))
        else:
            frame=item['frame'];center=A.p(frame.o);row=(A.R@frame.R)[2]
            if kind=='ell':z=center[2]-float(np.linalg.norm(row*item['radii']))
            elif kind=='box':z=center[2]-float(np.abs(row)@(item['size']*.5))
            else:z=min(center[2]-item['r1'],center[2]+row[2]*item['length']-item['r2'])
        lowest=min(lowest,float(z))
    return lowest


def locomotion_contact_checks():
    """Reproducible numerical checks, with no images or external assets.

    Pickup/putdown are sampled at quarter frames. Foot velocity is measured in
    world units and projected pixels per second, after adding manifest travel.
    The exporter separately checks complete rendered bounds and geometry floor.
    """
    camera=Renderer(azimuth=-35.,elevation=35.,scale=.94)
    template=Rig();draw_anvil(template,F(),M)
    planted_world=0.;planted_screen=0.;turn_plant=0.
    grip_error=0.;tail_error=0.;orthogonal=0.;floor=float('inf')
    reach=0.;arm_error=0.;leg_error=0.;failures=[];samples=0
    loop_exact=True
    for direction,yaw in _LOCO_YAWS.items():
        rotation=F().rz(yaw).R;velocity=rotation@np.array([0.,_LOCO_WORLD_SPEED,0.])
        loop_exact=loop_exact and walk_target(direction,0.)==walk_target(direction,24.)
        for frame in np.arange(.25,24.,.5):
            a=walk_target(direction,float(frame));b=walk_target(direction,float(frame)+1e-3)
            for side,name,phase in ((-1,'foot_r',frame%24.),(1,'foot_l',(frame+12.)%24.)):
                if phase>=18.:continue
                speed=rotation@(np.asarray(getattr(b,name))-np.asarray(getattr(a,name)))*24000.+velocity
                planted_world=max(planted_world,float(np.linalg.norm(speed)))
                projected=np.array([camera.right@speed,-camera.up@speed])*.94
                planted_screen=max(planted_screen,float(np.linalg.norm(projected)))
    carried=carry_pose()
    transition_poses=[carried]+[walk_target(d,0.) for d in ('e','n','w','s')]+[carried]
    for a,b in zip(transition_poses,transition_poses[1:]):
        for t in np.arange(.025,1.,.05):
            try:
                p=life_carry_transition(a,b,float(t));q=life_carry_transition(a,b,float(t)+1e-5)
                side,name=(1,'foot_l') if t<.5 else (-1,'foot_r')
                base=np.array([side*11.,0.,0.])
                old=F().rz(p.body_yaw).v(base+np.asarray(getattr(p,name)))
                new=F().rz(q.body_yaw).v(base+np.asarray(getattr(q,name)))
                turn_plant=max(turn_plant,float(np.linalg.norm(new-old))*24./(10.*1e-5))
            except ValueError as exc:failures.append(str(exc))
    for clip in ('take_anvil','put_anvil'):
        for frame in np.arange(0.,47.001,.25):
            samples+=1
            try:
                p=locomotion_target(clip,float(frame));body=stage2_body_frame(p)
                if clip=='take_anvil':phase=frame if frame<=35. else 35.*(47.-frame)/12.
                else:phase=35.*frame/7. if frame<=7. else 35.*(47.-frame)/40.
                A=_loco_lift_frame(float(phase))
                floor=min(floor,_loco_anvil_min_z(A,template.primitives))
                orthogonal=max(orthogonal,float(np.max(np.abs(A.R.T@A.R-np.eye(3)))))
                if 10.<=phase<=31.:
                    palm=F(p.left_hand,np.asarray(p.glove_basis))
                    grip_error=max(grip_error,float(np.linalg.norm(palm.p(_LOCO_FINGER)-A.p(_LOCO_HANDLE))))
                if 13.<=phase<=31.:
                    contact=np.asarray(p.tail_points)[-1]+A.v(0.,0.,.75)
                    tail_error=max(tail_error,float(np.linalg.norm(contact-A.p(-6.,-6.,0.))))
                for side,hand,pole,offset,knee in [(-1,p.hammer_pos,p.right_elbow,p.foot_r,p.knee_r),
                                                  (1,p.left_hand,p.left_elbow,p.foot_l,p.knee_l)]:
                    shoulder=body.p(side*16.,0.,65.)
                    elbow=two_bone_ik(shoulder,hand,pole)
                    reach=max(reach,float(np.linalg.norm(np.asarray(hand)-shoulder)))
                    arm_error=max(arm_error,abs(float(np.linalg.norm(elbow-shoulder))-17.),
                                  abs(float(np.linalg.norm(elbow-hand))-14.5))
                    hip=body.p(side*8.5,-.8,36.)
                    ankle=np.array([side*11.,-1.,5.])+offset
                    base_knee=np.array([side*11.2,.5,20.])
                    knee=base_knee if knee is None else np.asarray(knee)
                    upper=np.linalg.norm(base_knee-np.array([side*8.5,-.8,36.]))
                    lower=np.linalg.norm(base_knee-np.array([side*11.,-1.,5.]))
                    leg_error=max(leg_error,abs(float(np.linalg.norm(knee-hip)-upper)),
                                  abs(float(np.linalg.norm(knee-ankle)-lower)))
            except ValueError as exc:failures.append(clip+' frame '+str(frame)+': '+str(exc))
    endpoints=all(locomotion_target(clip,f)==Pose() for clip in ('turn','take_anvil','put_anvil')
                  for f in (0,LOCOMOTION_SPECS[clip]['frames']-1))
    stitches=locomotion_target('take_anvil',35.)==carried and locomotion_target('put_anvil',7.)==carried
    return dict(passed=not failures and endpoints and stitches and loop_exact and floor>=-1e-7
                and max(planted_world,turn_plant,grip_error,tail_error,arm_error,leg_error)<1e-6,
                quarter_frame_pickup_samples=samples,failures=failures,
                planted_foot_world_speed_error=planted_world,planted_foot_screen_speed_error=planted_screen,
                transition_planted_foot_world_speed_error=turn_plant,
                handle_contact_error=grip_error,tail_support_error=tail_error,
                minimum_anvil_z=floor,max_rotation_orthogonality_error=orthogonal,
                max_arm_reach=reach,max_arm_length_error=arm_error,max_leg_length_error=leg_error,
                nonloop_endpoints_exact=endpoints,carried_stitches_exact=stitches,walk_virtual_endpoints_exact=loop_exact,
                speed={d:locomotion_speed(d) for d in _LOCO_YAWS})

# Two authored techniques share the rig, but have different weight and rhythm.
TECH_SPECS = {
    'tech_ember_wave': {'frames': 48, 'loop': False, 'hit': [27, 30, 33]},
    'tech_tail_stamp': {'frames': 48, 'loop': False, 'hit': [25]},
}

_TECH_COAL_LOCAL = ((-2.45, 6.55, 11.7), (0., 6.8, 12.), (2.4, 6.45, 11.7))
_TECH_COAL_RADII = (1.45, 1.60, 1.40)
_TECH_COAL_LAUNCH = (23, 24, 25)
_TECH_COAL_HIT = (27, 30, 33)
_TECH_COAL_GROUND = ((34., 40.), (34., 49.), (46., 42.))
_TECH_TAIL_REST = np.array([(0.,-7.,33.),(-3.,-15.,25.),(-11.,-24.,16.),
                           (-22.,-28.,10.),(-32.,-27.,7.),(-38.,-19.,6.),(-39.,-12.,6.5)])
_TECH_TAIL_WIDTH = np.array([8.1, 7.8, 6.4, 5.1, 3.7, 2.5, .75])
_TECH_TAIL_LENGTH = np.linalg.norm(np.diff(_TECH_TAIL_REST, axis=0), axis=1)


def tech_coal_state(frame):
    """The three existing solids leave the pocket and return along visible arcs."""
    f = float(frame)
    A = F().at(31., 30., 0.).rz(35)
    points, heat, stages = [], [], []
    for i, (launch, hit, radius) in enumerate(zip(_TECH_COAL_LAUNCH, _TECH_COAL_HIT, _TECH_COAL_RADII)):
        source = A.p(_TECH_COAL_LOCAL[i])
        landing = np.array([*_TECH_COAL_GROUND[i], radius])
        direction = unit(landing-source)
        drift = np.array([direction[0], direction[1], 0.])*(2.3+i*.3)
        bounce_end = hit+(5, 6, 6)[i]
        rest = landing+drift
        if f <= launch:
            point, temperature, state = source, 1., 'pocket'
        elif f <= hit:
            u = (f-launch)/(hit-launch)
            point = source*(1-u)+landing*u
            point[2] += (12., 18., 23.)[i]*4*u*(1-u)
            temperature, state = 1., 'flight'
        elif f < bounce_end:
            u = (f-hit)/(bounce_end-hit)
            point = landing+drift*u
            point[2] += (3.3, 4.4, 5.1)[i]*4*u*(1-u)
            temperature, state = 1.-.62*u, 'bounce'
        elif f < 40:
            point, temperature, state = rest, max(.13, .38-.05*(f-bounce_end)), 'cool'
        elif f < 46:
            u = stage2_smooth((f-40)/6.)
            point = rest*(1-u)+source*u
            point[2] += (7., 8.5, 10.)[i]*4*u*(1-u)
            temperature, state = .18+.82*u, 'return'
        else:
            point, temperature, state = source, 1., 'pocket'
        points.append(tuple(float(v) for v in point))
        heat.append(float(temperature)); stages.append(state)
    return tuple(points), tuple(heat), tuple(stages)


def _tech_tail_shape(frame, pose, include_lag=False):
    """Seven fixed-length links; both the pelvis and the contact surface are pinned."""
    rest = _TECH_TAIL_REST
    low = rest.copy(); low[3:, 2] += np.array([1., 3., 5., 5.])
    curl = np.array([(0,-7,33),(-6.778,-12.158,24.972),(-16.216,-20.936,17.234),
                     (-20.496,-33.371,17.015),(-19.109,-42.771,21.456),
                     (-23.077,-51.942,20.387),(-25.829,-53.575,14.061)], float)
    hit = np.array([(0,-7,33),(-4,-15,24),(-12,-25,17),(-24,-29,11),
                    (-34,-26,6),(-42,-20,3),(-43,-13,.75)], float)
    rebound = hit.copy(); rebound[3:,2] += np.array([2.,4.,7.,9.])
    settled = rest.copy(); settled[4:,2] += np.array([1.,2.,1.])
    keys = [(0,rest),(8,low),(18,curl),(21,curl),(25,hit),(29,rebound),
            (34,settled),(40,rest),(47,rest)]
    points = rest.copy()
    for (fa,a),(fb,b) in zip(keys,keys[1:]):
        if fa <= frame <= fb:
            u = (float(frame)-fa)/(fb-fa)
            u = u*u if fa == 21 else stage2_smooth(u)
            points = a*(1-u)+b*u
            break
    attachment = stage2_body_frame(pose).p(rest[0])-rest[0]
    points += np.array([1., .72, .36, .15, .04, 0., 0.])[:,None]*attachment
    if include_lag:
        for i in range(1,7):
            points[i] += np.array([.25,0.,.15])*float(pose.tail[i-1])
    points[:,2] = np.maximum(points[:,2],_TECH_TAIL_WIDTH)
    root, target = points[0].copy(), points[-1].copy()
    # FABRIK preserves the six original centre distances. Ground limits refer
    # to actual segment radii; the final centre is .75 above the stamp.
    for _ in range(96):
        points[-1] = target
        for j in range(5,-1,-1):
            points[j] = points[j+1]+unit(points[j]-points[j+1])*_TECH_TAIL_LENGTH[j]
            points[j,2] = max(_TECH_TAIL_WIDTH[j],points[j,2])
        points[0] = root
        for j in range(1,7):
            points[j] = points[j-1]+unit(points[j]-points[j-1])*_TECH_TAIL_LENGTH[j-1]
            points[j,2] = max(_TECH_TAIL_WIDTH[j],points[j,2])
        if np.linalg.norm(points[-1]-target) < 1e-8:
            break
    points[-1] = target
    return tuple(tuple(float(v) for v in point) for point in points)


def tech_resolve(clip, frame, pose):
    """Run after the shared springs: solve tail mass without stretching its links."""
    if clip != 'tech_tail_stamp' or frame <= 0 or frame >= 47:
        return pose
    return replace(pose,tail_points=_tech_tail_shape(frame,pose,True),tail=(0.,)*6)


def tech_target(clip, frame):
    f = float(frame)
    if clip not in TECH_SPECS:
        raise KeyError(clip)
    if f <= 0 or f >= 47:
        return Pose()
    if clip == 'tech_ember_wave':
        keys = [
            (0, {}),
            (8, dict(body_z=-3., body_pitch=6., body_roll=-3., head_yaw=14.,
                     head_pitch=22., left_hand=(23.,17.,40.), hammer_pos=(-27.,4.,60.),
                     hammer_rot=(-4.,-21.,-8.), eye_gaze=.4)),
            (17, dict(body_z=-1., body_pitch=3., body_roll=-2., head_yaw=16.,
                      head_pitch=23., left_hand=(22.,14.,44.), hammer_pos=(-27.,3.,61.),
                      hammer_rot=(-8.,-24.,-8.), jaw_open=.7, eye_gaze=.65, smile=.3)),
            (23, dict(body_z=-4., body_pitch=10., body_roll=-4., head_yaw=19.,
                      head_pitch=28., left_hand=(23.,15.,44.), hammer_pos=(-27.,4.,60.),
                      hammer_rot=(-8.,-22.,-8.), jaw_open=.85, eye_gaze=.8, smile=.2)),
            (29, dict(body_z=-2., body_pitch=6., body_roll=-2., head_yaw=23.,
                      head_pitch=24., left_hand=(25.,16.,43.), hammer_pos=(-27.,4.,61.),
                      hammer_rot=(-7.,-22.,-7.), jaw_open=.18, eye_gaze=.85, smile=.45)),
            (35, dict(body_z=-1., body_pitch=4., head_yaw=21., head_pitch=26.,
                      left_hand=(22.,14.,48.), hammer_pos=(-26.,6.,62.),
                      hammer_rot=(-3.,-17.,-4.), eye_gaze=.6, smile=.65)),
            (40, dict(body_pitch=2., head_yaw=11., head_pitch=20.,
                      left_hand=(20.,13.,49.), hammer_pos=(-25.,8.,62.),
                      hammer_rot=(0.,-13.,-3.), eye_gaze=.25, smile=.45)),
            (47, {})]
        pose = replace(Pose(), **stage2_key_pose(keys,f))
        points, heat, _ = tech_coal_state(f)
        if 23 <= f < 46:
            pose = replace(pose, coal_positions=points, coal_heat=heat)
        return pose
    keys = [
        (0, {}),
        (8, dict(body_x=2., body_z=-1., body_roll=4., body_yaw=-3., head_yaw=-19.,
                 head_pitch=22., eye_gaze=-.7, left_hand=(16.,12.,51.),
                 hammer_pos=(-26.,7.,61.), hammer_rot=(-2.,-15.,-4.))),
        (18, dict(body_x=3., body_z=-2., body_roll=7., body_yaw=-6., head_yaw=-27.,
                  head_pitch=19., eye_gaze=-.9, left_hand=(14.,13.,54.),
                  hammer_pos=(-25.,4.,61.), hammer_rot=(-5.,-20.,-5.), smile=.3)),
        (21, dict(body_x=3., body_z=-2., body_roll=7., body_yaw=-6., head_yaw=-27.,
                  head_pitch=22., eye_gaze=-.9, left_hand=(14.,13.,54.),
                  hammer_pos=(-25.,4.,61.), hammer_rot=(-5.,-20.,-5.), smile=.3,
                  secondary_gain=0.)),
        (25, dict(body_x=1., body_z=-4., body_roll=-3., body_yaw=-2., head_yaw=-25.,
                  head_pitch=27., eye_gaze=-.8, left_hand=(16.,14.,50.),
                  hammer_pos=(-26.,6.,59.), hammer_rot=(-5.,-17.,-4.), smile=.4,
                  secondary_gain=0.)),
        (29, dict(body_x=2., body_z=-2., body_roll=2., body_yaw=-3., head_yaw=-22.,
                  head_pitch=24., eye_gaze=-.7, left_hand=(15.,14.,53.),
                  hammer_pos=(-26.,6.,61.), hammer_rot=(-2.,-15.,-4.), smile=.55,
                  secondary_gain=0.)),
        (35, dict(body_x=1., body_roll=1., head_yaw=-17., head_pitch=23.,
                  eye_gaze=-.45, left_hand=(13.,15.,57.), smile=.65, secondary_gain=.35)),
        (40, dict(head_yaw=-8., head_pitch=19., eye_gaze=-.2,
                  left_hand=(17.,13.,53.), smile=.4, secondary_gain=.6)),
        (47, {})]
    pose = replace(Pose(), **stage2_key_pose(keys,f))
    return replace(pose, tail_points=_tech_tail_shape(f,pose))

# Technique and gesture effects are procedural native pixels; solids stay in the rig.
def stage3_extra_meta(clip, frame, pose, tags):
    meta = {}
    if clip == 'tech_ember_wave':
        _, heat, stages = tech_coal_state(frame)
        meta.update(hit_frame=None, ember_hits=list(_TECH_COAL_HIT),
                    ember_heat=list(heat), ember_stages=list(stages),
                    ember_radii=list(_TECH_COAL_RADII),
                    ember_breath_active=18 <= frame <= 27,
                    ember_breath_progress=(frame-18)/9.,
                    ember_source=tuple(tags['coalPocket']),
                    ember_mouth=tuple(tags['mouth']))
    elif clip == 'tech_tail_stamp':
        meta.update(hit_frame=None, tail_hit=25, tail_contact=tuple(tags['tailContact']),
                    tail_tip=tuple(tags['tailTip']))
        if pose.tail_points is not None:
            points=np.asarray(pose.tail_points,float).copy()
            for i in range(1,7):
                points[i]+=np.array([.25,0.,.15])*float(pose.tail[i-1])
            points[:,2]=np.maximum(points[:,2],_TECH_TAIL_WIDTH)
            meta['tail_link_length_error']=float(np.max(abs(np.linalg.norm(np.diff(points,axis=0),axis=1)-_TECH_TAIL_LENGTH)))
    elif clip == 'fidget_b':
        meta.update(scale_breath_active=19 <= frame <= 25,
                    scale_breath_progress=(frame-18)/8., scale_births=[20,22,24])
    elif clip == 'sleep':
        meta['sleep_exhales'] = [30,70]
    return meta


def _s3_ground_oval(draw, renderer, center, rx, ry, color, width=None):
    center = np.asarray(center,float)
    points = [_fx_xy(renderer,center+np.array([rx*math.cos(t),ry*math.sin(t),0.]))
              for t in np.linspace(0.,math.tau,21)]
    if width is None:
        draw.polygon(points,fill=color)
    else:
        draw.line(points,fill=color,width=width)


def _s3_depth_path(back_draw, front_draw, renderer, points, colors):
    for p,q in zip(points,points[1:]):
        sx,sy,depth = renderer.project((np.asarray(p)+np.asarray(q))*.5)
        x,y = int(round(sx)),int(round(sy))
        hidden = 0 <= x < 160 and 0 <= y < 128 and depth < renderer.depth[y,x]-.1
        draw = back_draw if hidden else front_draw
        path = [_fx_xy(renderer,p),_fx_xy(renderer,q)]
        for color,width in colors:
            draw.line(path,fill=color,width=width)


def _s3_breath(back, front, renderer, mouth, target, progress, hot=True):
    """One unbroken depth-aware path starts at the actual moving mouth tag."""
    strength = min(1.,max(0.,progress*5.),max(0.,(1.-progress)*5.))
    if strength <= .01:
        return {'source_error':0.,'pixels':0,'visible':False}
    mouth,target = np.asarray(mouth,float),np.asarray(target,float)
    bend = renderer.right*(8. if hot else 4.)+np.array([0.,2.,0.])
    points = [mouth*(1-u)+target*u+bend*math.sin(math.pi*u)
              for u in np.linspace(0.,1.,25)]
    layer_back,layer_front = Image.new('RGBA',CELL),Image.new('RGBA',CELL)
    bd,fd = ImageDraw.Draw(layer_back),ImageDraw.Draw(layer_front)
    if hot:
        colors = [((110,53,38,int(110*strength)),5),((202,101,42,int(165*strength)),3),
                  ((249,180,80,int(215*strength)),1)]
    else:
        colors = [((89,77,72,int(105*strength)),3),((158,139,111,int(135*strength)),1)]
    _s3_depth_path(bd,fd,renderer,points,colors)
    for j in (6,11,16,21):
        x,y = _fx_xy(renderer,points[j]);radius = 1+j//12
        x += round(math.sin(j+progress*math.tau))
        bd.polygon([(x-radius,y),(x-radius+1,y-2),(x+1,y-3),(x+radius+1,y-1),
                    (x+radius,y+1),(x-1,y+2)],fill=(82,65,60,int(95*strength)))
        if hot:
            bd.line((x-1,y-1,x+1,y),fill=(234,141,63,int(150*strength)),width=1)
    # The muzzle stays legible even when a depth-interpolated thick edge grazes it.
    face_ids = [i for i,n in enumerate(renderer.group_names) if n in ('head','jaw','crest')]
    arr = np.array(layer_front)
    arr[np.isin(renderer.group,face_ids)] = 0
    layer_front = Image.fromarray(arr,'RGBA')
    back.alpha_composite(layer_back);front.alpha_composite(layer_front)
    count = int(np.count_nonzero(np.asarray(layer_back)[...,3])+np.count_nonzero(arr[...,3]))
    return {'source_error':float(np.linalg.norm(points[0]-mouth)), 'pixels':count,'visible':True}


def _s3_ember_wave(back, front, renderer, tags, meta, history, frame):
    bd,fd = ImageDraw.Draw(back),ImageDraw.Draw(front)
    metrics = {'ember_wave_solids':3,'ember_wave_airborne':0,'ember_wave_contacts':[],
               'ember_wave_contact_errors':[],'ember_wave_shadow_count':0,
               'ember_wave_returning':0,'ember_wave_max_rise_px':0.,
               'ember_wave_breath_visible':False,'ember_wave_breath_source_error':0.,
               'coal_contact_errors':[],'coal_contact_indices':[],'source_error':0.}
    if meta.get('ember_breath_active',False):
        result = _s3_breath(back,front,renderer,tags['mouth'],tags['coalPocket'],
                            meta['ember_breath_progress'],True)
        metrics.update(ember_wave_breath_visible=result['visible'],
                       ember_wave_breath_source_error=result['source_error'],
                       ember_wave_breath_pixels=result['pixels'],source_error=result['source_error'])
        bd,fd = ImageDraw.Draw(back),ImageDraw.Draw(front)
    for i,(launch,hit,radius) in enumerate(zip(_TECH_COAL_LAUNCH,_TECH_COAL_HIT,_TECH_COAL_RADII)):
        name = 'coal'+str(i);point = np.asarray(tags[name],float)
        heat = float(meta['ember_heat'][i]);stage = meta['ember_stages'][i]
        if stage in ('flight','bounce','return'):
            metrics['ember_wave_airborne'] += 1
            metrics['ember_wave_returning'] += int(stage=='return')
            base = point.copy();base[2]=.03
            height = max(0.,point[2]-radius)
            width = max(.8,2.3-height*.035)
            _s3_ground_oval(bd,renderer,base,width,width*.62,(24,21,28,int(max(30,100-height*2.2))))
            metrics['ember_wave_shadow_count'] += 1
            previous = [np.asarray(h[name],float) for h in history[-3:] if name in h]
            if len(previous)>1 and np.linalg.norm(previous[-1]-previous[0])>.05:
                alpha = int(190*(.4+.6*heat))
                _s3_depth_path(bd,fd,renderer,previous,
                               [((116,47,31,int(alpha*.6)),3),((234,128,49,alpha),1)])
            source = F().at(31.,30.,0.).rz(35).p(_TECH_COAL_LOCAL[i])
            metrics['ember_wave_max_rise_px'] = max(metrics['ember_wave_max_rise_px'],
                                                   float(renderer.project(source)[1]-renderer.project(point)[1]))
        if hit <= frame <= 44:
            sample = history[hit] if len(history)>hit else tags
            contact = np.asarray(sample[name],float).copy();contact[2]-=radius
            age = frame-hit;fade = min(1.,max(0.,(45-frame)/6.))
            _s3_ground_oval(bd,renderer,contact,2.5,1.5,(62,37,32,int(170*fade)))
            _s3_ground_oval(bd,renderer,contact,1.5,.7,(176,84,37,int(190*fade*max(.12,1-age/15.))))
            if age < 6:
                _fx_dust(bd,renderer,contact,age,.45)
                for side in (-1,1):
                    dust = contact+renderer.right*(side*(1+age*.7))+np.array([0,0,2.5+age*.45])
                    x,y = _fx_xy(renderer,dust)
                    fd.line((x,y,x+side,y-1),fill=(151,89,48,int(165*(1-age/6.))),width=1)
            if frame == hit:
                metrics['ember_wave_contacts'].append(i)
                metrics['ember_wave_contact_errors'].append(abs(float(point[2]-radius)))
                metrics['coal_contact_indices'].append(i)
                metrics['coal_contact_errors'].append(abs(float(point[2]-radius)))
        # Emission is an unobtrusive edge; the actual faceted coal is never redrawn.
        if launch < frame < 46 and heat>.4:
            x,y = _fx_xy(renderer,point)
            bd.line((x-2,y,x+2,y),fill=(180,74,30,int(64*heat)),width=3)
    return metrics


def _s3_tail_stamp(back, front, renderer, tags, meta, history, frame):
    bd,fd = ImageDraw.Draw(back),ImageDraw.Draw(front)
    metrics = {'tail_stamp_visible':False,'tail_stamp_contact_error':None,
               'tail_stamp_trail_samples':0,'tail_stamp_smoke_pixels':0,
               'tail_link_length_error':float(meta.get('tail_link_length_error',0.))}
    if 13 <= frame <= 25:
        x,y = _fx_xy(renderer,tags['tailTip']);heat = min(1.,(frame-12)/8.)
        bd.line((x-2,y,x+2,y),fill=(140,54,31,int(105*heat)),width=3)
        fd.point((x,y),fill=(246,169,72,int(180*heat)))
    if 22 <= frame <= 27 and len(history)>1:
        points = [h['tailTip'] for h in history[-3:]]
        _s3_depth_path(bd,fd,renderer,points,
                       [((97,48,38,100),4),((191,96,43,145),2),((243,169,77,190),1)])
        metrics['tail_stamp_trail_samples']=len(points)
    if 25 <= frame <= 46:
        sample = history[25] if len(history)>25 else tags
        contact = np.asarray(sample['tailContact'],float)
        age = frame-25;fade = min(1.,max(0.,(47-frame)/8.))
        _s3_ground_oval(bd,renderer,contact,5.,2.5,(48,31,31,int(190*fade)))
        _s3_ground_oval(bd,renderer,contact,3.7,1.4,(132,61,36,int(210*fade)))
        _s3_ground_oval(bd,renderer,contact,4.4,2.,(196,104,46,int(180*fade)),1)
        line = [_fx_xy(renderer,contact+np.array([x,0.,.06])) for x in (-2.8,2.8)]
        bd.line(line,fill=(247,181,84,int(220*fade*max(.08,1-age/19.))),width=1)
        metrics['tail_stamp_visible']=True
        metrics['tail_stamp_contact_error']=abs(float(contact[2]))
        if frame==25:
            metrics['tail_contact_error']=abs(float(contact[2]))
        if age < 14:
            for side in (-1,1):
                center=contact+renderer.right*(side*(2.+age*.48))+np.array([0.,0.,1.+age*.42])
                x,y=_fx_xy(renderer,center);rad=1+int(age>=4)
                color=(106,77,64,int(140*(1-age/14.)))
                bd.polygon([(x-rad,y),(x-rad,y-1),(x,y-2),(x+rad,y-1),(x+rad+1,y),(x,y+1)],fill=color)
                bd.point((x-1,y-1),fill=(169,119,73,int(100*(1-age/14.))))
            crumble=contact+renderer.right*(3.+min(age,7)*.55)+np.array([0,0,max(0.,2.-age*.4)])
            bd.point(_fx_xy(renderer,crumble),fill=(162,96,48,int(200*(1-age/14.))))
            metrics['tail_stamp_smoke_pixels']=2*(7+2*int(age>=4))
    return metrics


def _s3_scale_puff(back, front, renderer, tags, meta, history, frame):
    metrics={'scale_chips':0,'scale_breath_visible':False,'scale_breath_source_error':0.}
    if meta.get('scale_breath_active',False):
        target=np.asarray(tags['anvilTop'])+np.array([0.,1.,.2])
        breath=_s3_breath(back,front,renderer,tags['mouth'],target,meta['scale_breath_progress'],False)
        metrics.update(scale_breath_visible=breath['visible'],scale_breath_source_error=breath['source_error'])
    bd,fd=ImageDraw.Draw(back),ImageDraw.Draw(front)
    for i,birth in enumerate((20,22,24)):
        age=frame-birth
        if not 0 <= age < 17:
            continue
        sample=history[birth] if len(history)>birth else tags
        origin=np.asarray(sample['anvilTop'],float)+np.array([i*2.-2.,1.,.2])
        velocity=renderer.right*(13.+i*4.)+np.array([0.,3.,7.+i*2.])
        point=_fx_ballistic(origin,velocity,age/24.,270.)
        x,y=_fx_xy(renderer,point);alpha=int(230*min(1.,(17-age)/5.))
        fd.line((x,y,x+1,y),fill=(72,65,64,alpha),width=2)
        fd.point((x,y-1),fill=(156,133,99,alpha))
        metrics['scale_chips']+=1
        if point[2]<1.:
            _fx_dust(bd,renderer,point,min(7,age-12),.25)
    if 36 <= frame <= 41:
        sample=history[36] if len(history)>36 else tags
        point=_fx_ballistic(sample['handL'],renderer.right*9+np.array([0.,2.,-4.]),(frame-36)/24.,240.)
        x,y=_fx_xy(renderer,point)
        fd.point((x,y),fill=(138,116,89,int(190*(42-frame)/6.)))
    return metrics


def stage3_extra_effects(clip, frame, renderer, tags, meta, history):
    back,front=Image.new('RGBA',CELL),Image.new('RGBA',CELL)
    if clip not in ('tech_ember_wave','tech_tail_stamp','fidget_b','sleep'):
        return back,front,{}
    metrics={'extra_back_pixels':0,'extra_front_pixels':0,'extra_face_fx_pixels':0}
    if clip in ('tech_ember_wave','tech_tail_stamp','fidget_b') and frame in (0,47):
        return back,front,metrics
    if clip=='tech_ember_wave':
        metrics.update(_s3_ember_wave(back,front,renderer,tags,meta,history,frame))
    elif clip=='tech_tail_stamp':
        metrics.update(_s3_tail_stamp(back,front,renderer,tags,meta,history,frame))
    elif clip=='fidget_b':
        metrics.update(_s3_scale_puff(back,front,renderer,tags,meta,history,frame))
    elif clip=='sleep':
        draw=ImageDraw.Draw(front);metrics.update(sleep_embers=0,sleep_source_error=0.)
        for birth in meta.get('sleep_exhales',(30,70)):
            age=frame-birth
            if not 0 <= age < 10:
                continue
            sample=history[birth] if len(history)>birth else tags
            source=np.asarray(sample['mouth'],float)
            outward=unit(source-np.asarray(sample['head'],float))
            point=source+outward*(age*.85)+np.array([0.,0.,age*age*.10])
            x,y=_fx_xy(renderer,point);alpha=int(200*min(1.,(10-age)/5.))
            draw.point((x,y),fill=(219,128,61,alpha))
            if age<5:
                draw.point((x+1,y),fill=(249,185,95,int(alpha*.7)))
            if 3 <= age <= 8:
                ImageDraw.Draw(back).point((x-1,y+1),fill=(108,86,73,int(alpha*.6)))
            metrics['sleep_embers']+=1
            metrics['sleep_source_world']=source.tolist()
    metrics['extra_back_pixels']=int(np.count_nonzero(np.asarray(back)[...,3]))
    metrics['extra_front_pixels']=int(np.count_nonzero(np.asarray(front)[...,3]))
    face_ids=[i for i,n in enumerate(renderer.group_names) if n in ('head','jaw','crest')]
    metrics['extra_face_fx_pixels']=int(np.count_nonzero((np.asarray(front)[...,3]>80)&np.isin(renderer.group,face_ids)))
    return back,front,metrics


# The completed registry preserves the four accepted clips and adds stage three.
STAGE2_CLIP_SPECS=dict(CLIP_SPECS)
CLIP_SPECS.update(GESTURE_SPECS)
CLIP_SPECS.update(LOCOMOTION_SPECS)
CLIP_SPECS.update(TECH_SPECS)


def stage3_raw_pose(clip,frame):
    spec=CLIP_SPECS[clip]
    f=float(frame)
    if spec['loop']:f%=spec['frames']
    elif f<=0 or f>=spec['frames']-1:return Pose()
    if clip in STAGE2_CLIP_SPECS:return stage2_raw_pose(clip,f)
    if clip in GESTURE_SPECS:return gestures_target(clip,f)
    if clip in LOCOMOTION_SPECS:return locomotion_target(clip,f)
    if clip in TECH_SPECS:return tech_target(clip,f)
    raise ValueError('Unknown clip '+clip)


def stage3_walk_clock(frame):
    """One full cycle in 24 frames, with four-frame cosine speed ramps."""
    t=float(np.clip(frame,0.,24.));ramp=4.;peak=1.2
    if t<ramp:return peak*(t*.5-ramp/(2*math.pi)*math.sin(math.pi*t/ramp))
    if t>24-ramp:return 24-stage3_walk_clock(24-t)
    return peak*(t-ramp*.5)


def stage3_life_walk_pose(direction,phase,pose_cache):
    # Re-evaluate primary IK at the fractional clock. Interpolate only the
    # already solved secondary offsets, never bone endpoints or prop matrices.
    name='walk_'+direction;phase=float(phase)%24
    p=walk_target(direction,phase);i=int(math.floor(phase));j=(i+1)%24;t=phase-i
    raw_a=walk_target(direction,float(i));raw_b=walk_target(direction,float(j))
    solved_a=pose_cache[name][i];solved_b=pose_cache[name][j]
    values={}
    for attr in ('tail','apron','straps','crest','cloth','tongs'):
        a=np.asarray(getattr(solved_a,attr))-np.asarray(getattr(raw_a,attr))
        b=np.asarray(getattr(solved_b,attr))-np.asarray(getattr(raw_b,attr))
        value=np.asarray(getattr(p,attr))+(1.-t)*a+t*b
        values[attr]=tuple(value.tolist()) if value.ndim else float(value)
    return replace(p,**values)


def stage3_life(cached,pose_cache):
    """A single episode. Only carried geometry moves away from the home anchor."""
    frames=[];timeline=[];measurements=[];plant_error=0.
    floor_camera=Renderer(azimuth=-35,elevation=35,scale=SCALE,feet=FEET)
    def append_clip(name,start=0,end=None):
        stop=len(cached[name])-1 if end is None else end
        begin=len(frames)
        for f in range(start,stop+1):frames.append(stage2_on_scene(cached[name][f],len(frames)))
        timeline.append({'type':'clip','clip':name,'source':[start,stop],
                         'timeline':[begin,len(frames)-1]})
    append_clip('idle')
    append_clip('fidget_a');append_clip('fidget_b')
    append_clip('tech_anvil');append_clip('trick');append_clip('happy')
    append_clip('take_anvil',0,35)
    offset=np.zeros(2);current=carry_pose()
    def bridge(target,label):
        nonlocal current
        begin=len(frames);history=[]
        for f in range(10):
            p=life_carry_transition(current,target,(f+1)/10.)
            im,met,_=stage3_render(p,'walk_e',0,history,tuple(offset))
            stage3_verify_frame(label,f,p,met)
            measurements.append(met)
            frames.append(stage2_on_scene(im,len(frames)))
        current=target
        timeline.append({'type':'carry_transition','name':label,'frames':10,
                         'timeline':[begin,len(frames)-1],'offset':offset.tolist()})
    route=[]
    for direction in ('e','n','w','s'):
        name='walk_'+direction
        bridge(pose_cache[name][0],'carry_align_'+direction)
        begin=len(frames);history=[];start=offset.copy()
        speed=np.asarray(CLIP_SPECS[name]['speed'],float)
        previous=build_model(current).tags;previous_offset=offset.copy();phases=[]
        for k in range(1,25):
            phase=stage3_walk_clock(k);phases.append(phase)
            offset=start+speed/FPS*phase
            p=stage3_life_walk_pose(direction,phase,pose_cache)
            im,met,tags=stage3_render(p,name,phase%24,history,tuple(offset))
            stage3_verify_frame('life_'+name,k,p,met)
            for side in ('R','L'):
                tag='foot'+side+'Contact'
                if abs(previous[tag][2])<1e-8 and abs(tags[tag][2])<1e-8:
                    before=floor_camera.project(previous[tag])[:2]+previous_offset
                    after=floor_camera.project(tags[tag])[:2]+offset
                    plant_error=max(plant_error,float(np.linalg.norm(after-before)))
            previous=tags;previous_offset=offset.copy()
            measurements.append(met)
            frames.append(stage2_on_scene(im,len(frames)))
        current=pose_cache[name][0]
        route.append({'direction':direction,'start':start.tolist(),'end':offset.tolist(),
                      'speed':speed.tolist()})
        timeline.append({'type':'walk','clip':name,'phase_sequence':phases,
                         'speed_clock':'4-frame cosine acceleration, 16 steady frames, 4-frame deceleration; peak 1.2x',
                         'timeline':[begin,len(frames)-1],'offset_start':start.tolist(),
                         'offset_end':offset.tolist(),'speed':speed.tolist()})
    closure=float(np.linalg.norm(offset))
    if closure>1e-6:raise RuntimeError('Life walking route did not return home: '+str(offset))
    offset[:]=0.
    bridge(carry_pose(),'carry_align_home')
    append_clip('put_anvil',7,47)
    append_clip('tired')
    append_clip('sleep_in',0,23)
    append_clip('sleep')
    checks={'frames':len(frames),'seconds':len(frames)/FPS,'loop':False,
            'route':route,'route_closure_px':closure,'ground_anvil_moves':False,
            'carried_frames_rerendered':len(measurements),
            'walk_root_speed_peak_factor':1.2,
            'max_planted_foot_screen_displacement':plant_error,
            'min_body_margin':min(min(m['body_bbox'][0],m['body_bbox'][1],160-m['body_bbox'][2],128-m['body_bbox'][3]) for m in measurements),
            'max_held_grip_error':max(m['hand_grip_error'] for m in measurements)}
    if plant_error>1e-6:raise RuntimeError('Life planted foot slides by '+str(plant_error)+' px')
    print(json.dumps({'life_frames':len(frames),'seconds':len(frames)/FPS,'complete':True}),flush=True)
    return frames,timeline,checks


def generate_stage2_subset(out,reference=None):
    global CLIP_SPECS
    completed=CLIP_SPECS
    CLIP_SPECS=STAGE2_CLIP_SPECS
    try:return generate_stage2(out,reference)
    finally:CLIP_SPECS=completed


# Final export: the same rig supplies clips, stitched life, and review movies.
def stage3_primitive_lowest(primitive):
    if primitive['kind']=='poly':return float(np.min(primitive['points'][:,2]))
    f=primitive['frame'];kind=primitive['kind']
    if kind=='ell':return float(f.o[2]-np.linalg.norm(f.R[2,:]*primitive['radii']))
    if kind=='box':return float(f.o[2]-np.dot(np.abs(f.R[2,:]),primitive['size']*.5))
    # Capsules have true hemispherical end supports, independent of their axis.
    return float(min(f.o[2]-primitive['r1'],f.p(0,0,primitive['length'])[2]-primitive['r2']))


def stage3_render(pose, clip, frame, history, offset=(0.,0.)):
    rig=build_model(pose)
    renderer=Renderer(width=160,height=128,
                      feet=(FEET[0]+offset[0],FEET[1]+offset[1]),
                      azimuth=-35,elevation=35,scale=SCALE)
    lift=max(0.,pose.root_z)
    squash=max(.58,1.-lift*.045)
    figure=renderer.render(rig,shadow=True,
                           shadow_radius=(24*squash,7*squash),
                           shadow_alpha=round(61*max(.35,1.-lift*.055)))
    history.append({k:v.copy() if isinstance(v,np.ndarray) else v for k,v in rig.tags.items()})
    meta=stage2_meta(clip,frame,pose,rig.tags)
    meta.update(stage3_extra_meta(clip,frame,pose,rig.tags))
    back,front,fx=stage2_effects(clip,frame,renderer,rig.tags,meta,history)
    extra_back,extra_front,extra_metrics=stage3_extra_effects(clip,frame,renderer,rig.tags,meta,history)
    back.alpha_composite(extra_back);front.alpha_composite(extra_front)
    fx.update(extra_metrics)
    result=Image.new('RGBA',CELL,(0,0,0,0))
    anvil_height=min(stage3_primitive_lowest(p) for p in rig.primitives
                     if p['group'].startswith('anvil_') and p['group'] not in ('anvil_coal','anvil_ember'))
    shadow_center=(rig.tags['anvilTop']+rig.tags['anvilGround'])*.5
    shadow_center=shadow_center.copy();shadow_center[2]=0.
    x,y,_=renderer.project(shadow_center)
    shrink=max(.35,1.-max(0.,anvil_height)*.015)
    fade=max(.18,1.-max(0.,anvil_height)*.018)
    d=ImageDraw.Draw(result)
    d.ellipse((round(x-11*shrink),round(y-4*shrink),round(x+11*shrink),round(y+4*shrink)),fill=INK+(round(72*fade),))
    d.ellipse((round(x-7*shrink),round(y-2*shrink),round(x+7*shrink),round(y+2*shrink)),fill=INK+(round(98*fade),))
    result.alpha_composite(back)
    result.alpha_composite(figure);result.alpha_composite(front)
    def screen(name):return renderer.project(rig.tags[name])[:2].tolist()
    hammer_groups=[i for i,name in enumerate(renderer.group_names) if name.startswith('hammer_')]
    head_groups=[i for i,name in enumerate(renderer.group_names) if name in ('head','jaw','crest')]
    hammer_rows=np.where(np.isin(renderer.group,hammer_groups))[0]
    head_rows=np.where(np.isin(renderer.group,head_groups))[0]
    # Subtract both one-pixel outlines and count only completely empty rows.
    gap=float(head_rows.min()-hammer_rows.max()-3) if len(hammer_rows) and len(head_rows) else None
    met={'body_bbox':renderer.body_mask.getbbox(),'fx':fx,
         'hand_grip_error':float(np.linalg.norm(rig.tags['handR']-rig.tags['hammerGripR'])),
         'anvil_contact_error':float(np.linalg.norm(rig.tags['hammerFace']-rig.tags['anvilTop'])),
         'root_lift':float(pose.root_z),'hammer_head_screen':screen('hammerHead'),
         'head_screen':screen('head'),'hammer_whole_gap_px':gap,
         'hammer_visible_pixels':int(len(hammer_rows)),
         'tail_contact_world':rig.tags['tailContact'].tolist(),
         'anvil_origin':rig.tags['anvilGround'].tolist(),
         'anvil_floor_clearance':float(anvil_height),
         'minimum_geometry_z':min(stage3_primitive_lowest(p) for p in rig.primitives),
         'feet':{s:rig.tags['foot'+s+'Contact'].tolist() for s in ('R','L')},
         'arm_lengths':{s:[float(np.linalg.norm(rig.tags['shoulder'+s]-rig.tags['elbow'+s])),
                           float(np.linalg.norm(rig.tags['elbow'+s]-rig.tags['hand'+s]))]
                        for s in ('R','L')}}
    return result,met,rig.tags


def stage3_verify_frame(clip,frame,pose,met):
    x0,y0,x1,y1=met['body_bbox']
    if not(0<x0<x1<160 and 0<y0<y1<128):
        raise RuntimeError('%s frame %d: geometry reaches cell edge: %s'%(clip,frame,met['body_bbox']))
    for lengths in met['arm_lengths'].values():
        if not np.allclose(lengths,[17.,14.5],atol=1e-8):
            raise RuntimeError('%s frame %d: arm bone changed length'%(clip,frame))
    if not pose.hammer_free and met['hand_grip_error']>1e-8:
        raise RuntimeError('%s frame %d: hand detached from hammer'%(clip,frame))
    if met['hammer_visible_pixels']==0:
        raise RuntimeError('%s frame %d: hammer is completely hidden'%(clip,frame))
    if met['minimum_geometry_z'] < -1e-6:
        raise RuntimeError('%s frame %d: geometry penetrates floor by %.6f'%(clip,frame,-met['minimum_geometry_z']))


def stage3_write_gif(frames,destination,zoom=2,repeat=True):
    """NEAREST, one palette, no dithering; split only if the 25 MiB limit requires it."""
    def write(items,path):
        count=len(items)
        sample=Image.new('RGB',(160*8,128*int(math.ceil(count/8.))))
        for i,item in enumerate(items):sample.paste(item,((i%8)*160,(i//8)*128))
        palette=sample.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
        converted=[item.quantize(palette=palette,dither=Image.Dither.NONE).resize(
            (160*zoom,128*zoom),Image.Resampling.NEAREST) for item in items]
        durations=[10*(round((i+1)*100/24)-round(i*100/24)) for i in range(count)]
        options={'loop':0} if repeat else {}
        converted[0].save(path,save_all=True,append_images=converted[1:],
                          duration=durations,optimize=False,disposal=2,**options)
    destination=Path(destination);write(frames,destination)
    if destination.stat().st_size<=25*1024*1024:return [destination.name]
    parts=int(math.ceil(destination.stat().st_size/(23*1024*1024)))
    chunk=int(math.ceil(len(frames)/parts));names=[]
    for start in range(0,len(frames),chunk):
        path=destination.with_name(destination.stem+'-part%02d'%(len(names)+1)+'.gif')
        write(frames[start:start+chunk],path);names.append(path.name)
    destination.unlink()
    return names


def stage3_report(checks,seconds):
    rows=[]
    for name,item in checks['clips'].items():
        rows.append('| `%s` | %d | %s | %d px |'%(name,item['frames'],
                    'да' if item['loop'] else 'нет',item['min_body_margin']))
    fix=checks['corrections']
    return '''# Горнила: итоговый отчёт, этап 3

## Результат

Все обязательные клипы и два перехода переноски построены одним процедурным
3D-ригом. Камера, масштаб, материалы, сторона молота и мелкие детали постоянны.
Новых генераций изображений в попытке 3: **0**. Сеть, готовые кадры, текстуры,
внешние шрифты и закодированные бинарные данные генератору не нужны.

Сначала выполнены замечания к принятому этапу 2. Молот делает два полных оборота;
между всей видимой геометрией молота с контуром и макушкой измерено до **%(gap).1f px**.
Голова молота поднимается по настоящей пространственной параболе. Кольцо достигает
**%(ring).1f px** по большой оси и **%(minor).1f px** по малой; выдох начинается
в точке рта. Фонтан содержит **%(sparks)d** искры, поднимающиеся до **%(rise).1f px**,
и виден **%(spark_frames)d кадров**. Под ним остаются горячий след на столешнице
и короткая пылевая волна у основания. На пике happy из угольной лунки вылетает
отдельный сноп угольков. Числа берутся из проверенного рендера, не из описания.

## Клип-лист

| Клип | Кадров | Петля | Минимальный запас до края геометрии |
|---|---:|---|---:|
'''%fix+'\n'.join(rows)+'''

Все разовые полные полосы начинаются и заканчиваются точным idle[0]. У ходьбы
и сна собственные циклические опорные позы. Для переходов между состояниями
используются объявленные включительные диапазоны stitch: sleep_in[0..23],
sleep_out[5..29], wake_startled[3..23], hatch[5..35], take_anvil[0..35],
put_anvil[7..47]. Короткие служебные участки вне диапазонов нужны только для
единого требования к концам полных разовых файлов; в life их не проигрывают.

Наковальня переносится непрерывной жёсткой матрицей. Она видна во всех состояниях,
в ходьбе закреплена на спине. Восемь направлений — реальные повороты 3D-модели;
зеркальные изображения не используются. speed в манифесте — экранные px/s,
скорость в одном кадре равна speed/24. Опорная лапа компенсирует движение root.
Сон имеет опоры, закрытые веки и отдельный тихий тлеющий выдох. У новых приёмов
разные жесты и контакты: три угля касаются пола по очереди, хвост ставит клеймо.

Финальный life содержит прогулку, видимое снятие и возвращение наковальни,
покой, два жеста, радость, трюк и засыпание. Повороты с грузом и начало/конец шага
рендерятся тем же ригом. Ходьба разгоняется и тормозит по четыре кадра, дробная
фаза одновременно управляет корнем и IK лап. Это непрерывный эпизод, а showreel
показывает все полные клипы отдельно. Оба общих ролика проигрываются один раз,
без скачка фоновой фазы на шве. Фон — 72 непрозрачные фазы, исходные полосы героя прозрачные.

## Проверки

Проверены все кадры: размер 160×128, запас до края, постоянные длины костей рук
17/14,5, достижимость IK и хват молота. Проверены точные концы разовых клипов,
стыки состояний, жёсткость переноса реквизита, контакты и замыкание сцены.
Численные данные по каждому кадру лежат в preview/*-checks.json;
сводка и ограничения — в stage3-checks.json, хронология life — в life-timeline.json.

Пять вторичных цепей имеют отдельные затухающие пружины: хвост, фартук, ремни,
гребень и ткань. Они добавляются к авторской позе; опорные стыки гасят остаточное
движение. Детали кожи имеют четыре дискретных тона, рисунок прикреплён к геометрии.
Палитра GIF общая для каждого ролика, без дизеринга, увеличение NEAREST.
Чередование 40/50 мс даёт средние 24 кадра/с; точный исходник — PNG-полосы.

## Известные условия

Протирка в fidget_a выполняется верхом рабочей краги; полотенце остаётся на поясе.
Это уточнение прежней карточки, а не исчезновение реквизита. Техническое обрамление
переходов объявлено через stitch. look/reference.png без --reference является
процедурной реконструкцией, а не исходным imagegen-листом. Опция --reference
сохраняет предоставленный оригинал отдельно, только для сравнения. Пиксели
оригинала не используются для анимации и не встроены в исходник.

Для сравнения детализации использованы архивные изображения Лугового исполина
из снимка bf6bf1386d179cd88d6f85c33c8d138f875639c3; недоступные новые вложения
не выдаются за просмотренные. Художественное равенство с эталоном не является
численной метрикой и оценивается владельцем при просмотре.

Генератор: **%d строк**, **%d байт**. В нейтрали **%d примитивов**,
**%d групп**. Автономная сборка этого комплекта заняла **%.2f с**;
это время запуска, ручная работа отдельно не хронометрировалась.

GitHub содержит только src/forge_salamander.py и card.md, один коммит этапа 3.
PNG, GIF, отчёты и архив создаются локально и в репозиторий не отправляются.
'''%(checks['source_lines'],checks['source_bytes'],checks['primitives'],checks['groups'],seconds)


def generate_stage3(out,reference=None):
    started=time.perf_counter();out=Path(out)
    generate_stage1(out,reference)
    for folder in ('clips','scene','preview','tech-keys'):(out/folder).mkdir(parents=True,exist_ok=True)
    stage2_strip([forge_scene(i).convert('RGBA') for i in range(72)]).convert('RGB').save(out/'scene/scene.png')
    neutral,_,_=stage3_render(Pose(),'idle',0,[])
    neutral_bytes=neutral.tobytes()
    rig=build_model()
    checks={'id':'forge_salamander','stage':3,'fps':FPS,'cell':list(CELL),'feet':list(FEET),
            'clips':{},'stitches':{},'corrections':{},'image_generations_this_attempt':0,
            'primitives':rig.size,'groups':len(set(p['group'] for p in rig.primitives)),
            'scene_frames':72,'scene_loop_exact':forge_scene(0).tobytes()==forge_scene(72).tobytes(),
            'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'source_lines':len(Path(__file__).read_text().splitlines()),
            'source_bytes':Path(__file__).stat().st_size}
    checks['gesture_contacts']=gesture_contact_checks()
    checks['locomotion_contacts']=locomotion_contact_checks()
    gc=checks['gesture_contacts']
    if not(all(gc['stitch'].values()) and all(gc['one_shot_endpoints_exact'].values())
           and gc['fidget_a']['contact_inside_striking_face'] and gc['sleep']['palm_contact_inside_work_plane']):
        raise RuntimeError('Gesture support or stitch verification failed')
    for group in ('sleep','legs','fidget_a'):
        for key,value in gc[group].items():
            if 'error' in key and isinstance(value,(int,float)) and abs(value)>1e-7:
                raise RuntimeError('Gesture contact failed: '+group+'/'+key)
    if not checks['locomotion_contacts'].get('passed',False):
        raise RuntimeError('Locomotion contact verification failed')
    cached={};pose_cache={};all_metrics={};showreel=[]
    for clip,spec in CLIP_SPECS.items():
        count=spec['frames'];history=[];frames=[];measurements=[]
        poses=stage2_secondary(clip,[stage3_raw_pose(clip,f) for f in range(count)])
        poses=[tech_resolve(clip,f,p) for f,p in enumerate(poses)]
        for f,p in enumerate(poses):
            try:im,met,tags=stage3_render(p,clip,f,history)
            except Exception as exc:raise RuntimeError('%s frame %d: %s'%(clip,f,exc)) from exc
            stage3_verify_frame(clip,f,p,met)
            if clip=='tech_tail_stamp' and 0<f<count-1:
                if 'tail_link_length_error' not in met['fx'] or met['fx']['tail_link_length_error']>1e-6:
                    raise RuntimeError('Tail length changed after secondary resolution')
            frames.append(im);measurements.append(met)
        exact_start=frames[0].tobytes()==neutral_bytes
        exact_end=frames[-1].tobytes()==neutral_bytes
        if not spec['loop'] and not(exact_start and exact_end):
            raise RuntimeError(clip+' does not return exactly to the neutral frame')
        if clip in ('trick','tech_anvil'):
            for hit in spec['hit']:
                if measurements[hit]['anvil_contact_error']>1e-7:
                    raise RuntimeError(clip+' missed the anvil')
        contacts={}
        for index,hit in enumerate(spec.get('hit',[])):
            if clip in ('trick','tech_anvil'):error=measurements[hit]['anvil_contact_error']
            elif clip=='tech_ember_wave':
                errors=measurements[hit]['fx'].get('coal_contact_errors',[])
                indices=measurements[hit]['fx'].get('coal_contact_indices',[])
                if indices!=[index] or len(errors)!=1:raise RuntimeError('Wrong ember contact event')
                error=max(errors)
            elif clip=='tech_tail_stamp':error=measurements[hit]['fx']['tail_contact_error']
            else:continue
            if error>1e-7:raise RuntimeError('%s contact %d missed by %.9f'%(clip,hit,error))
            contacts[str(hit)]=float(error)
        stage2_strip(frames).save(out/'clips'/(clip+'.png'))
        preview=[stage2_on_scene(im,round(i*72/count)) for i,im in enumerate(frames)]
        stage3_write_gif(preview,out/'preview'/(clip+'.gif'),3)
        start=len(showreel)
        showreel.extend(stage2_on_scene(im,start+i) for i,im in enumerate(frames))
        keys=[0,count//4,count//2,3*count//4,count-1]+spec.get('hit',[])+spec.get('stitch',[])
        keys+=spec.get('key_frames',[])
        if clip=='trick':keys += [18,25,32,46,56,78]
        if clip=='tech_anvil':keys += [18,22,26,33,40]
        keys=sorted(set(keys))
        stage2_keys(clip,frames,keys,out/'tech-keys'/(clip+'.png'))
        checks['clips'][clip]={'frames':count,'loop':spec['loop'],
            'exact_neutral_start':exact_start,'exact_neutral_end':exact_end,
            'contact_errors':contacts,
            'min_body_margin':min(min(m['body_bbox'][0],m['body_bbox'][1],160-m['body_bbox'][2],128-m['body_bbox'][3]) for m in measurements),
            'max_held_grip_error':max((m['hand_grip_error'] for m,p in zip(measurements,poses) if not p.hammer_free),default=0.),
            'hammer_visible_every_frame':all(m['hammer_visible_pixels']>0 for m in measurements),
            'min_geometry_z':min(m['minimum_geometry_z'] for m in measurements),
            'secondary_delays_frames':[3,2,4,2,3]}
        cached[clip]=frames;pose_cache[clip]=poses;all_metrics[clip]=measurements
        (out/'preview'/(clip+'-checks.json')).write_text(json.dumps(measurements,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'clip':clip,'frames':count,'complete':True}),flush=True)
    for clip,index,target in [('sleep_in',23,'sleep'),('sleep_out',5,'sleep'),('wake_startled',3,'sleep')]:
        equal=cached[clip][index].tobytes()==cached[target][0].tobytes()
        checks['stitches'][clip+'->'+target]=equal
        if not equal:raise RuntimeError('Sleep stitch mismatch: '+clip)
    carry,_,_=stage3_render(carry_pose(),'take_anvil',35,[])
    for clip,index in [('take_anvil',35),('put_anvil',7)]:
        equal=cached[clip][index].tobytes()==carry.tobytes()
        checks['stitches'][clip+'->carry']=equal
        if not equal:raise RuntimeError('Carry stitch mismatch: '+clip)
    tm=all_metrics['trick'];am=all_metrics['tech_anvil'];hm=all_metrics['happy']
    fixes={'gap':max((m['hammer_whole_gap_px'] or -999.) for m in tm),
           'ring':max(m['fx'].get('ring_projected_diameter_px',0.) for m in tm),
           'minor':max(m['fx'].get('ring_minor_diameter_px',0.) for m in tm),
           'sparks':max(m['fx'].get('fountain_particles',0) for m in am),
           'rise':max(m['fx'].get('fountain_rise_px',0.) for m in am),
           'spark_frames':sum(m['fx'].get('fountain_particles',0)>0 for m in am),
           'happy_embers':max(m['fx'].get('coal_particles',0) for m in hm)}
    camera=Renderer(azimuth=-35,elevation=35,scale=SCALE)
    shafts=np.asarray([stage2_flight(float(u))[1][:,2] for u in np.linspace(0.,1.,289)])
    angles=np.unwrap(np.arctan2(-shafts@camera.up,shafts@camera.right))
    fixes.update(projected_turns=float(abs(angles[-1]-angles[0])/math.tau),
                 frames_with_25px_gap=sum((m['hammer_whole_gap_px'] or -999)>=25 for m in tm),
                 ring_outer_px=max(m['fx'].get('ring_visible_diameter_px',0) for m in tm),
                 max_face_fx_pixels=max(m['fx'].get('face_fx_pixels',0) for m in tm+am+hm),
                 breath_source_error=max(m['fx'].get('breath_source_error',0.) for m in tm))
    breath=[m['fx'] for m in tm if m['fx'].get('breath_visible',False)]
    fixes.update(breath_frames=len(breath),
                 fountain_distinct_pixels_peak=max(m['fx'].get('fountain_unique_particles',0) for m in am),
                 happy_distinct_embers_peak=max(m['fx'].get('coal_unique_particles',0) for m in hm),
                 happy_effect_frames=sum(m['fx'].get('coal_particles',0)>0 for m in hm),
                 happy_source_error=max(m['fx'].get('coal_origin_error',0.) for m in hm))
    checks['corrections']=fixes
    if not(fixes['gap']>=25 and 1.5<=fixes['projected_turns']<=2.05 and fixes['minor']>=14
           and 20<=fixes['sparks']<=40 and 20<=fixes['rise']<=30.1
           and fixes['spark_frames']>=12 and fixes['fountain_distinct_pixels_peak']>=20
           and fixes['breath_frames']>=6 and all(f['breath_source_error']<1e-8 for f in breath)
           and fixes['max_face_fx_pixels']==0 and tm[25]['fx']['ring_visible']
           and fixes['happy_distinct_embers_peak']>=12 and fixes['happy_effect_frames']>=12
           and fixes['happy_source_error']<1e-8):
        raise RuntimeError('Mandatory stage-two correction failed: '+str(fixes))
    previews={'showreel':stage3_write_gif(showreel,out/'preview/showreel.gif',2,repeat=False)}
    life,timeline,life_checks=stage3_life(cached,pose_cache)
    previews['life']=stage3_write_gif(life,out/'preview/life.gif',2,repeat=False)
    checks['life']=life_checks
    (out/'life-timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    manifest={'id':'forge_salamander','fps':FPS,'cell':list(CELL),'feet':list(FEET),
              'stage':3,'stage_status':'complete','clips':CLIP_SPECS,
              'scene':{'frames':72,'loop':True},'previews':previews,
              'showreel':{'frames':len(showreel),'seconds':len(showreel)/FPS,'loop':False},
              'life':{'frames':len(life),'seconds':len(life)/FPS,'loop':False},
              'reference':json.loads((out/'look/reference-info.json').read_text()),
              'directions':'n: up the screen; e: right. speed is projected pixels per second.'}
    for name,data in [('manifest.json',manifest),('stage3-checks.json',checks)]:
        (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    seconds=time.perf_counter()-started
    (out/'report.md').write_text(stage3_report(checks,seconds),encoding='utf-8')
    import zipfile
    archive=out.parent/(out.name+'.zip')
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for path in sorted(out.rglob('*')):
            if path.is_file():z.write(path,Path('forge_salamander')/path.relative_to(out))
    print(json.dumps({'out':str(out.resolve()),'archive':str(archive.resolve()),'stage':3,
                      'clips':len(CLIP_SPECS),'frames':sum(s['frames'] for s in CLIP_SPECS.values()),
                      'render_seconds':round(seconds,3)},ensure_ascii=False),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Gornila: portable procedural pixel rig')
    parser.add_argument('output',type=Path)
    parser.add_argument('--reference',type=Path,help='Optional original sheet, comparison only')
    parser.add_argument('--stage',type=int,choices=(1,2,3),default=3)
    args=parser.parse_args()
    {1:generate_stage1,2:generate_stage2_subset,3:generate_stage3}[args.stage](args.output,args.reference)
