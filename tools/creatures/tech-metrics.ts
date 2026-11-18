// Measurements are in the native field grid: retain body translation, subtract camera shake.
import type { Px } from './rig/px';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose, frameCount, ground, hitFrame, screenPoint } from './engine';
import { loadPainting } from './render';
import { sizes, type Creature, type XY } from './types';

import {
  techniqueContacts,
  type ContactKind,
  type PoseRole as KeyRole,
  type Technique as MeasurableTechnique,
  type TechniqueContact as Contact,
} from './technique';
import type { TechniqueTrace as Trace } from './technique-fx';

export interface BodyMask {
  pixels: Set<number>;
  centre: XY;
  bounds: [number, number, number, number]; // inclusive x0, y0, x1, y1
  height: number;
}
export function maskOf(p: Pick<Px, 'w' | 'h' | 'data'>, offset: XY = [0, 0]): BodyMask {
  const pixels = new Set<number>();
  let sumX = 0,
    sumY = 0,
    x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const ox = Math.round(offset[0]),
    oy = Math.round(offset[1]);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (p.data[4 * (y * p.w + x) + 3] <= 200) continue;
      const X = x + ox,
        Y = y + oy;
      pixels.add((Y + 32768) * 65536 + X + 32768);
      sumX += X;
      sumY += Y;
      x0 = Math.min(x0, X);
      x1 = Math.max(x1, X);
      y0 = Math.min(y0, Y);
      y1 = Math.max(y1, Y);
    }
  if (!pixels.size) throw new Error('Empty body mask at alpha > 200');
  return {
    pixels,
    centre: [sumX / pixels.size, sumY / pixels.size],
    bounds: [x0, y0, x1, y1],
    height: y1 - y0 + 1,
  };
}
export function maskIoU(a: BodyMask, b: BodyMask) {
  const [small, large] = a.pixels.size <= b.pixels.size ? [a.pixels, b.pixels] : [b.pixels, a.pixels];
  let intersection = 0;
  for (const point of small) if (large.has(point)) intersection++;
  return intersection / (a.pixels.size + b.pixels.size - intersection);
}
export function maskMetrics(prep: BodyMask, hit: BodyMask, bodyHeight: number) {
  if (!(bodyHeight > 0)) throw Error('Expected a positive native idle body height');
  return {
    comRatio: Math.hypot(prep.centre[0] - hit.centre[0], prep.centre[1] - hit.centre[1]) / bodyHeight,
    iou: maskIoU(prep, hit),
  };
}
export function pathLength(points: readonly XY[]) {
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return length;
}
function segmentDistance(p: XY, a: XY, b: XY) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    squared = dx * dx + dy * dy;
  const u = squared ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / squared)) : 0;
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
}
export function pointPathDistance(p: XY, path: readonly XY[]) {
  if (!path.length) return Infinity;
  if (path.length === 1) return Math.hypot(p[0] - path[0][0], p[1] - path[0][1]);
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, segmentDistance(p, path[i - 1], path[i]));
  return best;
}

export function trailDeviation(
  pixels: readonly XY[],
  paintedPath: readonly XY[],
  physicalPath: readonly XY[],
) {
  let farthest = 0;
  for (const pixel of pixels)
    farthest = Math.max(
      farthest,
      pointPathDistance(pixel, paintedPath),
      pointPathDistance(pixel, physicalPath),
    );
  return farthest;
}

interface Reference {
  comRatio: number;
  iou: number;
  tipRatio: number | null;
  prepFrame: number;
  hitFrame: number;
  bodyHeight: number;
}
export type ReferenceSet = Record<string, Reference>;
const sourceURL = new URL(
  '../../docs/reports/creatures/pilot-3/reference/tech-metrics.json',
  import.meta.url,
);
export function readReferences(): ReferenceSet {
  if (!existsSync(sourceURL))
    throw new Error('Native reference measurements are missing: ' + fileURLToPath(sourceURL));
  return JSON.parse(readFileSync(sourceURL, 'utf8')).references;
}
const temporary = { comRatio: 0.1, iou: 0.75, tipRatio: 0.6 };
export function referenceLimits(ref?: Reference) {
  return {
    comRatio: Math.max(temporary.comRatio, ref?.comRatio ?? 0),
    iou: Math.min(temporary.iou, ref?.iou ?? 1),
    tipRatio: Math.max(temporary.tipRatio, ref?.tipRatio ?? 0),
  };
}
const distance = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rounded = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 'missing');
type Painting = Awaited<ReturnType<typeof loadPainting>>;
type Composite = ReturnType<typeof compose>;
function registeredMask(frame: Composite) {
  return maskOf(frame.layers.body, [-frame.camera[0], -frame.camera[1]]);
}
function socketSampler(c: Creature, anim: string) {
  const [w, h] = sizes[c.rarity],
    feet = ground(w, h);
  const cache = new Map<number, Record<string, XY>>();
  return (t: number, name: string): XY => {
    let projected = cache.get(t);
    if (!projected) {
      const body = c.frame(anim, t, 0, 'normal', { headSide: 0, gaitPhase: t });
      projected = Object.fromEntries(
        Object.entries(body.points).map(([k, p]) => [k, screenPoint(body, p, feet)]),
      );
      cache.set(t, projected);
    }
    if (!projected[name]) throw new Error(c.id + '/' + anim + ' has no projected socket ' + name);
    return projected[name];
  };
}
function sample48(start: number, end: number, sample: (t: number) => XY) {
  const points: XY[] = [sample(start)];
  for (let n = Math.floor(start * 48) + 1; n / 48 < end - 1e-8; n++) points.push(sample(n / 48));
  if (end > start) points.push(sample(end));
  return points;
}
function overshoot(path: XY[], continuation: XY[]) {
  const end = path.at(-1)!;
  // Ignore zero-length chords from a held pose. The last distinct chord is
  // the actual incoming tangent, including for a curved staff or tail.
  const previous = path.findLast((p) => distance(p, end) > 0.25);
  if (!previous) return 0;
  const d = distance(previous, end),
    dx = (end[0] - previous[0]) / d,
    dy = (end[1] - previous[1]) / d;
  return Math.max(0, ...continuation.map((p) => (p[0] - end[0]) * dx + (p[1] - end[1]) * dy));
}
function keyFrame(spec: MeasurableTechnique, role: KeyRole) {
  const key = spec.keys.find((k) => k.role === role);
  if (!key) throw new Error(spec.title + ' missing ' + role + ' key');
  return key.frame;
}
type MeasuredContact = {
  frame: number;
  socket: string;
  kind: ContactKind;
  socketXY: XY | null;
  birthXY: XY | null;
  birthError: number | null;
  floorError: number | null;
  inkPixels: number;
  nearestInk: number | null;
  launchError: number | null;
  landingError: number | null;
};
function contactEvidence(
  contact: Contact,
  frame: Composite,
  trace: Trace | undefined,
  sample: (t: number, s: string) => XY,
  issues: string[],
): MeasuredContact {
  const { socket, kind, projectile: projectileId } = contact;
  const flight = projectileId ? trace?.projectiles.find((p) => p.id === projectileId) : undefined;
  const expected = flight?.at ?? frame.points[socket];
  const origin = trace?.births
    .filter((b) => b.socket === socket || b.socket === projectileId)
    .sort((a, b) => (expected ? distance(a.at, expected) - distance(b.at, expected) : 0))[0];
  const prefix = 'frame ' + contact.frame + ' ' + socket;
  if (projectileId && !flight) issues.push(prefix + ' missing projectile ' + projectileId);
  if (flight && (flight.socket !== socket || hitFrame(flight.hit) !== contact.frame))
    issues.push(prefix + ' projectile source or landing time differs from its contact');
  if (!expected) issues.push(prefix + ' missing contact point');
  const birthError = expected && origin ? distance(expected, origin.at) : null;
  const pixels = origin?.pixels ?? [];
  const nearestInk =
    expected && pixels.length
      ? pixels.reduce((best, p) => Math.min(best, distance(expected, p)), Infinity)
      : null;
  if (!pixels.length) issues.push(prefix + ' has no painted birth');
  else if (nearestInk !== null && nearestInk > 2 + 1e-8)
    issues.push(prefix + ' nearest visible contact ink is ' + rounded(nearestInk) + ' px away');
  if (birthError === null || birthError > 2 + 1e-8)
    issues.push(prefix + ' birth distance ' + rounded(birthError ?? Infinity) + ' px');
  const floorY = contact.floorSocket ? frame.points[contact.floorSocket]?.[1] : frame.worldFeet[1];
  const floorError =
    kind === 'floor' && expected && Number.isFinite(floorY) ? Math.abs(expected[1] - floorY) : null;
  if (kind === 'floor' && (floorError === null || floorError > 2 + 1e-8))
    issues.push(prefix + ' floor distance ' + rounded(floorError ?? Infinity) + ' px');
  const launchError = flight ? distance(flight.origin, sample(flight.release, flight.socket)) : null;
  const landingError = flight && origin ? distance(flight.landing, origin.at) : null;
  if (launchError !== null && launchError > 2 + 1e-8)
    issues.push(prefix + ' projectile released ' + rounded(launchError) + ' px from its socket');
  if (landingError !== null && landingError > 2 + 1e-8)
    issues.push(prefix + ' landing missed FX by ' + rounded(landingError) + ' px');
  return {
    frame: contact.frame,
    socket,
    kind,
    socketXY: expected ?? null,
    birthXY: origin?.at ?? null,
    birthError,
    floorError,
    inkPixels: pixels.length,
    nearestInk,
    launchError,
    landingError,
  };
}
interface MeasuredFlight {
  id: string;
  socket: string;
  release: number;
  hit: number;
  origin: XY;
  landing: XY;
  observations: number;
  launchError: number;
  arrivalError: number | null;
}
function measureAction(
  painting: Painting,
  anim: string,
  spec: MeasurableTechnique,
  bodyHeight: number,
  ref: Reference | undefined,
  geometryOnly: boolean,
) {
  const { c, s, b } = painting,
    animation = c.animations[anim],
    count = frameCount(animation.seconds);
  const prep = keyFrame(spec, 'prep'),
    strike = keyFrame(spec, 'strike'),
    hit = keyFrame(spec, 'hit'),
    follow = keyFrame(spec, 'follow');
  const render = (n: number): Composite => {
    try {
      return compose(c, s, b, anim, n / 24, 0, 'normal');
    } catch (error) {
      throw new Error(c.id + '/' + anim + ' frame ' + n + ': ' + String(error), { cause: error });
    }
  };
  const atPrep = render(prep),
    atHit = render(hit),
    hitMask = registeredMask(atHit);
  const { comRatio, iou } = maskMetrics(registeredMask(atPrep), hitMask, bodyHeight);
  const sample = socketSampler(c, anim),
    exactHit = animation.hits?.find((t) => hitFrame(t) === hit) ?? hit / 24;
  const physical = (t: number) => sample(t, spec.weapon);
  const swing = sample48(prep / 24, exactHit, physical),
    tipRatio = pathLength(swing) / bodyHeight;
  const followPx = overshoot(swing, sample48(exactHit, follow / 24, physical));
  const attackFrames = hit - strike,
    prepFraction = prep / count,
    strikeFraction = strike / count,
    limits = referenceLimits(ref);
  const issues: string[] = [];
  if (
    ![prep, strike, hit, follow].every((n) => Number.isInteger(n) && n >= 0 && n < count) ||
    prep > strike ||
    strike >= hit ||
    hit >= follow
  )
    issues.push('invalid key order');
  if (!animation.hits?.some((t) => hitFrame(t) === hit)) issues.push('hit key missing from animation.hits');
  if (comRatio + 1e-8 < limits.comRatio)
    issues.push('COM ' + rounded(comRatio) + ' H < ' + rounded(limits.comRatio));
  if (iou > limits.iou + 1e-8) issues.push('IoU ' + rounded(iou) + ' > ' + rounded(limits.iou));
  if (tipRatio + 1e-8 < limits.tipRatio)
    issues.push('tip ' + rounded(tipRatio) + ' H < ' + rounded(limits.tipRatio));
  if (attackFrames < 2 || attackFrames > 4) issues.push('strike ' + attackFrames + ' frames');
  if (prepFraction < 0.35 - 1e-8 || prepFraction > 0.5 + 1e-8)
    issues.push('preparation ' + rounded(prepFraction) + ' of duration');
  if (followPx <= 1e-6) issues.push('no forward follow-through');
  const declared = techniqueContacts(spec),
    contacts: MeasuredContact[] = [];
  const stop = animation.stop ?? 0;
  let heldFrames = 0;
  if (new Set(animation.hits).size === 1) {
    if (stop < 0.04 - 1e-8 || stop > 0.08 + 1e-8) issues.push('single contact hit-stop ' + stop + ' s');
    // Hold the actual rasterised rig and its projected positions. The shaken viewport may clip a different fringe each frame.
    for (let k = 1; k <= Math.max(1, Math.round(stop * 24)); k++) {
      const next = render(hit + k);
      if (
        atHit.body.px.w === next.body.px.w &&
        atHit.body.px.h === next.body.px.h &&
        atHit.body.px.data.every((v, i) => v === next.body.px.data[i]) &&
        Object.entries(atHit.points).every(([name, pt]) => distance(pt, next.points[name]) < 1e-8)
      )
        heldFrames++;
      else if (!geometryOnly) issues.push('pose released before end of hit-stop at frame ' + (hit + k));
    }
  }
  const contactFrames = new Set(declared.map((c) => c.frame));
  const flights = new Map<string, MeasuredFlight>();
  const weapons = new Set([spec.weapon, ...declared.map((c) => c.socket)]);
  let physicalTrailPixels = 0;
  let trailMax = 0,
    trailPixels = 0,
    trailFrames = 0,
    worstTrailFrame: number | null = null;
  if (!geometryOnly) {
    for (const t of animation.hits ?? [])
      if (!contactFrames.has(hitFrame(t))) issues.push('no contact specification at ' + hitFrame(t));
    for (let n = 0; n < count; n++) {
      const frame = n === hit ? atHit : n === prep ? atPrep : render(n),
        trace = frame.techniqueTrace;
      if (contactFrames.has(n))
        for (const contact of declared.filter((c) => c.frame === n)) {
          contacts.push(contactEvidence(contact, frame, trace, sample, issues));
        }
      for (const flight of trace?.projectiles ?? []) {
        const rec = flights.get(flight.id) ?? {
          id: flight.id,
          socket: flight.socket,
          release: flight.release,
          hit: flight.hit,
          origin: flight.origin,
          landing: flight.landing,
          observations: 0,
          launchError: 0,
          arrivalError: null,
        };
        const launchError = distance(flight.origin, sample(flight.release, flight.socket));
        rec.launchError = Math.max(rec.launchError, launchError, distance(rec.origin, flight.origin));
        if (n / 24 >= flight.hit - 1e-8) rec.arrivalError = distance(flight.at, flight.landing);
        rec.observations++;
        flights.set(rec.id, rec);
      }
      let framePixels = 0;
      for (const tr of trace?.trails ?? []) {
        // Rebuild a dense 48-Hz weapon path independently. The renderer also
        // reports its current slice, so a stray pixel must satisfy both paths.
        const independent = sample48(tr.from, tr.to, (t) => sample(t, tr.socket));
        const error = trailDeviation(tr.pixels, tr.path, independent);
        if (error > trailMax) {
          trailMax = error;
          worstTrailFrame = n;
        }
        if (weapons.has(tr.socket)) physicalTrailPixels += tr.pixels.length;
        framePixels += tr.pixels.length;
      }
      if (framePixels) trailFrames++;
      trailPixels += framePixels;
    }
    for (const flight of flights.values()) {
      if (flight.launchError > 2 + 1e-8)
        issues.push(
          flight.id + ' launch differs from its physical socket by ' + rounded(flight.launchError) + ' px',
        );
      if (flight.arrivalError === null || flight.arrivalError > 2 + 1e-8)
        issues.push(flight.id + ' did not reach its landing');
    }
    if (!physicalTrailPixels) issues.push('no painted trail for a contact weapon');
    if (trailMax > 2 + 1e-8)
      issues.push('trail ' + rounded(trailMax) + ' px from path at ' + worstTrailFrame);
  }
  return {
    hitMask,
    row: {
      anim,
      reference: spec.reference,
      weapon: spec.weapon,
      bodyHeight,
      prep,
      strike,
      hit,
      follow,
      comRatio,
      iou,
      tipRatio,
      prepFraction,
      strikeFraction,
      heldFrames,
      attackFrames,
      followPx,
      stop: animation.stop ?? 0,
      contacts,
      projectiles: [...flights.values()],
      trailPixels,
      trailFrames,
      trailMax,
      worstTrailFrame,
      limits,
      issues,
    },
  };
}
export async function measureCreature(
  id: string,
  refs: ReferenceSet = readReferences(),
  geometryOnly = false,
) {
  const painting = await loadPainting(id),
    { c, s, b } = painting;
  const book = c.techniques;
  if (!book) throw Error(id + ' has no attached technique key book');
  const bodyHeight = registeredMask(compose(c, s, b, 'idle', 0)).height;
  const hitMasks = new Map<string, BodyMask>(),
    techniques = [];
  for (const anim of Object.keys(c.animations).filter((s) => s.startsWith('tech_'))) {
    const spec = book[anim];
    if (!spec) throw Error(id + ' missing keys for ' + anim);
    const { row, hitMask } = measureAction(
      painting,
      anim,
      spec,
      bodyHeight,
      refs[spec.reference],
      geometryOnly,
    );
    if (!refs[spec.reference]) row.issues.push('missing native reference ' + spec.reference);
    techniques.push(row);
    hitMasks.set(anim, hitMask);
  }
  const pairs = [];
  for (let i = 0; i < techniques.length; i++)
    for (let j = 0; j < i; j++) {
      const a = techniques[j].anim,
        b = techniques[i].anim;
      pairs.push({ a, b, iou: maskIoU(hitMasks.get(a)!, hitMasks.get(b)!) });
    }
  return { id, bodyHeight, techniques, pairs };
}
export const pilotIds = [
  'bramble_warden',
  'gem_beetle',
  'silk_dragon',
  'frost_yeti',
  'toad_shaman',
  'crater_titan',
  'coin_dragon',
];
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    ids = args.filter((s) => !s.startsWith('--'));
  const refs = existsSync(sourceURL) ? readReferences() : {};
  const rows = [];
  for (const id of ids.length ? ids : pilotIds)
    rows.push(await measureCreature(id, refs, args.includes('--geometry')));
  console.log(JSON.stringify(rows, null, 2));
}
