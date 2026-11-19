// «Шапито под звёздами»: a small travelling stage at night. Crimson curtains tied with gold ropes,
// a painted night backdrop with a crescent moon, paper stars on strings, plank floor in a spotlight,
// a draped magic table with a crystal ball, a trunk, and a row of footlights. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 256,
  H = 208;
const night = [hx('#0f1330'), hx('#161c42'), hx('#1f2853'), hx('#2b3666')];
const starLight = hx('#e4e9ff'),
  starDim = hx('#8d9bd6');
const moonLit = hx('#f6ecc0'),
  moonMid = hx('#dccf98'),
  moonShade = hx('#a99b6e'),
  moonHalo = hx('#2f3a72');
const curtain = [hx('#26080f'), hx('#420f1e'), hx('#64192f'), hx('#8a2a45'), hx('#b4485f')];
const goldT = [hx('#5a3c17'), hx('#966a2c'), hx('#d4a64a'), hx('#fbe7a0')];
const plank = [hx('#2d1a12'), hx('#46291b'), hx('#603a25'), hx('#7c4f31'), hx('#9b6740')];
const warm = hx('#ffe9b0');
const cloth = [hx('#1d1236'), hx('#2f1d55'), hx('#462b78'), hx('#64419c')];
const ball = [hx('#24375c'), hx('#3f6a9a'), hx('#7fb6d8'), hx('#d4f2ff')];
const trunk = [hx('#2a1810'), hx('#4a2c1c'), hx('#6c4128'), hx('#8c5a36')];

const wave = (t: number, k: number, phase = 0) => Math.sin((t * TAU * k) / 3 + phase);
const add = (c: RGBA, d: RGBA, k: number) => mixc(c, d, Math.max(0, Math.min(1, k)));

function backdrop(p: Px, t: number) {
  for (let y = 0; y < 120; y++)
    for (let x = 0; x < W; x++) {
      const g = y / 120 + 0.08 * Math.sin(x / 40 + y / 30);
      const i = Math.min(3, Math.floor(g * 4));
      p.set(x, y, night[3 - i]);
    }
  // Painted cloud wisps.
  for (const [cx, cy, len] of [[52, 62, 40], [188, 48, 46], [150, 88, 34]] as const)
    for (let k = 0; k < len; k++) {
      const x = cx - len / 2 + k,
        y = cy + Math.round(2 * Math.sin(k / 6));
      p.set(x, y, night[3]);
      if (k % 3) p.set(x, y + 1, night[2]);
      if (k > 4 && k < len - 4 && k % 2) p.set(x, y - 1, hx('#3a4780'));
    }
  // Halo and crescent moon.
  const mx = 128,
    my = 50;
  for (let y = my - 30; y <= my + 30; y++)
    for (let x = mx - 30; x <= mx + 30; x++) {
      const d = Math.hypot(x - mx, y - my);
      if (d < 29 && d > 19 && hash(x, y, 7) < 0.55 - (d - 19) / 22 + 0.04 * wave(t, 1)) p.set(x, y, moonHalo);
    }
  for (let y = my - 18; y <= my + 18; y++)
    for (let x = mx - 18; x <= mx + 18; x++) {
      const d = Math.hypot(x - mx, y - my),
        cut = Math.hypot(x - mx - 9, y - my + 5);
      if (d <= 17 && cut > 14) {
        const shade = (x - mx + y - my) / 34;
        p.set(x, y, shade > 0.15 ? moonShade : shade > -0.25 ? moonMid : moonLit);
        if (hash(x >> 1, y >> 1, 3) > 0.9) p.set(x, y, moonShade);
      }
    }
  // Twinkling stars: each has its own beat that divides the 3 s loop.
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, 11) * 196) + 30,
      y = Math.floor(hash(i, 23) * 104) + 18;
    if (Math.hypot(x - mx, y - my) < 24) continue;
    const beat = wave(t, 1 + (i % 3), hash(i, 5) * TAU);
    const big = i % 9 === 0;
    p.set(x, y, beat > 0.2 ? starLight : starDim);
    if (big || beat > 0.75) {
      const c = beat > 0.75 ? starLight : starDim;
      p.set(x - 1, y, c);
      p.set(x + 1, y, c);
      p.set(x, y - 1, c);
      p.set(x, y + 1, c);
      if (big && beat > 0.5) {
        p.set(x - 2, y, starDim);
        p.set(x + 2, y, starDim);
        p.set(x, y - 2, starDim);
        p.set(x, y + 2, starDim);
      }
    }
  }
}
function paperStar(p: Px, ax: number, len: number, t: number, k: number) {
  const swing = 0.09 * wave(t, 1, k * 1.7) + 0.03 * wave(t, 2, k);
  const x = ax + Math.sin(swing) * len,
    y = 22 + Math.cos(swing) * len;
  for (let s = 0; s < len; s += 1) p.set(Math.round(ax + Math.sin(swing) * s), Math.round(22 + Math.cos(swing) * s), hx('#a39a7a'));
  const pts: Point[] = [];
  for (let n = 0; n < 10; n++) {
    const a = (n / 10) * TAU + swing * 2 - Math.PI / 2,
      r = n % 2 ? 2.6 : 6.2;
    pts.push([x + Math.cos(a) * r, y + 6 + Math.sin(a) * r]);
  }
  face(p, pts.map(([u, v]) => [u + 1, v + 1] as Point), goldT[0]);
  face(p, pts, goldT[2]);
  face(p, pts.map(([u, v]) => [x + (u - x) * 0.5 - 0.5, y + 6 + (v - y - 6) * 0.5 - 0.5] as Point), goldT[3]);
}
function curtains(p: Px, t: number) {
  for (const side of [-1, 1]) {
    const sway = 0.6 * wave(t, 1, side);
    for (let y = 0; y < 124; y++) {
      // Tied back at y = 92: the inner edge narrows to the rope, then flares to the floor.
      const tie = 92;
      const edge =
        y < tie ? 62 - 26 * Math.pow(y / tie, 1.4) + sway * (y / tie) : 36 + 22 * Math.pow((y - tie) / 32, 0.8);
      for (let d = 0; d < edge; d++) {
        const x = side < 0 ? d : W - 1 - d;
        const fold = Math.sin(d * 0.42 + y * 0.012 * (y < tie ? 1 : -2) + sway * 0.3);
        let i = fold > 0.6 ? 4 : fold > 0.1 ? 3 : fold > -0.45 ? 2 : 1;
        if (edge - d < 2) i = 0;
        else if (edge - d < 4) i = Math.min(i, 2);
        if (y > tie - 3 && y < tie + 3) i = Math.max(1, i - 1);
        p.set(x, y, curtain[i]);
      }
      if (y % 2 === 0 && y > 20) {
        const x = side < 0 ? Math.floor(edge) - 1 : W - Math.floor(edge);
        p.set(x, y, goldT[1]);
      }
    }
    // Gold rope and tassel at the tie.
    const rx = side < 0 ? 36 : W - 37;
    for (let k = -6; k < 7; k++) {
      p.set(rx + k * -side, 91 + Math.round(Math.abs(k) * 0.25), goldT[2]);
      p.set(rx + k * -side, 92 + Math.round(Math.abs(k) * 0.25), goldT[1]);
    }
    const tx = rx - side * 6,
      swing = Math.round(1.2 * wave(t, 1, side * 2));
    face(p, [[tx - 2, 93], [tx + 2, 93], [tx + 3 + swing, 104], [tx - 3 + swing, 104]], goldT[1]);
    face(p, [[tx - 1, 93], [tx + 1, 93], [tx + 1 + swing, 103], [tx - 1 + swing, 103]], goldT[2]);
    p.set(tx, 92, goldT[3]);
    for (let k = -3; k <= 3; k++) p.set(tx + k + swing, 105, goldT[k % 2 ? 0 : 1]);
  }
}
function valance(p: Px, t: number) {
  for (let y = 0; y < 26; y++)
    for (let x = 0; x < W; x++) {
      const u = (x % 32) / 32 - 0.5;
      const bottom = 16 + 7 * Math.sqrt(Math.max(0, 1 - (u * 2) ** 2));
      if (y > bottom) continue;
      const fold = Math.sin((x % 32) * 0.4);
      let i = y > bottom - 2 ? 0 : fold > 0.5 ? 4 : fold > -0.2 ? 3 : 2;
      if (y < 3) i = 1;
      p.set(x, y, curtain[i]);
    }
  for (let x = 0; x < W; x++) {
    const u = (x % 32) / 32 - 0.5;
    const bottom = Math.round(16 + 7 * Math.sqrt(Math.max(0, 1 - (u * 2) ** 2)));
    p.set(x, bottom + 1, goldT[2]);
    if (x % 2 === 0) p.set(x, bottom + 2 + (x % 4 === 0 ? 1 : 0), goldT[1]);
    p.set(x, 4, goldT[2]);
    p.set(x, 5, goldT[0]);
  }
  // Gold stars on the valance, one per scallop, glinting in turn.
  for (let k = 0; k < 8; k++) {
    const x = k * 32 + 16,
      glint = wave(t, 1, k * 0.8) > 0.85;
    face(p, [[x, 8], [x + 3, 12], [x, 16], [x - 3, 12]], goldT[glint ? 3 : 2]);
    p.set(x, 12, goldT[glint ? 3 : 1]);
  }
}
function floor(p: Px, t: number) {
  const vx = 128,
    vy = 30;
  for (let y = 118; y < H; y++)
    for (let x = 0; x < W; x++) {
      const along = (x - vx) / (y - vy);
      const board = Math.floor(along * 9 + 100);
      const frac = (along * 9 + 100) % 1;
      const seam = frac < 0.06 || frac > 0.97;
      // Long boards: a butt joint every ~40 rows, staggered per board.
      const depth = 1 / (y - vy);
      const joint = Math.abs(((depth * 900 + hash(board, 3) * 7) % 7) - 3.5) < 0.12;
      let i = 2 + (hash(board, 1) > 0.66 ? 1 : 0) - (hash(board, 2) > 0.8 ? 1 : 0);
      if (frac > 0.75 && frac < 0.9) i += 1;
      if (seam || joint) i = 0;
      if (hash(x >> 1, y, board) > 0.97) i = Math.max(0, i - 1);
      p.set(x, y, plank[Math.max(0, Math.min(4, i))]);
    }
  // The back edge of the stage under the painted cloth.
  for (let x = 0; x < W; x++) {
    p.set(x, 118, plank[0]);
    p.set(x, 119, goldT[1]);
    p.set(x, 120, plank[1]);
  }
  // Front lip with a gold strip and footlights in brass shells.
  for (let y = 198; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, y === 198 ? goldT[2] : y === 199 ? goldT[0] : curtain[y < 204 ? 1 : 0]);
  for (let k = 0; k < 10; k++) {
    const x = 18 + k * 24,
      glow = 0.75 + 0.25 * wave(t, 1 + (k % 3), k);
    for (let y = 186; y < 198; y++)
      for (let u = -12; u <= 12; u++) {
        const d = Math.hypot(u / 12, (198 - y) / 12);
        if (d < 1 && hash(x + u, y, 4) < (1 - d) * glow * 0.9) p.set(x + u, y, add(p.get(x + u, y), warm, 0.35 * (1 - d)));
      }
    face(p, [[x - 4, 199], [x + 4, 199], [x + 3, 203], [x - 3, 203]], goldT[1]);
    face(p, [[x - 2, 196], [x + 2, 196], [x + 2, 199], [x - 2, 199]], add(goldT[3], warm, glow - 0.5));
    p.set(x, 195, glow > 0.9 ? hx('#ffffff') : goldT[3]);
  }
}
function spotlight(p: Px, t: number) {
  const cx = 128,
    cy = 162;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 26; y < 198; y++)
    for (let x = 30; x < 226; x++) {
      const k = (y - 26) / (cy - 26);
      const half = 18 + 56 * Math.min(1, k);
      const inCone = y < cy && Math.abs(x - cx) < half;
      const pool = ((x - cx) / 76) ** 2 + ((y - cy) / 20) ** 2;
      // Two clean steps of light; ordered dither only along each border.
      let level = inCone ? 1 : 0;
      if (pool < 1) level = pool < 0.55 ? 3 : 2;
      const edge = inCone ? Math.abs(Math.abs(x - cx) - half) : 99;
      if (level === 1 && edge < 3 && bayer[(y % 4) * 4 + (x % 4)] > edge * 5) level = 0;
      if (level >= 2 && Math.abs(pool - 0.55) < 0.12 && bayer[(y % 4) * 4 + (x % 4)] > 8) level = 2;
      if (level) p.set(x, y, add(p.get(x, y), warm, [0, 0.07, 0.15, 0.24][level]));
    }
  // Dust drifting through the beam.
  for (let i = 0; i < 26; i++) {
    const u = hash(i, 41),
      speed = 1 + (i % 2);
    const y = 30 + ((hash(i, 43) * 130 + (t / 3) * 130 * speed) % 130);
    const half = 18 + 56 * ((y - 26) / (cy - 26));
    const x = cx + (u - 0.5) * 2 * half * 0.9 + 2 * Math.sin(t * 2 + i);
    p.set(Math.round(x), Math.round(y), add(p.get(Math.round(x), Math.round(y)), warm, 0.55));
  }
}
function magicTable(p: Px, t: number) {
  const x = 38,
    y = 146;
  // Draped cloth with a gold hem and stars.
  face(p, [[x - 20, y - 2], [x + 20, y - 2], [x + 23, y + 26], [x - 23, y + 26]], cloth[1]);
  for (let k = -3; k <= 3; k++) face(p, [[x + k * 6 - 2, y], [x + k * 6 + 2, y], [x + k * 6.6 + 2, y + 25], [x + k * 6.6 - 1, y + 25]], cloth[k % 2 ? 2 : 1]);
  for (let u = -23; u <= 23; u++) p.set(x + u, y + 26, goldT[(u & 1) + 1]);
  for (const [u, v] of [[-12, 10], [6, 16], [14, 6], [-4, 20]]) {
    p.set(x + u, y + v, goldT[3]);
    p.set(x + u - 1, y + v, goldT[1]);
    p.set(x + u + 1, y + v, goldT[1]);
  }
  for (let u = -21; u <= 21; u++) for (let v = -4; v <= 0; v++) if ((u / 21) ** 2 + ((v + 2) / 3) ** 2 <= 1) p.set(x + u, y + v, v < -2 ? cloth[3] : cloth[2]);
  // Crystal ball on a brass stand, pulsing softly.
  const pulse = 0.5 + 0.5 * wave(t, 1);
  face(p, [[x - 5, y - 4], [x + 5, y - 4], [x + 3, y - 8], [x - 3, y - 8]], goldT[1]);
  for (let v = -11; v <= 11; v++)
    for (let u = -11; u <= 11; u++) {
      const d = Math.hypot(u, v);
      if (d > 10) continue;
      const shade = (u + v) / 20;
      let c = shade < -0.35 ? ball[3] : shade < 0.05 ? ball[2] : shade < 0.45 ? ball[1] : ball[0];
      if (d < 5) c = add(c, hx('#e6d4ff'), 0.3 * pulse);
      p.set(x + u, y - 18 + v, c);
    }
  p.set(x - 4, y - 23, hx('#ffffff'));
  p.set(x - 3, y - 23, ball[3]);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + (t * TAU) / 3;
    p.set(Math.round(x + Math.cos(a) * 13), Math.round(y - 18 + Math.sin(a) * 5), add(ball[2], hx('#ffffff'), pulse * 0.5));
  }
}
function trunkProp(p: Px) {
  const x = 218,
    y = 172;
  face(p, [[x - 22, y - 28], [x + 22, y - 28], [x + 22, y], [x - 22, y]], trunk[1]);
  face(p, [[x - 22, y - 28], [x + 22, y - 28], [x + 18, y - 34], [x - 18, y - 34]], trunk[3]);
  for (let u = -22; u <= 22; u++) {
    p.set(x + u, y - 28, trunk[0]);
    p.set(x + u, y - 15, goldT[1]);
  }
  for (const u of [-22, -21, 21, 22]) for (let v = -34; v <= 0; v++) p.set(x + u, y + v, goldT[v % 2 ? 1 : 0]);
  for (const u of [-10, 10]) for (let v = -28; v <= 0; v++) p.set(x + u, y + v, trunk[0]);
  face(p, [[x - 3, y - 18], [x + 3, y - 18], [x + 3, y - 12], [x - 3, y - 12]], goldT[2]);
  p.set(x, y - 15, goldT[0]);
  // A star decal on the lid and a small box with a pull ribbon on top.
  face(p, [[x, y - 26], [x + 4, y - 21], [x, y - 17], [x - 4, y - 21]], goldT[2]);
  face(p, [[x - 8, y - 46], [x + 8, y - 46], [x + 8, y - 34], [x - 8, y - 34]], cloth[2]);
  for (let u = -8; u <= 8; u++) p.set(x + u, y - 40, goldT[2]);
  for (let v = -46; v <= -34; v++) p.set(x, y + v, goldT[2]);
  face(p, [[x, y - 46], [x - 4, y - 50], [x - 1, y - 46]], goldT[2]);
  face(p, [[x, y - 46], [x + 4, y - 50], [x + 1, y - 46]], goldT[2]);
}
const scene: Scene = (p: Px, t: number) => {
  backdrop(p, t);
  paperStar(p, 74, 24, t, 0);
  paperStar(p, 184, 30, t, 1);
  paperStar(p, 156, 16, t, 2);
  floor(p, t);
  curtains(p, t);
  valance(p, t);
  magicTable(p, t);
  trunkProp(p);
  spotlight(p, t);
};
export default scene;
