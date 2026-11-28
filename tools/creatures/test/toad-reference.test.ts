import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, ground } from '../engine';
import { placement, reelChapters } from '../motion';
import { loadPainting } from '../render';
import { sizeOf } from '../types';

const painting = loadPainting('toad_shaman');
test('a staff step keeps the weight-bearing toes planted on the painting floor', async () => {
  const { c, s, b } = await painting;
  for (const [limb, from, through] of [
    ['footR', 8, 15],
    ['footL', 15, 17],
    ['footR', 17, 20],
    ['footL', 20, 25],
  ] as const) {
    const first = compose(c, s, b, 'tech_staff', from / 24).points[limb];
    for (let n = from + 1; n <= through; n++) {
      const next = compose(c, s, b, 'tech_staff', n / 24).points[limb];
      assert.ok(Math.hypot(first[0] - next[0], first[1] - next[1]) < 0.02, `${limb} moved on frame ${n}`);
    }
  }
});

test('both frog attacks make contact on their life beat and showreel chapter', async () => {
  const { c, s, b } = await painting;
  const [w, h] = sizeOf(c),
    origin = ground(w, h);
  for (const anim of ['tech_staff', 'tech_leap']) {
    const direct = c.animations[anim],
      beats = c.motion!.beats;
    const beat = beats.findIndex((v) => v.anim === anim);
    assert.ok(beat >= 0, `${anim} in life`);
    const chapter = reelChapters(c).find((ch) => ch.name === anim)!;
    const start = beats.slice(0, beat).reduce((sum, b) => sum + b.seconds, 0);
    const hit = direct.hits![0];
    for (const [name, t] of [
      ['life', start + (hit * beats[beat].seconds) / direct.seconds],
      ['showreel', chapter.start / 24 + hit],
    ] as const) {
      const pose = placement(c, name, t, 0, origin);
      assert.equal(pose.anim, anim);
      const f = compose(c, s, b, name, t),
        socket = anim === 'tech_staff' ? 'staffFoot' : 'handL';
      const at = f.points[socket];
      assert.ok(
        f.techniqueTrace.births.some(
          (p) => p.socket === socket && Math.hypot(p.at[0] - at[0], p.at[1] - at[1]) < 1,
        ),
      );
    }
  }
});
