import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import type { XY } from '../types';
import { beats } from '../c/river_otter-poses';
import { isRiver, slideSurface } from '../scenes/willow-terrain';
import { visibleOwnedPixels } from '../studio/visibility';
import { waterStyle } from '../viewer/water.mjs';
import { Px } from '../rig/px';

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

test('the nose breaks the water before the back, then the otter swims face-first to the bank', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const count = (n: number) => {
    const frame = compose(c, s, b, 'hatch', n / 24), rig = frame.body.rig!;
    const ink = visibleOwnedPixels(rig, frame, rig.prims.map(part => part.t));
    return (part: string) => ink.get(part)?.length ?? 0;
  };
  assert.equal(count(4)('nose'), 0);
  assert.ok(count(5)('nose') > 0);
  for (const n of [5, 8, 12, 16, 20]) {
    const pixels = count(n);
    assert.equal(pixels('tail') + pixels('body'), 0);
    if (n >= 8) assert.ok(pixels('eyeL') + pixels('eyeR') > 20 && pixels('muzzle') > 55);
  }
  let previous = compose(c, s, b, 'hatch', 24 / 24).points.nose;
  for (let n = 26; n <= 44; n += 2) {
    const { nose, root } = compose(c, s, b, 'hatch', n / 24).points;
    const dot = (nose[0] - previous[0]) * (nose[0] - root[0]) + (nose[1] - previous[1]) * (nose[1] - root[1]);
    assert.ok(dot > 0, 'swimming towards the muzzle at ' + n);
    if (n < 40) assert.ok(isRiver(Math.round(nose[0]), Math.round(nose[1])));
    previous = nose;
  }
});

test('the same pebble slips from the flank, bounces and waits on the sand until cupped again', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const k = beats.fidget_a;
  const frame = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  const set = frame(k.stow).points;
  assert.deepEqual(set.stone, set.stow);
  assert.ok(Math.hypot(set.stone[0] - set.pawR[0], set.stone[1] - set.pawR[1]) < 3);
  const z = (n: number) => frame(n).body.joints!.stone[2];
  assert.ok(z(24) - z(26) > z(18) - z(20), 'gravity accelerates the descent');
  assert.ok(z(k.land) < z(k.land + 2) && z(k.land + 2) > z(k.bounce));
  const grounded = frame(k.rest).points.stone;
  for (const [x, y] of c.behavior!.stops) {
    assert.equal(isRiver(Math.round(grounded[0] + (x - 0.5) * 160), Math.round(grounded[1] + (y - 0.8) * 128)), false);
  }
  for (let n = k.rest; n <= k.lift; n++) {
    const f = frame(n);
    assert.deepEqual(f.points.stone, grounded);
    assert.ok(f.body.rig!.prims.filter(p => p.t === 'pebble').length === 1);
    if (n < 42) for (const palm of [f.points.pawR, f.points.pawL]) assert.ok(Math.hypot(palm[0] - grounded[0], palm[1] - grounded[1]) > 34);
    if (n >= k.catch) assert.deepEqual(f.points.grip, grounded);
  }
  assert.ok(frame(67).body.joints!.stone[2] > 30);
  assert.deepEqual(frame(71).points.stone, frame(0).points.stone);
});

test('the otter climbs the visible crest and keeps its belly on the descending clay until entering the pool', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const at = (n: number) => compose(c, s, b, 'trick_b', n / 24).points;
  const crest = at(beats.trick_b.set), entry = at(beats.trick_b.skim);
  assert.ok(at(0).footR[1] - crest.footR[1] > 45);
  assert.ok(entry.belly[1] - at(beats.trick_b.launch).belly[1] > 45);
  let last = at(beats.trick_b.launch).belly;
  for (let n = beats.trick_b.launch; n <= beats.trick_b.skim; n++) {
    const { belly } = at(n);
    assert.ok(belly[0] >= last[0] - 0.6 && belly[1] >= last[1] - 0.6, 'continuous downhill path at ' + n);
    assert.ok(Math.abs(slideSurface(belly[0]) - belly[1]) < 4, 'touches the drawn chute at ' + n);
    last = belly;
  }
  const [x, y] = at(75).belly;
  assert.ok(isRiver(Math.round(x), Math.round(y)));
});

test('footfalls stay in place as the otter wades in all eight directions', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  for (const anim of Object.keys(c.animations).filter(name => name.startsWith('walk_'))) {
    const footfall = ([, , kind]: number[]) => kind === waterStyle.footfall || kind === waterStyle.farFootfall;
    const start = compose(c, s, b, anim, 0).waterContacts.filter(footfall);
    assert.equal(start.length, 4);
    for (let n = 1; n < 12; n++) {
      const contacts = compose(c, s, b, anim, n / 24).waterContacts;
      assert.ok(contacts.some(([, , kind]) => kind === waterStyle.paw || kind === waterStyle.submerged) &&
        contacts.some(([, , kind]) => kind === waterStyle.coatReflection));
      const echoes = contacts.filter(footfall);
      for (let i = 0; i < echoes.length; i++) {
        assert.ok(Math.hypot(echoes[i][0] - start[i][0], echoes[i][1] - start[i][1]) <= 1.5, anim + ' drifting footfall at ' + n);
        assert.ok(echoes[i][3] >= start[i][3] + n - 1);
      }
    }
  }
});

test('the wave stays behind the visible muzzle as the otter banks toward the viewer', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  for (const n of [80, 84, 90]) {
    const frame = compose(c, s, b, 'trick_b', n / 24), rig = frame.body.rig!;
    const face = rig.prims.map(p => ['head', 'muzzle', 'nose', 'eyeL', 'eyeR'].includes(p.t ?? '') ? 'face' : undefined);
    const { bgf } = frame.layers;
    const clean = { ...frame, layers: { ...frame.layers, bgf: new Px(bgf.w, bgf.h) } };
    const pixels = visibleOwnedPixels(rig, clean, face).get('face')!;
    assert.ok(pixels.length > 150);
    assert.ok(pixels.every(([x, y]) => !bgf.solid(x, y)), 'water drawn through the face at ' + n);
  }
});
