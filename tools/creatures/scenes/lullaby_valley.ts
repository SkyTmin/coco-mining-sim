// «Колыбельная долина» (canon §8.3: far plan in the top third, the floor below, a front plan). A dream valley at
// night that looks like a sleepy child's quilt. Far: a deep indigo sky paling to violet at the horizon with twinkling
// stars; the sky is hung like a crib mobile — a big sleeping crescent moon (closed eye, little smile, a pink cheek)
// and gold stars dangle on threads from the top edge and sway. Middle: two rows of soft rolling hills sewn from quilt
// patches (plum, indigo, teal, moss) with dashed stitches along the seams and a few big buttons, two cloud sheep asleep
// on the far hills, a little wooden fence for counting sheep on the left, a crooked lantern post on the right. Floor:
// a soft meadow with a stitched path, glowing sleep-poppies and tufts of grass. Fireflies drift. Front plan: a plump
// cushion stone and poppies in the left corner, tall grass and a dandelion clock in the right one. Moonlight from the
// upper left. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 256,
  H = 208;
/** The sleeping moon on its thread, and the horizon line where the hills begin. */
export const MOON = { x: 58, y: 38, r: 19 };
export const HORIZON = 92;
/** The little fence on the left (sheep jump over it in the second-form trick). */
export const FENCE = { x0: 18, x1: 92, base: 128 };

const skyC = ['#070a24', '#0c1030', '#12163c', '#1a1b48', '#241f56', '#302562', '#3e2c6c', '#4e3474'].map((c) => hx(c));
const plumC = ['#2a1438', '#3c1e4c', '#522a62', '#6a3a78', '#84508e'].map((c) => hx(c));
const indigoC = ['#141838', '#1c2350', '#283268', '#344280', '#46569a'].map((c) => hx(c));
const tealC = ['#0c2a34', '#123c46', '#1a5058', '#26666a', '#3a7e7c'].map((c) => hx(c));
const mossC = ['#14281e', '#1c3828', '#264a32', '#325e3c', '#447448'].map((c) => hx(c));
const grassC = ['#0a1c1a', '#0f2822', '#15362c', '#1d4636', '#285840', '#356c4c', '#4a8258'].map((c) => hx(c));
const goldC = ['#7a5414', '#c08a24', '#f2c44a', '#ffe88e', '#fff8d4'].map((c) => hx(c));
const moonC = ['#b89a4a', '#e4c46a', '#f8e08e', '#fff2be', '#fffbe8'].map((c) => hx(c));
const woolC = ['#6a6a96', '#9a9ac4', '#c8c8e6', '#ececff'].map((c) => hx(c));
const woodC = ['#2a1a14', '#43291c', '#5e3c26', '#7c5432', '#9a6e42'].map((c) => hx(c));
const thread = hx('#8a84b8'),
  stitchLight = hx('#c8bce8'),
  ink = hx('#0a0820'),
  white = hx('#ffffff'),
  pink = hx('#e88aa8'),
  poppyBlue = ['#28407a', '#4a6ac4', '#8aaaf0', '#d4e2ff'].map((c) => hx(c)),
  poppyPink = ['#6a2a5a', '#b04a8e', '#e88ac0', '#ffd0ea'].map((c) => hx(c));

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
const loopK = (t: number) => (((t / 3) % 1) + 1) % 1;
function smooth(x: number, seed: number, scale: number) {
  const i = Math.floor(x / scale),
    f = x / scale - i;
  const a = hash(i, seed),
    b = hash(i + 1, seed);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}
/** A five-pointed star centred at (cx, cy). */
function star5(p: Px, cx: number, cy: number, r: number, fill: RGBA, rim: RGBA, spin = 0) {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = spin + (k / 10) * TAU,
      rad = k % 2 ? r * 0.45 : r;
    pts.push([cx + Math.sin(a) * rad, cy - Math.cos(a) * rad]);
  }
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i],
        [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const edge = !inside(x + 1.5, y + 0.5) || !inside(x - 0.5, y + 0.5) || !inside(x + 0.5, y + 1.5) || !inside(x + 0.5, y - 0.5);
      put(p, x, y, edge ? rim : y < cy - 1 && x < cx ? goldC[4] : fill);
    }
}

function sky(p: Px, t: number) {
  for (let y = 0; y < HORIZON + 14; y++) {
    const u = (y / (HORIZON + 14)) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // A soft violet band of glow along the horizon.
  for (let y = HORIZON - 30; y < HORIZON + 10; y++)
    for (let x = 0; x < W; x++) tint(p, x, y, hx('#6a4a8e'), 0.22 * (1 - Math.abs(y - HORIZON + 10) / 30));
  // Stars twinkle in turn over the loop.
  const k = loopK(t);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(i, 3) * W),
      y = Math.floor(hash(i, 5) * (HORIZON - 6));
    const tw = 0.5 + 0.5 * Math.sin(TAU * (k * (1 + (i % 3)) + hash(i, 9)));
    const c = mixc(skyC[5], i % 7 ? hx('#d8d4ff') : goldC[3], 0.35 + 0.65 * tw);
    put(p, x, y, c);
    if (i % 9 === 0 && tw > 0.7) {
      put(p, x + 1, y, mixc(get(p, x + 1, y), c, 0.5));
      put(p, x - 1, y, mixc(get(p, x - 1, y), c, 0.5));
      put(p, x, y + 1, mixc(get(p, x, y + 1), c, 0.5));
      put(p, x, y - 1, mixc(get(p, x, y - 1), c, 0.5));
    }
  }
  // A faint wisp of cloud across the moon's level.
  for (let x = 90; x < 200; x++) {
    const y = 58 + Math.round(3 * Math.sin(x * 0.07));
    tint(p, x, y, hx('#5a4a8a'), 0.35);
    tint(p, x + 6, y + 1, hx('#5a4a8a'), 0.25);
  }
}
/** The crib mobile: the moon and the stars dangle on threads from the top edge and sway with the loop. */
function mobile(p: Px, t: number) {
  const k = loopK(t) * TAU;
  // The moon: glow, a thread, the crescent, a sleeping face on its inner curve.
  const sway = Math.sin(k) * 1.2;
  const mx = MOON.x + sway,
    my = MOON.y,
    r = MOON.r;
  for (let y = my - r - 18; y <= my + r + 18; y++)
    for (let x = mx - r - 18; x <= mx + r + 18; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d > r && d < r + 18) tint(p, x, y, hx('#ffe9a8'), 0.28 * (1 - (d - r) / 18) ** 1.5);
    }
  line(p, MOON.x, 0, mx + 4, my - r + 1, thread);
  const cut = { x: mx + 9, y: my - 5, r: r * 0.86 };
  for (let y = Math.floor(my - r); y <= my + r; y++)
    for (let x = Math.floor(mx - r); x <= mx + r; x++) {
      const d = Math.hypot(x - mx, y - my),
        c = Math.hypot(x - cut.x, y - cut.y);
      if (d > r || c < cut.r) continue;
      const rim = d > r - 1.2 || c < cut.r + 1.2;
      const shade = (x - mx + (y - my)) / (2 * r);
      put(p, x, y, rim ? moonC[0] : shade < -0.35 ? moonC[4] : shade < -0.05 ? moonC[3] : shade < 0.3 ? moonC[2] : moonC[1]);
    }
  // Craters, then the sleeping face: a closed eye arc, a lash, a small smile and a pink cheek.
  for (const [cx, cy, cr] of [[-12, 4, 2], [-7, 11, 1.5], [-13, -6, 1.2]] as const) disc(p, mx + cx, my + cy, cr, moonC[1]);
  const ex = mx - 6,
    ey = my - 3;
  for (let i = -3; i <= 3; i++) put(p, ex + i, ey + Math.round((i * i) / 4), moonC[0]);
  put(p, ex - 4, ey + 2, moonC[0]);
  for (let i = -2; i <= 2; i++) put(p, mx - 3 + i, my + 7 - Math.round((i * i) / 3), moonC[0]);
  disc(p, mx - 9, my + 4, 1.6, mixc(moonC[2], pink, 0.6));
  // Little «z» drifting up from the moon over the loop.
  const zk = loopK(t);
  for (let n = 0; n < 2; n++) {
    const u = (zk + n * 0.5) % 1;
    const zx = mx + 4 + u * 16,
      zy = my - r - 2 - u * 14,
      s = 2 + Math.round(u * 2);
    const c = mixc(skyC[4], hx('#e8e0ff'), Math.sin(u * Math.PI));
    line(p, zx, zy, zx + s, zy, c);
    line(p, zx + s, zy, zx, zy + s, c);
    line(p, zx, zy + s, zx + s, zy + s, c);
  }
  // Gold stars on threads of different lengths, each swinging on its own phase.
  for (const [sx, sy, sr, ph] of [
    [118, 22, 5, 0.3],
    [152, 44, 4, 1.4],
    [190, 16, 6, 2.2],
    [226, 38, 4.5, 3.1],
    [98, 50, 3.5, 4.0],
  ] as const) {
    const sw = Math.sin(k + ph) * 1.5;
    line(p, sx, 0, sx + sw, sy - sr, thread);
    for (let y = sy - sr - 6; y <= sy + sr + 6; y++)
      for (let x = sx - sr - 6; x <= sx + sr + 6; x++) {
        const d = Math.hypot(x - sx - sw, y - sy);
        if (d > sr && d < sr + 6) tint(p, x, y, goldC[3], 0.18 * (1 - (d - sr) / 6));
      }
    star5(p, sx + sw, sy, sr, goldC[2], goldC[0], Math.sin(k + ph) * 0.12);
  }
}
/** A quilt hill band: patches between seams, dashed stitches along the seams, light on the moon side. */
function quiltHills(p: Px, top: (x: number) => number, bottom: number, palettes: RGBA[][], seed: number, patchW: number) {
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(top(x));
    for (let y = y0; y < bottom; y++) {
      const depth = y - y0;
      const col = Math.floor((x + depth * 0.6 + hash(Math.floor(y / 14), seed) * patchW) / patchW);
      const row = Math.floor((depth + 2) / 12);
      const pal = palettes[Math.floor(hash(col, row, seed) * palettes.length)];
      const lit = depth < 2 ? 4 : x < 120 ? 3 : 2;
      const shade = clamp(lit - Math.floor(depth / 18), 0, 4);
      dither(p, x, y, pal[Math.max(0, shade - 1)], pal[shade], 0.5 + 0.3 * Math.sin(x * 0.3 + y * 0.2));
      // Seams: a darker line with dashed light stitches along it.
      const seamX = (x + depth * 0.6 + hash(Math.floor(y / 14), seed) * patchW) % patchW < 1;
      const seamY = (depth + 2) % 12 === 0 && depth > 2;
      if (seamX || seamY) put(p, x, y, pal[0]);
      if ((seamX && (y & 3) === 1) || (seamY && (x & 3) === 1)) put(p, x + (seamX ? 1 : 0), y + (seamY ? 1 : 0), stitchLight);
    }
    put(p, x, y0, palettes[0][4]);
  }
}
function hills(p: Px) {
  const far = (x: number) => HORIZON - 14 + 10 * smooth(x, 11, 46) + 4 * Math.sin(x * 0.03);
  quiltHills(p, far, HORIZON + 20, [plumC, indigoC], 21, 30);
  const near = (x: number) => HORIZON + 4 + 12 * smooth(x + 40, 13, 58) + 3 * Math.sin(x * 0.05 + 1);
  quiltHills(p, near, 132, [tealC, mossC, indigoC], 23, 26);
  // Big buttons sewn on the hills, each with four holes.
  for (const [bx, by, br, pal] of [
    [36, 104, 3, plumC],
    [150, 98, 2.5, tealC],
    [236, 112, 3, mossC],
  ] as const) {
    disc(p, bx, by, br + 0.6, pal[0]);
    disc(p, bx, by, br, pal[3]);
    put(p, bx - 1, by - 1, pal[4]);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) put(p, bx + dx, by + dy, pal[1]);
    put(p, bx, by, pal[0]);
  }
}
/** Two cloud sheep asleep on the far hills with a little «z» each. */
function sleepingSheep(p: Px, t: number) {
  const k = loopK(t);
  for (const [sx, sy, ph] of [
    [176, 96, 0],
    [208, 104, 0.5],
  ] as const) {
    const breathe = Math.round(Math.sin(TAU * (k + ph)) * 0.6);
    for (const [dx, dy, r] of [[0, 0, 3.4], [-3, 1, 2.6], [3, 1, 2.6], [-1, -2, 2.4], [2, -2, 2.2]] as const) disc(p, sx + dx, sy + dy - breathe, r, woolC[1]);
    for (const [dx, dy, r] of [[-1, -2.4, 1.6], [2, -2.6, 1.3], [-3, -0.5, 1.2]] as const) disc(p, sx + dx, sy + dy - breathe, r, woolC[3]);
    disc(p, sx + 5, sy + 1, 1.8, indigoC[1], 1.5);
    put(p, sx + 6, sy + 1, woolC[2]);
    for (const dx of [-2, 2]) {
      put(p, sx + dx, sy + 4, ink);
      put(p, sx + dx, sy + 5, ink);
    }
    const u = (k * 2 + ph) % 1;
    const c = mixc(tealC[2], hx('#e8e0ff'), Math.sin(u * Math.PI));
    const zx = sx + 4 + u * 6,
      zy = sy - 6 - u * 8;
    line(p, zx, zy, zx + 2, zy, c);
    line(p, zx + 2, zy, zx, zy + 2, c);
    line(p, zx, zy + 2, zx + 2, zy + 2, c);
  }
}
/** The little counting fence on the left and a crooked lantern post on the right. */
function fenceAndLantern(p: Px, t: number) {
  const { x0, x1, base } = FENCE;
  for (const ry of [base - 9, base - 4]) {
    line(p, x0, ry, x1, ry - 2, woodC[3]);
    line(p, x0, ry + 1, x1, ry - 1, woodC[1]);
  }
  for (let x = x0 + 2; x <= x1; x += 8) {
    const yb = base - ((x - x0) / (x1 - x0)) * 2;
    for (let y = yb - 13; y <= yb; y++) {
      put(p, x, y, woodC[3]);
      put(p, x + 1, y, woodC[2]);
      put(p, x + 2, y, woodC[1]);
    }
    put(p, x + 1, yb - 14, woodC[3]);
    put(p, x, yb - 13, woodC[4]);
  }
  // The lantern: a bent post, a hook, a little glass house with a warm candle-free glow (a firefly lives in it).
  const lx = 226,
    ly = 132;
  for (let y = 0; y < 38; y++) {
    const x = lx + Math.round(Math.sin(y * 0.08) * 2);
    put(p, x, ly - y, woodC[2]);
    put(p, x + 1, ly - y, woodC[1]);
  }
  line(p, lx + 1, ly - 38, lx - 8, ly - 40, woodC[2]);
  line(p, lx - 8, ly - 40, lx - 8, ly - 36, thread);
  const k = loopK(t) * TAU;
  const g = 0.75 + 0.25 * Math.sin(k * 2);
  for (let y = ly - 48; y <= ly - 14; y++)
    for (let x = lx - 26; x <= lx + 10; x++) {
      const d = Math.hypot(x - (lx - 8), y - (ly - 31));
      if (d < 16) tint(p, x, y, goldC[3], 0.3 * g * (1 - d / 16));
    }
  for (let y = ly - 35; y <= ly - 27; y++)
    for (let x = lx - 11; x <= lx - 5; x++) {
      const edge = x === lx - 11 || x === lx - 5 || y === ly - 35 || y === ly - 27;
      put(p, x, y, edge ? woodC[1] : mixc(goldC[2], goldC[4], g * (1 - Math.abs(x - lx + 8) / 4)));
    }
  put(p, lx - 8, ly - 36, woodC[2]);
  put(p, lx - 9, ly - 36, woodC[1]);
}
function meadow(p: Px, t: number) {
  const top = 124;
  for (let y = top; y < H; y++) {
    const u = ((y - top) / (H - top)) * (grassC.length - 2),
      i = Math.min(grassC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, grassC[i + 1], grassC[i], u - i);
  }
  // Moonlight pools on the left half of the meadow.
  for (let y = top; y < H; y++) for (let x = 0; x < 150; x++) tint(p, x, y, hx('#8ab8a8'), 0.1 * (1 - x / 150) * (1 - (y - top) / (H - top)));
  // A stitched path winding to the front: a lighter band with dashed stitches on both edges.
  for (let y = top + 2; y < H; y++) {
    const u = (y - top) / (H - top);
    const cx = 150 + Math.sin(u * 2.6 + 0.4) * 34 - u * 30,
      half = 4 + u * 14;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) tint(p, x, y, mossC[4], 0.35);
    if ((y & 3) < 2) {
      put(p, cx - half, y, stitchLight);
      put(p, cx + half, y, stitchLight);
    }
  }
  // Grass tufts.
  for (let i = 0; i < 150; i++) {
    const x = hash(i, 31) * W,
      y = top + 4 + hash(i, 33) * (H - top - 6);
    const h = 2 + Math.floor(hash(i, 35) * 3 + ((y - top) / (H - top)) * 3);
    const c = grassC[Math.min(6, 4 + Math.floor(hash(i, 37) * 3))];
    for (let s = 0; s < h; s++) {
      put(p, x - s * 0.3, y - s, c);
      put(p, x + 2 + s * 0.3, y - s, grassC[3]);
    }
  }
  // Glowing sleep-poppies: round soft heads that pulse slowly, blue and pink.
  const k = loopK(t) * TAU;
  for (let i = 0; i < 16; i++) {
    const x = 8 + hash(i, 41) * (W - 16),
      y = top + 8 + hash(i, 43) * (H - top - 14);
    const pal = i % 3 ? poppyBlue : poppyPink;
    const g = 0.6 + 0.4 * Math.sin(k + i * 1.3);
    const r = 1.4 + ((y - top) / (H - top)) * 1.4;
    line(p, x, y + r, x, y + r + 3, grassC[4]);
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) {
      const d = Math.hypot(xx, yy);
      if (d > r && d < r + 5) tint(p, x + xx, y + yy, pal[2], 0.22 * g * (1 - (d - r) / 5));
    }
    disc(p, x, y, r, pal[1]);
    disc(p, x - 0.4, y - 0.4, r * 0.6, mixc(pal[2], pal[3], g));
    put(p, x - 0.6, y - 0.8, white);
  }
}
/** Fireflies drift on looping figure-eights, blinking in turn. */
function fireflies(p: Px, t: number) {
  const k = loopK(t);
  for (let i = 0; i < 9; i++) {
    const a = TAU * (k + hash(i, 51));
    const x = 20 + hash(i, 53) * 216 + Math.sin(a) * 10,
      y = 70 + hash(i, 55) * 110 + Math.sin(a * 2) * 5;
    const on = 0.5 + 0.5 * Math.sin(a * 3 + i);
    if (on < 0.15) continue;
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) {
      const d = Math.hypot(xx, yy);
      if (d < 3.5) tint(p, x + xx, y + yy, hx('#e8ff9a'), 0.35 * on * (1 - d / 3.5));
    }
    put(p, x, y, mixc(hx('#c8e870'), hx('#fbffd8'), on));
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p, t);
  mobile(p, t);
  hills(p);
  sleepingSheep(p, t);
  fenceAndLantern(p, t);
  meadow(p, t);
  fireflies(p, t);
};
scene.front = [
  {
    id: 'cushion-and-grass',
    depth: 196,
    paint(p) {
      // A plump cushion stone in the left corner: a soft round body with a stitched seam and a tassel.
      const cx = 14,
        cy = H - 6;
      for (let y = cy - 14; y <= H; y++)
        for (let x = 0; x <= cx + 22; x++) {
          const d = ((x - cx) / 22) ** 2 + ((y - cy) / 13) ** 2;
          if (d > 1) continue;
          const lit = (x - cx) / 22 + (y - cy) / 13;
          put(p, x, y, d > 0.86 ? plumC[0] : lit < -0.6 ? plumC[4] : lit < -0.1 ? plumC[3] : lit < 0.5 ? plumC[2] : plumC[1]);
        }
      for (let x = 2; x < cx + 20; x++) if ((x & 3) < 2) put(p, x, cy - 3 + Math.round(((x - cx) / 22) ** 2 * 6), stitchLight);
      disc(p, cx + 4, cy - 2, 1.4, goldC[2]);
      line(p, cx + 4, cy - 1, cx + 6, cy + 5, goldC[1]);
      for (const [px, py] of [
        [40, H - 4],
        [46, H - 9],
      ] as const) {
        line(p, px, py, px, H, grassC[4]);
        disc(p, px, py, 2.6, poppyPink[1]);
        disc(p, px - 0.6, py - 0.6, 1.4, poppyPink[3]);
      }
      // Tall grass and a dandelion clock in the right corner.
      for (const [gx, lean, h] of [
        [236, -6, 30],
        [244, 4, 24],
        [228, -10, 20],
        [250, -3, 34],
      ] as const)
        for (let s = 0; s <= h; s++) {
          const u = s / h;
          put(p, gx + lean * u * u, H - s, grassC[5]);
          put(p, gx + 1 + lean * u * u, H - s, grassC[3]);
        }
      const dx = 240,
        dy = H - 40;
      line(p, 246, H, dx, dy, grassC[4]);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        line(p, dx, dy, dx + Math.cos(a) * 5, dy + Math.sin(a) * 5, woolC[2]);
        put(p, dx + Math.cos(a) * 6, dy + Math.sin(a) * 6, woolC[3]);
      }
      disc(p, dx, dy, 1.2, woolC[1]);
    },
  },
];
export default scene;
