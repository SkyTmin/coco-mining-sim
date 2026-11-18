import assert from 'node:assert/strict';
import test from 'node:test';
import { heavySkeleton } from '../bodies/heavy-quadruped';
import { aim, reach, toLocal } from '../bodies/goals';
import { F3, vlen, vsub, type V3 } from '../rig/f15-rig';
import route from '../c/bramble_warden-life';

test('the horn and coiling legs carry their physical endpoints to body-local goals in every view', () => {
  const horn: V3 = [36, 1, 14],
    hornOffset: V3 = [17, 8, 6];
  const right: V3 = [22, 13, 0],
    left: V3 = [-19, -13, 0];
  const pose = {
    ...aim('hornTip', horn),
    ...reach('foreR', right),
    ...reach('hindL', left),
    lean: 7,
    crouch: 1,
  };
  for (let side = 0; side < 16; side++) {
    const s = heavySkeleton('tech_ram', 21 / 24, side, pose, 0, route, {}, hornOffset);
    const facing = F3.yaw(route.yaw + (side * Math.PI) / 8);
    const pairs: [V3, V3][] = [
      [s.head.p(...hornOffset), horn],
      [s.legs.find((l) => l.name === 'foreR')!.hoof.o, right],
      [s.legs.find((l) => l.name === 'hindL')!.hoof.o, left],
      [s.points.weaponTipGround, [horn[0], horn[1], 0]],
    ];
    for (const [physicalPoint, expected] of pairs) {
      assert.ok(vlen(vsub(toLocal(facing, physicalPoint), expected)) < 1e-6);
    }
  }
  assert.throws(
    () => heavySkeleton('tech_ram', 0, 0, aim('hornTip', [0, 0, 20]), 0, route),
    /inside the torso/
  );
});
