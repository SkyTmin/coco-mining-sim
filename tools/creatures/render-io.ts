import gifenc from 'gifenc';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { Px } from './rig/px';

const { GIFEncoder } = gifenc;
// Idle holds, empty effects and rigid frame loops share many exact RGBA buffers.
const pngCache = new Map<string, Buffer>();
export function savePNG(path: string, p: Px) {
  mkdirSync(dirname(path), { recursive: true });
  const key =
    p.w +
    'x' +
    p.h +
    ':' +
    createHash('sha256').update(p.data).digest('base64');
  let encode = pngCache.get(key);
  if (!encode) {
    encode = PNG.sync.write(
      { width: p.w, height: p.h, data: p.data },
      // Pixel-art fills have long repeated RGBA sequences. LZ77 search compresses
      // those across rows, unlike pngjs's default run-length strategy.
      { filterType: 0, deflateLevel: 6, deflateStrategy: 0 },
    );
    if (pngCache.size >= 384) pngCache.delete(pngCache.keys().next().value!);
    pngCache.set(key, encode);
  }
  writeFileSync(path, encode);
}
interface Color {
  id: number;
  rgb: number[];
  count: number;
}

// Keep three quarters of the opaque table for recurring exact colours, including
// neighbouring values in dark scenery. Spend the rest on the greatest remaining
// colour errors, so small, isolated highlights can also claim their original RGB.
function reducePalette(colors: Color[], transparentId: number) {
  const transparent = transparentId >= 0;
  const palette: number[][] = transparent ? [[0, 0, 0]] : [];
  const opaque = colors
    .filter((c) => c.id !== transparentId)
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.rgb[0] - b.rgb[0] ||
        a.rgb[1] - b.rgb[1] ||
        a.rgb[2] - b.rgb[2],
    );
  const keep = Math.floor((256 - palette.length) * 0.75);
  const remaining = opaque.slice(keep);
  const remap = new Uint8Array(colors.length);
  const distance = new Float64Array(remaining.length).fill(Infinity);
  const weights = remaining.map((c) => 1 + 0.25 * Math.log2(c.count));

  function add(color: Color) {
    const index = palette.length;
    palette.push(color.rgb);
    remap[color.id] = index;
    const [r, g, b] = color.rgb;
    for (let i = 0; i < remaining.length; i++) {
      if (distance[i] === 0) continue;
      const candidate = remaining[i];
      const dr = candidate.rgb[0] - r,
        dg = candidate.rgb[1] - g,
        db = candidate.rgb[2] - b;
      const error = 2 * dr * dr + 3 * dg * dg + db * db;
      if (error < distance[i]) {
        distance[i] = error;
        remap[candidate.id] = index;
      }
    }
  }

  for (let i = 0; i < keep; i++) add(opaque[i]);
  while (palette.length < 256) {
    let worst = 0,
      worstScore = -1;
    for (let i = 0; i < remaining.length; i++) {
      const score = distance[i] * weights[i];
      if (score > worstScore) {
        worst = i;
        worstScore = score;
      }
    }
    add(remaining[worst]);
  }
  return { palette, remap };
}

export function indexed(p: Px) {
  const colors: Color[] = [];
  const ids = new Map<number, number>();
  const indices = new Uint8Array(p.w * p.h);
  let wideIds: Uint32Array | undefined;
  const pixels = p.data;
  for (let k = 0; k < indices.length; k++) {
    const i = k * 4;
    // Transparent pixels have one dedicated identity, even when opaque black is present.
    const key =
      pixels[i + 3] < 128
        ? -1
        : (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    let id = ids.get(key);
    if (id === undefined) {
      id = colors.length;
      ids.set(key, id);
      colors.push({
        id,
        rgb: key === -1 ? [0, 0, 0] : [pixels[i], pixels[i + 1], pixels[i + 2]],
        count: 0,
      });
      if (id === 256) {
        wideIds = new Uint32Array(indices.length);
        wideIds.set(indices.subarray(0, k));
      }
    }
    colors[id].count++;
    if (wideIds) wideIds[k] = id;
    else indices[k] = id;
  }
  const transparentId = ids.get(-1) ?? -1;
  const transparent = transparentId >= 0;
  if (!wideIds)
    return {
      indices,
      palette: colors.map((c) => c.rgb),
      transparent,
      transparentIndex: Math.max(0, transparentId),
    };
  const { palette, remap } = reducePalette(colors, transparentId);
  // All pixels with the same RGB use the nearest entry found once above.
  for (let k = 0; k < indices.length; k++) indices[k] = remap[wideIds[k]];
  return { indices, palette, transparent, transparentIndex: 0 };
}
export class GifWriter {
  private encoder = GIFEncoder();
  private previous?: Uint32Array;
  constructor(
    private scale = 3,
    private opaque = false,
  ) {
    if (!Number.isInteger(scale) || scale < 1 || scale > 12)
      throw new Error('GIF scale must be 1..12');
  }
  add(p: Px, frame: number) {
    const { scale } = this;
    let { indices, palette, transparent, transparentIndex } = indexed(p);
    if (this.opaque) {
      if (transparent)
        throw new Error('Opaque GIF has transparent scene pixels');
      const colors = Uint32Array.from(
        palette,
        (c) => (c[0] << 16) | (c[1] << 8) | c[2],
      );
      const current = Uint32Array.from(indices, (i) => colors[i]);
      if (this.previous) {
        // A transparent delta means "keep the previous RGB", even when consecutive
        // frames have different local colour tables. Compare resolved RGB, never indices.
        const remap = new Uint16Array(256),
          delta = new Uint8Array(indices.length),
          used = [[0, 0, 0]];
        let changed = 0;
        for (let i = 0; i < indices.length && used.length <= 256; i++) {
          if (current[i] === this.previous[i]) continue;
          const shade = indices[i];
          if (!remap[shade]) {
            remap[shade] = used.length;
            used.push(palette[shade]);
          }
          delta[i] = remap[shade];
          changed++;
        }
        if (used.length <= 256 && changed < indices.length * 0.8) {
          indices = delta;
          palette = used;
          transparent = true;
          transparentIndex = 0;
        }
      }
      this.previous = current;
    }
    let enlarged = indices;
    if (scale !== 1) {
      const rowWidth = p.w * scale;
      enlarged = new Uint8Array(rowWidth * p.h * scale);
      for (let y = 0; y < p.h; y++) {
        const offset = y * scale * rowWidth;
        for (let x = 0; x < p.w; x++)
          enlarged.fill(
            indices[y * p.w + x],
            offset + x * scale,
            offset + (x + 1) * scale,
          );
        for (let i = 1; i < scale; i++)
          enlarged.copyWithin(offset + i * rowWidth, offset, offset + rowWidth);
      }
    }
    // Exactly 300 centiseconds for a 72-frame idle (GIF timing is quantized).
    const delay =
      (Math.round(((frame + 1) * 100) / 24) - Math.round((frame * 100) / 24)) *
      10;
    this.encoder.writeFrame(enlarged, p.w * scale, p.h * scale, {
      palette,
      delay,
      repeat: 0,
      dispose: this.opaque ? 1 : 2,
      transparent,
      transparentIndex,
    });
  }
  bytes(): Uint8Array {
    this.encoder.finish();
    return this.encoder.bytesView();
  }
  write(path: string) {
    const temp = path + '.part';
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temp, this.bytes());
    renameSync(temp, path);
  }
}
