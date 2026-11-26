import assert from 'node:assert/strict';
import test from 'node:test';
import { cushionAt, hug, visit } from '../c/lunar_plush-keys';
import { fireflyAt } from '../c/lunar_plush-fx';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { catchTop } from '../scenes/moon_nursery';
import { visibleOwnedPixels } from '../studio/visibility';
import type { XY } from '../types';

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
test('the two mittens lift one five-point cushion, squeeze it at the cheek and put it back before leaving', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick', n / 24);
  const start = cushionAt(0);
  for (const n of [hug.grasp, hug.lift, hug.cheek, 73, hug.lower, hug.rest]) {
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

test('first both eyes disappear under the mittens, then one eye peeks at the approaching visitor', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  const count = (m: Map<string, XY[]>, k: string) => m.get(k)?.length ?? 0;
  const covered = surfaces(frame(44)),
    peek = surfaces(frame(64)),
    uncovered = surfaces(frame(79));
  for (const eye of ['eyeL', 'eyeR']) assert.ok(count(covered, eye) <= 3);
  assert.ok(count(peek, 'eyeR') <= 3 && count(peek, 'eyeL') >= 50);
  for (const hand of ['handL', 'handR']) assert.ok(count(covered, hand) > 60);
  for (const eye of ['eyeL', 'eyeR']) assert.ok(count(uncovered, eye) > 40);
});

test('the firefly leaves the window catch, settles on the nose and returns to its perch', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  const historical = (t: number, k: string) => frame(Math.round(t * 24)).points[k];
  const pose = (n: number) => fireflyAt({ points: frame(n).points, pointAt: historical }, n);
  assert.deepEqual(pose(visit.leave).feet, catchTop);
  assert.ok(pose(32).air && distance(pose(32).feet, catchTop) > 12);
  for (const n of [visit.nose, 96, 104, visit.farewell]) {
    const f = frame(n),
      bug = fireflyAt({ points: f.points, pointAt: historical }, n);
    assert.deepEqual(bug.feet, f.points.nose);
    assert.equal(bug.air, false);
    const [x, y] = bug.feet.map(Math.round);
    assert.ok(f.layers.fxo.solid(x + 8, y + 8), 'a foot touches the nose on the actual insect layer');
  }
  assert.ok(pose(119).air);
  assert.deepEqual(pose(visit.home).feet, catchTop);
  assert.deepEqual(frame(151).picture.data, frame(0).picture.data);
});

test('the waving mitten clears the pom and the hovering firefly stays in open air outside the ears', async () => {
  const { c, s, b } = await loadPainting('lunar_plush');
  const wave = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  const out = wave(16),
    back = wave(21);
  assert.ok(distance(out.points.handL, back.points.handL) >= 10);
  for (const f of [out, back, wave(26)]) {
    assert.ok(distance(f.points.handL, f.points.pom) > 42);
    assert.ok(f.points.handL[0] > f.points.cheekL[0] + 6);
  }
  for (const n of [35, 44, 53, 60, 69]) {
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
