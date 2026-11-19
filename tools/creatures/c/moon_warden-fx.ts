import { oval, progress } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { TAU } from '../kit/f11-mobkit';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

function glint(p: Pen,[x,y]: XY,r: number,alpha=1) {
  if (r<.4 || alpha<=0) return;
  p.lineS(x-r,y,x+r,y,'#74a9cf',alpha);
  p.lineS(x,y-r*1.35,x,y+r*1.35,'#f3d485',alpha);
  p.lineS(x-1,y,x+1,y,'#ffffe5',alpha);
}
function sparks(f: FxInput,at: XY,age: number,life: number,count: number) {
  if (age<0 || age>=life) return;
  const u=age/life;
  for(let i=0;i<count;i++){
    const a=TAU*(i+.35)/count, r=(13+(i%3)*4)*u;
    glint(f.above,[at[0]+Math.cos(a)*r,at[1]+Math.sin(a)*r*.72-4*u+11*u*u],
      (i%2?2.4:1.5)*(1-u*.65),1-progress(u,.55,1));
  }
}
// The crescent is the swept outer portion of the real blade. Its inner edge
// widens over the middle of the swing and tapers to the cutting tip at both ends.
function bladeCrescent(f: FxInput) {
  const end=Math.min(f.t,25/24), start=Math.max(19/24,end-.25);
  const outer: XY[]=[], inner: XY[]=[];
  for(let i=0;i<=8;i++){
    const u=i/8, t=start+(end-start)*u, tip=f.pointAt(t,'weaponTip'), grip=f.pointAt(t,'weaponGrip');
    const width=.22*Math.sin(u*Math.PI);
    outer.push(tip);inner.push([tip[0]+(grip[0]-tip[0])*width,tip[1]+(grip[1]-tip[1])*width]);
  }
  f.above.col('#97acd7',.59*(1-progress(f.t,25/24,29/24)));
  fillPoly(f.above,[...outer,...inner.reverse()].flat());
}
function tide(f: FxInput,age: number,at: XY) {
  const fade=1-progress(age,.53,.83), u=progress(age,0,.62), r=1+36*(1-(1-u)**2);
  paintImpact(f,'above','weaponHeel',at,(p,x,y)=>glint(p,[x,y],4*(1-u),fade));
  paintImpact(f,'under','weaponHeel',at,(p,x,y)=>{
    for(let i=0;i<7;i++){
      const a=TAU*i/7, b=TAU*(i+.84)/7;
      oval(p,[x,y],r,r*.39,'#a3cce0',fade,a,b);
      oval(p,[x,y+1],r*.92,r*.35,'#8272b2',fade*.83,a,b);
      const sx=x+r*Math.cos(a), sy=y+r*.39*Math.sin(a), h=8*Math.sin(u*Math.PI);
      p.lineS(sx,sy,sx,sy-h,'#abc4db',fade*.82);
      glint(p,[sx,sy-h],1.8,fade);
    }
  });
}
export const moonEffects: Creature['effects'] = f => {
  const frame=f.t*24;
  if (f.anim==='tech_crescent' || f.anim==='tech_tide') {
    const cut=f.anim==='tech_crescent', socket=cut?'weaponTip':'weaponHeel';
    const strike=cut?20:23, hit=cut?25:27, age=(frame-hit)/24;
    if(cut && frame>=21 && frame<29) bladeCrescent(f);
    if(cut && frame>=6 && frame<strike)
      paintSocketTrail(f,'above',socket,Math.max(4,frame-4)/24,frame/24,{color:'#a6bfe0',width:1,alpha:.68});
    if(frame>=strike && frame<hit+4)
      paintSocketTrail(f,'above',socket,strike/24,hit/24,{color:'#def0f3',width:2,alpha:1-progress(frame,hit,hit+4)});
    if(age>=0 && age<.83){
      const at=f.pointAt(hit/24,socket);
      if(cut) {
        paintImpact(f,'above',socket,at,(p,x,y)=>glint(p,[x,y],5*(1-progress(age,0,.23))));
        sparks(f,at,age,.54,7);
      } else tide(f,age,at);
    }
    return;
  }
  if(f.anim==='trick') {
    if(frame>=21 && frame<49)
      paintSocketTrail(f,'above','weaponTip',Math.max(21,frame-2)/24,Math.min(48,frame)/24,
        {color:'#a3bdd8',width:1,alpha:.76});
    if(frame>=43 && frame<59){
      const u=progress(frame,43,59), from=f.pointAt(43/24,'weaponTip'), to=f.pointAt(59/24,'earTipR');
      glint(f.above,[from[0]+(to[0]-from[0])*u+10*Math.sin(Math.PI*u),
        from[1]+(to[1]-from[1])*u-13*Math.sin(Math.PI*u)],3.4);
    }
    if(frame>=59 && frame<=76) sparks(f,f.pointAt(59/24,'earTipR'),(frame-59)/24,.72,8);
  } else if(f.anim==='happy' && frame>=27 && frame<40)
    sparks(f,f.pointAt(27/24,'footR'),(frame-27)/24,.55,5);
  else if(f.anim==='hatch' && frame>=17 && frame<30)
    glint(f.above,f.points.weaponTip,4*Math.sin(Math.PI*(frame-17)/13));
};
