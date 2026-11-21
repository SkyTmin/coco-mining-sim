// Клубок, the pangolin. Its own skeleton: the spine is one chain of segments from the tail tip to the snout tip that
// stands upright on two hind legs with the tail on the ground behind (rest headings) and rolls up into a ball (a
// spiral of equal curvature, belly inside, the tail wrapped over the face). `curl` blends the segment headings, so the
// chain keeps its length while it rolls; while it curls the back swells sideways so the ball is round, not a wheel.
// Rows of overlapping scales sit on the dorsal side, each a small tilted shield with a light free edge pointing to the
// tail; `flare` lifts them like a pinecone. Hind legs on IK, short arms with three big curved claws, small shiny eyes,
// a long sticky tongue. `spin` rolls the whole figure round the world axis through the ball's centre.
// Pose keys (all optional, 0 = rest) are read through `get`; positions are rig units before `card.proportions.scale`.
import type { CreatureCard } from '../bodies/card-data';
import { goalAt, toLocal } from '../bodies/goals';
import { hash, hx, ik, mixc, TAU } from '../kit/f11-mobkit';
import { F3, Rig, renderRig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { sizes, type BodyFrame, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import { finishSurfaces } from './surface-work';

/** Hip height above the ground at rest and the radius of the rolled-up ball, rig units. */
export const HIP_Z = 13.4;
export const BALL_R = 12.4;
/** Keys that switch at the key instead of fading (the pose book shares this list). */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow']);

const T = (hexes: string[]): Mat['T'] => hexes.map((c) => hx(c)) as Mat['T'];
const four = (tones: string[]) => [tones[0], tones[1], tones[tones.length - 2], tones[tones.length - 1]];
const card4 = (card: CreatureCard, name: string) => four(card.materials.find((m) => m.name === name)!.tones);
const saturate = (v: number) => Math.min(1, Math.max(0, v));
const deg = Math.PI / 180;

/**
 * The spine from the tail tip to the snout tip. `len` segment length, `rest` its heading at rest (degrees, 0 =
 * forward, 90 = up), `r` the body's radius at the segment's start node (dorsal–ventral), `bulge` how much the section
 * swells sideways in the ball.
 */
const CHAIN: { len: number; rest: number; r: number; bulge: number }[] = [
  // tail: tip → base (on the ground behind, the tip curls up)
  { len: 3.0, rest: -34, r: 0.9, bulge: 0.2 },
  { len: 3.4, rest: -14, r: 1.6, bulge: 0.4 },
  { len: 3.8, rest: -4, r: 2.3, bulge: 0.6 },
  { len: 4.2, rest: 4, r: 3.0, bulge: 0.8 },
  { len: 4.4, rest: 20, r: 3.7, bulge: 1 },
  { len: 4.6, rest: 42, r: 4.4, bulge: 1.15 },
  { len: 4.6, rest: 62, r: 5.1, bulge: 1.3 },
  // trunk: pelvis → chest
  { len: 4.8, rest: 80, r: 5.9, bulge: 1.35 },
  { len: 4.8, rest: 84, r: 6.2, bulge: 1.3 },
  { len: 4.2, rest: 80, r: 6.0, bulge: 1.15 },
  { len: 3.2, rest: 66, r: 5.3, bulge: 0.9 },
  // neck, head, snout
  { len: 2.6, rest: 42, r: 4.6, bulge: 0.5 },
  { len: 4.6, rest: 6, r: 5.4, bulge: 0.2 },
  { len: 5.6, rest: -20, r: 2.6, bulge: 0 },
];
const TIP_R = 0.95;
export const PELVIS = 7,
  CHEST = 10,
  NECK = 11,
  HEAD = 12,
  SNOUT = 13;
const N = CHAIN.length;
const LENGTH = CHAIN.reduce((a, s) => a + s.len, 0);
const ARC: number[] = [0];
for (const s of CHAIN) ARC.push(ARC[ARC.length - 1] + s.len);

/** Radius of the rolled-up spiral along the spine: the tail lies outside on the shell, the snout deep inside. */
function SPIRAL(s: number) {
  return s < ARC[PELVIS] ? 12.0 - (3.8 * s) / ARC[PELVIS] : 8.2 - (3.8 * (s - ARC[PELVIS])) / (LENGTH - ARC[PELVIS]);
}
/** Headings of the rolled-up spiral, radians: π/2 at the pelvis, the radius shrinks from the tail tip to the snout. */
const BALL: number[] = (() => {
  const radius = (s: number) => SPIRAL(s);
  const node: number[] = new Array(N + 1);
  node[PELVIS] = Math.PI / 2;
  for (let i = PELVIS; i < N; i++) node[i + 1] = node[i] - CHAIN[i].len / radius(ARC[i] + CHAIN[i].len / 2);
  for (let i = PELVIS - 1; i >= 0; i--) node[i] = node[i + 1] + CHAIN[i].len / radius(ARC[i] + CHAIN[i].len / 2);
  return CHAIN.map((_, i) => (node[i] + node[i + 1]) / 2);
})();
/** The centre of the ball relative to the pelvis in the sagittal plane (forward, up). */
const BALL_CENTER: [number, number] = [SPIRAL(ARC[PELVIS]), 0];

export type PoseSample = (anim: string, t: number) => JointPose;

interface Node {
  p: V3;
  /** Tangent (towards the snout), dorsal normal, right side; radii up–down and sideways. */
  t: V3;
  d: V3;
  s: V3;
  r: number;
  w: number;
}

export function pangolinFrame(card: CreatureCard, route: MotionPlan, sample: PoseSample): Creature['frame'] {
  const scale = card.proportions.scale ?? 1;
  const gold = (tones: string[], warm: number) => tones.map((c) => mixc(hx(c), hx('#e8b84a'), warm)) as Mat['T'];
  const palettes = (variant: Variant) => {
    const g = variant === 'gold';
    const pick = (name: string) => (g ? gold(card4(card, name), 0.55) : T(card4(card, name)));
    return {
      scale: { T: pick('scales'), bias: 0.08 } as Mat,
      scaleDeep: { T: g ? gold(card4(card, 'scales'), 0.4) : T(['#140e16', '#261a22', '#3a282c', '#4e3832']) } as Mat,
      skin: { T: pick('skin') } as Mat,
      skinDeep: { T: g ? gold(card4(card, 'skin'), 0.35) : T(['#2a1c22', '#4a3236', '#6c4c4a', '#90706a']) } as Mat,
      horn: { T: pick('horn') } as Mat,
      tongue: { T: T(card4(card, 'tongue')) } as Mat,
      nose: { T: T(['#1c0c10', '#3a1820', '#5e2a34', '#8a4a52']) } as Mat,
      eye: { T: T(['#050508', '#0c0c14', '#1a1a26', '#2a2a3c']), flat: 1 } as Mat,
      rim: g ? hx('#fff0a8') : hx(card.materials.find((m) => m.name === 'scales')!.tones.at(-1)!),
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
    const asleep = anim === 'sleep' ? 1 : 0;
    // Curl by region: the head can peek out of the ball and the tail can open while the back stays rolled.
    const curl = saturate(get('curl') + asleep);
    const curlHead = saturate(curl - get('peek'));
    const curlTail = saturate(curl - get('tailOpen'));
    const tuck = saturate(get('tuck') + curl * 2.2 + l.tired * 0.2);
    const flare = get('flare');
    const sub = turning && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const heading = route.yaw + ((side + sub) * Math.PI) / 8;
    const cycle = (walking ? gaitPhase : t / 3) * TAU;
    const gait = walking ? Math.sin(cycle * 2) : 0;
    const breathe = anim === 'idle' || anim === 'sleep' ? Math.sin(l.q) : 0;

    // ---- the spine in the sagittal plane (forward, up), relative to the pelvis ---------------------------------
    const headings = CHAIN.map((s, i) => {
      const c = i >= NECK ? curlHead : i < PELVIS ? curlTail : curl;
      let h = s.rest * deg + (BALL[i] - s.rest * deg) * c;
      // Pose bends: `bend` arches the back (+ forward), `nod` the head, `tailUp` / `tailWag` the tail.
      if (i >= PELVIS && i < NECK) h -= get('bend') * 0.12 * (i - PELVIS + 1);
      if (i >= NECK) h -= get('nod') + get('bend') * 0.5;
      if (i < PELVIS) h -= (get('tailUp') + 0.25 * gait * 0) * ((PELVIS - i) / PELVIS) * 0.5;
      return h;
    });
    const flat: [number, number][] = new Array(N + 1);
    flat[PELVIS] = [0, 0];
    for (let i = PELVIS; i < N; i++) flat[i + 1] = [flat[i][0] + Math.cos(headings[i]) * CHAIN[i].len, flat[i][1] + Math.sin(headings[i]) * CHAIN[i].len];
    for (let i = PELVIS - 1; i >= 0; i--) flat[i] = [flat[i + 1][0] - Math.cos(headings[i]) * CHAIN[i].len, flat[i + 1][1] - Math.sin(headings[i]) * CHAIN[i].len];
    const radius = (i: number) => (i < N ? CHAIN[i].r : TIP_R);
    // The pivot moves from the pelvis to the ball's centre; the whole thing keeps clear of the ground.
    const pivot: [number, number] = [BALL_CENTER[0] * curl, BALL_CENTER[1] * curl];
    let pivotZ = HIP_Z + (BALL_R - HIP_Z) * curl;
    let low = Infinity;
    for (let i = 0; i <= NECK; i++) low = Math.min(low, flat[i][1] - pivot[1] - radius(i) * (1 + 0.15 * curl));
    if (get('spin') === 0) pivotZ = Math.max(pivotZ, -low + 0.2 * (1 - curl));
    pivotZ += get('lift') + 0.25 * breathe * (1 - curl) - get('crouch') + (walking ? 0.6 * Math.abs(gait) : 0);

    const roller = F3.yaw(0).at(0, 0, pivotZ).pitch(get('spin'));
    const body = roller
      .turn(heading + get('yaw') + get('twist') + lead * 0.3)
      .at(get('lean') + 0.35 * gait, get('sway') + (walking ? 0.5 * Math.sin(cycle) : 0), 0)
      .pitch(get('pitch') + 0.1 * l.tired)
      .roll(get('roll') + (walking ? 0.05 * Math.sin(cycle) : 0));
    const floor = F3.yaw(heading + get('yaw'));
    const goal = (key: string, rest: V3, frame = floor) => {
      const at = goalAt(pose, key, toLocal(frame, rest));
      return at ? frame.p(...at) : rest;
    };
    const nodes: Node[] = flat.map(([x, z], i) => {
      const h = i < N ? (i > 0 ? (headings[i - 1] + headings[i]) / 2 : headings[0]) : headings[N - 1];
      // Rolled up, the trunk and head sink inside the shell and the tail thickens into the band that wraps it.
      const sink = i >= NECK ? curlHead : curl;
      const r = radius(i) * (1 + (i <= CHEST ? 0.06 * breathe : 0)) * (i < PELVIS ? 1 + 0.3 * curl : 1 - 0.4 * saturate((sink - 0.5) * 2));
      const bulge = i < N ? CHAIN[i].bulge : 0;
      return {
        p: body.p(x - pivot[0], 0, z - pivot[1]),
        t: body.v(Math.cos(h), 0, Math.sin(h)),
        d: body.v(-Math.sin(h), 0, Math.cos(h)),
        s: body.s,
        r,
        w: r * (1.08 + 0.3 * curl * bulge),
      };
    });
    // Peeking out of the ball: the head pushes out of the shell.
    const peekOut = saturate(get('peek')) * saturate((curl - 0.5) * 2);
    if (peekOut)
      for (let i = NECK; i <= N; i++) {
        const out = vnorm(vsub(nodes[i].p, body.o));
        nodes[i].p = vadd(nodes[i].p, vmul(out, 4.2 * peekOut * (i === NECK ? 0.5 : 1)));
      }
    // The tail swings sideways (`tailWag`), more towards the tip; it lags the walk a little.
    const wag = get('tailWag') + (walking ? 0.35 * Math.sin(cycle - 0.8) : 0) + (anim === 'idle' ? 0.12 * Math.sin(l.q * 2) : 0);
    if (wag)
      for (let i = 0; i < PELVIS; i++) {
        const k = ((PELVIS - i) / PELVIS) ** 1.3;
        nodes[i].p = vadd(nodes[i].p, vmul(nodes[i].s, wag * 6 * k * (1 - 0.7 * curlTail)));
      }
    // The head turns on the neck (`headYaw`, towards the walking direction too) and tilts (`headRoll`).
    // At rest the head is turned a little towards the viewer: a pet looks at its owner.
    const yawH = 0.3 * (1 - curlHead) + get('headYaw') + lead * 0.45,
      rollH = get('headRoll');
    if (yawH || rollH) {
      const pivotH = nodes[HEAD].p,
        upAxis = nodes[HEAD].d,
        alongAxis = nodes[HEAD].t;
      const turn = (v: V3) => rotate(rotate(v, upAxis, yawH), alongAxis, rollH);
      for (let i = HEAD; i <= N; i++) {
        const n = nodes[i];
        n.p = vadd(pivotH, turn(vsub(n.p, pivotH)));
        n.t = turn(n.t);
        n.d = turn(n.d);
        n.s = turn(n.s);
      }
    }
    /** A point along the spine at arc length `s`, interpolated between nodes. */
    const along = (s: number): Node => {
      const k = Math.max(0, Math.min(N - 1, ARC.findIndex((a) => a > s) - 1));
      const u = saturate((s - ARC[k]) / CHAIN[k].len);
      const a = nodes[k],
        b = nodes[k + 1];
      return { p: vlerp(a.p, b.p, u), t: vnorm(vlerp(a.t, b.t, u)), d: vnorm(vlerp(a.d, b.d, u)), s: a.s, r: a.r + (b.r - a.r) * u, w: a.w + (b.w - a.w) * u };
    };
    const center = body.o;
    // Paw goals ride with the body: the floor frame lifted by however far the hips are above their rest height.
    const armFrame = floor.at(get('lean'), 0, pivotZ - HIP_Z);
    const pelvis = nodes[PELVIS],
      chest = nodes[CHEST],
      head = nodes[HEAD],
      snout = nodes[SNOUT],
      tip = nodes[N];
    // The head's own frame: forward along the head segment, up = dorsal.
    const headDir = vnorm(vsub(snout.p, head.p));
    const headSide = vnorm(vsub(snout.s, vmul(headDir, vdot3(snout.s, headDir))));
    const headF = new F3(vlerp(head.p, snout.p, 0.42), headDir, headSide, vnorm(vcross(headDir, headSide)));
    const points: Record<string, V3> = {
      floor: [0, 0, 0],
      body: chest.p,
      ball: center,
      pelvis: pelvis.p,
      head: headF.o,
      crown: headF.p(-0.6, 0, 4.6),
      snout: tip.p,
      mouth: vadd(tip.p, vmul(headF.u, -0.9)),
      tailTip: nodes[0].p,
      back: vadd(nodes[CHEST - 1].p, vmul(nodes[CHEST - 1].d, nodes[CHEST - 1].r)),
      belly: vadd(nodes[PELVIS + 1].p, vmul(nodes[PELVIS + 1].d, -nodes[PELVIS + 1].r)),
    };

    // ---- legs ----------------------------------------------------------------------------------------------------
    const air = Math.max(0, get('lift'));
    const legs = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const name = 'foot' + suffix;
      const step = strideFoot(walking ? gaitPhase : t, sign < 0 ? 0.5 : 0, walking ? route.stride / scale : Math.PI / 4);
      const floorFrame = turning ? floor.turn(step.forward * 0.4) : floor;
      const hip = vadd(vadd(pelvis.p, vmul(pelvis.s, sign * pelvis.w * 0.62)), vmul(pelvis.d, -pelvis.r * 0.25));
      // In the air the feet hang under the hips, a little bent, instead of reaching for the ground.
      const stand = floorFrame.p(1.8 + (walking ? step.forward : 0) + air * 0.12, sign * (4.6 - air * 0.06), (walking || turning ? step.lift * (card.proportions.stepHeight ?? 4) : 0) + get('tap' + suffix) * 2.6 + air * 0.9);
      const tucked = vadd(vadd(hip, vmul(pelvis.d, -pelvis.r * 0.7)), vmul(pelvis.t, 2.4));
      const natural = tuck > 0 ? vlerp(stand, tucked, saturate(tuck)) : stand;
      const toe = goal(name, natural);
      const ankle = vadd(toe, [0, 0, 1.2]);
      const knee = ik(hip, ankle, 6.6 - 2.4 * tuck, 6.0 - 2.4 * tuck, vadd(floor.v(1, 0, 0.2), vmul(pelvis.t, 0.3)));
      points[name] = toe;
      const down = toe[2] < 0.1 && (!(walking || turning) || step.planted) && tuck < 0.3;
      return { name, sign, suffix, hip, knee, ankle, toe, down };
    });

    // ---- arms ----------------------------------------------------------------------------------------------------
    const arms = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      const name = 'paw' + suffix;
      const shoulder = vadd(vadd(chest.p, vmul(chest.s, sign * chest.w * 0.55)), vmul(chest.d, -chest.r * 0.5));
      const fold = Math.max(tuck, 0.0);
      const front = vadd(vadd(chest.p, vmul(chest.d, -(chest.r + 3.6 - 4 * fold))), vmul(chest.s, sign * (3.2 - 1.2 * fold)));
      const natural = vadd(front, vmul(chest.t, -1.2 - 2 * fold + 0.4 * breathe));
      const wrist = goal(name, natural, armFrame);
      const elbow = ik(shoulder, wrist, 5.0, 4.8, vadd(vmul(chest.t, -1), vmul(chest.s, sign * 0.6)));
      const open = saturate(get(name + 'Open') + get('pawsOpen'));
      // The paw points along the forearm, its top turned up; `pawPitch` turns the claws down or forward.
      const along = vnorm(vsub(wrist, elbow));
      const paw = new F3(wrist, along, chest.s, vnorm(vcross(chest.s, along))).pitch(get(name + 'Pitch') + get('pawPitch') + 0.5 - 0.6 * open);
      points[name] = wrist;
      points['claw' + suffix] = paw.p(5.2, 0, -1);
      return { name, sign, suffix, shoulder, elbow, wrist, paw, open };
    });

    // ---- eyes and tongue -----------------------------------------------------------------------------------------
    const eyes = [-1, 1].map((sign) => {
      const suffix = sign < 0 ? 'L' : 'R';
      // On the skull's surface (an ellipsoid round (0, 0, 0.4) with radii 4.6, 4.7, 4.7), a little forward and up.
      const dir = vnorm([1.5 / 4.6, (sign * 3.4) / 4.7, 1.4 / 4.7]);
      const k = 1 / Math.sqrt((dir[0] / 4.6) ** 2 + (dir[1] / 4.7) ** 2 + (dir[2] / 4.7) ** 2);
      const at = headF.p(dir[0] * k, dir[1] * k, 0.4 + dir[2] * k);
      points['eye' + suffix] = at;
      return { sign, suffix, at };
    });
    const tongueLen = get('tongue');
    const tongue: V3[] = [];
    if (tongueLen > 0.2) {
      const base = points.mouth;
      const dir = vnorm(vadd(vmul(headF.f, Math.cos(get('tongueAim'))), vmul(headF.u, -Math.sin(get('tongueAim')))));
      const side3 = headF.s;
      const up = vnorm(vcross(dir, side3));
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        const wig = Math.sin(t * 24 * 1.4 - u * 6) * get('tongueWiggle') * u * 1.8;
        tongue.push(vadd(base, vadd(vmul(dir, tongueLen * u), vadd(vmul(up, wig - u * u * get('tongueDroop') * tongueLen * 0.3), vmul(side3, wig * 0.4)))));
      }
      points.tongueTip = tongue[10];
    } else points.tongueTip = points.mouth;

    // ---- drawing ---------------------------------------------------------------------------------------------
    const r = new Rig();
    const overAll = get('overAll') > 0.5;
    const hidden = get('hidden') > 0.5;
    const late: (() => void)[] = [];
    if (!hidden) {
      drawBody(r, nodes, along, center, body, M, curl, flare, t, breathe, late);
      // Rolled up tight, the head and the limbs are inside the shell: they are not drawn at all.
      if (curlHead < 0.9) drawHead(r, headF, snout, tip, eyes, M, get, l.blink || asleep, curlHead, late);
      if (curl < 0.8) {
        for (const leg of legs) drawLeg(r, leg, floor, M, tuck, late);
        for (const arm of arms) drawArm(r, arm, M, late);
      }
      if (tongue.length) {
        r.tag = 'tongue';
        for (let i = 1; i < tongue.length; i++) r.cap(tongue[i - 1], tongue[i], 0.62 - i * 0.02, 0.6 - i * 0.02, M.tongue);
        r.ball(tongue[tongue.length - 1], 0.75, M.tongue);
      }
    }
    for (const [k, v] of Object.entries(points)) points[k + 'Ground'] = [v[0], v[1], 0];
    finishSurfaces(r, floor, [
      [M.scale, 'lacquer'],
      [M.scaleDeep, 'lacquer'],
      [M.skin, 'skin'],
      [M.skinDeep, 'skin'],
      [M.horn, 'skin'],
      [M.tongue, 'skin'],
      [M.nose, 'skin'],
    ], 'skin');
    for (const draw of late) draw();
    scaleFigure(r, points, scale, scale);
    const size = sizes[card.rarity][2];
    const ink = '#1c1410';
    let frame: BodyFrame;
    if (overAll) {
      // The whole pangolin flies over the painting frame: the body layer stays empty and the over layer carries it.
      const empty = new Rig();
      frame = projectFigure(empty, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
      const pad = 90,
        big = frame.px.w + 2 * pad,
        anchor: [number, number] = [frame.anchor[0] + pad, frame.anchor[1] + pad];
      const out = renderRig(r, big, big, ...anchor, { outline: hx(ink), inner: 3.6 });
      frame.px = renderRig(empty, big, big, ...anchor, { outline: hx(ink), inner: 3.6 }).p;
      frame.over = out.p;
      frame.anchor = anchor;
      for (const key of Object.keys(frame.points)) frame.points[key] = [frame.points[key][0] + pad, frame.points[key][1] + pad];
      frame.primitives = r.prims.length;
    } else frame = projectFigure(r, size, [Math.round(size * 0.5), Math.round(size * 0.8)], points, ink, 3.6, true);
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

type Palette = Record<'scale' | 'scaleDeep' | 'skin' | 'skinDeep' | 'horn' | 'tongue' | 'nose' | 'eye', Mat> & { rim: RGBA };
type Get = (k: string) => number;

/** A scale's face: a shadow band where the scale in front overlaps it, dark seams at the sides, a pale free edge. */
function scalePat(rim: RGBA, seam: RGBA): Mat['pat'] {
  return (q) => {
    if (q[2] < -0.3) return seam;
    if (q[0] > 0.74) return rim;
    if (q[0] < -0.25 || Math.abs(q[1]) > 0.9) return seam;
    return null;
  };
}
/** One shield-shaped scale lying on the surface at `at` with normal `n`; its free edge points along `back`. */
function scalePlate(r: Rig, at: V3, n: V3, back: V3, len: number, wid: number, tilt: number, mat: Mat, groove?: { list: (() => void)[]; color: RGBA }) {
  const f = vnorm(vadd(vmul(back, Math.cos(tilt)), vmul(n, Math.sin(tilt))));
  const u = vnorm(vsub(vmul(n, Math.cos(tilt)), vmul(back, Math.sin(tilt))));
  const s = vnorm(vcross(u, f));
  const c = vadd(vadd(at, vmul(f, len * 0.42)), vmul(u, 0.25));
  r.ell(new F3(c, f, s, u), [0, 0, 0], [len * 0.56, wid * 0.5, 0.62], mat);
  // Fine striations from the scale's root towards its middle (big scales only).
  if (groove) {
    const tag = r.tag;
    groove.list.push(() => {
      r.tag = tag;
      r.line(vadd(c, vadd(vmul(f, -len * 0.05), vmul(u, 0.66))), vadd(c, vadd(vmul(f, len * 0.3), vmul(u, 0.62))), groove.color, 0, 0.5);
    });
  }
}

function drawBody(r: Rig, nodes: Node[], along: (s: number) => Node, center: V3, shell: F3, M: Palette, curl: number, flare: number, t: number, breathe: number, late: (() => void)[]) {
  // The scales' free edge catches the light: a pale rim on the trailing third, a dark seam at its root.
  const rim = M.rim,
    seam = mixc(M.scaleDeep.T[1], M.scaleDeep.T[2], 0.4),
    groove = mixc(M.scale.T[1], M.scale.T[2], 0.4);
  const scaleMat: Mat = { ...M.scale, pat: scalePat(rim, seam) };
  // Trunk and tail: one ellipsoid per segment along the spine, dark between the scales; on the trunk its ventral
  // side (beyond the scale rows) is the pale skin of the belly, shaded by the light.
  const skinAt = (L: number) => M.skin.T[Math.min(3, Math.max(1, Math.round((L + 0.36) * 2.2)))];
  const bellyLimit = 1.4 + 0.9 * curl;
  for (let i = 0; i < SNOUT - 1; i++) {
    const a = nodes[i],
      b = nodes[i + 1];
    r.tag = i < PELVIS ? 'tail' : i < NECK ? 'body' : 'neck';
    const mid = vlerp(a.p, b.p, 0.5),
      tan = vnorm(vsub(b.p, a.p));
    const len = CHAIN[i].len;
    const trunk = i >= PELVIS - 1 && i < NECK;
    const mat: Mat = trunk ? { ...M.scaleDeep, pat: (q, L) => (Math.abs(Math.atan2(q[1], q[2])) > bellyLimit - 0.1 ? skinAt(L) : null) } : M.scaleDeep;
    r.ell(new F3(mid, tan, a.s, vnorm(vlerp(a.d, b.d, 0.5))), [0, 0, 0], [len * 0.62 + (a.r + b.r) * 0.18, (a.w + b.w) * 0.5, (a.r + b.r) * 0.5], mat);
  }
  // The soft belly: pale skin along the ventral side of the trunk.
  r.tag = 'belly';
  for (let i = PELVIS - 1; i < NECK + 1; i++) {
    const a = nodes[i],
      b = nodes[i + 1];
    const mid = vlerp(a.p, b.p, 0.5),
      tan = vnorm(vsub(b.p, a.p)),
      d = vnorm(vlerp(a.d, b.d, 0.5));
    const rr = (a.r + b.r) * 0.5,
      ww = (a.w + b.w) * 0.5;
    r.ell(new F3(vadd(mid, vmul(d, -rr * 0.26)), tan, a.s, d), [0, 0, 0], [CHAIN[i].len * 0.6 + rr * 0.15, ww * 0.8, rr * 0.86], M.skin);
  }
  // Rows of scales from the tail tip to the crown: alternate rows shifted by half a scale; wider rows on the tail
  // (the tail is scaled all round), the trunk down to the belly, a narrow cap on the head.
  const stop = ARC[HEAD] + 3.4;
  let row = 0;
  for (let s = 0.6; s < stop; row++) {
    const at = along(s);
    const trunk = s >= ARC[PELVIS] && s < ARC[NECK];
    if (curl > 0.9 && s >= ARC[PELVIS] - 2) {
      s += 0.95 + 0.3 * at.r;
      continue;
    }
    const phiMax = s < ARC[PELVIS] ? 2.0 + 0.3 * curl : trunk ? 1.4 + 0.9 * curl : s < ARC[HEAD] ? 1.2 + 0.8 * curl : 0.95 - 0.12 * (s - ARC[HEAD]);
    const size = (1.8 + 0.34 * at.r) * (s < ARC[PELVIS] ? 1.12 : 1);
    const across = (at.r + at.w) * 0.5;
    const count = Math.max(2, Math.round((2 * phiMax * across) / (size * 1.05)));
    const step = (2 * phiMax) / count;
    r.tag = s < ARC[PELVIS] ? 'tailScales' : s < ARC[NECK] ? 'scales' : 'headScales';
    for (let j = 0; j <= count; j++) {
      const phi = -phiMax + (j + (row % 2 ? 0.5 : 0)) * step;
      if (phi > phiMax + 1e-6) continue;
      const c = Math.cos(phi),
        sn = Math.sin(phi);
      const pos = vadd(at.p, vadd(vmul(at.d, at.r * c), vmul(at.s, at.w * sn)));
      const n = vnorm(vadd(vmul(at.d, c / at.r), vmul(at.s, sn / at.w)));
      const back = vnorm(vsub(vmul(at.t, -1), vmul(n, -vdot3(at.t, n))));
      const tilt = 0.26 + flare * (0.75 + 0.2 * Math.sin(t * 24 * 1.9 + j + row)) + 0.03 * hash(row, j);
      scalePlate(r, pos, n, back, size * 1.2, size * (1.05 + 0.25 * curl), tilt, scaleMat, size > 3 ? { list: late, color: groove } : undefined);
    }
    s += 0.95 + 0.3 * at.r;
  }
  // Rolled up: a round shell of scales grows inside the curling body, rows round the side axis like a pine cone, the
  // free edges pointing the way the tail wraps. It turns with `spin` (its axes are the body's).
  if (curl > 0.5) {
    const k = saturate((curl - 0.5) / 0.45);
    const R = (BALL_R - 0.9) * (0.55 + 0.45 * k) * (1 + 0.025 * breathe);
    const ax = shell.s,
      e1 = shell.f,
      e2 = shell.u;
    r.tag = 'body';
    r.ball(center, R * 0.97, M.scaleDeep);
    r.tag = 'scales';
    for (let i = 0; i < 11; i++) {
      const lat = -1.3 + i * 0.26;
      const rho = R * Math.cos(lat);
      const count = Math.max(4, Math.round((TAU * rho) / 3.7));
      for (let j = 0; j < count; j++) {
        const th = (TAU * (j + (i % 2) * 0.5)) / count + 0.4 * i;
        const around = vadd(vmul(e1, Math.cos(th)), vmul(e2, Math.sin(th)));
        const n = vnorm(vadd(vmul(around, Math.cos(lat)), vmul(ax, Math.sin(lat))));
        const back = vadd(vmul(e1, -Math.sin(th)), vmul(e2, Math.cos(th)));
        const big = 3.3 + 1.6 * Math.cos(lat);
        scalePlate(r, vadd(center, vmul(n, R)), n, back, big * 1.15, big, 0.28 + flare * 0.8, scaleMat, { list: late, color: groove });
      }
    }
    // A small round scale on each pole.
    for (const sg of [-1, 1]) r.ell(new F3(vadd(center, vmul(ax, sg * R)), e1, e2, vmul(ax, sg)), [0, 0, 0], [2.4, 2.4, 0.9], scaleMat);
  }
  // The very tip of the tail: a pointed last scale.
  r.tag = 'tailScales';
  const a = nodes[0],
    b = nodes[1];
  r.cap(b.p, vadd(a.p, vmul(vnorm(vsub(a.p, b.p)), 0.8)), 1.4, 0.35, M.scale);
  late.push(() => {
    r.tag = 'scales';
    // Pale hairs between the scales along both edges of the belly.
    if (curl < 0.6)
      for (let i = PELVIS; i < NECK; i++)
        for (const side of [-1, 1])
          for (const k of [0, 0.5]) {
            const n = vlerp(nodes[i].p, nodes[i + 1].p, k),
              m = nodes[i];
            const base = vadd(n, vadd(vmul(m.d, -m.r * 0.45), vmul(m.s, side * m.w * 0.8)));
            r.line(base, vadd(base, vadd(vmul(m.s, side * 1.2), vmul(m.d, -0.8))), hx('#f6dcbc'), 0, 0.4);
          }
  });
}
const vdot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Rodrigues rotation of `v` round the unit axis `k` by `a`. */
function rotate(v: V3, k: V3, a: number): V3 {
  if (!a) return v;
  const c = Math.cos(a),
    sn = Math.sin(a);
  return vadd(vadd(vmul(v, c), vmul(vcross(k, v), sn)), vmul(k, vdot3(k, v) * (1 - c)));
}

function drawHead(r: Rig, Hf: F3, snoutNode: Node, tipNode: Node, eyes: { sign: number; suffix: string; at: V3 }[], M: Palette, get: Get, blink: number, curlHead: number, late: (() => void)[]) {
  r.tag = 'head';
  // A round skull of bare skin with full cheeks, the snout tapering from it, a pink-brown nose at the tip.
  r.ell(Hf, [0, 0, 0.4], [4.6, 4.7, 4.7], M.skin);
  r.ell(Hf, [1.8, 0, -1.4], [3.4, 4.0, 2.9], M.skin);
  r.tag = 'snout';
  r.cap(Hf.p(3.0, 0, -0.4), tipNode.p, 2.6, 1.0, M.skin);
  r.ball(tipNode.p, 1.15, M.nose);
  r.tag = 'ears';
  for (const s of [-1, 1]) r.ell(Hf.at(-2.6, s * 4.2, 1.9), [0, 0, 0], [1.0, 0.6, 1.2], M.skinDeep);
  late.push(() => {
    r.tag = 'snout';
    // Nostrils and the mouth line under the snout.
    const nose = tipNode.p;
    for (const s of [-1, 1]) r.dot(vadd(nose, Hf.v(0.6, s * 0.55, 0.3)), hx('#140608'), 0, 1, 1);
    r.line(Hf.p(3.6, 1.2, -2.4), vadd(nose, Hf.v(-0.6, 0.6, -1.0)), hx('#6a3e40'), 0, 0.8);
    r.dot(vadd(nose, Hf.v(-0.2, -0.3, 0.9)), hx('#ffffff'), 0, 1, 1);
  });
  // Eyes: small shiny beads in a pale ring; a lid of skin comes down to blink; closed = a curved line.
  for (const e of eyes) {
    r.tag = 'eye' + e.suffix;
    const closed = blink > 0.5 || get('blink') > 0.5;
    const lid = Math.max(closed ? 1 : 0, get('lid'));
    const out = vnorm(vsub(e.at, Hf.p(0, 0, 0.4)));
    r.ball(vadd(e.at, vmul(out, -1.25)), 2.25, M.skinDeep);
    const bead = vadd(e.at, vmul(out, -0.55));
    // Glints, lashes and blush are drawn over the depth test, so only for an eye that faces the viewer.
    const facing = vdot3(out, [0, 0.8, 0.6]) > -0.1;
    if (lid < 0.95) {
      r.ball(bead, 1.75, M.eye);
      if (facing) late.push(() => {
        r.tag = 'eye' + e.suffix;
        r.dot(vadd(bead, vadd(vmul(out, 1.2), [-0.5, 0.5, 0.9])), hx('#ffffff'), 0, 1, 1);
        r.dot(vadd(bead, vadd(vmul(out, 1.2), [0.6, 0.4, -0.5])), hx('#9aa0c0'), 0, 1, 0.9);
        // Two little lashes above the eye.
        const lash = vadd(bead, vmul(out, 1.3));
        r.line(vadd(lash, Hf.v(-0.6, 0, 1.6)), vadd(lash, Hf.v(-1.3, 0, 2.5)), hx('#2a1a1c'), 0, 0.9);
        r.line(vadd(lash, Hf.v(0.4, 0, 1.7)), vadd(lash, Hf.v(0.3, 0, 2.7)), hx('#2a1a1c'), 0, 0.9);
      });
    }
    if (lid > 0.05) {
      const line = 1 - 2 * lid;
      r.ell(new F3(bead, [1, 0, 0], [0, 1, 0], [0, 0, 1]), [0, 0, 0], [1.95, 1.95, 1.95], M.skin, (q) => q[2] < line);
      if (lid > 0.9 && facing)
        late.push(() => {
          r.tag = 'eye' + e.suffix;
          r.line(vadd(bead, vadd(vmul(out, 1.9), Hf.v(-1.1, 0, -0.1))), vadd(bead, vadd(vmul(out, 1.9), Hf.v(1.1, 0, -0.1))), hx('#3a2024'), 0, 1);
        });
    }
  }
  // Rosy cheeks, the pet look; hidden when the head is tucked into the ball.
  if (curlHead < 0.6)
    late.push(() => {
      r.tag = 'head';
      for (const s of [-1, 1]) if (vdot3(Hf.v(0, s, 0), [0, 0.8, 0.6]) > 0.1) r.dot(Hf.p(2.2, s * 3.9, -1.6), hx('#f08a8a'), 0, 1, 0.7);
    });
  void snoutNode;
}

function drawLeg(r: Rig, leg: { sign: number; suffix: string; hip: V3; knee: V3; ankle: V3; toe: V3 }, floor: F3, M: Palette, tuck: number, late: (() => void)[]) {
  r.tag = 'leg' + leg.suffix;
  // A chunky scaled thigh, a short bare shin and a broad foot with four short claws.
  const thighDir = vnorm(vsub(leg.knee, leg.hip));
  const side = vnorm(vcross(thighDir, [0, 0, 1]));
  const up = vnorm(vcross(side, thighDir));
  r.ell(new F3(vlerp(leg.hip, leg.knee, 0.45), thighDir, side, up), [0, 0, 0], [4.4, 3.4, 3.6], M.scale);
  for (let i = 0; i < 3; i++) {
    const at = vlerp(leg.hip, leg.knee, 0.15 + i * 0.3);
    const n = vnorm(vadd(vmul(side, leg.sign * 0.9), vmul(up, 0.4)));
    scalePlate(r, vadd(at, vmul(n, 2.6)), n, thighDir, 3.2, 3.0, 0.35, { ...M.scale, pat: scalePat(M.rim, mixc(M.scaleDeep.T[0], M.scaleDeep.T[1], 0.5)) });
  }
  r.cap(leg.knee, leg.ankle, 2.1, 1.6, M.skinDeep);
  const fwd = floor.v(1, 0, 0);
  r.ell(new F3(vadd(leg.ankle, vadd(vmul(fwd, 1.2), [0, 0, -0.6])), fwd, floor.s, [0, 0, 1]), [0, 0, 0], [2.8, 1.9, 1.1], M.skinDeep);
  r.tag = 'claws';
  for (let k = -1.5; k <= 1.5; k += 1) {
    const base = vadd(leg.ankle, vadd(vmul(fwd, 3.2), vadd(vmul(floor.s, k * 0.75), [0, 0, -0.9])));
    r.cap(base, vadd(base, vadd(vmul(fwd, 1.3 - tuck * 0.5), [0, 0, -0.5])), 0.42, 0.15, M.horn);
  }
  void late;
}

function drawArm(r: Rig, arm: { sign: number; suffix: string; shoulder: V3; elbow: V3; wrist: V3; paw: F3; open: number }, M: Palette, late: (() => void)[]) {
  r.tag = 'arm' + arm.suffix;
  r.cap(arm.shoulder, arm.elbow, 2.3, 1.9, M.scale);
  const dir = vnorm(vsub(arm.elbow, arm.shoulder));
  const side = vnorm(vcross(dir, [0, 0, 1]));
  const n = vnorm(vadd(vmul(side, arm.sign), [0, 0, 0.3]));
  scalePlate(r, vadd(vlerp(arm.shoulder, arm.elbow, 0.35), vmul(n, 1.6)), n, dir, 2.8, 2.8, 0.35, { ...M.scale, pat: scalePat(M.rim, mixc(M.scaleDeep.T[0], M.scaleDeep.T[1], 0.5)) });
  r.cap(arm.elbow, arm.wrist, 1.8, 1.5, M.skin);
  r.ball(arm.paw.p(0.8, 0, 0), 1.75, M.skin);
  // Three curved digging claws, the middle one long: base → curve → tip, curling down unless the paw is open.
  r.tag = 'claws';
  const curlK = 1 - arm.open;
  for (const k of [-1, 0, 1]) {
    const L = k === 0 ? 1.45 : 1;
    let at = arm.paw.p(2.1, k * 1.05, 0.2);
    let a = 0.1;
    let w = 0.72 * L;
    for (let i = 0; i < 3; i++) {
      a += (0.5 + 0.35 * i) * curlK + 0.1;
      const next = vadd(at, arm.paw.v(Math.cos(a) * 1.8 * L, k * 0.15, -Math.sin(a) * 1.8 * L));
      r.cap(at, next, w, w * 0.62, M.horn);
      at = next;
      w *= 0.62;
    }
    const tipAt = at;
    late.push(() => {
      r.tag = 'claws';
      r.dot(tipAt, hx('#c8b294'), 0, 1, 1);
    });
  }
  void late;
}

export type { Palette };
