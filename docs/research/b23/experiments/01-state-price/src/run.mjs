// Run from the checkout root. This process reads tracked data and prints one small JSON result.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {act,admission,bind,describe,initial,restore} from './world.mjs';

const tools=path.resolve('tools/creatures'), viewer=path.join(tools,'viewer');
const {createPetBehavior}=await import(pathToFileURL(path.join(viewer,'behavior.mjs')));
const ids=['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician'];
const read=f=>JSON.parse(readFileSync(f,'utf8'));
const rawRule=read(new URL('./rule.json',import.meta.url));
const readAtlas=id=>read(path.join(viewer,'atlases',id,'atlas.json'));
const readBehavior=id=>read(path.join(viewer,'atlases',id,'behavior.json'));
const atlas=readAtlas(rawRule.painting), config=readBehavior(rawRule.painting);
const rule=bind(rawRule,atlas);
const serialize=x=>JSON.stringify(x);
const sha=x=>createHash('sha256').update(serialize(x)).digest('hex');
const failures=[];
function check(name,test) { assert.ok(test,name); return name; }
function mustThrow(label,fn) {
  let failed=false; try{fn()}catch{failed=true}
  failures.push(check(label,failed));
}

const seed=config.seed;
const pet=createPetBehavior(config,atlas.animations,seed);
// Repeated input is only queued at a completed reaction; the native viewer cycles its f1 tricks.
let sample=pet.sample(), epoch=0, previous=sample, hit, after;
const beforeArc=[];
for (let tick=0;tick<4800 && !after;tick++) {
  if(tick%360===0) pet.event('skill_ready');
  sample=pet.advance(1/24);
  if(sample.anim!==previous.anim || (sample.anim===previous.anim && sample.frame<previous.frame)) epoch++;
  if(!hit && sample.anim===rule.clip && sample.frame===rule.frame) hit={sample,epoch,tick};
  if(hit && sample.anim!==hit.sample.anim) after={sample,epoch,tick};
  if(!hit && beforeArc.length<5 && sample.anim!==previous.anim) beforeArc.push([sample.anim,sample.tick]);
  previous=sample;
}
assert.ok(hit && after,'native plan must reach the real impact and then enter another clip');
const fresh=initial(rule), command={rule:rule.id,instance:hit.epoch};
const outcomes=[];
function expect(label,start,cmd,s,expected) {
  const untouched=serialize(start);
  const result=act(rule,start,cmd,s);
  assert.equal(serialize(start),untouched,label+' mutated input');
  assert.equal(result.status,expected,label);
  if (expected!=='applied') assert.equal(result.world,start,label+' not atomic');
  outcomes.push({label,status:result.status,before:start.charge,after:result.world.charge,marks:result.world.changed});
  return result.world;
}
const preflight=[];
for(const available of [0,1,3]) {
  const w=initial(rule,available);
  const readonly=serialize(w);
  const status=admission(rule,w);
  assert.equal(serialize(w),readonly);
  assert.equal(status,available<rule.cost?'insufficient':'eligible');
  preflight.push({available,status,chargeBeforeContact:w.charge});
}
const active=expect('native impact',fresh,command,hit.sample,'applied');
assert.deepEqual(active.changed,[rule.landmark]);
expect('same occurrence drawn again',active,command,hit.sample,'duplicate');
expect('different occurrence, empty resource',active,{...command,instance:command.instance+1},hit.sample,'insufficient');
expect('empty resource at start',initial(rule,0),command,hit.sample,'insufficient');
expect('forged negative price',fresh,{...command,cost:-4},hit.sample,'invalid');
expect('unknown action',fresh,{...command,rule:'other'},hit.sample,'invalid');
expect('fractional occurrence',fresh,{...command,instance:.5},hit.sample,'invalid');
expect('one tick before actual hit',fresh,command,{...hit.sample,frame:hit.sample.frame-1},'invalid');
expect('event on a different actual clip',fresh,command,after.sample,'invalid');
const funded=act(rule,initial(rule,3),command,hit.sample).world;
expect('already changed landmark, funds still sufficient',funded,{...command,instance:command.instance+1},hit.sample,'already-changed');
// The same native scene data continues to resolve to the same pixels even as the optional journal changes.
const nativeNextRow=atlas.clips[after.sample.anim][Math.min(after.sample.frame,atlas.clips[after.sample.anim].length-1)];
const shown=describe(after.sample,active);
const nextRowFromChanged=atlas.clips[shown.anim][Math.min(shown.frame,atlas.clips[shown.anim].length-1)];
assert.equal(sha(nativeNextRow),sha(nextRowFromChanged));
const presentation={currentAtlasRowWithNoRule:sha(nativeNextRow),currentAtlasRowWithChangedWorld:sha(nextRowFromChanged),
  visiblyChangedByCurrentAtlas:false};
const saved=serialize(active), restored=restore(saved,rule);
assert.deepEqual(describe(after.sample,active),describe(after.sample,restored));
assert.deepEqual(describe(after.sample,active).world,{charge:0,changed:[rule.landmark]});
expect('repeat after save and reopen',restored,command,hit.sample,'duplicate');
mustThrow('invalid save version',()=>restore(serialize({...active,version:2}),rule));
mustThrow('foreign painting save',()=>restore(serialize({...active,painting:'other'}),rule));
mustThrow('negative charge in save',()=>restore(serialize({...active,charge:-1}),rule));
mustThrow('unpaired marker in save',()=>restore(serialize({...active,applied:[]}),rule));
mustThrow('invalid source frame',()=>bind({...rawRule,hitIndex:99},atlas));
mustThrow('negative price in declaration',()=>bind({...rawRule,cost:-1},atlas));

function legacy(id,delta,seed) {
  const a=readAtlas(id);
  const native=a.behavior ? createPetBehavior(readBehavior(id),a.animations,seed) : null;
  let age=0;
  return () => {
    if(native) return native.advance(delta);
    // Painting without live behavior uses the viewer.sample(dt) frame-clock fallback.
    const name='life',fps=a.animations[name]?.fps??a.fps;
    age=(age+delta)%(a.clips[name].length/fps);
    return {anim:name,frame:Math.floor(age*fps)};
  };
}
// The display may sample infrequently, but world dispatch must visit every fixed simulation tick.
function replay(groups) {
  const actor=createPetBehavior(config,atlas.animations,seed);
  let previous=actor.sample(),world=initial(rule),epoch=0,tick=0,group=0;
  const accepted=[];
  while(tick<=after.tick) {
    const steps=groups[group++%groups.length];
    for(let n=0;n<steps && tick<=after.tick;n++,tick++) {
      if(tick%360===0) actor.event('skill_ready');
      const s=actor.advance(1/24);
      if(s.anim!==previous.anim || (s.anim===previous.anim && s.frame<previous.frame)) epoch++;
      if(s.anim===rule.clip && s.frame===rule.frame) {
        const result=act(rule,world,{rule:rule.id,instance:epoch},s);
        world=result.world;
        if(result.status==='applied') accepted.push({tick,epoch});
      }
      previous=s;
    }
  }
  return {world,accepted,lastTick:previous.tick};
}
const singleTick=replay([1]),bursty=replay([7,1,6,3,11]);
assert.deepEqual(singleTick,bursty);
assert.deepEqual(singleTick.world,active);
assert.equal(singleTick.accepted.length,1);
const skippedDisplayTickModulo4=(hit.tick+1)%4;
const missedByDisplayOnly=hit.tick%4!==skippedDisplayTickModulo4;
assert.ok(missedByDisplayOnly);
// A real coarse advance returns only the final visible sample. Compare to four individual simulation steps.
const coarseActor=createPetBehavior(config,atlas.animations,seed);
let startCoarse=coarseActor.sample();
const startTick=hit.tick-2, endTick=hit.tick+2;
assert.ok(startTick>=0);
for(let t=0;t<=startTick;t++) {
  if(t%360===0) coarseActor.event('skill_ready');
  startCoarse=coarseActor.advance(1/24);
}
assert.ok(!Array.from({length:4},(_,i)=>startTick+i+1).some(t=>t%360===0),'coarse interval crosses an external event');
const endCoarse=coarseActor.advance(4/24);
assert.equal(startCoarse.anim,rule.clip);
assert.equal(endCoarse.anim,rule.clip);
assert.ok(startCoarse.frame<rule.frame && endCoarse.frame>rule.frame);
const onlyEnd=act(rule,fresh,command,endCoarse);
assert.equal(onlyEnd.status,'invalid');
const coarseAdvance={seconds:4/24,from:startCoarse.frame,to:endCoarse.frame,crossed:rule.frame,
  returnedSampleKeys:Object.keys(endCoarse),sampleOnlyStatus:onlyEnd.status,
  sampleOnlyCharge:onlyEnd.world.charge,visitedTickCharge:active.charge};
const changedRule={...rule,id:'new-rule-version',cost:2};
const oldSaveAcceptedUnderNewRule=serialize(restore(saved,changedRule))===saved;
assert.ok(oldSaveAcceptedUnderNewRule);
const shiftedAnimation={...atlas.animations[rule.clip],hit:[rule.frame-1,...atlas.animations[rule.clip].hit]};
const shiftedAtlas={...atlas,animations:{...atlas.animations,[rule.clip]:shiftedAnimation}};
const shiftedBinding=bind(rawRule,shiftedAtlas);
assert.equal(shiftedBinding.frame,rule.frame-1);
const migrationControls={oldSaveAcceptedUnderNewRule,changedRuleId:changedRule.id,changedRuleCost:changedRule.cost,
  originalHit:rule.frame,afterInsertingEarlierValidHit:shiftedBinding.frame};
const scheduling={singleTick,batchedTicks:[7,1,6,3,11],sameAfterBatches:true,
  sampledEveryFourthTickAtResidue:skippedDisplayTickModulo4,missedByDisplayOnly,coarseAdvance};

const legacyResults=[];
const inputs=[];
for(const id of ids) {
  const a=readAtlas(id),runs=[];
  for(const name of (a.behavior?['atlas.json','behavior.json']:['atlas.json'])) {
    const file=path.relative(process.cwd(),path.join(viewer,'atlases',id,name));
    inputs.push({file,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')});
  }
  for(const runSeed of [3,7319]) {
    const reference=legacy(id,1/24,runSeed), experimental=legacy(id,1/24,runSeed);
    const before=createHash('sha256'),after=createHash('sha256');
    const clips=new Set();
    for(let i=0;i<1440;i++){
      const oldSample=reference(),candidate=describe(experimental(),undefined);
      const oldFrames=a.clips[oldSample.anim], newFrames=a.clips[candidate.anim];
      const originalRow=oldFrames?.[Math.min(oldSample.frame,oldFrames.length-1)];
      const newRow=newFrames?.[Math.min(candidate.frame,newFrames.length-1)];
      assert.ok(originalRow && newRow,id+'/'+i+' missing atlas row');
      before.update(serialize([oldSample,originalRow]));after.update(serialize([candidate,newRow]));
      clips.add(candidate.anim);
    }
    const control=before.digest('hex'),withDisabledRule=after.digest('hex');
    assert.equal(control,withDisabledRule,id+' changed legacy sequence');
    runs.push({seed:runSeed,ticks:1440,clipCount:clips.size,sha256:control});
  }
  legacyResults.push({id,mode:a.behavior?'native behavior.mjs':'atlas life frame clock',runs});
}
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
console.log(JSON.stringify({revision,node:process.version,painting:rawRule.painting,seed,
  binding:{clip:rule.clip,frame:rule.frame,sourceRowSHA256:sha(atlas.clips[rule.clip][rule.frame])},
  native:{beforeArc,impact:hit.sample,nextClip:after.sample},preflight,outcomes,invalidData:failures,presentation,scheduling,migrationControls,
  persistence:{saveBytes:Buffer.byteLength(saved),restored,next:describe(after.sample,restored).world},
  inputs,legacy:legacyResults},null,2));
