import type { Pen } from '../fx/pen';
import { hash, TAU } from '../kit/f11-mobkit';
import type { FxInput, XY } from '../types';
import { beats } from './river_otter-poses';

const water = ['#366b74', '#76a9a7', '#b8d7c7', '#eee9c9'];
function ripple(p: Pen, at: XY, age: number, duration: number, radius: number) {
  if (age < 0 || age >= duration) return;
  const u = age / duration, r = 3 + Math.sqrt(u) * radius;
  for (let i = 0; i < 56; i++) {
    if (i % 14 < 3) continue;
    const a = TAU * i / 56, b = TAU * (i + 1) / 56;
    p.col(i < 28 ? water[2] : water[0], (1 - u) * 0.85);
    p.line(Math.round(at[0] + r * Math.cos(a)), Math.round(at[1] + r * 0.26 * Math.sin(a)),
      Math.round(at[0] + r * Math.cos(b)), Math.round(at[1] + r * 0.26 * Math.sin(b)));
  }
}
function spray(p: Pen, at: XY, age: number, count: number, speed: number, bias: number, seed: number) {
  for (let i = 0; i < count; i++) {
    const u = (age - (i % 3)) / (10 + i % 6);
    if (u < 0 || u >= 1) continue;
    const x = at[0] + ((hash(i, 11, seed) - 0.5) * 2 + bias) * speed * u;
    const y = at[1] - (0.35 + hash(i, 17, seed)) * speed * 3.4 * u * (1 - u);
    p.col(water[1 + i % 3], 1 - u * u);
    p.rect(Math.round(x), Math.round(y), 1 + Number(i % 5 === 0), 1 + Number(u > 0.4 && i % 3 === 0));
  }
}

export function otterEffects(f: FxInput) {
  const n = f.t * 24, at = (frame: number, part: string) => f.pointAt(frame / 24, part);
  const splash = (frame: number, part: string, count: number, speed: number, bias: number) => {
    const age = n - frame;
    if (age < 0 || age > 20) return;
    const origin = at(frame, part);
    ripple(f.under, origin, age, 20, speed * 0.85);
    spray(f.above, origin, age, count, speed, bias, frame);
  };
  if (f.anim === 'trick') {
    for (const frame of [beats.trick.noseCatch, beats.trick.pawCatch]) {
      const age = n - frame;
      if (age < 0 || age > 5) continue;
      const [x, y] = f.points.stone;
      f.above.col('#fff4ce', 1 - age / 6);
      for (const sign of [-1, 1]) {
        const start = 5 + age * 0.7;
        f.above.line(Math.round(x + sign * start), Math.round(y - 3 - age * 0.3),
          Math.round(x + sign * (start + 2)), Math.round(y - 5 - age * 0.3));
      }
    }
  } else if (f.anim === 'trick_b') {
    // The bow wave peels out either side of the moving chest. Old ripples use the floor contact at that instant.
    if (n >= 42 && n < 67) {
      const [x, y] = f.points.belly;
      const [tx, ty] = f.points.tailBase;
      const dx = tx - x, dy = ty - y, len = Math.max(1, Math.hypot(dx, dy));
      const alpha = Math.min(1, (n - 42) / 6, (67 - n) / 8);
      for (const side of [-1, 1]) {
        const vx = -side * dy / len, vy = side * dx / len;
        for (let k = 0; k < 9; k++) {
          const u = k / 9, w = 5.5 + u * 11;
          const ox = x + dx * u + vx * w, oy = y + dy * u + vy * w * 0.5;
          f.under.col(water[1 + k % 3], alpha * (1 - 0.63 * u));
          f.under.rect(Math.round(ox), Math.round(oy), 2 + k % 2, 1);
        }
      }
    }
    for (const frame of [47, 51, 55]) splash(frame, 'belly', 13, 12, -0.7);
    splash(beats.trick_b.brake, 'tailTip', 24, 20, -0.35);
    const brakeAge = n - beats.trick_b.brake;
    if (brakeAge >= 0 && brakeAge < 14) {
      const contact = at(beats.trick_b.brake, 'tailTip');
      ripple(f.above, contact, brakeAge, 14, 14);
      if (brakeAge < 6) {
        f.above.col(water[3], 1 - brakeAge / 7);
        for (const s of [-1, 1]) f.above.line(Math.round(contact[0] + s * (3 + brakeAge)), Math.round(contact[1]),
          Math.round(contact[0] + s * (6 + brakeAge)), Math.round(contact[1] - 2 - brakeAge));
      }
    }
    for (const [frame, foot] of [[73, 'footL'], [77, 'footR'], [82, 'footL'], [87, 'footR']] as const)
      splash(frame, foot, 11, 8, 0.55);
  } else if (f.anim === 'hatch') {
    const surface = f.points.surfaceHead;
    if (n < 18) ripple(f.under, surface, n + 3, 22, 18);
    if (n < 10) {
      for (let i = 0; i < 3; i++) {
        const x = Math.round(surface[0] - 4 + i * 3.5);
        const y = Math.round(surface[1] + (i % 2) * 2 - (n % 6) * 0.5);
        f.above.col(water[0], (10 - n) / 10); f.above.rect(x, y, 3, 2);
        f.above.col(water[3], (10 - n) / 10); f.above.rect(x, y - 1, 2, 1);
      }
    }
    splash(beats.hatch.surface, 'surfaceHead', 12, 9, 0);
    if (n >= beats.hatch.shake && n <= beats.hatch.shake + 15)
      spray(f.above, at(beats.hatch.shake, 'head'), n - beats.hatch.shake, 10, 13, 0, 29);
  }
}
