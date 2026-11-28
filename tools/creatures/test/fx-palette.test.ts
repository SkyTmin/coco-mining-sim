import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRamp, fit } from '../fx/palette';
import { effectPresets } from '../fx/presets/materials';
import { cardIssues } from '../studio/card';
import { readCreatureCard } from '../bodies/card-data';

test('fit preserves authored inks and endpoints when expanding and compressing a ramp', () => {
  const colors = ['#000000', '#554433', '#fff0db'];
  assert.deepEqual(fit(colors, 5), [colors[0], colors[1], colors[1], colors[2], colors[2]]);
  assert.deepEqual(fit(colors, 2), [colors[0], colors[2]]);
  assert.deepEqual(fit(colors, 1), [colors[0]]);
  assert.deepEqual(fit([colors[1]], 3), Array(3).fill(colors[1]));
  assert.throws(() => fit([], 2));
  assert.throws(() => fit(colors, 0));
});

test('every material ramp is also a valid named card palette', () => {
  const card = readCreatureCard('pocket_magnet');
  for (const id of Object.keys(effectPresets) as (keyof typeof effectPresets)[]) {
    const palette = `material:${id}` as const;
    assert.equal(resolveRamp(palette), effectPresets[id].ramp);
    assert.deepEqual(cardIssues({ ...card, fxRamp: palette }, card.id), []);
  }
  assert.ok(cardIssues({ ...card, fxRamp: [] }, card.id).length);
  assert.ok(cardIssues({ ...card, fxRamp: 'material:nothing' }, card.id).length);
});
