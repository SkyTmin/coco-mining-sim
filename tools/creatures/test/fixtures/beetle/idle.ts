// Idle-only excerpt of SkyTmin/coco-instruments f11-mob-beetle.ts at 523bae1.
// Uses the ported frame, two-link IK, materials and depth raster. MIT, see rig/LICENSE.
import { F3, Rig, proj, renderRig } from '../../../rig/f15-rig.ts';
import type { Mat, V3 } from '../../../rig/f15-rig.ts';
import { hx, ik, INK, tn, vadd, WHITE } from '../../../kit/f11-mobkit.ts';

const shell = tn('#7a4814', '#b07226', '#d8983a', '#f2c46e');
const gold = tn('#b88a18', '#f4c838', '#ffe878', '#fffbe0');
const steel = tn('#101a26', '#1a2a3a', '#2a4a6a', '#4a6e94');
const joint: Mat = { T: steel, spec: true };
const coin: Mat = { T: gold, spec: true };
const slot = hx('#2e1e06');
const carapace: Mat = {
  T: shell, spec: true,
  pat: (q, light) => {
    if (Math.abs(q[1]) < 0.1 && q[0] > -0.3 && q[0] < 0.45 && q[2] > 0.6) return slot;
    if (q[0] < -0.3 && Math.abs(q[1]) < 0.055 && q[2] > 0.2) return shell[0];
    if (Math.abs(q[2] - 0.1) < 0.06) return light > 0.5 ? shell[1] : shell[0];
    return null;
  },
};

export function makeIdle(frame: number, side: number) {
  const angle = side * Math.PI / 4;
  const base = F3.yaw(Math.atan2(Math.sin(angle), 0.6 * Math.cos(angle)));
  const a = frame * Math.PI / 4;
  const upright = base.at(0, 0, 2.8 + 0.25 * Math.sin(a));
  const body = upright.pitch(0.04 * Math.sin(a + 1));
  const twitch = [0, 0.5, 1.4, 0.9, 0, 0, -1.2, -0.5][frame];
  const bob = [0, 0, 0, 0, 0.6, 0.25, 0, 0][frame];
  const rig = new Rig();
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      const hip = body.p([2.4, 0.3, -2][i], s * 2, 0.2);
      const foot = base.p([4.8, 0.6, -3.8][i], s * 5.4, 0);
      const knee = ik(hip, foot, 3, 3.9, vadd(body.v(0, s, 0), [0, 0, 1]));
      rig.cap(hip, knee, 0.6, 0.5, joint).cap(knee, foot, 0.5, 0.4, joint);
    }
  }
  rig.ell(body, [-0.6, 0, 0.9], [5, 3.6, 1.5], { ...joint, bias: -0.1 });
  rig.ell(body, [4.2, 0, 1.5], [1.9, 2.8, 1.9], joint);
  rig.ell(body, [6, 0, 1.1], [1.4, 1.9, 1.4], { ...joint, bias: 0.05 });
  for (const s of [-1, 1]) rig.dot(body.p(6.8, s * 1.3, 1.6), hx('#ffd040'), 0.6, 1, 0.8);
  rig.eye = body.p(7, 0, 1.6);
  for (const s of [-1, 1]) {
    const end = body.p(9.2 + 0.5 * Math.sin(a), s * 2.6, 4.4 + 0.6 * Math.sin(a + 1) - s * twitch);
    rig.cap(body.p(6.9, s * 0.8, 1.9), end, 0.26, 0.22, joint).ball(end, 0.6, coin);
  }
  rig.ell(body, [-0.6, 0, 1.8], [5.6, 4.4, 3.4], carapace);
  const cx = -0.6 + 0.08 * 5.6, cz = 1.8 + 3.4 + 0.9 + bob;
  rig.ell(F3.yaw(0, body.p(cx, 0, cz)), [0, 0, 0], [1.75, 0.45, 1.6], { ...coin, bias: 0.15 });

  const image = renderRig(rig, 48, 40, 24, 28, { outline: INK, inner: 2.2 });
  const highlight = (point: V3, color: typeof WHITE) => {
    const [x, y] = proj(point, 24, 28);
    if (image.p.get(Math.round(x), Math.round(y))[3]) image.p.set(x, y, color);
  };
  highlight(upright.p(-0.6 + 5.6 * (0.55 - 1.1 * frame / 8), -1.2, 1.8 + 3.4 * 0.8), WHITE);
  const top = upright.p(cx, 0, cz);
  highlight([top[0] - 0.6, top[1], top[2] + 0.7], hx('#fffbe0'));
  return image;
}
