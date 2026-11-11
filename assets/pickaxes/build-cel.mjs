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
  const poly = (pts, c, o = {}) => P.push({ t: 'poly', pts, z: o.z ?? 0, d: o.d ?? 0.02, c, side: o.side, ol: o.ol ?? 0 });
  const cyl = (a, b, r, c, ol = 0.05) => P.push({ t: 'cyl', a, b, r, c, ol });
  const ball = (at, r, c, ol = 0.05) => P.push({ t: 'ball', at, r, c, ol });
  const glow = (at, r, c) => P.push({ t: 'glow', at, r, c });
  const decal = (pts, c, z, ol = 0.03) => poly(pts, c, { z, d: 0.02, ol });
  const both = (pts, fn) => { fn(pts); fn(mirror(pts)); };
  const metal = ri === 0 ? PAL.iron : ri === 1 ? PAL.steel : null;
  const headCol = metal || f.cr;
  const AD = 0.34; // arm thickness
  const FZ = AD / 2 + 0.012; // front face of the arms

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
      poly(body, mat[1], { d: AD, side: mat[2], ol: 0.07 });
      decal(shift(mir(armBand(e, 0.62, 0.97, a, b)), s), mat[0], FZ, 0);
      decal(shift(mir(armBand(e, 0.02, 0.26, a, b)), s), mat[2], FZ, 0);
      // micro: family-coloured inset on metal heads, gold rim on legendary
      if (ri <= 1 && family !== 'rift') decal(shift(mir(armBand(e, 0.3, 0.5, a, b * 0.92)), s), f.cr[1], FZ + 0.004, 0);
      if (ri === 3) decal(shift(mir(armBand(e, 0.86, 1.0, a, b * 0.96)), s), PAL.gold[1], FZ + 0.006, 0);
    }
    for (const x of extra) poly(mir(x), headCol[1], { d: AD * 0.8, side: headCol[2], ol: 0.06 });
    for (const fl of flames) { // a lick = outer flame + inner yellow tongue, rooted in the edge
      const base = xf(FLAME.map(([x, y]) => [x, y + 0.36]), fl.at[0], fl.at[1], fl.s, fl.rot - Math.PI / 2);
      poly(mir(base), headCol[1], { z: -0.04, d: AD * 0.7, side: headCol[2], ol: 0.06 });
      poly(mir(xf(FLAME.map(([x, y]) => [x * 0.55, y * 0.6 + 0.28]), fl.at[0], fl.at[1], fl.s, fl.rot - Math.PI / 2)), '#FFD23F', { z: AD * 0.35 + 0.01, d: 0.02, ol: 0 });
    }
    // family micro on the arm
    if (family === 'dynamite' && ri === 1) for (const t of [0.25, 0.5]) { // dynamite-stick bands
      const i = Math.round(t * (e.top.length - 1)); const p0 = e.bot[i], p1 = e.top[i];
      const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]; const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      decal(mir([rect(mid[0], mid[1], Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 1.08, 0.09, ang)].flat()), '#2E1212', FZ + 0.008, 0.02);
    }
    if (family === 'storm' && ri >= 1) { // a lightning streak along the arm
      decal(mir(armBand(e, 0.44, 0.56, 0.12, 0.8)), ri >= 2 ? '#FFFFFF' : f.cr[0], FZ + 0.008, 0);
    }
    if (family === 'rift' && ri <= 1) { // the crack running along a stone arm
      decal(mir(armBand(e, 0.46, 0.56, 0.1, 0.85).map(([x, y], k) => [x + (k % 3 === 0 ? 0.03 : -0.02), y])), f.glow, FZ + 0.008, 0.02);
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
  if (family === 'frost' && ri === 3) { // legendary: an ice crown behind the joint
    [[-0.34, 0.75, -0.25], [0, 1.05, 0], [0.34, 0.75, 0.25]].forEach(([x, h, rot]) => poly(xf([[-0.13, 0], [0.13, 0], [0.04, h], [-0.04, h]], x, CY + 0.35, 1, -rot), f.cr[0], { z: -0.12, d: 0.24, side: f.cr[2], ol: 0.06 }));
  }
  if (family === 'storm' && ri === 3) poly(xf(BOLT, 0, CY + 0.95, 1.1, 0), f.accent, { z: -0.12, d: 0.22, side: '#E0A800', ol: 0.06 }); // back bolt
  if (family === 'dynamite' && ri === 3) poly(star(0, CY + 0.2, 1.05, 0.62, 9), '#FFD23F', { z: -0.16, d: 0.12, side: '#FF8A1A', ol: 0.06 }); // blast behind

  // ---------- handle ----------
  const hc = ri === 0 ? PAL.wood : null;
  const handleCol = hc ? hc[1] : f.handle;
  cyl([0, -2.3, 0], [0, 1.25, 0], 0.15, handleCol, 0.055);
  decal(rect(-0.06, -0.5, 0.05, 3.3), hc ? hc[0] : '#FFFFFF', 0.152, 0); // highlight strip
  if (ri === 0) { for (const y of [-1.6, -0.6, 0.4]) decal(rect(0.04, y, 0.03, 0.5), PAL.wood[2], 0.153, 0); // grain
    for (let i = 0; i < 4; i++) decal(xf(rect(0, 0, 0.32, 0.07), 0, -2.0 + i * 0.13, 1, 0.3), f.cr[ri === 0 && family === 'frost' ? 2 : 1], 0.16, 0.02); } // rope in the family colour
  else for (let i = 0; i < 6; i++) decal(xf(rect(0, 0, 0.33, 0.1), 0, -2.05 + i * 0.17, 1, i % 2 ? -0.35 : 0.35), f.wrap, 0.16, 0.025);
  const capCol = ri === 0 ? PAL.iron[1] : ri === 1 ? PAL.steel[1] : PAL.gold[1];
  if (ri >= 1) { cyl([0, -2.38, 0], [0, -2.22, 0], 0.2, capCol); cyl([0, 0.95, 0], [0, 1.15, 0], 0.19, capCol); }
  if (ri >= 2) cyl([0, -1.08, 0], [0, -0.98, 0], 0.18, capCol);
  if (ri === 0) ball([0, -2.32, 0], 0.17, PAL.wood[1]);
  if (ri === 2) poly(xf([[0, 0.25], [0.15, 0], [0, -0.3], [-0.15, 0]], 0, -2.55, 1), f.cr[1], { d: 0.2, side: f.cr[2], ol: 0.05 });
  if (ri === 3) { poly(xf([[0, 0.3], [0.2, 0.02], [0, -0.42], [-0.2, 0.02]], 0, -2.65, 1), f.cr[1], { d: 0.26, side: f.cr[2], ol: 0.06 }); glow([0, -2.65, 0.1], 0.5, f.glow); }

  // ---------- joint + emblem ----------
  const JZ = 0.3; // joint half depth
  if (ri === 0) {
    poly(rect(0, CY, 0.78, 0.78), PAL.iron[1], { d: JZ * 2, side: PAL.iron[2], ol: 0.06 });
    decal(rect(0, CY + 0.27, 0.78, 0.14), PAL.iron[0], JZ + 0.01, 0);
    for (const [x, y] of [[-0.29, -0.29], [0.29, -0.29], [-0.29, 0.29], [0.29, 0.29]]) decal(circle(x, CY + y, 0.045, 8), PAL.iron[2], JZ + 0.012, 0.015);
  } else {
    const frame = ri === 1 ? PAL.steel : ri === 2 ? PAL.steel : PAL.gold;
    if (ri === 3) poly(star(0, CY, 0.82, 0.62, 6, Math.PI / 6), PAL.gold[1], { d: JZ * 1.6, side: PAL.gold[2], ol: 0.06, z: -0.02 });
    poly(circle(0, CY, 0.62, 6, Math.PI / 6), frame[1], { d: JZ * 2, side: frame[2], ol: 0.06 });
    const hx = circle(0, CY, 0.62, 6, Math.PI / 6);
    decal([hx[0], hx[1], hx[2], [-0.537, CY + 0.08], [0.537, CY + 0.08]], frame[0], JZ + 0.01, 0);
    if (ri === 2) decal(circle(0, CY, 0.56, 6, Math.PI / 6), PAL.gold[1], JZ + 0.012, 0.02);
  }
  // the emblem: on a disc (rare) or a faceted family gem (epic, legendary); engraved small on common
  const EZ = JZ + 0.03, es = ri === 0 ? 0.95 : 1.05;
  if (ri >= 1) {
    if (ri === 1) decal(circle(0, CY, 0.47, 24), f.disc, EZ - 0.01, 0.03);
    else { const g = f.gem || f.cr; decal(circle(0, CY, 0.5, 6, 0), g[2], EZ - 0.01, 0.03); decal([[0, CY], ...circle(0, CY, 0.5, 6, 0).slice(1, 4)], g[1], EZ - 0.005, 0); decal([[0, CY], ...circle(0, CY, 0.5, 6, 0).slice(4, 6), circle(0, CY, 0.5, 6, 0)[0]], g[0], EZ - 0.004, 0); }
  }
  const mc = ri === 0 ? f.cr[2] : f.mark;
  if (family === 'storm') decal(xf(BOLT, 0, CY, es * 0.62), mc, EZ, 0.03);
  else if (family === 'dynamite') {
    decal(circle(-0.05 * es, CY - 0.06 * es, 0.22 * es, 18), ri === 0 ? f.cr[2] : '#231414', EZ, 0.03);
    decal(circle(-0.11 * es, CY + 0.0, 0.06 * es, 10), '#FFFFFF', EZ + 0.003, 0);
    decal(xf(rect(0, 0, 0.07, 0.2), 0.13 * es, CY + 0.2 * es, es, -0.7), '#E8D2A6', EZ, 0.02);
    decal(star(0.22 * es, CY + 0.3 * es, 0.12 * es, 0.05 * es, 6), '#FFD23F', EZ + 0.004, 0.02);
  } else if (family === 'rift') {
    // a bold crack: a jagged wedge from top to bottom with two side branches
    const crack = [[-0.05, 0.4], [0.07, 0.4], [-0.02, 0.15], [0.12, 0.02], [-0.01, -0.16], [0.08, -0.42], [-0.08, -0.14], [0.02, 0.02], [-0.12, 0.14]];
    decal(xf(crack, 0, CY, es), mc, EZ, 0.03);
    decal(xf([[0, 0], [0.2, 0.1], [0.24, 0.04], [0.02, -0.06]], 0.06 * es, CY + 0.02 * es, es), mc, EZ, 0.025);
    decal(xf([[0, 0], [-0.2, -0.08], [-0.22, -0.02], [-0.02, 0.06]], -0.02 * es, CY - 0.1 * es, es), mc, EZ, 0.025);
  } else {
    for (let k = 0; k < 3; k++) decal(xf(rect(0, 0, 0.64, 0.09), 0, CY, es, (k * Math.PI) / 3), mc, EZ, 0.025);
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; for (const d of [-1, 1]) decal(xf(rect(0, 0, 0.16, 0.06), Math.cos(a) * 0.2 * es, CY + Math.sin(a) * 0.2 * es, es, a + d * 0.8), mc, EZ + 0.002, 0.02); }
  }
  if (ri >= 2) glow([0, CY, 0.4], ri === 3 ? 0.9 : 0.6, f.glow);

  // ---------- effects around: flat comic sprites, more with rarity ----------
  const fx = [0, 2, 4, 7][ri];
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
  return P;
}

const out = { picks: {} };
for (const family of Object.keys(FAM)) RARITIES.forEach((r, i) => (out.picks[`${family}_${r}`] = build(family, i)));
writeFileSync(new URL('./picks-cel.json', import.meta.url), JSON.stringify(out));
console.log('picks:', Object.keys(out.picks).length, 'max prims:', Math.max(...Object.values(out.picks).map((x) => x.length)));
