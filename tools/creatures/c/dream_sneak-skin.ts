// Шмыг, сонный лазутчик: a small invented «moon jerboa» that stands and hops on two long hind feet. Huge round ears
// glowing pink inside with indigo rims and tufts, big sleepy amber eyes in indigo rings, a gold crescent on the
// forehead, cream cheeks and muzzle with two buck teeth, a very long tail ending in a glowing crescent tuft. He wears a
// short patchwork cape (blue, teal and plum patches cross-stitched in gold, a night-sky lining, the hood bunched on the
// shoulders, a gold crescent clasp), a leather strap with a pouch of glowing dream sand, and carries a dream umbrella
// (eight violet gores painted with moons, a scalloped hem, gold beads, a wooden crook) furled on his shoulder.
// The awakened form wears the cape inside out (a twinkling night sky), the tuft becomes a full moon, the umbrella opens
// and floats over his head, and three cloud sheep hop round him on a ring, in front and behind.
// The skeleton is its own: hips over two Z-shaped jerboa legs (thigh forward, shin back, long foot), IK arms, a hop
// cycle for walking; the umbrella is a prop held in the right paw or left standing free.
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import { goalAt, toLocal } from '../bodies/goals';
import { furLock, stitchedStrap } from '../bodies/kits/tailoring';
import { hx, ik, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';
import { clips, HIP } from './dream_sneak-poses';

const card = readCreatureCard('dream_sneak');
export const portraitScale = 2.45;
const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const fur = sw('fur', [2, 3, 4, 5]),
  furSoft = sw('fur', [3, 4, 4, 5]),
  furShade = sw('fur', [0, 1, 2, 4]),
  indigo = sw('indigo', [0, 1, 2, 4]),
  indigoLight = sw('indigo', [1, 2, 3, 4]),
  cream = sw('cream', [1, 2, 3, 4]),
  creamSoft = sw('cream', [2, 3, 4, 4]),
  creamShade = sw('cream', [0, 1, 2, 3]),
  inner = sw('inner', [1, 2, 3, 4], 0.22),
  innerDeep = sw('inner', [0, 1, 2, 3], 0.1),
  eye = sw('eyes', [0, 1, 3, 4], 0.35),
  eyeGlow = sw('eyes', [1, 2, 3, 4], 0.5),
  nose = sw('nose', [0, 1, 2, 3]),
  cape = sw('cape', [1, 2, 3, 5]),
  capeTeal = sw('cape', [2, 3, 4, 5]),
  capeDeep = sw('cape', [0, 1, 2, 3]),
  plum = sw('plum', [0, 1, 2, 4]),
  plumLight = sw('plum', [1, 2, 3, 4]),
  night = sw('night', [0, 1, 2, 3]),
  gold = sw('gold', [1, 2, 3, 4], 0.08),
  goldDeep = sw('gold', [0, 1, 2, 3]),
  wood = sw('wood', [0, 1, 3, 4]),
  canopy = sw('canopy', [0, 1, 2, 4]),
  canopyLight = sw('canopy', [1, 2, 3, 4]),
  canopyGlow = sw('canopy', [2, 3, 4, 4], 0.35),
  plumGlow = sw('plum', [2, 3, 4, 4], 0.35),
  sand = sw('sand', [1, 2, 3, 4], 0.55),
  sandGlow = sw('sand', [2, 3, 4, 4], 0.9),
  leather = sw('leather', [0, 1, 2, 4]),
  leatherDark = sw('leather', [0, 0, 1, 3]),
  wool = sw('wool', [1, 2, 3, 4]),
  woolShade = sw('wool', [0, 1, 2, 3]),
  moonMat = sw('gold', [2, 3, 4, 4], 0.6),
  mouthMat = sw('nose', [0, 0, 1, 2]);
gold.spec = true;
wood.spec = true;
const ink = hx('#120e26'),
  inkMat: Mat = { T: [ink, ink, ink, hx('#1e1838')] },
  white = hx('#ffffff'),
  starC = hx('#fff6c2'),
  spark = hx('#ffe9a0'),
  whisker = hx('#9a8cc8');
// Short strands keep the lilac masses readable.
for (const m of [fur, furSoft]) {
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 21 + q[1] * 15 + q[2] * 6.5) * Math.cos(q[2] * 10 - q[1] * 8);
    return strand > 0.82 ? m.T[light > 0.74 ? 2 : light > 0.25 ? 1 : 0] : null;
  };
}

const saturate = (x: number) => Math.max(0, Math.min(1, x));
/** A world direction written in the frame's own axes. */
function toLocalDir(F: F3, w: V3): V3 {
  return [vdot(F.f, w), vdot(F.s, w), vdot(F.u, w)];
}
function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function limb(r: Rig, from: V3, to: V3, rw: number, rh: number, m: Mat, facing: V3) {
  const f = axisFrame(vlerp(from, to, 0.5), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * 0.58], m);
}
function catmull(points: V3[], t: number): V3 {
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
    (k) => 0.5 * (2 * q[k] + (-p[k] + u[k]) * a + (2 * p[k] - 5 * q[k] + 4 * u[k] - v[k]) * b + (-p[k] + 3 * q[k] - 3 * u[k] + v[k]) * c),
  ) as V3;
}
/** The painting plane: world x across, world z up — sprites that should face the viewer lie in it. */
const SX: V3 = [1, 0, 0],
  SZ: V3 = [0, 0, 1];
/** A five-pointed star facing the viewer. */
function star(r: Rig, c: V3, radius: number, m: Mat, spin = 0) {
  const pts: V3[] = [];
  for (let k = 0; k < 10; k++) {
    const a = spin + (k / 10) * TAU,
      rad = k % 2 ? radius * 0.45 : radius;
    pts.push(vadd(c, vadd(vmul(SX, Math.sin(a) * rad), vmul(SZ, Math.cos(a) * rad))));
  }
  r.poly(pts, m, 0.4);
}
/** A crescent facing the viewer: the outer arc minus an offset inner disc, as a strip of quads. */
function crescent(r: Rig, c: V3, radius: number, open: number, m: Mat, turn = 0, bias = 0.3) {
  const n = 12;
  const at = (a: number, rad: number, off: number): V3 => {
    const x = Math.cos(a) * rad + off * Math.cos(turn),
      z = Math.sin(a) * rad + off * Math.sin(turn);
    return vadd(c, vadd(vmul(SX, x), vmul(SZ, z)));
  };
  for (let k = 0; k < n; k++) {
    const a0 = turn + Math.PI * (0.18 + (1.64 * k) / n),
      a1 = turn + Math.PI * (0.18 + (1.64 * (k + 1)) / n);
    const w0 = Math.sin((Math.PI * k) / n),
      w1 = Math.sin((Math.PI * (k + 1)) / n);
    r.poly([at(a0, radius, 0), at(a1, radius, 0), at(a1, radius * (1 - open * w1), 0), at(a0, radius * (1 - open * w0), 0)], m, bias);
  }
}

// ---- head -----------------------------------------------------------------------------------------
function ear(r: Rig, Hd: F3, s: number, droop: number, flick: number, form: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'ear' + name;
  // Big round dish ears: the opening faces forward and out, the long axis leans out from the crown.
  const E = Hd.at(-1.4, s * 4.2, 5.4)
    .turn(s * (0.85 + 0.3 * droop) + flick)
    .roll(s * (0.32 + 0.95 * droop))
    .pitch(-0.1 + 0.6 * droop);
  r.cap(E.p(0, 0, -0.6), E.p(-0.3, 0, 3.4), 2.3, 2.8, fur);
  r.ell(E, [-0.5, 0, 8.2], [1.5, 6.0, 8.2], fur);
  r.ell(E, [0.45, 0, 8.4], [0.75, 4.8, 6.8], inner);
  r.ell(E, [0.75, 0, 7.6], [0.4, 2.9, 4.7], innerDeep);
  for (const k of [-1, 0, 1]) r.line(E.p(1.05, k * 0.8, 3.6), E.p(1.0, k * 2.0, 12.0), inner.T[0], 0, 0.7);
  for (const k of [-1, 1]) r.line(E.p(1.0, k * 1.4, 7.0), E.p(0.95, k * 3.2, 10.0), inner.T[0], 0, 0.7);
  // Indigo rim round the top of the dish and a little tuft.
  r.ell(E, [-0.75, 0, 14.6], [1.25, 3.8, 2.3], indigo, (q) => q[2] < -0.3);
  for (let k = -1; k <= 1; k++) {
    const base = E.p(-0.4, k * 1.1, 16.4 - Math.abs(k) * 0.5),
      tip = E.p(-0.9 - droop * 2, k * 2.2 + s * flick * 2, 19.4 - Math.abs(k) * 1.2);
    furLock(r, base, tip, E.v(0, 0.7, 0), E.v(-0.6, 0, 0.3), k ? indigoLight : indigo, indigo);
  }
  // Inner fluff at the base of the opening.
  for (let k = 0; k < 3; k++) {
    const base = E.p(0.9, (k - 1) * 1.6, 2.4);
    furLock(r, base, E.p(1.6, (k - 1) * 2.2, 5.6), E.v(0, 0.6, 0), E.v(0.5, 0, 0), creamSoft, creamShade);
  }
  // Fur round the back rim of the dish.
  for (let k = 0; k < 6; k++) {
    const a = 0.35 + (k / 5) * 2.4;
    const base = E.p(-0.6, Math.cos(a) * 5.6, 8.2 + Math.sin(a) * 7.6);
    furLock(r, base, E.p(-1.2, Math.cos(a) * 7.0, 8.2 + Math.sin(a) * 9.0), E.v(0, -Math.sin(a) * 0.6, Math.cos(a) * 0.6), E.v(-0.5, 0, 0), k % 2 ? furSoft : fur, furShade);
  }
  if (form > 0.5) r.dot(E.p(1.1, 0, 9), inner.T[3], 0.8, 1.4);
  j['ear' + name] = E.p(-0.6, 0, 17);
}
interface HeadState {
  blink: number;
  lid: number;
  smile: number;
  mouth: number;
  form: number;
  lookX: number;
  lookY: number;
  cheek: number;
  wide: number;
}
function head(r: Rig, Hd: F3, j: Record<string, V3>, p: HeadState) {
  r.tag = 'head';
  r.ell(Hd, [0, 0, 0.3], [7.0, 8.4, 7.4], fur);
  r.ell(Hd, [1.0, 0, 3.6], [5.0, 6.0, 3.8], furSoft);
  // Nape fluff and a forelock.
  for (let k = 0; k < 7; k++) {
    const y = (k - 3) * 1.6;
    const a = H(Hd, -5.6 + Math.abs(y) * 0.2, y, 3 - Math.abs(y) * 0.3);
    furLock(r, a, H(Hd, -8.2, y * 1.15, -2.4 - Math.abs(y) * 0.2), Hd.v(0, 0.8, 0.3), Hd.v(-0.5, 0, 0.8), k % 2 ? fur : furSoft, furShade);
  }
  // Crown fluff between the ears.
  for (let k = 0; k < 5; k++) {
    const y = (k - 2) * 1.2;
    furLock(r, H(Hd, -1.2 + Math.abs(y) * 0.2, y, 7.2 - Math.abs(y) * 0.2), H(Hd, -2.6, y * 1.3, 9.6 - Math.abs(y) * 0.5), Hd.v(0, 0.6, 0), Hd.v(-0.4, 0, 0.4), k % 2 ? furSoft : fur, furShade);
  }
  for (let k = -1; k <= 1; k++) furLock(r, H(Hd, 4.2, k * 1.4, 6.6), H(Hd, 7.0, k * 2.0 + 0.6, 8.0 - Math.abs(k)), Hd.v(0, 0.7, 0), Hd.v(0.3, 0, 0.6), furSoft, furShade);
  // Cream cheeks puff out sideways in soft locks.
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'cheekL' : 'cheekR';
    r.ell(Hd, [2.6, s * 5.6, -3.2], [3.2, 3.2, 2.8], cream);
    for (let k = 0; k < 8; k++) {
      const a = H(Hd, 2.4 - k * 0.5, s * (6.6 + (k % 2) * 0.3), -1.6 - k * 0.55);
      const tip = H(Hd, 0.8 - k * 0.7, s * (9.6 + p.cheek + (k % 2) * 0.6), -2.6 - k * 0.9);
      furLock(r, a, tip, Hd.v(0, 0.4, 0.9), Hd.v(0.4, s * 0.6, 0.2), k % 2 ? creamSoft : cream, creamShade);
    }
  }
  // Muzzle: a cream snout with puffy whisker pads and a tiny pink nose.
  r.tag = 'muzzle';
  r.ell(Hd, [5.2, 0, -3.0], [3.2, 3.4, 2.7], cream);
  for (const s of [-1, 1]) r.ell(Hd, [6.6, s * 1.6, -3.2], [1.9, 1.9, 1.7], creamSoft);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) r.dot(H(Hd, 8.0, s * (1.5 + k * 0.5), -2.6 - (k % 2) * 0.5), creamShade.T[1], 0, 0.4);
  r.tag = 'nose';
  r.ell(Hd, [8.4, 0, -1.5], [0.9, 1.3, 0.85], nose);
  r.dot(H(Hd, 9.1, -0.4, -1.1), white, 0, 0.5);
  r.line(H(Hd, 9.0, 0, -2.2), H(Hd, 8.7, 0, -3.0), ink, 0, 0.6);
  const open = saturate(p.mouth);
  // Smirk: the near corner lifts more than the far one.
  for (const s of [-1, 1]) {
    const lift = p.smile * (s > 0 ? 0.9 : 0.5);
    r.line(H(Hd, 8.7, 0, -3.0), H(Hd, 7.9, s * (1.9 + lift * 0.5), -3.2 + lift * 0.9), ink, 0, 0.6);
  }
  if (open > 0.12) {
    r.tag = 'mouth';
    const J = Hd.at(7.4, 0, -4.0);
    r.ell(J, [0, 0, -0.2 - open * 0.6], [1.2, 1.6 + open * 0.5, 0.6 + open * 1.4], mouthMat);
    r.ell(J, [0.2, 0, -0.6 - open * 1.1], [0.9, 1.1, 0.35 + open * 0.4], nose);
  }
  if (p.smile > 0.2 || open > 0.12) {
    // Two buck teeth just under the nose.
    r.tag = 'teeth';
    for (const s of [-1, 1]) {
      const a = H(Hd, 8.75, s * 0.15, -3.1),
        b = H(Hd, 8.75, s * 0.95, -3.1),
        c = H(Hd, 8.6, s * 0.95, -4.3),
        d = H(Hd, 8.6, s * 0.15, -4.3);
      r.poly([a, b, c, d], { T: [hx('#c8c4d8'), hx('#e6e2f0'), white, white] }, 0.8);
    }
  }
  // Whiskers droop from the pads and spring out at the tips.
  r.tag = 'whiskers';
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const a = H(Hd, 7.6, s * 2.6, -2.4 - k * 0.5),
        m = H(Hd, 7.0, s * (5.6 + k * 0.4), -2.2 - k * 0.9 + p.cheek * 0.3),
        b = H(Hd, 6.2 - k * 0.5, s * (8.4 + k * 0.6), -2.0 - k * 1.5 + p.cheek * 0.6);
      r.line(a, m, whisker, 0.1, 0.4);
      r.line(m, b, whisker, 0.1, 0.4);
      r.dot(a, creamShade.T[0], 0, 0.35);
    }
  // Big round amber eyes in indigo rings; the lids hang half down — the sly, sleepy look.
  for (const s of [-1, 1]) {
    r.tag = 'mask';
    const e = Hd.at(5.9, s * 3.7, 1.3).turn(s * 0.42);
    const P = (x: number, y: number, z: number) => e.p(x, s * y, z);
    r.ell(e, [-0.4, 0, 0], [1.3, 3.55 + p.wide * 0.3, 3.85 + p.wide * 0.3], indigo);
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const start = r.size;
    const opened = p.blink < 0.5;
    const lid = saturate(p.lid);
    if (opened) {
      const ry = 3.0 + p.wide * 0.35,
        rz = 3.3 + p.wide * 0.4;
      r.ell(e, [0.35, 0, 0], [0.95, ry, rz], p.form > 0.5 ? eyeGlow : eye);
      r.ell(e, [0.7, 0, -0.6], [0.5, ry * 0.7, rz * 0.45], { T: [eye.T[2], eye.T[3], eye.T[3], white], glow: 0.4 });
      r.ell(e, [1.12, s * 0.15 + p.lookX * 0.9, -0.1 + p.lookY * 0.8], [0.4, 1.45 - p.wide * 0.3, 2.0 - p.wide * 0.35], inkMat);
      // A star glint and a small second glint.
      const g = P(1.45, -0.9 + p.lookX * 0.5, 1.0);
      r.dot(g, white, 0.6, 0.9);
      r.dot(vadd(g, e.v(0, 0, 0.7)), white, 0.3, 0.5);
      r.dot(vadd(g, e.v(0, 0, -0.7)), white, 0.3, 0.5);
      r.dot(vadd(g, e.v(0, 0.7, 0)), white, 0.3, 0.5);
      r.dot(vadd(g, e.v(0, -0.7, 0)), white, 0.3, 0.5);
      r.dot(P(1.4, 1.0, -1.3), white, 0.3, 0.6);
      if (lid > 0.02) {
        // The upper lid: a slice of fur over the top of the eye with a dark lash line on its edge.
        const level = 1 - 2 * lid;
        r.ell(e, [0.42, 0, 0], [1.02, ry + 0.15, rz + 0.15], furSoft, (q) => q[2] < level);
        const zl = (rz + 0.15) * level,
          half = (ry + 0.15) * Math.sqrt(Math.max(0, 1 - level * level));
        r.line(P(1.25, -half * 0.95, zl), P(1.35, 0, zl - 0.15), ink, 0, 0.9);
        r.line(P(1.35, 0, zl - 0.15), P(1.25, half * 0.95, zl + 0.1), ink, 0, 0.9);
        r.line(P(1.2, half * 0.95, zl + 0.1), P(0.6, half * 1.25, zl + 0.8), ink, 0, 0.8);
      r.line(P(1.1, half * 0.6, zl + 0.15), P(0.8, half * 0.8, zl + 0.9), ink, 0, 0.8);
      }
    } else {
      // Shut: the lid covers the eye; a happy arc when smiling, a soft sleepy line otherwise.
      r.ell(e, [0.4, 0, 0], [1.0, 3.1, 3.4], furSoft);
      const up = p.smile > 0.4 ? 1 : -0.4;
      r.line(P(1.0, -2.4, -0.2), P(1.2, 0, 0.9 * up), ink, 0, 0.9);
      r.line(P(1.2, 0, 0.9 * up), P(1.0, 2.4, -0.2), ink, 0, 0.9);
      r.line(P(1.0, 2.4, -0.2), P(0.5, 3.1, 0.5), ink, 0, 0.8);
    }
    r.markEye(start, s, opened);
    if (s > 0) j.eyeR = r.eye = P(0.6, 0.3, 0.3);
    else j.eyeL = P(0.6, 0.3, 0.3);
  }
  // The gold crescent on the forehead; awake in the second form it glows.
  r.tag = 'moonMark';
  const M = Hd.at(6.2, 0, 4.4).pitch(-0.7);
  const mm = p.form > 0.5 ? moonMat : gold;
  for (let k = 0; k < 7; k++) {
    const a0 = Math.PI * (0.25 + k / 7) + Math.PI / 2,
      a1 = Math.PI * (0.25 + (k + 1) / 7) + Math.PI / 2;
    const w0 = 0.15 + Math.sin((Math.PI * k) / 7) * 0.55,
      w1 = 0.15 + Math.sin((Math.PI * (k + 1)) / 7) * 0.55;
    r.poly([M.p(0, Math.cos(a0) * 1.6, Math.sin(a0) * 1.6), M.p(0, Math.cos(a1) * 1.6, Math.sin(a1) * 1.6), M.p(0.05, Math.cos(a1) * (1.6 - w1), Math.sin(a1) * (1.6 - w1)), M.p(0.05, Math.cos(a0) * (1.6 - w0), Math.sin(a0) * (1.6 - w0))], mm, 0.5);
  }
  j.nose = H(Hd, 9.2, 0, -1.6);
  j.mouth = H(Hd, 8.6, 0, -3.6);
  j.crown = H(Hd, 0, 0, 7.8);
}
const H = (F: F3, x: number, y: number, z: number) => F.p(x, y, z);

// ---- body -----------------------------------------------------------------------------------------
function torso(r: Rig, B: F3, puff: number) {
  r.tag = 'pelvis';
  r.ell(B, [-0.8, 0, 1.0], [5.6, 6.2, 5.2], fur);
  r.tag = 'belly';
  r.ell(B, [0.8, 0, 5.2], [5.2 + puff * 0.6, 5.9 + puff * 0.4, 5.4], fur);
  r.ell(B, [2.6, 0, 5.2], [3.8 + puff * 0.6, 4.6, 5.0], cream);
  r.tag = 'chest';
  r.ell(B, [0.6, 0, 9.8], [4.4, 5.0, 4.2], fur);
  r.ell(B, [2.4, 0, 9.8], [2.8, 3.6, 3.4], creamSoft);
  // Fluffy cream bib.
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 1.4;
    const a = B.p(4.4, y, 12.4 - Math.abs(y) * 0.3);
    furLock(r, a, vadd(a, B.v(0.7, y * 0.1, -2.2)), B.v(0, 0.7, 0), B.v(0.6, 0, 0), k % 2 ? creamSoft : cream, creamShade);
  }
  // Three indigo stripes down the back.
  for (const y of [-2.2, 0, 2.2]) {
    const top = B.p(-4.2, y, 12.6),
      mid = B.p(-5.4, y * 1.15, 6.2),
      bot = B.p(-5.8, y * 1.25, 1.2);
    r.cap(top, mid, 0.75, 0.9, indigo);
    r.cap(mid, bot, 0.9, 0.7, indigo);
  }
  // Guard hair down the spine between the stripes.
  for (let k = 0; k < 7; k++)
    for (const y of [-1.1, 1.1]) {
      const a = B.p(-4.6 - (k % 2) * 0.4, y * (1 + k * 0.08), 12.4 - k * 1.7);
      furLock(r, a, vadd(a, B.v(-1.2, y * 0.6, -2.6)), B.v(0, 0.8, 0), B.v(-0.6, 0, 0), k % 2 ? fur : furSoft, furShade);
    }
  // Flank fluff where the belly meets the sides.
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = B.p(2.4 - k * 0.4, s * (5.2 - k * 0.1), 8.6 - k * 1.8);
      furLock(r, a, vadd(a, B.v(0.2, s * 1.2, -2.4)), B.v(0.8, 0, 0), B.v(0, s * 0.6, 0), k % 2 ? furSoft : fur, furShade);
    }
  // Fur locks over the haunches.
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = B.p(-2 + k * 1.3, s * 5.4, 2.4 - (k % 2) * 0.8);
      furLock(r, a, vadd(a, B.v(-0.8, s * 1.2, -3.0)), B.v(1.0, 0, 0), B.v(0, s * 0.8, 0), k % 2 ? furSoft : fur, furShade);
    }
}
function arm(r: Rig, B: F3, s: number, hand: V3, j: Record<string, V3>, grip: number, handRig: Rig = r, curl = 0) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(0.8, s * 4.4, 12.2);
  const elbow = ik(shoulder, hand, 5.0, 5.0, B.v(-0.6, s * 0.8, -0.9));
  r.tag = 'shoulder' + name;
  r.ell(B.at(0.6, s * 4.4, 12.4).turn(s * 0.5), [0, 0, 0], [2.4, 2.5, 2.4], fur);
  for (let k = 0; k < 3; k++) {
    const a = B.p(1.6 - k * 1.2, s * (5.6 + (k % 2) * 0.3), 13.2 - k * 0.4);
    furLock(r, a, vadd(a, B.v(-0.5, s * 1.4, -2.4)), B.v(0.8, 0, 0), B.v(0, s * 0.6, 0.3), k % 2 ? furSoft : fur, furShade);
  }
  r.tag = 'arm' + name;
  limb(r, shoulder, elbow, 1.9, 1.8, fur, B.f);
  const wrist = vlerp(elbow, hand, 0.82);
  r.cap(elbow, wrist, 1.65, 1.3, fur);
  furLock(r, elbow, vadd(elbow, vmul(vnorm(vsub(elbow, vlerp(shoulder, hand, 0.5))), 2.2)), vmul(vnorm(vsub(hand, elbow)), 0.9), B.v(0, 0, 1), furSoft, furShade);
  r.cap(vlerp(elbow, wrist, 0.7), wrist, 1.5, 1.45, furSoft);
  for (let k = 0; k < 2; k++) {
    const at = vlerp(elbow, wrist, 0.3 + k * 0.3),
      out = vnorm(vcross(vsub(wrist, elbow), B.u));
    furLock(r, vadd(at, vmul(out, s * 1.3)), vadd(vadd(at, vmul(out, s * 2.2)), vmul(vnorm(vsub(wrist, elbow)), 1.6)), vmul(vnorm(vsub(wrist, elbow)), 0.7), vmul(out, s * 0.4), furSoft, furShade);
  }
  r = handRig;
  r.tag = 'hand' + name;
  const dir = vnorm(vsub(hand, elbow));
  const Wp = new F3(hand, dir, vnorm(vcross(B.u, dir)), B.u).roll(s * 0.6);
  r.ell(Wp, [0, 0, 0], [1.6, 1.5, 1.2], furSoft);
  r.ell(Wp, [0.2, 0, -0.5], [1.1, 1.0, 0.6], cream);
  for (let k = 0; k < 4; k++) {
    const y = (k - 1.5) * 0.7;
    const bend = grip + curl;
    r.cap(Wp.p(1.1, y, 0.1), Wp.p(2.2 - Math.abs(y) * 0.3 - bend * 1.1, y * 1.15, 0.3 - bend * 1.6), 0.45, 0.36, furSoft);
    r.dot(Wp.p(2.1 - Math.abs(y) * 0.3 - bend * 1.1, y * 1.15, 0.6 - bend * 1.6), nose.T[2], 0, 0.3);
  }
  r.cap(Wp.p(0.2, -s * 1.3, 0.3), Wp.p(1.0, -s * 1.8, 0.6 - grip * 0.8), 0.5, 0.38, furSoft);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function leg(r: Rig, hips: F3, s: number, heel: V3, toeDir: V3, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = hips.p(0.2, s * 3.4, -0.4);
  // Z-shaped jerboa leg: the thigh runs forward and down, the shin back to a raised heel, the long foot forward.
  const knee = ik(hip, heel, 6.6, 6.9, hips.v(1, s * 0.25, 0.1));
  r.tag = 'thigh' + name;
  r.ell(axisFrame(vlerp(hip, knee, 0.36), vsub(hip, knee), hips.f), [0, 0, 0], [4.6, 4.1, 5.2], fur);
  for (let k = 0; k < 3; k++) {
    const at = vlerp(hip, knee, 0.3 + k * 0.22);
    furLock(r, vadd(at, hips.v(-1.4, s * 2.6, -0.6)), vadd(at, hips.v(-2.6, s * 3.0, -3.0)), vmul(vnorm(vsub(knee, hip)), 1.0), hips.v(0, s, -0.3), k % 2 ? furSoft : fur, furShade);
  }
  for (let k = 0; k < 3; k++) {
    const at = vlerp(hip, knee, 0.25 + k * 0.25);
    furLock(r, vadd(at, hips.v(0.6, s * 3.4, 0.6)), vadd(at, hips.v(-0.6, s * 4.0, -1.8)), hips.v(0.8, 0, 0), hips.v(0, s * 0.6, 0), k % 2 ? fur : furSoft, furShade);
  }
  // The knee tuft.
  furLock(r, knee, vadd(knee, hips.v(1.6, s * 0.4, -1.4)), hips.v(0, 0.8, 0), hips.v(0.4, 0, 0.4), furSoft, furShade);
  r.tag = 'shin' + name;
  r.cap(knee, heel, 1.9, 1.3, fur);
  furLock(r, vlerp(knee, heel, 0.4), vadd(vlerp(knee, heel, 0.5), vmul(vnorm(vsub(heel, knee)), 1.4)), hips.v(0, 0.7, 0), hips.v(-0.6, 0, 0), furSoft, furShade);
  r.tag = 'foot' + name;
  const down = vnorm(vcross(vcross(toeDir, [0, 0, 1]), toeDir));
  const side = vnorm(vcross([0, 0, 1], toeDir));
  const toes = vadd(heel, vmul(toeDir, 7.6));
  r.cap(heel, toes, 1.6, 1.25, fur);
  // Hairy cream soles under the whole foot.
  r.cap(vadd(heel, vmul(down, -0.55)), vadd(toes, vmul(down, -0.45)), 1.15, 1.0, cream);
  for (let k = 0; k < 4; k++) {
    const at = vlerp(heel, toes, 0.15 + k * 0.22);
    furLock(r, vadd(at, vmul(down, -0.9)), vadd(vadd(at, vmul(down, -1.3)), vmul(toeDir, -1.6)), vmul(side, 0.8), vmul(down, -0.3), creamSoft, creamShade);
  }
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 0.95;
    const base = vadd(toes, vmul(side, y * 0.8)),
      tip = vadd(vadd(toes, vmul(toeDir, 2.0 - Math.abs(y) * 0.4)), vmul(side, y * 1.3));
    r.cap(base, tip, 0.62, 0.5, fur);
    r.dot(vadd(tip, vmul(down, -0.35)), nose.T[2], 0, 0.35);
    r.dot(vadd(tip, vmul(toeDir, 0.5)), creamShade.T[3], 0, 0.3);
  }
  j['knee' + name] = knee;
  j['heel' + name] = heel;
  j['foot' + name] = toes;
}
function tail(r: Rig, F: F3, base: V3, sway: number, lag: number, curl: number, form: number, glow: number, j: Record<string, V3>) {
  // Long and thin: down behind the heels, along the grass and up in a wave, the crescent tuft high at the end.
  const w = (k: number) => (sway + lag * k) * k;
  const T = (x: number, y: number, z: number, k: number): V3 => vadd(base, F.v(x, y + w(k) * 6, z));
  const pts: V3[] = [
    base,
    T(-4.6, 0.6, -4.6, 0.12),
    T(-10.6, 2.2, -9.6 + curl * 2, 0.3),
    T(-17.2, 3.4, -8.6 + curl * 4, 0.48),
    T(-22.0, 4.2, -3.0 + curl * 6, 0.64),
    T(-23.6 + curl * 4, 4.6, 4.4 + curl * 5, 0.8),
    T(-21.4 + curl * 6, 4.2, 11.0 + curl * 3, 1),
  ];
  r.tag = 'tail';
  const n = 22;
  for (let k = 0; k < n; k++) {
    const a = catmull(pts, k / n),
      b = catmull(pts, (k + 1) / n);
    const t0 = k / n;
    r.cap(a, b, 1.55 - 0.75 * t0, 1.55 - 0.75 * (t0 + 1 / n), t0 > 0.8 ? indigoLight : fur);
  }
  for (let k = 1; k < 17; k++) {
    const t0 = k / n,
      c = catmull(pts, t0),
      d = vnorm(vsub(catmull(pts, t0 + 0.02), c));
    const out = vnorm(vcross(d, F.s));
    furLock(r, vadd(c, vmul(out, 0.9)), vadd(c, vadd(vmul(out, 1.6), vmul(d, 2.2))), vmul(F.s, 0.6), vmul(out, 0.4), k % 4 ? furSoft : fur, furShade);
  }
  // Indigo rings before the tuft.
  for (let k = 0; k < 4; k++) {
    const t0 = 0.82 + k * 0.04,
      c0 = catmull(pts, t0),
      c1 = catmull(pts, t0 + 0.015);
    r.cap(c0, c1, 1.0 - k * 0.05, 1.0 - k * 0.05, indigo);
  }
  r.tag = 'tailMoon';
  const tip = catmull(pts, 0.999);
  const c = vadd(tip, [0.6, 0, 2.6]);
  if (form > 0.5) {
    // The full moon: a glowing ball with soft craters and a ring of sparks.
    r.ball(c, 3.6, moonMat);
    for (const [x, z, rad] of [[-1.2, 0.9, 0.7], [1.0, -0.6, 0.9], [0.3, 1.6, 0.45]] as const) r.dot(vadd(c, [x, 3.2, z]), gold.T[2], 0.2, rad);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + glow * 2;
      r.dot(vadd(c, vadd(vmul(SX, Math.cos(a) * 5.4), vmul(SZ, Math.sin(a) * 5.4))), starC, 0.9, k % 2 ? 0.5 : 0.8);
    }
  } else {
    // A crescent of glowing fur: locks laid along the arc, thick in the middle.
    crescent(r, c, 3.8, 0.62, sand, -0.5 + curl, 0.5);
    for (let k = 0; k < 9; k++) {
      const a = -0.5 + curl + Math.PI * (0.25 + (1.5 * k) / 8);
      const at = vadd(c, vadd(vmul(SX, Math.cos(a) * 3.2), vmul(SZ, Math.sin(a) * 3.2)));
      const out = vadd(vmul(SX, Math.cos(a)), vmul(SZ, Math.sin(a)));
      const len = 1.2 + 1.6 * Math.sin((Math.PI * k) / 8);
      furLock(r, at, vadd(at, vmul(out, len)), vmul(vcross(out, [0, 1, 0]), 0.6), [0, 0.5, 0], k % 2 ? sandGlow : sand, sand);
    }
    r.dot(vadd(c, [-1.6, 0.5, 1.6]), white, 0.8, 0.7);
  }
  j.tailTip = c;
}

// ---- clothes and gear -----------------------------------------------------------------------------
function capeAt(B: F3, u: number, v: number, flare: number, lift: number, lag: V3): V3 {
  // u runs round the back from the left front edge (0) to the right front edge (1), v from the collar (0) to the hem.
  const a = (u - 0.5) * 4.5;
  const top = [4.0, 5.4, 14.6],
    bot = [7.6 + flare, 9.6 + flare, 1.6 + lift];
  const rx = top[0] + (bot[0] - top[0]) * v,
    ry = top[1] + (bot[1] - top[1]) * v,
    z = top[2] + (bot[2] - top[2]) * v;
  const bulge = Math.sin(Math.PI * v) * 0.6;
  const p = B.p(-0.6 - Math.cos(a) * (rx + bulge), Math.sin(a) * (ry + bulge), z);
  return vadd(p, vmul(lag, v * v));
}
function capeAndGear(r: Rig, B: F3, form: number, flare: number, lift: number, lag: V3, pouchBob: number, sandLit: number, t: number, j: Record<string, V3>) {
  r.tag = 'cape';
  const cols = 7,
    rows = [0, 0.34, 0.68, 1];
  const patches = form > 0.5 ? [night, night, night, night] : [cape, capeTeal, plum, capeDeep];
  for (let i = 0; i < cols; i++)
    for (let k = 1; k < rows.length; k++) {
      const u0 = i / cols,
        u1 = (i + 1) / cols,
        v0 = rows[k - 1],
        v1 = rows[k];
      const q = [capeAt(B, u0, v0, flare, lift, lag), capeAt(B, u1, v0, flare, lift, lag), capeAt(B, u1, v1, flare, lift, lag), capeAt(B, u0, v1, flare, lift, lag)];
      r.poly(q, patches[(i * 3 + k * 5) % 4]);
      if (form > 0.5) {
        // Inside out: the night lining with stars that twinkle in turn.
        const c = capeAt(B, (u0 + u1) / 2, (v0 + v1) / 2, flare + 0.3, lift, lag);
        const tw = 0.5 + 0.5 * Math.sin(t * TAU * 1.0 + i * 1.7 + k * 2.3);
        r.dot(c, starC, 0.9, 0.6 + 0.5 * tw);
        r.dot(capeAt(B, u0 + 0.3 / cols, v0 + 0.2, flare + 0.3, lift, lag), white, 0.6, 0.45);
      }
    }
  // Patch edges: a darker seam line along the top of every patch row.
  for (let i = 0; i < cols; i++)
    for (const v of [0.34, 0.68]) r.line(capeAt(B, i / cols, v, flare + 0.2, lift, lag), capeAt(B, (i + 1) / cols, v, flare + 0.2, lift, lag), form > 0.5 ? night.T[3] : capeDeep.T[0], 0, 0.35);
  // Soft vertical folds.
  for (let i = 0; i < cols; i++) r.line(capeAt(B, (i + 0.5) / cols, 0.3, flare + 0.15, lift, lag), capeAt(B, (i + 0.5) / cols, 0.95, flare + 0.15, lift, lag), form > 0.5 ? night.T[0] : capeDeep.T[1], 0, 0.3);
  // A running stitch along the hem.
  for (let i = 0; i < cols * 3; i++) r.dot(capeAt(B, (i + 0.5) / (cols * 3), 0.93, flare + 0.3, lift, lag), gold.T[form > 0.5 ? 3 : 1], 0, 0.35);
  // Gold cross-stitches along the seams between patches.
  for (let i = 1; i < cols; i++)
    for (let k = 0; k < 5; k++) {
      const v = 0.08 + k * 0.2,
        du = 0.016,
        dv = 0.035;
      const o = 0.25;
      r.line(capeAt(B, i / cols - du, v - dv, flare + o, lift, lag), capeAt(B, i / cols + du, v + dv, flare + o, lift, lag), gold.T[form > 0.5 ? 3 : 1], 0, 0.4);
      r.line(capeAt(B, i / cols + du, v - dv, flare + o, lift, lag), capeAt(B, i / cols - du, v + dv, flare + o, lift, lag), gold.T[form > 0.5 ? 3 : 1], 0, 0.4);
    }
  // A hem cord and the front edges.
  for (let i = 0; i < cols * 2; i++) r.cap(capeAt(B, i / (cols * 2), 1, flare, lift, lag), capeAt(B, (i + 1) / (cols * 2), 1, flare, lift, lag), 0.5, 0.5, form > 0.5 ? gold : capeDeep);
  for (const u of [0, 1]) for (let k = 1; k < rows.length; k++) r.cap(capeAt(B, u, rows[k - 1], flare, lift, lag), capeAt(B, u, rows[k], flare, lift, lag), 0.45, 0.55, form > 0.5 ? cape : night);
  // A soft fur trim along the collar.
  for (let i = 0; i <= 9; i++) {
    const a = capeAt(B, i / 9, 0, flare, lift, lag),
      b = capeAt(B, i / 9, 0.12, flare + 0.6, lift, lag);
    furLock(r, a, vadd(b, B.v(0, 0, -0.6)), B.v(0, 0, 0.5), vmul(vnorm(vsub(b, B.p(-0.6, 0, 14.6))), 0.5), i % 2 ? creamSoft : cream, creamShade);
  }
  // The hood bunched on the shoulders behind the neck.
  r.tag = 'hood';
  r.ell(B, [-3.6, 0, 15.4], [2.6, 5.0, 2.4], form > 0.5 ? night : plum);
  r.ell(B, [-4.6, 0, 16.4], [1.8, 3.6, 2.0], form > 0.5 ? capeDeep : plumLight);
  r.line(B.p(-2.0, -4.6, 16.2), B.p(-5.6, 0, 18.2), gold.T[2], 0, 0.5);
  r.line(B.p(-5.6, 0, 18.2), B.p(-2.0, 4.6, 16.2), gold.T[2], 0, 0.5);
  for (const y of [-2.4, -0.8, 0.8, 2.4]) r.line(B.p(-4.6, y, 17.4), B.p(-6.0, y * 1.1, 15.4), form > 0.5 ? night.T[3] : plum.T[0], 0, 0.35);
  // The crescent clasp at the throat.
  r.tag = 'clasp';
  const C = B.at(4.0, 0, 13.8).pitch(-0.3);
  for (let k = 0; k < 6; k++) {
    const a0 = Math.PI * (0.6 + (1.2 * k) / 6),
      a1 = Math.PI * (0.6 + (1.2 * (k + 1)) / 6);
    const w0 = 0.2 + 0.7 * Math.sin((Math.PI * k) / 6),
      w1 = 0.2 + 0.7 * Math.sin((Math.PI * (k + 1)) / 6);
    r.poly([C.p(0, Math.cos(a0) * 1.8, Math.sin(a0) * 1.8), C.p(0, Math.cos(a1) * 1.8, Math.sin(a1) * 1.8), C.p(0.1, Math.cos(a1) * (1.8 - w1), Math.sin(a1) * (1.8 - w1)), C.p(0.1, Math.cos(a0) * (1.8 - w0), Math.sin(a0) * (1.8 - w0))], gold, 0.6);
  }
  r.ball(C.p(-0.2, 1.4, 0.2), 0.55, goldDeep);
  for (const s of [-1, 1]) r.cap(C.p(-0.3, s * 1.6, 0.2), B.p(2.0, s * 4.4, 14.4), 0.4, 0.4, form > 0.5 ? gold : goldDeep);
  // Strap across the chest from the right shoulder to the pouch at the left hip.
  r.tag = 'strap';
  const strap = [B.p(1.8, -4.8, 13.8), B.p(4.0, -2.4, 11.2), B.p(5.4, 0.6, 7.8), B.p(5.2, 3.6, 5.2), B.p(3.4, 5.8, 3.6)];
  stitchedStrap(r, strap, B.v(0, 0, 0.95), leatherDark, gold);
  r.tag = 'pouch';
  const pz = 3.2 + pouchBob;
  r.ell(B, [2.0, 6.4, pz], [2.3, 1.8, 2.5], leather);
  r.ell(B, [2.1, 6.6, pz + 1.9], [1.7, 1.5, 0.8], leatherDark);
  r.cap(B.p(2.1, 7.6, pz + 1.6), B.p(3.6, 7.4, pz - 0.6), 0.22, 0.2, gold);
  r.cap(B.p(2.3, 7.4, pz + 1.7), B.p(3.2, 8.2, pz - 0.2), 0.2, 0.18, gold);
  r.ball(B.p(3.3, 8.3, pz - 0.4), 0.4, gold);
  r.ball(B.p(3.7, 7.5, pz - 0.8), 0.45, gold);
  // A little moon patch sewn on the pouch, and its stitches.
  r.dot(B.p(4.25, 6.4, pz - 0.2), gold.T[3], 0.2, 0.9);
  r.dot(B.p(4.3, 6.0, pz + 0.1), leather.T[1], 0, 0.7);
  for (let k = 0; k < 5; k++) r.dot(B.p(3.9 + Math.sin(k) * 0.2, 6.4 + (k - 2) * 0.7, pz - 1.6 + Math.abs(k - 2) * 0.3), gold.T[1], 0, 0.3);
  // Dream sand glows through the drawstring.
  r.dot(B.p(2.4, 6.7, pz + 2.5), sand.T[3], 0.9, 0.8 + 0.6 * sandLit);
  r.dot(B.p(3.4, 6.4, pz + 2.2 + sandLit * 0.6), spark, 0.9, 0.4 + 0.4 * sandLit);
  j.pouch = B.p(2.4, 6.7, pz + 2.6);
}
/** The dream umbrella. `handle` is the grip point, `d` points from the grip to the tip, `side` fixes the crook's plane. */
function umbrella(r: Rig, handle: V3, d: V3, side: V3, open: number, spin: number, form: number, j: Record<string, V3>) {
  r.tag = 'umbrella';
  const u = vnorm(d),
    s1 = vnorm(vsub(side, vmul(u, vdot(side, u)))),
    w1 = vcross(u, s1);
  const L = 25;
  // The wooden crook: down from the grip and round in a J.
  const C = vsub(vadd(handle, vmul(s1, 1.7)), vmul(u, 2.6));
  let prev = vsub(handle, vmul(u, 2.6));
  for (let k = 1; k <= 7; k++) {
    const a = Math.PI + (Math.PI * k) / 7;
    const q = vadd(C, vadd(vmul(s1, Math.cos(a) * 1.7), vmul(u, Math.sin(a) * 1.7)));
    r.cap(prev, q, 0.62, 0.6, wood);
    prev = q;
  }
  r.cap(prev, vadd(prev, vmul(u, 0.7)), 0.6, 0.55, wood);
  r.ball(vadd(prev, vmul(u, 0.8)), 0.6, gold);
  r.cap(vsub(handle, vmul(u, 2.6)), vadd(handle, vmul(u, 2.0)), 0.7, 0.62, wood);
  r.cap(vadd(handle, vmul(u, 2.0)), vadd(handle, vmul(u, 2.6)), 0.66, 0.66, gold);
  r.cap(vadd(handle, vmul(u, 2.6)), vadd(handle, vmul(u, L - 1)), 0.38, 0.32, goldDeep);
  for (const at of [4.2, 7.0, 9.8]) r.cap(vadd(handle, vmul(u, at)), vadd(handle, vmul(u, at + 0.4)), 0.48, 0.48, gold);
  const apex = vadd(handle, vmul(u, L - 1.4));
  // Gold finial with a little star.
  r.cap(apex, vadd(apex, vmul(u, 2.0)), 0.4, 0.25, gold);
  star(r, vadd(apex, vmul(u, 2.9)), 1.3, form > 0.5 ? moonMat : gold, spin * 0.2);
  // Eight gores. Closed they lie along the shaft; open they make a scalloped dome.
  const R = 2.3 + 11.6 * open,
    drop = 10.6 - 6.2 * open;
  const ribDir = (a: number): V3 => vadd(vmul(s1, Math.cos(a)), vmul(w1, Math.sin(a)));
  const tips: V3[] = [],
    mids: V3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * TAU;
    tips.push(vadd(vsub(apex, vmul(u, drop)), vmul(ribDir(a), R)));
    mids.push(vadd(vsub(apex, vmul(u, drop * 0.34)), vmul(ribDir(a), R * 0.72 + 0.15)));
  }
  const glowing = form > 0.5;
  for (let i = 0; i < 8; i++) {
    const n = (i + 1) % 8;
    const m = i % 2 ? (glowing ? canopyGlow : canopy) : glowing ? plumGlow : plum;
    const sag = vadd(vlerp(tips[i], tips[n], 0.5), vmul(vsub(apex, vlerp(tips[i], tips[n], 0.5)), 0.08 * open));
    r.poly([apex, mids[i], mids[n]], m);
    r.poly([mids[i], tips[i], sag, tips[n], mids[n]], i % 2 ? (glowing ? canopyGlow : canopyLight) : m);
    if (open > 0.35) {
      // A painted moon or star in the middle of every gore.
      const c = vlerp(vlerp(mids[i], mids[n], 0.5), sag, 0.45);
      const out = vnorm(vsub(c, vsub(apex, vmul(u, drop * 0.6))));
      const at = vadd(c, vmul(out, 0.25));
      if (i % 2) {
        r.dot(at, gold.T[3], glowing ? 0.6 : 0.1, 1.0);
        r.dot(vadd(at, vmul(vnorm(vsub(tips[n], tips[i])), 0.7)), m.T[1], 0, 0.8);
      } else {
        r.dot(at, starC, glowing ? 0.7 : 0.2, 0.7);
        for (const e of [vmul(u, 0.8), vmul(u, -0.8), vmul(vnorm(vsub(tips[n], tips[i])), 0.8), vmul(vnorm(vsub(tips[n], tips[i])), -0.8)]) r.dot(vadd(at, e), starC, 0.2, 0.35);
      }
      r.ball(tips[i], 0.5, gold);
      r.line(mids[i], tips[i], goldDeep.T[1], 0, 0.2);
    }
  }
  if (open < 0.35) {
    // Furled: the folds of the gores, then a gold tie band round the middle of the bundle.
    for (let i = 0; i < 8; i++) r.line(vlerp(apex, tips[i], 0.2), tips[i], i % 2 ? canopy.T[0] : plum.T[3], 0, 0.6);
    const band = vsub(apex, vmul(u, drop * 0.55));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU,
        b = ((k + 1) / 8) * TAU;
      const rad = R * 0.62 + 0.35;
      r.cap(vadd(band, vmul(ribDir(a), rad)), vadd(band, vmul(ribDir(b), rad)), 0.32, 0.32, gold);
    }
  }
  j.umbTop = vadd(apex, vmul(u, 2.9));
  j.umbHandle = handle;
  j.umbRim = tips[0];
}
/** A cloud sheep: a puffy body, a dark face with curled gold horns, four little legs. */
function sheep(r: Rig, c: V3, face: V3, hop: number, blink: boolean) {
  r.tag = 'sheep';
  const f = vnorm([face[0], face[1], 0]),
    s: V3 = [-f[1], f[0], 0],
    S = new F3(vadd(c, [0, 0, hop]), f, s, [0, 0, 1]).scale(1.35);
  for (let k = 0; k < 4; k++) {
    const y = k % 2 ? 1.1 : -1.1,
      x = k < 2 ? 1.3 : -1.3;
    r.cap(S.p(x, y, -1.4), S.p(x * 1.05, y, -3.4 + hop * 0.15), 0.42, 0.38, inkMat);
  }
  r.ell(S, [0, 0, 0], [3.0, 2.4, 2.1], wool);
  for (const [x, y, z, rad] of [[1.6, 0, 1.4, 1.5], [-0.4, 1.4, 1.5, 1.6], [-0.4, -1.4, 1.5, 1.6], [-2.2, 0, 1.0, 1.5], [0.8, 1.6, 0.2, 1.3], [0.8, -1.6, 0.2, 1.3], [-1.8, 1.2, 0, 1.3], [-1.8, -1.2, 0, 1.3]] as const)
    r.ball(S.p(x, y, z), rad, z > 1 ? wool : woolShade);
  const Hd = S.at(3.0, 0, 0.8);
  r.ell(Hd, [0, 0, 0], [1.3, 1.1, 1.3], indigoLight);
  r.ball(Hd.p(-0.6, 0, 1.0), 0.9, wool);
  for (const k of [-1, 1]) {
    r.cap(Hd.p(-0.2, k * 1.0, 0.4), Hd.p(-0.6, k * 2.0, 0.1), 0.35, 0.25, indigoLight);
    // Curled horns.
    let prev = Hd.p(-0.4, k * 0.9, 0.8);
    for (let n = 1; n <= 5; n++) {
      const a = n * 1.1;
      const q = Hd.p(-0.6 - Math.sin(a) * 0.8, k * (1.1 + n * 0.12), 0.8 + Math.cos(a) * 0.7 - 0.4);
      r.cap(prev, q, 0.28, 0.24, gold);
      prev = q;
    }
    if (blink) r.line(Hd.p(1.2, k * 0.5, 0.2), Hd.p(1.2, k * 0.9, 0.2), white, 0, 0.8);
    else r.dot(Hd.p(1.25, k * 0.55, 0.25), white, 0.2, 0.55);
  }
}

/**
 * The viewer's own eyelids (trick «Сонный песок»): the top lid comes down and the bottom one up over the whole painting,
 * dark skin with a lighter rim, a lash line and lashes; closed, three «Z» float up in the dark. The painting's centre
 * sits about 54 px above his feet wherever he stands in the field.
 */
function eyelids(p: { w: number; h: number; set(x: number, y: number, c: [number, number, number, number]): void }, anchor: [number, number], closed: number, zzz: number) {
  const [ax, ay] = anchor,
    cy = ay - 54,
    open = 1 - saturate(closed);
  const skin = hx('#140c26'),
    rim = hx('#2e1c48'),
    rimLit = hx('#46305e'),
    lash = hx('#040208');
  for (let x = 0; x < p.w; x++) {
    const n = (x - ax) / 190,
      curve = 1 - 0.32 * Math.min(1, n * n);
    const top = cy - open * 150 * curve,
      bottom = cy + open * 112 * curve;
    for (let y = 0; y < p.h; y++) {
      if (y < top) p.set(x, y, top - y < 3 ? rimLit : top - y < 9 ? rim : skin);
      else if (y > bottom) p.set(x, y, y - bottom < 3 ? rimLit : y - bottom < 7 ? rim : skin);
    }
    if (open > 0.02 && open < 0.98) {
      for (let k = 0; k < 2; k++) {
        if (top + k >= 0 && top + k < p.h) p.set(x, Math.round(top + k), lash);
        if (bottom - k >= 0 && bottom - k < p.h) p.set(x, Math.round(bottom - k), lash);
      }
      // Lashes: curved strokes off the top lid, shorter ones off the bottom.
      if (((x % 11) + 11) % 11 === 0) {
        const out = Math.sign(n) * 0.5;
        for (let s = 0; s < 8; s++) {
          const yy = Math.round(top + 1 + s),
            xx = Math.round(x + out * s + (s * s) / 14);
          if (yy >= 0 && yy < p.h && xx >= 0 && xx < p.w) p.set(xx, yy, lash);
        }
        for (let s = 0; s < 4; s++) {
          const yy = Math.round(bottom - 1 - s),
            xx = Math.round(x + out * s);
          if (yy >= 0 && yy < p.h && xx >= 0 && xx < p.w) p.set(xx, yy, lash);
        }
      }
    }
  }
  if (zzz > 0.01 && closed > 0.97) {
    // Three Z floating up, small to big, in pale lilac.
    const col = hx('#cfc4f4');
    for (let n = 0; n < 3; n++) {
      const k = saturate(zzz * 1.6 - n * 0.3);
      if (k <= 0) continue;
      const size = 7 + n * 4,
        zx = Math.round(ax - 30 + n * 22 + Math.sin(k * 4 + n) * 3),
        zy = Math.round(cy + 14 - n * 16 - k * 14);
      for (let i = 0; i <= size; i++) {
        for (const [x, y] of [[zx + i, zy], [zx + i, zy + 1], [zx + size - i, zy + i], [zx + size - i + 1, zy + i], [zx + i, zy + size], [zx + i, zy + size + 1]]) if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.set(x, y, col);
      }
    }
  }
}

// ---- assembly -------------------------------------------------------------------------------------
type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3, 'idle-f2': 1.5, turn: 4 };
/** The counting fence (second-form trick): the sheep run from A to B across it, to his left on screen. */
const FENCE_A = (F: F3) => F.p(8, -14, 0),
  FENCE_B = (F: F3) => F.p(8, -34, 0),
  FENCE_AT = (F: F3) => F.p(8, -24, 0);
/** The three cloud sheep of the second form on their ring: angle offset for each. */
export const SHEEP = [0, TAU / 3, (2 * TAU) / 3];
export function sneakFigure(sample: PoseSample): Figure {
  return (anim, t, side, _variant, pose) => {
    const get = (key: string) => pose[key] ?? 0,
      A = pose as JointPose;
    const period = clips[anim]?.loop ? clips[anim].seconds : (loopPeriods[anim] ?? 0);
    const q = period ? (t * TAU) / period : 0;
    const D = clips[anim]?.seconds ?? 2;
    const cycles = (perSecond: number) => Math.max(1, Math.round(D * perSecond));
    const osc = (perSecond: number, phase = 0) => Math.sin((TAU * cycles(perSecond) * t) / D + phase) - Math.sin(phase);
    const turn = (perSecond: number) => (TAU * cycles(perSecond) * t) / D;
    const previous = (frames: number) => {
      const time = t - frames / 24;
      return sample(anim, period ? ((time % period) + period) % period : Math.max(0, time));
    };
    const lag = (p: JointPose, k: string) => p[k] ?? 0;
    const r = new Rig(),
      j: Record<string, V3> = {};
    // F0 ignores the yaw key: the counting fence and the sheep path stay put while he turns.
    const F0 = F3.yaw(card.life.yaw + (side * Math.PI) / 8),
      F = F0.turn(get('yaw'));
    const form = get('form'),
      sleep = get('sleep');
    // Walking is hopping: a short crouch on landing, a long arc with the feet tucked.
    let hop = 0,
      squash = 0,
      tuck = 0;
    if (anim === 'walk') {
      const ph = (((t * 2) % 1) + 1) % 1;
      if (ph < 0.24) squash = Math.sin((ph / 0.24) * Math.PI);
      else {
        const a = (ph - 0.24) / 0.76;
        hop = 7.2 * 4 * a * (1 - a);
        tuck = Math.sin(a * Math.PI);
      }
    }
    const breath = period && anim !== 'walk' ? 0.35 * Math.sin(q) : 0;
    const hopLift = hop + get('jump');
    const tuckAll = saturate(tuck + get('tuck'));
    const crouch = get('crouch') + squash * 2.4 + sleep * 6.4;
    const hipZ = HIP + get('lift') - crouch + hopLift + breath;
    const hips = F.at(get('lean'), get('drift'), hipZ)
      .pitch(get('pitch') + sleep * 0.75 + squash * 0.12 - tuck * 0.1)
      .roll(get('roll'))
      .turn(get('twist'));
    const B = hips;
    const target = (key: string, rest: V3) => {
      const g = goalAt(A, key, toLocal(F, rest));
      return g ? F.p(...g) : rest;
    };
    const overAll = get('overAll') > 0.5,
      peek = get('peekFront') > 0.5,
      lids = get('lids'),
      blow = get('blow');
    const front = overAll || peek || lids > 0.001 || blow > 0.01 ? new Rig() : null;
    const R0 = overAll ? front! : r;
    // Lagged copies drive the secondary motion: ears, cape, tail, pouch.
    const earLag = previous(2),
      capeLag = previous(3),
      tailLag = previous(4);
    const lagJump = (p: JointPose) => lag(p, 'jump') + lag(p, 'lift') - lag(p, 'crouch');
    if (get('hidden') < 0.5) {
      // Legs.
      for (let index = 0; index < 2; index++) {
        const s = index ? 1 : -1,
          name = s < 0 ? 'L' : 'R';
        const stand = F.p(-2.6 + get('stride') * s, s * 4.0, 1.5);
        const air = vadd(stand, F.v(1.2 * tuckAll, 0, hopLift * 0.92 + 2.2 * tuckAll));
        const curled = F.p(2.4, s * 3.4, 0.9);
        // In a somersault the tucked feet turn with the body instead of staying under it in the world.
        const pk = ((get('pitch') % TAU) + TAU) % TAU;
        const flip = saturate((pk - 0.8) / 0.8) * saturate((5.9 - pk) / 0.8);
        const tucked = hips.p(7.0, s * 4.0, -4.0);
        const rest = vlerp(vlerp(vlerp(stand, air, saturate(hopLift / 2 + tuckAll)), curled, saturate(sleep)), tucked, flip);
        const heel = target('foot' + name, rest);
        const point = saturate(tuckAll * 0.9 + get('point'));
        const toeDir = vnorm(vlerp(F.v(1, s * 0.1, -0.13 - 1.1 * point), hips.v(1, s * 0.1, -0.3), flip));
        leg(R0, hips, s, heel, toeDir, j);
      }
      const capeLift = 5 * saturate((lagJump(capeLag) - lagJump(A)) * 0.4) + get('capeLift') + tuckAll * 2.4;
      const capeTrail = F.v(-0.06 * (lag(capeLag, 'dx') - get('dx')) - 2 * (lag(capeLag, 'twist') - get('twist')), 0.4 * osc(0.5), 0);
      torso(R0, B, get('puff'));
      capeAndGear(R0, B, form, get('flare') + form * 1.2, capeLift, capeTrail, 0.9 * saturate(lagJump(capeLag) - lagJump(A)) * 0.6 - squash * 0.6, get('sand') + 0.3 * (0.5 + 0.5 * osc(1.0)), t, j);
      // The tail turns with the body's own pitch / roll / twist keys (flips, bows, spins), so they carry it round.
      tail(
        R0,
        F.pitch(get('pitch')).roll(get('roll')).turn(get('twist')),
        hips.p(-5.0, 0, 0.8),
        0.12 * osc(0.33) + get('tailSway'),
        lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')) + 0.05 * (lagJump(tailLag) - lagJump(A)) + 0.06 * tuck,
        get('tailCurl') + sleep * 0.7 - 0.25 * tuckAll,
        form,
        turn(0.5),
        j,
      );
      // Head.
      const Hd = B.at(1.6 + sleep * 2.4, 0, 19.2 - sleep * 3.4 - squash * 0.6)
        .turn(0.32 * (1 - saturate(sleep)) + get('gaze'))
        .roll(get('tilt'))
        .pitch(get('nod') + sleep * 0.4);
      R0.tag = 'neck';
      R0.cap(B.p(0.6, 0, 12.6), Hd.p(-0.6, 0, -5.0), 3.4, 3.4, fur);
      const sleepy = 0.26 + get('lid');
      head(R0, Hd, j, {
        blink: Math.max(get('blink'), sleep > 0.6 ? 1 : 0, period && ((q % TAU) + TAU) % TAU > 5.9 ? 1 : 0),
        lid: get('wide') > 0.3 ? saturate(sleepy - get('wide')) : form > 0.5 ? saturate(sleepy - 0.3) : saturate(sleepy),
        smile: get('smile') + 0.35,
        mouth: get('mouth'),
        form,
        lookX: get('lookX'),
        lookY: get('lookY'),
        cheek: get('cheek') + 0.5 * osc(0.33),
        wide: get('wide'),
      });
      for (const s of [-1, 1]) {
        const droop = (s < 0 ? get('earL') : get('earR')) + sleep * 0.75 + (lag(earLag, 'nod') - get('nod')) * 0.8 + 0.25 * tuckAll + 0.12 * squash;
        const flick = s * ((lag(earLag, 'gaze') - get('gaze')) * 1.4 + 0.05 * osc(0.5, s));
        ear(R0, Hd, s, droop, flick, form, j);
      }
      // Arms: the right paw holds the furled umbrella on the shoulder; the left rests by the pouch.
      const umbHeld = get('umbFree') < 0.5;
      const restL = B.p(5.4, -4.0, 8.0),
        restR = B.p(4.6, 5.2, 5.2);
      const sleepR = F.p(6.0, 2.2, 6.0),
        sleepL = F.p(6.2, -2.0, 5.8);
      const handR = target('handR', vlerp(restR, sleepR, saturate(sleep))),
        handL = target('handL', vlerp(restL, sleepL, saturate(sleep)));
      const handRig = peek ? front! : R0;
      // The umbrella is carried in the left paw; `umbInR` hands it to the right one (the near side).
      const inR = get('umbInR') > 0.5;
      const holding = umbHeld && get('umbHidden') < 0.5 && get('umbNose') < 0.5;
      arm(R0, B, 1, handR, j, holding && inR ? 1 : get('gripR'), handRig, get('curl'));
      arm(R0, B, -1, handL, j, holding && !inR ? 1 : get('gripL'), handRig, get('curl'));
      if (get('pinch') > 0.02) {
        // A pinch of dream sand glowing on the right paw.
        const at = vadd(handR, B.v(0.4, 0, 1.6));
        R0.tag = 'sand';
        R0.ball(at, 0.7 + 0.5 * get('pinch'), sandGlow);
        for (let k = 0; k < 5; k++) {
          const a = k * 1.26 + t * 9;
          R0.dot(vadd(at, B.v(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0.8 + (k % 2) * 0.8)), k % 2 ? spark : white, 0.9, 0.5);
        }
        j.pinch = at;
      }
      if (get('umbHidden') < 0.5) {
        const tf = -0.3 + get('umbF'),
          ts = -0.55 + get('umbS');
        const basis = umbHeld && get('umbNose') < 0.5 ? B : F;
        const d = vnorm(basis.v(Math.sin(tf), Math.sin(ts) * Math.cos(tf), Math.cos(tf) * Math.cos(ts)));
        const onNose = get('umbNose') > 0.5 && j.nose;
        const handle = onNose ? vadd(j.nose, vmul(d, 4.6)) : umbHeld ? (inR ? handR : handL) : F.p(get('umbX'), get('umbY'), get('umbZ'));
        umbrella(R0, handle, d, basis.f, saturate(get('umbOpen')), get('umbSpin') + (form > 0.5 ? turn(0.25) : 0), form, j);
      }
      if (form > 0.01 && get('sheepHidden') < 0.5) {
        // Three cloud sheep hop round him on a tilted ring, passing in front and behind.
        const ring = turn(1 / 3) + get('sheepSpin');
        const rad = 15 + get('sheepR');
        for (let k = 0; k < SHEEP.length; k++) {
          const a = ring + SHEEP[k];
          const onRing = F.p(Math.cos(a) * rad, Math.sin(a) * rad * 0.9, 4.6 + get('sheepZ'));
          // Counting sheep: a sheep leaves the ring and runs along the jump path across the fence (to his left).
          const w = saturate(get('sj' + k)),
            u = get('su' + k);
          const path = vadd(vlerp(FENCE_A(F0), FENCE_B(F0), u), F0.v(0, 0, 3.4 + (get('sh' + k) || 1) * 11 * Math.sin(Math.PI * saturate(u)) * (u > 0 && u < 1 ? 1 : 0)));
          const c = vlerp(onRing, path, w);
          const faceDir = w > 0.5 ? F0.v(0, -1, 0) : F.v(-Math.sin(a), Math.cos(a), 0);
          const hopK = 2.4 * Math.abs(Math.sin(turn(1.5) + k * 1.3)) * form * (1 - w);
          // In the phase they drop out of the sand cloud above him onto the ring.
          sheep(R0, vlerp(vadd(c, F.v(0, 0, 22)), c, form), faceDir, hopK, Math.sin(t * 3 + k) > 0.92 || get('dizzy' + k) > 0.5);
          j['sheep' + k] = c;
        }
      }
    }
    if (blow > 0.01 && front) {
      const mouth = j.mouth ?? B.p(9, 0, 17);
      const toward = toLocalDir(F, [0, 0.86, 0.5]);
      front.tag = 'sand';
      for (let i = 0; i < 60; i++) {
        const k = blow - (i % 12) * 0.05;
        if (k <= 0 || k > 1) continue;
        const spread = 0.5 + 2.6 * k;
        const off = F.v(Math.sin(i * 2.3) * spread * 3, Math.cos(i * 1.7) * spread * 3, Math.sin(i * 3.1) * spread * 2.4);
        const at = vadd(vadd(mouth, vmul(F.v(...toward), 6 + 70 * k * k)), off);
        front.dot(at, i % 4 ? sand.T[3] : white, 0.9, 0.8 + 3.2 * k * k);
        if (i % 7 === 0) front.dot(at, starC, 1, 1.6 + 4 * k * k);
      }
    }
    j.fence = FENCE_AT(F0);
    j.fenceNear = vadd(FENCE_AT(F0), F0.v(9, 0, 0));
    j.fenceFar = vadd(FENCE_AT(F0), F0.v(-7, 0, 0));
    j.chest = B.p(3.0, 0, 9.8);
    j.body = B.p(0, 0, 7);
    j.head = j.head ?? B.p(1.6, 0, 19.2);
    j.floor = F.p(0, 0, 0);
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    const finishes: Parameters<typeof finishSurfaces>[2] = [
      [fur, 'fur'],
      [furSoft, 'fur'],
      [furShade, 'fur'],
      [indigo, 'fur'],
      [indigoLight, 'fur'],
      [cream, 'fur'],
      [creamSoft, 'fur'],
      [creamShade, 'fur'],
      [cape, 'paper'],
      [capeTeal, 'paper'],
      [capeDeep, 'paper'],
      [plum, 'paper'],
      [plumLight, 'paper'],
      [canopy, 'paper'],
      [canopyLight, 'paper'],
      [leather, 'strap'],
      [leatherDark, 'strap'],
      [wood, 'lacquer'],
      [gold, 'metal'],
      [goldDeep, 'metal'],
      [eye, 'iris'],
      [nose, 'skin'],
      [inner, 'skin'],
      [innerDeep, 'skin'],
      [wool, 'cap'],
      [woolShade, 'cap'],
    ];
    finishSurfaces(r, F, finishes, 'skin');
    if (front) finishSurfaces(front, F, finishes, 'skin');
    scaleFigure(r, j, portraitScale);
    if (front) scaleFigure(front, {}, portraitScale);
    const frame = projectFigure(r, 160, [80, 150], j, '#120e26', 4.4, true);
    const paint = { outline: ink, inner: 4.4 };
    if (front) {
      // Frames over the painting get a wide canvas for both layers; the floor reflection is left out for those.
      // The viewer's eyelids must cover the whole painting from wherever he stands, so they get a wider one.
      const pad = lids > 0.001 ? 270 : 110,
        size = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      const body = renderRig(r, size, size, ...anchor, paint);
      frame.px = body.p;
      frame.lit = body.lit;
      frame.eye = body.eye;
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.over = renderRig(front, size, size, ...anchor, paint).p;
      if (lids > 0.001) eyelids(frame.over, anchor, lids, get('zzz'));
    }
    const lift = Math.max(0, hipZ - HIP);
    frame.groundShadow =
      get('hidden') > 0.5 || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (160 * 0.12) / (1 + 0.03 * lift), opacity: 0.55 / (1 + 0.05 * lift), reflectionOpacity: front ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = [];
    return frame;
  };
}
