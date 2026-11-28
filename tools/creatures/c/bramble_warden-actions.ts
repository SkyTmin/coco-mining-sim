import { clamp01, easeIn3, easeOut, hash, lerp, lin, sstep } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { chunks, dust, fillPoly, fly } from '../fx/pen';
import { paintMaterial, paintImpact, paintSocketTrail, projectileAt } from '../technique-fx';
import type { Animation, FxInput, XY } from '../types';
import { fissure, oval, ripple, shard, springBack } from './strike-brush';
const neutral = {
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  pitch: 0,
  roll: 0,
  yaw: 0,
  lift: 0,
  head: 0,
  coil: 0,
  flare: 0,
  reach: 0,
  squint: 0,
  ghost: 0,
};
export const animations: Record<string, Animation> = {
  tech_ram: { seconds: 2, hits: [27/24], shake: 0.2, stop: 0.06 },
  tech_volley: { seconds: 1.6, hits: [18/24,22/24,26/24], shake: 0.08 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
};
const tracks: Record<string, KeyPose<typeof neutral>[]> = {
  tech_ram: [
    [0, {}],
    [0.42, { dx: -6, pitch: 0.12, head: 0.48, squint: 0.7, flare: 0.93, lift: -1 }],
    [0.69, { dx: -10, coil: 1, head: 0.6, pitch: -0.24, flare: 1, sx: 0.9, sy: 1.04 }],
    [0.94, { dx: 5, coil: 1, pitch: 2.78, flare: 1, sx: 0.91, sy: 1.08, ghost: 0.2 }, lin],
    [1.2, { dx: 30, coil: 0.9, pitch: 6.38, head: 0.26, flare: 1, ghost: 0.32 }, lin],
    [1.3, { dx: 33, coil: 0.82, pitch: 6.49, head: 0.27, flare: 0.8 }],
    [1.53, { dx: 18, pitch: 6.07, coil: 0.38, flare: -0.23, head: -0.29 }],
    [1.79, { dx: 3, pitch: 6.34, head: 0.16, flare: 0.18 }],
    [1.98, { pitch: Math.PI * 2 }],
  ],
  tech_volley: [
    [0, {}],
    [0.34, { coil: 0.63, head: 0.13, flare: 1.44, lift: -3, sy: 0.93 }],
    [0.48, { coil: 0.39, flare: 1.62, pitch: -0.14 }],
    [0.55, { flare: 0.35, pitch: 0.13, head: -0.22 }, easeOut],
    [0.64, { coil: 0.51, flare: 1.25, pitch: -0.09 }],
    [0.7, { flare: 0.24, pitch: 0.12, head: -0.16 }, easeOut],
    [0.79, { coil: 0.54, flare: 1.19, pitch: -0.11 }],
    [0.85, { flare: -0.15, pitch: 0.17, head: -0.22 }, easeOut],
    [1.02, { flare: -0.27, head: 0.15, coil: 0.37 }],
    [1.24, { flare: 0.26, coil: 0.08 }],
    [1.56, {}],
  ],
  happy: [
    [0, {}],
    [0.26, { coil: 0.3, lift: -1.5, flare: -0.32 }],
    [0.47, { lift: 3, head: -0.37, roll: 0.1, flare: 1.14 }],
    [0.65, { roll: -0.11, flare: 0.26 }],
    [0.82, { roll: 0.08, flare: 0.59 }],
    [1.08, {}],
  ],
  tired: [
    [0, {}],
    [0.49, { head: 0.42, coil: 0.25, lift: -3, sy: 0.94, flare: -0.25 }],
    [0.91, { head: 0.52, coil: 0.55, lift: -4, squint: 1, sy: 0.9 }],
    [1.28, { head: 0.17, squint: 0.38 }],
    [1.48, {}],
  ],
  hatch: [
    [0, { coil: 1, sx: 0.61, sy: 0.59, squint: 1, head: 0.66, pitch: -0.74 }],
    [0.41, { coil: 1, sx: 0.77, sy: 0.73, squint: 1, head: 0.76, pitch: -0.52 }],
    [0.78, { coil: 0.52, sx: 0.91, sy: 1.05, head: -0.21, flare: 0.66, squint: 1 }],
    [1.06, { pitch: 0.08, head: 0.26, flare: 0.9, squint: 0.86 }],
    [1.24, { head: -0.09, flare: 0.26 }],
    [1.48, {}],
  ],
};
export function pose(anim: string, t: number) {
  const p = tracks[anim] ? keyPose(t, tracks[anim], neutral) : { ...neutral };
  if (anim === 'tech_ram') p.flare += springBack(t - 1.28) * 0.6;
  if (anim === 'tech_volley') p.head += 0.18 * springBack(t - 0.86);
  return p;
}
function leaves(f: FxInput, age: number, origin: XY, count: number) {
  if (age < 0 || age > 1.45) return;
  for (let i = 0; i < count; i++) {
    const q = age - 0.025 * (i % 5);
    if (q < 0) continue;
    const rand = hash(i, 11, 97),
      fall = fly(q, 41 + 29 * rand, 175, 0.22);
    const x = origin[0] - (20 + 41 * rand) * fall.h + 4 * Math.sin(q * 9 + i) * Math.min(1, q * 3);
    const floor = origin[1] + (hash(i, 19) - 0.45) * 18 * q,
      y = floor - fall.z;
    const a = q * (4 + 8 * rand) + i,
      fade = clamp01((1.45 - q) / 0.35);
    oval(f.under, x, floor, 2.6, 0.65, '#352c28', 0.55 * fade);
    shard(
      f.above,
      x,
      y,
      2.5 + 2 * rand,
      1 + 1.1 * Math.abs(Math.sin(a)),
      a * 0.58,
      '#534333',
      Math.cos(a) > 0.1 ? '#aa905e' : '#806d49',
      fade,
    );
  }
}
function ram(f: FxInput) {
  const { under, above, t, feet, points } = f,
    hit=27/24,age=t-hit;
  if (t < 1.22) {
    const growth = sstep(0.1, 0.65, t);
    for (let i = -1; i <= 1; i++) {
      const o = feet[0] + 1,
        start = feet[1] + 5,
        dist = (49 - Math.abs(i) * 6) * growth;
      under.col('#39302f', 0.65);
      for (let j = 1; j <= 6; j++) {
        const last = (j - 1) / 6,
          u = j / 6;
        const y = (v: number) => start + 5 * i * v + Math.sin(i + v * 11) * 2 * v;
        under.line(o + last * dist, y(last), o + u * dist, y(u));
      }
    }
  }
  if (t > 0.7) {
    const u = clamp01((t - 0.7) / 0.5),
      x = feet[0] - 10 + 41 * u;
    under.lineS(feet[0] - 9, feet[1] + 7, x, feet[1] + 8, '#44312e', clamp01(1.7 - t));
    leaves(f, t - 0.75, [feet[0] + 3, feet[1] + 7], 6);
    if(t>=24/24 && t<=28/24) paintSocketTrail(f,'above','snout',Math.max(24/24,t-3/24),hit,{color:'#c9a46d',width:2,alpha:.82});
  }
  if (age < 0) return;
  const at = f.pointAt(hit, 'snout'),
    x = at[0],
    y = Math.max(feet[1], at[1]);
  if(age<.24)paintImpact(f,'above','snout',at,(pen,cx,cy)=>{
    const fade=1-sstep(.03,.24,age);
    shard(pen,cx,cy,3.5,1.5,.31,'#744528','#ecbd7d',fade);
    pen.lineS(cx,cy,cx+4+age*22,cy-2-age*9,'#d9ae77',fade);
    pen.lineS(cx+1,cy,cx+3+age*15,cy+2+age*4,'#a67550',fade);
  });
  oval(under, x, y, 9, 3, '#3b292b', clamp01((0.85 - age) / 0.3));
  fissure(under, 'briar-furrow', 910, x, y, age, 24, '#42332e', '#a78b64', 0.85);
  chunks(above, 26, age, x, y, 14, 0, 2.8, 20, 48, 30, 48, [0.48, 0.8], 0.37, 1);
  for (let i = 0; i < 13; i++) {
    const v = hash(i, 518),
      q = age - 0.006 * i;
    if (q < 0) continue;
    const path = fly(q, 29 + 41 * v, 280, 0.12),
      xx = x + (hash(i, 158) - 0.4) * 83 * path.h,
      gy = y + (v - 0.4) * 25 * path.h;
    const settled = !path.air || q > 0.35,
      fade = clamp01((0.88 - q) / 0.29);
    oval(
      settled ? under : above,
      xx,
      settled ? gy : gy - path.z,
      settled ? 2.7 : 1.7,
      settled ? 1.25 : 1.5,
      '#62384f',
      fade,
    );
    if (!settled) above.lineS(xx - 1, gy - path.z - 1, xx, gy - path.z - 1, '#b06b7c', fade);
  }
  leaves(f, age, [x, y], 8);
}
function volley(f: FxInput) {
  for(const [wave,born] of [18,22,26].entries()){
    const launch=born/24,land=(born+5)/24;
    const socket='spine',age=f.t-land,jet=wave===0?15:born-2;
    if(f.t<launch-.24 || age>.40)continue;
    if(f.t>=jet/24 && f.t<=launch+1/24)
      paintSocketTrail(f,'above',socket,Math.max(jet/24,f.t-3/24),launch,{color:'#c6a275',width:2,alpha:.9});
    const source=f.pointAt(launch,socket),base=f.pointAt(launch,'spineBase');
    const axisX=source[0]-base[0],axisY=source[1]-base[1];
    const dir=axisX>=0?1:-1;
    const edgeRoom=Math.max(2,dir>0?f.w-4-source[0]:source[0]-4);
    if(f.t>=launch && f.t<launch+.115)paintImpact(f,'above',socket,source,(pen,x,y)=>{
      const u=sstep(launch,launch+.115,f.t),alpha=1-u;
      shard(pen,x+dir*u*6,y-u*2,3.4,1.35,dir>0?-.32:3.4,'#796044','#efd5a7',alpha);
      pen.lineS(x,y,x-dir*(1+u*4),y+u*1.5,'#746540',alpha);
    });
    for(let j=-1;j<=1;j++){
      const reach=Math.min(29+wave*6,edgeRoom);
      const target:XY=[source[0]+dir*reach*(.79+j*.18),
        Math.max(7,Math.min(f.h-7,f.feet[1]+1+j*10+wave*2))];
      if(f.t<launch){
        const u=sstep(launch-.24,launch,f.t);
        f.under.lineS(target[0]-dir*5*u,target[1]-j*2,target[0],target[1],'#b69a6b',.62*u);
        continue;
      }
      // For the parabolic path y'(0) = landingY - sourceY - 4h. Match
      // that tangent to the live thorn axis with three small fan offsets.
      const launchSlope=axisY/Math.max(4,Math.abs(axisX)) + .21*j;
      const height=Math.max(2,Math.min(30,(target[1]-source[1]-Math.abs(target[0]-source[0])*launchSlope)/4));
      const pt=projectileAt(f,'briar-'+wave+'-'+j,socket,launch,land,target,height);
      if(f.t<land){
        const u=clamp01((f.t-launch)/(land-launch));
        const angle=Math.atan2(target[1]-source[1]-4*height*(1-2*u),target[0]-source[0]);
        const ux=Math.cos(angle),uy=Math.sin(angle);
        // The sampled projectile is the cutting tip. Its shaft and light edge trail behind it.
        const mid:XY=[pt[0]-3.8*ux,pt[1]-3.8*uy];
        paintMaterial(f,'above','briar-'+wave+'-'+j,pt,(p)=>{
          p.lineS(pt[0]-9*ux,pt[1]-9*uy,...mid,'#4a2834',.93);
          shard(p,...mid,3.8,2.2,angle,'#563044','#f7d689');
          p.col('#fff2c6');p.line(pt[0]-2*ux,pt[1]-2*uy,...pt);
          p.col('#aa4956');p.dot(mid[0]-ux,mid[1]-uy,2,2);
        });
      } else {
        const a=-2.02+springBack(age,28)*.48,fade=1-sstep(.17,.39,age);
        shard(f.above,target[0],target[1]-2,6,1.75,a,'#512d39','#efce87',fade);
        if(age<4/24) {
          const v=age*6;
          paintImpact(f,'above','briar-'+wave+'-'+j,target,(pen,x,y)=>{
            pen.col('#643742',1-v);pen.line(x-3,y,x+3,y);
            pen.col('#fff0b6',1-v);pen.line(x,y,x-dir*(2+4*v),y-2-3*v);
            pen.dot(x+dir*(2+5*v),y-1-3*v,2,1);
          });
        }
        f.under.lineS(target[0]-2,target[1]+1,target[0]+3,target[1],'#493a34',fade*.83);
        ripple(f.under,...target,2+age*15,.41,'#bda07c',clamp01(1-age*4));
      }
    }
  }
}
export function effects(f: FxInput) {
  if (f.anim === 'tech_ram') ram(f);
  if (f.anim === 'tech_volley') volley(f);
  if (f.anim === 'happy') leaves(f, f.t - 0.41, [f.points.spine[0], f.feet[1] - 3], 5);
  if (f.anim === 'hatch' && f.t > 0.64)
    dust(f.under, 34, f.t - 0.64, ...f.feet, 5, 0, 3, 8, 12, 1, 3, 5, 0.52, 6, 0.66);
}

// A root rises out of the peat at the actual snout height. The pale cut edge
// faces the incoming wheel. After impact the crown splits; its base stays put.
export function props(f:FxInput) {
  if(f.anim!=='tech_ram')return;
  const hit=27/24,at=f.pointAt(hit,'snout'),age=f.t-hit;
  const s=at[0]>=f.pointAt(24/24,'snout')[0]?1:-1;
  const x=at[0],y=at[1],ground=Math.min(f.h-2,Math.max(y+7,f.feet[1]+4));
  const bend=age<=0?0:3*sstep(0,.13,age);
  const contour=(pts:XY[])=>pts.flatMap(([dx,dy])=>[x+dx*s,dy]);
  const fade=1-sstep(1.70,1.94,f.t);
  oval(f.under,x+6*s,ground,9,2,'#363b32',fade*.85);
  paintMaterial(f,'under','peat-root',at,p=>{
    p.col('#392e2a',fade);
    fillPoly(p,contour([[-2,ground+1],[2,ground-3],[4,y+7],[0,y+1],[0,y-2],[4,y-3+bend],[8,y+1+bend],[9,y+6],[8,ground-4],[15,ground-3],[19,ground],[10,ground+1],[7,ground+3],[4,ground]]));
    p.col('#856a48',fade);
    fillPoly(p,contour([[1,y-2],[4,y-3+bend],[8,y+1+bend],[6,y+4],[3,y+2]]));
    p.lineS(x+5*s,y+5,x+4*s,ground-3,'#75644b',fade);
    p.lineS(x+s,y-1,x+4*s,y+1+bend,'#b79a6c',fade);
    p.lineS(x+8*s,ground-2,x+13*s,ground-2,'#647451',fade);
  },ground);
}
