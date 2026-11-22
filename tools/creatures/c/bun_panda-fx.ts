// Effects of Пончик и Шустрик, in the manner of the 1940s theatrical cartoons: circling stars and little buns over a
// bonked head, a bump, speed lines, sweat drops, flour, water, honey. No fire, no explosions. Each prop comes from
// somewhere in the kitchen and goes somewhere (skill: logic of objects).
import { disc, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { gesture } from './bun_panda-poses';

const TAU = Math.PI * 2;
const INK = '#1e1620';

function dot(p: Pen, x: number, y: number, r: number, c: string, a = 1) {
  p.col(INK, a);
  disc(p, x, y, r + 1);
  p.col(c, a);
  disc(p, x, y, r);
}
function starInk(p: Pen, x: number, y: number, r: number, rot: number, c: string) {
  p.col(INK);
  star(p, x, y, r + 1.5, 5, rot);
  p.col(c);
  star(p, x, y, r, 5, rot);
  p.col('#fff8d0');
  star(p, x - r * 0.15, y - r * 0.2, r * 0.35, 5, rot);
}
/** Little bun over the head: white with folds. */
function bunMini(p: Pen, x: number, y: number, r: number) {
  dot(p, x, y, r, '#f6ecdc');
  p.col('#c8b49a');
  p.dot(x - 1, y - r + 1, 2, 1);
  p.dot(x, y - r, 1, 1);
}
/** Stars and buns circling a bonked head: an ellipse round the crown, the back half under the body, the front over. */
export function dizzyRing(f: FxInput, at: XY, w: number, phase: number, k: number) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    const x = at[0] + Math.cos(a) * w,
      y = at[1] + Math.sin(a) * w * 0.32;
    const front = Math.sin(a) > 0;
    const pen = front ? f.above : f.under;
    const s = (front ? 1 : 0.75) * k;
    if (i % 2 === 0) starInk(pen, x, y, 5 * s, a * 2, '#ffd23a');
    else bunMini(pen, x, y, 3.6 * s);
  }
}

export function pandaEffects(f: FxInput) {
  const P = gesture(f.anim, f.t);
  const head = f.points.head;
  if ((P.dizzy ?? 0) > 0.5 && head) dizzyRing(f, [head[0], head[1] - 34], 34, f.t * TAU * 1.2, 1);
  const mHead = f.points.mHead;
  if ((P.mDizzy ?? 0) > 0.5 && mHead) dizzyRing(f, [mHead[0], mHead[1] - 12], 13, -f.t * TAU * 1.5, 0.6);
}
