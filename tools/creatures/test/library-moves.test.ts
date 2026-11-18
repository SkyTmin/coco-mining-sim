import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { goalAt, toLocal } from '../bodies/goals';
import { heavySkeleton } from '../bodies/heavy-quadruped';
import { F3 } from '../rig/f15-rig';
import { readCreatureCard } from '../bodies/card-data';
import type { CardMove } from '../bodies/card-data';
import { Pen } from '../fx/pen';
import { buildEffects, effectPresets, type MoveImpact } from '../fx/presets';
import { buildMove, buildMoveBook, defaultMoveParameters, moveTemplates, type MoveId } from '../moves';
import { techniqueContacts, techniquePoseAt, type TechniqueBook } from '../technique';
import { emptyTechniqueTrace } from '../technique-fx';
import type { FxInput, XY } from '../types';

function move(id: MoveId): CardMove {
  const template = moveTemplates[id];
  return {
    id: 'tech_' + id,
    template: id,
    title: id,
    weapon: template.weapon,
    reference: template.reference,
    parameters: { ...defaultMoveParameters },
    logic: [],
  };
}

function brush(w: number, h: number) {
  return new Pen(createCanvas(w, h).getContext('2d'), 0, 0, 0, 0);
}

function field(t: number, move: CardMove, book: TechniqueBook): FxInput {
  return {
    t,
    anim: move.id,
    duration: book[move.id].seconds!,
    variant: 'normal',
    w: 160,
    h: 128,
    under: brush(160, 128),
    above: brush(160, 128),
    feet: [50, 85 + t * 12],
    points: {},
    hits: [],
    techniqueTrace: emptyTechniqueTrace(),
    pointAt(time, socket): XY {
      return [28 + 26 * time, socket.endsWith('Ground') ? 87 + 2 * time : 53 - 11 * Math.cos(3 * time)];
    },
  };
}

test('all ten library actions use the six timings and benchmark of their real pilot', async () => {
  const poses = new Set<string>();
  for (const id of Object.keys(moveTemplates) as MoveId[]) {
    const template = moveTemplates[id],
      action = move(id);
    const [source, name] = template.source;
    const book = (await import('../c/' + source + '-keys.ts')).default as TechniqueBook;
    const spec = buildMove(action, 'heavy-quadruped');
    assert.equal(spec.reference, book[name].reference, id);
    assert.deepEqual(
      spec.keys.map((k) => [k.role, k.frame]),
      book[name].keys.map((k) => [k.role, k.frame]),
      id,
    );
    assert.ok(
      techniqueContacts(spec).some((c) => c.socket === action.weapon && c.frame === spec.keys[3].frame),
    );
    assert.ok(goalAt(spec.keys[3].pose, action.weapon), id);
    poses.add(JSON.stringify(spec.keys.slice(1, -1).map((k) => k.pose)));
  }
  assert.equal(poses.size, 10);
});

test('card parameters change goals, recoil, actual playback of repeated strikes, and the working socket', () => {
  const action = move('ram');
  const spec = buildMove(action, 'heavy-quadruped'),
    contact = spec.keys[3];
  const base = goalAt(contact.pose, action.weapon)!;
  const variant = (diff: Partial<CardMove['parameters']>) =>
    buildMove({ ...action, parameters: { ...action.parameters, ...diff } }, 'heavy-quadruped');
  assert.equal(goalAt(variant({ side: -1 }).keys[3].pose, action.weapon)![1], -base[1]);
  assert.ok(goalAt(variant({ amplitude: 1.2 }).keys[3].pose, action.weapon)![0] > base[0]);
  assert.ok(variant({ strength: 1.2 }).keys[4].pose.dx > spec.keys[4].pose.dx);
  const other = buildMove({ ...action, weapon: 'mouth' }, 'heavy-quadruped');
  assert.ok(other.keys[3].pose['goal.mouth.weight']);
  assert.equal(goalAt(other.keys[3].pose, 'weaponTip'), undefined);
  assert.equal(techniqueContacts(other)[0].socket, 'mouth');
  const repeated = variant({ repeats: 3 });
  const hits = techniqueContacts(repeated);
  assert.equal(hits.length, 3);
  for (const h of hits) {
    const hitPose = techniquePoseAt(repeated, h.frame / 24);
    assert.deepEqual(goalAt(hitPose, action.weapon), base);
    assert.notDeepEqual(goalAt(techniquePoseAt(repeated, (h.frame - 3) / 24), action.weapon), base);
    assert.ok(techniquePoseAt(repeated, (h.frame + 3) / 24).dx > hitPose.dx);
  }
  assert.deepEqual(techniquePoseAt(repeated, repeated.keys.at(-1)!.frame / 24), {});
  const authored = buildMoveBook([action], 'heavy-quadruped', {
    tech_ram: {
      targets: [
        [19, -7, 31],
        [24, -6, 27],
        [34, 2, 15],
        [36, 2, 14],
      ],
    },
  });
  assert.deepEqual(goalAt(authored.tech_ram.keys[3].pose, 'weaponTip'), [34, 2, 15]);
});

test('the seven pilot materials have distinct fragment and impact silhouettes even without colour', async () => {
  const fragmentMasks = new Set<string>(),
    markMasks = new Set<string>();
  for (const material of Object.values(effectPresets)) {
    const [source, id] = material.source.split('/');
    const book = (await import('../c/' + source + '-keys.ts')).default as TechniqueBook;
    assert.ok(book[id], material.source);
    const actionSource = await readFile(new URL('../c/' + source + '-actions.ts', import.meta.url), 'utf8');
    assert.ok(actionSource.includes(material.edge) && actionSource.includes(material.light), material.source);
    for (const [paint, shapes] of [
      [material.fragment, fragmentMasks],
      [material.mark, markMasks],
    ] as const) {
      const pen = brush(40, 40);
      paint(pen, [20, 20], 9, 0.53, 1);
      const rgba = pen.g.getImageData(0, 0, 40, 40).data;
      const mask = Array.from({ length: 40 * 40 }, (_, i) => (rgba[i * 4 + 3] > 0 ? '1' : '0')).join('');
      assert.match(mask, /1/, material.source);
      shapes.add(mask);
    }
  }
  assert.equal(fragmentMasks.size, 7);
  assert.equal(markMasks.size, 7);
});

test('a volley paints births on the historical socket and on five fixed ballistic landings', () => {
  const action = move('volley');
  const book = buildMoveBook([action], 'heavy-quadruped'),
    spec = book[action.id];
  const events: MoveImpact[] = [];
  const fx = buildEffects({ moves: [action], effects: 'ice' }, book, {
    impact(f, event) {
      events.push(event);
      f.above.lineS(event.origin[0], event.origin[1], event.origin[0] + 2, event.origin[1] - 4, '#ffffff', 1);
    },
  });
  const contacts = techniqueContacts(spec),
    launch = contacts[0].frame / 24;
  const start = field(launch, action, book);
  fx.effects!(start);
  const trace = start.techniqueTrace!;
  assert.equal(trace.projectiles.length, 5);
  for (const missile of trace.projectiles) {
    assert.deepEqual(missile.at, start.pointAt(launch, action.weapon));
    assert.deepEqual(missile.origin, missile.at);
  }
  assert.ok(trace.births[0].pixels.length);
  assert.deepEqual(trace.births[0].at, start.pointAt(launch, action.weapon));
  assert.ok(trace.trails[0].pixels.length);
  assert.deepEqual(trace.trails[0].path.at(-1), start.pointAt(launch, action.weapon));
  for (const missile of trace.projectiles) {
    const mid = field((missile.release + missile.hit) / 2, action, book);
    fx.effects!(mid);
    const arc = mid.techniqueTrace!.projectiles.find((p) => p.id === missile.id)!;
    assert.deepEqual(arc.landing, missile.landing);
    assert.ok(arc.at[1] < (missile.origin[1] + missile.landing[1]) / 2 - 3);
    const landing = field(missile.hit, action, book);
    fx.effects!(landing);
    const mark = landing.techniqueTrace!.births.find((b) => b.socket === missile.id)!;
    assert.deepEqual(mark.at, missile.landing);
    assert.ok(mark.pixels.some(([x, y]) => Math.hypot(x - mark.at[0], y - mark.at[1]) <= 1));
    assert.ok(events.some((e) => e.landing && e.socket === missile.id && Math.abs(e.age) < 1e-8));
  }
});

test('generated ram and volley goals reach their physical horn in four actual rig rotations', () => {
  const card = readCreatureCard('bramble_warden');
  for (const id of ['ram', 'volley'] as const) {
    const action = move(id),
      book = buildMove(action, card.body);
    for (const key of book.keys.slice(1, -1)) {
      const target = goalAt(key.pose, action.weapon)!;
      for (const side of [0, 4, 8, 12]) {
        const rig = heavySkeleton(action.id, key.frame / 24, side, key.pose, 0, card.life);
        const facing = F3.yaw(card.life.yaw + (side * Math.PI) / 8);
        const actual = toLocal(facing, rig.points[action.weapon]);
        assert.ok(
          Math.hypot(...actual.map((value, i) => value - target[i])) < 1e-8,
          id + '/' + key.role + '/' + side,
        );
      }
    }
  }
});
