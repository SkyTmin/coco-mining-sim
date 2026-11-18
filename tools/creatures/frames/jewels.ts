// Pixel-cut stones and chased metal. Gem settings are fixed-size corner pieces.
import { hx } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';

export function jewel(p:Px,x:number,y:number,r:number,colors:string[],mount:string){
  const [dark,body,facet,light]=colors.map(v=>hx(v));
  for(let dy=-r-1;dy<=r+1;dy++) for(let dx=-r-1;dx<=r+1;dx++){
    const d=Math.abs(dx)+Math.abs(dy);
    if(d>r+1) continue;
    let color=d===r+1?hx(mount):dy>r/2||dx>r/2?dark:dx<0&&dy<=0?light:dy<1?facet:body;
    if(d===r+1 && (dy>0 || dx>0)) color=hx('#382b30');
    p.set(x+dx,y+dy,color);
  }
  p.line(x-r,y,x-1,y-r+1,light);
}

export function glint(p:Px,x:number,y:number,t:number,at:number){
  const age=(t-at+3)%3;
  if(age>.19)return;
  const r=age<.07?1:age<.13?3:2, color=hx('#ffefd1');
  p.line(x-r,y,x+r,y,color);
  p.line(x,y-r,x,y+r,color);
}

// Stamp the ornament along all four bevels in their local rail coordinates.
export function chase(p:Px,b:number,step:number,paint:(set:(u:number,v:number,c:string)=>void)=>void){
  for(const vertical of [false,true]){
    const length=vertical?p.h:p.w;
    for(const far of [false,true]) for(let o=b+4;o<length-b-step;o+=step){
      paint((u,v,c)=>{
        const axis=far?(vertical?p.w:p.h)-1-v:v;
        p.set(vertical?axis:o+u,vertical?o+u:axis,hx(c));
      });
    }
  }
}
