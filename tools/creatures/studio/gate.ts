// The rest of the gate: the detail bar of §7.1в and the technique numbers of §7.1г, compressed to one
// line per creature and one line per failing technique.
import { loadPainting } from '../render';
import { measureDetail, minimumColours } from '../detail';
import { measureCreature, readReferences } from '../tech-metrics';
import { cardRuntimeIssues } from './card';
import { studioConfig } from './checks';
import { measureRef, readPoseRefs, refIssues } from './ref';
import { petGate } from './pet-gate';
import { sizeOf } from '../types';
import { compose, frameCount } from '../engine';

export async function gateExtras(ids: string[]) {
  let failed = 0;
  let refs: ReturnType<typeof readReferences> = {};
  try {
    refs = readReferences();
  } catch {
    console.log('  · technique references missing — technique numbers use the temporary limits');
  }
  for (const id of ids) {
    const painting = await loadPainting(id);
    const { c } = painting;
    const registered = readPoseRefs(id);
    const config = studioConfig(id);
    const keys = config.keyframes ?? {};
    const petIssues = petGate(painting, [...Object.keys(registered), ...Object.keys(keys)],
      [...(registered.hatch?.frames ?? []), ...(keys.hatch ?? []).map(key => key.frame)]);
    for (const issue of petIssues) console.log('  ! ' + id + ' pet: ' + issue);
    if (petIssues.length) failed++;
    for (const [anim, spec] of Object.entries(registered)) {
      const rows = measureRef(painting, anim, spec);
      const errors = refIssues(rows);
      console.log(`${errors.length ? "✗" : "✓"} ${id} ${anim} ref: ${rows.length} keys, min IoU ${Math.min(...rows.map(r => r.iou)).toFixed(3)}`);
      for (const err of errors) console.log('  ! ' + err);
      if (errors.length) failed++;
    }
    for (const [anim, poses] of Object.entries(keys)) {
      const clip = c.animations[anim];
      const count = clip ? frameCount(clip.seconds) : 0;
      const errors: string[] = [];
      if (!poses.length) errors.push('missing pose targets');
      for (const pose of poses) {
        if (!Number.isInteger(pose.frame) || pose.frame < 0 || pose.frame >= count) {
          errors.push('invalid frame ' + pose.frame);
          continue;
        }
        const frame = compose(c, painting.s, painting.b, anim, pose.frame / 24);
        const targets = Object.entries(pose.points);
        if (!targets.length) errors.push('frame ' + pose.frame + ' has no landmarks');
        for (const [name, [x, y, radius]] of targets) {
          const point = frame.points[name];
          if (!point || ![x,y,radius].every(Number.isFinite) || radius <= 0 ||
              Math.hypot(point[0] - x, point[1] - y) > radius)
            errors.push('frame ' + pose.frame + ' missed ' + name + ' at ' + x + ',' + y);
        }
      }
      console.log(`${errors.length ? '✗' : '✓'} ${id} ${anim} landmarks: ${poses.length} keys`);
      for (const err of errors) console.log('  ! ' + err);
      if (errors.length) failed++;
    }
    const cards = cardRuntimeIssues(c);
    if (cards.length) {
      for (const issue of cards) console.log('  ! ' + id + ' card: ' + issue);
      failed++;
    }
    const { line, issues: detail } = detailBar(painting, config);
    console.log(line);
    if (detail.length) failed++;
    if (!c.techniques) continue;
    const row = await measureCreature(id, refs);
    const bad = row.techniques.filter((t: { issues: string[] }) => t.issues.length);
    console.log(`${bad.length ? '✗' : '✓'} ${id} techniques: ${row.techniques.length - bad.length}/${row.techniques.length} pass §7.1г`);
    for (const t of bad as { anim: string; issues: string[] }[]) console.log(`  ! ${t.anim.padEnd(14)} ${t.issues.slice(0, 4).join('; ')}`);
    const close = row.pairs.filter((p: { iou: number }) => p.iou > 0.7);
    for (const p of close as { a: string; b: string; iou: number }[])
      console.log(`  ! ${p.a} and ${p.b} hit with the same silhouette (IoU ${p.iou.toFixed(2)} > 0.70)`);
    if (bad.length || close.length) failed++;
  }
  return failed;
}

/** The detail bar of §7.1в on the rest frame: one line, and the failed items. Cheap (one frame): run it on the first
 * still, before the clips (`ws detail <id>`), not only in the final gate. */
export function detailBar(painting: Awaited<ReturnType<typeof loadPainting>>, config = studioConfig(painting.c.id)) {
  const { c } = painting;
  const id = c.id;
  const [, fieldHeight, canvas] = sizeOf(c);
  const rest = c.frame('idle', 0, 0, 'normal');
  const m = measureDetail(rest.px);
  const secretTricks = c.rarity === 'secret' && c.behavior?.tricks;
  const minPrimitives = Math.max(config.minPrimitives ?? 0, secretTricks ? 900 : 0);
  const extent = Math.max(m.width, m.height);
  const detail: string[] = [];
  if (m.colours < minimumColours[c.rarity]) detail.push(`colours ${m.colours} < ${minimumColours[c.rarity]}`);
  if (m.edge < 0.85) detail.push(`edge ${m.edge.toFixed(2)} < 0.85`);
  if (m.flat > 0.03) detail.push(`flat ${(m.flat * 100).toFixed(1)}% > 3%`);
  if (minPrimitives && rest.primitives < minPrimitives) detail.push(`primitives ${rest.primitives} < ${minPrimitives}`);
  if (extent < canvas * 0.8 || extent > canvas * 0.9) detail.push(`extent ${extent} not in 80–90% of ${canvas}`);
  if (m.height < fieldHeight * 0.55 || m.height > fieldHeight * 0.65)
    detail.push(`height ${m.height} not in 55–65% of field ${fieldHeight}`);
  if (extent < canvas * 0.8 || extent > canvas * 0.9 || m.height < fieldHeight * 0.55 || m.height > fieldHeight * 0.65) {
    // Both sizes scale with the figure: name the factor instead of leaving the author to guess [Раскат 21.11: 3.1 → 2.78].
    const lo = Math.max((canvas * 0.8) / extent, (fieldHeight * 0.55) / m.height),
      hi = Math.min((canvas * 0.9) / extent, (fieldHeight * 0.65) / m.height);
    detail.push(lo <= hi
      ? `scale the figure ×${((lo + hi) / 2).toFixed(3)} (any of ×${lo.toFixed(3)}–×${hi.toFixed(3)})`
      : `no single scale fits both: the silhouette is too ${extent / canvas > m.height / fieldHeight ? 'wide' : 'tall'} for the frame`);
  }
  const line =
    `${detail.length ? '✗' : '✓'} ${id} detail: ${rest.primitives} primitives, ${m.colours} colours, edge ${m.edge.toFixed(2)}, flat ${(m.flat * 100).toFixed(1)}%` +
      (detail.length ? ' — ' + detail.join('; ') : '');
  return { line, issues: detail };
}
