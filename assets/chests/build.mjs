// Chests in the pickaxe cel style [владелец 11.11: стиль 6, «приступай к остальному»; TZ-04 §7, §9, §11 Config.art.chests].
// Wall chests sit in one mine cell (1×1×1 studs × cell size): wood 80 % / silver 15 % / gold 4.5 % / crystal 0.5 %;
// the Pickaxe Chest opens with a key. Primitives as in assets/pickaxes/build-cel.mjs plus
//   box  { at, s, c, top, side, ol }  (Roblox Part, SmoothPlastic; top/side are the cel light/dark tones)
//   hcyl { at, r, len, c, ol }        (half cylinder lid along X: a Cylinder Part clipped by the body, or a MeshPart)
// Run: node assets/chests/build.mjs -> assets/chests/chests.json; preview: assets/pickaxes/preview-cel.html?data=../chests/chests.json
import { writeFileSync } from 'node:fs';

const C = {
  wood: ['#E0A86E', '#B0703C', '#74431F'], woodDark: ['#8C5A36', '#5E3A22', '#3B2414'],
  iron: ['#D5DBE6', '#98A1B3', '#5F6778'], silver: ['#FFFFFF', '#CBD5E4', '#8592A8'],
  gold: ['#FFF3A6', '#FFC83D', '#C9870F'], velvet: ['#F0617A', '#C8203F', '#7E0F27'],
  crystal: ['#F3D9FF', '#B66BFF', '#6B2DC8'], cyan: ['#D2FBFF', '#5DE4FF', '#1E9CD6'],
  navy: ['#4A5BB8', '#28337A', '#161C4A'], key: '#2A1A10',
};
const rad = (d) => (d * Math.PI) / 180;
const circle = (cx, cy, r, n = 20, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const star = (cx, cy, r1, r2, n, a0 = Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = a0 + (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const xf = (pts, cx, cy, s, rot = 0) => pts.map(([x, y]) => { const c = Math.cos(rot), si = Math.sin(rot); return [cx + (x * c - y * si) * s, cy + (x * si + y * c) * s]; });
const rect = (cx, cy, w, h, rot = 0) => xf([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], cx, cy, 1, rot);
const KEYHOLE = [...circle(0, 0.05, 0.06, 12)].concat([[0.035, 0.02], [0.05, -0.12], [-0.05, -0.12], [-0.035, 0.02]]);

function chest(kind) {
  const P = [];
  const box = (at, s, c, o = {}) => P.push({ t: 'box', at, s, c: c[1] ?? c, top: o.top ?? c[0], side: o.side ?? c[2], ol: o.ol ?? 0.035 });
  const poly = (pts, c, z, o = {}) => P.push({ t: 'poly', pts, z, d: o.d ?? 0.02, c, side: o.side, ol: o.ol ?? 0.02 });
  const glow = (at, r, c) => P.push({ t: 'glow', at, r, c });
  const W = 1, D = 0.78, BH = 0.56, LH = 0.34; // body and lid
  const by = -0.2, ly = by + BH / 2 + LH / 2 + 0.005;
  const FZ = D / 2 + 0.012;
  const body = { wood: C.wood, silver: C.woodDark, gold: C.gold, crystal: C.crystal }[kind];
  const lid = { wood: C.wood, silver: C.woodDark, gold: C.velvet, crystal: C.cyan }[kind];
  const trim = { wood: C.iron, silver: C.silver, gold: C.gold, crystal: C.gold }[kind];

  box([0, by, 0], [W, BH, D], body);
  box([0, ly, 0], [W * 1.03, LH, D * 1.03], lid);
  // planks / panels on the front
  if (kind === 'wood' || kind === 'silver') {
    for (const y of [by - 0.09, by + 0.1]) poly(rect(0, y, W * 0.98, 0.022), body[2], FZ, { ol: 0 });
    poly(rect(0, ly + 0.02, W * 1.0, 0.022), lid[2], D * 1.03 / 2 + 0.012, { ol: 0 });
  }
  if (kind === 'crystal') { // facets on the front: a diamond pattern of lighter and darker triangles
    for (const [x, c] of [[-0.3, C.crystal[0]], [0, C.crystal[2]], [0.3, C.crystal[0]]]) poly([[x - 0.15, by - 0.25], [x + 0.15, by - 0.25], [x, by + 0.22]], c, FZ, { ol: 0 });
    for (const x of [-0.25, 0.25]) poly([[x, ly - 0.14], [x + 0.14, ly + 0.1], [x - 0.14, ly + 0.1]], C.cyan[0], D * 1.03 / 2 + 0.012, { ol: 0 });
  }
  // bands and corners
  const bandW = kind === 'wood' ? 0.09 : 0.1;
  for (const x of kind === 'wood' ? [-0.3, 0.3] : [-0.36, 0.36]) {
    box([x, by, 0], [bandW, BH + 0.02, D + 0.04], trim, { ol: 0.025 });
    box([x, ly, 0], [bandW, LH + 0.03, D * 1.03 + 0.04], trim, { ol: 0.025 });
  }
  if (kind !== 'wood') for (const sx of [-1, 1]) for (const sy of [-1, 1]) box([sx * (W / 2 - 0.04), by + sy * (BH / 2 - 0.04), 0], [0.12, 0.12, D + 0.06], trim, { ol: 0.02 });
  if (kind === 'gold' || kind === 'crystal') box([0, by + BH / 2 + 0.01, 0], [W * 1.06, 0.07, D * 1.06], trim, { ol: 0.02 }); // rim between lid and body
  // the lock
  const lz = D / 2 + 0.05;
  if (kind === 'wood') { box([0, by + BH / 2 - 0.06, D / 2 + 0.03], [0.16, 0.2, 0.06], C.iron, { ol: 0.02 }); poly(xf(KEYHOLE, 0, by + BH / 2 - 0.07, 0.6), C.key, lz, { ol: 0 }); }
  else {
    const lc = kind === 'silver' ? C.silver : C.gold;
    box([0, by + BH / 2 - 0.05, D / 2 + 0.04], [0.26, 0.3, 0.08], lc, { ol: 0.025 });
    if (kind === 'silver') { poly(circle(0, by + BH / 2 + 0.02, 0.055, 6, Math.PI / 6), C.cyan[1], lz + 0.03, { ol: 0.015 }); poly(xf(KEYHOLE, 0, by + BH / 2 - 0.1, 0.65), C.key, lz + 0.03, { ol: 0 }); }
    if (kind === 'gold') { poly(star(0, by + BH / 2 - 0.03, 0.1, 0.045, 5), '#FFFFFF', lz + 0.03, { ol: 0.015 }); }
    if (kind === 'crystal') { poly(star(0, by + BH / 2 - 0.04, 0.11, 0.07, 6), C.cyan[1], lz + 0.03, { ol: 0.015 }); poly(circle(0, by + BH / 2 - 0.04, 0.045, 6), '#FFFFFF', lz + 0.035, { ol: 0 }); }
  }
  // effects: a glint (silver), sparkles (gold), floating shards + glow (crystal)
  const fx = { wood: [], silver: [[0.55, 0.62, 0.08]], gold: [[-0.62, 0.55, 0.1], [0.66, 0.4, 0.08], [0.15, 0.82, 0.07]], crystal: [[-0.66, 0.45, 0.1], [0.7, 0.62, 0.1], [0.1, 0.9, 0.08]] }[kind];
  for (const [x, y, s] of fx) poly(star(x, y, s, s * 0.3, 4), '#FFFFFF', 0.5, { ol: 0.015 });
  if (kind === 'crystal') {
    for (const [x, y, r] of [[-0.75, 0.0, 0.3], [0.78, 0.1, -0.4], [-0.45, 0.82, 0.6]]) poly(xf([[0, 0.14], [0.06, 0], [0, -0.14], [-0.06, 0]], x, y, 1, r), C.crystal[1], 0.3, { d: 0.08, side: C.crystal[2], ol: 0.02 });
    glow([0, 0.05, -0.2], 1.1, '#C58BFF');
  }
  if (kind === 'gold') glow([0, 0.05, -0.2], 0.9, '#FFC83D');
  return P;
}

// Pickaxe Chest: bigger, navy with gold, a rounded lid, a crest with crossed pickaxes, the four family gems on the lid band
function pickaxeChest() {
  const P = [];
  const box = (at, s, c, o = {}) => P.push({ t: 'box', at, s, c: c[1], top: c[0], side: c[2], ol: o.ol ?? 0.035 });
  const poly = (pts, c, z, o = {}) => P.push({ t: 'poly', pts, z, d: o.d ?? 0.02, c, side: o.side, ol: o.ol ?? 0.02 });
  const W = 1.3, D = 0.86, BH = 0.6, by = -0.25, FZ = D / 2 + 0.012;
  box([0, by, 0], [W, BH, D], C.navy);
  P.push({ t: 'hcyl', at: [0, by + BH / 2, 0], r: D / 2, len: W * 1.02, c: C.navy[0], ol: 0.035 });
  for (const x of [-0.42, 0.42]) { box([x, by, 0], [0.11, BH + 0.02, D + 0.04], C.gold, { ol: 0.025 }); P.push({ t: 'hcyl', at: [x, by + BH / 2, 0], r: D / 2 + 0.02, len: 0.11, c: C.gold[1], ol: 0.025 }); }
  box([0, by + BH / 2 + 0.01, 0], [W * 1.05, 0.08, D * 1.05], C.gold, { ol: 0.02 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) box([sx * (W / 2 - 0.05), by + sy * (BH / 2 - 0.05), 0], [0.14, 0.14, D + 0.06], C.gold, { ol: 0.02 });
  // crest: a gold shield, crossed pickaxes in navy, a keyhole under it
  const cy = by + 0.02;
  poly([[-0.24, cy + 0.2], [0.24, cy + 0.2], [0.24, cy - 0.04], [0, cy - 0.26], [-0.24, cy - 0.04]], C.gold[1], FZ + 0.03, { d: 0.06, side: C.gold[2], ol: 0.025 });
  for (const s of [-1, 1]) {
    poly(xf(rect(0, 0, 0.04, 0.34), 0, cy - 0.02, 1, s * 0.75), C.navy[2], FZ + 0.065, { ol: 0 });
    poly(xf([[-0.15, 0.04], [0, 0.1], [0.15, 0.04], [0.13, 0.0], [0, 0.05], [-0.13, 0.0]], s * 0.08, cy + 0.1, 1, s * 0.75), C.navy[2], FZ + 0.066, { ol: 0 });
  }
  poly(xf(KEYHOLE, 0, by - 0.2, 0.8), C.key, FZ + 0.01, { ol: 0 });
  // family gems on the front of the lid band: storm, dynamite, rift, frost
  [['#45CFFF', -0.5], ['#FF6A2A', -0.17], ['#FFA51C', 0.17], ['#BDEFFF', 0.5]].forEach(([c, x]) => poly(circle(x, by + BH / 2 + 0.01, 0.06, 6, Math.PI / 6), c, D * 1.05 / 2 + 0.015, { d: 0.04, ol: 0.015 }));
  P.push({ t: 'glow', at: [0, 0.05, -0.3], r: 1.2, c: '#7E8BFF' });
  for (const [x, y, s] of [[-0.85, 0.5, 0.1], [0.88, 0.35, 0.09], [0.3, 0.75, 0.07]]) poly(star(x, y, s, s * 0.3, 4), '#FFFFFF', 0.5, { ol: 0.015 });
  return P;
}

const out = { chests: { wood: chest('wood'), silver: chest('silver'), gold: chest('gold'), crystal: chest('crystal'), pickaxe: pickaxeChest() } };
writeFileSync(new URL('./chests.json', import.meta.url), JSON.stringify(out));
console.log('chests:', Object.keys(out.chests).join(', '), 'max prims:', Math.max(...Object.values(out.chests).map((x) => x.length)));
