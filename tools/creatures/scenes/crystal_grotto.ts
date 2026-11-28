// Oblique beds of slate with a violet quartz vein. Only the druses catch the cold skylight.
import { Px } from '../rig/px';
import { hash,hx,mixc } from '../kit/f11-mobkit';
import { face,type Point } from './relief';
import type { Scene,ForegroundProp } from '../types';

const dark=hx('#252b3a'),wall=hx('#373749'),wallLit=hx('#565568');
const quartz=hx('#667887'), water=hx('#47495f'), seam=hx('#383e51');

function crystal(p:Px,x:number,y:number,ht:number,w:number,lean:number,front=false) {
  const tip:Point=[x+lean,y-ht], left:Point=[x-w+lean*.26,y-ht*.72], mid:Point=[x+lean*.29,y-ht*.61];
  const right:Point=[x+w+lean*.42,y-ht*.71],base:Point=[x+1,y];
  const footL:Point=[x-w*.70,y-ht*.06],footR:Point=[x+w*.76,y-ht*.08];
  const shades=(front?['#342e47','#4c4161','#685975','#97839c','#b8a4ad']:['#3d4051','#525064','#66647a','#808299','#8e93a0']).map(c=>hx(c));
  face(p,[tip,left,footL,base,footR,right],shades[0]);
  face(p,[tip,left,mid],shades[4]);face(p,[tip,mid,right],shades[2]);
  face(p,[left,mid,base,footL],shades[2]);face(p,[mid,right,footR,base],shades[1]);
  p.line(...left,...footL,shades[3]);p.line(...mid,...base,shades[3]);
  if(ht>13) {
    const cx=x+lean*.20,cy=y-ht*.36;
    p.line(cx-w*.5,cy,cx+1,cy-1,shades[3]);p.line(cx+1,cy-1,cx+w*.6,cy-3,shades[2]);
    p.line(tip[0],tip[1]+1,mid[0],mid[1]-1,shades[3]);
  }
}
function ceiling(p:Px) {
  p.rect(0,0,p.w-1,p.h-1,hx('#292a3a'));
  const cave:Point[][]=[
    [[0,0],[46,0],[36,8],[29,12],[12,32],[0,40]],
    [[40,0],[106,0],[117,8],[86,5],[74,11],[61,12],[50,8],[36,13]],
    [[96,4],[114,0],[161,0],[161,41],[137,36],[123,27],[119,17]],
    [[0,28],[21,25],[37,18],[53,23],[57,35],[71,27],[86,26],[103,20],[120,21],[143,15],[161,20],[160,44],[0,44]]
  ];
  for(const v of cave)face(p,v,wall);
  face(p,[[2,0],[47,0],[35,7],[25,16],[15,26],[9,31],[17,12]],wallLit);
  face(p,[[5,0],[33,0],[26,4],[23,6],[15,8],[18,3]],hx('#706778'));
  face(p,[[66,0],[83,0],[68,5],[59,5],[52,9],[54,5]],wallLit);
  face(p,[[125,14],[142,2],[158,0],[150,9],[137,15],[127,26],[121,27]],wallLit);
  face(p,[[142,18],[160,10],[160,34],[135,39],[133,30]],dark);
  face(p,[[0,30],[15,29],[30,23],[41,22],[51,26],[34,25],[19,32],[0,35]],wallLit);
  face(p,[[113,29],[129,22],[144,21],[155,21],[141,23],[128,25],[121,30]],wallLit);
  const slit:Point[]=[[0,17],[7,15],[10,12],[16,11],[20,5],[28,1]];
  for(let i=1;i<slit.length;i++){
    p.line(...slit[i-1],...slit[i],hx('#89909e'));
    p.line(slit[i-1][0],slit[i-1][1]+1,slit[i][0],slit[i][1]+1,hx('#626980'));
  }
}
interface Tile {x:number;y:number;seed:number;}
function crystalFloor(p:Px) {
  const rows=7,cols=8,tiles:Tile[]=[];
  for(let j=-1;j<rows;j++)for(let i=-1;i<cols;i++) {
    const seed=(j+2)*12+i+2;
    tiles.push({x:i*24+Math.round(hash(seed,23)*18),y:37+j*17+Math.round(hash(seed,87)*12),seed});
  }
  const shades=tiles.map(({seed})=>{
    const m=hash(seed,51);
    const base=mixc(hx('#484957'),hx('#6a6a77'),m);
    return [mixc(base,hx('#6e7083'),.24),base,mixc(base,hx('#383f51'),.29)];
  });
  // Directed fracture cells, stretched along the lamination. The nearest two
  // seeds give a fine dark joint; each cell splits again along a cleavage plane.
  for(let y=37;y<p.h;y++)for(let x=0;x<p.w;x++){
    let nearest=Infinity,second=Infinity,best=0;
    for(let i=0;i<tiles.length;i++){
      const tile=tiles[i],dy=y-tile.y,dx=x-tile.x+dy*1.1;
      const d=dx*dx*.59+dy*dy*2.08;
      if(d<nearest){second=nearest;nearest=d;best=i;}
      else if(d<second)second=d;
    }
    const tile=tiles[best], dx=x-tile.x,dy=y-tile.y;
    const band=dy+.23*dx+(tile.seed%5)-2, color=shades[best][band<-.8?0:band<5?1:2];
    p.set(x,y,second-nearest<9.5?seam:color);
  }
  for(const tile of tiles) {
    const {x,y,seed}=tile;
    if(y<39||y>p.h-3)continue;
    switch(seed%6) {
      case 0: // a thin leaf of rock has sprung open
        face(p,[[x-6,y+1],[x+2,y-2],[x+8,y-2],[x+4,y],[x-5,y+3]],wall);
        p.line(x-6,y+1,x+2,y-2,quartz);break;
      case 1: // quartz fibres crossing the bedding
        p.line(x-4,y+2,x+1,y-2,quartz);p.line(x+1,y-2,x+6,y-3,quartz);
        p.line(x+2,y+1,x+7,y-2,wallLit);break;
      case 2: // a branching recess in the cleavage
        p.line(x-5,y+2,x+2,y-1,seam);p.line(x+2,y-1,x+5,y-4,seam);p.set(x+1,y,seam);break;
      case 3: // mica windows
        for(let k=0;k<3;k++){p.line(x+k*3-4,y-k%2,x+k*3-2,y-k%2-1,quartz);p.set(x+k*3-3,y-k%2+1,wallLit);}break;
      case 4: // a loose sharp-edged pebble
        face(p,[[x-3,y],[x,y-2],[x+3,y-1],[x+4,y+1],[x,y+2]],wall);
        face(p,[[x-3,y],[x,y-2],[x+3,y-1],[x,y]],quartz);break;
      default: // water has collected in a thin lens
        face(p,[[x-6,y+1],[x-1,y-1],[x+5,y-2],[x+2,y],[x-3,y+2]],water);
        p.line(x-2,y,x+2,y-1,wallLit);
    }
  }
  face(p,[[0,39],[17,38],[34,34],[47,34],[37,39],[19,44],[0,46]],wall);
  p.line(2,40,32,35,wallLit);p.line(5,43,17,41,dark);
  face(p,[[117,45],[133,38],[156,33],[161,35],[160,39],[135,43],[121,48]],wall);
  p.line(132,39,154,34,quartz);p.line(138,43,158,39,dark);
  for(const [x,y,ht,w,lean] of [[7,42,15,4,-1],[11,43,12,3,3],[14,44,7,2,4],[139,40,12,4,-1],[144,39,17,4,2],[150,39,7,2,4]])crystal(p,x,y,ht,w,lean);
  face(p,[[4,64],[18,61],[33,62],[26,65],[10,67]],water);p.line(7,65,18,63,quartz);
}
const druse:ForegroundProp={id:'quartz-druse',depth:124,paint(p){
  face(p,[[0,117],[12,112],[28,113],[47,118],[52,122],[37,125],[15,124],[0,122]],hx('#353743'));
  for(const [x,y,h,w,lean] of [[8,118,19,5,-5],[14,119,27,6,-3],[23,119,31,7,3],[33,119,16,4,7],[35,121,15,4,5],[20,122,12,4,-5],[12,122,10,3,-6],[44,122,6,3,6]])crystal(p,x,y,h,w,lean,true);
  p.line(3,122,12,123,wallLit);p.line(28,124,38,123,wallLit);
}};
const shard:ForegroundProp={id:'loose-amethyst',depth:125,paint(p){
  face(p,[[128,122],[137,117],[148,116],[157,120],[160,124],[129,125]],seam);
  crystal(p,146,122,17,6,-9,true);crystal(p,154,124,12,4,3,true);
}};
let base:Px;
const paint:Scene=(p,t)=>{
  if(!base||base.w!==p.w||base.h!==p.h){base=new Px(p.w,p.h);ceiling(base);crystalFloor(base);}
  p.data.set(base.data);
  const time=((t%3)+3)%3;
  if(time<.88){const y=19+Math.round(45*(time/.88)**2);p.line(17,y-2,17,y,hx('#8994a0'));}
  else if(time<1.75){
    const r=2+Math.round(9*(time-.88)/.87);
    p.line(18-r,65,21-r,64,quartz);p.line(18+r,64,16+r,65,quartz);
  }
  if(time>1.34&&time<2.05)p.set(143,25,hx('#b5acb5'));
};
export default Object.assign(paint,{front:[druse,shard]});
