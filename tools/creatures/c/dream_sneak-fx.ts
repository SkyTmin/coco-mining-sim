// Effects of Шмыг. Dream sand is his own: gold grains that glow, puff into clouds and settle as sparkles. «Невидимка»:
// the spinning shield umbrella throws sand, he vanishes in a puff, two eyes blink where he was, glowing paw prints
// hop toward the glass, «БУ!» bursts with rays. «Сонный песок»: the pouch glows, a stream of sand toward the viewer
// (the eyelids are painted on the body's over layer by the skin). «Сон наяву»: a sand fountain, a whirl round the spin,
// a ring of sand rolling out over the grass. «Счёт барашков»: sand builds a picket fence post by post, the numbers
// 1-2-3-4 pop over the jumps, stars over the bonked sheep, the fence crumbles back into sand. «Полёт на зонтике»: a
// trail of sparkles behind him. The moon-patterned egg of the hatch, sleepy «z», landing dust.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, PRINTS } from './dream_sneak-poses';

const sand = ['#ac7e20', '#eebe40', '#ffe68e', '#fffadc'];
const lilac = ['#3a3062', '#6e5ea6', '#b6a8e0', '#efe8ff'];
const shell = ['#4a3e78', '#8a7ec4', '#d8d0f4', '#fbf8ff'];
const canopyTip = ['#5a44ac', '#7c64ca'];
const soil = ['#0f2822', '#1d4636', '#356c4c', '#6a9a78', '#b8d8c0'];
const wood = ['#43291c', '#7c5432', '#b48248', '#e8c088'];
const F2 = new Set(['idle-f2', 'happy-f2', 'trick-f2', 'trick_b-f2']);

const frameOf = (f: FxInput) => f.t * 24;
const ease = (k: number) => k * k * (3 - 2 * k);
const clamp01 = (k: number) => Math.max(0, Math.min(1, k));
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
function sparkle(p: Pen, [x, y]: XY, size: number, a = 1, palette = sand) {
  if (a <= 0 || size <= 0) return;
  p.col(palette[1], a);
  star(p, x, y, size, 4, Math.PI / 4);
  p.col(palette[2], a);
  star(p, x, y, size * 0.6, 4, Math.PI / 4);
  flare(p, Math.round(x), Math.round(y), Math.max(1, Math.round(size * 0.9)), palette[3], a);
}
/** A puff of glowing sand: soft round clouds that swell and fade, grains flying out. */
function sandPuff(p: Pen, at: XY, age: number, life: number, n: number, reach: number, seed: number) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i, seed) * 0.8;
    const d = reach * Math.sqrt(k) * (0.5 + 0.5 * hash(i, seed, 2));
    const x = at[0] + Math.cos(a) * d,
      y = at[1] + Math.sin(a) * d * 0.6 - 6 * k;
    const r = 2 + 4 * k * (0.6 + hash(i, seed, 3) * 0.6),
      al = 0.8 * (1 - k * k);
    ellFill(p, [x + r * 0.2, y + r * 0.25], r, r * 0.8, sand[0], al * 0.6);
    ellFill(p, [x, y], r * 0.86, r * 0.72, sand[1], al);
    ellFill(p, [x - r * 0.3, y - r * 0.3], r * 0.4, r * 0.32, sand[3], al);
  }
  for (let i = 0; i < n * 2; i++) {
    const a = hash(i, seed, 5) * TAU,
      d = reach * 1.4 * k * (0.4 + hash(i, seed, 6));
    p.col(i % 3 ? sand[2] : '#ffffff', 1 - k);
    p.rect(Math.round(at[0] + Math.cos(a) * d), Math.round(at[1] + Math.sin(a) * d * 0.6 + 10 * k * k), 1, 1);
  }
}
/** Grains drifting down and twinkling (dream sand settling). */
function sandFall(p: Pen, at: XY, age: number, life: number, n: number, spread: number, height: number, seed: number) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const k = (age - hash(i, seed) * life * 0.4) / (life * 0.6);
    if (k < 0 || k > 1) continue;
    const x = at[0] + (hash(i, seed, 2) - 0.5) * 2 * spread + Math.sin(k * 6 + i) * 2,
      y = at[1] - height + height * k;
    const tw = 0.5 + 0.5 * Math.sin(age * 0.8 + i);
    if (i % 5 === 0) sparkle(p, [x, y], 1.6 + tw, 1 - k * 0.6);
    else {
      p.col(i % 2 ? sand[2] : sand[3], 1 - k * 0.5);
      p.rect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
function zed(p: Pen, [x, y]: XY, s: number, a: number, color = '#efe8ff') {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col(color, a);
  p.line(X, Y, X + S, Y);
  p.line(X + S, Y, X, Y + S);
  p.line(X, Y + S, X + S, Y + S);
}
function zzz(p: Pen, at: XY, age: number, period: number) {
  for (let n = 0; n < 3; n++) {
    const k = (((age / period + n / 3) % 1) + 1) % 1;
    zed(p, [at[0] + 3 + k * 9 + Math.sin(k * 5 + n) * 1.5, at[1] - 4 - k * 14], 2 + k * 3, Math.sin(k * Math.PI));
  }
}
/** Soft dust of the meadow on landings. */
function dustCloud(p: Pen, at: XY, age: number, life: number, count: number, spread: number, seed: number, size = 1) {
  for (let i = 0; i < count; i++) {
    const k = (age - i * 0.8) / life;
    if (k < 0 || k > 1) continue;
    const side = (hash(i, seed, 1) - 0.5) * 2;
    const x = at[0] + side * spread * Math.sqrt(k),
      y = at[1] - 3 * hash(i, seed, 2) * Math.sqrt(k);
    const r = size * (1.2 + 2.6 * k),
      a = 0.8 * (1 - k * k);
    ellFill(p, [x, y], r, r * 0.7, soil[3], a);
    ellFill(p, [x - r * 0.3, y - r * 0.3], r * 0.46, r * 0.34, soil[4], a);
  }
}
/** Short rays bursting out round a point. */
function rays(p: Pen, [x, y]: XY, age: number, life: number, n: number, r0: number, color: string, len = 5) {
  if (age < 0 || age > life) return;
  const a = 1 - age / life;
  p.col(color, a);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + 0.2,
      r = r0 + age * 2;
    p.line(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r * 0.8), Math.round(x + Math.cos(ang) * (r + len)), Math.round(y + Math.sin(ang) * (r + len) * 0.8));
  }
}
/** A pixel digit (1–4) popping up with a bounce. */
function digit(p: Pen, [x, y]: XY, n: number, age: number, life: number) {
  if (age < 0 || age > life) return;
  const shapes: Record<number, string[]> = {
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'],
    3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'],
  };
  const a = 1 - progress(age, life * 0.7, life);
  const hop = age < 4 ? (4 - age) * 1.5 : 0;
  const X = Math.round(x - 3),
    Y = Math.round(y - age * 0.5 - hop);
  shapes[n].forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== '#') return;
      p.col('#2a1440', a);
      p.rect(X + i * 2 - 1, Y + j * 2 - 1, 4, 4);
    }),
  );
  shapes[n].forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== '#') return;
      p.col(j < 2 ? sand[3] : sand[2], a);
      p.rect(X + i * 2, Y + j * 2, 2, 2);
    }),
  );
}

// ---- clips ---------------------------------------------------------------------------------------------------------
function second(f: FxInput) {
  // The second form: sand glitter falls slowly round him; the moon tail sheds a sparkle now and then.
  const frame = frameOf(f);
  const c = pt(f, 'chest');
  if (c) for (let i = 0; i < 6; i++) {
    const k = (((frame / 36 + i / 6) % 1) + 1) % 1;
    const x = c[0] + (hash(i, 3) - 0.5) * 60 + Math.sin(k * 6 + i) * 3,
      y = c[1] - 50 + k * 70;
    f.above.col(i % 2 ? sand[2] : sand[3], Math.sin(k * Math.PI) * 0.8);
    f.above.rect(Math.round(x), Math.round(y), 1, 1);
  }
  const tip = pt(f, 'tailTip');
  if (tip && Math.floor(frame) % 12 < 4) sparkle(f.above, [tip[0] + 6, tip[1] - 6], 2, 0.8);
}
function invisible(f: FxInput, frame: number) {
  const B = beats.trick;
  const home = pt(f, 'floor', 0) ?? f.feet;
  // The spinning shield flings sand off its rim.
  if (frame >= B.open && frame < B.poof) {
    const rim = pt(f, 'umbRim');
    if (rim) for (let i = 0; i < 4; i++) {
      const a = frame * 0.9 + i * 1.6;
      const r = 4 + ((frame * 3 + i * 7) % 12);
      f.above.col(sand[i % 2 ? 2 : 3], 0.9);
      f.above.rect(Math.round(rim[0] + Math.cos(a) * r), Math.round(rim[1] + Math.sin(a) * r * 0.6), 1, 1);
    }
  }
  // Poof: the puff where he stood, then the two eyes blinking in it.
  const head = pt(f, 'head', B.poof - 1) ?? [home[0], home[1] - 60];
  const mid: XY = [(head[0] + home[0]) / 2, (head[1] + home[1]) / 2];
  sandPuff(f.above, mid, frame - B.poof, 22, 12, 22, 7);
  sandFall(f.above, mid, frame - B.poof, 30, 18, 20, 4, 9);
  if (frame >= B.eyesOn && frame < B.eyesOff) {
    const k = frame - B.eyesOn;
    const shut = (k > 6 && k < 8) || k > 14;
    const look = k < 9 ? 0 : k < 12 ? -1 : 1;
    for (const s of [-1, 1]) {
      const ex = Math.round(head[0] + s * 6),
        ey = Math.round(head[1] + 4);
      if (shut) {
        f.above.col('#f6c83a', 0.9);
        f.above.rect(ex - 2, ey, 5, 1);
      } else {
        f.above.col('#120e26', 0.85);
        f.above.rect(ex - 3, ey - 3, 7, 7);
        f.above.col('#f6c83a', 1);
        f.above.rect(ex - 2, ey - 2, 5, 5);
        f.above.col('#120e26', 1);
        f.above.rect(ex + look, ey - 1, 2, 3);
        f.above.col('#ffffff', 1);
        f.above.rect(ex - 2, ey - 2, 1, 1);
      }
    }
  }
  // Glowing paw prints hop toward the glass, each with a little puff, fading after a while.
  for (let n = 0; n < PRINTS.length; n++) {
    const born = B.prints + n * B.printStep,
      age = frame - born;
    if (age < 0) continue;
    const [ox, oy] = PRINTS[n];
    const at: XY = [home[0] + ox, home[1] + oy];
    const scale = 1 + oy / 60;
    const a = 1 - progress(age, 26, 44);
    if (a <= 0) continue;
    for (const s of [-1, 1]) {
      const px = at[0] + s * 3 * scale,
        py = at[1];
      ellFill(f.under, [px, py], 2.2 * scale, 1.2 * scale, sand[1], a * 0.9);
      ellFill(f.under, [px - 0.4, py - 0.3], 1.2 * scale, 0.7 * scale, sand[3], a);
      for (let k = -1; k <= 1; k++) ellFill(f.under, [px + k * 1.6 * scale, py - 2.2 * scale], 0.7 * scale, 0.6 * scale, sand[2], a);
    }
    if (age < 8) sandPuff(f.above, [at[0], at[1] - 2], age, 8, 5, 6 * scale, 20 + n);
  }
  // «БУ!»: rays and sparks round him at the glass (he is on the over layer; the rays stay in the picture).
  if (frame >= B.boo && frame < B.boo + 14) {
    const c = pt(f, 'chest') ?? [home[0], home[1] + 60];
    rays(f.above, c, frame - B.boo, 12, 14, 30, '#fff6c2', 10);
    rays(f.above, c, frame - B.boo - 2, 12, 10, 36, '#eebe40', 7);
  }
  // Giggle: little sparkles round his head; landing dust at home.
  if (frame >= B.giggle && frame < B.hop1) {
    const h = pt(f, 'head');
    if (h) for (let i = 0; i < 3; i++) sparkle(f.above, [h[0] + (i - 1) * 28, h[1] - 40 - ((frame + i * 3) % 8) * 2], 2.5, 0.8);
  }
  dustCloud(f.under, home, frame - B.land, 12, 6, 12, 31);
}
function dreamSand(f: FxInput, frame: number) {
  const B = beats.trick_b;
  const pouch = pt(f, 'pouch');
  if (pouch && frame >= B.dip - 2 && frame < B.pinch + 2) {
    const k = clamp01((frame - B.dip + 2) / 6);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + frame * 0.4;
      f.above.col(sand[2 + (i % 2)], 0.9 * k);
      f.above.rect(Math.round(pouch[0] + Math.cos(a) * (2 + k * 4)), Math.round(pouch[1] - 2 - Math.abs(Math.sin(a)) * 5 * k), 1, 1);
    }
  }
  // The blown stream: a cone of grains from the mouth toward the viewer (down the picture), spreading as it comes.
  const mouth = pt(f, 'mouth', B.blow) ?? pt(f, 'head');
  if (mouth && frame >= B.blow && frame < B.dark + 2) {
    const age = frame - B.blow;
    for (let i = 0; i < 40; i++) {
      const k = (age - (i % 10) * 0.9) / 14;
      if (k < 0 || k > 1) continue;
      const spread = 6 + 50 * k;
      const x = mouth[0] + 6 + (hash(i, 41) - 0.5) * spread * 2,
        y = mouth[1] + 4 + 80 * k * k + (hash(i, 43) - 0.5) * spread * 0.6;
      if (i % 6 === 0) sparkle(f.above, [x, y], 1.5 + 2 * k, 1 - k * 0.5);
      else {
        f.above.col(i % 2 ? sand[2] : sand[3], 1 - k * 0.4);
        f.above.rect(Math.round(x), Math.round(y), 1 + Math.round(k), 1 + Math.round(k));
      }
    }
  }
  // Floating down under the umbrella: sparkles drift from the canopy; a puff of dust on landing.
  if (frame >= B.letGo && frame < B.land) {
    const top = pt(f, 'umbRim');
    if (top) sparkle(f.above, [top[0] + ((frame * 5) % 13) - 6, top[1] + 4 + ((frame * 3) % 9)], 2, 0.7);
  }
  dustCloud(f.under, pt(f, 'floor', B.land) ?? f.feet, frame - B.land, 12, 6, 12, 33);
}
function awakening(f: FxInput, frame: number) {
  const B = beats.phase;
  const home = pt(f, 'floor', 0) ?? f.feet;
  const hand = pt(f, 'handR', B.toss);
  // A fistful of sand thrown up falls round him like a fountain.
  if (hand) sandFall(f.above, [home[0], home[1] - 30], frame - B.toss, 30, 34, 26, 70, 51);
  // The whirl: rings of grains orbiting round the spin, near half in front, far half behind.
  if (frame >= B.spinStart && frame < B.burst + 4) {
    const k = (frame - B.spinStart) / (B.burst - B.spinStart);
    for (let i = 0; i < 36; i++) {
      const a = i * 0.7 + frame * 0.55;
      const h = (i % 6) * 12 + 4;
      const r = 18 + (i % 4) * 4 + 6 * Math.sin(k * Math.PI);
      const x = home[0] + Math.cos(a) * r,
        y = home[1] - h + Math.sin(a) * r * 0.3;
      const pen = Math.sin(a) > 0 ? f.above : f.under;
      pen.col(i % 3 ? sand[2] : sand[3], 0.9 * Math.sin(Math.min(1, k * 1.2) * Math.PI));
      pen.rect(Math.round(x), Math.round(y), i % 5 ? 1 : 2, 1);
    }
  }
  // The burst: a ring of sand rolling out over the grass and a flash of sparkles.
  const age = frame - B.burst;
  if (age >= 0 && age < 20) {
    const r = 6 + age * 4;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      ellFill(f.under, [home[0] + Math.cos(a) * r, home[1] + Math.sin(a) * r * 0.32], 2.4 - age * 0.08, 1.4, sand[1 + (i % 2)], 1 - age / 20);
    }
    for (let i = 0; i < 8; i++) sparkle(f.above, [home[0] + Math.cos(i * 0.8) * (14 + age * 2.5), home[1] - 40 + Math.sin(i * 0.8) * (14 + age * 2)], 3 - age * 0.12, 1 - age / 20);
  }
  if (frame >= B.burst) second(f);
}
function countingSheep(f: FxInput, frame: number) {
  const B = beats['trick-f2'];
  const near = pt(f, 'fenceNear', 0),
    far = pt(f, 'fenceFar', 0),
    hand = pt(f, 'handR');
  if (!near || !far) return;
  // Once he has jumped it and stands behind it, the fence is drawn over him.
  const fence = frame >= B.selfOver - 1 ? f.above : f.under;
  // The fence grows post by post out of a stream of sand from his paw, stands, then crumbles back into sand.
  const posts = 5;
  const crumble = clamp01((frame - B.crumble) / 10);
  for (let n = 0; n < posts; n++) {
    const born = B.fenceStart + 4 + n * 3.5;
    const grow = clamp01((frame - born) / 4);
    if (grow <= 0 || crumble >= 1) continue;
    const k = n / (posts - 1);
    const x = far[0] + (near[0] - far[0]) * k,
      y = far[1] + (near[1] - far[1]) * k;
    const h = (14 + 4 * k) * ease(grow) * (1 - crumble);
    const w = 2 + Math.round(k);
    fence.col(wood[0], 1);
    fence.rect(Math.round(x) - 1, Math.round(y - h) - 1, w + 2, Math.round(h) + 1);
    fence.col(wood[2], 1);
    fence.rect(Math.round(x), Math.round(y - h), w, Math.round(h));
    fence.col(wood[3], 1);
    fence.rect(Math.round(x), Math.round(y - h), 1, Math.round(h));
    if (grow < 1) sandPuff(f.above, [x, y - h], (frame - born) * 2, 8, 4, 4, 60 + n);
    if (crumble > 0) sandFall(f.above, [x, y], (frame - B.crumble) * 1.5, 20, 6, 4, 14, 70 + n);
  }
  // Two rails once three posts stand.
  if (frame >= B.fenceStart + 14 && crumble < 1) {
    for (const h of [6, 12]) {
      const hk = h * (1 - crumble);
      fence.col(wood[1], 1);
      fence.line(Math.round(far[0]), Math.round(far[1] - hk), Math.round(near[0]), Math.round(near[1] - hk - 2));
      fence.col(wood[3], 1);
      fence.line(Math.round(far[0]), Math.round(far[1] - hk - 1), Math.round(near[0]), Math.round(near[1] - hk - 3));
    }
  }
  // Sand streaming from his paw to the posts while he builds.
  if (hand && frame >= B.fenceStart && frame < B.fenceEnd) {
    for (let i = 0; i < 10; i++) {
      const k = ((frame * 0.12 + i / 10) % 1 + 1) % 1;
      const tx = far[0] + (near[0] - far[0]) * clamp01((frame - B.fenceStart) / (B.fenceEnd - B.fenceStart));
      const x = hand[0] + (tx - hand[0]) * k,
        y = hand[1] + (far[1] - 6 - hand[1]) * k - Math.sin(k * Math.PI) * 10;
      f.above.col(i % 2 ? sand[2] : sand[3], 0.9);
      f.above.rect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // Numbers over the fence for each jump, stars round the bonked sheep.
  const top: XY = [(near[0] + far[0]) / 2, Math.min(near[1], far[1]) - 34];
  digit(f.above, top, 1, frame - (B.jump0 + 6), 16);
  digit(f.above, top, 2, frame - (B.jump1 + 6), 16);
  digit(f.above, top, 3, frame - (B.jump2b + 4), 16);
  // Number four is him: it pops up over his head once he has landed behind the fence.
  const head = pt(f, 'head', B.selfOver + 3);
  if (head) digit(f.above, [head[0] + 17, head[1] - 20], 4, frame - (B.selfOver + 1), 20);
  if (frame >= B.bonk && frame < B.jump2b) {
    const sh = pt(f, 'sheep2');
    if (sh) for (let i = 0; i < 3; i++) {
      const a = frame * 0.45 + (i * TAU) / 3;
      sparkle(f.above, [sh[0] + Math.cos(a) * 7, sh[1] - 12 + Math.sin(a) * 2.5], 2, 0.95);
    }
  }
  dustCloud(f.under, pt(f, 'floor', B.selfOver) ?? f.feet, frame - B.selfOver, 10, 6, 10, 77);
  dustCloud(f.under, pt(f, 'floor', B.home) ?? f.feet, frame - B.home, 10, 6, 10, 78);
  second(f);
}
function umbrellaFlight(f: FxInput, frame: number) {
  const B = beats['trick_b-f2'];
  // A trail of sparkles behind him, from the takeoff till he settles home.
  if (frame >= B.takeoff && frame < B.land) {
    for (let k = 1; k <= 6; k++) {
      const at = pt(f, 'chest', frame - k * 2);
      if (!at) continue;
      sparkle(f.above, at, 3 - k * 0.4, 1 - k / 7);
    }
  }
  dustCloud(f.under, pt(f, 'floor', B.land) ?? f.feet, frame - B.land, 12, 6, 12, 81);
  second(f);
}
function showFx(f: FxInput, frame: number) {
  const B = beats.show;
  if (frame < B.land) {
    const rim = pt(f, 'umbRim');
    if (rim) sparkle(f.above, [rim[0] + ((frame * 5) % 15) - 7, rim[1] + 4 + ((frame * 3) % 9)], 2, 0.75);
  }
  dustCloud(f.under, pt(f, 'floor', B.land) ?? f.feet, frame - B.land, 12, 7, 12, 91);
  if (frame >= B.twirl && frame < B.twirl + 12) {
    const top = pt(f, 'umbTop');
    if (top) for (let i = 0; i < 4; i++) sparkle(f.above, [top[0] + Math.cos(frame * 0.6 + i * 1.6) * 8, top[1] + Math.sin(frame * 0.6 + i * 1.6) * 4], 2.2, 0.9);
  }
}
function hatchFx(f: FxInput, frame: number) {
  const B = beats.hatch;
  const home = pt(f, 'floor', 0) ?? f.feet;
  const ex = home[0],
    ey = home[1] - 15;
  const rx = 13,
    ry = 16;
  // The egg: lilac with gold moon and star prints; it rocks before the umbrella tip pokes through.
  const crumble = clamp01((frame - B.crumble) / 10);
  const topGone = frame >= B.open;
  if (crumble < 1) {
    const rock = frame < B.poke ? Math.sin(frame * 1.4) * 1.5 : 0;
    const p = f.under;
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / (y < 0 ? ry * 1.1 : ry)) ** 2;
        if (d > 1) continue;
        if (topGone && y < -2 + Math.round(Math.sin(x * 1.3) * 2)) continue;
        if (crumble > 0 && y > ry * (1 - 2 * crumble) - Math.round(Math.sin(x) * 2)) continue;
        const lit = (x + y) / (rx + ry);
        p.col(d > 0.86 ? shell[0] : lit < -0.35 ? shell[3] : lit < 0.1 ? shell[2] : shell[1], 1);
        p.rect(Math.round(ex + x + rock * (y / ry)), Math.round(ey + y), 1, 1);
      }
    if (!topGone) {
      // Gold moons and stars printed on the shell.
      sparkle(f.under, [ex - 4, ey - 6], 2, 1);
      sparkle(f.under, [ex + 5, ey + 4], 1.6, 1);
      p.col(sand[2], 1);
      p.rect(Math.round(ex + 3), Math.round(ey - 9), 2, 2);
      p.rect(Math.round(ex - 6), Math.round(ey + 6), 2, 2);
    }
    if (frame >= B.poke && !topGone) {
      // The umbrella tip pokes through the crack and wiggles: a violet point with the gold star finial.
      const up = Math.min(5, (frame - B.poke) * 1.2),
        wig = Math.round(Math.sin(frame * 1.7));
      const tx = Math.round(ex + wig),
        ty = Math.round(ey - ry - up + 2);
      for (let k = 0; k <= Math.round(up); k++) {
        const w = Math.max(0, Math.round(k / 2));
        f.above.col(canopyTip[k % 2], 1);
        f.above.rect(tx - w, ty + k, 2 * w + 1, 1);
      }
      sparkle(f.above, [tx, ty - 1], 1.8, 1);
      p.col(shell[0], 1);
      p.line(Math.round(ex - 4), Math.round(ey - 12), Math.round(ex), Math.round(ey - 8));
      p.line(Math.round(ex), Math.round(ey - 8), Math.round(ex + 3), Math.round(ey - 13));
    }
  }
  // While he is still inside, the front of the lower shell hides his feet.
  if (frame >= B.open && frame < B.out) {
    for (let y = 2; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2;
        if (d > 1 || y < 2 + Math.round(Math.sin(x * 1.3) * 2)) continue;
        const lit = (x + y) / (rx + ry);
        f.above.col(d > 0.86 || y < 4 + Math.round(Math.sin(x * 1.3) * 2) ? shell[0] : lit < 0.1 ? shell[2] : shell[1], 1);
        f.above.rect(Math.round(ex + x), Math.round(ey + y), 1, 1);
      }
  }
  // The top of the shell flies off in two halves when the umbrella pops open.
  const age = frame - B.open;
  if (age >= 0 && age < 18) {
    for (const s of [-1, 1]) {
      const x = ex + s * (6 + age * 2.2),
        y = ey - 14 - age * 3 + age * age * 0.35;
      ellFill(f.above, [x, y], 6, 3.5, shell[1], 1 - age / 18);
      ellFill(f.above, [x - 1, y - 1], 4, 2, shell[3], 1 - age / 18);
    }
    sandPuff(f.under, [ex, ey - 14], age, 14, 8, 14, 101);
  }
  if (crumble > 0 && crumble < 1) sandFall(f.above, [ex, ey + 10], (frame - B.crumble) * 2, 24, 14, 12, 12, 103);
}
function sleepFx(f: FxInput) {
  const head = pt(f, 'head');
  if (head) zzz(f.above, [head[0] + 6, head[1] - 4], frameOf(f), 36);
}
function landingDust(f: FxInput, frame: number, at: number) {
  dustCloud(f.under, pt(f, 'floor', at) ?? f.feet, frame - at, 12, 6, 12, 111);
}

export function sneakEffects(f: FxInput) {
  const frame = frameOf(f);
  switch (f.anim) {
    case 'trick':
      return invisible(f, frame);
    case 'trick_b':
      return dreamSand(f, frame);
    case 'phase':
      return awakening(f, frame);
    case 'trick-f2':
      return countingSheep(f, frame);
    case 'trick_b-f2':
      return umbrellaFlight(f, frame);
    case 'show':
      return showFx(f, frame);
    case 'hatch':
      return hatchFx(f, frame);
    case 'sleep':
      return sleepFx(f);
    case 'happy':
      landingDust(f, frame, beats.happy.land);
      if (frame >= beats.happy.open && frame < beats.happy.open + 14) {
        const top = pt(f, 'umbTop');
        if (top) for (let i = 0; i < 4; i++) sparkle(f.above, [top[0] + Math.cos(frame * 0.5 + i * 1.6) * 10, top[1] + 6 + Math.sin(frame * 0.5 + i * 1.6) * 4], 2.2, 0.9);
      }
      return;
    case 'fidget_a':
      if (frame >= beats.fidget_a.nose && frame < beats.fidget_a.nose + 6) {
        const n = pt(f, 'nose');
        if (n) for (let i = 0; i < 3; i++) sparkle(f.above, [n[0] + (i - 1) * 6, n[1] - 4], 2, 1 - (frame - beats.fidget_a.nose) / 6);
      }
      return;
    default:
      if (F2.has(f.anim)) second(f);
  }
}
