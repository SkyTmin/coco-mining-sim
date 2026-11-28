// Painting vocabulary for fx/sim.ts. All ink is opaque or genuinely alpha-blended on Pen;
// radiance goes through the separate additive surface.
import { ellFill, shard } from './field';
import { glow, pointLight } from './light';
import type { SimSnapshot } from './sim';
import type { FxInput } from '../types';

export function drawSim(f: Pick<FxInput, 'under' | 'above' | 'light'>, frame: SimSnapshot) {
  for (const q of frame.particles) {
    const p = f[q.layer], { x, y, size, ramp } = q;
    const age = frame.time - q.birth, u = Math.min(1, Math.max(0, age / q.life)), k = 1 - u;
    const fade = Math.min(1, 4 * k), hot = Math.round(5 * k);
    const dx = Math.cos(q.angle), dy = Math.sin(q.angle);
    const dot = (xx: number, yy: number, col: string, a = fade) => {
      p.col(col, a);
      p.dot(Math.round(xx), Math.round(yy));
    };
    switch (q.kind) {
      case 'spark':
      case 'streak':
      case 'mote': {
        const speed = Math.hypot(q.vx, q.vy);
        const length = Math.min(q.kind === 'mote' ? 11 * frame.scale : 8 * frame.scale,
          size + speed * (q.kind === 'streak' ? .033 : .021));
        const tx = speed ? q.vx / speed * length : 0, ty = speed ? q.vy / speed * length : 0;
        p.col(ramp[Math.max(0, hot - 2)], fade * .72);
        p.line(x - tx, y - ty, x, y);
        p.col(ramp[hot], fade);
        p.line(x - tx * .38, y - ty * .38, x, y);
        glow(f.light, x, y, size + 2 * frame.scale, ramp[hot], .4 * k);
        break;
      }
      case 'dust':
      case 'vapour':
      case 'smoke': {
        const radius = size * (.62 + .92 * u);
        const shallow = q.kind === 'dust' ? .54 : .87;
        const a = Math.min(1, (u + .02) * 10) * Math.min(1, k * 2.2) * (q.kind === 'vapour' ? .33 : .6);
        const middle = Math.max(1, Math.round(3 * k));
        ellFill(p, [x, y], radius, radius * shallow, ramp[middle - 1], a * .52);
        ellFill(p, [x, y + .11 * radius], radius * .75, radius * shallow * .69, ramp[middle], a * .8);
        if (q.kind !== 'dust')
          ellFill(p, [x - .20 * radius, y - .33 * radius], radius * .57, radius * .38, ramp[middle + 2], a * .64);
        break;
      }
      case 'fire': {
        const r = size * (.55 + .45 * Math.min(1, age * 18)) * (1 - u * .42);
        ellFill(p, [x, y], r, .84 * r, ramp[Math.max(0, hot - 2)], fade);
        ellFill(p, [x - r * .13, y - r * .32], r * .67, r * .93, ramp[hot], fade);
        dot(x - r * .2, y - r * .3, ramp[Math.min(5, hot + 1)]);
        glow(f.light, x, y, r * 2.7, ramp[hot], .33 * k);
        break;
      }
      case 'ember':
      case 'brand': {
        const edge = Math.max(0, hot - 2);
        const flicker = .84 + .16 * Math.cos(age * 30 + q.phase);
        dot(x, y, ramp[edge], fade);
        if (size >= 1.3) dot(x + 1, y - (q.rest ? 0 : 1), ramp[Math.max(1, hot - 1)]);
        if (q.kind === 'brand') ellFill(p, [x, y - size * .36], size, size * .72, ramp[edge], fade);
        dot(x, y - (size > 2 ? 1 : 0), ramp[hot], fade * flicker);
        glow(f.light, x, y, 2.2 * frame.scale + size * 1.2, ramp[hot], .44 * k * flicker);
        break;
      }
      case 'flake': {
        const radius = Math.max(0, Math.round(size * .65));
        p.col(ramp[3], fade * .8);
        p.line(x - dx * radius, y - dy * radius, x + dx * radius, y + dy * radius);
        if (size > 2) p.line(x - dy * radius * .75, y + dx * radius * .75, x + dy * radius * .75, y - dx * radius * .75);
        dot(x, y, ramp[5]);
        break;
      }
      case 'star': {
        const arm = Math.round(size * (.68 + .32 * Math.sin(age * 13 + q.phase)) * fade);
        p.col(ramp[3], fade);
        p.line(x - arm, y, x + arm, y);
        p.line(x, y - arm, x, y + arm);
        dot(x, y, ramp[5]);
        pointLight(f.light, x, y, ramp, .7 * fade);
        glow(f.light, x, y, size * 2.8, ramp[4], .28 * k);
        break;
      }
      case 'shard': {
        const cy = y - (q.rest ? Math.abs(dy) * size : 0);
        shard(p, x, cy, dx * size, dy * size, size * .27, ramp[4], ramp[1], fade);
        dot(x + dx * size, cy + dy * size, ramp[5]);
        break;
      }
      case 'chunk': {
        // Two rotating faces retain a fixed top-left light and distinct outline.
        const r = Math.max(.7, size);
        const cy = y - (q.rest ? Math.floor(r * Math.max(Math.abs(dy), .7 * Math.abs(dx))) : 0);
        for (let yy = -Math.ceil(r); yy <= Math.ceil(r); yy++) {
          for (let xx = -Math.ceil(r); xx <= Math.ceil(r); xx++) {
            const along = xx * dx + yy * dy, across = -xx * dy + yy * dx;
            const d = (Math.abs(along) + Math.abs(across) / .7) / r;
            if (d <= 1) dot(x + xx, cy + yy, ramp[d > .83 ? 0 : xx + yy < -.15 * r ? 5 : across < 0 ? 3 : 1]);
          }
        }
        break;
      }
      case 'drip': {
        const r = Math.max(.65, size), h = q.rest ? .35 * r : r * (1.1 + Math.min(.7, Math.abs(q.vy) / 200));
        ellFill(p, [x, y - h], q.rest ? 1.4 * r : r * .7, h, ramp[3], .82 * fade);
        if (!q.rest) {
          p.col(ramp[2], .64 * fade);
          p.line(x, y - h, x - dx * r * .7, y - h * (1.7 + .25 * dy));
        }
        dot(x, y - h * 1.5, ramp[5], .8 * fade);
        break;
      }
      case 'grit': {
        const width = Math.max(1, Math.round(size));
        p.col(ramp[1], fade);
        p.rect(Math.round(x), Math.round(y) - width + 1, width, width);
        dot(x, y - width + 1, ramp[q.rest ? 3 : 5]);
        break;
      }
    }
  }
}
