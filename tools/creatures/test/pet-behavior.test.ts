import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import { createPetBehavior, interruptFrames, petDirections, turnFramesFor, validateBehavior } from '../viewer/behavior.mjs';
import { attachPetBehavior, placement, reelChapters } from '../motion';
import { type Creature, type MotionPlan } from '../types';
const config = JSON.parse(readFileSync(new URL('../../../assets/creatures/meadow_colossus/behavior.json', import.meta.url), 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../bodies/behavior.schema.json', import.meta.url), 'utf8'));
const clips = Object.fromEntries(Object.entries({
  idle: 3.5, fidget_a: 2, fidget_b: 2.5, look: 1.5, happy: 2, trick: 2.5,
  sleep_in: 1.25, sleep: 3.5, sleep_out: 1.25, wake_startled: 1,
  hatch: 3, turn: 4, tired: 2, tech_forefall: 2, tech_heelwave: 1.75,
  ...Object.fromEntries(petDirections.map(d => ['walk_' + d, 1])),
}).map(([clip, seconds]) => [clip, {seconds, interrupt: interruptFrames(Math.round(24 * seconds),clip)}]));
const run = (seed = config.seed) => createPetBehavior(config, clips, seed);

test('behavior schema, clip names, timings and every interruption are validated', () => {
  assert.equal(new Ajv().compile(schema)(config), true);
  assert.deepEqual(validateBehavior(config, clips), []);
  assert.ok(validateBehavior({...config, walkShare:[0.1, 0.8]},clips).length);
  assert.ok(validateBehavior({...config, events:{...config.events,tap:['trick']}},clips).length);
  assert.ok(validateBehavior(config,{...clips, happy:{seconds:2, interrupt:[0,47]}}).length);
  assert.ok(validateBehavior(config,{...clips, tech_missing:clips.happy}).length);
});

test('wide attacks only start at floor positions where their entire effect fits', () => {
  const restricted = {...config, attackBounds: {tech_forefall: [0.53, 0.67, 0.72, 0.82]}};
  assert.deepEqual(validateBehavior(restricted, clips), []);
  assert.ok(validateBehavior({...config, attackBounds: {tech_forefall: [0, 0, 0.2, 0.2]}}, clips).length);
  for (const interactive of [false, true]) {
    const seen = new Set<string>();
    const pet = createPetBehavior(restricted, clips);
    for (let tick = 0; tick < 720 * 30; tick++) {
      if (interactive && tick % 97 === 0) pet.event('skill_ready');
      const state = pet.advance(1 / 24);
      if (state.anim.startsWith('tech_')) {
        seen.add(state.anim);
        if (state.anim === 'tech_forefall') {
          assert.ok(state.at[0] >= 0.53 && state.at[0] <= 0.72);
          assert.ok(state.at[1] >= 0.67 && state.at[1] <= 0.82);
        }
      }
    }
    assert.deepEqual([...seen].sort(), ['tech_forefall', 'tech_heelwave']);
  }
});

test('seeded 30 s excursions close on home, walk 35–50%, and play intact attacks every 30–45 s', () => {
  for (const seed of [2, 9127, config.seed]) {
    const pet = run(seed);
    const starts = [];
    for (let cycle = 0; cycle < 24; cycle++) {
      let walks = 0;
      const visited = new Set<string>();
      for (let i = 0; i < 720; i++) {
        const state = pet.sample();
        if (i === 0 || i === 719) assert.deepEqual(state.at, config.stops[0]);
        if (state.anim.startsWith('tech_') && state.frame === 0) starts.push(state.tick);
        if (state.anim.startsWith('walk_')) {
          walks++;
          visited.add(state.at.join());
          assert.equal(state.anim, 'walk_' + state.direction);
        }
        const next = pet.advance(1/24);
        const dx = (next.at[0] - state.at[0]) * config.field[0];
        const dy = (next.at[1] - state.at[1]) * config.field[1];
        assert.ok(Math.hypot(dx,dy) < 2, 'continuous floor path');
        if (state.anim.startsWith('tech_') && state.frame < clips[state.anim].seconds * 24 - 1)
          assert.equal(next.anim, state.anim);
      }
      assert.ok(walks / 720 >= 0.35 && walks / 720 <= 0.50);
      assert.ok(visited.size > 100);
    }
    assert.ok(starts.length > 12);
    for (let i = 1; i < starts.length; i++)
      assert.ok(starts[i] - starts[i-1] >= 30 * 24 && starts[i] - starts[i-1] <= 45 * 24);
  }
});

test('fixed seed, seek chunk size and renderer give the same real floor walk', () => {
  const once = run(), streamed = run(), other = run(config.seed + 1);
  let changed = false;
  for (let i = 0; i < 100; i++) {
    const single = once.advance(0.125);
    for (let t = 0; t < 3; t++) streamed.advance(1/24);
    assert.deepEqual(single, streamed.sample());
    changed ||= single.anim !== other.advance(.125).anim;
  }
  assert.ok(changed);
  const plan: MotionPlan = {stride:config.stride, yaw:config.yaw, beats:config.stops.map(at => ({at,seconds:1,anim:'idle'}))};
  const c = attachPetBehavior({id:'fixture',rarity:'uncommon',animations:clips} as unknown as Creature,plan,config);
  c.portraitOrigin = [84, 92];
  assert.deepEqual(placement(c, 'idle', 0, 0, [77, 99]).feet, c.portraitOrigin);
  const firstChapter = reelChapters(c)[0];
  assert.deepEqual(placement(c, 'showreel', firstChapter.start / 24, 0, [77, 99]).feet, c.portraitOrigin);
  const reference = run();
  for (let i = 0; i < 720; i++) {
    const row = reference.sample(), pos = placement(c,'life',i/24,0,[77,99]);
    assert.deepEqual(pos.feet, [row.at[0] * 160, row.at[1] * 128]);
    assert.equal(pos.anim,row.anim.startsWith('walk_') ? 'walk' : row.anim);
    assert.equal(pos.t, row.frame / 24);
    reference.advance(1/24);
  }
  const reel = reelChapters(c);
  assert.deepEqual(new Set(reel.map(x => x.name)), new Set(Object.keys(clips)));
  const boss = { ...c, animations: { ...c.animations, phase: clips.look, 'idle-f2': clips.idle, show: clips.trick } };
  assert.deepEqual(reelChapters(boss).slice(-3).map(chapter => chapter.name), ['phase', 'idle-f2', 'show']);
});

test('events interrupt within 0.3 s, leave feet planted and follow sleep / wake sequences', () => {
  const pet = run();
  const attend = (name: string, expected: string|RegExp) => {
    assert.equal(pet.event(name), true);
    let state = pet.sample();
    for (let i = 0; i < 7 && !state.anim.match(expected); i++) state = pet.advance(1/24);
    assert.match(state.anim, typeof expected === 'string' ? new RegExp('^' + expected + '$') : expected);
    return state;
  };
  pet.advance(0.1);
  attend('tap','happy');
  attend('like','trick');
  attend('idle_owner','sleep_in');
  assert.equal(pet.advance(clips.sleep_in.seconds + 8).anim,'sleep');
  const floor = pet.sample().at;
  attend('tap','wake_startled');
  assert.deepEqual(pet.sample().at, floor);
  assert.equal(pet.advance(clips.wake_startled.seconds).anim, 'happy');
  attend('idle_owner','sleep_in');
  pet.advance(6);
  attend('owner_back','sleep_out');
  attend('skill_ready',/^tech_/);
  attend('rare_find','happy');
  attend('double_tap','trick');
  assert.equal(pet.event('unknown'), false);
});

test('the rendered terminal sleep_in key joins the sleeping body without reopening its eye', async () => {
  const { loadPainting } = await import('../render');
  const { compose } = await import('../engine');
  const {c,s,b} = await loadPainting('meadow_colossus');
  const machine = createPetBehavior(c.behavior!, c.animations);
  machine.event('idle_owner');
  const end = machine.advance(c.animations.sleep_in.seconds - 1/24);
  const asleep = machine.advance(1/24);
  assert.equal(end.anim, 'sleep_in');
  assert.equal(asleep.anim, 'sleep');
  const closing = compose(c,s,b,end.anim,end.elapsed).layers.body.data;
  const resting = compose(c,s,b,'idle',0).layers.body.data;
  assert.notDeepEqual(closing, resting, 'final authored pose differs from awake idle');
  assert.deepEqual(closing, compose(c,s,b,asleep.anim,asleep.elapsed).layers.body.data);
});


test('live pivots use the authored bearing on approach to all eight walks, including the reverse view', async () => {
  const { loadPainting } = await import('../render');
  const { meadowTurnBearing } = await import('../c/meadow_colossus-walk');
  const {c} = await loadPainting('meadow_colossus');
  const config = c.behavior!, bearings = c.animations.turn.bearings!;
  assert.equal(bearings.length, 96);
  const delta = (a: number, b: number) => Math.atan2(Math.sin(b-a), Math.cos(b-a));
  for (const [index,dir] of petDirections.entries()) {
    const walkBearing = Math.PI * index / 4;
    const stand = config.yaw;
    for (const [from,to] of [[stand,walkBearing],[walkBearing,stand]]) {
      const frames = turnFramesFor(bearings, from, to);
      let last = from;
      for (const f of frames) {
        const at = placement(c,'turn',f/24,0,[77,99]);
        assert.ok(Math.abs(delta(stand + at.side*Math.PI/8,meadowTurnBearing(f/24))) < 1e-8);
        const heading = bearings[f];
        assert.ok(Math.abs(delta(last,heading)) < .35, dir + ': sudden change of view');
        last = heading;
      }
      assert.ok(Math.abs(delta(last,to)) < .06, dir + ': wrong final bearing');
    }
  }
  const pet = createPetBehavior(config, c.animations);
  let last = pet.sample();
  for (let tick = 0; tick < 24 * 600; tick++) {
    const here = pet.advance(1/24);
    if (last.anim === 'turn' && here.anim.startsWith('walk_')) {
      const desired = petDirections.indexOf(here.direction) * Math.PI / 4;
      assert.ok(Math.abs(delta(bearings[last.frame],desired)) < .065, 'scheduled ' + here.anim);
    }
    last = here;
  }
});
test('a 135-degree compass pivot takes nine ticks in both directions', () => {
  const bearings = Array.from({length: 96}, (_, i) => i * Math.PI / 48);
  for (const [from, to] of [[5, 0], [0, 5], [6, 1], [1, 6], [7, 2], [2, 7]]) {
    const frames = turnFramesFor(bearings, from * Math.PI / 4, to * Math.PI / 4);
    assert.equal(frames.length, 9);
    assert.equal(frames.at(-1), to * 12);
  }
});
