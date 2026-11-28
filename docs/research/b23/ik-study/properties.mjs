// Run from tools/creatures with node --import tsx /path/to/properties.mjs.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
const moduleAt = path => import(pathToFileURL(resolve(path)).href);
const { ik } = await moduleAt('kit/f11-mobkit.ts');
const { simulate } = await moduleAt('fx/sim.ts');
const seed = 0x71b25;
let state = seed;
function uniform(lo = 0, hi = 1) {
  state = (Math.imul(state,1664525) + 1013904223) >>> 0;
  return lo + (hi - lo) * state / 4294967296;
}
const unit = v => v.map(x => x / Math.hypot(...v));
const dist = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
const plus = (a,b) => a.map((x,i)=>x+b[i]);
const times = (a,k) => a.map(x=>x*k);
const eps = 1e-7;
const results = {};
function check(category, ok, example) {
  const row = results[category] ??= { tested: 0, failed: 0 };
  row.tested++;
  if (!ok) {
    row.failed++;
    if (row.first === undefined) row.first = example;
  }
}
const v = (lo, hi) => Array.from({length:3},()=>uniform(lo,hi));
function jointCase(label,a,b,l1,l2,pole) {
  const knee=ik(a,b,l1,l2,pole);
  const actual=[dist(a,knee),dist(b,knee)];
  const error=Math.max(Math.abs(actual[0]-l1),Math.abs(actual[1]-l2));
  check(label,error<=eps,{a,b,l1,l2,pole,knee,actual,error});
  return knee;
}
for(let n=0;n<2000;n++){
  const a=v(-25,25), dir=unit(v(-1,1)), pole=unit(v(-1,1));
  const l1=uniform(1,16),l2=uniform(1,16);
  const reach=uniform(Math.abs(l1-l2)+0.01,l1+l2-0.01);
  const b=plus(a,times(dir,reach));
  const k=jointCase('IK reachable, general orientation',a,b,l1,l2,pole);
  const delta=v(-50,50);
  const moved=ik(plus(a,delta),plus(b,delta),l1,l2,pole);
  check('IK translated, general orientation',dist(plus(k,delta),moved)<=eps,{a,b,l1,l2,pole,delta,k,moved});
}
for(let n=0;n<128;n++){
  const l=uniform(2,16),reach=uniform(l*.5,l*1.5);
  const sign=n%2 ? -1 : 1;
  jointCase('IK reachable, vertical collinear pole',[0,0,0],[0,0,sign*reach],l,l,[0,0,sign]);
  jointCase('IK reachable, horizontal collinear pole',[0,0,0],[sign*reach,0,0],l,l,[sign,0,0]);
  jointCase('IK reachable, vertical perpendicular pole',[0,0,0],[0,0,sign*reach],l,l,[0,1,0]);
}
const flat=x=>58, particleKinds=['spark','grit','shard','drip','chunk'];
for(let n=0;n<96;n++){
  const recipe=Array.from({length:6},()=>({
    kind:particleKinds[Math.floor(uniform(0,particleKinds.length))],
    x:uniform(0,144),y:uniform(4,52),vx:uniform(-50,50),vy:uniform(-35,35),
    delay:uniform(0,.13),life:uniform(.3,1.15),gravity:uniform(.1,1.6),bounce:uniform(.1,.8)
  }));
  const options={ground:flat,seed:n}, timesToTest=[.251,.767,.013,.512,1.01,.251];
  for(const time of timesToTest){
    const plain=simulate(time,recipe,options);
    const cached=simulate(time,recipe,{...options,cache:true});
    check('Particles cached seek equals independent uncached seek',isDeepStrictEqual(plain,cached),{n,time});
    for(const particle of cached.particles){
      check('Particles center on or above flat floor',particle.y <= 58+eps,{n,time,particle});
    }
  }
}
console.log(JSON.stringify({seed,eps,results,verticalExample:ik([0,0,0],[0,0,4],4,4,[0,0,1])},null,2));
