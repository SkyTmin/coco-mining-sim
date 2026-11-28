// Пончик's own secret frame, «Бамбуковая рама»: four thick golden bamboo poles with nodes, lashed at the corners with
// red cord whose tassels hang and sway; behind the poles a woven bamboo mat fills the border. Drawn the cartoon way:
// flat bands of colour, a dark ink outline round every pole, a bright stripe along each pole. A few leaves sprout from
// the nodes. The tassels sway once a loop (3 s).
import { hx } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';

type C = [number, number, number, number];
const bamboo = ['#3a2a10', '#5c4418', '#84652a', '#ab893c', '#cdac56', '#e6cd80', '#f6ebb8'].map((c) => hx(c) as C);
const node = ['#2c200c', '#4a3614', '#6e5420'].map((c) => hx(c) as C);
const mat = ['#2a1d10', '#3d2b17', '#54401f', '#6a5229', '#7e6433'].map((c) => hx(c) as C);
const cord = ['#3e0c0c', '#721616', '#a8241e', '#d8402e', '#f47a5a'].map((c) => hx(c) as C);
const bead = ['#7a4e10', '#c48a1e', '#f4c84a', '#fff0a8'].map((c) => hx(c) as C);
const leaf = ['#1c3a18', '#2e5a22', '#4a8030', '#78ac46', '#b2d872'].map((c) => hx(c) as C);
const ink = hx('#1e1620') as C;

function set(p: Px, x: number, y: number, c: C) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < p.w && Y < p.h) p.set(X, Y, c);
}
const hashI = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function inBorder(p: Px, b: number, x: number, y: number) {
  return x < b || y < b || x >= p.w - b || y >= p.h - b;
}

/** The woven mat behind the poles: over-under strips at 45°, darker toward the opening. */
function weave(p: Px, b: number) {
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!inBorder(p, b, x, y)) continue;
      const u = (x + y) % 12,
        v = (x - y + 1200) % 12;
      const over = (Math.floor((x + y) / 12) + Math.floor((x - y + 1200) / 12)) % 2 === 0;
      let k = over ? (u < 1 ? 1 : u > 10 ? 2 : 3 + (u < 5 ? 1 : 0)) : v < 1 ? 1 : v > 10 ? 2 : 3;
      if (hashI(x, y, 3) > 0.92) k -= 1;
      set(p, x, y, mat[Math.max(0, Math.min(4, k))]);
    }
}

/** One pole along an axis: a cylinder in flat bands, nodes every `step`, an ink outline. Horizontal when `hz`. */
function pole(p: Px, hz: boolean, along0: number, along1: number, across: number, r: number, step: number, seed: number) {
  const len = along1 - along0;
  for (let a = Math.floor(along0); a <= Math.ceil(along1); a++)
    for (let d = -r - 1; d <= r + 1; d++) {
      const x = hz ? a : across + d,
        y = hz ? across + d : a;
      const end = Math.min(a - along0, along1 - a);
      // rounded cut ends
      const rr = end < r ? Math.sqrt(Math.max(0, r * r - (r - end) * (r - end))) : r;
      if (Math.abs(d) > rr + 0.5) continue;
      if (Math.abs(d) > rr - 0.6) {
        set(p, x, y, ink);
        continue;
      }
      const t = d / rr; // -1 top/left … 1 bottom/right
      // flat cartoon bands: shadow below, base, light stripe a third from the top
      let k = t > 0.55 ? 1 : t > 0.1 ? 3 : t > -0.35 ? 4 : t > -0.7 ? 5 : 3;
      if (t > -0.62 && t < -0.42) k = 6;
      const ph = (((a - along0) % step) + step) % step;
      // a node: a raised ring with a dark groove and a light lip
      if (ph < 1.2) k = 0;
      else if (ph < 2.4) k = Math.min(6, k + 1);
      else if (ph > step - 1.6) k = Math.max(1, k - 1);
      // faint vertical fibres
      if (hashI(a >> 1, d, seed) > 0.9 && k > 2) k -= 1;
      set(p, x, y, (ph < 1.2 ? node[t > 0.4 ? 0 : t > -0.3 ? 1 : 2] : bamboo[k]) as C);
    }
  void len;
}

/** Red cord wrapped round a corner in an X, a knot, and a tassel that hangs and sways. */
function lashing(p: Px, cx: number, cy: number, sway: number, k: number) {
  const s = Math.round(9 * k);
  for (let i = -s; i <= s; i++)
    for (const dir of [1, -1]) {
      for (let w = -1; w <= 1; w++) {
        const x = cx + i,
          y = cy + dir * i + w;
        set(p, x, y, cord[w === -1 ? 3 : w === 0 ? 2 : 1]);
      }
      set(p, cx + i, cy + dir * i - 2, ink);
      set(p, cx + i, cy + dir * i + 2, ink);
    }
  // the knot
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      const d = x * x + y * y;
      if (d > 12) continue;
      set(p, cx + x, cy + y, d > 8 ? ink : cord[x + y < -1 ? 4 : x + y < 2 ? 3 : 2]);
    }
}
function tassel(p: Px, x0: number, y0: number, len: number, sway: number) {
  // cord down to a gold bead, then a fringe that fans out and swings
  const n = Math.round(len * 0.45);
  let x = x0;
  for (let i = 0; i < n; i++) {
    x = x0 + Math.sin(sway) * i * 0.35;
    set(p, x - 1, y0 + i, ink);
    set(p, x, y0 + i, cord[3]);
    set(p, x + 1, y0 + i, ink);
  }
  const by = y0 + n;
  for (let y = -3; y <= 3; y++)
    for (let xx = -3; xx <= 3; xx++) {
      const d = xx * xx + y * y;
      if (d > 11) continue;
      set(p, x + xx, by + y, d > 7 ? ink : bead[xx + y < -2 ? 3 : xx + y < 1 ? 2 : 1]);
    }
  const fy = by + 4,
    fl = len - n - 4;
  for (let i = 0; i < fl; i++) {
    const half = 2 + i * 0.28;
    const cx = x + Math.sin(sway) * (n + i) * 0.35 - Math.sin(sway) * n * 0.35;
    for (let d = -Math.ceil(half) - 1; d <= Math.ceil(half) + 1; d++) {
      const edge = Math.abs(d) > half;
      const strand = (d + 40) % 2 === 0;
      set(p, cx + d, fy + i, edge || i === fl - 1 ? ink : cord[strand ? 3 : 2]);
    }
  }
}
function sprig(p: Px, x: number, y: number, dir: number, k: number) {
  // two pointed leaves from a node
  for (const [ang, len] of [
    [-0.5, 12],
    [0.25, 9],
  ] as [number, number][]) {
    const a = ang * dir,
      L = len * k;
    for (let i = 0; i <= L; i++) {
      const w = Math.sin((i / L) * Math.PI) * 2.6 * k;
      const px = x + dir * i * Math.cos(a),
        py = y + i * Math.sin(a) - i * 0.25;
      for (let d = -Math.ceil(w) - 1; d <= Math.ceil(w) + 1; d++) {
        const edge = Math.abs(d) > w;
        set(p, px, py + d, edge ? ink : leaf[d < -w * 0.3 ? 4 : d < w * 0.3 ? 3 : 2]);
      }
    }
  }
}

const bambooFrame: Border = {
  wood: ['#3a2a10', '#84652a', '#cdac56', '#f6ebb8'],
  accent: '#d8402e',
  decorate(p, b, t) {
    const k = b / 27;
    const loop = (((t / 3) % 1) + 1) % 1;
    const r = Math.round(9 * k);
    const mid = Math.round(b / 2);
    const step = Math.round(46 * k);
    weave(p, b);
    // inner shadow lip round the opening
    for (let x = b - 3; x < p.w - b + 3; x++) {
      set(p, x, b - 1, ink);
      set(p, x, p.h - b, ink);
    }
    for (let y = b - 3; y < p.h - b + 3; y++) {
      set(p, b - 1, y, ink);
      set(p, p.w - b, y, ink);
    }
    // verticals first, then the horizontals lie over them at the corners
    pole(p, false, 2, p.h - 3, mid, r, step, 11);
    pole(p, false, 2, p.h - 3, p.w - 1 - mid, r, step, 13);
    pole(p, true, 2, p.w - 3, mid, r, step, 17);
    pole(p, true, 2, p.w - 3, p.h - 1 - mid, r, step, 19);
    // leaves at a few nodes
    sprig(p, mid + r, Math.round(2 + step * 2), 1, k);
    sprig(p, p.w - 1 - mid - r, Math.round(2 + step * 4), -1, k);
    sprig(p, Math.round(2 + step * 5), mid - r, 1, k * 0.9);
    // corners: the lashing and the tassels (the top two hang inside the border, the bottom ones over the mat)
    const corners: [number, number][] = [
      [mid, mid],
      [p.w - 1 - mid, mid],
      [p.w - 1 - mid, p.h - 1 - mid],
      [mid, p.h - 1 - mid],
    ];
    corners.forEach(([cx, cy], i) => {
      lashing(p, cx, cy, 0, k);
      if (i < 2) {
        const sway = 0.22 * Math.sin(loop * Math.PI * 2 + i * 1.7);
        tassel(p, cx + (i === 0 ? 4 : -4), cy + 4, Math.round(30 * k), sway);
      }
    });
  },
};
export default bambooFrame;
