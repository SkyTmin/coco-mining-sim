import { F3, Rig, vadd, vdot, vnorm, vsub, vmul, vcross, type Mat, type V3 } from '../../rig/f15-rig';
const tau = Math.PI * 2;
export function deckAxis(base: V3, top: V3, heading: F3) {
  const up = vnorm(vsub(top, base)),
    f = vnorm(vsub(heading.f, vmul(up, vdot(up, heading.f))));
  return new F3(base, f, vcross(up, f), up);
}
export function drum(
  r: Rig,
  f: F3,
  z0: number,
  z1: number,
  r0: number,
  r1: number,
  side: Mat,
  top: Mat = side,
  n = 10,
) {
  const ring = (i: number, z: number, rad: number) =>
    f.p(Math.cos((tau * i) / n) * rad, Math.sin((tau * i) / n) * rad, z);
  for (let j = 0; j < n; j++)
    r.poly([ring(j, z0, r0), ring(j + 1, z0, r0), ring(j + 1, z1, r1), ring(j, z1, r1)], side);
  r.poly(
    Array.from({ length: n }, (_, i) => ring(i, z1, r1)),
    top,
  );
}
// Distinct large cloud lobes sit on a tapered wisp; their upper edges pick up the light.
export function cloudBank(r: Rig, f: F3, span: number, height: number, puff: Mat, shade: Mat, edge: Mat) {
  r.ell(f, [0, 0, 0], [span * 0.53, span * 0.19, height * 0.35], shade);
  for (let i = 0; i < 5; i++) {
    const u = (i - 2) / 2,
      full = 1 - 0.37 * Math.abs(u);
    r.ell(
      f,
      [u * span * 0.36, Math.sin(i * 2.4) * span * 0.055, height * (0.1 + 0.17 * Math.cos(i * 2.2))],
      [span * 0.2 * full, span * 0.145 * full, height * 0.58 * full],
      i % 2 ? shade : puff,
    );
    r.ell(
      f,
      [u * span * 0.36 - 0.34, Math.sin(i * 2.4) * span * 0.055 - 0.2, height * (0.3 + 0.15 * Math.cos(i * 2.2))],
      [span * 0.113 * full, span * 0.087 * full, height * 0.29 * full],
      edge,
    );
  }
}
export function compassStar(r: Rig, f: F3, size: number, gold: Mat, light: Mat) {
  const center = f.p(0.5, 0, 0);
  for (let j = 0; j < 8; j++) {
    const a = (tau * j) / 8,
      len = size * (j % 2 ? 0.6 : 1);
    const tip = f.p(0.12, Math.cos(a) * len, Math.sin(a) * len),
      base = f.p(0.23, Math.cos(a + Math.PI / 4) * size * 0.19, Math.sin(a + Math.PI / 4) * size * 0.19);
    r.poly([center, base, tip], j % 2 ? gold : light);
    r.line(center, tip, j % 2 ? gold.T[2] : light.T[3], light.glow ?? 0, 0.24);
  }
}
export function cliffIsland(r: Rig, f: F3, stone: Mat, shadow: Mat, grass: Mat, sun: Mat) {
  const shore = [
    [-17, -2],
    [-13, -7.5],
    [-5, -9.2],
    [4, -8.45],
    [13, -5.8],
    [16, 0.4],
    [13.85, 5.05],
    [7.2, 8.5],
    [-3, 8.95],
    [-12, 7.1],
    [-17.4, 3.3],
  ];
  const ring = (i: number, h: number, k: number) => f.p(shore[i][0] * k, shore[i][1] * k, h);
  for (let i = 0; i < shore.length; i++) {
    const j = (i + 1) % shore.length,
      lo = 3.15 + 0.55 * Math.cos(i * 2.21),
      hi = 6.85 + 0.65 * Math.sin(i * 2.18);
    r.poly(
      [ring(i, -0.85, 0.83), ring(j, -0.85, 0.83), ring(j, lo, 1.02), ring(i, lo, 1.02)],
      i % 2 ? shadow : stone,
    );
    r.poly([ring(i, lo, 1.02), ring(j, lo, 1.02), ring(j, hi, 0.98), ring(i, hi, 0.98)], i % 3 ? stone : shadow);
    r.poly([ring(i, hi, 0.98), ring(j, hi, 0.98), f.p(0, 0, 7.4)], i % 3 ? grass : sun);
    const a = ring(i, lo, 1.02),
      b = ring(j, lo, 1.02);
    r.cap(a, b, 0.35, 0.32, shadow);
    r.cap(ring(i, hi, 0.97), ring(j, hi, 0.98), 0.65, 0.52, grass);
  }
  // Opening on the near cliff face, edged with seven projecting wedge stones.
  const arch = f.at(-8.1, 8.05, 1.35).turn(Math.PI / 2);
  r.ell(arch, [0.4, 0, 0.9], [0.63, 3.45, 3.35], shadow);
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 7;
    r.ell(arch, [0.85, 3.7 * Math.cos(a), 0.8 + 3.5 * Math.sin(a)], [0.75, 1.06, 1.12], j % 2 ? stone : sun);
  }
}
export function boxHouse(
  r: Rig,
  f: F3,
  len: number,
  w: number,
  h: number,
  wall: Mat,
  wood: Mat,
  roof: Mat,
  window: Mat,
) {
  const floor = [
    [0, -w, 0],
    [len, -w, 0],
    [len, w, 0],
    [0, w, 0],
  ] as V3[];
  const eave = floor.map(([x, y]) => f.p(x, y, h)),
    foot = floor.map((p) => f.p(...p));
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    r.poly([foot[i], foot[j], eave[j], eave[i]], wall);
    r.cap(foot[i], eave[i], 0.3, 0.3, wood);
  }
  for (const x of [0, len]) r.poly([f.p(x, -w, h), f.p(x, 0, h + 2.6), f.p(x, w, h)], wall);
  for (const s of [-1, 1]) {
    r.poly(
      [
        f.p(-0.6, 0, h + 2.8),
        f.p(len + 0.6, 0, h + 2.8),
        f.p(len + 0.6, s * (w + 0.6), h - 0.2),
        f.p(-0.6, s * (w + 0.6), h - 0.2),
      ],
      roof,
    );
    for (let x = 0.3; x < len; x += 1.95)
      r.line(f.p(x, 0, h + 2.85), f.p(x, s * (w + 0.65), h), wood.T[1], 0, 0.3);
  }
  for (const x of [len * 0.28, len * 0.73]) {
    r.poly(
      [
        f.p(x - 0.75, w + 0.18, 1.35),
        f.p(x + 0.75, w + 0.18, 1.35),
        f.p(x + 0.75, w + 0.18, 3.28),
        f.p(x - 0.75, w + 0.18, 3.28),
      ],
      window,
    );
    r.line(f.p(x, w + 0.3, 1.3), f.p(x, w + 0.3, 3.25), wood.T[1], 0, 0.43);
  }
  r.cap(f.p(len * 0.72, -w * 0.35, h + 1.5), f.p(len * 0.72, -w * 0.35, h + 4.75), 0.76, 0.68, wood);
}
