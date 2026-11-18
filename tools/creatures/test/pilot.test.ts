import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { loadPainting } from '../render';
import { compose, frameCount, ground, hitFrame, screenPoint } from '../engine';
import { sizes, type BodyFrame } from '../types';

const pilot = [
  ['bramble_warden', 2, 'paw'],
  ['gem_beetle', 2, 'foot'],
  ['silk_dragon', 3, ''],
  ['frost_yeti', 4, 'footR'],
  ['toad_shaman', 5, 'footR'],
  ['crater_titan', 6, 'footR'],
  ['coin_dragon', 6, 'footR'],
] as const;

function fingerprint(body: BodyFrame) {
  const hash = createHash('sha256').update(body.px.data);
  if (body.lit) hash.update(body.lit.data);
  const sockets = JSON.stringify(
    [body.anchor, body.points, body.eye],
    (_, n) => (typeof n === 'number' ? Math.round(n * 1e6) / 1e6 : n),
  );
  return hash.update(sockets).digest('hex');
}
for (const [id, techniques, foot] of pilot) {
  test(
    id + ' has its pilot moves, a closed idle and a planted stance',
    async () => {
      const { c, s, b } = await loadPainting(id);
      const [w, h, size] = sizes[c.rarity];
      const idle = c.frame('idle', 0, 0, 'normal');
      assert.equal(idle.px.w, size);
      assert.equal(idle.px.h, size);
      assert.equal(
        fingerprint(c.frame('idle', 3, 0, 'normal')),
        fingerprint(idle),
      );
      assert.notEqual(
        fingerprint(c.frame('idle', 0, 0, 'gold')),
        fingerprint(idle),
      );
      const moves = Object.entries(c.animations).filter(([key]) =>
        key.startsWith('tech_'),
      );
      assert.equal(moves.length, techniques);
      for (const [name, move] of moves) {
        assert.ok(move.hits?.length, name);
        const n = hitFrame(move.hits![0]);
        assert.ok(n >= 0 && n < frameCount(move.seconds), name);
        const first = compose(c, s, b, name, n / 24);
        compose(c, s, b, 'look', 0.75);
        const repeated = compose(c, s, b, name, n / 24);
        assert.ok(
          Buffer.from(first.picture.data).equals(
            Buffer.from(repeated.picture.data),
          ),
          name,
        );
      }
      if (c.animations.phase) {
        const last = frameCount(c.animations.phase.seconds) - 1;
        const transformed = compose(c, s, b, 'phase', last / 24).body;
        assert.equal(
          fingerprint(transformed),
          fingerprint(c.frame('idle-f2', 0, 0, 'normal')),
        );
        assert.notEqual(fingerprint(transformed), fingerprint(idle));
        for (const [action, n] of [
          ['away', frameCount(c.animations.away.seconds) - 1],
          ['back', 0],
        ] as const) {
          const empty = compose(c, s, b, action, n / 24).layers;
          for (const layer of ['body', 'lit', 'over'] as const)
            assert.ok(
              !empty[layer].data.some((value, k) => k % 4 === 3 && value > 0),
              action + '/' + layer,
            );
        }
      }
      if (c.animations.peek) {
        const frames = frameCount(c.animations.peek.seconds);
        let overlapsRail = false;
        for (let n = 0; n < frames && !overlapsRail; n += 2) {
          const { over, frame } = compose(c, s, b, 'peek', n / 24).layers;
          for (let i = 3; i < over.data.length; i += 4) {
            if (over.data[i] && frame.data[i]) {
              overlapsRail = true;
              break;
            }
          }
        }
        assert.ok(overlapsRail, id + ' must extend over its rail in peek');
      }
      if (foot) {
        // Across the cyclic walk, a supporting foot must stay on its mark for at least a third of the cycle.
        const prints = Array.from({ length: 24 }, (_, n) => {
          const f = c.frame('walk', n / 24, 0, 'normal');
          assert.ok(f.points[foot], id + '/' + foot);
          return screenPoint(f, f.points[foot], ground(w, h));
        });
        let planted = 0;
        for (let start = 0; start < prints.length; start++) {
          const origin = prints[start];
          let count = 1;
          while (count < prints.length) {
            const p = prints[(start + count) % prints.length];
            if (Math.hypot(p[0] - origin[0], p[1] - origin[1]) > 0.05) break;
            count++;
          }
          planted = Math.max(planted, count);
        }
        assert.ok(planted >= 8, id + ' planted for ' + planted + ' frames');
      }
    },
  );
}
