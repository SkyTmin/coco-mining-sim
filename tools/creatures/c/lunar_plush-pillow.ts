// The same soft toy lives on the footstool and in the figure's depth buffer.
// Its centre is specified in picture space; the seam and the bulging face have real depth.
import { hx } from '../kit/f11-mobkit';
import { CE, SE, Rig, renderRig, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { hug, type cushionAt } from './lunar_plush-keys';
import type { XY } from '../types';

type Cushion = ReturnType<typeof cushionAt>;
const cloth = (colors: string[]): Mat => ({ T: colors.map((c) => hx(c)) as Tones });
const satin = cloth(['#b37576', '#da997d', '#f4bf83', '#ffdfa0']);
const piping = cloth(['#956671', '#b87e73', '#de9e7d', '#ffcf92']);
const stitch = hx('#fff0b4'),
  crease = hx('#dfa07f');
const ink = '#514454';
export const heldPillow = (n: number) => n >= hug.grasp - 12 && n <= hug.release + 12;

function outline(): XY[] {
  const corners: XY[] = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 === 0 ? 16 : 8.5;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  const points: XY[] = [];
  for (let i = 0; i < 10; i++) {
    const a = corners[(i + 9) % 10],
      b = corners[i],
      c = corners[(i + 1) % 10];
    for (const t of [0, 0.5, 1]) {
      const x = (1 - t) ** 2 * 0.19,
        y = t * t * 0.19;
      points.push([x * a[0] + (1 - x - y) * b[0] + y * c[0], x * a[1] + (1 - x - y) * b[1] + y * c[1]]);
    }
  }
  return points;
}
const edge = outline();
export function placePillow(r: Rig, c: Cushion, x: number, y: number, depth: number) {
  const angle = c.tilt - 0.09,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  // Inverse isometric projection, with a shallow, slightly off-centre stuffing bulge.
  function vertex(u: number, v: number, d: number): V3 {
    const a = u * (1 - 0.16 * c.squeeze),
      b = v * (1 + 0.055 * c.squeeze);
    const yy = y + a * sin + b * cos,
      z = depth + d;
    return [x + a * cos - b * sin, SE * yy + CE * z, -CE * yy + SE * z];
  }
  const ring = (fraction: number, d: number, dy = 0) =>
    edge.map(([u, v]) => vertex(u * fraction, v * fraction + dy, d));
  const seam = ring(1, 0),
    lip = ring(0.89, 1.65),
    top = ring(0.52, 3.2, -0.4);
  const centre = vertex(-0.9, -1.1, 3.9 - 0.66 * c.squeeze);
  r.tag = 'pillow';
  for (let i = 0; i < edge.length; i++) {
    const j = (i + 1) % edge.length;
    r.poly([seam[i], seam[j], lip[j], lip[i]], piping);
    r.poly([lip[i], lip[j], top[j], top[i]], satin);
    r.poly([top[i], top[j], centre], satin);
    if (i % 3 === 1) r.line(lip[i], lip[j], stitch, 0, 0.94);
  }
  for (const [x1, y1, x2, y2] of [
    [-1, -7, -1.4, -10],
    [5, 3, 7, 5],
    [-9, -2.1, -6, -1.5],
  ]) {
    r.line(vertex(x1, y1, 3.4), vertex(x2, y2, 3.4), crease, 0, 0.85);
  }
  r.dot(centre, stitch, 0, 0.66);
}
export function pillowOnPouf(c: Cushion) {
  const r = new Rig();
  r.innerInk = hx('#856b79');
  placePillow(r, c, 0, 0, 0);
  return renderRig(r, 39, 39, 19, 19, { outline: hx(ink), inner: 3.18 }).p.canvas();
}
