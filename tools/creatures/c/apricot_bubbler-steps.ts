import { SE } from '../rig/f15-rig';
import { ease } from './painted-toys';
import { clips, pose, scale, yaw } from './apricot_bubbler-poses';

type Ground = { x: number; y: number; angle: number };
type Plant = Ground & { lift: number };
function nominal(root: Ground, front: number, side: number): Plant {
  const a = root.angle,
    c = Math.cos(a),
    s = Math.sin(a);
  return {
    x: root.x + front * 7.65 * c - side * 6.02 * s,
    y: root.y + front * 7.65 * s + side * 6.02 * c,
    angle: a,
    lift: 0,
  };
}
function mixPlant(a: Plant, b: Plant, u: number): Plant {
  const da = b.angle - a.angle;
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    angle: a.angle + Math.atan2(Math.sin(da), Math.cos(da)) * u,
    lift: a.lift + (b.lift - a.lift) * u,
  };
}
const names = ['trick', 'trick_b', 'fidget_b'] as const;
function choreograph(name: (typeof names)[number]) {
  const count = Math.round(clips[name].seconds * 24);
  const roots = Array.from({ length: count }, (_, n): Ground => {
    const q = pose(name, n / 24);
    return { x: q.x / scale, y: q.y / (SE * scale), angle: yaw + (q.p.yaw ?? 0) };
  });
  const distance = [0];
  for (let n = 1; n < count; n++) {
    const a = roots[n - 1],
      b = roots[n];
    distance.push(distance[n - 1] + Math.hypot(b.x - a.x, b.y - a.y) + 7.4 * Math.abs(b.angle - a.angle));
  }
  const feet = new Map<number, Plant[]>();
  for (const front of [-1, 1])
    for (const side of [-1, 1]) {
      const poses = roots.map((root) => nominal(root, front, side));
      feet.set(front * 3 + side, poses);
      let end = 0;
      while (end < count - 1) {
        let start = end;
        while (start < count - 1 && distance[start + 1] - distance[start] < 0.00001) start++;
        if (start === count - 1) break;
        end = start + 1;
        while (end < count - 1 && distance[end + 1] - distance[end] >= 0.00001) end++;
        const length = distance[end] - distance[start];
        // At each pause both diagonal pairs have finished their last step and can stand still.
        const steps = Math.max(2, 2 * Math.round(length / 8.5)),
          parity = front * side > 0 ? 0 : 1;
        const shoeAt = (fraction: number) => {
          const wanted = distance[start] + length * Math.min(1, fraction);
          let right = start;
          while (right < end && distance[right] < wanted) right++;
          if (right === start) return nominal(roots[start], front, side);
          const u = (wanted - distance[right - 1]) / (distance[right] - distance[right - 1]);
          return mixPlant(nominal(roots[right - 1], front, side), nominal(roots[right], front, side), u);
        };
        let plant = nominal(roots[start], front, side);
        for (let step = 0; step < steps; step++) {
          const moves = step % 2 === parity;
          const next = moves ? shoeAt(step >= steps - 2 ? 1 : (step + 1.5) / steps) : plant;
          for (let n = start; n <= end; n++) {
            const phase = ((distance[n] - distance[start]) * steps) / length - step;
            if (phase < -0.000001 || phase > 1.000001) continue;
            const value = mixPlant(plant, next, ease(0, 1, phase));
            value.lift = moves
              ? Math.min(3.55, (length / steps) * 0.7) *
                Math.sin(Math.PI * Math.max(0, Math.min(1, phase))) ** 2
              : 0;
            poses[n] = value;
          }
          plant = next;
        }
      }
    }
  return { roots, feet };
}
const dances = new Map(names.map((name) => [name, choreograph(name)]));
export function authoredFoot(anim: string, t: number, front: number, s: number): Plant | undefined {
  const dance = dances.get(anim as (typeof names)[number]);
  if (!dance) return;
  const n = Math.max(0, Math.min(dance.roots.length - 1, t * 24)),
    lo = Math.floor(n),
    hi = Math.ceil(n),
    u = n - lo;
  const path = dance.feet.get(front * 3 + s)!,
    shoe = mixPlant(path[lo], path[hi], u);
  // World contacts are stationary during stance. Only convert to the moving sprite at the end.
  shoe.x -= dance.roots[lo].x + (dance.roots[hi].x - dance.roots[lo].x) * u;
  shoe.y -= dance.roots[lo].y + (dance.roots[hi].y - dance.roots[lo].y) * u;
  return shoe;
}
