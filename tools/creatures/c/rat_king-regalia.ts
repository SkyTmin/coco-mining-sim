// Original wear, enamel, fur and heraldry for the first-floor king.
import { tn } from '../kit/f11-mobkit';
import { F3, Rig, type Mat, type V3, vadd, vlerp } from '../rig/f15-rig';
const dye = (a: string, b: string, c: string, d: string): Mat => ({ T: tn(a, b, c, d) });
export const fur = dye('#2c2329', '#443335', '#675149', '#8c7060');
export const tuft = dye('#33282c', '#503e3c', '#755c50', '#a48971');
export const smoke = dye('#241e24', '#352b30', '#4a393c', '#67504b');
export const snout = dye('#4c3838', '#735753', '#a4806e', '#c6a38c');
export const skin = dye('#51363d', '#88585a', '#af7770', '#d79c88');
export const velvet = dye('#391d2b', '#672837', '#963a45', '#be5c53');
export const fold = dye('#2e1c29', '#4b2131', '#732c3d', '#a9474c');
export const pale = dye('#665547', '#96816d', '#d5bea1', '#f3e0bd');
export const brass = dye('#64432d', '#ab7133', '#ddaa50', '#ffe294');
export const darkGold = dye('#4e3428', '#82512d', '#b77e38', '#e0ae5b');
export const stone = dye('#382e30', '#514039', '#79614d', '#a38969');
export const steel = dye('#33343f', '#59606b', '#87929b', '#c6caca');
export const edge = dye('#53606b', '#8c979d', '#b7bebe', '#e7e9df');
export const ruby = dye('#532a37', '#8e3543', '#c85650', '#ff9e77');
export const amber = dye('#814c2e', '#c48336', '#f5c25d', '#ffec9a');
export const ink = dye('#1e1a20', '#282128', '#393037', '#463941');

export function crown(r: Rig, c: F3, radius: number, height: number) {
  const n = 10;
  const pos = (i: number, rad: number, z: number) =>
    c.p(Math.cos((i * 2 * Math.PI) / n) * rad, Math.sin((i * 2 * Math.PI) / n) * rad * 0.88, z);
  r.tag = 'crown';
  r.ell(c, [0, 0, 1.75], [radius * 0.91, radius * 0.8, 1.45], fold);
  for (let i = 0; i < n; i++) {
    const a = i - 0.5,
      b = i + 0.5;
    r.poly(
      [pos(a, radius - 0.3, -2.15), pos(b, radius - 0.3, -2.15), pos(b, radius, 3), pos(a, radius, 3)],
      brass,
    );
    r.cap(pos(a, radius + 0.1, -1.7), pos(b, radius + 0.1, -1.7), 0.68, 0.68, darkGold);
    r.cap(pos(a, radius + 0.1, 2.7), pos(b, radius + 0.1, 2.7), 0.63, 0.63, brass);
    const h = height * (i % 2 ? 0.88 : 1),
      w = i % 2 ? 0.29 : 0.34;
    r.poly(
      [pos(i - w, radius, 3), pos(i + w, radius, 3), pos(i + w, radius + 0.4, h), pos(i - w, radius + 0.4, h)],
      brass,
    );
    r.poly(
      [
        pos(i + w, radius, 3),
        pos(i + w, radius - 1.35, 3),
        pos(i + w, radius - 1.1, h),
        pos(i + w, radius + 0.4, h),
      ],
      darkGold,
    );
    r.poly(
      [
        pos(i - w, radius + 0.4, h),
        pos(i + w, radius + 0.4, h),
        pos(i + w, radius - 1.1, h),
        pos(i - w, radius - 1.1, h),
      ],
      brass,
    );
    r.line(pos(i - w, radius + 0.48, 3.6), pos(i - w, radius + 0.5, h - 0.5), brass.T[2], 0, 0.85);
    r.dot(pos(i, radius + 0.27, 0.35), brass.T[3], 0, 1, 0.92);
  }
  const gem = c.at(radius, 0, 2);
  r.ell(gem, [0.15, 0, 0], [1.25, 2.8, 3], darkGold);
  r.ell(gem, [1, 0, 0.12], [1.3, 1.95, 2.1], ruby);
  r.dot(gem.p(1.9, -0.45, 0.9), ruby.T[3], 0, 1);
}
export function head(
  r: Rig,
  h: F3,
  jaw: number,
  blink: number,
  ear: number,
  whisk: number,
  j: Record<string, V3>,
) {
  r.tag = 'head';
  r.ell(h, [-1, 0, 0], [12.3, 10.2, 10.4], fur);
  r.ell(h, [7, 0, -1.2], [9.4, 7.7, 6.5], tuft);
  const lower = h.at(8, 0, -2.7).pitch(0.12 + jaw * 0.63);
  r.ell(lower, [4.4, 0, -0.9], [8.6, 5.1, 2.9], smoke);
  r.ell(lower, [6.7, 0, 0.65], [6.1, 4.25, 1.33], skin);
  r.ell(h, [12, 0, -0.8], [8.4, 5.5, 3.65], snout);
  r.tag = 'nose';
  r.ell(h, [19.1, 0, -0.9], [2.55, 3.05, 2.1], skin);
  r.ell(h, [21.55, 0, -0.12], [2.7, 2.85, 2.04], ink);
  r.dot(h.p(23.0, -0.2, 1.29), snout.T[2]);
  for (const s of [-1, 1]) {
    const label = s < 0 ? 'L' : 'R';
    const e = h.at(-5.7, s * 8.45, 5.9).roll(s * (-0.19 + ear * 0.34));
    r.tag = 'ear' + label;
    r.ell(e, [0, 0, 0], [4.45, 2.45, 6.35], smoke);
    r.ell(e, [0.25, s * 0.55, 0.28], [4.0, 2.36, 5.89], skin);
    r.ell(e, [0.38, s * 1.7, 0.46], [2.66, 1.66, 4.16], ruby);
    r.cap(e.p(-1, s * 2.92, -0.7), e.p(0.9, s * 3.08, 1.7), 0.83, 0.45, skin);
    if (s > 0) {
      r.poly([e.p(-2.5, s * 1.7, 4.16), e.p(-1.0, s * 2.1, 3.9), e.p(-1.8, s * 1.45, 5.75)], smoke);
      r.cap(e.p(-1.8, s * 2.4, -3.1), e.p(-1, s * 2.8, -4.25), 1.1, 0.8, brass);
    }
    r.tag = 'head';
    // Broad cheek planes divide into hanging, individually tapered rat guard hairs.
    r.ell(h, [3.3, s * 6.65, -2], [7.65, 4.5, 6.65], fur);
    for (let k = 0; k < 7; k++) {
      const x = 5.6 - k * 1.75,
        y = s * (9.85 - 0.065 * (k - 3) ** 2),
        z = -2.2 + Math.sin(k * 0.83) * 1.5;
      r.cap(
        h.p(x, y, z),
        h.p(x - 3.1, y + s * (0.4 + k * 0.18), z - 4.4 - (k % 3) * 0.9),
        1.45,
        0.2,
        k % 3 ? tuft : smoke,
      );
    }
    const socket = h.at(8.8, s * 8.02, 3.9).turn(s * 0.37);
    const start = r.size;
    r.tag = 'eye' + label;
    if (blink >= 0.65) {
      // A furred eyelid closes over the amber cornea. The short, dark lash
      // joins the corners even in backlight; the iris emits no sleeping glint.
      r.ell(socket, [0, 0.12 * s, 0], [3.96, 1.78, 2.3], tuft);
      r.ell(socket, [0.42, s * 1.07, -0.24], [3.12, 1.42, 1.27], fur);
      r.line(socket.p(-2.02, s * 2.19, 0.03), socket.p(0.38, s * 2.55, -0.49), ink.T[0], 0, 0.75);
      r.line(socket.p(0.38, s * 2.55, -0.49), socket.p(2.54, s * 2.04, -0.19), ink.T[0], 0, 0.75);
    } else {
      r.ell(socket, [0, 0, 0], [3.94, 1.73, 2.35], ink);
      r.ell(socket, [0.51, s * 1.37, -0.21], [3.0, 1.55, 1.73 * (1 - blink)], amber);
      r.ell(socket, [1.0, s * 2.58, 0.47], [1.03, 0.88, 1.15 * (1 - blink)], ink);
      r.dot(socket.p(0.95, s * 3.11, 0.8), ink.T[0], 0, 0.94, 1.0);
      r.dot(socket.p(0.38, s * 2.93, 1.29), pale.T[3], 0.08, 0.68, 0.95);
    }
    r.markEye(start, s, blink < 0.6);
    j['eye' + label] = socket.p(0.68, s * 2.5, 0.4);
    r.tag = 'head';
    r.cap(socket.p(-3.65, s * 1.0, 2.95), socket.p(3.1, s * 1.1, 1.63 + 0.54 * (1 - blink)), 1.53, 0.72, tuft);
    r.cap(h.p(9.4, s * 4.0, 3.28), h.p(16.4, s * 2.7, 1.6), 1.1, 0.3, snout);
    r.ell(h, [15.1, s * 3, -2.2], [4.1, 3.2, 2.45], pale);
    r.cap(h.p(18.7, s * 2.25, -2.4), h.p(18.08, s * 2.36, -6.24), 1.41, 0.88, pale);
    r.line(h.p(19.41, s * 2.54, -3.4), h.p(18.7, s * 2.54, -5.6), pale.T[3], 0, 0.72);
    for (let k = 0; k < 3; k++) {
      const base = h.p(15.4 + k * 0.7, s * (4.8 - 0.3 * k), -1.85 - 0.64 * k);
      const mid = vadd(base, h.v(0.65 + k, s * (2.9 + k * 0.82), 1.95 - k * 1.66));
      const end = vadd(mid, h.v(0.9 + k * 0.73, s * (s < 0 ? 1.3 : 3.3 + k), 1.45 - k * 1.16 + whisk));
      r.dot(base, smoke.T[0], 0, 1);
      r.line(base, mid, s === 1 ? pale.T[1] : snout.T[1], 0, 0.6);
      r.line(mid, end, s === 1 ? pale.T[2] : snout.T[2], 0, 0.6);
    }
    r.dot(h.p(20.9, s * 1.83, -0.92), skin.T[0]);
  }
  j.head = h.o;
  // The nape landmark is the pivot at the back of the skull where the ear
  // meets the ermine ruff. The muzzle and orbital sockets remain independent.
  j.nape = h.p(-7.4, 2.3, 3.2);
  j.mouth = lower.p(11, 0.1, 0.9);
  j.eye = j.eyeR;
  r.eye = blink < 0.65 ? j.eyeR : null;
  const c = h.at(-2.15, 0, 8.55).pitch(-0.07);
  crown(r, c, 10.25, 9.5);
  j.crown = c.p(0, 0, 9.2);
}
// Circular cloak panels hang from both shoulders, open at the front.
// Every stitch follows the same two physical borders as the velvet panel.
export function robe(r: Rig, b: F3, wave: number, flare: number, royal: Mat, chainSwing: number, gather: number) {
  const n = 14;
  const ring = (i: number, layer: number) => {
    const opening = 0.6 + gather * 0.2 * layer;
    const a = opening + (i / n) * (2 * Math.PI - 2 * opening),
      co = Math.cos(a),
      si = Math.sin(a);
    const foldR = (i % 2 ? 1.35 : -0.55) * layer;
    const sweep = layer * (1 + 0.52 * layer) * wave;
    const tilt = layer * layer * flare;
    const rear = (1 - co) * 0.5;
    return b.p(
      co * (12.5 + layer * (2.5 + rear * 7.6) + foldR) - 2.5 - tilt * rear,
      si * (15.8 + layer * 1.52 + foldR) + sweep * 0.58,
      -layer * (14.9 + rear * 2.1) +
        15.4 +
        tilt * 0.52 -
        (i % 3 === 0 ? 2.55 : 0) * layer +
        gather * layer * (1.0 + 2.8 * Math.max(0, co)),
    );
  };
  r.tag = 'cape';
  for (let i = 0; i < n; i++) {
    const lo = ring(i, 2),
      hi = ring(i + 1, 2);
    for (let l = 0; l < 2; l++)
      r.poly([ring(i, l), ring(i + 1, l), ring(i + 1, l + 1), ring(i, l + 1)], i % 2 ? royal : fold);
    r.cap(lo, hi, 0.81, 0.81, darkGold);
    const A = vlerp(lo, ring(i, 1), 0.21),
      B = vlerp(hi, ring(i + 1, 1), 0.21);
    r.line(A, B, brass.T[2], 0, 1.1);
    const M = vlerp(A, B, 0.54);
    r.line(vlerp(lo, A, 0.36), M, brass.T[2], 0, 0.96);
    r.line(M, vlerp(hi, B, 0.36), brass.T[1], 0, 0.96);
    if (i % 3 === 1) {
      r.cap(vlerp(lo, hi, 0.4), vadd(vlerp(lo, hi, 0.4), b.v(-0.5, 0, -2.4)), 0.8, 0.25, brass);
    }
    // Two interlaced chevrons on the border, a glint per needle entry.
    const A2 = vlerp(lo, ring(i, 1), 0.31),
      B2 = vlerp(hi, ring(i + 1, 1), 0.31);
    r.line(A2, vlerp(A, B, 0.48), darkGold.T[2], 0, 0.92);
    r.line(vlerp(A, B, 0.48), B2, darkGold.T[2], 0, 0.92);
    r.dot(vlerp(A, B, 0.55), brass.T[3], 0, 0.74, 0.94);
    if (i % 2 === 0) r.line(ring(i, 0), ring(i, 1), velvet.T[2], 0, 0.85);
  }
  // The spotted ermine collar sits over the attachment of the velvet.
  r.tag = 'ruff';
  for (let i = 0; i < 21; i++) {
    const a = 0.69 + (i * (2 * Math.PI - 1.38)) / 20,
      co = Math.cos(a),
      si = Math.sin(a);
    const f = b.at(-2.25 + co * 12, si * 14.85, 14.05 + co * 0.55).turn(a);
    r.ell(f, [0, 0, 0], [3.8, 3.8, 3.25], pale);
    r.cap(f.p(1.15, 0, -0.4), f.p(4.65, 0.42, -5.7 - 1.55 * Math.sin(i * 2.2)), 2.35, 0.32, pale);
    if (i % 3 !== 1) r.cap(f.p(3.4, 0.45, -3.55), f.p(4.43, 0.74, -5.15), 0.78, 0.21, smoke);
  }
  r.tag = 'chain';
  let previous: V3 | undefined;
  for (let i = 0; i < 9; i++) {
    const a = i / 8,
      ang = (a - 0.5) * 1.14,
      sag = Math.sin(a * Math.PI);
    const f = b.at(
      10.5 + (3.9 + 4.8 * chainSwing) * sag,
      Math.sin(ang) * 19.5,
      15.5 - (5 + 3.4 * chainSwing) * sag,
    );
    if (previous) r.cap(previous, f.o, 0.46, 0.45, darkGold);
    previous = f.o;
    r.ell(f, [0, 0, 0], [1.3, 1.65, i % 2 ? 0.7 : 1.15], brass);
    r.dot(f.p(0.95, 0, 0.33), darkGold.T[0], 0, 0.7, 0.83);
  }
}
