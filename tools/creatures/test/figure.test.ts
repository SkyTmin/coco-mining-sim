import assert from 'node:assert/strict';
import test from 'node:test';
import { F3, Rig, renderRig, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn } from '../kit/f11-mobkit';
import { projectFigure } from '../rig/figure';

test('reframing keeps a protruding limb, glow, eye and socket in world coordinates', () => {
  const r = new Rig(),
    material: Mat = { T: tn('#402d3a', '#73505b', '#a98176', '#efd8b6'), glow: 0.65 };
  const F = F3.yaw(0),
    tip: V3 = [14, 2, 4],
    original: [number, number] = [15, 17];
  r.ell(F, [0, 0, 6], [5, 5, 6], material).cap(F.p(4, 0, 5), tip, 2, 3, material);
  r.eye = F.p(15, 5, 4);
  r.dot(r.eye, hx('#faf5dc'), 0.8);
  const frame = projectFigure(r, 24, original, { tip }, '#30293a'),
    pad = 20;
  const full = renderRig(r, 64, 64, original[0] + pad, original[1] + pad, {
    outline: hx('#30293a'),
    inner: 3.8,
  });
  assert.ok(frame.anchor[0] < original[0]);
  assert.deepEqual(frame.points.tip, [frame.anchor[0] + 14, frame.anchor[1] - 2]);
  const ox = pad + original[0] - frame.anchor[0],
    oy = pad + original[1] - frame.anchor[1];
  assert.ok(full.eye);
  assert.deepEqual(frame.eye, [full.eye[0] - ox, full.eye[1] - oy]);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      assert.deepEqual(frame.px.get(x - ox, y - oy), full.p.get(x, y));
      assert.deepEqual(frame.lit?.get(x - ox, y - oy), full.lit?.get(x, y));
    }
});
