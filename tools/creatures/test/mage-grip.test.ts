import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBodyCreature } from '../bodies';
import { readCreatureCard, type CardMove } from '../bodies/card-data';
import { bodyFrame as frogFrame } from '../c/toad_shaman';
import route from '../c/toad_shaman-life';
import { buildMoveBook, defaultMoveParameters, moveTemplates } from '../moves';
import { loadPainting } from '../render';
import { withFigureSetup } from '../rig/figure';
import { vlen, vsub, type V3 } from '../rig/f15-rig';
import { sampleAnimation } from '../studio/checks';
import { defaultLife } from '../studio/new';

const distance = (a: V3, b: V3) => vlen(vsub(a, b));
function staffLengths(points: Record<string, V3>) {
  return [
    distance(points.staffHand, points.staffFoot),
    distance(points.staffHand, points.staffTip),
    distance(points.staffTip, points.staffFoot),
  ];
}

test('the summoning hand carries a rigid staff past the cloak and folded legs on all frames', async () => {
  const { c: pilot, s, b } = await loadPainting('toad_shaman');
  const move: CardMove = {
    id: 'tech_summon',
    template: 'summon',
    weapon: 'handR',
    title: 'Призыв',
    reference: moveTemplates.summon.reference,
    parameters: defaultMoveParameters,
    logic: [],
  };
  const card = {
    ...readCreatureCard('frost_yeti'),
    body: 'squat-mage' as const,
    rarity: pilot.rarity,
    theme: pilot.theme,
    proportions: { height: 1, width: 1, length: 1 },
    moves: [move],
    life: defaultLife(route, [move]),
  };
  const book = buildMoveBook(card.moves, card.body);
  let dimensions: number[] = [];
  const actor = makeBodyCreature(card, book, card.life, {
    draw(r, { points }) {
      const arm = r.prims.filter((q) => q.t === 'armR' && q.k === 1),
        forearm = arm[1];
      assert.ok(forearm && forearm.k === 1);
      assert.ok(distance(forearm.b, points.staffHand) < 1e-6);
      assert.ok(distance(forearm.b, points.handR) < 1e-6);
      dimensions = staffLengths(points);
    },
  });
  for (const n of [3, 7, 15, 17, 19, 24, 35]) {
    let native: number[] = [];
    withFigureSetup(
      (_r, p) => {
        native = staffLengths(p);
      },
      () => frogFrame('gesture', n / 24, 0, 'normal'),
    );
    actor.frame(move.id, n / 24, 0, 'normal');
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(dimensions[i] - native[i]) < 1e-6);
  }
  const clips = sampleAnimation({ c: actor, s, b }, move.id, {}).flatMap((frame) =>
    frame.clip ? [frame.n] : [],
  );
  assert.deepEqual(clips, []);
});
