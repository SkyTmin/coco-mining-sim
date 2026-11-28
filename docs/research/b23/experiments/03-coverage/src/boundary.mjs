// The real stock boundary on a zero-subject dispatcher and two multi-subject errors. No writes to golden.
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
const output=process.argv[2];
const prior=JSON.parse(readFileSync(join(output,'coverage.json')));
const first=prior.whole[0];
const other=prior.whole.find(row=>row.id!==first.id && first.declarations.some(([k])=>!row.declarations.some(([c])=>c===k)));
const single=first.declarations.find(([k])=>!other.declarations.some(([c])=>c===k))[0];
const flags=['--check','--force','--jobs','1'];
const cases=[
  {id:'zero-paintings',args:['--input-type=module','-e',"import {snapCommand} from './studio/snap.ts';await snapCommand(['all','--check','--force','--jobs','1'],[])"]},
  {id:'one-known-plus-one-unknown-id',args:['studio/ws.ts','snap',first.id+',nonexistent_subject_b25','idle',...flags]},
  {id:'real-clip-absent-on-one-actual-id',args:['studio/ws.ts','snap',first.id+','+other.id,single,...flags]}
];
const observations=[];
for (const test of cases) {
  const begin=performance.now();
  const run=spawnSync(process.execPath,['--import','tsx',...test.args],{encoding:'utf8'});
  if (run.error) throw run.error;
  const output=run.stdout+run.stderr;
  const lines=output.split('\n').filter(s=>s.includes('frames identical') || s.includes(' identical in ') || s.includes('Cannot find module') || s.includes('Error [')).map(s=>s.replaceAll(process.cwd(),'<tools/creatures>'));
  observations.push({id:test.id,args:test.args,exit:run.status,milliseconds:performance.now()-begin,lines});
}
writeFileSync(join(output,'native-boundaries.json'),JSON.stringify(observations,null,2)+'\n');
