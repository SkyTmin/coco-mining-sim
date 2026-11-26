import { hash, hx } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face } from '../scenes/relief';
import type { FxInput, XY } from '../types';
import { bath, bellAt } from './bell_magpie-keys';

const brass = ['#60483c', '#886142', '#ab7845', '#c29454', '#e0b566', '#f4d58b', '#fff0ae'].map((c) => hx(c));
const red = ['#752f38', '#a54245', '#c55050', '#f08b71'].map((c) => hx(c));
const bronze = ['#494b46', '#6b624e', '#958264'].map((c) => hx(c));
const grit = ['#835b42', '#ad794a', '#c79761', '#e8be82', '#f6d9a0'];

function bellImage(n: number) {
  const { part, tie, knot, sway, clap } = bellAt(n);
  const p = new Px(56, 72),
    ox = 104;
  const pt = (x: number, y: number): XY => {
    const [u, v] = part(x, y);
    return [u - ox, v];
  };
  const poly = (verts: XY[], color: (typeof brass)[number]) =>
    face(
      p,
      verts.map(([x, y]) => pt(x, y)),
      color,
    );
  const line = (a: XY, b: XY, col: (typeof brass)[number]) => p.line(...pt(...a), ...pt(...b), col);
  // The lever turns the yoke, not the lip of the bell. The clapper hangs on a second joint.
  poly(
    [
      [-17, -2],
      [7, -2],
      [8, 1],
      [-17, 2],
    ],
    bronze[0],
  );
  line([-16, -1], [6, -1], bronze[2]);
  poly(
    [
      [-4, 0],
      [3, 0],
      [4, 4],
      [-4, 4],
    ],
    bronze[1],
  );
  poly(
    [
      [-4, 3],
      [4, 3],
      [6, 5],
      [7, 10],
      [8.5, 15],
      [11.7, 19],
      [12.0, 21],
      [-12, 21],
      [-12, 19],
      [-8.8, 15],
      [-7.4, 11],
      [-6, 5],
    ],
    brass[1],
  );
  poly(
    [
      [-4, 4],
      [1, 4],
      [-1, 10],
      [-2, 16],
      [-6, 19],
      [-10.5, 19],
      [-7.6, 14],
      [-6, 7],
    ],
    brass[4],
  );
  poly(
    [
      [-2, 4],
      [2, 4],
      [1.3, 11],
      [2.2, 17],
      [-1, 19],
      [-5.5, 19],
      [-2.8, 14],
    ],
    brass[5],
  );
  poly(
    [
      [2, 4],
      [4, 4],
      [5.5, 7],
      [6.8, 14],
      [9, 18],
      [3, 18],
      [1, 13],
    ],
    brass[2],
  );
  line([-5, 6], [4, 6], brass[3]);
  line([-8, 15], [8, 15], brass[3]);
  line([-9, 17], [9, 17], brass[5]);
  poly(
    [
      [-12, 19.5],
      [-8, 18.7],
      [6, 18.5],
      [12, 19.5],
      [12, 21],
      [5.5, 22.2],
      [-5, 22.25],
      [-12, 21],
    ],
    brass[0],
  );
  line([-11, 19], [-4, 18.6], brass[6]);
  line([-4, 18.6], [9, 19], brass[4]);
  const stem: XY = [13.8 * Math.sin(clap), 7.7 + 13.8 * Math.cos(clap)];
  line([0, 18], stem, bronze[0]);
  const [bx, by] = pt(...stem);
  p.ell(bx, by + 1.2, 2.35, 2.6, bronze[0]);
  p.ell(bx - 0.4, by + 0.5, 1.55, 1.58, brass[3]);
  p.set(bx - 0.8, by, brass[5]);
  const mid: XY = [(tie[0] + knot[0]) * 0.5 + sway * 3, (tie[1] + knot[1]) * 0.5];
  for (const [dx, c] of [
    [1, 0],
    [0, 1],
    [-1, 2],
  ]) {
    p.line(tie[0] - ox + dx, tie[1], mid[0] - ox + dx, mid[1], red[c]);
    p.line(mid[0] - ox + dx, mid[1], knot[0] - ox + dx, knot[1], red[c]);
  }
  for (let j = 1; j < 5; j++) {
    const u = j / 5;
    p.set(tie[0] * (1 - u) + knot[0] * u - ox - 1, tie[1] * (1 - u) + knot[1] * u, red[3]);
  }
  const x = knot[0] - ox,
    y = knot[1];
  for (let j = -2; j <= 2; j++) p.line(x, y + 1, x + j + sway * 8, y + 5 + (j % 2), red[j % 2 === 0 ? 2 : 0]);
  p.ell(x, y, 2.25, 1.9, red[0]);
  p.ell(x - 0.5, y - 0.4, 1.6, 1.25, red[2]);
  p.set(x - 1, y - 1, red[3]);
  return p.canvas();
}
const restingBell = bellImage(0);

function dustBath(f: FxInput, n: number) {
  for (const [i, at] of bath.strokes.entries()) {
    const age = n - at;
    if (age < 0 || age > 25) continue;
    const side = i < 2 ? 'L' : 'R';
    const from = f.pointAt(at / 24, 'tip' + side);
    const flank = f.pointAt(at / 24, 'dust' + side);
    for (let j = 0; j < 13; j++) {
      const u = Math.min(1, age / 19),
        jitter = hash(j, i, 14) - 0.5;
      const x = from[0] + jitter * (5 + 18 * u),
        y = from[1] - Math.sin(Math.PI * u) * (1 + hash(j, i, 4) * 4);
      f.backdrop.col(grit[1 + (j % 3)], 0.78 * (1 - u));
      f.backdrop.dot(x, y, 2 + Math.floor(2 * hash(j, 2, 3)), 1 + (j % 3 === 0 ? 1 : 0));
    }
    const toward = Math.sign(flank[0] - from[0]) || 1;
    // Coarse grains skim out of the hollow, finer dust briefly hangs beyond the wing.
    for (let j = 0; j < 22; j++) {
      const u = age / 25,
        spread = Math.sin(Math.PI * u);
      const x = from[0] - toward * (age * 1.03 + spread * (hash(j, i, 47) - 0.5) * 15);
      const y = from[1] - spread * (2 + hash(j, i, 44) * 12);
      f.backdrop.col(grit[j % 4], 0.48 * spread);
      f.backdrop.dot(x, y, 3, 2);
    }
    for (let j = 0; j < 42; j++) {
      const time = age - (j % 3) * 0.5;
      if (time < 0) continue;
      const dir = j % 4 === 0 ? toward : -toward;
      const dx = dir * (0.48 + hash(j, i, 25) * 2.35) + (hash(j, 6, i) - 0.5) * 0.88;
      const rise = 1.7 + hash(j, i, 19) * 2.64;
      const fall = 0.18 * time * time - rise * time;
      if (fall > 1) continue;
      const x = from[0] + dx * time + (hash(j, 2, i) - 0.5) * 4,
        y = from[1] + fall;
      const pen = j % 4 ? f.above : f.backdrop;
      pen.col(grit[j % grit.length]);
      pen.dot(x, y, j % 4 === 0 ? 3 : j % 3 === 0 ? 2 : 1, j % 6 === 0 ? 2 : 1);
    }
  }
  for (const at of [106, 110, 113]) {
    const age = n - at;
    if (age < 0 || age > 18) continue;
    const left = f.pointAt(at / 24, 'dustL'),
      right = f.pointAt(at / 24, 'dustR');
    for (let j = 0; j < 24; j++) {
      const s = j % 2 ? 1 : -1,
        origin = j % 2 ? right : left;
      const y = origin[1] - (1.15 + 0.8 * hash(j, at, 0)) * age + 0.22 * age * age;
      if (y > 127) continue;
      f.above.col(grit[j % 3 === 0 ? 0 : j % 2 ? 4 : 2]);
      f.above.dot(
        origin[0] + s * (0.66 + 2 * hash(j, at, 1)) * age,
        y,
        j % 4 === 0 ? 3 : j % 3 ? 2 : 1,
        j % 5 === 0 ? 2 : 1,
      );
    }
  }
}
export function courtyardEffects(f: FxInput) {
  const n = Math.round(f.t * 24),
    ringing = f.anim === 'trick' && n > 3 && n < 130;
  f.backdrop.img(ringing ? bellImage(n) : restingBell, 104, 0);
  if (f.anim === 'trick_b') dustBath(f, n);
}
