import { ellFill, oval, pathSmear, progress, scatter, shard } from '../fx/field';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

const ink = ['#191b36', '#283353', '#426a86', '#81d1d2'];
const brass = ['#513b41', '#9d6d48', '#dba451', '#ffdfa0'];
const contacts: Record<string, [string, number]> = {
  tech_chart_route: ['sabre', 39],
  tech_signal_bell: ['bell', 25],
  tech_sounding: ['lantern', 28],
  tech_pennant: ['pennant', 25],
};

function chartRoute(f: FxInput, at: XY, age: number, fade: number) {
  const direction = at[0] > f.feet[0] ? 1 : -1;
  const run = Math.min(34, direction > 0 ? f.w - at[0] - 9 : at[0] - 9) / 39;
  const fall = Math.max(0, Math.min(1.8, (f.h - at[1] - 9) / 7));
  const waypoints = [
    [0, 0],
    [10, 3],
    [17, -1],
    [24, 4],
    [32, 2],
    [39, 7],
  ];
  for (let i = 1; i < waypoints.length; i++) {
    const amount = progress(age, (i - 1) * 2, i * 2);
    if (!amount) continue;
    const [px, py] = waypoints[i - 1],
      [qx, qy] = waypoints[i];
    const x = at[0] + direction * run * px,
      y = at[1] + fall * py;
    const targetX = x + direction * run * (qx - px) * amount,
      targetY = y + fall * (qy - py) * amount;
    for (let k = 0; k < 4; k++) f.above.lineS(x, y + 2 - k, targetX, targetY + 2 - k, ink[k], fade);
    ellFill(f.above, [targetX, targetY], 2, 1, ink[3], fade);
  }
  if (age < 10) return;
  const x = at[0] + 39 * direction * run,
    y = at[1] + 7 * fall,
    r = 4 + 2 * Math.sin(progress(age, 10, 22) * Math.PI);
  for (const sign of [-1, 1]) {
    for (let k = 0; k < 3; k++)
      f.above.lineS(x - r, y + sign * r + k - 1, x + r, y - sign * r + k - 1, brass[k + 1], fade);
  }
  scatter(f, [x, y], (age - 10) / 24, 815, 8, brass, 0.63);
}
function rings(f: FxInput, at: XY, age: number, sounding: boolean, fade: number) {
  for (let i = 0; i < 3; i++) {
    const u = progress(age, i * 3, i * 3 + 12);
    if (!u) continue;
    const center: XY = [at[0], at[1] - (sounding ? 0 : 3 * u)];
    for (let band = 0; band < 4; band++)
      oval(
        f.above,
        center,
        2 + 15 * u + band,
        2 + (sounding ? 5 : 12) * u + band * 0.5,
        ink[band],
        fade * (1 - 0.15 * i),
      );
  }
}
export const effects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (f.anim === 'trick') {
    for (const [socket, begin, end] of [
      ['scopeGrip', 18, 50],
      ['sabreGrip', 24, 60],
      ['mapGrip', 22, 54],
      ['hatGrip', 28, 65],
    ] as const) {
      if (n <= begin + 2 || n >= end) continue;
      paintSocketTrail(f, 'under', socket, (n - 2) / 24, n / 24, { color: ink[3], width: 1, alpha: 0.58 });
    }
    return;
  }
  const contact = contacts[f.anim];
  if (!contact) return;
  const [socket, hit] = contact,
    age = n - hit,
    fade = 1 - progress(age, socket === 'sabre' ? 21 : 9, socket === 'sabre' ? 31 : 21);
  if (n >= hit - 5 && n < hit + 4) {
    pathSmear(f, socket, (hit - 5) / 24, hit / 24, 3.6, ink[0], ink[2], ink[3]);
    paintSocketTrail(f, 'above', socket, (hit - 5) / 24, Math.min(n, hit) / 24, {
      color: brass[3],
      width: 1,
      alpha: 1 - progress(n, hit, hit + 4),
    });
  }
  if (age < 0 || fade <= 0) return;
  const at = f.pointAt(hit / 24, socket);
  paintImpact(f, 'above', socket, at, (pen, x, y) => {
    ellFill(pen, [x, y], 3.4, 2.3, ink[1], fade);
    shard(pen, x, y, 2, -2, 1.7, brass[3], ink[2], fade);
  });
  if (socket === 'sabre') chartRoute(f, at, age, fade);
  else if (socket === 'lantern' || socket === 'bell') rings(f, at, age, socket === 'lantern', fade);
  else {
    const u = progress(age, 0, 12),
      dir = at[0] > f.feet[0] ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const center: XY = [at[0] + dir * (i * 4 + 9 * u), at[1] - i * 3];
      for (let b = 0; b < 4; b++)
        oval(
          f.above,
          center,
          4 + i + 8 * u + b,
          3 + 10 * u + b,
          ink[b],
          fade,
          dir > 0 ? -1.25 : 1.85,
          dir > 0 ? 1.1 : 4.45,
        );
    }
  }
  scatter(f, at, age / 24, 815, 8, ink, 0.65);
};
