import { swimPoint, type SkySwimmerSkeleton, type SwimSection, type Paddle } from '../bodies/sky-swimmer';
import { drum, deckAxis, cliffIsland, boxHouse, cloudBank, compassStar } from '../bodies/kits/cloud-island';
import { F3, Rig, vadd, vlerp, vsub, vlen, vmul, type V3, type Mat, type RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import { hx, mixc } from '../kit/f11-mobkit';
import { finishSurfaces } from './surface-work';
import type { CreatureCard } from '../bodies/card-data';
import type { Variant, BodyFrame } from '../types';
const tau = 2 * Math.PI,
  clamp = (n: number) => Math.min(1, Math.max(0, n));
function palette(card: CreatureCard, gold: boolean, phase: number, morph: number) {
  const ramp = (name: string, ...idx: number[]): Mat => ({
    T: idx.map((i) => hx(card.materials.find((m) => m.name === name)!.tones[i])) as Mat['T'],
  });
  const tint = (a: Mat, b: Mat, t: number): Mat =>
    t ? { T: a.T.map((v, i) => mixc(v, b.T[i], t)) as Mat['T'] } : a;
  const direct = (...hex: string[]): Mat => ({ T: hex.map((v) => hx(v)) as Mat['T'] });
  const night = ramp('night', 0, 1, 2, 4),
    violet = ramp('night', 1, 2, 3, 5);
  return {
    ocean: tint(gold ? ramp('brass', 0, 1, 3, 4) : ramp('ocean', 0, 1, 3, 5), night, morph),
    sea: tint(ramp('ocean', 0, 2, 3, 4), violet, morph),
    reflection: tint(ramp('ocean', 0, 2, 3, 4), direct('#385663', '#668d8d', '#a1bfa6', '#e1dc98'), phase),
    mist: direct('#41566f', '#738eaa', '#aecad0', '#e5eece'),
    mistLight: { ...direct('#7896a1', '#adced0', '#dae5d6', '#fff2ca'), glow: 0.23 },
    deep: tint(ramp('ocean', 0, 1, 2, 3), night, morph),
    belly: tint(ramp('throat', 1, 2, 4, 5), violet, morph * 0.92),
    pleat: tint(ramp('throat', 0, 1, 2, 3), night, morph * 0.88),
    dark: direct('#1c2330', '#26313c', '#364452', '#4f6166'),
    metal: ramp('wood', 0, 1, 2, 3),
    stone: tint(ramp('stone', 0, 2, 3, 5), direct('#5a5963', '#918878', '#b3ac8c', '#f0dab3'), phase),
    cliff: tint(ramp('stone', 0, 1, 2, 3), direct('#3f555c', '#677e78', '#96a68c', '#c2c4a4'), phase),
    moss: tint(ramp('grass', 0, 1, 2, 4), direct('#385e64', '#5f8982', '#91aba0', '#cece97'), phase),
    grass: tint(ramp('grass', 1, 2, 4, 5), direct('#58786b', '#89a585', '#adba89', '#ece3a7'), phase),
    timber: ramp('wood', 1, 2, 3, 5),
    white: ramp('throat', 2, 3, 4, 5),
    red: ramp('red', 0, 1, 3, 4),
    brass: ramp('brass', 0, 1, 3, 4),
    gold: { ...ramp('brass', 1, 2, 4, 5), glow: 0.36 + phase * 0.4 },
    lamp: { ...ramp('brass', 2, 3, 4, 5), glow: 0.84 + phase * 0.16 },
    pearl: ramp('throat', 2, 3, 4, 5),
    cloudShadow: tint(ramp('ocean', 1, 2, 3, 4), violet, Math.max(phase * 0.66, morph)),
    cloud: tint(ramp('throat', 0, 2, 3, 4), violet, morph * 0.58),
    starlight: { ...direct('#7476a8', '#a7a4cf', '#d6d5ee', '#fff4c6'), glow: 0.56 },
  };
}
type P = ReturnType<typeof palette>;
function ovalFrame(q: SwimSection, angle: number, offset: number) {
  const normal = q.frame.v(0, Math.cos(angle), Math.sin(angle)),
    a = swimPoint(q, angle, offset);
  return new F3(a, normal, q.frame.f, q.frame.v(0, Math.sin(angle), -Math.cos(angle)));
}
function hull(r: Rig, s: SkySwimmerSkeleton, c: P) {
  const rings = s.sections,
    n = 20;
  for (let i = 1; i < rings.length; i++) {
    const a = rings[i - 1],
      b = rings[i];
    r.tag = i < 3 ? 'tail' : i > 8 ? 'head' : 'torso';
    for (let j = 0; j < n; j++) {
      const u = (j * tau) / n,
        v = ((j + 1) * tau) / n,
        sine = Math.sin((u + v) / 2);
      const m =
        sine < 0.29 + 0.1 * Math.sin((i - 5) * 0.52) && i >= 5
          ? c.belly
          : sine < -0.32
            ? c.pleat
            : sine > 0.3 && i >= 3 && i <= 9 && s.phase > 0.001
              ? c.reflection
              : sine > 0.47
                ? c.sea
                : sine > 0.12
                  ? c.ocean
                  : c.deep;
      r.poly([swimPoint(a, u), swimPoint(b, u), swimPoint(b, v), swimPoint(a, v)], m);
    }
  }
  // The grooves start at the projecting lower lip, then converge progressively under the fin roots.
  r.tag = 'throat';
  for (let j = 0; j < 18; j++) {
    const theta = 0.43 - (j * (Math.PI + 0.86)) / 17;
    for (let i = 5; i < 12; i++) {
      const g = (k: number) =>
        theta -
        0.52 * Math.cos(theta) * ((11 - k) / 7) ** 1.25 -
        0.18 * Math.sin(theta * 2) * Math.sin(((k - 4) * Math.PI) / 8);
      const a = swimPoint(rings[i - 1], g(i - 1), 0.24),
        b = swimPoint(rings[i], g(i), 0.24);
      r.cap(a, b, 0.34, 0.29, c.pleat);
      if (j % 2 === 0)
        r.line(
          swimPoint(rings[i - 1], g(i - 1) + 0.048, 0.29),
          swimPoint(rings[i], g(i) + 0.048, 0.29),
          c.belly.T[3],
          0,
          0.38,
        );
    }
  }
  const jaw = s.pose.jaw ?? 0;
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R',
      angle = (u: number) => (sign > 0 ? u : Math.PI - u);
    r.tag = 'snout';
    for (let i = 8; i < 12; i++) {
      const a = swimPoint(rings[i - 1], angle(0.34), 0.48),
        b = swimPoint(rings[i], angle(0.34), 0.52);
      r.cap(a, b, 0.86 + 0.55 * jaw, 0.64 + 0.75 * jaw, c.dark);
      if (jaw > 0.04)
        r.cap(vadd(a, s.body.v(0.4, 0, -1.55 * jaw)), vadd(b, s.body.v(0.2, 0, -2.2 * jaw)), 0.58, 0.45, c.belly);
    }
    const e = ovalFrame(rings[8], angle(0.55), 1.25);
    r.tag = 'eye' + suffix;
    const begin = r.size,
      closed = (s.pose.blink ?? (s.anim === 'sleep' ? 1 : 0)) > 0.55;
    r.ell(e, [0.15, -1.2, 0], [1.58, 4.5, closed ? 0.48 : 3.3], c.dark);
    if (!closed) {
      r.ell(e, [1.23, -1.05, 0.08], [1.37, 3.15, 2.3], c.gold);
      r.ell(e, [2.45, -0.86, -0.13], [0.99, 1.63, 1.81], c.dark);
      r.dot(e.p(3.24, -0.05, -1.02), c.white.T[3], 0.15, 0.61);
    }
    r.markEye(begin, sign, !closed);
    if (sign > 0) {
      r.eye = e.o;
      s.points.eyeR = e.o;
    }
    r.tag = 'head';
    for (const h of [0.82, 0.96]) {
      let prev = swimPoint(rings[6], angle(h - 0.12), 0.15);
      for (let i = 7; i <= 9; i++) {
        const now = swimPoint(rings[i], angle(h + (i === 8 ? 0.08 : 0)), 0.43);
        r.cap(prev, now, h > 0.5 ? 0.58 : 0.91, 0.58, h > 0.5 ? c.sea : c.ocean);
        prev = now;
      }
    }
    // Knuckles run along each side of the upper rostrum.
    for (let j = 0; j < 4; j++) {
      const sec = rings[9 + Math.floor(j / 2)],
        at = ovalFrame(sec, angle(0.49 + 0.2 * (j % 2)), 0.32);
      r.ell(at, [0.5, j % 2 ? 0.8 : -0.5, 0], [0.99, 1.48, 1.04], j % 2 ? c.pearl : c.pleat);
    }
    r.tag = 'torso';
    for (let i = 2; i < 7; i++) {
      const u = 0.22 + 0.13 * Math.sin(i * 1.5),
        a = swimPoint(rings[i], angle(u), 0.68),
        b = swimPoint(rings[i + 1], angle(u + 0.095), 0.6);
      r.line(a, b, c.gold.T[1], 0.19, 0.45);
      const star = ovalFrame(rings[i], angle(u), 0.75);
      compassStar(r, star, i % 2 ? 1.7 : 2.45, c.brass, c.gold);
      for (let k = 0; k < 3; k++)
        r.dot(
          star.p(0.1, 1.45 + k * 1.44, ((k % 2) - 0.5) * 1.37),
          k % 2 ? c.brass.T[2] : c.gold.T[2],
          0.27,
          0.43,
        );
    }
  }
  r.tag = 'snout';
  r.ell(rings.at(-1)!.frame, [0, 0, 0], [0.95, 1.24, 1.16], c.sea);
  // The double spiracle lifts with the breathing crest. An eccentric goal extends the whole rim.
  r.tag = 'blowhole';
  const bore = s.points.blowhole,
    surface = swimPoint(rings[8], Math.PI / 2);
  r.cap(surface, bore, 2.85, 2.31, c.sea);
  const hood = new F3(bore, s.body.f, s.body.s, s.body.u);
  for (const sign of [-1, 1]) {
    const g = hood.at(0, sign * 1.55, 0.67).turn(sign * 0.24);
    r.ell(g, [0, 0, 0], [2.65, 1.25, 0.68], c.deep);
    r.ell(g, [0.12, 0, 0.46], [1.98, 0.75, 0.37], c.dark);
  }
  r.tag = 'starKeel';
  const keel = s.points.starKeel,
    rest = swimPoint(rings[6], -0.89, 0.28);
  r.cap(rest, keel, 0.65, 0.49, c.brass);
  const f = new F3(keel, s.body.v(0.15, 0.93, -0.34), s.body.f, s.body.v(0, 0.34, 0.93));
  const circle = (a: number) => f.p(0.65, 4.15 * Math.cos(a), 3.8 * Math.sin(a));
  for (let i = 0; i < 12; i++) r.cap(circle((tau * i) / 12), circle((tau * (i + 1)) / 12), 0.35, 0.35, c.brass);
  compassStar(r, f.at(0.85, 0, 0), 5.45, c.brass, c.gold);
}
function paddle(r: Rig, s: SkySwimmerSkeleton, p: Paddle, c: P) {
  const sign = p.side,
    f = s.body;
  r.tag = 'fin' + (sign < 0 ? 'L' : 'R');
  const span = [2.1, 5.15, 6.8, 7.4, 6.9, 5.75, 3.45, 0.25];
  const center = (u: number) =>
    u <= 0.41 ? vlerp(p.root, p.knuckle, u / 0.41) : vlerp(p.knuckle, p.tip, (u - 0.41) / 0.59);
  for (let i = 1; i < span.length; i++) {
    const u = (i - 1) / 7,
      v = i / 7,
      a = center(u),
      b = center(v),
      ra = span[i - 1],
      rb = span[i];
    const at = (pos: V3, w: number, t: number, edge: number) =>
      vadd(
        pos,
        f.v(edge * w + Math.sin(Math.PI * t) * 1.1, sign * 0.12 * edge * w, (1 - Math.abs(edge)) * 0.27 * w),
      );
    for (const [lo, hi, mat] of [
      [-1, -0.7, c.belly],
      [-0.7, 0, c.ocean],
      [0, 0.71, c.sea],
      [0.71, 1, c.pleat],
    ] as const)
      r.poly([at(a, ra, u, lo), at(b, rb, v, lo), at(b, rb, v, hi), at(a, ra, u, hi)], mat);
    const ridge = at(b, rb, v, 0);
    if (i < 7) {
      r.cap(at(a, ra, u, -0.93), at(b, rb, v, -0.89), 0.62, 0.48, c.pearl);
      const star = new F3(vadd(ridge, f.v(0, 0, 0.39)), f.u, f.f, f.s);
      compassStar(r, star, i % 2 ? 1.03 : 1.77, c.brass, c.gold);
    }
  }
}
function caudal(r: Rig, s: SkySwimmerSkeleton, c: P) {
  const f = s.body,
    fork = s.points.tailFork,
    notch = s.points.tailTip;
  r.tag = 'tail';
  r.cap(s.tail[1], fork, 3.5, 2.55, c.ocean);
  r.cap(fork, notch, 2.3, 0.79, c.sea);
  for (const sign of [-1, 1]) {
    r.tag = 'fluke' + (sign < 0 ? 'L' : 'R');
    const tip = s.flukes[sign < 0 ? 0 : 1];
    const outer = vadd(vlerp(fork, tip, 0.47), f.v(7.65, sign * 2.45, 2.45));
    const crook = vadd(vlerp(notch, tip, 0.6), f.v(-6.2, sign * 0.8, -1.9));
    const ridge = vadd(vlerp(outer, crook, 0.48), f.v(0, 0, 1.45));
    r.poly([fork, outer, ridge, notch], c.ocean);
    r.poly([outer, tip, ridge], c.sea);
    r.poly([ridge, tip, crook, notch], c.ocean);
    r.cap(notch, crook, 0.65, 0.61, c.pleat);
    r.cap(crook, tip, 0.58, 0.17, c.belly);
    r.line(fork, ridge, c.sea.T[2], 0, 0.5);
    compassStar(r, new F3(ridge, f.u, f.s, f.f), 1.7, c.brass, c.gold);
  }
}
function island(r: Rig, s: SkySwimmerSkeleton, c: P) {
  const shelf = s.island,
    d = shelf.at(0, 0, 2.15),
    p = s.phase;
  r.tag = 'island';
  cliffIsland(r, new F3(shelf.o, shelf.f, shelf.s, vmul(shelf.u, 1.32)), c.stone, c.cliff, c.moss, c.grass);
  // Small individual turf cushions, fallen blocks and a stone path bind the architecture to its cliff.
  for (let i = 0; i < 14; i++) {
    const a = (tau * i) / 14,
      edge = d.at(14.1 * Math.cos(a), 7.5 * Math.sin(a), 6.8 + 0.5 * Math.sin(a * 2));
    r.ell(edge, [0, 0, 0], [1.9, 1.2, 0.91], i % 2 ? c.grass : c.moss);
    if (i % 2 === 0) r.cap(edge.p(-0.45, 0, -2.0), edge.p(1.45, 0.09, -2.25), 0.52, 0.34, c.timber);
    for (let j = 0; j < 2; j++)
      r.cap(edge.p(j * 0.68, 0, 0.1), edge.p(j * 0.65 + 0.35, 0.3, 0.98 + 0.25 * (i % 3)), 0.23, 0.08, c.grass);
    if (p > 0.15 && i % 2 === 0) {
      r.tag = 'islandWindows';
      const wall = d.at(15.7 * Math.cos(a), 8.55 * Math.sin(a), 3.6).turn(a);
      r.ell(wall, [0, 0, 0], [0.61, 1.4, 1.6], c.dark);
      r.ell(wall, [0.43, 0, 0], [0.57, 0.95 * p, 1.22 * p], c.lamp);
      r.line(wall.p(0.88, -0.99, 0.15), wall.p(0.88, 0.99, 0.15), c.metal.T[0], 0, 0.39);
      r.tag = 'island';
    }
  }
  r.tag = 'cottage';
  boxHouse(
    r,
    d.at(3.8, 4.1, 7.88).turn(0.27),
    7.0,
    3.1,
    5.6,
    c.stone,
    c.timber,
    c.red,
    p > 0.15 ? c.lamp : c.gold,
  );
  r.tag = 'pier';
  for (let i = 0; i < 7; i++) {
    const step = d.at(5.6 + i * 1.22, 5.0 + i * 0.34, 7.35 - i * 0.36);
    r.ell(step, [0, 0, 0], [0.95, 1.38, 0.45], i % 2 ? c.stone : c.white);
  }
  const pier = d.at(13.65, 5.1, 4.6).turn(0.28);
  for (let i = 0; i < 7; i++)
    r.cap(pier.p(i * 0.94, -2.2, 0), pier.p(i * 0.94, 2.2, 0), 0.61, 0.57, i % 2 ? c.timber : c.metal);
  for (const side of [-1, 1]) {
    for (const x of [0, 3.3, 6.3]) {
      r.cap(pier.p(x, side * 2, -2.25), pier.p(x, side * 2, 2.65), 0.4, 0.48, c.timber);
      r.ball(pier.p(x, side * 2, 2.65), 0.56, c.brass);
    }
    r.cap(pier.p(0, side * 2, 2.25), pier.p(3.3, side * 2, 1.95), 0.21, 0.18, c.metal);
    r.cap(pier.p(3.3, side * 2, 1.95), pier.p(6.3, side * 2, 2.25), 0.19, 0.2, c.metal);
  }
  s.points.islandPier = pier.p(6.3, 0, 0.3);
  r.tag = 'pine';
  const pine = d.at(6.7, -6.25, 7.25).roll(0.12 * s.wave(1.47));
  const a = pine.p(2.1, 0, 5.65),
    b = pine.p(5.2, -0.3, 8.65);
  r.cap(pine.o, a, 1.02, 0.71, c.timber);
  r.cap(a, b, 0.75, 0.48, c.timber);
  for (let i = 0; i < 5; i++) {
    const end = pine.p(2.46 + i * 0.67 + (i % 2 ? 1.3 : -1.7), -2.35 + i * 0.75, 7.45 + (i % 3) * 1.24);
    r.cap(a, end, 0.49, 0.21, c.timber);
    r.ell(new F3(end, d.f, d.s, d.u), [0, 0, 0], [2.65, 1.9, 1.17], c.moss);
    r.ell(new F3(end, d.f, d.s, d.u), [-0.45, -0.36, 0.64], [2.05, 1.35, 0.83], c.grass);
  }
  r.tag = 'tower';
  const base = d.p(-2.3, -0.4, 7.6),
    lens = s.points.lamp,
    axis = deckAxis(base, lens, d),
    len = vlen(vsub(lens, base)),
    h = Math.max(1.5, len - 4.6);
  drum(r, axis, 0, 2.4, 5.85, 5.2, c.stone, c.cliff, 12);
  drum(r, axis, 2.4, h, 5.38, 3.74, c.white, c.stone, 14);
  for (let i = 0; i < 14; i++) {
    const j = (i + 1) % 14,
      u = (tau * i) / 14,
      v = (tau * (i + 1)) / 14;
    const z = 0.2 + (0.27 * i) / 14,
      z2 = 0.2 + (0.27 * (i + 1)) / 14;
    const point = (a: number, t: number) =>
      axis.p(Math.cos(a) * (5.45 - 1.62 * t), Math.sin(a) * (5.45 - 1.62 * t), 2.4 + (h - 2.4) * t);
    r.poly([point(u, z), point(v, z2), point(v, z2 + 0.225), point(u, z + 0.225)], c.red, 0.33);
    if (i % 2 === 0) r.line(point(u, 0.02), point(u, 0.16), c.stone.T[2], 0, 0.28);
    if (j % 3 === 0) {
      const wall = axis.at(Math.cos(u) * 4.19, Math.sin(u) * 4.19, h * 0.73).turn(u);
      r.ell(wall, [0.25, 0, 0], [0.42, 0.85, 1.85], c.cliff);
      r.ell(wall, [0.55, 0, -0.02], [0.35, 0.51, 1.17], p > 0.15 ? c.lamp : c.gold);
    }
  }
  r.tag = 'balcony';
  drum(r, axis, h - 0.75, h + 0.42, 5.6, 6.25, c.cliff, c.metal, 12);
  const balcony = (j: number, z: number, rad = 5.95) =>
    axis.p(rad * Math.cos((tau * j) / 12), rad * Math.sin((tau * j) / 12), z);
  for (let j = 0; j < 12; j++) {
    r.cap(balcony(j, h + 0.25), balcony(j, h + 2.85), 0.22, 0.23, c.metal);
    r.cap(balcony(j, h + 2.7), balcony(j + 1, h + 2.7), 0.31, 0.29, c.brass);
  }
  r.tag = 'lamp';
  drum(r, axis, len - 2.55, len + 2.7, 2.82, 2.9, p > 0.2 ? c.lamp : c.gold, c.brass, 8);
  r.ell(axis, [0, 0, len], [2.68, 2.68, 2.16], c.lamp);
  for (let i = 0; i < 8; i++) {
    const a = (i * tau) / 8,
      post = (z: number) => axis.p(3.04 * Math.cos(a), 3.04 * Math.sin(a), len + z);
    r.cap(post(-2.6), post(2.85), 0.25, 0.27, c.metal);
    if (i % 2 === 0) r.line(post(-1.14), post(0.4), c.lamp.T[3], 0.78, 0.38);
  }
  r.tag = 'roof';
  drum(r, axis, len + 2.6, len + 3.4, 3.87, 4.08, c.brass, c.red, 10);
  drum(r, axis, len + 3.4, len + 7.4, 4.05, 0.44, c.red, c.metal, 10);
  const mast = axis.at(0, 0, len + 7.0).turn(0.4 * s.wave(1.25));
  r.tag = 'vane';
  r.cap(mast.o, mast.p(0, 0, 3.4), 0.34, 0.19, c.brass);
  r.line(mast.p(-2.35, 0, 2.4), mast.p(2.2, 0, 2.4), c.brass.T[3], 0, 0.53);
  r.poly([mast.p(2.6, 0, 2.5), mast.p(0.9, 0, 3.6), mast.p(0.9, 0, 1.7)], c.brass);
  if (p > 0.14) {
    r.tag = 'cloudRing';
    const grow = clamp((p - 0.14) / 0.86);
    // Break the tilted halo into banks of different lengths, leaving the tower visible between them.
    const banks = [
      [0.04, 19, 5.3],
      [0.53, 13, 4.2],
      [1.24, 16, 4.9],
      [2.13, 21, 5.8],
      [2.76, 13, 4.1],
      [3.39, 20, 5.5],
      [4.01, 13.4, 4.3],
      [4.84, 18, 5.6],
      [5.68, 16, 4.8],
    ];
    for (const [i, [a, span, height]] of banks.entries()) {
      const angle = a + 0.22 * s.wave(0.58),
        loc = d
          .at(28.8 * Math.cos(angle), 21.2 * Math.sin(angle), 23 + 5.4 * Math.cos(angle + 0.43))
          .turn(angle + Math.PI / 2);
      cloudBank(r, loc, span * grow, height * grow, c.mist, c.cloudShadow, c.mistLight);
      const light = loc
        .at(span * 0.53, 0.7, 2.6 + (i % 3))
        .turn(-angle)
        .pitch(-0.72);
      compassStar(r, light, (i % 3 === 0 ? 3.55 : 2.2) * grow, c.gold, c.lamp);
    }
    // Thick Fresnel bands open while the luminous optic is awake.
    r.tag = 'lamp';
    for (const z of [-1.42, 0, 1.42]) {
      const rad = 3.16 + 0.87 * grow;
      drum(r, axis, len + z - 0.31, len + z + 0.37, rad, rad, c.lamp, c.lamp, 12);
    }
    r.tag = 'islandWindows';
    for (const x of [1.4, 4.8]) {
      const win = d.at(3.8, 4.1, 7.88).turn(0.27).at(x, 3.32, 2.6);
      r.ell(win, [0, 0, 0], [1.05, 0.47, 1.53], c.lamp);
      r.line(win.p(0, 0.66, -1.22), win.p(0, 0.66, 1.25), c.timber.T[1], 0, 0.27);
    }
    const arch = d.at(-8.1, 8.15, 0.7).turn(Math.PI / 2);
    r.ell(arch, [0.69, 0, 1.28], [0.67, 2.8, 2.45], c.lamp);
    for (const x of [-1.6, 0, 1.6]) r.cap(arch.p(1.38, x, -0.38), arch.p(1.38, x, 2.9), 0.22, 0.2, c.timber);
  }
}
function constellation(r: Rig, s: SkySwimmerSkeleton, c: P) {
  if (s.morph < 0.08) return;
  const p = s.morph;
  for (const sign of [-1, 1]) {
    r.tag = 'veil';
    for (let i = 1; i < 11; i++) {
      const sec = s.sections[i],
        a = sign > 0 ? 0.64 + 0.25 * Math.sin(2.13 * i) : Math.PI - 0.64 - 0.25 * Math.sin(2.13 * i);
      const f = ovalFrame(sec, a, 1.03);
      compassStar(r, f, (2 + (i % 3)) * p, c.starlight, c.lamp);
      if (i > 1) {
        const before = swimPoint(
          s.sections[i - 1],
          sign > 0 ? 0.64 + 0.25 * Math.sin(2.13 * (i - 1)) : Math.PI - 0.64 - 0.25 * Math.sin(2.13 * (i - 1)),
          1.13,
        );
        r.line(before, f.o, c.starlight.T[2], 0.53, 0.42);
      }
      if (i % 2 === 0)
        cloudBank(
          r,
          sec.frame.at(0, sign * sec.width * 0.89, sec.height * 0.49).turn(0.38 * sign),
          7.1 * p,
          2.8 * p,
          c.cloud,
          c.cloudShadow,
          c.starlight,
        );
    }
  }
}
export function drawAltan(r: Rig, s: SkySwimmerSkeleton, card: CreatureCard, variant: Variant) {
  const c = palette(card, variant === 'gold', s.phase, s.morph);
  hull(r, s, c);
  for (const p of s.paddles) paddle(r, s, p, c);
  caudal(r, s, c);
  island(r, s, c);
  constellation(r, s, c);

  finishSurfaces(
    r,
    s.root,
    [
      [c.ocean, 'skin'],
      [c.belly, 'ivory'],
      [c.sea, 'skin'],
      [c.stone, 'granite'],
      [c.cliff, 'granite'],
      [c.grass, 'moss'],
      [c.moss, 'moss'],
      [c.timber, 'bamboo'],
      [c.metal, 'lacquer'],
      [c.brass, 'lacquer'],
      [c.red, 'lacquer'],
    ],
    'skin',
  );
}
// All materialising frames rasterise the complete posed animal. An atmospheric matte
// opens around its mid-back, feathering across the animal through lobes of graded mist.
function materialise(frame: BodyFrame, s: SkySwimmerSkeleton) {
  const v = s.reveal;
  if (v >= 1) return;
  const [cx, cy] = frame.points.cloudCenter,
    px = frame.px,
    lit = frame.lit;
  const reach = 4 + 145 * v,
    weight = clamp(v * 5),
    edge = 7 + 5 * Math.sin(Math.PI * v);
  for (let y = 0; y < px.h; y++)
    for (let x = 0; x < px.w; x++) {
      const k = (y * px.w + x) * 4,
        dx = x - cx,
        dy = y - cy;
      const dist =
        Math.hypot(dx * 0.96, dy * 1.05) +
        3.2 * Math.sin(0.18 * dx + 0.07 * dy) +
        2.3 * Math.cos(0.22 * dy - 0.12 * dx);
      const visibility = clamp((reach - dist) / edge) * weight;
      if (px.data[k + 3]) {
        const haze = (1 - visibility) * 0.8;
        for (let j = 0; j < 3; j++) px.data[k + j] = px.data[k + j] * (1 - haze) + [139, 171, 186][j] * haze;
        px.data[k + 3] = Math.round(px.data[k + 3] * visibility);
      }
      if (lit) lit.data[k + 3] = Math.round(lit.data[k + 3] * visibility);
    }
  const dark = s.pose.cloudDark ?? 0,
    opacity = clamp(1 - v / 0.73),
    pulse = Math.sin(s.t * 4.5);
  const cloudTone = (day: number[], blue: number[], storm: number[]) =>
    day.map((c, i) => {
      const calm = c + (blue[i] - c) * clamp(dark * 1.8);
      return calm + (storm[i] - calm) * clamp((dark - 0.48) / 0.52);
    });
  const shade = cloudTone([107, 143, 160], [42, 73, 106], [30, 26, 68]),
    light = cloudTone([222, 231, 218], [149, 177, 196], [105, 85, 151]);
  const fog = (x: number, y: number, rx: number, ry: number, depth: number, alpha: number) => {
    px.ell(x, y, rx, ry, (i, j) => {
      const u = (i + 0.5 - x) / rx,
        w = (j + 0.5 - y) / ry,
        h = Math.sqrt(Math.max(0, 1 - u * u - w * w)),
        rim = clamp((-0.67 * u - 0.92 * w - 0.62) * 3) * dark,
        value = clamp((-0.25 * u - 0.63 * w + 0.51 * h + depth) * 2.9) / 2 + 0.18;
      return [
        ...shade.map((a, k) => Math.round(a + (light[k] - a) * value + rim * [59, 79, 71][k])),
        Math.round(255 * alpha * clamp(h * 4)),
      ] as RGBA;
    });
  };
  if (opacity > 0) {
    const breadth = 1 + 0.55 * v;
    for (const [x, y, rx, ry, z] of [
      [-7, 1, 7, 4, -0.1],
      [9, 1, 7.8, 4.4, -0.05],
      [0, 2.8, 11.4, 4.1, -0.15],
      [-1.8, -1.5, 6.4, 6.8, 0.05],
      [6.4, -0.65, 5.2, 4.8, 0.1],
      [-9, -0.12, 4.6, 3.8, 0.06],
    ]) {
      fog(cx + x * breadth, cy + y + 0.45 * pulse * (x / 10), rx * breadth, ry * breadth, z, opacity);
    }
  }
  if (v > 0.045 && v < 0.83) {
    const mist = 0.57 * Math.sin(Math.PI * clamp((v - 0.045) / 0.785));
    for (let j = 0; j < 15; j++) {
      const a = (j * tau) / 15 + 0.065 * Math.sin(s.t * 2 + j),
        rad = reach * (0.88 + 0.06 * Math.sin(j * 2.7));
      fog(
        cx + rad * Math.cos(a),
        cy + rad * Math.sin(a) * 0.84,
        5.5 + 1.8 * (j % 3),
        3.65 + 1.42 * (j % 2),
        -0.16,
        mist,
      );
    }
  }
  if (v < 0.25 && (s.pose.sparks ?? 0) > 0.1)
    for (let j = 0; j < 5; j++) {
      const a = (j * tau) / 5 + s.t * 0.45;
      px.set(cx + Math.cos(a) * 9, cy + Math.sin(a) * 4.8, [
        255,
        222,
        151,
        Math.round(210 * (s.pose.sparks ?? 0)),
      ]);
    }
  if (v < 0.37) frame.eye = null;
}
export function beaconLight(frame: BodyFrame, s: SkySwimmerSkeleton) {
  materialise(frame, s);
  if (s.reveal < 0.5) return;
  const start = frame.points.lamp,
    end = frame.points.beamTip,
    dx = end[0] - start[0],
    dy = end[1] - start[1],
    len = Math.hypot(dx, dy);
  if (len < 0.8) return;
  const wake = Math.max(s.phase, clamp(s.pose.glow ?? 0));
  const lit = frame.lit ?? (frame.lit = new Px(frame.px.w, frame.px.h)),
    power = (0.45 + 0.86 * wake) * (s.pose.beamPower ?? 1) * clamp((s.reveal - 0.5) * 2);
  const w = 2.1 + wake * 6.7,
    ax = dx / len,
    ay = dy / len;
  const left = Math.max(0, Math.floor(Math.min(start[0], end[0]) - w - 4)),
    right = Math.min(lit.w - 1, Math.ceil(Math.max(start[0], end[0]) + w + 4)),
    top = Math.max(0, Math.floor(Math.min(start[1], end[1]) - w - 4)),
    bottom = Math.min(lit.h - 1, Math.ceil(Math.max(start[1], end[1]) + w + 4));
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const u = ((x + 0.5 - start[0]) * ax + (y + 0.5 - start[1]) * ay) / len;
      const cross = Math.abs((x + 0.5 - start[0]) * ay - (y + 0.5 - start[1]) * ax),
        rel = cross / (0.72 + w * Math.max(0, u));
      const distance = Math.hypot(x + 0.5 - start[0], y + 0.5 - start[1]),
        glow = clamp(1 - distance / (2.8 + wake * 6.2)) ** 2;
      let alpha = glow * 218,
        red = 255,
        green = 229,
        blue = 165;
      if (u > 0.025 && u < 1 && rel < 1) {
        const edge = wake * clamp((rel - 0.75) * 8);
        alpha += ((rel < 0.28 ? 174 : rel < 0.63 ? 102 : 57) + edge * 106) * (1 - u * 0.74) * clamp((1 - u) * 12);
        green -= edge * 29;
        blue -= edge * 73;
      }
      if (alpha > 0.7) lit.set(x, y, [red, green, blue, Math.min(255, Math.round(alpha * power))]);
    }
}
