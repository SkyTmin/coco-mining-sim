import type { CephalopodSkeleton, Ray } from '../bodies/cephalopod';
import { goalAt, toLocal } from '../bodies/goals';
import type { CreatureCard } from '../bodies/card-data';
import {
  beamFrame,
  clamp,
  cloudMembrane,
  galacticLane,
  nebulaRibbon,
  stellarFilament,
  tipStar,
  type Membrane,
} from '../bodies/kits/nebula';
import { hx, TAU, mixc } from '../kit/f11-mobkit';
import {
  F3,
  Rig,
  vadd,
  vsub,
  vmul,
  vlerp,
  vnorm,
  vlen,
  vcross,
  vdot,
  type V3,
  type Mat,
} from '../rig/f15-rig';
import type { Variant } from '../types';
import { finishSurfaces } from './surface-work';

function colors(card: CreatureCard, phase: number, gold: boolean) {
  const mat = (a: string, b: string, steps = [0, 2, 4, 5], glow = 0): Mat => {
    const sw = (n: string) => card.materials.find((m) => m.name === n)!.tones;
    const from = sw(gold ? 'amber' : a),
      to = sw(b);
    return { T: steps.map((i) => mixc(hx(from[i]), hx(to[i]), phase)) as Mat['T'], glow };
  };
  return {
    skin: mat('violet', 'rose', [0, 1, 3, 4]),
    under: mat('aqua', 'rose', [0, 2, 3, 5]),
    lip: mat('aqua', 'amber', [1, 2, 4, 5], 0.15),
    deep: mat('deep', 'violet', [0, 1, 2, 3]),
    rib: mat('aqua', 'amber', [1, 2, 4, 5], 0.25),
    fog: mat('violet', 'rose', [0, 2, 4, 5]),
    cloud: mat('violet', 'rose', [2, 3, 4, 5], 0.23),
    veil: mat('deep', 'amber', [1, 2, 3, 4], 0.13),
    iris: mat('amber', 'amber', [1, 2, 4, 5], 0.23),
    rose: mat('rose', 'amber', [1, 2, 3, 5], 0.35),
    star: mat('pearl', 'amber', [1, 2, 4, 5], 0.57),
    light: mat('amber', 'pearl', [2, 3, 4, 5], 0.84),
    line: mat('aqua', 'amber', [2, 3, 4, 5], 0.61),
  };
}
type C = ReturnType<typeof colors>;
function pinned(s: CephalopodSkeleton, name: string, rest: V3) {
  const p = goalAt(s.pose, name, toLocal(s.face, rest));
  return p ? s.face.p(...p) : rest;
}
function bezier(a: V3, b: V3, c: V3, d: V3, t: number) {
  return vlerp(vlerp(vlerp(a, b, t), vlerp(b, c, t), t), vlerp(vlerp(b, c, t), vlerp(c, d, t), t), t);
}
// As the arms change from a hanging fan to a wheel, bend each joint
// around the solid head, collar and eyes instead of passing through them.
function clearFace(p: V3, h: F3): V3 {
  const outside = (point: V3, basis: F3, radii: V3) => {
    const offset = toLocal(basis, point);
    const distance = Math.hypot(offset[0] / radii[0], offset[1] / radii[1], offset[2] / radii[2]);
    return distance < 1 ? basis.p(...vmul(offset, 1 / Math.max(0.001, distance))) : point;
  };
  let q = outside(p, h, [11.2, 12.7, 9.4]);
  q = outside(q, h.at(-1, 0, 4.2), [10.3, 13.1, 5.2]);
  for (const side of [-1, 1]) {
    const eye = h
      .at(4.3, side * 7.1, 0.5)
      .turn(side * 0.61)
      .at(1.2, 0, 0.1);
    q = outside(q, eye, [6.4, 6.5, 6.6]);
  }
  return q;
}
function shortArm(r: Rig, s: CephalopodSkeleton, arm: Ray, h: F3, wheel: number, comet: number, c: C) {
  const i = arm.index,
    ratio = i / 8,
    angle = ratio * TAU + 0.12;
  const center = h.p(-2, 0, 16),
    ring = (theta: number, radius: number) =>
      vadd(center, h.v(3 * Math.sin(2 * theta), radius * Math.cos(theta), radius * Math.sin(theta)));
  const walking = s.anim === 'walk' || s.anim === 'turn';
  const natural = arm.nodes,
    forced = s.pose['goal.star' + i + '.weight'] ?? s.pose['goal.arm' + i + '.weight'] ?? 0;
  const flank = Math.cos(angle) >= 0 ? 1 : -1;
  const cometTip = h.p(21 + i * 0.8, flank * (5 + (i % 4) * 2.8), -15 + (i % 3) * 1.5);
  const target = vlerp(vlerp(arm.tip, ring(angle, 33 + (i % 2) * 2), wheel), cometTip, comet);
  const tip = vlerp(target, arm.tip, clamp(forced)),
    points: V3[] = [];
  r.tag = 'arm' + i;
  for (let j = 0; j <= 12; j++) {
    const u = j / 12;
    const bottom = -Math.PI / 2 + flank * (0.34 + (i % 3) * 0.09),
      endAngle = flank < 0 && angle > bottom ? angle - TAU : angle;
    const travel = clamp((u - 0.19) / 0.81),
      theta = bottom + (endAngle - bottom) * travel;
    const circular = vlerp(natural[0], ring(theta, 30 + (i % 2) * 2 + 3 * travel), Math.min(1, u / 0.19));
    const trail = bezier(natural[0], h.p(4, flank * 10, -14), h.p(13, flank * 12, -15), cometTip, u);
    // Outside locomotion the gathered arm streams through the current. At a
    // walk its sucker bed goes back to the inherited body solver's floor track.
    const offset = vsub(arm.tip, natural[0]),
      along = vnorm([offset[0], offset[1], 0]),
      across: V3 = [-along[1], along[0], 0];
    const b = vadd(
      vlerp(natural[0], arm.tip, 0.36),
      vadd(vmul(across, 5.4 * Math.sin(angle + 0.5)), [0, 0, -6.6]),
    );
    const d = vadd(
      vlerp(natural[0], arm.tip, 0.74),
      vadd(vmul(across, -6.4 * Math.sin(angle + 0.95)), [0, 0, 4.5]),
    );
    const drift = bezier(natural[0], b, d, arm.tip, u);
    const carried = walking ? natural[j] : vlerp(natural[j], drift, 0.65);
    const formed = vlerp(vlerp(carried, circular, wheel), trail, comet);
    const p = vadd(formed, vmul(vsub(tip, target), u * u));
    points.push(
      wheel > 0 && j > 0 && (j < 12 || forced === 0) ? vlerp(p, clearFace(p, h), Math.min(1, wheel * 5)) : p,
    );
  }
  for (let j = 1; j <= 12; j++) {
    const a = points[j - 1],
      b = points[j],
      u = j / 12,
      l = (3.22 - 2.29 * u) * (1 - 0.24 * wheel);
    r.cap(a, b, l + 0.2, l, c.skin);
    const tangent = vnorm(vsub(b, a)),
      from = vnorm(vsub(a, s.body.o));
    const seed = vnorm(vadd(s.body.v(0.56, 0.49, 0.82), vmul(from, 0.42)));
    const cross = vnorm(vcross(tangent, seed)),
      n = vnorm(vcross(cross, tangent));
    if (j % 2 === 1 || j === 6) {
      for (const sign of [-1, 1]) {
        const normal = vnorm(vadd(n, vmul(cross, sign * 0.55))),
          cup = vadd(vlerp(a, b, 0.53), vmul(normal, l * 0.96));
        const basis = beamFrame(cup, vadd(cup, normal), tangent);
        r.ell(basis, [0, 0, 0], [0.39, 0.9 - u * 0.36, 1.03 - u * 0.45], c.lip);
        r.ell(basis, [0.35, 0, 0], [0.17, 0.39, 0.43], c.deep);
      }
    }
    if (j % 2 === 0) r.line(vadd(a, vmul(n, l * 0.99)), vadd(b, vmul(n, l * 0.8)), c.under.T[2], 0.1, 0.3);
  }
  r.tag = 'star' + i;
  const bright = 1 + 0.25 * (s.pose.glow ?? 0) + 0.32 * (s.pose.phase ?? (s.anim === 'idle-f2' ? 1 : 0));
  tipStar(r, points[12], h, 3.47 * bright + (i % 3) * 0.37, c.star, c.light);
  if (!walking) {
    s.points['pad' + i] = vadd(points[6], [0, 0, -2]);
    arm.down = s.points['pad' + i][2] < 0.1;
  }
  s.points['arm' + i] = points[12];
  s.points['star' + i] = points[12];
}
function clubs(r: Rig, s: CephalopodSkeleton, h: F3, wheel: number, comet: number, c: C) {
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R',
      name = 'club' + suffix,
      lag = Math.sin(s.phase - (sign > 0 ? 0.9 : 1.7)),
      fan = s.pose.clubFan ?? 0,
      curl = s.pose.clubCurl ?? 0;
    const root = h.p(-1, sign * (7 + wheel * 0.85), -3.4 - wheel * 2.2);
    // The hunting stalk forms a much longer U than a short arm. Only its terminal
    // fifth widens into a muscular, toothed, finned catching club.
    const natural = s.body.p(sign < 0 ? 21 : -10, sign * (36 + 5 * fan), 23 + lag * 2.3 + curl * 4);
    const ringCenter = h.p(-2, 0, 16);
    const rim = vadd(ringCenter, h.v(0, sign * 37, 7.5));
    const stream = h.p(38, sign * 20, -20 + sign * 2);
    const tip = pinned(s, name, vlerp(vlerp(natural, rim, wheel), stream, comet));
    const direction = vnorm(
      h.v(0.12 + comet * 0.65, -sign * (0.4 + curl * 0.18) * (1 - comet), 0.95 - comet * 1.5),
    );
    const distal = vsub(tip, vmul(direction, 13));
    const bend1 = h.p(-5, sign * (18 + 5 * fan), -25 + lag * 2);
    const bend2 = vadd(distal, h.v(-5, sign * (14 + curl * 3), -18 + lag * 2));
    r.tag = 'thread' + suffix;
    let previous = root;
    for (let j = 1; j <= 15; j++) {
      const u = j / 15;
      const base = bezier(root, bend1, bend2, distal, u);
      const a = sign * (1 - u) * 1.94,
        around = vadd(ringCenter, h.v(sign * 12 * Math.sin(a), sign * 36 * Math.cos(a), 34 * Math.sin(a)));
      const circular = vadd(vlerp(root, around, Math.min(1, u * 3)), vmul(vsub(distal, rim), u));
      const node = vlerp(vlerp(base, circular, wheel), vlerp(root, distal, u), comet);
      let p = j === 15 ? distal : wheel > 0 ? vlerp(node, clearFace(node, h), Math.min(1, wheel * 5)) : node;
      if (wheel > 0 && j < 15) {
        // The filament enters the paddle from its base, even when the
        // second hunting arm turns back to catch the astrolabe's stone.
        const ahead = vdot(vsub(p, distal), direction) + 1.25 * (1 - u);
        if (ahead > 0) p = vsub(p, vmul(direction, ahead * Math.min(1, wheel * 5)));
      }
      r.cap(previous, p, 1.75 - 0.74 * (u - 1 / 15), 1.75 - 0.74 * u, c.under);
      r.line(vadd(previous, h.v(0.3, 0.27, 0.78)), vadd(p, h.v(0.24, 0.25, 0.73)), c.rib.T[2], 0.15, 0.28);
      previous = p;
    }
    const axis = beamFrame(distal, tip, h.s);
    r.tag = name;
    r.ell(axis, [6.2, 0, 0], [6.3, 2.75, 2.15], c.skin);
    r.poly([axis.p(1.4, 0, 0.5), axis.p(4.7, sign * 3.9, 0.3), axis.p(10, sign * 2.1, 0.38), tip], c.under);
    for (let j = 0; j < 7; j++)
      for (const row of [-1, 1]) {
        const p = axis.at(
          2.1 + j * 1.32,
          row * (0.91 + 0.47 * Math.sin((j * Math.PI) / 6)),
          1.43 + 0.4 * Math.sin((j * Math.PI) / 6),
        );
        r.ell(p, [0, 0, 0], [0.81, 0.8, 0.44], c.lip);
        r.ell(p, [0, 0, 0.35], [0.39, 0.38, 0.18], c.deep);
      }
    r.line(axis.p(0.8, sign * 0.35, 1.1), axis.p(11.3, sign * 0.45, 1.4), c.rib.T[3], 0.28, 0.32);
    tipStar(r, tip, h, 4.75 + 0.6 * (s.pose.glow ?? 0), c.star, c.light);
    s.points[name] = tip;
    s.points['clubBase' + suffix] = distal;
    s.points['tentacleBase' + suffix] = root;
  }
}
function eyesAndFunnel(r: Rig, s: CephalopodSkeleton, h: F3, c: C) {
  r.tag = 'head';
  r.ell(h, [0, 0, 0], [9.4, 10.8, 7.45], c.skin);
  r.tag = 'collar';
  r.ell(h, [-1, 0, 4.2], [8.5, 11.1, 3.2], c.deep);
  for (let j = 0; j < 20; j++) {
    const a = (j * TAU) / 20,
      p = h.p(-1 + 8.65 * Math.cos(a), 10.6 * Math.sin(a), 4.45);
    r.cap(
      p,
      vadd(p, h.v(0.72 * Math.cos(a), 0.85 * Math.sin(a), 1.36)),
      0.62,
      0.28,
      j % 3 === 0 ? c.rib : c.cloud,
    );
  }
  for (const sign of [-1, 1]) {
    const e = h.at(4.3, sign * 7.1, 0.5).turn(sign * 0.61);
    r.tag = sign < 0 ? 'eyeL' : 'eyeR';
    const start = r.size;
    r.ell(e, [0, 0, 0], [3.7, 4.2, 4.55], c.deep);
    if (!s.life.blink) {
      r.ell(e, [1.3, 0, 0.12], [3.1, 3.6, 4.04], c.star);
      r.ell(e, [2.6, 0, 0.1], [2.17, 2.99, 3.41], c.iris);
      r.ell(e, [4.04, 0.1, 0.1], [1.02, 1.22, 2.58], c.deep);
      r.dot(e.p(5.0, -0.65, 1.52), c.light.T[3], 0.46, 1.35);
      if (sign > 0) r.eye = e.p(4.7, 0, 1.29);
    } else r.cap(e.p(3, -2.8, 0), e.p(3, 2.6, 0.28), 0.62, 0.45, c.deep);
    r.markEye(start, sign, !s.life.blink);
    r.cap(e.p(1, -sign * 3.25, 3.03), e.p(-1, sign * 3.05, 3.84), 0.87, 1.18, c.cloud);
    s.points[sign < 0 ? 'eyeL' : 'eyeR'] = e.p(4.5, 0, 0.5);
  }
  r.tag = 'funnel';
  const root = h.p(5.8, 1.9, -4.3),
    tip = pinned(s, 'funnel', h.p(13.1, 4.4, -4.3)),
    bend = vlerp(root, tip, 0.53);
  const elbow = vadd(bend, h.v(0, 0.55, -1.53));
  r.cap(root, elbow, 2.85, 2.42, c.under);
  r.cap(elbow, tip, 2.4, 2.7, c.skin);
  const g = beamFrame(elbow, tip, h.s),
    end = beamFrame(tip, vadd(tip, g.f), g.s);
  r.ell(end, [0, 0, 0], [0.64, 2.53, 2.42], c.lip);
  r.ell(end, [0.66, 0, 0], [0.18, 1.52, 1.48], c.deep);
  s.points.funnel = tip;
  s.points.mouth = tip;
}
function mantle(r: Rig, s: CephalopodSkeleton, h: F3, wheel: number, comet: number, phase: number, c: C) {
  const base = h.p(-2.7, 0, 5),
    pivot = h.pitch((s.pose.mantlePitch ?? 0) - comet * 0.36).roll(s.pose.mantleRoll ?? 0);
  const point = vlerp(vlerp(pivot.p(-23, 0, 50), h.p(-6.5, 0, 20), wheel), pivot.p(-31, 0, 70), comet);
  const tip = pinned(s, 'mantleTip', point),
    axis = beamFrame(base, tip, h.s),
    length = vlen(vsub(tip, base));
  const breathe = 0.67 * Math.sin(s.phase) + 1.75 * (s.pose.mantlePulse ?? 0) + 1.13 * (s.pose.harvest ?? 0);
  const radii = [7.4, 10.1, 12.7, 13.7, 12.95, 11.3, 8.45, 5.5, 3.2, 1.25, 0.12];
  const profile = (u: number) => {
    const z = clamp(u) * 10,
      j = Math.min(9, Math.floor(z)),
      k = z - j;
    return (
      (radii[j] * (1 - k) + radii[j + 1] * k) * (1 - wheel * 0.26 - comet * 0.36) +
      Math.sin(Math.PI * u) * breathe
    );
  };
  const surface: Membrane = (u, a, raise = 0) => {
    const radius = profile(u) + raise,
      k = u * (1 - u);
    return axis.p(length * u, Math.sin(a) * radius, Math.cos(a) * radius * (0.86 - wheel * 0.39) + k * 4);
  };
  r.tag = 'mantle';
  const drift = 0.24 * Math.sin(s.phase - 0.65);
  cloudMembrane(
    r,
    surface,
    axis,
    c.fog.T,
    [
      mixc(hx('#43488b'), hx('#89445a'), phase),
      mixc(hx('#ac7ada'), hx('#d78659'), phase),
      mixc(hx('#f4a6d3'), hx('#f9cf83'), phase),
      mixc(hx('#f6e5ed'), hx('#fff0c8'), phase),
    ],
    length,
    drift,
  );
  r.tag = 'mantleRim';
  for (const a of [-0.4, 1.34, 2.84, 4.27]) {
    let prev = surface(0, a, 0.2);
    for (let j = 1; j <= 12; j++) {
      const u = j / 12,
        p = surface(u, a + 0.18 * Math.sin(Math.PI * u), 0.24);
      r.cap(prev, p, 0.4 - 0.12 * u, 0.36 - 0.12 * u, c.cloud);
      prev = p;
    }
  }
  r.tag = 'mantleCloud';
  for (const [angle, width, start, turn] of [
    [0.2, 0.11, 0.07, 0.55],
    [2.11, 0.19, 0.11, 0.62],
    [3.68, 0.12, 0.28, 0.64],
    [5.11, 0.16, 0.02, 0.49],
  ]) {
    nebulaRibbon(r, surface, start, turn, angle, width, c.cloud, drift);
    nebulaRibbon(r, surface, start + 0.032, turn, angle + 0.21, width * 0.47, c.veil, drift);
  }
  // Small knots ride the membrane's local spiral, leaving translucent holes
  // between them. None of these lights is a hole cut out of the animal.
  for (let j = 0; j < 57; j++) {
    const u = 0.09 + 0.81 * ((j * 0.61803398875) % 1),
      a = j * 2.399963 + drift * 0.24;
    const p = surface(u, a, 0.43),
      k = j % 9 === 0 ? 1.05 : j % 3 === 0 ? 0.71 : 0.43;
    r.ell(axis, toAxis(axis, p), [k * 0.8, k * 0.55, k * 0.75], j % 7 === 0 ? c.rose : c.star);
    if (j % 13 === 1) r.dot(vadd(p, vmul(axis.u, 0.34)), c.star.T[3], 0.45, 0.94);
  }
  // Two logarithmic dust lanes turn around the warm condensation. Their
  // outer curls follow the transparent surface even when the mantle contracts.
  for (let k = 0; k < 2; k++) {
    for (let j = 1; j <= 30; j++) {
      const spiral = (n: number, offset: number) => {
        const u = n / 30,
          theta = k * Math.PI + u * TAU * 1.27 + drift * 0.71;
        return surface(
          0.37 + (0.008 + u * 0.153 + offset * 0.0035) * Math.cos(theta),
          2.17 + (0.065 + u * 0.91 + offset * 0.028) * Math.sin(theta),
          0.69,
        );
      };
      const shade = k === 0 ? (j < 10 ? c.rose : c.cloud) : j < 10 ? c.iris : c.veil;
      r.poly([spiral(j - 1, -1), spiral(j - 1, 1), spiral(j, 1), spiral(j, -1)], shade, 0.32);
      if (j % 5 === 0) r.dot(spiral(j, 0), shade.T[3], 0.38, 0.76);
    }
  }
  r.tag = 'mantleDust';
  for (const [u, offset, size] of [
    [0.21, -0.05, 1.75],
    [0.48, 0.06, 2.15],
    [0.68, -0.12, 1.65],
    [0.8, 0.15, 1.0],
  ]) {
    const a = galacticLane(u, drift) + offset;
    const at = surface(u, a, 1.05);
    const halo = { ...c.cloud, glow: 0.35, flat: 2 },
      warm = { ...c.light, glow: 0.9, flat: 2 };
    r.ball(at, size * 0.86, halo);
    const glint = surface(u, a, 1.1 + size * 0.99);
    r.ball(glint, size * 0.55, warm);
    r.dot(glint, c.star.T[3], 0.89, 1.48, 1.05);
    for (const [du, da, scale] of [
      [0.021, 0.17, 0.72],
      [-0.031, -0.132, 0.51],
      [0.025, -0.234, 0.42],
    ]) {
      r.dot(surface(u + du, a + da, 1.78), c.star.T[3], 0.68, scale * 1.65, 1.35);
    }
  }
  r.tag = 'nucleus';
  const nucleus = surface(0.37, 2.17, 0.95),
    halo = beamFrame(nucleus, vadd(nucleus, axis.f), axis.s);
  r.ell(halo, [0, 0, 0], [3.25, 2.89, 1.8], c.rose);
  r.ell(halo, [0, 0.47, -0.4], [2.13, 1.83, 1.55], c.iris);
  const glowCenter = surface(0.37, 2.17, 2.18);
  r.ball(glowCenter, 1.18, { ...c.light, glow: 0.96 });
  r.dot(vadd(glowCenter, h.v(0.8, 0.5, 0.39)), c.light.T[3], 0.98, 1.44);
  s.points.nucleus = nucleus;
  s.points.mantle = surface(0.32, Math.PI);
  r.tag = 'mantleRim';
  r.cap(surface(0.94, 0, 0.12), tip, 0.63, 0.22, c.rib);
  s.points.mantleTip = tip;
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R',
      lag = Math.sin(s.phase - (sign < 0 ? 0.66 : 1.14)),
      beat = (s.pose['finBeat' + suffix] ?? s.pose.finBeat ?? 0) + 0.12 * lag;
    const flap = clamp(0.36 + 0.48 * (s.pose.finSpread ?? 0) + beat * 0.3);
    // A swept rhomboid: it begins near the mantle spear, flares laterally and
    // curves back into the collar. Transparent panels carry five opaque fin rays.
    const fin = (u: number, v: number) => {
      const at = 0.26 + 0.64 * u,
        root = surface(at, (sign * Math.PI) / 2, 0.1);
      const bloom = Math.sin(Math.PI * u) ** 0.72,
        fan = (13 + 10 * flap) * (1 - wheel * 0.72 - comet * 0.86);
      return vadd(
        root,
        axis.v(
          -v * bloom * (10.5 + 2.8 * lag),
          sign * (fan + Math.sin(3.5 * Math.PI * u) * 1.9) * bloom * v,
          (beat * 9 + 3.4 * Math.sin(u * Math.PI * 1.7)) * v * bloom,
        ),
      );
    };
    r.tag = 'fin' + suffix;
    for (let j = 1; j <= 10; j++) {
      const a = (j - 1) / 10,
        b = j / 10;
      const transparency = j % 3 === 0 ? 210 : 227;
      const membrane = {
        ...c.deep,
        T: c.deep.T.map((tone, k) => [tone[0], tone[1], tone[2], k === 0 ? 213 : transparency]) as Mat['T'],
      };
      r.poly([fin(a, 0), fin(b, 0), fin(b, 0.57), fin(a, 0.57)], membrane);
      r.poly([fin(a, 0.57), fin(b, 0.57), fin(b, 1), fin(a, 1)], j % 3 === 0 ? c.under : membrane);
      r.cap(fin(a, 1), fin(b, 1), 0.57, 0.48, c.rib);
      if (j % 2 === 0) {
        const start = fin(b * 0.74 + 0.24, 0),
          mid = fin(b * 0.89 + 0.08, 0.47),
          end = fin(b, 1);
        r.cap(start, mid, 0.55, 0.42, c.rib);
        r.cap(mid, end, 0.41, 0.23, c.rib);
      }
    }
    s.points['fin' + suffix] = fin(0.43, 1);
  }
}
function toAxis(f: F3, p: V3): V3 {
  const d = vsub(p, f.o);
  return [vdot(d, f.f), vdot(d, f.s), vdot(d, f.u)];
}
export function drawNebulaSquid(r: Rig, s: CephalopodSkeleton, card: CreatureCard, variant: Variant) {
  const phase = clamp(s.pose.phase ?? (s.anim === 'idle-f2' ? 1 : 0)),
    wheel = clamp(s.pose.astrolabe ?? 0),
    comet = clamp(s.pose.comet ?? 0),
    c = colors(card, phase, variant === 'gold');
  const h = s.head.at(1.2, 0, -12.3).turn(0.22);
  s.points.head = h.o;
  for (const a of s.arms) shortArm(r, s, a, h, wheel, comet, c);
  clubs(r, s, h, wheel, comet, c);
  eyesAndFunnel(r, s, h, c);
  mantle(r, s, h, wheel, comet, phase, c);
  if (phase > 0.015 || wheel > 0.015) {
    const shimmer = Math.max(phase, wheel),
      material = {
        ...c.line,
        glow: 0.48 + 0.42 * shimmer,
        T: c.line.T.map((tone) => [tone[0], tone[1], tone[2], Math.round(239 * shimmer)]) as Mat['T'],
      };
    r.tag = 'constellation';
    for (const [a, b] of [
      ['clubL', 'star0'],
      ['star0', 'star1'],
      ['star1', 'star2'],
      ['star2', 'star3'],
      ['star3', 'clubR'],
      ['clubR', 'star4'],
      ['star4', 'star5'],
      ['star5', 'star6'],
      ['star6', 'star7'],
      ['star7', 'clubL'],
    ]) {
      stellarFilament(r, s.points[a], s.points[b], material, h.v(-0.6, 0.2, -1.35));
    }
  }
  const opaque = new Rig();
  opaque.prims = r.prims.filter(
    (p) =>
      p.t !== 'mantle' && p.t !== 'mantleDust' && !(p.k < 3 && 'm' in p && p.m.T.some((t) => t[3] < 255)),
  );
  finishSurfaces(
    opaque,
    s.face,
    [
      [c.skin, 'gill'],
      [c.deep, 'lacquer'],
      [c.cloud, 'gill'],
      [c.under, 'skin'],
      [c.iris, 'iris'],
      [c.star, 'ivory'],
      [c.rib, 'ice'],
    ],
    'ivory',
  );
  s.points.weaponTip = s.points.clubR;
  if (!s.life.blink) s.points.eye = s.points.eyeR;
}
