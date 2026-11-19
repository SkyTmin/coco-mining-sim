import { readCreatureCard } from '../bodies/card-data';
import { aim, reach } from '../bodies/goals';
import { techniquePoseAt } from '../technique';
import { buildMoveBook } from '../moves';

const card = readCreatureCard('rat_king');
const book = buildMoveBook(card.moves, card.body, {
  tech_cleave: {
    targets: [
      [-13, 23, 74],
      [4, 27, 72],
      [37, 23, 0],
      [40, 24, 25],
    ],
  },
  tech_whip: {
    targets: [
      [-44, -13, 55],
      [-51, 4, 47],
      [-22, 46, 0],
      [-12, 51, 4],
    ],
  },
  tech_summon: {
    targets: [
      [3, -15, 47],
      [4, -19, 45],
      [29, -26, 29],
      [32, -27, 27],
    ],
  },
  tech_sweep: {
    targets: [
      [-9, 48, 52],
      [13, 49, 43],
      [53, 44, 0],
      [56, 39, 4],
    ],
  },
  tech_leap: {
    targets: [
      [3, -10, 0],
      [-3, -10, 21],
      [14, -11, 0],
      [14, -11, 0],
    ],
    advance: [-10, 1, 10, 10],
  },
});
const cleave = book.tech_cleave;
Object.assign(cleave.keys[1].pose, { clubLift: 19, clubForward: 0, tailLift: -3 });
Object.assign(cleave.keys[2].pose, { clubLift: 17, clubForward: 4 });
Object.assign(cleave.keys[3].pose, { clubLift: 0, clubForward: 10, tailLift: 6 });
Object.assign(cleave.keys[4].pose, { clubLift: 2, clubForward: 7 });
const whip = book.tech_whip;
Object.assign(whip.keys[1].pose, { tailSweep: -0.87, tailLift: 9 });
Object.assign(whip.keys[3].pose, { tailSweep: 1.13 });
Object.assign(whip.keys[4].pose, { tailSweep: 1.27 });
const roll = book.tech_roll;
const rolling = [
  {},
  { dx: -32, crouch: 8, nest: 0.58, pitch: 0.24, clubAngle: 0.48 },
  { dx: -17, somersault: 1.3, nest: 0.8, lift: 1.6, clubAngle: 0.7 },
  { dx: 39, somersault: 3.0, nest: 0.9, lift: 4, clubAngle: 0.9 },
  { dx: 45, somersault: 5.2, nest: 0.7, lift: 1, clubAngle: 0.6 },
  { somersault: Math.PI * 2 },
];
roll.keys.forEach((key, i) => (key.pose = rolling[i]));
const call = book.tech_summon;
call.pathKeys = [
  { role: 'strike', frame: 19, pose: { ...reach('handL', [9, -26, 69]), dx: -5, twist: -0.15, crouch: -2 } },
];
Object.assign(call.keys[1].pose, { dx: -26, nod: -0.25, jaw: 0.55, ear: 0.2 });
Object.assign(call.keys[3].pose, { dx: 27, guard: 0.1, jaw: 0.85 });
Object.assign(call.keys[4].pose, { dx: 30, guard: 1, cape: 2 });
const sweep = book.tech_sweep;
for (const key of [...sweep.keys.slice(1, -1), ...(sweep.repeatKeys ?? [])]) {
  key.pose.rail = 1;
  if (key.role === 'hit' || key.role === 'follow') {
    key.pose.dx += 10;
    key.pose.crouch += 3;
  }
  key.pose.clubLift = key.role === 'strike' ? 9 : 3;
}
sweep.pathKeys = [
  { frame: 10, role: 'prep', pose: { rail: 0.55, twist: -0.22, ...aim('weaponTip', [-6, 40, 55]) } },
];
const leap = book.tech_leap;
Object.assign(leap.keys[2].pose, { tailLift: 4, cape: 2 });
Object.assign(leap.keys[3].pose, reach('footR', [1, 12, 4]));
leap.contacts = [
  { frame: 27, kind: 'floor', socket: 'footL', floorSocket: 'footLGround' },
  { frame: 30, kind: 'floor', socket: 'footR', floorSocket: 'footRGround' },
];
leap.pathKeys = [
  { role: 'follow', frame: 30, pose: { ...leap.keys[4].pose, ...reach('footR', [14, 11, 0]), dx: 14 } },
];
// Stance and follow-through were rehearsed against the six independent drawings per attack.
const staging: Record<string, Record<number, Record<string, number>>> = {
  tech_roll: {
    16: { hip: -6.4, lean: -4.8, pitch: 0.03, crouch: 3.2, nod: 0.26, twist: -0.26, tailLift: -4 },
    18: {
      hip: -10.4,
      lean: -7.8,
      pitch: -0.34,
      crouch: 7.8,
      nod: -0.1,
      twist: 0.42,
      tailSweep: -0.29,
      somersault: 0.81,
      nest: 0.38,
      tailLift: -2.5,
    },
    21: {
      hip: -10.4,
      lean: -5.85,
      pitch: 0.08,
      crouch: 4.8,
      nod: -0.58,
      somersault: 2.35,
      tailSweep: -0.18,
      nest: 1.06,
      twist: -0.16,
      tailLift: -1,
    },
    26: {
      hip: 6.2,
      lean: -2.85,
      pitch: 0.47,
      crouch: -1.35,
      nod: -0.42,
      twist: -0.26,
      tailSweep: 0.59,
      tailLift: 4,
      somersault: 5.58,
      nest: 0.38,
    },
  },
  tech_cleave: {
    14: { hip: 6.4, pitch: -0.17, crouch: -6, nod: -0.26, twist: -0.1, tailSweep: -0.29 },
    16: { hip: 10.4, lean: -8.26, pitch: 0, nod: 0.26, twist: -0.2, tailSweep: -0.29 },
    19: {
      'goal.weaponTip.forward': 46.43,
      'goal.weaponTip.right': -30.05,
      'goal.weaponTip.up': 0,
      'goal.weaponTip.weight': 1,
      hip: 13,
      lean: -5.41,
      pitch: 0.18,
      crouch: 3.05,
      nod: 0.58,
      twist: -0.24,
      tailSweep: 0.17,
      tailLift: 10,
    },
    23: { hip: 6.4, lean: -0.64, pitch: -0.03, crouch: 0.8, nod: -0.26, twist: -0.34, tailLift: -4 },
  },
  tech_leap: {
    17: { hip: -6.4, lean: 0.18, crouch: 11.8, nod: 0.42, tailLift: -4, pitch: 0.21, twist: 0.05 },
    24: { hip: 6.4, lean: 5.26, crouch: 3.4, nod: -0.26, twist: -0.46, tailSweep: -0.29, tailLift: 0, lift: 29.8 },
    33: { lean: -0.18, pitch: 0.17 },
  },
  tech_whip: {
    9: { hip: 3.8, lean: 1.33, pitch: 0.12, nod: 0.36, twist: 0.3, crouch: -3.85 },
    10: { nod: 0.26, twist: 0.15, tailSweep: 0.29, tailLift: -6.5, pitch: -0.23 },
    13: {
      'goal.tailTip.forward': -43.0,
      'goal.tailTip.right': 29.99,
      'goal.tailTip.up': 0,
      'goal.tailTip.weight': 1,
      hip: 0.2,
      lean: -0.51,
      pitch: -0.11,
      crouch: -0.8,
      nod: 0.52,
      twist: -0.8,
      tailSweep: 0.73,
    },
    16: { hip: -6.4, lean: 6.75, pitch: 0.24, crouch: 6.4, nod: 0.26 },
  },
  tech_summon: {
    17: {
      'goal.handL.right': -24,
      hip: -6.4,
      lean: -10,
      pitch: 0.03,
      crouch: 5,
      nod: 0.01,
      twist: -0.35,
      tailLift: -4,
    },
    18: { hip: -6.4, lean: -9.42, pitch: -0.04, crouch: 2.2, nod: -0.26, twist: -0.74, tailLift: -4 },
    21: {
      hip: 8.8,
      lean: -4.02,
      pitch: 0,
      crouch: -2.95,
      nod: -0.58,
      twist: -0.02,
      tailSweep: -0.18,
      tailLift: -1.62,
    },
    31: {
      hip: 10.4,
      lean: -0.97,
      pitch: -0.01,
      crouch: -4.35,
      nod: -0.52,
      twist: 0.24,
      tailLift: -8.12,
      tailSweep: -0.18,
    },
  },
  tech_sweep: {
    24: { lean: -1.67, twist: 0.56, tailSweep: -0.29, tailLift: -4 },
    25: { hip: 6.4, lean: -9.42, pitch: 0.11, nod: 0.26, twist: 0.31, tailSweep: -0.29 },
    28: {
      'goal.weaponTip.forward': 37.83,
      'goal.weaponTip.right': -24.59,
      'goal.weaponTip.up': 0,
      'goal.weaponTip.weight': 1,
      hip: -2.4,
      lean: 2.5,
      crouch: 4.2,
      nod: 0.42,
      twist: -0.70,
      tailSweep: 0.47,
      tailLift: 1,
      pitch: 0.18,
    },
    31: {
      hip: -4.8,
      lean: 0.6,
      pitch: 0.11,
      crouch: 8.85,
      nod: 0.58,
      twist: -0.42,
      tailSweep: 0.47,
      tailLift: 1.13,
    },
  },
};
for (const [name, frames] of Object.entries(staging)) {
  const move = book[name];
  for (const key of [...move.keys, ...(move.repeatKeys ?? [])]) {
    const first = move.keys.find((k) => k.role === key.role)!;
    Object.assign(key.pose, frames[first.frame] ?? {});
  }
}

// The forward cheek stays clear of the cleaver. Set both grip and blade
// while lifting so the rigid hook reads above the crenellations.
Object.assign(cleave.keys[1].pose, reach('handR', [-3, 17, 66]), aim('weaponTip', [-11, 16, 89]));
Object.assign(cleave.keys[2].pose, reach('handR', [8, 16, 72]), aim('weaponTip', [22, 16, 92]));
Object.assign(cleave.keys[3].pose, reach('handR', [36, 5, 19]));
Object.assign(cleave.keys[4].pose, reach('handR', [27, 10, 30]), aim('weaponTip', [48, 2, 23]));
const brace = reach('handL', [26, -13, 39]);
Object.assign(whip.keys[3].pose, brace, { tailSweep: 0.36, twist: -0.53 });
Object.assign(whip.keys[4].pose, brace);
Object.assign(roll.keys[1].pose, { tailWrap: 0.28, tuckFoot: 0.18 });
Object.assign(roll.keys[2].pose, { tailWrap: 0.87, tuckFoot: 0.68 });
Object.assign(roll.keys[3].pose, { tailWrap: 1, tuckFoot: 0.78, twist: 0.19 });
Object.assign(roll.keys[4].pose, { tailWrap: 0.45, tuckFoot: 0.28 });
Object.assign(call.keys[1].pose, reach('handL', [19, -22, 44]), { dx: -29 });
Object.assign(call.keys[2].pose, reach('handL', [20, -18, 30]));
Object.assign(call.keys[3].pose, reach('handL', [29, -10, 30]));
Object.assign(call.keys[4].pose, reach('handL', [32, -14, 19]), { dx: 36 });
call.pathKeys = [
  {
    role: 'strike',
    frame: 19,
    pose: { ...reach('handL', [27, -23, 76]), dx: -9, hip: 4, twist: -0.2, crouch: 0 },
  },
];
for (const key of [...sweep.keys, ...(sweep.repeatKeys ?? [])]) {
  if (key.role === 'prep') Object.assign(key.pose, reach('handR', [1, 18, 55]), aim('weaponTip', [-34, 18, 67]));
  if (key.role === 'strike') Object.assign(key.pose, reach('handR', [14, 18, 39]), aim('weaponTip', [48, 9, 44]));
  if (key.role === 'hit') Object.assign(key.pose, reach('handR', [28, 4, 17]));
  if (key.role === 'follow') Object.assign(key.pose, reach('handR', [36, 6, 12]), aim('weaponTip', [45, -33, 1]));
  if (key.role === 'hit') key.pose.dx = 25 - Math.round((key.frame - 28) / 10) * 7;
  if (key.role === 'follow') key.pose.dx = 27 - Math.round((key.frame - 31) / 10) * 7;
}
Object.assign(leap.keys[3].pose, brace);
Object.assign(leap.keys[4].pose, brace);
Object.assign(leap.pathKeys![0].pose, brace);
Object.assign(roll.keys[3].pose, {
  nod: 0.46,
  twist: 0.02,
  somersault: 2.32,
  roll: -0.45,
  tuckFoot: 0.12,
  hip: -7.94,
  crouch: 10.2,
  lift: 1.7,
  pitch: -0.08,
  tailSweep: 0.22,
  tailLift: 11.48,
  nest: 1.3,
  tailWrap: 1,
  clubAngle: 0.34,
  lean: -3.59,
});
Object.assign(roll.keys[4].pose, { pitch: 0.7, crouch: -7.35, nod: -0.1, roll: -0.48, tailWrap: 0 });

// Carry the free hand outside the head silhouette as the shoulder rolls under.
roll.pathKeys = [19, 23].map((frame, index) => ({
  frame,
  role: 'strike',
  pose: { ...techniquePoseAt(roll, frame / 24), ...reach('handL', index === 0 ? [5, -8, 19] : [4, -14, 41]) },
}));
Object.assign(roll.keys[3].pose, reach('handL', [-34, -7, 33]));
for (const key of [...sweep.keys, ...(sweep.repeatKeys ?? [])]) {
  if (key.role === 'hit') Object.assign(key.pose, reach('handL', [6, -17, 26]));
  if (key.role === 'follow') Object.assign(key.pose, reach('handL', [8, -17, 26]));
}
Object.assign(leap.keys[3].pose, reach('handL', [31, -19, 39]));
Object.assign(leap.keys[4].pose, reach('handL', [31, -19, 39]));
Object.assign(leap.pathKeys![0].pose, reach('handL', [31, -19, 39]));
roll.pathKeys = [
  ...roll.pathKeys!,
  { role: 'strike', frame: 20, pose: { ...techniquePoseAt(roll, 20 / 24), ...reach('handL', [6, -8, 16]) } },
];
Object.assign(roll.pathKeys!.find((key) => key.frame === 23)!.pose, { gaze: 0, nod: 0.6 });
for (const hit of sweep.contacts!) {
  const frame = hit.frame - 1;
  const approach = { ...techniquePoseAt(sweep, frame / 24), ...reach('handL', [16, -18, 30]) };
  // The transient drawing inherits interpolated goals, without declaring a new contact.
  delete approach['goal.weaponTip.contactFrame'];
  sweep.pathKeys = [...(sweep.pathKeys ?? []), { role: 'strike', frame, pose: approach }];
}
export default book;
