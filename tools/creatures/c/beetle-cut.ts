// The crystal is cut across its growth axis. Each wing has a seam, phantom layers and a healed fault.
import { type F3, type Mat, type Rig, type V3 } from '../rig/f15-rig';
import { hx, tn } from '../kit/f11-mobkit';
import { ramp, localPoint } from './engraving';

export function facet(
  w: F3,
  s: number,
  face: Mat,
  inclusion: Mat,
  shadow: Mat,
  shine: number,
): Mat {
  return {
    ...face,
    pat: (world, l) => {
      const [x, side, z] = localPoint(w, world),
        y = side * s;
      const stripe = x + 0.76 * y,
        ridge = y + 0.23 * x,
        cleave = x * 0.34 + y * 0.89;
      const split = 7.8 + 0.18 * x + 0.7 * Math.sin(0.55 * x);
      if (
        x > -14 &&
        x < -3 &&
        (Math.abs(y - split) < 0.43 ||
          (x < -8 && Math.abs(y - split + (x + 8) * 0.51) < 0.41))
      )
        return shadow.T[1];
      // A little wedge of blue quartz, a ghost inclusion, and paired steps under the rear facet.
      if (x < -8 && x > -15 && ridge > 1.9 && ridge < 4 + (x + 15) * 0.32)
        return ramp(inclusion, l, 0.3 + Math.cos(stripe * 0.95), x * 0.9, z);
      const lamella = Math.sin(cleave * 1.67 + Math.sin(stripe * 0.23));
      const bevel = Math.cos(0.78 * stripe + 0.14 * y);
      if (
        (x < -15 && Math.abs(Math.sin(ridge * 0.83)) > 0.9) ||
        (cleave > 6.2 && cleave < 7.0 && x < 0)
      )
        return ramp(inclusion, l, lamella * 0.45, x, y);
      if (Math.abs(stripe - (5 + shine * 2.3)) < 0.55 && y < 11.3)
        return inclusion.T[l > 0.3 ? 3 : 2];
      return ramp(
        face,
        l,
        bevel * 0.84 + lamella * 0.58 + 0.24 * Math.sin(z * 0.82),
        x * 1.03,
        y * 1.06,
      );
    },
  };
}
export function armouredHead(
  r: Rig,
  h: F3,
  s: number,
  metal: Mat,
  night: Mat,
  jewel: Mat,
  blink: boolean,
) {
  const lens: Mat = { T: tn('#482a39', '#935136', '#d7984e', '#ffe597') };
  lens.pat = ([x, y, z], l) =>
    ramp(
      lens,
      l,
      0.9 * Math.cos((x + z) * 13) + 0.6 * Math.sin((y - z) * 12),
      x * 11,
      z * 9,
    );
  r.tag = s > 0 ? 'eyeR' : 'eyeL';
  const eyeStart = r.size;
  r.ell(h, [5.6, s * 8.5, 2.4], [3.8, 2.25, 2.25], blink ? night : lens);
  if (!blink) r.dot(h.p(6.8, s * 9.8, 3.3), hx('#fff3c3'), 0, 1.2, 1.2);
  r.markEye(eyeStart, s, !blink);
  // Mandibular notch and clubbed feeler are placed on opposite sides of the central horn.
  const hinge = h.p(8.5, 6.2 * s, -1.5),
    notch = h.p(12.5, 9 * s, -2.5);
  r.tag = s > 0 ? 'mandibleR' : 'mandibleL';
  r.cap(hinge, notch, 2.05, 1.28, metal);
  r.cap(notch, h.p(14.8, 7.5 * s, -1.2), 1.25, 0.33, jewel);
  const elbow = h.p(8.5, s * 11, 6.2),
    tip = h.p(12, s * 13, 8.6);
  r.tag = s > 0 ? 'feelerR' : 'feelerL';
  r.cap(h.p(4.5, s * 7.2, 4.8), elbow, 0.8, 0.65, night);
  r.cap(elbow, tip, 0.6, 0.45, metal);
  r.ball(tip, 1.4, night);
  r.tag = 'head';
  r.line(h.p(-1, s * 8, 5.5), h.p(5, s * 5.5, 7.0), metal.T[2], 0, 0.9);
}
export function etchedMetal(m: Mat): Mat {
  return {
    ...m,
    pat: ([t, x, y], l) =>
      ramp(
        m,
        l,
        0.75 * Math.cos(15 * t + 2 * x) + 0.48 * Math.sin(6 * y + 2 * x),
        t * 18,
        x * 4 + y,
      ),
  };
}
export function hingeClips(r: Rig, F: F3, s: number, metal: Mat, dark: Mat) {
  const p = (x: number, y: number, z: number): V3 => F.p(x, s * y, z);
  r.cap(p(4, 3.7, 11), p(3.5, 5.7, 13.6), 1.25, 1.0, metal);
  r.line(p(3.5, 5.7, 13.6), p(1, 6.5, 13.2), metal.T[2], 0, 0.8);
  r.ell(F, [-16, 5.4 * s, 12.8], [1.75, 1.1, 0.9], dark);
  r.dot(p(-15.4, 5.7, 13.5), metal.T[2], 0, 1, 0.7);
}
