import { trk,TAU,hash,lerp,sstep } from '../kit/f11-mobkit';
import { flare,fly,type Pen } from '../fx/pen';
import { oval,ellFill,pathSmear,progress,settle } from '../fx/field';
import type { Animation,BodyFrame,FxInput,XY } from '../types';
import type { ToadPose } from './toad_shaman';

export const animations:Record<string,Animation>={
  tech_croak:{seconds:2,hits:[1.1],shake:.20,stop:.04},tech_tongue:{seconds:.9,hits:[.45],shake:.08},
  tech_staff:{seconds:1.4,hits:[.85],shake:.12},tech_leap:{seconds:1.8,hits:[1.2],shake:.22,stop:.05},
  tech_spores:{seconds:2,hits:[1,1.3,1.6]},phase:{seconds:2.2},
  'idle-f2':{seconds:3,loop:true},away:{seconds:1.5},back:{seconds:1.5}
};
function travel(t:number) {return trk(t,[[0,0],[.31,0],[.70,79],[1.19,204],[1.5,205]]);}
export function pose(anim:string,t:number):ToadPose {
  if(anim.startsWith('tech_') && t>=(Math.round(animations[anim].seconds*24)-1)/24) return {};
  if(anim==='tech_croak') return {throat:trk(t,[[0,0],[.45,.3],[.94,1.2],[1.055,1.25],[1.18,.04],[1.47,-.15],[1.91,0]]),
    staffLift:trk(t,[[0,0],[.45,7],[1.1,8],[1.56,1],[1.93,0]]),jaw:trk(t,[[0,0],[.98,0],[1.1,1],[1.42,.83],[1.89,0]]),crouch:trk(t,[[0,0],[1,-3],[1.2,6],[1.91,0]])};
  if(anim==='tech_tongue') return {tongue:trk(t,[[0,0],[.30,0],[.45,1],[.51,1.05],[.64,.43],[.73,.16],[.79,0]]),
    throat:trk(t,[[0,0],[.26,-.42],[.44,.14],[.56,-.18],[.84,0]]),jaw:trk(t,[[0,0],[.29,.04],[.42,.95],[.58,.9],[.83,0]])};
  if(anim==='tech_staff') return {staffLift:trk(t,[[0,0],[.45,15],[.64,17],[.85,0],[.93,-2],[1.11,2],[1.34,0]]),
    staffAngle:trk(t,[[0,0],[.55,-.13],[.85,.13],[1.05,-.05],[1.34,0]]),crouch:trk(t,[[0,0],[.61,-3],[.85,4],[1.33,0]])};
  if(anim==='tech_leap') return {crouch:trk(t,[[0,0],[.44,14],[.57,-4],[.9,4],[1.15,-3],[1.20,15],[1.40,9],[1.59,-1.2],[1.73,0]]),
    lift:trk(t,[[0,0],[.44,0],[.68,39],[.86,53],[1.05,36],[1.2,0]]),staffAngle:trk(t,[[0,0],[.45,.14],[.77,-.24],[1.20,.18],[1.50,-.05],[1.73,0]])};
  if(anim==='tech_spores') return {throat:trk(t,[[0,0],[.80,1.15],[1,.2],[1.17,.83],[1.3,.05],[1.46,.7],[1.6,.02],[1.77,-.25],[1.94,0]]),
    jaw:trk(t,[[0,0],[.90,.14],[1,.8],[1.16,.3],[1.3,.9],[1.45,.25],[1.6,.75],[1.93,0]]),crouch:trk(t,[[0,0],[.85,-2],[1.61,5],[1.94,0]])};
  if(anim==='phase') return {phase:sstep(.50,1.88,t),crouch:trk(t,[[0,0],[.49,8],[1.22,3],[1.88,-2],[2.15,0]]),
    throat:trk(t,[[0,0],[.48,-.28],[1.18,.43],[2.14,0]]),staffLift:trk(t,[[0,0],[.58,-2],[1.43,8],[2.14,0]])};
  if(anim==='away'||anim==='back') {
    const k=anim==='away'?t:1.5-t;
    return {lift:trk(k,[[0,0],[.31,0],[.64,44],[.80,48],[1.17,0]]),crouch:trk(k,[[0,0],[.25,12],[.48,0],[.75,5],[1.15,0]]),
      staffAngle:trk(k,[[0,0],[.27,.10],[.80,-.22],[1.21,0]])};
  }
  if(anim==='happy') return {staffLift:trk(t,[[0,0],[.21,-3],[.40,16],[.62,13],[.80,16],[1.06,0]]),throat:.55*Math.sin(Math.PI*t/1.1)**2};
  if(anim==='tired') return {staffAngle:.22*Math.sin(Math.PI*t/1.5)**2,throat:-.31*Math.sin(Math.PI*t/1.5)**2};
  if(anim==='hatch') return {crouch:trk(t,[[0,8],[.32,6],[.61,-3],[.92,8],[1.45,0]]),
    lift:trk(t,[[0,0],[.28,0],[.56,22],[.70,19],[.92,0]]),staffLift:trk(t,[[0,0],[.28,3],[.63,18],[.96,2],[1.07,-2],[1.45,0]]),
    staffAngle:trk(t,[[0,.31],[.37,.40],[.68,-.23],[.95,.08],[1.42,0]])};
  return {};
}
export function presentation(anim:string,t:number):Partial<BodyFrame> {
  if(anim==='away'||anim==='back') return {dx:travel(anim==='away'?t:1.5-t)};
  if(anim==='tech_leap') {
    const press=trk(t,[[0,0],[.44,.8],[.61,-.7],[1.13,-.23],[1.2,1],[1.44,.23],[1.73,0]]);
    return {sx:1+.09*press,sy:1-.09*press,dx:trk(t,[[0,0],[.44,-5],[1.20,12],[1.48,5],[1.73,0]])};
  }
  return {};
}
const green=['#eced9f','#b6cd81','#789b74','#477874'],water=['#d3e0ae','#9cc7ae','#609889'];
function mushroom(p:Pen,x:number,y:number,s:number,cap:string) {
  if(s<.10) return;
  const h=Math.max(1,Math.round(8*s)),r=1+3.6*s;
  p.col('#4e5551');p.rect(Math.round(x)-1,Math.round(y)-h,3,h);
  p.col('#d3cf95');p.rect(Math.round(x),Math.round(y)-h,1,h);
  ellFill(p,[x,y-h],r,1.4*s+1,'#3e625c',1);
  ellFill(p,[x,y-h-1],r,2.5*s,cap,1);p.col('#dbe6a0');p.dot(x-r/2,y-h-2);
}
function drops(f:FxInput,ground:XY,age:number,seed:number,count:number,life:number) {
  if(age<0||age>=life) return;
  const fade=1-progress(age,life*.68,life);
  for(let i=0;i<count;i++) {
    const a=TAU*hash(i,seed),b=fly(age,32+64*hash(i,seed,1),295,.26);
    const d=(28+43*hash(i,seed,2))*b.h,x=ground[0]+Math.cos(a)*d,y=ground[1]+Math.sin(a)*d*.45;
    if(b.air) {
      const r=1.1+1.2*hash(i,seed,3);
      ellFill(f.under,[x,y],r+1,1,'#384e56',.45*fade);
      ellFill(f.above,[x,y-b.z],r,r*1.65,'#527d76',fade);
      f.above.col(water[i%3],fade);f.above.dot(x-1,y-b.z-1,1+i%2,1);
    } else oval(f.under,[x,y],2.2,1.1,water[1],fade*.8);
  }
}
function croak(f:FxInput) {
  const hit=1.1,age=f.t-hit;
  const charge=progress(f.t,.15,.99), glow=charge*(1-progress(f.t,1.10,1.38));
  if(glow>0) {const lamp=f.points.staffTip;flare(f.above,...lamp,2+glow*5,green[0],glow);}
  if(age<0)return;
  const origin=f.pointAt(hit,'mouth'),floor:XY=[origin[0],f.feet[1]+4];
  for(let i=0;i<3;i++) {
    const u=progress(age,i*.10,.71+i*.07);
    if(u<=0||u>=1) continue;
    oval(f.above,[origin[0]+u*24,origin[1]],3+u*17,5+u*25,green[0],(1-u)*.88,-1.26,4.80);
    oval(f.under,floor,7+u*66,2+u*17,water[1],(1-u)*.91);
  }
  for(let i=0;i<12;i++) {
    const a=TAU*i/12, x=floor[0]+Math.cos(a)*53,y=floor[1]+Math.sin(a)*15;
    const size=trk(age,[[0,0],[.15+i*.008,.1],[.34+i*.006,.9],[.52,.83],[.83,0]]);
    mushroom(f.under,x,y,size*(.56+.4*hash(i,454)),green[i%3]);
  }
}
function tongue(f:FxInput) {
  const hit=.45,age=f.t-hit;
  pathSmear(f,'tongueTip',.31,.48,6,'#66415a','#c77a85','#ebadb1');
  if(age<0)return;
  const pt=f.pointAt(hit,'tongueTip'),u=progress(age,0,.40),fade=1-progress(age,.18,.42);
  for(let i=0;i<8;i++) {
    const a=i*TAU/8, r=(2+8*Math.sin(u*Math.PI*.7))*(.72+.45*hash(i,75));
    ellFill(f.under,[pt[0]+Math.cos(a)*r,pt[1]+Math.sin(a)*r*.39],3+i%3,1+i%2,'#789578',fade);
  }
  oval(f.under,pt,5+4*u,2+u,'#d0cda0',fade*.83,-2.6,-.36);
  drops(f,pt,age,341,14,.42);
}
function staff(f:FxInput) {
  const hit=.85,age=f.t-hit,pt=f.points.staffTip;
  const charge=progress(f.t,.12,.58)*(1-progress(f.t,.85,1.21));
  if(charge>0) {
    const base=f.points.staffFoot,core:XY=[pt[0]+1,pt[1]+6];
    ellFill(f.above,core,5+4*charge,2+2*charge,'#dbc96b',.79*charge);
    for(let i=-3;i<=3;i++){
      const brightness=progress(f.t,.17+.043*Math.abs(i),.59+.035*Math.abs(i))*(1-progress(f.t,.85,1.15));
      const x=core[0]+i*2.85, y=core[1]+2-Math.abs(i)*.75;
      f.above.col('#ffe798',brightness);f.above.line(core[0],core[1]+4,x,y);
      f.above.col('#fff4c1',brightness);f.above.dot(x,y,2,1);
    }
    flare(f.above,core[0],core[1]+1,3+5*charge,'#fff3be',charge);
    const hand:XY=[lerp(base[0],core[0],.42),lerp(base[1],core[1],.42)];
    const glint=progress(f.t,.50,.67)*(1-progress(f.t,.76,.89));
    flare(f.above,...hand,1+4*glint,'#ffe6a2',glint);
  }
  if(age<0)return;
  const foot=f.pointAt(hit,'staffFoot'),head=f.pointAt(hit,'staffTip');
  const u=progress(age,0,.53),fade=1-progress(age,.33,.53);
  const reflection:XY=[foot[0]-8,foot[1]+4];
  oval(f.under,reflection,8+u*11,2+u*3,'#d8d486',.88*(1-u),-2.94,2.32);
  for(let i=0;i<28;i++) {
    const a=TAU*i/28, rx=6+u*32,ry=2+u*11,x=foot[0]+Math.cos(a)*rx,y=foot[1]+Math.sin(a)*ry;
    f.under.col(green[2+i%2],fade*.92);f.under.line(x,y,x+3*Math.cos(a+.6),y+2*Math.sin(a+.6));
    f.under.col(green[1],fade*.8);f.under.dot(x-1,y-1);
    const spread=7+u*(11+17*hash(i,231)),sx=head[0]+Math.cos(a)*spread,sy=head[1]+Math.sin(a)*spread*.4-15*Math.sin(u*Math.PI);
    f.above.col(green[i%3],fade*(.76+.19*Math.sin(i+u*4)));f.above.dot(sx,sy,i%4===0?2:1,1);
  }
}
function leap(f:FxInput) {
  const hit=1.2,age=f.t-hit;
  if(age<0) {
    const target:XY=[f.feet[0]+12,f.feet[1]+4],u=progress(f.t,.44,1.18);
    if(u>0) {ellFill(f.under,target,13+u*17,2.6+u*4,'#243a40',.18+u*.22);oval(f.under,target,13+u*17,3+u*4,water[1],u*.45);}
    return;
  }
  const left=f.pointAt(hit,'footL'), right=f.pointAt(hit,'footR'),center:XY=[(left[0]+right[0])/2,(left[1]+right[1])/2],u=progress(age,0,.56);
  for(const [i,pt] of [left,right].entries()) {
    drops(f,pt,age,561+i,17,.54);
    oval(f.under,pt,5+u*26,1.5+u*7,water[0],(1-u)*.9);
  }
  oval(f.under,center,20+u*46,4+u*14,water[1],(1-u)*.81);
  for(let i=0;i<8;i++){
    const a=TAU*i/8,x=center[0]+Math.cos(a)*(19+u*25),y=center[1]+Math.sin(a)*(6+u*8);
    oval(f.above,[x,y-Math.sin(Math.PI*u)*(7+i%4)],2+i%3,2+i%3,water[0],(1-u)*.82,.05,5.4);
  }
}
function spores(f:FxInput) {
  for(const [index,born] of animations.tech_spores.hits!.entries()) {
    const age=f.t-born;
    if(age<0||age>=.66) continue;
    const source=f.pointAt(born,'mouth'),u=age/.66,fall=progress(u,.08,.62);
    const alpha=(1-progress(u,.52,1))*(1-progress(f.t,1.79,1.98));
    for(let i=0;i<12;i++) {
      const a=TAU*hash(i,63+index),spread=6+u*25;
      const x=source[0]+u*(35+7*index)+Math.cos(a)*spread;
      const ground=f.feet[1]+6+Math.sin(a)*spread*.42;
      const y=lerp(source[1],ground-4,fall)+Math.sin(a)*spread*.22;
      const r=2+6*Math.sin(Math.PI*u)*(.5+hash(i,66));
      ellFill(f.under,[x,ground],r+3,r*.38,green[2],alpha*.53);
      ellFill(f.above,[x,y],r+1,r*.7,green[(i+index)%3+1],alpha*.53);
      if((Math.floor(u*7)+i)%4<2) { f.above.col(green[0],alpha);f.above.dot(x-1,y-r*.65,1+i%2,1); }
    }
  }
}
export function effects(f:FxInput) {
  if(f.anim==='tech_croak') croak(f);
  else if(f.anim==='tech_tongue') tongue(f);
  else if(f.anim==='tech_staff') staff(f);
  else if(f.anim==='tech_leap') leap(f);
  else if(f.anim==='tech_spores') spores(f);
  else if(f.anim==='phase') {
    const u=progress(f.t,.51,1.95);
    if(u>0&&u<1) {
      ellFill(f.under,f.feet,20+u*21,4+u*4,green[2],Math.sin(Math.PI*u)*.62);
      for(let i=0;i<13;i++) {
        const pt=f.points.staffTip,a=i*2.40+u;
        flare(f.above,pt[0]+Math.cos(a)*(3+u*13),pt[1]+Math.sin(a)*(3+u*19),i%4===0?3:1,green[i%3],Math.sin(Math.PI*u));
      }
    }
  } else if(f.anim==='hatch'||f.anim==='back') {
    const hit=f.anim==='hatch'?.94:1.19;
    if(f.t>=hit)drops(f,f.pointAt(hit,'staffFoot'),f.t-hit,416,8,.28);
  } else if(f.anim==='happy') {
    const u=progress(f.t,.30,.93);
    if(u>0&&u<1)flare(f.above,...f.points.staffTip,2+4*Math.sin(u*Math.PI),green[0],Math.sin(u*Math.PI));
  }
  if(f.anim.startsWith('tech_')) settle(f);
}
