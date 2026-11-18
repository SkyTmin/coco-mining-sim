import test from 'node:test';
import assert from 'node:assert/strict';
import { Px } from '../rig/px';
import {
  maskOf,
  maskMetrics,
  maskIoU,
  pathLength,
  pointPathDistance,
  trailDeviation,
  readReferences,
  referenceLimits,
  measureCreature,
  pilotIds,
} from '../tech-metrics';

test('registered silhouettes cancel camera translation and retain body motion', () => {
  const a = new Px(16, 15),
    b = new Px(16, 15),
    ink: [number, number, number, number] = [180, 120, 80, 255];
  a.rect(2, 2, 5, 6, ink);
  b.rect(4, 3, 7, 7, ink);
  b.set(11, 1, [100, 110, 120, 200]);
  const one = maskOf(a),
    aligned = maskOf(b, [-2, -1]);
  assert.equal(one.height, 5);
  assert.equal(one.pixels.size, 20);
  assert.equal(maskIoU(one, aligned), 1);
  assert.equal(maskMetrics(one, aligned, 5).comRatio, 0);
  const displaced = maskOf(b, [-1, -1]),
    actual = maskMetrics(one, displaced, 5);
  assert.equal(actual.iou, 15 / 25);
  assert.equal(actual.comRatio, 0.2);
});
test('weapon length follows the polyline and ink distances use segments, including zero-length pieces', () => {
  const path: [number, number][] = [
    [1, 1],
    [4, 1],
    [4, 1],
    [4, 5],
  ];
  assert.equal(pathLength(path), 7);
  assert.equal(pointPathDistance([3, 3], path), 1);
  assert.equal(pointPathDistance([4, 7], path), 2);
  assert.equal(pointPathDistance([1, 1], []), Infinity);
});
test('a shifted visible stroke fails even if the brush reports the shifted path as its weapon', () => {
  const ink: [number, number][] = [
    [1, 8],
    [2, 8],
    [3, 8],
  ];
  const claimed: [number, number][] = [
    [0, 8],
    [4, 8],
  ];
  const physical: [number, number][] = [
    [0, 1],
    [4, 1],
  ];
  assert.equal(trailDeviation(ink, claimed, physical), 7);
  assert.equal(trailDeviation(ink, claimed, claimed), 0);
});
test('every named benchmark comes from a measured native rig', () => {
  const refs = readReferences();
  for (const id of ['guardian-strike', 'mammoth-tusks', 'mammoth-stomp', 'hourlord-hour', 'puppeteer-cut']) {
    const r = refs[id];
    assert.ok(r, id);
    assert.ok(
      r.bodyHeight > 0 &&
        r.prepFrame < r.hitFrame &&
        r.comRatio > 0 &&
        r.iou > 0 &&
        r.iou < 1 &&
        r.tipRatio !== null &&
        r.tipRatio > 0,
      id,
    );
    const limit = referenceLimits(r);
    assert.ok(limit.comRatio >= r.comRatio && limit.iou <= r.iou && limit.tipRatio >= r.tipRatio, id);
  }
});
const counts = [2, 2, 3, 4, 5, 6, 6];
for (const [i, id] of pilotIds.entries())
  test(id + ' each technique meets its reference, makes contact and has its own silhouette', async () => {
    const result = await measureCreature(id),
      failures: string[] = [];
    assert.equal(result.techniques.length, counts[i], id);
    for (const row of result.techniques)
      for (const problem of row.issues) failures.push(row.anim + ': ' + problem);
    for (const pair of result.pairs)
      if (pair.iou > 0.7 + 1e-8)
        failures.push(pair.a + ' / ' + pair.b + ' contact IoU ' + pair.iou.toFixed(3) + ' > 0.70');
    assert.deepEqual(failures, [], id + '\n' + failures.join('\n'));
  });
