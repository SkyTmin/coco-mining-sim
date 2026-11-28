// Baseline and candidate execute from private temporary trees; no accepted asset is opened for writing.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const [staging, output, revision, tree] = process.argv.slice(2);
const threshold=1e-7;
const selected=[
  ['astral_seer','trick',57],['pocket_magnet','trick',44],
  ['eclipse_drake','trick',62],['ember_panda','trick',66],
  ['bun_panda','trick',190],['crater_titan','tech_eruption',30],
  ['kettle_crab','trick',52],['moon_magician','trick',84],
];
const plus=(a,b)=>a.map((x,i)=>x+b[i]);
const minus=(a,b)=>a.map((x,i)=>x-b[i]);
const times=(a,k)=>a.map(x=>x*k);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>Math.hypot(...a);
const distance=(a,b)=>norm(minus(a,b));
const unit=a=>times(a,1/(norm(a)||1));
const hash=(content,alg='sha256')=>createHash(alg).update(content).digest('hex');
const hashObject=o=>hash(JSON.stringify(o));
const save=(name,data)=>writeFileSync(join(output,name),JSON.stringify(data,null,2)+'\n');
const at=(mode,name)=>import(pathToFileURL(join(staging,mode,'tools/creatures',name)));
const stablePoints=points=>Object.fromEntries(Object.entries(points).sort(([a],[b])=>a.localeCompare(b,'en')));
let state=0x71b25;
const uniform=(lo=0,hi=1)=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return lo+(hi-lo)*state/4294967296;
};
const vec=(lo,hi)=>Array.from({length:3},()=>uniform(lo,hi));

function geometry([a,b,l1,l2,pole],joint) {
  const d=minus(b,a),L=norm(d),u=unit(d);
  return {
    interior:L>Math.abs(l1-l2)+.01 && L<l1+l2-.01,
    poleDistance:norm(minus(pole,times(u,dot(pole,u)))),
    lengthError:Math.max(Math.abs(distance(a,joint)-l1),Math.abs(distance(b,joint)-l2)),
  };
}

const solvers={};
for(const mode of ['original','candidate'])
  solvers[mode]=(await at(mode,'kit/f11-mobkit.ts')).rawExperimentalIK;

const synthetic=[];
function add(category, params){synthetic.push({category,params})}
for(let k=0;k<2000;k++) {
  const a=vec(-25,25), dir=unit(vec(-1,1)), pole=unit(vec(-1,1));
  const l1=uniform(1,16),l2=uniform(1,16),reach=uniform(Math.abs(l1-l2)+.02,l1+l2-.02);
  add('reachable random',[a,plus(a,times(dir,reach)),l1,l2,pole]);
}
for(let k=0;k<128;k++) {
  const a=vec(-17,17),l=uniform(2,16),r=uniform(.5*l,1.5*l), s=k%2?-1:1;
  add('vertical parallel',[a,plus(a,[0,0,s*r]),l,l,[0,0,s]]);
  add('horizontal parallel',[a,plus(a,[s*r,0,0]),l,l,[s,0,0]]);
  add('vertical perpendicular',[a,plus(a,[0,0,s*r]),l,l,[0,1,0]]);
}
const sweep=[-.0002,-.000101,-.0001,-.000099,-.00001,-.000001,0,.000001,.00001,.000099,.0001,.000101,.0002];
for(const x of sweep)add('near vertical pole',[[3,-6,10],[3,-6,14],4,4,[x,0,1]]);
// Rotate the limb direction across vertical with a pole exactly along it.
for(const x of sweep){
  const d=unit([x,0,1]);add('near vertical limb',[[0,0,0],times(d,4),4,4,d]);
}
for(const [label,reach,l1,l2] of [['coincident equal',0,4,4],['coincident unequal',0,5,2],
 ['inside minimum reach',1,5,2],['exact extension',8,4,4],['outside maximum reach',10,4,4]])
 add('boundary '+label,[[0,0,0],[0,0,reach],l1,l2,[0,0,1]]);
const groups={}, transitions={};
for(const {category,params} of synthetic){
  const g=groups[category]??={n:0,changed:0,original_failed:0,candidate_failed:0,max_error:[0,0],finite:[true,true]};
  g.n++;
  const joints=Object.values(solvers).map(f=>f(...params));
  if(distance(...joints)>threshold)g.changed++;
  joints.forEach((joint,i)=>{
    const {lengthError}=geometry(params,joint);
    if(lengthError>threshold)g[i?'candidate_failed':'original_failed']++;
    g.max_error[i]=Math.max(lengthError,g.max_error[i]);g.finite[i]&&=joint.every(Number.isFinite);
  });
  if(category.startsWith('near ')) {
    const rows=transitions[category]??=[];
    rows.push({epsilon:sweep[rows.length],joints,
      movement:rows.length?joints.map((v,i)=>distance(v,rows.at(-1).joints[i])):null});
  }
}
save('synthetic.json',{threshold,seed:0x71b25,groups,transitions});

const summary={}, realArgs=[];
for(const mode of ['original','candidate']){
  const {loadPainting}=await at(mode,'render.ts');
  const {compose}=await at(mode,'engine.ts');
  const byId={};
  for(const [id,clip,focus] of selected){
    const {c,s,b}=await loadPainting(id);
    const golden=JSON.parse(readFileSync(resolve('golden',id+'.json')));
    const requests=[
      ['idle',0,0,'normal'],[clip,focus-1,0,'normal'],[clip,focus,0,'normal'],
      [clip,focus+1,0,'normal'],[clip,focus,4,'gold']
    ];
    const rows=[];
    for(const [anim,f,side,variant] of requests) {
      if(!c.animations[anim]||f>=Math.round(c.animations[anim].seconds*24))throw Error(id+'/'+anim+'/'+f);
      const jointHash=createHash('sha256');
      let calls=0,interior=0,fallback=0,bad=0,maxError=0;
      globalThis.__observeIK=(a,b,l1,l2,pole,joint)=>{
        const args=[a,b,l1,l2,pole],obs=geometry(args,joint);
        calls++; if(obs.poleDistance<1e-4)fallback++;
        if(obs.interior){interior++;maxError=Math.max(maxError,obs.lengthError);if(obs.lengthError>threshold)bad++;}
        jointHash.update(JSON.stringify(joint)+'\n');
        if(mode==='original' && realArgs.length<4096)realArgs.push(args);
      };
      const frame=compose(c,s,b,anim,f/24,side,variant);
      delete globalThis.__observeIK;
      const checkGolden=side===0 && variant==='normal';
      const actual=hash(frame.picture.data,'sha1').slice(0,10);
      const sockets=stablePoints(frame.points);
      rows.push({anim,f,side,variant,calls,interior,fallback,bad,maxError,
        jointSha:jointHash.digest('hex'),pointCount:Object.keys(sockets).length,
        pointsSha:hashObject(sockets),rgbaSha:hash(frame.picture.data),
        golden:checkGolden?actual===golden[anim][f]:null});
    }
    byId[id]=rows;
  }
  summary[mode]=byId;
}
save('real-frames.json',{revision,tree,node:process.version,threshold,summary});

const workloads={
  productionInputs:realArgs, randomInterior:synthetic.filter(r=>r.category==='reachable random').map(r=>r.params),
  singular:synthetic.filter(r=>r.category==='vertical parallel').map(r=>r.params),
};
const timings={};
for(const [name,args] of Object.entries(workloads)){
  if(!args.length)throw Error('No inputs for '+name);
  const timesByMode={original:[],candidate:[]};
  function run(mode,count) {
    let checksum=0;const start=performance.now(),solver=solvers[mode],n=args.length;
    for(let i=0;i<count;i++)checksum+=solver(...args[i%n])[1];
    return {ms:performance.now()-start,checksum};
  }
  for(const mode of Object.keys(solvers))run(mode,25000);
  for(let rep=0;rep<6;rep++){
    for(const mode of rep%2?['candidate','original']:['original','candidate'])
      timesByMode[mode].push(run(mode,60000));
  }
  const median=xs=>{const a=xs.map(r=>r.ms).sort((a,b)=>a-b);return (a[2]+a[3])/2;};
  timings[name]={arguments:args.length,callsPerRun:60000,rounds:6,mode:timesByMode,
    medianMs:{original:median(timesByMode.original),candidate:median(timesByMode.candidate)}};
}
save('cost.json',{node:process.version,revision,timings});
