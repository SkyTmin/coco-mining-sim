import assert from 'node:assert/strict';
import test from 'node:test';
import omggif from 'omggif';
import { PNG } from 'pngjs';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compose,
  frameCount,
  hitFrame,
  stack,
  screenPoint,
  ground,
  layerNames,
} from '../engine';
import { frameImage } from '../frame-kit';
import { chunks, dust, fly } from '../fx/pen';
import { Px } from '../rig/px';
import { GifWriter, savePNG } from '../render-io';
import type { Border, Creature, Scene, XY } from '../types';

const border: Border = {
  wood: ['#32272b', '#52404a', '#79545b', '#a37c77'],
  accent: '#b7935f',
};
const scene: Scene = (p, t) => {
  p.rect(0, 0, p.w - 1, p.h - 1, [50, 43, 51, 255]);
  p.set(
    5,
    Math.round(12 + 3 * Math.sin((t * Math.PI * 2) / 3)),
    [150, 132, 118, 255],
  );
};
const creature: Creature = {
  id: 'test',
  rarity: 'common',
  theme: 'test',
  animations: {
    idle: { seconds: 3, loop: true },
    tech_one: { seconds: 1.5, hits: [0.5], stop: 0.1, shake: 0.8 },
    peek: { seconds: 1 },
  },
  frame(anim, t) {
    const px = new Px(24, 24),
      lit = new Px(24, 24);
    const anchor: XY = [10, 21],
      tip: XY = [10 + Math.round(3 * Math.sin(t * 2 * Math.PI)), 5];
    px.rect(6, 3, 16, 20, [92, 79, 83, 255]);
    px.set(...tip, [185, 148, 84, 255]);
    lit.set(12, 10, [249, 181, 95, 255]);
    const over = anim === 'peek' ? new Px(160, 24) : undefined;
    over?.rect(84, 2, 95, 12, [170, 110, 75, 255]);
    return {
      px,
      lit,
      anchor,
      eye: tip,
      points: { tip, foot: anchor },
      primitives: 3,
      over,
    };
  },
  effects({ above, under, anim, t, hits, pointAt }) {
    if (anim !== 'tech_one' || t < hits[0]) return;
    const [x, y] = pointAt(hits[0], 'tip'),
      age = t - hits[0];
    chunks(above, 48, age, x, y, 8, 0, 0.7, 18, 25, 20, 32, [0.4, 0.7]);
    dust(under, 18, age, x, y, 6, 0, 0.5, 15, 20, 2, 8, 11, 0.5);
    above.col('#ffd055');
    above.dot(x, y);
  },
};
const picture = (anim: string, t: number) =>
  compose(creature, scene, border, anim, t);
const bytes = (p: Px) => Buffer.from(p.data);

test('contact pose and socket, hold, feet and frame share the camera transform', () => {
  const impact = picture('tech_one', 0.5);
  const held = picture('tech_one', 13 / 24);
  assert.equal(hitFrame(0.5), 12);
  assert.deepEqual(held.body.points, impact.body.points);
  const [x, y] = screenPoint(impact.body, impact.body.points.tip, impact.feet);
  assert.deepEqual(impact.layers.fxo.get(x, y), [255, 208, 85, 255]);
  for (const f of [0, 3, 12, 13, 15, 30]) {
    const r = picture('tech_one', f / 24);
    assert.deepEqual(screenPoint(r.body, r.body.points.foot, r.feet), r.feet);
    assert.deepEqual(r.points.foot, ground(160, 128));
    assert.deepEqual(
      r.layers.frame.data,
      picture('idle', f / 24).layers.frame.data,
    );
  }
});

test('loop seam, full-size layers, clipping and frame overlap', () => {
  assert.equal(frameCount(3), 72);
  const idle = picture('idle', 0),
    seam = picture('idle', 3);
  assert.deepEqual(bytes(idle.picture), bytes(seam.picture));
  for (const key of layerNames) {
    assert.equal(idle.layers[key].w, 176);
    assert.equal(idle.layers[key].h, 144);
    if (key !== 'frame')
      assert.deepEqual(idle.layers[key].get(0, 0), [0, 0, 0, 0]);
  }
  assert.ok(!idle.layers.over.data.some(Boolean));
  const peek = picture('peek', 0);
  assert.ok(peek.layers.over.solid(170, 91));
  assert.deepEqual(peek.picture.get(170, 91), peek.layers.over.get(170, 91));
});
test('particle trajectories and cached canvases stay deterministic when rendered out of order', () => {
  const a = picture('tech_one', 16 / 24),
    landed = fly(3, 29, 430);
  assert.ok(a.layers.fxo.data.some(Boolean));
  assert.equal(landed.air, false);
  assert.equal(landed.z, 0);
  picture('idle', 0);
  picture('tech_one', 0.5);
  picture('tech_one', 1.4);
  const b = picture('tech_one', 16 / 24);
  for (const key of layerNames)
    assert.deepEqual(bytes(a.layers[key]), bytes(b.layers[key]));
  assert.deepEqual(bytes(a.picture), bytes(b.picture));
});
test('9-slice corners, thickness, opaque rails, opening and tiled phase survive a 1.5× resize', () => {
  const a = frameImage(border, 160, 128, 8, 0),
    b = frameImage(border, 240, 192, 8, 0);
  for (let y = 0; y < a.h; y++)
    for (let x = 0; x < a.w; x++) {
      const outside = x < 8 || y < 8 || x >= a.w - 8 || y >= a.h - 8;
      assert.equal(a.solid(x, y), outside);
      if ((x < 8 || x >= a.w - 8) && (y < 8 || y >= a.h - 8)) {
        assert.deepEqual(
          a.get(x, y),
          b.get(x < 8 ? x : x + b.w - a.w, y < 8 ? y : y + b.h - a.h),
        );
      }
    }
  for (let y = 0; y < 8; y++)
    for (let x = 16; x < 112; x++)
      assert.deepEqual(a.get(x, y), b.get(x + 8, y));
  assert.equal(b.solid(120, 61), false);
});
test('native transparent PNG layers reassemble to the pixels decoded from GIF at nearest 3×', () => {
  const temp = mkdtempSync(join(tmpdir(), 'creature-layers-'));
  try {
    const r = picture('idle', 0),
      roundTrip = { ...r.layers };
    for (const key of layerNames) {
      const path = join(temp, key + '.png');
      savePNG(path, r.layers[key]);
      const { width, height, data } = PNG.sync.read(readFileSync(path));
      const px = new Px(width, height);
      px.data.set(data);
      roundTrip[key] = px;
    }
    const assembled = stack(roundTrip);
    assert.deepEqual(bytes(assembled), bytes(r.picture));
    const gif = new GifWriter(3);
    gif.add(r.picture, 0);
    const reader = new omggif.GifReader(gif.bytes()),
      decoded = new Uint8Array(reader.width * reader.height * 4);
    reader.decodeAndBlitFrameRGBA(0, decoded);
    for (let y = 0; y < reader.height; y++)
      for (let x = 0; x < reader.width; x++) {
        const src = (Math.floor(y / 3) * assembled.w + Math.floor(x / 3)) * 4,
          dst = (y * reader.width + x) * 4;
        for (let k = 0; k < 4; k++)
          assert.equal(decoded[dst + k], assembled.data[src + k]);
      }
    const px = new Px(3, 3);
    px.set(1, 1, [42, 43, 44, 255]);
    const timed = new GifWriter(1);
    for (let f = 0; f < 72; f++) timed.add(px, f);
    const loop = new omggif.GifReader(timed.bytes());
    assert.equal(loop.numFrames(), 72);
    assert.equal(
      Array.from({ length: 72 }, (_, i) => loop.frameInfo(i).delay).reduce(
        (a, b) => a + b,
      ),
      300,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
