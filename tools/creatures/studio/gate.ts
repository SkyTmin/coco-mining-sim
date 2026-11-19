// The rest of the gate: the detail bar of §7.1в and the technique numbers of §7.1г, compressed to one
// line per creature and one line per failing technique.
import { loadPainting } from '../render';
import { measureDetail, minimumColours } from '../detail';
import { measureCreature, readReferences } from '../tech-metrics';
import { cardRuntimeIssues } from './card';
import { studioConfig } from './checks';
import { measureRef, readPoseRefs, refIssues } from './ref';
import { petGate } from './pet-gate';
import { sizes } from '../types';

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
    const petIssues = petGate(painting, Object.keys(registered));
    for (const issue of petIssues) console.log('  ! ' + id + ' pet: ' + issue);
    if (petIssues.length) failed++;
    for (const [anim, spec] of Object.entries(registered)) {
      const rows = measureRef(painting, anim, spec);
      const errors = refIssues(rows);
      console.log(`${errors.length ? "✗" : "✓"} ${id} ${anim} ref: ${rows.length} keys, min IoU ${Math.min(...rows.map(r => r.iou)).toFixed(3)}`);
      for (const err of errors) console.log('  ! ' + err);
      if (errors.length) failed++;
    }
    const cards = cardRuntimeIssues(c);
    if (cards.length) {
      for (const issue of cards) console.log('  ! ' + id + ' card: ' + issue);
      failed++;
    }
    const [, fieldHeight, canvas] = sizes[c.rarity];
    const rest = c.frame('idle', 0, 0, 'normal');
    const m = measureDetail(rest.px);
    const minPrimitives = studioConfig(id).minPrimitives;
    const extent = Math.max(m.width, m.height);
    const detail: string[] = [];
    if (m.colours < minimumColours[c.rarity]) detail.push(`colours ${m.colours} < ${minimumColours[c.rarity]}`);
    if (m.edge < 0.85) detail.push(`edge ${m.edge.toFixed(2)} < 0.85`);
    if (m.flat > 0.03) detail.push(`flat ${(m.flat * 100).toFixed(1)}% > 3%`);
    if (minPrimitives && rest.primitives < minPrimitives) detail.push(`primitives ${rest.primitives} < ${minPrimitives}`);
    if (extent < canvas * 0.8 || extent > canvas * 0.9) detail.push(`extent ${extent} not in 80–90% of ${canvas}`);
    if (m.height < fieldHeight * 0.55 || m.height > fieldHeight * 0.65)
      detail.push(`height ${m.height} not in 55–65% of field ${fieldHeight}`);
    console.log(
      `${detail.length ? '✗' : '✓'} ${id} detail: ${rest.primitives} primitives, ${m.colours} colours, edge ${m.edge.toFixed(2)}, flat ${(m.flat * 100).toFixed(1)}%` +
        (detail.length ? ' — ' + detail.join('; ') : ''),
    );
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
