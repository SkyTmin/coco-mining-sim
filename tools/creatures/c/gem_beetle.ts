// Six articulated feet support the pair of cut stones. The hinge and crystal facets share a frame.
import { F3, Rig, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU, ik } from '../kit/f11-mobkit';
import { everyday, life, projectFigure, scaleFigure } from '../rig/figure';
import plan from './gem_beetle-life';
import { withTechniques } from '../technique';
import keys from './gem_beetle-keys';
import { strideFoot } from '../motion';
import { ramp, localPoint } from './engraving';
import { facet, armouredHead, etchedMetal, hingeClips } from './beetle-cut';
import { animations, pose, effects, props } from './gem_beetle-actions';
import type { Creature, Variant } from '../types';

export interface BeetlePose {
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
  pitch?: number;
  roll?: number;
  yaw?: number;
  lift?: number;
  head?: number;
  coil?: number;
  flare?: number;
  reach?: number;
  squint?: number;
  glow?: number;
  wing?: number;
  ghost?: number;
}
export function buildFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  a: BeetlePose = {},
  headLead = 0,
) {
  const r = new Rig(),
    g = variant === 'gold',
    l = life(anim, t, 0.7);
  const brass: Mat = {
    T: tn('#4c3838', '#9b683a', '#d09d52', '#ffe39b'),
    spec: true,
  };
  const joint: Mat = {
    ...brass,
    pat: ([u], v) => (u > 0.75 && u < 0.85 ? brass.T[v > 0.5 ? 1 : 0] : null),
  };
  const steel: Mat = { T: tn('#262940', '#374857', '#5a737f', '#b3c2b2') };
  const gem: Mat = {
    T: g
      ? tn('#694051', '#a36c36', '#db9a48', '#ffe29b')
      : tn('#26375c', '#325b83', '#4696b4', '#94e2e2'),
    spec: true,
  };
  const light: Mat = {
    T: g
      ? tn('#825447', '#be8141', '#edb654', '#ffedac')
      : tn('#344775', '#42779f', '#5fb6c7', '#ccf7e4'),
  };
  const shade: Mat = {
    T: g
      ? tn('#633748', '#855233', '#b5804d', '#e3ba73')
      : tn('#233255', '#324978', '#4079a0', '#70b0ce'),
  };
  const core: Mat = {
    T: tn('#354c71', '#487b9c', '#78c7d0', '#d1fbef'),
    glow: 0.15 + (a.glow ?? 0) * 0.35,
  };
  const scale = 1.18,
    planted: string[] = [];
  const plate: Mat = {
    T: g
      ? tn('#514048', '#815645', '#aa875d', '#dbb483')
      : tn('#293444', '#3d535d', '#66868c', '#b3c9bd'),
  };
  const quartz: Mat = {
    T: g
      ? tn('#53414a', '#947445', '#d1ba69', '#fff0c2')
      : tn('#3f5f80', '#598daa', '#8ec1d2', '#eff4d7'),
  };
  core.pat = ([t, x, y], l) =>
    ramp(
      core,
      l,
      1.2 * Math.cos(x * 4 + y * 2) + 0.7 * Math.sin(23 * t),
      t * 25,
      x * 4,
    );
  const legMetal = etchedMetal(brass);
  const ground = F3.yaw(
    0.5 + (side * TAU) / 16 + (a.yaw ?? 0) + 0.22 * l.look,
  ).scale(1.04);
  const b = ground
    .at(
      -1,
      0,
      17 +
        (a.lift ?? 0) +
        Math.sin(l.q) * 0.55 -
        5 * l.sleep -
        3 * l.tired +
        5 * l.pop,
    )
    .pitch(a.pitch ?? 0)
    .roll((a.roll ?? 0) + 0.03 * Math.sin(l.q));
  const sockets: Record<string, V3> = {};
  const fold = Math.max(l.sleep * 0.46, l.hatch * 0.95, a.coil ?? 0);
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      r.tag = (s < 0 ? 'legL' : 'legR') + i;
      const f = 11 - 12 * i,
        phase = l.q + ((s > 0 ? i : i + 1) % 2) * Math.PI;
      const gait = strideFoot(
        t,
        ((s > 0 ? i : i + 1) % 2) * 0.5,
        plan.stride / (scale * 1.04),
      );
      const swing = anim === 'walk' ? Math.max(0, Math.sin(phase)) : 0;
      const stride = swing * Math.cos(phase) * 2;
      const tap =
        anim === 'idle' && i === 0 && s === 1
          ? Math.max(0, Math.sin(l.q - 1.1)) ** 5
          : 0;
      const hip = b.p(f, s * 6, -1);
      // The far tripod reaches around the shell; its two outer toes break the silhouette.
      const spread = s < 0 ? 8 : 0,
        offset = (1 - i) * (s < 0 ? 10 : 5) + 4 * stride;
      let toe = b.p(
        f + offset,
        s * (17.8 + spread + 3.2 * (i % 2) - 6 * fold),
        -15 + 3 * fold + 4 * swing + tap * 2.8 + 3 * l.sleep,
      );
      if (anim === 'walk')
        toe = ground.p(
          -1 + f + (1 - i) * (s < 0 ? 10 : 5) + gait.forward,
          s * (17.8 + spread + 3.2 * (i % 2)),
          1.6 + 4.8 * gait.lift,
        );
      const knee = ik(
        hip,
        toe,
        12.6 + spread * 0.35,
        13.3 + spread * 0.35,
        b.v((1 - i) * 0.8, s, 1.4),
      );
      r.cap(hip, knee, 3.2, 2.7, joint);
      r.cap(knee, toe, 2.65, 1.15, legMetal);
      const ring = F3.yaw(0.5 + (side * TAU) / 16, knee);
      r.ell(ring, [0, s * 0.6, 0.15], [2.2, 2.1, 1.8], plate);
      r.dot(ring.p(0.35, s * 2.15, 0.2), brass.T[3], 0, 1.2, 1.4);
      const edge = ring.p(-2.4, s * 2.6, -3);
      if (i === 0) r.cap(knee, edge, 1.35, 0.15, legMetal);
      if (i === 1)
        for (const offset of [-1, 0, 1])
          r.line(
            toe,
            [toe[0] + offset + 1, toe[1] + 1.6 * s, toe[2] - 1.1],
            brass.T[1],
            0,
            0.7,
          );
      const footName = (s < 0 ? 'left' : 'right') + i;
      sockets[footName] = toe;
      if (anim === 'walk' && gait.planted) planted.push(footName);
      let claw = b.p(
        f + offset + 2.5,
        s * (19.6 + spread + 3.2 * (i % 2) - 6 * fold),
        -15.6 + 3 * fold + 4 * swing + tap * 2.8 + 3 * l.sleep,
      );
      if (anim === 'walk')
        claw = ground.p(
          1.5 + f + (1 - i) * (s < 0 ? 10 : 5) + gait.forward,
          s * (19.6 + spread + 3.2 * (i % 2)),
          1 + 4.8 * gait.lift,
        );
      if (i !== 1 || s === 1) r.line(toe, claw, brass.T[2], 0, 0.7);
      if (s === 1 && i === 0) sockets.foot = toe;
    }
  steel.pat = ([x, y, z], l) =>
    ramp(
      steel,
      l,
      1.35 * Math.cos(19 * x + 1.7 * z) + 0.54 * Math.sin(6 * y + 9 * z),
      x * 25,
      z * 11,
    );
  r.tag = 'thorax';
  r.ell(b, [-5, 0, 0], [21, 13, 9], steel);
  r.tag = 'abdomen';
  for (let i = 0; i < 4; i++)
    r.ell(b, [-17 + i * 6, 0, -1.8], [3.85, 13.1, 5.4], {
      ...plate,
      pat: ([x, y, z], l) =>
        ramp(
          plate,
          l,
          1.1 * Math.cos(8 * x) + 0.55 * Math.cos(6 * z + 3 * y),
          x * 6,
          z * 8,
        ),
    });
  const h = b
    .at(12, 0, 0)
    .turn(0.59 * l.look + headLead)
    .pitch(
      (a.head ?? 0) + 0.36 * l.sleep + 0.19 * l.tired - 0.13 * Math.sin(l.q),
    );
  const helmet: Mat = {
    T: g
      ? tn('#45313b', '#614536', '#a17d53', '#e6c291')
      : tn('#22283d', '#353c50', '#536275', '#9bb0ad'),
    pat: ([x, y, z], v) =>
      z > 0.25 &&
      x > 0.38 &&
      Math.abs(y) > 0.35 &&
      Math.abs(x + y * y - 1) < 0.12
        ? brass.T[v > 0.4 ? 2 : 1]
        : ramp(
            plate,
            v,
            0.78 * Math.cos(17 * x + 3 * z) + 0.7 * Math.sin(13 * z + 2 * y),
            x * 12,
            z * 9,
          ),
  };
  r.tag = 'head';
  r.ell(h, [3, 0, 0], [10, 9.7, 7.4], helmet);
  const reach = a.reach ?? 0;
  const root = h.p(8.7, 0, 1),
    bend = h.p(20 + reach, 0, 4),
    tip = h.p(17.8 + reach, 0, 20.6);
  r.tag = 'horn';
  r.cap(root, bend, 4.8, 3.7, gem);
  r.cap(bend, tip, 4.2, 0.35, core);
  r.cap(h.p(19.7 + reach, 0, 10.5), h.p(24.1 + reach, 0, 15.3), 2.9, 0.3, core);
  sockets.horn = tip;
  r.cap(h.p(12, 0, 1.8), h.p(14.3, 0, 2.3), 4.3, 4.15, legMetal);
  r.line(
    h.p(18.9 + reach, 1.9, 12),
    h.p(19.8 + reach, 0.5, 13.2),
    plate.T[0],
    0,
    1.2,
  );
  for (const s of [-1, 1]) {
    armouredHead(r, h, s, legMetal, steel, core, Boolean(l.blink));
    r.tag = s > 0 ? 'eyeR' : 'eyeL';
    const eye = h.p(6, s * 9.9, 3);
    r.line(
      eye,
      h.p(10, s * 7, 3.2),
      hx(l.blink ? '#43415a' : '#ffd37f'),
      l.blink ? 0 : 0.4,
      1.4,
    );
    if (s === 1) r.eye = eye;
    r.tag = s > 0 ? 'wingR' : 'wingL';
    const opening = (a.wing ?? 0) + l.happy * 0.78 + l.pop * 0.7;
    // Open from the shoulder hinge: the trailing tips fan apart and expose the steel abdomen.
    const w = b
      .at(6, s * (0.5 + 7.6 * opening), 2 + 4 * opening)
      .turn(-s * 0.46 * opening)
      .roll(s * (0.04 * Math.sin(l.q - 0.3) - 0.46 * opening))
      .at(-6, 0, 0);
    const p = (x: number, y: number, z: number) => w.p(x, s * y, z);
    const nose = p(11, 1.0, 4.0),
      rump = p(-28, 0.5, 1.3),
      outer = p(-10, 15, 2.0);
    const back = p(-16, 5.1, 13),
      shoulder = p(2, 5.8, 14),
      lip = p(6.5, 12.4, 6),
      hip = p(-22, 10, 6);
    r.poly([nose, shoulder, back, rump], facet(w, s, shade, quartz, steel, 0));
    r.poly([nose, lip, shoulder], facet(w, s, gem, quartz, shade, 0));
    const glint = Math.sin(l.q + s * 0.3);
    // Interior inclusions and a moving reflection sit beneath the polished upper cut.
    const cut = (m: Mat) => facet(w, s, m, quartz, shade, glint);
    r.poly([shoulder, lip, outer], cut(gem));
    r.poly([shoulder, outer, back], cut(light));
    r.poly([back, outer, hip, rump], cut(shade));
    r.poly([nose, p(11, 9, -1), outer, lip], cut(shade));
    r.poly([hip, outer, p(-15, 12, -2), rump], cut(shade));
    const membrane: Mat = {
      ...steel,
      pat: (P, l) => {
        const [x, y] = localPoint(w, P);
        return ramp(steel, l, 0.7 * Math.sin(x * 0.6 + y * 1.7), x, y);
      },
    };
    r.poly([p(7, 1, 3), p(-23, 1, 0.5), p(-11, 10, 1)], membrane, -0.3);
    hingeClips(r, w, s, legMetal, plate);
    r.line(back, shoulder, glint > 0.3 ? core.T[3] : light.T[2], 0.13, 0.8);
    sockets[s === 1 ? 'rightWing' : 'leftWing'] = anim === 'tech_prism' ? outer : shoulder;
  }
  scaleFigure(r, sockets, scale, 1.56);
  const frame = projectFigure(r, 96, [46, 72], sockets, '#1e2437');
  return {
    ...frame,
    planted,
    dx: a.dx,
    dy: a.dy,
    sx: a.sx,
    sy: a.sy,
    ghost: a.ghost ? { dx: -4, dy: 0, alpha: a.ghost } : undefined,
  };
}
const creature: Creature = {
  id: 'gem_beetle',
  theme: 'crystal_grotto',
  rarity: 'uncommon',
  animations: { ...everyday, ...animations },
  effects,
  props,
  frame: (anim, t, side, variant, steer) =>
    buildFrame(
      anim,
      t,
      side,
      variant,
      steer?.techniquePose ?? pose(anim, t),
      steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0,
    ),
};
export default withTechniques(creature, keys);
