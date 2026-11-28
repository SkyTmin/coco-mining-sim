// Effects of Ушастик: the glowing moth it hunts in «Мотылёк» (the one glow an uncommon creature may have), the
// pumpkin it pops out of, loose feathers and down that drift after every flap and shake, moonlit dust from the
// furrows, wind streaks along the loop and round the swoop at the viewer, dizzy stars, a «!» when it notices, snap
// marks at the beak, the thump on its bottom, sparkles and hearts, a yawn and sleepy «z». Timelines read the beats
// of the pose book; positions read the owlet's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats } from './tuft_owlet-poses';

const soil = ['#1a1424', '#30243c', '#4e3e5a', '#64546e', '#7a6a86', '#9a8aa6'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];
const pink = ['#a03a56', '#e06a88', '#ffb0c4', '#fff0f4'];
const brown = ['#40261a', '#7a5536', '#b88a56', '#e8d2b0'];
const cream = ['#8a6a4e', '#e8d2b0', '#fff2dc', '#ffffff'];
const pump = ['#4a1c10', '#7a3014', '#ae4818', '#d8661e', '#f08c2c', '#ffb452'];
const stem = ['#1e3824', '#3e663a', '#58824a'];
const moonGlow = ['#6a6aa8', '#b8c0f0', '#e8ecff', '#ffffff'];

const frameOf = (f: FxInput) => f.t * 24;
const mix = (a: XY, b: XY, k: number): XY => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
/** A socket now, or at an earlier frame of this clip; null where the socket does not exist. */
function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, frame) / 24, name);
  } catch {
    return null;
  }
}

/** A soft dust cloud of moonlit soil: a shaded base, a light body and a bright cap. */
function puff(p: Pen, [x, y]: XY, r: number, a: number, palette = soil) {
  if (a <= 0 || r < 0.6) return;
  ellFill(p, [x + r * 0.25, y + r * 0.3], r, r * 0.8, palette[2], a);
  ellFill(p, [x, y], r * 0.86, r * 0.7, palette[3], a);
  ellFill(p, [x - r * 0.3, y - r * 0.3], r * 0.46, r * 0.36, palette[5], a);
}
/** Puffs leaving a point, rising a little, swelling and fading; `drift` pushes them sideways. */
function dustCloud(p: Pen, at: XY, age: number, life: number, count: number, rise: number, spread: number, seed: number, size = 1, drift = 0) {
  for (let i = 0; i < count; i++) {
    const k = (age - i * 1.2) / life;
    if (k < 0 || k > 1) continue;
    const side = (hash(i, seed, 1) - 0.5) * 2;
    const x = at[0] + side * spread * Math.sqrt(k) + drift * k,
      y = at[1] - rise * (0.3 + 0.7 * hash(i, seed, 2)) * Math.sqrt(k);
    puff(p, [x, y], size * (1.4 + 3.4 * k), 0.9 * (1 - k * k));
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
/** One small feather: a shaft and two vanes, turned by `ang`. */
function feather(p: Pen, [x, y]: XY, ang: number, len: number, a: number, palette = brown) {
  if (a <= 0) return;
  const c = Math.cos(ang),
    s = Math.sin(ang);
  for (let i = 0; i <= len; i++) {
    const X = Math.round(x + c * i),
      Y = Math.round(y + s * i);
    const w = i > 0 && i < len ? 1 : 0;
    p.col(palette[i < len * 0.4 ? 1 : 2], a);
    if (w) {
      p.rect(Math.round(X - s), Math.round(Y + c), 1, 1);
      if (i < len - 1) p.rect(Math.round(X + s), Math.round(Y - c), 1, 1);
    }
    p.col(palette[i === len ? 3 : 0], a);
    p.rect(X, Y, 1, 1);
  }
}
/** Feathers and down that leave a point, flutter down with a swing and turn as they fall. */
function feathers(p: Pen, at: XY, age: number, life: number, count: number, seed: number, spread = 14, palettes = [brown, cream]) {
  if (age < 0 || age > life) return;
  const fade = 1 - progress(age, life * 0.65, life);
  for (let i = 0; i < count; i++) {
    const k = age / life;
    const dir = (hash(i, seed, 1) - 0.5) * 2;
    const burst = 1 - Math.exp(-age / 3);
    const x = at[0] + dir * spread * burst + Math.sin(age * 0.35 + i * 2) * 3 * k,
      y = at[1] - (6 + 8 * hash(i, seed, 2)) * burst + age * age * 0.012 * (8 + 6 * hash(i, seed, 3));
    const ang = Math.sin(age * 0.3 + i) * 0.9 + (i % 2 ? 1.2 : 2.0);
    feather(p, [x, y], ang, i % 3 ? 3 : 4, fade, palettes[i % palettes.length]);
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
/** A ring of sparkles opening out from a point. */
function sparkleRing(p: Pen, at: XY, age: number, life: number, n: number, r0: number, r1: number, seed: number) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + seed;
    const r = r0 + (r1 - r0) * Math.sqrt(k);
    sparkle(p, [at[0] + Math.cos(ang) * r, at[1] + Math.sin(ang) * r * 0.8], (i % 2 ? 2.4 : 3.4) * (1 - k * 0.6), 1 - k * k);
  }
}
/** A pixel heart rising and fading. */
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
/** A sleepy «z» of pixel lines. */
function zed(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col('#c8d0f0', a);
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
/** Stars circling round a point (dizzy). */
function dizzy(p: Pen, [x, y]: XY, frame: number, a: number, n = 3) {
  if (a <= 0) return;
  for (let i = 0; i < n; i++) {
    const ang = frame * 0.45 + (i * TAU) / n;
    const sx = x + Math.cos(ang) * 9,
      sy = y + Math.sin(ang) * 3;
    const front = Math.sin(ang) > 0;
    sparkle(p, [sx, sy], front ? 2.6 : 1.8, a * (front ? 1 : 0.7));
  }
}
/** Two short arcs at the beak: a snap. */
function snap(p: Pen, [x, y]: XY, age: number) {
  if (age < 0 || age > 5) return;
  const a = 1 - age / 5,
    r = 3 + age * 1.5;
  p.col('#ffffff', a);
  for (const s of [-1, 1])
    for (let i = -2; i <= 2; i++) {
      const ang = (s > 0 ? 0 : Math.PI) + i * 0.3;
      p.rect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 1, 1);
    }
}
/** Short lines bursting out from a point (alarm, impact). */
function burst(p: Pen, [x, y]: XY, age: number, life: number, n: number, r0: number, color: string, len = 3) {
  if (age < 0 || age > life) return;
  const a = 1 - age / life;
  p.col(color, a);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.45,
      r = r0 + age * 1.5;
    p.line(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), Math.round(x + Math.cos(ang) * (r + len)), Math.round(y + Math.sin(ang) * (r + len)));
  }
}

/** The moth: a pale body, two pairs of wings flapping fast, a soft moonlight glow round it and a sparkling trail. */
function moth(p: Pen, [x, y]: XY, frame: number, a: number, glowP: Pen) {
  if (a <= 0) return;
  // The glow (the one glowing thing of an uncommon creature).
  ellFill(glowP, [x, y], 7, 6, moonGlow[0], a * 0.25);
  ellFill(glowP, [x, y], 4.5, 4, moonGlow[1], a * 0.35);
  const open = Math.floor(frame) % 2 === 0;
  const X = Math.round(x),
    Y = Math.round(y);
  p.col(moonGlow[open ? 1 : 2], a);
  if (open) {
    p.rect(X - 4, Y - 3, 3, 3);
    p.rect(X + 2, Y - 3, 3, 3);
    p.rect(X - 3, Y, 2, 2);
    p.rect(X + 2, Y, 2, 2);
    p.col(moonGlow[3], a);
    p.rect(X - 3, Y - 2, 1, 1);
    p.rect(X + 3, Y - 2, 1, 1);
  } else {
    p.rect(X - 2, Y - 4, 2, 4);
    p.rect(X + 1, Y - 4, 2, 4);
  }
  p.col('#5a4a6a', a);
  p.rect(X, Y - 2, 1, 4);
  p.col('#8a7a9a', a);
  p.rect(X - 1, Y - 3, 1, 1);
  p.rect(X + 1, Y - 3, 1, 1);
}

/** Where the moth is at a frame of «Мотылёк»: keys relative to the home point or to a socket of the owlet. */
const MOTH: { f: number; at: 'home' | 'beak' | 'tuftR' | 'crown'; x: number; y: number }[] = [
  { f: 0, at: 'home', x: 46, y: -74 },
  { f: 4, at: 'home', x: 26, y: -66 },
  { f: 8, at: 'home', x: 20, y: -88 },
  { f: 11, at: 'home', x: 2, y: -96 },
  { f: 14, at: 'home', x: -26, y: -78 },
  { f: 18, at: 'home', x: -14, y: -52 },
  { f: 21, at: 'home', x: 22, y: -56 },
  { f: 27, at: 'home', x: 18, y: -46 },
  { f: 30, at: 'home', x: 20, y: -50 },
  { f: 32, at: 'home', x: 30, y: -84 },
  { f: 36, at: 'home', x: 16, y: -118 },
  { f: 40, at: 'home', x: -4, y: -150 },
  { f: 52, at: 'home', x: -60, y: -140 },
  { f: 58, at: 'home', x: -44, y: -100 },
  { f: 62, at: 'tuftR', x: -6, y: -8 },
  { f: 64, at: 'tuftR', x: 0, y: -1 },
  { f: 77, at: 'tuftR', x: 0, y: -1 },
  { f: 80, at: 'tuftR', x: -8, y: -12 },
  { f: 86, at: 'home', x: -26, y: -104 },
  { f: 94, at: 'home', x: 10, y: -118 },
  { f: 104, at: 'home', x: 70, y: -128 },
];
function mothAt(f: FxInput, frame: number): XY | null {
  const i = MOTH.findIndex((k) => k.f > frame);
  if (i <= 0) return null;
  const resolve = (k: (typeof MOTH)[number]): XY | null => {
    const base = k.at === 'home' ? f.feet : pt(f, k.at);
    return base ? [base[0] + k.x, base[1] + k.y] : null;
  };
  const a = resolve(MOTH[i - 1]),
    b = resolve(MOTH[i]);
  if (!a || !b) return null;
  const u = (frame - MOTH[i - 1].f) / (MOTH[i].f - MOTH[i - 1].f);
  const e = u * u * (3 - 2 * u);
  const perched = MOTH[i - 1].at === 'tuftR' && MOTH[i].at === 'tuftR' && MOTH[i - 1].f >= 64;
  const wob = perched ? 0 : 1;
  return [a[0] + (b[0] - a[0]) * e + Math.sin(frame * 1.3) * 2 * wob, a[1] + (b[1] - a[1]) * e + Math.cos(frame * 1.7) * 2 * wob];
}

/** The pumpkin the owlet pops out of: it rumbles, the lid with its stem flies off, the halves fall apart. */
function pumpkinHatch(p: Pen, [x, y]: XY, frame: number, pop: number) {
  const fade = 1 - progress(frame, pop + 20, pop + 28);
  if (fade <= 0) return;
  const shake = frame < pop ? Math.round(Math.sin(frame * 3.3) * (0.5 + (frame / pop) * 1.6)) : 0;
  const rx = 20,
    ry = 15;
  const opened = frame >= pop;
  const apart = opened ? progress(frame, pop, pop + 8) : 0;
  const fall = opened ? progress(frame, pop, pop + 10) : 0;
  // Lower body: whole before the pop, two halves leaning apart after it.
  for (const side of opened ? [-1, 1] : [0]) {
    const ox = side * (2 + apart * 9),
      tilt = side * apart * 0.5,
      sink = fall * 3;
    for (let row = -ry; row <= ry; row++) {
      const v = row / ry;
      if (opened && row < -ry * 0.35) continue;
      const half = rx * Math.sqrt(Math.max(0, 1 - v * v)) * (1 + 0.05 * Math.cos(row));
      const y0 = Math.round(y - ry + row + sink * (row > 0 ? 0.5 : 1));
      const x0 = side < 0 ? -half : side > 0 ? 0 : -half;
      const len = side === 0 ? half * 2 : half;
      for (let i = 0; i < Math.round(len); i++) {
        const px = x0 + i;
        const u = px / rx;
        const rib = Math.cos(Math.asin(Math.max(-1, Math.min(1, u))) * 5);
        const lit = -0.6 * u - 0.7 * v + 0.35 * rib;
        const k = Math.max(0, Math.min(5, Math.round(2.4 + lit * 1.6 - (u * u + v * v > 0.85 ? 0.9 : 0))));
        p.col(pump[k], fade);
        p.rect(Math.round(x + px + ox + shake + tilt * (row + ry)), y0, 1, 1);
      }
    }
    // The cut rim, pale inside.
    if (opened) {
      p.col('#ffd080', fade);
      const rimY = Math.round(y - ry * 1.35 + sink);
      for (let i = 0; i < rx; i++) p.rect(Math.round(x + (side < 0 ? -rx + i : i) + ox + tilt * ry * 0.6), rimY + (i % 3 === 0 ? 1 : 0), 1, 1);
    }
  }
  if (!opened) {
    // Cracks of light spreading and the stem on top, the lid lifting a pixel just before the pop.
    const lidUp = frame > pop - 3 ? frame - (pop - 3) : 0;
    p.col('#ffe48a', fade);
    for (let i = 0; i < Math.floor((frame / pop) * 8); i++) p.rect(Math.round(x - rx * 0.8 + i * 3 + shake), Math.round(y - ry * 1.4 - lidUp + (i % 2)), 2, 1);
    p.col(stem[1], fade);
    p.rect(Math.round(x - 1 + shake), Math.round(y - ry * 2 - 3 - lidUp), 2, 4);
    p.col(stem[2], fade);
    p.rect(Math.round(x + 1 + shake), Math.round(y - ry * 2 - 2 - lidUp), 2, 1);
  } else {
    // The lid flies up and away, turning.
    const age = frame - pop;
    const lx = x + age * 2.6,
      ly = y - ry * 2 - age * 5 + age * age * 0.35;
    if (age < 24) {
      const w = Math.round(9 * Math.abs(Math.cos(age * 0.5)) + 2);
      p.col(pump[3], fade);
      p.rect(Math.round(lx - w / 2), Math.round(ly), w, 3);
      p.col(pump[5], fade);
      p.rect(Math.round(lx - w / 2), Math.round(ly), w, 1);
      p.col(stem[1], fade);
      p.rect(Math.round(lx), Math.round(ly - 3), 2, 3);
    }
  }
}

export function owletEffects(f: FxInput) {
  const frame = frameOf(f);
  const home = f.feet;
  switch (f.anim) {
    case 'trick': {
      const b = beats.trick;
      bang(f.above, [home[0] + 2, home[1] - 92], frame - b.notice, 14);
      // The moth all through, with a twinkling trail of moon dust while it flies.
      const m = mothAt(f, frame);
      if (m && frame < 106) {
        for (let k = 1; k <= 4; k++) {
          const back = mothAt(f, frame - k * 1.5);
          if (back && (frame < 62 || frame > 80)) {
            f.above.col(moonGlow[k < 3 ? 2 : 1], 0.7 - k * 0.15);
            f.above.rect(Math.round(back[0] + (k % 2)), Math.round(back[1] + 2), 1, 1);
          }
        }
        moth(f.above, m, frame, frame > 98 ? 1 - progress(frame, 98, 106) : 1, f.above);
      }
      // Wiggle dust under the feet, the pounce, the snap at the empty air.
      dustCloud(f.under, home, frame - b.wiggle, 8, 3, 2, 6, 31, 0.6);
      dustCloud(f.under, home, frame - b.pounce, 12, 5, 4, 12, 32, 0.9, 6);
      const beak = pt(f, 'beak', b.snap);
      if (beak) snap(f.above, beak, frame - b.snap);
      // Feathers left behind on the way up and the landing.
      const body = pt(f, 'body', b.pounce + 6);
      if (body) feathers(f.above, body, frame - b.pounce - 6, 28, 4, 33, 10);
      dustCloud(f.under, home, frame - b.land, 12, 6, 4, 16, 34, 1);
      // The thump on its bottom: dust and little stars, then the goodbye heart.
      dustCloud(f.under, home, frame - b.thump, 12, 6, 3, 18, 35, 1);
      const crown = pt(f, 'crown');
      if (crown && frame >= b.thump && frame < b.thump + 12) dizzy(f.above, [crown[0], crown[1] - 4], frame, 1 - progress(frame, b.thump + 8, b.thump + 12));
      if (frame >= b.wave + 2 && frame < b.wave + 16) {
        const wing = pt(f, 'wingR');
        if (wing) heart(f.above, [wing[0] - 4, wing[1] - 8 - (frame - b.wave) * 0.8], 2, 1 - progress(frame, b.wave + 10, b.wave + 16));
      }
      dustCloud(f.under, home, frame - b.hop - 3, 8, 3, 2, 8, 36, 0.7);
      break;
    }
    case 'trick_b': {
      const b = beats.trick_b;
      // Take-off: a ring of dust and loose feathers.
      dustCloud(f.under, home, frame - b.takeoff, 14, 7, 4, 20, 41, 1.1);
      feathers(f.above, [home[0], home[1] - 30], frame - b.takeoff, 26, 5, 42, 14);
      // Wind streaks along the loop: lines through the body's recent positions.
      if (frame >= b.loop - 2 && frame <= b.loopEnd + 2)
        for (let k = 1; k <= 5; k++) {
          const a = pt(f, 'body', frame - k),
            c = pt(f, 'body', frame - k - 1);
          if (!a || !c) continue;
          f.above.col(k < 3 ? '#e8ecff' : '#9aa8d8', 0.85 - k * 0.14);
          for (const off of [-9, 9]) f.above.line(Math.round(a[0] + off * 0.3), Math.round(a[1] + off), Math.round(c[0] + off * 0.3), Math.round(c[1] + off));
        }
      // The swoop at the viewer: speed lines rushing out from the middle of the picture.
      if (frame >= b.swoop - 3 && frame <= b.swoop + 5) {
        const a = 1 - progress(frame, b.swoop + 2, b.swoop + 5);
        const c: XY = [home[0], home[1] - 40];
        f.above.col('#e8ecff', a * 0.8);
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * TAU + 0.3,
            r0 = 34 + ((frame * 6 + i * 7) % 18);
          f.above.line(Math.round(c[0] + Math.cos(ang) * r0), Math.round(c[1] + Math.sin(ang) * r0), Math.round(c[0] + Math.cos(ang) * (r0 + 8)), Math.round(c[1] + Math.sin(ang) * (r0 + 8)));
        }
      }
      // Landing, the stumbling hops, dizzy stars, the «ta-da» sparkle ring.
      dustCloud(f.under, home, frame - b.land, 12, 6, 4, 16, 43, 1);
      const g1 = pt(f, 'floor', b.hop1 + 2),
        g2 = pt(f, 'floor', b.hop2 + 2);
      if (g1) dustCloud(f.under, g1, frame - b.hop1 - 2, 8, 3, 2, 8, 44, 0.7);
      if (g2) dustCloud(f.under, g2, frame - b.hop2 - 2, 8, 3, 2, 8, 45, 0.7);
      const crown = pt(f, 'crown');
      if (crown && frame >= b.dizzy && frame < b.dizzy + 12) dizzy(f.above, [crown[0], crown[1] - 4], frame, 1 - progress(frame, b.dizzy + 9, b.dizzy + 12));
      const body = pt(f, 'body', b.tada);
      if (body) sparkleRing(f.above, body, frame - b.tada, 12, 8, 14, 34, 0.4);
      break;
    }
    case 'hatch': {
      const b = beats.hatch;
      pumpkinHatch(frame < b.pop ? f.above : f.under, home, frame, b.pop);
      // Seeds and pulp at the pop, a puff of moonlit dust, feathers; the landing.
      spray(f.above, [home[0], home[1] - 24], frame - b.pop, 16, 16, 70, ['#5a2a10', '#f8e8b0', '#ffb452', '#fff6d8'], 51, -0.7, 120);
      dustCloud(f.under, home, frame - b.pop, 14, 6, 4, 18, 52, 1.1);
      feathers(f.above, [home[0], home[1] - 34], frame - b.pop - 1, 26, 4, 53, 12, [cream, brown]);
      dustCloud(f.under, home, frame - b.land, 12, 5, 3, 14, 54, 0.9);
      const body = pt(f, 'body', b.shake);
      if (body) {
        spray(f.above, body, frame - b.shake, 12, 10, 50, ['#7a3014', '#d8661e', '#f08c2c', '#ffb452'], 55, -0.3, 80, 1.6);
        feathers(f.above, body, frame - b.shake, 22, 3, 56, 12, [cream]);
      }
      if (frame >= 38 && frame < 48) {
        const head = pt(f, 'head');
        if (head) sparkle(f.above, [head[0] + 14, head[1] - 10], 3 - (frame - 38) * 0.25, 1 - progress(frame, 44, 48));
      }
      break;
    }
    case 'happy': {
      const b = beats.happy;
      dustCloud(f.under, home, frame - b.jump, 10, 4, 3, 12, 61, 0.8);
      const body = pt(f, 'body', b.puff);
      if (body) {
        feathers(f.above, body, frame - b.puff, 24, 5, 62, 14, [cream, cream, brown]);
        sparkleRing(f.above, body, frame - b.puff, 12, 6, 12, 26, 0.2);
      }
      dustCloud(f.under, home, frame - b.land, 10, 5, 3, 14, 63, 0.9);
      if (frame >= b.dance && frame < 42) {
        const head = pt(f, 'head');
        if (head) heart(f.above, [head[0] + 12, head[1] - 14 - (frame - b.dance) * 0.7], 2, 1 - progress(frame, 36, 42));
      }
      break;
    }
    case 'fidget_a': {
      const b = beats.fidget_a;
      // Nibbles: tiny white marks at the beak; the shake throws off down; a sparkle for the proud pose.
      for (const nib of [7, 11, 15]) {
        const beak = pt(f, 'beak', nib);
        if (beak && frame >= nib && frame < nib + 2) {
          f.above.col('#ffffff', 1);
          f.above.rect(Math.round(beak[0]) + 2, Math.round(beak[1]) - 1, 1, 1);
          f.above.rect(Math.round(beak[0]) - 2, Math.round(beak[1]) + 1, 1, 1);
        }
      }
      const body = pt(f, 'body', b.shake);
      if (body) feathers(f.above, body, frame - b.shake, 26, 6, 71, 16, [cream, brown, cream]);
      const head = pt(f, 'head', b.proud);
      if (head) sparkle(f.above, [head[0] - 12, head[1] - 6], 3.2 * (1 - progress(frame, b.proud + 4, b.proud + 10)), frame >= b.proud && frame < b.proud + 10 ? 1 : 0);
      break;
    }
    case 'fidget_b': {
      const b = beats.fidget_b;
      const crown = pt(f, 'crown');
      if (crown) {
        // A little «?» of lines when it hears, swirl lines round the spinning head, stars while dizzy.
        if (frame >= b.hear && frame < b.spin + 2) burst(f.above, [crown[0] + 8, crown[1] - 2], frame - b.hear, 7, 3, 3, '#ffe48a');
        if (frame >= b.spin && frame < b.dizzy) {
          f.above.col('#e8ecff', 0.8);
          for (let i = 0; i < 3; i++) {
            const ang = frame * 0.9 + (i * TAU) / 3;
            for (let k = 0; k < 4; k++) {
              const a2 = ang - k * 0.18;
              f.above.rect(Math.round(crown[0] + Math.cos(a2) * 14), Math.round(crown[1] + 10 + Math.sin(a2) * 4), 1, 1);
            }
          }
        }
        if (frame >= b.dizzy && frame < b.shake + 2) dizzy(f.above, [crown[0], crown[1] - 4], frame, 1 - progress(frame, b.shake - 2, b.shake + 2));
      }
      break;
    }
    case 'wake_startled': {
      const b = beats.wake_startled;
      const crown = pt(f, 'crown', b.jolt);
      if (crown) burst(f.above, [crown[0], crown[1] - 4], frame - b.jolt, 8, 5, 4, '#ffffff', 4);
      const body = pt(f, 'body', b.threat);
      if (body) feathers(f.above, body, frame - b.threat, 14, 4, 81, 18, [cream, brown]);
      break;
    }
    case 'sleep_in': {
      const beak = pt(f, 'beak');
      if (beak && frame >= beats.sleep_in.yawn && frame < 14) {
        const a = 1 - progress(frame, 11, 14);
        oval(f.above, [beak[0] + 9, beak[1] - 4], 2.5, 2.5, '#e8ecff', a * 0.8);
      }
      const crown = pt(f, 'crown');
      if (crown && frame > 24) zed(f.above, [crown[0] + 8, crown[1] - 2], 2, progress(frame, 24, 30));
      break;
    }
    case 'sleep': {
      const crown = pt(f, 'crown');
      if (!crown) break;
      for (let i = 0; i < 3; i++) {
        const k = ((frame / 72 + i / 3) % 1 + 1) % 1;
        zed(f.above, [crown[0] + 8 + k * 10 + Math.sin(k * 6) * 2, crown[1] - 2 - k * 18], 2 + Math.round(k * 2), Math.sin(k * Math.PI));
      }
      break;
    }
    case 'sleep_out': {
      const crown = pt(f, 'crown');
      if (crown && frame < 6) zed(f.above, [crown[0] + 12, crown[1] - 10], 3, 1 - frame / 6);
      const body = pt(f, 'body', 25);
      if (body) feathers(f.above, body, frame - 25, 10, 2, 91, 10, [cream]);
      break;
    }
  }
  void mix;
}
