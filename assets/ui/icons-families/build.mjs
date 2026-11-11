// Family and skill icons in the pickaxe cel style [владелец 11.11; TZ-04 §11 п. 4: Candy keys family_<id>, skill_<id>_<n>].
// Flat colours, thick dark outline, one light tone; a hex badge for a family, a round badge for a skill.
// Run: node assets/ui/icons-families/build.mjs  -> icons.html (all SVGs); render PNGs with render.cjs (Playwright).
import { writeFileSync } from 'node:fs';

const INK = '#15121E', SW = 9; // outline width at 256 px
const FAM = {
  storm: { bg: '#1A78D6', bg2: '#45CFFF', mark: '#FFE14D', name: 'Гроза' },
  dynamite: { bg: '#C0241A', bg2: '#FF6A2A', mark: '#FFD23F', name: 'Динамит' },
  rift: { bg: '#A3560E', bg2: '#FFA51C', mark: '#FFF1C2', name: 'Разлом' },
  frost: { bg: '#1C5A9C', bg2: '#7FD0FF', mark: '#FFFFFF', name: 'Мороз' },
};
const SKILLS = {
  storm: ['Цепь молний', 'Золотая искра', 'Нюх на руду', 'Грозовой фронт'],
  dynamite: ['Заряд', 'Счастливый осколок', 'Кладоискатель', 'Тайник'],
  rift: ['Трещина', 'Глубокий удар', 'Эхо', 'Сквозняк'],
  frost: ['Иней', 'Ледяная хватка', 'Ледолом', 'Хрупкий лёд'],
};
const pts = (a) => a.map((p) => p.join(',')).join(' ');
const tf = (a, cx, cy, s, rot = 0) => a.map(([x, y]) => { const c = Math.cos(rot), si = Math.sin(rot); return [+(cx + (x * c - y * si) * s).toFixed(1), +(cy + (x * si + y * c) * s).toFixed(1)]; });
const P = (a, fill, o = {}) => `<polygon points="${pts(a)}" fill="${fill}" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? SW}" stroke-linejoin="round"/>`;
const C = (cx, cy, r, fill, o = {}) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? SW}"/>`;
const R = (x, y, w, h, fill, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${fill}" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? SW}" ${o.t ? `transform="${o.t}"` : ''}/>`;
const L = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ngon = (cx, cy, r, n, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const starP = (cx, cy, r1, r2, n, a0 = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, i) => { const a = a0 + (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

// ---------- symbols (drawn around 0,0 at unit ~100) ----------
const BOLT = [[-16, -50], [22, -50], [4, -10], [26, -10], [-20, 56], [-4, 6], [-26, 6]];
const bolt = (cx, cy, s, fill, rot = 0) => P(tf(BOLT, cx, cy, s, rot), fill);
const bomb = (cx, cy, s) => [C(cx, cy + 8 * s, 40 * s, '#2A1A22'), C(cx - 14 * s, cy - 6 * s, 9 * s, '#FFFFFF', { sw: 0 }),
  R(cx + 14 * s, cy - 44 * s, 16 * s, 22 * s, '#8A8F9C', { t: `rotate(35 ${cx + 22 * s} ${cy - 33 * s})` }),
  L(`M${cx + 28 * s} ${cy - 46 * s} q ${10 * s} ${-14 * s} ${22 * s} ${-12 * s}`, INK, 12 * s), L(`M${cx + 28 * s} ${cy - 46 * s} q ${10 * s} ${-14 * s} ${22 * s} ${-12 * s}`, '#E8D2A6', 5 * s),
  P(starP(cx + 52 * s, cy - 60 * s, 16 * s, 7 * s, 6), '#FFD23F', { sw: 5 * s })].join('');
const CRACK = [[-8, -54], [10, -54], [-2, -18], [16, 0], [0, 22], [12, 56], [-12, 22], [-2, 2], [-18, -16]];
const crack = (cx, cy, s, fill) => P(tf(CRACK, cx, cy, s), fill) + P(tf([[0, 0], [30, 12], [34, 4], [4, -8]], cx + 8 * s, cy - 2 * s, s), fill, { sw: SW * 0.8 }) + P(tf([[0, 0], [-30, -10], [-32, -2], [-2, 8]], cx - 4 * s, cy - 14 * s, s), fill, { sw: SW * 0.8 });
const snowflake = (cx, cy, s, fill) => { // six arms with a V branch each: an ink stroke under a coloured stroke
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const e = (r) => [cx + ux * r * s, cy + uy * r * s];
    const [x1, y1] = e(56), [bx, by] = e(30);
    d += `M${cx} ${cy} L${x1} ${y1} `;
    for (const sg of [-1, 1]) d += `M${bx} ${by} L${bx + (ux * 16 + px * sg * 16) * s} ${by + (uy * 16 + py * sg * 16) * s} `;
  }
  return L(d, INK, 24 * s) + L(d, fill, 11 * s) + C(cx, cy, 9 * s, fill, { sw: 6 });
};
const coin = (cx, cy, s) => C(cx, cy, 40 * s, '#FFC83D') + C(cx, cy, 27 * s, '#FFE27A', { sw: 5 * s }) + R(cx - 6 * s, cy - 16 * s, 12 * s, 32 * s, '#C9870F', { sw: 0, rx: 3 * s });
const gem = (cx, cy, s, c1, c2) => P([[cx, cy - 40 * s], [cx + 36 * s, cy - 10 * s], [cx, cy + 42 * s], [cx - 36 * s, cy - 10 * s]], c1) + P([[cx, cy - 40 * s], [cx + 36 * s, cy - 10 * s], [cx, cy - 4 * s]], c2, { sw: 0 });
const cloud = (cx, cy, s, fill) => [C(cx - 30 * s, cy + 6 * s, 24 * s, fill), C(cx + 2 * s, cy - 10 * s, 32 * s, fill), C(cx + 34 * s, cy + 6 * s, 22 * s, fill), R(cx - 50 * s, cy + 4 * s, 102 * s, 26 * s, fill, { rx: 13 * s, sw: 0 })].join('') + L(`M${cx - 52 * s} ${cy + 20 * s} H ${cx + 54 * s}`, INK, 0);
const chest = (cx, cy, s, body, trim) => R(cx - 44 * s, cy - 8 * s, 88 * s, 46 * s, body) + R(cx - 46 * s, cy - 36 * s, 92 * s, 30 * s, body) + R(cx - 8 * s, cy - 18 * s, 16 * s, 22 * s, trim, { sw: SW * 0.7 }) + R(cx - 30 * s, cy - 36 * s, 10 * s, 74 * s, trim, { sw: SW * 0.6, rx: 2 }) + R(cx + 20 * s, cy - 36 * s, 10 * s, 74 * s, trim, { sw: SW * 0.6, rx: 2 });
const keyI = (cx, cy, s, fill) => C(cx - 26 * s, cy, 22 * s, fill) + C(cx - 26 * s, cy, 8 * s, INK, { sw: 0 }) + R(cx - 6 * s, cy - 7 * s, 58 * s, 14 * s, fill, { rx: 4 * s }) + R(cx + 30 * s, cy + 4 * s, 10 * s, 18 * s, fill, { rx: 3 * s, sw: SW * 0.7 }) + R(cx + 44 * s, cy + 4 * s, 9 * s, 14 * s, fill, { rx: 3 * s, sw: SW * 0.7 });
const arrowDown = (cx, cy, s, fill) => P(tf([[-12, -40], [12, -40], [12, 4], [30, 4], [0, 40], [-30, 4], [-12, 4]], cx, cy, s), fill);
const pick = (cx, cy, s, head, handle, rot = 0) => R(cx - 6 * s, cy - 10 * s, 12 * s, 70 * s, handle, { rx: 4 * s, t: `rotate(${rot} ${cx} ${cy})` }) +
  `<g transform="rotate(${rot} ${cx} ${cy})">${P([[cx - 52 * s, cy + 2 * s], [cx - 20 * s, cy - 26 * s], [cx, cy - 30 * s], [cx + 20 * s, cy - 26 * s], [cx + 52 * s, cy + 2 * s], [cx + 18 * s, cy - 12 * s], [cx, cy - 14 * s], [cx - 18 * s, cy - 12 * s]], head)}</g>`;
const sparkle = (cx, cy, s, fill = '#FFFFFF') => P(starP(cx, cy, 18 * s, 6 * s, 4), fill, { sw: 5 });

const SYM = {
  storm: [
    (c) => bolt(128, 132, 1.25, c.mark) + bolt(70, 86, 0.55, '#FFFFFF', -0.5) + bolt(190, 176, 0.55, '#FFFFFF', 0.4),
    (c) => coin(122, 140, 1.25) + P(starP(186, 74, 30, 10, 4), c.mark, { sw: 7 }) + sparkle(70, 72, 0.9),
    (c) => gem(112, 118, 1.15, '#45CFFF', '#C9F6FF') + C(162, 162, 34, 'none', { sw: 14 }) + C(162, 162, 34, 'none', { stroke: '#FFFFFF', sw: 6 }) + R(186, 186, 16, 44, '#FFFFFF', { rx: 6, t: 'rotate(-45 194 208)' }),
    (c) => cloud(128, 100, 1.15, '#E8F4FF') + bolt(132, 176, 0.75, c.mark),
  ],
  dynamite: [
    (c) => P(starP(128, 136, 104, 62, 10), c.bg2, { sw: 7 }) + bomb(122, 140, 1.05),
    (c) => keyI(122, 132, 1.3, '#FFC83D') + P([[178, 60], [198, 82], [184, 112], [164, 90]], '#7FE0FF', { sw: 7 }) + sparkle(70, 80, 0.9),
    (c) => chest(128, 150, 1.25, '#B0703C', '#D5DBE6') + coin(88, 74, 0.55) + coin(132, 60, 0.55) + coin(176, 78, 0.55),
    (c) => P(starP(128, 118, 96, 58, 8), '#FFE14D', { sw: 7 }) + chest(128, 150, 1.1, '#5E3A22', '#FFC83D'),
  ],
  rift: [
    (c) => crack(128, 112, 1.35, c.mark) + arrowDown(128, 204, 0.6, '#FFFFFF'),
    (c) => pick(118, 104, 1.15, '#FFA51C', '#5C3A1F', 0) + arrowDown(160, 176, 0.85, '#FFFFFF'),
    (c) => P(tf([[-46, -34], [0, 6], [46, -34], [46, -6], [0, 34], [-46, -6]], 128, 92, 1), '#FFFFFF') + P(tf([[-46, -34], [0, 6], [46, -34], [46, -6], [0, 34], [-46, -6]], 128, 168, 1), c.mark),
    (c) => R(48, 92, 160, 24, '#B3A08C') + R(48, 150, 160, 24, '#B3A08C') + P(tf([[-10, -70], [10, -70], [10, 30], [28, 30], [0, 70], [-28, 30], [-10, 30]], 128, 132, 1), '#FFFFFF'),
  ],
  frost: [
    (c) => C(128, 128, 92, 'none', { stroke: '#BDEFFF', sw: 8 }) + snowflake(128, 128, 1.25, '#FFFFFF'),
    (c) => pick(124, 112, 1.2, '#BDEFFF', '#5C3A1F', -20) + P(tf([[-10, -30], [10, -30], [10, -10], [30, -10], [30, 10], [10, 10], [10, 30], [-10, 30], [-10, 10], [-30, 10], [-30, -10], [-10, -10]], 186, 184, 1), '#FFE14D', { sw: 7 }),
    (c) => R(46, 120, 164, 70, '#5B6475') + L('M128 120 l -14 22 l 18 14 l -12 34', INK, 9) + L('M128 120 l -14 22 l 18 14 l -12 34', '#BDEFFF', 4) + P([[150, 54], [176, 120], [150, 132], [124, 120]], '#BDEFFF'),
    (c) => R(84, 96, 72, 72, '#BDEFFF', { t: 'rotate(-8 120 132)' }) + P([[176, 82], [204, 92], [190, 116]], '#BDEFFF', { sw: 7 }) + P([[60, 176], [84, 196], [56, 208]], '#BDEFFF', { sw: 7 }) + P([[188, 170], [212, 176], [196, 200]], '#BDEFFF', { sw: 7 }) + L('M96 110 l 26 24 l -10 24 M122 134 l 26 -12', INK, 7),
  ],
};

function badge(c, hex) {
  if (hex) return P(ngon(128, 128, 118, 6, Math.PI / 6), '#FFC83D', { sw: 10 }) + P(ngon(128, 128, 98, 6, Math.PI / 6), c.bg, { sw: 8 }) + P([...ngon(128, 128, 98, 6, Math.PI / 6).slice(3, 6), [128 + 98 * 0.87, 128 - 8], [128 - 98 * 0.87, 128 - 8]].filter((_, i) => true), c.bg2, { sw: 0 });
  return C(128, 128, 116, c.bg, { sw: 10 }) + `<path d="M 12 128 A 116 116 0 0 1 244 128 Z" fill="${c.bg2}" opacity="0.55"/>` + C(128, 128, 116, 'none', { sw: 10 });
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${inner}</svg>`;
const famMark = { storm: (c) => bolt(128, 130, 1.45, c.mark), dynamite: () => bomb(120, 140, 1.15), rift: (c) => crack(128, 128, 1.5, c.mark), frost: () => snowflake(128, 128, 1.3, '#FFFFFF') };

const icons = {};
for (const [id, c] of Object.entries(FAM)) {
  icons[`family_${id}`] = { svg: svg(badge(c, true) + famMark[id](c)), label: c.name };
  SYM[id].forEach((fn, i) => (icons[`skill_${id}_${i + 1}`] = { svg: svg(badge(c, false) + fn(c)), label: SKILLS[id][i] }));
}
writeFileSync(new URL('./icons.json', import.meta.url), JSON.stringify(Object.fromEntries(Object.entries(icons).map(([k, v]) => [k, v.svg]))));
const cells = Object.entries(icons).map(([k, v]) => `<figure data-id="${k}">${v.svg}<figcaption>${v.label}</figcaption></figure>`).join('');
writeFileSync(new URL('./icons.html', import.meta.url), `<!doctype html><meta charset="utf-8"><title>ready</title><style>
body{margin:0;background:#2B2B30;font:700 18px DejaVu Sans,sans-serif;color:#eee}main{display:grid;grid-template-columns:repeat(5,200px);gap:8px;padding:16px}
figure{margin:0;text-align:center}figure svg{width:180px;height:180px}figcaption{margin-top:2px}</style><main>${cells}</main>`);
console.log('icons:', Object.keys(icons).length);
