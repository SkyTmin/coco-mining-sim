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
  // A cosmatesque marble carpet: dark green lozenges, light breccia and a
  // central worn medallion. The light from the narrow clerestory lies obliquely.
  const jade = [hx('#353b3b'), hx('#384240'), hx('#404845'), hx('#444944')];
  const marble = [hx('#535052'), hx('#5a5655'), hx('#625b56'), hx('#685e57')],
    grout = hx('#353635');
  const metal = hx('#807059'),
    inlay = hx('#655b4f');
  for (let y = floor + 2; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x + (y - floor) * 1.43) / 29,
        v = (x - (y - floor) * 1.43) / 29,
        i = Math.floor(u),
        j = Math.floor(v);
      const a = u - i,
        b = v - j,
        d = Math.min(a, b, 1 - a, 1 - b);
      const darkTile = ((i + j) & 1) === 1,
        noise = hash(i, j, 31);
      const ribbon = Math.sin(
        x * 0.066 - y * 0.18 + 2.1 * Math.sin(y * 0.071 + x * 0.031 + noise * 5) + noise * 3,
      );
      const tones = darkTile ? jade : marble;
      let tone = tones[Math.floor(noise * 3 + 0.5)];
      if (ribbon > 0.69) tone = tones[ribbon > 0.88 ? 1 : 2];
      if (ribbon < -0.94 && (x + y) % 11 < 7) tone = tones[darkTile ? 3 : 0];
      if (d < 0.026) tone = grout;
      else if (d < 0.053) tone = darkTile ? inlay : marble[1];
      const X = x - w * 0.47,
        Y = (y - h * 0.785) * 1.7,
        R = Math.hypot(X, Y);
      if (R < 39) {
        const theta = Math.atan2(Y, X),
          ray = (Math.cos(theta * 8) + 1) * 0.5;
        if (R > 36 || (R < 31 && R > 29)) tone = inlay;
        else if (R > 31) tone = Math.floor((theta + Math.PI) * 14) % 2 ? jade[2] : marble[1];
        else if (R < 8 + 20 * ray ** 4) tone = mixc(marble[2], metal, 0.3);
        else tone = jade[Math.floor((ribbon + 1) * 1.48)];
      }
      const shaft = x + 0.51 * y;
      if (shaft > 85 && shaft < 106)
        tone = mixc(tone, hx('#a19176'), (1 - Math.abs(95.5 - shaft) / 11) * 0.17);
      p.set(x, y, tone);
    }
  for (const [x, y] of [
    [53, 16],
    [59, 14],
    [65, 16],
  ]) {
    p.line(x, y, x, y + 12, hx('#7c7665'));
    p.set(x + 1, y, hx('#645f55'));
  }
  // Dropped coin rolls form small directional trails on the marble.
  for (const [x, y] of [
    [42, 86],
    [36, 89],
    [30, 88],
    [197, 102],
    [203, 104],
    [205, 107],
    [225, 157],
    [226, 162],
    [234, 165],
  ]) {
    p.ell(x, y, 2.7, 1.6, copper);
    p.line(x - 1, y - 1, x + 1, y - 1, brass);
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
treasury.front = [
  {
    id: 'open-casket-and-coins',
    depth: 179,
    paint(p) {
      const x = Math.round(0.765 * p.w),
        y = Math.round(0.86 * p.h);
      p.ell(x + 6, y + 2, 33, 6, dark);
      const ec = hx('#312d30'),
        wood = hx('#73574a'),
        gold = hx('#947858'),
        glint = hx('#ad9270');
      face(
        p,
        [
          [x - 16, y - 16],
          [x + 4, y - 12],
          [x + 19, y - 17],
          [x + 19, y - 3],
          [x + 4, y + 2],
          [x - 16, y - 3],
        ],
        ec,
      );
      face(
        p,
        [
          [x - 14, y - 14],
          [x + 3, y - 11],
          [x + 3, y],
          [x - 14, y - 4],
        ],
        wood,
      );
      face(
        p,
        [
          [x + 5, y - 11],
          [x + 17, y - 15],
          [x + 17, y - 4],
          [x + 5, y],
        ],
        oak,
      );
      face(
        p,
        [
          [x - 17, y - 17],
          [x - 15, y - 32],
          [x - 10, y - 35],
          [x + 10, y - 30],
          [x + 9, y - 18],
          [x + 3, y - 14],
        ],
        ec,
      );
      face(
        p,
        [
          [x - 15, y - 17],
          [x - 13, y - 30],
          [x - 10, y - 32],
          [x + 7, y - 28],
          [x + 6, y - 19],
          [x + 2, y - 16],
        ],
        oak,
      );
      p.line(x - 12, y - 29, x + 5, y - 26, gold);
      p.line(x - 12, y - 27, x + 4, y - 23, wood);
      face(
        p,
        [
          [x - 15, y - 16],
          [x - 3, y - 20],
          [x + 17, y - 17],
          [x + 4, y - 12],
        ],
        brass,
      );
      for (const z of [-12, 0]) {
        p.line(x + z, y - 14, x + z, y - 4, gold);
        p.set(x + z, y - 5, glint);
      }
      p.rect(x - 5, y - 13, x - 2, y - 9, gold);
      p.set(x - 4, y - 11, ec);
      for (const [cx, cy, rx, ry] of [
        [x + 20, y, 14, 5],
        [x - 17, y + 2, 13, 4],
      ]) {
        p.ell(cx, cy + 1, rx, ry, oak);
        for (let row = 0; row < 4; row++)
          for (let j = 0; j < 9; j++) {
            const xx = cx + (j - 4) * (rx / 4) - (row % 2),
              yy = cy - ry + 2 * row;
            if ((xx - cx) ** 2 / rx ** 2 + (yy - cy) ** 2 / ry ** 2 > 1) continue;
            p.ell(xx, yy, 2.6, 1.6, copper);
            p.line(xx - 1, yy - 1, xx + 1, yy - 1, (j + row) % 3 ? brass : gold);
          }
      }
    },
  },
];
export default treasury;
