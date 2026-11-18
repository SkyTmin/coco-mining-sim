// One pass over an animation that finds what critics used to find by eye:
// limbs inside the body, pops between neighbouring frames, contact hidden by the foreground,
// impact effects that melt into the background. Output is frame numbers, not pictures.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compose, frameCount, hitFrame } from '../engine';
import { techniqueContacts } from '../technique';
import { maskOf, maskIoU, type BodyMask } from '../tech-metrics';
import type { Creature, Scene, Border, XY } from '../types';
import type { Px } from '../rig/px';
import { captureRig } from './capture';
import { baselineOf, worstClip, type ClipAllow, type ClipBaseline } from './clip';
import { viewBaseline, worstGone, type ViewBaseline } from './visibility';

export interface Painting {
  c: Creature;
  s: Scene;
  b: Border;
}
export interface Finding {
  anim: string;
  kind: 'clip' | 'thin-clip' | 'jump' | 'hidden-contact' | 'weak-impact' | 'end-pop' | 'foot-slide' | 'part-gone';
  /** errors fail the gate; warnings are listed for the author and the critic. */
  level: 'error' | 'warn';
  frames: number[];
  note: string;
}
export interface StudioConfig {
  /** Designed overlaps, matched by tag or label substring: e.g. { a: 'tongue', b: 'head' }. */
  clipAllow?: ClipAllow[];
  /** Legacy strings match a tag substring. New rules apply to an exact part and an inclusive interval. */
  partGone?: (string | { part: string; anim: string; frames: [number, number]; reason: string })[];
  /** Animations or frames to skip for a check, e.g. { jump: ['show:74-77'] }. */
  skip?: Partial<Record<Finding['kind'], string[]>>;
}

const tools = join(import.meta.dirname, '..');
export function studioConfig(id: string): StudioConfig {
  const f = join(tools, 'c', id + '.studio.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
}

export function allowsOcclusion(cfg: StudioConfig, tag: string, anim: string, n: number) {
  return (cfg.partGone ?? []).some((rule) => {
    if (typeof rule === 'string') return tag.includes(rule);
    return rule.part === tag && rule.anim === anim && rule.frames[0] <= n && n <= rule.frames[1]
      && typeof rule.reason === 'string' && rule.reason.trim().length > 0;
  });
}

export const defaultAnims = (c: Creature) =>
  Object.keys(c.animations).filter(
    (a) => !a.startsWith('walk') && a !== 'life' && a !== 'showreel' && a !== 'turn',
  );

const luma = (p: Px, i: number) => 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2];
const median = (v: number[]) => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[s.length >> 1];
};
function ranges(frames: number[]) {
  const out: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    let j = i;
    while (j + 1 < frames.length && frames[j + 1] === frames[j] + 1) j++;
    out.push(i === j ? String(frames[i]) : frames[i] + '–' + frames[j]);
    i = j;
  }
  return out.join(', ');
}
function skipped(cfg: StudioConfig, kind: Finding['kind'], anim: string, frame: number) {
  return (cfg.skip?.[kind] ?? []).some((rule) => {
    const [a, span] = rule.split(':');
    if (a !== anim) return false;
    if (!span) return true;
    const [lo, hi] = span.split('-').map(Number);
    return frame >= lo && frame <= (hi ?? lo);
  });
}

export interface FrameSample {
  n: number;
  mask: BodyMask | null;
  clip: string | null;
  /** The clipping part is a thin rod (whisker, chain, string): reported as a warning. */
  thin: boolean;
  /** A part visible at rest that is (almost) gone from the picture in this frame. */
  gone: string | null;
  contrast: number | null;
  hidden: string | null;
}

let restCache = new WeakMap<Creature, Map<string, ClipBaseline | null>>();
function restPose(p: Painting, anim: string) {
  let m = restCache.get(p.c);
  if (!m) restCache.set(p.c, (m = new Map()));
  if (!m.has(anim)) {
    // The same path as the samples (compose), so frame 0 of an animation is its own baseline exactly.
    const { rig } = captureRig(() => compose(p.c, p.s, p.b, anim, 0));
    m.set(anim, rig ? baselineOf(rig) : null);
  }
  return m.get(anim) ?? null;
}
let viewCache = new WeakMap<Creature, Map<string, ViewBaseline | null>>();
function restView(p: Painting, anim: string) {
  let m = viewCache.get(p.c);
  if (!m) viewCache.set(p.c, (m = new Map()));
  if (!m.has(anim)) {
    const { rig } = captureRig(() => compose(p.c, p.s, p.b, anim, 0));
    m.set(anim, rig ? viewBaseline(rig) : null);
  }
  return m.get(anim) ?? null;
}
function restNames(p: Painting, anim: string) {
  const names = ['idle', anim];
  if (p.c.animations['idle-f2'] && (anim === 'phase' || anim === 'idle-f2' || anim === 'show')) names.push('idle-f2');
  return names;
}
function restBaselines(p: Painting, anim: string) {
  const names = ['idle', anim];
  if (p.c.animations['idle-f2'] && (anim === 'phase' || anim === 'idle-f2' || anim === 'show')) names.push('idle-f2');
  return names.map((a) => restPose(p, a)).filter((b): b is ClipBaseline => !!b);
}

/** Births use field coordinates. Foreground pixels include the frame and camera shake. */
export function coveredByForeground(
  f: Pick<ReturnType<typeof compose>, 'layers' | 'feet' | 'worldFeet'>, at: XY,
): boolean {
  const layer = f.layers.bgf;
  const x = Math.round(at[0] + f.feet[0] - f.worldFeet[0]);
  const y = Math.round(at[1] + f.feet[1] - f.worldFeet[1]);
  let covered = 0, total = 0;
  for (let row = Math.max(0, y - 2); row <= Math.min(layer.h - 1, y + 2); row++) {
    for (let col = Math.max(0, x - 2); col <= Math.min(layer.w - 1, x + 2); col++) {
      total++;
      if (layer.data[4 * (row * layer.w + col) + 3]) covered++;
    }
  }
  return total > 0 && covered / total > 0.5;
}

/** Samples every frame of `anim` once. */
export function sampleAnimation(p: Painting, anim: string, cfg: StudioConfig = {}): FrameSample[] {
  const { c, s, b } = p;
  const spec = c.animations[anim];
  const count = frameCount(spec.seconds);
  const hits = new Set((spec.hits ?? []).map(hitFrame));
  const base = restBaselines(p, anim);
  const views = restNames(p, anim)
    .map((a) => restView(p, a))
    .filter((b): b is ViewBaseline => !!b);
  const out: FrameSample[] = [];
  for (let n = 0; n < count; n++) {
    const { result: f, rig } = captureRig(() => compose(c, s, b, anim, n / 24));
    let mask: BodyMask | null = null;
    try {
      mask = maskOf(f.layers.body, [-f.camera[0], -f.camera[1]]);
    } catch {
      mask = null;
    }
    let clip: string | null = null,
      thin = false;
    if (rig && base.length && !skipped(cfg, 'clip', anim, n)) {
      const w = worstClip(rig, base, cfg.clipAllow);
      if (w) {
        clip = w.capLabel + ' in ' + w.ellLabel + ' @' + w.depth.toFixed(2);
        thin = w.radius < THIN_ROD;
      }
    }
    let gone: string | null = null;
    // Only around a strike: elsewhere parts hide by design (blinks, sleep, the egg in hatch).
    const strikeWindow = [...hits].some((h) => n >= h - 4 && n <= h + 2);
    if (strikeWindow && rig && views.length && !skipped(cfg, 'part-gone', anim, n)) {
      const g = worstGone(rig, views, (tag) => allowsOcclusion(cfg, tag, anim, n));
      if (g) gone = g.tag + ' ' + Math.round(g.rest * 100) + '% → ' + Math.round(g.share * 100) + '% visible, hidden by ' + g.by;
    }
    // Impact readability: effect pixels that stay visible against the floor under them.
    let contrast: number | null = null,
      hidden: string | null = null;
    const nearHit = [...hits].some((h) => n >= h && n <= h + 8);
    if (nearHit) {
      const L = f.layers,
        pic = f.picture;
      const deltas: number[] = [];
      for (let i = 0; i < pic.data.length; i += 4) {
        const fx = Math.max(L.fxu.data[i + 3], L.fxo.data[i + 3]);
        if (fx < 128 || L.bgf.data[i + 3] > 0 || L.body.data[i + 3] > 200) continue;
        deltas.push(Math.abs(luma(pic, i) - luma(L.bg, i)));
      }
      if (deltas.length > 12) contrast = median(deltas);
    }
    if (hits.has(n)) {
      const contacts = c.techniques?.[anim];
      const sockets = contacts && techniqueContacts(contacts)
        .filter((contact) => contact.frame === n)
        .map((contact) => contact.projectile ?? contact.socket);
      // A previous impact may still be painted while a second projectile lands.
      for (const birth of f.techniqueTrace.births) {
        if (sockets?.length && !sockets.includes(birth.socket)) continue;
        if (coveredByForeground(f, birth.at))
          hidden = 'contact at ' + birth.at.map(Math.round).join(',') + ' under a foreground prop';
      }
    }
    out.push({ n, mask, clip, thin, gone, contrast, hidden });
  }
  return out;
}

export const JUMP_MIN = 0.3; // share of the silhouette replaced between two neighbouring frames
export const JUMP_MEDIAN = 5;
export const WEAK_IMPACT = 12;
export const THIN_ROD = 1.5; // rig units // median luma difference of impact pixels against the floor

export function findings(p: Painting, anim: string, samples: FrameSample[], cfg: StudioConfig = {}): Finding[] {
  const spec = p.c.animations[anim];
  const hits = (spec.hits ?? []).map(hitFrame);
  const out: Finding[] = [];
  for (const thin of [false, true]) {
    const hit = samples.filter((s) => s.clip && s.thin === thin && !(thin && skipped(cfg, 'thin-clip', anim, s.n)));
    if (!hit.length) continue;
    const worst = [...hit].sort((a, b) => parseFloat(a.clip!.split('@')[1]) - parseFloat(b.clip!.split('@')[1]))[0];
    const frames = hit.map((s) => s.n);
    out.push({ anim, kind: thin ? 'thin-clip' : 'clip', level: thin ? 'warn' : 'error', frames, note: ranges(frames) + ' — worst ' + worst.n + ': ' + worst.clip });
  }
  const gone = samples.filter((s) => s.gone);
  if (gone.length) {
    const frames = gone.map((s) => s.n);
    out.push({ anim, kind: 'part-gone', level: 'error', frames, note: ranges(frames) + ' — ' + gone[0].n + ': ' + gone[0].gone });
  }
  const d: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].mask,
      b = samples[i].mask;
    d.push(a && b ? 1 - maskIoU(a, b) : 0);
  }
  const typical = median(d.filter((v) => v > 0));
  const limit = Math.max(JUMP_MIN, JUMP_MEDIAN * (typical || 0));
  const strike = (n: number) => hits.some((h) => n >= h - 4 && n <= h + 1);
  const jumps: number[] = [];
  d.forEach((v, i) => {
    const n = i + 1;
    if (v > limit && !strike(n) && !skipped(cfg, 'jump', anim, n)) jumps.push(n);
  });
  const last = samples.length - 1;
  const endPop = !spec.loop && jumps.includes(last);
  if (endPop) out.push({ anim, kind: 'end-pop', level: 'error', frames: [last], note: 'last frame snaps to rest (' + (d[last - 1] * 100).toFixed(0) + '% of silhouette changes)' });
  const mid = jumps.filter((n) => !(endPop && n === last));
  if (mid.length) out.push({ anim, kind: 'jump', level: 'warn', frames: mid, note: ranges(mid) + ' — silhouette change > ' + (limit * 100).toFixed(0) + '% between neighbours' });
  const hidden = samples.filter((s) => s.hidden && !skipped(cfg, 'hidden-contact', anim, s.n));
  if (hidden.length) out.push({ anim, kind: 'hidden-contact', level: 'error', frames: hidden.map((s) => s.n), note: hidden.map((s) => s.n + ': ' + s.hidden).join('; ') });
  for (const h of hits) {
    const window = samples.filter((s) => s.n >= h && s.n <= h + 8 && s.contrast !== null).map((s) => s.contrast!);
    const m = median(window);
    if (window.length && m < WEAK_IMPACT && !skipped(cfg, 'weak-impact', anim, h))
      out.push({ anim, kind: 'weak-impact', level: 'warn', frames: [h], note: 'impact ' + h + '–' + (h + 8) + ' median contrast ' + m.toFixed(1) + ' < ' + WEAK_IMPACT });
  }
  return out;
}

/** Foot sockets: footL, hindR, foreL, legL2… (not helpers such as footFloor). */
export const FOOT_SOCKET = /^(foot|hind|fore|leg)[A-Za-z]*?[LR]\d*$/;
export const SLIDE_PX = 1;
/**
 * A planted foot must not move on the field (it drags or "moonwalks" otherwise). Side walks only: there the
 * lowest screen point of a foot is its ground contact. The accepted pilots slide 0 px; library gaits keep that.
 */
/** Frames where a planted foot moves more than SLIDE_PX, from per-frame socket positions. */
export function slides(pts: Record<string, XY>[], skip: (n: number) => boolean = () => false) {
  const frames = new Set<number>();
  let worst = 0,
    worstName = '';
  for (const k of Object.keys(pts[0] ?? {}).filter((x) => FOOT_SOCKET.test(x))) {
    const tr = pts.map((q) => q[k]);
    if (tr.some((q) => !q)) continue;
    const ground = Math.max(...tr.map((q) => q[1]));
    for (let i = 1; i < tr.length; i++) {
      if (tr[i][1] < ground - 0.5 || tr[i - 1][1] < ground - 0.5) continue;
      const d = Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]);
      if (d <= SLIDE_PX || skip(i)) continue;
      frames.add(i);
      if (d > worst) (worst = d), (worstName = k);
    }
  }
  return { frames: [...frames].sort((a, b) => a - b), worst, worstName };
}

export function footSlide(p: Painting, cfg: StudioConfig = {}, anims = ['walk_e', 'walk_w']): Finding[] {
  const out: Finding[] = [];
  for (const anim of anims) {
    const spec = p.c.animations[anim];
    if (!spec) continue;
    const pts: Record<string, XY>[] = [];
    for (let i = 0; i < frameCount(spec.seconds); i++)
      pts.push((compose(p.c, p.s, p.b, anim, i / 24).points ?? {}) as Record<string, XY>);
    const r = slides(pts, (n) => skipped(cfg, 'foot-slide', anim, n));
    if (r.frames.length)
      out.push({ anim, kind: 'foot-slide', level: 'error', frames: r.frames, note: ranges(r.frames) + ' — planted ' + r.worstName + ' slides ' + r.worst.toFixed(1) + ' px in a frame' });
  }
  return out;
}

export function checkCreature(p: Painting, anims = defaultAnims(p.c), cfg = studioConfig(p.c.id), walks = true) {
  restCache = new WeakMap();
  viewCache = new WeakMap();
  const all: Finding[] = [];
  for (const a of anims) all.push(...findings(p, a, sampleAnimation(p, a, cfg), cfg));
  if (walks) all.push(...footSlide(p, cfg));
  return all;
}
