import { readCreatureCard } from '../bodies/card-data';
import { lightFrame } from '../bodies/light-quadruped';
import { progress } from '../fx/field';
import { everyday } from '../rig/figure';
import { sixPoses, techniquePoseAt, withTechniques, type JointPose, type TechniqueBook } from '../technique';
import type { Creature } from '../types';
import { scores } from './root_stag-keys';
import { rootStagAppearance } from './root_stag-skin';
import { stagEffects, lamps } from './root_stag-fx';

const card = readCreatureCard('root_stag');
const book: TechniqueBook = {};
for (const move of card.moves) {
  const ring = move.id === 'tech_root_ring',
    volley = move.id === 'tech_firefly';
  book[move.id] = {
    title: move.title,
    reference: move.reference,
    weapon: move.weapon,
    keys: sixPoses(scores[move.id]),
    seconds: 2,
    interpolate: true,
    shake: ring ? 0.34 : 0.18,
    stop: 1 / 24,
    contactKind: ring ? 'floor' : volley ? 'projectile' : 'air',
    ...(move.id === 'tech_antler_sweep'
      ? {
          pathKeys: [
            {
              role: 'prep' as const,
              frame: 20,
              pose: { ...scores[move.id][2][1], 'head.pitch': 0.68, 'neck.pitch': 0.27, 'head.yaw': -0.99 },
            },
          ],
        }
      : {}),
    ...(ring ? { floorSocket: 'hoofFRGround', recovery: 'rebound' as const } : {}),
    ...(volley
      ? { contacts: [{ frame: 25, socket: 'lanternR0', kind: 'projectile' as const, projectile: 'pollen0' }] }
      : {}),
  };
}
function sample(anim: string, n: number): JointPose {
  if (book[anim]) return techniquePoseAt(book[anim], n / 24);
  const keys = scores[anim];
  if (!keys) return {};
  const next = keys.findIndex(([frame]) => frame >= n);
  if (next <= 0) return keys[next === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[next - 1],
    [end, b] = keys[next];
  const t = progress(n, start, end),
    u = t * t * (3 - 2 * t);
  return Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [
      k,
      (a[k] ?? 0) * (1 - u) + (b[k] ?? 0) * u,
    ]),
  );
}
const figure = lightFrame(card, card.life, {
  ...rootStagAppearance,
  draw(r, s, card, variant) {
    // The secondary masses follow the same motion with separate inertia times.
    const n = s.time * 24,
      lag = (frames: number) => sample(s.anim, Math.max(0, n - frames));
    const pitch = (p: JointPose) => p['neck.pitch'] ?? 0;
    const yaw = (p: JointPose) => p['head.yaw'] ?? 0;
    const pose = { ...s.pose };
    pose.earLift = (pose.earLift ?? 0) + 0.35 * (pitch(lag(2)) - pitch(pose));
    pose.antlerFlex = (pose.antlerFlex ?? 0) + 0.54 * (yaw(lag(2)) - yaw(pose));
    pose.lanternSwing =
      (pose.lanternSwing ?? 0) + 0.92 * (yaw(lag(5)) - yaw(pose)) + 0.48 * (pitch(lag(4)) - pitch(pose));
    pose.maneLift = (pose.maneLift ?? 0) + 0.7 * (pitch(lag(3)) - pitch(pose));
    if (s.anim === 'trick')
      for (const [i, lamp] of lamps.entries()) {
        const release = 17 + i,
          home = i === 3 ? 86 : 57 + i * 4;
        pose['vacant' + lamp] = progress(n, release, release + 2) * (1 - progress(n, home - 1, home + 1));
      }
    if (s.anim === 'tech_firefly')
      for (const [i, lamp] of lamps.entries()) {
        pose['vacant' + lamp] = progress(n, 19 + i, 20 + i) * (1 - progress(n, 38 + i, 40 + i));
      }
    rootStagAppearance.draw(r, { ...s, pose }, card, variant);
  },
  pose: (anim, t) => {
    const p = sample(anim, t * 24),
      sleep = p.sleep ?? (anim === 'sleep' ? 1 : 0);
    if (anim === 'turn') {
      // Sink onto the planted diagonal as the crown swings across the far shoulder.
      const transfer = Math.sin(Math.PI * progress(t, 0.75, 1.75)) ** 2;
      return { ...p, crouch: 7 * Math.sin((Math.PI * t) / 4) ** 2 + 2.4 * transfer };
    }
    if (anim === 'walk') return { ...p, crouch: 4.5 };
    if (!sleep) return p;
    return {
      ...p,
      'head.pitch': (p['head.pitch'] ?? 0) + 0.23 * sleep,
      'neck.pitch': (p['neck.pitch'] ?? 0) - 0.23 * sleep,
    };
  },
});
const animal: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  frame: figure,
  effects: stagEffects,
  animations: {
    ...everyday,
    fidget_a: { seconds: 2 },
    fidget_b: { seconds: 2 },
    happy: { seconds: 2 },
    trick: { seconds: 3.75 },
    sleep: { seconds: 3.5, loop: true },
    sleep_in: { seconds: 1.25 },
    sleep_out: { seconds: 1.25 },
    wake_startled: { seconds: 1 },
    ...Object.fromEntries(card.moves.map((m) => [m.id, { seconds: 2 }])),
  },
};
export default withTechniques(animal, book);
