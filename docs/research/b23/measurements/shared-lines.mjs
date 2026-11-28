// Run in tools/creatures. Count TypeScript lines reachable by static imports from painting entry points.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const local = createRequire(resolve('package.json'));
const { build } = local('esbuild');
const { loadPainting } = await import(pathToFileURL(resolve('render.ts')));
const subjects = readdirSync('golden').filter(file => file.endsWith('.json')).map(file => basename(file, '.json')).sort();
const uses = new Map();
const subjectsToFiles = new Map();
function lines(path) {
  const source = readFileSync(path, 'utf8');
  return source.split(/\r?\n/).length - Number(source.endsWith('\n'));
}
for (const id of subjects) {
  const { c } = await loadPainting(id);
  const border = existsSync('frames/' + id + '.ts') ? id : c.rarity;
  const entries = ['c/' + id + '.ts', 'scenes/' + c.theme + '.ts', 'frames/' + border + '.ts', 'engine.ts'];
  if (existsSync('c/' + id + '-life.ts')) entries.push('c/' + id + '-life.ts');
  const graph = await build({ entryPoints: entries, bundle: true, packages: 'external', platform: 'node',
    write: false, metafile: true, outdir: 'unused', format: 'esm', logLevel: 'silent' });
  const files = Object.keys(graph.metafile.inputs).filter(file => file.endsWith('.ts') && !file.startsWith('vendor/'));
  subjectsToFiles.set(id, files);
  for (const file of files) uses.set(file, (uses.get(file) || 0) + 1);
}
const counts = new Map(Array.from(uses.keys(), file => [file, lines(file)]));
const rows = [];
for (const [id, files] of subjectsToFiles) {
  const shared = files.filter(file => uses.get(file) >= 2).reduce((n, path) => n + counts.get(path), 0);
  const total = files.reduce((n, path) => n + counts.get(path), 0);
  rows.push({id, reachable_files: files.length, reachable_lines: total, shared_lines: shared,
    shared_pct: Number((shared * 100 / total).toFixed(1))});
}
console.log(JSON.stringify({golden_files: subjects.length, rows}, null, 2));
