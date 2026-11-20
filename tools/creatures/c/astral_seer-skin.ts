// Астрал, звёздный провидец: a slender pearl-white feline seer that never touches the ground. It floats cross-legged,
// palms up with a small light over each, caracal ears with long dark tassels, a turquoise third-eye crystal set in gold
// on the forehead, a gold torc hovering round the neck, a long tail hanging almost to the grass with a crystal at its
// tip, and three crystals orbiting the body on a tilted ring (six in the awakened form, where the gem opens as an eye,
// the torc becomes a halo behind the head and the runes glow all over).
// The skeleton is its own: a hovering pelvis, IK legs that fold into the lotus or hang down, IK arms with palm goals.
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import { goalAt, toLocal } from '../bodies/goals';
import { furLock } from '../bodies/kits/tailoring';
import { hx, ik, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

const card = readCreatureCard('astral_seer');
export const portraitScale = 1.75;
/** Height of the pelvis above the grass at rest, rig units. */
export const HOVER = 36;
const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const pearl = sw('pearl', [1, 2, 4, 5]),
  pearlShade = sw('pearl', [0, 1, 3, 4]),
  pearlSoft = sw('pearl', [1, 2, 3, 5]),
  midnight = sw('midnight', [0, 1, 2, 4]),
  midnightLight = sw('midnight', [1, 2, 3, 4]),
  gold = sw('gold', [1, 2, 3, 4], 0.08),
  goldDeep = sw('gold', [0, 1, 2, 3]),
  crystal = sw('crystal', [1, 2, 3, 4], 0.4),
  crystalDeep = sw('crystal', [0, 1, 2, 3], 0.25),
  eye = sw('eyes', [0, 1, 2, 3], 0.35),
  nose = sw('nose', [0, 1, 2, 3]),
  inner = sw('inner', [0, 1, 2, 3]),
  aura = sw('aura', [1, 2, 3, 4], 0.75),
  glyph = sw('gold', [2, 3, 3, 4], 0.6);
gold.spec = true;
crystal.spec = true;
const ink = hx('#141428'),
  white = hx('#ffffff'),
  spark = hx('#bff8f2'),
  goldSpark = hx('#fff0b0');
// Short strands keep the white masses readable; midnight bands carry a faint sheen.
for (const m of [pearl, pearlSoft]) {
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 19 + q[1] * 13 + q[2] * 5.5) * Math.cos(q[2] * 9 - q[1] * 9);
    return strand > 0.8 ? m.T[light > 0.74 ? 2 : light > 0.25 ? 1 : 0] : null;
  };
}

const saturate = (x: number) => Math.max(0, Math.min(1, x));
function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function limb(r: Rig, from: V3, to: V3, rw: number, rh: number, m: Mat, facing: V3) {
  const f = axisFrame(vlerp(from, to, 0.5), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * 0.58], m);
}
function band(r: Rig, a: V3, b: V3, at: number, width: number, radius: number, m: Mat) {
  // A dark stripe wrapped round a limb segment.
  const c0 = vlerp(a, b, at - width / 2),
    c1 = vlerp(a, b, at + width / 2);
  r.cap(c0, c1, radius, radius * 0.96, m);
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
/** A six-sided bipyramid along `axis`: the crystals of the orbit, the tail tip and the gem. */
function prism(r: Rig, c: V3, axis: V3, side: V3, length: number, radius: number, spin: number, lit: Mat, deep: Mat) {
  const u = vnorm(axis),
    s = vnorm(vsub(side, vmul(u, vdot(side, u)))),
    w = vcross(u, s);
  const top = vadd(c, vmul(u, length * 0.62)),
    bottom = vsub(c, vmul(u, length * 0.38));
  const rim: V3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = spin + (k / 6) * TAU;
    rim.push(vadd(c, vadd(vmul(s, Math.cos(a) * radius), vmul(w, Math.sin(a) * radius))));
  }
  for (let k = 0; k < 6; k++) {
    const a = rim[k],
      b = rim[(k + 1) % 6];
    r.poly([top, a, b], k % 2 ? lit : deep);
    r.poly([bottom, b, a], k % 2 ? deep : lit);
  }
  r.dot(vadd(c, vmul(u, length * 0.25)), white, 0.6, 0.6);
}

// ---- head -----------------------------------------------------------------------------------------
function ear(r: Rig, H: F3, s: number, droop: number, flick: number, form: number, t: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'ear' + name;
  const E = H.at(-1.6, s * 4.9, 5.2)
    .turn(s * (0.28 + 0.3 * droop))
    .roll(s * (0.3 + 0.55 * droop))
    .pitch(-0.18 + 0.7 * droop);
  const P = (x: number, y: number, z: number) => E.p(x, y * s, z);
  const front = P(2.8, -3.6, 0),
    rear = P(-3.0, 3.6, 0),
    back = P(-3.2, -0.6, 0.6),
    tip = P(-1.8, 0.8, 12.4);
  // Outer rim pearl, inner lining lilac-grey with white strands, the back midnight.
  r.poly([front, rear, tip], pearl);
  r.poly([rear, back, tip], midnight);
  r.poly([back, front, tip], midnightLight);
  const ia = vlerp(front, tip, 0.1),
    ib = vlerp(rear, tip, 0.1),
    it = vlerp(tip, vlerp(front, rear, 0.5), 0.18);
  const lift = E.v(0.5, 0, 0);
  r.poly([vadd(ia, lift), vadd(ib, lift), vadd(it, lift)], inner);
  for (let k = 0; k < 6; k++)
    furLock(r, vadd(vlerp(ia, ib, 0.1 + k * 0.16), lift), vadd(vlerp(ia, it, 0.3 + 0.08 * k), E.v(0.7, s * 0.3, 0.5)), E.v(0, 0.5, 0), E.v(0.6, 0, 0.2), pearlSoft, inner);
  // Tassel: three dark strands sweeping up and out, a spark (or turquoise flame) at the end.
  r.tag = 'tassel' + name;
  const sway = 0.5 * flick;
  let end = tip;
  for (let k = 0; k < 5; k++) {
    const a = vadd(tip, E.v(-0.2 * k, s * 0.2 * (k - 2), -0.4)),
      b = vadd(a, E.v(-0.9 - sway, s * (1.4 + sway * 1.2 + 0.25 * k), 2.8 - 0.4 * Math.abs(k - 2)));
    r.cap(a, b, 0.85, 0.18, midnight);
    if (k === 2) end = b;
  }
  if (form > 0.3) {
    const flame = vadd(end, E.v(0, 0, 1.5));
    for (let k = 0; k < 3; k++) {
      const f = vadd(end, E.v(-0.8 + 0.8 * k, s * (0.2 * k), 3.2 + Math.sin(t * 17 + k + s) * 0.9 - Math.abs(k - 1)));
      r.cap(vlerp(end, flame, 0.3), f, 1.1 * form, 0.15, crystal);
    }
  }
  r.dot(end, spark, 0.9, 0.7);
  j['ear' + name] = tip;
  j['tassel' + name] = end;
}
function head(r: Rig, H: F3, j: Record<string, V3>, p: { blink: number; smile: number; mouth: number; form: number; gem: number; ruff: number; mane: number; t: number }) {
  r.tag = 'head';
  r.ell(H, [0, 0, 0.4], [7.2, 8.0, 7.0], pearl);
  r.ell(H, [-1.5, 0, 3.2], [5.6, 6.6, 4.4], pearlSoft);
  // Ruff: long white locks sweep back and down from the cheeks like a lynx collar.
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'cheekL' : 'cheekR';
    r.ell(H, [2.2, s * 4.8, -2.6], [4.6, 4.2, 3.8], pearl);
    for (let k = 0; k < 8; k++) {
      const a = H.p(1.6 - k * 0.7, s * (6.4 - k * 0.12), -1.4 - k * 0.7);
      const tip = H.p(-2.6 - k * 0.8 + p.ruff, s * (9.4 + 0.25 * k), -5.6 - k * 1.1);
      furLock(r, a, tip, H.v(0, 0.6, 1.2), H.v(-1, s * 1.6, -0.3), k % 2 ? pearlSoft : pearl, pearlShade);
    }
  }
  // Mane: long locks from the back of the skull stream back and up in the seer's own field, tipped midnight.
  r.tag = 'mane';
  for (let k = 0; k < 12; k++) {
    const y = (k - 5.5) * 1.15;
    const a = H.p(-5.4 + Math.abs(y) * 0.2, y, 3.0 - Math.abs(y) * 0.35 - (k % 2) * 1.4);
    const tip = H.p(-9.6 - (k % 2) * 1.2 + p.mane * 0.4, y * 1.4, -5.6 - Math.abs(y) * 0.4 + p.mane - (k % 2) * 1.6);
    furLock(r, a, vlerp(a, tip, 0.7), H.v(0, 0.9, 0.4), H.v(-0.4, 0, 1.2), k % 2 ? pearlSoft : pearl, pearlShade);
    furLock(r, vlerp(a, tip, 0.6), tip, H.v(0, 0.6, 0.3), H.v(-0.3, 0, 0.9), midnightLight, midnight);
  }
  // Muzzle: short and white with a dark tip at the nose bridge; a small pink-grey nose.
  r.tag = 'muzzle';
  r.ell(H, [5.6, 0, -2.6], [3.2, 4.0, 2.6], pearl);
  for (const s of [-1, 1]) r.ell(H, [6.4, s * 1.7, -3.0], [2.0, 2.0, 1.7], pearlSoft);
  r.ell(H, [7.2, 0, -1.2], [1.5, 1.7, 1.2], midnightLight);
  r.tag = 'nose';
  r.poly([H.p(8.6, -1.2, -1.2), H.p(8.6, 1.2, -1.2), H.p(8.9, 0, -2.4)], nose);
  r.line(H.p(8.9, 0, -2.4), H.p(8.4, 0, -3.4), ink, 0, 0.5);
  r.tag = 'jaw';
  const open = saturate(p.mouth);
  const J = H.at(4.6, 0, -4.2).pitch(0.5 * open);
  r.ell(J, [1.6, 0, -0.4], [2.4, 2.8, 1.3], pearl);
  if (open > 0.15) r.ell(J, [1.8, 0, 0.4], [1.8, 2.0, 0.6], nose);
  for (const s of [-1, 1]) {
    const corner = H.p(7.4, s * (2.6 + p.smile * 0.6), -3.6 + p.smile * 0.6);
    r.line(H.p(8.4, 0, -3.4), corner, ink, 0, 0.5);
  }
  // Whiskers with sparks on the tips.
  r.tag = 'whiskers';
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = H.p(7.0, s * 2.4, -2.2 - k * 0.45),
        b = H.p(5.0 - k * 0.6, s * (11 + k * 0.8), -1.6 - k * 1.4);
      r.line(a, b, hx('#c8cce0'), 0.1, 0.35);
      r.dot(b, k === 1 ? goldSpark : spark, 0.7, 0.4);
    }
  // Big almond eyes, teal, slit pupil, a highlight and a liner flick to the temple.
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const e = H.at(5.2, s * 3.7, 0.9).turn(s * 0.42);
    const P = (x: number, y: number, z: number) => e.p(x, s * y, z);
    const start = r.size;
    const opened = p.blink < 0.5;
    const inner0 = P(0.6, -1.9, -0.8),
      outer0 = P(-0.2, 2.6, 1.4),
      lid = P(0.5, 0.2, 2.4),
      under = P(0.6, 0.4, -1.6);
    if (opened) {
      r.poly([inner0, lid, outer0, under], { T: [ink, ink, hx('#1e2240'), hx('#2a3058')] });
      r.ell(e, [0.5, s * 0.25, 0.3], [0.7, 2.0, 1.9], p.form > 0.5 ? sw('crystal', [2, 3, 4, 4], 0.8) : eye);
      r.ell(e, [0.9, s * 0.4, 0.3], [0.3, 0.42, 1.55], { T: [ink, ink, ink, hx('#1a1830')] });
      r.dot(P(1.0, -0.3, 1.2), white, 0.4, 0.7);
      r.dot(P(1.0, 1.0, -0.5), spark, 0.5, 0.4);
    } else r.line(inner0, outer0, ink, 0, 0.75);
    r.line(lid, outer0, ink, 0, 0.75);
    r.line(outer0, P(-1.2, 3.8, 2.2), ink, 0, 0.6);
    r.markEye(start, s, opened);
    if (s > 0) j.eyeR = r.eye = P(0.6, 0.3, 0.3);
    else j.eyeL = P(0.6, 0.3, 0.3);
  }
  // The third-eye gem in its gold setting; awakened, it opens as an eye. Gold runes run over the brows.
  r.tag = 'gem';
  const G = H.at(6.0, 0, 3.8).pitch(-0.55);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU,
      b = ((k + 1) / 8) * TAU;
    r.cap(G.p(0, Math.cos(a) * 1.9, Math.sin(a) * 2.6), G.p(0, Math.cos(b) * 1.9, Math.sin(b) * 2.6), 0.42, 0.42, gold);
  }
  if (p.gem > 0.5) {
    r.ell(G, [0.2, 0, 0], [0.4, 1.5, 2.1], { T: [hx('#c8d0e8'), hx('#e8ecf8'), white, white], glow: 0.4 });
    r.ell(G, [0.5, 0, 0], [0.3, 0.9, 0.9], sw('crystal', [2, 3, 4, 4], 0.9));
    r.ell(G, [0.7, 0, 0], [0.2, 0.25, 0.75], { T: [ink, ink, ink, ink] });
  } else {
    const top = G.p(0.4, 0, 2.2),
      bot = G.p(0.4, 0, -2.2),
      lft = G.p(0.4, -1.6, 0),
      rgt = G.p(0.4, 1.6, 0),
      mid = G.p(1.1, 0, 0.2);
    r.poly([top, lft, mid], crystal);
    r.poly([top, mid, rgt], crystalDeep);
    r.poly([bot, mid, lft], crystalDeep);
    r.poly([bot, rgt, mid], crystal);
  }
  r.dot(G.p(1.0, -0.4, 0.9), white, 0.8, 0.55);
  r.tag = 'glyphs';
  const runeMat = p.form > 0.3 ? glyph : gold;
  for (const s of [-1, 1]) {
    const pts = [H.p(6.2, s * 1.8, 3.6), H.p(5.6, s * 3.4, 4.2), H.p(4.2, s * 5.0, 4.0), H.p(2.6, s * 6.2, 3.0)];
    for (let k = 1; k < pts.length; k++) r.line(pts[k - 1], pts[k], runeMat.T[3], runeMat.glow ?? 0, 0.45);
    r.dot(pts[3], runeMat.T[3], 0.6, 0.55);
    r.dot(H.p(4.6, s * 4.6, 5.0), runeMat.T[2], 0.4, 0.45);
  }
}
function torc(r: Rig, center: V3, B: F3, halo: number, spin: number, form: number, j: Record<string, V3>) {
  // An open gold ring floating round the neck, knobbed ends with turquoise stones at the front.
  // Awakened, it rises behind the head and opens into a halo with runes.
  r.tag = 'torc';
  const flat = B.turn(spin);
  const up = flat.pitch(-Math.PI / 2 * halo);
  const C = new F3(center, up.f, up.s, up.u);
  const radius = 7.4 + 4.6 * halo,
    gap = 0.55 * (1 - halo);
  const n = 24;
  const at = (a: number): V3 => C.p(Math.cos(a) * radius, Math.sin(a) * radius, 0);
  for (let k = 0; k < n; k++) {
    const a = gap + ((TAU - 2 * gap) * k) / n,
      b = gap + ((TAU - 2 * gap) * (k + 1)) / n;
    r.cap(at(a), at(b), 0.9, 0.9, k % 3 ? gold : goldDeep);
  }
  for (const a of [gap, TAU - gap]) {
    r.ball(at(a), 1.5, gold);
    r.ball(vadd(at(a), C.v(0.3, 0, 0.6)), 0.8, crystal);
  }
  r.ball(at(Math.PI), 1.1, crystal);
  // Engraved studs between the segments catch the light.
  for (let k = 1; k < 12; k++) r.dot(vadd(at(gap + ((TAU - 2 * gap) * k) / 12), C.v(0, 0, 0.7)), goldSpark, 0.2, 0.4);
  if (halo > 0.3)
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + spin;
      r.dot(C.p(Math.cos(a) * (radius - 1.8), Math.sin(a) * (radius - 1.8), 0), k % 3 ? goldSpark : spark, 0.8 * form, 0.5);
    }
  j.torc = center;
}

// ---- body -----------------------------------------------------------------------------------------
function torso(r: Rig, B: F3, form: number, ruff: number) {
  r.tag = 'pelvis';
  r.ell(B, [-0.4, 0, 0.6], [4.4, 5.2, 4.2], pearl);
  r.tag = 'belly';
  r.ell(B, [0.8, 0, 6.0], [3.8, 4.6, 5.2], pearlSoft);
  r.tag = 'chest';
  r.ell(B, [0.4, 0, 12.8], [4.8, 6.6, 6.0], pearl);
  // Midnight tabby bars on the flanks, a midnight diamond between the shoulder blades.
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const a = B.p(-1.2 - k * 0.5, s * (5.0 - k * 0.3), 4.4 + k * 2.8),
        b = B.p(-3.0 - k * 0.5, s * (4.0 - k * 0.3), 3.4 + k * 2.8);
      r.poly([a, b, vadd(b, B.v(0, 0, 1.0)), vadd(a, B.v(0, 0, 1.4))], midnight);
    }
  r.poly([B.p(-4.4, 0, 16.4), B.p(-4.6, -2.2, 13.2), B.p(-4.2, 0, 9.6), B.p(-4.6, 2.2, 13.2)], midnight);
  // Guard hair: locks down the back and over the hips, pointing to the tail.
  for (let k = 0; k < 8; k++)
    for (const s of [-1, 1]) {
      const a = B.p(-3.6 - (k % 2) * 0.4, s * (2.4 + (k % 3) * 0.7), 16 - k * 1.9);
      furLock(r, a, vadd(a, B.v(-1.4, s * 0.8, -3.2)), B.v(0, 1.0, 0), B.v(-0.8, 0, 0), k % 2 ? pearl : pearlSoft, pearlShade);
    }
  for (const s of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = B.p(-1 + k * 1.2, s * 5.4, 1.4 - (k % 2) * 0.8);
      furLock(r, a, vadd(a, B.v(-0.6, s * 1.4, -3.4)), B.v(1.0, 0, 0), B.v(0, s * 0.8, 0), pearlSoft, pearlShade);
    }
  r.tag = 'belly';
  for (let row = 0; row < 2; row++)
    for (let k = 0; k < 4; k++) {
      const y = (k - 1.5) * 1.8;
      const a = B.p(4.0 - row * 0.2, y, 8.6 - row * 2.6);
      furLock(r, a, vadd(a, B.v(0.5, y * 0.1, -2.6)), B.v(0, 0.9, 0), B.v(0.8, 0, 0), (row + k) % 2 ? pearlSoft : pearl, pearlShade);
    }
  // The white jabot: layered locks down the chest, moved by the seer's own field.
  r.tag = 'ruff';
  for (let row = 0; row < 4; row++)
    for (let k = 0; k < 5; k++) {
      const y = (k - 2) * 1.7;
      const a = B.p(4.2 - row * 0.3, y, 17.6 - row * 2.2 - Math.abs(y) * 0.3),
        tip = B.p(5.0 - row * 0.2 + ruff * 0.4, y * 1.1, 12.4 - row * 2.8 - Math.abs(y) * 0.2);
      furLock(r, a, tip, B.v(0, 1.1, 0), B.v(1.2, 0, 0.2), (row + k) % 2 ? pearl : pearlSoft, pearlShade);
    }
  r.tag = 'glyphs';
  const runeMat = form > 0.3 ? glyph : gold;
  const pts = [B.p(4.6, 0, 9.0), B.p(4.4, -1.8, 7.2), B.p(4.6, 0, 5.4), B.p(4.4, 1.8, 7.2), B.p(4.6, 0, 9.0)];
  for (let k = 1; k < pts.length; k++) r.line(pts[k - 1], pts[k], runeMat.T[form > 0.3 ? 3 : 2], (runeMat.glow ?? 0) * Math.max(0.3, form), 0.6);
  r.dot(B.p(4.7, 0, 7.2), form > 0.3 ? goldSpark : gold.T[3], 0.5, 0.6);
}
function arm(r: Rig, B: F3, s: number, hand: V3, palmUp: number, form: number, light: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(0.2, s * 6.2, 16.2);
  const elbow = ik(shoulder, hand, 9.8, 9.6, B.v(-0.5, s * 0.9, -0.6));
  r.tag = 'shoulder' + name;
  r.ell(B.at(0.2, s * 6.0, 16.6).turn(s * 0.6), [0, 0, 0], [3.2, 3.4, 3.2], pearl);
  for (let k = 0; k < 3; k++) {
    const a = B.p(1.2 - k * 1.4, s * (7.6 + (k % 2) * 0.4), 17.4 - k * 0.6);
    furLock(r, a, vadd(a, B.v(-0.6, s * 1.8, -2.8)), B.v(1.0, 0, 0), B.v(0, s * 0.8, 0.4), k % 2 ? pearlSoft : pearl, pearlShade);
  }
  r.tag = 'arm' + name;
  limb(r, shoulder, elbow, 2.6, 2.5, pearl, B.f);
  for (let k = 0; k < 3; k++) {
    const at = vlerp(shoulder, elbow, 0.3 + k * 0.22);
    const out = vnorm(vcross(vsub(elbow, shoulder), B.f));
    furLock(r, vadd(at, vmul(out, -s * 2.0)), vadd(at, vadd(vmul(out, -s * 3.2), vmul(vnorm(vsub(elbow, shoulder)), 2.4))), vmul(vnorm(vsub(elbow, shoulder)), 1.0), vmul(out, -s * 0.6), k % 2 ? pearlSoft : pearl, pearlShade);
  }
  furLock(r, elbow, vadd(elbow, vmul(vnorm(vsub(elbow, vlerp(shoulder, hand, 0.5))), 3.0)), vmul(vnorm(vsub(hand, elbow)), 1.2), B.v(0, 0, 1), pearlSoft, pearlShade);
  const wrist = vlerp(elbow, hand, 0.84);
  // Siamese points: the forearm darkens into a midnight glove below the middle.
  const mid = vlerp(elbow, wrist, 0.48);
  r.cap(elbow, mid, 2.3, 2.0, pearl);
  r.cap(mid, wrist, 2.05, 1.7, midnight);
  for (let k = 0; k < 3; k++) {
    const at = vlerp(elbow, mid, 0.7 + k * 0.12);
    r.dot(vadd(at, vmul(vnorm(vcross(vsub(wrist, elbow), B.u)), s * 2.0)), midnightLight.T[2], 0, 0.45);
  }
  // Runes along the forearm; they glow while the seer is using its power.
  const runeMat = form > 0.3 || light > 0.5 ? glyph : gold;
  const side = vnorm(vcross(vsub(wrist, elbow), B.u));
  for (let k = 0; k < 3; k++) {
    const a = vadd(vlerp(elbow, wrist, 0.2 + k * 0.24), vmul(side, s * 2.0)),
      b = vadd(vlerp(elbow, wrist, 0.3 + k * 0.24), vmul(side, s * 2.0));
    r.line(a, b, runeMat.T[3], runeMat.glow ?? 0, 0.5);
  }
  // Two gold bracers float round the wrist, slowly turning, each with a turquoise stone.
  r.tag = 'glyphs';
  const fa = vnorm(vsub(wrist, elbow));
  const fs = vnorm(vcross(fa, B.u)),
    fu = vcross(fs, fa);
  for (const [at, rad, ph] of [[0.62, 3.0, 0], [0.86, 2.7, 1.3]] as const) {
    const c = vlerp(elbow, wrist, at);
    const ring = (a: number): V3 => vadd(c, vadd(vmul(fs, Math.cos(a) * rad), vmul(fu, Math.sin(a) * rad)));
    for (let k = 0; k < 14; k++) r.cap(ring((k / 14) * TAU + ph), ring(((k + 1) / 14) * TAU + ph), 0.42, 0.42, k % 2 ? gold : goldDeep);
    r.ball(ring(ph + Math.PI / 2), 0.7, crystal);
  }
  // Hand: palm pad, four fingers, thumb; palm up shows the pads and the little light above it.
  r.tag = 'hand' + name;
  const dir = vnorm(vsub(hand, elbow));
  const W = axisFrame(hand, B.u, dir).roll(-s * 0.2);
  const Wp = new F3(hand, dir, vnorm(vcross(B.u, dir)), B.u).roll(s * (Math.PI / 2) * (1 - palmUp));
  r.ell(Wp, [0, 0, 0], [2.6, 2.3, 1.3], midnight);
  for (let k = 0; k < 4; k++) {
    const y = (k - 1.5) * 0.95;
    r.cap(Wp.p(1.8, y, 0.2), Wp.p(3.4 - Math.abs(y) * 0.4, y * 1.2, 0.6), 0.62, 0.48, midnight);
    if (palmUp > 0.5) r.dot(Wp.p(3.2 - Math.abs(y) * 0.4, y * 1.2, 1.0), nose.T[2], 0, 0.35);
  }
  r.cap(Wp.p(0.4, -s * 2.0, 0.4), Wp.p(1.8, -s * 2.6, 0.8), 0.7, 0.5, midnight);
  if (palmUp > 0.5) r.ell(Wp, [0.2, 0, 1.0], [1.2, 1.1, 0.3], nose);
  void W;
  if (light > 0.05) {
    const orb = vadd(hand, vadd(vmul(B.u, 3.4), vmul(dir, 0.6)));
    r.ball(orb, 1.2 + 0.7 * light, aura);
    r.dot(orb, white, 1, 0.6 + 0.3 * light);
    j['light' + name] = orb;
  }
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function leg(r: Rig, hips: F3, s: number, foot: V3, lotus: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = hips.p(0.4, s * 3.4, -1.2);
  const pole = vnorm(vlerp(hips.v(0.6, s * 1, 0.5), hips.v(1, 0, 0.1), 1 - lotus));
  const knee = ik(hip, foot, 14.2, 14.6, pole);
  r.tag = 'thigh' + name;
  limb(r, hip, knee, 3.0, 2.8, pearl, hips.f);
  for (let k = 0; k < 3; k++) {
    const a = vadd(vlerp(hip, knee, 0.3 + k * 0.2), hips.v(1.2, s * 2.8, 0)),
      b = vadd(vlerp(hip, knee, 0.38 + k * 0.2), hips.v(1.6, s * 2.6, 0));
    r.line(a, b, gold.T[2], 0.1, 0.5);
  }
  for (let k = 0; k < 4; k++) {
    const at = vlerp(hip, knee, 0.25 + k * 0.18);
    furLock(r, vadd(at, hips.v(-1.2, s * 1.4, -1.8)), vadd(at, hips.v(-2.2, s * 2.2, -3.8)), vmul(vnorm(vsub(knee, hip)), 1.2), hips.v(0, s, -0.4), k % 2 ? pearlSoft : pearl, pearlShade);
  }
  for (let k = 0; k < 3; k++) {
    const out = vnorm(vsub(knee, vlerp(hip, foot, 0.5)));
    const a = vadd(knee, vmul(hips.s, s * (k - 1) * 0.9));
    furLock(r, a, vadd(a, vadd(vmul(out, 2.4), vmul(hips.s, s * (k - 1) * 0.8))), vmul(vnorm(vsub(foot, knee)), 1.0), hips.u, k === 1 ? pearlSoft : pearl, pearlShade);
  }
  r.tag = 'shin' + name;
  const ankle = vlerp(knee, foot, 0.86);
  const sock = vlerp(knee, ankle, 0.42);
  for (let k = 0; k < 3; k++) {
    const at = vlerp(knee, sock, 0.25 + k * 0.3);
    furLock(r, vadd(at, hips.v(-1.6, 0, 0)), vadd(at, hips.v(-3.4, s * 0.6, -2.4)), hips.v(0, 1.0, 0), hips.v(-0.6, 0, 0.4), k % 2 ? pearl : pearlSoft, pearlShade);
  }
  r.cap(knee, sock, 2.2, 1.9, pearl);
  r.cap(sock, ankle, 1.95, 1.5, midnight);
  r.ell(axisFrame(sock, vsub(knee, ankle), hips.f), [0, 0, 0], [2.2, 2.2, 0.6], midnightLight);
  // A long digitigrade foot: sole along the shin's continuation, toes splayed, pads underneath.
  r.tag = 'foot' + name;
  const along = vnorm(vsub(foot, knee));
  const P = axisFrame(foot, vmul(along, -1), hips.v(0, s, 0));
  r.cap(ankle, foot, 1.8, 1.6, midnight);
  for (let k = 0; k < 4; k++) {
    const y = (k - 1.5) * 1.0;
    const tip = vadd(foot, vadd(vmul(along, 2.6 - Math.abs(y) * 0.3), vmul(P.s, y * 1.2)));
    r.cap(vadd(foot, vmul(P.s, y * 0.8)), tip, 0.75, 0.55, midnight);
    r.dot(vadd(tip, vmul(P.f, 0.6)), nose.T[2], 0, 0.35);
  }
  j['knee' + name] = knee;
  j['foot' + name] = foot;
}
function tail(r: Rig, F: F3, base: V3, hover: number, sway: number, lagSway: number, curl: number, form: number, j: Record<string, V3>) {
  // It hangs from the base of the spine almost to the grass and hooks up at the end round its crystal.
  // A question mark beside the seer: down and out from the spine, round, and the crystal tip curls up at hip height.
  const w = (k: number) => (sway + lagSway * k) * k;
  const H = (x: number, y: number, z: number): V3 => vadd(base, F.v(x, y + w(Math.min(1, Math.hypot(x, y, z) / 22)) * 5, z));
  void hover;
  const pts: V3[] = [
    base,
    H(-4.8, 0.8, -5.0),
    H(-7.0, 5.0, -12.0),
    H(-4.6 + curl * 2, 11.6, -16.4 + curl * 4),
    H(-0.6 + curl * 3, 17.4, -12.6 + curl * 4),
    H(0.8 + curl * 3, 19.6, -4.4 + curl * 3),
    H(-0.8 + curl * 2, 17.6 - curl * 2, 2.6 + curl * 1.5),
  ];

  r.tag = 'tail';
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a = catmull(pts, k / n),
      b = catmull(pts, (k + 1) / n);
    const t0 = k / n;
    const rad = 2.9 - 1.2 * t0;
    r.cap(a, b, rad, rad - 1.1 / n, t0 > 0.56 ? midnight : t0 > 0.5 ? midnightLight : pearl);
  }
  // Soft locks along the tail, lying toward the tip.
  for (let k = 1; k < 14; k++) {
    const t0 = k / 16,
      c = catmull(pts, t0),
      d = vnorm(vsub(catmull(pts, t0 + 0.02), c));
    const sd = vnorm(vcross(d, F.u)),
      ud = vcross(sd, d);
    const rad = 2.9 - 1.2 * t0;
    for (const sg of [-1, 0, 1]) {
      const out = vnorm(vadd(vmul(ud, 0.8), vmul(sd, sg * 0.9)));
      const dark = t0 > 0.54;
      furLock(r, vadd(c, vmul(out, rad * 0.7)), vadd(c, vadd(vmul(out, rad * 1.15), vmul(d, 2.6))), vmul(vcross(out, d), 0.9), vmul(out, 0.6), dark ? midnightLight : k % 2 ? pearl : pearlSoft, dark ? midnight : pearlShade);
    }
  }
  // A ring of soft fur before the tip, then the crystal.
  const ringAt = catmull(pts, 0.86),
    dir = vnorm(vsub(catmull(pts, 0.99), catmull(pts, 0.84)));
  const side = vnorm(vcross(dir, F.u));
  const up2 = vcross(side, dir);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU;
    const out = vadd(vmul(side, Math.cos(a)), vmul(up2, Math.sin(a)));
    furLock(r, vadd(ringAt, vmul(out, 1.2)), vadd(ringAt, vadd(vmul(out, 3.2), vmul(dir, 2.6))), vmul(vcross(out, dir), 0.9), vmul(out, 0.8), k % 2 ? midnightLight : midnight, midnight);
  }
  r.tag = 'tailCrystal';
  const tip = catmull(pts, 0.999);
  prism(r, vadd(tip, vmul(dir, 2.0)), dir, side, 6.0 + form, 1.6, 0.3, crystal, crystalDeep);
  j.tailTip = vadd(tip, vmul(dir, 5.2));
}
function orbit(r: Rig, center: V3, F: F3, count: number, phase: number, radius: number, tilt: number, lagOffset: V3, j: Record<string, V3>) {
  const plane = F.roll(tilt).pitch(0.25);
  for (let k = 0; k < count; k++) {
    const a = phase + (k / count) * TAU;
    r.tag = ['crystalA', 'crystalB', 'crystalC'][k % 3];
    const c = vadd(vadd(center, vadd(vmul(plane.f, Math.cos(a) * radius), vmul(plane.s, Math.sin(a) * radius))), vmul(lagOffset, 0.4 + 0.2 * k));
    prism(r, c, vadd(plane.u, vmul(plane.f, 0.2 * Math.sin(a))), plane.f, 7.6, 2.2, a * 1.5, crystal, crystalDeep);
    j['crystal' + k] = c;
  }
}

// ---- assembly -------------------------------------------------------------------------------------
type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3.5, 'idle-f2': 3 };
export function seerFigure(sample: PoseSample): Figure {
  return (anim, t, side, _variant, pose) => {
    const get = (key: string) => pose[key] ?? 0,
      A = pose as JointPose;
    const period = loopPeriods[anim] ?? 0;
    const q = period ? (t * TAU) / period : 0;
    const previous = (frames: number) => {
      const time = t - frames / 24;
      return sample(anim, period ? ((time % period) + period) % period : Math.max(0, time));
    };
    const lag = (p: JointPose, k: string) => p[k] ?? 0;
    const r = new Rig(),
      j: Record<string, V3> = {};
    const F = F3.yaw(card.life.yaw + (side * Math.PI) / 8).turn(get('yaw'));
    const form = get('form'),
      sleep = get('sleep');
    const bob = period ? 1.3 * Math.sin(q) : 0;
    const lotus = saturate(get('lotus') + sleep);
    const hover = HOVER + get('hover') - get('squat') + bob - sleep * 6;
    const hips = F.at(get('lean') - sleep * 1.5, get('drift'), hover)
      .pitch(get('pitch') + sleep * 0.35)
      .roll(get('roll'))
      .turn(get('twist'));
    const body = hips;
    const target = (key: string, rest: V3) => {
      const g = goalAt(A, key, toLocal(F, rest));
      return g ? F.p(...g) : rest;
    };
    // Parts that cross the frame in peek / overAll go into a separate rig drawn over the painting frame.
    const overAll = get('overAll') > 0.5,
      peek = get('peekFront') > 0.5;
    const front = overAll || peek ? new Rig() : null;
    const pick = (part: string) => (overAll ? front! : peek && ['head', 'ear', 'armL', 'armR', 'torc'].includes(part) ? front! : r);
    if (get('hidden') < 0.5) {
      // Lagged copies drive the secondary motion: tail, ears, tassels, ruff, torc and orbit.
      const tailLag = previous(4),
        earLag = previous(2),
        ruffLag = previous(3),
        torcLag = previous(3);
      tail(
        overAll ? front! : r,
        F,
        hips.p(-4.4, 0, 0.6),
        hover,
        0.25 * Math.sin(t * 1.9) + get('tailSway'),
        lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')) + 0.04 * (lag(tailLag, 'dx') - get('dx')),
        get('tailCurl') + sleep * 0.6,
        form,
        j,
      );
      torso(overAll ? front! : r, body, form, 0.6 * Math.sin(t * 2.3) + 2 * (lag(ruffLag, 'nod') - get('nod')));
      for (let index = 0; index < 2; index++) {
        const s = index ? 1 : -1,
          name = s < 0 ? 'L' : 'R';
        const lotusFoot = hips.p(6.6, -s * 2.6, -5.6);
        const hanging = hips.p((s < 0 ? 3.6 : 0.4) + get('stride') * s, s * (s < 0 ? 2.8 : 3.4), s < 0 ? -26.4 : -27.8);
        const rest = vlerp(hanging, lotusFoot, lotus);
        leg(overAll ? front! : r, hips, s, target('foot' + name, rest), lotus, j);
      }
      // Neck and head.
      const headF = body
        .at(1.2 + sleep * 1.4, 0, 26.6 - sleep * 4.4)
        .turn(get('gaze'))
        .roll(get('tilt'))
        .pitch(get('nod') + sleep * 0.45)
        .scale(1.1);
      const neckRig = pick('head');
      neckRig.tag = 'neck';
      neckRig.cap(body.p(0.8, 0, 17.6), headF.p(-0.8, 0, -4.2), 3.6, 3.4, pearl);
      head(pick('head'), headF, j, {
        blink: Math.max(get('blink'), sleep > 0.8 ? 1 : 0, period && ((q % TAU) + TAU) % TAU > 6.0 ? 1 : 0),
        smile: get('smile'),
        mouth: get('mouth'),
        form,
        gem: get('gemOpen'),
        ruff: 0.8 * Math.sin(t * 2.1) + 3 * (lag(ruffLag, 'nod') - get('nod')),
        mane: 0.9 * Math.sin(t * 1.7) + 4 * (lag(ruffLag, 'nod') - get('nod')) + 2.5 * (lag(ruffLag, 'hover') - get('hover')) * 0.3 + form * 1.5,
        t,
      });
      for (const s of [-1, 1]) {
        const droop = (s < 0 ? get('earL') : get('earR')) + sleep * 0.6 + (lag(earLag, 'nod') - get('nod')) * 0.8;
        const flick = (lag(earLag, 'gaze') - get('gaze')) * 3 + 0.3 * Math.sin(t * 3 + s);
        ear(pick('ear'), headF, s, droop, flick, form, t, j);
      }
      const torcC = vadd(vlerp(body.p(1.0, 0, 19.2), headF.p(-4.2, 0, 1.4), get('halo')), F.v(0, 0, 0.4 * (lag(torcLag, 'hover') - get('hover'))));
      torc(pick('torc'), torcC, body, get('halo'), (t * TAU) / 6 + get('torcSpin'), form, j);
      // Arms: palms up on the knees at rest; goals move them for gestures.
      for (const s of [-1, 1]) {
        const name = s < 0 ? 'L' : 'R';
        const rest = vlerp(hips.p(6.4, s * 13.8, 7.6), hips.p(7.4, s * 9.0, -0.6), lotus);
        const hand = target('hand' + name, rest);
        const palm = 1 - get(s < 0 ? 'palmDownL' : 'palmDownR');
        arm(pick('arm' + name), body, s, hand, palm, form, get(s < 0 ? 'lightL' : 'lightR') + (1 - sleep) * 0.35, j);
      }
      if (get('crystalsHidden') < 0.5) {
        const orbitLag = previous(3);
        const lagOffset = F.v((lag(orbitLag, 'dx') - get('dx')) / portraitScale * 0.5, 0, -(lag(orbitLag, 'dy') - get('dy')) / portraitScale * 0.5);
        orbit(overAll ? front! : r, hips.p(0.6, 0, 8 + get('orbitLift')), F, form > 0.5 ? 6 : 3, (t * TAU) / 3 + get('orbit'), 17 + get('orbitR'), 0.32 + get('orbitTilt'), lagOffset, j);
      }
    }
    j.head = j.head ?? body.p(1.4, 0, 24.6);
    j.chest = body.p(1.0, 0, 11);
    j.mouth = body.p(9.6, 0, 21.6);
    j.gem = body.p(7.4, 0, 28.8);
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    const finishes: Parameters<typeof finishSurfaces>[2] = [
      [pearl, 'fur'],
      [pearlSoft, 'fur'],
      [pearlShade, 'fur'],
      [midnight, 'fur'],
      [midnightLight, 'fur'],
      [gold, 'ivory'],
      [goldDeep, 'ivory'],
      [crystal, 'ice'],
      [crystalDeep, 'ice'],
      [eye, 'iris'],
      [nose, 'skin'],
      [inner, 'skin'],
    ];
    finishSurfaces(r, F, finishes, 'skin');
    scaleFigure(r, j, portraitScale);
    const frame = projectFigure(r, 160, [80, 150], j, '#141428', 4.4, true);
    if (front) {
      finishSurfaces(front, F, finishes, 'skin');
      scaleFigure(front, {}, portraitScale);
      frame.over = renderRig(front, frame.px.w, frame.px.h, ...frame.anchor, { outline: ink, inner: 4.4 }).p;
    }
    const lift = Math.max(0, hover - HOVER);
    frame.groundShadow = get('hidden') > 0.5 || overAll ? { radius: 0, opacity: 0 } : { radius: 160 * 0.13 / (1 + 0.02 * lift), opacity: 0.55 / (1 + 0.03 * lift) };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = get('sx');
    if (get('sy')) frame.sy = get('sy');
    if (get('flash')) frame.flash = get('flash');
    if (get('ghostA') > 0.01) frame.ghost = { dx: Math.round(get('ghostX')), dy: Math.round(get('ghostY')), alpha: get('ghostA') };
    frame.planted = [];
    return frame;
  };
}
