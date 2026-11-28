// Still covers for the gallery wall, one sheet for every painting [22.11]: the wall used to play every painting it
// showed and decoded ~1.1 GB of sprite pages on a phone, so Safari closed the tab. Each painting is opened in the
// real viewer (headless Chromium), its first drawn frame is taken from the big canvas, scaled to a cover and packed.
//   node viewer/make-posters.mjs [id…]      all paintings, or only these (the rest keep their old covers)
// Needs Playwright with Chromium (PLAYWRIGHT_PATH=<module> if it is not installed for node).
// Writes viewer/atlases/posters/posters.webp + posters.json ({ file, rects: { id: [x, y, w, h] } }).
// Run after the catalog and the atlases (gallery-catalog.ts, viewer-atlas.py), before publish-gallery.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createRequire } from 'node:module';

const here = import.meta.dirname;
// Playwright is not a dependency of the tools: take it from PLAYWRIGHT_PATH, the project, or the machine (NODE_PATH).
const { chromium } = process.env.PLAYWRIGHT_PATH
  ? await import(process.env.PLAYWRIGHT_PATH)
  : createRequire(import.meta.url)('playwright');
const out = join(here, 'atlases', 'posters');
const HEIGHT = 222, // a cover at about twice its size on a phone wall
  SHEET = 2048;
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain' };

const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(here, path || 'index.html');
  if (!file.startsWith(here) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = 'http://127.0.0.1:' + server.address().port + '/index.html';

const catalog = JSON.parse(readFileSync(join(here, 'catalog.json'), 'utf8'));
const only = process.argv.slice(2);
const old = existsSync(join(out, 'posters.json')) ? JSON.parse(readFileSync(join(out, 'posters.json'), 'utf8')) : null;
const oldSheet = old && existsSync(join(out, old.file)) ? await loadImage(readFileSync(join(out, old.file))) : null;

const browser = await chromium.launch();
const covers = [];
let failed = 0;
for (const entry of catalog) {
  if (only.length && !only.includes(entry.id)) {
    const rect = old?.rects[entry.id];
    if (rect && oldSheet) {
      const c = createCanvas(rect[2], rect[3]);
      c.getContext('2d').drawImage(oldSheet, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3]);
      covers.push({ id: entry.id, image: c });
    }
    continue;
  }
  // A fresh page per painting: the capture itself must not pile up sprite pages.
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  try {
    await page.goto(base);
    // Archive paintings sit in a closed <details>: their buttons exist but are hidden, so click them from the page.
    await page.waitForSelector(`[data-select="${entry.id}"]`, { state: 'attached', timeout: 30000 });
    await page.evaluate((id) => document.querySelector(`[data-select="${id}"]`).click(), entry.id);
    await page.waitForFunction(
      (id) => {
        const hero = document.querySelector('.feature-painting');
        return hero?.dataset.id === id && hero.dataset.clip && hero.getAttribute('aria-busy') === 'false';
      },
      entry.id,
      { timeout: 120000 },
    );
    await page.waitForTimeout(700);
    const url = await page.evaluate(() => document.querySelector('.feature-painting canvas').toDataURL('image/png'));
    const image = await loadImage(Buffer.from(url.split(',')[1], 'base64'));
    // A small painting grows by whole pixels (stays crisp); a large one shrinks smoothly.
    const grow = image.height < HEIGHT,
      scale = grow ? Math.max(1, Math.floor(HEIGHT / image.height)) : HEIGHT / image.height,
      w = Math.max(1, Math.round(image.width * scale)),
      h = Math.max(1, Math.round(image.height * scale));
    const c = createCanvas(w, h);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = !grow;
    g.imageSmoothingQuality = 'high';
    g.drawImage(image, 0, 0, w, h);
    covers.push({ id: entry.id, image: c });
    console.log(`✓ ${entry.id} ${image.width}×${image.height} → ${w}×${h}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${entry.id}: ${error.message.split('\n')[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();
server.close();

// Shelf packing, one row at a time.
const rects = {};
let x = 0,
  y = 0,
  row = 0;
for (const cover of covers) {
  const { width: w, height: h } = cover.image;
  if (x + w > SHEET) {
    x = 0;
    y += row;
    row = 0;
  }
  rects[cover.id] = [x, y, w, h];
  x += w;
  row = Math.max(row, h);
}
const sheet = createCanvas(SHEET, y + row);
const g = sheet.getContext('2d');
for (const cover of covers) {
  const [cx, cy] = rects[cover.id];
  g.drawImage(cover.image, cx, cy);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'posters.webp'), await sheet.encode('webp', 88));
writeFileSync(join(out, 'posters.json'), JSON.stringify({ file: 'posters.webp', rects }) + '\n');
console.log(`${covers.length} covers on a ${SHEET}×${y + row} sheet` + (failed ? `, ${failed} failed` : ''));
if (failed) process.exitCode = 1;
