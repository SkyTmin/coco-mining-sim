import {ellFill,progress,scatter,shard} from '../fx/field';
import {fillPoly,type Pen} from '../fx/pen';
import {paintImpact,paintSocketTrail} from '../technique-fx';
import type {Creature,FxInput,XY} from '../types';
const tau=2*Math.PI;
const ice=['#274568','#478eab','#79d8de','#e4ffed'];
const green=['#1c555d','#418c85','#89ddb1','#e7ffcf'];
const blue=['#29496a','#4b8cbd','#9ad8ee','#e8fbfd'];
function flake(p:Pen,at:XY,r:number,a=1) {
  if(r<=0||a<=0)return;
  const [x,y]=at;
  ellFill(p,at,r+1,r+1,'#8be2e4',.2*a);
  for(let i=0;i<6;i++){
    const ang=i*tau/6-.52, dx=Math.cos(ang),dy=Math.sin(ang);
    for(const [offset,ink] of [[1,ice[0]],[0,ice[3]]] as const) {
      p.lineS(x,y+offset,x+dx*r,y+dy*r+offset,ink,a);
      if(r>=4)for(const side of [-1,1])
        p.lineS(x+dx*r*.58,y+dy*r*.58+offset,x+dx*r*.76-side*dy*r*.29,y+dy*r*.76+side*dx*r*.29+offset,ink,a);
    }
  }
}
function hoop(f:FxInput,n:number){
  const center:XY=[f.feet[0]+3,f.feet[1]-42];
  const u=progress(n,8,40),extent=tau*u, fade=1-progress(n,58,66);
  const angle=-Math.PI*.5;
  if(n>=8 && n<66){
    for(let k=0;k<3;k++){
      const palette=[ice,green,blue][k],rx=25+k*1.6,ry=33+k*1.9;
      for(let i=0;i<54;i++){
        const a=angle+i*tau/54,b=Math.min(angle+extent,a+tau/54+.015);
        if(b<=a)break;
        const p=Math.cos((a+b)*.5)<0 || n<47 ? f.under : f.above;
        for(let band=0;band<4;band++){
          const d=2.0-band*.92;
          p.lineS(center[0]+(rx+d)*Math.cos(a),center[1]+(ry+d)*Math.sin(a),
            center[0]+(rx+d)*Math.cos(b),center[1]+(ry+d)*Math.sin(b),
            palette[band],fade*(.86+.14*Math.cos(a*3+k)));
        }
      }
      if(n<41){
        const a=angle+extent,tip=f.points[['tailTipL','tailTip','tailTipR'][k]];
        const x=center[0]+rx*Math.cos(a),y=center[1]+ry*Math.sin(a);
        const mid:XY=[(tip[0]+x)/2,(tip[1]+y)/2+4*Math.sin(a+k)];
        f.under.lineS(...tip,...mid,palette[2],.8);
        f.under.lineS(...mid,x,y,palette[3],.8);
      }
    }
  }
  if(n>=58 && n<79){
    const u=progress(n,58,79);
    for(let i=0;i<11;i++){
      const a=i*tau/11;
      flake(f.above,[center[0]+(22+13*u)*Math.cos(a),center[1]+(31+12*u)*Math.sin(a)+16*u*u],(2.1+(i%3))*Math.sqrt(1-u),1-u);
    }
  }
  if(n>=60 && n<88){
    const u=progress(n,60,76),nose=f.points.mouth;
    const start:XY=[center[0]+12,center[1]-29],fade=1-progress(n,83,88);
    flake(f.above,[start[0]*(1-u)+(nose[0]+2)*u+7*Math.sin(Math.PI*u),start[1]*(1-u)+(nose[1]-5)*u-8*Math.sin(Math.PI*u)],5.2*fade,fade);
  }
}
// Each aurora strand follows the painted tip's recent track. Its bright spine and
// translucent hanging folds give the ribbon volume even where the tip banks sharply.
function aurora(f:FxInput,n:number,index:number,socket:string){
  const ramp=[ice,green,blue][index], stop=Math.min(31,n), start=Math.max(18,stop-6);
  const fade=1-progress(n,30,35);
  let previous:XY|undefined,previousDepth=0;
  for(let i=0;i<=15;i++){
    const u=i/15,t=(start+(stop-start)*u)/24;
    const tip=f.pointAt(t,socket);
    const y=tip[1]+Math.sin(u*Math.PI)*Math.sin(u*5+index)*1.8;
    const depth=Math.sin(u*Math.PI)**.65*(2.9+2.4*Math.sin(2.1*u+index)**2);
    if(previous){
      for(let band=0;band<3;band++){
        const a=band/3,b=(band+1)/3;
        f.above.col(ramp[2-band],fade*(.24+.68*u));
        fillPoly(f.above,[previous[0],previous[1]+previousDepth*a,tip[0],y+depth*a,
          tip[0],y+depth*b,previous[0],previous[1]+previousDepth*b]);
      }
      f.above.lineS(previous[0],previous[1],tip[0],y,ramp[3],fade*(.35+.63*u));
      if(i%4===1 && depth>1) {
        shard(f.above,tip[0]+1,y+depth+2,1.1,2,1,ramp[2],ramp[0],fade*.85);
        f.above.lineS(tip[0],y+1,tip[0]+1,y+depth,ramp[2],fade*.85);
      }
    }
    previous=[tip[0],y];previousDepth=depth;
  }
}
function breath(f:FxInput,n:number,alpha:number){
  const [x,y]=f.points.mouth, u=progress(n,23,30),span=32*u;
  const dir=x>=f.points.head[0]?1:-1;
  const curve=(q:number):XY=>[x+dir*span*q,y+span*(.32*q*q-.14*Math.sin(q*Math.PI))];
  // Cloudlets overlap to form a narrow throat and a ragged terminal plume. Soft
  // stepped colour stays behind the much harder, faceted grains of ice.
  for(let i=11;i>=0;i--){
    const q=i/11,[xx,yy]=curve(q),w=(.65+5*q)*u;
    const ripple=Math.sin(i*1.59-n*.41)*w*.65,ax=xx+dir*Math.sin(i*1.14+n*.25)*w*.32;
    ellFill(f.above,[ax,yy+ripple],w*1.15+.58,w*.82+.5,ice[0],alpha*.55);
    ellFill(f.above,[ax,yy+ripple-.7],w*.95+.6,w*.65+.5,ice[1],alpha*.85);
    ellFill(f.above,[ax,yy+ripple-1.05],w*.75+.5,w*.42+.5,ice[2],alpha*.91);
    if(i%2===0)shard(f.above,ax,yy+ripple-.8,dir*(w*.72+.7),-1,w*.30+.5,ice[3],green[2],alpha);
  }
  const [throatX,throatY]=curve(.28);
  f.above.lineS(x,y,throatX,throatY,ice[3],alpha);
  for(let i=0;i<12;i++){
    const q=((n*.075+i*.163)%1),[xx,yy]=curve(.38+q*.94);
    const yy1=yy+Math.sin(2.1*i+n*.18)*q*(6+6*u);
    if(i%4===0)flake(f.above,[xx,yy1],1.4+1.7*q,alpha*(1-q*.32));
    else shard(f.above,xx,yy1,dir*1.6,-1.4,1.2,ice[3],ice[1],alpha);
  }
}
export const effects:Creature['effects']=f=>{
  const n=f.t*24;
  if(f.anim==='trick'){hoop(f,n);return;}
  if(f.anim==='happy' && n>8 && n<38){
    for(const [i,socket] of ['tailTipL','tailTip','tailTipR'].entries()){
      const u=(n-8-i*2)%10/10;
      if(u>0)flake(f.under,[f.points[socket][0]-u*4,f.points[socket][1]-u*5],2.4*(1-u),.82);
    }
    return;
  }
  if(!f.anim.startsWith('tech_'))return;
  const sweep=f.anim==='tech_aurora', pounce=f.anim==='tech_pounce';
  const socket=sweep?'tailTip':pounce?'foreR':'mouth',hit=pounce?26:25;
  const wind=pounce?23:22;
  if(n>=wind && n<hit+5)paintSocketTrail(f,'above',socket,wind/24,Math.min(hit,n)/24,
    {color:ice[3],width:1.4,alpha:1-progress(n,hit,hit+5)});
  if(sweep && n>=18 && n<34) {
    for(const [i,s] of ['tailTipL','tailTip','tailTipR'].entries()) {
      aurora(f,n,i,s);
    }
  }
  if(!sweep&&!pounce && n>=23 && n<42)breath(f,n,1-progress(n,33,42));
  if(n<hit || n>=hit+20)return;
  const age=(n-hit)/24, at=f.pointAt(hit/24,socket),fade=1-progress(n,hit+7,hit+20);
  paintImpact(f,'above',socket,at,(p,x,y)=>flake(p,[x,y],(pounce?6:4)*fade,fade));
  if(pounce){
    for(let i=0;i<7;i++){
      const a=i*tau/7,r=(11+i%3*3)*progress(n,hit-1,hit+6);
      const x=at[0]+Math.cos(a)*r,y=at[1]+Math.sin(a)*r*.45;
      f.under.lineS(...at,x,y,ice[0],fade);f.under.lineS(at[0],at[1]+1,x,y+1,ice[3],fade);
    }
    scatter(f,at,age,130,9,ice,.7);
  } else if(sweep)scatter(f,at,age,170,6,green,.58);
};
