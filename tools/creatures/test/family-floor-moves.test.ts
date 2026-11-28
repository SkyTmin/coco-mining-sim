import assert from 'node:assert/strict';
import test from 'node:test';
import { bodySources, makeBodyCreature } from '../bodies';
import { readCreatureCard, type CardMove } from '../bodies/card-data';
import { compose, frameCount } from '../engine';
import { buildMoveBook, defaultMoveParameters, moveTemplates, weaponFor } from '../moves';
import { loadPainting } from '../render';
import { extension } from '../studio/contact-audit';
import { defaultLife } from '../studio/new';
import { floorRecovery, maskOf } from '../tech-metrics';

for (const family of ['heavy-quadruped', 'hexapod', 'long-flier', 'giant', 'winged-dragon'] as const) {
  test(family + ' can swing to the floor and absorb a landing with its own anatomy', async () => {
    const source = readCreatureCard('bramble_warden');
    const { c: pilot, s, b } = await loadPainting(bodySources[family]);
    const moves: CardMove[] = (['overhead', 'leap'] as const).map(template => ({
      ...source.moves[0], id: 'tech_' + template, template,
      weapon: weaponFor(family, template), reference: moveTemplates[template].reference,
      parameters: { ...defaultMoveParameters },
    }));
    const card = {
      ...source, id: 'floor_' + family, body: family, rarity: pilot.rarity, theme: pilot.theme,
      moves, proportions: { length: 1, width: 1, height: 1 },
    };
    const book = buildMoveBook(moves, family);
    const creature = makeBodyCreature(card, book, defaultLife(pilot.motion!, moves));
    const height = maskOf(compose(creature, s, b, 'idle', 0).layers.body).height;
    for (const move of moves) {
      const spec = book[move.id];
      const [, , strike, hit, follow] = spec.keys.map(key => key.frame);
      const supports = spec.contacts!.filter(contact => contact.frame === hit).map(contact => contact.socket);
      const frames = Array.from({ length: frameCount(spec.seconds!) }, (_, n) => {
        const fr = compose(creature, s, b, move.id, n / 24);
        const joints = fr.body.joints!;
        if (n === hit) {
          for (const socket of supports) assert.ok(Math.abs(joints[socket][2]) <= 1, socket + ' must reach the floor');
          if (spec.reachHand) assert.ok(extension(joints, spec.reachHand)! >= 0.8, 'striking wrist must extend');
        }
        return {
          height: joints[spec.weapon][2],
          centreY: maskOf(fr.layers.body, [-fr.camera[0], -fr.camera[1]]).centre[1],
          supports: supports.map(socket => fr.points[socket]),
        };
      });
      const after = spec.recovery === 'rebound' ? frames.slice(hit, follow + 1) : frames.slice(hit);
      assert.deepEqual(floorRecovery(spec.recovery!, height, frames[strike], after, follow - hit).issues, []);
    }
  });
}
