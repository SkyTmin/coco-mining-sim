import test from 'node:test';
import assert from 'node:assert/strict';
import { flipTuck, keyframer, pivotLift, snapTo, somersault, spinLane, takeoffFrame } from '../kit/pet-moves';
import * as storm from '../c/storm_lord-poses';

test('keyframer reproduces the copied sampler of Раскат on every frame of every clip', () => {
  // the same sets as c/storm_lord-poses.ts (LINEAR is private there)
  const gesture = keyframer({
    tracks: storm.tracks,
    lanes: storm.lanes,
    switches: storm.SWITCHES,
    linear: new Set(['dx', 'dy', 'twist', 'ringSpin', 'yawSpin', 'spearP', 'spearSpin', 'orbLap']),
    fixed: { sleep: storm.asleep },
  });
  let frames = 0;
  for (const [anim, clip] of Object.entries(storm.clips)) {
    const count = Math.round(clip.seconds * 24);
    for (let n = 0; n <= count; n += 0.5) {
      assert.deepEqual(gesture(anim, n / 24), storm.gesture(anim, n / 24), `${anim} frame ${n}`);
      frames++;
    }
  }
  assert.ok(frames > 4000);
});

test('snapTo winds up against the move, overshoots past it and settles on it', () => {
  const lane = snapTo(0, 10, { at: 20 });
  assert.deepEqual(lane.map(([f]) => f), [16, 20, 23, 29]);
  assert.ok(lane[1][1] < 0 && lane[2][1] > 10 && lane[3][1] === 10);
});

test('somersault: a whole turn, back on the floor and at rest pitch at both ends', () => {
  const lanes = somersault({ at: 30, air: 12, height: 18, crouch: 5, rest: 0.2 });
  const first = (l: [number, number][]) => l[0][1],
    last = (l: [number, number][]) => l[l.length - 1][1];
  assert.equal(first(lanes.pitch), 0.2);
  assert.ok(Math.abs(last(lanes.pitch) - 0.2 + 2 * Math.PI) < 1e-9); // backwards by default
  assert.equal(first(lanes.jump), 0);
  assert.equal(last(lanes.jump), 0);
  assert.equal(Math.max(...lanes.jump.map(([, v]) => v)), 18);
  assert.equal(last(lanes.crouch), 0);
});

test('spinLane advances by whole steps of the symmetry', () => {
  const [[, a], [, b]] = spinLane(0, 66, 8, 0.25);
  const steps = ((b - a) * 8) / (2 * Math.PI);
  assert.ok(steps >= 1 && Math.abs(steps - Math.round(steps)) < 1e-9);
});

test('flipTuck: none at rest or in a forward landing lean, full when thrown back or upside down', () => {
  assert.equal(flipTuck(0.2, 0.2), 0);
  assert.equal(flipTuck(0.2 + 0.6, 0.2), 0); // landing lean forward
  assert.equal(flipTuck(0.2 - 1.2, 0.2), 1); // thrown back: knees up at once
  assert.equal(flipTuck(0.2 + Math.PI, 0.2), 1); // upside down
});

test('pivotLift: no offset near rest, the hips rise in a flip', () => {
  assert.deepEqual(pivotLift(0.3), [-0, 0]);
  const [, up] = pivotLift(Math.PI);
  assert.ok(up > 17);
});

test('takeoffFrame is two frames before the leap', () => assert.equal(takeoffFrame(5), 3));
