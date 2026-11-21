// A four-light crown grows from two oak burrs. Dimensions are in the unscaled animal frame.
import { readCreatureCard } from '../bodies/card-data';
import type { LightAppearance, LightSkeleton } from '../bodies/light-quadruped';
import { furLock, furTuft } from '../bodies/kits/tailoring';
import { tn } from '../kit/f11-mobkit';
import { finishSurfaces } from './surface-work';
import { F3, Rig, vadd, vcross, vlerp, vmul, vnorm, vsub, type Mat, type V3 } from '../rig/f15-rig';

const data = readCreatureCard('root_stag');
const material = (a: string, b: string, c: string, d: string): Mat => ({ T: tn(a, b, c, d) });
function pigment(name: string) {
  const [a, b, , c, d] = data.materials.find((m) => m.name === name)!.tones;
  return material(a, b, c, d);
}
const coat = pigment('coat'),
  ivory = pigment('mane'),
  bark = pigment('bark');
const leaf = pigment('leaf'),
  hoof = pigment('hoof'),
  amber = pigment('ember');
const umber = material('#33262e', '#573638', '#784835', '#9d6647');
const honey = material('#5c3931', '#9c603d', '#c98852', '#ecc08a');
const pearl = material('#897677', '#baa39c', '#ead9c4', '#fff2d8');
const ears = material('#563e43', '#945e55', '#c2856f', '#e6b295');
const wood = material('#634137', '#986546', '#be8a58', '#e0b881');
const gold = material('#644330', '#9e6c3e', '#d29f52', '#ffdc87');
const coal = material('#1f2530', '#3b3440', '#5d4e54', '#8a7776');
hoof.spec = true;
ivory.bias = 0.69;
pearl.bias = 0.73;
ears.bias = 0.26;
leaf.bias = 0.23;
const iris = material('#68331f', '#bb6429', '#eda744', '#ffe9a3');
iris.bias = 0.32;
const pupil = material('#151622', '#1c1a25', '#2d252d', '#39323c');
for (const fur of [coat, ivory, honey, gold]) {
  fur.pat = (q, l) => {
    const fiber = Math.sin(21 * q[1] + 12 * q[2] + 6 * q[0]) * Math.sin(9 * q[2] - 4 * q[0]);
    return fiber > 0.76 ? fur.T[l > 0.8 ? 2 : l > 0.28 ? 1 : 0] : null;
  };
}

function muscle(r: Rig, a: V3, b: V3, forward: V3, width: number, depth: number, fur: Mat) {
  const up = vnorm(vsub(b, a)),
    side = vnorm(vcross(up, forward));
  const f = new F3(vlerp(a, b, 0.47), vnorm(vcross(side, up)), side, up);
  r.ell(f, [0, 0, 0], [depth, width, Math.hypot(...vsub(a, b)) * 0.61], fur);
}
function legs(r: Rig, s: LightSkeleton, fur: Mat) {
  for (const l of s.legs) {
    r.tag = l.name;
    const { hip, knee, hock, hoof: H, side, fore } = l;
    const upper = fore > 0 ? 3.6 : 4.95;
    r.cap(hip, knee, upper, 2.05, fur);
    muscle(r, hip, knee, s.body.f, upper * 0.89, upper * 1.14, fur);
    r.cap(knee, hock, 2.15, 1.33, fur);
    const sock = vlerp(knee, hock, fore > 0 ? 0.57 : 0.48);
    r.cap(sock, hock, 1.79, 1.43, umber);
    r.cap(hock, H.p(0.1, 0, 1.9), 1.55, 1.24, umber);
    r.cap(vadd(hock, H.v(0, side * 0.64, 0)), H.p(0.35, side * 0.89, 2.6), 0.52, 0.34, fur);
    r.ell(H, [-0.05, 0, 2.72], [1.7, 1.53, 1.25], umber);
    for (const split of [-1, 1]) {
      const toe = H.at(0.7, split * 0.71, 1.05).turn(split * 0.1);
      r.ell(toe, [0, 0, 0], [2.09, 0.87, 1.02], hoof);
      r.poly(
        [toe.p(1.3, -0.62, -0.8), toe.p(2.29, -0.31, -0.85), toe.p(2.23, 0.42, -0.85), toe.p(0.5, 0.78, 0.61)],
        hoof,
      );
      r.line(toe.p(0.03, split * 0.48, 0.83), toe.p(1.33, split * 0.49, 0.43), hoof.T[2], 0, 0.26);
    }
    const spur = H.p(-1.4, side, 3.6);
    r.cap(spur, H.p(-2.02, side, 0.99), 0.62, 0.23, hoof);
    for (const n of [-1, 0, 1]) {
      const root = vadd(knee, H.v(-0.53, n * 0.85, 0.22));
      furLock(
        r,
        root,
        vadd(root, H.v(-1.75, n * 0.44, -2.55)),
        H.v(0.75, 0, 0.23),
        H.v(0, side * 0.6, -0.1),
        fur,
        umber,
      );
    }
  }
  s.points.hoofFR = s.points.foreR;
}

function torso(r: Rig, s: LightSkeleton, fur: Mat) {
  const B = s.body,
    L = s.length,
    W = s.width,
    H = s.height;
  r.tag = 'torso';
  r.ell(B, [-1.5 * L, 0, 0.8], [17.5 * L, 7.2 * W, 7.7 * H], fur);
  r.ell(B, [-12.2 * L, 0, 0.1], [8.8 * L, 7.8 * W, 8.0 * H], fur);
  r.ell(B, [10.1 * L, 0, 0.0], [8.6 * L, 7.2 * W, 9.0 * H], fur);
  r.ell(B, [0.3 * L, 0, -4.05 * H], [12.4 * L, 5.75 * W, 3.7 * H], honey);
  for (const side of [-1, 1]) {
    const rump = B.at(-11.5 * L, side * 4.6 * W, -0.8).pitch(0.25);
    r.ell(rump, [0, 0, 0], [7.3 * L, 3.45 * W, 8.0 * H], fur);
    const shoulder = B.at(11.4 * L, side * 4.5 * W, 0.1).pitch(-0.16);
    r.ell(shoulder, [0, 0, 0], [5 * L, 3.2 * W, 7.8 * H], fur);
    // Markings lie on the upper rump and the barrel, offset between the two rows.
    const spots = [
      [-16, 4.0, 6.45],
      [-12.2, 4.7, 6.98],
      [-8.2, 4.35, 6.65],
      [-4, 4.5, 6.22],
      [0.2, 4.38, 6.33],
      [-14, 1.9, 7.93],
      [-9.7, 2.25, 8.02],
      [-5.9, 2.4, 7.44],
      [-1.8, 2.4, 7.32],
    ];
    for (const [f, z, y] of spots) {
      const patch = B.at(f * L, side * y * W, z * H).pitch(-0.25);
      r.ell(patch, [0, 0, 0], [1.56, 0.55, 0.72], honey);
      r.line(patch.p(-0.8, side * 0.36, 0), patch.p(0.75, side * 0.32, 0.3), ivory.T[2], 0, 0.34);
    }
    for (let i = 0; i < 4; i++) {
      const x = 8.9 + i * 1.24,
        z = 4.6 - i * 1.6;
      furLock(
        r,
        B.p(x * L, side * 6.85 * W, z),
        B.p((x - 1.7) * L, side * 7.02 * W, z - 2.3),
        B.v(1.4, 0, 0.42),
        B.v(0, side * 0.58, 0.4),
        fur,
        honey,
      );
    }
  }
  r.tag = 'tail';
  const T = s.tail.turn(0.12 * Math.sin(s.life.q - 0.85)).pitch(0.14 * Math.sin(s.life.q - 0.42));
  r.ell(T, [-3.4, 0, 1.0], [5.2, 3.0, 2.9], ivory);
  const tip = T.p(-11.6, 0, 4.7);
  r.cap(T.p(-2.5, 0, 1.6), tip, 3.15, 0.59, ivory);
  r.cap(T.p(-1.6, 0, 2.8), T.p(-9.3, 0, 4.8), 2.72, 1.08, fur);
  for (const side of [-1, 1])
    furTuft(
      r,
      T.at(-5, side * 1.4, 2.9)
        .turn(Math.PI + side * 0.13)
        .pitch(-0.51),
      7,
      1.75,
      ivory,
      honey,
    );
  s.points.tailTip = tip;
}

function chest(r: Rig, s: LightSkeleton, fur: Mat) {
  const { neck: N, head: H } = s;
  r.tag = 'neck';
  const neckBase = N.p(-1.0, 0, 0.05),
    poll = H.p(-1.8, 0, -1.2);
  r.cap(neckBase, poll, 6.75, 4.72, fur);
  muscle(r, neckBase, poll, N.f, 6, 6.6, fur);
  r.tag = 'mane';
  const shift = s.pose.maneLift ?? 0;
  // The lowest point stays attached to the brisket, even as the skull reaches down.
  const throat = H.p(2.8, 0, -3.0),
    brisket = N.p(8.1, 0, -7.5);
  r.cap(throat, brisket, 4.65, 3.75, ivory);
  for (let row = 0; row < 4; row++) {
    const origin = vlerp(throat, brisket, 0.14 + row * 0.24);
    for (let n = -2; n <= 2; n++) {
      const side = Math.sign(n),
        t = Math.abs(n) / 2;
      const base = vadd(origin, N.v(4.4 - t * 2.5, n * 2.39, 0.6 + t * 1.15));
      const travel = 0.48 * Math.sin(s.life.q - row * 0.46 - n * 0.19) + 1.85 * shift;
      const tip = vadd(
        base,
        N.v(
          -0.02 - row * 0.56 - t * 2.7 + travel,
          side * (0.55 + t * 0.92),
          -4.3 - row * 1.14 - 0.5 * (1 - t) + shift * 1.2,
        ),
      );
      furLock(
        r,
        base,
        tip,
        N.v(-0.25, 2.12, 0.23),
        N.v(1.07 + 0.45 * (1 - t), 0.15 * n, 0.45),
        (row + n) % 3 === 0 ? pearl : ivory,
        row === 2 ? pearl : ivory,
      );
      if (row === 3 && n === 0) s.points.maneTip = tip;
    }
  }
  for (const side of [-1, 1]) {
    for (let n = 0; n < 4; n++) {
      const base = vlerp(neckBase, poll, 0.15 + n * 0.2);
      const sideBase = vadd(base, N.v(-0.9, side * (6.1 - n * 0.32), 1.75));
      furLock(
        r,
        sideBase,
        vadd(sideBase, N.v(-2.7, side * 0.8, -3.3)),
        N.v(1.56, 0, 1.0),
        N.v(0, side * 0.8, 0),
        n % 2 ? honey : fur,
        umber,
      );
    }
  }
}

function face(r: Rig, s: LightSkeleton, fur: Mat) {
  const H = s.head;
  r.tag = 'head';
  r.ell(H, [-0.4, 0, 0.12], [6.3, 4.85, 5.55], fur);
  r.ell(H, [4.55, 0, -0.95], [6.65, 3.65, 3.5], fur);
  r.tag = 'muzzle';
  r.ell(H, [7.4, 0, -2.88], [5.05, 2.95, 2.1], ivory);
  r.ell(H, [9.8, 0, -1.62], [3.6, 2.53, 1.88], honey);
  r.ell(H, [12.34, 0, -1.91], [1.86, 2.54, 1.63], pupil);
  r.line(H.p(13.71, 0, -1.12), H.p(13.06, 1.21, -1.13), hoof.T[2], 0, 0.8);
  s.points.nose = s.points.muzzle = s.points.snout;
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'L' : 'R';
    r.tag = 'muzzle';
    r.cap(H.p(13.03, side * 1.25, -1.68), H.p(13.17, side * 1.78, -2.05), 0.37, 0.29, coal);
    r.line(H.p(10.4, side * 2.42, -3.21), H.p(7.3, side * 2.92, -3.74), umber.T[0], 0, 0.54);
    for (let i = 0; i < 4; i++) {
      const z = 0.65 - i * 1.36;
      furLock(
        r,
        H.p(2.8 - i * 0.48, side * 4.12, z),
        H.p(-4.1 - i * 0.64, side * (4.94 + i * 0.13), z - 1.8),
        H.v(1.6, 0, 1.22),
        H.v(0.4, side * 0.85, 0.1),
        i === 0 ? honey : ivory,
        i === 2 ? honey : ivory,
      );
    }
    const E = H.at(3.3, side * 4.93, 2.25).turn(side * 0.18);
    const blink = s.life.blink,
      open = 1 - blink * 0.91;
    r.tag = 'eye' + name;
    const from = r.size;
    r.ell(E, [0, 0, 0], [2.64, 1.02, 1.79 * open], pupil);
    if (open > 0.2) {
      r.ell(E, [0.3, side * 0.77, -0.05], [1.62, 0.57, 1.2 * open], iris);
      r.ell(E, [0.47, side * 1.19, -0.02], [0.78, 0.32, 0.86 * open], pupil);
      r.dot(E.p(0.91, side * 1.37, 0.61 * open), pearl.T[3], 0, 0.84);
    }
    r.markEye(from, side, open > 0.2);
    r.cap(E.p(-2.0, side * 0.2, 1.42), E.p(1.76, 0, 1.77), 0.54, 0.27, ivory);
    s.points['eye' + name] = E.o;
    r.tag = 'ear' + name;
    const flutter = 0.16 * Math.sin(s.life.q * 2 - side * 0.95) + 0.41 * (s.pose.earLift ?? 0);
    const A = H.at(-1.8, side * 3.75, 3.65).roll(-side * flutter);
    const sections = [
      [0, 0, 0, 0.7],
      [-0.45, 2.8, 0.72, 1.92],
      [-1.45, 5.7, 1.48, 2.87],
      [-2.96, 9.2, 3.03, 2.57],
      [-4.01, 12.43, 4.42, 0.11],
    ];
    const rim = (i: number, edge: number, front: number): V3 => {
      const [x, y, z, w] = sections[i];
      return A.p(x + front, side * (y + edge * w * 0.59), z - edge * w * 0.8);
    };
    for (let i = 1; i < sections.length; i++) {
      for (const e of [-1, 1]) {
        r.poly([rim(i - 1, e, 0), rim(i, e, 0), rim(i, 0, -0.85), rim(i - 1, 0, -0.85)], fur);
        r.poly([rim(i - 1, e, 0), rim(i, e, 0), rim(i, e * 0.66, 0.46), rim(i - 1, e * 0.66, 0.46)], honey);
        r.poly(
          [rim(i - 1, e * 0.66, 0.46), rim(i, e * 0.66, 0.46), rim(i, 0, 0.39), rim(i - 1, 0, 0.39)],
          ears,
        );
      }
    }
    s.points['earTip' + name] = rim(4, 0, 0);
  }
  r.eye = s.life.blink ? null : s.points.eyeR;
}

function sprout(r: Rig, A: F3, side: number, size: number) {
  // A folded blade: the two surfaces share the pale central vein.
  const tip = A.p(-1.8 * size, side * size * 2.9, 1.85 * size);
  const mid = vlerp(A.o, tip, 0.49),
    ridge = vadd(mid, A.v(0, 0, 0.52 * size));
  for (const sign of [-1, 1]) {
    const edge = vadd(mid, A.v(sign * 1.04 * size, 0, sign * 0.28));
    r.poly([A.o, edge, tip, ridge], leaf);
  }
  r.line(A.o, tip, leaf.T[2], 0, 0.37);
}

// Bark ridges follow each bend along the same side instead of crossing fork openings.
interface RootNode {
  at: V3;
  radius: number;
}
function bough(r: Rig, nodes: RootNode[], frame: F3, side: number, twisted: boolean) {
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1],
      b = nodes[i];
    r.cap(a.at, b.at, a.radius, b.radius, bark);
    if (i < nodes.length - 1) r.ball(b.at, b.radius * 0.95, bark);
    const edge = (n: RootNode, v: number, angle: number) =>
      vadd(
        n.at,
        frame.v(n.radius * 0.7 * Math.cos(angle), side * n.radius * v, n.radius * 0.74 * Math.sin(angle)),
      );
    const angle = i * 0.95;
    const rear = edge(a, 0.53, angle),
      next = edge(b, 0.53, angle + 0.95);
    r.cap(rear, next, Math.max(0.21, a.radius * 0.22), Math.max(0.13, b.radius * 0.23), wood);
    if (twisted && a.radius > 1.45) {
      const tangent = vnorm(vsub(b.at, a.at));
      const u = vnorm(vcross(tangent, frame.f)),
        v = vcross(tangent, u);
      for (let strand = 0; strand < 3; strand++) {
        const along = (t: number) => {
          const turn = (strand * Math.PI * 2) / 3 + 0.53 * (i + t);
          const span = (a.radius * (1 - t) + b.radius * t) * 0.96;
          return vadd(
            vlerp(a.at, b.at, t),
            vadd(vmul(u, span * Math.cos(turn)), vmul(v, span * Math.sin(turn))),
          );
        };
        r.cap(along(0), along(0.51), a.radius * 0.14, a.radius * 0.18, wood);
        r.cap(along(0.51), along(1), a.radius * 0.18, b.radius * 0.14, wood);
      }
      r.cap(edge(a, -0.27, angle + 0.8), edge(b, -0.27, angle + 1.75), a.radius * 0.27, b.radius * 0.23, wood);
      r.line(edge(a, 0.78, angle + 2.6), edge(b, 0.78, angle + 3.55), bark.T[0], 0, 0.43);
    }
  }
}
function lantern(r: Rig, s: LightSkeleton, A: F3, side: number, index: number) {
  const name = (side < 0 ? 'L' : 'R') + index,
    swing = s.pose.lanternSwing ?? 0;
  const stride = s.anim === 'walk' ? 1.4 : 0.74;
  const length = index === 0 ? 7.3 : 7.0;
  const phase = s.life.q - (index === 0 ? 0.78 : 0.34) - (side < 0 ? 0.38 : 0);
  const suspend = new F3(A.o, s.root.f, s.root.s, s.root.u)
    .pitch(0.19 * Math.sin(phase) * stride + 0.72 * swing)
    .roll(0.12 * Math.sin(phase + side) * stride + side * 0.18 * swing);
  const F = suspend.at(0, 0, -length - 1.45).scale(1.16);
  const order = 2 * index + (side < 0 ? 1 : 0);
  const vacancy = s.pose['vacant' + name] ?? Math.max(0, Math.min(1, (s.pose.firefliesAway ?? 0) * 4 - order));
  const strength = Math.max(0, Math.min(1, (s.pose.lanternLight ?? 1) * (1 - vacancy)));
  const shine: Mat = { T: amber.T, glow: strength * 0.91, bias: 0.21 + strength * 0.52, spec: true };
  r.tag = 'lantern' + name;
  r.cap(A.o, suspend.p(0, 0, -length + 3.05), 0.46, 0.38, bark);
  r.ell(F, [0, 0, 3.01], [1.38, 1.27, 0.69], wood);
  for (let n = 0; n < 3; n++) {
    const angle = (n * Math.PI * 2) / 3 + 0.4;
    const shell = (span: number, z: number) => F.p(Math.cos(angle) * span, Math.sin(angle) * span, z);
    bough(
      r,
      [
        { at: shell(0.53, 3.14), radius: 0.66 },
        { at: shell(2.09, 1.56), radius: 0.55 },
        { at: shell(2.17, -0.7), radius: 0.46 },
        { at: shell(0.58, -3.08), radius: 0.37 },
      ],
      F,
      side,
      false,
    );
  }
  r.cap(F.p(0, 0, -2.55), F.p(0.12, 0, -3.94), 0.88, 0.25, bark);
  if (strength > 0.04) {
    const size = 0.98 * Math.sqrt(strength);
    r.ell(F, [0, 0, -0.1], [1.71 * size, 1.64 * size, 2.36 * size], shine);
    r.ell(F, [0.41, side * 0.84, -0.09], [0.78 * size, 0.76 * size, 1.37 * size], {
      T: pearl.T,
      glow: strength,
      bias: 0.86,
      soft: true,
    });
  }
  s.points['lantern' + name] = F.o;
}

function crown(r: Rig, s: LightSkeleton) {
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'L' : 'R',
      flex = s.pose.antlerFlex ?? 0;
    const A = s.head;
    r.tag = 'antler' + name;
    const node = (f: number, y: number, z: number, radius: number): RootNode => {
      const t = Math.max(0, (z - 6) / 25);
      const spread = Math.max(0, (y - 3) / 28);
      const tipTurn = side < 0 ? 17.2 * spread : -7.2 * spread;
      const height =
        z + side * 7.2 * spread - Math.max(0, z - 7) * 0.15 + Math.min(1, Math.max(0, (z - 4) / 8)) * 3.1;
      return {
        at: A.p(
          f + tipTurn + 0.98 * t * t * flex,
          side * (y * 1.51 + 0.73 * t * flex),
          height + t * 1.28 * flex,
        ),
        radius,
      };
    };
    // The flat lower sweep and the upturned terminal fork enclose open sky.
    const trunk = [
      node(-2, 2.8, 4.25, 2.38),
      node(-3.6, 4.6, 7.55, 2.87),
      node(-7.4, 8.9, 11, 2.7),
      node(-10.5, 14.2, 11.8, 2.51),
      node(-14.2, 18.8, 14.4, 2.17),
      node(-17.8, 21.7, 19.2, 1.67),
      node(-18.6, 23.5, 23.4, 1.46),
      node(-19.6, 27.8, 25.8, 1.09),
      node(-21.9, 30.8, 24.8, 0.58),
      node(-23.7, 31.7, 25.75, 0.15),
    ];
    bough(r, trunk, A, side, true);
    // A real fork on each branch: the inner hook grows towards the forehead.
    const inner = [
      trunk[2],
      node(-4.4, 9.85, 15.4, 1.72),
      node(0.9, 11.3, 18.6, 1.4),
      node(3.3, 13.2, 24.7, 1.03),
      node(1.75, 13.6, 27.15, 0.61),
      node(2.6, 14.5, 29.5, 0.19),
    ];
    const backFork = [
      trunk[4],
      node(-18.95, 16.2, 18.25, 1.56),
      node(-22, 12.6, 21.7, 1.26),
      node(-22.85, 11.95, 25.55, 0.86),
      node(-25, 12.2, 27, 0.45),
      node(-25.8, 13.0, 29.2, 0.15),
    ];
    const high = [
      trunk[5],
      node(-16.9, 18.5, 22.4, 1.71),
      node(-16.2, 17.5, 26.8, 1.28),
      node(-17.0, 18.3, 29.25, 0.92),
      node(-16, 19, 31, 0.28),
    ];
    const thorn = [
      trunk[3],
      node(-13.3, 15.6, 9.66, 1.29),
      node(-14.6, 16.15, 8.21, 0.83),
      node(-15.8, 18.27, 8.4, 0.39),
      node(-16.2, 19.0, 9.42, 0.15),
    ];
    const bud = [trunk[7], node(-18.3, 28, 28.24, 0.84), node(-18.6, 27.6, 30, 0.21)];
    for (const curve of [inner, high, backFork, thorn, bud]) bough(r, curve, A, side, false);
    const frameAt = (p: V3) => new F3(p, A.f, A.s, A.u);
    sprout(r, frameAt(trunk[8].at).turn(side * 0.27), side, 1.66);
    sprout(
      r,
      frameAt(trunk[8].at)
        .turn(-side * 0.94)
        .pitch(-0.38),
      -side,
      1.34,
    );
    sprout(r, frameAt(bud[1].at).turn(-side * 0.5), -side, 1.23);
    sprout(r, frameAt(inner[3].at).turn(side * 1.25), side, 1.47);
    sprout(r, frameAt(thorn[3].at).turn(side * 0.58), side, 1.27);
    sprout(r, frameAt(backFork[3].at).turn(-side * 0.42), -side, 1.21);
    if (side > 0) s.points.hornTip = s.points.weaponTip = high[4].at;
    lantern(r, s, frameAt(trunk[8].at), side, 0);
    lantern(r, s, frameAt(inner[5].at), side, 1);
  }
}

export const rootStagAppearance: LightAppearance = {
  muzzle: [13.1, 0, -1.94],
  hornTip: [-20.114286, 28.69, 34.614286],
  tailTip: [-11.6, 0, 4.7],
  draw(r, s, _card, variant) {
    const fur = variant === 'gold' ? gold : coat;
    legs(r, s, fur);
    torso(r, s, fur);
    chest(r, s, fur);
    face(r, s, fur);
    crown(r, s);
    finishSurfaces(
      r,
      s.body,
      [
        [coat, 'fur'],
        [gold, 'fur'],
        [honey, 'fur'],
        [umber, 'fur'],
        [ivory, 'fur'],
        [pearl, 'fur'],
        [bark, 'root'],
        [wood, 'root'],
        [leaf, 'moss'],
        [hoof, 'ivory'],
        [pupil, 'iris'],
        [iris, 'iris'],
        [amber, 'iris'],
      ],
      'skin',
    );
    r.tag = undefined;
  },
};
