import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv from 'ajv';
import { compose } from '../engine';
import { attachPetBehavior, placement, reelChapters } from '../motion';
import { Px } from '../rig/px';
import { petClipIssues } from '../studio/pet-gate';
import type { Animation, Border, Creature, MotionPlan, Scene } from '../types';
import { createPetBehavior, interruptFrames, petDirections, validateBehavior, type BehaviorConfig } from '../viewer/behavior.mjs';

const schema = JSON.parse(readFileSync(new URL('../bodies/behavior.schema.json', import.meta.url), 'utf8'));
const ordinary = JSON.parse(readFileSync(new URL('../../../assets/creatures/meadow_colossus/behavior.json', import.meta.url), 'utf8'));
const names = ['tech_one', 'tech_two', 'tech_three', 'tech_four', 'tech_five'];
const config: BehaviorConfig = {
  ...ordinary, field: [256, 208], stops: [[0.5, 0.75], [0.33, 0.82], [0.6, 0.8]],
  walkShare: [0.35, 0.48], attacks: names, lifeAttacks: names.slice(0, 3), attackInterval: undefined,
  attackBounds: { tech_two: [0.55, 0.7, 0.65, 0.85] },
};
function animation(seconds: number, name: string, loop = false): Animation {
  return { seconds, loop, interrupt: interruptFrames(Math.round(seconds * 24), name) };
}
const durations: Record<string, number> = {
  idle: 3, look: 1.5, fidget_a: 2, fidget_b: 2, happy: 2, trick: 4.5,
  sleep_in: 1, sleep: 3, sleep_out: 1, wake_startled: 1, hatch: 2, turn: 4, tired: 2,
  phase: 1.75, 'idle-f2': 3, ...Object.fromEntries(names.map(n => [n, n === 'tech_two' ? 2.75 : 1.5])),
  ...Object.fromEntries(petDirections.map(d => ['walk_' + d, 1])),
};
const clips = Object.fromEntries(Object.entries(durations).map(([name, seconds]) => [
  name, animation(seconds, name, ['idle', 'idle-f2', 'sleep'].includes(name) || name.startsWith('walk_')),
]));
const plan: MotionPlan = {
  stride: config.stride, yaw: config.yaw, beats: config.stops.map(at => ({ at, anim: 'idle', seconds: 1 })),
};
const actor: Creature = {
  id: 'ranked_fixture', theme: 'grove', rarity: 'legendary', animations: clips,
  frame(anim, t) {
    const body = new Px(8, 12);
    const transformed = anim === 'phase' ? t * 24 / (clips.phase.seconds * 24 - 1) : Number(anim === 'idle-f2');
    body.rect(1, 2, 6, 10, [140, Math.round(120 * transformed), 60, 255]);
    return { px: body, primitives: 1, anchor: [4, 10], eye: null, points: {} };
  },
};
const scene: Scene = (p) => p.rect(0, 0, p.w - 1, p.h - 1, [40, 50, 60, 255]);
const border: Border = {wood:['#222222', '#444444', '#666666', '#888888'], accent:'#888888'};

test('a legendary life walks the floor, finishes every selected attack and holds both phase seams', () => {
  const validate = new Ajv().compile(schema);
  for (const count of [3, 4]) {
    const behavior = { ...config, lifeAttacks: names.slice(0, count) };
    assert.ok(validate(behavior), JSON.stringify(validate.errors));
    assert.deepEqual(validateBehavior(behavior, clips), []);
    const c = attachPetBehavior(actor, plan, behavior);
    const machine = createPetBehavior(behavior, c.animations);
    const frames = Array.from({ length: 720 }, (_, i) => i ? machine.advance(1 / 24) : machine.sample());
    const starts = frames.filter(row => row.anim.startsWith('tech_') && row.frame === 0);
    assert.deepEqual(starts.map(row => row.anim), behavior.lifeAttacks);
    assert.deepEqual(starts[1].at, config.stops[2]);
    for (const start of starts) {
      const count = clips[start.anim].seconds * 24;
      assert.deepEqual(frames.slice(start.tick, start.tick + count).map(row => row.frame),
        Array.from({ length: count }, (_, k) => k));
    }
    const walks = frames.filter(row => row.anim.startsWith('walk_'));
    assert.ok(walks.length >= 720 * behavior.walkShare[0] && walks.length <= 720 * behavior.walkShare[1]);
    assert.ok(new Set(walks.map(row => String(row.at))).size > 100);
    for (const row of frames) {
      const p = placement(c, 'life', row.tick / 24, 0, [128, 150]);
      assert.deepEqual(p.feet, [row.at[0] * 256, row.at[1] * 208]);
      assert.equal(p.anim, row.anim.startsWith('walk_') ? 'walk' : row.anim);
      assert.equal(p.t, row.elapsed);
    }
    const phase = frames.filter(row => row.anim === 'phase').map(row => row.frame);
    const expected = Array.from({ length: clips.phase.seconds * 24 }, (_, k) => k);
    assert.deepEqual(phase, [...expected, ...expected.toReversed()]);
    const changed = frames.filter(row => row.anim === 'idle-f2');
    assert.equal(changed.length, clips['idle-f2'].seconds * 24);
    const at = changed[0].tick;
    for (const frame of [at - 1, at, at + changed.length - 1, at + changed.length]) {
      const image = compose(c, scene, border, 'life', frame / 24);
      assert.ok(image.layers.body.data.some((value, i) => i % 4 === 1 && value === 120));
    }
    assert.deepEqual(frames.at(-1)!.at, frames[0].at);
    assert.equal(frames[0].anim, 'idle');
    assert.equal(frames.at(-1)!.anim, 'idle');
    const phaseChapter = reelChapters(c).find(ch => ch.name === 'phase')!;
    assert.equal(placement(c, 'showreel', (phaseChapter.end - 1) / 24, 0, [128, 150]).anim, 'idle-f2');
    machine.event('idle_owner');
    machine.advance(3);
    assert.equal(machine.sample().anim, 'sleep');
    machine.event('tap');
    machine.advance(1.25);
    assert.equal(machine.sample().anim, 'happy');
  }
});

test('an oversized scored excursion is rejected before drawing and cannot clip its final chapters', () => {
  const tooLong = { ...clips, tech_two: animation(19, 'tech_two') };
  assert.ok(validateBehavior(config, tooLong).some(issue => issue.includes('walking share')));
  assert.throws(() => createPetBehavior(config, tooLong), /walking share/);
  assert.ok(validateBehavior({ ...config, lifeAttacks: [names[0], names[0], names[1]] }, clips).length);
});

test('legendary and mythic pets register their phase, show and longer trick to their own timings', () => {
  const ref = Object.keys(clips);
  assert.deepEqual(petClipIssues(clips, ref, [], false, 'legendary'), []);
  const extra = { ...clips, show: animation(5, 'show'), trick: animation(5.5, 'trick') };
  assert.deepEqual(petClipIssues(extra, [...ref, 'show'], [], false, 'mythic'), []);
  assert.ok(petClipIssues(extra, [...ref, 'show'], [], true, 'legendary').includes('show is reserved for a mythic pet'));
  assert.ok(petClipIssues(clips, ref, [], true, 'mythic').includes('missing show'));
  assert.ok(petClipIssues({ ...extra, phase: animation(1, 'phase') }, [...ref, 'show'], [], true, 'mythic')
    .some(s => s.startsWith('phase duration')));
});
