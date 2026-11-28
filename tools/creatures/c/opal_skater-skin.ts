import type { CreatureCard } from '../bodies/card-data';
import { hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { F3, Rig, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import type { Creature } from '../types';
import { clamp, score } from './opal_skater-keys';
import { runner, runnerTip } from './opal_skater-runner';
import { finishSurfaces } from './surface-work';

type Paints = Record<string, Mat>;
type Points = Record<string, V3>;

function pigments(card: CreatureCard, gold: boolean): Paints {
  const honey = ['#735368', '#ac7770', '#e1b682', '#ffe0ac'].map((x) => hx(x));
  const m: Paints = Object.fromEntries(
    card.materials.map(({ name, tones }) => [
      name,
      {
        T: [tones[0], tones[1], tones[3], tones[4]].map((s, i) =>
          gold && (name === 'lagoon' || name === 'tide') ? mixc(hx(s), honey[i], 0.86) : hx(s),
        ) as Tones,
      },
    ]),
  );
  for (const name of ['lagoon', 'ivory', 'ink', 'amber']) {
    const mat = m[name],
      ramp = Array.from({ length: 25 }, (_, i) => {
        const k = Math.min(2, Math.floor(i / 8));
        return mixc(mat.T[k], mat.T[k + 1], i / 8 - k);
      });
    mat.pat = (q, lit) => {
      const nap = Math.cos(18 * q[1] + 3 * Math.sin(9 * q[2])) * Math.sin(18 * q[2] - 5 * q[0]);
      return ramp[Math.round(24 * clamp(0.42 + lit * 0.62 + nap * (name === 'lagoon' ? 0.072 : 0.037)))];
    };
  }
  return m;
}
function fans(r: Rig, h: F3, opening: number, m: Paints, pts: Points) {
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'fanL' : 'fanR';
    const f = h.at(-3.6, s * 6.6, 3.9).roll(s * (0.08 + opening * 0.24));
    const spread = Math.max(0.17, 1 + opening * 0.46);
    // Five scallops share a membrane. Each sector has a convex face and a darker reverse.
    function surface(u: number, v: number, front: number) {
      const theta = 0.53 + (u - 0.5) * 1.48 * spread;
      const scallop = 0.81 + 0.19 * Math.sin(Math.PI * ((u * 5) % 1));
      const len = v * (10.9 + 3.4 * Math.sin(u * Math.PI)) * scallop;
      return f.p(
        -0.26 * len + front * (0.25 + 0.9 * Math.sin(v * Math.PI)) + 0.95 * Math.cos(10 * Math.PI * u) * v,
        s * len * Math.sin(theta),
        len * Math.cos(theta),
      );
    }
    for (let i = 0; i < 20; i++) {
      const a = i / 20,
        b = (i + 1) / 20;
      for (const front of [-1, 1]) {
        const inner = 0.47,
          pigment = front < 0 ? m.tide : m.coral;
        r.poly(
          [surface(a, 0, front), surface(a, inner, front), surface(b, inner, front)],
          front < 0 ? m.lagoon : m.opal,
        );
        r.poly(
          [
            surface(a, inner, front),
            surface(a, 0.85, front),
            surface(b, 0.85, front),
            surface(b, inner, front),
          ],
          pigment,
        );
        r.poly(
          [surface(a, 0.85, front), surface(a, 1, front), surface(b, 1, front), surface(b, 0.85, front)],
          m.opal,
        );
      }
      r.cap(surface(a, 1, 0), surface(b, 1, 0), 0.55, 0.55, m.ivory);
    }
    for (let j = 0; j < 5; j++) {
      const mid = (j + 0.5) / 5,
        joint = surface(mid, 0.5, 1);
      r.cap(surface(mid, 0, 1), joint, 0.66, 0.46, m.opal);
      r.cap(joint, surface(mid, 0.94, 1), 0.46, 0.26, m.ivory);
      r.ball(surface(mid, 0.98, 1), 0.52, m.ivory);
    }
    r.ell(f, [0.65, s * 0.35, 1.1], [1.9, 2.4, 2.35], m.tide);
    r.ell(f, [2.05, s * 0.5, 1.4], [0.8, 1.22, 1.36], m.opal);
    pts[r.tag] = surface(0.5, 1, 0);
  }
}
function coat(r: Rig, b: F3, m: Paints, pts: Points, wag: number) {
  r.tag = 'body';
  r.ell(b, [-0.9, 0, 0], [8.6, 9.65, 10.9], m.lagoon);
  r.tag = 'belly';
  r.ell(b, [3.1, 0, -0.6], [5.65, 7.5, 8.25], m.ivory);
  for (const s of [-1, 1])
    for (let j = 0; j < 6; j++) {
      const a = 1.08 + j * 0.29;
      const spot = b.at(-0.9 + 8.2 * Math.cos(a), s * 9.15 * Math.sin(a), 1.8 - (j % 2) * 1.1).turn(s * a);
      r.ell(spot, [0, 0, 0], [0.68, 0.77, 1.36 - (j % 2) * 0.3], j % 3 === 0 ? m.opal : m.tide);
    }
  r.tag = 'tail';
  const t = b
    .at(-6.3, 0, -1.5)
    .turn(0.38 * wag)
    .pitch(-0.18);
  const knots: V3[] = [
    [0, 0, 0],
    [-4.1, 0, -0.45],
    [-7.7, 0, 0.55],
    [-10.8, 0, 3 + 0.8 * wag],
  ];
  for (let i = 1; i < knots.length; i++)
    r.cap(t.p(...knots[i - 1]), t.p(...knots[i]), 3.9 - i * 0.53, 3.4 - i * 0.57, m.lagoon);
  const tip = t
    .at(...knots[3])
    .turn(-0.26 * wag)
    .pitch(0.38);
  r.tag = 'tailTip';
  for (const s of [-1, 0, 1]) {
    const leaf = tip.turn(s * 0.33);
    r.ell(leaf, [-2.5, s * 0.5, 0], [4.25 - Math.abs(s) * 0.65, 1.65, 1.34], s === 0 ? m.opal : m.tide);
    r.cap(leaf.p(-0.8, s * 0.5, 0.9), leaf.p(-4.8, s * 0.5, 0.6), 0.49, 0.22, m.ivory);
  }
  pts.tailTip = tip.p(-6.3, 0, 0);
}
function face(r: Rig, h: F3, p: JointPose, m: Paints, pts: Points) {
  r.tag = 'head';
  r.ell(h, [0, 0, 0], [9.25, 11.1, 9.75], m.lagoon);
  pts.head = h.o;
  // A pale central teardrop and two smaller droplets run towards the brow.
  for (const s of [-1, 0, 1]) {
    const a = h.at(2.9, s * 2.4, 8.85 - Math.abs(s) * 0.36).pitch(0.29);
    r.ell(a, [0, 0, 0], [2.5 - Math.abs(s) * 0.6, 0.83, 0.53], m.opal);
  }
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R',
      cheek = h.at(6.55, s * 5.25, -2.4).turn(s * 0.53);
    r.tag = 'head';
    r.ell(cheek, [0, 0, 0], [2.75, 4.45, 3.35], m.ivory);
    r.ell(cheek, [1.52, s * 2.15, 0.18], [1.05, 2.05, 0.88], m.coral);
    for (let i = 0; i < 3; i++)
      r.dot(
        cheek.p(2.05 + (i % 2) * 0.15, s * (1.8 + i * 0.68), 0.55 - (i % 2) * 0.45),
        m.ivory.T[3],
        0,
        1,
      );
    const eye = h.at(7.25, s * 5.65, 2.05).turn(s * 0.68);
    const eyelid = clamp(p.lids ?? 0),
      openness = 1 - eyelid;
    r.tag = 'eye' + k;
    const first = r.size;
    if (openness > 0.14) {
      const e = eye.at(0, 0, 0.18 * eyelid);
      r.ell(e, [0, 0, 0], [1.67, 2.45, 3.35 * openness], m.ink);
      r.ell(e, [1.02, 0, -0.16 * openness], [1.05, 1.85, 2.58 * openness], m.amber);
      const aim = (p.gaze ?? 0) * 0.43;
      r.ell(e, [1.54, aim, 0.26 * openness], [0.93, 1.51, 2.13 * openness], m.ink);
      r.ball(e.p(2.22, aim - 0.55, 1.23 * openness), 0.66 * openness, m.ivory);
      if (openness > 0.72) r.dot(e.p(2.22, aim + 0.65, -0.77), m.ivory.T[3], 0, 1);
    } else {
      r.cap(eye.p(1.48, -1.9, 0.16), eye.p(1.62, 0, -0.25), 0.39, 0.43, m.ink);
      r.cap(eye.p(1.62, 0, -0.25), eye.p(1.46, 1.9, 0.18), 0.42, 0.31, m.ink);
    }
    pts[r.tag] = eye.p(1.7, 0, 0);
    r.markEye(first, s, openness > 0.25);
    r.tag = 'head';
    r.ell(eye, [0.03, 0, 4.37], [0.82, 2.03, 0.6], m.opal);
  }
  const snout = h.at(8.25, 0, -2.65);
  r.ell(snout, [0, 0, 0], [2.25, 3.35, 2.0], m.ivory);
  r.tag = 'nose';
  r.ell(snout, [1.91, 0, 0.8], [0.8, 1.35, 0.8], m.ink);
  pts.nose = snout.p(2.65, 0, 1);
  r.dot(snout.p(2.52, -0.34, 1.15), m.opal.T[3], 0, 1);
  r.tag = 'mouth';
  const mouth = snout.at(1.98, 0, -0.64),
    smile = p.smile ?? 0,
    yawn = p.yawn ?? 0;
  if (yawn > 0.2) r.ell(mouth, [0, 0, -0.48], [0.42, 0.76 + yawn, 1.42 * yawn], m.ink);
  if (yawn <= 0.2)
    for (const s of [-1, 1])
      r.cap(mouth.o, mouth.p(-0.29, s * (1.37 + 0.42 * smile), 0.2 + 0.61 * smile), 0.27, 0.22, m.ink);
  pts.mouth = mouth.o;
  r.eye = pts.eyeR;
}
function limbs(
  r: Rig,
  f: F3,
  b: F3,
  p: JointPose,
  m: Paints,
  pts: Points,
  gait: number | undefined,
  stride: number,
  stroke: number,
  kick: number,
  pivot: number | undefined,
) {
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R';
    // Fixed short upper and lower flipper: the shoulder hinge supplies the sweep.
    const shoulder = b.at(0.8, s * 7.5, 2.1);
    const arm = shoulder
      .roll(-s * (0.36 + 0.94 * (p.hands ?? 0) + 0.13 * s * stroke))
      .pitch(0.16 + s * (gait === undefined ? 0.09 * stroke : 0.24 * Math.sin(TAU * gait)));
    r.tag = 'hand' + k;
    r.cap(arm.p(0, 0, 0), arm.p(0, s * 0.38, -3.3), 2.65, 2.35, m.lagoon);
    r.ell(arm, [0.42, s * 0.43, -4.8], [2.09, 2.65, 3.03], m.lagoon);
    r.ell(arm, [1.72, s * 0.48, -5.4], [0.91, 1.65, 1.76], m.ivory);
    for (const j of [-1, 0, 1])
      r.ball(arm.p(1.38, s * (0.5 + j * 0.84), -6.8 + 0.36 * Math.abs(j)), 0.53, m.opal);
    pts[r.tag] = arm.p(0.5, s * 0.45, -7.5);
    const boot = runner(f, s, p, stride, stroke, kick, gait, pivot);
    r.tag = 'leg' + k;
    r.cap(b.p(-0.4, s * 5.55, -4.7), boot.p(0, 0, 1.4), 2.95, 2.55, m.tide);
    r.tag = 'foot' + k;
    r.ell(boot, [0.65, 0, 1.48], [4.35, 2.95, 2.2], m.lagoon);
    for (const j of [-1, 0, 1])
      r.ell(boot, [3.25 - 0.38 * Math.abs(j), j * 1.16, 1.28], [1.57, 0.99, 1.04], m.ivory);
    // The pearl grows from the sole. The underside is straight, with a rounded, raised toe.
    for (const mount of [-2.3, 2.6]) r.ell(boot, [mount, 0, -0.25], [0.82, 1.24, 1.14], m.tide);
    r.ell(boot, [0.25, 0, -0.84], [5.77, 1.37, 0.71], m.opal);
    r.cap(boot.p(-4.7, 0, -0.99), boot.p(4.15, 0, -0.99), 0.55, 0.55, m.ivory);
    r.cap(boot.p(4.15, 0, -0.99), boot.p(6.85, 0, -0.53), 0.58, 0.53, m.opal);
    r.cap(boot.p(6.85, 0, -0.53), boot.p(runnerTip - 0.17, 0, 0.26), 0.54, 0.26, m.ivory);
    pts['foot' + k] = boot.p(0, 0, -1.58);
    pts['toe' + k] = boot.p(runnerTip, 0, 0.26);
  }
}
export function skater(card: CreatureCard): Creature['frame'] {
  const colors = { normal: pigments(card, false), gold: pigments(card, true) };
  const scale = card.proportions.scale ?? 2;
  return (anim, t, side, variant, motion) => {
    const { p, alt, kick, stroke } = score(anim, t);
    const gait = anim === 'walk' ? (motion?.gaitPhase ?? t) : undefined;
    const sway = gait === undefined ? stroke : Math.sin(gait * TAU);
    const pivot = anim === 'turn' && Number.isInteger(side) ? (4 * t) % 1 : undefined;
    const f = F3.yaw(card.life.yaw + ((side + (pivot ?? 0)) * Math.PI) / 8 + (p.yaw ?? 0));
    const low = p.low ?? 0,
      bank = (p.bank ?? 0) + sway * 0.07;
    const b = f
      .at(
        0.1 + 1.25 * low,
        (p.weight ?? 0) * 1.2 + sway * 0.45,
        12.4 - 4.9 * low + (p.breath ?? 0) + 0.32 * Math.abs(sway),
      )
      .roll(bank)
      .turn(p.front ?? 0)
      .pitch(0.1 * low + (p.bow ?? 0));
    const h = b
      .at(0.56 + 0.56 * low, 0, 12.45 - 1.7 * (p.tuck ?? 0))
      .turn(0.17 + (p.head ?? 0))
      .pitch(-0.15 + (p.nod ?? 0))
      .roll(-0.16 * bank);
    const r = new Rig(),
      m = colors[variant],
      pts: Points = { floor: [0, 0, 0], root: b.o };
    r.innerInk = hx('#475a70');
    coat(
      r,
      b,
      m,
      pts,
      0.5 * Math.sin((t * TAU) / (anim === 'walk' ? 1 : 3)) * (anim === 'sleep' ? 0.18 : 0.56) +
        sway * 0.66,
    );
    limbs(r, f, b, p, m, pts, gait, card.life.stride / scale, stroke, kick, pivot);
    fans(r, h, (p.fan ?? 0) - sway * 0.12, m, pts);
    face(r, h, p, m, pts);
    finishSurfaces(
      r,
      f,
      [
        [m.opal, 'ivory'],
        [m.tide, 'ice'],
        [m.coral, 'ivory'],
      ],
      'ivory',
    );
    scaleFigure(r, pts, scale);
    const frame = projectFigure(r, 96, [48, 78], pts, '#394b60', 3.65, true);
    frame.dy = -alt;
    const outsideEdge = anim === 'hatch' ? Math.max(0, -f.f[1]) * (p.hands ?? 0) : 0;
    frame.groundShadow = {
      radius: 12.8 + 4.8 * outsideEdge,
      opacity: 0.34 + 0.52 * outsideEdge - 0.1 * clamp(alt / 10),
    };
    if (gait !== undefined) frame.planted = [strideFoot(gait, 0, 1).planted ? 'footR' : 'footL'];
    return frame;
  };
}
