// Pixel-FX diagnostics share the gate's existing frame walk. Source inspection and the CPU timer never enter a painting.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compose, frameCount } from '../engine';
import { displayFrame, impactClock } from '../kit/impact-clock';
import { sizeOf, type Creature, type FxInput, type XY } from '../types';
import { playbackKeys, techniqueContacts } from '../technique';
import type { Finding, Painting, StudioConfig } from './checks';
import { readPoseRefs } from './ref';
import { observeInk, outsidePixel, residualPixels } from './fx-ink';
import { legacyFxWarnings } from './fx-sources';
import { benchToys } from '../c/pocket_magnet-fx';

export type FxIssue = 'fx-end' | 'fx-bounds' | 'unseeded' | 'socket-teleport' | 'slow-frame';
export const FRAME_BUDGET_MS = 1000 / 24;

export function fxFinding(id: string, anim: string, kind: FxIssue, frames: number[], note: string): Finding {
  return { anim, kind, frames, note, level: legacyFxWarnings.has(id) || kind === 'slow-frame' ? 'warn' : 'error' };
}

/** Native tracks, registered drawings, studio landmarks and the technique book are all valid authored keys. */
export async function authoredKeys(c: Creature, cfg: StudioConfig): Promise<Map<string, Set<number>>> {
  const file = join(import.meta.dirname, '..', 'c', c.id + '-poses.ts');
  const poses = existsSync(file) ? await import(file) : {};
  const refs = readPoseRefs(c.id);
  const out = new Map<string, Set<number>>();
  for (const [anim, spec] of Object.entries(c.animations)) {
    const keys = new Set<number>([...(refs[anim]?.frames ?? []), ...(cfg.keyframes?.[anim] ?? []).map(k => k.frame)]);
    const authored = new Set<number>();
    const technique = c.techniques?.[anim];
    if (technique) {
      for (const k of playbackKeys(technique)) authored.add(k.frame);
      for (const k of techniqueContacts(technique)) authored.add(k.frame);
    }
    for (const t of spec.authoredHits ?? spec.hits ?? []) authored.add(Math.round(t * 24));
    for (const contact of spec.contacts ?? []) authored.add(contact.frame);
    for (const key of poses.tracks?.[anim] ?? []) authored.add(key[0]);
    for (const beat of Object.values(poses.beats?.[anim] ?? {}).flat()) if (typeof beat === 'number') authored.add(beat);
    // Registered images and landmarks already name displayed frames; motion and contact tracks name source frames.
    for (const n of authored) keys.add(displayFrame(n, spec.contacts ?? []));
    out.set(anim, keys);
  }
  return out;
}

export function frameRanges(numbers: number[]) {
  const runs: string[] = [];
  for (let i = 0; i < numbers.length; i++) {
    const first = numbers[i];
    while (i + 1 < numbers.length && numbers[i + 1] === numbers[i] + 1) i++;
    runs.push(numbers[i] === first ? String(first) : first + '–' + numbers[i]);
  }
  return runs.join(', ');
}

// A pilot can switch to idle automatically at the last tick. The attack's historical sockets may
// not exist in that rig. Sample the true clip on that tick using one extra tick of headroom for compose.
function referenceInput(p: Painting, anim: string, t: number, includeLast = false) {
  const { c, s, b } = p;
  const spec = c.animations[anim];
  if (!spec) return;
  const animations = includeLast ? { ...c.animations, [anim]: { ...spec, seconds: spec.seconds + 1 / 24,
    ...(spec.authoredSeconds === undefined ? {} : { authoredSeconds: spec.authoredSeconds + 1 / 24 }) } } : c.animations;
  let input: FxInput | undefined;
  const sample: Creature = { ...c, animations, props: undefined, effects(f) { input = f; } };
  compose(sample, s, b, anim, t);
  return input;
}

export class FxFrameGate {
  private readonly propsInk = new Map<string, XY>();
  private readonly effectInk = new Map<string, XY>();
  private input?: FxInput;
  private points?: Record<string, XY>;
  private readonly outside: number[] = [];
  private outsideNote = '';
  private readonly jumps: number[] = [];
  private furthest = 0;
  private jumpNote = '';
  private residual = 0;
  private readonly slow: { n: number; ms: number }[] = [];
  readonly creature: Creature;
  constructor(readonly painting: Painting, readonly anim: string, private readonly keys = new Set<number>()) {
    const c = painting.c;
    const watch = (brush: Creature['effects'], dirty: Map<string, XY>) => brush && ((f: FxInput) => {
      this.input = f;
      observeInk(f, brush, dirty);
    });
    this.creature = { ...c, props: watch(c.props, this.propsInk), effects: watch(c.effects, this.effectInk) };
  }

  begin() {
    this.propsInk.clear();
    this.effectInk.clear();
    this.input = undefined;
  }

  frame(n: number, frame: ReturnType<typeof compose>, ms: number) {
    const { c } = this.painting;
    const spec = c.animations[this.anim];
    const f = this.input;
    // Production switches non-pet pilots to their rest rig on the last frame. Inspect the authored end too.
    const contacts = spec.contacts ?? [];
    const time = f?.anim === this.anim ? f.t : contacts.length ? impactClock(n / 24, contacts).time : n / 24;
    const authored = Math.round(time * 24);
    for (const [draw, dirty] of [[c.props, this.propsInk], [c.effects, this.effectInk]] as const) {
      if (!f || !draw || !dirty.size) continue;
      // The four pixels of the accepted bench prop at its left swing, measured on the pre-B22 painting.
      // Its identity also covers the experimental copy reusing this prop, without exempting the new effects.
      const outside = outsidePixel(f, draw, dirty, (layer, x, y) => draw === benchToys && this.anim === 'trick_b'
        && layer === 'backdrop' && x === -1 && y === [60, 58, 59, 60][authored - 96]);
      if (outside) {
        this.outside.push(n);
        if (!this.outsideNote) this.outsideNote = n + ': ' + outside.name + ' at (' + outside.x + ', ' + outside.y + ')';
        break;
      }
    }
    if (c.effects && f && !spec.loop && n === frameCount(spec.seconds) - 1) {
      const endInput = f.anim === this.anim ? f : referenceInput(this.painting, this.anim, n / 24, true);
      const idle = this.anim === 'sleep_in' && c.animations.sleep ? 'sleep' :
        (this.anim.endsWith('-f2') || this.anim === 'phase') && c.animations['idle-f2'] ? 'idle-f2' : 'idle';
      const idleInput = f.anim === idle ? f : referenceInput(this.painting, idle, time);
      if (endInput) {
        const actual = Object.assign(Object.create(endInput), { anim: this.anim, t: time,
          hits: spec.authoredHits ?? spec.hits ?? [], duration: spec.authoredSeconds ?? spec.seconds });
        // Permanent art keeps the same phase in both views. Each clip resolves its own socket history.
        const rest = Object.assign(Object.create(actual), { anim: idle, hits: [], duration: c.animations[idle]?.seconds ?? spec.seconds,
          points: { ...idleInput?.points, ...actual.points }, pointAt: idleInput?.pointAt ?? actual.pointAt });
        this.residual = residualPixels(actual, c.effects, rest);
      }
    }
    const limit = Math.max(12, Math.round(sizeOf(c)[2] * 0.25));
    // Points are field coordinates before camera shake. Match the source time on both sides of a held contact.
    const keyed = this.keys.has(n) || (spec.poseStep === 2 && authored % 2 === 0 && this.keys.has(n - 1));
    if (!keyed && this.points) {
      const weapon = c.techniques?.[this.anim]?.weapon;
      let jumped = false;
      for (const [name, pos] of Object.entries(frame.points)) {
        if (!/^(?:hand[LR]?|wrist[LR]?|paw[LR]?|weaponTip|staffTip|spearTip|bladeTip|pole)$/i.test(name) && name !== weapon) continue;
        const prev = this.points[name];
        if (!prev) continue;
        const distance = Math.hypot(pos[0] - prev[0], pos[1] - prev[1]);
        if (distance <= limit) continue;
        jumped = true;
        if (distance > this.furthest) {
          this.furthest = distance;
          this.jumpNote = (n - 1) + '→' + n + ' ' + name + ' ' + distance.toFixed(1) + ' px (limit ' + limit + ')';
        }
      }
      if (jumped) this.jumps.push(n);
    }
    this.points = frame.points;
    if (ms > FRAME_BUDGET_MS) this.slow.push({ n, ms });
  }

  findings() {
    const { c, s, b } = this.painting;
    const out: Finding[] = [];
    const add = (kind: FxIssue, frames: number[], note: string) => out.push(fxFinding(c.id, this.anim, kind, frames, note));
    if (this.outside.length) add('fx-bounds', this.outside, frameRanges(this.outside) + ' — first outside pixel ' + this.outsideNote);
    if (this.residual) {
      const n = frameCount(c.animations[this.anim].seconds) - 1;
      add('fx-end', [n], n + ': ' + this.residual + ' residual layer pixels at the last displayed frame');
    }
    if (this.jumps.length) add('socket-teleport', this.jumps, frameRanges(this.jumps) + ' — worst ' + this.jumpNote);
    // Probe any slow candidate again without instrumentation. Two slow clean draws distinguish repeatable
    // frame cost from a cold cache, GC, expensive checker work or the process losing its time slice.
    for (const { n } of this.slow.sort((a, b) => b.ms - a.ms)) {
      let best = Infinity;
      for (let i = 0; i < 2 && best > FRAME_BUDGET_MS; i++) {
        const start = performance.now();
        compose(c, s, b, this.anim, n / 24);
        best = Math.min(best, performance.now() - start);
      }
      if (best > FRAME_BUDGET_MS) {
        add('slow-frame', [n], n + ': both clean draws ≥ ' + best.toFixed(1) + ' ms (budget ' + FRAME_BUDGET_MS.toFixed(1) + ' ms)');
        break;
      }
    }
    return out;
  }
}

/** Source clips omitted from the structural gate (walk headings and turn) still get the same FX tests.
 * Life and showreel are compiled sequences of the tested actions. */
export function scanFxClip(gate: FxFrameGate) {
  const { c, s, b } = gate.painting;
  const count = frameCount(c.animations[gate.anim].seconds);
  for (let n = 0; n < count; n++) {
    gate.begin();
    const start = performance.now();
    const frame = compose(gate.creature, s, b, gate.anim, n / 24);
    gate.frame(n, frame, performance.now() - start);
  }
  return gate.findings();
}
