// Fighter-style pickaxes [владелец 11.11: «можешь брать стиль игры Текена», «у тебя комбо в этом стиле»] — the same
// look as our KO combo banner (MineHud KO_TIERS), style reference only, nothing copied: heavy chunky silhouette, a dark
// outline (Roblox Highlight, fill off), bold light → mid → deep colour bands like the banner's letter gradient, and a
// rarity ladder that reuses the banner tiers: silver trim → gold trim → gold + glowing edge → cosmic shimmer + shockwave.
// Primitives map 1:1 to Roblox parts: cyl (Cylinder), ball (Ball), box (Part), wedge (WedgePart, thick end at local +Z,
// thin edge at local -Z, flat bottom at local -Y). box/wedge carry cf = [x, y, z, R00..R22] (CFrame order).
// Materials: plastic (SmoothPlastic) / metal / gold / neon / glass. Run: node assets/pickaxes/build-fighter.mjs
import { writeFileSync } from 'node:fs';

// light / mid / deep = the banner gradient stops; hub = the emblem plate; energy = the glowing edge; mark = the emblem
const FAMILIES = {
  storm: { light: '#E6EEFF', mid: '#5B7CFF', deep: '#2A2FB8', hub: '#141A66', energy: '#4DD7FF', mark: '#FFE45C' },
  dynamite: { light: '#FFE3C4', mid: '#FF6A2A', deep: '#B3141E', hub: '#3A0E12', energy: '#FFB21F', mark: '#FF3B3B' },
  rift: { light: '#F0E0FF', mid: '#A05CFF', deep: '#4A1A8C', hub: '#1B0E33', energy: '#FF9F1C', mark: '#FFB13D' },
  frost: { light: '#FFFFFF', mid: '#9FE6FF', deep: '#3A9AD9', hub: '#16507F', energy: '#CFF6FF', mark: '#FFFFFF' },
};
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const SILVER = '#C9D6EA';
const GOLD = '#FFC83D';
const COSMIC = ['#6BF2FF', '#8B5CFF', '#FF4FD8', '#FFD23F']; // the banner's top tier
const TAPE = '#F2F0EA', TAPE_EDGE = '#E8352B', SHAFT = '#24202E';
const rad = (d) => (d * Math.PI) / 180;
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k);
// a frame from "local -Z points along `dir`", local Y ~ `up`
function frame(at, dir, up = [0, 0, 1]) {
  const back = norm(dir.map((x) => -x));
  const right = norm(cross(up, back));
  const y = cross(back, right);
  return [...at, right[0], y[0], back[0], right[1], y[1], back[1], right[2], y[2], back[2]];
}
const ROT_Z = (deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return [c, -s, 0, s, c, 0, 0, 0, 1]; };

const R = 2.35, CY = 1.75;
const arc = (a) => [R * Math.sin(rad(a)), CY - R + R * Math.cos(rad(a)), 0];

function build(family, ri) {
  const f = FAMILIES[family];
  const p = [];
  const cyl = (a, b, r, c, m = 'plastic') => p.push({ t: 'cyl', a, b, r, c, m });
  const ball = (at, r, c, m = 'plastic') => p.push({ t: 'ball', at, r, c, m });
  const box = (cf, s, c, m = 'plastic') => p.push({ t: 'box', cf, s, c, m });
  const wedge = (cf, s, c, m = 'plastic') => p.push({ t: 'wedge', cf, s, c, m });
  const trim = ri >= 1 ? GOLD : SILVER, trimM = ri >= 1 ? 'gold' : 'metal';

  // handle: dark shaft wrapped in fighter's hand tape (white, one red band like the banner edge)
  cyl([0, -2.05, 0], [0, 1.4, 0], 0.15, SHAFT, 'metal');
  for (let i = 0; i < 6; i++) {
    const y = -1.9 + i * 0.21;
    const c = i === 4 ? TAPE_EDGE : ri >= 1 && i % 2 === 1 ? GOLD : TAPE;
    box([0, y, 0, ...ROT_Z(i % 2 ? -16 : 16)], [0.38, 0.16, 0.38], c, c === GOLD ? 'gold' : 'plastic');
  }
  box([0, -2.2, 0, ...ROT_Z(45)], [0.36, 0.36, 0.36], trim, trimM); // pommel
  if (ri >= 3) box([0, -2.2, 0.19, ...ROT_Z(45)], [0.16, 0.16, 0.04], COSMIC[2], 'neon');
  cyl([0, 1.0, 0], [0, 1.38, 0], 0.22, trim, trimM); // ferrule

  // head: two heavy arms of four straight segments, each a stack of light / mid / deep bands (top → bottom)
  const cuts = [4, 17, 30, 43, 55];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a0 = arc(s * cuts[i]), a1 = arc(s * cuts[i + 1]);
      const dir = norm(add(a1, a0, -1));
      const len = Math.hypot(...add(a1, a0, -1)) + 0.06;
      const mid = add(a0, a1).map((x) => x / 2);
      const t = i / 3;
      const h = 0.82 * (1 - t) + 0.4 * t, d = 0.42 * (1 - t) + 0.24 * t;
      const n = norm(cross([0, 0, s], dir)); // outward (up) normal of the arm
      const bands = [[f.light, 0.22], [f.mid, 0.46], [f.deep, 0.32]];
      let off = h / 2;
      for (const [c, k] of bands) {
        box(frame(add(mid, n, off - (h * k) / 2), dir), [h * k + 0.002, d, len], c);
        off -= h * k;
      }
      if (ri >= 1) box(frame(add(mid, n, h / 2 + 0.03), dir), [0.07, d * 0.7, len], trim, trimM); // top rim
      if (ri >= 2) {
        const edge = ri >= 3 ? COSMIC[(i + (s > 0 ? 0 : 2)) % 4] : f.energy;
        box(frame(add(mid, n, -h / 2 - 0.02), dir), [0.09, d * 0.8, len], edge, 'neon');
        box(frame(add(mid, n, -h / 2 - 0.04), dir), [0.28, d * 1.25, len * 1.04], edge, 'glass');
      }
    }
    // chisel tip
    const a = s * cuts[4], tip = arc(a + s * 3.2);
    const dir = norm(add(arc(a + s * 6), arc(a), -1));
    wedge(frame(tip, dir), [0.4, 0.24, 0.62], ri >= 2 ? (ri >= 3 ? COSMIC[s > 0 ? 3 : 1] : f.energy) : f.deep, ri >= 2 ? 'neon' : 'plastic');
  }

  // hub: a heavy diamond plate in trim colour, the family plate on it, the emblem in front
  box([0, CY, 0, ...ROT_Z(45)], [1.12, 1.12, 0.5], trim, trimM);
  box([0, CY, 0.06, ...ROT_Z(45)], [0.9, 0.9, 0.5], f.hub);
  wedge(frame([0, CY + 0.86, 0], [0, 1, 0]), [0.3, 0.24, 0.6], trim, trimM); // back spike
  const z = 0.33, E = 1.6;
  if (family === 'storm') {
    box([0.06 * E, CY + 0.12 * E, z, ...ROT_Z(-28)], [0.15, 0.4, 0.05], f.mark, 'neon');
    box([0, CY, z, ...ROT_Z(0)], [0.34, 0.11, 0.05], f.mark, 'neon');
    box([-0.06 * E, CY - 0.12 * E, z, ...ROT_Z(-28)], [0.15, 0.4, 0.05], f.mark, 'neon');
  } else if (family === 'dynamite') {
    for (const dx of [-0.13, 0, 0.13]) cyl([dx * E, CY - 0.28, z], [dx * E, CY + 0.28, z], 0.09, f.mark);
    box([0, CY, z + 0.07, ...ROT_Z(0)], [0.6, 0.08, 0.03], '#1A1A1A');
    ball([0.17, CY + 0.38, z], 0.08, '#FFE45C', 'neon');
  } else if (family === 'rift') {
    for (const [x, y, r] of [[-0.1, 0.08, 40], [0.02, -0.02, -40], [0.12, -0.1, 40]])
      box([x * E, CY + y * E, z, ...ROT_Z(r)], [0.28, 0.09, 0.05], f.mark, 'neon');
  } else {
    for (const r of [0, 60, 120]) box([0, CY, z, ...ROT_Z(r)], [0.56, 0.09, 0.05], f.mark, 'neon');
  }
  if (ri >= 2) for (const sx of [-1, 1]) ball([sx * 0.58, CY, 0.2], 0.1, ri >= 3 ? COSMIC[sx > 0 ? 0 : 2] : f.energy, 'neon');

  // legendary: cosmic spikes off the back of the hub + the KO shockwave ring behind the head
  if (ri >= 3) {
    [[90, 0.95], [64, 0.65], [116, 0.65], [42, 0.42], [138, 0.42]].forEach(([ang, len], k) => {
      const dir = [Math.cos(rad(ang)), Math.sin(rad(ang)), 0];
      wedge(frame([dir[0] * (0.55 + len / 2), CY + dir[1] * (0.55 + len / 2), -0.06], dir), [0.16, 0.1, len], COSMIC[k % 4], 'glass');
    });
    const N = 16, RR = 1.25;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const at = [Math.cos(a) * RR, CY + Math.sin(a) * RR * 0.92, -0.35];
      box(frame(at, [-Math.sin(a), Math.cos(a), 0]), [0.11, 0.06, (2 * Math.PI * RR) / N + 0.08], COSMIC[k % 4], 'glass');
    }
  }
  return p;
}

const out = { picks: {} };
for (const family of Object.keys(FAMILIES)) RARITIES.forEach((r, i) => (out.picks[`${family}_${r}`] = build(family, i)));
writeFileSync(new URL('./picks-fighter.json', import.meta.url), JSON.stringify(out));
console.log('picks:', Object.keys(out.picks).length, 'max parts:', Math.max(...Object.values(out.picks).map((x) => x.length)));
