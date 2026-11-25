import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import type { XY } from '../types';
import { beats } from '../c/river_otter-poses';

test('one pebble leaves the forepaws, balances on the nose and returns to the forepaws', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const keys = beats.trick;
  const gap = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let n = 0; n < c.animations.trick.seconds * 24; n++) {
    const { points } = compose(c, s, b, 'trick', n / 24);
    const held = n <= keys.throw || n >= keys.pawCatch;
    const balanced = n >= keys.noseCatch && n <= keys.noseThrow;
    if (held || balanced) assert.deepEqual(points.stone, held ? points.grip : points.perch, 'contact at ' + n);
    if (n === 38 || n === 71)
      assert.ok(points.stone[1] < points.nose[1] - 15 && gap(points.stone, points.grip) > 18, 'clear flight at ' + n);
  }
});

test('the belly slide actually crosses the wooden rail and its wake clears before returning to rest', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const brake = compose(c, s, b, 'trick_b', beats.trick_b.brake / 24);
  const over = brake.layers.over;
  let railInk = 0;
  for (let y = 136; y < over.h; y++) for (let x = 0; x < over.w; x++) if (over.solid(x, y)) railInk++;
  assert.ok(railInk > 12, 'otter fur covers the lower rail');
  assert.ok(brake.points.tailTip[0] < brake.points.belly[0] - 30, 'tail sweeps clear of the belly at contact');
  assert.ok(brake.body.joints!.tailTip[2] < 1, 'tail tip touches the water');
  for (const anim of c.behavior!.tricks!.f1) {
    const end = compose(c, s, b, anim, c.animations[anim].seconds - 1 / 24);
    const idle = compose(c, s, b, 'idle', 0);
    for (const layer of ['body', 'over', 'fxo', 'fxu'] as const) assert.deepEqual(end.layers[layer].data, idle.layers[layer].data);
  }
});

test('the tail clears the frame on the river walk and the full turn', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  for (const anim of ['life', 'turn', ...Object.keys(c.animations).filter(name => name.startsWith('walk_'))]) {
    for (let n = 0; n < c.animations[anim].seconds * 24; n += 4) {
      const [x, y] = withPointsOnly(() => compose(c, s, b, anim, n / 24)).points.tailTip;
      assert.ok(x >= 2 && x <= 157 && y >= 2 && y <= 125, anim + ' tail reaches the rail at ' + n);
    }
  }
});
