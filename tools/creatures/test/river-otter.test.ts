import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import type { XY } from '../types';
import { beats } from '../c/river_otter-poses';
import { placement, reelChapters } from '../motion';
import { createPetBehavior } from '../viewer/behavior.mjs';
import { isRiver, slideSurface } from '../scenes/willow-terrain';
import { visibleOwnedPixels } from '../studio/visibility';
import { waterStyle } from '../viewer/water.mjs';
import { Px } from '../rig/px';

function advanceTo(pet: ReturnType<typeof createPetBehavior>, matches: (state: ReturnType<typeof pet.sample>) => boolean) {
  for (let i = 0; i < 720; i++) {
    const state = pet.sample();
    if (matches(state)) return state;
    pet.advance(1 / 24);
  }
  assert.fail('expected pose was not reached in a full excursion');
}

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

test('the pebble stays on the sand while the otter searches the wrong bank, spots it and recoils before picking it up', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const k = beats.fidget_a;
  const frame = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  const set = frame(k.stow).points;
  assert.deepEqual(set.stone, set.stow);
  assert.ok(Math.hypot(set.stone[0] - set.pawR[0], set.stone[1] - set.pawR[1]) < 3);
  const z = (n: number) => frame(n).body.joints!.stone[2];
  assert.ok(z(k.land - 2) - z(k.land) > z(k.slip) - z(k.slip + 2), 'gravity accelerates the descent');
  assert.ok(z(k.land) < z(k.land + 2) && z(k.land + 2) > z(k.bounce));
  const grounded = frame(k.rest).points.stone;
  for (const [x, y] of c.behavior!.stops) {
    assert.equal(isRiver(Math.round(grounded[0] + (x - 0.5) * 160), Math.round(grounded[1] + (y - 0.8) * 128)), false);
  }
  for (let n = k.rest; n <= k.lift; n++) {
    const f = frame(n);
    assert.deepEqual(f.points.stone, grounded);
    assert.ok(f.body.rig!.prims.filter(p => p.t === 'pebble').length === 1);
    if (n >= k.miss && n < k.miss + 5) {
      assert.ok(f.points.nose[0] > set.nose[0] + 25);
      for (const palm of [f.points.pawR, f.points.pawL]) assert.ok(palm[0] > grounded[0] + 46);
    }
    if (n < k.reach) assert.ok(Math.hypot(f.points.grip[0] - grounded[0], f.points.grip[1] - grounded[1]) > 17);
    if (n >= k.catch) assert.deepEqual(f.points.grip, grounded);
  }
  const spotted = frame(k.spot);
  assert.ok(Math.abs(spotted.points.nose[0] - grounded[0]) < 7);
  const eyeArea = (f: ReturnType<typeof frame>) => {
    const rig = f.body.rig!, ink = visibleOwnedPixels(rig, f, rig.prims.map(p => p.t));
    return (ink.get('eyeR')?.length ?? 0) + (ink.get('eyeL')?.length ?? 0);
  };
  for (let n = k.surprise; n < k.surprise + 5; n++) {
    const recoil = frame(n);
    assert.ok(recoil.points.nose[1] < spotted.points.nose[1] - 18);
    assert.ok(eyeArea(recoil) > 1.6 * eyeArea(spotted));
  }
  assert.ok(z(k.lift + 2) > z(k.lift) && z(69) > 30);
  assert.deepEqual(frame(71).points.stone, frame(0).points.stone);
});

test('both forepaws hand the pebble to the mouth before a walk and receive it after the walk', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const frame = (n: number) => withPointsOnly(() => compose(c, s, b, 'prepare_walk', n / 24)).body.joints!;
  const middle = c.animations.prepare_walk.seconds * 12;
  for (let i = 0; i < middle; i++) {
    const outbound = frame(i), inbound = frame(2 * middle - 1 - i);
    for (const key of ['head', 'stone', 'pawR', 'pawL'])
      outbound[key].forEach((v, axis) => assert.ok(Math.abs(v - inbound[key][axis]) < 1e-6));
    assert.deepEqual(outbound.stone, i <= 6 ? outbound.grip : outbound.bite);
    if (i >= 7 && i <= 10) outbound.grip.forEach((v, axis) => assert.ok(Math.abs(v - outbound.bite[axis]) < 1e-6));
  }
  assert.ok(frame(0).head[2] - frame(middle - 1).head[2] > 30);
  assert.ok(frame(middle - 1).pawR[2] < 4 && frame(middle - 1).pawL[2] < 4);
});

test('the otter carries one pebble below the nose through all eight gaits and steps around on four feet', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v,i) => v - b[i]));
  const feet = ['pawL', 'pawR', 'footL', 'footR'];
  for (const anim of ['turn', ...Object.keys(c.animations).filter(name => name.startsWith('walk_'))]) {
    let previous: Record<string, number[]> | undefined;
    for (let n = 0; n < c.animations[anim].seconds * 24; n++) {
      const j = withPointsOnly(() => compose(c, s, b, anim, n / 24)).body.joints!;
      assert.deepEqual(j.stone, j.bite);
      assert.ok(distance(j.stone, j.belly) > 35 && distance(j.stone, j.chest) > 23 && distance(j.stone, j.nose) < 7);
      assert.ok(j.head[2] < 33 && j.head[2] - j.root[2] < 12);
      if (anim === 'turn' && previous) {
        const last = previous;
        assert.ok(feet.filter(foot => distance(last[foot], j[foot]) < 0.02).length >= 2, 'planted pair at ' + n);
      }
      previous = j;
    }
    const f = compose(c, s, b, anim, 8 / 24), rig = f.body.rig!;
    assert.equal(rig.prims.filter(p => p.t === 'pebble').length, 1);
    const ink = visibleOwnedPixels(rig, f, rig.prims.map(p => p.t));
    const stone = ink.get('pebble')?.length ?? 0;
    if (anim === 'walk_n') assert.equal(stone, 0, 'the muzzle occludes the stone from directly behind');
    else if (!['walk_ne', 'walk_nw'].includes(anim)) assert.ok(stone > 40, 'visible in the mouth in ' + anim);
  }
});

test('life and the gallery reel keep all direction changes between the two halves of the handoff', async () => {
  const { c } = await loadPainting('river_otter');
  const home = c.portraitOrigin!, middle = c.animations.prepare_walk.seconds * 12;
  for (const clip of ['life', 'showreel']) {
    const poses = Array.from({ length: Math.round(c.animations[clip].seconds * 24) }, (_, i) =>
      placement(c, clip, i / 24, 0, home));
    const first = poses.findIndex(p => p.anim === 'prepare_walk');
    const last = poses.findLastIndex(p => p.anim === 'prepare_walk');
    assert.ok(first > 0 && last > first + middle * 2);
    const steps = poses.slice(first + middle, last - middle + 1);
    assert.ok(steps.every(p => p.anim === 'turn' || p.anim === 'walk'));
    assert.ok(steps.filter(p => p.anim === 'turn').length >= 10);
    for (let i = 0; i < middle; i++) {
      assert.equal(Math.round(poses[first+i].t * 24), i);
      assert.equal(Math.round(poses[last-i].t * 24), middle * 2 - 1 - i);
    }
    for (const p of [poses[first], poses[last]]) assert.deepEqual(p.feet, home);
    if (clip === 'showreel') assert.equal(reelChapters(c).filter(ch => ch.name.startsWith('walk_')).length, 8);
  }
});

test('a tap mid-stride seats the otter once, gives back its pebble and resumes the same step', async () => {
  const { c } = await loadPainting('river_otter');
  const pet = createPetBehavior(c.behavior!, c.animations);
  advanceTo(pet, state => state.anim.startsWith('walk_'));
  const paused = pet.advance(8 / 24);
  assert.ok(pet.event('tap'));
  const rows = [pet.sample()];
  while (rows.length < 160 && !rows.at(-1)!.anim.startsWith('walk_')) rows.push(pet.advance(1 / 24));
  const clips = rows.map(p => p.anim).filter((name, i) => name !== rows[i-1]?.anim);
  assert.deepEqual(clips, ['turn','prepare_walk','happy','prepare_walk','turn',paused.anim]);
  for (const p of rows) assert.deepEqual(p.at, paused.at);
  assert.equal(rows.at(-1)!.frame, paused.frame);
  const transfers = rows.filter(p => p.anim === 'prepare_walk').map(p => p.frame);
  assert.deepEqual(transfers, Array.from({ length: 36 }, (_, i) => (18 + i) % 36));
});

test('a tap during the handoff reverses a partial departure or finishes the ongoing arrival only once', async () => {
  const { c } = await loadPainting('river_otter');
  for (const interrupt of [6, 24]) {
    const pet = createPetBehavior(c.behavior!, c.animations);
    advanceTo(pet, row => row.anim === 'prepare_walk' && row.frame === interrupt);
    pet.event('tap');
    const frames = [];
    while (frames.length < 36 && pet.sample().anim === 'prepare_walk') {
      frames.push(pet.sample().frame);
      pet.advance(1 / 24);
    }
    assert.equal(pet.sample().anim, 'happy');
    if (interrupt === 6) assert.deepEqual(frames, [6, 5, 4, 3, 2, 1, 0]);
    else assert.deepEqual(frames, Array.from({ length: 12 }, (_, i) => 24 + i));
    const next = pet.advance(c.animations.happy.seconds);
    if (interrupt === 6) {
      assert.equal(next.anim, 'prepare_walk');
      assert.equal(next.frame, 0);
    } else assert.notEqual(next.anim, 'prepare_walk');
  }
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

test('the wake remains visible around the feet and cannot paint a blue pebble on the back or tail', async () => {
  const { c, s, b } = await loadPainting('river_otter');
  for (const anim of ['walk_n', 'walk_ne', 'walk_nw']) {
    for (const n of [0, 4, 8, 12, 16, 20]) {
      const frame = compose(c, s, b, anim, n / 24), rig = frame.body.rig!;
      const { bgf, bgfBack } = frame.layers;
      const clean = { ...frame, layers: { ...frame.layers, bgf: new Px(bgf.w, bgf.h) } };
      const coat = visibleOwnedPixels(rig, clean, rig.prims.map(p =>
        p.t === 'body' || p.t === 'tail' ? 'coat' : undefined)).get('coat')!;
      assert.ok(coat.length > 500 && coat.every(([x,y]) => !bgf.solid(x,y)), anim + ' wet fur at ' + n);
      assert.ok(frame.waterContacts.filter(row => row[2] === waterStyle.farFootfall).length === 4);
      assert.ok(bgfBack.data.some(value => value > 0), 'visible wake at ' + n);
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
