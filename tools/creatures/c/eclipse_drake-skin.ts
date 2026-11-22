// Зенит, дракон затмения — his own skeleton, made for him alone (no shared body template). A wyvern: no spare limbs.
// The fore limbs ARE the wings: a strong arm (humerus, forearm) with a three-clawed hand at the wrist and three long
// ivory wing fingers behind it. On the ground he walks on four like a bat or a pterosaur — on the hind feet and on the
// folded wrists, the knuckle pads on the stone, the folded fingers rising past the elbows like the ribs of a closed
// umbrella; he rears on the hind legs to open the wings, and the hands at the wrists catch, hold and draw.
// The body is ONE line from the skull to the crescent: a spline through throat, chest, belly, pelvis and tail, a
// cross-section that swells from the neck into a deep keeled chest, narrows at the waist, widens at the hips and runs
// on without a step into the tail — the tail grows out of the pelvis, it is not attached to it. A dorsal ridge of
// bone spikes and a strip of ivory belly plates run the whole line.
// Sunset-copper scales in rows with lighter rims, ivory belly plates with gold seams, a ring of bone plates in the
// chest round the sun pearl. A long snout, heavy jaw, amber eyes with a slit pupil; a crown of six bone rays fanning
// back from the skull with gold webs between them; two barbels trail from the lip. Membranes saffron at the bone and
// scarlet at the edge, leaded like stained glass. Gold bangles with degree marks on the forearms. The tail ends in a
// crescent blade of pale moon metal.
// The eclipse form «Затмение» is a transformation: the scales flip in a wave from the chest — copper becomes indigo
// with silver rims, the belly obsidian, the membranes black with silver constellation veins and a white corona along
// the trailing edge, the pearl a black disc ringed by silver flames; he flies on slow wing beats, ×1.12.
import { readCreatureCard } from '../bodies/card-data';
import { goalAt, toLocal } from '../bodies/goals';
import { clipClock } from '../kit/clock';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { flipTuck, pivotLift } from '../kit/pet-moves';
import { strideFoot } from '../motion';
import { F3, Rig, renderRig, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { pointsOnlyActive, projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import type { BodyFrame, Creature } from '../types';
import { finishSurfaces } from './surface-work';
import { clips, HIP } from './eclipse_drake-poses';
const card = readCreatureCard('eclipse_drake');
const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const toneSet = (name: string, idx: number[]) => idx.map((i) => hx(tones(name)[i])) as Tones;
const saturate = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** Idle blink at the end of each loop: the third eyelid sweeps across first, then the lids shut. */
const blinkAt = (a: number) => (a > 6.04 ? 1 : a > 5.86 ? 0.36 : 0);

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
  eyeDay = sw('eyes', [1, 2, 3, 4], 0.5),
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
  coronaT = toneSet('corona', [1, 2, 3, 4]),
  eyeT = [0, 1, 2, 3, 4].map((i) => hx(tones('eyes')[i]));

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
  // Cranium: a broad flat skull behind the eyes; heavy jaw muscles sweep back to the hinge.
  r.ell(Hd, [-0.5, 0, 0.8], [3.7, 3.1, 2.7], S(d));
  r.ell(Hd, [1.4, 0, 1.5], [2.6, 2.4, 1.2], SS(d));
  for (const s of [-1, 1]) {
    r.ell(Hd.at(0.6, s * 2.6, -0.8).turn(s * 0.35), [0, 0, 0], [2.6, 1.3, 1.8], S(d));
    r.ell(Hd.at(-1.6, s * 2.5, -1.6).turn(s * 0.5), [0, 0, 0], [1.6, 1.0, 1.3], SH(d));
  }
  // Cheek scales and a frill of small spikes along the back of the jaw.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++)
      r.ell(axisFrame(Hd.p(1.6 - (k % 3) * 1.3, s * (2.8 - (k > 2 ? 0.25 : 0)), -0.2 - (k > 2 ? 1.1 : 0)), Hd.v(0, s, 0), Hd.f), [0, 0, 0], [0.75, 0.65, 0.35], k % 2 ? SS(d) : SH(d));
    for (let k = 0; k < 4; k++) r.spike(Hd.p(-1.2 - k * 0.7, s * (2.5 - k * 0.15), -1.4 - k * 0.5), Hd.v(-0.8, s * 0.6, -0.2), 1.4 - k * 0.15, 0.34, bone, 3);
  }
  // The snout: a wedge, broad at the eyes and narrowing to the nose, flat on top with a ridge of bone plates, the
  // upper lip a hard edge over the teeth.
  r.tag = 'snout';
  r.ell(Hd, [3.6, 0, 0.0], [3.0, 2.25, 1.85], S(d));
  r.ell(Hd, [6.1, 0, -0.35], [2.7, 1.8, 1.45], S(d));
  r.ell(Hd, [8.4, 0, -0.6], [1.9, 1.4, 1.15], SS(d));
  r.ell(Hd, [5.6, 0, 0.75], [3.6, 1.15, 0.6], SS(d));
  for (let k = 0; k < 5; k++) r.ell(Hd.at(2.6 + k * 1.45, 0, 1.35 - k * 0.24).pitch(-0.18), [0, 0, 0], [0.62, 0.5, 0.3], M(bone, bone, d));
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) r.ell(axisFrame(Hd.p(3.6 + k * 1.45, s * (1.95 - k * 0.16), -0.15 - k * 0.12), Hd.v(0, s, 0.3), Hd.f), [0, 0, 0], [0.6, 0.5, 0.3], k % 2 ? SS(d) : S(d));
  // the brow: a hard ridge over each eye sloping down to the snout, the socket dark under it
  r.tag = 'brow';
  for (const s of [-1, 1]) {
    r.ell(Hd.at(2.3, s * 1.95, 1.05).turn(s * 0.42), [0, 0, 0], [1.7, 0.65, 0.55], SD(d));
    r.ell(Hd.at(2.5, s * 2.05, 2.05).turn(s * 0.42).roll(s * 0.3).pitch(-0.32 + p.snarl * 0.2), [0, 0, 0], [2.5, 0.85, 0.55], S(d));
    r.spike(Hd.p(1.0, s * 2.4, 2.2), Hd.v(-0.9, s * 0.5, 0.25), 1.5, 0.4, bone, 3);
  }
  void catmull;
  r.tag = 'nose';
  r.ell(Hd, [9.8, 0, -0.45], [1.0, 1.3, 0.95], S(d));
  for (const s of [-1, 1]) r.line(Hd.p(10.4, s * 0.55, -0.1), Hd.p(9.7, s * 0.95, 0.2), ink, 0, 0.8);
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
  // Eyes, from reptiles [вики: Sclera, Crocodile, Nictitating membrane, Palpebral (bone)]: the eye sits on the SIDE of
  // the skull looking out and a little forward; what shows is almost all iris (no white, the sclera stays under the
  // lids); a vertical slit pupil as in crocodiles; a bony palpebral under the brow hoods the upper lid, so its margin
  // is a hard dark line across the top of the iris; the light pools in the lower iris. A third eyelid sweeps across
  // from the front corner before the lids shut. In the eclipse — a white glow with no pupil.
  // (Before 22.11 the eye faced forward along the snout: its almond stood across the head and read as a dot.)
  const eyeMat = eclipseK > 0.5 ? eyeNight : eyeDay;
  const irisLow: Mat = eclipseK > 0.5 ? { T: [coronaT[2], coronaT[3], white, white], glow: 1 } : { T: [eyeT[2], eyeT[3], eyeT[4], eyeT[4]], glow: 0.75 };
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    // +y in P runs back along the head, -y to the front corner by the snout
    const e = Hd.at(2.55, s * 2.32, 0.7).turn(s * 1.12).roll(s * 0.1);
    const P = (x: number, y: number, z: number) => e.p(x, s * y, z);
    const opened = p.blink < 0.5;
    const ry = 1.95 + p.wide * 0.15,
      rz = 0.98 + p.wide * 0.3 - p.lid * 0.3;
    // the lid rims: dark scaled skin, thick above (in the shadow of the brow), thin below
    r.tag = 'lid' + (s < 0 ? 'L' : 'R');
    r.ell(e, [0.05, 0, 0.12], [0.5, ry * 1.07, rz * 1.1 + 0.1], SD(d));
    if (opened) {
      // the upper lid: a hood of scale from the palpebral over the top of the iris, its margin a hard line
      r.ell(e, [0.3, 0.05, rz * 1.3], [0.55, ry * 1.06, rz * 0.5], S(d));
      r.line(P(0.8, -ry * 0.98, rz * 0.3), P(0.84, -ry * 0.25, rz * 0.78), ink, 0, 0.85);
      r.line(P(0.84, -ry * 0.25, rz * 0.78), P(0.8, ry * 0.96, rz * 0.5), ink, 0, 0.85);
      // the lower lid: a light rim of small scales
      r.ell(e, [0.28, 0.05, -rz * 1.02], [0.45, ry * 0.86, rz * 0.24], SS(d));
    } else {
      // shut: the lower lid rises (lizards blink upward) and meets the hood
      r.ell(e, [0.3, 0, -0.05], [0.55, ry * 1.02, rz * 0.9], S(d));
      r.line(P(0.8, -ry * 0.98, 0.15), P(0.84, ry * 0.95, rz * 0.42), ink, 0, 0.8);
    }
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const start = r.size;
    if (opened) {
      r.ell(e, [0.24, 0, 0], [0.5, ry, rz], eyeMat);
      r.ell(e, [0.3, 0.1, -rz * 0.4], [0.46, ry * 0.74, rz * 0.5], irisLow);
      if (eclipseK < 0.5) r.ell(e, [0.6, -0.05 + p.lookX * 0.5, -rz * 0.05], [0.2, 0.2 + p.wide * 0.12, rz * 0.92], inkMat);
      // the third eyelid: a pale film drawn back from the front corner
      const nict = saturate((p.blink - 0.22) / 0.26);
      if (nict > 0.02) r.ell(e, [0.62, -ry + ry * nict, 0], [0.2, ry * nict, rz * 0.98], { T: [hx('#8a7a66'), hx('#b4a88c'), hx('#d8ceb4'), hx('#efe6cc')] });
      // a glint high on the cornea, toward the light
      r.dot(P(0.86, -ry * 0.38, rz * 0.2), white, 0.45, 0.4);
    }
    r.markEye(start, s, opened);
    if (s > 0) j.eyeR = r.eye = P(0.6, 0.3, 0.2);
    else j.eyeL = P(0.6, 0.3, 0.2);
  }
  // The crown: six bone rays fanning back from the skull, the upper pair long horns; gold webs between them; in the
  // eclipse the tips burn white and corona tongues lick between the rays.
  r.tag = 'crown';
  const rays: { base: V3; tip: V3; s: number }[] = [];
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const base = Hd.p(-1.4 - k * 0.6, s * (1.4 + k * 0.8), 2.4 - k * 1.1);
      const len = (k === 0 ? 9.2 : k === 1 ? 6.4 : 4.8) * (1 - 0.5 * p.fold);
      // folded (asleep) the rays lie back and splay out to the sides of the neck, like a lizard laying its frill
      const dir = vnorm(Hd.v(-1.0, s * (0.25 + k * 0.32 + 0.35 * p.fold), (0.95 - k * 0.55) * (1 - 0.9 * p.fold) + 0.7 * p.fold));
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

// ---- frames -----------------------------------------------------------------------------------------------------
/** A frame whose forward axis is `fwd`, its up as close to `upHint` as the forward allows. */
function frameF(o: V3, fwd: V3, upHint: V3): F3 {
  const f = vnorm(fwd);
  let s = vcross(upHint, f);
  if (vlen(s) < 1e-4) s = vcross([0, 0, 1], f);
  s = vnorm(s);
  return new F3(o, f, s, vcross(f, s));
}
/** Frames along points, the up vector carried from `start` both ways so the back stays the back through every bend. */
function lineFrames(P: V3[], start: number, up0: V3): F3[] {
  const n = P.length;
  const tan = (i: number) => vnorm(vsub(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]));
  const make = (i: number, upPrev: V3) => {
    const f = tan(i);
    let u = vsub(upPrev, vmul(f, vdot(upPrev, f)));
    if (vlen(u) < 1e-4) u = vcross(f, [0, 1, 0]);
    u = vnorm(u);
    return new F3(P[i], f, vcross(u, f), u);
  };
  const out: F3[] = new Array(n);
  out[start] = make(start, up0);
  for (let i = start + 1; i < n; i++) out[i] = make(i, out[i - 1].u);
  for (let i = start - 1; i >= 0; i--) out[i] = make(i, out[i + 1].u);
  return out;
}

// ---- the body line: from the crescent to the skull --------------------------------------------------------------
/** A knot of the body line: position, half width and half height of the cross-section, flip distance, part. */
interface Knot {
  p: V3;
  w: number;
  h: number;
  d: number;
  tag: string;
}
/** Samples along the line (the more, the smoother the silhouette). */
const LINE_N = 76;
/**
 * The whole body as one spline: overlapping cross-section ellipsoids that swell and narrow without a step, scale
 * rows down both flanks, a strip of belly plates underneath, a ridge of bone spikes along the top from the nape to
 * the tail tip. Returns the samples so the caller can hang the pearl, the shoulders and the crescent on them.
 */
function bodyLine(r: Rig, K: Knot[], start: number, up0: V3) {
  const pts = K.map((k) => k.p);
  const n = K.length - 1;
  const P: V3[] = [],
    W: number[] = [],
    H: number[] = [],
    D: number[] = [],
    T: string[] = [];
  for (let i = 0; i <= LINE_N; i++) {
    const u = i / LINE_N;
    P.push(catmull(pts, u));
    const x = u * n,
      a = Math.min(n - 1, Math.floor(x)),
      f = x - a;
    W.push(lerp(K[a].w, K[a + 1].w, f));
    H.push(lerp(K[a].h, K[a + 1].h, f));
    D.push(lerp(K[a].d, K[a + 1].d, f));
    T.push(K[Math.round(x)].tag);
  }
  const Fr = lineFrames(P, Math.round((start / n) * LINE_N), up0);
  const seg = (i: number) => 0.5 * vlen(vsub(P[Math.min(LINE_N, i + 1)], P[Math.max(0, i - 1)]));
  for (let i = 0; i <= LINE_N; i++) {
    const F = Fr[i],
      w = W[i],
      h = H[i],
      d = D[i],
      L = seg(i);
    r.tag = T[i];
    r.ell(F, [0, 0, 0], [L * 1.05 + 0.25 * Math.min(w, h), w, h], i % 6 === 5 ? SS(d) : S(d));
    // belly plates, gold-seamed, from the throat to the last third of the tail
    if (i % 2 === 0 && h > 0.85)
      r.ell(axisFrame(F.p(0, 0, -h * 0.9), F.v(0, 0, -1), F.f), [0, 0, 0], [L * 1.0 + 0.12, w * 0.6, 0.5 + 0.06 * h], i % 4 ? BL(d) : BS(d));
    // scale rows down both flanks: raised plates, rows offset by half a plate
    const dense = T[i] === 'chest' || T[i] === 'belly' || T[i] === 'pelvis';
    if (dense || i % 2 === 0) {
      const rows = h > 2.6 ? [-0.38, 0.12, 0.6] : [-0.15, 0.55];
      for (const sg of [-1, 1])
        rows.forEach((el0, row) => {
          const el = el0 + (i % 2 ? 0.14 : 0);
          const c = Math.cos(el),
            sn = Math.sin(el);
          const at = F.p(0, sg * w * c * 0.97, h * sn * 0.97);
          const nrm = vnorm(F.v(0, (sg * c) / w, sn / h));
          const pw = Math.min(1.05, 0.3 + 0.2 * Math.min(w, h));
          r.ell(axisFrame(at, nrm, F.f), [0, 0, 0], [L * 0.62 + 0.12, pw, 0.3], row === rows.length - 1 ? SH(d) : row === 0 && rows.length > 2 ? SS(d) : S(d));
        });
    }
  }
  // the dorsal ridge: one row of bone spikes the whole length, tallest over the shoulders and the hips
  r.tag = 'ridge';
  for (let i = 2; i < LINE_N - 1; i += 2) {
    const F = Fr[i],
      h = H[i];
    if (h < 0.5) continue;
    const big = (i / 2) % 2 === 0;
    const len = (0.45 + 0.42 * h) * (big ? 1 : 0.62);
    r.spike(F.p(0, 0, h * 0.9), vnorm(vadd(F.u, vmul(F.f, -0.78))), len, 0.24 + 0.1 * h, big ? bone : boneDeep, 4);
  }
  return { P, W, H, D, Fr };
}

/** The crescent blade at the tail tip: a curved plate of moon metal in the plane of the tip, horns back and up. */
function crescent(r: Rig, tip: V3, dirT: V3, side: V3, j: Record<string, V3>) {
  r.tag = 'crescent';
  const upT = vnorm(vcross(side, dirT));
  const blade = eclipseK > 0.5 ? moonGlow : moon;
  const C = (a: number, rad: number, off: number): V3 => vadd(tip, vadd(vmul(dirT, Math.cos(a) * rad + off), vmul(upT, Math.sin(a) * rad)));
  const N = 16;
  for (let k = 0; k < N; k++) {
    const a0 = -2.0 + (k / N) * 4.0,
      a1 = -2.0 + ((k + 1) / N) * 4.0;
    r.poly([C(a0, 5.8, 1.6), C(a1, 5.8, 1.6), C(a1, 3.9, 3.0), C(a0, 3.9, 3.0)], blade, 0.3);
  }
  for (let k = 0; k < 4; k++) r.line(C(-2.0 + k, 5.8, 1.6), C(-1.0 + k, 5.8, 1.6), moon.T[3], eclipseK * 0.8, 0.8);
  // the socket the blade grows from: a ring of bone at the tip
  r.cap(vadd(tip, vmul(dirT, -0.6)), vadd(tip, vmul(dirT, 1.0)), 0.7, 0.55, M(bone, boneDeep, 1));
  j.tailTip = tip;
  j.crescent = C(0, 5.8, 1.6);
  j.crescentA = C(-2.0, 4.8, 2.3);
  j.crescentB = C(2.0, 4.8, 2.3);
}

/** The sun pearl in a ring of bone plates on the front of the chest; `PF` faces out of the chest. */
function pearl(r: Rig, PF: F3, glow: number, ph: number, j: Record<string, V3>) {
  r.tag = 'pearlRing';
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    r.ell(PF.at(-0.2, Math.cos(a) * 2.9, Math.sin(a) * 2.9).roll(a), [0, 0, 0], [0.8, 0.95, 0.75], M(bone, boneDeep, 0));
    r.ell(PF.at(0.35, Math.cos(a + 0.26) * 2.35, Math.sin(a + 0.26) * 2.35), [0, 0, 0], [0.32, 0.32, 0.32], M(gold, coronaMat, 0));
  }
  r.tag = 'pearl';
  if (eclipseK < 0.5 && !pearlNight) {
    r.ell(PF, [0.1, 0, 0], [1.2, 2.3 + glow * 0.15, 2.3 + glow * 0.15], sunMat);
    r.ell(PF, [0.6, 0, 0], [0.9, 1.2, 1.2], sunCore);
  } else {
    // the black sun: an obsidian disc with silver flames licking round its rim
    r.ell(PF, [0.1, 0, 0], [1.2, 2.3, 2.3], obsidianShade);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU + ph * 0.25;
      // no tongues on the upper arc (they would lick into the neck), shorter ones toward it
      const up = Math.sin(a);
      if (up > 0.45) continue;
      const out = PF.v(0, Math.cos(a), up);
      tongueOfFire(r, vadd(PF.p(0.8, 0, 0), vmul(out, 2.2)), vnorm(vadd(out, PF.v(0.4, 0, 0))), PF.f, (1.2 + 0.4 * Math.sin(ph + k)) * (up > 0 ? 1 - up : 1), 0.35, ph + k * 1.7, coronaMat);
    }
  }
  j.chest = PF.p(0, 0, 0);
  j.pearl = PF.p(1.3, 0, 0);
}

// ---- hind legs --------------------------------------------------------------------------------------------------
/** A powerful digitigrade leg: thick thigh grown out of the hip, a long raised foot, three claws forward, a spur. */
function leg(r: Rig, Pv: F3, BU: F3, s: number, hock: V3, toeDir: V3, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R',
    hip = Pv.p(-0.9, s * 3.2, -1.2);
  const knee = ik(hip, hock, 7.6, 7.0, BU.v(1, s * 0.25, 0.1));
  r.tag = 'thigh' + name;
  // the haunch: a big muscle that fills the flank above the hip, so the leg grows out of the body
  r.ell(axisFrame(vlerp(hip, knee, 0.3), vsub(hip, knee), Pv.f), [0, s * 0.3, 0], [3.2, 2.7, 4.4], S(0.4));
  r.ell(axisFrame(vlerp(hip, knee, 0.5), vsub(hip, knee), Pv.f), [1.0, s * 0.6, 0], [1.7, 1.6, 3.0], SS(0.44));
  for (let k = 0; k < 3; k++) tubeScutes(r, vlerp(hip, knee, 0.12 + k * 0.26), vlerp(hip, knee, 0.3 + k * 0.26), 2.5 - k * 0.2, Pv.s, 0.95, k % 2 ? SS(0.42) : S(0.42));
  r.tag = 'shin' + name;
  r.cap(knee, hock, 1.9, 1.2, S(0.6));
  for (let k = 0; k < 4; k++) {
    const at = vlerp(knee, hock, 0.18 + k * 0.22),
      dd = vnorm(vsub(hock, knee));
    const frontV = vnorm(vcross(vcross(dd, Pv.f), dd));
    r.ell(axisFrame(vadd(at, vmul(frontV, -(1.6 - k * 0.12))), vmul(frontV, -1), dd), [0, 0, 0], [0.75, 0.9, 0.38], M(bone, boneDeep, 0.6));
  }
  tubeScutes(r, vlerp(knee, hock, 0.3), vlerp(knee, hock, 0.6), 1.5, Pv.s, 0.65, SS(0.62));
  r.ell(axisFrame(knee, vsub(hock, knee), Pv.f), [0.9, 0, 0], [1.1, 1.3, 1.1], M(bone, bone, 0.6));
  r.spike(vadd(knee, vmul(Pv.f, 1.4)), vnorm(vadd(Pv.f, vmul(vnorm(vsub(knee, hock)), 0.6))), 1.2, 0.38, bone, 3);
  r.tag = 'foot' + name;
  const ball = vadd(hock, vmul(toeDir, 5.0));
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

// ---- forelegs ------------------------------------------------------------------------------------------------
/** Six limbs [owner 22.11: «как будто на турнике висит… крылья и руки передние отдельно сделать?»]: the wings grow out
 * of the back, the forelegs are legs of their own. He walks on four paws; reared, the paws come up to the chest; in a
 * trick they hold, catch and reach (the hand goals). A strong upper arm out of a shoulder muscle, the elbow pointing
 * back, a forearm with the gold bangle, a paw with three clawed fingers and a thumb claw. */
export interface PawState {
  /** 0 open claws, 1 a fist. */
  fist: number;
  /** 0..1 how much the paw stands on the stone. */
  ground: number;
}
const UPPER = 7.4,
  LOWER = 7.0;
function foreleg(r: Rig, Pv: F3, BU: F3, s: number, paw: V3, st: PawState, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  // at the side of the chest, so the arm hangs outside the body and the pearl stays in sight between the paws
  const shoulder = Pv.p(8.6, s * 3.9, -1.0);
  // never further than the leg reaches, never closer than the folded leg allows
  let to = paw;
  const d = vsub(to, shoulder),
    L = vlen(d);
  if (L > (UPPER + LOWER) * 0.995) to = vadd(shoulder, vmul(d, ((UPPER + LOWER) * 0.995) / L));
  if (L < 3.2) to = vadd(shoulder, vmul(L > 1e-3 ? vmul(d, 1 / L) : Pv.f, 3.2));
  // The elbow points down the body (toward the tail on four, toward the ground when he rears) and out, never into
  // the chest [owner 22.11: «локти перевёрнуты» — with the pole in the upright frame a reared elbow went back
  // into the body and the forearm came out of the chest].
  const elbow = ik(shoulder, to, UPPER, LOWER, vnorm(Pv.v(-1, s * 0.3, 0.35)));
  r.tag = 'shoulder' + name;
  r.ell(axisFrame(shoulder, vsub(shoulder, elbow), Pv.f), [0, s * 0.3, 0], [2.1, 1.9, 2.4], S(0.2));
  r.tag = 'arm' + name;
  r.cap(shoulder, elbow, 1.45, 1.15, S(0.4));
  for (let k = 0; k < 3; k++) tubeScutes(r, vlerp(shoulder, elbow, 0.15 + k * 0.27), vlerp(shoulder, elbow, 0.3 + k * 0.27), 1.4, Pv.s, 0.62, k % 2 ? SS(0.42) : S(0.42));
  r.ell(axisFrame(elbow, vsub(to, elbow), BU.u), [0, 0, 0], [1.2, 1.2, 1.2], SS(0.5));
  r.spike(elbow, vnorm(vadd(vsub(elbow, to), vmul(vsub(elbow, shoulder), 0.5))), 1.2, 0.34, bone, 3);
  r.cap(elbow, to, 1.12, 0.9, S(0.55));
  tubeScutes(r, vlerp(elbow, to, 0.12), vlerp(elbow, to, 0.36), 1.05, Pv.s, 0.5, SS(0.55));
  r.tag = 'bangle' + name;
  const b0 = vlerp(elbow, to, 0.58),
    b1 = vlerp(elbow, to, 0.76);
  r.cap(b0, b1, 1.1, 1.04, gold);
  r.cap(vlerp(b0, b1, -0.05), vlerp(b0, b1, 0.1), 1.2, 1.2, goldDeep);
  r.cap(vlerp(b0, b1, 0.9), vlerp(b0, b1, 1.05), 1.15, 1.15, goldDeep);
  // the paw: on the stone the fingers point forward and grip the dial; in the air they follow the forearm and curl
  r.tag = 'paw' + name;
  const fd = vnorm(vsub(to, elbow));
  const handF = vnorm(vlerp(vnorm(vadd(fd, BU.v(0.5, 0, 0))), FTdir(BU, s), st.ground));
  const Wp = frameF(to, handF, BU.u);
  r.ell(Wp, [0.3, 0, -0.1], [1.7, 1.5, 1.1], S(0.6));
  r.tag = 'claw' + name;
  const fist = saturate(st.fist);
  for (let k = 0; k < 3; k++) {
    const y = (k - 1) * 0.85;
    const k1 = Wp.p(1.3, y, -0.2),
      k2 = Wp.p(2.6 - Math.abs(y) * 0.3 - fist * 1.4, y * 1.2, -0.4 - fist * 1.3 - st.ground * 0.3);
    const kn = vlerp(k1, k2, 0.5);
    r.cap(k1, kn, 0.55, 0.47, S(0.62));
    r.cap(kn, k2, 0.47, 0.42, SS(0.62));
    r.spike(k2, vnorm(vadd(vnorm(vsub(k2, k1)), vmul(Wp.u, -0.7 - fist * 0.6))), 1.25, 0.32, claw, 3);
  }
  // the thumb claw on the inside
  r.spike(Wp.p(0.4, -s * 1.3, 0.1), vnorm(Wp.v(0.6, -s * 0.8, -0.3)), 1.1, 0.3, claw, 3);
  j['shoulder' + name] = shoulder;
  j['elbow' + name] = elbow;
  j['hand' + name] = Wp.p(2.4, 0, -0.4);
  j['fore' + name] = [to[0], to[1], Math.max(0, to[2] - 1.1)];
}

// ---- wings: out of the back -------------------------------------------------------------------------------------
export interface WingState {
  /** 0 folded (umbrella), 1 spread. */
  open: number;
  beat: number;
  sweep: number;
  ph: number;
  glow: number;
  /** Sunlight soaked into the membranes: 0 none, 1 every band glowing (from the edge in). */
  heat: number;
  /** 0..1 the wing wrapped round the body like a cloak: the wrist up by the head, the fingers down round the flank. */
  wrap: number;
  /** 0..1 mantling: the fingers arch up and back over him like a hood. */
  mantle: number;
  /** The wing's wrist (world): its own spread / fold / wrap position, or a pose goal. */
  air: V3;
  /** 0..1 upstroke: the hand flexes back at the wrist; the arm stays straight. */
  flex: number;
  /** Radians the fingers trail the beat (opposite to its motion): the trailing fingers billow, the lead stays. */
  tipLag: number;
  /** 0..1 how much the wing needs the edge-on cheat, and the elevation where it stands edge-on (see wingEdge). */
  near: number;
  edge: number;
  /** The beat's change since the previous frame (the cheat crosses the band smoothly in a fast stroke, at once in a hold). */
  vel: number;
}
/** Bone lengths: humerus, forearm; wing fingers (lead, middle, trail); the membrane reaches the flank over the hip. */
const HUM = 12.0,
  FORE = 16.0,
  FINGERS = [40, 35, 29];
/** The spread wing as dragons are drawn and filmed [owner's references 22.11; drawing guides: the arm and the long wing
 * finger make the leading edge]: the arm is a straight spar from the shoulder, the lead finger carries it on in nearly
 * one line, the other fingers fan back from the wrist in the wing plane, the last toward the tail. Bats keep the elbow
 * bent in flight — not a dragon (owner 22.11). Spar: (forward, outward, up), a little forward, a little dihedral. */
const SPAR: V3 = vnorm([0.12, 0.96, 0.26]);
/** In the wing plane, perpendicular to the spar, toward the tail and a little down. */
const WING_BACK: V3 = vnorm(vsub([-1, 0, -0.25], vmul(SPAR, vdot([-1, 0, -0.25], SPAR))));
/** Fingers' angles from the spar toward WING_BACK, radians; the upstroke flex added to each; the share of the tip lag. */
const FAN = [0.1, 0.74, 1.4],
  FLEX = [0.18, 0.3, 0.22],
  LAG = [0.25, 0.6, 1];
/** Mantling (braced on the wrists): the fingers rise from the planted wrist up, out and back over him. */
const MANTLE_DIRS: V3[] = [
  [-0.1, 0.14, 0.98],
  [-0.55, 0.16, 0.82],
  [-0.9, 0.12, 0.42],
];
/** The wing's own wrist position relative to the shoulder (forward, outward, up): folded up on the back (the wrist
 * just ahead of and above the shoulder, the elbow back over the hips, the fingers along the flank), spread. */
const WRIST_FOLD: V3 = [2.0, 3.2, 1.6];
/** Halfway open: the wrist raised over the back (the control point of the opening curve). */
const WRIST_LIFT: V3 = [-0.5, 8.0, 19.0];
// spread, the arm is straight [owner's references 22.11: the elbow does not bend in flight]
const WRIST_OPEN: V3 = vmul(SPAR, (HUM + FORE) * 0.998);
/** Rotate a local (forward, outward, up) vector by the wing beat (round the forward axis) and sweep (round up). */
function beatSweep(v: V3, beat: number, sweep: number): V3 {
  const y1 = v[1] * Math.cos(beat) - v[2] * Math.sin(beat),
    z1 = v[1] * Math.sin(beat) + v[2] * Math.cos(beat);
  const x2 = v[0] * Math.cos(sweep) - y1 * Math.sin(sweep),
    y2 = v[0] * Math.sin(sweep) + y1 * Math.cos(sweep);
  return [x2, y2, z1];
}
/** The beat turns the whole straight wing round the shoulder (the dihedral is in SPAR): authored ±1 is about ±46°.
 * In this camera (from above, the dragon turned 35° to us) the near wing raised 40–55° stands edge-on: spar and trailing
 * finger fall on one screen line and the wing reads as a stick. Painters cheat the near wing out of that band, and so
 * do we: `near` (0..1) pushes its elevation down toward level below the band and up toward vertical above it, so it
 * is either level-to-low or high, and only flicks through the band in a beat. */
/** Beat amplitude of the eclipse form's hover (it flies all the time). */
const HOVER_BEAT = 0.75;
/** The eclipse form's own wing spread (poses add to it). */
const F2_OPEN = 1;
/** How far he turns side on in flight (rad). */
const FLY_TURN = 0.42;
/** `edge`: the elevation where the near wing stands edge-on, atan(0.75 / cos ψ) for the camera (tan 37° = 0.75)
 * and his turn ψ from side on. The near wing is never held in the band edge ∓ 0.45: from a little below a level beat
 * up it stands high (we see its underside, a broad sail), below that it hangs low (we see its top); it crosses the
 * band only in the downstroke, where the beat is fastest. Holding beats of 0.2–0.6 used to stand it edge-on. */
const liftBeat = (beat: number, u: number, near = 0, edge = 0.7, vel = 0) => {
  const a = beat * 0.8 * u;
  const e = a + 0.26;
  const c = edge - 0.62;
  const high = edge + 0.5 + Math.max(0, e - c) * 0.3;
  // held, the jump is instant; in a stroke it is spread so the wing crosses the band in 2–3 frames, not one
  const w = 0.08 + Math.min(0.3, 3 * Math.abs(vel * 0.8 * u));
  return a + near * smooth(saturate((e - c) / w + 0.5)) * (high - e);
};
/** Where this wing stands edge-on to the camera, for any turn of the body: the wing at elevation θ spans
 * cos θ·out + sin θ·up and the tail direction, its normal is ⊥ to the view at tan θ = −A / B. A wing whose edge-on
 * elevation falls inside the beat's range (0.3–1.2 rad, the near wing in the usual three-quarter view, either wing in
 * a roll or a spin) gets the cheat; the far wing stands edge-on only far below its downstroke. */
const VIEW: V3 = [0, 0.8, 0.6];
function wingEdge(BU: F3, s: number): { near: number; edge: number } {
  const out = BU.v(0, s, 0),
    back = BU.v(-1, 0, 0);
  const A = vdot(vcross(out, back), VIEW),
    B = vdot(vcross(BU.u, back), VIEW);
  const edge = Math.abs(B) < 1e-4 ? Math.PI / 2 : Math.atan(-A / B);
  return { near: saturate((edge - 0.15) / 0.2) * saturate((1.35 - edge) / 0.2), edge };
}
/** The wing's own wrist (world) for a spread / beat / sweep, from the shoulder in the upright frame BU. */
function wingWrist(BU: F3, Pv: F3, shoulder: V3, s: number, open: number, beat: number, sweep: number, near: number, edge: number, vel: number): V3 {
  const u = smooth(saturate(open));
  // folded, the wing lies along the body (it follows him up when he rears); spread, it stands in the upright frame
  // Opening, the wrist goes up over the back first and then out (a curve through WRIST_LIFT), so a half-open wing
  // stands raised behind him instead of stabbing down past his side.
  const v = beatSweep(WRIST_OPEN, liftBeat(beat, u, near, edge, vel), sweep);
  const fold = Pv.v(WRIST_FOLD[0], s * WRIST_FOLD[1], WRIST_FOLD[2]),
    lift = BU.v(WRIST_LIFT[0], s * WRIST_LIFT[1], WRIST_LIFT[2]),
    out = BU.v(v[0], s * v[1], v[2]);
  return vadd(shoulder, vadd(vadd(vmul(fold, (1 - u) * (1 - u)), vmul(lift, 2 * u * (1 - u))), vmul(out, u * u)));
}
function wing(r: Rig, BU: F3, Pv: F3, shoulder: V3, s: number, st: WingState, j: Record<string, V3>) {
  const name = s < 0 ? 'L' : 'R';
  const u = smooth(saturate(st.open));
  // the wrist where the wing puts it; never further than the arm reaches
  let wrist = st.air;
  const reachV = vsub(wrist, shoulder),
    reachL = vlen(reachV);
  const maxReach = (HUM + FORE) * (0.985 + 0.014 * u);
  if (reachL > maxReach) wrist = vadd(shoulder, vmul(reachV, maxReach / reachL));
  // and never nearer than the folded arm allows (the forearm is twice the humerus): a closer goal used to push the
  // forearm through the shoulder; the tightest elbow is ~26°
  const nearest = (FORE - HUM) * 1.15;
  if (reachL < nearest) wrist = vadd(shoulder, vmul(reachL > 1e-3 ? vmul(reachV, 1 / reachL) : BU.f, nearest));
  // the elbow points back: over the hips when folded, back and a little down when spread
  const pole = vnorm(vlerp(vlerp(Pv.v(-1.0, s * 0.25, 0.35), BU.v(-1.0, s * 0.3, -0.25), u), BU.v(-0.6, s * 1, -0.3), smooth(saturate(st.wrap))));
  const elbow = ik(shoulder, wrist, HUM, FORE, pole);
  const fd = vnorm(vsub(wrist, elbow));
  // one elevation for the whole wing (the near wing's cheat taken at the wrist), plus each finger's own lag
  const lift0 = liftBeat(st.beat, u, st.near, st.edge, st.vel);
  const place = (v: V3, lagBy = 0): V3 => {
    const w = beatSweep(v, lift0 + lagBy * 0.8 * u, st.sweep);
    return BU.v(w[0], s * w[1], w[2]);
  };
  // folded: the fingers run back from the wrist along the forearm, past the elbow, down the flank toward the tail,
  // the membrane furled between them; spread: out of the wrist into the wing
  const back = vmul(fd, -1);
  void back;
  // folded like a cloak on the flank: the lead finger back along the top of the flank, the others fanning down it,
  // all hugging the side (no outward lean), so the membrane between them covers the flank
  const FOLD: V3[] = [vnorm(Pv.v(-0.97, -s * 0.04, -0.24)), vnorm(Pv.v(-0.9, -s * 0.02, -0.43)), vnorm(Pv.v(-0.8, 0, -0.6))];
  // wrapped: the fingers hang from the raised wrist down and forward round the flank, the membrane a cloak
  const WRAP: V3[] = [vnorm(BU.v(0.62, -s * 0.18, -0.78)), vnorm(BU.v(0.12, -s * 0.05, -1)), vnorm(BU.v(-0.42, s * 0.08, -0.9))];
  const wr = smooth(saturate(st.wrap));
  // the far wing of a mantle leans out so it stands above his back; the near one rises straight beside him
  const mOut = s > 0 ? 1 : 3.6;
  const fan = (k: number): V3 => {
    const a = FAN[k] + FLEX[k] * st.flex;
    return vadd(vmul(SPAR, Math.cos(a)), vmul(WING_BACK, Math.sin(a)));
  };
  const spread = (k: number) => vnorm(vlerp(place(fan(k), st.tipLag * LAG[k]), BU.v(MANTLE_DIRS[k][0], s * MANTLE_DIRS[k][1] * mOut, MANTLE_DIRS[k][2]), st.mantle));
  // folded, the fingers lie close together and reach back to the root of the tail
  // half open the fingers stand up and back over him (the same curve as the wrist)
  const RAISED: V3[] = [vnorm(BU.v(-0.15, s * 0.3, 0.95)), vnorm(BU.v(-0.5, s * 0.32, 0.8)), vnorm(BU.v(-0.85, s * 0.3, 0.45))];
  const opening = (k: number): V3 => vadd(vadd(vmul(FOLD[k], (1 - u) * (1 - u)), vmul(RAISED[k], 2 * u * (1 - u))), vmul(spread(k), u * u));
  const tips = FINGERS.map((len, k) => vadd(wrist, vmul(vnorm(vlerp(opening(k), WRAP[k], wr)), len * (0.52 + 0.48 * Math.max(u, wr) - 0.22 * wr))));
  // The membrane's root runs along the back from the shoulder over the hips to the root of the tail.
  const hipF = Pv.p(-0.8, s * 2.4, 3.4);
  const trail = Pv.p(-5.2, s * 1.7, 2.4);
  // Membranes first (behind the bones in depth bias), scalloped between the finger tips.
  r.tag = 'membrane' + name;
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
  r.poly([elbow, trail, hipF], memIn(0.58), -0.2);
  r.poly([elbow, hipF, shoulder], memIn(0.55), -0.2);
  // the leading membrane from the shoulder to the wrist, in front of the arm
  r.poly([shoulder, elbow, wrist], memEdge(0.58), -0.2);
  edges.push([tips[2], sc2, trail]);
  // veins: gold lines from the wrist into each membrane; silver constellations in the eclipse
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
  // the corona along the trailing edge in the eclipse: soft flame tongues in the plane of the wing
  if (eclipseK > 0.05 && u > 0.2)
    for (const [a, sc, b] of edges)
      for (let q = 0; q < 4; q++) {
        const pt = q < 2 ? vlerp(a, sc, (q + 0.5) / 2) : vlerp(sc, b, (q - 1.5) / 2);
        const out = vnorm(vsub(pt, wrist));
        tongueOfFire(r, pt, out, place([0, 0, 1]), (1.4 + 0.8 * Math.sin(st.ph * 1 + q * 1.9)) * eclipseK * u, 0.4, st.ph + q, coronaMat);
      }
  // The wing arm: a humerus out of a muscle on the back, the elbow knob with a spike, a gold ring on the forearm.
  r.tag = 'wingShoulder' + name;
  r.ell(axisFrame(shoulder, vsub(shoulder, elbow), BU.f), [0, 0, 0], [2.3, 2.1, 2.5], S(0.15));
  r.tag = 'wingArm' + name;
  r.cap(shoulder, elbow, 1.55, 1.25, S(0.45));
  for (let k = 0; k < 3; k++) tubeScutes(r, vlerp(shoulder, elbow, 0.15 + k * 0.28), vlerp(shoulder, elbow, 0.3 + k * 0.28), 1.4, BU.s, 0.65, k % 2 ? SS(0.45) : S(0.45));
  r.ell(axisFrame(elbow, vsub(wrist, elbow), BU.u), [0, 0, 0], [1.3, 1.3, 1.3], SS(0.55));
  r.spike(elbow, vnorm(vadd(vsub(elbow, wrist), vmul(vsub(elbow, shoulder), 0.6))), 1.6, 0.42, bone, 3);
  r.cap(elbow, wrist, 1.25, 1.0, S(0.6));
  for (let k = 0; k < 2; k++) tubeScutes(r, vlerp(elbow, wrist, 0.1 + k * 0.3), vlerp(elbow, wrist, 0.25 + k * 0.3), 1.15, BU.s, 0.55, k % 2 ? SS(0.6) : S(0.6));
  r.tag = 'wingRing' + name;
  const b0 = vlerp(elbow, wrist, 0.8),
    b1 = vlerp(elbow, wrist, 0.9);
  r.cap(b0, b1, 1.22, 1.15, gold);
  r.cap(vlerp(b0, b1, 0.9), vlerp(b0, b1, 1.1), 1.3, 1.3, goldDeep);
  // Wing fingers: ivory bones with a knuckle.
  r.tag = 'wingBone' + name;
  const thin = 0.6 + 0.4 * u;
  tips.forEach((tip, k) => {
    const knuckle = vlerp(wrist, tip, 0.45);
    const b = u > 0.4 ? M(bone, boneDeep, 0.8) : M(boneDeep, boneDeep, 0.8);
    r.cap(wrist, knuckle, (0.66 - k * 0.05) * thin, 0.5 * thin, b);
    r.ell(axisFrame(knuckle, vsub(tip, wrist), BU.u), [0, 0, 0], [0.64 * thin, 0.64 * thin, 0.52 * thin], M(boneDeep, boneDeep, 0.85));
    r.cap(knuckle, tip, 0.5 * thin, 0.18, u > 0.4 ? M(bone, boneDeep, 0.9) : b);
  });
  // The wrist: a knuckle with one hooked thumb claw forward.
  r.tag = 'wingThumb' + name;
  r.ell(axisFrame(wrist, fd, BU.u), [0, 0, 0], [1.05, 1.05, 1.0], S(0.62));
  r.spike(vadd(wrist, vmul(fd, 0.6)), vnorm(vadd(fd, vmul(BU.u, 0.5))), 1.5, 0.36, claw, 3);
  j['wingRoot' + name] = shoulder;
  j['wingElbow' + name] = elbow;
  j['wingWrist' + name] = wrist;
  j['wingTip' + name] = tips[0];
  j['wingTrail' + name] = tips[2];
}
/** On the stone the hand points forward and a little out. */
const FTdir = (BU: F3, s: number): V3 => vnorm([BU.f[0] + BU.s[0] * s * 0.3, BU.f[1] + BU.s[1] * s * 0.3, -0.15]);

/** Mirror spots in the facing frame (forward, right): front-near, back-near, front-far. */
/** Below this share of the rise a mirror is not drawn (fx: a flash where it pops in and out). */
export const MIRROR_POP = 0.25;
export const MIRRORS: [number, number][] = [
  // the order the beam visits them: right and far (beside the sun), right and near (below his head), left and near
  // by the tail (it gets turned) — every leg of the beam stays in sight round the raised wings
  [14.4, -31.8],
  [30, -4],
  [-14, 14],
];
// ---- props: mirrors, egg ----------------------------------------------------------------------------------------
/** A crystal mirror in a bronze ring: a lens standing on edge, facing `face`. `up` 0..1 rises it out of the floor. */
function mirror(r: Rig, base: V3, face: V3, up: number, crack: number, lit: number, j: Record<string, V3>, key: string, turn = 0) {
  r.tag = 'mirror';
  const n0 = vnorm([face[0], face[1], 0]);
  // `turn` (radians) swings it round its stem
  const n: V3 = [n0[0] * Math.cos(turn) - n0[1] * Math.sin(turn), n0[0] * Math.sin(turn) + n0[1] * Math.cos(turn), 0];
  const side = vnorm(vcross([0, 0, 1], n));
  // it grows up out of the hour mark: small and low at first, full size on its stem
  const R = 6 * (0.4 + 0.6 * smooth(up));
  const c = vadd(base, [0, 0, (R * 1.15 + 0.6) + 6.5 * smooth(up)]);
  const ring: V3[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    ring.push(vadd(c, vadd(vmul(side, Math.cos(a) * R), [0, 0, Math.sin(a) * R * 1.15])));
  }
  for (let k = 0; k < 12; k++) r.cap(ring[k], ring[(k + 1) % 12], 0.8, 0.8, k % 3 ? gold : goldDeep);
  // degree ticks on the ring and a sun boss at the top
  for (let k = 0; k < 12; k += 2) r.spike(ring[k], vnorm(vsub(ring[k], c)), 1.3, 0.45, goldDeep, 3);
  r.ell(axisFrame(ring[3], [0, 0, 1], n), [0, 0, 0.9], [1.2, 1.2, 1.2], gold);
  const lens = lit > 0.3 ? crystal : crystalDeep;
  for (let k = 0; k < 12; k++) {
    if (crack > 0 && hash(k, 5) < crack) continue;
    r.poly([c, ring[k], ring[(k + 1) % 12]], lens, 0.1);
  }
  // the stem down into the dial
  r.cap(vadd(c, [0, 0, -R * 1.15]), vadd(base, [0, 0, -1]), 0.8, 1.0, goldDeep);
  j[key] = c;
}
function egg(r: Rig, F: F3, crack: number, open: number, j: Record<string, V3>) {
  r.tag = 'egg';
  const cl: V3 = [0.5, 0, 7.5];
  const c = F.p(...cl);
  // A golden egg like a small sun with a crescent pattern; the top half lifts away when it bursts.
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    const out: V3 = [Math.cos(a), Math.sin(a), 0];
    r.ell(F.at(...vadd(cl, vmul(out, 0.2))).turn(a), [0, 0, -1.6], [5.2, 5.2, 4.6], k % 2 ? shellMat : shellDeep, (q) => q[2] > 0.1);
    if (open < 1) r.ell(F.at(...vadd(vadd(cl, [0, 0, open * 14]), vmul(out, 0.2 + open * 4))).turn(a), [0, 0, 1.4], [4.8, 4.8, 5.4], k % 2 ? shellMat : shellDeep, (q) => q[2] < 0.05);
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
type PoseSample = (anim: string, time: number) => JointPose;
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3, 'idle-f2': 2, turn: 4 };
/** Rig units → painting pixels before the depth scale of the life engine. */
export const portraitScale = 4.6;
/** Rest stance in the feet frame: hind hocks and the wrists on the stone (forward, outward, up). */
export const STANCE = { hock: [-2.8, 4.3, 4.8] as V3, wrist: [11.6, 4.6, 1.1] as V3 };
/** Gait offsets of the four contacts (a lateral walk: left hind, left fore, right hind, right fore). */
const GAIT = { footL: 0, foreL: 0.25, footR: 0.5, foreR: 0.75 };
export function drakeFrame(sample: PoseSample): Creature['frame'] {
  const route = card.life;
  return (anim, t, side, _variant, motion) => {
    const keyed = motion?.techniquePose;
    const pose: JointPose = keyed ? { ...keyed } : sample(anim, t);
    const get = (key: string) => pose[key] ?? 0,
      A = pose;
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
    // In flight he turns his side to us [owner's references 22.11: dragons are seen side on in flight]: from the 3/4
    // ground view the near wing would lie along his body on screen; side on, both wings open as broad sails. The head
    // keeps looking at us (it turns back by the same amount).
    const flyOpen = Math.max(get('wingOpen') + get('wingOpenL'), get('wingOpen') + get('wingOpenR')) + (get('form') > 0.5 ? F2_OPEN : 0);
    const flyTurn = FLY_TURN * smooth(saturate(Math.max(get('hover'), get('jump') - 2) / 4)) * smooth(saturate((flyOpen - 0.3) / 0.5)) * (1 - saturate(get('sleep')));
    const F0 = F3.yaw(route.yaw + (side * Math.PI) / 8),
      F = F0.turn(get('yaw') - flyTurn);
    const form = get('form'),
      sleep = get('sleep'),
      sl = saturate(sleep);
    eclipseLook(form);
    pearlNight = get('pearlDark') > 0.5;
    const ph = clock.turn(1.5);
    const glow = saturate(get('charge') + 0.25 + 0.15 * clock.osc(0.5));
    // The life walk, and the same gait inside a clip (`gait` weight, `gaitT` cycles): each foot stays planted while
    // the body passes over it, so the clip's screen lane must carry him one stride per cycle (poses: walkHome)
    // [owner 22.11: the old trick steps marched on the spot while the body slid].
    const lifeWalk = anim === 'walk';
    const gaitW = lifeWalk ? 1 : saturate(get('gait'));
    const walking = gaitW > 0.001;
    const gait = lifeWalk ? (motion?.gaitPhase ?? t) : get('gaitT');
    const step = (key: keyof typeof GAIT) => {
      if (!walking) return { forward: 0, lift: 0, planted: true };
      const st = strideFoot(gait, GAIT[key], route.stride);
      return { forward: st.forward * gaitW, lift: st.lift * gaitW, planted: st.planted };
    };
    const bob = walking ? 0.35 * gaitW * Math.cos((lifeWalk ? t : gait) * TAU * 2) : 0;
    const breath = period && !walking ? 0.4 * Math.sin(q) : 0;
    // hovering, the body rises on the downstroke and sinks on the upstroke, a little after the wings
    const hover = get('hover') + (eclipseK > 0.5 ? -0.7 * Math.sin(clock.turn(1) - 0.6) : 0);
    const hoverK = saturate(hover / 4);
    // six limbs: he can open the wings standing on four; he rears only when a pose asks for it
    const brace = saturate(get('brace')),
      wrapK = saturate(get('wrap'));
    const rear = get('rear');
    const crouch = get('crouch') + sl * 7.4;
    const hipZ = HIP + get('lift') - crouch + get('jump') + hover + breath * 0.25 + bob;
    // A flip turns round his middle, not round the hips (kit/pet-moves).
    const [pivotX, pivotZ] = pivotLift(get('pitch'), 0, 8);
    // BU: upright at the hips (it follows flips, rolls and spins); Pv: the body axis, level on four, raised when he
    // rears on the hind legs, level again in flight.
    const BU = F.at(get('lean') + pivotX, get('drift'), hipZ + pivotZ)
      .pitch(get('pitch'))
      .roll(get('roll') + (walking ? 0.03 * gaitW * Math.sin((lifeWalk ? t : gait) * TAU) : 0))
      .turn(get('twist'));
    const Pv = BU.pitch(-0.12 * (1 - sl) - rear * 0.95 * (1 - hoverK * 0.7) + get('bodyPitch') + 0.02 * gaitW);
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
      const tuck = Math.max(flipTuck(get('pitch')), saturate(get('tuck')));
      // ---- hind legs: stand on the dial, hang in flight, fold under him asleep, tuck in a flip
      for (const s of [-1, 1]) {
        const name = s < 0 ? 'L' : 'R';
        const st = step(s < 0 ? 'footL' : 'footR');
        const fwd = walking ? st.forward / portraitScale : 0;
        const stand = FT.p(STANCE.hock[0] + fwd + get('stride') * s, s * STANCE.hock[1], STANCE.hock[2] + st.lift * 2.8);
        // in flight the thighs are spread out to the sides [вики: Pterosaur — abducted thighbone, legs spread]
        const hang = BU.p(-4.6 + s * 0.8, s * 4.9, -8.6 + (s > 0 ? 1.0 : 0));
        const curled = FT.p(1.4, s * 4.4, 1.6);
        const air = vadd(stand, FT.v(0.6, 0, get('jump') * 0.85));
        const tucked = BU.p(2.6, s * 4.8, -5.2);
        const rest = vlerp(vlerp(vlerp(vlerp(stand, air, saturate(get('jump') / 3)), hang, hoverK), curled, sl), tucked, tuck);
        const hock = target('foot' + name, rest);
        const point = saturate(get('point') + hoverK * 0.6 + (walking ? st.lift * 0.5 : 0));
        const toeDir = vnorm(vlerp(vlerp(FT.v(0.5, s * 0.08, -1), FT.v(0.25, s * 0.08, -1), point), Pv.v(0.4, s * 0.08, -1), tuck));
        leg(R0, Pv, BU, s, hock, toeDir, j);
        if (walking && st.planted) planted.push('foot' + name);
      }
      // ---- the head: high over the chest on four, higher when he rears; coiled back before a breath
      const chestC = Pv.p(8.0, 0, 0.8);
      const CU = new F3(chestC, BU.f, BU.s, BU.u);
      const coil = get('coil');
      const neckLagN = 0.6 * (lag(neckLag, 'nod') - get('nod')) + 0.08 * (lagJump(neckLag) - lagJump(A));
      const reachN = get('neckReach'),
        rise = get('neckUp');
      const rearK = saturate(rear);
      const hx0 = lerp(8.8, 6.0, rearK) - coil * 4.6 + reachN,
        hz0 = lerp(13.4, 12.6, rearK) - coil * 3.4 + rise + neckLagN;
      const awake = CU.at(hx0, 0, hz0)
        .turn(0.3 + get('gaze') + flyTurn * 0.8)
        .roll(get('tilt'))
        .pitch(0.04 + get('nod') + coil * 0.35);
      // asleep the head lies on the dial in front of the near wrist, turned to us, the eyes shut
      const asleepH = FT.at(17.4, 6.2, 2.5).turn(1.35).roll(-0.12).pitch(0.08);
      const Hd = (sl > 0 ? blendFrame(awake, asleepH, smooth(sl)) : awake).scale(HEAD_SCALE);
      // ---- the one line: crescent → tail → pelvis → belly → chest → neck → skull
      const sway = 0.12 * clock.osc(0.33) + get('tailSway');
      const lagT = lag(tailLag, 'tailSway') - get('tailSway') + 0.5 * (lag(tailLag, 'twist') - get('twist')) + 0.05 * (lagJump(tailLag) - lagJump(A));
      const curl = get('tailCurl') + hoverK * 0.3,
        lift = get('tailLift');
      const root = Pv.p(-3.8, 0, 0.1),
        r1 = Pv.p(-7.8, sway * 1.2, -0.7);
      const wsk = (k: number) => (sway + lagT * k) * k * (1 - sl * 0.8);
      const TW = [3.4, 2.95, 2.45, 2.0, 1.6, 1.25, 0.95, 0.7, 0.48];
      // in flight the tail streams back instead of lying on the stone
      const flyK = Math.max(hoverK, saturate(get('jump') / 4));
      // In a flip the tail turns with the body, a little behind it [owner 22.11: it stayed level and broke at the hips].
      const TF = get('pitch') || lag(tailLag, 'pitch') ? FT.pitch(lerp(get('pitch'), lag(tailLag, 'pitch'), 0.45)) : FT;
      const tailPt = (n: number, x: number, y: number, z: number, wx: number, wy: number, wz: number, rad: number): V3 => {
        const k = n / 7;
        const p = vadd(r1, TF.v(lerp(x * (1 + 0.15 * flyK), wx, sl), lerp(y, wy, sl) + wsk(k) * 7, lerp(z * (1 - 0.7 * flyK), wz, sl) + lift * k * k * 8 + curl * k * k * 6));
        return [p[0], p[1], Math.max(p[2], rad + 0.25)];
      };
      const tailPts: V3[] = [
        tailPt(1, -3.74, 0.42, -4.2, -3.6, 1.8, -3.4, TW[2]),
        tailPt(2, -8.16, 1.36, -8.6, -7.4, 5.4, -4.6, TW[3]),
        tailPt(3, -12.58, 2.38, -11, -8.6, 10.6, -4.8, TW[4]),
        tailPt(4, -16.83, 3.31, -11.6, -5.6, 15.6, -4.8, TW[5]),
        tailPt(5, -20.06, 3.91, -10.6, 0.2, 18.2, -4.7, TW[6]),
        tailPt(6, -21.76, 4.25, -8.2, 6.4, 18.0, -4.4, TW[7]),
        tailPt(7, -21.93, 4.42, -4.6, 11.2, 15.8, -3.4, TW[8]),
      ];
      const neckBase = Pv.p(11.2, 0, 2.6);
      const headBase = Hd.p(-2.6, 0, -1.4);
      const n1 = vadd(vlerp(neckBase, headBase, 0.34), CU.v(1.5 - coil * 1.4 + 2.2 * sl, 0, 0.4));
      const n2 = vadd(vlerp(neckBase, headBase, 0.7), CU.v(-1.2 - coil * 0.8 + 1.2 * sl, 0, 0.6 - 0.8 * sl));
      const knots: Knot[] = [
        ...tailPts
          .slice()
          .reverse()
          .map((p, k) => ({ p, w: TW[8 - k], h: TW[8 - k], d: 1 - k * 0.075, tag: 'tail' })),
        { p: r1, w: TW[1], h: TW[1] * 0.98, d: 0.46, tag: 'tail' },
        { p: root, w: TW[0], h: TW[0] * 0.98, d: 0.4, tag: 'pelvis' },
        { p: Pv.p(-0.6, 0, 0.2), w: 3.9, h: 3.75, d: 0.32, tag: 'pelvis' },
        { p: Pv.p(3.6, 0, -0.1), w: 4.15 + breath * 0.2, h: 4.35 + breath * 0.15, d: 0.18, tag: 'belly' },
        { p: chestC, w: 4.6 + breath * 0.25, h: 5.2 + breath * 0.2, d: 0.05, tag: 'chest' },
        { p: neckBase, w: 3.5, h: 3.8, d: 0.12, tag: 'neck' },
        { p: n1, w: 2.9, h: 3.05, d: 0.3, tag: 'neck' },
        { p: n2, w: 2.5, h: 2.6, d: 0.5, tag: 'neck' },
        { p: headBase, w: 2.3, h: 2.4, d: 0.68, tag: 'neck' },
      ];
      const pelvisKnot = 9;
      const line = bodyLine(R0, knots, pelvisKnot, Pv.u);
      const tipI = 0;
      crescent(R0, line.P[tipI], vnorm(vsub(line.P[tipI], line.P[tipI + 2])), FT.s, j);
      j.tailMid = line.P[Math.round(LINE_N * 0.22)];
      j.body = Pv.p(3.6, 0, -0.1);
      j.neck = n1;
      // the pearl on the front of the chest, facing forward and down
      const chestI = Math.round((11 / (knots.length - 1)) * LINE_N);
      const CF = line.Fr[chestI];
      const nOut = vnorm(CF.v(0.55, 0, -0.84));
      pearl(R0, frameF(vadd(chestC, vmul(nOut, line.H[chestI] * 0.94)), nOut, CF.u), glow, ph, j);
      // ---- the head
      const fire = get('fire');
      const barbel = F.v(
        0.6 * (lag(tailLag, 'lean') - get('lean')) + 0.4 * (lag(tailLag, 'nod') - get('nod')) * 6,
        4 * (lag(tailLag, 'twist') - get('twist')) + 3 * (lag(tailLag, 'gaze') - get('gaze')) + 0.35 * clock.osc(0.33, 1),
        0.5 * (lagJump(tailLag) - lagJump(A)),
      );
      head(R0, Hd, j, {
        barbel,
        blink: Math.max(get('blink'), sleep > 0.6 ? 1 : 0, period ? blinkAt(((q % TAU) + TAU) % TAU) : 0),
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
      // ---- wings: on the stone when he walks on four, folded in front of the chest when he rears, spread in flight
      // the eclipse form flies with the wings fully spread (half-open bent the elbows — owner 22.11)
      const openBase = get('wingOpen') + (eclipseK > 0.5 ? F2_OPEN : 0) * (1 - sl);
      const beatBase = get('wingBeat') + (eclipseK > 0.5 ? HOVER_BEAT * Math.sin(clock.turn(1)) : 0.03 * clock.osc(0.33));
      const lagBeat = 0.5 * (lag(wingLag, 'jump') - get('jump')) * 0.05 + 0.6 * (lag(wingLag, 'twist') - get('twist'));
      // The upstroke flexes the hand back at the wrist and the arm stays straight [owner 22.11: no elbow bend in
      // flight]; the trailing fingers lag the beat both ways, so the membrane billows behind the straight leading edge.
      const prev1 = previous(1),
        clockPrev = clipClock(clips[anim]?.seconds ?? 2, Math.max(0, t - 1 / 24));
      const beatPrevBase = lag(prev1, 'wingBeat') + (eclipseK > 0.5 ? HOVER_BEAT * Math.sin(clockPrev.turn(1)) : 0.03 * clockPrev.osc(0.33));
      const airborne = (1 - hoverK) * (1 - saturate(get('jump') / 2.5)) * (1 - tuck) * (1 - saturate(get('lift') / 4));
      for (const s of [-1, 1]) {
        const k = s < 0 ? 'L' : 'R';
        const open = saturate(openBase + get('wingOpen' + k));
        const beat = beatBase + get('wingBeat' + k) + s * lagBeat * 0.3;
        const beatVel = beat - (beatPrevBase + lag(prev1, 'wingBeat' + k) + s * lagBeat * 0.3);
        const upK = saturate(beatVel * 3) * smooth(open);
        const sweep = get('wingSweep') + get('wingSweep' + k);
        // the wing grows out of the back, over the shoulder blade
        // high on the back near the spine, behind the shoulders, so seen from the front the wing rises from behind
        // him and never reads as a second arm lifted from the shoulder
        const shoulder = Pv.p(5.0, s * 1.5, 5.8);
        const wrapWrist = vadd(shoulder, BU.v(6.5, s * 3.0, 4.5));
        // mantling: the wrists up and out, the fingers arch back over him like a hood
        const hoodWrist = vadd(shoulder, BU.v(1.5, s * 7.5, 7.5));
        // the wing whose side faces the viewer (0, 0.8, 0.6 — towards the camera)
        const { near, edge } = wingEdge(BU, s);
        const own = vlerp(vlerp(wingWrist(BU, Pv, shoulder, s, open, beat, sweep, near, edge, beatVel), hoodWrist, brace * (1 - smooth(open) * 0.5)), wrapWrist, smooth(wrapK));
        wing(R0, BU, Pv, shoulder, s, {
          open,
          beat,
          sweep,
          ph: ph + s,
          glow,
          heat: get('wingHeat'),
          wrap: wrapK,
          mantle: brace,
          air: target('wing' + k, own),
          flex: upK,
          tipLag: -Math.max(-0.22, Math.min(0.22, beatVel * 0.5)),
          near,
          edge,
          vel: beatVel,
        }, j);
      }
      // ---- forelegs: on the stone when he stands or walks; at the chest when he rears; tucked under him in flight;
      // a hand goal (catch, hold, reach) lifts the paw in proportion to its weight
      for (const s of [-1, 1]) {
        const k = s < 0 ? 'L' : 'R';
        const st = step(s < 0 ? 'foreL' : 'foreR');
        const fwd = walking ? st.forward / portraitScale : 0;
        const foot = vlerp(
          FT.p(STANCE.wrist[0] + fwd - get('stride') * s * 0.6, s * STANCE.wrist[1], STANCE.wrist[2] + st.lift * 2.4),
          FT.p(12.2, s * 5.2, 1.1),
          sl,
        );
        const handW = Math.min(1, A['goal.hand' + k + '.weight'] ?? 0);
        // `vault`: the hind legs throw the body forward over the planted paws, which give the last push
        const ground = Math.max(saturate(1 - 2.2 * rearK) * airborne * (1 - handW), Math.max(saturate(get('vault')), brace) * (1 - handW));
        // in the air: reared, the paws held up at the sides of the chest, claws forward (the belly and the pearl
        // between them); in flight tucked up against the chest
        // (the paw about two thirds of the leg's length from the shoulder: a paw near the shoulder folds the leg
        // like a chicken wing and throws the elbow out)
        const atChest = Pv.p(16.0, s * 5.6, -5.0);
        const tucked = Pv.p(13.5, s * 4.4, -7.5);
        const air = target('hand' + k, vlerp(atChest, tucked, Math.max(hoverK, tuck, saturate(get('jump') / 3))));
        foreleg(R0, Pv, BU, s, vlerp(air, target('fore' + k, foot), ground), { fist: 0.15 + get('fist' + k), ground }, j);
        if (walking && st.planted && ground > 0.9) planted.push('fore' + k);
      }
      // Mirrors of the observatory: they stand still in the world while he turns among them.
      // under a quarter risen it would be a crumpled lump on the stone: it pops in (and out) in a flash of the fx
      if (get('mirrors') > MIRROR_POP) {
        const spots: V3[] = MIRRORS.map(([x, y]) => F0.p(x, y, 0));
        const viewer = F0.v(0.57, 0.82, 0);
        spots.forEach((at, k) => mirror(R0, at, vadd(vnorm(vsub(F0.p(0, 0, 0), at)), vmul(viewer, 1.3)), get('mirrors'), get('mirrorCrack'), get('mirrorLit' + k), j, 'mirror' + k, get('mirrorTurn' + k) * -2.6));
      }
    } else if (peek) {
      // Peeking from above the frame: only the neck and the upside-down head hang down into the picture.
      const hang = get('peekHang');
      const top = F.p(4.0, 0, PEEK_TOP);
      // only the head and a short length of neck come down below the top of the frame
      // [owner 22.11: the neck was too long] the head hangs just under the frame on a short bend of neck
      const Hd = F.at(4.0, 0, PEEK_TOP - hang * 8).pitch(Math.PI * 0.92).roll(get('tilt')).turn(get('gaze')).scale(HEAD_SCALE);
      front!.tag = 'neck';
      const pts: V3[] = [F.p(4.0, 0, PEEK_TOP + 10), top, F.p(4.3, 0, PEEK_TOP - hang * 3), Hd.p(-2.6, 0, -1.4)];
      for (let k = 0; k < 14; k++) front!.cap(catmull(pts, k / 14), catmull(pts, (k + 1) / 14), 2.9 - k * 0.04, 2.8 - k * 0.04, S(0.5));
      for (let k = 0; k < 6; k++) tubeScutes(front!, catmull(pts, 0.08 + k * 0.14), catmull(pts, 0.16 + k * 0.14), 2.7, F.s, 0.6, k % 2 ? SS(0.5) : S(0.5));
      head(front!, Hd, j, { barbel: F.v(0, 0, 0), blink: get('blink'), lid: 0, snarl: get('snarl'), roar: 0, lookX: get('lookX'), lookY: 0, wide: get('wide'), fire: 0, flame: 0, ph, fold: 0 });
    }
    // the egg is big enough to hold him curled up (he comes out at 0.7 of his size)
    if (get('egg') > 0.5) egg(r, F0.roll(get('eggRock')).scale(EGG_SCALE), get('eggCrack'), get('eggOpen'), j);
    j.body = j.body ?? F.p(3.6, 0, HIP);
    j.head = j.head ?? F.p(15, 0, HIP + 12);
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
    for (const [k, v] of Object.entries(j)) debugWorld[k] = [...v];
    debugWorld['F.f'] = [...FT.f];
    debugWorld['F.s'] = [...FT.s];
    const sc = portraitScale * (1 + 0.12 * eclipseK) * (1 + get('grow'));
    scaleFigure(r, j, sc);
    if (front) scaleFigure(front, {}, sc);
    const frame: BodyFrame = projectFigure(r, FIGURE, ANCHOR, j, '#120a08', 4.4, true);
    const paint = { outline: ink, inner: 4.4 };
    if (front) {
      const pad = 240,
        size = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      // An earlier pose asked only for its sockets skips both pictures; the sockets move exactly as with them.
      if (!pointsOnlyActive()) {
        const body = renderRig(r, size, size, ...anchor, paint);
        frame.px = body.p;
        frame.lit = body.lit;
        frame.eye = body.eye;
      }
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      if (!pointsOnlyActive()) frame.over = renderRig(front, size, size, ...anchor, paint).p;
    }
    const up = Math.max(0, hipZ - HIP);
    frame.groundShadow =
      get('hidden') > 0.5 || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (FIGURE * 0.16) / (1 + 0.03 * up), opacity: 0.55 / (1 + 0.05 * up), reflectionOpacity: front ? 0 : 1 };
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
/** World sockets of the last frame, before scaling (debugging). */
export const debugWorld: Record<string, V3> = {};
/** The head is drawn larger than the body template would give it: a dragon's head, not a lizard's. */
const HEAD_SCALE = 1.15;
/** Height of the frame top above the stone for the peek, rig units. */
const PEEK_TOP = 70;
const EGG_SCALE = 1.8;
/** The figure's own canvas and the anchor of the floor point in it, pixels. */
const FIGURE = 460,
  ANCHOR: [number, number] = [230, 400];
/** Blend two frames (positions and axes), for lying down. */
function blendFrame(a: F3, b: F3, u: number): F3 {
  const f = vnorm(vlerp(a.f, b.f, u)),
    up = vnorm(vlerp(a.u, b.u, u));
  return frameF(vlerp(a.o, b.o, u), f, up);
}
/** For the effects file: the corona and sun ramps. */
export const ramps = { sun: sunT, corona: coronaT };
export const eclipseOf = (form: number) => smooth(saturate((form - 0.05) / 0.9));
void mixc;
void hash;
