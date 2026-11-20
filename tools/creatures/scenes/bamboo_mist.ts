// «Бамбуковая роща в тумане» (canon §8.3: far plan in the top third, the floor below, a front plan). Far: a soft dawn
// sky from pale teal to peach, a pale sun in the mist, three rows of steep misty mountains, each paler with distance,
// with a little pavilion roof on a far ridge and a flock of cranes. Middle: tall bamboo stalks on both sides with nodes
// and leaves that sway, a thin waterfall on the right falling into a pond with rings and sparkles, a mossy boulder, a
// stone lantern with a warm light. A flowering plum branch from the top left drops petals that drift down. Floor: a
// mossy clearing with stepping stones, clover, small flowers and fallen bamboo leaves. Front plan: a bamboo stalk in
// the left corner and a fern in the right one. Light from the low sun upper left. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 208,
  H = 160;
/** The horizon (foot of the near mountains) and the back edge of the clearing. */
export const HORIZON = 54;
export const CLEARING = 72;
/** The pond under the waterfall (centre, radii) — the fx can splash it. */
export const POND = { x: 178, y: 82, rx: 22, ry: 6 };

const skyC = [hx('#8ec4cc'), hx('#a6d0cc'), hx('#c4dcc8'), hx('#e2e2c4'), hx('#f4dcbc'), hx('#f8ccb0')];
const mtn = [
  [hx('#9cb8bc'), hx('#b0c8c6')],
  [hx('#7a9ea4'), hx('#90b0b2')],
  [hx('#5a8288'), hx('#6e949a')],
];
const grass = [hx('#2e4a26'), hx('#3e6030'), hx('#527a3a'), hx('#6a9446'), hx('#86ae58'), hx('#a4c46e')];
const bamboo = [hx('#2a4a2a'), hx('#3e6a36'), hx('#5a8a44'), hx('#7aa854'), hx('#a0c46c'), hx('#c8dc8c')];
const leaf = [hx('#24401e'), hx('#365a28'), hx('#4e7834'), hx('#6a9640')];
const rock = [hx('#3a4440'), hx('#525e58'), hx('#6c7a72'), hx('#8a988e'), hx('#aab6aa')];
const moss = [hx('#3e5a2a'), hx('#5a7a34'), hx('#7a9a44')];
const water = [hx('#3a7a8a'), hx('#5a9aa8'), hx('#8ac0c8'), hx('#c4e4e4'), hx('#ffffff')];
const blossom = [hx('#c4507a'), hx('#e87aa0'), hx('#f8b0c8'), hx('#ffe4ee')];
const branch = [hx('#3a2a2a'), hx('#56403a'), hx('#76584a')];
const warm = [hx('#ff9a3a'), hx('#ffd27a'), hx('#fff4c0')];
const crane = hx('#f4f4ee');

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
  const m = [0.2, 0.7, 0.95, 0.45][(x & 1) + 2 * (y & 1)];
  put(p, x, y, u > m ? b : a);
}
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0) return;
  const m = [0.2, 0.7, 0.95, 0.45][(Math.round(x) & 1) + 2 * (Math.round(y) & 1)];
  put(p, x, y, mixc(get(p, x, y), c, a > m ? Math.min(1, a + 0.2) : a * 0.5));
}

function sky(p: Px) {
  for (let y = 0; y < HORIZON; y++) {
    const u = (y / HORIZON) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // A pale sun low in the mist, upper left, with a soft glow.
  const cx = 52,
    cy = 26,
    r = 9;
  for (let y = cy - r - 12; y <= cy + r + 12; y++)
    for (let x = cx - r - 12; x <= cx + r + 12; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) put(p, x, y, d < r - 2 ? hx('#fffbe8') : hx('#fff0d0'));
      else if (d < r + 12) tint(p, x, y, hx('#fff4dc'), 0.5 * (1 - (d - r) / 12));
    }
}
function cranes(p: Px, t: number) {
  // Three cranes gliding slowly in a line, wings beating in turn.
  for (let i = 0; i < 3; i++) {
    const x = 120 + i * 9 - (t / 3) * 10,
      y = 14 + i * 3;
    const beat = Math.floor(t * 4 + i) % 4;
    const lift = beat === 0 ? -2 : beat === 1 ? -1 : beat === 2 ? 0 : -1;
    put(p, x, y, crane);
    put(p, x + 1, y, crane);
    put(p, x + 2, y - 1, hx('#2a2a2a'));
    for (const s of [-1, 1]) {
      put(p, x + s * 2, y + lift * 0.5, crane);
      put(p, x + s * 3, y + lift, crane);
      put(p, x + s * 4, y + lift, hx('#2a2a2a'));
    }
  }
}
function mountains(p: Px, t: number) {
  // Three rows of steep peaks, the far ones paler; thin mist bands drifting between them.
  const rows: [number, number, number, number][] = [
    [HORIZON - 28, 0.05, 15, 0],
    [HORIZON - 16, 0.08, 11, 1],
    [HORIZON - 6, 0.11, 7, 2],
  ];
  for (const [base, freq, amp, k] of rows) {
    const [dark, lit] = mtn[k];
    for (let x = 0; x < W; x++) {
      const peak = base - Math.round(amp * Math.abs(Math.sin(x * freq + k * 1.7)) + amp * 0.4 * Math.sin(x * freq * 2.3 + k));
      for (let y = peak; y < HORIZON + 4; y++) {
        // The sun side of each peak is lit.
        const slope = Math.cos(x * freq + k * 1.7) * Math.sign(Math.sin(x * freq + k * 1.7));
        put(p, x, y, slope > 0.2 && y < peak + 6 ? lit : dark);
      }
    }
    // Mist band at the foot of the row.
    const drift = Math.sin((t / 3) * TAU + k) * 3;
    for (let x = 0; x < W; x++)
      for (let j = -2; j < 6; j++) {
        const a = 0.42 * Math.exp(-((j - 1.5) ** 2) / 6) * (0.75 + 0.25 * Math.sin(x * 0.05 + k * 2 + drift * 0.3));
        put(p, x, base + 2 + j, mixc(get(p, x, base + 2 + j), hx('#e8f0ec'), a));
      }
  }
  // A little pavilion with an upturned roof on a far ridge.
  const px0 = 148,
    py0 = HORIZON - 34;
  for (let x = -5; x <= 5; x++) put(p, px0 + x, py0 + (Math.abs(x) > 3 ? 0 : 1), mtn[0][0]);
  put(p, px0 - 6, py0 - 1, mtn[0][0]);
  put(p, px0 + 6, py0 - 1, mtn[0][0]);
  for (let x = -3; x <= 3; x++) put(p, px0 + x, py0 - 1, mtn[0][0]);
  put(p, px0, py0 - 2, mtn[0][0]);
  for (let y = 2; y < 6; y++) {
    put(p, px0 - 3, py0 + y, mtn[0][0]);
    put(p, px0 + 3, py0 + y, mtn[0][0]);
  }
}
function ground(p: Px) {
  // A mossy clearing: grass from the horizon down, lighter in front, soft dither noise.
  for (let y = HORIZON; y < H; y++) {
    const depth = (y - HORIZON) / (H - HORIZON);
    for (let x = 0; x < W; x++) {
      const sun = 0.5 * (1 - x / W);
      const v = clamp(1.4 + depth * 2.2 + sun + 0.5 * (hash(x, y, 7) - 0.5) + 0.4 * Math.sin(x * 0.07 + y * 0.2), 0, 4.99);
      const i = Math.floor(v);
      dither(p, x, y, grass[i], grass[i + 1], v - i);
    }
  }
  // A darker band of undergrowth at the back of the clearing.
  for (let x = 0; x < W; x++) {
    const h = 3 + Math.round(2 * Math.sin(x * 0.3) + 2 * hash(x, 9));
    for (let k = 0; k < h; k++) put(p, x, CLEARING - k, k === h - 1 ? leaf[3] : leaf[1]);
  }
  // Stepping stones curving through the clearing.
  for (const [x, y, rx, ry] of [[40, 136, 9, 4], [62, 126, 8, 3.4], [88, 118, 7, 3], [116, 112, 6, 2.6], [140, 106, 5, 2.2]] as [number, number, number, number][]) {
    for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++)
      for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
        const u = i / rx,
          v = j / ry;
        if (u * u + v * v > 1) continue;
        const lit = -0.6 * u - 0.8 * v;
        put(p, x + i, y + j, rock[lit > 0.35 ? 4 : lit > -0.1 ? 3 : 2]);
      }
    for (let i = -rx; i <= rx; i++) put(p, x + i, y + ry + 1, grass[0]);
    put(p, x - 2, y - 1, moss[2]);
    put(p, x - 1, y - 1, moss[1]);
  }
  // Tufts of taller grass, swaying a little.
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 61) * W),
      y = Math.floor(CLEARING + 8 + hash(i, 62) * (H - CLEARING - 10));
    const h = 3 + Math.round(((y - CLEARING) / (H - CLEARING)) * 5);
    for (let b = -2; b <= 2; b++) for (let k = 0; k < h - Math.abs(b); k++) put(p, x + b + Math.round((b * k) / h), y - k, k > h - 3 ? grass[5] : grass[b % 2 ? 2 : 3]);
  }
  // Clover, small flowers and fallen bamboo leaves.
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i, 71) * W),
      y = Math.floor(CLEARING + 4 + hash(i, 72) * (H - CLEARING - 6));
    const kind = i % 4;
    if (kind === 0) {
      put(p, x, y, hx('#fff8f0'));
      put(p, x + 1, y, hx('#fff8f0'));
      put(p, x, y - 1, hx('#f8d040'));
    } else if (kind === 1) {
      put(p, x, y, blossom[1]);
      put(p, x + 1, y - 1, blossom[2]);
    } else if (kind === 2) {
      for (let k = 0; k < 4; k++) put(p, x + k, y - Math.round(k * 0.3), k < 3 ? hx('#b8a860') : hx('#8a7a40'));
    } else {
      put(p, x, y, grass[5]);
      put(p, x + 1, y, grass[4]);
      put(p, x, y - 1, grass[4]);
    }
  }
}
function stalk(p: Px, x0: number, top: number, bottom: number, w: number, lean: number, t: number, seed: number) {
  // One bamboo stalk: lit on the left, nodes every few pixels, leaf sprays that sway.
  for (let y = top; y <= bottom; y++) {
    const x = x0 + lean * (bottom - y);
    for (let i = 0; i < w; i++) {
      const c = i === 0 ? bamboo[5] : i === 1 ? bamboo[4] : i === w - 1 ? bamboo[1] : bamboo[3];
      put(p, x + i, y, c);
    }
    if ((y - top + seed * 3) % 13 === 0) for (let i = -1; i <= w; i++) put(p, x + i, y, i < 1 ? bamboo[4] : bamboo[0]);
  }
  for (let k = 0; k < 4; k++) {
    const y = top + 10 + k * 17 + (seed % 5);
    if (y > bottom - 8) break;
    const x = x0 + lean * (bottom - y) + (k % 2 ? w : 0);
    const dir = k % 2 ? 1 : -1;
    const sway = Math.sin((t / 3) * TAU + k + seed) * 1.5;
    for (let l = 0; l < 3; l++) {
      const ang = 0.25 + l * 0.35;
      for (let s = 0; s < 9; s++) {
        const lx = x + dir * Math.cos(ang) * s + (sway * s) / 9,
          ly = y + Math.sin(ang) * s * 0.6 + s * s * 0.03;
        const wid = s < 2 || s > 7 ? 0 : 1;
        put(p, lx, ly, leaf[2 + (l % 2)]);
        if (wid) put(p, lx, ly + 1, leaf[1]);
      }
    }
  }
}
function waterfall(p: Px, t: number) {
  // A thin fall from a mossy cliff on the right into a pond with rings.
  const x0 = 186,
    top = HORIZON - 14;
  face(p, [[166, POND.y - 2], [170, top + 4], [180, top - 4], [W, top - 10], [W, POND.y - 2]] as Point[], rock[1]);
  for (let y = top; y < POND.y - 2; y++) for (let x = 168; x < W; x++) if (hash(x, y, 81) > 0.86) put(p, x, y, rock[2]);
  for (let x = 170; x < W; x++) put(p, x, top - 4 + Math.round((x - 170) * -0.2), moss[2]);
  for (let y = top; y < POND.y; y++)
    for (let i = 0; i < 6; i++) {
      const phase = (((y * 0.5 - t * 24 * 1.5 + i * 3) % 6) + 6) % 6;
      put(p, x0 + i, y, phase < 1.5 ? water[4] : phase < 3 ? water[3] : water[2]);
    }
  // The pond, its far bank and rings spreading from the fall.
  for (let j = -Math.ceil(POND.ry); j <= Math.ceil(POND.ry); j++)
    for (let i = -POND.rx; i <= POND.rx; i++) {
      const u = i / POND.rx,
        v = j / POND.ry;
      if (u * u + v * v > 1) continue;
      put(p, POND.x + i, POND.y + j, v < -0.4 ? water[0] : water[1]);
    }
  for (let k = 0; k < 2; k++) {
    const age = ((t / 3) * 2 + k * 0.5) % 1;
    const rx = 3 + age * 14,
      ry = 1 + age * 4;
    for (let a = 0; a < TAU; a += 0.15) put(p, x0 + 3 + Math.cos(a) * rx, POND.y + Math.sin(a) * ry, mixc(water[3], water[1], age));
  }
  for (let i = 0; i < 5; i++) if ((Math.floor(t * 8) + i) % 3 === 0) put(p, x0 - 4 + i * 3, POND.y - 3 - (i % 2), water[4]);
  // Grass lip in front of the pond.
  for (let i = -POND.rx - 2; i <= POND.rx + 2; i++) put(p, POND.x + i, POND.y + POND.ry + 1, grass[1]);
}
function boulder(p: Px) {
  // A mossy boulder at the back left.
  const cx = 30,
    cy = CLEARING + 2;
  for (let y = -9; y <= 5; y++)
    for (let x = -13; x <= 13; x++) {
      const u = x / 13,
        v = y / 9;
      if (u * u + v * v > 1) continue;
      const lit = -0.6 * u - 0.8 * v;
      const top = v < -0.35 + 0.2 * Math.sin(x * 0.7);
      put(p, cx + x, cy + y, top ? moss[lit > 0.3 ? 2 : 1] : rock[lit > 0.3 ? 3 : lit > -0.2 ? 2 : 1]);
    }
}
function lantern(p: Px, t: number) {
  // A stone lantern on the right of the clearing with a warm flickering light.
  const cx = 150,
    base = CLEARING + 8;
  const flick = 0.5 + 0.5 * Math.sin(t * TAU * 2.2) * Math.sin(t * TAU * 0.9 + 1);
  for (let y = -12; y <= 12; y++)
    for (let x = -12; x <= 12; x++) {
      const d = Math.hypot(x, y);
      if (d > 3 && d < 12) tint(p, cx + x, base - 13 + y, warm[0], 0.28 * (1 - d / 12) * (0.7 + 0.3 * flick));
    }
  for (let y = 0; y < 6; y++) for (let x = -1; x <= 1; x++) put(p, cx + x, base - y, rock[x < 0 ? 3 : 2]);
  for (let x = -4; x <= 4; x++) put(p, cx + x, base, rock[1]);
  for (let x = -3; x <= 3; x++) put(p, cx + x, base - 6, rock[3]);
  for (let y = 7; y <= 11; y++) {
    put(p, cx - 3, base - y, rock[3]);
    put(p, cx + 3, base - y, rock[1]);
    for (let x = -2; x <= 2; x++) put(p, cx + x, base - y, y === 9 ? warm[flick > 0.5 ? 2 : 1] : warm[flick > 0.3 ? 1 : 0]);
  }
  for (let x = -5; x <= 5; x++) put(p, cx + x, base - 12 + (Math.abs(x) > 3 ? 1 : 0), rock[2]);
  for (let x = -3; x <= 3; x++) put(p, cx + x, base - 13, rock[3]);
  put(p, cx, base - 14, rock[3]);
  for (let x = -5; x <= 5; x++) put(p, cx + x, base + 1, grass[0]);
}
function plum(p: Px, t: number) {
  // A flowering plum branch from the top left corner; petals drift down across the picture.
  let x = -2,
    y = 6;
  for (let s = 0; s < 70; s++) {
    x += 1;
    y += 0.12 + 0.25 * Math.sin(s * 0.13);
    const w = Math.max(0, Math.round(2.4 * (1 - s / 70)));
    for (let k = -w; k <= w; k++) put(p, x, y + k, k === -w ? branch[2] : branch[1]);
    if (s % 9 === 4) {
      const fx = x + (s % 2 ? 1 : -1),
        fy = y + (s % 2 ? 3 : -3);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(p, fx + dx, fy + dy, blossom[dx || dy ? 2 : 0]);
      put(p, fx - 1, fy - 1, blossom[3]);
    }
    if (s % 14 === 7) {
      for (let k = 1; k < 7; k++) put(p, x + k * 0.5, y - k, branch[1]);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(p, x + 3 + dx, y - 7 + dy, blossom[dx || dy ? 1 : 3]);
    }
  }
  for (let i = 0; i < 7; i++) {
    const k = ((t / 3 + i / 7) % 1 + 1) % 1;
    const px = 20 + hash(i, 91) * 150 + Math.sin(k * TAU * 1.5 + i) * 5,
      py = 10 + k * (H - 30);
    put(p, px, py, blossom[2]);
    put(p, px + (Math.sin(k * TAU * 3) > 0 ? 1 : -1), py, blossom[1]);
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p);
  cranes(p, t);
  mountains(p, t);
  ground(p);
  boulder(p);
  waterfall(p, t);
  stalk(p, 6, 0, CLEARING + 2, 4, 0.04, t, 1);
  stalk(p, 18, 0, CLEARING - 2, 3, -0.03, t, 2);
  stalk(p, 196, 0, HORIZON - 12, 4, 0.02, t, 3);
  stalk(p, 128, 4, CLEARING - 2, 3, 0.05, t, 4);
  stalk(p, 136, 0, CLEARING, 3, -0.02, t, 5);
  lantern(p, t);
  plum(p, t);
};
scene.front = [
  {
    id: 'bamboo-and-fern',
    depth: 156,
    paint(p) {
      // A thick bamboo stalk in the left corner, a fern in the right one.
      for (let y = 96; y < H; y++)
        for (let i = 0; i < 6; i++) put(p, 2 + i + Math.round((H - y) * 0.03), y, i === 0 ? bamboo[5] : i === 1 ? bamboo[4] : i === 5 ? bamboo[1] : bamboo[3]);
      for (const y of [108, 128, 148]) for (let i = -1; i < 8; i++) put(p, 1 + i, y, i < 1 ? bamboo[4] : bamboo[0]);
      for (let f = 0; f < 6; f++) {
        const ang = Math.PI + 0.55 + f * 0.2;
        for (let s = 0; s < 30; s++) {
          const x = 200 + Math.cos(ang) * s,
            y = H + 2 + Math.sin(ang) * s * 0.9 + s * s * 0.02;
          put(p, x, y, leaf[3]);
          if (s % 2 && s < 27) {
            put(p, x + Math.sin(ang) * 2, y - Math.cos(ang) * 2, leaf[2]);
            put(p, x - Math.sin(ang) * 2, y + Math.cos(ang) * 2, leaf[1]);
          }
        }
      }
    },
  },
];
export default scene;
