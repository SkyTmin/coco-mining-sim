// Compile only the pixel primitive, pose clock and actor/FX registries used by the painting.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function section(source, start, end) {
  const a = source.indexOf(start),
    b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw Error('Unexpected native source around ' + start);
  return source.slice(a, b);
}

await build({
  absWorkingDir: root,
  entryPoints: ['index.ts'],
  outfile: '../../viewer/f1-native.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  banner: {
    js: '/*! Rat King · coco-instruments 523bae1 · MIT © 2025–2026 Shamil. Source and license: tools/creatures/katorga/f1/ */',
  },
  plugins: [
    {
      name: 'native-actor-rig',
      setup(b) {
        b.onLoad({ filter: /[/\\]dungeon-art\.ts$/ }, async ({ path: file }) => {
          const src = await readFile(file, 'utf8');
          return {
            contents:
              section(src, 'export const TS', '// Плитки районов.') +
              section(src, 'export function burrowFront', '/** Лампа на грани стены'),
            loader: 'ts',
          };
        });
        b.onLoad({ filter: /[/\\]dungeon-render\.ts$/ }, async ({ path: file }) => {
          const src = await readFile(file, 'utf8');
          const tint = section(src, 'const tinted =', 'let stairsImg:').replace(
            'function tintOf',
            'export function tintOf',
          );
          const methods = section(src, '  private ratAnim(', '  private drawMob(');
          return {
            contents:
              tint +
              'export class PoseClock { time = 0;\n' +
              methods.replace('private mobPose', 'mobPose') +
              '}',
            loader: 'ts',
          };
        });
        b.onLoad({ filter: /[/\\]f1-art\.ts$/ }, async ({ path: file }) => {
          const src = await readFile(file, 'utf8');
          // The following section is the map, props, projectiles and item art, outside this painting.
          const actors = src.slice(
            0,
            src.indexOf('// ---- Прогрев ---', src.indexOf("registerMobPainter('f1_king'")),
          );
          if (!actors.includes("registerMobPainter('f1_king'"))
            throw Error('Missing king registration');
          return {
            contents:
              actors + '\n' + (await readFile(path.join(root, 'pet-extension.ts.inc'), 'utf8')),
            loader: 'ts',
            resolveDir: path.dirname(file),
          };
        });
      },
    },
  ],
});
