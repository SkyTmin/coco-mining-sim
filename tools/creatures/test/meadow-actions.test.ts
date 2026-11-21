import assert from 'node:assert/strict';
import test from 'node:test';
import meadow from '../c/meadow_colossus';
import { compose, screenPoint } from '../engine';
import { loadPainting } from '../render';
import { techniqueContacts } from '../technique';
import type { XY } from '../types';

test('the Colossus catches the descending chest on its two front soles', () => {
  const move = 'tech_forefall',
    spec = meadow.techniques![move];
  const contacts = techniqueContacts(spec);
  assert.deepEqual(
    contacts.map((c) => c.socket),
    ['foreR', 'foreL'],
  );
  const hit = contacts[0].frame,
    strike = spec.keys.find((k) => k.role === 'strike')!.frame;
  const follow = spec.keys.find((k) => k.role === 'follow')!.frame;
  const world = (n: number, socket: string): XY => {
    const b = meadow.frame(move, n / 24, 0, 'normal');
    return screenPoint(b, b.points[socket], meadow.animations[move].groundOffset!(n / 24, 0));
  };
  const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const name of ['hindL', 'hindR']) {
    const planted = world(16, name);
    for (let n = 16; n <= follow; n++)
      assert.ok(distance(planted, world(n, name)) < 0.01, name + ' slips at ' + n);
  }
  for (const { socket } of contacts) {
    const at = world(hit, socket);
    const raised = meadow.frame(move, strike / 24, 0, 'normal').joints![socket][2];
    assert.ok(raised > 12);
    assert.ok(Math.abs(meadow.frame(move, hit / 24, 0, 'normal').joints![socket][2]) < 0.02);
    for (let n = hit; n <= follow; n++)
      assert.ok(distance(at, world(n, socket)) < 0.01, socket + ' slips at ' + n);
  }
});

test('the same stone rides the beak, crosses the air once, then rolls home on the shell', () => {
  for (const side of [0, 4, 8, 12]) {
    const at = (n: number) => meadow.frame('trick', n / 24, side, 'normal').joints!;
    for (const n of [12, 16, 22]) {
      const { rock, noseTip } = at(n);
      assert.ok(Math.hypot(rock[0] - noseTip[0], rock[1] - noseTip[1]) < 0.01);
      assert.ok(rock[2] - noseTip[2] > 2.5 && rock[2] - noseTip[2] < 4);
    }
    const release = at(22).rock,
      landing = at(36).rock;
    const arc = [22, 25.5, 29, 32.5, 36].map((n) => at(n).rock);
    for (let i = 0; i < arc.length; i++) {
      for (const axis of [0, 1]) {
        const expected = release[axis] + ((landing[axis] - release[axis]) * i) / 4;
        assert.ok(
          Math.abs(arc[i][axis] - expected) < 0.02,
          'free stone must retain its horizontal velocity',
        );
      }
    }
    assert.ok(arc[2][2] > Math.max(release[2], landing[2]) + 8);
    assert.ok(arc[2][2] - arc[1][2] < arc[1][2] - arc[0][2]);
    const returned = at(59);
    assert.deepEqual(returned.rock, returned.rockRest);
  }
});

test('the Colossus plants three supports while the ground wave is born under its fourth heel', async () => {
  const { c, s, b } = await loadPainting('meadow_colossus');
  const clip = 'tech_heelwave';
  const [contact] = techniqueContacts(c.techniques![clip]);
  assert.deepEqual([contact.socket, contact.frame], ['hindR', 24]);
  const supports = ['foreL', 'foreR', 'hindL'];
  for (const side of [0, 4, 8, 12]) {
    const supported = (n: number) => {
      const body = c.frame(clip, n / 24, side, 'normal');
      const feet = c.animations[clip].groundOffset!(n / 24, side);
      return supports.map((name) => screenPoint(body, body.points[name], feet));
    };
    const expected = supported(16);
    for (let n = 16; n <= 29; n++) {
      const actual = supported(n);
      for (let i = 0; i < supports.length; i++)
        assert.ok(
          Math.hypot(actual[i][0] - expected[i][0], actual[i][1] - expected[i][1]) < 0.01,
          supports[i] + ' slips at ' + n,
        );
    }
  }
  const before = compose(c, s, b, clip, 23 / 24),
    hit = compose(c, s, b, clip, 24 / 24);
  assert.deepEqual(before.techniqueTrace.births, []);
  assert.ok(before.body.joints!.hindR[2] > 3);
  assert.ok(Math.abs(hit.body.joints!.hindR[2]) < 0.02);
  const births = hit.techniqueTrace.births;
  assert.deepEqual(
    births.map((event) => event.socket),
    ['hindR'],
  );
  assert.deepEqual(births[0].at, hit.points.hindR);
  assert.ok(
    births[0].pixels.some(
      ([x, y]) => Math.hypot(x - hit.points.hindR[0], y - hit.points.hindR[1]) < 1.5,
    ),
  );
});
