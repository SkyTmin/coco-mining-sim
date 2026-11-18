import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PNG } from 'pngjs';
import { Px } from '../rig/px';
import { appearance, labelSheet } from '../studio/art-sheet';
import { lintSheet } from '../studio/sheet-lint';
import { extractCell } from '../studio/ref';

const key = 0xff00ff, green = 0x348b46;
function rect(png: PNG, x: number, y: number, w: number, h: number, rgb: number) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    png.data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], (j * png.width + i) * 4);
  }
}
function poses() {
  const png = new PNG({ width: 150, height: 50 });
  rect(png, 0, 0, 150, 50, key);
  for (const x of [14, 64, 114]) rect(png, x, 10, 20, 32, green);
  return png;
}
const check = (png: PNG, air: number[] = [], reference?: PNG) => lintSheet(png, [3, 1], air, reference);
function catches(png: PNG, error: string) {
  const result = check(png);
  assert.equal(result.ok, false);
  assert.ok(result.cells.some(c => c.issues.some(s => s.startsWith(error))), JSON.stringify(result));
}

test('raw sheet accepts matching cells, reports exact background, distinguishes 12px noise from 13px spot', () => {
  const png = poses();
  assert.equal(check(png, [], png).ok, true);
  assert.equal(check(png).cells[0].exactBackground, 1);
  rect(png, 3, 3, 4, 3, green);
  assert.equal(check(png).ok, true);
  rect(png, 2, 3, 1, 1, green);
  catches(png, 'spot');
});

test('sheet rejects crop, partial alpha, background gradients and magenta cast shadows', () => {
  const edge = poses(); rect(edge, 1, 15, 19, 10, green); catches(edge, 'margin');
  const transparent = poses(); transparent.data[3] = 0; catches(transparent, 'background');
  const gradient = poses(); rect(gradient, 3, 3, 4, 1, 0xfe01ff); catches(gradient, 'background');
  const shadow = poses(); rect(shadow, 12, 42, 29, 3, 0x9a009a); catches(shadow, 'background');
});

test('height and feet are measured independently against the first grounded pose; only marked air skips them', () => {
  const short = poses(); rect(short, 64, 10, 20, 8, key); catches(short, 'height');
  const jump = poses();
  rect(jump, 114, 36, 20, 6, key);
  rect(jump, 114, 4, 20, 6, green);
  assert.deepEqual(check(jump).cells[2].issues.map(s => s.split(':')[0]), ['feet']);
  assert.equal(check(jump, [3]).ok, true);
  assert.throws(() => check(jump, [4]), /one-based/);
  rect(jump, 101, 20, 14, 4, green);
  assert.equal(check(jump, [3]).ok, false, 'an airborne pose still has to clear the margin');
});

test('purple/paint mixture is measured at the contour even when its channels are far from the key', () => {
  const png = poses();
  // (255,0,255) × .5 + (52,139,70) × .5.
  rect(png, 14, 10, 20, 1, 0x9a46a3);
  catches(png, 'fringe');
  const clean = poses();
  rect(clean, 14, 10, 1, 1, 0x9a46a3);
  assert.equal(check(clean).ok, true, 'one mixed edge pixel is under the 2% budget');
});

test('palette check reports numerical foreign coverage, while a literal purple actor color stays paint', () => {
  const ref = poses(), png = poses();
  rect(png, 17, 15, 10, 15, 0xffce22);
  assert.equal(check(png).ok, true);
  const result = check(png, [], ref);
  assert.ok(result.cells[0].issues.some(s => s.startsWith('palette:')));
  assert.equal(result.cells[0].foreignRatio, 150 / 640);
  for (const img of [ref, png]) rect(img, 17, 15, 10, 15, 0x990099);
  assert.equal(check(png, [], ref).ok, true);
});

test('export draws both body and lighting, flattens onto opaque magenta and replicates every native pixel 4×4', () => {
  const body = new Px(12, 12), lit = new Px(12, 12);
  body.set(2, 4, [20, 70, 50, 255]); body.set(3, 4, [20, 70, 50, 255]);
  lit.set(3, 4, [220, 160, 70, 255]); lit.set(4, 4, [20, 90, 230, 255]);
  const png = appearance(body, lit);
  const colors = new Set<string>();
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = 4 * (y * png.width + x), base = 4 * ((y - y % 4) * png.width + x - x % 4);
    assert.deepEqual(png.data.subarray(i, i + 4), png.data.subarray(base, base + 4));
    colors.add(Array.from(png.data.subarray(i, i + 4)).join(','));
  }
  assert.deepEqual(colors, new Set(['255,0,255,255', '20,70,50,255', '220,160,70,255', '20,90,230,255']));
});

test('labels preserve all art pixels across multiple rows and ws ref can strip captions using the returned height', () => {
  const png = new PNG({ width: 100, height: 101 });
  rect(png, 0, 0, 100, 101, key);
  for (const y of [10, 60]) for (const x of [12, 62]) rect(png, x, y, 20, 32, green);
  const roles = ['стойка', 'замах', 'удар', 'возврат'];
  const { png: labeled, captionHeight } = labelSheet(png, [2, 2], roles);
  for (let i = 0; i < roles.length; i++) {
    const raw = extractCell(png, [2, 2], i, 0);
    const cell = extractCell(labeled, [2, 2], i, captionHeight);
    assert.deepEqual(cell.p.data, raw.p.data);
  }
  assert.throws(() => labelSheet(png, [2, 2], ['x']), /one nonempty role/);
});

test('ws sheet-lint returns 1 with JSON measurements for a rejected image through the normal CLI', t => {
  const dir = mkdtempSync(join(tmpdir(), 'art-sheet-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'spot.png'), png = poses();
  rect(png, 3, 3, 4, 4, green);
  writeFileSync(path, PNG.sync.write(png));
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'studio/ws.ts', 'sheet-lint', path, '--grid', '3x1', '--json'],
    { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.deepEqual(report.cells[0].extraSizes, [16]);
});
