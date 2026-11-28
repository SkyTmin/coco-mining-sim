// Royal guard, three knotted tail cords, and the two carried implements.
import { F3, Rig, vlerp, vadd, vsub, vnorm, vcross, vdot, vmul, vlen, type V3 } from '../rig/f15-rig';
import {
  brass,
  darkGold,
  edge,
  fur,
  ink,
  pale,
  ruby,
  skin,
  smoke,
  steel,
  stone,
  velvet,
} from './rat_king-regalia';
export function basisAlong(origin: V3, direction: V3, left: V3, fallback: V3) {
  const f = vnorm(direction);
  const reference = Math.abs(vdot(f, left)) > 0.92 ? fallback : left;
  const u = vnorm(vcross(f, reference));
  return new F3(origin, f, vnorm(vcross(u, f)), u);
}
export function weapon(r: Rig, w: F3, rail: boolean) {
  r.tag = 'weaponGrip';
  r.cap(w.p(-3, 0, 0), w.p(7.6, 0, 0), 1.85, 1.65, smoke);
  for (let i = 0; i < 5; i++)
    r.cap(w.p(i * 1.45 - 1.9, -0.32, 0.1), w.p(i * 1.45 - 1.5, 0.32, 0.1), 1.86, 1.79, i % 2 ? skin : stone);
  r.ell(w, [-3.8, 0, 0], [1.18, 2.16, 2.14], brass);
  r.cap(w.p(6.1, 0, -3.4), w.p(6.1, 0, 2.2), 1.05, 1.3, darkGold);
  r.tag = rail ? 'rail' : 'cleaver';
  if (rail) {
    // I-section with twin rolled lips and a web pierced by former fishplate bolts.
    for (const z of [-2, 2]) {
      const ring = (x: number): V3[] => [
        w.p(x, -1.8, z - 0.55),
        w.p(x, 1.8, z - 0.55),
        w.p(x, 1.8, z + 0.55),
        w.p(x, -1.8, z + 0.55),
      ];
      const a = ring(6.9),
        b = ring(36);
      for (let k = 0; k < 4; k++) r.poly([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]], k === 2 ? edge : steel);
      r.poly(b, edge);
    }
    for (const s of [-1, 1]) {
      r.poly([w.p(7, s * 0.58, -2), w.p(36, s * 0.58, -2), w.p(36, s * 0.58, 2), w.p(7, s * 0.58, 2)], steel);
      for (const x of [12, 29, 33]) r.dot(w.p(x, s * 0.76, 0), ink.T[1], 0, 1.1);
    }
    return;
  }
  const cut: [number, number][] = [
    [6.8, 1.6],
    [21.7, 2.1],
    [24.0, 0.9],
    [23.2, -1],
    [24, -1.8],
    [23.4, -3.3],
    [22.5, -6.4],
    [19.2, -7.2],
    [18.6, -5.9],
    [16.4, -7.0],
    [8.2, -6.2],
  ];
  for (const side of [-1, 1]) {
    const panel = cut.map(([x, z]) => w.p(x, side * 0.77, z));
    r.poly(panel, steel);
    r.poly(
      [
        [8.2, -6.2],
        [16.4, -7],
        [18.6, -5.9],
        [19.2, -7.2],
        [22.5, -6.4],
        [21.7, -4.7],
        [19.9, -5.8],
        [18.3, -4.55],
        [16.2, -5.5],
        [8.4, -4.8],
      ].map(([x, z]) => w.p(x, side * 0.88, z)),
      edge,
    );
    r.ell(w, [20, side * 0.8, 0.45], [0.9, 0.4, 0.76], ink);
    r.line(w.p(10, side * 0.85, -0.1), w.p(11.7, side * 0.85, -1.8), edge.T[2]);
    r.line(w.p(14.65, side * 0.88, -0.15), w.p(16.5, side * 0.88, -2.4), steel.T[3]);
    for (const [x, z] of [
      [11, 0],
      [14, -3],
      [21, -2.6],
    ])
      r.dot(w.p(x, side * 0.9, z), stone.T[1], 0, 0.72);
  }
  r.poly([w.p(6.8, -0.77, 1.6), w.p(21.7, -0.77, 2.1), w.p(21.7, 0.77, 2.1), w.p(6.8, 0.77, 1.6)], edge);
}
export function tail(
  r: Rig,
  b: F3,
  wave: number,
  lift: number,
  sweep: number,
  goal: V3 | undefined,
  back: F3,
  wrap: number,
) {
  r.tag = 'tail';
  let primary = b.o;
  for (const k of [-1, 0, 1]) {
    const points: V3[] = [];
    const curve = (u: number) => {
      const a = 2.6 * Math.PI * u + k * 2.1,
        weight = u * u;
      const f = -12 - 31 * u + (k === 0 ? 2 : k === -1 ? -7 : 1) * u;
      const lateral =
        6.2 * Math.sin(u * 5.05 - 0.4) + 1.7 * Math.sin(a) + k * 2.2 * weight + (wave + 14.5) * weight;
      const z =
        -7 -
        4.4 * Math.sin(u * Math.PI) +
        u * (k === 1 ? 5 : k === -1 ? -13 : -4) +
        Math.cos(a) * 1.1 +
        lift * weight;
      const dir = u * sweep;
      const free = b.p(
        f * Math.cos(dir) - lateral * Math.sin(dir),
        f * Math.sin(dir) + lateral * Math.cos(dir),
        z,
      );
      if (!wrap) return free;
      // The heavy cords roll from the rump around the curved back, with the
      // two maces coming to rest on opposite sides of the shoulder blades.
      const start = b.p(-12, -2.3 + k, -7 + Math.cos(k * 2.1));
      const low = back.p(-38, 6.5 + k * 4, -14);
      const high = back.p(-30.5, 10.0 + k * 7.2, 22);
      const tip = back.p(-14 - k * 4.1, 8 - k * 7, 21 + k * 2.4);
      const rear = vlerp(vlerp(start, low, u), vlerp(low, high, u), u);
      const upper = vlerp(vlerp(low, high, u), vlerp(high, tip, u), u);
      return vlerp(free, vlerp(rear, upper, u), wrap);
    };

    const delta = goal ? vsub(goal, curve(1)) : undefined;
    // Move the main mace exactly onto the IK target. The two sibling cords follow
    // only part of the same displacement, preserving the three separate weights.
    for (let i = 0; i <= 13; i++) {
      const u = i / 13;
      const P = curve(u);
      points.push(delta ? vadd(P, vmul(delta, u * u * (k === 1 ? 1 : k === -1 ? 0.58 : 0.4))) : P);
    }
    const mace = points[13];
    if (k !== 0) {
      // The cord ends at the bronze socket on the outside of the stone. Trim
      // along its actual arc before spacing the thirteen flexible joints.
      const segments = points.slice(1).map((p, i) => vlen(vsub(p, points[i])));
      let end = segments.reduce((sum, length) => sum + length, 0);
      let i = 12;
      while (i > 0 && vlen(vsub(points[i], mace)) < 5.9) {
        end -= segments[i--];
      }
      const d0 = vlen(vsub(points[i], mace)),
        d1 = vlen(vsub(points[i + 1], mace));
      end -= segments[i] * Math.min(1, (5.9 - d1) / Math.max(0.001, d0 - d1));
      const source = points.slice();
      let span = 0,
        length = 0;
      for (let j = 1; j <= 13; j++) {
        const at = (end * j) / 13;
        while (span < 12 && length + segments[span] < at) length += segments[span++];
        points[j] = vlerp(source[span], source[span + 1], (at - length) / Math.max(0.001, segments[span]));
      }
    }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        c = points[i],
        u = i / 13,
        width = 2.5 - 1.37 * u;
      r.cap(a, c, width + 0.13, width, skin);
      const ring = vlerp(a, c, 0.72);
      r.cap(ring, vlerp(a, c, 0.84), width + 0.11, width + 0.06, i % 3 ? skin : stone);
      if (i % 2 === 1)
        r.line(vadd(a, b.v(0, 0.12, width * 0.7)), vadd(ring, b.v(0, 0.1, width * 0.7)), skin.T[2], 0, 0.52);
    }
    const point = mace;
    if (k !== 0) {
      const cuff = new F3(point, b.f, b.s, b.u);
      const fitting = vnorm(vsub(points[13], mace));
      r.cap(points[13], vadd(mace, vmul(fitting, 4.1)), 1.36, 1.62, darkGold);
      r.ell(cuff, [0, 0, 0.3], [4.75, 4.45, 4.2], stone);
      for (let n = 0; n < 5; n++) {
        const a = (n * Math.PI * 2) / 5 + 0.45;
        const x = 2.65 * Math.cos(a),
          y = 2.65 * Math.sin(a);
        r.ell(cuff, [x, y, 0.85], [2.5, 2.35, 2.85], n % 2 ? stone : smoke);
        r.cap(cuff.p(x * 0.33, y * 0.33, 4.55), cuff.p(x * 1.42, y * 1.42, 1.65), 0.95, 0.58, brass);
      }
      r.ell(cuff, [0, 0, 4.15], [2.4, 2.1, 0.98], brass);
      if (k === 1) primary = point;
    }
  }
  return primary;
}
export function smallKing(r: Rig, b: F3, walk: number) {
  r.tag = 'kingletBody';
  r.ell(b, [0, 0, 6.1], [11, 6.35, 6.1], fur);
  r.tag = 'kingletMantle';
  r.ell(b, [-2.4, 0, 9], [9, 6.55, 4], velvet);
  r.cap(b.p(-10, 1.65, 10.7), b.p(2, 2.65, 12.35), 0.85, 0.57, pale);
  r.tag = 'kingletHead';
  r.ell(b, [8.8, 0, 7.7], [6.2, 4.6, 4.35], fur);
  r.ell(b, [14.3, 0, 6.8], [4.0, 2.65, 1.8], smoke);
  r.ell(b, [17.3, 0, 6.8], [1.2, 1.6, 1.02], skin);
  for (const s of [-1, 1]) {
    r.tag = 'kingletHead';
    r.ell(b, [7.2, s * 3.27, 10], [2.6, 1.35, 2.7], skin);
    r.ell(b, [10.8, s * 3.52, 8.7], [1.2, 0.85, 0.95], brass);
    r.dot(b.p(11.35, s * 4.2, 8.9), pale.T[3]);
    r.line(b.p(14, s * 1.9, 6.6), b.p(18, s * 6.5, 6.6), pale.T[1]);
    for (const k of [-1, 1]) {
      r.tag = 'kinglet' + (k < 0 ? 'Hind' : 'Fore') + (s < 0 ? 'L' : 'R');
      const x = k * 6.7 + s * k * walk;
      r.ell(b, [k * 6.5 + s * k * walk * 0.4, s * 4.15, 3.12], [2, 1.65, 2.32], fur);
      r.ell(b, [x + 0.9, s * 4.7, 1.07], [2.9, 1.75, 1.07], skin);
    }
    r.tag = 'kingletTail';
    let prev = b.p(-10.4, s, 4.35);
    for (let i = 1; i <= 7; i++) {
      const q = i / 7,
        p = b.p(-9 - 16 * q, s * (1 + 3 * q) + Math.sin(q * 6 + walk) * 2.5, 3.55 + 3.8 * Math.sin(q * 4.8));
      r.cap(prev, p, 1.5 - 0.8 * q, 1.42 - 0.85 * q, skin);
      prev = p;
    }
  }
  r.tag = 'kingletCrown';
  r.ell(b, [8.3, 0, 11.7], [3.9, 3.5, 1.2], brass);
  for (let k = 0; k < 5; k++) {
    const a = (2 * Math.PI * k) / 5;
    r.cap(
      b.p(8.3 + 3.1 * Math.cos(a), 2.9 * Math.sin(a), 12.3),
      b.p(8.3 + 3.1 * Math.cos(a), 2.9 * Math.sin(a), 15.1),
      0.89,
      0.55,
      brass,
    );
  }
  r.dot(b.p(12, 0, 12.2), ruby.T[2]);
}
