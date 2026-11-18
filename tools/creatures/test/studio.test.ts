import test from 'node:test';
import assert from 'node:assert/strict';
import { F3, Rig, type Mat } from '../rig/f15-rig';
import { tn } from '../kit/f11-mobkit';
import { baselineOf, clipPairs, worstClip } from '../studio/clip';
import { captureRig } from '../studio/capture';
import { creatureIds, inputsOf } from '../studio/cache';
import { loadPainting } from '../render';

const fur: Mat = { T: tn('#333333', '#666666', '#999999', '#cccccc') };
const wood: Mat = { T: tn('#332211', '#664422', '#996633', '#cc9944') };
function body(armEnd: [number, number, number]) {
  const r = new Rig();
  r.tag = 'torso';
  r.ell(F3.yaw(0), [0, 0, 30], [12, 14, 16], fur);
  r.tag = 'arm';
  r.cap([0, 13, 38], armEnd, 3, 2.5, fur);
  r.tag = 'club';
  r.cap([20, 20, 20], [30, 22, 40], 2, 2, wood);
  return r;
}

test('a forearm swung into the torso is a clip; the same arm held outside is not', () => {
  const rest = baselineOf(body([0, 26, 24]));
  const inside = worstClip(body([2, -2, 28]), rest);
  assert.ok(inside, 'arm through the torso must be reported');
  assert.equal(inside.capLabel, 'arm');
  assert.equal(inside.ellLabel, 'torso');
  assert.ok(inside.depth < 0.3);
  assert.equal(worstClip(body([0, 28, 22]), rest), null);
});

test('an overlap already present in the rest pose is designed, and allow rules silence a pair', () => {
  const restRig = body([2, -2, 28]);
  assert.equal(worstClip(body([2, -2, 28]), baselineOf(restRig)), null);
  const rest = baselineOf(body([0, 26, 24]));
  assert.equal(worstClip(body([2, -2, 28]), rest, [{ a: 'arm', b: 'torso' }]), null);
});

test('only capsules clearly smaller than the ellipsoid are tested', () => {
  const r = new Rig();
  r.ell(F3.yaw(0), [0, 0, 0], [3, 3, 3], fur);
  r.cap([0, 0, -20], [0, 0, 20], 4, 4, wood);
  assert.equal(clipPairs(r).length, 0);
});

test('captureRig returns the largest rig built during a draw call', () => {
  const { rig, rigs } = captureRig(() => {
    const small = new Rig();
    small.ball([0, 0, 0], 1, fur);
    return body([0, 26, 24]);
  });
  assert.equal(rigs.length, 2);
  assert.equal(rig?.prims.length, 3);
});

test('render cache inputs: own files and helpers in, other creatures out', async () => {
  const ids = creatureIds();
  assert.ok(ids.includes('frost_yeti') && !ids.includes('engraving'));
  const { c } = await loadPainting('frost_yeti');
  const files = inputsOf('frost_yeti', c.theme, c.rarity).map((f) => f.split('/tools/creatures/')[1]);
  assert.ok(files.includes('c/frost_yeti-keys.ts'));
  assert.ok(files.includes('c/engraving.ts'));
  assert.ok(files.includes('scenes/' + c.theme + '.ts'));
  assert.ok(!files.some((f) => f.startsWith('c/toad_shaman')));
  assert.ok(!files.some((f) => f.startsWith('test/') || f.startsWith('studio/')));
});
