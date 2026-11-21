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

test('captureRig prefers the frame’s own body rig over a larger rig built by an effect', () => {
  const { rig, rigs } = captureRig(() => {
    const own = new Rig();
    own.ball([0, 0, 0], 1, fur);
    body([0, 26, 24]); // another frame posed for a socket lookup: bigger, but not this picture
    return { body: { rig: own } };
  });
  assert.equal(rigs.length, 2);
  assert.equal(rig?.prims.length, 1);
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

test('a scene variant invalidates with its parent landscape and nested relief helpers', () => {
  const files = inputsOf('frost_fox', 'polar_ice_lagoon', 'rare').map((f) => f.split('/tools/creatures/')[1]);
  assert.ok(files.includes('scenes/polar_ice_lagoon.ts'));
  assert.ok(files.includes('scenes/polar_night.ts'));
  assert.ok(files.includes('scenes/relief.ts'));
  assert.ok(!files.includes('scenes/sky_post.ts'));
});

test('golden comparison names the changed frames and nothing else', async () => {
  const { compareGolden } = await import('../studio/snap');
  const old = { idle: ['a', 'b', 'c', 'd'], tech_x: ['e', 'f'] };
  assert.deepEqual(compareGolden(old, { idle: ['a', 'b', 'c', 'd'], tech_x: ['e', 'f'] }), []);
  assert.deepEqual(compareGolden(old, { idle: ['a', 'X', 'Y', 'd'], tech_x: ['e', 'f'] }), ['idle: 2/4 frames changed: 1–2']);
  assert.deepEqual(compareGolden(old, { idle: ['a', 'b', 'c', 'd'] }), ['tech_x: animation removed']);
});

test('foot sockets are recognised and the pilot walks keep planted feet still', async () => {
  const { FOOT_SOCKET, footSlide, slides } = await import('../studio/checks');
  // footL planted on y = 50 for frames 0–3 but drags 2 px at frame 2; footR swings in the air.
  const walk = [0, 1, 2, 3].map((n) => ({ footL: [10 + (n >= 2 ? 2 : 0), 50] as [number, number], footR: [n * 5, 40 - n] as [number, number] }));
  assert.deepEqual(slides(walk).frames, [2]);
  assert.equal(slides(walk).worstName, 'footL');
  for (const k of ['footL', 'footR', 'hindL', 'foreR', 'legL2']) assert.ok(FOOT_SOCKET.test(k), k);
  for (const k of ['footFloor', 'foot', 'fist', 'clubTip']) assert.ok(!FOOT_SOCKET.test(k), k);
  const p = await loadPainting('bramble_warden');
  assert.deepEqual(footSlide(p, {}, ['walk_e']), []);
});

test('a fist tucked behind the torso is "gone"; the same fist held in front, or behind another limb, is not', async () => {
  const { viewBaseline, worstGone } = await import('../studio/visibility');
  // In this projection +y is towards the viewer.
  function pose(y: number, shield = false) {
    const r = new Rig();
    r.tag = 'torso';
    r.ell(F3.yaw(0), [0, 0, 30], [12, 14, 16], fur);
    r.tag = 'head';
    r.ell(F3.yaw(0), [0, 0, 52], [7, 7, 7], fur);
    if (shield) {
      r.tag = 'armL';
      r.cap([-8, y + 8, 22], [8, y + 8, 22], 6, 6, wood);
    }
    r.tag = 'fistR';
    r.ball([0, y, 22], 4, wood);
    return r;
  }
  const rest = [viewBaseline(pose(20))];
  assert.ok(rest[0].get('fistR')!.share > 0.9, 'the fist in front of the torso is visible');
  const gone = worstGone(pose(-20), rest);
  assert.ok(gone, 'a fist behind the torso must be reported');
  assert.equal(gone.tag, 'fistR');
  assert.equal(gone.by, 'torso');
  assert.equal(worstGone(pose(20), rest), null);
  assert.equal(worstGone(pose(20, true), rest), null, 'covered by the other arm is normal');
  assert.equal(worstGone(pose(-20), rest, (t) => t === 'fistR'), null, 'studio.json can allow it');
});

test('foreground contact uses the painted field offset, including nonzero camera shake', async () => {
  const { coveredByForeground } = await import('../studio/checks');
  const { compose } = await import('../engine');
  const { c, s, b } = await loadPainting('frost_yeti');
  const f = compose(c, s, b, 'tech_slam', 19 / 24);
  assert.notDeepEqual(f.camera, [0, 0]);
  const [x, y] = [35, 56];
  const px = Math.round(x + f.feet[0] - f.worldFeet[0]);
  const py = Math.round(y + f.feet[1] - f.worldFeet[1]);
  const layer = f.layers.bgf;
  layer.data.fill(0);
  layer.rect(x - 2, y - 2, x + 2, y + 2, [255, 255, 255, 255]);
  assert.equal(coveredByForeground(f, [x, y]), false);
  layer.rect(px - 2, py - 2, px + 2, py + 2, [255, 255, 255, 255]);
  assert.equal(coveredByForeground(f, [x, y]), true);
});


test('a prop can hide in one chapter without masking a limb or even the same prop elsewhere', async () => {
  const { allowsOcclusion } = await import('../studio/checks');
  const rule = { part: 'coffer', anim: 'dive', frames: [30, 36] as [number, number], reason: 'nose emerges first' };
  const cfg = { partGone: [rule] };
  assert.ok(allowsOcclusion(cfg, 'coffer', 'dive', 30));
  assert.ok(allowsOcclusion(cfg, 'coffer', 'dive', 36));
  for (const frame of [29, 37]) assert.equal(allowsOcclusion(cfg, 'coffer', 'dive', frame), false);
  for (const tag of ['armR', 'cofferLatch']) assert.equal(allowsOcclusion(cfg, tag, 'dive', 33), false);
  assert.equal(allowsOcclusion(cfg, 'coffer', 'strike', 33), false);
  assert.equal(allowsOcclusion({ partGone: [{ ...rule, reason: '' }] }, 'coffer', 'dive', 33), false);
  assert.ok(allowsOcclusion({ partGone: ['tongue'] }, 'tongueTip', 'idle', 0));
});

test('the contact eye is an open, visible surface at the final painting scale', async () => {
  const { visibleEyePixels } = await import('../studio/visibility');
  const { projectFigure } = await import('../rig/figure');
  const { Px } = await import('../rig/px');
  const { layerNames } = await import('../engine');
  const rig = new Rig();
  rig.tag = 'head';
  rig.ball([0, 0, 10], 2.3, fur);
  rig.markEye(0, 1, false);
  assert.equal(visibleEyePixels(rig), 0, 'closed eyelid');
  rig.markEye(0, 1, true);
  assert.ok(visibleEyePixels(rig) > 0);
  const body = projectFigure(rig, 64, [32, 40], {});
  const layers = Object.fromEntries(layerNames.map((name) => [name, new Px(64, 64)])) as import('../engine').Layers;
  layers.body = body.px;
  const frame = { body, feet: body.anchor, layers };
  assert.ok(visibleEyePixels(rig, frame) > 0);
  layers.bgf = body.px;
  assert.equal(visibleEyePixels(rig, frame), 0, 'foreground completely covers the iris');
  rig.ball([0, 0, 10], 6, wood);
  assert.equal(visibleEyePixels(rig), 0, 'eye inside opaque head geometry');
});

test('clipClock: every motion is back at its start on the last moment of the clip', async () => {
  const { clipClock } = await import('../kit/clock');
  for (const D of [1.5, 2.25, 11.5]) {
    const start = clipClock(D, 0),
      end = clipClock(D, D);
    for (const rate of [0.08, 0.27, 0.38, 1.7]) {
      assert.ok(Math.abs(end.osc(rate, 0.9) - start.osc(rate, 0.9)) < 1e-9);
      assert.ok(Math.abs(Math.sin(end.turn(rate)) - Math.sin(start.turn(rate))) < 1e-9);
      // an 8-fold ring ends on a whole eighth, also when it stops early
      const steps = (end.spin(rate, 8, D - 0.7) * 8) / (2 * Math.PI);
      assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9);
    }
  }
});

test('partShift names the tag that drifted', async () => {
  const { partShift } = await import('../studio/seam');
  const a = body([0, 26, 24]),
    b = body([0, 26, 30]);
  const [top] = partShift(a, b);
  assert.equal(top.tag, 'arm');
  assert.ok(Math.abs(top.shift - 3) < 1e-9);
});
