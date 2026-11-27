import { screenPoint, sprite } from '../engine';
import { F3, Rig } from '../rig/f15-rig';
import { pointsOnlyActive, projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { BodyFrame, Creature, XY } from '../types';
import { beast } from './threshold_keeper-beast';
import { card, glint, milk, type Marks } from './threshold_keeper-craft';
import { house } from './threshold_keeper-house';
import { exit, home, lock, mix, span, pose, ease, clips } from './threshold_keeper-score';
import { bellHandle, bookRing, city, looseLine, margin, postShift, size, stylus } from './threshold_keeper-stage';
import { frameWicket, visibleAtDoor } from './threshold_keeper-door';

const pad = 18,
  W = size[0] + 2 * pad,
  H = size[1] + 2 * pad,
  ox = margin[0] + pad,
  oy = margin[1] + pad,
  anchor: XY = [home[0] + ox, home[1] + oy];
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
/** The creature and cottage have independent transforms. Both colour and emissive pixels use the same aperture. */
function parted(
  a: BodyFrame,
  b: BodyFrame,
  far: boolean,
  hidden: boolean,
  crossing: boolean,
  remote: number,
): BodyFrame {
  const destination = new Px(W, H),
    clip: [number, number, number, number] = [0, 0, W, H];
  const near = field(b, 'sill'),
    farSill: XY = [exit[0], exit[1] + 13],
    mouth = far ? farSill : near;
  function paint(target: Px, houseImage: Px | null | undefined, beastImage: Px | null | undefined) {
    if (houseImage) sprite(target, houseImage, b, anchor, clip);
    if (target === destination) frameWicket(target, [farSill[0] + ox, farSill[1] + oy], remote);
    if (hidden || !beastImage) return;
    if (!crossing && !far) {
      sprite(target, beastImage, a, anchor, clip);
      return;
    }
    // Inverse-sample the whole animal about its feet, then occlude against the arched opening, including the sill.
    const [left, top] = screenPoint(a, [0, 0], home),
      scale = a.sx ?? 1;
    const src = new Uint32Array(beastImage.data.buffer),
      dest = new Uint32Array(target.data.buffer);
    const xa = Math.max(0, Math.floor(left + ox)),
      xb = Math.min(W, Math.ceil(left + ox + beastImage.w * scale));
    const ya = Math.max(0, Math.floor(top + oy)),
      yb = Math.min(H, Math.ceil(top + oy + beastImage.h * scale));
    for (let y = ya; y < yb; y++) {
      const sy = Math.floor((y + 0.5 - oy - top) / scale);
      if (sy < 0 || sy >= beastImage.h) continue;
      for (let x = xa; x < xb; x++) {
        const sx = Math.floor((x + 0.5 - ox - left) / scale);
        if (sx < 0 || sx >= beastImage.w || !visibleAtDoor(x - ox, y - oy, mouth, far)) continue;
        const colour = src[sy * beastImage.w + sx];
        if (colour) dest[y * W + x] = colour;
      }
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
    const v = field(a, k);
    pts[k] = [v[0] + ox, v[1] + oy];
  }
  for (const k of Object.keys(b.points)) {
    const v = field(b, k);
    pts[k] = [v[0] + ox, v[1] + oy];
  }
  const pupil = a.eye ? screenPoint(a, a.eye, home) : null;
  const eye = !hidden && pupil && (!(crossing || far) || visibleAtDoor(...pupil, mouth, far)) ? pupil : null;
  return {
    px: destination,
    lit,
    anchor,
    eye: eye ? [eye[0] + ox, eye[1] + oy] : null,
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
  if (
    left + margin[0] >= 3 &&
    top + margin[1] >= 3 &&
    left + margin[0] + fr.px.w * s <= size[0] - 3 &&
    top + margin[1] + fr.px.h * s <= size[1] - 3
  )
    return;
  const from = new Uint32Array(fr.px.data.buffer),
    to = new Uint32Array(fore.data.buffer);
  let any = false;
  for (let y = 0; y < fore.h; y++)
    for (let x = 0; x < fore.w; x++) {
      const i = y * fore.w + x;
      if (!from[i]) continue;
      const X = left + x * s + margin[0],
        Y = top + y * s + margin[1];
      if (X <= 2 || X >= size[0] - 3 || Y <= 2 || Y >= size[1] - 3) {
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
function lightOnFrame(fr: BodyFrame, n: number) {
  if (pointsOnlyActive()) return;
  const opening = span(n, 125, 140, 173, 190);
  if (opening < 0.01) return;
  const fore = fr.over ?? new Px(W, H);
  for (let k = 0; k < W - 18; k++) {
    const d = (((k - 7 * (n - 125)) % W) + W) % W;
    if (d < 72 * opening && k % 7 < 5) fore.set(k + 9, 8, d < 15 ? milk : glint);
  }
  fr.over = fore;
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
        [33, 47],
        [247, 257],
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
        [5, 21],
        [179, 193],
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
      p.goalRX = mix(mix(228 + postShift, handX, first), 125, second);
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
    [p.goalRX, p.goalRY] = bellHandle(n);
    p.palmDepthR = 4;
  }
  if (anim === 'trick' && p.halyard) {
    p.goalR = p.halyard;
    p.reachL = 0;
    [p.goalRX, p.goalRY] = looseLine(n);
    p.palmDepthR = 7;
  }
  if (anim === 'trick_b-f2') {
    const grip = span(n, 54, 64, 173, 183),
      pen = span(n, 83, 91, 153, 159);
    const ring = bookRing(p.book || 0),
      tool = stylus(n);
    p.goalL = grip * (1 - pen);
    p.reachL = (p.reach || 0) * (1 - pen);
    p.goalLX = city[0] + 32;
    p.palmDepthL = -7;
    p.goalLY = city[1] + 2;
    p.goalR = grip;
    p.goalRX = mix(ring[0], tool.grip[0], pen);
    p.goalRY = mix(ring[1], tool.grip[1], pen);
    p.palmDepthR = 5;
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
    const cabin = locate(raster(h, k), (p.x || 0) * (1 - part), mix(home[1] - floor, -20 * (p.dockDrop || 0), part), 1);
    const a = locate(raster(r, j), p.x || 0, home[1] - floor, p.s);
    fr = parted(a, cabin, !!p.exitOnly, !!p.hide, !!(p.reveal || p.entryOnly), p.portal || 0);
  }
  if (anim === 'trick-f2' && p.keyInLock) {
    fr = atField(fr);
    const tip = fr.points.keyTip,
      bow = fr.points.keyBow;
    const e = p.engage;
    fr.points.keyTip = [mix(tip[0], lock[0] + ox, e), mix(tip[1], lock[1] + oy, e)];
    fr.points.keyBow = [mix(bow[0], lock[0] + 15 + ox, e), mix(bow[1], lock[1] + 10 + 3 * (p.keyAngle || 0) + oy, e)];
  }
  fr.groundShadow =
    p.floor !== undefined
      ? { radius: 0, opacity: 0, reflectionOpacity: 0 }
      : { radius: 26, opacity: 0.53, offsetY: 3, reflectionOpacity: 0 };
  if (['trick', 'trick-f2', 'trick_b-f2', 'show', 'peek'].includes(anim)) rail(fr);
  if (anim === 'trick-f2' && p.engage) {
    fr = atField(fr);
    rail(fr);
    lightOnFrame(fr, n);
  }
  if (variant === 'gold') fr.flash = 0.08;
  return fr;
};
