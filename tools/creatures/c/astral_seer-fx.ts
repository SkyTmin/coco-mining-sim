// Effects of Астрал: the meadow answering its power (cracks, the torn-out hole, clods and dust, the hole healing over
// with new grass), shell chips and the comet trail of the flicked crystal, the new star born in the sky, teleport
// implosions and the glass ripple, the rune circle and shockwave of the awakening, the starlight streams and the
// galaxy of the star storm, the double's trails, the rift in the sky of the show, the crystal egg of the hatch.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress, shard } from '../fx/field';
import { disc, fillPoly, flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, gesture } from './astral_seer-poses';
import { CREST } from '../scenes/star_meadow';

const teal = ['#0e5a66', '#2ec4c8', '#8ef2ea', '#e8fffc'];
const gold = ['#8a6020', '#d4a040', '#ffe08a', '#fff6d0'];
const light = ['#6ec8f0', '#c8f0ff', '#ffffff', '#ffe08a'];
const stone = ['#3c4058', '#6c7290', '#a4aac2', '#d2d6e4'];
const dirt = ['#140f12', '#241a1c', '#3a2a26', '#4e3a30'];
const grass = ['#10241c', '#1a3a2a', '#285238', '#3a6a48', '#5a8a5a'];
const violet = ['#140a2e', '#2e1a5e', '#5a3aa0', '#9a7ae0', '#e0d0ff'];
const F2 = new Set(['idle-f2', 'happy-f2', 'trick-f2', 'trick_b-f2']);

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
function poly(p: Pen, c: string, a: number, pts: XY[]) {
  if (a <= 0) return;
  p.col(c, a);
  fillPoly(p, pts.flat());
}
function sparkle(p: Pen, [x, y]: XY, size: number, a = 1, palette = light) {
  if (a <= 0 || size <= 0) return;
  p.col(palette[0], a);
  star(p, x, y, size, 4, Math.PI / 4);
  p.col(palette[1], a);
  star(p, x, y, size * 0.62, 4, Math.PI / 4);
  flare(p, Math.round(x), Math.round(y), Math.max(1, Math.round(size * 0.9)), palette[2], a);
}
/** Particles flung from a point, falling back under gravity; `shape` chooses chips, clods or sparks. */
function burst(p: Pen, at: XY, age: number, life: number, count: number, reach: number, palette: string[], seed: number, shape: 'chip' | 'spark' | 'clod' = 'spark') {
  if (age < 0 || age > life) return;
  const k = age / life,
    fade = 1 - progress(age, life * 0.6, life);
  for (let i = 0; i < count; i++) {
    const a = TAU * hash(i, seed, 1),
      v = reach * (0.45 + 0.55 * hash(i, seed, 2));
    const x = at[0] + Math.cos(a) * v * Math.sqrt(k),
      y = at[1] + Math.sin(a) * v * 0.7 * Math.sqrt(k) + 26 * k * k * (shape === 'spark' ? 0.4 : 1) - (shape === 'clod' ? 18 * k * (1 - k) * 2 : 0);
    if (shape === 'chip') shard(p, x, y, 2.4 * Math.cos(a + age), 2.4 * Math.sin(a + age), 1.6, palette[(i % 2) + 1], palette[0], fade);
    else if (shape === 'clod') {
      p.col(palette[i % 2 ? 2 : 3], fade);
      p.rect(Math.round(x) - 1, Math.round(y) - 1, 2 + (i % 2), 2);
    } else if (i % 3 === 0) sparkle(p, [x, y], 2.2 * (1 - k) + 0.8, fade, palette);
    else {
      p.col(palette[1 + (i % 2)], fade);
      p.rect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
/** A ring that contracts to a point (implosion) or grows from it (arrival). */
function blinkRing(p: Pen, c: XY, age: number, life: number, implode: boolean, size: number) {
  if (age < 0 || age > life) return;
  const k = age / life,
    r = implode ? size * (1 - ease(k)) + 1 : size * ease(k) + 1;
  oval(p, c, r, r * 0.9, teal[2], (implode ? 0.5 + 0.5 * k : 1 - k) * 0.9);
  oval(p, c, r * 0.7, r * 0.63, light[1], (implode ? k : 1 - k) * 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + k * 2,
      d = implode ? (1 - k) * size * 1.3 : k * size * 1.3;
    sparkle(p, [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d * 0.8], 1.6, 1 - Math.abs(k - 0.5) * 1.2, light);
  }
}

// ---- the awakened form answering ----------------------------------------------------------------
function awakened(f: FxInput) {
  const b = f.backdrop;
  // The Milky Way brightens and a few stars swell while the third eye is open.
  for (let i = 0; i < 10; i++) {
    const x = 10 + hash(i, 41) * 236,
      y = 6 + hash(i, 43) * (CREST - 14),
      tw = Math.sin(f.t * 5 + i * 1.9);
    if (tw > 0) sparkle(b, [x, y], 1 + 1.6 * tw, 0.35 + 0.5 * tw, light);
  }
  // Motes rise from the six crystals and dissolve.
  const chest = pt(f, 'chest') ?? f.feet;
  for (let i = 0; i < 7; i++) {
    const life = 1.1,
      age = (f.t + i * 0.31) % life;
    const x = chest[0] + (hash(i, 7) - 0.5) * 46 + Math.sin(age * 6 + i) * 2,
      y = chest[1] + 18 - age * 34;
    const a = 1 - age / life;
    f.above.col(teal[i % 2 ? 2 : 3], a);
    f.above.rect(Math.round(x), Math.round(y), 1, 1);
    if (i % 3 === 0) sparkle(f.under, [x, y], 1.2, a * 0.8, teal);
  }
  ellFill(f.under, [f.feet[0], f.feet[1] + 1], 30, 6, '#2ec4c8', 0.14);
  oval(f.under, [f.feet[0], f.feet[1] + 1], 26 + Math.sin(f.t * 4), 5, teal[2], 0.25);
}

// ---- trick: stone into a star -------------------------------------------------------------------
function stoneIntoStar(f: FxInput, frame: number) {
  const B = beats.trick;
  const hole = pt(f, 'rockGround', B.burst) ?? [f.feet[0] + 28, f.feet[1] + 6];
  // The ground trembles: cracks race out from the spot, pebbles hop, dust puffs.
  if (frame >= B.tremble && frame < B.healEnd) {
    const grow = progress(frame, B.tremble, B.burst),
      heal = progress(frame, B.healStart, B.healEnd);
    const reach = 18 * grow * (1 - heal);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.4 * hash(i, 3);
      let [x, y] = hole;
      const glow = frame < B.burst + 30 ? 1 - progress(frame, B.burst, B.burst + 30) : 0;
      for (let s = 1; s <= 4; s++) {
        const nx = hole[0] + Math.cos(a + 0.25 * Math.sin(s * 2 + i)) * reach * (s / 4),
          ny = hole[1] + Math.sin(a + 0.25 * Math.sin(s * 2 + i)) * reach * (s / 4) * 0.4;
        f.under.col(dirt[0], 0.9 * (1 - heal));
        f.under.line(Math.round(x), Math.round(y) + 1, Math.round(nx), Math.round(ny) + 1);
        f.under.col(teal[1 + (s % 2)], (0.35 + 0.55 * glow) * (1 - heal));
        f.under.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny));
        [x, y] = [nx, ny];
      }
      if (frame < B.burst + 30) {
        f.under.col(teal[1], 0.5 * grow * (1 - progress(frame, B.burst, B.burst + 30)));
        f.under.rect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (frame < B.burst)
      for (let i = 0; i < 7; i++) {
        const hop = Math.abs(Math.sin((frame + i * 3) * 1.3)) * 3 * grow;
        const x = hole[0] + (hash(i, 9) - 0.5) * 34,
          y = hole[1] + (hash(i, 11) - 0.5) * 10;
        f.under.col(stone[1 + (i % 2)], 1);
        f.under.rect(Math.round(x), Math.round(y - hop), 2, 1);
      }
  }
  // The hole stays open until the seer heals it.
  if (frame >= B.burst) {
    const k = 1 - ease(progress(frame, B.healStart + 4, B.healEnd));
    if (k > 0.02) {
      ellFill(f.under, [hole[0], hole[1] + 1], 13 * k, 4.6 * k, dirt[3], 1);
      ellFill(f.under, hole, 11 * k, 3.8 * k, dirt[1], 1);
      ellFill(f.under, [hole[0] + 1, hole[1] - 0.5], 7 * k, 2.4 * k, dirt[0], 1);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        f.under.col(i % 3 ? dirt[2] : grass[2], 1);
        f.under.rect(Math.round(hole[0] + Math.cos(a) * 14 * k), Math.round(hole[1] + Math.sin(a) * 5 * k), 2, 1);
      }
    }
  }
  // Clods and a dust ring as the rock bursts out.
  burst(f.above, [hole[0], hole[1] - 4], frame - B.burst, 14, 16, 30, dirt, 5, 'clod');
  if (frame >= B.burst && frame < B.burst + 12) {
    const k = (frame - B.burst) / 12;
    oval(f.under, hole, 10 + 22 * k, 3 + 7 * k, '#5a5a6a', 0.6 * (1 - k));
    for (let i = 0; i < 6; i++) ellFill(f.under, [hole[0] + Math.cos(i) * (10 + 18 * k), hole[1] + Math.sin(i) * (3 + 5 * k)], 3 + 3 * k, 2 + k, '#4a4a58', 0.35 * (1 - k));
  }
  // Earth trickles from the hovering rock.
  const rock = pt(f, 'rock');
  if (rock && frame > B.burst + 2 && frame < B.squeeze + 2)
    for (let i = 0; i < 5; i++) {
      const life = 10,
        age = (frame + i * 2.3) % life;
      f.above.col(dirt[2 + (i % 2)], 1 - age / life);
      f.above.rect(Math.round(rock[0] + (hash(i, 13) - 0.5) * 14), Math.round(rock[1] + 8 + age * age * 0.3), 1, 1 + (i % 2));
    }
  // Glow seeping through the cracks while it is squeezed.
  if (rock && frame >= B.squeeze && frame < B.shatter) {
    const k = progress(frame, B.squeeze, B.shatter);
    ellFill(f.above, rock, 10 * k + 2, 9 * k + 2, teal[2], 0.18 * k);
  }
  // The shell bursts into chips; the crystal shines.
  const crystal = pt(f, 'rock', B.shatter) ?? hole;
  burst(f.above, crystal, frame - B.shatter, 16, 14, 34, stone, 17, 'chip');
  burst(f.above, crystal, frame - B.shatter, 14, 12, 26, teal, 19, 'spark');
  if (frame >= B.shatter && frame < B.shatter + 6) sparkle(f.above, crystal, 9 - (frame - B.shatter), 1, light);
  if (rock && frame > B.shatter + 3 && frame < B.flick) {
    const tw = 0.5 + 0.5 * Math.sin(frame * 0.9);
    sparkle(f.above, [rock[0] + 6, rock[1] - 7], 1.5 + 1.5 * tw, 0.8, light);
  }
  // Comet trail behind the flicked crystal; it lingers a few frames after it leaves the painting.
  if (frame >= B.flick && frame < B.gone + 6) {
    const head = Math.min(frame, B.gone - 2);
    const pts: XY[] = [];
    for (let k = Math.max(B.flick, head - 5); k <= head; k++) {
      const p = pt(f, 'rock', k);
      if (p) pts.push(p);
    }
    const fade = 1 - progress(frame, B.gone - 2, B.gone + 6);
    for (let i = 1; i < pts.length; i++) {
      const w = (i / pts.length) * 4.5;
      f.under.col(teal[0], 0.35 * fade);
      for (let o = -Math.round(w + 2); o <= Math.round(w + 2); o++) f.under.line(Math.round(pts[i - 1][0] + o), Math.round(pts[i - 1][1]), Math.round(pts[i][0] + o), Math.round(pts[i][1]));
      f.above.col(teal[1], 0.6 * fade);
      for (let o = -Math.round(w); o <= Math.round(w); o++) f.above.line(Math.round(pts[i - 1][0] + o), Math.round(pts[i - 1][1]), Math.round(pts[i][0] + o), Math.round(pts[i][1]));
      f.above.col(light[2], fade);
      f.above.line(Math.round(pts[i - 1][0]), Math.round(pts[i - 1][1]), Math.round(pts[i][0]), Math.round(pts[i][1]));
      if (i % 2) sparkle(f.above, [pts[i][0] + (hash(i, frame) - 0.5) * 8, pts[i][1] + 4], 1.4, fade, light);
    }
  }
  // A new star is born in the sky where the crystal flew.
  if (frame >= B.starBorn) {
    const exit = pt(f, 'rock', B.gone - 4) ?? [f.feet[0] + 30, 0];
    const sky: XY = [Math.max(16, Math.min(f.w - 16, exit[0] + 4)), 22];
    const age = frame - B.starBorn;
    const settle = Math.max(0, 1 - age / 10);
    const tw = 0.5 + 0.5 * Math.sin(age * 0.7);
    const late = 1 - 0.6 * progress(frame, 120, 131);
    sparkle(f.backdrop, sky, (3 + 1.5 * tw) * late + 10 * settle, 1, light);
    if (age > 6) sparkle(f.backdrop, sky, 1.2 * late, 1, [gold[2], gold[3], '#ffffff']);
    if (age < 12) oval(f.backdrop, sky, 4 + age * 2, 4 + age * 2, teal[2], 0.7 * (1 - age / 12));
  }
  // Healing: light rains from the palm, the hole closes, grass springs up.
  if (frame >= B.healStart) {
    const palm = pt(f, 'lightL') ?? pt(f, 'handL') ?? f.feet;
    const k = progress(frame, B.healStart, B.healEnd),
      fade = 1 - progress(frame, B.healEnd, B.healEnd + 8);
    for (let i = 0; i < 8 && fade > 0; i++) {
      const life = 8,
        age = (frame + i * 1.7) % life,
        q = age / life;
      const p = mix(palm, [hole[0] + (hash(i, 23) - 0.5) * 16, hole[1]], q);
      f.above.col(teal[2 + (i % 2)], (1 - q * 0.6) * fade);
      f.above.rect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
    for (let i = 0; i < 12; i++) {
      const x = hole[0] + (hash(i, 29) - 0.5) * 26,
        y = hole[1] + (hash(i, 31) - 0.5) * 8,
        h = Math.round(Math.min(1, k * 1.5 - hash(i, 37) * 0.5) * (3 + 3 * hash(i, 33)));
      if (h <= 0) continue;
      // The new blades settle into the meadow by the end of the clip.
      f.under.col(grass[3 + (i % 2)], 1 - progress(frame, B.healEnd, 131));
      f.under.line(Math.round(x), Math.round(y), Math.round(x + (i % 2 ? 1 : -1)), Math.round(y - h));
    }
    if (frame >= B.healEnd - 2 && frame < B.healEnd + 6) sparkle(f.above, [hole[0], hole[1] - 3], 5 - (frame - B.healEnd + 2) * 0.6, 1, teal);
  }
}

// ---- trick_b: teleport ---------------------------------------------------------------------------
function teleport(f: FxInput, frame: number) {
  const B = beats.trick_b;
  const from1 = pt(f, 'chest', B.out1 - 2) ?? f.feet,
    to1 = pt(f, 'chest', B.in1 + 1) ?? f.feet,
    to2 = pt(f, 'chest', B.in2 + 2) ?? f.feet,
    home = pt(f, 'chest', B.land + 4) ?? f.feet;
  blinkRing(f.above, from1, frame - (B.out1 - 3), 6, true, 30);
  blinkRing(f.above, to1, frame - B.in1, 8, false, 18);
  blinkRing(f.above, to1, frame - (B.out2 - 3), 6, true, 18);
  blinkRing(f.under, to2, frame - B.in2, 10, false, 60);
  blinkRing(f.under, [f.feet[0], f.feet[1] - 50], frame - (B.out3 - 3), 6, true, 50);
  blinkRing(f.above, home, frame - B.in3, 8, false, 30);
  // Light pillars where the body is squeezed out of the world.
  for (const [at, out] of [[from1, B.out1], [to1, B.out2]] as [XY, number][]) {
    const age = frame - out;
    if (age >= 0 && age < 5) {
      const a = 1 - age / 5;
      f.above.col(light[1], a);
      f.above.line(Math.round(at[0]), Math.round(at[1] - 50 * a), Math.round(at[0]), Math.round(at[1] + 40 * a));
    }
  }
  // Taps on the glass: rings spread over the painting from the paw.
  for (const tap of [B.tap1, B.tap2]) {
    const age = frame - tap;
    if (age < 0 || age > 9) continue;
    const paw = pt(f, 'handR', tap) ?? f.feet;
    const k = age / 9;
    oval(f.above, paw, 6 + 44 * k, 5 + 34 * k, light[1], 0.75 * (1 - k));
    oval(f.above, paw, 3 + 26 * k, 2.5 + 20 * k, '#ffffff', 0.55 * (1 - k));
    if (age < 3) sparkle(f.above, paw, 4 - age, 1, light);
  }
  // Landing: a puff of dust and a soft ring on the grass.
  const age = frame - B.land;
  if (age >= 0 && age < 12) {
    const k = age / 12;
    oval(f.under, f.feet, 12 + 20 * k, 3 + 5 * k, teal[2], 0.6 * (1 - k));
    for (let i = 0; i < 6; i++) ellFill(f.under, [f.feet[0] + (i - 2.5) * (6 + 6 * k), f.feet[1] - 2 * k], 3 + 2 * k, 1.5 + k, '#3a4a5a', 0.4 * (1 - k));
  }
}

// ---- phase: the awakening -------------------------------------------------------------------------
function awakening(f: FxInput, frame: number) {
  const B = beats.phase;
  const g = progress(frame, B.glyphs, B.glyphs + 10) * (1 - progress(frame, 44, 60));
  if (g > 0) {
    // A rune circle on the grass, turning, with marks round it.
    const c: XY = [f.feet[0], f.feet[1] + 1];
    oval(f.under, c, 34 * g, 8 * g, teal[1], 0.8 * g);
    oval(f.under, c, 28 * g, 6.4 * g, gold[2], 0.6 * g);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + frame * 0.06,
        x = c[0] + Math.cos(a) * 31 * g,
        y = c[1] + Math.sin(a) * 7.2 * g;
      f.under.col(i % 2 ? gold[3] : teal[3], g);
      f.under.rect(Math.round(x), Math.round(y) - 1, 1, 2);
      if (i % 3 === 0) f.under.rect(Math.round(x) - 1, Math.round(y), 3, 1);
    }
    // Light rising from the circle.
    for (let i = 0; i < 10; i++) {
      const life = 14,
        age = (frame + i * 1.4) % life;
      const a = (i / 10) * TAU;
      f.under.col(teal[2 + (i % 2)], g * (1 - age / life));
      f.under.rect(Math.round(c[0] + Math.cos(a) * 30 * g), Math.round(c[1] + Math.sin(a) * 7 * g - age * 3), 1, 2);
    }
  }
  // The third eye opens: rays from the gem.
  const gem = pt(f, 'gem', B.open) ?? f.feet;
  const age = frame - B.open;
  if (age >= 0 && age < 10) {
    const k = age / 10;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU,
        r0 = 4 + 10 * k,
        r1 = 10 + 40 * k;
      f.above.col(i % 2 ? teal[3] : gold[3], 1 - k);
      f.above.line(Math.round(gem[0] + Math.cos(a) * r0), Math.round(gem[1] + Math.sin(a) * r0), Math.round(gem[0] + Math.cos(a) * r1), Math.round(gem[1] + Math.sin(a) * r1));
    }
    sparkle(f.above, gem, 8 * (1 - k) + 2, 1, light);
  }
  // Shockwave as the arms open.
  const wave = frame - B.wave;
  if (wave >= 0 && wave < 14) {
    const k = wave / 14,
      chest = pt(f, 'chest', B.wave) ?? f.feet;
    oval(f.under, chest, 10 + 80 * ease(k), 8 + 64 * ease(k), teal[2], 0.8 * (1 - k));
    oval(f.under, [f.feet[0], f.feet[1] + 1], 20 + 90 * ease(k), 5 + 20 * ease(k), light[1], 0.6 * (1 - k));
    if (wave < 4) {
      f.backdrop.col('#c8f0ff', 0.18 * (1 - wave / 4));
      f.backdrop.rect(0, 0, f.w, f.h);
    }
  }
}

// ---- trick-f2: star storm -------------------------------------------------------------------------
function starStorm(f: FxInput, frame: number) {
  const B = beats['trick-f2'];
  const ball = pt(f, 'star');
  // Starlight streams from the sky into the forming star.
  if (ball && frame >= B.pullStart && frame < B.pullEnd + 6) {
    const fade = 1 - progress(frame, B.pullEnd, B.pullEnd + 6);
    for (let i = 0; i < 16; i++) {
      const period = 14,
        age = (frame + i * 3.3) % period,
        k = age / period;
      const from: XY = [8 + hash(i, 51) * (f.w - 16), 6 + hash(i, 53) * (CREST - 10)];
      const swirl = (1 - k) * 18 * (i % 2 ? 1 : -1);
      const at = (q: number): XY => {
        const p = mix(from, ball, ease(q));
        return [p[0] + Math.sin(q * Math.PI) * swirl, p[1] - Math.sin(q * Math.PI) * 6];
      };
      const a = at(k),
        b = at(Math.max(0, k - 0.12));
      f.above.col(i % 3 ? teal[2] : light[2], fade * (0.4 + 0.6 * k));
      f.above.line(Math.round(b[0]), Math.round(b[1]), Math.round(a[0]), Math.round(a[1]));
      if (i % 4 === 0) sparkle(f.above, a, 1.3, fade, light);
    }
  }
  // The galaxy: two spiral arms turning round the seer, the far half behind it, the near half in front.
  const g = progress(frame, 18, 34) * (1 - progress(frame, 64, 76));
  if (g > 0) {
    const c = pt(f, 'chest') ?? f.feet;
    const spin = frame * 0.16;
    for (let arm = 0; arm < 3; arm++)
      for (let i = 0; i < 30; i++) {
        const a = spin + (arm * TAU) / 3 + i * 0.26,
          r = (10 + i * 2.3) * g;
        const x = c[0] + Math.cos(a) * r,
          y = c[1] + 4 + Math.sin(a) * r * 0.34;
        const near = Math.sin(a) > 0;
        const p = near ? f.above : f.under;
        const col = i % 5 === 0 ? light[2] : i % 2 ? teal[2] : violet[3];
        p.col(col, g * (1 - i / 34));
        p.rect(Math.round(x), Math.round(y), i < 18 ? 2 : 1, 1);
        if (i % 2 === 0 && i < 24) {
          p.col(violet[2], 0.5 * g);
          p.rect(Math.round(x - Math.sin(a) * 3), Math.round(y + Math.cos(a) * 1), 1, 1);
        }
        if (i % 7 === 3) sparkle(p, [x, y], 1.4, g * 0.8, light);
      }
    ellFill(f.under, [c[0], c[1] + 4], 44 * g, 15 * g, violet[2], 0.2 * g);
    ellFill(f.under, [c[0], c[1] + 4], 22 * g, 8 * g, teal[1], 0.15 * g);
  }
  // Pressing: a contracting ring of light round the ball.
  if (ball && frame >= B.pullEnd && frame < B.throw) {
    const k = ((frame - B.pullEnd) % 8) / 8;
    oval(f.above, ball, 18 * (1 - k) + 3, 18 * (1 - k) + 3, teal[3], 0.7 * k);
  }
  // Thrown: a trail behind the star as it flies at the viewer.
  if (frame >= B.throw && frame < B.burst) {
    for (let k = Math.max(B.throw, frame - 4); k < frame; k++) {
      const p = pt(f, 'star', k),
        q = pt(f, 'star', k + 1);
      if (!p || !q) continue;
      const w = 2 + (k - frame + 5);
      f.under.col(teal[1], 0.5);
      for (let o = -w; o <= w; o++) f.under.line(Math.round(p[0] + o), Math.round(p[1]), Math.round(q[0] + o), Math.round(q[1]));
    }
  }
  // The burst: the field flashes, a shockwave runs out, sparks shower over the meadow.
  const at = pt(f, 'star', B.burst - 1) ?? f.feet;
  const age = frame - B.burst;
  if (age >= 0 && age < 4) {
    f.backdrop.col('#e8fffc', 0.25 * (1 - age / 4));
    f.backdrop.rect(0, 0, f.w, f.h);
  }
  if (age >= 0 && age < 16) {
    const k = age / 16;
    oval(f.above, at, 12 + 120 * ease(k), 10 + 90 * ease(k), light[1], 0.7 * (1 - k));
    oval(f.under, [at[0], f.feet[1] + 4], 20 + 120 * ease(k), 6 + 26 * ease(k), teal[2], 0.6 * (1 - k));
  }
  burst(f.above, [at[0], Math.min(at[1], f.h - 10)], age, 22, 30, 110, light, 61, 'spark');
}

// ---- trick_b-f2: the double -----------------------------------------------------------------------
function double(f: FxInput, frame: number) {
  const B = beats['trick_b-f2'];
  const chest = pt(f, 'chest') ?? f.feet;
  const now = gesture('trick_b-f2', frame / 24);
  const split = frame - B.split;
  if (split >= 0 && split < 8) blinkRing(f.above, chest, split, 8, false, 26);
  // Trails of light behind both bodies while they circle.
  if (frame >= B.orbitStart && frame < B.merge) {
    for (let i = 1; i <= 6; i++) {
      const was = gesture('trick_b-f2', (frame - i) / 24);
      const back: XY = [chest[0] - ((now.dx ?? 0) - (was.dx ?? 0)), chest[1] - ((now.dy ?? 0) - (was.dy ?? 0))];
      const ghost: XY = [back[0] + (was.ghostX ?? 0), back[1] + (was.ghostY ?? 0)];
      const a = 1 - i / 7;
      for (const [p, k] of [[back, 0], [ghost, 1]] as [XY, number][]) {
        f.under.col(k ? violet[3] : teal[2], a);
        f.under.rect(Math.round(p[0]), Math.round(p[1] + 6), 2, 1);
        if (i % 2) sparkle(f.under, [p[0] + (hash(i, k, frame) - 0.5) * 20, p[1] + (hash(i, k, 3) - 0.5) * 30], 1.2, a, k ? [violet[3], violet[4], '#ffffff'] : light);
      }
    }
    const k = progress(frame, B.orbitStart, B.merge);
    oval(f.under, [f.feet[0], f.feet[1] + 1], 36 * (1 - k) + 8, 8 * (1 - k) + 2, teal[2], 0.5);
  }
  // The merge: a star flare, a ring, sparks.
  const age = frame - B.merge;
  if (age >= 0 && age < 6) sparkle(f.above, chest, 12 - age * 1.6, 1, light);
  blinkRing(f.above, chest, age, 12, false, 46);
  burst(f.above, chest, age, 18, 20, 60, [violet[3], violet[4], '#ffffff'], 71, 'spark');
}

// ---- show: the rift in the sky ----------------------------------------------------------------------
function rift(f: FxInput, frame: number) {
  const B = beats.show;
  const c: XY = [f.feet[0] + 2, f.feet[1] - 56];
  const open = ease(progress(frame, B.tear, B.open)) * (1 - ease(progress(frame, B.sealStart, B.sealEnd)));
  const tall = 46 * Math.min(1, progress(frame, B.tear, B.tear + 10) * 1.4) * (1 - 0.6 * progress(frame, B.sealStart, B.sealEnd));
  const wide = 12 * open + (frame >= B.emerge && frame < B.sealStart ? 4 * Math.sin(progress(frame, B.emerge, B.sealStart) * Math.PI) : 0);
  if (tall > 1 && frame < B.sealEnd + 2) {
    const edge = (v: number, side: number) => {
      const lens = Math.cos((v / tall) * (Math.PI / 2));
      const jag = (hash(Math.round(v / 4), side, 7) - 0.5) * 3 * Math.min(1, wide / 3);
      return c[0] + side * (wide * lens + jag);
    };
    const left: XY[] = [],
      right: XY[] = [];
    for (let v = -tall; v <= tall; v += 4) {
      left.push([edge(v, -1), c[1] + v]);
      right.push([edge(v, 1), c[1] + v]);
    }
    left.push([c[0], c[1] + tall]);
    const shape = [...left, ...right.reverse()];
    // A glow round the tear, the abyss inside, stars in it, a bright core line, crackling edges.
    ellFill(f.under, c, wide * 2 + 8, tall + 6, violet[2], 0.22 * Math.min(1, open * 2 + 0.3));
    poly(f.under, violet[0], 1, shape);
    if (wide > 2) {
      poly(f.under, violet[1], 1, shape.map(([x, y]) => [c[0] + (x - c[0]) * 0.6, y] as XY));
      for (let i = 0; i < 10; i++) {
        const y = c[1] + (hash(i, 81) - 0.5) * tall * 1.6,
          x = c[0] + (hash(i, 83) - 0.5) * wide * 1.1;
        const tw = Math.sin(frame * 0.5 + i);
        if (tw > -0.2) {
          f.under.col(i % 3 ? violet[4] : teal[3], 0.5 + 0.5 * tw);
          f.under.rect(Math.round(x), Math.round(y), 1, 1);
        }
      }
    }
    f.under.col(teal[3], 1);
    f.under.line(Math.round(c[0]), Math.round(c[1] - tall + 2), Math.round(c[0]), Math.round(c[1] + tall - 2));
    for (let i = 1; i < shape.length; i++) {
      f.under.col(i % 3 ? violet[3] : light[2], 1);
      f.under.line(Math.round(shape[i - 1][0]), Math.round(shape[i - 1][1]), Math.round(shape[i][0]), Math.round(shape[i][1]));
    }
    // Sparks crawl along the rim.
    for (let i = 0; i < 4; i++) {
      const v = ((frame * 3 + i * 23) % (2 * tall)) - tall;
      const side = i % 2 ? 1 : -1;
      sparkle(f.under, [edge(v, side), c[1] + v], 1.6, 0.9, [violet[3], violet[4], '#ffffff']);
    }
  }
  // Grass and fireflies are pulled towards the opening rift.
  if (frame >= B.tear && frame < B.emerge)
    for (let i = 0; i < 10; i++) {
      const life = 12,
        age = (frame + i * 1.9) % life,
        k = age / life;
      const from: XY = [c[0] + (hash(i, 91) - 0.5) * 140, c[1] + (hash(i, 93) - 0.2) * 90];
      const p = mix(from, c, ease(k));
      f.above.col(i % 2 ? teal[2] : violet[3], k);
      f.above.rect(Math.round(p[0]), Math.round(p[1]), 1, 1);
    }
  // He unfolds out of it: a flash and a spray of sparks; the rift seals with a last spark.
  const age = frame - B.emerge;
  if (age >= 0 && age < 6) sparkle(f.above, c, 14 - age * 2, 1, light);
  burst(f.above, c, age, 18, 24, 70, [violet[3], violet[4], '#ffffff'], 101, 'spark');
  const seal = frame - B.sealEnd;
  if (seal >= -2 && seal < 6) sparkle(f.under, c, 6 - Math.abs(seal) * 0.9, 1, [violet[3], violet[4], '#ffffff']);
}

// ---- hatch: the crystal egg -------------------------------------------------------------------------
function egg(f: FxInput, frame: number) {
  const B = beats.hatch;
  const c: XY = [f.feet[0], f.feet[1] - 40 + Math.sin(frame * 0.4) * 2];
  if (frame < B.burst) {
    const shake = frame >= B.crack ? Math.round(Math.sin(frame * 2.7) * 1.2) : 0;
    const x = c[0] + shake;
    const outline: XY[] = [[x, c[1] - 24], [x + 12, c[1] - 10], [x + 12, c[1] + 10], [x, c[1] + 24], [x - 12, c[1] + 10], [x - 12, c[1] - 10]];
    ellFill(f.under, [f.feet[0], f.feet[1] + 1], 16, 4, '#000000', 0.35);
    ellFill(f.under, c, 22, 30, teal[1], 0.15 + 0.1 * Math.sin(frame * 0.8));
    poly(f.above, teal[0], 1, outline.map(([a, b]) => [x + (a - x) * 1.12, c[1] + (b - c[1]) * 1.08] as XY));
    poly(f.above, teal[1], 1, outline);
    poly(f.above, teal[2], 1, [outline[0], outline[1], [x, c[1] + 2], outline[5]]);
    poly(f.above, teal[3], 1, [outline[0], outline[1], [x + 2, c[1] - 6]]);
    poly(f.above, '#0a3a48', 0.8, [[x, c[1] + 2], outline[2], outline[3], outline[4]]);
    // A curled silhouette glows inside.
    ellFill(f.above, [x, c[1] + 2], 5, 7, light[1], 0.35 + 0.25 * Math.sin(frame * 0.6));
    if (frame >= B.crack) {
      const k = progress(frame, B.crack, B.burst);
      f.above.col(light[2], 1);
      let [px, py] = [x - 1, c[1] - 22];
      for (let s = 1; s <= Math.round(6 * k); s++) {
        const nx = x + (s % 2 ? 4 : -3),
          ny = c[1] - 22 + s * 7;
        f.above.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny));
        [px, py] = [nx, ny];
      }
    }
  }
  burst(f.above, c, frame - B.burst, 16, 16, 44, teal, 111, 'chip');
  burst(f.above, c, frame - B.burst, 16, 16, 54, light, 113, 'spark');
  const age = frame - B.burst;
  if (age >= 0 && age < 5) sparkle(f.above, c, 12 - age * 2, 1, light);
}

export function seerEffects(f: FxInput) {
  const frame = frameOf(f);
  const anim = f.anim;
  if (F2.has(anim)) awakened(f);
  switch (anim) {
    case 'idle': {
      const g = frame - 40;
      const gem = pt(f, 'gem');
      if (gem && g >= 0 && g < 6) sparkle(f.above, gem, 3 - g * 0.4, 1 - g / 6, light);
      break;
    }
    case 'look': {
      const g = frame - 22;
      const gem = pt(f, 'gem');
      if (gem && g >= 0 && g < 6) sparkle(f.above, gem, 3.5 - g * 0.5, 1 - g / 6, light);
      break;
    }
    case 'fidget_a': {
      // The light flies from the right palm over the head into the left one.
      const { toss, catch: caught } = beats.fidget_a;
      if (frame >= toss && frame <= caught) {
        const a = pt(f, 'lightR', toss) ?? f.feet,
          b = pt(f, 'lightL', caught) ?? f.feet;
        const top: XY = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 140];
        const at = (q: number): XY => [a[0] * (1 - q) ** 2 + 2 * top[0] * q * (1 - q) + b[0] * q * q, a[1] * (1 - q) ** 2 + 2 * top[1] * q * (1 - q) + b[1] * q * q];
        const k = (frame - toss) / (caught - toss);
        ellFill(f.above, at(k), 6, 6, teal[1], 0.25);
        for (let i = 5; i >= 0; i--) {
          const p = at(Math.max(0, k - i * 0.04));
          f.above.col(i ? teal[2] : light[2], 1 - i * 0.15);
          disc(f.above, p[0], p[1], i ? 3 - i * 0.4 : 3.4);
        }
        flare(f.above, Math.round(at(k)[0]), Math.round(at(k)[1]), 3, '#ffffff', 0.9);
      }
      const g = frame - caught;
      const palm = pt(f, 'lightL');
      if (palm && g >= 0 && g < 8) sparkle(f.above, palm, 4 - g * 0.4, 1 - g / 8, light);
      break;
    }
    case 'fidget_b': {
      // The dancing crystals leave short sparkling wakes.
      for (let k = 0; k < 3; k++) {
        const now = pt(f, 'crystal' + k);
        if (!now) continue;
        const life = 6,
          tw = (frame + k * 5) % life;
        if (frame > 6 && frame < 44) sparkle(f.under, [now[0] + 2, now[1] + 3], 1.6 * (1 - tw / life) + 0.4, 0.8, teal);
      }
      break;
    }
    case 'happy': {
      const head = pt(f, 'head');
      if (head && frame >= 10 && frame < 22)
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + frame * 0.4;
          sparkle(f.above, [head[0] + Math.cos(a) * 22, head[1] + Math.sin(a) * 16], 1.8, 1 - progress(frame, 18, 22), light);
        }
      burst(f.above, pt(f, 'chest', 24) ?? f.feet, frame - 24, 14, 12, 34, light, 121, 'spark');
      break;
    }
    case 'happy-f2': {
      const clap = beats['happy-f2'].clap;
      const c = mix(pt(f, 'handL', clap) ?? f.feet, pt(f, 'handR', clap) ?? f.feet, 0.5);
      if (frame >= clap && frame < clap + 5) sparkle(f.above, c, 8 - (frame - clap) * 1.4, 1, light);
      burst(f.above, c, frame - clap, 16, 18, 44, light, 131, 'spark');
      break;
    }
    case 'trick':
      stoneIntoStar(f, frame);
      break;
    case 'trick_b':
      teleport(f, frame);
      break;
    case 'phase':
      awakening(f, frame);
      break;
    case 'trick-f2':
      starStorm(f, frame);
      break;
    case 'trick_b-f2':
      double(f, frame);
      break;
    case 'show':
      rift(f, frame);
      break;
    case 'hatch':
      egg(f, frame);
      break;
    case 'peek': {
      const g = frame - 41;
      const gem = pt(f, 'gem');
      if (gem && g >= 0 && g < 7) sparkle(f.above, gem, 3.5 - g * 0.4, 1 - g / 7, light);
      break;
    }
    case 'sleep': {
      // Tiny star-shaped «z» drift up from the sleeping head.
      const head = pt(f, 'head');
      if (!head) break;
      for (let i = 0; i < 3; i++) {
        const life = 3.5,
          age = (f.t + i * (life / 3)) % life,
          k = age / life;
        const x = head[0] + 10 + k * 14 + Math.sin(k * 5 + i) * 2,
          y = head[1] - 14 - k * 30;
        const s = 2 + Math.round(k * 2);
        f.above.col(teal[3], 1 - k);
        f.above.line(Math.round(x - s), Math.round(y - s), Math.round(x + s), Math.round(y - s));
        f.above.line(Math.round(x + s), Math.round(y - s), Math.round(x - s), Math.round(y + s));
        f.above.line(Math.round(x - s), Math.round(y + s), Math.round(x + s), Math.round(y + s));
      }
      break;
    }
    case 'wake_startled': {
      const g = frame - 3;
      const gem = pt(f, 'gem');
      if (gem && g >= 0 && g < 8) sparkle(f.above, gem, 5 - g * 0.5, 1 - g / 8, light);
      break;
    }
  }
}
