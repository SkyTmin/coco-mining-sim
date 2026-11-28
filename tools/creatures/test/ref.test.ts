import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PNG } from 'pngjs';
import { measureDetail } from '../detail';
import { compose } from '../engine';
import { loadPainting } from '../render';
import { inputHash } from '../studio/cache';
import { Px } from '../rig/px';
import { extractCell, measureRef, pointErrors, poseRefInputs, refIssues, registerCell, silhouetteIoU } from '../studio/ref';
import type { XY } from '../types';

function magenta(w: number, h: number) {
  const image = new PNG({ width: w, height: h });
  for (let i = 0; i < image.data.length; i += 4) image.data.set([247, 7, 240, 255], i);
  return image;
}

test('cells key out near-magenta and omit captions; airborne feet keep their height', () => {
  const sheet = magenta(16, 9);
  const ink = (x: number, y: number) => sheet.data.set([20, 110, 160, 255], (y * sheet.width + x) * 4);
  for (let y = 1; y < 6; y++) for (let x = 2; x < 6; x++) ink(x, y);
  for (let y = 1; y < 3; y++) for (let x = 10; x < 14; x++) ink(x, y);
  for (let x = 0; x < 16; x++) ink(x, 8); // caption under both poses
  const stand = extractCell(sheet, [2, 1], 0, 2), hop = extractCell(sheet, [2, 1], 1, 2);
  assert.deepEqual(stand.box, [2, 1, 6, 6]); assert.deepEqual(hop.box, [2, 1, 6, 3]);
  const ground: XY = [4, 6], feet: XY = [12, 12];
  const air = registerCell(hop, ground, feet, 1);
  assert.equal(air.top + air.p.h, 9, 'three native pixels above floor');
  const grounded = registerCell(stand, ground, feet, 1);
  const body = new Px(24, 20);
  for (let y = 7; y < 12; y++) for (let x = 10; x < 14; x++) body.set(x, y, [0, 0, 0, 255]);
  assert.equal(silhouetteIoU(body, grounded), 1);
  assert.equal(silhouetteIoU(body, air), 0.4);
  const outside = silhouetteIoU(new Px(1, 1), air);
  assert.equal(outside, 0, 'offscreen reference ink counts in the union');
  assert.match(refIssues([{ n: 12, iou: outside, distances: [] }])[0], /f12 IoU/);
});

test('native landmarks include camera, held object, flight and missing sockets', () => {
  const image = magenta(5, 5);
  image.data.set([20, 110, 160, 255], (5 + 1) * 4);
  const drawing = registerCell(extractCell(image, [1, 1], 0, 0), [0, 0], [8, 6], 2);
  const frame = { feet: [8, 6], worldFeet: [4, 3], points: { handL: [6, 5] },
    techniqueTrace: { materials: [{ id: 'snow', at: [6, 5] }], projectiles: [{ id: 'arrow', at: [9, 9] }] },
  } as unknown as ReturnType<typeof compose>;
  const distances = pointErrors(frame, drawing, { handL: [1, 1], 'projectile:snow': [1, 1], 'projectile:arrow': [1, 1], unknown: [1, 1] });
  assert.deepEqual(distances.map(d => d.error), [0, 0, 5, undefined]);
  assert.deepEqual(refIssues([{ n: 5, iou: 1, distances }]), ['f5 missing unknown']);
  const wrongHand = pointErrors(frame, drawing, { handL: [2, 100] });
  assert.match(refIssues([{ n: 5, iou: 1, distances: wrongHand }])[0], /f5 handL/);
});

test('a real painted contact matches its control sheet and diverges from a wrong key', async () => {
  const painting = await loadPainting('bramble_warden');
  const { c, s, b } = painting;
  const anim = 'tech_ram', n = Math.round(c.animations[anim].hits![0] * 24);
  const hit = compose(c, s, b, anim, n / 24);
  const body = hit.layers.body, sheet = magenta(body.w, body.h);
  for (let i = 0; i < body.data.length; i += 4)
    if (body.data[i + 3] >= 128) sheet.data.set([42, 81, 123, 255], i);
  const dir = mkdtempSync(join(tmpdir(), 'pose-ref-')), path = join(dir, 'control.png');
  try {
    writeFileSync(path, PNG.sync.write(sheet));
    const spec = { sheet: path, grid: [1, 1] as XY, frames: [n], keys: [{ ground: hit.feet }],
      idleHeight: measureDetail(c.frame('idle', 0, 0, 'normal').px).height, captionHeight: 0 };
    assert.equal(measureRef(painting, anim, spec)[0].iou, 1);
    const twoRows = magenta(body.w, 2 * body.h);
    sheet.data.copy(twoRows.data, sheet.data.length);
    const shared = join(dir, 'two-rows.png');
    writeFileSync(shared, PNG.sync.write(twoRows));
    const lastRow = { ...spec, sheet: shared, grid: [1, 2] as XY, cells: [1] };
    assert.equal(measureRef(painting, anim, lastRow)[0].iou, 1);
    assert.throws(() => measureRef(painting, anim, { ...lastRow, cells: [2] }), /distinct grid cell/);
    assert.throws(() => measureRef(painting, anim, { ...lastRow, cells: [1, 1] }), /distinct grid cell/);

    const wrong = measureRef(painting, anim, { ...spec, frames: [0] })[0];
    assert.ok(wrong.iou < 0.85, 'wrong key unexpectedly overlaps contact: ' + wrong.iou);
    assert.throws(() => measureRef(painting, anim, { ...spec, frames: [10000] }), /between 0 and/);
    assert.throws(() => measureRef(painting, anim, { ...spec, frames: [NaN] }), /nonnegative integers/);
    assert.throws(() => measureRef(painting, anim, { ...spec, grid: [0, 1] }), /positive columns/);
    assert.throws(() => measureRef(painting, anim, { ...spec, keys: [{ ground: [0, 0], points: { hand: [-1, 0] } }] }), /outside art/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('gate cache covers both the registered PNG contents and the JSON; a missing sheet is an error', () => {
  const repo = mkdtempSync(join(tmpdir(), 'ref-cache-'));
  try {
    const dir = join(repo, 'tools', 'creatures'), c = join(dir, 'c'), docs = join(repo, 'docs');
    mkdirSync(c, { recursive: true }); mkdirSync(docs);
    const config = join(c, 'sample.ref.json'), file = join(docs, 'drawing.png');
    const ref = { sheet: '../../../docs/drawing.png', grid: [1, 1], frames: [0], captionHeight: 0 };
    writeFileSync(config, JSON.stringify({ tech_hit: ref }));
    assert.throws(() => poseRefInputs('sample', dir), /PNG missing/);
    const sheet = magenta(5, 5);
    writeFileSync(file, PNG.sync.write(sheet));
    assert.deepEqual(poseRefInputs('sample', dir), [config, file]);
    const hash = () => inputHash(poseRefInputs('sample', dir)), original = hash();
    sheet.data[0] = 50; writeFileSync(file, PNG.sync.write(sheet));
    const edited = hash(); assert.notEqual(edited, original);
    writeFileSync(config, JSON.stringify({ tech_hit: { ...ref, frames: [1] } }));
    assert.notEqual(hash(), edited);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
