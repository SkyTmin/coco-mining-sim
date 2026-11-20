// Effects of Огонёк: the maple leaf that lands on its nose in «Страшилка» and the gust that flips it, bristle marks
// round the threat display, sweat drops while it windmills, swoosh arcs round the accidental backflip, the thump,
// dizzy stars, shy marks and hearts; in «Хвост-пропеллер» the trail of the swishing tail, the leaves it sweeps into a
// pile, the blur disc of the spinning tail with its streaks and the downwash, the plunge into the pile, the leaves
// stuck on its ears and shaken off; the bamboo it slips off when it hatches, dust of the mossy clearing, fur tufts,
// water drops of the wash, sparkles, a yawn and sleepy «z». Timelines read the beats of the pose book; positions read
// the panda's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, PILE } from './ember_panda-poses';

const soil = ['#1e2a16', '#34421e', '#56603a', '#6e7a4a', '#8a9466', '#b4bc8e'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];
const pink = ['#a03a56', '#e06a88', '#ffb0c4', '#fff0f4'];
const maple = ['#4a140a', '#a8341a', '#e0602a', '#f8a048', '#ffd890'];
const bamboo = ['#1e3a1a', '#3e6a2a', '#6a9a3a', '#a8cc6a', '#d8eca0'];
const straw = ['#5a3a12', '#9a6a22', '#d4a040', '#f4d080'];
const fur = ['#3e1208', '#982f12', '#dc6a2e', '#fff0d4'];
const water = ['#3a7a8a', '#8ac0c8', '#c4e4e4', '#ffffff'];
const wind = '#eef6f4';

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

/** A soft dust cloud of the mossy clearing: a shaded base, a light body and a bright cap. */
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
/** A maple leaf: a round middle with five lobes round a dark vein, turned by `ang`; `flip` (−1…1) is its edge-on
 * turn while it tumbles (the leaf narrows and shows its paler back). */
function mapleLeaf(p: Pen, [x, y]: XY, ang: number, r: number, a: number, flip = 1, palette = maple) {
  if (a <= 0) return;
  const w = Math.max(0.3, Math.abs(flip));
  // Points of the leaf in its own frame (x across, y along the stem), squeezed across by the flip.
  const at = (u: number, v: number): XY => {
    const c = Math.cos(ang),
      sn = Math.sin(ang);
    return [x + u * w * c - v * sn, y + u * w * sn + v * c];
  };
  const blobs: [number, number, number][] = [[0, 0, 0.55]];
  for (let k = 0; k < 5; k++) {
    const t = -Math.PI / 2 + (k - 2) * 0.95;
    blobs.push([Math.cos(t) * r * 0.62, Math.sin(t) * r * 0.62, k === 2 ? 0.42 : 0.36]);
  }
  const draw = (grow: number, col: string) => {
    p.col(col, a);
    for (const [u, v, k] of blobs) {
      const [cx, cy] = at(u, v);
      const rr = r * k + grow;
      for (let j = Math.ceil(-rr); j <= Math.floor(rr); j++) {
        const half = Math.sqrt(Math.max(0, rr * rr - j * j));
        const x0 = Math.round(cx - half),
          x1 = Math.round(cx + half);
        if (x1 >= x0) p.rect(x0, Math.round(cy + j), x1 - x0 + 1, 1);
      }
    }
  };
  if (r > 3) draw(1, '#24100a');
  draw(0.4, palette[1]);
  draw(-0.4, palette[flip > 0 ? 3 : 2]);
  // Veins and the stem.
  p.col(palette[0], a);
  const [sx, sy] = at(0, r * 1.15),
    [tx, ty] = at(0, -r * 0.7);
  p.line(Math.round(sx), Math.round(sy), Math.round(tx), Math.round(ty));
  if (r > 3) {
    const [lx, ly] = at(-r * 0.55, -r * 0.2),
      [rx2, ry2] = at(r * 0.55, -r * 0.2);
    p.line(Math.round(x), Math.round(y), Math.round(lx), Math.round(ly));
    p.line(Math.round(x), Math.round(y), Math.round(rx2), Math.round(ry2));
    p.col(palette[4], a * 0.9);
    const [hx2, hy2] = at(-r * 0.3, -r * 0.45);
    p.rect(Math.round(hx2), Math.round(hy2), 1, 1);
  }
}
/** A narrow bamboo leaf (or a fallen one of straw colour): a short tapered blade along `ang`. */
function blade(p: Pen, [x, y]: XY, ang: number, len: number, a: number, palette = bamboo) {
  if (a <= 0) return;
  const c = Math.cos(ang),
    s = Math.sin(ang);
  for (let i = 0; i <= len; i++) {
    const X = Math.round(x + c * (i - len / 2)),
      Y = Math.round(y + s * (i - len / 2));
    p.col(palette[i < len * 0.3 ? 1 : i > len * 0.75 ? 3 : 2], a);
    p.rect(X, Y, 1, 1);
    if (i > 1 && i < len - 1) {
      p.col(palette[1], a);
      p.rect(Math.round(X - s), Math.round(Y + c), 1, 1);
    }
  }
}
/** Leaves leaving a point, tumbling down with a swing; mixed maple and bamboo. */
function leaves(p: Pen, at: XY, age: number, life: number, count: number, seed: number, spread = 16, lift = 10) {
  if (age < 0 || age > life) return;
  const fade = 1 - progress(age, life * 0.7, life);
  for (let i = 0; i < count; i++) {
    const dir = (hash(i, seed, 1) - 0.5) * 2;
    const burst = 1 - Math.exp(-age / 3);
    const x = at[0] + dir * spread * burst + Math.sin(age * 0.3 + i * 2) * 4 * (age / life),
      y = at[1] - (lift * 0.4 + lift * hash(i, seed, 2)) * burst + age * age * 0.01 * (6 + 6 * hash(i, seed, 3));
    const ang = age * (0.25 + 0.2 * hash(i, seed, 4)) * (i % 2 ? 1 : -1) + i;
    if (i % 3 === 0) mapleLeaf(p, [x, y], ang, 2.2, fade, Math.cos(age * 0.4 + i));
    else blade(p, [x, y], ang, 5, fade, i % 3 === 1 ? bamboo : straw);
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
/** A pixel heart. */
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
/** Hearts rising from a point over a span of frames. */
function hearts(p: Pen, at: XY, age: number, life: number, n: number) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const k = (age - i * 4) / (life - (n - 1) * 4);
    if (k < 0 || k > 1) continue;
    heart(p, [at[0] + (i % 2 ? 8 : -6) + Math.sin(k * 7 + i) * 2, at[1] - k * 18], k < 0.2 ? 1 : 2, 1 - progress(k, 0.7, 1));
  }
}
/** A sleepy «z» of pixel lines. */
function zed(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col('#e8f0f0', a);
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
    const front = Math.sin(ang) > 0;
    sparkle(p, [x + Math.cos(ang) * 10, y + Math.sin(ang) * 3], front ? 2.6 : 1.8, a * (front ? 1 : 0.7));
  }
}
/** Short lines bursting out round a point (alarm, impact); `fan` spreads them from straight up. */
function burst(p: Pen, [x, y]: XY, age: number, life: number, n: number, r0: number, color: string, len = 3, fan = 0.45) {
  if (age < 0 || age > life) return;
  const a = 1 - age / life;
  p.col(color, a);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i - (n - 1) / 2) * fan,
      r = r0 + age * 1.5;
    p.line(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), Math.round(x + Math.cos(ang) * (r + len)), Math.round(y + Math.sin(ang) * (r + len)));
  }
}
/** A drop of sweat or water: a pale bead with a bright spark. */
function drop(p: Pen, [x, y]: XY, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y);
  p.col(water[0], a);
  p.rect(X, Y - 1, 1, 1);
  p.rect(X - 1, Y, 3, 2);
  p.col(water[2], a);
  p.rect(X, Y, 1, 1);
  p.col(water[3], a);
  p.rect(X - 1, Y, 1, 1);
}
/** Drops flung off a point to both sides, falling. */
function drops(p: Pen, at: XY, age: number, life: number, n: number, seed: number, speed = 40) {
  if (age < 0 || age > life) return;
  const t = age / 24;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1,
      v = speed * (0.6 + 0.4 * hash(i, seed, 1));
    drop(p, [at[0] + side * v * t, at[1] - v * 0.8 * t + 110 * t * t], 1 - progress(age, life * 0.6, life));
  }
}
/** Bristle marks: short zigzags round the body, the cartoon «I am big and scary». */
function bristles(p: Pen, [x, y]: XY, frame: number, a: number, rx: number, ry: number) {
  if (a <= 0) return;
  p.col('#fff6e8', a);
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i - 2.5) * 0.55 + (frame % 2 ? 0.04 : -0.04);
    const r = 1 + (frame % 2) * 0.06;
    const X = x + Math.cos(ang) * rx * r,
      Y = y + Math.sin(ang) * ry * r;
    const ox = Math.cos(ang) * 2,
      oy = Math.sin(ang) * 2;
    p.line(Math.round(X), Math.round(Y), Math.round(X + ox - oy * 0.6), Math.round(Y + oy + ox * 0.6));
    p.line(Math.round(X + ox - oy * 0.6), Math.round(Y + oy + ox * 0.6), Math.round(X + ox * 2), Math.round(Y + oy * 2));
  }
}
/** Three short slanted marks beside the cheek (shy). */
function shy(p: Pen, [x, y]: XY, a: number) {
  if (a <= 0) return;
  p.col('#f08a8a', a);
  for (let i = 0; i < 3; i++) p.line(Math.round(x + i * 3), Math.round(y), Math.round(x + i * 3 + 2), Math.round(y - 3));
}
/** Streaks through a socket's recent positions (swoosh). */
function swoosh(p: Pen, f: FxInput, socket: string, frame: number, n: number, offsets: number[], palette = [wind, '#b8d4d0']) {
  for (let k = 1; k <= n; k++) {
    const a = pt(f, socket, frame - k + 1),
      c = pt(f, socket, frame - k);
    if (!a || !c) continue;
    p.col(palette[k < 3 ? 0 : 1], 0.85 - k * (0.7 / n));
    for (const off of offsets) p.line(Math.round(a[0] + off * 0.4), Math.round(a[1] + off), Math.round(c[0] + off * 0.4), Math.round(c[1] + off));
  }
}

/** The leaf pile of «Хвост-пропеллер»: leaves fixed by seed on a low dome; `grow` 0…1 builds it up from the ground,
 * `scatter` 0…1 thins it after the pop. */
function leafPile(p: Pen, [x, y]: XY, grow: number, scatter: number, shake: number) {
  if (grow <= 0 || scatter >= 1) return;
  const keep = 1 - scatter,
    rx = 32 * (0.6 + 0.4 * grow) * (0.7 + 0.3 * keep),
    ry = 26 * grow * keep;
  ellFill(p, [x + 3, y + 1], rx + 3, 4, '#2a3a18', 0.4 * grow);
  // The mound: dark inside, rustier and lighter towards the top-left light.
  if (ry > 1)
    for (let j = 0; j <= ry; j++) {
      const v = j / ry,
        half = rx * Math.sqrt(Math.max(0, 1 - v * v));
      for (let i = -Math.round(half); i <= Math.round(half); i++) {
        const u = i / rx,
          lit = -0.5 * u + 0.8 * v + 0.35 * (hash(x + i, y - j, 5) - 0.5);
        p.col(lit > 0.75 ? straw[2] : lit > 0.35 ? maple[2] : lit > 0 ? maple[1] : straw[0], 1);
        p.rect(Math.round(x + i + Math.sin(shake * 2.1 + j) * shake * 0.4), Math.round(y - j), 1, 1);
      }
    }
  // Leaves on it for the texture.
  const n = Math.round(90 * grow);
  for (let i = 0; i < n; i++) {
    if (hash(i, 7, 9) < scatter) continue;
    const u = hash(i, 7, 1) * 2 - 1,
      v = hash(i, 7, 2);
    const top = Math.sqrt(Math.max(0, 1 - u * u));
    const px = x + u * rx * 0.95 + Math.sin(shake * 2.1 + i) * shake,
      py = y - ry * top * v + 1 + Math.cos(shake * 1.7 + i) * shake * 0.5;
    const ang = hash(i, 7, 3) * TAU;
    if (i % 3 === 0) mapleLeaf(p, [px, py], ang, 2.4, 1, hash(i, 7, 4) > 0.5 ? 1 : -1);
    else blade(p, [px, py], ang, 5, 1, i % 3 === 1 ? straw : bamboo);
  }
}

/** The blur disc of the spinning tail: a pale translucent ellipse round the hub, ringed streaks in the tail's colours
 * turning with the blade, and a bright leading edge. */
function rotorDisc(p: Pen, [x, y]: XY, r: number, frame: number, a: number) {
  if (a <= 0) return;
  const ry = r * 0.42;
  ellFill(p, [x, y], r, ry, '#fff0d4', a * 0.3);
  ellFill(p, [x, y], r * 0.7, ry * 0.7, '#f0be84', a * 0.18);
  const turn = frame * 1.9;
  const rings: [number, string][] = [
    [0.95, '#fcdcac'],
    [0.78, '#c04a1c'],
    [0.6, '#fff0d4'],
    [0.42, '#982f12'],
  ];
  rings.forEach(([k, col], i) => {
    const start = turn + i * 1.3;
    oval(p, [x, y], r * k, ry * k, col, a * 0.9, start, start + 2.2);
    oval(p, [x, y], r * k, ry * k, col, a * 0.45, start + Math.PI, start + Math.PI + 1.6);
  });
  p.col('#ffffff', a * 0.8);
  const lead = turn + 0.4;
  p.line(Math.round(x), Math.round(y), Math.round(x + Math.cos(lead) * r), Math.round(y + Math.sin(lead) * ry));
}
/** Downwash under the rotor: short lines falling from the disc and blowing outwards. */
function downwash(p: Pen, [x, y]: XY, r: number, frame: number, a: number, depth = 26) {
  if (a <= 0) return;
  p.col(wind, a * 0.6);
  for (let i = 0; i < 6; i++) {
    const k = ((frame * 0.17 + i / 6) % 1 + 1) % 1;
    const side = (i % 2 ? 1 : -1) * (0.35 + 0.6 * hash(i, 3, 1));
    const X = x + side * r * (0.8 + 0.4 * k),
      Y = y + 4 + k * depth;
    p.line(Math.round(X), Math.round(Y), Math.round(X + side * 2), Math.round(Y + 4));
  }
}

/** The bamboo stalk the panda slips off when it hatches: hanging into the picture from the top, it bends under the
 * weight, rustles, and whips back up when the panda lets go. */
function bambooTop(p: Pen, x: number, frame: number, slip: number) {
  const bend = frame < slip ? 0.5 + 0.1 * Math.sin(frame * 2.3) : 0.5 * Math.exp(-(frame - slip) / 4) * Math.cos((frame - slip) * 1.1);
  const lift = frame < slip ? 0 : Math.min(30, (frame - slip) * 6);
  const fade = 1 - progress(frame, slip + 6, slip + 12);
  if (fade <= 0) return;
  let px = x - 30,
    py = -4 - lift;
  for (let i = 0; i < 18; i++) {
    const ang = Math.PI / 2 - 0.9 + bend * (i / 18) * 1.4;
    const nx = px + Math.cos(ang) * 2.2,
      ny = py + Math.sin(ang) * 2.2;
    p.col(bamboo[1], fade);
    p.rect(Math.round(px) - 1, Math.round(py), 3, 3);
    p.col(bamboo[3], fade);
    p.rect(Math.round(px), Math.round(py), 1, 2);
    if (i % 6 === 5) {
      p.col(bamboo[0], fade);
      p.rect(Math.round(px) - 2, Math.round(py), 5, 1);
    }
    if (i % 4 === 2) blade(p, [px + 4, py + 2], 0.6 + Math.sin(frame * 0.9 + i) * 0.25, 6, fade);
    px = nx;
    py = ny;
  }
  for (let i = 0; i < 3; i++) blade(p, [px + i * 2 - 2, py + 3], 1.2 + i * 0.4 + Math.sin(frame * 1.3 + i) * 0.2, 7, fade);
}

/** Where the leaf of «Страшилка» is: drifting down from the upper left onto the nose, riding it, flipped away. */
function strangerLeaf(p: Pen, f: FxInput, frame: number) {
  const b = beats.trick,
    home = f.feet;
  const nose = pt(f, 'nose', Math.min(frame, b.gust)),
    landing = pt(f, 'nose', b.nose);
  if (!nose || !landing) return;
  if (frame < b.nose) {
    const k = frame / b.nose;
    const start: XY = [home[0] - 50, home[1] - 128];
    const x = start[0] + (landing[0] - 2 - start[0]) * k + Math.sin(k * 3 * Math.PI) * 12 * (1 - k),
      y = start[1] + (landing[1] - 3 - start[1]) * k;
    mapleLeaf(p, [x, y], Math.sin(k * 9) * 0.8, 5.5, 1, Math.cos(k * 11));
  } else if (frame < b.gust) mapleLeaf(p, [nose[0] - 1, nose[1] - 4], 0.3, 5.5, 1, 1);
  else {
    const age = frame - b.gust;
    if (age > 16) return;
    mapleLeaf(p, [nose[0] - 1 + age * 6, nose[1] - 4 - age * 5 + age * age * 0.1], age * 0.8, 5.5, 1 - progress(age, 10, 16), Math.cos(age * 1.4));
  }
}

export function pandaEffects(f: FxInput) {
  const frame = frameOf(f);
  const home = f.feet;
  switch (f.anim) {
    case 'trick': {
      const b = beats.trick;
      strangerLeaf(f.above, f, frame);
      // The gust: streaks blowing across at the head, a «!» as it jumps, fur standing on end.
      if (frame >= b.gust - 2 && frame < b.gust + 6) {
        const a = 1 - progress(frame, b.gust + 3, b.gust + 6);
        f.above.col(wind, a * 0.85);
        const nose = pt(f, 'nose', b.gust) ?? [home[0], home[1] - 60];
        for (let i = 0; i < 5; i++) {
          const X = nose[0] - 60 + (frame - b.gust + 2) * 14 + (i % 2) * 10,
            Y = nose[1] - 16 + i * 7;
          f.above.line(Math.round(X), Math.round(Y), Math.round(X + 16), Math.round(Y - 3));
          f.above.line(Math.round(X + 16), Math.round(Y - 3), Math.round(X + 19), Math.round(Y - 6));
        }
      }
      const crown = pt(f, 'crown');
      const top = pt(f, 'crown', b.jump);
      if (top) bang(f.above, [top[0] + 2, top[1] - 12], frame - b.jump, 12);
      const back = pt(f, 'back', b.jump);
      if (back) spray(f.above, back, frame - b.jump, 12, 8, 30, fur, 11, -0.8, 50, 1.2);
      dustCloud(f.under, home, frame - b.jump - 3, 10, 4, 3, 12, 12, 0.8);
      // The threat display: bristle marks round the body while it holds and hops.
      const body = pt(f, 'body');
      if (body && frame >= b.threat && frame < b.wobble) bristles(f.above, [body[0], body[1] - 14], frame, 1 - progress(frame, b.wobble - 3, b.wobble), 34, 30);
      for (const land of [b.hop1 + 4, b.hop2 + 3]) {
        const g = pt(f, 'floor', land);
        if (g) dustCloud(f.under, g, frame - land, 9, 4, 3, 12, 13 + land, 0.8);
      }
      // Losing balance: sweat drops off the head, then swoosh arcs round the backflip.
      const head = pt(f, 'head', b.wobble + 2);
      if (head) drops(f.above, [head[0], head[1] - 12], frame - b.wobble - 2, 10, 2, 14, 36);
      const head2 = pt(f, 'head', b.fall - 2);
      if (head2) drops(f.above, [head2[0], head2[1] - 12], frame - b.fall + 2, 10, 2, 15, 40);
      if (frame >= b.flip && frame <= b.thump) swoosh(f.above, f, 'body', frame, 4, [-16, 16]);
      // The thump on its bottom, dizzy stars; shy marks and hearts while it hides and smiles.
      dustCloud(f.under, home, frame - b.thump, 14, 7, 4, 20, 16, 1.1);
      burst(f.above, [home[0], home[1] - 6], frame - b.thump, 6, 5, 18, '#fff6e8', 4, 0.6);
      if (crown && frame >= b.dizzy && frame < b.hide) dizzy(f.above, [crown[0], crown[1] - 4], frame, 1 - progress(frame, b.hide - 3, b.hide));
      const cheek = pt(f, 'head');
      if (cheek && frame >= b.hide && frame < b.smile) shy(f.above, [cheek[0] + 16, cheek[1] - 2], frame >= b.peek && frame < b.hideAgain ? 0.5 : 1);
      if (head && frame >= b.hide && frame < b.hide + 8) drop(f.above, [cheek ? cheek[0] - 14 : home[0], (cheek ? cheek[1] : home[1]) - 10 + (frame - b.hide) * 0.6], 1 - progress(frame, b.hide + 5, b.hide + 8));
      if (cheek) hearts(f.above, [cheek[0] + 6, cheek[1] - 18], frame - b.smile, 18, 2);
      dustCloud(f.under, home, frame - 113, 8, 3, 2, 8, 17, 0.7);
      break;
    }
    case 'trick_b': {
      const b = beats.trick_b;
      const pile: XY = [home[0] - PILE + 14, home[1]];
      // The swishing tail: a trail at the tip, and the leaves it sweeps off the ground into a pile at its side.
      if (frame >= b.swish && frame < b.mast) swoosh(f.above, f, 'tailTip', frame, 3, [0], [wind, '#d8e8e0']);
      if (frame >= b.swish + 3 && frame < b.mast + 2)
        for (let i = 0; i < 3; i++) {
          const k = ((frame - b.swish - 3 + i * 2.3) % 7) / 7;
          const from: XY = [home[0] - 6 + i * 6, home[1] + 2],
            arc = Math.sin(k * Math.PI) * 14;
          const x = from[0] + (pile[0] - from[0]) * k,
            y = from[1] + (pile[1] - 10 - from[1]) * k - arc;
          if (i === 1) mapleLeaf(f.above, [x, y], k * 6, 2.2, 1 - k * 0.3, Math.cos(k * 9));
          else blade(f.above, [x, y], k * 7 + i, 5, 1 - k * 0.3, i ? straw : bamboo);
        }
      const grow = progress(frame, b.swish + 3, b.mast + 2);
      const scatter = progress(frame, b.pop, b.pop + 6);
      const inPile = frame >= b.pile - 1 && frame < b.pop + 2;
      const quake = frame >= b.pile && frame < b.pop ? Math.max(0, 2.5 - (frame - b.pile) * 0.15) * (1 + Math.sin(frame * 2.7)) : 0;
      leafPile(inPile ? f.above : f.under, pile, grow, scatter, quake);
      // The rotor: blur disc round the hub while it spins fast, downwash, dust blown off the clearing at take-off.
      const hub = pt(f, 'tailHub');
      const spinning = progress(frame, b.spin, b.spin + 6) * (1 - progress(frame, b.sputter, b.hang + 2));
      if (hub && spinning > 0) {
        rotorDisc(f.above, hub, 40, frame, spinning);
        downwash(f.above, hub, 40, frame, spinning * (frame < b.fly ? 1 : 0.5));
      }
      if (frame >= b.lift && frame < b.fly + 4) dustCloud(f.under, home, (frame - b.lift) % 8, 8, 3, 2, 26, 21 + Math.floor((frame - b.lift) / 8), 0.9, 0);
      // Sputter: a little smoke-like puff of fluff off the stalling tail, a sweat drop, a «!» before the drop.
      if (hub && frame >= b.sputter && frame < b.hang + 2) spray(f.above, hub, frame - b.sputter, 8, 6, 24, fur, 22, -0.5, 20, 1.6);
      const head = pt(f, 'head');
      if (head && frame >= b.hang && frame < b.fall + 2) drop(f.above, [head[0] - 14, head[1] - 8 + (frame - b.hang)], 1);
      if (head) bang(f.above, [head[0] + 2, head[1] - 34], frame - b.fall, 6);
      // The drop: streaks over it; the plunge into the pile throws leaves up; it pops out with leaves on its ears and
      // shakes them off with its fur.
      if (frame >= b.fall + 1 && frame < b.pile) swoosh(f.above, f, 'body', frame, 3, [-14, 14]);
      leaves(f.above, [pile[0], pile[1] - 14], frame - b.pile, 26, 12, 23, 22, 18);
      leaves(f.above, [pile[0], pile[1] - 16], frame - b.pop, 28, 16, 24, 28, 22);
      dustCloud(f.under, home, frame - 93, 8, 3, 2, 10, 25, 0.7);
      if (frame >= b.pop && frame < b.shake + 1)
        for (const ear of ['earL', 'earR']) {
          const e = pt(f, ear);
          if (e) mapleLeaf(f.above, [e[0] + (ear === 'earL' ? -1 : 1), e[1] - 1], ear === 'earL' ? -0.4 : 0.5, 2.6, 1, 1);
        }
      const body = pt(f, 'body', b.shake);
      if (body) {
        leaves(f.above, [body[0], body[1] - 26], frame - b.shake, 22, 4, 26, 18, 8);
        spray(f.above, body, frame - b.shake, 12, 10, 50, fur, 27, -0.3, 80, 1.6);
      }
      if (head && frame >= b.done && frame < 108) sparkle(f.above, [head[0] + 18, head[1] - 12], 3.2 * (1 - progress(frame, b.done + 2, 108)), 1);
      break;
    }
    case 'hatch': {
      const b = beats.hatch;
      bambooTop(f.above, home[0], frame, b.slip);
      if (frame < b.slip + 2) leaves(f.above, [home[0] - 10, 6], frame % 12, 12, 2, 31 + Math.floor(frame / 12), 10, -2);
      leaves(f.above, [home[0] - 14, 4], frame - b.slip, 30, 6, 32, 18, -4);
      if (frame >= b.slip && frame < b.land) swoosh(f.above, f, 'body', frame, 3, [-12, 12]);
      dustCloud(f.under, home, frame - b.land, 14, 7, 4, 20, 33, 1.2);
      burst(f.above, [home[0], home[1] - 4], frame - b.land, 6, 5, 20, '#fff6e8', 4, 0.6);
      dustCloud(f.under, home, frame - b.bounce - 3, 8, 3, 2, 10, 34, 0.7);
      const crown = pt(f, 'crown');
      if (crown && frame >= b.dizzy && frame < b.shake) dizzy(f.above, [crown[0], crown[1] - 4], frame, 1 - progress(frame, b.shake - 3, b.shake));
      const body = pt(f, 'body', b.shake);
      if (body) {
        spray(f.above, body, frame - b.shake, 12, 10, 50, fur, 35, -0.3, 80, 1.6);
        leaves(f.above, [body[0], body[1] - 10], frame - b.shake, 18, 3, 36, 14, 6);
      }
      const head = pt(f, 'head');
      if (head && frame >= 41 && frame < 48) sparkle(f.above, [head[0] + 16, head[1] - 10], 3 - (frame - 41) * 0.3, 1 - progress(frame, 45, 48));
      break;
    }
    case 'happy': {
      const b = beats.happy;
      for (const [land, seed] of [
        [9, 61],
        [14, 62],
      ] as const) {
        const g = pt(f, 'floor', land);
        if (g) dustCloud(f.under, g, frame - land, 9, 4, 3, 12, seed, 0.8);
      }
      dustCloud(f.under, home, frame - b.twirl, 8, 4, 2, 14, 63, 0.8);
      const body = pt(f, 'body');
      if (body && frame >= b.twirl && frame <= b.land) swoosh(f.above, f, 'tailTip', frame, 3, [0], [wind, '#ffe4c0']);
      const body2 = pt(f, 'body', 21);
      if (body2) sparkleRing(f.above, body2, frame - 21, 12, 6, 14, 30, 0.2);
      dustCloud(f.under, home, frame - b.land, 10, 5, 3, 16, 64, 1);
      const head = pt(f, 'head');
      if (head) hearts(f.above, [head[0], head[1] - 22], frame - b.cheer, 15, 2);
      break;
    }
    case 'fidget_a': {
      const b = beats.fidget_a;
      // Licks: little drops at the paw; wipes: a gleam where the paw passes; the shake flings drops; clean sparkle.
      for (const lick of [6, 10, 14]) {
        const paw = pt(f, 'pawR', lick);
        if (paw && frame >= lick && frame < lick + 3) drop(f.above, [paw[0] + 3, paw[1] - 2], 1 - (frame - lick) / 3);
      }
      const paw = pt(f, 'pawR');
      if (paw && frame >= b.wipe && frame < b.shake) {
        f.above.col('#ffffff', 0.8);
        f.above.rect(Math.round(paw[0]) + 2, Math.round(paw[1]) - 3, 1, 1);
        f.above.rect(Math.round(paw[0]) - 3, Math.round(paw[1]) - 1, 1, 1);
      }
      const head = pt(f, 'head', b.shake);
      if (head) drops(f.above, [head[0], head[1] - 8], frame - b.shake, 10, 4, 71, 50);
      const head2 = pt(f, 'head');
      if (head2 && frame >= 40 && frame < 48) sparkle(f.above, [head2[0] - 16, head2[1] - 12], 3.2 * (1 - progress(frame, 44, 48)), 1);
      break;
    }
    case 'fidget_b': {
      const b = beats.fidget_b;
      const crown = pt(f, 'crown');
      if (crown) bang(f.above, [crown[0] + 4, crown[1] - 10], frame - b.spot, 9);
      dustCloud(f.under, home, frame - b.chase, 8, 3, 2, 8, 81, 0.6);
      // The chase: a swirl of dust and a trail round the tail.
      if (frame >= b.chase && frame < b.catch) {
        swoosh(f.above, f, 'tailTip', frame, 4, [0]);
        if (frame % 3 === 0) dustCloud(f.under, home, 0.5, 8, 2, 2, 18, 82 + frame, 0.6);
        dustCloud(f.under, home, (frame - b.chase) % 6, 8, 2, 2, 20, 83 + Math.floor(frame / 6), 0.7);
      }
      dustCloud(f.under, home, frame - b.catch - 1, 10, 5, 3, 16, 84, 0.9);
      const head = pt(f, 'head');
      if (head) hearts(f.above, [head[0] + 2, head[1] - 20], frame - b.catch - 2, 16, 3);
      break;
    }
    case 'look': {
      const crown = pt(f, 'crown');
      if (crown) burst(f.above, [crown[0], crown[1] - 4], frame - 2, 6, 3, 4, '#fff6e8', 3);
      break;
    }
    case 'wake_startled': {
      const b = beats.wake_startled;
      const crown = pt(f, 'crown', b.jolt);
      if (crown) burst(f.above, [crown[0], crown[1] - 4], frame - b.jolt, 8, 5, 4, '#ffffff', 4);
      const back = pt(f, 'back', b.jolt);
      if (back) spray(f.above, back, frame - b.jolt, 10, 8, 30, fur, 91, -0.8, 50, 1.2);
      const body = pt(f, 'body');
      if (body && frame >= b.threat && frame < 16) bristles(f.above, [body[0], body[1] - 14], frame, 1 - progress(frame, 13, 16), 34, 30);
      const head = pt(f, 'head');
      if (head && frame >= 16) shy(f.above, [head[0] + 16, head[1] - 2], 1 - progress(frame, 21, 24));
      break;
    }
    case 'sleep_in': {
      const mouth = pt(f, 'mouth');
      if (mouth && frame >= beats.sleep_in.yawn && frame < 12) {
        const a = 1 - progress(frame, 9, 12);
        oval(f.above, [mouth[0] + 8, mouth[1] - 6], 2.5, 2.5, '#e8f0f0', a * 0.8);
      }
      const crown = pt(f, 'crown');
      if (crown && frame > 24) zed(f.above, [crown[0] + 8, crown[1] - 4], 2, progress(frame, 24, 30));
      break;
    }
    case 'sleep': {
      const crown = pt(f, 'crown');
      if (!crown) break;
      for (let i = 0; i < 3; i++) {
        const k = (((frame / 72 + i / 3) % 1) + 1) % 1;
        zed(f.above, [crown[0] + 8 + k * 10 + Math.sin(k * 6) * 2, crown[1] - 4 - k * 18], 2 + Math.round(k * 2), Math.sin(k * Math.PI));
      }
      break;
    }
    case 'sleep_out': {
      const crown = pt(f, 'crown');
      if (crown && frame < 6) zed(f.above, [crown[0] + 12, crown[1] - 12], 3, 1 - frame / 6);
      const body = pt(f, 'body', 19);
      if (body) spray(f.above, body, frame - 19, 10, 8, 40, fur, 95, -0.3, 70, 1.6);
      break;
    }
  }
}
