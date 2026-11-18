// Sample the actual projected foot sockets, including world travel and orientation.
import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { directions } from '../motion';
import { loadPainting } from '../render';

test('the meadow colossus walks on three planted soles in each direction without sliding them', async () => {
  const { c, s, b } = await loadPainting('meadow_colossus');
  for (const dir of directions) {
    const anim = 'walk_' + dir;
    const first = compose(c, s, b, anim, 2 / 24), next = compose(c, s, b, anim, 3 / 24);
    const feet = first.body.planted ?? [];
    assert.equal(feet.length, 3, anim);
    assert.deepEqual([...feet].sort(), [...(next.body.planted ?? [])].sort(), anim);
    for (const name of feet) {
      const p = first.points[name], q = next.points[name];
      assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.01, anim + '/' + name);
      assert.ok(Math.abs(q[1] - next.points[name + 'Ground'][1]) < 0.01, 'sole leaves floor ' + name);
    }
  }
});

test('each planted sole stays put as the meadow colossus pivots around it', async () => {
  const { c, s, b } = await loadPainting('meadow_colossus');
  // The forward flank, rear quarter and opposite flank have different angular speeds.
  for (const n of [5, 22, 32, 54, 79]) {
    const first = compose(c, s, b, 'turn', n / 24), next = compose(c, s, b, 'turn', (n + 1) / 24);
    const still = (first.body.planted ?? []).filter(name => next.body.planted?.includes(name));
    assert.ok(still.length >= 2, 'multiple soles must carry the turn');
    for (const name of still) {
      const p = first.points[name], q = next.points[name];
      assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.01, 'turn f' + n + '/' + name);
    }
  }
});
