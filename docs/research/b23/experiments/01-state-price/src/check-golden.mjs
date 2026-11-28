// Run from tools/creatures with Node 22 and tsx. Each old painting releases its native cache on process exit.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const ids=['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician'];
const id=process.argv[2];
if(id) {
  assert.ok(ids.includes(id));
  const load=file=>import(pathToFileURL(path.resolve(file)));
  const {loadForHash}=await load('studio/snap.ts');
  const {compose}=await load('engine.ts');
  const {c,s,b}=await loadForHash(id);
  const ref=JSON.parse(readFileSync(path.join('golden',id+'.json'),'utf8'));
  const rows=[];
  for(const clip of ['idle','walk']) {
    const actual=createHash('sha1').update(compose(c,s,b,clip,0).picture.data).digest('hex').slice(0,10);
    assert.equal(actual,ref[clip][0],id+'/'+clip);
    rows.push({id,clip,frame:0,actual,expected:ref[clip][0]});
  }
  console.log(JSON.stringify(rows));
} else {
  const results=ids.flatMap(key=>JSON.parse(execFileSync(process.execPath,
    ['--import','tsx',fileURLToPath(import.meta.url),key],{encoding:'utf8'})));
  const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const trackedChanges=execFileSync('git',['status','--porcelain','--untracked-files=no','--',
    'c','golden','studio/snap.ts','engine.ts','rig','fx','scenes','viewer'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  console.log(JSON.stringify({revision,node:process.version,trackedChanges,results},null,2));
}
