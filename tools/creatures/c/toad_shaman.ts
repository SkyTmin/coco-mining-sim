import route from './toad_shaman-life';
import keys from './toad_shaman-keys';
import { withTechniques } from '../technique';
import { strideFoot, attachMotion } from '../motion';
import { finishSurfaces } from './surface-work';
// A splayed marsh elder, bearing a ribbed lantern cap on a crooked root staff.
import { F3, Rig, vlerp, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU } from '../kit/f11-mobkit';
import { everyday, life, projectFigure, scaleFigure } from '../rig/figure';
import { animations, props, effects, pose, presentation } from './toad_shaman-actions';
import type { Creature, Variant } from '../types';

export interface ToadPose {
  throat?: number;
  jaw?: number;
  tongue?: number;
  staffLift?: number;
  staffAngle?: number;
  crouch?: number;
  lift?: number;
  hip?: number;
  lean?: number;
  pitch?: number;
  twist?: number;
  neck?: number;
  chin?: number;
  step?: number;
  tuck?: number;
  staffReach?: number;
  staffSide?: number;
  staffPitch?: number;
  tongueReach?: number;
  keyRig?: number;
  setStaff?: number;
  travel?: number;
  spread?: number;
  approach?: number;
  phase?: number;
}
export function bodyFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  A: ToadPose = {},
  headSide = side,
) {
  // Shorten the off-axis reach of the staff arm on profile and rear drawings.
  if (A.keyRig && side % 16 !== 0) {
    const sideView = Math.min(1, 3 * Math.abs(Math.sin((side * Math.PI) / 16)));
    A = {
      ...A,
      hip: (A.hip ?? 0) * (1 - 0.38 * sideView),
      lean: (A.lean ?? 0) * (1 - 0.38 * sideView),
      step: (A.step ?? 0) * (1 - 0.22 * sideView),
      pitch: (A.pitch ?? 0) * (1 - 0.3 * sideView),
      staffLift: (A.staffLift ?? 0) * (1 - 0.47 * sideView),
      staffReach: (A.staffReach ?? 0) * (1 - 0.32 * sideView),
      tongueReach: (A.tongueReach ?? 0) * (1 - 0.77 * sideView),
      staffSide: (A.staffSide ?? 0) * (1 - 0.38 * sideView),
    };
    if (anim === 'tech_staff') {
      // Seen from the back the palm lifts and jabs the staff, without the full frontal windmill.
      // Turning the cap toward the lens leaves a distinct interval between the hand and the toe.
      const raise = Math.min(1, Math.max(0, (A.staffLift ?? 0) / 32));
      A.staffAngle = -0.68 * raise + 0.16 * Math.sin(A.staffAngle ?? 0);
      A.staffPitch = -0.62 * raise;
      A.staffLift = 18 * raise;
      A.staffSide = (A.staffSide ?? 0) * 0.45;
    }
  }
  const lead = Math.max(-0.62, Math.min(0.62, ((((headSide - side + 24) % 16) - 8) * Math.PI) / 8));
  const r = new Rig(),
    gold = variant === 'gold',
    l = life(anim, t, 5.26),
    phase = A.phase ?? (anim === 'idle-f2' ? 1 : 0);
  const skin: Mat = {
    T: gold
      ? tn('#53413b', '#91653f', '#c89a59', '#efd38c')
      : tn('#34474b', '#586a4a', '#8e9757', '#c2bd76'),
  };
  skin.pat = (q, L) => {
    const x = q[0] * 9 + q[2] * 3.7,
      y = q[1] * 12 + 2 * Math.cos(x);
    const fleck = Math.sin(x * 1.9 + y * 0.4) * Math.cos(y * 1.1 + q[2] * 11);
    return fleck > 0.88 && L > 0 ? skin.T[L > 0.65 ? 2 : 1] : null;
  };
  const moss: Mat = {
    T: gold
      ? tn('#414437', '#636044', '#988152', '#bdac68')
      : tn('#253941', '#39554d', '#4f7461', '#7f9665'),
  };
  moss.pat = (q, L) => {
    const clump = Math.sin(q[0] * 19 + q[2] * 13) * Math.cos(q[1] * 17 + q[2] * 13);
    const fold = Math.cos(q[1] * 14 + q[0] * 4 + 1.3 * Math.sin(q[2] * 4));
    if (fold < -0.82 && q[2] > -0.2) return moss.T[L > 0.72 ? 2 : 1];
    return clump > 0.64 && L > 0.12 ? moss.T[L > 0.64 ? 3 : 2] : null;
  };
  const mouth: Mat = { T: tn('#322c3a', '#51404c', '#765159', '#9a6970') };
  const shell: Mat = {
    T: gold
      ? tn('#73504a', '#ba8153', '#e8b978', '#fff1b0')
      : tn('#725747', '#ab8668', '#dbc399', '#f2dfb6'),
  };
  const twig: Mat = { T: tn('#3e3339', '#655044', '#927558', '#b29c74') };
  const cap: Mat = {
    T:
      phase > 0.6
        ? tn('#41504a', '#687b52', '#a4b566', '#dbe58a')
        : tn('#4a5244', '#697650', '#8fa164', '#b6cb7b'),
  };
  cap.pat = (q, L) => {
    const radial = Math.atan2(q[1], q[0]) * 13 + q[2] * 1.4;
    if (q[2] < 0.45 && Math.cos(radial) > 0.55) return cap.T[L > 0.62 ? 2 : 1];
    const d = Math.sin(q[0] * 9 + q[1] * 4) * Math.cos(q[1] * 11);
    return q[2] > 0.43 && d > 0.81 ? cap.T[3] : null;
  };
  const gill: Mat = { T: tn('#817a4e', '#b4ab66', '#d5cd76', '#eee9a4'), glow: 0.46 + 0.4 * phase };
  const F = F3.yaw(1.22 + (side * TAU) / 16).scale(1.11),
    stride = l.walk,
    breath = Math.sin(l.q);
  const drop = (A.crouch ?? 0) + 8 * l.sleep + 10 * l.tired + 14 * l.hatch,
    jaw = A.jaw ?? 0;
  const jump = A.lift ?? 0;
  const B = F.at(-3 + (A.hip ?? 0), 1.2 * stride + (A.lean ?? 0), 32 - drop + 0.85 * breath)
    .pitch(0.04 + 0.14 * l.sleep + 0.08 * l.tired + (A.pitch ?? 0))
    .turn(A.twist ?? 0);
  r.ell(B, [-3, 0, 0], [22, 31, 19], skin);
  r.ell(B, [-6, 0, 6], [21, 34, 19], moss);
  const sockets: Record<string, V3> = {},
    planted: string[] = [];
  const scale = 1.22;
  // The weight is carried on folded hocks. Webs unite each set of long toes.
  for (const s of [-1, 1]) {
    const cycle =
      anim === 'walk'
        ? strideFoot(t, s < 0 ? 0.5 : 0, 22 / (1.11 * scale))
        : { forward: 0, lift: 0, planted: true };
    const swing = cycle.lift,
      hip = B.at(-7, s * 24, -5);
    if (cycle.planted) planted.push(s < 0 ? 'footL' : 'footR');
    r.ell(hip, [-3, 0, 0], [17, 14, 12], skin);
    const heel = F.at(
      -6 + cycle.forward - s * (A.step ?? 0),
      s * (32 - (A.tuck ?? 0) * 0.4 + (A.spread ?? 0)),
      6 + swing * 5.8 + (A.tuck ?? 0),
    );
    r.cap(hip.p(5, s * 3, -2), heel.o, 9, 5.1, skin);
    const sole = heel.at(9, s * 3, -3);
    r.ell(sole, [0, 0, 0], [10.2, 7.1, 3.2], skin);
    const toes: V3[] = [];
    for (const [i, k] of [-1, 0, 1].entries()) {
      const end = sole.p(11 + (i === 1 ? 4 : 0), s * (5.8 + k * 5.8), -1.2);
      toes.push(end);
      r.cap(sole.p(4, s * (k * 2.5), 0), end, 2.1, 1.2, skin);
      r.ell(sole, [11 + (i === 1 ? 4 : 0), s * (5.8 + k * 5.8), -1.2], [2.1, 1.7, 1.1], skin);
    }
    r.poly([sole.o, ...toes], skin, -0.1);
    const socket = s < 0 ? 'footL' : 'footR';
    // In the landing stance the outer toes break the water ahead of the sole.
    sockets[socket] = anim === 'tech_leap' ? sole.p(12, s * 10, -2) : sole.p(6, 0, -2);
    sockets[socket + 'Ground'] = [sockets[socket][0], sockets[socket][1], 0];
  }
  // Overlapping panels hang away from the hindquarters. Shells stitched along the hem.
  for (let i = 0; i < 6; i++) {
    const a = 0.68 + (i * (TAU - 1.36)) / 5,
      c = Math.cos(a),
      s = Math.sin(a),
      lag = Math.sin(l.q - 0.85 + i * 0.4);
    const x = -5 + 19 * c,
      y = 30 * s,
      h = 6 + 2 * Math.sin(i * 3.8);
    const top = B.p(x - 3 * c, y - 4 * s, h + 3);
    const hem = B.p(x + 2 * c, y + 3 * s, h - 12 + 1.4 * lag);
    r.poly([top, B.p(x - 5 * s, y + 5 * c, h + 1), hem, B.p(x + 5 * s, y - 5 * c, h - 1)], moss);
    if (i % 2 === 0) {
      const M = B.at(x + 2 * c, y + 3 * s, h - 6).turn(a);
      r.ell(M, [0, 0, 0], [2.4, 3.4, 3.5], shell);
      r.line(M.p(2.1, -1.5, -0.7), M.p(2.35, 0.65, 1.6), shell.T[1], 0, 0.6);
    }
  }
  for (const s of [-1, 1]) {
    const e = B.at(-1, s * 27, 4);
    r.poly(
      [
        e.p(-12, 0, 11),
        e.p(9, -s * 4, 12),
        e.p(17, s * 3, 1),
        e.p(14, s * 11, -13),
        e.p(10, s * 9, -8),
        e.p(4, s * 15, -13),
        e.p(-2, s * 11, -5),
        e.p(-9, s * 8, -8),
      ],
      moss,
      0.4,
    );
    for (const [x, z] of [
      [9, -8],
      [3, -11],
    ]) {
      const shellFrame = e.at(x, s * (x === 9 ? 7 : 12), z).roll(-s * 0.4);
      r.ell(shellFrame, [0, 0, 0], [4.4, 3.4, 4.3], shell);
      r.line(shellFrame.p(1, s * 2.9, -2), shellFrame.p(-1, s * 3.2, 2.5), shell.T[0], 0, 1.2);
    }
  }
  const H = B.at(11, 0, 9)
    .turn(0.38 * l.look + lead * 0.7 + (A.neck ?? 0))
    .pitch(0.18 * l.sleep - 0.1 * l.look + (A.chin ?? 0));
  r.ell(H, [0, 0, 0], [17, 27, 13.4], skin);
  const throat = (A.throat ?? 0) + 0.18 * (1 + Math.sin(l.q));
  r.ell(
    H,
    [11, 0, -9 - jaw * 3],
    [9 + 5 * throat, 16.4 + 7 * throat, 6.2 + 9 * throat],
    gold ? shell : { T: tn('#53635b', '#839070', '#b4b784', '#d3c48f') },
  );
  r.ell(H, [9, 0, -2.9 - jaw * 2], [11, 24, 5.2 + jaw * 1.8], mouth);
  r.ell(H, [7.2, 0, 1.5], [15.5, 25.8, 8.2], skin);
  for (const s of [-1, 1]) {
    const E = H.at(6, s * 17, 7.7);
    r.ell(E, [0, 0, 0], [7.9, 6.4, 7.5], skin);
    r.ell(E, [5.2, s * 1.6, 2], [5.8, 5.2, 4.7], {
      T:
        phase > 0.55
          ? tn('#69414b', '#a36062', '#df9779', '#ffe092')
          : tn('#795a41', '#b18a4d', '#e7be61', '#f6da82'),
      pat: (q) => {
        if (l.blink) return skin.T[1];
        if (q[0] > 0.5 && q[2] > 0.29 && q[2] < 0.64 && Math.abs(q[1]) < 0.74) return mouth.T[0];
        if (q[0] > 0.48 && q[2] > 0.6 && q[2] < 0.84 && q[1] < -0.15 && q[1] > -0.48)
          return shell.T[3];
        return null;
      },
    });

    if (l.blink) r.ell(E, [4.5, s * 1.4, 1.5], [5, 4.8, 4.3], skin);
    r.cap(E.p(3, s * 4.7, 5.3), E.p(7, -s * 0.5, 7.2 - l.look * (s + 1)), 2.4, 1.6, moss);
    const seam = [H.p(15, s * 19, -2.4), H.p(12, s * 22.2, -1.4), H.p(4, s * 25, -0.3)];
    r.line(seam[0], seam[1], mouth.T[0], 0, 0.8);
    r.line(seam[1], seam[2], mouth.T[1], 0, 0.8);
    r.dot(H.p(18, s * 7, 6.6), skin.T[0], 0, 1, 1);
  }
  // A necklace of cowries on the stretched wattle, each showing its incised opening.
  for (const [y, z] of [
    [-13, -13],
    [-7, -15],
    [0, -16.5],
    [7, -15],
    [13, -13],
  ]) {
    const bead = H.at(14.7 - Math.abs(y) * 0.17, y, z);
    r.ell(bead, [0, 0, 0], [2.4, 2.8, 3.4], shell);
    r.line(bead.p(2.3, -0.4, -1.4), bead.p(2.3, 0.4, 1.3), shell.T[0], 0, 1);
  }
  r.eye = H.p(16.5, 20.1, 9.7);
  sockets.mouth = H.p(21, 0, -3.5 - jaw * 2);
  const tongue = A.tongue ?? 0;
  const tongueTarget = F.p(
    45 + (A.tongueReach ?? 0),
    -22 - (A.tongueReach ?? 0) * 0.6,
    A.keyRig ? 0 : 1,
  );
  if (A.keyRig) tongueTarget[1] = sockets.footL[1];
  const tip = vlerp(sockets.mouth, tongueTarget, Math.min(1, tongue));
  if (tongue > 0.025) {
    const joint = vlerp(sockets.mouth, tip, 0.52);
    joint[2] += 12 * Math.sin(Math.min(1, tongue) * Math.PI * 0.72);
    const flesh: Mat = { T: tn('#704452', '#ad6164', '#d98a83', '#efb291') };
    r.cap(sockets.mouth, joint, 2.7, 2.1, flesh);
    r.cap(joint, tip, 2.1, 3.6, flesh);
  }
  sockets.tongueTip = tip;
  // Root staff is planted outside the haunch. Fork, gills and the cap share its pivot.
  const staffLift = (A.staffLift ?? 0) + 12 * l.happy - 3 * l.tired + 2.6 * Math.max(0, l.walk);
  const S = F.at(7 + (A.staffReach ?? 0), 46 + (A.staffSide ?? 0), (A.keyRig ? 0 : 1) + staffLift)
    .roll(-0.37 + (A.staffAngle ?? 0) + 0.026 * Math.sin(l.q - 0.55))
    .pitch(A.staffPitch ?? 0);
  if (A.keyRig && side % 16 !== 0) {
    const weight = Math.min(1, 6 * Math.abs(Math.sin((side * Math.PI) / 16)));
    // In profile the long arm brings the stem toward the lens. The frog retains its physical grip.
    const angle = 0.38 * weight,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    const tilt = ([x, y, z]: V3): V3 => [x, cos * y + sin * z, cos * z - sin * y];
    S.f = tilt(S.f);
    S.s = tilt(S.s);
    S.u = tilt(S.u);
    const wrist = S.p(1, -2, 31),
      shoulder = B.p(4, 24, 1);
    const dx = wrist[0] - shoulder[0],
      dy = wrist[1] - shoulder[1];
    const reach = Math.hypot(dx, dy),
      pull = weight * Math.max(0, 1 - (anim === 'tech_staff' ? 15 : 27) / (reach || 1));
    S.o[0] -= dx * pull;
    S.o[1] -= dy * pull;
  }
  // Brace the root staff in the same strip of ground as the supporting hind foot.
  if (A.setStaff) S.o[1] += A.setStaff * (sockets.footR[1] - S.o[1]);
  const crook = [S.p(0, 0, 0), S.p(2, -2, 28), S.p(-2, -1, 53), S.p(-5, -2, 62), S.p(-6, -9, 71.3)];
  for (let i = 1; i < crook.length; i++)
    r.cap(crook[i - 1], crook[i], 2.5 - i * 0.22, 2.5 - i * 0.24, twig);
  r.cap(crook[2], S.p(1, 6, 60), 1.6, 0.35, twig);
  const fungus = S.at(-6, -9, 71.3).roll(-0.3).pitch(-0.36);
  r.ell(fungus, [0, 0, -2], [4.8, 4.9, 7.2], gill);
  r.ell(fungus, [0, 0, 0], [12 + phase * 3, 15 + phase * 3, 3.7], gill);
  for (const s of [-1, 1]) {
    r.line(fungus.p(0, 0, -2.5), fungus.p(4, s * 9, -1), gill.T[1], 0.25, 0.9);
    r.line(fungus.p(0, 0, -2.3), fungus.p(-5, s * 8, -1), gill.T[0], 0.2, 0.8);
  }
  r.ell(
    fungus,
    [0, 0, 0.8],
    [13 + phase * 3, 15 + phase * 3, 7.4 + phase * 1.5],
    cap,
    (q) => q[2] < -0.16,
  );
  const honey: Mat = { T: tn('#806044', '#ac7f49', '#d8ab5c', '#f7dc81'), glow: 0.46 };
  const throatRing: Mat = { T: tn('#343b39', '#414840', '#655a43', '#8c7756') };
  // The amber gills hang below the outer brim, with dark dividers between each warm blade.
  r.ell(fungus, [0, 0, -8.4], [4.5, 4.6, 1.65], throatRing);
  for (let j = 0; j < 5; j++) {
    const a = -1.12 + j * 0.48,
      b = a + 0.32;
    const outer = fungus.p(Math.cos(a) * 12, Math.sin(a) * 13, -0.3);
    const lip = fungus.p(Math.cos(b) * 11.5, Math.sin(b) * 12.5, -1.6);
    const root = fungus.p(Math.cos(a) * 4.6, Math.sin(a) * 4.6, -8.4);
    r.poly([outer, lip, root], honey, 0.4);
    r.cap(root, fungus.p(Math.cos(a) * 11.6, Math.sin(a) * 12.6, -2.1), 0.5, 0.75, throatRing);
  }
  r.ell(fungus, [9, 5, -3.2], [1.15, 1.0, 2.2], honey);
  for (const z of [-1, -0.2]) r.line(fungus.p(7, 8, z), fungus.p(9.4, 4, z), gill.T[1], 0.3, 1.1);
  for (const [x, y, z] of [
    [-6, -6, 6.7],
    [1, 4, 8],
    [6, -3, 6.8],
  ])
    r.dot(fungus.p(x, y, z), gill.T[2], 0.4, 1, 0.8);
  sockets.staffTip = fungus.p(0, 0, 7.4 + phase);
  sockets.staffFoot = crook[0];
  for (const s of [-1, 1]) {
    const shoulder = B.p(4, s * 24, 1),
      elbow = B.p(8, s * 35, -7);
    const hand = s > 0 ? S.p(1, -2, 31) : F.p(23, s * 24, 8 - drop * 0.22);
    if (s > 0) sockets.staffHand = hand;
    r.cap(shoulder, elbow, 5.8, 4.6, skin);
    r.cap(elbow, hand, 4.4, 3.1, skin);
    r.ball(hand, 3.5, skin);
    for (const [i, k] of [-1, 1].entries()) {
      const end =
        s > 0 ? S.p(3.5, -0.5, 31 + k * 2) : F.p(29 + k * 2, s * (24 + i * 3), 5 - drop * 0.17);
      r.cap(hand, end, 1.6, 1.2, skin);
    }
  }
  if (phase > 0.025)
    for (const [x, y, h] of [
      [-12, -17, 19],
      [-19, 0, 18],
      [-7, 11, 22],
      [1, -22, 17],
      [-17, 15, 17],
    ]) {
      const M = B.at(x, y, h - 3).scale(phase);
      r.ell(M, [0, 0, 5], [1.5, 1.5, 6], gill);
      r.ell(M, [0, 0, 10], [4.6, 4.4, 2.5], gill, (q) => q[2] < -0.24);
    }
  // The cloak carries cowries, knots and a stitched repair on its outer shoulder.
  const patch = B.at(-4, 26, 7).turn(-0.22);
  r.poly([patch.p(-5, -2, 2), patch.p(4, -2, 3), patch.p(4, 1, -5), patch.p(-4, 1, -6)], moss);
  for (let j = 0; j < 4; j++)
    r.line(patch.p(-4 + j * 2, 1, -3), patch.p(-3 + j * 2, 1, -5), shell.T[1], 0, 0.7);
  for (const s of [-1, 1]) {
    r.ell(H, [0, s * 23, 1.5], [3.6, 2.8, 2.1], moss);
    for (let j = 0; j < 3; j++)
      r.ball(H.p(2 + j * 2.4, s * (24 - j * 0.25), 2.6 + j * 0.3), 1.2 - j * 0.18, skin);
    r.line(H.p(15, s * 17, -2), H.p(19, s * 11, -2.8), shell.T[1], 0, 0.95);
    r.cap(H.p(13, s * 8, -13), H.p(15, s * 2, -15), 1.1, 0.5, skin);
    const lichen = B.at(-10, s * 18, 14);
    for (let j = 0; j < 3; j++) {
      r.cap(
        lichen.p(j * 2, 0, 0),
        lichen.p(-2 + j * 1.5, s * (1 + j), 4 + 0.7 * j),
        1.35,
        0.25,
        moss,
      );
      r.dot(lichen.p(-2 + j * 1.5, s * (1 + j), 4 + 0.7 * j), cap.T[2]);
    }
    r.line(solePoint(s, 8), solePoint(s, 11), skin.T[1], 0, 0.7);
  }
  function solePoint(s: number, x: number) {
    return F.p(7 + x, s * (31 + x * 0.17), 3);
  }
  for (let j = 0; j < 4; j++)
    r.cap(S.p(1, -2, 26 + j * 2), S.p(2, -1, 26 + j * 2), 2.8, 2.5, j === 3 ? shell : twig);
  r.line(S.p(1, 1, 49), S.p(-1, 1, 60), twig.T[0], 0, 0.8);
  r.dot(S.p(1, 1, 6), shell.T[2]);
  r.ell(fungus, [6, 7, -1], [1.15, 1.05, 2.5], gill);
  for (let j = 0; j < 5; j++) {
    const a = -1.15 + j * 0.56;
    r.line(
      fungus.p(Math.cos(a) * 3, Math.sin(a) * 3, -2.7),
      fungus.p(Math.cos(a) * 11, Math.sin(a) * 11, -1.2),
      gill.T[1],
      0.2,
      0.8,
    );
  }
  finishSurfaces(
    r,
    F,
    [
      [skin, 'skin'],
      [moss, 'moss'],
      [mouth, 'wattle'],
      [shell, 'shell'],
      [twig, 'root'],
      [cap, 'cap'],
      [gill, 'gill'],
      [honey, 'gill'],
      [throatRing, 'bamboo'],
    ],
    'wattle',
  );
  scaleFigure(r, sockets, scale, 1.42);
  const fr = projectFigure(r, 160, [84, 115], sockets, '#202d37');
  fr.planted = planted;
  fr.dx = A.travel ?? 0;
  fr.dy = (A.approach ?? 0) - jump - l.pop * 11;
  return fr;
}
const creature: Creature = {
  id: 'toad_shaman',
  rarity: 'legendary',
  theme: 'mushroom_grotto',
  animations: {
    ...everyday,
    'idle-f2': { seconds: 3, loop: true },
    away: { seconds: 1.5 },
    back: { seconds: 1.5 },
    ...animations,
  },
  props,
  effects,
  frame: (anim, t, side, variant, motion) =>
    motion?.techniquePose
      ? bodyFrame(anim, t, side, variant, { ...motion.techniquePose, keyRig: 1 }, motion.headSide)
      : Object.assign(
          bodyFrame(anim, t, side, variant, pose(anim, t), motion?.headSide),
          presentation(anim, t),
        ),
};
export default attachMotion(withTechniques(creature, keys), route);
