// Rain has peeled back the needles in a shallow, winding run through the blackberry wood.
import { Px } from '../rig/px';
import { hash,hx,mixc,TAU } from '../kit/f11-mobkit';
import type { Scene,ForegroundProp } from '../types';
import { face,type Point } from './relief';

const bark=hx('#494035'), barkDark=hx('#2c312e'), barkLit=hx('#73644c');
const green=hx('#526348'), moss=hx('#66734e'), darkMoss=hx('#414c3c');
const loam=hx('#615344'), earth=hx('#806b50'), dry=hx('#a08a62');
const needles=hx('#625b44'), needlesLit=hx('#8d7d5a');

function ribbon(p:Px,path:Point[],fat:number) {
  for(let i=1;i<path.length;i++){
    const [x,y]=path[i-1],[nx,ny]=path[i],w=fat*(1-(i-1)/path.length);
    face(p,[[x,y-w],[nx,ny-w*.72],[nx+1,ny+1],[x,y+.8]],barkDark);
    p.line(x,y-w,nx,ny-w*.72,barkLit);
    p.line(x,y-w*.57,nx,ny-w*.35,bark);
  }
}
function fern(p:Px,x:number,y:number,size:number,flip:number) {
  for(const dir of [-1,0,1]){
    const tipX=x+flip*dir*size*.64,tipY=y-size*(1-Math.abs(dir)*.33);
    p.line(x,y,tipX,tipY,darkMoss);
    for(let i=1;i<=5;i++){
      const t=i/6,cx=x+(tipX-x)*t,cy=y+(tipY-y)*t,reach=(1-t*.83)*size*.36;
      p.line(cx,cy,cx-flip*reach,cy-reach*.69,moss);
      p.line(cx,cy,cx+flip*reach,cy-reach*.79,green);
    }
  }
}
function woods(p:Px) {
  const mist=hx('#626652'),shadow=hx('#34433e');
  for(let y=0;y<46;y++) for(let x=0;x<p.w;x++) {
    const shaft=Math.max(0,1-Math.abs((x-y*.61-42)/38));
    p.set(x,y,mixc(shadow,mist,.14+.36*y/45+.32*shaft));
  }
  // Two converging slivers of morning light hold open the clearing at the back.
  face(p,[[25,0],[34,0],[66,43],[51,43]],hx('#899071',31));
  face(p,[[40,0],[42,0],[67,35],[64,36]],hx('#b2a479',22));
  for(let layer=0;layer<3;layer++) {
    const spacing=[9,19,36][layer];
    for(let i=-1;i*spacing<p.w+spacing;i++) {
      const x=Math.round(i*spacing+hash(i,layer,11)*9), foot=34+layer*4-Math.round(hash(i,layer,9)*7);
      const bend=3-Math.round(hash(i,layer,66)*7),w=[1,2,5][layer];
      const col=[hx('#4c5d51'),hx('#404e43'),hx('#303e36')][layer];
      face(p,[[x-w,-2],[x+w,-2],[x+w+bend,18],[x+w-1,foot-6],[x+w+4,foot],[x+2,foot-1],[x,foot-3],[x-w-4,foot+1],[x-w+1,foot-6],[x-w+bend,17]],col);
      for(const side of [-1,1]){
        const by=8+Math.round(10*hash(i,side,layer+45)),span=w+3+hash(i,side,42)*9;
        face(p,[[x+bend,by],[x+side*span,by-6],[x+side*(span+4),by-14],[x+side*(span+1),by-5],[x+bend,by+3]],col);
      }
      if(layer===2){
        p.line(x-w+1,6,x-w+bend+1,17,hx('#50604a'));
        p.line(x-w+bend+1,19,x-w+1,foot-8,hx('#4a5743'));
      }
    }
  }
  for(let i=0;i<61;i++){
    const x=Math.round(hash(i,78)*p.w),y=-5+Math.floor(14*hash(i,79));
    p.ell(x,y,4+hash(i,80)*8,3+hash(i,81)*4,i%4===0?hx('#485940'):hx('#384a3a'));
    p.line(x-2,y+2,x,y+1,hx('#4e6046'));
  }
}
const soilPalette=Array.from({length:18},(_,i)=>mixc(loam,earth,i/17));
function forestFloor(p:Px) {
  // Long warm clearing, with cool turf under the root banks. Coordinate noise
  // changes patches, not individual pixels, so the floor keeps large readable values.
  for(let y=39;y<p.h;y++)for(let x=0;x<p.w;x++){
    const bend=49+36*Math.sin((y-39)/68), path=Math.max(0,1-Math.abs(x-bend)/53);
    const pool=.50+.24*Math.sin(x*.058+y*.14)+.17*Math.sin(x*.13-y*.075);
    const level=Math.max(0,Math.min(17,Math.round(3+9*path+4*pool)));
    p.set(x,y,soilPalette[level]);
  }
  for(let i=0;i<105;i++){
    const x=Math.floor(hash(i,2,145)*p.w),y=40+Math.floor(hash(i,4,145)*(p.h-39));
    const width=2+hash(i,6,145)*8,edge=Math.abs(x-(49+36*Math.sin((y-39)/68)))>34;
    if(edge&&i%3!==0) {
      const rx=width+2;
      for(let j=0;j<5;j++) {
        const qx=x+(hash(i,j,718)-.5)*rx*1.6,qy=y+(hash(i,j,721)-.5)*4;
        const r=2+hash(i,j,722)*rx*.35;
        p.ell(qx,qy+1,r+1,r*.48+1,darkMoss);
        p.ell(qx-1,qy,r,r*.48+.8,green);
        p.line(qx-r*.65,qy-1,qx-r*.2,qy-2,moss);
        if(j%2===0)p.set(qx+1,qy-2,needlesLit);
      }
    }
  }
  for(let row=0;row<8;row++)for(let col=-1;col<13;col++) {
    const h=hash(col,row,497),x=col*14+Math.round(h*9),y=43+row*12+Math.round(hash(col,row,498)*6);
    const kind=Math.floor(h*6);
    if(kind===0){ // splayed pine needles
      for(let j=0;j<4;j++)p.line(x,y,x-5+j*2,y-1-j%3,j%2?needles:needlesLit);
    } else if(kind===1) { // dry oak leaf and notched lobes
      face(p,[[x-4,y-1],[x-2,y-2],[x,y-1],[x+1,y-3],[x+2,y-1],[x+5,y-2],[x+3,y],[x+1,y+1],[x-3,y+1]],hx('#907451'));
      p.line(x-4,y+1,x+4,y-1,needles);
    } else if(kind===2){ // tufts on a patch of exposed peat
      p.ell(x,y,5,2.5,hx('#6a644c'));p.line(x-3,y,x-1,y-2,green);p.set(x+2,y-1,moss);
    } else if(kind===3){ // small root across the path
      p.line(x-5,y+1,x-1,y-1,bark);p.line(x-1,y-1,x+4,y-1,bark);
      p.line(x-4,y,x-1,y-2,needlesLit);
    } else if(kind===4){ // furrows expose wet earth
      p.line(x-4,y,x+1,y-2,loam);p.line(x,y-2,x+4,y-1,loam);p.set(x+1,y-1,needlesLit);
    } else{ // bleached tussock
      p.line(x,y,x-2,y-4,needles);p.line(x,y,x+1,y-3,needlesLit);p.set(x+3,y-2,needlesLit);
    }
  }
  // Broken fibres lie in little eddies where the wet earth has settled.
  for(let i=0;i<150;i++){
    const x=Math.round(hash(i,922)*p.w),y=40+Math.round(hash(i,923)*87);
    const bend=Math.sin(.064*x+.1*y),span=2+Math.round(4*hash(i,924));
    p.line(x,y,x+span,y+(bend>.40?-1:0),i%3===0?hx('#685543',87):hx('#968060',93));
    if(i%5===0)p.line(x+1,y+1,x+span+2,y+1,loam);
  }
  ribbon(p,[[148,65],[137,67],[126,67],[115,72],[109,74],[104,74]],2.6);
  ribbon(p,[[0,86],[12,86],[22,82],[30,82],[39,77],[45,77]],2.5);
  ribbon(p,[[-5,44],[10,47],[23,46],[36,53],[49,54]],5);
  ribbon(p,[[-3,47],[6,55],[19,59],[24,65]],6);
  ribbon(p,[[163,39],[148,42],[134,51],[120,52],[111,57]],6);
  ribbon(p,[[153,45],[145,54],[146,62],[138,72]],3);
  fern(p,4,64,13,1);fern(p,148,53,10,-1);fern(p,158,85,14,1);
  face(p,[[17,46],[34,46],[32,53],[37,56],[30,55],[26,58],[16,54],[12,56],[16,51]],barkDark);
  p.ell(25,46,10,4,barkLit);p.ell(25,46,7,2.6,hx('#9a825d'));
  p.ell(25,46,4,1.6,needles);p.set(26,46,dry);
  p.line(19,49,18,54,barkLit);p.line(30,49,29,53,bark);
}
const leftLog:ForegroundProp={id:'fallen-alder',depth:124,paint(p){
  face(p,[[-2,107],[15,109],[54,114],[62,117],[59,120],[44,121],[26,117],[7,116],[-2,114]],hx('#393b32'));
  const outline:Point[]=[[-4,102],[5,101],[17,105],[29,106],[40,109],[50,109],[58,112],[58,117],[48,119],[34,118],[19,114],[3,113],[-4,110]];
  face(p,outline,barkDark);
  face(p,[[-3,103],[6,103],[17,106],[29,107],[49,111],[55,112],[51,115],[33,114],[19,111],[1,108]],hx('#675744'));
  p.line(-1,104,20,109,barkLit);p.line(22,109,38,111,barkLit);p.line(3,109,20,112,bark);
  for(let i=0;i<18;i++){
    const x=hash(i,815)*48,y=103+x*.18+Math.floor(hash(i,817)*4);
    p.line(x,y,x+3+hash(i,818)*4,y+1,i%3?bark:hx('#8d7656'));
  }
  p.line(18,108,13,103,barkLit);p.line(13,103,11,99,barkDark);
  p.ell(54,114,6,4,hx('#483d35'));p.ell(53,113,5,3.2,hx('#ad8a62'));p.ell(54,113,3,2.0,hx('#7e644b'));
  p.set(54,113,dry);p.line(50,115,53,114,bark);
  for(let i=0;i<16;i++) {
    const x=4+i*2.7,y=101+x*.19+hash(i,26)*1.5;
    p.ell(x,y,2.7,1.7,i%3?green:moss);
    if(i%4===0)p.line(x,y-1,x-1,y-3,moss);
  }
  fern(p,15,113,13,1);fern(p,5,112,11,-1);
}};
const rightBranch:ForegroundProp={id:'broken-hazel',depth:123,paint(p){
  ribbon(p,[[164,114],[151,111],[140,115],[130,114]],4);
  ribbon(p,[[151,111],[149,106],[150,101]],2);
  fern(p,157,119,11,-1);
}};
let base:Px;
const paint:Scene=(p,t)=>{
  if(!base||base.w!==p.w||base.h!==p.h){base=new Px(p.w,p.h);woods(base);forestFloor(base);}
  p.data.set(base.data);
  const sway=Math.round(1.6*Math.sin(TAU*t/3));
  for(const [x,y] of [[12,65],[143,93]]){
    p.line(x,y,x-2+sway,y-6,moss);p.line(x,y,x+3+sway,y-5,green);
  }
};
export default Object.assign(paint,{front:[leftLog,rightBranch]});
