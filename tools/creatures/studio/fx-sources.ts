// Paintings accepted before B22 (golden/ at commit 2290aea3), except Polyusik, which B22 checked strictly.
// The owner already accepted them, so the new B22 rules only warn on them. New paintings get errors.
// The original gate still reports its own errors.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { SourceMap } from 'node:module';
import { transformSync } from 'esbuild';

export const legacyFxWarnings = new Set([
  'apricot_bubbler', 'astral_seer', 'ball_pangolin', 'bell_magpie', 'bramble_warden', 'bun_panda', 'coin_dragon',
  'crater_titan', 'dream_sneak', 'eclipse_drake', 'ember_panda', 'frost_fox', 'frost_yeti', 'garden_chameleon',
  'gem_beetle', 'grove_lord', 'herald_griffin', 'ink_admiral', 'kettle_crab', 'lunar_plush', 'meadow_colossus',
  'moon_magician', 'moon_warden', 'nebula_squid', 'opal_skater', 'penguin_marshal', 'prism_serpent', 'puff_kit',
  'rat_king', 'river_otter', 'root_stag', 'sand_scorpion', 'silk_dragon', 'sky_whale', 'storm_lord', 'storm_ram',
  'threshold_keeper', 'toad_shaman', 'tuft_owlet', 'zephyr_whorl',
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
