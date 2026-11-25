// A river otter can stand up without changing its anatomy: a single spine lifts the shoulders and neck
// above the hips. The tail stays low for balance and the forefeet switch between carrying and walking.
import type { CreatureCard } from '../bodies/card-data';
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { CE, F3, Rig, vadd, vdot, vlerp, vsub, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { JointPose } from '../technique';
import type { Creature, Variant } from '../types';
import { finishSurfaces } from './surface-work';
import { beats, poseAt } from './river_otter-poses';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const mat = (...hex: string[]): Mat => ({ T: hex.map(c => hx(c)) as Tones });
const ink = '#302326', mou = hx('#614140'), glint = hx('#fff4d5');
const eyeMat = mat('#120f1b', '#211c24', '#3e3234', '#635255');
const amber = mat('#4b302a', '#81523b', '#a4734e', '#d8a56c');
const earPink = mat('#543b3c', '#79534c', '#a3705e', '#c79577');
const noseMat = mat('#221b24', '#372930', '#534047', '#75615b');
const view: V3 = [0, 0.8, 0.6];
const suffix = (side: number) => side < 0 ? 'L' : 'R';

function palette(card: CreatureCard, variant: Variant) {
  const swatch = (name: string): Mat => {
    const colors = card.materials.find(m => m.name === name)!.tones;
    const ramp = [0, 1, colors.length - 2, colors.length - 1].map(i => hx(colors[i])) as Tones;
    return { T: variant === 'normal' ? ramp : ramp.map((c, i) => mixc(c, hx(['#4c3928', '#95672c', '#e7bb56', '#ffeba1'][i]), 0.78)) as Tones };
  };
  return { coat: swatch('coat'), cream: swatch('cream'), paw: swatch('paws'), stone: swatch('stone') };
}
type Palette = ReturnType<typeof palette>;

function skeleton(p: JointPose, course: number, step: number, gait: number, breathe: number, stride: number) {
  const low = Math.max(p.low ?? 0, gait * 0.94), curl = p.curl ?? 0, slide = p.glide ?? 0;
  const floor = F3.yaw(course + (p.turn ?? 0));
  const hip = floor.at(-2.5 - low * 4.4, 0, 8.4 - slide * 2.3 - curl * 1.2 + (p.jump ?? 0) - (p.dive ?? 0) * 28
    + breathe * 0.22 + gait * (0.45 - Math.cos(TAU * step * 2) * 0.45));
  const body = hip.pitch(-1.32 + low * 1.17 + slide * 0.07).roll((p.tilt ?? 0) * 0.55);
  const neck = body.p(20.5 - curl * 4, curl * 1.8, 0.45);
  const H = new F3(neck, floor.f, floor.s, floor.u).turn(0.28 * (1 - low) + (p.headTurn ?? 0))
    .pitch(-0.09 + (p.nod ?? 0) + low * 0.04).roll(p.tilt ?? 0);
  const nose = H.p(8.5, 0, -0.25), perch = H.p(8.4, 0, 1.5);
  const shoulders = [-1, 1].map(s => body.p(13.1, s * 5.0, -0.8));
  const paws = [-1, 1].map(s => {
    const closed = body.p(10.2, s * 2.65, -7.65);
    const cheek = H.p(5.3, s * (2.85 + 1.9 * (p.pawsWide ?? 0)), -3.3);
    let pos = vlerp(closed, cheek, clamp(p.pawUp ?? 0));
    pos = vadd(pos, floor.v(3.4 * (p.present ?? 0), -4.3 * (p.present ?? 0) + s * 2.1 * (p.spread ?? 0), 0));
    const pocket = p.pocket ?? 0;
    pos = vlerp(pos, body.p(9, s * 4.75, -4.9), pocket * (1 - clamp(p.pawUp ?? 0)));
    const reach = strideFoot(step, s < 0 ? 0 : 0.5, stride);
    const runPaw = floor.p(11 + reach.forward, s * 4.15, 1.65 + 3.9 * reach.lift + (p.jump ?? 0));
    pos = vlerp(pos, runPaw, gait);
    return vlerp(pos, body.p(16.9, s * 3.6, -4.2), slide);
  });
  const grip = vadd(vlerp(paws[0], paws[1], 0.5), H.v(0.9, 0, 0.7));
  const stow = body.p(9.4, 4.95, -4.8);
  const stone = vlerp(grip, stow, p.pocket ?? 0);
  const feet = [-1, 1].map(s => {
    const foot = strideFoot(step, s < 0 ? 0.5 : 0, stride);
    return floor.p(-2 - low * 6 + foot.forward * gait - slide * 1.2, s * (4.0 + 0.7 * slide),
      1.65 + Math.max(0, (p.jump ?? 0)) + foot.lift * 3.9 * gait - (p.dive ?? 0) * 28);
  });
  const tail: V3[] = [];
  for (let i = 0; i <= 11; i++) {
    const u = i / 11;
    const swing = (p.tail ?? 0) * Math.sin(u * 2.05) + gait * 0.32 * Math.sin(step * TAU - u * 3.4);
    // While asleep the tip comes round in front of the muzzle along the otter's right flank.
    // At a walking pace the last third curves up and round the flank, inside the stride's turning circle.
    const carry = (p.tailCarry ?? 0) * u * u;
    const straight = hip.p(-2.4 - 24.3 * u + 8.8 * carry,
      0.7 + 5.6 * Math.sin(u * 2.8) + swing * u * 7.3 + 5.3 * carry,
      -1.9 - 4.1 * Math.sin(u * 1.7) + 1.4 * u * u + 7.2 * carry + slide * 1.2 - 1.65 * slide * Math.max(0, p.tail ?? 0) * u * u);
    const curved = hip.p(-2.4 - Math.sin(u * 4.3) * 9.3 + u ** 2 * 10,
      0.7 + (1 - Math.cos(u * Math.PI)) * 4.8, -2.6 - 1.6 * Math.sin(u * Math.PI));
    // Brake broadside with the tip pressed into the surface. The returning hindfeet unfold behind this stroke.
    const brake = slide * clamp((p.tail ?? 0) / 1.4);
    const brakeTip = hip.p(-2.4 - 11.5 * Math.sin(Math.PI * u) + 3.8 * u * u,
      0.7 + 12.7 * u ** 1.45, -1.9 - (hip.o[2] - 2.22) * u);
    tail.push(vlerp(vlerp(straight, brakeTip, brake), curved, curl));
  }
  return { floor, hip, body, H, low, nose, perch, shoulders, paws, feet, tail, grip, stone, stow };
}
type Bones = ReturnType<typeof skeleton>;

/** Lay small clumps against an ellipsoid in its own coordinates. Their direction follows the coat as the spine rolls. */
function fur(r: Rig, F: F3, center: V3, radii: V3, rows: number, lanes: number, tones: Tones, seed: number) {
  for (let row = 0; row < rows; row++) {
    const f = -0.85 + row * 1.68 / Math.max(1, rows - 1);
    const ring = Math.sqrt(1 - f * f);
    for (let i = 0; i < lanes; i++) {
      const a = TAU * (i + 0.5 * (row % 2) + hash(i, row, seed) * 0.28) / lanes;
      const c = Math.cos(a), s = Math.sin(a);
      const at = F.p(center[0] + radii[0] * f, center[1] + radii[1] * ring * c, center[2] + radii[2] * ring * s);
      const end = vadd(at, F.v(-0.65 - hash(row, i, seed) * 0.8, 0.15 * c, 0.22 * s));
      const shade = mixc(tones[i % 4 ? 1 : 0], tones[2], 0.25 + 0.37 * hash(i, row, seed + 3) + 0.13 * s);
      r.line(at, end, shade, 0, 0.32);
    }
  }
}

function drawBody(r: Rig, g: Bones, m: Palette) {
  const { body: b } = g;
  r.tag = 'tail';
  for (let i = 1; i < g.tail.length; i++) {
    const radius = (u: number) => 0.24 + 3.55 * Math.pow(1 - u, 0.83);
    r.cap(g.tail[i - 1], g.tail[i], radius((i - 1) / 11), radius(i / 11), m.coat);
  }
  r.tag = 'body';
  r.ell(b, [7.3, 0, 0], [13.1, 6.15, 6.5], m.coat);
  fur(r, b, [7.3, 0, 0], [13.1, 6.15, 6.5], 9, 15, m.coat.T, 13);
  r.ell(b, [17, 0, 0], [6.3, 4.8, 4.95], m.coat);
  r.tag = 'bib';
  r.ell(b, [11.7, 0, -4.25], [9.1, 4.8, 2.85], m.cream);
  fur(r, b, [11.7, 0, -4.25], [9.1, 4.8, 2.85], 6, 10, m.cream.T, 74);
}

function drawFace(r: Rig, g: Bones, m: Palette, p: JointPose) {
  const h = g.H, lids = clamp(p.lids ?? 0);
  r.tag = 'head';
  r.ell(h, [0, 0, 0.6], [6.8, 7.6, 6.05], m.coat);
  fur(r, h, [0, 0, 0.6], [6.8, 7.6, 6.05], 5, 12, m.coat.T, 33);
  for (const s of [-1, 1]) {
    const ear = h.at(-2.85, s * 6.25, 3.45 - (p.ears ?? 0) * 1.4).turn(s * 0.36);
    r.tag = 'ears';
    r.ell(ear, [0, 0, 0], [1.7, 2.1, 2.3], m.coat);
    r.ell(ear, [1.18, s * 0.44, 0.05], [0.75, 1.35, 1.45], earPink);
    r.tag = 'mask';
    const eye = h.at(3.75, s * 5.05, 2.35).turn(s * 0.73);
    r.ell(eye, [0, 0, 0], [1.5, 2.03, 2.24], amber);
    r.tag = 'eye' + suffix(s);
    const start = r.prims.length;
    if (lids < 0.9) {
      r.ell(eye, [0.92, 0, 0.12 - 0.38 * lids], [1.35, 1.65, 1.75 * (1 - 0.78 * lids)], eyeMat);
      if (vdot(eye.f, view) > 0.1 && lids < 0.6) {
        const front = vadd(eye.p(0.98, 0, 0.1), [0, 1.25, 0.95]);
        r.dot(vadd(front, [-0.42, 0, 0.53]), glint, 0, 0.79, 0.85);
        r.dot(vadd(front, [0.45, 0, -0.36]), hx('#b68f72'), 0, 0.44, 0.7);
      }
      if (s > 0) r.eye = eye.p(2, 0, 0.35);
    } else {
      r.ell(eye, [0.96, 0, 0.3], [1.29, 1.82, 1.87], m.coat);
      if (vdot(eye.f, view) > 0) r.line(eye.p(2.19, -1.45, -0.06), eye.p(2.19, 1.35, 0.15), inkColor);
    }
    r.markEye(start, s, lids < 0.9);
    r.tag = 'head';
    r.line(h.p(3.05, s * 4.82, 4.52), h.p(4.25, s * 3.86, 4.86), m.cream.T[2]);
  }
  r.tag = 'muzzle';
  r.ell(h, [4.6, 0, -2.4], [4.2, 4.45, 2.25], m.cream);
  for (const s of [-1, 1]) {
    r.ell(h, [5.45, s * 2.45, -1.05], [3.15, 3.38, 2.25], m.cream);
    for (let i = 0; i < 7; i++) {
      const k = (i % 3) / 2;
      r.dot(h.p(7.37 - 0.47 * (i % 3), s * (3.48 + k * 1.32), -0.77 - Math.floor(i / 3) * 0.55), mou, 0, 0.52);
    }
    r.line(h.p(8.15, s * 0.12, -2.23), h.p(7.7, s * 2.3, -2.74), mou);
  }
  r.tag = 'nose';
  r.ell(h, [7.58, 0, -0.03], [1.67, 2.54, 1.31], noseMat);
  r.line(h.p(8.65, -0.94, 0.63), h.p(8.45, 0.1, 0.92), hx('#c1a399'), 0, 0.6);
  for (const s of [-1, 1]) r.dot(h.p(8.95, s * 1.26, -0.14), inkColor, 0, 0.55);
  r.line(h.p(8.35, 0, -1.05), h.p(8.14, 0, -2.22), mou);
  r.tag = 'whiskers';
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const f = p.whisk ?? 0;
    const a = h.p(5.9 + i * 0.23, s * 4, -0.48 - i * 0.43);
    const b = h.p(6.8 + i * 0.54, s * (6.05 + i * 0.23), 0.18 - i * 0.91 + f * 0.44);
    const c = h.p(6.7 + i * 1.03, s * (8.35 + (i % 3) * 0.8), 0.33 - i * 1.42 + f * (1.5 - i * 0.37));
    r.line(a, b, hx('#866758'), 0, 0.45);
    r.line(b, c, i % 2 ? hx('#d8bd93') : hx('#f0d9b5'), 0, 0.44);
  }
}
const inkColor = hx('#34242a');

function drawLimbs(r: Rig, g: Bones, m: Palette) {
  for (const [index, s] of [-1, 1].entries()) {
    r.tag = 'foot' + suffix(s);
    const ankle = g.feet[index], ankleF = new F3(ankle, g.floor.f, g.floor.s, g.floor.u);
    const hip = g.hip.p(0.35, s * 4.4, 0.15);
    r.ell(g.hip, [0.2, s * 3.85, 0.45], [4.65, 3.0, 4.15], m.coat);
    r.cap(hip, ankle, 2.85, 1.43, m.coat);
    r.ell(ankleF, [1.3, 0, 0], [3.35, 2.12, 1.26], m.paw);
    for (let j = -2; j <= 2; j++) {
      const toe = 3.45 - Math.abs(j) * 0.38;
      r.ell(ankleF, [toe, j * 0.81, -0.09], [1.28, 0.67, 0.65], m.paw);
      r.dot(ankleF.p(toe + 0.95, j * 0.81, 0.08), m.paw.T[3], 0, 0.46);
    }
    r.tag = 'paw' + suffix(s);
    const shoulder = g.shoulders[index], paw = g.paws[index];
    const elbow = vadd(vlerp(shoulder, paw, 0.49), g.body.v(-1.8, s * 1.05, 0.4));
    r.cap(shoulder, elbow, 2.62, 2, m.coat);
    r.cap(elbow, paw, 1.96, 1.3, m.paw);
    const palm = new F3(paw, g.floor.f, g.floor.s, g.floor.u);
    r.ell(palm, [0, 0, 0], [2.03, 1.57, 1.36], m.paw);
    for (let j = -1.5; j <= 1.5; j++) {
      r.ell(palm, [1.08 + (1 - Math.abs(j)) * 0.2, j * 0.65, 0.05], [1.12, 0.51, 0.61], m.paw);
      r.dot(palm.p(1.98, j * 0.65, 0.22), m.paw.T[3], 0, 0.42);
    }
  }
}

function stonePosition(g: Bones, anim: string, t: number, course: number, scale: number, stride: number, pose: JointPose) {
  if (anim !== 'trick') return g.stone;
  const f = t * 24, { throw: start, noseCatch, noseThrow, pawCatch } = beats.trick;
  if (f >= noseCatch && f <= noseThrow) return g.perch;
  if (f <= start || f >= pawCatch) return g.stone;
  const outbound = f < noseCatch;
  const a = outbound ? start : noseThrow, b = outbound ? noseCatch : pawCatch;
  const origin = (p: JointPose): V3 => [(p.x ?? 0) / scale, 0, -(p.y ?? 0) / (scale * CE)];
  const endpoint = (frame: number, which: 'grip' | 'perch') => {
    const p = poseAt(anim, frame / 24);
    return vadd(skeleton(p, course, frame / 24, p.run ?? 0, 0, stride)[which], origin(p));
  };
  const u = (f - a) / (b - a);
  const pos = vsub(vlerp(endpoint(a, outbound ? 'grip' : 'perch'), endpoint(b, outbound ? 'perch' : 'grip'), u), origin(pose));
  pos[2] += (outbound ? 12.5 : 10) * 4 * u * (1 - u);
  return pos;
}

export function otterFrame(card: CreatureCard): Creature['frame'] {
  const palettes = { normal: palette(card, 'normal'), gold: palette(card, 'gold') };
  const scale = card.proportions.scale, stride = card.life.stride / scale;
  return (anim, t, side, variant, steer) => {
    const p = { ...poseAt(anim, t), ...steer?.techniquePose };
    const walking = anim === 'walk', gait = walking ? 1 : (p.run ?? 0);
    const step = walking ? (steer?.gaitPhase ?? t) : t * 2.5;
    const cycle = (anim === 'idle' || anim === 'sleep') ? Math.sin(t * TAU / 3) : 0;
    if (anim === 'idle') {
      p.headTurn = cycle * 0.12; p.whisk = cycle * 0.23; p.tail = cycle * 0.16;
      if (t > 2.54 && t < 2.71) p.lids = Math.sin((t - 2.54) * Math.PI / 0.17);
    }
    if (anim === 'turn') p.tailCarry = clamp(Math.min(t, 4 - t) * 6);
    if (walking) {
      p.pocket = 1;
      p.tailCarry = 1;
      p.headTurn = Math.max(-0.42, Math.min(0.42, ((((steer?.headSide ?? side) - side + 24) % 16) - 8) * Math.PI / 8));
    }
    const sub = anim === 'turn' && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const course = card.life.yaw + (side + sub) * Math.PI / 8;
    const g = skeleton(p, course, step, gait, cycle, walking ? stride : stride * 2.65), m = palettes[variant];
    const pebble = stonePosition(g, anim, t, course, scale, stride, p);
    const sockets: Record<string, V3> = { head: g.H.o, nose: g.nose, perch: g.perch, stone: pebble, grip: g.grip,
      pawL: g.paws[0], pawR: g.paws[1], footL: g.feet[0], footR: g.feet[1], tailTip: g.tail.at(-1)!,
      tailBase: g.tail[0], surfaceHead: [g.H.o[0], g.H.o[1], 0], chest: g.body.p(14, 0, -4), belly: g.body.p(6.4, 0, -5.7), root: g.hip.o };
    const r = new Rig();
    if (!steer?.pointsOnly) {
      drawBody(r, g, m);
      drawLimbs(r, g, m);
      drawFace(r, g, m, p);
      finishSurfaces(r, g.floor, [[m.coat, 'fur'], [m.cream, 'fur'], [m.paw, 'skin']], 'skin');
      r.tag = 'pebble';
      const flight = anim === 'trick' ? (Math.max(0, Math.min(1, (t * 24 - beats.trick.throw) / (beats.trick.noseCatch - beats.trick.throw)))
        + Math.max(0, Math.min(1, (t * 24 - beats.trick.noseThrow) / (beats.trick.pawCatch - beats.trick.noseThrow)))) * TAU : 0;
      const stone = new F3(pebble, g.H.f, g.H.s, g.H.u).roll((p.rollStone ?? 0) + flight);
      r.ell(stone, [0, 0, 0], [2.1, 2.85, 1.45], { ...m.stone, pat: ([x, y, z]) =>
        Math.abs(y + x * 0.52 + Math.sin(z * 3) * 0.16) < 0.17 ? m.cream.T[3] : z < -0.18 ? m.stone.T[1] : null });
    }
    scaleFigure(r, sockets, scale);
    if (p.dive) r.clipZ = 0;
    const frame = projectFigure(r, 96, [48, 77], sockets, ink, 3.6, true);
    frame.dx = Math.round(p.x ?? 0); frame.dy = Math.round(p.y ?? 0);
    frame.sx = frame.sy = 1 + (p.zoom ?? 0);
    frame.groundShadow = { radius: 14 + 5 * g.low, opacity: Math.max(0.12, 0.75 - (p.jump ?? 0) * 0.07 - (p.dive ?? 0) * 0.65) };
    if (anim === 'trick_b' && t * 24 >= beats.trick_b.skim && t * 24 <= beats.trick_b.recover) {
      // The same raster crosses the wooden rail, including the carried stone and the tail.
      frame.over = frame.px; frame.px = new Px(frame.px.w, frame.px.h);
    }
    return frame;
  };
}
