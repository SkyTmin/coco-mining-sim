// Fighter-style pickaxes [владелец 11.11: «можешь брать стиль игры Текена»] — style reference only, nothing copied:
// sharp faceted steel heads, gold trim, glowing family energy on the cutting edge, auras on the top rarities.
// Primitives map 1:1 to Roblox parts: cyl (Cylinder), ball (Ball), box (Part), wedge (WedgePart, thick end at
// local +Z, thin edge at local -Z, flat bottom at local -Y). box/wedge carry cf = [x, y, z, R00..R22] (CFrame order).
// Materials: metal / gold / leather / neon / glass. Run: node assets/pickaxes/build-fighter.mjs
import { writeFileSync } from 'node:fs';

const FAMILIES = {
  storm: { energy: '#4DD7FF', energy2: '#FFE45C', hub: '#1F3FA8', steel: '#6F86C2', dark: '#2A3866', ridge: '#B9C8F0', wrap: '#141C3A' },
  dynamite: { energy: '#FF5A1F', energy2: '#FFD23F', hub: '#C81E3A', steel: '#5E4C4C', dark: '#2E2222', ridge: '#A08A86', wrap: '#2B1A14' },
  rift: { energy: '#FF9F1C', energy2: '#FF4FD8', hub: '#2B1A12', steel: '#4A3A5C', dark: '#241A30', ridge: '#8A78A0', wrap: '#1F1630' },
  frost: { energy: '#8FE3FF', energy2: '#FFFFFF', hub: '#3B9AE8', steel: '#A9DDF7', dark: '#5B8FB8', ridge: '#E9F8FF', wrap: '#22405F' },
};
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const GOLD = '#E8B34A';
const rad = (d) => (d * Math.PI) / 180;
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// a frame from "local -Z points along `dir`", local Y ~ `up`
function frame(at, dir, up = [0, 0, 1]) {
  const back = norm(dir.map((x) => -x)); // local +Z
  const right = norm(cross(up, back));
  const y = cross(back, right);
  return [...at, right[0], y[0], back[0], right[1], y[1], back[1], right[2], y[2], back[2]];
}
const ROT_Z = (deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [c, -s, 0, s, c, 0, 0, 0, 1]; };

const R = 2.4, CY = 1.8;
const arc = (a) => [R * Math.sin(rad(a)), CY - R + R * Math.cos(rad(a)), 0];
const tangent = (a, s) => norm([Math.cos(rad(a)) * s, -Math.sin(rad(a)), 0]);

function build(family, ri) {
  const f = FAMILIES[family];
  const p = [];
  const cyl = (a, b, r, c, m = 'metal') => p.push({ t: 'cyl', a, b, r, c, m });
  const ball = (at, r, c, m = 'metal') => p.push({ t: 'ball', at, r, c, m });
  const box = (cf, s, c, m = 'metal') => p.push({ t: 'box', cf, s, c, m });
  const wedge = (cf, s, c, m = 'metal') => p.push({ t: 'wedge', cf, s, c, m });
  const steel = ri >= 3 ? f.dark : f.steel;

  // handle: dark steel shaft, leather wrap, diamond pommel
  cyl([0, -2.0, 0], [0, 1.45, 0], 0.15, f.dark);
  cyl([0, -1.95, 0], [0, -0.95, 0], 0.18, f.wrap, 'leather');
  for (let i = 0; i < 5; i++) {
    const y = -1.9 + i * 0.22;
    box([0, y, 0, ...ROT_Z(18)], [0.4, 0.05, 0.4], ri >= 1 ? GOLD : f.dark, ri >= 1 ? 'gold' : 'metal');
  }
  box([0, -2.18, 0, ...ROT_Z(45)], [0.34, 0.34, 0.34], ri >= 1 ? GOLD : steel, ri >= 1 ? 'gold' : 'metal');
  if (ri >= 3) ball([0, -2.18, 0], 0.13, f.energy, 'neon');
  cyl([0, 1.05, 0], [0, 1.4, 0], 0.22, ri >= 1 ? GOLD : steel, ri >= 1 ? 'gold' : 'metal');

  // arms: faceted tapering blades on both sides, a wedge tip, energy on the cutting (lower) edge
  for (const s of [-1, 1]) {
    const angles = [6, 16, 26, 36, 46];
    angles.forEach((a, i) => {
      const t = i / angles.length;
      const mid = arc(s * (a + 5));
      const len = (R * rad(10)) * 1.05;
      const h = 0.62 * (1 - t) + 0.2 * t;
      const d = 0.34 * (1 - t) + 0.15 * t;
      box(frame(mid, tangent(a + 5, s), [0, 0, 1]), [h, d, len], steel);
      // facet: a narrower ridge on the front gives the blade a bevel
      const n = norm([Math.sin(rad(s * (a + 5))), Math.cos(rad(s * (a + 5))), 0]);
      box(frame([mid[0], mid[1], d / 2 + 0.01], tangent(a + 5, s), [0, 0, 1]), [h * 0.42, 0.04, len * 0.98], f.ridge);
      if (ri >= 2) {
        const low = [mid[0] - n[0] * h * 0.5, mid[1] - n[1] * h * 0.5, 0];
        box(frame(low, tangent(a + 5, s), [0, 0, 1]), [0.1, d * 0.85, len * 1.02], f.energy, 'neon');
        box(frame(low, tangent(a + 5, s), [0, 0, 1]), [0.26, d * 1.3, len * 1.05], f.energy, 'glass');
      }
      if (ri >= 3) {
        const top = [mid[0] + n[0] * h * 0.52, mid[1] + n[1] * h * 0.52, 0];
        box(frame(top, tangent(a + 5, s), [0, 0, 1]), [0.06, d * 0.9, len * 1.02], GOLD, 'gold');
      }
      if (ri >= 1 && i === 0) box(frame(mid, tangent(a + 5, s), [0, 0, 1]), [h + 0.08, d + 0.08, 0.12], GOLD, 'gold');
    });
    // the tip
    const a = 56, tip = arc(s * 59);
    const dir = tangent(a + 2, s);
    wedge(frame(tip, dir, [0, 0, 1]), [0.22, 0.17, 0.8], ri >= 2 ? f.energy : steel, ri >= 2 ? 'neon' : 'metal');
  }

  // hub: a diamond block in the family colour with the family mark
  box([0, CY, 0, ...ROT_Z(45)], [0.82, 0.82, 0.56], f.hub);
  box([0, CY, 0.0, ...ROT_Z(45)], [0.94, 0.94, 0.34], ri >= 1 ? GOLD : steel, ri >= 1 ? 'gold' : 'metal');
  // a back spike above the hub: aggressive silhouette
  wedge(frame([0, CY + 0.72, 0], [0, 1, 0], [0, 0, 1]), [0.26, 0.2, 0.55], ri >= 1 ? GOLD : steel, ri >= 1 ? 'gold' : 'metal');
  const z = 0.3;
  const E = 1.55;
  const ebox0 = box;
  const S = (v) => v * E;
  if (family === 'storm') {
    // a jagged bolt
    box([(0.05) * E, CY + ((CY + 0.12) - CY) * E, z, ...ROT_Z(-30)], [0.15, 0.4, 0.05], f.energy2, 'neon');
    box([(0) * E, CY + ((CY) - CY) * E, z, ...ROT_Z(0)], [0.34, 0.11, 0.05], f.energy2, 'neon');
    box([(-0.05) * E, CY + ((CY - 0.12) - CY) * E, z, ...ROT_Z(-30)], [0.15, 0.4, 0.05], f.energy2, 'neon');
  } else if (family === 'dynamite') {
    for (const dx of [-0.13, 0, 0.13]) cyl([dx * E, CY - 0.26, z], [dx * E, CY + 0.26, z], 0.09, '#E03131', 'leather');
    box([0, CY, z + 0.05, ...ROT_Z(0)], [0.55, 0.07, 0.03], '#1A1A1A', 'leather');
    ball([0.16, CY + 0.36, z], 0.07, f.energy2, 'neon');
  } else if (family === 'rift') {
    for (const [x, y, r] of [[-0.1, CY + 0.08, 40], [0.02, CY - 0.02, -40], [0.12, CY - 0.1, 40]])
      box([(x) * E, CY + ((y) - CY) * E, z, ...ROT_Z(r)], [0.28, 0.09, 0.05], f.energy, 'neon');
  } else {
    for (const r of [0, 60, 120]) box([(0) * E, CY + ((CY) - CY) * E, z, ...ROT_Z(r)], [0.52, 0.08, 0.05], f.energy2, 'neon');
  }
  if (ri >= 2) { ball([0, CY, 0.36], 0.0001, f.energy, 'neon'); for (const sx of [-1, 1]) ball([sx * 0.62, CY + 0.02, 0.12], 0.09, f.energy, 'neon'); }

  // legendary: energy spikes flaring off the hub (an aura) + floating sparks
  if (ri >= 3) {
    for (const [ang, len] of [[90, 0.9], [62, 0.6], [118, 0.6], [40, 0.4], [140, 0.4]]) {
      const dir = [Math.cos(rad(ang)), Math.sin(rad(ang)), 0];
      const at = [dir[0] * (0.45 + len / 2), CY + dir[1] * (0.45 + len / 2), -0.05];
      wedge(frame(at, dir, [0, 0, 1]), [0.14, 0.1, len], f.energy, 'glass');
    }
    for (const [x, y] of [[-1.7, 2.1], [1.75, 2.0], [0.9, 2.9], [-1.0, 2.85], [0, 3.25]]) ball([x, y, 0.1], 0.06, f.energy2, 'neon');
  }
  return p;
}

const out = { picks: {} };
for (const family of Object.keys(FAMILIES)) RARITIES.forEach((r, i) => (out.picks[`${family}_${r}`] = build(family, i)));
writeFileSync(new URL('./picks-fighter.json', import.meta.url), JSON.stringify(out));
console.log('picks:', Object.keys(out.picks).length, 'max parts:', Math.max(...Object.values(out.picks).map((x) => x.length)));
