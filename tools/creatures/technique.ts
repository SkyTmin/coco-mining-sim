// Authored joint controls are sampled before projection on the existing creature rig.
import type { Animation, Creature } from './types';

export type ContactKind = 'floor' | 'air' | 'body' | 'projectile';
export type PoseRole = 'rest' | 'prep' | 'strike' | 'hit' | 'follow' | 'return';
export type JointPose = Record<string, number>;

export interface PoseKey {
  role: PoseRole;
  frame: number;
  pose: JointPose;
  /** Timing on the segment approaching this key. */
  ease?: 'smooth' | 'in' | 'out' | 'linear';
}
export interface TechniqueContact {
  frame: number;
  socket: string;
  kind: ContactKind;
  projectile?: string;
  floorSocket?: string;
}
export interface Technique {
  title: string;
  reference: string;
  weapon: string;
  contactKind: ContactKind;
  keys: readonly PoseKey[];
  contacts?: readonly TechniqueContact[];
  floorSocket?: string;
  seconds?: number;
  stop?: number;
  shake?: number;
  /** The director switches this on after the critic has seen the held keys. */
  interpolate?: boolean;
}
export type TechniqueBook = Record<string, Technique>;

/** Six dramatic positions, authored in the order rest, anticipation, strike, contact, recoil, return. */
export function sixPoses(rows: readonly [number, JointPose][]): PoseKey[] {
  if (rows.length !== 6) throw Error('Expected six authored poses');
  const roles: PoseRole[] = ['rest', 'prep', 'strike', 'hit', 'follow', 'return'];
  return rows.map(([frame, pose], index) => ({ frame, role: roles[index], pose }));
}

export function techniqueContacts(spec: Technique): readonly TechniqueContact[] {
  if (spec.contacts) return spec.contacts;
  const hit = spec.keys.find((k) => k.role === 'hit');
  return hit
    ? [
        {
          frame: hit.frame,
          socket: spec.weapon,
          kind: spec.contactKind,
          floorSocket: spec.floorSocket,
        },
      ]
    : [];
}

export function techniquePoseAt(spec: Technique, seconds: number): JointPose {
  const position = seconds * 24;
  const keys = spec.keys;
  if (position <= keys[0].frame) return keys[0].pose;
  const next = keys.findIndex((key) => key.frame >= position - 1e-8);
  if (next < 0) return keys[keys.length - 1].pose;
  const b = keys[next];
  if (Math.abs(position - b.frame) < 1e-8) return b.pose;
  const a = keys[next - 1];
  if (!spec.interpolate) return a.pose;
  const u = (position - a.frame) / (b.frame - a.frame);
  const ease = b.ease ?? (b.role === 'hit' ? 'in' : b.role === 'follow' ? 'out' : 'smooth');
  const amount =
    ease === 'linear'
      ? u
      : ease === 'in'
        ? u * u
        : ease === 'out'
          ? 1 - (1 - u) * (1 - u)
          : u * u * (3 - 2 * u);
  const values: JointPose = {};
  for (const name of new Set([...Object.keys(a.pose), ...Object.keys(b.pose)])) {
    const from = a.pose[name] ?? 0;
    values[name] = from + ((b.pose[name] ?? 0) - from) * amount;
  }
  return values;
}

export function withTechniques(c: Creature, book: TechniqueBook): Creature {
  const animations: Record<string, Animation> = { ...c.animations };
  for (const [name, spec] of Object.entries(book)) {
    const original = animations[name];
    if (!original) throw Error(c.id + ' names an unknown technique ' + name);
    const seconds = spec.seconds ?? original.seconds;
    const n = Math.round(seconds * 24);
    if (
      spec.keys.length < 4 ||
      spec.keys.length > 6 ||
      spec.keys[0].frame !== 0 ||
      spec.keys.at(-1)!.frame !== n - 1
    ) {
      throw Error(c.id + '/' + name + ' must span frames 0–' + (n - 1) + ' in 4–6 keys');
    }
    let previous = -1;
    for (const key of spec.keys) {
      if (
        !Number.isInteger(key.frame) ||
        key.frame <= previous ||
        Object.values(key.pose).some((v) => !Number.isFinite(v))
      ) {
        throw Error(c.id + '/' + name + ' invalid pose at ' + key.frame);
      }
      previous = key.frame;
    }
    const contacts = techniqueContacts(spec);
    if (
      contacts.some(
        (hit, i) =>
          !Number.isInteger(hit.frame) ||
          hit.frame < 0 ||
          hit.frame >= n ||
          (i > 0 && hit.frame < contacts[i - 1].frame),
      )
    ) {
      throw Error(c.id + '/' + name + ' invalid contact frames');
    }
    animations[name] = {
      ...original,
      seconds,
      ...(contacts.length || spec.contacts ? { hits: contacts.map((hit) => hit.frame / 24) } : {}),
      ...(spec.shake === undefined ? {} : { shake: spec.shake }),
      ...(spec.stop === undefined ? {} : { stop: spec.stop }),
    };
  }
  return {
    ...c,
    techniques: book,
    animations,
    frame(anim, t, side, variant, motion) {
      const spec = book[anim];
      if (!spec) return c.frame(anim, t, side, variant, motion);
      return c.frame(anim, t, side, variant, {
        headSide: motion?.headSide ?? side,
        gaitPhase: motion?.gaitPhase ?? t,
        techniquePose: techniquePoseAt(spec, t),
      });
    },
  };
}
