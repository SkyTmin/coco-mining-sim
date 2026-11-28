import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas } from '@napi-rs/canvas';
import { compose } from '../engine';
import { Px } from '../rig/px';
import { authoredKeys, FxFrameGate, FRAME_BUDGET_MS, fxFinding, scanFxClip } from '../studio/fx-gate';
import { nondeterminism, legacyFxWarnings } from '../studio/fx-sources';
import type { Painting } from '../studio/checks';
import type { Creature, FxInput } from '../types';

function painting(options: Partial<Creature> = {}): Painting {
  return { c: {
    id: 'fx_test', rarity: 'common', theme: 'test', size: [64, 48, 32, 4],
    animations: { idle: { seconds: 1, loop: true }, trick: { seconds: 5 / 24 } },
    frame: () => ({ px: new Px(8, 8), points: {}, primitives: 0, eye: null, anchor: [4, 6] }),
    ...options,
  }, b: { wood: ['#102030', '#203040', '#304050', '#405060'], accent: '#607080' }, s: () => {} };
}
const mark = (f: FxInput, x: number, y: number) => { f.above.col('#ff8933'); f.above.dot(x, y); };
const errors = (c: Painting, keys?: Set<number>) => scanFxClip(new FxFrameGate(c, 'trick', keys)).filter(f => f.kind !== 'slow-frame');

test('gate reads visible colour and additive ink beyond the field, even entirely outside the canvas', () => {
  const sprite = createCanvas(9, 9);
  sprite.getContext('2d').fillRect(4, 4, 1, 1);
  const p = painting({ effects: f => {
    if (f.anim !== 'trick') return;
    const n = Math.round(f.t * 24);
    if (!n) f.above.img(sprite, -4, -4); // the only visible texel lands at (0, 0)
    if (n === 1) { mark(f, -97, 14); }
    if (n === 2) { f.light.col('#ff8822', 0.45); f.light.dot(67, 9); }
    if (n === 3) { f.above.col('#ddeeff', 0); f.above.dot(-4, 9); }
  } });
  const findings = errors(p);
  assert.deepEqual(findings.map(f => [f.kind, f.frames, f.level]), [['fx-bounds', [1, 2], 'error']]);
  assert.match(findings[0].note, /-97, 14/);
});

test('gate compares the actual last authored FX and light to rest ink, leaving props and touching edges alone', () => {
  const p = painting({ props: f => mark(f, f.w - 1, 3), effects: f => {
    mark(f, 12, 20); // permanent bench attachment in an old-style effect
    if (f.anim === 'trick' && Math.round(f.t * 24) === 4) { f.light.col('#ff5533'); f.light.dot(2, 4); }
  } });
  const findings = errors(p);
  assert.deepEqual(findings.map(f => [f.kind, f.frames]), [['fx-end', [4]]]);
  assert.match(findings[0].note, /1 residual/);
  p.c.effects = f => mark(f, 12, 20);
  assert.deepEqual(errors(p), []);
});

test('a key authorizes a sudden movement of the hand or weapon on that frame only', () => {
  const p = painting(), normal = p.c.frame;
  p.c.frame = (...args) => {
    const result = normal(...args);
    const x = args[0] === 'trick' && args[1] >= 2 / 24 ? 32 : 0;
    return { ...result, points: { weaponTip: [x, 0], handR: [x, 3], decorative: [x * 4, 0] } };
  };
  const findings = errors(p, new Set([4]));
  assert.deepEqual(findings.map(f => [f.kind, f.frames]), [['socket-teleport', [2]]]);
  assert.deepEqual(errors(p, new Set([2, 4])), []);
});

test('scanner reports global TS references with source lines, including bracket access, and leaves prose and local clocks alone', () => {
  const src = [
    "// Math.random() and Date.now()", "const tip = 'performance.now()';",
    "function local(Date: { now(): number }) { return Date.now(); }",
    "const x = Math['random']();", 'const y = new Date();',
    'const z = `time ${globalThis.performance.now()}`;',
  ].join('\n');
  assert.deepEqual(nondeterminism(src, 'c/test.ts'), [
    { name: 'Math.random', line: 4 }, { name: 'Date', line: 5 }, { name: 'performance.now', line: 6 },
  ]);
});

test('all four new errors downgrade only for the exact 14 known failing paintings, timing always warns', () => {
  assert.equal(legacyFxWarnings.size, 14);
  for (const kind of ['fx-end', 'fx-bounds', 'socket-teleport', 'unseeded'] as const) {
    assert.equal(fxFinding('astral_seer', 'trick', kind, [2], '').level, 'warn');
    assert.equal(fxFinding('pocket_magnet_fx', 'trick', kind, [2], '').level, 'error');
  }
  const p = painting(), normal = p.c.frame;
  p.c.frame = (...args) => {
    if (args[0] === 'trick' && Math.round(args[1] * 24) === 2) {
      const end = performance.now() + FRAME_BUDGET_MS + 3;
      while (performance.now() < end) { /* deliberate slow frame */ }
    }
    return normal(...args);
  };
  const gate = new FxFrameGate(p, 'trick');
  const start = performance.now();
  const frame = compose(gate.creature, p.s, p.b, 'trick', 2 / 24);
  gate.frame(2, frame, performance.now() - start);
  const findings = gate.findings();
  assert.equal(findings.find(f => f.kind === 'slow-frame')?.level, 'warn');
  assert.deepEqual(findings.find(f => f.kind === 'slow-frame')?.frames, [2]);
});

test('reusing the accepted star prop does not exempt a new effect at its four known outside pixels', async () => {
  const { loadPainting } = await import('../render');
  const p = await loadPainting('pocket_magnet');
  const shot = (c: Creature) => {
    const gate = new FxFrameGate({ ...p, c }, 'trick_b');
    gate.begin();
    gate.frame(97, compose(gate.creature, p.s, p.b, 'trick_b', 97 / 24), 0);
    return gate.findings();
  };
  assert.deepEqual(shot(p.c), []);
  const clone = { ...p.c, id: 'new_pet', props: p.c.effects, effects(f: FxInput) {
    f.backdrop.col('#ff8933'); f.backdrop.dot(-1, 58);
  } };
  assert.equal(shot(clone)[0]?.kind, 'fx-bounds');
  assert.equal(shot(clone)[0]?.level, 'error');
});


test('contact holds convert native keys once, and registered landmarks already name a displayed frame', async () => {
  const { timedAnimation } = await import('../kit/impact-clock');
  const { c } = painting();
  c.animations.trick = timedAnimation({ seconds: 8 / 24, hits: [3 / 24],
    contacts: [{ frame: 1, freeze: 2 }, { frame: 4 }] });
  const keys = await authoredKeys(c, { keyframes: { trick: [{ frame: 7, points: {} }] } });
  assert.deepEqual([...keys.get('trick')!].sort((a, b) => a - b), [1, 5, 6, 7]);
});

test('a one-shot and its rest comparison resolve sockets specific to each rig on the last frame', () => {
  const p = painting(), normal = p.c.frame;
  p.c.frame = (...args) => {
    const result = normal(...args);
    result.points[args[0] === 'trick' ? 'pillar0' : 'lantern'] = [4, 0];
    return result;
  };
  p.c.effects = f => {
    if (f.anim === 'trick') {
      if (Math.round(f.t * 24) === 4) { const [x, y] = f.pointAt(1 / 24, 'pillar0'); mark(f, x, y); }
    } else if (f.anim === 'idle') {
      const [x, y] = f.pointAt(1 / 24, 'lantern'); mark(f, x + 5, y);
    }
  };
  assert.deepEqual(errors(p).map(f => [f.kind, f.frames]), [['fx-end', [4]]]);
});

test('the scanner follows reused creature FX while leaving unrelated private sources with their owner', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fxSourceIssues } = await import('../studio/fx-sources');
  const dir = mkdtempSync(join(tmpdir(), 'ws-fx-sources-'));
  try {
    for (const sub of ['c', 'fx', 'scenes', 'bodies', 'kit']) mkdirSync(join(dir, sub));
    const parent = join(dir, 'c', 'base-fx.ts');
    writeFileSync(parent, 'export const flake = () => Math.random();');
    writeFileSync(join(dir, 'c', 'other-fx.ts'), 'export const t = () => Date.now();');
    mkdirSync(join(dir, 'fx', 'nested'));
    writeFileSync(join(dir, 'fx', 'nested', 'brush.ts'), 'export const t = () => performance.now();');
    const issues = fxSourceIssues('clone', ['clone', 'base', 'other'], () => new Set([parent]), dir);
    assert.deepEqual(issues, ['c/base-fx.ts:1 uses Math.random', 'fx/nested/brush.ts:1 uses performance.now']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
