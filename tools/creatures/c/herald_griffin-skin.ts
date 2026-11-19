import { flightFeather, furLock, stitchedStrap, strapBuckle } from '../bodies/kits/tailoring';
import { goalAt, toLocal } from '../bodies/goals';
import type { WingedSkeleton, Wing } from '../bodies/winged-dragon';
import type { CreatureCard } from '../bodies/card-data';
import type { Variant } from '../types';
import { hx } from '../kit/f11-mobkit';
import { F3, Rig, vadd, vcross, vlen, vlerp, vmul, vnorm, vsub, type V3, type Mat } from '../rig/f15-rig';
import { finishSurfaces } from './surface-work';

const pigment = (colors: string[]): Mat => ({ T: colors.map((c) => hx(c)) as Mat['T'] });
function colors(card: CreatureCard, gold: boolean) {
  const mat = (name: string, ...indices: number[]) =>
    pigment(indices.map((i) => card.materials.find((m) => m.name === name)!.tones[i]));
  const white = gold ? mat('gold', 1, 3, 4, 5) : mat('ivory', 2, 3, 4, 5);
  return {
    white,
    pearl: mat('ivory', 1, 2, 3, 4),
    cream: mat('ivory', 2, 3, 4, 5),
    lion: mat('ochre', 1, 2, 4, 5),
    amber: mat('ochre', 0, 1, 3, 4),
    chest: mat('ochre', 2, 3, 4, 5),
    slate: mat('slate', 0, 1, 2, 3),
    steel: mat('slate', 1, 2, 3, 4),
    ink: mat('slate', 0, 0, 1, 2),
    brass: mat('gold', 0, 2, 4, 5),
    bill: mat('gold', 1, 2, 3, 4),
    hide: mat('hide', 0, 1, 2, 3),
    flap: mat('hide', 1, 2, 3, 4),
    seam: mat('hide', 3, 4, 5, 5),
    wax: mat('wax', 0, 2, 3, 4),
    print: mat('wax', 2, 3, 4, 5),
  };
}
type Colors = ReturnType<typeof colors>;

function axisFrame(start: V3, end: V3, normal: V3): F3 {
  const axis = vnorm(vsub(end, start)),
    side = vnorm(vcross(normal, axis));
  return new F3(start, axis, side, vnorm(vcross(axis, side)));
}

// A shorter covert has a raised centre and two different vanes. The large
// primaries use the shared split-vane feather with a continuous central shaft.
function covert(r: Rig, a: V3, b: V3, n: V3, w: number, light: Mat, shade: Mat) {
  const f = axisFrame(a, b, n),
    len = vlen(vsub(b, a));
  const shoulder = f.p(len * 0.32, w, 0.1),
    short = f.p(len * 0.4, -w * 0.82, 0.2),
    mid = f.p(len * 0.4, 0, 1.05);
  r.poly([a, shoulder, mid], light);
  r.poly([shoulder, b, mid], light);
  r.poly([a, mid, short], shade);
  r.poly([mid, b, short], shade);
  r.line(f.p(len * 0.35, 0, 1), f.p(len * 0.85, 0, 0.4), light.T[2], 0, 0.35);
}
function wing(r: Rig, s: WingedSkeleton, w: Wing, c: Colors) {
  const sign = w.side,
    name = sign < 0 ? 'L' : 'R',
    b = s.body;
  const outward = b.v(0, sign, 0.32 + (s.pose.wingSpread ?? 0) * 0.85);
  r.tag = 'wing' + name;
  r.cap(w.shoulder, w.elbow, 5.8, 4.2, c.amber);
  r.cap(w.elbow, w.wrist, 4.7, 2.8, c.pearl);
  const first = w.quills[0],
    last = w.quills.at(-1)!;
  r.poly([w.shoulder, w.wrist, last.tip, first.tip], c.amber);
  r.tag = 'primaries' + name;
  for (let i = 0; i < w.quills.length; i++) {
    const q = w.quills[i],
      direct = axisFrame(q.root, q.tip, outward),
      distance = vlen(vsub(q.tip, q.root));
    if (distance < 0.001) continue;
    const width = Math.min(2.75 + (0.55 * i) / 6, distance);
    // The kit sweeps its rachis sideways by 0.42 of vane width. Counter-rotate
    // the feather so its actual final vertex coincides with the articulated tip.
    const sweep = Math.min(distance * 0.95, width * 0.42),
      len = Math.sqrt(distance * distance - sweep * sweep);
    const f = direct.turn(-Math.asin(sweep / distance));
    flightFeather(r, f, len, width, i % 2 ? c.slate : c.steel, c.slate, c.steel);
    const l = 0.68 + 0.035 * Math.sin(i);
    r.poly(
      [
        f.p(len * l, -width * 0.63, 0.55),
        f.p(len * (l - 0.025), width * 0.61, 0.55),
        f.p(len * (l + 0.075), width * 0.45, 0.55),
        f.p(len * (l + 0.12), -width * 0.54, 0.55),
      ],
      c.chest,
      0.5,
    );
  }
  r.tag = 'wing' + name;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 7 - layer; i++) {
      const u = (i + 0.3 * layer) / (6 - 0.4 * layer),
        q = w.quills[Math.min(6, i + Math.floor(layer / 2))];
      const root = vlerp(w.shoulder, w.wrist, u);
      const base = vadd(root, vmul(outward, 1.5 + layer * 0.85));
      const tip = vadd(vlerp(q.root, q.tip, [0.65, 0.4, 0.18][layer]), vmul(outward, 1.3 + layer * 0.85));
      covert(
        r,
        base,
        tip,
        outward,
        3.3 - layer * 0.3,
        [c.amber, c.lion, c.cream][layer],
        [c.lion, c.chest, c.pearl][layer],
      );
    }
  }
  covert(r, vadd(w.wrist, vmul(outward, 2)), vadd(w.elbow, vmul(outward, 2.5)), outward, 3, c.cream, c.pearl);
}

function feet(r: Rig, s: WingedSkeleton, c: Colors) {
  for (const leg of s.legs) {
    const { hip, knee, hock, foot, hoof, fore, side } = leg;
    r.tag = leg.name;
    if (fore < 0) {
      r.cap(hip, knee, 6.2, 3.55, c.lion);
      r.cap(knee, hock, 3.8, 2.1, c.lion);
      r.cap(hock, hoof.p(-0.4, 0, 2), 2.15, 2, c.chest);
      r.ell(hoof, [1, 0, 1.8], [3.7, 2.7, 2.05], c.lion);
      for (const n of [-1, 0, 1]) r.ell(hoof, [3.1 - 0.45 * Math.abs(n), 1.7 * n, 1.1], [1.9, 1, 1.24], c.chest);
      for (let i = 0; i < 4; i++) {
        const a = vadd(vlerp(hip, knee, (i + 0.4) / 5), s.body.v(-0.7, side * 3.05, -0.5));
        furLock(
          r,
          a,
          vadd(a, s.body.v(-2.2, side * 0.55, -3.7)),
          s.body.v(1.35, 0, 0),
          s.body.v(0, side * 0.65, 0),
          c.chest,
          c.lion,
        );
      }
    } else {
      r.cap(hip, knee, 4.9, 2.5, c.pearl);
      r.cap(knee, hock, 2.5, 1.55, c.bill);
      r.cap(hock, hoof.p(0.1, 0, 1.5), 1.6, 1.65, c.bill);
      for (let i = 1; i < 7; i++) {
        const a = vlerp(knee, hock, i / 7);
        r.cap(vadd(a, s.body.v(1.35, -1, 0)), vadd(a, s.body.v(1.35, 1, 0)), 0.48, 0.43, c.brass);
      }
      for (const k of [-1, 0, 1, 2]) {
        const back = k === 2,
          n = back ? 0 : k;
        const knuckle = hoof.p(back ? -2.4 : 3.7, back ? side * 0.75 : n * 2.35, 1.55);
        const nail = hoof.p(back ? -3.45 : 6.1 - Math.abs(n) * 0.35, back ? side : 3 * n, 1.28);
        const hook = hoof.p(back ? -3.7 : 6.45 - Math.abs(n) * 0.35, back ? side : 3.1 * n, -0.05);
        r.cap(hoof.p(0.1, n * 0.85, 1.65), knuckle, 1.28, 0.91, c.bill);
        r.cap(knuckle, nail, 0.94, 0.56, c.ink);
        r.cap(nail, hook, 0.57, 0.12, c.ink);
      }
    }
  }
}

function tail(r: Rig, s: WingedSkeleton, c: Colors) {
  const t = s.tail,
    pulse = s.pulse;
  const p = [
    t.o,
    t.p(-7, 1, -5),
    t.p(-10, 3.8 + 1.2 * pulse(0.33), -10),
    t.p(-15, 8.3 + 2 * pulse(0.66), -8),
    t.p(-16, 10.25 + 3 * pulse(0.93), -2),
    t.p(-16, 9.15 + 3.2 * pulse(1.16), 3),
  ];
  r.tag = 'tail';
  for (let i = 1; i < p.length; i++) r.cap(p[i - 1], p[i], 3.4 - i * 0.35, 3.12 - i * 0.35, c.lion);
  const root = p.at(-1)!,
    end = vadd(root, t.v(1.7, 1.4 * pulse(1.5), 7.6 + pulse(1.22)));
  r.tag = 'tailBrush';
  r.cap(root, end, 2.85, 1.3, c.hide);
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 * Math.PI) / 7;
    const start = vadd(root, t.v(2.4 * Math.cos(a), 1.85 * Math.sin(a), -0.6));
    const tip = vadd(end, t.v(2.6 * Math.cos(a), 2.65 * Math.sin(a), 2 * Math.cos(a + 1)));
    furLock(
      r,
      start,
      tip,
      t.v(-1.4 * Math.sin(a), 1.4 * Math.cos(a), 0),
      t.v(Math.cos(a), Math.sin(a), 2),
      c.slate,
      c.hide,
    );
  }
  s.points.tailTip = end;
}

function plumage(r: Rig, s: WingedSkeleton, c: Colors) {
  const a = s.neck.o,
    h = s.head,
    b = s.body;
  r.tag = 'neck';
  r.cap(a, h.o, 8.7, 6.3, c.pearl);
  const upright = vnorm(vsub(h.o, a)),
    across = b.s,
    forward = vnorm(vcross(across, upright));
  for (let k = 0; k < 3; k++) {
    const center = vlerp(a, h.o, k * 0.37 + 0.04),
      rad = 8.2 - k * 0.7;
    for (let i = 0; i < 10; i++) {
      const angle = ((i + 0.45 * (k % 2)) * 2 * Math.PI) / 10,
        ca = Math.cos(angle),
        sa = Math.sin(angle);
      const out = vadd(vmul(forward, ca), vmul(across, sa));
      const root = vadd(center, vmul(out, rad)),
        tip = vadd(vadd(root, vmul(out, 1.8)), vadd(vmul(upright, -7.5 + k * 0.15), b.v(-2, 0, -1)));
      covert(r, root, tip, out, 3.4, k === 0 ? c.chest : c.white, k === 0 ? c.amber : c.pearl);
    }
  }
}

function face(r: Rig, s: WingedSkeleton, c: Colors) {
  const h = s.head;
  r.tag = 'head';
  r.ell(h, [1.6, 0, 1.65], [8.9, 7.25, 7.8], c.white);
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R';
    r.tag = 'head';
    for (let i = 0; i < 4; i++) {
      const a = h.p(3 - i * 0.8, side * (5.55 - i * 0.4), 3.9 + i * 0.7);
      covert(
        r,
        a,
        h.p(-5 - i * 1.2, side * (6.9 - i * 0.53), -0.7 + i * 1.8),
        h.v(0, side, 0.25),
        2.2,
        c.white,
        c.pearl,
      );
    }
    r.tag = 'crest' + suffix;
    const origin = h.p(-1.2, side * 2.75, 7.1),
      middle = h.p(-5, side * 4.3, 12);
    const end = h.p(-14.6 + side * 0.6, side * 6.6, 14.1 + s.pulse(side > 0 ? 0.68 : 0.45) * 0.6);
    covert(r, origin, middle, h.v(0.15, side, 0.5), 3.4, c.white, c.pearl);
    covert(r, vlerp(origin, middle, 0.6), end, h.v(0.15, side, 0.5), 3.4, c.white, c.cream);
    covert(r, vlerp(middle, end, 0.58), end, h.v(0, side, 1), 1.65, c.steel, c.slate);
    r.tag = 'eye' + suffix;
    const start = r.size,
      open = !s.life.blink;
    const eye = h.p(5.4, side * 6.95, 5.0);
    r.ell(h, [5.4, side * 6.95, 5.0], [3.05, 1.45, open ? 3.0 : 0.44], c.ink);
    if (open) {
      r.ell(h, [5.75, side * 8.05, 5.65], [1.95, 0.9, 1.95], c.brass);
      r.ell(h, [6.05, side * 8.6, 6.2], [0.95, 0.76, 1.35], c.ink);
      r.dot(h.p(6.65, side * 9, 7.1), c.white.T[3], 0.1, 0.64);
    }
    r.markEye(start, side, open);
    if (side > 0) r.eye = eye;
    r.tag = 'head';
    r.cap(h.p(7.45, side * 6.85, 7.15), h.p(1.15, side * 6.5, 8.1), 0.67, 1.35, c.white);
  }
  r.tag = 'beak';
  const gape = s.pose.beakOpen ?? 0;
  const jaw = h.at(5, 0, -0.1).pitch(0.55 * gape);
  r.ell(jaw, [4.7, 0, 0], [6.45, 3.25, 1.52], c.ink);
  r.cap(jaw.p(2.9, 0, -0.8), jaw.p(11.2, 0, -0.55), 2.45, 0.55, c.bill);
  // The bridge narrows, then the cutting tip bends vertically below the mandible.
  r.ell(h, [9, 0, 2.75], [6.25, 4.55, 3.5], c.bill);
  r.cap(h.p(11.4, 0, 3.45), h.p(16.1, 0, 2.2), 3.2, 2.35, c.brass);
  r.cap(h.p(15.45, 0, 2.55), h.p(18.55, 0, -0.1), 2.46, 1.5, c.slate);
  r.cap(h.p(18.55, 0, -0.1), s.points.beak, 1.53, 0.19, c.ink);
  for (const side of [-1, 1]) r.ell(h, [10.5, side * 3.85, 4.05], [1.2, 0.47, 0.74], c.hide);
}

function harness(r: Rig, s: WingedSkeleton, c: Colors) {
  const b = s.body;
  r.tag = 'harness';
  for (const sign of [-1, 1]) {
    const along = b.v(0.3, 0, 1.45);
    const band = [
      b.p(-8, sign * 6.6, 7.3),
      b.p(-0.6, sign * 8.35, 6.25),
      b.p(7, sign * 9.45, 5.4),
      b.p(12, sign * 9.65, 3.45),
      b.p(16.5, sign * 7.7, 0.1),
      b.p(19.25, sign * 3.5, -2),
      b.p(19.3, 0, -2.65),
    ];
    stitchedStrap(r, band, along, c.hide, c.seam);
  }
  strapBuckle(r, b.at(20, 0, -2), 5.5, 4.65, c.brass, c.hide);
  const swing = 0.095 * s.pulse(0.92) + (s.pose.bagSwing ?? 0) * 0.3;
  const bag = b
    .at(2.65, 11.75, -3.75)
    .turn(Math.PI / 2)
    .pitch(0.05)
    .roll(swing);
  r.tag = 'bag';
  // Local forward is out through the bag's front. Its gusset is a saddle-shaped box.
  const outline = [
    [-6.5, 4.9],
    [6.5, 4.9],
    [7, -3.9],
    [5.5, -6.5],
    [-5.25, -6.5],
    [-6.75, -4.6],
  ];
  const face = outline.map(([x, z]) => bag.p(2.7, x, z)),
    back = outline.map(([x, z]) => bag.p(-1.85, x, z + 0.55));
  r.poly(back, c.hide);
  r.poly(face, c.flap);
  for (let i = 0; i < face.length; i++) {
    const n = (i + 1) % face.length;
    r.poly([face[i], face[n], back[n], back[i]], c.hide);
    if (i > 0) {
      r.cap(face[i], face[n], 0.48, 0.48, c.seam);
      r.line(vlerp(face[i], face[n], 0.22), vlerp(face[i], face[n], 0.68), c.seam.T[3], 0, 0.45);
    }
  }
  const open = s.pose.bagOpen ?? 0;
  r.tag = 'letter';
  for (let j = 0; j < 3; j++) {
    const outer = j === 2;
    const paper = bag
      .at(outer ? 2.15 : -0.8 + j * 0.52, outer ? -2.55 : 1 - j * 0.65, 4.6 + 0.6 * j + open * 2)
      .pitch(outer ? -0.22 : 0)
      .roll(outer ? 0.24 : -0.19 + 0.16 * j);
    const top = outer ? 5.25 : 2.5;
    const corners = [paper.p(0, -4.6, -1.8), paper.p(0, 4.6, -1.8), paper.p(0, 4.6, top), paper.p(0, -4.6, top)];
    r.poly(corners, outer ? c.white : c.pearl);
    r.line(corners[2], paper.p(0.15, -0.2, 0.65), c.hide.T[1], 0, 0.66);
    r.line(corners[3], paper.p(0.15, -0.2, 0.65), c.hide.T[1], 0, 0.66);
    if (outer) {
      r.poly([paper.p(0.15, -4.6, top), paper.p(0.15, -1.9, top - 0.3), paper.p(0.2, -4.1, top - 2.4)], c.cream);
      s.points.letter = paper.p(0.15, 0, top - 0.3);
    }
  }
  r.tag = 'bag';
  const flap = bag.at(3.1, 0, 4).pitch(-1.1 * open);
  const corners = [
    flap.p(0, -6.25, 0.5),
    flap.p(0, 6.25, 0.5),
    flap.p(0.25, 5.8, -2.8),
    flap.p(0.45, 0, -5.5),
    flap.p(0.25, -5.8, -2.8),
  ];
  r.poly(corners, c.hide);
  for (let i = 1; i < 4; i++) r.line(corners[i], corners[i + 1], c.seam.T[2], 0, 0.55);
  r.tag = 'seal';
  const seal = flap.at(0.7, -0.55, -3.8);
  r.ell(seal, [0.15, 0, 0], [1.1, 2.95, 2.85], c.wax);
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    r.ell(seal, [0.5, 2.3 * Math.cos(a), 2.05 * Math.sin(a)], [0.5, 0.85, 0.81], c.wax);
  }
  r.line(seal.p(1.35, -1.5, -1), seal.p(1.35, 1.4, 1.2), c.print.T[3], 0, 0.6);
  r.line(seal.p(1.4, -0.4, -0.3), seal.p(1.4, 0.2, 1.15), c.print.T[3], 0, 0.55);
  s.points.seal = seal.p(1.45, 0, 0);
  s.points.bag = bag.o;
  r.tag = 'stamp';
  const tether = bag.p(2.3, -6.2, 3.85);
  const defaultEnd = bag.p(3.45, -7.8 + s.pulse(1.25) * 0.9, -4.6 + 8 * (s.pose.stampLift ?? 0));
  const aim = goalAt(s.pose, 'stamp', toLocal(s.facing, defaultEnd));
  const end = aim ? s.facing.p(...aim) : defaultEnd;
  const grip = vadd(end, b.v(0, 0, 4.3)),
    loose = vadd(vlerp(tether, grip, 0.48), b.v(0.7, 1.2, -1.8));
  r.cap(tether, loose, 0.42, 0.4, c.brass);
  r.cap(loose, grip, 0.41, 0.44, c.brass);
  r.ball(grip, 1.1, c.flap);
  r.cap(grip, vadd(end, b.v(0, 0, 0.95)), 0.75, 0.9, c.brass);
  r.ell(new F3(end, b.f, b.s, b.u), [0, 0, 0.47], [1.7, 1.55, 0.67], c.brass);
  s.points.stamp = end;
}

export function drawGriffin(r: Rig, s: WingedSkeleton, card: CreatureCard, variant: Variant) {
  const c = colors(card, variant === 'gold'),
    b = s.body;
  r.tag = 'torso';
  r.ell(b, [-4, 0, -0.3], [18, 8.25, 8.75], c.lion);
  r.ell(b, [-13.3, 0, 1], [8.9, 8.5, 8.9], c.lion);
  r.tag = 'chest';
  r.ell(b, [9.65, 0, 1.6], [10.4, 9.2, 12], c.chest);
  for (const sign of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const a = b.p(-14 + i * 2.7, sign * 7.7, 3.9 + 0.7 * Math.cos(i));
      furLock(
        r,
        a,
        vadd(a, b.v(-2.5, sign * 0.5, -3.85)),
        b.v(1.3, 0, 0.7),
        b.v(-0.6, sign * 0.8, -0.4),
        c.lion,
        c.amber,
      );
    }
  feet(r, s, c);
  tail(r, s, c);
  plumage(r, s, c);
  for (const w of s.wings) wing(r, s, w, c);
  harness(r, s, c);
  face(r, s, c);
  finishSurfaces(
    r,
    s.root,
    [
      [c.lion, 'fur'],
      [c.amber, 'fur'],
      [c.chest, 'fur'],
      [c.hide, 'strap'],
      [c.flap, 'strap'],
      [c.white, 'skin'],
      [c.brass, 'lacquer'],
      [c.wax, 'lacquer'],
    ],
    'ivory',
  );
}
