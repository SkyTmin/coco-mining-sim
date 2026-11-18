// From SkyTmin/coco-instruments dungeon-art.ts, commit 523bae1 (MIT).
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type { RGBA } from './f15-rig';
export class Px {
  readonly w: number;
  readonly h: number;
  data: Uint8ClampedArray;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  set(x: number, y: number, c: RGBA | null): void {
    x = Math.round(x);
    y = Math.round(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c[3] >= 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
      return;
    }
    // Полупрозрачное — поверх того, что есть.
    const a = c[3] / 255;
    const da = this.data[i + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++)
      this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / oa;
    this.data[i + 3] = oa * 255;
  }
  get(x: number, y: number): RGBA {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  solid(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[(y * this.w + x) * 4 + 3] > 0;
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: RGBA | null): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }
  ell(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    c: RGBA | ((x: number, y: number) => RGBA),
  ): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  /** Буквенная карта: буква — цвет палитры, точка — пусто. */
  map(rows: string[], pal: Record<string, RGBA | null>, ox = 0, oy = 0, flip = false): void {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) continue;
        this.set(ox + (flip ? r.length - 1 - x : x), oy + y, c);
      }
    }
  }
  /** Контур снаружи фигуры. */
  outline(c: RGBA, diag = false): void {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.solid(x, y)) continue;
        const n =
          this.solid(x - 1, y) ||
          this.solid(x + 1, y) ||
          this.solid(x, y - 1) ||
          this.solid(x, y + 1) ||
          (diag &&
            (this.solid(x - 1, y - 1) ||
              this.solid(x + 1, y - 1) ||
              this.solid(x - 1, y + 1) ||
              this.solid(x + 1, y + 1)));
        if (n) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }
  flipX(): Px {
    const o = new Px(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        const j = (y * this.w + (this.w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) o.data[j + k] = this.data[i + k];
      }
    return o;
  }
  /** Перекрасить всё непрозрачное к цвету: вспышка удара. */
  tint(c: RGBA, k: number): Px {
    const o = new Px(this.w, this.h);
    for (let i = 0; i < this.data.length; i += 4) {
      if (!this.data[i + 3]) continue;
      o.data[i] = this.data[i] + (c[0] - this.data[i]) * k;
      o.data[i + 1] = this.data[i + 1] + (c[1] - this.data[i + 1]) * k;
      o.data[i + 2] = this.data[i + 2] + (c[2] - this.data[i + 2]) * k;
      o.data[i + 3] = this.data[i + 3];
    }
    return o;
  }
  canvas(): Canvas {
    const canvas = createCanvas(this.w, this.h);
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(this.w, this.h);
    image.data.set(this.data);
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}
