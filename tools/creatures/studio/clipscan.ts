// ws clip <id> <anim|all> [a-b | a,b,c] [--tag <label>] [--every N]
// The gate's limb-in-body test on every frame of one clip, in seconds, grouped into runs of the same pair, with the
// exact primitives (`-v`). With --tag it also prints the clearance of a moving part (a hoop, a spear, a tail) from the
// big volumes of the body frame by frame, so a path can be laid out with margin before anything clips:
// 1 = touching the surface, below 0.55 = the gate's clip depth. Only frames closer than 1.2 and closer than at rest
// are listed (-v lists all). Unlike the gate it also sees ellipsoid parts (drums, orbs) entering the body.
import { compose, frameCount } from '../engine';
import { loadPainting } from '../render';
import type { V3 } from '../rig/f15-rig';
import { primitivesOf } from '../rig/collision';
import { captureRig } from './capture';
import { restBaselines, skipped, studioConfig, defaultAnims } from './checks';
import { worstClip } from './clip';

type Rig = NonNullable<ReturnType<typeof captureRig>['rig']>;

function framesOf(spec: string | undefined, count: number, every: number) {
  if (!spec) return Array.from({ length: Math.ceil(count / every) }, (_, i) => i * every);
  if (spec.includes('-')) {
    const [a, z] = spec.split('-').map(Number);
    return Array.from({ length: Math.max(0, Math.min(z, count - 1) - a + 1) }, (_, i) => a + i).filter((n) => (n - a) % every === 0);
  }
  return spec.split(',').map(Number).filter((n) => n < count);
}

/** Normalised distance of a point from an ellipsoid centre in that ellipsoid's own frame (1 = on the surface). */
function normDist(p: V3, e: ReturnType<typeof primitivesOf>['ells'][number]) {
  const d = [p[0] - e.c[0], p[1] - e.c[1], p[2] - e.c[2]];
  const n = e.inv.map((row) => row[0] * d[0] + row[1] * d[1] + row[2] * d[2]);
  return Math.hypot(n[0], n[1], n[2]);
}

/** Closest approach of the parts whose label contains `tag` to every clearly bigger ellipsoid of other parts. */
export function clearance(rig: Rig, tag: string): { depth: number; part: string; body: string }[] {
  const { ells, caps } = primitivesOf(rig);
  const mine = (label: string) => label.includes(tag);
  const points: { pts: V3[]; label: string; volume: number }[] = [];
  for (const c of caps)
    if (mine(c.label))
      points.push({
        label: c.label,
        volume: c.r * c.r * (c.len + c.r),
        pts: Array.from({ length: 11 }, (_, k) => [0, 1, 2].map((j) => c.a[j] + ((c.b[j] - c.a[j]) * k) / 10) as V3),
      });
  for (const e of ells)
    if (mine(e.label)) {
      // centre and the six ends of the axes
      const fwd = e.inv; // rows map world → unit sphere; their inverse columns are the semi-axes, approximated below
      const pts: V3[] = [e.c];
      for (let j = 0; j < 3; j++) {
        const r = e.radii[j];
        const axis = fwd[j];
        const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
        for (const s of [-1, 1]) pts.push([0, 1, 2].map((k) => e.c[k] + (s * r * axis[k]) / len) as V3);
      }
      points.push({ label: e.label, volume: e.radii[0] * e.radii[1] * e.radii[2], pts });
    }
  // closest approach per (part label, body label), closest first
  const pairs = new Map<string, { depth: number; part: string; body: string }>();
  for (const q of points)
    for (const e of ells) {
      if (mine(e.label) || e.radii[0] * e.radii[1] * e.radii[2] < 3 * q.volume) continue;
      const depth = Math.min(...q.pts.map((p) => normDist(p, e)));
      const k = q.label + '|' + e.label;
      if (depth < (pairs.get(k)?.depth ?? Infinity)) pairs.set(k, { depth, part: q.label, body: e.label });
    }
  return [...pairs.values()].sort((a, b) => a.depth - b.depth);
}

export async function clipCommand(args: string[]) {
  const flags = new Set(args.filter((a) => a.startsWith('-')));
  const value = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith('-') && !['--tag', '--every'].includes(args[i - 1]));
  const [id, animArg, span] = positional;
  if (!id || !animArg) {
    console.log('usage: npm run ws -- clip <id> <anim|all> [a-b|a,b,c] [--tag label] [--every N] [-v]');
    process.exitCode = 1;
    return;
  }
  const tag = value('--tag');
  const every = Math.max(1, Number(value('--every') ?? 1));
  const p = await loadPainting(id);
  const cfg = studioConfig(id);
  const anims = animArg === 'all' ? defaultAnims(p.c) : animArg.split(',');
  const t0 = Date.now();
  let total = 0;
  for (const anim of anims) {
    const spec = p.c.animations[anim];
    if (!spec) {
      console.log(`? ${anim}: no such animation`);
      continue;
    }
    const bases = restBaselines(p, anim);
    const hits: { n: number; pair: string; depth: number; detail: string }[] = [];
    const frames = framesOf(span, frameCount(spec.seconds), every);
    let tightest: { n: number; depth: number; part: string; body: string } | null = null;
    // A part that already sits this close at rest (a hoop round the waist) is not news: report what comes closer.
    const restClear = new Map<string, number>();
    if (tag)
      for (const a of new Set(['idle', anim])) {
        const r = captureRig(() => compose(p.c, p.s, p.b, a, 0)).rig;
        for (const c of r ? clearance(r, tag) : [])
          restClear.set(c.part + '|' + c.body, Math.min(restClear.get(c.part + '|' + c.body) ?? Infinity, c.depth));
      }
    for (const n of frames) {
      const { rig } = captureRig(() => compose(p.c, p.s, p.b, anim, n / 24));
      if (!rig) continue;
      if (tag) {
        // the closest pair that is nearer than it is at rest
        const near = clearance(rig, tag).map((c) => ({ c, rest: restClear.get(c.part + '|' + c.body) ?? Infinity }));
        const hit = near.find(({ c, rest }) => c.depth < 1.2 && c.depth < rest - 0.1) ?? (flags.has('-v') ? near[0] : undefined);
        if (hit) {
          const { c, rest } = hit;
          const news = c.depth < 1.2 && c.depth < rest - 0.1;
          if (news && (!tightest || c.depth < tightest.depth)) tightest = { n, ...c };
          if (flags.has('-v') || news)
            console.log(`  ${anim} ${String(n).padStart(3)}  ${tag} clearance ${c.depth.toFixed(2)}  (${c.part} → ${c.body}${Number.isFinite(rest) ? ', at rest ' + rest.toFixed(2) : ''})`);
        }
      }
      if (skipped(cfg, 'clip', anim, n)) continue;
      const w = worstClip(rig, bases, cfg.clipAllow);
      if (!w) continue;
      let detail = '';
      if (flags.has('-v')) {
        const { ells, caps } = primitivesOf(rig);
        const cap = caps.find((q) => q.i === w.cap)!,
          e = ells.find((q) => q.i === w.ell)!;
        const f = (v: readonly number[]) => v.map((x) => x.toFixed(1)).join(',');
        detail = `  cap ${f(cap.a)} → ${f(cap.b)} r${cap.r.toFixed(2)}; ell c ${f(e.c)} radii ${f(e.radii)}`;
      }
      hits.push({ n, pair: w.capLabel + ' in ' + w.ellLabel, depth: w.depth, detail });
    }
    total += hits.length;
    if (!hits.length) console.log(`✓ ${anim}: ${frames.length} frames, no clips${tightest ? ` · tightest ${tag} ${tightest.depth.toFixed(2)} at ${tightest.n} (${tightest.part} → ${tightest.body})` : ''}`);
    else {
      console.log(`✗ ${anim}: ${hits.length} of ${frames.length} frames clip`);
      // runs of the same pair over consecutive sampled frames
      for (let i = 0; i < hits.length; i++) {
        let j = i;
        while (j + 1 < hits.length && hits[j + 1].pair === hits[i].pair && hits[j + 1].n - hits[j].n <= every) j++;
        const run = hits.slice(i, j + 1);
        const worst = run.reduce((a, b) => (b.depth < a.depth ? b : a));
        console.log(`  ${run[0].n === run[run.length - 1].n ? run[0].n : run[0].n + '–' + run[run.length - 1].n}: ${worst.pair} @${worst.depth.toFixed(2)} (worst ${worst.n})${worst.detail}`);
        i = j;
      }
      if (tightest) console.log(`  tightest ${tag} ${tightest.depth.toFixed(2)} at ${tightest.n} (${tightest.part} → ${tightest.body})`);
    }
  }
  console.log(`${id}: ${total} clipping frames (${((Date.now() - t0) / 1000).toFixed(1)} s; designed overlaps: c/${id}.studio.json clipAllow)`);
  if (total) process.exitCode = 1;
}
