// ws events <id> [anim[,anim…]] [--reads] — one reading of a clip's events [research 23.11, VIII.10 stage 3, A02–A06, C04/C05].
// Two authoring schemes live side by side: custom gesture tracks with named `beats` (c/<id>-poses.ts) and TechniqueBook
// techniques (keys with roles, contacts). This adapter reads both and changes neither interpolator. It gives:
//  — events: beats, technique keys and contacts, `hits`, and switch flips seen in the channels (a 0/1 channel that jumps);
//  — phases: the ranges between consecutive events;
//  — the channels the clip writes, and those no source file mentions (a static scan: a likely typo, a warning only);
//  — required sockets at events, checked on points-only frames (no raster): technique contact sockets automatically,
//    more from `requiredSockets` in c/<id>.studio.json; `expectedAbsence` names the deliberate gaps with their reason;
//  — declared props (`props` in studio.json): the state of an object (on the head, in the hand, off the body…) per frame
//    from its channels; a jump between states that need a passage, an appearance away from any event, a one-shot that
//    ends away from its rest state, a loop whose ends disagree;
//  — with --reads, the socket journal of the real compose of every frame: which pose times each frame asks the effects
//    for (the backward dependency: a later pose changes earlier frames) and every read the pose could not answer — the
//    effects often fall back silently (`?? f.feet`), so a missing socket otherwise shows only as a wrong picture.
// What it cannot read (no beats, no gesture) it says, and leaves the clip's own path alone.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPainting } from '../render';
import { compose, frameCount, hitFrame } from '../engine';
import { withPointsOnly } from '../rig/figure';
import { fxJournal, type SocketRead } from '../rig/stats';
import { playbackKeys, techniqueContacts, techniquePoseAt, type JointPose } from '../technique';
import type { BodyFrame, Creature } from '../types';

const tools = join(import.meta.dirname, '..');

export interface ClipEvent {
  frame: number;
  name: string;
  from: 'beats' | 'technique' | 'contact' | 'hit' | 'switch';
  socket?: string;
}
export interface EventIssue {
  level: 'error' | 'warn' | 'info';
  kind: string;
  frame?: number;
  note: string;
}
interface PropSpec {
  doc?: string;
  /** Ordered [state, condition]: the first condition that holds names the state; `always` closes the list. */
  states: [string, string][];
  rest?: string;
  /** "a>b": the state that must lie between a and b (a one-frame jump from a to b is a teleport). */
  between?: Record<string, string>;
  /** The state in which the object is off the body; the effects then draw it (FxInput.propAt). */
  off?: string;
  /** While this holds the object may be nowhere (the body itself is not there yet). */
  absentWhile?: string;
  /** Body socket compared with the effect's drawing point at a handoff, and the allowed distance in field pixels. */
  socket?: string;
  handoffPx?: number;
}
export interface StudioEvents {
  requiredSockets?: Record<string, Record<string, string[]>>;
  expectedAbsence?: Record<string, Record<string, { sockets: string[]; reason: string }>>;
  props?: Record<string, PropSpec>;
}

function studioConfig(id: string): StudioEvents {
  const file = join(tools, 'c', id + '.studio.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

type Gesture = (anim: string, t: number) => JointPose;
async function posesModule(id: string): Promise<{ beats?: Record<string, Record<string, unknown>>; gesture?: Gesture }> {
  const file = join(tools, 'c', `${id}-poses.ts`);
  return existsSync(file) ? await import(file) : {};
}

/** The channels of the clip at every frame, from whichever scheme authors it; undefined when neither does. */
function channelTrack(c: Creature, gesture: Gesture | undefined, anim: string, count: number): JointPose[] | undefined {
  const technique = c.techniques?.[anim];
  if (technique) return Array.from({ length: count }, (_, n) => techniquePoseAt(technique, n / 24));
  if (!gesture) return undefined;
  return Array.from({ length: count }, (_, n) => gesture(anim, n / 24));
}

/** The body frame of a clip time with points only (no raster): sockets, anchor and offsets exact. */
export function pointsAt(c: Creature, anim: string, t: number): BodyFrame {
  return withPointsOnly(() => c.frame(anim, t, 0, 'normal', { headSide: 0, gaitPhase: t, pointsOnly: true }));
}

/** Events of one clip from both schemes, sorted by frame. */
export function readEvents(c: Creature, beats: Record<string, unknown> | undefined, anim: string, track?: JointPose[]): ClipEvent[] {
  const spec = c.animations[anim];
  const out: ClipEvent[] = [];
  for (const [name, v] of Object.entries(beats ?? {})) {
    if (typeof v === 'number') out.push({ frame: v, name, from: 'beats' });
    else if (Array.isArray(v)) v.forEach((f, i) => typeof f === 'number' && out.push({ frame: f, name: `${name}[${i}]`, from: 'beats' }));
  }
  const technique = c.techniques?.[anim];
  if (technique) {
    for (const k of playbackKeys(technique)) out.push({ frame: k.frame, name: k.role, from: 'technique' });
    for (const k of techniqueContacts(technique)) out.push({ frame: k.frame, name: `contact ${k.kind}`, from: 'contact', socket: k.socket });
  }
  for (const h of spec.hits ?? []) out.push({ frame: hitFrame(h), name: 'hit', from: 'hit' });
  if (track) {
    const binary = new Set<string>();
    const values = new Map<string, Set<number>>();
    for (const pose of track)
      for (const [k, v] of Object.entries(pose)) {
        if (!values.has(k)) values.set(k, new Set());
        values.get(k)!.add(v);
      }
    for (const [k, set] of values) if ([...set].every((v) => v === 0 || v === 1) && set.has(1)) binary.add(k);
    for (const k of binary)
      for (let n = 1; n < track.length; n++) {
        const a = track[n - 1][k] ?? 0,
          b = track[n][k] ?? 0;
        if (a !== b) out.push({ frame: n, name: `${k} ${a}→${b}`, from: 'switch' });
      }
  }
  const seen = new Set<string>();
  return out
    .filter((e) => !seen.has(`${e.frame} ${e.name} ${e.from}`) && seen.add(`${e.frame} ${e.name} ${e.from}`))
    .sort((a, b) => a.frame - b.frame || a.name.localeCompare(b.name));
}

/** Words of every source that reads channels: the creature's own files except where the clip is authored, and the
 * shared code. A channel all of whose dot-separated parts are absent from it is written for nobody. */
function readerWords(id: string): Set<string> {
  const words = new Set<string>();
  const files: string[] = [];
  for (const f of readdirSync(join(tools, 'c'))) if (f.startsWith(id) && f.endsWith('.ts') && !/-(poses|keys)\.ts$/.test(f)) files.push(join(tools, 'c', f));
  for (const dir of ['', 'rig', 'kit', 'fx', 'bodies', 'moves'])
    for (const f of readdirSync(join(tools, dir))) if (f.endsWith('.ts')) files.push(join(tools, dir, f));
  for (const f of files) for (const w of readFileSync(f, 'utf8').match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) words.add(w);
  return words;
}

function holds(cond: string, pose: JointPose): boolean {
  if (cond === 'always') return true;
  const m = /^([\w.]+)\s*(>=|<=|>|<|==)\s*(-?[\d.]+)$/.exec(cond.trim());
  if (!m) throw new Error(`props: cannot read the condition «${cond}» (channel >= number)`);
  const v = pose[m[1]] ?? 0,
    x = Number(m[3]);
  return m[2] === '>=' ? v >= x : m[2] === '<=' ? v <= x : m[2] === '>' ? v > x : m[2] === '<' ? v < x : v === x;
}

/** What the effects drew off the body during the real compose of a clip (from the journal). */
export interface PropWorld {
  marks: Map<number, [number, number]>;
  points: Map<number, Record<string, [number, number]>>;
}

/** State ranges of a declared prop and the continuity issues of its timeline. With `world` (the effects' own marks)
 * it also checks the object's existence: on the body and in the world at once (a duplicate), nowhere (a gap), and the
 * distance it travels at a handoff between the effect's drawing and the body socket. */
export function propTimeline(spec: PropSpec, track: JointPose[], loop: boolean, world?: PropWorld) {
  const states = track.map((pose) => spec.states.find(([, cond]) => holds(cond, pose))?.[0] ?? '?');
  const ranges: [string, number, number][] = [];
  states.forEach((s, n) => {
    const last = ranges[ranges.length - 1];
    if (last && last[0] === s) last[2] = n;
    else ranges.push([s, n, n]);
  });
  const issues: EventIssue[] = [];
  for (let i = 1; i < ranges.length; i++) {
    const [a] = ranges[i - 1],
      [b, n] = ranges[i];
    const passage = spec.between?.[`${a}>${b}`];
    if (passage) issues.push({ level: 'warn', kind: 'prop_jump', frame: n, note: `${a} → ${b} in one frame, without «${passage}»` });
  }
  if (spec.rest && !loop && states.length && states[states.length - 1] !== spec.rest)
    issues.push({ level: 'warn', kind: 'prop_not_returned', frame: states.length - 1, note: `ends ${states[states.length - 1]}, rest is ${spec.rest}` });
  if (loop && states.length > 1 && states[0] !== states[states.length - 1])
    issues.push({ level: 'warn', kind: 'prop_loop_seam', frame: states.length - 1, note: `loop ends ${states[states.length - 1]} but starts ${states[0]}` });
  if (world && spec.off) {
    const both: number[] = [],
      none: number[] = [];
    const where = (n: number) => (states[n] !== spec.off ? 'body' : world.marks.has(n) ? 'world' : 'none');
    states.forEach((s, n) => {
      if (s !== spec.off && world.marks.has(n)) both.push(n);
      if (s === spec.off && !world.marks.has(n) && !(spec.absentWhile && holds(spec.absentWhile, track[n]))) none.push(n);
    });
    if (both.length) issues.push({ level: 'error', kind: 'prop_duplicate', frame: both[0], note: `on the body and drawn by the effects at once in frames ${span(both)}` });
    if (none.length) issues.push({ level: 'warn', kind: 'prop_gap', frame: none[0], note: `off the body and not drawn anywhere in frames ${span(none)}` });
    const handoffs: string[] = [];
    for (let n = 1; n < states.length; n++) {
      const a = where(n - 1),
        b = where(n);
      if (a === b || a === 'none' || b === 'none') continue;
      const fxFrame = a === 'world' ? n - 1 : n,
        bodyFrame = a === 'world' ? n : n - 1;
      const p = world.marks.get(fxFrame)!,
        q = spec.socket ? world.points.get(bodyFrame)?.[spec.socket] : undefined;
      if (!q) {
        handoffs.push(`${a}→${b} at ${n}`);
        continue;
      }
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      handoffs.push(`${a}→${b} at ${n} (${d.toFixed(1)} px)`);
      if (d > (spec.handoffPx ?? 12))
        issues.push({ level: 'warn', kind: 'prop_handoff_jump', frame: n, note: `${a} → ${b}: the effect draws it ${d.toFixed(1)} px from ${spec.socket}` });
    }
    if (handoffs.length) issues.push({ level: 'info', kind: 'prop_handoff', note: handoffs.join('; ') });
  }
  return { ranges, issues };
}

/** The frame an event name points at in a clip: a beat, a technique role, `contact`, `hit` or a number. */
function eventFrame(events: ClipEvent[], name: string): number | undefined {
  if (/^\d+$/.test(name)) return Number(name);
  return events.find((e) => e.name === name || (name === 'contact' && e.from === 'contact') || (name === 'hit' && e.from === 'hit'))?.frame;
}

export interface ClipReport {
  anim: string;
  frames: number;
  events: ClipEvent[];
  channels: string[];
  issues: EventIssue[];
  props: Record<string, [string, number, number][]>;
  reads?: { asked: number; missing: SocketRead[]; reach: Record<number, [number, number]> };
}

/** What the effects revealed while every frame of a clip was composed: socket reads, prop marks, pose sockets. */
export interface FxLog {
  log: SocketRead[];
  marks: Map<string, Map<number, [number, number]>>;
  poses: Map<number, Record<string, [number, number]>>;
}
/** Listen to the effects while `run` composes frames (ws review records its single walk this way). */
export function recordFx<T>(run: () => T): { result: T; fx: FxLog } {
  const fx: FxLog = { log: [], marks: new Map(), poses: new Map() };
  fxJournal.socket = (r) => fx.log.push(r);
  fxJournal.prop = (m) => {
    if (!fx.marks.has(m.prop)) fx.marks.set(m.prop, new Map());
    fx.marks.get(m.prop)!.set(m.frame, m.at);
  };
  fxJournal.pose = (n, points) => fx.poses.set(n, { ...points });
  try {
    return { result: run(), fx };
  } finally {
    fxJournal.socket = fxJournal.prop = fxJournal.pose = undefined;
  }
}

export async function clipReport(id: string, anim: string, withReads = false, override: StudioEvents = {}, recorded?: FxLog): Promise<ClipReport> {
  const { c, s, b } = await loadPainting(id);
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${id} has no animation ${anim}`);
  const count = frameCount(spec.seconds);
  const mod = await posesModule(id);
  const track = channelTrack(c, mod.gesture, anim, count);
  const events = readEvents(c, mod.beats?.[anim], anim, track);
  const cfg = { ...studioConfig(id), ...override };
  const issues: EventIssue[] = [];
  if (!track) issues.push({ level: 'info', kind: 'no_channels', note: 'neither a technique nor gesture(anim, t) authors this clip: channels and props not read' });

  // channels written for nobody
  const channels = track ? [...new Set(track.flatMap((p) => Object.keys(p)))].sort() : [];
  const words = readerWords(id);
  // a part also counts when the code builds it: 'hand' + name → handL, 'crystal' + k → crystal3
  const known = (part: string) =>
    words.has(part) || /^\d+$/.test(part) || [...words].some((w) => w.length >= 3 && part.startsWith(w) && /^(L|R|Left|Right|\d+)$/.test(part.slice(w.length)));
  for (const ch of channels)
    if (!ch.split('.').every(known))
      issues.push({ level: 'warn', kind: 'channel_unread', note: `«${ch}» is written by the clip, no skin, rig or effect file mentions it` });

  // sockets at events: technique contacts, then the declared ones
  const want: [string, number, string][] = [];
  for (const e of events) if (e.from === 'contact' && e.socket) want.push([e.socket, e.frame, e.name]);
  for (const [event, sockets] of Object.entries(cfg.requiredSockets?.[anim] ?? {})) {
    const f = eventFrame(events, event);
    if (f === undefined) issues.push({ level: 'error', kind: 'unknown_event', note: `requiredSockets names «${event}», the clip has no such event` });
    else for (const sk of sockets) want.push([sk, f, event]);
  }
  const absent = Object.entries(cfg.expectedAbsence?.[anim] ?? {});
  const frames = new Map<number, BodyFrame>();
  const at = (f: number) => {
    if (!frames.has(f)) frames.set(f, pointsAt(c, anim, f / 24));
    return frames.get(f)!;
  };
  for (const [socket, f, event] of want)
    if (!at(f).points[socket]) {
      const excused = absent.find(([e, a]) => eventFrame(events, e) === f && a.sockets.includes(socket));
      if (excused) issues.push({ level: 'info', kind: 'expected_absence', frame: f, note: `${socket} at ${event}: ${excused[1].reason}` });
      else issues.push({ level: 'error', kind: 'missing_required_socket', frame: f, note: `${socket} is required at ${event} (frame ${f}), the pose has no such socket` });
    }
  for (const [event, a] of absent) {
    const f = eventFrame(events, event);
    if (f === undefined) issues.push({ level: 'error', kind: 'unknown_event', note: `expectedAbsence names «${event}», the clip has no such event` });
    else for (const sk of a.sockets) if (at(f).points[sk]) issues.push({ level: 'warn', kind: 'absence_not_absent', frame: f, note: `${sk} is declared absent at ${event} (${a.reason}), but the pose has it` });
  }

  // The journal of the real compose: socket reads, the effects' prop marks, the poses' sockets. It runs with --reads,
  // and by itself for clips where a declared prop leaves the body (the handoff can only be seen in the effects).
  const propSpecs = Object.entries(cfg.props ?? {});
  const leaves = !!track && propSpecs.some(([, p]) => p.off && track.some((pose) => p.states.find(([, cond]) => holds(cond, pose))?.[0] === p.off));
  const journal = !!recorded || withReads || leaves;
  const { log, marks, poses } = recorded ?? (journal ? recordFx(() => { for (let n = 0; n < count; n++) compose(c, s, b, anim, n / 24); }).fx : { log: [], marks: new Map(), poses: new Map() });

  const props: ClipReport['props'] = {};
  if (track)
    for (const [name, p] of propSpecs) {
      const t = propTimeline(p, track, !!spec.loop, journal ? { marks: marks.get(name) ?? new Map(), points: poses } : undefined);
      props[name] = t.ranges;
      for (const i of t.issues) issues.push({ ...i, note: `${name}: ${i.note}` });
    }

  let reads: ClipReport['reads'];
  if (withReads || recorded) {
    const reach: Record<number, [number, number]> = {};
    for (const r of log) {
      const f = Math.round(r.when * 24 * 100) / 100;
      const span = (reach[r.frame] ??= [f, f]);
      span[0] = Math.min(span[0], f);
      span[1] = Math.max(span[1], f);
    }
    const seen = new Set<string>();
    const missing = log.filter((r) => !r.ok && !seen.has(r.frame + ' ' + r.name + ' ' + r.when) && seen.add(r.frame + ' ' + r.name + ' ' + r.when));
    reads = { asked: log.length, missing, reach };
    // Misses, grouped by socket. A frame asking its own pose («is the rock there?») and skipping is a normal probe of
    // a socket that comes and goes: one info line of ranges. A frame asking another time's pose is aiming at an event
    // (the toss, the catch): when that pose has no socket the effect falls back (`?? f.feet`) — a warning per gap.
    const own = new Map<string, number[]>();
    const other = new Map<string, number[]>();
    for (const r of missing) {
      const when = Math.round(r.when * 24 * 100) / 100;
      if (Math.abs(when - r.frame) < 0.01) own.set(r.name, [...(own.get(r.name) ?? []), r.frame]);
      else other.set(`${r.name}@${when}`, [...(other.get(`${r.name}@${when}`) ?? []), r.frame]);
    }
    for (const [name, list] of own) issues.push({ level: 'info', kind: 'socket_probe', note: `${name} absent in its own frames ${span(list)} (the effect checks and skips)` });
    for (const [key, asking] of other) {
      const [name, when] = key.split('@');
      const declared = absent.some(([e, a]) => eventFrame(events, e) === Number(when) && a.sockets.includes(name));
      issues.push({
        level: declared ? 'info' : 'warn',
        kind: declared ? 'expected_absence' : 'fx_read_missing',
        frame: Number(when),
        note: `frames ${span(asking)} ask ${name} at frame ${when}, that pose has none${declared ? ' (declared)' : ': the effect falls back or skips'}`,
      });
    }
  }
  return { anim, frames: count, events, channels, issues, props, reads };
}

function span(list: number[]) {
  const sorted = [...new Set(list)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j;
  }
  return parts.join(', ');
}

/** Frames whose picture depends on poses of other times, as ranges of the asked times (backward and forward). */
function reachLine(reach: Record<number, [number, number]>) {
  const back: string[] = [];
  for (const [f, [lo, hi]] of Object.entries(reach)) {
    const n = Number(f);
    if (hi > n + 0.5) back.push(`${n}→${hi}`);
  }
  const forward = Object.entries(reach).filter(([f, [lo]]) => lo < Number(f) - 0.5).length;
  return `later poses read by ${back.length} frames${back.length ? ` (${back.slice(0, 6).join(' ')}${back.length > 6 ? ' …' : ''})` : ''}, earlier poses by ${forward}`;
}

export async function eventsCommand(args: string[]) {
  const [id, list] = args.filter((a) => !a.startsWith('--'));
  if (!id) {
    console.log('usage: npm run ws -- events <id> [anim[,anim…]] [--reads]');
    process.exitCode = 1;
    return;
  }
  const { c } = await loadPainting(id);
  const anims = list ? list.split(',') : Object.keys(c.animations).filter((a) => !/^(walk|turn|idle|life$|showreel$)/.test(a));
  const withReads = args.includes('--reads');
  let errors = 0,
    warnings = 0;
  for (const anim of anims) {
    const r = await clipReport(id, anim, withReads);
    const named = r.events.filter((e) => e.from !== 'switch');
    const lines = [`${id} ${anim}: ${r.frames} frames, ${r.channels.length} channels`];
    if (named.length) lines.push('  events: ' + named.map((e) => `${e.frame}:${e.name}${e.socket ? '@' + e.socket : ''}`).join(' '));
    const switches = r.events.filter((e) => e.from === 'switch');
    if (switches.length) lines.push('  switches: ' + switches.map((e) => `${e.frame}:${e.name}`).join(' '));
    if (named.length > 1) {
      const pts = [0, ...named.map((e) => e.frame), r.frames - 1].filter((v, i, a) => i === 0 || v !== a[i - 1]);
      lines.push('  phases: ' + pts.slice(1).map((f, i) => `${pts[i]}–${f}`).join(' '));
    }
    for (const [name, ranges] of Object.entries(r.props)) lines.push(`  ${name}: ` + ranges.map(([s, a, b]) => `${s} ${a}${b > a ? '–' + b : ''}`).join(', '));
    if (r.reads) lines.push(`  reads: ${r.reads.asked} socket reads; ${reachLine(r.reads.reach)}`);
    for (const i of r.issues) {
      if (i.level === 'error') errors++;
      if (i.level === 'warn') warnings++;
      lines.push(`  ${i.level === 'error' ? '!' : i.level === 'warn' ? '·' : '-'} ${i.kind}${i.frame !== undefined ? ` [${i.frame}]` : ''} ${i.note}`);
    }
    console.log(lines.join('\n'));
  }
  console.log(`${errors} errors, ${warnings} warnings in ${anims.length} clips${withReads ? '' : ' (without --reads: the effects were not run)'}`);
  if (errors) process.exitCode = 1;
}
