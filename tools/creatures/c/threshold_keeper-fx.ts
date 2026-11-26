import { disc, fillPoly, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import {
  bridgeTop,
  city,
  clamp,
  drawer,
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
import { liftCentre, bridgeEnd, bridgeRoot } from './threshold_keeper-stage';
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
function foldedMap(p: Pen, origin: XY, u: number) {
  const y = origin[1],
    x = origin[0],
    W = 33 * u,
    H = 11 * u;
  const point = (k: number, h: number): XY => [x + (k / 4 - 0.5) * W, y + h * H + ((k % 2) * 2 - 1) * 1.35 * u];
  for (let k = 0; k < 4; k++) {
    const A = point(k, -0.31),
      B = point(k + 1, -0.31),
      C = point(k + 1, 0.75),
      D = point(k, 0.75);
    poly(p, [A, B, C, D], k % 2 ? '#e7ce99' : '#b6c3a6');
    line(p, A, B, ivory);
    line(p, C, D, '#927763');
    line(p, B, C, '#957f71');
    const a = point(k, 0.15 + 0.22 * Math.sin(k * 1.7)),
      b = point(k + 1, 0.15 + 0.22 * Math.sin((k + 1) * 1.7));
    line(p, a, b, '#568c91');
    if (k % 2 === 1) {
      const v = lerp(A, C, 0.58);
      line(p, [v[0] - 2, v[1] + 1], [v[0], v[1] - 2], '#937b79');
      line(p, [v[0], v[1] - 2], [v[0] + 2, v[1] + 1], '#937b79');
    }
  }
  const pin = point(3, 0.13);
  circ(p, pin, 1.6 * u, '#a75468');
  line(p, point(0, 0.65), point(1, 0.57), '#ad8266');
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
function horizon(p: Pen, u: number) {
  const x = 198,
    y = 88,
    w = 17,
    h = 32;
  // A masonry landing fixes the distant doors in space, even when the two leaves are open.
  poly(
    p,
    [
      [x - 27, y],
      [x - 19, y - 3],
      [x + 24, y - 3],
      [x + 28, y + 1],
      [x + 12, y + 9],
      [x - 9, y + 13],
    ],
    '#655669',
  );
  line(p, [x - 26, y], [x + 26, y], warm);
  // A hanging viaduct joins the upper stop to the belfry. The daylight is visible through its arches.
  for (let k = 0; k < 5; k++) {
    const X = 149 + k * 23;
    poly(
      p,
      [
        [X, y + 1],
        [X + 22, y + 1],
        [X + 22, y + 8],
        [X + 19, y + 9],
        [X + 16, y + 6],
        [X + 10, y + 5],
        [X + 5, y + 8],
        [X + 3, y + 15],
        [X, y + 18],
      ],
      '#786d7f',
    );
    line(p, [X, y + 1], [X + 22, y + 1], '#c7aa97');
    line(p, [X + 2, y + 4], [X + 2, y + 13], '#91828a');
  }
  const top = (t: number) => y - h - 7 * Math.sin(t * Math.PI);
  const arch: XY[] = [
    [x - w, y],
    [x + w, y],
  ];
  for (let i = 10; i >= 0; i--) arch.push([x - w + (2 * w * i) / 10, top(i / 10)]);
  poly(p, arch, '#373c58');
  for (let i = 0; i < 20; i++) {
    const X = x - w + 1 + i * 1.8,
      Y = top(i / 20) + 3;
    line(p, [X, Y], [X, y - 4], ['#434763', '#4c526e', '#4e596e'][i % 3]);
    if (i % 3 === 0) circ(p, [X, Y + 4 + ((i * 13) % 24)], 1, ivory);
    const roof = y - 4 - 3 * Math.sin(i * 0.48);
    line(p, [X, roof], [X, y - 1], '#7a8f95');
  }
  for (const side of [-1, 1]) {
    const L = x + side * w,
      M = x + side * (w - 2) * u,
      P = (t: number, z: number): XY => [mix(L, M, t), z + 2 * t * u];
    const nodes: XY[] = [P(0, y - 1), P(1, y - 1)];
    for (let i = 8; i >= 0; i--) nodes.push(P(i / 8, top(i / 16) + 1));
    poly(p, nodes, side < 0 ? '#4d716f' : '#62827a');
    for (let k = 0; k < 5; k++)
      line(p, P((k + 0.25) / 5, top(k / 10) + 3), P((k + 0.25) / 5, y - 2), k % 2 ? '#344f59' : '#91a68d');
    for (const z of [y - 28, y - 10]) {
      line(p, P(0, z), P(1, z + 1), outline);
      line(p, P(0, z - 1), P(0.94, z), warm);
      circ(p, P(0.2, z), 0.8, ivory);
    }
    diamond(p, ...P(0.8, y - 19), 2.6);
    for (let k = 0; k < 7; k++) {
      const a = k / 7,
        b = (k + 1) / 7,
        A: XY = [x + side * w * a, top((1 - a) / 2)],
        B: XY = [x + side * w * b, top((1 - b) / 2)];
      poly(p, [A, B, [B[0] + side * 2, B[1] - 3], [A[0] + side * 2, A[1] - 3]], k % 2 ? stone : warm);
    }
    line(p, [L, y], [L, top(0)], stone);
  }
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
    weight: XY = [sheave[0] + 7, sheave[1] + 12 + 32 * progress],
    hook: XY = [C[0] + 17, C[1] - 10];
  line(p, [sheave[0] - 2, sheave[1] + 18], [sheave[0] - 2, sheave[1] - 3], outline);
  line(p, [sheave[0] - 4, sheave[1] + 18], [sheave[0] - 4, sheave[1]], stone);
  line(p, sheave, [sheave[0] + 6, sheave[1] + 4], warm);
  line(p, [sheave[0] + 4, sheave[1] + 1], weight, outline);
  line(p, [sheave[0] + 5, sheave[1] + 1], [weight[0] + 1, weight[1]], gold);
  poly(
    p,
    [
      [148, weight[1]],
      [154, weight[1] - 1],
      [156, weight[1] + 6],
      [155, weight[1] + 15],
      [147, weight[1] + 14],
      [146, weight[1] + 6],
    ],
    outline,
  );
  poly(
    p,
    [
      [148, weight[1] + 3],
      [153, weight[1] + 2],
      [154, weight[1] + 12],
      [149, weight[1] + 12],
    ],
    shade,
  );
  line(p, [149, weight[1] + 5], [153, weight[1] + 5], warm);
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
  const count = 13,
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
  if (letterHere) diamond(p, 235, 109, 2.2, true);
}
function popBook(p: Pen, origin: XY, fold: number) {
  const [x, y] = origin,
    W = mix(27, 13, fold),
    h = 1 - fold;
  for (let i = 0; i < 6; i++) {
    const A = x + (i / 3 - 1) * W,
      B = x + ((i + 1) / 3 - 1) * W,
      Y = y + (i % 2 ? 0 : 2) * fold;
    poly(
      p,
      [
        [A, Y - 2],
        [B, Y - 2 + (i % 2 ? 2 : -2) * fold],
        [B + 2, y + 5],
        [A + 2, y + 5],
      ],
      i % 2 ? '#aabd9e' : '#edd6a4',
    );
    line(p, [A, Y - 1], [A + 2, y + 4], '#9e927e');
    line(p, [A + 1, y + 2], [B + 1, y + 1], green);
  }
  for (let i = 0; i < 7; i++) {
    const X = x + (i - 3) * W * 0.27,
      Y = y - 1 + (i % 2) * 2 * fold,
      w = 3.4 * h + 0.7,
      H = [9, 18, 12, 24, 11, 16, 7][i] * (1 - ease(i * 0.05, 0.64 + i * 0.05, fold));
    poly(
      p,
      [
        [X - w, Y],
        [X - w, Y - H],
        [X + w, Y - H],
        [X + w, Y],
      ],
      i % 2 ? '#d9b49a' : '#b89881',
    );
    poly(
      p,
      [
        [X - w - 1, Y - H],
        [X, Y - H - 5 * h],
        [X + w + 1, Y - H],
      ],
      i === 3 ? '#ad5261' : ocean,
    );
    for (let j = 1; j < 4; j++) if (H > 5 * j) line(p, [X - 1, Y - j * 5], [X + 0.5, Y - j * 5], ivory);
    if (H > 5) {
      poly(
        p,
        [
          [X + w - 1, Y],
          [X + w + 1.5, Y - 1],
          [X + w + 1.5, Y - H - 1],
          [X + w - 1, Y - H],
        ],
        i % 2 ? '#aa7e75' : '#80727b',
      );
      line(p, [X - w - 0.7, Y - H], [X, Y - H - 5 * h], warm);
    }
    if (i === 3 && H > 0) {
      line(p, [X, Y - H - 5 * h], [X, Y - H - 10 * h], outline);
      line(p, [X, Y - H - 9 * h], [X + 3 * h, Y - H - 8 * h], '#cd5d67');
    }
  }
  line(p, [x - W + 1, y + 5], [x + 1, y + 7], outline);
  line(p, [x + 1, y + 7], [x + W + 1, y + 5], gold);
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
const distanceToPaper = (paw: XY, c: XY) => Math.abs(paw[0] - c[0]) < 18 && Math.abs(paw[1] - c[1]) < 6;
export function gestures(f: FxInput) {
  const n = f.t * 24,
    a = f.anim,
    p = pose(a, n),
    j = f.points,
    B = f.backdrop,
    U = f.under,
    F = f.above;
  const hoist = a === 'trick-f2',
    paper = a === 'trick_b-f2',
    courier = a === 'trick_b',
    through = a === 'trick',
    show = a === 'show' || a === 'hatch';
  const at = (c: XY, r: number) => {
    for (let k = 0; k < 3; k++) oval(U, [c[0], c[1] + 1.3], r - k, 2.2 - k * 0.48, outline, 0.3 - k * 0.045);
  };
  horizon(B, hoist ? p.gate || 0 : 0);
  const sway = hoist ? span(n, 114, 119, 127, 137) * Math.sin((n - 114) * 0.52) * 2.4 : 0,
    bx = 179 + sway;
  line(B, [183, 72], [179, 72], warm);
  line(B, [179, 72], [bx, 76], outline);
  poly(
    B,
    [
      [bx - 1, 75],
      [bx + 2, 75],
      [bx + 3, 79],
      [bx + 5, 82],
      [bx - 4, 82],
      [bx - 2, 79],
    ],
    '#c29760',
  );
  line(B, [bx - 4, 82], [bx + 5, 82], gold);
  circ(B, [bx + 0.5, 83], 1.2, outline);
  post(B, courier && n < 126);
  atlasTable(B);
  if (!paper) popBook(B, city, 0);
  if (p.floor !== undefined && !p.hide) {
    for (const boot of [j.bootL, j.bootR])
      if (!((p.reveal || p.entryOnly) && boot[0] < j.door[0]) && !(p.exitOnly && boot[0] >= exit[0])) at(boot, 6.2);
  }
  if (p.park > 0.02) at([j.house[0] - 2, 169], 22 * p.park);
  if (through || show || courier) steps(U, j.sill, p.porch || 0);
  if (courier) {
    const homeSlot: XY = [j.sill[0] + 7, j.sill[1] + 10],
      postClip: XY = [229, 115];
    bridge(U, bridgeRoot(j.sill), p.bridge || 0);
    const rampPole: XY = [j.sill[0] - 2, j.sill[1] - 8],
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
    if (n < 190) {
      if (n < 117) {
        const arrival = ease(2, 16, n);
        if (arrival > 0.01) {
          letter(B, [loc[0], loc[1] - 8 * (1 - arrival)], 0.12 * Math.sin(n * 0.31));
          poly(
            B,
            [
              [219, 102],
              [238, 102],
              [238, 112],
              [219, 112],
            ],
            ocean,
          );
          line(B, [220, 112], [237, 112], gold);
        }
      } else {
        F.g.save();
        if (n >= 178) {
          F.g.beginPath();
          F.g.rect(F.qx, F.qy - 25, 256, Y + 28);
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
  if (paper) {
    const hand = lerp(j.handL, j.handR, 0.5),
      slot: XY = [drawer[0], drawer[1] + 11],
      u = p.drawer || 0;
    const trayX = 257 - 41 * u,
      Y = drawer[1];
    if (u > 0.01) {
      poly(
        U,
        [
          [trayX, Y + 5],
          [trayX + 5, Y - 5],
          [257, Y - 5],
          [257, Y + 7],
        ],
        ocean,
      );
      poly(
        U,
        [
          [trayX + 2, Y + 4],
          [trayX + 7, Y - 3],
          [255, Y - 3],
          [255, Y + 5],
        ],
        '#775e62',
      );
      for (let i = 0; i < 4; i++) line(U, [trayX + 3 + i * 8, Y + 4], [trayX + 8 + i * 8, Y - 2], shade);
      line(U, [trayX + 5, Y - 5], [255, Y - 5], gold);
      line(U, [trayX, Y + 5], [trayX + 5, Y - 5], ivory);
    }
    const clipMap = (pen: Pen, c: XY, lower: number, upper = -50) => {
      pen.g.save();
      pen.g.beginPath();
      pen.g.rect(pen.qx, pen.qy + upper, 256, lower - upper);
      pen.g.clip();
      foldedMap(pen, c, 1);
      pen.g.restore();
    };
    if (n < 94) {
      // The standing paper roofs sit behind the working paws; the hinged leaves fold in order, under their fingers.
      popBook(B, city, p.map);
      if (n >= 85) foldedMap(U, lerp(city, [hand[0], hand[1] + 1], ease(85, 94, n)), ease(85, 94, n));
    } else if (n < 151) {
      const c = n < 125 ? ([hand[0], hand[1] + 1] as XY) : lerp([hand[0], hand[1] + 1], slot, ease(125, 143, n));
      clipMap(F, c, n < 125 ? 208 : Y + 6);
      if (n < 141)
        for (const paw of [j.handL, j.handR])
          if (distanceToPaper(paw, c)) {
            circ(F, [paw[0], paw[1] + 1], 1.5, '#a46c55');
            line(F, [paw[0], paw[1]], [paw[0] + 2, paw[1]], '#ffe3ae');
          }
    } else if (n < 169) {
      const t = ease(151, 165, n),
        M: XY = [mix(slot[0], city[0], t), mix(slot[1], city[1] + 10, t) - 10 * ease(162, 169, n)];
      line(U, [city[0] - 5, 169], [236, 169], ocean);
      line(U, [city[0] - 5, 172], [236, 172], warm);
      clipMap(F, M, 171, n < 160 ? 158 : 145);
    } else popBook(B, city, p.map);
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
    const t = ease(105, 123, n);
    if (n >= 105 && n <= 123) {
      const v = lerp(j.lintel, [x - 4, y - 23], t);
      v[1] -= Math.sin(t * Math.PI) * 15;
      shine(U, v, Math.sin(t * Math.PI));
    }
  }
  if (through) {
    const u = span(n, 1, 4, 6, 10) + span(n, 11, 14, 16, 21);
    if (u > 0) {
      diamond(B, 249, 139, 2 + u, true);
      oval(B, [249, 139], 3 + u * 2, 4 + u * 2, warm, u * 0.73);
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
    oval(B, [5 + 2 * k, 146 - 4 * k], 3.5, 5.2, gold, 0.9);
    circ(B, [5, 140], 1.8, warm);
    if (k > 0.2) line(B, [10, 143 - 3 * k], [13, 142 - 3 * k], gold, k);
  }
  const bell = p.ring || 0;
  const pivot: XY = [j.latch[0] + 1, j.latch[1]],
    regular: XY = [j.latch[0] + 3, j.latch[1] + 10];
  const rest = through ? lerp(regular, [144, 150], p.porch || 0) : regular;
  const pulled = lerp(rest, through ? j.handR : j.handL, bell),
    bow: XY = [mix(pivot[0], pulled[0], 0.5) + 1, mix(pivot[1], pulled[1], 0.5) + 1];
  if (!p.hide) {
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
        grip = lerp([143, 145], j.handL, bell);
      const guide: XY = [c[0] + 6, c[1] + 3];
      wheel(F, c, 4.6, (p.form || 0) * 4 + bell);
      line(F, c, guide, outline);
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
