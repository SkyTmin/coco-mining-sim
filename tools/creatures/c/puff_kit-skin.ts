// Пушинка, the wind cub. Its own skeleton on the f15 rig: a small round body on four short legs in green «socks», a
// big head (almost the size of the trunk) with huge eyes, and the part everything grows from — a dandelion clock for a
// mane: a ball of seeds, each a thin stalk with a white parasol, round the head and the neck, the face looking out of
// it. Two long dandelion-leaf ears with toothed edges stand up out of the mane; the tail is a thin green stem with a
// little clock at its tip. The mane can lose its seeds (`bald`, a hash threshold per seed, so seeds go one by one and
// grow back the same way) leaving the bare brown seed bed, and it can open as a yellow flower (`bloom`, seeds turn into
// petals one by one). The mane, the ears and the tail ride on a spring that lags every move. Walking is a four-legged
// lateral-sequence gait. Pose keys (all optional, 0 = rest) are read through `get`; positions are rig units before
// `card.proportions.scale`.
import type { CreatureCard } from '../bodies/card-data';
import { goalAt, toLocal } from '../bodies/goals';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { sizes, type BodyFrame, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

/** Hip height at rest; the centre of a somersault above the hips. */
export const HIP_Z = 5.4;
const SPIN_C = 3;
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow']);

const T = (hexes: string[]): Mat['T'] => hexes.map((c) => hx(c)) as Mat['T'];
const four = (tones: string[]) => [tones[0], tones[1], tones[tones.length - 2], tones[tones.length - 1]];
const card4 = (card: CreatureCard, name: string) => four(card.materials.find((m) => m.name === name)!.tones);
const saturate = (v: number) => Math.min(1, Math.max(0, v));
const vdot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const VIEW: V3 = [0, 0.8, 0.6];
function rotate(v: V3, k: V3, a: number): V3 {
  if (!a) return v;
  const c = Math.cos(a),
    sn = Math.sin(a);
  return vadd(vadd(vmul(v, c), vmul(vcross(k, v), sn)), vmul(k, vdot3(k, v) * (1 - c)));
}

export type PoseSample = (anim: string, t: number) => JointPose;

/** The spring (see the owlet): lag of a follower on a damped spring, from the step response. */
const LAG_K = 16;
const LAG_G: number[] = (() => {
  const w = TAU * 2.0,
    z = 0.3,
    wd = w * Math.sqrt(1 - z * z);
  return Array.from({ length: LAG_K }, (_, k) => {
    const tau = k / 24;
    return -Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
  });
})();

/** Seed directions of the mane: a Fibonacci sphere, the face opening (forward) left out. Each seed keeps its index,
 * so `bald` and `bloom` take and give them back in the same order. */
const SEEDS: { d: V3; i: number; len: number }[] = (() => {
  const n = 260,
    out: { d: V3; i: number; len: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n;
    const rr = Math.sqrt(1 - z * z);
    const a = golden * i;
    // Head frame: x forward, y right, z up.
    const d: V3 = [Math.cos(a) * rr, Math.sin(a) * rr, z];
    if (d[0] > 0.5) continue;
    out.push({ d, i, len: 0.92 + 0.16 * hash(i, 3) });
  }
  return out;
})();
/** The tail stem: segment lengths and rest angles up from straight back (rad); a gentle S rising behind. */
const TAIL_LEN = [1.5, 1.5, 1.5, 1.4, 1.3, 1.2, 1.1];
const TAIL_REST = [0.35, 0.65, 0.95, 1.2, 1.35, 1.3, 1.1];
const TAIL_SEEDS = 18;

interface Palette {
  fur: Mat;
  furSmooth: Mat;
  cream: Mat;
  leaf: Mat;
  stem: Mat;
  seed: Mat;
  bed: Mat;
  petal: Mat;
  nose: Mat;
  eye: Mat;
  mouth: Mat;
  ink: RGBA;
  pale: RGBA;
  pollen: RGBA;
}

export function puffFrame(card: CreatureCard, route: MotionPlan, sample: PoseSample, loops: Record<string, number>): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const palettes = (variant: Variant): Palette => {
    const g = variant === 'gold';
    const pick = (name: string, warm = 0.5) => (g ? gold(card4(card, name), warm) : T(card4(card, name)));
    return {
      fur: { T: pick('fur', 0.3) },
      furSmooth: { T: [...pick('fur', 0.3)] as Mat['T'] },
      cream: { T: pick('cream', 0.25), bias: 0.05 },
      leaf: { T: pick('leaf', 0.45) },
      stem: { T: g ? gold(['#1e4418', '#2e6424', '#4e8a36', '#78b04a'], 0.45) : T(['#1e4418', '#2e6424', '#4e8a36', '#78b04a']) },
      seed: { T: pick('seed', 0.35), bias: 0.08 },
      bed: { T: pick('bed', 0.3) },
      petal: { T: pick('petal', 0.15), bias: 0.04 },
      nose: { T: pick('nose', 0.2) },
      eye: { T: T(['#06040a', '#140c1c', '#2a1c3a', '#46305e']), flat: 1 },
      mouth: { T: T(['#3a0c14', '#6a1e2a', '#a8445a', '#d87088']) },
      ink: hx('#1e140a'),
      pale: g ? hx('#fff4c8') : hx('#fffaf0'),
      pollen: g ? hx('#ffd84a') : hx('#ffd23a'),
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
    const breathe = anim === 'idle' || anim === 'sleep' ? Math.sin(l.q) : 0;
    const fluff = get('fluff');

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
    const lagUp = lag((p) => g0(p, 'lift') - g0(p, 'crouch') - g0(p, 'dy') / scale + 3 * g0(p, 'rear')) + (walking ? 0.5 * Math.sin(cycle * 2 - 1.2) : 0);
    const lagSide = lag((p) => g0(p, 'dx') / scale + 6 * g0(p, 'roll') - 2 * g0(p, 'sway')) + lag((p) => 1.5 * (g0(p, 'yaw') + g0(p, 'twist')), true) + (walking ? 0.6 * Math.sin(cycle - 1.1) : 0);
    const lagHead = lag((p) => g0(p, 'headYaw'), true) + lag((p) => g0(p, 'nod') + g0(p, 'headRoll'));

    // ---- the trunk --------------------------------------------------------------------------------------------
    const sit = saturate(get('sit'));
    const rear = get('rear') + sit * 1.0;
    const pivotZ = HIP_Z + get('lift') - get('crouch') - sit * 2.8 + 0.08 * breathe + (walking ? 0.4 * Math.abs(gait) : 0);
    const roller = F3.yaw(0).at(0, 0, pivotZ + SPIN_C).pitch(get('spin')).at(0, 0, -SPIN_C);
    const yawB = heading + get('yaw') + get('twist') + lead * 0.25;
    const torso = roller
      .turn(yawB)
      .at(get('lean'), get('sway'), 0)
      .roll(get('roll') + (walking ? 0.06 * Math.sin(cycle) : 0))
      .pitch(-rear + get('pitch') + 0.06 * l.tired);
    const floor = F3.yaw(heading + get('yaw'));
    const legFloor = get('spin') ? F3.yaw(0).at(0, 0, pivotZ + SPIN_C).pitch(get('spin')).at(0, 0, -SPIN_C - pivotZ).turn(heading + get('yaw')) : floor;
    const goal = (key: string, rest: V3, frame = floor) => {
      const at = goalAt(pose, key, toLocal(frame, rest));
      return at ? frame.p(...at) : rest;
    };
    // A short round body: hips, middle, chest.
    const puffB = 1 + 0.08 * fluff;
    const masses: { c: V3; r: V3 }[] = [
      { c: torso.p(0.0, 0, 0.5), r: [3.3 * puffB, 3.2 * puffB, 3.2 * puffB] },
      { c: torso.p(2.1, 0, 0.75), r: [3.1 * puffB, 3.05 * puffB, 3.1 * puffB * (1 + 0.015 * breathe)] },
      { c: torso.p(4.1, 0, 0.8), r: [3.2 * puffB, 3.1 * puffB, 3.3 * puffB] },
    ];
    // The head: big, on a short neck from the chest; level while the trunk rears, rolling with it in a somersault.
    const neckBase = torso.p(5.3, 0, 1.7);
    const headLevel = get('spin') ? roller.turn(yawB) : F3.yaw(yawB);
    const headBase = vadd(vadd(neckBase, vmul(torso.u, 2.6 + get('stretch'))), vmul(torso.f, 1.1));
    const yawH = 0.8 + get('headYaw') + lead * 0.5,
      rollH = get('headRoll');
    const headF = new F3(headBase, headLevel.f, headLevel.s, headLevel.u).turn(yawH).pitch(get('nod') - 0.1).roll(rollH);
    // The mane sits behind the face; it lags the head on the spring and leans with the wind.
    const maneLagS = -0.05 * lagSide - 0.08 * lagHead,
      maneLagU = -0.04 * lagUp;
    const maneC = vadd(headF.p(-2.6, 0, 1.3), vadd(vmul(headF.s, maneLagS), vmul(headF.u, maneLagU)));
    const bald = saturate(get('bald'));
    const bloom = saturate(get('bloom'));
    const maneR = 7.6 * (1 + 0.1 * fluff + 0.05 * get('puff')) * (1 - 0.12 * bloom);
    const points: Record<string, V3> = {
      floor: [0, 0, 0],
      body: masses[1].c,
      chest: masses[2].c,
      hips: masses[0].c,
      head: headF.o,
      mane: maneC,
      crown: vadd(maneC, vmul(headF.u, maneR)),
      maneL: vadd(maneC, vmul(headF.s, -maneR)),
      maneR: vadd(maneC, vmul(headF.s, maneR)),
      maneBack: vadd(maneC, vmul(headF.f, -maneR)),
      nose: headF.p(5.3, 0, -0.6),
      mouth: headF.p(4.5, 0, -1.8),
      back: torso.p(2.0, 0, 4.0),
    };

    // ---- legs ---------------------------------------------------------------------------------------------------
    const air = Math.max(0, get('lift'));
    const armRise = saturate((rear - 0.35) / 0.6) * (1 - sit);
    const armFrame = floor.at(get('lean'), 0, pivotZ - HIP_Z);
    const legs = (['H', 'F'] as const).flatMap((end) =>
      [-1, 1].map((sign) => {
        const suffix = sign < 0 ? 'L' : 'R';
        const front = end === 'F';
        const name = (front ? 'paw' : 'foot') + suffix;
        const phase = (front ? 0.25 : 0) + (sign < 0 ? 0 : 0.5);
        const step = strideFoot(walking ? gaitPhase : t, phase, walking ? route.stride / scale : Math.PI / 4);
        const floorFrame = turning ? floor.turn(step.forward * 0.3) : legFloor;
        const joint = front ? torso.p(4.6, sign * 1.9, -0.8) : torso.p(0.2, sign * 2.1, -0.5);
        const restF = front ? 5.0 : 0.3;
        const lift = (walking || turning ? step.lift * (card.proportions.stepHeight ?? 2.2) : 0) + get('tap' + suffix + end) * 1.5;
        let stand = floorFrame.p(restF + (walking ? step.forward : 0) + air * 0.05, sign * 2.3, lift + air * 0.92);
        if (sit) stand = vlerp(stand, floorFrame.p(front ? 3.6 : 1.0, sign * (front ? 1.3 : 2.5), lift), sit);
        if (front && armRise > 0) {
          const arm = vadd(joint, vadd(vmul(torso.f, 4.2), vadd(vmul(torso.u, 0.4), vmul(torso.s, sign * 3.6))));
          stand = vlerp(stand, arm, armRise);
        }
        const tuck = saturate(get('tuck') + get('tuck' + suffix + end));
        if (tuck) stand = vlerp(stand, vadd(joint, vadd(vmul(torso.u, -2.0), vmul(torso.f, front ? 1.0 : 0.6))), tuck);
        const toe = goal(name, stand, front && armRise > 0.5 ? armFrame : legFloor);
        const ankle = vadd(toe, vmul(legFloor.u, 0.8));
        const raised = front ? saturate((vdot3(vsub(toe, joint), legFloor.u) + 1) / 3) : 0;
        const pole = front
          ? vadd(vmul(legFloor.f, -1 + raised), vadd(vmul(legFloor.s, sign * (0.2 + 1.2 * raised)), vmul(legFloor.u, -0.6 * raised)))
          : vadd(legFloor.f, vmul(legFloor.s, sign * 0.2));
        const knee = ik(joint, ankle, front ? 2.9 : 3.1, front ? 2.8 : 3.0, pole);
        points[name] = toe;
        const down = toe[2] < 0.1 && (!(walking || turning) || step.planted) && tuck < 0.3 && !(front && armRise > 0.5);
        return { end, front, sign, suffix, name, joint, knee, ankle, toe, down };
      }),
    );

    // ---- the tail -----------------------------------------------------------------------------------------------
    const tailBase = torso.p(-2.9, 0, 0.9);
    const tail: V3[] = [tailBase];
    {
      const springUp = -0.08 * lagUp,
        springSide = -0.1 * lagSide;
      let phi = 0;
      for (let k = 0; k < TAIL_LEN.length; k++) {
        const u = (k + 1) / TAIL_LEN.length;
        const theta = TAIL_REST[k] + get('tailUp') * 0.3 + get('tailCurl') * 0.18 * k + springUp * u * 2 + 0.05 * Math.sin(t * TAU / 1.5 - k * 0.6);
        phi += get('tailWag') * 0.24 + springSide * 0.3 + 0.03 * Math.sin(t * TAU / 3 - k * 0.5);
        let d = vadd(vmul(torso.f, -Math.cos(theta)), vmul(torso.u, Math.sin(theta)));
        d = rotate(d, torso.u, phi);
        tail.push(vadd(tail[k], vmul(vnorm(d), TAIL_LEN[k])));
      }
      points.tailTip = tail[tail.length - 1];
      points.tailMid = tail[3];
    }

    // ---- head parts ---------------------------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const at = headF.p(3.2, sign * 1.95, 0.55);
      const out = vnorm(headF.v(1, sign * 0.42, 0.08));
      points['eye' + suffix] = vadd(at, vmul(out, 1.7));
      return { sign, suffix, at, out };
    });
    // Ears: long dandelion leaves standing up out of the mane, tilted out; `ears` perks or flattens; the spring and the
    // wind make them flutter.
    const wind = get('wind');
    const ears = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const perk = get('ears') + get('ear' + suffix);
      const flutter = 0.06 * Math.sin(t * TAU * 2 + sign) * (0.4 + wind);
      const out = 0.36 - 0.2 * perk + sign * 0.06 * lagHead - 0.05 * lagUp + flutter;
      const back = 0.05 + 0.5 * Math.max(0, -perk) + 0.1 * lagHead * sign + 0.25 * wind;
      const base = headF.p(-0.2, sign * 2.6, 4.6);
      const dir = vnorm(headF.v(-Math.sin(back), sign * Math.sin(out), Math.cos(out) * Math.cos(back)));
      const len = 7.6 + 0.5 * Math.max(0, perk);
      const tip = vadd(base, vmul(dir, len));
      points['ear' + suffix] = tip;
      return { sign, suffix, base, tip, dir, len };
    });

    // ---- drawing ------------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    const blink = l.blink > 0.5 || get('blink') > 0.5;
    if (!hidden) {
      drawTrunk(r, torso, masses, neckBase, headBase, M);
      drawTail(r, tail, torso, M, saturate(get('tailBald')), late);
      for (const leg of legs) drawLeg(r, leg, legFloor, M, late);
      drawMane(r, headF, maneC, maneR, M, bald, bloom, fluff, wind, late);
      drawHead(r, headF, eyes, ears, M, get, blink, late);
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(
      r,
      floor,
      [
        [M.fur, 'fur'],
        [M.furSmooth, 'skin'],
        [M.cream, 'fur'],
        [M.leaf, 'skin'],
        [M.stem, 'skin'],
        [M.seed, 'fur'],
        [M.bed, 'skin'],
        [M.petal, 'skin'],
        [M.nose, 'skin'],
        [M.mouth, 'skin'],
      ],
      'fur',
    );
    for (const draw of late) draw();
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#1e140a';
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
    frame.groundShadow =
      hidden || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (size * 0.3) / (1 + air * 0.03), opacity: 0.55 / (1 + air * 0.05), reflectionOpacity: frame.px.w > size ? 0 : 1 };
    if (get('dx')) frame.dx = Math.round(get('dx'));
    if (get('dy')) frame.dy = Math.round(get('dy'));
    if (get('sx')) frame.sx = 1 + get('sx');
    if (get('sy')) frame.sy = 1 + get('sy');
    if (get('rot')) frame.rot = get('rot');
    if (get('flash')) frame.flash = get('flash');
    frame.planted = legs.filter((leg) => leg.down).map((leg) => leg.name);
    return frame;
  };
}

type Get = (k: string) => number;

/** A soft tuft of fur: a tapering capsule. */
function tuft(r: Rig, at: V3, dir: V3, len: number, w: number, mat: Mat) {
  r.cap(at, vadd(at, vmul(dir, len)), w, w * 0.3, mat);
}

function drawTrunk(r: Rig, torso: F3, masses: { c: V3; r: V3 }[], neckBase: V3, headBase: V3, M: Palette) {
  // Butter-yellow back and flanks with a darker stripe down the spine; the belly and the chest cream.
  const under: Mat['pat'] = (q) => (q[2] < -0.3 + 0.1 * Math.abs(q[1]) ? M.cream.T[q[2] < -0.55 ? 2 : 3] : q[2] > 0.82 && Math.abs(q[1]) < 0.3 ? M.fur.T[1] : null);
  r.tag = 'body';
  masses.forEach((m) => r.ell(new F3(m.c, torso.f, torso.s, torso.u), [0, 0, 0], m.r, { ...M.furSmooth, pat: under }));
  r.tag = 'neck';
  const neckMid = vlerp(neckBase, headBase, 0.5);
  const nd = vnorm(vsub(headBase, neckBase));
  const ns = vnorm(vcross(nd, torso.f));
  r.ell(new F3(neckMid, nd, ns, vcross(ns, nd)), [0, 0, 0], [2.3, 2.5, 2.6], { ...M.furSmooth, pat: (q) => (q[2] < -0.2 ? M.cream.T[3] : null) });
  // Short soft tufts: a few rows on the flanks and the back, tips back and down; a cream collar on the chest.
  r.tag = 'fur';
  let row = 0;
  for (const [mi, lats] of [
    [0, [0.75, 0.35, -0.05]],
    [1, [0.75, 0.35, -0.05]],
    [2, [0.7, 0.3]],
  ] as [number, number[]][]) {
    const m = masses[mi];
    const F = new F3(m.c, torso.f, torso.s, torso.u);
    for (const lat of lats) {
      row++;
      const n = 5;
      for (let j = 0; j < n; j++) {
        const az = Math.PI / 2 + (j - (n - 1) / 2) * (Math.PI / (n - 1)) * 1.1 + (row % 2 ? 0.25 : 0);
        const q: V3 = [0.2 * Math.cos(row), Math.cos(az) * Math.cos(lat), Math.sin(az) * Math.cos(lat) * 0.4 + Math.sin(lat)];
        const qn = vnorm(q);
        const pos = F.p(qn[0] * m.r[0], qn[1] * m.r[1], qn[2] * m.r[2]);
        const n3 = vnorm(F.v(qn[0] / m.r[0], qn[1] / m.r[1], qn[2] / m.r[2]));
        const dir = vnorm(vadd(vadd(vmul(torso.f, -0.85), vmul(n3, 0.25)), vmul(torso.u, -0.25)));
        tuft(r, vadd(pos, vmul(n3, -0.3)), dir, 1.1 + 0.25 * hash(row, j), 0.75, qn[2] < -0.25 ? M.cream : M.fur);
      }
    }
  }
  for (let j = 0; j < 7; j++) {
    const a = -0.9 + j * 0.3;
    const at = torso.p(6.0, Math.sin(a) * 2.2, -0.4 + Math.cos(a) * 0.6);
    tuft(r, at, vnorm(torso.v(0.25, Math.sin(a) * 0.4, -1)), 1.6, 0.8, M.cream);
  }
  // A tuft at the root of the tail.
  for (const s of [-1, 0, 1]) tuft(r, torso.p(-3.0, s * 0.8, 1.4), vnorm(torso.v(-1, s * 0.3, 0.4)), 1.4, 0.7, M.fur);
}

function drawTail(r: Rig, tail: V3[], torso: F3, M: Palette, bald: number, late: (() => void)[]) {
  r.tag = 'tail';
  // A thin green stem, thicker at the root.
  for (let k = 0; k < tail.length - 1; k++) r.cap(tail[k], tail[k + 1], 0.55 - 0.03 * k, 0.52 - 0.03 * (k + 1), M.stem);
  // The little clock at the tip: a bed and a ball of seeds.
  const tip = tail[tail.length - 1],
    pre = tail[tail.length - 2];
  const d = vnorm(vsub(tip, pre));
  const s = vnorm(vcross(d, Math.abs(vdot3(d, torso.u)) > 0.9 ? torso.f : torso.u));
  const u = vcross(s, d);
  const c = vadd(tip, vmul(d, 1.4));
  r.ball(vadd(tip, vmul(d, 0.4)), 0.65, M.bed);
  r.tag = 'seeds';
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < TAIL_SEEDS; i++) {
    if (hash(i, 91) < bald) continue;
    const z = 1 - (2 * (i + 0.5)) / TAIL_SEEDS,
      rr = Math.sqrt(1 - z * z),
      a = golden * i;
    const dir = vnorm(vadd(vadd(vmul(d, z * 0.8 + 0.2), vmul(s, Math.cos(a) * rr)), vmul(u, Math.sin(a) * rr)));
    r.cap(vadd(c, vmul(dir, 0.6)), vadd(c, vmul(dir, 1.9)), 0.36, 0.13, { ...M.seed, bias: 0.22 });
  }
  if (bald < 0.6) r.ball(c, 1.2 * (1 - bald), { ...M.seed, bias: 0.22 });
  void late;
}

function drawLeg(r: Rig, leg: { front: boolean; sign: number; suffix: string; end: string; joint: V3; knee: V3; ankle: V3; toe: V3 }, floor: F3, M: Palette, late: (() => void)[]) {
  r.tag = 'leg' + leg.suffix + leg.end;
  // A plump furry upper leg, a green «sock» below the knee, a round paw.
  const upper = vnorm(vsub(leg.knee, leg.joint));
  const side = vnorm(vcross(upper, floor.u));
  const up = vnorm(vcross(side, upper));
  r.ell(new F3(vlerp(leg.joint, leg.knee, 0.45), upper, side, up), [0, 0, 0], [leg.front ? 1.8 : 2.4, leg.front ? 1.3 : 1.8, leg.front ? 1.4 : 2.0], M.fur);
  r.cap(leg.knee, leg.ankle, leg.front ? 1.05 : 1.15, 0.95, M.leaf);
  // The sock's leafy cuff: three little points round the knee.
  for (const k of [-1, 0, 1]) {
    const at = vadd(leg.knee, vadd(vmul(side, k * 0.7), vmul(floor.u, -0.2)));
    r.spike(at, vadd(vmul(floor.u, 0.9), vmul(side, k * 0.4)), 0.9, 0.35, M.leaf, 3);
  }
  const fwd = floor.f;
  const pawC = vadd(leg.ankle, vadd(vmul(fwd, 0.5), vmul(floor.u, -0.45)));
  r.ell(new F3(pawC, fwd, floor.s, floor.u), [0, 0, 0], [1.45, 1.2, 0.85], M.leaf);
  const tag = r.tag;
  late.push(() => {
    r.tag = tag;
    for (const k of [-1, 0, 1]) r.line(vadd(pawC, vadd(vmul(fwd, 0.9), vmul(floor.s, k * 0.45))), vadd(pawC, vadd(vmul(fwd, 1.4), vmul(floor.s, k * 0.45))), M.ink, 0, 0.5);
    r.line(leg.knee, vadd(leg.knee, vmul(vnorm(vsub(leg.ankle, leg.knee)), 1.2)), M.leaf.T[3], 0, 0.4);
  });
}

/** The dandelion mane: a bed in the middle, an inner ball of fluff (open at the face), stalks and parasols round it.
 * Seeds with hash < bald are gone; seeds with hash < bloom are yellow petals instead. */
function drawMane(r: Rig, Hf: F3, c: V3, R: number, M: Palette, bald: number, bloom: number, fluff: number, wind: number, late: (() => void)[]) {
  const F = new F3(c, Hf.f, Hf.s, Hf.u);
  r.tag = 'mane';
  // The bed: brown, dotted with seed scars; small while the mane is full, it shows when the seeds are gone.
  r.ell(F, [0, 0, 0], [2.6, 2.9, 2.9], { ...M.bed, pat: (q) => ((Math.floor(q[1] * 6) + Math.floor(q[2] * 6)) % 2 === 0 && q[0] < 0.6 ? M.bed.T[1] : null) });
  // The fluff: an inner soft ball, opened at the face; it thins out as the seeds go.
  // The fluff is a soft white ball (one smooth mass), opened at the face; it shrinks as the seeds go, and turns
  // yellow as the flower opens.
  const full = 1 - bald;
  const inner = (R - 1.0) * (0.45 + 0.55 * full) * (1 - 0.3 * bloom);
  // Rays: seen from the camera, fine grey spokes run out from the middle of the clock (the pattern is computed in the
  // plane facing the viewer, so they always radiate from the centre of the ball, whichever way the head turns).
  const vl = vnorm([vdot3(VIEW, F.f), vdot3(VIEW, F.s), vdot3(VIEW, F.u)]);
  const e1 = vnorm(Math.abs(vl[2]) < 0.9 ? vcross(vl, [0, 0, 1]) : vcross(vl, [0, 1, 0]));
  const e2 = vcross(vl, e1);
  const spoke = mixc(M.seed.T[1], M.seed.T[2], 0.45);
  const rays: Mat['pat'] = (q) => {
    const x = vdot3(q, e1),
      y = vdot3(q, e2);
    const rad = Math.hypot(x, y);
    if (rad < 0.3) return null;
    const ph = ((Math.atan2(y, x) / TAU) * 40 + 40) % 1;
    return ph < 0.2 + 0.1 * (1 - rad) ? spoke : null;
  };
  const ballMat: Mat = bloom > 0.5 ? { ...M.petal, bias: -0.12 } : { ...M.seed, bias: 0.22, pat: rays };
  if (full > 0.12) {
    r.ell(F, [0, 0, 0], [inner * 0.95, inner, inner], ballMat, (q) => q[0] > 0.62);
    // The opening for the face is closed by a flat disc of the same fluff behind the head, so a turned head never
    // shows the inside of the ball.
    r.ell(F, [inner * 0.95 * 0.6, 0, 0], [0.35, inner * 0.8, inner * 0.8], ballMat);
  }
  // Each seed: a parasol bump on the ball (they make the rim soft and scalloped, one silhouette, no specks), and on
  // the side facing us a fine pale stalk and a white sparkle — the grain of a dandelion clock. Petals instead are
  // flat yellow straps that stick out.
  r.tag = 'seeds';
  const back = vmul(Hf.f, -1);
  for (const sd of SEEDS) {
    if (hash(sd.i, 29) < bald) continue;
    const petal = hash(sd.i, 17) < bloom;
    let dir = F.v(...sd.d);
    if (wind) dir = vnorm(vadd(dir, vmul(back, 0.3 * wind * (1 - vdot3(dir, back)))));
    if (petal) {
      // Rays: a long light outer petal on every other seed, a shorter deeper one on the rest.
      const outer = sd.i % 2 === 0;
      const len = R * (outer ? 1.08 : 0.86) * (0.96 + 0.08 * hash(sd.i, 7)) * (1 + 0.06 * fluff);
      if (outer || vdot3(dir, VIEW) < 0.6) r.cap(vadd(c, vmul(dir, inner * 0.7)), vadd(c, vmul(dir, len)), 0.62, 0.42, outer ? { ...M.petal, bias: 0.08 } : { ...M.petal, bias: -0.06 });
      continue;
    }
    const rim = inner * (0.98 + 0.04 * sd.len) * (1 + 0.04 * fluff);
    const facing = vdot3(dir, VIEW);
    if (facing < 0.45) {
      // On the rim: a thin pointed parasol sticking out — a fine spiky edge.
      r.cap(vadd(c, vmul(dir, rim - 0.4)), vadd(c, vmul(dir, rim + 0.9 + 0.4 * hash(sd.i, 5))), 0.42, 0.16, { ...M.seed, bias: 0.25 });
    } else if (sd.i % 2 === 0) r.dot(vadd(c, vmul(dir, rim + 0.3)), M.pale, 0, 1, 0.8);
  }
  void late;
}

function drawHead(
  r: Rig,
  Hf: F3,
  eyes: { sign: number; suffix: string; at: V3; out: V3 }[],
  ears: { sign: number; suffix: string; base: V3; tip: V3; dir: V3; len: number }[],
  M: Palette,
  get: Get,
  blink: boolean,
  late: (() => void)[],
) {
  r.tag = 'head';
  // A big round head, cream cheeks, a short white muzzle, a small nose.
  r.ell(Hf, [0, 0, 0.6], [4.2, 4.5, 4.2], M.furSmooth);
  for (const s of [-1, 1]) r.ell(Hf, [1.9, s * 2.6, -1.0], [2.3, 2.0, 1.9], M.cream);
  r.tag = 'muzzle';
  r.ell(Hf, [3.4, 0, -1.2], [1.9, 2.0, 1.45], M.cream);
  r.ball(Hf.p(5.15, 0, -0.65), 0.6, M.nose);
  const open = saturate(get('mouth'));
  if (open > 0.05) {
    r.ell(Hf, [4.1, 0, -2.0 - 0.35 * open], [1.0, 1.05, 0.45 + 0.6 * open], M.mouth);
    r.ell(Hf, [3.8, 0, -2.45 - 0.6 * open], [1.2, 1.25, 0.55], M.cream);
  }
  // Pale brows over the eyes.
  for (const s of [-1, 1]) r.ell(Hf, [3.0, s * 2.0, 2.45 + 0.45 * get('browUp')], [0.9, 1.15, 0.6], M.cream);
  // Huge dark eyes with two highlights; lids of fur; closed = a soft curve, happy (`joy`) = an arch.
  const joy = get('joy') > 0.5;
  for (const e of eyes) {
    r.tag = 'eye' + e.suffix;
    const lid = Math.max(blink || joy ? 1 : 0, get('lid'), get('lid' + e.suffix));
    const look = Hf.v(0, get('lookX') * 0.45, get('lookY') * 0.45);
    if (lid < 0.95) {
      r.ball(vadd(e.at, look), 1.6, M.eye);
      if (vdot3(e.out, VIEW) > -0.1)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const cc = vadd(vadd(e.at, look), vmul(e.out, 1.5));
          r.dot(vadd(cc, Hf.v(0, -0.45, 0.6)), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(cc, Hf.v(0, -0.25, 0.35)), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(cc, Hf.v(0, 0.45, -0.45)), hx('#b8a0d8'), 0, 1, 0.9);
        });
    }
    if (lid > 0.05) {
      const ln = 1 - 2 * lid;
      const lidF = new F3(e.at, e.out, Hf.s, vnorm(vcross(e.out, Hf.s)));
      r.ell(lidF, [0, 0, 0], [1.8, 1.8, 1.8], M.furSmooth, (q) => q[2] < ln);
      if (lid > 0.9 && vdot3(e.out, VIEW) > -0.1)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const cc = vadd(e.at, vmul(e.out, 1.75));
          const k = joy ? -1 : 1;
          r.line(vadd(cc, Hf.v(0, -1.0, 0.2 * k)), vadd(cc, Hf.v(0, 0, -0.35 * k)), M.ink, 0, 1);
          r.line(vadd(cc, Hf.v(0, 0, -0.35 * k)), vadd(cc, Hf.v(0, 1.0, 0.2 * k)), M.ink, 0, 1);
        });
    }
  }
  // Ears: long dandelion leaves — a flat blade, toothed edges pointing back toward the root, a pale midrib.
  r.tag = 'ears';
  for (const ear of ears) {
    const side = vnorm(vcross(ear.dir, Hf.f));
    const flat = vnorm(vcross(side, ear.dir));
    const mid = vlerp(ear.base, ear.tip, 0.5);
    r.ell(new F3(mid, ear.dir, side, flat), [0, 0, 0], [ear.len * 0.5, 1.5, 0.4], M.leaf);
    // Teeth: three per edge, each a flat spike leaning back down the leaf, like a dandelion leaf's lobes.
    for (let k = 0; k < 3; k++)
      for (const e of [-1, 1]) {
        const along = 0.25 + k * 0.22;
        const w = 1.5 * Math.sqrt(Math.max(0, 1 - (2 * along - 1) ** 2));
        const at = vadd(vlerp(ear.base, ear.tip, along), vmul(side, e * w * 0.8));
        r.spike(at, vadd(vmul(side, e * 0.85), vmul(ear.dir, -0.6)), 1.3, 0.42, M.leaf, 3);
      }
    const tag = r.tag;
    late.push(() => {
      r.tag = tag;
      r.line(vlerp(ear.base, ear.tip, 0.05), vlerp(ear.base, ear.tip, 0.9), M.leaf.T[3], 0, 0.5);
    });
  }
  late.push(() => {
    r.tag = 'head';
    // Pollen spots on the cheeks, whiskers, the mouth line, the nose highlight.
    for (const s of [-1, 1]) {
      if (vdot3(Hf.v(1, s * 0.6, 0), VIEW) > 0.0) {
        r.dot(Hf.p(2.6, s * 3.25, -1.0), M.pollen, 0, 1, 0.8);
        r.dot(Hf.p(2.3, s * 3.4, -0.6), M.pollen, 0, 1, 0.8);
        r.dot(Hf.p(2.9, s * 3.1, -1.4), M.pollen, 0, 1, 0.7);
      }
      for (const k of [0, 1]) r.line(Hf.p(4.4, s * 1.4, -1.25 - k * 0.3), Hf.p(4.1, s * (3.2 + k * 0.2), -0.95 - k * 0.55), hx('#fffaf0'), 0, 0.5);
    }
    r.line(Hf.p(5.0, 0, -1.1), Hf.p(4.8, 0, -1.65), M.ink, 0, 0.8);
    for (const s of [-1, 1]) r.line(Hf.p(4.8, 0, -1.65), Hf.p(4.35, s * 0.8, -1.85), M.ink, 0, 0.8);
    r.dot(Hf.p(5.55, -0.25, -0.35), hx('#ffffff'), 0, 1, 1);
    if (get('blush') > 0) for (const s of [-1, 1]) if (vdot3(Hf.v(1, s * 0.6, 0), VIEW) > 0.05) r.dot(Hf.p(2.8, s * 2.9, -0.6), hx('#f4908a'), 0, 1, 0.5 + 0.4 * saturate(get('blush')));
  });
}

export type { Palette };
