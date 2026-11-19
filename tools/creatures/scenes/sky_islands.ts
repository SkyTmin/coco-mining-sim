// Suspended, sun-bleached landing stage above an inversion layer.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';

let background: Px;
const c = hx;
function path(p: Px, points: Point[], color: string) {
  for (let j = 1; j < points.length; j++) p.line(...points[j - 1], ...points[j], c(color));
}
export function island(p: Px, x: number, y: number, s: number) {
  const local = (pts: Point[]) => pts.map(([u, v]) => [x + u * s, y + v * s] as Point);
  face(
    p,
    local([
      [-34, -2],
      [-22, -7],
      [-12, -6],
      [4, -9],
      [17, -5],
      [34, -2],
      [22, 3],
      [2, 5],
      [-21, 4],
    ]),
    c('#65757a'),
  );
  face(
    p,
    local([
      [-34, -2],
      [-12, 1],
      [12, 0],
      [34, -2],
      [25, 8],
      [19, 10],
      [10, 29],
      [4, 34],
      [1, 19],
      [-8, 21],
      [-18, 12],
      [-27, 9],
    ]),
    c('#3b4b60'),
  );
  face(
    p,
    local([
      [-31, -1],
      [-12, 2],
      [-3, 8],
      [-1, 20],
      [-9, 19],
      [-15, 11],
      [-22, 10],
    ]),
    c('#536372'),
  );
  path(
    p,
    local([
      [-27, -3],
      [-14, -4],
      [-8, -7],
      [5, -8],
    ]),
    '#8a9290',
  );
  for (const [u, v, w] of [
    [-15, 15, 3],
    [1, 24, 4],
    [12, 12, 3],
  ]) {
    face(
      p,
      local([
        [u, -5],
        [u + 1, -v],
        [u + w, -v],
        [u + w + 1, -5],
      ]),
      c('#485564'),
    );
    path(
      p,
      local([
        [u - 2, -v],
        [u + w + 2, -v],
      ]),
      '#84908e',
    );
  }
  path(
    p,
    local([
      [-20, -14],
      [-10, -14],
      [-7, -16],
    ]),
    '#718184',
  );
}
export function cloudbank(p: Px, y: number, seed: number, shade: string, rim: string) {
  let x = -14;
  for (let j = 0; x < p.w + 20; j++) {
    const roll = 7 + Math.floor(hash(seed, j) * 21),
      yy = y + Math.sin(x / 31 + seed) * 4;
    p.ell(x, yy, roll, roll * 0.38, c(shade));
    p.ell(x + roll * 0.38, yy + 1, roll * 0.63, roll * 0.21, c(shade));
    p.line(x - roll * 0.66, yy - roll * 0.25, x - roll * 0.11, yy - roll * 0.34, c(rim));
    x += roll * 1.13;
  }
}
function sky(p: Px) {
  for (let y = 0; y < p.h; y++)
    p.rect(0, y, p.w - 1, y, mixc(c('#293b54'), c('#82918e'), Math.min(1, Math.floor(y / 4) / 16)));
  for (let i = 0; i < 12; i++) {
    const x = hash(i, 94) * p.w,
      y = 5 + hash(i, 88) * 22;
    p.line(x, y, x + 3 + hash(i, 36) * 13, y - 1, c('#566b7b'));
  }
  cloudbank(p, 39, 2, '#71878b', '#819193');
  island(p, 29, 33, 0.76);
  island(p, 108, 20, 0.38);
  island(p, 181, 40, 0.68);
  cloudbank(p, 62, 6, '#899794', '#9ca79b');
  cloudbank(p, 77, 12, '#788b8d', '#95a29c');
  for (let y = 81; y < p.h; y++)
    p.rect(0, y, p.w - 1, y, mixc(c('#80928d'), c('#586d76'), (y - 81) / (p.h - 81)));
}
function deck(p: Px) {
  // Boards are long, staggered and slightly raked upwards. Narrow broken ends
  // on the left expose the cloud sea and the carriage beam below.
  const back = 54,
    width = 65,
    course = 11;
  function plank(x: number, y: number, style: number, seed: number, first: number) {
    const shade = mixc(c('#4d4a49'), c('#847963'), 0.24 + 0.45 * hash(seed, 2));
    const edge = Math.floor(2 + hash(seed, 3) * 3),
      bevel = mixc(shade, c('#b3a489'), 0.45);
    const v = (u: number, h: number): Point => [x + u, y + h - 0.055 * (x + u)];
    face(
      p,
      [
        [0, 1],
        [width - edge, 0],
        [width - 1, 1],
        [width - 1, course - 3],
        [width - 3, course - 2],
        [2, course - 1],
      ].map(([u, h]) => v(u, h)),
      shade,
    );
    p.line(...v(2, 1), ...v(width - edge - 3, 0), bevel);
    for (let n = 0; n < 4; n++) {
      const a = first + hash(seed, n, 4) * (width - 14 - first),
        len = 3 + hash(seed, n, 18) * 15;
      const h = 2 + hash(seed, n, 17) * (course - 5);
      p.line(
        ...v(a, h),
        ...v(Math.min(width - 3, a + len), h - 0.4),
        mixc(shade, c(n % 2 ? '#362f35' : '#a89a82'), 0.31),
      );
    }
    const u = 27 + hash(seed, 7) * 16,
      h = course * 0.46;
    if (style === 0) {
      // runout and a closed, dark knot
      p.ell(...v(u, h), 4.6, 1.6, c('#5b5147'));
      p.line(...v(u - 1, h), ...v(u + 2, h), c('#453f3d'));
      path(p, [v(u - 11, h), v(u - 5, h - 2), v(u + 5, h - 2), v(u + 11, h - 1)], '#8b7e67');
    } else if (style === 1) {
      // split with a silvered lip
      path(
        p,
        [v(width - 2, h + 1), v(width - 9, h + 1), v(width - 15, h - 1), v(width - 23, h)],
        '#4e4542',
      );
      p.line(...v(width - 15, h), ...v(width - 9, h + 2), bevel);
    } else if (style === 2) {
      // pegged repair strap
      face(p, [v(u - 3, 0), v(u + 1, 0), v(u - 1, course - 1), v(u - 5, course - 1)], c('#646661'));
      p.set(...v(u - 2, 2), c('#a1a296'));
      p.set(...v(u - 4, course - 3), c('#4b4e4d'));
    } else if (style === 3) {
      // old paint skimmed off by boots
      for (let i = 0; i < 7; i++) {
        const px = u - 11 + hash(seed, i, 16) * 21,
          yy = h + (i % 3) - 1;
        p.line(...v(px, yy), ...v(px + 2 + (i % 3), yy), c('#73827c'));
      }
    } else if (style === 4) {
      // radial cut crossed by growth rings
      for (let i = 0; i < 3; i++)
        path(p, [v(u - 12, h + 2 - i), v(u - 4, h - i), v(u + 9, h - 1 - i)], '#857861');
    } else {
      // a shallow hawser gouge in the grain
      path(p, [v(u - 12, h - 2), v(u - 5, h + 1), v(u + 5, h + 2), v(u + 12, h + 1)], '#544b47');
      p.line(...v(u - 5, h + 2), ...v(u + 4, h + 3), bevel);
    }
    for (const z of [3, width - 5]) {
      p.set(...v(z, 3), c('#484343'));
      p.set(...v(z, 2), c('#a1957e'));
    }
  }
  face(
    p,
    [
      [0, 56],
      [p.w, 43],
      [p.w, p.h],
      [0, p.h],
    ],
    c('#4c4745'),
  );
  for (let j = 0; j < 11; j++) {
    const y = back + course * j,
      off = (j % 3) * 18;
    for (let i = -1; i * width - off < p.w + 8; i++) {
      const x = i * width - off;
      plank(x, y, (i + j * 3 + 18) % 6, 37 * j + i + 3, 1);
    }
  }
  // Lapped lip and iron pins along the outer edge of the stage.
  path(
    p,
    [
      [0, 54],
      [66, 50],
      [143, 46],
      [207, 42],
    ],
    '#655f54',
  );
  path(
    p,
    [
      [0, 52],
      [66, 48],
      [143, 44],
      [207, 40],
    ],
    '#9a9481',
  );
  for (const x of [5, 15, 79, 89, 167, 177]) p.set(x, Math.round(52 - x * 0.057), c('#505355'));
  face(
    p,
    [
      [0, 66],
      [15, 64],
      [29, 70],
      [22, 72],
      [16, 72],
      [9, 80],
      [5, 96],
      [0, 100],
    ],
    c('#708389'),
  );
  path(
    p,
    [
      [0, 65],
      [15, 64],
      [29, 69],
      [20, 70],
      [12, 71],
    ],
    '#978f77',
  );
  path(
    p,
    [
      [0, 74],
      [17, 71],
      [22, 71],
    ],
    '#514b45',
  );
}
function post(p: Px, x: number, y: number, h: number) {
  const v = (a: number, b: number): Point => [x + a, y + b];
  p.ell(x + 4, y + 1, 10, 3, c('#474749'));
  face(p, [v(-4, 1), v(-5, -h + 1), v(-2, -h - 2), v(4, -h), v(5, -2), v(1, 2)], c('#726752'));
  p.line(...v(-4, -h + 2), ...v(-3, -2), c('#a39173'));
  p.rect(x + 2, y - h + 1, x + 4, y - 1, c('#514b43'));
  for (const off of [7, 9, 11])
    path(
      p,
      [v(-5, -h + off), v(1, -h + off + 1), v(5, -h + off - 1)],
      off === 9 ? '#a99b7d' : '#514c41',
    );
}
function sail(p: Px) {
  post(p, 43, 146, 46);
  path(
    p,
    [
      [7, 123],
      [17, 122],
      [28, 117],
      [42, 104],
      [54, 111],
      [63, 114],
    ],
    '#4a4842',
  );
  path(
    p,
    [
      [7, 122],
      [17, 121],
      [28, 116],
      [42, 103],
      [54, 110],
      [63, 113],
    ],
    '#a69778',
  );
  const cloth: Point[] = [
    [11, 122],
    [23, 118],
    [41, 103],
    [39, 122],
    [33, 127],
    [29, 134],
    [24, 133],
    [19, 138],
    [18, 134],
    [12, 136],
  ];
  face(p, cloth, c('#7f7460'));
  face(
    p,
    [
      [12, 123],
      [23, 118],
      [40, 105],
      [30, 121],
      [22, 127],
      [14, 133],
    ],
    c('#98907a'),
  );
  face(
    p,
    [
      [19, 132],
      [34, 118],
      [39, 109],
      [37, 121],
      [31, 126],
      [26, 134],
    ],
    c('#706655'),
  );
  path(
    p,
    [
      [14, 126],
      [24, 122],
      [35, 111],
    ],
    '#aaa087',
  );
  for (const [x, y] of [
    [15, 135],
    [20, 136],
    [25, 133],
    [31, 128],
  ])
    p.line(x, y, x - 1, y + 4, c('#8f846b'));
}
function render(p: Px, t: number) {
  if (!background || background.w !== p.w || background.h !== p.h) {
    background = new Px(p.w, p.h);
    sky(background);
    deck(background);
    post(background, 22, 58, 26);
    post(background, 178, 46, 15);
    path(
      background,
      [
        [26, 40],
        [51, 47],
        [75, 48],
        [99, 46],
        [126, 40],
        [145, 35],
        [174, 37],
      ],
      '#687273',
    );
  }
  p.data.set(background.data);
  const a = (t * Math.PI * 2) / 3;
  face(
    p,
    [
      [24, 35],
      [31, 34 + Math.sin(a)],
      [39, 35 + 2 * Math.sin(a + 0.6)],
      [36, 38 + Math.sin(a + 0.4)],
      [40, 40 + Math.sin(a + 0.8)],
      [30, 39],
      [24, 40],
    ],
    c('#967b68'),
  );
}
export default Object.assign(render, { front: [{ id: 'mooring-sail', depth: 146, paint: sail }] });
