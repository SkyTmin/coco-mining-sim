// Run in tools/creatures. Keep the report and mapping away from reviewers until retrospective scoring.
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const arg = process.argv[2];
if (!arg) throw Error('Pass a fresh output directory');
const out = resolve(arg), viewers = join(out,'viewers');
mkdirSync(viewers,{recursive:true});
const subjects = ['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda',
  'crater_titan','kettle_crab','moon_magician'];
let seed=0x190bd0bc;
for(let i=subjects.length-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);
  [subjects[j],subjects[i]]=[subjects[i],subjects[j]];
}
const local=path=>import(pathToFileURL(resolve(path)).href);
const {loadPainting}=await local('render.ts');
const {compose}=await local('engine.ts');
const {createCanvas}=createRequire(resolve('package.json'))('@napi-rs/canvas');
const map=[];
for(const [idx,id] of subjects.entries()){
  const {c,s,b}=await loadPainting(id);
  const anim=c.animations.trick?'trick':Object.keys(c.animations).find(k=>k.startsWith('tech_'));
  if(!anim)throw Error(id+' lacks any gesture to sample');
  const count=Math.round(c.animations[anim].seconds*24);
  const frames=Array.from({length:9},(_,j)=>Math.round(j*(count-1)/8));
  const pictures=frames.map(n=>compose(c,s,b,anim,n/24,0,'normal').picture);
  const {w,h}=pictures[0], canvas=createCanvas((w+4)*3,(h+17)*3);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#1c2328';ctx.fillRect(0,0,canvas.width,canvas.height);
  pictures.forEach((p,j)=>{
    const x=(j%3)*(w+4),y=Math.floor(j/3)*(h+17);
    ctx.drawImage(p.canvas(),x,y);ctx.font='12px sans-serif';ctx.fillStyle='#ece8e0';
    ctx.fillText(String(frames[j]),x+3,y+h+13);
  });
  const key=String.fromCharCode('A'.charCodeAt(0)+idx);
  writeFileSync(join(viewers,key+'.png'),canvas.toBuffer('image/png'));
  map.push({key,id,anim,frames,w,h,total:count,side:0,variant:'normal'});
}
writeFileSync(join(out,'identity.json'),JSON.stringify(map,null,2)+'\n');
