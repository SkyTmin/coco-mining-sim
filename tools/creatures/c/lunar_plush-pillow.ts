// The same soft toy lives on the footstool and in the figure's depth buffer.
// Its centre is specified in picture space; the seam and the bulging face have real depth.
import { hx, mixc } from '../kit/f11-mobkit';
import { CE, SE, Rig, renderRig, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { hug, type cushionAt } from './lunar_plush-keys';
import type { XY } from '../types';

type Cushion = ReturnType<typeof cushionAt>;
const cloth = (colors: string[]): Mat => ({ T: colors.map((c) => hx(c)) as Tones });
const satin = cloth(['#ce9477', '#e9af7e', '#f9cd91', '#ffe5a7']);
const nap = Array.from({ length: 25 }, (_, i) => {
  const t = i / 8,
    k = Math.min(2, Math.floor(t));
  return mixc(satin.T[k], satin.T[k + 1], t - k);
});
const piping = cloth(['#a86f65', '#bd816c', '#d79c78', '#e8b883']);
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
// At the lower grip this is the depth of the piped seam, in native picture pixels.
export const pillowDepth = 27.5;
function clothPoint(c: Cushion, u: number, v: number, loft: number): V3 {
  const angle = c.tilt - 0.09,
    cos = Math.cos(angle),
    sin = Math.sin(angle);
  const nearPalm = Math.exp(-(((Math.abs(u) - 9.4) / 4.6) ** 2 + ((v - 4) / 5.2) ** 2));
  // The two seams indent under the mittens. Loose filling rounds the belly between them.
  const pinch = nearPalm * c.squeeze;
  const upper = Math.max(0, Math.min(1, (-v - 3.5) / 10.7));
  const curl = upper * upper * c.fold;
  const across = u * (1 - 0.085 * c.squeeze) - Math.sign(u) * 2.15 * pinch + 5.7 * curl;
  const down = v * (1 + 0.045 * c.squeeze) + 2.3 * curl + 0.55 * pinch;
  const dx = across * cos - down * sin,
    dy = across * sin + down * cos;
  // A vertical seam has constant ground depth. The upper lobe rolls out beneath the cheek.
  return [dx, dy, (SE / CE) * (7 - dy) + loft * (1 + 0.32 * c.squeeze) - 1.6 * pinch + 3.8 * curl];
}
export function pillowGrip(c: Cushion, side: number): V3 {
  const [x, y, d] = clothPoint(c, side < 0 ? 12.7 : -8.1, side < 0 ? 6.5 : 6.6, 4);
  return [c.x + x, c.y + y, pillowDepth + d];
}
export function placePillow(r: Rig, c: Cushion, x: number, y: number, depth: number) {
  function vertex(u: number, v: number, loft: number): V3 {
    const [dx, dy, d] = clothPoint(c, u, v, loft);
    const screenY = y + dy,
      z = depth + d;
    return [x + dx, SE * screenY + CE * z, -CE * screenY + SE * z];
  }
  const panel: Mat = {
    T: satin.T,
    pat(q) {
      const dx = q[0] - x,
        dy = SE * q[1] - CE * q[2] - y;
      const thickness = CE * q[1] + SE * q[2] - depth - (SE / CE) * (7 - dy);
      // Short velvet fibres and a broad warm highlight keep one continuous cloth face.
      const weave = Math.sin(2.7 * dx + dy) * Math.sin(2.9 * dy - 0.4 * dx);
      const light = Math.max(
        0,
        Math.min(1, 0.42 + 0.073 * thickness - 0.01 * dx - 0.02 * dy + weave * 0.018),
      );
      return nap[Math.round(24 * light)];
    },
  };
  const ring = (fraction: number, d: number, dy = 0) =>
    edge.map(([u, v]) => vertex(u * fraction, v * fraction + dy, d));
  const seam = ring(1, 0),
    lip = ring(0.86, 1.65),
    top = ring(0.52, 3.2, -0.4);
  const centre = vertex(-0.9, -1.1, 3.9);
  r.tag = 'pillow';
  for (let i = 0; i < edge.length; i++) {
    const j = (i + 1) % edge.length;
    r.poly([seam[i], seam[j], lip[j], lip[i]], piping);
    r.poly([lip[i], lip[j], top[j], top[i]], panel);
    r.poly([top[i], top[j], centre], panel);
    if (i % 3 === 1) r.line(lip[i], lip[j], stitch, 0, 0.94);
  }
  // The copper welt at the crown stays legible against the cream cheek as the lobe folds.
  const welt = ring(0.95, 0.95);
  for (let i = -2; i < 4; i++) {
    const j = (i + edge.length) % edge.length;
    r.line(welt[j], welt[(j + 1) % edge.length], piping.T[0], 0, 0.82);
  }
  for (const [x1, y1, x2, y2] of [
    [-1, -7, -1.4, -10],
    [5, 3, 7, 5],
    [-9, -2.1, -6, -1.5],
  ]) {
    r.line(vertex(x1, y1, 3.4), vertex(x2, y2, 3.4), crease, 0, 0.85);
  }
  if (c.fold > 0.08) {
    const bend = 4.1 * c.fold;
    const mid = vertex(0, -7.55, 3.64);
    r.line(vertex(-bend, -7.2, 3.58), mid, crease, 0, 0.85);
    r.line(mid, vertex(bend * 0.65, -8.5, 3.64), crease, 0, 0.85);
  }
  r.dot(centre, stitch, 0, 0.66);
  // These are vertices of the sewn outline, measured in the same projection as the painted tip.
  return { crown: seam[1], notch: seam[4] };
}
export function pillowOnPouf(c: Cushion) {
  const r = new Rig();
  r.innerInk = hx('#856b79');
  placePillow(r, c, 0, 0, 0);
  return renderRig(r, 39, 39, 19, 19, { outline: hx(ink), inner: 3.18 }).p.canvas();
}
