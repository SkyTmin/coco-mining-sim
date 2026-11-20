// Огонёк, the red panda. Its own skeleton: a long furry body on four short dark legs that rears up on its hind legs
// (`rear` pitches the trunk round the hips, the front legs become arms), a round head with big white-rimmed ears and a
// white mask on a short neck, and a huge ringed tail — the part that behaves on its own, which a rare creature's
// technique needs (canon §5): a chain of nine ringed segments that curls like a question mark at rest, wags, wraps
// round the feet when it sits (`tailWrap`), and turns into a rotor (`tailRotor` + `tailSpin`): a short mast straight
// up, the rest flat and spinning. The tail and the ears ride on a spring that lags every move and swings back.
// Walking is a four-legged lateral-sequence gait. Pose keys (all optional, 0 = rest) are read through `get`; positions
// are rig units before `card.proportions.scale`.
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
export const HIP_Z = 6.6;
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
  const w = TAU * 2.2,
    z = 0.28,
    wd = w * Math.sqrt(1 - z * z);
  return Array.from({ length: LAG_K }, (_, k) => {
    const tau = k / 24;
    return -Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
  });
})();

/** The tail: segment lengths, radii at the segment's start, rest angles up from straight back (rad). */
const TAIL_LEN = [2.0, 2.0, 2.0, 2.0, 1.9, 1.8, 1.7, 1.6, 1.4];
const TAIL_R = [1.9, 2.3, 2.6, 2.8, 2.85, 2.75, 2.55, 2.2, 1.7, 0.9];
const TAIL_REST = [0.5, 0.82, 1.12, 1.38, 1.6, 1.84, 2.12, 2.46, 2.82];
/** The rotor: a mast straight up over the head (four segments), then a flat blade; the hub is the mast's top. */
const TAIL_ROTOR = [1.1, 1.45, 1.57, 1.57, 0.08, 0, 0.02, 0.06, 0.1];
const HUB = 4;

interface Palette {
  rust: Mat;
  /** The same rust for the big masses (head, trunk): a quiet finish, the fur comes from the locks. */
  rustSmooth: Mat;
  rustDeep: Mat;
  dark: Mat;
  white: Mat;
  ring: Mat;
  nose: Mat;
  eye: Mat;
  claw: Mat;
  mouth: Mat;
  ink: RGBA;
  pale: RGBA;
  tear: RGBA;
}

export function pandaFrame(card: CreatureCard, route: MotionPlan, sample: PoseSample, loops: Record<string, number>): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const palettes = (variant: Variant): Palette => {
    const g = variant === 'gold';
    const pick = (name: string, warm = 0.5) => (g ? gold(card4(card, name), warm) : T(card4(card, name)));
    return {
      rust: { T: pick('rust') },
      rustSmooth: { T: [...pick('rust')] as Mat['T'] },
      rustDeep: { T: g ? gold(['#3a1008', '#5e1c0c', '#8a2e12', '#a83e16'], 0.4) : T(['#3a1008', '#5e1c0c', '#8a2e12', '#a83e16']) },
      dark: { T: pick('dark', 0.3) },
      white: { T: pick('white', 0.25), bias: 0.06 },
      ring: { T: pick('ring', 0.4) },
      nose: { T: T(['#08060a', '#14101a', '#2a2430', '#4a4250']) },
      eye: { T: T(['#050304', '#120a08', '#24140e', '#3a2418']), flat: 1 },
      claw: { T: T(['#6a5a4a', '#a8988a', '#d8ccbc', '#f4ece0']) },
      mouth: { T: T(['#3a0c14', '#6a1e2a', '#a8445a', '#d87088']) },
      ink: hx('#1a0c08'),
      pale: g ? hx('#fff4c8') : hx('#fff6e8'),
      tear: g ? hx('#a86a18') : hx('#7a2a12'),
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
    const puff = 1 + 0.12 * fluff;

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
    // `sit`: on its haunches like a cat, front paws planted in front, the trunk upright.
    const sit = saturate(get('sit'));
    const rear = get('rear') + sit * 1.05;
    const pivotZ = HIP_Z + get('lift') - get('crouch') - sit * 3.4 + 0.1 * breathe + (walking ? 0.45 * Math.abs(gait) : 0);
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
    // Body masses along the spine (hips → chest); `bend` arches the middle.
    const arch = get('bend');
    const masses: { c: V3; r: V3 }[] = [
      { c: torso.p(0.0, 0, 0.7), r: [4.1 * puff, 3.9 * puff, 3.9 * puff] },
      { c: torso.p(2.9, 0, 1.0 + 0.6 * arch), r: [3.9 * puff, 3.6 * puff, 3.6 * puff * (1 + 0.012 * breathe)] },
      { c: torso.p(5.6, 0, 0.9), r: [4.0 * puff, 3.8 * puff, 3.9 * puff] },
    ];
    // The head: on a short neck from the chest; it stays level while the trunk rears (unless nodded).
    const neckBase = torso.p(7.0, 0, 2.0);
    // Level unless the whole body turns head over heels (`spin`): then it rolls round with the trunk.
    const headLevel = get('spin') ? roller.turn(yawB) : F3.yaw(yawB);
    const headBase = vadd(vadd(neckBase, vmul(torso.u, 3.0 + get('stretch'))), vmul(torso.f, 1.2));
    const yawH = 0.85 + get('headYaw') + lead * 0.5,
      rollH = get('headRoll');
    const headF = new F3(headBase, headLevel.f, headLevel.s, headLevel.u).turn(yawH).pitch(get('nod') - 0.12 + 0.35 * rear * 0).roll(rollH);
    const points: Record<string, V3> = {
      floor: [0, 0, 0],
      body: masses[1].c,
      chest: masses[2].c,
      hips: masses[0].c,
      head: headF.o,
      crown: headF.p(-0.2, 0, 5.0),
      nose: headF.p(5.7, 0, -0.5),
      mouth: headF.p(4.6, 0, -1.9),
      back: torso.p(2.6, 0, 4.8),
    };

    // ---- legs and arms ----------------------------------------------------------------------------------------
    const air = Math.max(0, get('lift'));
    const armRise = saturate((rear - 0.35) / 0.6) * (1 - sit);
    const armFrame = floor.at(get('lean'), 0, pivotZ - HIP_Z);
    const legs = (['H', 'F'] as const).flatMap((end) =>
      [-1, 1].map((sign) => {
        const suffix = sign < 0 ? 'L' : 'R';
        const front = end === 'F';
        const name = (front ? 'paw' : 'foot') + suffix;
        // Lateral-sequence walk: left hind, left fore, right hind, right fore.
        const phase = (front ? 0.25 : 0) + (sign < 0 ? 0 : 0.5);
        const step = strideFoot(walking ? gaitPhase : t, phase, walking ? route.stride / scale : Math.PI / 4);
        const floorFrame = turning ? floor.turn(step.forward * 0.3) : legFloor;
        const joint = front ? torso.p(6.4, sign * 2.3, -0.9) : torso.p(0.3, sign * 2.5, -0.5);
        const restF = front ? 6.9 : 0.4;
        const lift = (walking || turning ? step.lift * (card.proportions.stepHeight ?? 2.5) : 0) + get('tap' + suffix + end) * 1.8;
        let stand = floorFrame.p(restF + (walking ? step.forward : 0) + air * 0.05, sign * 2.7, lift + air * 0.92);
        if (sit) stand = vlerp(stand, floorFrame.p(front ? 3.4 : 1.2, sign * (front ? 1.5 : 2.9), lift), sit);
        if (front && armRise > 0) {
          // Rearing: the front legs become arms, held in front of the chest, riding with the body.
          const arm = vadd(joint, vadd(vmul(torso.f, 5.2), vadd(vmul(torso.u, 0.4), vmul(torso.s, sign * 4.4))));
          stand = vlerp(stand, arm, armRise);
        }
        const tuck = saturate(get('tuck') + get('tuck' + suffix + end));
        if (tuck) stand = vlerp(stand, vadd(joint, vadd(vmul(torso.u, -2.4), vmul(torso.f, front ? 1.2 : 0.8))), tuck);
        const toe = goal(name, stand, front && armRise > 0.5 ? armFrame : legFloor);
        const ankle = vadd(toe, vmul(legFloor.u, 0.9));
        // A paw raised above its shoulder (washing, hiding the face, waving) bends the elbow out and down, not back
        // through the chest.
        const raised = front ? saturate((vdot3(vsub(toe, joint), legFloor.u) + 1) / 3) : 0;
        const pole = front
          ? vadd(vmul(legFloor.f, -1 + raised), vadd(vmul(legFloor.s, sign * (0.2 + 1.2 * raised)), vmul(legFloor.u, -0.6 * raised)))
          : vadd(legFloor.f, vmul(legFloor.s, sign * 0.2));
        const knee = ik(joint, ankle, front ? 3.6 : 3.9, front ? 3.4 : 3.7, pole);
        points[name] = toe;
        const down = toe[2] < 0.1 && (!(walking || turning) || step.planted) && tuck < 0.3 && !(front && armRise > 0.5);
        return { end, front, sign, suffix, name, joint, knee, ankle, toe, down, open: saturate(get('claws')) };
      }),
    );

    // ---- the tail ---------------------------------------------------------------------------------------------
    const rotor = saturate(get('tailRotor'));
    const wrapK = saturate(get('tailWrap'));
    const tailBase = torso.p(-3.3, 0, 1.1);
    const level = F3.yaw(yawB);
    const tail: V3[] = [tailBase];
    {
      const springUp = -0.07 * lagUp,
        springSide = -0.09 * lagSide;
      let phi = 0;
      for (let k = 0; k < TAIL_LEN.length; k++) {
        const u = (k + 1) / TAIL_LEN.length;
        let theta = TAIL_REST[k] + get('tailUp') * 0.3 + get('tailCurl') * 0.16 * k + springUp * u * 2;
        theta = theta * (1 - rotor) + TAIL_ROTOR[k] * rotor;
        phi += (get('tailWag') * 0.22 + springSide * 0.3) * (1 - rotor);
        let d = vadd(vmul(torso.f, -Math.cos(theta)), vmul(torso.u, Math.sin(theta)));
        d = rotate(d, torso.u, phi);
        if (rotor && k >= HUB) d = rotate(d, torso.u, get('tailSpin'));
        if (wrapK) {
          // Wrapped round the feet: low along the ground, sweeping forward round the near side.
          const ww = rotate(vadd(vmul(level.f, -Math.cos(0.12 - 0.02 * k)), vmul(level.u, Math.sin(0.12 - 0.02 * k))), level.u, -0.36 * (k + 1) + 0.2);
          d = vnorm(vlerp(d, ww, wrapK));
        }
        tail.push(vadd(tail[k], vmul(vnorm(d), TAIL_LEN[k] * (1 + 0.04 * fluff))));
      }
      points.tailTip = tail[tail.length - 1];
      points.tailMid = tail[4];
      points.tailHub = tail[HUB];
    }

    // ---- head parts -------------------------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const at = headF.p(3.7, sign * 1.85, 0.7);
      const out = vnorm(headF.v(1, sign * 0.38, 0.1));
      points['eye' + suffix] = vadd(at, vmul(out, 1.3));
      return { sign, suffix, at, out };
    });
    // Ears: big, round-tipped, tilted out; `ears` perks (+) or flattens (−), the spring flicks them.
    const ears = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const perk = get('ears') + get('ear' + suffix);
      const out = 0.5 - 0.25 * perk + sign * 0.05 * lagHead - 0.04 * lagUp;
      const back = 0.15 + 0.45 * Math.max(0, -perk) + 0.08 * lagHead * sign;
      const base = headF.p(-0.4, sign * 2.9, 3.2);
      const dir = vnorm(headF.v(-Math.sin(back), sign * Math.sin(out), Math.cos(out) * Math.cos(back)));
      const tip = vadd(base, vmul(dir, 3.6 + 0.4 * Math.max(0, perk)));
      points['ear' + suffix] = tip;
      return { sign, suffix, base, tip, dir };
    });

    // ---- drawing ----------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    const blink = l.blink > 0.5 || get('blink') > 0.5;
    if (!hidden) {
      drawTrunk(r, torso, masses, neckBase, headBase, M, fluff, t, late);
      drawTail(r, tail, torso, M, fluff, late);
      for (const leg of legs) drawLeg(r, leg, legFloor, M, late);
      drawHead(r, headF, eyes, ears, M, get, blink, late);
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(
      r,
      floor,
      [
        [M.rust, 'fur'],
        [M.rustSmooth, 'skin'],
        [M.rustDeep, 'fur'],
        [M.dark, 'fur'],
        [M.white, 'fur'],
        [M.ring, 'fur'],
        [M.nose, 'skin'],
        [M.claw, 'lacquer'],
        [M.mouth, 'skin'],
      ],
      'fur',
    );
    for (const draw of late) draw();
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#1c1008';
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
        : { radius: (size * 0.3) / (1 + air * 0.03), opacity: 0.6 / (1 + air * 0.05), reflectionOpacity: frame.px.w > size ? 0 : 1 };
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

/** A lock of fur: a tapering capsule from `at` along `dir`. */
function lock(r: Rig, at: V3, dir: V3, len: number, w: number, mat: Mat) {
  r.cap(at, vadd(at, vmul(dir, len)), w, w * 0.25, mat);
}

function drawTrunk(r: Rig, torso: F3, masses: { c: V3; r: V3 }[], neckBase: V3, headBase: V3, M: Palette, fluff: number, t: number, late: (() => void)[]) {
  // Rust back and sides, the belly and the chest dark (a red panda's underside is black-brown).
  const under = (k: number): Mat['pat'] => (q) => (q[2] < k - 0.15 * Math.abs(q[1]) ? M.dark.T[q[2] < k - 0.3 ? 1 : 2] : null);
  r.tag = 'body';
  masses.forEach((m, i) => r.ell(new F3(m.c, torso.f, torso.s, torso.u), [0, 0, 0], m.r, { ...M.rustSmooth, pat: under(i === 2 ? -0.05 : -0.35) }));
  // The neck: thick fur from the chest up to the head, dark at the throat.
  r.tag = 'neck';
  const neckMid = vlerp(neckBase, headBase, 0.5);
  const nd = vnorm(vsub(headBase, neckBase));
  const ns = vnorm(vcross(nd, torso.f));
  r.ell(new F3(neckMid, nd, ns, vcross(ns, nd)), [0, 0, 0], [2.6, 2.9, 3.0], { ...M.rustSmooth, pat: (q) => (q[2] < -0.45 ? M.dark.T[2] : null) });
  // Fur locks: rows over the back and the flanks, tips pointing back and down; a ridge on the spine.
  r.tag = 'fur';
  let row = 0;
  for (const [mi, lats] of [[0, [0.95, 0.65, 0.35, 0.05, -0.3]], [1, [0.95, 0.65, 0.35, 0.05, -0.3]], [2, [0.9, 0.6, 0.3, 0.0, -0.35]]] as [number, number[]][]) {
    const m = masses[mi];
    const F = new F3(m.c, torso.f, torso.s, torso.u);
    for (const lat of lats) {
      row++;
      const n = 6;
      for (let j = 0; j < n; j++) {
        const az = Math.PI / 2 + (j - (n - 1) / 2) * (Math.PI / (n - 1)) * 1.05 + (row % 2 ? 0.2 : 0);
        // Around the side axis: az = π/2 is the back, 0 / π the two flanks.
        const q: V3 = [0.25 * Math.cos(row), Math.cos(az) * Math.cos(lat), Math.sin(az) * Math.cos(lat) * 0.4 + Math.sin(lat)];
        const qn = vnorm(q);
        const pos = F.p(qn[0] * m.r[0], qn[1] * m.r[1], qn[2] * m.r[2]);
        const n3 = vnorm(F.v(qn[0] / m.r[0], qn[1] / m.r[1], qn[2] / m.r[2]));
        const dir = vnorm(vadd(vadd(vmul(torso.f, -0.85), vmul(n3, 0.18 + 0.3 * fluff)), vmul(torso.u, -0.2)));
        lock(r, vadd(pos, vmul(n3, -0.3)), dir, 1.6 + 0.3 * hash(row, j), 0.9, qn[2] < -0.2 ? M.dark : j % 3 ? M.rust : M.rustDeep);
      }
    }
  }
  // A ruff of rust fur round the neck, tips pointing back over the shoulders.
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * TAU;
    const radial = vadd(vmul(torso.s, Math.cos(a)), vmul(torso.u, Math.sin(a) * 0.9));
    const at = vadd(vlerp(neckBase, headBase, 0.35), vmul(radial, 2.6));
    lock(r, at, vnorm(vadd(vmul(torso.f, -0.8), vmul(radial, 0.35))), 1.7, 0.85, Math.sin(a) < -0.3 ? M.dark : M.rust);
  }
  // A fringe of dark fur along the belly.
  for (let j = 0; j < 12; j++) {
    const at = torso.p(-0.8 + j * 0.7, (j % 2 ? 1 : -1) * 1.4, -3.3);
    lock(r, at, vnorm(torso.v(-0.5, 0, -1)), 1.4, 0.8, M.dark);
  }
  // Chest bib of dark fluff between the front legs.
  for (let j = 0; j < 5; j++) {
    const at = torso.p(7.6, (j - 2) * 0.9, -1.4 + Math.abs(j - 2) * 0.3);
    lock(r, at, vnorm(torso.v(0.3, (j - 2) * 0.15, -1)), 2.0, 0.8, M.dark);
  }
  void t;
  void late;
}

function drawTail(r: Rig, tail: V3[], torso: F3, M: Palette, fluff: number, late: (() => void)[]) {
  r.tag = 'tail';
  // Nine rings: rust and pale ginger in turn, the last one dark; every ring has a fringe of locks round its rim.
  for (let k = 0; k < tail.length - 1; k++) {
    const a = tail[k],
      b = tail[k + 1];
    const d = vnorm(vsub(b, a));
    const s = vnorm(vcross(d, Math.abs(vdot3(d, torso.u)) > 0.9 ? torso.f : torso.u));
    const u = vcross(s, d);
    const rr = ((TAIL_R[k] + TAIL_R[k + 1]) / 2) * (1 + 0.1 * fluff);
    const len = vdot3(vsub(b, a), d);
    const mat = k === tail.length - 2 ? M.dark : k % 2 ? M.ring : M.rust;
    r.ell(new F3(vlerp(a, b, 0.5), d, s, u), [0, 0, 0], [len * 0.62 + rr * 0.2, rr, rr], mat);
    const fringe = k === tail.length - 2 ? 6 : 10;
    for (let j = 0; j < fringe; j++) {
      const ang = (j / fringe) * TAU + k * 0.6;
      const radial = vadd(vmul(s, Math.cos(ang)), vmul(u, Math.sin(ang)));
      const at = vadd(vlerp(a, b, 0.78), vmul(radial, rr * 0.82));
      lock(r, vadd(at, vmul(radial, -0.25)), vnorm(vadd(vmul(d, 0.9), vmul(radial, 0.3))), 1.1 + 0.25 * hash(k, j), 0.95, mat);
    }
  }
  // The tip: a soft dark brush.
  const tip = tail[tail.length - 1],
    pre = tail[tail.length - 2];
  lock(r, tip, vnorm(vsub(tip, pre)), 1.2, 0.8, M.dark);
  void late;
}

function drawLeg(
  r: Rig,
  leg: { front: boolean; sign: number; suffix: string; end: string; joint: V3; knee: V3; ankle: V3; toe: V3; open: number },
  floor: F3,
  M: Palette,
  late: (() => void)[],
) {
  r.tag = 'leg' + leg.suffix + leg.end;
  // Thick dark legs, fluffy at the top, a round paw with pale claws.
  const upper = vnorm(vsub(leg.knee, leg.joint));
  const side = vnorm(vcross(upper, floor.u));
  const up = vnorm(vcross(side, upper));
  r.ell(new F3(vlerp(leg.joint, leg.knee, 0.45), upper, side, up), [0, 0, 0], [leg.front ? 2.1 : 2.8, leg.front ? 1.45 : 2.1, leg.front ? 1.55 : 2.3], M.dark);
  r.cap(leg.knee, leg.ankle, leg.front ? 1.3 : 1.4, 1.15, M.dark);
  // Fluffy fur on the upper leg, tips down and back.
  for (let j = 0; j < 3; j++) {
    const at = vadd(vlerp(leg.joint, leg.knee, 0.3 + j * 0.2), vmul(side, leg.sign * (leg.front ? 1.4 : 1.8)));
    lock(r, at, vnorm(vadd(vmul(floor.u, -1), vmul(floor.f, -0.4))), 1.5, 0.75, M.dark);
  }
  const fwd = vnorm(vsub(floor.v(1, 0, 0), vmul(floor.u, 0)));
  const pawC = vadd(leg.ankle, vadd(vmul(fwd, 0.7), vmul(floor.u, -0.5)));
  r.ell(new F3(pawC, fwd, floor.s, floor.u), [0, 0, 0], [1.7, 1.4, 1.0], M.dark);
  r.tag = 'claws';
  for (let k = -1.5; k <= 1.5; k += 1) {
    // A round toe, then a pale claw.
    r.ball(vadd(pawC, vadd(vmul(fwd, 1.25), vadd(vmul(floor.s, k * 0.55), vmul(floor.u, -0.15)))), 0.5, M.dark);
    const base = vadd(pawC, vadd(vmul(fwd, 1.4), vadd(vmul(floor.s, k * 0.55), vmul(floor.u, -0.3))));
    r.cap(base, vadd(base, vadd(vmul(fwd, 0.7 + 0.4 * leg.open), vmul(floor.u, -0.35 + 0.3 * leg.open))), 0.26, 0.08, M.claw);
  }
  const tag = r.tag;
  late.push(() => {
    r.tag = tag;
    // A fluffy edge where the dark leg meets the rust body; the splits between the toes.
    r.line(leg.joint, vadd(leg.joint, vmul(floor.u, -1.2)), M.rustDeep.T[2], 0, 0.4);
    for (const k of [-1, 0, 1]) r.line(vadd(pawC, vadd(vmul(fwd, 1.0), vmul(floor.s, k * 0.55 + 0.27))), vadd(pawC, vadd(vmul(fwd, 1.6), vmul(floor.s, k * 0.55 + 0.27))), M.ink, 0, 0.5);
  });
}

function drawHead(
  r: Rig,
  Hf: F3,
  eyes: { sign: number; suffix: string; at: V3; out: V3 }[],
  ears: { sign: number; suffix: string; base: V3; tip: V3; dir: V3 }[],
  M: Palette,
  get: Get,
  blink: boolean,
  late: (() => void)[],
) {
  r.tag = 'head';
  // A round rust head with full white cheek ruffs, a short white muzzle, a black button nose.
  r.ell(Hf, [0, 0, 0.7], [4.3, 4.8, 4.4], M.rustSmooth);
  for (const s of [-1, 1]) {
    r.ell(Hf, [1.9, s * 2.9, -1.0], [2.4, 2.2, 2.0], M.white);
    // The ruff: white locks fanning out from the cheek.
    r.tag = 'ruff';
    for (let j = 0; j < 7; j++) {
      const a = -1.0 + j * 0.34;
      const at = Hf.p(1.2, s * (3.6 + 0.3 * Math.cos(a)), -0.9 + 1.6 * Math.sin(a));
      lock(r, at, vnorm(Hf.v(-0.35, s * 0.9, Math.sin(a) * 0.6 - 0.25)), 1.8, 0.75, M.white);
    }
    r.tag = 'head';
  }
  // Fur on the crown and the back of the head, tips pointing back.
  r.tag = 'ruff';
  for (let j = 0; j < 13; j++) {
    const a = -1.2 + (j % 5) * 0.6,
      lat = j < 5 ? 0.75 : j < 10 ? 0.35 : 0.05;
    const n = vnorm(Hf.v(-0.35 + Math.cos(lat) * Math.cos(a) * 0.3 - 0.4, Math.sin(a) * Math.cos(lat), Math.sin(lat)));
    const at = vadd(Hf.p(0, 0, 0.7), vadd(vmul(Hf.f, n[0] * 0), vmul(n, 4.2)));
    lock(r, at, vnorm(vadd(Hf.v(-1, 0, -0.2), vmul(n, 0.3))), 1.4, 0.8, j % 2 ? M.rust : M.rustDeep);
  }
  r.tag = 'muzzle';
  r.ell(Hf, [3.6, 0, -1.1], [2.2, 2.25, 1.65], M.white);
  r.ball(Hf.p(5.55, 0, -0.45), 0.78, M.nose);
  const open = saturate(get('mouth'));
  if (open > 0.05) {
    r.ell(Hf, [4.3, 0, -2.1 - 0.4 * open], [1.1, 1.2, 0.5 + 0.7 * open], M.mouth);
    r.ell(Hf, [4.0, 0, -2.6 - 0.7 * open], [1.3, 1.4, 0.6], M.white);
  }
  // White brow spots over the eyes.
  for (const s of [-1, 1]) r.ell(Hf, [3.2, s * 1.9, 2.4 + 0.5 * get('browUp')], [1.0, 1.25, 0.8], M.white);
  // Eyes: big dark glossy beads; lids of rust fur; closed = a soft curve, happy (`joy`) = an arch.
  const joy = get('joy') > 0.5;
  for (const e of eyes) {
    r.tag = 'eye' + e.suffix;
    const lid = Math.max(blink || joy ? 1 : 0, get('lid'), get('lid' + e.suffix));
    const look = Hf.v(0, get('lookX') * 0.4, get('lookY') * 0.4);
    if (lid < 0.95) {
      r.ball(vadd(e.at, look), 1.25, M.eye);
      if (vdot3(e.out, VIEW) > -0.05)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const c = vadd(vadd(e.at, look), vmul(e.out, 1.15));
          r.dot(vadd(c, Hf.v(0, -0.35, 0.45)), hx('#ffffff'), 0, 1, 1);
          r.dot(vadd(c, Hf.v(0, 0.35, -0.35)), hx('#c8b0a0'), 0, 1, 0.9);
        });
    }
    if (lid > 0.05) {
      const line = 1 - 2 * lid;
      const lidF = new F3(e.at, e.out, Hf.s, vnorm(vcross(e.out, Hf.s)));
      r.ell(lidF, [0, 0, 0], [1.45, 1.45, 1.45], M.rust, (q) => q[2] < line);
      if (lid > 0.9 && vdot3(e.out, VIEW) > -0.05)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          const c = vadd(e.at, vmul(e.out, 1.4));
          const k = joy ? -1 : 1;
          r.line(vadd(c, Hf.v(0, -0.9, 0.2 * k)), vadd(c, Hf.v(0, 0, -0.3 * k)), M.ink, 0, 1);
          r.line(vadd(c, Hf.v(0, 0, -0.3 * k)), vadd(c, Hf.v(0, 0.9, 0.2 * k)), M.ink, 0, 1);
        });
    }
  }
  // Ears: a rust cone with a thick white rim and a dark furry inside.
  r.tag = 'ears';
  for (const ear of ears) {
    const side = vnorm(vcross(ear.dir, Hf.f));
    const mid = vlerp(ear.base, ear.tip, 0.45);
    const flat = vnorm(vcross(side, ear.dir));
    r.ell(new F3(mid, ear.dir, side, flat), [0, 0, 0], [2.2, 1.7, 0.8], M.white);
    r.ell(new F3(vadd(mid, vmul(flat, 0.35)), ear.dir, side, flat), [0, 0, 0], [1.6, 1.15, 0.6], M.dark);
    r.ell(new F3(vadd(mid, vmul(flat, -0.4)), ear.dir, side, flat), [0, 0, 0], [2.0, 1.5, 0.6], M.rust);
    // White tufts on the rim.
    for (const k of [-1, 0, 1]) lock(r, vadd(vlerp(ear.base, ear.tip, 0.55 + 0.2 * Math.abs(k) * 0), vmul(side, k * 1.4)), vnorm(vadd(ear.dir, vmul(side, k * 0.8))), 1.1, 0.5, M.white);
    const tag = r.tag;
    late.push(() => {
      r.tag = tag;
      r.line(vlerp(ear.base, ear.tip, 0.2), vlerp(ear.base, ear.tip, 0.75), M.pale, 0, 0.5);
      for (const k of [-1, 1]) r.line(vadd(vlerp(ear.base, ear.tip, 0.25), vmul(side, k * 0.5)), vadd(vlerp(ear.base, ear.tip, 0.6), vmul(side, k * 0.8)), M.pale, 0, 0.5);
    });
  }
  late.push(() => {
    r.tag = 'head';
    // The red «tear» stripes from the inner eyes down past the muzzle, whisker dots, the mouth line, nostrils.
    for (const s of [-1, 1]) {
      if (vdot3(Hf.v(1, s * 0.6, 0), VIEW) > -0.2) {
        r.line(Hf.p(4.3, s * 1.2, 0.0), Hf.p(4.1, s * 1.7, -1.5), M.tear, 0, 0.7);
        r.line(Hf.p(4.1, s * 1.7, -1.5), Hf.p(3.5, s * 2.0, -2.4), M.tear, 0, 0.7);
      }
      for (const k of [0, 1, 2]) r.dot(Hf.p(4.6 - k * 0.3, s * (1.1 + k * 0.3), -1.2 - k * 0.15), hx('#c8b8a4'), 0, 1, 0.6);
    }
    // Long pale whiskers.
    for (const s of [-1, 1])
      for (const k of [0, 1, 2]) r.line(Hf.p(4.7, s * 1.6, -1.3 - k * 0.3), Hf.p(4.4, s * (3.6 + k * 0.2), -1.0 - k * 0.6), hx('#fff6e8'), 0, 0.5);
    r.line(Hf.p(5.4, 0, -1.1), Hf.p(5.1, 0, -1.8), M.ink, 0, 0.8);
    for (const s of [-1, 1]) r.line(Hf.p(5.1, 0, -1.8), Hf.p(4.6, s * 0.9, -2.0), M.ink, 0, 0.8);
    r.dot(Hf.p(5.9, -0.3, -0.1), hx('#ffffff'), 0, 1, 1);
    if (get('blush') > -0.5) for (const s of [-1, 1]) if (vdot3(Hf.v(1, s * 0.6, 0), VIEW) > 0.05) r.dot(Hf.p(3.4, s * 2.9, -0.9), hx('#f08a8a'), 0, 1, 0.6 + 0.3 * saturate(get('blush')));
  });
}

export type { Palette };
