// Кайрос, хранитель мига: a small time-keeper beast whose body IS an hourglass. Two glass bulbs make the chest and
// the belly, held between two riveted brass plates by two brass posts, with a narrow brass waist between them; the
// warm sand of time lies in the chest. Night-blue fur (the robe colour of Повелитель часа) covers the shoulders, the
// arms, the digitigrade legs and the long tail, whose tip carries a brass pendulum that swings and ticks. The round
// head is a white enamel clock face with twelve ticks round the rim, turquoise eyes and clock-hand whiskers; tall ears
// end in brass spires; a twelve-tooth brass gear stands behind the head like a halo and steps one tooth a second.
// The rule of his magic is in the sand: while the sand pours, the world runs backwards. Upside down, the sand pours
// back into the chest — that is why he somersaults when the chest is empty.
// Bones never change length: every reach is an IK goal clamped by the same two segments.
import { readCreatureCard } from '../bodies/card-data';
import { hx, ik, TAU } from '../kit/f11-mobkit';
import { F3, Rig, vadd, vlerp, vmul, vnorm, vsub, type Mat, type RGBA, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { Creature } from '../types';
import { finishSurfaces } from './surface-work';
import { clips, gesture } from './kairos-poses';

const card = readCreatureCard('kairos');
export const portraitScale = 2.5;
/** Hip height above the ground at rest, rig units. */
export const HIP = 13.5;
/** Bone lengths: constant for every clip (the owner's rule: arms never stretch to reach a thing). */
export const BONES = { upperArm: 6.0, foreArm: 5.6, thigh: 5.6, shin: 5.9 };

const tones = (name: string) => card.materials.find((m) => m.name === name)!.tones;
const sw = (name: string, idx: number[], glow = 0): Mat => {
  const t = tones(name);
  return { T: [hx(t[idx[0]]), hx(t[idx[1]]), hx(t[idx[2]]), hx(t[idx[3]])], glow };
};
const night = sw('night', [0, 1, 2, 4]),
  nightSoft = sw('night', [1, 2, 3, 4]),
  brass = sw('brass', [1, 2, 3, 4], 0.05),
  brassDeep = sw('brass', [0, 1, 2, 3]),
  enamel = sw('enamel', [1, 2, 3, 4]),
  enamelShade = sw('enamel', [0, 1, 2, 3]),
  glass = sw('glass', [1, 2, 3, 4]),
  sand = sw('sand', [1, 2, 3, 4], 0.05),
  sandLit = sw('sand', [2, 3, 4, 4], 0.4),
  timeGlow = sw('time', [1, 2, 3, 4], 0.6),
  iris = sw('time', [0, 1, 2, 3], 0.35),
  ink = sw('ink', [0, 1, 2, 3]);
brass.spec = true;
glass.spec = true;
iris.spec = true;
const INK: RGBA = hx('#0a0c18'),
  WHITE: RGBA = hx('#ffffff'),
  SAND_SPARK: RGBA = hx('#fff0c0'),
  TIME_SPARK: RGBA = hx('#bff8f2');
// Short fur strands on the night-blue so the dark masses read as fur and not as plastic.
for (const m of [night, nightSoft])
  m.pat = (q, light) => {
    const strand = Math.sin(q[0] * 17 + q[1] * 11 + q[2] * 6) * Math.cos(q[2] * 8 - q[1] * 7);
    return strand > 0.78 ? m.T[light > 0.7 ? 3 : light > 0.3 ? 2 : 1] : null;
  };
// Fine grain on the sand.
sand.pat = (q, light) => (Math.sin(q[0] * 41 + q[1] * 37) * Math.sin(q[2] * 43) > 0.7 ? sand.T[light > 0.5 ? 3 : 2] : null);

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
type Pose = Record<string, number>;

/** One glass bulb: the front half is cut away so the inside back wall shows; sand fills it from the bottom up. */
function bulb(r: Rig, B: F3, z: number, rad: V3, fill: number, heap: number, tag: string) {
  r.tag = tag;
  r.ell(B, [0, 0, z], rad, glass, (q) => q[0] > 0.12);
  if (fill > 0.02) {
    r.tag = 'sand';
    // The surface stays level in the body frame; a heap bulges it in the middle.
    // A full bulb is filled to 60 % of its height, like a real hourglass.
    const level = -1 + 1.25 * clamp(fill);
    r.ell(B, [0, 0, z], [rad[0] * 0.86, rad[1] * 0.86, rad[2] * 0.88], sand, (q) => q[2] > level + heap * (1 - (q[0] * q[0] + q[1] * q[1])));
  }
}
/** A riveted brass plate. */
function plate(r: Rig, B: F3, z: number, rf: number, rs: number, ru: number) {
  r.tag = 'hourglass';
  r.ell(B, [0, 0, z], [rf, rs, ru], brass);
  r.ell(B, [0, 0, z - ru * 0.6], [rf * 0.94, rs * 0.94, ru * 0.5], brassDeep);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const c = Math.cos(a),
      s = Math.sin(a);
    if (c < -0.2) continue;
    r.dot(B.p(rf * 0.86 * c, rs * 0.86 * s, z + ru * 0.25), hx('#fff3c4'), 0.1, 1, 0.7);
  }
}
function gear(r: Rig, H: F3, spin: number, glow: number, j: Record<string, V3>) {
  // Behind the head, facing the viewer the same way as the face; twelve teeth, four spokes, a turquoise hub.
  const G = H.at(-3.4, 0, 1.2);
  r.tag = 'gear';
  const ring = 7.6,
    w = 1.1;
  const at = (a: number, rad: number, d = 0): V3 => G.p(d, rad * Math.cos(a + spin), rad * Math.sin(a + spin));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU,
      b = ((i + 1) / 24) * TAU;
    r.cap(at(a, ring), at(b, ring), w, w, brass);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU,
      da = 0.11;
    r.poly([at(a - da, ring + 0.4, 0.3), at(a + da, ring + 0.4, 0.3), at(a + da * 0.75, ring + 2.4, 0.3), at(a - da * 0.75, ring + 2.4, 0.3)], brass);
    r.poly([at(a - da, ring + 0.4, -0.3), at(a + da, ring + 0.4, -0.3), at(a + da * 0.7, ring + 2.0, -0.3), at(a - da * 0.7, ring + 2.0, -0.3)], brassDeep);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    r.cap(at(a, 1.4), at(a, ring - 0.6), 0.45, 0.45, brassDeep);
  }
  r.ell(G, [0, 0, 0], [0.8, 1.5, 1.5], glow > 0.3 ? timeGlow : iris);
  j.gear = G.o;
}
function head(r: Rig, H: F3, p: Pose, glow: number, j: Record<string, V3>) {
  r.tag = 'head';
  r.ell(H, [-1.4, 0, 0.6], [4.4, 5.3, 4.9], night);
  // Cheek ruff: the fur frames the enamel face.
  for (const s of [-1, 1]) r.ell(H, [0.6, s * 4.6, -1.6], [2.6, 2.0, 2.6], nightSoft);
  r.tag = 'face';
  const FC: V3 = [1.2, 0, -0.5],
    FR: V3 = [4.0, 5.3, 4.7];
  r.ell(H, FC, FR, enamel);
  const onFace = (s: number, u: number, out = 0.08): V3 => {
    const k = 1 - (s / FR[1]) ** 2 - ((u - FC[2]) / FR[2]) ** 2;
    return H.p(FC[0] + FR[0] * Math.sqrt(Math.max(0, k)) + out, s, u);
  };
  // Twelve ticks round the rim of the dial, the twelfth one long.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU,
      s = 4.1 * Math.sin(a),
      u = FC[2] + 3.8 * Math.cos(a);
    const s2 = 3.5 * Math.sin(a),
      u2 = FC[2] + 3.25 * Math.cos(a);
    if (i === 0) r.line(onFace(s, u), onFace(s2 * 0.9, u2 - 0.3), hx('#4a4038'), 0, 0.5);
  }
  // Eyes: big turquoise ovals with a white glint, upper lids of night fur when blinking.
  const blink = clamp(p.blink ?? 0);
  for (const s of [-1, 1]) {
    const E = F3.yaw(0, onFace(s * 2.1, 0.5, -0.45));
    const eye = new F3(E.o, H.f, H.s, H.u);
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    const start = r.size;
    const open = 1 - blink;
    if (open > 0.2) {
      r.ell(eye, [0, 0, 0], [1.0, 1.45, 1.8 * open], ink);
      r.ell(eye, [0.4, 0, -0.12 * open], [0.8, 1.2, 1.5 * open], glow > 0.3 ? timeGlow : iris);
      r.ell(eye, [0.72, 0, -0.1], [0.45, 0.6, 0.85 * open], ink);
      r.dot(eye.p(1.05, -0.5, 0.75 * open), WHITE, 0.3, 1, 0.8);
    } else r.line(eye.p(0.8, -1.2, 0.1), eye.p(0.9, 1.2, 0.1), INK, 0, 0.6);
    r.markEye(start, s, open > 0.25);
    j[s < 0 ? 'eyeL' : 'eyeR'] = eye.p(0.8, 0, 0);
  }
  // Muzzle, nose, mouth.
  r.tag = 'face';
  r.ell(H, [4.1, 0, -2.0], [1.7, 2.2, 1.5], enamel);
  r.ball(H.p(5.75, 0, -1.55), 0.6, ink);
  const smile = p.smile ?? 0,
    mouth = p.mouth ?? 0;
  for (const s of [-1, 1]) r.line(H.p(5.7, 0, -2.3), H.p(5.3, s * 1.1, -2.6 + 0.4 * smile), INK, 0, 0.6);
  if (mouth > 0.1) r.ell(H, [5.0, 0, -3.0], [0.5, 0.8, 0.5 + 0.8 * mouth], ink);
  // Whiskers are clock hands: an hour hand and a minute hand on each cheek, set at ten past ten.
  for (const s of [-1, 1]) {
    const root = H.p(4.9, s * 1.9, -2.6);
    r.line(root, H.p(4.0, s * 4.6, -2.0), hx('#d09a3c'), 0.05, 0.7);
    r.line(root, H.p(4.2, s * 4.4, -3.4), hx('#9a6a24'), 0, 0.7);
  }
  j.head = H.o;
  j.muzzle = H.p(5.8, 0, -1.6);
  // Ears with brass spires.
  for (const s of [-1, 1]) {
    const droop = p[s < 0 ? 'earL' : 'earR'] ?? 0;
    const base = H.p(-1.0, s * 3.2, 3.6);
    const E = H.at(-1.0, s * 3.2, 3.6).roll(s * (0.22 + 0.5 * droop)).pitch(-0.12 + 0.2 * droop);
    r.tag = s < 0 ? 'earL' : 'earR';
    r.ell(E, [0, 0, 2.8], [1.2, 1.7, 3.6], night);
    r.ell(E, [0.8, 0, 2.4], [0.45, 0.85, 2.6], enamel);
    const tip = E.p(0, 0, 6.3);
    r.spike(tip, vsub(E.p(0, 0, 9), tip), 3.4, 0.9, brass, 4, 0.4);
    r.ball(tip, 0.75, brass);
    j[s < 0 ? 'earL' : 'earR'] = E.p(0, 0, 8.4);
    void base;
  }
}
function arm(r: Rig, B: F3, s: number, goal: V3, j: Record<string, V3>, curl: number) {
  const shoulder = B.p(0.3, s * 6.0, 21.4);
  const pole = vadd(vmul(B.f, -1), vmul(B.s, s * 0.6));
  const elbow = ik(shoulder, goal, BONES.upperArm, BONES.foreArm, pole);
  // The IK clamps the hand onto the reach of the two bones: the wrist never goes past them.
  const dir = vnorm(vsub(goal, elbow));
  const wrist = vadd(elbow, vmul(dir, BONES.foreArm));
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'arm' + name;
  r.ball(shoulder, 2.0, night);
  r.cap(shoulder, elbow, 1.65, 1.4, night);
  r.cap(elbow, wrist, 1.4, 1.15, nightSoft);
  // Brass cuff.
  r.cap(vlerp(elbow, wrist, 0.78), vlerp(elbow, wrist, 0.94), 1.35, 1.35, brass);
  r.tag = 'paw' + name;
  const P = new F3(wrist, dir, vnorm(vsub(B.s, vmul(dir, B.s[0] * dir[0] + B.s[1] * dir[1] + B.s[2] * dir[2]))), B.u);
  const paw = vadd(wrist, vmul(dir, 1.1));
  r.ball(paw, 1.3, enamel);
  for (let k = -1; k <= 1; k++) {
    const f = vadd(paw, vadd(vmul(dir, 1.0 - 0.6 * curl), vmul(B.f, 0.5 * k)));
    r.ball(vadd(f, vmul(B.u, -0.2 * Math.abs(k))), 0.55, enamel);
  }
  j['paw' + name] = paw;
  j['elbow' + name] = elbow;
  void P;
}
function leg(r: Rig, B: F3, F: F3, s: number, foot: V3, tuck: number, j: Record<string, V3>) {
  const hip = B.p(0, s * 3.1, -0.9);
  // Digitigrade: the toes on the goal, the heel raised behind them; the knee points forward.
  const toe = foot;
  const back = vlerp(F.f, B.f, tuck);
  const up = vlerp(F.u, B.u, tuck);
  const ankle = vadd(toe, vadd(vmul(back, -2.0), vmul(up, 3.3)));
  const knee = ik(hip, ankle, BONES.thigh, BONES.shin, vadd(B.f, vmul(B.u, -0.2)));
  const dir = vnorm(vsub(ankle, knee));
  const heel = vadd(knee, vmul(dir, BONES.shin));
  const name = s < 0 ? 'L' : 'R';
  r.tag = 'leg' + name;
  r.ball(hip, 2.0, night);
  r.cap(hip, knee, 2.2, 1.6, night);
  r.cap(knee, heel, 1.5, 1.0, nightSoft);
  r.cap(vlerp(knee, heel, 0.8), vlerp(knee, heel, 0.95), 1.15, 1.15, brass);
  r.tag = 'foot' + name;
  r.cap(heel, toe, 1.0, 1.2, nightSoft);
  const T = F3.yaw(Math.atan2(back[1], back[0]), toe);
  r.ell(T, [0.6, 0, 0.4], [1.9, 1.25, 0.9], enamel);
  for (const k of [-1, 0, 1]) r.ball(T.p(1.9, k * 0.75, 0.35), 0.5, enamel);
  j['foot' + name] = toe;
}
function catmull(points: V3[], t: number): V3 {
  const x = clamp(t, 0, 0.999999) * (points.length - 1);
  const i = Math.floor(x),
    a = x - i,
    b = a * a,
    c = a * b;
  const p = points[Math.max(0, i - 1)],
    q = points[i],
    u = points[i + 1],
    v = points[Math.min(points.length - 1, i + 2)];
  return [0, 1, 2].map((k) => 0.5 * (2 * q[k] + (-p[k] + u[k]) * a + (2 * p[k] - 5 * q[k] + 4 * u[k] - v[k]) * b + (-p[k] + 3 * q[k] - 3 * u[k] + v[k]) * c)) as V3;
}
function tail(r: Rig, B: F3, swing: number, curl: number, j: Record<string, V3>) {
  // Out from under the bottom plate, back and down, then the pendulum hangs from the last bend and swings sideways.
  const pivot = B.p(-8.2, 0, 4.2 + 2 * curl);
  const hang = 5.6;
  const bob = vadd(pivot, vadd(vmul(B.s, hang * Math.sin(swing)), vmul(B.u, -hang * Math.cos(swing))));
  const pts: V3[] = [B.p(-3.6, 0, 1.2), B.p(-6.4, 0, 0.8 + curl), B.p(-8.6, 0, 3.0 + 2 * curl), pivot];
  r.tag = 'tail';
  let prev = pts[0];
  for (let i = 1; i <= 10; i++) {
    const q = catmull(pts, i / 10);
    r.cap(prev, q, 1.6 - 0.07 * i, 1.6 - 0.07 * (i + 1), night);
    prev = q;
  }
  // The pendulum rod and its brass disc, with one punched tick.
  r.tag = 'pendulum';
  r.cap(pivot, bob, 0.45, 0.45, brassDeep);
  const D = new F3(bob, B.f, vnorm(vsub(bob, pivot)), vnorm(vsub(pivot, bob)));
  r.ell(new F3(bob, B.f, B.s, B.u), [0, 0, 0], [0.7, 2.5, 2.5], brass);
  r.line(vadd(bob, vmul(B.f, 0.75)), vadd(bob, vadd(vmul(B.f, 0.75), vmul(B.u, 1.6))), hx('#5a3c14'), 0, 0.6);
  j.pendulum = bob;
  j.tail = pivot;
  void D;
}

const loops: Record<string, number> = { idle: 3, walk: 1 };
export const kairosFigure: Creature['frame'] = (anim, t, side, _variant, motion) => {
  const p = gesture(anim, t) as Pose;
  const get = (k: string) => p[k] ?? 0;
  const D = clips[anim]?.seconds ?? 2;
  const cycles = (perSecond: number) => Math.max(1, Math.round(D * perSecond));
  const osc = (perSecond: number, phase = 0) => Math.sin((TAU * cycles(perSecond) * t) / D + phase);
  const period = loops[anim] ?? 0;
  const breath = period ? Math.sin((t * TAU) / period) : 0;
  const r = new Rig(),
    j: Record<string, V3> = {};
  r.innerInk = INK;
  const F = F3.yaw(card.life.yaw + (side * Math.PI) / 8).turn(get('yaw'));
  // Walking: two feet on the stride; standing: feet a little apart, one a touch ahead.
  const walking = anim === 'walk';
  const phase = motion?.gaitPhase ?? t;
  const stride = card.life.stride / portraitScale;
  const step = (offset: number) => {
    if (!walking) return { forward: 0, lift: 0 };
    const w = ((phase + offset) % 1 + 1) % 1;
    if (w < 0.5) return { forward: stride * (0.25 - w), lift: 0 };
    const u = 2 * (w - 0.5);
    return { forward: stride * (-0.25 - 0.5 * u + 3 * u * u - 2 * u * u * u), lift: Math.sin(Math.PI * u) ** 2 };
  };
  const bounce = walking ? 0.7 * Math.abs(Math.sin(phase * TAU)) : 0;
  const tuck = clamp(get('tuck'));
  const hipZ = HIP - get('squat') - get('crouch') + get('rise') + get('jump') + get('hop') - bounce + 0.25 * breath;
  // Turns (the somersault) pivot round the middle of the hourglass, not round the hips.
  const MID = 13;
  const B = F.at(get('lean') + get('fwd'), get('side'), hipZ + MID)
    .pitch(get('pitch'))
    .roll(get('roll') + (walking ? 0.05 * Math.sin(phase * TAU) : 0))
    .turn(get('twist'))
    .at(0, 0, -MID);
  // ---- legs
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const st = step(s < 0 ? 0 : 0.5);
    const ground = F.p(1.0 + st.forward + get('step' + name) + get('gait' + name), s * 3.7, st.lift * 2.6 + get('lift' + name) + get('glift' + name));
    const tucked = B.p(4.2, s * 3.0, -2.8);
    leg(r, B, F, s, vlerp(ground, tucked, tuck), tuck, j);
  }
  // ---- torso: the hourglass
  const sandTop = clamp(1 - get('spent')),
    pour = clamp(get('pour')),
    glow = clamp(get('glow'));
  // Upside down the sand falls back to the chest: the heaps are drawn in the frame of gravity, not of the body.
  const flipUp = Math.cos(get('pitch')) < 0;
  plate(r, B, 1.0, 4.5, 5.7, 1.0);
  bulb(r, B, 6.6, [4.3, 5.3, 5.0], 0.75 * (flipUp ? 0 : 1 - sandTop), 0.25, 'belly');
  r.tag = 'hourglass';
  r.ell(B, [0, 0, 11.8], [1.9, 2.25, 1.05], brass);
  r.ell(B, [0, 0, 11.8], [1.2, 1.5, 1.4], brassDeep);
  bulb(r, B, 17.0, [4.5, 5.6, 5.0], 0.62 * (flipUp ? 1 - sandTop : sandTop), -0.15, 'chest');
  plate(r, B, 22.4, 4.8, 6.4, 1.0);
  r.tag = 'hourglass';
  for (const s of [-1, 1]) {
    // The posts stand just outside the bulbs, so they frame the glass from the front.
    r.cap(B.p(0.6, s * 5.95, 1.6), B.p(0.6, s * 6.15, 22.0), 0.5, 0.5, brass);
    r.ball(B.p(0.6, s * 5.95, 1.9), 0.8, brass);
    r.ball(B.p(0.6, s * 6.15, 21.8), 0.8, brass);
    r.ball(B.p(0.6, s * 6.05, 11.8), 0.65, brassDeep);
  }
  // Glints on the glass: a vertical strip at upper left of each bulb.
  for (const [z, rz] of [[6.6, 5.0], [17.0, 5.0]] as const) {
    r.line(B.p(4.0, -3.3, z + rz * 0.15), B.p(3.6, -3.1, z + rz * 0.62), hx('#d8fbff'), 0.2, 0.7);
    r.dot(B.p(3.9, -2.6, z + rz * 0.72), WHITE, 0.3, 1, 0.8);
    // A pale rim along the outer edge of the glass on the lit side.
    for (let i = 0; i < 7; i++) {
      const a = -0.4 + i * 0.32;
      r.dot(B.p(3.2 * Math.cos(a) + 0.8, -4.6 * Math.cos(a) * 0.8, z + rz * 0.82 * Math.sin(a + 0.6)), hx('#c4eef0'), 0.15, 1, 0.75);
    }
  }
  // The stream through the waist: a thread of sand (turquoise-lit while time runs back).
  if (pour > 0.02) {
    const top = flipUp ? B.p(0.4, 0, 9.2) : B.p(0.4, 0, 14.4),
      bottom = flipUp ? B.p(0.4, 0, 16.0) : B.p(0.4, 0, 6.6 - 3 * (1 - sandTop));
    r.tag = 'sand';
    r.cap(top, bottom, 0.32 + 0.25 * pour, 0.32 + 0.2 * pour, sandLit);
    for (let i = 0; i < 4; i++) {
      const k = (t * 3 + i / 4) % 1;
      r.dot(vlerp(top, bottom, k), i % 2 ? SAND_SPARK : TIME_SPARK, 0.6 * glow + 0.2, 1, 0.8);
    }
  }
  // Fur mantle over the shoulders and a short collar.
  r.tag = 'body';
  r.ell(B, [-1.8, 0, 24.0], [3.2, 6.0, 1.3], night);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 2.2;
    r.ell(B.at(-1.0 + 3.2 * Math.cos(a), 6.2 * Math.sin(a), 23.9).turn(a), [0, 0, 0], [1.0, 1.1, 1.1 + 0.3 * (i % 2)], nightSoft);
  }
  r.cap(B.p(0, 0, 24.5), B.p(0.4, 0, 27.0), 2.6, 2.4, night);
  r.ell(B, [0.2, 0, 25.6], [2.9, 3.2, 0.6], brass);
  // ---- head and gear
  const H = B.at(0.8, 0, 31.6)
    .turn(get('gaze'))
    .roll(get('tilt'))
    .pitch(get('nod'))
    .scale(1.22);
  // The gear steps one tooth a second, snapping with a small overshoot, plus whatever the pose adds.
  const ticks = Math.floor(t + 1e-6),
    within = t - ticks;
  const snap = within < 0.12 ? (within / 0.12) * 1.08 : within < 0.2 ? 1.08 - (within - 0.12) / 0.08 * 0.08 : 1;
  const spin = -(ticks + snap) * (TAU / 12) * (anim === 'walk' ? 0 : 1) + get('gearSpin');
  gear(r, H, spin, glow, j);
  head(r, H, p, glow, j);
  // ---- arms
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R';
    const sway = walking ? -0.9 * Math.sin(phase * TAU + (s < 0 ? 0 : Math.PI)) : 0;
    const rest = B.p(1.8 + sway, s * 7.0, 11.8);
    const goal = vadd(rest, vadd(vmul(B.f, get('h' + name + 'f')), vadd(vmul(B.s, s * get('h' + name + 's')), vmul(B.u, get('h' + name + 'u')))));
    arm(r, B, s, goal, j, get('curl'));
  }
  // ---- tail with the pendulum: it ticks — a pause at each end of the swing.
  const swingRaw = osc(period ? 1 / period * 3 : 1);
  const swing = 0.42 * Math.sign(swingRaw) * Math.pow(Math.abs(swingRaw), 0.6) + get('tailSway');
  tail(r, B, swing, get('tailCurl'), j);
  j.chest = B.p(0.5, 0, 17);
  j.belly = B.p(0.5, 0, 6.6);
  j.waist = B.p(0.4, 0, 11.8);
  for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
  r.eye = j.eyeL;
  finishSurfaces(r, F, [
    [night, 'fur'],
    [nightSoft, 'fur'],
    [brass, 'metal'],
    [brassDeep, 'metal'],
    [enamel, 'ivory'],
    [enamelShade, 'ivory'],
    [glass, 'ice'],
    [iris, 'iris'],
    [timeGlow, 'ice'],
    [ink, 'skin'],
  ], 'skin');
  scaleFigure(r, j, portraitScale);
  const frame = projectFigure(r, 160, [80, 150], j, '#0a0c18', 4.4, true);
  const lift = Math.max(0, get('jump'));
  frame.groundShadow = { radius: 160 * 0.12 / (1 + 0.03 * lift), opacity: 0.55 / (1 + 0.04 * lift), reflectionOpacity: 0 };
  if (get('dx')) frame.dx = Math.round(get('dx'));
  if (get('dy')) frame.dy = Math.round(get('dy'));
  if (get('flash')) frame.flash = get('flash');
  frame.planted = [];
  return frame;
};
