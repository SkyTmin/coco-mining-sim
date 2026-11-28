import assert from 'node:assert/strict';
import test from 'node:test';
import { arachnidSkeleton, arachnidFrame } from '../bodies/arachnid';
import { reach, toLocal } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { scorpionFrame } from '../c/sand_scorpion-rig';
import { vsub, vadd, vlen, vmul, F3, type V3 } from '../rig/f15-rig';
const card = readCreatureCard('sand_scorpion'),
  route = card.life;
const near = (a: V3, b: V3) => assert.ok(vlen(vsub(a, b)) < 1e-6, `${a} != ${b}`);
test('eight arachnid tarsi share a planted tetrapod cycle and remain still under locomotion and pivots', () => {
  for (const mode of ['walk', 'turn'])
    for (let side = 0; side < 16; side += 2) {
      const frames = mode === 'turn' ? 96 : 24,
        contacts = new Map<string, number>();
      const at = (n: number) => {
        const t = n / 24,
          s = arachnidSkeleton(mode, t, side + (mode === 'turn' ? Math.floor(4 * t) : 0), {}, 0, route, card);
        const travel: V3 =
          mode === 'turn' ? [0, 0, 0] : s.face.v((t * route.stride) / card.proportions.scale, 0, 0);
        return { s, travel };
      };
      for (let n = 0; n < frames; n++) {
        const a = at(n),
          b = at(n + 1);
        assert.equal(a.s.legs.length, 8);
        assert.equal(a.s.claws.length, 2);
        assert.equal(a.s.tail.length, 8);
        assert.equal(a.s.legs.filter((l) => l.down).length, 4);
        for (let i = 0; i < 8; i++) {
          const l = a.s.legs[i];
          if (!l.down) continue;
          contacts.set(l.name, (contacts.get(l.name) ?? 0) + 1);
          assert.equal(l.toe[2], 0);
          if (b.s.legs[i].down) near(vadd(a.travel, l.toe), vadd(b.travel, b.s.legs[i].toe));
        }
      }
      for (const count of contacts.values()) assert.equal(count, frames / 2);
    }
});
test('five material contact points reach independent local targets in all 16 bearings', () => {
  for (let side = 0; side < 16; side++) {
    const goal: V3 = [26, 17, 14],
      face = F3.yaw(route.yaw + (side * Math.PI) / 8);
    for (const key of ['clawL', 'clawR', 'sting', 'stingFacet', 'footR0']) {
      const s = arachnidSkeleton('layout', 0, side, reach(key, goal), 0, route, card);
      near(toLocal(face, s.points[key]), goal);
      assert.ok(vlen(vsub(s.points.sting, s.points.stingFacet)) > 2);
    }
  }
});
test('mirror can transfer through a pincer, detach, and return while the second form retains its opened armor', () => {
  const frame = scorpionFrame(card, route),
    run = (pose: Record<string, number>, mode = 'layout') =>
      frame(mode, 0, 0, 'normal', { headSide: 0, gaitPhase: 0, techniquePose: pose });
  const base = run({}),
    held = run({ diskHand: 1 }),
    free = run({ diskLoose: 1, ...reach('diskFree', [0, 0, 85]) });
  near(base.joints!.disk, base.joints!.diskSeat);
  near(held.joints!.diskRim, held.joints!.clawR);
  near(free.joints!.disk, [0, 0, 85 * card.proportions.scale]);
  near(run({ diskLoose: 0 }).joints!.disk, base.joints!.disk);
  const phase = run({ phase: 1 }, 'phase'),
    sleep = run({}, 'sleep'),
    second = run({}, 'idle-f2');
  near(phase.joints!.plateR2, second.joints!.plateR2);
  assert.ok(second.joints!.plateR2[2] > base.joints!.plateR2[2] + 8);
  assert.ok(!second.rig!.prims.some((p) => p.t === 'scarf'));
  assert.ok(second.lit && base.primitives! >= 700);
  assert.ok(sleep.joints!.head[2] < base.joints!.head[2]);
  const stock = arachnidFrame(card, route);
  const gold = stock('layout', 0, 0, 'gold');
  assert.equal(gold.px.w, 160);
  assert.ok(gold.primitives! > 0);
});
