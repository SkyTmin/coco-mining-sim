// Incremental rendering rests on two facts [research 23.11, VIII.10 stage 4, C16]: a frame's picture depends only on its
// inputs and time, not on which frames were composed before it (a warm build equals a cold one), and the render stamp
// can say what changed and which outputs were lost. Property checks without new dependencies: the order of composition
// is drawn from a fixed-seed generator, every picture is compared with golden/<id>.json.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { loadPainting } from '../render';
import { compose } from '../engine';
import { damagedClips, explainMiss, inputsOf } from '../studio/cache';
import { checkerFingerprint } from '../studio/baseline';
import { trackFingerprints } from '../studio/events';

const tools = join(import.meta.dirname, '..');
const golden = (id: string) => JSON.parse(readFileSync(join(tools, 'golden', id + '.json'), 'utf8')) as Record<string, string[]>;
function lcg(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

// Each case is a known way a frame reaches outside itself: a future catch pose (squid), fractional lags and a hat
// handed between body and effects (Murlen), front/wide layers built for other times (Astral), a second actor (Ponchik).
for (const [id, anim, picks] of [
  ['nebula_squid', 'trick', [88, 29, 60, 87, 28, 0, 131]],
  ['moon_magician', 'trick_b-f2', [110, 109, 50, 49, 8, 143, 70]],
  ['astral_seer', 'trick', [57, 0, 85, 24, 131, 77, 56]],
  // two actors and a kitchen on the field-anchored backdrop
  ['bun_panda', 'trick', [200, 12, 275, 140, 0, 139, 201]],
] as const) {
  test(`${id} ${anim}: any order of composition gives the golden pictures`, async () => {
    const { c, s, b } = await loadPainting(id);
    const want = golden(id)[anim];
    const random = lcg(id.length * 7919 + anim.length);
    const order = [...picks, ...Array.from({ length: 5 }, () => Math.floor(random() * want.length))];
    for (const n of order) {
      const got = createHash('sha1').update(compose(c, s, b, anim, n / 24).picture.data).digest('hex').slice(0, 10);
      assert.equal(got, want[n], `${id} ${anim} frame ${n} after ${order.slice(0, order.indexOf(n)).join(',') || 'nothing'}`);
    }
  });
}

test('the render key follows shared rig and palette code, not the checker; the checker key follows the checker', async () => {
  const { c } = await loadPainting('astral_seer');
  const inputs = inputsOf('astral_seer', c.theme, c.rarity).map((f) => relative(tools, f));
  assert.ok(inputs.includes('rig/f15-rig.ts') && inputs.includes('engine.ts'));
  assert.ok(inputs.some((f) => f.startsWith('c/astral_seer')));
  assert.ok(!inputs.some((f) => f.startsWith('studio/') || f.endsWith('.studio.json')), 'a checker rule must not invalidate pictures');
  assert.match(checkerFingerprint(), /^[0-9a-f]{16}$/);
});

test('a study follows the source painting and its card; the source excludes the study', () => {
  const study = inputsOf('pocket_magnet_fx', 'sunlit_bench_fx', 'common');
  const original = inputsOf('pocket_magnet', 'sunlit_bench', 'common');
  for (const file of ['pocket_magnet.ts', 'pocket_magnet-poses.ts', 'pocket_magnet.card.json'])
    assert.ok(study.includes(join(tools, 'c', file)), file);
  assert.ok(!original.includes(join(tools, 'c', 'pocket_magnet_fx.ts')));
});

test('a miss names the files; a deleted or shortened output is found while the inputs stay the same', () => {
  assert.equal(explainMiss({ 'a.ts': '1', 'b.ts': '2' }, { 'a.ts': '1', 'b.ts': '3', 'c.ts': '4' }), 'changed b.ts; new c.ts');
  assert.match(explainMiss(undefined, {}), /no earlier stamp/);
  const root = mkdtempSync(join(tmpdir(), 'ws-render-'));
  try {
    for (const anim of ['a', 'b']) {
      mkdirSync(join(root, 'x', 'frames', anim, 'body'), { recursive: true });
      mkdirSync(join(root, 'x', 'gif'), { recursive: true });
      writeFileSync(join(root, 'x', 'gif', `painting-${anim}.gif`), anim);
      for (let n = 0; n < 3; n++) writeFileSync(join(root, 'x', 'frames', anim, 'body', `00${n}.png`), '');
    }
    const counts = { a: 3, b: 3 };
    assert.deepEqual(damagedClips('x', counts, undefined, root), []);
    rmSync(join(root, 'x', 'frames', 'b', 'body', '001.png'));
    assert.deepEqual(damagedClips('x', counts, undefined, root), ['b']);
    writeFileSync(join(root, 'x', 'gif', 'painting-a.gif'), 'tampered');
    const stamped = { a: { gif: createHash('sha256').update('a').digest('hex').slice(0, 16), frames: 3 } };
    assert.deepEqual(damagedClips('x', counts, stamped, root), ['a', 'b']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('track fingerprints are stable and tell clips apart', async () => {
  const a = await trackFingerprints('kettle_crab'),
    b = await trackFingerprints('kettle_crab');
  assert.deepEqual(a, b);
  assert.notEqual(a!.idle, a!.happy);
  assert.match(a!._module, /^[0-9a-f]{12}$/);
});
