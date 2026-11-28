// Run in tools/creatures: node --import tsx /path/to/trace-frame.mjs ID ANIMATION FRAME.
import { Session } from 'node:inspector/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const [id, animation, frameText] = process.argv.slice(2);
const frame = Number(frameText);
if (!id || !animation || !Number.isInteger(frame) || frame < 0) throw Error('Expected ID, animation, nonnegative frame');
const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
const { loadPainting } = await import(pathToFileURL(resolve('render.ts')));
const { compose } = await import(pathToFileURL(resolve('engine.ts')));
const { c, s, b } = await loadPainting(id);
const { picture } = compose(c, s, b, animation, frame / 24, 0, 'normal');
const { result } = await session.post('Profiler.takePreciseCoverage');
await session.post('Profiler.stopPreciseCoverage');
session.disconnect();

const modules = [];
for (const script of result) {
  if (!script.url.startsWith('file:')) continue;
  const filename = relative(process.cwd(), fileURLToPath(script.url));
  if (!/\.(ts|mjs)$/.test(filename) || filename.startsWith('..') || filename.startsWith('node_modules/')) continue;
  const called = script.functions.filter(f => f.functionName && f.ranges[0].count > 0);
  const names = [...new Set(called.map(f => f.functionName))].sort();
  const zero = script.functions.filter(f => f.functionName && f.ranges[0].count === 0);
  modules.push({ filename, called: names, zero_named_ranges: zero.length });
}
modules.sort((a,b) => a.filename.localeCompare(b.filename,'en'));
console.log(JSON.stringify({ id, animation, frame, node: process.version,
  tree: execFileSync('git', ['rev-parse', 'HEAD:tools/creatures'], {encoding: 'utf8'}).trim(),
  rgba_sha256: createHash('sha256').update(picture.data).digest('hex'),
  width: picture.w, height: picture.h, modules }, null, 2));
