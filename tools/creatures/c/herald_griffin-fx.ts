import { ellFill, oval, pathSmear, progress, scatter, shard } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

const tau = Math.PI * 2;
const gold = ['#503530', '#aa693b', '#ecae53', '#fff2b6'];
const wax = ['#532633', '#933538', '#dd523c', '#ff9c5d'];
const air = ['#34455e', '#6095af', '#a3cdd4', '#fff0c1'];
function letter(p: Pen, [x, y]: XY, angle: number, size: number, alpha = 1) {
  const c = Math.cos(angle) * size,
    s = Math.sin(angle) * size;
  const at = (a: number, b: number): XY => [x + c * a - s * b, y + s * a + c * b];
  const shape = (ink: string, points: XY[]) => {
    p.col(ink, alpha);
    fillPoly(p, points.flat());
  };
  shape('#50373a', [at(-1, -0.66), at(1, -0.66), at(1, 0.66), at(-1, 0.66)]);
  shape('#e1bd7e', [at(-0.84, -0.45), at(0.84, -0.45), at(0.84, 0.47), at(-0.84, 0.47)]);
  shape('#fff0c9', [at(-0.87, -0.45), at(0.88, -0.45), at(0.05, 0.22)]);
  p.lineS(...at(-0.8, -0.42), ...at(0.05, 0.22), '#aa8053', alpha);
  p.lineS(...at(0.05, 0.22), ...at(0.76, -0.41), '#906d51', alpha);
  ellFill(p, at(0.04, 0.13), Math.max(1, size * 0.18), Math.max(1, size * 0.16), wax[2], alpha);
}
function rosette(p: Pen, [x, y]: XY, r: number, a: number) {
  for (let i = 0; i < 12; i++) {
    const k = (i * tau) / 12;
    ellFill(p, [x + Math.cos(k) * r * 0.78, y + Math.sin(k) * r * 0.62], r * 0.28, r * 0.24, wax[i % 2], a);
  }
  for (const [scale, ink] of [
    [0.9, wax[1]],
    [0.77, wax[2]],
    [0.65, wax[0]],
    [0.56, wax[2]],
  ] as const)
    ellFill(p, [x, y], r * scale, r * scale * 0.83, ink, a);
  oval(p, [x, y], r * 0.78, r * 0.64, wax[3], a, Math.PI, Math.PI * 1.86);
  // Engraved heraldic flight feather, with cut barbs against the dark central field.
  p.lineS(x - r * 0.41, y + r * 0.22, x + r * 0.36, y - r * 0.32, gold[3], a);
  for (let i = 0; i < 3; i++) {
    const u = i * 0.17;
    p.lineS(
      x + r * (-0.32 + u),
      y + r * (0.19 - u * 0.7),
      x + r * (-0.4 + u),
      y - r * (0.07 + u * 0.5),
      gold[2],
      a,
    );
    p.lineS(
      x + r * (-0.27 + u),
      y + r * (0.15 - u * 0.7),
      x + r * (0.02 + u),
      y + r * (0.18 - u * 0.6),
      gold[3],
      a,
    );
  }
}
function postalTrick(f: FxInput, n: number) {
  if (n >= 8 && n < 77) {
    const release = f.pointAt(8 / 24, 'letter'),
      catchAt = f.pointAt(52 / 24, 'beak');
    const u = progress(n, 8, 52),
      arc = Math.sin(Math.PI * u);
    const pos: XY =
      n < 52
        ? [
            release[0] + (catchAt[0] - release[0]) * u + (42 + 12 * Math.sin(tau * u)) * arc,
            release[1] + (catchAt[1] - release[1]) * u - 39 * arc,
          ]
        : f.points.beak;
    if (n < 50 && n > 11) {
      const flutter = Math.sin(Math.PI * u);
      for (let i = 0; i < 2; i++) {
        const y = pos[1] + i * 3 + Math.sin(u * 8) * 3;
        f.under.lineS(pos[0] - 11 - i * 3, y + 2, pos[0] - 6, y, air[i + 1], 0.82 * flutter);
        f.under.lineS(pos[0] - 15 - i * 4, y + 2, pos[0] - 11 - i * 3, y + 2, air[3], 0.65 * flutter);
      }
    }
    const fade = 1 - progress(n, 70, 77);
    letter(f.above, [pos[0] + 5 * u, pos[1] + 3 * u], -0.3 + tau * u, 8, fade);
  }
  if (n >= 65 && n < 88) {
    const at = f.pointAt(65 / 24, 'stamp'),
      u = progress(n, 65, 72),
      fade = 1 - progress(n, 80, 88);
    const center: XY = [at[0] + 18 * u, at[1] - 20 * u];
    rosette(f.above, center, 4 + 8 * u, fade);
    scatter(f, center, (n - 65) / 24, 78, 9, gold, 0.66);
  }
}
function diveEcho(f: FxInput, n: number) {
  const age = progress(n, 19, 30),
    alpha = 0.38 * Math.sin(age * Math.PI);
  const time = (n - 4) / 24;
  const at = (name: string) => f.pointAt(time, name);
  const bill = at('beak'),
    head = at('head'),
    bag = at('bag'),
    wrist = at('wingWristR'),
    tip = at('wingTipR');
  f.under.col(air[0], alpha);
  fillPoly(
    f.under,
    [...bill, ...head, ...wrist, ...tip, ...bag, ...at('foreR'), ...head].map(
      (v, i) => v + (i % 2 ? -3 : -7),
    ),
  );
  f.under.lineS(wrist[0] - 7, wrist[1] - 3, tip[0] - 7, tip[1] - 3, air[2], alpha);
}
// The slipstream carries each envelope past the silhouette on a separate outer arc.
function mailWake(f: FxInput, n: number) {
  const bag = f.points.letter;
  for (let i = 0; i < 4; i++) {
    const u = progress(n, 19 + i * 2, 40 + i * 2);
    if (u <= 0 || u >= 1) continue;
    const arc = Math.sin(Math.PI * u),
      angle = tau * u + i * 0.37;
    const x = bag[0] - (55 + i * 4) * arc - 12 * Math.sin(tau * u);
    const y = bag[1] - (9 + i * 14) * arc + Math.sin(tau * u) * 11;
    const size = (i === 3 ? 4.8 : 6.3) + 1.5 * arc;
    f.under.lineS(x + 6 * arc, y + 5 * arc, x + 12 * arc, y + 6 * arc, air[2], 0.75 * arc);
    letter(f.above, [x, y], angle * 0.8, size, Math.min(1, u * 8, (1 - u) * 8));
  }
}
// A rolled dispatch travels from the satchel onto the planks. The wax rests at
// the exact floor socket, with the writing and curled paper extending to its right.
function charter(f: FxInput, n: number) {
  if (n < 3 || n > 58) return;
  const target = f.pointAt(39 / 24, 'stamp');
  const bag = f.pointAt(3 / 24, 'letter');
  const u = progress(n, 3, 18),
    fade = 1 - progress(n, 52, 58),
    unroll = progress(n, 11, 24);
  const x = bag[0] * (1 - u) + target[0] * u,
    y = bag[1] * (1 - u) + target[1] * u - 10 * Math.sin(Math.PI * u);
  const p = n < 17 ? f.above : f.under;
  const scale = 0.25 + 0.75 * unroll,
    edge = 18 * scale;
  const panel = (tone: string, poly: number[]) => {
    p.col(tone, fade);
    fillPoly(p, poly);
  };
  panel('#523a34', [x - 10, y + 3, x + 4, y - 9, x + edge + 9, y - 6, x + edge - 2, y + 6, x - 7, y + 9]);
  panel('#cc9f61', [x - 8, y + 3, x + 4, y - 8, x + edge + 7, y - 5, x + edge - 3, y + 5, x - 6, y + 8]);
  panel('#fae9bd', [x - 7, y + 1, x + 4, y - 8, x + edge + 6, y - 5, x + edge - 3, y + 4, x - 6, y + 6]);
  p.lineS(x + 4, y - 7, x + edge + 6, y - 5, '#fff8d9', fade);
  if (unroll > 0.4) {
    for (let i = 0; i < 3; i++)
      p.lineS(x + 5 - i * 1.5, y - 5 + i * 2, x + edge + 1 - i * 2, y - 3 + i * 2, '#947751', fade);
    p.lineS(x - 6, y + 5, x - 1, y + 7, '#674b39', fade);
  }
  ellFill(p, [x, y], 3.7, 2.5, wax[0], fade);
  ellFill(p, [x, y - 0.5], 2.8, 1.7, wax[2], fade);
}
function fan(f: FxInput, at: XY, age: number) {
  const u = progress(age, 0, 15),
    fade = 1 - progress(age, 8, 18),
    dir = at[0] >= f.feet[0] ? 1 : -1;
  for (let i = 0; i < 3; i++) {
    const center: XY = [at[0] + dir * (2 + u * 17 - i * 2), at[1] + (i - 1) * 4];
    for (let band = 0; band < 3; band++)
      oval(
        f.above,
        center,
        4 + i * 2 + u * 7 + band,
        4 + i * 2 + u * 10 + band,
        air[band + 1],
        fade * (1 - i * 0.12),
        dir > 0 ? -1.3 : 1.85,
        dir > 0 ? 1.22 : 4.41,
      );
    shard(
      f.above,
      center[0] + dir * (7 + 14 * u),
      center[1] + (i - 1) * 10,
      dir * 3,
      -1.5,
      1.5,
      air[3],
      air[0],
      fade,
    );
  }
}
const contacts: Record<string, [string, number]> = {
  tech_post_dive: ['beak', 26],
  tech_talon: ['foreR', 25],
  tech_wing_fan: ['wingTipR', 25],
  tech_great_seal: ['stamp', 39],
};
export const effects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (f.anim === 'trick') {
    postalTrick(f, n);
    return;
  }
  if (f.anim === 'hatch' && n >= 12 && n < 31) {
    const u = progress(n, 12, 23),
      b = f.points.beak;
    letter(
      f.above,
      [b[0] + 3 + (1 - u) * 9, b[1] + 2 - (1 - u) * 23],
      -0.3 + (1 - u) * 1.8,
      5,
      1 - progress(n, 26, 31),
    );
    return;
  }
  if (f.anim === 'happy' && n > 7 && n < 36) {
    const i = Math.floor(n / 6) % 3,
      u = (n % 6) / 6,
      b = f.points.seal;
    shard(f.above, b[0] + (i - 1) * 6, b[1] - 4 - 5 * u, 1.6, -2.6, 1.4, gold[3], gold[1], 1 - u);
    return;
  }
  const contact = contacts[f.anim];
  if (!contact) return;
  const [sock, hit] = contact,
    isSeal = sock === 'stamp',
    isTalon = sock === 'foreR';
  const ink = isSeal ? wax : isTalon ? gold : air;
  if (isSeal) charter(f, n);
  if (isSeal && n > 12 && n < hit) {
    const u = progress(n, 12, 34),
      p = f.points.stamp;
    for (let i = 0; i < 5; i++) {
      const a = (i * tau) / 5 + n * 0.08;
      shard(
        f.above,
        p[0] + Math.cos(a) * (11 - 7 * u),
        p[1] + Math.sin(a) * (9 - 5 * u),
        1,
        -2,
        1.1,
        gold[3],
        gold[1],
        u,
      );
    }
  }
  if (sock === 'beak') {
    if (n > 19 && n < 30) diveEcho(f, n);
    if (n >= 19 && n < 46) mailWake(f, n);
  }
  if (n >= hit - 5 && n < hit + 5) {
    pathSmear(f, sock, (hit - 5) / 24, hit / 24, isTalon ? 4.5 : 3.5, ink[0], ink[2], ink[3]);
    paintSocketTrail(f, 'above', sock, (hit - 5) / 24, Math.min(n, hit) / 24, {
      color: ink[3],
      width: 1,
      alpha: 1 - progress(n, hit, hit + 5),
    });
  }
  if (n < hit || n >= hit + 21) return;
  const at = f.pointAt(hit / 24, sock),
    age = n - hit,
    fade = 1 - progress(age, 9, 21);
  paintImpact(f, 'above', sock, at, (p, x, y) => {
    ellFill(p, [x, y], 3, 2.4, ink[1], fade);
    shard(p, x, y, 2, -2, 1.8, ink[3], ink[2], fade);
  });
  if (isSeal) {
    const u = progress(age, 0, 7);
    rosette(f.above, at, 3 + 12 * u, fade);
    oval(f.under, at, 4 + 20 * u, 3 + 10 * u, gold[2], fade);
  } else if (isTalon) {
    for (let i = -1; i <= 1; i++) {
      const u = progress(age, 0, 5),
        x = at[0] + i * 2,
        y = at[1] + i;
      f.under.lineS(x, y, x + u * (11 + i * 3), y + u * (4 + i * 2), gold[0], fade);
      f.under.lineS(x, y + 1, x + u * (11 + i * 3), y + u * (4 + i * 2) + 1, gold[2], fade);
    }
  } else if (sock === 'wingTipR') fan(f, at, age);
  scatter(f, at, age / 24, isSeal ? 811 : 37, isSeal ? 12 : 7, ink, 0.63);
};
