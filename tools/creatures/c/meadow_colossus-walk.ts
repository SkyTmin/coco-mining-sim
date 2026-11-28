import { readCreatureCard } from '../bodies/card-data';
import { reach } from '../bodies/goals';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { directions } from '../motion';
import type { JointPose } from '../technique';
import { meadowStagger } from './meadow_colossus-stance';

const card = readCreatureCard('meadow_colossus');
const stride = card.life.stride / (1.19 * card.proportions.scale);
const walkFeet = [
  { name: 'hindL', end: -1, side: -1 }, { name: 'foreL', end: 1, side: -1 },
  { name: 'hindR', end: -1, side: 1 }, { name: 'foreR', end: 1, side: 1 },
] as const;
function track(leg: (typeof walkFeet)[number]) {
  const [forward, right] = meadowStagger(leg.side);
  return [leg.end * 14 * card.proportions.length - 1 + forward, leg.side * 9.8 * card.proportions.width + right] as const;
}
const walkKeys = [3, 9, 15, 21];
export const meadowWalkTiming: Record<string, number[]> = {
  ...Object.fromEntries(directions.map(dir => ['walk_' + dir, [...walkKeys]])),
  turn: [0, 7, 24, 54], hatch: [0, 9, 20, 31], tired: [0, 10, 21, 30],
};

const cycle = (t: number) => t - Math.floor(t);
const tau = 2 * Math.PI;
function walk(t: number, side: number): JointPose {
  const u = cycle(t), sway = Math.sin(tau * (u + 0.125));
  // On the approach the animal raises its chin to watch the field ahead;
  // the neck stays level on the departing tracks. All feet carry the same stride.
  const bearing = card.life.yaw + side * Math.PI / 8, toward = Math.max(0, Math.sin(bearing));
  const diagonal = 2 * toward * Math.abs(Math.cos(bearing));
  const pose: JointPose = {
    // The shell settles onto the three supporting legs. The neck extends over
    // the advancing forefoot as it scouts the ground on the oblique approaches.
    crouch: 3.1 + 0.4 * Math.cos(2 * tau * (u - 0.375)),
    reach: 2.8 * toward + 11.6 * diagonal, lean: 0.8 * toward,
    roll: 0.040 * sway,
    twist: 0.035 * Math.sin(tau * u),
    pitch: 0.018 * Math.cos(2 * tau * u) - 0.065 * toward + 0.045 - 0.15 * diagonal,
    'head.yaw': -0.048 * sway - 0.32 * toward * Math.cos(bearing),
    'head.pitch': -0.025 * Math.cos(2 * tau * u) - 0.42 * toward,
    'tree.pitch': 0.033 * Math.cos(2 * tau * (u - 0.05)),
  };
  for (const [i, leg] of walkFeet.entries()) {
    // The four drawn cells show mid-swing in left rear, left front, right rear,
    // right front order. Ground contact lasts three quarters of a revolution.
    const phase = cycle(u - walkKeys[i] / 24 + 0.125);
    const swing = phase < 0.25;
    const step = Math.min(1, 4 * phase);
    const lift = Math.sin(Math.PI * step) ** 2;
    // The foot's local backward speed exactly cancels the painting's travel
    // during support. The cubic joins this same speed at lift and touchdown.
    const forward = stride * (-0.375 - phase + step * step * (3 - 2 * step));
    const [x, y] = track(leg);
    Object.assign(pose, reach(leg.name, [
      x + forward + (leg.end > 0 ? 4.8 : 2.8) * lift, y + leg.side * (7.8 + lift),
      2.30 + (leg.end === 1 ? 5.4 : 4.1) * lift,
    ]));
    pose['plant.' + leg.name] = !swing || lift < 1e-8 ? 1 : 0;
  }
  return pose;
}

// Match the four source views on a full four-second circuit: near quarter, right
// profile, rear quarter, left profile. A sole keeps its world bearing during support.
export function meadowTurnBearing(t: number) {
  const frame = cycle(t / 4) * 96;
  // Linger at the rear quarter while the head is still visible over the right
  // flank in cell 3, then transfer the hips into the opposite profile.
  const linger = Math.max(0, Math.min((frame - 7) / 17, (54 - frame) / 30));
  return 0.53 - tau * t / 4 + 0.35 * linger * linger * (3 - 2 * linger);
}
function pivot(t: number): JointPose {
  const spin = meadowTurnBearing(t);
  const frame = cycle(t / 4) * 96;
  // The snout leads the turn and descends beside the shell as the near foot
  // clears the ground. Keep the neck outstretched through the far profile.
  const dipPhase = Math.max(0, Math.min(1, frame / 10, (74 - frame) / 20));
  const dip = dipPhase * dipPhase * (3 - 2 * dipPhase);
  const pose: JointPose = {
    crouch: 3.5, reach: 4.6 * dip, 'head.pitch': (0.38 + 0.46 * Math.min(1, Math.max(0, (frame - 7) / 12))) * dip,
    'turn.side': (spin - card.life.yaw) * 8 / Math.PI,
    'head.yaw': -0.11 + 0.025 * Math.cos(t * tau),
    roll: 0.025 * Math.sin(t * 2 * tau),
    'tree.roll': 0.026 * Math.sin((t - 0.05) * 2 * tau),
  };
  for (const [i, leg] of walkFeet.entries()) {
    const phase = cycle(2 * t - i / 4 + 0.125);
    const step = Math.min(1, 4 * phase), lift = Math.sin(Math.PI * step) ** 2;
    const last = meadowTurnBearing(t + (-0.375 - phase) / 2), next = meadowTurnBearing(t + (0.625 - phase) / 2);
    const delta = last + (next - last) * step * step * (3 - 2 * step) - spin;
    const [x, y] = track(leg);
    Object.assign(pose, reach(leg.name, [
      x * Math.cos(delta) - y * Math.sin(delta), x * Math.sin(delta) + y * Math.cos(delta), 2.30 + 3.2 * lift,
    ]));
    pose['plant.' + leg.name] = lift < 1e-8 ? 1 : 0;
  }
  return pose;
}

// Plant the foot on its own track while the head and shell move independently.
function brace(spread: number, foreReach = 0, foreLift = 0): JointPose {
  return Object.assign({}, ...walkFeet.map(leg => {
    const leading = leg.name === 'foreR', [x, y] = track(leg);
    return reach(leg.name, [
      x + (leading ? foreReach : 0),
      y + leg.side * (leg.end === 1 ? spread : spread * 0.35),
      2.30 + (leading ? foreLift : 0),
    ]);
  }));
}
const shotKeys: Record<string, KeyPose<JointPose>[]> = {
  hatch: [
    [0, {}],
    [9, { ...brace(0.8), 'neck.tuck': 0.54, crouch: 1.8, pitch: 0.035, 'head.pitch': 0.22, 'eye.close': 0.42, 'tree.pitch': -0.035 }],
    [20, { ...brace(0.4, 4.4, 3.8), 'neck.tuck': 0.06, lean: 1.6, lift: 0.8, 'head.pitch': -0.34, 'jaw.open': 0.38, 'tree.pitch': 0.066 }],
    [31, { ...brace(0.2, 1.4), lean: 0.7, reach: 1, 'head.pitch': -0.13, 'eye.close': 0.16, 'tree.pitch': -0.016 }],
    [35, {}],
  ],
  tired: [
    [0, {}],
    [10, { ...brace(1.7), crouch: 1.6, lean: 0.8, reach: 1.2, 'head.pitch': 0.22, 'eye.close': 0.35, 'tree.pitch': -0.035 }],
    [21, { ...brace(2.3), crouch: 3.6, lean: 1.5, reach: 1.3, 'head.pitch': 0.42, 'eye.close': 0.76, 'tree.pitch': 0.045 }],
    [30, { ...brace(0.7), crouch: 1.1, reach: 0.45, 'head.pitch': 0.14, 'eye.close': 0.14, 'tree.pitch': -0.025 }],
    [35, {}],
  ],
};
const defaults = Object.fromEntries(Object.entries(shotKeys).map(([anim, keys]) => [
  anim, Object.fromEntries(keys.flatMap(([, pose]) => Object.keys(pose).map(key => [key, 0]))),
]));

export function meadowWalkPose(anim: string, t: number, side: number): JointPose | undefined {
  if (anim === 'walk' || directions.some(dir => anim === 'walk_' + dir)) return walk(t, side);
  if (anim === 'turn') return pivot(t);
  if (shotKeys[anim]) return keyPose(t * 24, shotKeys[anim], defaults[anim]);
  return undefined;
}
