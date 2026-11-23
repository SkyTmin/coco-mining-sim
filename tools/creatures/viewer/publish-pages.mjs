// node viewer/publish-pages.mjs [--push] [-m "message"] — the gallery site on GitHub Pages in one command.
// The `gh-pages` branch holds only the site: viewer/index.html, gallery.css, catalog.json, the viewer modules, atlases/**
// and an empty .nojekyll. The script checks the branch out into a temporary worktree, replaces those files with fresh
// ones from tools/creatures/viewer (an atlas folder is deleted and copied whole, so a stale page never survives; a folder
// that exists only on gh-pages, such as an atlas never committed here, stays), compares every copied file byte for byte,
// commits and, with --push, pushes. Without --push it stops after the commit and prints what changed, and the worktree
// is removed either way (an unpushed commit is lost with it, which is the point of a dry run).
// Replaces the manual worktree + rm -rf + cp -r + diff -rq of 23.11 (the cloud container has no rsync; once only the
// catalog went out, without the atlas).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const viewer = import.meta.dirname;
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: viewer, encoding: 'utf8' }).trim();
const args = process.argv.slice(2);
const push = args.includes('--push');
const mi = args.indexOf('-m');
const message = mi >= 0 ? args[mi + 1] : 'Галерея: обновление сайта';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const NOT_SITE = new Set(['publish-gallery.mjs', 'make-posters.mjs', 'publish-pages.mjs']);
const siteFiles = [
  'index.html',
  'gallery.css',
  'catalog.json',
  ...readdirSync(viewer).filter((f) => f.endsWith('.mjs') && !NOT_SITE.has(f)),
];
const atlasRoot = join(viewer, 'atlases');
const atlases = readdirSync(atlasRoot).filter((d) => statSync(join(atlasRoot, d)).isDirectory());

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) files(f, out);
    else out.push(f);
  }
  return out;
}

git(repo, 'fetch', '-q', 'origin', 'gh-pages');
const wt = mkdtempSync(join(tmpdir(), 'gh-pages-'));
git(repo, 'worktree', 'add', '-q', '--detach', wt, 'origin/gh-pages');
let code = 0;
try {
  for (const f of siteFiles) cpSync(join(viewer, f), join(wt, f));
  for (const d of atlases) {
    rmSync(join(wt, 'atlases', d), { recursive: true, force: true });
    cpSync(join(atlasRoot, d), join(wt, 'atlases', d), { recursive: true });
  }
  if (!existsSync(join(wt, '.nojekyll'))) writeFileSync(join(wt, '.nojekyll'), '');
  // every copied byte equal, every atlas folder with the same file list
  let bad = 0;
  for (const f of siteFiles) if (!readFileSync(join(viewer, f)).equals(readFileSync(join(wt, f)))) (bad++, console.log(`! differs: ${f}`));
  for (const d of atlases) {
    const here = files(join(atlasRoot, d)).map((f) => relative(atlasRoot, f)).sort();
    const there = files(join(wt, 'atlases', d)).map((f) => relative(join(wt, 'atlases'), f)).sort();
    if (here.join('\n') !== there.join('\n')) (bad++, console.log(`! file list differs: atlases/${d}`));
    for (const f of here) if (!readFileSync(join(atlasRoot, f)).equals(readFileSync(join(wt, 'atlases', f)))) (bad++, console.log(`! differs: atlases/${f}`));
  }
  if (bad) throw new Error(`${bad} files differ after the copy; nothing committed`);
  const kept = readdirSync(join(wt, 'atlases')).filter((d) => !atlases.includes(d));
  git(wt, 'add', '-A');
  const changed = git(wt, 'diff', '--cached', '--name-status');
  if (!changed) console.log('gh-pages is already up to date: nothing to publish');
  else {
    const lines = changed.split('\n');
    const byDir = {};
    for (const l of lines) {
      const path = l.split('\t').pop();
      const key = path.startsWith('atlases/') ? path.split('/').slice(0, 2).join('/') + '/' : path;
      byDir[key] = (byDir[key] ?? 0) + 1;
    }
    console.log(`${lines.length} files changed: ` + Object.entries(byDir).map(([k, n]) => (n > 1 ? `${k} ${n}` : k)).join(', '));
    // the message is the caller's, attribution lines included (-m may hold several lines)
    git(wt, 'commit', '-q', '-m', message);
    if (push) {
      git(wt, 'push', '-q', 'origin', 'HEAD:gh-pages');
      console.log(`pushed ${git(wt, 'rev-parse', '--short', 'HEAD')} to gh-pages — https://skytmin.github.io/coco-mining-sim/ (Pages rebuilds in about a minute)`);
    } else console.log('dry run: committed in the temporary worktree only; run again with --push to publish');
  }
  if (kept.length) console.log(`kept on gh-pages only: ${kept.join(', ')}`);
} catch (e) {
  console.error(String(e.message ?? e));
  code = 1;
} finally {
  git(repo, 'worktree', 'remove', '--force', wt);
}
process.exitCode = code;
