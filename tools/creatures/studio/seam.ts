// ws seam <id> [anim...] — the pet gate's endpoint numbers in seconds instead of a whole gate, plus the parts that
// moved. Both ends of every one-shot clip are compared with the rest pose they join (idle, idle-f2, sleep) and the
// last 0.7 s of a performer's show with its final frame. Below IoU 0.9 the gate fails; below 0.95 the parts of the rig
// that drifted are listed, which is usually a motion that does not make whole cycles (use kit/clock.ts).
import { loadPainting } from '../render';
import type { Rig, V3 } from '../rig/f15-rig';
import { endpointSeams } from './pet-gate';

type Prim = Record<string, unknown>;
const isV3 = (v: unknown): v is V3 => Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number');

/** A primitive's position: ellipsoid or ball centre, capsule midpoint. */
function centre(q: Prim): V3 | null {
  if (q.k === 1 && isV3(q.a) && isV3(q.b)) return [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, (q.a[2] + q.b[2]) / 2];
  if (isV3(q.c)) return q.c;
  if (isV3(q.p)) return q.p;
  return null;
}

/** Largest drift per tag between two rigs: primitive by primitive when the rigs have the same shape, else centroids. */
export function partShift(a: Rig, b: Rig): { tag: string; shift: number }[] {
  const pa = a.prims as unknown as Prim[],
    pb = b.prims as unknown as Prim[];
  const best = new Map<string, number>();
  const note = (tag: string, d: number) => best.set(tag, Math.max(best.get(tag) ?? 0, d));
  if (pa.length === pb.length && pa.every((q, i) => q.t === pb[i].t)) {
    pa.forEach((q, i) => {
      const x = centre(q),
        y = centre(pb[i]);
      if (x && y) note(String(q.t ?? 'untagged'), Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]));
    });
  } else {
    const sums = (prims: Prim[]) => {
      const m = new Map<string, [number, number, number, number]>();
      for (const q of prims) {
        const c = centre(q);
        if (!c) continue;
        const k = String(q.t ?? 'untagged');
        const s = m.get(k) ?? [0, 0, 0, 0];
        m.set(k, [s[0] + c[0], s[1] + c[1], s[2] + c[2], s[3] + 1]);
      }
      return m;
    };
    const ma = sums(pa),
      mb = sums(pb);
    for (const [k, s] of ma) {
      const o = mb.get(k);
      if (!o) {
        note(k + ' (only here)', Infinity);
        continue;
      }
      note(k, Math.hypot(s[0] / s[3] - o[0] / o[3], s[1] / s[3] - o[1] / o[3], s[2] / s[3] - o[2] / o[3]));
    }
    for (const k of mb.keys()) if (!ma.has(k)) note(k + ' (missing)', Infinity);
  }
  return [...best].map(([tag, shift]) => ({ tag, shift })).sort((x, y) => y.shift - x.shift);
}

export async function seamCommand(args: string[]) {
  const id = args[0];
  if (!id) {
    console.log('usage: npm run ws -- seam <id> [anim...]');
    process.exitCode = 1;
    return;
  }
  const only = args.slice(1).filter((a) => !a.startsWith('--'));
  const t0 = Date.now();
  const painting = await loadPainting(id);
  const { seams, hold } = endpointSeams(painting, only);
  let bad = 0;
  for (const seam of [...seams].sort((x, y) => x.iou - y.iou)) {
    const fail = seam.iou < 0.9 && !seam.birth;
    if (fail) bad++;
    const mark = seam.birth ? '·' : fail ? '✗' : seam.iou < 0.95 ? '~' : '✓';
    let line = `${mark} ${seam.clip.padEnd(16)} frame ${String(seam.frame).padStart(3)} vs ${seam.against.padEnd(7)} IoU ${seam.iou.toFixed(3)}`;
    if (seam.birth) line += '  (birth image, measured against its sheet)';
    else if (seam.iou < 0.95 && seam.rig && seam.againstRig) {
      const [dx, dy] = seam.offset;
      if (Math.hypot(dx, dy) >= 0.5) line += `  body ${dx >= 0 ? '+' : ''}${dx.toFixed(1)},${dy >= 0 ? '+' : ''}${dy.toFixed(1)} px`;
      const moved = partShift(seam.rig, seam.againstRig).filter((p) => p.shift > 0.3).slice(0, 5);
      if (moved.length)
        line += '  moved: ' + moved.map((p) => p.tag + ' ' + (Number.isFinite(p.shift) ? p.shift.toFixed(1) : '∞')).join(', ');
    }
    console.log(line);
  }
  if (hold.length) {
    const worst = hold.reduce((x, y) => (y.iou < x.iou ? y : x));
    const fail = worst.iou < 0.9;
    if (fail) bad++;
    console.log(`${fail ? '✗' : '✓'} show hold (last 0.7 s)   lowest IoU ${worst.iou.toFixed(3)} at frame ${worst.frame}`);
  }
  console.log(`${id}: ${seams.length} endpoints, ${bad} below 0.9 (${((Date.now() - t0) / 1000).toFixed(1)} s; shifts in rig units)`);
  if (bad) process.exitCode = 1;
}
