// An ancient wind terrace. Foreground cut stones, distant suspended shrines.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, ledges, type Point } from './relief';

let still: Px;
function island(p: Px, x: number, y: number, s: number) {
  const local = (pts: Point[]) => pts.map(([u,v]) => [x+u*s,y+v*s] as Point);
  face(p,local([[-22,-2],[-13,-6],[13,-5],[27,-1],[16,5],[-10,7]]),hx('#626f74'));
  face(p,local([[-22,-2],[-11,5],[15,3],[27,-1],[18,9],[13,11],[8,25],[3,28],[0,18],[-5,17],[-9,12],[-16,10]]),hx('#39495b'));
  face(p,local([[-21,-1],[-11,5],[3,6],[2,19],[-4,13],[-12,10]]),hx('#47586b'));
  const stone=hx('#555e6a'), edge=hx('#7b807e');
  for(const [xx,h] of [[-11,10],[4,16],[12,9]]) {
    p.rect(x+xx*s-1,y-h*s,x+xx*s+2,y-4*s,stone);
    p.line(x+xx*s-2,y-h*s,x+xx*s+3,y-h*s,edge);
  }
  p.line(x-15*s,y-10*s,x-6*s,y-10*s,stone);
}
function set(p:Px) {
  for(let y=0;y<74;y++) p.rect(0,y,p.w-1,y,mixc(hx('#25394d'),hx('#778584'),Math.floor(y/5)/14));
  for(let i=0;i<15;i++){
    const x=hash(i,1)*p.w,y=29+hash(i,9)*32,w=12+hash(i,2)*25;
    p.ell(x,y,w,3+hash(i,5)*4,hx('#748282'));
    p.ell(x+w*.3,y+3,w*.8,2,hx('#83908b'));
  }
  island(p,19,34,.78); island(p,168,40,.60); island(p,122,21,.32);
  const horizon=56, floor=hx('#4c595c');
  p.rect(0,horizon,p.w-1,p.h-1,floor);
  ledges(p,horizon,hx('#414e53'),hx('#68716b'),hx('#969585'),407);
  // The terrace breaks into two buttresses, disclosing the cloud sea on its flanks.
  for(const [x,y,flip] of [[0,70,1],[208,76,-1]]) {
    const cv=(a:Point[])=>a.map(([u,v])=>[x+flip*u,y+v] as Point);
    face(p,cv([[0,-17],[15,-15],[30,-10],[42,-11],[29,-6],[27,1],[19,6],[12,10],[0,13]]),hx('#343e4c'));
    face(p,cv([[0,-18],[17,-16],[28,-12],[42,-11],[33,-9],[21,-10],[16,-12],[0,-12]]),hx('#758075'));
    face(p,cv([[0,10],[13,17],[6,26],[0,28]]),hx('#6a797d'));
  }
  // Mooring beacon and ornamental cleft at the far left edge.
  face(p,[[9,62],[13,57],[21,58],[25,63],[23,67],[8,67]],hx('#343f45'));
  p.rect(13,34,18,62,hx('#4c5452')); p.rect(13,35,14,61,hx('#758079'));
  face(p,[[8,36],[13,30],[18,30],[24,35],[21,37],[10,37]],hx('#475754'));
  p.line(9,35,14,31,hx('#8d9790'));
  p.line(18,42,24,42,hx('#554f48'));
}
export default function sky(p:Px,t:number) {
  if(!still||still.w!==p.w||still.h!==p.h){still=new Px(p.w,p.h);set(still);}
  p.data.set(still.data);
  const a=2*Math.PI*t/3;
  const flag:Point[]=[[20,41],[25,40+Math.sin(a)],[32,42+Math.sin(a+.5)*2],[29,43+Math.sin(a+.5)*2],[32,45+Math.sin(a+.6)],[24,44],[20,45]];
  face(p,flag,hx('#8c7770'));
  p.line(20,41,25,40+Math.sin(a),hx('#ae9381'));
}
