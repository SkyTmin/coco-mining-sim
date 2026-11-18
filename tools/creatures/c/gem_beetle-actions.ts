import { clamp01, easeIn3, easeOut, hash, lerp, sstep } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { fillPoly, flare, fly } from '../fx/pen';
import { paintMaterial, paintImpact, paintSocketTrail } from '../technique-fx';
import type { Animation, FxInput, XY } from '../types';
import { fissure, grit, oval, ripple, shard, springBack } from './strike-brush';
const normal = {
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
  glow: 0,
  wing: 0,
  ghost: 0,
};
export const animations: Record<string, Animation> = {
  tech_horn: { seconds: 1.6, hits: [21/24], shake: 0.15, stop: 0.04 },
  tech_prism: { seconds: 1.4, hits: [19/24], shake: 0.07 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
};
const tracks: Record<string, KeyPose<typeof normal>[]> = {
  tech_horn: [
    [0, {}],
    [0.44, { dx: -7, coil: 0.41, head: 0.23, pitch: 0.07, wing: 0.13, lift: -2 }],
    [0.73, { dx: -9, coil: 0.61, head: 0.37, lift: -3, glow: 1, reach: -1.5 }],
    [
      0.9,
      { dx: 12, pitch: 0.24, head: 0.5, reach: 1.6, sx: 1.06, sy: 0.91, ghost: 0.38, glow: 1 },
      easeIn3,
    ],
    [1.01, { dx: 15, pitch: 0.27, head: 0.61, lift: -2, wing: 0.16 }],
    [1.25, { dx: 5, head: 0.11, roll: -0.04, glow: 0.31 }],
    [1.45, { dx: -2, pitch: -0.035 }],
    [1.58, {}],
  ],
  tech_prism: [
    [0, {}],
    [0.28, { wing: 0.39, coil: 0.25, pitch: 0.06 }],
    [0.49, { wing: 0.97, coil: 0.55, lift: -2, glow: 0.47 }],
    [0.75, { wing: 1.2, coil: 0.48, lift: -2, glow: 1, roll: -0.07 }],
    [0.8, { wing: 1.31, glow: 1, head: -0.13, sx: 1.04, sy: 0.96 }],
    [0.99, { wing: 1.12, glow: 0.65 }],
    [1.12, { wing: -0.14, pitch: 0.08, sx: 0.97, sy: 1.04 }, easeIn3],
    [1.23, { wing: 0.15, head: -0.1 }],
    [1.38, {}],
  ],
  happy: [
    [0, {}],
    [0.23, { wing: 0.17, coil: 0.41 }],
    [0.42, { wing: 0.92, head: -0.23, lift: 2 }],
    [0.58, { wing: 0.14, roll: 0.08 }],
    [0.74, { wing: 0.72, roll: -0.07, glow: 0.66 }],
    [1.06, {}],
  ],
  tired: [
    [0, {}],
    [0.54, { coil: 0.61, head: 0.41, lift: -3, sx: 1.04, sy: 0.93 }],
    [0.92, { coil: 0.88, head: 0.5, lift: -4, squint: 1, wing: 0.08 }],
    [1.46, {}],
  ],
  hatch: [
    [0, { coil: 1, head: 0.68, wing: -0.2, sx: 0.62, sy: 0.64, glow: 0 }],
    [0.38, { coil: 0.96, head: 0.48, sx: 0.78, sy: 0.8 }],
    [0.73, { coil: 0.36, wing: 0.85, head: 0.27, lift: 1 }],
    [1.02, { wing: -0.15, glow: 1, head: -0.32 }],
    [1.18, { wing: 0.12, head: -0.21, glow: 0.65 }],
    [1.48, {}],
  ],
};
export function pose(anim: string, t: number) {
  const p = tracks[anim] ? keyPose(t, tracks[anim], normal) : { ...normal };
  if (anim === 'tech_horn') p.wing += 0.52 * springBack(t - 0.91);
  if (anim === 'tech_prism') p.head += 0.2 * springBack(t - 1.11);
  return p;
}
function horn(f: FxInput) {
  const { t, feet, under, above, points } = f,
    hit=21/24, age=t-hit;
  const gold = f.variant === 'gold',
    glint = gold ? '#ffe6a8' : '#d6fff1',
    light = gold ? '#e8bb6d' : '#76d5db',
    mid = gold ? '#a87540' : '#508598';
  if (t < hit) {
    for (let j = 0; j < 5; j++) {
      const k = sstep(0.17 + j * 0.083, 0.6 + j * 0.04, t);
      if (!k) continue;
      const x = feet[0] + 23 + j * 7,
        y = feet[1] + 6 + j * 0.72;
      paintMaterial(f, 'under', 'vein-' + j, [x, y], pen => shard(pen, x, y, 4 + k, 2, 0.07, mid, light, k * 0.7), feet[1] + 6 + j * 0.72);
    }
    if (t > 0.12 && t < 0.64)
      grit(under, points.foot[0] - 3, points.foot[1], (t - 0.12) % 0.32, 5, 232, '#97877f');
    if (t > 0.44) flare(above, ...points.horn, 1 + 6 * sstep(0.44, 0.8, t), light, 0.87);
  }
  if(t>=18/24 && t<=22/24) paintSocketTrail(f,'above','horn',Math.max(18/24,t-3/24),hit,{color:light,width:2,alpha:.92});
  if (age < 0) return;
  const source = f.pointAt(hit, 'horn'),
    x = source[0],
    y = feet[1] + 9;
  if(age<.18)paintImpact(f,'above','horn',source,(pen,cx,cy)=>flare(pen,cx,cy,12*clamp01(1-age/.15),glint,clamp01(1-age/.18)));
  fissure(under, 'split-gem', 63, x, y, age, 23, '#344f64', light, 0.78);
  for (let j = 0; j < 13; j++) {
    const r = hash(j, 80),
      a = hash(j, 61) * Math.PI * 2,
      q = fly(age, 31 + 39 * r, 290, 0.38);
    const xx = x + Math.cos(a) * (16 + 34 * r) * q.h,
      gy = y + Math.sin(a) * (16 + 18 * r) * q.h;
    const fade = clamp01((0.71 - age) / 0.23);
    oval(under, xx, gy, 2.2, 0.8, '#283745', 0.6 * fade);
    shard(above, xx, gy - q.z, 2.9 + 2.3 * r, 1.6 + r, a + age * 9, mid, light, fade);
    if (r > 0.68 && age < 0.28) above.lineS(xx, gy - q.z - 1, xx + 1, gy - q.z - 1, glint, fade);
  }
  if (age > 0.11) {
    const to = points.foot;
    under.lineS(x - 13, y, to[0], to[1], '#687582', clamp01((0.6 - age) / 0.2) * 0.78);
  }
}
function prism(f: FxInput) {
  const hit=19/24,age=f.t-hit;
  const colors=['#97e3ca','#b9dfff','#e8c3ef'];
  const sockets=['leftWing','rightWing'] as const;
  for(let i=0;i<2;i++){
    const name=sockets[i],p=f.points[name];
    if(age<0){
      const rise=sstep(4/24,16/24,f.t);
      flare(f.above,...p,1+4*rise,colors[i],rise);
    }
    if(f.t>=16/24 && f.t<=20/24)
      paintSocketTrail(f,'above',name,Math.max(16/24,f.t-3/24),hit,{color:colors[i],width:2,alpha:.85});
  }
  if(age<0)return;
  const left=f.pointAt(hit,'leftWing'),right=f.pointAt(hit,'rightWing');
  const forward=Math.max(left[0],right[0])+9<f.w-9?1:-1;
  const focus:XY=[(left[0]+right[0])/2+forward*8,(left[1]+right[1])/2-3];
  const fade=1-sstep(.12,.39,age),travel=sstep(-.022,.11,age);
  for(let i=0;i<2;i++) {
    const pt=i?right:left,dy=i?10:-12,end:XY=[Math.max(5,Math.min(f.w-5,focus[0]+forward*(35+i*5))),focus[1]+dy];
    if(fade>0)paintImpact(f,'above',sockets[i],pt,(p,x,y)=>{
      const tx=lerp(x,end[0],travel),ty=lerp(y,end[1],travel);
      p.col(i?'#528ebf':'#448f8e',fade);fillPoly(p,[x,y-2,tx,ty,x,y+2]);
      p.lineS(x,y,tx,ty,colors[i],fade);
      p.lineS(x,y,focus[0],focus[1],'#aec4d3',fade*.68);
      flare(p,x,y,3.4*(1-sstep(.04,.21,age)),colors[i],fade);
    });
    f.under.lineS(focus[0],f.feet[1]+3,end[0],f.feet[1]+dy*.38,colors[i],.52*(1-sstep(.10,.51,age)));
  }
  if(fade>0){
    const x=Math.max(5,Math.min(f.w-5,focus[0]+forward*56*travel)),y=focus[1]+1;
    f.above.lineS(...focus,x,y,colors[2],fade);
    flare(f.above,...focus,5*(1-sstep(0,.24,age)),colors[2],fade);
    f.under.lineS(focus[0],f.feet[1]+4,x,f.feet[1]+4,colors[2],.48*fade);
  }
  if(age>.26) ripple(f.above,...right,3+(age-.26)*43,.46,'#bfead8',1-sstep(.26,.53,age));
}
export function effects(f: FxInput) {
  if (f.anim === 'tech_horn') horn(f);
  if (f.anim === 'tech_prism') prism(f);
  if (f.anim === 'happy' && f.t > 0.39 && f.t < 0.89)
    flare(f.above, ...f.points.leftWing, 4 * Math.sin((Math.PI * (f.t - 0.39)) / 0.5), '#c5f6e8', 0.86);
  if (f.anim === 'hatch' && f.t > 0.79 && f.t < 1.36)
    flare(f.above, ...f.points.horn, 7 * Math.sin((Math.PI * (f.t - 0.79)) / 0.57), '#d6ffef', 0.82);
}

// The leading lip is undercut, so the horn can physically come up underneath.
// Its deep violet rind stays visible next to the more saturated blue armour.
export function props(f:FxInput) {
  if(f.anim!=='tech_horn')return;
  const hit=21/24, at=f.pointAt(hit,'horn'), s=at[0]>=f.pointAt(18/24,'horn')[0]?1:-1;
  const x=at[0],y=at[1],ground=Math.min(f.h-2,Math.max(y+8,f.feet[1]+6));
  const age=Math.max(0,f.t-hit), flight=fly(age,46,210,.16),dx=age>0?24*flight.h:0;
  const dy=age>0?-flight.z+Math.max(0,ground-y-2)*sstep(.16,.44,age):0;
  const fade=1-sstep(1.28,1.53,f.t);
  oval(f.under,x+s*7,ground,11,2,'#3f3c51',fade*.8);
  paintMaterial(f,'under','quartz-outcrop',at,p=>{
    const face=(pairs:XY[],color:string)=>{p.col(color,fade);fillPoly(p,pairs.flatMap(([u,v])=>[x+s*u,v]));};
    const baseH=ground-y;
    face([[3,ground],[11,ground-baseH*.35],[7,y+2],[13,y-3],[17,y+1],[18,ground-baseH*.50],[25,ground-2],[22,ground+1]],'#4a4057');
    face([[3,ground],[11,ground-baseH*.35],[7,y+2],[11,y+1],[15,ground-baseH*.37],[9,ground-1]],'#746378');
    face([[15,ground-baseH*.37],[17,y+3],[18,ground-baseH*.50],[24,ground-2]],'#5f5068');
    for(let i=1;i<4;i++){
      const row=ground-baseH*i*.19,edge=9+i*.8;
      p.lineS(x+edge*s,row,x+(edge+4)*s,row-2,'#897584',fade*.81);
    }
    const blade=(pairs:XY[],color:string)=>face(pairs.map(([u,v])=>[dx+u,y+dy+v]),color);
    blade([[-3,-5],[3,-12],[9,-10],[15,-5],[12,-1],[3,2],[0,0]],'#674c68');
    blade([[-3,-5],[3,-12],[7,-7],[3,-1],[0,0]],'#c09ab1');
    blade([[3,-12],[9,-10],[15,-5],[7,-7]],'#95819b');
    p.lineS(x+s*(dx-2),y+dy-5,x+s*(dx+3),y+dy-11,'#e4cbd5',fade);
    p.lineS(x+s*dx,y+dy,x+s*(dx+4),y+dy+1,'#c0aab7',fade);
  },ground);
}
