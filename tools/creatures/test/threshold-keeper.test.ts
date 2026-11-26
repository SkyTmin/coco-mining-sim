import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import { creatureIds } from '../studio/cache';
import { bridgeTop, city, drawer, lock, porchTop, stairTop } from '../c/threshold_keeper-score';
import type { XY } from '../types';

const painting = await loadPainting('threshold_keeper');
test('the workshop includes the keeper when checking all paintings', () => {
  assert.ok(creatureIds().includes(painting.c.id));
});
function frame(clip: string, n: number) {
  return compose(painting.c, painting.s, painting.b, clip, n / 24);
}
const marks = (clip: string, n: number) => withPointsOnly(() => frame(clip, n).points);
function near(a: XY, b: XY, epsilon = 0.02) {
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < epsilon, `${a} and ${b}`);
}

test('the muzzle clears the frame jamb while the very same tail is still inside the carried house', () => {
  for (let n = 65; n <= 76; n++) {
    const m = marks('trick', n);
    assert.ok(m.nose[0] > 215 && m.tail[0] < m.door[0] + 37);
    assert.ok(Math.abs(m.tail[1] - m.door[1]) < 25);
  }
  const f = frame('trick', 66),
    border = 18;
  let beyond = 0;
  for (let y = border + 65; y < border + 113; y++)
    for (let x = border + 256; x < f.layers.over.w; x++) if (f.layers.over.solid(x, y)) beyond++;
  assert.ok(beyond >= 30, 'the exit is physically painted onto the right rail');
});

test('the extending stair touches its maker and supports each landing', () => {
  for (let n = 38; n <= 47; n++) {
    const m = marks('trick_b', n);
    near(m.handR, m.sill);
  }
  for (const n of [65, 66, 67, 83, 84, 85, 102, 103, 104]) {
    const { bootR, sill } = marks('trick_b', n);
    assert.ok(Math.abs(bootR[1] + 1 - bridgeTop(bootR[0], sill)) < 0.02);
  }
});

test('the key stays in the axle while both paws leave it and the skyline fits between both paws', () => {
  for (const n of [35, 42, 50, 59, 67, 84, 109, 128, 138, 142]) near(marks('trick-f2', n).keyTip, lock);
  for (const n of [83, 103, 116]) {
    const m = marks('trick-f2', n);
    assert.ok(Math.hypot(m.handR[0] - lock[0], m.handR[1] - lock[1]) > 40);
    assert.ok(Math.abs(m.bootR[1] + 1 - stairTop(m.bootR[0], 1)) < 0.02);
  }
  for (const n of [39, 45, 50, 137, 142, 147]) {
    const { handL, handR } = marks('trick_b-f2', n);
    near([(handL[0] + handR[0]) / 2, (handL[1] + handR[1]) / 2], city);
  }
});

test('the reveal puts the feet on the doorstep and the animal turns towards the map drawer', () => {
  for (const n of [35, 38, 42, 49, 52]) {
    const m = marks('show', n);
    near(m.bootR, [m.bootR[0], porchTop(m.bootR[0], m.sill) - 1]);
  }
  for (const n of [105, 109, 113, 117]) {
    const m = marks('trick_b-f2', n);
    assert.ok(m.nose[0] < m.head[0] - 6);
    if (n === 113 || n === 117)
      near([(m.handL[0] + m.handR[0]) / 2, (m.handL[1] + m.handR[1]) / 2], [drawer[0] + 7, drawer[1]]);
  }
});
