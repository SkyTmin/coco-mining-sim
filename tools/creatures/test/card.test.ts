import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cardIssues, cardRuntimeIssues, checkCardFile, readCreatureCard } from '../studio/card';
import { writeCreatureDraft } from '../studio/new';

test('accepted cards validate; a missing or inconsistent author decision fails before drawing', () => {
  for (const id of ['bramble_warden', 'frost_yeti']) assert.deepEqual(checkCardFile(id), []);
  const accepted = readCreatureCard('bramble_warden');
  for (const change of [
    (card) => {
      card.moves[0].logic.pop();
    },
    (card) => {
      card.moves[0].logic[2] = '  ';
    },
    (card) => {
      card.details.length = 24;
    },
    (card) => {
      card.details[0] = '  ' + card.details[1].toUpperCase() + ' ';
    },
    (card) => {
      card.moves[0].parameters.repeats = 1.5;
    },
    (card) => {
      card.moves.push(card.moves[0]);
    },
    (card) => {
      card.life.beats[0].anim = 'tech_absent';
    },
    (card) => {
      card.proportions.height = 0;
    },
  ] as ((card: typeof accepted) => void)[]) {
    const changed = structuredClone(accepted);
    change(changed);
    assert.ok(cardIssues(changed, accepted.id).length);
  }
  assert.ok(cardIssues(accepted, 'another_id').length);
});

test('the card and runtime use the same technique clock and detect an altered waypoint', async () => {
  const { default: yeti } = await import('../c/frost_yeti');
  assert.deepEqual(cardRuntimeIssues(yeti), []);
  const motion = structuredClone(yeti.motion!);
  motion.beats[0].at[0] += 0.1;
  assert.match(cardRuntimeIssues({ ...yeti, motion }).join(), /life/);
});

test('a move-free secret card requires the secret detail inventory and delayed parts', () => {
  const old = readCreatureCard('rat_king');
  const card = {
    ...old,
    moves: [],
    life: { ...old.life, beats: old.life.beats.filter(beat => !beat.anim.startsWith('tech_')) },
    details: Array.from({ length: 60 }, (_, i) => 'Деталь ' + i),
    secondaryMotion: Object.fromEntries(
      old.parts.slice(0, 7).map(part => [part, 'Отстаёт на два кадра'])),
  };
  assert.deepEqual(cardIssues(card, card.id), []);
  assert.ok(cardIssues({ ...card, details: card.details.slice(1) }, card.id).length);
  assert.ok(cardIssues({ ...card, secondaryMotion: {} }, card.id).length);
});

test('scaffolding publishes five readable files together and preserves an existing or partial draft', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'creature-draft-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const card = { ...readCreatureCard('bramble_warden'), id: 'draft_probe' };
  const keys = join(dir, 'draft_probe-keys.ts');
  writeFileSync(keys, 'original');
  assert.throws(() => writeCreatureDraft(card, dir), /уже существует/);
  assert.deepEqual(readdirSync(dir), ['draft_probe-keys.ts']);
  assert.equal(readFileSync(keys, 'utf8'), 'original');
  rmSync(keys);
  const files = writeCreatureDraft(card, dir);
  assert.equal(files.length, 5);
  assert.deepEqual(readCreatureCard(card.id, dir), card);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'draft_probe.studio.json'), 'utf8')), { minPrimitives: 250 });
  assert.match(readFileSync(keys, 'utf8'), /buildMoveBook/);
  assert.match(readFileSync(join(dir, 'draft_probe.ts'), 'utf8'), /makeBodyCreature/);
  assert.throws(() => writeCreatureDraft(card, dir), /уже существует/);
  assert.throws(() => writeCreatureDraft({ ...card, id: '../escape' }, dir), /id/);
});
