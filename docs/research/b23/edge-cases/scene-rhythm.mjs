// From tools/creatures: node --import tsx /path/to/scene-rhythm.mjs /tmp/edge-results
import {join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const output=process.argv[2];
const load=file=>import(pathToFileURL(join(process.cwd(),file)));
const {loadForHash}=await load('studio/snap.ts');
const {sizeOf}=await load('types.ts');
const {Px}=await load('rig/px.ts');
function count(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])n++;return n}
const data={};
for(const id of ['river_otter','bun_panda','eclipse_drake','threshold_keeper','moon_magician','pocket_magnet','lunar_plush','herald_griffin']){
    const f=JSON.parse(readFileSync(join(output,id+'.json'),'utf8'));
    const {c,s}=await loadForHash(id);
    const [w,h]=sizeOf(c),frames=[];
    for(let i=0;i<72;i++){const p=new Px(w,h);s(p,i/24);frames.push(p.data)}
    const sequential=frames.map((frame,i)=>count(frame,frames[(i+1)%72])).sort((a,b)=>a-b);
    const q=ratio=>sequential[Math.min(71,Math.floor(sequential.length*ratio))];
    const loops=f.loopChecks.map(x=>{
        const actual=count(frames[x.last],frames[x.reset]),continued=count(frames[x.last],frames[x.after]);
        return {clip:x.clip,frames:x.frames,first:x.reset,last:x.last,continuous:x.after,actual,continued,aboveP95:actual>q(0.95)};
    });
    data[id]={w,h,scene72:{min:sequential[0],median:q(0.5),p95:q(.95),max:sequential[71]},loops};
}
writeFileSync(join(output,'rhythm.json'),JSON.stringify(data,null,2)+'\n');
