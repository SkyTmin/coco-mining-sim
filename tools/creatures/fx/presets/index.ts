// Choreography and material are independent: a summoned paper kite and an icicle can share
// a launch socket and a ballistic path, but they keep different silhouettes and landing marks.
import { hash, TAU } from '../../kit/f11-mobkit';
import { flightDelays } from '../../moves';
import type { CardMove, CreatureCard } from '../../bodies/card-data';
import { techniqueContacts, type Technique, type TechniqueBook } from '../../technique';
import { paintMaterial, paintImpact, paintSocketTrail, projectileAt } from '../../technique-fx';
import type { Creature, FxInput, XY } from '../../types';
import { ellFill, oval, progress, settle } from '../field';
import { effectPresets, type PresetId } from './materials';
export { effectPresets, type PresetId } from './materials';

type Material = (typeof effectPresets)[PresetId];
interface Stage {
  move: CardMove;
  spec: Technique;
  strikes: number[];
}
export interface MoveImpact {
  move: CardMove;
  origin: XY;
  socket: string;
  seconds: number;
  age: number;
  landing: boolean;
}
/** Optional artwork (lightning, heraldry, etc.) sees the actual in-world contact. */
export interface PaintHooks {
  impact?: (f: FxInput, event: MoveImpact) => void;
}

function hitBurst(f: FxInput, material: Material, origin: XY, age: number, strength: number, seed: number) {
  if (age <= 0 || age >= 0.46) return;
  const fade = 1 - progress(age, 0.24, 0.46);
  for (let n = 0; n < 8; n++) {
    const angle = TAU * hash(seed, n, 1),
      speed = (19 + hash(seed, n, 2) * 28) * strength;
    const x = origin[0] + Math.cos(angle) * speed * age;
    const floor = origin[1] + Math.sin(angle) * speed * age * 0.38;
    const height = Math.max(0, (28 + hash(seed, n, 3) * 37) * age - 130 * age * age);
    ellFill(f.under, [x, floor + 1], 2.4, 1, '#34323a', fade * 0.45);
    material.fragment(f.above, [x, floor - height], 1.4 + hash(seed, n, 4) * 1.6, angle + age * 9, fade);
  }
}

function emitImpact(f: FxInput, material: Material, event: MoveImpact, hooks: PaintHooks) {
  const { origin, age, move, socket, landing } = event;
  if (age < 0 || age > 0.5) return;
  const power = move.parameters.strength,
    side = move.parameters.side;
  const ground = landing || ['overhead', 'leap', 'pillars', 'sweep'].includes(move.template);
  const alpha = 1 - progress(age, 0.25, 0.5);
  paintImpact(f, ground ? 'under' : 'above', socket, origin, (p, x, y) => {
    // The first bright chip and the root of the effect touch the measured socket on the hit frame.
    p.col(material.light, alpha);
    p.dot(x, y, 2, 1);
    const spread = (2 + 12 * progress(age, 0, 0.19)) * power;
    material.mark(p, [x, y], spread, side * 0.6, alpha);
  });
  hitBurst(f, material, origin, age, power, event.seconds * 24 + socket.length);
  hooks.impact?.(f, event);
}

// Each missile has a named physical birth. The destination stays fixed after release, even
// while the artist's grip recoils. Direct the fan into the available side of the field.
function missiles(
  f: FxInput,
  stage: Stage,
  material: Material,
  hooks: PaintHooks,
  launch: number,
  wave: number,
) {
  const { move, spec } = stage,
    delays = flightDelays(move.template);
  if (!delays.length) return;
  const release = launch / 24;
  if (f.t < release || f.t > (launch + delays.at(-1)!) / 24 + 0.5) return;
  const head = f.pointAt(release, spec.weapon);
  const ground = f.pointAt(release, spec.weapon + 'Ground');
  const chosen = move.parameters.side;
  const sign = (chosen > 0 ? f.w - head[0] : head[0]) > 32 ? chosen : -chosen;
  const room = sign > 0 ? f.w - head[0] - 6 : head[0] - 6;
  const length = Math.max(2, Math.min(room, 36 + move.parameters.amplitude * 24));
  for (const [i, delay] of delays.entries()) {
    const hit = (launch + delay) / 24,
      id = move.id + '-' + wave + '-' + i;
    const age = f.t - hit;
    if (age > 0.5) continue;
    const ratio = (i + 1) / delays.length;
    const end: XY = [
      Math.max(3, Math.min(f.w - 4, head[0] + sign * length * (0.28 + 0.72 * ratio))),
      Math.max(3, Math.min(f.h - 5, ground[1] + 6 + (i % 2 ? 5 : -2))),
    ];
    const height = move.template === 'pillars' ? 0 : (9 + ratio * 20) * move.parameters.amplitude;
    if (age <= 1 / 24) {
      const at = projectileAt(f, id, spec.weapon, release, hit, end, height);
      if (age < 0) {
        const u = progress(f.t, release, hit);
        const angle = Math.atan2(end[1] - head[1] - 4 * height * (1 - 2 * u), end[0] - head[0]);
        if (move.template === 'pillars') {
          const phase = Math.min(1, (f.t - release) * 15);
          f.under.lineS(head[0], head[1], ...at, material.edge, 0.84 * phase);
          paintMaterial(f, 'under', id, at, pen => material.mark(pen, at, 2, angle, 0.88), ground[1]);
        } else {
          paintMaterial(f, 'above', id, at, pen => {
            if (move.template === 'summon')
              oval(pen, at, 4, 4, material.light, 0.66, angle - 1.3, angle + 1.8);
            material.fragment(pen, at, move.template === 'volley' ? 4.2 : 3.5, angle, 1);
          });
          ellFill(f.under, [at[0], end[1]], 3, 1, material.edge, 0.46);
        }
      }
    }
    if (age < 0) continue;
    emitImpact(f, material, { move, origin: end, socket: id, seconds: hit, age, landing: true }, hooks);
    if (move.template === 'pillars') {
      const rise = progress(age, 0, 0.1) * (1 - progress(age, 0.15, 0.48));
      const h = (14 + i * 6) * rise * move.parameters.strength;
      const cap: XY = [end[0] + sign * i, end[1] - h];
      if (h > 1) {
        f.above.lineS(...end, ...cap, material.edge, rise);
        f.above.lineS(end[0] + 1, end[1], cap[0] + 1, cap[1], material.light, rise);
        material.fragment(f.above, cap, 2.5, -Math.PI / 2, rise);
      }
    }
  }
}

function ringOrBreath(f: FxInput, stage: Stage, material: Material, origin: XY, age: number) {
  const { move } = stage;
  const u = progress(age, 0, 0.46),
    alpha = 1 - u;
  if (u <= 0 || u >= 1) return;
  const sign = move.parameters.side,
    range = move.parameters.amplitude;
  if (move.template === 'breath' || move.template === 'roar') {
    const release = f.t - age;
    const skull = f.pointAt(release, 'head');
    const dx = origin[0] - skull[0],
      dy = origin[1] - skull[1];
    const length = Math.hypot(dx, dy);
    const forward: XY = length > 1 ? [dx / length, dy / length] : [sign, 0];
    const place = (distance: number, lateral: number): XY => [
      origin[0] + forward[0] * distance - forward[1] * lateral,
      origin[1] + forward[1] * distance + forward[0] * lateral,
    ];
    if (move.template === 'breath') {
      for (let i = 0; i < 8; i++) {
        const spread = Math.sin(i * 2.4) * (2 + 8 * u);
        const tip = place(u * (30 + i * 3) * range, spread);
        material.fragment(
          f.above,
          tip,
          2 + 4 * u,
          Math.atan2(forward[1], forward[0]) + i * 0.7 + u * 3,
          alpha,
        );
      }
    } else {
      const ground = f.pointAt(release, stage.spec.weapon + 'Ground');
      for (let i = 0; i < 3; i++) {
        const v = u - i * 0.12;
        if (v <= 0) continue;
        let from = place(v * 24, -(2 + 23 * v * range));
        for (let j = 1; j <= 10; j++) {
          const t = j / 10,
            arc = Math.PI * t;
          const to = place(v * 24 + Math.sin(arc) * (1 + 6 * v), -Math.cos(arc) * (2 + 23 * v * range));
          f.above.lineS(...from, ...to, material.light, alpha);
          from = to;
        }
        oval(
          f.under,
          [ground[0] + forward[0] * v * 19, ground[1] + forward[1] * v * 5],
          4 + v * 25,
          1 + v * 8,
          material.edge,
          alpha * 0.8,
        );
      }
    }
  } else if (move.template === 'leap') {
    oval(f.under, origin, 1 + u * 36 * range, 1 + u * 10, material.light, alpha);
  } else if (move.template === 'dive') {
    const at = f.t - age,
      ground = f.pointAt(at, stage.spec.weapon + 'Ground');
    oval(f.under, ground, 2 + u * 21 * range, 1 + u * 7, material.edge, alpha * 0.85);
    for (let i = -2; i <= 2; i++) {
      const lift = Math.max(0, (22 + Math.abs(i) * 8) * u * (1 - u));
      material.fragment(f.above, [origin[0] + i * u * 8 * range, origin[1] - lift], 2, i * 0.8, alpha);
    }
  } else if (move.template === 'sweep' || move.template === 'slide') {
    // The blade leaves a gouge widening in the direction of its real follow-through.
    const follow = f.pointAt(Math.min(f.duration, f.t - age + 0.12), stage.spec.weapon);
    const dx = follow[0] - origin[0],
      dy = follow[1] - origin[1],
      len = Math.hypot(dx, dy) || 1;
    const width = 3 + u * 16 * range;
    f.under.lineS(
      ...origin,
      origin[0] + (dx / len) * width,
      origin[1] + (dy / len) * width,
      material.edge,
      alpha,
    );
  } else if (move.template === 'overhead') {
    for (let i = -1; i <= 1; i++) {
      const angle = Math.PI * (0.5 + i * 0.32),
        size = 2 + u * 18 * range;
      f.under.lineS(
        ...origin,
        origin[0] + Math.cos(angle) * size,
        origin[1] + Math.sin(angle) * size * 0.38,
        material.edge,
        alpha,
      );
    }
  }
}

export function buildEffects(
  card: Pick<CreatureCard, 'moves' | 'effects'>,
  book: TechniqueBook,
  hooks: PaintHooks = {},
): Pick<Creature, 'effects' | 'props'> {
  const material = effectPresets[card.effects];
  const stages = new Map<string, Stage>();
  for (const move of card.moves) {
    const spec = book[move.id];
    if (!spec) throw Error('Missing technique ' + move.id);
    const strikes = [...spec.keys, ...(spec.repeatKeys ?? [])]
      .filter((key) => key.role === 'hit')
      .map((key) => key.frame);
    stages.set(move.id, { move, spec, strikes });
  }
  return {
    props(f) {
      const stage = stages.get(f.anim);
      if (!stage || stage.move.template !== 'ram') return;
      // A ram splits the clod at its nose. A repeated charge catches the next rolling clod.
      for (const [wave, n] of stage.strikes.entries()) {
        const hit = n / 24,
          previous = wave ? stage.strikes[wave - 1] / 24 : 0;
        const age = f.t - hit,
          incoming = progress(f.t, previous, previous + 0.12);
        const fade = Math.min(incoming, 1 - progress(age, 0.2, 0.53));
        if (fade <= 0) continue;
        const point = f.pointAt(hit, stage.spec.weapon);
        const apart = progress(age, 0, 0.22) * 7;
        const roll = wave ? (1 - incoming) * 8 * stage.move.parameters.side : 0;
        const ground = f.pointAt(hit, stage.spec.weapon + 'Ground');
        for (const side of [-1, 1]) {
          const at: XY = [point[0] + roll + side * (2 + apart), point[1] + 1 + apart * 0.3];
          paintMaterial(f, 'under', 'clod-' + wave + '-' + side, at,
            pen => material.fragment(pen, at, 4 - side, side * 0.7, fade), ground[1]);
        }
      }
    },
    effects(f) {
      const stage = stages.get(f.anim);
      if (!stage) return;
      const { move, spec, strikes } = stage;
      for (const c of techniqueContacts(spec)) {
        if (c.projectile) continue;
        const at = c.frame / 24,
          age = f.t - at;
        if (age < 0 || age > 0.5) continue;
        const origin = f.pointAt(at, c.socket);
        emitImpact(f, material, { move, origin, socket: c.socket, seconds: at, age, landing: false }, hooks);
        ringOrBreath(f, stage, material, origin, age);
      }
      const duration = spec.keys[3].frame - spec.keys[2].frame;
      for (const [wave, n] of strikes.entries()) {
        const at = n / 24,
          age = f.t - at,
          start = (n - duration) / 24;
        if (f.t >= start && age <= 0.09)
          paintSocketTrail(f, 'above', spec.weapon, start, at, {
            color: material.light,
            width: 2,
            alpha: 1 - progress(age, 0.02, 0.09),
          });
        missiles(f, stage, material, hooks, n, wave);
      }
      if (move.template === 'slide' && f.t*24>=27 && f.t*24<=42) {
        const contact=f.points.torsoGround??f.feet;
        const age=(f.t*24-27)/15;
        for(let i=0;i<5;i++) {
          const slip=(age+i*.19)%1;
          const x=contact[0]-9-22*slip;
          const y=contact[1]-2-4*Math.sin(Math.PI*slip)+i*.6;
          f.under.lineS(x,y,x+2+3*slip,y-.8,material.light,(1-slip)*.8);
        }
      }
      settle(f);
    },
  };
}
