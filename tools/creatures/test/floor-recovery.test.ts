import assert from 'node:assert/strict';
import test from 'node:test';
import { floorRecovery, type RecoverySample } from '../tech-metrics';

const pose = (height: number, centreY: number, supportX = 30): RecoverySample =>
  ({ height, centreY, supports: [[supportX, 100 - height]] });

test('a blow must descend into contact and leave the floor on its rebound', () => {
  const hit = pose(0, 76), windup = pose(36, 60), recoil = pose(14, 68);
  assert.deepEqual(floorRecovery('rebound', 80, windup, [hit, hit, recoil], 2).issues, []);
  assert.match(floorRecovery('rebound', 80, windup, [hit, hit, hit], 2).issues.join(), /did not rebound/);
  assert.match(floorRecovery('rebound', 80, hit, [hit, recoil], 1).issues.join(), /did not descend/);
});

test('a landing needs compression over a planted support and a subsequent rise', () => {
  const flight = pose(25, 40), hit = pose(0, 72), load = pose(0, 79), rise = pose(0, 70);
  assert.deepEqual(floorRecovery('absorb', 80, flight, [hit, hit, load, rise], 2).issues, []);
  assert.match(floorRecovery('absorb', 80, flight, [hit, hit, hit], 1).issues.join(), /did not compress/);
  assert.match(floorRecovery('absorb', 80, flight, [hit, load, load], 1).issues.join(), /did not rise/);
  assert.match(floorRecovery('absorb', 80, flight, [hit, pose(0, 79, 35), rise], 1).issues.join(), /slid/);
});
