import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { Pen } from '../fx/pen';
import { drawSim, particleScale, simulate, type ParticleKind, type ParticleSpec, type SimSnapshot } from '../fx/sim';

const ground = (x: number) => (x < 36 ? 40 : 47);
const kinds: ParticleKind[] = ['spark', 'mote', 'streak', 'flake', 'vapour', 'dust', 'smoke', 'fire',
  'ember', 'star', 'brand', 'grit', 'shard', 'chunk', 'drip'];
const recipe: ParticleSpec[] = kinds.map((kind, i) => ({
  kind, x: 30, y: 22, vx: i - 5, vy: -9, spread: 11, life: .38 + i * .025, delay: (i % 3) / 24,
}));

function surfaces(frame: SimSnapshot) {
  const pen = () => new Pen(createCanvas(96, 80).getContext('2d'), 0, 0, 0, 0);
  const layers = { above: pen(), under: pen(), light: pen() };
  layers.light.g.globalCompositeOperation = 'lighter';
  drawSim(layers, frame);
  return Object.fromEntries(Object.entries(layers).map(([key, p]) =>
    [key, p.g.getImageData(0, 0, 96, 80).data])) as Record<keyof typeof layers, Uint8ClampedArray>;
}

function visible(data: Uint8ClampedArray) {
  let min = 96, max = -1, peak = 0, count = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (!data[i]) continue;
    const x = ((i - 3) / 4) % 96;
    min = Math.min(min, x); max = Math.max(max, x);
    peak = Math.max(peak, data[i]); count++;
  }
  return { span: max - min + 1, peak, count };
}

test('all particle kinds seek identically in arbitrary order, including fractional time, cache and children', () => {
  const opts = { seed: 17, ground, cache: false };
  const times = [.031, .252, .752, 1.003, 1.312, .414, .249, 2.87, .753];
  const expected = times.map(t => simulate(t, recipe, opts));
  for (let i = times.length - 1; i >= 0; i--) {
    const cached = simulate(times[i], recipe, { ...opts, cache: true });
    assert.deepEqual(cached, expected[i]);
    assert.deepEqual(surfaces(cached), surfaces(expected[i]));
  }
  assert.notDeepEqual(simulate(.25, recipe, { ...opts, seed: 18 }).particles, simulate(.25, recipe, opts).particles);
  const edit: ParticleSpec[] = [{ kind: 'grit', x: 2, y: 2, vy: 3 }];
  const first = simulate(.5, edit, { ...opts, cache: true });
  edit[0].vy = -95;
  assert.notDeepEqual(simulate(.5, edit, { ...opts, cache: true }), first);
  assert.deepEqual(simulate(.5, edit, { ...opts, cache: true }), simulate(.5, edit, opts));
});

test('spark, grit, weighted ember and debris rebound from ground(x), stop, and vanish', () => {
  for (const kind of ['spark', 'grit', 'ember', 'shard', 'chunk', 'drip'] as const) {
    const spec = [{ kind, x: 28, y: 12, vx: 25, vy: -5, angle: 0, spin: 7, gravity: .55, bounce: .48, life: 2 }];
    const opts = { ground, scale: 1, cache: true };
    let bounce = false, rest = false, touchesLowerBench = false, priorVy = 0;
    for (let tick = 1; tick <= 210; tick++) {
      const p = simulate(tick / 120, spec, opts).particles[0];
      assert.ok(p.y <= ground(p.x) + 1e-8);
      if (p.vy < 0 && priorVy > 0) bounce = true;
      if (p.x >= 36 && p.y > 40) touchesLowerBench = true;
      if (p.rest) {
        assert.equal(p.y, ground(p.x));
        assert.equal(p.vx, 0); assert.equal(p.vy, 0); assert.equal(p.spin, 0);
        rest = true;
      }
      priorVy = p.vy;
    }
    assert.ok(bounce && rest && touchesLowerBench, kind);
    assert.ok(simulate(.14, spec, opts).particles[0].angle > .5, kind);
    assert.equal(simulate(2, spec, opts).particles.length, 0);
  }
});

test('reference velocities, radii and gravity scale around the absolute emission point', () => {
  const flat = () => Infinity;
  const spec: ParticleSpec[] = [{ kind: 'spark', x: 31, y: 21, vx: 48, vy: -58, size: 2, delay: .1 }];
  const a = simulate(.37, spec, { ground: flat, scale: 1 }).particles[0];
  const b = simulate(.37, spec, { ground: flat }).particles[0];
  assert.equal(simulate(.09, spec, { ground: flat }).particles.length, 0);
  assert.equal(simulate(-.1, spec, { ground: flat }).particles.length, 0);
  assert.ok(Math.abs((b.x - 31) / (a.x - 31) - particleScale) < 1e-10);
  assert.ok(Math.abs((b.y - 21) / (a.y - 21) - particleScale) < 1e-10);
  assert.equal(b.size, a.size * particleScale);
});

test('ink, smoke alpha and additive light remain independent during cooling and expansion', () => {
  const flat = () => 74;
  const plume: ParticleSpec[] = [{ kind: 'smoke', x: 46, y: 34, life: 1, size: 5, palette: ['#002244', '#cdd8dd'] }];
  const early = visible(surfaces(simulate(.16, plume, { ground: flat })).under);
  const wide = surfaces(simulate(.64, plume, { ground: flat }));
  assert.ok(visible(wide.under).span > early.span);
  assert.ok(visible(wide.under).peak < 255 && visible(wide.under).peak > 25);
  assert.ok(visible(surfaces(simulate(.96, plume, { ground: flat })).under).peak < early.peak);
  assert.equal(visible(wide.above).count, 0);
  assert.equal(visible(wide.light).count, 0);

  const flame: ParticleSpec[] = [{ kind: 'fire', x: 45, y: 36, life: .25, size: 2, palette: 'material:lava' }];
  assert.ok(visible(surfaces(simulate(.1, flame, { ground: flat })).light).count > 0);
  const cooled = simulate(.255, flame, { ground: flat });
  assert.deepEqual(cooled.particles.map(p => p.kind), ['smoke']);
  assert.equal(cooled.particles[0].birth, .25);
  assert.equal(simulate(2, flame, { ground: flat }).particles.length, 0);

  const brand: ParticleSpec[] = [{ kind: 'brand', x: 46, y: 20, life: .9 }];
  assert.ok(simulate(.15, brand, { ground: flat }).particles.some(p => p.kind === 'fire'));
  const cleared = simulate(4, brand, { ground: flat });
  assert.equal(cleared.particles.length, 0);
});

test('a faster spark stretches along its velocity and each vocabulary entry paints pixels', () => {
  const spark = (vx: number) => visible(surfaces(simulate(.01, [{ kind: 'spark', x: 33, y: 33, vx }], { ground })).above).span;
  assert.ok(spark(125) > spark(5));
  for (const kind of kinds) {
    const frame = simulate(.14, [{ kind, x: 44, y: 32, size: 2 }], { ground, seed: 11 });
    const pixels = surfaces(frame);
    assert.ok(visible(pixels.above).count + visible(pixels.under).count > 0, kind);
  }
});
