import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { goalAt, toLocal } from '../bodies/goals';
import { heavySkeleton } from '../bodies/heavy-quadruped';
import { F3, vdot, vnorm, vsub, type V3 } from '../rig/f15-rig';
import { makeBodyCreature } from '../bodies';
import { defaultLife } from '../studio/new';
import { readCreatureCard } from '../bodies/card-data';
import type { CardMove } from '../bodies/card-data';
import { Pen } from '../fx/pen';
import { buildEffects, effectPresets, type MoveImpact } from '../fx/presets';
import { buildMove, buildMoveBook, defaultMoveParameters, moveTemplates, weaponFor, type MoveId } from '../moves';
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

test('all library actions use the six timings and benchmark of their real pilot', async () => {
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
  assert.equal(poses.size, Object.keys(moveTemplates).length);
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

test('an overhead lift passes in front of the face before the backswing and recoils clear of the floor', () => {
  const spec = buildMove(move('overhead'), 'armed-biped');
  const tip = (frame: number) => goalAt(techniquePoseAt(spec, frame / 24), 'weaponTip')!;
  assert.equal(spec.recovery, 'rebound');
  assert.ok(tip(8)[0] > tip(14)[0] + 20, 'the tool must travel back after the initial lift');
  assert.ok(tip(14)[2] > 90);
  assert.equal(tip(19)[2], 0);
  assert.ok(tip(23)[2] > 30);
});

test('the jumping mage kicks both hind feet back and receives its weight on the leading palm', () => {
  const jump = move('leap');
  jump.weapon = weaponFor('squat-mage', 'leap');
  const spec = buildMove(jump, 'squat-mage');
  const point = (frame: number, socket: string) => goalAt(techniquePoseAt(spec, frame / 24), socket)!;
  assert.equal(spec.recovery, 'absorb');
  assert.equal(techniqueContacts(spec)[0].socket, 'handL');
  for (const foot of ['footL', 'footR']) {
    assert.ok(point(24, foot)[0] < point(24, 'handL')[0] - 60);
    assert.ok(point(27, foot)[2] > point(27, 'handL')[2], 'hind feet land after the leading palm');
  }
  assert.deepEqual(point(27, 'handL'), point(33, 'handL'));
  assert.ok(spec.keys[4].pose.crouch > spec.keys[3].pose.crouch);
});

test('the carried staff keeps its direction while the jumping mage extends and lands', async () => {
  const jump = { ...move('leap'), weapon: weaponFor('squat-mage', 'leap') };
  const moves = [move('overhead'), jump];
  const source = (await import('../c/toad_shaman-life')).default;
  const card = { ...readCreatureCard('bramble_warden'), body: 'squat-mage' as const, moves,
    life: defaultLife(source, moves), proportions: { width: 1, length: 1, height: 1 } };
  const book = buildMoveBook(moves, 'squat-mage');
  const actor = makeBodyCreature(card, book);
  const spec = book[jump.id];
  let previous: V3 | undefined;
  for (let n = spec.keys[1].frame; n <= spec.keys[4].frame; n++) {
    const { joints } = actor.frame(jump.id, n / 24, 0, 'normal');
    const shaft = vnorm(vsub(joints!.staffTip, joints!.handR));
    if (previous) assert.ok(vdot(shaft, previous) > Math.cos(Math.PI / 18), 'staff flipped on frame ' + n);
    previous = shaft;
  }
});
