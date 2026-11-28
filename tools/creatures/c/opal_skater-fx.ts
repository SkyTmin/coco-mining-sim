import { hx } from '../kit/f11-mobkit';
import { F3, SE } from '../rig/f15-rig';
import { runner } from './opal_skater-runner';
import { Px } from '../rig/px';
import type { FxInput, XY } from '../types';
import {
  clamp,
  ease,
  figureScale,
  home,
  idleYaw,
  puckAt,
  puckMark,
  railX,
  radius,
  score,
} from './opal_skater-keys';
import { face } from '../scenes/relief';

function bumper(shift: number) {
  const p = new Px(18, 21),
    w = 2 + shift;
  // The cork moves, the mounting plate stays put, and the spring folds into the gap.
  for (const y of [8, 13]) {
    const coil: XY[] = [
      [w + 3, y],
      [w + 4, y - 1],
      [w + 5, y + 1],
      [10, y - 1],
      [11, y + 1],
      [13, y],
    ];
    for (let j = 1; j < coil.length; j++) p.line(...coil[j - 1], ...coil[j], hx('#756a75'));
  }
  face(
    p,
    [
      [w, 3],
      [w + 3, 2],
      [w + 4, 13],
      [w + 2, 17],
      [w, 17],
    ],
    hx('#79565f'),
  );
  face(
    p,
    [
      [w, 4],
      [w + 2, 3],
      [w + 2, 15],
      [w, 16],
    ],
    hx('#c58877'),
  );
  p.line(w, 5, w, 14, hx('#ebaf86'));
  p.set(w + 1, 5, hx('#ffd0a0'));
  p.set(w + 1, 9, hx('#a77570'));
  p.set(w + 1, 13, hx('#a77570'));
  return p.canvas();
}
function puck(phase: number) {
  const p = new Px(16, 11);
  p.ell(8.7, 7.6, 6.2, 1.7, [80, 100, 116, 89]);
  p.ell(7.5, 6.3, radius, 2.45, hx('#7c4354'));
  p.rect(2, 4, 12, 6, hx('#994b5c'));
  p.ell(7.5, 4.8, radius, 2.44, hx('#a74d5e'));
  p.ell(7.5, 4.35, radius - 0.5, 2.04, hx('#ed897d'));
  p.ell(7.5, 4.25, 3.45, 1.2, hx('#ca615f'));
  const a = (phase * Math.PI) / 6;
  p.line(
    7.5 + Math.cos(a) * 1.7,
    4.25 + 0.5 * Math.sin(a),
    7.5 + Math.cos(a) * 3.5,
    4.25 + Math.sin(a),
    hx('#ffdbad'),
  );
  p.line(4, 6, 6, 6, hx('#d37a76'));
  return p.canvas();
}
const pads = Array.from({ length: 4 }, (_, i) => bumper(i)),
  disks = Array.from({ length: 12 }, (_, i) => puck(i));
// Two thin grooves stay in the ice along the blades that actually made them.
function bladeTracks(anim: string, start: number, end: number) {
  return [-1, 1].map((side) =>
    Array.from({ length: end - start + 1 }, (_, i): XY => {
      const { p, x, y, stroke } = score(anim, (i + start) / 24);
      const f = F3.yaw(idleYaw + (p.yaw ?? 0));
      const blade = runner(f, side, p, 0, stroke, 0).p(0, 0, -1.58);
      return [home[0] + x + blade[0] * figureScale, home[1] + y + SE * blade[1] * figureScale];
    }),
  );
}
const eight = bladeTracks('trick_b', 19, 139);
const firstCircle = bladeTracks('hatch', 8, 66);
function drawTracks(f: FxInput, paths: XY[][], start: number, fadeAt: number, end: number) {
  const n = f.t * 24;
  const fade = 1 - ease(fadeAt, end, n);
  for (const path of paths)
    for (let i = 1; i < path.length && i + start <= n; i++) {
      const [a, b] = [path[i - 1], path[i]];
      const fresh = clamp(1 - (n - i - start) / 88);
      f.backdrop.col('#799eaa', (0.19 + 0.22 * fresh) * fade);
      f.backdrop.line(...a, ...b);
      if (fresh > 0.55) {
        f.backdrop.col('#f4f1df', fresh * fade * 0.42);
        f.backdrop.line(a[0], a[1] + 1, b[0], b[1] + 1);
      }
    }
}
function shavings(f: FxInput, foot: string, since: number, direction: number) {
  const age = f.t * 24 - since;
  if (age < 0 || age > 8) return;
  const pt = f.pointAt(since / 24, foot);
  for (let i = 0; i < 3; i++) {
    const u = clamp((age - i * 0.6) / 8);
    f.under.col(i === 1 ? '#eff2dc' : '#e2ebdf', (1 - u) * 0.86);
    f.under.dot(pt[0] + direction * (1 + u * (7 + i * 2)), pt[1] + u * i - 4 * (i + 1) * u * (1 - u));
  }
}
export function icePlay(f: FxInput) {
  const n = f.t * 24;
  const disk = puckAt(f.anim === 'trick' ? n : 0);
  f.backdrop.img(pads[Math.round(disk.compression)], railX - 2, puckMark[1] - 10);
  const spin = Math.round((disk.x - puckMark[0]) * 0.32) % 12;
  // World space in every clip, including a walk sampled at another gallery stop.
  f.backdrop.img(disks[spin], Math.round(disk.x) - 7, disk.y - 7);
  f.propAt?.('puck', [disk.x, disk.y]);
  if (f.anim === 'trick_b' && n >= 19) {
    drawTracks(f, eight, 19, 136, 156);
    for (const [at, foot, side] of [
      [29, 'footL', -1],
      [52, 'footR', 1],
      [86, 'footL', -1],
      [111, 'footR', 1],
      [132, 'footL', 1],
    ] as const)
      shavings(f, foot, at, side);
  }
  if (f.anim === 'happy')
    for (const at of [21, 36]) {
      shavings(f, 'footR', at, -1);
      shavings(f, 'footL', at, 1);
    }
  if (f.anim === 'hatch') {
    drawTracks(f, firstCircle, 8, 62, 75);
    shavings(f, 'footR', 63, -1);
  }
  if (f.anim === 'trick') shavings(f, 'footL', 32, -1);
}
