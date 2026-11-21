// Scan-converted silhouettes for the forest and grotto sets, in native picture pixels.
import { fill2, hash, mixc } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { RGBA } from '../rig/f15-rig';
export type Point = [number, number];

export function face(p: Px, vertices: Point[], color: RGBA) {
  fill2(p,vertices,()=>color);
}

export function ledges(p:Px, horizon:number, low:RGBA, high:RGBA, rim:RGBA, seed:number) {
  const rowH=12, colW=26;
  for (let row=0; horizon+row*rowH<p.h+rowH; row++) {
    const edge=(col:number)=>col*colW+(row%2)*13+Math.round(8*hash(col,row,seed+9));
    for (let col=-2; edge(col)<p.w+2; col++) {
      const n=hash(col,row,seed);
      const x=edge(col), next=edge(col+1), y=horizon+row*rowH;
      const dy=Math.floor(hash(col,row,seed+4)*2);
      const chip=1+Math.floor(n*3);
      const stone=mixc(low,high,.22+.52*n+.12*Math.sin(x/41-row*.4));
      const v:Point[]=[[x+chip,y+1+dy],[next-2,y+1],[next,y+3],[next-1,y+10],[next-chip,y+12],[x+2,y+12],[x,y+10],[x,y+4]];
      face(p,v,stone);
      p.line(x+chip,y+dy,next-4,y, mixc(stone,rim,.32));
      if(n>.32) {
        const a=x+5+Math.floor(n*(next-x)*.35);
        p.line(a,y+5,a+4,y+4,mixc(stone,rim,.21));
        p.set(a+6,y+4,mixc(stone,rim,.29));
      }
      if (n>.74) {
        p.line(x+4,y+11,x+8,y+8,low);
        p.line(x+8,y+8,x+7,y+7,low);
      }
    }
  }
}
