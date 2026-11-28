import assert from 'node:assert/strict';
import test from 'node:test';
import { compose } from '../engine';
import { stepPose } from '../kit/impact-clock';
import { Px } from '../rig/px';
import type { Creature, Scene, Border } from '../types';

const scene: Scene = p => p.rect(0, 0, p.w - 1, p.h - 1, [10, 20, 30, 255]);
const border: Border = { wood:['#121212','#222222','#343434','#626262'],accent:'#343434' };
const c: Creature = {id:'step_probe',theme:'test',rarity:'common',animations:{idle:{seconds:1,loop:true,poseStep:2}},
  frame(anim,t,side,variant,motion) {
    const px=new Px(12,5), a=Math.round(t*24)%12, b=Math.round((motion?.secondaryTime ?? t)*24)%12;
    px.set(a,0,[221,91,47,255]);
    px.set(b,2,[58,148,221,255]);
    return {px,points:{hand:[a,0],spring:[b,2]},anchor:[0,0],eye:null,primitives:2};
  },
  effects(f) {
    f.light.col('#557788');
    f.light.dot(12 + Math.round(f.t*24), 10);
    assert.deepEqual(f.pointAt(f.t,'hand'), f.points.hand);
  } };
test('paired primary poses keep separate spring, light and historic socket clocks', () => {
  const frames = [0,1,2,3].map(i => compose(c,scene,border,'idle',i/24));
  assert.deepEqual(frames[0].points.hand,frames[1].points.hand);
  assert.notDeepEqual(frames[1].points.hand,frames[2].points.hand);
  assert.notDeepEqual(frames[0].points.spring,frames[1].points.spring);
  assert.notDeepEqual(frames[0].layers.light.data,frames[1].layers.light.data);
  assert.deepEqual(frames[2].points.hand,frames[3].points.hand);
  for(const i of [0,1,2,3]) assert.equal(stepPose(i/24,{seconds:1}),i/24);
  assert.equal(stepPose(5/24,{seconds:1,poseStep:2,hits:[5/24]}),5/24);
  assert.equal(stepPose(6/24,{seconds:1,poseStep:2,hits:[5/24]}),5/24);
  assert.equal(stepPose(23/24,{seconds:1,poseStep:2}),23/24);
});
