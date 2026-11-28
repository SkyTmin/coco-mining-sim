import { jointFrame, type ArachnidSkeleton, type ArachnidLeg, type Chela } from '../bodies/arachnid';
import { goalAt } from '../bodies/goals';
import type { CreatureCard } from '../bodies/card-data';
import { cutStone, embossedScute, goldGlyph, stripedLinen } from '../bodies/kits/chitin-linen';
import { engraving } from '../bodies/kits/tailoring';
import { F3, Rig, vadd, vsub, vmul, vlen, vlerp, type V3, type Mat } from '../rig/f15-rig';
import { hx, TAU, mixc } from '../kit/f11-mobkit';
import { finishSurfaces } from './surface-work';
import type { Variant } from '../types';
function colors(card: CreatureCard, gold: boolean) {
  const mat = (name: string, indices = [0, 2, 4, 5]): Mat => ({
    T: indices.map((i) => hx(card.materials.find((m) => m.name === name)!.tones[i])) as Mat['T'],
  });
  return {
    gold: mat('gold'),
    bronze: mat(gold ? 'gold' : 'bronze'),
    dark: mat('bronze', [0, 1, 2, 3]),
    trim: mat('gold', [2, 3, 4, 5]),
    blue: mat('lapis'),
    navy: mat('lapis', [0, 0, 1, 2]),
    black: mat('obsidian'),
    red: mat('carnelian'),
    aqua: mat('glass'),
    ice: mat('glass', [2, 3, 4, 5]),
  };
}
type C = ReturnType<typeof colors>;
const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
function limb(r: Rig, l: ArachnidLeg, c: C) {
  r.tag = 'leg' + (l.sign < 0 ? 'L' : 'R') + l.row;
  const build = (a: V3, b: V3, wide: number) => {
    const axis = jointFrame(a, b),
      len = vlen(vsub(b, a));
    r.cap(a, b, wide * 0.82, wide * 0.63, c.navy);
    r.cap(axis.p(len * 0.14, 0, 0), axis.p(len * 0.78, 0, 0), wide, wide * 0.72, c.bronze);
    for (const t of [0.19, 0.68, 0.78])
      r.cap(
        axis.p(len * t, 0, 0),
        axis.p(len * t + 0.35, 0, 0),
        wide * (1.08 - t * 0.4),
        wide * (1.06 - t * 0.4),
        c.trim,
      );
    const ridge = axis.p(len * 0.39, 0, wide * 0.89);
    r.poly(
      [
        axis.p(len * 0.18, -wide * 0.66, wide * 0.63),
        ridge,
        axis.p(len * 0.74, 0, wide * 0.64),
        axis.p(len * 0.21, wide * 0.65, wide * 0.63),
      ],
      c.gold,
    );
  };
  build(l.hip, l.knee, 2.55);
  build(l.knee, l.ankle, 2.25);
  const knee = jointFrame(l.knee, l.ankle);
  r.ell(knee, [0, 0, 0], [2.55, 2.8, 2.75], c.bronze);
  r.ell(knee, [0, l.sign * 2.2, 0.35], [1.25, 0.85, 1.25], c.blue);
  r.cap(l.ankle, l.toe, 1.5, 0.22, c.black);
}
function pincer(r: Rig, p: Chela, c: C) {
  const suffix = p.sign < 0 ? 'L' : 'R',
    f = p.palm;
  r.tag = 'palm' + suffix;
  r.cap(p.shoulder, p.elbow, 4.1, 3, c.navy);
  r.cap(p.elbow, f.o, 3.5, 4.7, c.bronze);
  for (const [a, b] of [
    [p.shoulder, p.elbow],
    [p.elbow, f.o],
  ]) {
    const g = jointFrame(a, b),
      len = vlen(vsub(b, a));
    r.cap(g.p(len * 0.24, 0, 0), g.p(len * 0.66, 0, 0), 3.85, 3.35, c.gold);
    for (const t of [0.24, 0.65]) r.cap(g.p(len * t, 0, 0), g.p(len * t + 0.6, 0, 0), 3.96, 3.74, c.trim);
  }
  r.ell(f, [1.1, 0, 0], [8.4, 6.4, 4.85], c.bronze);
  embossedScute(r, f.at(1, 0, 4), 7.2, 5.3, 0.96, c.gold, c.bronze, c.trim);
  goldGlyph(r, f.at(0.9, 0, 5.1), 2.85, 2, c.dark);
  r.ell(f, [-4.6, p.sign * 3, 1], [1.36, 1.36, 1.2], c.blue);
  r.tag = p.name;
  // Two jaws wrap around an opening; each tapers through a separate cutting ridge.
  const fixed = [
    f.p(3.5, p.sign * 4.2, 0),
    f.p(9.1, p.sign * 5.3, -0.25),
    f.p(15.1, p.sign * 3.4, -0.85),
    p.fixed,
  ];
  const mobile = [
    f.p(3.5, -p.sign * 3.7, 0.2),
    f.p(8.7, -p.sign * (4.8 + 4.4 * p.open), 0.5),
    f.p(13.7, -p.sign * (5 + 6.3 * p.open), 0.78),
    p.finger,
  ];
  for (const [k, row] of [fixed, mobile].entries()) {
    for (let j = 0; j < 3; j++)
      r.cap(row[j], row[j + 1], [3.1, 2.9, 1.85][j], [2.9, 1.85, 0.25][j], j === 0 ? c.bronze : c.black);
    for (let j = 0; j < 2; j++) {
      const at = vlerp(row[1], row[2], 0.22 + j * 0.52);
      r.cap(at, vadd(at, f.v(0.9, (k === 0 ? -1 : 1) * p.sign * 1.6, 0.1)), 0.75, 0.16, c.trim);
    }
    r.line(vadd(row[1], f.v(0, 0, 1.65)), vadd(row[2], f.v(0, 0, 0.87)), c.black.T[3], 0, 0.28);
  }
}
function thorax(r: Rig, s: ArachnidSkeleton, c: C) {
  const b = s.body;
  r.tag = 'body';
  r.ell(b, [-5, 0, 0], [19.4, 12.8, 8.6], c.dark);
  for (let j = 0; j < 5; j++) {
    const f = -17 + j * 7.1,
      w = [8.7, 11.8, 13.1, 12.5, 9.8][j];
    r.ell(b, [f, 0, -0.15], [4.94, w, 7.8], j % 2 ? c.dark : c.bronze);
    for (const sign of [-1, 1]) {
      const angle = (s.pose.plateOpen ?? s.phase) * 1.11;
      const stagger = (0.15 * (j + (sign > 0 ? 0.5 : 0))) / 5;
      const opened = smooth((angle - stagger) / (1 - stagger));
      const plate = b.at(f, sign * 2, 9.1).roll(sign * (0.48 - opened * 1.64));
      const panel = plate.at(0, sign * 4.8, 0);
      r.tag = 'plates' + (sign < 0 ? 'L' : 'R');
      embossedScute(r, panel, 4.5, w * 0.58, 1.62, c.gold, c.bronze, c.trim);
      goldGlyph(r, panel.at(0.2, 0, 1.7), 2.45, j, c.bronze);
      // Enamel and a large directional glyph occupy the underside; at rest
      // it faces into the chitin. Opening exposes the painted plate to the light.
      const back = panel.at(0, 0, -0.34).roll(Math.PI);
      const glyphMetal = { ...c.ice, glow: opened * 0.78 };
      r.poly(
        [
          back.p(-3.5, -w * 0.45, 0),
          back.p(2.25, -w * 0.47, 0),
          back.p(3.5, -w * 0.14, 0),
          back.p(2.4, w * 0.43, 0),
          back.p(-2.8, w * 0.44, 0),
        ],
        c.blue,
      );
      goldGlyph(r, back.at(0, 0.2, 0.25), 3.6, j + 1, glyphMetal, opened * 0.82);
      if (opened > 0.02) {
        const floor = b.at(f, sign * 6.9, 7.65).roll(sign * 0.21);
        r.ell(floor, [0, 0, 0], [3.7, 4.0, 0.64], c.navy);
        goldGlyph(r, floor.at(0, 0, 0.76), 3.65, j + 1, glyphMetal, opened * 0.75);
      }
      s.points['plate' + (sign < 0 ? 'L' : 'R') + j] = panel.p(0, sign * w * 0.58, 0);
      r.tag = 'body';
    }
  }
  const crest = b.at(-3, 0, 11.4);
  embossedScute(r, crest, 9.5, 3.25, 0.95, c.bronze, c.dark, c.trim);
  goldGlyph(r, crest.at(0, 0, 1.05), 3, 0, c.trim);
}
function tail(r: Rig, s: ArachnidSkeleton, c: C) {
  for (let i = 0; i < s.tail.length - 2; i++) {
    const a = s.tail[i],
      b = s.tail[i + 1],
      f = jointFrame(a, b),
      len = vlen(vsub(b, a)),
      w = 6.5 - i * 0.42;
    r.tag = 'tail' + i;
    r.ell(f, [0, 0, 0], [2.85, w * 0.76, w * 0.81], c.navy);
    r.cap(f.p(len * 0.11, 0, 0), f.p(len * 0.82, 0, 0), w * 0.9, w * 0.77, c.bronze);
    for (const sign of [-1, 1]) {
      const face = f.at(len * 0.48, sign * w * 0.65, 0.7).roll(-sign * 0.96);
      embossedScute(r, face, len * 0.39, w * 0.67, 1.65, c.gold, c.bronze, c.trim);
      goldGlyph(r, face.at(0, 0, 1.78), Math.min(2.55, w * 0.46), i + 1, c.dark);
    }
    r.cap(f.p(len * 0.16, 0, 0), f.p(len * 0.19, 0, 0), w * 0.96, w * 0.94, c.trim);
    r.ell(f, [len * 0.78, 0, 0], [1.65, w * 0.8, w * 0.83], c.gold);
  }
  const a = s.tail.at(-2)!,
    b = s.tail.at(-1)!,
    f = jointFrame(a, b),
    len = vlen(vsub(b, a));
  r.tag = 'sting';
  r.cap(a, f.p(len * 0.14, 0, 0), 3.5, 3.8, c.gold);
  const g = f.at(len * 0.11, 0, 0),
    glow = Math.min(1, 0.22 + (s.pose.stingGlow ?? s.phase) * 0.72);
  const charge = Math.max(0, Math.min(1, s.pose.stingGlow ?? s.phase));
  const cut = (unlit: string[], lit: string[]): Mat => ({
    T: unlit.map((tone, i) => mixc(hx(tone), hx(lit[i]), charge)) as Mat['T'],
    glow,
  });
  const glass = cut(
    ['#155e72', '#1b8993', '#28abae', '#5bcfc2'],
    ['#308794', '#47c9ca', '#8df4de', '#d4ffed'],
  );
  const shine = cut(
    ['#198799', '#31a9ae', '#63d1c2', '#90ebe1'],
    ['#70d6d3', '#acf4e9', '#d8fff1', '#f0fff2'],
  );
  cutStone(r, g, len * 0.89, 6.15, glass, { ...c.blue, glow: glow * 0.35 }, shine);
  if (s.phase > 0.05) {
    const waist = g.p(len * 0.89 * 0.24, 6.15, 0);
    r.dot(waist, c.ice.T[3], glow, 1.25);
    const line = vlerp(waist, b, 0.72);
    r.line(waist, line, c.ice.T[3], glow, 0.85);
  }
  s.points.stingRoot = a;
}
function head(r: Rig, s: ArachnidSkeleton, c: C) {
  const h = s.head;
  r.tag = 'head';
  r.ell(h, [0, 0, -0.2], [10.6, 11, 7.7], c.bronze);
  embossedScute(r, h.at(0.9, 0, 5.8), 8.4, 8.6, 1.1, c.gold, c.bronze, c.trim);
  for (const sign of [-1, 1]) {
    const e = h.at(8.4, sign * 6.6, 2.0).turn(sign * 0.5);
    r.tag = 'eye' + (sign < 0 ? 'L' : 'R');
    const first = r.size;
    r.ell(e, [0, 0, 0], [2.9, 2.95, 3.0], c.dark);
    if (!s.life.blink) {
      r.ell(e, [1.4, 0, 0.12], [2.68, 2.85, 2.9], c.trim);
      r.ell(e, [3.1, 0, 0.1], [1.1, 1.29, 1.98], c.black);
      r.dot(e.p(4.25, -0.55, 1.05), c.trim.T[3], 0.15, 1.22);
      if (sign > 0) r.eye = e.p(3.5, 0, 1);
    } else r.cap(e.p(2.8, -1.8, 0), e.p(2.8, 1.8, 0.25), 0.42, 0.42, c.black);
    r.markEye(first, sign, !s.life.blink);
    r.tag = 'head';
    r.cap(e.p(0.6, -sign * 2.5, 2.18), e.p(-0.7, sign * 2.2, 2.87), 0.7, 1.1, c.gold);
    const jaw = [h.p(8, sign * 3.5, -1.4), h.p(11.2, sign * 4.8, -3.2), h.p(12.7, sign * 3.1, -5.2)];
    r.cap(jaw[0], jaw[1], 1.75, 1.4, c.gold);
    r.cap(jaw[1], jaw[2], 1.4, 0.25, c.black);
  }
  s.points.mouth = h.p(11.1, 0, -3.3);
}
function scarf(r: Rig, s: ArachnidSkeleton, c: C) {
  const wave = s.pose.scarfWind ?? 0,
    phase = s.phase;
  // The wind lifts the entire headcloth into open air, then carries it away
  // into the far gallery. The folds contract with distance before the last stitch vanishes.
  const release = smooth((phase - 0.13) / 0.62),
    drop = smooth((phase - 0.65) / 0.35);
  const h = s.head
    .at(-release * 12 - drop * 27, -release * 52 - drop * 8, release * 28 - drop * 21 + wave * 2)
    .pitch(-release * 0.55 + drop * 1.03)
    .roll(-release * 0.36)
    .scale(1 - 0.98 * drop);
  if (phase >= 0.999) {
    s.points.scarf = h.o;
    return;
  }
  const fold = 1 - 0.55 * drop;
  const top = (u: number, v: number) => {
    const a = (u - 0.5) * 2.5;
    return h.p(
      -7 + 13.2 * v,
      fold * Math.sin(a) * (11.6 + v * 0.2),
      0.3 + 8.9 * Math.cos(a) + 0.8 * Math.sin(v * Math.PI),
    );
  };
  r.tag = 'scarf';
  stripedLinen(r, top, 7, c.gold, c.navy, c.trim);
  for (const sign of [-1, 1]) {
    r.tag = 'scarf' + (sign < 0 ? 'L' : 'R');
    const lag = Math.sin(s.cycle - (sign < 0 ? 0.52 : 1.08)) * 0.62 + wave * (sign < 0 ? 3.9 : 2.9);
    const strip = (u: number, v: number) => {
      const crease = Math.sin(u * Math.PI * 3) * v * 0.55;
      return h.p(
        -6.7 + 15.6 * u - 4.1 * v + lag * v * v,
        sign * (11.55 + 4.65 * v + Math.sin(Math.PI * v) * 3.1 + crease) * fold,
        4.9 - 14.4 * v + 2.5 * u * v + lag * 0.4 * v * v,
      );
    };
    stripedLinen(r, strip, 5, c.navy, c.gold, c.trim);
    for (let j = 0; j < 4; j++) {
      const a = strip(0.13 + j * 0.25, 1);
      r.cap(a, vadd(a, h.v(-0.5, sign * 0.5, -1.45)), 0.42, 0.25, c.trim);
    }
    s.points['scarf' + (sign < 0 ? 'L' : 'R')] = strip(0.55, 1);
  }
  s.points.scarf = h.o;
}
function mirror(r: Rig, s: ArachnidSkeleton, c: C) {
  const seat = s.head.p(7.3, 0, 7.5);
  const axes = s.head
    .turn(s.pose.diskYaw ?? 0)
    .pitch(-0.18 + (s.pose.diskPitch ?? 0))
    .roll(s.pose.diskSpin ?? 0);
  const rim: V3 = [0.61, 0, -4.5];
  const hand = vsub(s.points.clawR, axes.v(...rim));
  const held = vlerp(seat, hand, s.pose.diskHand ?? 0);
  const free = goalAt(s.pose, 'diskFree'),
    position = free ? vlerp(held, s.face.p(...free), s.pose.diskLoose ?? 0) : held;
  const f = new F3(position, axes.f, axes.s, axes.u);
  r.tag = 'disk';
  r.ell(f, [0, 0, 0], [1.1, 4.4, 4.8], c.bronze);
  r.ell(f, [0.63, 0, 0], [0.9, 3.86, 4.24], c.trim);
  const p = (a: number) => f.p(0.61, 4.12 * Math.cos(a), 4.5 * Math.sin(a));
  for (let i = 0; i < 12; i++) r.cap(p((i * TAU) / 12), p(((i + 1) * TAU) / 12), 0.33, 0.33, c.gold);
  r.ell(f, [1.25, 0, 0.1], [0.86, 1.7, 2.38], c.red);
  r.ell(f, [1.18, 0, 2.07], [0.55, 0.92, 0.74], c.dark);
  r.line(f.p(2.11, 0, -1.9), f.p(2.1, 0, 1.4), c.red.T[1], 0, 0.3);
  for (const sign of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const start = f.p(1.5, sign * 1.32, 1.24 - i * 0.89);
      r.line(start, f.p(1.26, sign * 2.7, 1.52 - i * 1.19), c.dark.T[1], 0, 0.4);
    }
  s.points.diskSeat = seat;
  s.points.diskRim = f.p(...rim);
  s.points.diskFace = f.p(2.0, 0, 0.1);
  s.points.disk = position;
}
export function drawAnkhar(r: Rig, s: ArachnidSkeleton, card: CreatureCard, variant: Variant) {
  const c = colors(card, variant === 'gold');
  s.legs.forEach((l) => limb(r, l, c));
  thorax(r, s, c);
  tail(r, s, c);
  s.claws.forEach((p) => pincer(r, p, c));
  head(r, s, c);
  scarf(r, s, c);
  mirror(r, s, c);
  finishSurfaces(
    r,
    s.body,
    [
      [c.gold, 'lacquer'],
      [c.bronze, 'shell'],
      [c.trim, 'lacquer'],
      [c.navy, 'brocade'],
      [c.blue, 'shell'],
      [c.black, 'ivory'],
      [c.aqua, 'ice'],
    ],
    'lacquer',
  );
}
