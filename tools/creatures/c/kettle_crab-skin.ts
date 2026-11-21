// Котёл, the hermit crab who lives in an old copper diving helmet. Its own skeleton on the eight-legged gait of the
// arachnid family: a low crab body under the helmet's breastplate, six walking legs on IK with the alternating tripod
// gait, a huge right claw and a small left one, eyes on stalks that stretch like periscopes, two whip antennae.
// The helmet is the shell: a copper dome with a front porthole (its eyes show behind the glass when it hides), two
// side ports with grilles, a brass valve on top, a breastplate ring of bolts, patina and a barnacle.
// Pose keys (all optional, 0 = rest) are read through `get`; positions are rig units before `card.proportions.scale`.
import type { CreatureCard } from '../bodies/card-data';
import { goalAt, toLocal } from '../bodies/goals';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vlerp, vmul, vnorm, type Mat, type V3 } from '../rig/f15-rig';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { sizes, type BodyFrame, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

/** Height of the crab's body above the sand at rest, rig units. */
export const BODY_Z = 8;
/** Keys that switch at the key instead of fading (the pose book shares this list). */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'peekPort', 'noShadow', 'upside']);

const T = (hexes: string[]): Mat['T'] => hexes.map((c) => hx(c)) as Mat['T'];
const four = (tones: string[]) => [tones[0], tones[1], tones[tones.length - 2], tones[tones.length - 1]];
const card4 = (card: CreatureCard, name: string) => four(card.materials.find((m) => m.name === name)!.tones);

const saturate = (v: number) => Math.min(1, Math.max(0, v));

interface Leg {
  name: string;
  sign: number;
  row: number;
  hip: V3;
  knee: V3;
  ankle: V3;
  toe: V3;
  down: boolean;
}

export type PoseSample = (anim: string, t: number) => JointPose;

export function crabFrame(card: CreatureCard, route: MotionPlan, sample: PoseSample): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const palettes = (variant: Variant) => {
    const g = variant === 'gold';
    const pick = (name: string) => (g ? gold(card4(card, name), 0.55) : T(card4(card, name)));
    return {
      coral: { T: pick('coral') } as Mat,
      clawShell: { T: pick('coral').slice() as Mat['T'] } as Mat,
      coralDeep: { T: g ? gold(card4(card, 'coral'), 0.4) : T(['#2a0c0c', '#561c14', '#8a2c1c', '#c04a2c']) } as Mat,
      cream: { T: pick('cream') } as Mat,
      copperDim: { T: g ? gold(card4(card, 'copper'), 0.4) : T(['#200a06', '#521e0e', '#8e401e', '#c4703a']) } as Mat,
      copper: { T: pick('copper'), spec: true } as Mat,
      patina: { T: T(card4(card, 'verdigris')) } as Mat,
      brass: { T: pick('brass'), spec: true } as Mat,
      glass: { T: T(card4(card, 'glass')), spec: true } as Mat,
      band: { T: pick('band') } as Mat,
      sclera: { T: T(['#6a6e80', '#b8bccc', '#eef0f6', '#ffffff']) } as Mat,
      pupil: { T: T(['#050508', '#0c0c14', '#181824', '#262636']), flat: 1 } as Mat,
      claw: { T: T(['#1c1010', '#3a1e18', '#6a3828', '#9a5a40']) } as Mat,
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
    // Hide: everything soft goes into the helmet. Tuck folds the legs under the breastplate.
    const hide = saturate(get('hide') + (anim === 'sleep' ? 1 : 0));
    const tuck = saturate(get('tuck') + hide * 0.9 + l.tired * 0.25);
    const sub = turning && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const face = F3.yaw(route.yaw + ((side + sub) * Math.PI) / 8);
    const cycle = (walking ? gaitPhase : t / 3) * TAU,
      gait = walking ? Math.sin(cycle * 2) : 0;
    const breathe = anim === 'idle' || anim === 'sleep' ? Math.sin(l.q) : 0;
    const body = face
      .at(get('lean') + 0.5 * gait, get('sway'), BODY_Z + get('lift') + 0.35 * breathe - 4.2 * tuck - get('crouch'))
      .turn(get('yaw') + get('twist') + lead * 0.3)
      .pitch(get('pitch') + 0.12 * l.tired)
      .roll(get('roll') + 0.04 * gait);
    const rattle = get('rattle');
    const shake = rattle ? [Math.sin(t * 24 * 2.1) * rattle * 0.9, Math.sin(t * 24 * 1.7 + 1) * rattle * 0.5] : [0, 0];
    const helmet = body
      .at(-6 + shake[0], shake[1], 12.5 + get('helmetUp'))
      .turn(0.35 + get('helmetYaw'))
      .pitch(get('helmetPitch') - 0.08)
      .roll(get('helmetRoll') + shake[1] * 0.04);
    const points: Record<string, V3> = { floor: [0, 0, 0], body: body.o, helmet: helmet.o };
    // Goals and the feet's floor frame turn with a whole-body spin (`yaw`), so a pirouette carries the claws along.
    const spun = face.turn(get('yaw'));
    const goal = (key: string, rest: V3) => {
      const at = goalAt(pose, key, toLocal(spun, rest));
      return at ? spun.p(...at) : rest;
    };

    // ---- skeleton: legs --------------------------------------------------------------------------------------
    const legs: Leg[] = [];
    for (const sign of [-1, 1]) {
      const suffix = sign < 0 ? 'L' : 'R';
      for (let i = 0; i < 3; i++) {
        const name = 'foot' + suffix + i;
        const offset = ((i + (sign > 0 ? 0 : 1)) % 2) * 0.5 + (i - 1) * 0.04;
        const step = strideFoot(walking ? gaitPhase * 2 : 2 * t, offset, walking ? route.stride / scale / 2 : Math.PI / 4);
        const floorFrame = turning ? spun.turn(step.forward * 0.6) : spun;
        const tap = get('tap' + suffix + i);
        const natural = floorFrame.p(
          [11, 2, -7][i] + (walking ? step.forward : 0) - 4 * tuck * (i - 1),
          sign * ([15, 18, 16][i] - 6.5 * tuck),
          get('lift') + (walking || turning ? step.lift * (card.proportions.stepHeight ?? 4) : 0) + tap * 3 + get('paddle') * (2.5 + 2.5 * Math.sin(t * 24 * 1.3 + i * 2 + sign)),
        );
        const toe = goal(name, natural);
        const hip = body.p([5.5, 1.5, -3][i], sign * 5.8, -0.8);
        const ankle = vadd(toe, vadd(body.v(0.4 * (1 - i), sign * 1.2, 3.6), [0, 0, 0]));
        const knee = ik(hip, ankle, 9.4, 8.6, body.v(0.3 * (1 - i), sign * 0.6, 2.2));
        legs.push({ name, sign, row: i, hip, knee, ankle, toe, down: toe[2] < 0.05 && (!(walking || turning) || step.planted) });
        points[name] = toe;
      }
    }

    // ---- skeleton: claws -------------------------------------------------------------------------------------
    type Claw = { name: string; sign: number; k: number; shoulder: V3; elbow: V3; wrist: V3; palm: F3; pivot: V3; tip: V3; fixedTip: V3; open: number };
    const claws: Claw[] = [];
    for (const sign of [1, -1]) {
      const suffix = sign < 0 ? 'L' : 'R';
      const name = 'claw' + suffix;
      const k = sign > 0 ? 1.3 : 0.6; // the right claw is huge
      const open = saturate(0.18 + get(name + 'Open') + (anim === 'idle' ? 0.1 * Math.sin(l.q * 2 + sign) : 0));
      const retract = Math.max(hide, tuck * 0.5);
      const shoulder = body.p(7.5, sign * 5.2, 1.2);
      // Seen at three quarters: the big claw is held forward and a little raised, fingers ahead, its broad outer
      // face to the viewer; the small one picks at the sand beside it.
      const big = k > 1;
      const neutral = big
        ? body.p(17 - 9 * retract, sign * (8.5 - 3 * retract), 6 - 4 * retract + 0.3 * breathe)
        : body.p(16 - 7 * retract, sign * (7.5 - 3 * retract), 3.2 - 2 * retract + 0.3 * breathe);
      const aim = body
        .turn(sign * (big ? 0.18 : -0.25) * (1 - retract) + get(name + 'Yaw'))
        .pitch((big ? -0.15 : -0.1) + get(name + 'Pitch'))
        .roll(sign * (big ? -0.5 : 0.12) + get(name + 'Roll'));
      const center = goal(name, neutral);
      const palm = new F3(center, aim.f, aim.s, aim.u);
      const wrist = palm.p(-5.2 * k, 0, -0.5 * k);
      const elbow = ik(shoulder, wrist, 4.5 + 2.6 * k, 4.2 + 2.6 * k, body.v(-0.2, sign * 1, 0.9));
      const pivot = palm.p(3.8 * k, 0, 2.4 * k);
      const a = 0.12 + open * 0.95;
      const tip = palm.p(3.8 * k + 6.8 * k * Math.cos(a), 0, 2.4 * k + 6.8 * k * Math.sin(a) - 2.6 * k * Math.cos(a) * 0.7);
      const fixedTip = palm.p(10.6 * k, 0, -1.2 * k);
      claws.push({ name, sign, k, shoulder, elbow, wrist, palm, pivot, tip, fixedTip, open });
      points[name] = center;
      points[name + 'Tip'] = fixedTip;
      points['finger' + suffix] = tip;
    }

    // ---- skeleton: eyes and antennae -------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const out = Math.max(hide, tuck * 0.35);
      const stretch = get('stalk' + suffix) + get('stalk');
      const spin = get('eyeSpin');
      const spinA = spin ? t * 24 * 0.55 + (sign > 0 ? Math.PI : 0) : 0;
      const base = body.p(10.5, sign * 2.2, 2.6);
      const yaw = get('eye' + suffix) + get('eyes') + lead * 0.5;
      const len = (12 + stretch) * (1 - 0.9 * out);
      const tilt = 0.12 + get('eyePitch') + get('eyePitch' + suffix);
      const dir = vnorm(body.v(Math.sin(tilt) * Math.cos(yaw) + spin * 0.45 * Math.cos(spinA), Math.sin(yaw) * 0.9 + sign * 0.28 + spin * 0.45 * Math.sin(spinA), Math.cos(tilt)));
      const ball = vadd(base, vmul(dir, len));
      // Pupils lean towards the viewer: a pet looks at its owner unless a pose sends the gaze elsewhere.
      const ahead = body.v(Math.cos(yaw + get('look' + suffix)), Math.sin(yaw + get('look' + suffix)), -0.1 + get('lookUp'));
      const look = vnorm(vadd(ahead, vmul([0, 0.8, 0.6], 0.9 * (1 - get('lookAway')))));
      points['eye' + suffix] = ball;
      return { sign, suffix, base, ball, dir, look, out, len };
    });
    const antennae = [-1, 1].map((sign) => {
      const base = body.p(11.2, sign * 1.0, 2.2);
      const up = get('antennaUp');
      const chain: V3[] = [base];
      for (let i = 1; i <= 5; i++) {
        const u = i / 5;
        const whip = Math.sin(t * TAU * 1.3 - u * 2.2 + sign) * (0.6 + get('antennaWhip')) * u * u;
        chain.push(body.p(11.2 + u * (10 - 4 * hide), sign * (1 + u * (5.5 + 1.5 * up)), 2.2 + u * (9 + 6 * up) * (1 - 0.8 * hide) + whip * 2.4 - u * u * 3 * (1 - up)));
      }
      return chain;
    });
    points.mouth = body.p(11.5, 0, 1);
    points.valve = helmet.p(-1.2, 0, 15.5);
    points.port = helmet.p(13.2, 0, 1);
    points.crown = helmet.p(-1, 0, 14);

    // ---- drawing ---------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const front = overAll ? r : null;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    if (!hidden) {
      drawHelmet(r, helmet, M, get, t, late);
      if (hide < 0.97) drawCrab(r, body, legs, claws, eyes, antennae, M, get, l.blink, hide, late);
      else if (get('peekPort') > 0.5 || anim === 'sleep') peekingEyes(r, helmet, M, get, l.blink);
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(r, face, [
      [M.coral, 'shell'],
      [M.coralDeep, 'shell'],
      [M.clawShell, 'skin'],
      [M.cream, 'skin'],
      [M.copper, 'metal'],
      [M.copperDim, 'metal'],
      [M.patina, 'granite'],
      [M.brass, 'metal'],
      [M.glass, 'ice'],
      [M.band, 'skin'],
      [M.claw, 'lacquer'],
    ], 'skin');
    for (const draw of late) draw();
    // Translucent things go last, after the surface finish: a steam jet under the helmet and the big soap bubble.
    // Their pixels stay see-through and the outline pass leaves them unringed.
    if (!hidden && get('jet') > 0.01) steamJet(r, helmet, get('jet'), t);
    if (get('bubble') > 0.01) soapBubble(r, body.p(3, 0, 9.5), get('bubble'), t);
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#24120e';
    let frame: BodyFrame;
    if (overAll) {
      // The whole crab flies over the painting frame: the body layer stays empty and the over layer carries it.
      const empty = new Rig();
      frame = projectFigure(empty, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
      const pad = 90,
        big = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      const out = renderRig(front!, big, big, ...anchor, { outline: hx(ink), inner: 3.6 });
      frame.px = renderRig(empty, big, big, ...anchor, { outline: hx(ink), inner: 3.6 }).p;
      frame.over = out.p;
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.primitives = r.prims.length;
    } else frame = projectFigure(r, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
    const air = Math.max(0, get('lift'));
    frame.groundShadow =
      hidden || overAll || get('noShadow') > 0.5
        ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
        : { radius: (size * 0.27) / (1 + air * 0.03), opacity: 0.6 / (1 + air * 0.05), reflectionOpacity: frame.px.w > size ? 0 : 1 };
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

type Palette = Record<'coral' | 'clawShell' | 'coralDeep' | 'cream' | 'copper' | 'copperDim' | 'patina' | 'brass' | 'glass' | 'band' | 'sclera' | 'pupil' | 'claw', Mat>;
type Get = (k: string) => number;

/** Copper patina in spots, thicker near the bottom; a dent on the far side. */
function copperPattern(M: Palette): Mat['pat'] {
  const green = M.patina.T;
  // Drips of verdigris run down from the bolts of the neck ring; a crusty band along the rim; small spots below
  // the equator. The crown stays clean copper.
  const drips = [0.4, 1.2, 1.9, 2.7, 3.5, 4.3, 5.1, 5.8].map((a, i) => [a, -0.05 + 0.45 * hash(i, 5)]);
  return (q) => {
    const z = q[2],
      a = (Math.atan2(q[1], q[0]) + TAU) % TAU;
    // A crusty band along the bottom of the dome with a ragged top edge.
    if (z < -0.5 + 0.12 * hash(Math.floor(a * 11), 3)) return green[z < -0.58 ? 1 : 2];
    for (const [at, top] of drips) {
      const d = Math.abs(((a - at + Math.PI + TAU) % TAU) - Math.PI);
      const width = 0.09 + 0.1 * Math.max(0, top - z);
      if (z < top && d < width) return green[d < width * 0.45 ? 1 : 2];
    }
    return null;
  };
}

function drawHelmet(r: Rig, H: F3, M: Palette, get: Get, t: number, late: (() => void)[]) {
  const copper: Mat = { ...M.copper, pat: copperPattern(M) };
  // Breastplate (corselet): a broad flattened ring resting on the crab's back, with a ring of brass bolts.
  r.tag = 'corselet';
  r.ell(H, [0.5, 0, -10.5], [14.5, 14, 4.2], { ...M.copperDim, pat: copperPattern(M) });
  r.ell(H, [0.5, 0, -12.6], [15.2, 14.6, 1.6], M.copperDim);
  r.tag = 'bolts';
  const boltAt = (i: number) => {
    const a = (i / 16) * TAU + 0.2;
    return H.p(0.5 + Math.cos(a) * 13.4, Math.sin(a) * 12.9, -9.2 - Math.abs(Math.sin(a)) * 0.6);
  };
  for (let i = 0; i < 16; i++) r.ball(boltAt(i), 0.95, M.brass);
  late.push(() => {
    r.tag = 'bolts';
    for (let i = 0; i < 16; i++) r.dot(vadd(boltAt(i), [0, 0, 0.7]), hx('#5a4416'), 0, 1, 0.9);
  });
  // A strap of brass along the breastplate rim and the little wing nuts that hold the dome on.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.6;
    const base = H.p(0.5 + Math.cos(a) * 12.2, Math.sin(a) * 11.8, -7.6);
    r.ball(base, 1.15, M.brass);
    r.cap(vadd(base, H.v(0, 0, 0.6)), vadd(base, H.v(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 1.4)), 0.45, 0.35, M.brass);
    r.cap(vadd(base, H.v(0, 0, 0.6)), vadd(base, H.v(-Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 1.4)), 0.45, 0.35, M.brass);
  }
  // Neck ring between dome and breastplate.
  r.tag = 'helmet';
  r.ell(H, [0, 0, -6.6], [11.6, 11.6, 2.2], M.brass);
  // The dome.
  r.ell(H, [0, 0, 1.5], [12.6, 12.4, 12.8], copper);
  // The polished glint where the light from the upper left bounces to the viewer: placed in world space so it stays
  // on the lit shoulder of the dome whichever way the helmet turns.
  late.push(() => {
    r.tag = 'helmet';
    const center = H.p(0, 0, 1.5),
      half: V3 = [-0.258, 0.45, 0.855],
      along: V3 = vnorm([0.86, 0.3, 0.1]);
    const at = (k: number, lift: number) => vadd(center, vadd(vmul(half, 12.6), vadd(vmul(along, k), [0, 0, lift])));
    r.line(at(-3.2, -1.4), at(-1.2, 0.2), hx('#ffe6c0'), 0.25, 0.95);
    r.line(at(-1.2, 0.2), at(1.4, 0.5), hx('#fff6e4'), 0.35, 1);
    r.dot(at(3.2, -0.2), hx('#ffe6c0'), 0, 1, 1);
  });
  // A dent on the side.
  r.ell(H, [-4, -10.4, 3.5], [3.2, 1.6, 2.6], M.copper);
  // Rivets along the crown seam.
  for (let i = 0; i < 13; i++) {
    const a = -1.3 + (i / 12) * 2.6;
    r.ball(H.p(Math.sin(a) * 12.4, 0, 1.5 + Math.cos(a) * 12.6), 0.55, M.brass);
  }
  // Front porthole: brass rim, glass, a bar and a slanted glint.
  r.tag = 'faceplate';
  const port = H.at(11.6, 0, 1).pitch(0.05);
  r.ell(port, [0, 0, 0], [1.8, 6.4, 6.4], M.brass);
  r.ell(port, [1.1, 0, 0], [0.9, 5.0, 5.0], M.glass);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3;
    r.ball(port.p(1.2, Math.cos(a) * 5.7, Math.sin(a) * 5.7), 0.45, M.brass);
  }
  // The front glass opens on a hinge at one side and shuts with a wing nut at the other.
  r.cap(port.p(0.6, -6.6, 2.2), port.p(0.6, -6.6, -2.2), 0.9, 0.9, M.brass);
  r.ball(port.p(0.6, -6.6, 2.6), 0.7, M.brass);
  r.ball(port.p(0.6, -6.6, -2.6), 0.7, M.brass);
  r.ball(port.p(1.0, 6.9, 0), 1.0, M.brass);
  r.cap(port.p(1.4, 6.9, 0), port.p(1.8, 6.9, 2.0), 0.5, 0.35, M.brass);
  r.cap(port.p(1.4, 6.9, 0), port.p(1.8, 6.9, -2.0), 0.5, 0.35, M.brass);
  late.push(() => {
    r.tag = 'faceplate';
    r.line(port.p(1.9, -2.6, 3.2), port.p(1.9, 1.6, -1.2), hx('#e8fbff'), 0.2, 0.9);
    r.line(port.p(1.9, -1.3, 3.6), port.p(1.9, 2.4, 0.1), hx('#a8d8ea'), 0, 0.9);
  });
  // Side ports with three-bar grilles.
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'portL' : 'portR';
    const side = H.at(-0.8, s * 11.5, 1.8).turn(s * Math.PI / 2);
    r.ell(side, [0, 0, 0], [1.6, 4.4, 4.4], M.brass);
    r.ell(side, [0.9, 0, 0], [0.8, 3.3, 3.3], M.glass);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      r.ball(side.p(1.0, Math.cos(a) * 3.95, Math.sin(a) * 3.95), 0.38, M.brass);
    }
    late.push(() => {
      r.tag = s < 0 ? 'portL' : 'portR';
      for (const u of [-1.6, 0, 1.6]) r.line(side.p(1.5, u, -3.1), side.p(1.5, u, 3.1), hx('#8a6a22'), 0, 0.8);
    });
  }
  // Valve on top: stem, lid that hops on steam, a little wheel; the hose elbow at the back.
  r.tag = 'valve';
  const lid = get('valve');
  r.cap(H.p(-1.2, 0, 13.4), H.p(-1.2, 0, 15.6), 1.5, 1.3, M.brass);
  r.ell(H, [-1.2, 0, 16.3 + lid * 1.8], [2.2, 2.2, 0.8], M.brass);
  r.ball(H.p(-1.2, 0, 17.4 + lid * 1.8), 0.7, M.brass);
  r.cap(H.p(-9.6, 0, 7.5), H.p(-13, 0, 10.4), 1.9, 1.6, M.brass);
  r.cap(H.p(-13, 0, 10.4), H.p(-13.4, 0, 13.4), 1.6, 1.5, M.brass);
  r.ell(H, [-11.3, 0, 8.95], [0.6, 2.2, 2.2], M.brass);
  r.ell(H, [-13.4, 0, 13.6], [2.0, 2.0, 0.6], M.brass);
  late.push(() => {
    r.tag = 'valve';
    const hub = H.p(-1.2, 0, 17.4 + lid * 1.8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      r.line(hub, vadd(hub, H.v(Math.cos(a) * 2, Math.sin(a) * 2, 0)), hx('#8a6a22'), 0, 0.8);
    }
  });
  // A barnacle grown on the breastplate.
  r.tag = 'patina';
  for (const [x, y, z, k] of [[4, 12.2, -8.8, 1], [6.6, 10.6, -9.6, 0.7], [2.0, 13.2, -10.2, 0.6], [-7, -11.4, -9.4, 0.8]]) {
    r.ell(H, [x, y, z], [1.8 * k, 1.4 * k, 1.5 * k], M.cream);
    r.ell(H, [x + 0.2 * k, y + 0.4 * Math.sign(y) * k, z + 0.9 * k], [0.9 * k, 0.7 * k, 0.6 * k], M.coralDeep);
  }
  // A little purple starfish clinging to the dome.
  const star = H.at(7.4, 8.9, 7.2).turn(0.87).pitch(-0.45);
  r.ball(star.p(0.4, 0, 0), 0.95, M.band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    r.cap(star.p(0.4, 0, 0), star.p(0.5, Math.cos(a) * 2.6, Math.sin(a) * 2.6), 0.75, 0.32, M.band);
  }
  late.push(() => {
    r.tag = 'patina';
    r.dot(star.p(1.3, 0, 0), hx('#f0d8f4'), 0, 1, 1);
  });
  // A strand of seaweed caught on a bolt, hanging over the rim.
  const weed: V3[] = [H.p(9.4, 9.6, -9.2)];
  for (let i = 1; i <= 4; i++) weed.push(H.p(9.4 + i * 0.9, 9.6 + i * 0.5, -9.2 - i * 1.3 + Math.sin(t * TAU + i) * 0.3));
  for (let i = 1; i < weed.length; i++) r.cap(weed[i - 1], weed[i], 0.7 - i * 0.1, 0.6 - i * 0.1, M.patina);
}

/** Steam blasting from under the helmet: soft puffs growing and fading downwards, in world axes. */
function steamJet(r: Rig, H: F3, power: number, t: number) {
  r.tag = 'jet';
  const base = H.p(0, 0, -13);
  for (let i = 0; i < 7; i++) {
    const u = i / 6,
      wob = Math.sin(t * 24 * 1.7 + i * 2.1);
    const at: V3 = [base[0] + wob * 1.6 * u, base[1] + wob * 0.8 * u, base[2] - power * (3 + 30 * u)];
    const radius = (2.6 + 6 * u) * Math.min(1, power * 1.4);
    const alpha = Math.round(235 - 120 * u);
    r.ball(at, radius, {
      T: [hx('#a8b4c0', alpha), hx('#d4dce4', alpha), hx('#eef2f6', alpha), hx('#ffffff', alpha)] as Mat['T'],
      soft: true,
    });
  }
}

/** A soap bubble round the crab: only the rim and two highlights are drawn, so the crab shows through. */
function soapBubble(r: Rig, center: V3, size: number, t: number) {
  r.tag = 'bubble';
  const R = 33 * size,
    wobble = 1 + 0.04 * Math.sin(t * 24 * 0.9);
  const frame = new F3(center, [wobble, 0, 0], [0, 1 / wobble, 0], [0, 0, 1]);
  const view: V3 = [0, 0.8, 0.6];
  const rim = (q: V3) => Math.abs(q[0] * view[0] + q[1] * view[1] + q[2] * view[2]) > 0.3;
  r.ell(
    frame,
    [0, 0, 0],
    [R, R, R],
    {
      T: [hx('#6a88c8', 190), hx('#9ad0f0', 200), hx('#e8c4f4', 210), hx('#ffffff', 230)] as Mat['T'],
      soft: true,
    },
    rim,
  );
  // A curved glint near the upper left of the rim and a small one below it: directions on the screen circle
  // (right = world x, up = [0, -0.6, 0.8]) pushed a little towards the viewer so they sit on the front surface.
  const on = (angle: number, inset: number) => {
    const edge: V3 = [Math.cos(angle), -0.6 * Math.sin(angle), 0.8 * Math.sin(angle)];
    const k = Math.sqrt(1 - inset * inset);
    return vadd(center, vmul(vadd(vmul(edge, k), vmul([0, 0.8, 0.6], inset)), R));
  };
  r.line(on(2.75, 0.3), on(2.35, 0.3), hx('#ffffff'), 0, 1);
  r.line(on(2.35, 0.3), on(1.95, 0.3), hx('#ffffff'), 0, 1);
  r.dot(on(3.05, 0.35), hx('#ffffff'), 0, 1, 1);
}

function peekingEyes(r: Rig, H: F3, M: Palette, get: Get, blink: number) {
  // Hidden inside: two eyes look out through the front glass (closed while asleep).
  r.tag = 'faceplate';
  const port = H.at(13.0, 0, 0.8);
  for (const s of [-1, 1]) {
    const e = port.p(0.2, s * 2.7 + get('eyes') * 1.2, -0.3 + s * 0.25 + get('lookUp') * 1.2);
    if (blink > 0.5 || get('blink') > 0.5) {
      r.line(vadd(e, port.v(0, -1.3, 0.2)), vadd(e, port.v(0, 0, -0.3)), hx('#1a0e0e'), 0, 1);
      r.line(vadd(e, port.v(0, 0, -0.3)), vadd(e, port.v(0, 1.3, 0.2)), hx('#1a0e0e'), 0, 1);
    } else {
      r.ball(e, 1.8, M.sclera);
      // Pupils turn towards the viewer, nudged by `eyes` (sideways) and `lookUp`.
      const gaze = vnorm(vadd(vadd(port.v(0.6, get('eyes') * 0.8, get('lookUp') * 0.8), [0, 0.8, 0.6]), [0, 0, 0]));
      r.ball(vadd(e, vmul(gaze, 1.25)), 0.85, M.pupil);
    }
  }
}

type Eye = { sign: number; suffix: string; base: V3; ball: V3; dir: V3; look: V3; out: number; len: number };

function drawCrab(
  r: Rig,
  B: F3,
  legs: Leg[],
  claws: { name: string; sign: number; k: number; shoulder: V3; elbow: V3; wrist: V3; palm: F3; pivot: V3; tip: V3; fixedTip: V3; open: number }[],
  eyes: Eye[],
  antennae: V3[][],
  M: Palette,
  get: Get,
  blink: number,
  hide: number,
  late: (() => void)[],
) {
  // Body front under the breastplate: carapace, pale belly, spiny front edge.
  r.tag = 'body';
  r.ell(B, [5.5, 0, 0.2], [7.6, 7.4, 4.6], M.coral);
  r.ell(B, [6.4, 0, -2.2], [6.2, 5.8, 2.4], M.cream);
  for (let i = -3; i <= 3; i++) r.ball(B.p(12 - Math.abs(i) * 0.9, i * 1.8, 2.6 - Math.abs(i) * 0.3), 0.6, M.coralDeep);
  for (const s of [-1, 1]) {
    r.ell(B, [8, s * 5.4, 1.6], [2.2, 1.6, 1.4], M.coral);
    r.ball(B.p(9.6, s * 6.4, 2.4), 0.55, M.coralDeep);
    // Antennules: short feathered brushes between the eye stalks.
    r.cap(B.p(11.2, s * 0.7, 2.2), B.p(12.8, s * 1.1, 4.4 * (1 - hide)), 0.45, 0.3, M.band);
  }
  // Mouthparts that flutter and blow bubbles.
  r.tag = 'mouth';
  const blow = get('mouth');
  for (const s of [-1, 1]) {
    r.cap(B.p(11.2, s * 1.1, 0.6), B.p(12.6 + blow, s * (1.4 + blow * 0.6), -0.6 - blow * 0.4), 0.8, 0.5, M.cream);
  }
  // Legs: thick striped segments, dark claws on the tips, a few hairs on the shins.
  const striped = (base: Mat): Mat => ({
    ...base,
    pat: (q) => (Math.abs(q[0] - 0.5) > 0.42 ? M.band.T[2] : Math.abs(q[0] - 0.5) > 0.36 ? M.band.T[1] : null),
  });
  const legMat = striped(M.coral);
  for (const leg of legs) {
    r.tag = 'leg' + (leg.sign < 0 ? 'L' : 'R') + leg.row;
    r.cap(leg.hip, leg.knee, 1.75, 1.45, legMat);
    r.cap(leg.knee, leg.ankle, 1.45, 1.0, legMat);
    r.cap(leg.ankle, leg.toe, 0.95, 0.25, M.claw);
    r.ball(leg.knee, 1.6, M.band);
    r.ball(leg.ankle, 1.1, M.band);
    r.ball(vlerp(leg.hip, leg.knee, 0.5), 1.0, legMat);
    late.push(() => {
      r.tag = 'leg' + (leg.sign < 0 ? 'L' : 'R') + leg.row;
      const mid = vlerp(leg.knee, leg.ankle, 0.5);
      r.line(mid, vadd(mid, [0, 0, 1.4]), hx('#ffd0a0'), 0, 0.4);
      r.dot(leg.knee, hx('#ffc490'), 0, 1, 0.8);
      r.dot(vlerp(leg.ankle, leg.toe, 0.4), hx('#e8d4a8'), 0, 1, 0.9);
      for (const u of [0.3, 0.7]) {
        const a = vlerp(leg.hip, leg.knee, u);
        r.line(a, vadd(a, [0, 0, 1.1]), hx('#ff9e6a'), 0, 0.5);
      }
    });
  }
  // Claws.
  for (const c of claws) {
    r.tag = c.name;
    const k = c.k;
    r.cap(c.shoulder, c.elbow, 1.9 * k + 0.6, 1.7 * k + 0.5, M.clawShell);
    r.cap(c.elbow, c.wrist, 1.8 * k + 0.5, 2.4 * k + 0.4, M.clawShell);
    r.ball(c.elbow, 1.7 * k + 0.5, M.coralDeep);
    // Laterally flattened palm, tall and heavy, covered in pale tubercles.
    r.ell(c.palm, [0, 0, 0.4 * k], [5.4 * k, 3.5 * k, 4.8 * k], M.clawShell);
    r.ell(c.palm, [0.5 * k, 0, -2.6 * k], [4.6 * k, 3.1 * k, 2.2 * k], M.cream);
    // Fixed finger (below) and the movable finger (above), pale tips, teeth on the cutting edges.
    r.cap(c.palm.p(3.6 * k, 0, -1.2 * k), c.fixedTip, 2.6 * k, 0.7 * k + 0.2, M.clawShell);
    r.cap(c.pivot, c.tip, 2.4 * k, 0.65 * k + 0.2, M.clawShell);
    r.cap(vlerp(c.pivot, c.tip, 0.72), c.tip, 1.0 * k, 0.4 * k + 0.15, M.cream);
    r.cap(vlerp(c.palm.p(3.6 * k, 0, -1.2 * k), c.fixedTip, 0.72), c.fixedTip, 1.1 * k, 0.4 * k + 0.15, M.cream);
    for (let i = 0; i < (k > 0.7 ? 0 : 5); i++)
      r.ball(c.palm.p((hash(i, 31) - 0.45) * 8 * k, c.sign * 3.2 * k, (hash(i, 37) - 0.3) * 5 * k), 0.4, M.cream);
    if (k > 0.7) {
      for (let i = 1; i < 5; i++)
        r.ball(vadd(vlerp(c.palm.p(3.6 * k, 0, -1.2 * k), c.fixedTip, i / 5), c.palm.v(0, 0, 1.1 * k)), 0.45 * k, M.cream);
      for (let i = 0; i < 18; i++) {
        const u = hash(i, 17),
          v = hash(i, 23);
        r.ball(c.palm.p((u - 0.45) * 9 * k, c.sign * 3.3 * k * (0.7 + 0.3 * v), (v - 0.3) * 6 * k), 0.55, M.cream);
      }
      late.push(() => {
        r.tag = c.name;
        for (let i = 1; i < 5; i++) {
          const a = vlerp(c.palm.p(3.6 * k, 0, -1.2 * k), c.fixedTip, i / 5);
          r.dot(vadd(a, c.palm.v(0, 0, 1.6 * k)), hx('#fff4e0'), 0, 1, 0.9);
        }
        // Bristles along the top edge of the palm and a wet glint.
        for (let i = 0; i < 4; i++) {
          const a = c.palm.p(-3 * k + i * 2 * k, 0, 4.9 * k);
          r.line(a, vadd(a, c.palm.v(-0.6, 0, 1.2)), hx('#ffc490'), 0, 0.5);
        }
        r.dot(c.palm.p(0.5 * k, c.sign * 3.4 * k, 2.6 * k), hx('#ffffff'), 0, 1, 1);
      });
    }
  }
  // Antennae: thin whips with a brush of antennules between the eyes.
  late.push(() => {
    r.tag = 'antennaL';
    antennae.forEach((chain, s) => {
      r.tag = s ? 'antennaR' : 'antennaL';
      for (let i = 1; i < chain.length; i++) r.line(chain[i - 1], chain[i], i < 3 ? hx('#c04a2c') : hx('#f39058'), 0, 0.5);
    });
    r.tag = 'mouth';
    for (const s of [-1, 1]) r.line(B.p(11.4, s * 0.6, 2.4), B.p(13.4, s * 1.2, 5.2 * (1 - hide)), hx('#ecd8b8'), 0, 0.6);
  });
  // Eyes on stalks: banded stalks, big round eyes with pupils, a glint, lids that blink.
  for (const e of eyes) {
    r.tag = 'stalk' + e.suffix;
    if (e.len > 1.5) {
      const mid = vadd(e.base, vmul(e.dir, e.len * 0.55));
      r.cap(e.base, mid, 1.05, 0.95, M.band);
      r.cap(mid, vadd(e.ball, vmul(e.dir, -2)), 0.95, 0.9, M.coral);
    }
    r.tag = 'eye' + e.suffix;
    const R = 2.9;
    r.ball(e.ball, R, M.sclera);
    const closed = blink > 0.5 || get('blink') > 0.5;
    const lid = Math.max(closed ? 1 : 0, get('lid'));
    if (lid < 0.95) {
      const pupil = vadd(e.ball, vmul(e.look, R * 0.55));
      r.ball(pupil, 1.7, M.pupil);
      late.push(() => {
        r.tag = 'eye' + e.suffix;
        r.dot(vadd(pupil, vadd(vmul(e.look, 0.9), [0, 0, 0.8])), hx('#ffffff'), 0, 1, 1);
      });
    }
    if (lid > 0.05) {
      // The lid comes down from the top of the eye: the same ball a touch larger, cut below the lid line.
      const line = 1 - 2 * lid;
      r.ell(new F3(e.ball, [1, 0, 0], [0, 1, 0], [0, 0, 1]), [0, 0, 0], [R * 1.1, R * 1.1, R * 1.1], M.coral, (q) => q[2] < line);
    }
  }
}

export type { Palette };
