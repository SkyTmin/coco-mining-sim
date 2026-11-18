// Bind each pilot's original capsules and their attached skin to the common arm/foot controls.
import { F3, type Rig, type V3, vadd, vdot, vlen, vlerp, vmul, vsub } from '../rig/f15-rig';
import type { JointPose } from '../technique';
import { collisionShell, goalAt, segmentClearance, solveReach, toLocal, type SolvedReach } from './goals';
import { rotateFromTo, transformPart } from './rig-transform';
import type { PilotFamily } from './families';

type Points = Record<string, V3>;
type Chain = SolvedReach;
const labels = ['handL', 'handR', 'footL', 'footR'] as const;
type Limb = (typeof labels)[number];

function part(body: PilotFamily, name: Limb) {
  const side = name.endsWith('R') ? 'R' : 'L';
  if (body === 'long-flier') return 'fin' + side;
  if (body === 'hexapod') return 'leg' + side + (name.startsWith('hand') ? '0' : '2');
  return (name.startsWith('hand') ? 'arm' : 'leg') + side;
}

export function readChain(rig: Rig, body: PilotFamily, points: Points, name: Limb): Chain | undefined {
  const segment = part(body, name);
  const caps = rig.prims.filter((q) => q.k === 1 && q.t === segment);
  if (body === 'squat-mage' && name.startsWith('foot') && caps[0]?.k === 1) {
    return { shoulder: caps[0].a, elbow: caps[0].b, hand: points[name] };
  }
  for (let i = 1; i < caps.length; i++) {
    const upper = caps[i - 1],
      lower = caps[i];
    if (upper.k === 1 && lower.k === 1 && vlen(vsub(upper.b, lower.a)) < 0.01)
      return { shoulder: upper.a, elbow: upper.b, hand: lower.b };
  }
}

function extremity(rig: Rig, match: (tag: string) => boolean, axis: V3) {
  let best: V3 | undefined,
    score = -Infinity;
  for (const q of rig.prims) {
    if (!match(q.t ?? '')) continue;
    let points: V3[];
    if (q.k === 0) {
      // Exact support of the oriented ellipsoid in this direction.
      const projections = q.a.map((v) => vdot(v, axis));
      const norm = Math.hypot(...projections) || 1;
      points = [q.a.reduce((p, v, i) => vadd(p, vmul(v, projections[i] / norm)), q.c)];
    } else if (q.k === 2) points = q.pts;
    else if (q.k === 3) points = [q.p];
    else points = [q.a, q.b];
    for (const p of points)
      if (vdot(p, axis) > score) {
        score = vdot(p, axis);
        best = p;
      }
  }
  return best;
}

/** Only anatomically present points become sockets. In the flying ribbon the fins serve as extremities. */
export function standardSockets(body: PilotFamily, rig: Rig, points: Points, basis: F3) {
  for (const name of labels) {
    if (points[name]) continue;
    const s = name.endsWith('R') ? 'R' : 'L';
    if (body === 'long-flier') points[name] = points['fin' + s];
    else if (body === 'hexapod')
      points[name] = points[(s === 'R' ? 'right' : 'left') + (name.startsWith('hand') ? '0' : '2')];
    else {
      const tip = name === 'handR' && (points.staffHand || points.fist || points.claw);
      const endpoint = tip || readChain(rig, body, points, name)?.hand;
      if (!endpoint) throw RangeError(body + ' has no exposed ' + name + ' in this pose');
      points[name] = endpoint;
    }
  }
  const nose = extremity(rig, (tag) => tag === 'head', basis.f);
  points.mouth ??= body === 'giant' ? points.vent : (points.head ?? nose);
  points.head ??= points.mouth;
  if (points.horn) points.hornTip = points.horn;
  points.tailTip =
    points.tail ??
    extremity(rig, (tag) => ['torso', 'abdomen', 'cloak'].includes(tag), vmul(basis.f, -1)) ??
    points.head;
  points.weaponTip =
    points.staffTip ?? points.horn ?? (body === 'long-flier' ? points.tail : (points.fist ?? points.claw));
  for (const [alias, name] of [
    ['foreL', 'handL'],
    ['foreR', 'handR'],
    ['hindL', 'footL'],
    ['hindR', 'footR'],
    ['armL', 'handL'],
    ['armR', 'handR'],
    ['legL', 'footL'],
    ['legR', 'footR'],
  ])
    points[alias] = points[name];
}

/** Rigidly rotate each of the two bones; the wrist and foot retain their authored tip offset. */
export function retarget(chain: Chain, solved: Chain) {
  const segment = (root: V3, joint: V3, nextRoot: V3, nextJoint: V3) => {
    const vec = vsub(joint, root),
      rotate = rotateFromTo(vec, vsub(nextJoint, nextRoot));
    return (point: V3) => {
      const along = Math.max(0, Math.min(1, vdot(vsub(point, root), vec) / (vdot(vec, vec) || 1)));
      return {
        along,
        distance: vlen(vsub(point, vlerp(root, joint, along))),
        at: vadd(nextRoot, rotate(vsub(point, root))),
      };
    };
  };
  const upper = segment(chain.shoulder, chain.elbow, solved.shoulder, solved.elbow);
  const lower = segment(chain.elbow, chain.hand, solved.elbow, solved.hand);
  return (point: V3) => {
    const a = upper(point),
      b = lower(point);
    if (a.distance < b.distance) return a.at;
    const wrist = Math.min(1, Math.max(0, (b.along - 0.72) / 0.18));
    return vlerp(b.at, vadd(solved.hand, vsub(point, chain.hand)), wrist);
  };
}

function solveArm(rig: Rig, basis: F3, chain: Chain, side: number, target: V3) {
  const upper = vlen(vsub(chain.elbow, chain.shoulder)),
    lower = vlen(vsub(chain.hand, chain.elbow));
  return solveReach({
    shoulder: chain.shoulder,
    upper,
    lower,
    basis,
    side,
    target,
    shell: collisionShell(rig),
    maxAdvance: (upper + lower) * 0.42,
  });
}

export function poseLimbs(body: PilotFamily, rig: Rig, points: Points, basis: F3, pose: JointPose) {
  const owner = (socket: string): Limb | undefined => {
    if (socket === 'weaponTip' || socket === 'fist' || socket === 'claw' || socket === 'staffTip')
      return ['giant', 'winged-dragon', 'squat-mage'].includes(body) ? 'handR' : undefined;
    const alias = /^(hand|foot|fore|hind|arm|leg)([LR])$/.exec(socket);
    return alias
      ? (((['foot', 'hind', 'leg'].includes(alias[1]) ? 'foot' : 'hand') + alias[2]) as Limb)
      : undefined;
  };
  const keys = Object.keys(pose).flatMap((k) => /^goal\.(.+)\.weight$/.exec(k)?.[1] ?? []);
  for (const name of labels) {
    if (body === 'squat-mage' && name.startsWith('hand')) continue;
    const control = (name.startsWith('foot') ? 'leg' : 'arm') + name.slice(-1);
    const socket = keys.find((s) => owner(s) === name && (pose['goal.' + s + '.weight'] ?? 0) > 0);
    const requested = socket && goalAt(pose, socket, toLocal(basis, points[socket] ?? points[name]));
    const manual: V3 = [
      pose[control + '.forward'] ?? 0,
      pose[control + '.right'] ?? 0,
      pose[control + '.up'] ?? 0,
    ];
    if (!requested && !vlen(manual)) continue;
    const contact = (socket && points[socket]) || points[name],
      dest = requested ? basis.p(...requested) : contact;
    const target = requested ? dest : vadd(dest, basis.v(...manual));
    const group = part(body, name),
      match = (tag: string) => tag === group;
    const aliases = Object.entries(points)
      .filter(([, p]) => p === contact || p === points[name])
      .map(([key]) => key);
    if (body === 'long-flier') {
      const pointsOnFin = rig.prims.filter((q) => q.t === group && q.k === 2);
      const vertices = pointsOnFin.flatMap((q) => (q.k === 2 ? q.pts : []));
      const root = vertices.reduce(
        (a, b) => (Math.abs(toLocal(basis, b)[1]) < Math.abs(toLocal(basis, a)[1]) ? b : a),
        contact,
      );
      const armVector = vsub(contact, root),
        targetVector = vsub(target, root);
      if (
        vlen(targetVector) > vlen(armVector) * 1.3 ||
        segmentClearance(collisionShell(rig), root, target) < 0.75
      )
        throw RangeError('Fin goal is outside its membrane reach');
      const rotate = rotateFromTo(armVector, targetVector),
        scale = vlen(targetVector) / vlen(armVector);
      const map = (p: V3) => vadd(root, vmul(rotate(vsub(p, root)), scale));
      transformPart(rig, match, map);
      for (const alias of aliases) points[alias] = map(points[alias]);
      continue;
    }
    const chain = readChain(rig, body, points, name);
    if (!chain) throw RangeError(body + ' has no articulated ' + group + ' in this pose');
    const solved = solveArm(
      rig,
      basis,
      chain,
      name.endsWith('R') ? 1 : -1,
      vsub(target, vsub(contact, chain.hand)),
    );
    if (name.startsWith('hand')) {
      const side = name.slice(-1);
      points['shoulder' + side] = solved.shoulder;
      points['elbow' + side] = solved.elbow;
    }
    const map = retarget(chain, solved);
    transformPart(rig, match, map);
    for (const alias of aliases) points[alias] = vadd(points[alias], vsub(solved.hand, chain.hand));
  }
}
