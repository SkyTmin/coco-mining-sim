import assert from 'node:assert/strict';
import test from 'node:test';
import { createPetBehavior, interruptFrames, petDirections, validateBehavior, type BehaviorConfig } from '../viewer/behavior.mjs';

const config: BehaviorConfig = {
  seed: 12, previewSeconds: 30, field: [256, 208], stride: 20, yaw: Math.PI / 4, depthScale: 0.5,
  stops: [[0.5, 0.82], [0.46, 0.8], [0.55, 0.87]], walkShare: [0.35, 0.42],
  weights: { idle: 1, look: 1, fidget_a: 1, fidget_b: 1, trick: 100 },
  tricks: { f1: ['trick', 'trick_b'], f2: ['trick-f2', 'trick_b-f2'] },
  events: { tap: ['happy'], tap_asleep: ['wake_startled', 'happy'], like: ['trick'],
    idle_owner: ['sleep_in', 'sleep'], owner_back: ['sleep_out'] },
};
const durations = {
  idle: 3, fidget_a: 1.5, fidget_b: 1.5, look: 1.5, happy: 1.5, 'happy-f2': 1.5,
  trick: 5, trick_b: 5.2, 'trick-f2': 5, 'trick_b-f2': 5.5, phase: 2, 'idle-f2': 2,
  sleep_in: 1, sleep: 3, sleep_out: 1, wake_startled: 1, hatch: 3, turn: 4, tired: 2,
  ...Object.fromEntries(petDirections.map(dir => ['walk_' + dir, 1])),
};
const clips = Object.fromEntries(Object.entries(durations).map(([name, seconds]) =>
  [name, { seconds, interrupt: interruptFrames(Math.round(seconds * 24), name) }]));

test('life alternates complete trick pairs across 30-second excursions with phase seams intact', () => {
  assert.deepEqual(validateBehavior(config, clips), []);
  const pet = createPetBehavior(config, clips);
  for (let cycle = 0; cycle < 3; cycle++) {
    const frames = Array.from({ length: 720 }, () => {
      const row = pet.sample();
      pet.advance(1 / 24);
      return row;
    });
    const names = [config.tricks!.f1[cycle % 2], config.tricks!.f2[cycle % 2]];
    const tricks = frames.filter(row => row.anim.startsWith('trick') && row.frame === 0);
    assert.deepEqual(tricks.map(row => row.anim), names);
    assert.deepEqual(tricks.map(row => row.form), ['f1', 'f2']);
    assert.ok(frames.slice(0, tricks[0].tick % 720).filter(row => row.anim.startsWith('walk_')).length >= 252);
    const phase = Array.from({ length: 48 }, (_, i) => i);
    assert.deepEqual(frames.filter(row => row.anim === 'phase').map(row => row.frame), [...phase, ...phase.toReversed()]);
    assert.equal(frames.filter(row => row.anim === 'idle-f2').length, 48);
    assert.equal(frames.at(-1)!.anim, 'idle');
    assert.deepEqual(frames.at(-1)!.at, frames[0].at);
  }
});

test('controls share a trick cursor per form and hold selection after a full transition', () => {
  const pet = createPetBehavior(config, clips);
  for (const [event, anim] of [['double_tap', 'trick'], ['skill_ready', 'trick_b']]) {
    assert.ok(pet.event(event));
    assert.equal(pet.sample().anim, anim);
    pet.advance(clips[anim].seconds + 0.05);
  }
  pet.event('change_form');
  for (let i = 0; i < 6 && pet.sample().anim !== 'phase'; i++) pet.advance(1 / 24);
  assert.equal(pet.sample().frame, 0);
  assert.equal(pet.sample().anim, 'phase');
  const transformed = pet.advance(2);
  assert.equal(transformed.anim, 'idle-f2');
  assert.equal(transformed.form, 'f2');
  assert.equal(pet.advance(35).anim, 'idle-f2');
  pet.event('tap');
  for (let i = 0; i < 6 && pet.sample().anim === 'idle-f2'; i++) pet.advance(1 / 24);
  assert.equal(pet.sample().anim, 'happy-f2');
  pet.advance(2);
  for (const [event, anim] of [['double_tap', 'trick-f2'], ['skill_ready', 'trick_b-f2']]) {
    pet.event(event);
    for (let i = 0; i < 6 && pet.sample().anim === 'idle-f2'; i++) pet.advance(1 / 24);
    assert.equal(pet.sample().anim, anim);
    pet.advance(clips[anim].seconds + 0.05);
  }
  pet.event('change_form');
  for (let i = 0; i < 6 && pet.sample().anim === 'idle-f2'; i++) pet.advance(1 / 24);
  assert.equal(pet.sample().frame, 47);
  assert.equal(pet.sample().anim, 'phase');
  assert.equal(pet.advance(2).anim, 'idle');
  assert.equal(pet.sample().form, 'f1');
});

test('tricks validation rejects stray techniques, missing form clips and oversized scores', () => {
  assert.match(validateBehavior(config, { ...clips, tech_example: clips.trick }).join(), /tech_\*/);
  const { 'happy-f2': happy, ...incomplete } = clips;
  assert.match(validateBehavior(config, incomplete).join(), /happy-f2/);
  assert.match(validateBehavior(config, { ...clips, trick_b: { seconds: 15, interrupt: interruptFrames(360) } }).join(), /walking share/);
  assert.match(validateBehavior({ ...config, attacks: [] }, clips).join(), /attack fields/);
});
