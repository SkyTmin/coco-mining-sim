import assert from 'node:assert/strict';
import test from 'node:test';
import { indexed } from '../render-io';
import { Px } from '../rig/px';
import type { RGBA } from '../rig/f15-rig';

function row(colors: RGBA[]) {
  const p = new Px(colors.length, 1);
  for (let i = 0; i < colors.length; i++) p.data.set(colors[i], i * 4);
  return p;
}

test('the full GIF palette preserves dark tile seams, isolated sparks and transparent black', () => {
  const tiles: RGBA[] = [
    [29, 27, 34, 255],
    [30, 27, 34, 255],
    [30, 28, 35, 255],
    [32, 28, 35, 255],
  ];
  const black: RGBA = [0, 0, 0, 255];
  const sparks: RGBA[] = [
    [255, 219, 58, 255],
    [110, 255, 252, 255],
    [250, 45, 178, 255],
  ];
  const scene: RGBA[] = [];
  for (let i = 0; i < 65; i++) scene.push(...tiles, black);
  // A cloud of distinct midtones puts the frame over the table limit.
  for (let i = 0; i < 350; i++)
    scene.push([60 + (i % 20), 65 + Math.floor(i / 20), 89, 255]);
  scene.push(...sparks, [0, 0, 0, 0], [205, 52, 199, 127]);
  const result = indexed(row(scene));
  assert.equal(result.palette.length, 256);
  assert.equal(result.transparent, true);
  const exact = (offset: number) =>
    assert.deepEqual(
      result.palette[result.indices[offset]],
      scene[offset].slice(0, 3),
    );
  for (let i = 0; i < tiles.length + 1; i++) exact(i);
  for (let i = scene.length - 2 - sparks.length; i < scene.length - 2; i++)
    exact(i);
  assert.notEqual(result.indices[4], result.transparentIndex);
  assert.equal(result.indices.at(-1), result.transparentIndex);
  assert.equal(result.indices.at(-2), result.transparentIndex);
  const reversed = indexed(row([...scene].reverse()));
  assert.deepEqual(reversed.palette, result.palette);
  assert.deepEqual(reversed.indices.reverse(), result.indices);
});

test('255 opaque 24-bit colours and transparent pixels fit without approximation', () => {
  const colors: RGBA[] = [[100, 100, 100, 127]];
  for (let i = 0; i < 255; i++) colors.push([i, 0, 0, 128]);
  colors.push([0, 0, 0, 0]);
  const out = indexed(row(colors));
  assert.equal(out.palette.length, 256);
  assert.equal(out.indices[0], out.indices.at(-1));
  assert.notEqual(out.indices[0], out.indices[1]);
  for (let i = 1; i <= 255; i++)
    assert.deepEqual(out.palette[out.indices[i]], [i - 1, 0, 0]);
});

test('an overflowing fully opaque frame has no transparent or duplicate palette entries', () => {
  const colors: RGBA[] = Array.from({ length: 320 }, (_, i) => [
    i % 256,
    Math.floor(i / 256),
    207,
    255,
  ]);
  const out = indexed(row(colors));
  assert.equal(out.transparent, false);
  assert.equal(new Set(out.indices).size, 256);
  assert.equal(new Set(out.palette.map((rgb) => rgb.join(','))).size, 256);
});
