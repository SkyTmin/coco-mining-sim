import assert from 'node:assert/strict';
import test from 'node:test';
import { compose, ground } from '../engine';
import {
  directions,
  directionVector,
  placement,
  strideFoot,
  attachMotion,
  reelChapters,
} from '../motion';
import { Px } from '../rig/px';
import { loadPainting } from '../render';
import {
  sizeOf,
  type Creature,
  type MotionPlan,
  type Scene,
  type Border,
  type XY,
} from '../types';

const ids = [
  'bramble_warden',
  'gem_beetle',
  'silk_dragon',
  'frost_yeti',
  'toad_shaman',
  'crater_titan',
  'coin_dragon',
];
const scene: Scene = Object.assign(
  (p: Px) => p.rect(0, 0, p.w - 1, p.h - 1, [54, 37, 29, 255]),
  {
    front: [
      {
        id: 'stone',
        depth: 95,
        paint: (p: Px) => p.rect(30, 65, 134, 102, [66, 69, 73, 255]),
      },
    ],
  },
);
const border: Border = {
  wood: ['#292322', '#4d382e', '#7e6455', '#a48a77'],
  accent: '#999999',
};
const plan: MotionPlan = {
  stride: 24,
  yaw: 0,
  beats: [
    { at: [0.3, 0.67], seconds: 1.5, anim: 'idle' },
    { at: [0.3, 0.67], seconds: 3, anim: 'walk' },
    { at: [0.7, 0.84], seconds: 1.5, anim: 'tech_swing' },
    { at: [0.7, 0.84], seconds: 3, anim: 'walk' },
    { at: [0.3, 0.67], seconds: 3, anim: 'idle' },
  ],
};
const sample: Creature = attachMotion(
  {
    id: 'probe',
    rarity: 'common',
    theme: 'probe',
    animations: {
      idle: { seconds: 3, loop: true },
      walk: { seconds: 1, loop: true },
      tech_swing: { seconds: 1.5, hits: [0.5], shake: 0.6 },
    },
    frame(anim, t, side) {
      const px = new Px(20, 24);
      px.rect(3, 4, 16, 19, [180, 118, 75, 255]);
      const g = strideFoot(t, 0, 24),
        yaw = (side * Math.PI) / 8;
      const foot: XY = [
        10 + g.forward * Math.cos(yaw),
        20 + g.forward * Math.sin(yaw) * 0.6,
      ];
      return {
        px,
        eye: null,
        anchor: [10, 20],
        points: { foot },
        primitives: 1,
        planted: anim === 'walk' && g.planted ? ['foot'] : [],
      };
    },
  },
  plan,
);

test('life motion uses world distance for gait and independently sorts foreground and camera', () => {
  const behind = compose(sample, scene, border, 'life', 0),
    front = compose(sample, scene, border, 'life', 4.5);
  assert.ok(behind.layers.bgf.data.some(Boolean));
  assert.ok(!behind.layers.bgfBack.data.some(Boolean));
  assert.ok(front.layers.bgfBack.data.some(Boolean));
  assert.ok(!front.layers.bgf.data.some(Boolean));
  const hit = compose(sample, scene, border, 'life', 5);
  assert.deepEqual(hit.worldFeet, front.worldFeet);
  assert.ok(hit.camera.some(Boolean));
  assert.ok(
    Math.abs(hit.feet[0] - hit.camera[0] - 8 - hit.worldFeet[0]) < 1e-8,
  );
  const seam = compose(sample, scene, border, 'life', 12);
  assert.deepEqual(seam.picture.data, behind.picture.data);
});

for (const id of ids) {
  test(
    id +
      ' moves through depth and its support feet remain planted in eight directions',
    async () => {
      const { c, s, b } = await loadPainting(id);
      assert.ok(c.motion, id + ' missing life route');
      const spec = c.animations.life;
      assert.ok(spec.seconds >= 12 && spec.seconds <= 20);
      const [w, h] = sizeOf(c),
        origin = ground(w, h);
      const route: Array<XY> = [];
      const skills = new Set<string>();
      for (let i = 0; i < spec.seconds * 24; i++) {
        const f = placement(c, 'life', i / 24, 0, origin);
        route.push(f.feet);
        assert.ok(
          f.feet[0] >= 0 &&
            f.feet[0] < w &&
            f.feet[1] >= h * 0.26 &&
            f.feet[1] < h,
          id + ' left its floor',
        );
        if (f.anim.startsWith('tech_')) skills.add(f.anim);
      }
      const minimum = ['legendary', 'mythic', 'secret'].includes(c.rarity)
        ? 3
        : ['rare', 'epic'].includes(c.rarity)
          ? 2
          : 1;
      assert.ok(
        skills.size >= minimum && skills.size <= minimum + 1,
        id + ' life techniques ' + [...skills].join(','),
      );
      const chapters = reelChapters(c);
      assert.deepEqual(
        chapters.map((x) => x.name),
        Object.keys(c.animations).filter((x) => x.startsWith('tech_')),
      );
      for (const chapter of chapters) {
        const hits = c.animations[chapter.name].hits!;
        for (const time of hits) {
          const tick = Math.round(time * 24);
          const direct = compose(c, s, b, chapter.name, tick / 24);
          const inReel = compose(
            c,
            s,
            b,
            'showreel',
            (chapter.start + tick) / 24,
          );
          assert.equal(inReel.motion.anim, chapter.name);
          assert.deepEqual(inReel.contact, direct.contact);
          assert.deepEqual(inReel.layers.body.data, direct.layers.body.data);
          assert.deepEqual(inReel.layers.fxo.data, direct.layers.fxo.data);
        }
        assert.equal(
          placement(c, 'showreel', (chapter.end - 1) / 24, 0, origin).anim,
          'idle',
        );
      }
      const reelEnd = c.animations.showreel.seconds;
      assert.deepEqual(
        compose(c, s, b, 'showreel', reelEnd).picture.data,
        compose(c, s, b, 'showreel', 0).picture.data,
      );
      const xs = route.map((p) => p[0]),
        ys = route.map((p) => p[1]);
      assert.ok(
        Math.max(...xs) - Math.min(...xs) >= w * 0.18,
        id + ' horizontal travel',
      );
      assert.ok(
        Math.max(...ys) - Math.min(...ys) >= h * 0.1,
        id + ' depth travel',
      );
      // The portrait route accelerates and turns at a changing depth, whereas
      // the direction clips below are the constant-speed cycles consumed by the game.
      const footprints = new Map<string, XY>();
      let lastBeat = -1,
        occluded = false;
      for (let n = 0; n < Math.round(spec.seconds * 24); n += 2) {
        const frame = compose(c, s, b, 'life', n / 24);
        if (frame.motion.beat !== lastBeat) {
          footprints.clear();
          lastBeat = frame.motion.beat;
        }
        const active = new Set(
          frame.motion.anim === 'walk' ? (frame.body.planted ?? []) : [],
        );
        for (const k of footprints.keys())
          if (!active.has(k)) footprints.delete(k);
        for (const k of active) {
          const p = frame.points[k],
            first = footprints.get(k);
          assert.ok(p, id + ' missing socket ' + k);
          if (first)
            assert.ok(
              Math.hypot(p[0] - first[0], p[1] - first[1]) <= 1.000001,
              id + ' life ' + k + ' slid at ' + n,
            );
          else footprints.set(k, p);
        }
        if (!occluded)
          for (let i = 3; i < frame.layers.body.data.length; i += 4) {
            if (
              frame.layers.body.data[i] >= 200 &&
              frame.layers.bgf.data[i] >= 200
            ) {
              occluded = true;
              break;
            }
          }
      }
      assert.ok(occluded, id + ' must pass behind one of its foreground props');
      assert.deepEqual(
        compose(c, s, b, 'life', 0).picture.data,
        compose(c, s, b, 'life', spec.seconds).picture.data,
      );
      for (const dir of directions) {
        const name = 'walk_' + dir,
          contacts = new Map<string, XY>();
        let checked = 0;
        assert.ok(c.animations[name]?.loop);
        const d = directionVector(dir, c.motion.stride);
        for (let i = 0; i < 24; i++) {
          const f = compose(c, s, b, name, i / 24),
            active = new Set(f.body.planted ?? []);
          assert.ok(
            Math.hypot(
              f.worldFeet[0] - origin[0] - (i / 24 - 0.5) * d[0],
              f.worldFeet[1] - origin[1] - (i / 24 - 0.5) * d[1],
            ) < 1e-6,
          );
          for (const p of contacts.keys())
            if (!active.has(p)) contacts.delete(p);
          for (const p of active) {
            const now = f.points[p];
            assert.ok(now, id + ' missing ' + p);
            const first = contacts.get(p);
            if (first) {
              const slip = Math.hypot(first[0] - now[0], first[1] - now[1]);
              assert.ok(
                slip <= 1.000001,
                id +
                  '/' +
                  name +
                  ' ' +
                  p +
                  ' slipped ' +
                  slip.toFixed(2) +
                  ' px at frame ' +
                  i,
              );
              checked++;
            } else contacts.set(p, now);
          }
        }
        if (!c.motion.fly)
          assert.ok(
            checked >= 12,
            id + '/' + name + ' must expose real load-bearing sockets',
          );
      }
    },
  );
}

test('the isolated turntable keeps the head aligned with each sampled side', () => {
  const c: Creature = {
    ...sample,
    animations: { ...sample.animations, turn: { seconds: 4, loop: true } },
  };
  for (let i = 0; i < 16; i++) {
    const frame = placement(c, 'turn', i / 4, 0, [0, 0]);
    assert.equal(frame.side, i);
    assert.equal(frame.headSide, i);
  }
});
