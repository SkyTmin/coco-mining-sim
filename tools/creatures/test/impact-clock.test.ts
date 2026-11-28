import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, frameCount } from '../engine';
import { displayFrame, impactClock, timedAnimation, withImpactTiming } from '../kit/impact-clock';
import { Px } from '../rig/px';
import { sixPoses, withTechniques } from '../technique';
import type { Border, Creature, Scene } from '../types';

const scene: Scene = (p,t) => p.rect(0, 0, p.w - 1, p.h - 1, [41 + Math.round(t*24), 62, 70, 255]);
const rail: Border = {wood: ['#151515','#222222','#292929','#565656'], accent: '#987656',
  decorate: (p,b,t) => p.set(b, 2, [55 + Math.round(t * 24), 80, 44, 255])};
const contacts = [{ frame: 5, freeze: 2, shake: 5, amp: 2 }, { frame: 15, freeze: 3 }];
const raw: Creature = { id: 'test_clock', rarity: 'common', theme: 'test', animations: { idle: {seconds: 1}, trick: {
  seconds: 1, contacts, groundOffset: t => [t * 6, 0] } },
  frame(anim, t) {
    const px = new Px(12, 12), n = Math.round(t * 24) % 10;
    px.set(n, 0, [111, 82, 92, 255]);
    return { px, points: { hand: [n, 0] }, eye: null, anchor: [0,0], primitives: 1 };
  },
  props(f) { f.backdrop.col('#b3545f'); f.backdrop.dot(15 + Math.round(f.t * 24), 30); },
  effects(f) { f.above.col('#ff8844'); f.above.dot(...f.points.hand); f.light.col('#662244'); f.light.dot(40, 20 + Math.floor(f.t * 24)); },
};
test('multiple weighted contacts extend the clip, preserve recovery, and fire only once each', () => {
  const c = withImpactTiming(raw), spec = c.animations.trick;
  assert.equal(frameCount(spec.seconds), 29);
  assert.deepEqual(spec.hits?.map(t => Math.round(t*24)), [5,17]);
  assert.deepEqual(spec.authoredHits?.map(t => Math.round(t*24)), [5,15]);
  for (let i=0;i<24;i++) assert.ok(Math.abs(impactClock(displayFrame(i, contacts)/24, contacts).time * 24 - i) < 1e-8);
  const frame = (n: number) => compose(c, scene, rail, 'trick', n / 24);
  for (const [hit, extras] of [[5,2],[17,3]]) {
    const source = frame(hit);
    assert.equal(source.contact.length, 1);
    for (let n=1;n<=extras;n++) {
      const held = frame(hit+n);
      assert.equal(held.contact.length, 0);
      assert.deepEqual(held.picture.data, source.picture.data);
      assert.deepEqual(held.points, source.points);
    }
  }
  assert.equal(frame(8).camera[0], 2);
  assert.deepEqual(frame(13).camera, [0,0]);
  assert.equal(frame(28).motion.t, 23/24);
});
test('two simultaneous sockets share one hold; invalid freeze and unregistered frames fail', () => {
  assert.equal(frameCount(timedAnimation({ seconds:1, contacts:[contacts[0],contacts[0]] }).seconds),26);
  for (const contact of [{frame:0, freeze:6},{frame:4, freeze:1.5},{frame:24},{frame:2, amp:-1}])
    assert.throws(() => timedAnimation({seconds:1,contacts:[contact]}));
  const book = { title:'probe', reference:'probe', weapon:'hand', contactKind:'body' as const, seconds:1,
    keys:sixPoses([[0,{}],[2,{}],[4,{}],[5,{}],[10,{}],[23,{}]]), contacts:[{...contacts[0],socket:'hand',kind:'body' as const}] };
  assert.equal(withImpactTiming(withTechniques(raw, {trick:book})).animations.trick.seconds,26/24);
});
