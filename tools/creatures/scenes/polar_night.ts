// Wind-polished lake surrounded by ice cliffs. Northern light stays behind the peaks.
import { Px } from '../rig/px';
import { hx, hash, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';
let fixed:Px;
function ice(p:Px,x:number,y:number,w:number,h:number,front:boolean){
  const cv=(pts:Point[])=>pts.map(([u,v])=>[x+w*u,y-h*v] as Point);
  face(p,cv([[0,0],[.22,.4],[.34,.54],[.42,.83],[.51,.84],[.62,1],[.67,.88],[.75,.83],[.76,.61],[1,0]]),hx(front?'#384b63':'#34455a'));
  face(p,cv([[.04,0],[.42,.83],[.51,.84],[.62,1],[.54,.62],[.48,.6],[.41,.32],[.32,.36],[.25,.15]]),hx(front?'#728291':'#5b6b7d'));
  face(p,cv([[.5,.82],[.62,1],[.67,.88],[.75,.83],[.74,.64],[.68,.71],[.64,.61],[.60,.76]]),hx(front?'#586b81':'#4b5e74'));
  face(p,cv([[.04,.01],[.28,.39],[.4,.42],[.3,.30],[.25,.26],[.22,.11]]),hx('#475c70'));
}
function aurora(p:Px){
  for(let x=0;x<p.w;x++){
    const y=Math.round(10+5*Math.sin(x*.038)+2.5*Math.sin(x*.077+.4)+x*.055);
    const length=4+Math.round(8*(1+Math.sin(x*.053))*.5);
    for(let i=0;i<length;i++) p.set(x,y-i,mixc(hx('#204348'),hx('#223647'),Math.floor(i*4/length)/4));
    p.set(x,y,hx('#31595b'));
  }
}
function paint(p:Px){
  for(let y=0;y<p.h;y++)p.rect(0,y,p.w-1,y,mixc(hx('#1c293e'),hx('#4d5f71'),Math.min(1,Math.floor(y/4)/14)));
  aurora(p);
  for(let n=0;n<21;n++)p.set(hash(n,17)*p.w,hash(n,41)*25,hx('#77848f'));
  ice(p,-29,49,88,34,false); ice(p,45,49,60,24,false); ice(p,119,54,112,42,false);
  ice(p,-22,54,64,30,true); ice(p,159,56,76,37,true);
  const base=hx('#425568');
  p.rect(0,51,p.w-1,p.h-1,base);
  // Wide sheets of lake ice disappear into a narrow row of distant floes.
  const rows=[51,55,61,69,79,91,106,125,148,177];
  for(let row=0;row<rows.length-1;row++){
    const y=rows[row], depth=rows[row+1]-y, width=19+row*6;
    for(let col=-1;col*width<p.w+width;col++){
      const n=hash(col,row,709), x=col*width+(row%2)*width*.44;
      const slant=(n-.5)*depth*.36, chip=(.04+.14*hash(col,row,46))*width;
      const stone=mixc(hx('#435467'),hx('#617686'),.32+.43*n);
      face(p,[[x+chip,y+1],[x+width*.68,y+slant],[x+width-1,y+depth*.19],[x+width-2,y+depth*.83],[x+width*.68,y+depth-1],[x+width*.11,y+depth+slant],[x,y+depth*.71],[x+1,y+depth*.29]],stone);
      p.line(x+chip,y+1,x+width*.55,y+slant,mixc(stone,hx('#91a1a5'),.4));
      if(n>.51){
        const u=x+width*.16, v=y+depth*.70;
        p.line(u,v,u+width*.17,v-depth*.2,hx('#6b808a'));
        p.line(u+width*.17,v-depth*.2,u+width*.31,v-depth*.15,hx('#657c87'));
      }
    }
  }
  for(const [x,y,s] of [[84,60,.45],[160,84,.7],[3,117,1.1],[155,144,1.2]]){
    // Frost pressure fissure with a shelf and two fine branching fractures.
    const cuts=[[0,0],[10,-1],[14,-3],[18,-2],[30,-5],[37,-5]];
    for(let j=1;j<cuts.length;j++){
      const a=cuts[j-1],b=cuts[j];
      p.line(x+a[0]*s,y+a[1]*s,x+b[0]*s,y+b[1]*s,hx('#374f61'));
      p.line(x+a[0]*s,y+a[1]*s+1,x+b[0]*s,y+b[1]*s+1,hx('#748792'));
    }
    p.line(x+18*s,y-2*s,x+19*s,y-5*s,hx('#40596b'));
  }
  // Exposed water and rough snow shelf at the left margin.
  face(p,[[0,68],[13,69],[24,74],[21,78],[33,80],[20,85],[13,83],[7,85],[0,84]],hx('#243c50'));
  p.line(0,68,13,69,hx('#929ba1'));p.line(13,69,24,74,hx('#788d9c'));
  for(let i=0;i<5;i++){const x=hash(i,8)*19,y=72+hash(i,1)*9;p.line(x,y,x+3,y,hx('#496579'));}
  for(const [x,y,w] of [[194,87,18],[15,144,23],[185,139,20]]){
    face(p,[[x-w,y],[x-w+5,y-3],[x+3,y-4],[x+w,y-1],[x+w-1,y+2],[x-2,y+4]],hx('#6f808a'));
    p.line(x-w+5,y-3,x+3,y-4,hx('#939fa2'));
  }
}
export default function polar(p:Px,t:number){
  if(!fixed||p.w!==fixed.w||p.h!==fixed.h){fixed=new Px(p.w,p.h);paint(fixed);}
  p.data.set(fixed.data);
  const a=2*Math.PI*t/3;
  for(let i=0;i<3;i++){
    const x=(i===0?19:177+i*7)+6*Math.cos(a+i*2),y=34+i*7+4*Math.sin(a+i*2);
    p.set(x,y,hx('#9baab1'));p.set(x-1,y+1,hx('#728795'));
  }
}
