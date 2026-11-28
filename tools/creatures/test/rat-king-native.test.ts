import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const gameClips = [
  'idle', 'roar', 'chase', 'rollAim', 'roll', 'whipAim', 'cleaveAim', 'summon',
  'swap', 'sweepAim', 'leapAim', 'leap', 'dizzy', 'stun', 'recover', 'dying',
];
const petClips = [
  'fidget_a', 'fidget_b', 'look', 'happy', 'trick', 'sleep_in', 'sleep',
  'sleep_out', 'wake_startled', 'hatch', 'turn', 'tired',
];

// The painter allocates its sprite buffers with document.createElement('canvas').
// Node's test runner isolates this DOM adapter in this file's own process.
Object.assign(globalThis, { document: { createElement: (tag: string) => {
  assert.equal(tag, 'canvas');
  return createCanvas(1, 1);
} } });

const { F1_CLIPS, F1_POSES, createBattle, drawActor } = await import('../viewer/f1-native.mjs');

type Battle = ReturnType<typeof createBattle>;
type Actor = { id: number; kind: string; mode: string; x: number; y: number;
  data: { petMode?: string; f1blade?: number; f1split?: number } };

function actors(battle: Battle, kind: string): Actor[] {
  return battle.state.mobs.filter((mob: Actor) => mob.kind === kind);
}

function stepUntil(battle: Battle, condition: () => boolean, seconds: number, detail: string) {
  for (let i = 0; i < seconds * 24 && !condition(); i++) battle.advance(1 / 24);
  assert.ok(condition(), detail);
}

function bodyMask(canvas: ReturnType<typeof createCanvas>) {
  const width = canvas.width, height = canvas.height;
  const bytes = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bytes[(y * width + x) * 4 + 3] < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const pixels = new Set<number>();
  // Use a common row stride even when one renderer adds a fringe pixel.
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (bytes[(y * width + x) * 4 + 3] >= 128) pixels.add((y - top) * 1024 + x - left);
    }
  }
  return pixels;
}

test('published native idle retains the archived floor-one silhouette', async t => {
  const dir = new URL('../viewer/atlases/king/', import.meta.url);
  const archive = JSON.parse(readFileSync(new URL('atlas.json', dir), 'utf8'));
  const tile = archive.clips.idle[0][6][0];
  const [page, x, y, w, h] = archive.actors.rects[tile];
  const reference = createCanvas(w, h);
  const image = await loadImage(readFileSync(new URL(archive.actors.pages[page], dir)));
  reference.getContext('2d').drawImage(image, x, y, w, h, 0, 0, w, h);
  const canvas = createCanvas(240, 200);
  drawActor(canvas.getContext('2d'), {
    kind: 'king', clip: 'idle', progress: 0, scale: 1, direction: 0, phase: 1, x: 120, y: 140, fx: false,
  });
  const expected = bodyMask(reference), actual = bodyMask(canvas);
  assert.ok(expected.size > 100);
  const intersection = [...expected].filter(point => actual.has(point)).length;
  const iou = intersection / (expected.size + actual.size - intersection);
  t.diagnostic('archive vs native idle IoU ' + iou.toFixed(4));
  assert.ok(iou >= 0.9, 'first idle silhouette IoU ' + iou.toFixed(4));
});

test('all native battle and pet clips draw in the eight compass headings', () => {
  assert.deepEqual(Object.keys(F1_CLIPS).sort(), [...gameClips].sort());
  assert.deepEqual(Object.keys(F1_POSES).sort(), [...petClips].sort());
  const surface = createCanvas(160, 160);
  const g = surface.getContext('2d');
  const rollShapes = new Set<string>();
  for (const clip of [...gameClips, ...petClips]) {
    for (let direction = 0; direction < 8; direction++) {
      g.clearRect(0, 0, surface.width, surface.height);
      drawActor(g, {
        kind: 'king', clip, direction, progress: 0.37, phase: ['swap', 'sweepAim', 'leapAim', 'leap'].includes(clip) ? 4 : 1,
        scale: 1, x: 80, y: 95, fx: false,
      });
      const mask = bodyMask(surface);
      assert.ok(mask.size > 100, clip + ' heading ' + direction + ' must contain the boss');
      if (clip === 'roll') rollShapes.add([...mask].join(','));
    }
  }
  // Ordinary poses have two native profiles. The rolling ball has its own
  // eight-angle rig, so mirroring a single attack would flatten this set.
  assert.ok(rollShapes.size > 2, 'roll needs its native oblique headings');
});

test('life plays the four health bands in order with actual guards, an independent pair and the rail', () => {
  const battle = createBattle();
  const originalCycle = battle.cycle;
  const phases: number[] = [];
  const leadModes = new Map<number, Set<string>>();
  const guards = new Set<number>();
  const guardsAt = new Map<number, number>();
  const contacts = new Set<string>();
  let shockAfterLanding = false;
  let swarmFromBurrow = false;
  const smallActions = new Map<number, Set<string>>();
  const relativePositions = new Set<string>();
  let outOfStep = false;
  for (let i = 0; i < 180 * 24 && battle.cycle === originalCycle; i++) {
    const lead = actors(battle, 'king')[0];
    const small = actors(battle, 'kinglet');
    if (phases.at(-1) !== battle.stage) phases.push(battle.stage);
    const modes = leadModes.get(battle.stage) ?? new Set();
    modes.add(lead.mode);
    leadModes.set(battle.stage, modes);
    if (battle.stage <= 2) {
      assert.equal(small.length, 0);
      assert.ok(!lead.data.f1split);
    }
    for (const guard of actors(battle, 'f1_guard')) {
      guards.add(guard.id);
      if (guard.mode === 'emerge' && !guardsAt.has(guard.id)) guardsAt.set(guard.id, battle.stage);
    }
    swarmFromBurrow ||= actors(battle, 'rat').some(m => m.mode === 'emerge');
    for (const zone of battle.state.zones) contacts.add(zone.art);
    if (battle.state.impacts?.some((hit: { art: string }) => hit.art === 'f1_shock')) {
      shockAfterLanding ||= contacts.has('f1_leap_hit');
    }
    if (small.length === 2) {
      assert.equal(new Set(small.map(m => m.id)).size, 2);
      const [a, b] = small;
      relativePositions.add([Math.round((a.x - b.x) * 8), Math.round((a.y - b.y) * 8)].join(','));
      outOfStep ||= a.mode !== b.mode;
      for (const m of small) {
        const actions = smallActions.get(m.id) ?? new Set();
        actions.add(m.mode);
        smallActions.set(m.id, actions);
      }
    }
    battle.advance(1 / 24);
  }
  assert.deepEqual(phases, [1, 2, 3, 4], 'ordered bands before the return');
  assert.ok(battle.cycle > originalCycle, 'return to a fresh cleaver cycle');
  assert.equal(battle.stage, 1);
  assert.equal(actors(battle, 'kinglet').length, 0, 'the two little kings rejoin the knot');
  assert.ok(!actors(battle, 'king')[0].data.f1blade);
  assert.ok(guards.size >= 3, 'at least three armoured guards over the full cycle');
  assert.equal([...guardsAt.values()].filter(phase => phase === 2).length, 2, 'two guards at 75% lead HP');
  assert.equal([...guardsAt.values()].filter(phase => phase === 4).length, 1, 'one further guard at the rail swap');
  assert.ok(swarmFromBurrow, 'summon brings ordinary rats out of the burrows');
  for (const contact of ['f1_split_hit', 'f1_cleaverdrop_hit', 'f1_sweep_hit', 'f1_leap_hit']) {
    assert.ok(contacts.has(contact) && contacts.has(contact + 'L'), contact + ' has floor and light layers');
  }
  assert.ok(shockAfterLanding, 'the landing releases a delayed native shock-ring impact');
  assert.ok(leadModes.get(1)?.has('cleaveAim'), 'the cleaver is used before the guard phase');
  assert.ok(leadModes.get(4)?.has('sweepAim'), 'rail sweeps replace the cleaver');
  assert.ok(leadModes.get(4)?.has('leap'), 'rail leap travels to its marked landing');
  assert.ok(!leadModes.get(4)?.has('roll'), 'only the little kings may still roll in IV');
  assert.equal(smallActions.size, 2);
  for (const moves of smallActions.values()) {
    assert.ok(moves.has('roll') || moves.has('whipAim'), 'each little king attacks for itself');
    assert.ok(!moves.has('sweepAim') && !moves.has('leap'), 'the little king keeps its own move set');
  }
  assert.ok(outOfStep && relativePositions.size > 4, 'little kings move and attack independently');
});

test('stage selection, tap, double tap, sleep and wake retain each attached or detached actor', () => {
  const battle = createBattle();
  for (const stage of [1, 2, 3, 4]) {
    battle.setStage(stage);
    stepUntil(battle, () => battle.stage === stage, 6, 'switch to stage ' + stage);
    const family = () => [...actors(battle, 'king'), ...actors(battle, 'kinglet')];
    assert.equal(family().length, stage < 3 ? 1 : 3);
    const familyIds = family().map(m => m.id);
    const expectPose = (pose: string) =>
      stepUntil(battle, () => family().every(m => m.data.petMode === pose), 6, 'family pose ' + pose);
    battle.event('tap');
    expectPose('happy');
    battle.event('like');
    expectPose('trick');
    battle.event('idle_owner');
    expectPose('sleep_in');
    expectPose('sleep');
    const positions = family().map(m => [m.x, m.y]);
    battle.advance(0.25);
    assert.deepEqual(family().map(m => [m.x, m.y]), positions, 'the family sleeps on the floor');
    battle.event('owner_back');
    stepUntil(battle, () => family().every(m => ['sleep_out', 'wake_startled'].includes(m.data.petMode ?? '')), 6,
      'the king and each detached little king wake');
    stepUntil(battle, () => family().every(m => !m.data.petMode), 6, 'resume the interrupted battle');
    assert.deepEqual(family().map(m => m.id), familyIds);
  }
  const cycle = battle.cycle;
  battle.nextStage();
  stepUntil(battle, () => battle.cycle > cycle && battle.stage === 1, 8, 'Next after IV plays the return');
  assert.equal(actors(battle, 'kinglet').length, 0);
});

test('the cleaver telegraph points toward each selected compass heading', () => {
  const surface = createCanvas(192, 192);
  const g = surface.getContext('2d');
  const origin = { x: 96, y: 112 };
  for (let direction = 0; direction < 8; direction++) {
    const options = { kind: 'king', clip: 'cleaveAim', progress: 0.21, direction, phase: 1, scale: 1, ...origin };
    const sample = (fx: boolean) => {
      g.clearRect(0, 0, surface.width, surface.height);
      drawActor(g, { ...options, fx });
      return g.getImageData(0, 0, surface.width, surface.height).data;
    };
    const body = sample(false), marked = sample(true);
    let dx = 0, dy = 0, count = 0;
    for (let y = origin.y - 48; y <= origin.y + 48; y++) {
      for (let x = origin.x - 48; x <= origin.x + 48; x++) {
        const radius = Math.hypot(x - origin.x, y - origin.y);
        if (radius < 20 || radius > 48) continue;
        const i = (y * surface.width + x) * 4;
        if (marked[i + 3] < body[i + 3] + 8) continue;
        count++;
        dx += (x - origin.x) / radius;
        dy += (y - origin.y) / radius;
      }
    }
    assert.ok(count > 10, 'visible floor telegraph at heading ' + direction);
    const angle = direction * Math.PI / 4;
    const aim = (dx * Math.cos(angle) + dy * Math.sin(angle)) / Math.hypot(dx, dy);
    assert.ok(aim > Math.cos(Math.PI / 4), 'cleaver cone follows heading ' + direction);
  }
});


test('both little kings use animated pet poses on their own smaller bodies', () => {
  const canvas = createCanvas(144, 144);
  const g = canvas.getContext('2d');
  function picture(kind: string, clip: string, progress: number, variant: number) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    drawActor(g, {kind, clip, progress, variant, direction: 0, phase: 3, scale: 1, x: 72, y: 96, fx: false});
    const bytes = g.getImageData(0, 0, canvas.width, canvas.height).data;
    return createHash('sha256').update(bytes).digest('hex');
  }
  for (const clip of petClips) {
    for (const variant of [0, 1]) {
      const poses = [0, 0.3, 0.6, 0.85].map(t => picture('kinglet', clip, t, variant));
      assert.ok(new Set(poses).size > 1, clip + ' animates little king ' + variant);
      assert.notEqual(poses[2], picture('king', clip, 0.6, variant), clip + ' uses the small rig');
    }
  }
  for (const clip of ['happy', 'trick']) {
    const distinct = [0.3, 0.5, 0.7].some(t => picture('kinglet', clip, t, 0) !== picture('kinglet', clip, t, 1));
    assert.ok(distinct, 'the two little kings perform their own ' + clip);
  }
});
