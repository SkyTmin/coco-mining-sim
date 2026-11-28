import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPainting } from '../render';
import { compose } from '../engine';
import { createPetBehavior } from '../viewer/behavior.mjs';
import { placement, reelChapters } from '../motion';
import { course, home, puckAt, puckMark, radius, railX, roundels } from '../c/opal_skater-keys';

const painting = await loadPainting('opal_skater');
const { c, s, b } = painting;

test('the rounded toe holds the red rim through the push and catch; the spring returns to its bracket', () => {
  for (const n of [
    ...Array.from({ length: 11 }, (_, i) => 24 + i),
    ...Array.from({ length: 8 }, (_, i) => 78 + i),
  ]) {
    const { points, backdrop } = compose(c, s, b, 'trick', n / 24);
    const puck = puckAt(n),
      toe = points.toeR;
    assert.ok(Math.abs(toe[0] - (puck.x - radius)) < 1.1, 'horizontal contact ' + n);
    assert.ok(Math.abs(toe[1] - (puck.y - 3)) < 1, 'vertical contact ' + n);
    assert.ok(backdrop);
    const ink = backdrop.get(Math.round(puck.x) + 8, Math.round(puck.y) - 2 + 8);
    assert.ok(ink[0] > ink[1] * 1.4 && ink[3] > 230, 'visible red edge ' + n);
  }
  let last = puckAt(34).x;
  for (let n = 35; n <= 51; n++) {
    const x = puckAt(n).x;
    assert.ok(x > last);
    last = x;
  }
  for (let n = 51; n <= 58; n++) {
    const p = puckAt(n);
    assert.ok(Math.abs(p.x + radius - (railX + p.compression)) < 1e-6);
  }
  last = puckAt(58).x;
  for (let n = 59; n <= 83; n++) {
    const x = puckAt(n).x;
    assert.ok(x < last);
    last = x;
  }
  assert.deepEqual(puckAt(107), puckAt(0));
});

test('each lobe winds once around its own snowflake and both blades miss the resting puck', () => {
  function winding(from: number, to: number, x: number, y: number) {
    let angle = 0;
    for (let n = from + 1; n <= to; n++) {
      const a = course(n - 1),
        b = course(n);
      const turn =
        Math.atan2(home[1] + b.y - y, home[0] + b.x - x) - Math.atan2(home[1] + a.y - y, home[0] + a.x - x);
      angle += Math.atan2(Math.sin(turn), Math.cos(turn));
    }
    return Math.round(angle / (2 * Math.PI)) || 0;
  }
  const left = roundels[0],
    right = roundels[1];
  assert.equal(Math.abs(winding(19, 79, ...right)), 1);
  assert.equal(winding(19, 79, ...right), -winding(79, 139, ...left));
  assert.equal(winding(19, 79, ...left), 0);
  assert.equal(winding(79, 139, ...right), 0);
  for (let n = 0; n < 157; n++) {
    const { points } = compose(c, s, b, 'trick_b', n / 24);
    for (const side of ['L', 'R']) {
      const ankle = points['foot' + side],
        toe = points['toe' + side];
      for (const t of [-0.68, -0.4, 0, 0.3, 0.6, 1]) {
        const x = ankle[0] + t * (toe[0] - ankle[0]);
        const y = ankle[1] + t * (toe[1] - ankle[1] + 2.5);
        assert.ok(Math.hypot(x - puckMark[0], (y - puckMark[1]) / 0.6) > radius + 1.7, 'free blade ' + n);
      }
    }
  }
});
test('the reel gives both wake-ups a sleeping predecessor and plays joined sleep chapters without an idle flash', () => {
  const chapters = reelChapters(c);
  for (const i of chapters.keys()) {
    const ch = chapters[i],
      before = chapters[i - 1];
    if (['sleep', 'sleep_out', 'wake_startled'].includes(ch.name)) {
      assert.equal(ch.start, before.end);
      const sample = (frame: number) => placement(c, 'showreel', frame / 24, 0, home).anim;
      assert.equal(sample(ch.start), ch.name);
      assert.equal(sample(ch.start - 1), ch.name === 'sleep' ? 'sleep_in' : 'sleep');
    }
  }
  assert.equal(chapters.filter((ch) => ch.name === 'sleep').length, 2);
});

test('a second request while the puck is moving waits for its catch and return to the mark', () => {
  const player = createPetBehavior(c.behavior!, c.animations);
  player.event('double_tap');
  for (let n = 0; n < 108; n++) {
    const state = player.sample();
    assert.equal(state.anim, 'trick');
    assert.equal(state.frame, n);
    if (n === 42) player.event('double_tap');
    player.advance(1 / 24);
  }
  assert.equal(player.sample().anim, 'trick_b');
  assert.equal(player.sample().frame, 0);
});
