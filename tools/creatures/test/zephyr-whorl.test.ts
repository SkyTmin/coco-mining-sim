import assert from 'node:assert/strict';
import test from 'node:test';
import { footfalls, glider, wind } from '../c/zephyr_whorl-keys';
import { planePose, wheelAngle } from '../c/zephyr_whorl-fx';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { Px } from '../rig/px';
import meadow, { wheelAxle } from '../scenes/paper_updraft';
import { visibleOwnedPixels } from '../studio/visibility';
import type { XY } from '../types';

const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const empty = (plane: Px) => !plane.data.some((value, i) => i % 4 === 3 && value > 0);
const rim = 8;

function visibleAt(f: ReturnType<typeof compose>, part: string, point: XY) {
  const rig = f.body.rig!;
  const pixels = visibleOwnedPixels(
    rig,
    f,
    rig.prims.map((q) => (q.t === part ? part : undefined)),
  ).get(part);
  return pixels?.some(([x, y]) => distance([x - rim, y - rim], point) <= 2);
}

function changedInField(a: Px, b: Px, x: number, y: number, w: number, h: number) {
  let count = 0;
  for (let row = y + rim; row < y + rim + h; row++) {
    for (let col = x + rim; col < x + rim + w; col++) {
      const k = (row * a.w + col) * 4;
      if ([0, 1, 2, 3].some((c) => a.data[k + c] !== b.data[k + c])) count++;
    }
  }
  return count;
}

test('the first and last steps move one foot to a new footprint while the other bears the weight', async () => {
  const { c, s, b } = await loadPainting('zephyr_whorl');
  const bare = { ...c, effects: undefined };
  const frame = (n: number) => compose(c, s, b, 'prepare_walk', n / 24);
  for (const [start, top, land, moving, support] of [
    [0, 7, footfalls.leaving, 'footR', 'footL'],
    [18, 24, footfalls.arriving, 'footL', 'footR'],
  ] as const) {
    const initial = frame(start),
      apex = frame(top),
      impact = frame(land);
    for (let n = start; n <= land; n++) assert.deepEqual(frame(n).points[support], initial.points[support]);
    assert.ok(apex.body.joints![moving][2] - initial.body.joints![moving][2] > 12);
    assert.ok(distance(apex.points[moving], initial.points[moving]) > 6);
    assert.ok(visibleAt(apex, moving, apex.points[moving]) && visibleAt(impact, moving, impact.points[moving]));
    assert.equal(impact.body.joints![moving][2], initial.body.joints![moving][2]);
    assert.ok(distance(impact.points[moving], initial.points[moving]) > 1);
    assert.deepEqual(frame(land + 3).points[moving], impact.points[moving]);
    const [x, y] = impact.points[moving].map(Math.round);
    function dirt(n: number) {
      return changedInField(
        frame(n).layers.fxu,
        compose(bare, s, b, 'prepare_walk', n / 24).layers.fxu,
        x - 15,
        y - 8,
        30,
        11,
      );
    }
    assert.equal(dirt(land - 1), 0);
    assert.ok(dirt(land + 3) > 10);
    assert.equal(dirt(land + 8), 0);
  }
  const firstStride = c.frame('walk', 0, 0, 'normal', { gaitPhase: 0 });
  for (const foot of ['footR', 'footL']) {
    assert.deepEqual(frame(17).body.joints![foot], firstStride.joints![foot]);
  }
  assert.deepEqual(frame(17).layers.body.data, frame(18).layers.body.data);
  assert.deepEqual(frame(35).layers.body.data, compose(c, s, b, 'idle', 0).layers.body.data);
  assert.deepEqual(c.behavior!.tricks!.f1, ['trick', 'trick_b']);
});

test('the incoming gust reaches grass, crest and mast in order and keeps both rotors moving through the throw', async () => {
  const { c, s, b } = await loadPainting('zephyr_whorl');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  const wheel = (a: number, b: number) =>
    changedInField(frame(a).backdrop!, frame(b).backdrop!, 124, 28, 29, 30);
  function markedBlade(n: number): XY {
    const { blade0, hub } = frame(n).points;
    return [blade0[0] - hub[0], blade0[1] - hub[1]];
  }
  function streamerReach(n: number) {
    const field = frame(n).backdrop!;
    let right = 0;
    for (let x = 135; x < 160; x++)
      for (let y = 62; y < 83; y++) {
        const [r, g, b, a] = field.get(x + rim, y + rim);
        if (a > 230 && r === 200 && g === 120 && b === 91) right = x;
      }
    return right;
  }
  assert.ok(changedInField(frame(0).backdrop!, frame(3).backdrop!, 0, 74, 32, 19) > 25);
  assert.deepEqual(markedBlade(0), markedBlade(3));
  assert.ok(distance(markedBlade(5), markedBlade(10)) > 12);
  assert.equal(wheel(0, 10), 0);
  assert.ok(wheel(11, 15) > 100);
  assert.ok(streamerReach(20) > streamerReach(0) + 9);
  assert.ok(streamerReach(78) < streamerReach(20) - 6);
  assert.ok(streamerReach(107) > streamerReach(78) + 5);
  for (const n of [25, 45, 68, 92, 99, 103, 107, 111, 118]) {
    assert.ok(
      wheel(n - 1, n) > 100 && distance(markedBlade(n - 1), markedBlade(n)) > 2,
      'both rotors turn at ' + n,
    );
  }
  assert.ok(wheel(131, 132) > 20);
  assert.equal(wheel(150, 151), 0);
  assert.deepEqual(frame(151).backdrop!.data, frame(0).backdrop!.data);
});

test('the first breath starts at the lips, reaches a blade and leaves the pinwheel coasting', async () => {
  const { c, s, b } = await loadPainting('zephyr_whorl');
  const frame = (n: number) => compose(c, s, b, 'trick', n / 24);
  const first = frame(wind.breath),
    hit = frame(wind.hit);
  assert.ok(empty(frame(wind.breath - 1).layers.fxo));
  const [x, y] = first.points.mouth.map(Math.round);
  assert.ok(first.layers.fxo.solid(x + rim, y + rim));
  assert.ok(visibleAt(first, 'mouth', first.points.mouth));
  const tip: XY = [wheelAxle[0] - 1, wheelAxle[1] + 10];
  assert.ok(!first.layers.fxo.solid(tip[0] + rim, tip[1] + rim));
  assert.ok(hit.layers.fxo.solid(tip[0] + rim, tip[1] + rim));
  for (const n of [wind.hit, 65, 72, wind.stop]) {
    const f = frame(n);
    assert.ok(visibleAt(f, 'mouth', f.points.mouth));
    for (const hand of ['handL', 'handR']) assert.ok(distance(f.points[hand], f.points.mouth) > 12);
  }
  assert.equal(wheelAngle(wind.hit), 0);
  assert.ok(wheelAngle(wind.hit + 1) > 0 && wheelAngle(wind.stop + 6) > wheelAngle(wind.stop));
  assert.equal(wheelAngle(124), 6 * Math.PI);
  const end = frame(131);
  assert.deepEqual(end.backdrop!.data, frame(0).backdrop!.data);
  assert.ok(empty(end.layers.fxo));
});

test('the incoming plane clears the crest, then its keel travels between the fingers until the throw', async () => {
  const { c, s, b } = await loadPainting('zephyr_whorl');
  const frames = new Map<number, ReturnType<typeof compose>>();
  function frame(n: number) {
    if (!frames.has(n)) frames.set(n, compose(c, s, b, 'trick_b', n / 24));
    return frames.get(n)!;
  }
  const plane = (n: number) =>
    planePose({ points: frame(n).points, pointAt: (t, k) => frame(Math.round(t * 24)).points[k] }, n);
  const pigments = new Set([0x47485e, 0x787a96, 0xa5b2c0, 0xd9ddcd, 0xfff1cd, 0xd36962]);
  function paperCoverage(layer: Px, body: Px) {
    let total = 0,
      covered = 0;
    for (let i = 0; i < layer.data.length; i += 4) {
      const [r, g, b] = [layer.data[i], layer.data[i + 1], layer.data[i + 2]];
      if (layer.data[i + 3] <= 230 || !pigments.has((r << 16) | (g << 8) | b)) continue;
      total++;
      if (body.data[i + 3] > 180) covered++;
    }
    return { total, covered };
  }
  assert.ok(plane(glider.enter)!.fold[0] < -16);
  for (const n of [16, 24, 28, 32, 36, 40, 44]) {
    const f = frame(n),
      { total, covered } = paperCoverage(f.backdrop!, f.layers.body);
    assert.ok(total > 240 && covered === 0, 'clear approach at ' + n);
  }
  const open = frame(glider.catch - 1).points;
  assert.ok(distance(open.finger, open.thumb) > 5);
  for (const n of [glider.catch, 59, 74, 85, 96, 104, glider.throw]) {
    const f = frame(n),
      state = plane(n)!,
      { total, covered } = paperCoverage(f.layers.fxu, f.layers.body);
    assert.deepEqual(state.fold, f.points.pinch);
    assert.ok(distance(f.points.finger, f.points.thumb) < 2 && visibleAt(f, 'handL', state.fold));
    assert.ok(total > 240 && covered > 0 && covered / total < 0.15, 'only the held edge is covered at ' + n);
  }
  const land = frame(glider.perch),
    bothDown = frame(glider.perch + 2);
  assert.ok(land.points.footR[1] < 125 && bothDown.points.footL[1] > 118);
  assert.ok(land.points.footL[1] < bothDown.points.footL[1] - 2);
  assert.ok(land.points.head[1] < frame(89).points.head[1] - 3);
  for (let n = 56; n <= glider.perch; n++) {
    const dy = frame(n).points.footR[1] - frame(n - 1).points.footR[1];
    assert.ok(dy >= -0.15 && dy < 3.5, 'continuous descent at ' + n);
  }
  for (const n of [96, glider.throw, 114, 125]) {
    assert.deepEqual(frame(n).points.footR, land.points.footR);
    assert.deepEqual(frame(n).points.footL, bothDown.points.footL);
    assert.ok(!empty(frame(n).layers.over));
  }
  const free = frame(glider.free).points;
  assert.ok(distance(free.finger, free.thumb) > 5);
  assert.ok(plane(glider.throw)!.fold[0] + 18 < 160);
  assert.ok(plane(116)!.fold[0] > 160 && distance(plane(116)!.fold, frame(116).points.pinch) > 25);
  assert.deepEqual(frame(151).backdrop!.data, frame(0).backdrop!.data);
});

test('both cheeks swell away from the hands and the three crest tips fold into a bud', async () => {
  const { c, s, b } = await loadPainting('zephyr_whorl');
  const cheeks = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  const width = (n: number) => {
    const p = cheeks(n).points;
    return distance(p.cheekL, p.cheekR);
  };
  for (const n of [11, 16, 21]) {
    const f = cheeks(n);
    assert.ok(width(n) > width(0) + 19);
    assert.ok(distance(f.points.handL, f.points.mouth) > 15 && distance(f.points.handR, f.points.mouth) > 20);
    assert.ok(empty(f.layers.fxo));
  }
  assert.ok(!empty(cheeks(26).layers.fxo) && width(30) < width(21) - 16);
  assert.deepEqual(cheeks(47).layers.body.data, cheeks(0).layers.body.data);
  const spread = (n: number) => {
    const p = compose(c, s, b, 'fidget_b', n / 24).points;
    return Math.max(distance(p.blade0, p.blade1), distance(p.blade1, p.blade2), distance(p.blade2, p.blade0));
  };
  assert.ok(spread(0) > 40 && spread(17) < 9 && spread(28) < 9 && spread(49) > 40);
});

test('the meadow covers every field pixel through the three-second scenery loop', () => {
  for (let n = 0; n < 72; n++) {
    const field = new Px(160, 128);
    meadow(field, n / 24);
    assert.ok(
      field.data.every((value, i) => i % 4 !== 3 || value === 255),
      'opaque field at ' + n,
    );
  }
});
