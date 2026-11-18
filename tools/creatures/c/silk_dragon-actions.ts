import { trk,TAU,lerp,hash } from '../kit/f11-mobkit';
import { fillPoly,star,flare } from '../fx/pen';
import { oval,pathSmear,progress,scatter,shard,settle } from '../fx/field';
import type { Animation,BodyFrame,FxInput,XY } from '../types';
import type { SilkPose } from './silk_dragon';

export const animations:Record<string,Animation>={
  tech_loop:{seconds:2,hits:[1.30],shake:.15,stop:.04},
  tech_lash:{seconds:1.1,hits:[.62],shake:.09},tech_kites:{seconds:1.8,hits:[1.05,1.20,1.35],shake:.06}
};
export function pose(anim:string,t:number):SilkPose {
  if(anim.startsWith('tech_') && t>=(Math.round(animations[anim].seconds*24)-1)/24) return {};
  if(anim==='tech_loop') {
    const coil=trk(t,[[0,0],[.46,.75],[.87,1],[1.14,.91],[1.30,-.52],[1.56,.26],[1.95,0]]);
    return {curl:coil,tailSwing:trk(t,[[0,0],[.72,-.4],[1.19,.63],[1.42,-.78],[1.68,.25],[1.95,0]]),lunge:-3*coil,tilt:.10*coil,fins:-.65*coil};
  }
  if(anim==='tech_lash') {
    const tail=trk(t,[[0,0],[.37,-.83],[.46,-.72],[.62,.97],[.77,.70],[.91,-.21],[1.06,0]]);
    return {curl:trk(t,[[0,0],[.39,.76],[.61,-.20],[.83,.34],[1.06,0]]),tailSwing:tail,tilt:tail*.14,fins:.55*Math.abs(tail)};
  }
  if(anim==='tech_kites') return {fins:trk(t,[[0,0],[.48,1],[.67,.90],[.78,-1.35],[1.28,-1.35],[1.66,.18],[1.76,0]]),curl:trk(t,[[0,0],[.61,.34],[.83,-.25],[1.23,.1],[1.76,0]])};
  if(anim==='happy') return {tailSwing:trk(t,[[0,0],[.23,-.28],[.48,.84],[.72,-.34],[1.05,0]]),fins:.6*Math.sin(Math.PI*t/1.1)};
  if(anim==='tired') return {fins:-.8*Math.sin(Math.PI*t/1.5)**2,tailSwing:-.34*Math.sin(Math.PI*t/1.5)**2};
  if(anim==='hatch') return {curl:trk(t,[[0,.26],[.38,.5],[.78,-.34],[1.12,.16],[1.45,0]]),tailSwing:trk(t,[[0,.1],[.50,.7],[.93,-.5],[1.21,.2],[1.45,0]])};
  return {};
}
export function presentation(anim:string,t:number):Partial<BodyFrame> {
  if(anim==='tech_loop') {
    const dx=trk(t,[[0,0],[.55,-8],[1.14,-14],[1.3,22],[1.46,14],[1.65,-3],[1.95,0]]);
    return {dx,dy:trk(t,[[0,0],[.66,-5],[1.3,1],[1.56,-3],[1.95,0]]),sx:1+.07*dx/22,ghost:t>1.16&&t<1.35?{dx:-9,dy:1,alpha:.28}:undefined};
  }
  return {};
}

const paper=['#f6deb0','#d25d52','#f5b05f','#8d4c53'], wind='#e7d9bb', deep='#7a666b';
function loop(f:FxInput) {
  const {t,under,above,points}=f;
  if(t<1.30) {
    const u=progress(t,.10,1.22), head=points.head;
    for(let i=0;i<5;i++) {
      const a=t*4+i*TAU/5,r=38-21*u;
      oval(above,head,r,r*.51,wind,.65*u,a,a+.34+.38*u);
    }
    oval(under,[head[0],f.feet[1]+1],18+10*u,3+4*u,deep,.55*u);
    return;
  }
  const hit=f.pointAt(1.30,'head'), age=t-1.30, u=progress(t,1.30,1.97), floor:XY=[hit[0]+6,f.feet[1]];
  for(let i=0;i<4;i++) {
    const a=.3+i*TAU/4+u*.75;
    oval(under,floor,9+45*u,3+14*u,wind,(1-u)*.9,a,a+1);
    oval(above,[hit[0]+u*23,hit[1]+u*9],6+22*u,3+12*u,wind,(1-u)*.9,a+.5,a+1.35);
  }
  for(let i=0;i<7;i++) {
    const a=i*TAU/7, pt:XY=[floor[0]+Math.cos(a)*(12+30*u),floor[1]+Math.sin(a)*(3+8*u)];
    oval(above,pt,2+4*u,1+2*u,'#cfb799',.54*(1-u),.2,4.1);
  }
  scatter(f,floor,age,174,15,paper,.67,true);
}
function lash(f:FxInput) {
  pathSmear(f,'tail',.43,.66,7,'#513648','#da8465','#ffe1ab');
  if(f.t<.62) return;
  const hit=f.pointAt(.62,'tail'), age=f.t-.62, u=progress(f.t,.62,1.07), end:XY=[hit[0]+26,f.feet[1]+8];
  f.under.col(deep,.87*(1-u));f.under.line(hit[0]-14,f.feet[1]+2,...end);
  f.under.col(wind,.9*(1-u));f.under.line(hit[0]-13,f.feet[1]+1,end[0],end[1]-1);
  if(age<.17) {f.above.col('#a94f47',1-age/.17);star(f.above,...hit,10-age*33,6,.31);flare(f.above,...hit,8-age*32,'#fff3c9',1-age/.17);}
  scatter(f,end,age,213,8,['#fff2c8','#d4a75f','#a56845'],.45,true);
}
function kites(f:FxInput) {
  const launch=.74,hits=animations.tech_kites.hits!;
  hits.forEach((impact,i)=>{
    const pt:XY=[f.feet[0]+[32,59,77][i],f.feet[1]+[15,0,19][i]], age=f.t-impact;
    if(age<0) {
      const charge=progress(f.t,.24+.10*i,impact);
      oval(f.under,pt,9,3,'#6b555b',charge*.8);
      oval(f.under,pt,9,3,wind,charge,-Math.PI/2,-Math.PI/2+charge*TAU);
      if(f.t<launch) return;
      const u=progress(f.t,launch,impact), src=f.pointAt(launch,i===1?'finL':'finR');
      const x=lerp(src[0],pt[0],u), y=lerp(src[1],pt[1],u)-Math.sin(u*Math.PI)*(19+7*i);
      const a=(-.6+u*1.65),dx=5*Math.cos(a),dy=5*Math.sin(a);
      shard(f.above,x,y,dx,dy,4,paper[i],paper[(i+1)%4]);
      f.above.col(wind);f.above.line(x-dx,y-dy,x-dx-4,y-dy+2);
      return;
    }
    const fade=1-progress(f.t,impact,Math.min(1.79,impact+.8));
    f.under.col('#f1ba83',fade*.83);fillPoly(f.under,[pt[0]-8,pt[1],pt[0],pt[1]-3,pt[0]+8,pt[1],pt[0],pt[1]+3]);
    scatter(f,pt,age,221+i,12,paper,.45,true);
  });
}
export function effects(f:FxInput) {
  if(f.anim==='tech_loop') loop(f);
  else if(f.anim==='tech_lash') lash(f);
  else if(f.anim==='tech_kites') kites(f);
  else if(f.anim==='hatch' || f.anim==='happy') {
    const u=progress(f.t,.30,f.anim==='hatch'?1.35:.93);
    if(u<=0||u>=1) return;
    for(let i=0;i<4;i++) {
      const a=i*1.7+u*4,pt=f.points[i%2?'finL':'finR'];
      flare(f.above,pt[0]+Math.cos(a)*(3+8*u),pt[1]+Math.sin(a)*5,1+hash(i,157)*2,paper[0],Math.sin(Math.PI*u));
    }
  }
  if(f.anim.startsWith('tech_')) settle(f);
}
