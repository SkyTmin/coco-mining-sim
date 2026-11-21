// Playwright plug-in for the original anim-sheet CLI. It exchanges the labelled,
// opaque contact sheet for registered, transparent cells before they are enlarged.
import fs from 'node:fs';
import path from 'node:path';
import { renderRow } from './render-row.mjs';
const { chromium: driver } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = process.env.BOSS_OUT;

function between(text, start, end) {
  const a = text.indexOf(start),
    b = text.indexOf(end, a);
  if (a < 0 || b < 0) throw Error('unsupported anim-sheet renderer: ' + start);
  return text.slice(a, b);
}

export const chromium = {
  async launch(options) {
    const browser = await driver.launch({
      ...options,
      executablePath: process.env.CHROMIUM || options.executablePath,
    });
    return {
      close: () => browser.close(),
      async newContext(options) {
        const ctx = await browser.newContext(options);
        return {
          async newPage() {
            const page = await ctx.newPage();
            // Expose existing simulation clocks and attack starters to this page only.
            // The normal module instance is shared by its brain and its painter.
            const helpers = {
              'dungeon-sim': 'stepShots,stepStrikes,stepZones',
              'dungeon-floors/f15-boss-brains':
                'startPalm,startSweep,startRepel,startWell,startOrbit,startMeteor,stepWells,stepPlanets,toPhase,planQuads,finale',
              'dungeon-floors/f8-brains': 'crescentFan',
            };
            for (const [module, items] of Object.entries(helpers)) {
              await page.route('**/src/lib/' + module + '.ts', async (route) => {
                const upstream = await route.fetch();
                const body = (await upstream.text()).split('//# sourceMappingURL=')[0];
                return route.fulfill({ response: upstream, body: body + '\nexport {' + items + '};' });
              });
            }
            // Avoid booting the Telegram UI. Its modules resolve against the same Vite origin.
            await page.route('**/__boss_gallery__', (route) =>
              route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }),
            );
            return new Proxy(page, {
              get(target, key) {
                if (key === 'goto') return (url) => page.goto(new URL('/__boss_gallery__', url).href);
                if (key === 'evaluate')
                  return async (original, spec) => {
                    const source = original.toString();
                    const renderer = renderRow
                      .toString()
                      .replace('/* MOB_INIT */', between(source, 'const m = {', 'rr.time ='))
                      .replace(
                        '/* DRAW_STRIKE */',
                        between(source, 'const st = row.strike;', 'const fr = f.fr;'),
                      )
                      .replace(
                        '/* DRAW_MOB */',
                        between(source, 'const fr = f.fr;', 'g.imageSmoothingEnabled = false;'),
                      );
                    const inventory = await page.evaluate(async () => {
                      const { FLOORS } = await import('/src/lib/dungeon-floors/index.ts');
                      return FLOORS.flatMap((f, i) =>
                        f.mobs
                          .filter((m) => m.boss)
                          .map((m) => ({ floor: i + 1, id: m.id, name: m.name, brain: m.brain })),
                      );
                    });
                    const who = inventory.find((m) => m.id === spec.kind && m.floor === spec.floor);
                    if (!who || inventory.length !== 27) throw Error('boss inventory changed');
                    const result = { ...who, clips: [] };
                    let preview;
                    for (const row of spec.rows) {
                      const clip = await page
                        .evaluate(
                          '(' +
                            renderer +
                            ')(' +
                            JSON.stringify({
                              spec: { kind: spec.kind, floor: spec.floor, fps: spec.fps },
                              row,
                            }) +
                            ')',
                        )
                        .catch((error) => {
                          throw Error(spec.kind + '/' + row.id + ' ' + error.message);
                        });
                      const dir = path.join(root, spec.kind, row.id);
                      fs.mkdirSync(dir, { recursive: true });
                      const frames = clip.frames.map((data, i) => {
                        const name = path.join(spec.kind, row.id, String(i).padStart(3, '0') + '.png');
                        fs.writeFileSync(
                          path.join(root, name),
                          Buffer.from(data.split(',')[1], 'base64'),
                        );
                        preview ??= data;
                        return name;
                      });
                      result.clips.push({ ...clip, frames, id: row.id, name: row.label, fps: spec.fps });
                    }
                    const manifest = path.join(root, spec.kind, 'manifest.json');
                    fs.writeFileSync(manifest + '.tmp', JSON.stringify(result, null, 2));
                    fs.renameSync(manifest + '.tmp', manifest);
                    console.log(result.name, result.clips.length);
                    return preview;
                  };
                const prop = Reflect.get(target, key, target);
                return typeof prop === 'function' ? prop.bind(target) : prop;
              },
            });
          },
        };
      },
    };
  },
};
