import { hash, hx, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face } from '../scenes/relief';
import { meadowSignals, signalTop, wheelAxle } from '../scenes/paper_updraft';
import type { FxInput, XY } from '../types';
import { footfalls, glider, wind } from './zephyr_whorl-keys';
import { airTravel, breezeAt, turnsInBreeze } from './zephyr_whorl-wind';

const pigment = (...colors: string[]) => colors.map((c) => hx(c));
const ink = pigment('#48475a', '#62617a', '#8d6b59', '#d2ab76', '#fff0af');
const blue = pigment('#466182', '#6795a5', '#99c7c6');
const saffron = pigment('#ad7053', '#df9f59', '#ffcf77');
const paper = pigment('#47485e', '#787a96', '#a5b2c0', '#d9ddcd', '#fff1cd', '#d36962');
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const smooth = (x: number) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};

// Powered rotation blends into a longer coasting turn. Integer turns restore the unique marked blade.
export function wheelAngle(n: number) {
  if (n <= wind.hit) return 0;
  if (n <= wind.stop) {
    const a = (n - wind.hit) / (wind.stop - wind.hit);
    return TAU * (1.4 * a * a - 0.32 * a * a * a);
  }
  const u = clamp((n - wind.stop) / 45),
    left = 1 - u;
  return TAU * (1.08 + 1.92 * (1 - left * left * left));
}
function pinwheel(angle: number) {
  const p = new Px(41, 41),
    center = 20;
  for (let i = 0; i < 4; i++) {
    const a = angle + Math.PI * 0.22 + (i * Math.PI) / 2,
      c = Math.cos(a),
      s = Math.sin(a);
    const pt = (x: number, y: number): XY => [center + x * c - y * s, center + x * s + y * c];
    const fill = (pts: XY[], col: ReturnType<typeof hx>) =>
      face(
        p,
        pts.map(([x, y]) => pt(x, y)),
        col,
      );
    const line = (x: number, y: number, xx: number, yy: number, col: ReturnType<typeof hx>) =>
      p.line(...pt(x, y), ...pt(xx, yy), col);
    const mat = i % 2 === 0 ? saffron : blue;
    fill(
      [
        [0, 0],
        [5, -12],
        [14, -12],
        [13, 0],
        [5, 4],
      ],
      ink[0],
    );
    fill(
      [
        [0.6, 0],
        [5.5, -11],
        [12.9, -11],
        [11.8, -0.6],
        [5, 3],
      ],
      mat[1],
    );
    fill(
      [
        [0, 0],
        [5.5, -11],
        [7.25, -3.8],
        [5, 3],
      ],
      mat[0],
    );
    line(5.5, -10, 12, -10, mat[2]);
    line(1, 0, 7, -4, mat[2]);
    if (i === 0) line(9, -7.5, 11, -7.5, ink[4]);
  }
  p.ell(center, center, 3.1, 3.1, ink[0]);
  p.ell(center - 0.2, center - 0.3, 2.15, 2.15, ink[3]);
  p.set(center - 1, center - 1, ink[4]);
  return p.canvas();
}
const resting = pinwheel(0);
const quietMeadow = meadowSignals(0, () => 0);
const mastTurns = turnsInBreeze(() => wheelAxle[0], 5, 0.27);
const entryAir = airTravel(glider.enter, glider.catch, 35);

export function planePose(
  f: Pick<FxInput, 'points' | 'pointAt'>,
  n: number,
): { fold: XY; tilt: number } | undefined {
  if (n < glider.enter || n > 132) return;
  if (n < glider.catch) {
    const u = clamp((n - glider.enter) / (glider.catch - glider.enter)),
      target = f.pointAt(glider.catch / 24, 'pinch');
    const travel = 0.7 * (1 - (1 - u) ** 2.8) + (0.3 * airTravel(glider.enter, n, 35)) / entryAir;
    const x = mix(-24, target[0], travel),
      air = breezeAt(n, x),
      arc = Math.sin(Math.PI * u);
    return {
      fold: [x, mix(24, target[1], u) - (12.3 + 2.45 * air) * arc],
      tilt: mix(0.12, -0.06, u) + (0.07 + 0.1 * air) * Math.sin(TAU * u),
    };
  }
  if (n <= glider.throw) {
    const bank =
      n <= 61
        ? -0.06
        : n < 86
          ? -0.06 + 0.19 * Math.sin(((n - 61) / 25) * Math.PI)
          : -0.06 - 0.21 * smooth((n - 94) / 8) + 0.16 * smooth((n - 104) / 3);
    // The sail trembles about the held keel as the second gust reaches the sill. The fingers keep the fold.
    const flutter =
      breezeAt(n, f.points.pinch[0]) *
      Math.sin(n * 0.55) *
      smooth((n - glider.catch) / 6) *
      smooth((glider.throw - n) / 4) *
      0.105;
    return { fold: f.points.pinch, tilt: bank + flutter };
  }
  const a = n - glider.throw,
    release = f.pointAt(glider.throw / 24, 'pinch');
  const lift = airTravel(glider.throw, n, release[0]);
  return {
    fold: [release[0] + a * 2.3 + lift * 1.55, release[1] - a * 1.15 - lift * 0.54 + 0.035 * a * a],
    tilt: -0.11 + 0.21 * clamp(a / 24) - 0.085 * breezeAt(n, release[0] + a * 3) * Math.sin(a * 0.39),
  };
}
function airframe(tilt: number) {
  const p = new Px(43, 39),
    c = Math.cos(tilt),
    s = Math.sin(tilt);
  const pt = (x: number, y: number): XY => [21 + c * x - s * y, 21 + s * x + c * y];
  const fill = (v: XY[], i: number) =>
    face(
      p,
      v.map(([x, y]) => pt(x, y)),
      paper[i],
    );
  const line = (x: number, y: number, xx: number, yy: number, i: number) =>
    p.line(...pt(x, y), ...pt(xx, yy), paper[i]);
  fill(
    [
      [-16, -17],
      [18, -8],
      [-3, -2],
      [-8, -6],
    ],
    0,
  );
  fill(
    [
      [-14, -15.6],
      [14, -8.3],
      [-7, -6.4],
    ],
    3,
  );
  fill(
    [
      [-8, -8],
      [18, -8],
      [0, 0.8],
      [-3, 0.2],
    ],
    0,
  );
  fill(
    [
      [-6, -7],
      [12, -7.6],
      [-1, -0.7],
    ],
    1,
  );
  line(-3, -4.6, -1.2, -1.6, 2);
  fill(
    [
      [-14, -3],
      [-7, -9],
      [18, -8],
      [-7, -3.4],
    ],
    0,
  );
  fill(
    [
      [-12.6, -4.15],
      [-6.7, -8.1],
      [13, -7.9],
      [-6.5, -4.2],
    ],
    4,
  );
  fill(
    [
      [-11, -4.4],
      [-9, -6.2],
      [-5.6, -6.7],
      [-7.7, -4.8],
    ],
    5,
  );
  line(-10.2, -13.1, 1.6, -9.4, 4);
  line(-6, -8, 12, -7.9, 2);
  return p.canvas();
}

function breath(f: FxInput, n: number) {
  const mouth = f.points.mouth;
  const target: XY = [wheelAxle[0] - 1, wheelAxle[1] + 10];
  for (const start of [57, 63, 69, 75]) {
    const age = n - start;
    if (age < 0 || age > 11) continue;
    const lead = clamp(age / 4);
    const tail = clamp((age - 4) / 5);
    for (let j = 0; j < 3; j++) {
      let last: XY | undefined;
      for (let k = 0; k <= 13; k++) {
        const u = mix(tail, lead, k / 13);
        const w = Math.sin(Math.PI * u);
        const at: XY = [
          mix(mouth[0], target[0], u),
          mix(mouth[1], target[1], u) + w * (j - 1) * 3.8 + w * Math.sin(u * TAU + age * 0.46) * 2.1,
        ];
        if (last) {
          f.above.col(j === 1 ? '#fff7da' : '#67a6a2', j === 1 ? 0.92 : 0.74);
          f.above.line(Math.round(last[0]), Math.round(last[1]), Math.round(at[0]), Math.round(at[1]));
        }
        last = at;
      }
    }
  }
  for (const start of [wind.hit, 67, 73, 79]) {
    const a = n - start;
    if (a < 0 || a > 7) continue;
    f.backdrop.col('#fff0bc', 1 - a / 8);
    for (let j = 0; j < 3; j++)
      f.backdrop.dot(target[0] + (j + 1) * a * 0.46, target[1] + (j - 1) * a * 0.72, 2, 1);
  }
}
function grassDust(f: FxInput, n: number, at: number, foot: string, duration = 12) {
  const dt = n - at;
  if (dt < 0 || dt >= duration) return;
  const base = f.pointAt(at / 24, foot);
  for (let j = 0; j < 9; j++) {
    const age = dt - (j % 3) * 0.5;
    if (age < 0) continue;
    const rise = 0.105 * age * age - (0.7 + hash(j, at, 3) * 1.04) * age;
    if (rise > 0) continue;
    f.under.col(j % 3 === 0 ? '#967d62' : '#e3ce9c', 0.88 * (1 - (age / duration) ** 2));
    f.under.dot(
      base[0] + (j % 2 ? 1 : -1) * (0.6 + hash(j, at, 9) * 1.35) * age,
      base[1] + rise,
      j % 3 === 0 ? 2 : 1,
      1,
    );
  }
}

function stamp(f: FxInput, n: number, at: number, foot: string) {
  const duration = at === footfalls.leaving ? 6 : 8;
  grassDust(f, n, at, foot, duration);
  const age = n - at;
  if (age < 1 || age >= duration) return;
  const [x, y] = f.pointAt(at / 24, foot);
  for (const side of [-1, 1]) {
    for (const spread of [0.6, 1]) {
      const xx = Math.round(x + side * (4 + age * spread * 2.55));
      const yy = Math.round(y + 1 - (3.3 + 3.0 * spread) * Math.sin((Math.PI * age) / duration));
      const alpha = Math.min(1, (duration - age) * 0.35);
      f.under.col('#866848', alpha);
      f.under.line(xx - 2, yy + 1, xx + 2, yy);
      f.under.col('#c49361', alpha);
      f.under.dot(xx - 1, yy - 1, 3, 2);
      f.under.col('#f6daad', alpha);
      f.under.dot(xx, yy - 2, 2, 1);
    }
  }
}

// Follow individual airborne seeds from the left edge until they pass the right edge.
const seeds = [
  [0, 39, 3.65],
  [7, 71, 3.55],
  [14, 34, 3.1],
  [81, 58, 3.8],
  [88, 32, 4.2],
].map(([born, y, speed]) => {
  const trail: XY[] = [];
  let x = -8;
  for (let n = born; n < 151 && x < 190; n++) {
    const air = breezeAt(n, x);
    x += 1.35 + speed * air;
    trail.push([x, y + 3.7 * Math.sin((n - born) * 0.23) - 6.5 * air]);
  }
  return { born, trail };
});

function driftingSeeds(f: FxInput, n: number) {
  for (const { born, trail } of seeds) {
    const i = n - born;
    if (i < 0 || i >= trail.length) continue;
    const [x, y] = trail[i],
      flip = Math.cos(i * 0.54);
    for (let j = Math.max(1, i - 8); j < i - 1; j++) {
      if (j === i - 6) continue;
      const a = trail[j - 1],
        b = trail[j];
      const alpha = 1 - (i - j) * 0.087;
      f.backdrop.col('#809e96', 0.66 * alpha);
      f.backdrop.line(Math.round(a[0]), Math.round(a[1]) + 1, Math.round(b[0]), Math.round(b[1]) + 1);
      f.backdrop.col('#fff1ce', alpha);
      f.backdrop.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]));
    }
    const xx = Math.round(x),
      yy = Math.round(y);
    f.backdrop.col('#91754d');
    f.backdrop.line(xx - 3, yy + Math.round(flip), xx + 2, yy - Math.round(flip));
    f.backdrop.col('#f4ca7f');
    f.backdrop.dot(xx - 1, yy - 1, 2, 1);
    f.backdrop.dot(xx - 2, yy - 1 - Math.round(2 * flip));
  }
}

function sillContact(f: FxInput, n: number) {
  if (n < 75 || n > 132) return;
  for (const [foot, contact] of [
    ['footR', glider.perch],
    ['footL', glider.perch + 2],
  ] as const) {
    const [x, y] = f.pointAt(contact / 24, foot);
    const current = f.points[foot];
    const pressure = clamp(1 - Math.hypot(current[0] - x, current[1] - y) / 18);
    if (!pressure) continue;
    const xx = Math.round(x),
      yy = Math.round(y),
      radius = Math.round(3.5 + 2 * pressure);
    f.backdrop.col('#765f56', 0.73 * pressure);
    f.backdrop.line(xx - radius, yy, xx + radius, yy);
    f.backdrop.col('#544c4d', 0.82 * pressure);
    f.backdrop.line(xx - radius + 2, yy + 1, xx + radius - 2, yy + 1);
  }
}

export function meadowTricks(f: FxInput) {
  const n = Math.round(24 * f.t);
  const jet = f.anim === 'trick' ? smooth((n - wind.hit) / 5) * (1 - smooth((n - wind.stop) / 12)) : 0;
  let signals = quietMeadow,
    angle = 0;
  if (f.anim === 'trick_b') {
    signals = meadowSignals(n, (x) => breezeAt(n, x));
    const turns = mastTurns[Math.min(n, mastTurns.length - 1)];
    angle = TAU * (turns % 1);
    driftingSeeds(f, n);
  } else if (f.anim === 'trick') {
    angle = wheelAngle(n) % TAU;
    if (jet > 0) signals = meadowSignals(n, (x) => (x === wheelAxle[0] ? jet * 0.78 : 0));
  }
  f.backdrop.alpha(1);
  f.backdrop.img(signals, 0, signalTop);
  f.backdrop.img(angle ? pinwheel(angle) : resting, wheelAxle[0] - 20, wheelAxle[1] - 20);
  if (f.anim === 'prepare_walk') {
    stamp(f, n, footfalls.leaving, 'footR');
    stamp(f, n, footfalls.arriving, 'footL');
  }
  if (f.anim === 'hatch') grassDust(f, n, 34, 'footR');
  if (f.anim === 'trick') {
    if (n >= wind.breath && n < 88) breath(f, n);
    grassDust(f, n, 40, 'footR');
    grassDust(f, n, 97, 'footR');
    grassDust(f, n, 125, 'footR', 6);
  }
  if (f.anim === 'fidget_a' && n >= 25 && n <= 36) {
    for (const born of [25, 29]) {
      const age = n - born;
      if (age < 0 || age > 7) continue;
      const [x, y] = f.pointAt(born / 24, 'mouth');
      for (let i = 0; i < 3; i++) {
        f.above.col(i === 1 ? '#fff2cc' : '#74b8aa', 0.89 - age * 0.095);
        f.above.line(
          Math.round(x + age * (1.2 + i * 0.29)),
          Math.round(y + age * (0.36 - i * 0.24)),
          Math.round(x + 2 + age * (1.2 + i * 0.29)),
          Math.round(y + age * (0.36 - i * 0.24) - 1),
        );
      }
    }
  }
  if (f.anim === 'trick_b') {
    sillContact(f, n);
    const plane = planePose(f, n);
    if (plane) {
      const pen = n >= glider.catch && n <= glider.throw ? f.under : f.backdrop;
      // The paper is behind the grasp: fingertips obscure the bottom crease, not the nose or the wings.
      pen.alpha(1);
      pen.img(airframe(plane.tilt), Math.round(plane.fold[0]) - 21, Math.round(plane.fold[1]) - 21);
    }
    grassDust(f, n, 25, 'footR');
    grassDust(f, n, 141, 'footR');
  }
}
