import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStage5} from './stage5-config.mjs';
const names=['rebirth','events','income','fx','music','qualityRules','worlds','game','sounds'];
const config=Object.fromEntries(names.map(k=>[k,JSON.parse(readFileSync(new URL(`../src/shared/Config/${k}.json`,import.meta.url)))]));
assert.deepEqual(validateStage5(config),[]);
for (const mutate of [
 c=>c.rebirth.ranks[1].cups=1,
 c=>c.rebirth.ranks[4].lift=2,
 c=>c.rebirth.ranks[4].lift=11,
 c=>c.rebirth.cups[5]=0,
 c=>c.events.streak.tiers[2]=1,
 c=>c.events.streak.cap=80,
 c=>c.events.streak.multipliers[1]=1,
 c=>c.events.vein.minSeconds=1000,
 c=>c.events.bomb.minSeconds=1000,
 c=>c.fx.quality.debris[1]=1,
 c=>c.game.storage.isolatedPlaces=[0],
 c=>c.game.storage.isolatedPlaces=[1,1],
 c=>c.game.storage.studioPrefix=c.game.storage.livePrefix,
 c=>c.music.worlds[0].base='https://invalid',
 c=>c.sounds.eventAtlasId='bad',
]) {
 const broken=structuredClone(config);mutate(broken);assert.ok(validateStage5(broken).length);
}
console.log('Stage 5 config: valid configuration and 15 invalid cases passed');
