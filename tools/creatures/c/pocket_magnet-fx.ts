import { Px } from '../rig/px';
import { hx } from '../kit/f11-mobkit';
import { face } from '../scenes/relief';
import type { FxInput, XY } from '../types';
import { cord, fishAt, hook, starAt } from './pocket_magnet-poses';

// The riveted tab at (0,0) is both the drawing pivot and the socket used by the magnet.
const fishCache = new Map<number, ReturnType<Px['canvas']>>();
function tinFish(angle: number) {
  const key = Math.round(angle * 44);
  const cached = fishCache.get(key);
  if (cached) return cached;
  const p = new Px(54, 54),
    a = key / 44,
    c = Math.cos(a),
    s = Math.sin(a);
  const at = (x: number, y: number): XY => [26 + x * c - y * s, 26 + x * s + y * c];
  const polygon = (points: XY[], color: string) =>
    face(
      p,
      points.map(([x, y]) => at(x, y)),
      hx(color),
    );
  const line = (x: number, y: number, u: number, v: number, color: string) =>
    p.line(...at(x, y), ...at(u, v), hx(color));
  polygon(
    [
      [13, 2],
      [21, -1],
      [20, 3],
      [21, 7],
      [13, 5],
    ],
    '#713f4e',
  );
  polygon(
    [
      [14, 3],
      [19, 0],
      [18.6, 3],
      [20, 5.6],
      [14, 4.8],
    ],
    '#ec7566',
  );
  polygon(
    [
      [-1, 2],
      [3, -0.3],
      [7, -1],
      [12, 0],
      [16, 3],
      [13, 6],
      [7, 8],
      [2, 7],
      [-1, 5],
    ],
    '#515664',
  );
  polygon(
    [
      [0, 2],
      [4, 0],
      [8, 0.2],
      [13, 1.6],
      [15, 3],
      [12, 5.5],
      [6, 6.7],
      [2, 6],
      [0, 4.5],
    ],
    '#a0aca8',
  );
  polygon(
    [
      [1, 2],
      [5, 0.2],
      [9, 0.5],
      [12, 1.5],
      [6, 2.3],
      [2, 4],
    ],
    '#dce1cb',
  );
  // A continuous narrow copper neck and one engraved ray keep the fin attached at 1×.
  line(12.5, 3.4, 18.5, 3.4, '#b96858');
  line(15, 3, 19.5, 0.4, '#ffc18c');
  line(5, 1, 6, 3.5, '#748585');
  line(6, 3.5, 4.6, 5.5, '#687e7f');
  for (const [x, y] of [
    [8, 2],
    [10, 3.2],
    [8, 4.5],
    [12, 2.4],
  ])
    line(x, y, x + 1, y + 0.7, '#6d8484');
  line(2, 3, 2.8, 3, '#393e4a');
  p.set(...at(2, 2.3), hx('#eef0d9'));
  // The dark central hole makes the little eye tab legible over both felt and wood.
  p.ell(...at(0, 0.2), 2.5, 2.45, hx('#5d6870'));
  p.ell(...at(0, -0.2), 1.72, 1.73, hx('#d9dfcf'));
  p.set(...at(0, 0), hx('#6b7b78'));
  const canvas = p.canvas();
  fishCache.set(key, canvas);
  return canvas;
}
const starCache = new Map<number, ReturnType<Px['canvas']>>();
function starSprite(tilt: number) {
  const key = Math.round(tilt * 48),
    angle = key / 48;
  const cached = starCache.get(key);
  if (cached) return cached;
  const star = new Px(26, 26);
  const rim: XY[] = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 - angle,
      r = i % 2 ? 5.1 : 10.0;
    return [12.5 + r * Math.cos(a), 12.5 + r * Math.sin(a)];
  });
  face(star, rim, hx('#394757'));
  for (let i = 0; i < 10; i++) {
    const a = rim[i],
      b = rim[(i + 1) % 10],
      cx = 12.5,
      cy = 12.5;
    const inner = (p: XY, s: number): XY => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s];
    face(
      star,
      [inner(a, 0.87), inner(b, 0.87), [cx, cy]],
      hx(['#eef3de', '#97a6a7', '#778995', '#a9b6b7', '#768593'][i % 5]),
    );
    face(
      star,
      [inner(a, 0.62), inner(b, 0.62), [cx, cy]],
      hx(['#ffe19c', '#99623c', '#e8b863', '#90633d', '#f5c976'][i % 5]),
    );
  }
  star.outline(hx('#514d58'));
  star.set(12, 11, hx('#fff2b2'));
  const canvas = star.canvas();
  starCache.set(key, canvas);
  return canvas;
}
export function benchToys(f: FxInput) {
  const n = f.t * 24;
  const fish = fishAt(f.anim === 'trick' ? n : 0);
  const shadowWidth = 10.3 - fish.lift * 3.6;
  f.backdrop.col('#193b46', 0.45 - 0.22 * fish.lift);
  f.backdrop.line(130 - shadowWidth, 103, 130 + shadowWidth, 103);
  f.backdrop.col('#ffffff');
  f.backdrop.img(tinFish(fish.angle), fish.tab[0] - 26, fish.tab[1] - 26);
  f.propAt?.('fishTab', fish.tab);
  const star = starAt(f.anim === 'trick_b' ? n : 0);
  const [x, y] = star.ring,
    [ox, oy] = hook;
  f.backdrop.col('#70533c');
  f.backdrop.line(ox, oy, x, y);
  f.backdrop.col('#d7a96e');
  f.backdrop.line(ox + 1, oy, x + 1, y);
  for (let k = 4; k < cord - 1; k += 5) {
    const u = k / cord;
    f.backdrop.col('#8e683f');
    f.backdrop.dot(ox + (x - ox) * u + 1, oy + (y - oy) * u);
  }
  f.backdrop.col('#ffffff');
  f.backdrop.img(starSprite(star.tilt), star.center[0] - 12.5, star.center[1] - 12.5);
  f.backdrop.col('#677575');
  f.backdrop.dot(x, y);
  f.backdrop.col('#e3dec4');
  f.backdrop.dot(x, y - 1);
  f.propAt?.('star', star.center);
}
