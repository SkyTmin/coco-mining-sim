// ws profile <id> <anim> — where the render of one clip spends its time [research 23.11, VIII.10 stage 5, VIII.11].
// Renders the clip into a scratch folder (the real assets stay untouched) under the V8 sampling profiler and sums the
// self time by pipeline stage: gif (render-io + gifenc), png (zlib, pngjs), rig (rig/, kit/, bodies/), compose
// (engine), skin (c/), fx, scene (scenes/, frames/), gc, io (writes, opens) and the rest. The materials (scene loop
// and frame) are written first, outside the profile, as `ws render` does once per creature. Choose an optimization
// by this table on more than one creature; a pure optimization must keep the pictures (snap --check) and the bytes.
import { Session } from 'node:inspector/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { render } from '../render';
import { rigStats, resetRigStats } from '../rig/stats';

interface Node {
  id: number;
  callFrame: { functionName: string; url: string };
}
function stage(url: string, fn: string) {
  const file = basename(url);
  if (fn === '(garbage collector)' || fn === 'custom_gc') return 'gc';
  if (file === 'render-io.ts' || url.includes('gifenc')) return 'gif';
  if (url.includes('zlib') || url.includes('pngjs')) return 'png';
  if (!url && /^(writeSync|open|close|mkdir|rename|unlink|stat)/.test(fn)) return 'io';
  if (file.endsWith('-fx.ts') || url.includes('/fx/') || file === 'technique-fx.ts') return 'fx';
  if (url.includes('/scenes/') || url.includes('/frames/') || file === 'frame-kit.ts') return 'scene';
  if (file === 'engine.ts') return 'compose';
  if (url.includes('/rig/') || url.includes('/kit/') || url.includes('/bodies/')) return 'rig';
  if (url.includes('/c/')) return 'skin';
  return 'other';
}

export async function profileCommand(args: string[]) {
  const [id, anim] = args.filter((a) => !a.startsWith('--'));
  if (!id || !anim) {
    console.log('usage: npm run ws -- profile <id> <anim>');
    process.exitCode = 1;
    return;
  }
  const root = mkdtempSync(join(tmpdir(), 'ws-profile-'));
  try {
    await render(id, 'idle', 3, root);
    const session = new Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.start');
    resetRigStats();
    const t0 = performance.now();
    await render(id, anim, 3, root);
    const sec = (performance.now() - t0) / 1000;
    const { profile } = (await session.post('Profiler.stop')) as { profile: { nodes: Node[]; samples: number[]; timeDeltas: number[] } };
    session.disconnect();
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const stages = new Map<string, number>(),
      functions = new Map<string, number>();
    let total = 0;
    profile.samples.forEach((s, i) => {
      const dt = profile.timeDeltas[i] ?? 0,
        cf = byId.get(s)!.callFrame;
      total += dt;
      const k = stage(cf.url, cf.functionName);
      stages.set(k, (stages.get(k) ?? 0) + dt);
      const f = `${cf.functionName || '(anonymous)'} ${basename(cf.url) || 'native'}`;
      functions.set(f, (functions.get(f) ?? 0) + dt);
    });
    const pct = (v: number) => `${((100 * v) / total).toFixed(0)}%`;
    const top = (m: Map<string, number>, n: number) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
    console.log(`${id} ${anim}: ${sec.toFixed(1)} s · composes ${rigStats.compose} (history ${rigStats.history}), rasters ${rigStats.raster} (wasted ${rigStats.wasted})`);
    console.log('  stages: ' + top(stages, 12).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
    console.log('  functions: ' + top(functions, 8).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
