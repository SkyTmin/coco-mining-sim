import { Px } from '../rig/px';
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { face, ledges, type Point } from './relief';
import type { Scene } from '../types';

const bark=hx('#39392e'), barkShadow=hx('#252c27'), barkLight=hx('#555241');
const moss=hx('#515639'), leaf=hx('#656747'), fernDark=hx('#313e31');
function root(p:Px,x:number,y:number,dx:number,dy:number,thick:number) {
  const ax=x+.38*dx, ay=y+.25*dy, bx=x+.65*dx, by=y+.76*dy;
  const points:Point[]=[[x,y-thick],[ax,ay-thick*.70],[bx,by-1],[x+dx,y+dy],[bx,by+1],[ax,ay+thick*.4],[x-3,y+thick*.5]];
  face(p,points,barkShadow);
  p.line(x,y-thick+1,ax,ay-thick*.6,barkLight);
  p.line(ax,ay-thick*.6,bx,by-1,bark);
}
function fern(p:Px,x:number,y:number,size:number,dir:number) {
  p.line(x,y,x+dir*size*.42,y-size,fernDark);
  for(let i=1;i<5;i++) {
    const u=i/5, cx=x+dir*size*.42*u, cy=y-u*size;
    const reach=(1-u*.87)*size*.50;
    p.line(cx,cy,cx+dir*reach,cy-reach*.5,leaf);
    p.line(cx,cy,cx-dir*reach*.66,cy-reach*.7,moss);
  }
}
let base:Px;
function clearing(w:number,h:number) {
  const p=new Px(w,h), horizon=39;
  for (let y=0;y<h;y++) {
    const sky=mixc(hx('#293633'),hx('#51574a'),Math.floor(6*y/horizon)/6);
    p.line(0,y,w-1,y,y<horizon?sky:hx('#434137'));
  }
  // Forked trunks stack in two values behind the lighter clearing.
  for(let depth=0;depth<2;depth++) {
    const step=depth?28:14;
    for(let i=-1;i<w/step+1;i++) {
      const x=step*i+Math.round(8*hash(i,depth,13));
      const y=horizon-Math.round(11*hash(i,depth,14)) + 4*depth;
      const width=depth?4+4*hash(i,1,53):2;
      const c=depth?hx('#303930'):hx('#3b4940');
      face(p,[[x-width,-2],[x+2,-2],[x+1,y-6],[x+7,y],[x+3,y+1],[x-3,y-3],[x-width-2,y+2],[x-width+1,y-8],[x-width+2,14]],c);
      p.line(x,19,x-7,10,c);
      p.line(x-7,10,x-9,4,c);
      if(depth && i%2===0) { p.line(x-2,2,x-1,15,barkLight); p.line(x-1,15,x-2,23,bark); }
    }
  }
  // A few leaf canopies overlap the trunk tops; the clearing remains open behind the face.
  for(let i=0;i<26;i++) {
    const x=Math.round(i*7+hash(i,8)*5);
    p.ell(x,-1+hash(i,7)*7,6+hash(i,9)*8,4+hash(i,4)*4,i%3?hx('#354737'):hx('#3f4f3b'));
  }
  for(let i=0;i<41;i++) {
    const x=Math.round(hash(i,62)*w), y=Math.floor(hash(i,81)*11);
    p.line(x,y,x+2,y-1,i%3===0?hx('#4b5840'):hx('#394a37'));
    if(i%3===0) p.set(x+3,y-2,hx('#46563c'));
  }
  ledges(p,horizon,hx('#484439'),hx('#68634d'),hx('#83795c'),42);
  for(let i=0;i<70;i++) {
    const x=Math.floor(w*hash(i,19)), y=horizon+Math.floor((h-horizon)*hash(i,20));
    const edge=Math.min(x,w-x);
    if(edge<24 || i%5===0){
      p.ell(x,y,3+hash(i,76)*6,1+hash(i,14)*2,moss);
      p.line(x-2,y-1,x+1,y-1,leaf);
      if(i%2===0) p.set(x+3,y-1,leaf);
    }
  }
  // Moss-covered buttresses hold back the sides of the forest bowl.
  root(p,-4,35,44,13,8); root(p,-3,41,32,26,9);
  root(p,160,44,-35,12,8); root(p,158,47,-14,25,6);
  const stumpX=24, stumpY=47;
  face(p,[[13,45],[34,43],[33,51],[38,56],[31,54],[29,57],[17,54],[10,57],[14,50]],barkShadow);
  face(p,[[13,45],[24,47],[22,53],[18,54],[15,52]],bark);
  p.ell(stumpX,stumpY-3,11,4,barkLight);
  p.ell(stumpX,stumpY-3,8,2,hx('#766c4c'));
  p.ell(stumpX,stumpY-3,5,1,bark);
  p.set(stumpX,stumpY-3,hx('#857956'));
  p.line(26,49,26,53,barkLight);
  for(const [x,y,s,dir] of [[8,53,12,1],[4,75,9,-1],[143,51,11,1],[154,94,14,-1],[11,119,12,1]]) fern(p,x,y,s,dir);
  return p;
}
const scene:Scene=(p,t)=>{
  if(!base || base.w!==p.w || base.h!==p.h) base=clearing(p.w,p.h);
  p.data.set(base.data);
  const sway=Math.round(1.6*Math.sin(TAU*t/3));
  for(const [x,y] of [[11,66],[145,108]]) {
    p.line(x,y,x-2+sway,y-6,moss);
    p.line(x,y,x+3+sway,y-5,leaf);
  }
};
export default scene;
