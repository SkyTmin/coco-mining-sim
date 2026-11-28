// Run from tools/creatures. Build contact sheets for a small, identified subset.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const {loadForHash}=await import(pathToFileURL(resolve('studio/snap.ts')));
const {compose}=await import(pathToFileURL(resolve('engine.ts')));
const {createCanvas}=createRequire(resolve('package.json'))('@napi-rs/canvas');
const dest=process.argv[2];mkdirSync(dest,{recursive:true});
for(const [id,clip,n,roi] of [['lunar_plush','life',578,[30,36,90,78]],['lunar_plush','fidget_b',16,[50,85,28,28]],['zephyr_whorl','sleep',18,[50,60,26,46]]]){
  const {c,s,b}=await loadForHash(id); const imgs=[n-1,n,n+1].map(i=>compose(c,s,b,clip,i/24,0,'normal').picture);
  const {w,h}=imgs[0];const [x,y,rw,rh]=roi, box=Math.max(w,4*rw),can=createCanvas(3*box,h+4*rh+22);const ctx=can.getContext('2d');
  ctx.fillStyle='#242429';ctx.fillRect(0,0,can.width,can.height);ctx.imageSmoothingEnabled=false;
  imgs.forEach((img,i)=>{const ref=img.canvas();ctx.drawImage(ref,box*i,0);ctx.drawImage(ref,x,y,rw,rh,box*i,h+22,rw*4,rh*4);ctx.fillStyle='white';ctx.font='13px sans-serif';ctx.fillText(id+' '+clip+'/'+(n-1+i),box*i+3,h+15);});
  writeFileSync(join(dest,id+'-'+clip+'.png'),can.toBuffer('image/png'));
}
