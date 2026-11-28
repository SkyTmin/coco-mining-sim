// ws events [research 23.11, stage 3]: the adapter reads both authoring schemes, the prop timeline catches a duplicate,
// a gap, a teleport between held states and a handoff jump; on real paintings it repeats the facts the stage relies on.
import assert from 'node:assert/strict';
import test from 'node:test';
import { clipReport, propTimeline, readEvents } from '../studio/events';
import type { Creature } from '../types';

const hat = {
  states: [['off', 'hatOff>=0.5'], ['inHand', 'hatInHand>=1'], ['passing', 'hatInHand>0'], ['onHead', 'always']] as [string, string][],
  rest: 'onHead',
  between: { 'onHead>inHand': 'passing', 'inHand>onHead': 'passing' },
  off: 'off',
  socket: 'brim',
  handoffPx: 12,
};
const kinds = (r: { issues: { kind: string }[] }) => r.issues.map((i) => i.kind);

test('a prop drawn by the effects while still on the body is a duplicate; off and undrawn is a gap', () => {
  const track = [{}, {}, { hatOff: 1 }, { hatOff: 1 }, { hatOff: 1 }, {}];
  const points = new Map([0, 1, 2, 3, 4, 5].map((n) => [n, { brim: [10, 10] as [number, number] }]));
  const dup = propTimeline(hat, track, false, { marks: new Map([[1, [10, 10]], [2, [10, 10]], [3, [10, 10]], [4, [10, 10]]]), points });
  assert.ok(kinds(dup).includes('prop_duplicate'));
  const gap = propTimeline(hat, track, false, { marks: new Map([[2, [10, 10]]]), points });
  assert.ok(kinds(gap).includes('prop_gap'));
  assert.match(gap.issues.find((i) => i.kind === 'prop_gap')!.note, /3–4/);
  const clean = propTimeline(hat, track, false, { marks: new Map([[2, [10, 10]], [3, [10, 10]], [4, [11, 10]]]), points });
  assert.deepEqual(kinds(clean), ['prop_handoff']);
});

test('a handoff far from the body socket is a jump; head to hand in one frame is a teleport', () => {
  const track = [{}, { hatOff: 1 }, {}];
  const points = new Map([0, 1, 2].map((n) => [n, { brim: [10, 10] as [number, number] }]));
  const far = propTimeline(hat, track, false, { marks: new Map([[1, [40, 10]]]), points });
  assert.ok(kinds(far).includes('prop_handoff_jump'));
  assert.ok(kinds(propTimeline(hat, [{}, { hatInHand: 1 }, { hatInHand: 1 }, {}], false)).includes('prop_jump'));
  assert.ok(!kinds(propTimeline(hat, [{}, { hatInHand: 0.5 }, { hatInHand: 1 }, { hatInHand: 0.5 }, {}], false)).includes('prop_jump'));
  assert.ok(kinds(propTimeline(hat, [{}, { hatInHand: 0.5 }, { hatInHand: 1 }], false)).includes('prop_not_returned'));
});

test('events come from beats, technique keys and contacts, hits and 0/1 switches in one sorted list', () => {
  const c = {
    animations: { a: { seconds: 1, hits: [0.5] } },
    techniques: {
      a: { title: '', reference: '', weapon: '', contactKind: 'air', keys: [{ role: 'rest', frame: 0, pose: {} }, { role: 'hit', frame: 12, pose: {} }], contacts: [{ frame: 12, socket: 'tip', kind: 'air' }] },
    },
  } as unknown as Creature;
  const events = readEvents(c, { toss: 4, taps: [6, 8] }, 'a', [{}, {}, {}, { gone: 1 }, { gone: 1 }, {}]);
  assert.deepEqual(
    events.map((e) => `${e.frame}:${e.name}`),
    ['0:rest', '3:gone 0→1', '4:toss', '5:gone 1→0', '6:taps[0]', '8:taps[1]', '12:contact air', '12:hit', '12:hit'],
  );
  assert.equal(events.find((e) => e.from === 'contact')!.socket, 'tip');
});

test('Murlen: the hat leaves the body and comes back without a duplicate, a gap or a jump', async () => {
  const r = await clipReport('moon_magician', 'trick_b-f2');
  assert.deepEqual(r.props.hat.map(([s]) => s), ['onHead', 'off', 'onHead']);
  assert.deepEqual(r.issues.filter((i) => i.level !== 'info'), []);
});

test('the squid trick reads the catch pose of frame 88 from frames 29–87, Astral has its light sockets at toss and catch', async () => {
  const squid = await clipReport('nebula_squid', 'trick', true);
  // the latest pose each frame asks: frames 29–87 look ahead to the catch, frame 28 does not
  const latest = (n: number) => squid.reads!.reach[n]?.[1];
  assert.ok(latest(28) === undefined || latest(28)! < 88);
  for (let n = 29; n <= 87; n++) assert.equal(latest(n), 88, `frame ${n}`);
  const astral = await clipReport('astral_seer', 'fidget_a');
  assert.deepEqual(astral.issues.filter((i) => i.level === 'error'), []);
  // a socket the pose does not have at the event is an error; a declared absence is only a note
  const broken = await clipReport('astral_seer', 'fidget_a', false, { requiredSockets: { fidget_a: { catch: ['rock'] } } });
  assert.deepEqual(kinds(broken).filter((k) => k !== 'expected_absence'), ['missing_required_socket']);
  const excused = await clipReport('astral_seer', 'fidget_a', false, {
    requiredSockets: { fidget_a: { catch: ['rock'] } },
    expectedAbsence: { fidget_a: { catch: { sockets: ['rock'], reason: 'the rock belongs to the trick, not to this fidget' } } },
  });
  assert.deepEqual(kinds(excused), ['expected_absence']);
});
