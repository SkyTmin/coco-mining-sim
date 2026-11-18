import { projectFigure } from '../rig/figure';
import { animations as actions, effects, pose } from './crater_titan-actions';
import { F3, Rig, renderRig, vlerp, type Mat, type V3 } from '../rig/f15-rig';
import { hx, ik, TAU, tn } from '../kit/f11-mobkit';
import type { BodyFrame, Creature, Variant, XY } from '../types';

const anchor: XY = [72, 109];
const controls = {
  vent: 0,
  arm: 0,
  tip: 0,
  sweep: 0,
  foot: 0,
  crouch: 0,
  phase: 0,
  twist: 0,
  glance: 0,
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  rot: 0,
  flash: 0,
  trail: 0,
};
type Controls = typeof controls;
const lip = tn('#251d2c', '#493641', '#796059', '#ab8a73');
const basalt = tn('#252333', '#484353', '#696371', '#9f9289');
const strata = tn('#27232c', '#47414c', '#796b72', '#b49a88');
const clinker = tn('#271724', '#652f2b', '#ba5635', '#ef9953');
const igneous = tn('#823b30', '#c9623a', '#f29c55', '#ffe39c');
const deepSeam = hx('#dc713c');
const brightSeam = hx('#ffba64');
const copper = tn('#213731', '#624539', '#9e6842', '#c19059');
const gold = tn('#38313a', '#735039', '#b88245', '#e5b360');

function strataRock(F: F3, golden: boolean, lighter = false, phase = 0): Mat {
  const T = golden ? (lighter ? gold : copper) : lighter ? strata : basalt;
  return {
    T,
    pat(world, light) {
      const z = world[2] - F.o[2];
      const x = (world[0] - F.o[0]) * F.f[0] + (world[1] - F.o[1]) * F.f[1];
      const y = (world[0] - F.o[0]) * F.s[0] + (world[1] - F.o[1]) * F.s[1];
      // Thin sediment bands and isolated quartz inclusions stay embedded in the turning rock.
      const course = Math.floor((z + 0.1 * x) / 5.8);
      const seamX =
        x * 0.35 +
        y * 0.9 +
        4 * Math.sin(Math.floor(z / 3) * 0.7 + course * 0.3);
      const hotVein = Math.abs(Math.sin(seamX * 0.16 + course * 1.07));
      if (phase > 0.03 && z < phase * 103) {
        const transverse = Math.abs(
          Math.sin((z + 0.17 * x + 0.24 * y) * 0.3 + 0.65 * Math.sin(x * 0.27)),
        );
        const active =
          (hotVein < 0.23 && Math.sin(y * 0.13 + x * 0.11) > -0.4) ||
          (transverse < 0.115 && Math.cos(x * 0.15 - y * 0.21) > -0.15);
        if (active)
          return light > 0.2 && (hotVein < 0.14 || transverse < 0.06)
            ? brightSeam
            : deepSeam;
      }
      if (hotVein < 0.105 && Math.sin(z * 0.19 + x * 0.24) > 0.12) return T[0];
      const band = Math.cos(
        (z - 0.14 * x - 0.09 * y) * 1.4 + 0.55 * Math.sin(y * 0.47),
      );
      if (band > 0.91 && Math.sin(x * 0.22 + y * 0.13) > -0.35)
        return T[light > 0.35 ? 2 : 0];
      if (
        light > 0.15 &&
        Math.cos(x * 0.81) * Math.sin(y * 0.64 + z * 0.39) > 0.87
      )
        return T[3];
      return null;
    },
  };
}

// Basalt fracture surfaces have six unequal faces. All rings share their vertex ordering.
const sides = [
  [1, -0.28],
  [0.59, 0.88],
  [-0.56, 1],
  [-1, 0.06],
  [-0.53, -0.91],
  [0.51, -0.97],
];
function ledge(
  r: Rig,
  F: F3,
  f: number,
  s: number,
  z: number,
  a: number,
  b: number,
  h: number,
  m: Mat,
) {
  const top = sides.map(([x, y], i) =>
    F.p(
      f + x * a,
      s + y * b,
      z + h * (0.63 + [0.1, -0.03, 0.03, 0, 0.11, -0.04][i]),
    ),
  );
  const lower = sides.map(([x, y], i) =>
    F.p(
      f + 0.8 + x * a * 0.78,
      s + y * b * 0.82,
      z - h * (0.65 + 0.06 * (i % 3)),
    ),
  );
  for (let i = 0; i < sides.length; i++) {
    const j = (i + 1) % sides.length;
    r.poly([lower[i], lower[j], top[j], top[i]], m);
  }
  r.poly(top, m, 0.08);
}

export function craterTitanFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  external: Partial<Controls> = {},
): BodyFrame {
  const k = { ...controls, ...external };
  const clock =
    anim === 'walk'
      ? (t % 1) * 3
      : ['idle', 'idle-f2', 'sleep'].includes(anim)
        ? t % 3
        : 0;

  const loop = (clock * TAU) / 3 + 0.73;
  const breath = Math.sin(loop),
    sleeping = anim === 'sleep';
  const walk = anim === 'walk' || anim === 'away' || anim === 'back';
  const gait = walk ? Math.sin((t % 1) * TAU) : 0;
  const look =
    anim === 'look' ? Math.sin(Math.PI * Math.min(1, t / 1.5)) ** 2 : 0;
  const phase = anim === 'idle-f2' ? 1 : k.phase;
  const golden = variant === 'gold';
  const F = F3.yaw(0.77 + (TAU * side) / 16);
  const torso = F.at(
    -2,
    gait * 2,
    42 + 1.6 * breath - (sleeping ? 13 : 0) - 13 * k.crouch,
  )
    .turn(0.24 * k.twist + 0.18 * k.sweep + 0.045 * gait)
    .pitch(0.12 + 0.13 * k.crouch)
    .roll(0.025 * gait);
  const head = torso
    .at(2, 0, 30)
    .turn(0.33 * look + 0.21 * k.glance)
    .pitch(-0.13 - 0.12 * look);
  const rock = strataRock(F, golden, false, phase),
    plane = strataRock(F, golden, true, phase);
  const dark: Mat = { T: golden ? copper : lip };
  const hot: Mat = {
    T: phase > 0.6 ? igneous : clinker,
    glow: 0.48 + 0.4 * phase,
  };
  const magma = hx(phase > 0.55 ? '#ffcb78' : '#e87840');
  const white = hx(phase > 0.65 ? '#fff6cb' : '#ffc16d');
  const r = new Rig();
  const loc: Record<string, V3> = {};
  for (const d of [-1, 1]) {
    const stride = Math.max(0, gait * d);
    const lift =
      Math.max(0, stride) * 8 + (d === 1 ? Math.max(0, k.foot) * 26 : 0);
    const toe = F.p(5 + stride * 7, d * 19, 5 + lift),
      hip = torso.p(-1, d * 12, -8);
    const knee = ik(hip, toe, 21, 20, F.v(0.8, d * 0.25, 0.05));
    r.cap(hip, knee, 8, 9, dark).cap(knee, toe, 8, 6.5, rock);
    const boot = F.at(7 + stride * 7, d * 20, 6 + lift);
    ledge(r, boot, 0, 0, 0, 13, 8.8, 7, plane);
    r.ell(boot, [6, -3, -2], [8.5, 5, 3.3], dark).ell(
      boot,
      [5, 4, -1.9],
      [8.4, 4.9, 3.2],
      dark,
    );
    r.ell(
      F3.yaw(0.77 + (TAU * side) / 16, knee),
      [0, 0, 0],
      [10, 8.8, 7],
      plane,
    );
    loc[d === 1 ? 'footR' : 'footL'] = boot.p(13, 1, -4);
    if (d === 1) loc.foot = loc.footR;
  }
  // Asymmetric stepped shield across a deep, narrower belly.
  r.ell(torso, [0, 0, -3], [20, 22, 21], dark);
  ledge(r, torso, -1, 1, 7, 22, 30, 18, rock);
  ledge(r, torso, -3, -1, 19, 25, 33, 13, plane);
  const sternum = torso.at(20, 0, 8).pitch(-0.11);
  r.ell(sternum, [0, 0, 0], [3.8, 10, 12], dark);
  loc.chest = sternum.p(4, 0.5, 1);
  for (const d of [-1, 1]) {
    const z = phase > 0.35 ? 10 : 5;
    const a = sternum.p(3.1, d * 2, 6),
      b = sternum.p(3.7, d * 6, 1),
      c = sternum.p(2, d * 4, -z);
    r.line(a, b, magma, 0.78).line(b, c, magma, 0.8);
    if (phase > 0.14 && d === 1)
      r.line(b, sternum.p(2.2, d * 9, 3), white, 0.7);
  }
  const limb = new Rig();
  for (const d of [-1, 1]) {
    const lead = d === 1;
    const raise = lead ? k.arm : k.tip;
    const sh = torso.p(-1, d * (lead ? 29 : 24), 19);
    const hand = F.p(
      8 + raise * 17 + (lead ? 27 * k.sweep : 0),
      d * (lead ? 46 : 40) - (lead ? 23 * k.sweep : 0),
      11 +
        48 * raise +
        (sleeping ? -3 : 0) +
        (lead ? 1.4 : 1.0) * Math.sin(loop - 0.38 * d) +
        gait * d * 3,
    );
    const el = ik(sh, hand, 28, 27, F.v(-0.8, d * 0.75, -0.15));
    const armRig = lead ? limb : r;
    armRig.cap(sh, el, 12, 8.2, dark).cap(el, hand, 9, 6.5, rock);
    ledge(
      armRig,
      F3.yaw(0.77 + (TAU * side) / 16, sh),
      0,
      0,
      1,
      14,
      lead ? 16 : 13,
      10,
      plane,
    );
    const fore = F3.yaw(0.77 + (TAU * side) / 16, vlerp(el, hand, 0.55));
    armRig.ell(fore, [0, 0, 1], [11, 10, 7], dark, (q) => q[2] > 0.65);
    const palm = F3.yaw(0.77 + (TAU * side) / 16, hand).roll(
      d * (-0.14 - 0.27 * raise),
    );
    ledge(armRig, palm, 0, 0, 1, 9.5, lead ? 12 : 9, 8, plane);
    for (let j = -1; j <= 1; j++) {
      const curl = 0.5 + 0.5 * Math.sin(loop - 0.5 * d - j * 0.35);
      armRig.cap(
        palm.p(4, j * 4.1, -0.7),
        palm.p(6 + 2 * curl, j * 4.8, -6 + 2 * raise),
        3.1,
        2.3,
        dark,
      );
    }
    armRig.cap(palm.p(-1, d * 7, 1), palm.p(3, d * 10, -3), 3, 2, dark);
    if (lead) loc.fist = palm.p(8, 0, -4);
  }
  r.prims.push(...limb.prims);
  // Jagged backing spurs, lower on the nearer shoulder, keep both sides legible in profile.
  for (const [x, y, h, w] of [
    [-12, -20, 21, 5],
    [-15, -9, 30, 6],
    [-10, 21, 12, 5],
  ]) {
    r.spike(torso.p(x, y, 16), torso.v(-0.24, 0.08, 1), h, w, rock, 3, 0.5);
  }
  if (phase > 0.12) {
    const d = 3 + phase * 9;
    for (const side of [-1, 1]) {
      const seam = [
        torso.p(18, side * 7, 24),
        torso.p(15, side * 13, 23),
        torso.p(12, side * 18, 18),
        torso.p(11, side * (18 + d), 17),
      ];
      for (let i = 2; i < seam.length; i++)
        r.line(seam[i - 1], seam[i], magma, 0.84, 1.1);
    }
  }
  const muzzle = head.at(17.5, 0, -4);
  ledge(r, muzzle, 0, 0, -1, 12, 14, 9, dark);
  for (const d of [-1, 1]) {
    const eye = muzzle.p(9.8, d * 9.4, 2);
    const blinking = clock > 2.23 && clock < 2.36;
    r.cap(muzzle.p(11.2, d * 4, 1.8), eye, 1.3, blinking ? 0.35 : 2, {
      T: [magma, magma, white, white],
      glow: 0.95,
    });
    r.cap(muzzle.p(5, d * 4, 4), muzzle.p(7, d * 10, 5), 2.1, 1.5, plane);
    if (d === 1) {
      loc.eye = eye;
      r.eye = eye;
    }
  }
  // Model the dark well with an actual inner wall. A bright, recessed floor is visible at 3/4.
  const radius = 12 + 3 * k.vent;
  const ring = (f: number, s: number, z: number, variance = 0) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i * TAU) / 8 + 0.15;
      return head.p(
        f * Math.cos(a) - 1,
        s * Math.sin(a),
        z + variance * Math.sin(3 * a + 0.4),
      );
    });
  const base = ring(16, 18, -1),
    outer = ring(radius + 2, radius + 2.6, 12, 2.1),
    inner = ring(radius - 2, radius - 2, 11, 0.9),
    floor = ring(7.2, 7.6, 5);
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    r.poly([base[i], base[j], outer[j], outer[i]], rock);
    r.poly([outer[i], outer[j], inner[j], inner[i]], plane);
    r.poly([inner[i], inner[j], floor[j], floor[i]], dark);
  }
  r.poly(floor, hot);
  loc.vent = head.p(-1, 0, 12);
  for (let i = 0; i < 3; i++) {
    const u = (clock / 1.5 + i / 3) % 1;
    const a = Math.round(60 * Math.sin(Math.PI * u) ** 0.65);
    const mist = golden ? '#bd9971' : '#a39094';
    const c = hx(mist, a);
    const rad = 1.3 + u * 3.4;
    r.ell(
      head,
      [-2 - u * 6, Math.sin(u * 4 + 0.4) * 3, 12 + u * 20],
      [rad * 1.24, rad, 0.84 * rad],
      { T: [c, c, c, c], soft: true },
    );
  }
  // Raise the silhouette out of the ground plane and broaden the crag in camera space.
  const widen = (p: V3): V3 => [p[0] * 1.17, p[1] * 0.99, p[2] * 1.12];
  for (const prim of r.prims) {
    if (prim.k === 0) {
      prim.c = widen(prim.c);
      prim.a = prim.a.map(widen) as [V3, V3, V3];
    } else if (prim.k === 1 || prim.k === 4) {
      prim.a = widen(prim.a);
      prim.b = widen(prim.b);
    } else if (prim.k === 2) prim.pts = prim.pts.map(widen);
    else prim.p = widen(prim.p);
  }
  for (const key of Object.keys(loc)) loc[key] = widen(loc[key]);
  r.eye = loc.eye;
  const body = projectFigure(r, 144, anchor, loc, undefined, 3.8);
  if (phase > 0.03 && body.lit) {
    // The colour pass has already depth-tested the veins. Only exposed lava emits light.
    const pixels = body.px.data,
      lights = body.lit.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const seam =
        pixels[i] === brightSeam[0] && pixels[i + 1] === brightSeam[1]
          ? brightSeam
          : pixels[i] === deepSeam[0] && pixels[i + 1] === deepSeam[1]
            ? deepSeam
            : null;
      if (seam) {
        lights[i] = seam[0];
        lights[i + 1] = seam[1];
        lights[i + 2] = seam[2];
        lights[i + 3] = Math.round(180 * phase);
      }
    }
  }
  const luminousEye = body.points.eye.map(Math.round) as XY;
  if (!body.eye && body.lit?.get(...luminousEye)[3]) body.eye = luminousEye;
  const over =
    anim === 'peek'
      ? renderRig(limb, 144, 144, ...body.anchor, { inner: 3.8 }).p
      : undefined;
  return {
    ...body,
    over,
    dx: k.dx,
    dy: k.dy,
    sx: k.sx,
    sy: k.sy,
    rot: k.rot,
    flash: k.flash || undefined,
    ghost:
      k.trail > 0
        ? { dx: -4 * k.trail, dy: 2, alpha: 0.23 * k.trail }
        : undefined,
  };
}
const base = {
  idle: { seconds: 3, loop: true },
  'idle-f2': { seconds: 3, loop: true },
  walk: { seconds: 1, loop: true },
  sleep: { seconds: 3, loop: true },
  turn: { seconds: 4, loop: true },
  look: { seconds: 1.5 },
};
export default {
  id: 'crater_titan',
  rarity: 'mythic',
  theme: 'volcano',
  animations: { ...base, ...actions },
  effects,
  frame(anim, t, side, variant) {
    const last = actions[anim]?.seconds;
    if (last && anim !== 'away' && t * 24 >= Math.round(last * 24) - 1)
      return craterTitanFrame(
        anim === 'phase' ? 'idle-f2' : 'idle',
        0,
        side,
        variant,
      );
    return craterTitanFrame(anim, t, side, variant, pose(anim, t));
  },
} satisfies Creature;
