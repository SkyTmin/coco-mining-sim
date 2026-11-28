// The world of «Миг назад». Everything Кайрос's magic moves is drawn here, from one function of WORLD time τ:
// the nest, the eggs, the leaves the gust tears off, the wind. The trick maps painting frames to world time: forward
// until the snap, backwards (eased) while the sand pours, forward again from the moment he turned back to. Because
// the same function draws both directions, the rewind is the exact past played backwards — nothing is invented.
// After he presses the nest into the fork, the second gust finds it held.
import { hash, hx, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { FORK, HOME_FLOOR, TREE_FLOOR } from '../scenes/kairos_orchard';
import type { FxInput } from '../types';
import { beats } from './kairos-poses';

const T = beats.trick;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (u: number) => {
  const k = clamp(u);
  return k * k * (3 - 2 * k);
};
const ease = (a: number, b: number, n: number) => smooth((n - a) / (b - a));

/** World time at a painting frame of the trick. */
export function worldTime(n: number) {
  if (n < T.snap) return n;
  if (n < T.rewindEnd) {
    const u = (n - T.snap) / (T.rewindEnd - T.snap);
    // Slow to start, fast in the middle, slow to stop: the conductor winds it up and lets it settle.
    return T.snap - (T.snap - T.worldFrom) * smooth(u);
  }
  return T.worldFrom + (n - T.rewindEnd);
}
/** 0..1 strength of the gust at world time τ (both gusts are the same wind in world time). */
function gustAt(tau: number) {
  return ease(T.gust, T.gust + 6, tau) * (1 - ease(T.gust + 22, T.gust + 34, tau));
}

// ---- sprites
const nestCache = new Map<string, ReturnType<Px['canvas']>>();
function nestSprite(tilt: number, eggs: number, chick: number) {
  const key = Math.round(tilt * 20) + ':' + eggs + ':' + Math.round(chick * 8);
  const hit = nestCache.get(key);
  if (hit) return hit;
  // Drawn at 1.4× the first draft so the nest and the eggs read at the painting's own size.
  const p = new Px(42, 32),
    c = Math.cos(tilt),
    s = Math.sin(tilt);
  const at = (x: number, y: number): [number, number] => [21 + x * c - y * s, 19 + x * s + y * c];
  const set = (x: number, y: number, col: string) => p.set(...at(x, y), hx(col));
  const fill = (cx: number, cy: number, rx: number, ry: number, col: (x: number, y: number) => string) => {
    for (let y = Math.floor(-ry - 1); y <= ry + 1; y++)
      for (let x = Math.floor(-rx - 1); x <= rx + 1; x++)
        if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) set(cx + x, cy + y, col(x / rx, y / ry));
  };
  if (eggs) {
    for (const [ex, ey, k] of [[-5, -2.2, 0], [0.5, -3.4, 1], [5.4, -2.0, 2]] as const) {
      if (k === 1 && chick > 0) continue;
      fill(ex, ey, 3.1, 4.0, (u, v) => (u < -0.1 && v < -0.1 ? '#fbf8ee' : v > 0.35 || u > 0.55 ? '#c9cdbf' : '#e9ebdf'));
      set(ex + 1, ey - 1, '#7f9aa2');
      set(ex - 1, ey + 1, '#7f9aa2');
      set(ex + 1, ey + 2, '#7f9aa2');
    }
    if (chick > 0) {
      const up = 4 * chick;
      fill(0.5, -3.6 - up, 3.3, 3.5, (u, v) => (u < -0.1 && v < -0.2 ? '#fff2a0' : v > 0.4 ? '#d8a838' : '#f0c850'));
      set(1.8, -4.4 - up, '#1d1d24');
      set(2.0, -4.4 - up, '#1d1d24');
      for (const x of [3.4, 4.4, 5.2]) set(x, -3.4 - up, '#e8743a');
      set(4.4, -2.8 - up, '#c85a2a');
      for (let x = -3; x <= 3; x++) set(-0.5 + x, -8.4 - up - (Math.abs(x) < 2 ? 1 : 0), '#e9ebdf');
      fill(0.5, -0.4, 3.1, 1.6, () => '#d9dccd');
    }
  }
  // The bowl: woven twigs, dark inside, lit rim strands on top.
  fill(0, 1.6, 15.5, 6.4, (u, v) => {
    const strand = Math.sin(u * 19 + v * 13) > 0.35;
    return v < -0.25 ? (strand ? '#a8875a' : '#7d5f3e') : strand ? '#6b4e33' : v > 0.45 ? '#3a2a1c' : '#54402c';
  });
  for (let x = -14; x <= 14; x += 2) set(x, -2.6 + (x % 4 === 0 ? 0 : 1), '#c9a873');
  for (const [x, y, u, v] of [[-16, 1, -19, -2], [15, 0, 19, -3], [-12, 6, -16, 8], [11, 6, 16, 7]] as const) {
    for (let i = 0; i <= 5; i++) set(x + ((u - x) * i) / 5, y + ((v - y) * i) / 5, '#5c4430');
  }
  const out = p.canvas();
  nestCache.set(key, out);
  return out;
}
function eggSprite(broken: number, spin: number) {
  const p = new Px(11, 11);
  const c = Math.cos(spin),
    s = Math.sin(spin);
  for (let y = -5; y <= 5; y++)
    for (let x = -5; x <= 5; x++) {
      const X = x * c + y * s,
        Y = -x * s + y * c;
      if ((X / 3.1) ** 2 + (Y / 4.0) ** 2 > 1) continue;
      // A broken egg is two shell halves with a jagged crack between them, the yolk spilled.
      if (broken > 0.5 && Math.abs(Y + 0.3 * Math.sin(X * 3)) < 0.8) {
        p.set(5 + x, 5 + y, hx('#f2b638'));
        continue;
      }
      p.set(5 + x, 5 + y, hx(X < 0 && Y < 0 ? '#fbf8ee' : Y > 0 ? '#c9cdbf' : '#e9ebdf'));
    }
  if (broken > 0.5) {
    p.set(5 - 2, 5 + 1, hx('#7f6a40'));
    p.set(5 + 2, 5 - 1, hx('#7f6a40'));
  }
  return p.canvas();
}
function leaf(f: FxInput, x: number, y: number, a: number, k: number, big = 1, gold = false) {
  // A small apple leaf: a lit blade, a dark edge and a stem, turning as it flutters.
  const pen = f.backdrop;
  const dx = Math.cos(a),
    dy = Math.sin(a) * 0.6;
  const L = 2.6 * big;
  pen.col(gold ? '#7a4a18' : '#2c4a30');
  for (let i = -L - 0.5; i <= L + 0.5; i += 0.5) pen.dot(x + dx * i, y + dy * i + 1);
  pen.col(gold ? '#f0b440' : k > 0.6 ? '#7ea04a' : k > 0.3 ? '#a4bc5e' : '#d8b848');
  for (let i = -L; i <= L; i += 0.5) {
    const w = Math.round((1 - (i / L) ** 2) * 1.4 * big);
    for (let j = -w; j <= w - 1; j++) pen.dot(x + dx * i - dy * j, y + dy * i + dx * j * 0.6);
  }
  pen.col('#d8d07a');
  pen.dot(x - dx * L * 0.4, y - dy * L * 0.4 - 1);
  pen.col('#5a4430');
  pen.dot(x + dx * (L + 1), y + dy * (L + 1));
}
// ---- the nest's path in world time (before he steps in)
const SLIDE_TO = FORK[0] - 9,
  FALL_X = FORK[0] - 16;
function nestFree(tau: number) {
  if (tau < T.gust) return { x: FORK[0], y: FORK[1], tilt: 0, onGround: false };
  if (tau < T.slip) {
    const u = ease(T.gust + 4, T.slip, tau);
    const sway = Math.sin(tau * 1.7) * 0.06 * gustAt(tau);
    return { x: FORK[0] + (SLIDE_TO - FORK[0]) * u, y: FORK[1] - 0.6 * u, tilt: -0.18 * u + sway, onGround: false };
  }
  if (tau < T.land) {
    const u = (tau - T.slip) / (T.land - T.slip);
    return { x: SLIDE_TO + (FALL_X - SLIDE_TO) * u, y: FORK[1] + (TREE_FLOOR - 4 - FORK[1]) * u * u, tilt: -0.18 - 1.9 * u, onGround: false };
  }
  // Lies tipped on its side in the grass.
  const bounce = Math.max(0, Math.sin((tau - T.land) * 0.6) * Math.exp(-(tau - T.land) * 0.25)) * 3;
  return { x: FALL_X - 2, y: TREE_FLOOR - 4 - bounce, tilt: -2.1, onGround: true };
}
// Where each egg goes when the nest hits the ground.
const EGGS = [
  { dx: -12, dy: 4, spin: 1.2 },
  { dx: 7, dy: 7, spin: -0.8 },
  { dx: -3, dy: 9, spin: 2.4 },
];
function drawEggsOut(f: FxInput, tau: number, base: { x: number; y: number }) {
  const u = clamp((tau - T.land) / 10);
  EGGS.forEach((e, i) => {
    const x = base.x + e.dx * smooth(u),
      y = base.y - 2 + e.dy * smooth(u) - 6 * Math.sin(Math.PI * u);
    f.backdrop.col('#ffffff');
    f.backdrop.img(eggSprite(u > 0.3 ? 1 : 0, e.spin * u + i), x - 5, y - 5);
  });
  // Yolk splash and shell bits the instant they crack.
  if (u > 0.3 && u < 0.9) {
    f.backdrop.col('#f2b638', 0.8);
    for (let i = 0; i < 6; i++) f.backdrop.dot(base.x + (hash(i, 7) - 0.5) * 22, base.y + 4 + hash(i, 8) * 5);
  }
}
// ---- leaves torn off by a gust; each has its own launch point on the branch tufts and a seeded drift.
const LEAVES = Array.from({ length: 16 }, (_, i) => ({
  x0: 146 + hash(i, 21) * 54,
  y0: 66 + hash(i, 22) * 26,
  start: T.gust + 2 + hash(i, 23) * 16,
  drift: 40 + hash(i, 24) * 70,
  fall: 0.5 + hash(i, 25) * 0.6,
  k: hash(i, 26),
}));
function drawLeaves(f: FxInput, tau: number, gustStart: number) {
  for (const L of LEAVES) {
    const age = tau - (L.start - T.gust + gustStart);
    if (age <= 0) continue;
    const u = Math.min(age, 60);
    const x = L.x0 - L.drift * (1 - Math.exp(-u / 22)) + 3 * Math.sin(u * 0.3 + L.k * 6);
    const ground = (x > 140 ? TREE_FLOOR : HOME_FLOOR) - 2 - L.k * 8;
    const y = Math.min(ground, L.y0 + L.fall * u * 1.4 + 2 * Math.cos(u * 0.4));
    leaf(f, x, y, u * 0.4 + L.k * TAU, L.k);
  }
}
function drawWind(f: FxInput, tau: number) {
  const g = gustAt(tau);
  if (g < 0.02) return;
  for (let i = 0; i < 9; i++) {
    const y = 60 + hash(i, 31) * 110,
      speed = 7 + hash(i, 32) * 4;
    const x = 270 - ((tau * speed + hash(i, 33) * 300) % 320);
    const len = 10 + hash(i, 34) * 18;
    f.backdrop.col('#f8f4e6', 0.45 * g);
    f.backdrop.line(x, y, x + len, y - 1);
    f.backdrop.line(x + len * 0.4, y + 1, x + len, y);
  }
}
// ---- the rewind look: a teal world, a great dial in the sky turning anticlockwise, sand motes rising.
function drawRewind(f: FxInput, n: number) {
  const k = ease(T.snap - 2, T.snap + 6, n) * (1 - ease(T.rewindEnd - 4, T.rewindEnd + 2, n));
  if (k <= 0.01) return;
  f.backdrop.col('#0c4048', 0.42 * k);
  f.backdrop.rect(0, 0, f.w, f.h);
  const cx = 128,
    cy = 44,
    R = 40;
  const spin = -(n - T.snap) * 0.16;
  f.backdrop.col('#8cf4ee', 0.75 * k);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU;
    f.backdrop.dot(cx + R * Math.cos(a), cy + R * 0.8 * Math.sin(a));
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + spin * 0.2;
    const r0 = i % 3 ? R - 4 : R - 7;
    f.backdrop.line(cx + r0 * Math.cos(a), cy + r0 * 0.8 * Math.sin(a), cx + (R - 1) * Math.cos(a), cy + (R - 1) * 0.8 * Math.sin(a));
  }
  f.backdrop.col('#e8fffc', 0.9 * k);
  for (const [len, sp] of [[R - 10, spin], [R - 18, spin / 12]] as const) {
    const a = sp - Math.PI / 2;
    f.backdrop.line(cx, cy, cx + len * Math.cos(a), cy + len * 0.8 * Math.sin(a));
    f.backdrop.line(cx + 1, cy, cx + 1 + len * Math.cos(a), cy + len * 0.8 * Math.sin(a));
  }
  f.light.col('#2ec4c4', 0.25 * k);
  f.light.dot(cx - 1, cy - 1, 3, 3);
  // Motes of sand drift UP — the falling grains of the world, played backwards.
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 41) * f.w,
      life = (n * (0.6 + hash(i, 42)) + hash(i, 43) * 200) % 200;
    const y = f.h - life;
    f.light.col(i % 3 ? '#8cf4ee' : '#fff0c0', 0.5 * k);
    f.light.dot(x + 2 * Math.sin(n * 0.1 + i), y);
  }
}
// ---- the instant of the tick: a ring of light out of his chest.
function drawTick(f: FxInput, n: number, at: number, strength: number) {
  const age = n - at;
  if (age < 0 || age > 14) return;
  const c = f.points.waist ?? f.feet;
  const r = 4 + age * 6,
    a = (1 - age / 14) * strength;
  f.light.col('#e8fffc', 0.7 * a);
  for (let i = 0; i < 48; i++) {
    const q = (i / 48) * TAU;
    f.light.dot(c[0] + r * Math.cos(q), c[1] + r * 0.7 * Math.sin(q));
  }
}

function nestAtRest(f: FxInput, chick = 0) {
  f.backdrop.col('#ffffff');
  f.backdrop.img(nestSprite(0, 1, chick), FORK[0] - 21, FORK[1] - 19);
}
export function kairosEffects(f: FxInput) {
  const n = Math.round(f.t * 24);
  if (f.anim === 'trick') {
    const tau = worldTime(n);
    const held = n >= T.press;
    // The wind blows in world time, so in the rewind it blows backwards; the second gust is the same wind.
    drawWind(f, tau);
    if (!held) {
      drawLeaves(f, tau, T.gust);
      const s = nestFree(tau);
      f.backdrop.col('#ffffff');
      f.backdrop.img(nestSprite(s.tilt, s.onGround ? 0 : 1, 0), s.x - 21, s.y - 19);
      if (s.onGround) drawEggsOut(f, tau, s);
    } else {
      // Pressed into the fork: the second gust only rocks it a little; the leaves still go.
      drawLeaves(f, tau, T.gust);
      const g = gustAt(tau);
      const chick = ease(T.chick, T.chick + 8, n);
      f.backdrop.col('#ffffff');
      f.backdrop.img(nestSprite(0.05 * Math.sin(n * 0.9) * g, 1, chick), FORK[0] - 21, FORK[1] - 19 + (n < T.calm ? 1 : 0));
      if (n >= T.chick && n < T.chick + 14) {
        f.light.col('#fff2a0', 0.6 * (1 - (n - T.chick) / 14));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU,
            r = 4 + (n - T.chick);
          f.light.dot(FORK[0] + r * Math.cos(a), FORK[1] - 6 + r * 0.7 * Math.sin(a));
        }
      }
    }
    drawRewind(f, n);
    drawTick(f, n, T.snap, 1);
    drawTick(f, n, T.rewindEnd, 0.6);
    drawTick(f, n, T.flipAt + T.flipAir, 0.8);
    return;
  }
  nestAtRest(f);
  if (f.anim === 'fidget_a') {
    // One leaf falls from the tip of the branch to his feet; one grain drops; the leaf jumps back up.
    const b = beats.fidget_a;
    const x0 = 138,
      y0 = 72,
      x1 = 112,
      y1 = HOME_FLOOR - 1;
    let u = 0;
    if (n < b.leafFall) u = 0;
    else if (n < b.grain) u = (n - b.leafFall) / (b.grain - b.leafFall - 4);
    else if (n < b.leafBack) u = 1;
    else u = 1 - (n - b.leafBack) / (b.leafHome - b.leafBack);
    u = clamp(u);
    if (n >= b.leafFall && n < b.leafHome) {
      const x = x0 + (x1 - x0) * u + 4 * Math.sin(u * 9),
        y = y0 + (y1 - y0) * u;
      leaf(f, x, y, u * 7, 0.7, 2, true);
      if (n >= b.leafBack) {
        // Going back, it leaves a turquoise trail: the one grain of time it is riding.
        for (let i = 1; i <= 6; i++) {
          const w = clamp(u + i * 0.035),
            tx = x0 + (x1 - x0) * w + 4 * Math.sin(w * 9),
            ty = y0 + (y1 - y0) * w;
          f.light.col('#8cf4ee', 0.55 * (1 - i / 7));
          f.light.dot(tx, ty, 2, 2);
        }
      }
    }
    if (n >= b.grain - 2 && n < b.leafBack + 6) {
      // One grain drops through the waist: a star of light at the brass ring.
      const c = f.points.waist ?? f.feet;
      const age = n - b.grain + 2,
        a = 1 - age / 10;
      f.light.col('#fff0c0', 0.9 * a);
      f.light.dot(c[0] - 1, c[1] - 1, 3, 3);
      f.light.col('#8cf4ee', 0.6 * a);
      for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) f.light.dot(c[0] + dx * (1 + age * 0.2), c[1] + dy * (1 + age * 0.2));
    }
  }
}
