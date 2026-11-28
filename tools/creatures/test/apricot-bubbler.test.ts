import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPainting } from '../render';
import { compose } from '../engine';
import { reelChapters } from '../motion';
import { bubbleAt } from '../c/apricot_bubbler-fx';
import { boatFrame } from '../c/apricot_bubbler-poses';
import { authoredFoot } from '../c/apricot_bubbler-steps';
import type { XY } from '../types';

const bubbler = await loadPainting('apricot_bubbler');
const gap = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('the bubble inflates on the lip, floats clear, meets the jumping muzzle, then bursts', () => {
  const { c, s, b } = bubbler;
  const gapAt = (n: number) => {
    const nose = compose(c, s, b, 'trick', n / 24).points.lip;
    const ball = bubbleAt(n, nose);
    return ball ? gap(ball.center, nose) - ball.radius : undefined;
  };
  for (const n of [20, 26, 34, 42, 45, 86, 87, 88, 89])
    assert.ok(Math.abs(gapAt(n)!) < 0.12, 'tangent lip on ' + n);
  assert.ok(gapAt(60)! > 11 && gapAt(73)! > 9);
  assert.ok(gapAt(84)! < gapAt(78)!);
  assert.equal(gapAt(90), undefined);
  assert.equal(gapAt(148), undefined);
});
test('both puffs are aimed through the bore at the moving sail; the entire chase fits inside the painting', () => {
  const { c, s, b } = bubbler;
  const pad = 8;
  for (let n = 0; n < 192; n++) {
    const q = compose(c, s, b, 'trick_b', n / 24),
      actor = q.layers.body;
    for (let y = pad; y < actor.h - pad; y++) {
      assert.ok(!actor.solid(pad, y) && !actor.solid(actor.w - pad - 1, y), 'clear of frame at ' + n);
    }
    if ((n >= 42 && n <= 60) || (n >= 113 && n <= 131)) {
      const boat = boatFrame(n),
        mouth = q.points.lip,
        axis = q.points.axis;
      const u = [axis[0] - mouth[0], axis[1] - mouth[1]],
        v = [boat.x - mouth[0], boat.y - 7 - mouth[1]];
      assert.ok(u[0] * (n < 100 ? 1 : -1) > 1, 'wind pushes away from the occupied bank at ' + n);
      assert.ok(
        (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)) > 0.995,
        'puff reaches the sail at ' + n,
      );
    }
  }
  assert.deepEqual(boatFrame(0).x, boatFrame(191).x);
  assert.ok(boatFrame(83).x - boatFrame(0).x > 49);
  for (const [start, end, sign] of [
    [42, 83, 1],
    [113, 155, -1],
  ]) {
    for (let n = start + 1; n <= end; n++) assert.ok(sign * (boatFrame(n).x - boatFrame(n - 1).x) > 0);
  }
});
test('the dragon leaves the supporting diagonal planted while trotting and turning beside the trough', () => {
  const { c, s, b } = bubbler;
  const feet = [
    [1, -1, 'footFL'],
    [1, 1, 'footFR'],
    [-1, -1, 'footHL'],
    [-1, 1, 'footHR'],
  ] as const;
  let previous = compose(c, s, b, 'trick_b', 0).points;
  for (let n = 1; n < 192; n++) {
    const pts = compose(c, s, b, 'trick_b', n / 24).points;
    let planted = 0;
    for (const [front, side, label] of feet) {
      if (authoredFoot('trick_b', n / 24, front, side)!.lift > 0.00001) continue;
      planted++;
      if (authoredFoot('trick_b', (n - 1) / 24, front, side)!.lift < 0.00001)
        assert.ok(gap(previous[label], pts[label]) < 0.001, label + ' slips on frame ' + n);
    }
    assert.ok(planted >= 2, 'two paws support the body on frame ' + n);
    previous = pts;
  }
});
test('all eight headings in the dragon’s showreel run on the paving behind the trough', () => {
  const { c, s, b } = bubbler;
  const route = reelChapters(c).filter((chapter) => chapter.name.startsWith('walk_'));
  assert.equal(new Set(route.map((chapter) => chapter.name)).size, 8);
  for (const chapter of route) {
    for (let n = chapter.start; n < chapter.end; n++) {
      const frame = compose(c, s, b, 'showreel', n / 24);
      const feet = frame.points,
        body = frame.layers.body;
      for (const key of ['footFL', 'footFR', 'footHL', 'footHR'])
        assert.ok(feet[key][1] < 107, key + ' reaches the water on frame ' + n);
      // Eight pixels of rail and at least six pixels of clear field on every side.
      for (let y = 8; y < body.h - 8; y++)
        for (let x = 8; x < body.w - 8; x++)
          if (x < 14 || y < 14 || x >= body.w - 14 || y >= body.h - 14)
            assert.ok(!body.solid(x, y), 'silhouette reaches the margin on frame ' + n);
    }
  }
});
