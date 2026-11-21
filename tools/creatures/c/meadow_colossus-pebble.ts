import { heavySkeleton, type HeavySkeleton } from '../bodies/heavy-quadruped';
import { readCreatureCard } from '../bodies/card-data';
import { F3, vadd, vlerp, type V3 } from '../rig/f15-rig';
import { trick } from './meadow_colossus-actions';
import { meadowHeadFrame, meadowNose } from './meadow_colossus-stance';

const radius = 2.3;
const contact = (tip: V3): V3 => vadd(tip, [0, 0, radius]);
let flight: [V3, V3] | undefined;

/** Flight is sampled on a fixed world-space parabola. Chest movement after release
 * cannot pull the loose stone back to the nose or drag the apex with the neck. */
function flightEndpoints(rest: V3): [V3, V3] {
  if (flight) return flight;
  const card = readCreatureCard('meadow_colossus');
  const skeletonAt = (index: number) =>
    heavySkeleton('gesture', 0, 0, trick[index][1], 0, { ...card.life, yaw: 0 }, card.proportions);
  const takeoff = skeletonAt(2);
  const nose = meadowNose(meadowHeadFrame(takeoff));
  const catchPose = skeletonAt(4);
  const catchPoint = catchPose.body.p(
    rest[0] + (catchPose.pose['rock.forward'] ?? 0),
    rest[1] + (catchPose.pose['rock.side'] ?? 0),
    rest[2] + (catchPose.pose['rock.up'] ?? 0),
  );
  return (flight = [contact(nose), catchPoint]);
}
export function meadowPebble(s: HeavySkeleton, rest: V3): F3 {
  const raw = s.body.at(
    rest[0] + (s.pose['rock.forward'] ?? 0),
    rest[1] + (s.pose['rock.side'] ?? 0),
    rest[2] + (s.pose['rock.up'] ?? 0),
  );
  const frame = s.pose['rock.frame'] ?? 0,
    grip = s.pose['rock.grip'] ?? 0;
  let center = raw.o;
  if (frame > 22 && frame < 36) {
    const [from, to] = flightEndpoints(rest),
      u = (frame - 22) / 14;
    const p = vlerp(from, to, u);
    p[2] += 4 * 9.5 * u * (1 - u);
    center = s.root.p(...p);
  } else if (grip > 0) center = vlerp(center, contact(s.points.noseTip), grip);
  return new F3(center, raw.f, raw.s, raw.u);
}
