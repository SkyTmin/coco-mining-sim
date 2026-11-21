import { ellFill, oval, pathSmear, progress, scatter, shard } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

const ochre = ['#573b38', '#94623d', '#d7954b', '#ffdc8b'];
const jade = ['#183e4a', '#277487', '#62c9c8', '#dcfff1'];
const ruby = ['#663646', '#b4553e', '#f49a51', '#ffe09b'];
const tau = 2 * Math.PI;
const window = (n: number, a: number, b: number, c: number, d: number) =>
  progress(n, a, b) * (1 - progress(n, c, d));
function ridge(p: Pen, x: number, y: number, w: number, h: number, color: string[], opacity: number) {
  const outline = [
    x - w,
    y,
    x - w * 0.62,
    y - h * 0.48,
    x - w * 0.21,
    y - h * 0.86,
    x + w * 0.23,
    y - h,
    x + w * 0.68,
    y - h * 0.54,
    x + w,
    y,
  ];
  p.col(color[0], opacity);
  fillPoly(p, outline);
  p.col(color[1], opacity);
  fillPoly(p, [
    x - w + 1,
    y - 1,
    x - w * 0.62,
    y - h * 0.48 + 1,
    x + w * 0.23,
    y - h + 1,
    x + w * 0.57,
    y - h * 0.55,
    x + w * 0.28,
    y - 1,
  ]);
  p.col(color[2], opacity);
  fillPoly(p, [
    x - w * 0.72,
    y - h * 0.32,
    x - w * 0.21,
    y - h * 0.86 + 1,
    x + w * 0.23,
    y - h + 1,
    x + w * 0.14,
    y - h * 0.65,
    x - w * 0.49,
    y - h * 0.25,
  ]);
  p.lineS(x - w * 0.2, y - h * 0.86, x + w * 0.23, y - h, color[3], opacity);
  for (let i = 0; i < 5; i++)
    p.lineS(
      x - w * 0.44 + i * w * 0.15,
      y - h * (0.29 + 0.1 * (i % 3)),
      x - w * 0.41 + i * w * 0.15,
      y - h * (0.29 + 0.1 * (i % 3)),
      color[2 + (i % 2)],
      opacity,
    );
}
function sun(p: Pen, pt: XY, r: number, opacity: number) {
  for (let i = 0; i < 8; i++) {
    const a = (tau * i) / 8;
    shard(
      p,
      pt[0] + r * Math.cos(a),
      pt[1] + r * Math.sin(a),
      2 * Math.cos(a),
      2 * Math.sin(a),
      1.1,
      ochre[3],
      ochre[1],
      opacity,
    );
  }
  ellFill(p, pt, r * 0.73, r * 0.73, ochre[0], opacity);
  ellFill(p, pt, r * 0.58, r * 0.58, ruby[2], opacity);
  oval(p, pt, r * 0.56, r * 0.56, ochre[3], opacity, Math.PI, 1.9 * Math.PI);
}
function scarab(p: Pen, x: number, y: number, angle: number, opacity: number) {
  for (let side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const step = Math.sin(angle + i * 1.9) * 1.4;
      p.lineS(x + side, y + i - 1, x + side * (3 + (i % 2)), y + i - 2 + step, ochre[0], opacity);
    }
  ellFill(p, [x, y], 2.1, 2.8, ochre[0], opacity);
  ellFill(p, [x - 0.4, y - 0.4], 1.5, 2, ochre[2], opacity);
  p.lineS(x, y - 2, x, y + 1, ochre[3], opacity);
}
function diggingMound(f: FxInput, buried: number, fade: number) {
  const cx = f.feet[0] + 5,
    cy = f.feet[1] + 29,
    width = 39 + 29 * buried,
    height = 6 + 41 * buried;
  const sand = ['#705246', '#936d50', '#b48a60', '#cc9f6c', '#e7bd84'];
  // A tilted bed of sand surrounds the feet. Each column uses a rounded,
  // broken crest and an elliptical toe instead of a straight cut across the floor.
  const pen = f.above;
  for (let x = -Math.ceil(width); x <= width; x++) {
    const u = x / width,
      shape = Math.max(0, 1 - u * u);
    const crest =
      cy - height * shape * (0.73 + 0.14 * Math.cos(u * 8 + 1) + 0.08 * Math.sin(u * 14));
    const toe = cy + 8 * shape + 2.5 * Math.cos(u * 15) + 1.6 * Math.sin(u * 21) - 2 * u;
    const top = Math.round(crest),
      bottom = Math.round(toe);
    for (let y = top; y <= bottom; y++) {
      const depth = (y - top) / Math.max(1, bottom - top);
      const grain = (((x * 133 + y * 59 + Math.abs(x * y) * 7) % 31) + 31) % 31;
      const ripple = Math.sin(23 * depth + 3.2 * Math.sin(7 * u) + 4 * u);
      let band = 2 + Number(ripple > 0.36) - Number(ripple < -0.74);
      if (depth < 0.1 || (u < -0.2 && ripple > 0.72)) band++;
      if (grain === 2 || (grain === 3 && depth < 0.67)) band++;
      if (grain === 12 || y === bottom) band--;
      if (y === top) band = 3 + Number(grain < 9);
      pen.col(sand[Math.min(4, Math.max(0, band))], fade);
      pen.span(Math.round(cx + x), y, 1);
    }
  }
  for (let i = 0; i < 19; i++) {
    const u = ((i * 37) % 31) / 15 - 1,
      x = cx + u * width * 1.06;
    const y = cy + (1 - u * u) * 8 + Math.sin(i * 3) * 2 + 2;
    pen.lineS(x, y, x + 1 + (i % 2), y, sand[1 + (i % 3)], fade);
  }
}
function oracle(f: FxInput, n: number) {
  const night = window(n, 12, 39, 76, 98),
    awaken = window(n, 35, 46, 76, 92);
  if (night > 0) {
    f.backdrop.col('#151631', night * 0.3);
    fillPoly(f.backdrop, [0, 0, f.w, 0, f.w, f.h, 0, f.h]);
    const wall: XY = [f.w * 0.77, f.h * 0.28];
    for (const [i, torch] of (
      [
        [45, 68],
        [211, 70],
      ] as XY[]
    ).entries()) {
      const kindle = night * progress(n, 24 + i * 6, 39 + i * 6);
      const flame: XY = [torch[0], torch[1] - 5];
      ellFill(f.backdrop, flame, 12, 13, ruby[2], kindle * 0.23);
      shard(f.backdrop, flame[0], flame[1], Math.sin(n * 0.31 + i), -5, 2.4, ochre[3], ruby[2], kindle);
    }
    for (let i = -1; i <= 1; i++) {
      const u = awaken * progress(n, 35 + 4 * (i + 1), 43 + 4 * (i + 1));
      if (u <= 0) continue;
      const at: XY = [wall[0] + i * 15, wall[1] - 4 * (1 - Math.abs(i))];
      ellFill(f.backdrop, at, 10, 11, ochre[2], u * 0.19);
      if (!i) sun(f.backdrop, at, 6.5, u);
      else {
        const [x, y] = at;
        for (let j = 0; j < 3; j++)
          f.backdrop.lineS(x - 4 * i, y + j * 2, x + 2 * i, y - 5 + j * 2, ochre[j + 1], u);
        f.backdrop.lineS(x + 2 * i, y - 5, x + 5 * i, y - 3, ochre[3], u);
      }
    }
    const face = f.points.diskFace ?? f.points.disk;
    if (awaken > 0) {
      for (let j = 0; j < 3; j++) {
        const intensity = awaken * (j === 1 ? 0.83 : 0.34);
        f.sceneryRay(
          [face[0], face[1] + j - 1],
          [wall[0], wall[1] + j - 1],
          j === 1 ? ochre[3] : ruby[2],
          intensity,
        );
      }
      for (let i = 0; i < 4; i++) {
        const u = progress(n, 44 + i * 3, 83 + i * 2);
        scarab(
          f.backdrop,
          wall[0] + (i - 1.5) * 9 + (i % 2 ? 1 : -1) * 15 * u,
          wall[1] + 16 + 18 * u + Math.sin(u * 6 + i) * 3,
          n * 0.65 + i,
          awaken,
        );
      }
    }
  }
  if (n >= 31 && n < 66) {
    paintSocketTrail(f, 'under', 'disk', Math.max(30, n - 2) / 24, n / 24, {
      color: ochre[3],
      width: 1,
      alpha: 0.65,
    });
    const d = f.points.diskFace ?? f.points.disk;
    const flash = Math.max(0, Math.cos(n * 0.42)) ** 5;
    if (flash > 0.2) shard(f.above, d[0], d[1], 2.3, -3.8, 1.4, ochre[3], ruby[2], flash);
  }
  if (n >= 76 && n < 94) scatter(f, f.points.clawL, (n - 76) / 24, 24, 8, ochre, 0.65);
}
function sandSpout(f: FxInput, at: XY, age: number) {
  const open = progress(age, 0, 8),
    fall = progress(age, 12, 27),
    fade = 1 - progress(age, 18, 30);
  if (fade <= 0) return;
  const h = 32 * open * (1 - fall * 0.86);
  for (let j = 0; j < 6; j++) {
    const u = (j + 1) / 6,
      r = (3 + u * 13) * open * (1 + fall * 0.45);
    const center: XY = [at[0] + Math.sin(age * 0.19 + u * 3) * 4 * u, at[1] - h * u];
    for (let b = 0; b < 3; b++)
      oval(
        f.above,
        [center[0], center[1] + b],
        r,
        1.7 + r * 0.23,
        ochre[3 - b],
        fade * (0.92 - 0.08 * u),
        age * 0.27 + j * 1.1,
        age * 0.27 + j * 1.1 + 4.8,
      );
    shard(
      f.above,
      center[0] + Math.cos(j * 2 + age * 0.21) * r,
      center[1] - 2,
      2,
      -1,
      1.3,
      ochre[3],
      ochre[1],
      fade,
    );
  }
  if (fall > 0) ridge(f.under, at[0] + 2, at[1] + 1, 20 * fall, 5 * fall, ochre, fade);
}
const hits: Record<string, [string, number]> = {
  tech_sand_vortex: ['sting', 41],
  tech_gate_claw: ['clawR', 28],
  tech_crescent_cut: ['clawL', 26],
  tech_beacon: ['stingFacet', 27],
  tech_dune_drum: ['footR0', 26],
};
export const effects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (f.anim === 'trick') {
    oracle(f, n);
    return;
  }
  if (f.anim === 'phase' || f.anim === 'idle-f2') {
    const phase = f.anim === 'phase' ? progress(n, 12, 43) : 1;
    const a = f.points.sting;
    if (phase > 0) {
      ellFill(f.under, a, 11, 9, jade[2], 0.19 * phase);
      shard(f.above, a[0], a[1], 1.5, -3, 1.1, jade[3], jade[2], phase * 0.7);
    }
    if (f.anim === 'phase' && n > 6 && n < 40) {
      const alpha = window(n, 6, 17, 31, 40);
      for (let j = 0; j < 3; j++) {
        const center: XY = [f.feet[0] - 15 - 5 * j, f.feet[1] - 43 - j * 8];
        oval(
          f.under,
          center,
          26 + 8 * j,
          9 + j * 2,
          ochre[j + 1],
          alpha * 0.7,
          n * 0.13 + j,
          n * 0.13 + j + 2.8,
        );
      }
      scatter(f, f.points.crown ?? f.points.head, (n - 10) / 24, 3024, 10, ochre, 0.85);
    }
    return;
  }
  if (f.anim === 'happy') {
    const a = f.points.sting,
      light = window(n, 1, 8, 34, 43);
    ellFill(f.under, a, 10, 8, jade[2], 0.26 * light);
    for (const beat of [6, 15, 27])
      if (n >= beat && n < beat + 14)
        scatter(
          f,
          f.pointAt(beat / 24, beat === 27 ? 'clawL' : 'clawR'),
          (n - beat) / 24,
          81 + beat,
          7,
          ochre,
          0.58,
        );
    return;
  }
  if (f.anim === 'hatch') {
    const sink = 1 - progress(n, 6, 29),
      fade = 1 - progress(n, 28, 38);
    if (fade > 0) diggingMound(f, sink, fade);
    for (const beat of [8, 15, 23])
      if (n >= beat && n < beat + 17)
        scatter(
          f,
          f.pointAt(beat / 24, beat === 15 ? 'clawL' : 'clawR'),
          (n - beat) / 24,
          224 + beat,
          9,
          ochre,
          0.68,
        );
    const light = window(n, 10, 20, 27, 37);
    ellFill(f.under, f.points.sting, 13, 10, jade[2], 0.34 * light);
    return;
  }
  const hit = hits[f.anim];
  if (!hit) return;
  const [socket, frame] = hit,
    age = n - frame;
  const color = f.anim === 'tech_beacon' ? ruby : f.anim === 'tech_crescent_cut' ? jade : ochre;
  if (n >= frame - 5 && n < frame + 3) {
    pathSmear(f, socket, (frame - 5) / 24, frame / 24, 4, color[0], color[2], color[3]);
    paintSocketTrail(f, 'above', socket, (frame - 5) / 24, Math.min(frame, n) / 24, {
      color: color[3],
      width: 1,
      alpha: 1 - progress(age, 0, 3),
    });
  }
  if (age < 0 || age > 30) return;
  const at = f.pointAt(frame / 24, socket),
    fade = 1 - progress(age, 9, 22),
    dir = at[0] > f.feet[0] ? 1 : -1;
  if (f.anim !== 'tech_beacon')
    paintImpact(f, 'above', socket, at, (p, x, y) => {
      ellFill(p, [x, y], 3, 2, color[1], fade);
      shard(p, x, y, 2, -2, 1.6, color[3], color[2], fade);
    });
  if (f.anim === 'tech_sand_vortex') sandSpout(f, at, age);
  else if (f.anim === 'tech_crescent_cut') {
    const u = progress(age, 0, 12);
    for (let j = 0; j < 2; j++)
      for (let b = 0; b < 4; b++)
        oval(
          f.above,
          [at[0] + dir * (j * 5 + u * 11), at[1] + j * 4],
          6 + u * 13 + b,
          6 + u * 9 + b,
          color[b],
          fade,
          dir > 0 ? -1.4 : 1.7,
          dir > 0 ? 1.18 : 4.25,
        );
  } else if (f.anim === 'tech_beacon') {
    for (let j = 0; j < 3; j++) {
      const release = frame + j * 3;
      if (n < release) continue;
      const source = f.pointAt(release / 24, socket);
      paintImpact(f, 'above', socket, source, (p, x, y) =>
        shard(p, x, y, 2, -2, 1.5, ruby[3], ruby[1], 1 - progress(n - release, 0, 3)),
      );
      const u = progress(age, j * 3, j * 3 + 10);
      if (!u) continue;
      const x = source[0] + dir * (18 + j * 7) * u,
        y = source[1] - (10 + j * 5) * u - 5 * Math.sin(u * Math.PI);
      shard(f.above, x, y, dir * 4, -2, 2.2, ruby[3], ruby[1], fade);
      if (u === 1) sun(f.under, [x, y], 4.2, fade);
    }
  } else {
    for (let j = 0; j < 3; j++) {
      const u = progress(age, j * 3, j * 3 + 5);
      if (!u) continue;
      const drum = f.anim === 'tech_dune_drum';
      ridge(
        f.under,
        at[0] + dir * (6 + j * (drum ? 9 : 5)),
        at[1] + j * 2,
        drum ? 7 : 5,
        (2 + j * (drum ? 4 : 1)) * u,
        ochre,
        fade,
      );
    }
  }
  scatter(f, at, age / 24, 95, 8, color, 0.63);
};
