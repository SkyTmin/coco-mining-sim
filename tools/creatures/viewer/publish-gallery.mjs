// Prepares the gallery for an Artifact publish without hand-made file lists.
//   node viewer/publish-gallery.mjs prepare <pubdir> [--listing <file>]
//   node viewer/publish-gallery.mjs done <pubdir>
// prepare: builds <pubdir> from this folder (the viewer modules, catalog.json, atlases/**) plus the page made for
// the Artifact (artifact/index.html, artifact/gallery.css: no <html> wrapper, fonts, dark theme), copies only what
// changed and writes <pubdir>/.files.json — the `files` map for the publish call (changed and new paths; null for
// paths that are gone). The previous state is <pubdir>/.manifest.json from the last `done`; in a new session pass
// the published listing (Artifact list scope=files, saved as text) with --listing. A version holds at most 511 files.
// done: after the publish succeeded, records the published state for the next prepare.
// Publish with file_path <pubdir>/index.html, root <pubdir>, files = .files.json. Paths you overwrite must have been
// listed or published in the session first.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const here = import.meta.dirname;
const LIMIT = 511;
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}

/** published path → source file */
function desired() {
  const map = new Map();
  for (const name of readdirSync(here))
    // Node scripts of this folder (publishing, covers) are not part of the page.
    if (name.endsWith('.mjs') && !['publish-gallery.mjs', 'make-posters.mjs', 'publish-pages.mjs'].includes(name)) map.set(name, join(here, name));
  map.set('catalog.json', join(here, 'catalog.json'));
  for (const f of walk(join(here, 'atlases'))) map.set(relative(here, f), f);
  map.set('index.html', join(here, 'artifact', 'index.html'));
  map.set('gallery.css', join(here, 'artifact', 'gallery.css'));
  return map;
}

function previous(pub, listing) {
  const manifest = join(pub, '.manifest.json');
  if (existsSync(manifest)) return new Map(Object.entries(JSON.parse(readFileSync(manifest, 'utf8'))));
  if (!listing) {
    console.error('no .manifest.json in ' + pub + ': pass --listing <file> with the published paths (Artifact list scope=files)');
    process.exit(1);
  }
  const text = readFileSync(listing, 'utf8');
  const paths = new Set(text.match(/(?:atlases\/[\w./-]+|[\w-]+\.(?:mjs|json|html|css))/g) ?? []);
  // Unknown content: a path is unchanged only if the local copy in <pubdir> is identical to the source.
  return new Map([...paths].map((p) => [p, existsSync(join(pub, p)) ? sha(join(pub, p)) : '?']));
}

const [cmd, pub, ...rest] = process.argv.slice(2);
if (!pub || !['prepare', 'done'].includes(cmd)) {
  console.log('usage: node viewer/publish-gallery.mjs prepare|done <pubdir> [--listing <file>]');
  process.exit(1);
}
if (cmd === 'done') {
  const next = join(pub, '.manifest.next.json');
  if (!existsSync(next)) {
    console.error('nothing prepared in ' + pub);
    process.exit(1);
  }
  renameSync(next, join(pub, '.manifest.json'));
  console.log('recorded the published state of ' + pub);
  process.exit(0);
}

const li = rest.indexOf('--listing');
const before = previous(pub, li >= 0 ? rest[li + 1] : undefined);
const want = desired();
const files = {};
const state = {};
let changed = 0,
  added = 0,
  removed = 0;
for (const [path, src] of want) {
  const h = sha(src);
  state[path] = h;
  const dst = join(pub, path);
  if (!existsSync(dst) || sha(dst) !== h) {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
  if (before.get(path) === h) continue;
  if (path !== 'index.html') files[path] = path; // the page itself goes as file_path
  before.has(path) ? changed++ : added++;
}
// A whole atlas that this branch does not have (a painting built from its generator and never committed, e.g. the
// ChatGPT stage) stays published; only paths inside atlases this branch owns, and top-level files, are removed.
const kept = new Set();
for (const path of before.keys()) {
  if (want.has(path)) continue;
  const atlas = path.startsWith('atlases/') ? path.split('/')[1] : null;
  if (atlas && !existsSync(join(here, 'atlases', atlas))) {
    kept.add(atlas);
    state[path] = before.get(path);
    continue;
  }
  files[path] = null;
  removed++;
  rmSync(join(pub, path), { force: true });
}
writeFileSync(join(pub, '.files.json'), JSON.stringify(files));
writeFileSync(join(pub, '.manifest.next.json'), JSON.stringify(state));
const total = Object.keys(state).length;
console.log(`${changed} changed, ${added} new, ${removed} removed → ${total} files after publish (limit ${LIMIT})`);
if (kept.size) console.log('kept, not in this branch: ' + [...kept].join(', '));
console.log('files map: ' + join(pub, '.files.json') + ` (${Object.keys(files).length} entries)`);
if (total > LIMIT) {
  console.error(`✗ ${total} files exceed the ${LIMIT}-file limit of one version: drop or repack atlases first`);
  process.exit(1);
}
