// Root armour is grown in overlapping strips. Its knots, thorns and leaves are independent geometry.
import { type F3, type Mat, type Rig, type V3 } from '../rig/f15-rig';
import { tn, hx } from '../kit/f11-mobkit';
import { ramp, localPoint } from './engraving';
export function forestMaterials(gold: boolean) {
  const bark: Mat = {
    T: gold
      ? tn('#47323c', '#936344', '#bd9054', '#ffe1a0')
      : tn('#352b36', '#685044', '#a57750', '#dcc293'),
  };
  const cambium: Mat = {
    T: gold
      ? tn('#54404a', '#966a44', '#d2a054', '#f8dd86')
      : tn('#473435', '#745242', '#bf9562', '#ecd6a4'),
  };
  const ivy: Mat = {
    T: gold
      ? tn('#473b3b', '#89653e', '#bda14e', '#f5dd8f')
      : tn('#2a3437', '#475641', '#809060', '#c1c186'),
  };
  const thorn: Mat = {
    T: gold
      ? tn('#5b434a', '#ad744a', '#e3b65e', '#fff1b0')
      : tn('#4d454c', '#8d7865', '#ccb189', '#f6e3b7'),
  };
  const plum: Mat = { T: tn('#241c33', '#50314e', '#934f72', '#e99ca1') };
  const soil: Mat = { T: tn('#302b34', '#4b423a', '#786446', '#ab9568') };
  const barkTexture = (x: number, y: number, z: number, l: number) => {
    const u = 24 * x,
      v = 13 * Math.atan2(z, y);
    const rings = Math.sin(v * 1.95 + Math.sin(u * 0.32 + v * 0.2) * 1.7);
    const scar = Math.sin(u * 0.29 - v * 0.17) > 0.45 && rings < -0.68;
    return ramp(
      scar ? cambium : bark,
      l,
      1.4 * rings + 0.64 * Math.cos(u * 0.64 + v * 1.1),
      u,
      v,
    );
  };
  bark.pat = ([x, y, z], l) => barkTexture(x, y, z, l);
  const armour: Mat = {
    ...bark,
    pat: ([x, y, z], l) => {
      const angle = Math.atan2(z, y),
        u = x * 25,
        v = angle * 13;
      const strand = Math.cos(3 * angle + 7.5 * x + 0.7 * Math.sin(x * 7));
      if (strand > 0.1) {
        const chev = Math.cos(u * 1.44 + v * 0.61 + Math.sin(v * 0.6));
        return ramp(ivy, l, (strand - 0.3) * 1.7 + chev * 1.3, u, v);
      }
      return barkTexture(x, y, z, l);
    },
  };
  thorn.pat = ([t, x, y], l) =>
    ramp(
      thorn,
      l,
      Math.sin(t * 32 + x * 1.8) * 0.76 + Math.cos(x * 5 + y * 2) * 0.48,
      t * 15,
      x * 4 + y * 2,
    );
  plum.pat = ([x, y, z], l) =>
    ramp(
      plum,
      l,
      0.8 * Math.cos(6 * Math.atan2(y, x)) + 0.5 * Math.cos(z * 10),
      x * 6,
      y * 5 + z,
    );
  ivy.pat = ([t, x, y], l) =>
    ramp(ivy, l, 1.3 * Math.cos(24 * t + x * 3.3 + y * 1.3), t * 19, y * 5);
  soil.pat = ([t, x, y], l) =>
    ramp(soil, l, Math.cos(11 * t + 6 * x + 2.5 * y), x * 5, t * 13);
  return { bark, armour, ivy, thorn, plum, soil, cambium };
}

export function addBriar(
  r: Rig,
  b: F3,
  h: F3,
  m: ReturnType<typeof forestMaterials>,
  q: number,
) {
  const { ivy, thorn, plum, cambium, bark } = m;
  const lichen: Mat = { T: tn('#354349', '#52645c', '#829181', '#c2c2a1') };
  lichen.pat = ([x, y, z], l) =>
    ramp(
      lichen,
      l,
      1.05 * Math.sin(x * 8 + z * 4) + 0.55 * Math.cos(y * 7),
      x * 7,
      z * 6,
    );
  // A woody knot and lichens sit on the near shoulder, with a dry split towards the belly.
  for (const s of [-1, 1]) {
    const k = b.at(3, s * 14, 4);
    r.ell(k, [0, 0, 0], [4.5, 1.7, 3.5], {
      ...cambium,
      pat: ([x, y, z], l) => {
        const ring = Math.hypot(x * 1.1, z + 0.16) + 0.07 * Math.sin(y * 4);
        return ramp(cambium, l, 1.8 * Math.cos(ring * 15), x * 8, z * 7);
      },
    });
    const patch = b.at(-16, s * 10.8, 9);
    r.ell(patch, [0, 0.5 * s, 0.8], [4.1, 2.2, 1.8], lichen);
    r.ell(b, [2, s * 15.1, 10], [2.8, 1.2, 1.9], lichen);
    const sh = b.p(11, 9 * s, 8);
    r.cap(sh, b.p(7, 12 * s, 14), 1.5, 0.15, cambium);
    // A cluster of three individually lobed drupelets, with a seed and a spent flower.
    for (const [x, y, z, rad] of [
      [-12, 13, 6, 2.7],
      [-8.4, 14.2, 5.3, 3],
      [-11, 14, 2.3, 2.3],
      [-12.4, 14.4, 7.8, 1.7],
    ]) {
      const P = b.p(x, y * s, z);
      r.ball(P, rad, plum);
      r.dot(b.p(x - 0.5, (y + 1) * s, z + rad * 0.72), plum.T[3], 0, 1, 0.9);
    }
    r.ball(b.p(-7.6, s * 13.2, 9), 1.65, ivy);
    r.line(b.p(-10, s * 13, 8), b.p(-9, s * 14, 11), cambium.T[1], 0, 1);
    // Folded leaf with a pale midrib. Its silhouette and reverse carry different planes.
    const leaf = b
      .at(-14, s * 12, 14)
      .roll(s * (0.18 + 0.08 * Math.sin(q - 0.8)));
    const tip = leaf.p(-6, s * 4, -1),
      start = leaf.p(2, 0, 0);
    r.poly([start, leaf.p(-2, s * 3, 2.4), tip], ivy);
    r.poly([start, tip, leaf.p(-3, -s * 0.5, -1.3)], bark);
    r.line(start, tip, ivy.T[2], 0, 1.1);
    // The broken cheek plate exposes a lighter splinter, and each nostril is inset.
    r.line(h.p(5, s * 10.1, 0.1), h.p(3, s * 10.8, -3), cambium.T[3], 0, 1.5);
    r.dot(h.p(19.9, s * 3.7, -1.7), hx('#231e2b'), 0, 1.4, 1.4);
  }
  const fork = b.p(-18, 5, 13),
    elbow = b.p(-24, 10, 16);
  r.cap(fork, elbow, 1.2, 0.8, ivy);
  r.cap(elbow, b.p(-26, 11, 13), 0.7, 0.18, cambium);
  const sprout = b.at(7, -1, 16);
  r.cap(sprout.o, sprout.p(-1, -1, 6.4), 1.7, 0.25, ivy);
  r.dot(b.p(7, 12.3, -6), thorn.T[2], 0, 1, 0.8);
}
export function visorGrain(h: F3, mat: Mat): Mat {
  return {
    ...mat,
    pat: (P, l) => {
      const [x, y, z] = localPoint(h, P);
      const ring = Math.cos(0.65 * x + 1.2 * z + 0.7 * Math.sin(0.45 * y));
      return ramp(
        mat,
        l,
        ring * 0.96 + Math.sin(3 * z + x * 0.42) * 0.57,
        x,
        Math.abs(y) + z,
      );
    },
  };
}
