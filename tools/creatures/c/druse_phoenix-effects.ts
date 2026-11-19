import { ellFill, oval } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { xylophoneTips } from '../scenes/druse_phoenix';
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
  if (n < frames.crownRelease || n >= 120) return;
  const crest = fx.points.crown;
  const seat = ramp(n, 65, frames.crownSeat);
  const assembly: XY = [174, 48];
  const worn: XY = [crest[0], crest[1] + 11];
  const center: XY = [assembly[0] + (worn[0] - assembly[0]) * seat, assembly[1] + (worn[1] - assembly[1]) * seat];
  const release = ramp(n, 102, 114);
  if (n >= 53 && release < 1)
    crownBand(fx.above, center, ramp(n, 53, 61) * (1 - release), n);
  for (let i = 0; i < prongs.length; i++) {
    const born = frames.crownRelease + Math.floor(i / 2);
    if (n < born) continue;
    const [dx, dy, radius, angle] = prongs[i];
    const u = ramp(n, born, 57 + (i % 3));
    const scatter = Math.sin(Math.PI * u);
    const root = n < 60 ? fx.pointAt(born / 24, 'wingNear') : center;
    const folded = ramp(n, 105 + i % 3, 116 + i % 3);
    const target: XY = [center[0] + dx, center[1] + dy];
    const wing = fx.points.wingNear;
    const x = root[0] + (target[0] - root[0]) * u + scatter * (i - 3) * 7;
    const y = root[1] + (target[1] - root[1]) * u - scatter * (17 + i * 2.1);
    const returning: XY = [x + (wing[0] - x) * folded, y + (wing[1] - y) * folded];
    shard(fx.above, returning, radius * (1 - .85 * folded),
      angle + tau * scatter * (i % 2 ? .65 : -.61), tourmaline, 1 - folded);
    if (scatter > .30) cross(fx.above, [x - 3, y + 4], 2.2, tourmaline, scatter);
  }
  const clasp = 1 - progress(n, frames.crownSeat, frames.crownSeat + 8);
  if (n >= frames.crownSeat && clasp > 0) cross(fx.above, worn, 8, tourmaline, clasp);
}

const ringR: XY = [35, 47];
function ringCenter([x, y]: XY, n: number): XY {
  const drop = ramp(n, frames.ringClosed, frames.ringRoll);
  const roll = progress(n, frames.ringRoll, 104);
  return [x + 52 - 40 * roll, y - ringR[1] - 30 * (1 - drop)];
}

function ringPoint([x, y]: XY, a: number, radiusOffset = 0): XY {
  const cy = Math.cos(a), sy = Math.sin(a);
  return [
    x + cy * (ringR[0] + radiusOffset) - sy * 10,
    y + sy * (ringR[1] + radiusOffset) + 4 * cy,
  ];
}

function circlePiece(p: Pen, center: XY, a: number, b: number, radii: XY, color: string, alpha: number) {
  const [lo, hi] = radii;
  poly(p, [
    ringPoint(center, a, lo), ringPoint(center, a, hi),
    ringPoint(center, b, hi), ringPoint(center, b, lo),
  ], color, alpha);
}

function hoop(fx: FxInput, n: number) {
  if (n < frames.ringIgnite || n > 122) return;
  const center = ringCenter(fx.feet, n);
  const drawn = progress(n, frames.ringIgnite, frames.ringClosed);
  const frozen = n >= frames.ringCrystal;
  const breakFrame = 104;
  const start = Math.PI / 2;
  if (n < breakFrame) {
    for (let i = 0; i < Math.ceil(40 * drawn); i++) {
      const a = start + i * tau / 40;
      const b = Math.min(start + drawn * tau, a + tau * 1.035 / 40);
      const front = i >= 20;
      const p = front ? fx.above : fx.under;
      const cold = frozen || n >= frames.ringClosed + 1 + (i % 9);
      const palette = cold ? tourmaline : warm;
      const thickness = cold ? 5.4 : 4 + 1.9 * Math.sin(i * 2.7 + n * .56) ** 2;
      const brightness = front ? 1 : .71;
      circlePiece(p, center, a, b, [-thickness, thickness], palette[0], 1);
      circlePiece(p, center, a, b, [-thickness + 1.4, thickness - .7], palette[front ? 3 : 2], 1);
      circlePiece(p, center, a, b, [1.6, thickness - .65], palette[front ? 5 : 3], brightness);
      if (cold && i % 5 === 0) {
        const at = ringPoint(center, a + .05, 2);
        const roll = progress(n, frames.ringRoll, breakFrame);
        shard(p, at, 5.8, a + 1.52 + roll * 1.8, palette, brightness);
      }
    }
    if (n < frames.ringClosed) {
      const source = fx.points.tailTip;
      const tip = ringPoint(center, start + drawn * tau);
      const curve: XY = [(source[0] + tip[0]) / 2, (source[1] + tip[1]) / 2 + 13];
      fx.under.lineS(...source, ...curve, warm[2], .84, .5);
      fx.under.lineS(...curve, ...tip, warm[4], .9, .5);
      cross(fx.above, tip, 6.5, warm);
    }
    if (n >= frames.ringRoll) {
      const foot = ringPoint(center, Math.PI / 2);
      ellFill(fx.under, foot, 17, 3.2, '#171420', .78);
      dust(fx.under, foot, (n - frames.ringRoll) % 10, 7, 13, tourmaline, 5);
    }
  } else {
    const u = progress(n, breakFrame, 122);
    for (let i = 0; i < 18; i++) {
      const a = start + i * tau / 18;
      const [x, y] = ringPoint(center, a);
      const floor = fx.feet[1] + (i % 5) - 2;
      const targetY = y + (floor - y) * u * u;
      const targetX = x + (i % 7 - 3) * 6 * u;
      shard(i < 9 ? fx.under : fx.above, [targetX, targetY], 7 - 5 * u, a + u * 2, tourmaline, 1 - u);
    }
    if (n <= 108) cross(fx.above, [center[0], center[1] + 7], 11, tourmaline, 1 - u);
  }
}

function landing(fx: FxInput, n: number, key: number, palette: string[], duration = 14) {
  const u = progress(n, key, key + duration);
  if (n < key || u >= 1) return;
  const from = fx.pointAt(key / 24, 'footL');
  const at: XY = [from[0], fx.feet[1] + 1];
  const spread = 9 + 28 * u;
  oval(fx.under, at, spread, 2 + 4 * u, palette[3], (1 - u) * .54, .1, 5.8);
  dust(fx.under, at, n - key, duration - 1, 39, palette, 10);
}

function railAnswer(fx: FxInput, n: number, key: number, palette: string[]) {
  const p = fx.over;
  if (!p) return;
  const reach = progress(n, key, key + 12);
  if (n < key || reach >= 1) return;
  const a = 1 - reach;
  const x = -8, y = 5 + reach * 45;
  p.lineS(x, -8, x, y, palette[2], a * .88, .8);
  p.lineS(x + 2, -7, x + 2, y - 2, palette[5], a, .38);
  p.lineS(-8, -8, 8 + 65 * reach, -8, palette[3], a, .62);
  cross(p, [x, y - 2], 6.5, palette, a);
  cross(p, [8 + 65 * reach, -8], 5.3, palette, a);
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
  const [baseX, floorY] = fx.feet;
  const floorX = baseX - 36;
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
      block(side < 0 && n >= split ? fx.under : fx.above, [tx, ty], rot, 1.1 * (1 - 0.26 * burst), side, blackStone, crack, fade);
    }
  }
  if (n > split && n < 106) {
    dust(fx.above, [floorX, floorY - 32], n - split, 26, 86, tourmaline, 30);
    const circle = 1 - ramp(n, split + 2, split + 23);
    oval(fx.under, [floorX, floorY + 1], 18 + burst * 73, 4 + burst * 13, tourmaline[2], circle, 0, tau);
    oval(fx.under, [floorX, floorY], 18 + burst * 73, 4 + burst * 13, tourmaline[5], circle * 0.64, 0.14, 2.9);
  }
  if (n >= 111 && n < 133) {
    landing(fx, n, 111, tourmaline);
    const k = progress(n, 109, 131);
    cross(fx.above, [fx.points.wingNear[0] + 4, fx.points.wingNear[1] - 3], 3.8, tourmaline, Math.sin(Math.PI * k));
  }
}

function rebirth(fx: FxInput, n: number) {
  const split = frames.rebirthSplit;
  if (n < 32 || n >= 109) return;
  const rolling = progress(n, 41, 65);
  const x = fx.feet[0] - 55 + 112 * rolling;
  const y = fx.feet[1] + 1 - 5 * Math.sin(Math.PI * rolling * 3) ** 2;
  const close = ramp(n, 32, 41);
  const crack = ramp(n, 64, split - 1);
  const opened = ramp(n, split, split + 11);
  const scatter = progress(n, split, 97);
  const ink = (n >= 41 ? 1 : ramp(n, 32, 38)) * (1 - ramp(n, 89, 99));
  const gap = 29 * (1 - close) + 40 * opened + 19 * scatter;
  const rotation = rolling * tau + .11 * Math.sin(rolling * tau);
  ellFill(fx.under, [x, y + 1], 24 * (1 - .64 * opened), 4, '#1b1427', ink * .74);
  ellFill(fx.under, [x, y - 25], 33 + 25 * opened, 31, warm[2], ink * .24);
  if (ink > 0) {
    // A moving rear stone and opaque front lid share the same hinge and floor.
    block(fx.under, [x - gap, y - 17 * opened], rotation - .89 * opened, .98, -1, moltenStone, crack, ink);
    block(fx.above, [x + gap, y + 13 * opened], rotation + .94 * opened, .98, 1, moltenStone, crack, ink);
  }
  if (n >= 39 && n < 65) dust(fx.under, [x, y], (n - 38) % 10, 8, 21, warm, 10);
  if (n >= split) {
    const alpha = 1 - scatter;
    oval(fx.under, [x, fx.feet[1]], 16 + 113 * scatter, 3 + 19 * scatter, warm[3], alpha, 0, tau);
    dust(fx.above, [x, y - 24], n - split, 40, 87, warm, 22);
    const point = [x - 5, y - 31] as XY;
    const flash = 1 - progress(n, split, split + 6);
    cross(fx.above, point, 25 * flash, warm, flash);
  }
}

function phase(fx: FxInput, n: number) {
  const wave = progress(n, 15, 26);
  if (n < 15 || n > 43) return;
  const markers = ['tailTip', 'tail', 'pelvis', 'chest', 'head'] as const;
  const cursor = wave * (markers.length - 1);
  const segment = Math.min(markers.length - 2, Math.floor(cursor));
  const u = cursor - segment;
  const a = fx.points[markers[segment]], b = fx.points[markers[segment + 1]];
  const spot: XY = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  if (n <= 26) {
    oval(fx.above, spot, 15, 12, warm[3], .95, .18, 5.85);
    cross(fx.above, spot, 8, warm);
    cross(fx.under, [spot[0] - 11, spot[1] + 8], 5, warm, .82);
  }
  const flash = ramp(n, 24, 26) * (1 - ramp(n, 27, 33));
  if (flash > 0) {
    const head = fx.points.head;
    ellFill(fx.above, head, 26, 27, warm[5], flash * .36);
    cross(fx.above, head, 27 * flash, warm, flash);
    if (fx.over) {
      const p = fx.over;
      p.lineS(17, -8, 238, -8, warm[4], flash * .72, .48);
      cross(p, [128, -9], 8, warm, flash);
    }
  }
  dust(fx.above, fx.points.chest, n - 27, 19, 67, warm, 6);
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
      crown(fx, n);
      if (n >= 23 && n < 35) railAnswer(fx, n, 23, tourmaline);
      return landing(fx, n, 100, tourmaline);
    case 'trick_b':
      for (const [i, begin] of frames.notes.entries()) {
        const age = n - begin;
        if (age < 0 || age >= 9) continue;
        const at = xylophoneTips[i];
        const glow = 1 - age / 9;
        cross(fx.above, at, 7, tourmaline, glow * .9);
        dust(fx.above, at, age, 8, 23, tourmaline, -5);
      }
      landing(fx, n, 37, tourmaline);
      return landing(fx, n, 110, tourmaline);
    case 'trick-f2':
      hoop(fx, n);
      if (n >= 17 && n < 29) railAnswer(fx, n, 17, warm);
      return landing(fx, n, 111, warm, 11);
    case 'trick_b-f2':
      rebirth(fx, n);
      return landing(fx, n, 110, warm);
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
