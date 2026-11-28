import type { LightAppearance, LightSkeleton } from '../bodies/light-quadruped';
import { furLock, furTuft } from '../bodies/kits/tailoring';
import type { CreatureCard } from '../bodies/card-data';
import { finishSurfaces } from './surface-work';
import { hx, TAU } from '../kit/f11-mobkit';
import { F3, Rig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';

function paint(tones: string[], glow = 0): Mat {
  return { T: [hx(tones[0]), hx(tones[1]), hx(tones[tones.length - 2]), hx(tones.at(-1)!)], glow };
}

function pigments(card: CreatureCard, gold: boolean) {
  const ramp = (name: string) => card.materials.find((m) => m.name === name)!.tones;
  const snow = gold
    ? ['#6b4c4f', '#a27965', '#c89b75', '#e8c08d', '#f8ddac', '#fff1c5', '#fff6d8']
    : ramp('snow');
  const slate = ramp('slate'),
    velvet = ramp('velvet');
  return {
    snow: paint([snow[2], snow[3], snow[5], snow[6]]),
    under: paint([snow[0], snow[1], snow[3], snow[4]]),
    frost: paint([snow[1], snow[2], snow[4], snow[5]]),
    ink: paint([slate[0], slate[0], slate[1], slate[2]]),
    boots: paint([slate[0], slate[2], slate[3], slate[4]]),
    lining: paint(velvet),
    liningShade: paint([velvet[0], velvet[1], velvet[2], velvet[3]]),
    eye: paint(['#072f47', '#087584', '#3fe4cc', '#d7fff6'], 0.28),
    lights: ['turquoise', 'mint', 'blue'].map((name) => {
      const t = ramp(name);
      return [paint([t[0], t[1], t[3], t[4]], 0.28), paint([t[1], t[2], t[4], t[5]], 0.5)];
    }),
  };
}
type Coat = ReturnType<typeof pigments>;

// Each brush has its own control polygon. The high one climbs behind the pelvis,
// the middle one sweeps out, the low one falls before its tip turns upwards.
const brushes: V3[][] = [
  [
    [1, -2, 0],
    [-7, -8, 4],
    [-10, -12, 13],
    [-7, -12, 21],
    [-8, -12, 26],
    [-16, -11, 29],
  ],
  [
    [1, 0, 0],
    [-7, 0, 1],
    [-16, 0, 7],
    [-20, 1, 14],
    [-26, 2, 18],
    [-34, 2, 17],
  ],
  [
    [1, 2, 0],
    [-6, 5, -4],
    [-15, 7, -8],
    [-25, 9, -7],
    [-30, 10, -1],
    [-32, 11, 7],
  ],
];
function curved(points: V3[], t: number): V3 {
  const x = Math.min(0.999999, Math.max(0, t)) * (points.length - 1);
  const i = Math.floor(x),
    a = x - i,
    b = a * a,
    c = a * b;
  const p = points[Math.max(0, i - 1)],
    q = points[i],
    u = points[i + 1],
    v = points[Math.min(points.length - 1, i + 2)];
  return [0, 1, 2].map(
    (k) =>
      0.5 *
      (2 * q[k] +
        (-p[k] + u[k]) * a +
        (2 * p[k] - 5 * q[k] + 4 * u[k] - v[k]) * b +
        (-p[k] + 3 * q[k] - 3 * u[k] + v[k]) * c),
  ) as V3;
}

function brush(r: Rig, s: LightSkeleton, coat: Coat, index: number) {
  const sign = index - 1,
    fan = s.pose.tailFan ?? 0,
    lift = s.pose.tailLift ?? 0,
    curl = s.pose.tailCurl ?? 0;
  const fold = Math.max(s.life.sleep, s.life.hatch);
  const cycle = (s.time * TAU) / (s.anim === 'walk' ? 1 : 3);
  const points = brushes[index].map(([x, y, z], i): V3 => {
    const t = i / (brushes[index].length - 1),
      wave = Math.sin(cycle - 0.95 * index - 1.2 * t);
    // In the den the brushes wrap around the flanks, underneath the chin.
    const turn = Math.PI * t;
    const curled = s.body.p(
      -17 * s.length + (24 + 2.7 * index) * (1 - Math.cos(turn)) * 0.5,
      (index === 0 ? -12.5 : 10.6 + 5 * sign) * Math.sin(turn * 0.85),
      3 + (4.8 - index * 3.1) * Math.sin(turn) + 1.3 * Math.cos(turn),
    );
    const p: V3 = [
      x + 3 * curl * t * t,
      y + sign * 6 * fan * t + (2.8 + 1.2 * t) * wave * t + 6 * curl * t * t,
      z + lift * 8 * t + Math.cos(cycle - 1.05 * index - 1.6 * t) * 1.6 * t,
    ];
    return vlerp(s.tail.p(...p), curled, fold * Math.min(1, t * 4));
  });
  // A choreography goal bends this very brush. Its luminous tip and the effect
  // socket always meet, including the overlap phase after release.
  if (index === 1 && (s.pose['goal.tailTip.weight'] ?? 0) > 0) {
    const correction = vsub(s.points.tailTip, points.at(-1)!);
    for (let i = 1; i < points.length; i++)
      points[i] = vadd(points[i], vmul(correction, (i / (points.length - 1)) ** 2));
  }
  const ring = (t: number, a: number, rise = 0) => {
    const center = curved(points, t);
    const along = vnorm(vsub(curved(points, t + 0.002), curved(points, t - 0.002)));
    const normal = vnorm(vcross(along, s.tail.s)),
      lateral = vnorm(vcross(normal, along));
    const width = t >= 0.999 ? 0.12 : 1.38 * (1 - t) + 5.83 * Math.sin(Math.PI * t) ** 0.86;
    return vadd(
      center,
      vadd(vmul(normal, Math.cos(a) * (width + rise)), vmul(lateral, Math.sin(a) * (0.73 * width + rise))),
    );
  };
  r.tag = ['tailL', 'tail', 'tailR'][index];
  const [shade, gleam] = coat.lights[index];
  const sectors = 8,
    rows = 7;
  // Fur shingles overlap toward the point. Their tapered uneven seam is also
  // the boundary where cold white roots turn into aurora-coloured tips.
  for (let j = 0; j < rows; j++) {
    const a = j / rows,
      b = (j + 1) / rows;
    for (let k = 0; k < sectors; k++) {
      const v = (k * TAU) / sectors,
        w = ((k + 1) * TAU) / sectors,
        m = (v + w) * 0.5;
      const lightSide = Math.sin(m) > -0.2;
      const base = j < 3 ? coat.frost : j === 3 && k % 3 === 0 ? coat.snow : shade;
      r.poly([ring(a, v), ring(a, w), ring(b, w), ring(b, v)], base);
      if (j === rows - 1) continue;
      const layer = j < 3 ? (lightSide ? coat.snow : coat.frost) : lightSide ? gleam : shade;
      const tip = ring(Math.min(0.995, b + 0.08 + (k % 3) * 0.019), m, 0.37);
      const ridge = ring(a + 0.06, m, 0.74);
      r.poly([ring(a + 0.018, v + 0.07, 0.18), ridge, tip], layer);
      r.poly([ridge, ring(a + 0.012, w - 0.11, 0.18), tip], j < 3 ? coat.frost : shade);
      if ((k + j) % 3 === 0) r.line(ridge, tip, layer.T[lightSide ? 2 : 1], j >= 3 ? 0.22 : 0, 0.2);
    }
  }
  s.points[['tailTipL', 'tailTip', 'tailTipR'][index]] = points.at(-1)!;
}

function ear(r: Rig, s: LightSkeleton, sign: number, c: Coat) {
  const suffix = sign > 0 ? 'R' : 'L';
  r.tag = 'ear' + suffix;
  const q = (s.time * TAU) / 3 - 0.85 * sign;
  const listen = Math.max(0, Math.cos(q)) ** 12;
  const fold = Math.max(s.life.sleep * 0.88, s.life.hatch * 0.54, s.pose.earFold ?? 0);
  const ear = s.head
    .at(-1.6, 5.1 * sign, 4.5)
    .turn(sign * (0.48 + 0.18 * listen))
    .pitch(-fold * 0.88 + 0.13 * (s.pose.earLift ?? 0) - 0.055 * Math.sin(q))
    .roll(sign * (0.12 + 0.52 * fold - 0.1 * (s.pose.earLift ?? 0)));
  const point = (x: number, y: number, z: number) => ear.p(x, y * sign, z);
  const a = point(2.4, -3.9, -1),
    b = point(2.9, 3.9, -1.1),
    top = point(-2.9, 1.2, 15.3),
    back = point(-3.9, 0, 4.4);
  r.poly([a, b, top], c.snow);
  r.poly([a, top, back], c.frost);
  r.poly([back, top, b], c.under);
  const t = point(-0.92, 0.93, 12.1),
    left = point(3.32, -2.45, 1.5),
    right = point(3.63, 2.55, 0.7);
  r.poly([left, right, t], c.lining);
  r.poly([right, point(2.4, 0.6, 5.6), t], c.liningShade);
  r.poly([vlerp(a, top, 0.81), vlerp(b, top, 0.78), top], c.ink);
  r.poly([vlerp(b, top, 0.78), vlerp(back, top, 0.77), top], c.boots);
  for (let i = 0; i < 4; i++) {
    const y = (i - 1.5) * 1.15;
    furLock(
      r,
      point(3.6, y, 1.1),
      point(3.05, y + 0.62, 3.8 + (i % 2) * 1.7),
      ear.v(0, 0.56, 0),
      ear.v(0.42, 0, 0.5),
      c.snow,
      c.frost,
    );
  }
  s.points['ear' + suffix] = top;
}

function face(r: Rig, s: LightSkeleton, c: Coat) {
  const h = s.head;
  r.tag = 'head';
  r.ell(h, [1, 0, 0.8], [8.1, 7.3, 7], c.frost);
  r.ell(h, [2.6, 0, 3], [7, 6.4, 4.8], c.snow);
  for (const sign of [-1, 1]) {
    ear(r, s, sign, c);
    r.tag = 'head';
    for (const [i, [x, y, z, len]] of [
      [2, 5.9, 2, 6.5],
      [0.9, 6.2, 0.1, 8],
      [-0.3, 6, -1.7, 8.6],
      [-0.6, 5.1, -3.5, 6.9],
    ].entries()) {
      const a = h.p(x, sign * y, z),
        tip = h.p(x - len, sign * (y + 2.3), z - 1.3 - i * 0.38);
      furLock(r, a, tip, h.v(0, 0.55, 1.5), h.v(-1.6, sign * 1.5, 0), c.snow, c.frost);
    }
  }
  r.tag = 'muzzle';
  const jaw = Math.max(0, Math.min(1, s.pose.jaw ?? 0));
  const hinge = h.at(4, 0, -1.8);
  const upper = jaw ? hinge.pitch(-0.25 * jaw).at(-4, 0, 1.8) : h;
  if (jaw > 0) {
    // Both lips clear the stationary mouth aim point as the bite opens.
    const lower = hinge.pitch(0.52 * jaw);
    r.ell(lower, [6.2, 0, -0.88], [6, 2.2, 1.48], c.frost);
    r.ell(lower, [6.5, 0, -0.1], [5.35, 2.02, 1.23], c.liningShade);
    for (const sign of [-1, 1]) {
      r.cap(
        upper.p(12.2, sign * 2.4, -3.1),
        upper.p(12.35, sign * 2.4, -3.1 - 2.1 * jaw),
        0.72 * jaw,
        0.08,
        c.snow,
      );
    }
  }
  r.cap(upper.p(5, 0, 1), upper.p(14.3, 0, -1), 4.7, 2.25, c.snow);
  r.ell(upper, [12.5, 0, -2.1], [5.4, 3.5, 2.65], c.snow);
  r.ell(upper, [16.8, 0, -1.47], [1.88, 2.05, 1.65], c.ink);
  r.line(upper.p(17, 0.45, -0.08), upper.p(17.7, -0.55, -0.17), c.boots.T[3], 0, 0.28);
  s.points.nose = upper.p(18, 0, -1.21);
  for (const sign of [-1, 1]) {
    r.tag = 'muzzle';
    r.line(upper.p(10.4, sign * 3.28, -3.15), upper.p(15.2, sign * 2.58, -3.3), c.boots.T[0], 0, 0.41);
    for (let i = 0; i < 3; i++) {
      const x = 10.2 + i * 0.78,
        z = -1.9 + (i % 2) * 0.65;
      r.dot(upper.p(x, sign * (3.15 + 0.17 * i), z), c.under.T[1], 0, 0.49);
      r.line(
        upper.p(x, sign * 3.3, z),
        upper.p(x - 2.2, sign * (6.7 + i * 0.4), z + 0.4 - i * 0.45),
        c.under.T[2],
        0,
        0.37,
      );
    }
    // Almond outline is raised from the cheek so the visible eye survives
    // the profile and frontal views. The lid uses the same curved upper rim.
    r.tag = sign > 0 ? 'eyeR' : 'eyeL';
    const e = h.at(5.85, sign * 5.65, 3.1).turn(-sign * 0.53);
    const p = (x: number, y: number, z: number) => e.p(x, sign * y, z);
    const left = p(-3.45, 0.45, 1.35),
      right = p(3.75, 0.4, -0.49),
      crown = p(-0.22, 1.1, 2.02),
      base = p(0.4, 1.14, -1.7);
    const start = r.size;
    if (!s.life.blink) {
      r.poly([left, crown, right, base], c.ink);
      r.ell(e, [0.28, sign * 1.18, 0.16], [1.97, 0.86, 1.57], c.eye);
      r.ell(e, [0.49, sign * 2.05, 0.14], [0.64, 0.22, 1.04], c.ink);
      r.dot(p(0.81, 2.32, 1.02), c.snow.T[3], 0.25, 0.76);
    }
    r.line(left, crown, c.ink.T[0], 0, 0.73);
    r.line(crown, right, c.ink.T[0], 0, 0.71);
    r.markEye(start, sign, !s.life.blink);
    if (sign > 0) s.points.eyeR = r.eye = p(0.32, 2.06, 0.25);
    else s.points.eyeL = p(0.32, 2.06, 0.25);
    r.tag = 'head';
    furLock(
      r,
      p(-2.1, 0.27, 2.4),
      p(3.3, 0.15, 0.95),
      e.v(0.3, 0, 0.78),
      e.v(0.9, 0.4 * sign, 0.44),
      c.snow,
      c.frost,
    );
  }
}

export const foxSkin: LightAppearance = {
  muzzle: [18, 0, -1.21],
  tailTip: brushes[1].at(-1),
  draw(r, s, card, variant) {
    const c = pigments(card, variant === 'gold'),
      b = s.body;
    const fold = Math.max(s.life.sleep, s.life.hatch);
    if (fold > 0) {
      const nest = b.at(8, 6.8, -0.4).turn(2.72).pitch(0.12).roll(0.18);
      const forward = vnorm(vlerp(s.head.f, nest.f, fold));
      const side = vnorm(vcross(vlerp(s.head.u, nest.u, fold), forward));
      s.head = new F3(vlerp(s.head.o, nest.o, fold), forward, side, vcross(forward, side));
      s.points.head = s.head.o;
      s.points.mouth = s.points.snout = s.points.hornTip = s.points.weaponTip = s.head.p(18, 0, -1.21);
    }
    const h = s.head;
    for (let i = 0; i < 3; i++) brush(r, s, c, i);
    for (const leg of s.legs) {
      r.tag = leg.name;
      const hind = leg.fore < 0,
        sign = leg.side,
        mid = vlerp(leg.knee, leg.hock, 0.52);
      r.cap(leg.hip, leg.knee, hind ? 5.3 : 3.65, hind ? 3.35 : 2.1, c.frost);
      r.cap(leg.knee, mid, hind ? 3.35 : 2.2, 1.92, c.frost);
      r.cap(mid, leg.hock, 1.98, 1.52, c.boots);
      r.cap(leg.hock, leg.foot, 1.6, 1.45, c.boots);
      const hip = vadd(leg.hip, b.v(0, sign * 2.4, 0));
      for (let j = 0; j < 4; j++) {
        const base = vlerp(hip, leg.knee, 0.1 + j * 0.13),
          tip = vadd(vlerp(hip, leg.knee, 0.57 + j * 0.09), b.v(-2.2, sign * 1.7, -1.1));
        furLock(r, base, tip, b.v(1.58, 0, 0.2), b.v(-0.55, sign * 1.8, -0.4), c.snow, c.frost);
      }
      r.ell(leg.hoof, [1, 0, 0.85], [3.1, 1.97, 1.75], c.boots);
      for (const toe of [-1, 0, 1]) {
        const x = 2.7 - 0.44 * Math.abs(toe);
        r.ell(leg.hoof, [x, toe * 1.18, 0.62], [1.85, 1.02, 0.99], c.boots);
        r.line(
          leg.hoof.p(x + 0.6, toe * 1.18, 1.25),
          leg.hoof.p(x + 1.18, toe * 1.29, 1.07),
          c.frost.T[2],
          0,
          0.24,
        );
      }
    }
    r.tag = 'torso';
    r.ell(b, [-2.2, 0, 0.55], [16.8, 6.8, 7.5], c.frost);
    r.ell(b, [-10.5, 0, 0.65], [8.7, 7, 8.15], c.frost);
    r.ell(b, [8.5, 0, 1], [10.1, 7.6, 10.3], c.snow);
    for (const sign of [-1, 1]) {
      for (const [x, y, z, dx, dz] of [
        [10, 5.8, 6, -5, -6],
        [8, 7, 3, -6, -6],
        [5.5, 6.3, 5, -8, -4],
        [1.1, 5.9, 5, -9, -4],
        [-4, 5.9, 4.6, -8, -5],
        [-9, 5.7, 5.1, -7, -5],
        [-12, 5.8, 3, -5, -7],
      ]) {
        furLock(
          r,
          b.p(x, sign * y, z),
          b.p(x + dx, sign * (y + 0.36), z + dz),
          b.v(0.95, 0, 1.73),
          b.v(-1.1, sign * 1.35, 0),
          c.snow,
          c.frost,
        );
      }
    }
    r.tag = 'neck';
    r.cap(b.p(8.6, 0, 3), h.p(-0.8, 0, -1.6), 7.4, 5.75, c.snow);
    r.tag = 'ruff';
    const neckBottom = b.p(10.7, 0, -4.7),
      neckTop = h.p(-1.8, 0, -2.4);
    const sway = Math.sin((s.time * TAU) / 3 - 0.62) * 0.6;
    for (let layer = 0; layer < 2; layer++)
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + layer * 0.21,
          cx = Math.cos(a),
          sy = Math.sin(a);
        const start = vadd(vlerp(neckBottom, neckTop, 0.8 - layer * 0.37), b.v(5.4 * cx, 6.1 * sy, 0));
        const tip = vadd(start, b.v(3.4 * cx - 1.3 + sway, 3.8 * sy, -6.9 - 1.6 * cx + layer));
        furLock(r, start, tip, b.v(-2.3 * sy, 2.3 * cx, 0), b.v(1.55 * cx, 1.8 * sy, -1.45), c.snow, c.frost);
      }
    const crest = b.at(-3, 0, 7.4).turn(Math.PI);
    furTuft(r, crest, 7.8, 2.85, c.snow, c.frost);
    face(r, s, c);
    finishSurfaces(
      r,
      s.root,
      [
        [c.snow, 'fur'],
        [c.frost, 'fur'],
        [c.under, 'fur'],
        [c.eye, 'iris'],
        [c.ink, 'skin'],
        [c.lining, 'skin'],
        [c.liningShade, 'skin'],
      ],
      'fur',
    );
  },
};
