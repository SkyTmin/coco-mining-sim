import { ellFill, oval } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { clamp, frames, progress, ramp } from './druse_phoenix-timing';

const tau = Math.PI * 2;
const tourmaline = ['#071b25', '#163947', '#19676b', '#369a8d', '#7cd7b4', '#d2fbd2'];
const warm = ['#31172b', '#74273b', '#bd4343', '#ef7750', '#ffc263', '#fff0ab'];
type Shape = readonly XY[];

function poly(p: Pen, outline: Shape, color: string, alpha: number) {
  p.col(color, alpha);
  fillPoly(p, outline.flat());
}

function shard(p: Pen, [x, y]: XY, length: number, angle: number, palette: string[], alpha: number) {
  if (length < 0.75 || alpha <= 0) return;
  const u = Math.cos(angle), v = Math.sin(angle);
  const point = (h: number, k: number): XY => [x + length * (h * u - k * v), y + length * (h * v + k * u)];
  const tip = point(0.05, -1.4), heel = point(-0.07, 0.75);
  const left = point(-0.44, -0.26), right = point(0.38, -0.08), ridge = point(0.04, -0.11);
  poly(p, [tip, right, heel, left], palette[0], alpha);
  poly(p, [point(0.04, -1.12), ridge, point(-0.06, 0.57), point(-0.35, -0.25)], palette[3], alpha);
  poly(p, [point(0.04, -1.12), point(0.3, -0.08), point(-0.06, 0.57), ridge], palette[2], alpha);
  poly(p, [point(0.04, -1.12), point(0.19, -0.62), ridge, point(-0.18, -0.39)], palette[4], alpha);
  p.lineS(...point(0.04, -1.1), ...ridge, palette[5], alpha * 0.89, 0);
}

function cross(p: Pen, [x, y]: XY, radius: number, palette: string[], alpha = 1) {
  if (alpha <= 0 || radius < 0.9) return;
  poly(p, [
    [x - radius, y], [x - 1, y - 1], [x, y - radius],
    [x + 1, y - 1], [x + radius, y], [x + 1, y + 1],
    [x, y + radius], [x - 1, y + 1],
  ], palette[4], alpha);
  p.col(palette[5], alpha);
  p.dot(x - 0.5, y - 0.5, 2, 2);
}

function dust(p: Pen, position: XY, n: number, count: number, span: number, palette: string[], gravity = 18) {
  if (n < 0 || n > 36) return;
  for (let i = 0; i < count; i++) {
    const u = clamp((n - (i % 3)) / (23 + i % 12));
    if (u <= 0 || u >= 1) continue;
    const a = (i * 2.39996) % tau;
    const length = span * (0.47 + ((i * 31) % 13) / 24);
    const x = position[0] + Math.cos(a) * length * u;
    const y = position[1] + Math.sin(a) * length * 0.82 * u - 5 * u + gravity * u * u;
    const radius = (i % 5 === 0 ? 4 : i % 3 ? 1.6 : 2.65) * (1 - 0.66 * u);
    if (i % 5 === 0) shard(p, [x, y], radius, a + u * 1.5, palette, 1 - u);
    else cross(p, [x, y], radius, palette, 1 - u);
  }
}

// Seven detached feathers end in their own setting. The centre fan is taller than the twins.
const prongs: readonly [number, number, number, number][] = [
  [-19, -4, 5, -0.48],
  [-13, -7, 7, -0.33],
  [-7, -10, 8, -0.18],
  [0, -13, 10, 0],
  [7, -10, 8, 0.18],
  [13, -7, 7, 0.33],
  [19, -4, 5, 0.48],
];
function crownBand(p: Pen, [x, y]: XY, a: number, n: number) {
  poly(p, [[x - 23, y - 6], [x - 17, y - 9], [x, y - 7], [x + 17, y - 9],
    [x + 23, y - 6], [x + 16, y + 4], [x, y + 6], [x - 16, y + 4]], tourmaline[0], a);
  poly(p, [[x - 21, y - 6], [x - 17, y - 8], [x, y - 5], [x + 17, y - 8],
    [x + 21, y - 6], [x + 15, y + 1], [x, y + 4], [x - 15, y + 1]], tourmaline[2], a);
  poly(p, [[x - 20, y - 6], [x, y - 3], [x + 20, y - 6], [x + 15, y - 2], [x, y], [x - 15, y - 2]], tourmaline[4], a);
  p.col(tourmaline[5], a * 0.88);
  p.line(x - 17, y - 7, x - 4, y - 4);
  p.line(x - 4, y - 4, x + 11, y - 5);
  for (const k of [-13, -7, 0, 7, 13]) {
    p.col(k === 0 ? '#ffeea7' : tourmaline[4], a);
    p.dot(x + k, y + 0.5 + (k === 0 ? 1 : Math.abs(k) < 10 ? 0 : -1), k === 0 ? 2 : 1, 2);
  }
  cross(p, [x + 12, y - 6], 2 + 1.4 * Math.sin(n * 0.29) ** 4, tourmaline, a);
}

function crown(fx: FxInput, n: number) {
  if (n < frames.crownRelease || n > 124) return;
  const root = fx.points.crown;
  const source = n < 63 ? fx.pointAt(frames.crownRelease / 24, 'wingNear') : root;
  const floating = ramp(n, 43, 61);
  const descending = ramp(n, 66, frames.crownSeat);
  const unmake = ramp(n, 110, 124);
  const free: XY = [root[0] + 17 * (1 - descending), Math.max(14, root[1] - 21 * (1 - descending) + 14 * descending)];
  const born = n >= 50;
  if (born && n < 124) crownBand(fx.above, free, ramp(n, 50, 65) * (1 - unmake), n);
  for (let i = 0; i < prongs.length; i++) {
    const [dx, dy, radius, angle] = prongs[i];
    const launch = frames.crownRelease + i * 2;
    if (n < launch) continue;
    const age = progress(n, launch, 55 + i);
    const flourish = Math.sin(Math.PI * age);
    const [fromX, fromY] = [source[0] + (i - 3) * 2.5, source[1] + (3 - i) * 1.7];
    const [toX, toY] = [free[0] + dx, free[1] + dy];
    const x = fromX + (toX - fromX) * age + flourish * (i - 3) * 6.8 + unmake * (i - 3) * 3.4;
    const y = fromY + (toY - fromY) * age - flourish * (21 + i * 2.3) - unmake * (13 + i * 2.9);
    const spin = angle + tau * (1 - floating) * age * (i % 2 ? 0.91 : -1.3);
    const a = 1 - unmake;
    for (let j = 3; j >= 1; j--) {
      const trail = flourish * j / 3;
      cross(fx.above, [x - 2 * j * (i - 2) * trail, y + 4 * j * trail], 2.1 - 0.29 * j, tourmaline, a * trail * 0.83);
    }
    shard(fx.above, [x, Math.max(5, y)], radius * (0.88 + 0.12 * floating), spin, tourmaline, a);
    if ((i + n) % 17 < 4) cross(fx.above, [x - 2, y - 4], 2.2, tourmaline, a);
  }
  if (n <= frames.crownSeat + 14)
    dust(fx.above, [root[0], root[1] - 7], n - frames.crownSeat, 11, 24, tourmaline, -10);
}

const ringR: XY = [33, 47];
function ringCenter(fx: FxInput, n: number): XY {
  const [x, y] = fx.feet;
  const drop = ramp(n, frames.ringClosed, frames.ringRoll);
  const roll = ramp(n, frames.ringRoll, 107);
  return [x + 50 - 62 * roll, y - ringR[1] - 22 * (1 - drop)];
}

function ringPoint([x, y]: XY, a: number, radiusOffset = 0): XY {
  const cy = Math.cos(a), sy = Math.sin(a);
  return [
    x + cy * (ringR[0] + radiusOffset) - sy * 11,
    y + sy * (ringR[1] + radiusOffset),
  ];
}

function circlePiece(p: Pen, center: XY, a: number, b: number, radii: XY, color: string, alpha: number) {
  const [lo, hi] = radii;
  poly(p, [
    ringPoint(center, a, lo), ringPoint(center, a, hi),
    ringPoint(center, b, hi), ringPoint(center, b, lo),
  ], color, alpha);
}

function fireLoop(fx: FxInput, center: XY, n: number, alpha: number) {
  const open = progress(n, frames.ringIgnite, frames.ringClosed);
  const start = 2.68;
  for (let i = 0; i < Math.ceil(52 * open); i++) {
    const a = start + (i / 52) * tau;
    const b = Math.min(start + open * tau, a + (1.12 / 52) * tau);
    const wiggle = Math.sin(i * 1.61 + n * 0.37) * 1.1;
    const p = Math.cos(a) > 0 ? fx.above : fx.under;
    circlePiece(p, center, a, b, [-5 + wiggle, 5 + wiggle], warm[0], alpha);
    circlePiece(p, center, a, b, [-3 + wiggle, 4 + wiggle], warm[2], alpha);
    circlePiece(p, center, a, b, [-1 + wiggle, 2.8 + wiggle], warm[4], alpha);
    if (i % 4) circlePiece(p, center, a, b, [-0.45 + wiggle, 0.75 + wiggle], warm[5], alpha);
    if (i % 3 === 0) {
      const at = ringPoint(center, a, 6 + 6 * Math.sin(i * 3.84 + n * 0.19) ** 2);
      cross(p, at, 1.2 + 1.35 * Math.sin(i + n * 0.23) ** 2, warm, alpha * 0.85);
    }
  }
  if (n <= frames.ringClosed) {
    const at = ringPoint(center, start + open * tau);
    const tail = fx.points.tail;
    fx.under.lineS(...tail, ...at, warm[2], alpha * 0.7, 0.5);
    fx.under.lineS(tail[0], tail[1] - 1, at[0], at[1] - 1, warm[4], alpha * 0.72, 0);
    cross(fx.above, at, 5.5, warm, alpha);
  }
}

function crystalHoop(fx: FxInput, center: XY, n: number, alpha: number) {
  const angle = 2.68 - ramp(n, frames.ringRoll, 107) * 1.29;
  const fixed = 32;
  for (let i = 0; i < fixed; i++) {
    const a = angle + (i / fixed) * tau;
    const b = a + (1.06 / fixed) * tau;
    const fore = Math.cos(a) > 0.014;
    const p = fore ? fx.above : fx.under;
    const mix = Math.sin(a - 0.8) > 0 ? 0 : 1;
    circlePiece(p, center, a, b, [-5.3, 5.6], tourmaline[0], alpha);
    circlePiece(p, center, a, b, [-4, 4.4], tourmaline[2 + mix], alpha);
    circlePiece(p, center, a, b, [0.45, 4.25], tourmaline[3 + mix], alpha);
    const edge = ringPoint(center, a, 4);
    const inner = ringPoint(center, b, -3.6);
    p.lineS(...edge, ...inner, tourmaline[i % 4 === 1 ? 5 : 2], alpha * 0.91, 0.32);
    if (i % 4 === 0) {
      const jewel = ringPoint(center, a, 2.2);
      shard(p, jewel, 6, a + 1.52, tourmaline, alpha);
      if ((i + Math.floor(n)) % 9 === 0) cross(p, jewel, 3.7, tourmaline, alpha);
    }
  }
  if (n >= frames.ringRoll) {
    const [x, y] = [center[0] - 11, fx.feet[1] + 1];
    ellFill(fx.under, [x, y], 14, 3.6, '#131925', 0.62 * alpha);
    oval(fx.under, [x, y], 12, 3, tourmaline[3], alpha * 0.7, 0.28, 2.9);
    if (n < 105) dust(fx.under, [x, y], (n - frames.ringRoll) % 13, 8, 11, tourmaline, 5);
  }
}

function hoop(fx: FxInput, n: number) {
  if (n < frames.ringIgnite || n >= 125) return;
  const center = ringCenter(fx, n);
  const cooling = ramp(n, frames.ringClosed, frames.ringCrystal);
  const gone = ramp(n, 113, 125);
  if (cooling < 1) fireLoop(fx, center, n, 1 - cooling);
  if (cooling > 0) crystalHoop(fx, center, n, cooling * (1 - gone));
  if (n >= frames.ringJump && n <= 124)
    dust(fx.above, ringPoint(center, -2.05), n - frames.ringJump, 11, 34, tourmaline, 7);
}

const blackStone = ['#151925', '#29323e', '#3e4650', '#59636a', '#7d8380', '#a2a7a1'];
const moltenStone = ['#31182b', '#50243a', '#823541', '#c8594b', '#ef9b57', '#ffc17e'];
const stoneLeft: Shape = [[-1, -1], [-17, 0], [-26, -10], [-28, -22], [-25, -35],
  [-16, -48], [-6, -51], [0, -44], [-5, -34], [2, -28], [-4, -19], [2, -13]];
const stoneRight: Shape = [[-1, -1], [2, -13], [-4, -19], [2, -28], [-5, -34], [0, -44], [-6, -51],
  [9, -49], [23, -39], [28, -26], [26, -15], [18, -4], [9, 1]];
const cleavage: Shape = [[-6, -51], [0, -44], [-5, -34], [2, -28], [-4, -19], [2, -13], [-1, -1]];

function block(
  p: Pen, origin: XY, rotation: number, size: number, side: -1 | 1, palette: string[],
  fissure: number, alpha: number, oldCenterY = 0,
) {
  const shape = side < 0 ? stoneLeft : stoneRight;
  const pivot = -24;
  const u = Math.cos(rotation), v = Math.sin(rotation);
  const point = ([x, y]: XY): XY => [
    origin[0] + size * (x * u - (y - pivot) * v),
    origin[1] + size * (pivot + x * v + (y - pivot) * u) - oldCenterY,
  ];
  const face = (coords: Shape, c: number, a = alpha) => poly(p, coords.map(point), palette[c], a);
  face(shape, 0);
  face(shape.map(([x, y]): XY => [x * 0.925, pivot + (y - pivot) * 0.925]), 1);
  const e = side;
  face([[e * 3, -4], [e * 17, -5], [e * 24, -14], [e * 22, -27], [e * 16, -25], [e * 9, -11]], 2);
  face([[e * 5, -49], [e * 16, -45], [e * 24, -34], [e * 22, -27], [e * 11, -26], [e * 5, -35]], 3);
  face([[e * 5, -49], [e * 15, -45], [e * 18, -37], [e * 10, -37], [e * 5, -42]], 4);
  face([[e * 23, -33], [e * 16, -30], [e * 14, -19], [e * 21, -21], [e * 24, -27]], 4);
  face([[e * 6, -35], [e * 12, -29], [e * 13, -23], [e * 7, -21], [e * 3, -28]], 2);
  face([[e * 8, -20], [e * 14, -20], [e * 16, -13], [e * 10, -9], [e * 6, -15]], 3);
  for (let i = 0; i < 28; i++) {
    const x = e * (7 + ((i * 13) % 16)), y = -10 - ((i * 37) % 34);
    if ((x / 23) ** 2 + ((y + 25) / 22) ** 2 > 1.19 || Math.abs(x) * size < 3) continue;
    const [px, py] = point([x, y]);
    p.col(palette[i % 4 ? 0 : 5], alpha * (i % 4 ? 0.43 : 0.57));
    p.dot(px, py, i % 9 === 0 ? 2 : 1, 1);
  }
  const crackColor = palette === blackStone ? tourmaline : warm;
  for (let i = 1; i < cleavage.length; i++) {
    const a = point(cleavage[i - 1]), b = point(cleavage[i]);
    if (fissure * 7 < i) break;
    p.lineS(a[0] + e, a[1] - 1, b[0] + e, b[1] - 1, crackColor[2], alpha * 0.75, 0.2);
    p.lineS(...a, ...b, crackColor[4], alpha, 0.72);
    if (i % 2 === 1) p.lineS(a[0] + e * 2, a[1], b[0] + e * 4, b[1] - 3, crackColor[3], alpha * 0.83, 0);
    if (i < 4) p.lineS(a[0] - e, a[1], b[0] - e, b[1], crackColor[5], alpha * 0.93, 0);
  }
}

function rollShow(fx: FxInput, n: number) {
  const [floorX, floorY] = fx.feet;
  const split = frames.showSplit;
  const rolling = 1 - (1 - progress(n, 0, 37)) ** 2.25;
  const x = floorX - 153 * (1 - rolling);
  const bounce = 10 * Math.abs(Math.sin(rolling * 9)) * (1 - rolling);
  const y = floorY - bounce;
  const spin = -tau * 1.63 * (1 - rolling);
  const wobble = n > 37 && n < 55 ? Math.sin((n - 37) * 1.14) * 0.13 * (1 - progress(n, 37, 55)) : 0;
  const crack = ramp(n, 43, split - 1);
  const burst = progress(n, split, 87);
  const fade = 1 - ramp(n, 83, 94);
  if (n < 94) {
    ellFill(fx.under, [x, floorY + 1], 27 * (1 - 0.55 * burst), 5, '#111320', 0.72 * fade);
    ellFill(fx.above, [x, y - 28], 24 * (1 + burst), 33 * (1 + burst), tourmaline[3], 0.12 * crack * fade);
    for (const side of [-1, 1] as const) {
      const tx = x + side * (4 * burst + 49 * Math.sin(burst * 1.13));
      const ty = y - 25 * Math.sin(burst * Math.PI);
      const rot = spin + wobble + side * burst * 1.64;
      block(fx.above, [tx, ty], rot, 1.1 * (1 - 0.26 * burst), side, blackStone, crack, fade);
    }
  }
  if (n > split && n < 106) {
    dust(fx.above, [floorX, floorY - 32], n - split, 26, 86, tourmaline, 30);
    const circle = 1 - ramp(n, split + 2, split + 23);
    oval(fx.under, [floorX, floorY + 1], 18 + burst * 73, 4 + burst * 13, tourmaline[2], circle, 0, tau);
    oval(fx.under, [floorX, floorY], 18 + burst * 73, 4 + burst * 13, tourmaline[5], circle * 0.64, 0.14, 2.9);
  }
  if (n > 102 && n < 133) {
    dust(fx.under, [floorX, floorY], n - 102, 13, 51, tourmaline, 9);
    const k = progress(n, 109, 131);
    cross(fx.above, [fx.points.wingNear[0] + 4, fx.points.wingNear[1] - 3], 3.8, tourmaline, Math.sin(Math.PI * k));
  }
}

function rebirth(fx: FxInput, n: number) {
  const split = frames.rebirthSplit;
  if (n < 18 || n >= 115) return;
  const x = fx.feet[0];
  const y = fx.feet[1] - 11 - 6 * Math.sin((n - 22) * 0.11);
  const gather = ramp(n, 18, 37);
  const fissure = ramp(n, 43, split - 1);
  const explode = progress(n, split, 88);
  const a = gather * (1 - ramp(n, 75, 92));
  const pulse = Math.sin(n * (0.2 + fissure * 0.12)) ** 2;
  if (a > 0) {
    const span = 31 + explode * 23;
    ellFill(fx.under, [x, fx.feet[1] + 1], 22 * (1 - explode * 0.79), 4, '#301b27', 0.64 * a);
    ellFill(fx.under, [x, y - 30], span, span * 1.17, warm[2], 0.25 * a);
    ellFill(fx.under, [x, y - 30], span * 0.78, span, warm[4], a * (0.13 + pulse * 0.1));
    for (const side of [-1, 1] as const) {
      const spread = 41 * (1 - gather) + Math.sin(explode * 1.73) * 76;
      block(
        fx.above,
        [x + side * spread, y - 26 * Math.sin(Math.PI * explode) - 7 * (1 - gather)],
        side * ((1 - gather) * 0.55 + explode * 2),
        0.84 + 0.39 * gather, side, moltenStone, fissure, a,
      );
    }
    const flicker = (0.47 + pulse * 0.53) * fissure;
    cross(fx.above, [x - 5, y - 37], 4 + 7 * fissure, warm, flicker * a);
  }
  if (n >= split) {
    const age = n - split;
    dust(fx.above, [x, y - 30], age, 43, 95, warm, 21);
    const wave = progress(n, split, split + 35);
    const alpha = 1 - wave;
    oval(fx.under, [x, fx.feet[1]], 12 + wave * 109, 4 + wave * 22, warm[1], alpha, 0, tau);
    oval(fx.under, [x, fx.feet[1] - 1], 12 + wave * 109, 4 + wave * 22, warm[4], alpha * 0.81, 0, tau);
    if (age < 9) cross(fx.above, [x, y - 32], 28 * (1 - age / 9), warm, alpha);
  }
}

function phase(fx: FxInput, n: number) {
  const a = ramp(n, 6, 18) * (1 - ramp(n, 32, 45));
  if (a <= 0) return;
  const [x, y] = fx.points.chest;
  const u = progress(n, 6, 44);
  const floor = fx.feet;
  ellFill(fx.under, floor, 21 + u * 37, 6 + u * 7, warm[1], a * 0.58);
  oval(fx.under, floor, 18 + u * 36, 4 + u * 7, warm[4], a * 0.8, 0.12, 6.2);
  ellFill(fx.under, [x, y], 30, 37, warm[2], a * 0.25);
  const sweeps: readonly [string, number][] = [['chest', 12], ['wingNear', 19], ['wingFar', 23], ['tail', 28]];
  for (const [key, when] of sweeps) {
    const pos = fx.points[key];
    const pulse = ramp(n, when - 5, when) * (1 - ramp(n, when + 1, when + 11));
    cross(fx.above, pos, 2.6 + pulse * 5.6, warm, pulse);
    dust(fx.above, pos, n - when, 7, 28, warm, -11);
  }
}

function everyday(fx: FxInput, n: number) {
  if (fx.anim === 'sleep' || fx.anim === 'sleep_in') {
    const stem = fx.points.beak;
    const entrance = fx.anim === 'sleep_in' ? ramp(n, 20, 29) : 1;
    for (let i = 0; i < 3; i++) {
      const q = ((n + i * 28) % 84) / 84;
      const a = Math.sin(Math.PI * q) ** 1.2 * entrance * 0.65;
      const x = stem[0] + 13 + 12 * q + 2 * Math.sin(q * 9 + i);
      const y = stem[1] - 6 - 37 * q;
      cross(fx.above, [x, y], 1.5 + q * 2.7, tourmaline, a);
    }
    return;
  }
  const flight = fx.anim === 'hatch' ? 18 : fx.anim === 'happy-f2' ? 10 : 9;
  const palette = fx.anim === 'happy-f2' ? warm : tourmaline;
  const at = fx.points.wingNear;
  if (n > flight && n < 45) {
    dust(fx.above, at, n - flight, 14, 36, palette, 6);
    const a = ramp(n, flight, flight + 4) * (1 - ramp(n, 18, 27));
    cross(fx.above, [at[0] - 2, at[1] - 1], 5.5, palette, a);
    cross(fx.above, [fx.points.crest[0] + 7, fx.points.crest[1] - 6], 3.6, palette, a);
  }
  if (fx.anim === 'hatch' && n >= 16 && n < 43) {
    const u = progress(n, 16, 43);
    oval(fx.under, fx.feet, 7 + u * 46, 2 + u * 8, tourmaline[4], 1 - u, 0, tau);
    dust(fx.above, fx.feet, n - 16, 14, 63, tourmaline, 16);
  }
}

export function effects(fx: FxInput): void {
  const n = fx.t * 24;
  switch (fx.anim) {
    case 'trick':
      return crown(fx, n);
    case 'trick-f2':
      return hoop(fx, n);
    case 'trick_b-f2':
      return rebirth(fx, n);
    case 'show':
      return rollShow(fx, n);
    case 'phase':
      return phase(fx, n);
    case 'happy':
    case 'happy-f2':
    case 'hatch':
    case 'sleep_in':
    case 'sleep':
      return everyday(fx, n);
  }
}
