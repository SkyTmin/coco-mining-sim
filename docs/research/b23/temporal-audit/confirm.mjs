// Run from tools/creatures. Decode original RGBA only for equal-neighbour candidates.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const {loadForHash}=await import(pathToFileURL(resolve('studio/snap.ts')));
const {compose}=await import(pathToFileURL(resolve('engine.ts')));
const [input,output]=process.argv.slice(2), data=JSON.parse(readFileSync(input,'utf8'));
let id=null, p=null; const result=[];
const sign=buf=>createHash('sha1').update(buf).digest('hex').slice(0,10);
for (const hit of data.hits){
  if(id!==hit.id){id=hit.id;p=await loadForHash(id);}
  const [pre,mid,post]=[-1,0,1].map(d=>compose(p.c,p.s,p.b,hit.clip,(hit.frame+d)/24,0,'normal').picture);
  const bytes=[pre,mid,post].map(x=>Buffer.from(x.data));
  const matches=[hit.neighbour,hit.middle,hit.neighbour].every((g,i)=>sign(bytes[i])===g);
  let changed=0,minX=pre.w,minY=pre.h,maxX=-1,maxY=-1;
  for(let k=0;k<pre.w*pre.h;k++){
    const j=4*k;
    if(bytes[0].readUInt32LE(j)===bytes[1].readUInt32LE(j)) continue;
    changed++;const x=k%pre.w,y=Math.floor(k/pre.w);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  result.push({...hit,w:pre.w,h:pre.h,fingerprints:matches,neighboursIdentical:bytes[0].equals(bytes[2]),changed,box:[minX,minY,maxX,maxY]});
}
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
