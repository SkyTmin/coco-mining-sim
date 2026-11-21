// Native RGBA counterpart to the owner's detail-metric.py. Transparency is not a colour.
import type { Px } from './rig/px';
import type { Rarity } from './types';

export function measureDetail(p: Pick<Px, 'data' | 'w' | 'h'>) {
  const { data, w, h } = p;
  const rgb = new Int32Array(w * h).fill(-1);
  const frequencies = new Map<number, number>();
  let pixels = 0,
    left = w,
    right = -1,
    top = h,
    bottom = -1;
  for (let i = 0; i < rgb.length; i++) {
    const k = i * 4;
    if (data[k + 3] <= 200) continue;
    const value = (data[k] << 16) | (data[k + 1] << 8) | data[k + 2];
    rgb[i] = value;
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
    const x = i % w,
      y = Math.floor(i / w);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    pixels++;
  }
  let edges = 0,
    biggest = 0;
  const seen = new Uint8Array(rgb.length),
    queue = new Int32Array(rgb.length);
  for (let i = 0; i < rgb.length; i++) {
    const color = rgb[i];
    if (color < 0) continue;
    const x = i % w;
    if (
      (x > 0 && rgb[i - 1] >= 0 && rgb[i - 1] !== color) ||
      (x + 1 < w && rgb[i + 1] >= 0 && rgb[i + 1] !== color) ||
      (i >= w && rgb[i - w] >= 0 && rgb[i - w] !== color) ||
      (i + w < rgb.length && rgb[i + w] >= 0 && rgb[i + w] !== color)
    )
      edges++;
    if (seen[i]) continue;
    let head = 0,
      tail = 1;
    seen[i] = 1;
    queue[0] = i;
    function visit(j: number) {
      if (seen[j] || rgb[j] !== color) return;
      seen[j] = 1;
      queue[tail++] = j;
    }
    while (head < tail) {
      const j = queue[head++],
        cx = j % w;
      if (cx > 0) visit(j - 1);
      if (cx + 1 < w) visit(j + 1);
      if (j >= w) visit(j - w);
      if (j + w < rgb.length) visit(j + w);
    }
    biggest = Math.max(biggest, tail);
  }
  return {
    pixels,
    colours: [...frequencies.values()].filter((n) => n >= 3).length,
    edge: edges / Math.max(1, pixels),
    flat: biggest / Math.max(1, pixels),
    width: pixels ? right - left + 1 : 0,
    height: pixels ? bottom - top + 1 : 0,
  };
}
export const minimumColours: Record<Rarity, number> = {
  common: 55,
  uncommon: 55,
  rare: 60,
  epic: 60,
  legendary: 70,
  mythic: 70,
  secret: 70,
};
