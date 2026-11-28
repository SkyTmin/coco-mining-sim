import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const load = file=>import(pathToFileURL(join(process.cwd(),file)));
const {newCommand}=await load('studio/new.ts');
const {loadPainting}=await load('render.ts');
const {compose}=await load('engine.ts');
const {checkCardFile,cardRuntimeIssues}=await load('studio/card.ts');
const cases=JSON.parse(readFileSync('cases.json','utf8'));
for (const row of cases) {
  const {id,...options}=row;
  try {
    const args=[id,...Object.entries(options).flatMap(([key,val])=>["--"+key,val])];
    const savedLog=console.log;
    try { console.log=()=>{}; await newCommand(args); } finally {console.log=savedLog;}
    row.generated=true;
    row.schema=checkCardFile(id);
    const {c,s,b}=await loadPainting(id);
    row.runtime=cardRuntimeIssues(c);
    row.samples=[];
    for (const anim of ['idle','walk',...Object.keys(c.animations).filter(k=>k.startsWith('tech_')).slice(0,1)]) {
      const sample=compose(c,s,b,anim,Math.floor(c.animations[anim].seconds*12)/24);
      const px=sample.layers.body;let count=0,ax=px.w,ay=px.h,bx=-1,by=-1;
      for(let i=3;i<px.data.length;i+=4) if(px.data[i]>=128){
        count++;const q=(i-3)/4,x=q%px.w,y=Math.floor(q/px.w);
        ax=Math.min(ax,x);ay=Math.min(ay,y);bx=Math.max(bx,x);by=Math.max(by,y);
      }
      row.samples.push({anim,canvas:[px.w,px.h],pixels:count,bbox:[ax,ay,bx,by]});
    }
  } catch(e) {row.error=e.message;}
}
console.log(JSON.stringify(cases,null,2));
