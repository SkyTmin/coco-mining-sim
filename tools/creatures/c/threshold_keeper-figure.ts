import { screenPoint, sprite } from '../engine';
import { F3, Rig, proj } from '../rig/f15-rig';
import { pointsOnlyActive, projectFigure, scaleFigure, withPointsOnly } from '../rig/figure';
import { Px } from '../rig/px';
import type { BodyFrame, Creature, XY } from '../types';
import { beast } from './threshold_keeper-beast';
import { card, brass, deep, glint, ink, milk, mint, wood, type Marks } from './threshold_keeper-craft';
import { house } from './threshold_keeper-house';
import {
  bridgeTop,
  city,
  drawer,
  filed,
  exit,
  home,
  lerp,
  lock,
  mix,
  porchTop,
  pose,
  span,
  stairTop,
} from './threshold_keeper-score';

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
function placeContact(fr: BodyFrame, from: XY, to: XY, amount: number) {
  fr.dx = (fr.dx || 0) + (to[0] - from[0]) * amount;
  fr.dy = (fr.dy || 0) + (to[1] - from[1]) * amount;
}
function positionHouse(F: F3, p: ReturnType<typeof pose>) {
  return F.at(-19, 7, 55 - (p.low || 0) * 5.3 + (p.bounce || 0) + (p.breathe || 0) * 0.9)
    .turn(0.23)
    .roll((p.trail || 0) * 0.019);
}
/** Two apertures share one cross-section. A source pixel belongs to exactly one room. */
function parted(a: BodyFrame, b: BodyFrame, door: XY, cross: boolean, hidden: boolean, reveal: boolean): BodyFrame {
  const destination = new Px(W, H),
    clip: [number, number, number, number] = [0, 0, W, H];
  const shift: XY = [exit[0] - door[0], exit[1] - door[1]];
  const wrap = (v: XY): XY => (cross && v[0] < door[0] ? [v[0] + shift[0], v[1] + shift[1]] : v);
  function paint(target: Px, houseImage: Px | null | undefined, beastImage: Px | null | undefined) {
    if (houseImage) sprite(target, houseImage, b, anchor, clip);
    if (hidden || !beastImage) return;
    if (!cross && !reveal) {
      sprite(target, beastImage, a, anchor, clip);
      return;
    }
    const split = Math.ceil(door[0] + pad - 0.5);
    sprite(target, beastImage, a, anchor, [split, 0, W, H]);
    if (reveal) return;
    const other: XY = [anchor[0] + shift[0], anchor[1] + shift[1]];
    sprite(target, beastImage, a, other, [0, 0, Math.ceil(exit[0] + pad - 0.5), H]);
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
    opening = aperture ? span(n, 29, 43, 101, 113) : span(n, 45, 62, 135, 149);
  if (opening < 0.01) return;
  const fore = new Px(W, H),
    x = exit[0] + pad,
    y = exit[1] + pad;
  if (aperture) {
    // The visible cut in the metal is behind the emerging nose. Its near hinge stays in front.
    const w = 9 * opening,
      h = 19 * opening;
    for (let k = 0; k <= 2 * w; k++) {
      const u = k / w - 1,
        dy = h * (1 - 0.24 * u * u);
      fore.line(x - w + k, y - dy, x - w + k, y + h, ink);
      fore.set(x - w + k, y - dy, glint);
      fore.set(x - w + k, y + h, mint);
      if (k % 5 === 0) fore.set(x - w + k, y - dy - 1, milk);
    }
  } else {
    const time = (n - 45) * 7;
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
  if (aperture) fore.line(x + 2, y - 17 * opening, x + 2, y + 18 * opening, glint);
  fr.over = fore;
}
function openDrawer(fr: BodyFrame, n: number) {
  if (pointsOnlyActive()) return;
  const u = span(n, 88, 101, 124, 133);
  if (u <= 0) return;
  const layer = fr.over ?? new Px(W, H),
    y = drawer[1] + pad,
    x = pad - 10;
  const end = Math.round(x + 4 + 15 * u);
  // The small viewing pane belongs to the frame. The map passes behind the near lip.
  layer.rect(x - 5, y - 11, end, y + 8, ink);
  layer.rect(x - 4, y - 10, end - 1, y + 6, wood.T[1]);
  layer.rect(x - 3, y - 9, end - 2, y + 3, deep.T[1]);
  layer.line(x - 4, y - 10, end, y - 10, glint);
  const lit = filed(n);
  if (lit > 0.04) {
    for (let i = 0; i < 4; i++) {
      const bx = x - 2 + i * 3,
        h = 2 + (i % 3) * 2;
      layer.rect(bx, y + 2 - h * lit, bx + 1, y + 2, mint);
      layer.set(bx, y + 1 - h * lit, milk);
    }
  }
  layer.rect(x - 4, y + 4, end + 1, y + 8, brass.T[1]);
  layer.line(x - 4, y + 4, end + 1, y + 4, glint);
  layer.line(end + 1, y + 4, end + 1, y + 8, brass.T[3]);
  layer.set(end - 3, y + 6, milk);
  fr.over = layer;
}
let parkedBow: XY | undefined;
function bowInLock(): XY {
  if (!parkedBow)
    parkedBow = withPointsOnly(() => {
      const p = pose('trick-f2', 61),
        j: Marks = {};
      beast(new Rig(), F3.yaw(card.life.yaw + (p.yaw || 0)), p, j);
      const a = proj(j.keyBow, 0, 0),
        b = proj(j.keyTip, 0, 0),
        scale = 1.115 * p.s;
      return [lock[0] + (a[0] - b[0]) * scale, lock[1] + (a[1] - b[1]) * scale] as XY;
    });
  return parkedBow;
}
export const figure: Creature['frame'] = (anim, t, side, variant) => {
  const n = t * 24,
    p = pose(anim, n),
    past = pose(anim, Math.max(0, n - 3));
  p.tunnel = anim === 'trick' ? span(n, 29, 40, 92, 104) : anim === 'show' ? span(n, 20, 28, 57, 70) : 0;
  p.keyInLock = anim === 'trick-f2' && n >= 62 && n < 135 ? 1 : 0;
  p.farEar = past.ear || 0;
  p.trail = (p.swing || 0) * 0.6 + (p.low || 0) - (past.low || 0) + ((p.x || 0) - (past.x || 0)) * 0.043;
  const turn = anim === 'turn' && Number.isInteger(side) ? (t * 4) % 1 : 0;
  const yaw = card.life.yaw + ((side + turn) * Math.PI) / 8;
  const B = F3.yaw(yaw + (p.yaw || 0)),
    r = new Rig(),
    j: Marks = {};
  beast(r, B, p, j);
  let fr: BodyFrame;
  const part = p.park || 0;
  if (part < 0.00001 && (p.hide || 0) < 0.01 && Math.abs(p.s - p.houseS) < 0.00001) {
    house(r, positionHouse(B, p), p, j);
    fr = locate(raster(r, j), p.x || 0, p.lift || 0, p.s);
  } else {
    const h = new Rig(),
      k: Marks = {};
    const HF = F3.yaw(yaw + (p.yaw || 0) * (1 - part));
    const housePose = { ...p, low: (p.low || 0) * (1 - part), bounce: (p.bounce || 0) * (1 - part) };
    house(h, positionHouse(HF, housePose), housePose, k);
    const b = locate(raster(h, k), mix(p.x || 0, -23, part), mix(p.lift || 0, -20, part), mix(p.houseS, 1, part));
    const a = locate(raster(r, j), p.x || 0, p.lift || 0, p.s),
      entry = field(b, 'door');
    if (anim === 'trick_b') {
      placeContact(a, field(a, 'handR'), field(b, 'sill'), span(n, 29, 36, 49, 58));
      const foot = field(a, 'bootR'),
        weight = span(n, 59, 65, 70, 76) + span(n, 78, 83, 88, 95) + span(n, 97, 102, 115, 121);
      placeContact(a, foot, [foot[0], bridgeTop(foot[0], field(b, 'sill')) - 1], weight);
    }
    if (anim === 'trick_b-f2') {
      const hands = lerp(field(a, 'handL'), field(a, 'handR'), 0.5);
      placeContact(a, hands, city, span(n, 30, 38, 52, 66) + span(n, 127, 137, 149, 156));
      const atDrawer = lerp(field(a, 'handL'), field(a, 'handR'), 0.5);
      placeContact(a, atDrawer, [drawer[0] + 19 - 12 * filed(n), drawer[1]], span(n, 92, 103, 121, 130));
    }
    const crossing = anim === 'trick' && n >= 40 && n < 105;
    if (crossing) {
      const real = field(a, 'body'),
        dx = exit[0] - entry[0],
        dy = exit[1] - entry[1];
      const unwrapped: XY = n >= 94 ? [real[0] - dx, real[1] - dy] : real;
      const aim = lerp(unwrapped, [entry[0] + (p.slide || 0), entry[1] + 2], p.passMix || 0);
      a.dx! += aim[0] - real[0];
      a.dy! += aim[1] - real[1];
    }
    const reveal = anim === 'show' && n >= 20 && n < 65;
    if (reveal) placeContact(a, field(a, 'body'), [entry[0] + (p.slide || 0), entry[1] + 2], p.emerge || 0);
    if (anim === 'show' || anim === 'trick') {
      const foot = field(a, 'bootR'),
        sill = field(b, 'sill');
      const support = anim === 'show' ? span(n, 26, 32, 59, 69) : span(n, 27, 33, 51, 61);
      placeContact(a, foot, [foot[0], porchTop(foot[0], sill) - 1], support);
    }
    fr = parted(a, b, entry, crossing, (p.hide || 0) > 0.92, reveal);
  }
  if (anim === 'trick-f2') {
    const bit = field(fr, 'keyTip');
    placeContact(fr, bit, lock, span(n, 26, 34, 61, 73) + span(n, 125, 135, 143, 152));
    const foot = field(fr, 'bootR'),
      rot = span(n, 46, 64, 131, 145),
      weight = span(n, 77, 83, 87, 94) + span(n, 98, 103, 107, 113) + span(n, 110, 115, 120, 126);
    placeContact(fr, foot, [foot[0], stairTop(foot[0], rot) - 1], Math.min(1, weight));
  }
  fr.groundShadow = {
    radius: part > 0.02 ? 0 : 29,
    opacity: part > 0.02 ? 0 : Math.max(0.1, 0.6 - Math.max(0, p.lift || 0) * 0.014),
    offsetY: 2,
    reflectionOpacity: part > 0.02 ? 0 : 0.45,
  };
  if (anim === 'trick-f2' && n >= 45 && n <= 149) {
    fr = atField(fr);
    if (p.keyInLock) {
      fr.points.keyTip = [lock[0] + pad, lock[1] + pad];
      const bow = bowInLock();
      fr.points.keyBow = [bow[0] + pad, bow[1] + pad];
    }
  }
  if (['trick', 'trick-f2', 'trick_b-f2', 'show', 'peek'].includes(anim)) rail(fr);
  if ((anim === 'trick' && n >= 29 && n <= 113) || (anim === 'trick-f2' && n >= 45 && n <= 149))
    lightOnFrame(fr, anim, n);
  if (anim === 'trick_b-f2' && n >= 88 && n <= 133) openDrawer(fr, n);
  if (variant === 'gold') fr.flash = 0.08;
  return fr;
};
