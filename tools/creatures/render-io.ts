import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { Px } from './rig/px';

const { GIFEncoder, quantize, applyPalette } = gifenc;
export function savePNG(path: string, p: Px) {
  mkdirSync(dirname(path), { recursive: true });
  const encode = PNG.sync.write(
    { width: p.w, height: p.h, data: p.data },
    { filterType: 0, deflateLevel: 4 },
  );
  writeFileSync(path, encode);
}
// Preserve the original RGB triplets exactly whenever a frame fits a GIF table.
// Wide contact flashes can exceed 256. Quantize them at native resolution before upscaling.
export function indexed(p: Px) {
  const palette: number[][] = [],
    colors = new Map<number, number>(),
    indices = new Uint8Array(p.w * p.h);
  let transparent = false;
  for (let k = 0; k < indices.length; k++) {
    const i = k * 4;
    const key =
      p.data[i + 3] < 128
        ? -1
        : (p.data[i] << 16) | (p.data[i + 1] << 8) | p.data[i + 2];
    let j = colors.get(key);
    if (j === undefined) {
      if (palette.length === 256) {
        const palette = quantize(p.data, 256, {
          format: 'rgba4444',
          oneBitAlpha: true,
          clearAlpha: true,
        });
        const transparentIndex = palette.findIndex((c: number[]) => c[3] === 0);
        return {
          indices: applyPalette(p.data, palette, 'rgba4444'),
          palette,
          transparent: transparentIndex >= 0,
          transparentIndex: Math.max(0, transparentIndex),
        };
      }
      colors.set(key, (j = palette.length));
      if (key === -1) transparent = true;
      palette.push(
        key === -1 ? [0, 0, 0] : [p.data[i], p.data[i + 1], p.data[i + 2]],
      );
    }
    indices[k] = j;
  }
  return {
    indices,
    palette,
    transparent,
    transparentIndex: colors.get(-1) ?? 0,
  };
}
export class GifWriter {
  private encoder = GIFEncoder();
  constructor(private scale = 3) {
    if (!Number.isInteger(scale) || scale < 1 || scale > 12)
      throw new Error('GIF scale must be 1..12');
  }
  add(p: Px, frame: number) {
    const { scale } = this;
    const { indices, palette, transparent, transparentIndex } = indexed(p);
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
      dispose: 2,
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
