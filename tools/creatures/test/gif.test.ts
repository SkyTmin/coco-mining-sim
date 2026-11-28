// The GIF encoder was made ~2× faster on 23.11 [research stage 5: the encoding was 26–34% of every profiled render].
// A pure optimization must not change a byte: these hashes were taken with the encoder before that change.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { loadPainting } from '../render';
import { compose } from '../engine';
import { GifWriter, indexed } from '../render-io';

test('GIF bytes stay those of the encoder before the speed-up (opaque deltas, >256 colours, transparency)', async () => {
  for (const [id, anim, opaque, want] of [
    ['astral_seer', 'trick', true, '276a6a054c01fab7'],
    ['kettle_crab', 'fidget_a', false, '5b5f91f6f3e72e18'],
  ] as const) {
    const { c, s, b } = await loadPainting(id);
    const gif = new GifWriter(3, opaque);
    for (let f = 0; f < 24; f++) {
      const p = compose(c, s, b, anim, f / 24).picture;
      if (f === 0 && opaque) assert.equal(indexed(p).palette.length, 256, 'the frame must take the >256-colour reduction path');
      if (!opaque) for (let k = 3; k < p.data.length; k += 28) p.data[k] = 0; // holes for the transparent path
      gif.add(p, f);
    }
    assert.equal(createHash('sha256').update(gif.bytes()).digest('hex').slice(0, 16), want, `${id} ${anim}`);
  }
});
