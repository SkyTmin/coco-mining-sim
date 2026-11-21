import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { loadPainting } from '../render';
import type { Px } from '../rig/px';

// Read the shadow actually painted under the actor, including its overlapping inner ellipse.
function shadow(layer: Px) {
  let left = layer.w, right = -1, opacity = 0;
  for (let y = 0; y < layer.h; y++) {
    for (let x = 0; x < layer.w; x++) {
      const i = 4 * (y * layer.w + x);
      if (!layer.data[i + 3] || layer.data[i] !== 18 || layer.data[i + 1] !== 13 || layer.data[i + 2] !== 21) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      opacity = Math.max(opacity, layer.data[i + 3]);
    }
  }
  return { width: right - left + 1, opacity };
}

test('the warden vaults above a shrinking shadow while the released glaive turns end over end', async () => {
  const { c, s, b } = await loadPainting('moon_warden');
  // The throw leaves the palm at 21 and is caught behind the back at 48.
  let rotation = 0, previous = 0, peak = 0, apex = 21;
  for (let frame = 21; frame <= 48; frame++) {
    const { points } = c.frame('trick', frame / 24, 0, 'normal');
    const [x, y] = points.weaponGrip;
    const angle = Math.atan2(points.weaponTip[1] - y, points.weaponTip[0] - x);
    if (frame > 21) rotation += Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous));
    previous = angle;
    const clearance = Math.min(...['L', 'R'].map(side => points['foot' + side + 'Ground'][1] - points['foot' + side][1]));
    if (clearance > peak) { peak = clearance; apex = frame; }
    if (frame === 48) assert.ok(Math.hypot(points.handR[0] - x, points.handR[1] - y) < 2);
  }
  assert.ok(peak >= 20, 'both feet must clear the floor by 20 native pixels');
  assert.ok(Math.abs(rotation) >= 3 * Math.PI, 'the shaft must visibly complete one and a half turns');
  const takeoff = shadow(compose(c, s, b, 'trick', 0).layers.fxu);
  const airborne = shadow(compose(c, s, b, 'trick', apex / 24).layers.fxu);
  assert.ok(airborne.width > 0 && airborne.width < takeoff.width);
  assert.ok(airborne.opacity > 0 && airborne.opacity < takeoff.opacity);
});
