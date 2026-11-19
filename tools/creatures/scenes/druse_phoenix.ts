import type { Canvas } from '@napi-rs/canvas';
import { frames as timing } from '../c/druse_phoenix-timing';
import { fillPoly } from '../fx/pen';
import { clamp01, easeOut, hash, hx, mixc, sstep, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { FxInput, Scene, XY } from '../types';
import { face } from './relief';

type Mineral = 'smoky' | 'amethyst' | 'aquamarine';
type Prism = [x: number, y: number, tx: number, ty: number, width: number, mineral: Mineral];
const stone = ['#16131f', '#272032', '#3c2d47', '#54425a', '#7d667a'].map(c => hx(c));
const light = hx('#f2b78a');
const palettes: Record<Mineral, RGBA[]> = {
  smoky: ['#181b2a', '#2c3040', '#44455a', '#5e5d70', '#7e788a', '#ada1ab'].map(c => hx(c)),
  amethyst: ['#1e182b', '#34253f', '#4c355d', '#69487a', '#896396', '#b998b4'].map(c => hx(c)),
  aquamarine: ['#13202b', '#223441', '#325260', '#49717b', '#709491', '#afd0bb'].map(c => hx(c)),
};

const xylophone: Prism[] = [
  [176, 145, 173, 125, 6, 'aquamarine'],
  [191, 145, 191, 117, 7, 'amethyst'],
  [210, 145, 210, 109, 8, 'amethyst'],
];
export const xylophoneTips: XY[] = xylophone.map(([, , x, y]) => [x, y]);

// Drift quartz runs along the inside lip; large prisms sit on its nearer shelves.
const leftWall: Prism[] = [
  [5, 116, 27, 97, 8, 'amethyst'], [15, 125, 39, 92, 9, 'smoky'],
  [14, 130, 25, 67, 11, 'amethyst'], [17, 132, 43, 103, 8, 'amethyst'],
  [7, 136, 18, 104, 6, 'aquamarine'], [23, 133, 41, 112, 5, 'smoky'],
  [31, 134, 49, 123, 4, 'aquamarine'], [34, 134, 39, 120, 4, 'amethyst'],
  [20, 137, 27, 123, 6, 'aquamarine'], [45, 135, 51, 125, 4, 'amethyst'],
  [49, 136, 59, 132, 4, 'smoky'],
];
const crownWall: Prism[] = [
  [150, 11, 153, 28, 5, 'smoky'], [164, 14, 155, 39, 6, 'amethyst'],
  [177, 19, 171, 35, 5, 'aquamarine'], [185, 17, 175, 48, 9, 'smoky'],
  [192, 20, 191, 57, 9, 'amethyst'], [204, 29, 196, 62, 7, 'amethyst'],
  [212, 33, 208, 49, 5, 'aquamarine'], [220, 39, 213, 64, 7, 'smoky'],
  [229, 41, 214, 72, 8, 'amethyst'], [239, 56, 224, 76, 7, 'amethyst'],
  [250, 66, 226, 87, 7, 'aquamarine'], [254, 74, 223, 100, 10, 'smoky'],
];
const rightWall: Prism[] = [
  [251, 134, 242, 77, 9, 'amethyst'], [238, 135, 231, 99, 8, 'amethyst'],
  [240, 142, 228, 114, 7, 'smoky'], [253, 146, 247, 103, 10, 'aquamarine'],
  [226, 143, 223, 125, 4, 'aquamarine'], [216, 146, 222, 132, 6, 'amethyst'],
  [233, 148, 241, 133, 5, 'amethyst'], [249, 150, 254, 128, 6, 'amethyst'],
];
const nearLeft: Prism[] = [
  [3, 194, 13, 158, 8, 'aquamarine'], [11, 197, 30, 171, 9, 'amethyst'],
  [17, 201, 43, 185, 7, 'smoky'], [10, 202, 25, 183, 7, 'aquamarine'],
  [26, 205, 40, 194, 6, 'amethyst'], [4, 205, 11, 193, 5, 'amethyst'],
];
const nearRight: Prism[] = [
  [251, 200, 236, 156, 9, 'amethyst'], [246, 204, 225, 174, 8, 'smoky'],
  [254, 207, 245, 176, 8, 'aquamarine'], [239, 208, 214, 190, 7, 'amethyst'],
  [248, 206, 232, 190, 7, 'aquamarine'],
];
const backPrisms = [...leftWall, ...crownWall, ...rightWall, ...xylophone];

function prism(p: Px, [x, y, tx, ty, width, mineral]: Prism, flare = 0) {
  const dx = tx - x, dy = ty - y;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const nx = -dy / length, ny = dx / length;
  const at = (along: number, across: number): XY => [x + dx * along + nx * across, y + dy * along + ny * across];
  const a = at(0, -width * .61), b = at(.02, width * .6);
  const left = at(.73, -width), right = at(.76, width * .89), join = at(.65, -width * .12);
  const ridge = at(0, -width * .15), tip: XY = [tx, ty];
  const pal = palettes[mineral];
  const c = (i: number) => flare ? mixc(pal[i], light, flare * (i + 2) / 7) : pal[i];
  face(p, [a, left, tip, right, b], c(0));
  face(p, [a, left, join, ridge], c(2));
  face(p, [ridge, join, right, b], c(1));
  if (width > 4) face(p, [ridge, join, at(.76, width * .27), at(.08, width * .26)], c(2));
  face(p, [left, tip, join], c(4));
  face(p, [join, tip, right], c(3));
  p.line(...left, ...at(.96, -width * .1), c(5));
  p.line(...join, ...ridge, c(3));
  p.line(...at(.72, width * .78), ...at(.11, width * .6), c(0));
  if (width >= 6) {
    // Growth terraces and fractures continue through the prism's plane breaks.
    p.line(...at(.43, -width * .7), ...at(.37, -width * .13), c(3));
    p.line(...at(.37, -width * .13), ...at(.49, width * .58), c(2));
    p.line(...at(.22, -width * .58), ...at(.17, -width * .14), c(0));
    p.line(...at(.56, -width * .18), ...at(.62, -width * .22), c(4));
    p.set(...at(.48, -width * .34), c(4));
    p.set(...at(.64, -width * .72), c(5));
  }
  p.set(tx, ty, c(5));
}

const rimLine: XY[] = [
  [-5, 126], [3, 73], [10, 46], [26, 34], [35, 20], [55, 9],
  [75, 4], [89, 1], [97, 6], [116, 8], [130, 12], [151, 12], [168, 15],
  [190, 19], [206, 27], [219, 40], [232, 46], [242, 64], [256, 80], [265, 145],
];
function roof(p: Px) {
  for (let y = 0; y < p.h; y++) {
    const k = Math.round(Math.min(1, y / 152) * 8) / 8;
    p.rect(0, y, p.w - 1, y, mixc(hx('#151525'), hx('#262436'), k));
  }
  const shade = hx('#1e1d2f'), deep = hx('#151624'), lateral = hx('#282437');
  face(p, [[0, 32], [48, 36], [74, 25], [103, 34], [137, 29], [166, 44], [210, 49], [256, 69], [256, 113], [0, 105]], shade);
  face(p, [[0, 84], [47, 67], [65, 50], [92, 47], [107, 52], [144, 46], [171, 52], [192, 67], [218, 63], [256, 97], [256, 131], [0, 125]], lateral);
  face(p, [[53, 78], [66, 64], [93, 56], [125, 60], [152, 59], [178, 75], [189, 97], [140, 104], [77, 100]], deep);
  face(p, [[52, 85], [61, 77], [82, 73], [93, 63], [123, 61], [140, 65], [155, 63], [174, 78], [148, 73], [129, 75], [100, 68], [91, 77], [68, 80]], shade);
  // The shell exposes three irregular beds of quartz and a coarser outer rock.
  const outside = (x: number, y: number, f: number): XY => [x + (x - 124) * f, y + (y - 98) * f];
  for (let i = 1; i < rimLine.length; i++) {
    const [x, y] = rimLine[i - 1], [nx, ny] = rimLine[i];
    const u = hash(i, 311), v = hash(i, 312);
    const a = outside(x, y, .07), b = outside(nx, ny, .07);
    const c = outside(x, y, .17 + .027 * Math.sin(i * 1.51));
    const d = outside(nx, ny, .17 + .027 * Math.sin((i + 1) * 1.51));
    const e = outside(x, y, .32), f = outside(nx, ny, .32);
    face(p, [[x, y], [nx, ny], b, a], mixc(stone[1], stone[3], .25 + .54 * u));
    face(p, [a, b, d, c], mixc(stone[3], stone[4], .18 + .31 * v));
    face(p, [c, d, f, e], mixc(stone[1], stone[3], .22 + .43 * u));
    face(p, [e, f, outside(nx, ny, 1), outside(x, y, 1)], stone[1]);
    p.line(...a, ...b, mixc(stone[3], stone[4], .49 + .34 * u));
    p.line(...c, ...d, mixc(stone[1], stone[3], v * .57));
    p.line(...a, ...e, mixc(stone[2], stone[4], u * .36));
    face(p, [a, b, c], mixc(stone[2], stone[3], v));
    for (let s = 0; s < 10; s++) {
      const k = hash(i, s, 415), f = .024 + .22 * hash(i, s, 784);
      const point = outside(x + (nx - x) * k, y + (ny - y) * k, f);
      p.set(...point, mixc(stone[2], stone[4], v * .69 + .19 * (s % 2)));
    }
  }
  // Dead-end side galleries and cleavage diagonals inside the opening.
  face(p, [[0, 75], [10, 52], [28, 43], [38, 44], [32, 61], [16, 80], [6, 113], [0, 119]], stone[2]);
  face(p, [[2, 69], [15, 57], [30, 48], [18, 62], [8, 78], [0, 82]], stone[3]);
  face(p, [[255, 94], [235, 75], [219, 70], [228, 91], [245, 104], [255, 122]], stone[2]);
  for (const [x, y, dx, dy] of [[16, 96, 9, -19], [21, 68, 24, -21], [43, 32, 17, -14], [211, 46, 13, 8], [233, 79, 14, 13], [223, 88, 18, 14]]) {
    p.line(x, y, x + dx * .68, y + dy * .53, stone[4]);
    p.line(x + dx * .66, y + dy * .53, x + dx, y + dy, stone[3]);
  }
}

function ground(p: Px) {
  const horizon = (x: number) => Math.round(84 + Math.abs(x - 120) * .16 + 5 * Math.sin(x * .039));
  const floor = ['#292536', '#352d40', '#453749', '#534050', '#695263'].map(c => hx(c));
  const cells: {x: number; y: number; span: number; tall: number; seed: number}[] = [];
  for (let row = -1; row <= 9; row++)
    for (let col = -1; col <= 10; col++) {
      const seed = (row + 2) * 16 + col + 2;
      cells.push({
        x: col * 27 + (row % 2) * 13 + hash(seed, 11) * 12,
        y: 86 + row * 15 + hash(seed, 12) * 9,
        span: hash(seed, 13) * 7,
        tall: hash(seed, 14) * 3,
        seed,
      });
    }
  const surfaces = cells.map(({seed}) => floor.map((v, i) =>
    mixc(v, i < 2 ? hx('#312338') : hx('#5a4863'), .7 * hash(seed, 997)),
  ));
  for (let x = 0; x < p.w; x++) {
    for (let y = horizon(x); y < p.h; y++) {
      let first = Infinity, second = Infinity, best = 0;
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j], dy = y - cell.y;
        if (Math.abs(dy) > 23) continue;
        const dx = x - cell.x - dy * 1.05;
        if (Math.abs(dx) > 37) continue;
        const d = dx * dx * .56 + dy * dy * 1.7;
        if (d < first) { second = first; first = d; best = j; }
        else if (d < second) second = d;
      }
      const C = cells[best], strip = y - C.y - (x - C.x) * .22 + C.tall;
      const bevel = second - first;
      const palette = surfaces[best];
      const base = bevel < 7 ? palette[0] : bevel < 17 ? palette[1] : strip < -C.span ? palette[4] : strip < 2 ? palette[3] : palette[2];
      const balance = y < 126 ? Math.floor((126 - y) / 9) * .095 : 0;
      p.set(x, y, balance ? mixc(base, stone[1], balance) : base);
    }
  }
  for (const {x, y, seed} of cells) {
    if (y < horizon(x) + 3 || x < 0 || x > p.w - 1 || y >= p.h) continue;
    const k = seed % 7, pale = floor[4], edge = floor[0];
    const at: XY = [Math.round(x), Math.round(y)];
    if (k === 0 || k === 4) {
      const end: XY = [at[0] + 7, at[1] - 4], mid: XY = [at[0] + 3, at[1] - 1];
      p.line(...at, ...mid, edge);
      p.line(...mid, ...end, edge);
      p.line(mid[0], mid[1] + 1, end[0], end[1] + 1, pale);
    } else if (k === 2 || k === 6) {
      face(p, [[x - 4, y], [x + 1, y - 3], [x + 6, y - 2], [x + 2, y + 1]], edge);
      p.line(x - 3, y - 1, x + 1, y - 3, pale);
    } else {
      for (let i = 0; i < 5; i++) {
        const cx = x - 9 + 2.9 * i, cy = y - i * .35 + 2 * hash(seed, i, 8);
        p.set(cx, cy, mixc(pale, edge, hash(seed, i, 2)));
      }
    }
  }
}

const fissure: XY[] = [[76, 0], [93, 0], [98, 7], [92, 13], [83, 14], [73, 9]];
function lightShaft(p: Px) {
  // Stepped light on the mineral floor and a pale shaft through suspended grit.
  p.ell(76, 145, 42, 13, hx('#b48b73', 33));
  p.ell(80, 145, 31, 9, hx('#d8b193', 23));
  p.ell(81, 146, 19, 6, hx('#d8b193', 20));
  face(p, [[76, 7], [94, 8], [120, 141], [42, 146]], hx('#deb098', 17));
  face(p, [[80, 8], [92, 9], [108, 137], [55, 142]], hx('#e8c4ab', 13));
  face(p, [[83, 9], [89, 9], [98, 119], [67, 135]], hx('#ebceb5', 12));
  face(p, fissure, hx('#73616b'));
  face(p, [[78, 0], [91, 0], [93, 7], [88, 10], [79, 8]], hx('#a3908b'));
  p.line(78, 6, 86, 11, hx('#cdb3a4'));
  p.line(86, 11, 93, 7, hx('#ae9696'));
  p.line(72, 11, 77, 6, stone[4]);
  p.line(92, 12, 100, 6, stone[3]);
}
function ledge(p: Px, x: number, y: number, w: number) {
  face(p, [[x - w, y], [x - w * .53, y - 5], [x + w * .23, y - 7], [x + w, y - 1], [x + w * .72, y + 5], [x + w * .17, y + 7], [x - w * .61, y + 5]], stone[1]);
  face(p, [[x - w, y], [x - w * .53, y - 5], [x + w * .23, y - 7], [x + w, y - 1], [x + w * .25, y + 3], [x - w * .53, y + 3]], stone[2]);
  p.line(x - w * .58, y + 2, x + w * .22, y + 3, stone[3]);
  p.line(x + w * .22, y + 3, x + w * .61, y + 1, stone[3]);
  p.line(x + w * .23, y - 7, x + w * .55, y - 4, stone[4]);
}
function puddle(p: Px) {
  const lip: XY[] = [[3, 156], [20, 148], [46, 147], [68, 151], [82, 159], [70, 165], [51, 168], [14, 166], [0, 162]];
  face(p, lip, hx('#272332'));
  face(p, [[4, 155], [23, 151], [45, 149], [67, 154], [75, 158], [67, 162], [47, 165], [19, 164], [1, 161]], hx('#333648'));
  face(p, [[26, 154], [38, 151], [48, 152], [57, 156], [44, 158], [47, 161], [34, 161]], hx('#48505a'));
  p.line(13, 164, 28, 164, hx('#797181'));
  p.line(46, 166, 63, 164, hx('#655b72'));
  p.line(3, 157, 17, 153, hx('#564c67'));
  p.line(59, 152, 67, 153, hx('#665a72'));
  p.line(35, 155, 49, 155, hx('#5c626e'));
  p.line(27, 160, 36, 160, hx('#525660'));
}
let base: Px;
const geode: Scene = (p, t) => {
  if (!base || base.w !== p.w || base.h !== p.h) {
    base = new Px(p.w, p.h);
    roof(base);
    ground(base);
    lightShaft(base);
    puddle(base);
    ledge(base, 21, 133, 35);
    ledge(base, 219, 146, 52);
    for (const c of backPrisms) prism(base, c);
  }
  p.data.set(base.data);
  const time = (t % 3 + 3) % 3;
  // A drip falls through the shaft, then ripples travel along the pool.
  const x = 47, fall = .92;
  if (time < fall) {
    const k = time / fall;
    const y = 39 + 119 * k ** 1.58;
    p.line(x, y - 1 - 5 * k, x, y, hx('#899095', 100));
    p.set(x, y, hx('#a4a6aa', 212));
  } else if (time < 1.96) {
    const age = (time - fall) / 1.04;
    const r = 1 + 16 * easeOut(age);
    const color = hx('#b9a7ac', Math.round(148 * (1 - age)));
    p.line(x - r, 158, x - r + 3, 157, color);
    p.line(x + r - 3, 157, x + r, 158, color);
    p.line(x - r * .5, 161, x + r * .34, 161, color);
  }
  for (let i = 0; i < 7; i++) {
    const phase = TAU * time / 3 + i * .93;
    const y = 24 + hash(i, 27) * 97 + Math.sin(phase) * 3;
    const x = 84 - y * .04 + (hash(i, 71) - .5) * (9 + y * .22) + Math.cos(phase) * 2;
    p.set(x, y, hx('#d6bda4', Math.round(77 + 63 * Math.cos(phase * 2))));
  }
};
geode.front = [
  {
    id: 'fallen-smoky-druse',
    depth: 194,
    paint(p) {
      ledge(p, 16, 200, 31);
      for (const c of nearLeft) prism(p, c);
    },
  },
  {
    id: 'amethyst-in-the-seam',
    depth: 195,
    paint(p) {
      ledge(p, 247, 203, 30);
      for (const c of nearRight) prism(p, c);
    },
  },
];

const reactionImages = new Map<string, Canvas>();
function image(key: string, paint: (pixels: Px) => void) {
  let canvas = reactionImages.get(key);
  if (!canvas) {
    const p = new Px(256, 208);
    paint(p);
    canvas = p.canvas();
    reactionImages.set(key, canvas);
  }
  return canvas;
}
function star(p: Px, [x, y]: XY, radius: number, color: RGBA) {
  p.line(x - radius, y, x + radius, y, color);
  p.line(x, y - radius, x, y + radius, color);
  p.set(x, y, hx('#fff4d7', color[3]));
}
function resonantFlower(p: Px, opening: number) {
  const c = xylophone[2], [x, y, tx, ty] = c;
  const root = ty + 14;
  const outer: [number, number, number, Mineral][] = [
    [-29, -6, 7, 'amethyst'], [27, -9, 7, 'amethyst'],
    [-21, -22, 7, 'aquamarine'], [21, -25, 6, 'aquamarine'],
    [-8, -29, 7, 'amethyst'], [8, -31, 7, 'amethyst'],
  ];
  for (const [dx, dy, w, mineral] of outer)
    prism(p, [tx, root, tx + dx * opening, root + dy * opening, w * opening, mineral], opening * .55);
  prism(p, c, opening * .74);
  prism(p, [tx, root + 2, tx - 3 * opening, root - 26 * opening, 4.7 * opening, 'aquamarine'], opening * .85);
  if (opening > .4) {
    p.ell(x, y + 1, 18 * opening, 4 * opening, hx('#eb9bca', Math.round(30 * opening)));
    star(p, [tx - 3 * opening, root - 26 * opening], Math.round(5 * opening), hx('#e8e0cf', 215));
  }
}

// The same prisms as on the static shelf are lit in world coordinates. The
// final note splits its termination into a faceted crystal blossom.
export function reactGeode(input: FxInput) {
  const { anim, t } = input;
  const frame = Math.round(t * 24);
  if (anim === 'trick_b') {
    const backdrop = input.backdrop;
    for (const [i, hit] of timing.notes.entries()) {
      const age = frame - hit;
      if (age < 0 || age > 16) continue;
      const c = xylophone[i], a = 1 - age / 17;
      backdrop.col(i === 0 ? '#a8fbeb' : '#edc8ff', a * .63);
      const [, , x, y] = c;
      const r = 2 + age * .59;
      backdrop.line(x - r, y - r * .2, x - r * .66, y - r * .74);
      backdrop.line(x + r * .48, y - r * .6, x + r, y - r * .12);
      backdrop.line(x - r * .36, y - r * .85, x + r * .23, y - r * .89);
      backdrop.alpha(1);
      const gleam = image('strike-' + i + '-' + age, p => {
        prism(p, c, a * .92);
        star(p, [x, y], Math.round(6 * a), hx('#f2e7de', Math.round(250 * a)));
      });
      backdrop.img(gleam, 0, 0);
    }
    const bloom = timing.notes[2];
    const k = sstep(bloom, bloom + 9, frame) * (1 - sstep(bloom + 26, bloom + 44, frame));
    if (k > 0) {
      const f = Math.round(k * 18);
      if (f > 0) {
        backdrop.alpha(1);
        backdrop.img(image('flower-' + f, p => resonantFlower(p, f / 18)), 0, 0);
      }
    }
  } else if (anim === 'trick_b-f2') {
    const split = timing.rebirthSplit;
    const k = sstep(split - 2, split, frame) * (1 - sstep(split + 3, split + 36, frame));
    if (k <= 0) return;
    const f = Math.round(k * 15);
    if (!f) return;
    const backdrop = input.backdrop;
    backdrop.alpha(1);
    backdrop.img(image('rebirth-' + f, p => {
      const brightness = f / 15;
      face(p, [[70, 7], [95, 7], [127, 146], [37, 150]], hx('#ffd5aa', Math.round(43 * brightness)));
      p.ell(128, 159, 83, 18, hx('#eb815b', Math.round(47 * brightness)));
      for (const c of [...backPrisms, ...nearLeft, ...nearRight]) {
        prism(p, c, brightness * .96);
        if (c[4] >= 6) star(p, [c[2], c[3]], Math.round(5 * brightness), hx('#fff1d4', Math.round(238 * brightness)));
      }
    }), 0, 0);
  } else if (anim === 'phase') {
    const k = sstep(13, 27, frame) * (1 - sstep(31, 45, frame));
    if (k <= 0) return;
    const backdrop = input.backdrop;
    backdrop.col('#ffaf80', .22 * k);
    fillPoly(backdrop, [63, 132, 100, 122, 189, 135, 223, 154, 182, 171, 106, 165]);
    for (const [i, c] of [...leftWall, ...rightWall].entries()) {
      const a = clamp01(k * 1.25 - .35 * hash(i, 691));
      if (a <= .06) continue;
      backdrop.col('#ffcfb0', .63 * a);
      backdrop.line(c[2], c[3], c[2] + (c[0] - c[2]) * .15, c[3] + (c[1] - c[3]) * .15);
    }
  }
}

export default geode;
