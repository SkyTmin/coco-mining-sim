// «Отлив»: a sandy shore at low tide in the late afternoon (canon §8.3: far plan in the top third, the floor below,
// a front plan). Far: a warm sky with two slow clouds and a pair of gulls, the sea to the horizon with sun glints, a
// striped lighthouse on a rock islet. The surf rolls in and out over the wet sand, which mirrors the sky. Floor: ripple
// marks, two tide pools (one with a starfish), shells, seaweed, a barnacled rock with mussels on the left, the stern of
// an old rowboat half sunk in the sand on the right. Front plan: a big conch and a tuft of dune grass in the corners.
// Light from the upper left. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 160,
  H = 128;
/** The horizon and the waterline; the fx put splashes and wet marks relative to these. */
export const HORIZON = 33;
export const SHORE = 50;

const skyC = [hx('#9ed0e6'), hx('#b4dbe8'), hx('#cfe4e4'), hx('#f0e2c8'), hx('#f8d8b0')];
const cloud = [hx('#f6efe6'), hx('#ffffff'), hx('#e2d6cc'), hx('#c8bcb8')];
const seaC = [hx('#1e5a74'), hx('#26708a'), hx('#3488a0'), hx('#4aa0b4'), hx('#74c0cc')];
const foamC = [hx('#d8f0f0'), hx('#ffffff'), hx('#a8d8dc')];
const wet = [hx('#8a7a64'), hx('#9c8a70'), hx('#ae9a7c'), hx('#bea886')];
const sand = [hx('#a8906a'), hx('#bca07a'), hx('#ccb088'), hx('#dcc298'), hx('#e8d2a8'), hx('#f2e0b8')];
const rockC = [hx('#2e2a2c'), hx('#46403e'), hx('#5e5652'), hx('#7a706a'), hx('#988c84')];
const wood = [hx('#3a2418'), hx('#563622'), hx('#74492c'), hx('#8e5e38'), hx('#a8774a')];
const weed = [hx('#2a3a1c'), hx('#3e5426'), hx('#587230'), hx('#78923e')];
const shellC = [hx('#c89a86'), hx('#e8c0aa'), hx('#f8e0d0'), hx('#ffffff')];
const pink = [hx('#b04a3a'), hx('#d86a50'), hx('#f0906a')];
const mussel = [hx('#1a1c2a'), hx('#2c3044'), hx('#4a5272')];
const white = hx('#ffffff');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  // Ordered 2×2 dither between two tones.
  const m = [0.2, 0.7, 0.95, 0.45][(x & 1) + 2 * (y & 1)];
  put(p, x, y, u > m ? b : a);
}

function skyDome(p: Px) {
  for (let y = 0; y < HORIZON; y++) {
    const u = (y / HORIZON) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // The low sun glow on the right, behind the haze.
  for (let y = HORIZON - 12; y < HORIZON; y++)
    for (let x = 96; x < 150; x++) {
      const d = Math.hypot((x - 122) / 26, (y - HORIZON) / 10);
      if (d < 1) dither(p, x, y, p.get(x, y) as RGBA, hx('#fff0d0'), (1 - d) * 0.9);
    }
}
function clouds(p: Px, t: number) {
  const puff = (cx: number, cy: number, w: number) => {
    for (let k = 0; k < 5; k++) {
      const ox = cx + (k - 2) * w * 0.35,
        oy = cy - Math.sin((k / 4) * Math.PI) * w * 0.18,
        r = w * (0.22 + 0.08 * Math.sin(k * 1.7));
      for (let y = -r; y <= r * 0.6; y++)
        for (let x = -r * 1.3; x <= r * 1.3; x++) {
          const d = Math.hypot(x / 1.3, y) / r;
          if (d < 1) put(p, ox + x, oy + y, y < -r * 0.35 ? cloud[1] : d > 0.82 || y > r * 0.3 ? cloud[2] : cloud[0]);
        }
    }
  };
  // Slow drift that loops: each cloud slides 4 px over 3 s and wraps on a soft ease.
  const drift = Math.sin((t / 3) * TAU) * 1.5;
  puff(34 + drift, 11, 26);
  puff(104 - drift, 6, 18);
}
function gulls(p: Px, t: number) {
  for (const [x0, y0, ph] of [[54, 14, 0], [64, 18, 1.7]] as const) {
    const a = (t / 3) * TAU,
      x = x0 + Math.cos(a + ph) * 6,
      y = y0 + Math.sin(a * 2 + ph) * 1.5;
    const flap = Math.sin(t * TAU * 2 + ph);
    const wing = Math.round(flap * 1.6);
    const c = hx('#4a4a52');
    put(p, x, y, c);
    put(p, x - 1, y - (wing > 0 ? 1 : 0), c);
    put(p, x + 1, y - (wing > 0 ? 1 : 0), c);
    put(p, x - 2, y - wing, c);
    put(p, x + 2, y - wing, c);
    put(p, x - 3, y - wing + (wing < 0 ? 1 : 0), c);
    put(p, x + 3, y - wing + (wing < 0 ? 1 : 0), c);
  }
}
function lighthouse(p: Px, t: number) {
  // A rock islet with a striped tower; the lamp blinks once per loop.
  face(p, [[124, HORIZON + 2], [128, HORIZON - 3], [134, HORIZON - 4], [140, HORIZON - 2], [146, HORIZON + 2]], rockC[1]);
  face(p, [[128, HORIZON - 3], [134, HORIZON - 4], [133, HORIZON - 1], [129, HORIZON]], rockC[2]);
  for (let y = HORIZON - 17; y <= HORIZON - 4; y++) {
    const half = 1.4 + (y - (HORIZON - 17)) * 0.1;
    const band = Math.floor((y - (HORIZON - 17)) / 3) % 2;
    for (let x = Math.round(134 - half); x <= Math.round(134 + half); x++) put(p, x, y, band ? hx('#c04a3a') : x < 134 ? hx('#f0ece4') : hx('#d0c8c0'));
  }
  for (let x = 132; x <= 136; x++) put(p, x, HORIZON - 18, hx('#3a3434'));
  const lit = (t % 3) < 0.35;
  put(p, 134, HORIZON - 19, lit ? hx('#fff8c0') : hx('#c0a060'));
  put(p, 133, HORIZON - 19, hx('#3a3434'));
  put(p, 135, HORIZON - 19, hx('#3a3434'));
  put(p, 134, HORIZON - 20, hx('#3a3434'));
  if (lit) for (let k = 1; k < 6; k++) put(p, 134 - k * 2, HORIZON - 19 - (k > 3 ? 1 : 0), mixc(hx('#fff8c0'), skyC[2], k / 6));
}
function sea(p: Px, t: number) {
  for (let y = HORIZON; y < SHORE; y++) {
    const u = (y - HORIZON) / (SHORE - HORIZON);
    for (let x = 0; x < W; x++) {
      const band = Math.floor(u * 3.99);
      const c = seaC[clamp(band + (hash(x >> 2, y) > 0.8 ? 1 : 0), 0, 4)];
      put(p, x, y, c);
    }
  }
  // Long swells and sun glints on the path of light under the sun.
  for (let y = HORIZON + 1; y < SHORE - 2; y += 2)
    for (let x = 0; x < W; x++) {
      const s = Math.sin(x * 0.18 + y * 1.3 + (t / 3) * TAU * (y % 4 ? 1 : -1));
      if (s > 0.86) put(p, x, y, seaC[4]);
      const near = Math.abs(x - 122) < 10 + (y - HORIZON) * 0.8;
      if (near && hash(x, y + Math.floor((t / 3) * 6)) > 0.9) put(p, x, y, white);
    }
}
function surf(p: Px, t: number) {
  // The wash rolls up the sand and back: a foam lip, a lace of bubbles and a wet sheen that mirrors the sky.
  const k = (t / 3) * TAU;
  for (let x = 0; x < W; x++) {
    const reach = SHORE + 3 + 2.5 * Math.sin(k - x * 0.04) + 1.2 * Math.sin(x * 0.17 + 1);
    for (let y = SHORE - 3; y < reach + 6; y++) {
      if (y < reach) put(p, x, y, y < reach - 2 ? seaC[3] : foamC[(x + y) % 3 === 0 ? 2 : 0]);
      else if (y < reach + 5) dither(p, x, y, wet[2], skyC[2], (1 - (y - reach) / 5) * 0.55);
    }
    if (hash(x, Math.floor(k * 2)) > 0.6) put(p, x, reach - 1, foamC[1]);
  }
}
function beach(p: Px) {
  for (let y = SHORE + 4; y < H; y++) {
    const u = (y - SHORE - 4) / (H - SHORE - 4);
    for (let x = 0; x < W; x++) {
      const v = u * 5.2 + (hash(x, y) - 0.5) * 0.6;
      const i = clamp(Math.floor(v), 0, 4);
      const c = u < 0.18 ? mixc(wet[3], sand[1], u / 0.18) : sand[i];
      dither(p, x, y, c, sand[clamp(i + 1, 0, 5)], v - Math.floor(v));
    }
  }
  // Ripple marks: soft wavy ridges, light on the sun side and dark behind.
  for (let row = 0; row < 9; row++) {
    const y0 = SHORE + 10 + row * row * 0.9 + row * 4;
    for (let x = 0; x < W; x++) {
      const y = y0 + 1.6 * Math.sin(x * (0.16 - row * 0.008) + row * 1.9);
      if (hash(x, row) > 0.18) {
        put(p, x, y, sand[clamp(2 + Math.floor(row / 2), 0, 5)]);
        put(p, x, y + 1, sand[clamp(Math.floor(row / 2), 0, 5)]);
      }
    }
  }
}
function tidePool(p: Px, cx: number, cy: number, rx: number, ry: number, t: number, star: boolean) {
  for (let y = -ry - 1; y <= ry + 1; y++)
    for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = Math.hypot(x / rx, y / ry);
      if (d > 1.12) continue;
      if (d > 1) put(p, cx + x, cy + y, wet[1]);
      else {
        const u = (y + ry) / (2 * ry);
        put(p, cx + x, cy + y, mixc(skyC[1], seaC[2], 0.35 + u * 0.4));
      }
    }
  // A glint that slides across and a ring from a drop.
  const g = Math.round(cx - rx * 0.6 + ((t / 3) % 1) * rx * 1.2);
  put(p, g, cy - Math.round(ry * 0.4), white);
  put(p, g + 1, cy - Math.round(ry * 0.4), foamC[0]);
  if (star) {
    // A small starfish in the shallow water.
    const sx = cx + Math.round(rx * 0.35),
      sy = cy + 1;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      for (let s = 0; s <= 3; s++) put(p, sx + Math.cos(a) * s * 1.1, sy + Math.sin(a) * s * 0.7, s < 2 ? pink[1] : pink[0]);
    }
    put(p, sx, sy, pink[2]);
  }
}
function shells(p: Px) {
  const spots: [number, number, number][] = [[18, 108, 0], [44, 92, 1], [112, 96, 2], [140, 112, 0], [62, 120, 1], [96, 68, 2], [30, 74, 1], [150, 84, 2]];
  for (const [x, y, k] of spots) {
    if (k === 0) {
      // Scallop: a fan with ribs.
      for (let r = 0; r < 4; r++) for (let a = -2; a <= 2; a++) put(p, x + a * (r / 3), y - r, (a + r) % 2 ? shellC[1] : shellC[2]);
      put(p, x, y + 1, shellC[0]);
    } else if (k === 1) {
      // Little spiral whelk.
      put(p, x, y, shellC[2]);
      put(p, x + 1, y, shellC[1]);
      put(p, x + 1, y - 1, shellC[3]);
      put(p, x + 2, y - 1, shellC[0]);
      put(p, x - 1, y + 1, shellC[0]);
    } else {
      // A pink cockle half buried.
      put(p, x, y, pink[2]);
      put(p, x + 1, y, pink[1]);
      put(p, x - 1, y, pink[1]);
      put(p, x, y - 1, shellC[2]);
    }
  }
}
function seaweed(p: Px, x0: number, y0: number, n: number) {
  for (let k = 0; k < n; k++) {
    const x = x0 + k * 2 - n;
    for (let s = 0; s < 4 + (k % 3); s++) put(p, x + Math.round(Math.sin(s * 0.9 + k) * 1.2), y0 - s * 0.6, weed[clamp(3 - (s >> 1), 0, 3)]);
  }
}
function rock(p: Px) {
  const pts: Point[] = [[0, 98], [0, 66], [6, 60], [16, 58], [26, 63], [32, 72], [34, 86], [28, 96], [16, 100]];
  face(p, pts, rockC[2]);
  face(p, [[0, 66], [6, 60], [16, 58], [14, 66], [6, 72], [0, 74]], rockC[3]);
  face(p, [[16, 58], [26, 63], [32, 72], [24, 74], [18, 66]], rockC[3]);
  face(p, [[24, 80], [32, 76], [34, 86], [28, 96], [22, 92]], rockC[1]);
  face(p, [[0, 86], [10, 90], [16, 100], [0, 98]], rockC[1]);
  for (let i = 0; i < 18; i++) {
    // Barnacles: pale cones with a dark mouth.
    const x = 3 + hash(i, 5) * 26,
      y = 62 + hash(i, 6) * 30;
    put(p, x, y, shellC[1]);
    put(p, x + 1, y, shellC[2]);
    put(p, x, y + 1, shellC[0]);
    if (i % 3 === 0) put(p, x + 1, y + 1, rockC[0]);
  }
  for (let i = 0; i < 9; i++) {
    // Mussels clustered at the foot of the rock.
    const x = 6 + i * 2.6,
      y = 94 + (i % 2) * 2 - Math.abs(i - 4) * 0.4;
    put(p, x, y, mussel[1]);
    put(p, x + 1, y, mussel[2]);
    put(p, x, y + 1, mussel[0]);
    put(p, x + 1, y - 1, mussel[1]);
  }
  for (let x = 0; x < 30; x++) if (hash(x, 3) > 0.5) put(p, x, 96 + Math.round(Math.abs(x - 14) * 0.25), weed[1]);
}
function rowboat(p: Px) {
  // The stern of an old rowboat sunk in the sand at an angle: transom, planks, a rope coil.
  face(p, [[118, 76], [124, 58], [160, 52], [160, 72], [134, 80]], wood[2]);
  face(p, [[118, 76], [124, 58], [128, 58], [124, 76]], wood[4]);
  for (let k = 0; k < 4; k++) {
    const y0 = 60 + k * 4.5;
    for (let x = 126; x < 160; x++) put(p, x, y0 - (x - 126) * 0.12 + k * 0.4, wood[1]);
  }
  for (let x = 124; x < 160; x++) put(p, x, 57.5 - (x - 124) * 0.15, wood[0]);
  // Peeling paint stripe and a rusty rowlock.
  for (let x = 130; x < 160; x++) if (hash(x, 9) > 0.35) put(p, x, 62 - (x - 126) * 0.12, hx('#3e6e8a'));
  put(p, 146, 52, hx('#7a3a1e'));
  put(p, 147, 52, hx('#5a2a16'));
  put(p, 146, 51, hx('#5a2a16'));
  // Sand drift against the hull.
  face(p, [[116, 80], [124, 74], [140, 76], [160, 70], [160, 84], [120, 84]], sand[1]);
  for (let x = 118; x < 160; x++) put(p, x, 74 + Math.round(Math.sin(x * 0.3) * 1.2) + (x > 140 ? -2 : 0), sand[3]);
  // Rope coil on the sand.
  for (let a = 0; a < TAU * 2.2; a += 0.25) {
    const r = 2 + a * 0.5;
    put(p, 142 + Math.cos(a) * r, 82 + Math.sin(a) * r * 0.45, a % 1 > 0.5 ? hx('#c8a870') : hx('#9a7c48'));
  }
}
function tuft(p: Px, x0: number, y0: number, t: number) {
  for (let k = 0; k < 9; k++) {
    const x = x0 + k * 1.6;
    const len = 9 + (k % 3) * 3 + Math.round(hash(k, 11) * 4);
    const sway = Math.sin((t / 3) * TAU + k * 0.6) * 1.2;
    for (let s = 0; s < len; s++) {
      const u = s / len;
      put(p, x + (k - 4) * u * 1.2 + sway * u * u, y0 - s, u < 0.4 ? hx('#7a8a4a') : u < 0.75 ? hx('#9aa65a') : hx('#c8c87a'));
    }
  }
}
function conch(p: Px) {
  // A big pink conch in the front corner, lip towards the light.
  face(p, [[138, 128], [140, 118], [150, 112], [160, 112], [160, 128]], shellC[0]);
  face(p, [[140, 118], [150, 112], [156, 113], [150, 118], [144, 122]], shellC[2]);
  face(p, [[150, 118], [156, 113], [160, 116], [160, 124], [152, 124]], pink[2]);
  for (let k = 0; k < 4; k++) put(p, 142 + k * 4, 120 - k, shellC[3]);
  for (let x = 141; x < 160; x += 3) put(p, x, 125, shellC[1]);
}

const scene: Scene = (p: Px, t: number) => {
  skyDome(p);
  clouds(p, t);
  gulls(p, t);
  sea(p, t);
  lighthouse(p, t);
  beach(p);
  surf(p, t);
  rowboat(p);
  rock(p);
  tidePool(p, 26, 112, 11, 4, t, true);
  tidePool(p, 128, 92, 8, 3, t + 1.1, false);
  shells(p);
  seaweed(p, 36, 100, 5);
  seaweed(p, 116, 104, 4);
  seaweed(p, 88, 64, 3);
};
scene.front = [
  {
    id: 'conch-and-grass',
    depth: 124,
    paint(p) {
      conch(p);
      tuft(p, 2, 127, 0);
    },
  },
];
export default scene;
