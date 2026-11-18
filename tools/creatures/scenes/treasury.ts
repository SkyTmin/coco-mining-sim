// A subterranean counting room. The light catches only the lips of the piles.
import { Px } from '../rig/px';
import { hx, hash, mixc } from '../kit/f11-mobkit';
import { face } from './relief';
import type { Scene } from '../types';

const dark = hx('#22262b'),
  iron = hx('#373b3b'),
  joint = hx('#303236'),
  lip = hx('#55504b');
const brass = hx('#7d6953'),
  oak = hx('#59453d'),
  copper = hx('#665540');
function arch(p: Px, cx: number, spring: number, rx: number, ry: number) {
  for (let n = 0; n < 13; n++) {
    const a = (n * Math.PI) / 13 + 0.012,
      b = ((n + 1) * Math.PI) / 13 - 0.015;
    const at = (t: number, r: number, h: number): [number, number] => [
      cx + Math.cos(t) * r,
      spring - Math.sin(t) * h,
    ];
    const A = at(a, rx, ry),
      B = at(b, rx, ry),
      C = at(b, rx - 6, ry - 6),
      D = at(a, rx - 6, ry - 6);
    face(p, [A, B, C, D], mixc(iron, lip, 0.16 + hash(n, cx, 7) * 0.36));
    p.line(...A, ...B, lip);
  }
  for (const s of [-1, 1]) {
    const x = cx + s * (rx - 3);
    p.rect(x - 3, spring, x + 2, spring + 17, iron);
    p.line(x - 3, spring, x - 3, spring + 17, lip);
    p.rect(x - 5, spring, x + 4, spring + 2, lip);
  }
}
function chest(p: Px, x: number, y: number) {
  p.ell(x + 1, y + 1, 14, 3, dark);
  face(
    p,
    [
      [x - 12, y - 11],
      [x + 3, y - 8],
      [x + 12, y - 11],
      [x + 12, y - 2],
      [x + 3, y + 1],
      [x - 12, y - 2],
    ],
    oak,
  );
  face(
    p,
    [
      [x + 3, y - 8],
      [x + 12, y - 11],
      [x + 12, y - 2],
      [x + 3, y + 1],
    ],
    hx('#423939'),
  );
  face(
    p,
    [
      [x - 12, y - 11],
      [x - 11, y - 15],
      [x - 5, y - 18],
      [x + 10, y - 15],
      [x + 12, y - 11],
      [x + 3, y - 8],
    ],
    hx('#695345'),
  );
  for (const k of [0, 9]) {
    p.line(x - 10 + k, y - 12, x - 7 + k, y - 16, brass);
    p.line(x - 10 + k, y - 11, x - 10 + k, y - 3, copper);
  }
  p.line(x - 11, y - 11, x + 3, y - 8, dark);
  p.rect(x - 4, y - 10, x - 2, y - 7, brass);
  p.set(x - 3, y - 8, dark);
}
function stack(p: Px, x: number, y: number, n: number) {
  for (let j = 0; j < n; j++) {
    p.ell(x, y - 2 * j, 4, 2, copper);
    p.line(x - 3, y - 2 * j - 1, x + 1, y - 2 * j - 1, brass);
  }
}
function vault(w: number, h: number) {
  const p = new Px(w, h),
    floor = Math.round(h * 0.295);
  p.rect(0, 0, w - 1, h - 1, dark);
  for (let y = -3, row = 0; y < floor; y += 9, row++)
    for (let x = -13 + (row % 2) * 13; x < w; x += 26) {
      const tone = mixc(dark, iron, 0.23 + hash(x, y, 11) * 0.42);
      p.rect(x, y, x + 24, y + 7, tone);
      p.line(x + 1, y, x + 20, y, mixc(tone, iron, 0.25));
    }
  for (const x of [-4, 58, 120, 182, 244]) {
    p.ell(x, 44, 26, 33, hx('#24292c'));
    p.rect(x - 24, 43, x + 25, floor, dark);
    arch(p, x, 44, 32, 39);
    for (const k of [-1, 0, 1])
      p.line(x + k * 9, 29 - Math.abs(k) * 3, x + k * 9, floor - 2, hx('#313437'));
    p.line(x - 19, 42, x + 18, 42, hx('#383a3a'));
  }
  p.rect(0, floor - 3, w - 1, floor + 1, hx('#333538'));
  p.rect(0, floor + 2, w - 1, h - 1, joint);
  for (let row = 0, y = floor + 2; y < h; row++, y += 12) {
    for (let x = -32 + (row % 2) * 16; x < w; x += 32) {
      const seed = hash(x, row, 16),
        tone = mixc(hx('#414144'), hx('#59534e'), seed * 0.7);
      face(
        p,
        [
          [x + 2, y],
          [x + 29, y],
          [x + 31, y + 2],
          [x + 31, y + 9],
          [x + 28, y + 11],
          [x + 1, y + 11],
          [x, y + 8],
          [x, y + 2],
        ],
        tone,
      );
      p.line(x + 1, y + 10, x + 27, y + 10, mixc(tone, joint, 0.5));
      p.line(x + 2, y + 1, x + 25, y + 1, mixc(tone, lip, 0.65));
      p.set(x + 1, y + 2, lip);
      if (seed > 0.68) {
        p.line(x + 30, y + 7, x + 26, y + 6, joint);
        p.set(x + 25, y + 5, joint);
      }
      if (seed < 0.34) p.line(x + 9, y + 8, x + 15, y + 8, mixc(tone, lip, 0.4));
      if (seed > 0.82) {
        p.line(x + 10, y + 4, x + 13, y + 3, mixc(tone, brass, 0.27));
        p.set(x + 15, y + 3, mixc(tone, brass, 0.24));
      }
    }
  }
  // A worn inlaid threshold disappears beneath the coin piles.
  for (const y of [floor + 4, floor + 9]) p.line(0, y, w - 1, y, mixc(lip, copper, 0.28));
  for (let x = -7; x < w; x += 16) {
    p.line(x, floor + 8, x + 5, floor + 5, lip);
    p.line(x + 5, floor + 5, x + 10, floor + 8, lip);
  }
  for (const [cx, cy, rx, ry] of [
    [12, 74, 25, 10],
    [236, 66, 29, 9],
    [253, 87, 16, 10],
  ]) {
    p.ell(cx, cy + 2, rx + 2, ry, dark);
    p.ell(cx, cy, rx, ry, copper);
    for (let i = 0; i < rx * 4; i++) {
      const dx = hash(i, cx, 19) * 2 - 1,
        dy = hash(i, cy, 51) * 2 - 1;
      if (dx * dx + dy * dy > 0.91) continue;
      const x = Math.round(cx + dx * rx),
        y = Math.round(cy + dy * ry);
      p.line(x - 1, y, x + 2, y, mixc(copper, brass, 0.32 + hash(i, 5) * 0.6));
      p.set(x + 1, y + 1, oak);
    }
  }
  chest(p, 23, 77);
  chest(p, w - 16, 69);
  stack(p, 5, 83, 3);
  stack(p, w - 34, 71, 4);
  stack(p, w - 9, 93, 2);
  stack(p, 41, 73, 2);
  return p;
}
let base: Px | undefined;
const treasury: Scene = (p, t) => {
  if (!base || base.w !== p.w || base.h !== p.h) base = vault(p.w, p.h);
  p.data.set(base.data);
  for (const [x, y, shift] of [
    [5, 78, 0.07],
    [p.w - 34, 64, 0.55],
  ]) {
    const cycle = (((t / 3 + shift) % 1) + 1) % 1;
    if (cycle < 0.28)
      p.line(
        x - 3 + cycle * 14,
        y,
        x - 2 + cycle * 14,
        y,
        mixc(brass, hx('#b5a481'), Math.sin((cycle / 0.28) * Math.PI)),
      );
  }
};
export default treasury;
