// Effects of Клубок: dust from its feet and from the rolling ball, the stone it bonks in «Колобок», a line of
// termites it slurps up in «Термиты», the termite on its nose and the sneeze, the burrow it rolls out of, sparks of
// the claw scraping, the tail's «scritch» and a happy heart, an alarm burst, sleepy «z». Timelines read the beats of
// the pose book; positions read the pangolin's sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress } from '../fx/field';
import { flare, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats } from './ball_pangolin-poses';

const earth = ['#6e3a22', '#a05a32', '#c48a5a', '#dcaa78', '#ecc89a', '#f6e0bc'];
const dirt = ['#2e140c', '#5a2a18', '#7e3e22', '#c4784a', '#e8a874'];
const stone = ['#3a2e2c', '#5e4e46', '#82705e', '#a8947c', '#cebaa0'];
const gold = ['#a87a20', '#e8b84a', '#ffe48a', '#fffbe0'];
const pink = ['#a03a56', '#e06a88', '#ffb0c4', '#fff0f4'];
const termite = { body: '#f0d8a8', head: '#2a140c', shine: '#ffffff' };

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

/** A soft dust cloud: a shaded base, a light body and a bright cap towards the light. */
function puff(p: Pen, [x, y]: XY, r: number, a: number, palette = earth) {
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
    puff(p, [x, y], size * (1.4 + 3.6 * k), 0.95 * (1 - k * k));
  }
}
/** Ballistic grains from a point; `up` is the launch bias (negative = upwards on screen). */
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
function sparkle(p: Pen, [x, y]: XY, size: number, a = 1, palette = gold) {
  if (a <= 0 || size <= 0) return;
  p.col(palette[1], a);
  star(p, x, y, size, 4, Math.PI / 4);
  p.col(palette[2], a);
  star(p, x, y, size * 0.6, 4, Math.PI / 4);
  flare(p, Math.round(x), Math.round(y), Math.max(1, Math.round(size * 0.9)), palette[3], a);
}
/** The impact: a big white-gold flare, a ring and short streaks flying out. */
function bonk(p: Pen, [x, y]: XY, age: number, life: number) {
  if (age < 0 || age > life) return;
  const a = 1 - age / life;
  if (age < 4) sparkle(p, [x, y], 7 - age, 1, ['#a87a20', '#ffd860', '#fff6c0', '#ffffff']);
  oval(p, [x, y], 5 + age * 2.6, 4.5 + age * 2.2, gold[2], a * 0.9);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU + 0.2,
      r0 = 7 + age * 2.4;
    p.col(i % 2 ? gold[2] : '#ffffff', a);
    p.line(Math.round(x + Math.cos(ang) * r0), Math.round(y + Math.sin(ang) * r0), Math.round(x + Math.cos(ang) * (r0 + 3)), Math.round(y + Math.sin(ang) * (r0 + 3)));
  }
}
/** A round pebble with a lit top and a contact shadow. */
function pebble(p: Pen, [x, y]: XY, r: number, a = 1, shadow = true) {
  if (shadow) ellFill(p, [x + 1, y + r * 0.7], r * 1.1, r * 0.35, '#5a2e1c', a * 0.6);
  ellFill(p, [x, y], r, r * 0.82, stone[1], a);
  ellFill(p, [x - r * 0.15, y - r * 0.15], r * 0.8, r * 0.62, stone[2], a);
  ellFill(p, [x - r * 0.35, y - r * 0.35], r * 0.38, r * 0.28, stone[4], a);
  p.col(stone[0], a);
  p.rect(Math.round(x + r * 0.3), Math.round(y + r * 0.2), 1, 1);
}
/** One termite, 3 px long, legs flickering; `dir` = −1 walks left. */
function bug(p: Pen, [x, y]: XY, t: number, dir = -1, a = 1) {
  const X = Math.round(x),
    Y = Math.round(y);
  p.col(termite.body, a);
  p.rect(X - (dir < 0 ? 0 : 1), Y, 2, 1);
  p.col(termite.head, a);
  p.rect(X + (dir < 0 ? -1 : 1), Y, 1, 1);
  p.col(termite.shine, a);
  p.rect(X, Y, 1, 1);
  p.col(termite.head, a * 0.8);
  p.rect(X + (Math.floor(t * 12) % 2), Y + 1, 1, 1);
}
/** A sleepy «z» of pixel lines. */
function zed(p: Pen, [x, y]: XY, s: number, a: number) {
  if (a <= 0) return;
  const X = Math.round(x),
    Y = Math.round(y),
    S = Math.max(2, Math.round(s));
  p.col('#3a2a5a', a);
  p.line(X, Y, X + S, Y);
  p.line(X + S, Y, X, Y + S);
  p.line(X, Y + S, X + S, Y + S);
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
/** The burrow: a heap of red earth that trembles, then bursts open into a dark hole. */
function burrow(p: Pen, [x, y]: XY, frame: number, pop: number) {
  const open = progress(frame, pop - 1, pop + 3),
    fade = 1 - progress(frame, pop + 14, pop + 22);
  if (fade <= 0) return;
  const shake = frame < pop ? Math.round(Math.sin(frame * 3.1) * (frame / pop) * 1.5) : 0;
  // The hole left behind.
  if (open > 0) {
    ellFill(p, [x, y + 1], 14 * open, 4.5 * open, dirt[0], fade);
    ellFill(p, [x, y + 0.5], 11 * open, 3 * open, '#1e0e0a', fade);
  }
  // The heap: swells before the pop, flattens into a ring of earth after it; a dark rim keeps it off the ground.
  const h = frame < pop ? 7 + (frame / pop) * 7 : 12 * (1 - open) + 2;
  const rx = 16 + 5 * open;
  if (open < 0.3) ellFill(p, [x + shake, y - h * 0.35], rx + 1.2, h * 0.75 + 1.4, dirt[0], fade);
  for (let row = Math.floor(y - h); row <= Math.ceil(y + 2); row++) {
    const v = row < y ? (y - row) / h : (row - y) / 2;
    const half = rx * Math.sqrt(Math.max(0, 1 - v * v));
    if (half < 0.5) continue;
    if (open > 0.3 && row < y - 1 && Math.abs(row - y) < h) {
      // A ring: draw the two flanks only.
      const hole = 11 * open * Math.sqrt(Math.max(0, 1 - v * v));
      p.col(dirt[row < y - h * 0.5 ? 4 : 3], fade);
      p.span(Math.round(x - half + shake), row, Math.round(half - hole));
      p.span(Math.round(x + hole + shake), row, Math.round(half - hole));
      continue;
    }
    p.col(dirt[row < y - h * 0.6 ? 4 : row < y ? 3 : 2], fade);
    p.span(Math.round(x - half + shake), row, Math.round(half * 2));
    // Cracks spreading over the heap as it swells.
    if (frame < pop && row < y && row > y - h)
      for (const cx of [-5, 1, 6])
        if (hash(cx, row, 2) < frame / pop) {
          p.col(dirt[1], fade);
          p.rect(Math.round(x + cx + (row % 3) - 1 + shake), row, 1, 1);
        }
    for (let i = 0; i < half / 3; i++) {
      const gx = Math.round(x - half + hash(5, row, i) * half * 2);
      p.col(dirt[hash(7, gx, row) > 0.5 ? 4 : 1], fade * 0.8);
      p.rect(gx + shake, row, 1, 1);
    }
  }
}

export function pangolinEffects(f: FxInput) {
  const frame = frameOf(f);
  switch (f.anim) {
    case 'trick': {
      const { curl, launch, bonk: hit, land, bounce, open, tada } = beats.trick;
      const home = f.feet;
      // The stone it bonks lies to the right; at the hit it flies off right and up, spinning out of the field.
      const rest: XY = [home[0] + 56, home[1] - 6];
      if (frame < hit) pebble(f.under, rest, 7);
      else {
        const k = (frame - hit) / 14;
        if (k <= 1) pebble(f.above, [rest[0] + 46 * k, rest[1] - 34 * k + 38 * k * k], 7, 1, false);
      }
      // Dust behind the ball while it rolls on the ground.
      for (let s = curl + 3; s <= hit; s += 2) {
        const at = pt(f, 'ballGround', s);
        if (at) dustCloud(f.under, [at[0], at[1] - 2], frame - s, 9, 1, 4, 3, s, s > launch ? 1.1 : 0.7, s > launch ? -4 : 3);
      }
      for (let s = land; s <= bounce + 8; s += 2) {
        const at = pt(f, 'ballGround', s);
        if (at && Math.abs(s - (land + bounce) / 2) > 3) dustCloud(f.under, [at[0], at[1] - 2], frame - s, 9, 1, 4, 3, s, 0.8, 2);
      }
      // Speed lines during the dash.
      if (frame >= launch + 2 && frame < hit + 1) {
        const ball = pt(f, 'ball');
        if (ball)
          for (let i = 0; i < 4; i++) {
            const y = Math.round(ball[1] - 12 + i * 8 + hash(i, Math.floor(frame), 3) * 2);
            const x = Math.round(ball[0] - 30 - hash(i, Math.floor(frame), 5) * 8);
            f.under.col(i % 2 ? '#fff6e0' : earth[4], 0.85);
            f.under.line(x - 10 - i * 2, y, x, y);
          }
      }
      // Bonk on the stone and the dust it raises.
      const ballAtHit = pt(f, 'ball', hit);
      if (ballAtHit) {
        bonk(f.above, [rest[0] - 7, rest[1] - 3], frame - hit, 9);
        dustCloud(f.under, [rest[0] - 2, rest[1] + 2], frame - hit, 12, 4, 8, 7, 41, 1.1);
        spray(f.above, [rest[0] - 2, rest[1]], frame - hit, 12, 10, 40, earth, 43, -0.8, 110);
      }
      // Landing and the bounce.
      for (const [at, size] of [
        [land, 1.3],
        [bounce, 0.9],
      ] as [number, number][]) {
        const g = pt(f, 'ballGround', at);
        if (g) {
          dustCloud(f.under, [g[0] - 14, g[1] - 1], frame - at, 12, 3, 5, 6, at, size, -6);
          dustCloud(f.under, [g[0] + 14, g[1] - 1], frame - at, 12, 3, 5, 6, at + 1, size, 6);
        }
      }
      // Opening in the air: a ring of sparkles; the «ta-da» landing dust; dust of the hops back.
      const body = pt(f, 'body', open + 2);
      if (body)
        for (let i = 0; i < 6; i++) {
          const age = frame - open - i;
          if (age < 0 || age > 8) continue;
          const ang = (i / 6) * TAU + 0.3;
          sparkle(f.above, [body[0] + Math.cos(ang) * (16 + age * 1.5), body[1] + Math.sin(ang) * (13 + age * 1.2)], 3.5 - age * 0.35, 1 - age / 8);
        }
      for (const at of [tada, 97, 102]) {
        for (const foot of ['footLGround', 'footRGround']) {
          const g = pt(f, foot, at);
          if (g) dustCloud(f.under, g, frame - at, 10, 2, 4, 5, at + foot.length, at === tada ? 1 : 0.7, foot === 'footLGround' ? -4 : 4);
        }
      }
      break;
    }
    case 'trick_b': {
      const { sniff, zip1, zip2, zip3, munch, nose, sneeze, sit, pat } = beats.trick_b;
      // Sniffing: little scent wisps drawn in to the nose.
      const snout = pt(f, 'snout');
      if (snout && frame >= sniff && frame < sniff + 9)
        for (let i = 0; i < 3; i++) {
          const k = ((frame - sniff + i * 3) % 9) / 9;
          f.above.col(earth[5], (1 - k) * 0.8);
          f.above.rect(Math.round(snout[0] + 14 - 12 * k), Math.round(snout[1] + 6 - 5 * k + i * 2), 2, 1);
        }
      // Three groups of termites march in from the right to where each tongue zip lands; each zip takes its group.
      const zips = [zip1 + 2, zip2 + 2, zip3 + 3];
      zips.forEach((z, g) => {
        const spot = pt(f, 'tongueTip', z);
        if (!spot) return;
        const eaten = frame >= z;
        for (let i = 0; i < 5; i++) {
          const lane = spot[1] + 1 + (i % 2);
          const arrive = spot[0] + i * 4 - 2;
          const x = Math.max(arrive, arrive + 48 + g * 10 - frame * 1.6);
          if (!eaten) bug(f.under, [x, lane], f.t + i * 0.1 + g);
        }
        // Caught on the sticky tip while the tongue pulls back.
        if (eaten && frame < z + 6) {
          const tip = pt(f, 'tongueTip');
          if (tip) for (let i = 0; i < 4; i++) bug(f.above, [tip[0] - 1 + (i % 2) * 2, tip[1] - 1 + (i >> 1) * 2], f.t + i, i % 2 ? 1 : -1);
        }
      });
      // Munching crumbs.
      const mouth = pt(f, 'mouth');
      if (mouth) spray(f.above, mouth, frame - munch, 10, 5, 14, earth, 61, -0.2, 80, 1.4);
      // A last termite climbs the snout, tickles, and the sneeze blows it off in an arc to the right.
      const nTip = pt(f, 'snout');
      if (mouth && nTip && frame >= nose && frame < sneeze + 1) {
        const k = Math.min(1, (frame - nose) / 8);
        const at = mix(mouth, nTip, k);
        bug(f.above, [at[0], at[1] - 2 + (Math.floor(frame) % 2)], f.t, 1);
        if (frame > nose + 8) {
          f.above.col('#ffffff', 0.9);
          f.above.rect(Math.round(nTip[0] - 2), Math.round(nTip[1] - 8 - ((frame * 0.5) % 3)), 1, 2);
        }
      }
      const blast = pt(f, 'snout', sneeze);
      if (blast) {
        const age = frame - sneeze;
        if (age >= 0 && age < 16) {
          for (let i = 0; i < 4; i++) {
            const k = Math.max(0, age - i) / 14;
            if (k > 0 && k <= 1) puff(f.above, [blast[0] + 6 + 26 * k + i * 3, blast[1] - 2 + (i - 1.5) * 4 * k], 2 + 5 * k, 0.9 * (1 - k * k), ['#a8a8b8', '#d0d0dc', '#ececf4', '#f6f6fc', '#ffffff', '#ffffff']);
          }
          spray(f.above, [blast[0] + 4, blast[1]], age, 14, 10, 70, ['#9ad4ea', '#cdeaf6', '#ffffff'], 71, -0.1, 60, 0.7);
          const k = age / 16;
          bug(f.above, [blast[0] + 10 + 50 * k, blast[1] - 20 * k + 44 * k * k], f.t, 1);
        }
      }
      // Landing after the somersault, a bashful sweat drop.
      for (const foot of ['footLGround', 'footRGround']) {
        const g = pt(f, foot, sit);
        if (g) dustCloud(f.under, g, frame - sit, 10, 3, 4, 6, sit + foot.length, 1, foot === 'footLGround' ? -5 : 5);
      }
      const crown = pt(f, 'crown');
      if (crown && frame >= pat && frame < pat + 12) {
        const k = (frame - pat) / 12;
        const at: XY = [crown[0] + 7, crown[1] + 1 + k * 5];
        ellFill(f.above, at, 1.3, 1.8, '#9ad4ea', 1 - k * k);
        f.above.col('#ffffff', 1 - k);
        f.above.rect(Math.round(at[0]), Math.round(at[1] - 1), 1, 1);
      }
      break;
    }
    case 'hatch': {
      const { pop, land, open, shake } = beats.hatch;
      const home = f.feet;
      burrow(frame < pop ? f.above : f.under, [home[0], home[1] - 2], frame, pop);
      spray(f.above, [home[0], home[1] - 12], frame - 3, 8, 10, 30, dirt, 3, -0.8, 110);
      spray(f.above, [home[0] + 4, home[1] - 14], frame - 7, 8, 10, 32, dirt, 5, -0.85, 110);
      spray(f.above, [home[0], home[1] - 14], frame - pop, 16, 26, 80, dirt, 13, -0.75, 140, 1.4);
      dustCloud(f.under, [home[0], home[1] - 2], frame - pop, 14, 5, 10, 20, 17, 1.1);
      const g = pt(f, 'ballGround', land);
      if (g) {
        dustCloud(f.under, [g[0] - 12, g[1]], frame - land, 11, 3, 5, 6, 21, 1, -5);
        dustCloud(f.under, [g[0] + 12, g[1]], frame - land, 11, 3, 5, 6, 22, 1, 5);
      }
      for (let s = land + 3; s < open - 2; s += 3) {
        const at = pt(f, 'ballGround', s);
        if (at) dustCloud(f.under, at, frame - s, 8, 1, 3, 3, s, 0.7);
      }
      // Shaking off: dust flies from the body with each shake.
      const body = pt(f, 'body');
      if (body) for (const at of [shake, shake + 2, shake + 4]) spray(f.above, body, frame - at, 9, 8, 46, earth, at, -0.3, 60, 2);
      break;
    }
    case 'happy': {
      const { jump, open, land } = beats.happy;
      for (const [at, size] of [
        [jump, 0.9],
        [land, 1.1],
      ] as [number, number][])
        for (const foot of ['footLGround', 'footRGround']) {
          const g = pt(f, foot, at);
          if (g) dustCloud(f.under, g, frame - at, 11, 3, 5, 6, at + foot.length, size, foot === 'footLGround' ? -5 : 5);
        }
      // Sparkles round the spinning cone, a burst when it pops open.
      const ball = pt(f, 'ball');
      if (ball && frame >= jump + 2 && frame < open)
        for (let i = 0; i < 3; i++) {
          const ang = frame * 0.7 + (i * TAU) / 3;
          sparkle(f.above, [ball[0] + Math.cos(ang) * 30, ball[1] + Math.sin(ang) * 24], 2.5, 0.9);
        }
      const body = pt(f, 'body', open);
      if (body)
        for (let i = 0; i < 5; i++) {
          const age = frame - open;
          if (age < 0 || age > 10) continue;
          const ang = (i / 5) * TAU - 0.4;
          sparkle(f.above, [body[0] + Math.cos(ang) * (14 + age * 2), body[1] - 6 + Math.sin(ang) * (11 + age * 1.6)], 3.4 - age * 0.3, 1 - age / 10);
        }
      break;
    }
    case 'fidget_a': {
      const { scrape, shine } = beats.fidget_a;
      // Tiny sparks with every scrape, a star on the clean claws.
      for (let i = 0; i < 6; i++) {
        const at = scrape + i * 2;
        const c = pt(f, 'clawR', at);
        if (c && frame >= at && frame < at + 3) sparkle(f.above, [c[0] + (i % 2 ? 2 : -2), c[1] - 1], 1.8, 1 - (frame - at) / 3);
      }
      for (const name of ['clawR', 'clawL']) {
        const c = pt(f, name);
        if (c && frame >= shine && frame < shine + 9) sparkle(f.above, [c[0] + 1, c[1] - 3], 4.5 - (frame - shine) * 0.4, 1 - (frame - shine) / 9);
      }
      break;
    }
    case 'fidget_b': {
      const { rub: start, bliss } = beats.fidget_b;
      // «Scritch» marks where the tail tip rubs, then a little heart floats up.
      const tip = pt(f, 'tailTip');
      if (tip && frame >= start && frame < bliss)
        for (let i = 0; i < 2; i++) {
          const k = ((frame - start + i * 2) % 4) / 4;
          f.above.col('#fff6e0', 1 - k);
          oval(f.above, [tip[0] + (i ? 5 : -5), tip[1] - 2], 2.5 + k * 2, 2 + k * 1.5, '#fff6e0', 1 - k, i ? -0.9 : Math.PI - 0.9, i ? 0.9 : Math.PI + 0.9);
        }
      const crown = pt(f, 'crown');
      if (crown && frame >= bliss - 2 && frame < bliss + 12) {
        const k = (frame - bliss + 2) / 14;
        heart(f.above, [crown[0] + 4 + Math.sin(k * 6) * 2, crown[1] - 8 - k * 14], 2, 1 - progress(k, 0.6, 1));
      }
      break;
    }
    case 'wake_startled': {
      const { jolt } = beats.wake_startled;
      const ball = pt(f, 'ball', jolt);
      if (ball && frame >= jolt && frame < jolt + 7) {
        const k = (frame - jolt) / 7;
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + (i - 2) * 0.45;
          const r0 = 28 + k * 6;
          f.above.col(i % 2 ? gold[2] : '#ffffff', 1 - k);
          f.above.line(Math.round(ball[0] + Math.cos(ang) * r0), Math.round(ball[1] + Math.sin(ang) * r0), Math.round(ball[0] + Math.cos(ang) * (r0 + 5)), Math.round(ball[1] + Math.sin(ang) * (r0 + 5)));
        }
      }
      break;
    }
    case 'sleep': {
      // «z» float up from the top of the ball one after another.
      const ball = pt(f, 'ball');
      if (!ball) break;
      for (let i = 0; i < 3; i++) {
        const age = (frame + i * 24) % 72;
        const k = age / 44;
        if (k > 1) continue;
        zed(f.above, [ball[0] + 12 + Math.sin(k * 6 + i) * 2 + k * 8, ball[1] - 22 - k * 22], 2.5 + k * 2.5, 1 - progress(k, 0.7, 1));
      }
      break;
    }
  }
}
