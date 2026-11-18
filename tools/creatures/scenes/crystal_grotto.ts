import { Px } from '../rig/px';
import { hash, hx } from '../kit/f11-mobkit';
import { face, ledges, type Point } from './relief';
import type { Scene } from '../types';

const slate=hx('#343947'), deep=hx('#292e3b'), faceLit=hx('#505467');
const cleft=hx('#232936'), grey=hx('#555a6a'), quartz=hx('#506773');

function spur(p:Px,x:number,y:number,height:number,width:number,lean:number) {
  const tip:Point=[x+lean,y-height], left:Point=[x-width,y-height*.28];
  const base:Point=[x+1,y], right:Point=[x+width,y-height*.24];
  const ridge:Point=[x+1+lean*.25,y-height*.41];
  face(p,[tip,left,base,ridge],hx('#465966'));
  face(p,[tip,ridge,base,right],hx('#354455'));
  p.line(tip[0],tip[1],left[0],left[1],quartz);
  p.line(tip[0],tip[1],ridge[0],ridge[1],hx('#657d85'));
}
let base:Px;
function cavern(w:number,h:number) {
  const p=new Px(w,h);
  p.rect(0,0,w-1,h-1,cleft);
  // The far recess cuts into an overhanging ledge. Split faces break the
  // silhouette into long, low-contrast planes; the brightest seam stays at the wall.
  face(p,[[0,0],[47,0],[35,8],[27,10],[12,33],[0,41]],slate);
  face(p,[[7,0],[56,0],[38,5],[26,12],[16,25],[11,27],[17,12]],faceLit);
  face(p,[[18,0],[34,0],[26,4],[19,6]],grey);
  face(p,[[40,0],[105,0],[115,7],[89,5],[80,9],[64,9],[56,16],[50,8],[34,10]],slate);
  face(p,[[56,0],[83,0],[72,3],[60,5],[50,8],[50,5]],faceLit);
  face(p,[[82,15],[105,7],[113,14],[140,7],[159,0],[160,41],[64,41],[70,26]],deep);
  face(p,[[98,4],[114,0],[160,0],[160,42],[128,32],[119,20]],slate);
  face(p,[[128,12],[146,2],[158,0],[149,10],[137,17],[128,26],[118,29]],faceLit);
  face(p,[[143,15],[160,10],[161,32],[134,42],[131,34]],deep);
  face(p,[[0,29],[12,29],[26,24],[42,24],[55,30],[76,31],[84,27],[105,28],[127,22],[148,20],[160,23],[160,48],[0,48]],slate);
  face(p,[[0,31],[17,30],[27,26],[41,25],[32,29],[18,32],[0,35]],faceLit);
  face(p,[[121,29],[134,23],[151,21],[156,22],[136,26],[129,30]],faceLit);
  for (const [x,y,dx,dy] of [[50,14,9,-4],[117,19,8,-6],[93,17,7,-3],[22,19,6,-7],[150,18,8,-4],[10,11,5,-5]]) {
    p.line(x,y,x+dx,y+dy,slate);
    p.line(x+dx,y+dy,x+dx+5,y+dy-1,slate);
  }
  p.rect(0,38,w-1,h-1,hx('#373c4c'));
  ledges(p,38,hx('#454956'),hx('#646775'),hx('#838598'),62);
  // Horizontal fossil shelves and a shallow pool break the rhythm of the flags.
  for(const [x,y,dx] of [[1,47,43],[115,47,38],[133,54,30],[0,61,17]]) {
    face(p,[[x-3,y],[x+8,y-3],[x+dx,y-5],[x+dx-3,y],[x+6,y+4],[x-3,y+4]],deep);
    face(p,[[x-3,y],[x+8,y-4],[x+dx,y-6],[x+dx-3,y-3],[x+7,y+1]],grey);
  }
  p.ell(19,65,13,3.2,hx('#414b59')); p.line(9,65,17,64,quartz);
  for(const [x,y,ht,wd,lean] of [[5,44,16,4,-2],[9,44,12,4,3],[13,44,7,3,3],[142,42,15,4,1],[136,44,10,3,-3],[148,40,8,3,4],[153,93,8,3,-3]]) spur(p,x,y,ht,wd,lean);
  // A mineral vein cuts diagonally across the near wall, not the arena.
  const joint:Point[]=[[0,19],[6,17],[8,14],[14,12],[17,7],[24,3]];
  for(let i=1;i<joint.length;i++) p.line(...joint[i-1],...joint[i],quartz);
  for(let i=0;i<24;i++) {
    const x=Math.round(hash(i,22)*w), y=44+Math.round(hash(i,61)*(h-46));
    if(x<26||x>w-25) { p.line(x,y,x+3,y-1,faceLit); p.set(x+1,y-1,grey); }
  }
  return p;
}
const scene:Scene=(p,t)=>{
  if(!base || base.w!==p.w || base.h!==p.h) base=cavern(p.w,p.h);
  p.data.set(base.data);
  const time=((t%3)+3)%3;
  if(time<.88) {
    const y=18+Math.round(47*(time/.88)**2);
    p.line(18,y-2,18,y,hx('#748996'));
  } else if(time<1.8) {
    const u=(time-.88)/.92, rx=2+Math.round(8*u), ry=1+Math.floor(2*u);
    p.line(19-rx,65,21-rx,65-ry,quartz); p.line(18+rx,65,16+rx,65+ry,quartz);
  }
  if(time>1.2 && time<2.1) p.set(142,30,hx('#91a5a6'));
};
export default scene;
