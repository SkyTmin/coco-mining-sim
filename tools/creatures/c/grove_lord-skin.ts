import { barkFlake, barkLimb, cutKnot, mossFringe, oakLeaf, shelfFungus } from '../bodies/kits/bark-moss';
import type { CreatureCard } from '../bodies/card-data';
import type { Variant } from '../types';
import { F3, Rig, SE, CE, vadd, vdot, vlerp, vmul, type V3, type Mat } from '../rig/f15-rig';
import { hx, mixc } from '../kit/f11-mobkit';
import { squirrelRig } from './grove_lord-squirrel';
import type { GroveRig } from './grove_lord-rig';
import { finishSurfaces } from './surface-work';

function grovePalette(card: CreatureCard, gold: boolean, sap: number) {
  const ramp = (name: string, ...idx: number[]): Mat => ({
    T: idx.map((i) => hx(card.materials.find((r) => r.name === name)!.tones[i])) as Mat['T'],
  });
  const lit = (source: Mat, shades: string[]): Mat =>
    sap
      ? {
          T: source.T.map((tone, i) => mixc(tone, hx(shades[i]), sap)) as Mat['T'],
        }
      : source;
  const wood = lit(gold ? ramp('heartwood', 1, 2, 4, 5) : ramp('bark', 1, 2, 4, 5), [
    '#59332d',
    '#875332',
    '#c68a43',
    '#ebbc71',
  ]);
  return {
    wood,
    deep: ramp('bark', 0, 1, 2, 3),
    edge: lit(ramp('bark', 2, 3, 5, 6), ['#6f422d', '#9c6437', '#d4a258', '#ffdc80']),
    cut: ramp('heartwood', 1, 2, 4, 5),
    moss: lit(ramp('moss', 0, 2, 3, 5), ['#3c4833', '#69783e', '#8f9b4f', '#d2d585']),
    lichen: ramp('moss', 2, 4, 5, 6),
    leaf: lit(ramp('leaf', 1, 2, 4, 5), ['#536749', '#859255', '#bdc46d', '#e1dc9a']),
    under: ramp('leaf', 0, 1, 2, 3),
    nut: ramp('heartwood', 0, 1, 3, 4),
    amber: { ...ramp('amber', 1, 3, 4, 5), glow: 0.65 },
    petal: ramp('ivory', 2, 3, 4, 5),
    ink: { T: ['#211f24', '#282229', '#30272c', '#403139'].map((color) => hx(color)) as Mat['T'] } as Mat,
  };
}
type P = ReturnType<typeof grovePalette>;
const TAU = 2 * Math.PI;
function mossBed(r: Rig, f: F3, w: number, c: P) {
  for (let i = 0; i < 4; i++) {
    const a = i * 1.91;
    r.ell(
      f,
      [0.1 + 0.4 * i, Math.sin(a) * w * 0.54, 0.7 * Math.cos(a)],
      [w * 0.34, w * (0.38 + 0.07 * (i % 2)), 1.22],
      i % 2 ? c.moss : c.lichen,
    );
  }
}
function ageSpot(r: Rig, f: F3, sz: number, c: P) {
  for (let i = 0; i < 5; i++) {
    const a = i * 2.41;
    r.ell(
      f,
      [0.16, Math.cos(a) * sz * 0.65, Math.sin(a) * sz * 0.5],
      [0.4, (0.47 + 0.25 * (i % 2)) * sz, 0.4 * sz],
      i % 2 ? c.moss : c.lichen,
    );
  }
}
function bloom(r: Rig, f: F3, size: number, c: P) {
  if (size <= 0.08) return;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    r.ell(
      f,
      [0.2, Math.sin(a) * size * 0.77, Math.cos(a) * size * 0.77],
      [0.45 * size, size * 0.66, size * 0.74],
      c.petal,
    );
  }
  r.ball(f.p(size * 0.48, 0, 0), size * 0.52, c.amber);
}
function fissures(r: Rig, f: F3, s: GroveRig, c: P) {
  for (const side of [-1, 1]) {
    const p = [
      [11.3, side * 5.5, 16],
      [12.1, side * 7.3, 11],
      [12.4, side * 6.7, 7],
      [11.9, side * 9.1, 1],
      [10.6, side * 8.7, -4],
      [9.7, side * 11, -10],
    ];
    for (let i = 1; i < p.length; i++) {
      const a = f.p(...(p[i - 1] as V3)),
        b = f.p(...(p[i] as V3));
      r.cap(a, b, 0.71, 0.47, c.deep);
      if (s.bloom > (i - 1) * 0.12) {
        const k = Math.min(1, (s.bloom - (i - 1) * 0.12) * 3.7),
          a1 = vadd(a, f.v(0.54, 0, 0)),
          b1 = vadd(vlerp(a, b, k), f.v(0.62, 0, 0));
        r.cap(a1, b1, 0.55 + 0.48 * k, 0.34 + 0.32 * k, c.amber);
        r.line(a1, b1, c.amber.T[3], 0.88, 0.57);
      }
    }
  }
}
function trunk(r: Rig, s: GroveRig, c: P) {
  const f = s.trunk;
  r.tag = 'torso';
  r.ell(f, [0, 0, 1.4], [12.5, 15.1, 23.5], c.wood);
  r.ell(f, [-1.15, 0, -12], [12.2, 15.7, 10.2], c.deep);
  r.ell(f, [-0.7, 0, 13.55], [12, 18, 11.6], c.wood);
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < 14; j++) {
      const a = (TAU * (j + 0.38 * k)) / 14,
        cs = Math.cos(a),
        sn = Math.sin(a);
      if (k === 1 && cs > 0.5 && Math.abs(sn) < 0.69) continue;
      const top = f.p((k ? 11.6 : 11.85) * cs, (k ? 15.3 : 14.5) * sn, k ? 18 : 2.5);
      const bottom = f.p(
        (k ? 12.0 : 12.45) * cs,
        (k ? 14.5 : 15.7) * sn,
        (k ? 1.3 : -15.4) + 2.45 * Math.sin(j * 1.9),
      );
      barkFlake(
        r,
        top,
        bottom,
        f.v(-2.55 * sn, 2.75 * cs, 0.4),
        f.v(1.5 * cs, 1.5 * sn, -1.15),
        c.wood,
        j % 3 ? c.edge : c.deep,
      );
    }
  r.tag = 'back';
  for (const side of [-1, 1]) {
    const points = [
      f.p(-8.5, side * 10.5, -18),
      f.p(-13, side * 5, -7),
      f.p(-12.5, side * 9, 4),
      f.p(-11, side * 11.5, 18),
    ];
    for (let i = 1; i < points.length; i++) r.cap(points[i - 1], points[i], 2.4, 1.55, c.edge);
  }
  r.tag = 'chest';
  fissures(r, f, s, c);
  if (s.bloom > 0.14) {
    for (const sign of [-1, 1]) {
      const p = [
        f.p(7.2, sign * 12.7, 16.7),
        f.p(9.0, sign * 12, 11.3),
        f.p(8.5, sign * 13.8, 6.6),
        f.p(9.1, sign * 12.7, 2.1),
        f.p(8.4, sign * 13.3, -3.8),
      ];
      for (let i = 1; i < p.length; i++) {
        const edge = f.v(-0.4, sign * 1.14, 0),
          start = p[i - 1],
          end = vlerp(start, p[i], Math.min(1, s.bloom * 1.4));
        r.cap(start, end, 0.86, 0.74, c.amber);
        barkFlake(
          r,
          vadd(start, edge),
          vadd(end, edge),
          f.v(-0.6, sign * 0.76, 0),
          f.v(1.3, sign * s.bloom * 2.3, 0.25),
          c.wood,
          c.edge,
        );
      }
    }
  }
  for (const sign of [-1, 1]) {
    r.tag = 'lichen';
    ageSpot(r, f.at(-1.7, sign * 15.6, -6).turn((sign * Math.PI) / 2), 1.7, c);
  }
  r.tag = 'shelf';
  shelfFungus(r, f.at(4.8, 13.5, -10.5).turn(0.98), 3.9, c.nut, c.cut);
  shelfFungus(r, f.at(3.4, 14.25, -13.45).turn(1.16), 2.9, c.nut, c.cut);
}
function hollow(r: Rig, s: GroveRig, c: P) {
  const h = s.trunk.at(12.15, 0.1, 2.1).turn(0.12).pitch(-0.19);
  r.tag = 'hollow';
  r.ell(h, [1.4, 0, 0.3], [1.1, 8.65, 10.8], c.ink);
  r.tag = 'hollowRim';
  const oval = (t: number) => h.p(2.15 + 0.3 * Math.cos(2 * t), 8.9 * Math.cos(t), 10.6 * Math.sin(t));
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16,
      b = ((i + 1) * TAU) / 16;
    r.cap(oval(a), oval(b), 2 + (i % 3) * 0.14, 1.96, c.wood);
    const light = (u: number) => h.p(3.85, 8.37 * Math.cos(u), 10.03 * Math.sin(u));
    r.cap(light(a + 0.02), light(b - 0.05), 0.57, 0.44, i % 3 ? c.cut : c.edge);
  }
  r.ell(h, [4.8, 0, -8.95], [4.5, 8.21, 1.48], c.cut);
  const shell = squirrelRig(
    h.at(5.45, -0.15, -6.0),
    s.pose,
    s.anim === 'idle' || s.anim === 'idle-f2' ? s.time : (s.pose.squirrelTime ?? 0),
    s.bloom,
    s.sleep,
  );
  r.prims.push(...shell.rig.prims);
  Object.assign(s.points, shell.points, { hollow: h.p(4.8, 0, -8.25) });
}
function limbs(r: Rig, s: GroveRig, c: P) {
  for (const l of s.limbs) {
    const side = l.side,
      name = side < 0 ? 'L' : 'R',
      f = l.foot,
      hand = l.hand,
      b = s.trunk;
    const ankle = f.p(-1.4, 0, 4.1);
    r.tag = 'leg' + name;
    barkLimb(r, l.hip, l.knee, 7.5, 5.7, 5, c.wood, c.edge, b.s);
    barkLimb(r, l.knee, ankle, 6.5, 6.7, 5, c.wood, c.edge, b.s);
    const cap = new F3(l.knee, b.f, b.s, b.u);
    mossBed(r, cap.at(1, 0, 5), 5.7, c);
    mossFringe(r, cap.at(4.65, 0, 3.9), 5.1, 4.1, 6, c.moss, c.lichen);
    if (side > 0) shelfFungus(r, cap.at(1.45, 4.7, 1).turn(0.8), 3.65, c.nut, c.cut);
    r.tag = 'foot' + name;
    r.ell(f, [1.2, 0, 2.75], [8, 6.7, 3.45], c.deep);
    for (let i = 0; i < 4; i++) {
      const angle = [-0.72, -0.12, 0.58, 2.92][i],
        root = f.p(-0.15, 0, 4.2),
        joint = f.p(6 * Math.cos(angle), 5.8 * Math.sin(angle), 2.4);
      const tip = f.p((i === 3 ? 8.3 : 12.3) * Math.cos(angle), (i === 3 ? 8.5 : 10) * Math.sin(angle), 0.67);
      r.cap(root, joint, 3.8, 2.55, c.wood);
      r.cap(joint, tip, 2.55, 0.68, c.edge);
      r.line(vadd(joint, f.v(0, 0, 1.72)), vadd(tip, f.v(0, 0, 0.41)), c.cut.T[2], 0, 0.45);
    }
    r.tag = 'arm' + name;
    barkLimb(r, l.shoulder, l.elbow, 6.3, 4.85, 5, c.wood, c.edge, b.f);
    barkLimb(r, l.elbow, hand.o, 5.2, 3.6, 5, c.wood, c.edge, b.f);
    const shoulder = new F3(l.shoulder, b.f, b.s, b.u);
    mossBed(r, shoulder.at(0, 0, 3.9), 6.4, c);
    mossFringe(
      r,
      shoulder.at(1.35, side * 3.8, 3.8).turn(side * 0.49),
      4.5,
      4.4,
      5,
      c.moss,
      c.lichen,
      0.67 * s.wave(0.6),
    );
    if (side < 0) {
      r.tag = 'shelf';
      const ledge = shoulder.at(0, side * 5.5, 1.1).turn(side * 0.85);
      shelfFungus(r, ledge, 4.75, c.nut, c.cut);
      shelfFungus(r, ledge.at(0.5, 0.6, -2.75), 3.2, c.nut, c.cut);
    } else {
      const stump = shoulder.at(-1.7, side, 1.4),
        end = stump.at(-0.4, side * 5.4, 10.7);
      r.cap(stump.o, end.o, 3.5, 2.6, c.wood);
      cutKnot(r, end.pitch(-1.0), 2.7, 2.2, c.deep, c.cut);
    }
    r.tag = 'hand' + name;
    r.ell(hand, [0, 0, 0], [3.6, 4.9, 4.3], c.wood);
    const open = s.pose.handOpen ?? 0;
    for (let i = 0; i < 4; i++) {
      const y = (i - 1.35) * 1.95,
        z = -2.4 + 0.5 * Math.abs(i - 1.5),
        x = 0.15 + 0.55 * i;
      const a = hand.p(x, y, z),
        b = hand.p(x + 1.35, y * (1.23 + 0.16 * open), z - 3.1),
        tip = hand.p(x + 3.45 + open * 1.6, y * (1.34 + 0.18 * open), z - 5.5 + 0.6 * Math.abs(i - 1.35));
      r.cap(a, b, 1.68, 1.12, c.wood);
      r.cap(b, tip, 1.15, 0.37, c.edge);
    }
    const spur = hand.p(-1.6, side * 3.25, 2.2);
    r.cap(spur, l.bough, 1.5, 0.61, c.edge);
    r.cap(l.bough, vadd(l.bough, b.v(-1.5, side * 1.3, -2.4)), 0.64, 0.24, c.cut);
    const seed = new F3(l.bough, b.f, b.s, b.u).roll(0.19 * s.wave(0.95));
    r.cap(seed.o, seed.p(0, side, -2.1), 0.4, 0.3, c.wood);
    r.ell(seed, [0, side, -3.4], [0.95, 1.12, 2.1], c.nut);
    ageSpot(r, hand.at(1.2, side * 3.2, 1.35).turn(side * 0.7), 1.3, c);
  }
}
function face(r: Rig, s: GroveRig, c: P) {
  const f = s.head;
  r.tag = 'face';
  r.ell(f, [0, 0, -3], [10.7, 12.7, 12.5], c.wood);
  r.ell(f, [-1.7, 0, 4.8], [9.4, 13.2, 6.3], c.wood);
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R';
    const eye = f.at(8.15, side * 6.9, 1.55).turn(side * 0.35);
    r.tag = 'eye' + suffix;
    const from = r.size,
      shut = (s.pose.blink ?? (s.sleep > 0.79 ? 1 : 0)) > 0.55;
    r.ell(eye, [0, 0, 0], [1.55, 3.55, 2.68], c.deep);
    r.ell(eye, [1.1, 0, 0.15], [0.92, 2.85, shut ? 0.22 : 1.59], c.ink);
    if (!shut) {
      r.ell(eye, [1.87, 0, 0.48], [0.62, 1.94, 1.05], c.amber);
      r.ell(eye, [2.41, 0, 0.52], [0.24, 0.47, 0.88], c.deep);
      r.dot(eye.p(2.6, side * 0.72, 1.07), c.amber.T[3], 0.86, 0.65);
    }
    r.markEye(from, side, !shut);
    if (side > 0) r.eye = eye.o;
    r.tag = 'brow' + suffix;
    const cheek = f.at(7.5, side * 8.5, -3.3).turn(side * 0.59);
    barkFlake(
      r,
      cheek.p(0, side * 2.15, 2),
      cheek.p(-1.2, side * 3.35, -4.9),
      cheek.v(0, 2.4, 0),
      cheek.v(2.2, 0, 0),
      c.wood,
      c.edge,
    );
    r.cap(f.p(9.5, side * 2.2, 3.8), f.p(6.4, side * 10.6, 5.85), 2.2, 2.9, c.edge);
    r.line(f.p(9.9, side * 2.2, 5), f.p(7.2, side * 9.4, 7.15), c.cut.T[2], 0, 0.48);
  }
  r.tag = 'nose';
  r.cap(f.p(8.7, 0, 3.45), f.p(12.1, 0, -1.1), 2.75, 2.58, c.edge);
  r.ell(f, [11.6, 0, -1.3], [2.5, 3.25, 1.75], c.wood);
  const open = s.pose.jaw ?? 0;
  r.tag = 'mouth';
  r.ell(f, [10.2, 0, -4.3], [1.45, 4.95, 1.05 + 1.8 * open], c.ink);
  r.cap(f.p(10.5, -3.35, -5.55 - open * 1.3), f.p(10.55, 3.35, -5.55 - open * 1.3), 0.73, 0.82, c.edge);
  r.tag = 'beard';
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R',
      past = s.past(side < 0 ? 0.12 : 0.18),
      sway = 0.63 * s.wave(side < 0 ? 0.9 : 1.3) + 2 * ((past['head.pitch'] ?? 0) - (s.pose['head.pitch'] ?? 0));
    const whisk = f.at(12.25, side * 4.9, -2.85).turn(side * 0.21);
    r.tag = 'beard' + suffix;
    for (let i = 0; i < 4; i++) {
      const base = whisk.p(0.3, side * (i * 1.45 - 1.75), 0.5 * Math.cos(i)),
        tip = whisk.p(2.3 + sway, side * (i * 2.15 - 0.7), -6.6 - 4.8 * Math.sin((i + 0.42) * 0.82));
      barkFlake(r, base, tip, whisk.v(0.4, 2.2, 0), whisk.v(1.6, 0, -1.8), i % 2 ? c.moss : c.lichen, c.lichen);
      r.line(vadd(base, whisk.v(1.0, 0, -0.9)), vlerp(base, tip, 0.78), c.lichen.T[2], 0, 0.45);
    }
    mossFringe(r, f.at(10.45, side * 9.35, -4.35).turn(side * 0.65), 3.4, 9.2, 5, c.moss, c.lichen, sway * 1.2);
  }
}
// A candelabrum of old oak: the major branches turn horizontally, then branch
// steeply again at their terminals. Clear air between tiers exposes the wooden fork.
function crown(r: Rig, s: GroveRig, c: P) {
  const h = s.head;
  const crown = h.at(-1.6, 0, 6.15);
  const first = r.size;
  const tuft = (f: F3, n: number, length: number, depth: number) => {
    // Each spray has a compact silvery crown above the darker lower blades.
    // The leaflets overlap the stalk, and their notched terminal edges stay clear.
    r.ell(f, [length * 0.28, 0, 0.15], [length * 0.64, depth * 1.18, depth * 0.58], c.under);
    for (let k = 0; k < n; k++) {
      const a = (k - (n - 1) / 2) * 0.91;
      const petiole = f
        .at(k * 0.46, 0, 0)
        .turn(a)
        .pitch(-0.2 + 0.16 * (k % 3));
      r.ell(
        petiole,
        [length * 0.45, 0, 0.9],
        [length * 0.45, depth * 0.83, depth * 0.54],
        k % 2 ? c.leaf : c.lichen,
      );
      const leaf = f
        .at(0.75 * k, 0, 1.75)
        .turn(a)
        .pitch(-0.22 + 0.16 * (k % 3))
        .roll(0.62 * Math.cos(k) + 0.15);
      oakLeaf(r, leaf, length * (0.84 + 0.16 * ((k + 1) % 2)), depth, c.leaf, k % 2 ? c.under : c.moss);
    }
  };
  for (const side of [-1, 1]) {
    const sx = side < 0 ? 'L' : 'R';
    const delayed = s.past(side < 0 ? 0.12 : 0.18);
    const sway =
      0.045 * s.wave(side < 0 ? 0.46 : 1.02) +
      0.13 * (s.pose.crownSway ?? 0) +
      0.16 * ((delayed.roll ?? 0) - (s.pose.roll ?? 0));
    const f = crown.roll(sway).turn(0.035 * s.wave(0.32) + 0.08 * ((delayed.twist ?? 0) - (s.pose.twist ?? 0)));
    r.tag = 'crown' + sx;
    // The low shelf bends out from the shoulder, the second rises well above it.
    for (let level = 0; level < 2; level++) {
      const path: V3[] =
        level === 0
          ? [
              [0, side * 5, -3],
              [-2, side * 13, 1],
              [-2.8, side * 19, 8],
              [-2, side * 24, 12],
              [1, side * 32, 11],
              [2, side * 38, 15],
              [4, side * (43 + (side > 0 ? 2 : 0)), 16],
            ]
          : [
              [-1.5, side * 2.8, 0],
              [-3, side * 6, 8],
              [-4, side * 10.5, 14],
              [-5, side * 11.4, 20],
              [-3.2, side * (16 + (side < 0 ? 2 : 0)), 25],
              [-2, side * 24, 27],
              [1, side * (28 + (side < 0 ? 3 : 0)), 31],
            ];
      const pts = path.map(([x, y, z], i) =>
        f.p(
          x,
          y,
          z -
            0.56 * i * s.bloom +
            (side > 0 && level === 1 ? -3 : 0) +
            0.38 * i * s.wave(0.65 + level * 0.5 + i * 0.17),
        ),
      );
      const radii = level ? [5.35, 4.75, 3.7, 3.2, 2.15, 1.45, 0.72] : [5.75, 5.2, 4.2, 3.4, 2.55, 1.55, 0.7];
      for (let i = 1; i < pts.length; i++) {
        r.cap(pts[i - 1], pts[i], radii[i - 1], radii[i], c.wood);
        const up = f.v(0.1, 0, 0.72 * radii[i - 1]);
        r.cap(vadd(pts[i - 1], up), vadd(pts[i], vmul(up, 0.83)), 0.78, 0.43, c.edge);
        if (s.bloom > 0.2 && i > 1 && i < 5) {
          const gl = f.v(1.65, 0, radii[i] * 0.78),
            from = vadd(pts[i - 1], gl),
            to = vadd(pts[i], gl);
          r.cap(from, vlerp(from, to, s.bloom), 1.12, 0.78, c.amber);
        }
      }
      for (const j of [2, 4, 6]) {
        const heel = pts[j],
          sp = j === 2 ? -side : side,
          low = j === 2;
        const tip = vadd(heel, f.v(low ? -3.9 : 3.6, sp * (low ? 4 : 5.7), low ? 6.2 : 5));
        const mid = vlerp(heel, tip, 0.46);
        r.cap(heel, mid, 1.6, 1.06, c.wood);
        r.cap(mid, tip, 1.08, 0.55, c.edge);
        const branch = new F3(tip, f.f, f.s, f.u).turn(sp * (0.98 + 0.14 * j));
        tuft(branch, j === 4 ? 3 : 4, level ? 7.1 : 8.9, level ? 4.2 : 4.6);
        if (s.bloom > 0.12) {
          r.tag = 'bloom';
          const opened = Math.min(1, s.bloom * 1.1);
          const spray = new F3(branch.p(2.2, 0.9, 4.35), h.f, h.s, h.u).pitch(-0.63);
          bloom(r, spray, 3.3 * opened, c);
          bloom(r, spray.at(0.8, 3.15, -3.4).roll(0.37), 2.45 * opened, c);
          if (j === 4) {
            const hanging = spray.at(0.5, -2.4, -1.7);
            for (let bud = 0; bud < 4; bud++)
              r.ell(
                hanging,
                [0.5, -0.35 * bud, -1.8 * bud],
                [1.0, 1.32 - 0.1 * bud, 1.4],
                bud % 2 ? c.petal : c.cut,
              );
          }
          r.tag = 'crown' + sx;
        }
      }
      if (side > 0 && !level) {
        const tip = pts[5],
          ac = new F3(tip, f.f, f.s, f.u).roll(0.32 * s.wave(1.25));
        r.cap(tip, ac.p(0.2, 0.7, -3.8), 0.46, 0.34, c.wood);
        r.ell(ac, [0.2, 0.7, -5.5], [1.65, 1.8, 2.42], c.nut);
        r.ell(ac, [0.2, 0.7, -4.25], [2.16, 2, 0.94], c.deep);
      }
    }
  }
  r.tag = 'crown';
  const top = crown.at(-3, 0, 5);
  const bend = top.p(-3, 2.25, 15.5),
    split = top.p(-4.4, -1, 21.7),
    tip = top.p(-4.5, 1.25, 30.7 - 2.6 * s.bloom + s.wave(0.8) * 0.7);
  barkLimb(r, top.o, bend, 4.75, 3.3, 3, c.wood, c.edge);
  r.cap(bend, split, 3.35, 2.25, c.wood);
  r.cap(split, tip, 2.25, 0.9, c.edge);
  const last = new F3(tip, h.f, h.s, h.u).turn(-0.9);
  tuft(last, 4, 7.15, 3.4);
  if (s.bloom > 0.12) {
    r.tag = 'bloom';
    bloom(r, new F3(last.p(2.6, 0, 3.8), h.f, h.s, h.u).pitch(-0.62), 3.6 * s.bloom, c);
  }
  // Upper support of the actual crown for this camera, including the last leaf
  // and blossom. The socket follows the same world projection as the actor.
  const up: V3 = [0, -SE, CE];
  let topPoint = tip;
  const consider = (p: V3) => {
    if (vdot(p, up) > vdot(topPoint, up)) topPoint = p;
  };
  for (const q of r.prims.slice(first)) {
    if (q.k === 0) {
      const d = q.a.map((v) => vdot(v, up)),
        length = Math.hypot(...d) || 1;
      let p = q.c;
      for (let i = 0; i < 3; i++) p = vadd(p, vmul(q.a[i], d[i] / length));
      consider(p);
    } else if (q.k === 1) {
      consider(vadd(q.a, vmul(up, q.r0)));
      consider(vadd(q.b, vmul(up, q.r1)));
    } else if (q.k === 2) q.pts.forEach(consider);
    else if (q.k === 3) consider(q.p);
    else {
      consider(q.a);
      consider(q.b);
    }
  }
  s.points.crownTop = topPoint;
}
export function drawGrove(r: Rig, s: GroveRig, card: CreatureCard, variant: Variant) {
  const c = grovePalette(card, variant === 'gold', s.bloom);
  trunk(r, s, c);
  limbs(r, s, c);
  face(r, s, c);
  crown(r, s, c);
  finishSurfaces(
    r,
    s.root,
    [
      [c.wood, 'root'],
      [c.deep, 'root'],
      [c.edge, 'root'],
      [c.cut, 'bamboo'],
      [c.moss, 'moss'],
      [c.lichen, 'moss'],
      [c.leaf, 'skin'],
      [c.under, 'skin'],
      [c.amber, 'lacquer'],
    ],
    'skin',
  );
  hollow(r, s, c);
}
