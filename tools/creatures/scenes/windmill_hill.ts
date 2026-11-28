// «Ветреный холм» (canon §8.3: far plan in the top third, the floor below, a front plan). A bright spring noon on a
// windy hilltop. Far: a deep blue sky paling to the horizon, a white sun upper left with a soft glow, fat cumulus
// clouds that breathe, a red-and-yellow kite on a long string that dances in the wind; three rows of rolling hills,
// the middle one a patchwork of fields (green, rapeseed yellow, ploughed) with hedgerows and a tiny village with a
// spire. Middle: a whitewashed windmill on the near rise to the right, its four lattice sails turning (a quarter turn
// every loop, so the loop has no seam), a wooden fence running along the back of the meadow with the kite tied to its
// last post. Floor: a spring meadow full of dandelions — white clocks and yellow flowers — clover, a trodden path up to
// the mill, pebbles, and grass that sways in waves when the wind passes. Dandelion seeds drift across on the wind.
// Front plan: tall grass in the left corner, a big dandelion clock and blades in the right one. Light from the sun
// upper left. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 208,
  H = 160;
/** The foot of the far hills and the back edge of the meadow (the fence line). */
export const HORIZON = 54;
export const MEADOW = 74;
/** The windmill: hub of the sails and the foot of the tower (the fx may let seeds pass it). */
export const MILL = { x: 176, y: 62, hub: [176, 25] as const };

const skyC = ['#3f8fdc', '#4f9ce2', '#64ace8', '#7dbdee', '#9acdf2', '#b8ddf4', '#d6ecf4'].map((c) => hx(c));
const cloudC = ['#ffffff', '#eef6fc', '#d4e6f4', '#b4cee6'].map((c) => hx(c));
const hillFar = ['#8cbcd0', '#9cc8d4'].map((c) => hx(c));
const hillMid = ['#6aa47e', '#7eb488', '#94c290'].map((c) => hx(c));
const fields = ['#9cc864', '#d8d25a', '#b89a62', '#7ab45a', '#c4d870'].map((c) => hx(c));
const hedge = hx('#4a7a44');
const hillNear = ['#4a8a36', '#5a9a40', '#6eac4a', '#86be58'].map((c) => hx(c));
const grass = ['#245a1e', '#2e6c24', '#3a7e2c', '#4a9034', '#5ea23e', '#76b44c', '#92c660', '#b0d878'].map((c) => hx(c));
const wood = ['#4a3020', '#6a4a30', '#8e6a44', '#b08a5a', '#ccaa74'].map((c) => hx(c));
const wall = ['#8a8070', '#b4aa94', '#d4ccb6', '#ece6d4', '#faf6ea'].map((c) => hx(c));
const roof = ['#4a1c14', '#6e2a1c', '#94402a', '#b85a3a'].map((c) => hx(c));
const canvasC = ['#b8ac94', '#e0d8c4', '#f6f2e6'].map((c) => hx(c));
const dirt = ['#8a6a44', '#a88a5e', '#c4a878', '#dcc49a'].map((c) => hx(c));
const stone = ['#6a6a6a', '#8e8e8a', '#b4b2aa', '#d4d2c8'].map((c) => hx(c));
const puffC = ['#c4ccd4', '#e8eef2', '#ffffff'].map((c) => hx(c));
const yellow = ['#c88a10', '#f4c020', '#ffe45a'].map((c) => hx(c));
const kiteC = ['#c8302a', '#e85a3a', '#f8c840', '#ffe890'].map((c) => hx(c));
const village = { wall: hx('#f2ecdc'), roof: hx('#b8503a'), roofD: hx('#8a3a2a') };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function get(p: Px, x: number, y: number): RGBA {
  return p.get(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1)) as RGBA;
}
const BAYER = [0.2, 0.7, 0.95, 0.45];
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  put(p, x, y, u > BAYER[(x & 1) + 2 * (y & 1)] ? b : a);
}
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0) return;
  const m = BAYER[(Math.round(x) & 1) + 2 * (Math.round(y) & 1)];
  put(p, x, y, mixc(get(p, x, y), c, a > m ? Math.min(1, a + 0.2) : a * 0.5));
}
function disc(p: Px, cx: number, cy: number, r: number, c: RGBA, ry = r) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (((x - cx) / r) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(p, x, y, c);
}
function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
/** The loop phase: 0..1 over the 3-second loop. */
const loopK = (t: number) => (((t / 3) % 1) + 1) % 1;

function sky(p: Px) {
  for (let y = 0; y < HORIZON + 4; y++) {
    const u = (y / (HORIZON + 4)) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // The sun upper left: a white core, a pale ring and a wide soft glow.
  const cx = 30,
    cy = 16,
    r = 7;
  for (let y = 0; y <= cy + r + 18; y++)
    for (let x = Math.max(0, cx - r - 18); x <= cx + r + 18; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) put(p, x, y, d < r - 1.5 ? hx('#ffffff') : hx('#fff8d8'));
      else if (d < r + 18) tint(p, x, y, hx('#fffbe4'), 0.55 * (1 - (d - r) / 18) ** 1.5);
    }
}

/** A cumulus cloud: lumps with a bright top-left, a soft blue-grey belly; it breathes a little with the loop. */
function cloud(p: Px, cx: number, cy: number, s: number, t: number, seed: number) {
  const k = loopK(t) * TAU;
  const lumps: [number, number, number][] = [
    [-14, 2, 6],
    [-7, -3, 8],
    [2, -6, 9],
    [11, -2, 7],
    [18, 2, 5],
    [-2, 3, 8],
    [9, 3, 7],
  ];
  const at = (i: number) => {
    const [dx, dy, r] = lumps[i];
    const b = 1 + 0.06 * Math.sin(k + i * 1.7 + seed);
    return [cx + dx * s + Math.sin(k + seed) * 1.2, cy + dy * s, r * s * b] as const;
  };
  // Belly shade first, then the body, then the lit tops.
  for (let i = 0; i < lumps.length; i++) {
    const [x, y, r] = at(i);
    disc(p, x, y + 1.5, r, cloudC[3], r * 0.8);
  }
  for (let i = 0; i < lumps.length; i++) {
    const [x, y, r] = at(i);
    disc(p, x, y, r, cloudC[2], r * 0.8);
  }
  for (let i = 0; i < lumps.length; i++) {
    const [x, y, r] = at(i);
    disc(p, x - r * 0.15, y - r * 0.18, r * 0.82, cloudC[1], r * 0.62);
    disc(p, x - r * 0.3, y - r * 0.32, r * 0.5, cloudC[0], r * 0.38);
  }
  // A flat base.
  for (let x = Math.round(cx - 16 * s); x <= Math.round(cx + 20 * s); x++) put(p, x, Math.round(cy + 5 * s), cloudC[3]);
}

function hills(p: Px) {
  // The far row: soft blue-green, two humps.
  for (let x = 0; x < W; x++) {
    const top = 42 - 5 * Math.sin(x * 0.03 + 0.6) - 3 * Math.sin(x * 0.071 + 2);
    for (let y = Math.floor(top); y < HORIZON + 8; y++) dither(p, x, y, hillFar[1], hillFar[0], (y - top) / 10);
  }
  // The middle row: a patchwork of fields with hedgerows between them.
  for (let x = 0; x < W; x++) {
    const top = 48 - 4 * Math.sin(x * 0.045 + 1.4) - 2 * Math.sin(x * 0.11);
    for (let y = Math.floor(top); y < MEADOW; y++) {
      // Fields: skewed bands in two directions make a quilt.
      const a = Math.floor((x + (y - 48) * 2.2) / 26),
        b = Math.floor((y - 44) / 5 + x * 0.02);
      const f = fields[Math.floor(hash(a, b, 7) * fields.length)];
      const edge = (x + (y - 48) * 2.2) % 26 < 1 || ((y - 44) / 5 + x * 0.02) % 1 < 0.18;
      let c = edge ? hedge : mixc(f, hillMid[1], 0.35);
      if (y - top < 1) c = hillMid[2];
      put(p, x, y, c);
      // Ploughed rows.
      if (f === fields[2] && x % 2 === 0) put(p, x, y, mixc(c, hx('#8a6a44'), 0.3));
    }
  }
  // A tiny village on the middle row: white houses, red roofs, a church with a spire; little round trees.
  for (const [vx, vy, w] of [
    [58, 47, 3],
    [62, 48, 4],
    [67, 47, 3],
    [71, 48, 3],
  ] as const) {
    for (let x = 0; x < w; x++) {
      put(p, vx + x, vy, village.roof);
      put(p, vx + x, vy + 1, village.wall);
      put(p, vx + x, vy + 2, village.wall);
    }
    put(p, vx, vy, village.roofD);
  }
  line(p, 76, 41, 76, 48, village.wall);
  put(p, 76, 40, village.roofD);
  put(p, 75, 45, village.roof);
  put(p, 77, 45, village.roof);
  for (let i = 0; i < 14; i++) {
    const x = 10 + i * 14 + Math.round(hash(i, 3) * 8),
      y = 47 + Math.round(hash(i, 4) * 6);
    disc(p, x, y, 1.6, hedge);
    put(p, x - 1, y - 1, hillMid[2]);
  }
}

/** The near rise on the right, where the mill stands; it slopes down to the meadow on the left. */
function rise(p: Px) {
  for (let x = 96; x < W; x++) {
    const k = (x - 96) / (W - 96);
    const top = MEADOW - 2 - 16 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5);
    for (let y = Math.floor(top); y < MEADOW + 4; y++) {
      const u = (y - top) / 8;
      dither(p, x, y, hillNear[u < 0.5 ? 3 : 2], hillNear[u < 0.5 ? 2 : 1], (u * 2) % 1);
      if (y - top < 1) put(p, x, y, hillNear[3]);
    }
  }
}

function windmill(p: Px, t: number) {
  const { x: cx, y: base } = MILL;
  const top = 30;
  // The tower: a tapering whitewashed cone, lit from the left.
  for (let y = top; y <= base; y++) {
    const k = (y - top) / (base - top);
    const half = 6 + 4 * k;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x - (cx - half)) / (2 * half);
      const c = u < 0.12 ? wall[4] : u < 0.5 ? wall[3] : u < 0.8 ? wall[2] : u < 0.94 ? wall[1] : wall[0];
      put(p, x, y, c);
    }
    // Stone courses near the foot.
    if (y > base - 6 && (y - base) % 2 === 0) for (let x = Math.round(cx - half); x <= Math.round(cx + half); x += 3) put(p, x, y, wall[1]);
  }
  // A door with a little arch and a window above.
  for (let y = base - 7; y <= base; y++) for (let x = cx - 2; x <= cx + 1; x++) put(p, x, y, y === base - 7 && (x === cx - 2 || x === cx + 1) ? wall[2] : wood[1]);
  line(p, cx - 2, base - 6, cx - 2, base, wood[0]);
  put(p, cx + 1, base - 3, wood[3]);
  for (let y = 40; y <= 43; y++) for (let x = cx - 1; x <= cx; x++) put(p, x, y, y === 40 ? wall[1] : hx('#3a4a5a'));
  put(p, cx - 1, 41, hx('#9ac0d8'));
  // The cap: a red-brown dome.
  for (let y = 21; y <= top; y++) {
    const half = 7.5 * Math.sqrt(Math.max(0, 1 - ((top - y) / 9.5) ** 2));
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x - (cx - half)) / (2 * half + 0.01);
      put(p, x, y, u < 0.25 ? roof[3] : u < 0.65 ? roof[2] : u < 0.9 ? roof[1] : roof[0]);
    }
  }
  for (let x = cx - 8; x <= cx + 8; x++) put(p, x, top, roof[0]);
  // The sails: four lattice arms, canvas on the trailing side; a quarter turn each loop, so the loop is seamless.
  const [hx0, hy0] = MILL.hub;
  const turn = 0.3 + loopK(t) * (Math.PI / 2);
  for (let arm = 0; arm < 4; arm++) {
    const a = turn + (arm * Math.PI) / 2;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    const nx = -dy,
      ny = dx;
    for (let s = 5; s <= 31; s += 0.5)
      for (let w = 0.5; w <= 5; w += 0.5) {
        const lattice = Math.abs(s - Math.round(s / 4) * 4) < 0.3 || w > 4.6;
        put(p, hx0 + dx * s + nx * w, hy0 + dy * s + ny * w, lattice ? wood[2] : w < 1.5 ? canvasC[2] : w < 3.5 ? canvasC[1] : canvasC[0]);
      }
    for (let s = 0; s <= 32; s += 0.5) put(p, hx0 + dx * s, hy0 + dy * s, wood[1]);
  }
  disc(p, hx0, hy0, 1.6, wood[0]);
  put(p, hx0 - 1, hy0 - 1, wood[3]);
}

function fence(p: Px) {
  // Posts along the back of the meadow from the left edge to the foot of the rise, with two rails.
  const posts = [4, 22, 40, 58, 76];
  const yAt = (x: number) => MEADOW - 1 + x * 0.02;
  for (let i = 0; i < posts.length - 1; i++)
    for (const h of [3, 7]) {
      const x0 = posts[i],
        x1 = posts[i + 1];
      for (let x = x0; x <= x1; x++) {
        put(p, x, yAt(x) - h, wood[3]);
        put(p, x, yAt(x) - h + 1, wood[1]);
      }
    }
  for (const x of posts) {
    const y = yAt(x);
    for (let k = 0; k <= 10; k++) {
      put(p, x, y - k, wood[2]);
      put(p, x + 1, y - k, wood[1]);
    }
    put(p, x, y - 10, wood[4]);
    put(p, x + 1, y - 10, wood[3]);
  }
}

/** The kite: a diamond in red and yellow quarters with spars and a ribbon tail; it dances, the string sags. */
function kite(p: Px, t: number) {
  const k = loopK(t) * TAU;
  const kx = 104 + 4 * Math.sin(k),
    ky = 16 + 2.5 * Math.sin(2 * k + 0.6);
  const tilt = 0.25 * Math.sin(k + 0.9);
  // The string from the last fence post, sagging.
  const sx = 77,
    sy = MEADOW - 10;
  for (let i = 0; i <= 60; i++) {
    const u = i / 60;
    const x = sx + (kx - sx) * u,
      y = sy + (ky + 7 - sy) * u + 9 * Math.sin(u * Math.PI);
    put(p, x, y, hx('#e8e4dc'));
  }
  const ax = Math.cos(tilt),
    ay = Math.sin(tilt);
  // Diamond: half-width 5, top 6, bottom 9 (in the kite frame), four quarters.
  for (let v = -6; v <= 9; v += 0.5)
    for (let u = -5; u <= 5; u += 0.5) {
      const lim = v < 0 ? 5 * (1 + v / 6) : 5 * (1 - v / 9);
      if (Math.abs(u) > lim) continue;
      const q = (u < 0 ? 0 : 1) + (v < 0 ? 0 : 2);
      const c = q === 0 ? kiteC[3] : q === 1 ? kiteC[1] : q === 2 ? kiteC[2] : kiteC[0];
      put(p, kx + u * ax - v * ay, ky + u * ay + v * ax, Math.abs(u) > lim - 0.6 ? kiteC[0] : c);
    }
  for (let v = -6; v <= 9; v += 0.5) put(p, kx - v * ay, ky + v * ax, wood[1]);
  for (let u = -5; u <= 5; u += 0.5) put(p, kx + u * ax, ky + u * ay, wood[1]);
  // The tail: a wavy line with four bows.
  let px0 = kx - 9 * ay,
    py0 = ky + 9 * ax;
  for (let i = 1; i <= 24; i++) {
    const x = kx - (9 + i) * ay + 2.4 * Math.sin(k * 2 - i * 0.45) - i * 0.25,
      y = ky + (9 + i) * ax;
    line(p, px0, py0, x, y, kiteC[1]);
    if (i % 6 === 0) {
      put(p, x - 1, y, kiteC[2]);
      put(p, x + 1, y, kiteC[2]);
      put(p, x - 1, y - 1, kiteC[3]);
      put(p, x + 1, y + 1, kiteC[0]);
    }
    px0 = x;
    py0 = y;
  }
}

/** The meadow floor: richer and warmer toward the front, with mottling, clover and a trodden path up to the mill. */
function meadow(p: Px) {
  for (let y = MEADOW; y < H; y++) {
    const k = (y - MEADOW) / (H - MEADOW);
    for (let x = 0; x < W; x++) {
      const base = 6 - Math.round(k * 3.2);
      const n = hash(x >> 1, y >> 1, 11);
      const i = clamp(base + (n > 0.82 ? 1 : n < 0.18 ? -1 : 0), 1, 7);
      put(p, x, y, grass[i]);
    }
  }
  // Soft cloud shadows drifting on the meadow are left out: the light is high noon. Patches of lighter grass.
  for (let i = 0; i < 26; i++) {
    const cx = hash(i, 21) * W,
      cy = MEADOW + 4 + hash(i, 22) * (H - MEADOW - 4);
    const r = 6 + hash(i, 23) * 10;
    for (let y = Math.floor(cy - r * 0.3); y <= cy + r * 0.3; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if (((x - cx) / r) ** 2 + ((y - cy) / (r * 0.3)) ** 2 < 1) tint(p, x, y, grass[7], 0.25);
  }
  // The path: from the bottom right up to the mill door, narrowing with distance.
  for (let y = MEADOW - 12; y < H; y++) {
    const k = clamp((y - (MEADOW - 12)) / (H - MEADOW + 12), 0, 1);
    const cx = MILL.x - 4 + (1 - k) * 0 + k * 18 + 6 * Math.sin(k * 3.2);
    const half = 1.5 + k * 13;
    if (y < MILL.y) continue;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = Math.abs(x - cx) / half;
      const n = hash(x, y, 31);
      put(p, x, y, u > 0.85 ? (n > 0.5 ? grass[5] : dirt[1]) : n > 0.9 ? dirt[0] : n > 0.55 ? dirt[2] : dirt[1]);
      if (u < 0.6 && n > 0.985) put(p, x, y, stone[3]);
    }
  }
  // Pebbles in the grass.
  for (const [x, y, r] of [
    [30, 118, 2.2],
    [36, 121, 1.4],
    [150, 148, 2.6],
    [62, 96, 1.6],
    [120, 92, 1.4],
  ] as const) {
    disc(p, x, y + 0.6, r + 0.5, grass[1], r * 0.6);
    disc(p, x, y, r, stone[1], r * 0.65);
    disc(p, x - r * 0.3, y - r * 0.25, r * 0.55, stone[3], r * 0.35);
  }
  // Clover.
  for (let i = 0; i < 40; i++) {
    const x = Math.round(hash(i, 41) * W),
      y = Math.round(MEADOW + 6 + hash(i, 42) * (H - MEADOW - 6));
    put(p, x, y, grass[6]);
    put(p, x + 1, y, grass[6]);
    put(p, x, y - 1, grass[7]);
    if (hash(i, 43) > 0.7) put(p, x + 1, y - 1, hx('#f4f0f8'));
  }
}

/** Dandelions: white clocks and yellow flowers on thin stems; size grows toward the front; they nod in the wind. */
function dandelions(p: Px, t: number) {
  const k = loopK(t) * TAU;
  const list: { x: number; y: number; clock: boolean }[] = [];
  for (let i = 0; i < 70; i++) {
    const y = MEADOW + 3 + hash(i, 51) ** 0.8 * (H - MEADOW - 6);
    const x = hash(i, 52) * W;
    // Fewer in the middle of the meadow, where the creature lives.
    if (Math.abs(x - 104) < 34 && y > 104 && y < 146 && hash(i, 53) > 0.25) continue;
    list.push({ x, y, clock: hash(i, 54) > 0.45 });
  }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) {
    const depth = (d.y - MEADOW) / (H - MEADOW);
    const stem = 2 + depth * 7;
    const sway = 1.2 * depth * Math.sin(k + d.x * 0.06);
    const hx0 = d.x + sway,
      hy0 = d.y - stem;
    line(p, d.x, d.y, hx0, hy0, grass[d.clock ? 4 : 3]);
    if (d.clock) {
      const r = 1 + depth * 2.2;
      disc(p, hx0, hy0, r, puffC[1]);
      disc(p, hx0 - r * 0.3, hy0 - r * 0.3, r * 0.6, puffC[2]);
      if (r > 2) {
        put(p, hx0 + r * 0.6, hy0 + r * 0.5, puffC[0]);
        put(p, hx0, hy0, hx('#9a8a6a'));
      }
    } else {
      const r = 0.6 + depth * 1.6;
      disc(p, hx0, hy0, r, yellow[1]);
      put(p, hx0 - 0.4, hy0 - 0.4, yellow[2]);
      if (r > 1.4) put(p, hx0 + 0.6, hy0 + 0.6, yellow[0]);
    }
  }
}

/** Grass tufts in the near meadow, swaying in a wave that crosses from left to right. */
function tufts(p: Px, t: number) {
  const k = loopK(t) * TAU;
  for (let i = 0; i < 48; i++) {
    const y = 96 + hash(i, 61) * (H - 96);
    const x = hash(i, 62) * W;
    if (Math.abs(x - 104) < 26 && y > 112 && y < 140) continue;
    const depth = (y - MEADOW) / (H - MEADOW);
    const h = 3 + depth * 6;
    const wave = Math.sin(k - x * 0.04) * (0.8 + depth * 1.8);
    for (let b = -2; b <= 2; b++) {
      const bx = x + b * 1.2;
      const lean = b * 0.5 + wave;
      for (let s = 0; s <= h; s++) {
        const u = s / h;
        put(p, bx + lean * u * u, y - s, u > 0.7 ? grass[6] : u > 0.35 ? grass[4] : grass[2]);
      }
    }
  }
}

/** Seeds on the wind: each lives one loop at its own phase, fading in and out, so the loop has no seam. */
function seeds(p: Px, t: number) {
  for (let i = 0; i < 12; i++) {
    const tau = (loopK(t) + hash(i, 71)) % 1;
    const x0 = hash(i, 72) * (W + 40) - 40,
      y0 = 12 + hash(i, 73) * 110;
    const x = x0 + tau * 46,
      y = y0 - tau * 10 + 3 * Math.sin(tau * TAU * 1.5 + i);
    const a = Math.sin(tau * Math.PI);
    if (a < 0.15) continue;
    const c = a > 0.6 ? puffC[2] : puffC[1];
    put(p, x, y, c);
    put(p, x - 1, y - 1, c);
    put(p, x + 1, y - 1, c);
    put(p, x, y - 1, puffC[2]);
    if (a > 0.5) put(p, x, y + 1, hx('#8a7a5a'));
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p);
  cloud(p, 70, 20, 1.0, t, 0);
  cloud(p, 150, 12, 0.8, t, 2);
  cloud(p, 196, 32, 0.6, t, 4);
  cloud(p, 14, 38, 0.55, t, 5);
  hills(p);
  kite(p, t);
  rise(p);
  meadow(p);
  windmill(p, t);
  fence(p);
  dandelions(p, t);
  tufts(p, t);
  seeds(p, t);
};
scene.front = [
  {
    id: 'grass-and-clock',
    depth: 156,
    paint(p) {
      // Tall grass in the left corner.
      for (let b = 0; b < 9; b++) {
        const x0 = b * 3 - 2,
          h = 22 + hash(b, 81) * 20,
          lean = 4 + b * 0.8;
        for (let s = 0; s <= h; s++) {
          const u = s / h;
          const x = x0 + lean * u * u;
          put(p, x, H - s, u > 0.75 ? grass[5] : u > 0.4 ? grass[3] : grass[1]);
          put(p, x + 1, H - s, u > 0.75 ? grass[4] : grass[2]);
        }
      }
      // A big dandelion clock on a tall stem in the right corner, with two blades.
      const sx = 198,
        sy = H,
        tx = 192,
        ty = H - 34;
      line(p, sx, sy, tx, ty, grass[3]);
      line(p, sx + 1, sy, tx + 1, ty, grass[2]);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU;
        const r = 6 + (i % 2);
        line(p, tx, ty, tx + Math.cos(a) * r, ty + Math.sin(a) * r, puffC[0]);
        put(p, tx + Math.cos(a) * (r + 0.6), ty + Math.sin(a) * (r + 0.6), puffC[2]);
      }
      disc(p, tx, ty, 4.2, puffC[1]);
      disc(p, tx - 1.4, ty - 1.4, 2.4, puffC[2]);
      disc(p, tx, ty, 1.2, hx('#9a8a6a'));
      for (const [bx, lean, h] of [
        [204, -6, 26],
        [188, 5, 18],
      ] as const)
        for (let s = 0; s <= h; s++) {
          const u = s / h;
          put(p, bx + lean * u * u, H - s, u > 0.7 ? grass[5] : grass[2]);
          put(p, bx + 1 + lean * u * u, H - s, grass[1]);
        }
    },
  },
];
export default scene;
