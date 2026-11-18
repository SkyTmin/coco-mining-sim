import { paintImpact, paintSocketTrail } from '../technique-fx';
import { trk,TAU,hash,lerp,sstep } from '../kit/f11-mobkit';
import { flare,fly,fillPoly,type Pen } from '../fx/pen';
import { oval,ellFill,progress,settle } from '../fx/field';
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
export function props(f:FxInput) {
  if (f.anim==='tech_tongue'){
    const hit=13/24,age=f.t-hit;
  const contact=f.pointAt(hit,'tongueTip');
  if(f.t>.09 && age<.37) {
    ellFill(f.under,[contact[0],contact[1]+2],7,2.8,'#435b57',.96);
    oval(f.under,[contact[0],contact[1]+2],6.5,2.4,'#91a999',.88,-2.9,-.15);
    f.under.col('#a6bcaa',.68);f.under.line(contact[0]-3,contact[1]+1,contact[0],contact[1]);
  }
  } else if(f.anim==='tech_staff') {
    const hit=20/24,age=f.t-hit,foot=f.pointAt(hit,'staffFoot');
  // Wet peat rises slightly above the floor. Its crest is the receiver of the heel.
  if(f.t>.10 && age<.42) {
    const sink=age<0?0:2*Math.min(1,age*12);
    ellFill(f.under,[foot[0],foot[1]+3+sink],8,3,'#394b40',.88);
    oval(f.under,[foot[0],foot[1]+3+sink],7,3,'#88965b',.82,-3.12,-.1);
  }
  }
}
function croak(f:FxInput) {
  const hit=26/24,age=f.t-hit;
  if (f.t>=23/24 && f.t<=hit+1/24) paintSocketTrail(f,'above','mouth',23/24,hit,{color:'#a9ca93',width:2,alpha:.72});
  const charge=progress(f.t,.15,.99), glow=charge*(1-progress(f.t,1.10,1.38));
  if(glow>0) {const lamp=f.points.staffTip;flare(f.above,...lamp,2+glow*5,green[0],glow);}
  if(age<0)return;
  const origin=f.pointAt(hit,'mouth'),floor:XY=[origin[0],f.feet[1]+4];
  if(age<.17) paintImpact(f,'above','mouth',origin,(pen,x,y)=>{
    ellFill(pen,[x,y],1+age*18,1+age*25,'#e6eeb0',1-age/.17);
    oval(pen,[x+age*45,y],1+age*25,1+age*49,'#a9cf9e',1-age/.17);
  });
  for(let i=0;i<3;i++) {
    const wave=progress(age,i*.10,.71+i*.07),u=1-(1-wave)**2;
    if(u<=0||u>=1) continue;
    oval(f.above,[origin[0]+u*24,origin[1]],3+u*17,5+u*25,green[0],(1-u)*.88,-1.26,4.80);
    // A reflected crest gives each sound pulse two ripples on the dark water.
    const rx=7+u*66,ry=2+u*17,alpha=1-progress(u,.73,1);
    oval(f.under,floor,rx,ry,'#608b87',alpha);
    oval(f.under,[floor[0],floor[1]+1],rx,ry,'#dce5af',alpha);
    oval(f.under,[floor[0],floor[1]+2],rx-1,ry,'#a3d7b4',alpha,.05,2.94);
  }
  for(let i=0;i<12;i++) {
    const a=TAU*i/12, x=floor[0]+Math.cos(a)*53,y=floor[1]+Math.sin(a)*15;
    const size=trk(age,[[0,0],[.15+i*.008,.1],[.34+i*.006,.9],[.52,.83],[.83,0]]);
    mushroom(f.under,x,y,size*(.56+.4*hash(i,454)),green[i%3]);
  }
}
function tongue(f:FxInput) {
  const hit=13/24,age=f.t-hit;
  if(f.t>=10/24 && age<.06) paintSocketTrail(f,'under','tongueTip',10/24,hit,{color:'#e9a3a0',width:2});
  if(age<0)return;
  const pt=f.pointAt(hit,'tongueTip'),u=progress(age,0,.40),fade=1-progress(age,.18,.42);
  for(let i=0;i<8;i++) {
    const a=i*TAU/8, r=(2+8*Math.sin(u*Math.PI*.7))*(.72+.45*hash(i,75));
    ellFill(f.under,[pt[0]+Math.cos(a)*r,pt[1]+Math.sin(a)*r*.39],3+i%3,1+i%2,'#789578',fade);
  }
  // The tongue parts the skin of the pool; a crescent of foam runs ahead of the tip.
  const foam=1-progress(age,.28,.34);
  oval(f.under,pt,5+21*u,2+6*u,'#7ba99e',foam);
  for(const offset of [-1,0,1]) {
    oval(f.under,[pt[0],pt[1]+offset],7+27*u,2+7*u,'#d0e0b3',foam,-1.3,2.96);
  }
  oval(f.under,[pt[0],pt[1]+1],5+21*u,2+6*u,'#e2e3b3',foam,-1.22,2.95);
  oval(f.under,[pt[0],pt[1]+2],4+18*u,2+5*u,'#c3d8a8',foam,-.72,2.69);
  if(age<.16) paintImpact(f,'above','tongueTip',pt,(p,x,y)=>{
    ellFill(p,[x,y],2+age*14,1.3,'#e8d3a9',1-age/.16);
  });
  drops(f,pt,age,341,14,.42);
}
function staff(f:FxInput) {
  const hit=20/24, age=f.t-hit;
  const foot=f.pointAt(hit,'staffFoot');
  const glow=progress(f.t,.08,.54)*(1-progress(f.t,.64,hit));
  if(glow>0) ellFill(f.above,f.points.staffTip,3.2,1.6,'#ffe499',.66*glow);
  if(f.t>=17/24 && age<.075)
    paintSocketTrail(f,'above','staffFoot',17/24,hit,{color:'#c7d099',width:2});
  if(age<0 || age>.52)return;
  const u=progress(age,0,.52),fade=1-progress(age,.30,.52);
  paintImpact(f,'under','staffFoot',foot,(p,x,y)=>{
    ellFill(p,[x,y],2+u*6,1+u*1.4,'#363e34',fade);
    p.col('#dbe29b',fade);p.line(x,y,x-1-u*6,y-u);
    for(let i=0;i<9;i++){
      const a=TAU*i/9+.32,ray=(7+2*Math.cos(i*3))*Math.min(1,u*3.7);
      const mid:XY=[x+ray*Math.cos(a),y+ray*.42*Math.sin(a)];
      p.col(i%2?'#8dba86':'#d1d797',fade);
      p.line(x,y,...mid);
      if(u>.11) {
        const end=(u-.11)*29;
        p.line(...mid,mid[0]+end*Math.cos(a+.47),mid[1]+end*.38*Math.sin(a+.47));
      }
    }
  });
  // The near rim covers the submerged end. The light tuft starts at the divot,
  // splits above it and leaves two dark crumbs beside the pale roots.
  if(age<.23) paintImpact(f,'above','staffFoot',foot,(p,x,y)=>{
    const v=age/.23,alpha=1-v*v;
    const rise=3+8*Math.sin(Math.PI*v);
    p.col('#493e39',alpha);p.line(x-4,y+1,x+5,y+1);
    p.col('#f2df91',alpha);p.line(x-3,y,x+3,y);p.dot(x-1,y-1,3,1);
    for(const side of [-1,1]) {
      const dx=side*(2+8*v),dy=rise*(side<0?.8:1);
      p.col(side<0?'#b3cd88':'#f0df9a',alpha);
      p.line(x+side,y-1,x+dx,y-dy);
      p.col('#ffffc5',alpha);p.dot(x+dx,y-dy,2,1);
      p.col('#725240',alpha);p.dot(x+side*(4+7*v),y+1-v*3,2,2);
    }
  });
  // Spores and peat issue from the floor divot, even after the staff rebounds.
  for(let i=0;i<19;i++){
    const theta=TAU*hash(i,32),spread=u*(11+17*hash(i,231));
    const x=foot[0]+Math.cos(theta)*spread, y=foot[1]+Math.sin(theta)*spread*.34
      -Math.sin(u*Math.PI)*(6+14*hash(i,83));
    f.above.col(green[i%3],fade);f.above.dot(x,y,i%4===0?2:1,1);
  }

}
function fillCrown(pen:Pen,x:number,y:number,direction:number,rim:number,height:number) {
  const at=(d:number)=>x+direction*rim*d;
  fillPoly(pen,[x,y,at(.40),y-2,at(.65),y-height,at(.78),y-3,at(1),y-height*.48,at(.92),y+1]);
  pen.col('#83c1bd');pen.line(at(.18),y,at(.66),y-height+1);pen.line(at(.67),y-height+2,at(.79),y-2);
  pen.col('#e1eff0');pen.dot(at(.66),y-height,2,2);pen.dot(at(.98),y-height*.48,2,1);
}
function leap(f:FxInput) {
  const hit=27/24,age=f.t-hit;
  if(f.t>=24/24 && age<.05) paintSocketTrail(f,'above','footR',24/24,hit,{color:'#b6c69b',width:2,alpha:.85});
  if(age<0) {
    const a=f.pointAt(hit,'footL'),b=f.pointAt(hit,'footR');
    const target:XY=[(a[0]+b[0])/2,(a[1]+b[1])/2],u=progress(f.t,.44,hit);
    if(u>0) {ellFill(f.under,target,13+u*17,2.6+u*4,'#243a40',.18+u*.22);oval(f.under,target,13+u*17,3+u*4,water[1],u*.45);}
    return;
  }
  const left=f.pointAt(hit,'footL'),right=f.pointAt(hit,'footR');
  const center:XY=[(left[0]+right[0])/2,(left[1]+right[1])/2];
  const u=progress(age,0,.56),fade=1-progress(u,.55,1);
  for(const [i,pt] of [left,right].entries()) {
    const outward=pt[0]<center[0]?-1:1;
    if(age<.17) paintImpact(f,'above',i?'footR':'footL',pt,(pen,x,y)=>{
      const v=age/.17, rim=5+v*12;
      const crest=3+Math.sin(Math.PI*v)*7;
      pen.col('#385e67',1-v*.65);fillCrown(pen,x,y,outward,rim,crest);
      pen.col('#405e65',1-v);pen.line(x,y+1,x+outward*rim,y+2-v*3);
      pen.col('#e7eeaa',1-v);pen.line(x,y,x+outward*rim,y-v*3);
    });
    // Far and near rims issue from the same toes. Only the outside spray crosses the figure layer.
    oval(f.under,pt,1+u*43,1+u*12,'#38575b',fade);
    oval(f.under,[pt[0],pt[1]+1],1+u*43,1+u*12,'#bbd5ab',fade*.9);
    for(let j=0;j<6;j++) {
      const flight=.24+.035*j,v=Math.min(1,age/flight);
      const run=(14+j*4.6)*v, x=pt[0]+outward*run,y=pt[1]+j*.58*v-4*v*(1-v)*(7+j*1.9);
      if(age<flight && age>0) {
        const tail=3*(1-v);
        f.above.col('#3f6368',fade);f.above.line(x-outward*tail,y+2,x,y-1);
        f.above.col(j%2?'#91d6d5':'#e5f5ee',fade);f.above.dot(x,y-1,j%3===1?3:2,2);
      } else if(age>=flight) {
        const r=(age-flight)*28;oval(f.under,[x,y],1+r,1+r*.34,'#aacba3',fade);
      }
    }
  }
  if(u>.11) {
    const spread=(u-.11)/.89,rx=Math.abs(right[0]-left[0])*.5+spread*29;
    oval(f.under,center,rx,4+spread*20,'#86b5a1',fade*.88,.04,3.10);
    oval(f.under,[center[0],center[1]+2],rx*.97,4+spread*19,'#d7e0ad',fade*.70,.20,2.93);
  }
}
function spores(f:FxInput) {
  const first=24/24;
  if(f.t>=21/24&&f.t<=first+1/24) paintSocketTrail(f,'above','mouth',21/24,first,{color:'#c5d28b',alpha:.74});
  for(const [index,born] of f.hits.entries()) {
    const age=f.t-born;
    if(age<0||age>=.66) continue;
    const source=f.pointAt(born,'mouth'),u=age/.66,fall=progress(u,.08,.62);
    if(age<.14) paintImpact(f,'above','mouth',source,(pen,x,y)=>{
      ellFill(pen,[x,y],1.5+age*18,1+age*10,green[index%3],1-age/.14);
    });
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
    const age=f.t-27/24;
    if(age>=0 && age<.42) paintImpact(f,'under','staffFoot',f.pointAt(27/24,'staffFoot'),(p,x,y)=>{
      ellFill(p,[x,y],2+age*8,1+age*3,'#cbd87d',1-age/.42);
      oval(p,[x,y],2+age*24,1+age*8,'#a9c77d',1-age/.42);
    });
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
