// A single articulated hare and one rigid glaive. Local axes are forward, right, up.
import { F3, Rig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';
import { tn, TAU } from '../kit/f11-mobkit';
import { projectFigure, scaleFigure } from '../rig/figure';
import { finishSurfaces } from './surface-work';
import { goalAt, toLocal } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import type { JointPose } from '../technique';
import {
  embroideredStar,
  engraving,
  foldedCloth,
  furLock,
  rivetedPlate,
  stitchedStrap,
} from '../bodies/kits/tailoring';

const card = readCreatureCard('moon_warden');
const portraitScale = 0.88;
const mat = (a: string, b: string, c: string, d: string): Mat => ({ T: tn(a, b, c, d) });
function swatch(name: string): Mat {
  const row = card.materials.find((m) => m.name === name)!.tones;
  return mat(
    row[0],
    row[Math.floor(row.length / 3)],
    row[Math.floor((row.length * 2) / 3)],
    row[row.length - 1],
  );
}
const pelt = swatch('fur'),
  silver = swatch('moonsteel'),
  plate = swatch('plate'),
  velvet = swatch('velvet'),
  gold = swatch('brass'),
  hide = swatch('leather');
const frost = mat('#645873', '#9c93a3', '#d9d3ce', '#fff2d8');
const ash = mat('#323148', '#555368', '#89869a', '#b6acc0');
const innerEar = mat('#493950', '#825a77', '#ba859c', '#e3aab2');
const lining = mat('#291e3f', '#432440', '#683751', '#94566b');
const velvetLight = mat('#2c2546', '#40345e', '#594674', '#786397');
const dark = mat('#141525', '#202238', '#333348', '#4b4655');
const amber = mat('#5a3027', '#aa6334', '#edb15a', '#ffdf89');
const braid = mat('#20424b', '#316f79', '#5ab8af', '#afe2cf');
const steelEdge = mat('#697481', '#94a4ad', '#c7d5d2', '#fff6df');
plate.spec = silver.spec = true;
// Short strands follow the long axis of the pelt. Shadows keep the large fur masses readable.
for (const m of [pelt, frost, ash]) {
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 18 + q[1] * 13 + q[2] * 5.5) * Math.cos(q[2] * 9 - q[1] * 9);
    return strand > 0.76 ? m.T[light > 0.74 ? 2 : light > 0.25 ? 1 : 0] : null;
  };
}
function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function taperedLimb(r: Rig, from: V3, to: V3, rw: number, rh: number, fur: Mat, facing: V3) {
  const f = axisFrame(vlerp(from, to, 0.5), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * 0.58], fur);
}
function pin(r: Rig, F: F3, f: number, y: number, z: number, radius: number, m: Mat) {
  r.ell(F, [f, y, z], [radius * 0.48, radius, radius], m);
}
function muzzle(r: Rig, H: F3, j: Record<string, V3>, blink: number, smile: number, puff: number) {
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [9.1, 8.8, 8.6], pelt);
  r.ell(H, [3.0, 0, -2.1], [8.1, 7.3, 5.9], frost);
  for (const s of [-1, 1]) {
    r.tag = 'cheek';
    for (let n = 0; n < 4; n++) {
      const z = -4.4 + n * 2.1;
      const tip = H.p(-7.8 - n * 0.5 - puff * 0.7, s * (10 + puff * 1.2), z - 2.4 + n * 0.56 + puff * 1.7);
      if (n === 2) j[s < 0 ? 'cheekTipL' : 'cheekTipR'] = tip;
      furLock(
        r,
        H.p(-0.4, s * 7.4, z),
        tip,
        H.v(2.8, 0, 1.2),
        H.v(0, s * 1.8, 0.35),
        n % 2 ? frost : pelt,
        ash,
      );
    }
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const E = H.at(4.9, s * 6.75, 2.0).turn(s * 0.54);
    j[r.tag] = E.o;
    const from = r.size;
    const open = Math.max(0.06, 1 - blink * 0.97 - smile * 0.32);
    r.ell(E, [0, 0, 0], [3.4, 2.35, 2.45 * open], dark);
    if (open > 0.28) {
      r.ell(E, [0.65, s * 1.78, 0.04], [1.92, 0.79, 1.77 * open], amber);
      r.ell(E, [0.91, s * 2.4, 0.1], [0.75, 0.4, 1.16 * open], dark);
      r.dot(E.p(1.25, s * 2.62, 0.79 * open), frost.T[3], 0, 1);
    }
    r.markEye(from, s, open > 0.28);
    r.cap(E.p(-2.65, s * 0.46, 2.05), E.p(2.5, s * 0.51, 2.5 - smile * 0.45), 1.03, 0.4, ash);
    r.tag = 'muzzle';
    r.ell(H, [9.3, s * 2.18, -2.8], [3.55, 2.72, 2.54], frost);
    for (let i = 0; i < 3; i++) {
      const root = H.p(10.9 - i * 0.62, s * (3.25 + 0.63 * i), -2.2 - i * 0.49);
      r.dot(root, ash.T[1], 0, 0.67);
      if (i < 2) r.line(root, H.p(7.5 + i * 0.65, s * (12.9 - i * 0.7), -1.5 - i * 2 + puff * 0.4), pelt.T[2]);
    }
  }
  r.tag = 'muzzle';
  r.ell(H, [12.25, 0, -1.25], [2.0, 2.48, 1.58], dark);
  engraving(r, [H.p(13.12, 0.2, -2.35), H.p(12.5, 0.2, -3.45), H.p(11, 2.5, -3.7 + smile)], ash);
  j.head = H.o;
  j.mouth = H.p(12.5, 0, -3.4);
  r.eye = blink < 0.75 ? j.eyeR : null;
}
function ear(r: Rig, H: F3, s: number, angle: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'ear' + name;
  // Asymmetry at the insertion and at the tip keeps the two pinnae separate.
  const E = H.at(-2.2, s * 4.5, 5.6)
    .turn(-s * (s > 0 ? 0.22 : 0.34))
    .pitch((s > 0 ? 0.36 : 0.66) + angle);
  const length = s > 0 ? 28.3 : 25.0;
  const stations = [0, 0.17, 0.41, 0.67, 0.86, 1],
    widths = [1.65, 3.1, 4.35, 3.38, 1.6, 0.12];
  const point = (u: number, w: number, h: number) => E.p(-length * u, w, 2.1 * Math.sin(u * Math.PI) + h);
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1],
      b = stations[i],
      wa = widths[i - 1],
      wb = widths[i];
    for (const side of [-1, 1]) {
      r.poly(
        [point(a, side * wa, 0), point(b, side * wb, 0), point(b, 0, -1.0), point(a, 0, -1.35)],
        i > 3 ? ash : pelt,
      );
      r.poly(
        [
          point(a, side * wa, 0),
          point(b, side * wb, 0),
          point(b, side * wb * 0.64, 1.1),
          point(a, side * wa * 0.64, 1.1),
        ],
        i > 3 ? ash : frost,
      );
      r.poly(
        [
          point(a, side * wa * 0.64, 1.1),
          point(b, side * wb * 0.64, 1.1),
          point(b, 0, 0.57),
          point(a, 0, 0.57),
        ],
        i === 5 ? ash : innerEar,
      );
    }
    if (i < 4) {
      const v = (a + b) * 0.5;
      furLock(
        r,
        point(v, s * wa * 0.94, 0),
        point(v + 0.15, s * (wa + 0.62), -0.75),
        E.v(1.4, 0, 0.2),
        E.v(0, 0, 0.45),
        frost,
        ash,
      );
    }
  }
  j['earTip' + name] = point(1, 0, 0);
}
function cape(r: Rig, B: F3, travel: number, tuck: number, breath: number, j: Record<string, V3>) {
  r.tag = 'cape';
  const surf = (u: number, v: number): V3 => {
    const a = (u - 0.5) * Math.PI * 1.12;
    const fold = Math.cos(u * Math.PI * 12) * v * (0.9 + v * 0.9);
    const flare = Math.max(0, (u - 0.46) / 0.54) ** 1.06 * v ** 1.35;
    const hem = 6 * Math.cos(u * Math.PI * 4 + 0.35) + 2 * Math.cos(u * Math.PI * 8);
    return B.p(
      -1.7 - (7.1 + v * (8.6 + travel * 5)) * Math.cos(a) - v * (3 + 4 * travel) + fold - 12 * flare,
      (9.1 + v * (13.8 + travel * 4)) * Math.sin(a) + 10.5 * flare + v * v * (1.3 * breath + travel * 2.8),
      19 - v * (44 + hem - tuck * 10) + fold * 0.5 + v * v * travel * 4,
    );
  };
  foldedCloth(r, surf, 12, velvetLight, velvet, gold);
  for (const u of [0.12, 0.38, 0.65, 0.88]) {
    const v = 0.46 + 0.12 * Math.sin(u * 9);
    const chain = [
      [u - 0.05, v + 0.12],
      [u, v],
      [u + 0.045, v + 0.035],
      [u + 0.078, v - 0.089],
    ];
    engraving(
      r,
      chain.map(([x, y]) => surf(x, y)),
      gold,
      true,
    );
    embroideredStar(r, surf, u, v, 0.56, gold);
    for (const [x, y] of [chain[0], chain[3]]) r.dot(surf(x, y), gold.T[2], 0, 0.7);
  }
  for (const u of [0, 1]) {
    const s = u ? 1 : -1;
    r.poly([surf(u, 0.15), surf(u, 0.73), surf(u, 1), B.p(-5, s * 12, -10)], lining);
  }
  j.capeTip = surf(0.24, 1);
}
function cuirass(r: Rig, B: F3, metal: Mat) {
  r.tag = 'torso';
  r.ell(B, [0, 0, 8], [7.8, 10.5, 13.4], velvet);
  r.ell(B, [-0.5, 0, -1.4], [7.7, 9.2, 6.8], pelt);
  r.tag = 'collar';
  r.ell(B, [0.4, 0, 18], [7.0, 10.1, 5.05], velvetLight);
  for (let i = 0; i < 11; i++) {
    const a = (i / 10) * Math.PI * 1.32 - 0.66 * Math.PI;
    const p = B.p(Math.cos(a) * 6.1, Math.sin(a) * 8.3, 19.5);
    furLock(
      r,
      p,
      B.p(7.3 * Math.cos(a), 9.7 * Math.sin(a), 16.1 + Math.cos(a * 2) * 0.65),
      B.v(-Math.sin(a) * 1.9, Math.cos(a) * 1.9, 0),
      B.v(Math.cos(a), Math.sin(a), 0.8),
      frost,
      pelt,
    );
  }
  r.tag = 'breastplate';
  rivetedPlate(r, B.at(5.4, 0, 11.2).pitch(-0.12), 9.85, 8.6, 3.4, { ...metal, bias: 0.27 }, gold);
  // Raised silver lunula: its open side exposes the breastplate.
  const C = B.at(8.72, 0, 14);
  for (let i = 0; i < 9; i++) {
    const vertex = (n: number, outer: boolean) => {
      const a = 0.04 * Math.PI + (n / 9) * 0.92 * Math.PI;
      return C.p(0, Math.cos(a) * (outer ? 5.6 : 4.8), -Math.sin(a) * (outer ? 5.3 : 2.72));
    };
    r.poly([vertex(i, true), vertex(i + 1, true), vertex(i + 1, false), vertex(i, false)], steelEdge, 0.16);
  }
  pin(r, C, 0.3, 0, 1.4, 1.5, gold);
  pin(r, C, 0.85, 0, 1.4, 0.92, amber);
  for (const s of [-1, 1]) {
    for (let n = 0; n < 2; n++) {
      const Q = B.at(3.3, s * (6.1 + 0.4 * n), 0.5 - 3.9 * n).turn(s * 0.68);
      rivetedPlate(r, Q, 4.68, 3.5, 1.25, metal, gold);
    }
  }
  r.tag = 'belt';
  const band = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i * Math.PI) / 6;
    band.push(B.p(8 * Math.cos(a), 9.2 * Math.sin(a), 1.1 + 1.45 * Math.sin(a)));
  }
  stitchedStrap(r, band, B.v(0, 0, 1.38), hide, gold);
  const baldric = [
    B.p(0.4, -9.7, 18.6),
    B.p(5.6, -7.8, 16.5),
    B.p(8, -5.8, 13.8),
    B.p(9, -1, 8.8),
    B.p(7.65, 3.7, 4.1),
    B.p(4, 8.4, 1.8),
  ];
  stitchedStrap(r, baldric, B.v(0, 1, 0.62), hide, gold);
  const Q = B.at(8, 1.7, 1.7);
  const buckle = [Q.p(0.2, -2, 1.6), Q.p(0.2, 2, 1.6), Q.p(0.2, 2, -1.6), Q.p(0.2, -2, -1.6)];
  for (let i = 0; i < 4; i++) r.cap(buckle[i], buckle[(i + 1) % 4], 0.52, 0.52, gold);
  r.line(Q.p(0.45, -1.8, 0), Q.p(0.45, 0.85, 0), gold.T[3]);
}
function leg(r: Rig, B: F3, root: F3, s: number, foot: V3, fold: number, metal: Mat, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = B.p(-1.75, s * 5.65, -0.5);
  const knee = vadd(vlerp(hip, foot, 0.4), root.v(6.9 + fold * 0.21, s * 1.25, 3.5));
  const hock = vadd(vlerp(hip, foot, 0.74), root.v(-6.7 - fold * 0.1, 0, 0));
  r.tag = 'thigh' + name;
  taperedLimb(r, hip, knee, 6.6, 5.5, pelt, root.f);
  r.cap(knee, hock, 4.2, 2.65, ash);
  r.cap(hock, foot, 2.83, 2.29, pelt);
  const K = axisFrame(knee, vsub(knee, hock), root.v(0.92, s * 0.45, 0));
  r.tag = 'knee' + name;
  rivetedPlate(r, K.at(3.35, 0, -0.75), 4.0, 4.6, 1.49, metal, gold);
  const shin = axisFrame(vlerp(hock, knee, 0.4), vsub(knee, hock), root.v(0.92, s * 0.45, 0));
  rivetedPlate(r, shin.at(2.9, 0, 0), 3.14, 5.35, 1.16, metal, silver);
  r.tag = 'foot' + name;
  const P = new F3(foot, root.f, root.s, root.u).turn(s * 0.09);
  r.ell(P, [1.8, 0, 2.2], [6.82, 4.3, 2.74], pelt);
  for (let i = -1; i <= 1; i++) {
    r.ell(P, [6.3 - Math.abs(i) * 1.2, i * 2.47, 1.66], [3.28, 1.52, 1.53], frost);
    r.cap(
      P.p(8.1 - Math.abs(i) * 1.2, i * 2.46, 2.02),
      P.p(9.25 - Math.abs(i) * 1.2, i * 2.47, 1.13),
      0.61,
      0.15,
      ash,
    );
  }
  for (const f of [-2, 0, 2])
    furLock(
      r,
      P.p(f, s * 2.5, 3.7),
      P.p(f - 2.1, s * 4.15, 1.65),
      P.v(1.6, 0, 0),
      P.v(0, s * 0.8, 0.9),
      frost,
      pelt,
    );
  j['knee' + name] = knee;
  j['foot' + name] = foot;
}
function arm(r: Rig, B: F3, s: number, hand: V3, metal: Mat, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(0.2, s * 9.6, 18.8);
  // The relaxed elbow points behind the arm's reach plane. It unfolds as the target recedes.
  const span = vsub(hand, shoulder),
    axis = vnorm(span),
    pole = B.v(-0.72, s * 0.72, -0.3);
  const bend = vnorm(vsub(pole, vmul(axis, vdot(pole, axis))));
  const elbow = vadd(
    vlerp(shoulder, hand, 0.52),
    vmul(bend, Math.sqrt(Math.max(1, 12.2 ** 2 - (Math.hypot(...span) * 0.49) ** 2))),
  );
  r.tag = 'arm' + name;
  r.cap(shoulder, elbow, 3.78, 3.17, velvetLight);
  r.cap(elbow, hand, 3.35, 2.1, pelt);
  const E = axisFrame(vlerp(elbow, hand, 0.52), vsub(elbow, hand), B.v(0.82, s * 0.8, 0.14));
  r.tag = 'elbow' + name;
  r.ell(E, [0, 0, 0], [3.5, 3.72, 5.35], hide);
  rivetedPlate(r, E.at(2.5, 0, 0), 3.13, 4.8, 1.4, metal, gold);
  r.tag = 'shoulder' + name;
  const S = B.at(-0.3, s * 9.85, 19.5)
    .turn(s * 0.86)
    .pitch(-0.18);
  r.ell(S, [0, 0, 0], [5.0, 6.15, s > 0 ? 4.25 : 3.5], metal);
  rivetedPlate(r, S.at(3.15, 0, 0.35), 5.48, s > 0 ? 4.4 : 3.65, 1.95, metal, gold);
  r.tag = 'hand' + name;
  const W = new F3(hand, B.f, B.s, B.u);
  r.ell(W, [0, 0, 0], [2.86, 2.66, 2.88], frost);
  for (let i = -1; i <= 1; i++)
    r.cap(W.p(1.18, s * 1.58, i * 1.37), W.p(2.23, -s * 0.38, i * 1.36 - 0.1), 0.88, 0.6, pelt);
  r.cap(W.p(0, -s * 1.75, 1.85), W.p(1.55, -s * 1.52, 0.25), 1.02, 0.66, frost);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function glaive(r: Rig, G: F3, tasselSwing: number, j: Record<string, V3>) {
  r.tag = 'glaive';
  r.cap(G.p(0, 0, -37), G.p(0, 0, 26.1), 1.05, 0.92, hide);
  r.cap(G.p(0, 0, -38), G.p(0, 0, -34.7), 1.47, 1.34, gold);
  for (const z of [-32, -12, -8, 5, 16.8, 20.1, 23.4, 25.2]) {
    r.cap(G.p(0, 0, z - 0.55), G.p(0, 0, z + 0.55), 1.44, 1.43, gold);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI * 0.5,
      z = -7 + i * 1.14;
    r.cap(
      G.p(Math.cos(a) * 1.07, Math.sin(a) * 1.07, z),
      G.p(Math.cos(a + 1.4) * 1.08, Math.sin(a + 1.4) * 1.08, z + 1),
      0.5,
      0.42,
      dark,
    );
  }
  r.tag = 'blade';
  // Two sharpened crescent horns share a solid socket. The concave edge is open air.
  const outer = [
    [0, 24.4],
    [-4.9, 25.8],
    [-9.0, 30],
    [-10.2, 35.0],
    [-8.5, 39.5],
    [-4.8, 43.0],
    [0, 46],
  ];
  const inner = [
    [2.35, 26],
    [0.75, 28.7],
    [-2.7, 30.65],
    [-4.9, 34.15],
    [-4.95, 38],
    [-3.1, 41.75],
    [0, 46],
  ];
  const point = (plane: number[], off: number) => G.p(plane[0], off, plane[1]);
  for (let i = 1; i < outer.length; i++) {
    for (const s of [-1, 1]) {
      const ridge = (k: number) =>
        G.p(
          outer[k][0] * 0.65 + inner[k][0] * 0.35,
          s * (k === 6 ? 0.02 : 0.96),
          outer[k][1] * 0.65 + inner[k][1] * 0.35,
        );
      r.poly([point(outer[i - 1], 0), point(outer[i], 0), ridge(i), ridge(i - 1)], silver);
      r.poly([ridge(i - 1), ridge(i), point(inner[i], 0), point(inner[i - 1], 0)], steelEdge);
    }
    engraving(r, [point(outer[i - 1], 0), point(outer[i], 0)], steelEdge, true);
  }
  for (const s of [-1, 1]) {
    r.poly([G.p(-1, 0, 25), G.p(2, s * 0.9, 30.6), G.p(7, 0, 34.4), G.p(3.55, 0, 27), G.p(2, 0, 24)], silver);
    r.poly([G.p(2, s * 0.9, 30.6), G.p(7, 0, 34.4), G.p(4.85, 0, 31), G.p(1, s * 0.25, 27.1)], steelEdge);
    engraving(
      r,
      [G.p(-3, s * 1.04, 27), G.p(-6.2, s * 1.02, 30.2), G.p(-6, s * 1.04, 31.2), G.p(-7.7, s * 0.9, 33.5)],
      gold,
      true,
    );
  }
  r.tag = 'tassel';
  const knot = G.p(1.8, 0, 23.2),
    end = G.p(3.4 + tasselSwing, 1.25, 14.65 + Math.abs(tasselSwing) * 0.4);
  r.ball(knot, 1.45, gold);
  r.cap(knot, vlerp(knot, end, 0.53), 0.6, 0.72, braid);
  for (const i of [-1, 0, 1])
    r.cap(vlerp(knot, end, 0.48), vadd(end, G.v(i, 0, 0.49 * Math.abs(i))), 1.04, 0.48, braid);
  j.weaponGrip = G.o;
  j.weaponTip = G.p(0, 0, 46);
  j.weaponHeel = G.p(0, 0, -38);
  j.tassel = end;
}
type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export function moonFigureWithHistory(sample: PoseSample): Figure {
  return (anim, t, side, variant, pose, gait) => {
    const get = (key: string) => pose[key] ?? 0,
      A = pose as JointPose;
    const r = new Rig(),
      j: Record<string, V3> = {},
      planted: string[] = [];
    const F = F3.yaw(card.life.yaw + (side * Math.PI) / 8);
    const sleep = get('sleep'),
      jump = get('jump'),
      tuck = get('tuck');
    const fatigue = gait.tired,
      crouch = get('squat') + sleep * 19 + fatigue * 6;
    const q = anim === 'idle' ? (t * TAU) / 3 : anim === 'walk' ? t * TAU : 0;
    const motion = Math.sin(q),
      restWind = 0.12 * Math.sin(q - 0.8) + 0.09;
    // Sample the same scoring timeline at separate travel times along each trim.
    // A direct seek, reverse scrub or parallel atlas build gets the identical response.
    const period = anim === 'idle' ? 3 : anim === 'walk' ? 1 : anim === 'sleep' ? 3.5 : 0;
    const previous = (frames: number) => {
      const time = t - frames / 24;
      return sample(anim, period ? ((time % period) + period) % period : Math.max(0, time));
    };
    const lag = (p: JointPose, k: string) => p[k] ?? 0;
    const leftEar = previous(2),
      rightEar = previous(3),
      hem = previous(5),
      fringe = previous(4),
      cheeks = previous(2.5);
    const earFollow = (p: JointPose) =>
      lag(p, 'ear') +
      0.25 * (lag(p, 'nod') - get('nod')) +
      0.16 * (lag(p, 'pitch') - get('pitch')) +
      0.13 * Math.sin(lag(p, 'flip')) -
      0.1 * lag(p, 'tuck');
    const hips = F.at(-sleep * 3, 0, 31 + jump - crouch + gait.breath * 0.6);
    const airborne = hips.pitch(get('flip'));
    const body = airborne
      .pitch(get('pitch') + sleep * 0.43 + fatigue * 0.24)
      .roll(get('roll') + gait.roll)
      .turn(get('twist'));
    const head = body
      .at(2.8 + sleep * 1.3, 0, 33.4 - sleep * 5)
      .turn(get('gaze'))
      .pitch(get('nod') - 0.09 - get('pitch') * 0.2 + sleep * 0.21 + fatigue * 0.12);
    const metal = variant === 'gold' ? gold : plate;
    const wind =
      lag(hem, 'cape') +
      lag(hem, 'pitch') * 0.47 +
      Math.sin(lag(hem, 'flip') - 0.28) * lag(hem, 'tuck') * 0.5 +
      restWind;
    cape(r, body, wind, tuck, motion, j);
    r.tag = 'tail';
    r.ell(body, [-8.2, 0, -0.8], [4.85, 4.2, 4.2], frost);
    cuirass(r, body, metal);
    j.torso = body.p(0, 0, 8.4);
    const relaxedPoint = (v: V3) => airborne.p(v[0], v[1], v[2] - 31);
    for (let index = 0; index < 2; index++) {
      const s = index ? 1 : -1,
        name = s < 0 ? 'L' : 'R',
        step = gait.feet[index];
      const up = step.lift * 6.5;
      const footRest: V3 = [
        -s * 4.6 + step.forward / portraitScale - tuck * 10 + sleep * 3,
        s * (8.3 + tuck * 1.8),
        up + tuck * 18,
      ];
      const local = goalAt(A, 'foot' + name, footRest) ?? footRest;
      const point =
        tuck || Math.abs(Math.sin(get('flip') / 2)) > 0.0001
          ? airborne.p(local[0], local[1], local[2] - 31)
          : F.p(local[0], local[1], local[2] + jump);
      leg(r, body, airborne, s, point, crouch, metal, j);
      if (step.planted && Math.abs(point[2]) < 0.08) planted.push('foot' + name);
    }
    r.tag = 'neck';
    r.cap(body.p(1.8, 0, 18.8), head.p(-1, 0, -3), 4.95, 4.6, pelt);
    muzzle(
      r,
      head,
      j,
      get('blink'),
      get('smile'),
      restWind +
        lag(cheeks, 'ear') +
        2 * (lag(cheeks, 'nod') - get('nod')) +
        0.4 * Math.sin(lag(cheeks, 'flip')),
    );
    for (const s of [-1, 1])
      ear(
        r,
        head,
        s,
        earFollow(s < 0 ? leftEar : rightEar) * (s > 0 ? 0.78 : 1.05) +
          lag(hem, 'cape') * 0.075 +
          0.05 * motion * s,
        j,
      );
    const walk = anim === 'walk' ? 1 : 0;
    const axes = F.turn(get('shaftYaw')).pitch(get('shaftPitch') + walk * (0.16 + 0.045 * motion));
    const carry: V3 = [3 - walk * 2 * motion, 24, 38 + walk * 3.4];
    const rightRest = vlerp(relaxedPoint(carry), F.p(...carry), sleep);
    const target = (key: string, rest: V3) => {
      const p = goalAt(A, key, toLocal(F, rest));
      return p ? F.p(...p) : rest;
    };
    let right = target('handR', rightRest),
      grip = target('weaponGrip', right);
    let dir = axes.u;
    for (const [socket, length] of [
      ['weaponTip', 46],
      ['weaponHeel', -38],
    ] as const) {
      const weight = Math.min(1, get('goal.' + socket + '.weight'));
      if (!weight) continue;
      const goal = F.p(...goalAt(A, socket)!);
      const aimed = vnorm(vmul(vsub(goal, grip), Math.sign(length)));
      dir = vnorm(vlerp(dir, aimed, weight));
      grip = vlerp(grip, vsub(goal, vmul(dir, length)), weight);
      if (!get('goal.weaponGrip.weight')) right = grip;
    }
    // A planted butt supports the guard while the hips sink; both feet can still articulate.
    const clearance = Math.min(grip[2] - 38 * dir[2], grip[2] + 46 * dir[2]);
    if (clearance < 0) {
      grip = vadd(grip, [0, 0, -clearance]);
      if (!get('goal.weaponGrip.weight')) right = grip;
    }
    // Preserve the orientation of the crescent through an end-over-end rotation.
    let across = vcross(axes.s, dir);
    if (Math.hypot(...across) < 0.001) across = axes.f;
    const G = axisFrame(grip, dir, across).turn(-0.76);
    let left = target('handL', body.p(6.9, -10.5, 4.1));
    left = vlerp(left, G.p(0, 0, 10), get('twoHand'));
    arm(r, body, -1, left, metal, j);
    arm(r, body, 1, right, metal, j);
    glaive(
      r,
      G,
      restWind * 2.1 +
        Math.sin(lag(fringe, 'shaftPitch')) * 2.9 +
        lag(fringe, 'cape') * 2.5 +
        3 * Math.sin(lag(fringe, 'shaftPitch') - get('shaftPitch')),
      j,
    );
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(
      r,
      F,
      [
        [pelt, 'fur'],
        [frost, 'fur'],
        [ash, 'fur'],
        [plate, 'lacquer'],
        [silver, 'ice'],
        [steelEdge, 'ice'],
        [hide, 'strap'],
        [gold, 'ivory'],
        [amber, 'iris'],
        [dark, 'iris'],
        [velvet, 'paper'],
        [velvetLight, 'paper'],
        [lining, 'paper'],
      ],
      'skin',
    );
    scaleFigure(r, j, portraitScale);
    const frame = projectFigure(r, 96, [48, 78], j, '#232135', 4.4, true);
    frame.planted = planted;
    return frame;
  };
}
