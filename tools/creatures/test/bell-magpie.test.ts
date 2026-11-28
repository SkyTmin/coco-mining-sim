import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { visibleOwnedPixels } from '../studio/visibility';
import { maskOf } from '../tech-metrics';
import type { Px } from '../rig/px';
import type { XY } from '../types';
import { bath, bellAt, ring } from '../c/bell_magpie-keys';
import { sandHollow } from '../scenes/bell_courtyard';

const empty = (p: Px) => !p.data.some((v, i) => i % 4 === 3 && v > 0);
const gap = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('the red knot moves first, stays between the bills during the pull and swings free after release', async () => {
  const { c, s, b } = await loadPainting('bell_magpie');
  const frame = (n: number) => compose(c, s, b, 'trick', n / 24);
  assert.ok(gap(bellAt(0).knot, bellAt(9).knot) > 4);
  assert.deepEqual(frame(0).points.footR, frame(9).points.footR);
  const approaching = frame(36).points;
  assert.ok(
    gap(approaching.upperBill, approaching.lowerBill) > 5 && gap(approaching.beak, bellAt(36).knot) > 2,
  );
  for (let n = ring.seize; n < ring.release; n++) {
    const f = frame(n),
      state = bellAt(n),
      rig = f.body.rig!;
    assert.ok(gap(f.points.beak, state.knot) < 0.01 && gap(f.points.upperBill, f.points.lowerBill) < 1);
    const pixels = visibleOwnedPixels(
      rig,
      f,
      rig.prims.map((q) => (q.t === 'beak' ? q.t : undefined)),
    ).get('beak')!;
    assert.ok(
      pixels.some(([x, y]) => gap([x - 8, y - 8], state.knot) < 3.5),
      'visible contact at ' + n,
    );
    assert.ok(Math.max(f.points.footL[1], f.points.footR[1]) < f.worldFeet[1] - 3, 'feet hang clear at ' + n);
  }
  assert.ok(bellAt(54).knot[1] > bellAt(39).knot[1] + 7);
  const released = frame(ring.release).points;
  assert.ok(gap(released.upperBill, released.lowerBill) > 6);
  assert.ok(gap(frame(74).points.beak, bellAt(74).knot) > 18 && bellAt(74).angle > 0.25);
  assert.deepEqual(frame(133).backdrop!.data, frame(0).backdrop!.data);
});

test('each wing throws sand from inside the hollow, then the bird lands on the rail before shaking', async () => {
  const { c, s, b } = await loadPainting('bell_magpie');
  const frame = (n: number) => compose(c, s, b, 'trick_b', n / 24);
  const [cx, cy] = sandHollow;
  assert.ok(empty(frame(bath.strokes[0] - 1).layers.fxo));
  for (const [i, n] of bath.strokes.entries()) {
    const f = frame(n),
      side = i < 2 ? 'L' : 'R',
      key = 'tip' + side;
    const [x, y] = f.points[key];
    assert.ok(((x - cx) / 32) ** 2 + ((y - cy) / 10.4) ** 2 < 1, 'wing reaches loose sand at ' + n);
    assert.ok(f.body.joints![key][2] < 1.2);
    const named = 'wing' + side,
      rig = f.body.rig!;
    const ink = visibleOwnedPixels(
      rig,
      f,
      rig.prims.map((q) => (q.t === named ? named : undefined)),
    ).get(named)!;
    assert.ok(
      ink.some(([a, b]) => gap([a - 8, b - 8], [x, y]) < 3),
      'contact visible beside body at ' + n,
    );
    assert.ok(maskOf(frame(n + 4).layers.fxo).pixels.size > 18, 'sand fans out after ' + n);
  }
  const land = frame(bath.rail);
  assert.ok(
    maskOf(land.layers.over).pixels.size > 0 &&
      land.points.footR[1] >= 126 &&
      land.points.footR[1] < 128 &&
      land.points.footL[1] > 119 &&
      land.points.footL[1] < 125,
  );
  for (const n of [104, 107, 112, 115]) {
    assert.deepEqual(frame(n).points.footR, land.points.footR, 'toes stay on the rail at ' + n);
  }
  assert.ok(maskOf(frame(109).layers.fxo).pixels.size > 10);
  const end = frame(149);
  assert.ok(empty(end.layers.over) && empty(end.layers.fxo));
  assert.deepEqual(end.layers.body.data, compose(c, s, b, 'idle', 0).layers.body.data);
});

test('the bill combs an actual lifted feather, and the graduated tail opens into a fan and folds again', async () => {
  const { c, s, b } = await loadPainting('bell_magpie');
  const preen = (n: number) => compose(c, s, b, 'fidget_a', n / 24);
  for (let n = 12; n <= 29; n++) {
    const f = preen(n),
      rig = f.body.rig!;
    assert.ok(gap(f.points.upperBill, f.points.comb) < 0.01);
    const visible = visibleOwnedPixels(
      rig,
      f,
      rig.prims.map((q) => q.t),
    );
    for (const part of ['beak', 'wingR']) {
      assert.ok(
        visible.get(part)!.some(([x, y]) => gap([x - 8, y - 8], f.points.comb) < 2),
        part + ' stays visible beside the feather at ' + n,
      );
    }
  }
  assert.ok(gap(preen(12).points.comb, preen(15).points.comb) > 12);
  const width = (n: number) => {
    const p = compose(c, s, b, 'fidget_b', n / 24).points;
    return gap(p.trainL, p.trainR);
  };
  assert.ok(width(20) > width(15) + 16 && width(27) > width(53) + 16);
});
