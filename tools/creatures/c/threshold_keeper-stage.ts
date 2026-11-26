import type { JointPose } from '../technique';
import type { XY } from '../types';

export const home: XY = [125, 168],
  exit: XY = [261, 147],
  lock: XY = [17, 148],
  city: XY = [202, 156],
  drawer: XY = [233, 156];
export const tau = 2 * Math.PI;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerp = (a: XY, b: XY, u: number): XY => [mix(a[0], b[0], u), mix(a[1], b[1], u)];
export function ease(a: number, b: number, n: number) {
  const u = clamp((n - a) / (b - a));
  return u * u * (3 - 2 * u);
}
export const span = (n: number, a: number, b: number, c: number, d: number) => ease(a, b, n) - ease(c, d, n);
// Acceleration occupies just the first and last fifth. Successive footfalls keep their cruising speed.
function travelFraction(n: number, a: number, b: number) {
  const u = clamp((n - a) / (b - a)),
    ramp = 0.18,
    v = 1 - u;
  return u < ramp
    ? (u * u) / (2 * ramp * (1 - ramp))
    : v < ramp
      ? 1 - (v * v) / (2 * ramp * (1 - ramp))
      : (u - ramp / 2) / (1 - ramp);
}
function walk(p: JointPose, n: number, a: number, b: number, from: number, to: number) {
  const u = travelFraction(n, a, b),
    distance = Math.abs(to - from);
  p.x += (to - from) * u;
  if (n < a || n > b) return;
  const steps = Math.max(1, Math.round(distance / 28));
  p.footCycle = u * steps;
  p.footStride = distance / steps;
  p.heading = Math.sign(to - from);
  const stride = Math.sin(p.footCycle * tau);
  p.gait = stride;
  p.bounce = 2.2 * Math.sin(p.footCycle * Math.PI * 2) ** 2;
  p.lean = 0.069 * (ease(a, a + 6, n) - ease(b - 6, b, n));
  p.swing = stride * 0.48;
}
const turn = (n: number, a: number, b: number, c: number, d: number) => 2.04 * span(n, a, b, c, d);
const east = -0.48;
const base = (form = 0): JointPose => ({ x: 0, floor: 168, s: 1, houseS: 1, form, yaw: 0 });
export const parkedSill: XY = [118, 140];
export const porchTop = (x: number, sill: XY = parkedSill) => sill[1] + clamp((x - sill[0]) / 54) * 28;
export const bridgeEnd: XY = [224, 137];
export const bridgeRoot = (s: XY = parkedSill): XY => [s[0] + 18, porchTop(s[0] + 18, s)];
export const bridgeTop = (x: number, sill: XY = bridgeRoot()) =>
  mix(sill[1], bridgeEnd[1], clamp((x - sill[0]) / (bridgeEnd[0] - sill[0]))) +
  3 * Math.sin(Math.PI * clamp((x - sill[0]) / (bridgeEnd[0] - sill[0])));
export const portalWidth = (n: number) => span(n, 108, 124, 176, 195);
export const liftProgress = (n: number) => span(n, 84, 113, 142, 173);
export const liftCentre = (u: number): XY => [44 + 109 * u, 166 - 68 * u];
export const folded = (n: number) => span(n, 65, 94, 168, 190);
export const filed = (n: number) => span(n, 128, 143, 157, 166);
export const stages: Record<string, number> = {
  trick: 236,
  trick_b: 241,
  'trick-f2': 227,
  'trick_b-f2': 234,
  show: 185,
  peek: 149,
  phase: 65,
  hatch: 102,
};

function through(n: number) {
  const p = base();
  p.park = span(n, 12, 30, 211, 232);
  p.open = span(n, 50, 68, 112, 129);
  p.porch = span(n, 26, 45, 125, 145);
  p.portal = portalWidth(n);
  p.low = 0.63 * span(n, 11, 20, 27, 38) + 0.78 * span(n, 63, 78, 156, 173) + 0.66 * span(n, 210, 218, 225, 235);
  p.ear = span(n, 3, 9, 15, 23) + 0.85 * span(n, 136, 141, 150, 156);
  p.turnHead = 0.62 * span(n, 2, 11, 19, 30) - 0.46 * span(n, 135, 142, 148, 155);
  p.yaw = east * span(n, 16, 26, 205, 224) + turn(n, 39, 54, 202, 220);
  walk(p, n, 21, 42, 125, 170);
  walk(p, n, 64, 107, 170, 62);
  // Both doors lead to an unseen room. The second door opens only after the tail has cleared the first.
  if (n >= 113) p.x += 100;
  walk(p, n, 119, 139, 162, 118);
  walk(p, n, 149, 176, 118, 49);
  const dx = exit[0] - 117;
  if (n >= 177) p.x += dx;
  walk(p, n, 181, 214, 49 + dx, 125);
  const x = home[0] + p.x;
  p.entryOnly = n >= 62 && n < 109 ? 1 : 0;
  p.hide = n >= 109 && n < 115 ? 1 : 0;
  p.exitOnly = n >= 115 && n < 177 ? 1 : 0;
  if (p.entryOnly) p.floor = porchTop(x);
  if (n >= 109 && n < 177) p.floor = parkedSill[1];
  if (n >= 177) p.floor = mix(parkedSill[1] + exit[1] - 127, 168, ease(177, 194, n));
  p.tunnel = span(n, 62, 76, 157, 174);
  p.chin = 0.19 * span(n, 62, 72, 155, 165) - 0.25 * span(n, 136, 142, 148, 155);
  p.reach = span(n, 44, 52, 62, 69);
  p.ring = span(n, 45, 52, 60, 67);
  p.grin = span(n, 165, 174, 185, 196) + 0.5 * span(n, 221, 228, 231, 235);
  return p;
}
function courier(n: number) {
  const p = base();
  p.park = span(n, 12, 30, 224, 239);
  p.open = span(n, 30, 44, 195, 210);
  p.porch = span(n, 25, 41, 211, 226);
  p.low =
    0.62 * span(n, 10, 18, 25, 36) +
    0.48 * span(n, 53, 62, 71, 84) +
    0.45 * span(n, 119, 126, 134, 142) +
    0.62 * span(n, 220, 228, 234, 240);
  p.yaw =
    east * span(n, 14, 25, 223, 240) +
    turn(n, 39, 52, 76, 89) +
    turn(n, 130, 144, 183, 196) +
    turn(n, 207, 219, 228, 239);
  p.turnHead = -0.5 * span(n, 2, 9, 18, 28);
  p.ear = span(n, 1, 6, 17, 26);
  p.chin = 0.2 * span(n, 50, 61, 68, 82);
  walk(p, n, 21, 40, 125, 170);
  walk(p, n, 49, 69, 170, 136);
  walk(p, n, 88, 126, 136, 214);
  walk(p, n, 145, 185, 214, 136);
  walk(p, n, 193, 210, 136, 168);
  walk(p, n, 215, 236, 168, 125);
  p.bridge = span(n, 61, 88, 189, 211);
  const x = home[0] + p.x;
  if (n >= 48 && n <= 210) p.floor = n < 87 || n > 185 ? porchTop(x) : bridgeTop(x);
  p.reach = span(n, 47, 56, 73, 83) + span(n, 113, 122, 186, 194);
  p.handle = span(n, 49, 61, 73, 83);
  p.letter = span(n, 117, 125, 179, 189);
  p.deliver = ease(178, 190, n);
  p.grin = span(n, 125, 131, 139, 147) + span(n, 192, 201, 208, 216);
  p.counterweight = 0.6 * p.handle;
  return p;
}
function hoist(n: number) {
  const p = base(1);
  p.park = span(n, 9, 24, 204, 222);
  p.low = 0.65 * span(n, 8, 16, 22, 33) + 0.35 * span(n, 68, 75, 83, 90) + 0.55 * span(n, 204, 210, 218, 225);
  p.yaw = east * span(n, 7, 17, 206, 223) + turn(n, 12, 29, 87, 100) + turn(n, 141, 153, 173, 190);
  walk(p, n, 27, 59, 125, 48);
  const u = liftProgress(n),
    car = liftCentre(u);
  p.x += car[0] - 44;
  p.floor += car[1] - 166;
  walk(p, n, 182, 208, 48, 125);
  p.key = span(n, 37, 50, 181, 194);
  p.keyTip = span(n, 54, 65, 172, 184);
  p.reach = span(n, 51, 60, 81, 91) + span(n, 165, 174, 180, 191);
  p.engage = span(n, 57, 66, 174, 184);
  p.keyPark = span(n, 76, 84, 166, 174);
  p.keyAngle = span(n, 68, 83, 151, 168);
  p.car = u;
  p.knock = span(n, 102, 112, 125, 136);
  p.gate = span(n, 116, 132, 152, 171);
  p.reach += p.knock;
  p.ear = span(n, 3, 10, 17, 28) + span(n, 108, 116, 131, 141);
  p.chin = -0.35 * span(n, 93, 108, 127, 142);
  p.turnHead = -0.75 * span(n, 111, 121, 132, 142);
  p.grin = span(n, 117, 123, 138, 150);
  return p;
}
function atlas(n: number) {
  const p = base(1);
  p.yaw = east * span(n, 9, 22, 211, 231) + turn(n, 166, 178, 209, 224);
  walk(p, n, 21, 56, 125, 169);
  walk(p, n, 102, 127, 169, 201);
  walk(p, n, 179, 216, 201, 125);
  p.turnHead = -0.48 * span(n, 5, 15, 23, 32);
  p.ear = 0.85 * span(n, 3, 12, 20, 30) + span(n, 145, 151, 157, 169);
  p.low = 0.48 * span(n, 50, 61, 80, 95) + 0.47 * span(n, 122, 129, 146, 154);
  p.reach = span(n, 52, 62, 145, 156) + 0.85 * span(n, 153, 159, 166, 175);
  p.map = folded(n);
  p.takeMap = span(n, 79, 96, 129, 143);
  p.drawer = span(n, 115, 125, 164, 176);
  p.file = filed(n);
  p.chin = -0.16 * span(n, 55, 68, 89, 101) - 0.26 * span(n, 150, 157, 167, 177);
  p.grin = span(n, 160, 167, 176, 187);
  return p;
}
function entrance(n: number, young: boolean) {
  const p = base(),
    end = young ? 101 : 184;
  // Hatching uses its own shorter doorstep entrance, with the same single threshold.
  const a = young ? n * 1.69 : n;
  p.park = 1 - ease(134, 160, a);
  p.open = span(a, 13, 31, 99, 120);
  p.porch = span(a, 8, 25, 97, 117);
  p.hide = a < 23 ? 1 : 0;
  p.reveal = a < 98 ? 1 : 0;
  p.yaw = east * (1 - ease(147, 170, a));
  p.x = -65;
  walk(p, a, 22, 47, 60, 98);
  walk(p, a, 58, 98, 98, 195);
  walk(p, a, 111, 142, 195, 125);
  p.floor = a < 109 ? porchTop(home[0] + p.x) : 168;
  p.tunnel = 1 - ease(53, 87, a);
  p.low = 0.75 * (1 - ease(53, 87, a)) + 0.71 * span(a, 111, 124, 140, 154);
  p.ear = 0.85 * span(a, 34, 41, 50, 58) + 0.7 * span(a, 150, 158, 166, 178);
  p.yaw += turn(a, 96, 110, 135, 153);
  p.turnHead = -0.6 * span(a, 36, 42, 51, 59);
  p.grin = 0.9 * span(a, 152, 160, 172, 183);
  if (young) {
    p.grin *= 1 - ease(91, end, n);
    p.ear *= 1 - ease(91, end, n);
  }
  return p;
}
function peek(n: number) {
  const p = base();
  p.yaw = east * span(n, 3, 9, 132, 147) + turn(n, 4, 18, 61, 79);
  walk(p, n, 16, 63, 125, -40);
  walk(p, n, 69, 83, -40, -12);
  walk(p, n, 94, 135, -12, 125);
  p.ear = span(n, 1, 7, 13, 19) + span(n, 76, 81, 89, 97);
  p.turnHead = -0.91 * span(n, 77, 82, 92, 99);
  p.grin = span(n, 81, 87, 94, 101);
  return p;
}
function winding(n: number) {
  const p = base(ease(21, 54, n));
  p.reach = span(n, 6, 15, 43, 55);
  p.ring = span(n, 9, 19, 35, 46);
  p.low = 0.74 * span(n, 10, 22, 36, 52);
  p.ear = span(n, 1, 9, 18, 27) + 0.63 * span(n, 42, 48, 54, 62);
  p.chin = 0.16 * span(n, 10, 17, 24, 31) - 0.3 * span(n, 34, 42, 51, 60);
  p.banner = span(n, 22, 35, 50, 61);
  return p;
}
export function scenePose(anim: string, n: number): JointPose | undefined {
  switch (anim) {
    case 'trick':
      return through(n);
    case 'trick_b':
      return courier(n);
    case 'trick-f2':
      return hoist(n);
    case 'trick_b-f2':
      return atlas(n);
    case 'show':
      return entrance(n, false);
    case 'hatch':
      return entrance(n, true);
    case 'peek':
      return peek(n);
    case 'phase':
      return winding(n);
  }
}
