import { hx,mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';
import {face,type Point} from '../scenes/relief';

const black=hx('#261824'), root=hx('#68404b'), blush=hx('#b06b72'), gold=hx('#d69a87');
const pink=hx('#ff4f7b'), ruby=hx('#902744'), shine=hx('#ffaeb2');

function stone(p:Px,x:number,y:number,r:number,pulse:number) {
  const shape:Point[]=[[x-r,y-1],[x-3,y-r],[x+1,y-r-1],[x+r,y-2],[x+r-1,y+3],[x,y+r],[x-4,y+3]];
  face(p,shape,black);
  face(p,shape.map(([a,b])=>[x+(a-x)*.82,y+(b-y)*.82]),mixc(ruby,pink,pulse*.5));
  face(p,[[x-4,y-1],[x-1,y-4],[x+1,y-3],[x,y+1]],mixc(pink,shine,pulse*.7));
  p.line(x-3,y+3,x,y+4,ruby); p.set(x-2,y-3,shine);
}
const mythic:Border={
  wood:['#33222e','#693e4a','#9c6069','#ce9093'],accent:'#ff4f7b',
  decorate(p,b,t){
    // Every segment is a paired hooked leaf with a narrow vein between the curls.
    function rail(length:number,at:(u:number,v:number)=>Point) {
      for(let u=b+2;u<length-b-11;u+=14) {
        const pts:Point[]=[[u,9],[u+3,6],[u+9,5],[u+6,8],[u+11,9],[u+13,11],[u+7,12],[u+3,11]];
        face(p,pts.map(([a,c])=>at(a,c)),black);
        p.line(...at(u+1,9),...at(u+7,6),blush);
        p.line(...at(u+4,10),...at(u+9,10),root);
        const phase=((u/length-t/3)%1+1)%1;
        if(phase<.11) p.line(...at(u+3,8),...at(u+6,7),mixc(blush,shine,1-phase/.11));
      }
    }
    rail(p.w,(u,v)=>[u,v]);rail(p.w,(u,v)=>[p.w-1-u,p.h-1-v]);
    rail(p.h,(u,v)=>[v,p.h-1-u]);rail(p.h,(u,v)=>[p.w-1-v,u]);
    const pulse=(1+Math.sin(t*Math.PI*2/3))/2, m=Math.floor(b/2);
    for(const x of [m,p.w-1-m]) for(const y of [m,p.h-1-m]) {
      const sx=x>p.w/2?-1:1,sy=y>p.h/2?-1:1;
      for(const k of [0,1]) {
        const at=(u:number,v:number):Point=>[x+sx*(k?v:u),y+sy*(k?u:v)];
        face(p,[at(2,3),at(6,6),at(15,5),at(10,2),at(7,1)],root);
        p.line(...at(3,3),...at(12,4),blush);p.set(...at(9,3),gold);
      }
      stone(p,x,y,6,pulse);
      const q=(t/3+(sx>0?.41:0)+(sy>0?.25:0))%1;
      if(q<.48) p.set(x+sx*Math.round(4+16*q),y-sy*Math.round(3+7*q),mixc(shine,ruby,q));
    }
    const x=p.w>>1;
    face(p,[[x-22,12],[x-16,5],[x-10,9],[x-5,4],[x,0],[x+7,7],[x+15,5],[x+22,12],[x+9,14],[x,17],[x-9,14]],black);
    p.line(x-19,11,x-15,7,blush);p.line(x+9,10,x+15,7,blush);
    stone(p,x,8,6,pulse);
  }
};
export default mythic;
