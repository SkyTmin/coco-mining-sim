import test from 'node:test';
import assert from 'node:assert/strict';
import { Px } from '../rig/px';
import { joinsSleep, maskOverlap, petClipIssues } from '../studio/pet-gate';

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
