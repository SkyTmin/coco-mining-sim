// Run in tools/creatures. Compare the canonical body mask against its frame-centred crop.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const {PNG}=createRequire(resolve('package.json'))('pngjs');
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {loadPainting}=await import(pathToFileURL(resolve('render.ts')));
const {compose}=await import(pathToFileURL(resolve('engine.ts')));
const rows=JSON.parse(readFileSync(process.argv[2],'utf8')).paintings;
const checks=[];
for(const id of ['penguin_marshal','threshold_keeper','pocket_magnet']){
  const row=rows.find(x=>x.id===id);
  const {c,s,b}=await loadPainting(id);
  const {picture,layers}=compose(c,s,b,row.clip,row.frame/24,0,'normal');
  const {w,h,data}=layers.body, cx=Math.floor(w/2),cy=Math.floor(h/2);
  let all=0,inside=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(data[(y*w+x)*4+3]<128)continue;
    all++;
    if(x>=cx-22 && x<cx+22 && y>=cy-18 && y<cy+18)inside++;
  }
  const png=new PNG({width:w,height:h}); png.data=Buffer.from(data);
  writeFileSync(join(dirname(process.argv[2]),id+'-cpu-body.png'),PNG.sync.write(png));
  checks.push({id,clip:row.clip,frame:row.frame,native:[picture.w,picture.h],layer:[w,h],all,inside});
}
console.log(JSON.stringify(checks,null,2));
