import type { CreatureCard } from '../bodies/card-data';
import { hx, mixc } from '../kit/f11-mobkit';
import type { F3, Mat, Rig, Tones, V3 } from '../rig/f15-rig';

export type Paints = Record<string, Mat>;
export type Sockets = Record<string, V3>;
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function ease(a: number, b: number, n: number) {
  const u = clamp((n - a) / (b - a));
  return u * u * (3 - 2 * u);
}
export const windowAt = (n: number, a: number, b: number, c: number, d: number) =>
  ease(a, b, n) - ease(c, d, n);
export function arc(n: number, start: number, end: number, height: number) {
  const u = clamp((n - start) / (end - start));
  return 4 * height * u * (1 - u);
}
export function toyPaint(card: CreatureCard, golden: boolean): Paints {
  const honey = ['#845552', '#b17755', '#e3ab64', '#ffdd94', '#fff0bc'].map(hx);
  return Object.fromEntries(
    card.materials.map(({ name, tones }) => {
      const base = tones.map((hex) => hx(hex));
      if (golden && (name === 'coat' || name === 'trim'))
        base.forEach((color, i) => (base[i] = mixc(color, honey[i], 0.88)));
      const T = [base[0], base[1], base[3], base[4]] as Tones;
      const ramp = Array.from({ length: 37 }, (_, i) => {
        const a = Math.min(3, Math.floor(i / 9));
        return mixc(base[a], base[a + 1], i / 9 - a);
      });
      const mat: Mat = { T };
      if (['coat', 'cream', 'trim', 'felt', 'wood', 'skin', 'blush'].includes(name))
        mat.pat = (q, lit) => {
          const grain = Math.sin(17 * q[1] + 3 * Math.sin(9 * q[2])) * Math.cos(19 * q[2] + 4 * q[0]);
          return ramp[Math.round(36 * clamp(0.41 + 0.54 * lit + 0.074 * grain))];
        };
      return [name, mat];
    }),
  );
}
/** The pupils and their two catchlights share the eye socket with the lid. */
export function beadEye(
  r: Rig,
  eye: F3,
  side: number,
  close: number,
  lookDown: number,
  paints: Paints,
  pts: Sockets,
  radius: number,
) {
  const k = side < 0 ? 'eyeL' : 'eyeR';
  r.tag = k;
  const first = r.size,
    open = 1 - clamp(close),
    v = radius;
  if (open > 0.14) {
    r.ell(eye, [0, 0, 0], [1.25, v * 0.82, v * open], paints.ink);
    r.ell(eye, [0.77, 0, -0.12], [0.88, v * 0.63, v * 0.79 * open], paints.iris);
    const aim = Math.min(0.56, Math.max(-0.56, lookDown)) * open;
    r.ell(eye, [1.21, -0.07, 0.24 - aim], [0.78, v * 0.49, v * 0.65 * open], paints.ink);
    r.ball(eye.p(1.8, -v * 0.22, v * 0.36 * open - aim), 0.72 * open, paints.cream);
    if (open > 0.75) r.dot(eye.p(1.82, v * 0.18, -v * 0.24 - aim), paints.cream.T[3], 0, 1);
  } else {
    r.cap(eye.p(1.15, -v * 0.68, 0.25), eye.p(1.43, 0, -0.28), 0.37, 0.46, paints.ink);
    r.cap(eye.p(1.43, 0, -0.28), eye.p(1.15, v * 0.68, 0.25), 0.46, 0.34, paints.ink);
  }
  r.markEye(first, side, open > 0.25);
  pts[k] = eye.p(1.4, 0, 0);
}
