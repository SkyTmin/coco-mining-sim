import assert from 'node:assert/strict';
import {planCoverage,runPlanned,auditCoverage} from './coverage.mjs';
const catalog=new Map([
 ['a',{live:{idle:1},reference:{idle:1}}],
 ['b',{live:{},reference:{}}]
]);
const cases=[];
for(const [label,ids,names] of [
 ['omitted-clips-means-all',['a'],[]],
 ['explicit-empty-string',['a'],['']],
 ['empty-set-of-paintings',[],['idle']],
 ['empty-painting-alone',['b'],[]],
 ['empty-painting-with-valid-neighbour',['a','b'],[]],
 ['reordered-with-duplicate',['b','a','a'],[]],
 ['typo-and-valid',['a'],['idle','typo']],
]) {
 const plan=planCoverage(catalog,ids,names);
 const res=await runPlanned(plan,async(id,clips)=>({rows:clips.map(clip=>({id,clip,count:1})),issues:[]}));
 cases.push({label,ok:res.ok,calls:res.calls,issues:res.issues,rows:plan.rows});
}
assert(cases[0].ok && !cases[1].ok && !cases[2].ok && !cases[3].ok && !cases[6].ok);
console.log(JSON.stringify(cases,null,2));

const mixedEmpty=cases.find(row=>row.label==='empty-painting-with-valid-neighbour');
assert.equal(mixedEmpty.ok,false);
assert.equal(mixedEmpty.calls,0);
assert(mixedEmpty.issues.some(issue=>issue.kind==='empty-clip-set'&&issue.id==='b'));
