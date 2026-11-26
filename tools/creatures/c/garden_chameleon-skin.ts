// A single skeleton carries the casque, both swivelling eyes, the sticky pad and four opposing grips.
import type { CreatureCard } from '../bodies/card-data';
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { finishSurfaces } from './surface-work';
import {
  F3,
  vadd,
  vcross,
  vdot,
  vlerp,
  vlen,
  vsub,
  vnorm,
  vmul,
  type Mat,
  type Rig,
  type Tones,
  type V3,
  Rig as Figure,
} from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { JointPose } from '../technique';
import type { Creature, Variant } from '../types';
import { clips, home, poseAt, seedContact, walkingStance } from './garden_chameleon-poses';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const view: V3 = [0, 0.8, 0.6];
const black: Mat = { T: ['#222531', '#26332e', '#354439', '#43503d'].map((c) => hx(c)) as Tones };
const mouthLining: Mat = { T: ['#392e36', '#573744', '#764754', '#995b64'].map((c) => hx(c)) as Tones };
const dark = hx('#3f4c3a'),
  cream = hx('#f8e6a1'),
  white = hx('#fff3cf');
function palette(card: CreatureCard, variant: Variant, shadow: number) {
  const mats = Object.fromEntries(
    card.materials.map(({ name, tones }) => {
      const gold = ['#664931', '#a3783f', '#deb85c', '#fff1a8'];
      const dim = ['#264d48', '#477363', '#779378', '#a6b589'];
      const T = [tones[0], tones[1], tones.at(-2)!, tones.at(-1)!].map((c, i) => {
        const base =
          variant === 'gold' && ['skin', 'bars', 'belly'].includes(name)
            ? mixc(hx(c), hx(gold[i]), 0.8)
            : hx(c);
        return shadow && ['skin', 'bars'].includes(name) ? mixc(base, hx(dim[i]), shadow * 0.74) : base;
      }) as Tones;
      return [name, { T } as Mat];
    }),
  ) as Record<string, Mat>;
  return mats;
}
type Colors = ReturnType<typeof palette>;

function torso(r: Rig, B: F3, m: Colors) {
  r.tag = 'body';
  // Stepped, broken vertical bars follow the bulging flank all the way around.
  const skin: Mat = {
    ...m.skin,
    pat: ([x, y, z], l) => {
      const tone = Math.max(0, Math.min(3, Math.floor(l * 3.7)));
      const bar = Math.cos((x + 0.15 * Math.sin(z * 4.5) + z * 0.12) * 17);
      if (z < -0.47) return m.belly.T[tone];
      if (Math.abs(z + 0.12 + 0.13 * x) < 0.095 && Math.sin(x * 19) > -0.72)
        return m.belly.T[Math.min(3, tone + 1)];
      if (bar > 0.29 && Math.abs(y) > 0.2) return m.bars.T[tone];
      const g = hash(Math.floor(x * 20), Math.floor(z * 17), 31);
      if (g > 0.75) return mixc(m.skin.T[tone], m.belly.T[3], 0.22);
      return null;
    },
  };
  r.ell(B, [0, 0, 0], [12, 4.65, 9.9], skin);
  for (let i = 0; i < 16; i++) {
    const x = -10.9 + i * 1.35,
      z = 9.9 * Math.sqrt(Math.max(0, 1 - (x / 12) ** 2));
    r.spike(B.p(x, 0, z - 0.38), B.v(-0.24, 0, 1), 1.22 + 0.45 * Math.sin(i * 0.52), 0.65, m.belly, 3);
  }
  for (const side of [-1, 1])
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 11; i++) {
        const x = -9.9 + 1.83 * i + (row % 2) * 0.57,
          z = -4.3 + row * 2.5 + Math.sin(i * 0.93) * 0.42;
        const f = 1 - (x / 12) ** 2 - (z / 9.9) ** 2;
        if (f <= 0.07) continue;
        const size = 0.2 + hash(i, row, 4) * 0.32;
        r.ell(
          B,
          [x, side * 4.65 * Math.sqrt(f), z],
          [size * 1.23, 0.27, size],
          i % 4 === 0 ? m.belly : m.skin,
        );
      }
}
function tail(r: Rig, B: F3, m: Colors, p: JointPose, step: number, gait: number): V3 {
  r.tag = 'tail';
  const loose = p.loose ?? 0,
    tuck = p.tuck ?? 0;
  const cx = -17.3 - 3.5 * loose + 1.6 * tuck,
    cz = -4.5 + 1.6 * tuck;
  const unroll = p.unroll ?? 0;
  const lift = -0.5 * Math.sin(Math.PI * unroll);
  const arc = (u: number): V3 => {
    const rad = (7.3 - 0.9 * tuck) * (1 - u) + 1.15 * u;
    const angle = 0.43 + u * (6.08 - 0.64 * loose + 0.37 * tuck);
    return [
      cx + Math.cos(angle) * rad,
      1.1 + u * 0.85 + Math.sin(step * TAU - 0.62 - u * 1.7) * gait * (0.45 + u) + u * (p.sway ?? 0),
      cz + Math.sin(angle) * rad + u * (p.tip ?? 0),
    ];
  };
  const root: V3 = [-8.7, 0, -1.2];
  // As the coil opens it sweeps out to one side to balance the first step.
  const sweep =
    unroll > 0
      ? B.at(...root)
          .turn(-0.17 * unroll)
          .pitch(0.3 * unroll)
          .roll(0.4 * unroll)
      : undefined;
  let lastBind = root,
    posed = root,
    prev = B.p(...root),
    thick = 3.25;
  let lastAngle = 0,
    lastStraight = 0,
    heading = 0;
  for (let i = 0; i <= 27; i++) {
    const u = i / 27,
      bind = arc(u),
      radius = mix(2.65, 0.37, u);
    if (unroll > 0) {
      // Unwind each joint from the base towards the tip. Each segment keeps its length.
      const dx = bind[0] - lastBind[0],
        dz = bind[2] - lastBind[2],
        length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const straight = Math.PI * (0.91 - 0.29 * Math.sin(TAU * u - 0.34) + 0.23 * u);
      const released = clamp(unroll * 1.34 - u * 0.34);
      if (i === 0)
        heading = angle + Math.atan2(Math.sin(straight - angle), Math.cos(straight - angle)) * released;
      else {
        const bend = Math.atan2(Math.sin(angle - lastAngle), Math.cos(angle - lastAngle));
        heading += mix(bend, straight - lastStraight, released);
      }
      posed = [
        posed[0] + length * Math.cos(heading + lift),
        bind[1],
        posed[2] + length * Math.sin(heading + lift),
      ];
      lastBind = bind;
      lastAngle = angle;
      lastStraight = straight;
    } else posed = bind;
    const next = sweep ? sweep.p(...vsub(posed, root)) : B.p(...posed);
    r.cap(prev, next, thick, radius, i % 5 < 2 ? m.bars : m.skin);
    if (i > 0 && i % 3 === 1)
      r.line(
        vadd(prev, B.v(0, thick * 0.82, thick * 0.4)),
        vadd(next, B.v(0, radius * 0.82, radius * 0.4)),
        m.belly.T[2],
      );
    prev = next;
    thick = radius;
  }
  return prev;
}
function face(r: Rig, H: F3, m: Colors, p: JointPose, breathe: number, sockets: Record<string, V3>) {
  r.tag = 'head';
  const open = p.open ?? 0;
  // The forward part of the cheek ends at the upper lip. Carve the gape as the hinge lowers.
  r.ell(
    H,
    [0.35, 0, 0.1],
    [6.65, 4.15, 4.65],
    m.skin,
    open > 0
      ? ([x, , z]) => {
          const cut = mix(-4.65, -1.52 + 0.56 * x, clamp(open * 2) * clamp((x + 0.05) * 3));
          return 0.1 + 4.65 * z < cut;
        }
      : undefined,
  );
  const nose = H.p(7.4 + 1.5 * open, 0, -0.5),
    crown = H.p(-4.2, 0, 10.8),
    nape = H.p(-5.8, 0, 1.3),
    brow = H.p(3, 0, 4.2);
  for (const s of [-1, 1]) {
    const cheek = H.p(-3.5, s * 3.14, 2.0),
      ridge = H.p(-3.18, s * 2.0, 8.6);
    r.poly([nape, cheek, ridge, crown], m.bars);
    r.poly([ridge, cheek, brow, crown], m.skin);
    r.poly([H.p(5.2, s * 2.5, 0.77), H.p(4.8, s * 2.1, -1), nose], m.skin);
    r.line(cheek, ridge, m.belly.T[2]);
    r.line(ridge, brow, m.belly.T[3]);
    for (let j = 0; j < 4; j++)
      r.line(
        H.p(-3.5 + j * 0.47, s * (2.8 - j * 0.29), 3.3 + j * 1.1),
        H.p(-3.2 + j * 0.46, s * (2.55 - j * 0.28), 5.1 + j * 0.82),
        m.bars.T[2],
      );
  }
  r.line(crown, brow, m.belly.T[3]);
  sockets.casque = crown;
  const jaw = H.at(-2.15, 0, -1.65).pitch(0.05 + 0.7 * open);
  const upper = H.p(7.5 + 1.5 * open, 0, -1.22);
  const lower = jaw.p(9.12, 0, 0.55);
  const throat = jaw.p(6.35, 0, 1.63);
  if (open > 0) {
    r.tag = 'muzzle';
    // A short, triangular upper snout shades the opening above the tongue.
    for (const s of [-1, 1]) {
      const cheek = H.p(2.8, s * 3.35, -1.52);
      const front = H.p(6.3 + open * 0.75, s * 1.81, -1.3);
      r.poly([H.p(2.8, s * 2.9, 1.75), H.p(6.1, s * 1.4, 1.02), nose, front, cheek], m.skin);
      r.poly([cheek, front, upper, H.p(1.1, 0, -1.52)], mouthLining);
      r.line(cheek, front, m.belly.T[2]);
      r.line(front, upper, m.belly.T[3]);
    }
    r.tag = 'gape';
    // Inside walls stop at the corners. The front of the mouth stays open between the lips.
    for (const s of [-1, 1])
      r.poly(
        [
          H.p(-0.8, s * 2.4, -1.4),
          H.p(4.6, s * 2.45, -1.45),
          jaw.p(6.7, s * 2.08, 1.05),
          jaw.p(2.3, s * 2.35, 1.2),
        ],
        mouthLining,
      );
  }
  r.tag = 'jaw';
  r.ell(jaw, [3.65, 0, -0.15], [5.66, 3.48, 2.05], m.belly);
  if (open > 0.1) r.ell(jaw, [4.2, 0, 1.23], [4.73, 2.69, 0.69], mouthLining);
  for (const s of [-1, 1]) {
    r.line(H.p(-2.4, s * 3.67, -1.2), H.p(3.7, s * 3.06, -1.47), dark);
    if (open < 0.1) r.line(H.p(3.7, s * 3.06, -1.47), H.p(7.32, s * 0.69, -0.83), dark);
    r.ell(H, [5.29, s * 2.27, 1.29], [0.62, 0.37, 0.44], black);
    r.dot(H.p(5.75, s * 2.25, 1.57), cream, 0, 0.43);
  }
  sockets.head = H.o;
  sockets.nose = nose;
  sockets.chin = jaw.p(3.2, 2.7, -1.43);
  sockets.upperLip = upper;
  sockets.lowerLip = lower;
  sockets.tongueRoot = throat;
  sockets.lip = vlerp(lower, upper, 0.42);
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const eye = H.p(1.1, s * 3.65, 2.15);
    const near = s === 1,
      look = p.focus ?? 0,
      scout = p.scout ?? 0;
    const forward =
      (near ? 0.58 : 1.35) +
      (near ? scout * 0.93 : -scout * 0.65) +
      (look < 0 ? -look * 0.85 : look * 0.42) +
      breathe * (near ? 0.14 : -0.19);
    const up = 0.22 + (p.up ?? 0) * (near ? 0.6 : 0.38) + (look < 0 ? look * 0.51 : look * 0.04);
    const normal = vnorm(H.v(forward, s, up));
    const right = vnorm(vcross([0, 0, 1], normal)),
      outward = new F3(eye, normal, right, vcross(normal, right));
    const outer = outward.p(3.55, 0, 0);
    const start = r.size;
    r.ball(eye, 3.6, m.bars);
    r.ell(outward, [2.1, 0, 0], [1.18, 3.04, 2.96], m.skin);
    r.ell(outward, [2.93, 0, 0], [0.85, 2.43, 2.4], m.belly);
    for (let j = 0; j < 9; j++) {
      const a = (j * TAU) / 9;
      r.dot(vadd(eye, H.v(Math.cos(a) * 2.69, s * 2.2, Math.sin(a) * 2.63)), m.skin.T[(j % 2) + 1], 0, 0.34);
    }
    const pupil = outward.p(4.28, 0, 0.02),
      lids = p.lids ?? 0;
    if (lids < 0.84) {
      r.ell(outward, [3.6, 0, 0], [0.78, 2.03, 1.95 - lids * 0.7], m.eyes);
      r.ell(outward, [4.18, 0, 0.04], [0.47, 1.12, 1.2 - lids * 0.66], black);
      r.dot(vadd(pupil, [-0.35, 0.64, 0.62]), white, 0, 0.63, 0.9);
      if (vdot(normal, view) > 0.26) r.eye = pupil;
    } else {
      r.ell(outward, [3.42, 0, 0], [1.13, 2.45, 2.36], m.skin);
      r.line(vadd(outer, H.v(-1.25, s * 1.56, 0.12)), vadd(outer, H.v(1.25, s * 1.56, -0.08)), dark);
    }
    r.markEye(start, s, lids < 0.84);
    sockets[r.tag] = pupil;
  }
}
type Footing = Record<string, V3>;
function feet(
  r: Rig,
  floor: F3,
  B: F3,
  H: F3,
  m: Colors,
  p: JointPose,
  step: number,
  gait: number,
  stride: number,
  sockets: Record<string, V3>,
  footing?: Footing,
) {
  for (const front of [false, true])
    for (const s of [-1, 1]) {
      const tag = (front ? 'paw' : 'foot') + (s < 0 ? 'L' : 'R');
      r.tag = tag;
      const low = p.low ?? 0;
      const strideAt = strideFoot(step, s > 0 === front ? 0 : 0.5, stride);
      const hip = B.p(front ? 7 : -7.5, s * 3.1, front ? -1 : -3);
      const fx = (front ? 10.8 : -8.9) + strideAt.forward * gait,
        fy = s * (front ? 6.9 : 6.4);
      let pad = footing ? floor.p(...footing[tag]) : floor.p(fx, fy, 1.05 + strideAt.lift * gait * 3.4);
      if (p.pivot !== undefined) {
        const phase = (p.pivot + (s > 0 === front ? 0 : 0.5)) % 1,
          u = clamp((phase - 0.5) * 2),
          delta = ((u * u * (3 - 2 * u) - phase + 0.25) * Math.PI) / 4;
        pad = floor.turn(delta).p(fx, fy, 1.05 + 2 * Math.sin(u * Math.PI));
      }
      const chin = H.p(3.1 + (p.stroke ?? 0) * 2.6, 3.37, -3.25 + (p.stroke ?? 0) * 0.73);
      if (front && s === 1) pad = vlerp(pad, chin, p.lift ?? 0);
      const joint = vadd(
        vlerp(hip, pad, 0.54),
        floor.v(front ? -4.5 : 4.4, s * (1.32 + low * 0.6), 3.0 - low * 1.3),
      );
      r.cap(hip, joint, front ? 1.93 : 2.27, 1.5, m.skin);
      r.ball(joint, 1.58, m.bars);
      r.cap(joint, pad, 1.52, 1.03, m.skin);
      r.ell(new F3(pad, floor.f, floor.s, floor.u), [0, 0, 0], [1.47, 1.02, 0.74], m.belly);
      for (const group of [-1, 1])
        for (let j = 0; j < (group > 0 ? 3 : 2); j++) {
          const split = floor.v(0.7 + j * 0.34, group * (1.15 + j * 0.22), -0.32);
          const end = vadd(pad, floor.v(1.54 + j * 0.52, group * (1.91 + 0.25 * j), -0.59)),
            knuckle = vadd(pad, split);
          r.cap(pad, knuckle, 0.56, 0.42, m.skin);
          r.cap(knuckle, end, 0.45, 0.28, m.belly);
          r.line(end, vadd(end, floor.v(0.65, -group * 0.24, -0.24)), cream);
        }
      sockets[tag] = pad;
    }
}
// Solve each authored trip on the ground plane. One diagonal pair keeps its world footholds while
// the other swings. Rest breaks finish a step; backing up and turning need no special walk sprite.
function planTrip(anim: string, length: number, yaw: number, scale: number, stride: number) {
  const samples = Array.from({ length }, (_, i) => {
    const p = poseAt(anim, i / 24);
    const floor = F3.yaw(yaw + (p.turn ?? 0), [p.x / scale, p.y / (0.6 * scale), 0]);
    const pads: Footing = {};
    for (const front of [false, true])
      for (const s of [-1, 1]) {
        const key = (front ? 'paw' : 'foot') + (s > 0 ? 'R' : 'L');
        pads[key] = floor.p(
          (front ? 10.8 : -8.9) - (front ? 5.4 * (p.peek ?? 0) : 0),
          s * (front ? 6.9 : 6.4),
          1.05,
        );
      }
    return { floor, pads, angle: p.turn ?? 0 };
  });
  const distance = [0],
    poses = samples.map(() => ({}) as Footing);
  for (let i = 1; i < length; i++) {
    const a = samples[i - 1],
      b = samples[i],
      dx = b.floor.o[0] - a.floor.o[0],
      dy = b.floor.o[1] - a.floor.o[1];
    distance.push(distance[i - 1] + (Math.hypot(dx, dy) + 8 * Math.abs(b.angle - a.angle)) * scale);
  }
  let start = 0;
  while (start < length) {
    let end = start;
    while (end + 1 < length && distance[end + 1] - distance[end] > 0.007) end++;
    const span = distance[end] - distance[start],
      pairs = Math.max(1, Math.round(span / stride));
    const at = (u: number, key: string): V3 => {
      const d = distance[start] + clamp(u) * span;
      let i = start;
      while (i < end && distance[i + 1] < d) i++;
      if (i === end) return samples[i].pads[key];
      return vlerp(
        samples[i].pads[key],
        samples[i + 1].pads[key],
        (d - distance[i]) / Math.max(0.00001, distance[i + 1] - distance[i]),
      );
    };
    for (let i = start; i <= end; i++) {
      const phase = span ? ((distance[i] - distance[start]) / span) * pairs : 0,
        F = samples[i].floor;
      for (const key of Object.keys(samples[i].pads)) {
        const second = key === 'pawL' || key === 'footR' ? 1 : 0;
        let pin = at(0, key),
          lift = 0;
        for (let step = 0; step < pairs; step++) {
          const from = step + second * 0.5,
            to = from + 0.5;
          if (phase <= from) break;
          const dst = at(step === pairs - 1 ? 1 : (to + 0.25) / pairs, key);
          if (phase >= to) {
            pin = dst;
            continue;
          }
          const u = (phase - from) * 2;
          pin = vlerp(pin, dst, u * u * (3 - 2 * u));
          lift = Math.sin(Math.PI * u) * Math.min(3.15, (span / scale) * 0.18);
          break;
        }
        const dx = pin[0] - F.o[0],
          dy = pin[1] - F.o[1];
        poses[i][key] = [dx * F.f[0] + dy * F.f[1], dx * F.s[0] + dy * F.s[1], 1.05 + lift];
      }
    }
    start = end + 1;
  }
  return { poses, distance };
}
export function chameleonFrame(card: CreatureCard): Creature['frame'] {
  const scale = card.proportions.scale,
    vertical = scale * 1.12;
  const trips = Object.fromEntries(
    Object.entries(clips)
      .filter(([, spec]) => spec.groundOffset)
      .map(([anim, spec]) => [
        anim,
        planTrip(anim, Math.round(spec.seconds * 24), card.life.yaw, scale, card.life.stride),
      ]),
  );
  const paints = Object.fromEntries(
    (['normal', 'gold'] as const).map((v) => [
      v,
      Array.from({ length: 6 }, (_, i) => palette(card, v, i / 5)),
    ]),
  );
  return (anim, t, side, variant, steer) => {
    const time = anim === 'prepare_walk' ? Math.min(t, Math.max(0, 35 / 24 - t)) : t;
    const p: JointPose = { ...poseAt(anim, time), ...steer?.techniquePose };
    const n = Math.round(t * 24),
      cycle = anim === 'idle' || anim === 'sleep' ? Math.sin((t * TAU) / 3) : 0;
    let gait = 0,
      step = 0;
    if (anim === 'walk' || anim === 'turn') {
      Object.assign(p, walkingStance);
    }
    if (anim === 'idle') {
      p.turnHead = 0.079 * cycle;
      p.sway = 0.75 * cycle;
      p.tip = 0.32 * cycle;
      p.scout = 0.52 * Math.sin((t * TAU) / 3);
      if (n >= 62 && n < 66) p.lids = Math.sin(((n - 62) * Math.PI) / 4);
    }
    if (anim === 'turn') {
      p.pivot = t * 2;
      p.turnHead = 0.065 * Math.sin(t * Math.PI);
    }
    if (anim === 'walk') {
      gait = 1;
      step = steer?.gaitPhase ?? t;
    } else if (trips[anim]) {
      const row = trips[anim].distance,
        i = Math.max(0, Math.min(row.length - 1, n));
      step = row[i] / card.life.stride;
      const lo = Math.max(0, i - 1),
        hi = Math.min(row.length - 1, i + 1);
      gait = clamp((row[hi] - row[lo]) / Math.max(1, hi - lo) / 1.05);
    }
    const sub = anim === 'turn' && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const yaw = card.life.yaw + ((side + sub) * Math.PI) / 8 + (p.turn ?? 0);
    const floor = F3.yaw(yaw),
      low = p.low ?? 0;
    const bob = gait * (0.46 - 0.46 * Math.cos(step * TAU * 2)),
      rock = gait * Math.sin(step * TAU) * 0.78;
    const B = floor
      .at(-1.15 + (p.lean ?? 0) + rock, p.weight ?? 0, 14.55 - 6.9 * low + cycle * 0.25 + bob)
      .pitch(-0.07 + 0.13 * low);
    const neck = B.p(8.7 + 5.3 * (p.peek ?? 0), 0, 6.15 - 1.9 * low + 3 * (p.peek ?? 0));
    const H = new F3(neck, floor.f, floor.s, floor.u)
      .turn(p.turnHead ?? 0)
      .pitch(-0.09 + (p.nod ?? 0) + rock * 0.033);
    const r = new Figure(),
      m = paints[variant][Math.round(clamp(p.shade ?? 0) * 5)];
    r.innerInk = hx('#354b3d');
    const sockets: Record<string, V3> = { root: B.o, belly: B.p(-0.5, 0, -6.8) };
    torso(r, B, m);
    if (p.peek) {
      r.tag = 'head';
      r.cap(B.p(6, 0, 4.4), H.o, 3.7, 3.3, m.skin);
    }
    sockets.tailTip = tail(r, B, m, p, step, gait);
    face(r, H, m, p, cycle, sockets);
    feet(r, floor, B, H, m, p, step, gait, card.life.stride / scale, sockets, trips[anim]?.poses[n]);
    const mouth = sockets.lip,
      shot = p.shot ?? 0;
    // Feed the tongue through the middle of the gape before it rises towards the falling seed.
    // Drawing the prefix of the same curve on extension and retraction keeps its base in the mouth.
    const x = (seedContact[0] - home[0] - (p.x ?? 0)) / scale,
      y = mouth[1] + 1.5;
    const z = (y * 0.6 * scale + home[1] + (p.y ?? 0) - seedContact[1]) / (0.8 * vertical);
    const target: V3 = [x, y, z];
    const forward = H.pitch(0.5 * (0.05 + 0.7 * (p.open ?? 0))).f;
    const guide = vadd(mouth, vmul(forward, 0.47 * vlen(vsub(target, mouth))));
    const onTongue = (u: number) => vlerp(vlerp(mouth, guide, u), vlerp(guide, target, u), u);
    const innerTip = vlerp(sockets.tongueRoot, mouth, clamp(((p.open ?? 0) - 0.15) * 1.15));
    const tip = shot > 0 ? onTongue(shot) : innerTip;
    sockets.tongueTip = tip;
    if ((p.open ?? 0) > 0.2) {
      r.tag = 'tongue';
      r.cap(sockets.tongueRoot, shot > 0 ? mouth : innerTip, 1, 0.78, m.tongue);
      if (shot > 0) {
        const segments = Math.max(2, Math.ceil(shot * 5));
        let previous = mouth;
        for (let i = 1; i <= segments; i++) {
          const next = onTongue((shot * i) / segments);
          r.cap(previous, next, i === 1 ? 0.78 : 0.63, i === segments ? 1.1 : 0.63, m.tongue);
          previous = next;
        }
        r.dot(vadd(tip, [0, 0.6, 0.62]), m.tongue.T[3], 0, 0.43);
      }
    }
    finishSurfaces(
      r,
      floor,
      [
        [m.skin, 'skin'],
        [m.bars, 'skin'],
        [m.belly, 'ivory'],
        [m.eyes, 'iris'],
      ],
      'skin',
    );
    scaleFigure(r, sockets, scale, vertical);
    const frame = projectFigure(r, 96, [48, 77], sockets, '#263c36', 3.6, true);
    frame.groundShadow = { radius: 15.5, opacity: 0.28 };
    if (anim === 'trick_b' && n >= 92 && n <= 109) {
      const row = Math.max(0, Math.ceil(frame.anchor[1] + 127 - home[1] - (p.y ?? 0)));
      if (row < frame.px.h) {
        frame.over = new Px(frame.px.w, frame.px.h);
        const i = row * frame.px.w * 4;
        frame.over.data.set(frame.px.data.subarray(i), i);
      }
    }
    return frame;
  };
}
