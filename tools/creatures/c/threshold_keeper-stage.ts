import type { JointPose } from '../technique';
import type { PaintingSize, XY } from '../types';

// Story coordinates are measured from the old cobbles. The same actor now works on a three-times-larger stage.
export const size: PaintingSize = [512, 312, 160, 18];
export const margin: XY = [100, 104];
export const toWorld = (p: XY): XY => [p[0] + margin[0], p[1] + margin[1]];
export const fromWorld = (p: XY): XY => [p[0] - margin[0], p[1] - margin[1]];
export const postShift = 116;
export const summitShift = -120;
export const bell: XY = [179, 95 + summitShift];
export const home: XY = [125, 168],
  exit: XY = [size[0] - margin[0] - 5, 124],
  lock: XY = [17, 148],
  city: XY = [-48, 155];
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
  const steps = Math.max(1, Math.round(distance / (28 * (p.s || 1))));
  p.footCycle = u * steps;
  p.footStride = distance / (steps * (p.s || 1));
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
export const bridgeEnd: XY = [224 + postShift, 137];
export const bridgeRoot = (s: XY = parkedSill): XY => [s[0] + 18, porchTop(s[0] + 18, s)];
export const bridgeTop = (x: number, sill: XY = bridgeRoot()) =>
  mix(sill[1], bridgeEnd[1], clamp((x - sill[0]) / (bridgeEnd[0] - sill[0]))) +
  3 * Math.sin(Math.PI * clamp((x - sill[0]) / (bridgeEnd[0] - sill[0])));
export const portalWidth = (n: number) => span(n, 99, 113, 154, 168);
export const bellHandle = (n: number): XY => [bell[0], bell[1] + 8 * span(n, 125, 134, 141, 150)];
export const liftProgress = (n: number) => span(n, 84, 123, 150, 183);
export const liftCentre = (u: number): XY => [44 + 109 * u, 166 - (68 - summitShift) * u];
export const bookOpen = (n: number) => span(n, 65, 98, 154, 178);
export const route = (n: number) => ease(100, 139, n);
export const leafTip = (u: number): XY => [
  city[0] + 33 * Math.cos(Math.PI * u),
  city[1] - 32 * Math.sin(Math.PI * u) - 2,
];
export const surveyPoint = (u: number): XY => [city[0] - 16 + 43 * u, city[1] - 6 - 4 * Math.sin(u * Math.PI * 2)];
export const stylus = (n: number) => {
  const carry = span(n, 91, 103, 141, 153),
    travel = route(n);
  const rest: XY = [city[0] + 13, city[1] + 3],
    mark = surveyPoint(travel);
  const tip = lerp(rest, mark, carry);
  tip[1] -= 5 * Math.sin(Math.PI * carry);
  const grip: XY = [tip[0] + 32, tip[1] + 8];
  return { tip, grip };
};
// The bookmark is pulled below the cover. Both the ribbon and the paw meet at the brass ring.
export const bookRing = (open: number): XY => [city[0] + 28 - 12 * open, city[1] + 8 + 5 * Math.sin(open * Math.PI)];
export const ferryDeck = (n: number): XY => {
  const arrival = travelFraction(n, 9, 42),
    crossing = travelFraction(n, 194, 247),
    departure = travelFraction(n, 251, 288);
  return [
    mix(491, 363, arrival) - 181 * crossing - 343 * departure,
    137 + 31 * crossing - 39 * Math.sin(Math.PI * crossing) + 74 * ease(249, 278, n),
  ];
};
export const sailHeight = (n: number) => 0.49 * ease(152, 163, n) + 0.51 * ease(175, 186, n);
export const looseLine = (n: number): XY => {
  const [x, y] = ferryDeck(n),
    pull = span(n, 152, 163, 165, 173) + span(n, 175, 186, 188, 193);
  return [x - 31, y - 11 + 11 * pull];
};
export const stages: Record<string, number> = {
  trick: 289,
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
  // The jack takes the weight first. The cottage only descends after its bearer has stepped clear.
  p.park = span(n, 1, 12, 275, 288);
  p.dockDrop = span(n, 28, 46, 234, 251);
  p.porch = span(n, 29, 48, 159, 181);
  p.open = span(n, 47, 60, 112, 128);
  p.portal = portalWidth(n);
  const tiny = span(n, 48, 69, 136, 151);
  p.s = 1 - 0.75 * tiny;
  p.spell = span(n, 40, 48, 69, 77) + span(n, 138, 144, 161, 167);
  p.ear = span(n, 2, 8, 14, 22) + span(n, 142, 150, 165, 172);
  p.low =
    0.68 * span(n, 11, 18, 30, 39) +
    0.4 * span(n, 46, 52, 64, 72) +
    0.5 * span(n, 152, 163, 166, 173) +
    0.6 * span(n, 175, 186, 190, 197) +
    0.72 * span(n, 248, 257, 270, 279);
  p.yaw = east * span(n, 12, 23, 268, 282) + 2.04 * span(n, 33, 47, 247, 257);
  walk(p, n, 15, 37, 125, 155);
  walk(p, n, 75, 111, 155, 89);
  p.entryOnly = n >= 74 && n <= 110 ? 1 : 0;
  p.hide = n >= 111 && n < 115 ? 1 : 0;
  p.exitOnly = n >= 115 && n <= 142 ? 1 : 0;
  if (n >= 112) p.x += 337;
  walk(p, n, 115, 145, 426, 363);
  const deck = ferryDeck(n);
  if (n >= 145 && n <= 248) p.x += deck[0] - 363;
  if (n > 248) p.x -= 181;
  walk(p, n, 249, 271, 182, 125);
  if (n < 112) p.floor = mix(168, porchTop(home[0] + p.x), p.porch);
  else p.floor = n <= 248 ? deck[1] : 168;
  p.key = span(n, 28, 40, 68, 77) + span(n, 124, 132, 138, 146);
  p.keyTip = span(n, 35, 48, 65, 75) + span(n, 127, 134, 139, 145);
  p.halyard = span(n, 146, 152, 187, 194);
  p.reach = 0.58 * p.key + 0.63 * p.halyard;
  p.chin = -0.17 * span(n, 38, 45, 60, 70) - 0.26 * span(n, 185, 194, 211, 225);
  p.grin = span(n, 188, 197, 223, 234) + 0.5 * span(n, 272, 278, 282, 288);
  return p;
}
function courier(n: number) {
  const p = base();
  p.park = span(n, 1, 12, 236, 240);
  p.dockDrop = span(n, 28, 45, 193, 211);
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
  walk(p, n, 83, 125, 136, 203 + postShift);
  walk(p, n, 144, 185, 203 + postShift, 136);
  walk(p, n, 193, 210, 136, 168);
  walk(p, n, 215, 236, 168, 125);
  p.bridge = span(n, 54, 82, 189, 211);
  const x = home[0] + p.x;
  if (n >= 48 && n <= 210) p.floor = n < 83 || n > 185 ? porchTop(x) : bridgeTop(x);
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
  p.park = span(n, 0, 7, 215, 225);
  p.dockDrop = span(n, 42, 57, 183, 197);
  p.low = 0.65 * span(n, 8, 16, 22, 33) + 0.35 * span(n, 68, 75, 83, 90) + 0.55 * span(n, 204, 210, 218, 225);
  p.yaw = east * span(n, 7, 17, 206, 223) + turn(n, 12, 29, 87, 100) + turn(n, 141, 153, 173, 190);
  walk(p, n, 27, 59, 125, 48);
  const u = liftProgress(n),
    car = liftCentre(u);
  p.x += car[0] - 44;
  p.floor += car[1] - 166;
  walk(p, n, 189, 212, 48, 125);
  p.key = span(n, 37, 50, 181, 194);
  p.keyTip = span(n, 54, 65, 185, 195);
  p.reach = span(n, 51, 60, 81, 91) + span(n, 180, 186, 190, 198);
  p.engage = span(n, 57, 66, 185, 193);
  p.keyPark = span(n, 76, 84, 179, 186);
  p.keyAngle = span(n, 68, 83, 183, 190);
  p.car = u;
  p.knock = span(n, 117, 125, 141, 150);
  p.gate = span(n, 129, 142, 161, 181);
  p.reach += p.knock;
  p.ear = span(n, 3, 10, 17, 28) + span(n, 108, 116, 131, 141);
  p.chin = -0.35 * span(n, 93, 108, 127, 142);
  p.turnHead = -0.75 * span(n, 111, 121, 132, 142);
  p.grin = span(n, 117, 123, 138, 150);
  return p;
}
function atlas(n: number) {
  const p = base(1);
  p.yaw = east * span(n, 4, 17, 212, 231) + turn(n, 5, 21, 179, 193);
  p.park = span(n, 0, 5, 227, 233);
  p.dockDrop = span(n, 39, 55, 178, 197);
  const stop = city[0] + 67;
  walk(p, n, 20, 59, 125, stop);
  walk(p, n, 192, 226, stop, 125);
  p.ear = span(n, 3, 10, 20, 28) + span(n, 135, 144, 151, 158);
  p.low = 0.4 * span(n, 49, 61, 174, 187);
  p.reach = span(n, 53, 65, 173, 184);
  p.book = bookOpen(n);
  p.trace = route(n);
  p.chin = 0.32 * span(n, 55, 67, 128, 138) - 0.35 * span(n, 137, 144, 151, 161);
  p.turnHead = -0.44 * span(n, 135, 143, 153, 161);
  p.grin = span(n, 139, 146, 161, 179);
  return p;
}
function entrance(n: number, young: boolean) {
  const p = base(),
    end = young ? 101 : 184;
  // Hatching uses its own shorter doorstep entrance, with the same single threshold.
  const a = young ? n * 1.69 : n;
  p.park = 1 - ease(148, 163, a);
  p.dockDrop = 1 - ease(99, 116, a);
  p.s = 0.25 + 0.75 * ease(71, 93, a);
  p.spell = span(a, 63, 72, 93, 103);
  p.open = span(a, 13, 31, 99, 120);
  p.porch = span(a, 8, 25, 97, 117);
  p.hide = a < 23 ? 1 : 0;
  p.reveal = a < 98 ? 1 : 0;
  p.key = 0.7 * p.spell;
  p.yaw = east * (1 - ease(147, 170, a));
  p.x = -110;
  walk(p, a, 22, 47, 15, 98);
  walk(p, a, 58, 98, 98, 195);
  walk(p, a, 111, 142, 195, 125);
  p.floor = a < 109 ? porchTop(home[0] + p.x) - 15 * ease(0, 1, (parkedSill[0] - home[0] - p.x) / 38) : 168;

  p.low = 0.18 * (1 - ease(53, 87, a)) + 0.71 * span(a, 111, 124, 140, 154);
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
  walk(p, n, 16, 63, 125, -40 - margin[0]);
  walk(p, n, 69, 83, -40 - margin[0], -12 - margin[0]);
  walk(p, n, 94, 135, -12 - margin[0], 125);
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
