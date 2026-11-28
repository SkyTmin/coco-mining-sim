// Раскат's own secret frame, «Рама громовержца»: rough black basalt with copper. The rails are hewn stone with chamfers
// and chipped facets; along their middle line runs a copper zigzag inlay where a turquoise wave of light races round the
// frame once a loop; between the zigzags carved storm glyphs whose grooves flare as the wave passes; riveted copper
// corner plates with an embossed lightning bolt; copper drum studs on the side rails; a copper lip round the opening.
// On the top rail a copper lightning rod with a glass ball where a spark crackles once a loop; on the bottom rail a
// lacquered war drum with copper tacks and two crossed drumsticks.
import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';

const stone = ['#09090f', '#121219', '#1b1b24', '#262631', '#343440', '#46465a'].map((c) => hx(c));
const rune = ['#0e3440', '#1e6a78', '#3aaab8', '#8ceaf0', '#e8ffff'].map((c) => hx(c));
const stick = ['#2a160c', '#4a2c16', '#7a5430'].map((c) => hx(c));
const copper = ['#4a2210', '#86401c', '#c06a30', '#e89a58', '#ffd0a0'].map((c) => hx(c));
const glass = ['#2a3a5a', '#5a7aa8', '#a8c8ec', '#eef8ff'].map((c) => hx(c));
const spark = hx('#fff6a0'),
  white = hx('#ffffff'),
  hide = hx('#e8d0a0'),
  hideDark = hx('#b89868'),
  lacquer = hx('#c83a24'),
  lacquerDark = hx('#8a1e18');
type C = [number, number, number, number];

function inFrame(p: Px, b: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && (x < b || y < b || x >= p.w - b || y >= p.h - b);
}
function set(p: Px, x: number, y: number, c: number[]) {
  if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.set(Math.round(x), Math.round(y), c as C);
}
/** Basalt rails: rough hewn stone, chipped facets, a chamfer lit on the outer top-left and stepping down to the opening. */
function boards(p: Px, b: number) {
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!inFrame(p, b, x, y)) continue;
      const horizontal = (y < b || y >= p.h - b) && x >= Math.min(y, p.h - 1 - y) && x < p.w - Math.min(y, p.h - 1 - y);
      const along = horizontal ? x : y,
        across = horizontal ? (y < b ? y : p.h - 1 - y) : x < b ? x : p.w - 1 - x;
      // Chipped facets: blocks of stone along the rail, each tilted a little differently.
      const block = Math.floor((along + Math.floor(across / 6) * 5) / 13);
      const tilt = ((block * 7919) % 13) / 13 - 0.5;
      const grit = ((x * 73856093) ^ (y * 19349663)) % 7 === 0 ? 0.7 : ((x * 83492791) ^ (y * 2971)) % 11 === 0 ? -0.7 : 0;
      const u = across / b;
      const bevel = u < 0.16 ? 1.3 - u * 4 : u > 0.8 ? -0.9 : 0.15;
      const lightSide = horizontal ? (y < b ? 0.35 : -0.3) : x < b ? 0.25 : -0.3;
      const seam = (along + Math.floor(across / 6) * 5) % 13 === 0 && u > 0.18 && u < 0.8;
      const v = seam ? 0.4 : 2 + tilt * 1.2 + grit + bevel + lightSide;
      set(p, x, y, stone[Math.max(0, Math.min(5, Math.round(v)))]);
    }
  // Copper lip round the opening and a dark line on the outer edge.
  for (let x = b - 2; x < p.w - b + 2; x++) {
    set(p, x, b - 2, copper[3]);
    set(p, x, b - 1, copper[1]);
    set(p, x, p.h - b, copper[2]);
    set(p, x, p.h - b + 1, copper[1]);
  }
  for (let y = b - 2; y < p.h - b + 2; y++) {
    set(p, b - 2, y, copper[3]);
    set(p, b - 1, y, copper[1]);
    set(p, p.w - b, y, copper[2]);
    set(p, p.w - b + 1, y, copper[1]);
  }
  for (let x = 0; x < p.w; x++) {
    set(p, x, 0, stone[0]);
    set(p, x, p.h - 1, stone[0]);
  }
  for (let y = 0; y < p.h; y++) {
    set(p, 0, y, stone[0]);
    set(p, p.w - 1, y, stone[0]);
  }
}
/** A carved storm glyph: a lightning zigzag between two short bars, cut into the stone; the groove flares with light. */
function stormGlyph(p: Px, cx: number, cy: number, light: number, vertical = false) {
  const pts: [number, number][] = [
    [-5, -2],
    [-1, 1],
    [-2, -1],
    [2, 2],
    [1, 0],
    [5, 2],
  ];
  const c = light > 0.5 ? mixc(rune[2], rune[4], (light - 0.5) * 2) : light > 0.15 ? rune[1] : stone[0];
  const put = (u: number, v: number, col: number[]) => set(p, vertical ? cx - v : cx + u, vertical ? cy + u : cy + v, col);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i],
      [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let j = 0; j <= n; j++) {
      const u = Math.round(ax + ((bx - ax) * j) / n),
        v = Math.round(ay + ((by - ay) * j) / n);
      put(u, v + 1, stone[4]);
      put(u, v, c);
    }
  }
  for (const u of [-7, 7]) {
    put(u, -1, c);
    put(u, 0, c);
    put(u, 1, c);
    put(u + 1, 2, stone[4]);
  }
}
function rivet(p: Px, x: number, y: number) {
  set(p, x, y, copper[3]);
  set(p, x + 1, y + 1, copper[0]);
  set(p, x + 1, y, copper[1]);
  set(p, x, y + 1, copper[1]);
}
/** A riveted copper corner plate with a little embossed cloud. */
function cornerPlate(p: Px, cx: number, cy: number) {
  for (let y = -7; y <= 7; y++)
    for (let x = -7; x <= 7; x++) {
      const edge = Math.max(Math.abs(x), Math.abs(y));
      if (edge > 7) continue;
      set(p, cx + x, cy + y, copper[edge === 7 ? 0 : edge === 6 ? (x + y < 0 ? 3 : 1) : x + y < -4 ? 3 : 2]);
    }
  for (const [x, y] of [
    [-5, -5],
    [4, -5],
    [-5, 4],
    [4, 4],
  ] as const)
    rivet(p, cx + x, cy + y);
  // Embossed lightning bolt.
  for (const [u, v] of [
    [1, -4],
    [0, -3],
    [0, -2],
    [-1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 2],
    [0, 3],
    [-1, 4],
  ] as const) {
    set(p, cx + u + 1, cy + v + 1, copper[0]);
    set(p, cx + u, cy + v, copper[4]);
  }
}
/** A copper drum stud on a side rail. */
function stud(p: Px, x: number, y: number, glow: number) {
  for (let v = -2; v <= 2; v++)
    for (let u = -2; u <= 2; u++) {
      const d = Math.hypot(u, v);
      if (d > 2.3) continue;
      set(p, x + u, y + v, d > 1.7 ? copper[0] : u + v < 0 ? mixc(copper[4], rune[4], glow) : mixc(copper[2], rune[2], glow));
    }
}
/** The zigzag inlay along the middle line of a rail, lit by the passing wave. */
function zigzag(p: Px, points: [number, number][], light: (i: number) => number) {
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const l = light(i);
    set(p, x, y, l > 0.6 ? mixc(rune[3], rune[4], (l - 0.6) * 2.5) : l > 0.2 ? mixc(copper[3], rune[2], (l - 0.2) * 2.5) : copper[2]);
    set(p, x, y + 1, l > 0.4 ? rune[1] : copper[0]);
  }
}
/** The lightning rod on the top rail with a glass ball where a spark crackles once a loop. */
function lightningRod(p: Px, cx: number, b: number, t: number) {
  const k = ((t / 3) % 1 + 1) % 1;
  // Base plate.
  for (let x = -8; x <= 8; x++) {
    set(p, cx + x, b - 4, copper[x < 0 ? 3 : 2]);
    set(p, cx + x, b - 3, copper[1]);
  }
  // The rod.
  for (let y = 5; y < b - 4; y++) {
    set(p, cx, y, copper[3]);
    set(p, cx + 1, y, copper[1]);
  }
  // Glass ball.
  const by = 6;
  const on = k > 0.42 && k < 0.47;
  for (let v = -4; v <= 4; v++)
    for (let u = -4; u <= 4; u++) {
      const d = Math.hypot(u, v);
      if (d > 4.3) continue;
      set(p, cx + u, by + v, d > 3.6 ? glass[0] : on ? mixc(glass[3], spark, 0.6) : u + v < -2 ? glass[3] : d < 1.5 ? glass[2] : glass[1]);
    }
  if (on) {
    for (const [x, y] of [
      [0, -2],
      [1, -1],
      [-1, 0],
      [0, 1],
      [1, 2],
    ] as const)
      set(p, cx + x, by + y, white);
    for (const [x, y] of [
      [-6, -1],
      [6, 1],
      [-5, 3],
      [5, -3],
    ] as const)
      set(p, cx + x, by + y, spark);
  } else set(p, cx - 1, by - 1, white);
  // Two rings round the rod.
  for (const y of [11, 13]) for (let x = -1; x <= 2; x++) set(p, cx + x, y, copper[x < 1 ? 4 : 2]);
}
/** The copper drum on the bottom rail with two crossed drumsticks. */
function drumEmblem(p: Px, cx: number, cy: number) {
  for (let v = -5; v <= 5; v++)
    for (let u = -8; u <= 8; u++) {
      const d = (u / 8) ** 2 + (v / 5) ** 2;
      if (d > 1) continue;
      const head = (u / 7) ** 2 + ((v + 1) / 3.2) ** 2 <= 1 && v < 1;
      set(p, cx + u, cy + v, head ? (u + v < -3 ? hide : hideDark) : d > 0.8 ? lacquerDark : v > 1 ? lacquerDark : lacquer);
    }
  for (const u of [-6, -3, 0, 3, 6]) set(p, cx + u, cy + 2, copper[3]);
  // Crossed sticks behind the drum.
  for (let i = -9; i <= 9; i++) {
    if (Math.abs(i) < 7) continue;
    set(p, cx + i, cy - 6 + Math.abs(i) * 0.5, stick[2]);
    set(p, cx - i, cy - 6 + Math.abs(i) * 0.5 + 1, stick[1]);
  }
  set(p, cx - 9, cy - 2, copper[3]);
  set(p, cx + 9, cy - 2, copper[3]);
}

const thunderer: Border = {
  wood: ['#09090f', '#121219', '#1b1b24', '#262631'],
  accent: '#e89a58',
  decorate(p, b, t) {
    boards(p, b);
    const m = Math.floor(b / 2),
      cx = p.w >> 1,
      cy = p.h >> 1;
    const perimeter = 2 * (p.w + p.h);
    const wave = (((t / 3) % 1 + 1) % 1) * perimeter;
    const near = (s: number) => {
      const d = Math.abs((((s - wave) % perimeter) + perimeter) % perimeter);
      return Math.max(0, 1 - Math.min(d, perimeter - d) / 46);
    };
    // Zigzag inlay along the middle line of every rail, broken where the ornaments sit.
    const free = (x: number, y: number, top: boolean) => {
      if (top) return Math.abs(x - cx) > 16 && x > 18 && x < p.w - 18;
      return Math.abs(y - cy) > 9 && y > 18 && y < p.h - 18;
    };
    const topPts: [number, number][] = [],
      botPts: [number, number][] = [],
      leftPts: [number, number][] = [],
      rightPts: [number, number][] = [];
    for (let x = 0; x < p.w; x++) {
      const z = Math.round(Math.abs(((x % 8) - 4)) * 0.75) - 1;
      if (free(x, 0, true) && (x % 34 < 22 || x % 34 > 30)) topPts.push([x, m + z]);
      if (free(x, 0, true) && Math.abs(x - cx) > 32 && Math.abs(Math.abs(x - cx) - 50) > 11 && (x % 34 < 22 || x % 34 > 30)) botPts.push([x, p.h - 1 - m + z]);
    }
    for (let y = 0; y < p.h; y++) {
      const z = Math.round(Math.abs(((y % 8) - 4)) * 0.75) - 1;
      if (free(0, y, false) && (y % 30 < 18 || y % 30 > 26)) {
        leftPts.push([m + z, y]);
        rightPts.push([p.w - 1 - m + z, y]);
      }
    }
    zigzag(p, topPts, (i) => near(topPts[i][0]));
    zigzag(p, rightPts, (i) => near(p.w + rightPts[i][1]));
    zigzag(p, botPts, (i) => near(p.w + p.h + (p.w - botPts[i][0])));
    zigzag(p, leftPts, (i) => near(2 * p.w + p.h + (p.h - leftPts[i][1])));
    // Carved storm glyphs in the gaps of the inlay, flaring as the wave passes.
    for (let x = 34; x < p.w - 30; x += 34) {
      if (Math.abs(x - cx) > 22) {
        stormGlyph(p, x - 8, m, near(x - 8));
        stormGlyph(p, x - 8, p.h - 1 - m, near(p.w + p.h + (p.w - x + 8)));
      }
    }
    for (let y = 30; y < p.h - 26; y += 30) {
      stormGlyph(p, m, y - 8, near(2 * p.w + p.h + (p.h - y + 8)), true);
      stormGlyph(p, p.w - 1 - m, y - 8, near(p.w + y - 8), true);
    }
    // Drum studs on the side rails, catching the wave of light.
    for (const y of [cy - 4, cy + 4]) {
      stud(p, m, y, near(2 * p.w + p.h + (p.h - y)));
      stud(p, p.w - 1 - m, y, near(p.w + y));
    }
    cornerPlate(p, m, m);
    cornerPlate(p, p.w - 1 - m, m);
    cornerPlate(p, m, p.h - 1 - m);
    cornerPlate(p, p.w - 1 - m, p.h - 1 - m);
    lightningRod(p, cx, b, t);
    // Two war drums flank the nameplate on the bottom rail.
    drumEmblem(p, cx - 50, p.h - 1 - m);
    drumEmblem(p, cx + 50, p.h - 1 - m);
  },
};
export default thunderer;
