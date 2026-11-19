import { birdSkeleton, type BirdPose, type BirdPoseSource, type BirdSkeleton } from '../bodies/winged-bird';
import { F3, Rig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import { hx } from '../kit/f11-mobkit';
import type { BodyFrame, Creature, Variant, XY } from '../types';

export interface PhoenixPose extends BirdPose {
  phase?: number;
  glow?: number;
  eye?: number;
  beak?: number;
  size?: number;
  hidden?: boolean;
  over?: boolean;
  /** x/y from portrait ground origin, then turn, scale and opacity. */
  overFeather?: [number, number, number, number, number];
}
type BirdMotion = { headSide: number; gaitPhase: number };
type Mineral = 'jade' | 'sea' | 'violet' | 'slate' | 'amber' | 'ice' | 'coal';
type Palette = Record<Mineral, Mat>;
const anchor: XY = [80, 137];
const size = 160;
const TAU = Math.PI * 2;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const color = (a: RGBA, b: RGBA, t: number): RGBA => [
  Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t), 255,
];

const minerals: Record<Mineral, [string[], string[], number]> = {
  jade: [['#102129', '#185653', '#36977d', '#87deb2'], ['#2b111a', '#813026', '#e86935', '#ffd084'], 0.13],
  sea: [['#102635', '#1b585f', '#31a89b', '#a0ead5'], ['#30131d', '#a43c2c', '#f78236', '#ffdea3'], 0.19],
  violet: [['#1c203d', '#514573', '#8877b3', '#cabbf0'], ['#29121e', '#7c2333', '#ce4743', '#ffac70'], 0.14],
  slate: [['#121b2d', '#30465b', '#567685', '#8ca9b6'], ['#27131e', '#652b36', '#b35944', '#eab18d'], 0.09],
  amber: [['#312030', '#845649', '#cf8b46', '#ffe2a3'], ['#371b22', '#b05531', '#ff9b43', '#fff0b0'], 0.34],
  ice: [['#182834', '#508f96', '#93c9c5', '#e4f8ed'], ['#361a21', '#b86739', '#ffa957', '#fff5cb'], 0.49],
  coal: [['#11151f', '#263447', '#415c64', '#667e7f'], ['#211318', '#4f2432', '#944638', '#c97149'], 0.02],
};
function phoenixPalette(phase: number, heat: number, variant: Variant): Palette {
  return Object.fromEntries(Object.entries(minerals).map(([name, [cold, hot, lit]]) => {
    const hint = variant === 'gold' ? 0.28 : 0;
    const T = cold.map((hex, i) => color(hx(hex), hx(hot[i]), phase + (1 - phase) * hint)) as Mat['T'];
    const glow = phase * (lit + heat * 0.16) + (name === 'amber' ? (1 - phase) * 0.12 : 0);
    return [name, { T, glow }];
  })) as Palette;
}
const tinted = (m: Mat, bias: number): Mat => ({ ...m, bias });
const flat = (m: Mat, tone: number, glow = m.glow): Mat => ({ ...m, flat: tone, glow });
const refracted = new WeakMap<Mat, Mat[]>();
// Light from the face of each cut picks up either the glaze next to it or the
// cool interior. Keep these as flat color steps within the individual facets.
function refract(m: Mat, ray: number): Mat {
  let rays = refracted.get(m);
  if (!rays) {
    rays = [[10, 17, 13], [-9, -10, 9], [16, 5, -9], [-4, 9, 15]].map(([r, g, b]) => ({
      ...m,
      T: m.T.map(([R, G, B]) => [
        Math.max(0, Math.min(255, R + r)), Math.max(0, Math.min(255, G + g)),
        Math.max(0, Math.min(255, B + b)), 255,
      ]) as Mat['T'],
    }));
    refracted.set(m, rays);
  }
  return rays[ray];
}

interface Cut {
  width: number;
  depth?: number;
  grain?: number;
  accent?: Mat;
  etched?: boolean;
}
function blade(r: Rig, root: V3, tip: V3, across: V3, m: Mat, cut: Cut) {
  const d = vnorm(vsub(tip, root));
  const w = vnorm(vsub(across, vmul(d, vdot(d, across))));
  const n = vnorm(vcross(d, w));
  const h = cut.depth ?? cut.width * 0.29;
  const grain = cut.grain ?? 0.5;
  const accent = cut.accent ?? m;
  const edge = tinted(m, -0.18);
  const needle = cut.width < 1.4;
  const joins = [0, 0.29 + 0.13 * grain, 0.65 + 0.11 * grain, 1];
  const spans = [0.31, 1, 0.61, 0.025];
  const peak = [0.34, 1, 0.57, 0];
  const ribs = joins.map((u, i) => {
    const c = vlerp(root, tip, u);
    const v = vmul(w, cut.width * spans[i]);
    const k = vmul(n, h * peak[i]);
    return [vsub(c, vmul(v, 0.93)), vadd(c, k), vadd(c, vmul(v, 0.79)), vsub(c, k)] as const;
  });
  for (let i = 0; i < 3; i++) {
    const a = ribs[i], b = ribs[i + 1];
    const polished = grain > 0.49 ? refract(m, 0) : refract(m, 3);
    const undertone = grain < 0.72 ? refract(m, 1) : refract(m, 2);
    r.poly([a[0], a[1], b[1], b[0]], i === 1 ? polished : tinted(m, 0.08))
      .poly([a[1], a[2], b[2], b[1]], i === 1 ? tinted(accent, 0.03) : i === 0 ? undertone : edge)
      .poly([a[2], a[3], b[3], b[2]], i === 1 ? undertone : tinted(m, 0.07))
      .poly([a[3], a[0], b[0], b[3]], i === 1 ? tinted(refract(accent, 0), 0.11) : edge);
  }
  if (!needle) {
    const a = ribs[1], b = ribs[2];
    const vein = cut.etched ? accent.T[3] : accent.T[2];
    for (const face of [1, 3]) {
      const edgeSide = face === 1 ? 0 : 2;
      const offset = vmul(n, face === 1 ? 0.16 : -0.16);
      const p1 = vadd(vlerp(a[face], a[edgeSide], 0.31), offset);
      const p2 = vadd(vlerp(b[face], b[edgeSide], 0.24), offset);
      r.line(p1, p2, vein, accent.glow ?? 0, 0.09);
      if (cut.etched) {
        const chip = vlerp(a[face], a[edgeSide], 0.75);
        const p3 = vadd(vlerp(chip, b[edgeSide], 0.33), offset);
        r.line(p1, p3, accent.T[2], accent.glow ?? 0, 0.08);
        r.dot(p2, accent.T[3], accent.glow ?? 0, 1, 0.14);
      }
    }
  }
}

function hull(r: Rig, f: F3, profile: V3[], bands: number, m: Palette, chest = false) {
  const rings = profile.map(([x, radius, height], i) =>
    Array.from({ length: bands }, (_, j) => {
      const a = TAU * (j + (i % 2) * 0.11) / bands;
      return f.p(x + Math.cos(a * 2) * 0.55, radius * Math.cos(a), height * Math.sin(a));
    }),
  );
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < bands; j++) {
      const k = (j + 1) % bands;
      const a = rings[i][j], b = rings[i + 1][j], c = rings[i + 1][k], d = rings[i][k];
      const belly = j >= bands * 0.54 && j <= bands * 0.87;
      const material = belly ? m.slate : chest && i > 3 ? m.sea : m.jade;
      const tone = ((i * 19 + j * 13) % 11 - 5) * 0.024;
      const sheen = (i + (j % 4)) % 5;
      r.poly([a, b, c], tinted(material, tone))
        .poly([a, c, d], tinted(sheen < 4 ? refract(material, sheen) : material, -tone));
      if (i > 0 && (i + j) % 4 === 1) {
        const chip = vlerp(vlerp(a, c, 0.48), d, 0.2);
        r.dot(chip, material.T[2], material.glow, 1, 0.09);
      }
    }
  }
}
function carapace(r: Rig, s: BirdSkeleton, m: Palette, phase: number) {
  const f = s.body;
  r.tag = 'body';
  hull(r, f, [[-26, 0.3, 0.5], [-21, 7, 10], [-15, 13, 17], [-7, 17, 23], [4, 18, 27],
    [13, 15, 25], [19, 12, 19], [23, 7, 12], [25, 0.3, 0.45]], 17, m, true);

  // Rows trace the curved back and rump, like overlapping polished cabochons.
  for (let row = 0; row < 7; row++) {
    for (let i = 0; i < 12; i++) {
      const a = TAU * (i + (row % 2) * 0.5) / 12, c = Math.cos(a), z = Math.sin(a);
      const x = 16 - row * 5;
      const shell = Math.sqrt(Math.max(0.37, 1 - ((x - 1) / 28) ** 2));
      const p = f.p(x + 3, 17 * shell * c, 25 * shell * z);
      const q = f.p(x - 7, (17.4 * shell + 0.65) * c, (25.2 * shell + 1.3) * z + s.pulse(0.65 + row * 0.13) * 0.65);
      const texture = i === 5 || i === 6 || row >= 5 ? m.violet : i % 5 === 2 ? m.sea : m.jade;
      blade(r, p, q, f.v(0, z, -c), texture, {
        width: (3.8 + (i * 3 + row) % 5 * 0.31) * shell, depth: 1.35,
        grain: (row * 17 + i * 31) % 19 / 18, accent: i % 3 === 0 ? m.sea : texture, etched: (i + row) % 4 === 0,
      });
    }
  }

  r.tag = 'breastPlates';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const u = i / 5;
      const crown = f.p(13.8 + 8.8 * u, side * (11.4 - u * 7.6), 24.2 - 8.5 * u);
      const toe = f.p(23.8 - 3.8 * u, side * (12.3 - u * 2.8), -7.5 - 10.5 * u + 0.5 * s.pulse(0.75 + i * 0.17));
      blade(r, crown, toe, f.v(-0.5, side * 0.72, 0.38), i % 4 === 2 ? m.ice : i % 3 === 1 ? m.jade : m.sea, {
        width: 3.6 + Math.sin(Math.PI * u) * 2.35, depth: 2.4,
        accent: i % 3 === 0 ? m.amber : m.ice, grain: (i + 4) % 7 / 6, etched: i % 2 === 0,
      });
    }
  }
  r.tag = 'heart';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const arc = i / 8;
      const a = f.p(18 + 5 * Math.sin(arc * Math.PI), side * (4.7 + arc * 7.3), 20 - 36 * arc);
      const b = f.p(23 + 3 * Math.sin(arc * Math.PI), side * (4.3 + arc * 6.3), 11 - 36 * arc);
      blade(r, a, b, f.v(-0.42, 1, 0.58), i % 3 === 2 ? m.amber : m.ice, {
        width: 2.3 + 1.4 * Math.sin(arc * Math.PI), accent: i % 2 === 0 ? m.jade : m.amber, etched: i % 2 === 1,
      });
    }
  }
  const core = f.at(25, 0, 4), glint = s.pulse(0.6) * 0.37 + phase * 1.3;
  const halo = [core.p(0, 0, 18), core.p(0, 9.5, 8), core.p(0, 10, -3), core.p(0, 0, -16),
    core.p(0, -10, -3), core.p(0, -9.5, 8)];
  const front = core.p(4 + glint, 0, 2), inner = halo.map(v => vlerp(front, v, 0.66));
  for (let i = 0; i < halo.length; i++) {
    const next = (i + 1) % halo.length;
    r.poly([halo[i], halo[next], inner[next], inner[i]], tinted(m.coal, i % 2 === 0 ? 0.28 : 0.08));
    r.poly([inner[i], inner[next], front], flat(i === 0 || i === 5 ? m.ice : m.amber, i === 2 || i === 3 ? 2 : 3));
    r.line(vlerp(inner[i], front, 0.19), vlerp(inner[i], front, 0.78), m.amber.T[i % 2 + 2], 0.17 + phase * 0.7, 0.15);
  }
  r.dot(front, m.ice.T[3], 0.22 + phase * 0.7, 2, 0.22);
}

function collar(r: Rig, s: BirdSkeleton, m: Palette) {
  const neck = s.head.p(-4, 0, -8);
  r.tag = 'neck';
  r.cap(s.neckRoot, s.throat, 14, 11, m.jade).cap(s.throat, neck, 11, 8.6, m.sea);
  for (let ring = 0; ring < 4; ring++) {
    const k = ring / 3;
    const center = vlerp(s.throat, neck, k * 0.9);
    for (let i = 0; i < 13; i++) {
      const a = (i + (ring % 2) * 0.5) * TAU / 13, x = Math.cos(a), y = Math.sin(a);
      const girth = 11.6 - k * 2.2;
      const edge = s.body.v(x * girth, y * girth, 0);
      const lower = s.body.v(x * (girth + 1.2), y * (girth + 1.2), -13 + k * 3 + 0.58 * s.pulse(0.81 + ring * 0.17));
      const root = vadd(center, edge), tip = vadd(center, lower);
      const glaze = x > 0.63 ? (i % 3 ? m.ice : m.amber) : (i % 3 ? m.sea : m.violet);
      blade(r, root, tip, s.body.v(-y, x, 0.16), glaze, { width: 3, depth: 1.2, etched: ring === 3 || i % 3 === 1 });
    }
  }
}

function mask(r: Rig, s: BirdSkeleton, m: Palette, pose: PhoenixPose, phase: number) {
  const h = s.head;
  r.tag = 'head';
  hull(r, h, [[-15.2, 0.2, 0.4], [-13, 5, 8.5], [-9.8, 9, 12.3], [-3.7, 10.2, 12.8],
    [3, 9.8, 10.7], [8, 6.4, 7.8], [11.5, 3.1, 4.9], [12.8, 0.1, 0.25]], 15, m);
  for (const side of [-1, 1]) {
    r.tag = 'cheek' + (side < 0 ? 'L' : 'R');
    for (let rank = 0; rank < 3; rank++) {
      for (let j = 0; j < 6; j++) {
        const root = h.p(6 - 5.4 * rank, side * (7.5 + rank * 0.7 - j * 0.19), 1.4 - j * 1.48 + rank * 2.7);
        const tip = h.p(-1.4 - rank * 5.6, side * (8.2 + rank * 0.45 - j * 0.23), -2.7 - j * 1.64 + rank * 2.9);
        const mat = (j === 0 && rank > 0) || j === 4 ? m.ice : j > 3 ? m.violet : m.sea;
        blade(r, root, tip, h.v(0.34, 0, 1), mat, { width: 1.25 + rank * 0.23, depth: 0.7, etched: j % 3 === 0 });
      }
    }
    r.tag = 'eye' + (side < 0 ? 'L' : 'R');
    const y = side * 10.25;
    const lid = clamp(pose.eye ?? 0);
    const socket = [h.p(8, y * 0.77, 3.1), h.p(3, y, 6.4), h.p(-0.8, y * 1.09, 5.7), h.p(-4.9, y, 1.1), h.p(1, y * 1.04, -0.58)];
    r.poly(socket, flat(m.coal, 0), 0.18);
    const center = h.p(2.3, y * 1.06, 2 + lid * 0.8);
    const top = 3.1 * (1 - lid) + 0.25, bottom = 2.35 * (1 - lid) + 0.19;
    const start = r.size;
    r.poly([h.p(-2.1, y * 1.06, 1.35), h.p(2, y * 1.08, 2.3 + top), h.p(6, y * 0.9, 2.9),
      h.p(2.1, y * 1.08, 2.3 - bottom)], flat(m.amber, 3, 0.26 + phase * 0.72), 0.2);
    if (lid < 0.88) {
      r.line(h.p(2.3, y * 1.1, 2.1 + top * 0.72), h.p(1.65, y * 1.1, 2.4 - bottom * 0.82), m.coal.T[0], 0, 0.5);
      r.dot(h.p(3.3, y * 1.13, 2.8 + top * 0.51), m.ice.T[3], 0.29 + phase * 0.4, 1, 0.39);
    }
    r.markEye(start, side, lid < 0.9);
    if (side * h.s[1] >= 0 && lid < 0.9) r.eye = s.points.eye = center;
    r.tag = 'brow';
    blade(r, h.p(9.2, y * 0.76, 4.4), h.p(-5.9, y * 0.97, 8.4), h.u, m.jade, { width: 2.4, depth: 1.45, accent: m.ice, etched: true });
    r.line(h.p(7.9, y * 0.79, 5.4), h.p(0.4, y * 1.04, 7), m.sea.T[3], phase * 0.34, 0.24);
  }

  r.tag = 'beak';
  const bill = (x: number, y: number, z: number) => h.p(x, y, z);
  const B = bill(7, 0, 4.05), L = bill(7.4, -5.9, -2.8), R = bill(7.4, 5.9, -2.8);
  const K = bill(16.9, 0, 1.9), U = bill(19.8, 3.4, -2.8), V = bill(19.8, -3.4, -2.8);
  const tip = bill(24, 0, -4.5), hook = bill(21, 0, -9);
  r.poly([B, K, U, R], m.amber).poly([B, L, V, K], tinted(m.amber, -0.03))
    .poly([K, tip, U], flat(m.amber, 3)).poly([K, V, tip], tinted(m.amber, 0.35))
    .poly([R, U, tip, hook], flat(m.amber, 1)).poly([L, hook, tip, V], flat(m.amber, 1))
    .poly([L, R, hook], flat(m.amber, 0));
  r.line(B, K, m.ice.T[3], phase * 0.48, 0.27);
  for (const x of [-1, 1]) r.dot(bill(12.8, x * 4.3, -0.15), m.coal.T[0], 0, 1, 0.46);
  const open = clamp(pose.beak ?? 0);
  const M = bill(7.4, 4.2, -4.3), N = bill(7.4, -4.2, -4.3);
  const J = bill(19 - 3.4 * open, 0, -6.5 - 7.5 * open), lower = bill(11.3, 0, -7.3 - 2 * open);
  r.poly([M, J, lower], m.amber).poly([N, lower, J], tinted(m.amber, -0.09)).poly([M, N, J], flat(m.coal, 1));
  s.points.beak = tip;

  r.tag = 'crestBase';
  for (let i = 0; i < 8; i++) {
    const a = (i - 3.5) / 3.5, drag = s.pulse(1.24 + i * 0.15);
    const start = h.p(1.5 - Math.abs(a) * 3.2, a * 6.1, 10.5);
    const tip = h.p(-2 - Math.abs(a) * 13 + 1.2 * drag, a * (11 + (pose.fan ?? 0) * 2.5), 24 + (1 - Math.abs(a)) * 13 + 1.15 * drag);
    blade(r, start, tip, h.s, i % 3 === 1 ? m.violet : m.sea, { width: 4.1 - 1.2 * Math.abs(a), depth: 1.6, accent: i % 3 ? m.ice : m.amber, etched: true, grain: i % 4 / 3 });
  }
  r.tag = 'crestStreamers';
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) / 3, lag = s.pulse(1.82 + i * 0.19);
    blade(r, h.p(-6, a * 6.8, 14), h.p(-24.1 - 3 * a * a + lag * 1.8, a * 13.5, 23 + 3 * (1 - a * a) + lag * 2),
      h.v(0, 0.48, -0.88), i % 3 === 0 ? m.violet : m.jade, { width: 2.8, depth: 1.25, accent: m.sea, etched: i % 2 === 0 });
  }
}

function feathers(r: Rig, s: BirdSkeleton, m: Palette, phase: number) {
  for (const w of s.wings) {
    const suffix = w.side < 0 ? 'L' : 'R';
    const wingAxis = s.body.v(0.02, 0.58 * w.side, 0.82);
    const coverAxis = s.body.v(0.47, -0.22 * w.side, 0.9);
    r.tag = 'wingPrimary' + suffix;
    for (let i = w.flight.length - 1; i >= 0; i--) {
      const { root, tip } = w.flight[i];
      const trim = [m.violet, m.sea, m.jade, m.sea, m.violet, m.violet, m.slate][i % 7];
      blade(r, root, tip, wingAxis, trim, {
        width: 3.55 + i * 0.11, depth: 2.6 - i * 0.055, grain: ((i * 5) % 13) / 12,
        accent: i % 4 === 0 ? m.ice : m.sea, etched: i % 2 === 0,
      });
      const q = vlerp(root, tip, 0.67), p = vlerp(root, tip, 0.94);
      if (i % 2 === 1) {
        const shift = s.body.v(0, 1.4 * w.side, 0.6);
        r.line(vadd(q, shift), vadd(p, vmul(shift, 0.41)), trim.T[1], 0.04 + phase * 0.21, 0.22);
      }
    }
    r.tag = 'wingSecondaries' + suffix;
    for (let i = 0; i < w.flight.length; i++) {
      const { root, tip } = w.flight[i];
      const u = i / (w.flight.length - 1);
      const shift = s.body.v(2.9, 1.9 * w.side, 1.2 + s.pulse(1.14 + u * 0.45) * 0.75);
      const start = vadd(root, shift), end = vadd(vlerp(root, tip, 0.67 - u * 0.13), vmul(shift, 0.47));
      blade(r, start, end, coverAxis, i % 4 === 1 ? m.slate : i % 4 === 2 ? m.violet : m.jade, {
        width: 3.4 + u * 0.55, depth: 1.9, grain: i % 5 / 4, accent: i % 5 === 1 ? m.amber : m.sea, etched: i % 3 !== 1,
      });
    }
    r.tag = 'wingCoverts' + suffix;
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 12; i++) {
        const grove = w.flight[i];
        const u = (i + 0.1) / 12;
        const shift = s.body.v(6 - row * 2.4, (2.8 + row * 0.6) * w.side, 4.2 - row * 0.68 + s.pulse(1.61 + row * 0.21 + u * 0.43) * 0.75);
        const start = vadd(vlerp(grove.root, grove.tip, 0.04 + 0.12 * row), shift);
        const end = vadd(vlerp(grove.root, grove.tip, 0.28 + 0.135 * row), vmul(shift, 0.73));
        blade(r, start, end, coverAxis, (i + row) % 5 === 1 ? m.ice : (i + row) % 5 === 3 ? m.violet : m.sea, {
          width: 2.2 + 1.35 * Math.sin(u * Math.PI), depth: 1.35, grain: (i * 9 + row * 7) % 11 / 10,
          accent: row === 0 ? m.ice : m.jade, etched: (i + row) % 3 === 0,
        });
      }
    }
    r.tag = 'wingRidge' + suffix;
    const wrist = vadd(w.wrist, s.body.v(1.2, 1.6 * w.side, 0.9));
    const elbow = vadd(w.elbow, s.body.v(1.8, 2.1 * w.side, 1.35));
    r.cap(w.shoulder, elbow, 6.1, 4.15, m.jade)
      .cap(elbow, wrist, 4.3, 2.3, m.sea);
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const p = u < 0.51 ? vlerp(w.shoulder, elbow, u / 0.51) : vlerp(elbow, wrist, (u - 0.51) / 0.49);
      const raised = 1.35 + (1 - u) * 3.25;
      const a = vadd(p, s.body.v(1.3, raised * w.side, 1.7 + raised * 0.36));
      const b = vadd(a, s.body.v(-7.2 + 2.1 * w.spread, w.side * (0.9 + 4.1 * w.spread), -5.2));
      const tint = i % 3 === 0 ? m.violet : m.jade;
      blade(r, a, b, coverAxis, tint, { width: 2.55 - 0.65 * u, depth: 1.4, accent: m.ice, etched: i % 2 === 1 });
    }
    // Larger shoulder and carpal plates separate the scalloped coverts from
    // the flight fan. Their long facets remain legible in the picture.
    r.tag = 'wingShoulder' + suffix;
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      const p = vlerp(w.shoulder, w.elbow, 0.18 + 0.12 * i);
      const a = vadd(p, s.body.v(3.5, w.side * (3.8 + u * 1.7), 3.8));
      const b = vadd(a, s.body.v(-13.8 + u * 1.4, w.side * (5 + w.spread * 6.5 + u * 4), -10.2 + u * 4.1));
      blade(r, a, b, s.body.v(0.14, w.side * 0.28, 0.95), i % 3 === 1 ? m.sea : m.jade, {
        width: 4.7 - 0.69 * u, depth: 2.5, grain: i % 4 / 3,
        accent: i % 3 === 0 ? m.ice : m.sea, etched: i % 2 === 0,
      });
    }
  }
}

function feet(r: Rig, s: BirdSkeleton, m: Palette, phase: number) {
  for (const leg of s.legs) {
    r.tag = leg.side < 0 ? 'leftLeg' : 'rightLeg';
    const f = s.facing, side = leg.side;
    r.cap(leg.hip, leg.knee, 8.8, 5.25, m.jade)
      .cap(leg.knee, leg.hock, 4.5, 2.55, m.slate)
      .cap(leg.hock, leg.toe, 2.55, 2.25, m.amber);
    for (let i = 0; i < 14; i++) {
      const angle = i % 7 * TAU / 7, t = i < 7 ? 0.16 : 0.43;
      const a = vadd(vlerp(leg.hip, leg.knee, t), f.v(Math.sin(angle) * 5.7, Math.cos(angle) * 5.7, 0));
      const b = vadd(a, f.v(-3.6 + Math.sin(angle), Math.cos(angle) * -1.2, -11.3 - i % 4));
      blade(r, a, b, f.v(Math.cos(angle), -Math.sin(angle), 0.3), i % 3 === 2 ? m.violet : m.jade,
        { width: 2.23, depth: 1.15, accent: m.sea, etched: i % 4 === 1 });
    }
    for (let i = 0; i < 6; i++) {
      const lo = i / 7, hi = lo + 0.11;
      const a = vlerp(leg.hock, leg.toe, lo), b = vlerp(leg.hock, leg.toe, hi);
      const wide = 2.48 - lo * 0.21;
      const segments: V3[] = [f.v(wide, 0, 0), f.v(0, wide, 0), f.v(-wide, 0, 0), f.v(0, -wide, 0)];
      for (let j = 0; j < 4; j++) {
        const next = (j + 1) % 4;
        r.poly([vadd(a, segments[j]), vadd(b, segments[j]), vadd(b, segments[next]), vadd(a, segments[next])],
          j === 0 || j === 3 ? m.amber : m.slate, 0.25);
      }
    }
    const p = leg.toe;
    const toes = [[11.6, 3.5], [12.7, -0.65], [8.5, -4.7], [-6.2, 3.1]];
    for (const [i, [length, run]] of toes.entries()) {
      const grip = i === 3 ? 0.85 : Math.min(1, length / 10);
      const a = vadd(p, f.v(i === 3 ? -0.6 : 1.5, side * (i - 1) * 1.2, 0.25));
      const b = vadd(p, f.v(length * 0.67, side * run * 0.59, 0.05));
      const head = vadd(p, f.v(length * 0.9, side * run * 0.8, 0.65));
      const c = vadd(p, f.v(length, side * run, -0.75));
      r.cap(a, b, 1.65, 1.15, m.amber).cap(b, head, 1.1, 0.95, m.slate);
      blade(r, b, c, f.s, m.ice, { width: 1.48 * grip, depth: 0.83, accent: m.amber, etched: i % 2 === 0 });
      r.line(vadd(a, f.u), vadd(b, f.u), m.amber.T[2], phase * 0.32, 0.24);
    }
  }
}

function tail(r: Rig, s: BirdSkeleton, m: Palette, pose: PhoenixPose, phase: number, heat: number) {
  const f = s.tail, crowd = pose.fan ?? 0;
  const ember = flat(m.amber, 3, 0.38 + heat * 0.55);
  for (let i = 0; i < 11; i++) {
    const across = (i - 5) / 5;
    const lag = 1.75 + Math.abs(across) * 0.9 + i * 0.095;
    const length = 78 - Math.abs(across) * 28 + 2 * (i % 2);
    const root = f.p(3 - Math.abs(across) * 7, across * 9.7, -3 + 4 * across * across);
    const ribbon = (u: number) => f.p(
      3 - length * u - 5 * phase * u * u,
      across * (9.7 + (31 + crowd * 12) * u) + u * u * (4 + 8 * phase) * s.pulse(lag + u * 1.15),
      -4 - u * (21 + Math.abs(across) * 8) + u * u * (4 + 40 * Math.abs(across)) +
        u * u * (5 + 12 * phase) * s.pulse(lag + u * 0.9) + phase * (5 + 11 * u) * Math.sin(u * 5 + across * 2),
    );
    const tip = ribbon(1);
    const mid = ribbon(0.49);
    const shell = i % 3 === 0 ? m.violet : i % 3 === 1 ? m.sea : m.jade;
    r.tag = 'tailOuter' + i;
    const switchAt = 0.19 + Math.abs(across) * 0.14;
    const unfurl = clamp((phase - switchAt) / (1 - switchAt));
    const width = (4.4 + 1.8 * (1 - Math.abs(across))) * (1 - 0.25 * unfurl);
    const strand = f.v(0, 0.43, 0.91);
    // One feather starts as two mineral blades. The molten seam between them
    // stretches out first, before the spines have bent into full ribbons.
    blade(r, root, vlerp(mid, tip, 0.13 + 0.48 * unfurl), strand, shell,
      { width: width + 1.1, depth: 2.1, grain: i % 4 / 3, accent: i % 3 === 0 ? m.ice : m.sea, etched: true });
    if (unfurl < 0.67) {
      const back = vlerp(root, mid, 0.49 + 0.5 * unfurl);
      blade(r, back, tip, strand, shell, {
        width: width * (1 - 0.85 * unfurl), depth: 2.25 - unfurl * 1.65,
        accent: i % 3 ? m.sea : m.ice, etched: true, grain: (i * 5) % 11 / 10,
      });
    }
    if (unfurl > 0.03) {
      for (let k = 0; k < 9; k++) {
        const a = 0.18 + k / 11, b = 0.18 + (k + 1) / 11;
        const p = ribbon(a), q = ribbon(b);
        const twist = s.pulse(lag + k * 0.29) * 0.38;
        const w = f.v(0, 0.46 + twist, 0.84 - twist);
        const sweep = (i % 3 === 2 ? 8.25 : 4.4) * (1 - 0.26 * Math.abs(across));
        const thickness = Math.sin(a * Math.PI) * (1 + unfurl * sweep);
        const extension = Math.max(0.1, Math.sin(b * Math.PI) * (1 + unfurl * sweep));
        const a0 = vadd(p, vmul(w, thickness)), a1 = vsub(p, vmul(w, thickness));
        const b0 = vadd(q, vmul(w, extension)), b1 = vsub(q, vmul(w, extension));
        const ribbonTone = i % 3 === 0 ? m.violet : m.sea;
        r.poly([a0, b0, q, p], flat(ribbonTone, k > 5 ? 2 : 3, unfurl * (0.53 + 0.22 * heat)))
          .poly([a1, p, q, b1], flat(m.amber, k > 6 ? 1 : 2, unfurl * 0.4));
        const spineA = vadd(p, vmul(w, thickness * 0.29)), spineB = vadd(q, vmul(w, extension * 0.29));
        r.line(spineA, spineB, ember.T[3], unfurl * (0.72 + heat * 0.26), 0.28);
        if ((i + k) % 3 === 0)
          r.dot(vlerp(spineA, spineB, 0.37), m.ice.T[3], unfurl * 0.84, 1, 0.32);
      }
    }
    if (i === 5) s.points.tailTip = tip;
  }
  r.tag = 'tailCoverts';
  for (let i = 0; i < 15; i++) {
    const a = (i - 7) / 7, lag = s.pulse(1.34 + i * 0.06);
    blade(r, f.p(4, a * 12.7, 1), f.p(-20 - (1 - a * a) * 7, a * (20 + 3.1 * crowd), 3.5 + 3 * lag + a * a * 10),
      f.v(0, 0.71, 0.71), i % 3 === 1 ? m.violet : m.jade,
      { width: 3.4, depth: 2.1, accent: i % 3 ? m.sea : m.amber, grain: i % 5 / 4, etched: i % 2 === 0 });
  }
}

export function phoenixFeatherOver(frame: BodyFrame, offset: XY, angle: number, scale: number, alpha: number): BodyFrame {
  const over = frame.over ?? new Px(frame.px.w, frame.px.h);
  const x = frame.points.crown[0] + offset[0], y = frame.points.crown[1] + offset[1];
  const c = Math.cos(angle), s = Math.sin(angle);
  const point = (u: number, v: number): V3 => [x + scale * (u * c - v * s), y + scale * (u * s + v * c), 0];
  const shape = [point(-1, 6), point(-4, -1), point(2, -8), point(4, -3), point(3, 1)];
  const shades = ['#122129', '#207f75', '#86dfc2', '#d3fff0'].map(hx);
  const opacity = Math.round(clamp(alpha) * 255);
  const blade = (a: V3, b: V3, c: V3, tint: number) => {
    const rgba: RGBA = [shades[tint][0], shades[tint][1], shades[tint][2], opacity];
    const width = Math.max(Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1]), 1);
    for (let i = 0; i <= width; i++) {
      const q = vlerp(a, c, i / width);
      over.line(q[0], q[1], b[0], b[1], rgba);
    }
  };
  const root = point(0.8, 0.4);
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i], b = shape[(i + 1) % shape.length];
    over.line(a[0], a[1], b[0], b[1], [...shades[0].slice(0, 3), opacity] as RGBA);
    blade(vlerp(a, root, 0.17), vlerp(b, root, 0.17), root, 1 + (i % 3));
  }
  return { ...frame, over };
}

export function renderPhoenix(
  pose: PhoenixPose, t: number, side: number, variant: Variant,
  motion?: BirdMotion, anim = 'idle', stride = 24, yaw = 0.35,
): BodyFrame {
  const phase = clamp(pose.phase ?? 0), heat = clamp(pose.glow ?? 0);
  const period = anim === 'idle-f2' ? 1.5 : anim === 'sleep' ? 3.5 : undefined;
  const blinkProgress = (t / (period ?? 3) + 0.41) % 1;
  const blink = blinkProgress > 0.905 && blinkProgress < 0.955 ? Math.sin((blinkProgress - 0.905) / 0.05 * Math.PI) ** 2 : 0;
  if (pose.eye === undefined && (anim === 'idle' || anim === 'idle-f2')) pose = { ...pose, eye: blink };
  const skeleton = birdSkeleton(anim, t, side, stride, yaw, pose, motion, period);
  const r = new Rig();
  const m = phoenixPalette(phase, heat, variant);
  if (!pose.hidden) {
    tail(r, skeleton, m, pose, phase, heat);
    carapace(r, skeleton, m, phase);
    collar(r, skeleton, m);
    mask(r, skeleton, m, pose, phase);
    feathers(r, skeleton, m, phase);
    feet(r, skeleton, m, phase);
  }
  const scale = pose.size ?? 1;
  if (scale !== 1) scaleFigure(r, skeleton.points, scale);
  const frame = projectFigure(r, size, anchor, skeleton.points, phase > 0.5 ? '#200e1d' : '#101522', 4.2, true);
  frame.dx = pose.dx;
  frame.dy = pose.dy;
  frame.planted = (pose.dy ?? 0) < -1 ? [] : skeleton.planted;
  const altitude = clamp(-(pose.dy ?? 0) / 70);
  frame.groundShadow = {
    radius: (28 - altitude * 15) * Math.sqrt(scale),
    opacity: pose.hidden ? 0 : 0.48 - altitude * 0.32,
    reflectionOpacity: 0.1 - altitude * 0.07,
  };
  if (pose.over) {
    frame.over = new Px(frame.px.w, frame.px.h);
    frame.over.data.set(frame.px.data);
  }
  if (pose.overFeather) {
    const [x, y, angle, scale, alpha] = pose.overFeather;
    const crown = frame.points.crown;
    return phoenixFeatherOver(frame, [
      x + frame.anchor[0] - (frame.dx ?? 0) - crown[0],
      y + frame.anchor[1] - (frame.dy ?? 0) - crown[1],
    ], angle, scale, alpha);
  }
  return frame;
}

export function phoenixFrame(source?: BirdPoseSource<PhoenixPose>, stride = 24, yaw = 0.35): Creature['frame'] {
  return (anim, t, side, variant, motion) => {
    const pose = source?.(anim, t, side) ?? {};
    return renderPhoenix({ phase: anim.endsWith('-f2') ? 1 : 0, ...pose }, t, side, variant, motion, anim, stride, yaw);
  };
}
