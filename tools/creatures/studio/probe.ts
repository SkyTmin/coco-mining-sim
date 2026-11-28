// Numbers for one frame, so a pose can be tuned without looking at a picture: where every socket is on
// the field, where the feet and the body are, how deep limbs sit in the body, what the effects spawned.
import { loadPainting } from '../render';
import { compose, frameCount, hitFrame } from '../engine';
import { maskOf } from '../tech-metrics';
import { captureRig } from './capture';
import { clipPairs } from './clip';

const r1 = (v: number) => Math.round(v * 10) / 10;

export async function probe(id: string, anim: string, frame: number) {
  const { c, s, b } = await loadPainting(id);
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${id} has no animation ${anim}; known: ${Object.keys(c.animations).join(', ')}`);
  const count = frameCount(spec.seconds);
  const { result: f, rig } = captureRig(() => compose(c, s, b, anim, frame / 24));
  const mask = maskOf(f.layers.body, [-f.camera[0], -f.camera[1]]);
  const hits = (spec.hits ?? []).map(hitFrame);
  const lines: string[] = [];
  lines.push(`${id} ${anim} frame ${frame}/${count - 1}${hits.includes(frame) ? ' CONTACT' : ''}  hits ${hits.join(',') || '-'}`);
  lines.push(`feet ${f.feet.map(r1).join(',')}  camera ${f.camera.map(r1).join(',')}  side ${f.motion?.side ?? 0}`);
  const [x0, y0, x1, y1] = mask.bounds;
  lines.push(`body bbox ${x0},${y0}–${x1},${y1} (${x1 - x0 + 1}×${y1 - y0 + 1})  centre ${mask.centre.map(r1).join(',')}  pixels ${mask.pixels.size}`);
  const pts = Object.entries(f.points ?? {}).map(([k, v]) => `${k} ${(v as number[]).map(r1).join(',')}`);
  if (pts.length) lines.push('sockets ' + pts.join('  '));
  const births = f.techniqueTrace?.births ?? [];
  if (births.length) lines.push('effect births ' + births.map((x) => `${x.socket}@${x.at.map(r1).join(',')}`).join('  '));
  const flights = f.techniqueTrace?.projectiles ?? [];
  if (flights.length) lines.push('projectiles ' + flights.map((p) => `${p.id} ${p.at.map(r1).join(',')}`).join('  '));
  if (rig) {
    const deep = clipPairs(rig)
      .filter((p) => p.depth < 0.7)
      .sort((a, z) => a.depth - z.depth)
      .slice(0, 6);
    lines.push(`rig ${rig.prims.length} primitives` + (deep.length ? '; deepest overlaps:' : '; no deep overlaps'));
    for (const p of deep) lines.push(`  ${p.capLabel} (#${p.cap}) in ${p.ellLabel} (#${p.ell}) depth ${p.depth.toFixed(2)}`);
  }
  const used = Object.entries(f.layers)
    .map(([k, p]) => {
      let n = 0;
      for (let i = 3; i < p.data.length; i += 4) if (p.data[i]) n++;
      return n ? `${k} ${n}` : '';
    })
    .filter(Boolean);
  lines.push('layer pixels ' + used.join('  '));
  console.log(lines.join('\n'));
}
