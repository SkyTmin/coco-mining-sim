import type { FxInput, XY } from '../types';
import { Px } from '../rig/px';
import { proj, vmul } from '../rig/f15-rig';
import { face } from '../scenes/relief';
import { hx, TAU } from '../kit/f11-mobkit';
import { boatFrame, bodyFrames, home, scale } from './apricot_bubbler-poses';
import { clamp, ease } from './painted-toys';

function nozzleAt(n: number): XY {
  const q = bodyFrames('trick', n / 24),
    xyz = q.tube.p(7.48, 0, 0);
  const [x, y] = proj(vmul(xyz, scale), home[0] + q.x, home[1] + q.y - q.alt);
  return [x, y];
}
const launch = nozzleAt(45),
  touch = nozzleAt(86);
export function bubbleAt(n: number, mouth: XY): { center: XY; radius: number } | null {
  if (n < 20 || n >= 90) return null;
  let radius = 11.4 * ease(20, 43, n);
  if (n <= 45) return { center: [mouth[0] + radius * 0.97, mouth[1] - radius * 0.24], radius };
  const u = clamp((n - 45) / 41);
  const x = launch[0] + 11.4 * 0.97 + (touch[0] - launch[0]) * u + 3.85 * Math.sin(Math.PI * u);
  const y = launch[1] - 11.4 * 0.24 + (touch[1] - launch[1]) * u - 4.8 * Math.sin(Math.PI * u);
  if (n >= 86) {
    radius -= 0.49 * (n - 86);
    return { center: [mouth[0] + radius * 0.97, mouth[1] - radius * 0.24], radius };
  }
  return { center: [x, y], radius };
}
const pearl = ['#eab8d8', '#a4dcd2', '#b8dbee', '#f4dfaa', '#eab8d8'];
function film(f: FxInput, center: XY, radius: number) {
  if (radius < 0.8) return;
  const [cx, cy] = center,
    g = f.above;
  for (let i = 0; i < Math.ceil(radius * 2 + 1); i++) {
    const y = i - radius;
    if (Math.abs(y) > radius) continue;
    const w = Math.sqrt(Math.max(0, radius * radius - y * y));
    g.col(y > radius * 0.5 ? '#bacddf' : '#eff6e8', y > radius * 0.5 ? 0.2 : 0.12);
    g.line(cx - w, cy + y, cx + w, cy + y);
  }
  for (let i = 0; i < 40; i++) {
    const a = (TAU * i) / 40,
      b = (TAU * (i + 1)) / 40;
    g.col('#586d86', 0.8);
    g.line(
      cx + radius * Math.cos(a),
      cy + radius * Math.sin(a),
      cx + radius * Math.cos(b),
      cy + radius * Math.sin(b),
    );
    g.col(pearl[Math.floor(i / 8)], 0.99);
    g.line(
      cx + (radius - 1) * Math.cos(a),
      cy + (radius - 1) * Math.sin(a),
      cx + (radius - 1) * Math.cos(b),
      cy + (radius - 1) * Math.sin(b),
    );
  }
  if (radius > 4) {
    g.col('#fff9da');
    g.line(cx - radius * 0.64, cy - radius * 0.5, cx - radius * 0.28, cy - radius * 0.76);
    g.dot(cx - radius * 0.2, cy - radius * 0.73);
    g.col('#ebf8ef', 0.92);
    g.line(cx + radius * 0.5, cy + radius * 0.54, cx + radius * 0.68, cy + radius * 0.31);
  }
}
function paperBoat(list: number) {
  const p = new Px(26, 19),
    lean = list;
  p.ell(13, 15.4, 11.4, 1.9, [50, 105, 115, 106]);
  face(
    p,
    [
      [2, 10],
      [8, 8],
      [13, 5],
      [22, 10],
      [12, 14],
    ],
    hx('#a67767'),
  );
  face(
    p,
    [
      [6, 11],
      [12 + lean, 1],
      [15, 11],
    ],
    hx('#fff0c6'),
  );
  face(
    p,
    [
      [12 + lean, 1],
      [21, 10],
      [14, 11],
    ],
    hx('#d98267'),
  );
  p.line(12 + lean, 2, 14, 10, hx('#ad705e'));
  face(
    p,
    [
      [1, 9],
      [13, 12],
      [24, 8],
      [19, 14],
      [7, 15],
    ],
    hx('#8f5b59'),
  );
  face(
    p,
    [
      [2, 9],
      [12, 12],
      [21, 10],
      [18, 13],
      [7, 14],
    ],
    hx('#efb783'),
  );
  p.line(3, 9, 12, 11, hx('#fff0c9'));
  p.line(13, 11, 23, 8, hx('#f3d7a6'));
  return p.canvas();
}
const boats = [-1, 0, 1].map(paperBoat);
export function courtyardPlay(f: FxInput) {
  const n = f.t * 24,
    boat = boatFrame(f.anim === 'trick_b' ? n : 0);
  f.backdrop.img(boats[Math.round(boat.speed) + 1], boat.x - 13, boat.y - 14);
  f.propAt?.('boat', [boat.x, boat.y]);
  if (f.anim === 'trick_b') {
    const move = Math.abs(boat.speed),
      sign = Math.sign(boat.speed);
    if (move > 0.03)
      for (let j = 0; j < 3; j++) {
        const x = boat.x - sign * (8 + j * 4),
          a = move * (0.72 - 0.16 * j);
        f.backdrop.col('#e8e7c9', a);
        f.backdrop.line(x, boat.y + 1, x - sign * (2 + j), boat.y + 2.6);
        f.backdrop.col('#4e8c94', a);
        f.backdrop.line(x, boat.y - 0.6, x - sign * (2 + j), boat.y - 1.5);
      }
    for (const start of [42, 113]) {
      const age = n - start;
      if (age < 0 || age > 18) continue;
      const gust = Math.sin(Math.PI * clamp(age / 18));
      const [mx, my] = f.points.lip,
        end: XY = [boat.x, boat.y - 7];
      for (let j = 0; j < 3; j++) {
        const u = (age / 15 + j * 0.33) % 1,
          w = Math.min(1, u + 0.12),
          s = (j - 1) * 2.3;
        const at = (v: number): XY => [
          mx + (end[0] - mx) * v,
          my + (end[1] - my) * v + s * Math.sin(Math.PI * v),
        ];
        f.above.col('#f8efd2', gust * 0.85);
        f.above.line(...at(u), ...at(w));
      }
    }
  }
  if (f.anim !== 'trick') return;
  const bubble = bubbleAt(n, f.points.lip);
  if (bubble) {
    film(f, bubble.center, bubble.radius);
    f.propAt?.('bubble', bubble.center);
  }
  if (n >= 90 && n < 103) {
    const age = n - 90,
      c = bubbleAt(89, nozzleAt(89))!.center;
    for (let j = 0; j < 11; j++) {
      const a = (TAU * j) / 11 - 0.35,
        rad = 9.8 + age * (0.98 + 0.25 * (j % 3));
      const x = c[0] + Math.cos(a) * rad,
        y = c[1] + Math.sin(a) * rad + age * age * 0.057;
      f.above.col(pearl[j % 4], 1 - age / 13);
      f.above.line(x, y, x + Math.sin(a) * (1 - age / 13) * 2, y - Math.cos(a) * (1 - age / 13) * 2);
    }
  }
}
