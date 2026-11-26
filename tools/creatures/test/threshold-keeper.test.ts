import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import { creatureIds, inputsOf } from '../studio/cache';
import { city, drawer, lock, liftCentre, liftProgress, scenePose, stages } from '../c/threshold_keeper-stage';
import type { XY } from '../types';

const { c, s, b } = await loadPainting('threshold_keeper');
const frame = (clip: string, n: number) => compose(c, s, b, clip, n / 24);
const marks = (clip: string, n: number) => withPointsOnly(() => frame(clip, n).points);
const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function near(a: XY, b: XY, tolerance = 0.02) {
  assert.ok(distance(a, b) < tolerance, `${a} and ${b}, expected distance < ${tolerance}`);
}

test('the workshop renders the keeper and invalidates this painting when its illustrated sky changes', () => {
  assert.ok(creatureIds().includes(c.id));
  assert.ok(inputsOf(c.id, c.theme, c.rarity).some((file) => file.endsWith('/hundred_landings-sky.png')));
});

test('the animal and its carried house keep their scale throughout all seven stories and their transitions', () => {
  for (const [clip, count] of Object.entries(stages)) {
    for (let n = 0; n < count; n++) {
      const p = scenePose(clip, n)!;
      assert.equal(p.s, 1);
      assert.equal(p.houseS, 1);
    }
    const last = marks(clip, count - 1);
    const rest = marks(clip.endsWith('-f2') || clip === 'phase' ? 'idle-f2' : 'idle', 0);
    for (const key of ['root', 'sill', 'bootR', 'bootL']) near(last[key], rest[key], 0.4);
  }
});

test('the keeper alternates a planted paw and a swinging paw across the paving', () => {
  const sloping = marks('trick_b', 55),
    base = marks('trick_b', 68);
  assert.ok(sloping.root[1] > base.root[1] + 8);
  const frames = [27, 29, 32, 35].map((n) => marks('trick_b-f2', n));
  for (const f of frames.slice(1)) near(f.bootR, frames[0].bootR);
  assert.ok(frames.at(-1)!.root[0] - frames[0].root[0] > 8);
  assert.ok(frames.at(-1)!.bootL[0] - frames[0].bootL[0] > 15);
  const next = [37, 39, 42].map((n) => marks('trick_b-f2', n));
  for (const f of next.slice(1)) near(f.bootL, next[0].bootL);
  assert.ok(next[2].bootR[0] - next[0].bootR[0] > 10);
});

test('the cottage stands still, the source empties before a nose emerges at the frame, and the tail clears on show', () => {
  const start = marks('trick', 54);
  for (const n of [68, 84, 108, 115, 137, 173, 190]) near(marks('trick', n).sill, start.sill, 0.4);
  for (let n = 109; n < 115; n++) assert.equal(scenePose('trick', n)!.hide, 1);
  const inside = marks('trick', 107),
    nose = marks('trick', 139);
  assert.ok(inside.tail[0] < inside.door[0] - 10);
  assert.ok(nose.nose[0] < 251 && nose.tail[0] > 261);
  const port = frame('trick', 139).layers.over;
  let brass = 0;
  for (let y = 130; y < 184; y++) for (let x = 274; x < port.w; x++) if (port.solid(x, y)) brass++;
  assert.ok(brass > 30);
  near(marks('trick', 176).root, marks('trick', 177).root, 1.5);
  const arrival = marks('show', 97);
  assert.ok(arrival.tail[0] > arrival.door[0] + 4);
});

test('the paw meets the pull, the wax letter and the slot before each prop responds', () => {
  for (const n of [61, 63, 65, 67, 69, 71]) near(marks('trick_b', n).handR, [117, 155], 0.8);
  for (const n of [119, 120, 121, 122, 123, 124]) near(marks('trick_b', n).handR, [228, 135]);
  for (const n of [181, 182, 183, 184, 185]) near(marks('trick_b', n).handR, [125, 149]);
});
test('the actual key eases into the slot and stays behind as the car carries the feet to the bell', () => {
  for (let n = 61; n <= 68; n++) assert.ok(distance(marks('trick-f2', n).keyTip, marks('trick-f2', n - 1).keyTip) < 5);
  for (const n of [66, 77, 88, 102, 123, 146, 167, 174]) near(marks('trick-f2', n).keyTip, lock);
  for (const n of [94, 102, 113, 130, 149, 165]) {
    const m = marks('trick-f2', n),
      car = liftCentre(liftProgress(n));
    near(m.root, [car[0] + 4, car[1] + 2]);
    for (const foot of [m.bootR, m.bootL]) {
      assert.ok(Math.abs(foot[0] - car[0]) < 25);
      assert.ok(Math.abs(foot[1] - car[1]) < 12);
    }
  }
  for (const n of [112, 114, 116, 120, 123]) near(marks('trick-f2', n).handR, [179, 95]);
});
test('both paws press the creases of the town before filing its map at the opposite end of the journey', () => {
  for (const n of [65, 72, 78, 82]) {
    const m = marks('trick_b-f2', n);
    const h = 1 - scenePose('trick_b-f2', n)!.map;
    near(m.handR, [city[0] - 16 - 8 * h, city[1] + 1], 1);
    near(m.handL, [city[0] - 6 - 6 * h, city[1] - 7 * h + 1], 1);
  }
  for (const n of [131, 135, 141, 144]) {
    const m = marks('trick_b-f2', n);
    const e = scenePose('trick_b-f2', n)!.file;
    near(m.handR, [drawer[0] - 7, drawer[1] - 5 + 8 * e], 1);
    near(m.handL, [drawer[0] + 4, drawer[1] - 6 + 8 * e], 1);
  }
});
