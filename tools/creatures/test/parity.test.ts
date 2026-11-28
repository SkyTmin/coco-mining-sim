// Golden capture from the upstream browser painter, see fixtures/beetle/capture.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PNG } from 'pngjs';
import { makeIdle } from './fixtures/beetle/idle.ts';

const fixture = (name: string) => readFileSync(new URL('./fixtures/beetle/' + name, import.meta.url));

test('f11_beetle idle: exact upstream body, emission and eye', () => {
  const spec = JSON.parse(fixture('idle.json').toString());
  const out = makeIdle(spec.frame, spec.side);
  assert.deepEqual(out.eye, spec.projectedEye);
  assert.ok(out.lit);
  for (const [layer, actual] of [['body', out.p], ['lit', out.lit]] as const) {
    const expected = PNG.sync.read(fixture(layer + '.png'));
    assert.equal(actual.w, expected.width);
    assert.equal(actual.h, expected.height);
    assert.deepEqual(Buffer.from(actual.data), expected.data, layer + ' differs from browser stand');
  }
});
