import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, techniquePoseAt, type JointPose, type Technique, type TechniqueBook } from '../technique';
import { F3, proj, type V3 } from '../rig/f15-rig';
import type { XY } from '../types';

// Foot targets name ankles in the unscaled animal grid. The skin places the
// audited contact socket 2.30 below each ankle, at the centre of the sole.
const grounded: Record<string, V3> = {
  foreR: [10.16, 11.88, 2.30], foreL: [16.96, -6.18, 2.30],
  hindR: [-18.96, 11.88, 2.30], hindL: [-12.16, -6.18, 2.30],
};
// Offset the three-dimensional goals of supporting soles by the ground travel.
const hindSupport = ['hindL', 'hindR'];
const heelSupport = ['foreL', 'foreR', 'hindL'];
function plantedPaws(raised: Record<string, V3>, travel: number, supporting: string[]): JointPose {
  const pose: JointPose = { 'travel.forward': travel };
  for (const [name, rest] of Object.entries(grounded)) {
    const [x, y, z] = raised[name] ?? rest;
    Object.assign(pose, reach(name, [x - (supporting.includes(name) ? travel : 0), y, z]));
  }
  return pose;
}
const foreHigh = { foreR: [-1, 18.5, 23], foreL: [20, -5.8, 14.4] } satisfies Record<string, V3>;
const foreReach = { foreR: [24.5, 17.5, 16], foreL: [27.5, -7.5, 15] } satisfies Record<string, V3>;
const foreLand = { foreR: [23, 13, 2.3], foreL: [28, -8.6, 2.3] } satisfies Record<string, V3>;
const heelHigh = { hindR: [-11.8, 15.4, 17.5] } satisfies Record<string, V3>;
const heelFly = { hindR: [-29, 16, 12] } satisfies Record<string, V3>;
const heelLand = { hindR: [-27, 14.2, 2.3] } satisfies Record<string, V3>;

const rows: Record<string, [number, JointPose][]> = {
  tech_forefall: [
    [0, {}],
    [16, { ...plantedPaws(foreHigh, -4.8, hindSupport), lean: -3.0, pitch: -.40, lift: 8.0, reach: 5, 'head.pitch': .35, 'tree.pitch': .09 }],
    [21, { ...plantedPaws(foreReach, -1.6, hindSupport), lean: -3.2, pitch: -.43, lift: 5.4, 'head.pitch': .36, 'tree.pitch': -.35 }],
    [24, { ...plantedPaws(foreLand, 4.8, hindSupport), lean: 4, pitch: .26, crouch: .6, 'head.pitch': .16, 'tree.pitch': -.28 }],
    [29, { ...plantedPaws(foreLand, 4.8, hindSupport), lean: 3.3, pitch: .16, crouch: 3.8, 'head.pitch': -.24, 'tree.pitch': .29 }],
    [41, {}],
  ],
  tech_heelwave: [
    [0, {}],
    [16, { ...plantedPaws(heelHigh, 9, heelSupport), pitch: .05, roll: -.10, crouch: 4.8, 'head.pitch': .16, 'tree.pitch': -.17 }],
    [21, { ...plantedPaws(heelFly, -5, heelSupport), lean: 3, pitch: .22, roll: -.06, crouch: 7, 'head.pitch': .30, 'tree.pitch': -.04 }],
    [24, { ...plantedPaws(heelLand, -8, heelSupport), lean: -3.2, pitch: -.14, roll: .16, crouch: 1, 'head.pitch': .45, 'tree.pitch': .17 }],
    [29, { ...plantedPaws(heelLand, -8, heelSupport), lean: -3.2, pitch: -.12, roll: .13, crouch: 6, 'head.pitch': -.23, 'tree.pitch': .22, 'tail.pitch': -.32 }],
    [40, {}],
  ],
};
const card = readCreatureCard('meadow_colossus');
const book: TechniqueBook = {};
for (const move of card.moves) {
  const keys = sixPoses(rows[move.id]);
  const sockets = move.id === 'tech_forefall' ? ['foreR', 'foreL'] : ['hindR'];
  book[move.id] = { title: move.title, reference: move.reference, weapon: move.weapon, keys,
    floorSocket: move.weapon + 'Ground', contactKind: 'floor', recovery: 'absorb',
    contacts: sockets.map(socket => ({ frame: 24, socket, floorSocket: socket + 'Ground', kind: 'floor' })),
    seconds: (keys.at(-1)!.frame + 1) / 24, shake: move.id === 'tech_forefall' ? .52 : .32, stop: 1/24,
    interpolate: true,
  };
}
// The route, socket audit and composition all see this same physical transfer.
export function meadowTravel(spec: Technique, t: number, side: number): XY {
  const pose = techniquePoseAt(spec,t);
  const scale = 1.19 * card.proportions.scale;
  const basis = F3.yaw(card.life.yaw + side * Math.PI / 8);
  const [x, y] = proj(basis.v((pose['travel.forward'] ?? 0) * scale,
    (pose['travel.side'] ?? 0) * scale, 0), 0, 0);
  return [x, y];
}
export default book;
