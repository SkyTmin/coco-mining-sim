// Effects of Котёл: fog and shine on the glass, knock rings and valve puffs, landing dust, the sand mound of the hatch,
// sleepy bubbles with «z», the water spit and the steam of the rocket, its crater and fall shadow, dizzy stars, soap
// bubbles that it pops one by one. Timelines read the beats of the pose book; positions read the crab's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats } from './kettle_crab-poses';

const sand = ['#8a7250', '#a8906a', '#bca07a', '#ccb088', '#dcc298', '#e8d2a8', '#f2e0b8'];
const steam = ['#8c98a8', '#c4ced8', '#e6ecf2', '#ffffff'];
const water = ['#1e5a7a', '#4a94b8', '#9ad4ea', '#ffffff'];
const soap = ['#6a9ad0', '#9ad0f0', '#e8c4f4', '#ffffff'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];

const frameOf = (f: FxInput) => f.t * 24;
const mix = (a: XY, b: XY, k: number): XY => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const ease = (k: number) => k * k * (3 - 2 * k);
/** A socket now, or at an earlier frame of this clip; null where the socket does not exist. */
function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, frame) / 24, name);
  } catch {
    return null;
  }
}

/** A soft cloud: a shaded base, a light body and a bright cap towards the light. */
function puff(p: Pen, [x, y]: XY, r: number, a: number, palette = steam) {
  if (a <= 0 || r < 0.6) return;
  ellFill(p, [x + r * 0.25, y + r * 0.3], r, r * 0.82, palette[1], a);
  ellFill(p, [x, y], r * 0.86, r * 0.72, palette[2], a);
  ellFill(p, [x - r * 0.3, y - r * 0.32], r * 0.46, r * 0.38, palette[3], a);
}
/** Puffs leaving a point, rising, swelling and fading; `drift` pushes them sideways. */
function steamCloud(p: Pen, at: XY, age: number, life: number, count: number, rise: number, spread: number, seed: number, size = 1, drift = 0) {
  for (let i = 0; i < count; i++) {
    const k = (age - i * 1.6) / life;
    if (k < 0 || k > 1) continue;
    const side = (hash(i, seed, 1) - 0.5) * 2;
    const x = at[0] + side * spread * Math.sqrt(k) + drift * k + Math.sin(k * 5 + i) * 1.2,
      y = at[1] - rise * (0.3 + 0.7 * hash(i, seed, 2)) * Math.sqrt(k);
    puff(p, [x, y], size * (1.6 + 4.4 * k), 0.92 * (1 - k * k));
  }
}
/** Ballistic droplets or grains from a point; `up` is the launch bias (negative = upwards on screen). */
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
    if (i % 4 === 0) {
      p.col(palette[palette.length - 1], fade);
      p.rect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
/** Sound arcs «)) ((» on both sides of a struck point. */
function soundRings(p: Pen, [x, y]: XY, age: number, life: number) {
  if (age < 0 || age > life) return;
  for (let k = 0; k < 2; k++) {
    const r = 3 + (age - k * 2) * 2.2;
    if (r < 3) continue;
    const a = (1 - age / life) * (k ? 0.65 : 1);
    oval(p, [x, y], r, r * 0.85, gold[2], a, -0.7, 0.7);
    oval(p, [x, y], r, r * 0.85, gold[2], a, Math.PI - 0.7, Math.PI + 0.7);
  }
  if (age < 3) {
    p.col(gold[1], 1 - age / 3);
    star(p, x, y, 4 - age, 4, 0.4);
    flare(p, Math.round(x), Math.round(y), 3, gold[3], 1 - age / 3);
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
/** A small soap bubble: a coloured rim (blue below, pink above), a faint body and a glint. */
function bubble(p: Pen, [x, y]: XY, r: number, a = 1) {
  if (a <= 0 || r < 0.8) return;
  ellFill(p, [x, y], r, r, soap[1], a * 0.3);
  oval(p, [x, y], r, r, soap[0], a, -0.3, Math.PI + 0.3);
  oval(p, [x, y], r, r, soap[2], a, Math.PI + 0.3, TAU - 0.3);
  if (r > 2.5) oval(p, [x, y], r - 1, r - 1, soap[1], a * 0.6, 0.4, Math.PI - 0.4);
  p.col(soap[3], a);
  const s = r > 3 ? 2 : 1;
  p.rect(Math.round(x - r * 0.5), Math.round(y - r * 0.55), s, s);
}
/** A bubble bursting: a broken ring flying apart and droplets. */
function pop(p: Pen, at: XY, age: number, seed: number) {
  if (age < 0 || age > 8) return;
  const r = 3 + age * 1.6,
    a = 1 - age / 8;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU + hash(seed, i, 4) * 0.4;
    const x0 = at[0] + Math.cos(ang) * r,
      y0 = at[1] + Math.sin(ang) * r;
    p.col(i % 2 ? soap[2] : soap[1], a);
    p.line(Math.round(x0), Math.round(y0), Math.round(x0 + Math.cos(ang) * 1.6), Math.round(y0 + Math.sin(ang) * 1.6));
  }
  spray(p, at, age, 8, 6, 40, water, seed, -0.3, 80, 2);
}
/** A sleepy «z» of pixel lines. */
function zed(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col('#2a3a5a', a);
  p.line(X, Y, X + S, Y);
  p.line(X + S, Y, X, Y + S);
  p.line(X, Y + S, X + S, Y + S);
}
/** The pile of sand the buried helmet sits in: shaded mound with a lit crest, grains and a pebble. */
function mound(p: Pen, [x, y]: XY, rx: number, top: number, bottom: number, a = 1, seed = 3) {
  if (a <= 0 || rx < 1) return;
  for (let row = Math.floor(y - top); row <= Math.ceil(y + bottom); row++) {
    const v = row < y ? (y - row) / top : (row - y) / bottom;
    const half = rx * Math.sqrt(Math.max(0, 1 - v * v)) * (row < y ? 0.82 + 0.18 * (1 - v) : 1);
    if (half < 0.5) continue;
    const shade = row < y ? 5 - Math.round(v * 2) : 3 - Math.round(v * 2);
    p.col(sand[Math.max(1, Math.min(6, shade))], a);
    p.span(Math.round(x - half), row, Math.round(half * 2));
    // Grains and dither speckle.
    for (let i = 0; i < half / 3; i++) {
      const gx = Math.round(x - half + hash(seed, row, i) * half * 2);
      p.col(sand[hash(seed, gx, row) > 0.5 ? 6 : 1], a * 0.8);
      p.rect(gx, row, 1, 1);
    }
  }
  p.col(sand[6], a);
  p.line(Math.round(x - rx * 0.5), Math.round(y - top * 0.7), Math.round(x + rx * 0.2), Math.round(y - top * 0.95));
  ellFill(p, [x + rx * 0.55, y + bottom * 0.3], 1.6, 1.1, '#7a6a5a', a);
}

export function crabEffects(f: FxInput) {
  const frame = frameOf(f);
  switch (f.anim) {
    case 'fidget_a': {
      const { huff, wipe, shine } = beats.fidget_a;
      const port = pt(f, 'port'),
        mouth = pt(f, 'mouth', huff);
      // The breath: three little puffs from the mouth up to the glass, then fog that the claw wipes away.
      if (mouth && port && frame >= huff && frame < huff + 6) {
        const k = (frame - huff) / 6;
        for (let i = 0; i < 3; i++) puff(f.above, mix(mouth, port, Math.min(1, k + i * 0.12)), 1.4 + i * 0.4, 0.75 * (1 - k * 0.6));
      }
      if (port && frame >= huff + 3 && frame < shine) {
        const fog = Math.min(1, (frame - huff - 3) / 3) * (1 - progress(frame, wipe + 2, shine - 2));
        ellFill(f.above, port, 5, 4.5, '#e8f4f8', fog * 0.55);
        ellFill(f.above, [port[0] - 1, port[1] - 1], 3, 2.5, '#ffffff', fog * 0.45);
      }
      if (port && frame >= shine && frame < shine + 8) sparkle(f.above, [port[0] - 1, port[1] - 3], 5 - (frame - shine) * 0.5, 1 - (frame - shine) / 8);
      break;
    }
    case 'fidget_b': {
      const { knock1, knock2, knock3, puff: blow } = beats.fidget_b;
      for (const k of [knock1, knock2, knock3]) {
        const hit = pt(f, 'clawRTip', k);
        if (hit) soundRings(f.above, hit, frame - k, 9);
      }
      const valve = pt(f, 'valve', blow);
      if (valve) steamCloud(f.above, valve, frame - blow, 14, 4, 26, 6, 51, 1, 4);
      break;
    }
    case 'happy': {
      const { land } = beats.happy;
      for (const foot of ['footL1', 'footR1']) {
        const at = pt(f, foot + 'Ground', land);
        if (at) steamCloud(f.under, at, frame - land, 10, 3, 6, 9, foot.length, 0.8, foot === 'footL1' ? -6 : 6);
      }
      const tip = pt(f, 'clawRTip');
      for (const at of [31, 35]) if (tip && frame >= at && frame < at + 4) sparkle(f.above, tip, 3 - (frame - at) * 0.6, 1 - (frame - at) / 4);
      break;
    }
    case 'hatch': {
      const { shake, eyes, claw, burst } = beats.hatch;
      const home = f.feet;
      // The mound hides everything below the sand until the burst, then slumps flat and settles.
      const slump = progress(frame, burst - 1, burst + 5);
      if (frame < burst + 10)
        mound(f.above, [home[0] + 2, home[1] - 3 + slump * 6], 34 + slump * 6, 7 * (1 - slump) + 1, 16 * (1 - slump) + 2, 1 - progress(frame, burst + 6, burst + 10));
      for (const at of [shake, shake + 6]) spray(f.above, [home[0], home[1] - 12], frame - at, 8, 8, 30, sand, at, -0.8, 110);
      spray(f.above, [home[0] + 10, home[1] - 10], frame - eyes, 8, 6, 24, sand, 7, -0.9, 110);
      spray(f.above, [home[0] + 18, home[1] - 8], frame - claw, 9, 10, 40, sand, 11, -0.8, 120);
      spray(f.above, [home[0], home[1] - 10], frame - burst, 14, 26, 70, sand, 13, -0.75, 140, 1.4);
      steamCloud(f.under, [home[0], home[1] - 2], frame - burst, 14, 5, 10, 22, 17, 1.1);
      // Shaking off the sand that stuck to the helmet.
      const helmet = pt(f, 'helmet');
      if (helmet) spray(f.above, helmet, frame - 39, 10, 12, 34, sand, 19, 0.2, 120, 2);
      break;
    }
    case 'sleep': {
      // A bubble with a «z» rises from the valve once a second and pops.
      const valve = pt(f, 'valve');
      if (!valve) break;
      for (let i = 0; i < 3; i++) {
        const age = (frame + i * 24) % 72;
        const k = age / 40;
        if (k > 1) continue;
        const at: XY = [valve[0] + 3 + Math.sin(k * 6 + i) * 2 + k * 6, valve[1] - 3 - k * 22];
        bubble(f.above, at, 2.2 + k * 2.8, 1 - progress(k, 0.85, 1));
        zed(f.above, [at[0] + 4, at[1] - 6], 2.5 + k * 2, 1 - progress(k, 0.7, 1));
      }
      break;
    }
    case 'sleep_in': {
      const home = f.feet;
      steamCloud(f.under, [home[0], home[1] - 2], frame - 21, 8, 3, 4, 14, 23, 0.7);
      break;
    }
    case 'wake_startled': {
      // Shock lines round the crab as it bursts out.
      const head = pt(f, 'eyeR');
      if (head && frame >= 2 && frame < 8) {
        const a = 1 - (frame - 2) / 6;
        f.above.col('#ffffff', a);
        for (let i = 0; i < 7; i++) {
          const ang = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
          const r0 = 10 + (frame - 2) * 2;
          f.above.line(Math.round(head[0] + Math.cos(ang) * r0), Math.round(head[1] + Math.sin(ang) * r0), Math.round(head[0] + Math.cos(ang) * (r0 + 4)), Math.round(head[1] + Math.sin(ang) * (r0 + 4)));
        }
      }
      break;
    }
    case 'trick':
      steamRocket(f, frame);
      break;
    case 'trick_b':
      bubbles(f, frame);
      break;
  }
}

function steamRocket(f: FxInput, frame: number) {
  const b = beats.trick;
  const home = f.feet;
  // Spit: a water jet arcs from the mouth onto the hot dome and splashes.
  const mouth = pt(f, 'mouth', b.spit),
    crown = pt(f, 'valve', b.splash);
  if (mouth && crown && frame >= b.spit && frame < b.splash + 2) {
    const k = Math.min(1, (frame - b.spit) / (b.splash - b.spit - 1));
    const top: XY = [(mouth[0] + crown[0]) / 2 + 10, Math.min(mouth[1], crown[1]) - 22];
    const at = (q: number): XY => [mouth[0] * (1 - q) ** 2 + 2 * top[0] * q * (1 - q) + crown[0] * q * q, mouth[1] * (1 - q) ** 2 + 2 * top[1] * q * (1 - q) + crown[1] * q * q];
    const tail = Math.max(0, k - 0.6) + progress(frame, b.splash - 1, b.splash + 2) * 0.4;
    const n = 16;
    for (const [w, c] of [[3, water[0]], [2, water[2]], [1, water[3]]] as [number, string][])
      for (let i = 0; i <= n; i++) {
        const q = tail + (k - tail) * (i / n);
        if (q > k) continue;
        const [x, y] = at(q);
        f.above.col(c, 1);
        f.above.rect(Math.round(x - (w - 1) / 2), Math.round(y - (w - 1) / 2), w, w);
      }
    // Droplets shed along the arc.
    for (let i = 0; i < 6; i++) {
      const q = tail + (k - tail) * hash(i, frame, 3);
      const [x, y] = at(q);
      f.above.col(water[2], 0.9);
      f.above.rect(Math.round(x + (hash(i, 5) - 0.5) * 6), Math.round(y + 2 + hash(i, frame, 6) * 4), 1, 1);
    }
  }
  // Splash on the hot copper: droplets jump and a hissing cloud rises from the dome.
  if (crown) {
    spray(f.above, crown, frame - b.splash, 10, 16, 56, water, 31, -0.75, 120, 1.6);
    steamCloud(f.above, [crown[0] - 4, crown[1] + 2], frame - b.splash, 18, 9, 30, 16, 33, 1.5, 4);
  }
  // The valve whistles: a thin white jet with a wavy note line, twice.
  const valve = pt(f, 'valve');
  for (const at of [20, 24]) {
    const age = frame - at;
    if (valve && age >= 0 && age < 5) {
      const a = 1 - age / 5;
      f.above.col(steam[3], a);
      f.above.line(Math.round(valve[0]), Math.round(valve[1] - 2), Math.round(valve[0] + 2), Math.round(valve[1] - 9 - age * 2));
      f.above.col(steam[2], a);
      for (let i = 0; i < 6; i++) f.above.rect(Math.round(valve[0] + 5 + i), Math.round(valve[1] - 8 + Math.sin(i * 1.4 + age) * 1.5), 1, 1);
    }
  }
  // Rattling: steam squirts from under the breastplate on both sides, the sand jitters.
  if (frame >= b.rattle && frame < b.launch) {
    const power = progress(frame, b.rattle, b.launch);
    for (const s of [-1, 1]) {
      const k = ((frame * 0.37 + (s > 0 ? 0.5 : 0)) % 1) * 1;
      puff(f.above, [home[0] + s * (18 + k * 10 * power), home[1] - 6 - k * 6], 1.5 + k * 3 * power, (1 - k) * (0.5 + 0.5 * power));
    }
    if (valve && frame % 3 === 0) puff(f.above, [valve[0] + 1, valve[1] - 4 - (frame % 6)], 1.5 + power * 2, 0.8);
    for (let i = 0; i < 6; i++) {
      const gx = home[0] - 20 + hash(i, frame, 41) * 40;
      f.under.col(sand[hash(i, frame, 42) > 0.5 ? 6 : 1], 0.8);
      f.under.rect(Math.round(gx), Math.round(home[1] - 1 - hash(i, frame, 43) * 3 * power), 1, 1);
    }
  }
  // Launch: a blast of steam at the ground, a crater ring, flying clods, a steam column up through the field.
  const lift = frame - b.launch;
  if (lift >= 0 && lift < 40) {
    const fade = 1 - progress(lift, 22, 40);
    ellFill(f.under, [home[0], home[1] + 1], 20, 5, sand[0], 0.85 * fade);
    ellFill(f.under, [home[0], home[1]], 15, 3.4, '#6a5838', 0.9 * fade);
    oval(f.under, [home[0], home[1] + 1], 20, 5, sand[5], fade, Math.PI, TAU);
    // The column of steam left behind, thinning from the bottom.
    for (let i = 0; i < 12; i++) {
      const y = home[1] - 12 - i * 9 - Math.min(lift, 6) * 0;
      const k = Math.min(1, lift / 6);
      if (y < -10 || i > lift * 2.5) continue;
      const a = fade * k * (1 - i * 0.04) * (1 - progress(lift, 10 + i, 24 + i));
      puff(f.above, [home[0] + Math.sin(i * 1.3 + lift * 0.3) * 2, y], 5 + i * 0.4 + lift * 0.12, a);
    }
  }
  spray(f.above, [home[0], home[1] - 3], lift, 18, 22, 80, sand, 47, -0.85, 150, 1.2);
  steamCloud(f.under, [home[0], home[1] - 4], lift, 22, 8, 12, 30, 49, 1.4);
  // A spark of the rocket high up in the sky while it is away.
  if (frame >= 60 && frame < 70) sparkle(f.above, [home[0] + 18, 8 + (frame - 60) * 0.4], 2.5 - (frame - 60) * 0.15, 1 - progress(frame, 66, 70), gold);
  // The fall: a growing shadow marks the spot, whistle lines above it.
  if (frame >= b.fall && frame < b.land) {
    const k = (frame - b.fall) / (b.land - b.fall);
    ellFill(f.under, [home[0], home[1]], 6 + 16 * ease(k), 2 + 4 * ease(k), '#3a2e22', 0.25 + 0.35 * k);
  }
  // Landing: a dust ring and sand thrown out, then dizzy stars round the eyes.
  spray(f.above, [home[0], home[1] - 2], frame - b.land, 14, 20, 60, sand, 53, -0.6, 140, 1.6);
  steamCloud(f.under, [home[0], home[1] - 3], frame - b.land, 14, 6, 6, 26, 55, 1.1);
  const eyes = pt(f, 'eyeR');
  if (eyes && frame >= b.out && frame < 100)
    for (let i = 0; i < 3; i++) {
      const a = (frame - b.out) * 0.45 + (i * TAU) / 3;
      sparkle(f.above, [eyes[0] - 4 + Math.cos(a) * 11, eyes[1] - 8 + Math.sin(a) * 3.5], 2.4, 1 - progress(frame, 97, 100), gold);
    }
  const tip = pt(f, 'clawRTip');
  if (tip && frame >= b.tada && frame < b.tada + 10) sparkle(f.above, [tip[0], tip[1] - 3], 5 - (frame - b.tada) * 0.4, 1 - (frame - b.tada) / 10);
}

function bubbles(f: FxInput, frame: number) {
  const b = beats.trick_b;
  // Four bubbles leave the mouth and drift to where a claw will catch them; each pops on its beat.
  const plan: [number, number, string][] = [
    [b.blow, b.pop1, 'clawRTip'],
    [b.blow + 4, b.pop2, 'clawLTip'],
    [b.blow + 8, b.pop3, 'clawRTip'],
    [b.blow + 9, b.pop4, 'clawRTip'],
  ];
  plan.forEach(([born, popAt, socket], i) => {
    const mouth = pt(f, 'mouth', born),
      target = pt(f, socket, popAt);
    if (!mouth || !target) return;
    if (frame >= born && frame < popAt) {
      const k = ease((frame - born) / (popAt - born));
      const at: XY = [mouth[0] + (target[0] - mouth[0]) * k + Math.sin(frame * 0.4 + i * 2) * 2 * (1 - k), mouth[1] + (target[1] - mouth[1]) * k - Math.sin(k * Math.PI) * 10];
      bubble(f.above, at, 2 + Math.min(1, (frame - born) / 4) * (3 + i * 0.4));
    }
    pop(f.above, target, frame - popAt, 60 + i);
  });
  // The big bubble starts at the mouth and swells until the drawn one around the crab takes over.
  const mouth = pt(f, 'mouth');
  if (mouth && frame >= 51 && frame < b.big) bubble(f.above, [mouth[0] + 3, mouth[1] - 1], 2 + (frame - 51) * 2.2);
  // Pop of the big bubble high up: a flash at the poking claw, the skin flying apart as short strokes, droplets.
  const body = pt(f, 'body', b.poke),
    poke = pt(f, 'clawRTip', b.poke - 1);
  if (body) {
    const age = frame - b.poke;
    if (age >= 0 && age < 10) {
      const r = 48 + age * 3,
        a = 1 - age / 10;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * TAU + hash(i, 71) * 0.3;
        const x = body[0] + Math.cos(ang) * r,
          y = body[1] - 2 + Math.sin(ang) * r * 0.92 + age * age * 0.3;
        f.above.col(i % 2 ? water[1] : soap[0], a);
        for (const o of [0, 1]) f.above.line(Math.round(x) + o, Math.round(y), Math.round(x + Math.cos(ang) * 4) + o, Math.round(y + Math.sin(ang) * 4));
        f.above.col(water[3], a);
        f.above.rect(Math.round(x + Math.cos(ang) * 4), Math.round(y + Math.sin(ang) * 4), 2, 1);
      }
      if (poke && age < 4) sparkle(f.above, poke, 6 - age * 1.2, 1 - age / 4, ['#2e6a88', '#9ad4ea', '#e8fbff', '#ffffff']);
    }
    spray(f.above, body, frame - b.poke, 14, 18, 50, water, 73, -0.2, 120, 2);
  }
  // Landing splash and the shake that throws the last water off.
  const home = f.feet;
  spray(f.above, [home[0], home[1] - 2], frame - b.land, 12, 14, 50, sand, 81, -0.6, 140, 1.6);
  const helmet = pt(f, 'helmet', 101);
  if (helmet) spray(f.above, helmet, frame - 101, 9, 12, 44, water, 83, 0.1, 110, 2);
}
