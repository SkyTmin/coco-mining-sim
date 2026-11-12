// Cel-style pickaxes [владелец 11.11: стиль 6 доски `docs/design/mockups/pickaxe-style-board-2026-11-11.png`;
// «продолжай лепить как лепил — больше макро и микро, эффектов вокруг, различий между собой, связи с семьёй, значки
// семьи точнее»]. Flat colours with a light band and a dark band (no lighting), thick black outline, flat comic
// effects around the head.
// Model space: studs, handle along +Y, head across X, front +Z. Primitives:
//   poly  { pts:[[x,y]..], z, d, c, side, ol }  an extruded flat shape (Roblox: MeshPart from the same outline, or a
//          SurfaceGui image for the thin decals: bands, emblems, effects)
//   cyl   { a, b, r, c, ol }  ball { at, r, c, ol }  glow { at, r, c }  (ParticleEmitter / PointLight in Roblox)
// ol = outline width in studs (Roblox: Highlight, OutlineColor black, FillTransparency 1).
// Run: node assets/pickaxes/build-cel.mjs -> assets/pickaxes/picks-cel.json
import { writeFileSync } from 'node:fs';

const INK = '#15121E';
const PAL = {
  iron: ['#E0E5EE', '#9CA5B7', '#606A7E'],
  steel: ['#F7FAFF', '#C3CDDD', '#7F8AA0'],
  gold: ['#FFF3A6', '#FFC83D', '#C9870F'],
  wood: ['#D79A62', '#A8693A', '#6E4021'],
};
const FAM = {
  storm: { cr: ['#C9F6FF', '#45CFFF', '#1A78D6'], handle: '#2A3CA8', wrap: '#18257A', accent: '#FFE14D', disc: '#16246E', glow: '#4DD7FF', mark: '#FFE14D' },
  dynamite: { cr: ['#FFE0A6', '#FF6A2A', '#C0241A'], handle: '#5C1F1F', wrap: '#2E1212', accent: '#FFD23F', disc: '#3A0F0F', glow: '#FF7A1A', mark: '#FFFFFF' },
  rift: { cr: ['#FFE6B0', '#FFA51C', '#A3560E'], handle: '#3B2617', wrap: '#22150C', accent: '#FFB13D', disc: '#2A1A10', glow: '#FFA51C', mark: '#FFF1C2', gem: ['#FFB547', '#C9660E', '#6E3008'], stone: ['#B3A08C', '#7D6A58', '#4E4036'] },
  frost: { cr: ['#FFFFFF', '#BDEFFF', '#62BDE8'], handle: '#EAF4FB', wrap: '#9FD3EE', accent: '#7FE0FF', disc: '#1C5A8C', glow: '#AEEBFF', mark: '#FFFFFF', gem: ['#7FD0FF', '#3A9BE0', '#1C5A9C'] },
};
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const rad = (d) => (d * Math.PI) / 180;
const CY = 1.7, R = 2.25;

// ---------- 2D helpers ----------
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const circle = (cx, cy, r, n = 20, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const star = (cx, cy, r1, r2, n, a0 = Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = a0 + (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const xf = (pts, cx, cy, s, rot = 0, flip = 1) => pts.map(([x, y]) => { const c = Math.cos(rot), si = Math.sin(rot); x *= flip; return [cx + (x * c - y * si) * s, cy + (x * si + y * c) * s]; });
const rect = (cx, cy, w, h, rot = 0) => xf([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], cx, cy, 1, rot);
const BOLT = [[-0.16, 0.5], [0.22, 0.5], [0.04, 0.1], [0.26, 0.1], [-0.2, -0.56], [-0.04, -0.06], [-0.26, -0.06]];
const FLAME = [[0, 0.55], [0.12, 0.25], [0.26, 0.05], [0.24, -0.2], [0.12, -0.36], [0, -0.4], [-0.12, -0.36], [-0.24, -0.2], [-0.26, 0.05], [-0.1, 0.18]];

// ---------- the arm: a centreline from the joint to the tip + a width profile, then family shaping ----------
// returns { top:[[x,y]], bot:[[x,y]] } along t = 0..1 for the right arm (s = +1); the left arm is mirrored
function armEdges(opts) {
  const { n = 28, w0, w1 = 0.03, reach = 58, zig = 0, zigA = 0, jag = 0, seed = 1, flick = 0, flickH = 0, pow = 1 } = opts;
  const r = rng(seed);
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = rad(4 + t * (reach - 4));
    let c = [R * Math.sin(a), CY - R + R * Math.cos(a)];
    const nrm = [Math.sin(a), Math.cos(a)];
    if (zig) { // lightning: a sharp triangle wave across the centreline
      const ph = (t * zig) % 1;
      const tri = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4;
      c = add(c, nrm, tri * zigA * (1 - t * 0.5) * Math.min(1, t * 6));
    }
    let w = lerp(w0, w1, Math.pow(t, pow));
    let up = w / 2, dn = w / 2;
    if (jag && i > 0 && i < n) { up += (r() - 0.5) * jag; dn += (r() - 0.5) * jag; }
    if (flick && i > 1 && i < n - 1 && i % flick === 0) up += flickH * (1 - t * 0.6); // flame licks on the top edge
    top.push(add(c, nrm, up));
    bot.push(add(c, nrm, -dn));
  }
  return { top, bot };
}
const armPoly = (e, from = 0, to = 1) => {
  const n = e.top.length - 1, i0 = Math.round(from * n), i1 = Math.round(to * n);
  return [...e.bot.slice(i0, i1 + 1), ...e.top.slice(i0, i1 + 1).reverse()];
};
// a band between two fractions of the width (0 = bottom edge, 1 = top edge)
const armBand = (e, f0, f1, from = 0, to = 1) => {
  const n = e.top.length - 1, i0 = Math.round(from * n), i1 = Math.round(to * n);
  const at = (i, f) => [lerp(e.bot[i][0], e.top[i][0], f), lerp(e.bot[i][1], e.top[i][1], f)];
  const lo = [], hi = [];
  for (let i = i0; i <= i1; i++) { lo.push(at(i, f0)); hi.push(at(i, f1)); }
  return [...lo, ...hi.reverse()];
};
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

function build(family, ri) {
  const f = FAM[family];
  const P = [];
  const poly = (pts, c, o = {}) => P.push({ t: 'poly', pts, z: o.z ?? 0, d: o.d ?? 0.02, c, side: o.side, ol: o.ol ?? 0, ...(o.nobevel ? { nobevel: 1 } : {}) });
  const cyl = (a, b, r, c, ol = 0.05) => P.push({ t: 'cyl', a, b, r, c, ol });
  const ball = (at, r, c, ol = 0.05, zs = 0) => P.push({ t: 'ball', at, r, c, ol, zs });
  // zs: the export thickens the metal ×THICK; a rivet / stud placed on a face follows that face
  const stud = (x, y, z, r, c) => { ball([x, y, z], r, c, 0, 1); ball([x, y, -z], r, c, 0, 1); }; // no ink: tiny, and budget
  const ring = (y, h, r, c, tilt = 0, ol = 0.03) => cyl([tilt, y, 0], [-tilt, y + h, 0], r, c, ol);
  const box = (at, sz, c, top, side, ol = 0.04) => P.push({ t: 'box', at, s: sz, c, top: top || c, side: side || c, ol });
  const glow = (at, r, c) => P.push({ t: 'glow', at, r, c });
  const decal = (pts, c, z, ol = 0.03) => poly(pts, c, { z, d: 0.02, ol });
  const both = (pts, fn) => { fn(pts); fn(mirror(pts)); };
  const metal = ri === 0 ? PAL.iron : ri === 1 ? PAL.steel : null;
  const headCol = metal || f.cr;
  const AD = 0.34; // thickness of the attached pieces (flames, icicles, forks)
  // [владелец 12.11: «сбоку плоско/кирпич»] a stepped forged cross-section: a thin cutting edge, a thicker ridge,
  // the thickest core; the ridge and core stop short of the tip, so the arm runs out into a sharp point
  const AE = 0.17; // the edge (the whole arm outline)
  const FZ = AE / 2 + 0.012; // its front face
  const RD = 0.34; // the ridge
  const RZ = RD / 2 + 0.012;
  const CD = 0.46; // the core
  const CZ = CD / 2 + 0.012;

  // ---------- macro: family silhouette, growing with rarity ----------
  let e, extra = []; const flames = [];
  if (family === 'storm') {
    e = armEdges({ w0: 0.62 + ri * 0.04, w1: 0.04, reach: 56 + ri * 3, zig: [1.5, 2, 2.5, 3][ri], zigA: [0.1, 0.17, 0.22, 0.26][ri], pow: 1.2 });
    if (ri >= 2) { // forked tip: a second, shorter bolt branching down
      const base = e.bot[Math.round(e.bot.length * 0.62)];
      const k = ri === 3 ? 1.25 : 1;
      extra.push(xf([[0, 0.12], [0.1, 0.08], [0.02, -0.1], [0.16, -0.14], [0.02, -0.62], [-0.08, -0.18], [-0.12, -0.02]], base[0], base[1], k, 0.25));
    }
  } else if (family === 'dynamite') {
    e = armEdges({ w0: 0.66 + ri * 0.05, w1: 0.05, reach: 54 + ri * 3, pow: 0.9 });
    if (ri >= 2) (ri === 3 ? [0.18, 0.36, 0.54, 0.72] : [0.25, 0.5]).forEach((t, k) => { // flame licks on the back edge
      const i = Math.round(t * (e.top.length - 1)); const p = e.top[i], q = e.top[i + 1];
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      flames.push({ at: p, rot: ang + Math.PI / 2 + 0.55, s: (ri === 3 ? 0.95 : 0.75) * (1 - t * 0.45) });
    });
  } else if (family === 'rift') {
    e = armEdges({ w0: 0.7 + ri * 0.04, w1: 0.06, reach: 55 + ri * 3, jag: [0.08, 0.12, 0.16, 0.18][ri], seed: 7 + ri, n: 18, pow: 0.8 });
  } else {
    e = armEdges({ w0: 0.56 + ri * 0.03, w1: 0.015, reach: 58 + ri * 4, pow: 1.6 });
  }
  // rift splits the arm into floating shards from epic; legendary also pulls the halves apart
  const segs = family === 'rift' && ri >= 2 ? [[0, 0.36], [0.42, 0.7], [0.76, 1]] : [[0, 1]];
  const spread = family === 'rift' && ri === 3 ? 0.16 : 0;
  const shift = (pts, s) => pts.map(([x, y]) => [x + s * spread, y]);

  if (family === 'rift' && ri >= 1) { // the glowing crack behind everything
    glow([0, CY, -0.2], ri === 3 ? 1.6 : 0.9, f.glow);
  }
  if (ri === 3) glow([0, CY + 0.15, -0.3], 2.4, f.glow);

  for (const s of [1, -1]) {
    const mir = (pts) => (s > 0 ? pts : mirror(pts));
    for (const [a, b] of segs) {
      const body = shift(mir(armPoly(e, a, b)), s);
      const mat = family === 'rift' && ri <= 1 ? f.stone : headCol;
      poly(body, mat[1], { d: AE, side: mat[2], ol: 0.07 });
      decal(shift(mir(armBand(e, 0.62, 0.97, a, b)), s), mat[0], FZ, 0);
      decal(shift(mir(armBand(e, 0.02, 0.26, a, b)), s), mat[2], FZ, 0);
      // the sharpened cutting edge: a bright hairline along the bottom, from the middle of the arm to the tip
      decal(shift(mir(armBand(e, 0.0, 0.07, Math.max(a, 0.18), b)), s), ri <= 1 ? '#FFFFFF' : mat[0], FZ + 0.002, 0);
      // macro: the spine ridge (raised in the middle of the arm, both faces), with its own light top
      const rb = Math.min(b, 0.84), cb = Math.min(b, 0.62);
      if (rb > a + 0.05) {
        poly(shift(mir(armBand(e, 0.28, 0.82, a, rb)), s), mat[1], { d: RD, side: mat[2], ol: 0, nobevel: 1 });
        decal(shift(mir(armBand(e, 0.7, 0.82, a, rb)), s), mat[0], RZ, 0);
        decal(shift(mir(armBand(e, 0.28, 0.36, a, rb)), s), mat[2], RZ, 0);
      }
      if (cb > a + 0.05) {
        poly(shift(mir(armBand(e, 0.42, 0.68, a, cb)), s), mat[1], { d: CD, side: mat[2], ol: 0 });
        decal(shift(mir(armBand(e, 0.6, 0.68, a, cb)), s), mat[0], CZ, 0);
      }
      // micro: family-coloured inset on metal heads, gold rim on legendary
      if (ri <= 1 && family !== 'rift') decal(shift(mir(armBand(e, 0.46, 0.56, a, cb * 0.95)), s), f.cr[1], CZ + 0.004, 0);
      if (ri >= 2) decal(shift(mir(armBand(e, 0.86, 1.0, a, b * 0.96)), s), ri === 3 ? PAL.gold[1] : PAL.steel[0], FZ + 0.006, 0);
      if (ri === 3) decal(shift(mir(armBand(e, 0.04, 0.12, Math.max(a, 0.1), b * 0.8)), s), PAL.gold[0], FZ + 0.006, 0);
    }
    for (const x of extra) poly(mir(x), headCol[1], { d: AD * 0.8, side: headCol[2], ol: 0.06 });
    for (const fl of flames) { // a lick = outer flame + inner yellow tongue, rooted in the edge
      const base = xf(FLAME.map(([x, y]) => [x, y + 0.36]), fl.at[0], fl.at[1], fl.s, fl.rot - Math.PI / 2);
      poly(mir(base), headCol[1], { z: -0.04, d: AD * 0.7, side: headCol[2], ol: 0.06 });
      poly(mir(xf(FLAME.map(([x, y]) => [x * 0.55, y * 0.6 + 0.28]), fl.at[0], fl.at[1], fl.s, fl.rot - Math.PI / 2)), '#FFD23F', { z: AD * 0.35 + 0.01, d: 0.02, ol: 0 });
    }
    // micro: domed rivets along the ridge (both faces), more with rarity; gold on legendary
    const rivetC = ri === 0 ? PAL.iron[2] : ri === 1 ? PAL.steel[1] : PAL.gold[1];
    [[0.16], [0.14, 0.34], [0.12, 0.3, 0.48], [0.12, 0.3, 0.48]][ri].forEach((t) => {
      const i = Math.round(t * (e.top.length - 1));
      const px = lerp(e.bot[i][0], e.top[i][0], 0.55), py = lerp(e.bot[i][1], e.top[i][1], 0.55);
      stud(s * (px + spread), py, CD / 2, 0.055, rivetC);
    });
    // family 3D on the arm tip: tesla balls (storm), a fuse cap (dynamite)
    const tip = [(e.top[e.top.length - 1][0] + e.bot[e.bot.length - 1][0]) / 2, (e.top[e.top.length - 1][1] + e.bot[e.bot.length - 1][1]) / 2];
    if (family === 'storm' && ri >= 2) ball([s * (tip[0] - 0.02), tip[1] + 0.06, 0], ri === 3 ? 0.12 : 0.09, f.accent, 0.035);
    // family micro on the arm
    if (family === 'dynamite' && ri === 1) for (const t of [0.25, 0.5]) { // dynamite-stick bands
      const i = Math.round(t * (e.top.length - 1)); const p0 = e.bot[i], p1 = e.top[i];
      const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      decal(mir([rect(mid[0], mid[1], Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 1.08, 0.09, ang)].flat()), '#2E1212', CZ + 0.008, 0.02);
    }
    if (family === 'storm' && ri >= 1) { // a lightning streak along the arm
      decal(mir(armBand(e, 0.5, 0.58, 0.1, 0.6)), ri >= 2 ? '#FFFFFF' : f.cr[0], CZ + 0.008, 0);
    }
    if (family === 'rift' && ri <= 1) { // the crack running along a stone arm
      decal(mir(armBand(e, 0.48, 0.58, 0.1, 0.84).map(([x, y], k) => [x + (k % 3 === 0 ? 0.03 : -0.02), y])), f.glow, CZ + 0.008, 0.02);
    }
    if (family === 'frost') { // icicles hanging under the arm, more with rarity
      const ts = [[], [0.35, 0.6], [0.25, 0.45, 0.65], [0.2, 0.36, 0.52, 0.68]][ri];
      ts.forEach((t, k) => {
        const i = Math.round(t * (e.bot.length - 1)); const p = e.bot[i], q = e.bot[i + 1];
        const len = 0.28 + 0.12 * ((k + ri) % 2) + ri * 0.04;
        poly(mir([[p[0] - 0.07, p[1] + 0.04], [q[0] + 0.07, q[1] + 0.04], [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) - len]]), headCol[1], { d: AD * 0.6, side: headCol[2], ol: 0.05 });
      });
      if (ri >= 2) [0.3, 0.55].forEach((t) => { // crystal spikes on top
        const i = Math.round(t * (e.top.length - 1)); const p = e.top[i];
        poly(mir([[p[0] - 0.08, p[1] - 0.05], [p[0] + 0.08, p[1] - 0.05], [p[0] + 0.03, p[1] + 0.3 + ri * 0.04]]), f.cr[0], { d: AD * 0.5, side: f.cr[2], ol: 0.05 });
      });
    }
  }
  if ((family === 'rift' || family === 'frost') && ri >= 1) { // a crystal cluster growing out of the top of the joint
    const g = f.gem || f.cr;
    const spikes = ri === 1 ? [[0.12, 0.42, -0.25]] : ri === 2 ? [[-0.16, 0.5, 0.3], [0.14, 0.62, -0.2]] : [[-0.26, 0.5, 0.45], [0, 0.72, 0], [0.26, 0.5, -0.45]];
    if (!(family === 'frost' && ri === 3)) spikes.forEach(([x, h, rot]) => {
      const pts = xf([[-0.11, 0], [0.11, 0], [0.05, h * 0.8], [0, h], [-0.05, h * 0.8]], x, CY + 0.3, 1, -rot * 0.6);
      poly(pts, g[1], { z: -0.06, d: 0.3, side: g[2], ol: 0.05 });
      decal(xf([[-0.03, 0.05], [0.03, 0.05], [0.0, h * 0.85]], x, CY + 0.3, 1, -rot * 0.6), g[0], 0.105, 0);
    });
  }
  if (family === 'frost' && ri === 3) { // legendary: an ice crown behind the joint
    [[-0.34, 0.75, -0.25], [0, 1.05, 0], [0.34, 0.75, 0.25]].forEach(([x, h, rot]) => poly(xf([[-0.13, 0], [0.13, 0], [0.04, h], [-0.04, h]], x, CY + 0.35, 1, -rot), f.cr[0], { z: -0.12, d: 0.24, side: f.cr[2], ol: 0.06 }));
  }
  if (family === 'storm' && ri === 3) poly(xf(BOLT, 0, CY + 0.95, 1.1, 0), f.accent, { z: -0.12, d: 0.22, side: '#E0A800', ol: 0.06 }); // back bolt
  if (family === 'dynamite' && ri === 3) poly(star(0, CY + 0.2, 1.05, 0.62, 9), '#FFD23F', { z: -0.16, d: 0.12, side: '#FF8A1A', ol: 0.06 }); // blast behind

  // ---------- handle ----------
  const hc = ri === 0 ? PAL.wood : null;
  const handleCol = hc ? hc[1] : f.handle;
  cyl([0, -2.3, 0], [0, 1.25, 0], 0.15, handleCol, 0.055);
  // no flat stripes on the round handle: a decal floats off the cylinder and shows as a loose line from the side
  // [владелец 12.11: «полоски у рукоятки портят вид»]
  const capCol = ri === 0 ? PAL.iron[1] : ri === 1 ? PAL.steel[1] : PAL.gold[1];
  // the grip is 3D rings now (visible from every side), not stripes painted on the front
  if (ri === 0) {
    const rope = family === 'frost' ? f.cr[2] : f.cr[1];
    for (let i = 0; i < 5; i++) ring(-2.08 + i * 0.1, 0.075, 0.172, i % 2 ? rope : PAL.wood[0], 0.025, 0.02); // rope
    ring(0.92, 0.2, 0.19, PAL.iron[1], 0, 0.04); // iron socket band under the head
    ring(0.97, 0.04, 0.2, PAL.iron[0], 0, 0);
  } else {
    // leather grip: rings slanted alternately like a wound strap, a lighter edge every other turn
    const n = ri === 1 ? 6 : 8;
    for (let i = 0; i < n; i++) ring(-2.12 + i * 0.14, 0.12, 0.178, i % 2 ? f.wrap : f.handle, i % 2 ? 0.03 : -0.03, 0.025);
    ring(-2.38, 0.16, 0.2, capCol); // pommel ferrule
    ring(-2.14 + n * 0.14, 0.06, 0.19, capCol, 0, 0.03); // grip end ferrule
    ring(0.92, 0.24, 0.2, capCol); // socket
    ring(0.98, 0.05, 0.215, ri === 1 ? PAL.steel[0] : PAL.gold[0], 0, 0);
  }
  if (ri >= 2) ring(-1.08 + (ri === 3 ? 0.18 : 0), 0.1, 0.18, capCol);
  if (ri === 3) for (const y of [-0.45, 0.0, 0.45]) ring(y, 0.07, 0.168, PAL.gold[1], 0.04, 0.025); // gold spiral bands
  // family 3D on the handle
  if (family === 'storm' && ri >= 1) // a copper coil wound under the head
    for (let i = 0; i < 4 + ri; i++) ring(0.25 + i * 0.12, 0.06, 0.168, i % 2 ? '#B5652A' : '#E89A4C', 0.05, 0.02);
  if (family === 'dynamite' && ri >= 1) { // dynamite sticks strapped behind the shaft, with fuses
    const xs = ri === 1 ? [0] : ri === 2 ? [-0.1, 0.1] : [-0.18, 0, 0.18];
    for (const x of xs) {
      cyl([x, -0.95, -0.24], [x, -0.05, -0.24], 0.095, '#D8352A', 0.035);
      cyl([x, -0.35, -0.24], [x, -0.27, -0.24], 0.1, '#F2E6CF', 0); // paper band
      cyl([x, -0.05, -0.24], [x + 0.05, 0.12, -0.3], 0.02, '#E8D2A6', 0.015); // fuse
    }
    for (const y of [-0.8, -0.2]) box([0, y, -0.12], [Math.max(0.36, xs.length * 0.2 + 0.12), 0.06, 0.36], '#3A2418', '#5A3A28', '#2A1810', 0.025); // straps
  }
  if (ri === 0) ball([0, -2.32, 0], 0.17, PAL.wood[1]);
  if (ri === 2) poly(xf([[0, 0.25], [0.15, 0], [0, -0.3], [-0.15, 0]], 0, -2.55, 1), f.cr[1], { d: 0.2, side: f.cr[2], ol: 0.05 });
  if (ri === 3) { poly(xf([[0, 0.3], [0.2, 0.02], [0, -0.42], [-0.2, 0.02]], 0, -2.65, 1), f.cr[1], { d: 0.26, side: f.cr[2], ol: 0.06 }); glow([0, -2.65, 0.1], 0.5, f.glow); }

  // ---------- joint + emblem ----------
  const JZ = 0.24; // joint half depth
  if (ri === 0) {
    // an octagonal iron collar (a square block read as a brick from the side)
    const oct = circle(0, CY, 0.46, 8, Math.PI / 8);
    poly(oct, PAL.iron[1], { d: JZ * 2, side: PAL.iron[2], ol: 0.06 });
    decal([oct[1], oct[2], oct[3], [-0.4, CY + 0.2], [0.4, CY + 0.2]], PAL.iron[0], JZ + 0.01, 0);
    decal([oct[5], oct[6], [0.4, CY - 0.26], [-0.4, CY - 0.26]], PAL.iron[2], JZ + 0.01, 0);
    for (const [x, y] of [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]]) stud(x, CY + y, JZ, 0.07, PAL.iron[2]);
  } else {
    const frame = ri === 1 ? PAL.steel : ri === 2 ? PAL.steel : PAL.gold;
    if (ri === 3) poly(star(0, CY, 0.82, 0.62, 6, Math.PI / 6), PAL.gold[1], { d: JZ * 1.6, side: PAL.gold[2], ol: 0.06, z: -0.02 });
    poly(circle(0, CY, 0.62, 6, Math.PI / 6), frame[1], { d: JZ * 2, side: frame[2], ol: 0.06 });
    const hx = circle(0, CY, 0.62, 6, Math.PI / 6);
    decal([hx[0], hx[1], hx[2], [-0.537, CY + 0.08], [0.537, CY + 0.08]], frame[0], JZ + 0.01, 0);
    if (ri === 2) decal(circle(0, CY, 0.56, 6, Math.PI / 6), PAL.gold[1], JZ + 0.012, 0.02);
    // rivets in the frame corners
    for (const [x, y] of circle(0, 0, 0.55, 6, 0)) stud(x, CY + y, JZ, ri === 3 ? 0.06 : 0.05, ri === 1 ? PAL.steel[2] : PAL.gold[2]);
  }
  // the emblem: on a disc (rare) or a faceted family gem (epic, legendary); engraved small on common
  // the emblem sits on the top gem layer from epic (front 0.45), on the joint before
  const EZ = ri >= 2 ? 0.39 : JZ + 0.03, es = ri === 0 ? 0.95 : ri >= 2 ? 0.72 : 1.05;
  // [владелец 12.11: «эмблемы плохо читаются»] always a contrasting plate under the mark, a thick ink rim
  const plate = family === 'dynamite' ? '#FFE9C2' : f.disc;
  if (ri === 0) decal(circle(0, CY, 0.42, 20), plate, EZ - 0.01, 0.035);
  if (ri >= 1) {
    if (ri === 1) { decal(circle(0, CY, 0.5, 24), PAL.steel[0], EZ - 0.012, 0.035); decal(circle(0, CY, 0.43, 24), plate, EZ - 0.01, 0); }
    else {
      // a faceted gem that stands out of the frame on both faces: three stepped bevelled layers, dark to light
      const g = f.gem || f.cr;
      poly(circle(0, CY, 0.52, 6, 0), g[2], { d: 0.56, side: g[2], ol: 0.04 });
      poly(circle(0, CY, 0.45, 6, 0), g[1], { d: 0.66, side: g[2], ol: 0 });
      // the facet ring: light top-left, dark bottom-right, around the flat table that carries the emblem
      const hx = circle(0, CY, 0.45, 6, 0);
      decal([[0, CY], hx[1], hx[2], hx[3]], g[0], 0.335, 0);
      poly(circle(0, CY, 0.34, 24), plate, { d: 0.74, side: g[2], ol: 0.03 });
    }
  }
  // [владелец 12.11: «не больше, а детальнее — чтобы было видно, что это»] layered pictograms, each read at a glance:
  // storm = a cloud with a bolt, dynamite = a bundle of sticks with a lit fuse, rift = a rock split by a glowing crack,
  // frost = a branched snowflake. Every layer has ink; layers step forward 0.004.
  const L = (k) => EZ + k * 0.004;
  const at = (pts, k = 1) => xf(pts, 0, CY, es * k);
  if (family === 'storm') {
    const cloud = [...circle(-0.17, 0.12, 0.13, 10, Math.PI * 0.5).slice(0, 7), ...circle(0.0, 0.2, 0.17, 12, Math.PI * 0.9).slice(0, 8), ...circle(0.19, 0.1, 0.12, 10, Math.PI * 1.3).slice(0, 7)];
    decal(at([[-0.3, 0.02], ...cloud.filter(([, y]) => y > 0.02), [0.31, 0.02]]), '#E8EEF8', L(0), 0.03);
    decal(at([[-0.26, 0.03], [0.27, 0.03], [0.24, 0.07], [-0.22, 0.07]]), '#A9B6CC', L(1), 0); // cloud underside
    const bolt = [[0.02, 0.06], [0.16, 0.06], [0.05, -0.1], [0.15, -0.1], [-0.1, -0.42], [-0.02, -0.16], [-0.12, -0.16]];
    decal(at(bolt), f.accent, L(2), 0.03);
    decal(at([[0.06, 0.04], [0.11, 0.04], [0.02, -0.1], [-0.01, -0.1]]), '#FFFFFF', L(3), 0); // bolt highlight
  } else if (family === 'dynamite') {
    for (const [x, rot] of [[-0.15, 0.12], [0.15, -0.12], [0, 0]]) { // back two first, then the front stick
      const stick = xf([[-0.085, -0.3], [0.085, -0.3], [0.085, 0.22], [0.05, 0.26], [-0.05, 0.26], [-0.085, 0.22]], x, -0.04, 1, rot);
      decal(at(stick), x === 0 ? '#E8402F' : '#B82A20', L(x === 0 ? 2 : 0), 0.03);
      decal(at(xf(rect(0, 0.0, 0.17, 0.07), x, -0.04, 1, rot)), '#F4E9D2', L(x === 0 ? 3 : 1), 0); // paper band
      if (x === 0) decal(at(xf(rect(-0.045, -0.02, 0.03, 0.42), x, -0.04, 1, rot)), '#FF8A6E', L(3), 0); // shine
    }
    decal(at(rect(0, -0.16, 0.44, 0.06)), '#3A2418', L(4), 0.02); // the tie round the bundle
    decal(at([[0.0, 0.22], [0.03, 0.22], [0.1, 0.3], [0.16, 0.31], [0.16, 0.34], [0.09, 0.33], [0.0, 0.25]]), '#E8D2A6', L(4), 0.015); // fuse
    decal(at(star(0.2, 0.34, 0.11, 0.045, 7)), '#FFD23F', L(5), 0.02);
    decal(at(star(0.2, 0.34, 0.05, 0.02, 7)), '#FFFFFF', L(6), 0);
  } else if (family === 'rift') {
    const rock = [[-0.32, -0.12], [-0.22, -0.3], [0.06, -0.34], [0.3, -0.2], [0.33, 0.08], [0.18, 0.3], [-0.1, 0.33], [-0.3, 0.16]];
    decal(at(rock), '#8C7A66', L(0), 0.03);
    decal(at([[-0.3, 0.16], [-0.1, 0.33], [0.18, 0.3], [0.1, 0.18], [-0.18, 0.12]]), '#B9A68F', L(1), 0); // lit top
    decal(at([[0.3, -0.2], [0.06, -0.34], [0.0, -0.24], [0.2, -0.12]]), '#5A4A3C', L(1), 0); // shadow
    const crack = [[-0.04, 0.36], [0.06, 0.36], [0.0, 0.14], [0.1, 0.02], [0.01, -0.14], [0.07, -0.38], [-0.04, -0.38], [-0.07, -0.14], [0.01, 0.02], [-0.09, 0.14]];
    decal(at(crack), '#FFB13D', L(2), 0.025);
    decal(at([[-0.01, 0.3], [0.02, 0.3], [-0.02, 0.14], [0.05, 0.02], [-0.01, -0.12], [0.02, -0.3], [-0.01, -0.3], [-0.03, -0.12], [0.02, 0.02], [-0.04, 0.14]]), '#FFF4C8', L(3), 0); // white-hot core
    for (const [x, y, r] of [[0.38, 0.26, 0.05], [-0.4, -0.24, 0.04], [0.42, -0.08, 0.03]]) decal(at(xf([[-1, -0.6], [0.8, -1], [1, 0.7], [-0.5, 1]], x, y, r)), '#8C7A66', L(2), 0.015); // flying chips
  } else {
    const ice = '#BDEFFF';
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 2;
      const arm = xf(rect(0, 0.19, 0.075, 0.38), 0, 0, 1, a - Math.PI / 2);
      decal(at(arm), ice, L(0), 0.025);
      for (const [d, len, w] of [[0.17, 0.13, 0.05], [0.28, 0.09, 0.04]]) for (const side of [-1, 1]) {
        const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
        decal(at(xf(rect(0, len / 2, w, len), cx, cy, 1, a - Math.PI / 2 + side * 0.85)), ice, L(0), 0.02);
      }
      decal(at(xf(rect(0, 0.2, 0.025, 0.3), 0, 0, 1, a - Math.PI / 2)), '#FFFFFF', L(1), 0); // bright spine
      decal(at(xf([[0, 0.43], [0.05, 0.37], [0, 0.33], [-0.05, 0.37]], 0, 0, 1, a - Math.PI / 2)), '#FFFFFF', L(1), 0.015); // tip crystal
    }
    decal(at(circle(0, 0, 0.1, 6, Math.PI / 6)), '#FFFFFF', L(2), 0.02);
    decal(at(circle(0, 0, 0.05, 6, 0)), '#7FD0FF', L(3), 0);
  }
  if (ri >= 2) glow([0, CY, 0.4], ri === 3 ? 0.9 : 0.6, f.glow);

  // ---------- effects around: flat comic sprites, more with rarity ----------
  const fx = [0, 2, 4, 7][ri];
  const fxStart = P.length; // everything from here is a floating effect: the game spins it around the head
  const r = rng(31 + ri * 7 + family.length);
  const spots = [[-1.9, 2.6], [1.95, 2.55], [0.95, 3.25], [-1.05, 3.3], [2.45, 1.35], [-2.5, 1.4], [0, 3.6]];
  for (let k = 0; k < fx; k++) {
    const [x, y] = spots[k]; const s = (0.55 + r() * 0.3) * (ri === 3 ? 1.15 : 1); const rot = (r() - 0.5) * 0.9;
    const z = 0.25, o = { z, d: 0.06, ol: 0.035 };
    if (family === 'storm') k % 2 ? poly(star(x, y, s * 0.42, s * 0.12, 4, rot), '#FFFFFF', o) : poly(xf(BOLT, x, y, s, rot), f.accent, o);
    else if (family === 'dynamite') {
      if (k % 3 === 0) { poly(star(x, y, s * 0.55, s * 0.32, 8, rot), '#FFD23F', o); poly(star(x, y, s * 0.3, s * 0.16, 8, rot), '#FF6A2A', { ...o, z: z + 0.04, ol: 0 }); }
      else if (k % 3 === 1) poly(xf(FLAME, x, y, s * 0.9, rot), '#FF6A2A', o);
      else poly(star(x, y, s * 0.35, s * 0.1, 4, rot), '#FFF3A6', o);
    } else if (family === 'rift') {
      if (k % 2) poly(xf([[-0.2, -0.12], [0.12, -0.2], [0.22, 0.08], [-0.05, 0.22]], x, y, s * 1.1, rot), f.stone[1], o);
      else poly(xf([[0, 0.4], [0.07, 0.1], [-0.05, 0], [0.06, -0.4], [-0.03, -0.05], [0.07, 0.05], [-0.06, 0.1]], x, y, s * 1.1, rot), f.glow, o);
    } else {
      if (k % 2) poly(star(x, y, s * 0.4, s * 0.12, 4, rot), '#FFFFFF', o);
      else for (let q = 0; q < 3; q++) poly(xf(rect(0, 0, 0.62, 0.11), x, y, s, rot + (q * Math.PI) / 3), '#FFFFFF', { ...o, z: z + q * 0.002 });
    }
  }
  for (let i = fxStart; i < P.length; i++) P[i].fx = 1;
  return P;
}

const out = { picks: {} };
for (const family of Object.keys(FAM)) RARITIES.forEach((r, i) => (out.picks[`${family}_${r}`] = build(family, i)));
writeFileSync(new URL('./picks-cel.json', import.meta.url), JSON.stringify(out));
console.log('picks:', Object.keys(out.picks).length, 'max prims:', Math.max(...Object.values(out.picks).map((x) => x.length)));
