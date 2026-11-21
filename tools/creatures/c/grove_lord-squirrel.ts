import { F3, Rig, vadd, vlerp, type Mat, type V3 } from '../rig/f15-rig';
import { barkFlake } from '../bodies/kits/bark-moss';
import { hx } from '../kit/f11-mobkit';
import type { JointPose } from '../technique';

const ink: Mat = { T: ['#211b25', '#29222b', '#403134', '#574341'].map((color) => hx(color)) as Mat['T'] };
const swatch = (...tones: string[]): Mat => ({ T: tones.map((color) => hx(color)) as Mat['T'] });
const russet = swatch('#733d30', '#ab5035', '#d87540', '#ef9a55'),
  sepia = swatch('#553230', '#81382b', '#aa502c', '#c76b37'),
  ivory = swatch('#b39974', '#d5b891', '#f0d5af', '#ffebc8'),
  bud = swatch('#828956', '#a8b469', '#d7d992', '#fff1bd'),
  leaf = swatch('#394b3e', '#5d733d', '#839047', '#b2bb64'),
  nut = swatch('#563a2e', '#815237', '#b9864c', '#e2b16c');
const tau = 2 * Math.PI;
interface SquirrelPose {
  height: number;
  lean: number;
  look: number;
  arm: number;
  cheer: number;
  curl: number;
  sleep: number;
  nut: number;
}
const rest: SquirrelPose = { height: 0, lean: 0, look: 0, arm: 0, cheer: 0, curl: 0, sleep: 0, nut: 0 };
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const v = clamp(x);
  return v * v * (3 - 2 * v);
};
type SquirrelClip = { seconds: number; pose: (t: number) => SquirrelPose };
export const squirrelClips: Record<'peek' | 'throw' | 'cheer' | 'sleep', SquirrelClip> = {
  peek: {
    seconds: 2.4,
    pose: (t) => ({
      ...rest,
      height: 0.8 * Math.sin((t * tau) / 2.4),
      look: 0.16 * Math.sin((t * tau) / 2.4),
      curl: 0.13 * Math.sin((t * tau) / 2.4 - 0.72),
    }),
  },
  throw: {
    seconds: 1.35,
    pose: (t) => {
      const back = smooth(t / 0.43),
        release = smooth((t - 0.43) / 0.19),
        returning = smooth((t - 0.72) / 0.54);
      return {
        ...rest,
        height: back * 0.45,
        lean: (-0.34 * back + 0.84 * release) * (1 - returning),
        arm: (-1.8 * back + 8.5 * release) * (1 - returning),
        curl: -0.4 * back + 0.65 * release,
        nut: t < 0.65 ? 1 : 0,
      };
    },
  },
  cheer: {
    seconds: 1.15,
    pose: (t) => {
      const bounce = Math.sin((t * tau) / 1.15) ** 2;
      return {
        ...rest,
        height: 1.25 + bounce * 1.6,
        lean: -0.08,
        cheer: 0.7 + 0.3 * bounce,
        curl: 0.2 * Math.sin(((t - 0.12) * tau) / 1.15),
      };
    },
  },
  sleep: {
    seconds: 3.5,
    pose: (t) => ({
      ...rest,
      height: -2.4 + 0.13 * Math.sin((t * tau) / 3.5),
      lean: 0.25,
      look: -0.13,
      curl: 0.75,
      sleep: 1,
    }),
  },
};
const modes = ['peek', 'throw', 'cheer', 'sleep'] as const;
export function squirrelRig(socket: F3, controls: JointPose, t: number, crown: number, sleep: number) {
  const clip = modes[Math.max(0, Math.min(3, Math.round(controls.squirrelClip ?? (sleep > 0.8 ? 3 : 0))))];
  const anim = squirrelClips[clip],
    time = controls.squirrelTime ?? t;
  const p = anim.pose(time),
    r = new Rig(),
    base = socket.at(0, 0, (controls.squirrelUp ?? 0) + p.height).scale(1.12);
  const body = base.at(-0.65, 0, 1.2).pitch(p.lean);
  r.tag = 'squirrelBody';
  r.ell(body, [0, 0, 0.6], [3.1, 3.15, 3.85], russet);
  r.ell(body, [2.3, 0, 1.1], [1.5, 2.25, 2.9], ivory);
  for (const side of [-1, 1]) {
    r.ell(base, [-0.8, side * 1.82, -0.4], [2.35, 1.85, 2.15], russet);
    r.ell(base, [1.5, side * 2.05, -1.65], [2.2, 0.95, 0.79], sepia);
  }
  const head = body
    .at(1.9, 0, 4.65 - p.sleep * 2.8)
    .turn(p.look - 0.53)
    .pitch(0.39 * p.sleep);
  r.tag = 'squirrelHead';
  r.ell(head, [0.25, 0, 0], [3.45, 2.75, 2.8], russet);
  r.ell(head, [2.45, 0, -0.55], [2.25, 2, 1.4], ivory);
  r.ell(head, [4.35, 0, -0.15], [0.7, 1.03, 0.71], ink);
  for (const side of [-1, 1]) {
    const ear = head.p(-0.8, side * 1.68, 1.7);
    r.cap(ear, head.p(-1.1, side * 2.2, 4.4), 1.18, 0.38, russet);
    r.cap(head.p(-1.1, side * 2.2, 3.9), head.p(-1.3, side * 2.3, 5.25), 0.65, 0.13, sepia);
    r.ell(head, [1.45, side * 2.02, 0.77], [1.0, 0.71, p.sleep ? 0.18 : 1.05], ink);
    if (!p.sleep) r.dot(head.p(1.88, side * 2.46, 1.45), ivory.T[3], 0, 0.6);
  }
  r.tag = 'squirrelTail';
  const tail = base.at(-0.05, 1.35, -0.15).roll(0.21 + 0.35 * p.curl);
  const trail = [
    tail.o,
    tail.p(-1.22, 1.65, 2.4),
    tail.p(-1.42, 3.6, 6.3),
    tail.p(-0.72, 4.15, 9.65),
    tail.p(1.63, 3.65, 11.35),
    tail.p(2.95, 2.5, 9.78 - 2.1 * p.curl),
  ];
  if (p.sleep) {
    // While sleeping, the curling tip crosses the folded forepaws as a blanket.
    const folded = [
      tail.o,
      tail.p(-1.5, 1, 2),
      tail.p(-1.5, 3.1, 4.15),
      tail.p(0.51, 4.1, 5.1),
      tail.p(2.6, 3.9, 4.2),
      tail.p(4.5, 2.5, 2.45),
    ];
    trail.splice(0, trail.length, ...folded);
  }
  const radius = [1.7, 2.8, 3.45, 3.22, 2.35, 0.76];
  for (let i = 1; i < trail.length; i++) {
    r.cap(trail[i - 1], trail[i], radius[i - 1], radius[i], i === 1 ? sepia : russet);
    for (const side of [-1, 1]) {
      const start = vadd(vlerp(trail[i - 1], trail[i], 0.32), tail.v(-0.55, side * 1.75, 0.1));
      barkFlake(
        r,
        start,
        vadd(trail[i], tail.v(0.9, side * 1.4, 1.1)),
        tail.v(0.94, 0, 0),
        tail.v(0, 0.3 * side, 0.6),
        russet,
        sepia,
      );
    }
  }
  r.tag = 'squirrelPaw';
  let paw: V3 = body.o;
  for (const side of [-1, 1]) {
    const reach = side > 0 ? p.arm + (controls.squirrelReach ?? 0) : 0;
    const at = body.p(
      3.3 + reach + 0.8 * p.sleep,
      side * (2.2 + 0.6 * p.cheer),
      -0.2 + 4.8 * p.cheer + reach * 0.25 + 0.55 * p.sleep,
    );
    r.cap(body.p(0.6, side * 1.8, 2.85), at, 0.93, 0.6, russet);
    r.ell(new F3(at, body.f, body.s, body.u), [0.3, 0, 0], [1.02, 0.74, 0.65], ivory);
    if (side > 0) paw = at;
  }
  const seed = vadd(paw, body.v(1.7, 0.12, 0.25));
  if ((controls.squirrelNutHeld ?? p.nut) > 0.5) {
    r.tag = 'squirrelNut';
    const f = new F3(seed, body.f, body.s, body.u);
    r.ell(f, [0, 0, 0], [1.9, 1.5, 1.55], nut);
    r.line(f.p(1.5, -0.85, 0.7), f.p(-0.9, 1, 0.95), ink.T[2], 0, 0.42);
  }
  if (crown > 0.1) {
    r.tag = 'squirrelWreath';
    const k = Math.min(1, crown * 1.3);
    for (let i = 0; i < 8; i++) {
      const a = (i * tau) / 8,
        b = ((i + 1) * tau) / 8;
      r.cap(
        head.p(2.7 * Math.cos(a), 2.9 * Math.sin(a), 2.3),
        head.p(2.7 * Math.cos(b), 2.9 * Math.sin(b), 2.3),
        0.68 * k,
        0.68 * k,
        leaf,
      );
      if (i % 3 === 0) r.ball(head.p(2.9 * Math.cos(a), 3.0 * Math.sin(a), 3.15), 1.28 * k, bud);
    }
  }
  return {
    rig: r,
    points: { squirrelPaw: paw, squirrelNut: seed, squirrelHead: head.p(0, 0, 4.7), squirrelTail: trail.at(-1)! },
  };
}
