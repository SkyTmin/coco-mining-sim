// Пончик и Шустрик — two cartoon characters in one rig, drawn the way the 1940s theatrical cartoons drew: flat bands
// of colour (shadow, base, light), a thick dark ink outline and dark inner lines, huge eyes with whites and big pupils,
// movable brows, a mouth that changes shape.
// Пончик: a giant-panda cub standing on two short legs — a round head nearly half his height with chubby cheeks, black
// teardrop patches round the eyes slanting down and out, round black ears, a button nose on a white muzzle; a round
// white belly, a black band over the shoulders running down the arms, short black legs with pink pads, a tuft of a
// tail. Шустрик: a little golden snub-nosed monkey — golden fur with a paler mane, a sky-blue face in a white rim, an
// upturned button nose, big sly eyes, pale ears, thin limbs with dark hands, a long tail curled like a question mark
// with a tuft. He sits on Пончик's head in the everyday clips (`mOn` 1) and goes about on his own in the tricks
// (`mX/mY/mZ` in the feet frame). Squash and stretch of Пончик alone (`sqx/sqy/sqz`, world axes, about his feet) — the
// monkey keeps his shape. Fur: short tufts lying along the fur over every furry part; over the surface they vanish in
// the same tone, on the silhouette they make the plush, jagged edge of a cub's coat.
// The face always turns a little toward the viewer (HEAD_TURN, HEAD_PITCH): in the 3/4 view from above a face turned
// with the body showed one eye and the crown [22.11, first still].
import { readCreatureCard } from '../bodies/card-data';
import { goalAt } from '../bodies/goals';
import { clipClock } from '../kit/clock';
import { hash, hx, ik, tn, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { F3, Rig, renderRig, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type Tones, type V3 } from '../rig/f15-rig';
import { pointsOnlyActive, projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import type { BodyFrame, Creature } from '../types';
import { clips } from './bun_panda-poses';

const card = readCreatureCard('bun_panda');
export type PoseSample = (anim: string, t: number) => JointPose;

// ---- palette: three bands each (shadow, base, light); the renderer's 4 bands get base twice --------------------------
const cel = (shadow: string, base: string, light: string): Tones => tn(shadow, base, base, light);
const INK = hx('#1e1620') as RGBA;
const T = {
  white: cel('#b6adc2', '#f3eee6', '#ffffff'),
  black: cel('#15121b', '#2c2736', '#4c4560'),
  earIn: cel('#3a3446', '#5a5268', '#7a7090'),
  pink: cel('#c0627a', '#ec96a4', '#ffc6ca'),
  blush: cel('#e07a8a', '#f4a0ac', '#ffc6ca'),
  nose: cel('#0c0a10', '#1e1a26', '#6a6478'),
  eyeW: cel('#c6c2d6', '#ffffff', '#ffffff'),
  pupil: cel('#050408', '#100c16', '#2a2434'),
  mouth: cel('#3a0e18', '#5c1a26', '#7a2834'),
  tongue: cel('#b03e58', '#e8687e', '#ff9aa8'),
  tooth: cel('#c6bfb6', '#fbf6ee', '#ffffff'),
  claw: cel('#8a8296', '#d8d2dc', '#ffffff'),
  bamboo: cel('#2c5a22', '#5a9a3a', '#a0d470'),
  node: cel('#1e4018', '#3a6e28', '#6a9a48'),
  leaf: cel('#21521e', '#4a9832', '#8ad05a'),
  bite: cel('#b8c890', '#e8f0c0', '#ffffe0'),
  bun: cel('#c8b49a', '#f6ecdc', '#ffffff'),
  gold: cel('#a4560f', '#e8982a', '#ffd27a'),
  mane: cel('#cc8424', '#ffc458', '#fff0b8'),
  face: cel('#4378c0', '#78b2ec', '#c0e2ff'),
  rim: cel('#c8c0b0', '#f6f0e4', '#ffffff'),
  hand: cel('#26263a', '#48485e', '#7a7a92'),
  flour: cel('#c4c0ca', '#f2f0ee', '#ffffff'),
  iron: cel('#24242e', '#565668', '#a4a4bc'),
  ironDark: cel('#14141c', '#30303e', '#5a5a6e'),
  spoon: cel('#6e4018', '#b8783a', '#f0c070'),
  mitt: cel('#7c1a22', '#cc3c38', '#ff8a6a'),
  towel: cel('#2e5a8a', '#5490c8', '#9ccaf2'),
  heat: cel('#b8283a', '#e8505a', '#ff8a8a'),
  honey: cel('#b8700c', '#f0a820', '#ffe070'),
  jar: cel('#6a3418', '#a85a2c', '#dc8a4a'),
  welt: cel('#b03a48', '#e86a74', '#ffa0a0'),
  bump: cel('#d8a0b0', '#fbe4e8', '#ffffff'),
  egg: cel('#b8b0c4', '#f6f2ea', '#ffffff'),
  eggGold: cel('#b87818', '#f0c040', '#fff0a0'),
  chop: cel('#8a6430', '#d8b070', '#fff0c8'),
  lid: cel('#7a5a20', '#c0963c', '#f0d070'),
};
const flat = (tones: Tones, extra: Partial<Mat> = {}): Mat => ({ T: tones, ...extra });
const pickBand = (tones: Tones, l: number): RGBA => (l > 0.78 ? tones[3] : l > -0.02 ? tones[1] : tones[0]);
const sat = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (x: number) => x * x * (3 - 2 * x);
const INKMAT = flat(cel('#1e1620', '#1e1620', '#1e1620'), { soft: true });

/** The black band of the torso: over the shoulders and round the back, the chest and belly stay white. */
const torsoBlack = (q: V3) => q[2] > 0.2 - 0.22 * q[0] && !(q[0] > 0.5 && q[2] < 0.7);
/** Red with anger rising from the feet up: the torso fills over heat 0…0.5, the head over 0.5…1. */
const redUpTo = (q: V3, level: number) => level > 0.02 && (q[2] + 1) / 2 < level * 1.08 + 0.04 * Math.sin(q[1] * 9 + q[0] * 5);
function torsoMat(heat: number): Mat {
  return { T: T.white, pat: (q, l) => pickBand(torsoBlack(q) ? T.black : redUpTo(q, heat * 2) ? T.heat : T.white, l) };
}
/** Head patches: centres on the unit sphere of the head (az ±PATCH_AZ, el PATCH_EL). */
const PATCH_AZ = 0.44,
  PATCH_EL = 0.08;
function inPatch(q: V3): boolean {
  if (q[0] < 0.25) return false;
  for (const s of [-1, 1]) {
    const az = Math.atan2(q[1] * s, q[0]) - PATCH_AZ,
      el = Math.asin(Math.max(-1, Math.min(1, q[2]))) - PATCH_EL;
    // a teardrop slanting down and out: rotate, wider at the bottom
    const th = -0.6;
    const a = az * Math.cos(th) - el * Math.sin(th),
      b = az * Math.sin(th) + el * Math.cos(th);
    const rb = b < 0 ? 0.48 : 0.34;
    if ((a / 0.3) ** 2 + (b / rb) ** 2 < 1) return true;
  }
  return false;
}
function headMat(heat: number): Mat {
  return { T: T.white, pat: (q, l) => pickBand(inPatch(q) ? T.black : redUpTo(q, heat * 2 - 1) ? T.heat : T.white, l) };
}
const cheekMat = (heat: number): Mat => ({
  T: T.white,
  pat: (q, l) => pickBand(q[0] > 0.45 && q[2] > -0.25 && q[2] < 0.55 ? T.blush : heat > 0.75 ? T.heat : T.white, l),
});
/** A foot: black, the pink pad and three toe beans underneath (seen when he lies or kicks). */
const footMat: Mat = {
  T: T.black,
  pat(q, l) {
    if (q[2] < -0.4) {
      if (q[0] < 0.4 && Math.abs(q[1]) < 0.62) return pickBand(T.pink, l);
      for (const k of [-0.5, 0, 0.5]) if ((q[0] - 0.7) ** 2 / 0.02 + (q[1] - k) ** 2 / 0.03 < 1) return pickBand(T.pink, l);
    }
    return null;
  },
};
/** Golden fur with darker strands on the mane. */
const maneMat: Mat = {
  T: T.mane,
  pat(q, l) {
    const strand = Math.sin(Math.atan2(q[1], q[0]) * 9 + q[2] * 4) > 0.6;
    return strand ? pickBand(T.gold, l + 0.2) : null;
  },
};
/** The towel cape: blue with white stripes. */
const towelMat: Mat = {
  T: T.towel,
  pat(q, l) {
    const v = (((q[2] + 40) % 6) + 6) % 6;
    return v < 1 ? pickBand(T.rim, l) : null;
  },
};

// ---- small builders -----------------------------------------------------------------------------------------------
/** A frame from an origin, a forward direction and an up hint (s = right, u = up, like F3.yaw). */
function frameF(o: V3, fwd: V3, upHint: V3): F3 {
  const f = vnorm(fwd);
  let s = vcross(upHint, f);
  if (vlen(s) < 1e-4) s = vcross([0, 0, 1], f);
  s = vnorm(s);
  const u = vnorm(vcross(f, s));
  return new F3(o, f, s, u);
}
function blendFrame(a: F3, b: F3, u: number): F3 {
  if (u <= 0) return a;
  if (u >= 1) return b;
  return frameF(vlerp(a.o, b.o, u), vlerp(a.f, b.f, u), vlerp(a.u, b.u, u));
}
/** Scale the primitives added since `from` along world axes about `o` (Пончик's squash and stretch, flattening). */
function deform(r: Rig, from: number, o: V3, k: V3) {
  if (k[0] === 1 && k[1] === 1 && k[2] === 1) return;
  const P = (v: V3): V3 => [o[0] + (v[0] - o[0]) * k[0], o[1] + (v[1] - o[1]) * k[1], o[2] + (v[2] - o[2]) * k[2]];
  const D = (v: V3): V3 => [v[0] * k[0], v[1] * k[1], v[2] * k[2]];
  const mean = Math.cbrt(k[0] * k[1] * k[2]);
  for (let i = from; i < r.prims.length; i++) {
    const p = r.prims[i] as any;
    if (p.k === 0) {
      p.c = P(p.c);
      p.a = [D(p.a[0]), D(p.a[1]), D(p.a[2])];
    } else if (p.k === 1) {
      p.a = P(p.a);
      p.b = P(p.b);
      p.r0 *= mean;
      p.r1 *= mean;
    } else if (p.k === 2) p.pts = p.pts.map(P);
    else if (p.k === 3) p.p = P(p.p);
    else {
      p.a = P(p.a);
      p.b = P(p.b);
    }
  }
}
/** A curve of ink through points (a drawn line on the face). */
function inkCurve(r: Rig, pts: V3[], w: number) {
  for (let i = 1; i < pts.length; i++) r.cap(pts[i - 1], pts[i], w, w, INKMAT);
}
/** Point and outward normal on an ellipsoid (frame F, radii R) at a unit-sphere direction given by azimuth (round the
 * frame's up, 0 = forward, + = right) and elevation. */
function onEll(F: F3, R: V3, az: number, el: number) {
  const d: V3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  return { p: F.p(R[0] * d[0], R[1] * d[1], R[2] * d[2]), n: vnorm(F.v(d[0] / R[0], d[1] / R[1], d[2] / R[2])), d };
}
/** Fur tufts over an ellipsoid: short flat spikes lying along the fur (down and back), `keep(d)` picks the region and
 * `mat(d)` the colour. Deterministic: golden-angle points. */
function fuzz(r: Rig, F: F3, R: V3, n: number, len: number, w: number, seed: number, mat: (d: V3) => Mat | null, lie: V3 = [-0.3, 0, -1]) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const down = vnorm(F.v(...lie));
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n;
    const rr = Math.sqrt(1 - z * z);
    const a = i * ga + seed;
    const d: V3 = [rr * Math.cos(a), rr * Math.sin(a), z];
    const m = mat(d);
    if (!m) continue;
    const p = F.p(R[0] * d[0], R[1] * d[1], R[2] * d[2]);
    const nrm = vnorm(F.v(d[0] / R[0], d[1] / R[1], d[2] / R[2]));
    // only near the silhouette: over the surface a tuft only dirtied the flat tone with ink specks [22.11]
    const rim = rimK(nrm);
    if (rim <= 0) continue;
    // lie along the surface: the fur direction minus its normal part, then a little outward
    let dir = vsub(down, vmul(nrm, vdot(down, nrm)));
    if (vlen(dir) < 0.2) dir = vsub(F.f, vmul(nrm, vdot(F.f, nrm)));
    const jit = hash(i, seed * 7 + 3) - 0.5;
    dir = vnorm(vadd(vadd(vnorm(dir), vmul(nrm, 0.55)), vmul(F.s, jit * 0.5)));
    r.spike(vsub(p, vmul(nrm, 0.25 * len)), dir, len * (0.8 + 0.4 * hash(i, seed)) * rim, w * (0.6 + 0.4 * rim), m, 3, a);
  }
}
/** Toward the viewer (depth grows along it): tufts live where the surface turns away from it. */
const VIEW = vnorm([0, 0.8, 0.6]);
const rimK = (n: V3) => smooth(sat(1 - Math.abs(vdot(n, VIEW)) / 0.5));
/** Tufts along a capsule (a limb): rings of spikes lying toward the far end. */
function fuzzCap(r: Rig, a: V3, b: V3, rad: number, rings: number, per: number, len: number, w: number, m: Mat, seed: number) {
  const ax = vnorm(vsub(b, a));
  const ref: V3 = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const e1 = vnorm(vcross(ax, ref)),
    e2 = vcross(ax, e1);
  for (let k = 0; k < rings; k++) {
    const u = (k + 0.5) / rings;
    const c = vlerp(a, b, u);
    for (let i = 0; i < per; i++) {
      const ang = ((i + (k % 2) * 0.5) / per) * TAU + seed;
      const nrm = vadd(vmul(e1, Math.cos(ang)), vmul(e2, Math.sin(ang)));
      const rim = rimK(nrm);
      if (rim <= 0) continue;
      const p = vadd(c, vmul(nrm, rad * 0.85));
      r.spike(p, vnorm(vadd(ax, vmul(nrm, 0.6))), len * rim, w * (0.6 + 0.4 * rim), m, 3, ang);
    }
  }
}
type EyeState = { lx: number; ly: number; lid: number; squint: number; pop: number; dizzy: number; lidMat: Mat; spin: number };
/** A cartoon eye: the white, the pupil (looks by `lx`, `ly`), a glint, an upper lid closing from the top (`lid`), a
 * lower lid (`squint`), popped out (`pop`), or dizzy spirals instead of the pupil (`dizzy`). E: f out of the face,
 * s to the side, u up; the white sits half sunk in the face. */
function eye(r: Rig, E: F3, w: number, h: number, st: EyeState) {
  const k = 1 + st.pop;
  const Ep = E.at(st.pop * 1.4 * w, 0, st.pop * 0.3 * h);
  if (st.lid > 0.92) {
    // a closed eye: a happy arc of ink
    inkCurve(r, [-1, -0.5, 0, 0.5, 1].map((u) => Ep.p(0.42 * w, u * w * 0.95, -Math.cos(u * 1.4) * h * 0.3 + h * 0.05)), 0.24 * w);
    return Ep.o;
  }
  r.ell(Ep, [0, 0, 0], [0.5 * w * k, w * k, h * k], flat(T.eyeW));
  if (st.dizzy > 0.5) {
    const pts: V3[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = st.spin + i * 0.75,
        rr = (i / 16) * 0.8;
      pts.push(Ep.p(0.55 * w * k, Math.cos(a) * rr * w * k, Math.sin(a) * rr * h * k));
    }
    inkCurve(r, pts, 0.13 * w);
  } else {
    const px = st.lx * 0.42 * w,
      py = st.ly * 0.4 * h;
    const P = Ep.at(0.4 * w * k, px * k, py * k);
    r.ell(P, [0, 0, 0], [0.2 * w * k, 0.52 * w * k, 0.62 * h * k], flat(T.pupil));
    r.dot(P.p(0.25 * w, -0.2 * w, 0.3 * h), [255, 255, 255, 255], 0, 0.3 * w * k);
  }
  if (st.lid > 0.02) {
    const cutAt = 1 - 2 * st.lid;
    r.ell(Ep, [0.06 * w, 0, 0], [0.56 * w * k, 1.06 * w * k, 1.06 * h * k], st.lidMat, (q) => q[2] < cutAt);
    inkCurve(r, [-0.95, -0.5, 0, 0.5, 0.95].map((u) => Ep.p(0.6 * w * k, u * w * k, cutAt * h * k * Math.sqrt(1 - u * u * 0.85))), 0.12 * w);
  }
  if (st.squint > 0.02) {
    const cutAt = -1 + 2 * st.squint;
    r.ell(Ep, [0.06 * w, 0, 0], [0.56 * w * k, 1.06 * w * k, 1.06 * h * k], st.lidMat, (q) => q[2] > cutAt);
  }
  return Ep.o;
}
/** A flat leaf: base, two edges, tip (a poly in the plane of `side`). */
function leaf(r: Rig, base: V3, dir: V3, side: V3, L: number, W: number, m: Mat) {
  const d = vnorm(dir),
    s = vnorm(side);
  const mid = vadd(base, vmul(d, L * 0.45));
  r.poly([base, vadd(mid, vmul(s, W)), vadd(base, vmul(d, L)), vadd(mid, vmul(s, -W))], m);
  r.line(base, vadd(base, vmul(d, L * 0.8)), T.leaf[0]);
}

// ---- Пончик ------------------------------------------------------------------------------------------------------
/** Height of the belly centre above the floor at rest, rig units. */
export const BODY_Z = 10;
const BELLY: V3 = [6.9, 7.9, 7.7];
const HEAD: V3 = [7.6, 9.4, 8.2];
const HEAD_PITCH = -0.2;
/** How far to turn the head toward the viewer from a frame's facing: a share of the angle, capped. */
function towardViewer(F: F3, share: number, cap: number) {
  let d = Math.PI / 2 - Math.atan2(F.f[1], F.f[0]);
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.max(-cap, Math.min(cap, d * share));
}
const SHOULDER: V3 = [0.4, 6.5, 4.6];
const HIP: V3 = [0.6, 4.1, -5.0];
const UPPER = 4.1,
  FORE = 3.9,
  THIGH = 2.6,
  SHIN = 2.5;
/** Rest hand and foot targets in the feet frame (forward, right, up). */
export const REST = { hand: [2.6, 8.4, 8.6] as V3, foot: [1.3, 4.4, 0.9] as V3 };

/** `to`, pulled back toward `from` so it is no further than `max` (a limb's reach). */
function within(from: V3, to: V3, max: number): V3 {
  const d = vsub(to, from),
    L = vlen(d);
  return L > max ? vadd(from, vmul(d, max / L)) : to;
}
interface PandaOut {
  Hd: F3;
  R: F3;
}
function panda(r: Rig, F: F3, FT: F3, A: JointPose, j: Record<string, V3>, ctx: { gait: number; gaitW: number; t: number; spin: number; breath: number; planted: string[] }): PandaOut {
  const a = (k: string) => A[k] ?? 0;
  const knight = a('form') > 0.5;
  const heat = a('heat');
  const start = r.prims.length;
  const white = flat(T.white),
    black = flat(T.black);
  // ---- the body frame: the belly ball, pivoting round its centre
  const walking = ctx.gaitW > 0.001;
  const step = (off: number) => {
    if (!walking) return { forward: 0, lift: 0, planted: true };
    const st = strideFoot(ctx.gait, off, card.life.stride / portraitScale);
    return { forward: st.forward * ctx.gaitW, lift: st.lift * ctx.gaitW, planted: st.planted };
  };
  const bob = walking ? 0.5 * ctx.gaitW * Math.abs(Math.sin(ctx.gait * TAU)) : 0;
  const sit = a('sit'),
    crouch = a('crouch');
  const bodyZ = BODY_Z - crouch + a('jump') + a('lift') + bob + ctx.breath * 0.15 - sit * 4.2;
  const R = F.at(a('lean') + sit * -1.0, a('drift'), bodyZ)
    .pitch(a('pitch') - sit * 0.22)
    .roll(a('roll') + (walking ? 0.1 * ctx.gaitW * Math.sin(ctx.gait * TAU) : 0))
    .turn(a('twist'));
  // ---- legs (planted feet stay on the floor; in the air or lying they follow the body)
  const plant = 1 - sat(a('air'));
  // flat-out run: the legs become a blurred wheel of six legs under him (the 1940s cartoon gag)
  if (a('wheel') > 0.5) {
    const hub = R.p(0.8, 0, -6.4);
    const ph = ctx.t * TAU * 5;
    for (let i = 0; i < 6; i++) {
      const ang = ph + (i * TAU) / 6;
      const end = vadd(hub, R.v(Math.cos(ang) * 4.6, (i % 2 ? 1 : -1) * 2.6, Math.sin(ang) * 4.6));
      r.tag = i % 2 ? 'thighR' : 'thighL';
      r.cap(hub, end, 1.9, 1.7, black);
      r.ell(frameF(end, R.v(-Math.sin(ang), 0, Math.cos(ang)), R.s), [0, 0, 0], [1.9, 1.6, 1.1], footMat);
    }
    j.footL = R.p(0.8, -2.6, -11);
    j.footR = R.p(0.8, 2.6, -11);
  }
  for (const s of a('wheel') > 0.5 ? [] : [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const st = step(s < 0 ? 0 : 0.5);
    const hip = R.p(HIP[0], s * HIP[1], HIP[2]);
    const restF: V3 = [REST.foot[0] + st.forward + sit * 3.6, s * (REST.foot[1] + sit * 0.6), REST.foot[2] + st.lift * 1.5 + sit * 0.3];
    const goalF = goalAt(A, 'foot' + name, restF);
    const onFloor = FT.p(...(goalF ?? restF));
    const inAir = R.p(1.4 + a('kick') * s * 1.2 + a('tuck') * 1.8 + a('legsUp') * 3, s * 4.3 * (1 - 0.8 * a('click')), -9.2 + a('tuck') * 3.2 + a('legsUp') * 2);
    const foot = within(hip, vlerp(inAir, onFloor, plant), (THIGH + SHIN) * 1.12);
    if (plant > 0.5 && st.planted && !goalF) ctx.planted.push('foot' + name);
    const knee = ik(hip, foot, THIGH, SHIN, R.v(1, s * 0.2, 0.2));
    r.tag = 'thigh' + name;
    r.cap(hip, knee, 2.3, 2.05, black);
    r.tag = 'shin' + name;
    r.cap(knee, foot, 2.05, 1.85, black);
    fuzzCap(r, hip, foot, 2.0, 3, 8, 0.8, 0.55, black, s * 0.7);
    r.tag = 'foot' + name;
    const FF = frameF(foot, R.v(1, s * 0.12, -0.25 * (1 - plant)), R.u);
    r.ell(FF.at(0.6, 0, 0.15), [0, 0, 0], [2.5, 1.95, 1.3], footMat);
    // three claws peeking at the toes
    for (const k of [-0.7, 0, 0.7]) r.spike(FF.p(2.85, k, -0.2), FF.v(1, k * 0.15, -0.2), 0.7, 0.32, flat(T.claw), 3);
    j['foot' + name] = foot;
  }
  // ---- torso, fur and tail
  r.tag = 'torso';
  r.ell(R, [0, 0, 0], BELLY, torsoMat(heat));
  fuzz(r, R, BELLY, 240, 1.0, 0.62, 1.3, (d) => (d[2] > 0.9 ? null : torsoBlack(d) ? black : heat > 0.5 ? flat(T.heat) : white));
  r.tag = 'tail';
  r.ball(R.p(-6.6, 0, -3.4), 1.8, white);
  fuzz(r, R.at(-6.6, 0, -3.4), [1.8, 1.8, 1.8], 18, 0.9, 0.6, 2.1, () => white, [-1, 0, 0.2]);
  j.belly = R.p(BELLY[0], 0, -0.5);
  j.body = R.o;
  // ---- head: no neck, it sits on the shoulders; turned and lifted a little toward the viewer
  const Hd = R.at(0.6, 0, 12.4 + a('neck'))
    .turn(towardViewer(F, 0.65, 0.75) * Math.max(0, Math.cos(a('pitch'))) + a('gaze'))
    .pitch(HEAD_PITCH + a('nod'))
    .roll(a('tilt'));
  r.tag = 'head';
  const headStart = r.prims.length;
  const honey = a('honey');
  const hm = headMat(heat);
  // honey over the crown, running down in drips
  const honeyEdge = 1.02 - honey * 0.8;
  const honeyMat: Mat = honey > 0.05 ? { T: T.white, pat: (q, l) => (q[2] > honeyEdge + 0.1 * Math.sin(q[1] * 11 + q[0] * 5) ? pickBand(T.honey, l + 0.3) : hm.pat!(q, l)) } : hm;
  r.ell(Hd, [0, 0, 0], HEAD, honeyMat);
  // honey drips running down from the edge of the honey cap
  if (honey > 0.15) {
    const el0 = Math.asin(Math.min(0.98, honeyEdge));
    [-1.1, -0.55, -0.1, 0.4, 0.95].forEach((az, i) => {
      const o = onEll(Hd, HEAD, az, el0 - 0.04);
      const top = vadd(o.p, vmul(o.n, 0.15));
      const len = (0.8 + hash(i, 31) * 1.6) * honey * 2;
      const bot = vadd(top, vadd(vmul(Hd.u, -len), vmul(o.n, 0.2)));
      r.cap(top, bot, 0.75, 0.55, flat(T.honey));
      r.ball(bot, 0.75, flat(T.honey, { spec: true }));
    });
  }
  fuzz(r, Hd, HEAD, 150, 1.05, 0.62, 0.4, (d) => (d[0] > 0.2 && d[2] < 0.55 ? null : heat > 0.5 ? flat(T.heat) : white));
  for (const s of [-1, 1]) {
    r.tag = 'cheek';
    const c = onEll(Hd, HEAD, s * 1.0, -0.5);
    const CF = Hd.at(0, 0, 0);
    const cc = vsub(c.p, vmul(c.n, 1.9));
    r.ell(new F3(cc, CF.f, CF.s, CF.u), [0, 0, 0], [3.4, 3.4, 2.9], cheekMat(heat));
    fuzz(r, new F3(cc, CF.f, CF.s, CF.u), [3.4, 3.4, 2.9], 24, 0.9, 0.55, s * 1.7, (d) => (d[1] * s > 0.3 && d[0] < 0.6 ? white : null), [0, s * 0.6, -1]);
  }
  // muzzle, nose, mouth
  const mz = onEll(Hd, HEAD, 0, -0.34);
  const MZ = new F3(vsub(mz.p, vmul(mz.n, 1.5)), Hd.f, Hd.s, Hd.u);
  r.tag = 'muzzle';
  r.ell(MZ, [0, 0, 0], [2.7, 3.9, 2.5], flat(heat > 0.5 ? T.heat : T.white));
  r.tag = 'nose';
  r.ell(MZ, [2.35, 0, 1.25], [0.95, 1.6, 1.0], flat(T.nose, { spec: true }));
  j.nose = MZ.p(3.3, 0, 1.25);
  const chatter = a('chatter');
  const open = sat(a('mouth') + (a('chew') ? 0.18 + 0.18 * Math.sin(ctx.t * TAU * 4) : 0) + chatter * (0.16 + 0.16 * Math.sin(ctx.t * TAU * 9)));
  const smile = a('smile') + 0.6;
  r.tag = 'mouth';
  if (open > 0.06) {
    const MF = MZ.at(2.3, 0, -0.9 - open * 0.5);
    r.ell(MF, [0, 0, 0], [0.8, 1.3 + open * 1.1 + a('wide') * 0.9, 0.5 + open * 1.5], flat(T.mouth));
    r.ell(MF, [0.3, 0, -0.3 - open * 0.7], [0.75, 0.9 + open * 0.6, 0.32 + open * 0.55], flat(T.tongue));
    if (a('teeth') > 0.3 || chatter > 0.3) for (const s of [-1, 1]) r.ell(MF, [0.7, s * 0.4, 0.4 + open * 0.95], [0.38, 0.36, 0.48], flat(T.tooth));
    // chattering: the bottom teeth knock on the top ones
    if (chatter > 0.3) for (const s of [-1, 1]) r.ell(MF, [0.7, s * 0.4, -0.4 - open * 0.9], [0.38, 0.36, 0.44], flat(T.tooth));
    if (a('tongueOut') > 0.1) r.cap(MF.p(0.5, 0.5, -0.4), MF.p(1.6, 1.2, -1.6 - a('tongueOut') * 1.6), 0.6, 0.75, flat(T.tongue));
  } else {
    const wavy = a('wavy');
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8 - 0.5;
      pts.push(MZ.p(2.6 - Math.abs(u) * 1.3, u * 3.4, -0.75 + smile * (u * u * 2.6 - 0.15) + wavy * 0.32 * Math.sin(u * 22 + ctx.t * 30)));
    }
    inkCurve(r, pts, 0.28);
    // the line from the nose down to the mouth
    inkCurve(r, [MZ.p(3.0, 0, 0.4), MZ.p(2.75, 0, -0.75)], 0.24);
  }
  j.mouth = MZ.p(2.7, 0, -0.9);
  // ears: black discs with a grey inside, they flap (`earFlap`) and fold back (`earBack`)
  // a knight's pot pushed down over his eyes swallows the ears
  for (const s of knight && a('helmetSlide') > 0.4 ? [] : [-1, 1]) {
    r.tag = 'ear' + (s < 0 ? 'L' : 'R');
    const E = Hd.at(-1.2, s * 6.0, 6.3).roll(s * (0.35 + a('earFlap') * 0.5)).pitch(-a('earBack') * 0.6);
    r.ell(E, [0, s * 0.8, 1.7], [1.5, 3.0, 2.9], black);
    r.ell(E, [0.9, s * 0.8, 1.6], [0.7, 1.8, 1.7], flat(T.earIn));
    fuzz(r, E.at(0, s * 0.8, 1.7), [1.5, 3.0, 2.9], 20, 0.8, 0.5, s, (d) => (d[0] < 0.3 ? black : null), [0, s * 0.5, 1]);
  }
  // eyes in the patches, brows above them
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const sp = onEll(Hd, HEAD, s * (PATCH_AZ - 0.06), PATCH_EL + 0.1);
    const E = frameF(vsub(sp.p, vmul(sp.n, 0.45)), sp.n, Hd.u);
    r.tag = 'eye' + name;
    const start2 = r.prims.length;
    j['eye' + name] = eye(r, E, 1.6, 2.05, { lx: a('lookX'), ly: a('lookY'), lid: Math.max(a('lid'), a('blink')), squint: a('squint'), pop: a('pop'), dizzy: a('dizzy'), lidMat: black, spin: ctx.spin * s });
    r.markEye(start2, s, a('blink') < 0.9);
    r.tag = 'brow' + name;
    const up = a('browUp') * 0.16,
      angry = a('browIn'),
      sad = a('browSad');
    const bp = (az: number, el: number) => onEll(Hd, HEAD, s * az, el).p;
    inkCurve(r, [bp(0.18, 0.5 + up - angry * 0.1 + sad * 0.1), bp(0.36, 0.6 + up + angry * 0.02 + sad * 0.03), bp(0.55, 0.55 + up + angry * 0.08 - sad * 0.1)], 0.36);
  }
  j.head = Hd.o;
  j.crown = Hd.p(-0.8, 0, HEAD[2]);
  // a ladle stuck on his head like a hat (out of the barrel)
  if (a('ladleHat') > 0.5) {
    r.tag = 'ladle';
    const LF = Hd.at(-0.4, 0.6, HEAD[2] - 0.8).roll(0.3);
    r.ell(LF, [0, 0, 0], [4.2, 4.2, 2.8], flat(T.iron, { spec: true }), (q) => q[2] < -0.1);
    r.cap(LF.p(0, 3.8, 0.2), LF.p(-1.2, 11, 3.4), 0.5, 0.45, flat(T.iron));
  }
  // a bump grows on the crown after a bonk
  if (a('bump') > 0.02) {
    r.tag = 'bump';
    const bk = a('bump');
    r.ell(Hd.at(1.0, 0.8, HEAD[2] - 0.6 + bk * 0.9), [0, 0, 0], [2.0 * bk, 2.0 * bk, 2.2 * bk], flat(T.bump, { spec: true }));
  }
  // the red welt across the face where the bamboo stalk smacked it
  if (a('welt') > 0.05) {
    r.tag = 'welt';
    const pts = [-0.75, -0.4, 0, 0.4, 0.75].map((az) => vadd(onEll(Hd, HEAD, az, -0.08).p, vmul(onEll(Hd, HEAD, az, -0.08).n, 0.25)));
    for (let i = 1; i < pts.length; i++) r.cap(pts[i - 1], pts[i], 1.0 * a('welt'), 1.0 * a('welt'), flat(T.welt));
  }
  // the face pressed flat (`flatFace`: by a stalk, a door, the glass, a pan) — the head squashes along its forward axis
  if (a('flatFace') > 0.01) {
    const k = 1 - 0.55 * a('flatFace');
    const o = Hd.p(-HEAD[0] * 0.2, 0, 0);
    const ax = Hd.f;
    for (let i = headStart; i < r.prims.length; i++) {
      const pr = r.prims[i] as any;
      const sq = (v: V3): V3 => vadd(v, vmul(ax, (vdot(vsub(v, o), ax)) * (k - 1)));
      const sd = (v: V3): V3 => vadd(v, vmul(ax, vdot(v, ax) * (k - 1)));
      if (pr.k === 0) {
        pr.c = sq(pr.c);
        pr.a = [sd(pr.a[0]), sd(pr.a[1]), sd(pr.a[2])];
      } else if (pr.k === 1) {
        pr.a = sq(pr.a);
        pr.b = sq(pr.b);
      } else if (pr.k === 2) pr.pts = pr.pts.map(sq);
      else if (pr.k === 3) pr.p = sq(pr.p);
      else {
        pr.a = sq(pr.a);
        pr.b = sq(pr.b);
      }
    }
  }
  // the face takes the pan's shape (`panFace`): a flat round dish with the rim's red mark and a handle-shaped chin
  if (a('panFace') > 0.05) {
    const pf = a('panFace');
    r.tag = 'welt';
    for (let i = 0; i < 30; i++) {
      const th = (i / 30) * TAU;
      // the rim's mark runs round the face and opens at the bottom into the handle's
      if (Math.abs(th - Math.PI * 1.5) < 0.18) continue;
      r.ball(Hd.p(2.9, Math.cos(th) * 6.6, Math.sin(th) * 6.0 - 0.6), 0.6 * pf, flat(T.heat));
    }
    r.cap(Hd.p(2.2, 0, -6.2), Hd.p(2.6, 0, -6.2 - 5 * pf), 1.3 * pf, 1.1 * pf, flat(T.white));
    for (const s of [-1, 1]) r.cap(Hd.p(2.95, s * 1.15, -6.4), Hd.p(3.3, s * 1.0, -6.2 - 5 * pf), 0.45 * pf, 0.4 * pf, flat(T.heat));
  }
  // stuck in the honey pot: a round clay pot over the whole head, honey running from its rim
  if (a('jar') > 0.5) {
    // inside the pot no feature of the head shows: only the head ball stays (it fills the pot's open mouth)
    const inside = new Set(['head', 'cheek', 'muzzle', 'nose', 'mouth', 'earL', 'earR', 'eyeL', 'eyeR', 'browL', 'browR', 'welt', 'bump', 'ladle']);
    r.prims = r.prims.filter((p, i) => i <= headStart || !inside.has(p.t ?? ''));
    r.tag = 'jar';
    // squeezed over the head, it takes the head's shape: a glazed pot a size bigger, a cream label on the front,
    // a darker shoulder, honey oozing out round the rim at his neck
    const J = Hd.at(-0.2, 0, 0.9);
    const JR: V3 = [8.5, 10.1, 9.2];
    r.ell(J, [0, 0, 0], JR, {
      T: T.jar,
      spec: true,
      pat: (q, l) =>
        q[2] < -0.5 + 0.07 * Math.sin(q[1] * 9 + q[0] * 4)
          ? pickBand(T.honey, l)
          : q[0] > 0.3 && Math.abs(q[2] - 0.02) < 0.24 && Math.abs(q[1]) < 0.62
            ? pickBand(T.white, l)
            : Math.abs(q[2] - 0.3) < 0.05 || Math.abs(q[2] + 0.26) < 0.05
              ? pickBand(T.jar, l - 0.6)
              : q[2] > 0.7
                ? pickBand(T.jar, l - 0.3)
                : null,
    }, (q) => q[2] < -0.84);
    // a honey drop drawn on the label
    r.ball(J.p(JR[0] * 0.98, 0, -0.4), 1.25, flat(T.honey));
    r.spike(J.p(JR[0] * 0.98, 0, 0.3), J.u, 1.4, 0.8, flat(T.honey), 4);
    // the rim round his neck and honey drips on the shoulders
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * TAU;
      r.ball(J.p(Math.cos(ang) * 4.6, Math.sin(ang) * 5.4, -8.0), 1.0, flat(T.jar));
    }
    for (const k of [-0.7, -0.2, 0.4, 0.8]) r.cap(J.p(4.6, k * 5.2, -8.2), J.p(5.0, k * 5.2, -9.8 - Math.abs(k) * 0.8), 0.55, 0.45, flat(T.honey));
    j.jar = J.o;
  }
  // ---- arms
  const handT = (name: string, s: number): V3 => {
    const rest: V3 = [REST.hand[0] + (walking ? -1.6 * s * Math.sin(ctx.gait * TAU) * ctx.gaitW : 0), s * REST.hand[1], REST.hand[2] + bodyZ - BODY_Z];
    return FT.p(...(goalAt(A, 'hand' + name, rest) ?? rest));
  };
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const sh = R.p(SHOULDER[0], s * SHOULDER[1], SHOULDER[2]);
    // a paw never leaves the arm's reach: a goal set from the floor follows him up into the air
    const hand = within(sh, handT(name, s), (UPPER + FORE) * 1.04);
    const elbow = ik(sh, hand, UPPER, FORE, R.v(-0.6, s * 1, -0.5));
    const fur = knight ? flat(T.mitt) : black;
    r.tag = 'arm' + name;
    r.cap(sh, elbow, 2.25, 2.0, black);
    fuzzCap(r, sh, elbow, 2.1, 3, 8, 0.85, 0.55, black, s);
    r.tag = 'fore' + name;
    r.cap(elbow, hand, 2.0, 1.8, fur);
    fuzzCap(r, elbow, hand, 1.9, 3, 8, 0.8, 0.5, fur, s * 1.3);
    r.tag = 'hand' + name;
    r.ball(hand, 2.05, fur);
    // three finger bumps and claws on the far side of the paw
    const ax = vnorm(vsub(hand, elbow));
    const side = vnorm(vcross(ax, [0, 0, 1]));
    for (const k of [-1, 0, 1]) {
      const fp = vadd(hand, vadd(vmul(ax, 1.55), vmul(side, k * 0.95)));
      r.ball(fp, 0.85, fur);
      if (!knight) r.spike(vadd(fp, vmul(ax, 0.6)), ax, 0.65, 0.28, flat(T.claw), 3);
    }
    j['hand' + name] = hand;
  }
  // ---- props in his paws
  // tucked behind the ear it hides under the pot
  if (a('bamboo') > 0.5 && !(a('jar') > 0.5 && a('bambooEar') > 0.5)) {
    r.tag = 'bamboo';
    // in the paw: the bitten top at the corner of the mouth (`toMouth`) or upright; tucked behind the ear (`bambooEar`)
    // when the paws are busy in a trick, and back again at its end
    const h = j.handR;
    const tm = sat(a('toMouth') + (a('chew') ? 1 : 0));
    const topHand = vlerp(vadd(h, R.v(-0.4, 0.4, 9.5)), vadd(j.mouth, Hd.v(0.3, 1.6, 0.2)), tm);
    const botHand = vsub(h, vmul(vnorm(vsub(topHand, h)), 6.5));
    const ear = smooth(sat(a('bambooEar')));
    const top = vlerp(topHand, Hd.p(-4.6, 6.6, 9.8), ear);
    const bot = vlerp(botHand, Hd.p(-1.2, 8.6, -4.2), ear);
    const ax = vnorm(vsub(top, bot));
    r.cap(bot, top, 0.72, 0.62, flat(T.bamboo));
    r.ball(top, 0.62, flat(T.bite));
    for (const u of [0.18, 0.42, 0.66, 0.88]) r.ball(vlerp(bot, top, u), 0.8, flat(T.node));
    const sideV = vnorm(vcross(ax, [0, 0.2, 1]));
    const n2 = vlerp(bot, top, 0.42);
    leaf(r, n2, vadd(vmul(ax, -0.3), vmul(sideV, 1)), vcross(ax, sideV), 4.6, 1.0, flat(T.leaf));
    leaf(r, n2, vadd(vmul(ax, 0.2), vmul(sideV, 1)), vcross(ax, sideV), 3.6, 0.85, flat(T.leaf));
    leaf(r, bot, vadd(vmul(ax, -1), vmul(sideV, -0.4)), sideV, 3.4, 0.8, flat(T.leaf));
    leaf(r, bot, vadd(vmul(ax, -1), vmul(sideV, 0.5)), sideV, 2.8, 0.7, flat(T.leaf));
    j.bambooTip = top;
  }
  if (a('bun') > 0.5) {
    r.tag = 'bun';
    const at = vadd(j[a('bunL') > 0.5 ? 'handL' : 'handR'], R.v(0.8, 0, 1.8));
    const BF = frameF(at, R.f, R.u);
    r.ell(BF, [0, 0, 0], [1.9, 1.9, 1.5], flat(T.bun));
    for (let i = 0; i < 6; i++) r.line(BF.p(Math.cos(i) * 1.6, Math.sin(i) * 1.6, 0.6), BF.p(0, 0, 1.5), T.bun[0]);
    r.spike(BF.p(0, 0, 1.2), BF.u, 0.9, 0.6, flat(T.bun));
    j.bun = at;
  }
  // ---- the knight's kit (form 2): pot helmet with a ladle plume, colander visor, lid shield, wooden spoon, towel cape
  if (knight) {
    r.tag = 'helmet';
    const slide = a('helmetSlide');
    const HF = Hd.at(-0.4, 0, 6.6 - slide * 4.2).pitch(a('helmetTip'));
    // pulled down over the eyes it is a deep pot round the whole crown, never a ring through the head
    const deep = Math.max(0, 2.3 + slide * 4.2 - 3.6);
    const wide = Math.min(1, slide);
    const HR: V3 = [8.0 + 0.4 * wide, 9.6 + 0.5 * wide, 3.6 + deep];
    r.ell(HF, [0, 0, 0], HR, flat(T.iron, { spec: true }), (q) => q[2] < -0.05);
    r.cap(HF.p(0, -HR[1] + 0.3, -0.2), HF.p(0, HR[1] - 0.3, -0.2), 1.0, 1.0, flat(T.ironDark));
    for (const s of [-1, 1]) r.cap(HF.p(0, s * (HR[1] - 0.3), 0.6), HF.p(0, s * (HR[1] + 1.7), 0.8), 0.8, 0.8, flat(T.ironDark));
    r.tag = 'plume';
    r.cap(HF.p(-1.5, 0, 3.2 + deep), HF.p(-3.6, 0.4, 9.2 + deep), 0.45, 0.45, flat(T.iron));
    r.ell(HF.at(-4.0, 0.4, 10.4 + deep), [0, 0, 0], [1.6, 1.6, 1.0], flat(T.iron), (q) => q[2] > 0.35);
    j.helmet = HF.p(0, 0, 3.6 + deep);
    if (a('visor') > 0.05) {
      r.tag = 'visor';
      const V = HF.at(5.6, 0, -3.0 + (1 - a('visor')) * 4.6).pitch(-0.9 * (1 - a('visor')));
      r.ell(V, [0, 0, 0], [2.0, 6.8, 3.2], { T: T.iron, pat: (q) => (Math.sin(q[1] * 18) * Math.sin(q[2] * 14) > 0.55 ? T.ironDark[0] : null) }, (q) => q[0] < 0.1);
    }
    r.tag = 'shield';
    const SH = frameF(vadd(j.handL, R.v(1.4, -0.6, 0)), R.v(1, -0.5 + a('shieldTurn'), 0), R.u);
    r.ell(SH, [0, 0, 0], [0.7, 4.8, 4.8], flat(T.iron, { spec: true }));
    r.ball(SH.p(0.9, 0, 0), 0.9, flat(T.ironDark));
    j.shield = SH.p(0.9, 0, 0);
    r.tag = 'spoon';
    const sp = j.handR;
    const dir = vnorm(R.v(0.4 + a('spoonFwd'), 0.1 + a('spoonOut'), 1 - a('spoonDown')));
    const tip = vadd(sp, vmul(dir, 10.5));
    // `spoonOff`: knocked out of his paw (the effects fly it and stick it in the ceiling beam)
    if (a('spoonOff') < 0.5) {
      r.cap(vadd(sp, vmul(dir, -1.4)), tip, 0.55, 0.5, flat(T.spoon));
      r.ell(frameF(vadd(tip, vmul(dir, 1.4)), dir, R.f), [0, 0, 0], [1.9, 1.4, 0.7], flat(T.spoon));
    }
    j.spoonTip = vadd(tip, vmul(dir, 2.4));
    r.tag = 'cape';
    const flap = 0.6 * Math.sin(ctx.t * TAU * 1.5) + a('capeFly');
    r.poly([R.p(-3.6, -6.2, 6.4), R.p(-3.6, 6.2, 6.4), R.p(-7.6 - flap, 7.8, -6.2), R.p(-8.6 - flap * 1.4, 0, -7.8), R.p(-7.6 - flap, -7.8, -6.2)], towelMat);
  }
  // the frying pan (second form, «Сковородка»): handle in both paws, the pan raised for a swing
  if (a('pan') > 0.5) {
    r.tag = 'pan';
    // in both paws, or by the handle in the right one (`panOne`, the lid stays on the left arm)
    const grip = a('panOne') > 0.5 ? j.handR : vlerp(j.handR, j.handL, 0.5);
    const dir = vnorm(R.v(0.3 + a('panFwd'), 0.05 + a('panOut'), 1 - a('panDown')));
    const c = vadd(grip, vmul(dir, 9.5));
    r.cap(grip, vadd(grip, vmul(dir, 5.4)), 0.6, 0.6, flat(T.ironDark));
    const PF = frameF(c, vnorm(vcross(dir, R.s)), dir);
    r.ell(PF, [0, 0, 0], [0.7, 4.6, 4.6], flat(T.iron, { spec: true }));
    r.ell(PF, [0.5, 0, 0], [0.35, 3.9, 3.9], flat(T.ironDark));
    j.pan = c;
  }
  // the pan stuck on his face after it sprang back (`panStuck`), handle down; `panSlide` lets it slip down off his chin
  if (a('panStuck') > 0.5) {
    r.tag = 'pan';
    const c = Hd.p(3.6, 0, -a('panSlide') * 7.5);
    const PF = frameF(c, Hd.f, Hd.u);
    r.ell(PF, [0, 0, 0], [0.7, 4.6, 4.6], flat(T.iron, { spec: true }));
    r.ell(PF, [0.5, 0, 0], [0.35, 3.9, 3.9], flat(T.ironDark));
    r.cap(Hd.p(3.4, 0, -4.6 - a('panSlide') * 7.5), Hd.p(3.2, 0, -10 - a('panSlide') * 7.5), 0.6, 0.6, flat(T.ironDark));
    j.pan = c;
  }
  // squash and stretch of the panda alone, about his feet
  const sq: V3 = [1 + a('sqx'), 1 + a('sqy'), 1 + a('sqz')];
  if (sq[0] !== 1 || sq[1] !== 1 || sq[2] !== 1) {
    deform(r, start, F.o, sq);
    for (const k of Object.keys(j)) j[k] = [F.o[0] + (j[k][0] - F.o[0]) * sq[0], F.o[1] + (j[k][1] - F.o[1]) * sq[1], F.o[2] + (j[k][2] - F.o[2]) * sq[2]];
  }
  return { Hd, R };
}

// ---- Шустрик -----------------------------------------------------------------------------------------------------
/** Шустрик's size relative to the numbers below. */
const MK = 1.3;
function monkey(r: Rig, F: F3, A: JointPose, j: Record<string, V3>, P: PandaOut | null, ctx: { t: number; spin: number; base: number }) {
  const a = (k: string) => A[k] ?? 0;
  const K = MK;
  const on = P ? smooth(sat(a('mOn'))) : 0;
  // free: his own spot in the world (mX right, mY toward us, mZ up; mYaw from the painting's yaw); attached: sitting
  // on Пончик's crown, turned with the head
  void F;
  const free = F3.yaw(ctx.base + a('mYaw'), [a('mX'), a('mY'), a('mZ')]);
  const seat = P ? P.Hd.at(-1.0, 0, HEAD[2] - 0.6).turn(a('mYaw') * 0.3).pitch(-HEAD_PITCH * 0.7) : free;
  const M = blendFrame(free, seat, on);
  const white = a('mFlour') > 0.5;
  const wet = a('mWet') > 0.5;
  const fur = flat(white ? T.flour : wet ? cel('#7a3e08', '#b8701c', '#e8a848') : T.gold),
    mane = white ? flat(T.flour) : maneMat,
    face = flat(white ? T.flour : T.face),
    hands = flat(white ? T.flour : T.hand);
  const sit = sat(a('mSit') + on);
  const run = a('mRun');
  const runPh = a('mGait') * TAU;
  const hop = run > 0.01 ? Math.abs(Math.sin(runPh)) * 1.2 * run : 0;
  const Mb = M.at(a('mLean') * 0.6 * K, 0, (3.0 - sit * 0.7 + a('mJump') + hop) * K)
    .pitch(a('mPitch') + run * 0.7)
    .roll(a('mRoll'))
    .turn(a('mTwist'));
  r.tag = 'mBody';
  const BODY: V3 = [2.1 * K, 2.3 * K, 2.8 * K];
  r.ell(Mb, [0, 0, 0], BODY, fur);
  fuzz(r, Mb, BODY, 48, 0.8 * K, 0.45 * K, 0.9, () => fur);
  r.tag = 'mMane';
  const MANE: V3 = [2.5 * K, 2.9 * K, 1.7 * K];
  r.ell(Mb, [0.2 * K, 0, 1.9 * K], MANE, mane);
  fuzz(r, Mb.at(0.2 * K, 0, 1.9 * K), MANE, 64, 1.0 * K, 0.5 * K, 2.3, (d) => (d[2] < 0.6 ? flat(white ? T.flour : T.mane) : null), [0, 0, -1]);
  // tail: a question mark — back from the rump, up, curling over at the tip; it sways and curls tighter on `mTail`
  r.tag = 'mTail';
  const sway = Math.sin(ctx.t * TAU * 0.7) * 0.35;
  let p: V3 = Mb.p(-1.4 * K, 0.9 * K, -2.0 * K);
  const pts: V3[] = [p];
  const N = 10,
    L = 12.5 * K;
  const fw = sat(a('mTailFwd'));
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    // it leaves the rump to his right side so the curl reads from the front, not hidden behind him; `mTailFwd` arches
    // it up over his head and down in front (to tickle a nose)
    const thN = -0.2 + u * (2.9 + a('mTail')),
      thF = 1.3 + u * 2.7;
    const th = thN + (thF - thN) * fw;
    const side = (1 - fw) * (1.0 * Math.cos(th) + sway * u) + fw * 0.15;
    const dir = vnorm(Mb.v(-(0.35 + 0.6 * fw) * Math.cos(th), side, Math.sin(th)));
    p = vadd(p, vmul(dir, L / N));
    pts.push(p);
  }
  for (let i = 1; i < pts.length; i++) r.cap(pts[i - 1], pts[i], (0.7 - i * 0.03) * K, (0.67 - i * 0.03) * K, fur);
  for (let i = 2; i < pts.length; i += 1) {
    const ax = vnorm(vsub(pts[i], pts[i - 1]));
    for (const s of [-1, 1]) r.spike(pts[i], vnorm(vadd(ax, vmul(vnorm(vcross(ax, [0, 0, 1])), s * 0.8))), 0.7 * K, 0.3 * K, fur, 3);
  }
  r.ball(pts[N], 1.15 * K, mane);
  fuzz(r, new F3(pts[N], Mb.f, Mb.s, Mb.u), [1.15 * K, 1.15 * K, 1.15 * K], 20, 0.8 * K, 0.4 * K, 1.1, () => flat(white ? T.flour : T.mane));
  j.mTail = pts[N];
  // head
  const Mh = Mb.at(0.4 * K, 0, 4.4 * K).turn(a('mGaze') + (1 - on) * towardViewer(Mb, 0.5, 0.7) * Math.max(0, Math.cos(a('mPitch')))).pitch(a('mNod')).roll(a('mTilt'));
  const HEADM: V3 = [2.3 * K, 2.5 * K, 2.3 * K];
  r.tag = 'mHead';
  r.ell(Mh, [0, 0, 0], HEADM, fur);
  fuzz(r, Mh, HEADM, 32, 0.7 * K, 0.4 * K, 0.2, (d) => (d[0] > 0.3 ? null : fur), [-0.5, 0, -1]);
  for (const k of [-1, 0, 1]) r.spike(Mh.p(0.2 * K, k * 0.5 * K, 2.0 * K), vnorm(Mh.v(-0.4, k * 0.4, 1)), (1.5 - Math.abs(k) * 0.4) * K, 0.45 * K, mane, 3);
  r.tag = 'mFace';
  r.ell(Mh, [1.35 * K, 0, -0.35 * K], [1.05 * K, 2.15 * K, 1.95 * K], flat(white ? T.flour : T.rim));
  r.ell(Mh, [1.75 * K, 0, -0.35 * K], [0.95 * K, 1.8 * K, 1.65 * K], face);
  r.ell(Mh, [2.5 * K, 0, 0.0], [0.5 * K, 0.6 * K, 0.42 * K], face);
  r.dot(Mh.p(2.92 * K, -0.22 * K, -0.05 * K), INK, 0, 0.3 * K);
  r.dot(Mh.p(2.92 * K, 0.22 * K, -0.05 * K), INK, 0, 0.3 * K);
  for (const s of [-1, 1]) {
    r.tag = 'mEar';
    r.ell(Mh, [-0.2 * K, s * 2.35 * K, 0.3 * K], [0.45 * K, 0.75 * K, 0.9 * K], flat(white ? T.flour : T.rim));
    r.ell(Mh, [0.05 * K, s * 2.5 * K, 0.3 * K], [0.25 * K, 0.4 * K, 0.5 * K], flat(white ? T.flour : T.pink));
  }
  for (const s of [-1, 1]) {
    const E = frameF(Mh.p(2.1 * K, s * 0.82 * K, 0.6 * K), Mh.v(1, s * 0.32, 0.1), Mh.u);
    r.tag = 'mEye';
    j['mEye' + (s < 0 ? 'L' : 'R')] = eye(r, E, 0.72 * K, 0.88 * K, { lx: a('mLookX'), ly: a('mLookY'), lid: Math.max(a('mLid'), a('mBlink')), squint: a('mSquint'), pop: a('mPop'), dizzy: a('mDizzy'), lidMat: face, spin: ctx.spin });
    const up = a('mBrowUp') * 0.5,
      angry = a('mBrowIn');
    // sly by default: the right brow cocked up
    const cock = s > 0 ? 0.25 * (1 - angry) : 0;
    inkCurve(r, [Mh.p(2.45 * K, s * 0.5 * K, (2.0 + up + cock * 0.6 - angry * 0.6) * K), Mh.p(2.0 * K, s * 1.35 * K, (1.95 + up + cock + angry * 0.2) * K)], 0.15 * K);
  }
  // mouth: a sly smile, or open (laughing)
  const mo = sat(a('mMouth'));
  if (mo > 0.08) {
    r.ell(Mh.at(2.45 * K, 0, -1.15 * K), [0, 0, 0], [0.35 * K, (0.6 + mo * 0.3) * K, (0.25 + mo * 0.55) * K], flat(T.mouth));
    r.ell(Mh.at(2.55 * K, 0, (-1.3 - mo * 0.3) * K), [0, 0, 0], [0.3 * K, 0.45 * K, (0.15 + mo * 0.2) * K], flat(T.tongue));
  } else {
    const mp: V3[] = [];
    for (let i = 0; i <= 5; i++) {
      const u = i / 5 - 0.5;
      mp.push(Mh.p((2.55 - Math.abs(u) * 0.5) * K, u * 1.25 * K, (-1.1 + (a('mSmile') + 0.7) * (u * u * 1.2) + u * a('mSmirk') * 0.5) * K));
    }
    inkCurve(r, mp, 0.14 * K);
  }
  if (a('mTongue') > 0.1) r.ell(Mh.at(2.7 * K, 0, (-1.5 - a('mTongue') * 0.4) * K), [0, 0, 0], [0.3 * K, 0.42 * K, 0.55 * K], flat(T.tongue));
  j.mHead = Mh.o;
  j.mMouth = Mh.p(2.6 * K, 0, -1.1 * K);
  // limbs (goals in his body frame, numbers before scaling)
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const sh = Mb.p(0.4 * K, s * 1.9 * K, 1.6 * K);
    const restHand: V3 = on > 0.5 ? [1.7, s * 2.4, -0.4] : [1.2 + Math.sin(runPh + (s < 0 ? 0 : Math.PI)) * 1.6 * run, s * 2.0, -1.8 + run * 0.4];
    const g = goalAt(A, 'mHand' + name, restHand) ?? restHand;
    const hand = Mb.p(g[0] * K, g[1] * K, g[2] * K);
    const el = ik(sh, hand, 2.3 * K, 2.2 * K, Mb.v(-0.5, s, -0.3));
    r.tag = 'mArm' + name;
    r.cap(sh, el, 0.62 * K, 0.56 * K, fur);
    r.cap(el, hand, 0.56 * K, 0.5 * K, fur);
    fuzzCap(r, sh, el, 0.55 * K, 1, 4, 0.55 * K, 0.3 * K, fur, s);
    r.ball(hand, 0.72 * K, hands);
    j['mHand' + name] = hand;
    const hip = Mb.p(-0.2 * K, s * 1.3 * K, -2.0 * K);
    const ph = runPh + (s < 0 ? Math.PI : 0);
    const restFoot: V3 = sit > 0.5 ? [2.0, s * 1.6, -2.4] : [0.2 + Math.sin(ph) * 1.8 * run, s * 1.3, -3.0 + Math.max(0, Math.cos(ph)) * 0.8 * run];
    const gf = goalAt(A, 'mFoot' + name, restFoot) ?? restFoot;
    const foot = Mb.p(gf[0] * K, gf[1] * K, gf[2] * K);
    const kn = ik(hip, foot, 1.8 * K, 1.8 * K, Mb.v(1, s * 0.3, 0.4));
    r.tag = 'mLeg' + name;
    r.cap(hip, kn, 0.72 * K, 0.62 * K, fur);
    r.cap(kn, foot, 0.62 * K, 0.55 * K, fur);
    fuzzCap(r, hip, kn, 0.65 * K, 1, 4, 0.55 * K, 0.3 * K, fur, s * 2);
    r.ell(frameF(foot, Mb.f, Mb.u).at(0.4 * K, 0, 0), [0, 0, 0], [0.9 * K, 0.55 * K, 0.45 * K], hands);
    j['mFoot' + name] = foot;
  }
  // his props: a chopstick for a rapier, a steamer lid for a shield, a stolen bun
  if (a('mStick') > 0.5) {
    r.tag = 'mStick';
    const d = vnorm(Mb.v(0.7 + a('mStickFwd'), 0.1, 0.7 - a('mStickDown')));
    // the bamboo shoot he stole from Пончик, held like a rapier: nodes, a bitten top, a tuft of leaves at the base
    const b0 = vsub(j.mHandR, vmul(d, 1.3 * K)),
      b1 = vadd(j.mHandR, vmul(d, 8.2 * K));
    r.cap(b0, b1, 0.5, 0.42, flat(T.bamboo));
    r.ball(b1, 0.42, flat(T.bite));
    for (const u of [0.3, 0.55, 0.8]) r.ball(vlerp(b0, b1, u), 0.56, flat(T.node));
    const sv = vnorm(vcross(d, [0, 0.2, 1]));
    leaf(r, b0, vadd(vmul(d, -1), vmul(sv, -0.4)), sv, 2.6, 0.65, flat(T.leaf));
    leaf(r, b0, vadd(vmul(d, -1), vmul(sv, 0.5)), sv, 2.2, 0.55, flat(T.leaf));
    j.mStickTip = b1;
  }
  if (a('mLid') > 0.5) {
    r.tag = 'mLid';
    const LF = frameF(vadd(j.mHandL, Mb.v(0.6 * K, -0.3 * K, 0)), Mb.v(1, -0.4, 0), Mb.u);
    r.ell(LF, [0, 0, 0], [0.4 * K, 2.6 * K, 2.6 * K], { T: T.lid, pat: (q, l) => (Math.sin(Math.atan2(q[2], q[1]) * 10) > 0.6 ? pickBand(T.lid, l - 0.5) : null) });
  }
  if (a('mBun') > 0.5) {
    r.tag = 'mBun';
    const at = vadd(j.mHandR, Mb.v(0.3 * K, 0, 0.9 * K));
    r.ell(frameF(at, Mb.f, Mb.u), [0, 0, 0], [1.5, 1.5, 1.2], flat(T.bun));
    r.spike(vadd(at, Mb.v(0, 0, 0.9)), Mb.u, 0.8, 0.5, flat(T.bun));
    j.mBunAt = at;
  }
  j.mBody = Mb.o;
  j.mGround = [M.o[0], M.o[1], 0];
}

// ---- eggs (hatch) -------------------------------------------------------------------------------------------------
/** Spots on the panda egg (unit sphere directions) and their sizes. */
const EGG_SPOTS: [V3, number][] = [
  [vnorm([0.8, 0.3, 0.4]), 0.32],
  [vnorm([0.5, -0.7, -0.1]), 0.26],
  [vnorm([-0.3, 0.8, -0.4]), 0.3],
  [vnorm([0.9, -0.1, -0.5]), 0.22],
  [vnorm([-0.7, -0.4, 0.5]), 0.28],
];
/** An egg standing on the floor at `at`, rocking about its bottom; a zigzag crack runs round it as `crack` grows. */
function eggAt(r: Rig, base: number, at: V3, R3: V3, pitch: number, roll: number, crack: number, gold: boolean) {
  const E = F3.yaw(base, [at[0], at[1], 0]).pitch(pitch).roll(roll).at(0, 0, R3[2]);
  const mat: Mat = gold
    ? { T: T.eggGold, pat: (q, l) => (Math.sin(q[2] * 14) > 0.85 ? pickBand(T.eggGold, l + 0.6) : null) }
    : { T: T.egg, pat: (q, l) => (EGG_SPOTS.some(([d, k]) => vdot(q, d) > 1 - k * k * 0.5) ? pickBand(T.black, l) : null) };
  r.tag = gold ? 'mEgg' : 'egg';
  r.ell(E, [0, 0, 0], R3, mat);
  if (crack > 0.02) {
    const pts: V3[] = [];
    const n = Math.max(2, Math.round(16 * crack));
    for (let i = 0; i <= n; i++) {
      const u = (i / 16 - crack / 2) * TAU * 0.9;
      const z = 0.18 + (i % 2 ? 0.1 : -0.06);
      const d = vnorm([Math.cos(u) * Math.sqrt(1 - z * z), Math.sin(u) * Math.sqrt(1 - z * z), z]);
      pts.push(E.p(d[0] * R3[0] * 1.02, d[1] * R3[1] * 1.02, d[2] * R3[2] * 1.02));
    }
    inkCurve(r, pts, gold ? 0.18 : 0.3);
  }
  return E;
}

// ---- the frame ---------------------------------------------------------------------------------------------------
export const loopPeriods: Record<string, number> = { idle: 3, walk: 1, sleep: 3, 'idle-f2': 2, turn: 4 };
/** Rig units → painting pixels. */
export const portraitScale = 3.7;
const FIGURE = 420,
  ANCHOR: [number, number] = [210, 340];

export function pandaFrame(sample: PoseSample): Creature['frame'] {
  const route = card.life;
  return (anim, t, side, _variant, motion) => {
    const keyed = motion?.techniquePose;
    const pose: JointPose = keyed ? { ...keyed } : sample(anim, t);
    const get = (k: string) => pose[k] ?? 0;
    const period = clips[anim]?.loop ? clips[anim].seconds : (loopPeriods[anim] ?? 0);
    const clock = clipClock(clips[anim]?.seconds ?? 2, t);
    const r = new Rig();
    r.outlineW = 2;
    r.innerInk = INK;
    const j: Record<string, V3> = {};
    // the painting's yaw; Пончик moves about the kitchen by X (right) and Y (toward us) in rig units
    const base = route.yaw + (side * Math.PI) / 8;
    const F = F3.yaw(base + get('yaw'), [get('X'), get('Y'), 0]);
    const twist = get('twist');
    const FT = twist ? F.turn(twist) : F;
    const lifeWalk = anim === 'walk';
    const gaitW = lifeWalk ? 1 : sat(get('gait'));
    const gait = lifeWalk ? (motion?.gaitPhase ?? t) : get('gaitT');
    const breath = period ? Math.sin((t * TAU) / period) : 0;
    const planted: string[] = [];
    const spin = clock.turn(2);
    // over the painting's frame: the whole of Пончик (`overAll`) or of Шустрик (`mOver`) goes to the front layer
    const overAll = get('overAll') > 0.5,
      mOver = get('mOver') > 0.5;
    const front = overAll || mOver ? new Rig() : null;
    if (front) {
      front.outlineW = 2;
      front.innerInk = INK;
    }
    let P: PandaOut | null = null;
    if (get('egg') > 0.5) {
      const E = eggAt(r, base, [get('X'), get('Y'), 0], [8.6, 8.6, 10.8], get('eggRock'), get('eggRoll'), get('eggCrack'), false);
      j.egg = E.o;
    } else if (get('hidden') < 0.5) P = panda(overAll ? front! : r, F, FT, pose, j, { gait, gaitW, t, spin, breath, planted });
    if (get('mEgg') > 0.5) {
      const E = eggAt(r, base, [get('mX'), get('mY'), 0], [3.3, 3.3, 4.3], get('mEggRock'), 0, get('mEggCrack'), true);
      j.mEgg = E.o;
    } else if (get('mHidden') < 0.5) monkey(mOver ? front! : r, F, pose, j, P, { t, spin, base });
    // egg shells: the top cap rides on Пончик's head, then on Шустрик's
    if (get('shellHat') > 0.5 && P) {
      r.tag = 'shell';
      const S3 = P.Hd.at(-0.6, 0, HEAD[2] - 2.2).roll(0.25);
      (overAll ? front! : r).ell(S3, [0, 0, 0], [7.2, 7.2, 5.6], { T: T.egg, pat: (q, l) => (EGG_SPOTS.slice(0, 2).some(([d, k]) => vdot(q, d) > 1 - k * k * 0.5) ? pickBand(T.black, l) : null) }, (q) => q[2] < 0.15 + 0.08 * Math.sin(Math.atan2(q[1], q[0]) * 9));
    }
    if (get('mShellHat') > 0.5 && j.mHead) {
      const S3 = new F3(vadd(j.mHead, [0, 0, 1.4 * MK]), [1, 0, 0], [0, 1, 0], [0, 0, 1]).roll(-0.3);
      (mOver ? front! : r).ell(S3, [0, 0, 0], [3.1 * MK, 3.1 * MK, 2.6 * MK], { T: T.egg, pat: (q, l) => (vdot(q, EGG_SPOTS[0][0]) > 0.95 ? pickBand(T.black, l) : null) }, (q) => q[2] < 0.12 + 0.08 * Math.sin(Math.atan2(q[1], q[0]) * 9));
    }
    if (get('shellBottom') > 0.5) {
      const B = F3.yaw(base, [get('X'), get('Y'), 0]).at(0, 0, 6.4);
      r.ell(B, [0, 0, 0], [8.6, 8.6, 6.6], { T: T.egg, pat: (q, l) => (EGG_SPOTS.slice(2).some(([d, k]) => vdot(q, d) > 1 - k * k * 0.5) ? pickBand(T.black, l) : null) }, (q) => q[2] > -0.05 + 0.1 * Math.sin(Math.atan2(q[1], q[0]) * 9));
    }
    j.floor = [0, 0, 0];
    j.home = [get('X'), get('Y'), 0];
    for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
    scaleFigure(r, j, portraitScale);
    if (front) scaleFigure(front, {}, portraitScale);
    // inside the barrel: nothing below its rim is drawn (the rim height in rig units)
    if (get('clipZ') > 0.01) r.clipZ = get('clipZ') * portraitScale;
    const frame: BodyFrame = projectFigure(r, FIGURE, ANCHOR, j, '#1e1620', 3.2, true);
    if (front) {
      const paint = { outline: INK, inner: 3.2 };
      const pad = 240,
        size = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      if (!pointsOnlyActive()) {
        const body = renderRig(r, size, size, ...anchor, paint);
        frame.px = body.p;
        frame.lit = body.lit;
        frame.eye = body.eye;
        frame.over = renderRig(front, size, size, ...anchor, paint).p;
      }
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
    }
    // both shadows are drawn by the effects under each character (they move apart about the kitchen)
    frame.groundShadow = { radius: 0, opacity: 0, reflectionOpacity: 0 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('flash')) frame.flash = Math.min(1, get('flash'));
    // a clang: the whole picture of him shivers and its outline doubles
    const vib = get('vib');
    if (vib > 0.05) {
      const odd = Math.round(t * 24) % 2 ? 1 : -1;
      frame.dx = (frame.dx ?? 0) + odd * Math.round(1 + vib);
      frame.ghost = { dx: -odd * Math.round(2 + vib * 3), dy: 0, alpha: 0.4 };
    }
    frame.planted = planted;
    return frame;
  };
}
