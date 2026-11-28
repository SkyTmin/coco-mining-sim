// Contacts are authored at 24 Hz. A freeze inserts repeated display frames without dropping the recovery.
import type { Animation, Creature, ImpactContact } from '../types';

export function displayFrame(frame: number, contacts: readonly ImpactContact[]) {
  let delay = 0;
  for (const c of contacts) {
    if (c.frame >= frame) break;
    delay += c.freeze ?? 0;
  }
  return frame + delay;
}

/** time is the artist's local clock; shake is the damped camera excursion in field pixels. */
export function impactClock(seconds: number, contacts: readonly ImpactContact[]) {
  const tick = seconds * 24;
  let delay = 0, shake = 0, shakeFrame = 0;
  for (const c of contacts) {
    const age = tick - c.frame - delay;
    if (age < -1e-8) break;
    const hold = c.freeze ?? 0;
    if (hold && age <= hold + 1e-8) return { time: c.frame / 24, shake: 0, shakeFrame: 0, held: true, delay: Math.max(0, tick - c.frame) };
    delay += hold;
    // The undelayed contact can shake on the hit. A frozen hit shakes on the first moving frame.
    const elapsed = age - (hold ? hold + 1 : 0);
    if (elapsed >= -1e-8 && elapsed < (c.shake ?? 0)) {
      const excursion = (c.amp ?? 0) * (1 - Math.max(0, elapsed) / c.shake!);
      if (excursion >= shake) { shake = excursion; shakeFrame = Math.round(elapsed); }
    }
  }
  return { time: (tick - delay) / 24, shake, shakeFrame, held: false, delay };
}

export function timedAnimation(source: Animation): Animation {
  if (!source.contacts?.length || source.authoredSeconds !== undefined) return source;
  const contacts: ImpactContact[] = [];
  const count = Math.round(source.seconds * 24);
  for (const c of source.contacts) {
    const prev = contacts.at(-1);
    if (!Number.isInteger(c.frame) || c.frame < 0 || c.frame >= count || (prev && c.frame < prev.frame) ||
      !Number.isInteger(c.freeze ?? 0) || (c.freeze ?? 0) < 0 || (c.freeze ?? 0) > 5 ||
      !Number.isInteger(c.shake ?? 0) || (c.shake ?? 0) < 0 || !Number.isFinite(c.amp ?? 0) || (c.amp ?? 0) < 0)
      throw RangeError('Invalid impact timing at frame ' + c.frame);
    // Two sockets can hit on the same tick. One physical moment owns one clock.
    if (prev?.frame === c.frame) {
      prev.freeze = Math.max(prev.freeze ?? 0, c.freeze ?? 0);
      prev.shake = Math.max(prev.shake ?? 0, c.shake ?? 0);
      prev.amp = Math.max(prev.amp ?? 0, c.amp ?? 0);
    } else contacts.push({ ...c });
  }
  const delay = contacts.reduce((sum, c) => sum + (c.freeze ?? 0), 0);
  const hits = [...new Set([...(source.hits ?? []).map(t => Math.round(t * 24)), ...contacts.map(c => c.frame)])].sort((a, b) => a - b);
  return { ...source, contacts, authoredSeconds: source.seconds, seconds: source.seconds + delay / 24,
    hits: hits.map(n => displayFrame(n, contacts) / 24), authoredHits: hits.map(n => n / 24) };
}

/** Expand before the life clock and reel chapters read clip lengths. */
export function withImpactTiming(c: Creature): Creature {
  if (!Object.values(c.animations).some(a => a.contacts?.length)) return c;
  return { ...c, animations: Object.fromEntries(Object.entries(c.animations).map(([k, a]) => [k, timedAnimation(a)])) };
}
