import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { cord, fishAt, fishStop, hook, projectedPole, starAt } from '../c/pocket_magnet-poses';
import type { XY } from '../types';

const painting = await loadPainting('pocket_magnet');
const gap = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const inFrame = (name: string, n: number) => compose(painting.c, painting.s, painting.b, name, n / 24);

test('the tin fish pivots out of its cradle, hangs from a pole and lands before the magnet peels off', () => {
  const first = fishAt(0);
  assert.deepEqual(fishAt(165), first);
  for (let n = 44; n <= 131; n++) {
    const fish = fishAt(n);
    assert.ok(gap(projectedPole('trick', n / 24), fish.tab) < 0.001, 'fish tab at ' + n);
    const tailY = fish.tab[1] + 21 * Math.sin(fish.angle) + 6 * Math.cos(fish.angle);
    assert.ok(tailY <= 103.1, 'tail passes through the bench at ' + n);
  }
  for (const n of [44, 51, 75, 98, 123, 126]) {
    assert.ok(gap(inFrame('trick', n).points.pole, fishAt(n).tab) < 0.001);
  }
  assert.ok(first.tab[0] + 21 < fishStop);
  assert.equal(fishAt(131).tab[0] + 21, fishStop);
  assert.ok(first.tab[1] - fishAt(82).tab[1] > 34);
  assert.ok(Math.abs(fishAt(88).angle - Math.PI / 2) < 0.1);
  assert.ok(gap(projectedPole('trick', 138 / 24), fishAt(138).tab) > 5);
});

test('the star travels on one fixed cord, clears the magnet, then meets it on the returning swing', () => {
  for (let n = 0; n < 178; n++) assert.ok(Math.abs(gap(hook, starAt(n).ring) - cord) < 0.0001);
  assert.ok(starAt(76).tilt > 0.48 && starAt(97).tilt < -0.48);
  assert.deepEqual(starAt(0).center, starAt(177).center);
  for (const [first, last] of [
    [43, 76],
    [111, 144],
  ]) {
    for (let n = first; n <= last; n++)
      assert.ok(gap(projectedPole('trick_b', n / 24), starAt(n).contact) < 0.001);
    for (const n of [first, last]) assert.ok(gap(inFrame('trick_b', n).points.pole, starAt(n).contact) < 0.001);
  }
  assert.ok(starAt(97).center[0] + 35 < starAt(76).center[0]);
  assert.ok(gap(projectedPole('trick_b', 97 / 24), starAt(97).contact) > 28);
  assert.ok(starAt(110).center[0] < starAt(111).center[0]);
  assert.ok(starAt(111).center[0] < starAt(112).center[0]);
  assert.ok(starAt(121).center[0] - starAt(120).center[0] < 0.1);
});

test('both performances have at least one planted foot through each sidestep', () => {
  for (const [name, length] of [
    ['trick', 166],
    ['trick_b', 178],
  ] as const) {
    let previous = inFrame(name, 0);
    for (let n = 1; n < length; n++) {
      const next = inFrame(name, n);
      const motion = Math.min(...['footL', 'footR'].map((key) => gap(previous.points[key], next.points[key])));
      assert.ok(motion < 0.54, name + ' slides both feet at ' + n + ' (' + motion.toFixed(2) + ')');
      previous = next;
    }
  }
});
