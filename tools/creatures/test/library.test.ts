import assert from 'node:assert/strict';
import test from 'node:test';
import { bodySources, makeBodyCreature } from '../bodies';
import { readCreatureCard, type BodyType, type CardMove } from '../bodies/card-data';
import { aim, goalAt, toLocal } from '../bodies/goals';
import { compose } from '../engine';
import { buildMoveBook, defaultMoveParameters, moveTemplates, type MoveId } from '../moves';
import { loadPainting } from '../render';
import { vlen, vsub, type V3 } from '../rig/f15-rig';
import { captureRig } from '../studio/capture';
import { baselineOf, worstClip } from '../studio/clip';
import { defaultLife } from '../studio/new';
import type { MotionPlan } from '../types';

const examples = {
  'heavy-quadruped': ['ram', ['torso', 'head', 'foreL', 'foreR', 'hindL', 'hindR', 'horns']],
  hexapod: ['ram', ['thorax', 'head', 'abdomen', 'horn', 'elytra', 'legs']],
  'long-flier': ['sweep', ['head', 'neck', 'body', 'tail', 'fins']],
  'armed-biped': ['overhead', ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'club']],
  'squat-mage': ['overhead', ['body', 'head', 'cloak', 'armL', 'armR', 'staff', 'legL', 'legR']],
  giant: ['breath', ['chest', 'head', 'hips', 'armL', 'armR', 'legL', 'legR']],
  'winged-dragon': ['sweep', ['body', 'neck', 'head', 'wingL', 'wingR', 'tail', 'claws']],
} satisfies Partial<Record<BodyType, [MoveId, string[]]>>;

const clipFrames: Partial<Record<BodyType, number[]>> = {
  'squat-mage': [7, 10, 18, 26, 28],
  giant: [22, 35, 36, 37],
  'armed-biped': [23],
};

for (const family of Object.keys(examples) as (keyof typeof examples)[]) {
  test(family + ' moves its painted geometry when the contact target changes', async () => {
    const [template, parts] = examples[family];
    const base = readCreatureCard('bramble_warden');
    const move: CardMove = {
      ...base.moves[0],
      id: 'tech_' + template,
      template,
      weapon: moveTemplates[template].weapon,
      reference: moveTemplates[template].reference,
      parameters: { ...defaultMoveParameters },
    };
    const pilotId = bodySources[family];
    const { c: pilot, s, b } = await loadPainting(pilotId);
    const original: MotionPlan = (await import('../c/' + pilotId + '-life.ts')).default;
    const card = {
      ...base,
      id: 'test_' + family.replaceAll('-', '_'),
      body: family,
      parts,
      rarity: pilot.rarity,
      theme: pilot.theme,
      proportions: { width: 1, length: 1, height: 1 },
      moves: [move],
      life: defaultLife(original, [move]),
    };
    const book = buildMoveBook(card.moves, family);
    let physical: V3 | undefined;
    const actor = makeBodyCreature(card, book, card.life, {
      draw(_rig, { basis, points }) {
        physical = toLocal(basis, points[move.weapon]);
      },
    });
    const frames = clipFrames[family];
    if (frames) {
      const rigAt = (anim: string, n: number) =>
        captureRig(() => compose(actor, s, b, anim, n / 24)).rig!;
      const rest = [baselineOf(rigAt('idle', 0)), baselineOf(rigAt(move.id, 0))];
      for (const n of frames) {
        assert.equal(worstClip(rigAt(move.id, n), rest), null, family + ' intersects at frame ' + n);
      }
    }
    const idle = actor.frame('idle', 0, 0, 'normal');
    for (const name of ['handL', 'handR', 'footL', 'footR', 'mouth', 'weaponTip']) {
      assert.ok(idle.points[name]?.every(Number.isFinite), family + ' lacks ' + name);
    }
    for (const side of ['L', 'R']) {
      assert.ok(idle.joints?.['shoulder' + side]?.every(Number.isFinite), family + ' shoulder' + side);
      if (family !== 'long-flier')
        assert.ok(idle.joints?.['elbow' + side]?.every(Number.isFinite), family + ' elbow' + side);
    }
    const hit = book[move.id].keys.find(k => k.role === 'hit')!;
    const target = goalAt(hit.pose, move.weapon)!;
    assert.ok(target);
    function renderContact(forward: number) {
      Object.assign(hit.pose, aim(move.weapon, [forward, target[1], target[2]], hit.frame));
      const f = actor.frame(move.id, hit.frame / 24, 0, 'normal');
      if (family !== 'armed-biped' && family !== 'heavy-quadruped') {
        assert.ok(physical && vlen(vsub(physical, [forward, target[1], target[2]])) < 0.01);
      }
      const [x, y] = f.points[move.weapon];
      let painted = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (f.px.solid(Math.round(x) + dx, Math.round(y) + dy)) painted = true;
        }
      }
      assert.ok(painted, family + ': the action socket left its painted geometry');
      return { x: x - f.anchor[0], y: y - f.anchor[1], pixels: Buffer.from(f.px.data) };
    }
    const at = renderContact(target[0]);
    const moved = renderContact(target[0] + 2);
    assert.ok(Math.hypot(at.x - moved.x, at.y - moved.y) > 0.5, family + ': target was ignored');
    assert.ok(!at.pixels.equals(moved.pixels), family + ': the socket moved without its geometry');
  });
}
