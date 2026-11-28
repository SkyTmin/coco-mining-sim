// The failing paintings in the last gate before B22, job 141010703342 (27 of 41 passed).
// Only the new rules have this compatibility policy. The original gate still reports its errors.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { SourceMap } from 'node:module';
import { transformSync } from 'esbuild';

export const legacyFxWarnings = new Set([
  'astral_seer', 'ball_pangolin', 'bun_panda', 'coin_dragon', 'crater_titan', 'dream_sneak',
  'eclipse_drake', 'ember_panda', 'kettle_crab', 'moon_magician', 'prism_serpent', 'puff_kit',
  'storm_lord', 'tuft_owlet',
]);

const scopes = ['c', 'fx', 'scenes', 'bodies', 'kit'];
const tools = join(import.meta.dirname, '..');
export function fxSourceFiles(root = tools) {
  function collect(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? collect(path) : /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
    });
  }
  return scopes.flatMap(dir => collect(join(root, dir))).sort();
}

const banned = ['Math.random', 'Date', 'performance.now'];
/** Let the existing TS parser distinguish global references from comments, strings, type names and local bindings. */
export function nondeterminism(source: string, path: string) {
  if (!/\b(?:random|Date|now)\b/.test(source)) return [];
  const define: Record<string, string> = {};
  banned.forEach((name, i) => {
    define[name] = define['globalThis.' + name] = '__WS_UNSEEDED_' + i + '__';
  });
  const { code, map } = transformSync(source, { loader: path.endsWith('x') ? 'tsx' : 'ts',
    sourcefile: path, sourcemap: 'external', define, treeShaking: false, logLevel: 'silent' });
  const locations = new SourceMap(JSON.parse(map));
  return code.split('\n').flatMap((line, n) => [...line.matchAll(/\b__WS_UNSEEDED_(\d)__\b/g)].map(hit => {
    const entry = locations.findEntry(n, hit.index!);
    return { name: banned[Number(hit[1])], line: 'originalLine' in entry ? entry.originalLine + 1 : n + 1 };
  }));
}

/** Keep a bug in another creature's private file with its owner. Shared code is checked for every painting. */
export function fxSourceIssues(id: string, ids: string[], imported?: () => ReadonlySet<string>, root = tools) {
  let inputs: ReadonlySet<string> | undefined;
  return fxSourceFiles(root).flatMap(file => {
    const path = relative(root, file).split(sep).join('/');
    const issues = nondeterminism(readFileSync(file, 'utf8'), path);
    if (!issues.length) return [];
    if (path.startsWith('c/')) {
      const name = path.slice(2);
      const other = ids.find(owner => name === owner + '.ts' || name.startsWith(owner + '-'));
      if (other && other !== id) {
        inputs ??= imported?.() ?? new Set();
        if (!inputs.has(file)) return [];
      }
    }
    return issues.map(issue => path + ':' + issue.line + ' uses ' + issue.name);
  });
}
