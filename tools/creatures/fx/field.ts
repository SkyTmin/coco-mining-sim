// Native-pixel tracks on the tilted floor. All positions are inside the painting's opening.
import { hash,TAU,clamp01,lerp } from '../kit/f11-mobkit';
import { fillPoly,fly,type Pen } from './pen';
import type { FxInput,XY } from '../types';

export const progress=(t:number,start:number,end:number)=>clamp01((t-start)/(end-start));
export function oval(p:Pen,pt:XY,rx:number,ry:number,color:string,alpha:number,start=0,end=TAU) {
  if(alpha<=0 || rx<.1 || ry<.1) return;
  const steps=Math.max(6,Math.ceil(Math.max(rx,ry)*(end-start)*.45));
  p.col(color,alpha);
  let x=Math.round(pt[0]+rx*Math.cos(start)), y=Math.round(pt[1]+ry*Math.sin(start));
  for(let i=1;i<=steps;i++) {
    const a=lerp(start,end,i/steps), nx=Math.round(pt[0]+rx*Math.cos(a)),ny=Math.round(pt[1]+ry*Math.sin(a));
    p.line(x,y,nx,ny); x=nx;y=ny;
  }
}
// A short ribbon sampled from the real tip after engine transforms. The old edge
// tapers and the leading line catches light. The perpendicular follows each segment.
export function pathSmear(f:FxInput,socket:string,start:number,end:number,width:number,ink:string,body:string,edge:string) {
  if(f.t<start||f.t>end+.075) return;
  const current=Math.min(f.t,end), first=Math.max(start,current-.14), pts:XY[]=[];
  for(let i=0;i<=3;i++) pts.push(f.pointAt(lerp(first,current,i/3),socket));
  const side:XY[]=pts.map(([x,y],i)=>{
    const [a,b]=pts[Math.min(3,i+1)], [c,d]=pts[Math.max(0,i-1)], length=Math.hypot(a-c,b-d)||1;
    return [x-(b-d)/length*width*(i/3),y+(a-c)/length*width*(i/3)];
  });
  const alpha=1-progress(f.t,end,end+.075);
  f.above.col(ink,alpha*.9);
  fillPoly(f.above,[...pts,...side.slice().reverse()].flat());
  f.above.col(body,alpha);
  fillPoly(f.above,[...pts,...side.slice().reverse().map(([x,y],i)=>[lerp(x,pts[3-i][0],.26),lerp(y,pts[3-i][1],.26)])].flat());
  f.above.col(edge,alpha);
  for(let i=2;i<=3;i++) f.above.line(...pts[i-1],...pts[i]);
}

export function ellFill(p:Pen,pt:XY,rx:number,ry:number,col:string,alpha:number) {
  if(alpha<=0||rx<.1||ry<.1) return;
  p.col(col,alpha);
  for(let y=Math.ceil(pt[1]-ry);y<=Math.floor(pt[1]+ry);y++) {
    const xr=rx*Math.sqrt(Math.max(0,1-((y-pt[1])/ry)**2));
    const x=Math.ceil(pt[0]-xr), end=Math.floor(pt[0]+xr);
    if(end>=x) p.span(x,y,end-x+1);
  }
}
export function shard(p:Pen,x:number,y:number,dx:number,dy:number,width:number,lit:string,shade:string,alpha=1) {
  const len=Math.hypot(dx,dy)||1, nx=-dy/len*width,ny=dx/len*width;
  const baseX=x-dx*.5,baseY=y-dy*.5;
  p.col(shade,alpha); fillPoly(p,[x+dx,y+dy,x+nx,y+ny,baseX,baseY,x-nx,y-ny]);
  p.col(lit,alpha); fillPoly(p,[x+dx,y+dy,x-nx,y-ny,baseX,baseY]);
}
export function scatter(f:FxInput,at:XY,age:number,seed:number,count:number,palette:string[],life:number,paper=false) {
  if(age<0 || age>life) return;
  const fade=1-progress(age,life*.67,life);
  for(let i=0;i<count;i++) {
    const a=TAU*hash(i,seed,3), v=19+44*hash(i,seed,4), ballistic=fly(age,31+55*hash(i,seed,5),270);
    const x=at[0]+Math.cos(a)*v*ballistic.h, ground=at[1]+Math.sin(a)*v*ballistic.h*.43;
    const y=ground-ballistic.z;
    ellFill(f.under,[x,ground],2.2,1,'#20212d',fade*.40);
    const rot=a+age*(i%2?8:-6), dx=2.8*Math.cos(rot), dy=(paper?1.5:3.8)*Math.sin(rot);
    if(ballistic.air) shard(f.above,x,y,dx,dy,1.8,palette[i%palette.length],palette[(i+1)%palette.length],fade);
    else { f.under.col(palette[i%palette.length],fade*.76); f.under.line(x-2,ground,x+2,ground-1); }
  }
}

// The last displayed GIF sample is one tick before the nominal duration.
// Let the last scraps and vapour settle completely on that sample.
export function settle(f:FxInput) {
  const last=(Math.round(f.duration*24)-1)/24;
  const alpha=1-progress(f.t,last-.10,last);
  if(alpha===1) return;
  for(const p of [f.under,f.above]) {
    const g=p.g;
    if(alpha<=0) {g.clearRect(0,0,f.w,f.h);continue;}
    g.save();
    g.globalCompositeOperation='destination-in';
    g.globalAlpha=alpha;
    g.fillStyle='#ffffff';
    g.fillRect(0,0,f.w,f.h);
    g.restore();
  }
}
