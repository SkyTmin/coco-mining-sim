// A weathered survey mast marks the edge of the marshal's ice parade ground.
import polarNight from './polar_night';
import { hx } from '../kit/f11-mobkit';
import type { Scene } from '../types';

const paint: Scene = (p, t) => {
  polarNight(p, t);
  for (const [x, y, h] of [
    [15, 75, 27],
    [143, 70, 20],
  ]) {
    p.line(x, y, x, y - h, hx('#374754'));
    p.line(x + 1, y - 1, x + 1, y - h + 1, hx('#85939a'));
    for (let j = 0; j < 10; j++) {
      const top = y - h + Math.round(1.5 * Math.sin((t * Math.PI * 2) / 3 - j * 0.43));
      p.line(x - j, top, x - j, top + Math.floor((10 - j) * 0.48), hx(j < 3 ? '#9e8e85' : '#735c65'));
    }
    p.line(x - 3, y + 1, x + 5, y + 1, hx('#607987'));
  }
};
paint.front = [
  {
    id: 'parade-boundary-ice',
    depth: 119,
    paint(p) {
      // Slivers of rafted blue ice at the near left corner of the parade ground.
      for (const [x, y, h, w] of [
        [3, 119, 10, 8],
        [10, 120, 6, 7],
        [16, 121, 3, 4],
      ]) {
        for (let dx = 0; dx < w; dx++) {
          const lift = Math.round(h * (1 - dx / w));
          p.line(x + dx, y - lift, x + dx, y, hx(dx < w * 0.4 ? '#567487' : '#8298a4'));
          p.set(x + dx, y - lift, hx('#a6bbc4'));
        }
        p.line(x, y, x + w, y + 1, hx('#455d70'));
      }
    },
  },
];
export default paint;
