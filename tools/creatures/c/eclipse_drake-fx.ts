// Effects of Зенит. The sun language: light is gathered from the sun of the scene — warm motes flowing into the
// membranes; a beam is a white core in gold with an orange edge and a shiver of heat, and where it touches the stone
// molten droplets splash and a furrow is left that cools white → orange → red → dark glass with glints and is gone by
// the end of the clip. The eclipse language: a moon disc slides over the sun, its shadow runs across the scene, the
// stars come out, a black sun hangs in the sky with a silver corona; the corona is silver-white ribbons with a violet
// edge; their marks on the stone are silver arcs that cool; shadow is ink-black with a silver rim and rings of ripples;
// stars are four-point silver sparks that stand on the stone as little crystals and go out one by one. Always: a warm
// glow behind him (in the eclipse a cold violet halo with silver motes) and the light of the pearl in his chest.
// Timelines read the beats and lanes of the pose book; positions read his sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { takeoffFrame } from '../kit/pet-moves';
import { ellFill, oval, progress } from '../fx/field';
import { fillPoly, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, gesture, SIGN, signPoint, signProgress } from './eclipse_drake-poses';
import { DIAL, GNOMON, HORIZON, SUN } from '../scenes/sun_observatory';
import { MIRROR_POP } from './eclipse_drake-skin';

const C = {
  white: '#ffffff',
  hot: '#fff4c8',
  gold: '#ffd060',
  orange: '#ff8a20',
  red: '#d0400e',
  ember: '#7a1c08',
  glass: '#241a2c',
  glassLit: '#b8a4d0',
  silver: '#dfe2ff',
  corona: '#a898ff',
  violet: '#5c4ac8',
  ink: '#05040a',
  dust: '#5a4f6e',
  dustL: '#8a7c98',
  smoke: '#3a3446',
  smokeL: '#6a6278',
};
const goldDust = ['#fff0b0', '#ffd060', '#e8a634', '#bc701c'];

const frameOf = (f: FxInput) => f.t * 24;
/** Effects were drawn for a 256×208 field; the painting is 384×312 now. Helper sizes are in those design units and
 * are scaled here, so every stroke stays one output pixel wide while the shapes grow with the picture. */
const K = 1.5;
const mid = (a: XY, b: XY, k = 0.5): XY => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a: XY, x: number, y: number): XY => [a[0] + x, a[1] + y];
const smooth = (x: number) => x * x * (3 - 2 * x);
/** A socket now, or at an earlier frame of this clip; null where it does not exist. */
function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, Math.min(frame, f.duration * 24 - 0.01)) / 24, name);
  } catch {
    return null;
  }
}

// ---- the pen of the sun -----------------------------------------------------------------------------------------
function glow(p: Pen, at: XY, rx: number, ry: number, color: string, a: number, bands = 5) {
  if (a <= 0) return;
  for (let i = bands; i >= 1; i--) {
    const k = i / bands;
    ellFill(p, at, rx * k * K, ry * k * K, color, (a / bands) * (1.2 - k * 0.4));
  }
}
function line(p: Pen, a: XY, b: XY, c: string, alpha: number, w = 1) {
  if (alpha <= 0.01) return;
  p.col(c, Math.min(1, alpha));
  if (w > 1) w = Math.round(w * K);
  const flat = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  for (let k = 0; k < w; k++) {
    const o = Math.round(k - (w - 1) / 2);
    if (flat) p.line(Math.round(a[0]), Math.round(a[1]) + o, Math.round(b[0]), Math.round(b[1]) + o);
    else p.line(Math.round(a[0]) + o, Math.round(a[1]), Math.round(b[0]) + o, Math.round(b[1]));
  }
}
function polyline(p: Pen, pts: XY[], c: string, a: number, w = 1) {
  for (let i = 1; i < pts.length; i++) line(p, pts[i - 1], pts[i], c, a, w);
}
function wash(p: Pen, f: FxInput, c: string, a: number) {
  if (a <= 0.01) return;
  p.col(c, Math.min(1, a));
  p.rect(0, 0, f.w, f.h);
}
/** A beam of sunlight from a to b: orange edge, gold body, white core, a shiver of heat along it. */
function beam(p: Pen, a: XY, b: XY, width: number, alpha: number, seed: number) {
  if (alpha <= 0.02) return;
  width *= K;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
    nx = -(b[1] - a[1]) / L,
    ny = (b[0] - a[0]) / L;
  const side = (k: number, w: number): number[] => [a[0] + nx * w * k * 0.6, a[1] + ny * w * k * 0.6, b[0] + nx * w * k, b[1] + ny * w * k];
  for (const [w, c, al] of [
    [width + 3 * K, C.red, 0.45],
    [width + 1.5 * K, C.orange, 0.8],
    [width, C.gold, 0.95],
    [Math.max(1, width * 0.45), C.hot, 1],
  ] as const) {
    const l = side(-1, w / 2),
      r = side(1, w / 2);
    p.col(c, alpha * al);
    fillPoly(p, [l[0], l[1], l[2], l[3], r[2], r[3], r[0], r[1]]);
  }
  line(p, a, b, C.white, alpha, 1);
  // heat shimmer: short bright dashes beside the beam
  for (let i = 0; i < 6; i++) {
    const u = hash(i, seed, 1),
      o = (hash(i, seed, 2) > 0.5 ? 1 : -1) * (width * 0.5 + 2 + hash(i, seed, 3) * 2);
    const q: XY = [a[0] + (b[0] - a[0]) * u + nx * o, a[1] + (b[1] - a[1]) * u + ny * o];
    p.col(C.hot, alpha * 0.5);
    p.rect(Math.round(q[0]), Math.round(q[1]), 2, 1);
  }
}
/** A roiling jet of flame from `from` along the unit screen direction `dir`: it widens from w0 to w1, wavers side to
 * side, a red rim, an orange-gold body and a white-hot core near the jaws. */
function flameJet(p: Pen, from: XY, dir: XY, len: number, w0: number, w1: number, alpha: number, frame: number) {
  if (alpha <= 0.02 || len < 2) return;
  const nx = -dir[1],
    ny = dir[0];
  const n = Math.max(2, Math.ceil(len / 3));
  const at = (i: number) => {
    const u = i / n;
    const wob = Math.sin(frame * 0.5 + i * 0.7) * 3 * K * u;
    const w = w0 + (w1 - w0) * u + Math.sin(frame * 0.9 + i * 0.9) * 2.5 * K;
    return { c: [from[0] + dir[0] * len * u + nx * wob, from[1] + dir[1] * len * u + ny * wob] as XY, w, u };
  };
  for (const [extra, core] of [
    [6 * K, 0],
    [0, 0],
    [0, 1],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const A = at(i),
        B = at(i + 1);
      const wa = core ? A.w * 0.36 : A.w + extra,
        wb = core ? B.w * 0.36 : B.w + extra;
      if (extra) p.col(C.red, 0.55 * alpha);
      else if (core) p.col(A.u < 0.5 ? C.white : C.hot, alpha);
      else p.col(A.u < 0.25 ? C.gold : A.u < 0.6 ? C.orange : C.red, alpha * (1 - A.u * 0.3));
      fillPoly(p, [A.c[0] + (nx * wa) / 2, A.c[1] + (ny * wa) / 2, B.c[0] + (nx * wb) / 2, B.c[1] + (ny * wb) / 2, B.c[0] - (nx * wb) / 2, B.c[1] - (ny * wb) / 2, A.c[0] - (nx * wa) / 2, A.c[1] - (ny * wa) / 2]);
    }
  }
}
/** Ballistic droplets/sparks with short tails; `dir` is the launch direction (screen radians), `spread` the fan. */
function sparks(p: Pen, at: XY, age: number, life: number, n: number, speed: number, seed: number, palette: string[], dir = -Math.PI / 2, spread = 1.2, grav = 140, floorY = Infinity) {
  if (age < 0 || age > life) return;
  speed *= K;
  grav *= K;
  for (let i = 0; i < n; i++) {
    const th = dir + (hash(i, seed, 1) - 0.5) * spread * Math.PI,
      v = speed * (0.45 + 0.55 * hash(i, seed, 2));
    const own = life * (0.6 + 0.4 * hash(i, seed, 3));
    if (age > own) continue;
    const at2 = (s: number): XY => {
      const tt = s / 24;
      return [at[0] + Math.cos(th) * v * tt, Math.min(floorY, at[1] + Math.sin(th) * v * tt + 0.5 * grav * tt * tt)];
    };
    const a = 1 - (age / own) ** 2;
    const [x0, y0] = at2(Math.max(0, age - 1.2)),
      [x1, y1] = at2(age);
    p.col(age < own * 0.3 ? palette[0] : palette[1 + (i % (palette.length - 1))], a);
    p.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
  }
}
/** Drifting motes that fall slowly and fade (embers, golden dust). */
function motes(p: Pen, at: XY, age: number, life: number, n: number, out: number, seed: number, palette: string[], fall = 26, floorY = Infinity) {
  if (age < 0 || age > life) return;
  const k = age / life;
  out *= K;
  fall *= K;
  for (let i = 0; i < n; i++) {
    const th = hash(i, seed, 1) * TAU,
      d = out * Math.sqrt(hash(i, seed, 2)) * (1 - Math.exp(-age / 6));
    const x = at[0] + Math.cos(th) * d + Math.sin(age * 0.2 + i) * 1.5 * K,
      y = Math.min(floorY, at[1] + Math.sin(th) * d * 0.7 + fall * k * k * (0.5 + hash(i, seed, 3)));
    const a = (1 - k) * (0.6 + 0.4 * Math.sin(age * 0.7 + i * 2));
    p.col(palette[i % palette.length], Math.max(0, a));
    p.dot(Math.round(x), Math.round(y), i % 3 ? 1 : 2, 1);
  }
}
/** A shock ring on the stone (squashed by the high view). */
function shock(p: Pen, at: XY, r: number, a: number, c: string = C.gold, squash = 0.3) {
  if (a <= 0 || r < 1) return;
  r *= K;
  oval(p, add(at, 0, 1), r * 0.96, r * squash * 0.92, C.ember, a * 0.45);
  oval(p, at, r, r * squash, c, a);
  if (r > 10 * K) oval(p, add(at, 0, -1), r * 1.02, r * squash, C.hot, a * 0.5);
}
/** A ring in the air (a roar, a flash): round, not squashed. */
function airRing(p: Pen, at: XY, r: number, a: number, c: string = C.hot, edge: string = C.orange) {
  if (a <= 0 || r < 1) return;
  r *= K;
  oval(p, at, r * 1.04, r * 0.84, edge, a * 0.5);
  oval(p, at, r, r * 0.8, c, a);
}
/** Dust kicked up on the stone: soft puffs rolling outward. */
function dust(p: Pen, at: XY, age: number, life: number, n: number, out: number, seed: number) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const s = hash(i, seed, 1) > 0.5 ? 1 : -1;
    const d = out * K * (0.3 + 0.7 * hash(i, seed, 2)) * (1 - Math.exp(-age / 4));
    const x = at[0] + s * d,
      y = at[1] - (2 + 5 * k * hash(i, seed, 3)) * K;
    ellFill(p, [x, y], (2 + 3 * k) * K, (1.4 + 2 * k) * K, i % 2 ? C.dust : C.dustL, 0.55 * (1 - k));
  }
}
/** A smoke puff that rises, swells and thins. */
function puff(p: Pen, at: XY, age: number, life: number, seed: number, r0 = 1.5, rise = 18) {
  if (age < 0 || age > life) return;
  const k = age / life;
  const c: XY = [at[0] + Math.sin(k * 4 + seed) * 2 * K, at[1] - rise * k * K];
  const r = (r0 + 4 * k) * K;
  ellFill(p, c, r, r * 0.8, C.smoke, 0.6 * (1 - k));
  ellFill(p, add(c, -r * 0.25, -r * 0.25), r * 0.6, r * 0.45, C.smokeL, 0.5 * (1 - k));
}
/** A smoke ring rising from the jaws. */
function smokeRing(p: Pen, at: XY, age: number, life: number) {
  if (age < 0 || age > life) return;
  const k = age / life;
  const c: XY = [at[0], at[1] - 26 * k * K];
  const r = (2 + 7 * smooth(k)) * K;
  oval(p, c, r, r * 0.45, C.smokeL, 0.8 * (1 - k));
  oval(p, add(c, 0, 1), r * 0.9, r * 0.38, C.smoke, 0.7 * (1 - k));
}
/** A tongue of flame from the jaws along `dir` (screen radians). */
function flame(p: Pen, at: XY, dir: number, len: number, a: number, seed: number) {
  if (a <= 0.02) return;
  len *= K;
  for (let i = 0; i < 9; i++) {
    const u = i / 8,
      wob = Math.sin(seed * 1.7 + i * 1.3) * 2 * u * K;
    const q: XY = [at[0] + Math.cos(dir) * len * u - Math.sin(dir) * wob, at[1] + Math.sin(dir) * len * u + Math.cos(dir) * wob];
    const r = ((1 - u) * 3.6 + 1) * K;
    ellFill(p, q, r, r * 0.85, u < 0.3 ? C.hot : u < 0.6 ? C.gold : u < 0.85 ? C.orange : C.red, a * (1 - u * 0.6));
  }
}
/** A four-point star spark. */
function starSpark(p: Pen, at: XY, r: number, a: number, c: string = C.silver) {
  if (a <= 0.02) return;
  p.col(c, Math.min(1, a));
  star(p, at[0], at[1], r * K, 4, Math.PI / 4);
  p.col(C.white, Math.min(1, a));
  p.rect(Math.round(at[0]), Math.round(at[1]), 1, 1);
}
/** Cracks on the stone running out from an impact; `heat` 1 white-hot … 0 cold; `reach` lets them run. */
function cracks(p: Pen, at: XY, n: number, len: number, heat: number, seed: number, reach: number, a = 1) {
  if (a <= 0 || reach <= 0) return;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + (hash(i, seed) - 0.5) * 0.6,
      Lc = len * K * (0.6 + 0.6 * hash(i, seed, 2)) * reach;
    const pts: XY[] = [at];
    for (let k = 1; k <= 4; k++) {
      const u = k / 4,
        o = (hash(i, seed, k + 3) - 0.5) * 3 * K;
      pts.push([at[0] + Math.cos(ang) * Lc * u - Math.sin(ang) * o, at[1] + (Math.sin(ang) * Lc * u + Math.cos(ang) * o) * 0.32]);
    }
    polyline(p, pts, C.ink, 0.85 * a, 2);
    polyline(p, pts, moltenColor(heat), Math.min(1, 0.3 + heat * 1.4) * a);
  }
}
/** The colour of cooling molten stone at `heat` (1 white … 0 dark glass). */
function moltenColor(heat: number) {
  return heat > 0.85 ? C.hot : heat > 0.6 ? C.gold : heat > 0.4 ? C.orange : heat > 0.2 ? C.red : C.glass;
}

// ---- always -----------------------------------------------------------------------------------------------------
/** The glow behind him: warm sunlight round the body; in the eclipse a cold violet halo with silver motes. */
function aura(f: FxInput, frame: number, form: number, charge: number) {
  const body = pt(f, 'body'),
    pearl = pt(f, 'pearl');
  if (!body) return;
  const pulse = 0.85 + 0.15 * Math.sin((frame / 24) * TAU * 0.5);
  if (form < 0.5) glow(f.under, add(body, 0, -6 * K), 40, 46, '#ffb050', 0.1 * pulse, 4);
  else {
    glow(f.under, add(body, 0, -6 * K), 44, 50, '#6a5ad0', 0.16 * pulse, 4);
    for (let i = 0; i < 10; i++) {
      const life = 30,
        age = (frame + i * 9) % life,
        a = hash(i, Math.floor((frame + i * 9) / life)) * TAU;
      const q: XY = [body[0] + Math.cos(a) * 30 * K, body[1] + (Math.sin(a) * 24 - age * 0.9) * K];
      f.under.col(i % 3 ? C.silver : C.corona, 0.7 * (1 - age / life));
      f.under.dot(Math.round(q[0]), Math.round(q[1]));
    }
  }
  if (pearl) {
    const night = form > 0.5;
    glow(f.above, pearl, 7 + charge * 3, 6 + charge * 2.5, night ? C.silver : C.gold, (night ? 0.12 : 0.22) * (0.6 + charge * 0.5) * pulse, 4);
  }
}
/** The sky of the eclipse on the scene: the black sun with its corona, a night wash, the stars. `k` 0..1 night. */
function eclipseSky(f: FxInput, frame: number, k: number, moon = 1) {
  const p = f.backdrop;
  if (k > 0.01) {
    // night: a violet wash over the scene, deeper in the sky
    p.col('#0a0820', 0.42 * k);
    p.rect(0, 0, f.w, HORIZON + 24 * K);
    p.col('#0a0820', 0.26 * k);
    p.rect(0, HORIZON + 24 * K, f.w, f.h);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(hash(i, 3) * f.w),
        y = Math.floor(hash(i, 5) * (HORIZON - 6));
      const tw = 0.5 + 0.5 * Math.sin((frame / 24) * TAU * (0.5 + hash(i, 7)) + i);
      p.col(i % 5 ? C.silver : C.corona, k * tw * (0.5 + 0.5 * hash(i, 9)));
      p.rect(x, y, 1, 1);
      if (i % 7 === 0) starSpark(p, [x, y], 2.2, k * tw * 0.8);
    }
  }
  if (moon > 0.001) {
    // the moon slides in from the left over the sun; at full cover the corona ring
    const mx = SUN.x - 2.1 * SUN.r * (1 - moon),
      my = SUN.y + 3 * K * (1 - moon);
    const total = moon >= 0.999;
    if (total) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + (frame / 24) * 0.3,
          L = SUN.r * (1.3 + 0.35 * Math.sin((frame / 24) * TAU * 0.5 + i * 1.7));
        line(p, [SUN.x + Math.cos(a) * SUN.r, SUN.y + Math.sin(a) * SUN.r], [SUN.x + Math.cos(a) * L, SUN.y + Math.sin(a) * L], i % 2 ? C.corona : C.silver, 0.55);
      }
      glow(p, [SUN.x, SUN.y], (SUN.r * 1.6) / K, (SUN.r * 1.6) / K, C.corona, 0.22, 4);
      oval(p, [SUN.x, SUN.y], SUN.r + 1, SUN.r + 1, C.white, 0.9);
      oval(p, [SUN.x, SUN.y], SUN.r + 2, SUN.r + 2, C.silver, 0.6);
    }
    ellFill(p, [mx, my], SUN.r, SUN.r, '#0c0a16', 1);
    oval(p, [mx, my], SUN.r, SUN.r, total ? '#2a2648' : '#3a3058', 0.8, Math.PI * 0.7, Math.PI * 1.4);
  }
}

// ---- everyday ---------------------------------------------------------------------------------------------------
function walkFx(f: FxInput, frame: number) {
  const fl = frame % 24;
  for (const [name, at] of [
    ['footL', 0],
    ['foreL', 6],
    ['footR', 12],
    ['foreR', 18],
  ] as const) {
    const age = fl - at;
    const foot = pt(f, name + 'Ground');
    if (foot && age >= 0 && age < 8) dust(f.under, foot, age, 8, 3, 6, at + Math.floor(frame / 24) * 7);
  }
}
/** Dust under the four contacts of a walk home (walkSteps in the pose book): hind foot, then the wrist, one side then
 * the other. */
function stepDust(f: FxInput, frame: number, from: number, every: number, n: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 'L' : 'R';
    for (const [name, at] of [
      ['foot' + side, from + i * every + every * 0.5],
      ['fore' + side, from + (i + 1) * every],
    ] as const) {
      const q = pt(f, name + 'Ground', at);
      if (q) dust(f.under, q, frame - at, 8, 3, 6, seed + i * 2 + (name[1] === 'o' ? 1 : 0));
    }
  }
}
function lookFx(f: FxInput, frame: number) {
  const b = beats.look;
  // the low sun flashes in his eyes as he shades them
  const k = progress(frame, b.shade - 4, b.shade) * (1 - progress(frame, b.glance - 4, b.glance));
  if (k > 0) {
    glow(f.backdrop, [SUN.x, SUN.y], 30, 30, C.hot, 0.25 * k, 4);
    line(f.backdrop, [SUN.x - 30 * K * k, SUN.y], [SUN.x + 30 * K * k, SUN.y], C.hot, 0.6 * k);
    line(f.backdrop, [SUN.x, SUN.y - 18 * K * k], [SUN.x, SUN.y + 18 * K * k], C.hot, 0.5 * k);
  }
}
function fidgetAFx(f: FxInput, frame: number) {
  const b = beats.fidget_a;
  for (const n of b.nibbles) {
    const m = pt(f, 'mouth');
    if (m && frame >= n && frame < n + 3) sparks(f.above, m, frame - n, 3, 3, 26, n, [C.hot, C.gold], -Math.PI / 2, 1.4);
  }
  // A glowing scale drops from the wing, tumbles to the stone, clinks and lies there going out.
  const from = pt(f, 'wingWristR', b.scale),
    floor = pt(f, 'floor');
  if (from && floor && frame >= b.scale) {
    const u = progress(frame, b.scale, b.clink);
    const land: XY = [from[0] + 10 * K, floor[1] + 3 * K];
    const q: XY = [from[0] + (land[0] - from[0]) * u + Math.sin(u * 9) * 3 * K, from[1] + (land[1] - from[1]) * u * u];
    const heat = 1 - progress(frame, b.clink, 60);
    const spin = u < 1 ? Math.sin(frame * 0.9) : 0.2;
    f.above.col(heat > 0.5 ? C.gold : C.orange, 0.95);
    fillPoly(f.above, [q[0] - 3, q[1], q[0], q[1] - 2.2 * Math.abs(spin) - 0.8, q[0] + 3, q[1], q[0], q[1] + 2.2 * Math.abs(spin) + 0.8]);
    glow(f.above, q, 4, 4, C.gold, 0.3 * heat, 3);
    if (frame >= b.clink) sparks(f.above, land, frame - b.clink, 6, 6, 30, 7, [C.hot, C.gold, C.orange], -Math.PI / 2, 1.2, 160, land[1]);
  }
}
function fidgetBFx(f: FxInput, frame: number) {
  const b = beats.fidget_b;
  const m = pt(f, 'mouth');
  if (m && frame >= b.flame && frame < b.flame + 6) flame(f.above, m, -Math.PI / 2 + 0.3, 8 * (1 - progress(frame, b.flame + 3, b.flame + 6)), 0.9, frame);
  const m0 = pt(f, 'mouth', b.ring);
  if (m0) smokeRing(f.above, m0, frame - b.ring, 24);
  const tip = pt(f, 'crescentGround', b.slap);
  if (tip) {
    sparks(f.above, tip, frame - b.slap, 8, 7, 34, 11, [C.hot, C.gold, C.orange], -Math.PI / 2, 1.3, 160, tip[1]);
    dust(f.under, tip, frame - b.slap, 12, 4, 10, 12);
  }
}
function happyFx(f: FxInput, frame: number) {
  const b = beats.happy;
  for (const s of ['L', 'R']) {
    const w = pt(f, 'wingTip' + s, b.clap);
    if (w) airRing(f.above, w, 2 + (frame - b.clap) * 1.2, frame >= b.clap ? 0.6 * (1 - progress(frame, b.clap, b.clap + 6)) : 0, C.hot, C.gold);
  }
  const lift = pt(f, 'floor', takeoffFrame(b.launch));
  if (lift) {
    shock(f.under, lift, 4 + (frame - b.launch) * 2, frame >= b.launch ? 0.6 * (1 - progress(frame, b.launch, b.launch + 8)) : 0, C.dustL);
    dust(f.under, lift, frame - b.launch, 10, 5, 14, 3);
  }
  const land = pt(f, 'floor', b.land);
  if (land) dust(f.under, land, frame - b.land, 12, 6, 16, 4);
  const m = pt(f, 'mouth', b.ring);
  if (m) smokeRing(f.above, m, frame - b.ring, 14);
}
function sleepFx(f: FxInput, frame: number) {
  const nose = pt(f, 'nose');
  if (nose) for (let i = 0; i < 2; i++) puff(f.above, nose, (frame + i * 36) % 72, 40, i, 1, 12);
}
function wakeFx(f: FxInput, frame: number) {
  const b = beats.wake_startled;
  const p = pt(f, 'pearl');
  if (p && frame >= b.flash && frame < b.flash + 8) {
    const k = 1 - progress(frame, b.flash, b.flash + 8);
    glow(f.above, p, 14, 12, C.hot, 0.5 * k, 4);
    airRing(f.above, p, 3 + (frame - b.flash) * 2, 0.6 * k);
  }
  const fl = pt(f, 'floor', 13);
  if (fl) dust(f.under, fl, frame - 13, 10, 5, 14, 5);
}
function hatchFx(f: FxInput, frame: number) {
  const b = beats.hatch;
  const egg = pt(f, 'egg', Math.min(frame, b.gone - 1)) ?? pt(f, 'floor');
  const floor = pt(f, 'floor');
  if (!egg || !floor) return;
  // the egg glows like a small sun, brighter as it cracks; rays at the burst
  const heat = progress(frame, 0, b.burst);
  if (frame < b.gone) glow(f.under, egg, 18 + heat * 6, 16 + heat * 5, C.gold, 0.12 + heat * 0.25, 4);
  if (frame >= b.burst && frame < b.burst + 12) {
    const k = 1 - progress(frame, b.burst, b.burst + 12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      f.sceneryRay(egg, [egg[0] + Math.cos(a) * 140 * K, egg[1] + Math.sin(a) * 90 * K], C.hot, 0.35 * k);
    }
    glow(f.above, egg, 30, 26, C.hot, 0.55 * k, 4);
  }
  // shell shards fly, land and lie glinting, then go out
  for (let i = 0; i < 9; i++) {
    const age = frame - b.gone;
    if (age < 0) break;
    const a = -Math.PI / 2 + (hash(i, 4) - 0.5) * 2.6,
      v = (40 + 40 * hash(i, 5)) * K;
    const tt = Math.min(age, 14) / 24;
    const land = floor[1] + (hash(i, 6) - 0.4) * 12 * K;
    const q: XY = [egg[0] + Math.cos(a) * v * tt, Math.min(land, egg[1] + Math.sin(a) * v * tt + 120 * K * tt * tt)];
    const fade = 1 - progress(frame, 60, 72);
    f.above.col(i % 2 ? '#f0c45a' : '#c48a2c', fade);
    fillPoly(f.above, [q[0] - 3, q[1], q[0], q[1] - 3, q[0] + 3.6, q[1] + 0.7, q[0], q[1] + 1.5]);
    if (age > 14 && (frame + i) % 6 < 2) {
      f.above.col(C.white, fade);
      f.above.rect(Math.round(q[0]), Math.round(q[1]) - 1, 1, 1);
    }
  }
  const m = pt(f, 'mouth');
  if (m && frame >= b.puff && frame < b.puff + 5) flame(f.above, m, -0.3, 7, 0.9, frame);
  const m0 = pt(f, 'mouth', b.puff + 4);
  if (m0) puff(f.above, m0, frame - b.puff - 4, 14, 3);
}
function peekFx(f: FxInput, frame: number) {
  const b = beats.peek;
  const lift = pt(f, 'floor', takeoffFrame(b.flap + 2));
  if (lift) {
    shock(f.under, lift, 4 + (frame - b.flap) * 2.2, frame >= b.flap ? 0.6 * (1 - progress(frame, b.flap, b.flap + 8)) : 0, C.dustL);
    dust(f.under, lift, frame - b.flap, 10, 5, 14, 3);
  }
  // two puffs of smoke from the nostrils of the upside-down head
  const nose = pt(f, 'nose', b.puff);
  if (nose) for (const s of [-1, 1]) puff(f.above, add(nose, s * 2 * K, 0), frame - b.puff, 16, s, 1, -10);
  const land = pt(f, 'floor', b.land);
  if (land) dust(f.under, land, frame - b.land, 10, 5, 14, 6);
}

// ---- first form tricks ----------------------------------------------------------------------------------------
/** The sun sign's point at progress u, in the painting (its centre fixed where he stood at the shot). */
function signAt(feet: XY, u: number): XY {
  const [x, y] = signPoint(u);
  return [feet[0] + SIGN.cx + x, feet[1] + SIGN.cy + y];
}
function trickFx(f: FxInput, frame: number) {
  const b = beats.trick;
  const feet = pt(f, 'floor', b.shot) ?? f.feet;
  const centre: XY = [feet[0] + SIGN.cx, feet[1] + SIGN.cy];
  // Sunlight gathered: soft shafts from the sun into the wings, brightest on each gulp; motes flow along them.
  if (frame >= b.sun[0] && frame < b.sun[1] + 4) {
    const fade = Math.min(progress(frame, b.sun[0], b.sun[0] + 6), 1 - progress(frame, b.sun[1] - 2, b.sun[1] + 4));
    const pulse = Math.max(...b.gulps.map((g) => Math.max(0, 1 - Math.abs(frame - g) / 5)));
    for (const tip of ['wingTipL', 'wingTipR', 'wingWristR'] as const) {
      const q = pt(f, tip);
      if (!q) continue;
      const dx = q[0] - SUN.x,
        dy = q[1] - SUN.y,
        L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L,
        ny = dx / L,
        w0 = SUN.r * 0.5,
        w1 = (5 + pulse * 3) * K;
      for (const [k, c, al] of [
        [1, C.orange, 0.12],
        [0.55, C.gold, 0.18],
        [0.2, C.hot, 0.28],
      ] as const) {
        f.under.col(c, (al + pulse * al) * fade);
        fillPoly(f.under, [SUN.x + nx * w0 * k, SUN.y + ny * w0 * k, q[0] + nx * w1 * k, q[1] + ny * w1 * k, q[0] - nx * w1 * k, q[1] - ny * w1 * k, SUN.x - nx * w0 * k, SUN.y - ny * w0 * k]);
      }
      glow(f.above, q, 4 + pulse * 5, 3 + pulse * 4, C.gold, (0.25 + pulse * 0.45) * fade, 4);
    }
    for (let i = 0; i < 24; i++) {
      const life = 16,
        start = b.sun[0] + i * 1.15,
        u = (frame - start) / life;
      if (u < 0 || u > 1) continue;
      const target = pt(f, i % 3 === 0 ? 'wingTipL' : i % 3 === 1 ? 'wingTipR' : 'wingTrailR');
      if (!target) continue;
      const q: XY = [SUN.x + (target[0] - SUN.x) * u + Math.sin(u * 6 + i) * 6 * K * (1 - u), SUN.y + (target[1] - SUN.y) * u - 14 * K * Math.sin(u * Math.PI)];
      f.above.col(C.orange, 0.5);
      f.above.rect(Math.round(q[0] - 4), Math.round(q[1]), 4, 3);
      f.above.col(u > 0.7 ? C.hot : C.gold, 0.95);
      f.above.rect(Math.round(q[0]), Math.round(q[1]), 3, 3);
    }
  }
  // The wrap: the light runs out of the folded wings into the pearl along the membranes (motes converge on it); the
  // pearl swells and flares.
  const pearl = pt(f, 'pearl');
  if (pearl && frame >= b.wrap[0] && frame < b.aim[1]) {
    for (let i = 0; i < 18; i++) {
      const start = b.wrap[0] + i * 0.6,
        u = (frame - start) / 8;
      if (u < 0 || u > 1) continue;
      const from = pt(f, ['wingTipL', 'wingTipR', 'wingTrailL', 'wingTrailR', 'wingWristL', 'wingWristR'][i % 6]);
      if (!from) continue;
      const q: XY = [from[0] + (pearl[0] - from[0]) * u * u, from[1] + (pearl[1] - from[1]) * u * u];
      f.above.col(u > 0.6 ? C.hot : C.gold, 0.9);
      f.above.rect(Math.round(q[0]), Math.round(q[1]), 3, 3);
    }
    const k = progress(frame, b.wrap[0], b.flare),
      out = 1 - progress(frame, b.flare + 2, b.aim[1]);
    glow(f.above, pearl, 8 + 14 * k, 8 + 14 * k, C.gold, (0.3 + 0.5 * k) * out, 4);
    if (frame >= b.flare && frame < b.flare + 4) wash(f.above, f, C.hot, 0.16 * (1 - progress(frame, b.flare, b.flare + 4)));
  }
  // Down on four: dust at both wrists.
  for (const s of ['L', 'R']) {
    const w = pt(f, 'fore' + s + 'Ground', b.land);
    if (w) dust(f.under, w, frame - b.land, 10, 4, 10, s === 'L' ? 21 : 22);
  }
  // The small sun gathering in the jaws.
  const mouth = pt(f, 'mouth');
  if (mouth && frame >= b.aim[0] && frame < b.shot) {
    const k = progress(frame, b.aim[0], b.shot);
    glow(f.above, mouth, 4 + 6 * k, 4 + 6 * k, C.gold, 0.4 + 0.4 * k, 4);
    ellFill(f.above, mouth, (1 + 2.5 * k) * K, (1 + 2.5 * k) * K, C.hot, 0.9);
  }
  // The sign: every step of the burn leaves molten stone; at the blaze it all goes white again, then cools to dark
  // glass with glints, and fades at the end of the clip.
  const fade = 1 - progress(frame, b.fade[0], b.fade[1]);
  const burnt = signProgress(Math.min(frame, b.off));
  if (frame >= b.shot && burnt !== null && fade > 0) {
    const pts: { q: XY; born: number }[] = [];
    for (let g = b.shot; g <= Math.min(frame, b.off); g += 0.5) {
      const u = signProgress(g);
      if (u !== null) pts.push({ q: signAt(feet, u), born: g });
    }
    const blaze = frame >= b.blaze ? 1 - progress(frame, b.blaze, b.cool[1]) : 0;
    for (let i = 1; i < pts.length; i++) {
      const own = Math.max(0, 1 - (frame - pts[i].born) / 40);
      const heat = Math.max(own, blaze);
      line(f.under, pts[i - 1].q, pts[i].q, C.ink, 0.7 * fade, 4);
      line(f.under, pts[i - 1].q, pts[i].q, moltenColor(heat), (0.45 + heat) * fade, heat > 0.2 ? 2 : 1);
      if (heat < 0.2 && i % 5 === 0) {
        f.under.col(C.glassLit, 0.8 * fade * (0.5 + 0.5 * Math.sin(frame * 0.3 + i)));
        f.under.rect(Math.round(pts[i].q[0]), Math.round(pts[i].q[1]) - 1, 1, 1);
      }
      if (heat > 0.4 && i % 6 === 0) glow(f.under, pts[i].q, 5, 2.5, C.orange, 0.25 * heat * fade, 3);
    }
    if (blaze > 0.3) glow(f.under, centre, SIGN.rx / K + 10, SIGN.ry / K + 6, C.gold, 0.3 * blaze * fade, 4);
  }
  // The beam itself, with molten splashes at the contact.
  if (mouth && frame >= b.shot && frame < b.off + 3) {
    const at = signAt(feet, signProgress(Math.min(frame, b.off)) ?? 1);
    const a = frame < b.off ? 1 : 1 - progress(frame, b.off, b.off + 3);
    if (frame < b.shot + 3) wash(f.above, f, C.hot, 0.18 * (1 - progress(frame, b.shot, b.shot + 3)));
    glow(f.above, mid(mouth, at), Math.abs(at[0] - mouth[0]) * 0.5 / K + 6, Math.abs(at[1] - mouth[1]) * 0.5 / K + 6, C.gold, 0.12 * a, 3);
    beam(f.above, mouth, at, 5, a, frame);
    glow(f.above, mouth, 7, 7, C.hot, 0.6 * a, 4);
    glow(f.above, at, 14, 6, C.orange, 0.55 * a, 4);
    ellFill(f.above, at, 4 * K, 2 * K, C.hot, a);
    sparks(f.above, at, frame % 6, 6, 9, 46, Math.floor(frame / 6), [C.hot, C.gold, C.orange, C.red], -Math.PI / 2, 1.3, 200, at[1] + 2);
  }
  // The blaze: a flash, a ring of light running out along the dial, and a pillar of sunlight up out of the painting.
  if (frame >= b.pillar[0] && frame < b.pillar[1]) {
    const k = progress(frame, b.pillar[0], b.pillar[1]);
    if (frame < b.blaze + 3) wash(f.above, f, C.white, 0.35 * (1 - progress(frame, b.blaze, b.blaze + 3)));
    shock(f.under, centre, (SIGN.rx / K) * (1 + 1.6 * k), 0.7 * (1 - k), C.gold, SIGN.ry / SIGN.rx);
    const w = SIGN.rx * 1.3 * (1 - 0.7 * k) * (frame < b.blaze + 2 ? progress(frame, b.blaze - 1, b.blaze + 2) : 1);
    const top = -10;
    for (const [ww, c, al] of [
      [w + 4 * K, C.orange, 0.35],
      [w, C.gold, 0.6],
      [w * 0.45, C.white, 0.9],
    ] as const) {
      f.above.col(c, al * (1 - k * k));
      fillPoly(f.above, [centre[0] - ww / 2, centre[1], centre[0] + ww / 2, centre[1], centre[0] + ww * 0.35, top, centre[0] - ww * 0.35, top]);
    }
    sparks(f.above, centre, frame - b.blaze, 16, 14, 70, 31, [C.hot, C.gold, C.orange], -Math.PI / 2, 0.5, 40);
  }
  // Claw grooves where the flinch drove his hind feet back over the stone: hot scratches that darken.
  if (frame > b.scrape[0] + 2) {
    const heat = 1 - progress(frame, b.scrape[1], b.scrape[1] + 40);
    for (const s of ['L', 'R']) {
      const a = pt(f, 'foot' + s + 'Ground', b.scrape[0]),
        c = pt(f, 'foot' + s + 'Ground', Math.min(frame, b.scrape[1]));
      if (a && c)
        for (let k = -1; k <= 1; k++) {
          line(f.under, add(a, 2 * K, k * 2), add(c, 0, k * 2), '#1a1424', 0.65 * fade);
          if (heat > 0) line(f.under, add(a, 2 * K, k * 2 - 1), add(c, 0, k * 2 - 1), heat > 0.5 ? C.orange : C.red, 0.5 * heat * fade);
        }
      if (a && c && frame < b.scrape[1] && frame % 3 === 0) sparks(f.above, c, 1, 4, 3, 26, frame + (s === 'L' ? 0 : 50), [C.hot, C.gold, C.orange], -Math.PI / 2 + 0.6, 0.6, 160, c[1]);
    }
  }
  // The head shake: sparks from the jaws.
  if (mouth && frame >= b.shake[0] && frame <= b.shake[1] && frame % 2 === 0) sparks(f.above, mouth, 1, 3, 4, 40, frame, [C.hot, C.gold, C.orange], frame % 4 ? -0.4 : -2.7, 0.8);
  // The snort: a short tongue of fire from the nostrils, a ring of smoke rising, embers falling on the dial.
  const nose = pt(f, 'nose', b.snort);
  if (nose) {
    if (frame >= b.snort && frame < b.snort + 5) {
      const k = progress(frame, b.snort, b.snort + 5);
      flame(f.above, nose, 0.25, 17 * (1 - k * 0.4), 1 - k * 0.8, frame);
    }
    smokeRing(f.above, add(nose, 3 * K, -2 * K), frame - b.snort - 2, 22);
    puff(f.above, add(nose, 2 * K, 0), frame - b.snort - 4, 18, 3);
    sparks(f.above, nose, frame - b.snort, 14, 7, 34, 11, [C.hot, C.gold, C.orange], 0.3, 0.9, 160, feet[1] + 3 * K);
  }
  // The sun-dragon pose: the membranes flare with the low sun behind them.
  if (frame >= b.pose[0] && frame < b.pose[1]) {
    const k = Math.min(progress(frame, b.pose[0], b.pose[0] + 3), 1 - progress(frame, b.pose[1] - 4, b.pose[1]));
    for (const tip of ['wingTipL', 'wingTipR'] as const) {
      const q = pt(f, tip);
      if (q) glow(f.above, q, 7, 5, C.gold, 0.45 * k, 4);
    }
  }
}
function trickBFx(f: FxInput, frame: number) {
  const b = beats.trick_b;
  const home = pt(f, 'floor', 0) ?? f.feet;
  // The spring, then the take-off: a dust ring.
  if (frame >= 12 && frame < b.launch) dust(f.under, home, frame - 12, 14, 3, 8, 1);
  shock(f.under, home, 5 + (frame - b.launch) * 2.6, frame >= b.launch ? 0.7 * (1 - progress(frame, b.launch, b.launch + 10)) : 0, C.dustL);
  dust(f.under, home, frame - b.launch, 14, 7, 22, 2);
  // Far away: a small dark shape crosses the sun, loops, becomes a spark.
  if (frame >= b.far[0] && frame < b.comet[1]) {
    const u = progress(frame, b.far[0], 64);
    let q: XY;
    if (frame < 64) q = [SUN.x + (-50 + 80 * u) * K, SUN.y + (6 - 14 * u) * K];
    else if (frame < 80) {
      const a = progress(frame, 64, 80) * TAU;
      q = [SUN.x + (30 + Math.sin(a) * 10) * K, SUN.y - (8 + (1 - Math.cos(a)) * 8) * K];
    } else q = [SUN.x + (30 - 20 * progress(frame, 80, 90)) * K, SUN.y - (8 + 22 * progress(frame, 80, 90)) * K];
    if (frame < 84) {
      const s = 2 * K * (1 - progress(frame, 78, 84) * 0.6),
        flap = Math.sin(frame * 1.3) * 2.5 * s;
      f.backdrop.col('#140c10', 1);
      fillPoly(f.backdrop, [q[0] - 6 * s, q[1] - flap, q[0] - 1.5 * s, q[1] + 0.5 * s, q[0] + 1.5 * s, q[1] + 0.5 * s, q[0] + 6 * s, q[1] - flap, q[0], q[1] - 1 * s]);
      fillPoly(f.backdrop, [q[0] - 1.2 * s, q[1], q[0] + 2.5 * s, q[1] - 0.8 * s, q[0] + 1.5 * s, q[1] + 0.8 * s]);
      fillPoly(f.backdrop, [q[0] - 1 * s, q[1], q[0] - 4.5 * s, q[1] + 1.5 * s, q[0] - 0.5 * s, q[1] + 0.8 * s]);
    }
    // Crossing the face of the sun: the sun winks (rays), and his shadow sweeps over the dial at its full size.
    if (frame >= 48 && frame < 62) {
      const k = Math.sin(progress(frame, 48, 62) * Math.PI);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        line(f.backdrop, [SUN.x + Math.cos(a) * (SUN.r + 2 * K), SUN.y + Math.sin(a) * (SUN.r + 2 * K)], [SUN.x + Math.cos(a) * (SUN.r + (8 + 6 * k) * K), SUN.y + Math.sin(a) * (SUN.r + (8 + 6 * k) * K)], C.hot, 0.5 * k);
      }
      const fl = pt(f, 'floor', 0) ?? f.feet;
      const x = f.w + 40 * K - progress(frame, 48, 62) * (f.w + 80 * K);
      wingShadow(f.under, [x, fl[1] - 2 * K], 1.7, 0.45 * k + 0.15, Math.sin(frame * 1.3) * 6);
    }
    if (frame >= 80 && frame < b.comet[0]) starSpark(f.backdrop, q, 1.5 + progress(frame, 80, 90) * 2, 0.9, C.hot);
    // The comet dives at the viewer: the spark grows with a spiral fire tail.
    if (frame >= b.comet[0]) {
      const k = progress(frame, b.comet[0], b.comet[1]);
      const from: XY = [SUN.x + 10 * K, SUN.y - 30 * K],
        to: XY = [f.w * 0.45, f.h * 0.45];
      const c: XY = [from[0] + (to[0] - from[0]) * k * k, from[1] + (to[1] - from[1]) * k * k];
      for (let i = 0; i < 18; i++) {
        const u = i / 18,
          back = Math.max(0, k - u * 0.5);
        const q2: XY = [from[0] + (to[0] - from[0]) * back * back, from[1] + (to[1] - from[1]) * back * back];
        const a = u * 9 + frame * 0.8,
          r = (2 + 10 * k) * K * (1 - u);
        f.above.col(u < 0.3 ? C.hot : u < 0.6 ? C.gold : C.orange, 0.9 * (1 - u));
        f.above.rect(Math.round(q2[0] + Math.cos(a) * r), Math.round(q2[1] + Math.sin(a) * r), 3, 3);
      }
      glow(f.above, c, 4 + 22 * k, 4 + 22 * k, C.gold, 0.6, 4);
      ellFill(f.above, c, (1 + 5 * k) * K, (1 + 5 * k) * K, C.hot, 1);
    }
  }
  // The pass over the painting: a heat flash, fire streaming behind his jaws.
  if (frame >= b.pass[0] && frame < b.pass[1]) {
    wash(f.above, f, C.orange, 0.16 * (1 - progress(frame, b.pass[0], b.pass[0] + 6)));
    const m = pt(f, 'mouth');
    if (m) for (let k = 0; k < 3; k++) flame(f.above, add(m, k * 14 * K, k * 2 * K), Math.PI * 0.05, 30, 0.9, frame + k);
    // the fire trail along his path
    for (let g = Math.max(b.pass[0], frame - 6); g <= frame; g++) {
      const q = pt(f, 'body', g);
      if (!q) continue;
      const age = frame - g;
      ellFill(f.above, add(q, (-20 - age * 6) * K, 8 * K), (26 - age * 3) * K, (12 - age * 1.4) * K, age < 2 ? C.gold : age < 4 ? C.orange : C.red, 0.55 * (1 - age / 7));
    }
    const tail = pt(f, 'tailTip');
    if (tail) motes(f.above, tail, frame - b.pass[0], 16, 12, 20, 5, [C.hot, C.gold, C.orange], 10);
  }
  // After the pass his fire trail hangs across the painting as a band of smoke and breaks into embers drifting down.
  if (frame >= b.pass[1] - 2 && frame < b.pass[1] + 28) {
    const path = pt(f, 'body', Math.round((b.pass[0] + b.pass[1]) / 2));
    if (path) {
      const t0 = frame - (b.pass[1] - 2);
      for (let i = 0; i < 9; i++) {
        const x = (f.w * (i + 0.5)) / 9;
        ellFill(f.above, [x, path[1] + (6 - t0 * 0.5 + Math.sin(i * 1.7) * 3) * K], (18 + t0 * 0.4) * K, (5 + t0 * 0.2) * K, C.smokeL, 0.2 * (1 - t0 / 28));
      }
      for (let i = 0; i < 26; i++) {
        const age = t0 - hash(i, 7) * 8;
        if (age < 0) continue;
        const x = f.w * hash(i, 3) + Math.sin(age * 0.3 + i) * 3 * K,
          y = path[1] + ((hash(i, 5) - 0.5) * 22 + age * 1.3 + age * age * 0.02) * K;
        f.above.col(age < 8 ? C.hot : age < 16 ? C.gold : C.orange, 0.9 * (1 - age / 28));
        f.above.rect(Math.round(x), Math.round(y), 3, age < 12 ? 3 : 2);
      }
    }
  }
  // The landing: a skid, a shock ring, molten cracks cooling and fading.
  const land = pt(f, 'floor', b.land);
  if (land && frame >= b.land) {
    const heat = Math.max(0, 1 - (frame - b.land) / 100);
    const out = 1 - progress(frame, 246, 262);
    cracks(f.under, land, 7, 34, heat, 13, progress(frame, b.land, b.land + 6), out);
    const skid = pt(f, 'floor', 136);
    if (skid) for (const k of [-3, 3]) line(f.under, add(land, -8 * K, k * K), add(skid, 0, k * K), '#1a1424', 0.7 * out, 2);
    shock(f.under, land, 6 + (frame - b.land) * 3, 0.8 * (1 - progress(frame, b.land, b.land + 10)));
    dust(f.under, land, frame - b.land, 16, 8, 26, 9);
  }
  // The roar: embers rain down over the scene; rings of breath from the jaws.
  if (frame >= b.roar[0] && frame < b.roar[1] + 20) {
    for (let i = 0; i < 22; i++) {
      const life = 40,
        start = b.roar[0] + hash(i, 3) * 50;
      const age = frame - start;
      if (age < 0 || age > life) continue;
      const x = hash(i, 4) * f.w + Math.sin(age * 0.2 + i) * 4 * K,
        y = (-4 + age * 4.2) * K;
      f.above.col(i % 3 ? C.orange : C.gold, 0.9 * (1 - age / life));
      f.above.rect(Math.round(x), Math.round(y), 2, 3);
    }
    for (const r0 of [144, 152]) {
      const m = pt(f, 'mouth', r0);
      if (m && frame >= r0) airRing(f.above, add(m, 0, -(frame - r0) * 1.5 * K), 3 + (frame - r0) * 1.6, 0.5 * (1 - progress(frame, r0, r0 + 12)), C.hot, C.gold);
    }
    // the roar at the viewer: rings that grow toward the glass, a hot breath over the picture
    for (const r0 of [b.roarFront, b.roarFront + 5, b.roarFront + 10]) {
      const m = pt(f, 'mouth', r0);
      if (m && frame >= r0) airRing(f.above, add(m, (frame - r0) * 1.2 * K, (frame - r0) * 0.8 * K), 4 + (frame - r0) * 3.2, 0.6 * (1 - progress(frame, r0, r0 + 12)), C.hot, C.gold);
    }
    wash(f.above, f, C.orange, frame >= b.roarFront && frame < b.roarFront + 14 ? 0.1 * (1 - progress(frame, b.roarFront, b.roarFront + 14)) : 0);
  }
  // The shake: ash flies off his wings and back.
  if (frame >= b.shake[0] && frame < b.shake[1] + 12) {
    for (const tip of ['wingTipL', 'wingTipR', 'wingWristR', 'crown'] as const) {
      const q = pt(f, tip, b.shake[0] + 2);
      if (q) puff(f.above, q, frame - b.shake[0], 18, tip.length, 1.2, 10);
    }
    const back = pt(f, 'chest', b.shake[0] + 2);
    if (back) sparks(f.above, back, frame - b.shake[0], 14, 10, 40, 23, [C.smokeL, C.smoke, C.dustL], -Math.PI / 2, 2.4, 160, (pt(f, 'floor', 0) ?? f.feet)[1] + 3 * K);
  }
  // Dust at the steps home: each hind foot, then the wrist of the same side.
  stepDust(f, frame, b.walk[0], 10, 4, 20);
}
/** Where the stray beam meets the glass of the painting (left, over the sky beside the gnomon). */
const GLASS_HIT: XY = [34, 146];
/** Angle of hour glyph `i` on the dial ellipse (0 = far centre, clockwise seen from above). */
const hourAngle = (i: number) => -Math.PI / 2 + (i / 12) * TAU;
const onDial = (a: number, k = 0.86): XY => [DIAL.cx + Math.cos(a) * DIAL.rx * k, DIAL.cy + Math.sin(a) * DIAL.ry * k];
/** The fire runs round the dial both ways from the glyph at the gnomon's foot and meets in front. */
const RING_FROM = 10,
  RING_TO = 4;
/** The frame each hour glyph catches fire. */
function hourLit(i: number, b: { hours: number[] }): number {
  const steps = (((i - RING_FROM) % 12) + 12) % 12; // clockwise steps from the start
  const k = Math.min(steps, 12 - steps); // the nearer of the two runs
  return b.hours[0] + ((b.hours[1] - b.hours[0]) * k) / 6;
}
/** Thin cracks in the glass of the painting, round a hit (not squashed: the glass faces us). */
function glassCracks(p: Pen, at: XY, n: number, len: number, seed: number, a: number) {
  if (a <= 0.02) return;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + (hash(i, seed) - 0.5) * 0.7,
      L = len * K * (0.5 + 0.7 * hash(i, seed, 2));
    const pts: XY[] = [at];
    for (let k = 1; k <= 3; k++) {
      const o = (hash(i, seed, k + 4) - 0.5) * 2.4 * K;
      pts.push([at[0] + Math.cos(ang) * L * (k / 3) - Math.sin(ang) * o, at[1] + Math.sin(ang) * L * (k / 3) + Math.cos(ang) * o]);
    }
    polyline(p, pts, '#e8ecff', 0.55 * a);
    if (hash(i, seed, 9) > 0.5) {
      // a branch
      const m = pts[2],
        b2 = ang + (hash(i, seed, 10) > 0.5 ? 0.7 : -0.7);
      line(p, m, [m[0] + Math.cos(b2) * L * 0.35, m[1] + Math.sin(b2) * L * 0.35], '#c8ccf0', 0.45 * a);
    }
  }
}
function trickCFx(f: FxInput, frame: number) {
  const b = beats.trick_c;
  // 1. The tail strike: sparks and a ring where the crescent hits the dial.
  // the tail lags its key by two frames: the crescent meets the stone at strike + 2
  const hit = b.strike + 2;
  const tip = pt(f, 'crescentGround', hit);
  if (tip) {
    sparks(f.above, tip, frame - hit, 8, 9, 38, 3, [C.hot, C.gold, C.orange], -Math.PI / 2, 1.3, 160, tip[1]);
    shock(f.under, tip, 3 + (frame - hit) * 1.6, frame >= hit ? 0.6 * (1 - progress(frame, hit, hit + 8)) : 0);
    if (frame >= hit && frame < hit + 3) glow(f.above, tip, 10, 6, C.hot, 0.7, 3);
  }
  // 2. The three mirrors grow out of the stone: a gold ring opens on the dial, chips and dust fly; they sink back at
  // the end the same way, shedding golden dust.
  const bases = [0, 1, 2].map((k) => pt(f, 'mirror' + k + 'Ground', 40));
  const mirrors = [0, 1, 2].map((k) => pt(f, 'mirror' + k));
  // A mirror pops in (and out) at a quarter of its rise: a flash of gold at the moment, then the lens.
  const upAt = (fr: number) => gesture(f.anim, Math.max(0, fr) / 24).mirrors ?? 0;
  let popAge = -1;
  for (let back = 0; back < 6 && popAge < 0; back++) {
    const a = upAt(frame - back - 1) - MIRROR_POP,
      z = upAt(frame - back) - MIRROR_POP;
    if (a * z <= 0 && a !== z) popAge = back;
  }
  if (popAge >= 0)
    bases.forEach((bp, k) => {
      if (!bp) return;
      const c = add(bp, 0, -26 * K);
      glow(f.above, c, 14, 16, C.hot, 0.85 * (1 - popAge / 6), 4);
      starSpark(f.above, c, 9 * (1 - popAge / 6) + 2, 1 - popAge / 6, C.hot);
      sparks(f.above, c, popAge, 6, 6, 30, 90 + k, [C.white, C.hot, C.gold], -Math.PI / 2, 2, 120);
    });
  bases.forEach((bp, k) => {
    if (!bp) return;
    dust(f.under, bp, frame - b.rise[0] - k * 2, 18, 4, 10, 30 + k);
    sparks(f.above, bp, frame - b.rise[0] - k * 2, 10, 5, 30, 40 + k, ['#a08490', C.dust, C.dustL], -Math.PI / 2, 1.2, 180, bp[1]);
    dust(f.under, bp, frame - b.sink[0] - k * 2, 18, 4, 10, 60 + k);
    const open = progress(frame, b.rise[0], b.rise[0] + 6) * (1 - progress(frame, b.sink[1] - 4, b.sink[1] + 4));
    if (open > 0) oval(f.under, bp, 7 * K * open, 2.4 * K * open, C.gold, 0.7);
    const m = pt(f, 'mirror' + k, b.sink[0]);
    if (m && frame >= b.sink[0]) motes(f.above, m, frame - b.sink[0] - k * 2, 40, 18, 10, 70 + k, goldDust, 40, bp[1]);
  });
  // 3. Sunlight into the pearl: a soft shaft from the low sun, motes along it; the pearl swells.
  const pearl = pt(f, 'pearl');
  if (pearl && frame >= 24 && frame < b.off + 3) {
    const k = progress(frame, 24, b.sun),
      out = 1 - progress(frame, b.off, b.off + 3);
    const dx = pearl[0] - SUN.x,
      dy = pearl[1] - SUN.y,
      L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L,
      ny = dx / L,
      w0 = SUN.r * 0.6,
      w1 = 4 * K;
    for (const [s, c, al] of [
      [1, C.orange, 0.1],
      [0.55, C.gold, 0.16],
      [0.2, C.hot, 0.26],
    ] as const) {
      f.under.col(c, al * k * out);
      fillPoly(f.under, [SUN.x + nx * w0 * s, SUN.y + ny * w0 * s, pearl[0] + nx * w1 * s, pearl[1] + ny * w1 * s, pearl[0] - nx * w1 * s, pearl[1] - ny * w1 * s, SUN.x - nx * w0 * s, SUN.y - ny * w0 * s]);
    }
    if (frame < b.legs[0] + 4)
      for (let i = 0; i < 12; i++) {
        const u = (frame - 24 - i * 1.2) / 10;
        if (u < 0 || u > 1) continue;
        const q = mid([SUN.x, SUN.y], pearl, u);
        f.above.col(u > 0.7 ? C.hot : C.gold, 0.9);
        f.above.rect(Math.round(q[0]), Math.round(q[1]), 2, 2);
      }
    glow(f.above, pearl, 6 + 8 * k, 6 + 8 * k, C.gold, (0.25 + 0.45 * k) * out, 4);
    ellFill(f.above, pearl, (1 + 1.5 * k) * K, (1 + 1.5 * k) * K, C.hot, 0.9 * k * out);
  }
  // 4. The beam jumps pearl → A → B → C.
  const glass = GLASS_HIT;
  const apex: XY = [GNOMON.apex[0], GNOMON.apex[1]];
  const turnU = smooth(progress(frame, b.turn[0], b.turn[1]));
  const on = frame >= b.legs[0] && frame < b.off + 3 ? 1 - progress(frame, b.off, b.off + 3) : 0;
  const pulse = 0.8 + 0.2 * Math.sin(frame * 0.9);
  if (on > 0 && pearl && mirrors.every(Boolean)) {
    const [A, B, Cm] = mirrors as XY[];
    const reach = (start: number) => Math.min(1, Math.max(0, (frame - start) / 2));
    // `behind`: the stretch of the leg (0 at its start … 1 at its end) that runs behind him
    const leg = (from: XY, to: XY, start: number, behind: [number, number], seed: number) => {
      const r = reach(start);
      if (r <= 0) return;
      const part = (u0: number, u1: number, p: Pen) => {
        const a = Math.min(u0, r),
          z = Math.min(u1, r);
        if (z > a) beam(p, mid(from, to, a), mid(from, to, z), 1.4, on * pulse, seed + u0 * 7);
      };
      part(0, behind[0], f.above);
      part(behind[0], behind[1], f.under);
      part(behind[1], 1, f.above);
      if (frame - start < 4 && r >= 1) glow(f.above, to, 12, 12, C.hot, 0.7 * (1 - (frame - start - 2) / 2), 4);
    };
    // pearl → the far mirror by the sun (behind his head) → the near one below it → across in front of his paws to C
    leg(pearl, A, b.legs[0], [0.15, 1], 1);
    leg(A, B, b.legs[1], [0, 0.5], 2);
    leg(B, Cm, b.legs[2], [0, 0], 3);
    // C → the glass of the painting (it widens as it comes at us), then, after the swat, round to the gnomon's tip.
    if (frame >= b.miss - 1) {
      const target = mid(glass, apex, turnU);
      const r = reach(b.miss - 1);
      const end = mid(Cm, target, r);
      if (turnU < 0.35) {
        const L = Math.hypot(end[0] - Cm[0], end[1] - Cm[1]) || 1;
        const dir: XY = [(end[0] - Cm[0]) / L, (end[1] - Cm[1]) / L];
        const nx = -dir[1],
          ny = dir[0];
        const w1 = (3 + 5 * (1 - turnU / 0.35)) * K;
        for (const [s, c, al] of [
          [1.6, C.red, 0.4],
          [1.2, C.orange, 0.7],
          [0.8, C.gold, 0.9],
          [0.35, C.hot, 1],
        ] as const) {
          f.above.col(c, al * on * pulse);
          fillPoly(f.above, [Cm[0] + nx * 1.2 * s, Cm[1] + ny * 1.2 * s, end[0] + nx * w1 * s, end[1] + ny * w1 * s, end[0] - nx * w1 * s, end[1] - ny * w1 * s, Cm[0] - nx * 1.2 * s, Cm[1] - ny * 1.2 * s]);
        }
        line(f.above, Cm, end, C.white, on);
      } else beam(f.under, Cm, end, 1.4, on * pulse, 4);
    }
    // the lit lenses throw a little glow of their own
    mirrors.forEach((m, k) => m && frame >= b.legs[k] + 2 && glow(f.above, m, 9, 10, C.gold, 0.25 * on * pulse, 3));
  }
  // 5. The miss: a white flash on the glass, cracks, then a molten spot that smokes while the beam stays on it; when
  // the beam leaves it cools white → orange → red → a sooty smudge with a glint, and fades away at the end.
  if (frame >= b.miss) {
    const age = frame - b.miss;
    const left = b.turn[0] + 2;
    const heat = frame < left ? 1 : 1 - progress(frame, left, left + 36);
    const gone = 1 - progress(frame, b.fade[0], b.fade[1]);
    if (age < 6) {
      wash(f.above, f, C.hot, 0.22 * (1 - age / 6));
      airRing(f.above, glass, 3 + age * 3, 0.8 * (1 - age / 6));
    }
    glassCracks(f.above, glass, 9, 16 * Math.min(1, age / 3 + 0.4), 11, gone);
    // the glare of the glass round the hit: two short diagonal streaks
    for (const [o, L] of [[-7, 9], [5, 6]] as const) {
      const q = add(glass, o * K, -o * K * 0.4);
      line(f.above, add(q, -L * 0.5 * K, L * 0.5 * K), add(q, L * 0.5 * K, -L * 0.5 * K), '#f4f6ff', 0.35 * gone);
    }
    const r = (2.4 + 2.4 * progress(frame, b.miss, left)) * K;
    ellFill(f.above, glass, r + 2 * K, r + 2 * K, '#1a1420', 0.55 * gone);
    ellFill(f.above, glass, r + 1, r + 1, heat > 0.3 ? C.red : '#2e2430', (heat > 0 ? 0.9 : 0.75) * gone);
    if (heat > 0) ellFill(f.above, glass, r * 0.75, r * 0.75, moltenColor(heat), Math.min(1, 0.4 + heat) * gone);
    if (heat > 0.85) glow(f.above, glass, 10, 10, C.hot, 0.6, 4);
    if (heat <= 0 && (frame >> 2) % 6 === 0) starSpark(f.above, add(glass, -2, -2), 1.6, 0.7 * gone, C.hot);
    // smoke curls up off the glass while it burns
    for (let i = 0; i < 4; i++) {
      const start = b.miss + 2 + i * 6;
      if (start < left + 10) puff(f.above, add(glass, 0, -2), frame - start, 22, i, 1.2, 22);
    }
  }
  // 6. The swat: sparks off C's ring, speed arcs round it while it spins.
  const cAt = mirrors[2];
  if (cAt) {
    sparks(f.above, cAt, frame - b.swat, 10, 8, 36, 13, [C.hot, C.gold, C.orange], Math.PI, 1.1, 160);
    if (frame >= b.turn[0] && frame < b.turn[1] + 2) {
      const a = 1 - progress(frame, b.turn[0], b.turn[1] + 2);
      for (let i = 0; i < 3; i++) {
        const r = (11 + i * 2) * K,
          a0 = turnU * 5 + i * 2.1;
        const pts: XY[] = [];
        for (let s = 0; s <= 6; s++) pts.push([cAt[0] + Math.cos(a0 + s * 0.22) * r, cAt[1] + Math.sin(a0 + s * 0.22) * r * 0.45]);
        polyline(f.above, pts, C.hot, 0.6 * a);
      }
    }
  }
  // 7. The gnomon's tip ignites; the light runs down the blade to the dial.
  const lit = frame >= b.apex ? 1 - progress(frame, b.off, b.off + 30) : 0;
  if (lit > 0) {
    const flare = Math.max(0, 1 - (frame - b.apex) / 8),
      ringFlare = frame >= b.ring ? Math.max(0, 1 - (frame - b.ring) / 10) : 0;
    glow(f.under, apex, 10 + flare * 14 + ringFlare * 10, 10 + flare * 14 + ringFlare * 10, C.gold, (0.5 + 0.4 * flare) * lit, 5);
    ellFill(f.under, apex, 2.4 * K, 2.4 * K, C.hot, lit);
    starSpark(f.under, apex, 5 + flare * 8 + Math.sin(frame * 0.8) * 1.5, lit, C.hot);
    if (flare > 0) sparks(f.under, apex, frame - b.apex, 12, 10, 40, 17, [C.white, C.hot, C.gold], -Math.PI / 2, 2, 120);
    const foot: XY = [(GNOMON.x0 + GNOMON.x1) / 2, GNOMON.foot];
    const run = progress(frame, b.apex, b.hours[0]);
    if (run > 0 && run < 1) {
      const q = mid(apex, foot, run * run);
      line(f.under, apex, q, C.gold, 0.8 * lit, 2);
      glow(f.under, q, 6, 6, C.hot, 0.8, 3);
    } else if (run >= 1) line(f.under, apex, foot, C.gold, 0.35 * lit * (0.8 + 0.2 * Math.sin(frame * 0.6)));
  }
  // 8. Fire runs round the dial both ways from the gnomon's foot; every hour glyph it passes catches and stays lit.
  //    The far half is hidden behind him, the near half runs in front of his feet; the two runs meet in front.
  const glyphsOut = 1 - progress(frame, b.fade[0], b.fade[1]);
  if (frame >= b.hours[0] && glyphsOut > 0) {
    const u = progress(frame, b.hours[0], b.hours[1]);
    const a0 = hourAngle(RING_FROM);
    const trailA = frame < b.off ? 1 : 0.4 + 0.6 * (1 - progress(frame, b.off, b.off + 20));
    for (const s of [1, -1]) {
      const pts: XY[] = [];
      for (let q = 0; q <= 24; q++) pts.push(onDial(a0 + s * Math.PI * u * (q / 24)));
      polyline(f.under, pts, C.gold, 0.75 * trailA * glyphsOut);
      if (u < 1) {
        const head = onDial(a0 + s * Math.PI * u);
        glow(f.under, head, 7, 4, C.hot, 0.9, 3);
        sparks(f.under, head, (frame - b.hours[0]) % 6, 6, 3, 20, frame + (s > 0 ? 1 : 7), [C.white, C.hot, C.gold], -Math.PI / 2, 1, 120, head[1] + 1);
      }
    }
    for (let i = 0; i < 12; i++) {
      const at = hourLit(i, b);
      if (frame < at) continue;
      const g = onDial(hourAngle(i));
      const age = frame - at;
      const flick = 0.75 + 0.25 * Math.sin(frame * 0.7 + i * 1.9);
      const ringFlare = frame >= b.ring ? Math.max(0, 1 - (frame - b.ring) / 12) : 0;
      if (age < 5) glow(f.under, g, 12, 7, C.hot, 0.8 * (1 - age / 5), 4);
      glow(f.under, g, 6 + ringFlare * 6, 3.5 + ringFlare * 4, C.gold, (0.5 * flick + ringFlare * 0.4) * glyphsOut, 3);
      flame(f.under, add(g, 0, -1), -Math.PI / 2, (3 + ringFlare * 8) * flick * glyphsOut, 0.8 * glyphsOut, frame + i);
      if (age < 8) sparks(f.under, g, age, 8, 4, 26, 80 + i, [C.white, C.hot, C.gold], -Math.PI / 2, 0.8, 140, g[1] + 1);
      // at the ring: a short pillar of light out of every glyph
      if (ringFlare > 0) {
        f.under.col(C.hot, 0.5 * ringFlare);
        f.under.rect(Math.round(g[0] - K), Math.round(g[1] - 28 * K * ringFlare), Math.round(2 * K), Math.round(28 * K * ringFlare));
      }
    }
  }
  // 9. The ring closes: a golden flash over the painting, a ring of light runs out over the dial, he roars.
  if (frame >= b.ring && frame < b.ring + 14) {
    const k = 1 - progress(frame, b.ring, b.ring + 14);
    wash(f.above, f, C.gold, 0.26 * k * k);
    const age = frame - b.ring;
    oval(f.under, [DIAL.cx, DIAL.cy], DIAL.rx * (0.86 + age * 0.03), DIAL.ry * (0.86 + age * 0.03), C.hot, 0.8 * k);
    oval(f.under, [DIAL.cx, DIAL.cy + 1], DIAL.rx * (0.84 + age * 0.03), DIAL.ry * (0.84 + age * 0.03), C.orange, 0.5 * k);
    const mouth = pt(f, 'mouth');
    if (mouth) {
      airRing(f.above, mouth, 4 + age * 4, 0.7 * k);
      airRing(f.above, mouth, 2 + Math.max(0, age - 3) * 4, 0.5 * k);
    }
  }
}
function phaseFx(f: FxInput, frame: number) {
  const b = beats.phase;
  const moon = progress(frame, b.moon[0], b.moon[1]);
  const night = progress(frame, b.shadow[0], b.shadow[1]);
  // The moon's shadow runs across the scene left to right; behind its front the night.
  if (frame >= b.shadow[0] && frame < b.shadow[1]) {
    const front = -30 * K + (f.w + 60 * K) * night;
    f.backdrop.col('#0a0820', 0.42);
    f.backdrop.rect(0, 0, Math.max(0, Math.round(front)), f.h);
    for (let x = Math.round(front); x < front + 24 * K; x += 2) {
      f.backdrop.col('#0a0820', 0.42 * (1 - (x - front) / (24 * K)));
      f.backdrop.rect(x, 0, 2, f.h);
    }
  }
  eclipseSky(f, frame, frame >= b.shadow[1] ? 1 : night * 0.4, moon);
  if (frame >= b.total && frame < b.total + 10) {
    const k = 1 - progress(frame, b.total, b.total + 10);
    airRing(f.backdrop, [SUN.x, SUN.y], SUN.r / K + 2 + (frame - b.total) * 3, 0.9 * k, C.white, C.corona);
    wash(f.above, f, C.silver, 0.18 * k);
  }
  // Sparks run with the flip front from the chest to the feet, the tail and the wing tips.
  if (frame >= b.flip[0] && frame <= b.flip[1]) {
    const u = progress(frame, b.flip[0], b.flip[1]);
    const chest = pt(f, 'chest');
    if (chest)
      for (const [name, seed] of [
        ['footL', 1],
        ['footR', 2],
        ['tailTip', 3],
        ['wingTipL', 4],
        ['wingTipR', 5],
        ['crown', 6],
      ] as const) {
        const to = pt(f, name);
        if (!to) continue;
        const q = mid(chest, to, u);
        sparks(f.above, q, frame % 4, 4, 3, 24, frame * 7 + seed, [C.white, C.silver, C.hot], -Math.PI / 2, 2, 60);
        glow(f.above, q, 5, 5, C.silver, 0.3, 3);
      }
  }
  // The shock wave from the chest; dust off the dial below him.
  const chest0 = pt(f, 'chest', b.wave);
  if (chest0 && frame >= b.wave) {
    const k = 1 - progress(frame, b.wave, b.wave + 14);
    airRing(f.above, chest0, 4 + (frame - b.wave) * 6, 0.85 * k, C.white, C.corona);
    const fl = pt(f, 'floor', b.wave);
    if (fl) {
      shock(f.under, fl, 6 + (frame - b.wave) * 5, 0.6 * k, C.corona);
      dust(f.under, fl, frame - b.wave, 16, 8, 30, 21);
    }
  }
  const lift = pt(f, 'floor', b.rise[0]);
  if (lift) dust(f.under, lift, frame - b.rise[0], 14, 6, 20, 22);
}

// ---- second form tricks ---------------------------------------------------------------------------------------
function happyF2Fx(f: FxInput, frame: number) {
  const b = beats['happy-f2'];
  // a ring of corona drawn along the loop
  for (let g = b.loop[0]; g <= Math.min(frame, b.loop[1]); g += 2) {
    const q = pt(f, 'body', g);
    if (!q) continue;
    const age = frame - g,
      a = Math.max(0, 1 - age / 14);
    if (a > 0) glow(f.above, q, 3, 3, C.silver, 0.5 * a, 2);
  }
  const m = pt(f, 'mouth', b.roar);
  if (m) airRing(f.above, m, 3 + (frame - b.roar) * 2, frame >= b.roar ? 0.6 * (1 - progress(frame, b.roar, b.roar + 10)) : 0, C.silver, C.corona);
}
/** A ribbon of corona: a wavy line from a to b, silver core with a violet edge. */
function ribbon(p: Pen, a: XY, b: XY, wave: number, ph: number, alpha: number, w = 2) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
    nx = -(b[1] - a[1]) / L,
    ny = (b[0] - a[0]) / L;
  const pts: XY[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12,
      o = Math.sin(u * 7 + ph) * wave * K * Math.sin(u * Math.PI);
    pts.push([a[0] + (b[0] - a[0]) * u + nx * o, a[1] + (b[1] - a[1]) * u + ny * o]);
  }
  polyline(p, pts, C.violet, alpha * 0.6, w + 2);
  polyline(p, pts, C.corona, alpha * 0.9, w);
  polyline(p, pts, C.white, alpha, 1);
}
/** The storm cloud of «Вихрь короны»: puffs in a heap over the black sun; `swirl` turns them round its middle (the
 * funnel has reached it), `tear` throws them out as rags that thin and go. */
function stormCloud(f: FxInput, frame: number, c: XY, cover: number, swirl: number, tear: number) {
  if (cover <= 0.01 || tear >= 1) return;
  const p = f.backdrop;
  const W = 120 * K;
  const N = 18;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU + hash(i, 50) * 0.4;
    const rr = (0.2 + 0.8 * Math.sqrt(hash(i, 51))) * W * 0.5;
    const a = a0 + swirl * (1.2 + frame * 0.05) * (1.15 - rr / W);
    const out = tear * (1.2 + hash(i, 52)) * W * 0.9;
    const x = c[0] + Math.cos(a) * (rr * (1 - 0.3 * swirl) + out) + Math.sin(frame * 0.05 + i) * 1.5 * K;
    const y = c[1] + Math.sin(a) * (rr * 0.36 * (1 - 0.3 * swirl) + out * 0.4) - tear * 16 * K * hash(i, 53);
    const r = (11 + 9 * hash(i, 54)) * K * (1 - 0.65 * tear);
    const al = cover * (1 - tear * tear);
    ellFill(p, [x, y + 3 * K], r * 1.05, r * 0.7, '#0c0a16', 0.95 * al);
    ellFill(p, [x, y], r, r * 0.66, '#262035', al);
    ellFill(p, [x - r * 0.18, y - r * 0.26], r * 0.62, r * 0.32, '#3e3654', 0.85 * al);
    oval(p, [x, y], r, r * 0.66, C.violet, 0.4 * al, Math.PI * 1.05, Math.PI * 1.95);
  }
  // Silver lightning inside while it swirls.
  if (swirl > 0.1 && tear < 0.3)
    for (let i = 0; i < 3; i++) {
      if (hash(i, frame >> 1) < 0.55) continue;
      const q: XY = [c[0] + (hash(i, frame) - 0.5) * W * 0.8, c[1] + (hash(i + 5, frame) - 0.5) * W * 0.2];
      polyline(p, [q, add(q, 4 * K, 6 * K), add(q, 1 * K, 9 * K), add(q, 6 * K, 15 * K)], C.silver, 0.9 * swirl, 1);
      glow(p, q, 8, 5, C.corona, 0.25 * swirl, 3);
    }
}
function trickF2Fx(f: FxInput, frame: number) {
  const b = beats['trick-f2'];
  const body = pt(f, 'body'),
    floor = pt(f, 'floor', 0) ?? f.feet;
  const sun: XY = [SUN.x, SUN.y];
  // The cloud creeps in from the left over the black sun and covers it; the scene goes dull while it is there.
  const cover = smooth(progress(frame, b.cloud[0], b.cloud[1]));
  const swirl = smooth(progress(frame, b.funnel[1] - 8, b.stop));
  const tear = progress(frame, b.tear[0], b.tear[1]);
  const cc: XY = [SUN.x - 30 * K - (1 - cover) * 170 * K, SUN.y - 14 * K];
  const dull = cover * (1 - progress(frame, b.stop, b.stop + 10));
  if (dull > 0) wash(f.backdrop, f, '#05040c', 0.42 * dull);
  stormCloud(f, frame, cc, Math.max(cover, 0.001), swirl, tear);
  // The sun comes back: a flare of its corona as the rags fly.
  if (frame >= b.sunBack && frame < b.sunBack + 16) {
    const q = progress(frame, b.sunBack, b.sunBack + 16);
    airRing(f.backdrop, sun, SUN.r / K + 2 + q * 34, 0.85 * (1 - q), C.white, C.corona);
    glow(f.backdrop, sun, SUN.r / K + 16, SUN.r / K + 16, C.corona, 0.55 * (1 - q), 4);
  }
  // Ribbons pulled out of the black sun in his chest into both fists.
  if (frame >= b.pull[0] && frame < b.whips + 2) {
    const pearl = pt(f, 'pearl');
    for (const s of ['L', 'R']) {
      const h = pt(f, 'hand' + s);
      if (pearl && h) ribbon(f.above, pearl, h, 3 + 3 * progress(frame, b.pull[0], b.pull[1]), frame * 0.5 + (s === 'L' ? 1 : 0), 0.95);
    }
    const q = pearl;
    if (q) glow(f.above, q, 6, 6, C.corona, 0.6 * progress(frame, b.pull[0], b.pull[0] + 3), 3);
  }
  // The funnel: the whips' wind climbs from him to the cloud, rings widening upward, spinning (front arcs over him,
  // back arcs behind); at the dead stop it shoots up through the cloud and is gone.
  if (body && frame >= b.funnel[0] && frame < b.stop + 6) {
    const grow = smooth(progress(frame, b.funnel[0], b.funnel[1]));
    const burst = progress(frame, b.stop, b.stop + 6);
    const bottom = body[1] + 4 * K;
    const top = bottom + (cc[1] + 10 * K - bottom) * grow - burst * 80 * K;
    const n = 10;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const y = bottom + (top - bottom) * u;
      const x = body[0] + (cc[0] - body[0]) * u * u * grow;
      const r = (14 + 40 * u) * K;
      const a = (1 - burst) * (0.3 + 0.5 * u) * Math.min(1, grow * 1.5);
      const ph = frame * (0.45 + 0.25 * u) + k * 0.9;
      ellFill(f.backdrop, [x, y], r, r * 0.3, C.corona, 0.09 * a);
      for (let d = 0; d < 3; d++) {
        const s0 = (((ph + (d / 3) * TAU) % TAU) + TAU) % TAU;
        // the arc's lower half (sin > 0 on screen) is in front of him
        const front = Math.sin(s0 + 0.7) > 0;
        oval(front ? f.above : f.backdrop, [x, y], r, r * 0.26, d === 0 ? C.white : C.corona, a * (front ? 0.7 : 1), s0, s0 + 1.4);
      }
    }
    // dust sucked up from the floor round his feet
    for (let i = 0; i < 10; i++) {
      const age = (frame * 0.9 + i * 7) % 26;
      const u = age / 26;
      const ang = i * 2.4 + frame * 0.4;
      const q: XY = [floor[0] + Math.cos(ang) * (36 - 20 * u) * K, floor[1] + Math.sin(ang) * 8 * K - u * 70 * K * grow];
      (Math.sin(ang) > 0 ? f.above : f.under).col(C.silver, 0.5 * (1 - u) * grow * (1 - burst));
      (Math.sin(ang) > 0 ? f.above : f.under).dot(Math.round(q[0]), Math.round(q[1]));
    }
  }
  // Six whips spiralling round him; the half in front is drawn over him, the half behind under him.
  if (body && frame >= b.whips && frame < b.stop + 8) {
    const P = gesture(f.anim, f.t);
    const tw = P.twist ?? 0;
    const wrap = progress(frame, b.stop, b.stop + 8);
    for (let i = 0; i < 6; i++) {
      const base = (i / 6) * TAU + tw;
      const pts: XY[] = [];
      const R = (16 + 30 * progress(frame, b.whips, b.whips + 10)) * K * (1 - wrap * 0.7);
      for (let k = 0; k <= 10; k++) {
        const u = k / 10,
          a = base - u * 1.8;
        const rr = 6 * K + R * u;
        pts.push([body[0] + Math.cos(a) * rr, body[1] - 6 * K + Math.sin(a) * rr * 0.35 + (floor[1] - body[1] + 4 * K) * u * u * (1 - wrap)]);
      }
      for (let k = 1; k < pts.length; k++) {
        const a = base - (k / 10) * 1.8;
        const front = Math.sin(a) > 0;
        const pen = front ? f.above : f.under;
        line(pen, pts[k - 1], pts[k], C.violet, 0.6, 3);
        line(pen, pts[k - 1], pts[k], k > 7 ? C.white : C.corona, 0.95, k > 7 ? 1 : 2);
      }
    }
  }
  // The ribbons go home: from the open claws up into the black sun; the corona flares as they arrive.
  if (frame >= b.release && frame < b.flare + 14) {
    const k = progress(frame, b.release, b.flare);
    if (k < 1)
      for (const s of ['L', 'R']) {
        const h = pt(f, 'hand' + s, b.release);
        if (h) ribbon(f.above, mid(h, [SUN.x, SUN.y], k * k), [SUN.x, SUN.y], 5, frame * 0.4 + (s === 'L' ? 1 : 0), 0.9);
      }
    if (frame >= b.flare) {
      const q = progress(frame, b.flare, b.flare + 14);
      airRing(f.backdrop, [SUN.x, SUN.y], SUN.r / K + 2 + q * 26, 0.8 * (1 - q), C.white, C.corona);
      glow(f.backdrop, [SUN.x, SUN.y], SUN.r / K + 14, SUN.r / K + 14, C.corona, 0.5 * (1 - q), 4);
    }
  }
  // The silver arcs left on the stone by the lashes, cooling.
  const out = 1 - progress(frame, 250, 270);
  b.lashes.forEach((g, n) => {
    if (frame < g) return;
    const age = frame - g;
    const heat = Math.max(0, 1 - age / 80);
    const a0 = (n * 2.3) % TAU;
    const c: XY = [floor[0] + Math.cos(a0) * 34 * K, floor[1] + Math.sin(a0) * 9 * K];
    oval(f.under, c, 9 * K, 2.6 * K, heat > 0.5 ? C.white : heat > 0.15 ? C.corona : C.violet, (0.4 + heat * 0.6) * out, a0, a0 + 2.2);
    if (age < 6) sparks(f.above, c, age, 6, 5, 30, g, [C.white, C.silver, C.corona], -Math.PI / 2, 1.2, 160, c[1]);
  });
  // The roar at the glass: the corona ring flies at the viewer and bursts on the glass in sparks.
  const m = pt(f, 'mouth', b.ring);
  if (m && frame >= b.ring) {
    const k = progress(frame, b.ring, b.ring + 10);
    if (k < 1) airRing(f.above, m, 4 + k * 120, 0.9 * (1 - k * 0.6), C.white, C.corona);
    for (let i = 0; i < 26; i++) {
      const age = frame - b.ring - 8 - hash(i, 2) * 6;
      if (age < 0 || age > 20) continue;
      const q: XY = [hash(i, 3) * f.w, hash(i, 4) * f.h + age * 1.2 * K];
      starSpark(f.above, q, 1.5 + hash(i, 5) * 1.5, 1 - age / 20);
    }
  }
}
function trickBF2Fx(f: FxInput, frame: number) {
  const b = beats['trick_b-f2'];
  const home = pt(f, 'floor', 0) ?? f.feet;
  // The pool lies where his head meets the floor in the dive (a little in front of him); his shadow slides there
  // from under him as it darkens and spreads.
  const entry = pt(f, 'headFloor', b.entry + 1) ?? add(home, 14 * K, 4 * K);
  const pool: XY = mid(home, entry, smooth(progress(frame, b.pool[0], b.pool[1])));
  /** The shadow's position on the floor (and its size) over the clip, from the entry spot. */
  const path: [number, number, number, number][] = [
    [b.race[0], 0, 0, 1],
    [60, -78, -6, 0.9],
    [76, -18, -32, 0.6],
    [92, 72, -4, 0.95],
    [102, 18, 12, 1.2],
    [b.burst, 4, 20, 1.5],
  ];
  const at = (g: number): [XY, number] => {
    if (g <= path[0][0]) return [entry, 1];
    let i = 0;
    while (i < path.length - 2 && g > path[i + 1][0]) i++;
    const [f0, x0, y0, s0] = path[i],
      [f1, x1, y1, s1] = path[Math.min(i + 1, path.length - 1)];
    const u = smooth(Math.max(0, Math.min(1, (g - f0) / (f1 - f0))));
    return [[entry[0] + (x0 + (x1 - x0) * u) * K, entry[1] + (y0 + (y1 - y0) * u) * K], s0 + (s1 - s0) * u];
  };
  const shade = (q: XY, s: number, a: number) => {
    ellFill(f.under, q, 22 * K * s, 6 * K * s, C.ink, 0.85 * a);
    oval(f.under, q, 22 * K * s, 6 * K * s, C.silver, 0.7 * a);
  };
  /** A pool of night on the stone: ink with a silver rim, slow rings inside, a few star glints and a crescent. */
  const nightPool = (q: XY, rx: number, a: number) => {
    if (a <= 0) return;
    const ry = rx * 0.3;
    ellFill(f.under, q, rx * 1.08, ry * 1.08, C.violet, 0.25 * a);
    ellFill(f.under, q, rx, ry, C.ink, 0.92 * a);
    for (let r = 0; r < 3; r++) {
      const k = ((frame * 0.03 + r / 3) % 1) * 0.9;
      oval(f.under, q, rx * k, ry * k, C.violet, 0.45 * a * (1 - k));
    }
    oval(f.under, q, rx, ry, C.silver, 0.85 * a);
    for (let i = 0; i < 5; i++) {
      const tw = 0.5 + 0.5 * Math.sin(frame * 0.35 + i * 1.7);
      const g: XY = [q[0] + (hash(i, 31) - 0.5) * rx * 1.3, q[1] + (hash(i, 32) - 0.5) * ry * 1.1];
      f.under.col(C.silver, a * tw);
      f.under.rect(Math.round(g[0]), Math.round(g[1]), 1, 1);
    }
    // the moon's crescent in it, a reflection
    oval(f.under, add(q, -rx * 0.35, -ry * 0.1), 4 * K, 1.6 * K, C.silver, 0.8 * a, Math.PI * 0.55, Math.PI * 1.45);
  };
  // His shadow darkens and spreads into the pool; it holds while he dives; it closes over the tail with a plop and
  // runs off as his swimming shadow.
  const poolR = (22 + 14 * smooth(progress(frame, b.pool[0], b.pool[1]))) * K;
  if (frame < b.pool[0]) shade(home, 1, progress(frame, 0, b.pool[0]));
  else if (frame < b.gone + 4) nightPool(frame < b.dive ? pool : entry, poolR * (frame > b.gone ? 1 - progress(frame, b.gone, b.gone + 4) * 0.35 : 1), 1);
  // The entry: rings run out, a crown of black splashes stands round him at the waterline (the front half over his
  // body, the back half behind it), black drops fly; the plop as the crescent goes under.
  if (frame >= b.entry && frame < b.gone + 2) {
    const k = progress(frame, b.entry, b.entry + 3) * (1 - progress(frame, b.gone - 2, b.gone + 2));
    const cr = (9 + 2 * Math.sin(frame * 1.3)) * K;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + frame * 0.05;
      const front = Math.sin(a) > 0;
      const base: XY = [entry[0] + Math.cos(a) * cr, entry[1] + Math.sin(a) * cr * 0.3];
      const tall = (5 + 4 * hash(i, frame >> 1)) * K * k;
      const pen = front ? f.above : f.under;
      line(pen, base, add(base, Math.cos(a) * 1.5 * K, -tall), C.ink, 0.95, 2);
      pen.col(C.silver, 0.8 * k);
      pen.rect(Math.round(base[0] + Math.cos(a) * 1.5 * K), Math.round(base[1] - tall), 1, 1);
    }
    oval(f.above, entry, cr, cr * 0.3, C.silver, 0.7 * k, 0, Math.PI);
    oval(f.under, entry, cr, cr * 0.3, C.silver, 0.5 * k, Math.PI, TAU);
  }
  for (const [g, q, n] of [
    [b.entry, entry, 14],
    [b.gone, entry, 10],
    [b.burst, at(b.burst)[0], 12],
  ] as const) {
    sparks(f.above, q, frame - g, 14, n, 70, g, [C.ink, C.ink, C.silver], -Math.PI / 2, 0.9, 240, q[1]);
    for (let r = 0; r < 3; r++) {
      const age = frame - g - r * 4;
      if (age >= 0 && age < 24) oval(f.under, q, (10 + age * 1.8) * K, (10 + age * 1.8) * 0.3 * K, C.silver, 0.6 * (1 - age / 24));
    }
  }
  // the plop: a little column of night jumps up where the tail went in and falls back
  {
    const age = frame - b.gone;
    if (age >= 0 && age < 10) {
      const hgt = Math.sin((age / 10) * Math.PI) * 14 * K;
      line(f.above, entry, add(entry, 0, -hgt), C.ink, 1, 3);
      ellFill(f.above, add(entry, 0, -hgt), 2 * K, 2 * K, C.ink, 1);
      f.above.col(C.silver, 0.9);
      f.above.rect(Math.round(entry[0]), Math.round(entry[1] - hgt - 1), 1, 1);
    }
  }
  /** His shadow swimming under the stone: a dragon shape turned along its run, wings beating, two white eyes, a
   * silver rim and a wake of rings behind. */
  const swim = (q: XY, s: number, d: XY, a: number) => {
    const L = Math.hypot(d[0], d[1] * 3.3) || 1,
      fx = d[0] / L,
      fy = (d[1] * 3.3) / L;
    const S = 1.6;
    const P = (u: number, v: number): number[] => [q[0] + (fx * u - fy * v) * s * 1.35 * S * K, q[1] + (fy * u + fx * v) * s * 0.4 * S * K];
    const flap = Math.sin(frame * 0.9) * 0.35;
    const body = [...P(16, 0), ...P(7, 5), ...P(-12, 4), ...P(-34, 1), ...P(-40, -2), ...P(-12, -4), ...P(7, -5)];
    const wings = [-1, 1].map((side) => [...P(5, 4 * side), ...P(-6, 34 * (0.8 + flap) * side), ...P(-14, 22 * (0.8 + flap) * side), ...P(-12, 5 * side)]);
    ellFill(f.under, q, 30 * K * s * S, 8 * K * s * S, C.violet, 0.22 * a);
    f.under.col(C.ink, 0.92 * a);
    fillPoly(f.under, body);
    for (const w of wings) fillPoly(f.under, w);
    oval(f.under, q, 26 * K * s * S, 7.5 * K * s * S, C.silver, 0.5 * a);
    for (const side of [-1, 1]) {
      const e = P(12, 2.2 * side);
      f.under.col(C.white, a);
      f.under.rect(Math.round(e[0]), Math.round(e[1]), 2, 2);
    }
  };
  if (frame >= b.race[0] && frame < b.burst) {
    const [q, s] = at(frame);
    const [q0] = at(frame - 2),
      [q1] = at(frame + 2);
    // it surfaces out of the pool where he went in (grows in over four frames)
    swim(q, s * (0.55 + 0.45 * progress(frame, b.race[0], b.race[0] + 4)), [q1[0] - q0[0] || 1, q1[1] - q0[1]], 1);
    for (let k = 1; k <= 4; k++) {
      const [w] = at(frame - k * 4);
      const age = k * 4;
      oval(f.under, w, (6 + age * 1.1) * K, (6 + age * 1.1) * 0.3 * K, C.silver, 0.4 * (1 - k / 5));
    }
  }
  // Before he bursts out the shadow boils: the rings speed up and black spikes rise round it; then a geyser of night
  // goes up over the frame and he is in it, huge (a dark flash hides the cut).
  {
    const [q] = at(b.burst);
    const boil = progress(frame, b.burst - 6, b.burst);
    if (frame >= b.burst - 6 && frame < b.burst) {
      for (let r = 0; r < 4; r++) {
        const k = ((frame * 0.25 + r / 4) % 1);
        oval(f.under, q, (14 + 30 * k) * K, (14 + 30 * k) * 0.3 * K, C.silver, 0.7 * (1 - k) * boil);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const base: XY = [q[0] + Math.cos(a) * 20 * K, q[1] + Math.sin(a) * 6 * K];
        line(f.above, base, add(base, 0, -(4 + 10 * hash(i, frame)) * K * boil), C.ink, 0.9, 2);
      }
    }
    const age = frame - b.burst;
    if (age >= -1 && age < 8) {
      wash(f.above, f, C.ink, 0.45 * (1 - Math.max(0, age) / 8));
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (hash(i, 41) - 0.5) * 2.4;
        const len = (60 + 120 * hash(i, 42)) * K * Math.min(1, (age + 2) / 4);
        const w = 3 + Math.round(3 * hash(i, 43));
        line(f.above, q, add(q, Math.cos(a) * len, Math.sin(a) * len), C.ink, 0.95 * (1 - Math.max(0, age) / 8), w);
      }
    }
  }
  // Drops of darkness on the glass: they slide down slowly and fade.
  if (frame >= b.burst) {
    for (let i = 0; i < 14; i++) {
      const age = frame - b.burst - hash(i, 7) * 4;
      if (age < 0) continue;
      const x = 24 + hash(i, 8) * (f.w - 48),
        y0 = 30 + hash(i, 9) * (f.h * 0.7);
      const y = y0 + age * (0.15 + hash(i, 10) * 0.25) * K;
      const a = 1 - progress(frame, 200, 260);
      const r = (1.5 + hash(i, 11) * 2.5) * K;
      ellFill(f.above, [x, y], r, r * 1.2, C.ink, 0.85 * a);
      line(f.above, [x, y - r * 2], [x, y], C.ink, 0.6 * a);
      f.above.col(C.silver, a);
      f.above.rect(Math.round(x - r * 0.4), Math.round(y - r * 0.4), 2, 2);
    }
  }
  // His breath fogs the glass (in front of his face, where he hangs at the glass); a claw draws a crescent in the fog,
  // stroke by stroke; the fog clears slowly and takes the drawing with it.
  if (frame >= b.breath) {
    const grow = progress(frame, b.breath, b.breath + 6),
      clear = 1 - progress(frame, 176, 214);
    if (clear > 0) {
      // the fog where his breath hits the glass, in front of his jaws; the crescent where his claw draws
      const m = pt(f, 'mouth', b.breath + 2);
      const c: XY = m ? [m[0] + 8 * K, m[1]] : [f.w * 0.85, f.h * 0.44];
      const h = pt(f, 'handR', Math.round((b.draw[0] + b.draw[1]) / 2));
      const cc: XY = h ?? c;
      for (let i = 4; i >= 1; i--) ellFill(f.above, c, (10 + 20 * grow) * K * (i / 4), (8 + 16 * grow) * K * (i / 4), '#c8c4e0', 0.16 * clear);
      const k = progress(frame, b.draw[0], b.draw[1]);
      if (k > 0) {
        const arc = (r: number, ox: number, from: number, to: number): XY[] => {
          const pts: XY[] = [];
          for (let i = 0; i <= 16; i++) {
            const a = from + (to - from) * (i / 16);
            pts.push([cc[0] + ox + Math.cos(a) * r, cc[1] + Math.sin(a) * r * 0.95]);
          }
          return pts;
        };
        // outer edge first (top round to bottom), then the inner edge back up
        const outer = arc(14 * K, 0, -Math.PI * 0.85, Math.PI * 0.85),
          inner = arc(10.5 * K, 4.5 * K, Math.PI * 0.72, -Math.PI * 0.72);
        const all = [...outer, ...inner];
        const shown = all.slice(0, Math.max(2, Math.round(all.length * k)));
        polyline(f.above, shown.map(([x, y]) => [x + 1, y + 1] as XY), '#14102a', 0.6 * clear, 2);
        polyline(f.above, shown, C.white, 0.9 * clear, 2);
      }
    }
  }
  // The shadow comes back under him and waits; the tail slap splashes it and it closes into an ordinary shadow.
  const under = pt(f, 'floor') ?? home;
  if (frame >= b.home) shade(under, frame < b.slap ? 1 : 1 - progress(frame, b.slap, b.slap + 8) * 0.6, frame < b.slap ? 1 : 1 - progress(frame, b.slap, b.slap + 10));
  const slapAt = pt(f, 'crescentGround', b.slap) ?? under;
  sparks(f.above, slapAt, frame - b.slap, 14, 12, 56, 71, [C.ink, C.ink, C.silver], -Math.PI / 2, 1.3, 220, slapAt[1] + 2);
  for (let r = 0; r < 2; r++) {
    const age = frame - b.slap - r * 4;
    if (age >= 0 && age < 18) oval(f.under, under, (10 + age * 2) * K, (10 + age * 2) * 0.27 * K, C.silver, 0.6 * (1 - age / 18));
  }
}
function trickCF2Fx(f: FxInput, frame: number) {
  const b = beats['trick_c-f2'];
  const P = gesture(f.anim, f.t);
  const sides = ['handL', 'handR', 'handL', 'handR', 'handR'];
  // Stars break off the corona and drift down to the catching claws.
  b.catches.forEach((c, i) => {
    const start = c - 22;
    const target = pt(f, sides[i], c);
    if (!target) return;
    const from: XY = [SUN.x + Math.cos(-0.6 - i * 0.9) * (SUN.r + 2 * K), SUN.y + Math.sin(-0.6 - i * 0.9) * (SUN.r + 2 * K)];
    // the corona flares where the star tears off
    if (frame >= start - 3 && frame < start + 5) glow(f.backdrop, from, 9, 9, C.white, 0.6 * (1 - Math.abs(frame - start) / 5), 4);
    if (frame >= start && frame <= c) {
      const u = progress(frame, start, c);
      // an arc: out from the corona, then down to the claw (accelerating)
      const e = u * u;
      const q: XY = [from[0] + (target[0] - from[0]) * e - Math.sin(u * Math.PI) * 26 * K * (i % 2 ? -1 : 1), from[1] + (target[1] - from[1]) * e - Math.sin(u * Math.PI) * 18 * K];
      // a fading trail of the last few positions
      for (let k = 1; k <= 6; k++) {
        const v = Math.max(0, u - k * 0.04),
          ev = v * v;
        const t: XY = [from[0] + (target[0] - from[0]) * ev - Math.sin(v * Math.PI) * 26 * K * (i % 2 ? -1 : 1), from[1] + (target[1] - from[1]) * ev - Math.sin(v * Math.PI) * 18 * K];
        f.above.col(k < 3 ? C.white : C.corona, 0.8 * (1 - k / 7));
        f.above.rect(Math.round(t[0]), Math.round(t[1]), 3, 3);
      }
      glow(f.above, q, 7, 7, C.corona, 0.5, 3);
      starSpark(f.above, q, 4, 1);
    }
    // the catch: a burst of light in the claw, a ring, sparks between the fingers
    if (frame >= c && frame < c + 6) {
      const k = progress(frame, c, c + 6);
      glow(f.above, target, 12 * (1 - k * 0.5), 12 * (1 - k * 0.5), C.white, 0.8 * (1 - k), 4);
      airRing(f.above, target, 3 + k * 12, 0.7 * (1 - k), C.white, C.corona);
      starSpark(f.above, target, 6 * (1 - k), 1 - k);
    }
    sparks(f.above, target, frame - c, 8, 6, 34, 80 + i, [C.white, C.silver, C.corona], -Math.PI / 2, 2.5, 120);
  });
  // The ball of stars: it grows on his chest as each star is pressed to it, then sits between his hands when he
  // lands, goes up overhead and is thrown out of the picture.
  const orb = P.orb ?? 0;
  const hl = pt(f, 'handL'),
    hr = pt(f, 'handR'),
    chest = pt(f, 'pearl');
  if (orb > 0.01 && hl && hr && chest && frame < b.throw + 1) {
    const held = smooth(progress(frame, b.land - 4, b.land));
    const c = mid(add(chest, 4 * K, -2 * K), mid(hl, hr), held);
    const r = 2 + 4 * orb;
    glow(f.above, c, r * 2.5, r * 2.5, C.corona, 0.5, 4);
    ellFill(f.above, c, r * K, r * K, C.silver, 1);
    ellFill(f.above, c, r * 0.5 * K, r * 0.5 * K, C.white, 1);
    for (let i = 0; i < 4; i++) starSpark(f.above, add(c, Math.cos(frame * 0.3 + i * 1.57) * r * 1.4 * K, Math.sin(frame * 0.3 + i * 1.57) * r * 1.4 * K), 1.6, 0.9);
  }
  const up = pt(f, 'handL', b.throw);
  const up2 = pt(f, 'handR', b.throw);
  if (up && up2 && frame > b.throw && frame < b.flash) {
    const c0 = mid(up, up2);
    const u = progress(frame, b.throw, b.flash - 1);
    const c: XY = [c0[0], c0[1] - (c0[1] + 20 * K) * u];
    glow(f.above, c, 10, 10, C.corona, 0.5, 4);
    ellFill(f.above, c, 5 * K, 5 * K, C.white, 1);
  }
  if (frame >= b.flash && frame < b.flash + 8) wash(f.above, f, C.silver, 0.3 * (1 - progress(frame, b.flash, b.flash + 8)));
  // The starfall: stars streak down diagonally, strike the stone and stand as crystals that go out one by one.
  const floor = pt(f, 'floor', 0) ?? f.feet;
  for (let i = 0; i < 24; i++) {
    const start = b.fall[0] + hash(i, 21) * 34;
    const fallLen = 10 + hash(i, 22) * 6;
    const landX = 24 + hash(i, 23) * (f.w - 48),
      landY = floor[1] + (-18 + hash(i, 24) * 40) * K;
    const age = frame - start;
    if (age < 0) continue;
    const out = frame - (b.fade[0] + i * 3.5);
    if (out > 12) continue;
    const big = i % 3 === 0 ? 1.6 : 1;
    if (age < fallLen) {
      const u = age / fallLen;
      const q: XY = [landX - 40 * K * (1 - u), landY - (landY + 10 * K) * (1 - u)];
      // a long tapering streak with a hot head
      line(f.above, q, add(q, -22 * K, -26 * K), C.violet, 0.45, 3);
      line(f.above, q, add(q, -16 * K, -19 * K), C.corona, 0.8, 2);
      line(f.above, q, add(q, -7 * K, -8 * K), C.white, 1, 1);
      glow(f.above, q, 5 * big, 5 * big, C.corona, 0.5, 3);
      starSpark(f.above, q, 3.2 * big, 1);
    } else {
      const a = out > 0 ? 1 - out / 12 : 1;
      if (age < fallLen + 5) {
        const k = (age - fallLen) / 5;
        glow(f.above, [landX, landY], 8 * big, 4 * big, C.white, 0.7 * (1 - k), 3);
        oval(f.under, [landX, landY], (3 + k * 9) * big * K, (1 + k * 2.5) * big * K, C.silver, 0.7 * (1 - k));
      }
      if (age < fallLen + 6) sparks(f.above, [landX, landY], age - fallLen, 6, 6, 30, i, [C.white, C.silver, C.corona], -Math.PI / 2, 1.3, 140, landY);
      // a crystal standing on the stone, a cold glow round its foot, a glint that walks up it
      const h = 7 * big * K,
        w = 2.4 * big * K;
      ellFill(f.under, [landX, landY], w * 2.4, w * 0.8, C.corona, 0.3 * a);
      f.under.col(C.violet, a);
      fillPoly(f.under, [landX - w, landY, landX - w * 0.4, landY - h * 0.7, landX, landY - h, landX + w, landY]);
      f.under.col(C.silver, a);
      fillPoly(f.under, [landX - w * 0.2, landY, landX, landY - h, landX + w, landY]);
      const g = ((frame + i * 4) % 14) / 14;
      if (g < 0.5) {
        f.under.col(C.white, a);
        f.under.rect(Math.round(landX), Math.round(landY - h * g * 2), 2, 1);
      }
      // going out: a little puff of silver dust
      if (out > 0 && out < 10) sparks(f.above, [landX, landY - h * 0.5], out, 10, 4, 20, i + 90, [C.silver, C.corona], -Math.PI / 2, 1.5, 40);
    }
  }
  // The last big star: down to the crescent, batted at the viewer, smashed on the glass.
  const cres = pt(f, 'crescent', b.bat);
  if (cres) {
    if (frame >= 160 && frame < b.bat) {
      const u = progress(frame, 160, b.bat);
      const q: XY = [cres[0] + 30 * K * (1 - u), cres[1] - 70 * K * (1 - u)];
      starSpark(f.above, q, 4, 1);
      glow(f.above, q, 8, 8, C.corona, 0.5, 3);
    }
    if (frame >= b.bat && frame < b.smash) {
      const u = progress(frame, b.bat, b.smash);
      const g: XY = [f.w * 0.55, f.h * 0.42];
      const q: XY = [cres[0] + (g[0] - cres[0]) * u, cres[1] + (g[1] - cres[1]) * u];
      starSpark(f.above, q, 4 + 14 * u * u, 1);
      glow(f.above, q, 10 + 20 * u, 10 + 20 * u, C.corona, 0.5, 4);
      if (frame < b.bat + 3) sparks(f.above, cres, frame - b.bat, 3, 6, 40, 9, [C.white, C.silver], -0.6, 1.2);
    }
    if (frame >= b.smash) {
      const g: XY = [f.w * 0.55, f.h * 0.42];
      const k = progress(frame, b.smash, b.smash + 50);
      const a = 1 - k;
      if (frame < b.smash + 4) wash(f.above, f, C.white, 0.35);
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * TAU + hash(i, 31);
        const L = (20 + hash(i, 32) * 34) * K;
        const pts: XY[] = [g];
        for (let s = 1; s <= 3; s++) pts.push([g[0] + Math.cos(ang + (hash(i, s) - 0.5) * 0.3) * L * (s / 3), g[1] + Math.sin(ang + (hash(i, s + 4) - 0.5) * 0.3) * L * (s / 3)]);
        polyline(f.above, pts, C.silver, 0.8 * a);
      }
      starSpark(f.above, g, 6 * (1 - k * 0.6), a);
      sparks(f.above, g, frame - b.smash, 16, 14, 60, 41, [C.white, C.silver, C.corona], Math.PI / 2, 2, 160);
    }
  }
}

// ---- show -------------------------------------------------------------------------------------------------------
/** A dragon-shaped shadow on the stone: body, spread wings, tail. */
function wingShadow(p: Pen, at: XY, s: number, a: number, flap: number) {
  if (a <= 0.01 || s <= 0.01) return;
  s *= K;
  flap *= K;
  p.col(C.ink, a);
  fillPoly(p, [at[0] - 40 * s, at[1] - 2 * s - flap, at[0] - 6 * s, at[1] - 1 * s, at[0], at[1] - 3 * s, at[0] + 6 * s, at[1] - 1 * s, at[0] + 40 * s, at[1] - 2 * s - flap, at[0] + 12 * s, at[1] + 4 * s, at[0] - 12 * s, at[1] + 4 * s]);
  ellFill(p, at, 8 * s, 3 * s, C.ink, a);
  fillPoly(p, [at[0] + 6 * s, at[1] + 1 * s, at[0] + 30 * s, at[1] + 5 * s, at[0] + 6 * s, at[1] + 3 * s]);
}
function showFx(f: FxInput, frame: number) {
  const b = beats.show;
  const fl = pt(f, 'floor', 0) ?? f.feet;
  // Something huge crosses the face of the sun: the sun winks, rays flicker.
  if (frame >= b.cross[0] && frame < b.cross[1] + 4) {
    const u = progress(frame, b.cross[0], b.cross[1]);
    const q: XY = [SUN.x + (-40 + 80 * u) * K, SUN.y - (4 + 10 * Math.sin(u * Math.PI)) * K];
    const flap = Math.sin(frame * 1.1) * 5;
    if (frame < b.cross[1]) {
      const P = (pts: number[]) => pts.map((v, i) => q[i % 2] + v * K);
      f.backdrop.col('#140c10', 1);
      fillPoly(f.backdrop, P([-16, -flap, -3, 1, 4, 1, 16, -flap, 0, -3]));
      fillPoly(f.backdrop, P([2, -1, 9, -2, 4, 2]));
      fillPoly(f.backdrop, P([-2, 0, -13, 3, -1, 2]));
    }
    const k = Math.sin(u * Math.PI);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.15;
      line(f.backdrop, [SUN.x + Math.cos(a) * (SUN.r + 2 * K), SUN.y + Math.sin(a) * (SUN.r + 2 * K)], [SUN.x + Math.cos(a) * (SUN.r + (10 + 8 * k) * K), SUN.y + Math.sin(a) * (SUN.r + (10 + 8 * k) * K)], C.hot, 0.55 * k);
    }
  }
  // A copper scale tumbles down from the sky, glinting, and lands on the dial where he will land.
  const scaleAt = add(fl, 6 * K, 3 * K);
  if (frame >= b.scale[0] && frame < b.land) {
    const u = progress(frame, b.scale[0], b.scale[1]);
    const q: XY = frame < b.scale[1] ? [scaleAt[0] + Math.sin(u * 9) * 14 * K * (1 - u), -6 * K + (scaleAt[1] + 6 * K) * u] : scaleAt;
    const spin = frame < b.scale[1] ? Math.abs(Math.cos(frame * 0.7)) : 0.25;
    ellFill(f.above, q, 2.6 * K, (0.6 + 1.8 * spin) * K, '#bc701c', 1);
    ellFill(f.above, add(q, -0.6 * K, -0.4 * K), 1.4 * K, (0.4 + spin) * K, '#e8a634', 1);
    if (spin > 0.85 || frame >= b.scale[1]) glow(f.above, q, 5, 5, C.gold, frame >= b.scale[1] ? 0.3 + 0.2 * Math.sin(frame * 0.6) : 0.6, 3);
    if (frame >= b.scale[1]) {
      sparks(f.above, scaleAt, frame - b.scale[1], 6, 5, 20, 61, [C.hot, C.gold], -Math.PI / 2, 1.2, 160, scaleAt[1] + 1);
      // the glow grows as he comes down for it
      glow(f.under, scaleAt, 10 + 12 * progress(frame, b.descend[0], b.land), 4 + 4 * progress(frame, b.descend[0], b.land), C.gold, 0.35 * progress(frame, b.scale[1], b.land), 3);
    }
  }
  // Wing beats from above the frame: rings of wind push down, dust lifts from the dial in a widening ring.
  for (let g = b.beat[0]; g < b.descend[1]; g += 6) {
    const age = frame - g;
    if (age < 0 || age > 12) continue;
    const top: XY = [fl[0], g < b.descend[0] ? -10 * K : fl[1] + (-120 + (g - b.descend[0]) * 7) * K];
    oval(f.above, add(top, 0, age * 5 * K), (16 + age * 4) * K, (3 + age) * K, C.dustL, 0.35 * (1 - age / 12));
    dust(f.under, fl, age, 12, 6, 16 + (g - b.beat[0]), 100 + g);
  }
  // His shadow pools on the dial as he descends.
  if (frame >= b.beat[0] && frame < b.land) {
    const k = progress(frame, b.beat[0], b.land);
    ellFill(f.under, fl, (10 + 22 * k) * K, (3 + 6 * k) * K, C.ink, 0.25 + 0.4 * k);
  }
  // The winged shadow sweeps over the empty dial with wind, dust and petals; it sweeps back, shrinking.
  if (frame < b.descend[0]) {
    const sweep = frame < b.shadow[1] ? progress(frame, b.shadow[0], b.shadow[1]) : 0;
    const back = progress(frame, b.back[0], b.back[1]);
    const x = frame < b.shadow[1] ? f.w + 70 * K - (f.w + 140 * K) * sweep : -70 * K + (fl[0] + 70 * K) * smooth(back);
    const s = frame < b.shadow[1] ? 1.7 : 1.7 - 1.1 * back;
    wingShadow(f.under, [x, fl[1] - 4 * K], s, frame < b.shadow[1] || back < 1 ? 0.7 : 0, Math.sin(frame * 0.5) * 3 * s);
    for (let i = 0; i < 18; i++) {
      const age = ((frame * (1.5 + hash(i, 3)) + hash(i, 4) * 300) % 300) * K;
      const q: XY = [f.w - age, fl[1] + (-50 + hash(i, 5) * 60 + Math.sin(age * 0.1 + i) * 4) * K];
      f.above.col(i % 3 ? C.dustL : '#e8b4b8', 0.7);
      f.above.rect(Math.round(q[0]), Math.round(q[1]), i % 3 ? 2 : 3, i % 3 ? 1 : 2);
    }
  }
  // The heavy landing: a ring, dust, cracks that cool and are gone before the held pose.
  if (frame >= b.land) {
    const out = 1 - progress(frame, 132, 148);
    cracks(f.under, fl, 7, 30, Math.max(0, 1 - (frame - b.land) / 60), 17, progress(frame, b.land, b.land + 5), out);
    shock(f.under, fl, 6 + (frame - b.land) * 3.2, 0.8 * (1 - progress(frame, b.land, b.land + 10)));
    dust(f.under, fl, frame - b.land, 18, 8, 28, 18);
  }
  // The pearl flares with rays.
  const pearl = pt(f, 'pearl');
  if (pearl && frame >= b.flare - 6 && frame < b.flare + 14) {
    const k = 1 - Math.abs(frame - b.flare) / 14;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      f.sceneryRay(pearl, [pearl[0] + Math.cos(a) * 160 * K, pearl[1] + Math.sin(a) * 120 * K], C.hot, 0.45 * k);
    }
    glow(f.above, pearl, 18, 16, C.hot, 0.5 * k, 4);
  }
  // The column of flame to the sun, then a smoke ring. It leaves the jaws along the snout (head → nose), so the
  // face always looks where the fire goes [owner 22.11].
  const m = pt(f, 'mouth'),
    nose = pt(f, 'nose'),
    head = pt(f, 'head');
  if (m && nose && head && frame >= b.roar[0] + 4 && frame < b.ring) {
    const a = 1 - progress(frame, b.ring - 3, b.ring);
    const dl = Math.hypot(nose[0] - head[0], nose[1] - head[1]) || 1;
    const dir: XY = [(nose[0] - head[0]) / dl, (nose[1] - head[1]) / dl];
    const from: XY = [(nose[0] + m[0]) / 2 + dir[0] * 2 * K, (nose[1] + m[1]) / 2 + dir[1] * 2 * K];
    // grows from the jaws in 4 frames to past the top of the painting
    const full = (from[1] + 10 * K) / Math.max(0.35, -dir[1]);
    const len = full * progress(frame, b.roar[0] + 4, b.roar[0] + 8);
    flameJet(f.above, from, dir, len, 7 * K, 19 * K, a, frame);
    glow(f.above, from, 14, 14, C.hot, 0.6 * a, 4);
    // the light of it on the stone and a few embers drifting down beside it
    glow(f.under, fl, 40, 10, C.gold, 0.35 * a, 4);
    const end: XY = [from[0] + dir[0] * len, from[1] + dir[1] * len];
    sparks(f.above, [end[0], Math.max(6, end[1])], (frame - b.roar[0]) % 10, 10, 6, 40, Math.floor(frame / 10), [C.hot, C.gold, C.orange], Math.atan2(-dir[1], dir[0]), 2.4, 60);
  }
  const m0 = pt(f, 'mouth', b.ring);
  if (m0) smokeRing(f.above, m0, frame - b.ring, 24);
}

export function drakeEffects(f: FxInput) {
  const frame = frameOf(f);
  const P = gesture(f.anim, f.t);
  const hidden = (P.hidden ?? 0) > 0.5;
  const form = P.form ?? 0;
  if (!hidden) aura(f, frame, form, P.charge ?? 0);
  if (form > 0.5 && f.anim !== 'phase') eclipseSky(f, frame, 1, 1);
  switch (f.anim) {
    case 'walk':
      return walkFx(f, frame);
    case 'look':
      return lookFx(f, frame);
    case 'fidget_a':
      return fidgetAFx(f, frame);
    case 'fidget_b':
      return fidgetBFx(f, frame);
    case 'happy':
      return happyFx(f, frame);
    case 'sleep':
      return sleepFx(f, frame);
    case 'wake_startled':
      return wakeFx(f, frame);
    case 'hatch':
      return hatchFx(f, frame);
    case 'peek':
      return peekFx(f, frame);
    case 'trick':
      return trickFx(f, frame);
    case 'trick_b':
      return trickBFx(f, frame);
    case 'trick_c':
      return trickCFx(f, frame);
    case 'phase':
      return phaseFx(f, frame);
    case 'happy-f2':
      return happyF2Fx(f, frame);
    case 'trick-f2':
      return trickF2Fx(f, frame);
    case 'trick_b-f2':
      return trickBF2Fx(f, frame);
    case 'trick_c-f2':
      return trickCF2Fx(f, frame);
    case 'show':
      return showFx(f, frame);
  }
}
