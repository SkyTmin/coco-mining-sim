import test from 'node:test';
import assert from 'node:assert/strict';
import { Px } from '../rig/px';
import { maskOverlap, petClipIssues } from '../studio/pet-gate';

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
