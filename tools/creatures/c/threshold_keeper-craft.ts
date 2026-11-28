import { readCreatureCard } from '../bodies/card-data';
import { hx, mixc } from '../kit/f11-mobkit';
import { F3, Rig, vadd, vlerp, type Mat, type Tones, type V3 } from '../rig/f15-rig';
export const card = readCreatureCard('threshold_keeper');
function pigment(name: string, offset = 0): Mat {
  const t = card.materials.find((m) => m.name === name)!.tones;
  return { T: [0, 1, 2, 3].map((k) => hx(t[k + offset])) as Tones };
}
export const fur = pigment('fur', 1),
  shadowFur = pigment('fur'),
  cream = pigment('cream', 1),
  rose = pigment('cream'),
  umber = pigment('umber'),
  leather = pigment('umber', 1);
export const coat = pigment('coat', 1),
  deep = pigment('coat'),
  tile = pigment('tile', 1),
  slate = pigment('tile'),
  wood = pigment('wood'),
  cherry = pigment('wood', 1),
  ruby = pigment('ruby'),
  silk = pigment('ruby', 1);
export const brass = pigment('brass', 1),
  bronze = pigment('brass'),
  plaster = pigment('plaster', 1),
  clay = pigment('plaster');
export const milk = hx('#fff3d4'),
  ink = hx('#242437'),
  glint = hx('#ffdc94'),
  mint = hx('#a1d9c1');
export const night: Mat = { T: [ink, ink, hx('#353748'), hx('#49505a')], flat: 1 };
export const lamp: Mat = { T: [hx('#aa655b'), hx('#e39668'), hx('#ffd28c'), milk], glow: 0.3, bias: 0.5 };
// Each swatch is a pigment ramp. Felt, glazed tile and old timber carry different-sized marks.
for (const m of [
  fur,
  shadowFur,
  cream,
  rose,
  umber,
  leather,
  coat,
  deep,
  tile,
  slate,
  wood,
  cherry,
  plaster,
  clay,
  brass,
  bronze,
  silk,
  ruby,
]) {
  const furred = [fur, cream, rose, shadowFur, umber, leather].includes(m),
    glazed = m === tile || m === slate;
  const colors = Array.from({ length: 36 }, (_, i) => {
    const v = (i * 3) / 35,
      k = Math.min(2, Math.floor(v));
    return mixc(m.T[k], m.T[k + 1], v - k);
  });
  m.pat = ([x, y, z], l) => {
    const tufts = furred
      ? Math.sin(27 * x + 17 * z + 8 * y) * Math.cos(19 * y - 9 * z)
      : Math.sin(x * 0.93 + y * 0.35 + z * 0.73) * Math.cos(z * 0.48 - y * 0.67);
    const broad = furred ? Math.sin(6 * z - 4 * y) : Math.sin(z * 0.51 + x * 0.22);
    const u = 0.4 + 0.47 * l + 0.041 * tufts + 0.027 * broad + (glazed ? 0.025 * Math.cos(y * 0.85 + x * 0.48) : 0);
    return colors[Math.max(0, Math.min(35, Math.round(u * 35)))];
  };
}
brass.spec = true;
export type Marks = Record<string, V3>;
/** A hewn solid. End grain, front and top remain distinct when the house turns. */
export function block(r: Rig, F: F3, c: V3, size: V3, wall: Mat, top = wall, end = wall) {
  const [a, b, z] = size.map((v) => v / 2),
    [x, y, h] = c;
  const corners = [
    [-a, -b],
    [-a, b],
    [a, b],
    [a, -b],
  ];
  const face = (v: number) => corners.map(([f, s]) => F.p(x + f, y + s, h + v));
  const low = face(-z),
    hi = face(z);
  r.poly(hi, top);
  r.poly(low, wall);
  for (let i = 0; i < 4; i++) r.poly([low[i], low[(i + 1) % 4], hi[(i + 1) % 4], hi[i]], i % 2 ? end : wall);
}
export function rod(r: Rig, F: F3, a: V3, b: V3, width: number, m: Mat, end = width) {
  r.cap(F.p(...a), F.p(...b), width, end, m);
}
export function leaf(r: Rig, F: F3, a: V3, b: V3, width: number, material: Mat, edge: Mat) {
  const base = F.p(...a),
    tip = F.p(...b),
    mid = vlerp(base, tip, 0.52);
  const L = vadd(mid, F.v(0, width, 0)),
    R = vadd(mid, F.v(0, -width, 0)),
    crest = vadd(mid, F.v(1.3, 0, 0.55));
  r.poly([base, L, crest], material);
  r.poly([base, crest, R], edge);
  r.poly([L, tip, crest], material);
  r.poly([crest, tip, R], edge);
}
export function key(r: Rig, F: F3, k = 1) {
  const K = F.scale(k);
  // A clover-shaped bow, solid shank and two differently cut teeth.
  for (let i = 0; i < 22; i++) {
    const u = (i * Math.PI) / 11,
      v = ((i + 1) * Math.PI) / 11;
    const ring = (t: number): V3 =>
      K.p(0, Math.cos(t) * (4.5 + 0.65 * Math.cos(t * 3)), Math.sin(t) * (4.8 + 0.65 * Math.cos(t * 3)));
    r.cap(ring(u), ring(v), 0.95, 0.95, i % 6 === 0 ? bronze : brass);
  }
  rod(r, K, [0, 0, -4.8], [0, 0, -17.6], 1.5, brass);
  for (const z of [-8, -14.5, -17.2]) rod(r, K, [0, 0, z], [0, z === -8 ? 2.1 : 4.1, z], 1.05, brass);
}
