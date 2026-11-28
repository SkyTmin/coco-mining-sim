// Мурлен, лунный фокусник: a smoky-blue cat on two legs with a top hat, a star-lined cape,
// an emerald waistcoat, white gloves and a black wand. Local axes are forward, right, up.
// The second form (pose.form → 1) turns the cape lining into the night sky, lights the eyes and the wand,
// and lifts the hat above the head.
import { F3, Rig, renderRig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU } from '../kit/f11-mobkit';
import { projectFigure, scaleFigure } from '../rig/figure';
import { finishSurfaces } from './surface-work';
import { goalAt, toLocal } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import type { JointPose } from '../technique';
import { embroideredStar, engraving, foldedCloth, furLock } from '../bodies/kits/tailoring';

const card = readCreatureCard('moon_magician');
export const portraitScale = 1.55;
export const WAND = 21;
const mat = (a: string, b: string, c: string, d: string): Mat => ({ T: tn(a, b, c, d) });
function swatch(name: string): Mat {
  const row = card.materials.find((m) => m.name === name)!.tones;
  return mat(row[0], row[Math.floor(row.length / 3)], row[Math.floor((row.length * 2) / 3)], row[row.length - 1]);
}
const pelt = swatch('fur'),
  cream = swatch('cream'),
  velvet = swatch('velvet'),
  lining = swatch('lining'),
  silk = swatch('silk'),
  vest = swatch('vest'),
  silver = swatch('silver'),
  gold = swatch('gold');
const stripe = mat('#1d1e2d', '#2b2d42', '#3d4058', '#565a76');
const velvetLight = mat('#1b2246', '#283463', '#394b84', '#5571a8');
const innerEar = mat('#4d3346', '#87566c', '#c0849a', '#e8b0bb');
const nose = mat('#5c2f3e', '#9a4e62', '#d07f8d', '#f2b4b8');
const dark = mat('#0d0d16', '#181826', '#26263a', '#3b3b55');
const amber = mat('#5b3418', '#a8682a', '#e7b048', '#ffe39a');
const glowEye = mat('#3a6a8a', '#6fb2d0', '#bdf0ff', '#ffffff');
const pad = mat('#5a3442', '#8e5466', '#c0808f', '#e7b2b8');
const sky = mat('#0a0d24', '#141a3e', '#1f2a5a', '#33457e');
const brimEdge = mat('#14141f', '#22222f', '#3a3a52', '#6a6a88');
const skyLight = mat('#121a44', '#1f2c64', '#33468a', '#5670b8');
const starTrim = mat('#4a5aa0', '#8ea4f0', '#d4e0ff', '#ffffff');
skyLight.pat = (q, light) => {
  const n = Math.sin(q[0] * 83.1 + q[1] * 41.7) * Math.sin(q[2] * 47.3 - q[1] * 13.9);
  if (n > 0.94) return hx('#ffffff');
  if (n > 0.88) return hx('#a9bcff');
  return light > 0.82 ? skyLight.T[2] : null;
};
skyLight.glow = 0.3;
silver.spec = true;
silk.spec = true;
// Short strands and soft tabby bars keep the large fur masses readable at painting scale.
for (const m of [pelt, cream]) {
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 19 + q[1] * 13 + q[2] * 5.5) * Math.cos(q[2] * 9 - q[1] * 9);
    return strand > 0.78 ? m.T[light > 0.74 ? 2 : light > 0.25 ? 1 : 0] : null;
  };
}
vest.pat = (q, light) => {
  const a = Math.abs(((q[1] * 3.2 + q[2] * 3.2) % 1 + 1) % 1 - 0.5),
    b = Math.abs(((q[1] * 3.2 - q[2] * 3.2) % 1 + 1) % 1 - 0.5);
  return a < 0.05 || b < 0.05 ? vest.T[light > 0.5 ? 3 : 2] : null;
};
// The second-form lining: a deep night with fixed stars that do not swim with the folds.
sky.pat = (q, light) => {
  const n = Math.sin(q[0] * 91.7 + q[1] * 37.3) * Math.sin(q[2] * 53.1 - q[0] * 17.9);
  if (n > 0.93) return hx('#f4f1ff');
  if (n > 0.86) return hx('#9fb4ff');
  return light > 0.8 ? sky.T[2] : null;
};
sky.glow = 0.35;

function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function taperedLimb(r: Rig, from: V3, to: V3, rw: number, rh: number, fur: Mat, facing: V3) {
  const f = axisFrame(vlerp(from, to, 0.5), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * 0.58], fur);
}
function ring(r: Rig, F: F3, radius: number, z: number, thick: number, m: Mat, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      b = ((i + 1) / n) * TAU;
    r.cap(F.p(Math.cos(a) * radius, Math.sin(a) * radius, z), F.p(Math.cos(b) * radius, Math.sin(b) * radius, z), thick, thick, m);
  }
}

function head(r: Rig, H: F3, j: Record<string, V3>, blink: number, smile: number, puff: number, form: number, mouth: number) {
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [9.6, 10.2, 8.9], pelt);
  r.ell(H, [-1.2, 0, 1.4], [8.6, 9.6, 7.9], pelt);
  // Tabby bars on the forehead and the white blaze down the nose.
  for (const s of [-1, 0, 1]) {
    engraving(r, [H.p(6.2, s * 2.3, 6.1), H.p(3.2, s * 2.7, 8.2), H.p(-0.6, s * 3.1, 8.9)], stripe);
  }
  engraving(r, [H.p(8.7, 0, 3.1), H.p(9.6, 0, 0.4)], cream, true);
  for (const s of [-1, 1]) {
    r.tag = 'cheek';
    for (let n = 0; n < 6; n++) {
      const z = -5.2 + n * 1.45;
      const tip = H.p(-3.6 - n * 0.6 - puff * 0.6, s * (11.6 + puff * 1.1 - n * 0.35), z - 1.9 + n * 0.4 + puff * 1.2);
      if (n === 2) j[s < 0 ? 'cheekTipL' : 'cheekTipR'] = tip;
      furLock(r, H.p(1.8, s * 8.1, z), tip, H.v(2.6, 0, 1.1), H.v(0, s * 1.6, 0.4), n % 2 ? cream : pelt, stripe);
    }
    // Brow bar above each eye.
    r.cap(H.p(7.3, s * 2.4, 4.6), H.p(6.2, s * 5.6, 4.2 + smile * 0.3), 0.75, 0.55, stripe);
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const E = H.at(6.5, s * 4.3, 1.4).turn(s * 0.4);
    j[r.tag] = E.o;
    const from = r.size;
    const open = Math.max(0.06, 1 - blink * 0.97 - smile * 0.25);
    r.ell(E, [0, 0, 0], [3.0, 3.1, 3.2 * open], dark);
    if (open > 0.28) {
      const iris = form > 0.5 ? glowEye : amber;
      r.ell(E, [0.7, 0, 0.05], [2.6, 2.75, 2.9 * open], iris);
      r.ell(E, [1.05, 0, 0.1], [0.7, 0.55, 2.0 * open], form > 0.5 ? mat('#2a5d82', '#4d93c0', '#a8e6ff', '#ffffff') : dark);
      r.dot(E.p(1.6, s * -0.9, 1.1 * open), cream.T[3], form, 1);
      if (form > 0.3) r.dot(E.p(1.9, 0, 0), hx('#dff6ff'), form, 1.2);
    }
    r.markEye(from, s, open > 0.28);
    r.cap(E.p(-1.4, s * 0.4, 2.7 * open + 0.2), E.p(2.6, s * 0.3, 2.4 * open + 0.4 - smile * 0.4), 0.9, 0.45, pelt);
    r.tag = 'muzzle';
    r.ell(H, [7.9, s * 2.15, -3.1], [3.2, 2.9, 2.4], cream);
    // Whisker roots and three long whiskers on each side.
    r.tag = 'whiskers';
    for (let i = 0; i < 4; i++) {
      const root = H.p(10.3 - i * 0.3, s * (2.9 + 0.35 * i), -2.6 - i * 0.5);
      r.dot(root, stripe.T[1], 0, 0.7);
      const mid = H.p(9.9 - i * 0.4, s * (6.4 - i * 0.2), -2.2 - i * 1.0 + puff * 0.3 + smile * 0.3);
      const tip = H.p(9.0 - i * 0.6, s * (9.0 - i * 0.4), -2.6 - i * 1.5 + puff * 0.4 + smile * 0.4);
      r.line(root, mid, pelt.T[2]);
      r.line(mid, tip, pelt.T[1]);
    }
  }
  r.tag = 'muzzle';
  r.ell(H, [7.4, 0, -5.4], [2.6, 3.2, 1.8], cream);
  r.tag = 'head';
  for (const y of [-3.2, -1.6, 0, 1.6, 3.2]) furLock(r, H.p(-3.5, y, 8.4 - Math.abs(y) * 0.2), H.p(-6.2, y * 1.4, 9.6 - Math.abs(y) * 0.3), H.v(0, 1.1, 0), H.v(-0.3, 0, 1), pelt, stripe);
  for (const s of [-1, 1]) for (let n = 0; n < 3; n++) furLock(r, H.p(-1 - n * 2.4, s * 8.6, 2 - n), H.p(-2.4 - n * 2.6, s * 10.8, 1 - n * 1.4), H.v(1, 0, 0), H.v(0, s, 0.3), pelt, stripe);
  r.tag = 'nose';
  r.poly([H.p(10.5, -1.5, -1.2), H.p(10.5, 1.5, -1.2), H.p(11.1, 0, -2.6)], nose);
  r.dot(H.p(10.9, -0.5, -1.4), nose.T[3], 0, 0.6);
  engraving(r, [H.p(11.0, 0, -2.6), H.p(10.6, 0, -3.6)], stripe);
  for (const s of [-1, 1])
    engraving(r, [H.p(10.6, 0, -3.6), H.p(10.2, s * 1.4, -4.1 - smile * 0.2), H.p(9.6, s * 2.4, -3.5 + smile * 0.8)], stripe);
  if (mouth > 0.05) {
    r.ell(H, [9.3, 0, -4.6 - mouth * 0.6], [1.6, 2.0, 0.9 + mouth * 1.1], nose);
    for (const s of [-1, 1]) r.cap(H.p(9.9, s * 1.3, -4.0), H.p(9.8, s * 1.2, -4.9 - mouth * 0.5), 0.35, 0.15, cream);
  }
  j.head = H.o;
  j.mouth = H.p(10.1, 0, -4.2);
  j.nose = H.p(11, 0, -1.6);
  r.eye = blink < 0.75 ? j.eyeR : null;
}
function monocle(r: Rig, H: F3, chestAnchor: V3, j: Record<string, V3>) {
  r.tag = 'monocle';
  const E = H.at(8.9, 4.5, 1.7).turn(0.42);
  const M = new F3(E.o, E.s, vmul(E.u, -1), E.f);
  ring(r, M, 3.5, 0, 0.3, mat('#2f3344', '#5d6477', '#9aa1b2', '#d9dde6'), 20);
  r.dot(E.p(0.2, -1.6, 2.2), silver.T[3], 0.3, 0.7);
  const hang = vadd(E.p(0, 3.3, -1.5), [0, 0, -6]);
  engraving(r, [E.p(0, 3.3, -1.5), vlerp(hang, chestAnchor, 0.35), vlerp(hang, chestAnchor, 0.7), chestAnchor], silver);
  j.monocle = E.o;
}
function ear(r: Rig, H: F3, s: number, angle: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'ear' + name;
  const E = H.at(-0.6, s * 6.4, 6.0)
    .turn(-s * 0.15)
    .roll(s * (0.62 + angle * 0.4))
    .pitch(-0.12 + angle * 0.5);
  const length = 10.0;
  const stations = [0, 0.3, 0.62, 0.86, 1],
    widths = [4.9, 4.1, 2.7, 1.2, 0.1];
  const point = (u: number, w: number, h: number) => E.p(h - 0.6 * u, w, length * u);
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1],
      b = stations[i],
      wa = widths[i - 1],
      wb = widths[i];
    for (const side of [-1, 1]) {
      r.poly([point(a, side * wa, -1.2), point(b, side * wb, -0.9), point(b, side * wb * 0.6, 0), point(a, side * wa * 0.6, 0)], pelt);
      r.poly([point(a, side * wa * 0.6, 0), point(b, side * wb * 0.6, 0), point(b, 0, 0.45), point(a, 0, 0.45)], i > 3 ? stripe : innerEar);
    }
  }
  for (const k of [0.18, 0.32, 0.46, 0.6]) furLock(r, point(k, s * 0.3 * (k * 10 % 2 ? 1 : -1), 0.6), point(k + 0.16, s * 0.7, 2.2), E.v(0, 1.0, 0), E.v(1, 0, 0.2), cream, innerEar);
  furLock(r, point(0.95, 0, -0.2), point(1.18, s * 0.3, -0.4), E.v(0, 0.6, 0), E.v(1, 0, 0), stripe, dark);
  j['earTip' + name] = point(1, 0, 0);
}
/** The top hat in its own frame: origin at the centre of the brim, u along the crown. */
function hat(r: Rig, T: F3, j: Record<string, V3>) {
  r.tag = 'hat';
  r.ell(T, [0, 0, 0], [8.4, 8.1, 0.85], silk);
  for (const s of [-1, 1]) r.cap(T.p(0, s * 7.7, 0.5), T.p(0, s * 7.4, 1.5), 1.0, 0.55, brimEdge);
  ring(r, T, 8.0, 0.25, 0.55, brimEdge, 26);
  ring(r, T, 6.6, 0.95, 0.3, silk, 20);
  const n = 22,
    low = 5.0,
    top = 5.5,
    hgt = 13.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      b = ((i + 1) / n) * TAU;
    const shade = i === 18 || i === 19 ? brimEdge : i === 5 ? silk : silk;
    r.poly([T.p(Math.cos(a) * low, Math.sin(a) * low, 0.6), T.p(Math.cos(b) * low, Math.sin(b) * low, 0.6),
      T.p(Math.cos(b) * top, Math.sin(b) * top, hgt), T.p(Math.cos(a) * top, Math.sin(a) * top, hgt)], shade);
  }
  r.ell(T, [0, 0, hgt], [5.5, 5.5, 0.7], silk);
  ring(r, T, 5.5, hgt, 0.4, brimEdge, 16);
  r.tag = 'hatBand';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      b = ((i + 1) / n) * TAU,
      rb = low + 0.25;
    r.poly([T.p(Math.cos(a) * rb, Math.sin(a) * rb, 1.2), T.p(Math.cos(b) * rb, Math.sin(b) * rb, 1.2),
      T.p(Math.cos(b) * (rb + 0.1), Math.sin(b) * (rb + 0.1), 4.0), T.p(Math.cos(a) * (rb + 0.1), Math.sin(a) * (rb + 0.1), 4.0)], lining);
  }
  ring(r, T, low + 0.45, 4.0, 0.3, gold, 16);
  ring(r, T, low + 0.4, 1.2, 0.25, gold, 16);
  // A silver star buckle on the front of the band.
  const B = T.at(low + 0.6, 0, 2.6);
  const star: V3[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU - Math.PI / 2,
      rad = k % 2 ? 0.9 : 2.0;
    star.push(B.p(0, Math.cos(a) * rad, -Math.sin(a) * rad));
  }
  for (let k = 0; k < 10; k += 2) r.poly([B.p(0.2, 0, 0), star[k], star[(k + 1) % 10], star[(k + 9) % 10]], silver);
  r.dot(B.p(0.4, -0.5, 0.7), silver.T[3], 0.5, 1);
  const R = T.at(0.4, -(low + 0.4), 2.6);
  for (const d of [-1, 1]) {
    r.poly([R.p(0, 0, 0), R.p(d * 2.6, -0.4, 1.7), R.p(d * 2.9, -0.5, -0.6)], lining);
    r.poly([R.p(0.1, -0.1, 0), R.p(d * 1.6, -0.5, 0.9), R.p(d * 1.8, -0.5, -0.3)], mat('#4b172e', '#9e3753', '#ca6271', '#ee9f9d'));
  }
  r.cap(R.p(0, 0, 0), R.p(-0.8, -0.3, -3.4), 0.55, 0.35, lining);
  r.cap(R.p(0, 0, 0), R.p(1.1, -0.3, -3.1), 0.55, 0.35, lining);
  r.ball(R.o, 0.8, gold);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.5;
    r.dot(T.p(Math.cos(a) * (low + 0.42), Math.sin(a) * (low + 0.42), 2.6), gold.T[3], 0.2, 0.55);
  }
  // A playing card tucked into the band on the right side: the ace of stars.
  const C = T.at(0.8, low + 0.35, 4.2).turn(0.25).roll(-0.2);
  r.poly([C.p(-1.9, 0, -2.2), C.p(1.9, 0, -2.2), C.p(1.9, 0.1, 3.9), C.p(-1.9, 0.1, 3.9)], cream, 0.2);
  r.poly([C.p(-1.6, 0.15, -1.9), C.p(1.6, 0.15, -1.9), C.p(1.6, 0.2, 3.6), C.p(-1.6, 0.2, 3.6)], mat('#b9b3c0', '#ddd8df', '#f3efef', '#ffffff'));
  r.dot(C.p(0, 0.3, 1.0), lining.T[2], 0, 1.1);
  r.dot(C.p(-1.0, 0.3, 3.0), lining.T[2], 0, 0.5);
  j.hatTop = T.p(0, 0, hgt);
  j.hatBrim = T.o;
  j.hatOpening = T.p(0, 0, 0);
}
function cape(r: Rig, B: F3, travel: number, tuck: number, breath: number, j: Record<string, V3>, wrap: number, form: number) {
  r.tag = 'cape';
  const spread = 1 - wrap;
  const surf = (u: number, v: number): V3 => {
    const a = (u - 0.5) * Math.PI * (1.12 + wrap * 0.85);
    const fold = Math.cos(u * Math.PI * 12) * v * (0.9 + v * 0.9);
    const flare = Math.max(0, (u - 0.46) / 0.54) ** 1.06 * v ** 1.35 * spread;
    const hem = 5 * Math.cos(u * Math.PI * 4 + 0.35) + 2 * Math.cos(u * Math.PI * 8);
    return B.p(
      -1.9 - (7.6 + v * (8.4 + travel * 5)) * Math.cos(a) * (1 - wrap * 0.25) - v * (3 + 4 * travel) * spread + fold - 12 * flare,
      (10.2 + v * (12.6 + travel * 4)) * Math.sin(a) * (1 - wrap * 0.35) + 10.5 * flare + v * v * (1.3 * breath + travel * 2.8) * spread,
      20 - v * (42 + hem - tuck * 10) + fold * 0.5 + v * v * travel * 4,
    );
  };
  const inside = form > 0.5 ? sky : lining;
  if (form > 0.5) foldedCloth(r, surf, 20, skyLight, sky, starTrim);
  else foldedCloth(r, surf, 20, velvetLight, velvet, gold);
  // Gold stitching along the hem.
  for (let k = 0; k <= 28; k++) r.dot(surf(k / 28, 0.985), (form > 0.5 ? starTrim : gold).T[k % 2 ? 2 : 3], form * 0.5, 0.6);
  if (form > 0.5) {
    // Three constellations light up on the outside of the cape.
    for (const chain of [[[0.12, 0.3], [0.2, 0.42], [0.3, 0.38], [0.36, 0.55], [0.28, 0.66]],
      [[0.55, 0.25], [0.62, 0.36], [0.7, 0.3], [0.78, 0.44]], [[0.45, 0.7], [0.55, 0.78], [0.66, 0.72], [0.74, 0.86], [0.86, 0.8]]]) {
      for (let i = 0; i < chain.length; i++) {
        const [u, v] = chain[i];
        r.dot(surf(u, v), hx('#ffffff'), 1, 1.3);
        r.dot(surf(u, v + 0.012), hx('#bfd2ff'), 0.8, 0.9);
        if (i) r.line(surf(chain[i - 1][0], chain[i - 1][1]), surf(u, v), hx('#9fb6ff'), 0.6);
      }
    }
  }
  for (const u of [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92]) {
    const v = 0.42 + 0.16 * Math.sin(u * 11);
    embroideredStar(r, surf, u, v, 0.6, form > 0.5 ? mat('#6a7ab8', '#9fb6ff', '#e0e8ff', '#ffffff') : gold);
    r.dot(surf(u + 0.05, v + 0.2), gold.T[3], form * 0.8, 0.7);
  }
  for (const u of [0, 1]) {
    const s = u ? 1 : -1;
    r.tag = 'lining';
    r.poly([surf(u, 0.12), surf(u, 0.72), surf(u, 1), B.p(-5, s * 12.5, -9)], inside);
    r.poly([surf(u, 0.12), surf(u, 0.5), B.p(-4.5, s * 10.5, 4), B.p(-3, s * 9.5, 14)], inside);
  }
  // Stand-up collar behind the neck: velvet outside, lining inside.
  r.tag = 'cape';
  for (let i = 0; i < 8; i++) {
    const a = -1.25 + (i / 8) * 2.5,
      b = -1.25 + ((i + 1) / 8) * 2.5;
    const low = (x: number) => B.p(-3.4 - 4.2 * Math.cos(x), 8.9 * Math.sin(x), 20.4);
    const high = (x: number) => B.p(-5.2 - 5.0 * Math.cos(x), 10.6 * Math.sin(x), 27.5 - Math.abs(x) * 1.2);
    r.poly([low(a), low(b), high(b), high(a)], i % 2 ? velvet : velvetLight);
    r.poly([B.p(-2.9 - 4.2 * Math.cos(a), 8.6 * Math.sin(a), 20.6), B.p(-2.9 - 4.2 * Math.cos(b), 8.6 * Math.sin(b), 20.6),
      B.p(-4.5 - 4.8 * Math.cos(b), 10.1 * Math.sin(b), 26.8 - Math.abs(b) * 1.2), B.p(-4.5 - 4.8 * Math.cos(a), 10.1 * Math.sin(a), 26.8 - Math.abs(a) * 1.2)], inside);
  }
  // Clasp: two silver discs and a chain across the chest.
  for (const s of [-1, 1]) {
    r.ball(B.p(5.4, s * 7.6, 19.6), 1.15, silver);
    r.dot(B.p(6.3, s * 7.4, 20.2), silver.T[3], 0.3, 0.8);
  }
  engraving(r, [B.p(5.9, -7, 19.2), B.p(7.1, -3.2, 18.4), B.p(7.4, 0, 18.1), B.p(7.1, 3.2, 18.4), B.p(5.9, 7, 19.2)], silver, true);
  for (let k = 0; k <= 8; k++) {
    const y = -7 + k * 1.75;
    r.dot(B.p(7.4 - Math.abs(y) * 0.2, y, 18.1 + Math.abs(y) * 0.15), silver.T[k % 2 ? 2 : 3], 0.2, 0.5);
  }
  j.capeTip = surf(0.24, 1);
  j.capeHem = surf(0.5, 1);
  j.capeL = surf(0.05, 0.85);
  j.capeR = surf(0.95, 0.85);
}
function torso(r: Rig, B: F3, j: Record<string, V3>) {
  r.tag = 'torso';
  r.ell(B, [0, 0, 9], [8.0, 9.8, 12.6], pelt);
  r.ell(B, [-0.6, 0, -1.2], [7.6, 9.0, 6.6], pelt);
  r.tag = 'shirt';
  r.ell(B, [5.6, 0, 13.4], [3.4, 4.6, 6.4], cream);
  // Pleats of the shirt front.
  for (let k = -2; k <= 2; k++) r.cap(B.p(8.4, k * 0.9, 16.8), B.p(8.6, k * 1.0, 10.2), 0.35, 0.3, k % 2 ? cream : mat('#a9a3b0', '#cfcad3', '#ebe7ea', '#ffffff'));
  r.tag = 'vest';
  r.ell(B, [0.9, 0, 6.6], [8.3, 10.1, 8.6], vest);
  // The V opening of the waistcoat exposes the shirt front.
  for (const s of [-1, 1]) {
    r.poly([B.p(8.0, s * 0.4, 4.2), B.p(7.4, s * 4.9, 13.4), B.p(6.4, s * 6.2, 15.6), B.p(8.6, s * 1.0, 8.6)], vest, 0.18);
    // Lapel edge and gold trim.
    engraving(r, [B.p(8.7, s * 0.5, 3.6), B.p(8.2, s * 2.9, 9.4), B.p(7.2, s * 5.2, 14.2)], gold, true);
    // Pocket with its welt.
    r.poly([B.p(8.0, s * 4.4, 2.6), B.p(7.6, s * 7.3, 2.9), B.p(7.6, s * 7.3, 3.7), B.p(8.0, s * 4.4, 3.4)], gold);
  }
  for (const z of [1.6, 4.8, 8.0]) {
    r.ball(B.p(8.9, 0, z), 0.75, silver);
    r.dot(B.p(9.4, -0.3, z + 0.35), silver.T[3], 0.25, 0.6);
  }
  // Hem points of the waistcoat.
  for (const s of [-1, 1]) r.poly([B.p(7.6, s * 0.3, -1.8), B.p(7.0, s * 4.6, -0.4), B.p(8.1, s * 1.6, 0.4)], vest);
  // Stitching dots along the waistcoat edges and fur tufts on the hips.
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const u = k / 8;
      r.dot(B.p(8.75 - u * 1.3, sd * (0.7 + u * 4.4), 3.8 + u * 10), gold.T[2], 0, 0.45);
    }
    for (let n = 0; n < 3; n++)
      furLock(r, B.p(-1 + n * 2.4, sd * 9.4, -2.4), B.p(-1.8 + n * 2.4, sd * 11.6, -5.2), B.v(1.2, 0, 0), B.v(0, sd, 0.2), n % 2 ? pelt : stripe, stripe);
  }
  r.tag = 'watchChain';
  const chain = [B.p(8.9, 0, 4.8), B.p(9.0, 2.6, 3.2), B.p(8.6, 4.6, 2.4), B.p(8.1, 6.1, 3.0)];
  engraving(r, chain, gold, true);
  for (let i = 0; i < chain.length - 1; i++) r.dot(vlerp(chain[i], chain[i + 1], 0.5), gold.T[3], 0, 0.55);
  // A little silver crescent fob hanging from the chain.
  const fob = B.at(8.6, 3.4, 1.6);
  r.ball(fob.o, 1.0, silver);
  r.ell(fob, [0.35, 0.35, 0.15], [0.5, 0.75, 0.75], vest);
  r.tag = 'bowtie';
  const K = B.at(7.2, 0, 19.2);
  for (const s of [-1, 1]) {
    r.poly([K.p(0.4, 0, 0), K.p(-0.4, s * 4.4, 2.1), K.p(-0.4, s * 4.9, -1.9)], lining);
    r.poly([K.p(0.6, s * 0.6, 0.2), K.p(0.1, s * 3.6, 1.4), K.p(0.1, s * 3.9, -1.0)], mat('#4b172e', '#9e3753', '#ca6271', '#ee9f9d'));
    for (const [y, z] of [[2.2, 0.8], [3.6, -0.9], [2.8, -0.2]]) r.dot(K.p(0.5, s * y, z), cream.T[3], 0, 0.55);
  }
  r.ball(K.p(0.7, 0, 0), 1.2, lining);
  // Fluff of the chest above the bow and a pocket square in the left pocket.
  for (let n = 0; n < 8; n++) {
    const y = -3.9 + n * 1.1;
    furLock(r, B.p(6.4, y, 20.6), B.p(8.6, y * 1.15, 22.2 - Math.abs(y) * 0.2), B.v(0, 0.9, 0), B.v(1, 0, 0.3), n % 2 ? cream : pelt, stripe);
  }
  for (const [y, z] of [[-5.0, 4.2], [-6.1, 4.6], [-7.0, 4.1]])
    r.poly([B.p(7.9, y - 0.6, 3.5), B.p(7.9, y + 0.6, 3.5), B.p(7.7, y, z + 0.9)], z > 4.4 ? cream : lining);
  j.chest = B.p(8.4, 0, 12.5);
  j.lapel = B.p(8.0, 4.2, 12.6);
}
function tail(r: Rig, B: F3, sway: number, up: number, lagSway: number, j: Record<string, V3>) {
  r.tag = 'tail';
  let p = B.p(-7.2, 0, -1.6);
  let dir = vnorm(B.v(-0.8, 0.15, -0.55 + up * 0.5));
  const n = 10;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const bend = (sway * (0.25 + k * 0.75) + lagSway * k * k) * 0.42;
    const lift = k < 0.75 ? 0.3 + up * 0.15 : -0.35;
    dir = vnorm(vadd(dir, B.v(0.04 - 0.08 * k, bend + 0.06, lift)));
    const next = vadd(p, vmul(dir, 3.4));
    const radius = 2.7 - k * 0.9;
    const tone = i === n - 1 ? cream : i % 2 ? stripe : pelt;
    r.cap(p, next, radius, radius * 0.9, tone);
    furLock(r, next, vadd(next, B.v(-0.4, i % 2 ? 0.9 : -0.9, 1.4)), B.v(0.7, 0, 0), B.v(0, 1, 0), tone, stripe);
    if (i === n - 3) {
      r.tag = 'tailRing';
      const R = axisFrame(next, dir, B.v(0, 0, 1));
      ring(r, R, radius + 0.35, 0, 0.45, silver, 10);
      r.tag = 'tail';
    }
    p = next;
  }
  furLock(r, p, vadd(p, vmul(dir, 2.2)), B.v(0, 0.9, 0), B.v(0, 0, 1), cream, pelt);
  j.tailTip = p;
}
function leg(r: Rig, B: F3, root: F3, s: number, foot: V3, fold: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = B.p(-1.2, s * 5.4, -0.8);
  const knee = vadd(vlerp(hip, foot, 0.42), root.v(6.2 + fold * 0.2, s * 1.1, 3.0));
  const hock = vadd(vlerp(hip, foot, 0.76), root.v(-5.4 - fold * 0.1, 0, 0));
  r.tag = 'thigh' + name;
  taperedLimb(r, hip, knee, 6.4, 5.6, pelt, root.f);
  // Fluffy cat "trousers" on the back of the thigh.
  for (let n = 0; n < 5; n++) {
    const at = vlerp(hip, knee, 0.15 + n * 0.17);
    furLock(r, vadd(at, root.v(-3.5, s * 2.5, 0)), vadd(at, root.v(-6.2, s * 4.2, -2.4)), root.v(0, 0, 1.6), root.v(-0.4, s, 0), n % 2 ? cream : pelt, stripe);
  }
  for (let k = 0; k < 3; k++)
    engraving(r, [vlerp(hip, knee, 0.3 + k * 0.2), vadd(vlerp(hip, knee, 0.34 + k * 0.2), root.v(1.2, s * 5.6, 0.6))], stripe);
  r.tag = 'knee' + name;
  r.cap(knee, hock, 4.0, 2.8, pelt);
  engraving(r, [vlerp(knee, hock, 0.3), vadd(vlerp(knee, hock, 0.4), root.v(0, s * 2.6, 0))], stripe);
  r.cap(hock, foot, 3.0, 2.6, cream);
  r.tag = 'foot' + name;
  const P = new F3(foot, root.f, root.s, root.u).turn(s * 0.1);
  r.ell(P, [1.8, 0, 2.1], [6.4, 4.3, 2.7], cream);
  for (let i = -1; i <= 1; i++) {
    r.ell(P, [5.9 - Math.abs(i) * 1.1, i * 2.2, 1.5], [2.9, 1.4, 1.4], cream);
    r.dot(P.p(7.6 - Math.abs(i) * 1.1, i * 2.2, 0.6), pad.T[2], 0, 0.6);
  }
  r.ell(P, [0.4, 0, 0.3], [2.0, 2.2, 0.5], pad);
  for (let i = -1; i <= 1; i++) furLock(r, P.p(4.6 - Math.abs(i), i * 2.2, 2.9), P.p(6.8 - Math.abs(i), i * 2.5, 3.6), P.v(0, 0.8, 0), P.v(0, 0, 1), cream, pelt);
  furLock(r, vlerp(knee, hock, 0.1), vadd(knee, root.v(2.4, s * 1.4, -1.6)), root.v(0, 0, 1.2), root.v(1, 0, 0), pelt, stripe);
  j['knee' + name] = knee;
  j['foot' + name] = foot;
}
function arm(r: Rig, B: F3, s: number, hand: V3, j: Record<string, V3>, palmUp: number) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(0.4, s * 9.4, 18.4);
  const span = vsub(hand, shoulder),
    axis = vnorm(span),
    pole = B.v(-0.72, s * 0.72, -0.3);
  const bend = vnorm(vsub(pole, vmul(axis, vdot(pole, axis))));
  const elbow = vadd(vlerp(shoulder, hand, 0.52), vmul(bend, Math.sqrt(Math.max(1, 12 ** 2 - (Math.hypot(...span) * 0.49) ** 2))));
  r.tag = 'shoulder' + name;
  r.ell(B.at(0, s * 9.4, 18.6).turn(s * 0.8), [0, 0, 0], [4.6, 5.2, 4.2], pelt);
  for (let k = 0; k < 2; k++)
    engraving(r, [B.p(1.5 - k * 2.6, s * 11.2, 21.0 - k * 0.6), B.p(2.5 - k * 2.6, s * 13.4, 17.5 - k * 0.6)], stripe);
  r.tag = 'arm' + name;
  r.cap(shoulder, elbow, 3.5, 3.0, pelt);
  for (let k = 0; k < 2; k++) {
    const at = vlerp(shoulder, elbow, 0.4 + k * 0.3);
    engraving(r, [vadd(at, B.v(1.6, s * 2.6, 0.4)), vadd(at, B.v(-1.2, s * 3.3, -0.4))], stripe);
  }
  r.tag = 'elbow' + name;
  furLock(r, elbow, vadd(elbow, vmul(bend, 2.8)), vmul(axis, 1.4), B.v(0, 0, 1), pelt, stripe);
  r.cap(elbow, hand, 3.1, 2.3, pelt);
  // White glove: cuff, back of the hand with three seams, four fingers and a thumb.
  r.tag = 'glove' + name;
  const wrist = vlerp(elbow, hand, 0.78);
  const C = axisFrame(wrist, vsub(hand, elbow), B.v(0, 0, 1));
  ring(r, C, 3.0, 0, 0.75, cream, 10);
  r.ell(C, [0, 0, -0.4], [3.0, 3.0, 1.1], cream);
  r.ball(C.p(0, 3.2, 0.2), 0.55, silver);
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * TAU;
    r.dot(C.p(Math.cos(ang) * 3.3, Math.sin(ang) * 3.3, 0.6), cream.T[1], 0, 0.4);
  }
  r.tag = 'hand' + name;
  const W = new F3(hand, B.f, B.s, B.u).pitch(palmUp * 0.9);
  r.ell(W, [0, 0, 0], [3.0, 2.8, 3.0], cream);
  for (let i = -1; i <= 1; i++) engraving(r, [W.p(-0.6, s * 1.6, i * 1.1), W.p(1.6, s * 2.3, i * 1.0)], cream);
  for (let i = -1.5; i <= 1.5; i++)
    r.cap(W.p(1.4, s * 1.2, i * 1.15), W.p(2.6, -s * 0.2, i * 1.1 - 0.15), 0.85, 0.6, cream);
  r.cap(W.p(0.3, -s * 1.9, 1.7), W.p(1.8, -s * 1.6, 0.3), 1.0, 0.65, cream);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function wand(r: Rig, G: F3, j: Record<string, V3>, glow: number) {
  r.tag = 'wand';
  r.cap(G.p(0, 0, -2.5), G.p(0, 0, WAND - 2.5), 1.0, 0.9, silk);
  r.cap(G.p(0, 0, -3.6), G.p(0, 0, -1.2), 1.05, 1.0, cream);
  r.tag = 'wandTip';
  const tipMat = glow > 0.4 ? mat('#8c94ff', '#c4d0ff', '#f0f4ff', '#ffffff') : cream;
  if (glow > 0.4) tipMat.glow = 0.8;
  r.cap(G.p(0, 0, WAND - 4.6), G.p(0, 0, WAND - 1.6), 1.05, 1.0, tipMat);
  r.cap(G.p(0, 0, 3.2), G.p(0, 0, 3.9), 1.1, 1.1, silver);
  // A small gold star rides on the tip so the wand reads against the dark cape.
  const S = G.at(0, 0, WAND - 0.6);
  const pts: V3[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU,
      rad = k % 2 ? 1.25 : 3.0;
    pts.push(S.p(0, Math.sin(a) * rad, Math.cos(a) * rad));
  }
  const starMat = glow > 0.4 ? mat('#a77a2c', '#e8c35a', '#fff0a8', '#ffffff') : gold;
  if (glow > 0.4) starMat.glow = 0.7;
  for (let k = 0; k < 10; k += 2) r.poly([S.p(0.3, 0, 0), pts[(k + 9) % 10], pts[k], pts[k + 1]], starMat);
  r.dot(S.p(0.6, -0.6, 0.8), gold.T[3], glow, 0.8);
  j.weaponGrip = G.o;
  j.weaponTip = G.p(0, 0, WAND - 1.6);
  j.wandTip = j.weaponTip;
  j.weaponHeel = G.p(0, 0, -3.6);
}

type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3.5, 'idle-f2': 3 };
export function magicianFigure(sample: PoseSample): Figure {
  return (anim, t, side, variant, pose, gait) => {
    const get = (key: string) => pose[key] ?? 0,
      A = pose as JointPose;
    const r = new Rig(),
      j: Record<string, V3> = {},
      planted: string[] = [];
    // Mirrored basis: the wand hand ("right" in the pose book) is the near side in the artist's 3/4 view.
    const Y = F3.yaw(card.life.yaw + (side * Math.PI) / 8),
      F = new F3(Y.o, Y.f, vmul(Y.s, -1), Y.u);
    const sleep = get('sleep'),
      jump = get('jump'),
      tuck = get('tuck'),
      form = get('form');
    const fatigue = gait.tired,
      crouch = get('squat') + sleep * 14 + fatigue * 6;
    const period = loopPeriods[anim] ?? 0;
    const q = period ? (t * TAU) / period : 0;
    const motion = Math.sin(q),
      restWind = 0.12 * Math.sin(q - 0.8) + 0.09 + form * 0.1 * Math.sin(t * 2.4);
    const previous = (frames: number) => {
      const time = t - frames / 24;
      return sample(anim, period ? ((time % period) + period) % period : Math.max(0, time));
    };
    const lag = (p: JointPose, k: string) => p[k] ?? 0;
    const leftEar = previous(2),
      rightEar = previous(3),
      hem = previous(5),
      tailLag = previous(4),
      hatLag = previous(2),
      cheeks = previous(2.5);
    const earFollow = (p: JointPose) =>
      lag(p, 'ear') + 0.25 * (lag(p, 'nod') - get('nod')) + 0.16 * (lag(p, 'pitch') - get('pitch')) - 0.1 * lag(p, 'tuck');
    const hips = F.at(-sleep * 3, 0, 30 + jump - crouch + gait.breath * 0.6);
    const airborne = hips.pitch(get('flip'));
    const body = airborne
      .pitch(get('pitch') + sleep * 0.38 + fatigue * 0.22)
      .roll(get('roll') + gait.roll)
      .turn(get('twist'));
    const headF = body
      .at(2.4 + sleep * 1.2, 0, 32.8 - sleep * 4)
      .turn(get('gaze'))
      .roll(get('tilt'))
      .pitch(get('nod') - 0.06 - get('pitch') * 0.2 + sleep * 0.3 + fatigue * 0.12)
      .scale(1.2);
    const wind =
      lag(hem, 'cape') + lag(hem, 'pitch') * 0.47 + Math.sin(lag(hem, 'flip') - 0.28) * lag(hem, 'tuck') * 0.5 + restWind + form * 0.25;
    cape(r, body, wind, tuck, motion, j, get('capeWrap'), form);
    tail(
      r,
      body,
      0.35 * Math.sin(t * 2.1) + get('tailWag') * Math.sin(t * 13) + get('tailSway'),
      get('tailUp') + sleep * -0.4 + form * 0.25,
      lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')),
      j,
    );
    torso(r, body, j);
    j.torso = body.p(0, 0, 8.4);
    for (let index = 0; index < 2; index++) {
      const s = index ? 1 : -1,
        name = s < 0 ? 'L' : 'R',
        step = gait.feet[index];
      const up = step.lift * 6.2;
      const cross = get('crossLegs');
      const footRest: V3 = [
        -s * 3.6 + step.forward / portraitScale - tuck * 9 + sleep * 3 + cross * (11 + s * 2),
        s * (7.6 + tuck * 1.6) - cross * s * 15,
        up + tuck * 16 + cross * (17 + s * 1.5),
      ];
      const local = goalAt(A, 'foot' + name, footRest) ?? footRest;
      const point =
        tuck || cross || Math.abs(Math.sin(get('flip') / 2)) > 0.0001
          ? airborne.p(local[0], local[1], local[2] - 30)
          : F.p(local[0], local[1], local[2] + jump);
      leg(r, body, airborne, s, point, crouch, j);
      if (step.planted && Math.abs(point[2]) < 0.08) planted.push('foot' + name);
    }
    r.tag = 'neck';
    r.cap(body.p(1.6, 0, 18.6), headF.p(-1, 0, -3.5), 5.0, 4.8, pelt);
    head(
      r,
      headF,
      j,
      get('blink'),
      get('smile'),
      restWind + lag(cheeks, 'ear') + 2 * (lag(cheeks, 'nod') - get('nod')),
      form,
      get('mouth'),
    );
    monocle(r, headF, body.p(8.0, 4.2, 12.6), j);
    for (const s of [-1, 1])
      ear(r, headF, s, earFollow(s < 0 ? leftEar : rightEar) * (s > 0 ? 0.8 : 1.05) + 0.04 * motion * s, j);
    // The wand rides in the right glove and follows the shaft angles of the warden's grip model.
    const walk = anim === 'walk' ? 1 : 0;
    const axes = F.turn(get('shaftYaw')).roll(0.55 + get('shaftRoll')).pitch(0.2 + get('shaftPitch') + walk * (0.16 + 0.045 * motion));
    const carry: V3 = [8 - walk * 2 * motion, 13, 31 + walk * 2];
    const target = (key: string, rest: V3) => {
      const p = goalAt(A, key, toLocal(F, rest));
      return p ? F.p(...p) : rest;
    };
    const rightRest = airborne.p(carry[0], carry[1], carry[2] - 30);
    const right = target('handR', vlerp(rightRest, F.p(...carry), sleep));
    let dir = axes.u;
    const wandGoal = goalAt(A, 'wandTip'),
      wandWeight = Math.min(1, get('goal.wandTip.weight'));
    if (wandGoal && wandWeight > 0) dir = vnorm(vlerp(dir, vnorm(vsub(F.p(...wandGoal), right)), wandWeight));
    let across = vcross(axes.s, dir);
    if (Math.hypot(...across) < 0.001) across = axes.f;
    const G = axisFrame(right, dir, across);
    const left = target('handL', body.p(6.6, -10.4, 5.0));
    // While peeking, the left glove and the hat go to a separate layer drawn over the frame.
    const front = anim === 'peek' && t * 24 >= 15 && get('peekDrop') > 0.25 && get('peekDrop') < 0.99 ? new Rig() : null;
    arm(front ?? r, body, -1, left, j, get('palmL'));
    arm(r, body, 1, right, j, get('palmR'));
    if (!get('wandHidden')) wand(r, G, j, Math.max(form, get('wandGlow')));
    else {
      j.weaponGrip = right;
      j.weaponTip = j.wandTip = right;
      j.weaponHeel = right;
    }
    // Hat: on the head, lifted and spun in the second form, or held upside down in the left glove.
    if (!get('hatOff')) {
      const lift = get('hatLift') + 0.6 * (lag(hatLag, 'jump') - jump) * (1 - get('hatInHand'));
      const onHead = headF
        .at(-0.6, 0, 8.6 + lift)
        .pitch(-0.14 + get('hatTilt'))
        .turn(get('hatSpin'));
      const inHand = new F3(vadd(left, F.v(0, 0, 1.2)), F.f, F.s, F.u).pitch(Math.PI + get('hatTipToward'));
      const k = Math.min(1, Math.max(0, get('hatInHand')));
      const hatFrame = k <= 0 ? onHead : k >= 1 ? inHand : new F3(vlerp(onHead.o, inHand.o, k), vnorm(vlerp(onHead.f, inHand.f, k)), vnorm(vlerp(onHead.s, inHand.s, k)), vnorm(vlerp(onHead.u, inHand.u, k)));
      hat(front ?? r, hatFrame, j);
    }
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    const finishes: Parameters<typeof finishSurfaces>[2] = [
        [pelt, 'fur'],
        [cream, 'fur'],
        [stripe, 'fur'],
        [silk, 'lacquer'],
        [brimEdge, 'lacquer'],
        [silver, 'ice'],
        [gold, 'ivory'],
        [amber, 'iris'],
        [glowEye, 'iris'],
        [dark, 'iris'],
        [velvet, 'paper'],
        [velvetLight, 'paper'],
        [lining, 'paper'],
        [sky, 'paper'],
        [vest, 'paper'],
        [nose, 'skin'],
        [innerEar, 'skin'],
        [pad, 'skin'],
      ];
    finishSurfaces(r, F, finishes, 'skin');
    scaleFigure(r, j, portraitScale);
    const frame = projectFigure(r, 160, [80, 132], j, '#1b1a2a', 4.4, true);
    if (front) {
      finishSurfaces(front, F, finishes, 'skin');
      scaleFigure(front, {}, portraitScale);
      frame.over = renderRig(front, frame.px.w, frame.px.h, ...frame.anchor, { outline: hx('#1b1a2a'), inner: 4.4 }).p;
    }
    if (anim === 'peek') frame.dy = Math.round(get('peekDrop') * 150);
    if (jump > 0) {
      const height = Math.min(1, jump / 34);
      frame.groundShadow = { radius: 160 * 0.2 * (1 - 0.55 * height), opacity: 1 - 0.64 * height };
    }
    if (get('shrink')) {
      const k = Math.max(0, 1 - get('shrink'));
      frame.sx = k * (1 + 0.25 * get('shrink'));
      frame.sy = k;
    }
    if (get('shiftX')) frame.dx = get('shiftX');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = planted;
    return frame;
  };
}
