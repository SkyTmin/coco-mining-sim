import { battingGround } from './frost_yeti-footwork';
import { paintMaterial, paintImpact, paintSocketTrail, projectileAt } from '../technique-fx';
import { trk,lerp,TAU,hash } from '../kit/f11-mobkit';
import { disc,fillPoly,starBranches,crackOf,drawCrack,flare } from '../fx/pen';
import { oval,ellFill,progress,scatter,shard,settle } from '../fx/field';
import type { Animation,BodyFrame,FxInput,XY } from '../types';
import type { FrostPose } from './frost_yeti';

export const animations:Record<string,Animation>={
  tech_snowball: {
    seconds: 58 / 24, hits: [32 / 24], stop: .06, shake: .25,
    groundOffset: battingGround,
  },
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
const gatherFrame = 8, tossFrame = 14, swingFrame = 32, exitFrame = 54;
const sec = (n: number) => n / 24;

function paintSnowball(f: FxInput, centre: XY, radius: number, floor: number) {
  ellFill(f.under, [centre[0], floor], radius + 1, 1.8, '#384861', .49);
  paintMaterial(f, 'above', 'snowball', centre, (p, x, y) => {
    p.col('#456882'); disc(p, x, y, radius);
    p.col('#a3cddc'); disc(p, x, y - 1, radius * .82);
    p.col('#f3f9ef'); disc(p, x - .8, y - 1.4, radius * .56);
    p.col('#78a1b1'); p.dot(x + radius * .45, y + radius * .3, 1, 1);
  }, floor);
}

function gatherAndToss(f: FxInput) {
  if (f.t < sec(gatherFrame) || f.t >= sec(swingFrame)) return;
  if (f.t < sec(tossFrame)) {
    const hand = f.pointAt(f.t, 'handL');
    const ground = f.pointAt(f.t, 'handLGround')[1];
    const u = progress(f.t, sec(gatherFrame), sec(tossFrame));
    paintSnowball(f, [hand[0], hand[1] + 3 * (1 - u)], 1.8 + 2.7 * u, ground);
    return;
  }
  // One soft self-toss. Its apex is at the bat; the second flight starts there.
  const contact = f.pointAt(sec(swingFrame), 'clubTip');
  const release = f.pointAt(sec(tossFrame), 'handL');
  const height = Math.max(0, (release[1] - contact[1]) / 4);
  const u = progress(f.t, sec(tossFrame), sec(swingFrame));
  const centre: XY = [
    lerp(release[0], contact[0], u),
    lerp(release[1], contact[1], u) - 4 * height * u * (1 - u),
  ];
  paintSnowball(f, centre, 4.5, f.pointAt(sec(tossFrame), 'handLGround')[1]);
}

// A dark cobalt edge stays legible against both the fur and the pale sky.
function iceLance(p:FxInput['above'],tip:XY,dx:number,dy:number,width:number,alpha=1) {
  const len=Math.hypot(dx,dy), nx=-dy/len,ny=dx/len;
  const shoulder:XY=[tip[0]-.74*dx,tip[1]-.74*dy],root:XY=[tip[0]-dx,tip[1]-dy];
  const a:XY=[shoulder[0]+width*nx,shoulder[1]+width*ny],b:XY=[shoulder[0]-width*nx,shoulder[1]-width*ny];
  p.col('#233c61',alpha);fillPoly(p,[...tip,...a,...root,...b]);
  p.col('#3299b5',alpha);fillPoly(p,[tip[0]-.17*dx,tip[1]-.17*dy,a[0]-.65*nx,a[1]-.65*ny,...root,...shoulder]);
  p.col('#b5f9fa',alpha);p.line(root[0]+dx*.13,root[1]+dy*.13,tip[0]-.27*dx,tip[1]-.27*dy);
}
export function props(f:FxInput) {
  if(f.anim==='tech_snowball') gatherAndToss(f);
  else if(f.anim==='tech_icicles' && f.t>=14/24 && f.t<24/24) {
    const belt=f.pointAt(14/24,'belt'),tip=f.pointAt(24/24,'clubTip'),u=progress(f.t,14/24,24/24);
    for(let i=0;i<5;i++) {
      const spread=(i-2)*(1-u);
      const x=lerp(belt[0]+i-2,tip[0],u),y=lerp(belt[1],tip[1],u)-Math.sin(Math.PI*u)*(10+i);
      paintMaterial(f,'above','icicle-'+i,[x+spread,y],(p,x,y)=>iceLance(p,[x,y],spread*1.6,8+i%2,2.1));
    }
  }
}
function snowball(f:FxInput) {
  const hit = sec(swingFrame), age = f.t - hit, source = f.pointAt(hit, 'clubTip');
  const exit: XY = [source[0] + 70, source[1] - 13];
  if (f.t >= hit) {
    const centre = projectileAt(f, 'snowball', 'clubTip', hit, sec(exitFrame), exit, 0);
    if (f.t < sec(exitFrame)) paintSnowball(f, centre, 4.5, f.pointAt(hit, 'clubTipGround')[1]);
  }
  if(f.t>=29/24 && age<=.075) paintSocketTrail(f,'above','clubTip',29/24,hit,{color:'#def5f7',width:2});
  if(age>=0 && age<.17)
    paintImpact(f,'above','clubTip',source,(p,x,y)=>{
      ellFill(p,[x,y],1+age*28,1.5,'#fbfcf3',1-age/.17);
      p.col('#c7e5ed',1-age/.17);p.line(x,y,x+4+age*35,y-2-age*13);
    });

}
function slam(f:FxInput) {
  const hit=19/24,age=f.t-hit,pt=f.pointAt(hit,'clubTip');
  const shadow=progress(f.t,.13,.57)*(1-progress(f.t,hit,1.29));
  if(shadow>0) ellFill(f.under,[pt[0]-1,pt[1]+1],10,2,'#607a91',shadow*.39);
  breath(f,.24,.33,12,.69);
  if(f.t>=16/24&&age<.07) paintSocketTrail(f,'above','clubTip',16/24,hit,{color:'#d8f2f5',width:2});
  if(age<0||age>.48)return;
  paintImpact(f,'under','clubTip',pt,(p,x,y)=>{
    ellFill(p,[x,y],2+8*progress(age,0,.12),2+age*3,'#3b4f68',1-progress(age,.28,.48));
    p.col('#e6f3ef',1-progress(age,.18,.45));p.line(x,y,x-3-age*23,y-1-age*5);
  });
  fracture(f,pt,age,38,612,.49);scatter(f,pt,age,613,21,ice,.48);
  const u=progress(age,0,.47);oval(f.under,pt,2+36*u,1.5+8*u,'#dce9e4',(1-u)*.89);
}
function icicles(f:FxInput) {
  const toss=14/24,bat=24/24,age=f.t-bat;
  if(f.t<toss)return;
  const belt=f.pointAt(toss,'belt'),impact=f.pointAt(bat,'clubTip');
  if(f.t>=21/24&&age<.06) paintSocketTrail(f,'above','clubTip',21/24,bat,{color:'#d7edf1',width:2});
  if(age>=0 && age<.12) paintImpact(f,'above','clubTip',impact,(p,x,y)=>{
    p.col('#fff9e9',1-age/.12);p.line(x-2,y+2,x+2+age*40,y-2-age*14);p.dot(x,y,2,1);
  });
  for(let i=0;i<5;i++) {
    const land=(30+i*2)/24,born=f.t-land,id='icicle-'+i;
    // The club bats the bundle towards the clear snow, past the actor's feet.
    const direction=impact[0]>=f.feet[0]?1:-1;
    const room=direction>0?f.w-7-impact[0]:impact[0]-7;
    const reach=Math.max(0,Math.min(83,room)), side=direction*(.28+.17*i)*reach;
    const dest:XY=[impact[0]+side,Math.min(f.h-8,f.feet[1]+[12,-1,18,4,12][i])];
    const arc=10+i*4.5;
    const end=projectileAt(f,id,'clubTip',bat,land,dest,arc);
    if(age<0) continue;
    if(born<0) {
      const v=progress(f.t,bat,land);
      const x=end[0],y=end[1];
      const vy=dest[1]-impact[1]-4*arc*(1-2*v), speed=Math.hypot(side,vy)||1;
      ellFill(f.under,[x,dest[1]],3,1,'#293b50',.58);
      paintMaterial(f,'above',id,[x,y],(p,x,y)=>iceLance(p,[x,y],12*side/speed,12*vy/speed,2.8));
    } else if(born<.32) {
      const fade=1-progress(born,.13,.31);
      paintImpact(f,'under',id,dest,(p,x,y)=>{
        ellFill(p,[x,y],2.5,1.2,'#3d526a',fade);p.col('#deeef0',fade);p.line(x,y,x+2+born*12,y+born*4);
      });
      const sunk=progress(born,.07,.28);
      paintMaterial(f,'above',id,dest,(p,x,y)=>iceLance(p,[x,y],direction*3,10-6*sunk,2.3,fade),dest[1]);
      if(born>.045)scatter(f,dest,born-.045,888+i,4,['#81e2ea','#467aab','#efffff'],.20);
    }
  }
}
function roar(f:FxInput) {
  const hit=22/24;
  if(f.t>=19/24&&f.t<hit+.08)paintSocketTrail(f,'above','mouth',19/24,hit,{color:'#c3d5df',width:2,alpha:.76});
  if(f.t>=hit && f.t<hit+.17) paintImpact(f,'above','mouth',f.pointAt(hit,'mouth'),(p,x,y)=>{
    const u=(f.t-hit)/.17;ellFill(p,[x,y],2+u*4,1.2+u*3,'#dde9e7',1-u);
  });
  for(const born of [7/24,13/24,hit]) {
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
  for(const born of [hit,hit+.12,hit+.24]) {
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
  breath(f,hit,.38,37,1.45);
  breath(f,hit+.12,.29,30,1.16);
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
