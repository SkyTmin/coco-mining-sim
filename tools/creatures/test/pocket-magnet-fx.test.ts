import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, frameCount } from '../engine';
import { loadPainting } from '../render';
import { sizeOf } from '../types';
import { fishTab, fishStop, starAt } from '../c/pocket_magnet-poses';
import { catchStar, fishLatch, fishReturn } from '../c/pocket_magnet_fx-beats';

const base = await loadPainting('pocket_magnet');
const experiment = await loadPainting('pocket_magnet_fx');
const border = sizeOf(experiment.c)[3];
const frame = (p: typeof base, anim: string, n: number) => compose(p.c, p.s, p.b, anim, n / 24);

function hasLightAt(f: ReturnType<typeof compose>, x: number, y: number, radius: number) {
  const light = f.light;
  if (!light) return false;
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const i = ((Math.round(y) + border + dy) * light.w + Math.round(x) + border + dx) * 4;
    if (light.data[i + 3] && light.data[i] + light.data[i + 1] + light.data[i + 2] > 0) return true;
  }
  return false;
}

test('magnetic light follows the fish eye, the tray stop, and the returning star', () => {
  for (const [anim, n, [x,y]] of [
    ['trick', fishLatch, fishTab], ['trick', fishReturn, [fishStop, 98]],
    ['trick_b', catchStar, starAt(catchStar).contact],
  ] as const) {
    const seen = frame(experiment, anim, n);
    assert.ok(hasLightAt(seen, x, y, 3), anim + ' frame ' + n);
    const steady = frame(base, anim, n);
    assert.deepEqual(seen.layers.body.data, steady.layers.body.data);
  }
});

test('the bench toys remain in the ordinary clips and both bursts have finished on return to rest', () => {
  for (const [name,n] of [['idle',31],['walk_e',6],['trick',19],['trick_b',79]] as const)
    assert.deepEqual(frame(experiment,name,n).picture.data, frame(base,name,n).picture.data, name);
  for (const name of ['trick', 'trick_b']) {
    const end = frameCount(experiment.c.animations[name].seconds) - 1;
    assert.equal(frame(experiment, name, end).light, undefined);
  }
  // 28.11: the owner moved the B22 catch into the accepted Polyusik, so both carry the same two-frame hold.
  assert.equal(frameCount(experiment.c.animations.trick_b.seconds), frameCount(base.c.animations.trick_b.seconds));
  const caught = frame(experiment, 'trick_b', catchStar);
  for (const offset of [1,2]) assert.deepEqual(frame(experiment,'trick_b',catchStar+offset).picture.data, caught.picture.data);
});
