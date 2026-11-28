import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {proj} = await import(pathToFileURL(resolve('rig/f15-rig.ts')));
function measure(a,b) {
  const p=proj(a,0,0), q=proj(b,0,0);
  return {intrinsic: Math.hypot(...b.map((e,i)=>e-a[i])),screen:Math.hypot(q[0]-p[0],q[1]-p[1])};
}
const a=[0,0,0],e=[10,0,0];
const result={
  source:'rig/f15-rig.ts#proj',
  turn:[measure(a,e),measure(a,[0,8,6])],
  folded:[{segments:[measure(a,e),measure(e,[20,0,0])],shoulderToWrist:measure(a,[20,0,0])},
          {segments:[measure(a,e),measure(e,[10,10,0])],shoulderToWrist:measure(a,[10,10,0])}],
  thresholds:[-1.01,-1,-0.99,0.99,1,1.01].map(delta=>{const m=measure(a,[10+delta,0,0]);return {delta,measured:m.intrinsic,flag:Math.abs(m.intrinsic-10)>1}}),
  translated:measure([11,-3,7],[21,-3,7])
};
writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
