import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.argv[2];
const module = name => import(pathToFileURL(path.join(root,name)));
const {loadPainting} = await module('render.ts');
const {withPointsOnly} = await module('rig/figure.ts');
const {Rig} = await module('rig/f15-rig.ts');
const original = Rig.prototype.cap;
const sources = new WeakMap();
Rig.prototype.cap = function(a,b,...args) {
 const index = this.prims.length;
 const result = original.call(this,a,b,...args);
 if (this.prims.length > index) {
   const stack = new Error().stack.split('\n').find(s => s.includes(root) && !s.includes('/rig/f15-rig.ts'));
   const file = stack?.match(/tools\/creatures\/(.+?\.ts:\d+):\d+/)?.[1];
   sources.set(this.prims[index], {file,raw:[a,b]});
 }
 return result;
};
const ids = fs.readdirSync(path.join(root,'golden')).filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5)).sort();
const results = [];
for (const id of ids) {
 const {c} = await loadPainting(id);
 const samples = {};
 const move = c.animations.trick ? 'trick' : (Object.keys(c.animations).find(x=>x.startsWith('tech_')) ?? 'walk');
 for (const [key,anim,t,side] of [['idle','idle',0,0],['idleQuarter','idle',0,4],['move',move,c.animations[move].seconds/2,0]]) {
  const body = withPointsOnly(()=>c.frame(anim,t,side,'normal',{headSide:side,gaitPhase:t,pointsOnly:false}));
  samples[key] = (body.rig?.prims ?? []).filter(p=>p.k===1).map(p=>({tag:p.t??'',file:sources.get(p)?.file,pre:sources.get(p)?.raw,final:[p.a,p.b]}));
 }
 results.push({id,move,samples});
}
fs.writeFileSync(process.argv[3],JSON.stringify(results));
