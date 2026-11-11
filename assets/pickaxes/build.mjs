// Candy-style pickaxes [владелец 11.11: «своё, по концепту Конфета»].
// Each pickaxe is a list of Roblox-friendly primitives (cyl / ball / box), so the same data builds the
// three.js preview and the in-game model. Units: studs, model space: handle along +Y, head across X, front +Z.
// Run: node assets/pickaxes/build.mjs  ->  assets/pickaxes/picks.json
import { writeFileSync } from 'node:fs';

const INK = '#1E2140';
const FAMILIES = {
  storm: { head: '#FFD23F', headLo: '#F2A81D', handle: '#3B5BDB', grip: '#1E3A8A', gem: '#5CC8FF', accent: '#FFE45C', face: '#2346B8' },
  dynamite: { head: '#FF4D4D', headLo: '#C81E3A', handle: '#5B3A29', grip: '#2B2B33', gem: '#FFB020', accent: '#F5E6C8', face: '#FFF1D6' },
  rift: { head: '#FF8A1A', headLo: '#D9480F', handle: '#3D2B4F', grip: '#1F1630', gem: '#FFE066', accent: '#2B1A12', face: '#3A2418' },
  frost: { head: '#9BE7FF', headLo: '#4DABF7', handle: '#E7F5FF', grip: '#74C0FC', gem: '#FFFFFF', accent: '#D0EBFF', face: '#3B9AE8' },
};
const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const GOLD = '#FFC83D';

const rad = (d) => (d * Math.PI) / 180;
function headPoint(a, R = 2.2) {
  return [R * Math.sin(rad(a)), 1.8 - 2.2 + R * Math.cos(rad(a)), 0];
}
function headRadius(a, rarity) {
  const t = Math.abs(a) / 58;
  const fat = 0.3 + 0.025 * rarity;
  return fat * (1 - t * t) + 0.075 * t * t;
}

function build(family, rarityIndex) {
  const f = FAMILIES[family];
  const p = [];
  const cyl = (a, b, r, c, extra = {}) => p.push({ t: 'cyl', a, b, r, c, ...extra });
  const ball = (at, r, c, extra = {}) => p.push({ t: 'ball', at, r, c, ...extra });
  const box = (at, s, rot, c, extra = {}) => p.push({ t: 'box', at, s, rot, c, ...extra });

  // handle: a chunky capsule with a darker grip
  cyl([0, -1.9, 0], [0, 1.55, 0], 0.2, f.handle);
  ball([0, -1.9, 0], 0.2, f.handle);
  cyl([0, -1.95, 0], [0, -1.05, 0], 0.235, f.grip);
  if (rarityIndex >= 1) for (const y of [-1.75, -1.5, -1.25]) cyl([0, y - 0.05, 0], [0, y + 0.05, 0], 0.27, GOLD);
  // pommel
  ball([0, -2.08, 0], rarityIndex >= 3 ? 0.36 : 0.26, rarityIndex >= 3 ? f.gem : f.grip, rarityIndex >= 3 ? { neon: true } : {});

  // head: a capsule chain along a drooping arc, fat in the middle, thin at the tips
  const steps = 26;
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const a = -58 + (116 * i) / steps;
    const pt = headPoint(a);
    const r = headRadius(a, rarityIndex);
    const tone = Math.abs(a) > 44 ? f.headLo : f.head;
    if (prev) cyl(prev.pt, pt, (prev.r + r) / 2, tone);
    ball(pt, r, tone);
    prev = { pt, r };
  }
  // the hub: a fat disc around the joint carries the family emblem
  const HUB = 0.52 + 0.03 * rarityIndex;
  cyl([0, 1.8, -0.36], [0, 1.8, 0.36], HUB, f.headLo);
  cyl([0, 1.8, 0.3], [0, 1.8, 0.4], HUB * 0.8, f.face);
  // collar where the handle meets the head
  cyl([0, 1.1, 0], [0, 1.32, 0], 0.27, rarityIndex >= 1 ? GOLD : f.grip);

  // family emblem on the front of the head
  const z = 0.42;
  const E = 1.25; // emblem scale
  const ex = (x) => x * E, ey = (y) => 1.8 + (y - 1.83) * E;
  const ebox = (at, s, rot, c, extra) => box([ex(at[0]), ey(at[1]), at[2]], s.map((v, i) => (i < 2 ? v * E : v)), rot, c, extra);
  const ecyl = (a, b, r, c, extra) => cyl([ex(a[0]), ey(a[1]), a[2]], [ex(b[0]), ey(b[1]), b[2]], r * E, c, extra);
  const eball = (at, r, c, extra) => ball([ex(at[0]), ey(at[1]), at[2]], r * E, c, extra);
  const glowEmblem = rarityIndex >= 3 ? { neon: true } : {};
  if (family === 'storm') {
    // a lightning bolt: three slanted bars
    ebox([0.07, 2.0, z], [0.13, 0.3, 0.06], [0, 0, -28], f.accent, glowEmblem);
    ebox([0.0, 1.84, z], [0.3, 0.1, 0.06], [0, 0, 0], f.accent, glowEmblem);
    ebox([-0.07, 1.67, z], [0.13, 0.3, 0.06], [0, 0, -28], f.accent, glowEmblem);
  } else if (family === 'dynamite') {
    // a bundle of three sticks with a fuse
    for (const dx of [-0.16, 0, 0.16]) ecyl([dx, 1.66, z + 0.03], [dx, 2.0, z + 0.03], 0.075, '#E03131');
    ebox([0, 1.83, z + 0.1], [0.46, 0.07, 0.04], [0, 0, 0], '#5B3A29');
    ecyl([0, 2.06, z + 0.05], [0.12, 2.3, z + 0.05], 0.025, INK);
    ball([0.13, 2.32, z + 0.05], 0.06, '#FFD43B', { neon: true });
  } else if (family === 'rift') {
    // a zig-zag crack glowing through the head
    for (const [x, y, r, w] of [[-0.2, 1.88, 40, 0.34], [0.02, 1.8, -40, 0.3], [0.22, 1.88, 40, 0.3]]) {
      ebox([x, y, z], [w, 0.12, 0.06], [0, 0, r], '#1A0E08');
      ebox([x, y, z + 0.04], [w * 0.8, 0.06, 0.04], [0, 0, r], f.gem, { neon: true });
    }
  } else if (family === 'frost') {
    // a snowflake: three crossed bars and a snow cap along the top
    for (const r of [0, 60, 120]) ebox([0, 1.84, z], [0.46, 0.08, 0.05], [0, 0, r], '#FFFFFF');
    for (let i = 2; i <= 10; i += 2) {
      const a = -58 + (116 * i) / 12;
      const [x, y] = headPoint(a);
      ball([x, y + headRadius(a, rarityIndex) * 0.75, 0], headRadius(a, rarityIndex) * 0.6, '#FFFFFF');
    }
  }

  // epic: a gem socket on each side of the emblem; legendary: glowing gems + tip caps
  if (rarityIndex >= 2) {
    for (const a of [-34, 34]) {
      const [x, y] = headPoint(a);
      const r = headRadius(a, rarityIndex);
      ball([x, y, r * 0.75], r * 0.42, GOLD);
      ball([x, y, r * 0.95], r * 0.3, f.gem, rarityIndex >= 3 ? { neon: true } : {});
    }
  }
  if (rarityIndex >= 2) for (const a of [-58, 58]) ball(headPoint(a), 0.13, GOLD);
  if (rarityIndex >= 3) {
    // a gold rim along the top of the head and sparkles around it
    let last = null;
    for (let i = 3; i <= 23; i++) {
      const a = -58 + (116 * i) / 26;
      const [x, y] = headPoint(a, 2.2 + headRadius(a, rarityIndex) * 0.85);
      if (last) cyl(last, [x, y, 0], 0.06, GOLD);
      last = [x, y, 0];
    }
    for (const [x, y] of [[-1.5, 1.75], [1.55, 1.7], [0.7, 2.55], [-0.75, 2.5]]) ball([x, y, 0.1], 0.07, f.gem, { neon: true });
  }
  // candy gloss: a soft white streak on the upper-left of the head
  for (const a of [-44, -34, -24, 24, 34]) {
    const r = headRadius(a, rarityIndex);
    const [x, y] = headPoint(a, 2.2 + r * 0.45);
    ball([x, y, r * 0.55], r * 0.22, '#FFFFFF', { gloss: true });
  }
  return p;
}

const out = { ink: INK, outline: 0.06, picks: {} };
for (const family of Object.keys(FAMILIES))
  RARITIES.forEach((rarity, i) => (out.picks[`${family}_${rarity}`] = build(family, i)));
writeFileSync(new URL('./picks.json', import.meta.url), JSON.stringify(out));
console.log('picks:', Object.keys(out.picks).length, 'parts max:', Math.max(...Object.values(out.picks).map((p) => p.length)));
