// «Кухня чайного домика» — the kitchen of a little tea house in the mountains, painted the way the backgrounds of the
// 1940s theatrical cartoons were: soft gouache-like bands with ordered dithering, warm muted colours, thin outlines in
// each object's own darkest tone (the characters get the black ink; the background stays quieter than they are).
// Back wall: warm plaster between dark timber posts, a round moon window on the right with bamboo and blue mountains
// outside, a clay stove with a fire mouth and a steaming iron pot on the left, a lacquered dish cupboard at the right,
// a lattice door at the back left of centre, a ladder leaning on the left wall up to the loft, a wall shelf with jars,
// ladles and a sieve on hooks. The floor: warm planks in perspective, the window's light lying across them.
// The props the characters touch (table with steamers, barrel, flour sack, bamboo tub, honey jar, rug, lanterns) are
// drawn by the effects (bun_panda-fx), so they can move. Painting 384 × 312, one pixel size. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 384,
  H = 312;
/** Where the back wall meets the floor (screen y). */
export const WALL_FOOT = 150;
/** The vanishing point of the floor planks. */
const VP: [number, number] = [192, 18];
/** The moon window (centre, radius) and the stove, cupboard and door boxes — the effects aim at them. */
export const WINDOW = { x: 262, y: 72, r: 40 };
export const STOVE = { x0: 14, x1: 104, top: 84 };
export const POT = { x: 58, y: 80 };
export const CUPBOARD = { x0: 306, x1: 374, top: 26 };
export const DOOR = { x0: 146, x1: 186, top: 58 };

const c = (a: string[]) => a.map((s) => hx(s) as RGBA);
const plaster = c(['#5e4430', '#6e5038', '#80603f', '#93724c', '#a6845a', '#b69668', '#c4a676']);
const timber = c(['#24180f', '#342216', '#462e1d', '#5a3c25', '#6e4c2f', '#82603b']);
const plank = c(['#2e1e13', '#3c2819', '#4a3220', '#583d27', '#66482e', '#745436', '#84613f', '#966f48']);
const sky = c(['#a9c2bc', '#b8cec4', '#c8d8cc', '#d8e2d2']);
const hill = c(['#5f7a82', '#6f8a90', '#819c9e', '#94aeac']);
const leafC = c(['#2e5230', '#3e663a', '#527c46', '#6a9454', '#86ac66']);
const clay = c(['#4a261c', '#5e3224', '#743e2c', '#8a4c34', '#9e5c3e', '#b06e4a']);
const fire = c(['#a8361a', '#e0642a', '#ff9a3a', '#ffc860', '#fff0a0']);
const iron = c(['#1c1a20', '#2a262e', '#3a343e', '#4c4552', '#615866', '#7a707c']);
const lacquer = c(['#2c1410', '#401c16', '#56261c', '#6c3224', '#82402e', '#985038']);
const porcelain = c(['#6e8a86', '#86a29c', '#a2bcb2', '#c2d4ca', '#dce6dc', '#eef2e8']);
const blue = c(['#33507a', '#44648e', '#5a7aa2']);
const paper = c(['#9a8a6c', '#b2a282', '#c8b896', '#dacca8']);
const light = hx('#ffe6b0') as RGBA;
const steamC = hx('#f4ecdc') as RGBA;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, col: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, col);
}
function get(p: Px, x: number, y: number): RGBA {
  return p.get(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1)) as RGBA;
}
const BAYER = [0, 0.5, 0.125, 0.625, 0.75, 0.25, 0.875, 0.375, 0.1875, 0.6875, 0.0625, 0.5625, 0.9375, 0.4375, 0.8125, 0.3125];
const bay = (x: number, y: number) => BAYER[(Math.round(x) & 3) + 4 * (Math.round(y) & 3)];
/** Dithered pick from a ramp at a fractional index. */
function ramp(p: Px, x: number, y: number, r: RGBA[], s: number) {
  const i = clamp(s, 0, r.length - 1);
  const lo = Math.floor(i);
  put(p, x, y, r[Math.min(r.length - 1, i - lo > bay(x, y) ? lo + 1 : lo)]);
}
function tint(p: Px, x: number, y: number, col: RGBA, a: number) {
  if (a <= 0.02) return;
  put(p, x, y, mixc(get(p, x, y), col, a > bay(x, y) ? Math.min(1, a + 0.15) : a * 0.5));
}
function line(p: Px, x0: number, y0: number, x1: number, y1: number, col: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col);
}
function vnoise(x: number, y: number, seed: number, s: number) {
  const X = Math.floor(x / s),
    Y = Math.floor(y / s);
  const fx = x / s - X,
    fy = y / s - Y;
  const ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const a = hash(X, Y, seed),
    b = hash(X + 1, Y, seed),
    cc = hash(X, Y + 1, seed),
    d = hash(X + 1, Y + 1, seed);
  return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy;
}
/** Soft brush texture: large blotches and a finer grain, the gouache feel. */
const brush = (x: number, y: number, seed: number) => vnoise(x, y, seed, 22) * 0.6 + vnoise(x, y, seed + 1, 6) * 0.3 + vnoise(x, y, seed + 2, 2) * 0.1;
function box(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => void) {
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) fn(x, y);
}
const loopK = (t: number) => (((t / 3) % 1) + 1) % 1;

/** The back wall: plaster brighter toward the window, a timber frame, a low plank wainscot. */
function wall(p: Px) {
  box(0, 0, W - 1, WALL_FOOT, (x, y) => {
    const toWin = Math.hypot(x - WINDOW.x, (y - WINDOW.y) * 1.3);
    const s = 3.2 + 1.6 * Math.exp(-toWin / 120) - (y / WALL_FOOT) * 0.9 + (brush(x, y, 3) - 0.5) * 1.4 - (x < 30 ? (30 - x) / 30 : 0) * 0.8;
    ramp(p, x, y, plaster, s);
  });
  // wainscot planks
  box(0, 118, W - 1, WALL_FOOT, (x, y) => {
    const seam = x % 22 === 0;
    const s = 2.6 + (brush(x * 0.4, y * 2, 7) - 0.5) * 1.2 + (y < 121 ? 1.4 : 0) - (y > WALL_FOOT - 3 ? 1.2 : 0);
    if (seam) put(p, x, y, timber[1]);
    else ramp(p, x, y, timber, s + 0.6);
  });
  line(p, 0, 117, W - 1, 117, timber[0]);
  // timber posts and the top beam
  for (const [x0, w] of [
    [2, 12],
    [118, 9],
    [190, 9],
    [370, 14],
  ] as [number, number][])
    box(x0, 0, x0 + w, WALL_FOOT, (x, y) => {
      const u = (x - x0) / w;
      ramp(p, x, y, timber, 1.4 + (u < 0.25 ? 2 : u < 0.6 ? 1.2 : 0.2) + (brush(x * 3, y * 0.3, 11) - 0.5) * 1.1);
      if (x === x0 || x === x0 + w) put(p, x, y, timber[0]);
    });
  box(0, 6, W - 1, 18, (x, y) => {
    ramp(p, x, y, timber, (y < 9 ? 3.4 : y < 14 ? 2.4 : 1.2) + (brush(x * 0.3, y * 3, 13) - 0.5) * 1.1);
    if (y === 6 || y === 18) put(p, x, y, timber[0]);
  });
}

/** The round moon window: pale sky, two blue ridges, bamboo stalks and leaves swaying. */
function moonWindow(p: Px, t: number) {
  const { x: cx, y: cy, r } = WINDOW;
  const k = loopK(t);
  box(cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6, (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    if (d > r + 5) return;
    if (d > r) {
      // the wooden ring: lit on top-left
      const a = Math.atan2(y - cy, x - cx);
      ramp(p, x, y, timber, 2.6 + Math.cos(a + 2.3) * 1.4 - (d > r + 4 ? 1.5 : 0));
      if (d > r + 4.4 || d < r + 0.6) put(p, x, y, timber[0]);
      return;
    }
    const v = (y - (cy - r)) / (2 * r);
    ramp(p, x, y, sky, 3.2 - v * 2.4);
    // two ridges
    const far = cy + 4 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19 + 1) * 3;
    const near = cy + 18 + Math.sin(x * 0.05 + 2) * 7 + Math.sin(x * 0.23) * 2;
    if (y > far) ramp(p, x, y, hill, 3 - (y - far) * 0.04);
    if (y > near) ramp(p, x, y, hill, 1.4 - (y - near) * 0.03);
  });
  // bamboo outside: three stalks and leaf clusters, swaying a little
  for (const [bx, w, seed] of [
    [cx - 22, 3.4, 1],
    [cx + 6, 4.2, 2],
    [cx + 28, 3, 3],
  ] as [number, number, number][]) {
    for (let y = cy - r; y <= cy + r; y++) {
      const sway = Math.sin(k * TAU + seed) * 1.6 * ((cy + r - y) / (2 * r));
      for (let d = -w; d <= w; d++) {
        const x = bx + d + sway;
        if (Math.hypot(x - cx, y - cy) > r - 0.5) continue;
        const node = (y + seed * 7) % 17 < 1;
        ramp(p, x, y, leafC, node ? 0.6 : 2.2 + (d < 0 ? 1.2 : -0.4));
      }
    }
    for (let i = 0; i < 6; i++) {
      const ly = cy - r + 10 + i * 12 + seed * 3,
        dir = i % 2 ? 1 : -1;
      const sway = Math.sin(k * TAU + seed + i) * 2;
      for (let s = 0; s < 12; s++) {
        const x = bx + dir * s * 1.2 + sway,
          y = ly + s * 0.45;
        const wdt = Math.sin((s / 12) * Math.PI) * 2.2;
        for (let e = -wdt; e <= wdt; e++) if (Math.hypot(x - cx, y + e - cy) < r - 0.5) ramp(p, x, y + e, leafC, 3.4 - (e > 0 ? 1.4 : 0));
      }
    }
  }
  // the window sill
  box(cx - r - 8, cy + r + 4, cx + r + 8, cy + r + 9, (x, y) => {
    ramp(p, x, y, timber, y < cy + r + 6 ? 4.2 : 2);
    if (y === cy + r + 9) put(p, x, y, timber[0]);
  });
}

/** The clay stove: a rounded block with a glowing fire mouth, an iron pot on top, steam rising. */
function stove(p: Px, t: number) {
  const { x0, x1, top } = STOVE;
  const k = loopK(t);
  box(x0, top, x1, WALL_FOOT + 6, (x, y) => {
    const u = (x - x0) / (x1 - x0);
    const round = y < top + 6 && (u < 0.04 || u > 0.96);
    if (round) return;
    ramp(p, x, y, clay, 3.4 - Math.abs(u - 0.35) * 2.4 + (y < top + 4 ? 1.2 : 0) + (brush(x, y, 21) - 0.5) * 1.2);
    // brick seams
    if ((y - top) % 9 === 0 || ((x + (Math.floor((y - top) / 9) % 2) * 8) % 16 === 0 && y > top + 4)) tint(p, x, y, clay[0], 0.5);
  });
  line(p, x0, top, x1, top, clay[0]);
  line(p, x0, top, x0, WALL_FOOT + 6, clay[0]);
  line(p, x1, top, x1, WALL_FOOT + 6, clay[0]);
  // the fire mouth: an arch with flickering flames
  const mx = (x0 + x1) / 2,
    my = WALL_FOOT - 2;
  box(mx - 16, my - 26, mx + 16, my, (x, y) => {
    const dx = (x - mx) / 16,
      dy = (my - y) / 26;
    if (dx * dx + Math.max(0, dy - 0.45) ** 2 * 3.6 > 1) return;
    const flick = Math.sin(k * TAU * 3 + x * 0.6) * 0.6 + Math.sin(k * TAU * 5 + x * 0.3 + 1) * 0.4;
    const s = 4 - dy * 3.2 + flick * 0.8 - Math.abs(dx) * 1.4;
    ramp(p, x, y, fire, s);
  });
  // glow on the floor in front of it
  box(mx - 40, WALL_FOOT, mx + 40, WALL_FOOT + 22, (x, y) => {
    const d = Math.hypot((x - mx) / 40, (y - WALL_FOOT) / 22);
    tint(p, x, y, fire[2], Math.max(0, 0.32 * (1 - d)) * (0.85 + 0.15 * Math.sin(k * TAU * 3)));
  });
  // the iron pot: a wide bowl with a lid knob
  const { x: px, y: py } = POT;
  box(px - 26, py - 12, px + 26, py + 6, (x, y) => {
    const dx = (x - px) / 26,
      dy = (y - py) / 12;
    if (dy < 0 ? dx * dx + dy * dy * 2.2 > 1 : dx * dx + dy * dy * 0.6 > 1) return;
    ramp(p, x, y, iron, 2.6 - dx * 1.2 + (dy < -0.5 ? 1.4 : 0) - (dy > 0.2 ? 0.8 : 0));
  });
  line(p, px - 26, py, px + 26, py, iron[0]);
  for (let x = -3; x <= 3; x++) put(p, px + x, py - 13, iron[x < 0 ? 4 : 3]);
  // steam: soft puffs climbing and fading over the loop
  for (let i = 0; i < 5; i++) {
    const u = (k + i / 5) % 1;
    const sx = px - 6 + Math.sin(u * TAU + i) * 6 + i * 3,
      sy = py - 16 - u * 64;
    const rr = 5 + u * 9;
    box(sx - rr, sy - rr, sx + rr, sy + rr, (x, y) => {
      const d = Math.hypot(x - sx, y - sy) / rr;
      if (d < 1) tint(p, x, y, steamC, (1 - d) * 0.55 * (1 - u));
    });
  }
}

/** The lacquered dish cupboard: open shelves of bowls, plates on edge, a stack of pots and lids. */
function cupboard(p: Px) {
  const { x0, x1, top } = CUPBOARD;
  box(x0, top, x1, WALL_FOOT + 4, (x, y) => {
    const u = (x - x0) / (x1 - x0);
    const side = u < 0.08 || u > 0.92;
    ramp(p, x, y, lacquer, side ? 3.6 - u : 1.2 + (brush(x, y, 31) - 0.5) * 0.8);
  });
  for (const y of [top, top + 34, top + 66, top + 98, WALL_FOOT + 4]) {
    box(x0, y - 2, x1, y + 2, (x, yy) => ramp(p, x, yy, lacquer, yy < y ? 5 : 3));
    line(p, x0, y + 3, x1, y + 3, lacquer[0]);
  }
  line(p, x0, top - 2, x0, WALL_FOOT + 4, lacquer[0]);
  line(p, x1, top - 2, x1, WALL_FOOT + 4, lacquer[0]);
  // shelf 1: bowls stacked, blue rims
  const bowl = (bx: number, by: number, w: number) => {
    box(bx - w, by - 6, bx + w, by, (x, y) => {
      const dx = (x - bx) / w,
        dy = (by - y) / 6;
      if (dx * dx + (1 - dy) * (1 - dy) * 0.3 > 1 && dy < 0.85) return;
      ramp(p, x, y, porcelain, 3.6 - dx * 1.2 - dy * 0.4);
      if (y === by - 5) put(p, x, y, blue[1]);
    });
  };
  for (let i = 0; i < 3; i++) for (let n = 0; n < 3; n++) bowl(x0 + 14 + i * 20, top + 32 - n * 6, 8);
  // shelf 2: plates on edge
  for (let i = 0; i < 5; i++) {
    const bx = x0 + 10 + i * 12,
      by = top + 50;
    box(bx - 9, by - 13, bx + 9, by + 13, (x, y) => {
      const d = Math.hypot((x - bx) / 5, (y - by) / 13);
      if (d > 1) return;
      ramp(p, x, y, porcelain, 4.4 - d * 1.6 - ((x - bx) / 5) * 0.6);
      if (d > 0.72 && d < 0.84) put(p, x, y, blue[(i % 2) + 1]);
    });
  }
  // shelf 3: pots with lids
  for (let i = 0; i < 2; i++) {
    const bx = x0 + 18 + i * 32,
      by = top + 96;
    box(bx - 14, by - 22, bx + 14, by, (x, y) => {
      const u = (x - bx) / 14;
      if (Math.abs(u) > 1) return;
      ramp(p, x, y, iron, 3 - u * 1.4 + (y < by - 18 ? 1.6 : 0));
      if (x === bx - 14 || x === bx + 14 || y === by) put(p, x, y, iron[0]);
    });
    for (let x = -3; x <= 3; x++) put(p, bx + x, by - 24, iron[4]);
  }
  // bottom: a deep shelf with a basket
  box(x0 + 6, top + 106, x1 - 6, WALL_FOOT, (x, y) => {
    const weave = ((x + y) % 4 < 2) !== ((x - y + 400) % 4 < 2);
    ramp(p, x, y, paper, weave ? 2.4 : 1.4);
  });
}

/** A lattice door: timber frame, paper panes in a geometric lattice, a round brass pull. */
function door(p: Px) {
  const { x0, x1, top } = DOOR;
  box(x0, top, x1, WALL_FOOT, (x, y) => {
    const u = (x - x0) / (x1 - x0);
    const fr = x - x0 < 4 || x1 - x < 4 || y - top < 4 || WALL_FOOT - y < 4;
    const lat = (x - x0) % 10 < 1.5 || (y - top) % 12 < 1.5;
    if (fr || lat) ramp(p, x, y, timber, fr ? 2.4 + (u < 0.1 ? 1 : 0) : 1.4);
    else ramp(p, x, y, paper, 2.6 + (brush(x, y, 41) - 0.5) - u * 0.6);
  });
  line(p, x0, top, x1, top, timber[0]);
  line(p, x0, top, x0, WALL_FOOT, timber[0]);
  line(p, x1, top, x1, WALL_FOOT, timber[0]);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) put(p, x1 - 8 + x, 108 + y, x + y < 0 ? fire[3] : fire[1]);
}

/** A ladder leaning on the left post up into the loft (out of the top of the picture). */
function ladder(p: Px) {
  const rails: [number, number, number, number][] = [
    [108, -4, 118, WALL_FOOT + 10],
    [128, -4, 138, WALL_FOOT + 10],
  ];
  for (const [ax, ay, bx, by] of rails)
    for (let i = 0; i <= by - ay; i++) {
      const x = ax + ((bx - ax) * i) / (by - ay),
        y = ay + i;
      for (let d = -2; d <= 2; d++) ramp(p, x + d, y, timber, d === -2 || d === 2 ? 0.4 : 3.6 - d * 0.5);
    }
  for (let y = 14; y < WALL_FOOT; y += 16) {
    const xa = 108 + ((118 - 108) * (y + 4)) / (WALL_FOOT + 14),
      xb = 128 + ((138 - 128) * (y + 4)) / (WALL_FOOT + 14);
    for (let x = xa + 2; x <= xb - 2; x++)
      for (let d = 0; d <= 2; d++) ramp(p, x, y + d, timber, d === 2 ? 0.6 : 3.8 - d);
  }
}

/** The wall shelf over the stove: jars with cloth lids, a sieve and ladles on hooks under it. */
function wallShelf(p: Px) {
  const y0 = 40;
  box(16, y0, 102, y0 + 4, (x, y) => ramp(p, x, y, timber, y < y0 + 2 ? 4.4 : 2.2));
  line(p, 16, y0 + 5, 102, y0 + 5, timber[0]);
  for (const [bx, w, h, col] of [
    [26, 7, 14, clay],
    [44, 6, 18, porcelain],
    [62, 8, 12, clay],
    [82, 6, 16, porcelain],
  ] as [number, number, number, RGBA[]][]) {
    box(bx - w, y0 - h, bx + w, y0 - 1, (x, y) => {
      const u = (x - bx) / w;
      ramp(p, x, y, col, 3.2 - u * 1.4 + (y < y0 - h + 3 ? -1 : 0));
      if (Math.abs(u) > 0.92) put(p, x, y, col[0]);
    });
    box(bx - w - 1, y0 - h - 3, bx + w + 1, y0 - h, (x, y) => ramp(p, x, y, c(['#6a2a22', '#8e3a2c', '#b04c38']), 1.6));
  }
  // hooks with a ladle and a sieve
  line(p, 30, y0 + 6, 30, y0 + 24, iron[2]);
  box(25, y0 + 24, 35, y0 + 30, (x, y) => ramp(p, x, y, iron, 3 - (x - 25) * 0.15));
  for (let a = 0; a < TAU; a += 0.04) {
    put(p, 70 + Math.cos(a) * 9, y0 + 22 + Math.sin(a) * 9, timber[1]);
    put(p, 70 + Math.cos(a) * 8, y0 + 22 + Math.sin(a) * 8, timber[4]);
  }
  box(62, y0 + 14, 78, y0 + 30, (x, y) => {
    if (Math.hypot(x - 70, y - (y0 + 22)) < 7.5 && (x + y) % 2 === 0) put(p, x, y, paper[1]);
  });
}

/** The floor: planks converging on the vanishing point, darker toward the back, the window's light across it. */
function floor(p: Px) {
  box(0, WALL_FOOT, W - 1, H - 1, (x, y) => {
    const v = (y - VP[1]) / (H - VP[1]);
    const u = (x - VP[0]) / v; // plank coordinate at the front edge
    const idx = Math.floor((u + 1000) / 26);
    const seam = Math.abs(((u + 1000) % 26) - 0) < 1.6 / v * 0.5;
    const depth = (y - WALL_FOOT) / (H - WALL_FOOT);
    let s = 2.2 + depth * 2.2 + (hash(idx, 5) - 0.5) * 1.2 + (brush(u * 0.25, y * 1.4, 51 + idx) - 0.5) * 1.1;
    // board ends now and then
    if (((y + hash(idx, 7) * 140) % 140) < 0.8 * (1 + depth)) s -= 1.4;
    if (seam) s = 0.6 + depth;
    ramp(p, x, y, plank, s);
  });
  // the shadow along the wall foot
  box(0, WALL_FOOT, W - 1, WALL_FOOT + 8, (x, y) => tint(p, x, y, plank[0], 0.5 * (1 - (y - WALL_FOOT) / 8)));
  // the window's light across the boards: the round window's shape thrown long onto the floor, a crisp painted patch
  // with a soft edge (two tint levels, no haze)
  box(40, WALL_FOOT + 10, 330, H - 6, (x, y) => {
    const v = (y - WALL_FOOT) / (H - WALL_FOOT);
    const cx = 250 - v * 150,
      cy = WALL_FOOT + 70;
    const d = Math.hypot((x - cx) / (40 + v * 50), (y - cy) / 42);
    if (d < 0.86) tint(p, x, y, light, 0.2);
    else if (d < 1) tint(p, x, y, light, 0.09);
  });
  // the stalks outside cut shadows into the patch
  for (const off of [-22, 6, 28])
    box(40, WALL_FOOT + 30, 330, WALL_FOOT + 112, (x, y) => {
      const v = (y - WALL_FOOT) / (H - WALL_FOOT);
      const sx = 250 + off - v * 150 - (y - WALL_FOOT - 70) * 0.9;
      if (Math.abs(x - sx) < 2.2 + v * 2) tint(p, x, y, plank[1], 0.18);
    });
}

const scene: Scene = (p: Px, t: number) => {
  wall(p);
  floor(p);
  moonWindow(p, t);
  door(p);
  wallShelf(p);
  stove(p, t);
  cupboard(p);
  ladder(p);
};
export default scene;
