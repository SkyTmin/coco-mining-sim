// Cooling basalt terraces, viewed across a collapsed caldera.
import { Px } from '../rig/px';
import { hash,hx,mixc } from '../kit/f11-mobkit';
import {face,type Point} from './relief';
import type {Scene} from '../types';

const sky=hx('#242335'), haze=hx('#594047'), rim=hx('#66505b'), coal=hx('#292631');
const bank=hx('#413640'), cinder=hx('#7b4945'), hot=hx('#ab6751');
function ridge(p:Px, knuckles:Point[], base:number, color:ReturnType<typeof hx>) {
  face(p,[...knuckles,[p.w,base],[0,base]],color);
}
function caldera(w:number,h:number) {
  const p=new Px(w,h), horizon=Math.round(h*.29);
  for(let y=0;y<horizon;y++) p.rect(0,y,w-1,y,mixc(sky,haze,Math.floor(y/horizon*6)/6));
  // Shear faces and ash ledges on the far rim. The central saddle stays soft and low.
  const peaks:Point[]=[[0,32],[10,31],[21,20],[29,19],[42,32],[53,35],[64,43],[78,36],[96,39],[111,44],[136,42],[155,35],[165,33],[178,23],[193,23],[216,46],[232,39],[250,23],[w,25]];
  ridge(p,peaks,horizon+4,hx('#493a47'));
  for(const [x,y] of [[21,20],[178,23],[250,23]]) {
    face(p,[[x,y],[x+8,y],[x+20,y+16],[x+13,y+13],[x+17,y+20]],hx('#35323f'));
    p.line(x-7,y+9,x-1,y+2,hx('#5b454d'));
  }
  ridge(p,[[0,47],[18,48],[33,41],[44,41],[53,52],[72,49],[93,56],[117,53],[140,55],[158,50],[181,50],[207,41],[220,44],[235,35],[w,33]],horizon+6,hx('#35303a'));
  p.rect(0,horizon,w-1,h-1,mixc(coal,bank,.6));
  const slabs=[hx('#49414a'),hx('#484049'),hx('#4e444a'),hx('#483f47')];
  for(let row=0,y=horizon;y<h;row++,y+=12) {
    for(let col=-1,x=(row%2)*14-29;x<w;col++,x+=29) {
      const v=hash(col,row,42), chip=2+Math.round(v*3), dy=Math.round(hash(col,row,89)*2);
      const shade=mixc(slabs[Math.floor(v*3.999)],bank,(1-y/h)*.55);
      face(p,[[x+chip,y+dy],[x+26,y],[x+30,y+3],[x+28,y+11],[x+24,y+12],[x+2,y+12],[x-1,y+8]],shade);
      p.line(x+chip,y+dy,x+22,y,mixc(shade,rim,.5));
      if(v>.43) {
        p.line(x+8,y+5,x+11+Math.round(v*5),y+4,mixc(shade,rim,.32));
        p.set(x+7,y+6,rim);
      }
      if(v>.77) {
        p.line(x+22,y+12,x+19,y+7,coal); p.line(x+19,y+7,x+15,y+8,coal);
      }
    }
  }
  // Split in the upper terrace with a dull, broken line of molten rock.
  const fissure:Point[]=[[w-1,68],[w-17,69],[w-26,73],[w-39,72],[w-55,80],[w-76,80],[w-91,85]];
  for(let i=1;i<fissure.length;i++){
    const [x,y]=fissure[i-1], [u,v]=fissure[i];
    p.line(x,y-1,u,v-1,hx('#684340')); p.line(x,y,u,v,cinder);
    p.line(x,y+2,u,v+2,hx('#302931'));
    if(i%2) p.line(x,y,(x*2+u)/3,(y*2+v)/3,hot);
  }
  // Columnar basalt on opposite sides, individual shafts broken at different heights.
  for(const [x,y,height,width] of [[2,92,30,14],[13,82,18,9],[0,101,27,8],[235,63,21,10],[246,66,29,12],[225,66,13,9]]) {
    const top=y-height;
    face(p,[[x-width/2,top],[x+2,top+2],[x+2,y],[x-width/2,y-3]],hx('#4c404a'));
    face(p,[[x+2,top+2],[x+width/2,top],[x+width/2,y-2],[x+2,y]],hx('#302c37'));
    face(p,[[x-width/2,top],[x-2,top-3],[x+width/2,top-2],[x+width/2,top],[x+2,top+2]],rim);
    p.line(x-2,y-9,x-1,y-6,bank);
  }
  return p;
}
let base:Px|undefined;
const volcano:Scene=(p,t)=>{
  if(!base || p.w!==base.w || p.h!==base.h) base=caldera(p.w,p.h);
  p.data.set(base.data);
  for(let i=0;i<2;i++){
    const q=((t/3+i*.48)%1+1)%1;
    const x=p.w-28-i*10+Math.round(Math.sin(q*6.283)*2), y=71-Math.floor(q*12);
    if(q>.12 && q<.86) p.set(x,y,mixc(bank,hot,Math.sin(q*Math.PI)*.8));
  }
};
export default volcano;
