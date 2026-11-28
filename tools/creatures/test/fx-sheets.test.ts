import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { Px } from '../rig/px';
import { timedAnimation } from '../kit/impact-clock';
import { loadPainting } from '../render';
import { comparisonFrames, distinctDrafts, draftValues, matchingFrame, renderDrafts, againstCommand } from '../studio/fx-sheets';
import type { Creature } from '../types';

test('drafts parse 3–5 unique seeds or actual scalar effect options', () => {
  assert.deepEqual(draftValues('3..7'), { key: 'seed', values: [3, 4, 5, 6, 7] });
  assert.deepEqual(draftValues(undefined, 'size=0.5,1,3'), { key: 'size', values: [0.5, 1, 3] });
  assert.deepEqual(draftValues(undefined, 'style=small,large,hot'), { key: 'style', values: ['small', 'large', 'hot'] });
  for (const s of ['3..2', '1..2', '1..10000000', '0.25..5', '4294967293..4294967296'])
    assert.throws(() => draftValues(s));
  assert.throws(() => draftValues(undefined, 'size=1,2,2.0'));
  assert.throws(() => draftValues('1..3', 'size=a,b,c'));
});

test('comparison samples include a short impact and the first moving frames after its freeze', () => {
  const c = { animations: { catch: { seconds: 5, contacts: [{ frame: 79, freeze: 2 }] } } } as Creature;
  const chosen = comparisonFrames(c, 'catch');
  for (const frame of [77, 79, 81, 82, 83, 91, 108]) assert.ok(chosen.includes(frame), String(frame));
  assert.ok(chosen.every(frame => frame < 120));
});

test('against aligns authored contacts across clips with different freezes, including the second impact', () => {
  const c = { animations: { act: { seconds: 3, contacts: [{ frame: 8, freeze: 2 }, { frame: 32, freeze: 3 }] } } } as Creature;
  const left = timedAnimation(c.animations.act), plain = { seconds: 3 };
  const selected = comparisonFrames(c, 'act');
  assert.ok(selected.includes(34)); // second authored contact 32 displays at 34
  assert.ok(selected.includes(38)); // first moving frame
  assert.deepEqual([32, 33, 34, 35, 36, 37, 38].map(n => matchingFrame(n, left, plain)), [30, 31, 32, 32, 32, 32, 33]);
  assert.deepEqual([34, 35, 36, 37, 38].map(n => matchingFrame(n, left, left)), [34, 35, 36, 37, 38]);
});

test('automatic drafts find a brief unsampled difference and reject a duplicate recipe', () => {
  const series = (seed: number) => ({ label: 'seed ' + seed, count: 6, read(frame: number) {
    const p = new Px(1, 1); p.set(0, 0, [frame === 3 ? seed : 0, 0, 20, 255]); return p;
  } });
  const variants = [series(1), series(2), series(3)];
  assert.deepEqual(distinctDrafts(variants, [0, 5], false).map(r => r[0].frame), [0, 3, 5]);
  assert.throws(() => distinctDrafts(variants, [0, 5], true), /on the requested frames/);
  assert.throws(() => distinctDrafts([series(1), series(2), series(2)], [0, 5], false), /throughout the clip/);
});

test('draft seeds and numeric options reach the effect in production compose without changing the painting', async () => {
  const painting = await loadPainting('pocket_magnet');
  const c: Creature = { ...painting.c, fxOptions: { spread: 3 }, effects(f) {
    f.above.col('#fa137c');
    f.above.dot(7 + f.seed, 12, Number(f.options.spread));
  }};
  const sample = { ...painting, c };
  const seeds = renderDrafts(sample, 'idle', draftValues('1..3'), '0')[0];
  const widths = renderDrafts(sample, 'idle', draftValues(undefined, 'spread=1,2,4'), '0')[0];
  const count = (p: Px) => {
    let result = 0;
    for (let i = 0; i < p.data.length; i += 4)
      if (p.data[i] === 250 && p.data[i + 1] === 19 && p.data[i + 2] === 124) result++;
    return result;
  };
  assert.deepEqual(seeds.map(v => count(v.picture)), [3, 3, 3]);
  assert.deepEqual(widths.map(v => count(v.picture)), [1, 2, 4]);
  assert.deepEqual(c.fxOptions, { spread: 3 });
});

test('against reads ordered phases of a PNG sheet at the same displayed height as the painting', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ws-against-test-'));
  try {
    const file = join(dir, 'reference.png'), out = join(dir, 'against.png');
    const tiny = new PNG({ width: 4, height: 2 });
    for (let p = 0; p < 8; p++) tiny.data.set(p % 4 < 2 ? [17, 209, 67, 255] : [207, 51, 171, 255], p * 4);
    writeFileSync(file, PNG.sync.write(tiny));
    await againstCommand(['pocket_magnet', 'idle', '--frames', '0,1', '--ref', file, '--ref-grid', '2x1', '--ref-frames', '1,0', '--out', out]);
    const png = PNG.sync.read(readFileSync(out));
    const colorCounts = [0, 0];
    const firstRows: number[] = [];
    for (let y = 0; y < png.height; y++) for (let x = png.width >> 1; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const index = png.data[i] === 17 && png.data[i + 1] === 209 ? 0 : png.data[i] === 207 && png.data[i + 1] === 51 ? 1 : -1;
      if (index >= 0) { colorCounts[index]++; firstRows[index] ??= y; }
    }
    assert.deepEqual(colorCounts, [144 * 144, 144 * 144]);
    assert.ok(firstRows[1] < firstRows[0]);
    await assert.rejects(againstCommand(['pocket_magnet', 'idle', '--frames', '0,1', '--ref', file, '--ref-frames', '0', '--out', out]), /one --ref-frames/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
