import assert from 'node:assert/strict';
import test from 'node:test';
import { seedBeat, seedContact } from '../c/garden_chameleon-poses';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { withPointsOnly } from '../rig/figure';
import { visibleOwnedPixels } from '../studio/visibility';
import { maskOf } from '../tech-metrics';
import { sizeOf, type XY } from '../types';

const gap = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('the tongue leaves the open mouth, stays at the lips and carries the maple seed back', async () => {
  const { c, s, b } = await loadPainting('garden_chameleon');
  const [, , , border] = sizeOf(c);
  for (let n = 38; n <= seedBeat.release; n++) {
    const f = compose(c, s, b, 'trick', n / 24);
    const { lip, upperLip, lowerLip, tongueRoot, tongueTip } = f.points;
    assert.ok(upperLip[1] + 2 < lip[1] && lip[1] + 2 < lowerLip[1], 'open lips at ' + n);
    assert.ok(tongueRoot[0] + 4 < lip[0], 'tongue root is inside the mouth at ' + n);
    const rig = f.body.rig!;
    const tongue = visibleOwnedPixels(
      rig,
      f,
      rig.prims.map((q) => (q.t === 'tongue' ? q.t : undefined)),
    ).get('tongue')!;
    assert.ok(
      tongue.some(([x, y]) => gap([x - border, y - border], lip) < 1.6),
      'visible tongue at the mouth at ' + n,
    );
    if (n === 38) assert.ok(tongueTip[0] <= lip[0], 'jaw opens before the tongue shoots');
    if (n >= seedBeat.touch && n <= seedBeat.retract) assert.ok(gap(tongueTip, seedContact) < 0.01);
    if (n >= seedBeat.touch) {
      assert.ok(
        f.layers.fxo.solid(Math.round(tongueTip[0]) + border, Math.round(tongueTip[1]) + border),
        'seed rides the tip at ' + n,
      );
    }
    if (n === seedBeat.lip) assert.ok(gap(tongueTip, lip) < 5, 'seed returns to the mouth');
  }
});

test('the tail uncoils before walking, retains its length, and curls again on stopping', async () => {
  const { c, s, b } = await loadPainting('garden_chameleon');
  const measure = (anim: string, n: number) => {
    const f = withPointsOnly(() => compose(c, s, b, anim, n / 24));
    const spine = f.body.rig!.prims.filter((q) => q.k === 1).filter((q) => q.t === 'tail');
    // Undo the skin's vertical scale before comparing bone lengths in differently oriented poses.
    const length = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] - b[2]) / 1.12);
    const arc = spine.reduce((sum, bone) => sum + length(bone.a, bone.b), 0);
    return { arc, reach: length(spine[0].a, spine.at(-1)!.b), tip: f.points.tailTip };
  };
  const rest = measure('prepare_walk', 0),
    extended = measure('prepare_walk', 17);
  assert.ok(rest.reach < rest.arc / 3 && extended.reach > rest.reach * 2.3);
  assert.ok(gap(rest.tip, extended.tip) > 28, 'tip moves visibly at gallery scale');
  for (let n = 0; n < 36; n++) {
    const tail = measure('prepare_walk', n);
    assert.ok(Math.abs(tail.arc - rest.arc) < 0.01, 'tail length at ' + n);
    assert.ok(gap(tail.tip, measure('prepare_walk', 35 - n).tip) < 0.01);
    if (n >= 13 && n <= 22) assert.deepEqual(tail.tip, extended.tip);
  }
  const [w, h] = sizeOf(c);
  for (const anim of ['turn', ...Object.keys(c.animations).filter((name) => name.startsWith('walk_'))]) {
    for (let n = 0; n < c.animations[anim].seconds * 24; n += 3) {
      const tail = measure(anim, n),
        [x, y] = tail.tip;
      assert.ok(tail.reach > rest.reach * 2.3, anim + ' keeps the tail open at ' + n);
      assert.ok(x >= 2 && x < w - 2 && y >= 2 && y < h - 2, anim + ' tip clears the frame at ' + n);
    }
  }
});

test('the shadow beats its wings and leaves clear glass between the two tail streamers', async () => {
  const { c, s, b } = await loadPainting('garden_chameleon');
  const shadow = (n: number) => compose(c, s, b, 'trick_b', n / 24).backdrop;
  const span = (n: number) => {
    const [, top, , bottom] = maskOf(shadow(n)!).bounds;
    return bottom - top + 1;
  };
  assert.ok(span(27) > 1.6 * span(37), 'wings change span across the stroke');
  for (const n of [21, 27]) {
    const mask = shadow(n)!;
    const x = maskOf(mask).bounds[2] - 3;
    // The near wing is below the tail. Read only the two tail tips on the glass.
    const tail = Array.from({ length: 50 }, (_, y) => y).filter((y) => mask.solid(x, y));
    assert.ok(tail.length >= 3 && tail.some((y, i) => i > 0 && y - tail[i - 1] >= 9), 'open fork at ' + n);
  }
  for (const n of [0, 65]) {
    const mask = shadow(n);
    assert.ok(!mask || maskOf(mask).pixels.size === 0, 'bird clears the window at ' + n);
  }
});
