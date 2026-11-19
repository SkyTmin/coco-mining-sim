import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import type { XY } from '../types';
import { cellBox, gridOf } from './art-sheet';

const magenta = 0xff00ff;
const rgbAt = (data: Buffer, i: number) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
const channels = (c: number) => [c >> 16, (c >> 8) & 255, c & 255] as const;
const steps = [-1, 0, 1];
const cardinal = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function referencePalette(png: PNG) {
  const colors = new Set<number>();
  for (let i = 0; i < png.data.length; i += 4) {
    const color = rgbAt(png.data, i);
    if (png.data[i + 3] === 255 && color !== magenta) colors.add(color);
  }
  if (!colors.size) throw new Error('reference PNG has no opaque creature colors');
  const samples = [...colors].map(channels);
  const known = new Map<number, boolean>();
  function familiar(color: number) {
    if (colors.has(color)) return true;
    if (known.has(color)) return known.get(color)!;
    const [r, g, b] = channels(color);
    // RMS RGB difference ≤16, with a per-channel cap to reject a shifted accent.
    const found = samples.some(([rr, gg, bb]) => {
      const dr = Math.abs(r - rr), dg = Math.abs(g - gg), db = Math.abs(b - bb);
      return Math.max(dr, dg, db) <= 24 && dr * dr + dg * dg + db * db <= 3 * 16 * 16;
    });
    known.set(color, found);
    return found;
  }
  return { colors, familiar };
}

// A darkened key represents a cast shadow on the background. Exempt literal colors
// from the actor's palette so a genuinely purple creature can pass this check.
function tintedKey(color: number) {
  const [r, g, b] = channels(color);
  return (r >= 220 && b >= 220 && g <= 35) ||
    (r >= 40 && b >= 40 && g <= 8 && Math.abs(r - b) <= 8);
}

function mixture(edge: number, inside: number) {
  if (edge === inside) return false;
  const [r, g, b] = channels(edge), [sr, sg, sb] = channels(inside);
  // Project the edge color onto the line joining magenta and its local paint color.
  const x = sr - 255, y = sg, z = sb - 255;
  const norm = x * x + y * y + z * z;
  if (!norm) return false;
  const t = ((r - 255) * x + g * y + (b - 255) * z) / norm;
  if (t < 0.04 || t > 0.94) return false;
  const dr = r - (255 + t * x), dg = g - t * y, db = b - (255 + t * z);
  return dr * dr + dg * dg + db * db <= 36;
}

// Pixels sharing a corner belong to the same sprite, as in a one-pixel diagonal limb.
function components(mask: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(mask.length);
  const islands: number[][] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const piece = [start];
    seen[start] = 1;
    for (let head = 0; head < piece.length; head++) {
      const pos = piece[head], x = pos % w, y = Math.floor(pos / w);
      for (const dy of steps) for (const dx of steps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !seen[j]) { seen[j] = 1; piece.push(j); }
      }
    }
    islands.push(piece);
  }
  return islands.sort((a, b) => b.length - a.length);
}

type Palette = ReturnType<typeof referencePalette>;
function inspectCell(png: PNG, grid: XY, index: number, palette?: Palette) {
  const { x: left, y: top, w, h } = cellBox(png, grid, index);
  const colors = new Uint32Array(w * h), mask = new Uint8Array(w * h), tinted = new Uint8Array(w * h);
  let pure = 0, translucent = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = y * w + x, src = ((top + y) * png.width + left + x) * 4;
    const color = colors[j] = rgbAt(png.data, src);
    if (png.data[src + 3] !== 255) { translucent++; continue; }
    if (color === magenta) { pure++; continue; }
    if (tintedKey(color) && !palette?.colors.has(color)) tinted[j] = 1;
    else mask[j] = 1;
  }
  const [body = [], ...spots] = components(mask, w, h);
  const issues: string[] = [];
  if (body.length <= 12) issues.push('silhouette: missing substantial silhouette');
  const extraSizes = spots.map(piece => piece.length);
  if (extraSizes.some(size => size > 12)) issues.push('spot: detached component >12 px (' + extraSizes.filter(size => size > 12).join(', ') + ')');
  const main = new Uint8Array(w * h);
  for (const pos of body) main[pos] = 1;
  const at = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && !!main[y * w + x];
  let x0 = w, y0 = h, x1 = 0, y1 = 0, perimeter = 0, foreign = 0, dirty = 0;
  const fringePixels = new Set<number>();
  for (const pos of body) {
    const x = pos % w, y = Math.floor(pos / w), color = colors[pos];
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
    if (palette && !palette.familiar(color)) foreign++;
    if (!cardinal.some(([dx, dy]) => !at(x + dx, y + dy))) continue;
    perimeter++;
    if (palette?.colors.has(color)) continue;
    let mixed = false;
    for (const dy of steps) for (const dx of steps) {
      if (mixed || (!dx && !dy)) continue;
      for (let d = 1; d <= 4 && at(x + d * dx, y + d * dy); d++) {
        if (mixture(color, colors[(y + dy * d) * w + x + dx * d])) { mixed = true; break; }
      }
    }
    if (mixed) fringePixels.add(pos);
  }
  // A one-pixel key tint against the contour is fringe. Tints extending into
  // empty space are background contamination regardless of the silhouette size.
  for (let j = 0; j < tinted.length; j++) {
    if (!tinted[j]) continue;
    const x = j % w, y = Math.floor(j / w);
    const neighbor = cardinal.find(([dx, dy]) => at(x + dx, y + dy));
    if (neighbor) fringePixels.add((y + neighbor[1]) * w + x + neighbor[0]);
    else dirty++;
  }
  if (!pure || dirty || translucent) issues.push(`background: ${pure} exact #FF00FF, ${dirty} tinted, ${translucent} nonopaque pixels`);
  const fringeRatio = perimeter ? fringePixels.size / perimeter : 0;
  if (fringeRatio > 0.02) issues.push(`fringe: ${(100 * fringeRatio).toFixed(2)}% of contour (max 2%)`);
  const foreignRatio = foreign / (body.length || 1);
  if (foreignRatio > 0.05) issues.push(`palette: ${(100 * foreignRatio).toFixed(2)}% foreign (max 5%)`);
  const margin = body.length ? Math.min(x0 / w, y0 / h, (w - x1) / w, (h - y1) / h) : 0;
  if (body.length && margin < 0.04) issues.push(`margin: ${(100 * margin).toFixed(2)}% (min 4%)`);
  const outside = pure + dirty + translucent + spots.reduce((n, piece) => n + piece.length, 0);
  return { cell: index + 1, bounds: body.length ? [x0, y0, x1, y1] : null, bodyPixels: body.length, extraSizes,
    height: body.length ? (y1 - y0) / h : 0, feet: body.length ? y1 / h : 0, margin,
    exactBackground: outside ? pure / outside : 0, dirtyBackgroundPixels: dirty, translucentPixels: translucent,
    fringeRatio, foreignRatio: palette ? foreignRatio : null, issues };
}

/** `air` cells skip height and the feet line; `low` cells (crouch, lying, bow) skip only height: the feet stay on the line. */
export function lintSheet(png: PNG, grid: XY, air: number[] = [], ref?: PNG, low: number[] = []) {
  const count = grid[0] * grid[1];
  const bad = (list: number[]) => list.some(n => !Number.isInteger(n) || n < 1 || n > count) || new Set(list).size !== list.length;
  if (bad(air)) throw new Error('--air needs unique one-based cell numbers');
  if (bad(low) || low.some(n => air.includes(n))) throw new Error('--low needs unique one-based cell numbers not listed in --air');
  const palette = ref ? referencePalette(ref) : undefined;
  const cells = Array.from({ length: count }, (_, i) => inspectCell(png, grid, i, palette));
  const grounded = cells.filter(cell => !air.includes(cell.cell) && cell.bodyPixels > 12);
  const standing = grounded.find(cell => !low.includes(cell.cell)) ?? grounded[0];
  for (const cell of grounded) {
    if (cell === standing) continue;
    for (const metric of low.includes(cell.cell) ? ['feet'] as const : ['height', 'feet'] as const) {
      const delta = (cell[metric] - standing[metric]) / standing[metric];
      if (Math.abs(delta) > 0.12 + 1e-12) cell.issues.push(`${metric}: ${(100 * delta).toFixed(1)}% from grounded cell ${standing.cell} (max ±12%)`);
    }
  }
  return { ok: cells.every(cell => cell.issues.length === 0), grid, air, low, standingCell: standing?.cell ?? null, cells };
}

export function lintCommand(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    grid: { type: 'string' }, air: { type: 'string' }, low: { type: 'string' }, ref: { type: 'string' }, json: { type: 'boolean' },
  } });
  if (positionals.length !== 1) throw new Error('expected one PNG path');
  const input = positionals[0], png = PNG.sync.read(readFileSync(input));
  const cellsOf = (list?: string) => list === undefined ? [] : list.split(',').map(Number);
  const air = cellsOf(values.air), low = cellsOf(values.low);
  const result = lintSheet(png, gridOf(values.grid, png), air, values.ref ? PNG.sync.read(readFileSync(values.ref)) : undefined, low);
  if (values.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.ok ? '✓' : '✗'} ${input}: ${result.cells.length} cells`);
    for (const cell of result.cells) for (const issue of cell.issues) console.log(`  cell ${cell.cell}: ${issue}`);
  }
  if (!result.ok) process.exitCode = 1;
}
