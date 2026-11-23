// Ушастик, the owlet. Its own skeleton: a pear-shaped body on two short feathered legs, a big round head on a short
// neck that turns like an owl's (far past the shoulder, a full spin in a trick), two wings built from real feathers
// (coverts, six secondaries on the forearm, six primaries on the hand) that fold along the sides down to the tail and
// open into a fan, a short fan of a tail. The face: a pale facial disk with a dark rim and radial streaks, huge amber
// eyes whose pupils dilate and look about, white brows that carry the mood, a small hooked beak. Ear tufts and a curl
// on the crown are on a spring: they lag every move of the head and body and swing back after it stops, which is the
// owlet's «secondary motion with character» (canon §5, uncommon). `fluff` puffs the plumage up, negative makes it
// slim and tall like a startled owl. `spin` rolls the whole figure in the picture plane round the body's centre.
// Pose keys (all optional, 0 = rest) are read through `get`; positions are rig units before `card.proportions.scale`.
import type { CreatureCard } from '../bodies/card-data';
import { goalAt, toLocal } from '../bodies/goals';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { life, pointsOnlyActive, projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { sizes, type BodyFrame, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

/** Hip height above the ground at rest; the centre of a somersault above the hips. */
export const HIP_Z = 4.6;
const SPIN_C = 8;
/** Keys that switch at the key instead of fading (the pose book shares this list). */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow']);

const T = (hexes: string[]): Mat['T'] => hexes.map((c) => hx(c)) as Mat['T'];
const four = (tones: string[]) => [tones[0], tones[1], tones[tones.length - 2], tones[tones.length - 1]];
const card4 = (card: CreatureCard, name: string) => four(card.materials.find((m) => m.name === name)!.tones);
const saturate = (v: number) => Math.min(1, Math.max(0, v));
const vdot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const VIEW: V3 = [0, 0.8, 0.6];
/** Rodrigues rotation of `v` round the unit axis `k` by `a`. */
function rotate(v: V3, k: V3, a: number): V3 {
  if (!a) return v;
  const c = Math.cos(a),
    sn = Math.sin(a);
  return vadd(vadd(vmul(v, c), vmul(vcross(k, v), sn)), vmul(k, vdot3(k, v) * (1 - c)));
}
const ease = (k: number) => k * k * (3 - 2 * k);

export type PoseSample = (anim: string, t: number) => JointPose;

/**
 * The spring that drives the tufts, the crown curl and the tail: a follower on a damped spring (2.6 Hz, damping 0.3)
 * chases a signal; the result is how far it lags behind (negative while the signal runs away, positive when it
 * overshoots after a stop). Built from the step response, so lag(t) = Σ g_k · (f(t − k) − f(t − k − 1)).
 */
const LAG_K = 16;
const LAG_G: number[] = (() => {
  const w = TAU * 2.6,
    z = 0.3,
    wd = w * Math.sqrt(1 - z * z);
  return Array.from({ length: LAG_K }, (_, k) => {
    const tau = k / 24;
    return -Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
  });
})();

interface Palette {
  plume: Mat;
  plumeDeep: Mat;
  down: Mat;
  disk: Mat;
  beak: Mat;
  foot: Mat;
  talon: Mat;
  iris: Mat;
  pupil: Mat;
  ink: RGBA;
  pale: RGBA;
  mark: RGBA;
  bar: RGBA;
}

export function owletFrame(card: CreatureCard, route: MotionPlan, sample: PoseSample, loops: Record<string, number>): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const palettes = (variant: Variant): Palette => {
    const g = variant === 'gold';
    const pick = (name: string, warm = 0.55) => (g ? gold(card4(card, name), warm) : T(card4(card, name)));
    return {
      plume: { T: pick('plumage') },
      plumeDeep: { T: g ? gold(['#1a0e0a', '#2e1c14', '#4a3022', '#6a4630'], 0.4) : T(['#1a0e0a', '#2e1c14', '#4a3022', '#6a4630']) },
      down: { T: pick('down', 0.4), bias: 0.04 },
      disk: { T: pick('disk', 0.35), bias: 0.06 },
      beak: { T: pick('beak', 0.3) },
      foot: { T: pick('feet', 0.3) },
      talon: { T: T(['#141014', '#2a2428', '#4a4248', '#7a7076']) },
      iris: { T: g ? T(['#7a4a04', '#d89a10', '#ffd040', '#fff4a0']) : T(card4(card, 'iris')), bias: 0.15 },
      pupil: { T: T(['#040306', '#0a0810', '#16121c', '#241e2c']), flat: 1 },
      ink: hx('#24140e'),
      pale: g ? hx('#fff4c8') : hx('#f2dfb6'),
      mark: g ? hx('#8a5a18') : hx('#5e3a26'),
      bar: g ? hx('#f8e4a0') : hx('#d8b88a'),
    };
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
    const gait = walking ? Math.sin(cycle * 2) : 0;
    const waddle = walking ? Math.sin(cycle) : 0;
    const breathe = anim === 'idle' || anim === 'sleep' ? Math.sin(l.q) : 0;
    const fluff = get('fluff') + 0.1 * l.tired;

    // ---- the spring: how the tufts, the curl and the tail lag the motion -------------------------------------------
    const past = (k: number): JointPose => {
      let at = t - k / 24;
      const loop = loops[anim];
      if (at < 0) at = loop ? ((at % loop) + loop) % loop : 0;
      return k === 0 ? pose : { ...sample(anim, at), ...steer?.techniquePose };
    };
    const hist: JointPose[] = Array.from({ length: LAG_K + 1 }, (_, k) => past(k));
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
    // Vertical motion of the head (rig units), sideways on screen, turns and tilts of the head.
    const lagUp = lag((p) => g0(p, 'lift') - g0(p, 'crouch') - g0(p, 'dy') / scale + g0(p, 'stretch') + 4 * g0(p, 'sy')) + (walking ? 0.5 * Math.sin(cycle * 2 - 1.3) : 0);
    const lagSide = lag((p) => g0(p, 'dx') / scale + 6 * (g0(p, 'roll') + g0(p, 'headRoll')) - 2 * g0(p, 'sway')) + 2 * lag((p) => g0(p, 'spin'), true) + (walking ? 0.6 * Math.sin(cycle - 1.1) : 0);
    const lagTurn = lag((p) => g0(p, 'headYaw'), true) + lag((p) => g0(p, 'yaw') + g0(p, 'twist'));
    const lagNod = lag((p) => g0(p, 'nod') + g0(p, 'bend') * 0.6 + g0(p, 'pitch'));

    // ---- the body ---------------------------------------------------------------------------------------------
    let pivotZ = HIP_Z + get('lift') - get('crouch') + 0.12 * breathe + (walking ? 0.5 * Math.abs(gait) : 0);
    const roller = F3.yaw(0).at(0, 0, pivotZ + SPIN_C).pitch(get('spin')).at(0, 0, -SPIN_C);
    const torso = roller
      .turn(heading + get('yaw') + get('twist') + lead * 0.25)
      .at(get('lean'), get('sway') + (walking ? 0.5 * waddle : 0), 0)
      .pitch(get('pitch') + 0.08 * l.tired)
      .roll(get('roll') + (walking ? 0.16 * waddle : 0));
    const floor = F3.yaw(heading + get('yaw'));
    // The feet follow a somersault: their floor turns with `spin` round the same centre as the body.
    const legFloor = get('spin') ? F3.yaw(0).at(0, 0, pivotZ + SPIN_C).pitch(get('spin')).at(0, 0, -SPIN_C - pivotZ).turn(heading + get('yaw')) : floor;
    const goal = (key: string, rest: V3, frame = floor) => {
      const at = goalAt(pose, key, toLocal(frame, rest));
      return at ? frame.p(...at) : rest;
    };
    const puff = 1 + 0.16 * fluff;
    const slim = fluff < 0 ? 1 + 0.5 * fluff : 1;
    const belly = { c: torso.p(0.3, 0, 5.4), r: [5.9 * puff * slim, 6.6 * puff * slim, 7.4 * (1 + 0.06 * fluff) * (1 + 0.012 * breathe)] as V3 };
    const chestF = torso.at(0.4, 0, 8.6).pitch(get('bend') * 0.55);
    const chest = { c: chestF.p(0.5, 0, 1.2), r: [5.2 * puff * slim, 6.0 * puff * slim, 5.4] as V3 };
    const neckF = chestF.at(0.3 + get('bend') * 0.5, 0, 5.8 + get('stretch') - (fluff < 0 ? 2.2 * fluff : 0));
    // The head turns on the neck; at rest the face is turned towards the viewer (an owl looks at its owner).
    const yawH = 0.55 + get('headYaw') + lead * 0.55,
      rollH = get('headRoll') + 0.06 * l.tired;
    const headF = neckF.turn(yawH).pitch(get('nod') - 0.24).roll(rollH);
    const headC = headF.p(0.2, 0, 4.8);
    const points: Record<string, V3> = {
      floor: [0, 0, 0],
      body: chest.c,
      belly: belly.c,
      head: headC,
      crown: headF.p(0.6, 0, 11.2),
      beak: headF.p(6.3, 0, 2.6),
      back: torso.p(-5.8, 0, 7),
    };

    // ---- wings ------------------------------------------------------------------------------------------------
    const wings = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const k = ease(saturate(get('wings') + get('wing' + suffix) + (walking ? 0.12 : 0) + 0.06 * fluff));
      const raise = get('flap') + get('flap' + suffix);
      const sweep = get('sweep') + get('sweep' + suffix);
      const fan = get('fan') + get('fan' + suffix);
      const S = chestF.p(-1.0, sign * 4.9 * puff * slim, 1.8);
      // Folded: a Z of bones tucked on the side, every feather pointing down and back to the tail.
      const B = (f: number, s: number, u: number) => chestF.v(f, sign * s, u);
      const fold = {
        elbow: vadd(S, B(-1.4, 0.9, -2.2)),
        wrist: vadd(S, B(0.6, 1.3, -4.6)),
        tip: vadd(S, B(-2.4, 1.0, -7.0)),
        d: vnorm(B(-0.34, 0.02, -0.94)),
        n: vnorm(B(-0.1, 1, 0.05)),
      };
      // Open: the arm reaches out to the side, raised by `raise` (up), swept forward by `sweep`.
      const A = vnorm(B(Math.sin(sweep) * Math.cos(raise), Math.cos(sweep) * Math.cos(raise), Math.sin(raise)));
      const back = vnorm(vsub(chestF.v(-1, 0, -0.3), vmul(A, vdot3(chestF.v(-1, 0, -0.3), A))));
      const elbow1 = vadd(vadd(S, vmul(A, 3.8)), chestF.v(-0.7, 0, 0));
      const wrist1 = vadd(vadd(elbow1, vmul(A, 4.2)), chestF.v(0.6, 0, 0));
      const tip1 = vadd(vadd(wrist1, vmul(A, 3.0)), chestF.v(0.5, 0, 0));
      let n1 = vnorm(vcross(A, back));
      if (vdot3(n1, chestF.u) < 0) n1 = vmul(n1, -1);
      // A flapped-down wing turns its upper side outwards: keep the normal on the outer side of the stroke.
      const elbow = vlerp(fold.elbow, elbow1, k),
        wrist = vlerp(fold.wrist, wrist1, k),
        tip = vlerp(fold.tip, tip1, k);
      const dir2 = vnorm(vlerp(fold.d, back, k));
      const n = vnorm(vlerp(fold.n, n1, k));
      const spread = k * (0.75 + 0.5 * fan);
      points['wing' + suffix] = wrist;
      return { sign, suffix, k, S, elbow, wrist, tip, A, back: dir2, n, spread };
    });

    // ---- legs -------------------------------------------------------------------------------------------------
    const air = Math.max(0, get('lift'));
    const legs = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const name = 'foot' + suffix;
      const step = strideFoot(walking ? gaitPhase : t, sign < 0 ? 0.5 : 0, walking ? route.stride / scale : Math.PI / 4);
      const floorFrame = turning ? floor.turn(step.forward * 0.4) : legFloor;
      const hip = torso.p(0.9, sign * 2.5, 0.4);
      const tuck = saturate(get('tuck') + get('tuck' + suffix));
      const stand = floorFrame.p(1.1 + (walking ? step.forward : 0) + air * 0.04, sign * (2.9 - air * 0.04), (walking || turning ? step.lift * (card.proportions.stepHeight ?? 2.5) : 0) + get('tap' + suffix) * 1.8 + air * 0.92);
      const tucked = torso.p(1.6, sign * 2.2, -0.6);
      const toe = goal(name, tuck > 0 ? vlerp(stand, tucked, tuck) : stand, legFloor);
      const ankle = vadd(toe, vmul(legFloor.u, 0.9));
      const knee = ik(hip, ankle, 2.6, 2.4, vadd(legFloor.v(1, 0, 0.1), vmul(legFloor.s, sign * 0.3)));
      points[name] = toe;
      const down = toe[2] < 0.1 && (!(walking || turning) || step.planted) && tuck < 0.3;
      const grip = saturate(get('grip') + (air > 2 ? 0.3 : 0) + tuck * 0.8);
      return { sign, suffix, name, hip, knee, ankle, toe, down, grip };
    });

    // ---- head parts -------------------------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const at = headF.p(4.85, sign * 3.1, 5.0);
      const out = vnorm(headF.v(1, sign * 0.26, 0.04));
      points['eye' + suffix] = vadd(at, vmul(out, 2.3));
      return { sign, suffix, at, out };
    });
    // Tufts: three segments from the top of the head, out and a little back; `tufts` perks them up (+) or lays them
    // flat (−); the spring bends them against the motion.
    const tuftDefl = { out: -0.16 * lagUp, side: -0.11 * lagSide, back: 0.6 * lagTurn + 0.5 * lagNod };
    const tufts = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const perk = get('tufts') + get('tuft' + suffix) + (fluff < 0 ? -fluff : 0);
      const wiggle = get('tuftWiggle') * Math.sin(t * 24 * 1.6 + sign);
      let ang = 0.42 - 0.3 * perk + tuftDefl.out + sign * tuftDefl.side + wiggle * 0.3;
      ang = Math.max(-0.2, Math.min(1.9, ang));
      let chain: V3[] = [headF.p(0.2, sign * 5.0, 9.9)];
      let a = ang,
        b = 0.28 + 0.25 * Math.max(0, -perk) + tuftDefl.back;
      const lens = [1.7, 1.6, 1.4].map((x) => x * (1 + 0.15 * Math.max(0, perk)));
      for (let i = 0; i < 3; i++) {
        const d = headF.v(-Math.sin(b), sign * Math.sin(a), Math.cos(a) * Math.cos(b));
        chain.push(vadd(chain[i], vmul(vnorm(d), lens[i])));
        a += 0.26 + 0.12 * (tuftDefl.out + sign * tuftDefl.side) + wiggle * 0.2;
        b += 0.14 + 0.3 * tuftDefl.back;
      }
      points['tuft' + suffix] = chain[3];
      return { sign, suffix, chain };
    });
    // The curl on the crown: a small feather that bobs on its own spring.
    const curl: V3[] = [headF.p(1.4, 0, 11.0)];
    {
      let a = -0.1 + 0.2 * lagNod - 0.12 * lagUp;
      const roll = -0.12 * lagSide;
      for (let i = 0; i < 3; i++) {
        const d = headF.v(Math.sin(a), Math.sin(roll), Math.cos(a));
        curl.push(vadd(curl[i], vmul(vnorm(d), [1.1, 0.9, 0.7][i])));
        a += 0.9 + 0.25 * lagUp;
      }
      points.curl = curl[3];
    }
    // Tail: five feathers fanned at the back, raised by `tailUp`, the spring flicks them.
    const tailRoot = torso.p(-5.2, 0, 0.9);
    const tailDirs = [-2, -1, 0, 1, 2].map((i) => {
      const fanA = i * 0.2 * (1 + get('tailFan')) + get('tailWag') + 0.08 * lagSide;
      const up = -0.5 + get('tailUp') + 0.06 * lagUp;
      return vnorm(torso.v(-Math.cos(fanA) * Math.cos(up), Math.sin(fanA), Math.sin(up)));
    });
    points.tailTip = vadd(tailRoot, vmul(tailDirs[2], 4.6));

    // ---- drawing ----------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    const blink = l.blink > 0.5 || get('blink') > 0.5;
    if (!hidden) {
      drawBody(r, torso, chestF, belly, chest, M, fluff, t, late);
      drawTail(r, tailRoot, tailDirs, M);
      for (const w of wings) drawWing(r, w, M, late);
      for (const leg of legs) drawLeg(r, leg, legFloor, M, late);
      drawHead(r, headF, headC, eyes, tufts, curl, M, get, blink, late);
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(
      r,
      floor,
      [
        [M.plume, 'fur'],
        [M.plumeDeep, 'fur'],
        [M.down, 'fur'],
        [M.disk, 'skin'],
        [M.beak, 'skin'],
        [M.foot, 'skin'],
        [M.talon, 'lacquer'],
        [M.iris, 'iris'],
      ],
      'skin',
    );
    for (const draw of late) draw();
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#1c1410';
    let frame: BodyFrame;
    if (overAll) {
      // The whole owlet flies over the painting frame: the body layer stays empty and the over layer carries it.
      const empty = new Rig();
      frame = projectFigure(empty, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
      const pad = 90,
        big = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      // points-only build: no picture needed, anchor and points still shift together [research 23.11, VIII.6.1]
      if (!pointsOnlyActive()) {
        const out = renderRig(r, big, big, ...anchor, { outline: hx(ink), inner: 3.6 });
        frame.px = renderRig(empty, big, big, ...anchor, { outline: hx(ink), inner: 3.6 }).p;
        frame.over = out.p;
      }
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.primitives = r.prims.length;
    } else frame = projectFigure(r, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
    frame.groundShadow =
      hidden || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (size * 0.25) / (1 + air * 0.03), opacity: 0.6 / (1 + air * 0.05), reflectionOpacity: frame.px.w > size ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('rot')) frame.rot = get('rot');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = legs.filter((leg) => leg.down).map((leg) => leg.name);
    void pivotZ;
    pivotZ = 0;
    return frame;
  };
}

type Get = (k: string) => number;

/** One feather lying on a surface at `at` with normal `n`; its tip points along `dir`, lifted by `tilt`. */
function plate(r: Rig, at: V3, n: V3, dir: V3, len: number, wid: number, tilt: number, mat: Mat, thick = 0.55) {
  const f = vnorm(vadd(vmul(dir, Math.cos(tilt)), vmul(n, Math.sin(tilt))));
  const u = vnorm(vsub(vmul(n, Math.cos(tilt)), vmul(dir, Math.sin(tilt))));
  const s = vnorm(vcross(u, f));
  const c = vadd(vadd(at, vmul(f, len * 0.42)), vmul(u, 0.2));
  r.ell(new F3(c, f, s, u), [0, 0, 0], [len * 0.56, wid * 0.5, thick], mat);
}
/** Breast feathers: pale with a dark arrow-shaped bar near the tip. */
function chevronPat(mark: RGBA): Mat['pat'] {
  return (q) => {
    const v = q[0] - 0.42 * Math.abs(q[1]);
    if (v > 0.18 && v < 0.5 && Math.abs(q[1]) < 0.8) return mark;
    return null;
  };
}
/** Back feathers: a pale drop near the tip, a dark root. */
function spotPat(pale: RGBA, seam: RGBA): Mat['pat'] {
  return (q) => {
    if ((q[0] - 0.42) ** 2 * 1.4 + q[1] * q[1] < 0.1) return pale;
    if (q[0] < -0.55) return seam;
    return null;
  };
}
/** Flight feathers: pale bars across, a dark tip and a dark shaft. */
function barPat(bar: RGBA, dark: RGBA, bars: number): Mat['pat'] {
  return (q) => {
    if (Math.abs(q[1]) < 0.09 && q[0] < 0.7) return dark;
    if (q[0] > 0.86) return dark;
    const b = (((q[0] + 1) * bars) % 1 + 1) % 1;
    if (b < 0.28 && Math.abs(q[1]) < 0.86) return bar;
    return null;
  };
}

function drawBody(r: Rig, torso: F3, chestF: F3, belly: { c: V3; r: V3 }, chest: { c: V3; r: V3 }, M: Palette, fluff: number, t: number, late: (() => void)[]) {
  // The trunk: a big pear of down in front and plumage behind; on each ellipsoid the front (towards the face) is the
  // pale breast, the back and the sides brown.
  const frontPat = (k: number): Mat['pat'] => (q) => (q[0] > k - 0.25 * Math.abs(q[2]) ? null : M.plume.T[q[0] > k - 0.4 ? 2 : 1]);
  r.tag = 'body';
  r.ell(new F3(belly.c, torso.f, torso.s, torso.u), [0, 0, 0], belly.r, { ...M.down, pat: frontPat(-0.15) });
  r.ell(new F3(chest.c, chestF.f, chestF.s, chestF.u), [0, 0, 0], chest.r, { ...M.down, pat: frontPat(0.05) });
  // A soft dark seam where the breast meets the back.
  const seam = mixc(M.plumeDeep.T[1], M.plumeDeep.T[2], 0.5);
  // Breast feathers: rows of pale feathers with dark arrow bars, tips pointing down, over the front of the pear.
  const breast: Mat = { ...M.down, pat: chevronPat(M.mark) };
  const backMat: Mat = { ...M.plume, pat: spotPat(M.pale, seam) };
  const lift = 0.18 + 0.35 * Math.max(0, fluff);
  const rows: { F: F3; e: { c: V3; r: V3 }; lats: number[]; phi: number; back: boolean }[] = [];
  const bF = new F3(belly.c, torso.f, torso.s, torso.u),
    cF = new F3(chest.c, chestF.f, chestF.s, chestF.u);
  // Front rows (azimuth within ±phi of forward), latitudes from the chest down to the belly.
  rows.push({ F: cF, e: chest, lats: [0.75, 0.42, 0.1], phi: 1.05, back: false });
  rows.push({ F: bF, e: belly, lats: [0.3, 0.0, -0.3, -0.6, -0.85], phi: 1.1, back: false });
  // Back rows: the brown mantle round the back and sides.
  rows.push({ F: cF, e: chest, lats: [0.7, 0.35, 0.0], phi: 1.6, back: true });
  rows.push({ F: bF, e: belly, lats: [0.25, -0.1, -0.45, -0.75], phi: 1.5, back: true });
  let row = 0;
  for (const { F, e, lats, phi, back } of rows)
    for (const lat of lats) {
      row++;
      r.tag = back ? 'mantle' : 'breast';
      const rho = Math.cos(lat);
      const across = ((e.r[0] + e.r[1]) / 2) * rho;
      const size = back ? 2.7 : 2.4;
      const count = Math.max(3, Math.round((2 * phi * across) / (size * 0.95)));
      for (let j = 0; j <= count; j++) {
        const az = -phi + ((j + (row % 2 ? 0.5 : 0)) * (2 * phi)) / count;
        if (az > phi + 1e-6) continue;
        const a = back ? Math.PI + az : az;
        const q: V3 = [Math.cos(a) * rho, Math.sin(a) * rho, Math.sin(lat)];
        const pos = F.p(q[0] * e.r[0], q[1] * e.r[1], q[2] * e.r[2]);
        const n = vnorm(F.v(q[0] / e.r[0], q[1] / e.r[1], q[2] / e.r[2]));
        // Tips point down the body (and a little outwards on the sides).
        const down = vnorm(vsub(vmul(F.u, -1), vmul(n, -vdot3(F.u, n))));
        const tilt = lift + 0.05 * hash(row, j) + 0.04 * Math.sin(t * 24 * 0.5 + j);
        plate(r, pos, n, down, size * 1.15, size * 1.05, tilt, back ? backMat : breast);
      }
    }
  // Downy fluff at the flanks under the wings: little wisps.
  late.push(() => {
    r.tag = 'breast';
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const base = bF.p(1.5 + i * 0.9, s * belly.r[1] * 0.9, -2.2 - i * 0.9);
        r.line(base, vadd(base, bF.v(0.6, s * 0.9, -0.5)), M.pale, 0, 0.4);
      }
  });
}

function drawTail(r: Rig, root: V3, dirs: V3[], M: Palette) {
  r.tag = 'tail';
  const mat: Mat = { ...M.plume, pat: barPat(M.bar, M.plumeDeep.T[0], 2.2) };
  dirs.forEach((d, i) => {
    const side = vnorm(vcross(d, [0, 0, 1]));
    const up = vnorm(vcross(side, d));
    const len = i === 2 ? 4.8 : i === 1 || i === 3 ? 4.5 : 4.0;
    r.ell(new F3(vadd(root, vmul(d, len * 0.5)), d, side, up), [0, 0, 0], [len * 0.55, 1.05, 0.38], mat);
    // Short spotted coverts over the root of every other feather.
    if (i % 2 === 0) plate(r, vadd(root, vmul(up, 0.45)), up, d, 2.6, 2.0, 0.12, { ...M.plume, pat: spotPat(M.pale, M.plumeDeep.T[1]) }, 0.4);
  });
}

function drawWing(r: Rig, w: { sign: number; suffix: string; k: number; S: V3; elbow: V3; wrist: V3; tip: V3; A: V3; back: V3; n: V3; spread: number }, M: Palette, late: (() => void)[]) {
  r.tag = 'wing' + w.suffix;
  // Seen from below (a raised wing towards the viewer) the wing is pale and barred like the breast.
  const under = vdot3(w.n, VIEW) < -0.1 && w.k > 0.3;
  const flight: Mat = under ? { ...M.down, pat: barPat(M.mark, M.plume.T[1], 2.6) } : { ...M.plume, pat: barPat(M.bar, M.plumeDeep.T[0], 2.6) };
  const covert: Mat = under ? { ...M.down, pat: chevronPat(M.mark) } : { ...M.plume, pat: spotPat(M.pale, M.plumeDeep.T[1]) };
  const lay = (layer: number) => vmul(w.n, 0.32 * layer * (under ? -1 : 1));
  // Primaries: six long feathers from the hand, fanning from the trailing direction towards the arm's line.
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    const root = vadd(vlerp(w.wrist, w.tip, u), lay(0));
    const dir = vnorm(vadd(vmul(w.back, 1 - u * w.spread), vmul(w.A, u * w.spread * 1.15)));
    const len = (5.2 + 0.5 * i - (i === 5 ? 0.8 : 0)) * (1 + 0.45 * w.k);
    const side = vnorm(vcross(w.n, dir));
    r.ell(new F3(vadd(root, vmul(dir, len * 0.5)), dir, side, w.n), [0, 0, 0], [len * 0.53, 0.95, 0.34], flight);
  }
  // Secondaries: six along the forearm, pointing back.
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    const root = vadd(vlerp(w.elbow, w.wrist, u), lay(1));
    const dir = vnorm(vadd(w.back, vmul(w.A, 0.08 * u * w.k)));
    const len = (4.8 + 0.3 * Math.sin(u * 3)) * (1 + 0.25 * w.k);
    const side = vnorm(vcross(w.n, dir));
    r.ell(new F3(vadd(root, vmul(dir, len * 0.5)), dir, side, w.n), [0, 0, 0], [len * 0.53, 1.05, 0.34], flight);
  }
  // Coverts: two rows of small spotted feathers over the arm and a soft shoulder.
  for (let rowI = 0; rowI < 3; rowI++)
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      const along = u < 0.5 ? vlerp(w.S, w.elbow, u * 2) : vlerp(w.elbow, w.wrist, (u - 0.5) * 2);
      const root = vadd(vadd(along, vmul(w.back, rowI * 1.2)), lay(2 + rowI * 0.5));
      plate(r, root, under ? vmul(w.n, -1) : w.n, w.back, 3.0 - rowI * 0.3, 2.2, 0.1, covert, 0.45);
    }
  // The alula: a small feather at the wrist pointing along the hand; two tertials close to the body.
  plate(r, vadd(w.wrist, lay(3)), under ? vmul(w.n, -1) : w.n, vnorm(vadd(w.A, vmul(w.back, 0.4))), 2.6, 1.3, 0.1, flight, 0.4);
  for (let i = 0; i < 2; i++) {
    const root = vadd(vlerp(w.S, w.elbow, 0.2 + i * 0.3), lay(1.5));
    const dir = vnorm(vadd(w.back, vmul(w.A, -0.25)));
    const len = 4.2 - i * 0.4;
    const side = vnorm(vcross(w.n, dir));
    r.ell(new F3(vadd(root, vmul(dir, len * 0.5)), dir, side, w.n), [0, 0, 0], [len * 0.53, 1.1, 0.34], flight);
  }
  r.cap(w.S, w.elbow, 2.0, 1.6, under ? M.down : M.plume);
  r.cap(w.elbow, w.wrist, 1.4, 1.1, under ? M.down : M.plume);
  late.push(() => {
    r.tag = 'wing' + w.suffix;
    // The bright leading edge of the open wing.
    if (w.k > 0.4) r.line(w.elbow, w.tip, M.pale, 0, 0.6);
  });
}

function drawLeg(r: Rig, leg: { sign: number; suffix: string; hip: V3; knee: V3; ankle: V3; toe: V3; grip: number }, floor: F3, M: Palette, late: (() => void)[]) {
  r.tag = 'leg' + leg.suffix;
  // Fluffy feathered trousers, a short feathered shin, a bare foot with three toes forward and one back, dark talons.
  const thighDir = vnorm(vsub(leg.knee, leg.hip));
  const side = vnorm(vcross(thighDir, floor.u));
  const up = vnorm(vcross(side, thighDir));
  const U = (k: number) => vmul(floor.u, k);
  r.ell(new F3(vlerp(leg.hip, leg.knee, 0.5), thighDir, side, up), [0, 0, 0], [2.5, 2.2, 2.4], M.down);
  // Soft feathers over the trousers, tips down.
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.9;
    const n = vnorm(vadd(vmul(side, leg.sign * Math.sin(a + leg.sign * 0.6)), vmul(up, Math.cos(a))));
    const at = vadd(vlerp(leg.hip, leg.knee, 0.35), vmul(n, 2.1));
    plate(r, at, n, vnorm(vsub(vmul(floor.u, -1), vmul(n, -vdot3(n, floor.u)))), 2.4, 2.0, 0.3, M.down, 0.45);
  }
  r.cap(leg.knee, leg.ankle, 1.35, 1.0, M.down);
  const fwd = floor.v(1, 0, 0);
  r.tag = 'feet';
  const toes: [number, number][] = [[-0.5, 1], [0, 1.15], [0.5, 1], [Math.PI, 0.7]];
  for (const [a, L] of toes) {
    const dir = vnorm(vadd(vmul(fwd, Math.cos(a)), vmul(floor.s, Math.sin(a) * (a === Math.PI ? 0 : 1) + (a === Math.PI ? leg.sign * 0.2 : 0))));
    const base = vadd(leg.ankle, U(-0.7));
    const curl = leg.grip;
    const mid = vadd(base, vadd(vmul(dir, 1.3 * L * (1 - 0.3 * curl)), U(-0.2 - 0.6 * curl)));
    const end = vadd(mid, vadd(vmul(dir, 1.0 * L * (1 - 0.6 * curl)), U(-0.1 - 0.9 * curl)));
    r.cap(base, mid, 0.62, 0.5, M.foot);
    r.cap(mid, end, 0.5, 0.4, M.foot);
    const claw = vadd(end, vadd(vmul(dir, 0.6 * (1 - curl)), U(-0.55)));
    r.cap(end, claw, 0.34, 0.1, M.talon);
    const tag = r.tag;
    late.push(() => {
      r.tag = tag;
      // Scales across the top of each toe.
      r.line(vadd(mid, U(0.45)), vadd(vlerp(mid, end, 0.5), U(0.4)), M.foot.T[0], 0, 0.5);
    });
  }
}

function drawHead(
  r: Rig,
  Hf: F3,
  headC: V3,
  eyes: { sign: number; suffix: string; at: V3; out: V3 }[],
  tufts: { sign: number; suffix: string; chain: V3[] }[],
  curl: V3[],
  M: Palette,
  get: Get,
  blink: boolean,
  late: (() => void)[],
) {
  r.tag = 'head';
  // A big round head, plumage behind, the pale facial disk in front.
  const HF = new F3(headC, Hf.f, Hf.s, Hf.u);
  r.ell(HF, [0, 0, 0], [5.3, 7.8, 6.6], M.plume);
  // Crown feathers: small spotted feathers over the top and back of the head.
  const crownMat: Mat = { ...M.plume, pat: spotPat(M.pale, M.plumeDeep.T[3]) };
  let row = 0;
  for (const lat of [0.95, 0.6, 0.25, -0.1, -0.45]) {
    row++;
    const rho = Math.cos(lat);
    const phi = 1.9;
    const count = Math.max(3, Math.round((2 * phi * 6.6 * rho) / 2.3));
    for (let j = 0; j <= count; j++) {
      const az = Math.PI - phi + ((j + (row % 2 ? 0.5 : 0)) * 2 * phi) / count;
      if (az > Math.PI + phi + 1e-6) continue;
      const q: V3 = [Math.cos(az) * rho, Math.sin(az) * rho, Math.sin(lat)];
      const pos = HF.p(q[0] * 5.3, q[1] * 7.8, q[2] * 6.6);
      const n = vnorm(HF.v(q[0] / 5.3, q[1] / 7.8, q[2] / 6.6));
      const back = vnorm(vsub(HF.v(-1, 0, -0.6), vmul(n, vdot3(HF.v(-1, 0, -0.6), n))));
      plate(r, pos, n, back, 2.3, 2.1, 0.04, crownMat, 0.32);
    }
  }
  // The facial disk: a dark rim, then two pale overlapping discs round the eyes with fine radial streaks.
  r.tag = 'face';
  const streak = mixc(M.disk.T[1], M.disk.T[2], 0.5);
  const diskPat: Mat['pat'] = (q) => {
    const a = Math.atan2(q[2], q[1]);
    if (q[0] > 0.2 && (((a * 9) / TAU) % 1 + 1) % 1 < 0.14 && q[1] * q[1] + q[2] * q[2] > 0.3) return streak;
    return null;
  };
  for (const s of [-1, 1]) {
    r.ell(Hf.at(4.0, s * 3.2, 4.9), [0, 0, 0], [1.8, 4.4, 4.6], M.plumeDeep);
    r.ell(Hf.at(4.5, s * 3.05, 5.0), [0, 0, 0], [1.7, 3.9, 4.1], { ...M.disk, pat: diskPat });
  }
  // The ruff: a ring of short dark-tipped feathers round the rim of the facial disk.
  const ruff: Mat = { ...M.plume, pat: (q) => (q[0] > 0.6 ? M.plumeDeep.T[2] : null) };
  for (const s of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const a = -2.2 + i * 0.62;
      const c = Hf.p(4.0, s * 3.2, 4.9);
      const radial = Hf.v(0, s * Math.cos(a) * 4.3, Math.sin(a) * 4.5);
      const at = vadd(c, radial);
      const n = vnorm(Hf.v(0.55, s * Math.cos(a) * 0.8, Math.sin(a) * 0.8));
      plate(r, at, n, vnorm(radial), 1.9, 1.7, 0.2, ruff, 0.4);
    }
  // White brows: a V over the eyes meeting above the beak; they carry the mood (`brow` + angry, − worried).
  const brow = get('brow'),
    browUp = get('browUp');
  for (const s of [-1, 1]) {
    const inner = Hf.p(5.6, s * 0.7, 8.5 - 1.2 * brow + 0.7 * browUp),
      outer = Hf.p(4.4, s * 5.2, 8.9 + 0.6 * brow + 0.9 * browUp);
    r.cap(inner, outer, 0.85, 0.55, M.disk);
  }
  // Eyes: a dark ring, a big amber iris, a pupil that dilates (`pupil`) and looks about (`lookX` sideways, `lookY` up).
  const lookX = get('lookX'),
    lookY = get('lookY');
  const pupilK = Math.max(0.55, 1.12 + 0.45 * get('pupil'));
  for (const e of eyes) {
    r.tag = 'eye' + e.suffix;
    const joy = get('joy') > 0.5;
    const lid = Math.max(blink || joy ? 1 : 0, get('lid'), get('lid' + e.suffix));
    r.ball(vadd(e.at, vmul(e.out, -0.4)), 2.9, M.plumeDeep);
    r.ball(e.at, 2.6, M.iris);
    const look = Hf.v(0, (lookX - e.sign * get('cross')) * 0.9, lookY * 0.9);
    const pupilAt = vadd(vadd(e.at, vmul(e.out, 1.35)), look);
    if (lid < 0.95) {
      r.ball(pupilAt, 1.45 * pupilK, M.pupil);
      const facing = vdot3(e.out, VIEW) > -0.05;
      if (facing)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          r.dot(vadd(pupilAt, vadd(vmul(e.out, 1.4), Hf.v(0, -0.6, 0.7))), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(pupilAt, vadd(vmul(e.out, 1.4), Hf.v(0, -0.2, 0.75))), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(pupilAt, vadd(vmul(e.out, 1.4), Hf.v(0, 0.6, -0.55))), hx('#fff4c8'), 0, 1, 0.9);
        });
    }
    if (lid > 0.05) {
      // The lid: a feathered dome over the eye, its edge comes down to `lid`; closed = a soft curve.
      const line = 1 - 2 * lid;
      const lidF = new F3(e.at, e.out, Hf.s, vnorm(vcross(e.out, Hf.s)));
      r.ell(lidF, [0, 0, 0], [3.0, 3.0, 3.0], M.disk, (q) => q[2] < line);
      if (lid > 0.9 && vdot3(e.out, VIEW) > -0.05)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const c = vadd(e.at, vmul(e.out, 2.6));
          // Closed: a soft «∪»; happy (`joy`): an arched «∩».
          const k = joy ? -1 : 1;
          r.line(vadd(c, Hf.v(0, -1.7, 0.3 * k)), vadd(c, Hf.v(0, 0, -0.45 * k)), M.ink, 0, 1);
          r.line(vadd(c, Hf.v(0, 0, -0.45 * k)), vadd(c, Hf.v(0, 1.7, 0.3 * k)), M.ink, 0, 1);
        });
    }
  }
  // The beak: a small hook between the eyes; `beak` opens the lower half.
  r.tag = 'beak';
  const open = saturate(get('beak'));
  r.cap(Hf.p(5.9, 0, 4.5), Hf.p(6.9, 0, 2.9), 1.0, 0.5, M.beak);
  r.cap(Hf.p(6.9, 0, 2.9), Hf.p(6.6, 0, 2.1), 0.5, 0.18, M.beak);
  late.push(() => {
    r.tag = 'beak';
    // Two nostrils on the cere at the top of the beak.
    for (const s of [-1, 1]) r.dot(Hf.p(6.2, s * 0.45, 4.3), M.ink, 0, 1, 0.9);
  });
  if (open > 0.05) {
    r.ball(Hf.p(6.1, 0, 2.9 - open * 0.6), 0.75, { T: T(['#3a0c14', '#6a1e2a', '#a8445a', '#d87088']) });
    r.cap(Hf.p(5.7, 0, 3.3), Hf.p(6.3, 0, 2.5 - open * 1.4), 0.6, 0.3, M.beak);
  }
  // Tufts: feathered horns, a dark core and a pale tip.
  r.tag = 'tufts';
  for (const tf of tufts) {
    const c = tf.chain;
    for (let i = 0; i < 3; i++) r.cap(c[i], c[i + 1], [1.25, 0.95, 0.6][i], [0.95, 0.6, 0.22][i], M.plume);
    late.push(() => {
      r.tag = 'tufts';
      r.line(c[0], c[2], M.plumeDeep.T[0], 0, 0.5);
      r.dot(c[3], M.pale, 0, 1, 0.8);
    });
  }
  // The crown curl.
  for (let i = 0; i < 3; i++) r.cap(curl[i], curl[i + 1], [0.62, 0.48, 0.32][i], [0.48, 0.32, 0.14][i], M.plume);
  late.push(() => {
    r.tag = 'head';
    // Rosy cheeks under the eyes, when they face the viewer.
    if (get('blush') > -0.5)
      for (const s of [-1, 1]) {
        const at = Hf.p(5.2, s * 3.9, 2.4);
        if (vdot3(Hf.v(1, s * 0.6, 0), VIEW) > 0.05) r.dot(at, hx('#f08a7a'), 0, 1, 0.7 + 0.3 * saturate(get('blush')));
      }
    // Fine streaks on the forehead between the brows.
    for (const s of [-1, 0, 1]) r.line(Hf.p(5.0, s * 0.9, 9.6), Hf.p(5.5, s * 0.6, 8.6), M.plumeDeep.T[1], 0, 0.5);
  });
}

export type { Palette };
