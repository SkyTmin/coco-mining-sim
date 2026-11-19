import type { CreatureCard } from '../bodies/card-data';
import type { CephalopodSkeleton } from '../bodies/cephalopod';
import { engraving, flightFeather, strapBuckle, foldedCloth } from '../bodies/kits/tailoring';
import { hx, TAU } from '../kit/f11-mobkit';
import { F3, Rig, vadd, vmul, vsub, vnorm, vlerp, type V3, type Mat, vcross } from '../rig/f15-rig';
import type { Variant } from '../types';
import { finishSurfaces } from './surface-work';
import { anchored, implementAxes, implementEnd, implementsByArm } from './ink_admiral-rig';

function colors(card: CreatureCard, gold: boolean) {
  const mat = (name: string, steps = [0, 2, 4, 5]): Mat => ({
    T: steps.map((i) => hx(card.materials.find((m) => m.name === name)!.tones[i])) as Mat['T'],
  });
  return {
    skin: mat(gold ? 'brass' : 'coral', [1, 2, 3, 4]),
    speck: mat('coral', [0, 1, 2, 3]),
    flesh: mat('pearl', [1, 2, 3, 4]),
    pearl: mat('pearl', [2, 3, 4, 5]),
    coat: mat('navy', [1, 2, 3, 4]),
    hat: mat('navy', [0, 1, 2, 3]),
    ink: mat('navy', [0, 0, 0, 1]),
    braid: mat('brass', [1, 2, 3, 4]),
    brass: mat('brass'),
    flare: mat('scarlet'),
    glass: mat('glass'),
    steel: mat('glass', [2, 3, 4, 5]),
  };
}
type C = ReturnType<typeof colors>;
function arm(r: Rig, s: CephalopodSkeleton, i: number, c: C) {
  const a = s.arms[i],
    n = a.nodes;
  r.tag = 'arm' + i;
  for (let j = 0; j < n.length - 1; j++) {
    const u = j / (n.length - 1),
      rad = (k: number) => 4.25 - 3.12 * k;
    const mid = vlerp(n[j], n[j + 1], 0.5);
    r.cap(n[j], n[j + 1], rad(u), rad((j + 1) / 12), c.skin);
    // Paired lips are set into the lateral surface, each with its own recessed lumen.
    const axis = vnorm(vsub(n[j + 1], n[j]));
    // The absorptive face runs along the twisted radial ray; its two rows
    // diverge across the tube rather than being painted on opposite sides.
    const radial = vnorm(vsub(a.pad, s.face.o));
    const view = vnorm(vadd(vmul(radial, 0.63), s.body.v(0.65, 0.45, 0.62)));
    const across = vnorm(vcross(axis, view));
    const face = vnorm(vcross(across, axis));
    for (const sign of [-1, 1]) {
      const normal = vnorm(vadd(face, vmul(across, sign * 0.54)));
      const cup = vadd(mid, vmul(normal, rad(u) * 0.98));
      const basis = new F3(cup, normal, across, vnorm(vcross(normal, across)));
      const wide = 1.22 - 0.66 * u;
      if ((j === 1 || j === 3 || j === 5) && sign < 0) continue;
      r.ell(basis, [0, 0, 0], [0.7, wide, wide * 0.92], j % 3 === 0 ? c.pearl : c.flesh);
      r.ell(basis, [0.68, 0, 0], [0.23, wide * 0.48, wide * 0.47], c.speck);
    }
    if (j < 9 && j % 2 === 0)
      r.ell(s.face, toSocket(s.face, vadd(mid, [0, 0, rad(u) * 0.88])), [1.3 - u, 0.85, 0.42], c.speck);
  }
  r.ball(a.tip, 1.4, c.skin);
}
function toSocket(f: F3, point: V3): V3 {
  const d = vsub(point, f.o);
  return [d[0] * f.f[0] + d[1] * f.f[1], d[0] * f.s[0] + d[1] * f.s[1], d[2]];
}
function coat(r: Rig, s: CephalopodSkeleton, c: C) {
  const b = s.body;
  r.tag = 'mantle';
  r.ell(b, [0, 0, -4], [9.4, 11.1, 8.5], c.skin);
  r.tag = 'coat';
  r.ell(b, [0, 0, 0.5], [11.4, 13.5, 14.6], c.coat);
  // Frac tails split over the back, facing patches wrap from shoulders to hips.
  for (const sign of [-1, 1]) {
    const panel = (u: number, v: number) =>
      b.p(-9.3 + 1.5 * v, sign * (0.65 + 7.5 * u + 1.4 * v), 3 - 20 * v + 3 * u * v);
    foldedCloth(r, panel, 4, c.coat, c.hat, c.braid);
    const lapel = [
      b.p(4, sign * 11, 8),
      b.p(7, sign * 8, 11),
      b.p(10.8, sign * 3.8, 1),
      b.p(9.9, sign * 7, 1.7),
    ];
    r.poly(lapel, c.hat);
    engraving(r, [lapel[1], lapel[2], lapel[3]], c.braid, true);
    for (let j = 0; j < 3; j++)
      r.ell(b, [10.9, sign * (3.9 + j * 0.28), 4.4 - j * 3.3], [0.92, 1.05, 1.05], c.brass);
    r.tag = sign < 0 ? 'epauletteL' : 'epauletteR';
    const ep = b.at(0.2, sign * 10.5, 9).roll(sign * 0.22);
    r.ell(ep, [0, 0, 0], [6, 4.4, 1.8], c.hat);
    r.ell(ep, [0.1, sign * 0.5, 1.1], [5.5, 4, 1.1], c.brass);
    const lag = Math.sin(s.phase - (sign < 0 ? 0.69 : 1.04)) * (s.anim === 'walk' ? 1 : 0.5);
    for (let j = 0; j < 9; j++) {
      const a = (j * Math.PI) / 8,
        root = ep.p(5 * Math.cos(a), sign * (1 + 2.9 * Math.sin(a)), 0.2);
      const end = vadd(root, ep.v(lag, sign * (1 + 0.5 * Math.sin(a)), -3.5 - 0.9 * Math.sin(a)));
      r.cap(root, end, 0.68, 0.48, j % 2 ? c.braid : c.brass);
    }
    r.tag = 'coat';
  }
  const back = b.at(-10.7, 0, 2);
  engraving(
    r,
    [back.p(0, -3.9, 0), back.p(0, -2, -2), back.p(0, 0, -3), back.p(0, 2, -2), back.p(0, 3.9, 0)],
    c.brass,
    true,
  );
  r.cap(back.p(0, 0, -3), back.p(0.2, 0, 4), 0.56, 0.45, c.brass);
  r.cap(back.p(0, -2.3, 2), back.p(0, 2.3, 2), 0.4, 0.4, c.brass);
  r.tag = 'sash';
  r.ell(b, [0, 0, -5.3], [11.65, 13, 2.65], c.flare);
  strapBuckle(r, b.at(11.6, 0.8, -4.7), 4.6, 4, c.brass, c.hat);
  r.tag = 'cravat';
  for (let j = 0; j < 3; j++) {
    const p = b.at(9.5 + j * 0.5, 0, 10 - j * 2);
    r.poly(
      [p.p(0, -3.9 + j * 0.5, 1), p.p(1.7, 0, -2.9), p.p(0, 3.9 - j * 0.5, 1), p.p(0.8, 0, 2.2)],
      c.pearl,
    );
  }
}
function face(r: Rig, s: CephalopodSkeleton, c: C) {
  const h = s.head.turn(0.33);
  r.tag = 'head';
  r.ell(h, [-1.3, 0, 2], [12.4, 13.0, 13.5], c.skin);
  for (let j = 0; j < 48; j++) {
    const a = j * 2.39996,
      z = -0.71 + (1.55 * (j + 0.5)) / 48,
      k = Math.sqrt(1 - z * z);
    const p = h.at(-1.3 + 12.07 * k * Math.cos(a), 12.67 * k * Math.sin(a), 2 + 13.32 * z);
    r.ell(p, [0, 0, 0], [1.25, 1.4, 0.8], c.speck);
  }
  const blink = s.life.blink;
  for (const sign of [-1, 1]) {
    const eye = h.at(7.25, sign * 7.1, 3.5).turn(sign * 0.46);
    r.tag = 'eye' + (sign < 0 ? 'L' : 'R');
    const start = r.size;
    r.ell(eye, [0, 0, 0], [3.6, 4.75, 5.65], c.speck);
    if (!blink) {
      r.ell(eye, [1.4, 0, 0], [3.25, 4.35, 5.2], c.pearl);
      r.ell(eye, [3.75, 0.12, 0.1], [1.8, 3.05, 3.95], c.brass);
      r.ell(eye, [4.95, 0.19, 0.12], [1.16, 1.85, 2.85], c.ink);
      r.dot(eye.p(6.1, -0.6, 1.8), c.pearl.T[3], 0, 1.3);
      if (sign === 1) r.eye = eye.p(5.7, 0, 1.45);
    } else r.cap(eye.p(3.5, -3, 0), eye.p(3.7, 3, 0.35), 0.74, 0.5, c.ink);
    r.markEye(start, sign, !blink);
    r.cap(eye.p(2, sign * -3.4, 3.8), eye.p(0.8, sign * 3.3, 5.9), 1.1, 1.65, c.speck);
  }
  r.tag = 'siphon';
  const z = h.at(10, 0, -2);
  r.cap(z.o, z.p(3.1, 0, -2.8), 2.9, 2.05, c.skin);
  r.cap(z.p(3.1, 0, -2.8), z.p(6.4, -0.7, -1.8), 2.15, 1.55, c.skin);
  r.ell(z, [6.55, -0.7, -1.8], [0.6, 1.35, 1.5], c.speck);
  r.ell(z, [7.05, -0.7, -1.8], [0.22, 0.63, 0.74], c.ink);
  s.points.mouth = z.p(7, -0.7, -1.8);
}
function tricorne(r: Rig, s: CephalopodSkeleton, c: C) {
  const seat = s.head.p(-1, 0, 11.7);
  const axes = new F3([0, 0, 0], s.head.f, s.head.s, s.head.u)
    .turn(0.25 + (s.pose.hatYaw ?? 0))
    .pitch(s.pose.hatPitch ?? 0)
    .roll(s.pose.hatRoll ?? 0);
  // The thin lit edge is a real vertex on strip 33 of the three-cornered brim.
  function brimVertex(a: number, u: number): V3 {
    const point = (0.5 + 0.5 * Math.cos(3 * (a + 0.1))) ** 1.3;
    const bow = Math.sin(Math.PI * u);
    return [
      Math.cos(a) * (9.8 + u * (3.2 + 7.9 * point)) - 1,
      Math.sin(a) * (10 + u * (4.8 + 10.6 * point)),
      -1.3 +
        u * (5.6 + 3.4 * Math.cos(a) - 2.5 * point) +
        1.6 * Math.cos(3 * a) * u -
        2.6 * bow +
        1.3 * point * u ** 5,
    ];
  }

  const edge = brimVertex(-Math.PI / 6, 1);
  const centerInHand = vsub(s.arms[7].tip, axes.v(...edge));
  const location = anchored('hat', s, vlerp(seat, centerInHand, s.pose.hatHand ?? 0));
  const h = new F3(location, axes.f, axes.s, axes.u);
  const rim = (a: number, u: number) => h.p(...brimVertex(a, u));
  s.points.hatSeat = seat;
  s.points.hatGrip = location;
  s.points.hat = location;
  s.points.hatRim = h.p(...edge);
  r.tag = 'hat';
  r.ell(h, [-1.6, 0, 3.1], [11.9, 13.2, 7.8], c.hat);
  for (let i = 0; i < 36; i++) {
    const a = (i * TAU) / 36,
      b = ((i + 1) * TAU) / 36;
    for (const [lo, hi] of [
      [0, 0.57],
      [0.57, 1],
    ])
      r.poly([rim(a, lo), rim(b, lo), rim(b, hi), rim(a, hi)], lo === 0 ? c.hat : c.coat);
    r.cap(rim(a, 1), rim(b, 1), 0.8, 0.8, c.brass);
    r.cap(rim(a, 0.77), rim(b, 0.77), 0.32, 0.32, c.braid);
  }
  // Brass anchor appliqué on the front of the raised cocked brim.
  const badge = h.at(14.5, 1.8, 4.4);
  for (const sign of [-1, 1]) {
    r.cap(badge.p(0, 0, -1.2), badge.p(-0.3, sign * 2.2, 0.2), 0.36, 0.33, c.braid);
    r.cap(badge.p(-0.3, sign * 2.2, 0.2), badge.p(-0.6, sign * 2.55, 1), 0.28, 0.2, c.brass);
  }
  r.cap(badge.p(-0.35, 0, -1.2), badge.p(-0.65, 0, 2.3), 0.38, 0.32, c.brass);
  const rosette = h.at(6.7, 12.7, 7.7);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    r.ell(rosette, [2.65 * Math.cos(a), 0, 2.65 * Math.sin(a)], [1.62, 1.02, 1.6], c.pearl);
  }
  r.ell(rosette, [0, 0.8, 0], [2.2, 1.2, 2.2], c.brass);
  r.tag = 'plume';
  const lag = Math.sin(s.phase - 0.95) * (s.anim === 'walk' ? 0.13 : 0.06);
  const quill = h
    .at(7.7, 13.4, 8.3)
    .turn(1.72)
    .pitch(-0.88 + lag)
    .roll(1.18);
  flightFeather(r, quill, 16.5, 5.6, c.flare, c.flare, c.braid);
  s.points.plume = quill.p(14, 1.8, 0);
}
function tool(r: Rig, s: CephalopodSkeleton, i: number, c: C) {
  const name = implementsByArm[i],
    axes = implementAxes(i, s),
    arm = s.arms[(s.pose[name + 'Hand'] ?? i + 1) - 1];
  // While handling the hat, the lantern slides back into an earlier coil.
  // Follow the physical chain for the transfer; its bail stays in contact.
  const transfer = i === 7 ? Math.max(s.pose.hatPickup ?? 0, s.pose.hatHand ?? 0) : 0;
  const node = 12 - 3 * Math.min(1, Math.max(0, transfer));
  const grip = vlerp(arm.nodes[Math.floor(node)], arm.nodes[Math.ceil(node)], node - Math.floor(node));
  const origin = anchored(name, s, grip),
    f = new F3(origin, axes.f, axes.s, axes.u);
  const end = implementEnd(i, s),
    tip = f.p(...end);
  s.points[name + 'Grip'] = origin;
  s.points[name] = tip;
  r.tag = name;
  const cap = (a: V3, b: V3, ra: number, rb: number, m: Mat) => r.cap(f.p(...a), f.p(...b), ra, rb, m);
  if (i === 0) {
    cap([0, 0, -2.3], [0, 0, 2.8], 0.9, 0.9, c.ink);
    for (let j = 0; j < 4; j++) cap([-0.1, 0, -1.8 + j], [0.1, 0.1, -1.48 + j], 1, 1, c.braid);
    const guard: V3[] = [
      [0, 0, -2.5],
      [-2, 1.1, -2],
      [-3.4, 1.35, 0],
      [-3.3, 0.85, 2.2],
      [-1.3, 0.2, 3.5],
      [1.7, 0, 3.2],
    ];
    guard.slice(1).forEach((p, j) => cap(guard[j], p, 0.65, 0.65, c.brass));
    const blade: V3[] = [[0, 0, 3], [0.8, 0, 8.5], [2.5, 0, 13.5], end],
      width = [1.3, 1.6, 1.32, 0];
    for (let j = 1; j < 4; j++) {
      const p = blade[j - 1],
        q = blade[j];
      for (const sign of [-1, 1]) {
        const edge = (a: V3, w: number) => f.p(a[0] + sign * w, a[1], a[2]);
        r.poly(
          [edge(p, width[j - 1]), edge(q, width[j]), f.p(q[0], 0.55, q[2]), f.p(p[0], 0.55, p[2])],
          sign < 0 ? c.pearl : c.steel,
        );
      }
    }
  } else if (i === 1) {
    cap([-3.8, 0, 0], [1, 0, 0], 1.45, 1.7, c.hat);
    cap([1, 0, 0], [6, 0, 0], 1.8, 2.1, c.braid);
    cap([6, 0, 0], [11.8, 0, 0], 2.2, 2.75, c.brass);
    for (const [x, w] of [
      [-3.5, 1.7],
      [0.8, 2],
      [5.8, 2.35],
      [11.2, 2.95],
    ])
      cap([x, 0, 0], [x + 0.5, 0, 0], w, w, c.braid);
    r.ell(f, end, [0.48, 2.3, 2.3], c.glass);
    r.dot(f.p(12.5, -0.6, 1), c.pearl.T[3], 0.2, 1);
  } else if (i === 2) {
    const w = end[1],
      sheet = (x: number, y: number) => f.p(3 + 0.62 * x, y, 2.4 - 1.6 * x + 0.35 * Math.cos(y));
    r.poly([sheet(-2.7, -w), sheet(2.8, -w), sheet(2, w), sheet(-2.7, w)], c.pearl);
    for (const side of [-1, 1]) r.cap(sheet(-2.7, w * side), sheet(2, w * side), 0.65, 0.65, c.pearl);
    engraving(r, [sheet(0, -w * 0.73), sheet(0.9, -1.5), sheet(-0.7, 0.8), sheet(0.8, w * 0.7)], c.braid);
    r.line(sheet(0.3, w * 0.46), sheet(1.8, w * 0.74), c.flare.T[1], 0, 1.3);
    r.line(sheet(1.8, w * 0.46), sheet(0.3, w * 0.74), c.flare.T[1], 0, 1.3);
  } else if (i === 3) {
    cap([0, 0, 1], [0, 0, -2], 0.75, 0.8, c.hat);
    cap([0, 0, -2], [0, 0, -5.5], 1.5, 3.4, c.brass);
    cap([0, 0, -5.5], end, 3.5, 3.7, c.braid);
    r.ell(f, [0, 0, -6.15], [3.1, 3.1, 0.45], c.hat);
    r.ball(f.p(0.2, 0, -7), 1.0, c.brass);
  } else if (i === 4) {
    cap([0, 0, -2], [0, 0, 11.8], 0.55, 0.46, c.brass);
    const flutter = 0.8 * Math.sin(s.phase - 1.15);
    const a = f.p(0, 0, 11.4),
      b = f.p(0.5, 3.2, 11.9 + flutter),
      d = f.p(0, 0, 6.4),
      e = f.p(0.5, 3.2, 7.3 + flutter);
    r.poly([a, b, e, d], c.flare);
    r.poly([b, f.p(0.2, 7, 11 + flutter), tip, e], c.flare);
    r.line(a, b, c.brass.T[3]);
    r.line(d, e, c.brass.T[2]);
    r.ball(f.p(0, 0, 12), 0.8, c.brass);
  } else if (i === 5) {
    r.ell(f, [0, 0, 0], [3.15, 3.15, 1.25], c.brass);
    r.ell(f, [0, 0, 0.9], [2.48, 2.48, 0.48], c.pearl);
    r.poly([f.p(2, 0, 1.48), f.p(-0.6, 0.65, 1.48), f.p(-1.5, -0.1, 1.48)], c.flare, 0.3);
  } else if (i === 6) {
    cap(end, [0.55, 0, 1], 0.27, 0.6, c.hat);
    const q = f
      .at(0.3, 0, 0.5)
      .turn(-0.45)
      .pitch(-1.02 + 0.09 * Math.sin(s.phase - 1.35))
      .roll(0.88);
    flightFeather(r, q, 9.3, 2.7, c.pearl, c.flesh, c.braid);
  } else {
    // The curved carrying bail keeps the glass outside the terminal sucker row.
    cap([0, 0, 0], [2.1, 0, 1.2], 0.55, 0.5, c.brass);
    cap([2.1, 0, 1.2], [5.5, 0, 0.7], 0.5, 0.5, c.brass);
    cap([5.5, 0, 0.7], [6.4, 0, -1.3], 0.5, 0.65, c.brass);
    cap([6.4, 0, -1], [6.4, 0, -2.3], 1, 2.7, c.braid);
    const glass = { ...c.glass, glow: 0.43, bias: 0.33 };
    r.ell(f, [6.4, 0, -4.3], [3.2, 3.2, 3.4], glass);
    for (let j = 0; j < 4; j++) {
      const a = (j * TAU) / 4;
      cap(
        [6.4 + 2.15 * Math.cos(a), 2.15 * Math.sin(a), -2.2],
        [6.4 + 2.2 * Math.cos(a), 2.2 * Math.sin(a), -6.5],
        0.41,
        0.41,
        c.braid,
      );
    }
    cap([6.4, 0, -6.4], end, 3.2, 2.7, c.brass);
  }
}
export function drawAdmiral(r: Rig, s: CephalopodSkeleton, card: CreatureCard, variant: Variant) {
  const c = colors(card, variant === 'gold');
  s.arms.forEach((a) => arm(r, s, a.index, c));
  coat(r, s, c);
  face(r, s, c);
  tricorne(r, s, c);
  s.arms.forEach((a) => tool(r, s, a.index, c));
  s.points.weaponTip = s.points.sabre;
  finishSurfaces(
    r,
    s.face,
    [
      [c.skin, 'skin'],
      [c.coat, 'brocade'],
      [c.hat, 'brocade'],
      [c.pearl, 'ivory'],
      [c.brass, 'lacquer'],
      [c.braid, 'lacquer'],
      [c.flesh, 'skin'],
    ],
    'ivory',
  );
}
