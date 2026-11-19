"""Gornila: self-contained stage-one pixel rig and review package.

Run: python forge_salamander.py out/
Dependencies: Python 3, Pillow, NumPy. No network or external assets.
Stage 1 only: static design and rig, awaiting the owner's word to animate.
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
            # Sparse groups of pebbles with a little lit upper edge.
            row=np.floor(z/2.5); col=np.floor((x+row%2*1.35)/2.8)
            hx=np.mod(x+row%2*1.35,2.8)/2.8
            hz=np.mod(z,2.5)/2.5
            h=hashed(col,np.floor(y/2.8),row)
            pebble=((hx-.49)**2/0.19+(hz-.5)**2/0.17)<0.85
            lower=pebble&(hz>.68)&(h>.45)
            upper=pebble&(hz<.32)&(h>.64)&(light>.45)
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
        'hammerFace':H.p(-4.5,0,17),
        'hammerStrikingEnd':H.p(-9,0,22),
        'hammerTop':H.p(0,0,27.6),
        'hammerHead':H.p(0,0,22),
        'hammerPrimitiveCount':rig.size-start,
    }


def draw_anvil(rig,A,materials):
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
    for xx,yy,zz,rr in [(-2.45,6.55,11.7,1.45),(0,6.8,12,1.60),(2.4,6.45,11.7,1.40)]:
        rig.ell(A,(xx,yy,zz),(rr,rr*.87,rr),m['coal_crust'],'anvil_coal')
        rig.ell(A,(xx,yy+.4,zz+.25),(rr*.71,rr*.69,rr*.73),m['ember'],'anvil_ember')
    return {
        'anvilTop':A.p(0,0,31.05),
        'anvilStrike':A.p(2,1,31.05),
        'coalPocket':A.p(0,6.8,12),
        'anvilCarry':A.p(0,-4,16),
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


@dataclass
class Pose:
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


def head(r,body,p):
    H=body.at(0,2,82).rz(p.head_yaw).rx(p.head_pitch)
    g='head'
    skull=patterned_skin(M['skin_clean'],[(-7.7,-4.0,2.8),(7.7,-4.0,2.8),(-10.5,-1.0,1.9),(10.5,-1.0,1.9)],[3.0,3.0,2.5,2.5])
    r.ell(H,(0,0,0),(12.5,8.0,5.3),skull,g)
    r.ell(H,(0,6.5,-1.1),(12.0,10.5,3.45),M['skin_clean'],g)
    r.ell(H,(0,9.0,-3.0),(10.9,8.4,1.75),M['belly'],'jaw')
    # A lower lip is geometry: the short dark mouth line follows the rounded snout.
    mouth=[]
    for x in np.linspace(-9.2,9.2,14):
        yy=7.5+9.9*math.sqrt(max(0,1-(x/12.0)**2))
        zz=-1.35+.80*(abs(x)/9.2)**1.5+p.smile*.35*(abs(x)/9.2)
        mouth.append(H.p(x,yy,zz))
    polyline(r,mouth,.63,M['dark'],g)
    for s in (-1,1):
        r.ell(H,(s*8.0,6.7,2.4),(3.2,3.2,2.3),M['skin_clean'],g)
        E=H.at(s*8.7,9.1,3.0).rz(-s*38).rx(22)
        height=max(.17,1.45*(1-p.blink))
        r.ell(E,(0,0,0),(2.35,.82,height+.40),M['pupil'],g)
        r.ell(E,(0,.76,0),(2.05,.36,height+.15),M['eye'],g)
        r.ell(E,(s*.05,1.13,0),(.70,.18,max(.12,height*.84)),M['pupil'],g)
        if p.blink<.7:r.dot(E.p(-.55,1.36,.76),.53,M['cloth'],g)
        r.cap(E.p(-2.1,.05,1.80),E.p(2.0,.05,1.91),.44,.40,M['skin_clean'],g)
        r.ell(H,(s*4.0,15.7,.6),(.67,.52,.47),M['pupil'],g)
        r.dot(H.p(s*4.65,15.35,1.1),.31,M['belly'],g)
        # Cheek pore pairs and a short visible crease beside the eye.
        for k in range(2):r.dot(H.p(s*(8.0-k*.9),9.2+k*.72,-.9),.32,M['spots'],g)
    for i in range(3):
        xx=(i-1)*5.5; zz=5.1+(.5 if i==1 else 0)+p.crest*.2
        r.ell(H,(xx,-2.7,zz),(1.5,1.55,1.2),M['brass'],'crest')
    for th,ph,sz in [(-1.3,.7,1.5),(1.3,.7,1.5),(2.15,.4,2.5),(-2.15,.45,2.4),(2.9,.15,2.3)]:
        ell_patch(r,H,(0,0,0),(10.2,7.6,7.0),th,ph,sz,g)
    r.tags['head']=H.o;r.tags['mouth']=H.p(0,17.5,-2.8)
    return H


def build_tail(r,root,p):
    points=[(0,-7,33),(-3,-15,25),(-11,-24,16),(-22,-28,10),(-32,-27,7),(-38,-19,6),(-39,-12,6.5)]
    widths=[8.1,7.8,6.4,5.1,3.7,2.5,.75]
    points=np.array(points,float)
    for i in range(1,len(points)):
        points[i,0]+=p.tail[min(i-1,5)]*.25
        points[i,2]+=p.tail[min(i-1,5)]*.15
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
        knee=np.array([s*11.2,.5,20])+off*.5
        hip=np.array([s*8.5,-.8,36+p.body_z])
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


def arms(r,body,root,p,H):
    shoulders={-1:body.p(-16.0,0,65.0),1:body.p(16.,0,65.)}
    grip=H.p(0,0,0)
    left=root.p(p.left_hand)
    for s,goal,pole in [(-1,grip,root.p(p.right_elbow)),(1,left,root.p(p.left_elbow))]:
        g='skin_body';shoulder=shoulders[s]
        elbow=two_bone_ik(shoulder,goal,pole)
        r.tags['elbowR' if s==-1 else 'elbowL']=elbow
        r.tags['shoulderR' if s==-1 else 'shoulderL']=shoulder
        r.ell(F(shoulder,body.R),(0,0,0),(7.8,7.4,9.2),M['skin'],g)
        limb(r,shoulder,elbow,6.8,6.5,M['skin'],g)
        lower=limb(r,elbow,goal,5.0,5.2,M['skin'],g)
        for th,ph,sz in [(-.25,.4,2.8),(.95,.20,2.1),(2.7,.25,3.)]:
            ell_patch(r,F(shoulder,body.R),(0,0,0),(8.4,7.7,9.4),th,ph,sz,g)
        # Flat irregular pigment on forearms, plus an elbow crease.
        ell_patch(r,lower,(0,0,0),(5.0,5.2,np.linalg.norm(goal-elbow)*.56),.4,.2,1.5,g)
        if s==1:
            G=F(goal).rx(-10).rz(-5)
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
            r.ell(H,(0,0,0),(4.5,4.2,5.0),M['skin_clean'],g)
            for z in (-2.8,.0,2.8):
                r.cap(H.p(-2.5,2.7,z),H.p(2.2,2.7,z),1.45,1.35,M['skin_clean'],g)
                r.line(H.p(-2.1,3.85,z-.95),H.p(1.6,3.85,z-.95),.42,M['spots'],g)
            r.ell(H,(3.0,1.0,2.4),(2.15,2.9,3.25),M['skin_clean'],g)
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
    body=root.at(0,0,p.body_z).at(0,0,40).rx(p.body_pitch).ry(p.body_roll).at(0,0,-40)
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
    H=root.at(p.hammer_pos).rx(p.hammer_rot[0]).ry(p.hammer_rot[1]).rz(p.hammer_rot[2])
    tags=draw_hammer(r,H,M)
    r.tags.update(tags)
    arms(r,body,root,p,H)
    if with_anvil:
        if p.anvil_carry:
            A=body.at(0,-13.0,42).rx(85)
        else:A=F().at(31.,30.,0.).rz(35)
        r.tags.update(draw_anvil(r,A,M))
        r.tags['anvilGround']=A.o
    r.tags['feet']=np.zeros(3)
    r.tags['chest']=body.p(0,0,56)
    if yaw:
        rotation=F().rz(yaw).R
        grounded_anvil_tags={'anvilTop','anvilStrike','coalPocket','anvilCarry','anvilGround'}
        for primitive in r.primitives:
            # The free-standing anvil belongs to the scene, not to the torso.
            if not p.anvil_carry and primitive['group'].startswith('anvil_'):
                continue
            if primitive['kind']=='poly':
                primitive['points']=primitive['points']@rotation.T
            else:
                frame=primitive['frame']
                primitive['frame']=F(rotation@frame.origin,rotation@frame.R)
        for name,value in r.tags.items():
            if not p.anvil_carry and name in grounded_anvil_tags:
                continue
            if isinstance(value,np.ndarray) and value.shape==(3,):
                r.tags[name]=rotation@value
    return r


# Design specification: plain Markdown, also committed as card.md.
CARD_TEXT = r'''# Саламандра-кузнец Горнила

## Статус: этап 1

**Готовы только статический Python-риг и проверочные изображения.** Все клипы и вторичное движение ниже — план. В основной позе: **922 примитива, 43 группы, рост тела 81 px**, опора `(77,99)`. В число примитивов входит мелкая геометрия, это не количество суставов.

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

[Частное ТЗ-Г1, включая изменённый п. 7](https://github.com/SkyTmin/coco-mining-sim/blob/bosses-art/docs/tz/TZ-G1-chatgpt-gornila.md) имеет приоритет: поле 160×128, рост 70–84 px, четыре тона, трюк и разовый `turn` по 96 кадров. Эталонные вложения Исполина сейчас недоступны; равенство их визуальному качеству **не проверено**.

## 1. Сохранённый облик

Тяжёлая взрослая саламандра: широкие плечи, сильные предплечья, разнесённые лапы и длинный пятнистый хвост. Низкая голова примерно в пятую часть роста: эллипсоид `(12.5,8.0,5.3)`, морда `(12.0,10.5,3.1)`, челюсть `(10.9,8.4,1.75)`. Малые янтарные глаза, спокойные брови, приподнятый уголок рта, три низких бугорка. Кожа терракотовая с угольными пятнами; горло и низ хвоста охристые. Гряда низкая, без крыльев, больших шипов, клыков и глаз-блюдец.

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

Локальная фактура, её движение ещё проверяется. Рендер сразу 160×128 без сглаживания; увеличение NEAREST. Слабый холодный кант в тени, отдельное свечение с перекрытиями, наземные тени тела и наковальни.

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

`two_bone_ik`: плечо 17.0, предплечье 14.5, pole hint локтя; кисть и рукоять в общей системе. Статические длины проверены; недостижимая цель — ошибка, не растяжение. Движение ещё не проверено.

Опорные точки для анимации: `feet`, `footLContact`, `footRContact`, `hammerGripR/L`, `hammerFace`, `anvilTop`, `anvilCarry`, `mouth`, `coalPocket`, `tailTip`. Эффект должен совпадать с реальным контактом.

### Предметы не исчезают

Покой/приёмы: молот справа, наковальня на полу. Трюк: хват→полёт→ловля того же предмета. Сон: молот на полу с хватом, голова на краге у наковальни. Ходьба: молот в руке/на плече, наковальня с основанием сзади. Щипцы и тряпка в петлях до явного взятия.

Перенос: присед→крага за проушину→хвост под основание→подъём сбоку дугой→ремни→освободить хвост. Опускание обратно; масштаб неизменен, предмет и тень непрерывны.

## 5. Вторичные цепи: план

Параметры позы есть; **история, задержка и затухание в этапе 1 не реализованы**. Драйвер берётся из основной позы, затем устойчивая пружина. Петле нужна периодическая история; разовому клипу точное возвращение. Несвязанные синусы не заменяют запаздывание.

| Цепь | Задержка, кадры | Поведение |
|---|---:|---|
| Хвост, 6 звеньев | 2 / 3 / 4 | Следует за тазом, перелёт, затухание 8–14 кадров |
| Две полы | 2 / 3 | Тяжёлая кожа, один малый перелёт |
| Задние ремни | 3 | Маятник от плеч; под грузом слабее |
| Затылочная/хвостовая гряда | 2 / 3 | Волна не больше 1–2 px |
| Тряпка/ручки щипцов | 4 / 2 | Мягкий доворот / быстрый короткий отскок |

## 6. Реестр будущих клипов

Нумерация с нуля: время ключа `frame/24`, длительность `frames/24`. Кадр 47 = 1.958 с; клип 48 кадров = 2 с. Все клипы пока запланированы.

| Клип | Кадров | Секунд | Петля | Содержание |
|---|---:|---:|---|---|
| `idle` | 84 | 3.5 | Да | Дыхание, два стука по краге, взгляд, хвост |
| `fidget_a`, `fidget_b` | По 48 | По 2 | Нет | Протирка молота; сдувание окалины |
| `look` | 36 | 1.5 | Нет | Глаза → голова → плечи |
| `happy` | 48 | 2 | Нет | Притопы, короткий боковой подскок, показ молота |
| `trick` | 96 | 4 | Нет | Бросок, огненное кольцо, ловля, звезда, поклон |
| `walk_n/ne/e/se/s/sw/w/nw` | По 24 | По 1 | Да | Ходьба на месте, наковальня за спиной |
| `turn` | 96 | 4 | Нет | Круг на месте и исходная стойка |
| `sleep_in`, `sleep_out` | По 30 | По 1.25 | Нет | Вход и выход из сна |
| `sleep` | 84 | 3.5 | Да | Медленное дыхание, тлеющий выдох |
| `wake_startled` | 24 | 1 | Нет | Испуг, бережный хват, посадка |
| `hatch`, `tired` | По 36 | По 1.5 | Нет | Выход с молотом на плече; усталость |
| `tech_anvil` | 48 | 2 | Нет | Удар; `hit: [26]` |
| `tech_ember_wave` | 48 | 2 | Нет | Три угля; `hit: [27, 30, 33]` |
| `tech_tail_stamp` | 48 | 2 | Нет | Клеймо хвостом; `hit: [25]` |
| `take_anvil`, `put_anvil` | По 48 | По 2 | Нет | Дополнительные видимые переходы к переноске и обратно |

### Стыки сна и переноски

Полные разовые файлы имеют `idle[0] → idle[0]`. `stitch` задаёт рабочий диапазон для `life`; `showreel` показывает всё. Это ещё не реализованный компромисс со сном/переноской, обязательный к указанию в отчёте.

| Клип | Ключи полного файла | Рабочий диапазон `life`, включительно |
|---|---|---|
| `sleep_in` | 0 idle → 23 сон → 29 idle | `[0, 23]`; 23 точно равен `sleep[0]` |
| `sleep_out` | 0 idle → 5 сон → 29 idle | `[5, 29]`; 5 точно равен `sleep[0]` |
| `wake_startled` | 0 idle → 3 сон → 23 idle | `[3, 23]` |
| `hatch` | 0 idle → 5 сжатая поза → 35 idle | `[5, 35]` |
| `take_anvil` | 0 наземный idle → 35 перенос → 47 наземный idle | `[0, 35]`; перенос совместим с `walk[0]` |
| `put_anvil` | 0 наземный idle → 7 перенос → 47 наземный idle | `[7, 47]` |

Вне `stitch` нет телепортации. Если 48 кадров мало для переноса, сообщить и уточнить только дополнительную длину. Обязательные длины сохранены; разовые концы точны, петли замыкают позу и скорость.

## 7. Покой и жесты

`idle`: 0–11 вдох, плечи +1–2 px; 12–22 раскрытие краги, молот дугой к ладони; 23–26 первый лёгкий стук; 27–33 отвод; 34–38 второй стук и моргание; 39–57 взгляд на наковальню, дуга хвоста; 58–83 выдох, петля. Касание без проникновения и искрового фонтана.

`fidget_a`, «Чистая грань»: 0–7 осмотр; 8–14 тряпка из петли; 15–27 два неравных протирания; 28–34 блик и сдувание пылинки; 35–42 тряпка обратно; 43–47 idle. Ткань не исчезает.

`fidget_b`, «Лишняя окалина»: 0–10 наклон; 11–18 вдох; 19–25 выдох от `mouth`, три крошки с рабочей плоскости; 26–34 падение к основанию и взгляд; 35–47 выпрямление, крошка с краги, idle. Масштаб меньше сильного приёма.

`look`: 0–5 глаза; 6–13 голова, затем грудь; 14–20 пауза; 21–29 глаза обратно, голова с малым перелётом; 30–35 idle. Молот удерживается, наковальня стоит.

## 8. Радость: `happy`, 48 кадров

«Хорошо вышло»: ремесленная гордость, два тяжёлых ритмичных притопа и показ инструмента.

| Кадры | Секунды | Действие |
|---|---|---|
| 0 | 0 | Точный idle |
| 1–6 | 0.042–0.25 | Полуприсед, разворот груди, крага уже движется |
| 7–11 | 0.292–0.458 | Молот поднят диагонально, раскрытая крага над грудью; силуэт отличается до кадра 12 |
| 12–18 | 0.5–0.75 | Притоп ближней лапой, кивок, две искры от обоймы |
| 19–26 | 0.792–1.083 | Притоп другой лапой, поворот таза, хвост противовесом |
| 27–33 | 1.125–1.375 | Боковой подскок 5–7 px; хват цел, тень меньше и светлее |
| 34–38 | 1.417–1.583 | Посадка со сжатием, полы догоняют тело |
| 39–43 | 1.625–1.792 | Показывает рабочую грань, довольный прищур |
| 44–47 | 1.833–1.958 | Возвращает молот, ноги и весь силуэт в idle |

## 9. Трюк: `trick`, 96 кадров

«Через горнило»: подготовка→риск→звезда→поклон. Головка минимум 7 px (цель 12–16), вершина выше головы, запас сверху 3 px. Геометрия неизменна; лицо и минимум половина тела открыты.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–9 | 0–0.375 | Шире лапы, взгляд на дугу, молот назад; тени плотные |
| 10–17 | 0.417–0.708 | Присед, толчок ногами/тазом, разгон снизу; крага балансирует, искры обоймы |
| 18–25 | 0.75–1.042 | Отпуск на 18, вращающийся полёт; отдельная тень и два следа |
| 26–34 | 1.083–1.417 | Молот выше головы; грудь назад, кольцо от `mouth` вбок: светлая кромка, остывающая оболочка |
| 35–41 | 1.458–1.708 | Проход кольца у вершины, завершение оборота; лапа к ловле; тень минимальна, кольцо распадается |
| 42–49 | 1.75–2.042 | Рукоять в ладонь, хват на 46; тяжесть тянет руку, колени проседают, хвост балансирует |
| 50–57 | 2.083–2.375 | Проседание в замах; контакт `hammerFace == anvilTop` на 56, вспышка/фонтан, отдача на 57 |
| 58–69 | 2.417–2.875 | Выпрямление и взгляд на полую звезду из пяти ветвей искр над наковальней |
| 70–81 | 2.917–3.375 | Молот к плечу, поклон от таза, крага на груди; искры падают, отскакивают и гаснут |
| 82–95 | 3.417–3.958 | Голова, лапы, молот в idle; затухают вторичные части и угольки |

Риск — высота и вес ловли, без боли. В полёте хват открыт; бросок, кольцо, ловля и поклон обязательны.

## 10. Три разных приёма

Аналоги ниже — постановочный план, внешние фото/видео ещё не исследованы. До промежуточных кадров проверяются ключи: покой, подготовка, разгон, контакт, отдача, возврат. Лицо видно, руки работают на длине, сила проходит через тело.

### `tech_anvil`: «Верный удар», 48 кадров, `hit: [26]`

Кузнечный удар по своей наковальне: ноги→таз→плечо→рука→молот.

| Кадры | Секунды | Действие |
|---|---|---|
| 0–9 | 0–0.375 | Idle, взгляд на контакт, вес назад, лапа открывает дугу |
| 10–19 | 0.417–0.792 | Грудь и молот назад-вверх; крага помогает хвату |
| 20–22 | 0.833–0.917 | Крайний замах, присед, пауза; лицо открыто |
| 23–25 | 0.958–1.042 | Ноги толкают, плечо ведёт, крага освобождает контакт |
| 26 | 1.083 | `hammerFace == anvilTop`, стоп без проникновения |
| 27–31 | 1.125–1.292 | Отскок молота, локоть и колени гасят отдачу |
| 32–38 | 1.333–1.583 | Подбородок вверх, любуется искрами |
| 39–47 | 1.625–1.958 | Хват, стойка и вторичные цепи в idle |

След: 2–3 ступенчатых серпа по пути грани, выборки 1/48 с. Из контакта 10–18 искр вверх, окалина в стороны. На полу двойная пыль у основания и падающие крошки, без лавового круга. Наковальня не отрывается от пола.

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
| 25 | 1.042 | `tailTip` на полу; печать возникает здесь |
| 26–31 | 1.083–1.292 | Конец отскакивает, середина догоняет, лапа гасит отдачу |
| 32–39 | 1.333–1.625 | Оценивает знак, крага на груди |
| 40–47 | 1.667–1.958 | Хвост в idle, печать остывает в пыль |

След: узкая S-полоса по пути конца за три кадра. Контакт: овальный знак, центральная полоса, угольная крошка, боковой дымок. Без букв, чужих логотипов и жертв.

## 11. Ходьба и полный поворот

Ходьба на месте, перемещение делает `life`. `n` вверх по экрану в глубину, `e` вправо. Повороты модели настоящие 3D, без зеркалирования; принадлежности сохраняют стороны. Наковальня закреплена сзади, корпус чуть вперёд под грузом.

Цикл: 0–5 первый контакт; 6–11 перенос другой лапы; 12–17 второй контакт; 18–23 возврат первой. Опорная лапа отводится относительно root со скоростью его движения в `life`; носок на переносе 3–5 px. Груз не прыгает отдельно от ремней.

План скорости по полу 18 px/s; `speed` — **экранные px/s**, сдвиг кадра = speed/24. Глубина сжата `sin(35°)`; числа проверяются по реальному шагу:

| dir | n | ne | e | se | s | sw | w | nw |
|---|---|---|---|---|---|---|---|---|
| `[dx,dy]` | `[0,-10.324]` | `[12.728,-7.300]` | `[18,0]` | `[12.728,7.300]` | `[0,10.324]` | `[-12.728,7.300]` | `[-18,0]` | `[-12.728,-7.300]` |

`turn`: 0–11 переступания; 12–71 полный круг; 72–87 торможение; 88–95 исходная стойка. Наковальня неподвижна на полу; хвост и ремни показывают объём.

## 12. Сон, появление, усталость

`sleep_in`: 0–6 выдох; 7–14 присед, крага на наковальне, молот головкой на пол; 15–23 голова на краге, хвост за лапами. 23 = `sleep[0]`; 24–29 технический возврат, в `life` не играют.

`sleep`: два разных медленных вдоха; расслабляется палец, дрожит конец хвоста. Одна искорка из ноздри с дымной оболочкой остывает и гаснет, без Z. Голова и предметы не скользят; петля замыкает позу и скорость.

`sleep_out`: вход на 5 в сон; 5–10 глаза, затем голова; 11–20 потягивание, хвост, отталкивание крагой; 21–29 подъём тела и молота в idle. 0–4 входное обрамление.

`wake_startled`: вход на 3 из сна; 4–7 резкое раскрытие глаз и подъём груди, крепче хват; 8–12 подскок 4–6 px с меньшей тенью; 13–17 тяжёлая посадка и взгляд на наковальню; 18–23 выдох, idle.

`hatch`: 0 idle; 1–5 сжатие, молот у плеча, наковальня видна; 6–14 подъём; 15–23 распрямление с малым перелётом и кивком; 24–30 рабочий хват; 31–35 idle. Яйцо рисует игра.

`tired`: 0–9 плечи вниз, выдох; 10–18 опора крагой на наковальню; 19–26 вытирает лоб, хвост балансирует; 27–35 собирается в idle. Усталость без ранения и гибели.

## 13. Эффекты и сцена

Язык: жар, уголь, окалина, искры, дым. У частицы корка, тёплая середина, светлая кромка. Остывание ступенями жёлтый→янтарный→красный→угольный; размер и яркость убывают отдельно. Частицы имеют мировую высоту, падение, один отскок и затухание; seed фиксирован. Три приёма имеют разные эффекты.

Тени остаются на полу: при подскоке тень тела меньше и бледнее; отдельная тень молота зависит от его высоты. Свечение учитывает заслонение поверхностями.

«Кузня у вулкана»: непрозрачные 160×128, 72 фазы при 24 кадрах/с. y≈99 внутри пола из базальтовых плит; редкие швы и окалина впереди; горн, уголь и тёмная ниша сбоку; склон и узкая лава вдали. Контраст ниже героя, ярких линий за лицом и ногами нет.

В петле угли меняют четыре ступени с разными фазами, две дымные пряди растворяются, лава течёт по фиксированному руслу, редкие искры не закрывают лицо. Полный фон — этап 3; предварительная сцена для этапа 2 помечается как незавершённая.

## 14. Автономное восстановление и сдача

`python src/forge_salamander.py out/` строит текущий этап с нуля: Python 3 + Pillow + NumPy, без сети, готовых PNG, внешних шрифтов и других файлов репозитория. Сейчас вывод статический: виды, кадр покоя, листы и отчёт. Отсутствующая анимация не заменяется повтором кадра.

**`look/reference.png` по умолчанию — процедурный восстановленный лист из той же 3D-геометрии** на `#FF00FF`. Это не imagegen-оригинал и не независимая проверка сходства. Без исходных пикселей оригинал точно восстановить нельзя.

Опция `--reference /path/original.png` сохраняет отдельно предоставленный оригинал и создаёт `comparison-x4.png`. Прежний лист найден локально и использован для сравнения; его пиксели, base64, сжатые данные и шрифтовые payload не встраиваются и не идут в GitHub. В попытке 3 новой генерации нет; число генераций прошлых чатов неизвестно.

Этап 1: риг, карточка, четыре вида и idle ×4 NEAREST. Этап 2: `idle`, `trick`, `happy`, `tech_anvil`; GIF трюка и ещё один ×3 на фоне. Этап 3: остальные клипы, сцена, манифест, `showreel` ×2, около 30 с `life`, отчёт, zip ссылкой. GIF >25 МБ делится. После каждого этапа один коммит и остановка до «дальше».

GitHub: ветка `chatgpt-gornila`, папка `tools/creatures/chatgpt/forge_salamander/`, **только `src/forge_salamander.py` и `card.md` текстом**. Без картинок, GIF, zip, base64 и бинарных payload; другие пути не меняются, PR не открывается. В чат без кода, максимум две картинки за этап. Лимит ТЗ на образцы — шесть генераций; анимация кодом.

Финальный локальный вывод: `look/reference.png`, `look/rig-4views.png`, прозрачные `clips/<clip>.png`, непрозрачная `scene/scene.png`, `manifest.json`, `preview/showreel.gif`, `preview/life.gif`, `report.md`. Манифест содержит id, fps, cell, feet, frames, loop, hit, speed, stitch. Эти файлы создаются генератором, не коммитятся.

Проверено статически: высоты четырёх видов 77/84/79/81 px, основная 81 px; опора `(77,99)`; 922 примитива, 43 группы. Исправлены читаемость глаз и `body_yaw`; rigid rotation модели с наземной и переносимой наковальней проверен. Это не проверка анимации.

Финальные проверки: размеры и прозрачность полос, обрезание, контур и NEAREST; idle-концы и петли; длины костей, хват, контакты, высота и тени; пять задерживающихся цепей; 15+ читаемых деталей основного вида и полный список по четырём; открытое лицо и разные приёмы. Отчёт указывает время, строки кода, примитивы, генерации, готовность и отклонения. Эталонов Исполина сейчас нет; равенство качества не заявлено.

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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Gornila procedural pixel rig, stage 1')
    parser.add_argument('output', type=Path, help='Directory to build from scratch')
    parser.add_argument('--reference', type=Path,
                        help='Optional original 2x2 concept sheet, used only for comparison')
    args = parser.parse_args()
    generate_stage1(args.output, args.reference)
