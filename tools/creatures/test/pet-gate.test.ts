import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import legacyBehavior from '../../../assets/creatures/meadow_colossus/behavior.json' with { type: 'json' };
import behaviorSchema from '../bodies/behavior.schema.json' with { type: 'json' };
import { Px } from '../rig/px';
import { joinsSleep, maskOverlap, petClipIssues } from '../studio/pet-gate';
import { petDirections } from '../viewer/behavior.mjs';

test('a displaced one-shot cannot pass by registering its silhouette back to idle', () => {
  const idle = new Px(12, 12), offset = new Px(12, 12);
  for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) {
    idle.data[4 * (y * 12 + x) + 3] = 255;
    offset.data[4 * (y * 12 + x + 1) + 3] = 255;
  }
  assert.equal(maskOverlap(idle, idle), 1);
  assert.ok(maskOverlap(idle, offset) < 0.90);
  assert.equal(maskOverlap(new Px(1, 1), new Px(1, 1)), 0);
});

test('new clips need independent sheets and the declared pet timing', () => {
  const issues = petClipIssues({
    idle: { seconds: 3, loop: true }, happy: { seconds: 0.8, loop: false },
    tech_stamp: { seconds: 2 }, walk_ne: { seconds: 1, loop: true },
    showreel: { seconds: 30, loop: true },
  }, ['idle','walk_ne']);
  assert.ok(issues.some(s => s === 'missing walk_s'));
  assert.ok(issues.some(s => s.includes('happy duration')));
  assert.ok(issues.some(s => s.includes('tech_stamp has no registered')));
  assert.ok(!issues.some(s => s.startsWith('showreel') || s.startsWith('walk_ne')));
});

test('only family motions can be supplied without a character sheet', () => {
  const clips = { walk_n: { seconds: 1, loop: true }, sleep: { seconds: 3, loop: true }, trick: { seconds: 2 } };
  const issues = petClipIssues(clips, [], ['walk_n', 'sleep', 'trick']);
  assert.ok(issues.includes('invalid body-derived clip trick'));
  assert.ok(issues.includes('trick has no registered sheet'));
  assert.ok(!issues.includes('walk_n has no registered sheet'));
  assert.ok(!issues.includes('sleep has no registered sheet'));
  assert.ok(issues.includes('missing walk_ne'));
});

test('a derived sleep loop shares its pose with the three sleeping endpoints', () => {
  for (const name of ['sleep_in', 'sleep_out', 'wake_startled', 'happy', 'tech_stamp']) {
    assert.equal(joinsSleep(name, true), name === 'sleep_out' || name === 'wake_startled');
    assert.equal(joinsSleep(name, false), name === 'sleep_in');
  }
});

test('multi-act tricks require three to four seconds and an ending', () => {
  const trickIssues = (seconds: number, loop: boolean, multiAct: boolean) =>
    petClipIssues({ trick: { seconds, loop } }, ['trick'], [], multiAct)
      .filter(issue => issue.startsWith('trick '));
  assert.deepEqual(trickIssues(3.75, false, true), []);
  assert.equal(trickIssues(3.75, false, false).length, 1);
  assert.equal(trickIssues(2.5, false, true).length, 1);
  assert.equal(trickIssues(4.1, false, true).length, 1);
  assert.equal(trickIssues(3.5, true, true).length, 1);
});

test('the behavior schema accepts either legacy attacks or tricks for one or both forms', () => {
  const validate = new Ajv().compile(behaviorSchema);
  const { attacks, attackInterval, ...shared } = legacyBehavior;
  const { skill_ready, ...events } = shared.events;
  const { trick, ...weights } = shared.weights;
  const behavior = { ...shared, events, weights, tricks: { f1: ['trick'], f2: ['trick-f2'] } };
  assert.ok(validate(legacyBehavior));
  assert.ok(validate(behavior));
  assert.ok(validate({
    ...behavior,
    events: { ...events, skill_ready: ['trick'] },
    tricks: { f1: ['trick_b', 'trick'], f2: ['trick_b-f2', 'trick-f2'] },
  }));
  // Below legendary there is no second form.
  assert.ok(validate({ ...behavior, tricks: { f1: ['trick', 'trick_b'] } }));
  for (const invalid of [
    { ...behavior, attacks },
    { ...behavior, attackInterval },
    { ...behavior, lifeAttacks: attacks },
    { ...behavior, attackBounds: {} },
    { ...behavior, events: { ...events, skill_ready } },
    { ...behavior, tricks: { f2: ['trick-f2'] } },
    { ...behavior, tricks: { f1: ['trick_b'], f2: ['trick-f2'] } },
    { ...behavior, tricks: { f1: ['trick'], f2: ['trick-f2', 'trick-f2'] } },
  ]) assert.equal(validate(invalid), false);
});

test('the secret clip gate requires two authored tricks in each form and disallows combat', () => {
  const tricks = { f1: ['trick', 'trick_b'], f2: ['trick-f2', 'trick_b-f2'] };
  const clips = {
    idle: { seconds: 3, loop: true },
    fidget_a: { seconds: 1.5 }, fidget_b: { seconds: 1.5 },
    look: { seconds: 1.5 }, happy: { seconds: 1.5 },
    sleep_in: { seconds: 1 }, sleep: { seconds: 3, loop: true }, sleep_out: { seconds: 1 },
    wake_startled: { seconds: 1 }, hatch: { seconds: 3 }, turn: { seconds: 4 }, tired: { seconds: 2 },
    ...Object.fromEntries(petDirections.map(direction => ['walk_' + direction, { seconds: 1, loop: true }])),
    trick: { seconds: 5 },
    trick_b: { seconds: 7 },
    'trick-f2': { seconds: 6 },
    'trick_b-f2': { seconds: 5.5 },
    'happy-f2': { seconds: 1.5 },
    'idle-f2': { seconds: 3, loop: true },
    phase: { seconds: 2.5 },
    show: { seconds: 5.5 },
    peek: { seconds: 2 },
  };
  const inspect = (animations: Parameters<typeof petClipIssues>[0], forms = tricks) =>
    petClipIssues(animations, Object.keys(animations), [], false, 'secret', forms);
  assert.deepEqual(inspect(clips), []);
  assert.ok(inspect(clips, { ...tricks, f2: ['trick-f2'] }).includes('a secret painting needs two tricks in each form'));
  for (const [name, seconds] of [['phase', 1.9], ['show', 4.9], ['trick_b-f2', 4.9]] as const)
    assert.ok(inspect({ ...clips, [name]: { seconds } }).some(issue => issue.startsWith(name + ' duration')));
  // No upper cap: a secret's tricks, phase and show run as long as their story needs.
  assert.deepEqual(inspect({ ...clips, trick: { seconds: 12 }, 'trick-f2': { seconds: 11 }, phase: { seconds: 4 }, show: { seconds: 9 } }), []);
  for (const name of ['tech_stamp', 'die'])
    assert.ok(inspect({ ...clips, [name]: { seconds: 2 } }).some(issue => issue.startsWith(name + ' is forbidden')));
});
