// Run from a clean tools/creatures directory, with npm ci completed. All native commands use --check.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,renameSync,writeFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {auditCoverage,planCoverage,runPlanned} from './coverage.mjs';

const output=resolve(process.argv[2]);
const onlyPocket=process.argv[3]==='pocket';
const ids=onlyPocket ? ['pocket_magnet'] : ['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician'];
mkdirSync(output,{recursive:true});
const local=name=>import(pathToFileURL(resolve(name)).href);
// Cold metadata preparation includes imports and JSON reads but no calls to hashRange/hashCreature or render workers.
const startPreparation=performance.now();
const {loadPainting}=await local('render.ts');
const {frameCount}=await local('engine.ts');
const {lifeCycleCount}=await local('motion.ts');
const catalog=new Map(), references=new Map();
for (const id of ids) {
  const {c}=await loadPainting(id);
  const golden=JSON.parse(readFileSync(join('golden',id+'.json'),'utf8'));
  references.set(id,golden);
  const live=Object.fromEntries(Object.entries(c.animations).map(([clip,animation])=>[clip,frameCount(animation.seconds)*(clip==='life'?lifeCycleCount(c):1)]));
  catalog.set(id,{live,reference:Object.fromEntries(Object.entries(golden).map(([clip,hashes])=>[clip,hashes.length]))});
}
const prepMs=performance.now()-startPreparation;
const {hashCreature,compareGolden}=await local('studio/snap.ts');
const result={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,ids,prep_ms:prepMs,metadata_inputs:catalog.size,cases:[],whole:[],negative_controls:[],timing:{}};
function save() {
  const dest=join(output,onlyPocket?'pocket-accepted.json':'coverage.json');
  writeFileSync(dest+'.part',JSON.stringify(result,null,2)+'\n');renameSync(dest+'.part',dest);
}
function legacy(id,clips) {
  const start=performance.now();
  const cp=spawnSync(process.execPath,['--import','tsx','studio/ws.ts','snap',id,...clips,'--check','--force','--jobs','1'],{encoding:'utf8'});
  if (cp.error) throw cp.error;
  const text=cp.stdout+cp.stderr;
  const match=text.match(/(\d+) frames identical/);
  return {exit:cp.status,milliseconds:performance.now()-start,confirmed:match?Number(match[1]):null,log:text.trim()};
}
let renderCalls=0;
async function compute(id,clips) {
  renderCalls++;
  const hashes=await hashCreature(id,clips,1);
  const issues=compareGolden(references.get(id),hashes,clips);
  return {rows:Object.entries(hashes).map(([clip,data])=>({id,clip,count:data.length})),issues};
}
function noRender() {throw Error('Unexpected call to native render on an invalid request');}
for (const id of ids) {
  const full=planCoverage(catalog,[id],[]);
  assert.deepEqual(full.issues,[]);
  const count=full.rows.reduce((n,row)=>n+row.count,0);
  result.whole.push({id,clips:full.rows.length,frames:count,declarations:full.rows.map(({clip,count})=>[clip,count])});
  const valid=planCoverage(catalog,[id],['idle']);
  const dup=planCoverage(catalog,[id],['idle','idle']);
  assert.deepEqual(valid,dup);
  for (const [kind,clips] of Object.entries({valid:['idle'],typo:['idlee'],mixed:['idle','idlee'],empty_argument:['']})) {
    const current=legacy(id,clips);
    const t=performance.now(),beforeCalls=renderCalls;
    const candidate=await runPlanned(planCoverage(catalog,[id],clips),kind==='valid'?compute:noRender);
    const wall=performance.now()-t;
    assert.equal(candidate.ok,kind==='valid');
    assert.equal(renderCalls-beforeCalls,kind==='valid'?1:0);
    if (kind==='valid') {assert.equal(current.exit,0);assert.equal(current.confirmed,valid.rows[0].count);}
    result.cases.push({id,kind,request:clips,legacy:current,candidate:{milliseconds:wall,render_calls:renderCalls-beforeCalls,...candidate}});
    save();
  }
  console.log('Recorded',id);
}
function control(kind,issues) {
  assert(issues.length>0,kind+' should fail');result.negative_controls.push({kind,issues});
}
async function rejects(kind,plan) {
  const r=await runPlanned(plan,noRender);assert.equal(r.calls,0);control(kind,r.issues);
}
await rejects('zero-paintings',planCoverage(catalog,[],[]));
await rejects('one-known-plus-one-unknown-id',planCoverage(catalog,[ids[0],'nonexistent_subject_b25'],['idle']));
await rejects('one-empty-declaration',planCoverage(new Map([['blank',{live:{},reference:{}}]]),['blank'],[]));
if (ids.length>1) {
  const subset=Object.keys(catalog.get(ids[0]).live).find(clip=>ids.some(id=>!Object.hasOwn(catalog.get(id).live,clip)));
  assert(subset);await rejects('real-clip-absent-on-some-actual-ids',planCoverage(catalog,ids,[subset]));
}
const sample=[{id:ids[0],clip:'A',count:5},{id:ids.at(-1),clip:'B',count:9}];
control('missing-record',auditCoverage(sample,sample.slice(0,1)));
control('short-record',auditCoverage(sample,[sample[0],{...sample[1],count:8}]));
control('same-total-wrong-distribution',auditCoverage(sample,[{...sample[0],count:9},{...sample[1],count:5}]));
control('duplicate-record',auditCoverage(sample,[...sample,sample[0]]));
const changedCatalog=new Map([['fixture',{live:{newOnly:5,changed:4},reference:{oldOnly:5,changed:7}}]]);
await rejects('new-removed-and-resized-clips',planCoverage(changedCatalog,['fixture'],[]));
assert.deepEqual(auditCoverage(sample,sample.toReversed()),[]);
// Repeated plans from loaded metadata. Batch averages avoid treating timer quantization as per-call timing.
const workloads={one_valid:()=>planCoverage(catalog,[ids[0]],['idle']),all_idles:()=>planCoverage(catalog,ids,['idle']),all_clips:()=>planCoverage(catalog,ids,[]),mixed:()=>planCoverage(catalog,ids,['idle','idlee'])};
for (const [name,fn] of Object.entries(workloads)) {
  const ms=[];let checked=0;
  for (let batch=-1;batch<31;batch++) {
    const begin=performance.now();
    for (let i=0;i<100;i++) checked+=fn().rows.length;
    if (batch>=0) ms.push((performance.now()-begin)/100);
  }
  ms.sort((a,b)=>a-b);
  result.timing[name]={batches:31,per_batch:100,median_ms:ms[15],p95_ms:ms[29],min_ms:ms[0],max_ms:ms[30],checked};
}
save();
