// Usage: node probe.mjs CONTROL/tools/creatures PATH/sample-diversity.mjs OUTPUT.json
// Uses stock Node to preserve an independent diagnosis when tsx or the native binding fails.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { arch, platform, release, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const [controlArg, samplerArg, outputArg] = process.argv.slice(2);
if (!controlArg || !samplerArg || !outputArg) throw Error('Pass control, sampler, and output file');
const control=resolve(controlArg), sampler=resolve(samplerArg), output=resolve(outputArg);
const bases=[['idle',[0,0.25,0.5,0.75]],['walk',[0,1/3,2/3]]];
const hex=x=>createHash('sha256').update(x).digest('hex');
const message=e=>String(e?.message??e).replaceAll(/\s+/g,' ').slice(0,1300);
const env=process.env;
const record={schema:1,runner:env.B25_OS??platform(),os:platform(),arch:arch(),kernel:release(),
  image:env.ImageOS??null,imageVersion:env.ImageVersion??null,runnerArch:env.RUNNER_ARCH??null,
  node:process.version,abi:process.versions.modules,napi:process.versions.napi,
  workflowCommit:env.GITHUB_SHA??null,control:null,samplerSha256:null,lockSha256:null,
  npm:env.B25_NPM_VERSION??null,setup:env.B25_SETUP??'local',install:env.B25_INSTALL??'local',
  expected:[],actual:[],errors:[],status:'not-comparable'};
const started=Date.now();
let workspace;
function checkpoint() {
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(record)+'\n');
}
function fail(stage,error,id) {record.errors.push({stage,...(id?{id}:{}),detail:message(error)});}
function nativeMetadata(require) {
  const canvas=require('@napi-rs/canvas');
  if(canvas.createCanvas(1,1).width!==1) throw Error('Native canvas smoke test failed');
  const files=Object.keys(require.cache).filter(x=>x.endsWith('.node') && /canvas/i.test(x));
  return {version:require('@napi-rs/canvas/package.json').version,binary:files.map(basenameSafe),
    binarySha256:files.map(x=>hex(readFileSync(x))),tsx:require('tsx/package.json').version};
}
function basenameSafe(p){return basename(p);}
checkpoint();
try {
  record.control=spawnSync('git',['-C',control,'rev-parse','HEAD'],{encoding:'utf8'}).stdout?.trim()??null;
  // Windows Git may write CRLF. Keep the actual file SHA and a canonical LF hash for input comparison.
  const fingerprint = p => {
    const bytes=readFileSync(p);
    return {disk:hex(bytes),lf:hex(bytes.toString('utf8').replaceAll('\r\n','\n'))};
  };
  const samplingSource=fingerprint(sampler),lock=fingerprint(join(control,'package-lock.json'));
  record.samplerSha256=samplingSource.lf; record.samplerDiskSha256=samplingSource.disk;
  record.lockSha256=lock.lf; record.lockDiskSha256=lock.disk;
  const ids=readdirSync(join(control,'golden')).filter(x=>x.endsWith('.json')).sort().map(x=>x.slice(0,-5));
  for(const id of ids) {
    const golden=JSON.parse(readFileSync(join(control,'golden',id+'.json')));
    for(const [clip,phases] of bases) for(const phase of phases) {
      const count=golden[clip]?.length;
      if(!count) throw Error('Absent golden clip '+id+'/'+clip);
      const n=Math.floor(count*phase);
      record.expected.push([id,clip,n,golden[clip][n]]);
    }
  }
  record.planSha256=hex(JSON.stringify(record.expected));
  if(record.control!=='d6ebb3145d47d6bed85b088ec30b0b2faa82da6f') throw Error('Wrong control revision '+record.control);
  if(ids.length!==41 || record.expected.length!==287) throw Error('Wrong catalog size');
  if(record.setup==='failure'||record.install==='failure'||record.install==='skipped') throw Error('setup='+record.setup+', npm ci='+record.install);
  if(process.version!=='v22.14.0') throw Error('Expected v22.14.0');
  record.native=nativeMetadata(createRequire(join(control,'package.json')));
  workspace=mkdtempSync(join(tmpdir(),'b25-phases-'));
  for(const id of ids) {
    if(Date.now()-started>20*60*1000) {fail('timeout','20-minute rendering budget reached before '+id);break;}
    const exec=spawnSync(process.execPath,['--import','tsx',sampler,workspace,id],{
      cwd:control,env:{...env,B25_RECORD_MISMATCH:'1'},encoding:'utf8',timeout:120000,maxBuffer:1024*1024
    });
    if(exec.status!==0) {
      fail('render',exec.error??('exit '+exec.status+' '+(exec.stderr??'').slice(-1100)),id);
      checkpoint();continue;
    }
    try {
      const rows=JSON.parse(readFileSync(join(workspace,id,'frames.json')));
      const plan=record.expected.filter(x=>x[0]===id);
      if(rows.length!==plan.length || rows.some((v,i)=>v.clip!==plan[i][1]||v.frame!==plan[i][2]||
          v.expected!==plan[i][3]||!/^[0-9a-f]{10}$/.test(v.hash))) throw Error('Output differs from declared sample for '+id);
      for(const v of rows) record.actual.push([id,v.clip,v.frame,v.hash]);
    } catch(e) {fail('coverage',e,id);}
    rmSync(join(workspace,id),{recursive:true,force:true});
    checkpoint();
  }
  record.matches=record.actual.filter(x=>record.expected.some(y=>x.every((v,i)=>v===y[i]))).length;
  record.status=record.actual.length!==record.expected.length?'partial':
    record.matches===record.expected.length?'matches-golden':'differs-from-golden';
} catch(e) {fail('preflight',e);}
finally {
  if(workspace) rmSync(workspace,{recursive:true,force:true});
  record.elapsedMs=Date.now()-started;
  checkpoint();
  console.log('B25_PLATFORM_RESULT '+JSON.stringify(record));
}
