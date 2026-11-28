// Usage: node compare.mjs FOLDER_WITH_PLATFORM_JSON OUTPUT.json
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
const [dir,file]=process.argv.slice(2);
if(!dir||!file)throw Error('Pass an input directory and an output report');
const labels=['linux','macos','windows'];
const runs=Object.fromEntries(labels.map(k=>{
  const p=join(dir,k+'.json');
  try { return [k,JSON.parse(readFileSync(p,'utf8'))]; }
  catch(e){return [k,{runner:k,status:existsSync(p)?'invalid-report':'missing-report',errors:[{stage:'delivery',detail:String(e)}]}];}
}));
const pairs=[];
const nativeOS={linux:'linux',macos:'darwin',windows:'win32'};
function key(row){return JSON.stringify(row.slice(0,3));}
for(let i=0;i<labels.length;i++) for(let j=i+1;j<labels.length;j++){
  const a=runs[labels[i]],b=runs[labels[j]];
  const sameInputs=typeof a.planSha256==='string' && a.planSha256===b.planSha256 &&
    a.control===b.control && a.lockSha256===b.lockSha256 && a.samplerSha256===b.samplerSha256 &&
    a.node==='v22.14.0' && b.node==='v22.14.0' && a.runner===labels[i] && b.runner===labels[j] &&
    a.os===nativeOS[labels[i]] && b.os===nativeOS[labels[j]];
  const right=new Map((b.actual??[]).map(r=>[key(r),r[3]]));
  const shared=sameInputs?(a.actual??[]).filter(r=>right.has(key(r))):[];
  const diffs=shared.filter(r=>r[3]!==right.get(key(r))).map(r=>[...r,right.get(key(r))]);
  const complete=sameInputs && shared.length===287 && a.actual.length===287 && b.actual.length===287;
  pairs.push({runners:[labels[i],labels[j]],sameInputs,compared:shared.length,
    matching:shared.length-diffs.length,differences:diffs.length,examples:diffs.slice(0,16),
    conclusion:!sameInputs||shared.length===0?'not-comparable':!complete?'partial':diffs.length?'different':'identical'});
}
const result={schema:1,pairs,runs};
mkdirSync(dirname(file),{recursive:true});
writeFileSync(file,JSON.stringify(result)+'\n');
console.log('B25_PLATFORM_PAIRS '+JSON.stringify(pairs));
for(const [k,v] of Object.entries(runs)) console.log(k,v.status,v.errors?.length??0,'errors');
