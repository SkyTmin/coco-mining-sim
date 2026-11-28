import test from 'node:test';
import assert from 'node:assert/strict';
import { compose, screenPoint } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import { creatureIds, inputsOf } from '../studio/cache';
import {
  bell,
  ferryDeck,
  looseLine,
  sailHeight,
  bellHandle,
  bridgeEnd,
  city,
  exit,
  fromWorld,
  home,
  leafTip,
  liftCentre,
  liftProgress,
  lock,
  postShift,
  scenePose,
  size,
  stages,
  stylus,
  toWorld,
} from '../c/threshold_keeper-stage';
import { detailBar } from '../studio/gate';
import type { XY } from '../types';

const { c, s, b } = await loadPainting('threshold_keeper');
const picture = (clip: string, n: number) => compose(c, s, b, clip, n / 24);
function marks(clip: string, n: number) {
  const body = withPointsOnly(() => c.frame(clip, n / 24, 0, 'normal'));
  return Object.fromEntries(
    Object.entries(body.points).map(([k, v]) => [k, fromWorld(screenPoint(body, v, c.portraitOrigin!))]),
  );
}
const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function near(a: XY, b: XY, tolerance = 0.03) {
  assert.ok(distance(a, b) < tolerance, `${a} and ${b}, expected distance < ${tolerance}`);
}

test('the panorama triples the field area without resizing the animal raster', () => {
  assert.ok(creatureIds().includes(c.id));
  assert.ok(inputsOf(c.id, c.theme, c.rarity).some((file) => file.endsWith('/hundred_landings-sky.png')));
  assert.equal(size[0] * size[1], 3 * 256 * 208);
  assert.equal(size[2], 160);
  assert.deepEqual(c.behavior!.field, size.slice(0, 2));
  near(c.portraitOrigin!, toWorld(home));
  near(marks('idle', 0).nose, [157, 151], 0.85);
  near(marks('idle', 0).roof, [107, 78], 0.85);
  for (const [clip, count] of Object.entries(stages)) {
    if (!['trick', 'show', 'hatch'].includes(clip))
      for (let n = 0; n < count; n++) assert.equal(scenePose(clip, n)!.s, 1);
    const last = marks(clip, count - 1),
      rest = marks(clip.endsWith('-f2') || clip === 'phase' ? 'idle-f2' : 'idle', 0);
    for (const key of ['root', 'sill', 'bootR', 'bootL']) near(last[key], rest[key], 0.4);
  }
});

test('walking between the lectern and home alternates planted shoes while the house stays on its stand', () => {
  const run = Array.from({ length: 35 }, (_, i) => marks('trick_b-f2', 22 + i));
  const planted = { bootL: 0, bootR: 0 };
  for (let i = 1; i < run.length; i++)
    for (const boot of ['bootL', 'bootR'] as const) {
      if (distance(run[i].root, run[i - 1].root) > 1 && distance(run[i][boot], run[i - 1][boot]) < 0.3) planted[boot]++;
    }
  assert.ok(planted.bootL >= 5 && planted.bootR >= 5, JSON.stringify(planted));
  for (const n of [40, 78, 113, 155, 195]) near(marks('trick_b-f2', n).shoeFR, marks('trick_b-f2', 25).shoeFR, 0.15);
  for (const n of [58, 98, 132, 175]) near(marks('trick_b-f2', n).sill, marks('trick_b-f2', 76).sill);
});

test('the panorama keeps the accepted 131-pixel portrait and checks a changed native height', () => {
  const painting = { c, s, b };
  assert.deepEqual(detailBar(painting).issues, []);
  assert.ok(detailBar(painting, { nativeIdleHeight: 130 }).issues.some((i) => i.includes('original 130 px')));
  assert.ok(detailBar(painting, {}).issues.some((i) => i.includes('55–65%')));
  assert.ok(detailBar(painting, { nativeIdleHeight: 1 }).issues.some((i) => i.includes('accepted native height')));
});

test('the planted jack shoes carry the house during both strokes, before the bearer leaves or returns', () => {
  const first = marks('trick', 12),
    low = marks('trick', 48);
  near(first.root, home);
  assert.ok(low.sill[1] - first.sill[1] > 19.9);
  for (const n of [19, 28, 37, 48, 88, 153, 230, 242, 251, 272, 275]) {
    const m = marks('trick', n);
    near(m.shoeFR, first.shoeFR, 0.1);
    near(m.shoeBL, first.shoeBL, 0.1);
    assert.ok(Math.abs(m.roof[0] - first.roof[0]) < 0.1);
  }
  assert.ok(marks('trick', 251).root[0] - home[0] > 49);
  near(marks('trick', 251).sill, first.sill);
  near(marks('trick', 275).root, home);
});

test('the key shrinks the visitor at the feet and the empty near doorway contains no leftover fur or light', () => {
  const sill = marks('trick', 48).sill;
  for (const n of [49, 60, 69, 75, 94, 106, 111, 141, 169, 190]) near(marks('trick', n).sill, sill);
  for (const n of [48, 52, 60, 69]) near(marks('trick', n).root, marks('trick', 48).root, 0.05);
  assert.equal(scenePose('trick', 48)!.s, 1);
  assert.equal(scenePose('trick', 69)!.s, 0.25);
  for (let n = 70; n <= 110; n++) assert.equal(scenePose('trick', n)!.s, 0.25);
  const aperture = (n: number) => {
    const body = c.frame('trick', n / 24, 0, 'normal'),
      result: number[] = [];
    for (const layer of [body.px, body.lit]) {
      if (!layer) continue;
      for (let y = 87; y < 166; y++)
        for (let x = 83; x < 152; x++) {
          const [X, Y] = toWorld([x, y]);
          const i = 4 * ((Y + size[3]) * layer.w + X + size[3]);
          result.push(...layer.data.subarray(i, i + 4));
        }
    }
    return Buffer.from(result);
  };
  const empty = aperture(111);
  assert.notDeepEqual(aperture(94), empty);
  for (const n of [106, 107, 108, 109, 110]) assert.deepEqual(aperture(n), empty);
  for (const n of [111, 112, 113, 114]) assert.equal(scenePose('trick', n)!.hide, 1);
  assert.ok(marks('trick', 121).nose[0] > exit[0] - 3);
  assert.ok(marks('trick', 140).nose[0] < exit[0] - 44);
});

test('at the second quay two distinct rope pulls raise the sail, then the ferry carries the keeper across open sky', () => {
  for (const n of [152, 157, 163, 167, 174, 180, 186]) near(marks('trick', n).handR, looseLine(n), 0.35);
  assert.equal(sailHeight(150), 0);
  assert.equal(sailHeight(165), 0.49);
  assert.equal(sailHeight(174), 0.49);
  assert.equal(sailHeight(187), 1);
  for (const n of [146, 158, 180, 194, 210, 224, 238, 247]) near(marks('trick', n).root, ferryDeck(n), 0.03);
  assert.ok(ferryDeck(194)[0] - ferryDeck(247)[0] > 180);
  assert.ok(ferryDeck(218)[1] < ferryDeck(194)[1] - 20);
  assert.ok(ferryDeck(287)[0] < -150);
  const over = picture('trick', 130).layers.over;
  let lit = 0;
  for (let y = 209; y < 270; y++) for (let x = size[0] + size[3]; x < over.w; x++) if (over.solid(x, y)) lit++;
  assert.ok(lit > 20);
});
test('the mail bridge crosses a real gap before the paw takes the sealed envelope', () => {
  assert.ok(bridgeEnd[0] - 136 > 190);
  assert.equal(scenePose('trick_b', 82)!.bridge, 1);
  for (const n of [61, 63, 65, 67, 69, 71]) near(marks('trick_b', n).handR, [117, 155], 0.8);
  for (const n of [119, 120, 121, 122, 123, 124]) near(marks('trick_b', n).handR, [228 + postShift, 135]);
  for (const n of [181, 182, 183, 184, 185]) near(marks('trick_b', n).handR, [125, 149]);
});

test('the beacon is well above the ears at street level and the car supports the feet all the way to its bell', () => {
  assert.equal(liftCentre(0)[1] - liftCentre(1)[1], 188);
  assert.ok(marks('trick-f2', 60).earL[1] - bell[1] > 120);
  for (const n of [68, 80, 98, 128, 145, 175, 182]) near(marks('trick-f2', n).keyTip, lock);
  for (const n of [88, 101, 116, 126, 143, 161, 178]) {
    const m = marks('trick-f2', n),
      car = liftCentre(liftProgress(n));
    near(m.root, [car[0] + 4, car[1] + 2]);
    for (const boot of [m.bootR, m.bootL]) {
      assert.ok(Math.abs(boot[0] - car[0]) < 26);
      assert.ok(Math.abs(boot[1] - car[1]) < 13);
    }
  }
  for (const n of [125, 130, 134, 139]) near(marks('trick-f2', n).handR, bellHandle(n));
  assert.ok(scenePose('trick-f2', 120)!.gate < 0.01 && scenePose('trick-f2', 145)!.gate > 0.9);
});

test('the bound chart opens on one hinge, the paw traces the ink and the same book closes on the lectern', () => {
  const hinge: XY = [city[0], city[1] - 2];
  for (const u of [0, 0.2, 0.5, 0.8, 1]) assert.ok(distance(leafTip(u), hinge) >= 31);
  for (const n of [104, 114, 126, 136]) {
    const m = marks('trick_b-f2', n),
      pen = stylus(n);
    near(m.handR, pen.grip, 1);
    assert.ok(Math.abs(distance(pen.grip, pen.tip) - Math.hypot(32, 8)) < 0.01);
    assert.ok(distance(m.handL, m.handR) > 10);
    assert.ok(m.nose[0] > city[0] + 25);
  }
  for (const n of [65, 76, 170]) near(marks('trick_b-f2', n).handL, [city[0] + 32, city[1] + 2], 0.7);
  assert.ok(scenePose('trick_b-f2', 95)!.book > 0.95);
  assert.equal(scenePose('trick_b-f2', 183)!.book, 0);
  // The open paper must be visible in front of the actor and to the left of its nose.
  const layer = picture('trick_b-f2', 134).layers.fxo;
  const [X, Y] = toWorld(city).map((v) => v + size[3]);
  let pale = 0;
  for (let y = Y - 21; y < Y; y++)
    for (let x = X - 29; x < X + 18; x++) {
      const i = 4 * (y * layer.w + x);
      if (layer.data[i + 3] > 190 && layer.data[i] > 160 && layer.data[i + 1] > 145) pale++;
    }
  assert.ok(pale > 220, `only ${pale} visible chart pixels`);
});
