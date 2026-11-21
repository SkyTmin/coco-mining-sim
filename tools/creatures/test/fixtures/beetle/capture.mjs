// Reproduce against a Vite stand built from SkyTmin/coco-instruments at 523bae1.
// CHROMIUM=/usr/bin/chromium PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node capture.mjs
import { writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.STAND_URL || 'http://127.0.0.1:5201';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
try {
  const page = await browser.newPage();
  // Serve a blank document at the stand's origin. No gameplay, accounts or network assets are needed.
  await page.route(base + '/rig-check', route => route.fulfill({ contentType: 'text/html', body: '<title>Rig check</title>' }));
  await page.route('**/f11-mob-beetle.ts*', async route => {
    const module = await route.fetch();
    await route.fulfill({ response: module, body: await module.text() + '\nexport {beetlePic};\n' });
  });
  await page.goto(base + '/rig-check');
  const capture = await page.evaluate(async () => {
    const prefix = '/src/lib/dungeon-floors/';
    const art = await import(prefix + 'f11-mob-beetle.ts');
    const frame = 4, side = 1;
    const painted = art.beetlePic('idle', frame, side);
    return {
      setup: { source: 'SkyTmin/coco-instruments@523bae1', model:'f11_beetle', animation:'idle', frame, side,
        size: [painted.p.w, painted.p.h], anchor:[painted.ax, painted.ay], projectedEye: painted.eye },
      body: Array.from(painted.p.data), lit: Array.from(painted.lit.data)
    };
  });
  const output = name => new URL(name, import.meta.url);
  await writeFile(output('idle.json'), JSON.stringify(capture.setup) + '\n');
  for (const layer of ['body','lit']) {
    const [width,height] = capture.setup.size;
    await writeFile(output(layer + '.png'), PNG.sync.write({ width, height, data: Buffer.from(capture[layer]) }));
  }
} finally {
  await browser.close();
}
