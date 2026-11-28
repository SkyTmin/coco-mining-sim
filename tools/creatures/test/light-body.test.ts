import assert from 'node:assert/strict';
import test from 'node:test';
import type { V3 } from '../rig/f15-rig';
import { F3, vadd, vlen, vsub } from '../rig/f15-rig';
import { aim, reach, toLocal } from '../bodies/goals';
import { lightFrame, lightSkeleton } from '../bodies/light-quadruped';
import { readCreatureCard } from '../bodies/card-data';
import route from '../c/bramble_warden-life';

const footNames = ['foreR', 'foreL', 'hindR', 'hindL'];
const forms = [
  { height: 1.12, length: 1.08, neckLength: 1.3, scale: 1.22 },
  { height: 0.68, length: 0.96, neckLength: 0.58, scale: 1.47 },
];

test('both light builds carry each diagonal around an entire stride and pivot without sole slip', () => {
  for (const props of forms)
    for (const mode of ['walk', 'turn'])
      for (let view = 0; view < 16; view += 2) {
        const counts: Record<string, number> = Object.fromEntries(footNames.map((k) => [k, 0]));
        const duration = mode === 'turn' ? 4 : 1;
        const sample = (n: number) => {
          const t = n / 24;
          const side = mode === 'turn' ? view + Math.floor(t * 4) : view;
          const s = lightSkeleton(mode, t, side, {}, 0, route, props);
          const travel: V3 = mode === 'walk' ? s.root.v((t * route.stride) / props.scale, 0, 0) : [0, 0, 0];
          return { s, travel };
        };
        for (let n = 0; n < 24 * duration; n++) {
          const a = sample(n),
            b = sample(n + 1);
          assert.ok(a.s.planted.length >= 2);
          for (const name of a.s.planted) {
            counts[name]++;
            assert.ok(Math.abs(a.s.points[name][2]) < 1e-8);
            if (b.s.planted.includes(name)) {
              assert.ok(
                vlen(vsub(vadd(a.s.points[name], a.travel), vadd(b.s.points[name], b.travel))) < 1e-8,
                mode + ' ' + name + ' f' + n,
              );
            }
          }
        }
        for (const n of Object.values(counts)) assert.ok(n > 0 && n < 24 * duration);
      }
});

test('skull and paws reach weighted goals at every bearing, and airborne feet reduce the shadow', () => {
  const aimAt: V3 = [37, 6, 28],
    paw: V3 = [20, 7, 5],
    hornTip: V3 = [-6, 9, 19];
  const pose = { ...aim('hornTip', aimAt), ...reach('handR', paw) };
  for (let side = 0; side < 16; side++) {
    const s = lightSkeleton('gesture', 0, side, pose, 0, route, forms[0], { hornTip });
    const base = F3.yaw(route.yaw + (side * Math.PI) / 8);
    assert.ok(vlen(vsub(toLocal(base, s.head.p(...hornTip)), aimAt)) < 1e-8);
    assert.ok(vlen(vsub(toLocal(base, s.legs.find((l) => l.name === 'foreR')!.hoof.o), paw)) < 1e-8);
  }
  const card = readCreatureCard('bramble_warden'),
    frame = lightFrame({ ...card, proportions: forms[1] }, route);
  const ground = frame('idle', 0, 0, 'normal'),
    air = frame('trick', 1, 0, 'normal', { headSide: 0, gaitPhase: 1, techniquePose: { jump: 24 } });
  for (const name of footNames) assert.ok(air.joints![name][2] > 15);
  assert.ok(air.groundShadow!.radius < ground.groundShadow!.radius);
  assert.ok(air.groundShadow!.opacity < ground.groundShadow!.opacity);
});

test('family sleep transitions share the resting joints at both ends', () => {
  for (const props of forms) {
    const pose = (anim: string, n: number) => lightSkeleton(anim, n / 24, 0, {}, 0, route, props);
    const awake = pose('idle', 0),
      sleep = pose('sleep', 0);
    assert.ok(sleep.body.o[2] < awake.body.o[2] - 9);
    for (const [mode, first, last] of [
      ['sleep_in', awake, sleep],
      ['sleep_out', sleep, awake],
      ['wake_startled', sleep, awake],
    ] as const) {
      for (const key of ['head', 'foreR', 'hindL', 'tailTip']) {
        assert.ok(vlen(vsub(pose(mode, 0).points[key], first.points[key])) < 1e-8);
        assert.ok(
          vlen(vsub(pose(mode, mode === 'wake_startled' ? 23 : 29).points[key], last.points[key])) < 1e-8,
        );
      }
    }
  }
});
