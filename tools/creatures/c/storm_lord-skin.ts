// Раскат, повелитель грозы: an invented lean thunder beast that stands on two powerful digitigrade legs (the knee
// forward, the heel raised high, a long foot with three claws). Broad chest, narrow waist, storm-indigo fur lighter on
// the muscle ridges, a silver chest, throat and inner arms with a thick chest ruff, glowing turquoise lightning veins on
// the forearms, thighs, cheeks and tail, a sigil on the chest (a ring with three lightning teeth). An angular cat-wolf
// head with a narrow muzzle and a white mask, narrow burning gold eyes, fangs in a snarl, long swept-back ears with two
// gold rings each, two pale quartz horns from the brow (back and up, each with a branch, a glowing core). A mane of a
// living storm cloud on the neck and shoulders runs down the back like a cape of clouds to the knees, lightning flickers
// in it. Muscular arms with engraved copper-gold bracers, three claws and a thumb. A long thick tail with a cloud tuft.
// Behind his shoulders a tilted ring of eight war drums (dark red lacquer, gold hoops, a white lightning mark on each
// head) orbits slowly, passing in front of him and behind.
// The storm form «Буря» is an awakening, not a recolour: ×1.15 and hovering, near-black violet fur, white-gold veins,
// white-hot eyes, branching lightning antlers twice as tall, the mane a thunderhead towering above his head, the drum
// ring opened to radius 26 and blazing, discharges crackling under his feet.
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import { goalAt, toLocal } from '../bodies/goals';
import { furLock } from '../bodies/kits/tailoring';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vdot, vlerp, vmul, vnorm, vsub, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';
import { clips, HIP } from './storm_lord-poses';

const card = readCreatureCard('storm_lord');
export const portraitScale = 3.1;
const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const toneSet = (name: string, idx: number[]) => idx.map((i) => hx(tones(name)[i])) as Tones;
const fur = sw('fur', [2, 3, 4, 5]),
  furSoft = sw('fur', [3, 4, 4, 5]),
  furShade = sw('fur', [0, 1, 2, 3]),
  furDeep = sw('fur', [0, 1, 1, 2]),
  silver = sw('silver', [1, 2, 3, 4]),
  silverSoft = sw('silver', [2, 3, 4, 4]),
  silverShade = sw('silver', [0, 1, 2, 3]),
  crystal = sw('crystal', [1, 2, 3, 4], 0.3),
  crystalDeep = sw('crystal', [0, 1, 2, 3], 0.15),
  gold = sw('gold', [1, 2, 3, 4], 0.05),
  goldDeep = sw('gold', [0, 1, 2, 3]),
  eye = sw('eyes', [1, 2, 3, 4], 0.7),
  cloud = sw('cloud', [0, 1, 2, 3]),
  cloudLit = sw('cloud', [1, 2, 3, 4], 0.05),
  cloudDeep = sw('cloud', [0, 0, 1, 2]),
  lacquer = sw('lacquer', [1, 2, 3, 4]),
  lacquerDeep = sw('lacquer', [0, 1, 2, 3]),
  hide = sw('hide', [0, 1, 2, 3]),
  claw = sw('claw', [0, 1, 2, 3]),
  mouthMat = sw('mouth', [0, 0, 1, 2]),
  tongue = sw('mouth', [1, 2, 3, 3]),
  blazeMat = sw('blaze', [1, 2, 3, 4], 0.85),
  veinMat = sw('vein', [1, 2, 3, 4], 0.8);
gold.spec = true;
cloud.soft = true;
cloudLit.soft = true;
cloudDeep.soft = true;
goldDeep.spec = true;
lacquer.spec = true;
claw.spec = true;
crystal.spec = true;
const ink = hx('#0a0a18'),
  inkMat: Mat = { T: [ink, ink, ink, hx('#1a1a30')] },
  noseMat: Mat = { T: [hx('#08080e'), hx('#121220'), hx('#22223a'), hx('#4a4a6a')] },
  white = hx('#ffffff'),
  fang = hx('#eef0f8'),
  veinT = toneSet('vein', [1, 2, 3, 4]),
  blazeT = toneSet('blaze', [1, 2, 3, 4]);

// ---- the storm form («Буря») -----------------------------------------------------------------------------------
const STORM: { m: Mat; day: Tones; dayGlow: number; night: Tones; glow: number }[] = (
  [
    [fur, toneSet('abyss', [2, 3, 4, 5]), 0.04],
    [furSoft, toneSet('abyss', [3, 4, 5, 5]), 0.05],
    [furShade, toneSet('abyss', [0, 1, 2, 3]), 0],
    [furDeep, toneSet('abyss', [0, 1, 1, 2]), 0],
    [eye, toneSet('blaze', [2, 3, 4, 4]), 1],
    [crystal, toneSet('crystal', [2, 3, 4, 4]), 0.6],
    [cloud, toneSet('abyss', [2, 3, 4, 5]), 0.04],
    [cloudLit, toneSet('abyss', [3, 4, 5, 5]), 0.12],
    [cloudDeep, toneSet('abyss', [0, 1, 2, 3]), 0],
    [lacquer, toneSet('lacquer', [2, 3, 4, 4]), 0.25],
    [hide, toneSet('blaze', [1, 2, 3, 4]), 0.5],
  ] as [Mat, Tones, number][]
).map(([m, night, glow]) => ({ m, day: m.T, dayGlow: m.glow ?? 0, night, glow }));
const saturate = (x: number) => Math.max(0, Math.min(1, x));
/** How far the storm has taken him (0 = Раскат, 1 = Буря). */
let stormK = 0;
function stormLook(form: number) {
  stormK = saturate((form - 0.1) / 0.8);
  stormK = stormK * stormK * (3 - 2 * stormK);
  for (const d of STORM) {
    d.m.T = stormK <= 0 ? d.day : stormK >= 1 ? d.night : (d.day.map((c, i) => mixc(c, d.night[i], stormK)) as Tones);
    d.m.glow = d.dayGlow + (d.glow - d.dayGlow) * stormK;
  }
}
/** The vein colour now: turquoise that turns white-gold with the storm; glow follows the charge. */
function veinColor(level: number) {
  const T = veinT.map((c, i) => mixc(c, blazeT[i], stormK)) as Tones;
  return T[Math.max(0, Math.min(3, Math.round(level * 3)))];
}
// Coarse guard hair: short dark strokes over the indigo masses, lighter on the ridges.
for (const m of [fur, furSoft]) {
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 19 + q[1] * 13 + q[2] * 7.5) * Math.cos(q[2] * 11 - q[1] * 9);
    return strand > 0.8 ? m.T[light > 0.7 ? 3 : light > 0.3 ? 1 : 0] : null;
  };
}

function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function limb(r: Rig, from: V3, to: V3, rw: number, rh: number, m: Mat, facing: V3, at = 0.5, len = 0.58) {
  const f = axisFrame(vlerp(from, to, at), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * len], m);
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
/** A jagged lightning zigzag between two world points, deterministic by seed; `side` sets the jitter plane. */
export function zigzag(r: Rig, a: V3, b: V3, seed: number, c: ReturnType<typeof hx>, glow: number, jitter = 1, n = 5, side: V3 = [0, 1, 0]) {
  const d = vsub(b, a);
  const off = vnorm(vcross(d, side));
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const p = i === n ? b : vadd(vadd(a, vmul(d, u)), vmul(off, (hash(i, seed) - 0.5) * 2 * jitter));
    r.line(prev, p, c, glow, 0.5);
    prev = p;
  }
}
/** A vein running along a limb: a zigzag hugging its outer surface. */
function vein(r: Rig, a: V3, b: V3, out: V3, depth: number, seed: number, level: number) {
  const c = veinColor(level);
  const glow = 0.5 + 0.5 * level;
  const n = 6;
  let prev = vadd(a, vmul(out, depth));
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const side = vnorm(vcross(vsub(b, a), out));
    const p = vadd(vadd(vlerp(a, b, u), vmul(out, depth)), vmul(side, (i % 2 ? 1 : -1) * 0.55 * (0.6 + hash(i, seed) * 0.6)));
    r.line(prev, p, c, glow, 0.7);
    prev = p;
  }
}

// ---- head -----------------------------------------------------------------------------------------
interface HeadState {
  blink: number;
  lid: number;
  snarl: number;
  roar: number;
  lookX: number;
  lookY: number;
  wide: number;
  charge: number;
  t: number;
}
const H = (F: F3, x: number, y: number, z: number) => F.p(x, y, z);
function ear(r: Rig, Hd: F3, s: number, back: number, flick: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'ear' + name;
  // Long pointed ears swept back and out from the top of the skull; `back` flattens them in a snarl.
  const E = Hd.at(-1.8, s * 2.7, 3.0)
    .turn(s * (0.3 + 0.2 * back) + flick)
    .roll(s * (0.28 + 0.3 * back))
    .pitch(-1.22 - 0.35 * back);
  r.cap(E.p(0, 0, -0.4), E.p(0, 0, 2.4), 1.25, 1.3, fur);
  r.ell(E, [0, 0, 4.4], [0.7, 1.35, 4.8], fur);
  r.ell(E, [0.4, 0, 4.2], [0.3, 0.85, 3.8], furDeep);
  for (const k of [-1, 0, 1]) r.line(E.p(0.75, k * 0.6, 1.6), E.p(0.7, k * 0.3, 6.8), silverShade.T[1], 0, 0.7);
  // A dark tip with a tuft.
  r.ell(E, [-0.1, 0, 8.0], [0.7, 1.3, 1.4], furShade);
  furLock(r, E.p(0, 0, 8.4), E.p(-0.4 - back, 0, 10.6), E.v(0, 0.6, 0), E.v(-0.4, 0, 0), furShade, furDeep);
  // Two gold rings through the front edge.
  r.tag = 'earRings';
  for (const [z, rad] of [
    [2.8, 0.75],
    [4.6, 0.62],
  ] as const) {
    const c = E.p(0.2, 1.3 - z * 0.08, z);
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU,
        a1 = ((k + 1) / n) * TAU;
      const p0 = vadd(c, E.v(Math.cos(a0) * rad, 0, Math.sin(a0) * rad)),
        p1 = vadd(c, E.v(Math.cos(a1) * rad, 0, Math.sin(a1) * rad));
      r.cap(p0, p1, 0.22, 0.22, k < 4 ? gold : goldDeep);
    }
  }
  j['ear' + name] = E.p(-0.2, 0, 9.5);
}
/** A crystal horn: a faceted quartz spike with a branch and a glowing core; in the storm it grows into a branching
 * lightning antler (two more tines, twice as tall, burning white-gold). */
function horn(r: Rig, Hd: F3, s: number, k: number, charge: number, t: number, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'horn' + name;
  const base = Hd.p(2.2, s * 1.9, 3.6);
  const len = 8.5 + 8.5 * k;
  const dir = vnorm(Hd.v(-0.85 + 0.25 * k, s * (0.35 + 0.1 * k), 1));
  const side = vnorm(vcross(dir, Hd.s));
  // The quartz shaft in two facet rings (a wide lower body, a narrower tip).
  const mid = vadd(base, vmul(dir, len * 0.45));
  r.spike(base, dir, len * 0.5, 1.55, crystalDeep, 5, s * 0.3);
  r.spike(vadd(base, vmul(dir, len * 0.05)), dir, len, 1.25, crystal, 5, s * 0.3 + 0.6);
  // The branch.
  const bdir = vnorm(vadd(vmul(dir, 0.6), vadd(vmul(Hd.s, s * 0.55), vmul(side, -0.25))));
  r.spike(mid, bdir, 3.8 + 2.6 * k, 0.75, crystal, 4, 0.2);
  // The glowing core along the axis.
  const core = veinColor(0.5 + 0.5 * charge);
  r.line(vadd(base, vmul(dir, 0.6)), vadd(base, vmul(dir, len * 0.85)), core, 0.6 + 0.4 * charge, 0.8);
  r.line(mid, vadd(mid, vmul(bdir, (3.4 + 2.6 * k) * 0.7)), core, 0.5 + 0.4 * charge, 0.8);
  // Storm tines: two more forks up the antler, crackling lightning.
  if (k > 0.02) {
    r.tag = 'hornArc';
    const forks: [number, V3, number][] = [
      [0.68, vnorm(vadd(vmul(dir, 0.7), vmul(Hd.s, s * 0.5))), 3.8],
      [0.82, vnorm(vadd(vmul(dir, 0.6), vadd(vmul(Hd.f, 0.6), vmul(Hd.u, 0.3)))), 3.2],
      [0.55, vnorm(vadd(vmul(dir, 0.5), vmul(Hd.f, -0.7))), 3.0],
    ];
    for (const [u, d, L] of forks) {
      const at = vadd(base, vmul(dir, len * u));
      const tip = vadd(at, vmul(d, L * 1.3 * k));
      r.spike(at, d, L * 1.3 * k, 1.0 * k, blazeMat, 4, 0);
      zigzag(r, at, tip, Math.floor(t * 12) + u * 50 + s * 7, blazeT[3], 1, 0.35, 3);
    }
  }
  j['horn' + name] = vadd(base, vmul(dir, len));
}
function head(r: Rig, Hd: F3, j: Record<string, V3>, p: HeadState) {
  r.tag = 'head';
  // Angular skull: a wedge of a cranium, a heavy brow ridge, sharp cheekbones.
  r.ell(Hd, [-0.2, 0, 0.6], [4.6, 4.2, 4.2], fur);
  r.ell(Hd, [2.4, 0, 2.0], [2.6, 3.8, 1.5], furSoft);
  for (const s of [-1, 1]) {
    r.ell(Hd.at(1.8, s * 3.2, -0.7).turn(s * 0.4), [0, 0, 0], [2.6, 1.6, 1.9], fur);
    // The wolf ruff: locks sweeping back from the cheekbones.
    for (let k = 0; k < 6; k++) {
      const a = H(Hd, 1.4 - k * 0.9, s * (3.6 + k * 0.2), -1.4 - k * 0.35);
      const tip = H(Hd, -1.4 - k * 1.1, s * (5.4 + k * 0.35), -2.6 - k * 0.6);
      furLock(r, a, tip, Hd.v(0, 0.3, 0.8), Hd.v(0.3, s * 0.5, 0.2), k % 2 ? furSoft : fur, furShade);
    }
  }
  // Mane of the nape behind the skull.
  for (let k = 0; k < 6; k++) {
    const y = (k - 2.5) * 1.5;
    furLock(r, H(Hd, -3.8 + Math.abs(y) * 0.2, y, 2.4 - Math.abs(y) * 0.2), H(Hd, -7.2, y * 1.25, -0.6 - Math.abs(y) * 0.3), Hd.v(0, 0.8, 0.3), Hd.v(-0.4, 0, 0.8), k % 2 ? fur : furSoft, furShade);
  }
  // A short crest of hair between the horns.
  for (let k = -1; k <= 1; k++) furLock(r, H(Hd, 1.4, k * 0.9, 4.2), H(Hd, -0.8, k * 1.4, 6.2 - Math.abs(k) * 0.5), Hd.v(0, 0.5, 0), Hd.v(0.3, 0, 0.5), furSoft, furShade);
  // Muzzle: narrow and long, the white mask over its bridge from the eyes to the nose.
  r.tag = 'muzzle';
  r.ell(Hd, [5.6, 0, -1.4], [4.2, 1.95, 1.6], fur);
  r.ell(Hd, [5.9, 0, -0.8], [3.9, 1.45, 1.2], silver);
  r.tag = 'mask';
  for (const s of [-1, 1]) {
    r.ell(Hd.at(3.6, s * 1.7, 0.4).turn(s * 0.5), [0, 0, 0], [1.8, 1.3, 1.1], silver);
    r.ell(Hd.at(2.4, s * 2.6, 1.0).turn(s * 0.6), [0, 0, 0], [1.2, 1.0, 0.8], silverSoft);
  }
  r.tag = 'nose';
  r.ell(Hd, [9.4, 0, -0.6], [0.9, 1.0, 0.8], noseMat);
  r.dot(H(Hd, 10.0, -0.3, -0.2), hx('#6a6a8a'), 0, 0.45);
  // The jaw hinges open with the snarl and the roar.
  const open = saturate(p.roar + p.snarl * 0.35);
  const J = Hd.at(2.0, 0, -2.4).pitch(open * 0.55);
  r.tag = 'jaw';
  r.ell(J, [3.4, 0, -0.5], [3.9, 1.7, 0.95], fur);
  r.ell(J, [3.6, 0, -0.9], [3.2, 1.3, 0.6], silver);
  // The lip line along the muzzle: a curl up at the back in the snarl.
  for (const s of [-1, 1]) {
    const back = H(Hd, 3.4, s * 2.0, -1.9 + p.snarl * 0.6);
    r.line(H(Hd, 9.0, s * 0.7, -1.8), H(Hd, 5.8, s * 1.75, -2.1), ink, 0, 0.6);
    r.line(H(Hd, 5.8, s * 1.75, -2.1), back, ink, 0, 0.6);
  }
  if (open > 0.08) {
    r.tag = 'mouth';
    r.ell(Hd.at(5.2, 0, -2.6 - open * 0.8), [0, 0, 0], [3.5, 1.45, 0.4 + open * 1.2], mouthMat);
    r.ell(J, [3.6, 0, 0.1], [2.6, 0.95, 0.35], tongue);
  }
  // Fangs: two upper, two lower; the snarl bares the upper ones even with the jaw shut.
  r.tag = 'fangs';
  const fangMat: Mat = { T: [hx('#9aa0b8'), hx('#c8ccdc'), fang, white] };
  if (p.snarl > 0.2 || open > 0.1)
    for (const s of [-1, 1]) {
      r.spike(H(Hd, 8.2, s * 1.1, -2.0), Hd.v(0.05, 0, -1), 1.5 + 0.4 * open, 0.38, fangMat, 3);
      if (open > 0.1) r.spike(J.p(6.4, s * 0.95, -0.1), J.v(0, 0, 1), 1.1, 0.3, fangMat, 3);
    }
  // Narrow burning eyes under a heavy brow, set at a slant.
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const e = Hd.at(3.6, s * 2.45, 1.0).turn(s * 0.55).roll(s * -0.25);
    const P = (x: number, y: number, z: number) => e.p(x, s * y, z);
    const start = r.size;
    const opened = p.blink < 0.5;
    if (opened) {
      const ry = 1.75 + p.wide * 0.25,
        rz = 0.72 + p.wide * 0.5 - p.lid * 0.35;
      r.ell(e, [0.2, 0, 0], [0.6, ry, rz], inkMat);
      r.ell(e, [0.35, 0, 0], [0.55, ry * 0.9, rz * 0.82], eye);
      // A vertical slit pupil (white-hot eyes in the storm have none).
      if (stormK < 0.6) r.ell(e, [0.8, p.lookX * 0.5, p.lookY * 0.2], [0.25, 0.32, rz * 0.8], inkMat);
      r.dot(P(0.95, -0.7, 0.25), white, 0.7, 0.55);
    } else {
      r.ell(e, [0.3, 0, 0], [0.6, 1.8, 0.7], fur);
      r.line(P(0.85, -1.6, -0.1), P(0.95, 1.5, 0.2), ink, 0, 0.8);
    }
    // The brow: a dark slash angled down toward the nose — the fierce look.
    r.line(P(0.9, -2.0, 1.2), P(1.0, 1.8, 0.55 - p.snarl * 0.3), ink, 0, 0.9);
    r.line(P(0.8, -2.2, 1.35), P(0.85, -0.6, 1.2), furShade.T[0], 0, 0.8);
    r.markEye(start, s, opened);
    if (s > 0) j.eyeR = r.eye = P(0.6, 0.3, 0.2);
    else j.eyeL = P(0.6, 0.3, 0.2);
    // Cheek veins: a zigzag from under the eye down to the jaw.
    r.tag = 'veins';
    vein(r, P(0.4, 0.4, -1.0), Hd.p(1.2, s * 3.8, -2.8), Hd.v(0.2, s, 0), 0.3, 11 + s, p.charge);
  }
  j.nose = H(Hd, 10.1, 0, -0.6);
  j.mouth = H(Hd, 7.8, 0, -2.6 - open);
  j.crown = H(Hd, 0, 0, 4.8);
  j.head = H(Hd, 0, 0, 0);
}

// ---- body -----------------------------------------------------------------------------------------
function torso(r: Rig, B: F3, breath: number, charge: number, t: number, j: Record<string, V3>) {
  r.tag = 'pelvis';
  r.ell(B, [-0.6, 0, 0.6], [3.4, 3.9, 3.2], fur);
  r.tag = 'waist';
  r.ell(B, [0.2, 0, 4.6], [2.6, 3.0, 3.2], fur);
  r.ell(B, [1.8, 0, 4.8], [1.2, 1.9, 2.8], silverShade);
  // Abdominal ridges.
  for (const z of [3.4, 5.2]) for (const s of [-1, 1]) r.ell(B, [2.2, s * 0.85, z], [0.8, 0.9, 0.75], silver);
  r.tag = 'chest';
  r.ell(B, [0.9, 0, 10.4], [5.0 + breath * 0.3, 5.6 + breath * 0.2, 5.4], fur);
  for (const s of [-1, 1]) r.ell(B.at(3.6, s * 2.3, 10.4).turn(s * 0.35), [0, 0, 0], [2.0, 2.5, 2.4], silverShade);
  for (const s of [-1, 1]) r.ell(B.at(3.2, s * 3.4, 9.0).turn(s * 0.6), [0, 0, 0], [1.6, 1.5, 1.4], fur);
  // Serratus ridges along the flanks (lighter fur on the ridges).
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) r.ell(B.at(1.4, s * (4.0 - k * 0.3), 9.2 - k * 1.6).turn(s * 0.7), [0, 0, 0], [1.3, 0.55, 0.55], furSoft);
  // The chest ruff: silver locks spilling down from the throat over the chest.
  r.tag = 'chestMane';
  for (let row = 0; row < 4; row++)
    for (let k = 0; k < 6 - row; k++) {
      const y = (k - (5 - row) / 2) * 1.35;
      const a = B.p(4.4 + row * 0.15, y, 14.6 - row * 1.7 - Math.abs(y) * 0.25);
      furLock(r, a, vadd(a, B.v(1.0 + breath * 0.2, y * 0.12, -3.0 + row * 0.2)), B.v(0, 0.8, 0), B.v(0.7, 0, 0), k % 2 ? silverSoft : silver, silverShade);
    }
  // Guard hair down the spine.
  for (let k = 0; k < 7; k++) {
    const a = B.p(-4.4 + (k > 3 ? 0.6 : 0), 0, 13 - k * 1.8);
    furLock(r, a, vadd(a, B.v(-1.6, 0, -2.4)), B.v(0, 0.9, 0), B.v(-0.6, 0, 0), k % 2 ? fur : furSoft, furShade);
  }
  // Haunch fur.
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const a = B.p(-2.2 + k * 1.4, s * 4.4, 1.6 - (k % 2) * 0.6);
      furLock(r, a, vadd(a, B.v(-0.8, s * 1.0, -2.6)), B.v(1.0, 0, 0), B.v(0, s * 0.7, 0), k % 2 ? furSoft : fur, furShade);
    }
  // The sigil on the chest: a ring with three lightning teeth, glowing with the charge.
  r.tag = 'sigil';
  const S = B.at(5.9, 0, 11.0);
  const c = veinColor(0.4 + 0.6 * charge);
  const g = 0.45 + 0.55 * charge;
  const n = 14;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU,
      a1 = ((k + 1) / n) * TAU;
    r.line(S.p(0, Math.cos(a0) * 1.7, Math.sin(a0) * 1.7), S.p(0, Math.cos(a1) * 1.7, Math.sin(a1) * 1.7), c, g, 0.9);
  }
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k / 3) * TAU + Math.PI;
    const u = Math.cos(a),
      v = Math.sin(a);
    // A tooth: out from the ring, a kink, a point.
    r.line(S.p(0, u * 1.7, v * 1.7), S.p(0, u * 2.5 + v * 0.4, v * 2.5 - u * 0.4), c, g, 0.9);
    r.line(S.p(0, u * 2.5 + v * 0.4, v * 2.5 - u * 0.4), S.p(0, u * 3.3, v * 3.3), c, g, 0.9);
  }
  r.dot(S.p(0.1, 0, 0), c, g, 0.9);
  j.chest = S.p(0, 0, 0);
  j.sigil = S.p(0.2, 0, 0);
  void t;
}
function arm(r: Rig, B: F3, s: number, hand: V3, j: Record<string, V3>, fist: number, charge: number, handRig: Rig = r) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(1.0, s * 5.6, 14.0);
  const elbow = ik(shoulder, hand, 6.8, 6.6, B.v(-0.7, s * 0.7, -0.9));
  r.tag = 'shoulder' + name;
  r.ell(B.at(0.8, s * 5.4, 14.3).turn(s * 0.4), [0, 0, 0], [2.4, 2.3, 2.3], fur);
  r.ell(B.at(1.5, s * 5.8, 14.8).turn(s * 0.4), [0, 0, 0], [1.2, 1.4, 1.1], furSoft);
  r.tag = 'arm' + name;
  limb(r, shoulder, elbow, 1.85, 1.7, fur, B.f, 0.45, 0.6);
  // Biceps bulge and the silver inner arm.
  limb(r, shoulder, elbow, 1.2, 1.1, furSoft, B.f, 0.55, 0.32);
  const inner = vnorm(vcross(vsub(elbow, shoulder), B.u));
  r.cap(vadd(vlerp(shoulder, elbow, 0.3), vmul(inner, -s * 0.9)), vadd(vlerp(shoulder, elbow, 0.85), vmul(inner, -s * 0.8)), 1.1, 1.0, silverShade);
  const wrist = vlerp(elbow, hand, 0.84);
  r.cap(elbow, wrist, 1.65, 1.3, fur);
  // Elbow tuft.
  furLock(r, elbow, vadd(elbow, vmul(vnorm(vsub(elbow, vlerp(shoulder, hand, 0.5))), 2.4)), vmul(vnorm(vsub(hand, elbow)), 0.9), B.v(0, 0, 1), furSoft, furShade);
  // The bracer: an engraved copper-gold sleeve from mid forearm to the wrist with rolled rims.
  r.tag = 'bracer' + name;
  const b0 = vlerp(elbow, wrist, 0.36),
    b1 = vlerp(elbow, wrist, 0.98);
  r.cap(b0, b1, 1.78, 1.55, gold);
  r.cap(vlerp(b0, b1, -0.02), vlerp(b0, b1, 0.06), 1.95, 1.95, goldDeep);
  r.cap(vlerp(b0, b1, 0.94), vlerp(b0, b1, 1.02), 1.75, 1.75, goldDeep);
  const out = vnorm(vcross(vsub(b1, b0), B.f));
  const top = vnorm(vcross(out, vsub(b1, b0)));
  // Engraved lightning on the outer face.
  zigzag(r, vadd(vlerp(b0, b1, 0.12), vmul(top, s * 1.75)), vadd(vlerp(b0, b1, 0.88), vmul(top, s * 1.55)), 5 + s, goldDeep.T[0], 0, 0.5, 4, out);
  r.dot(vadd(vlerp(b0, b1, 0.5), vmul(top, s * 1.75)), gold.T[3], 0.2, 0.55);
  // Forearm and upper-arm veins.
  r.tag = 'veins';
  vein(r, vlerp(shoulder, elbow, 0.15), vlerp(shoulder, elbow, 0.92), vmul(inner, s), 1.6, 3 + s, charge);
  vein(r, elbow, b0, vmul(inner, s), 1.45, 7 + s, charge);
  r = handRig;
  r.tag = 'hand' + name;
  const dir = vnorm(vsub(hand, elbow));
  const Wp = new F3(hand, dir, vnorm(vcross(B.u, dir)), B.u).roll(s * 0.6);
  r.ell(Wp, [0.1, 0, 0], [1.8, 1.7, 1.2], fur);
  r.ell(Wp, [0.3, 0, -0.5], [1.2, 1.1, 0.5], silverShade);
  r.tag = 'claw' + name;
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 0.95;
    const bend = fist;
    const k1 = Wp.p(1.3, y, 0.1),
      k2 = Wp.p(2.4 - Math.abs(y) * 0.2 - bend * 1.4, y * 1.15, 0.2 - bend * 1.5);
    r.cap(k1, k2, 0.55, 0.45, fur);
    const cd = vnorm(vsub(k2, k1));
    const tipDir = vnorm(vadd(cd, vmul(Wp.u, -0.6 - bend * 0.6)));
    r.spike(k2, tipDir, 1.3, 0.32, claw, 3);
    if (charge > 0.3) r.dot(vadd(k2, vmul(tipDir, 1.3)), veinColor(charge), charge, 0.45);
  }
  const thumbTip = Wp.p(1.0, -s * 2.0, 0.6 - fist * 0.9);
  r.cap(Wp.p(0.2, -s * 1.4, 0.3), thumbTip, 0.6, 0.45, fur);
  r.spike(thumbTip, Wp.v(0.6, -s * 0.4, -0.4), 1.0, 0.28, claw, 3);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function leg(r: Rig, hips: F3, s: number, hock: V3, toeDir: V3, j: Record<string, V3>, charge: number) {
  const name = s < 0 ? 'L' : 'R',
    hip = hips.p(-0.2, s * 3.6, -0.4);
  // Digitigrade leg: a powerful thigh forward to the knee, the shin back to a raised hock, a long foot down to the toes.
  const knee = ik(hip, hock, 8.2, 7.6, hips.v(1, s * 0.22, 0.12));
  r.tag = 'thigh' + name;
  r.ell(axisFrame(vlerp(hip, knee, 0.42), vsub(hip, knee), hips.f), [0, 0, 0], [3.1, 2.8, 5.2], fur);
  r.ell(axisFrame(vlerp(hip, knee, 0.5), vsub(hip, knee), hips.f), [1.0, s * 0.5, 0], [1.7, 1.7, 3.6], furSoft);
  for (let k = 0; k < 3; k++) {
    const at = vlerp(hip, knee, 0.3 + k * 0.22);
    furLock(r, vadd(at, hips.v(-1.6, s * 2.4, -0.4)), vadd(at, hips.v(-3.0, s * 2.8, -2.6)), vmul(vnorm(vsub(knee, hip)), 1.0), hips.v(0, s, -0.3), k % 2 ? furSoft : fur, furShade);
  }
  r.tag = 'veins';
  vein(r, vlerp(hip, knee, 0.15), vlerp(hip, knee, 0.9), vnorm(vadd(hips.v(0, s, 0), hips.v(0.4, 0, 0))), 2.6, 21 + s, charge);
  r.tag = 'shin' + name;
  r.cap(knee, hock, 1.8, 1.15, fur);
  furLock(r, vlerp(knee, hock, 0.45), vadd(vlerp(knee, hock, 0.55), hips.v(-1.6, s * 0.4, -0.4)), hips.v(0, 0.8, 0), hips.v(-0.6, 0, 0), furSoft, furShade);
  // Hock spur tuft.
  furLock(r, hock, vadd(hock, hips.v(-1.8, s * 0.3, 0.6)), hips.v(0, 0.6, 0), hips.v(0, 0, 0.5), furShade, furDeep);
  r.tag = 'foot' + name;
  const ball = vadd(hock, vmul(toeDir, 5.8));
  r.cap(hock, ball, 1.15, 1.0, fur);
  const fwd = vnorm([toeDir[0], toeDir[1], 0]);
  const side = vnorm(vcross([0, 0, 1], fwd));
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 0.95;
    const base = vadd(ball, vmul(side, y * 0.8)),
      tip = vadd(vadd(base, vmul(fwd, 2.2 - Math.abs(y) * 0.4)), vmul(side, y * 0.4));
    r.cap(base, tip, 0.75, 0.55, fur);
    r.spike(tip, vnorm(vadd(fwd, [0, 0, -0.9])), 1.25, 0.32, claw, 3);
  }
  j['knee' + name] = knee;
  j['heel' + name] = hock;
  j['foot' + name] = ball;
}
function tail(r: Rig, F: F3, base: V3, sway: number, lag: number, curl: number, charge: number, t: number, j: Record<string, V3>) {
  // Long and thick: down behind the hocks, a wave along the stone, up into the cloud tuft.
  const w = (k: number) => (sway + lag * k) * k;
  const T = (x: number, y: number, z: number, k: number): V3 => vadd(base, F.v(x, y + w(k) * 7, z));
  const pts: V3[] = [
    base,
    T(-4.0, 0.4, -4.4, 0.12),
    T(-9.8, 1.6, -8.4 + curl * 2, 0.3),
    T(-16.0, 3.0, -7.8 + curl * 5, 0.5),
    T(-20.6, 4.2, -2.6 + curl * 8, 0.68),
    T(-22.2 + curl * 5, 5.0, 3.6 + curl * 6, 0.85),
    T(-20.4 + curl * 8, 5.0, 8.6 + curl * 3, 1),
  ];
  r.tag = 'tail';
  const n = 20;
  for (let k = 0; k < n; k++) {
    const a = catmull(pts, k / n),
      b = catmull(pts, (k + 1) / n);
    const t0 = k / n;
    r.cap(a, b, 2.3 - 1.3 * t0, 2.3 - 1.3 * (t0 + 1 / n), k % 5 === 4 ? furSoft : fur);
  }
  for (let k = 2; k < 16; k += 2) {
    const t0 = k / n,
      c = catmull(pts, t0),
      d = vnorm(vsub(catmull(pts, t0 + 0.02), c));
    const out = vnorm(vcross(d, F.s));
    furLock(r, vadd(c, vmul(out, 1.4 - t0)), vadd(c, vadd(vmul(out, 2.2 - t0), vmul(d, 2.4))), vmul(F.s, 0.7), vmul(out, 0.4), k % 4 ? furSoft : fur, furShade);
  }
  // The tail vein along its top.
  r.tag = 'veins';
  for (let k = 1; k < 16; k++) {
    const t0 = k / n,
      c0 = catmull(pts, t0),
      c1 = catmull(pts, t0 + 1 / n);
    const d = vnorm(vsub(c1, c0));
    const up = vnorm(vcross(F.s, d));
    const zz = (k % 2 ? 1 : -1) * 0.5;
    r.line(vadd(vadd(c0, vmul(up, 2.1 - 1.3 * t0)), vmul(F.s, zz)), vadd(vadd(c1, vmul(up, 2.1 - 1.3 * t0)), vmul(F.s, -zz)), veinColor(charge), 0.35 + 0.65 * charge, 0.7);
  }
  // The cloud tuft at the end: puffs with lit tops; arcs run through it.
  r.tag = 'tailCloud';
  const tip = catmull(pts, 0.999);
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 2.6],
    [-1.6, 1.2, 1.4, 2.0],
    [1.4, -1.0, 1.6, 2.0],
    [0.2, 0.4, 3.0, 1.8],
    [-0.8, -1.4, -1.0, 1.7],
    [1.6, 1.4, -0.6, 1.6],
  ];
  for (const [x, y, z, rad] of puffs) r.ball(vadd(tip, F.v(x, y, z)), rad, z > 1 ? cloudLit : cloud);
  if (charge > 0.2 || stormK > 0.3) {
    const seed = Math.floor(t * 10);
    zigzag(r, vadd(tip, F.v(-2, 0.4, 1)), vadd(tip, F.v(2.2, -0.4, 2.4)), seed, veinColor(0.9), 1, 0.6, 4);
  }
  j.tailTip = tip;
}

// ---- the storm-cloud mane -------------------------------------------------------------------------
/** One puff of the mane: its place on the cape (F1) and on the thunderhead (F2), in the body frame, and a radius. */
interface Puff {
  a: V3;
  b: V3;
  r: number;
  r2: number;
  u: number;
}
const MANE: Puff[] = (() => {
  const out: Puff[] = [];
  // The collar round the neck and over the shoulders.
  for (let k = 0; k < 11; k++) {
    const a = -2.1 + (k / 10) * 4.2;
    const x = -1.2 - Math.cos(a) * 2.4,
      y = Math.sin(a) * 5.6;
    out.push({ a: [x, y, 15.4 - Math.abs(Math.sin(a)) * 0.6], b: [x - 1.4, y * 1.2, 16.6 + Math.abs(Math.sin(a))], r: 1.7 + (k % 3) * 0.25, r2: 2.1 + (k % 2) * 0.3, u: 0.05 });
  }
  // The body of the cloud: puffs scattered through a volume — a cape down the back to the knees (Раскат), a towering
  // column with an anvil top above his head (Буря). The same puff keeps its relative place in both shapes.
  const N = 58;
  for (let i = 0; i < N; i++) {
    const u = (i + hash(i, 1)) / N;
    const v = hash(i, 2) * 2 - 1,
      w = hash(i, 3) * 2 - 1;
    const capeX = -4.0 - u * 4.4 + w * (1.2 + u * 0.6) - Math.abs(v) * 0.6,
      capeY = v * (4.6 + u * 2.4),
      capeZ = 15 - u * 21.5 + hash(i, 4) * 1.5;
    const anvil = Math.max(0, (u - 0.72) / 0.28);
    const half = 5.4 + u * 3.6 + anvil * 4.0;
    const headX = -7.4 - u * 2.0 + w * (2.4 + u * 1.2) - Math.abs(v) * 1.6,
      headY = v * half,
      headZ = 14.5 + u * 15 - Math.abs(v) * (2.4 + anvil * 2) + hash(i, 5) * 2.2;
    out.push({ a: [capeX, capeY, capeZ], b: [headX, headY, headZ], r: 1.5 + u * 0.7 + hash(i, 6) * 0.5, r2: 2.1 + u * 1.6 + hash(i, 7) * 0.7, u });
  }
  return out;
})();
function mane(r: Rig, B: F3, F: F3, lag: V3, lift: number, charge: number, t: number, j: Record<string, V3>) {
  r.tag = 'mane';
  const k = stormK;
  const centers: V3[] = [];
  for (let i = 0; i < MANE.length; i++) {
    const p = MANE[i];
    const pos = vlerp(p.a, p.b, k);
    // Lower puffs trail further behind and lift with jumps; every puff breathes on its own beat.
    const bob = 0.35 * Math.sin(t * 2.4 + i * 1.7);
    const at = vadd(B.p(pos[0], pos[1], pos[2] + bob + lift * p.u * (1 - k)), vmul(lag, p.u * (1 - 0.6 * k)));
    const rad = p.r + (p.r2 - p.r) * k;
    // Each puff: a body and three lumps; the outer and upper puffs catch the cold light, the inner ones stay dark.
    const outer = Math.abs(p.a[1]) / 7 + (p.u < 0.1 ? 0.4 : 0);
    r.ball(at, rad, outer > 0.55 ? cloud : cloudDeep);
    for (let n = 0; n < 3; n++) {
      const a = (n / 3) * TAU + i * 1.3 + 0.25 * Math.sin(t * 1.7 + i);
      const up = Math.sin(a);
      const off = F.v(-0.3, Math.cos(a) * rad * 0.55, up * rad * 0.5);
      r.ball(vadd(at, off), rad * (0.55 + 0.1 * hash(i, n, 3)), up > 0.3 ? cloudLit : cloud);
    }
    centers.push(at);
  }
  // Lightning flickers inside the cloud: a few strokes a second, more in the storm and with charge.
  r.tag = 'maneBolt';
  const slot = Math.floor(t * 8);
  const chance = 0.18 + 0.35 * charge + 0.35 * k;
  for (let n = 0; n < 2; n++) {
    if (hash(slot, n, 77) > chance) continue;
    const i0 = Math.floor(hash(slot, n, 78) * centers.length),
      i1 = Math.floor(hash(slot, n, 79) * centers.length);
    if (i0 === i1) continue;
    zigzag(r, centers[i0], centers[i1], slot * 3 + n, veinColor(0.95), 1, 1.2, 5);
  }
  j.mane = centers[MANE.length - 1];
  j.maneTop = B.p(-6.6, 0, 17 + 13 * k);
}

// ---- the war drums --------------------------------------------------------------------------------
export interface DrumRing {
  radius: number;
  tilt: number;
  spin: number;
  glow: number;
  /** Per-drum offsets (index → world offset), and a per-drum pulse 0..1 for the hit flash. */
  push?: (i: number) => V3;
  pulse?: (i: number) => number;
}
function drum(r: Rig, c: V3, axis: V3, ref: V3, glow: number, pulse: number, scale: number) {
  const ax = vnorm(axis);
  const e1 = vnorm(vcross(ax, ref)),
    e2 = vcross(ax, e1);
  // A taiko barrel: a bulging lacquered body with flat heads, the head facing out from the ring.
  const R = 2.8 * scale,
    D = 2.3 * scale,
    cutAt = 0.78;
  const headR = R * Math.sqrt(1 - cutAt * cutAt);
  const BF = new F3(c, ax, e1, e2);
  r.tag = 'drums';
  r.ell(BF, [0, 0, 0], [D, R, R], pulse > 0.5 ? lacquer : lacquerDeep, (q) => Math.abs(q[0]) > cutAt);
  // A lighter lacquer band round the belly and the lacquer sheen.
  r.ell(BF, [0, 0, 0], [D * 0.42, R * 1.02, R * 1.02], lacquer, (q) => Math.abs(q[0]) > 0.9);
  // Gold hoops at both rims.
  r.tag = 'drumHoops';
  for (const side of [-1, 1]) {
    const rc = vadd(c, vmul(ax, side * D * cutAt));
    const n = 10;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * TAU,
        a1 = ((k + 1) / n) * TAU;
      r.cap(vadd(rc, vadd(vmul(e1, Math.cos(a0) * headR), vmul(e2, Math.sin(a0) * headR))), vadd(rc, vadd(vmul(e1, Math.cos(a1) * headR), vmul(e2, Math.sin(a1) * headR))), 0.26 * scale, 0.26 * scale, k % 2 ? gold : goldDeep);
    }
  }
  // Two rows of gold tacks.
  for (const side of [-1, 1])
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const rr = R * Math.sqrt(1 - 0.36);
      r.dot(vadd(vadd(c, vmul(ax, side * D * 0.6)), vadd(vmul(e1, Math.cos(a) * rr * 1.03), vmul(e2, Math.sin(a) * rr * 1.03))), gold.T[3], 0.1, 0.45 * scale);
    }
  // The heads: pale hide, a lightning mark across the outer one that burns with the glow and the hit.
  r.tag = 'drumHeads';
  const hc = vadd(c, vmul(ax, D * cutAt + 0.05));
  const HF = new F3(hc, ax, e1, e2);
  r.ell(HF, [0, 0, 0], [0.12, headR * 0.96, headR * 0.96], hide);
  r.ell(new F3(vadd(c, vmul(ax, -D * cutAt - 0.05)), ax, e1, e2), [0, 0, 0], [0.12, headR * 0.96, headR * 0.96], hide);
  const mark = mixc(hx('#ffffff'), veinColor(0.9), saturate(glow * 0.6 + pulse));
  const zz: [number, number][] = [
    [-0.6, 0.6],
    [0.12, 0.08],
    [-0.12, -0.08],
    [0.6, -0.6],
  ];
  for (let k = 0; k < zz.length - 1; k++) r.line(HF.p(0.18, zz[k][0] * headR, zz[k][1] * headR), HF.p(0.18, zz[k + 1][0] * headR, zz[k + 1][1] * headR), mark, saturate(glow * 0.5 + pulse), 0.9);
  return hc;
}
function drums(r: Rig, B: F3, ring: DrumRing, j: Record<string, V3>) {
  // The ring hangs behind his shoulders like a halo; tilting it lays it round him so drums pass in front and behind.
  const C = B.p(-5.6 + 3.4 * Math.sin(ring.tilt) ** 2, 0, 16.4 - 7 * Math.sin(ring.tilt) ** 2);
  const e1 = B.s,
    e2 = vnorm(vadd(vmul(B.u, Math.cos(ring.tilt)), vmul(B.f, -Math.sin(ring.tilt))));
  const centers: V3[] = [];
  const scale = 1 + 0.12 * stormK;
  for (let i = 0; i < 8; i++) {
    const a = ring.spin + (i / 8) * TAU;
    const radial = vadd(vmul(e1, Math.cos(a)), vmul(e2, Math.sin(a)));
    const c = vadd(vadd(C, vmul(radial, ring.radius)), ring.push ? ring.push(i) : [0, 0, 0]);
    centers.push(c);
    // The heads face out of the ring and a little forward, so the halo shows their lightning marks.
    const axis = vnorm(vadd(radial, vmul(vcross(e1, e2), -0.55)));
    const head = drum(r, c, axis, vcross(e1, e2), ring.glow, ring.pulse ? ring.pulse(i) : 0, scale);
    j['drum' + i] = head;
  }
  // The gold rope frame that holds them on the ring.
  r.tag = 'drumHoops';
  const n = 32;
  for (let k = 0; k < n; k++) {
    const a0 = ring.spin + (k / n) * TAU,
      a1 = ring.spin + ((k + 1) / n) * TAU;
    const p0 = vadd(C, vadd(vmul(e1, Math.cos(a0) * ring.radius), vmul(e2, Math.sin(a0) * ring.radius))),
      p1 = vadd(C, vadd(vmul(e1, Math.cos(a1) * ring.radius), vmul(e2, Math.sin(a1) * ring.radius)));
    r.cap(p0, p1, 0.32, 0.32, k % 2 ? gold : goldDeep);
  }
  j.ring = C;
}

// ---- assembly -------------------------------------------------------------------------------------
type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3, 'idle-f2': 2, turn: 4 };
export function stormFigure(sample: PoseSample): Figure {
  return (anim, t, side, _variant, pose, support) => {
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
    const F0 = F3.yaw(card.life.yaw + (side * Math.PI) / 8),
      F = F0.turn(get('yaw'));
    const form = get('form'),
      sleep = get('sleep');
    stormLook(form);
    const charge = saturate(get('charge') + (0.3 + 0.2 * (0.5 + 0.5 * osc(0.5))) * (1 - sleep) + 0.3 * stormK);
    // Walking is a prowl: the feet come from the gait plan; the body bobs twice a cycle and sways.
    const walking = anim === 'walk';
    const feet = support?.feet;
    const bob = walking ? 0.45 * Math.cos(t * TAU * 2) : 0;
    const breath = period && !walking ? 0.4 * Math.sin(q) : 0;
    const hover = get('hover') + (stormK > 0.5 ? 0.6 * Math.sin(t * 2.6) : 0);
    const hoverK = saturate(hover / 4);
    const crouch = get('crouch') + 1.0 * (1 - saturate(sleep)) * (1 - hoverK) + sleep * 7.4;
    const hipZ = HIP + get('lift') - crouch + get('jump') + hover + breath * 0.3 + bob;
    const hips = F.at(get('lean'), get('drift'), hipZ)
      .pitch(0.2 + get('pitch') + sleep * 0.9 + (walking ? 0.04 : 0))
      .roll(get('roll') + (walking ? 0.04 * Math.sin(t * TAU) : 0))
      .turn(get('twist'));
    const B = hips;
    // A spin (`twist`) turns him round the hips' vertical axis: feet and paw goals go round with the body.
    const twist = get('twist');
    const FT = twist ? F.at(get('lean'), get('drift'), 0).turn(twist).at(-get('lean'), -get('drift'), 0) : F;
    const target = (key: string, rest: V3) => {
      const g = goalAt(A, key, toLocal(FT, rest));
      return g ? FT.p(...g) : rest;
    };
    const overAll = get('overAll') > 0.5,
      peek = get('peekFront') > 0.5,
      clawFront = get('clawFront') > 0.5;
    const front = overAll || peek || clawFront ? new Rig() : null;
    const R0 = overAll ? front! : r;
    const maneLag = previous(3),
      tailLag = previous(4),
      earLag = previous(2);
    const lagJump = (p: JointPose) => lag(p, 'jump') + lag(p, 'lift') - lag(p, 'crouch') + lag(p, 'hover');
    const planted: string[] = [];
    if (get('hidden') < 0.5) {
      // Legs: stand on the stone, or hang in a fighting stance under him while he hovers.
      for (let index = 0; index < 2; index++) {
        const s = index ? 1 : -1,
          name = s < 0 ? 'L' : 'R';
        const step = feet ? feet[index] : { forward: 0, lift: 0, planted: true };
        const fwd = walking ? step.forward / portraitScale : 0;
        const stand = FT.p(-3.2 + fwd + (get('stride') + (walking ? 0 : 1.1)) * s, s * 4.4, 5.2 + step.lift * 3.2);
        const hang = hips.p(-2.6 + s * 1.2, s * 4.2, -9.4 + (s > 0 ? 1.2 : 0));
        const curled = FT.p(1.4, s * 3.6, 2.2);
        const air = vadd(stand, FT.v(0.8, 0, get('jump') * 0.85));
        const rest = vlerp(vlerp(vlerp(stand, air, saturate(get('jump') / 3)), hang, hoverK), curled, saturate(sleep));
        const hock = target('foot' + name, rest);
        const point = saturate(get('point') + hoverK * 0.6 + (walking ? step.lift * 0.5 : 0));
        const toeDir = vnorm(vlerp(FT.v(0.55, s * 0.08, -1), FT.v(0.25, s * 0.08, -1), point));
        leg(R0, hips, s, hock, toeDir, j, charge);
        if (walking && step.planted) planted.push('foot' + name);
      }
      // Drums orbit behind his shoulders (they go round with the hips' twist; ring keys reshape them).
      if (get('drumsHidden') < 0.5) {
        const radius = get('ringR') || 16;
        const tilt = get('ringTilt') || 0.22;
        const spin = get('ringSpin') + turn(stormK > 0.5 ? 0.25 : 0.08) + 0.4 * (lag(maneLag, 'twist') - get('twist'));
        drums(R0, B, { radius, tilt, spin, glow: saturate(0.2 + charge * 0.6 + stormK * 0.5) }, j);
      }
      torso(R0, B, breath, charge, t, j);
      // The mane trails behind fast moves and lifts in jumps; in the storm it towers above him.
      const maneTrail = F.v(-0.05 * (lag(maneLag, 'dx') - get('dx')) - 1.6 * (lag(maneLag, 'twist') - get('twist')), 0.3 * osc(0.5), 0);
      mane(R0, B, F, maneTrail, 2.4 * saturate((lagJump(maneLag) - lagJump(A)) * 0.35) + get('maneLift'), charge, t, j);
      tail(
        R0,
        F.pitch(get('pitch')).roll(get('roll')).turn(get('twist')),
        hips.p(-4.4, 0, 0.6),
        0.14 * osc(0.33) + get('tailSway'),
        lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')) + 0.05 * (lagJump(tailLag) - lagJump(A)),
        get('tailCurl') + hoverK * 0.35,
        charge,
        t,
        j,
      );
      // Head.
      const Hd = B.at(3.2 + sleep * 3.4, 0, 20.6 - sleep * 6.6)
        .turn(0.3 * (1 - saturate(sleep)) + get('gaze'))
        .roll(get('tilt'))
        .pitch(0.1 + get('nod') + sleep * 0.5);
      R0.tag = 'neck';
      R0.cap(B.p(1.2, 0, 14.0), Hd.p(-1.6, 0, -2.6), 2.9, 2.5, fur);
      R0.cap(B.p(3.0, 0, 13.8), Hd.p(1.2, 0, -3.0), 1.6, 1.3, silverShade);
      head(R0, Hd, j, {
        blink: Math.max(get('blink'), sleep > 0.6 ? 1 : 0, period && ((q % TAU) + TAU) % TAU > 5.95 ? 1 : 0),
        lid: get('lid'),
        snarl: get('snarl'),
        roar: get('roar'),
        lookX: get('lookX'),
        lookY: get('lookY'),
        wide: get('wide'),
        charge,
        t,
      });
      for (const s of [-1, 1]) {
        const back = (s < 0 ? get('earL') : get('earR')) + get('snarl') * 0.6 + sleep * 0.4 + (lag(earLag, 'nod') - get('nod')) * 0.6;
        const flick = s * ((lag(earLag, 'gaze') - get('gaze')) * 1.2 + 0.04 * osc(0.5, s));
        ear(R0, Hd, s, back, flick, j);
      }
      const hornK = saturate((stormK - 0.05) / 0.9) * (1 - get('hornShrink'));
      for (const s of [-1, 1]) horn(R0, Hd, s, hornK, charge, t, j);
      // The arc between the horn tips when charged: it flickers on and off.
      if (charge > 0.55 && hash(Math.floor(t * 12), 5) < charge - 0.2) {
        R0.tag = 'hornArc';
        zigzag(R0, j.hornL, j.hornR, Math.floor(t * 12), veinColor(1), 1, 0.9, 6);
      }
      // Arms: fists half-closed at the hips in the fighting stance.
      // Fighting stance: the near paw forward with the claws out, the far one back by the hip.
      const restL = B.p(1.4, -7.2, 3.0),
        restR = B.p(5.4, 6.6, 5.6);
      const sleepR = FT.p(5.6, 2.6, 2.2),
        sleepL = FT.p(6.0, -2.2, 2.0);
      const handR = target('handR', vlerp(restR, sleepR, saturate(sleep))),
        handL = target('handL', vlerp(restL, sleepL, saturate(sleep)));
      const handRig = peek || clawFront ? front! : R0;
      arm(R0, B, 1, handR, j, 0.15 + get('fistR'), charge, handRig);
      arm(R0, B, -1, handL, j, 0.15 + get('fistL'), charge, handRig);
      // Discharges crackle between his hanging feet and the stone while he hovers.
      if (hoverK > 0.3) {
        R0.tag = 'charge';
        const slot = Math.floor(t * 12);
        for (let n = 0; n < 3; n++) {
          if (hash(slot, n, 91) > 0.55 + 0.3 * stormK) continue;
          const from = n === 2 ? vlerp(j.footL, j.footR, 0.5) : n ? j.footR : j.footL;
          const to = F.p(-1 + (hash(slot, n, 92) - 0.5) * 10, (hash(slot, n, 93) - 0.5) * 10, 0);
          zigzag(R0, from, to, slot * 5 + n, veinColor(0.95), 1, 1.1, 5);
        }
      }
    }
    j.body = B.p(0, 0, 8);
    j.head = j.head ?? B.p(3.2, 0, 20.6);
    j.floor = F.p(0, 0, 0);
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    const finishes: Parameters<typeof finishSurfaces>[2] = [
      [fur, 'fur'],
      [furSoft, 'fur'],
      [furShade, 'fur'],
      [furDeep, 'fur'],
      [silver, 'fur'],
      [silverSoft, 'fur'],
      [silverShade, 'fur'],
      [cloud, 'cap'],
      [cloudLit, 'cap'],
      [cloudDeep, 'cap'],
      [lacquer, 'lacquer'],
      [lacquerDeep, 'lacquer'],
      [hide, 'skin'],
      [gold, 'metal'],
      [goldDeep, 'metal'],
      [claw, 'metal'],
      [crystal, 'ice'],
      [crystalDeep, 'ice'],
      [eye, 'iris'],
      [mouthMat, 'skin'],
      [tongue, 'skin'],
    ];
    finishSurfaces(r, F, finishes, 'skin');
    if (front) finishSurfaces(front, F, finishes, 'skin');
    const sc = portraitScale * (1 + 0.12 * stormK);
    scaleFigure(r, j, sc);
    if (front) scaleFigure(front, {}, sc);
    const frame = projectFigure(r, 300, [150, 270], j, '#0a0a18', 4.4, true);
    const paint = { outline: ink, inner: 4.4 };
    if (front) {
      const pad = 120,
        size = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      const body = renderRig(r, size, size, ...anchor, paint);
      frame.px = body.p;
      frame.lit = body.lit;
      frame.eye = body.eye;
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.over = renderRig(front, size, size, ...anchor, paint).p;
    }
    const lift = Math.max(0, hipZ - HIP);
    frame.groundShadow =
      get('hidden') > 0.5 || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (300 * 0.1) / (1 + 0.03 * lift), opacity: 0.55 / (1 + 0.05 * lift), reflectionOpacity: front ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = planted;
    return frame;
  };
}
// Used by the effects file to turn rig points into vein colours.
export function stormVein(level: number, k: number) {
  const T = veinT.map((c, i) => mixc(c, blazeT[i], k)) as Tones;
  return T[Math.max(0, Math.min(3, Math.round(level * 3)))];
}
export { vdot };
