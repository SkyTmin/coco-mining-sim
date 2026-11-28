// «Тыквенная грядка под луной» (canon §8.3: far plan in the top third, the floor below, a front plan). Far: a deep blue
// night sky with twinkling stars, a big full moon upper left (the light of the picture comes from it, like the rig's
// light) with a soft halo and thin clouds, two bats circling it, dark rolling hills with a windmill turning its sails
// and a barn with warm lit windows. Middle: a crooked old tree on the left with a hollow and a lantern swinging from a
// branch, a picket fence across the field, a friendly scarecrow on the right. Floor: moonlit furrows of a pumpkin patch,
// vines with leaves and curls, pumpkins of every size, a carved pumpkin with a flickering candle, a hay bale,
// mushrooms, fallen leaves and fireflies. Front plan: a big pumpkin in the right corner and tall grass with leaves on
// the left. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 160,
  H = 128;
/** The horizon line (bottom of the hills) and the top of the patch where the fence stands. */
export const HORIZON = 44;
export const FENCE = 58;
/** The moon: centre and radius (field pixels). */
export const MOON = { x: 30, y: 17, r: 10 };

const skyC = [hx('#0b0d2a'), hx('#111843'), hx('#18275a'), hx('#213a6c'), hx('#2c4e7a'), hx('#3c6286')];
const moonC = [hx('#c9c4a4'), hx('#e2dcb8'), hx('#f4efd2'), hx('#fffbea')];
const hillC = [hx('#0e1430'), hx('#141c3c'), hx('#1a2648'), hx('#223156')];
const soil = [hx('#1a1424'), hx('#241b30'), hx('#30243c'), hx('#3e304a'), hx('#4e3e5a'), hx('#64546e')];
const wood = [hx('#1c1620'), hx('#2e2430'), hx('#463844'), hx('#625260'), hx('#8a7a86')];
const bark = [hx('#120e18'), hx('#1e1824'), hx('#2c2432'), hx('#3e3444'), hx('#5a4e5e')];
const pump = [hx('#4a1c10'), hx('#7a3014'), hx('#ae4818'), hx('#d8661e'), hx('#f08c2c'), hx('#ffb452')];
const vine = [hx('#14261a'), hx('#1e3824'), hx('#2c4e2e'), hx('#3e663a'), hx('#58824a')];
const hay = [hx('#4a3a1c'), hx('#6e5626'), hx('#94763a'), hx('#b8984e'), hx('#d8bc6c')];
const warm = [hx('#ff9a2a'), hx('#ffc65a'), hx('#fff0a8')];
const leafC = [hx('#a83a1a'), hx('#d8641e'), hx('#e8a02a'), hx('#c4462a')];
const shirt = [hx('#2a3a6a'), hx('#3a5290'), hx('#c04040')];
const star = hx('#dfe6ff');
const bat = hx('#05060e');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function get(p: Px, x: number, y: number): RGBA {
  return p.get(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1)) as RGBA;
}
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  // Ordered 2×2 dither between two tones.
  const m = [0.2, 0.7, 0.95, 0.45][(x & 1) + 2 * (y & 1)];
  put(p, x, y, u > m ? b : a);
}
/** Blend towards a colour, dithered: `a` is how much. */
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0) return;
  const m = [0.2, 0.7, 0.95, 0.45][(Math.round(x) & 1) + 2 * (Math.round(y) & 1)];
  put(p, x, y, mixc(get(p, x, y), c, a > m ? Math.min(1, a + 0.25) : a * 0.5));
}

function sky(p: Px, t: number) {
  for (let y = 0; y < HORIZON; y++) {
    const u = (y / HORIZON) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // Stars: small dots, a few crosses that twinkle in turn.
  for (let i = 0; i < 38; i++) {
    const x = Math.floor(hash(i, 11) * W),
      y = Math.floor(hash(i, 12) * (HORIZON - 14));
    if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 7) continue;
    const tw = (Math.floor(t * 4) + i) % 7;
    const dim = mixc(star, skyC[2], 0.45);
    put(p, x, y, tw === 0 ? dim : star);
    if (i % 6 === 0 && tw > 2) {
      put(p, x - 1, y, dim);
      put(p, x + 1, y, dim);
      put(p, x, y - 1, dim);
      put(p, x, y + 1, dim);
    }
  }
}
function moon(p: Px, t: number) {
  const { x: cx, y: cy, r } = MOON;
  // A soft halo in two dithered rings.
  for (let y = cy - r - 9; y <= cy + r + 9; y++)
    for (let x = cx - r - 9; x <= cx + r + 9; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r && d < r + 9) tint(p, x, y, hx('#4a6a9a'), 0.55 * (1 - (d - r) / 9));
    }
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx,
        dy = y - cy,
        d = Math.hypot(dx, dy);
      if (d > r) continue;
      // Lit from the upper left, a darker rim towards the lower right.
      const lit = -(dx * 0.6 + dy * 0.8) / r;
      const v = clamp(2 + lit * 1.2 - (d > r - 1.2 ? 0.8 : 0), 0, 3);
      put(p, x, y, moonC[Math.round(v)]);
    }
  // Maria: soft grey patches.
  for (const [mx, my, mr] of [[-3, -2, 3.2], [3, 2, 2.6], [-1, 5, 1.8], [4, -5, 1.5]] as [number, number, number][])
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) if (x * x + y * y <= mr * mr) dither(p, cx + mx + x, cy + my + y, get(p, cx + mx + x, cy + my + y), moonC[0], 0.6);
  // Two small craters with a lit lower lip.
  for (const [mx, my] of [[-5, 3], [2, -2]] as [number, number][]) {
    put(p, cx + mx, cy + my, moonC[0]);
    put(p, cx + mx + 1, cy + my, moonC[0]);
    put(p, cx + mx, cy + my + 1, moonC[3]);
  }
  // Thin clouds drift slowly across the moon and back.
  const drift = Math.sin((t / 3) * TAU) * 2.5;
  for (const [y, x0, len, k] of [[cy + 4, cx - 22, 30, 0], [cy + 7, cx - 8, 34, 1], [cy - 6, cx + 6, 22, 2], [12, 96, 30, 3], [22, 126, 26, 4]] as [number, number, number, number][]) {
    const ox = x0 + drift * (k % 2 ? -1 : 1);
    for (let i = 0; i < len; i++) {
      const thick = Math.round(1.6 * Math.sin((i / len) * Math.PI));
      for (let j = 0; j <= thick; j++) {
        const x = ox + i,
          yy = y - j;
        const nearMoon = Math.hypot(x - cx, yy - cy) < r + 4;
        tint(p, x, yy, nearMoon ? hx('#c8d0e8') : hx('#5a6c98'), j === thick ? 0.75 : 0.55);
      }
    }
  }
}
function bats(p: Px, t: number) {
  // Two bats circle the moon on a slow figure-eight, flapping.
  for (let i = 0; i < 2; i++) {
    const a = (t / 3) * TAU + i * Math.PI;
    const x = MOON.x + 26 * Math.sin(a) + 18,
      y = MOON.y - 4 + 7 * Math.sin(2 * a);
    const flap = Math.floor(t * 10 + i * 3) % 3;
    put(p, x, y, bat);
    put(p, x, y + 1, bat);
    for (const s of [-1, 1]) {
      put(p, x + s, y, bat);
      put(p, x + s * 2, y + (flap === 0 ? -1 : flap === 1 ? 0 : 1), bat);
      put(p, x + s * 3, y + (flap === 0 ? -2 : flap === 1 ? 0 : 1), bat);
    }
  }
}
function hills(p: Px, t: number) {
  // Two rows of rolling hills; the far row catches a little moonlight on its tops.
  for (let x = 0; x < W; x++) {
    const far = HORIZON - 10 - Math.round(3 * Math.sin(x * 0.045 + 0.6) + 2 * Math.sin(x * 0.11 + 2));
    for (let y = far; y < HORIZON + 2; y++) put(p, x, y, y === far ? hillC[3] : hillC[1]);
    const near = HORIZON - 4 - Math.round(2.5 * Math.sin(x * 0.07 + 2.4) + 1.2 * Math.sin(x * 0.19));
    for (let y = near; y < HORIZON + 2; y++) put(p, x, y, y === near ? hillC[2] : hillC[0]);
  }
  // Little pine silhouettes on the far hills.
  for (const [x, h] of [[52, 6], [57, 4], [61, 5], [140, 6], [146, 4], [152, 5]] as [number, number][]) {
    const base = HORIZON - 8 - Math.round(3 * Math.sin(x * 0.045 + 0.6) + 2 * Math.sin(x * 0.11 + 2));
    for (let k = 0; k < h; k++) {
      const half = Math.floor((h - k) / 2);
      for (let dx = -half; dx <= half; dx++) put(p, x + dx, base - k, hillC[0]);
    }
  }
  windmill(p, t);
  barn(p, t);
}
function windmill(p: Px, t: number) {
  // A tapering tower on the near hill; four sails turn a quarter turn per loop (seamless).
  const cx = 78,
    base = HORIZON - 3,
    top = HORIZON - 19;
  for (let y = top; y <= base; y++) {
    const half = 2 + ((y - top) / (base - top)) * 2.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) put(p, x, y, x < cx - half + 1.2 ? hillC[3] : hillC[0]);
  }
  face(p, [[cx - 3, top], [cx, top - 4], [cx + 3, top]] as Point[], hillC[0]);
  put(p, cx + 1, base - 5, warm[0]);
  put(p, cx + 1, base - 4, warm[0]);
  const hubX = cx,
    hubY = top - 1;
  const a0 = (t / 3) * (Math.PI / 2);
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2;
    const dx = Math.cos(a),
      dy = Math.sin(a);
    for (let s = 1; s <= 11; s++) {
      put(p, hubX + dx * s, hubY + dy * s, hillC[0]);
      // The sail cloth: a narrow panel on one side of each arm.
      if (s > 3) put(p, hubX + dx * s - dy * 1.5, hubY + dy * s + dx * 1.5, hillC[2]);
      if (s > 3 && s < 11) put(p, hubX + dx * s - dy * 2.5, hubY + dy * s + dx * 2.5, hillC[2]);
    }
  }
  put(p, hubX, hubY, hillC[3]);
}
function barn(p: Px, t: number) {
  // A barn on the right with a gambrel roof and two warm windows (the left one flickers like a lamp).
  const x0 = 112,
    base = HORIZON - 1;
  face(p, [[x0, base], [x0, base - 8], [x0 + 3, base - 13], [x0 + 9, base - 16], [x0 + 15, base - 13], [x0 + 18, base - 8], [x0 + 18, base]] as Point[], hillC[0]);
  for (let x = x0 + 3; x < x0 + 9; x++) put(p, x, base - 13 - Math.round((x - x0 - 3) / 2), hillC[3]);
  const flick = 0.5 + 0.5 * Math.sin(t * TAU * 2.3) * Math.sin(t * TAU * 1.1 + 1);
  for (const [wx, wy, k] of [[x0 + 4, base - 6, 0], [x0 + 12, base - 6, 1], [x0 + 8, base - 11, 1]] as [number, number, number][]) {
    const c = k === 0 && flick < 0.35 ? warm[0] : warm[1];
    put(p, wx, wy, c);
    put(p, wx + 1, wy, c);
    put(p, wx, wy + 1, warm[0]);
    put(p, wx + 1, wy + 1, warm[0]);
  }
  // A path of light falls from the door on the grass.
  for (let k = 0; k < 3; k++) tint(p, x0 + 8 + k, base + 1, warm[0], 0.4);
}
function field(p: Px) {
  // Furrows receding: bands that grow wider towards the viewer, a moonlit ridge on each, dark troughs between.
  for (let y = HORIZON + 1; y < H; y++) {
    const depth = (y - HORIZON) / (H - HORIZON);
    const row = Math.sqrt(depth) * 11;
    const phase = row - Math.floor(row);
    const lit = phase < 0.22 ? 3 : phase < 0.5 ? 2 : phase < 0.82 ? 1 : 0;
    for (let x = 0; x < W; x++) {
      // Moonlight is stronger towards the left (the moon side).
      const glow = 0.5 * (1 - x / W) * (1 - depth * 0.6);
      const v = clamp(lit + glow + 0.4 * (hash(x, y, 5) - 0.5), 0, 4.99);
      const i = Math.floor(v);
      dither(p, x, y, soil[i], soil[i + 1], v - i);
    }
  }
  // Grass on the bank behind the fence.
  for (let x = 0; x < W; x++) {
    const h = 2 + Math.round(1.5 * Math.sin(x * 0.4) + hash(x, 3));
    for (let k = 0; k < h; k++) put(p, x, FENCE + 2 - k, k === h - 1 ? vine[3] : vine[1]);
  }
  // Pebbles and clods in the furrows.
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 21) * W),
      y = Math.floor(FENCE + 6 + hash(i, 22) * (H - FENCE - 8));
    put(p, x, y, soil[4]);
    put(p, x + 1, y, soil[5]);
    put(p, x, y + 1, soil[0]);
  }
}
function tree(p: Px, t: number) {
  // A crooked old tree on the left edge: a thick leaning trunk with a dark hollow, bare branches against the sky.
  const base = FENCE + 8;
  for (let y = 6; y <= base; y++) {
    const u = (y - 6) / (base - 6);
    const cx = 10 + 5 * Math.sin(u * 2.4 + 0.4) - u * 3;
    const half = 2 + 5.5 * u * u + (y > base - 4 ? (y - base + 4) * 1.2 : 0);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const s = (x - cx) / Math.max(1, half);
      // Moonlit on the left (moon side), bark furrows.
      const v = clamp(2.4 - s * 1.6 + 0.6 * Math.sin(y * 0.8 + x * 1.7), 0, 4.4);
      put(p, x, y, bark[Math.round(v)]);
    }
  }
  // The hollow, an oval with a lit lower lip.
  for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) if ((x / 2.4) ** 2 + (y / 3.4) ** 2 <= 1) put(p, 12 + x, 34 + y, hx('#05040a'));
  put(p, 11, 38, bark[4]);
  put(p, 12, 38, bark[4]);
  put(p, 13, 38, bark[3]);
  // Two eyes glinting in the hollow now and then (a friend of the owl).
  if (Math.floor(t * 2) % 3 === 1) {
    put(p, 11, 33, hx('#ffd25a'));
    put(p, 13, 33, hx('#ffd25a'));
  }
  // Branches: crooked lines thinning out, twigs at the ends.
  const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    let bx = x,
      by = y,
      ang = a;
    for (let s = 0; s < len; s++) {
      ang += 0.12 * Math.sin(s * 1.3 + d);
      bx += Math.cos(ang);
      by += Math.sin(ang);
      const ww = Math.max(0, Math.round(w * (1 - s / len)));
      for (let k = -ww; k <= ww; k++) put(p, bx, by + k, k === -ww ? bark[3] : bark[1]);
    }
    return [bx, by] as [number, number];
  };
  branch(12, 14, -0.35, 24, 1.5, 0);
  const [lx, ly] = branch(10, 22, -0.05, 22, 1.2, 2);
  branch(8, 10, -1.4, 9, 0.8, 1);
  branch(30, 8, -0.9, 7, 0, 3);
  branch(24, 11, 0.4, 6, 0, 4);
  // A lantern swings from the lower branch: a string, a little iron cage, a warm flame and a glow on the bark.
  const swing = Math.sin((t / 3) * TAU * 2) * 0.18;
  const hx0 = lx - 2,
    hy0 = ly;
  const lxp = hx0 + Math.sin(swing) * 7,
    lyp = hy0 + Math.cos(swing) * 7;
  for (let s = 0; s <= 6; s++) put(p, hx0 + Math.sin(swing) * s, hy0 + Math.cos(swing) * s, bark[0]);
  for (let y = -10; y <= 10; y++)
    for (let x = -10; x <= 10; x++) {
      const d = Math.hypot(x, y);
      if (d > 3 && d < 10) tint(p, lxp + x, lyp + 3 + y, warm[0], 0.32 * (1 - d / 10));
    }
  const flick = Math.floor(t * 12) % 3;
  put(p, lxp - 1, lyp, wood[0]);
  put(p, lxp, lyp, wood[0]);
  put(p, lxp + 1, lyp, wood[0]);
  for (let y = 1; y <= 4; y++) {
    put(p, lxp - 2, lyp + y, wood[1]);
    put(p, lxp + 2, lyp + y, wood[1]);
    for (let x = -1; x <= 1; x++) put(p, lxp + x, lyp + y, y === 2 && x === 0 ? warm[2] : y === 3 ? warm[1] : flick === 1 && y === 1 ? warm[1] : warm[0]);
  }
  put(p, lxp, lyp + 5, wood[1]);
}
function fence(p: Px) {
  // A crooked picket fence across the field, its tops lit by the moon; two rails.
  for (const ry of [FENCE - 7, FENCE - 2]) for (let x = 0; x < W; x++) if (x < 40 || x > 46) put(p, x, ry + Math.round(Math.sin(x * 0.07)), (x + ry) % 9 ? wood[2] : wood[1]);
  for (let x = 2; x < W; x += 6) {
    if (x > 38 && x < 48) continue;
    const lean = hash(x, 31) > 0.7 ? 1 : 0;
    const top = FENCE - 11 - Math.round(hash(x, 32) * 2);
    for (let y = top; y <= FENCE + 1; y++) {
      const dx = y < top + 4 ? lean : 0;
      put(p, x + dx, y, wood[3]);
      put(p, x + dx + 1, y, wood[2]);
      put(p, x + dx + 2, y, wood[1]);
    }
    put(p, x + lean + 1, top - 1, wood[4]);
    put(p, x + lean, top, wood[4]);
  }
  // A broken plank lying at the gap.
  for (let x = 38; x < 47; x++) put(p, x, FENCE + 2 + Math.round((x - 38) * 0.2), wood[2]);
}
function scarecrow(p: Px, t: number) {
  // A friendly scarecrow behind the fence on the right: a pole, a sack head with a stitched smile and a floppy hat,
  // a patched shirt, straw hands; it rocks a little in the wind.
  const sway = Math.sin((t / 3) * TAU) * 1.2;
  const cx = 140,
    base = FENCE - 1;
  for (let y = base - 26; y <= base; y++) put(p, cx, y, wood[1]);
  const ox = Math.round(sway);
  // Shirt and arms.
  face(p, [[cx - 4 + ox, base - 20], [cx + 4 + ox, base - 20], [cx + 5 + ox, base - 11], [cx - 5 + ox, base - 11]] as Point[], shirt[1]);
  for (let x = -12; x <= 12; x++) {
    const y = base - 19 + Math.round(Math.abs(x) * 0.08 + Math.sin(x * 0.6 + t * 4) * 0.4);
    put(p, cx + x + ox, y, Math.abs(x) > 9 ? hay[3] : shirt[0]);
    if (Math.abs(x) <= 9) put(p, cx + x + ox, y + 1, shirt[1]);
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) put(p, cx + s * (13 + k) + ox, base - 19 + k - 1, hay[4]);
  put(p, cx + 2 + ox, base - 16, shirt[2]);
  put(p, cx + 3 + ox, base - 16, shirt[2]);
  put(p, cx + 2 + ox, base - 15, shirt[2]);
  // Head: a round sack, two button eyes, a stitched smile.
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) put(p, cx + x + ox, base - 25 + y, x + y < -2 ? hay[4] : hay[3]);
  put(p, cx - 2 + ox, base - 26, wood[0]);
  put(p, cx + 2 + ox, base - 26, wood[0]);
  for (let x = -2; x <= 2; x++) put(p, cx + x + ox, base - 23 + (Math.abs(x) === 2 ? -1 : 0), wood[1]);
  // Floppy hat.
  for (let x = -6; x <= 6; x++) put(p, cx + x + ox, base - 29 + (Math.abs(x) > 4 ? 1 : 0), wood[2]);
  face(p, [[cx - 3 + ox, base - 29], [cx - 2 + ox, base - 33], [cx + 3 + ox, base - 34], [cx + 3 + ox, base - 29]] as Point[], wood[2]);
  put(p, cx - 2 + ox, base - 30, shirt[2]);
  put(p, cx - 1 + ox, base - 30, shirt[2]);
  put(p, cx + ox, base - 30, shirt[2]);
  // Straw tufts at the neck.
  for (const x of [-2, 0, 2]) put(p, cx + x + ox, base - 21, hay[4]);
}
/** A ribbed pumpkin lit from the upper left; `carved` cuts a smiling face with a candle that flickers. */
function pumpkin(p: Px, cx: number, cy: number, rx: number, ry: number, t: number, carved = false) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x - cx) / rx,
        v = (y - cy) / ry;
      // Lobes: the outline bulges between ribs.
      const lobes = 1 + 0.06 * Math.cos(u * Math.PI * 3);
      if (u * u + v * v > lobes) continue;
      const rib = Math.cos(Math.asin(clamp(u, -1, 1)) * 5);
      const lit = -0.65 * u - 0.75 * v + 0.35 * rib;
      const k = clamp(2.4 + lit * 1.6 - (u * u + v * v > 0.86 * lobes ? 0.9 : 0), 0, 5);
      put(p, x, y, pump[Math.round(k)]);
      if (rib < -0.82 && Math.abs(v) < 0.85) put(p, x, y, pump[Math.max(0, Math.round(k) - 2)]);
    }
  // Stem and a small leaf.
  for (let k = 0; k < Math.max(2, Math.round(ry * 0.5)); k++) put(p, cx - 1 + Math.round(k * 0.4), cy - ry - k + 1, k ? vine[2] : vine[1]);
  put(p, cx - 1, cy - ry, vine[3]);
  put(p, cx + 2, cy - ry, vine[3]);
  put(p, cx + 3, cy - ry - 1, vine[4]);
  if (carved) {
    const flick = 0.5 + 0.5 * Math.sin(t * TAU * 3.1) * Math.cos(t * TAU * 1.7);
    const inner = flick > 0.6 ? warm[2] : flick > 0.3 ? warm[1] : warm[0];
    for (const s of [-1, 1]) face(p, [[cx + s * rx * 0.2, cy - ry * 0.1], [cx + s * rx * 0.55, cy - ry * 0.1], [cx + s * rx * 0.38, cy - ry * 0.45]] as Point[], inner);
    for (let x = Math.round(cx - rx * 0.55); x <= Math.round(cx + rx * 0.55); x++) {
      const u = (x - cx) / (rx * 0.55);
      const y0 = cy + ry * 0.2 + u * u * -ry * 0.25,
        y1 = cy + ry * 0.45 - u * u * ry * 0.2;
      for (let y = Math.round(y0); y <= Math.round(y1); y++) if (!(Math.abs(u) < 0.3 && y === Math.round(y0))) put(p, x, y, inner);
    }
    // Warm glow on the ground round it.
    for (let y = -4; y <= 4; y++)
      for (let x = -rx - 8; x <= rx + 8; x++) {
        const d = Math.hypot(x / (rx + 8), y / 4);
        if (d < 1 && (x * x) / (rx * rx) + ((y + ry) * (y + ry)) / (ry * ry) > 1) tint(p, cx + x, cy + ry + y, warm[0], 0.3 * (1 - d) * (0.7 + 0.3 * flick));
      }
  }
}
function vines(p: Px, t: number) {
  // Creeping vines between the pumpkins, broad leaves, little curls; the leaves stir.
  const runs: [number, number, number, number][] = [[0, 76, 70, 0.08], [96, 70, 64, -0.04], [20, 96, 40, 0.12], [118, 92, 42, -0.1]];
  for (const [x0, y0, len, slope] of runs) {
    for (let i = 0; i < len; i++) {
      const x = x0 + i,
        y = y0 + slope * i + 1.5 * Math.sin(i * 0.25 + x0);
      put(p, x, y, vine[2]);
      if (i % 9 === 4) {
        // A leaf: three-lobed, lit on top.
        const stir = Math.round(Math.sin(t * TAU * 0.67 + i) * 0.6);
        for (let ly = -3; ly <= 1; ly++)
          for (let lx = -3; lx <= 3; lx++) {
            const lobe = Math.abs(lx) + Math.abs(ly + 1) * 0.9;
            if (lobe > 3.4) continue;
            put(p, x + lx + stir, y + ly - 1, ly < -1 ? vine[4] : lx > 1 ? vine[1] : vine[3]);
          }
        put(p, x + stir, y - 2, vine[1]);
      }
      if (i % 13 === 8) {
        // A curl.
        put(p, x + 1, y - 1, vine[3]);
        put(p, x + 2, y - 2, vine[3]);
        put(p, x + 3, y - 1, vine[3]);
        put(p, x + 2, y, vine[3]);
      }
    }
  }
}
function hayBale(p: Px) {
  // A round hay bale on the left behind the patch, lit from the moon side, its spiral end showing.
  const cx = 30,
    cy = 66;
  for (let y = -7; y <= 7; y++)
    for (let x = -9; x <= 9; x++) {
      const u = x / 9,
        v = y / 7;
      if (u * u + v * v > 1) continue;
      const lit = -0.7 * u - 0.6 * v;
      const k = clamp(2 + lit * 1.6 + 0.6 * (hash(x, y, 41) - 0.5), 0, 4);
      put(p, cx + x, cy + y, hay[Math.round(k)]);
    }
  for (let a = 0; a < TAU * 2.2; a += 0.25) {
    const r = 0.9 * a;
    put(p, cx - 3 + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.7, hay[1]);
  }
  for (let x = -8; x <= 8; x++) put(p, cx + x, cy + 8, soil[0]);
}
function mushrooms(p: Px) {
  // A few small mushrooms at the tree's roots, pale caps with spots.
  for (const [x, y, s] of [[20, 70, 1], [24, 72, 0], [5, 74, 1]] as [number, number, number][]) {
    for (let k = 0; k < 2 + s; k++) put(p, x, y - k, hx('#d8d0c0'));
    for (let dx = -1 - s; dx <= 1 + s; dx++) put(p, x + dx, y - 2 - s, dx < 0 ? hx('#e86a5a') : hx('#b8403a'));
    put(p, x, y - 3 - s, hx('#e86a5a'));
    put(p, x - 1, y - 2 - s, hx('#fff0e0'));
  }
}
function leaves(p: Px, t: number) {
  // Fallen leaves on the furrows, and two drifting down, swaying.
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(hash(i, 51) * W),
      y = Math.floor(FENCE + 10 + hash(i, 52) * (H - FENCE - 14));
    const c = leafC[i % leafC.length];
    put(p, x, y, c);
    put(p, x + 1, y, c);
    if (i % 2) put(p, x + 1, y - 1, mixc(c, hx('#ffffff'), 0.25));
  }
  for (let i = 0; i < 2; i++) {
    const k = ((t / 3 + i * 0.5) % 1 + 1) % 1;
    const x = 58 + i * 46 + Math.sin(k * TAU * 2) * 4,
      y = 8 + k * 60;
    put(p, x, y, leafC[i + 1]);
    put(p, x + (Math.sin(k * TAU * 2) > 0 ? 1 : -1), y, leafC[i]);
  }
}
function fireflies(p: Px, t: number) {
  // Fireflies drift on slow loops, glowing on and off.
  for (let i = 0; i < 8; i++) {
    const a = (t / 3) * TAU + i * 1.7;
    const x = 20 + hash(i, 61) * 120 + 6 * Math.sin(a + i),
      y = FENCE - 6 + hash(i, 62) * 50 + 4 * Math.sin(2 * a + i * 0.5);
    const on = 0.5 + 0.5 * Math.sin(a * 2 + i * 2.1);
    if (on < 0.25) continue;
    put(p, x, y, on > 0.7 ? hx('#f8ffb0') : hx('#c8e070'));
    if (on > 0.7) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) tint(p, x + dx, y + dy, hx('#c8e070'), 0.5);
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p, t);
  moon(p, t);
  bats(p, t);
  hills(p, t);
  field(p);
  tree(p, t);
  fence(p);
  scarecrow(p, t);
  hayBale(p);
  mushrooms(p);
  vines(p, t);
  pumpkin(p, 120, 70, 7, 5, t, true);
  pumpkin(p, 104, 66, 4, 3, t);
  pumpkin(p, 58, 72, 5, 4, t);
  pumpkin(p, 136, 84, 9, 6.5, t);
  pumpkin(p, 14, 92, 8, 6, t);
  pumpkin(p, 30, 108, 5, 4, t);
  pumpkin(p, 82, 64, 3, 2.4, t);
  leaves(p, t);
  fireflies(p, t);
};
scene.front = [
  {
    id: 'pumpkin-and-grass',
    depth: 124,
    paint(p) {
      pumpkin(p, 150, 122, 14, 10, 0);
      // Tall grass and a few leaves in the left corner.
      for (let i = 0; i < 9; i++) {
        const x0 = i * 2 + (i % 3);
        const h = 9 + ((i * 5) % 7);
        const bend = Math.sin(i * 1.7) * 1.2;
        for (let k = 0; k < h; k++) put(p, x0 + (bend * k) / h + (k * (i % 2 ? 0.2 : -0.15)), H - 1 - k, k > h - 3 ? vine[4] : i % 2 ? vine[2] : vine[3]);
      }
      for (const [x, y, c] of [[6, 122, 0], [14, 125, 2], [2, 118, 1]] as [number, number, number][]) {
        put(p, x, y, leafC[c]);
        put(p, x + 1, y, leafC[c]);
        put(p, x, y - 1, leafC[c]);
      }
    },
  },
];
export default scene;
