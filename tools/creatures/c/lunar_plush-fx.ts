import { hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { catchTop } from '../scenes/moon_nursery';
import { heldPillow, pillowOnPouf } from './lunar_plush-pillow';
import type { FxInput, XY } from '../types';
import { cushionAt, visit } from './lunar_plush-keys';

const sw = (...v: string[]) => v.map((c) => hx(c));
const braid = sw('#605b70', '#736f89', '#8e869d', '#b3a5af', '#d4bdbe', '#e3ceca');
const velvet = sw('#8a5d67', '#b88072', '#d99c78', '#edb983', '#f9d394', '#ffe7af');
const beetle = sw('#5a485c', '#81636c', '#dc9a54', '#ffcf57', '#fff8af', '#a3cbd0', '#e5fbec');
const clamp = (u: number) => Math.max(0, Math.min(1, u));
const smooth = (u: number) => {
  u = clamp(u);
  return u * u * (3 - 2 * u);
};
const lerp = (a: XY, b: XY, u: number): XY => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
function pouf(lift: number) {
  const p = new Px(47, 33),
    top = 13 - 2.5 * lift;
  p.ell(23, 27, 20, 3, [85, 71, 88, 78]);
  for (const x of [10, 35]) {
    p.rect(x, 24, x + 3, 28, braid[0]);
    p.line(x + 1, 25, x + 1, 27, velvet[1]);
  }
  p.ell(23, 21, 21, 7, braid[0]);
  p.rect(2, top, 43, 21, braid[0]);
  p.ell(23, 20, 20, 7, braid[1]);
  p.rect(3, top, 42, 21, braid[1]);
  for (let x = 5; x <= 40; x += 6) {
    const curve = Math.sqrt(Math.max(0, 1 - ((x - 23) / 20) ** 2));
    p.line(x, top + 2 + curve * 3, x + 1, 21 + curve * 4, braid[2]);
    p.set(x + 1, 21 + curve * 3, braid[3]);
  }
  p.ell(23, top, 21, 6.2, braid[0]);
  p.ell(23, top - 1, 20.5, 5.7, braid[3]);
  p.ell(23, top - 2, 17.5, 4.2, braid[4]);
  for (const x of [9, 15, 21, 27, 33, 39])
    p.line(
      x,
      top + 3.6 * Math.sqrt(1 - ((x - 23) / 19) ** 2),
      x + 2,
      top + 3.6 * Math.sqrt(1 - ((x - 23) / 19) ** 2),
      braid[5],
    );
  if (lift < 1) p.ell(23, top - 1, 9 * (1 - lift) + 0.3, 1.9, [95, 78, 101, Math.round(88 * (1 - lift))]);
  return p.canvas();
}
const restingPouf = pouf(0),
  restingStar = pillowOnPouf(cushionAt(0));
type FireflyPose = { feet: XY; air: boolean; glow: number; face: number };
export function fireflyAt(f: Pick<FxInput, 'points' | 'pointAt'>, n: number): FireflyPose {
  const faceRight = 1,
    faceLeft = -1;
  if (n <= visit.leave || n >= visit.home)
    return {
      feet: catchTop,
      air: false,
      glow:
        n <= visit.leave
          ? 0.25 + 0.64 * smooth((n - 4) / 10)
          : 0.25 + 0.5 * (1 - smooth((n - visit.home) / 7)),
      face: faceRight,
    };
  if (n >= visit.nose && n <= visit.farewell)
    return {
      feet: f.points.nose,
      air: false,
      glow: 0.9 + 0.07 * Math.sin(((n - visit.nose) * TAU) / 16),
      face: faceRight,
    };
  if (n < visit.nose) {
    if (n < 31) {
      const u = smooth((n - visit.leave) / 15),
        feet = lerp(catchTop, [17, 33], u);
      feet[1] -= 6 * Math.sin(Math.PI * u);
      return { feet, air: true, glow: 0.91, face: faceRight };
    }
    if (n < 73) {
      const u = (n - 31) / 42;
      return {
        feet: [17 + 3.4 * Math.sin(u * TAU) + 4 * u, 33 + 2.3 * Math.sin(u * TAU * 2) - 2 * u],
        air: true,
        glow: 0.87 + 0.08 * Math.sin(u * TAU * 2),
        face: faceRight,
      };
    }
    // Fly around the outside of the hooked ear, then approach the bare tip of the nose from the side.
    const u = smooth((n - 73) / (visit.nose - 73));
    const target = f.pointAt(visit.nose / 24, 'nose');
    const feet = lerp(lerp([21, 31], [17, target[1] + 1], u), lerp([17, target[1] + 1], target, u), u);
    return { feet, air: true, glow: 0.95, face: faceRight };
  }
  const u = smooth((n - visit.farewell) / (visit.home - visit.farewell));
  const feet = lerp(f.pointAt(visit.farewell / 24, 'nose'), catchTop, u);
  feet[0] -= 13.5 * Math.sin(Math.PI * u);
  feet[1] -= 17.5 * Math.sin(Math.PI * u);
  return { feet, air: true, glow: 0.94 - 0.19 * u, face: u < 0.86 ? faceLeft : faceRight };
}
function firefly(n: number, b: FireflyPose) {
  const p = new Px(27, 25);
  const light = 13 - 4 * b.face;
  const aura = [255, 217, 135, Math.round(48 * b.glow)] as [number, number, number, number];
  p.ell(light, 10, 9, 8.5, aura);
  p.ell(light, 10, 5.5, 5.3, [255, 222, 134, Math.round(73 * b.glow)]);
  const x = (d: number) => 13 + b.face * (d - 2.65);
  if (b.air) {
    const w = 0.5 + 0.5 * Math.sin((n * TAU) / 5);
    p.ell(x(-1.75), 7.5 - 2 * w, 1.65 + 2.8 * w, 1.75 + w, beetle[5]);
    p.ell(x(1.25), 7.3 - 2.6 * w, 1.45, 1.5 + 1.3 * w, beetle[6]);
  }
  p.line(x(0.4), 11, x(2.65), 14, beetle[0]);
  p.line(x(-1), 11, x(-1.6), 14, beetle[0]);
  p.ell(x(-1.3), 10.2, 3.7, 2.9, beetle[0]);
  p.ell(x(-1.65), 10.2, 3.15, 2.4, mixc(beetle[2], beetle[3], b.glow));
  p.ell(x(-2.25), 9.75, 1.2, 1, beetle[4]);
  p.ell(x(1.78), 9.3, 1.86, 1.66, beetle[0]);
  p.set(x(2.35), 9, beetle[6]);
  p.line(x(2), 8, x(2.9), 6.8, beetle[1]);
  if (!b.air) {
    p.ell(x(-0.6), 8.4, 2.8, 1.34, beetle[5]);
    p.set(x(-1), 8, beetle[6]);
  }
  return p.canvas();
}
const quietBug: FireflyPose = { feet: catchTop, air: false, glow: 0.25, face: 1 },
  restingFly = firefly(0, quietBug);
export function nurseryPlay(f: FxInput) {
  const n = Math.round(f.t * 24),
    c = cushionAt(f.anim === 'trick' ? n : 0);
  const field = f.backdrop;
  field.alpha(1);
  field.img(c.lift ? pouf(c.lift) : restingPouf, 109, 76);
  if (f.anim !== 'trick' || !heldPillow(n))
    field.img(restingStar, Math.round(c.x) - 19, Math.round(c.y) - 19);
  const game = f.anim === 'trick_b',
    b = game ? fireflyAt(f, n) : quietBug;
  // Only the visiting insect rides on the actor layer. Its brass perch always stays at the window.
  const pen = game && n > visit.leave && n < visit.home ? f.above : field;
  pen.alpha(1);
  pen.img(game ? firefly(n, b) : restingFly, Math.round(b.feet[0]) - 13, Math.round(b.feet[1]) - 14);
  if (game && n >= visit.nose && n <= visit.farewell) {
    pen.col('#ffdfa5', 0.64);
    pen.dot(b.feet[0] + 1, b.feet[1] + 1);
  }
}
