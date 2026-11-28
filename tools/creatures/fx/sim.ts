// Physics adapted from https://github.com/patch-gg/pixelfx/blob/5294518/src/core/sim.js
// and Sprite Fusion (MIT, Copyright 2026 Hugo Duprez). See ../vendor/pixelfx/NOTICE.md and LICENSE.
// A reference actor is 38 px high; a 1.8× scale puts it at 68.4 px, inside our 60–80 px range.
// Position is already in field pixels. Size, source velocity and acceleration scale together so
// an arc covers the same fraction of the silhouette in the same time. Seconds and angles are unchanged.
import { hash } from '../kit/f11-mobkit';
import { fit, type FxPalette } from './palette';

export { drawSim } from './sim-paint';
export const particleScale = 1.8;
const hz = 120;
const gravity = 950;
const vapourRamp = ['#455b6b', '#617581', '#84949c', '#a5b3b6', '#c3ccca', '#e0e6df'];
const smokeRamp = ['#252638', '#393846', '#56505b', '#766d71', '#9f9595', '#c3b8b1'];

// Each material has its own trajectory even when it shares a painter or palette.
const kinds = {
  spark:  { g: .45, drag: 2.2, bounce: .45, life: .55, size: 1 },
  mote:   { g: 0, drag: .6, bounce: 0, life: .65, size: .7 },
  streak: { g: 0, drag: -3, bounce: 0, life: .26, size: 1 },
  flake:  { g: .037, drag: 2.2, bounce: 0, life: 1.2, size: 1 },
  vapour: { g: -.02, drag: 2, bounce: 0, life: .85, size: 2.2 },
  dust:   { g: -.006, drag: 3.6, bounce: 0, life: .55, size: 1.7 },
  smoke:  { g: -.025, drag: 1.3, bounce: 0, life: 1.05, size: 2.4 },
  fire:   { g: -.10, drag: 3.2, bounce: 0, life: .38, size: 2.3 },
  ember:  { g: -.03, drag: 1.6, bounce: .35, life: .9, size: .85 },
  star:   { g: -.005, drag: 1.5, bounce: 0, life: .62, size: 1.5 },
  brand:  { g: .8, drag: .9, bounce: 0, life: 1.3, size: 1.5 },
  grit:   { g: 1, drag: .8, bounce: .33, life: .85, size: .9 },
  shard:  { g: 1, drag: .7, bounce: .42, life: 1.1, size: 2.5 },
  chunk:  { g: 1, drag: .8, bounce: .30, life: 1.25, size: 1.9 },
  drip:   { g: .75, drag: .1, bounce: 0, life: .8, size: 1.1 },
} as const;

export type ParticleKind = keyof typeof kinds;
export interface ParticleSpec {
  kind: ParticleKind;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  /** Seeded independent variation in each velocity component, in reference pixels per second. */
  spread?: number;
  life?: number;
  delay?: number;
  size?: number;
  /** Fraction of reference gravity. Positive y points toward the scene floor. */
  gravity?: number;
  bounce?: number;
  angle?: number;
  spin?: number;
  palette?: FxPalette;
  smokePalette?: FxPalette;
  layer?: 'under' | 'above';
}

export interface SimOptions {
  ground: (x: number) => number;
  seed?: number;
  scale?: number;
  palette?: FxPalette;
  /** Opt in for a static ground function. Snapshots are keyed by recipe content, not render order. */
  cache?: boolean;
}

interface Particle {
  kind: ParticleKind;
  x: number; y: number;
  vx: number; vy: number;
  angle: number; spin: number;
  birth: number; life: number;
  size: number; phase: number;
  g: number; drag: number; bounce: number;
  rest: boolean;
  ramp: readonly string[];
  smoke: readonly string[];
  layer: 'under' | 'above';
}
export type SimParticle = Readonly<Particle>;
export interface SimSnapshot {
  time: number;
  scale: number;
  particles: readonly SimParticle[];
}

function create(spec: ParticleSpec, seed: number, index: number, scale: number, palette?: FxPalette): Particle {
  const base = kinds[spec.kind];
  const soft = ['smoke', 'vapour', 'dust'].includes(spec.kind);
  const rigid = ['shard', 'chunk', 'grit', 'brand', 'drip'].includes(spec.kind);
  const spread = spec.spread ?? 0;
  const smoke = fit(spec.smokePalette ?? smokeRamp, 6);
  const natural: FxPalette = spec.kind === 'smoke' ? smokeRamp : spec.kind === 'vapour' ? vapourRamp
    : spec.kind === 'dust' ? 'material:thorns' : 'material:lava';
  const paint = spec.palette ?? palette ?? natural;
  return {
    kind: spec.kind, x: spec.x, y: spec.y,
    vx: ((spec.vx ?? 0) + (2 * hash(seed, index, 1) - 1) * spread) * scale,
    vy: ((spec.vy ?? 0) + (2 * hash(seed, index, 2) - 1) * spread) * scale,
    size: (spec.size ?? base.size) * scale, birth: Math.max(0, spec.delay ?? 0), life: spec.life ?? base.life,
    g: spec.gravity ?? base.g, drag: base.drag, bounce: spec.bounce ?? base.bounce,
    angle: spec.angle ?? hash(seed, index, 3) * Math.PI * 2,
    spin: spec.spin ?? (rigid ? (hash(seed, index, 4) - .5) * 18 : 0),
    phase: hash(seed, index, 5) * Math.PI * 2, rest: false, ramp: fit(paint, 6), smoke,
    layer: spec.layer ?? (soft ? 'under' : 'above'),
  };
}

function cloud(source: Particle, time: number, scale: number): Particle {
  return { ...source, kind: 'smoke', layer: 'under', angle: 0, spin: 0, rest: false,
    birth: time, life: .68 + .18 * Math.cos(source.phase), size: Math.max(.7 * scale, source.size * .85),
    vx: source.vx * .35, vy: Math.min(0, source.vy * .35) - 5 * scale,
    g: kinds.smoke.g, drag: kinds.smoke.drag, bounce: 0, ramp: source.smoke };
}

function integrate(p: Particle, dt: number, t: number, scale: number, ground: SimOptions['ground']) {
  if (p.rest || dt <= 0) return;
  let wind = 0;
  if (p.kind === 'flake') wind = 30 * Math.sin(p.phase + t * 3.2);
  if (p.kind === 'ember' && p.g <= 0) wind = 44 * Math.cos(p.phase + t * 2.3);
  if (p.kind === 'smoke' || p.kind === 'vapour') wind = 13 * Math.sin(p.phase + t * 1.5);
  if (p.kind === 'fire') wind = 27 * Math.sin(p.phase + t * 16);
  const drag = Math.exp(-p.drag * dt);
  p.vx = (p.vx + wind * scale * dt) * drag;
  p.vy = (p.vy + gravity * p.g * scale * dt) * drag;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.angle += p.spin * dt;
  if (p.g <= 0 || p.vy <= 0) return;
  const floor = ground(p.x);
  if (p.y < floor) return;
  p.y = floor;
  const rebound = p.vy * p.bounce;
  if (rebound > 8 * scale) {
    p.vy = -rebound;
    p.vx *= .68;
    p.spin *= .62;
  } else {
    p.vx = p.vy = p.spin = 0;
    p.rest = true;
  }
}

function advance(particles: Particle[], from: number, to: number, scale: number, ground: SimOptions['ground']) {
  // Children are appended in a fixed order, and accrue only the time since their birth.
  let kept = 0;
  for (const p of particles) {
    const start = Math.max(from, p.birth), death = p.birth + p.life;
    if (to >= start) {
      integrate(p, Math.min(death, to) - start, start - p.birth, scale, ground);
      if (p.kind === 'brand') {
        const puff = Math.floor((to - p.birth) * 16);
        if (!p.rest && puff > Math.floor((start - p.birth) * 16) && to < death) {
          const fire = { ...p, kind: 'fire' as const, x: p.x, y: p.y, vx: p.vx * .12, vy: -9 * scale,
            birth: to, life: .13 + .04 * Math.cos(p.phase + puff), size: p.size * .64,
            g: kinds.fire.g, drag: kinds.fire.drag, phase: p.phase + puff, spin: 0, bounce: 0 };
          particles.push(fire);
        }
        if (p.rest) {
          particles.push(cloud(p, to, scale));
          continue;
        }
      }
      if (to >= death) {
        if (p.kind === 'fire') particles.push(cloud(p, death, scale));
        continue;
      }
    }
    particles[kept++] = p;
  }
  particles.length = kept;
}

const copy = (particles: Particle[]) => particles.map(p => ({ ...p }));
type Checkpoints = Map<number, Particle[]>;
const caches = new WeakMap<SimOptions['ground'], Map<string, Checkpoints>>();
function checkpoints(specs: readonly ParticleSpec[], opts: SimOptions) {
  let effects = caches.get(opts.ground);
  if (!effects) caches.set(opts.ground, effects = new Map());
  const key = JSON.stringify([opts.seed ?? 1, opts.scale ?? particleScale, opts.palette, specs]);
  let saved = effects.get(key);
  if (!saved) {
    if (effects.size >= 16) effects.delete(effects.keys().next().value!);
    effects.set(key, saved = new Map());
  }
  return saved;
}

/** Stateless seeking. Only integer 120 Hz checkpoints can seed another render; a fractional tail never does. */
export function simulate(time: number, specs: readonly ParticleSpec[], opts: SimOptions): SimSnapshot {
  const scale = opts.scale ?? particleScale;
  if (!Number.isFinite(time) || !(Number.isFinite(scale) && scale > 0)) throw RangeError('Invalid simulation time or scale');
  if (time < 0 || !specs.length) return { time, scale, particles: [] };
  const tick = Math.floor(time * hz);
  const saved = opts.cache ? checkpoints(specs, opts) : undefined;
  let start = 0;
  if (saved) for (const index of saved.keys()) if (index <= tick && index > start) start = index;
  const prior = saved?.get(start);
  const particles = prior ? copy(prior) : specs.map((spec, i) => create(spec, opts.seed ?? 1, i, scale, opts.palette));
  for (let step = start + 1; step <= tick && particles.length; step++) {
    advance(particles, (step - 1) / hz, step / hz, scale, opts.ground);
    if (saved && step % 30 === 0 && !saved.has(step)) {
      if (saved.size >= 20) saved.delete(saved.keys().next().value!);
      saved.set(step, copy(particles));
    }
  }
  if (time > tick / hz && particles.length) advance(particles, tick / hz, time, scale, opts.ground);
  return { time, scale, particles: particles.filter(p => time >= p.birth && time < p.birth + p.life) };
}
