import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire(resolve('tools/creatures/package.json'));
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const output = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(output, { recursive: true });

const W = 384, H = 320, frames = 200, fps = 16;
const ink = '#1a3335', brass = '#d6aa73';
const paths = (d, fill, stroke = 'none', w = 1, more = '') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${more}/>`;
const group = (transform, content) => `<g transform="${transform}">${content}</g>`;
const oval = (x,y,rx,ry,fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const line = (d, color, width) => paths(d,'none',color,width);
const nums = n => Array.from({length:n}, (_,i)=>i);
const sin = Math.sin;
const smooth = x => { x = Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const ramp = (t,a,b) => smooth((t-a)/(b-a));
const grad = (id,colors,x2="0%",y2="100%") => `<linearGradient id="${id}" x2="${x2}" y2="${y2}">${colors.map(([p,c])=>`<stop offset="${p}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
const defs = `<defs>
${grad('sky',[[0,'#0b313b'],[44,'#286465'],[73,'#9ba17d'],[100,'#f4bd77']])}
${grad('body',[[0,'#cbe2ad'],[26,'#71ab97'],[58,'#387778'],[83,'#214e5d'],[100,'#242e40']],'75%','100%')}
${grad('back',[[0,'#78b49e'],[32,'#317175'],[100,'#233849']])}
${grad('head',[[0,'#fcdb94'],[33,'#e9c18d'],[65,'#bc876a'],[100,'#654951']],'100%','75%')}
${grad('wing',[[0,'#a4c3a3'],[24,'#669c91'],[54,'#487b79'],[78,'#355767'],[100,'#263a4c']],'100%','85%')}
${grad('pinion',[[0,'#98b7a1'],[34,'#507d80'],[79,'#344b64'],[100,'#202f42']],'35%','100%')}
${grad('crest',[[0,'#f8dfa2'],[46,'#d78b6f'],[78,'#ab6569'],[100,'#604e64']],'100%','90%')}
${grad('stone',[[0,'#3f625c'],[35,'#29484a'],[100,'#182f38']])}

<clipPath id="picture"><rect x="9" y="9" width="366" height="302" rx="34"/></clipPath>
</defs>`;
function leaf(x,y,a,s,color) {
  return group(`translate(${x} ${y}) rotate(${a}) scale(${s})`,paths('M0 0 Q-13 -9 -5 -31 Q-2 -48 2 -52 Q5 -28 10 -19 Q10 -7 0 0Z',color)+line('M0 -1 Q-2 -27 2 -48','#d0be89',.6));
}
function background() {
  let s = paths('M0 0H384V320H0Z','url(#sky)');
  s += oval(269,100,75,75,'#a4baa1')+oval(270,100,71,71,'#b4c5a8');
  for(let j=0;j<70;j++){
    const a=j*2.4,r=64*Math.sqrt((j+1)/71);
    s+=`<g opacity=".15">${line(`M${269+r*Math.cos(a)} ${100+r*sin(a)}l${2+j%4} -1`,'#6f9e96',.8)}</g>`;
  }
  s += paths('M-10 134Q45 101 89 115T172 113T251 116T343 102T399 105V255H-10Z','#7d9d91')+
       paths('M-10 159Q36 129 74 141T154 135T231 147T303 139T404 126V244H-10Z','#547f77')+
       paths('M-10 175Q66 145 113 168Q154 151 208 163Q248 166 274 156Q319 169 396 145V263H-10Z','#376865');
  let twigs='';
  for(let i=0;i<22;i++) {
    const x=(i*53+9)%381,y=151+(i%4)*5, ht=7+(i%7)*2;
    twigs+=paths(`M${x-4} ${y+4}l4 ${-ht}l5 ${ht}Z`,i%2?'#628a7f':'#709487');
  }
  s+=twigs;
  s+=paths('M-6 226Q56 222 92 237Q122 248 160 239Q225 217 251 229Q294 243 396 216L396 329H-6Z','url(#stone)');
  s+=paths('M-8 267Q79 254 138 263Q211 267 259 247Q312 241 398 254L399 329H-8Z','#263c41');
  s+=line('M26 268Q73 251 125 260M171 262Q217 257 251 246M296 244Q330 241 367 248','#8d9980',1.5);
  // Slender reeds and two overhanging leaves frame the unobstructed gesture.
  for(const flip of [false,true]){
    let border='';
    for(let i=0;i<6;i++){
      let x=8+i*3,base=279-i*3,top=124+i*17;
      border+=line(`M${x} ${base}Q${x+17} ${top+55} ${x+8+i} ${top}`,'#294f4c',1.6);
      border+=leaf(x+9+i,top+11,16+i*3,.4+i*.033,'#436a60');
      border+=leaf(x+11,top+41,-38,.36,'#567267');
    }
    s+=flip?group('translate(384 0) scale(-1 1)',border):border;
  }
  s+=paths('M4 47Q39 40 61 20Q76 10 81 4H7Z','#213f41');
  s+=line('M14 48Q46 41 72 16M14 54Q43 51 58 34','#a39770',.85);
  s+=paths('M214 6Q241 15 259 31Q295 43 311 56Q290 54 276 65Q253 57 251 44Q239 28 219 24Z','#244e4d',ink,1.6)+
     line('M226 16Q250 25 263 42Q281 50 309 56M258 37Q257 47 276 61M268 43Q281 42 294 48','#91a084',1.3);
  s+=paths('M301 6Q323 30 360 31L381 65V3Z','#203e40');
  // Static irregular grain binds the gradients and flat silhouette layers.
  for(let i=0;i<610;i++){
    const x=(i*97.731+17.2)%383,y=(i*i*11.13+i*91.92)%319;
    s+=`<g opacity="${i%2?.20:.13}">${line(`M${x} ${y}l${i%4===0?2.2:.8} -.3`,i%2?'#d1cba5':'#123d40',.68)}</g>`;
  }
  return s;
}
const bg=background();
function border(){
  let s='<rect x="3" y="3" width="378" height="314" rx="36" fill="none" stroke="#493c39" stroke-width="7"/><rect x="7.5" y="7.5" width="369" height="305" rx="33" fill="none" stroke="#c49b65" stroke-width="2"/><rect x="11" y="11" width="362" height="298" rx="29" fill="none" stroke="#716e58" stroke-width="1"/>';
  for(const flip of [false,true]){
    let curl=line('M11 73Q11 35 35 25Q18 43 25 57Q20 54 17 59M17 44Q43 15 66 14','#c7a477',1.25)+paths('M23 43Q24 32 37 26Q34 37 23 43Z','#ad9775');
    s+=flip?group('translate(384 0) scale(-1 1)',curl):curl;
  }
  s+=line('M44 300Q97 299 130 305M254 305Q287 299 340 300','#ba9a75',1.3);
  for(let i=0;i<9;i++){const x=170+i*5.5,h=i===4?4.5:1.8;s+=paths(`M${x-2} 305l2 ${-h}l2 ${h}l-2 ${h}Z`,brass);}
  return s;
}
const outer=border();
function feet(t) {
  const bend=ramp(t,3.1,4.3)-ramp(t,5.2,7), c='#c59771';
  let out='';
  for(const [x,y,k] of [[140,222,.88],[159,222,1]]){
    out+=group(`translate(${x} ${y}) scale(${k})`,
      paths(`M-5 -2Q-4 7 -7 14L${-6-3*bend} 20L-4 29Q-4 32 -6 33L-16 36Q-18 39 -12 38L-2 36L6 38L12 38Q11 36 6 34L1 32L0 19L4 3Z`,c,ink,1.55)+line('M-7 16L-2 15M-6 20L-2 19M-5 24L-1 23','#795c4f',1));
  }
  return out;
}
function tail(t,bodyY) {
  let out='';
  for(let i=0;i<4;i++){
    const tipx=37+i*9,tipy=242+i*7+3*sin(t*1.45-i*.72),h=bodyY*.42;
    out+=paths(`M140 ${186+i*4} Q109 ${211+h} 86 ${226+i*2} Q64 ${244+h} ${tipx} ${tipy} Q${tipx+11} ${tipy+13} 89 ${247+i*3} Q119 241 154 210Z`,i%2?'#376168':'#425a69',ink,1.65);
    out+=line(`M131 203Q98 233 85 ${236+i*2}T${tipx+2} ${tipy+1}`,'#c39973',.95);
    out+=paths(`M${tipx+8} ${tipy+4}q7 -4 14 -5q-6 7 -14 5Z`,'#d9b781');
  }
  return out;
}
function torso(by,t){
  const shape='M168 124C177 129 180 146 185 158C191 179 185 199 173 214Q166 225 164 233L155 229L153 234L146 228L143 232Q131 220 124 219L120 223Q113 206 114 185Q108 166 124 149Q137 133 155 132Z';
  let s=paths(shape,'url(#body)',ink,2.3)+
    paths('M126 150Q139 134 154 134Q147 152 143 170T148 206Q132 205 126 195Q118 180 126 150Z','url(#back)')+
    paths('M178 154Q188 175 180 193Q177 205 168 210L169 202L161 207Q168 192 166 183L160 185Q166 163 171 153Z','#b2bba0');
  for(let i=0;i<5;i++)s+=line(`M${154+i*3.6} ${198+i%2*3}q2 8 -3 14`,'#587a72',.75);
  for(let i=0;i<7;i++) {const x=168+(i%3)*4,y=166+Math.floor(i/3)*7;s+=paths(`M${x} ${y}q3 1 3 3q-3 1 -3 -3Z`,'#e4ce99');}
  return group(`translate(0 ${by})`,s);
}
function face(t,by,look,shock) {
  let nod=3*sin(t*1.2)+look*18-shock*27, lift=-3*shock;
  let s='';
  // Ribbon plumes belong to the skull and drag a little behind its turn.
  for(let i=0;i<3;i++){
    s+=group(`rotate(${(i-1)*13 + 4*sin(t*1.2-i*.35)-8*shock} 177 105)`,
      paths('M179 108C158 103 146 87 125 92Q129 82 153 84Q139 74 122 69Q151 61 170 78Q179 91 185 100Z','url(#crest)',ink,1.6)+
      line('M177 103Q164 80 133 72M163 87Q155 86 147 87','#f4ce9d',1.1));
  }
  s+=paths('M166 137Q150 129 154 116C148 110 155 95 166 89Q179 80 195 88Q210 89 218 104Q223 120 210 131Q200 139 190 138Q188 148 181 153L178 147L172 152L171 145L164 149Z','url(#head)',ink,2.4);
  s+=paths('M155 117Q151 107 158 99Q168 83 184 87Q198 86 204 92Q182 90 174 99C168 103 169 115 160 122Z','#608e83');
  s+=paths('M164 130Q176 123 184 129Q194 134 207 125Q202 139 190 139L182 148L180 139L173 145L172 137Z','#f1d8a9');
  s+=paths('M202 112Q214 106 222 115L237 125Q230 129 216 126L205 123L200 118Z','#544653',ink,1.55);
  s+=paths('M208 113Q218 111 224 117L235 124L214 119Z','#e0aa76');
  s+=line('M213 122Q222 125 231 125','#e6c38f',.7);
  s+=paths('M169 127Q167 118 161 116Q158 120 161 130Z','#b77766')+line('M161 125L167 127','#eed2a1',.8);
  const blink=Math.max(0,1-Math.abs(t-1.15)*8,1-Math.abs(t-9.75)*8);
  s+=group(`translate(191 107) scale(1 ${1-.92*blink})`,
    paths('M-13 1Q-11 -8 -2 -9Q6 -10 12 -4Q10 5 4 8Q-7 9 -13 1Z','#eee4c2',ink,1.65)+
    oval(1+3*look,-.3+2*look,6.2,7.2,'#263f42')+oval(2+3*look,1+2*look,3.9,5.1,'#16292c')+
    oval(0+3*look,-3+2*look,1.9,1.8,'#fff1c4')+oval(4+3*look,3+2*look,.85,.85,'#a8bcb2'));
  s+=line(`M178 ${98-3*shock}Q188 ${89-4*shock} 201 97`,'#2c5050',2.2);
  s+=paths('M182 119Q195 120 202 115Q196 123 185 123Z','#d89575')+
     line('M171 100Q170 107 164 112M170 112L163 118M170 117L166 122','#ead5a1',.9);
  s+=nums(4).map(i=>oval(190+2.5*i,124-i*.8,.75,.65,'#86695c')).join('');
  return group(`translate(0 ${by+lift}) rotate(${nod} 169 141)`,s);
}
function wing(t,by,spread) {
  const shake=(ramp(t,7,7.3)-ramp(t,8.3,8.9))*sin(t*15)*1.1;
  const angle=124-119*spread + .9*sin(t*1.6) + shake;
  const stretch=.49+.51*spread;
  let s='';
  for(let i=7;i>=0;i--) {
    const len=151-i*7.3, bend=13-i*.6, half=12.8-i*.25;
    const feather=paths(`M0 0 Q${len*.42} -9 ${len*.72} ${-half} Q${len*.91} ${-half} ${len} ${-6} C${len*.93} 1 ${len*.81} ${bend} ${len*.6} ${half+1} Q${len*.3} 14 0 4Z`,'url(#pinion)',ink,1.5)+
      line(`M10 2Q${len*.66} 3 ${len-3} -5`,'#caac80',1.05)+
      paths(`M${len*.75} -3Q${len*.81} -12 ${len*.9} -8Q${len*.86} -1 ${len*.75} -3Z`,'#b2b893')+
      paths(`M${len*.8} -5q5 -3 9 -2q-3 3 -9 2Z`,'#377272');
    s+=group(`rotate(${i*(2.1+2*spread)})`,feather);
  }
  s+=paths('M-7 -5Q3 -11 18 -10Q42 -13 68 -10Q59 0 53 2L55 6L43 8L42 12L31 12L30 15L19 12Q5 13 -6 5Z','url(#wing)',ink,1.5);
  s+=line('M0 -4Q20 -11 53 -8M8 2Q23 -2 40 -4','#b7c69c',1.0);
  for(let i=0;i<8;i++){const x=10+(i%4)*8, y=3+Math.floor(i/4)*4-(i%4)*.7;s+=paths(`M${x} ${y}q3 1 6 -2q-1 5 -6 2Z`,'#c1b58e');}
  return group(`translate(156 ${154+by}) rotate(${angle}) scale(${stretch} ${.68+.32*spread})`,s);
}
function lamp(t,heat) {
  const h=(13+14*heat)*(1+.07*sin(t*6.4)), x=285, y=240;
  let s=oval(x,259,22,4,'#1a3438');

  s+=paths('M265 241Q280 237 303 240L299 246Q298 251 289 253L288 257Q298 259 296 260L274 260Q275 258 282 256L282 253Q270 252 266 246Z','#b58c63',ink,1.5)+
     paths('M266 241Q284 244 303 240Q300 246 287 246T266 241Z','#f8c787')+
     line('M272 248Q280 253 293 250M279 257Q283 258 288 257','#846e57',.9)+
     line('M285 241q2 -6 1 -9','#392f39',1.9);
  s+=group(`translate(${x} ${y-3}) scale(${.7+.3*heat} 1)`,
    paths(`M0 1C-12 -3 -8 -11 -4 ${-h*.66}Q0 ${-h*.88} ${4+2*sin(t*4.8)} ${-h}Q1 ${-h*.53} 7 ${-h*.46}Q14 -6 4 -1Z`,'#ef9e52')+
    paths(`M-1 1Q-7 -6 -2 ${-h*.59}Q0 ${-h*.42} 3 ${-h*.72}Q2 ${-h*.37} 6 -6Q7 0 -1 1Z`,'#ffedaa'));
  return s;
}
function droplet(x,y,scale=1) {
  return group(`translate(${x} ${y}) scale(${scale})`,paths('M0 -6C-1 -2 -4 0 -3 3Q-2 6 1 5Q6 4 4 0Z','#d9f1d7','#3d696a',1.05)+line('M-1.5 0Q-2 2 -1 3','#f2f1cd',.9));
}
function wingEdge(t,spread,by,lean) {
  const shake=(ramp(t,7,7.3)-ramp(t,8.3,8.9))*sin(t*15)*1.1;
  const rot=(124-119*spread+.9*sin(t*1.6)+shake)*Math.PI/180;
  const leanRad=lean*Math.PI/180;
  const localX=151*(.49+.51*spread), localY=-6*(.68+.32*spread);
  const endX=156+localX*Math.cos(rot)-localY*Math.sin(rot);
  const endY=154+by+localX*Math.sin(rot)+localY*Math.cos(rot);
  const project=(x,y)=>[151+(x-151)*Math.cos(leanRad)-(y-223)*Math.sin(leanRad),
                       223+(x-151)*Math.sin(leanRad)+(y-223)*Math.cos(leanRad)];
  const [startX,startY]=project(156,154+by), [tipX,tipY]=project(endX,endY);

  return {startX,startY,tipX,tipY};
}
function rain(t,spread,by,lean) {
  const {startX,startY,tipX,tipY}=wingEdge(t,spread,by,lean);
  const a=ramp(t,1.1,4.9)*(1-ramp(t,9.4,11.7));
  let s='';
  if(t<2.45)s+=droplet(306,61+2*ramp(t,.3,2.45),.45+.52*ramp(t,.1,2.45));
  if(t>=2.45 && t<3.22){let f=(t-2.45)/.77;s+=droplet(306-21*f,63+153*f*f,1.85);}
  if(t>=3.22&&t<3.62){let f=(t-3.22)/.40;
    for(let j=0;j<4;j++)s+=oval(285+(j-1.5)*12*f,223-18*sin(f*Math.PI)+7*Math.abs(j-1.5),1.5*(1-f),2*(1-f),'#d3eee0');
  }
  for(let i=0;i<33;i++){
    const x0=25+(i*79)%342, y=(i*97+t*(155+(i%4)*17))%304;
    const x=x0-y*.075;
    if(a<.02||x<17||x>369||y<20||y>263||a<(i%5)*.14)continue;
    if(spread>.60 && x>startX && x<tipX && y>startY+(tipY-startY)*(x-startX)/(tipX-startX))continue;
    s+=line(`M${x} ${y}l-1.1 ${7+i%4}`,'#b9d9c3',.6+i%3*.23);
  }
  if(spread>.80 && t<11.9) {

    for(let i=0;i<2;i++){
      let f=(t*1.75+i*.5)%1;
      s+=droplet(tipX+f*9,tipY+(258-tipY)*f*f,.34+.20*spread);
    }
    let f=(t*1.75+.1)%1;s+=oval(tipX+9,259,2+12*f,.8,'#77a699');
  }
  return `<g opacity="${a*.72+.26}">${s}</g>`;
}
function pose(t) {
  const breathe=1.3*sin(t*1.72);
  const shock=ramp(t,3.08,3.32)-ramp(t,3.54,4.16);
  const look=ramp(t,1.4,2.4)-.32*ramp(t,5.5,6.7)-.24*ramp(t,10.2,11.4);
  const spread=ramp(t,4.05,5.24)-.54*ramp(t,10.95,12.4);
  const crouch=ramp(t,3.53,4.02)-ramp(t,4.04,4.9);
  const by=breathe+7.5*crouch-3.1*shock+2*ramp(t,9.4,10.7);
  const lean=2.3*crouch+8.2*spread-3.8*shock;
  return {look,shock,spread,by,lean};
}
function flameHistory(hasWing) {
  let heat=1;
  return nums(frames).map(i=>{
    const t=i/fps, {spread,by,lean}=pose(t);
    const edge=wingEdge(t,spread,by,lean);
    const sheltered=hasWing && edge.startX<285 && edge.tipX>285 && edge.tipY<223;
    if(t<3.4) heat=1-.89*ramp(t,3.17,3.4);
    else heat=Math.min(1, Math.max(.07,heat+((sheltered||t>11.6)?.5:-.024)/fps));
    return heat;
  });
}
const heatWithWing=flameHistory(true), heatWithoutWing=flameHistory(false);
function render(t) {
  const {look,shock,spread,by,lean}=pose(t);
  const heat=heatWithWing[Math.round(t*fps)];
  let scene='';
  for(let i=0;i<22;i++){
    const r=(47*heat+13)*(22-i)/22;
    scene+=`<g opacity="${.009+i*.0014}">${oval(285,226,r,r*1.09,'#efb862')}</g>`;
  }
    // The feet stay planted while weight shifts through the hips and shoulder.
  const shift=`rotate(${lean} 151 223)`;
  scene+=feet(t)+group(shift,tail(t,by)+torso(by,t)+face(t,by,look,shock))+lamp(t,heat)+group(shift,wing(t,by,spread));
  const pool=ramp(t,4.9,10.8);
  scene+=oval(312,261,2+17*pool,1.45*pool,'#7bb1a4')+oval(317,262.2,13*pool,.65*pool,'#c1c8a8');
  scene+=rain(t,spread,by,lean);
  scene+=paths('M4 287Q30 273 50 267Q41 280 18 291Q44 287 60 282Q44 298 19 299Z','#284140');
  scene+=paths('M366 289Q351 273 341 272Q343 281 358 291Q343 283 332 283Q343 295 365 299Z','#29413d');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 384 320">${defs}<g clip-path="url(#picture)">${scene}</g>${outer}</svg>`;
}
const paper=await loadImage(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="320">${defs}<rect width="384" height="320" fill="#252e32"/><g clip-path="url(#picture)">${bg}</g></svg>`));
const canvas=createCanvas(W,H), ctx=canvas.getContext('2d');
const moments=[0,50,55,64,74,87,115,193];
const sheet=createCanvas(W*4,H*2), sh=sheet.getContext('2d');
async function draw(i){
  const im=await loadImage(Buffer.from(render(i/fps)));
  ctx.drawImage(paper,0,0);ctx.drawImage(im,0,0);
}
const sampled=[];
for(const i of moments){await draw(i);sampled.push(Buffer.from(ctx.getImageData(0,0,W,H).data));}
const palette=quantize(Buffer.concat(sampled),256);
const gif=GIFEncoder();
for(let i=0;i<frames;i++){
  await draw(i);
  const rgba=ctx.getImageData(0,0,W,H).data;
  const delay=Math.round((i+1)*100/fps)*10-Math.round(i*100/fps)*10;
  gif.writeFrame(applyPalette(rgba,palette),W,H,{palette:i===0?palette:undefined,repeat:-1,delay});
  if(moments.includes(i)){
    const pos=moments.indexOf(i); sh.drawImage(canvas,(pos%4)*W,Math.floor(pos/4)*H);
  }
}
gif.finish();
writeFileSync(join(output,'paper-portrait.gif'),gif.bytesView());
writeFileSync(join(output,'paper-portrait-sheet.png'),sheet.toBuffer('image/png'));

console.log(JSON.stringify({frames,fps,atSeconds:7,flameWithWing:heatWithWing[7*fps],flameWithoutWing:heatWithoutWing[7*fps]}));
