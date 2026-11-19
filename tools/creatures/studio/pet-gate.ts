import Ajv from 'ajv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compose, frameCount } from '../engine';
import { readCreatureCard } from '../bodies/card-data';
import schema from '../bodies/behavior.schema.json' with { type: 'json' };
import { validateBehavior } from '../viewer/behavior.mjs';
import { studioConfig } from './checks';
import type { Px } from '../rig/px';
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
export function petClipIssues(animations: Record<string, Animation>, references: string[], bodyClips: string[] = [], multiActTrick = false, performanceRarity?: Rarity, tricks = false) {
  const issues: string[] = [];
  const limits = { ...rules };
  if (tricks) {
    // Owner 19.11: paintings perform tricks in both forms instead of attacks (TZ-B10 §1–2).
    for (const name of ['trick', 'trick_b', 'trick-f2', 'trick_b-f2']) limits[name] = [5, 7, false];
    limits.phase = [1.5, 3, false];
    limits['idle-f2'] = [2.5, 3, true];
    limits['happy-f2'] = [1.5, 2.5, false];
    if (performanceRarity === 'mythic' || performanceRarity === 'secret') limits.show = [4, 6, false];
    else if (animations.show) issues.push('show is reserved for a mythic or secret pet');
    for (const name of Object.keys(animations))
      if (name.startsWith('tech_')) issues.push(name + ': a trick painting has no tech_* clips');
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
    if (name.startsWith('tech_') && animations[name].loop) issues.push(name + ' must be a one-shot');
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
export function petGate(painting: Painting, references: string[], hatchKeys: number[] = []) {
  const { c, s, b } = painting;
  if (approvedBeforePets.has(c.id) && !c.behavior) return [];
  if (!c.behavior) return ['new paintings require behavior.json'];
  const { bodyClips, multiActTrick } = studioConfig(c.id);
  const tricks = !!c.behavior.tricks;
  const rank = c.behavior.lifeAttacks || tricks ? c.rarity : undefined;
  const issues = petClipIssues(c.animations, references, bodyClips, multiActTrick, rank, tricks);
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
  const resting = compose(c, s, b, 'idle', 0).layers.body;
  const second = rank && c.animations['idle-f2'] ? compose(c, s, b, 'idle-f2', 0).layers.body : undefined;
  const asleep = Array.isArray(bodyClips) && bodyClips.includes('sleep') && c.animations.sleep
    ? compose(c, s, b, 'sleep', 0).layers.body : undefined;
  let minimum = 1, count = 0;
  for (const [name, clip] of Object.entries(c.animations)) {
    if (clip.loop) continue;
    if ((rank === 'mythic' || rank === 'secret') && name === 'show') {
      // A decoy opens the show. The revealed body holds its own presentation pose.
      const end = frameCount(clip.seconds) - 1;
      const held = compose(c, s, b, name, end / 24).layers.body;
      for (let f = Math.max(0, end - Math.ceil(0.7 * 24) + 1); f < end; f++) {
        const iou = maskOverlap(held, compose(c, s, b, name, f / 24).layers.body);
        if (iou < 0.9) { issues.push('show must hold its final body pose for 0.7 s (frame ' + f + ')'); break; }
      }
      continue;
    }
    for (const n of [0, frameCount(clip.seconds) - 1]) {
      const rendered = compose(c, s, b, name, n / 24);
      const sleepSeam = asleep && joinsSleep(name, n === 0);
      // Second-form clips start and end in the second-form rest; the phase ends there.
      const phaseSeam = ((name === 'phase' && n > 0) || name.endsWith('-f2')) && second;
      const target = phaseSeam || (sleepSeam ? asleep : resting);
      const iou = maskOverlap(target, rendered.layers.body);
      if (tricks && name === 'hatch' && n === 0 && !rendered.layers.body.data.some((v, i) => i % 4 === 3 && v >= 128)) continue;
      if (rank && name === 'hatch' && n === 0 && iou < 0.9) {
        // A birth image is calibrated to its own sheet, which gateExtras measures with ws ref.
        if (!hatchKeys.includes(0)) issues.push('hatch frame 0 birth pose needs its own registered sheet key');
        continue;
      }
      minimum = Math.min(minimum, iou);
      count++;
      if (iou < 0.9) issues.push(name + ' frame ' + n + ' vs ' + (phaseSeam ? 'idle-f2' : sleepSeam ? 'sleep' : 'idle') + ' IoU ' + iou.toFixed(3) + ' < 0.900');
    }
  }
  console.log('  ' + c.id + ': ' + count + ' one-shot endpoints, lowest endpoint IoU ' + minimum.toFixed(3));
  return issues;
}
