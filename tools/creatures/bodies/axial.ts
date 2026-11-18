// Pose the original head, neck, horn and tail skins in figure space before projection.
import { F3, type Rig, type V3, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub } from '../rig/f15-rig';
import type { JointPose } from '../technique';
import { primitivesOf } from '../rig/collision';
import type { BodyType } from './card-data';
import { collisionShell, goalAt, segmentClearance, solveShaft, toLocal } from './goals';
import { rotateFromTo, transformPart } from './rig-transform';

type Points = Record<string, V3>;
type MapPoint = (p: V3) => V3;
type Prim = Rig['prims'][number];
type Cap = Extract<Prim, { k: 1 }>;
const length = (a: V3, b: V3) => vlen(vsub(a, b));
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mean = (v: V3[]) => vmul(v.reduce(vadd, [0, 0, 0]), 1 / v.length);

function targetFor(names: string[], pose: JointPose, basis: F3, rest: V3) {
  for (const name of names) {
    const local = goalAt(pose, name, toLocal(basis, rest));
    if (local) return basis.p(...local);
  }
}

function localTurn(basis: F3, yaw: number, pitch: number, origin: V3): MapPoint {
  const turn = basis.turn(yaw).pitch(pitch);
  return (p) => vadd(origin, turn.v(...toLocal(basis, vadd(basis.o, vsub(p, origin)))));
}

function caps(rig: Rig, tag: string) {
  return rig.prims.filter((p): p is Cap => p.k === 1 && p.t === tag);
}

// A ribbon is built of adjoining six-sided bamboo hoops. Recover their actual
// centers from the sewn seams, including the native wave, pose and proportions.
function hoops(rig: Rig) {
  const panels = rig.prims.filter((p): p is Extract<Prim, { k: 2 }> => p.t === 'torso' && p.k === 2);
  const centers: V3[] = [];
  for (let i = 0; i + 5 < panels.length; i += 6) {
    const ring = panels.slice(i, i + 6);
    if (!centers.length) centers.push(mean(ring.map((p) => p.pts[0])));
    centers.push(mean(ring.map((p) => p.pts[3])));
  }
  return centers;
}

/** FABRIK on the authored rings/capsules preserves their lengths and the bend present
 * in this frame. The small extension allowance belongs to the living neck or tail. */
function bendChain(rest: V3[], target: V3, stretch: number) {
  const spans = rest.slice(1).map((p, i) => length(rest[i], p));
  const total = spans.reduce((a, b) => a + b, 0),
    distance = length(rest[0], target);
  const softLength = total - spans[spans.length - 1];
  if (distance > total + softLength * (stretch - 1) + 1e-5)
    throw RangeError('Axial target is beyond chain reach');
  if (distance >= total - 1e-5) {
    let along = 0;
    const extend = 1 + (distance - total) / softLength;
    return [
      rest[0],
      ...spans.map((span, i) => {
        // The final span is the rigid muzzle, purse or brush, not a stretchable vertebra.
        along += span * (i === spans.length - 1 ? 1 : extend);
        return vlerp(rest[0], target, along / distance);
      }),
    ];
  }
  const solved = rest.slice();
  for (let it = 0; it < 96; it++) {
    solved[solved.length - 1] = target;
    for (let i = solved.length - 2; i >= 0; i--)
      solved[i] = vadd(solved[i + 1], vmul(vnorm(vsub(solved[i], solved[i + 1])), spans[i]));
    solved[0] = rest[0];
    for (let i = 1; i < solved.length; i++)
      solved[i] = vadd(solved[i - 1], vmul(vnorm(vsub(solved[i], solved[i - 1])), spans[i - 1]));
    if (length(solved[solved.length - 1], target) < 0.001) break;
  }
  if (length(solved[solved.length - 1], target) > 0.2)
    throw RangeError('Axial chain cannot fold onto target');
  solved[solved.length - 1] = target;
  return solved;
}

function jointMaps(rest: V3[], solved: V3[]) {
  return rest.map((joint, i): MapPoint => {
    const lo = Math.max(0, i - 1),
      hi = Math.min(rest.length - 1, i + 1);
    const rotate = rotateFromTo(vsub(rest[hi], rest[lo]), vsub(solved[hi], solved[lo]));
    return (p) => vadd(solved[i], rotate(vsub(p, joint)));
  });
}
function nearest(points: V3[], p: V3) {
  let best = 0;
  for (let i = 1; i < points.length; i++) if (length(points[i], p) < length(points[best], p)) best = i;
  return best;
}
function followChain(rest: V3[], joint: MapPoint[]): MapPoint {
  return (p) => {
    let closest = Infinity,
      span = 0,
      weight = 0;
    for (let i = 1; i < rest.length; i++) {
      const bone = vsub(rest[i], rest[i - 1]),
        offset = vsub(p, rest[i - 1]);
      const t = clamp(vdot(offset, bone) / (vdot(bone, bone) || 1));
      const d = length(p, vlerp(rest[i - 1], rest[i], t));
      if (d < closest) {
        closest = d;
        span = i - 1;
        weight = t;
      }
    }
    return vlerp(joint[span](p), joint[span + 1](p), weight);
  };
}

function poseTail(body: BodyType, rig: Rig, points: Points, basis: F3, pose: JointPose) {
  const names = body === 'long-flier' ? ['tailTip', 'tail', 'weaponTip'] : ['tailTip', 'tail'];
  const weapon = body === 'long-flier';
  const yaw = (pose['tail.yaw'] ?? 0) + (weapon ? (pose['weapon.yaw'] ?? 0) : 0);
  const pitch = (pose['tail.pitch'] ?? 0) + (weapon ? (pose['weapon.pitch'] ?? 0) : 0);
  const requested = names.some((n) => pose['goal.' + n + '.weight'] > 0);
  if (!requested && !yaw && !pitch) return;
  if (!requested && !points.tail) return;
  if (!points.tail || (body !== 'winged-dragon' && body !== 'long-flier'))
    throw RangeError(body + ' has no articulated tail');

  const ribbon = body === 'long-flier';
  const rings = ribbon ? hoops(rig) : [];
  const tail = caps(rig, 'tail');
  // The first two ribbon bays carry the mask and fins. Its third hoop is the
  // hinge of the trailing half; the purse dragon instead flexes from the pelvis.
  const base = ribbon ? rings.slice(2) : [tail[0].a, ...tail.map((p) => p.b)];
  const rest = [...base, points.tail];
  const seed = yaw || pitch ? rest.map(localTurn(basis, yaw, pitch, base[0])) : rest;
  const target = targetFor(names, pose, basis, points.tail) ?? seed[seed.length - 1];
  if (!yaw && !pitch && length(target, points.tail) < 1e-7) return;
  const solved = requested ? bendChain(seed, target, 1.18) : seed;
  const joints = jointMaps(rest, solved);
  const distal = base.length - 1;
  const tipTurn = rotateFromTo(vsub(points.tail, base[distal]), vsub(target, solved[distal]));
  const tipMap: MapPoint = (p) => vadd(target, tipTurn(vsub(p, points.tail)));
  joints[distal] = tipMap;
  if (ribbon) {
    const ringMaps = [(p: V3) => p, (p: V3) => p, ...joints];
    const panels = rig.prims.filter((p): p is Extract<Prim, { k: 2 }> => p.t === 'torso' && p.k === 2);
    // Assign seam vertices to their actual ring. Euclidean proximity would confuse
    // adjacent rings of a coiled dragon and tear shared panel edges.
    const seams = new Map<V3, number>(),
      byPosition = new Map<string, number>();
    panels.forEach((p, i) =>
      p.pts.forEach((v, j) => {
        const ring = Math.floor(i / 6) + (j >= 2 ? 1 : 0);
        seams.set(v, ring);
        byPosition.set(v.join(','), ring);
      }),
    );
    const skin: MapPoint = (p) =>
      ringMaps[seams.get(p) ?? byPosition.get(p.join(',')) ?? nearest(rings, p)](p);
    transformPart(rig, (t) => t === 'torso', skin);
    transformPart(rig, (t) => t === 'crest' || t === 'finL', ringMaps[2]);
    for (const k of ['finL', 'handL', 'foreL', 'footL', 'hindL'])
      if (points[k]) points[k] = ringMaps[2](points[k]);
    transformPart(rig, (t) => t === 'tail' || t === 'tailKnot' || t === 'tassel', tipMap);
  } else {
    const bodyShell = collisionShell(rig).filter((p) => p.label === 'torso');
    if (segmentClearance(bodyShell, target, target) < 0.85) throw RangeError('Tail contact is inside torso');
    transformPart(rig, (t) => t === 'tail', followChain(rest, joints));
    transformPart(rig, (t) => t === 'purse', tipMap);
  }
  points.tail = points.tailTip = target;
  if (ribbon) points.weaponTip = target;
  points.tailFloor = [target[0], target[1], 0];
}

/** The beetle's fork bends at its second capsule. Check that bent shape as well as
 * the shaft axis; swivel the skull around the pinned tip if the trunk blocks it. */
function clearHorn(
  rig: Rig,
  basis: F3,
  pivot: V3,
  tip: V3,
  target: V3,
  allowance: number,
  map: MapPoint,
): MapPoint {
  const bones = caps(rig, 'horn');
  const shell = collisionShell(rig).filter((e) => e.label === 'thorax' || e.label === 'abdomen');
  const fullClear = (m: MapPoint) => bones.every((b) => segmentClearance(shell, m(b.a), m(b.b)) >= 0.85);
  if (fullClear(map)) return map;
  const original = vsub(map(tip), map(bones[0].a));
  const candidate = (direction: V3): MapPoint => {
    const turn = rotateFromTo(original, direction);
    return (p) => vadd(target, turn(vsub(map(p), target)));
  };
  const direction = solveShaft(shell, target, original, vlen(original), basis, (axis) => {
    const rotated = candidate(axis);
    return length(rotated(pivot), pivot) <= allowance && fullClear(rotated);
  });
  return candidate(direction);
}

/** The squat mage's knees reach the edge of its wide throat. Protract its short
 * neck when looking down over a knee; sight still points exactly at the target. */
function throatLook(
  rig: Rig,
  basis: F3,
  pivot: V3,
  forward: V3,
  gaze: V3,
  headLength: number,
  yaw: number,
  pitch: number,
) {
  const folds = caps(rig, 'throatFold');
  const { ells, caps: allCaps } = primitivesOf(rig);
  const nearby = ells.filter((e) => ['legL', 'legR', 'torso'].includes(e.label));
  const obstacles = folds.map((q) => ({
    q,
    solids: nearby.map((e) => ({ e, limit: Math.min(0.59, segmentClearance([e], q.a, q.b) - 0.18) })),
  }));
  // Only static cloak decorations appreciably smaller than a head ellipsoid can
  // disappear into it. Preserve any original shoulder-to-head attachment.
  const skull = ells.filter((e) => e.label === 'head');
  const cloak = allCaps
    .filter((c) => c.label === 'cloak')
    .map((c) => ({
      a: c.a,
      b: c.b,
      solids: skull
        .filter((e) => e.radii[0] * e.radii[1] * e.radii[2] >= 3 * c.r * c.r * (c.len + c.r))
        .map((e) => ({ e, limit: Math.min(0.59, segmentClearance([e], c.a, c.b) - 0.12) })),
    }));
  const unit: V3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const aimAt = (origin: V3, roll = 0): MapPoint => {
    const axis = vnorm(vsub(gaze, origin)),
      cs = Math.cos(roll),
      sn = Math.sin(roll);
    const rotate = rotateFromTo(forward, axis);
    const manual = localTurn(basis, yaw, pitch, origin);
    return (p) => {
      const oriented = rotate(vsub(p, pivot));
      const swung = roll
        ? vadd(
            vadd(vmul(oriented, cs), vmul(vcross(axis, oriented), sn)),
            vmul(axis, vdot(axis, oriented) * (1 - cs)),
          )
        : oriented;
      return manual(vadd(origin, swung));
    };
  };
  const clear = (map: MapPoint) => {
    if (
      !obstacles.every(({ q, solids }) => {
        const a = map(q.a),
          b = map(q.b);
        return solids.every(({ e, limit }) => segmentClearance([e], a, b) >= limit);
      })
    )
      return false;
    const origin = map(pivot),
      axes = unit.map((u) => vsub(map(vadd(pivot, u)), origin));
    const inverse = (p: V3) => vadd(pivot, axes.map((u) => vdot(u, vsub(p, origin))) as V3);
    return cloak.every((c) => {
      const a = inverse(c.a),
        b = inverse(c.b);
      return c.solids.every(({ e, limit }) => segmentClearance([e], a, b) >= limit);
    });
  };
  const natural = aimAt(pivot);
  if (clear(natural)) return natural;
  const directions = [vnorm(vadd(basis.f, basis.u)), basis.u, basis.f];
  for (const sign of [-1, 1]) directions.push(vnorm(vadd(basis.u, vmul(basis.s, sign))));
  for (const up of [0.35, 0.8])
    for (let i = 0; i < 12; i++) {
      const phi = (i * Math.PI) / 6;
      directions.push(vnorm(basis.v(Math.cos(phi), Math.sin(phi), up)));
    }
  const step = headLength * 0.12;
  for (let ring = 1; ring <= 9; ring++) {
    for (let distance = 0; distance <= ring; distance++) {
      const rollStep = ring - distance;
      for (const sign of rollStep ? [-1, 1] : [1]) {
        const roll = rollStep * sign * 0.13;
        for (const dir of distance ? directions : [basis.u]) {
          const candidate = (k: number) => aimAt(vadd(pivot, vmul(dir, distance * step * k)), roll * k);
          if (!clear(candidate(1))) continue;
          let lo = 0,
            hi = 1;
          for (let j = 0; j < 7; j++) {
            const mid = (lo + hi) / 2;
            if (clear(candidate(mid))) hi = mid;
            else lo = mid;
          }
          return candidate(hi);
        }
      }
    }
  }
  throw RangeError('The head cannot look past the knee from this neck position');
}

function poseHead(body: BodyType, rig: Rig, points: Points, basis: F3, pose: JointPose) {
  const horn =
    body === 'hexapod' && ['horn', 'hornTip', 'weaponTip'].some((k) => pose['goal.' + k + '.weight'] > 0);
  const horned = body === 'hexapod';
  const yaw = (pose['head.yaw'] ?? 0) + (horned ? (pose['weapon.yaw'] ?? 0) : 0);
  const pitch = (pose['head.pitch'] ?? 0) + (horned ? (pose['weapon.pitch'] ?? 0) : 0);
  if (!horn && !pose['goal.head.weight'] && !pose['goal.mouth.weight'] && !yaw && !pitch) return;
  const skull = rig.prims.find((p): p is Extract<Prim, { k: 0 }> => p.k === 0 && p.t === 'head');
  if (!skull || !points.mouth) throw RangeError(body + ' has no exposed head in this frame');
  const winged = body === 'winged-dragon',
    silk = body === 'long-flier';
  const neck = caps(rig, 'neck');
  const pivot =
    winged && neck[2]
      ? neck[2].b
      : silk
        ? hoops(rig)[0]
        : body === 'giant'
          ? vsub(points.vent, vmul(skull.a[2], 4.8))
          : vsub(skull.c, vmul(skull.a[0], body === 'hexapod' ? 0.48 : 0.62));
  const tip = horn ? points.horn : points.mouth;
  const names = horn ? ['weaponTip', 'horn', 'hornTip'] : ['mouth'];
  const target = targetFor(names, pose, basis, tip);
  const forward = vnorm(skull.a[0]);
  const gaze = targetFor(['head'], pose, basis, vadd(pivot, vmul(forward, Math.max(12, length(pivot, tip)))));
  let center = pivot,
    rotate = (v: V3) => v,
    neckChain: V3[] | undefined;
  if (target && length(tip, target) > 1e-7) {
    const shell = collisionShell(rig).filter((e) => /^(torso|thorax|abdomen|belly|chest)$/.test(e.label));
    if (segmentClearance(shell, target, target) < 0.85) throw RangeError('Head contact is inside torso');
    const axis = vsub(tip, pivot);
    if (winged && neck.length >= 3) {
      const rest = [neck[0].a, neck[0].b, neck[1].b, pivot, tip];
      const solved = bendChain(rest, target, 1.2);
      center = solved[3];
      neckChain = solved.slice(0, 4);
    } else {
      const direction = vnorm(vsub(target, pivot));
      center = vsub(target, vmul(direction, vlen(axis)));
      if (length(center, pivot) > Math.max(vlen(axis) * 0.85, vlen(skull.a[0])))
        throw RangeError('Head contact exceeds neck protraction');
    }
    rotate = rotateFromTo(axis, vsub(target, center));
  } else if (gaze && length(pivot, gaze) > 1e-7) rotate = rotateFromTo(forward, vsub(gaze, pivot));

  // Hand-tuned pitch and yaw remain additive; a contact rotates around its
  // prescribed tip so fine adjustment cannot slide the emitted effect.
  const fine = localTurn(basis, yaw, pitch, target ?? center);
  const aimedMap: MapPoint = (p) => {
    const aimed = vadd(center, rotate(vsub(p, pivot)));
    if (!yaw && !pitch) return aimed;
    return fine(aimed);
  };
  const allowance = Math.max(length(tip, pivot) * 0.85, vlen(skull.a[0]));
  let map = aimedMap;
  if (horn && target) map = clearHorn(rig, basis, pivot, tip, target, allowance, map);
  if (body === 'squat-mage' && gaze && !target)
    map = throatLook(rig, basis, pivot, forward, gaze, vlen(skull.a[0]), yaw, pitch);
  const head = (t: string) =>
    /^(head|steam|horn[RL]?|eye[RL]|mandible[RL]|feeler[RL]|whisker[RL]|tongue|neckWattle|neckBeads|throatFold|fang|caughtCoin)$/.test(
      t,
    );
  transformPart(rig, head, map);
  if (silk) transformPart(rig, (t) => t === 'neck', map);
  else if (neck.length) {
    const start = neck[0].a,
      axis = vsub(pivot, start);
    const joints = [start, neck[0].b, neck[1]?.b ?? pivot, pivot];
    if (neckChain) neckChain[3] = map(pivot);
    const bend: MapPoint = neckChain
      ? followChain(joints, jointMaps(joints, neckChain))
      : (p) => vlerp(p, map(p), clamp(vdot(vsub(p, start), axis) / (vdot(axis, axis) || 1)));
    transformPart(rig, (t) => t === 'neck', bend);
  }
  if (rig.eye) rig.eye = map(rig.eye);
  for (const k of ['mouth', 'head', 'eye', 'vent', 'tongueTip', 'horn', 'hornTip'])
    if (points[k]) points[k] = map(points[k]);
  if (body === 'hexapod') points.weaponTip = points.horn;
}

export function poseAxial(body: BodyType, rig: Rig, points: Points, basis: F3, pose: JointPose): void {
  poseTail(body, rig, points, basis, pose);
  poseHead(body, rig, points, basis, pose);
}
