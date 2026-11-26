import { screenPoint, sprite } from '../engine';
import { F3, Rig } from '../rig/f15-rig';
import { pointsOnlyActive, projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { BodyFrame, Creature, XY } from '../types';
import { beast } from './threshold_keeper-beast';
import { card, brass, deep, glint, ink, milk, mint, wood, type Marks } from './threshold_keeper-craft';
import { house } from './threshold_keeper-house';
import { exit, home, drawer, lock, mix, span, pose, ease, clips } from './threshold_keeper-score';
import { city } from './threshold_keeper-stage';

const pad = 18,
  W = 256 + 2 * pad,
  H = 208 + 2 * pad,
  anchor: XY = [home[0] + pad, home[1] + pad];
const raster = (r: Rig, j: Marks) => {
  scaleFigure(r, j, 1.115);
  return projectFigure(r, 160, [80, 131], j, '#28283a', 4.8, true);
};
function locate(fr: BodyFrame, x: number, lift: number, s: number) {
  fr.dx = x;
  fr.dy = -lift;
  fr.sx = fr.sy = s;
  return fr;
}
function field(fr: BodyFrame, k: string) {
  return screenPoint(fr, fr.points[k], home);
}
function positionHouse(F: F3, p: ReturnType<typeof pose>) {
  return F.at(-19, 7, 55 - (p.low || 0) * 5.3 + (p.bounce || 0) + (p.breathe || 0) * 0.9)
    .turn(0.23)
    .roll((p.trail || 0) * 0.019);
}
/** Two apertures share one cross-section. A source pixel belongs to exactly one room. */
function parted(
  a: BodyFrame,
  b: BodyFrame,
  door: XY,
  exitOnly: boolean,
  hidden: boolean,
  reveal: boolean,
  opened: number,
): BodyFrame {
  const destination = new Px(W, H),
    clip: [number, number, number, number] = [0, 0, W, H];
  const shift: XY = [exit[0] - door[0], exit[1] - door[1]];
  const squeeze = (v: XY): XY => {
    if (!reveal && !exitOnly) return v;
    const influence = 1 - ease(0, 34, Math.abs(v[0] - door[0]));
    const top = door[1] - 25,
      bottom = door[1] + 15;
    const y =
      v[1] < top
        ? top - 2 * Math.tanh((top - v[1]) / 12)
        : v[1] > bottom
          ? bottom + 2 * Math.tanh((v[1] - bottom) / 12)
          : v[1];
    return [v[0], mix(v[1], y, influence)];
  };
  const wrap = (v: XY): XY => {
    const q = squeeze(v);
    return exitOnly ? [q[0] + shift[0], q[1] + shift[1]] : q;
  };
  function paint(target: Px, houseImage: Px | null | undefined, beastImage: Px | null | undefined) {
    if (houseImage) sprite(target, houseImage, b, anchor, clip);
    if (hidden || !beastImage) return;
    if (!exitOnly && !reveal) {
      sprite(target, beastImage, a, anchor, clip);
      return;
    }
    const [left, top] = screenPoint(a, [0, 0], home),
      src = new Uint32Array(beastImage.data.buffer),
      dest = new Uint32Array(target.data.buffer);
    for (let x = 0; x < beastImage.w; x++) {
      const X = left + x;
      if (exitOnly ? X >= door[0] : X < door[0]) continue;
      const xx = Math.round(X + (exitOnly ? shift[0] : 0) + pad);
      if (xx < 0 || xx >= W) continue;
      for (let y = 0; y < beastImage.h; y++) {
        const ink = src[y * beastImage.w + x];
        if (!ink) continue;
        const Y = Math.round(squeeze([X, y + top])[1] + (exitOnly ? shift[1] : 0) + pad);
        if (Y >= 0 && Y < H) dest[Y * W + xx] = ink;
      }
    }
    if (reveal && opened > 0.1 && target === destination) {
      // Reveal the resisting near jamb: the changing silhouette passes under the arch and over the sill.
      const x = Math.round(door[0] + pad),
        y = door[1] + pad;
      target.line(x - 1, y - 26, x - 1, y + 14, wood.T[0]);
      target.line(x - 2, y - 24, x - 2, y + 13, brass.T[2]);
      target.line(x - 2, y - 26, x + 3, y - 29, glint);
      target.line(x - 2, y + 14, x + 3, y + 14, brass.T[2]);
    }
  }
  let lit: Px | null = null;
  if (!pointsOnlyActive()) {
    paint(destination, b.px, a.px);
    if (b.lit || a.lit) {
      lit = new Px(W, H);
      paint(lit, b.lit, a.lit);
    }
  }
  const pts: Record<string, XY> = {};
  for (const k of Object.keys(a.points)) {
    const v = wrap(field(a, k));
    pts[k] = [v[0] + pad, v[1] + pad];
  }
  for (const k of Object.keys(b.points)) {
    const v = field(b, k);
    pts[k] = [v[0] + pad, v[1] + pad];
  }
  const eye = a.eye && !hidden ? wrap(screenPoint(a, a.eye, home)) : null;
  return {
    px: destination,
    lit,
    anchor,
    eye: eye ? [eye[0] + pad, eye[1] + pad] : null,
    points: pts,
    primitives: a.primitives + b.primitives,
    rig: a.rig,
    joints: { ...b.joints, ...a.joints },
  };
}
function rail(fr: BodyFrame) {
  if (pointsOnlyActive()) return;
  const fore = new Px(fr.px.w, fr.px.h);
  const [left, top] = screenPoint(fr, [0, 0], home),
    s = fr.sx ?? 1;
  if (left >= 3 && top >= 3 && left + fr.px.w * s <= 253 && top + fr.px.h * s <= 205) return;
  const from = new Uint32Array(fr.px.data.buffer),
    to = new Uint32Array(fore.data.buffer);
  let any = false;
  for (let y = 0; y < fore.h; y++)
    for (let x = 0; x < fore.w; x++) {
      const i = y * fore.w + x;
      if (!from[i]) continue;
      const X = left + x * s,
        Y = top + y * s;
      if (X <= 2 || X >= 253 || Y <= 2 || Y >= 205) {
        to[i] = from[i];
        any = true;
      }
    }
  if (any) fr.over = fore;
}
function atField(fr: BodyFrame): BodyFrame {
  if (fr.anchor === anchor) return fr;
  const px = new Px(W, H),
    lit = fr.lit ? new Px(W, H) : null;
  if (!pointsOnlyActive()) {
    sprite(px, fr.px, fr, anchor, [0, 0, W, H]);
    if (lit && fr.lit) sprite(lit, fr.lit, fr, anchor, [0, 0, W, H]);
  }
  const point = (v: XY) => screenPoint(fr, v, anchor);
  return {
    ...fr,
    px,
    lit,
    anchor,
    points: Object.fromEntries(Object.entries(fr.points).map(([k, v]) => [k, point(v)])),
    eye: fr.eye ? point(fr.eye) : null,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: 1,
  };
}
function lightOnFrame(fr: BodyFrame, anim: string, n: number) {
  if (pointsOnlyActive()) return;
  const aperture = anim === 'trick',
    opening = aperture ? pose(anim, n).portal || 0 : span(n, 65, 84, 158, 178);
  if (opening < 0.01) return;
  const fore = new Px(W, H),
    x = exit[0] + pad,
    y = exit[1] + pad;
  if (aperture) {
    // The visible cut in the metal is behind the emerging nose. Its near hinge stays in front.
    const w = 14 * opening,
      h = 31 * opening;
    // The brass stile is in the frame. The warm rear wall is lit by the same diamond window as the cottage.
    for (let k = 0; k < 2 * w; k++) {
      const u = k / w - 1,
        up = h * (1 - 0.22 * u * u),
        X = x - w + k;
      fore.line(X, y - up, X, y + 18 * opening, k < 4 ? deep.T[0] : k % 6 < 2 ? wood.T[0] : wood.T[1]);
      fore.set(X, y - up, glint);
      fore.set(X, y + 17 * opening, brass.T[2]);
    }
    fore.line(x - w + 2, y - 14 * opening, x - w + 2, y + 17 * opening, brass.T[2]);
    if (opening > 0.5)
      for (let k = -4; k <= 4; k++) {
        const h = 5 - Math.abs(k);
        fore.line(x - 5 + k, y - 9 - h, x - 5 + k, y - 9 + h, k === 0 ? brass.T[2] : k < 0 ? glint : milk);
      }
  } else {
    const time = (n - 65) * 3;
    for (let s = 0; s < 2 * (W + H); s++) {
      const d = (((s - time) % (W + H)) + (W + H)) % (W + H);
      if (d > 64 * opening || s % 5 === 4) continue;
      const [u, v] =
        s < W ? [s, 8] : s < W + H ? [W - 9, s - W] : s < 2 * W + H ? [2 * W + H - s, H - 9] : [8, 2 * (W + H) - s];
      fore.set(u, v, d < 13 ? milk : glint);
      if (s % 11 === 0) fore.set(u + 1, v + 1, mint);
    }
  }
  if (fr.over) {
    const from = new Uint32Array(fr.over.data.buffer),
      to = new Uint32Array(fore.data.buffer);
    for (let i = 0; i < from.length; i++) if (from[i]) to[i] = from[i];
  }
  if (aperture) fore.line(x + 2, y - 27 * opening, x + 2, y + 17 * opening, glint);
  fr.over = fore;
}
function openDrawer(fr: BodyFrame, n: number) {
  if (pointsOnlyActive()) return;
  const u = pose('trick_b-f2', n).drawer || 0;
  if (u <= 0) return;
  const layer = fr.over ?? new Px(W, H),
    y = drawer[1] + pad,
    x = pad + 252;
  const end = x + 7,
    lip = Math.round(x + 5 - 41 * u);
  // Only the front apron is above the paws. The back, inner floor and the carried map stay visible.
  layer.rect(lip, y + 6, end, y + 12, ink);
  layer.rect(lip + 1, y + 7, end - 1, y + 11, wood.T[1]);
  layer.line(lip + 1, y + 6, end, y + 6, glint);
  layer.line(lip + 2, y + 11, end, y + 11, brass.T[2]);
  for (let X = lip + 4; X < end; X += 7) layer.set(X, y + 9, milk);
  if (u > 0.5) {
    layer.line(lip + 12, y + 8, lip + 17, y + 8, ink);
    layer.line(lip + 12, y + 9, lip + 17, y + 9, brass.T[3]);
  }
  fr.over = layer;
}
export const figure: Creature['frame'] = (anim, t, side, variant) => {
  const n = t * 24,
    p = pose(anim, n),
    past = pose(anim, Math.max(0, n - 3));
  const floor = p.floor ?? home[1] - (p.lift || 0);
  p.farEar = past.ear || 0;
  p.trail = (p.swing || 0) * 0.38 + (p.low || 0) - (past.low || 0);
  if (p.footCycle !== undefined) p.trail += (p.heading || 0) * 0.22 * Math.sin(p.footCycle * Math.PI * 2 - 0.4);
  if (p.floor !== undefined) {
    // Each back foot takes its own short step as the shoulders turn around the planted pair.
    const pivotWindows: Record<string, number[][]> = {
      trick: [
        [39, 54],
        [202, 220],
      ],
      trick_b: [
        [39, 52],
        [76, 89],
        [130, 144],
        [183, 196],
        [207, 219],
      ],
      'trick-f2': [
        [12, 29],
        [87, 100],
        [141, 153],
        [173, 190],
      ],
      'trick_b-f2': [
        [166, 178],
        [209, 224],
      ],
      show: [
        [96, 110],
        [135, 153],
      ],
      peek: [
        [4, 18],
        [61, 79],
      ],
    };
    const pivot = pivotWindows[anim]?.find(([a, b]) => n >= a && n <= b);
    if (pivot) {
      const [a, b] = pivot,
        u = (n - a) / (b - a),
        start = pose(anim, a).yaw || 0,
        end = pose(anim, b).yaw || 0;
      for (const side of ['L', 'R']) {
        const t = side === 'L' ? ease(0, 0.67, u) : ease(0.33, 1, u);
        p['pivot' + side] = mix(start, end, t) - (p.yaw || 0);
        p['sole' + side] = 3.3 * Math.sin(Math.PI * t);
      }
    }
    p.breathe =
      0.39 *
      Math.sin((n * Math.PI) / 30) *
      span(n, 0, 8, (clips[anim]?.seconds || 1) * 24 - 9, (clips[anim]?.seconds || 1) * 24 - 1);
    for (const cue of [23, 108, 184]) if (n > cue && n < cue + 6) p.shut = 0.88 * Math.sin(((n - cue) * Math.PI) / 6);
  }
  p.atX = home[0] + (p.x || 0);
  p.atY = floor;
  if (anim === 'trick_b' && p.handle) {
    p.goalR = p.handle;
    p.goalRX = 117;
    p.goalRY = 148 + 7 * p.handle;
    p.palmDepthR = 6;
  }
  if (anim === 'trick_b' && n >= 111) {
    const take = span(n, 111, 119, 127, 140),
      carry = span(n, 123, 138, 169, 182),
      file = span(n, 169, 181, 187, 196);
    const side = Math.cos(0.98 + (p.yaw || 0)),
      grip = Math.max(take, carry, file);
    if (grip) {
      const handX = p.atX + side * 25,
        handY = p.atY + 1;
      const first = ease(126, 139, n),
        second = ease(169, 181, n);
      p.goalR = grip;
      p.goalRX = mix(mix(228, handX, first), 125, second);
      p.goalRY = mix(mix(135, handY, first), 149, second);
    }
  }
  if (anim === 'phase' || anim === 'happy-f2' || anim === 'fidget_a') {
    const r = p.ring || 0;
    p.goalL = r;
    p.goalLX = 143 - 3 * r;
    p.goalLY = 150 + 12 * r;
    p.palmDepthL = 8;
  }
  if (anim === 'trick' && p.ring) {
    p.goalR = p.ring;
    p.goalRX = 144;
    p.goalRY = 150 + 5 * p.ring;
  }
  // Only the left paw has the bell pull. The right stays beside the coat.
  if (anim === 'fidget_a') p.reachR = 0;
  if (anim === 'trick-f2') p.reachL = (p.reach || 0) * (1 - (p.engage || 0)) * (1 - (p.knock || 0));
  if (anim === 'trick-f2' && p.engage) {
    const g = p.engage * (1 - (p.keyPark || 0));
    p.goalR = g;
    p.goalRX = lock[0] + 15;
    p.goalRY = lock[1] + 10 + (p.keyAngle || 0) * 3;
    p.palmDepthR = 8;
    p.keyInLock = p.engage > 0.001 ? 1 : 0;
  }
  if (anim === 'trick-f2' && p.knock) {
    p.goalR = p.knock;
    p.goalRX = 179;
    p.goalRY = 95;
    p.palmDepthR = 4;
  }
  if (anim === 'trick_b-f2') {
    const grip = span(n, 49, 63, 145, 154);
    const take = ease(85, 99, n),
      put = ease(118, 130, n),
      h = 1 - (p.map || 0);
    const right = city[0] - 16 - 8 * h,
      left = city[0] - 6 - 6 * h;
    p.goalR = grip;
    p.goalL = grip;
    p.goalRX = mix(mix(right, p.atX + 17, take), drawer[0] - 7, put);
    p.goalLX = mix(mix(left, p.atX + 35, take), drawer[0] + 4, put);
    p.goalRY = mix(mix(city[1] + 1, p.atY - 12, take), drawer[1] - 5 + 8 * (p.file || 0), put);
    p.goalLY = mix(mix(city[1] - 7 * h + 1, p.atY - 16, take), drawer[1] - 6 + 8 * (p.file || 0), put);
  }
  const turn = anim === 'turn' && Number.isInteger(side) ? (t * 4) % 1 : 0;
  const yaw = card.life.yaw + ((side + turn) * Math.PI) / 8,
    B = F3.yaw(yaw + (p.yaw || 0)),
    r = new Rig(),
    j: Marks = {};
  beast(r, B, p, j);
  const part = p.park || 0;
  let fr: BodyFrame;
  if (!part && !p.hide && !p.reveal) {
    house(r, positionHouse(B, p), p, j);
    fr = locate(raster(r, j), p.x || 0, home[1] - floor, p.s);
  } else {
    const h = new Rig(),
      k: Marks = {};
    const hp = {
      ...p,
      breathe: (p.breathe || 0) * (1 - part),
      trail: (p.trail || 0) * (1 - part),
      low: (p.low || 0) * (1 - part),
      swing: (p.swing || 0) * (1 - part),
      bounce: (p.bounce || 0) * (1 - part),
    };
    const hf = F3.yaw(yaw + (p.yaw || 0) * (1 - part));
    house(h, positionHouse(hf, hp), hp, k);
    const cabin = locate(raster(h, k), (p.x || 0) * (1 - part), mix(home[1] - floor, -20, part), 1);
    const a = locate(raster(r, j), p.x || 0, home[1] - floor, p.s);
    fr = parted(a, cabin, field(cabin, 'door'), !!p.exitOnly, !!p.hide, !!(p.reveal || p.entryOnly), p.open || 0);
  }
  if (anim === 'trick-f2' && p.keyInLock) {
    fr = atField(fr);
    const tip = fr.points.keyTip,
      bow = fr.points.keyBow;
    const e = p.engage;
    fr.points.keyTip = [mix(tip[0], lock[0] + pad, e), mix(tip[1], lock[1] + pad, e)];
    fr.points.keyBow = [mix(bow[0], lock[0] + 15 + pad, e), mix(bow[1], lock[1] + 10 + 3 * (p.keyAngle || 0) + pad, e)];
  }
  fr.groundShadow =
    p.floor !== undefined
      ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
      : { radius: 26, opacity: 0.53, offsetY: 3, reflectionOpacity: 0 };
  if (['trick', 'trick-f2', 'trick_b-f2', 'show', 'peek'].includes(anim)) rail(fr);
  if ((anim === 'trick' && p.portal) || (anim === 'trick-f2' && p.engage)) {
    fr = atField(fr);
    rail(fr);
    lightOnFrame(fr, anim, n);
  }
  if (anim === 'trick_b-f2' && p.drawer) {
    fr = atField(fr);
    rail(fr);
    openDrawer(fr, n);
  }
  if (variant === 'gold') fr.flash = 0.08;
  return fr;
};
