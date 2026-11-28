// Effects of Пушинка. Its seeds: loose ones that drift off the mane, the five seed children with little faces of
// «Детки-пушинки» that float up, get blown away and come back through the dandelions that sprout at its feet, and the
// tail's seeds that make a heart in the sky in «Желание». The wind: curly streaks of the gusts. «Цветёт»: warm sunbeams,
// the bumblebee that circles and lands on its nose, pollen and the sneeze. Dust of the meadow on landings, sparkles,
// hearts, «!», sleepy «z». Timelines read the beats of the pose book; positions read the cub's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, CHASE } from './puff_kit-poses';

const soil = ['#2a3a16', '#3e5420', '#5e7a34', '#7e9a48', '#a4bc6e', '#d4e0a8'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];
const pink = ['#a03a56', '#e06a88', '#ffb0c4', '#fff0f4'];
const seedC = ['#8a9098', '#c8ced6', '#eef2f6', '#ffffff'];
const leafC = ['#1e4a1e', '#3a7e30', '#5ea042', '#8cc45a'];
const sproutC = ['#173a17', '#2f6a26', '#7cc44e', '#c4e888'];
const petalC = ['#c87a10', '#f4c020', '#ffe45a', '#fff4a8'];
const beeC = { body: '#f4c020', band: '#2a1e14', wing: '#eef6fc', wingEdge: '#a8c4dc', eye: '#1a1210' };
const wind = ['#ffffff', '#e4f2fa', '#b8d8ec'];

const frameOf = (f: FxInput) => f.t * 24;
/** A socket now, or at an earlier frame of this clip; null where the socket does not exist. */
function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, frame) / 24, name);
  } catch {
    return null;
  }
}

// ---- general -------------------------------------------------------------------------------------------------------
/** A soft dust cloud of the meadow: a shaded base, a light body and a bright cap. */
function puff(p: Pen, [x, y]: XY, r: number, a: number, palette = soil) {
  if (a <= 0 || r < 0.6) return;
  ellFill(p, [x + r * 0.25, y + r * 0.3], r, r * 0.8, palette[2], a);
  ellFill(p, [x, y], r * 0.86, r * 0.7, palette[3], a);
  ellFill(p, [x - r * 0.3, y - r * 0.3], r * 0.46, r * 0.36, palette[5], a);
}
function dustCloud(p: Pen, at: XY, age: number, life: number, count: number, rise: number, spread: number, seed: number, size = 1) {
  for (let i = 0; i < count; i++) {
    const k = (age - i * 1.2) / life;
    if (k < 0 || k > 1) continue;
    const side = (hash(i, seed, 1) - 0.5) * 2;
    const x = at[0] + side * spread * Math.sqrt(k),
      y = at[1] - rise * (0.3 + 0.7 * hash(i, seed, 2)) * Math.sqrt(k);
    puff(p, [x, y], size * (1.2 + 3 * k), 0.85 * (1 - k * k));
  }
}
/** Ballistic bits from a point; `up` is the launch bias (negative = upwards on screen). */
function spray(p: Pen, at: XY, age: number, life: number, count: number, speed: number, palette: string[], seed: number, up = -0.6, gravity = 90, spread = 1) {
  if (age < 0 || age > life) return;
  const t = age / 24,
    fade = 1 - progress(age, life * 0.6, life);
  for (let i = 0; i < count; i++) {
    const a = up * Math.PI * 0.5 + (hash(i, seed, 1) - 0.5) * Math.PI * spread,
      v = speed * (0.5 + 0.5 * hash(i, seed, 2));
    const x = at[0] + Math.sin(a + Math.PI / 2) * v * t * (hash(i, seed, 3) > 0.5 ? 1 : -1),
      y = at[1] + Math.sin(a) * v * t + gravity * t * t;
    p.col(palette[1 + (i % (palette.length - 1))], fade);
    p.rect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, 1 + (i % 2));
  }
}
function sparkle(p: Pen, [x, y]: XY, size: number, a = 1, palette = gold) {
  if (a <= 0 || size <= 0) return;
  p.col(palette[1], a);
  star(p, x, y, size, 4, Math.PI / 4);
  p.col(palette[2], a);
  star(p, x, y, size * 0.6, 4, Math.PI / 4);
  flare(p, Math.round(x), Math.round(y), Math.max(1, Math.round(size * 0.9)), palette[3], a);
}
function sparkleRing(p: Pen, at: XY, age: number, life: number, n: number, r0: number, r1: number, seed: number, palette = gold) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + seed;
    const r = r0 + (r1 - r0) * Math.sqrt(k);
    sparkle(p, [at[0] + Math.cos(ang) * r, at[1] + Math.sin(ang) * r * 0.8], (i % 2 ? 2.4 : 3.4) * (1 - k * 0.6), 1 - k * k, palette);
  }
}
function heart(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const rows = s > 1 ? ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'] : ['##.##', '#####', '.###.', '..#..'];
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== '#') return;
      p.col(j === 1 && i === 1 ? pink[3] : j < 2 ? pink[1] : pink[0], a);
      p.rect(X - (row.length >> 1) + i, Y + j, 1, 1);
    }),
  );
}
function hearts(p: Pen, at: XY, age: number, life: number, n: number) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const k = (age - i * 4) / (life - (n - 1) * 4);
    if (k < 0 || k > 1) continue;
    heart(p, [at[0] + (i % 2 ? 8 : -6) + Math.sin(k * 7 + i) * 2, at[1] - k * 18], k < 0.2 ? 1 : 2, 1 - progress(k, 0.7, 1));
  }
}
function zed(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col('#f4f8fc', a);
  p.line(X, Y, X + S, Y);
  p.line(X + S, Y, X, Y + S);
  p.line(X, Y + S, X + S, Y + S);
}
/** «!» over the head, popping in with a bounce. */
function bang(p: Pen, [x, y]: XY, age: number, life: number) {
  if (age < 0 || age > life) return;
  const a = 1 - progress(age, life * 0.7, life);
  const hop = age < 3 ? (3 - age) * 1.5 : 0;
  const X = Math.round(x),
    Y = Math.round(y - hop);
  p.col('#24140e', a);
  p.rect(X - 1, Y - 1, 4, 8);
  p.col('#ffe48a', a);
  p.rect(X, Y, 2, 4);
  p.rect(X, Y + 5, 2, 1);
}
/** Short lines bursting out round a point (alarm, sneeze). */
function burst(p: Pen, [x, y]: XY, age: number, life: number, n: number, r0: number, color: string, len = 3, fan = 0.45, dir = -Math.PI / 2) {
  if (age < 0 || age > life) return;
  const a = 1 - age / life;
  p.col(color, a);
  for (let i = 0; i < n; i++) {
    const ang = dir + (i - (n - 1) / 2) * fan,
      r = r0 + age * 1.5;
    p.line(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), Math.round(x + Math.cos(ang) * (r + len)), Math.round(y + Math.sin(ang) * (r + len)));
  }
}

// ---- seeds, wind, sprouts, the bee ----------------------------------------------------------------------------------
/** A dandelion seed: a white parasol (a little fan of rays) on a thin stalk with a brown seed at the foot; `tilt`
 * leans it. With `face` it is one of the seed children: the parasol is a round puff with eyes and a smile. */
function seedSprite(p: Pen, [x, y]: XY, a: number, tilt = 0, face = false, happy = true, frame = 0) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const lean = Math.round(tilt * 2);
  // Stalk and seed.
  p.col(seedC[1], a);
  p.line(X, Y + 1, X - lean, Y + 4);
  p.col('#8a6a3a', a);
  p.rect(X - lean, Y + 5, 1, 1);
  if (face) {
    const bob = frame % 8 < 4 ? 0 : 1;
    p.col(seedC[0], a);
    p.rect(X - 4, Y - 3 + bob, 9, 4);
    p.rect(X - 3, Y - 5 + bob, 7, 8);
    p.col(seedC[1], a);
    p.rect(X - 3, Y - 3 + bob, 7, 4);
    p.rect(X - 2, Y - 4 + bob, 5, 6);
    p.col(seedC[3], a);
    p.rect(X - 2, Y - 3 + bob, 5, 4);
    p.rect(X - 1, Y - 4 + bob, 3, 1);
    // Rays poking out of the puff.
    p.col(seedC[2], a);
    for (const [dx, dy] of [
      [-4, -3],
      [4, -3],
      [-3, -5],
      [3, -5],
      [0, -6],
    ])
      p.rect(X + dx, Y + dy + bob, 1, 1);
    p.col('#2a2030', a);
    p.rect(X - 1, Y - 2 + bob, 1, 1);
    p.rect(X + 1, Y - 2 + bob, 1, 1);
    if (happy) {
      p.col('#e06a88', a);
      p.rect(X, Y + bob, 1, 1);
    } else {
      p.col('#2a2030', a);
      p.rect(X, Y + bob, 1, 1);
    }
    return;
  }
  // A plain parasol: five rays and a white top, on a grey rim so it reads over white (clouds, the mane).
  p.col(seedC[0], a * 0.85);
  p.rect(X - 3, Y - 3, 7, 3);
  p.rect(X - 2, Y - 4, 5, 1);
  p.col(seedC[2], a);
  p.line(X - 2, Y - 1, X, Y + 1);
  p.line(X + 2, Y - 1, X, Y + 1);
  p.col(seedC[3], a);
  p.rect(X - 2, Y - 2, 5, 1);
  p.rect(X - 1, Y - 3, 3, 1);
}
/** The one runaway seed of «Пушинка-беглянка», twice the size of the others: it is the star of that clip. */
function bigSeed(p: Pen, [x, y]: XY, a: number, tilt = 0) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const lean = Math.round(tilt * 3);
  p.col(seedC[0], a);
  p.rect(X - 5, Y - 5, 11, 4);
  p.rect(X - 4, Y - 6, 9, 1);
  p.line(X - 1, Y, X - 1 - lean, Y + 7);
  p.line(X + 1, Y, X + 1 - lean, Y + 7);
  p.col(seedC[3], a);
  p.rect(X - 4, Y - 5, 9, 2);
  p.rect(X - 3, Y - 6, 7, 1);
  p.col(seedC[2], a);
  p.line(X - 4, Y - 3, X, Y + 1);
  p.line(X + 4, Y - 3, X, Y + 1);
  p.line(X, Y - 3, X, Y + 1);
  p.col(seedC[1], a);
  p.line(X, Y + 1, X - lean, Y + 7);
  p.col('#8a6a3a', a);
  p.rect(X - lean, Y + 8, 1, 2);
}
/** Loose seeds leaving a point and drifting on the wind (`drift` px over their life, sideways), zigzagging up. */
function looseSeeds(p: Pen, at: XY, age: number, life: number, n: number, seed: number, drift = -40, rise = 24) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const k = (age - i * 1.5) / life;
    if (k < 0 || k > 1) continue;
    const x = at[0] + (hash(i, seed, 1) - 0.5) * 18 + drift * k * (0.6 + 0.6 * hash(i, seed, 2)) + Math.sin(k * 9 + i) * 3,
      y = at[1] + (hash(i, seed, 3) - 0.5) * 10 - rise * k * (0.6 + 0.8 * hash(i, seed, 4));
    seedSprite(p, [x, y], 1 - progress(k, 0.7, 1), Math.sin(k * 7 + i) * 0.8);
  }
}
/** Curly streaks of a gust crossing the field; `dir` −1 blows to the left, +1 to the right. */
function windStreaks(p: Pen, frame: number, a: number, dir: number, top: number, bottom: number, n = 6, seed = 1) {
  if (a <= 0) return;
  for (let i = 0; i < n; i++) {
    const y = top + hash(i, seed, 1) * (bottom - top);
    const len = 18 + hash(i, seed, 2) * 22;
    const speed = 9 + hash(i, seed, 3) * 5;
    const span = 208 + len + 40;
    const head = (((frame * speed + hash(i, seed, 4) * span) % span) + span) % span - len;
    const x0 = dir < 0 ? 208 - head : head;
    p.col(wind[i % 2], a * 0.9);
    for (let s = 0; s < len; s++) {
      const x = x0 - dir * s,
        yy = y + Math.sin((s + frame * 2) * 0.25) * 1.2;
      if (s < len * 0.15 || hash(i, s, seed) > 0.12) p.rect(Math.round(x), Math.round(yy), 1, 1);
    }
    // The curl at the front end.
    p.col(wind[0], a);
    const fx = x0 + dir * 2;
    p.rect(Math.round(fx), Math.round(y - 2), 1, 1);
    p.rect(Math.round(fx + dir), Math.round(y - 1), 1, 1);
    p.rect(Math.round(fx), Math.round(y), 1, 1);
  }
}
/** A dandelion sprout pushing up from the ground: two toothed leaves, a stem, a yellow bud (`grow` 0…1), then a clock
 * (`clock` 0…1) that loses its seeds (`blown` 0…1). */
function sprout(p: Pen, [x, y]: XY, grow: number, flower: number, clock: number, blown: number, a: number) {
  if (a <= 0 || grow <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const h = Math.round(1 + 13 * grow);
  // Two toothed rosette leaves with a dark rim, so they read against the grass.
  const lw = Math.round(1 + 5 * Math.min(1, grow * 1.5));
  for (const s of [-1, 1]) {
    p.col(sproutC[0], a);
    for (let i = 1; i <= lw; i++) p.rect(X + s * i, Y - 1 - (i >= lw - 1 ? 1 : 0), 1, 3);
    for (let i = 1; i <= lw; i++) {
      p.col(i % 2 ? sproutC[2] : sproutC[3], a);
      p.rect(X + s * i, Y - (i >= lw - 1 ? 1 : 0), 1, 1);
    }
  }
  p.col(sproutC[0], a);
  p.rect(X - 1, Y - h, 3, h + 1);
  p.col(sproutC[2], a);
  p.line(X, Y, X, Y - h);
  const top = Y - h - 3;
  if (clock <= 0) {
    if (flower <= 0) {
      // The bud: green with a yellow tip once it is grown.
      p.col(sproutC[0], a);
      p.rect(X - 2, top - 1, 5, 5);
      p.col(sproutC[2], a);
      p.rect(X - 1, top, 3, 3);
      if (grow > 0.7) {
        p.col(petalC[2], a);
        p.rect(X - 1, top - 1, 3, 1);
      }
      return;
    }
    // The flower: a yellow sun of petals.
    const r = 1 + Math.round(2 * flower);
    p.col(petalC[0], a);
    p.rect(X - r - 1, top - r, 2 * r + 3, 2 * r + 1);
    p.rect(X - r, top - r - 1, 2 * r + 1, 2 * r + 3);
    p.col(petalC[1], a);
    p.rect(X - r, top - r + 1, 2 * r + 1, 2 * r - 1);
    p.rect(X - r + 1, top - r, 2 * r - 1, 2 * r + 1);
    p.col(petalC[3], a);
    p.rect(X - 1, top - 1, 2, 2);
    return;
  }
  // The clock: a white ball that thins out as its seeds fly.
  const r = 2 + 3 * clock;
  const keep = 1 - blown;
  for (let i = 0; i < 16; i++) {
    if (hash(i, X, 7) > keep) continue;
    const ang = (i / 16) * TAU;
    p.col(i % 2 ? seedC[3] : seedC[2], a);
    p.rect(Math.round(X + Math.cos(ang) * r), Math.round(top - 1 + Math.sin(ang) * r), 1, 1);
  }
  if (keep > 0.4) {
    p.col(seedC[1], a * keep);
    p.rect(X - 2, top - 3, 5, 5);
    p.col(seedC[3], a * keep);
    p.rect(X - 1, top - 3, 3, 3);
  }
  p.col('#8a6a3a', a);
  p.rect(X, top - 1, 1, 1);
}
/** A bumblebee, round and fuzzy: a striped body with an ink rim, flicking wings, a dark head with a white eye-dot;
 * `face` +1 looks right, −1 left. About 11 × 9 px, so it reads at the painting's size. */
function bee(p: Pen, [x, y]: XY, frame: number, a: number, face = 1) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const up = frame % 2 === 0;
  // Wings: two pale ovals over the back, up and down every other frame.
  for (const dx of [-3, 0]) {
    const wx = X + dx * face - (face < 0 ? 2 : 0);
    p.col(beeC.wingEdge, a * 0.95);
    p.rect(wx - 1, Y - (up ? 8 : 5), 5, up ? 4 : 3);
    p.col(beeC.wing, a * 0.95);
    p.rect(wx, Y - (up ? 7 : 4), 3, up ? 2 : 1);
  }
  // Body: ink rim, yellow fuzz, two dark bands, a light top.
  p.col(beeC.band, a);
  p.rect(X - 5, Y - 3, 10, 7);
  p.rect(X - 4, Y - 4, 8, 9);
  p.col(beeC.body, a);
  p.rect(X - 4, Y - 3, 8, 7);
  p.rect(X - 3, Y - 4 + 1, 6, 7);
  p.col(beeC.band, a);
  p.rect(X - 2 * face - (face < 0 ? 1 : 0), Y - 3, 2, 7);
  p.rect(X + 1 * face - (face < 0 ? 1 : 0), Y - 3, 1, 7);
  p.col('#fff2a0', a);
  p.rect(X - 3, Y - 3, 2, 1);
  // Stinger at the back, the head at the front with an eye.
  p.col(beeC.band, a);
  p.rect(X - 6 * face - (face < 0 ? 0 : 0), Y, 1, 1);
  const hx0 = X + 4 * face - (face < 0 ? 3 : 0);
  p.rect(hx0, Y - 2, 4, 5);
  p.col('#ffffff', a);
  p.rect(hx0 + (face > 0 ? 2 : 1), Y - 1, 1, 1);
  // Two little feelers.
  p.col(beeC.band, a);
  p.rect(hx0 + (face > 0 ? 3 : 0), Y - 4, 1, 2);
  p.rect(hx0 + (face > 0 ? 4 : -1), Y - 5, 1, 1);
}
/** Pollen: a little cloud of yellow dots that drifts and fades. */
function pollen(p: Pen, at: XY, age: number, life: number, n: number, seed: number, drift = 10) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed, 1) * TAU,
      r = 2 + 10 * Math.sqrt(k) * hash(i, seed, 2);
    p.col(petalC[1 + (i % 3)], 1 - k * k);
    p.rect(Math.round(at[0] + Math.cos(ang) * r + drift * k), Math.round(at[1] + Math.sin(ang) * r * 0.7 - 6 * k), 1, 1);
  }
}
/** Warm sunbeams slanting from the upper left onto a point. */
function sunbeams(p: Pen, [x, y]: XY, a: number, frame: number) {
  if (a <= 0) return;
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 12;
    const w = i % 2 ? 4 : 6;
    for (let s = 0; s < 70; s++) {
      const bx = x - 40 + off + s * 0.6,
        by = y - 70 + s;
      if (by < 0) continue;
      const shimmer = 0.5 + 0.5 * Math.sin(frame * 0.3 + i);
      p.col('#fff6c8', a * (0.16 + 0.08 * shimmer) * (1 - s / 70));
      p.rect(Math.round(bx), Math.round(by), w, 1);
    }
  }
}
/** The heart outline in field px: `k` 0…1 runs once round it. */
function heartPoint([cx, cy]: XY, k: number, s: number): XY {
  const t = k * TAU;
  return [cx + 16 * Math.sin(t) ** 3 * s, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
}

// ---- the clips ------------------------------------------------------------------------------------------------------
export function puffEffects(f: FxInput) {
  const frame = frameOf(f);
  const home = f.feet;
  switch (f.anim) {
    case 'trick': {
      const b = beats.trick;
      const crown = pt(f, 'crown', b.release) ?? [home[0], home[1] - 90];
      // A few seeds wiggle off during the shake.
      const mane = pt(f, 'mane', b.shake + 4);
      if (mane) looseSeeds(f.above, [mane[0] + 12, mane[1] - 10], frame - b.shake, 24, 3, 11, 20, 20);
      // The five seed children.
      for (let i = 0; i < 5; i++) {
        const hover: XY = [crown[0] - 30 + i * 15, crown[1] - 18 - 8 * Math.sin(i * 1.3 + 0.5)];
        const startA = (i / 5) * Math.PI - Math.PI;
        const start: XY = [crown[0] + Math.cos(startA) * 26, crown[1] + 16 + Math.sin(startA) * 20];
        if (frame < b.release) continue;
        let x: number, y: number;
        let happy = true;
        if (frame < b.gust) {
          const k = progress(frame, b.release + i, b.release + i + 8);
          const e = 1 - (1 - k) ** 3;
          x = start[0] + (hover[0] - start[0]) * e + Math.sin(frame * 0.25 + i) * 2 * k;
          y = start[1] + (hover[1] - start[1]) * e + Math.cos(frame * 0.3 + i * 2) * 2 * k;
        } else {
          // Blown away to the left, tumbling; one of them dips right over the cub's paws at the leap and escapes.
          const tt = (frame - b.gust) / 24;
          x = hover[0] - 150 * tt ** 1.5 * (0.8 + 0.12 * i);
          y = hover[1] - 10 * tt + 6 * Math.sin(tt * 9 + i);
          happy = false;
          if (i === 2) {
            const paw = pt(f, 'pawR', 70) ?? [home[0] + CHASE, home[1] - 60];
            const k = progress(frame, b.gust, 70);
            const target: XY = [paw[0] - 2, paw[1] - 10];
            if (frame <= 70) {
              x = hover[0] + (target[0] - hover[0]) * k;
              y = hover[1] + (target[1] - hover[1]) * k + Math.sin(k * Math.PI) * -8;
            } else {
              const k2 = (frame - 70) / 24;
              x = target[0] - 90 * k2;
              y = target[1] - 70 * k2;
            }
          }
        }
        const fade = 1 - progress(frame, b.sad - 4, b.sad + 2);
        if (x < -10) continue;
        seedSprite(f.above, [x, y], fade, Math.sin(frame * 0.4 + i) * 0.6, true, happy, frame + i * 3);
      }
      // The gust.
      windStreaks(f.above, frame, progress(frame, b.gust - 2, b.gust + 2) * (1 - progress(frame, 70, 78)), -1, home[1] - 110, home[1] - 10, 7, 3);
      // Dust where it runs, lands from the leap.
      const at: XY = [home[0] + CHASE, home[1]];
      if (frame >= b.chase && frame < 64 && frame % 3 === 0) dustCloud(f.under, [home[0] - 8 - (frame - b.chase) * 2, home[1]], 1, 6, 2, 2, 6, 60 + frame, 0.5);
      dustCloud(f.under, at, frame - b.miss, 12, 5, 4, 12, 61, 0.9);
      // The sprouts at its feet: grow, flower, turn into clocks and blow their seeds back into the mane.
      // Round the cub, beside its body (in front of it there is no room above the frame's lower edge).
      const spots = [-38, -29, -21, 24, 32, 40];
      for (let i = 0; i < spots.length; i++) {
        const sx = at[0] + spots[i],
          sy = at[1] + (i % 3 === 1 ? 6 : 2);
        const grow = progress(frame, b.sprout + i * 2, b.sprout + i * 2 + 10);
        const flower = progress(frame, b.sprout + 8 + i, b.sprout + 11 + i);
        const clock = progress(frame, b.sniff - 3, b.sniff + 1);
        const blown = progress(frame, b.back + i, b.back + i + 6);
        const fade = 1 - progress(frame, b.full + 2, b.full + 10);
        sprout(f.above, [sx, sy], grow, flower, clock, blown, fade);
        // Their seeds fly up into the mane.
        const target = pt(f, 'mane', b.full) ?? [at[0], at[1] - 80];
        for (let j = 0; j < 3; j++) {
          const k = progress(frame, b.back + i + j * 2, b.back + i + j * 2 + 10);
          if (k <= 0 || k >= 1) continue;
          const from: XY = [sx, sy - 18];
          // Each lands on the rim of the mane (round its top half), never on the face.
          const ang = Math.PI * (1.08 + 0.84 * ((i * 3 + j) / 17));
          const to: XY = [target[0] + Math.cos(ang) * 24, target[1] + Math.sin(ang) * 22];
          const x = from[0] + (to[0] - from[0]) * k + Math.sin(k * Math.PI) * (i - 2.5) * 5,
            y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * 14;
          seedSprite(f.above, [x, y], 1, Math.sin(k * 8 + j), false);
        }
      }
      // Regrown: a ring of sparkles; then hearts and dust on the way home.
      const full = pt(f, 'mane', b.full);
      if (full) sparkleRing(f.above, full, frame - b.full, 12, 8, 18, 34, 0.4);
      const head = pt(f, 'crown');
      if (head) hearts(f.above, [head[0] + 6, head[1] - 4], frame - b.home, 16, 2);
      dustCloud(f.under, [home[0] - 12, home[1]], frame - 130, 10, 3, 2, 8, 62, 0.7);
      dustCloud(f.under, home, frame - 138, 10, 3, 2, 8, 63, 0.7);
      break;
    }
    case 'trick_b': {
      const b = beats.trick_b;
      // The wind blows to the right while it rises and floats; it drops at the calm.
      windStreaks(f.above, frame, progress(frame, 2, 8) * (1 - progress(frame, b.calm - 4, b.calm + 2)), 1, home[1] - 140, home[1] - 4, 8, 5);
      dustCloud(f.under, home, frame - b.lift, 12, 5, 4, 14, 71, 1);
      spray(f.above, [home[0], home[1] - 4], frame - b.lift, 14, 10, 50, leafC, 72, -0.9, 40, 1.2);
      // Seeds stream off the mane while the wind holds it, a couple trail above it on the way down.
      const mane = pt(f, 'mane');
      if (mane && frame >= b.lift && frame < b.calm) looseSeeds(f.above, [mane[0] - 6, mane[1]], (frame - b.lift) % 20, 20, 2, 73 + Math.floor((frame - b.lift) / 20), 40, 10);
      if (mane && frame >= b.descend && frame < b.land + 6) {
        const k = (frame - b.descend) / (b.land - b.descend);
        seedSprite(f.above, [mane[0] - 14 + Math.sin(frame * 0.2) * 3, mane[1] - 40 + k * 8], 1 - progress(frame, b.land, b.land + 6), Math.sin(frame * 0.3));
        seedSprite(f.above, [mane[0] + 12 + Math.sin(frame * 0.25 + 1) * 3, mane[1] - 34 + k * 6], 1 - progress(frame, b.land, b.land + 6), Math.sin(frame * 0.3 + 1));
      }
      // The touchdown: a soft puff and a sparkle of pride.
      dustCloud(f.under, home, frame - b.land, 10, 3, 2, 8, 74, 0.6);
      const crown = pt(f, 'crown');
      if (crown && frame >= b.bow && frame < 116) sparkle(f.above, [crown[0] + 18, crown[1] + 4], 3 * (1 - progress(frame, 110, 116)), 1);
      break;
    }
    case 'trick_c': {
      const b = beats.trick_c;
      const crown = pt(f, 'crown'),
        nose = pt(f, 'nose');
      // The sun: warm beams and a few sparkles while it basks, until the bee comes.
      if (crown) sunbeams(f.backdrop, [crown[0], crown[1] + 20], progress(frame, 0, 10) * (1 - progress(frame, b.bee, b.bee + 10)), frame);
      if (crown && frame >= b.sun + 6 && frame < b.bee) for (let i = 0; i < 3; i++) sparkle(f.above, [crown[0] - 20 + i * 20, crown[1] + 6 + (i % 2) * 10], 2.4 * (0.5 + 0.5 * Math.sin(frame * 0.4 + i * 2)), 0.9);
      const bloom = pt(f, 'mane', b.bloom);
      if (bloom) sparkleRing(f.above, bloom, frame - b.bloom, 12, 8, 20, 36, 0.2, petalC);
      // The bumblebee: comes in from the right, circles the head, lands on the nose, lifts off up to the right.
      if (nose && frame >= b.bee) {
        let x: number, y: number, face: number;
        const landAt = pt(f, 'nose', b.land) ?? nose;
        if (frame < b.land) {
          const k = (frame - b.bee) / (b.land - b.bee);
          const ang = k * TAU * 1.25;
          x = landAt[0] + 70 * (1 - k) + Math.cos(ang) * 22 * (1 - k * 0.6);
          y = landAt[1] - 30 + Math.sin(ang) * 10 - 10 * (1 - k);
          face = Math.sin(ang) > 0 ? -1 : 1;
        } else if (frame < b.off) {
          x = landAt[0] + 2;
          y = landAt[1] - 6;
          face = -1;
        } else {
          const k = (frame - b.off) / 24;
          x = landAt[0] + 60 * k;
          y = landAt[1] - 6 - 70 * k + Math.sin(k * 14) * 3;
          face = 1;
        }
        bee(f.above, [x, y], frame, 1 - progress(frame, b.off + 14, b.off + 20), face);
        // The buzz: three short arcs behind it while it flies.
        if (frame < b.land || frame >= b.off) {
          f.above.col('#2a1e14', 0.6);
          for (let i = 1; i <= 3; i++) f.above.rect(Math.round(x - face * (7 + i * 2)), Math.round(y - 4 + (i % 2) * 3), 1, 2);
        }
      }
      // The pollen tickle and the sneeze: pollen, petals and seeds, sneeze lines.
      if (nose) pollen(f.above, [nose[0], nose[1] - 2], frame - b.off, 14, 10, 81, 12);
      const sneezeAt = pt(f, 'nose', b.sneeze);
      if (sneezeAt) {
        burst(f.above, [sneezeAt[0] + 2, sneezeAt[1]], frame - b.sneeze, 6, 5, 4, '#fff6e8', 4, 0.4, 0);
        spray(f.above, [sneezeAt[0], sneezeAt[1] - 20], frame - b.sneeze, 18, 14, 60, petalC, 82, -0.4, 50, 1.6);
        looseSeeds(f.above, [sneezeAt[0] - 10, sneezeAt[1] - 30], frame - b.sneeze, 26, 4, 83, 36, 20);
      }
      const closed = pt(f, 'mane', b.closed);
      if (closed) sparkleRing(f.above, closed, frame - b.closed, 10, 6, 16, 28, 0.6, ['#c8ced6', '#eef2f6', '#ffffff', '#ffffff']);
      const head = pt(f, 'crown');
      if (head) hearts(f.above, [head[0] + 8, head[1] - 2], frame - (b.giggle + 6), 14, 2);
      break;
    }
    case 'trick_d': {
      const b = beats.trick_d;
      const tip = pt(f, 'tailTip', b.blow) ?? [home[0] + 20, home[1] - 40];
      const crown = pt(f, 'crown');
      // The wish: twinkles round the head and a glow on the little clock.
      if (crown && frame >= b.wish && frame < b.breath)
        for (let i = 0; i < 4; i++) {
          const ang = frame * 0.12 + (i * TAU) / 4;
          sparkle(f.above, [crown[0] + Math.cos(ang) * 30, crown[1] + 20 + Math.sin(ang) * 10], 2 + (i % 2), 0.8);
        }
      const tailNow = pt(f, 'tailTip');
      if (tailNow && frame >= b.wish && frame < b.blow) sparkle(f.above, [tailNow[0] + 3, tailNow[1] - 3], 2 + Math.sin(frame * 0.5), 0.8);
      // The breath: three short lines from the mouth to the clock.
      const mouth = pt(f, 'mouth', b.blow);
      if (mouth && frame >= b.blow && frame < b.blow + 8) {
        f.above.col('#ffffff', 1 - (frame - b.blow) / 8);
        for (let i = -1; i <= 1; i++) f.above.line(Math.round(mouth[0] + 3), Math.round(mouth[1] + i * 2), Math.round(mouth[0] + 8), Math.round(mouth[1] + i * 3));
      }
      // The seeds stream up from the clock and settle into a heart in the sky, then burst into sparkles.
      // In the open sky up to the left (above the cub there is no room under the frame); each seed of the wish
      // carries a pink glow so the heart reads over the sky and the clouds alike.
      const centre: XY = [home[0] - 58, 26];
      const n = 22;
      for (let i = 0; i < n; i++) {
        const go = progress(frame, b.blow + i * 0.6, b.heart + i * 0.4);
        if (go <= 0 || frame >= b.burst + 2) continue;
        const target = heartPoint(centre, i / n, 1.0);
        const e = go * go * (3 - 2 * go);
        // Out to the left first, low past the cub's flank, then up to its place: never across the face.
        const ctrl: XY = [tip[0] - 52 + (i % 3) * 4, tip[1] + 2 - (i % 2) * 6];
        const x = (1 - e) * (1 - e) * tip[0] + 2 * (1 - e) * e * ctrl[0] + e * e * target[0],
          y = (1 - e) * (1 - e) * tip[1] + 2 * (1 - e) * e * ctrl[1] + e * e * target[1];
        const wob = frame >= b.heart ? Math.sin(frame * 0.3 + i) * 0.8 : 0;
        f.above.col(pink[2], 0.75 * progress(go, 0.55, 0.85));
        f.above.rect(Math.round(x + wob) - 3, Math.round(y) - 3, 7, 3);
        f.above.rect(Math.round(x + wob) - 2, Math.round(y) - 4, 5, 5);
        seedSprite(f.above, [x + wob, y], 1, Math.sin(frame * 0.2 + i) * 0.5);
      }
      if (frame >= b.heart && frame < b.burst) for (let i = 0; i < 3; i++) sparkle(f.above, heartPoint(centre, ((frame * 0.02 + i / 3) % 1), 1.0), 2.6, 0.9, pink);
      if (frame >= b.burst) {
        for (let i = 0; i < 12; i++) {
          const from = heartPoint(centre, i / 12, 1.0);
          const k = (frame - b.burst) / 18;
          if (k > 1) continue;
          sparkle(f.above, [from[0] + (from[0] - centre[0]) * 0.4 * k, from[1] + 30 * k * k], 3 * (1 - k), 1 - k * k, i % 2 ? pink : gold);
        }
      }
      // The clock grows back with a pop.
      const regrown = pt(f, 'tailTip', b.joy);
      if (regrown) sparkleRing(f.above, regrown, frame - b.joy, 10, 6, 4, 12, 0.3, ['#c8ced6', '#eef2f6', '#ffffff', '#ffffff']);
      break;
    }
    case 'fidget_a': {
      const b = beats.fidget_a;
      const ear = pt(f, 'earR', b.snap + 1);
      if (ear) burst(f.above, ear, frame - b.snap, 5, 3, 2, '#ffffff', 2, 0.6);
      const crown = pt(f, 'crown');
      if (crown && frame >= 40 && frame < 47) sparkle(f.above, [crown[0] + 18, crown[1] + 8], 2.8 * (1 - progress(frame, 43, 47)), 1);
      break;
    }
    case 'fidget_b': {
      const b = beats.fidget_b;
      // One seed: off the mane, it hangs in front of the eyes, dodges the paw, sails up and back into the mane.
      const mane = pt(f, 'mane', b.loose),
        eL = pt(f, 'eyeL', 14),
        eR = pt(f, 'eyeR', 14),
        // Right in front of its eyes, on the fur between them (on the white mane it vanished).
        eyes: XY | null = eL && eR ? [(eL[0] + eR[0]) / 2, (eL[1] + eR[1]) / 2 - 12] : null,
        top = pt(f, 'crown', b.back + 10);
      if (mane && eyes && top && frame >= b.loose && frame < b.back + 12) {
        let x: number, y: number;
        if (frame < 14) {
          const k = progress(frame, b.loose, 14);
          x = mane[0] + 24 + (eyes[0] - mane[0] - 24) * k;
          y = mane[1] - 14 + (eyes[1] - mane[1] + 14) * k;
        } else if (frame < b.bat) {
          x = eyes[0] + Math.sin(frame * 0.35) * 2;
          y = eyes[1] + Math.cos(frame * 0.3) * 1.5;
        } else {
          const k = progress(frame, b.bat, b.back + 12);
          const from: XY = [eyes[0], eyes[1]];
          x = from[0] + (top[0] - from[0]) * k + Math.sin(k * Math.PI) * 10;
          y = from[1] + (top[1] + 4 - from[1]) * k - Math.sin(k * Math.PI) * 22;
        }
        bigSeed(f.above, [x, y], 1, Math.sin(frame * 0.3) * 0.7);
      }
      const head = pt(f, 'crown');
      if (head) hearts(f.above, [head[0] + 8, head[1] - 2], frame - 46, 12, 1);
      break;
    }
    case 'fidget_c': {
      const b = beats.fidget_c;
      windStreaks(f.above, frame, progress(frame, 4, 10) * (1 - progress(frame, b.down, b.down + 6)), 1, home[1] - 120, home[1] - 20, 6, 9);
      const mane = pt(f, 'mane');
      if (mane && frame >= b.sails && frame < b.down) looseSeeds(f.above, [mane[0] + 10, mane[1] - 6], (frame - b.sails) % 18, 18, 1, 91 + Math.floor((frame - b.sails) / 18), 40, 14);
      break;
    }
    case 'happy': {
      const b = beats.happy;
      for (const [k, at] of [
        [0, 13],
        [1, 23],
        [2, b.land],
      ] as const)
        dustCloud(f.under, home, frame - at, 10, 3, 2, 8, 101 + k, 0.6);
      const mane = pt(f, 'mane');
      if (mane) for (const at of [b.hop1, b.hop2, b.hop3]) looseSeeds(f.above, [mane[0], mane[1] - 18], frame - at, 14, 1, 105 + at, 0, 14);
      const head = pt(f, 'crown');
      if (head) hearts(f.above, [head[0] + 6, head[1] - 2], frame - 36, 12, 2);
      break;
    }
    case 'hatch': {
      const b = beats.hatch;
      const mane = pt(f, 'mane', b.burst + 1) ?? [home[0], home[1] - 60];
      spray(f.above, mane, frame - b.burst, 14, 14, 70, leafC, 111, -0.4, 60, 2);
      sparkleRing(f.above, mane, frame - b.burst, 12, 8, 14, 36, 0.3, ['#c8ced6', '#eef2f6', '#ffffff', '#ffffff']);
      looseSeeds(f.above, [mane[0], mane[1] - 10], frame - b.burst, 26, 4, 112, 30, 24);
      dustCloud(f.under, home, frame - b.land, 12, 4, 3, 12, 113, 0.9);
      const crown = pt(f, 'crown');
      if (crown && frame >= 50 && frame < 58) sparkle(f.above, [crown[0] + 18, crown[1] + 8], 3 * (1 - progress(frame, 54, 58)), 1);
      break;
    }
    case 'sleep_in': {
      const mane = pt(f, 'mane');
      if (mane) looseSeeds(f.above, [mane[0], mane[1] - 10], frame - beats.sleep_in.curl, 18, 2, 121, -20, 12);
      break;
    }
    case 'sleep': {
      const head = pt(f, 'crown');
      if (head)
        for (let i = 0; i < 3; i++) {
          const k = ((frame / 72 + i / 3) % 1 + 1) % 1;
          zed(f.above, [head[0] + 10 + k * 10, head[1] - 4 - k * 18], 2 + k * 2.5, Math.sin(k * Math.PI));
        }
      break;
    }
    case 'sleep_out': {
      const b = beats.sleep_out;
      const mane = pt(f, 'mane', b.open + 6);
      if (mane) sparkleRing(f.above, mane, frame - (b.open + 4), 10, 6, 12, 28, 0.5, ['#c8ced6', '#eef2f6', '#ffffff', '#ffffff']);
      const m2 = pt(f, 'mane');
      if (m2) looseSeeds(f.above, [m2[0], m2[1] - 12], frame - b.shake, 10, 2, 131, -18, 12);
      break;
    }
    case 'wake_startled': {
      const b = beats.wake_startled;
      const mane = pt(f, 'mane', b.jolt) ?? [home[0], home[1] - 60];
      burst(f.above, [mane[0], mane[1] - 30], frame - b.jolt, 8, 7, 6, '#ffffff', 4, 0.45);
      looseSeeds(f.above, mane, frame - b.jolt, 24, 5, 141, 10, 30);
      const crown = pt(f, 'crown', 4);
      if (crown) bang(f.above, [crown[0] + 14, crown[1] - 6], frame - 4, 16);
      break;
    }
    default:
      break;
  }
}
