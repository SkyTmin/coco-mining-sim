// Effects of Ирис. The rainbow is its own: it pours from the fan in «Радужная горка» and it slides down it into the
// pool — splash, rings on the water, droplets when it shakes. «Колесо»: rainbow trails round the spinning hoop, sparks
// flung off it, dizzy stars. «Сердечко»: a glowing heart outline that beats with it, little hearts, the kiss. «Пружинка»:
// a whoosh up out of the picture, a spiral of sparkles on the way down, dust on landing. The egg of the hatch, a loose
// feather after preening, shimmer on the fan's eyes, sleepy «z», «!». Timelines read the beats of the pose book;
// positions read the serpent's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { disc, fillPoly, flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, BELLY, slideAt, slideSize, SPLASH } from './prism_serpent-poses';

const RAINBOW = ['#e8423c', '#f4922c', '#f8d23c', '#5cc85a', '#3e8ef0', '#8a5ad8'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];
const pink = ['#a03a56', '#e06a88', '#ffb0c4', '#fff0f4'];
const water = ['#2a6a8a', '#5aaed0', '#a8e2f4', '#ffffff'];
const prism = ['#6a4ac8', '#8ac8ff', '#e8fbff', '#ffffff'];
const shell = ['#7a6a4a', '#d8ccb0', '#f4eedc', '#fffdf4'];
const spots = ['#3a8a6a', '#66d09a', '#b4e2ff'];
const soil = ['#2a3a16', '#3e5420', '#5e7a34', '#7e9a48', '#a4bc6e', '#d4e0a8'];

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
/** A soft dust cloud of the meadow. */
function dustCloud(p: Pen, at: XY, age: number, life: number, count: number, rise: number, spread: number, seed: number, size = 1) {
  for (let i = 0; i < count; i++) {
    const k = (age - i * 1.2) / life;
    if (k < 0 || k > 1) continue;
    const side = (hash(i, seed, 1) - 0.5) * 2;
    const x = at[0] + side * spread * Math.sqrt(k),
      y = at[1] - rise * (0.3 + 0.7 * hash(i, seed, 2)) * Math.sqrt(k);
    const r = size * (1.2 + 3 * k),
      a = 0.85 * (1 - k * k);
    ellFill(p, [x + r * 0.25, y + r * 0.3], r, r * 0.8, soil[2], a);
    ellFill(p, [x, y], r * 0.86, r * 0.7, soil[3], a);
    ellFill(p, [x - r * 0.3, y - r * 0.3], r * 0.46, r * 0.36, soil[5], a);
  }
}
function heart(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  const rows =
    s > 2
      ? ['.###...###.', '#####.#####', '###########', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....']
      : s > 1
        ? ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']
        : ['##.##', '#####', '.###.', '..#..'];
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== '#') return;
      p.col(j === 1 && i === 1 ? pink[3] : j < 2 ? pink[2] : j < rows.length - 2 ? pink[1] : pink[0], a);
      p.rect(X - (row.length >> 1) + i, Y + j, 1, 1);
    }),
  );
}
function hearts(p: Pen, at: XY, age: number, life: number, n: number, spread = 7) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const k = (age - i * 4) / (life - (n - 1) * 4);
    if (k < 0 || k > 1) continue;
    heart(p, [at[0] + (i % 2 ? spread + 1 : -spread) + Math.sin(k * 7 + i) * 2, at[1] - k * 18], k < 0.2 ? 1 : 2, 1 - progress(k, 0.7, 1));
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
/** Short lines bursting out round a point (alarm, launch). */
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

// ---- the rainbow, water ----------------------------------------------------------------------------------------------
/** A rainbow ribbon along a path: six two-pixel bands below it, drawn from the start up to `grow`, faint outer glow. */
function rainbowAlong(p: Pen, path: (u: number) => XY, grow: number, a: number, from = 0) {
  if (a <= 0 || grow <= from) return;
  const steps = 90;
  for (let i = Math.floor(from * steps); i <= Math.round(grow * steps); i++) {
    const u = i / steps;
    const [x, y] = path(u);
    const [x2, y2] = path(Math.min(1, u + 0.01));
    const d = Math.hypot(x2 - x, y2 - y) || 1;
    // The normal pointing down-ish (below the path).
    let nx = -(y2 - y) / d,
      ny = (x2 - x) / d;
    if (ny < 0) (nx = -nx), (ny = -ny);
    for (let b = 0; b < RAINBOW.length; b++) {
      p.col(RAINBOW[b], a * 0.92);
      for (const o of [0, 1, 2]) p.rect(Math.round(x + nx * (b * 3 + o)), Math.round(y + ny * (b * 3 + o)), 1, 1);
    }
    p.col('#ffffff', a * 0.35);
    p.rect(Math.round(x - nx), Math.round(y - ny), 1, 1);
  }
  // A glint runs at the growing tip.
  if (grow < 1) {
    const g = path(grow);
    sparkle(p, g, 3.2, a, prism);
  }
}
/** Rings spreading on the pool. */
function ripples(p: Pen, at: XY, age: number, life: number, n: number) {
  for (let i = 0; i < n; i++) {
    const k = (age - i * 4) / life;
    if (k < 0 || k > 1) continue;
    oval(p, at, 4 + 18 * k, (4 + 18 * k) * 0.3, water[2], 0.9 * (1 - k));
  }
}
/** A splash: a white column falling back as droplets, foam on the water. */
function splash(p: Pen, at: XY, age: number) {
  if (age < 0 || age > 30) return;
  const col = 1 - progress(age, 2, 10);
  if (col > 0) {
    ellFill(p, [at[0], at[1] - 8 * (1 - col)], 7 * col + 2, 12 * col, water[2], 0.8 * col);
    ellFill(p, [at[0], at[1] - 10 * (1 - col)], 4 * col + 1, 8 * col, water[3], 0.9 * col);
  }
  spray(p, [at[0], at[1] - 4], age, 24, 26, 70, water, 211, -0.7, 120, 1.1);
  ellFill(p, at, 10 * (1 - progress(age, 12, 30)) + 2, 3, water[3], 0.8 * (1 - progress(age, 10, 30)));
}

// ---- the egg ---------------------------------------------------------------------------------------------------------
function egg(f: FxInput, frame: number) {
  const B = beats.hatch;
  const base: XY = [f.feet[0] - 2, f.feet[1] - 2];
  const c: XY = [base[0], base[1] - 21];
  if (frame < B.burst) {
    const rock = frame < B.crack ? Math.sin(frame * 0.7) * 0.7 : Math.sin(frame * 2.6) * 1.6;
    const x = c[0] + Math.round(rock);
    ellFill(f.under, [base[0], base[1] + 1], 18, 4.5, '#000000', 0.3);
    // A big speckled egg, cream with emerald and sky spots, lit from the upper left.
    ellFill(f.above, [x, c[1]], 17, 21, shell[0], 1);
    ellFill(f.above, [x, c[1]], 16, 20, shell[1], 1);
    ellFill(f.above, [x - 3, c[1] - 3], 11, 14, shell[2], 1);
    ellFill(f.above, [x - 6, c[1] - 9], 4, 5, shell[3], 1);
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 7, 1) * TAU,
        r = 4 + 11 * hash(i, 7, 2);
      f.above.col(spots[i % 3], 1);
      const sx = Math.round(x + Math.cos(a) * r * 0.75),
        sy = Math.round(c[1] + Math.sin(a) * r);
      f.above.rect(sx, sy, i % 2 ? 3 : 2, 2 + (i % 2));
    }
    if (frame >= B.crack) {
      const k = progress(frame, B.crack, B.burst - 1);
      f.above.col('#3a2a1a', 1);
      let [px, py] = [x - 14, c[1] - 2];
      for (let s = 1; s <= Math.round(9 * k); s++) {
        const nx = x - 14 + s * 3.1,
          ny = c[1] - 2 + (s % 2 ? -2 : 1);
        f.above.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny));
        [px, py] = [nx, ny];
      }
      if (frame % 4 < 2) sparkle(f.above, [x + 9, c[1] - 13], 2, 0.8, prism);
    }
    return;
  }
  const age = frame - B.burst;
  // Shell chips fly; the bottom half stays round the hatchling for a while.
  spray(f.above, [c[0], c[1] - 4], age, 22, 14, 80, shell, 301, -0.7, 110, 1.4);
  sparkleRing(f.above, [c[0], c[1] - 6], age, 14, 8, 10, 26, 0.4, prism);
  const fade = 1 - progress(frame, B.unfurl - 2, B.unfurl + 6);
  if (fade > 0) {
    const y = base[1] - 5;
    f.above.col(shell[0], fade);
    for (let i = -16; i <= 16; i++) {
      const h = Math.round(6 + Math.sqrt(Math.max(0, 256 - i * i)) * 0.3 + (i % 3 === 0 ? -2 : 0));
      f.above.rect(base[0] + i, y - h + 6, 1, h);
    }
    f.above.col(shell[1], fade);
    for (let i = -15; i <= 15; i++) {
      const h = Math.round(5 + Math.sqrt(Math.max(0, 225 - i * i)) * 0.27 + (i % 3 === 0 ? -2 : 0));
      f.above.rect(base[0] + i, y - h + 6, 1, h - 1);
    }
    f.above.col(spots[1], fade);
    f.above.rect(base[0] - 8, y + 2, 2, 2);
    f.above.rect(base[0] + 6, y + 3, 2, 1);
    f.above.rect(base[0] - 1, y + 4, 1, 1);
  }
}

/** The hoop's middle (between the head, the root and the tail). */
function hoopCentre(f: FxInput): XY | null {
  const names = ['head', 'chest', 'neck', 'tailMid', 'body'];
  const ps = names.map((n) => pt(f, n)).filter((v): v is XY => !!v);
  if (!ps.length) return null;
  return [ps.reduce((a, q) => a + q[0], 0) / ps.length, ps.reduce((a, q) => a + q[1], 0) / ps.length];
}

export function serpentEffects(f: FxInput) {
  const frame = frameOf(f);
  const home = f.feet;
  switch (f.anim) {
    case 'trick': {
      const b = beats.trick;
      const path = (u: number): XY => {
        const [dx, dy] = slideAt(u);
        return [home[0] + dx, home[1] + dy - BELLY * slideSize(u) + 2];
      };
      const pool: XY = [home[0] + SPLASH.dx, home[1] + SPLASH.dy + 2];
      // Sparkles stream from the fan while the rainbow grows from under the serpent to the pool.
      const grow = progress(frame, b.rainbow + 2, b.hop - 2);
      const fadeOut = 1 - progress(frame, b.pop + 2, b.home + 6);
      rainbowAlong(f.under, path, grow, fadeOut);
      const fan = pt(f, 'fan');
      if (fan && frame >= b.rainbow && frame < b.hop)
        for (let i = 0; i < 4; i++) {
          const k = ((frame - b.rainbow) / 10 + i / 4) % 1;
          const to = path(Math.max(0.02, grow * 0.3));
          sparkle(f.above, [fan[0] + (to[0] - fan[0]) * k, fan[1] + (to[1] - fan[1]) * k + Math.sin(k * 6 + i) * 3], 2.2 * (1 - k) + 0.6, 1, prism);
        }
      // Wind of the slide, then the splash in the pool, rings and droplets.
      if (frame >= b.slide && frame < b.splash) {
        const body = pt(f, 'chest');
        if (body)
          for (let i = 0; i < 3; i++) {
            f.above.col('#ffffff', 0.7 - i * 0.2);
            f.above.line(Math.round(body[0] + 10 + i * 4), Math.round(body[1] - 6 + i * 5), Math.round(body[0] + 18 + i * 4), Math.round(body[1] - 8 + i * 5));
          }
      }
      splash(f.above, pool, frame - b.splash);
      ripples(f.under, pool, frame - b.splash, 30, 3);
      const body = pt(f, 'body');
      if (body) spray(f.above, [body[0], body[1] - 6], frame - b.shake, 14, 16, 60, water, 221, -0.3, 80, 1.6);
      ripples(f.under, pool, frame - b.pop, 20, 2);
      dustCloud(f.under, home, frame - b.land, 12, 4, 3, 10, 231, 0.8);
      const crown = pt(f, 'crown');
      if (crown && frame >= b.proud && frame < b.proud + 8) sparkle(f.above, [crown[0] + 8, crown[1] + 4], 3 * (1 - (frame - b.proud) / 8) + 0.5, 1, gold);
      break;
    }
    case 'trick_b': {
      const b = beats.trick_b;
      const c = hoopCentre(f);
      if (c && frame >= b.roll && frame < b.stop) {
        // Rainbow trails chase round the spinning hoop; sparks fly off the rim.
        const speed = frame < b.fast ? 1 : frame < b.faster ? 2 : 3;
        const ang = frame < b.fast ? ((frame - b.roll) / (b.fast - b.roll)) * TAU : frame < b.faster ? TAU + ((frame - b.fast) / (b.faster - b.fast)) * TAU : 2 * TAU + ((frame - b.faster) / (b.stop - b.faster)) * TAU;
        const R = 30;
        for (let band = 0; band < RAINBOW.length; band++) {
          const r = R + band * 1.6;
          oval(f.under, c, r, r * 0.92, RAINBOW[band], 0.5 + 0.15 * speed, ang + Math.PI * 0.6, ang + Math.PI * (0.6 + 0.25 * speed));
          oval(f.under, c, r, r * 0.92, RAINBOW[band], 0.5 + 0.15 * speed, ang + Math.PI * 1.6, ang + Math.PI * (1.6 + 0.25 * speed));
        }
        for (let i = 0; i < 2 * speed; i++) {
          const k = ((frame * 0.6 + i * 3.7) % 6) / 6;
          const a0 = ang + i * 2.1;
          sparkle(f.above, [c[0] + Math.cos(a0) * (R + 6 + k * 14), c[1] + Math.sin(a0) * (R + 6 + k * 14) * 0.92], 2.4 * (1 - k) + 0.4, 1, prism);
        }
      }
      // Dizzy stars round the head.
      const crown = pt(f, 'crown') ?? pt(f, 'head');
      if (crown && frame >= b.dizzy && frame < b.shake + 4) {
        const fade = 1 - progress(frame, b.shake - 2, b.shake + 4);
        for (let i = 0; i < 3; i++) {
          const a = frame * 0.35 + (i * TAU) / 3;
          sparkle(f.above, [crown[0] - 6 + Math.cos(a) * 9, crown[1] + 6 + Math.sin(a) * 3], 2.2, fade, gold);
        }
      }
      const head = pt(f, 'head');
      if (head) hearts(f.above, [head[0], head[1] - 14], frame - b.grab - 6, 12, 1);
      if (crown && frame >= b.proud && frame < b.proud + 8) sparkle(f.above, [crown[0] + 8, crown[1] + 4], 3 * (1 - (frame - b.proud) / 8) + 0.5, 1, gold);
      break;
    }
    case 'trick_c': {
      const b = beats.trick_c;
      const c = hoopCentre(f);
      const on = progress(frame, b.heart - 6, b.heart) * (1 - progress(frame, b.open - 2, b.open + 8));
      if (c && on > 0) {
        // A big glowing heart behind the body, beating with it: a soft pink fill, a bright rim, a light edge on top.
        const beat = Math.max(0, 1 - Math.abs(frame - b.beat1) / 3) + Math.max(0, 1 - Math.abs(frame - b.beat2) / 3);
        const s = 2.45 + 0.25 * beat;
        const outline: XY[] = [];
        for (let i = 0; i < 72; i++) {
          const t = (i / 72) * TAU;
          const x = 16 * Math.sin(t) ** 3,
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          outline.push([c[0] + x * s, c[1] + 4 - y * s]);
        }
        f.under.col(pink[1], 0.32 * on);
        fillPoly(f.under, outline.flat());
        const inner = outline.map(([x, y]) => [c[0] + (x - c[0]) * 0.8, c[1] + 4 + (y - c[1] - 4) * 0.8] as XY);
        f.under.col(pink[2], 0.22 * on);
        fillPoly(f.under, inner.flat());
        for (let i = 0; i < outline.length; i++) {
          const p0 = outline[i],
            p1 = outline[(i + 1) % outline.length];
          f.under.col(pink[0], 0.9 * on);
          f.under.line(Math.round(p0[0]), Math.round(p0[1]) + 1, Math.round(p1[0]), Math.round(p1[1]) + 1);
          f.under.col(pink[2], on);
          f.under.line(Math.round(p0[0]), Math.round(p0[1]), Math.round(p1[0]), Math.round(p1[1]));
        }
        for (let i = 0; i < 4; i++) {
          const k = ((frame / 30 + i / 4) % 1 + 1) % 1;
          const t = (i * 0.9 + frame * 0.05) % TAU;
          sparkle(f.above, [c[0] + 16 * Math.sin(t) ** 3 * s, c[1] + 4 - (13 * Math.cos(t) - 5 * Math.cos(2 * t)) * s], 2 * (1 - k) + 0.6, on, pink);
        }
        hearts(f.above, [c[0], c[1] - 40], frame - b.heart, b.open - b.heart, 5, 30);
      }
      // The kiss: a heart pops from its mouth and grows toward us.
      const mouth = pt(f, 'mouth', b.kiss);
      if (mouth && frame >= b.kiss && frame < b.kiss + 18) {
        const k = (frame - b.kiss) / 18;
        heart(f.above, [mouth[0] + 6 + k * 10, mouth[1] - 4 - k * 14], k < 0.25 ? 1 : k < 0.6 ? 2 : 3, 1 - progress(k, 0.7, 1));
      }
      const crown = pt(f, 'crown');
      if (crown && frame >= b.joy && frame < b.joy + 8) sparkle(f.above, [crown[0] + 6, crown[1] + 6], 3 * (1 - (frame - b.joy) / 8) + 0.5, 1, pink);
      break;
    }
    case 'trick_d': {
      const b = beats.trick_d;
      // Coiling: a few bits of grass stir; the launch: dust ring and whoosh lines; the way down: a spiral of sparkles.
      dustCloud(f.under, home, frame - b.launch, 12, 6, 4, 16, 401, 1);
      burst(f.above, [home[0], home[1] - 6], frame - b.launch, 8, 7, 8, '#ffffff', 5, 0.42, -Math.PI / 2);
      if (frame >= b.launch && frame < b.top + 4)
        for (let i = 0; i < 4; i++) {
          const x = home[0] - 12 + i * 8,
            y = home[1] - 30 - (frame - b.launch) * 14 + i * 6;
          f.above.col('#ffffff', 0.6);
          f.above.line(x, Math.round(y), x, Math.round(y + 14));
        }
      // Out of the picture for a moment: a star twinkles where it went.
      if (frame >= b.top && frame < b.fall + 2) sparkle(f.above, [home[0] + 2, 10], 4 * Math.sin(((frame - b.top) / (b.fall + 2 - b.top)) * Math.PI) + 0.5, 1, prism);
      const fan = pt(f, 'fan');
      if (fan && frame >= b.fall && frame < b.land)
        for (let i = 0; i < 6; i++) {
          const k = (i / 6 + frame / 18) % 1;
          const a = frame * 0.5 + i * 1.05;
          sparkle(f.above, [fan[0] + Math.cos(a) * (8 + 8 * k), fan[1] + 6 + k * 16], 2 * (1 - k) + 0.5, 1 - k * 0.6, prism);
        }
      dustCloud(f.under, home, frame - b.land, 12, 5, 3, 12, 403, 0.9);
      sparkleRing(f.above, [home[0], home[1] - 30], frame - b.land, 12, 6, 12, 30, 0.2, prism);
      break;
    }
    case 'fidget_a': {
      const b = beats.fidget_a;
      // One sapphire feather comes loose in the shake and rocks down to the grass.
      const age = frame - b.shake;
      const start = pt(f, 'chest', b.shake);
      if (start && age >= 0) {
        const k = Math.min(1, age / 22);
        const x = start[0] - 10 - 10 * k + Math.sin(age * 0.45) * 5,
          y = start[1] - 10 + (home[1] - start[1] + 6) * k;
        const tilt = Math.sin(age * 0.45);
        const a = 1 - progress(age, 18, 23);
        f.above.col('#2a2a8a', a);
        f.above.line(Math.round(x - 3), Math.round(y - tilt * 2), Math.round(x + 3), Math.round(y + tilt * 2));
        f.above.col('#6ab8f4', a);
        f.above.line(Math.round(x - 2), Math.round(y - 1 - tilt * 2), Math.round(x + 2), Math.round(y - 1 + tilt * 2));
        f.above.col('#9a4ec8', a);
        f.above.rect(Math.round(x + 3), Math.round(y + tilt * 2), 1, 1);
      }
      const body = pt(f, 'body');
      if (body) sparkleRing(f.above, [body[0], body[1] - 10], frame - b.shake, 10, 6, 10, 24, 0.5, prism);
      break;
    }
    case 'fidget_b': {
      const b = beats.fidget_b;
      const crown = pt(f, 'crown', b.notice);
      if (crown) bang(f.above, [crown[0] + 8, crown[1] - 2], frame - b.notice, 14);
      const fan = pt(f, 'fan');
      if (fan && frame >= b.notice && frame < b.snap) sparkle(f.above, [fan[0], fan[1] - 4], 1.6 + Math.sin(frame * 0.8), 0.8, prism);
      const head = pt(f, 'head', b.got);
      if (head) hearts(f.above, [head[0], head[1] - 12], frame - b.got, 18, 2);
      break;
    }
    case 'fidget_c': {
      const b = beats.fidget_c;
      const fan = pt(f, 'fan');
      if (fan && frame >= b.open + 4 && frame < b.fold)
        for (let i = 0; i < 5; i++) {
          const tw = (frame + i * 5) % 12;
          if (tw > 6) continue;
          const a = -Math.PI / 2 + (i - 2) * 0.55;
          sparkle(f.above, [fan[0] + Math.cos(a) * 9, fan[1] + Math.sin(a) * 9 + 6], 2.6 * (1 - tw / 6) + 0.5, 1, prism);
        }
      break;
    }
    case 'happy': {
      const b = beats.happy;
      const body = pt(f, 'chest');
      if (body && frame >= b.roll && frame < b.top + 4)
        for (let i = 0; i < 5; i++) {
          const k = i / 5;
          const at = pt(f, 'chest', frame - i * 2);
          if (at) sparkle(f.under, [at[0] - 6 + 4 * Math.sin(frame + i), at[1] - 6], 2.4 * (1 - k) + 0.4, 1 - k, prism);
        }
      const crown = pt(f, 'crown');
      if (crown) hearts(f.above, [crown[0] + 4, crown[1] + 2], frame - b.top, 14, 2);
      dustCloud(f.under, home, frame - b.land, 10, 3, 2, 8, 501, 0.6);
      break;
    }
    case 'hatch':
      egg(f, frame);
      break;
    case 'sleep': {
      const head = pt(f, 'head');
      if (head)
        for (let i = 0; i < 3; i++) {
          const k = ((frame / 72 + i / 3) % 1 + 1) % 1;
          zed(f.above, [head[0] + 8 + k * 10, head[1] - 10 - k * 18], 2 + k * 2.5, Math.sin(k * Math.PI));
        }
      break;
    }
    case 'sleep_in': {
      const head = pt(f, 'head');
      if (head && frame >= beats.sleep_in.close) zed(f.above, [head[0] + 8, head[1] - 10], 2, progress(frame, beats.sleep_in.close, beats.sleep_in.close + 4));
      break;
    }
    case 'sleep_out': {
      const b = beats.sleep_out;
      const crown = pt(f, 'crown', b.stretch);
      if (crown) sparkleRing(f.above, [crown[0], crown[1] + 10], frame - b.stretch, 12, 6, 10, 26, 0.5, prism);
      break;
    }
    case 'wake_startled': {
      const b = beats.wake_startled;
      const crown = pt(f, 'crown', 4);
      if (crown) bang(f.above, [crown[0] + 10, crown[1] - 4], frame - 3, 16);
      const head = pt(f, 'head', b.jolt);
      if (head) burst(f.above, [head[0], head[1] - 16], frame - b.jolt, 8, 7, 6, '#ffffff', 4, 0.45);
      break;
    }
    default:
      break;
  }
  void disc;
}
