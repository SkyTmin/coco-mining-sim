// «Шапито под звёздами»: inside a travelling big top at night (canon §8.3: far plan in the top third, an arena
// floor below it, a front plan). Crimson and cream canvas runs up to the apex between two masts, pennants and a
// scalloped trim hang across, and the artists' arch in the back wall opens onto the night: a crescent moon over
// distant wagons, velvet drapes tied back with gold rope. The floor is sawdust round a plank ring with a worn moon
// emblem; drum pedestals, an empty dove cage, the magic table and the trunk are the landmarks. The near ring curb
// is a foreground prop and the apron carries the footlights. It lives a little: marquee bulbs chase round the
// arch, the trapeze swings, dust drifts in the spotlight. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 256,
  H = 208;
/** The tent wall meets the sawdust here: the far plan is the top third of the field. */
const WALL = 66;
/** The arena ring (the floor boundary of the plank circle) and the artists' arch in the back wall. */
const RING = { cx: 128, cy: 140, rx: 120, ry: 50 };
export const ARCH = { cx: 128, cy: 40, r: 32, foot: WALL };
/** The painted moon behind the arch; the second-form fx put its halo here. */
export const MOON = { x: 136, y: 27, r: 9 };

const sky = [hx('#0b0f27'), hx('#111737'), hx('#182047'), hx('#212b58')];
const red = [hx('#220911'), hx('#36101c'), hx('#4f1726'), hx('#682134'), hx('#843046')];
const cream = [hx('#241e19'), hx('#3a3129'), hx('#504439'), hx('#675849'), hx('#7e6c59')];
const velvet = [hx('#26080f'), hx('#420f1e'), hx('#5e172b'), hx('#80283f'), hx('#a33e57')];
const goldT = [hx('#4a3214'), hx('#7d5a26'), hx('#b48a3e'), hx('#e6cd85')];
const wood = [hx('#21130d'), hx('#352018'), hx('#4a2f21'), hx('#5f3e2a'), hx('#765034'), hx('#8b613e')];
const dust = [hx('#38281b'), hx('#4a3523'), hx('#5c442c'), hx('#6e5435')];
const navy = [hx('#141a38'), hx('#212b56'), hx('#33407a'), hx('#3d4b8a'), hx('#4a5896')];
const cloth = [hx('#1a1230'), hx('#2a1c4a'), hx('#3d2a66'), hx('#563d86')];
const ball = [hx('#1e2d4c'), hx('#33567e'), hx('#5f8fb4'), hx('#a9d2ea')];
const trunk = [hx('#2a1810'), hx('#4a2c1c'), hx('#6c4128'), hx('#8c5a36')];
const iron = [hx('#1a1a22'), hx('#34343f'), hx('#5a5a66')];
const warm = hx('#ffe2a8'),
  cool = hx('#9fb2ff'),
  starLight = hx('#e4e9ff'),
  starDim = hx('#7f8cc4'),
  moonLit = hx('#eadfae'),
  moonMid = hx('#cbbd88'),
  moonShade = hx('#988a5a');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wave = (t: number, k: number, phase = 0) => Math.sin((t * TAU * k) / 3 + phase);
const add = (c: RGBA, d: RGBA, k: number) => mixc(c, d, clamp(k, 0, 1));
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number) => bayer[(y & 3) * 4 + (x & 3)] / 16;
const tint = (p: Px, x: number, y: number, c: RGBA, k: number) => {
  if (x >= 0 && y >= 0 && x < W && y < H) p.set(x, y, add(p.get(x, y), c, k));
};

/** Half-width of the arch opening at row y, or null above or below it. */
export function archHalf(y: number) {
  if (y < ARCH.cy - ARCH.r || y > ARCH.foot) return null;
  return y >= ARCH.cy ? ARCH.r : Math.sqrt(ARCH.r ** 2 - (y - ARCH.cy) ** 2);
}
/** Columns covered by the left (-1) or right (+1) drape at row y: hung from the crown, tied back at y 50. */
export function drapeSpan(side: number, y: number): [number, number] | null {
  const half = archHalf(y);
  if (half === null || half < 2) return null;
  const w = Math.min(half, y < 50 ? 5 + 7 * (1 - (y - 8) / 42) : 5 + 7 * ((y - 50) / 16));
  return side < 0 ? [ARCH.cx - half, ARCH.cx - half + w] : [ARCH.cx + half - w, ARCH.cx + half];
}
const ringFloor = (x: number) => {
  const d = (x - RING.cx) / RING.rx;
  return Math.abs(d) >= 1 ? null : RING.ry * Math.sqrt(1 - d * d);
};

// ---- far plan ------------------------------------------------------------------------------------
function canvas(p: Px) {
  // Panels radiate from the apex far above the field, so they widen towards the floor.
  for (let y = 0; y < WALL; y++)
    for (let x = 0; x < W; x++) {
      const u = Math.atan2(x - 128, y + 90) / 0.075 + 50.5;
      const s = Math.floor(u),
        f = u - s;
      const pal = s % 2 ? red : cream;
      let lv = 2 + (y > 36 ? 1 : 0) - (y < 12 ? 1 : 0) - (Math.abs(x - 128) > 98 ? 1 : 0);
      // Each panel bulges a little between its seams; light comes from the stage below-left.
      const bulge = Math.sin(f * Math.PI);
      if (bulge > 0.85 && y > 24 && x < 150 && s % 2) lv++;
      if (f < 0.08 || f > 0.94) lv = Math.min(lv, 1);
      if (y >= WALL - 6) lv = Math.min(lv, WALL - y > 3 ? 2 : 1);
      p.set(x, y, pal[clamp(lv, 0, 4)]);
      // Seam stitches every third row.
      if ((f < 0.12 || f > 0.9) && y % 3 === 0 && y > 8 && y < WALL - 6) p.set(x, y, pal[clamp(lv + 1, 0, 3)]);
    }
  // The wall skirt: laced to stakes along the ground.
  for (let x = 0; x < W; x++) {
    p.set(x, WALL - 1, red[0]);
    if (x % 12 === 3) for (let v = 2; v < 6; v++) p.set(x + (v & 1), WALL - v, goldT[0]);
  }
}
function trim(p: Px) {
  // Scalloped crimson trim under the canvas edge, a gold cord, a stud on every scallop.
  for (let x = 0; x < W; x++) {
    const u = (x % 24) / 24 - 0.5;
    const bottom = Math.round(5 + 4 * Math.sqrt(Math.max(0, 1 - (u * 2) ** 2)));
    for (let y = 0; y <= bottom; y++) {
      const fold = Math.sin((x % 24) * 0.5);
      p.set(x, y, y === bottom ? velvet[0] : y < 2 ? velvet[1] : velvet[fold > 0.3 ? 3 : 2]);
    }
    p.set(x, bottom + 1, goldT[1]);
    p.set(x, 2, goldT[2]);
  }
  for (let k = 0; k < 11; k++) {
    const x = k * 24 + 12;
    p.set(x, 5, goldT[3]);
    p.set(x, 6, goldT[1]);
  }
}
function masts(p: Px) {
  for (const cx of [20, 236]) {
    for (let y = 0; y < WALL + 3; y++)
      for (let u = -3; u <= 3; u++) {
        const lv = u === -3 || u === 3 ? 0 : u === -2 ? 4 : u === -1 ? 3 : u === 2 ? 1 : 2;
        p.set(cx + u, y, wood[lv]);
      }
    for (const by of [16, 38, 58]) {
      for (let u = -4; u <= 4; u++) {
        p.set(cx + u, by, goldT[u < -1 ? 3 : 2]);
        p.set(cx + u, by + 1, goldT[1]);
        p.set(cx + u, by + 2, goldT[0]);
      }
    }
    // Rope lashing under the top band and an iron foot.
    for (let v = 0; v < 6; v++) p.line(cx - 3, 20 + v * 2, cx + 3, 21 + v * 2, cream[v % 2 ? 2 : 3]);
    face(p, [[cx - 6, WALL + 3], [cx + 6, WALL + 3], [cx + 4, WALL - 1], [cx - 4, WALL - 1]], iron[1]);
    p.line(cx - 6, WALL + 3, cx + 6, WALL + 3, iron[0]);
    // Guy ropes from the mast up into the canvas.
    const dir = cx < 128 ? 1 : -1;
    for (const [tx, ty] of [[cx + dir * 46, 0], [cx + dir * 80, 0]]) p.line(cx + dir * 3, 14, tx, ty, cream[1]);
  }
}
function pennants(p: Px, x0: number, y0: number, x1: number, y1: number, sag: number, seed: number) {
  const n = Math.round(Math.abs(x1 - x0));
  const at = (k: number): Point => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + sag * 4 * k * (1 - k)];
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n);
    p.set(Math.round(x), Math.round(y), cream[1]);
  }
  const flags = [red[3], navy[2], goldT[1], cream[3]];
  for (let k = 0.06; k < 0.97; k += 7 / n) {
    const [x, y] = at(k),
      c = flags[(Math.floor((k * n) / 7) + seed) % 4];
    face(p, [[x - 2.5, y + 0.5], [x + 2.5, y + 0.5], [x, y + 6]], c);
    p.set(Math.round(x - 1), Math.round(y + 1), add(c, warm, 0.25));
  }
}
function trapeze(p: Px, t: number) {
  const swing = 0.07 * wave(t, 1);
  const len = 28,
    top = 7;
  for (const ax of [202, 222]) {
    const bx = ax + Math.sin(swing) * len,
      by = top + Math.cos(swing) * len;
    p.line(ax, top, Math.round(bx), Math.round(by), cream[2]);
  }
  const bx = 202 + Math.sin(swing) * len,
    by = Math.round(top + Math.cos(swing) * len);
  for (let u = -1; u <= 21; u++) {
    const x = Math.round(bx + u);
    p.set(x, by, u % 5 === 2 ? red[3] : wood[4]);
    p.set(x, by + 1, wood[1]);
  }
}
function archView(p: Px, t: number) {
  for (let y = ARCH.cy - ARCH.r; y <= ARCH.foot; y++) {
    const half = archHalf(y);
    if (half === null) continue;
    for (let x = Math.ceil(ARCH.cx - half); x <= ARCH.cx + half; x++) {
      const g = (y - 8) / 58 + 0.06 * Math.sin(x / 9);
      p.set(x, y, sky[3 - clamp(Math.floor(g * 4), 0, 3)]);
    }
  }
  // Distant hills with two wagons; their windows are lit.
  for (let x = ARCH.cx - ARCH.r; x <= ARCH.cx + ARCH.r; x++) {
    const top = Math.round(58 + 3 * Math.sin(x / 11) + 2 * Math.sin(x / 4.3));
    for (let y = top; y <= ARCH.foot; y++) p.set(x, y, y === top ? hx('#1a2042') : hx('#0a0d20'));
  }
  for (const [wx, wy] of [[110, 56], [146, 55]]) {
    face(p, [[wx - 6, wy], [wx + 6, wy], [wx + 6, wy + 5], [wx - 6, wy + 5]], hx('#0e1128'));
    for (let u = -6; u <= 6; u++) p.set(wx + u, wy - 1 - (Math.abs(u) < 4 ? 1 : 0), hx('#0e1128'));
    p.set(wx - 2, wy + 2, hx('#e8b65c'));
    p.set(wx + 2, wy + 2, hx('#c48e44'));
    p.set(wx - 4, wy + 6, hx('#0a0d20'));
    p.set(wx + 4, wy + 6, hx('#0a0d20'));
  }
  // Stars, a few twinkling on their own beats.
  for (let i = 0; i < 26; i++) {
    const x = Math.round(ARCH.cx - 26 + hash(i, 11) * 52),
      y = Math.round(12 + hash(i, 23) * 42);
    const half = archHalf(y);
    if (half === null || Math.abs(x - ARCH.cx) > half - 2) continue;
    if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 4) continue;
    const beat = wave(t, 1 + (i % 3), hash(i, 5) * TAU);
    p.set(x, y, beat > 0.3 ? starLight : starDim);
    if (i % 7 === 0 && beat > 0.6) for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + u, y + v, starDim);
  }
  // Crescent moon with a soft, broken halo.
  for (let y = MOON.y - 14; y <= MOON.y + 14; y++)
    for (let x = MOON.x - 14; x <= MOON.x + 14; x++) {
      const d = Math.hypot(x - MOON.x, y - MOON.y);
      const half = archHalf(y);
      if (half === null || Math.abs(x - ARCH.cx) > half) continue;
      if (d <= MOON.r) {
        if (Math.hypot(x - MOON.x - 5, y - MOON.y + 3) <= 7.5) continue;
        const shade = (x - MOON.x + y - MOON.y) / 18;
        p.set(x, y, shade > 0.2 ? moonShade : shade > -0.25 ? moonMid : moonLit);
        if (hash(x, y, 3) > 0.9) p.set(x, y, moonShade);
      } else if (d < 14 && hash(x, y, 7) < 0.45 - (d - MOON.r) / 12) p.set(x, y, sky[3]);
    }
}
function drapes(p: Px, t: number) {
  for (const side of [-1, 1]) {
    const sway = 0.5 * wave(t, 1, side);
    for (let y = ARCH.cy - ARCH.r; y <= ARCH.foot; y++) {
      const span = drapeSpan(side, y);
      if (!span) continue;
      const [a, b] = span;
      for (let x = Math.ceil(a); x <= Math.floor(b); x++) {
        const inner = side < 0 ? b - x : x - a;
        const fold = Math.sin(x * 0.9 + y * 0.05 * side + sway);
        let lv = fold > 0.55 ? 4 : fold > 0 ? 3 : fold > -0.5 ? 2 : 1;
        if (inner < 1) lv = 0;
        else if (inner < 2) lv = Math.min(lv, 2);
        if (Math.abs(y - 50) < 2) lv = Math.max(1, lv - 1);
        p.set(x, y, velvet[lv]);
      }
    }
    // Gold rope across the tie and a tassel.
    const span = drapeSpan(side, 50)!;
    const rx0 = side < 0 ? Math.floor(span[0]) - 2 : Math.ceil(span[1]) + 2,
      rx1 = side < 0 ? Math.ceil(span[1]) + 1 : Math.floor(span[0]) - 1;
    p.line(rx0, 49, rx1, 50, goldT[2]);
    p.line(rx0, 50, rx1, 51, goldT[1]);
    const tx = rx1,
      sw = Math.round(wave(t, 1, side * 2));
    face(p, [[tx - 1, 51], [tx + 1, 51], [tx + 2 + sw, 58], [tx - 2 + sw, 58]], goldT[1]);
    p.set(tx, 51, goldT[3]);
    p.set(tx + sw, 59, goldT[0]);
  }
}
function archFrame(p: Px, t: number) {
  // Painted wooden frame round the opening, 4 px, lit from the left; marquee bulbs chase round it.
  for (let y = ARCH.cy - ARCH.r - 4; y <= ARCH.foot; y++)
    for (let x = ARCH.cx - ARCH.r - 4; x <= ARCH.cx + ARCH.r + 4; x++) {
      const d = y >= ARCH.cy ? Math.abs(x - ARCH.cx) : Math.hypot(x - ARCH.cx, y - ARCH.cy);
      if (d <= ARCH.r || d > ARCH.r + 4) continue;
      const e = d - ARCH.r;
      const lit = x < ARCH.cx ? 1 : 0;
      p.set(x, y, e < 1 ? goldT[0] : e > 3 ? red[0] : e < 2 ? goldT[1 + lit] : red[2 + lit]);
    }
  const step = Math.floor(t * 8);
  let k = 0;
  const bulb = (x: number, y: number) => {
    const on = (k++ + step) % 3 === 0;
    p.set(x, y, on ? hx('#fff4d6') : goldT[0]);
    if (on) for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) tint(p, x + u, y + v, warm, 0.6);
  };
  for (let y = ARCH.foot - 3; y >= ARCH.cy; y -= 6) bulb(ARCH.cx - ARCH.r - 3, y);
  for (let a = Math.PI; a <= TAU + 0.01; a += Math.PI / 13)
    bulb(Math.round(ARCH.cx + Math.cos(a) * (ARCH.r + 3)), Math.round(ARCH.cy + Math.sin(a) * (ARCH.r + 3)));
  for (let y = ARCH.cy; y <= ARCH.foot - 3; y += 6) bulb(ARCH.cx + ARCH.r + 3, y);
  // A crest on the crown: a gold shield with a crescent.
  const cx = ARCH.cx,
    cy = ARCH.cy - ARCH.r - 4;
  face(p, [[cx - 7, cy - 4], [cx + 7, cy - 4], [cx + 6, cy + 4], [cx, cy + 8], [cx - 6, cy + 4]], goldT[0]);
  face(p, [[cx - 6, cy - 3], [cx + 6, cy - 3], [cx + 5, cy + 3], [cx, cy + 7], [cx - 5, cy + 3]], navy[1]);
  for (let v = -2; v <= 4; v++)
    for (let u = -3; u <= 3; u++)
      if (Math.hypot(u, v - 1) <= 3 && Math.hypot(u - 1.6, v - 0.2) > 2.4) p.set(cx + u, cy + v, goldT[3]);
}

// ---- floor ---------------------------------------------------------------------------------------
function sawdust(p: Px) {
  for (let y = WALL; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = hash(x >> 1, y, 13),
        m = hash(x >> 3, y >> 1, 17);
      let lv = 1 + (m > 0.6 ? 1 : 0) + (n > 0.93 ? 1 : 0) - (n < 0.1 ? 1 : 0);
      if (y < WALL + 4) lv = Math.min(lv, WALL + 4 - y > 2 ? 0 : 1);
      p.set(x, y, dust[clamp(lv, 0, 3)]);
    }
  // Wood chips and a little old confetti, rare.
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hash(i, 71) * W),
      y = WALL + 4 + Math.floor(hash(i, 73) * (H - WALL - 4));
    if (i % 6 === 0) p.set(x, y, [red[3], navy[2], goldT[2]][i % 3]);
    else {
      p.set(x, y, dust[3]);
      p.set(x + 1, y, wood[4]);
    }
  }
}
function rings(p: Px) {
  // Plank rows inside the ring, the same height everywhere (no perspective narrowing, as in the game).
  for (let y = RING.cy - RING.ry; y <= RING.cy + RING.ry; y++) {
    const row = Math.floor((y + 1) / 6),
      inRow = (y + 1) % 6;
    const length = 22 + Math.floor(hash(row, 1) * 22),
      shift = Math.floor(hash(row, 2) * 40);
    for (let x = 0; x < W; x++) {
      const half = ringFloor(x);
      if (half === null || Math.abs(y - RING.cy) > half) continue;
      const u = x + shift,
        board = Math.floor(u / length);
      let lv = 2 + Math.floor(hash(row, board, 3) * 3.2) - (hash(row, board, 9) > 0.86 ? 2 : 0);
      if (inRow === 1) lv++;
      if (hash(u >> 2, y, board) > 0.9) lv--;
      if (inRow === 0 || u % length === 0) lv = 0;
      if (u % length === 2 && (inRow === 2 || inRow === 4)) lv = 5;
      const edge = ((x - RING.cx) / RING.rx) ** 2 + ((y - RING.cy) / RING.ry) ** 2;
      if (edge > 0.82) lv--;
      p.set(x, y, wood[clamp(lv, 0, 5)]);
    }
  }
  // Knots and scuffs, rare.
  for (let i = 0; i < 18; i++) {
    const x = Math.round(RING.cx + (hash(i, 31) - 0.5) * 200),
      y = Math.round(RING.cy + (hash(i, 37) - 0.5) * 80);
    const half = ringFloor(x);
    if (half === null || Math.abs(y - RING.cy) > half - 4) continue;
    if (i % 3) {
      p.set(x, y, wood[0]);
      p.set(x + 1, y, wood[1]);
    } else for (let u = 0; u < 5; u++) p.set(x + u, y, wood[4]);
  }
  // A worn moon emblem painted in the middle of the ring.
  const ex = 128,
    ey = 150;
  for (let y = ey - 20; y <= ey + 20; y++)
    for (let x = ex - 50; x <= ex + 50; x++) {
      const r = Math.hypot((x - ex) / 48, (y - ey) / 18);
      const band = Math.abs(r - 1) < 0.045 || Math.abs(r - 0.88) < 0.03;
      const cres = Math.hypot((x - ex) / 22, (y - ey) / 9) < 1 && Math.hypot((x - ex - 8) / 19, (y - ey + 2) / 8) > 1;
      if ((band || cres) && hash(x, y, 41) > 0.3) tint(p, x, y, goldT[2], cres ? 0.32 : 0.26);
    }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    const x = Math.round(ex + Math.cos(a) * 41),
      y = Math.round(ey + Math.sin(a) * 15.5);
    tint(p, x, y, goldT[3], 0.3);
  }
}
/** The far half of the curb: its inner face looks at us, stars stencilled on it; a gold top. */
function farCurb(p: Px) {
  for (let x = 0; x < W; x++) {
    const half = ringFloor(x);
    if (half === null) continue;
    const yb = Math.round(RING.cy - half);
    for (let v = 0; v < 5; v++) p.set(x, yb - v, v === 0 ? red[0] : red[v < 3 ? 2 : 1]);
    p.set(x, yb - 5, goldT[x < 128 ? 3 : 2]);
    p.set(x, yb - 6, goldT[1]);
    if (x % 18 === 9 && Math.abs(x - 128) < 110) {
      p.set(x, yb - 2, goldT[2]);
      p.set(x - 1, yb - 2, goldT[1]);
      p.set(x + 1, yb - 2, goldT[1]);
      p.set(x, yb - 3, goldT[1]);
      p.set(x, yb - 1, goldT[1]);
    }
  }
}
function nearCurb(p: Px) {
  for (let x = 0; x < W; x++) {
    const half = ringFloor(x);
    if (half === null) continue;
    const yf = Math.round(RING.cy + half);
    p.set(x, yf + 1, dust[0]);
    for (let v = 0; v < 6; v++) p.set(x, yf - v, red[v === 0 ? 1 : v < 3 ? 3 : 2]);
    p.set(x, yf - 6, goldT[x < 128 ? 3 : 2]);
    p.set(x, yf - 7, goldT[1]);
    if (x % 18 === 9 && Math.abs(x - 128) < 112) {
      p.set(x, yf - 3, goldT[3]);
      for (const [u, v] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.set(x + u, yf - 3 + v, goldT[2]);
    }
  }
}
function benches(p: Px) {
  // Empty audience benches along the wall on both sides of the arch: three tiers, seat edges lit.
  for (const [x0, x1] of [[26, 90], [166, 230]])
    for (let tier = 2; tier >= 0; tier--) {
      const top = WALL + 6 - tier * 6;
      for (let x = x0 + tier * 2; x <= x1 - tier * 2; x++) {
        const seam = (x - x0) % 16 === 0;
        p.set(x, top, seam ? wood[2] : wood[5 - (tier === 2 ? 1 : 0)]);
        p.set(x, top + 1, wood[3]);
        for (let v = 2; v < 6; v++) p.set(x, top + v, v === 5 ? wood[0] : seam ? wood[0] : wood[1 + (v === 2 ? 1 : 0)]);
        if ((x - x0) % 16 === 8 && tier === 0) p.set(x, top + 3, goldT[1]);
      }
      // Posts under the front tier.
      if (tier === 0) for (let x = x0 + 3; x <= x1; x += 16) for (let v = 6; v < 9; v++) p.set(x, top + v, wood[0]);
    }
}
function pedestals(p: Px) {
  const drum = (cx: number, base: number, rx: number, hgt: number, body: RGBA[]) => {
    for (let y = base - hgt; y <= base + 2; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const e = (x - cx) / rx;
        if (Math.abs(e) > 1) continue;
        const bottom = base + 2 * Math.sqrt(1 - e * e);
        if (y > bottom) continue;
        const lv = e < -0.5 ? 3 : e < 0.3 ? 2 : 1;
        p.set(x, y, body[lv]);
        if (Math.abs(y - (base - hgt / 2)) < 1) p.set(x, y, goldT[e < 0 ? 2 : 1]);
      }
    for (let x = cx - rx; x <= cx + rx; x++) {
      const e = (x - cx) / rx;
      const d = 3 * Math.sqrt(Math.max(0, 1 - e * e));
      for (let y = Math.round(base - hgt - d); y <= base - hgt + d; y++) p.set(x, y, Math.abs(y - (base - hgt)) > d - 1 ? goldT[1] : body[4]);
    }
    face(p, [[cx, base - hgt / 2 - 3], [cx + 2, base - hgt / 2], [cx, base - hgt / 2 + 3], [cx - 2, base - hgt / 2]], goldT[3]);
  };
  drum(50, 96, 13, 12, red);
  drum(50, 81, 9, 9, navy);
}
function doveCage(p: Px) {
  const cx = 212,
    base = 98;
  for (let x = cx - 11; x <= cx + 11; x++) {
    const e = (x - cx) / 11;
    const d = 3 * Math.sqrt(1 - e * e);
    for (let y = Math.round(base - d); y <= base + d; y++) p.set(x, y, Math.abs(y - base) > d - 1 ? goldT[0] : goldT[1]);
  }
  for (let k = -5; k <= 5; k++) {
    const x = cx + k * 2,
      dome = 66 - Math.round(7 * Math.sqrt(1 - (k / 5.5) ** 2));
    for (let y = dome; y < base - 2; y++) if (!(k >= 1 && k <= 3 && y > 80)) p.set(x, y, goldT[k < 0 ? 2 : 1]);
  }
  for (let u = -10; u <= 10; u++) {
    p.set(cx + u, 66, goldT[2]);
    p.set(cx + u, base - 2, goldT[2]);
  }
  p.line(cx - 7, 86, cx + 7, 86, wood[4]);
  // The door stands open; a hook ring on top; a dropped feather below.
  p.line(cx + 2, 80, cx + 9, 78, goldT[2]);
  p.line(cx + 9, 78, cx + 9, 94, goldT[1]);
  for (let v = 0; v < 3; v++) p.set(cx, 56 + v, goldT[1]);
  p.set(cx - 1, 55, goldT[2]);
  p.set(cx + 1, 55, goldT[2]);
  p.line(cx - 16, 104, cx - 12, 102, hx('#d9dbe4'));
  p.set(cx - 15, 104, hx('#9aa0b0'));
}
function magicTable(p: Px, t: number) {
  const x = 38,
    y = 138;
  face(p, [[x - 20, y - 2], [x + 20, y - 2], [x + 23, y + 26], [x - 23, y + 26]], cloth[1]);
  for (let k = -3; k <= 3; k++) face(p, [[x + k * 6 - 2, y], [x + k * 6 + 2, y], [x + k * 6.6 + 2, y + 25], [x + k * 6.6 - 1, y + 25]], cloth[k % 2 ? 2 : 1]);
  for (let u = -23; u <= 23; u++) p.set(x + u, y + 26, goldT[(u & 1) + 1]);
  for (const [u, v] of [[-12, 10], [6, 16], [14, 6], [-4, 20]]) {
    p.set(x + u, y + v, goldT[3]);
    p.set(x + u - 1, y + v, goldT[1]);
    p.set(x + u + 1, y + v, goldT[1]);
  }
  for (let u = -21; u <= 21; u++) for (let v = -4; v <= 0; v++) if ((u / 21) ** 2 + ((v + 2) / 3) ** 2 <= 1) p.set(x + u, y + v, v < -2 ? cloth[3] : cloth[2]);
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
  // A deck of cards and a folded silk on the cloth.
  face(p, [[x + 9, y - 5], [x + 16, y - 5], [x + 16, y - 2], [x + 9, y - 2]], cream[4]);
  p.line(x + 9, y - 5, x + 16, y - 5, hx('#e9e2d4'));
  p.set(x + 12, y - 4, red[4]);
  face(p, [[x - 18, y - 4], [x - 10, y - 5], [x - 9, y - 2], [x - 17, y - 1]], red[3]);
}
function trunkProp(p: Px) {
  const x = 214,
    y = 166;
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
  face(p, [[x, y - 26], [x + 4, y - 21], [x, y - 17], [x - 4, y - 21]], goldT[2]);
  face(p, [[x - 8, y - 46], [x + 8, y - 46], [x + 8, y - 34], [x - 8, y - 34]], cloth[2]);
  for (let u = -8; u <= 8; u++) p.set(x + u, y - 40, goldT[2]);
  for (let v = -46; v <= -34; v++) p.set(x, y + v, goldT[2]);
  face(p, [[x, y - 46], [x - 4, y - 50], [x - 1, y - 46]], goldT[2]);
  face(p, [[x, y - 46], [x + 4, y - 50], [x + 1, y - 46]], goldT[2]);
  // A shadow on the planks.
  for (let u = -24; u <= 26; u++) tint(p, x + u, y + 1, hx('#000000'), 0.35);
}
function apron(p: Px, t: number) {
  for (let y = 191; y < H; y++)
    for (let x = 0; x < W; x++) p.set(x, y, y === 191 ? goldT[2] : y === 192 ? goldT[0] : y < 200 ? wood[1] : velvet[y < 204 ? 1 : 0]);
  for (let k = 0; k < 10; k++) {
    const x = 18 + k * 24,
      glow = 0.75 + 0.25 * wave(t, 1 + (k % 3), k);
    for (let y = 178; y < 196; y++)
      for (let u = -12; u <= 12; u++) {
        const d = Math.hypot(u / 12, (196 - y) / 14);
        if (d < 1 && hash(x + u, y, 4) < (1 - d) * glow * 0.9) tint(p, x + u, y, warm, 0.3 * (1 - d));
      }
    face(p, [[x - 4, 199], [x + 4, 199], [x + 3, 203], [x - 3, 203]], goldT[1]);
    face(p, [[x - 2, 195], [x + 2, 195], [x + 2, 199], [x - 2, 199]], add(goldT[3], warm, glow - 0.5));
    p.set(x, 194, glow > 0.9 ? hx('#ffffff') : goldT[3]);
  }
}

// ---- light ---------------------------------------------------------------------------------------
function spotlight(p: Px, t: number) {
  const cx = 128,
    cy = 160;
  for (let y = 8; y < 190; y++)
    for (let x = 30; x < 226; x++) {
      const half = 12 + 60 * Math.min(1, (y - 8) / (cy - 8));
      const inCone = y < cy && Math.abs(x - cx) < half;
      const pool = ((x - cx) / 74) ** 2 + ((y - cy) / 19) ** 2;
      let level = inCone ? 1 : 0;
      if (pool < 1) level = pool < 0.55 ? 3 : 2;
      const edge = inCone ? Math.abs(Math.abs(x - cx) - half) : 99;
      if (level === 1 && edge < 3 && dither(x, y) * 16 > edge * 5) level = 0;
      if (level >= 2 && Math.abs(pool - 0.55) < 0.12 && dither(x, y) > 0.5) level = 2;
      if (level) tint(p, x, y, warm, [0, 0.06, 0.13, 0.21][level]);
    }
  for (let i = 0; i < 24; i++) {
    const u = hash(i, 41),
      speed = 1 + (i % 2);
    const y = 14 + ((hash(i, 43) * 140 + (t / 3) * 140 * speed) % 140);
    const half = 12 + 60 * ((y - 8) / (cy - 8));
    const x = cx + (u - 0.5) * 2 * half * 0.9 + 2 * Math.sin((t * TAU) / 3 + i);
    tint(p, Math.round(x), Math.round(y), warm, 0.5);
  }
}
function moonlight(p: Px) {
  // A cool fall of moonlight through the arch onto the sawdust and the back of the ring.
  const quad: Point[] = [[100, WALL], [156, WALL], [134, 126], [64, 126]];
  for (let y = WALL; y < 126; y++) {
    const k = (y - WALL) / (126 - WALL);
    const x0 = quad[0][0] + (quad[3][0] - quad[0][0]) * k,
      x1 = quad[1][0] + (quad[2][0] - quad[1][0]) * k;
    for (let x = Math.ceil(x0); x <= x1; x++) {
      const edge = Math.min(x - x0, x1 - x);
      if (edge < 3 && dither(x, y) * 3 > edge) continue;
      tint(p, x, y, cool, 0.09 * (1 - k * 0.6));
    }
  }
}

function shade(p: Px) {
  // Contact shadow of the curb on the sawdust, then the room falls into dark towards the edges.
  for (let y = WALL; y < 191; y++)
    for (let x = 0; x < W; x++) {
      const e = Math.hypot((x - RING.cx) / RING.rx, (y - RING.cy) / RING.ry);
      if (e > 1 && e < 1.06) tint(p, x, y, hx('#000000'), 0.35 * (1 - (e - 1) / 0.06));
    }
  for (let y = 0; y < 191; y++)
    for (let x = 0; x < W; x++) {
      const k = ((x - 128) / 150) ** 2 + ((y - 150) / 120) ** 2;
      const dark = clamp((k - 0.45) * 0.55, 0, 0.42) + (y < 24 ? (24 - y) * 0.008 : 0);
      if (dark > 0.02 && !(dither(x, y) < 0.25 && dark < 0.05)) tint(p, x, y, hx('#05040a'), dark);
    }
}
const scene: Scene = (p: Px, t: number) => {
  canvas(p);
  masts(p);
  pennants(p, 24, 12, 92, 14, 9, 0);
  pennants(p, 164, 14, 232, 12, 9, 2);
  trapeze(p, t);
  archView(p, t);
  drapes(p, t);
  archFrame(p, t);
  trim(p);
  sawdust(p);
  benches(p);
  rings(p);
  farCurb(p);
  pedestals(p);
  doveCage(p);
  moonlight(p);
  magicTable(p, t);
  trunkProp(p);
  shade(p);
  spotlight(p, t);
  apron(p, t);
};
scene.front = [
  { id: 'ring-curb', depth: 189, paint: nearCurb },
  {
    id: 'rope-and-card',
    depth: 186,
    paint(p) {
      // A coil of rope on the sawdust at the left, a dropped card at the right.
      for (let r = 2; r <= 7; r += 2)
        for (let a = 0; a < TAU; a += 0.2) p.set(Math.round(16 + Math.cos(a) * r), Math.round(178 + Math.sin(a) * r * 0.4), r % 4 ? cream[3] : cream[2]);
      p.line(23, 178, 30, 184, cream[3]);
      face(p, [[236, 176], [244, 178], [242, 184], [234, 182]], cream[4]);
      p.line(236, 176, 244, 178, hx('#ece4d4'));
      p.set(239, 180, red[4]);
    },
  },
];
export default scene;
