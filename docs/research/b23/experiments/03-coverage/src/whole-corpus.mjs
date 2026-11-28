// Additional metadata-only control for the stock `snap all --check` selection, including its experimental exclusion.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {planCoverage} from './coverage.mjs';
const field=file=>JSON.parse(readFileSync(file,'utf8'));
const load=file=>import(pathToFileURL(resolve(file)).href);
const begin=performance.now();
const {creatureIds}=await load('studio/cache.ts');
const {loadPainting}=await load('render.ts');
const {frameCount}=await load('engine.ts');
const {lifeCycleCount}=await load('motion.ts');
const candidates=creatureIds();
const ids=[],excluded=[],catalog=new Map();
for (const id of candidates) {
  const config=resolve('c',id+'.studio.json');
  if (existsSync(config) && field(config).experimental===true) {excluded.push(id);continue;}
  ids.push(id);
  const {c}=await loadPainting(id);
  const golden=resolve('golden',id+'.json');
  const histogram=existsSync(golden) ? Object.fromEntries(Object.entries(field(golden)).map(([clip,hashes])=>[clip,hashes.length])) : {};
  const live=Object.fromEntries(Object.entries(c.animations).map(([clip,spec])=>[clip,frameCount(spec.seconds)*(clip==='life'?lifeCycleCount(c):1)]));
  catalog.set(id,{live,reference:histogram});
}
const plan=planCoverage(catalog,ids,[]);
const observed={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,source_ids:candidates.length,selected:ids,experimental_excluded:excluded,pairs:plan.rows.length,frames:plan.rows.reduce((s,row)=>s+row.count,0),issues:plan.issues,ms:performance.now()-begin,render_calls:0};
writeFileSync(process.argv[2],JSON.stringify(observed,null,2)+'\n');
