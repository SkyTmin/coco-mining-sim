// Run from tools/creatures. This reads the accepted atlas without writing it.
import fs from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {createPetBehavior,validateBehavior}=await import(pathToFileURL(resolve('viewer/behavior.mjs')));
const read=file=>JSON.parse(fs.readFileSync('viewer/atlases/pocket_magnet/'+file));
const {animations}=read('atlas.json'), original=read('behavior.json');
const alternate={...original, seed:original.seed+2**32};
const first=createPetBehavior(original,animations), second=createPetBehavior(alternate,animations);
let different=0;
for(let i=0;i<1440;i++)if(JSON.stringify(first.advance(1/24))!==JSON.stringify(second.advance(1/24)))different++;
console.log({seeds:[original.seed,alternate.seed],issues:validateBehavior(alternate,animations),different});
for(const events of [['tap'],['approach'],['tap','approach'],['approach','tap']]){
  const pet=createPetBehavior(original,animations);
  pet.event('double_tap');
  let state=pet.sample();
  for(let i=0;i<1700;i++){state=pet.advance(1/24);if(state.anim==='trick'&&state.frame===60)break}
  if(state.anim!=='trick'||state.frame!==60)throw Error('Did not reach the scheduled test frame');
  const accepted=events.map(e=>pet.event(e));
  let waited=0;
  while(state.anim==='trick'&&waited<200){state=pet.advance(1/24);waited++}
  console.log({events,accepted,waited,firstResponse:state.anim});
}
