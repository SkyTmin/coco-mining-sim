// Planted toes stay on their patch of ground between take-offs and landings.
// The two feet alternate over a turn as well as over a straight stretch of the yard.
import { F3, vlerp, vsub, type V3 } from '../rig/f15-rig';
import { clips, poseAt } from './bell_magpie-keys';

export const toeRoot = (floor: F3, side: number) => floor.p(-0.27, side * 2.85, 0.68);
export function groundSteps(anim: string, yaw: number, scale: number) {
  const rows = Array.from({ length: Math.round(clips[anim].seconds * 24) }, (_, n) => {
    const p = poseAt(anim, n / 24),
      angle = yaw + (p.turn ?? 0);
    const offset: V3 = [(p.x ?? 0) / scale, (p.y ?? 0) / (0.6 * scale), 0];
    const floor = F3.yaw(angle, offset);
    return { angle, offset, air: (p.alt ?? 0) > 0, feet: [toeRoot(floor, -1), toeRoot(floor, 1)] };
  });
  const out = rows.map((row) => row.feet.map((foot) => vsub(foot, row.offset)));
  const distance = [0];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1],
      b = rows[i];
    const move =
      a.air || b.air
        ? 0
        : Math.hypot(b.offset[0] - a.offset[0], b.offset[1] - a.offset[1]) + Math.abs(b.angle - a.angle) * 3.1;
    distance.push(distance[i - 1] + move);
  }
  let start = 0;
  while (start < rows.length - 1) {
    let end = start;
    while (end + 1 < rows.length && distance[end + 1] - distance[end] > 0.001) end++;
    if (end > start) {
      const total = distance[end] - distance[start],
        pairs = Math.max(1, Math.round(total / 5.0));
      const at = (phase: number, side: number): V3 => {
        const d = distance[start] + Math.min(phase / pairs, 1) * total;
        let i = start;
        while (i < end && distance[i + 1] < d) i++;
        if (i === end) return rows[end].feet[side];
        return vlerp(
          rows[i].feet[side],
          rows[i + 1].feet[side],
          (d - distance[i]) / (distance[i + 1] - distance[i]),
        );
      };
      for (let n = start; n <= end; n++)
        for (const side of [0, 1]) {
          const phase = ((distance[n] - distance[start]) / total) * pairs;
          let foot = at(0, side),
            height = 0;
          for (let pair = 0; pair < pairs; pair++) {
            const from = pair + side * 0.5,
              to = from + 0.5;
            if (phase <= from) break;
            const target = at(pair === pairs - 1 ? pairs : to + 0.25, side);
            if (phase >= to) {
              foot = target;
              continue;
            }
            const u = 2 * (phase - from);
            foot = vlerp(foot, target, u * u * (3 - 2 * u));
            height = Math.min(2.6, total * 0.24) * Math.sin(Math.PI * u);
            break;
          }
          out[n][side] = vsub(foot, rows[n].offset);
          out[n][side][2] += height;
        }
    }
    start = end + 1;
  }
  return out;
}
