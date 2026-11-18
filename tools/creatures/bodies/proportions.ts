import { F3, type Rig, type V3, vadd, vmul, vsub } from '../rig/f15-rig';
import { toLocal } from './goals';
import { transformPrimitive } from './rig-transform';
import type { CreatureCard } from './card-data';

type Points = Record<string, V3>;
const groups = ['head', 'legs', 'arms', 'tail', 'wings', 'weapon'] as const;
type Group = (typeof groups)[number];

function groupOf(tag: string): Group | undefined {
  if (/^(head|mouth|horn[LR]|eye|feeler|whisker|crest|fang|mandible|throat)/.test(tag)) return 'head';
  if (/^(staff|weapon|horn$)/.test(tag)) return 'weapon';
  if (/^(leg|foot|left[012]|right[012])/.test(tag)) return 'legs';
  if (/^(arm|claw|fist)/.test(tag)) return 'arms';
  if (/^(tail|purse|tassel)/.test(tag)) return 'tail';
  if (/^(fin|wing|rightWing|leftWing)/.test(tag)) return 'wings';
}

/** Joint origins belong to the source anatomy: extremities grow out of the shoulder, wing
 * root or neck, while the three whole-body dimensions are measured from the floor. */
export function applyProportions(rig: Rig, points: Points, basis: F3, factors: CreatureCard['proportions']) {
  const length = factors.length ?? 1,
    width = factors.width ?? 1,
    height = factors.height ?? 1;
  const global = (p: V3) => {
    const [x, y, z] = toLocal(basis, p);
    return basis.p(x * length, y * width, z * height);
  };
  const active = groups.some((g) => (factors[g] ?? 1) !== 1);
  if (length === 1 && width === 1 && height === 1 && !active) return;
  const origins = new Map<string, V3>();
  const jointKey = (tag: string) => {
    const group = groupOf(tag);
    if (group === 'head' || group === 'tail') return group;
    if (group === 'wings') return /L$|^left/.test(tag) ? 'wingL' : 'wingR';
    return tag;
  };
  for (const q of rig.prims) {
    const tag = q.t ?? '',
      group = groupOf(tag);
    const key = jointKey(tag);
    if (origins.has(key) || !group) continue;
    const center = q.k === 0 ? q.c : q.k === 2 ? q.pts[0] : q.k === 3 ? q.p : q.a;
    const joint = group === 'weapon' ? (points.staffHand ?? center) : center;
    origins.set(key, joint);
  }
  const factor = (tag: string) => factors[groupOf(tag) ?? ''] ?? 1;
  const map = (tag: string, p: V3): V3 => {
    const pivot = origins.get(jointKey(tag));
    return global(pivot && factor(tag) !== 1 ? vadd(pivot, vmul(vsub(p, pivot), factor(tag))) : p);
  };
  for (const q of rig.prims) {
    const tag = q.t ?? '';
    transformPrimitive(q, (p) => map(tag, p), Math.sqrt(length * width) * factor(tag));
  }
  const owner = (k: string): string => {
    if (k === 'staffHand') return 'armR';
    if (k === 'vent' || k === 'mouth' || k === 'eye') return 'head';
    if (k === 'staffTip' || k === 'staffFoot') return 'staff';
    if (k === 'fist' || k === 'claw' || k === 'clawR' || k === 'clawL') return 'armR';
    if (k === 'tail') return 'tail';
    const leg = /^(left|right)([012])$/.exec(k);
    if (leg) return 'leg' + (leg[1] === 'left' ? 'L' : 'R') + leg[2];
    if (k === 'foot' || k === 'footR') return 'legR';
    if (k === 'footL') return 'legL';
    if (k === 'leftWing' || k === 'rightWing') return k === 'leftWing' ? 'wingL' : 'wingR';
    return k;
  };
  for (const [key, point] of Object.entries(points)) points[key] = map(owner(key), point);
  if (rig.eye) rig.eye = map('head', rig.eye);
}
