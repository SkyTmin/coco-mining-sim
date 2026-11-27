import { disc, fillPoly, Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import {
  bridgeTop,
  city,
  clamp,
  ease,
  exit,
  lerp,
  lock,
  mix,
  porchTop,
  pose,
  span,
  tau,
} from './threshold_keeper-score';
import {
  bellHandle,
  bridgeEnd,
  bridgeRoot,
  fromWorld,
  leafTip,
  liftCentre,
  margin,
  postShift,
  size,
  summitShift,
  stylus,
  surveyPoint,
} from './threshold_keeper-stage';
type Quad = XY[];
const outline = '#49445c',
  plum = '#655369',
  dusk = '#9a7783',
  shade = '#776278',
  stone = '#b19491',
  warm = '#ddb69e',
  gold = '#ffdb98',
  ivory = '#fff1c9',
  green = '#658b89',
  ocean = '#446575';
const poly = (p: Pen, v: Quad, c: string, a = 1) => {
  p.col(c, a);
  fillPoly(p, v.flat());
};
const line = (p: Pen, A: XY, B: XY, c: string, a = 1) => {
  p.col(c, a);
  p.line(...A, ...B);
};
function circ(p: Pen, A: XY, r: number, c: string, alpha = 1) {
  if (r < 0.4) return;
  p.col(c, alpha);
  disc(p, ...A, r);
}
function oval(p: Pen, c: XY, rx: number, ry: number, color: string, alpha: number, half = 0) {
  if (rx < 1 || ry < 0.5) return;
  p.col(color, alpha);
  let last: XY | null = null,
    end = half ? Math.PI : tau;
  for (let k = 0; k <= 26; k++) {
    const a = (half === -1 ? Math.PI : 0) + (k * end) / 26;
    const q: XY = [c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)];
    if (last) p.line(...last, ...q);
    last = q;
  }
}
function shine(p: Pen, A: XY, u: number, color = ivory) {
  if (u <= 0) return;
  const r = 1 + 5 * u;
  line(p, [A[0] - r, A[1]], [A[0] + r, A[1]], color, 0.83 * u);
  line(p, [A[0], A[1] - r], [A[0], A[1] + r], color, 0.88 * u);
  circ(p, A, 1.2, color, u);
}
function shifted(p: Pen, dx: number, dy: number) {
  return new Pen(p.g, p.qx + dx, p.qy + dy, 0, 0);
}
// A two-colour enamel diamond identifies both ends of the same door, the dispatch box and its letters.
function diamond(p: Pen, x: number, y: number, r: number, lit = false) {
  poly(
    p,
    [
      [x, y - r],
      [x + r * 0.78, y],
      [x, y + r],
      [x - r * 0.78, y],
    ],
    lit ? gold : green,
  );
  line(p, [x - r * 0.78, y], [x, y - r], lit ? ivory : '#b6d4c0');
}
function wheel(p: Pen, c: XY, r: number, rotation: number) {
  circ(p, c, r + 1, outline);
  circ(p, c, r, shade);
  oval(p, c, r - 0.7, r - 0.7, gold, 0.86);
  for (let i = 0; i < 5; i++) {
    const t = (i * tau) / 5 + rotation;
    line(p, c, [c[0] + (r - 1) * Math.cos(t), c[1] + (r - 1) * Math.sin(t)], warm);
  }
  circ(p, c, 1.6, outline);
  circ(p, c, 0.7, ivory);
}
function lighthouse(p: Pen, lens: number) {
  const x = 250,
    y = 88,
    lamp: XY = [x, y - 35];
  // Cantilevered arcade with a weight-bearing pier underneath the signal room.
  for (let i = 0; i < 6; i++) {
    const X = 149 + i * 21;
    poly(
      p,
      [
        [X, y],
        [X + 22, y],
        [X + 22, y + 12],
        [X + 18, y + 10],
        [X + 15, y + 6],
        [X + 9, y + 6],
        [X + 5, y + 10],
        [X + 3, y + 23],
        [X, y + 24],
      ],
      i % 2 ? '#826d78' : '#6f667a',
    );
    line(p, [X, y], [X + 21, y], warm);
    line(p, [X + 2, y + 5], [X + 2, y + 20], stone);
  }
  poly(
    p,
    [
      [x - 19, y - 13],
      [x + 18, y - 13],
      [x + 17, y + 12],
      [x + 10, y + 25],
      [x + 6, y + 58],
      [x - 2, y + 80],
      [x - 8, y + 53],
      [x - 13, y + 24],
      [x - 19, y + 14],
    ],
    '#655469',
  );
  poly(
    p,
    [
      [x - 19, y - 10],
      [x - 5, y - 13],
      [x - 5, y + 67],
      [x - 12, y + 28],
      [x - 19, y + 13],
    ],
    '#a18786',
  );
  poly(
    p,
    [
      [x + 1, y + 20],
      [x + 16, y + 13],
      [x + 11, y + 35],
      [x + 4, y + 63],
      [x - 2, y + 80],
      [x + 1, y + 44],
    ],
    '#514a60',
  );
  poly(
    p,
    [
      [x - 11, y + 20],
      [x - 4, y + 27],
      [x - 5, y + 50],
      [x - 2, y + 68],
      [x - 9, y + 49],
    ],
    '#927982',
  );
  for (let k = 0; k < 8; k++) {
    const Y = y + 19 + k * 6,
      X = x - 5 + 3 * Math.sin(k * 2.2);
    line(p, [X, Y], [X + 2, Y + 4], k % 2 ? stone : shade);
  }
  for (let k = 0; k < 6; k++) {
    const Y = y - 8 + k * 5,
      w = Math.max(3, 16 - 0.18 * k * k);
    line(p, [x - w, Y], [x + Math.max(w - 2, 2), Y + 1], k % 2 ? '#7d6873' : '#ad8b84');
  }
  for (let k = 0; k < 3; k++) {
    const X = x - 13 + k * 10;
    poly(
      p,
      [
        [X - 2, y + 2],
        [X + 2, y + 1],
        [X + 2, y + 9],
        [X - 2, y + 10],
      ],
      outline,
    );
    line(p, [X - 2, y + 2], [X + 1, y + 1], warm);
  }
  poly(
    p,
    [
      [x - 23, y - 16],
      [x - 18, y - 20],
      [x + 16, y - 20],
      [x + 24, y - 16],
      [x + 18, y - 11],
      [x - 18, y - 11],
    ],
    ocean,
  );
  line(p, [x - 22, y - 16], [x + 23, y - 16], gold);
  for (let k = 0; k < 5; k++) {
    const X = x - 20 + 10 * k;
    line(p, [X, y - 16], [X, y - 23], outline);
    line(p, [X, y - 22], [X + 9, y - 22], gold);
  }
  poly(
    p,
    [
      [x - 15, y - 18],
      [x - 15, y - 44],
      [x - 9, y - 49],
      [x + 11, y - 48],
      [x + 16, y - 44],
      [x + 16, y - 18],
    ],
    '#355464',
  );
  for (let k = -13; k <= 13; k++) {
    const Y = y - 44 + Math.abs(k) * 0.14;
    line(p, [x + k, Y], [x + k, y - 21], k < -6 ? '#70949b' : k % 7 < 2 ? '#577b86' : '#40586d');
  }
  for (let k = 0; k < 4; k++) oval(p, lamp, 12 - k * 2, 10 - k * 1.6, k % 2 ? '#b9b998' : '#8ea8a3', 0.95);
  circ(p, lamp, 3.5, lens > 0.05 ? ivory : '#8e7e79');
  if (lens > 0) {
    circ(p, lamp, 14, '#ffcf80', 0.27 * lens);
    shine(p, lamp, lens);
  }
  for (const dx of [-16, -7, 8, 16]) {
    line(p, [x + dx, y - 44], [x + dx, y - 19], outline);
    line(p, [x + dx + 1, y - 44], [x + dx + 1, y - 19], gold);
  }
  poly(
    p,
    [
      [x - 22, y - 45],
      [x - 13, y - 51],
      [x - 6, y - 58],
      [x, y - 65],
      [x + 9, y - 55],
      [x + 22, y - 45],
    ],
    '#47777b',
  );
  line(p, [x - 21, y - 45], [x, y - 65], warm);
  line(p, [x, y - 65], [x + 18, y - 46], '#7ca39a');
  line(p, [x - 22, y - 44], [x + 22, y - 44], gold);
  line(p, [x, y - 65], [x, y - 70], outline);
  circ(p, [x, y - 71], 2.2, gold);
  // A pull at the landing drives the lamp. The rod visibly runs all the way to its housing.
  line(p, [179, 72], [x - 17, 72], outline);
  line(p, [179, 71], [x - 17, 71], warm);
  wheel(p, [x - 17, 72], 3.8, lens * 3.5);
}
function liftWorks(p: Pen, progress: number, open: number) {
  const C = liftCentre(progress),
    lo = liftCentre(0),
    hi = liftCentre(1);
  for (const side of [-13, 13]) {
    const a: XY = [lo[0] + side, lo[1] - 2],
      b: XY = [hi[0] + side, hi[1] - 2];
    line(p, [a[0] + 1, a[1] + 2], [b[0] + 1, b[1] + 2], outline);
    line(p, a, b, '#8f8b85');
    for (let i = 0; i <= 10; i++) {
      const q = lerp(a, b, i / 10);
      line(p, q, [q[0] + 2, q[1] + 2], shade);
    }
  }
  const sheave: XY = [hi[0] + 17, hi[1] - 22],
    hook: XY = [C[0] + 17, C[1] - 10];
  const startLength = Math.hypot(sheave[0] - lo[0] - 17, sheave[1] - lo[1] + 10);
  const released = startLength - Math.hypot(sheave[0] - hook[0], sheave[1] - hook[1]);
  const weight: XY = [sheave[0] + 7, sheave[1] + 12 + released];
  line(p, [sheave[0] - 2, sheave[1] + 18], [sheave[0] - 2, sheave[1] - 3], outline);
  line(p, [sheave[0] - 4, sheave[1] + 18], [sheave[0] - 4, sheave[1]], stone);
  line(p, sheave, [sheave[0] + 6, sheave[1] + 4], warm);
  line(p, [sheave[0] + 4, sheave[1] + 1], weight, outline);
  line(p, [sheave[0] + 5, sheave[1] + 1], weight, ivory);
  line(p, [sheave[0] + 5, sheave[1] + 1], [weight[0] + 1, weight[1]], gold);
  poly(
    p,
    [
      [weight[0] - 3, weight[1]],
      [weight[0] + 3, weight[1] - 1],
      [weight[0] + 5, weight[1] + 6],
      [weight[0] + 4, weight[1] + 15],
      [weight[0] - 4, weight[1] + 14],
      [weight[0] - 5, weight[1] + 6],
    ],
    outline,
  );
  poly(
    p,
    [
      [weight[0] - 3, weight[1] + 3],
      [weight[0] + 2, weight[1] + 2],
      [weight[0] + 3, weight[1] + 12],
      [weight[0] - 2, weight[1] + 12],
    ],
    shade,
  );
  line(p, [weight[0] - 2, weight[1] + 5], [weight[0] + 2, weight[1] + 5], warm);
  line(p, sheave, hook, outline);
  line(p, [sheave[0] - 1, sheave[1] - 1], [hook[0] - 1, hook[1] - 1], gold);
  wheel(p, sheave, 4.8, progress * 7);
  const [x, y] = C;
  // The near edge sits below the soles. The cable is pinned to the back upright, behind the passenger.
  poly(
    p,
    [
      [x - 26, y - 3],
      [x - 16, y - 9],
      [x + 23, y - 9],
      [x + 28, y + 1],
      [x - 18, y + 5],
    ],
    '#aa8b72',
  );
  for (let i = 0; i < 6; i++) {
    const X = x - 18 + i * 7;
    line(p, [X, y - 7], [X + 4, y + 3], i % 2 ? shade : '#bfa184');
  }
  poly(
    p,
    [
      [x - 24, y],
      [x - 17, y + 6],
      [x + 28, y + 2],
      [x + 28, y + 7],
      [x - 18, y + 10],
      [x - 24, y + 6],
    ],
    ocean,
  );
  line(p, [x - 19, y + 5], [x + 28, y + 1], gold);
  line(p, [x - 17, y + 9], [x + 27, y + 6], outline);
  for (const dx of [-15, 2, 23]) circ(p, [x + dx, y + 6 - (dx + 15) * 0.07], 1, ivory);
  for (const s of [-1, 1]) {
    line(p, [x + s * 16, y - 4], [x + s * 16, y - 14], outline);
    circ(p, [x + s * 16, y - 14], 1.45, gold);
  }
  line(p, [x - 16, y - 13], hook, shade);
  wheel(p, [x - 10, y + 9], 2.5, progress * 9);
  wheel(p, [x + 16, y + 7], 2.5, progress * 9);
  const [X, Y] = lock;
  poly(
    p,
    [
      [X - 6, Y + 17],
      [X + 7, Y + 16],
      [X + 5, Y - 9],
      [X - 4, Y - 12],
      [X - 7, Y - 7],
    ],
    outline,
  );
  poly(
    p,
    [
      [X - 4, Y + 14],
      [X + 5, Y + 14],
      [X + 3, Y - 8],
      [X - 3, Y - 9],
    ],
    ocean,
  );
  wheel(p, lock, 5.6, open * 1.4);
  circ(p, lock, 1.8, outline);
}
function bridge(p: Pen, root: XY, amount: number) {
  const count = 19,
    W = (bridgeEnd[0] - root[0]) / count;
  // Each joint unfolds from the previous tread. The last shoe ends on the stone postal landing.
  for (let i = 0; i < count; i++) {
    const a = clamp(amount * count - i);
    if (a <= 0) break;
    const X = root[0] + i * W,
      Y = bridgeTop(X, root),
      Z = X + a * W,
      B = mix(Y - 8, bridgeTop(X + W, root), a);
    poly(
      p,
      [
        [X - 3, Y - 5],
        [Z - 3, B - 5],
        [Z + 4, B + 3],
        [X + 4, Y + 3],
      ],
      i % 2 ? '#ae896f' : '#bf9b7e',
    );
    line(p, [X - 2, Y - 4], [Z - 2, B - 4], warm);
    line(p, [X, Y - 1], [Z, B - 1], '#926f66');
    poly(
      p,
      [
        [X + 4, Y + 3],
        [Z + 4, B + 3],
        [Z + 4, B + 8],
        [X + 4, Y + 7],
      ],
      i % 2 ? ocean : outline,
    );
    line(p, [X + 4, Y + 3], [Z + 4, B + 3], gold);
    const bottom: XY = [(X + Z) / 2 + 4, (Y + B) / 2 + 13];
    line(p, [X + 3, Y + 5], bottom, outline);
    line(p, bottom, [Z + 4, B + 5], gold);
    line(p, [X + 3, Y + 13], [Z + 4, B + 13], ocean);
    if (i % 2 === 0) {
      line(p, [X + 4, Y + 6], [Z + 4, B + 11], shade);
      circ(p, [Z + 4, B + 10], 1.5, stone);
    }
    if (i % 3 === 0) {
      line(p, [X - 2, Y - 4], [X - 2, Y - 10], outline);
      circ(p, [X - 2, Y - 10], 1.4, gold);
    }
  }
}
function steps(p: Pen, root: XY, u: number) {
  if (u < 0.01) return;
  for (let i = 0; i < 8; i++) {
    const a = clamp(u * 8 - i);
    if (a <= 0) break;
    const x = root[0] + i * 6.75,
      X = x + 6.75 * a,
      y = porchTop(x, root),
      Y = porchTop(X, root);
    poly(
      p,
      [
        [x - 4, y - 3],
        [X - 4, y - 3],
        [X + 5, y + 2],
        [x + 5, y + 2],
      ],
      i % 2 ? '#ad826a' : '#bc9276',
    );
    poly(
      p,
      [
        [x + 5, y + 2],
        [X + 5, y + 2],
        [X + 5, Y + 6],
        [x + 5, Y + 5],
      ],
      i % 2 ? shade : plum,
    );
    line(p, [x + 4, y + 2], [X + 5, y + 2], gold);
    circ(p, [x + 5, y + 4], 0.7, warm);
  }
}
function letter(p: Pen, q: XY, slope: number) {
  const [x, y] = q,
    P = (u: number, v: number): XY => [x + u, y + v + u * slope];
  poly(p, [P(-8, -5), P(8, -5), P(8, 5), P(-8, 5)], outline);
  poly(p, [P(-7, -4), P(7, -4), P(7, 4), P(-7, 4)], '#f8dfad');
  line(p, P(-7, -4), P(0, 1), '#ad806b');
  line(p, P(0, 1), P(7, -4), '#ad806b');
  circ(p, P(0, 1), 2.1, '#a83e52');
  circ(p, P(-0.5, 0.5), 0.9, '#e77b75');
}
function post(p: Pen, letterHere: boolean) {
  poly(
    p,
    [
      [224, 138],
      [237, 135],
      [235, 132],
      [226, 132],
    ],
    shade,
  );
  line(p, [230, 133], [230, 104], outline);
  line(p, [231, 133], [231, 104], warm);
  poly(
    p,
    [
      [220, 104],
      [231, 98],
      [238, 102],
      [238, 116],
      [220, 117],
    ],
    ocean,
  );
  poly(
    p,
    [
      [218, 105],
      [229, 96],
      [239, 100],
      [240, 103],
      [230, 100],
      [220, 108],
    ],
    '#a76b63',
  );
  line(p, [221, 115], [238, 114], gold);
  line(p, [221, 116], [221, 123], shade);
  line(p, [224, 116], [224, 130], ocean);
  line(p, [236, 116], [236, 130], ocean);
  line(p, [224, 130], [236, 130], gold);
  if (letterHere) diamond(p, 235, 109, 2.2, true);
}
// A cloth-bound chart remains on its lectern for the whole scene. Every leaf rotates about the red spine.
function chart(p: Pen, open: number, trace: number) {
  const [x, y] = city,
    tip = leafTip(open);
  const L = (u: number, v: number): XY => [mix(x, tip[0], u) - 5 * v, mix(y - 2, tip[1], u) - 18 * v];
  const right = (u: number, v: number): XY => [x + 33 * u - 5 * v, y - 2 - 18 * v];
  const page = (P: (u: number, v: number) => XY, colour: string) => {
    poly(p, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], colour);
    line(p, P(0, 0), P(1, 0), ivory);
    line(p, P(1, 0), P(1, 1), warm);
  };
  poly(
    p,
    [
      [x - 6, y - 20],
      [x + 28, y - 20],
      [x + 35, y - 1],
      [x + 34, y + 3],
      [x - 2, y + 3],
    ],
    '#513b52',
  );
  for (let k = 0; k < 3; k++) line(p, [x, y + k], [x + 33, y + k], k % 2 ? '#b8a585' : ivory);
  page(right, '#ebd2a1');
  for (let k = 0; k < 3; k++) {
    line(p, right(0.12, 0.24 + k * 0.25), right(0.9, 0.24 + k * 0.25), '#b7ad8f');
    line(p, right(0.23 + k * 0.24, 0.1), right(0.23 + k * 0.24, 0.86), '#bdac8b');
  }
  page(L, open > 0.51 ? '#d5c392' : '#38615f');
  if (open < 0.51) {
    const corners = [
      [0.17, 0.17],
      [0.85, 0.17],
      [0.85, 0.84],
      [0.17, 0.84],
      [0.17, 0.17],
    ];
    for (let k = 1; k < corners.length; k++)
      line(p, L(corners[k - 1][0], corners[k - 1][1]), L(corners[k][0], corners[k][1]), gold);
    diamond(p, ...L(0.56, 0.5), 2.4, true);
  } else {
    for (let k = 0; k < 3; k++) line(p, L(0.12, 0.22 + k * 0.27), L(0.92, 0.26 + k * 0.26), '#a7a68b');
  }
  line(p, [x - 5, y - 19], [x, y + 1], '#ad535a');
  line(p, [x, y + 1], [x + 2, y + 8], '#a54454');
  line(p, [x + 2, y + 8], [x + 5, y + 5], '#e59678');
  if (open > 0.65) {
    for (let i = 0; i < 22; i++) {
      const a = surveyPoint(i / 22),
        b = surveyPoint((i + 1) / 22);
      line(p, a, b, i / 22 < trace ? '#af3951' : '#30767e');
      if (i / 22 < trace) line(p, [a[0], a[1] + 1], [b[0], b[1] + 1], '#efa75c');
    }
    // Two paper beacons pivot up from scored hinges; their bases stay on the printed islands.
    for (const u of [0, 1]) {
      const base = surveyPoint(u),
        h = (u ? 17 : 12) * ease(0.65, 1, open),
        [X, Y] = base;
      poly(
        p,
        [
          [X - 4, Y],
          [X + 4, Y],
          [X + 2, Y - h],
          [X - 1, Y - h],
        ],
        '#a39775',
      );
      line(p, [X - 4, Y], [X - 1, Y - h], ivory);
      line(p, [X + 2, Y - h], [X + 4, Y], '#77636b');
      poly(
        p,
        [
          [X - 4, Y - h],
          [X, Y - h - 3],
          [X + 4, Y - h],
          [X, Y - h + 1],
        ],
        '#b56a5f',
      );
      p.col(trace > u - 0.04 && trace > 0.03 ? gold : ocean);
      p.dot(X - 1, Y - h + 2, 2, 2);
    }
    if (trace > 0 && trace < 1) shine(p, surveyPoint(trace), 0.55);
  }
}
function routeLamps(p: Pen, amount: number, brightness: number) {
  const lamps: XY[] = [
    [-70, 105],
    [-49, 81],
    [-13, 58],
    [28, 33],
    [68, 7],
    [119, -15],
    [179, -31],
  ];
  for (let i = 0; i < lamps.length; i++) {
    const [x, y] = lamps[i],
      on = brightness * ease(i / 8, i / 8 + 0.12, amount);
    line(p, [x, y + 1], [x, y + 9], outline);
    line(p, [x - 3, y + 1], [x, y - 3], warm);
    poly(
      p,
      [
        [x - 3, y + 1],
        [x + 3, y + 1],
        [x + 2, y + 5],
        [x - 2, y + 5],
      ],
      shade,
    );
    if (on > 0.01) {
      circ(p, [x, y + 2], 5, gold, 0.23 * on);
      shine(p, [x, y + 2], on);
    }
    if (i > 0) {
      const [a, b] = lamps[i - 1];
      line(p, [a, b + 9], [(a + x) / 2, (y + b) / 2 + 13], shade);
      line(p, [(a + x) / 2, (y + b) / 2 + 13], [x, y + 9], shade);
    }
  }
}
function atlasTable(p: Pen) {
  const [x, y] = city;
  poly(
    p,
    [
      [x - 30, y + 1],
      [x + 23, y - 2],
      [x + 30, y + 2],
      [x + 2, y + 10],
      [x - 28, y + 6],
    ],
    '#756074',
  );
  for (const dx of [-20, 19]) {
    poly(
      p,
      [
        [x + dx - 2, y + 5],
        [x + dx + 3, y + 4],
        [x + dx + 2, 173],
        [x + dx - 2, 173],
      ],
      ocean,
    );
    line(p, [x + dx - 1, y + 8], [x + dx - 1, 171], warm);
  }
  line(p, [x - 26, y + 5], [x + 1, y + 8], gold);
  line(p, [x + 1, y + 8], [x + 27, y + 2], warm);
  diamond(p, x + 1, y + 8, 1.7);
}
export function gestures(f: FxInput) {
  const n = f.t * 24,
    a = f.anim,
    p = pose(a, n),
    j = Object.fromEntries(Object.entries(f.points).map(([name, point]) => [name, fromWorld(point)])),
    B = shifted(f.backdrop, ...margin),
    U = shifted(f.under, ...margin),
    F = shifted(f.above, ...margin);
  const hoist = a === 'trick-f2',
    paper = a === 'trick_b-f2',
    courier = a === 'trick_b',
    through = a === 'trick',
    show = a === 'show' || a === 'hatch';
  const at = (c: XY, r: number) => {
    for (let k = 0; k < 3; k++) oval(U, [c[0], c[1] + 1.3], r - k, 2.2 - k * 0.48, outline, 0.3 - k * 0.045);
  };
  const upper = shifted(B, 0, summitShift);

  const lit = hoist ? span(n, 130, 145, 182, 206) : paper ? span(n, 133, 144, 173, 195) : 0;
  lighthouse(upper, lit);
  // Three windows in the shaft mark the storeys between the street and the signal room.
  for (let k = 1; k <= 3; k++) {
    const c = liftCentre(k / 4);
    line(B, [c[0] - 17, c[1] + 2], [c[0] + 17, c[1] - 2], outline);
    line(B, [c[0] - 16, c[1] + 1], [c[0] + 16, c[1] - 3], warm);
    circ(B, [c[0] - 18, c[1]], 3, shade);
    circ(B, [c[0] - 18, c[1]], 1.5, hoist && (p.car || 0) > k / 4 ? ivory : green);
  }
  if (lit > 0.01) {
    const lamp: XY = [250, 53 + summitShift];
    const sweep = Math.sin((n - 138) * 0.067);
    poly(B, [lamp, [417, lamp[1] + 4 + 47 * sweep], [417, lamp[1] + 31 + 47 * sweep]], ivory, 0.28 * lit);
    line(B, lamp, [417, lamp[1] + 16 + 47 * sweep], gold, 0.68 * lit);
    shine(B, lamp, lit);
  }
  routeLamps(B, paper ? p.trace || 0 : 0, paper ? span(n, 96, 104, 176, 205) : 0);
  const sway = hoist ? span(n, 124, 130, 143, 154) * Math.sin((n - 124) * 0.52) * 2.4 : 0,
    bx = 179 + sway;
  line(upper, [183, 72], [179, 72], warm);
  line(upper, [179, 72], [bx, 89], outline);
  poly(
    upper,
    [
      [bx - 1, 89],
      [bx + 2, 89],
      [bx + 3, 93],
      [bx + 5, 96],
      [bx - 4, 96],
      [bx - 2, 93],
    ],
    '#c29760',
  );
  line(upper, [bx - 4, 96], [bx + 5, 96], gold);
  circ(upper, [bx + 0.5, 97], 1.2, outline);
  post(shifted(B, postShift, 0), courier && n < 126);
  atlasTable(B);
  chart(paper ? F : B, paper ? p.book || 0 : 0, paper ? p.trace || 0 : 0);
  if (p.floor !== undefined && !p.hide) {
    for (const boot of [j.bootL, j.bootR])
      if (!((p.reveal || p.entryOnly) && boot[0] < j.door[0]) && !(p.exitOnly && boot[0] >= exit[0])) at(boot, 6.2);
  }
  if (p.park > 0.02) at([j.house[0] - 2, 169], 22 * p.park);
  if (through || show || courier) steps(U, j.sill, p.porch || 0);
  if (courier) {
    const homeSlot: XY = [j.sill[0] + 7, j.sill[1] + 10],
      postClip: XY = [230 + postShift, 136];
    bridge(U, bridgeRoot(j.sill), p.bridge || 0);
    const rampPole: XY = [j.sill[0] - 2, j.sill[1] + 8],
      rest: XY = [rampPole[0] + 1, rampPole[1] + 2];
    const grasp = lerp(rest, j.handR, p.handle || 0);
    line(U, rampPole, grasp, gold);
    oval(p.handle > 0.15 ? F : U, grasp, 3.6, 3, ivory, 0.94);
    const carry: XY = [j.handR[0] + 2, j.handR[1] + 3],
      inBox: XY = [homeSlot[0], homeSlot[1] + 8];
    const loc = n < 178 ? lerp(postClip, carry, ease(117, 125, n)) : lerp(carry, inBox, p.deliver);
    const [X, Y] = homeSlot;
    if (p.park > 0.01) {
      poly(
        U,
        [
          [X - 9, Y - 5],
          [X + 8, Y - 5],
          [X + 11, Y - 2],
          [X + 10, Y + 10],
          [X - 8, Y + 11],
        ],
        outline,
        p.park,
      );
      poly(
        U,
        [
          [X - 8, Y - 3],
          [X + 8, Y - 3],
          [X + 8, Y + 8],
          [X - 7, Y + 9],
        ],
        ocean,
        p.park,
      );
      line(U, [X - 8, Y - 4], [X + 7, Y - 4], warm, p.park);
      line(U, [X - 6, Y + 1], [X + 7, Y + 1], outline, p.park);
    }
    if (n >= 117) {
      line(shifted(U, postShift, 0), [224, 116], [224, 130], ocean);
      line(shifted(U, postShift, 0), [236, 116], [236, 130], ocean);
      line(shifted(U, postShift, 0), [224, 130], [236, 130], gold);
    }
    if (n < 190) {
      if (n < 117) {
        const arrival = ease(2, 16, n);
        // A brass chute is welded to the post. The paper feeds down into its open clips beside the paws.
        const tray = shifted(F, postShift, 0);
        line(tray, [224, 116], [224, 130], ocean);
        line(tray, [236, 116], [236, 130], ocean);
        line(tray, [224, 130], [236, 130], gold);
        if (arrival > 0.01) {
          tray.g.save();
          tray.g.beginPath();
          tray.g.rect(tray.qx + 220, tray.qy + 129, 20, 18);
          tray.g.clip();
          letter(tray, [loc[0] - postShift, loc[1] - 13 * (1 - arrival)], 0.06 * Math.sin(n * 0.31));
          tray.g.restore();
        }
        line(tray, [222, 129], [225, 131], outline);
        line(tray, [235, 131], [238, 129], outline);
      } else {
        F.g.save();
        if (n >= 178) {
          F.g.beginPath();
          F.g.rect(F.qx - margin[0], F.qy - margin[1], size[0], Y + 3 + margin[1]);
          F.g.clip();
        }
        letter(F, loc, n >= 125 && n < 178 ? 0.2 : 0.06);
        F.g.restore();
        if (n >= 124 && n < 179) {
          line(F, [j.handR[0] - 1, j.handR[1] + 2], [j.handR[0] + 2, j.handR[1] + 2], '#ffe3ae');
        }
      }
    }
    if (n > 169 && n < 205) {
      line(F, [X - 8, Y + 2], [X + 8, Y + 2], gold);
      line(F, [X - 8, Y + 3], [X + 8, Y + 3], ocean);
      diamond(F, X + 7, Y + 7, 1.8, p.deliver > 0.8);
    }
  }
  if (hoist) {
    liftWorks(U, p.car || 0, p.keyAngle || 0);
    if (p.engage > 0.001) {
      const tip = j.keyTip,
        bow = j.keyBow,
        dx = tip[0] - bow[0],
        dy = tip[1] - bow[1],
        len = Math.max(1, Math.hypot(dx, dy));
      const normal: XY = [-dy / len, dx / len],
        from: XY = [bow[0] + dx * 0.22, bow[1] + dy * 0.22];
      line(F, tip, from, gold);
      line(F, [tip[0], tip[1] + 1], [from[0], from[1] + 1], '#b9895f');
      oval(F, bow, 3.7, 3.5, gold, 1);
      for (const u of [0.77, 0.96]) {
        const c = lerp(bow, tip, u);
        line(F, c, [c[0] + normal[0] * 3, c[1] + normal[1] * 3], ivory);
      }
    }
  } else {
    // The car and its cable remain moored between visits.
    liftWorks(B, 0, 0);
  }
  if (paper && (p.book || 0) > 0.5) {
    // The pen is nested in the book's spine. Its solid gold nib moves along the line under a fixed length of shaft.
    const tool = stylus(n),
      pen = F,
      cap: XY = [tool.grip[0] + 4, tool.grip[1] - 2];
    line(pen, tool.tip, cap, outline);
    line(pen, [tool.tip[0] + 1, tool.tip[1] - 1], [cap[0], cap[1] - 1], gold);
    const nib = lerp(tool.tip, tool.grip, 0.23);
    line(pen, tool.tip, nib, ivory);
    oval(pen, cap, 1.7, 1.3, '#a55160');
    if (n >= 91 && n <= 153) {
      circ(pen, j.handR, 2.8, '#aa745b');
      line(pen, [j.handR[0] - 2, j.handR[1] - 1], j.handR, '#ffe5b3');
      if (n > 101 && n < 141) shine(pen, tool.tip, 0.45);
    }
  }
  if (hoist && n >= 108 && n <= 161) {
    const grip = bellHandle(n),
      bracket: XY = [199, 91 + summitShift],
      fade = span(n, 108, 117, 151, 161);
    line(F, bracket, grip, outline, fade);
    line(F, [bracket[0], bracket[1] - 1], [grip[0], grip[1] - 1], gold, fade);
    oval(F, grip, 3.6, 3.3, ivory, fade);
    circ(F, bracket, 2.1, '#a57a56', fade);
    if (n >= 125 && n <= 141) {
      circ(F, j.handR, 2.4, '#ac765d');
      line(F, [j.handR[0] - 2, j.handR[1]], j.handR, '#ffe2ac');
    }
  }
  if (through && n >= 86 && n <= 166) {
    const progress = n < 140 ? ease(86, 110, n) : 1 - ease(149, 166, n);
    const ray = (t: number): XY => [
      mix(j.lintel[0], exit[0] - 3, t),
      mix(j.lintel[1] - 32, exit[1] - 55, t) - 54 * Math.sin(Math.PI * t),
    ];
    for (let i = 0; i < 40; i++) {
      const t = i / 40,
        w = Math.max(0, 1 - Math.abs(progress - t) * 6);
      if (w > 0 && i % 4 < 3) line(B, ray(t), ray(t + 0.023), ivory, w * 0.84);
    }
    if (n < 111 || n > 148) shine(U, ray(progress), 1);
  }
  if (through && p.portal > 0.02) {
    const u = p.portal,
      [x, y] = exit;
    poly(
      U,
      [
        [x - 3, y + 14],
        [x - 9, y + 18],
        [x - 34, y + 20],
        [x - 17, y + 13],
      ],
      '#edb686',
      0.43 * u,
    );
    line(B, [x - 14 * u, y + 17 * u], [x - 24 * u, y + 20 * u], warm, u);
  }
  if (through) {
    const u = span(n, 1, 4, 6, 10) + span(n, 11, 14, 16, 21);
    if (u > 0) {
      diamond(B, exit[0] - 11, 139, 2 + u, true);
      oval(B, [exit[0] - 11, 139], 3 + u * 2, 4 + u * 2, warm, u * 0.73);
    }
  }
  if (hoist) {
    const [x, y] = liftCentre(p.car || 0);
    poly(
      F,
      [
        [x - 33, y + 7],
        [x + 30, y + 4],
        [x + 36, y + 2],
        [x + 36, y + 9],
        [x + 29, y + 13],
        [x - 30, y + 16],
      ],
      '#304c59',
    );
    line(F, [x - 32, y + 7], [x + 35, y + 2], gold);
    line(F, [x - 30, y + 14], [x + 32, y + 9], '#9ba48e');
    for (let i = 0; i < 6; i++) {
      const X = x - 28 + i * 10,
        Y = y + 9 - i * 0.62;
      line(F, [X, Y], [X + 5, Y + 4], ocean);
      line(F, [X + 5, Y + 4], [X + 10, Y - 1], warm);
      circ(F, [X, Y], 0.85, ivory);
    }
    for (const side of [-1, 1]) {
      const X = x + side * 34,
        Y = y + 4 - side * 2;
      line(F, [X, Y], [X, Y - 13], outline);
      line(F, [X + 1, Y], [X + 1, Y - 12], warm);
      circ(F, [X + 0.5, Y - 14], 1.8, gold);
    }
  }
  if (a === 'peek') {
    const k = span(n, 2, 5, 6, 12) + span(n, 13, 16, 17, 23) + span(n, 82, 86, 88, 96);
    oval(B, [-margin[0] + 5 + 2 * k, 146 - 4 * k], 3.5, 5.2, gold, 0.9);
    circ(B, [-margin[0] + 5, 140], 1.8, warm);
    if (k > 0.2) line(B, [10 - margin[0], 143 - 3 * k], [13 - margin[0], 142 - 3 * k], gold, k);
  }
  const bell = p.ring || 0;
  const pivot: XY = [j.latch[0] + 1, j.latch[1]],
    regular: XY = [j.latch[0] + 3, j.latch[1] + 10];
  const rest = through ? lerp(regular, [144, 150], p.porch || 0) : regular;
  const pulled = lerp(rest, through ? j.handR : j.handL, bell),
    bow: XY = [mix(pivot[0], pulled[0], 0.5) + 1, mix(pivot[1], pulled[1], 0.5) + 1];
  if (!p.hide && !['phase', 'happy-f2', 'fidget_a'].includes(a)) {
    line(U, pivot, bow, outline);
    line(U, bow, pulled, outline);
    line(U, [pivot[0] + 1, pivot[1]], [bow[0] + 1, bow[1]], warm);
    if (bell > 0.08) {
      line(F, bow, pulled, gold);
      oval(F, pulled, 2.8, 3.2, gold, 1);
    } else oval(U, pulled, 2.4, 3.1, gold, 1);
  }
  if (a === 'phase' || a === 'happy-f2' || a === 'fidget_a') {
    const active = a === 'phase' ? span(n, 3, 11, 48, 59) : bell;
    if (active > 0.01) {
      const c: XY = [j.sill[0] + 11, j.sill[1] + 1],
        grip = lerp([140, 161], j.handL, bell);
      const guide: XY = [c[0] - 2, grip[1] - 1];
      wheel(F, c, 4.6, (p.form || 0) * 4 + bell);
      line(U, c, guide, outline);
      line(U, [c[0] + 1, c[1]], [guide[0] + 1, guide[1]], warm, active);
      line(F, guide, grip, '#673e50', active);
      line(F, [guide[0] + 1, guide[1]], [grip[0] + 1, grip[1]], warm, active);
      oval(F, grip, 3.4, 3.8, gold, active);
    }
    const u =
      a === 'phase' ? span(n, 20, 26, 47, 55) : a === 'fidget_a' ? span(n, 33, 39, 44, 51) : span(n, 19, 25, 43, 52);
    if (u > 0.01) {
      const loc = j.tower,
        dis = 4 + 2 * u;
      for (const side of [-1, 1])
        for (let i = 0; i < 2; i++) {
          const X = loc[0] + side * (dis + i * 2.5);
          line(U, [X, loc[1] - 3], [X + side, loc[1] - 0.5], gold, u * (0.7 - i * 0.2));
        }
    }
  }
  for (let k = 0; k < 3; k++) {
    const t = ((n + 24 * k) % 72) / 72,
      c = j.chimney;
    circ(
      U,
      [c[0] - 6 * t + 2 * Math.sin(t * 4), c[1] - 3 - 16 * t],
      1.2 + 2.2 * t,
      '#f4ceb7',
      Math.sin(Math.PI * t) * 0.32,
    );
  }
}
