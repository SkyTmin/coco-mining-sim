// Basalt and still water; the mushroom colonies frame the shaman's lantern.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';

let backdrop:Px;
function bracket(p:Px,x:number,y:number,r:number) {
  const cv=(pts:Point[])=>pts.map(([u,v])=>[x+u*r,y+v*r] as Point);
  face(p,cv([[-.16,0],[.09,-.03],[.15,.63],[.4,.92],[.23,1.02],[-.05,.91],[-.13,.55]]),hx('#5b6260'));
  face(p,cv([[-.17,.04],[-.09,.04],[-.04,.53],[.18,.9],[-.05,.8],[-.15,.5]]),hx('#808171'));
  face(p,cv([[-.98,.02],[-.7,-.22],[-.42,-.41],[-.17,-.49],[.1,-.48],[.42,-.31],[.73,-.17],[1,.08],[.73,.18],[-.75,.16]]),hx('#62565f'));
  face(p,cv([[-.96,.02],[-.70,-.22],[-.42,-.41],[-.15,-.48],[.09,-.47],[.18,-.41],[-.22,-.38],[-.55,-.19]]),hx('#827070'));
  face(p,cv([[-1,.03],[-.22,.11],[.49,.07],[1,.05],[.73,.23],[.12,.29],[-.59,.20]]),hx('#797663'));
  for(let k=-3;k<=3;k++) p.line(x,y+.24*r,x+k*r*.24,y+.10*r,hx('#595d51'));
}
function paint(p:Px){
  const water=hx('#293d42'),wall=hx('#29343a');
  p.rect(0,0,p.w-1,p.h-1,wall);
  // Cavern mouth, eroded galleries and a dark recess behind the crown.
  for(let i=0;i<9;i++){
    const x=i*33-16,n=hash(i,438);
    face(p,[[x,0],[x+25,0],[x+20,14],[x+18,21+n*18],[x+12,23+n*18],[x+6,13],[x-2,9]],mixc(hx('#243038'),hx('#3c4646'),n));
    p.line(x+3,5,x+8,15,hx('#414947'));
  }
  face(p,[[0,28],[12,11],[28,16],[39,26],[43,51],[61,65],[49,73],[0,84]],hx('#39423e'));
  face(p,[[213,60],[220,28],[231,14],[255,15],[255,80],[222,71]],hx('#37413f'));
  for(let i=0;i<7;i++) bracket(p,3+(i%2)*18,18+i*7,6+hash(i,16)*9);
  bracket(p,233,34,20); bracket(p,243,48,14);
  p.rect(0,66,p.w-1,p.h-1,water);
  // Perspective rows of split slabs, with water glimpsed between banks.
  const horizons=[66,70,76,84,94,107,123,143,169,201,240];
  for(let row=0;row<horizons.length-1;row++){
    const y=horizons[row],depth=horizons[row+1]-y,width=19+row*5;
    for(let col=-1;col*width<p.w+width;col++){
      const v=hash(col,row,365), x=col*width+(row%2)*width*.47;
      const c=mixc(hx('#354346'),hx('#56605a'),.28+.48*v);
      const notch=width*(.08+.13*v),drop=(hash(row,col,10)-.4)*depth*.32;
      face(p,[[x+notch,y+1],[x+width*.7,y+drop],[x+width-1,y+depth*.26],[x+width-1,y+depth*.65],[x+width*.74,y+depth-1],[x+width*.22,y+depth],[x+1,y+depth*.78],[x+2,y+depth*.4]],c);
      p.line(x+notch,y+1,x+width*.67,y+drop,mixc(c,hx('#7b8272'),.43));
      if(v>.68){
        const u=x+width*.22, h=y+depth*.43;
        p.ell(u,h,width*.13,depth*.09,hx('#47534b'));
        p.line(u-width*.08,h,u+width*.12,h-1,hx('#56644f'));
      }
      if(v<.24&&row>3){
        const u=x+width*.63,h=y+depth*.58;
        p.line(u-width*.12,h-1,u,h+2,hx('#344541'));p.line(u,h+2,u+width*.07,h+depth*.24,hx('#344541'));
      }
    }
  }
  // An inlet snakes past the near bank. Thin reflected cap gills break its surface.
  face(p,[[0,114],[16,117],[20,120],[30,122],[28,125],[40,129],[21,131],[13,128],[0,130]],water);
  p.line(0,114,16,117,hx('#71796a'));p.line(28,125,39,129,hx('#59675d'));
  for(let j=0;j<6;j++)p.line(5+j*4,120+j%2*3,8+j*4,120+j%2*3,hx('#53615f'));
  for(const [x,y,r] of [[0,73,16],[249,77,12],[12,165,9],[26,174,6],[237,187,10]])bracket(p,x,y,r);
  for(let i=0;i<15;i++){
    const x=2+hash(i,33)*29,y=82+hash(i,46)*17;
    p.line(x,y,x+hash(i,68)*4,y,hx('#536464'));
  }
}
export default function grotto(p:Px,t:number){
  if(!backdrop||backdrop.w!==p.w||backdrop.h!==p.h){backdrop=new Px(p.w,p.h);paint(backdrop);}
  p.data.set(backdrop.data);
  for(let i=0;i<3;i++){
    const a=2*Math.PI*t/3+i*2.1,x=(i===0?17:229+3*i)+2*Math.cos(a),y=38+5*i+3*Math.sin(a);
    p.set(x,y,mixc(hx('#535e52'),hx('#a4a179'),.5+.5*Math.sin(a)));
  }
}
