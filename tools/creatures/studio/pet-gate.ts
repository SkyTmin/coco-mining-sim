import Ajv from 'ajv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compose, frameCount } from '../engine';
import { readCreatureCard } from '../bodies/card-data';
import schema from '../bodies/behavior.schema.json' with { type: 'json' };
import { validateBehavior } from '../viewer/behavior.mjs';
import type { BehaviorConfig } from '../viewer/behavior.mjs';
import { studioConfig } from './checks';
import type { Px } from '../rig/px';
import type { Rig } from '../rig/f15-rig';
import type { loadPainting } from '../render';
import type { Animation, Rarity } from '../types';

const approvedBeforePets = new Set([
  'bramble_warden', 'gem_beetle', 'silk_dragon', 'frost_yeti', 'toad_shaman',
  'crater_titan', 'coin_dragon', 'storm_ram',
]);
const validateSchema = new Ajv({ allErrors: true }).compile(schema);
const rules: Record<string, [number, number, boolean]> = {
  idle: [3, 4, true], fidget_a: [1.5, 3, false], fidget_b: [1.5, 3, false],
  look: [1.5, 1.5, false], happy: [1.5, 2.5, false], trick: [2, 3, false],
  sleep_in: [1, 1.5, false], sleep: [3, 4, true], sleep_out: [1, 1.5, false],
  wake_startled: [0.8, 1.2, false],
};
/** Trick clips: trick, trick_b … trick_f, each optionally in the second form (-f2). */
const isTrick = (name: string) => /^trick(_[b-f])?(-f2)?$/.test(name);

export function petClipIssues(animations: Record<string, Animation>, references: string[], bodyClips: string[] = [], multiActTrick = false, performanceRarity?: Rarity, tricks?: NonNullable<BehaviorConfig['tricks']>) {
  const issues: string[] = [];
  const limits = { ...rules };
  // A creature's own extra gestures (fidget_c…) follow the rule of the first two.
  for (const name of Object.keys(animations).filter(n => /^fidget_[c-h]$/.test(n))) limits[name] = rules.fidget_a;
  const secretTricks = tricks && performanceRarity === 'secret';
  if (tricks) {
    // One-form paintings (below legendary) have no phase, idle-f2 or happy-f2.
    if (tricks.f2 || secretTricks) {
      limits['happy-f2'] = [0, Infinity, false];
      limits['idle-f2'] = [0, Infinity, true];
      // Minimums only: a secret's tricks, phase and show are as long as their story needs [владелец 21.11].
      limits.phase = secretTricks ? [2, Infinity, false] : [0, Infinity, false];
    }
    const secretPairs = secretTricks ? ['trick', 'trick_b', 'trick-f2', 'trick_b-f2'] : [];
    for (const name of new Set([...secretPairs, ...Object.keys(animations).filter(isTrick)])) {
      if (secretTricks || animations[name])
        limits[name] = secretTricks ? [5, Infinity, false] : [0, Infinity, false];
    }
    if (secretTricks) {
      if ((tricks.f1?.length ?? 0) < 2 || (tricks.f2?.length ?? 0) < 2)
        issues.push('a secret painting needs two tricks in each form');
      limits.show = [5, Infinity, false];
      limits.peek = [0, Infinity, false];
    }
  } else if (performanceRarity) {
    if (performanceRarity !== 'legendary' && performanceRarity !== 'mythic')
      issues.push('lifeAttacks requires a legendary or mythic pet');
    const mythic = performanceRarity === 'mythic';
    limits.trick = mythic ? [5, 6, false] : [4, 5, false];
    limits.phase = [1.5, 2.5, false];
    limits['idle-f2'] = [3, 3, true];
    if (mythic) limits.show = [4, 6, false];
    else if (animations.show) issues.push('show is reserved for a mythic pet');
  } else if (multiActTrick) limits.trick = [3, 4, false];
  const angles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map(d => 'walk_' + d);
  const inherited = new Set<string>();
  if (!Array.isArray(bodyClips)) issues.push('bodyClips must be an array of clip names');
  else for (const name of bodyClips) {
    if (![...angles, 'turn', 'tired', 'sleep'].includes(name) || !animations[name])
      issues.push('invalid body-derived clip ' + name);
    else inherited.add(name);
  }
  for (const name of [...Object.keys(limits), ...angles, 'hatch', 'turn', 'tired']) {
    const clip = animations[name];
    if (!clip) { issues.push('missing ' + name); continue; }
    const limit: [number, number, boolean] | undefined = limits[name] ?? (angles.includes(name) ? [1, 1, true] : undefined);
    if (limit && (clip.seconds < limit[0] || clip.seconds > limit[1] || !!clip.loop !== limit[2]))
      issues.push(name + ' duration or looping differs from the pet set');
  }
  for (const name of Object.keys(animations)) {
    // Walk is the native southeast track that the eight camera headings project.
    if (['life', 'showreel', 'walk'].includes(name)) continue;
    if (!references.includes(name) && !inherited.has(name)) issues.push(name + ' has no registered sheet');
    if (name.startsWith('tech_')) {
      if (tricks) issues.push(name + ' is forbidden in a painting with tricks');
      else if (animations[name].loop) issues.push(name + ' must be a one-shot');
    }
    if (secretTricks && /^(death|die|dying|dead)(?:[_-]|$)/.test(name))
      issues.push(name + ' is forbidden in a secret painting with tricks');
  }
  return issues;
}

/** Compare body layers on the same painting canvas, including translation, without realignment. */
export function maskOverlap(a: Px, b: Px) {
  if (a.w !== b.w || a.h !== b.h) return 0;
  let both = 0, either = 0;
  for (let i = 3; i < a.data.length; i += 4) {
    const x = a.data[i] >= 128, y = b.data[i] >= 128;
    if (x || y) either++;
    if (x && y) both++;
  }
  return either ? both / either : 0;
}

export function joinsSleep(name: string, first: boolean) {
  return first ? name === 'sleep_out' || name === 'wake_startled' : name === 'sleep_in';
}

type Painting = Awaited<ReturnType<typeof loadPainting>>;

export interface Seam {
  clip: string;
  frame: number;
  /** The rest pose this end must meet: idle, idle-f2 (second form) or sleep. */
  against: string;
  iou: number;
  /** hatch frame 0 of a performer: a birth image, measured against its own sheet instead. */
  birth: boolean;
  rig?: Rig;
  againstRig?: Rig;
  /** Shift of the body silhouette's centre against the rest pose, picture pixels. */
  offset: [number, number];
}
function maskCentre(a: Px): [number, number] {
  let x = 0, y = 0, n = 0;
  for (let i = 3, k = 0; i < a.data.length; i += 4, k++)
    if (a.data[i] >= 128) {
      x += k % a.w;
      y += Math.floor(k / a.w);
      n++;
    }
  return n ? [x / n, y / n] : [0, 0];
}
/**
 * Both ends of every one-shot clip against the rest pose they join, and the last 0.7 s of a performer's show against
 * its final frame. `petGate` fails below IoU 0.9; `ws seam` prints the same numbers in seconds, with the parts that moved.
 */
export function endpointSeams(painting: Painting, only?: string[]) {
  const { c, s, b } = painting;
  const tricks = c.behavior?.tricks;
  const rank = c.behavior?.lifeAttacks || tricks ? c.rarity : undefined;
  const { bodyClips } = studioConfig(c.id);
  const seams: Seam[] = [];
  const hold: { frame: number; iou: number }[] = [];
  if (!c.animations.idle) return { seams, hold };
  const rest = (name: string) => {
    const f = compose(c, s, b, name, 0);
    return { body: f.layers.body, rig: f.body.rig };
  };
  const resting = rest('idle');
  const second = rank && c.animations['idle-f2'] ? rest('idle-f2') : undefined;
  const asleep = Array.isArray(bodyClips) && bodyClips.includes('sleep') && c.animations.sleep ? rest('sleep') : undefined;
  for (const [name, clip] of Object.entries(c.animations)) {
    if (clip.loop || (only?.length && !only.includes(name))) continue;
    if ((rank === 'mythic' || (tricks && rank === 'secret')) && name === 'show') {
      // A decoy opens the show. The revealed body holds its own presentation pose.
      const end = frameCount(clip.seconds) - 1;
      const held = compose(c, s, b, name, end / 24).layers.body;
      for (let f = Math.max(0, end - Math.ceil(0.7 * 24) + 1); f < end; f++)
        hold.push({ frame: f, iou: maskOverlap(held, compose(c, s, b, name, f / 24).layers.body) });
      continue;
    }
    for (const n of [0, frameCount(clip.seconds) - 1]) {
      const rendered = compose(c, s, b, name, n / 24);
      const sleepSeam = asleep && joinsSleep(name, n === 0);
      const secondSeam = second && ((name === 'phase' && n > 0) || (tricks && name.endsWith('-f2')));
      const target = secondSeam ? second : sleepSeam ? asleep : resting;
      seams.push({
        clip: name,
        frame: n,
        against: secondSeam ? 'idle-f2' : sleepSeam ? 'sleep' : 'idle',
        iou: maskOverlap(target.body, rendered.layers.body),
        birth: !!rank && name === 'hatch' && n === 0,
        rig: rendered.body.rig,
        againstRig: target.rig,
        offset: ((p, q) => [p[0] - q[0], p[1] - q[1]] as [number, number])(maskCentre(rendered.layers.body), maskCentre(target.body)),
      });
    }
  }
  return { seams, hold };
}
export function petGate(painting: Painting, references: string[], hatchKeys: number[] = []) {
  const { c } = painting;
  if (approvedBeforePets.has(c.id) && !c.behavior) return [];
  if (!c.behavior) return ['new paintings require behavior.json'];
  const { bodyClips, multiActTrick } = studioConfig(c.id);
  const tricks = c.behavior.tricks;
  if (c.rarity === 'secret' && !tricks && c.id !== 'rat_king')
    return ['a secret painting needs two tricks in each form'];
  const rank = c.behavior.lifeAttacks || tricks ? c.rarity : undefined;
  const issues = petClipIssues(c.animations, references, bodyClips, multiActTrick, rank, tricks);
  if (tricks && Object.keys(c.techniques ?? {}).some(name => name.startsWith('tech_')))
    issues.push('a painting with tricks cannot register techniques');
  if (!validateSchema(c.behavior))
    issues.push(...(validateSchema.errors ?? []).map(err => 'behavior.json ' + err.instancePath + ' ' + err.message));
  issues.push(...validateBehavior(c.behavior, c.animations));
  const card = readCreatureCard(c.id);
  if (card && c.behavior.stops?.some(stop => !card.life.beats.some(beat => String(beat.at) === String(stop))))
    issues.push('a behavior stop is missing from card.life.beats');
  const path = join(import.meta.dirname, '../../../assets/creatures', c.id, 'meta.json');
  if (existsSync(path)) {
    const exported = JSON.parse(readFileSync(path, 'utf8')).animations;
    issues.push(...validateBehavior(c.behavior, exported).map(issue => 'meta.json ' + issue));
    for (const [name, clip] of Object.entries(c.animations)) {
      const entry = exported?.[name];
      if (entry?.frames !== frameCount(clip.seconds) || JSON.stringify(entry.interrupt) !== JSON.stringify(clip.interrupt) ||
          JSON.stringify(entry.bearings) !== JSON.stringify(clip.bearings))
        issues.push('meta.json is stale for ' + name);
    }
  }
  if (!c.animations.idle) return issues;
  const { seams, hold } = endpointSeams(painting);
  const broken = hold.find(h => h.iou < 0.9);
  if (broken) issues.push('show must hold its final body pose for 0.7 s (frame ' + broken.frame + ')');
  let minimum = 1, count = 0;
  for (const seam of seams) {
    if (seam.birth && seam.iou < 0.9) {
      // A birth image is calibrated to its own sheet, which gateExtras measures with ws ref.
      if (!hatchKeys.includes(0)) issues.push('hatch frame 0 birth pose needs its own registered sheet key');
      continue;
    }
    minimum = Math.min(minimum, seam.iou);
    count++;
    if (seam.iou < 0.9) issues.push(seam.clip + ' frame ' + seam.frame + ' vs ' + seam.against + ' IoU ' + seam.iou.toFixed(3) + ' < 0.900');
  }
  console.log('  ' + c.id + ': ' + count + ' one-shot endpoints, lowest endpoint IoU ' + minimum.toFixed(3));
  return issues;
}
