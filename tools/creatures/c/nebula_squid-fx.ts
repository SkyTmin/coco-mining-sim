import { ellFill, oval, pathSmear, progress } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import { techniqueContacts } from '../technique';
import book from './nebula_squid-keys';
import type { Creature, FxInput, XY } from '../types';

const tau = 2 * Math.PI;
const pearl = ['#292648', '#544880', '#a0abd9', '#f6f2e5'];
const blue = ['#212744', '#394f80', '#68b5c9', '#c5fff1'];
const amber = ['#443044', '#9d5a65', '#f6b96f', '#fff3c4'];
const rose = ['#392941', '#724977', '#cf84af', '#ffe6d8'];
type Pigment = string[];
const envelope = (n: number, a: number, b: number, c: number, d: number) =>
  progress(n, a, b) * (1 - progress(n, c, d));
function gem(p: Pen, [x, y]: XY, r: number, palette: Pigment, opacity: number, spin = 0) {
  if (opacity <= 0 || r < 0.45) return;
  const poly: number[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = spin + (i * Math.PI) / 4,
      rad = i % 2 ? r * 0.36 : r;
    poly.push(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
  }
  p.col(palette[0], opacity);
  fillPoly(p, poly);
  for (let i = 0; i < 4; i++) {
    const at = i * 4,
      j = (at + 2) % 16,
      k = (at + 14) % 16;
    p.col(palette[(i % 3) + 1], opacity);
    fillPoly(p, [
      x,
      y,
      x + 0.79 * (poly[k] - x),
      y + 0.79 * (poly[k + 1] - y),
      x + 0.85 * (poly[at] - x),
      y + 0.85 * (poly[at + 1] - y),
      x + 0.8 * (poly[j] - x),
      y + 0.8 * (poly[j + 1] - y),
    ]);
  }
  p.lineS(x - 1, y - 1, x + 1, y, palette[3], opacity);
}
function fieldShade(f: FxInput, color: string, amount: number) {
  if (amount <= 0) return;
  f.backdrop.col(color, amount);
  f.backdrop.rect(0, 0, f.w, f.h);
}
function crown(p: Pen, at: XY, r: number, w: number, color: Pigment, alpha: number, phase = 0) {
  for (let j = 0; j < 3; j++) oval(p, [at[0], at[1] - j * 0.7], r, w, color[j], alpha);
  oval(p, [at[0], at[1] - 1], r, w, color[3], alpha, 3.3 + phase, 4.9 + phase);
}
function spiralStars(f: FxInput, at: XY, age: number) {
  const end = f.pointAt(45 / 24, 'funnel'),
    head = f.pointAt(45 / 24, 'head');
  const side = end[0] >= head[0] ? 1 : -1;
  // The visible coil is a cone rooted in the short siphon. Its stars stay
  // in open water ahead of the head until each reaches the nozzle.
  for (let j = 0; j < 7; j++) {
    const hero = j < 4,
      tier = hero ? j : j - 4,
      phase = tier * 1.58 + (hero ? 0 : 0.76);
    let x: number, y: number, alpha: number;
    if (age < 0) {
      const u = progress(age, -28 + 2 * tier, -1) ** 1.65;
      const angle = phase + u * 3.7;
      const depth = (1 - u) * (45 + 6 * tier);
      x = at[0] + side * (depth + Math.cos(angle) * depth * 0.36);
      y = at[1] - depth * 0.27 + Math.sin(angle) * depth * 0.54;
      alpha = progress(age, -36, -26) * (hero ? 1 : 0.81);
      if (u > 0.94) alpha *= 1 - progress(u, 0.94, 1);
    } else {
      if (age < 3) continue;
      const u = progress(age, 3, 23),
        angle = -1.19 + tier * 0.61 + (hero ? 0 : 0.26);
      const len = (hero ? 52 + tier * 4 : 35 + tier * 6) * u;
      x = at[0] + side * Math.cos(angle) * len;
      y = at[1] + Math.sin(angle) * len + 5 * u * u;
      alpha = 1 - progress(age, 13, 26);
      f.above.lineS(
        x - side * (2 + 4 * u) * Math.cos(angle),
        y - (2 + 4 * u) * Math.sin(angle),
        x,
        y,
        hero ? amber[2] : pearl[2],
        alpha * 0.8,
      );
    }
    const palette = tier % 2 ? amber : blue;
    gem(f.above, [x, y], hero ? 7.1 : 3.4, palette, alpha, phase * 0.24 + age * 0.021);
  }
  if (age >= 0 && age < 8) {
    const pulse = 1 - progress(age, 3, 8);
    const flare: XY = [at[0] + side * 5, at[1] - 1];
    ellFill(f.above, flare, 13 * pulse, 9 * pulse, rose[1], 0.72 * pulse);
    gem(f.above, flare, 11.9 * pulse, pearl, pulse, 0.03);
    f.above.lineS(at[0], at[1], flare[0] + side * 13 * pulse, flare[1], amber[3], pulse);
  }
}
const chart: XY[] = [
  [169, 48],
  [178, 39],
  [191, 44],
  [205, 33],
  [214, 42],
  [207, 57],
  [194, 63],
  [178, 57],
  [169, 48],
];
function drawChart(f: FxInput, n: number) {
  const light = envelope(n, 13, 47, 94, 125);
  fieldShade(f, '#11152e', light * 0.49);
  const progressLine = progress(n, 34, 78);
  for (let i = 1; i < chart.length; i++) {
    const a = chart[i - 1],
      b = chart[i],
      v = Math.min(1, Math.max(0, progressLine * 8 - i + 1));
    if (v <= 0) continue;
    f.backdrop.lineS(...a, a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v, blue[2], light * 0.84);
    gem(f.backdrop, b, 2.9 + (i % 3), i % 2 ? blue : amber, light * v, i * 0.21);
  }
  if (n >= 57 && n < 98) {
    const a = envelope(n, 57, 70, 81, 98);
    f.sceneryRay(f.points.clubR, chart[3], amber[2], a * 0.75);
    crown(f.backdrop, chart[3], 5 + a * 4, 4 + a * 3, amber, a * 0.78);
  }
}
export function astrolabeStone(f: FxInput, n: number): XY {
  const grip = (side: string): XY => [f.points[side][0], f.points[side][1] - 4];
  if (n <= 28) return grip('clubL');
  if (n >= 88) return grip('clubR');
  const a = f.pointAt(28 / 24, 'clubL'),
    b = f.pointAt(88 / 24, 'clubR'),
    u = (n - 28) / 60;
  return [
    a[0] * (1 - u) + b[0] * u + 14 * Math.sin(tau * u),
    a[1] * (1 - u) + b[1] * u - 4 - 75 * 4 * u * (1 - u),
  ];
}
function trick(f: FxInput, n: number) {
  drawChart(f, n);
  const k = envelope(n, 3, 14, 113, 125);
  const at = astrolabeStone(f, n);
  if (k > 0) {
    const spin = n > 28 && n < 88 ? ((n - 28) / 60) * tau : 0;
    const r = 7.3 * k;
    ellFill(f.above, at, r + 2, r + 1, amber[1], k * 0.28);
    gem(f.above, at, r, amber, k, spin);
    if (n > 36 && n < 84 && Math.cos(spin * 2) > 0.6)
      f.above.lineS(at[0] - 2, at[1] - 3, at[0] + 1, at[1] - 3, pearl[3], k);
  }
}
function emergence(f: FxInput, n: number) {
  const remain = 1 - progress(n, 31, 45);
  if (remain <= 0) return;
  const opening = progress(n, 3, 26),
    feet = f.feet;
  // Two pearl valves turn away from a shared hinge. Each has a rounded outer
  // lip, radial growth ridges and a warmer concave inner layer.
  for (const side of [-1, 1]) {
    const hinge: XY = [feet[0] + side * (3 + 11 * opening), feet[1] + 12];
    const edge = (u: number, v: number): XY => {
      const a = Math.PI * u;
      const width = (46 + 8 * opening) * Math.sin(a) ** 0.8;
      const vx = 8 + 32 * u + width * 0.44,
        vy = -7 - 50 * Math.sin(a) ** 0.82 + 11 * u;
      const theta = side * opening * 0.87,
        x = side * vx * v,
        y = vy * v;
      return [
        hinge[0] + x * Math.cos(theta) - y * Math.sin(theta),
        hinge[1] + x * Math.sin(theta) + y * Math.cos(theta),
      ];
    };
    const pen = f.above;
    const colors = ['#393354', '#656180', '#94879f', '#c39ebb', '#e9c8cd'];
    for (let tier = 0; tier < 5; tier++) {
      const rr = 1 - tier * 0.075;
      const poly = [hinge[0], hinge[1]];
      for (let j = 0; j <= 23; j++) poly.push(...edge(j / 23, rr));
      pen.col(colors[tier], remain);
      fillPoly(pen, poly);
    }
    for (let j = 1; j < 13; j++) {
      const u = j / 13,
        a = edge(u, 0.26),
        m = edge(u + 0.025, 0.58),
        b = edge(u, 0.94);
      pen.lineS(...a, ...m, rose[(j % 2) + 1], remain * 0.82);
      pen.lineS(...m, ...b, j % 3 ? pearl[2] : rose[3], remain * 0.9);
      const c = edge(u, 0.9),
        e = edge(u + 0.031, 0.92);
      pen.lineS(...c, ...e, pearl[3], remain);
    }
    let a = edge(0, 1);
    for (let j = 1; j <= 21; j++) {
      const b = edge(j / 21, 1);
      pen.lineS(...a, ...b, j % 5 ? pearl[2] : pearl[3], remain);
      a = b;
    }
    gem(pen, edge(0.53, 0.83), 2.8, pearl, remain);
  }
}
// The colour of each technique's impact. Its contact (socket and frame) is not written here again: it comes from the
// technique book, the single source the gate and the timing already read [research 23.11, VIII.5.3.2].
const pigments: Record<string, Pigment> = {
  tech_star_spiral: pearl,
  tech_lunar_hook: rose,
  tech_tidal_club: blue,
  tech_long_cast: amber,
  tech_orbit_chimes: amber,
  tech_comet_form: blue,
};
function contactOf(anim: string) {
  const spec = book[anim];
  if (!spec || !pigments[anim]) return undefined;
  const contacts = techniqueContacts(spec);
  // the impact below is drawn for one contact; a book entry with several needs its own choice here, not a silent first
  if (contacts.length !== 1) throw new Error(`nebula_squid ${anim}: ${contacts.length} contacts in the book, the FX draws one impact`);
  return contacts[0];
}
export const effects: Creature['effects'] = (f) => {
  const n = Math.round(f.t * 24);
  if (f.anim === 'show') {
    fieldShade(f, '#070816', 1 - progress(n, 43, 103));
    const light = 1 - progress(n, 22, 36);
    if (light > 0) gem(f.backdrop, [f.w * 0.5, f.h * 0.46], 6.8 * light + 1, pearl, light, 0.1);
    return;
  }
  if (f.anim === 'trick') {
    trick(f, n);
    return;
  }
  if (f.anim === 'hatch') emergence(f, n);
  if (f.anim === 'happy' || f.anim === 'hatch') {
    const a = envelope(n, 1, 9, 28, 44);
    for (let i = 0; i < 9; i++) {
      const tip = f.points[i % 2 ? 'clubR' : 'clubL'],
        u = (n * 0.046 + i * 0.17) % 1;
      gem(
        f.above,
        [tip[0] + (i % 2 ? 1 : -1) * (3 + 13 * u), tip[1] - 14 * u + 3 * Math.sin(i + u * 5)],
        3.4 * (1 - u) + 1,
        i % 3 ? pearl : amber,
        a,
      );
    }
    return;
  }
  const contact = contactOf(f.anim);
  if (!contact) return;
  const { socket, frame } = contact,
    color = pigments[f.anim],
    age = n - frame;
  if (n >= frame - 6 && n < frame + 4) {
    pathSmear(f, socket, (frame - 6) / 24, frame / 24, 3.5, color[0], color[2], color[3]);
    paintSocketTrail(f, 'above', socket, (frame - 6) / 24, Math.min(n, frame) / 24, {
      color: color[3],
      width: 1,
      alpha: 1 - progress(age, 0, 4),
    });
  }
  if (f.anim === 'tech_star_spiral') {
    const at = age < 0 ? f.points[socket] : f.pointAt(frame / 24, socket);
    if (age >= -35 && age < 27) spiralStars(f, at, age);
  }
  if (age < 0 || age > 26) return;
  const at = f.pointAt(frame / 24, socket),
    fade = 1 - progress(age, 8, 24),
    u = progress(age, 0, 15),
    dir = at[0] > f.feet[0] ? 1 : -1;
  paintImpact(f, 'above', socket, at, (p, x, y) => gem(p, [x, y], 3.6, color, fade));
  if (f.anim === 'tech_tidal_club') {
    for (let i = 0; i < 3; i++) {
      const q = progress(age, i * 2, 14 + i * 2);
      if (q > 0) crown(f.under, at, 3 + q * (29 - i * 3), 2 + q * (9 - i), blue, fade);
    }
  } else if (f.anim === 'tech_lunar_hook') {
    for (let i = 0; i < 5; i++)
      oval(
        f.above,
        [at[0] + dir * u * 7, at[1]],
        8 + 12 * u + i,
        8 + 6 * u + i,
        [rose[1], rose[2], pearl[3], rose[3], rose[2]][i],
        fade,
        dir > 0 ? -1.4 : 1.8,
        dir > 0 ? 1.1 : 4.2,
      );
  } else if (f.anim === 'tech_long_cast') {
    const club = f.points.clubR;
    crown(f.above, [club[0] + dir * 4, club[1]], 7 + u * 3, 5.5, amber, fade);
    gem(f.above, [club[0] + dir * 7, club[1] - 1], 7.1, pearl, fade, 0.28);
  } else if (f.anim === 'tech_orbit_chimes') {
    for (let i = 0; i < 3; i++) {
      const q = progress(age, i * 4, 7 + i * 4);
      if (q <= 0) continue;
      const ground: XY = [at[0] + dir * (i * 10 + 1), at[1] - i * 1.6];
      crown(f.under, ground, 3 + q * 5, 2 + q * 1.7, amber, fade);
      f.above.lineS(ground[0], ground[1] - 2, ground[0], ground[1] - q * (18 + i * 4), amber[2], fade * 0.87);
      for (let j = 0; j < 4; j++)
        gem(
          f.above,
          [ground[0] + Math.sin(j * 1.8) * 2, ground[1] - q * (3 + j * 5 + i * 3)],
          3.6,
          amber,
          fade,
        );
    }
  } else if (f.anim === 'tech_comet_form') {
    for (let i = 0; i < 7; i++) {
      const a = (i * tau) / 7,
        q = (10 + (i % 3) * 4) * u;
      gem(
        f.above,
        [at[0] + dir * (10 + u * 13) + q * Math.cos(a), at[1] + q * Math.sin(a)],
        3.7 - (i % 2),
        blue,
        fade,
        a,
      );
    }
  }
};
