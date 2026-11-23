// Effects of Мурлен: doves and silk scarves, playing cards and the card door, star dust of the second form,
// flashes, the top hat on the floor, and the stage itself answering the tricks (footlights, moon, curtains).
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { disc, fillPoly, flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats } from './moon_magician-poses';
import { archHalf, drapeSpan, MOON } from '../scenes/magic_tent';

const ink = '#1d1a2b';
const dove = ['#3b3a58', '#bfc2dd', '#ecebfb', '#ffffff'];
const beak = '#e7a447';
const scarf = ['#d6425f', '#f2c046', '#4fb36f', '#4f7bd6', '#a25ad6', '#f07a3a'];
const cardFace = '#f7f3ea',
  cardShade = '#d9d2c6',
  cardBack = '#2c3c80',
  cardBackLit = '#4a5fb0',
  ruby = '#c8344f',
  coal = '#24232f';
const gold = ['#8a5f24', '#d4a64a', '#f6d77a', '#fff6c8'];
const starDust = ['#7f93e0', '#bccbff', '#eef2ff', '#ffe9a8'];
const smoke = ['#4b4560', '#6e6888', '#9a95b2', '#c9c5d8'];
const silk = ['#121220', '#24243a', '#3a3a55', '#5d5d7d'];
const F2 = new Set(['idle-f2', 'happy-f2', 'trick-f2', 'trick_b-f2']);

const frameOf = (f: FxInput) => f.t * 24;
const at = (f: FxInput, name: string, frame?: number): XY => (frame === undefined ? f.points[name] : f.pointAt(frame / 24, name)) ?? f.feet;
const mix = (a: XY, b: XY, k: number): XY => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const ease = (k: number) => k * k * (3 - 2 * k);

function poly(p: Pen, c: string, a: number, pts: XY[]) {
  p.col(c, a);
  fillPoly(p, pts.flat());
}
function sparkle(p: Pen, [x, y]: XY, size: number, a = 1, palette = gold) {
  if (a <= 0 || size <= 0) return;
  p.col(palette[1], a);
  star(p, x, y, size, 4, Math.PI / 4);
  p.col(palette[2], a);
  star(p, x, y, size * 0.62, 4, Math.PI / 4);
  flare(p, Math.round(x), Math.round(y), Math.max(1, Math.round(size * 0.9)), palette[3], a);
}
/** A five-point star of solid paint with a dark rim, the shape of the wand tip. */
function starShape(p: Pen, [x, y]: XY, r: number, rot: number, fill: string, a = 1, rim = ink) {
  const pts: XY[] = [];
  for (let k = 0; k < 10; k++) {
    const ang = rot + (k / 10) * TAU - Math.PI / 2,
      rad = k % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad]);
  }
  poly(p, rim, a, pts.map(([u, v]) => [x + (u - x) * 1.22, y + (v - y) * 1.22] as XY));
  poly(p, fill, a, pts);
  if (r > 4) poly(p, gold[3], a * 0.8, [pts[9], pts[0], pts[1], [x, y]]);
}
/** A white dove in flight: body, tail fan, head with beak and two wings that beat with `flap`. */
function drawDove(p: Pen, [x, y]: XY, s: number, flap: number, dir: number, a = 1) {
  const w = Math.sin(flap * TAU);
  const X = (u: number) => x + u * s * dir,
    Y = (v: number) => y + v * s;
  poly(p, ink, a, [[X(-6.5), Y(-0.5)], [X(-3), Y(-2.6)], [X(3.5), Y(-2.4)], [X(6.2), Y(-1.4)], [X(4), Y(2.4)], [X(-3), Y(2.6)], [X(-7.5), Y(2.2)]]);
  poly(p, dove[2], a, [[X(-5.6), Y(0)], [X(-2.6), Y(-1.8)], [X(3.4), Y(-1.6)], [X(5.2), Y(-0.9)], [X(3.4), Y(1.6)], [X(-2.6), Y(1.8)], [X(-6.4), Y(1.5)]]);
  poly(p, dove[1], a, [[X(-5.6), Y(0.6)], [X(3.4), Y(0.8)], [X(3.0), Y(1.6)], [X(-6.2), Y(1.4)]]);
  // Tail fan.
  poly(p, ink, a, [[X(-5), Y(-0.4)], [X(-10), Y(-2.4)], [X(-10.6), Y(2.6)], [X(-5), Y(1.4)]]);
  poly(p, dove[2], a, [[X(-5.4), Y(0)], [X(-9.4), Y(-1.6)], [X(-9.8), Y(1.9)], [X(-5.4), Y(1.0)]]);
  // Head and beak.
  disc((p.col(ink, a), p), X(5.6), Y(-1.8), 2.4 * s);
  disc((p.col(dove[3], a), p), X(5.6), Y(-1.9), 1.7 * s);
  poly(p, beak, a, [[X(7.2), Y(-2.2)], [X(9.0), Y(-1.6)], [X(7.2), Y(-1.1)]]);
  p.col(ink, a);
  p.rect(Math.round(X(6.0)), Math.round(Y(-2.4)), 1, 1);
  // Far wing behind, near wing in front; both rise and fall together.
  for (const near of [false, true]) {
    const lift = w * (near ? 9 : 7) * s,
      root: XY = [X(near ? 0.4 : 1.6), Y(-1)];
    const tip: XY = [X(near ? -5.5 : -3.5), root[1] - lift - 2 * s];
    const mid: XY = [X(near ? 3.0 : 3.4), root[1] - lift * 0.85 - 1.2 * s];
    poly(p, ink, a, [[root[0], root[1] + 1], mid, [tip[0] - dir, tip[1]], [X(-2), Y(0.5)]]);
    poly(p, near ? dove[3] : dove[1], a, [root, mid, tip, [X(-1.4), Y(0)]]);
    if (near) {
      p.col(dove[1], a);
      p.line(Math.round(mid[0]), Math.round(mid[1]), Math.round(tip[0]), Math.round(tip[1]));
    }
  }
}
/** A playing card, `turn` 0 = face, π = back; standing along its height axis rotated by `rot`. */
function drawCard(p: Pen, [x, y]: XY, h: number, turn: number, rot: number, a = 1, pip: 'heart' | 'spade' | 'star' = 'heart') {
  const width = h * 0.68 * Math.abs(Math.cos(turn)),
    face = Math.cos(turn) >= 0;
  if (width < 0.6) {
    const c = Math.cos(rot),
      s = Math.sin(rot);
    p.col(ink, a);
    p.line(Math.round(x + s * h * 0.5), Math.round(y - c * h * 0.5), Math.round(x - s * h * 0.5), Math.round(y + c * h * 0.5));
    return;
  }
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const P = (u: number, v: number): XY => [x + u * c - v * s, y + u * s + v * c];
  const hw = width / 2,
    hh = h / 2;
  poly(p, ink, a, [P(-hw - 1, -hh - 1), P(hw + 1, -hh - 1), P(hw + 1, hh + 1), P(-hw - 1, hh + 1)]);
  poly(p, face ? cardFace : cardBack, a, [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)]);
  if (h < 9) return;
  if (face) {
    poly(p, cardShade, a, [P(-hw, hh - h * 0.12), P(hw, hh - h * 0.12), P(hw, hh), P(-hw, hh)]);
    if (h > 30 && hw > 6) {
      const e = Math.max(2, h * 0.05);
      for (const [u0, v0, u1, v1] of [[-hw + e, -hh + e, hw - e, -hh + e + 1], [-hw + e, hh - e - 1, hw - e, hh - e], [-hw + e, -hh + e, -hw + e + 1, hh - e], [hw - e - 1, -hh + e, hw - e, hh - e]])
        poly(p, gold[1], a, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]);
    }
    const r = h * 0.17 * Math.abs(Math.cos(turn));
    if (pip === 'star') starShape(p, P(0, 0), h * 0.22, rot, gold[1], a);
    else {
      const col = pip === 'heart' ? ruby : coal;
      poly(p, col, a, [P(-r, -r * 0.3), P(0, r * 1.1), P(r, -r * 0.3), P(r * 0.5, -r), P(0, -r * 0.55), P(-r * 0.5, -r)]);
    }
    if (h > 18) {
      p.col(pip === 'spade' ? coal : ruby, a);
      const tl = P(-hw + 2, -hh + 2),
        br = P(hw - 3, hh - 3);
      p.rect(Math.round(tl[0]), Math.round(tl[1]), 2, 2);
      p.rect(Math.round(br[0]), Math.round(br[1]), 2, 2);
    }
  } else {
    poly(p, cardBackLit, a, [P(-hw + 2, -hh + 2), P(hw - 2, -hh + 2), P(hw - 2, hh - 2), P(-hw + 2, hh - 2)]);
    poly(p, cardBack, a, [P(-hw + 3, -hh + 3), P(hw - 3, -hh + 3), P(hw - 3, hh - 3), P(-hw + 3, hh - 3)]);
    if (h > 14) starShape(p, P(0, 0), Math.min(hw, hh) * 0.55, rot, gold[2], a, gold[0]);
  }
}
/** The top hat in 2D for the moments it leaves the cat: `opening` 1 shows it upside down, open side up. */
function drawHat(p: Pen, [x, y]: XY, s: number, opening: number, rot: number, a = 1) {
  const c = Math.cos(rot),
    sn = Math.sin(rot);
  const P = (u: number, v: number): XY => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
  const up = opening > 0.5;
  // Crown spans from the floor to the brim when upside down, from the brim upward when upright.
  const c0 = up ? 0 : -3,
    c1 = up ? -22 : -25;
  poly(p, ink, a, [P(-10.5, c0 + 1), P(10.5, c0 + 1), P(10.5, c1 - 1), P(-10.5, c1 - 1)]);
  poly(p, silk[1], a, [P(-9.5, c0), P(9.5, c0), P(9.5, c1), P(-9.5, c1)]);
  poly(p, silk[2], a, [P(-6.5, c0), P(-3.5, c0), P(-3.5, c1), P(-6.5, c1)]);
  const band = up ? [-18, -21] : [-3, -7];
  poly(p, '#9e3753', a, [P(-9.5, band[0]), P(9.5, band[0]), P(9.5, band[1]), P(-9.5, band[1])]);
  starShape(p, P(0, (band[0] + band[1]) / 2), 2.2 * s, rot, gold[2], a, gold[0]);
  const brimY = up ? -22 : -3;
  const centre = P(0, brimY);
  ellFill(p, [centre[0], centre[1] + 1], 15 * s, 4.2 * s, ink, a);
  ellFill(p, centre, 14 * s, 3.4 * s, silk[2], a);
  if (up) ellFill(p, [centre[0], centre[1] - 0.3], 9 * s, 2.2 * s, '#06060c', a);
  else ellFill(p, P(0, -25), 9.5 * s, 2.4 * s, silk[3], a);
}
function puff(p: Pen, centre: XY, age: number, life: number, size: number, seed: number) {
  if (age < 0 || age > life) return;
  const k = age / life,
    fade = 1 - progress(age, life * 0.6, life);
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * TAU + hash(i, seed) * 0.6,
      d = size * (0.3 + 0.7 * ease(Math.min(1, k * 1.6)));
    const c: XY = [centre[0] + Math.cos(ang) * d, centre[1] + Math.sin(ang) * d * 0.6 - k * 4];
    const r = size * (0.45 + 0.25 * hash(i, seed, 2)) * (1 - 0.5 * k);
    ellFill(p, [c[0], c[1] + 1], r, r * 0.85, smoke[0], fade);
    ellFill(p, c, r * 0.92, r * 0.78, smoke[1], fade);
    ellFill(p, [c[0] - r * 0.25, c[1] - r * 0.3], r * 0.55, r * 0.42, smoke[2], fade);
  }
}
function burst(p: Pen, centre: XY, age: number, life: number, count: number, reach: number, palette: string[], seed: number) {
  if (age < 0 || age > life) return;
  const k = age / life,
    fade = 1 - progress(age, life * 0.5, life);
  ellFill(p, centre, reach * 0.35 * (1 - k), reach * 0.35 * (1 - k), palette[3], Math.max(0, 1 - k * 2.5));
  oval(p, centre, reach * k * 1.1, reach * k * 0.8, palette[2], fade * 0.9);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * TAU + hash(i, seed) * 0.4,
      d = reach * ease(k) * (0.6 + 0.5 * hash(i, seed, 1));
    const pt: XY = [centre[0] + Math.cos(ang) * d, centre[1] + Math.sin(ang) * d * 0.8 + k * k * 6];
    if (i % 3 === 0) starShape(p, pt, 2.6 * (1 - k * 0.5), ang + k * 4, palette[2], fade, palette[0]);
    else sparkle(p, pt, 2.2 * (1 - k * 0.4), fade, [palette[0], palette[1], palette[2], palette[3]]);
  }
}
/** Darkens the stage behind the cat: the second form plays under the moon. */
function nightOver(f: FxInput, amount: number) {
  if (amount <= 0) return;
  const b = f.backdrop;
  b.col('#0b0e28', 0.42 * amount);
  b.rect(0, 0, f.w, f.h);
  // Moonlight answers: a halo round the moon in the arch, brighter stars there, a cool beam on the floor.
  oval(b, [MOON.x, MOON.y], MOON.r + 4 + Math.sin(f.t * 3), MOON.r + 4, '#9fb4ff', 0.5 * amount);
  oval(b, [MOON.x, MOON.y], MOON.r + 7, MOON.r + 7, '#5f74c8', 0.35 * amount);
  for (let i = 0; i < 12; i++) {
    const y = 14 + hash(i, 67) * 44,
      half = archHalf(Math.round(y)) ?? 0,
      x = 128 + (hash(i, 61) - 0.5) * 2 * Math.max(0, half - 4),
      tw = Math.sin(f.t * 4 + i * 1.7);
    if (tw > 0.2 && half > 6) sparkle(b, [x, y], 1.2 + tw, amount * (0.4 + 0.5 * tw), starDust);
  }
  b.col('#8fa6ff', 0.1 * amount);
  fillPoly(b, [100, 66, 156, 66, 134, 126, 64, 126]);
}
function formAmbient(f: FxInput, amount: number) {
  if (amount <= 0) return;
  const tip = at(f, 'wandTip');
  const tw = 0.5 + 0.5 * Math.sin(f.t * 9);
  sparkle(f.above, tip, 2 + 1.5 * tw, amount, starDust);
  // Star dust dripping from the hem of the night-sky cape.
  const hem = at(f, 'capeHem');
  for (let i = 0; i < 6; i++) {
    const life = 1.2,
      age = (f.t + i * 0.37) % life;
    const x = hem[0] + (hash(i, 7) - 0.5) * 34 + Math.sin(age * 5 + i) * 2,
      y = hem[1] - 6 + age * 18;
    const a = amount * (1 - age / life);
    f.under.col(starDust[i % 2 ? 2 : 1], a);
    f.under.rect(Math.round(x), Math.round(y), 1, 1);
    if (i % 3 === 0) sparkle(f.under, [x, y], 1.2, a * 0.8, starDust);
  }
  // A soft blue glow pooled on the floor under the cat.
  ellFill(f.under, [f.feet[0], f.feet[1] + 1], 30, 6, '#6f86e0', 0.16 * amount);
}
function footlightChase(f: FxInput, frame: number, from: number, to: number) {
  if (frame < from || frame > to) return;
  for (let k = 0; k < 10; k++) {
    const x = 18 + k * 24,
      on = (Math.floor((frame - from) / 3) + k) % 3 === 0;
    if (!on) continue;
    ellFill(f.backdrop, [x, f.h - 12], 7, 5, '#fff4c4', 0.55);
    ellFill(f.backdrop, [x, f.h - 12], 3, 2, '#ffffff', 0.9);
  }
}
function curtainRipple(f: FxInput, frame: number, from: number, to: number) {
  if (frame < from || frame > to) return;
  const k = (frame - from) / (to - from),
    a = 0.3 * Math.sin(k * Math.PI);
  // A ripple runs across the arch drapes, as if the night wind came through the artists' door.
  f.backdrop.col('#e07a92', a);
  for (const side of [-1, 1])
    for (let band = 0; band < 2; band++)
      for (let y = 10; y <= 66; y++) {
        const span = drapeSpan(side, y);
        if (!span) continue;
        const u = (k * 2 + band / 2 + y * 0.01) % 1;
        const x = Math.round(side < 0 ? span[1] - u * (span[1] - span[0]) : span[0] + u * (span[1] - span[0]));
        f.backdrop.rect(x, y, 1, 1);
      }
}

// ---- clips ---------------------------------------------------------------------------------------
function doves(f: FxInput, frame: number) {
  const b = beats.trick;
  for (const tap of [b.tap1, b.tap2]) {
    const age = frame - tap;
    if (age >= 0 && age < 8) sparkle(f.above, at(f, 'wandTip'), 4 - age * 0.4, 1 - age / 8);
  }
  // A chain of silk scarves pulled out of the hat on the wand hand.
  if (frame >= b.pullStart && frame < b.burst) {
    const from = at(f, 'hatOpening'),
      to = at(f, 'handR');
    const shown = Math.min(8, Math.floor((frame - b.pullStart) / 3) + 1);
    for (let i = 0; i < shown; i++) {
      const k = shown === 1 ? 1 : i / 7;
      const sag = Math.sin(k * Math.PI) * 8;
      const pt = mix(from, to, k);
      const wob = Math.sin(frame * 0.6 + i) * 0.4;
      const s = 3.6;
      const c = Math.cos(wob + 0.785),
        sn = Math.sin(wob + 0.785);
      const P = (u: number, v: number): XY => [pt[0] + u * c - v * sn, pt[1] + sag + u * sn + v * c];
      poly(f.above, ink, 1, [P(-s - 1, -s - 1), P(s + 1, -s - 1), P(s + 1, s + 1), P(-s - 1, s + 1)]);
      poly(f.above, scarf[i % scarf.length], 1, [P(-s, -s), P(s, -s), P(s, s), P(-s, s)]);
      poly(f.above, '#ffffff', 0.35, [P(-s, -s), P(0, -s), P(-s, 0)]);
    }
  }
  // The scarves burst into five doves that circle the stage, dive into the hat, one pops out again.
  const burstAt = at(f, 'handR', b.burst);
  burst(f.above, burstAt, frame - b.burst, 10, 10, 22, gold, 3);
  if (frame >= b.burst && frame < b.landHat) {
    for (let i = 0; i < 5; i++) {
      const k = (frame - b.burst) / (b.flyEnd - b.burst);
      const ang = -Math.PI / 2 + i * (TAU / 5) + Math.min(1, k) * TAU * 1.1;
      const loop: XY = [128 + Math.cos(ang) * (70 + i * 6), 74 + Math.sin(ang) * (22 + i * 3) - Math.sin(k * Math.PI) * 8];
      let pos = frame < b.burst + 6 ? mix(burstAt, loop, (frame - b.burst) / 6) : loop;
      if (frame >= b.flyEnd) pos = mix(loop, at(f, 'hatOpening'), ease((frame - b.flyEnd) / (b.landHat - b.flyEnd)));
      const near = Math.sin(ang) > 0;
      const scale = (near ? 1.7 : 1.15) * (frame >= b.flyEnd ? 1 - 0.45 * (frame - b.flyEnd) / 8 : 1);
      drawDove(near ? f.above : f.under, pos, scale, frame / 6 + i * 0.3, Math.cos(ang + Math.PI / 2) > 0 ? 1 : -1);
    }
  }
  if (frame >= b.popDove) {
    const age = frame - b.popDove,
      hatTop = at(f, 'hatTop');
    burst(f.above, hatTop, age, 8, 6, 12, gold, 5);
    drawDove(f.above, [hatTop[0] + age * 2.4, hatTop[1] - 4 - age * 3.5], 1.6, frame / 5, 1);
  }
}
function cardDoor(f: FxInput, frame: number) {
  const b = beats.trick_b;
  puff(f.above, at(f, 'handR', 6), frame - 6, 10, 5, 2);
  // Fan of seven cards in the left glove.
  if (frame >= b.fanStart && frame < b.springStart) {
    const k = ease(progress(frame, b.fanStart, b.fanEnd));
    const hand = at(f, 'handL');
    for (let i = 0; i < 7; i++) {
      const rot = (i - 3) * 0.24 * k - 0.2;
      drawCard(f.above, [hand[0] + Math.sin(rot) * 9, hand[1] - Math.cos(rot) * 9], 16, 0, rot, 1, i % 2 ? 'spade' : 'heart');
    }
  }
  // The spring: a stream of cards flies from the left glove to the right glove along an arc.
  if (frame >= b.springStart && frame < b.springEnd + 6) {
    const from = at(f, 'handL'),
      to = at(f, 'handR');
    for (let i = 0; i < 16; i++) {
      const k = progress(frame - b.springStart - i * 1.1, 0, 8);
      if (k <= 0 || k >= 1) continue;
      const pt = mix(from, to, k);
      drawCard(f.above, [pt[0], pt[1] - Math.sin(k * Math.PI) * 22], 12, k * Math.PI * 2, k * 1.5 - 0.7, 1, i % 2 ? 'spade' : 'heart');
    }
  }
  const door: XY = [f.feet[0] + 40, f.feet[1] - 2];
  // One card thrown up lands standing on the floor and grows into a door taller than the cat.
  if (frame >= b.throwUp && frame < b.cardBack + 8) {
    let h = 10,
      pos: XY = door,
      turn = 0,
      rot = 0;
    if (frame < b.cardLand) {
      const k = (frame - b.throwUp) / (b.cardLand - b.throwUp),
        hand = at(f, 'handR', b.throwUp);
      pos = [hand[0] + (door[0] - hand[0]) * k, hand[1] + (door[1] - 5 - hand[1]) * k - Math.sin(k * Math.PI) * 34];
      turn = k * TAU * 2;
      rot = k * 3;
    } else if (frame < b.growEnd) {
      h = 10 + 82 * ease((frame - b.cardLand) / (b.growEnd - b.cardLand));
      pos = [door[0], door[1] - h / 2];
    } else if (frame < b.cardBack) {
      h = 92;
      pos = [door[0], door[1] - h / 2];
      if (frame >= b.flipStart && frame < b.flipEnd) turn = ((frame - b.flipStart) / (b.flipEnd - b.flipStart)) * TAU;
    } else {
      const k = ease((frame - b.cardBack) / 8),
        hand = at(f, 'handL');
      h = 92 - 82 * k;
      pos = mix([door[0], door[1] - 46], hand, k);
      rot = -0.3 * k;
    }
    if (frame >= b.cardLand) pos = [pos[0], frame < b.cardBack ? door[1] - h / 2 : pos[1]];
    // In front of the cat only while he is inside the door.
    const pen = frame >= b.hopIn + 4 && frame < b.hopOut + 2 ? f.above : f.under;
    if (frame >= b.cardLand && frame < b.cardBack) ellFill(f.under, [door[0], door[1] + 1], h * 0.38, 3, '#1a1010', 0.35);
    drawCard(pen, pos, h, turn, rot, 1, 'star');
    if (frame >= b.growEnd && frame < b.flipStart) {
      const glint = (frame - b.growEnd) / (b.flipStart - b.growEnd);
      f.above.col('#ffffff', 0.6 * Math.sin(glint * Math.PI));
      f.above.line(Math.round(door[0] - 18 + glint * 36), Math.round(door[1] - 88), Math.round(door[0] - 26 + glint * 36), Math.round(door[1] - 8));
    }
  }
  footlightChase(f, frame, b.cardLand, b.flipEnd);
  if (frame >= b.caught && frame < b.caught + 8) {
    burst(f.above, at(f, 'handL', b.caught), frame - b.caught, 8, 6, 10, gold, 7);
    sparkle(f.above, at(f, 'wandTip'), 4 - (frame - b.caught) * 0.4, 1 - (frame - b.caught) / 8);
  }
}
function levitation(f: FxInput, frame: number) {
  const b = beats['trick-f2'];
  // Cards leave the left glove one by one, orbit as a ring, then spiral back into a deck.
  if (frame >= b.ringIn && frame < b.deck) {
    const centre = at(f, 'chest');
    for (let i = 0; i < 10; i++) {
      const born = b.ringIn + i * 1.4;
      if (frame < born) continue;
      const out = Math.min(1, (frame - born) / 8),
        back = progress(frame, b.ringOut + i * 0.6, b.deck);
      const ang = (i / 10) * TAU + (frame - b.ringIn) * 0.11;
      const rx = 50 * out * (1 - back),
        ry = 13 * out * (1 - back);
      const c: XY = mix([centre[0] + Math.cos(ang) * rx, centre[1] + 4 + Math.sin(ang) * ry], at(f, 'handL'), back);
      const near = Math.sin(ang) > 0;
      drawCard(near ? f.above : f.under, c, near ? 16 : 12, ang, 0.15 * Math.cos(ang), 1, i % 3 ? 'heart' : 'star');
    }
  }
  if (frame >= b.liftStart && frame < b.land + 4) {
    const k = Math.sin(progress(frame, b.liftStart, b.land + 4) * Math.PI);
    ellFill(f.under, [f.feet[0], f.feet[1] + 1], 26 + 6 * k, 5, '#9fb4ff', 0.25 * k);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + frame * 0.05;
      sparkle(f.under, [f.feet[0] + Math.cos(ang) * 28, f.feet[1] + Math.sin(ang) * 5], 1.4, k, starDust);
    }
  }
  if (frame >= b.deck && frame < b.deck + 8) burst(f.above, at(f, 'handL'), frame - b.deck, 8, 6, 12, starDust, 9);
}
function vanish(f: FxInput, frame: number) {
  const b = beats['trick_b-f2'];
  if (frame >= 10 && frame < b.vanish) {
    const centre = at(f, 'chest');
    for (let i = 0; i < 12; i++) {
      const k = (frame - 10) / (b.vanish - 10);
      const ang = i * 0.52 + frame * 0.35;
      const r = 26 - 14 * k;
      const pt: XY = [centre[0] + Math.cos(ang) * r, centre[1] + 10 - i * 4 + Math.sin(ang) * 4];
      sparkle(Math.sin(ang) > 0 ? f.above : f.under, pt, 1.6 + k, 0.4 + 0.6 * k, starDust);
    }
  }
  const floorHat = f.feet;
  burst(f.above, at(f, 'chest', b.vanish - 1), frame - b.vanish, 14, 18, 40, starDust, 11);
  puff(f.above, [floorHat[0], floorHat[1] - 20], frame - b.vanish, 16, 10, 4);
  curtainRipple(f, frame, b.vanish, b.emergeStart + 6);
  // The hat waits on the floor, wobbles, glows, and the cat climbs out of it.
  if (frame >= b.vanish && frame < b.hatUp + 6) {
    let pos: XY = [floorHat[0], floorHat[1]],
      rot = 0,
      opening = 1;
    if (frame >= b.wobble && frame < b.wobble + 12) rot = 0.12 * Math.sin((frame - b.wobble) * 1.4);
    let pen = frame < b.emergeEnd - 6 ? f.above : f.under;
    if (frame >= b.hatUp) {
      const k = ease((frame - b.hatUp) / 6),
        head = at(f, 'head');
      pos = mix(pos, [head[0] - 2, head[1] - 30], k);
      rot = k * TAU;
      opening = k > 0.5 ? 0 : 1;
      pen = f.above;
    }
    if (frame >= b.wobble && frame < b.emergeEnd) ellFill(f.above, [floorHat[0], floorHat[1] - 22], 9, 2.2, '#bccbff', 0.5 + 0.4 * Math.sin(frame));
    f.propAt?.('hat', pos);
    drawHat(pen, pos, 1.25, opening, rot);
  }
  if (frame >= b.hatUp + 6 && frame < b.hatUp + 14) sparkle(f.above, at(f, 'wandTip'), 4, 1 - (frame - b.hatUp - 6) / 8, starDust);
}
function phase(f: FxInput, frame: number) {
  const b = beats.phase;
  if (frame >= 10 && frame < b.flash) {
    const centre = at(f, 'chest');
    for (let i = 0; i < 10; i++) {
      const k = (frame - 10) / (b.flash - 10);
      const ang = i * 0.63 + frame * 0.4;
      const pt: XY = [centre[0] + Math.cos(ang) * (28 - 10 * k), centre[1] + 16 - k * 30 - i * 2 + Math.sin(ang) * 5];
      sparkle(Math.sin(ang) > 0 ? f.above : f.under, pt, 1.5 + k * 1.5, 0.5 + 0.5 * k, starDust);
    }
  }
  const age = frame - b.flash;
  if (age >= 0 && age < 6) {
    const c = at(f, 'chest', b.flash);
    ellFill(f.above, c, 40 - age * 4, 52 - age * 5, '#ffffff', 0.85 - age * 0.14);
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * TAU;
      f.above.col('#eef2ff', 0.8 - age * 0.13);
      f.above.line(Math.round(c[0]), Math.round(c[1]), Math.round(c[0] + Math.cos(ang) * (60 + age * 6)), Math.round(c[1] + Math.sin(ang) * (48 + age * 5)));
    }
  }
  burst(f.above, at(f, 'chest', b.flash), age, 16, 16, 44, starDust, 13);
  nightOver(f, progress(frame, 14, 32));
  formAmbient(f, progress(frame, b.flash, b.flash + 8));
}
function show(f: FxInput, frame: number) {
  const b = beats.show;
  const floor: XY = [f.feet[0], f.feet[1]];
  // The stage dims and a narrow light finds the hat during the stall.
  const dim = progress(frame, b.stallStart, b.stallStart + 10) * (1 - progress(frame, b.burst, b.burst + 16));
  if (dim > 0) {
    f.backdrop.col('#05060f', 0.5 * dim);
    f.backdrop.rect(0, 0, f.w, f.h);
    ellFill(f.backdrop, [floor[0], floor[1] - 2], 26, 7, '#ffe9b0', 0.35 * dim);
  }
  if (frame < b.hatOn) {
    let pos: XY = floor,
      rot = 0,
      opening = 1;
    if (frame < b.hatLand) {
      const k = frame / b.hatLand;
      pos = [floor[0], floor[1] - 150 * (1 - k * k)];
      rot = (1 - k) * 5;
    } else if (frame < b.stallStart) {
      const k = (frame - b.hatLand) / (b.stallStart - b.hatLand);
      pos = [floor[0], floor[1] - Math.abs(Math.sin(k * Math.PI * 2)) * 6 * (1 - k)];
    } else if (frame >= 48 && frame < b.burst) pos = [floor[0] + (frame % 2 ? 1 : -1), floor[1]];
    let pen = frame < b.emergeEnd ? f.above : f.under;
    if (frame >= b.hatUp) {
      const k = ease((frame - b.hatUp) / (b.hatOn - b.hatUp)),
        head = at(f, 'head');
      pos = mix(floor, [head[0] - 2, head[1] - 30], k);
      rot = k * TAU;
      opening = k > 0.5 ? 0 : 1;
      pen = f.above;
    }
    if (frame < b.hatLand) ellFill(f.under, [floor[0], floor[1] + 1], 6 + 8 * (frame / b.hatLand), 2.5, '#140c0c', 0.4);
    f.propAt?.('hat', pos);
    drawHat(pen, pos, 1.25, opening, rot);
  }
  burst(f.above, [floor[0], floor[1] - 24], frame - b.burst, 16, 20, 50, gold, 15);
  if (frame >= b.burst && frame < b.burst + 40)
    for (let i = 0; i < 3; i++) {
      const k = (frame - b.burst) / 40,
        dir = i === 1 ? 0 : i === 0 ? -1 : 1;
      drawDove(f.above, [floor[0] + dir * 110 * k + (i === 1 ? 20 * k : 0), floor[1] - 30 - 120 * k], 1.6, frame / 5 + i * 0.3, dir >= 0 ? 1 : -1);
    }
  if (frame >= b.hatOn && frame < b.hatOn + 30) {
    const k = (frame - b.hatOn) / 30;
    for (let i = 0; i < 12; i++) {
      const x = floor[0] + (hash(i, 17) - 0.5) * 120,
        y = floor[1] - 130 + k * 120 + hash(i, 19) * 20;
      f.above.col(scarf[i % scarf.length], 1 - k);
      f.above.rect(Math.round(x + Math.sin(frame * 0.3 + i) * 3), Math.round(y), 2, 2);
    }
  }
}
export function magicianEffects(f: FxInput) {
  const frame = frameOf(f);
  const anim = f.anim;
  if (F2.has(anim)) {
    nightOver(f, 1);
    formAmbient(f, 1);
  }
  switch (anim) {
    case 'idle': {
      const g = frame - 40;
      if (g >= 0 && g < 4) flare(f.above, Math.round(at(f, 'monocle')[0]), Math.round(at(f, 'monocle')[1]), 3 - g * 0.6, '#ffffff', 1 - g / 4);
      break;
    }
    case 'look': {
      const g = frame - 18;
      if (g >= 0 && g < 6) flare(f.above, Math.round(at(f, 'monocle')[0]), Math.round(at(f, 'monocle')[1]), 4 - g * 0.6, '#ffffff', 1 - g / 6);
      break;
    }
    case 'fidget_a': {
      const g = frame - 28;
      if (g >= 0 && g < 10) sparkle(f.above, at(f, 'wandTip'), 4 - g * 0.3, 1 - g / 10);
      break;
    }
    case 'fidget_b': {
      const hand = at(f, 'handL');
      puff(f.above, [hand[0], hand[1] - 8], frame - 10, 8, 4, 6);
      if (frame >= 12 && frame < 36) drawCard(f.above, [hand[0] + 1, hand[1] - 9], 13, Math.max(0, (frame - 18) / 12) * Math.PI * 2, -0.15, 1, 'star');
      puff(f.above, [hand[0], hand[1] - 8], frame - 36, 8, 4, 8);
      break;
    }
    case 'happy':
      if (frame >= 6 && frame < 32)
        for (let i = 0; i < 4; i++) {
          const pt = at(f, 'wandTip', Math.max(0, frame - i * 2));
          sparkle(f.above, pt, 3 - i * 0.6, 1 - i * 0.22);
        }
      puff(f.above, at(f, 'hatTop', 18), frame - 18, 8, 4, 10);
      break;
    case 'happy-f2':
      for (const clap of [7, 32]) {
        const c = mix(at(f, 'handL', clap), at(f, 'handR', clap), 0.5);
        burst(f.above, c, frame - clap, 14, 14, 30, starDust, clap);
      }
      break;
    case 'trick':
      doves(f, frame);
      break;
    case 'trick_b':
      cardDoor(f, frame);
      break;
    case 'trick-f2':
      levitation(f, frame);
      break;
    case 'trick_b-f2':
      vanish(f, frame);
      break;
    case 'phase':
      phase(f, frame);
      break;
    case 'show':
      show(f, frame);
      break;
    case 'peek': {
      const g = frame - 26;
      if (g >= 0 && g < 12) sparkle(f.above, at(f, 'hatTop'), 4 - g * 0.25, 1 - g / 12);
      break;
    }
    case 'hatch': {
      puff(f.above, [f.feet[0], f.feet[1] - 30], frame - beats.hatch.puff, 18, 14, 12);
      burst(f.above, [f.feet[0], f.feet[1] - 40], frame - beats.hatch.appear, 12, 12, 34, gold, 21);
      break;
    }
    case 'wake_startled': {
      const g = frame - 8;
      if (g >= 0 && g < 8) sparkle(f.above, at(f, 'hatTop'), 3, 1 - g / 8);
      break;
    }
  }
}
