// Nebular membrane, embedded stars and luminous filaments in object coordinates.
import {
  F3,
  Rig,
  vadd,
  vsub,
  vnorm,
  vmul,
  vcross,
  vdot,
  vlen,
  vlerp,
  type V3,
  type Mat,
  type RGBA,
} from '../../rig/f15-rig';
import { TAU, mixc } from '../../kit/f11-mobkit';
export type Membrane = (axial: number, angle: number, raise?: number) => V3;
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export function beamFrame(a: V3, b: V3, guide: V3): F3 {
  const f = vnorm(vsub(b, a));
  let s = vsub(guide, vmul(f, vdot(f, guide)));
  if (vlen(s) < 0.001) s = vcross(f, Math.abs(f[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0]);
  s = vnorm(s);
  return new F3(a, f, s, vnorm(vcross(f, s)));
}
// An uneven S-shaped galactic plane, with a broken secondary stream. Both use
// actual membrane coordinates so the star field follows a bending/tapering squid.
export const galacticLane = (x: number, wake: number) =>
  1.91 + 1.12 * Math.sin(x * 5.53 - 0.99) + 0.49 * x + wake * 0.35;
export function cloudMembrane(
  r: Rig,
  surface: Membrane,
  frame: F3,
  palette: Mat['T'],
  dust: Mat['T'],
  length: number,
  wake: number,
) {
  const T = palette,
    cloud: Mat = {
      T,
      glow: 0.21,
      soft: true,
      pat(point, light) {
        const v = vsub(point, frame.o),
          x = vdot(v, frame.f) / Math.max(1, length),
          y = vdot(v, frame.s),
          z = vdot(v, frame.u);
        const a = Math.atan2(y, z),
          center = galacticLane(x, wake);
        const distance = (angle: number) => Math.atan2(Math.sin(a - angle), Math.cos(a - angle));
        const seam = distance(center),
          plumeWidth = 0.38 + 0.14 * Math.sin(x * 13.2 + 0.47);
        const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * clamp((x - 0.035) / 0.91))), 0.48);
        const cloudlets = 0.74 + 0.16 * Math.sin(26 * x + 2.4 * a) + 0.11 * Math.sin(43 * x - 3.35 * a);
        const disk = Math.exp(-0.5 * (seam / plumeWidth) ** 2) * envelope * cloudlets;
        const branch =
          Math.exp(-0.5 * (distance(center + 0.64 * Math.sin(x * 8 + 0.3) + 0.29) / 0.115) ** 2) * envelope;
        const wisp1 =
          Math.exp(-0.5 * (distance(center - 0.64 + 0.28 * Math.sin(x * 9)) / 0.12) ** 2) * envelope;
        const wisp2 =
          Math.exp(-0.5 * (distance(center + 0.87 - 0.33 * Math.sin(x * 11)) / 0.18) ** 2) * envelope;
        const dusk =
          0.42 + 0.18 * Math.sin(a * 2 + x * 8 + wake) + 0.09 * Math.sin(a * 3.3 - x * 13.9) + light * 0.09;
        const base = mixc(T[0], T[1], clamp(dusk));
        const intensity = Math.min(1, disk * 0.98 + branch * 0.31 + wisp1 * 0.47 + wisp2 * 0.39),
          tier = Math.floor(intensity * 9) / 9;
        let pigment = mixc(base, dust[0], clamp(tier * 2.02));
        pigment = mixc(pigment, dust[1], clamp((tier - 0.27) * 1.86));
        pigment = mixc(pigment, dust[2], clamp((tier - 0.6) * 2.06));
        const grain = Math.sin(x * 247.2 + a * 39.8) * Math.sin(x * 102.2 - a * 51.9);
        if (grain > 0.7 && disk + branch > 0.45) pigment = mixc(pigment, dust[3], 0.69);
        return [pigment[0], pigment[1], pigment[2], Math.round(153 + 50 * intensity)];
      },
    };
  const rows = [0, 0.08, 0.2, 0.34, 0.5, 0.66, 0.81, 0.92, 1];
  for (let i = 1; i < rows.length; i++)
    for (let j = 0; j < 16; j++) {
      const a = (j * TAU) / 16,
        b = ((j + 1) * TAU) / 16;
      r.poly(
        [surface(rows[i - 1], a), surface(rows[i - 1], b), surface(rows[i], b), surface(rows[i], a)],
        cloud,
      );
    }
}
export function nebulaRibbon(
  r: Rig,
  p: Membrane,
  start: number,
  turns: number,
  angle: number,
  width: number,
  c: Mat,
  shift = 0,
) {
  for (let j = 0; j < 15; j++) {
    const at = (n: number, side: number) => {
      const u = n / 15,
        x = start + u * (0.93 - start),
        theta = angle + turns * TAU * u + shift + 0.3 * Math.sin(u * 4.5);
      return p(x, theta + side * width * Math.sin(Math.PI * u), 0.42);
    };
    r.poly([at(j, -1), at(j, 1), at(j + 1, 1), at(j + 1, -1)], c, 0.17);
  }
}
// Crystalline four-ray photophore, centred on its anatomical tip; the two
// faceted faces remain volumetric in profile and in rear views.
export function tipStar(r: Rig, center: V3, basis: F3, radius: number, c: Mat, core: Mat) {
  const ray = (i: number) => {
    const a = (i * Math.PI) / 4,
      len = i % 2 ? radius * 0.27 : radius * (i % 4 === 0 ? 1 : 0.77);
    return vadd(center, basis.v(0, Math.cos(a) * len, Math.sin(a) * len));
  };
  for (const sign of [-1, 1]) {
    const crown = vadd(center, basis.v(sign * radius * 0.32, 0, 0));
    for (let i = 0; i < 8; i++) r.poly([ray(i), ray(i + 1), crown], i % 3 === 0 ? core : c);
  }
  r.ball(center, radius * 0.31, core);
  r.dot(vadd(center, basis.v(radius * 0.32, 0, 0)), core.T[3], 0.77, 0.95);
}
export function stellarFilament(r: Rig, a: V3, b: V3, material: Mat, bend: V3) {
  let prev = a;
  for (let i = 1; i <= 5; i++) {
    const u = i / 5,
      p = vadd(vlerp(a, b, u), vmul(bend, Math.sin(Math.PI * u)));
    r.line(prev, p, material.T[i === 3 ? 3 : 2], material.glow ?? 0, 0.34);
    prev = p;
  }
}
