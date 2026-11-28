// Зенит's own secret frame, «Рама обсерватории»: cast bronze with green patina. The rails are a measuring scale —
// fine ticks with a longer tick every tenth, like the limb of a sextant — and a glint of sunlight runs round them once
// a loop, lighting the ticks it passes. The corners are small armillary spheres (three crossed rings round a bead).
// On the top rail a sun medallion with rays, a dark moon disc resting on its rim; on the bottom rail two small sundial
// plates with their gnomons flank the nameplate. A bright bronze lip runs round the opening.
import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';

const bronze = ['#1e140a', '#33220f', '#4e3416', '#6c4a1e', '#8e642a', '#b2843a', '#d6aa58', '#f4d690'].map((c) => hx(c));
const patina = ['#173029', '#24463a', '#346050', '#4c7e68'].map((c) => hx(c));
const sun = ['#a04a10', '#e07a1c', '#f8b03c', '#ffe08a', '#fff6d8'].map((c) => hx(c));
const moon = ['#141428', '#242440', '#3a3a5c', '#8a8cae'].map((c) => hx(c));
const glint = hx('#fff2c4');
type C = [number, number, number, number];

function inFrame(p: Px, b: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && (x < b || y < b || x >= p.w - b || y >= p.h - b);
}
function set(p: Px, x: number, y: number, c: number[]) {
  if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.set(Math.round(x), Math.round(y), c as C);
}
const hashI = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Cast bronze rails: a rounded profile lit on the outer top-left, patina pooling in the hollow near the opening. */
function rails(p: Px, b: number) {
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!inFrame(p, b, x, y)) continue;
      const horizontal = (y < b || y >= p.h - b) && x >= Math.min(y, p.h - 1 - y) && x < p.w - Math.min(y, p.h - 1 - y);
      const across = horizontal ? (y < b ? y : p.h - 1 - y) : x < b ? x : p.w - 1 - x;
      const u = across / b;
      // rounded profile: bright crest at a third, dark groove near the opening
      const profile = Math.cos((u - 0.3) * 3.2) * 2.4;
      const lightSide = horizontal ? (y < b ? 0.6 : -0.5) : x < b ? 0.4 : -0.5;
      const grain = hashI(x, y, 3) > 0.86 ? 0.6 : hashI(x, y, 5) > 0.9 ? -0.6 : 0;
      const v = 3 + profile + lightSide + grain;
      set(p, x, y, bronze[Math.max(0, Math.min(7, Math.round(v)))]);
      // patina in the groove and in a few blotches
      if ((u > 0.72 && u < 0.86 && hashI(x, y, 7) > 0.45) || hashI(x >> 2, y >> 2, 9) > 0.965)
        set(p, x, y, patina[Math.min(3, Math.floor(hashI(x, y, 11) * 3 + (u < 0.5 ? 1 : 0)))]);
    }
  // bright lip round the opening, dark edge outside
  for (let x = b - 2; x < p.w - b + 2; x++) {
    set(p, x, b - 2, bronze[6]);
    set(p, x, b - 1, bronze[2]);
    set(p, x, p.h - b, bronze[4]);
    set(p, x, p.h - b + 1, bronze[2]);
    set(p, x, 0, bronze[1]);
    set(p, x, p.h - 1, bronze[0]);
  }
  for (let y = b - 2; y < p.h - b + 2; y++) {
    set(p, b - 2, y, bronze[6]);
    set(p, b - 1, y, bronze[2]);
    set(p, p.w - b, y, bronze[4]);
    set(p, p.w - b + 1, y, bronze[2]);
    set(p, 0, y, bronze[1]);
    set(p, p.w - 1, y, bronze[0]);
  }
}

/** The measuring scale: ticks every 3 px along the outer third, every tenth longer; lit as the glint passes. */
function scale(p: Px, b: number, near: (s: number) => number, keepOut: (x: number, y: number) => boolean, k = 1) {
  const o = Math.round(3 * k);
  let n = 0;
  const tick = (x: number, y: number, dx: number, dy: number, len: number, s: number) => {
    const light = near(s);
    for (let i = 0; i < len; i++) set(p, x + dx * i, y + dy * i, mixc(bronze[1], glint, light * 0.9));
    if (light > 0.2) set(p, x + dx * (len - 1), y + dy * (len - 1), mixc(bronze[6], glint, light));
  };
  for (let x = b; x < p.w - b; x += 3, n++) {
    const len = Math.round((n % 10 === 0 ? 6 : n % 5 === 0 ? 4 : 3) * k);
    if (!keepOut(x, o)) tick(x, o, 0, 1, len, x);
    if (!keepOut(x, p.h - 1 - o)) tick(x, p.h - 1 - o, 0, -1, len, p.w + p.h + (p.w - x));
  }
  n = 0;
  for (let y = b; y < p.h - b; y += 3, n++) {
    const len = Math.round((n % 10 === 0 ? 6 : n % 5 === 0 ? 4 : 3) * k);
    tick(o, y, 1, 0, len, 2 * p.w + p.h + (p.h - y));
    tick(p.w - 1 - o, y, -1, 0, len, p.w + y);
  }
}

/** A small armillary sphere: three crossed rings round a bright bead. */
function cornerSphere(p: Px, cx: number, cy: number, light: number, k = 1) {
  const r = Math.round(6 * k);
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) if (x * x + y * y <= (r + 1) * (r + 1)) set(p, cx + x, cy + y, bronze[1]);
  const ring = (tilt: number, spin: number) => {
    for (let a = 0; a < Math.PI * 2; a += 0.05 / k) {
      const X = Math.cos(a) * r,
        Y = Math.sin(a) * r;
      const x1 = X * Math.cos(spin),
        z1 = X * Math.sin(spin);
      const y2 = Y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const front = Y * Math.sin(tilt) + z1 * Math.cos(tilt) > 0;
      set(p, cx + x1, cy + y2, mixc(bronze[front ? 6 : 3], glint, front ? light * 0.6 : 0));
    }
  };
  ring(Math.PI / 2, 0);
  ring(0.5, 0.7);
  ring(0, Math.PI / 2);
  set(p, cx, cy, sun[3]);
  set(p, cx - 1, cy, sun[2]);
  set(p, cx, cy - 1, sun[4]);
}

/** Sun medallion on the top rail: a raised disc with sixteen rays, a dark moon disc resting on its lower left rim. */
function medallion(p: Px, cx: number, cy: number, light: number, k = 1) {
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const len = (a % 2 ? 11 : 15) * k;
    for (let r = 7 * k; r < len; r += 0.7) set(p, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.72, bronze[a % 2 ? 4 : 6]);
  }
  const rx = Math.round(9 * k),
    ry = Math.round(8 * k);
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = Math.hypot(x / rx, y / ry);
      if (d > 1) continue;
      const v = 3.6 - d * 2 - (x + y) / (14 * k) + light;
      set(p, cx + x, cy + y, sun[Math.max(0, Math.min(4, Math.round(v)))]);
    }
  set(p, cx, cy, sun[4]);
  // the moon disc: dark, a thin cold rim — the eclipse to come
  const mx = cx - Math.round(8 * k),
    my = cy + Math.round(4 * k),
    mr = Math.round(5 * k);
  for (let y = -mr; y <= mr; y++)
    for (let x = -mr; x <= mr; x++) {
      const d = Math.hypot(x, y) / mr;
      if (d > 1) continue;
      set(p, mx + x, my + y, moon[d > 0.8 ? (x + y < 0 ? 3 : 2) : d > 0.5 ? 1 : 0]);
    }
}

/** A small sundial plate with its triangular gnomon, for the bottom rail. */
function dialPlate(p: Px, cx: number, cy: number, k = 1) {
  const rx = Math.round(10 * k),
    ry = Math.round(4 * k);
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = Math.hypot(x / rx, y / ry);
      if (d > 1) continue;
      set(p, cx + x, cy + y, bronze[d > 0.82 ? 6 : 3 + Math.round((1 - d) * 1.4)]);
    }
  for (let a = 0; a < 7; a++) {
    const ang = Math.PI + (a / 6) * Math.PI;
    set(p, cx + Math.cos(ang) * 8 * k, cy + Math.sin(ang) * 3 * k, bronze[1]);
  }
  for (let i = 0; i < Math.round(6 * k); i++) {
    set(p, cx + i, cy - i, bronze[7]);
    for (let y = cy - i + 1; y <= cy; y++) set(p, cx + i, y, bronze[5]);
  }
  for (let x = cx - Math.round(9 * k); x < cx; x++) set(p, x, cy + 1, patina[1]);
}

const observatory: Border = {
  wood: ['#1e140a', '#33220f', '#4e3416', '#6c4a1e'],
  accent: '#d6aa58',
  decorate(p, b, t) {
    rails(p, b);
    // ornaments are drawn for the canon's 18 px rail and grow with a thicker one (Зенит's larger painting: 27 px)
    const k = b / 18;
    const m = Math.floor(b / 2),
      cx = p.w >> 1;
    const perimeter = 2 * (p.w + p.h);
    const wave = ((((t / 3) % 1) + 1) % 1) * perimeter;
    const near = (s: number) => {
      const d = Math.abs((((s - wave) % perimeter) + perimeter) % perimeter);
      return Math.max(0, 1 - Math.min(d, perimeter - d) / (40 * k));
    };
    const keepOut = (x: number, y: number) =>
      (y < b && Math.abs(x - cx) < 22 * k) || (y >= p.h - b && (Math.abs(x - cx) < 34 * k || Math.abs(Math.abs(x - cx) - 52 * k) < 13 * k)) || x < b + 6 * k || x > p.w - b - 6 * k;
    scale(p, b, near, keepOut, k);
    cornerSphere(p, m, m, near(0), k);
    cornerSphere(p, p.w - 1 - m, m, near(p.w), k);
    cornerSphere(p, p.w - 1 - m, p.h - 1 - m, near(p.w + p.h), k);
    cornerSphere(p, m, p.h - 1 - m, near(2 * p.w + p.h), k);
    medallion(p, cx, m, near(cx) * 0.8, k);
    dialPlate(p, cx - Math.round(52 * k), p.h - 1 - m, k);
    dialPlate(p, cx + Math.round(52 * k), p.h - 1 - m, k);
  },
};
export default observatory;
