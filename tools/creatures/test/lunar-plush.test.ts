import assert from 'node:assert/strict';
import test from 'node:test';
import pet from '../c/lunar_plush';
import { withPointsOnly } from '../rig/figure';
import { vlen, vsub } from '../rig/f15-rig';
import { cushionAt, hug, visit } from '../c/lunar_plush-keys';
import { fireflyAt } from '../c/lunar_plush-fx';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { catchTop } from '../scenes/moon_nursery';
import { visibleOwnedPixels } from '../studio/visibility';
import type { BodyFrame, XY } from '../types';

const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function surfaces(f: ReturnType<typeof compose>) {
  const r = f.body.rig!;
  return visibleOwnedPixels(
    r,
    f,
    r.prims.map((q) => q.t),
  );
}
function touch(a: XY[], b: XY[]) {
  return a.some((p) => b.some((q) => distance(p, q) <= 1.5));
}
function pawMeasurements(frame: BodyFrame, side: string) {
  const parts = frame.rig!.prims;
  const [upper, lower] = parts.filter((q) => q.k === 1 && q.t === 'arm' + side);
  const mitten = parts.find((q) => q.k === 0 && q.t === 'hand' + side);
  assert.ok(upper?.k === 1 && lower?.k === 1 && mitten?.k === 0);
  assert.deepEqual(upper.b, lower.a);
  assert.deepEqual(lower.b, frame.joints!['hand' + side]);
  assert.deepEqual(mitten.c, lower.b);
  return [
    vlen(vsub(lower.b, upper.a)),
    vlen(vsub(upper.b, upper.a)),
    vlen(vsub(lower.b, lower.a)),
    upper.r0,
    upper.r1,
    lower.r0,
    lower.r1,
    ...mitten.a.map(vlen),
  ];
}
test('both little paws keep their resting span, bone lengths and mitten size in every authored pose', () => {
  const sides = ['L', 'R'];
  const at = (clip: string, n: number, facing: number, gold = false) =>
    withPointsOnly(() =>
      pet.frame(clip, n / 24, facing, gold ? 'gold' : 'normal', { headSide: facing, gaitPhase: n / 24 }),
    );
  const idle = at('idle', 0, 0);
  const reference = sides.map((side) => pawMeasurements(idle, side));
  for (const [span] of reference) assert.ok(span > 7.8 && span < 8);
  for (const [clip, animation] of Object.entries(pet.animations)) {
    for (let n = 0; n < Math.round(animation.seconds * 24); n++) {
      const directions =
        clip === 'walk' ? [0, 2, 4, 6, 8, 10, 12, 14] : [clip === 'turn' ? Math.floor(n / 6) % 16 : 0];
      for (const facing of directions) {
        const frame = at(clip, n, facing, n % 2 === 1);
        for (const [i, side] of sides.entries()) {
          const values = pawMeasurements(frame, side);
          assert.ok(
            values.every((v, j) => Math.abs(v - reference[i][j]) < 1e-6),
            clip + ' ' + n + ' ' + side,
          );
        }
      }
    }
  }
});

test('the two mittens lift one five-point cushion, squeeze it at the cheek and put it back before leaving', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick', n / 24);
  const start = cushionAt(0);
  for (let n = hug.grasp; n <= hug.rest; n++) {
    const parts = surfaces(frame(n)),
      pillow = parts.get('pillow')!;
    assert.ok(pillow.length > 200, 'the cushion keeps a readable face');
    for (const hand of ['handL', 'handR']) {
      const mitten = parts.get(hand)!;
      assert.ok(mitten.length > 30 && touch(mitten, pillow), hand + ' loses contact at ' + n);
    }
  }
  assert.equal(cushionAt(hug.lift).y, start.y);
  assert.ok(start.y - cushionAt(hug.cheek).y >= 7);
  assert.ok(cushionAt(hug.cheek).squeeze > 0.95);
  assert.ok(surfaces(frame(73)).get('eyeR')!.length >= 6, 'the closed eye shows beside the star');
  assert.deepEqual(cushionAt(hug.release), start);
  assert.deepEqual(frame(139).picture.data, frame(0).picture.data);
});

test('three rounds of peekaboo hold the hidden face, alternate the peeking eye and give time to see both eyes again', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  assert.equal(c.animations.trick_b.seconds, 12);
  assert.equal(visit.rounds.length, 3);
  for (const [index, { hide, peek, open }] of visit.rounds.entries()) {
    const openEye = index === 1 ? 'eyeL' : 'eyeR',
      shutEye = index === 1 ? 'eyeR' : 'eyeL';
    // Sample across each sustained pose. A single readable key is too short at gallery speed.
    for (const offset of [0, 6, 12]) {
      const hidden = surfaces(frame(hide + offset)),
        one = surfaces(frame(peek + offset));
      for (const side of ['L', 'R']) {
        assert.ok((hidden.get('eye' + side)?.length ?? 0) <= 3);
        assert.ok((hidden.get('hand' + side)?.length ?? 0) > 60);
      }
      assert.ok((one.get(openEye)?.length ?? 0) >= 50 && (one.get(shutEye)?.length ?? 0) <= 3);
    }
    for (const offset of [0, 4, 7]) {
      const both = surfaces(frame(open + offset));
      for (const side of ['L', 'R']) assert.ok((both.get('eye' + side)?.length ?? 0) > 40);
    }
    const bug = fireflyAt(
      {
        points: frame(peek).points,
        pointAt: () => {
          throw Error('hover');
        },
      },
      peek,
    );
    assert.ok(index === 1 ? bug.feet[0] > 100 : bug.feet[0] < 30);
  }
});

test('the firefly leaves the window catch, settles on the nose and returns to its perch', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  const historical = (t: number, k: string) => frame(Math.round(t * 24)).points[k];
  const pose = (n: number) => fireflyAt({ points: frame(n).points, pointAt: historical }, n);
  assert.deepEqual(pose(visit.leave).feet, catchTop);
  assert.ok(pose(32).air && distance(pose(32).feet, catchTop) > 12);
  for (const n of [visit.nose, visit.nose + 7, visit.farewell - 3, visit.farewell]) {
    const f = frame(n),
      bug = fireflyAt({ points: f.points, pointAt: historical }, n);
    assert.deepEqual(bug.feet, f.points.nose);
    assert.equal(bug.air, false);
    const [x, y] = bug.feet.map(Math.round);
    assert.ok(f.layers.fxo.solid(x + 8, y + 8), 'a foot touches the nose on the actual insect layer');
  }
  assert.ok(pose(visit.farewell + 12).air);
  assert.deepEqual(pose(visit.home).feet, catchTop);
  assert.deepEqual(frame(visit.end).picture.data, frame(0).picture.data);
});

test('a short mitten strokes each cheek twice while the other one rests on the bib', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'fidget_b', n / 24);
  for (const [side, other, start] of [
    ['R', 'L', 8],
    ['L', 'R', 28],
  ] as const) {
    const hand = 'hand' + side,
      brace = 'hand' + other,
      low = frame(start);
    for (const offset of [4, 12]) {
      const top = frame(start + offset),
        before = frame(start + offset - 4);
      assert.ok(before.points[hand][1] - top.points[hand][1] > 8);
      assert.ok(distance(low.points[brace], top.points[brace]) < 0.01);
      for (const dn of [-1, 0, 1]) {
        const parts = surfaces(frame(start + offset + dn));
        assert.ok(touch(parts.get(hand)!, parts.get('cheek' + side)!));
        assert.ok(!touch(parts.get(brace)!, parts.get('cheek' + other)!));
      }
    }
  }
});
test('the waving mitten clears the pom and the hovering firefly stays in open air outside the ears', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const wave = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  const out = wave(16),
    back = wave(21);
  assert.ok(distance(out.points.handL, back.points.handL) >= 8);
  for (const f of [out, back, wave(26)]) {
    assert.ok(distance(f.points.handL, f.points.pom) > 42);
    assert.ok(f.points.handL[0] > f.points.cheekL[0]);
    assert.ok(distance(f.points.handL, f.points.cheekL) >= 6);
    assert.ok((surfaces(f).get('handL')?.length ?? 0) >= 25);
  }
  for (let n = 31; n <= visit.rounds[2].open + 7; n += 4) {
    const f = compose(c, s, b, 'trick_b', n / 24),
      parts = surfaces(f);
    const bug = fireflyAt(
      {
        points: f.points,
        pointAt: () => {
          throw Error('the hover is independent of the actor');
        },
      },
      n,
    );
    const earPixels = [...parts.get('earL')!, ...parts.get('earR')!];
    assert.ok(
      earPixels.every(([x, y]) => distance([x - 8, y - 8], bug.feet) > 8),
      'insect overlaps the ear at ' + n,
    );
  }
});
