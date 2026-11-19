import assert from 'node:assert/strict';
import test from 'node:test';
import { cephalopodSkeleton } from '../bodies/cephalopod';
import { readCreatureCard } from '../bodies/card-data';
import { reach, toLocal } from '../bodies/goals';
import { admiralFrame, implementsByArm } from '../c/ink_admiral-rig';
import { F3, vadd, vlen, vsub, type V3 } from '../rig/f15-rig';

const card = readCreatureCard('ink_admiral'),
  route = card.life,
  scale = card.proportions.scale;
const near = (a: V3, b: V3) => assert.ok(vlen(vsub(a, b)) < 1e-7, `${a} != ${b}`);
test('sucker beds keep independent floor contacts through translation and rotation at all eight bearings', () => {
  for (const anim of ['walk', 'turn'])
    for (let side = 0; side < 16; side += 2) {
      const seen = Array(8).fill(0),
        len = anim === 'turn' ? 96 : 24;
      function sample(n: number) {
        const t = n / 24;
        const s = cephalopodSkeleton(
          anim,
          t,
          side + (anim === 'turn' ? Math.floor(4 * t) : 0),
          {},
          0,
          route,
          card,
        );
        const travel = anim === 'walk' ? s.face.v((t * route.stride) / scale, 0, 0) : ([0, 0, 0] as V3);
        return { s, travel };
      }
      for (let i = 0; i < len; i++) {
        const a = sample(i),
          b = sample(i + 1);
        assert.ok(a.s.arms.filter((r) => r.down).length >= 4);
        for (const arm of a.s.arms) {
          assert.equal(arm.nodes.length, 13);
          near(arm.nodes.at(-1)!, arm.tip);
          if (!arm.down) continue;
          seen[arm.index]++;
          assert.equal(arm.pad[2], 0);
          if (b.s.arms[arm.index].down) {
            for (const j of [5, 6, 7])
              near(vadd(arm.nodes[j], a.travel), vadd(b.s.arms[arm.index].nodes[j], b.travel));
          }
        }
      }
      assert.ok(seen.every((n) => n > 0 && n < len));
    }
});
test('real implements solve for their contacts, detach from their grip and return to their original radial ray', () => {
  const frame = admiralFrame(card, route),
    up = scale * card.proportions.vertical;
  const target: V3 = [25, 20, 27],
    free: V3 = [3, 1, 57],
    side = 1;
  const local = (p: V3) =>
    toLocal(F3.yaw(route.yaw + (side * Math.PI) / 8), [p[0] / scale, p[1] / scale, p[2] / up]);
  const run = (pose: Record<string, number>) =>
    frame('layout', 0, side, 'normal', { headSide: side, gaitPhase: 0, techniquePose: pose });
  const base = run({});
  assert.ok(base.primitives! >= 550);
  for (const [i, name] of implementsByArm.entries()) {
    near(base.joints![name + 'Grip'], base.joints!['arm' + i]);
    const at = run({ ...reach(name, target), [name + 'Pitch']: 0.4, [name + 'Roll']: -0.3 });
    near(local(at.joints![name]), target);
    const loose = run({ ...reach(name + 'Free', free), [name + 'Loose']: 1 });
    near(local(loose.joints![name + 'Grip']), free);
    near(loose.joints!['arm' + i], base.joints!['arm' + i]);
    near(
      run({ ...reach(name + 'Free', free), [name + 'Loose']: 0 }).joints![name + 'Grip'],
      base.joints![name + 'Grip'],
    );
    assert.ok(base.rig!.prims.some((p) => p.t === name));
  }
  near(base.joints!.hatGrip, base.joints!.hatSeat);
  const inHand = run({ hatHand: 1, hatPickup: 1 });
  near(inHand.joints!.hatRim, inHand.joints!.arm7);
  assert.ok(vlen(vsub(inHand.joints!.hatGrip, inHand.joints!.lanternGrip)) > 5);
  const air = run({ ...reach('hatFree', free), hatLoose: 1, lift: 20 });
  near(local(air.joints!.hatGrip), free);
  assert.ok(air.groundShadow!.radius < base.groundShadow!.radius);
  assert.ok(air.groundShadow!.opacity < base.groundShadow!.opacity);
});
