import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { flash, glow, glowLine, glowRing, pointLight } from '../fx/light';
import { Px } from '../rig/px';
import type { Border, Creature, Scene } from '../types';

const scene: Scene = p => p.rect(0, 0, p.w - 1, p.h - 1, [30, 40, 50, 255]);
const border: Border = { wood: ['#000000','#111111','#222222','#333333'], accent: '#313131' };
const c: Creature = { id: 'light_probe', theme: 'probe', rarity: 'common', animations: { idle: { seconds: 1, loop: true } },
  frame: () => ({ px: new Px(1,1), primitives: 0, eye: null, anchor: [0,0], points: {} }) };

test('light adds over opaque ink, sums overlapping sources, saturates and stays inside the rail', () => {
  const frame = compose({ ...c, effects(f) {
    f.above.col('#508014'); f.above.dot(9, 9);
    pointLight(f.light, 9, 9, '#203045');
    pointLight(f.light, 9, 9, '#102040');
    pointLight(f.light, 11, 10, '#ffffff');
    pointLight(f.light, 0, 0, '#c86400', 0.5);
  } }, scene, border, 'idle', 0);
  assert.deepEqual(frame.picture.get(17, 17), [128, 208, 153, 255]);
  assert.deepEqual(frame.picture.get(19, 18), [255, 255, 255, 255]);
  assert.deepEqual(frame.picture.get(8, 8), [130, 90, 50, 255]);
  assert.equal(frame.layers.light.solid(7, 8), false);
  assert.equal(compose(c, scene, border, 'idle', 0).light, undefined);
});

test('glow, capsule and ring use soft support and the flash clears completely', () => {
  const lit: Creature = { ...c, effects(f) {
    glow(f.light, 8, 12, 5, '#345678');
    glowLine(f.light, 25, 15, 40, 15, 3, '#cc5500');
    glowRing(f.light, 55, 22, 8, 2, '#663311');
    flash(f.light, 77, 28, 5, '#bb6611', f.t, 0.3);
  } };
  const sample = (t: number) => compose(lit, scene, border, 'idle', t).picture;
  const first = sample(0), hot = sample(1 / 24), late = sample(5 / 24);
  assert.ok(first.get(16, 20)[0] > first.get(19, 20)[0]);
  assert.ok(first.get(40, 23)[0] > first.get(40, 25)[0]);
  assert.ok(first.get(71, 30)[0] > first.get(63, 30)[0]);
  assert.ok(hot.get(85, 36)[0] > first.get(85, 36)[0]);
  assert.ok(first.get(85, 36)[0] > late.get(85, 36)[0]);
  assert.deepEqual(sample(0.5).get(85, 36), [30, 40, 50, 255]);
});
