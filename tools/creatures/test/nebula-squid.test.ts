import assert from 'node:assert/strict';
import test from 'node:test';
import { readCreatureCard } from '../bodies/card-data';
import { reach, toLocal } from '../bodies/goals';
import { squidFrame } from '../c/nebula_squid-rig';
import { F3, vmul, vlen, vsub, type V3 } from '../rig/f15-rig';
import { Px } from '../rig/px';
import { compose } from '../engine';
import border from '../frames/mythic';
import type { Creature, Scene } from '../types';

const c = readCreatureCard('nebula_squid'),
  draw = squidFrame(c, c.life);
test('eight short-arm stars, two catching clubs and the physical contact organs solve in floor coordinates', () => {
  const target: V3 = [29, 15, 26];
  for (const side of [0, 3, 8, 13]) {
    const base = F3.yaw(c.life.yaw + (side * Math.PI) / 8);
    for (const name of ['funnel', 'star2', 'clubL', 'clubR', 'star6', 'mantleTip']) {
      const f = draw('layout', 0, side, 'normal', {
        headSide: side,
        gaitPhase: 0,
        techniquePose: reach(name, target),
      });
      assert.ok(vlen(vsub(toLocal(base, vmul(f.joints![name], 1 / c.proportions.scale)), target)) < 1e-6);
      assert.equal(f.planted!.length <= 8, true);
      for (let i = 0; i < 8; i++) assert.deepEqual(f.joints!['arm' + i], f.joints!['star' + i]);
      assert.ok(f.joints!.clubBaseL && f.joints!.clubBaseR);
    }
  }
});
test('show develops from zero RGBA to a fully visible mantle, dims its reflection and holds the last spatial pose', () => {
  const frame = (u: number, t = 2, hold = 0) =>
    draw('show', t, 0, 'normal', {
      headSide: 0,
      gaitPhase: t,
      techniquePose: { showReveal: u, showHold: hold },
    });
  const visible = (p: Px) => p.data.filter((v, i) => i % 4 === 3 && v > 0).length;
  const hidden = frame(0),
    seed = frame(0.2),
    wide = frame(0.76),
    revealed = frame(1);
  assert.equal(visible(hidden.px), 0);
  assert.equal(visible(hidden.lit!), 0);
  assert.equal(hidden.eye, null);
  assert.equal(hidden.groundShadow!.opacity, 0);
  assert.ok(
    visible(seed.px) > 0 && visible(seed.px) < visible(wide.px) && visible(wide.px) < visible(revealed.px),
  );
  assert.equal(seed.groundShadow!.reflectionOpacity, 0);
  assert.ok(wide.groundShadow!.reflectionOpacity! > 0 && wide.groundShadow!.reflectionOpacity! < 1);
  assert.deepEqual(frame(1, 4.6, 1).px.data, frame(1, 5.2, 1).px.data);
});
test('floor reflection keeps legacy alpha 42 by default and can fade independently of emissive skin', () => {
  const p = new Px(40, 40),
    lit = new Px(40, 40),
    scene: Scene = (dst) => dst.rect(0, 0, dst.w - 1, dst.h - 1, [15, 20, 30, 255]);
  p.set(4, 4, [90, 200, 245, 255]);
  lit.set(4, 4, [90, 200, 245, 200]);
  const probe = (reflectionOpacity?: number) => {
    const creature: Creature = {
      id: 'reflection_probe',
      rarity: 'mythic',
      theme: 'nebula_cradle',
      animations: { idle: { seconds: 3, loop: true } },
      frame: () => ({
        px: p,
        lit,
        anchor: [4, 7],
        eye: null,
        points: {},
        primitives: 0,
        groundShadow: { radius: 2, opacity: 0, reflectionOpacity },
      }),
    };
    return compose(creature, scene, border, 'idle', 0).layers.fxu;
  };
  const legacy = probe(),
    full = probe(1),
    partial = probe(0.5),
    none = probe(0);
  assert.deepEqual(legacy.data, full.data);
  const peak = (q: Px) => q.data.reduce((a, v, i) => (i % 4 === 3 ? Math.max(a, v) : a), 0);
  assert.equal(peak(legacy), 42);
  assert.equal(peak(partial), 21);
  assert.equal(peak(none), 0);
});
