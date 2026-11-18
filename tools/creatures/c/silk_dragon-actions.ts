import { trk,TAU,lerp,hash } from '../kit/f11-mobkit';
import { fillPoly,star,flare } from '../fx/pen';
import { oval,progress,scatter,shard,settle } from '../fx/field';
import { paintImpact,paintSocketTrail,projectileAt } from '../technique-fx';
import type { Animation,BodyFrame,FxInput,XY } from '../types';
import type { SilkPose } from './silk_dragon';

export const animations:Record<string,Animation>={
  tech_loop:{seconds:2,hits:[26/24],shake:.15,stop:.04},
  tech_lash:{seconds:1.1,hits:[15/24],shake:.09},tech_kites:{seconds:1.8,hits:[21/24,25/24,29/24,33/24],shake:.06}
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
  const hitTime=26/24;
  if(t>=23/24 && t<=27/24) paintSocketTrail(f,'above','head',Math.max(23/24,t-3/24),hitTime,{color:'#ffe3b1',width:2,alpha:.91});
  if(t<hitTime) {
    const u=progress(t,.10,.92), head=points.head;
    for(let i=0;i<5;i++){
      const a=t*4+i*TAU/5,r=38-24*u;
      oval(above,head,r,r*.51,wind,.82*u,a,a+.42+.55*u);
    }
    oval(under,[head[0],f.feet[1]+1],18+10*u,3+4*u,deep,.55*u);
    return;
  }
  const hit=f.pointAt(hitTime,'head'),age=t-hitTime,u=progress(t,hitTime,1.92),floor:XY=[hit[0]+6,f.feet[1]];
  if(age<.26)paintImpact(f,'above','head',hit,(p,x,y)=>{
    const fade=1-age/.26;
    p.col('#985849',fade);star(p,x,y,8*fade,4,.43);
    flare(p,x,y,5*fade,'#fff3c8',fade);
  });
  const descend=progress(age,0,.23);
  const wake:XY=[lerp(hit[0],floor[0],descend),lerp(hit[1],floor[1],descend)];
  for(let i=0;i<4;i++){
    const a=.3+i*TAU/4+u*1.35;
    oval(above,wake,4+30*u,3+12*u,wind,(1-u)*.95,a+.5,a+1.40);
    if(descend>.52)oval(under,floor,9+45*u,3+14*u,wind,(1-u)*.85,a,a+1.05);
  }
  if(age>=.16)scatter(f,floor,age-.16,174,16,paper,.66,true);
}
function lash(f:FxInput) {
  const hitTime=15/24;
  if(f.t>=12/24 && f.t<=16/24)paintSocketTrail(f,'above','tail',Math.max(12/24,f.t-3/24),hitTime,{color:'#f5bd8a',width:1,alpha:.97});
  if(f.t<hitTime)return;
  const hit=f.pointAt(hitTime,'tail'),before=f.pointAt(14/24,'tail'),age=f.t-hitTime,u=progress(f.t,hitTime,1.03);
  const dx=hit[0]-before[0],dy=hit[1]-before[1],len=Math.hypot(dx,dy)||1;
  const end:XY=[hit[0]+dx/len*22,hit[1]+dy/len*6];
  f.under.col(deep,.87*(1-u));f.under.line(...hit,...end);
  f.under.col(wind,.89*(1-u));f.under.line(hit[0],hit[1]-1,end[0],end[1]-1);
  if(age<.18)paintImpact(f,'above','tail',hit,(p,x,y)=>{
    const a=1-age/.18;
    p.col('#9e514e',a);star(p,x,y,9*a,6,.28);flare(p,x,y,7*a,'#fff2be',a);
  });
  scatter(f,end,age,213,8,['#fff2c8','#d4a75f','#a56845'],.39,true);
}
function kites(f:FxInput) {
  const launch=21/24;
  if(f.t>=18/24 && f.t<=22/24)for(const socket of ['finL','finR'])
    paintSocketTrail(f,'above',socket,Math.max(18/24,f.t-3/24),launch,{color:'#ebbd85',width:2,alpha:.88});
  if(f.t>=launch && f.t<launch+.13)for(const socket of ['finL','finR']){
    const src=f.pointAt(launch,socket);
    paintImpact(f,'above',socket,src,(p,x,y)=>{
      const fade=1-progress(f.t,launch,launch+.13);
      p.col('#ffdfa3',fade);p.line(x-2,y+1,x+2,y-1);
      flare(p,x,y,4*fade,'#fff2c6',fade);
    });
  }
  [25,29,33].forEach((frame,i)=>{
    const impact=frame/24,age=f.t-impact,id='kite-'+i,socket=i===1?'finL':'finR';
    const src=f.pointAt(launch,socket),dir=src[0]<f.w*.65?1:-1;
    const pt:XY=[Math.max(8,Math.min(f.w-9,src[0]+dir*[29,42,57][i])),Math.min(f.h-6,f.feet[1]+[8,-7,14][i])];
    if(f.t<launch){
      const charge=progress(f.t,.24+.10*i,launch);
      oval(f.under,pt,8,3,'#6b555b',charge*.76);
      oval(f.under,pt,8,3,wind,charge*.82,-Math.PI/2,-Math.PI/2+charge*TAU);
      return;
    }
    const pos=projectileAt(f,id,socket,launch,impact,pt,12+i*6);
    if(age<0){
      const u=progress(f.t,launch,impact),a=-.65+u*1.97,dx=5.8*Math.cos(a)*dir,dy=5.8*Math.sin(a);
      shard(f.above,...pos,dx,dy,4.6,paper[i],paper[(i+1)%4]);
      f.above.col(wind);f.above.line(pos[0]-dx,pos[1]-dy,pos[0]-dx-4*dir,pos[1]-dy+2);
    } else {
      const fade=1-progress(f.t,impact,Math.min(1.76,impact+.55));
      if(fade>0)paintImpact(f,'under',id,pt,(p,x,y)=>{
        p.col('#f1ba83',fade*.85);fillPoly(p,[x-8,y,x,y-3,x+8,y,x,y+3]);
        p.lineS(x-4,y,x,y-1,'#fff2bd',fade*.87);
      });
      scatter(f,pt,age,221+i,12,paper,.39,true);
    }
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
