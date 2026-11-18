import { trk,lerp,TAU,hash } from '../kit/f11-mobkit';
import { disc,fillPoly,starBranches,crackOf,drawCrack,flare } from '../fx/pen';
import { oval,ellFill,pathSmear,progress,scatter,shard,settle } from '../fx/field';
import type { Animation,BodyFrame,FxInput,XY } from '../types';
import type { FrostPose } from './frost_yeti';

export const animations:Record<string,Animation>={
  tech_snowball:{seconds:2.4,hits:[1.70],stop:.07,shake:.25},
  tech_slam:{seconds:1.3,hits:[.80],stop:.06,shake:.35},
  tech_icicles:{seconds:2,hits:[1.2,1.3,1.4,1.5,1.6],shake:.08},tech_roar:{seconds:1.6,hits:[1.18]}
};
export function pose(anim:string,t:number):FrostPose {
  if(anim.startsWith('tech_') && t>=(Math.round(animations[anim].seconds*24)-1)/24) return {};
  if(anim==='tech_snowball') {
    const swing=trk(t,[[0,0],[.24,-.72],[.68,-.90],[.91,-.77],[1.29,1.45],[1.53,1.48],[1.70,-.59],[1.88,-.93],[2.10,.29],[2.34,0]]);
    return {clubAngle:swing,clubForward:trk(t,[[0,0],[.24,2],[.82,6],[1.30,-4],[1.7,5],[1.97,0]]),
      crouch:trk(t,[[0,0],[.32,8],[.91,10],[1.3,-3],[1.7,5],[1.90,6],[2.2,0]]),jaw:trk(t,[[0,0],[1.92,0],[2.12,.83],[2.34,0]])};
  }
  if(anim==='tech_slam') return {
    clubAngle:trk(t,[[0,0],[.50,1.63],[.64,1.68],[.80,-1.26],[.90,-1.28],[1.11,-.45],[1.26,0]]),
    clubForward:trk(t,[[0,0],[.51,-4],[.8,5],[1.26,0]]),clubLift:trk(t,[[0,0],[.55,6],[.8,-1],[1.26,0]]),
    crouch:trk(t,[[0,0],[.21,3],[.53,-5],[.8,5],[.92,9],[1.26,0]])};
  if(anim==='tech_icicles') return {
    clubAngle:trk(t,[[0,0],[.43,-.43],[.63,.91],[.80,1.28],[.9,-.20],[1.12,-.42],[1.42,.15],[1.88,0]]),
    chestBeat:trk(t,[[0,0],[.28,.9],[.54,.8],[.66,0]]),headTurn:trk(t,[[0,0],[.38,-.27],[.74,.24],[1.32,0]])};
  if(anim==='tech_roar'||anim==='happy') {
    const k=anim==='happy'?t*1.48:t;
    return {chestBeat:trk(k,[[0,0],[.21,0],[.35,1],[.50,.12],[.63,.08],[.75,1],[.90,.19],[1.14,.56],[1.53,0]]),
      jaw:trk(k,[[0,0],[.84,.15],[1.11,.27],[1.18,1],[1.37,.95],[1.55,0]]),
      crouch:trk(k,[[0,0],[.35,4],[.58,0],[.75,4],[1.11,-3],[1.34,4],[1.55,0]])};
  }
  if(anim==='hatch') return {clubAngle:trk(t,[[0,-.65],[.46,-.68],[.86,1.14],[1.13,.89],[1.45,0]]),jaw:trk(t,[[0,0],[.68,0],[.94,.99],[1.32,0]])};
  if(anim==='tired') return {jaw:.61*Math.sin(Math.PI*t/1.5)**2,clubAngle:.44*Math.sin(Math.PI*t/1.5)**2};
  return {};
}
export function presentation(anim:string,t:number):Partial<BodyFrame> {
  if(anim==='tech_roar') return {flash:0};
  if(anim==='tech_slam') {
    const press=trk(t,[[0,0],[.52,-.34],[.79,0],[.85,1],[1.05,.5],[1.26,0]]);
    return {sx:1+.045*press,sy:1-.065*press};
  }
  if(anim==='tech_snowball') return {dx:trk(t,[[0,0],[.90,6],[1.40,-5],[1.7,5],[1.95,3],[2.34,0]])};
  return {};
}
const ice=['#eefcfc','#a3d4e4','#6293b3','#cbe6ed'];
function fracture(f:FxInput,pt:XY,age:number,r:number,seed:number,life:number) {
  if(age<0||age>=life) return;
  const c=crackOf('frost-yeti-'+seed,seed,starBranches(seed,7,.14,r*.55,r,2),.38,.19);
  drawCrack(f.under,c,...pt,progress(age,0,.12)*c.max,'#2e3e58','#def0ec',1-progress(age,life*.48,life));
}
function breath(f:FxInput,born:number,life=.48,distance=25,size=1) {
  const age=f.t-born;
  if(age<0||age>=life)return;
  const pt=f.pointAt(born,'mouth'),u=age/life;
  for(let i=0;i<4;i++) {
    const x=pt[0]+u*distance+i*2, y=pt[1]-u*11+Math.sin(i*2+.5)*3;
    ellFill(f.above,[x,y],(2+u*(4+i))*size,(1.5+u*(3+i*.5))*size,ice[i],.52*(1-u));
  }
}
function snowball(f:FxInput) {
  const {t,under,above,feet}=f,contact=1.7,end=2.08;
  const rolling:XY=[feet[0]+35+11*progress(t,0,.99),feet[1]+4];
  const tip=t>=contact?f.pointAt(contact,'clubTip'):f.points.clubTip;
  const launch:XY=[tip[0]+4,Math.min(feet[1]-4,tip[1])];
  const target:XY=[Math.min(f.w-10,feet[0]+83),feet[1]+17];
  const airborne=progress(t,contact,end),x=t<contact?rolling[0]:lerp(launch[0],target[0],airborne);
  const r=2+8*progress(t,.08,.91),y=t<contact?rolling[1]-r:lerp(launch[1],target[1]-4,airborne)-Math.sin(Math.PI*airborne)*17;
  const groove=progress(t,.08,.85)*(1-progress(t,1.84,2.35));
  oval(under,[feet[0]+39,feet[1]+5],10,2,'#769bb2',groove,0,3.7);
  if(t>.09&&t<end) {
    ellFill(under,[x,lerp(rolling[1]+1,target[1]+1,airborne)],r*.92,2.5,'#29394c',.6);
    above.col('#466481');disc(above,x,y,r+1);
    above.col('#a9ceda');disc(above,x,y-1,r);
    above.col('#dcecef');disc(above,x-1.5,y-2,r*.78);
    for(let i=0;i<6;i++) {
      const a=t*5+i*2.1;
      above.col(i%2?'#8fb2c3':'#f2fafa');above.dot(x+.52*r*Math.cos(a),y+.52*r*Math.sin(a),2,1);
    }
  }
  pathSmear(f,'clubTip',1.49,1.75,6,'#496787','#94c6d7','#f5faff');
  if(t>=contact&&t<contact+.17) flare(above,...launch,9*(1-(t-contact)/.17),'#e1f8ff',1);
  if(t>=end) {
    fracture(f,target,t-end,20,435,.31);scatter(f,target,t-end,424,21,ice,.31);
    const u=progress(t,end,2.36);
    for(let i=0;i<6;i++) ellFill(above,[target[0]+Math.sin(i)*u*20,target[1]-u*(5+i)],2+5*u,2+4*u,ice[i%4],.6*(1-u));
  }
}
function slam(f:FxInput) {
  const hit=.80,age=f.t-hit,tip=f.t>=hit?f.pointAt(hit,'clubTip'):null;
  const mark:XY=[f.feet[0]+41,f.feet[1]+8];
  const charge=progress(f.t,.08,.63),fade=1-progress(f.t,.88,1.29);
  if(charge>0) {
    const x=lerp(f.feet[0]+10,mark[0],charge),y=lerp(f.feet[1]+2,mark[1],charge);
    f.under.col('#c9e0e6',charge*fade*.50);fillPoly(f.under,[f.feet[0],f.feet[1]+3,x,y-5*charge,x+5*charge,y,x,y+4*charge]);
  }
  breath(f,.30,.38,12,.75);
  pathSmear(f,'clubTip',.62,.83,9,'#40516a','#79a8c3','#effffd');
  if(age<0||!tip) return;
  fracture(f,tip,age,35,612,.48);scatter(f,tip,age,613,20,ice,.48);
  const u=progress(age,0,.47);oval(f.under,tip,5+37*u,1.5+9*u,'#e2f2eb',(1-u)*.91);
  if(age<.084) flare(f.above,...tip,14*(1-age/.085),'#ffffff',1);
}
function icicles(f:FxInput) {
  const lift=.43,bat=.90;
  if(f.t<lift) return;
  const belt=f.pointAt(lift,'belt'), impact=f.pointAt(bat,'clubTip');
  const targets:XY[]=Array.from({length:5},(_,i)=>[f.feet[0]+26+i*12,f.feet[1]+[13,-2,21,4,16][i]]);
  animations.tech_icicles.hits!.forEach((hit,i)=>{
    const dest=targets[i], age=f.t-hit;
    if(age<0) {
      const a=progress(f.t,lift,bat),b=progress(f.t,bat,hit);
      const x=f.t<bat?lerp(belt[0],impact[0]+(i-2)*2,a):lerp(impact[0]+(i-2)*2,dest[0],b);
      const y=f.t<bat?lerp(belt[1],impact[1],a)-Math.sin(Math.PI*a)*(17+i):lerp(impact[1],dest[1],b)-Math.sin(Math.PI*b)*(20+i*3);
      const spin=f.t<bat?1-a*3+i*.21:-.5+b*2+i*.12;
      ellFill(f.under,[x,lerp(f.feet[1],dest[1],b)],3,1,'#25354c',.57);
      shard(f.above,x,y,6*Math.cos(spin),6*Math.sin(spin),2.3,ice[i%3],ice[2]);
    } else {
      const fade=1-progress(age,.12,.34);
      oval(f.under,dest,4,2,'#2d4258',fade);
      if(age<.1) shard(f.above,dest[0],dest[1]-3,2,-5,2,ice[0],ice[2]);
      else scatter(f,dest,age-.10,888+i,5,ice,.26);
    }
  });
  pathSmear(f,'clubTip',.78,.94,5,'#476b84','#a8ccda','#eef9ff');
}
function roar(f:FxInput) {
  for(const born of [.35,.75,1.18]) {
    const age=f.t-born;
    if(age>=0 && age<.42) {
      const neck=f.pointAt(born,'mouth');
      for(let i=0;i<9;i++) {
        const x=neck[0]-10-hash(i,55)*21+Math.sin(i)*age*11;
        const y=neck[1]-11-hash(i,94)*7+age*age*239;
        const fade=1-progress(age,.27,.42);
        f.above.col('#596f8c',fade);f.above.dot(x,y,3+i%3,2+i%2);
        f.above.col(ice[i%2],fade);f.above.dot(x,y-1,2+i%3,2);
      }
    }
  }
  // Each pulse leaves the jaws once. The bright edges travel past the club
  // head, and the dark underside separates the vapour from the snowy floor.
  for(const born of [1.14,1.24,1.34]) {
    const age=f.t-born;
    if(age<0||age>.44) continue;
    const pt=f.pointAt(born,'mouth'),u=age/.44,center:XY=[pt[0]+u*59,pt[1]-u*9];
    const alpha=(1-progress(u,.67,1))*(1-progress(f.t,1.52,1.60));
    const rx=3+u*10,ry=5+u*20;
    oval(f.above,[center[0]+1,center[1]+1],rx,ry,'#435978',alpha*.88,-1.12,4.38);
    oval(f.above,center,rx,ry,'#d3ecf4',alpha*.93,-1.10,4.4);
    oval(f.above,center,rx+1,ry+1,'#f4feff',alpha,-.95,1.06);
    for(let i=0;i<3;i++){
      const a=-.84+i*.80,x=center[0]+Math.cos(a)*rx,y=center[1]+Math.sin(a)*ry;
      ellFill(f.above,[x,y],2+u*2,1+u*1.8,ice[i%2],alpha*.72);
    }
    oval(f.under,[center[0],f.feet[1]+4],3+u*6,1+u*2,ice[1],.35*alpha);
  }
  breath(f,1.16,.38,37,1.45);
  breath(f,1.29,.29,30,1.16);
}
export function effects(f:FxInput) {
  if(f.anim==='tech_snowball') snowball(f);
  else if(f.anim==='tech_slam') slam(f);
  else if(f.anim==='tech_icicles') icicles(f);
  else if(f.anim==='tech_roar') roar(f);
  else if(f.anim==='tired') {breath(f,.42,.71,23);breath(f,.69,.69,24);}
  else if(f.anim==='hatch') scatter(f,f.feet,f.t-.63,577,18,ice,.66);
  else if(f.anim==='idle'||f.anim==='idle-f2') breath(f,.73,.64,21,.82);
  if(f.anim.startsWith('tech_')) settle(f);
}
