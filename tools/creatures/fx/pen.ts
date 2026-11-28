// From SkyTmin/coco-instruments dungeon-floors/f11-boss-fx.ts, commit 523bae1 (MIT).
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { Px } from '../rig/px';
type RGBA = [number, number, number, number];

const TAU = Math.PI * 2;
const PI = Math.PI;
const hx = (h: string, a = 255): RGBA => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, a];
};
/** Детерминированный шум по трём числам, 0…1 (та же формула, что в f11-art). */
const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const k01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const eOut2 = (t: number) => 1 - (1 - t) * (1 - t);
const eOut3 = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
const eIn2 = (t: number) => t * t;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const C = {
  ink: '#1d2130',
  shade: '#3c3848',
  groove: '#4a4658',
  lip: '#f6f5fa',
  dust: '#e8e0d0',
  pebble: '#8a8698',
  redDk: '#6a0e0a',
  red: '#d8281c',
  hot: '#ff5a2a',
  orange: '#ff9a3a',
  yellow: '#ffe070',
  cream: '#fff4d0',
  white: '#ffffff',
  rune: '#6ff4e6',
  cyan: '#7af6ff',
  cyanDk: '#1e7a84',
  teal: '#2fa0a4',
  ice: '#dffcff',
  fire: ['#5a1404', '#a8300c', '#e86018', '#ffa830', '#fff0a0'],
  heat: ['#3a0c06', '#8a2010', '#d84a14', '#ff9a2a', '#ffe48a', '#fffef0'],
  bronze: ['#2c2a22', '#48443a', '#6a6856', '#928e76', '#b8b49a'],
  soot: '#1c1a20',
};
export class Pen {
  readonly g: SKRSContext2D;
  readonly qx: number;
  readonly qy: number;
  /**
   * Заслон: прямоугольники тел ближе к камере (x0, y0, x1, y1 — мир), их
   * пиксели не рисуются. Вычитается из каждой строки — без `clip()`: клип
   * сложной формы растеризует маску на весь холст, и луч «тормозил».
   */
  occ: number[] | null = null;
  constructor(g: SKRSContext2D, px: number, py: number, wx: number, wy: number) {
    this.g = g;
    const sc = g.getTransform().a || 1;
    this.qx = Math.round((px - wx) * sc) / sc;
    this.qy = Math.round((py - wy) * sc) / sc;
  }
  col(c: string, a = 1): void {
    this.g.fillStyle = c;
    this.g.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
  }
  alpha(a: number): void {
    this.g.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
  }
  /** Строка [x, x + w) на высоте y (целые пиксели мира) — с вычетом заслона. */
  span(x: number, y: number, w: number): void {
    const o = this.occ;
    if (o) {
      let hit = false;
      for (let i = 0; i < o.length; i += 4)
        if (y >= o[i + 1] && y < o[i + 3] && x < o[i + 2] && x + w > o[i]) {
          hit = true;
          break;
        }
      if (hit) {
        let segs = [x, x + w];
        for (let i = 0; i < o.length; i += 4) {
          if (y < o[i + 1] || y >= o[i + 3]) continue;
          const next: number[] = [];
          for (let k = 0; k < segs.length; k += 2) {
            const s0 = segs[k];
            const s1 = segs[k + 1];
            if (o[i + 2] <= s0 || o[i] >= s1) {
              next.push(s0, s1);
              continue;
            }
            if (o[i] > s0) next.push(s0, o[i]);
            if (o[i + 2] < s1) next.push(o[i + 2], s1);
          }
          segs = next;
        }
        for (let k = 0; k < segs.length; k += 2)
          this.g.fillRect(segs[k] + this.qx, y + this.qy, segs[k + 1] - segs[k], 1);
        return;
      }
    }
    this.g.fillRect(x + this.qx, y + this.qy, w, 1);
  }
  dot(x: number, y: number, w = 1, h = 1): void {
    this.rect(Math.floor(x), Math.floor(y), w, h);
  }
  rect(x: number, y: number, w: number, h: number): void {
    if (!this.occ) {
      this.g.fillRect(x + this.qx, y + this.qy, w, h);
      return;
    }
    for (let r = 0; r < h; r++) this.span(x, y + r, w);
  }
  img(c: Canvas, x: number, y: number): void {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const o = this.occ;
    let hit = false;
    if (o)
      for (let i = 0; i < o.length; i += 4)
        if (Y < o[i + 3] && Y + c.height > o[i + 1] && X < o[i + 2] && X + c.width > o[i]) {
          hit = true;
          break;
        }
    if (!hit || !o) {
      this.g.drawImage(c, X + this.qx, Y + this.qy);
      return;
    }
    // Картинку за телом режем клипом — их мало (клубы пара у тела).
    const g = this.g;
    g.save();
    for (let i = 0; i < o.length; i += 4) {
      g.beginPath();
      g.rect(X + this.qx - 1, Y + this.qy - 1, c.width + 2, c.height + 2);
      g.rect(o[i] + this.qx, o[i + 1] + this.qy, o[i + 2] - o[i], o[i + 3] - o[i + 1]);
      g.clip('evenodd');
    }
    g.drawImage(c, X + this.qx, Y + this.qy);
    g.restore();
  }
  /** Линия по пикселям (Брезенхэм); `keep(i)` — пунктир по номеру пикселя. */
  line(x0: number, y0: number, x1: number, y1: number, keep?: (i: number) => boolean): void {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const xe = Math.floor(x1);
    const ye = Math.floor(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    const occ = !!this.occ;
    for (let n = 0; n < 900; n++) {
      if (!keep || keep(n)) {
        if (occ) this.span(x, y, 1);
        else this.g.fillRect(x + this.qx, y + this.qy, 1, 1);
      }
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  /** Линия с тенью на пиксель вниз-вправо — читается на пёстром полу. */
  lineS(x0: number, y0: number, x1: number, y1: number, c: string, a: number, sh = 0.5): void {
    if (sh > 0) {
      this.col(C.ink, a * sh);
      this.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1);
    }
    this.col(c, a);
    this.line(x0, y0, x1, y1);
  }
}

// ---- Заливки по строкам пикселей -------------------------------------------

/** Угол a в секторе [a0, a0 + span] (span > 0) с переходом через 2π. */
function inArc(a: number, a0: number, span: number): boolean {
  return mod(a - a0, TAU) <= span;
}

/**
 * Кольцевой сектор [r0, r1] × [a0, a1] строками пикселей (центр пикселя
 * внутри — пиксель наш). Угол больше четверти круга режется на куски с
 * ОБЩИМИ границами: полупрозрачная заливка не даёт шва.
 */
export function fillSector(
  p: Pen,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): void {
  if (r1 <= 0.5 || a1 <= a0) return;
  const full = a1 - a0 >= TAU - 1e-6;
  const n = full ? 1 : Math.max(1, Math.ceil((a1 - a0) / (PI / 2)));
  const bx: number[] = [];
  const by: number[] = [];
  for (let j = 0; j <= n; j++) {
    const a = a0 + ((a1 - a0) * j) / n;
    bx.push(Math.cos(a));
    by.push(Math.sin(a));
  }
  // Строки только там, где кусок бывает: узкий клин не гоняет весь круг.
  let ylo = -r1;
  let yhi = r1;
  if (!full) {
    const sa = Math.sin(a0);
    const sb = Math.sin(a1);
    ylo = Math.min(sa * r0, sa * r1, sb * r0, sb * r1);
    yhi = Math.max(sa * r0, sa * r1, sb * r0, sb * r1);
    if (inArc(-PI / 2, a0, a1 - a0)) ylo = -r1;
    if (inArc(PI / 2, a0, a1 - a0)) yhi = r1;
  }
  const y0 = Math.floor(cy + ylo) - 1;
  const y1 = Math.ceil(cy + yhi) + 1;
  const g = p.g;
  for (let Y = y0; Y <= y1; Y++) {
    const yy = Y + 0.5 - cy;
    if (Math.abs(yy) >= r1) continue;
    const ho = Math.sqrt(r1 * r1 - yy * yy);
    const hi = Math.abs(yy) < r0 ? Math.sqrt(r0 * r0 - yy * yy) : 0;
    const segs: [number, number][] =
      hi > 0
        ? [
            [-ho, -hi],
            [hi, ho],
          ]
        : [[-ho, ho]];
    for (let j = 0; j < n; j++) {
      for (const [s0, s1] of segs) {
        let lo = s0;
        let up = s1;
        if (!full) {
          const a = -by[j];
          const b = bx[j] * yy;
          if (a > 1e-9) lo = Math.max(lo, -b / a);
          else if (a < -1e-9) up = Math.min(up, -b / a);
          else if (b < 0) continue;
          const a2 = by[j + 1];
          const b2 = -bx[j + 1] * yy;
          if (a2 > 1e-9) lo = Math.max(lo, -b2 / a2);
          else if (a2 < -1e-9) up = Math.min(up, -b2 / a2);
          else if (b2 <= 0) continue;
        }
        const xa = Math.ceil(cx + lo - 0.5);
        const xb = Math.floor(cx + up - 0.5);
        if (xb >= xa) p.span(xa, Y, xb - xa + 1);
      }
    }
  }
}

/**
 * «Через пиксель» одной заливкой строки: узор-шахматка 2×2 цвета `c`,
 * привязанный к сетке МИРА (сдвиг пера), — вместо пикселя на `fillRect`.
 */
const checkers = new Map<string, ReturnType<SKRSContext2D['createPattern']> | null>();
function checker(g: SKRSContext2D, c: string, p: Pen): ReturnType<SKRSContext2D['createPattern']> | null {
  let pat = checkers.get(c);
  if (pat === undefined) {
    const cv = createCanvas(2, 2);
    const x = cv.getContext('2d');
    if (x) {
      x.fillStyle = c;
      x.fillRect(0, 0, 1, 1);
      x.fillRect(1, 1, 1, 1);
    }
    pat = g.createPattern(cv, 'repeat');
    if (checkers.size > 64) checkers.delete(checkers.keys().next().value as string);
    checkers.set(c, pat);
  }
  if (pat && typeof pat.setTransform === 'function')
    pat.setTransform({ a: 1, b: 0, c: 0, d: 1, e: p.qx, f: p.qy });
  return pat;
}

/** Выпуклый многоугольник строками пикселей (точки — пары x, y мира). */
export function fillPoly(p: Pen, pts: number[], dither = false): void {
  const n = pts.length / 2;
  let ymin = 1e9;
  let ymax = -1e9;
  for (let i = 0; i < n; i++) {
    ymin = Math.min(ymin, pts[i * 2 + 1]);
    ymax = Math.max(ymax, pts[i * 2 + 1]);
  }
  const g = p.g;
  const solid = g.fillStyle;
  const pat = dither && typeof solid === 'string' ? checker(g, solid, p) : null;
  if (pat) {
    g.fillStyle = pat;
    dither = false;
  }
  for (let Y = Math.floor(ymin); Y <= Math.ceil(ymax); Y++) {
    const yy = Y + 0.5;
    let lo = 1e9;
    let up = -1e9;
    for (let i = 0; i < n; i++) {
      const xa = pts[i * 2];
      const ya = pts[i * 2 + 1];
      const xb = pts[((i + 1) % n) * 2];
      const yb = pts[((i + 1) % n) * 2 + 1];
      if ((ya <= yy && yb > yy) || (yb <= yy && ya > yy)) {
        const x = xa + ((yy - ya) / (yb - ya)) * (xb - xa);
        lo = Math.min(lo, x);
        up = Math.max(up, x);
      }
    }
    if (up < lo) continue;
    const xa = Math.ceil(lo - 0.5);
    const xb = Math.floor(up - 0.5);
    if (xb < xa) continue;
    if (dither) for (let x = xa + ((xa + Y) & 1); x <= xb; x += 2) p.span(x, Y, 1);
    else p.span(xa, Y, xb - xa + 1);
  }
  if (pat) g.fillStyle = solid;
}

/** Полоса вдоль (ux, uy) от l0 до l1, полуширина hw — строками пикселей. */
export function fillLane(
  p: Pen,
  cx: number,
  cy: number,
  ux: number,
  uy: number,
  l0: number,
  l1: number,
  hw: number,
  dither = false,
): void {
  if (l1 <= l0 || hw <= 0) return;
  const nx = -uy;
  const ny = ux;
  fillPoly(
    p,
    [
      cx + ux * l0 + nx * hw,
      cy + uy * l0 + ny * hw,
      cx + ux * l1 + nx * hw,
      cy + uy * l1 + ny * hw,
      cx + ux * l1 - nx * hw,
      cy + uy * l1 - ny * hw,
      cx + ux * l0 - nx * hw,
      cy + uy * l0 - ny * hw,
    ],
    dither,
  );
}

/** Толстый отрезок от (x0, y0) до (x1, y1) полушириной hw (экранные точки мира). */
export function fillSeg(
  p: Pen,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hw: number,
  dither = false,
): void {
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 0.01) {
    disc(p, x0, y0, hw, dither);
    return;
  }
  fillLane(p, x0, y0, (x1 - x0) / L, (y1 - y0) / L, 0, L, hw, dither);
}

/** Круг по пикселям. */
export function disc(p: Pen, cx: number, cy: number, r: number, dither = false): void {
  if (r < 0.5) {
    p.dot(cx, cy);
    return;
  }
  const g = p.g;
  const solid = g.fillStyle;
  const pat = dither && typeof solid === 'string' ? checker(g, solid, p) : null;
  if (pat) {
    g.fillStyle = pat;
    dither = false;
  }
  for (let Y = Math.floor(cy - r); Y <= Math.ceil(cy + r); Y++) {
    const yy = Y + 0.5 - cy;
    if (Math.abs(yy) > r) continue;
    const h = Math.sqrt(r * r - yy * yy);
    const xa = Math.ceil(cx - h - 0.5);
    const xb = Math.floor(cx + h - 0.5);
    if (xb < xa) continue;
    if (dither) for (let x = xa + ((xa + Y) & 1); x <= xb; x += 2) p.span(x, Y, 1);
    else p.span(xa, Y, xb - xa + 1);
  }
  if (pat) g.fillStyle = solid;
}

// ---- Окружности по пикселям (средняя точка), кеш по радиусу -----------------

interface CircPts {
  x: Int16Array;
  y: Int16Array;
  a: Float32Array;
}
const circles = new Map<number, CircPts>();
function circle(r: number): CircPts {
  const R = Math.max(1, Math.round(r));
  let c = circles.get(R);
  if (c) return c;
  const pts: [number, number][] = [];
  const seen = new Set<number>();
  const add = (x: number, y: number) => {
    const key = (x + 512) * 1024 + (y + 512);
    if (seen.has(key)) return;
    seen.add(key);
    pts.push([x, y]);
  };
  let x = R;
  let y = 0;
  let err = 1 - R;
  while (x >= y) {
    for (const [a, b] of [
      [x, y],
      [y, x],
      [-y, x],
      [-x, y],
      [-x, -y],
      [-y, -x],
      [y, -x],
      [x, -y],
    ])
      add(a, b);
    y++;
    if (err < 0) err += 2 * y + 1;
    else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
  const withA = pts.map(([x0, y0]) => [x0, y0, Math.atan2(y0, x0)]);
  withA.sort((p, q) => p[2] - q[2]);
  c = {
    x: Int16Array.from(withA.map((q) => q[0])),
    y: Int16Array.from(withA.map((q) => q[1])),
    a: Float32Array.from(withA.map((q) => q[2])),
  };
  if (circles.size > 200) circles.delete(circles.keys().next().value as number);
  circles.set(R, c);
  return c;
}

/**
 * Кольцо по пикселям цветом `c`. `keep(a, i)` — оставить ли пиксель
 * (пунктир, дуга, рваная пыль). `sh` — тень на пиксель вниз-вправо.
 */
export function ring(
  p: Pen,
  cx: number,
  cy: number,
  r: number,
  c: string,
  a: number,
  keep?: (a: number, i: number) => boolean,
  sh = 0,
): void {
  if (r < 0.5 || a <= 0) return;
  const pts = circle(r);
  const ox = Math.floor(cx);
  const oy = Math.floor(cy);
  const n = pts.x.length;
  for (let pass = sh > 0 ? 0 : 1; pass < 2; pass++) {
    const d = pass ? 0 : 1;
    p.col(pass ? c : C.ink, pass ? a : a * sh);
    for (let i = 0; i < n; i++) {
      if (keep && !keep(pts.a[i], i)) continue;
      p.rect(ox + pts.x[i] + d, oy + pts.y[i] + d, 1, 1);
    }
  }
}

/** Звезда удара: n лучей радиуса r (у основания — 0,4 r). */
export function star(p: Pen, cx: number, cy: number, r: number, n: number, rot: number): void {
  const R = Math.ceil(r) + 1;
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  for (let y = -R; y <= R; y++) {
    let run = -1;
    for (let x = -R; x <= R + 1; x++) {
      let on = false;
      if (x <= R) {
        const dx = x0 + x + 0.5 - cx;
        const dy = y0 + y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        if (d <= r) {
          const th = Math.atan2(dy, dx) - rot;
          const spike = Math.pow(Math.abs(Math.cos((th * n) / 2)), 3);
          on = d <= r * (0.4 + 0.6 * spike);
        }
      }
      if (on && run < 0) run = x;
      if (!on && run >= 0) {
        p.rect(x0 + run, y0 + y, x - run, 1);
        run = -1;
      }
    }
  }
}

/** Блик-крест: четыре луча длины L из точки, тоньше к концу. */
export function flare(p: Pen, x: number, y: number, L: number, c: string, a: number): void {
  p.col(c, a);
  p.line(x - L, y, x + L, y);
  p.line(x, y - Math.round(L * 0.7), x, y + Math.round(L * 0.7));
  if (L > 4) {
    p.col(C.white, a);
    p.rect(Math.floor(x) - 1, Math.floor(y), 3, 1);
    p.rect(Math.floor(x), Math.floor(y) - 1, 1, 3);
  }
}

// ---- Спрайты-заготовки -------------------------------------------------------

const sprites = new Map<number, Canvas>();
const spr = (key: number, make: () => Px): Canvas => {
  let c = sprites.get(key);
  if (!c) {
    c = make().canvas();
    sprites.set(key, c);
  }
  return c;
};

/** Пыль: тень снизу-справа, основа, свет сверху-слева. */
const PUFF_PAL: [RGBA, RGBA, RGBA][] = [
  // 0 — мраморная пыль: теплее и темнее пола, иначе пропадает на светлых плитах.
  [hx('#6e6252'), hx('#ab9f88'), hx('#ddd2bc')],
  [hx('#1c1a22'), hx('#33303c'), hx('#4e4a58')], // 1 — копоть
  [hx('#5e5c6a'), hx('#8c8a98'), hx('#c4c2ce')], // 2 — дым гуще
  [hx('#8494b0'), hx('#d6e0ee'), hx('#ffffff')], // 3 — пар: белый, низ — холодная тень
  [hx('#b8380c'), hx('#ff8a2a'), hx('#ffe48a')], // 4 — огонь, выхлоп
  [hx('#1e7a84'), hx('#5fd6cc'), hx('#c8fcf4')], // 5 — рунная пыль
  [hx('#4a3a26'), hx('#6e5a3c'), hx('#9a845c')], // 6 — земля и труха
  [hx('#6c6a7c'), hx('#dedce8'), hx('#ffffff')], // 7 — дым ракет: белый, снизу серый
];

/** Клуб радиуса r (1…16), вариант v (0…3): три доли — край рваный. */
function puffImg(pal: number, r: number, v: number): Canvas {
  const R = Math.max(1, Math.min(16, Math.round(r)));
  return spr(10000 + pal * 1000 + R * 8 + (v & 3), () => {
    const s = 2 * R + 3;
    const p = new Px(s, s);
    const c = R + 1.5;
    const rot = (v & 3) * 1.57 + 0.4;
    const lobes: [number, number, number][] = [
      [0, 0, R],
      [Math.cos(rot) * R * 0.5, Math.sin(rot) * R * 0.32, R * 0.62],
      [Math.cos(rot + 2.4) * R * 0.52, Math.sin(rot + 2.4) * R * 0.3, R * 0.56],
    ];
    const inside = (x: number, y: number) =>
      lobes.some(([ox, oy, rr]) => (x + 0.5 - c - ox) ** 2 + (y + 0.5 - c - oy) ** 2 <= rr * rr);
    const [sh, mid, hi] = PUFF_PAL[pal];
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        if (!inside(x, y)) continue;
        const l = ((x + 0.5 - c) * -0.55 + (y + 0.5 - c) * -0.83) / Math.max(1, R);
        const low = !inside(x, y + 2) && l < 0.1;
        p.set(x, y, low && R > 2 ? sh : l > 0.3 ? hi : mid);
      }
    return p;
  });
}

const CHUNK_PAL: RGBA[][] = [
  [hx('#6e6c7e'), hx('#9c9aac'), hx('#c6c4d2'), hx('#eeedf4')], // 0 — мрамор пола
  [hx('#3a362c'), hx('#5e5c4a'), hx('#86826a'), hx('#b0ac90')], // 1 — бронза стража
  [hx('#1a5c64'), hx('#2fa0a4'), hx('#7fe6dc'), hx('#e8fffc')], // 2 — кристалл пилона
  [hx('#1a2c50'), hx('#2a4a7c'), hx('#4670a8'), hx('#8aaad4')], // 3 — смальта мозаики
];

/** Обломок размера 1…4, поворот f (0…3): скол со срезом, со светом. */
function chunkImg(sz: number, f: number, pal: number): Canvas {
  return spr(20000 + pal * 100 + sz * 10 + (f & 3), () => {
    const s = sz * 2 + 3;
    const p = new Px(s, s);
    const c = s / 2;
    const rx = 0.55 + 0.62 * sz;
    const ry = 0.42 + 0.42 * sz;
    const a = (f & 3) * (PI / 4);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const t = CHUNK_PAL[pal];
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - c;
        const dy = y + 0.5 - c;
        const u = (dx * ca + dy * sa) / rx;
        const w = (-dx * sa + dy * ca) / ry;
        if (u * u + w * w > 1 || u + w * 0.6 > 0.8) continue;
        const l = -dx * 0.6 - dy * 0.8;
        p.set(x, y, l > 0.6 ? t[3] : l > -0.2 ? t[2] : l > -0.9 ? t[1] : t[0]);
      }
    p.outline(hx(C.ink));
    return p;
  });
}
interface Fly {
  h: number;
  z: number;
  air: boolean;
}
/**
 * Полёт обломка: подброс `vz`, тяжесть `G`, отскоки с потерей энергии и
 * трением — всё по формуле, от возраста. `h` — путь по земле в секундах
 * начальной скорости (умножить на скорость — пиксели).
 */
export function fly(t: number, vz: number, G: number, e = 0.34): Fly {
  let tt = t;
  let v = vz;
  let sp = 1;
  let h = 0;
  for (let b = 0; b < 3; b++) {
    const T = (2 * v) / G;
    if (tt < T) return { h: h + sp * tt, z: v * tt - (G * tt * tt) / 2, air: true };
    tt -= T;
    h += sp * T;
    v *= e;
    sp *= 0.45;
    if (v < 10) break;
  }
  const slide = Math.min(tt, 0.12);
  return { h: h + sp * (slide - (slide * slide) / 0.24), z: 0, air: false };
}

/** Путь с сопротивлением: скорость v гаснет с темпом k. */
const drag = (v: number, k: number, t: number) => (v / k) * (1 - Math.exp(-k * t));

type From = (i: number) => [number, number, number?];

/**
 * Обломки веером: `n` штук из (x, y) в сторону `ang` ± `spread`, скорость
 * `v0…v0+dv`, подброс `vz0…vz0+dvz`. Тень под летящим, лёгший гаснет к
 * `fade`. `big` — доля крупных. `delay(i)` — когда вылетает i-й.
 */
export function chunks(
  p: Pen,
  seed: number,
  age: number,
  x: number,
  y: number,
  n: number,
  ang: number,
  spread: number,
  v0: number,
  dv: number,
  vz0: number,
  dvz: number,
  fade: [number, number],
  big = 0.3,
  pal = 0,
  delay?: (i: number) => number,
  at?: From,
): void {
  const a = 1 - k01((age - fade[0]) / (fade[1] - fade[0]));
  if (a <= 0) return;
  for (let i = 0; i < n; i++) {
    const t = age - (delay ? delay(i) : 0);
    if (t < 0) continue;
    const r1 = hash(seed, i, 11);
    const r2 = hash(seed, i, 12);
    const r3 = hash(seed, i, 13);
    const r4 = hash(seed, i, 14);
    const src = at ? at(i) : null;
    const th = (src && src[2] !== undefined ? src[2] : ang) + (r1 - 0.5) * 2 * spread;
    const v = v0 + dv * r2;
    const f = fly(t, vz0 + dvz * r3, 430);
    const ox = src ? src[0] : x;
    const oy = src ? src[1] : y;
    const gx = ox + Math.cos(th) * v * f.h;
    const gy = oy + Math.sin(th) * v * f.h;
    const sz = r4 < big * 0.4 ? 4 : r4 < big ? 3 : r4 < 0.7 ? 2 : 1;
    if (f.air) {
      p.col(C.ink, 0.3 * a);
      p.dot(gx - sz / 2, gy + 1, sz, 1);
    }
    const spin = f.air ? Math.floor(t * (14 + r2 * 10) + i) & 3 : i & 3;
    const im = chunkImg(sz, spin, typeof pal === 'number' ? pal : 0);
    p.alpha(a);
    p.img(im, gx - im.width / 2, gy - f.z - im.height / 2);
  }
}
export function dust(
  p: Pen,
  seed: number,
  age: number,
  x: number,
  y: number,
  n: number,
  ang: number,
  spread: number,
  v0: number,
  dv: number,
  r0: number,
  r1: number,
  rise: number,
  life: number,
  pal = 0,
  alpha = 0.7,
  delay?: (i: number) => number,
  at?: From,
  wind?: [number, number],
): void {
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed, i, 21);
    const h2 = hash(seed, i, 22);
    const h3 = hash(seed, i, 23);
    const t = age - (delay ? delay(i) : 0);
    if (t < 0) continue;
    const L = life * (0.75 + 0.4 * h3);
    if (t >= L) continue;
    const k = t / L;
    const src = at ? at(i) : null;
    const th = (src && src[2] !== undefined ? src[2] : ang) + (h1 - 0.5) * 2 * spread;
    const d = drag(v0 + dv * h2, 3.2, t);
    const sz = 0.5 + 0.6 * hash(seed, i, 25);
    // Клуб раздувается, а под конец садится и тает — пыль оседает.
    const grow = eOut2(k01(t / (L * 0.45)));
    const settle = 1 - 0.45 * k01((k - 0.55) / 0.45);
    const r = (r0 + (r1 - r0) * sz * grow) * settle;
    const z = rise * (0.6 + 0.4 * h2) * eOut2(k);
    const im = puffImg(pal, r, i);
    p.alpha(0.85 * alpha * (k < 0.15 ? 1 : 1 - Math.pow((k - 0.15) / 0.85, 0.9)));
    const ox = (src ? src[0] : x) + (wind ? wind[0] * t * t * 0.6 : 0);
    const oy = (src ? src[1] : y) + (wind ? wind[1] * t * t * 0.6 : 0);
    p.img(im, ox + Math.cos(th) * d - im.width / 2, oy + Math.sin(th) * d - z - im.height / 2);
  }
}
interface Crack {
  x: Int16Array;
  y: Int16Array;
  d: Float32Array;
  lx: Int16Array;
  ly: Int16Array;
  ld: Float32Array;
  max: number;
}
const cracks = new Map<string, Crack>();

/**
 * Сеть трещин из точки (0, 0): ветви `[угол, длина, ширина-у-корня]`,
 * извилистость `jag`, развилки с шансом `forkP`. Каждый пиксель знает путь
 * от корня — трещина «бежит», а не проявляется. Кромка — светлый пиксель
 * снизу-справа (свет сверху-слева), как высеченный жёлоб.
 */
export function crackOf(
  key: string,
  seed: number,
  br: [number, number, number][],
  jag = 0.5,
  forkP = 0.22,
  forkL = 0.45,
): Crack {
  let c = cracks.get(key);
  if (c) return c;
  const px = new Map<number, number>();
  const K = (x: number, y: number) => (x + 1024) * 4096 + (y + 1024);
  const put = (x: number, y: number, d: number) => {
    const k = K(x, y);
    const o = px.get(k);
    if (o === undefined || d < o) px.set(k, d);
  };
  let maxLen = 0;
  const walk = (
    x0: number,
    y0: number,
    a0: number,
    len: number,
    d0: number,
    wid: number,
    id: number,
    depth: number,
  ) => {
    let x = x0;
    let y = y0;
    let a = a0;
    maxLen = Math.max(maxLen, d0 + len);
    for (let s = 0, i = 0; s < len; s += 2, i++) {
      a += (hash(seed, id * 131 + i, 1) - 0.5) * jag * 2;
      a = a * 0.72 + a0 * 0.28;
      const nx = x + Math.cos(a) * 2;
      const ny = y + Math.sin(a) * 2;
      const w = wid * (1 - s / len);
      for (let q = 0; q <= 4; q++) {
        const qx = x + ((nx - x) * q) / 4;
        const qy = y + ((ny - y) * q) / 4;
        const d = d0 + s + q * 0.5;
        put(Math.floor(qx), Math.floor(qy), d);
        if (w > 1.1)
          put(Math.floor(qx + Math.sin(a) * 0.95), Math.floor(qy - Math.cos(a) * 0.95), d);
        if (w > 2.1)
          put(Math.floor(qx - Math.sin(a) * 0.95), Math.floor(qy + Math.cos(a) * 0.95), d);
      }
      x = nx;
      y = ny;
      if (depth < 1 && s > len * 0.25 && s < len * 0.8 && hash(seed, id * 17 + i, 2) < forkP) {
        const side = hash(seed, id * 19 + i, 3) < 0.5 ? -1 : 1;
        walk(
          x,
          y,
          a + side * (0.5 + 0.4 * hash(seed, id, 4)),
          (len - s) * forkL,
          d0 + s,
          1,
          id * 7 + i + 1,
          depth + 1,
        );
      }
    }
  };
  br.forEach(([a, len, w], i) => walk(0.5, 0.5, a, len, 0, w, i + 1, 0));
  const pts = [...px.entries()].map(([k, d]) => [
    Math.floor(k / 4096) - 1024,
    (k % 4096) - 1024,
    d,
  ]);
  pts.sort((a, b) => a[2] - b[2]);
  const lips = pts
    .filter(([x, y, d]) => d < maxLen * 0.65 && !px.has(K(x + 1, y + 1)))
    .map(([x, y, d]) => [x + 1, y + 1, d]);
  c = {
    x: Int16Array.from(pts.map((q) => q[0])),
    y: Int16Array.from(pts.map((q) => q[1])),
    d: Float32Array.from(pts.map((q) => q[2])),
    lx: Int16Array.from(lips.map((q) => q[0])),
    ly: Int16Array.from(lips.map((q) => q[1])),
    ld: Float32Array.from(lips.map((q) => q[2])),
    max: pts.length ? pts[pts.length - 1][2] : 0,
  };
  if (cracks.size > 80) cracks.delete(cracks.keys().next().value as string);
  cracks.set(key, c);
  return c;
}

/** Раскрытая трещина одним холстом: дорисовалась — одним `drawImage`. */
const crackImgs = new WeakMap<
  Crack,
  Map<string, { img: Canvas; x: number; y: number }>
>();
function crackImg(c: Crack, core: string, lip: string | null) {
  let m = crackImgs.get(c);
  if (!m) {
    m = new Map();
    crackImgs.set(c, m);
  }
  const key = `${core}|${lip}`;
  let hit = m.get(key);
  if (hit) return hit;
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  const grow = (xs: Int16Array, ys: Int16Array) => {
    for (let i = 0; i < xs.length; i++) {
      x0 = Math.min(x0, xs[i]);
      y0 = Math.min(y0, ys[i]);
      x1 = Math.max(x1, xs[i]);
      y1 = Math.max(y1, ys[i]);
    }
  };
  grow(c.x, c.y);
  if (lip) grow(c.lx, c.ly);
  if (x1 < x0) x0 = y0 = x1 = y1 = 0;
  const px = new Px(x1 - x0 + 1, y1 - y0 + 1);
  if (lip) {
    const l = hx(lip, Math.round(0.8 * 255));
    for (let i = 0; i < c.lx.length; i++) px.set(c.lx[i] - x0, c.ly[i] - y0, l);
  }
  const k = hx(core);
  for (let i = 0; i < c.x.length; i++) px.set(c.x[i] - x0, c.y[i] - y0, k);
  hit = { img: px.canvas(), x: x0, y: y0 };
  m.set(key, hit);
  return hit;
}

/** Трещина до пути `reach` (пиксели): жёлоб `core`, кромка `lip`. */
export function drawCrack(
  p: Pen,
  c: Crack,
  x: number,
  y: number,
  reach: number,
  core: string,
  lip: string | null,
  a: number,
): void {
  if (a <= 0) return;
  const ox = Math.floor(x);
  const oy = Math.floor(y);
  if (reach >= c.max) {
    const im = crackImg(c, core, lip);
    p.alpha(a);
    p.img(im.img, ox + im.x, oy + im.y);
    return;
  }
  if (lip) {
    p.col(lip, a * 0.8);
    for (let i = 0; i < c.lx.length && c.ld[i] <= reach; i++)
      p.rect(ox + c.lx[i], oy + c.ly[i], 1, 1);
  }
  p.col(core, a);
  for (let i = 0; i < c.x.length && c.d[i] <= reach; i++) p.rect(ox + c.x[i], oy + c.y[i], 1, 1);
}

/** Звезда трещин: n ветвей вокруг, длины lo…hi, первая — по углу a. */
export const starBranches = (
  seed: number,
  n: number,
  a: number,
  lo: number,
  hi: number,
  w = 2,
): [number, number, number][] =>
  Array.from({ length: n }, (_, i) => [
    a + (i / n) * TAU + (hash(seed, i, 41) - 0.5) * (TAU / n) * 0.6,
    lo + (hi - lo) * hash(seed, i, 42),
    i % 2 ? Math.max(1, w - 1) : w,
  ]);
export function guarded<A extends unknown[]>(f: (g: SKRSContext2D, ...a: A) => void) {
  return (g: SKRSContext2D, ...a: A) => {
    g.save();
    try {
      f(g, ...a);
    } finally {
      g.restore();
    }
    return true;
  };
}

// From SkyTmin/coco-instruments dungeon-floors/f14-boss-fx.ts, commit 523bae1 (MIT).
function sector(
  p: Pen,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a: number,
  b: number,
): void {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (hi - lo < 1e-4) return;
  fillSector(p, cx, cy, r0, r1, lo, hi);
}
/**
 * Смаз клинка по дуге (кадры удара): путь s от `as` в сторону `dir`, от
 * хвоста `tail` до головы `front`. Голова — белая кромка и широкое тело
 * цвета металла, к хвосту тоньше и темнее. `rim` — тёмная кромка снаружи:
 * на светлой эмали без неё светлый лист пропадал. Шаг 0,05 рад — ступенек
 * сектора не видно.
 */
export function smearArc(
  p: Pen,
  cx: number,
  cy: number,
  as: number,
  dir: number,
  tail: number,
  front: number,
  rout: (s: number) => number,
  rin: (s: number, q: number) => number,
  a: number,
  pal: string[],
  rim: number,
): void {
  const len = front - tail;
  if (len <= 0.01 || a <= 0) return;
  const n = Math.max(2, Math.min(64, Math.ceil(len / 0.05)));
  const at = (s: number) => as + dir * s;
  if (rim > 0) {
    const ro = rout(front);
    p.col(C.ink, rim * a);
    sector(p, cx, cy, ro, ro + 1.3, at(tail + len * 0.4), at(front));
  }
  for (let j = 0; j < n; j++) {
    const s1 = front - (len * j) / n;
    const s0 = front - (len * (j + 1)) / n;
    const q = (j + 0.5) / n;
    const ro = rout(s1);
    const ri = Math.min(ro - 1, rin(s1, q));
    const lo = Math.min(at(s0), at(s1));
    const hi = Math.max(at(s0), at(s1)) + 0.003;
    const body = q < 0.3 ? pal[1] : q < 0.65 ? pal[2] : pal[3];
    p.col(body, a * (q < 0.65 ? 0.95 : 0.85 * (1 - ((q - 0.65) / 0.35) * 0.75)));
    fillSector(p, cx, cy, ri, ro, lo, hi);
    if (q < 0.55) {
      p.col(pal[0], a * (1 - q * 0.8));
      fillSector(p, cx, cy, Math.max(ri, ro - (q < 0.2 ? 3 : 1.5)), ro, lo, hi);
    }
  }
}
