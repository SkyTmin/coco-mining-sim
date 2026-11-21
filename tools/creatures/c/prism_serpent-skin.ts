// Ирис, the rainbow serpent. Its own skeleton on the f15 rig, no legs at all: a long flying body of N segments (a
// chain of joints integrated from a root both ways, so it never stretches), an S-curve with the neck reared high and
// the tail sweeping behind and up. Emerald scales turn turquoise and sapphire toward the tail, golden belly plates, a
// row of gold spines with sapphire tufts down the back. A small dragon head with huge amber eyes, gold horns and a crest
// of five long feathers; a scarlet ruff on the throat. Two feathered wings at the root of the neck, a fan of five long
// eyed feathers at the tail tip. Every segment angle comes from the rest profile plus a travelling wave plus named body
// shapes blended by weight (`coil`, `loop`, `knot`, `heart`, `spring`), so a trick only says which shape and how much.
// Pose keys (all optional, 0 = rest) are read through `get`; positions are rig units before `card.proportions.scale`.
import type { CreatureCard } from '../bodies/card-data';
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { sizes, type BodyFrame, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

/** Segments, their length, the root joint (wing shoulders), the hover height of the root. */
export const N = 19;
export const SEG = 1.6;
export const ROOT = 9;
export const HOVER = 2.9;
const SPIN_Z = 9;
const ROLL_Z = 7;
/** The head is drawn larger than the neck would carry: a big head with big eyes. */
const HEAD = 1.25;
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow']);

const T = (hexes: string[]): Mat['T'] => hexes.map((c) => hx(c)) as Mat['T'];
const four = (tones: string[]) => [tones[0], tones[1], tones[tones.length - 2], tones[tones.length - 1]];
const card4 = (card: CreatureCard, name: string) => four(card.materials.find((m) => m.name === name)!.tones);
const saturate = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => {
  const u = saturate((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const vdot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const VIEW: V3 = [0, 0.8, 0.6];
function rotate(v: V3, k: V3, a: number): V3 {
  if (!a) return v;
  const c = Math.cos(a),
    sn = Math.sin(a);
  return vadd(vadd(vmul(v, c), vmul(vcross(k, v), sn)), vmul(k, vdot3(k, v) * (1 - c)));
}
/** A tone of a four-tone ramp by light (for pattern colours that bring their own shading). */
const shade = (Tn: Mat['T'], L: number): RGBA => Tn[Math.max(0, Math.min(3, Math.round((L + 0.3) * 2.6)))];

export type PoseSample = (anim: string, t: number) => JointPose;

/** The spring (see the owlet): lag of a follower on a damped spring, from the step response. */
const LAG_K = 16;
const LAG_G: number[] = (() => {
  const w = TAU * 1.8,
    z = 0.3,
    wd = w * Math.sqrt(1 - z * z);
  return Array.from({ length: LAG_K }, (_, k) => {
    const tau = k / 24;
    return -Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
  });
})();

/**
 * Segment angles, index 0 at the head: `th` = pitch of the segment's head-ward direction (+ up), `ps` = its yaw to
 * the right of the heading (+ toward the viewer when it faces east). The rest pose: the neck rises almost upright and
 * bends forward into the head like a swan's; behind the root the body dips and the tail sweeps back, round toward the
 * viewer and up, so the fan stands behind it.
 */
const REST = {
  th: [0.2, 0.8, 1.3, 1.5, 1.56, 1.56, 1.5, 1.3, 0.9, 0.5, 0.3, 0.1, -0.15, -0.45, -0.8, -1.15, -1.4, -1.5, -1.5],
  ps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -0.12, -0.3, -0.5, -0.7, -0.9, -1.05, -1.15, -1.2, -1.2],
};
/**
 * A closed curve in the side plane (forward, up) laid along the body: resampled by arc length to N + 1 joints, the
 * segment angles unwrapped and brought near the rest angles so blending sweeps the short way. Returns the angles and
 * where the root must stand for the curve's centre (`cf`, `cz` relative to the root) to land where wanted.
 */
function curveShape(pts: [number, number][], length: number) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const k = length / total;
  const at = (d: number): [number, number] => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const u = (d - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return [(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u) * k, (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u) * k];
  };
  const Q = Array.from({ length: N + 1 }, (_, j) => at((j / N) * total));
  const th: number[] = [];
  for (let j = 0; j < N; j++) th.push(Math.atan2(Q[j][1] - Q[j + 1][1], Q[j][0] - Q[j + 1][0]));
  for (let j = 1; j < N; j++) while (th[j] - th[j - 1] > Math.PI) th[j] -= TAU;
  for (let j = 1; j < N; j++) while (th[j] - th[j - 1] < -Math.PI) th[j] += TAU;
  let best = 0,
    bestErr = Infinity;
  for (let m = -2; m <= 2; m++) {
    const err = th.reduce((acc, v, j) => acc + Math.abs(v + m * TAU - REST.th[j]), 0);
    if (err < bestErr) (bestErr = err), (best = m);
  }
  const root = Q[ROOT];
  const cf = Q.reduce((a2, q) => a2 + q[0], 0) / Q.length - root[0];
  const cz = Q.reduce((a2, q) => a2 + q[1], 0) / Q.length - root[1];
  const minZ = Math.min(...Q.map((q) => q[1])) - root[1];
  return { th: th.map((v) => v + best * TAU), ps: th.map(() => 0), cf, cz, minZ };
}
/** Колесо: a hoop with the head on top facing forward and the tail tip coming up into its mouth. */
const HOOP = (() => {
  const gap = 0.12 * TAU;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 400; i++) {
    const phi = Math.PI / 2 + gap / 2 + (i / 400) * (TAU - gap);
    pts.push([Math.cos(phi), Math.sin(phi)]);
  }
  return curveShape(pts, N * SEG);
})();
/** Сердечко: the head at the notch, the body round the front lobe to the tip (the root), the tail up the back lobe. */
const HEART = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 600; i++) {
    const t = 0.02 + (i / 600) * (TAU - 0.04);
    pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  return curveShape(pts, N * SEG);
})();
/** Body shapes for poses: each overrides the angles (and moves the root) by its weight. */
export const SHAPES: Record<string, { th: number[]; ps: number[]; z: number; f?: number }> = {
  // Asleep / resting: the body lies in a flat ring on the ground, the tail tucked inside, the neck a low arch with the
  // chin on the coil.
  coil: {
    th: [-0.3, -0.3, -0.25, -0.15, -0.05, 0.05, 0.25, 0.55, 0.75, 0.04, 0.02, 0, 0, 0, 0, -0.02, -0.06, -0.12, -0.2],
    ps: [2.4, 2.25, 2.0, 1.7, 1.35, 1.0, 0.65, 0.35, 0.1, -0.55, -1.15, -1.75, -2.35, -2.95, -3.55, -4.15, -4.7, -5.15, -5.45],
    z: -2.0,
  },
  // A cobra on its coil: the tail ring of `coil` on the ground, the neck upright as at rest (the spring, the hatchling).
  cobra: {
    th: [0.2, 0.75, 1.2, 1.45, 1.56, 1.56, 1.5, 1.35, 1.0, 0.04, 0.02, 0, 0, 0, 0, -0.02, -0.06, -0.12, -0.2],
    ps: [0, 0, 0, 0, 0, 0, 0, 0, 0, -0.55, -1.15, -1.75, -2.35, -2.95, -3.55, -4.15, -4.7, -5.15, -5.45],
    z: -2.0,
  },
  // The hoop's centre on the spin centre, so `spin` rolls it like a wheel.
  hoop: { th: HOOP.th, ps: HOOP.ps, z: SPIN_Z - HOVER - HOOP.cz, f: -HOOP.cf },
  // The heart's tip 1.5 above the ground, centred over the floor point.
  heart: { th: HEART.th, ps: HEART.ps, z: 1.5 - HOVER - HEART.minZ, f: -HEART.cf },
};

interface Palette {
  scale: Mat[];
  head: Mat;
  belly: Mat;
  plume: Mat;
  plumeLight: Mat;
  violet: Mat;
  ruff: Mat;
  ruffDark: Mat;
  horn: Mat;
  eye: Mat;
  pupil: Mat;
  mouth: Mat;
  fang: Mat;
  ink: RGBA;
  pale: RGBA;
  glint: RGBA;
  eyespot: RGBA;
}

/** Radius of the body at a joint (0 = head end, 1 = tail tip). */
export const radius = (s: number) => (s < 0.42 ? 1.2 + 0.62 * Math.sin((Math.PI / 2) * (s / 0.42)) : 1.82 * (1 - 0.76 * ((s - 0.42) / 0.58) ** 1.35));

export function serpentFrame(
  card: CreatureCard,
  route: MotionPlan,
  sample: PoseSample,
  loops: Record<string, number>,
  lengths: Record<string, number>,
): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const cache = new Map<Variant, Palette>();
  const palettes = (variant: Variant): Palette => {
    const hit = cache.get(variant);
    if (hit) return hit;
    const g = variant === 'gold';
    const pick = (name: string, warm = 0.5) => (g ? gold(card4(card, name), warm) : T(card4(card, name)));
    const scaleT = pick('scale', 0.55),
      plumeT = pick('plume', 0.45);
    const belly = pick('belly', 0.1);
    // Diamond scales: a seam lattice in a colour between the dark tones (the finish keeps off-palette colours), the
    // belly in golden plates with darker seams, all shaded by the light the pattern is given.
    const scaleMat = (k: number): Mat => {
      const w = smooth(0.42, 1.05, k / N);
      const Tk = scaleT.map((c, i) => mixc(c, plumeT[i], w)) as Mat['T'];
      const stripe = mixc(Tk[1], Tk[2], 0.45);
      const spot = mixc(mixc(Tk[3], plumeT[3], 0.5), hx('#c8fff0'), 0.25);
      const spotDark = mixc(Tk[2], plumeT[2], 0.5);
      return {
        T: Tk,
        pat: (q, L) => {
          if (q[2] < -0.4 + 0.12 * Math.abs(q[1])) {
            const plate = Math.abs(((q[0] * 1.6 + 2.5) % 1) - 0.5) < 0.09;
            return plate ? mixc(belly[1], belly[2], 0.5) : shade(belly, L + 0.15);
          }
          // A darker stripe down the spine; a row of pale diamond spots along each flank, one per segment.
          if (q[2] > 0.8 && Math.abs(q[1]) < 0.32) return stripe;
          const dz = Math.abs(q[2] - 0.22),
            dx = Math.abs(q[0] - (k % 2 ? 0.12 : -0.12));
          if (Math.abs(q[1]) > 0.45 && dx * 1.3 + dz * 1.9 < 0.42) return L > 0.2 ? spot : spotDark;
          return null;
        },
      };
    };
    const scales = Array.from({ length: N }, (_, k) => scaleMat(k));
    const p: Palette = {
      scale: scales,
      head: { ...scaleMat(0), pat: (q, L) => (q[2] < -0.45 ? shade(belly, L + 0.1) : null) },
      belly: { T: belly, bias: 0.06 },
      plume: { T: plumeT },
      plumeLight: { T: plumeT, bias: 0.18 },
      violet: { T: pick('violet', 0.4), bias: 0.1, glow: 0.12 },
      ruff: { T: pick('ruff', 0.2), bias: 0.08 },
      ruffDark: { T: pick('ruff', 0.2), bias: -0.12 },
      horn: { T: pick('horn', 0.1), spec: true },
      eye: { T: pick('eye', 0), bias: 0.15 },
      pupil: { T: T(['#08040a', '#120a14', '#22142a', '#34203e']), flat: 1 },
      mouth: { T: pick('mouth', 0.1) },
      fang: { T: T(['#9a948a', '#d8d2c4', '#f4f0e6', '#ffffff']), bias: 0.3 },
      ink: hx('#0e1a14'),
      pale: hx('#fffbe8'),
      glint: g ? hx('#fff4c0') : hx('#e8fff4'),
      eyespot: g ? hx('#ffe9a0') : hx('#d898ff'),
    };
    cache.set(variant, p);
    return p;
  };

  return (anim, t, side, variant, steer) => {
    const pose: JointPose = { ...sample(anim, t), ...steer?.techniquePose };
    const get = (k: string) => pose[k] ?? 0;
    const M = palettes(variant);
    const l = life(anim, t, 0);
    const walking = anim === 'walk',
      turning = anim === 'turn';
    const gaitPhase = steer?.gaitPhase ?? t;
    const lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const sub = turning && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const heading = route.yaw + ((side + sub) * Math.PI) / 8;
    const cycle = (walking ? gaitPhase : t / 3) * TAU;
    // Idle motions run a whole number of cycles in every clip, so each clip starts and ends on the rest pose.
    const clipT = lengths[anim] ?? 3;
    const ph = (hz: number, at = 0) => TAU * Math.max(1, Math.round(hz * clipT)) * (t / clipT) + at;
    const resting = anim === 'idle' || anim === 'sleep' || anim === 'look';
    const breathe = resting ? Math.sin(l.q) : 0;

    // ---- the spring --------------------------------------------------------------------------------------------
    const hist: JointPose[] = Array.from({ length: LAG_K + 1 }, (_, k) => {
      if (k === 0) return pose;
      let at = t - k / 24;
      const loop = loops[anim];
      if (at < 0) at = loop ? ((at % loop) + loop) % loop : 0;
      return { ...sample(anim, at), ...steer?.techniquePose };
    });
    const wrapPi = (d: number) => ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    const lag = (fn: (p: JointPose) => number, wrap = false) => {
      let sum = 0;
      for (let k = 0; k < LAG_K; k++) {
        const d = fn(hist[k]) - fn(hist[k + 1]);
        sum += LAG_G[k] * (wrap ? wrapPi(d) : d);
      }
      return sum;
    };
    const g0 = (p: JointPose, k: string) => p[k] ?? 0;
    const lagUp = lag((p) => g0(p, 'lift') - g0(p, 'dy') / scale + 2 * g0(p, 'rise')) + (walking ? 0.4 * Math.sin(cycle * 2 - 1.2) : 0);
    const lagSide = lag((p) => g0(p, 'dx') / scale + 4 * g0(p, 'roll') + 2 * g0(p, 'sway')) + lag((p) => 2 * (g0(p, 'yaw') + g0(p, 'headYaw') * 0.5), true);
    const lagHead = lag((p) => g0(p, 'headYaw'), true) + lag((p) => g0(p, 'nod') + g0(p, 'headRoll'));

    // ---- the spine ----------------------------------------------------------------------------------------------
    const lift = get('lift') + (walking ? 0.35 * Math.sin(cycle * 2 - 0.8) : 0) + 0.12 * breathe;
    const roller = F3.yaw(0).at(0, 0, SPIN_Z).pitch(get('spin')).at(0, 0, -SPIN_Z);
    const yawB = heading + get('yaw') + lead * 0.25;
    // A barrel roll turns about the middle of the body, not the floor.
    const bodyF = roller.turn(yawB).at(get('lean'), get('sway'), ROLL_Z).roll(get('roll')).at(0, 0, -ROLL_Z);
    const floor = F3.yaw(heading + get('yaw'));
    // Angles: the rest profile, the named shapes by weight, then the wave and the spring on top.
    const weights = Object.keys(SHAPES).map((k) => [SHAPES[k], saturate(get(k))] as const);
    const total = weights.reduce((a, [, w]) => a + w, 0);
    const rest = Math.max(0, 1 - total);
    const norm = Math.max(1, total);
    const th: number[] = [],
      ps: number[] = [];
    let rootZ = HOVER * rest,
      rootF = 0;
    for (const [shape, w] of weights) {
      rootZ += (HOVER + shape.z) * (w / norm);
      rootF += (shape.f ?? 0) * (w / norm);
    }
    const waveA = get('wave') + (walking ? 0.3 : 0.07) + 0.05 * Math.abs(lagSide);
    const waveP = (walking ? cycle : ph(0.5)) + get('wavePhase');
    const vwaveA = get('vwave') + (walking ? 0.16 : 0.04);
    const bend = get('bend');
    const rise = get('rise'),
      tailUp = get('tailUp'),
      curl = get('curl');
    for (let k = 0; k < N; k++) {
      const s = k / (N - 1);
      let a = REST.th[k] * rest,
        b = REST.ps[k] * rest;
      for (const [shape, w] of weights) {
        a += shape.th[k] * (w / norm);
        b += shape.ps[k] * (w / norm);
      }
      const body = smooth(0.25, 0.6, s);
      if (k < ROOT) {
        a += rise * 0.18 * (1 - k / ROOT) * (k > 0 ? 1 : 0.4) - 0.12 * l.tired * (1 - k / ROOT);
        // `bend` curls the neck sideways and back (to preen a wing, to look at the tail).
        b += bend * 2.3 * ((ROOT - k) / ROOT) ** 1.3;
      }
      else a -= tailUp * 0.16 * ((k - ROOT) / (N - ROOT));
      b += curl * 0.35 * smooth(0.6, 1, s);
      b += waveA * Math.sin(TAU * s * 1.15 - waveP) * (0.15 + 0.85 * body);
      a += vwaveA * Math.sin(TAU * s * 0.9 - waveP - 1.0) * body;
      // The tail lags: sideways and up, more toward the tip.
      b += -0.06 * lagSide * smooth(0.45, 1, s);
      a += 0.05 * lagUp * smooth(0.45, 1, s);
      th.push(a);
      ps.push(b);
    }
    const P: V3[] = new Array(N + 1);
    const dirs: V3[] = new Array(N);
    for (let k = 0; k < N; k++) dirs[k] = vnorm(bodyF.v(Math.cos(th[k]) * Math.cos(ps[k]), Math.cos(th[k]) * Math.sin(ps[k]), Math.sin(th[k])));
    P[ROOT] = bodyF.p(rootF, 0, rootZ + lift);
    for (let k = ROOT - 1; k >= 0; k--) P[k] = vadd(P[k + 1], vmul(dirs[k], SEG));
    for (let k = ROOT; k < N; k++) P[k + 1] = vsub(P[k], vmul(dirs[k], SEG));
    // Frames along the spine, transported from the root so the back stays the back through every bend.
    const frames: F3[] = new Array(N);
    const frameAt = (k: number, uPrev: V3) => {
      const f = dirs[k];
      const u = vnorm(vsub(uPrev, vmul(f, vdot3(uPrev, f))));
      return new F3(vlerp(P[k], P[k + 1], 0.5), f, vcross(u, f), u);
    };
    frames[ROOT] = frameAt(ROOT, bodyF.u);
    for (let k = ROOT + 1; k < N; k++) frames[k] = frameAt(k, frames[k - 1].u);
    for (let k = ROOT - 1; k >= 0; k--) frames[k] = frameAt(k, frames[k + 1].u);
    const rad = (k: number) => radius(k / N) * (1 + 0.04 * get('puff')) * (1 - 0.32 * saturate(get('slim')));

    // ---- the head -----------------------------------------------------------------------------------------------
    // `follow` turns the head along the top of the neck (asleep on the coil, biting its tail in the hoop).
    const follow = saturate(get('follow'));
    const yawH = get('headYaw') + lead * 0.5 + follow * ps[0];
    const headF0 = new F3(P[0], bodyF.f, bodyF.s, bodyF.u).turn(yawH).pitch(get('nod') + 0.08 - follow * th[0]).roll(get('headRoll'));
    const headF = headF0.at(0.9 * HEAD, 0, 0.55 * HEAD).scale(HEAD);

    const points: Record<string, V3> = {
      floor: [0, 0, 0],
      chest: P[ROOT],
      body: P[ROOT + 3],
      neck: P[3],
      tailMid: P[ROOT + 6],
      tailTip: P[N],
      head: headF.o,
      nose: headF.p(3.5, 0, 0),
      mouth: headF.p(2.8, 0, -0.95),
    };

    // ---- the wings ------------------------------------------------------------------------------------------------
    const spread = 0.42 + get('wings');
    const flapBeat = walking ? 0.55 * Math.sin(cycle * 2) : resting ? 0.04 * Math.sin(ph(1.5)) : 0;
    const wings = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const F = frames[ROOT - 1];
      const up: V3 = [0, 0, 1];
      const sd = vnorm(vmul(bodyF.s, sign));
      const back = vmul(bodyF.f, -1);
      const flap = get('flap') + get('flap' + suffix) + flapBeat;
      const sp = saturate(spread + get('wing' + suffix));
      const base = vadd(F.o, vadd(vmul(sd, rad(ROOT - 1) * 0.75), vmul(up, rad(ROOT - 1) * 0.55)));
      // The arm: out to the side and up, swept back when folded; the hand sweeps further back.
      const el = 0.15 + 1.9 * Math.min(sp, 0.42) - 0.9 * Math.max(0, sp - 0.42) + 0.5 * flap,
        sw = 0.95 - 0.75 * sp;
      const armDir = vnorm(vadd(vadd(vmul(sd, Math.cos(el) * Math.cos(sw)), vmul(up, Math.sin(el))), vmul(back, Math.cos(el) * Math.sin(sw))));
      const ws = 1 - 0.55 * saturate(get('tuck'));
      const elbow = vadd(base, vmul(armDir, 2.8 * ws));
      const el2 = el + 0.2 + 0.25 * flap,
        sw2 = sw + 0.55 - 0.35 * sp;
      const handDir = vnorm(vadd(vadd(vmul(sd, Math.cos(el2) * Math.cos(sw2)), vmul(up, Math.sin(el2))), vmul(back, Math.cos(el2) * Math.sin(sw2))));
      const wrist = vadd(elbow, vmul(handDir, 3.0 * ws));
      // Trailing direction (the feathers' way): back and a little down, kept square to the hand.
      let trail = vadd(vmul(back, 0.9), vmul(up, -0.35 - 0.3 * flap));
      trail = vnorm(vsub(trail, vmul(handDir, vdot3(trail, handDir))));
      const n = vnorm(vcross(handDir, trail));
      const tip = vadd(wrist, vmul(vnorm(vadd(handDir, vmul(trail, 0.5))), 6.6 * ws));
      points['wing' + suffix] = tip;
      return { sign, suffix, base, elbow, wrist, armDir, handDir, trail, n, sp, flap, ws };
    });

    // ---- the tail fan -----------------------------------------------------------------------------------------------
    const fanOpen = saturate(0.7 + get('fan'));
    const tailF = frames[N - 1];
    const fanBack = vmul(tailF.f, -1);
    const fanMean = vnorm(vadd(vmul(fanBack, Math.cos(0.3)), vmul(tailF.u, Math.sin(0.3))));
    const fanAxis = tailF.s;
    const fan = Array.from({ length: 5 }, (_, j) => {
      const off = (j - 2) / 2;
      const flutter = 0.05 * Math.sin(ph(1.3, j * 1.7)) + 0.04 * lagSide * (1 - Math.abs(off));
      const a = off * (0.25 + 0.75 * fanOpen) + flutter + 0.05 * lagUp;
      const dir = rotate(fanMean, fanAxis, a);
      const len = 6.6 + 0.9 * (1 - Math.abs(off));
      return { dir, len, j };
    });
    points.fan = vadd(P[N], vmul(fanMean, 6.0));

    // ---- head parts -------------------------------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const at = headF.p(1.0, sign * 1.32, 0.72);
      const out = vnorm(headF.v(0.6, sign * 0.8, 0.22));
      points['eye' + suffix] = vadd(at, vmul(out, 1.0));
      return { sign, suffix, at, out };
    });
    const crestUp = get('crest') + 0.06 * lagUp;
    // The crest fans out in the head's own plane: from a low feather along the nape to an upright one.
    const CREST_LEN = [4.4, 5.4, 6.2, 5.8, 4.6];
    const crest = Array.from({ length: 5 }, (_, j) => {
      const e = 0.3 + 0.26 * j + (0.25 + 0.1 * j) * crestUp - 0.05 * lagHead * (1 + j * 0.2);
      const yy = (j % 2 ? 0.16 : -0.16) + 0.03 * lagSide;
      const base = headF.p(-1.05 + 0.12 * j, (j % 2 ? 0.2 : -0.2), 1.0 + 0.1 * j);
      const dir = vnorm(headF.v(-Math.cos(e), yy, Math.sin(e)));
      return { base, dir, len: CREST_LEN[j] * (1 + 0.08 * crestUp), j };
    });
    points.crown = vadd(crest[4].base, vmul(crest[4].dir, crest[4].len));

    // ---- drawing --------------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    const blink = l.blink > 0.5 || get('blink') > 0.5;
    if (!hidden) {
      drawBody(r, P, frames, rad, M, get('fluff'), late);
      drawFan(r, P[N], fan, fanAxis, M, ph(1.5) + 2 * get('shimmer'), late);
      for (const w of wings) drawWing(r, w, M, rad(ROOT - 1), late);
      drawRuff(r, frames, rad, M, get('fluff'));
      drawHead(r, headF, eyes, crest, M, get, blink, late, 0.25 * Math.sin(ph(0.7)) + 0.12 * lagSide + 0.15 * lagHead + 0.1 * lagUp);
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    const fin: [Mat, 'fur' | 'skin' | 'metal'][] = [
      [M.head, 'skin'],
      [M.belly, 'skin'],
      [M.plume, 'skin'],
      [M.plumeLight, 'skin'],
      [M.violet, 'skin'],
      [M.ruff, 'fur'],
      [M.ruffDark, 'fur'],
      [M.horn, 'metal'],
      [M.mouth, 'skin'],
    ];
    finishSurfaces(r, floor, [...M.scale.map((m) => [m, 'skin'] as [Mat, 'skin']), ...fin], 'skin');
    for (const draw of late) draw();
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#0e1a14';
    const anchorAt: [number, number] = [Math.round(size * 0.5), Math.round(size * 0.8)];
    let frame: BodyFrame;
    if (overAll) {
      const empty = new Rig();
      frame = projectFigure(empty, size, anchorAt, points, ink, 3.6, true);
      const pad = 110,
        big = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      const out = renderRig(r, big, big, ...anchor, { outline: hx(ink), inner: 3.6 });
      frame.px = renderRig(empty, big, big, ...anchor, { outline: hx(ink), inner: 3.6 }).p;
      frame.over = out.p;
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.primitives = r.prims.length;
    } else frame = projectFigure(r, size, anchorAt, points, ink, 3.6, true);
    const air = Math.max(0, Math.min(...P.map((p) => p[2])));
    frame.groundShadow =
      hidden || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (size * 0.34) / (1 + air * 0.04), opacity: 0.5 / (1 + air * 0.06), reflectionOpacity: frame.px.w > size ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('rot')) frame.rot = get('rot');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = [];
    return frame;
  };
}

type Get = (k: string) => number;

/** A flat feather: a vane (ellipsoid flat in the plane with normal `n`), a tip of another colour, a gold shaft. */
function feather(r: Rig, base: V3, dir: V3, n: V3, len: number, w: number, vane: Mat, tipMat: Mat | null, shaft: RGBA | null, late: (() => void)[], tipK = 0.3) {
  const wd = vnorm(vcross(n, dir));
  const nn = vcross(dir, wd);
  r.ell(new F3(vadd(base, vmul(dir, len * 0.5)), dir, wd, nn), [0, 0, 0], [len * 0.5, w, 0.16], vane);
  if (tipMat) r.ell(new F3(vadd(base, vmul(dir, len * (1 - tipK * 0.75))), dir, wd, nn), [0, 0, 0], [len * tipK * 0.75, w * 0.92, 0.2], tipMat);
  if (shaft) {
    const tag = r.tag;
    late.push(() => {
      r.tag = tag;
      r.line(vadd(base, vmul(dir, len * 0.08)), vadd(base, vmul(dir, len * 0.82)), shaft, 0, 0.45);
    });
  }
}

function drawBody(r: Rig, P: V3[], frames: F3[], rad: (k: number) => number, M: Palette, fluff: number, late: (() => void)[]) {
  r.tag = 'body';
  for (let k = 0; k < N; k++) {
    if (k < ROOT - 1) r.tag = 'neck';
    else if (k > ROOT + 4) r.tag = 'tail';
    else r.tag = 'body';
    const F = frames[k];
    const rr = rad(k),
      r2 = rad(k + 1);
    const rm = (rr + r2) * 0.5;
    r.ell(F, [0, 0, 0], [SEG * 0.64 + rm * 0.18, rm, rm * 0.94], M.scale[k]);
  }
  // The tail tip rounds off; two gold rings hold the fan.
  r.ball(P[N], rad(N) * 0.9, M.scale[N - 1]);
  r.tag = 'tail';
  for (const along of [0.15, -0.4]) {
    const F = frames[N - 1];
    const rr = rad(N - 0.5 + along * 0.5);
    r.ell(F, [along * SEG, 0, 0], [0.24, rr * 1.12, rr * 1.12], M.horn);
  }
  // Gold spines down the back, sapphire tufts between them from the root on.
  r.tag = 'ridge';
  for (let k = 1; k < N - 2; k++) {
    const F = frames[k];
    const rm = rad(k + 0.5);
    const base = F.p(0, 0, rm * 0.86);
    const dir = vnorm(vadd(vmul(F.u, 0.75), vmul(F.f, -0.62)));
    r.spike(base, dir, 0.55 + 0.45 * rm, 0.28 + 0.06 * rm, M.horn, 3, 0.4);
    if (k >= ROOT - 1 && k < N - 3) {
      const tb = F.p(-SEG * 0.5, 0, rm * 0.8);
      for (const sgn of [-1, 1]) {
        const d = vnorm(vadd(vadd(vmul(F.u, 0.55 + 0.2 * fluff), vmul(F.f, -0.8)), vmul(F.s, sgn * 0.28)));
        feather(r, tb, d, F.s, (k % 2 ? 1.3 : 1.7) + 0.3 * rm, 0.42, k % 2 ? M.plume : M.plumeLight, M.violet, null, late, 0.35);
      }
    }
  }
}

function drawRuff(r: Rig, frames: F3[], rad: (k: number) => number, M: Palette, fluff: number) {
  // A scarlet collar on the throat: two rows round the lower neck, feathers pointing down the neck and out; the lower
  // row darker and longer.
  r.tag = 'ruff';
  const late: (() => void)[] = [];
  for (const [row, k, len, mat] of [
    [1, ROOT - 2, 2.3, M.ruffDark],
    [0, ROOT - 3, 1.8, M.ruff],
  ] as [number, number, number, Mat][]) {
    const F = frames[k];
    const rm = rad(k + 0.5);
    const n = 9;
    for (let j = 0; j < n; j++) {
      const a = (j / (n - 1) - 0.5) * Math.PI * 1.6 + (row ? 0.12 : 0);
      const radial = vadd(vmul(F.u, -Math.cos(a)), vmul(F.s, Math.sin(a)));
      const base = vadd(F.o, vmul(radial, rm * 0.8));
      const dir = vnorm(vadd(vmul(F.f, -0.75), vmul(radial, 0.75 + 0.25 * fluff)));
      feather(r, base, dir, vnorm(vcross(dir, F.f)), len * (0.85 + 0.25 * Math.cos(a) * Math.cos(a)) * (1 + 0.15 * fluff), 0.5, mat, null, null, late);
    }
  }
}

function drawWing(
  r: Rig,
  w: { sign: number; suffix: string; base: V3; elbow: V3; wrist: V3; armDir: V3; handDir: V3; trail: V3; n: V3; sp: number; flap: number; ws: number },
  M: Palette,
  rootR: number,
  late: (() => void)[],
) {
  r.tag = 'wing' + w.suffix;
  const gold = M.horn.T[2];
  // The far wing sits in the body's shade and read as one dark patch over the tail: lift its feathers a little.
  const far = vdot3(vsub(w.wrist, w.base), VIEW) < -0.2 || vdot3(w.n, VIEW) * w.sign < -0.5;
  if (far) M = { ...M, plume: { ...M.plume, bias: 0.16 }, plumeLight: { ...M.plumeLight, bias: 0.3 }, violet: { ...M.violet, bias: 0.24 } };
  // Thin gold bones and a claw on the bend.
  r.cap(w.base, w.elbow, 0.36, 0.28, M.horn);
  r.cap(w.elbow, w.wrist, 0.28, 0.2, M.horn);
  r.spike(w.elbow, vadd(w.armDir, vmul(w.trail, -0.4)), 0.7, 0.16, M.horn, 3);
  // Primaries: seven long ones fanned from the wrist, from along the hand to the trailing edge, violet tips.
  for (let j = 0; j < 7; j++) {
    const a = j / 6;
    const dir = vnorm(vadd(vmul(w.handDir, 1 - a * 0.9), vmul(w.trail, 0.25 + a * 1.1)));
    const len = (6.4 - 1.6 * a + 0.3 * Math.sin(j * 1.3)) * w.ws;
    feather(r, vadd(w.wrist, vmul(w.handDir, -0.2 * j)), dir, w.n, len, 0.62, j % 2 ? M.plume : M.plumeLight, M.violet, gold, late);
  }
  // Secondaries along the forearm, toward the trailing edge.
  for (let j = 0; j < 6; j++) {
    const a = (j + 0.5) / 6;
    const at = vlerp(w.wrist, w.elbow, a);
    const dir = vnorm(vadd(w.trail, vmul(w.handDir, 0.25 - 0.25 * a)));
    feather(r, at, dir, w.n, (4.2 - 0.6 * a) * w.ws, 0.62, j % 2 ? M.plumeLight : M.plume, M.violet, gold, late, 0.25);
  }
  // Tertials along the arm, shorter.
  for (let j = 0; j < 4; j++) {
    const a = (j + 0.5) / 4;
    const at = vlerp(w.elbow, w.base, a);
    feather(r, at, vnorm(vadd(w.trail, vmul(w.armDir, -0.15))), w.n, (3.3 - 0.7 * a) * w.ws, 0.58, M.plume, M.violet, null, late, 0.25);
  }
  // Coverts: emerald rows over the bones.
  for (let j = 0; j < 6; j++) {
    const a = (j + 0.5) / 6;
    const at = j < 3 ? vlerp(w.base, w.elbow, a * 2) : vlerp(w.elbow, w.wrist, (a - 0.5) * 2);
    const along = j < 3 ? w.armDir : w.handDir;
    feather(r, vadd(at, vmul(w.n, 0.12)), vnorm(vadd(w.trail, vmul(along, 0.3))), w.n, 1.7, 0.6, M.scale[ROOT - 1], null, null, late);
    // Small marginal coverts along the leading edge, a lighter emerald.
    feather(r, vadd(at, vmul(w.n, 0.2)), vnorm(vadd(w.trail, vmul(along, 0.6))), w.n, 1.05, 0.5, M.scale[N - 6], null, null, late);
  }
  // The alula: three little feathers on the wrist pointing along the hand.
  for (let j = 0; j < 3; j++) {
    const d = vnorm(vadd(w.handDir, vmul(w.trail, 0.15 + 0.2 * j)));
    feather(r, vadd(w.wrist, vmul(w.n, 0.15)), d, w.n, 1.9 - 0.3 * j, 0.42, M.plumeLight, M.violet, null, late, 0.3);
  }
  void rootR;
}

function drawFan(r: Rig, at: V3, fan: { dir: V3; len: number; j: number }[], axis: V3, M: Palette, twinkle: number, late: (() => void)[]) {
  r.tag = 'fan';
  // Short feathers between the long ones.
  for (let j = 0; j < 4; j++) {
    const d = vnorm(vadd(fan[j].dir, fan[j + 1].dir));
    feather(r, at, d, axis, 3.4, 0.5, M.plume, M.violet, null, late, 0.3);
    // A shorter violet one in front of it.
    feather(r, vadd(at, vmul(vcross(axis, d), 0.1)), vnorm(vadd(d, vmul(fan[j].dir, 0.4))), axis, 2.3, 0.42, M.violet, M.plumeLight, null, late, 0.35);
  }
  // Gold beads where the long feathers grow.
  for (const f of fan) r.ball(vadd(at, vmul(f.dir, 0.5)), 0.26, M.horn);
  for (const f of fan) {
    // A bare gold shaft, then the vane on the outer half and an eye at the end.
    const shaftEnd = vadd(at, vmul(f.dir, f.len * 0.5));
    r.cap(at, shaftEnd, 0.2, 0.14, M.horn);
    const wd = vnorm(vcross(axis, f.dir));
    const nn = vcross(f.dir, wd);
    const vc = vadd(at, vmul(f.dir, f.len * 0.74));
    r.ell(new F3(vc, f.dir, wd, nn), [0, 0, 0], [f.len * 0.26, 0.66, 0.16], f.j % 2 ? M.plume : M.plumeLight);
    const eye = vadd(at, vmul(f.dir, f.len * 0.84));
    r.ell(new F3(eye, f.dir, wd, nn), [0, 0, 0], [0.82, 0.72, 0.22], M.horn);
    r.ell(new F3(eye, f.dir, wd, nn), [0, 0, 0], [0.48, 0.42, 0.26], M.violet);
    const tw = 0.6 + 0.4 * Math.sin(twinkle + f.j * 2.1);
    late.push(() => {
      r.tag = 'fan';
      r.dot(vadd(eye, vmul(nn, 0.3)), M.eyespot, 0.35 + 0.4 * tw, 1, 0.9);
      r.line(shaftEnd, vadd(at, vmul(f.dir, f.len * 0.95)), M.horn.T[3], 0, 0.5);
    });
  }
}

function drawHead(
  r: Rig,
  Hf: F3,
  eyes: { sign: number; suffix: string; at: V3; out: V3 }[],
  crest: { base: V3; dir: V3; len: number; j: number }[],
  M: Palette,
  get: Get,
  blink: boolean,
  late: (() => void)[],
  whisk: number,
) {
  r.tag = 'head';
  // A round skull, a short snout, a golden lower jaw; the jaw drops with `mouth`.
  r.ell(Hf, [0, 0, 0.35], [2.05, 1.7, 1.6], M.head);
  r.tag = 'snout';
  r.ell(Hf, [2.0, 0, -0.1], [1.6, 1.18, 0.98], M.head);
  const tongue = saturate(get('tongue'));
  const open = Math.max(saturate(get('mouth')), 0.22 * tongue);
  r.tag = 'jaw';
  const jawF = Hf.at(0.4, 0, -0.75).pitch(0.45 * open);
  r.ell(jawF, [1.25, 0, -0.35], [1.75, 1.0, 0.52], M.belly);
  if (open > 0.05) {
    r.ell(Hf.at(0.4, 0, -0.75).pitch(0.2 * open), [1.4, 0, -0.1], [1.35, 0.78, 0.35 + 0.35 * open], M.mouth);
    r.ell(jawF, [1.3, 0, 0.05], [0.7, 0.35, 0.15], { ...M.mouth, bias: 0.25 });
  }
  // Gold whiskers from the snout tip, flowing back and waving on the spring.
  r.tag = 'snout';
  for (const s of [-1, 1]) {
    let at = Hf.p(2.7, s * 0.85, -0.45);
    let dir = vnorm(Hf.v(0.1, s * 0.55, -0.85));
    for (let k = 0; k < 4; k++) {
      dir = vnorm(vadd(dir, Hf.v(-0.6, -s * 0.05, 0.12 + 0.2 * whisk * (k + 1) * 0.5)));
      const next = vadd(at, vmul(dir, 0.95));
      r.cap(at, next, 0.24 - 0.03 * k, 0.21 - 0.03 * k, M.horn);
      at = next;
    }
  }
  // A scarlet beard under the jaw.
  r.tag = 'ruff';
  for (let j = 0; j < 3; j++) {
    const d = vnorm(Hf.v(-0.6, (j - 1) * 0.35, -1));
    feather(r, Hf.p(1.1 - 0.25 * j, (j - 1) * 0.3, -1.2), d, vnorm(vcross(d, Hf.f)), 1.2, 0.36, j === 1 ? M.ruff : M.ruffDark, null, null, late);
  }
  // Feathered ear fins behind the eyes.
  r.tag = 'head';
  for (const s of [-1, 1])
    for (let j = 0; j < 3; j++) {
      const d = vnorm(Hf.v(-1, s * (0.75 + 0.12 * j), 0.4 - 0.35 * j));
      feather(r, Hf.p(-0.55, s * 1.4, 0.55 - 0.2 * j), d, vnorm(vcross(d, Hf.f)), 2.0 - 0.25 * j, 0.44, M.plumeLight, M.violet, null, late, 0.35);
    }
  // The forked tongue flicks out of the mouth.
  if (tongue > 0.05) {
    r.tag = 'jaw';
    const tb = Hf.p(2.6, 0, -0.75);
    const tm = Hf.p(2.6 + 1.5 * tongue, 0, -0.85 - 0.15 * tongue);
    r.cap(tb, tm, 0.2, 0.15, { ...M.mouth, bias: 0.3 });
    for (const sg of [-1, 1]) r.cap(tm, vadd(tm, Hf.v(0.55 * tongue, sg * 0.28 * tongue, -0.12)), 0.13, 0.06, { ...M.mouth, bias: 0.3 });
  }
  // A tiny fang at the corner.
  r.spike(Hf.p(2.55, 0.62, -0.75), Hf.v(0.1, 0.05, -1), 0.55, 0.16, M.fang, 3);
  // Brows: strict ridges over the eyes.
  r.tag = 'head';
  for (const s of [-1, 1]) {
    const bF = new F3(Hf.p(1.0, s * 1.2, 1.72 + 0.3 * get('browUp')), Hf.f, Hf.s, Hf.u).roll(s * (0.3 - 0.4 * get('browUp')));
    r.ell(bF, [0, 0, 0], [0.85, 0.42, 0.24], M.scale[1]);
  }
  // Gold horns swept back.
  r.tag = 'horns';
  for (const s of [-1, 1]) {
    const b = Hf.p(-0.55, s * 0.9, 1.35);
    const m = vadd(b, vmul(vnorm(Hf.v(-0.75, s * 0.35, 0.95)), 1.2));
    const tip = vadd(m, vmul(vnorm(Hf.v(-1, s * 0.12, 0.25)), 1.25));
    r.cap(b, m, 0.42, 0.28, M.horn);
    r.cap(m, tip, 0.28, 0.07, M.horn);
  }
  // The crest: five long feathers on the nape, sapphire with violet tips and gold shafts.
  r.tag = 'crest';
  for (const c of crest) feather(r, c.base, c.dir, Hf.s, c.len, 0.55, c.j % 2 ? M.plume : M.plumeLight, M.violet, M.horn.T[3], late, 0.32);
  // Cheek fans: three short scarlet feathers on each cheek.
  r.tag = 'ruff';
  for (const s of [-1, 1])
    for (let j = 0; j < 3; j++) {
      const d = vnorm(Hf.v(-0.9, s * 0.55, 0.35 - j * 0.38));
      feather(r, Hf.p(-0.35, s * 1.35, -0.25), d, vnorm(vcross(d, Hf.u)), 1.7 - 0.15 * j, 0.42, j === 1 ? M.ruffDark : M.ruff, null, null, late);
    }
  // Big amber eyes: an iris, a large dark pupil, two highlights; lids of scale; closed = a curve, happy = an arch.
  const joy = get('joy') > 0.5;
  for (const e of eyes) {
    r.tag = 'eye' + e.suffix;
    const lid = Math.max(blink || joy ? 1 : 0, get('lid'), get('lid' + e.suffix));
    const look = Hf.v(0, (get('lookX') - get('cross') * e.sign) * 0.22, (get('lookY') - 0.4 * get('cross')) * 0.22);
    if (lid < 0.95) {
      r.ball(e.at, 1.0, M.eye);
      const pc = vadd(vadd(e.at, vmul(e.out, 0.62)), look);
      r.ell(new F3(pc, e.out, Hf.s, Hf.u), [0, 0, 0], [0.4, 0.42 + 0.12 * get('wide'), 0.66 + 0.1 * get('wide')], M.pupil);
      if (vdot3(e.out, VIEW) > -0.15)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const cc = vadd(vadd(e.at, vmul(e.out, 1.0)), look);
          r.dot(vadd(cc, Hf.v(0, -0.3, 0.35)), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(cc, Hf.v(0, 0.25, -0.3)), hx('#fff0c0'), 0, 1, 0.9);
        });
    }
    if (lid > 0.05) {
      const ln = 1 - 2 * lid;
      const lidF = new F3(e.at, e.out, Hf.s, vnorm(vcross(e.out, Hf.s)));
      r.ell(lidF, [0, 0, 0], [1.08, 1.08, 1.08], M.head, (q) => q[2] < ln);
      if (lid > 0.9 && vdot3(e.out, VIEW) > -0.1)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const cc = vadd(e.at, vmul(e.out, 1.1));
          const k = joy ? -1 : 1;
          r.line(vadd(cc, Hf.v(0, -0.7, 0.15 * k)), vadd(cc, Hf.v(0, 0, -0.25 * k)), M.ink, 0, 1);
          r.line(vadd(cc, Hf.v(0, 0, -0.25 * k)), vadd(cc, Hf.v(0, 0.7, 0.15 * k)), M.ink, 0, 1);
        });
    }
  }
  late.push(() => {
    r.tag = 'snout';
    // Nostrils, the smile line with a curled corner, a highlight on the snout.
    for (const s of [-1, 1]) r.dot(Hf.p(3.4, s * 0.42, 0.28), M.ink, 0, 1, 0.6);
    r.line(Hf.p(3.3, 0.3, -0.55), Hf.p(2.2, 0.95, -0.6), M.ink, 0, 0.7);
    r.line(Hf.p(2.2, 0.95, -0.6), Hf.p(1.95, 1.05, -0.35), M.ink, 0, 0.7);
    if (get('blush') > 0) for (const s of [-1, 1]) if (vdot3(Hf.v(0.3, s, 0), VIEW) > 0.05) r.dot(Hf.p(1.0, s * 1.55, -0.3), hx('#ff8a9a'), 0, 1, 0.5 + 0.4 * saturate(get('blush')));
  });
  void hash;
}

export type { Palette };
