// Зенит, дракон затмения: an invented legendary dragon standing on two powerful digitigrade legs (a thick thigh, a
// long raised foot, three claws forward and a spur back), the body leaning forward, a long S-shaped neck, the head held
// high. Sunset-copper scales in rows with lighter rims, ivory belly plates with gold edges, a ring of bone plates in
// the chest holding the sun pearl (a glowing disc). A long snout, heavy jaw, slit nostrils, brow plates, amber eyes with
// a slit pupil; a crown of six bone rays fanning back from the skull (the two long ones are horns) with gold webs between
// them. Big membranous wings: ivory finger bones, membranes saffron at the bone and scarlet at the edge with gold veins,
// translucent like stained glass; folded along his back like a cape at rest. Short strong arms with gold bangles
// engraved with degree marks. A long tail with a row of spikes ending in a crescent blade of pale moon metal.
// The eclipse form «Затмение» is a transformation, not a recolour: the scales flip in a wave from the chest — copper
// becomes indigo with silver rims, the belly obsidian, the membranes black with silver constellation veins and a white
// corona burning along the trailing edge, the pearl a black disc ringed by silver flames, white-hot tips on the crown
// rays with corona tongues between them, white eyes; he flies on slow wing beats, ×1.12.
import { readCreatureCard } from '../bodies/card-data';
import type { ArmedAppearance } from '../bodies/armed-biped';
import { goalAt, toLocal } from '../bodies/goals';
import { clipClock } from '../kit/clock';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { flipTuck, pivotLift } from '../kit/pet-moves';
import { F3, Rig, renderRig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';
import { clips, HIP } from './eclipse_drake-poses';

const card = readCreatureCard('eclipse_drake');
export const portraitScale = 2.6;
const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const toneSet = (name: string, idx: number[]) => idx.map((i) => hx(tones(name)[i])) as Tones;
const saturate = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** Forward lean of the body at rest (rad): a raptor's stance, the neck rising from the chest. */
const LEAN = 0.45;

// ---- materials: day (Зенит) and night (Затмение) pairs ---------------------------------------------------------
const scale = sw('scale', [2, 3, 4, 5]),
  scaleSoft = sw('scale', [3, 4, 5, 5]),
  scaleShade = sw('scale', [0, 1, 2, 3]),
  scaleDeep = sw('scale', [0, 1, 1, 2]),
  night = sw('night', [2, 3, 4, 5], 0.03),
  nightSoft = sw('night', [3, 4, 5, 5], 0.04),
  nightShade = sw('night', [0, 1, 2, 3]),
  nightDeep = sw('night', [0, 1, 1, 2]),
  belly = sw('belly', [1, 2, 3, 4]),
  bellyShade = sw('belly', [0, 1, 2, 3]),
  obsidian = sw('obsidian', [1, 2, 3, 4]),
  obsidianShade = sw('obsidian', [0, 1, 2, 3]),
  membrane = sw('membrane', [1, 2, 3, 4], 0.16),
  membraneEdge = sw('membrane', [0, 1, 2, 3], 0.12),
  membraneGlow = sw('membrane', [2, 3, 4, 4], 0.3),
  membraneHot = sw('membrane', [2, 3, 4, 4], 0.75),
  membraneHotCore = sw('sun', [2, 3, 4, 4], 0.9),
  voidwingGlow = sw('voidwing', [2, 3, 4, 4], 0.1),
  voidwing = sw('voidwing', [1, 2, 3, 4], 0.04),
  voidwingEdge = sw('voidwing', [0, 1, 2, 3], 0.02),
  bone = sw('bone', [1, 2, 3, 4]),
  boneDeep = sw('bone', [0, 1, 2, 3]),
  gold = sw('gold', [2, 3, 4, 4], 0.12),
  goldDeep = sw('gold', [1, 2, 3, 4]),
  sunMat = sw('sun', [1, 2, 3, 4], 0.9),
  sunCore = sw('sun', [2, 3, 4, 4], 1),
  coronaMat = sw('corona', [1, 2, 3, 4], 0.85),
  coronaHot = sw('corona', [2, 3, 4, 4], 1),
  eyeDay = sw('eyes', [0, 1, 2, 3], 0.45),
  eyeNight = sw('corona', [2, 3, 4, 4], 1),
  claw = sw('claw', [0, 1, 2, 3]),
  mouthMat = sw('mouth', [0, 0, 1, 2]),
  tongue = sw('mouth', [1, 2, 3, 3]),
  throatFire = sw('sun', [1, 2, 3, 4], 0.7),
  moon = sw('moon', [1, 2, 3, 4]),
  moonGlow = sw('corona', [1, 2, 3, 4], 0.6),
  flipMat = sw('sun', [2, 3, 4, 4], 0.8),
  flipNight = sw('corona', [2, 3, 4, 4], 0.8),
  crystal: Mat = { T: [hx('#6a3a10'), hx('#d88a2a'), hx('#ffd27a'), hx('#fff6dc')], glow: 0.35 },
  crystalDeep: Mat = { T: [hx('#3a1c08'), hx('#8a5420'), hx('#d89a4a'), hx('#ffe0a0')], glow: 0.15 },
  shellMat: Mat = { T: [hx('#7a4a14'), hx('#c48a2c'), hx('#f0c45a'), hx('#fff0b4')], glow: 0.1 },
  shellDeep: Mat = { T: [hx('#3e2208'), hx('#7a4a14'), hx('#b07a28'), hx('#e0b050')] };
for (const m of [gold, goldDeep, claw, moon, crystal, shellMat]) m.spec = true;
for (const m of [coronaMat, coronaHot, sunMat, sunCore, flipMat, flipNight, throatFire]) m.soft = true;
const ink = hx('#120a08'),
  inkMat: Mat = { T: [ink, ink, ink, hx('#2a1810')] },
  white = hx('#ffffff'),
  fang = hx('#f6efe0'),
  noseMat: Mat = { T: [hx('#1a0a06'), hx('#2c140c'), hx('#4a2414'), hx('#6c3a22')] },
  sunT = toneSet('sun', [1, 2, 3, 4]),
  coronaT = toneSet('corona', [1, 2, 3, 4]);

/** Overlapping scale rows: a dark lower arc and a lit upper rim on every scale, rows offset by half a scale. */
function scalePattern(m: Mat) {
  m.pat = (q, light) => {
    const a = Math.atan2(q[1], q[0]);
    const rowF = q[2] * 8 + 10;
    const row = Math.floor(rowF);
    const colF = a * 4.2 + (row % 2) * 0.5 + 20;
    const fu = rowF - row,
      fv = colF - Math.floor(colF);
    const arc = Math.abs(fv - 0.5) * 2;
    if (fu < 0.1 + arc * arc * 0.22) return m.T[light > 0.55 ? 1 : 0];
    if (fu > 0.88 && arc < 0.55) return m.T[light > 0.35 ? 3 : 2];
    return null;
  };
}
for (const m of [scale, scaleSoft, night, nightSoft]) scalePattern(m);
/** Belly plates: horizontal bands with a gold (silver) seam. */
for (const [m, seam] of [
  [belly, hx(tones('gold')[3])],
  [obsidian, hx(tones('corona')[2])],
] as const)
  m.pat = (q, light) => {
    const band = (q[2] * 4 + 10) % 1;
    return band < 0.12 ? (light > 0.4 ? seam : m.T[0]) : null;
  };

// ---- the eclipse ------------------------------------------------------------------------------------------------
/** 0 = Зенит, 1 = Затмение (eyes, pearl, glow, size). */
let eclipseK = 0;
/** Position of the scale-flip front along the body (chest 0 → crown, tail and wing tips 1). */
let flipFront = -1;
/** The pearl already black (totality comes before the scales flip). */
let pearlNight = false;
function eclipseLook(form: number) {
  eclipseK = smooth(saturate((form - 0.05) / 0.9));
  flipFront = form * 1.3 - 0.15;
}
/** The material of a part `d` along the body: still day, on the flip front (a bright seam), or night. */
function M(day: Mat, nightM: Mat, d: number): Mat {
  if (flipFront <= -0.1) return day;
  if (flipFront >= 1.15) return nightM;
  if (d < flipFront - 0.07) return nightM;
  if (d < flipFront) return d < flipFront - 0.035 ? flipNight : flipMat;
  return day;
}
const S = (d: number) => M(scale, night, d),
  SS = (d: number) => M(scaleSoft, nightSoft, d),
  SH = (d: number) => M(scaleShade, nightShade, d),
  SD = (d: number) => M(scaleDeep, nightDeep, d),
  BL = (d: number) => M(belly, obsidian, d),
  BS = (d: number) => M(bellyShade, obsidianShade, d);

function axisFrame(origin: V3, up: V3, outward: V3) {
  const u = vnorm(up),
    s = vnorm(vcross(u, outward));
  return new F3(origin, vnorm(vcross(s, u)), s, u);
}
function limb(r: Rig, from: V3, to: V3, rw: number, rh: number, m: Mat, facing: V3, at = 0.5, len = 0.58) {
  const f = axisFrame(vlerp(from, to, at), vsub(from, to), facing);
  r.ell(f, [0, 0, 0], [rw, rh, Math.hypot(...vsub(from, to)) * len], m);
}
export function catmull(points: V3[], t: number): V3 {
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
/**
 * Overlapping scutes on an ellipsoid (frame E, centre c, radii rr): small raised plates in offset rows; `az` round the
 * vertical (0 = forward), `el` from the equator up. Each plate stands 0.25 proud of the surface, so its edge draws an
 * inner line — the scale texture is geometry, not paint.
 */
function scutes(r: Rig, E: F3, c: V3, rr: V3, az: [number, number], el: [number, number], cols: number, rows: number, w: number, mat: (k: number) => Mat) {
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < cols; k++) {
      const e = el[0] + ((el[1] - el[0]) * (i + 0.5)) / rows;
      const a = az[0] + ((az[1] - az[0]) * (k + 0.25 + (i % 2) * 0.5)) / cols;
      const q: V3 = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
      const n = vnorm([q[0] / rr[0], q[1] / rr[1], q[2] / rr[2]]);
      const at = E.p(c[0] + rr[0] * q[0] * 0.96, c[1] + rr[1] * q[1] * 0.96, c[2] + rr[2] * q[2] * 0.96);
      const N = E.v(...n);
      const ref = Math.abs(n[2]) > 0.8 ? E.f : E.u;
      r.ell(axisFrame(at, N, ref), [0, 0, 0], [w, w * 1.15, 0.34], mat(i * cols + k));
    }
}
/** Scutes down both sides of a tube from `a` to `b` (radius `rad`), facing ±`side`. */
function tubeScutes(r: Rig, a: V3, b: V3, rad: number, side: V3, w: number, m: Mat) {
  const d = vnorm(vsub(b, a)),
    c = vlerp(a, b, 0.5);
  const sd = vnorm(vsub(side, vmul(d, side[0] * d[0] + side[1] * d[1] + side[2] * d[2])));
  for (const sg of [-1, 1]) r.ell(axisFrame(vadd(c, vmul(sd, sg * rad * 0.92)), vmul(sd, sg), d), [0, 0, 0], [w, w * 0.9, 0.4], m);
}
/** A flame tongue: a soft tapered capsule wavering with `ph`, from `a` along `dir`. */
function tongueOfFire(r: Rig, a: V3, dir: V3, side: V3, len: number, w: number, ph: number, m: Mat) {
  const mid = vadd(vadd(a, vmul(dir, len * 0.55)), vmul(side, Math.sin(ph) * len * 0.18));
  const tip = vadd(vadd(a, vmul(dir, len)), vmul(side, Math.sin(ph + 1.3) * len * 0.3));
  r.cap(a, mid, w, w * 0.6, m);
  r.cap(mid, tip, w * 0.6, 0.12, m);
}

// ---- head -------------------------------------------------------------------------------------------------------
interface HeadState {
  blink: number;
  lid: number;
  snarl: number;
  roar: number;
  lookX: number;
  lookY: number;
  wide: number;
  fire: number;
  flame: number;
  ph: number;
  /** World offset of the barbel tips (lag behind the head). */
  barbel: V3;
  /** 0..1: the crown lies back flat along the neck (asleep, or ducking), like a lizard laying its frill. */
  fold: number;
}
function head(r: Rig, Hd: F3, j: Record<string, V3>, p: HeadState) {
  const d = 0.75;
  r.tag = 'head';
  // Cranium and the heavy brow; cheek plates sweep back to the jaw hinge.
  r.ell(Hd, [-0.6, 0, 0.7], [4.0, 3.3, 3.1], S(d));
  r.ell(Hd, [1.6, 0, 1.6], [2.6, 2.6, 1.4], SS(d));
  for (const s of [-1, 1]) {
    r.ell(Hd.at(0.6, s * 2.7, -0.8).turn(s * 0.35), [0, 0, 0], [2.6, 1.3, 1.8], S(d));
    r.ell(Hd.at(-1.6, s * 2.6, -1.6).turn(s * 0.5), [0, 0, 0], [1.6, 1.0, 1.3], SH(d));
  }
  // Cheek scales and a frill of small spikes along the back of the jaw.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++)
      r.ell(axisFrame(Hd.p(1.6 - (k % 3) * 1.3, s * (2.9 - (k > 2 ? 0.25 : 0)), -0.2 - (k > 2 ? 1.1 : 0)), Hd.v(0, s, 0), Hd.f), [0, 0, 0], [0.75, 0.65, 0.35], k % 2 ? SS(d) : SH(d));
    for (let k = 0; k < 4; k++) r.spike(Hd.p(-1.2 - k * 0.7, s * (2.6 - k * 0.15), -1.4 - k * 0.5), Hd.v(-0.8, s * 0.6, -0.2), 1.3 - k * 0.15, 0.32, bone, 3);
  }
  // The long snout with a ridge of small plates, the nose tip and slit nostrils.
  r.tag = 'snout';
  r.ell(Hd, [5.4, 0, -0.5], [4.9, 1.95, 1.65], S(d));
  r.ell(Hd, [5.2, 0, 0.6], [4.2, 1.2, 0.9], SS(d));
  for (let k = 0; k < 4; k++) r.ell(Hd.at(3.0 + k * 1.6, 0, 1.15 - k * 0.18).pitch(-0.15), [0, 0, 0], [0.7, 0.55, 0.32], M(bone, bone, d));
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) r.ell(axisFrame(Hd.p(3.4 + k * 1.5, s * 1.65, -0.1), Hd.v(0, s, 0.3), Hd.f), [0, 0, 0], [0.6, 0.5, 0.3], k % 2 ? SS(d) : S(d));
  // Two long barbels from the upper lip: they hang and trail behind every move of the head.
  r.tag = 'barbels';
  for (const s of [-1, 1]) {
    const root = Hd.p(8.4, s * 1.6, -1.0);
    const sag = p.barbel;
    const pts: V3[] = [root, Hd.p(7.6, s * 3.0, -2.4), vadd(Hd.p(5.6, s * 3.8, -4.4), [sag[0] * 0.4, sag[1] * 0.4, -1.0]), vadd(Hd.p(3.2, s * 4.1, -6.0), [sag[0], sag[1], -2.2])];
    for (let k = 0; k < 6; k++) r.cap(catmull(pts, k / 6), catmull(pts, (k + 1) / 6), 0.36 - k * 0.04, 0.32 - k * 0.04, k % 2 ? SS(d) : S(d));
    r.dot(catmull(pts, 0.999), eclipseK > 0.5 ? coronaT[3] : sunT[2], 0.5, 0.5);
  }
  r.tag = 'nose';
  r.ell(Hd, [9.7, 0, -0.3], [1.1, 1.5, 1.0], S(d));
  for (const s of [-1, 1]) r.line(Hd.p(10.3, s * 0.6, 0.0), Hd.p(9.6, s * 1.05, 0.25), ink, 0, 0.8);
  // The jaw hinges open with a roar or a breath of fire; the throat glows when he breathes.
  const open = saturate(p.roar + p.snarl * 0.3 + p.fire * 0.9);
  const J = Hd.at(1.2, 0, -1.9).pitch(open * 0.62);
  r.tag = 'jaw';
  r.ell(J, [3.8, 0, -0.5], [4.4, 1.7, 0.9], S(d));
  r.ell(J, [3.6, 0, -0.95], [3.8, 1.3, 0.55], BL(d));
  for (const s of [-1, 1]) {
    // lip line with a curl at the back
    r.line(Hd.p(9.2, s * 0.9, -1.55), Hd.p(4.0, s * 1.85, -1.85 + p.snarl * 0.4), ink, 0, 0.6);
  }
  if (open > 0.06) {
    r.tag = 'mouth';
    r.ell(Hd.at(5.0, 0, -2.2 - open * 0.9), [0, 0, 0], [3.9, 1.4, 0.45 + open * 1.2], p.fire > 0.2 ? throatFire : mouthMat);
    r.ell(J, [3.4, 0, 0.1], [2.6, 0.9, 0.32], tongue);
  }
  r.tag = 'fangs';
  const fangMat: Mat = { T: [hx('#a08a6a'), hx('#d4c4a4'), fang, white] };
  // a row of small teeth along the lip, always showing
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) r.spike(Hd.p(8.8 - k * 1.05, s * (1.15 + k * 0.14), -1.65), Hd.v(0, 0, -1), 0.5 + 0.25 * open, 0.2, fangMat, 3);
  if (p.snarl > 0.2 || open > 0.1)
    for (const s of [-1, 1]) {
      r.spike(Hd.p(8.3, s * 1.2, -1.75), Hd.v(0.05, 0, -1), 1.4 + 0.4 * open, 0.36, fangMat, 3);
      r.spike(Hd.p(6.2, s * 1.55, -1.85), Hd.v(0, 0, -1), 0.9, 0.28, fangMat, 3);
      if (open > 0.1) r.spike(J.p(7.2, s * 1.0, -0.2), J.v(0, 0, 1), 1.0, 0.3, fangMat, 3);
    }
  // Eyes under brow plates: amber with a slit pupil; white and pupil-less in the eclipse.
  const eyeMat = eclipseK > 0.5 ? eyeNight : eyeDay;
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const e = Hd.at(2.4, s * 2.3, 0.9).turn(s * 0.6).roll(s * -0.2);
    const P = (x: number, y: number, z: number) => e.p(x, s * y, z);
    const start = r.size;
    const opened = p.blink < 0.5;
    if (opened) {
      const ry = 1.35 + p.wide * 0.25,
        rz = 0.62 + p.wide * 0.45 - p.lid * 0.3;
      r.ell(e, [0.2, 0, 0], [0.55, ry, rz], inkMat);
      r.ell(e, [0.35, 0, 0], [0.5, ry * 0.88, rz * 0.82], eyeMat);
      if (eclipseK < 0.5) r.ell(e, [0.75, p.lookX * 0.45, p.lookY * 0.2], [0.22, 0.26, rz * 0.82], inkMat);
      r.dot(P(0.9, -0.55, 0.2), white, 0.4, 0.38);
    } else {
      r.ell(e, [0.3, 0, 0], [0.55, 1.55, 0.7], S(d));
      r.line(P(0.8, -1.4, -0.1), P(0.9, 1.3, 0.15), ink, 0, 0.8);
    }
    r.markEye(start, s, opened);
    if (s > 0) j.eyeR = r.eye = P(0.6, 0.3, 0.2);
    else j.eyeL = P(0.6, 0.3, 0.2);
    // The brow plate: a bony ridge angled down toward the snout — the proud, fierce look.
    r.tag = 'brow';
    r.ell(Hd.at(2.9, s * 2.2, 1.6).turn(s * 0.5).roll(s * 0.35).pitch(-0.3 + p.snarl * 0.2), [0, 0, 0], [2.0, 0.8, 0.55], M(bone, bone, d));
  }
  // The crown: six bone rays fanning back from the skull, the upper pair long horns; gold webs between them; in the
  // eclipse the tips burn white and corona tongues lick between the rays.
  r.tag = 'crown';
  const rays: { base: V3; tip: V3; s: number }[] = [];
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const base = Hd.p(-1.4 - k * 0.6, s * (1.4 + k * 0.8), 2.4 - k * 1.1);
      const len = (k === 0 ? 9.2 : k === 1 ? 6.4 : 4.8) * (1 - 0.3 * p.fold);
      const dir = vnorm(Hd.v(-1.0, s * (0.25 + k * 0.32) * (1 - 0.2 * p.fold), (0.95 - k * 0.55) * (1 - 0.9 * p.fold) - 0.1 * p.fold));
      const tip = vadd(base, vmul(dir, len));
      rays.push({ base, tip, s });
      r.tag = k === 0 ? (s < 0 ? 'hornL' : 'hornR') : 'crown';
      const mid = vadd(vlerp(base, tip, 0.5), Hd.v(0, 0, k === 0 ? 0.6 : 0.3));
      r.cap(base, mid, k === 0 ? 0.95 : 0.7, k === 0 ? 0.7 : 0.5, bone);
      r.cap(mid, tip, k === 0 ? 0.7 : 0.5, 0.2, bone);
      // growth rings on the horns
      for (let g = 1; g < 4; g++) {
        const rr = k === 0 ? 1.0 : 0.72;
        r.ell(axisFrame(vlerp(base, mid, g / 4), vsub(mid, base), Hd.f), [0, 0, 0], [rr, rr, 0.18], boneDeep);
      }
      if (eclipseK > 0.05) r.dot(tip, coronaT[3], eclipseK, 0.7 + eclipseK * 0.4);
      if (s > 0) j['ray' + k] = tip;
      else j['rayL' + k] = tip;
      if (k === 0) j[s < 0 ? 'hornL' : 'hornR'] = tip;
    }
  r.tag = 'crownWeb';
  for (const s of [-1, 1]) {
    const side = rays.filter((q) => q.s === s);
    for (let k = 0; k < 2; k++) {
      const a = side[k],
        b = side[k + 1];
      const ta = vlerp(a.base, a.tip, 0.62),
        tb = vlerp(b.base, b.tip, 0.72);
      r.poly([a.base, ta, tb, b.base], eclipseK > 0.5 ? M(goldDeep, voidwing, 1) : gold, 0.2);
      if (eclipseK > 0.2)
        tongueOfFire(r, vlerp(ta, tb, 0.5), vnorm(vsub(vlerp(ta, tb, 0.5), Hd.p(0, 0, 0))), Hd.u, 2.6 * eclipseK, 0.45, p.ph + k * 2 + s, coronaMat);
    }
  }
  j.nose = Hd.p(10.4, 0, -0.3);
  j.mouth = Hd.p(8.6, 0, -1.9 - open * 0.8);
  j.crown = Hd.p(-1.8, 0, 3.2);
  j.head = Hd.p(0, 0, 0);
  j.snout = Hd.p(6.0, 0, 0);
}

// ---- body -------------------------------------------------------------------------------------------------------
function torso(r: Rig, B: F3, breath: number, glow: number, ph: number, j: Record<string, V3>) {
  const parts: [V3, V3][] = [
    [[-0.8, 0, 0.6], [3.7, 4.0, 3.5]],
    [[0.4, 0, 4.8], [3.0, 3.4, 3.6]],
    [[1.6, 0, 10.2], [4.7 + breath * 0.3, 5.1 + breath * 0.2, 6.0]],
  ];
  /** The front of the torso at height z (where the belly plates and the pearl sit). */
  const frontAt = (z: number) =>
    Math.max(...parts.map(([c, rr]) => (Math.abs(z - c[2]) < rr[2] ? c[0] + rr[0] * Math.sqrt(1 - ((z - c[2]) / rr[2]) ** 2) : -9)));
  r.tag = 'pelvis';
  r.ell(B, parts[0][0], parts[0][1], S(0.35));
  r.tag = 'waist';
  r.ell(B, parts[1][0], parts[1][1], S(0.2));
  r.tag = 'chest';
  r.ell(B, parts[2][0], parts[2][1], S(0.05));
  for (const s of [-1, 1]) r.ell(B.at(0.2, s * 3.6, 12.4).turn(s * 0.5), [0, 0, 0], [3.0, 2.0, 2.6], SS(0.12));
  // Scale rows on the flanks of the chest, the waist and the hips; darker plates down the spine.
  r.tag = 'scales';
  for (const s of [-1, 1]) {
    const az: [number, number] = s > 0 ? [0.7, 2.5] : [-2.5, -0.7];
    scutes(r, B, parts[2][0], parts[2][1], az, [-0.5, 0.8], 6, 5, 0.72, (k) => (k % 3 ? SS(0.08) : S(0.08)));
    scutes(r, B, parts[1][0], parts[1][1], az, [-0.4, 0.5], 5, 2, 0.7, (k) => (k % 2 ? SS(0.2) : S(0.2)));
    scutes(r, B, parts[0][0], parts[0][1], az, [-0.2, 0.7], 5, 3, 0.72, (k) => (k % 2 ? SS(0.33) : S(0.33)));
  }
  for (let k = 0; k < 9; k++) {
    const z = 0.2 + k * 1.75;
    const back = -Math.max(...parts.map(([c, rr]) => (Math.abs(z - c[2]) < rr[2] ? -c[0] + rr[0] * Math.sqrt(1 - ((z - c[2]) / rr[2]) ** 2) : -9)));
    r.ell(B.at(back + 0.35, 0, z).pitch(0.2), [0, 0, 0], [0.9, 1.7, 1.0], SD(0.1 + k * 0.03));
  }
  // Dorsal spikes between the wings, down the back to the tail root.
  r.tag = 'neckSpikes';
  for (let k = 0; k < 6; k++) r.spike(B.p(-4.2 + k * 0.15, 0, 14 - k * 2.4), B.v(-0.8, 0, 0.6), 2.2 - k * 0.2, 0.7, bone, 4);
  // Belly plates: bands from the throat to the groin, gold-seamed.
  r.tag = 'belly';
  for (let k = 0; k < 10; k++) {
    const z = -0.6 + k * 1.2;
    r.ell(B.at(frontAt(z) - 0.5, 0, z).pitch(-0.2), [0, 0, 0], [1.3, 3.0 - Math.abs(k - 4.5) * 0.14, 0.72], k % 2 ? BS(0.05 + k * 0.02) : BL(0.05 + k * 0.02));
  }
  // The pearl ring: eight bone plates round the sun pearl in the chest.
  r.tag = 'pearlRing';
  const P = B.at(frontAt(12.0) - 0.3, 0, 12.0).pitch(-0.85);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    r.ell(P.at(-0.2, Math.cos(a) * 2.9, Math.sin(a) * 2.9).roll(a), [0, 0, 0], [0.8, 0.95, 0.75], M(bone, boneDeep, 0));
    r.ell(P.at(0.35, Math.cos(a + 0.26) * 2.35, Math.sin(a + 0.26) * 2.35), [0, 0, 0], [0.32, 0.32, 0.32], M(gold, coronaMat, 0));
  }
  r.tag = 'pearl';
  if (eclipseK < 0.5 && !pearlNight) {
    r.ell(P, [0.1, 0, 0], [1.2, 2.3 + glow * 0.15, 2.3 + glow * 0.15], sunMat);
    r.ell(P, [0.6, 0, 0], [0.9, 1.2, 1.2], sunCore);
  } else {
    // The black sun: an obsidian disc with silver flames licking round its rim.
    r.ell(P, [0.1, 0, 0], [1.2, 2.3, 2.3], obsidianShade);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU + ph * 0.25;
      const out = P.v(0, Math.cos(a), Math.sin(a));
      // the upper tongues stay short: the throat hangs right above the pearl
      const up = Math.max(0, Math.sin(a));
      if (up > 0.45) continue;
      tongueOfFire(r, vadd(P.p(0.8, 0, 0), vmul(out, 2.2)), vnorm(vadd(out, P.v(0.5 * up, 0, 0))), P.f, (1.2 + 0.4 * Math.sin(ph + k)) * (1 - 0.65 * up), 0.35, ph + k * 1.7, coronaMat);
    }
  }
  j.chest = P.p(0, 0, 0);
  j.pearl = P.p(1.3, 0, 0);
}
function arm(r: Rig, B: F3, s: number, hand: V3, j: Record<string, V3>, fist: number, handRig: Rig = r) {
  const name = s < 0 ? 'L' : 'R',
    shoulder = B.p(2.4, s * 5.0, 13.2);
  const elbow = ik(shoulder, hand, 5.4, 5.2, B.v(-0.7, s * 0.7, -0.9));
  r.tag = 'shoulder' + name;
  r.ell(B.at(2.0, s * 4.8, 13.4).turn(s * 0.4), [0, 0, 0], [2.2, 2.1, 2.1], S(0.15));
  scutes(r, B.at(2.0, s * 4.8, 13.4).turn(s * 0.4), [0, 0, 0], [2.2, 2.1, 2.1], s > 0 ? [0.4, 2.2] : [-2.2, -0.4], [0.0, 1.1], 3, 2, 0.7, (k) => (k % 2 ? SS(0.15) : S(0.15)));
  r.tag = 'arm' + name;
  limb(r, shoulder, elbow, 1.6, 1.5, S(0.28), B.f, 0.45, 0.6);
  const wrist = vlerp(elbow, hand, 0.84);
  r.cap(elbow, wrist, 1.35, 1.1, S(0.4));
  for (let k = 0; k < 3; k++) tubeScutes(r, vlerp(shoulder, elbow, 0.15 + k * 0.28), vlerp(shoulder, elbow, 0.3 + k * 0.28), 1.5, B.s, 0.7, k % 2 ? SS(0.3) : S(0.3));
  for (let k = 0; k < 2; k++) tubeScutes(r, vlerp(elbow, wrist, 0.1 + k * 0.3), vlerp(elbow, wrist, 0.25 + k * 0.3), 1.2, B.s, 0.6, k % 2 ? SS(0.4) : S(0.4));
  // A row of small spikes down the outer forearm.
  for (let k = 0; k < 3; k++) {
    const at = vlerp(elbow, wrist, 0.15 + k * 0.25);
    const out = vnorm(vcross(vsub(wrist, elbow), B.u));
    r.spike(vadd(at, vmul(out, s * 1.1)), vadd(vmul(out, s), vmul(vnorm(vsub(elbow, wrist)), 0.6)), 0.9, 0.3, bone, 3);
  }
  r.spike(elbow, vnorm(vadd(vsub(elbow, wrist), vmul(B.u, -0.3))), 1.4, 0.4, bone, 3);
  r.tag = 'bangle' + name;
  const b0 = vlerp(elbow, wrist, 0.72),
    b1 = vlerp(elbow, wrist, 0.98);
  r.cap(b0, b1, 1.45, 1.3, gold);
  r.cap(vlerp(b0, b1, -0.05), vlerp(b0, b1, 0.08), 1.6, 1.6, goldDeep);
  r.cap(vlerp(b0, b1, 0.92), vlerp(b0, b1, 1.05), 1.5, 1.5, goldDeep);
  const out = vnorm(vcross(vsub(b1, b0), B.f));
  // degree marks engraved round the bangle
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI - Math.PI / 2;
    const rim = vadd(vmul(out, s * Math.cos(a) * 1.5), vmul(B.u, Math.sin(a) * 1.4));
    r.line(vadd(vlerp(b0, b1, 0.3), rim), vadd(vlerp(b0, b1, k % 3 ? 0.55 : 0.7), rim), goldDeep.T[0], 0, 0.5);
  }
  r = handRig;
  r.tag = 'hand' + name;
  const dir = vnorm(vsub(hand, elbow));
  const Wp = new F3(hand, dir, vnorm(vcross(B.u, dir)), B.u).roll(s * 0.6);
  r.ell(Wp, [0.1, 0, 0], [1.5, 1.45, 1.0], S(0.5));
  r.tag = 'claw' + name;
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 0.85;
    const k1 = Wp.p(1.1, y, 0.1),
      k2 = Wp.p(2.1 - Math.abs(y) * 0.2 - fist * 1.2, y * 1.15, 0.2 - fist * 1.3);
    const kn = vlerp(k1, k2, 0.5);
    r.cap(k1, kn, 0.5, 0.44, S(0.55));
    r.cap(kn, k2, 0.44, 0.4, SS(0.55));
    const tipDir = vnorm(vadd(vnorm(vsub(k2, k1)), vmul(Wp.u, -0.6 - fist * 0.6)));
    r.spike(k2, tipDir, 1.2, 0.3, claw, 3);
  }
  const thumbTip = Wp.p(0.9, -s * 1.8, 0.5 - fist * 0.8);
  r.cap(Wp.p(0.2, -s * 1.2, 0.3), thumbTip, 0.5, 0.4, S(0.55));
  r.spike(thumbTip, Wp.v(0.6, -s * 0.4, -0.4), 0.9, 0.26, claw, 3);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = hand;
}
function leg(r: Rig, hips: F3, s: number, hock: V3, toeDir: V3, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = hips.p(-0.4, s * 4.0, -0.6);
  const knee = ik(hip, hock, 6.9, 6.1, hips.v(1, s * 0.22, 0.12));
  r.tag = 'thigh' + name;
  r.ell(axisFrame(vlerp(hip, knee, 0.42), vsub(hip, knee), hips.f), [0, 0, 0], [2.8, 2.5, 4.0], S(0.42));
  r.ell(axisFrame(vlerp(hip, knee, 0.5), vsub(hip, knee), hips.f), [0.9, s * 0.5, 0], [1.6, 1.5, 2.8], SS(0.45));
  for (let k = 0; k < 3; k++) tubeScutes(r, vlerp(hip, knee, 0.12 + k * 0.26), vlerp(hip, knee, 0.3 + k * 0.26), 2.4 - k * 0.2, hips.s, 0.95, k % 2 ? SS(0.42) : S(0.42));
  r.tag = 'shin' + name;
  r.cap(knee, hock, 1.85, 1.2, S(0.6));
  // a row of scutes down the front of the shin
  for (let k = 0; k < 4; k++) {
    const at = vlerp(knee, hock, 0.18 + k * 0.22),
      dd = vnorm(vsub(hock, knee));
    const frontV = vnorm(vcross(vcross(dd, hips.f), dd));
    r.ell(axisFrame(vadd(at, vmul(frontV, -(1.6 - k * 0.12))), vmul(frontV, -1), dd), [0, 0, 0], [0.75, 0.9, 0.38], M(bone, boneDeep, 0.6));
  }
  tubeScutes(r, vlerp(knee, hock, 0.3), vlerp(knee, hock, 0.6), 1.5, hips.s, 0.65, SS(0.62));
  // knee plate with a spike
  r.ell(axisFrame(knee, vsub(hock, knee), hips.f), [0.9, 0, 0], [1.1, 1.3, 1.1], M(bone, bone, 0.6));
  r.spike(vadd(knee, vmul(hips.f, 1.4)), vnorm(vadd(hips.f, vmul(vnorm(vsub(knee, hock)), 0.6))), 1.2, 0.38, bone, 3);
  r.tag = 'foot' + name;
  const ball = vadd(hock, vmul(toeDir, 5.6));
  r.cap(hock, ball, 1.2, 1.0, S(0.75));
  const fwd = vnorm([toeDir[0], toeDir[1], 0]);
  const side = vnorm(vcross([0, 0, 1], fwd));
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 1.0;
    const base = vadd(ball, vmul(side, y * 0.8)),
      tip = vadd(vadd(base, vmul(fwd, 2.3 - Math.abs(y) * 0.4)), vmul(side, y * 0.45));
    const kn = vlerp(base, tip, 0.5);
    r.cap(base, kn, 0.82, 0.7, S(0.85));
    r.cap(kn, tip, 0.7, 0.6, SS(0.85));
    r.ell(axisFrame(vadd(kn, [0, 0, 0.55]), [0, 0, 1], fwd), [0, 0, 0], [0.5, 0.5, 0.25], M(bone, boneDeep, 0.85));
    r.spike(tip, vnorm(vadd(fwd, [0, 0, -0.9])), 1.3, 0.34, claw, 3);
  }
  r.tag = 'spur';
  r.spike(vadd(hock, vmul(toeDir, 1.2)), vnorm(vadd(vmul(fwd, -1), [0, 0, 0.2])), 1.6, 0.4, claw, 3);
  j['knee' + name] = knee;
  j['heel' + name] = hock;
  j['foot' + name] = ball;
}
function tail(r: Rig, F: F3, base: V3, sway: number, lagK: number, curl: number, lift: number, ph: number, j: Record<string, V3>, wrap = 0) {
  // Long and heavy: down behind the heels, a wave along the stone, the crescent blade raised at the end. Asleep
  // (`wrap`) it lies along the dial and curls round his near side to the front, the crescent by his nose.
  const w = (k: number) => (sway + lagK * k) * k * (1 - wrap * 0.8);
  const T = (x: number, y: number, z: number, k: number, wx: number, wy: number, wz: number): V3 =>
    vadd(base, F.v(lerp(x, wx, wrap), lerp(y, wy, wrap) + w(k) * 7, lerp(z, wz, wrap) + lift * k * k * 8));
  const pts: V3[] = [
    base,
    T(-4.4, 0.4, -4.6, 0.12, -4.0, 1.6, -4.8),
    T(-10.4, 1.4, -8.6 + curl * 2, 0.28, -9.0, 5.0, -6.6),
    T(-17.0, 2.6, -8.4 + curl * 5, 0.45, -11.6, 10.0, -6.8),
    T(-22.4, 3.8, -4.6 + curl * 8, 0.62, -9.4, 15.0, -6.7),
    T(-25.6 + curl * 5, 4.6, 0.4 + curl * 7, 0.78, -3.0, 17.6, -6.5),
    T(-26.4 + curl * 8, 5.0, 4.6 + curl * 4, 0.9, 4.0, 17.4, -6.0),
    T(-25.0 + curl * 10, 5.2, 8.0 + curl * 2, 1, 9.0, 15.6, -4.6),
  ];
  r.tag = 'tail';
  const n = 30;
  for (let k = 0; k < n; k++) {
    const a = catmull(pts, k / n),
      b = catmull(pts, (k + 1) / n);
    const t0 = k / n;
    r.cap(a, b, 2.9 - 2.2 * t0, 2.9 - 2.2 * (t0 + 1 / n), k % 4 === 3 ? SS(0.45 + t0 * 0.5) : S(0.45 + t0 * 0.5));
    if (k < 26) tubeScutes(r, a, b, 2.9 - 2.2 * t0, F.s, 1.05 - t0 * 0.7, k % 2 ? SS(0.45 + t0 * 0.5) : SH(0.45 + t0 * 0.5));
    // belly scutes underneath
    if (k % 2 === 0 && k < 24) {
      const c = vlerp(a, b, 0.5),
        dd = vnorm(vsub(b, a));
      const down = vnorm(vcross(dd, F.s));
      r.ell(axisFrame(vadd(c, vmul(down, -(2.2 - 1.6 * t0))), dd, F.s), [0, 0, 0], [1.4 - t0, 1.4 - t0, 0.7], BL(0.45 + t0 * 0.5));
    }
  }
  r.tag = 'tailSpikes';
  for (let k = 1; k < 27; k++) {
    const t0 = k / n,
      c = catmull(pts, t0),
      dd = vnorm(vsub(catmull(pts, t0 + 0.02), c));
    const up = vnorm(vcross(F.s, dd));
    const big = k % 2 === 1;
    r.spike(vadd(c, vmul(up, 2.6 - 2 * t0)), vnorm(vadd(up, vmul(dd, -0.7))), (big ? 1.9 : 1.1) - t0 * (big ? 1.2 : 0.6), (big ? 0.6 : 0.4) - t0 * 0.25, big ? bone : boneDeep, 4);
  }
  // The crescent blade: a curved plate of moon metal in the plane of the tail tip, its horns pointing back and up.
  r.tag = 'crescent';
  const tip = catmull(pts, 0.999),
    dirT = vnorm(vsub(tip, catmull(pts, 0.94)));
  const upT = vnorm(vcross(F.s, dirT));
  const blade = eclipseK > 0.5 ? moonGlow : moon;
  const C = (a: number, rad: number, off: number): V3 => vadd(tip, vadd(vmul(dirT, Math.cos(a) * rad + off), vmul(upT, Math.sin(a) * rad)));
  const N = 14;
  for (let k = 0; k < N; k++) {
    const a0 = -2.0 + (k / N) * 4.0,
      a1 = -2.0 + ((k + 1) / N) * 4.0;
    r.poly([C(a0, 5.6, 1.6), C(a1, 5.6, 1.6), C(a1, 3.8, 3.0), C(a0, 3.8, 3.0)], blade, 0.3);
  }
  for (let k = 0; k < 4; k++) r.line(C(-2.0 + k, 5.6, 1.6), C(-1.0 + k, 5.6, 1.6), moon.T[3], eclipseK * 0.8, 0.8);
  void ph;
  j.tailTip = tip;
  j.crescent = C(0, 5.6, 1.6);
  j.crescentA = C(-2.0, 4.7, 2.3);
  j.crescentB = C(2.0, 4.7, 2.3);
}

// ---- wings ------------------------------------------------------------------------------------------------------
export interface WingState {
  open: number;
  beat: number;
  sweep: number;
  ph: number;
  glow: number;
  /** Sunlight soaked into the membranes: 0 none, 1 every band glowing (from the edge in). */
  heat: number;
}
const rotX = (v: V3, a: number): V3 => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
const rotZ = (v: V3, a: number): V3 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
const dirMix = (a: V3, b: V3, u: number) => vnorm(vlerp(vnorm(a), vnorm(b), u));
/** Bones (folded → open direction, length): humerus, forearm and three fingers from the wrist (lead, middle, trail). */
const WING = {
  // directions in the leaning body frame (LEAN 0.6): open = up and back in the world, spread outward
  hum: { fold: [-0.75, 0.3, 0.45] as V3, open: [-0.55, 0.55, 0.62] as V3, len: 6.6 },
  fore: { fold: [0.55, 0.2, 0.8] as V3, open: [-0.85, 0.12, 0.5] as V3, len: 7.6 },
  fingers: [
    { fold: [-0.95, 0.12, -0.15] as V3, open: [-0.25, 0.1, 0.96] as V3, len: 15.0 },
    { fold: [-0.72, 0.16, -0.66] as V3, open: [-0.95, 0.08, 0.3] as V3, len: 13.5 },
    { fold: [-0.38, 0.18, -0.9] as V3, open: [-0.8, 0.06, -0.6] as V3, len: 12.0 },
  ],
};
function wing(r: Rig, B: F3, s: number, st: WingState, j: Record<string, V3>, wingRig: Rig = r) {
  const name = s < 0 ? 'L' : 'R';
  const root = B.p(-1.6, s * 3.0, 14.2);
  const u = smooth(saturate(st.open));
  const place = (v: V3): V3 => {
    // local wing space: x forward, y outward (mirrored by s), z up; beat raises the wing round the root, sweep
    // swings it forward and back
    const lv: V3 = [v[0], v[1], v[2]];
    const r1 = rotX(lv, st.beat);
    const r2 = rotZ(r1, st.sweep);
    return B.v(r2[0], s * r2[1], r2[2]);
  };
  const boneAt = (from: V3, b: { fold: V3; open: V3; len: number }, extra = 0): V3 => {
    const d = dirMix(b.fold, b.open, u);
    return vadd(from, vmul(place(d), b.len * (1 + extra)));
  };
  const elbow = boneAt(root, WING.hum);
  const wrist = boneAt(elbow, WING.fore);
  const tips = WING.fingers.map((f) => boneAt(wrist, f));
  const trail = vadd(B.p(-3.8, s * 3.4, 3.6), place([0, 0, 0]));
  r = wingRig;
  // Membranes first (behind the bones in depth bias), scalloped between the finger tips.
  r.tag = 'membrane';
  const memIn = (d: number) => M(membrane, voidwing, d),
    memEdge = (d: number) => M(membraneEdge, voidwingEdge, d);
  const memGlow = (d: number) => M(membraneGlow, voidwingGlow, d);
  const scallop = (a: V3, b: V3) => vlerp(vlerp(a, b, 0.5), wrist, 0.17);
  const edges: [V3, V3, V3][] = [];
  // Stained glass: each panel from the wrist out is three bands (saffron at the bone, scarlet at the edge) with a
  // leading of dark gold between them; in the eclipse — black glass with indigo lights.
  const BANDS = [0, 0.38, 0.7, 1];
  const panel = (a: V3, b: V3, d: number) => {
    for (let i = 0; i < 3; i++) {
      const t0 = BANDS[i],
        t1 = BANDS[i + 1];
      const hot = st.heat > (i === 2 ? 0.15 : i === 1 ? 0.45 : 0.75);
      const m = hot && eclipseK < 0.5 ? (i === 2 ? membraneHot : membraneHotCore) : i === 0 ? memGlow(d) : i === 1 ? memIn(d) : memEdge(d);
      r.poly([vlerp(wrist, a, t0), vlerp(wrist, a, t1), vlerp(wrist, b, t1), vlerp(wrist, b, t0)], m, -0.2);
      if (i > 0) r.line(vlerp(wrist, a, t0), vlerp(wrist, b, t0), eclipseK > 0.5 ? voidwingEdge.T[0] : goldDeep.T[1], 0, -0.1);
    }
  };
  for (let k = 0; k < 2; k++) {
    const sc = scallop(tips[k], tips[k + 1]);
    panel(tips[k], sc, 0.78 + k * 0.06);
    panel(sc, tips[k + 1], 0.84 + k * 0.06);
    edges.push([tips[k], sc, tips[k + 1]]);
  }
  const sc2 = scallop(tips[2], trail);
  panel(tips[2], sc2, 0.9);
  panel(sc2, trail, 0.7);
  r.poly([wrist, trail, elbow], memIn(0.62), -0.2);
  r.poly([elbow, trail, root], memIn(0.55), -0.2);
  r.poly([root, elbow, wrist], memEdge(0.58), -0.2);
  edges.push([tips[2], sc2, trail]);
  // Veins: gold lines from the wrist into each membrane; silver constellations in the eclipse.
  for (let k = 0; k < 3; k++) {
    const a = tips[k],
      b = k < 2 ? tips[k + 1] : trail;
    for (const f of [0.35, 0.68]) {
      const end = vlerp(vlerp(a, b, f), wrist, 0.22);
      if (eclipseK < 0.5) r.line(vlerp(wrist, end, 0.15), end, gold.T[2], 0.1, -0.1);
      else
        for (let q = 1; q <= 4; q++) {
          const pt = vlerp(wrist, end, q / 4.2);
          r.dot(pt, coronaT[q === 4 ? 3 : 2], 0.6 + 0.4 * Math.sin(st.ph + q + k), 0.5, -0.1);
          if (q > 1) r.line(vlerp(wrist, end, (q - 1) / 4.2), pt, coronaT[1], 0.3, -0.1);
        }
    }
  }
  // The corona along the trailing edge in the eclipse: soft flame tongues in the plane of the wing.
  if (eclipseK > 0.05)
    for (const [a, sc, b] of edges)
      for (let q = 0; q < 4; q++) {
        const pt = q < 2 ? vlerp(a, sc, (q + 0.5) / 2) : vlerp(sc, b, (q - 1.5) / 2);
        const out = vnorm(vsub(pt, wrist));
        tongueOfFire(r, pt, out, place([0, 0, 1]), (1.4 + 0.8 * Math.sin(st.ph * 1 + q * 1.9)) * eclipseK, 0.4, st.ph + q, coronaMat);
      }
  // Bones: the arm of the wing in scales, the fingers in ivory, a claw on the wrist.
  r.tag = 'wing' + name;
  r.cap(root, elbow, 1.55, 1.25, S(0.5));
  r.cap(elbow, wrist, 1.2, 0.95, S(0.6));
  r.ell(axisFrame(elbow, vsub(wrist, elbow), B.u), [0, 0, 0], [1.3, 1.3, 1.3], SS(0.55));
  r.spike(wrist, vnorm(vadd(place([0.4, 0.2, 1]), vmul(vsub(wrist, elbow), 0.05))), 1.8, 0.45, claw, 3);
  r.tag = 'wingBone';
  tips.forEach((tip, k) => {
    const knuckle = vlerp(wrist, tip, 0.45);
    r.cap(wrist, knuckle, 0.62 - k * 0.05, 0.48, M(bone, boneDeep, 0.8));
    r.ell(axisFrame(knuckle, vsub(tip, wrist), B.u), [0, 0, 0], [0.62, 0.62, 0.5], M(boneDeep, boneDeep, 0.85));
    r.cap(knuckle, tip, 0.48, 0.18, M(bone, boneDeep, 0.9));
  });
  j['wingRoot' + name] = root;
  j['wingWrist' + name] = wrist;
  j['wingTip' + name] = tips[0];
  j['wingTrail' + name] = tips[2];
}

/** Mirror spots in the facing frame (forward, right): front-near, back-near, front-far. */
export const MIRRORS: [number, number][] = [
  [21, 11],
  [-14, 17],
  [19, -11],
];
// ---- props: mirrors, egg ----------------------------------------------------------------------------------------
/** A crystal mirror in a bronze ring: a lens standing on edge, facing `face`. `up` 0..1 rises it out of the floor. */
function mirror(r: Rig, base: V3, face: V3, up: number, crack: number, lit: number, j: Record<string, V3>, key: string) {
  r.tag = 'mirror';
  const n = vnorm([face[0], face[1], 0]);
  const side = vnorm(vcross([0, 0, 1], n));
  // it grows up out of the hour mark: small and low at first, full size on its stem
  const R = 5.0 * (0.25 + 0.75 * smooth(up));
  const c = vadd(base, [0, 0, (R * 1.15 + 0.6) + 4.5 * smooth(up)]);
  const ring: V3[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    ring.push(vadd(c, vadd(vmul(side, Math.cos(a) * R), [0, 0, Math.sin(a) * R * 1.15])));
  }
  for (let k = 0; k < 12; k++) r.cap(ring[k], ring[(k + 1) % 12], 0.55, 0.55, k % 3 ? gold : goldDeep);
  // degree ticks on the ring and a sun boss at the top
  for (let k = 0; k < 12; k += 2) r.spike(ring[k], vnorm(vsub(ring[k], c)), 0.9, 0.3, goldDeep, 3);
  r.ell(axisFrame(ring[3], [0, 0, 1], n), [0, 0, 0.6], [0.8, 0.8, 0.8], gold);
  const lens = lit > 0.3 ? crystal : crystalDeep;
  for (let k = 0; k < 12; k++) {
    if (crack > 0 && hash(k, 5) < crack) continue;
    r.poly([c, ring[k], ring[(k + 1) % 12]], lens, 0.1);
  }
  // the stem down into the dial
  r.cap(vadd(c, [0, 0, -R * 1.15]), vadd(base, [0, 0, -1]), 0.55, 0.7, goldDeep);
  j[key] = c;
}
function egg(r: Rig, F: F3, crack: number, open: number, j: Record<string, V3>) {
  r.tag = 'egg';
  const c = F.p(0.5, 0, 7.5);
  // A golden egg like a small sun with a crescent pattern; the top half lifts away when it bursts.
  const lid = vmul(F.u, open * 14);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    const out = F.v(Math.cos(a), Math.sin(a), 0);
    r.ell(F.at(...vadd(vsub(c, F.p(0, 0, 0)), vmul(out, 0.2))).turn(a), [0, 0, -1.6], [5.2, 5.2, 4.6], k % 2 ? shellMat : shellDeep, (q) => q[2] > 0.1);
    if (open < 1) r.ell(F.at(...vadd(vadd(vsub(c, F.p(0, 0, 0)), lid), vmul(out, 0.2 + open * 4))).turn(a), [0, 0, 1.4], [4.8, 4.8, 5.4], k % 2 ? shellMat : shellDeep, (q) => q[2] < 0.05);
  }
  // cracks of light
  const lines = Math.floor(crack * 7);
  for (let k = 0; k < lines; k++) {
    const a = (k / 7) * TAU + 0.3;
    let prev = vadd(c, F.v(Math.cos(a) * 5.4, Math.sin(a) * 5.4, -1 + hash(k, 3) * 2));
    for (let q = 1; q < 4; q++) {
      const pt = vadd(c, F.v(Math.cos(a + q * 0.25) * 5.5, Math.sin(a + q * 0.25) * 5.5, -1 + q * 2.4 * (hash(k, q) > 0.5 ? 1 : -1)));
      r.line(prev, pt, sunT[3], 1, 0.9);
      prev = pt;
    }
  }
  j.egg = c;
}

// ---- assembly ---------------------------------------------------------------------------------------------------
type Figure = NonNullable<ArmedAppearance['figure']>;
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3, 'idle-f2': 2, turn: 4 };
export function drakeFigure(sample: PoseSample): Figure {
  return (anim, t, side, _variant, pose, support) => {
    const get = (key: string) => pose[key] ?? 0,
      A = pose as JointPose;
    const period = clips[anim]?.loop ? clips[anim].seconds : (loopPeriods[anim] ?? 0);
    const q = period ? (t * TAU) / period : 0;
    const clock = clipClock(clips[anim]?.seconds ?? 2, t);
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
    eclipseLook(form);
    pearlNight = get('pearlDark') > 0.5;
    const ph = clock.turn(1.5);
    const glow = saturate(get('charge') + 0.25 + 0.15 * clock.osc(0.5));
    const walking = anim === 'walk';
    const feet = support?.feet;
    const bob = walking ? 0.5 * Math.cos(t * TAU * 2) : 0;
    const breath = period && !walking ? 0.4 * Math.sin(q) : 0;
    const hover = get('hover') + (eclipseK > 0.5 ? 0.7 * Math.sin(clock.turn(1)) : 0);
    const hoverK = saturate(hover / 4);
    const crouch = get('crouch') + 0.3 * (1 - saturate(sleep)) * (1 - hoverK) + sleep * 9.2;
    const hipZ = HIP + get('lift') - crouch + get('jump') + hover + breath * 0.3 + bob;
    // A flip turns round his middle, not round the hips (kit/pet-moves).
    const [pivotX, pivotZ] = pivotLift(get('pitch'), 0, 9);
    // BU: the hip frame upright (it follows flips, rolls and spins); B: the body leaning forward like a raptor.
    const BU = F.at(get('lean') + pivotX, get('drift'), hipZ + pivotZ)
      .pitch(get('pitch'))
      .roll(get('roll') + (walking ? 0.04 * Math.sin(t * TAU) : 0))
      .turn(get('twist'));
    const hips = BU.pitch(LEAN + sleep * 1.0 + get('bodyPitch') + (walking ? 0.04 : 0));
    const B = hips;
    // A spin (`twist`) turns feet and hand goals with the body.
    const twist = get('twist');
    const FT = twist ? F.at(get('lean'), get('drift'), 0).turn(twist).at(-get('lean'), -get('drift'), 0) : F;
    const target = (key: string, rest: V3) => {
      const g = goalAt(A, key, toLocal(FT, rest));
      return g ? FT.p(...g) : rest;
    };
    const overAll = get('overAll') > 0.5,
      peek = get('peekHang') > 0.001;
    const front = overAll || peek ? new Rig() : null;
    const R0 = overAll ? front! : r;
    const neckLag = previous(2),
      tailLag = previous(4),
      wingLag = previous(3);
    const lagJump = (p: JointPose) => lag(p, 'jump') + lag(p, 'lift') - lag(p, 'crouch') + lag(p, 'hover');
    const planted: string[] = [];
    if (get('hidden') < 0.5) {
      // Legs: stand on the dial, or tuck under him in flight.
      const tuck = Math.max(flipTuck(get('pitch')), saturate(get('tuck')));
      for (let index = 0; index < 2; index++) {
        const s = index ? 1 : -1,
          name = s < 0 ? 'L' : 'R';
        const step = feet ? feet[index] : { forward: 0, lift: 0, planted: true };
        const fwd = walking ? step.forward / portraitScale : 0;
        const stand = FT.p(-3.0 + fwd + (get('stride') + (walking ? 0 : 1.0)) * s, s * 4.6, 5.4 + step.lift * 3.2);
        const hang = BU.p(-5.6 + s * 1.2, s * 4.0, -9.4 + (s > 0 ? 1.2 : 0));
        const curled = FT.p(1.6, s * 4.0, 2.4);
        const air = vadd(stand, FT.v(0.8, 0, get('jump') * 0.85));
        const tucked = BU.p(3.4, s * 4.2, -6.0);
        const rest = vlerp(vlerp(vlerp(vlerp(stand, air, saturate(get('jump') / 3)), hang, hoverK), curled, saturate(sleep)), tucked, tuck);
        const hock = target('foot' + name, rest);
        const point = saturate(get('point') + hoverK * 0.6 + (walking ? step.lift * 0.5 : 0));
        const toeDir = vnorm(vlerp(vlerp(FT.v(0.55, s * 0.08, -1), FT.v(0.25, s * 0.08, -1), point), hips.v(0.4, s * 0.08, -1), tuck));
        leg(R0, hips, s, hock, toeDir, j);
        if (walking && step.planted) planted.push('foot' + name);
      }
      torso(R0, B, breath, glow, ph, j);
      // Wings: folded like a cape at rest (a slow breath in the membranes), opened and beating in tricks and flight.
      const openBase = get('wingOpen') + (eclipseK > 0.5 ? 0.62 : 0) * (1 - saturate(sleep));
      const beatBase = get('wingBeat') + (eclipseK > 0.5 ? 0.42 * Math.sin(clock.turn(1)) : 0.03 * clock.osc(0.33));
      const lagBeat = 0.5 * (lag(wingLag, 'jump') - get('jump')) * 0.05 + 0.6 * (lag(wingLag, 'twist') - get('twist'));
      for (const s of [-1, 1]) {
        const k = s < 0 ? 'L' : 'R';
        wing(R0, B, s, {
          open: saturate(openBase + get('wingOpen' + k)),
          beat: beatBase + get('wingBeat' + k) + s * lagBeat * 0.3,
          sweep: get('wingSweep') + get('wingSweep' + k),
          ph: ph + s,
          glow,
          heat: get('wingHeat'),
        }, j);
      }
      tail(
        R0,
        F.pitch(get('pitch')).roll(get('roll')).turn(get('twist')),
        hips.p(-4.6, 0, 0.8),
        0.12 * clock.osc(0.33) + get('tailSway'),
        lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')) + 0.05 * (lagJump(tailLag) - lagJump(A)),
        get('tailCurl') + hoverK * 0.3,
        get('tailLift'),
        ph,
        j,
        saturate(sleep),
      );
      // Neck: an S from the chest up to the head; `coil` pulls the head back and down (before a breath of fire).
      const coil = get('coil');
      const neckLagN = 0.6 * (lag(neckLag, 'nod') - get('nod')) + 0.08 * (lagJump(neckLag) - lagJump(A));
      const sl = saturate(sleep),
        reachN = get('neckReach'),
        rise = get('neckUp');
      // lying down the head swings out in front of the chest (an arc), never straight down through it
      const arcOut = Math.sin(Math.PI * sl);
      // asleep he lies on his belly, the head on the dial in front of the near paw, turned to us, eyes shut
      const Hd = BU.at(lerp(14.2 - coil * 5.0 + reachN, 19.5, sl) + 4 * arcOut, lerp(0, 6.0, sl), lerp(24.0 - coil * 3.5 + rise + neckLagN, -5.6, sl))
        .turn(0.32 * (1 - sl) + get('gaze') + sl * 1.5)
        .roll(get('tilt') - sl * 0.15)
        .pitch(0.06 + get('nod') + coil * 0.35 + sl * 0.08);
      const neckPts: V3[] = [
        B.p(2.6, 0, 13.6),
        BU.p(lerp(13.4 - coil * 2.6 + reachN * 0.3, 15.0, sl) + 2 * arcOut, lerp(0, 1.0, sl), lerp(13.6 - coil * 1.2 + rise * 0.3, 1.8, sl)),
        BU.p(lerp(11.2 - coil * 4.4 + reachN * 0.7, 18.4, sl) + 3.5 * arcOut, lerp(0, 2.8, sl), lerp(18.8 - coil * 2.6 + rise * 0.7, -2.6, sl)),
        Hd.p(-2.6, 0, -1.4),
      ];
      R0.tag = 'neck';
      const NS = 16;
      for (let k = 0; k < NS; k++) {
        const a = catmull(neckPts, k / NS),
          b = catmull(neckPts, (k + 1) / NS);
        const t0 = k / NS;
        R0.cap(a, b, 2.9 - t0 * 1.1, 2.9 - (t0 + 1 / NS) * 1.1, S(0.4 + t0 * 0.3));
        tubeScutes(R0, a, b, 2.9 - t0 * 1.1, B.s, 0.85 - t0 * 0.25, k % 2 ? SS(0.4 + t0 * 0.3) : SH(0.4 + t0 * 0.3));
        const dd = vnorm(vsub(b, a));
        const fwdN = vnorm(vcross(vcross(dd, B.f), dd));
        // throat scutes and a row of spikes down the back of the neck
        if (k % 2 === 0) R0.ell(axisFrame(vadd(vlerp(a, b, 0.5), vmul(B.f, 1.9 - t0 * 0.8)), dd, B.s), [0, 0, 0], [1.4, 1.6 - t0 * 0.5, 0.7], BL(0.4 + t0 * 0.3));
        if (k % 2 === 1) {
          R0.tag = 'neckSpikes';
          R0.spike(vadd(vlerp(a, b, 0.5), vmul(B.f, -(2.4 - t0 * 0.9))), vnorm(vadd(vmul(B.f, -1), vmul(fwdN, -0.2))), 1.6 - t0 * 0.4, 0.5, bone, 4);
          R0.tag = 'neck';
        }
      }
      const fire = get('fire');
      const barbel = F.v(
        0.6 * (lag(tailLag, 'lean') - get('lean')) + 0.4 * (lag(tailLag, 'nod') - get('nod')) * 6,
        4 * (lag(tailLag, 'twist') - get('twist')) + 3 * (lag(tailLag, 'gaze') - get('gaze')) + 0.35 * clock.osc(0.33, 1),
        0.5 * (lagJump(tailLag) - lagJump(A)),
      );
      head(R0, Hd, j, {
        barbel,
        blink: Math.max(get('blink'), sleep > 0.6 ? 1 : 0, period && ((q % TAU) + TAU) % TAU > 5.95 ? 1 : 0),
        lid: get('lid'),
        snarl: get('snarl'),
        roar: get('roar'),
        lookX: get('lookX'),
        lookY: get('lookY'),
        wide: get('wide'),
        fire,
        flame: get('flame'),
        ph,
        fold: saturate(sleep * 1.6),
      });
      // Arms: claws half-closed in front of the chest, the near one a little higher.
      const restL = BU.p(13.4, -3.8, 3.4),
        restR = BU.p(12.8, 5.6, 0.6);
      const sleepR = FT.p(13.2, 3.0, 1.0),
        sleepL = FT.p(14.6, -4.0, 1.0);
      const swing = walking ? Math.sin(t * TAU) : 0;
      const handR = target('handR', vadd(vlerp(restR, sleepR, saturate(sleep)), B.v(-1.6 * swing, 0, 0.5 * Math.abs(swing)))),
        handL = target('handL', vadd(vlerp(restL, sleepL, saturate(sleep)), B.v(1.6 * swing, 0, 0.5 * Math.abs(swing))));
      arm(R0, B, 1, handR, j, 0.2 + get('fistR'), R0);
      arm(R0, B, -1, handL, j, 0.2 + get('fistL'), R0);
      // Mirrors of the observatory: they stand still in the world while he turns among them.
      if (get('mirrors') > 0.001) {
        const spots: V3[] = MIRRORS.map(([x, y]) => F0.p(x, y, 0));
        // each lens turns half toward him, half toward the viewer, so it reads as a glowing disc
        const viewer = F0.v(0.57, 0.82, 0);
        spots.forEach((at, k) => mirror(R0, at, vadd(vnorm(vsub(F0.p(0, 0, 0), at)), vmul(viewer, 1.3)), get('mirrors'), get('mirrorCrack'), get('mirrorLit' + k), j, 'mirror' + k));
      }
    } else if (peek) {
      // Peeking from above the frame: only the neck and the upside-down head hang down into the picture.
      const hang = get('peekHang');
      const top = F.p(4.0, 0, 92);
      const Hd = F.at(4.0, 0, 92 - hang * 48).pitch(Math.PI * 0.92).roll(get('tilt')).turn(get('gaze'));
      front!.tag = 'neck';
      const pts: V3[] = [top, F.p(4.6, 0, 92 - hang * 20), F.p(3.4, 0, 92 - hang * 36), Hd.p(-2.6, 0, -1.4)];
      for (let k = 0; k < 14; k++) front!.cap(catmull(pts, k / 14), catmull(pts, (k + 1) / 14), 2.5, 2.4, S(0.5));
      head(front!, Hd, j, { barbel: F.v(0, 0, 0), blink: get('blink'), lid: 0, snarl: get('snarl'), roar: 0, lookX: get('lookX'), lookY: 0, wide: get('wide'), fire: 0, flame: 0, ph, fold: 0 });
    }
    if (get('egg') > 0.5) egg(r, F0.roll(get('eggRock')), get('eggCrack'), get('eggOpen'), j);
    j.body = B.p(0, 0, 8);
    j.head = j.head ?? B.p(6.6, 0, 25.6);
    j.floor = F.p(0, 0, 0);
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    const finishes: Parameters<typeof finishSurfaces>[2] = [
      [scale, 'skin'],
      [scaleSoft, 'skin'],
      [scaleShade, 'skin'],
      [scaleDeep, 'skin'],
      [night, 'skin'],
      [nightSoft, 'skin'],
      [nightShade, 'skin'],
      [nightDeep, 'skin'],
      [belly, 'ivory'],
      [bellyShade, 'ivory'],
      [obsidian, 'ivory'],
      [obsidianShade, 'ivory'],
      [membrane, 'paper'],
      [membraneGlow, 'paper'],
      [membraneHot, 'paper'],
      [membraneHotCore, 'paper'],
      [voidwingGlow, 'paper'],
      [membraneEdge, 'paper'],
      [voidwing, 'paper'],
      [voidwingEdge, 'paper'],
      [bone, 'ivory'],
      [boneDeep, 'ivory'],
      [gold, 'metal'],
      [goldDeep, 'metal'],
      [claw, 'metal'],
      [moon, 'metal'],
      [crystal, 'ice'],
      [crystalDeep, 'ice'],
      [shellMat, 'shell'],
      [shellDeep, 'shell'],
      [eyeDay, 'iris'],
      [eyeNight, 'iris'],
      [mouthMat, 'skin'],
      [tongue, 'skin'],
    ];
    finishSurfaces(r, F, finishes, 'skin');
    if (front) finishSurfaces(front, F, finishes, 'skin');
    const sc = portraitScale * (1 + 0.12 * eclipseK) * (1 + get('grow'));
    scaleFigure(r, j, sc);
    if (front) scaleFigure(front, {}, sc);
    const frame = projectFigure(r, 300, [150, 270], j, '#120a08', 4.4, true);
    const paint = { outline: ink, inner: 4.4 };
    if (front) {
      const pad = 160,
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
        : { radius: (300 * 0.11) / (1 + 0.03 * lift), opacity: 0.55 / (1 + 0.05 * lift), reflectionOpacity: front ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('flash')) frame.flash = Math.min(1, get('flash'));
    if (get('ghostA') > 0.01) frame.ghost = { dx: Math.round(get('ghostDx')), dy: Math.round(get('ghostDy')), alpha: Math.min(0.85, get('ghostA')) };
    frame.planted = planted;
    return frame;
  };
}
/** For the effects file: the corona and sun ramps. */
export const ramps = { sun: sunT, corona: coronaT };
export const eclipseOf = (form: number) => smooth(saturate((form - 0.05) / 0.9));
void mixc;
