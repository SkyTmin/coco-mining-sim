import { fillPoly, type Pen } from '../fx/pen';
import { fill2, hx, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { FxInput, XY } from '../types';
import { seedBeat, seedContact } from './garden_chameleon-poses';

function mapleKey(p: Pen, [x, y]: XY, angle: number, breadth: number) {
  // The dark nut stays at the point of attachment. The papery wing turns around it.
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  const point = (long: number, across: number): XY => [
    x + long * dx - across * dy * breadth,
    y + long * dy + across * dx * breadth,
  ];
  const shape = (color: string, verts: XY[]) => {
    p.col(color);
    fillPoly(
      p,
      verts.flatMap(([u, v]) => point(u, v)),
    );
  };
  shape('#793843', [
    [0, 0],
    [3, -1],
    [9, -4],
    [13, -3],
    [14, -1],
    [11, 2],
    [5, 2],
  ]);
  shape('#ec7651', [
    [2, 0],
    [8, -2],
    [12, -3],
    [13, -1],
    [10, 1],
    [5, 1],
  ]);
  p.col('#ffdf95');
  p.line(...point(2, 0), ...point(10, -2));
  p.col('#6c4435');
  p.rect(x - 1, y - 1, 4, 3);
  p.col('#d7904e');
  p.dot(x, y - 1, 2, 1);
}
function falling(n: number): XY {
  const u = Math.max(0, Math.min(1, n / seedBeat.touch)),
    swirl = Math.sin(TAU * u * 1.65) * Math.sin(u * Math.PI);
  return [
    134 + (seedContact[0] - 134) * u + swirl * 6 - 34 * Math.sin(Math.PI * u),
    -8 + (seedContact[1] + 8) * u + swirl * 1.4,
  ];
}
function shootSeed(f: FxInput, n: number) {
  const b = seedBeat;
  if (n <= b.touch) {
    const nut = falling(n);
    f.propAt?.('samara', nut);
    mapleKey(f.above, nut, -1.31 + Math.sin(n * 0.32) * 1.03, 0.64 + 0.32 * Math.cos(n * 0.44));
    return;
  }
  if (n <= b.release) {
    const angle =
      n < b.lip
        ? -1.31 + Math.sin(b.touch * 0.32) * 1.03 + (n - b.touch) * 0.023
        : -0.72 + 0.09 * Math.sin((n - b.lip) * 0.35);
    mapleKey(f.above, f.points.tongueTip, angle, 0.92);
    f.propAt?.('samara', f.points.tongueTip);
    return;
  }
  if (n < 107) {
    const at = f.pointAt(b.release / 24, 'tongueTip'),
      u = (n - b.release) / 29;
    const spot: XY = [at[0] + (178 - at[0]) * u, at[1] - Math.sin(Math.PI * u) * 18 + u * 8];
    mapleKey(f.above, spot, -0.72 + u * 8, 0.75 + 0.25 * Math.cos(u * 14));
    f.propAt?.('samara', spot);
  }
}
// A swallow seen from below. The wrist leads the stroke; the long primaries sweep aft.
const swallowInk = hx('#344852');
function swallow(p: Pen, n: number) {
  const u = n / 64;
  const beat = n % 27;
  const fold = Math.max(0, Math.min(1, (beat - 5) / 3, (20 - beat) / 9));
  const bend = fold * fold * (3 - 2 * fold);
  const bank = -0.28 + 0.09 * Math.sin(TAU * u);
  const cos = Math.cos(bank),
    sin = Math.sin(bank);
  const bird = new Px(66, 64);
  const paint = (contour: XY[]) =>
    fill2(
      bird,
      contour.map(([x, y]): XY => [32 + x * cos - y * sin, 32 + x * sin + y * cos]),
      () => swallowInk,
    );
  for (const near of [false, true]) {
    const side = near ? 1 : -1;
    const wrist = -7.5 + 5 * bend + (near ? 3 : 0);
    const span = (near ? 0.83 : 1) * (1 - 0.48 * bend);
    const tip = (near ? 18 : 10) + 7 * bend;
    const wing: XY[] = [
      [-5, 1],
      [wrist - 1, 8],
      [wrist - 1.8, 12],
      [wrist - 1.4, 14.8],
      [wrist + 0.7, 18.2],
      [tip - 6, 24],
      [tip, 28],
      [tip - 2.2, 23.4],
      [wrist + 7, 14.1],
      [wrist + 6.4, 12.2],
      [wrist + 7.4, 10],
      [wrist + 9.3, 8.6],
      [wrist + 9.4, 7.1],
      [wrist + 11.7, 6.2],
      [5.7, 3.0],
      [6.1, 0.8],
    ];
    paint(wing.map(([x, y]) => [x, side * y * span]));
  }
  // Rounded crown, short beak, plump breast, narrow rump and two thin tail streamers.
  paint([
    [-21.5, 0.2],
    [-16.1, -1.6],
    [-15.6, -3.1],
    [-14.1, -4.7],
    [-11.7, -5.3],
    [-9.6, -5.0],
    [-7.4, -3.3],
    [-5, -2.9],
    [1.6, -3.6],
    [6.5, -2.6],
    [10.2, -1.5],
    [18, -4.7],
    [26, -9.3],
    [23.1, -5.3],
    [19.0, -1.8],
    [14.8, 1.2],
    [18.7, 4.5],
    [23, 10.3],
    [15.6, 6.0],
    [9.2, 3.3],
    [5.3, 3.4],
    [0.8, 4.9],
    [-3.7, 5.2],
    [-7.3, 4.2],
    [-10.8, 2.4],
    [-13.4, 2.7],
    [-15.7, 1.6],
    [-16.5, 0.7],
  ]);
  // Paint the alpha mask once. The open slots between wings and tail must show the glass.
  const x = 187 - 221 * u,
    y = 20 + 14 * Math.sin(Math.PI * u) - 1.6 * bend;
  p.occ = [0, 24, 160, 26, 0, 52, 160, 128];
  for (const ix of [2, 42, 82, 122]) p.occ.push(ix, 26, ix + 2, 52);
  p.alpha(0.86);
  p.img(bird.canvas(), Math.round(x) - 32, Math.round(y) - 32);
  p.occ = null;
}
export function glasshouseEffects(f: FxInput) {
  const n = f.t * 24;
  if (f.anim === 'trick') shootSeed(f, n);
  if (f.anim === 'trick_b' && n <= 65) swallow(f.backdrop, n);
}
