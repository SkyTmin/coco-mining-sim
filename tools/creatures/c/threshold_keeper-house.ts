import { F3, Rig, type Mat, type V3 } from '../rig/f15-rig';
import { pointsOnlyActive } from '../rig/figure';
import type { JointPose } from '../technique';
import {
  brass,
  bronze,
  cherry,
  clay,
  coat,
  glint,
  lamp,
  milk,
  night,
  plaster,
  rod,
  ruby,
  silk,
  slate,
  tile,
  wood,
  block,
  type Marks,
} from './threshold_keeper-craft';

function sash(r: Rig, F: F3, w: number, h: number, lit: Mat) {
  block(r, F, [0, 0, 0], [2, w + 3, h + 3], wood);
  block(r, F, [1.2, 0, 0], [0.6, w, h], lit);
  rod(r, F, [1.8, 0, -h / 2], [1.8, 0, h / 2], 0.72, bronze);
  rod(r, F, [1.8, -w / 2, 0], [1.8, w / 2, 0], 0.7, cherry);
  for (const s of [-1, 1]) {
    const y = s * (w / 2 + 2.4);
    block(r, F, [0.5, y, 0], [1.1, 3.5, h + 1], coat);
    for (let i = -1; i <= 1; i++) rod(r, F, [1.4, y - 1.3, i * 2.6], [1.4, y + 1.3, i * 2.6], 0.45, tile);
  }
  block(r, F, [1.5, 0, -h / 2 - 1.7], [4, w + 7, 1.8], cherry, brass);
}
function entry(r: Rig, F: F3, p: JointPose, j: Marks) {
  const width = 23,
    h = 26;
  j.door = F.p(0, 0, h * 0.48);
  j.sill = F.p(2, 0, 0);
  j.lintel = F.p(1, 0, h + 7.6);
  j.jambL = F.p(1.4, width / 2, 0);
  j.jambR = F.p(1.4, -width / 2, 0);
  const hinge = F.at(0.85, width / 2, 0).turn(-(p.open || 0) * 1.47);
  j.latch = hinge.p(1.4, -width + 3, 12);
  j.hinge = hinge.o;
  if (pointsOnlyActive()) return;
  r.tag = 'door';
  const corner = (s: number, z: number) => F.p(0.16, s, z);
  const arch: V3[] = [corner(-width / 2, 0), corner(width / 2, 0)];
  for (let i = 0; i <= 14; i++) {
    const a = (i * Math.PI) / 14;
    arch.push(corner((Math.cos(a) * width) / 2, h - 2 + Math.sin(a) * 8));
  }
  r.poly(arch, night, 0.2);
  // The side wall, worn threshold and diamond pane are recessed behind the outside face of the leaf.
  const inside = (y: number, z: number) => F.p(0.34, y, z);
  r.poly([inside(-10, 0), inside(-5, 4), inside(-5, 24), inside(-10, 28)], wood, 0.12);
  const opened = (p.open || 0) > 0.45;
  r.poly([inside(-5, 4), inside(10, 3), inside(10, 24), inside(-5, 24)], opened ? night : cherry, 0.16);
  r.poly([inside(-10, 0), inside(10, 0), inside(10, 4), inside(-5, 5)], brass, 0.12);
  for (const z of [8, 14, 20]) r.line(inside(-5, z), inside(10, z - 1), opened ? slate.T[1] : wood.T[1], 0, 0.45);
  // The blue leaded pane stays on the inner sidewall after the last strand of fur has passed.
  if (opened) {
    r.poly([inside(5, 14), inside(9, 14), inside(9, 21), inside(5, 21)], coat, 0.16);
    r.line(inside(7, 14), inside(7, 21), slate.T[3], 0, 0.45);
    r.line(inside(5, 17), inside(9, 17), slate.T[3], 0, 0.45);
  } else {
    r.poly([inside(1, 12), inside(5, 17), inside(1, 22), inside(-3, 17)], lamp, 0.24);
    r.line(inside(1, 12), inside(1, 22), bronze.T[2], 0, 0.55);
    r.line(inside(-3, 17), inside(5, 17), bronze.T[2], 0, 0.55);
  }
  for (let i = 0; i < 11; i++) {
    const a = (i * Math.PI) / 11,
      b = ((i + 1) * Math.PI) / 11;
    const at = (u: number, k: number) => F.p(1.4, (width / 2 + k) * Math.cos(u), h - 2 + (8 + k) * Math.sin(u));
    r.poly([at(a, 0), at(b, 0), at(b, 3.3), at(a, 3.3)], i === 5 ? brass : i % 3 ? clay : plaster, 0.1);
  }
  for (const s of [-1, 1])
    for (let k = 0; k < 5; k++)
      block(r, F, [0.4, s * (width / 2 + 1.7), 2.4 + 4.65 * k], [3.2, 3.1, 4.3], k % 2 ? clay : plaster);
  for (let i = 0; i < 7; i++) {
    const y = (-(i + 0.5) * width) / 7,
      dz = Math.sqrt(Math.max(0, 1 - (1 + (2 * y) / width) ** 2)) * 7.5;
    block(r, hinge, [0.2, y, (h - 2 + dz) * 0.5], [2.3, width / 7 - 0.15, h - 2 + dz], i % 3 ? cherry : wood);
    rod(r, hinge, [1.42, y - 0.64, 3], [1.42, y - 0.38, 12 + ((i * 7) % 8)], 0.28, bronze);
  }
  for (const z of [6, 21]) {
    rod(r, hinge, [1.5, -2, z], [1.5, -14, z + 0.3], 0.85, bronze, 0.42);
    r.dot(hinge.p(2, -3, z), glint, 0, 0.65, 0.9);
    r.dot(hinge.p(2, -12, z), glint, 0, 0.54, 0.9);
  }
  r.ball(j.latch, 1.56, brass);
  r.dot(hinge.p(2.6, -width + 2.9, 12.6), milk, 0.12, 0.64, 1);
  block(r, F, [1, 0, -0.7], [6, width + 8, 2.5], wood, brass);
  block(r, F, [3.2, 0, -2.8], [7, width + 11, 1.9], wood, clay);
}
function roof(r: Rig, F: F3, w: number, depth: number, height: number, form: number, rows: number, cols: number) {
  const peak = F.p(0, 0, height);
  // A hipped roof, with curved projecting eaves and overlapping glazed scallops on all four pitches.
  for (let wall = 0; wall < 4; wall++) {
    const face = F.turn((wall * Math.PI) / 2),
      front = wall % 2 ? w : depth,
      span = wall % 2 ? depth : w;
    const P = (u: number, v: number, raise = 0): V3 =>
      face.p(front * (1 - v), u * span * (1 - v), height * v + raise + Math.abs(u) ** 3 * (1 - v) ** 3 * 3.7);
    r.poly([P(-1, 0, -4.4), P(1, 0, -4.4), P(0, 1, -2.4)], form > 0.56 ? ruby : slate);
    rod(r, face, [front, -span, 3.5], [front * 0.99, 0, 0], 1.05, bronze);
    rod(r, face, [front * 0.99, 0, 0], [front, span, 3.5], 1.05, bronze);
    for (let row = 0; row < rows; row++) {
      const a = row / (rows + 1),
        b = (row + 0.95) / (rows + 1);
      for (let i = 0; i < cols; i++) {
        const l = -1 + (2 * i) / cols + 0.009,
          v = -1 + (2 * (i + 1)) / cols - 0.009,
          mid = (l + v) / 2;
        const edge = Math.max(0, a - 0.027);
        const A = P(l, a, 0.32),
          B = P(mid, edge, 0.56),
          C = P(v, a, 0.31),
          D = P(v, b, 0.36),
          E = P(l, b, 0.36);
        const mat = form > 0.56 ? ((row + i) % 5 === 0 ? silk : ruby) : (row * 2 + i) % 5 === 0 ? coat : tile;
        r.poly([A, B, C, D, E], mat, 0.22);
        r.line(A, B, (form > 0.56 ? silk : tile).T[3], 0, 0.51);
        if ((i + row) % 3 === 0) r.line(B, C, (form > 0.56 ? ruby : slate).T[2], 0, 0.46);
      }
    }
    r.cap(P(-1, 0, 1.4), peak, 1.52, 0.9, brass);
    r.ball(P(-1, 0, 4.2), 1.6, brass);
  }
  r.ball(peak, 2.2, brass);
}
/** Two side chapels unfold on drawbridges. Their pillars, lamps and roofs all ride the same hinge. */
function galleries(r: Rig, F: F3, form: number, swing: number) {
  for (const side of [-1, 1]) {
    const u = Math.max(0, Math.min(1, (form - (side < 0 ? 0.13 : 0.29)) / (side < 0 ? 0.7 : 0.67)));
    if (u < 0.015) continue;
    const amount = u * u * (3 - 2 * u),
      e = side * (20 + 24 * amount),
      z = 31 + 5 * amount;
    const B = F.at(-3, e, z);
    r.tag = 'gallery';
    for (const f of [-6, 6]) {
      rod(r, F, [f, side * 19, 24], [f, e, z - 0.3], 1.3, brass, 0.95);
      rod(r, F, [f, side * 20, 34], [f, e, z], 1.1, cherry);
      for (let k = 1; k <= 3; k++) {
        const q = k / 4,
          m = side * 20 + (e - side * 20) * q;
        rod(r, F, [f, m, z - 1], [f, m, z + 4], 0.63, bronze);
        r.ball(F.p(f, m, z + 4), 0.77, brass);
      }
      rod(r, F, [f, side * 20, z + 4], [f, e, z + 4], 0.6, brass);
    }
    block(r, F, [-1, (e + side * 20) / 2, z], [12, Math.abs(e - side * 20) + 1.2, 2.4], wood, plaster);
    const size = 0.45 + 0.55 * amount,
      h = 14 * amount;
    block(r, B, [0, 0, 1], [12 * size, 13 * size, 2.5], wood, brass);
    for (const f of [-1, 1])
      for (const k of [-1, 1])
        rod(r, B, [f * 4.5 * size, k * 4.6 * size, 1], [f * 4.5 * size, k * 4.6 * size, h + 2], 0.78, brass);
    const bell = B.at(0, 0, h * 0.52 + 1).roll(0.15 * swing * amount);
    r.ell(bell, [0, 0, 0], [3.4 * size, 3.4 * size, 4.9 * size], lamp);
    r.ball(bell.p(0, 0, -4.6 * size), 1.24, brass);
    const T = B.at(0, 0, h + 2);
    roof(r, T, 8.2 * size, 8 * size, 8.3 * size, 1, 2, 4);
    rod(r, T, [0, 0, 7 * size], [0, 0, 11 * size], 0.66, brass);
  }
}
export function house(r: Rig, F: F3, p: JointPose, j: Marks) {
  const form = p.form || 0,
    parked = p.park || 0,
    wobble = (p.swing || 0) * 0.018 + (p.leap || 0) * 0.028;
  const A = F.roll(wobble),
    top = A.at(0, 0, 37),
    stack = top.at(-6, -5, 9);
  const chimney = A.at(-10, 11, 48),
    s = p.swing || 0;
  j.house = A.o;
  j.roof = top.o;
  j.chimney = chimney.p(0, 0, 8);
  j.tower = stack.p(0, 0, 22 * form);
  const flag = A.at(-4, -3, 59 + form * 31),
    flutter = 1.6 * s + 2 * (p.banner || 0);
  j.pennant = flag.p(0, 12, 7 + flutter);
  j.flagBase = flag.o;
  if (form > 0.014) j.tower = stack.p(0, 0, (3 + form * 25) * 1.34);
  const facade = A.at(17.6, -3, 3.2);
  entry(r, facade, p, j);
  const jackLength = 5 + parked * (49.42 - 22.42 * (p.dockDrop || 0));
  for (const f of [-12, 12])
    for (const y of [-19, 19]) j['shoe' + (f > 0 ? 'F' : 'B') + (y > 0 ? 'R' : 'L')] = A.p(f, y, -jackLength);
  if (pointsOnlyActive()) return;
  r.tag = 'house';
  for (const f of [-12, 12])
    for (const y of [-19, 19]) {
      // A screw jack extends to the street before the bearer moves. Once planted its shoe stays still.
      const leg = jackLength;
      block(r, A, [f, y, -leg / 2], [3.7, 4, leg], wood, cherry);
      block(r, A, [f, y, -leg * 0.45], [5.2, 5.6, 2.3], bronze, brass);
      if (parked > 0.02) {
        block(r, A, [f, y, -4 - 3 * parked], [4.9, 5.4, 6 + 6 * parked], bronze, brass);
        for (let k = 8; k < leg - 3; k += 5) rod(r, A, [f - 1.8, y + 2, -k], [f + 1.8, y + 2, -k - 1.7], 0.65, brass);
      }
      block(r, A, [f, y, -leg], [6.4, 7, 2.7], wood, brass);
    }
  block(r, A, [0, 0, -0.8], [36, 49, 5], wood, brass);
  // The facade ends behind the recessed entry.
  block(r, A, [0, 0, 17.5], [34, 45, 35], plaster, clay);
  for (const s of [-1, 1]) {
    const side = A.at(0, s * 22.6, 17).turn((s * Math.PI) / 2);
    sash(r, side.at(0.22, 0, 1), 12, 12, lamp);
    for (const u of [-1, 1]) {
      rod(r, side, [0.4, u * 14, -15], [0.4, u * 14, 16], 1.4, wood);
      rod(r, side, [0.55, u * 14, -13], [0.55, u * 5, -3], 1.15, cherry);
      for (let k = 0; k < 4; k++) r.dot(side.p(1.8, u * 14, -11 + k * 8), glint, 0, 0.63, 0.7);
    }
    for (let z = 0; z < 3; z++) block(r, A, [0, s * 22.9, 2 + z * 15.2], [35, 1.8, 2.4], wood, cherry);
    block(r, A, [0, s * 23.8, 35], [38, 2.8, 3.7], wood, brass);
  }
  for (const f of [-1, 1])
    for (const s of [-1, 1]) {
      block(r, A, [f * 16.6, s * 21.3, 18], [2.6, 3, 36], wood, cherry);
      for (let k = 0; k < 6; k++) r.dot(A.p(f * 18, s * 21.4, 2 + k * 6), glint, 0, 0.6, 0.5);
    }
  sash(r, A.at(-17.5, 0, 20).turn(Math.PI), 15, 15, lamp);
  sash(r, A.at(17.35, 16, 22), 5, 9, lamp);
  for (let k = 0; k < 10; k++) r.dot(A.p(17.25, -21 + (k % 3), 3 + k * 2.75), clay.T[1], 0, 0.6, 0.5);
  r.tag = 'roof';
  roof(r, top, 29.5, 23, 23, 0, 5, 9);
  r.tag = 'chimney';
  block(r, chimney, [0, 0, 2], [6, 6, 12], wood, cherry);
  for (let i = 0; i < 4; i++) block(r, chimney, [0, 0, -2 + i * 2.7], [6.2, 6.3, 1], clay);
  block(r, chimney, [0, 0, 8], [8, 8, 2.8], wood, clay);
  block(r, chimney, [0, 0, 9.5], [4.2, 4.1, 0.5], night);
  if (form > 0.014) {
    galleries(r, A, form, s);
    r.tag = 'tower';
    const h = 3 + form * 25;
    const T = stack.at(0, 0, h * 0.34);
    block(r, T, [0, 0, h / 2], [14.8, 15.5, h], clay, brass);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const side = T.turn(a);
      const y = h * 0.64;
      for (const s of [-1, 1]) rod(r, side, [7.8, s * 6.7, 0], [7.8, s * 6.7, h], 1.15, bronze);
      if (form > 0.3) {
        r.ell(side, [7.6, 0, y], [0.8, 4.45, 4.8], lamp);
        const angle = (1 - form) * Math.PI * 2.6 + (p.ring || 0) * 1.7;
        rod(r, side, [8.5, 0, y], [8.5, 2.9 * Math.sin(angle + 1.03), y + 2.9 * Math.cos(angle + 1.03)], 0.58, wood);
        rod(r, side, [8.6, 0, y], [8.6, 3.5 * Math.sin(angle), y + 3.5 * Math.cos(angle)], 0.55, wood);
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          r.dot(side.p(8.4, 3.7 * Math.sin(a), y + 3.9 * Math.cos(a)), brass.T[1], 0, 0.54, 0.85);
        }
      }
    }
    const brim = T.at(0, 0, h);
    block(r, brim, [0, 0, 0], [20, 20, 2.5], wood, brass);
    roof(r, brim, 13, 12, 12 * form, 1, 3, 5);
    j.tower = brim.o;
  }
  r.tag = 'pennant';
  rod(r, flag, [0, 0, 0], [0, 0, 9], 0.85, brass);
  r.ball(flag.p(0, 0, 9.6), 1.35, brass);
  r.poly(
    [
      flag.p(0, 0, 8.4),
      flag.p(0, 5, 7 + flutter * 0.45),
      flag.p(-1, 12, 7 + flutter),
      flag.p(0, 8, 4.6 + flutter * 0.66),
      flag.p(0, 12, 2.9 + flutter),
      flag.p(0, 0, 3),
    ],
    silk,
  );
  r.line(flag.p(0.3, 0, 8.5), flag.p(0.3, 11.5, 7 + flutter), glint, 0, 0.5);
  j.pennant = flag.p(0, 12, 7 + flutter);
}
