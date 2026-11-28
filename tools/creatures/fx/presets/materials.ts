// Material languages of the seven pilot paintings. The mark is fixed at the contact;
// the fragment has its own orientation and silhouette in flight.
import type { EffectId } from '../../bodies/card-data';
import { fillPoly, type Pen } from '../pen';
import { ellFill, oval, shard } from '../field';
import type { XY } from '../../types';

type Brush = (p: Pen, at: XY, size: number, angle: number, alpha: number) => void;
interface Material {
  source: string;
  edge: string;
  light: string;
  fragment: Brush;
  mark: Brush;
}
function branch(p: Pen, at: XY, angle: number, run: number, color: string, alpha: number) {
  const dx = Math.cos(angle) * run,
    dy = Math.sin(angle) * run * 0.43;
  const [x, y] = at;
  p.col(color, alpha);
  p.line(x, y, x + dx * 0.52, y + dy * 0.52);
  p.line(x + dx * 0.52, y + dy * 0.52, x + dx, y + dy - 2);
  p.line(x + dx * 0.52, y + dy * 0.52, x + dx * 0.57 - dy * 0.64, y + dy * 0.67 + dx * 0.12);
}
export const effectPresets = {
  ice: {
    source: 'frost_yeti/tech_icicles',
    edge: '#467aab',
    light: '#eefcfc',
    fragment(p, [x, y], s, a, k) {
      const dx = Math.cos(a) * s * 1.55,
        dy = Math.sin(a) * s * 1.55;
      shard(p, x, y, dx, dy, s * 0.48, '#a3d4e4', '#233c61', k);
      p.lineS(x, y, x + dx, y + dy, '#eefcfc', k);
    },
    mark(p, pt, s, a, k) {
      for (let i = 0; i < 6; i++)
        branch(p, pt, a + (i * Math.PI) / 3, s * (i % 2 ? 0.85 : 1.2), '#cbe6ed', k);
    },
  },
  lava: {
    source: 'crater_titan/tech_pillar',
    edge: '#a25a41',
    light: '#ffd47a',
    fragment(p, [x, y], s, a, k) {
      ellFill(p, [x, y], s * 0.72, s * 0.9, '#7e5045', k);
      ellFill(p, [x, y - 1], s * 0.52, s * 0.72, '#ef9149', k);
      p.lineS(x, y, x - Math.cos(a) * s * 0.82, y - Math.sin(a) * s, '#ffd47a', k);
    },
    mark(p, [x, y], s, a, k) {
      ellFill(p, [x, y], s * 0.9, Math.max(1, s * 0.28), '#7e5045', k);
      oval(p, [x, y], s * 0.75, Math.max(1, s * 0.22), '#ffc263', k, a, a + 4.6);
      branch(p, [x, y], a + 0.6, s, '#e18e51', k);
    },
  },
  crystal: {
    source: 'gem_beetle/tech_prism',
    edge: '#508598',
    light: '#d6fff1',
    fragment(p, [x, y], s, a, k) {
      const dx = Math.cos(a) * s,
        dy = Math.sin(a) * s;
      shard(p, x, y, dx, dy, s * 0.82, '#97e3ca', '#687582', k);
      p.lineS(x - dy * 0.52, y + dx * 0.52, x + dx, y + dy, '#d6fff1', k);
    },
    mark(p, [x, y], s, a, k) {
      for (let i = -1; i <= 1; i++) {
        const l = s * (i === 0 ? 0.82 : 0.56);
        shard(
          p,
          x + i * s * 0.27,
          y - l * 0.44,
          Math.sin(a + i) * l * 0.36,
          -l,
          l * 0.35,
          '#97e3ca',
          '#687582',
          k,
        );
      }
    },
  },
  spores: {
    source: 'toad_shaman/tech_spores',
    edge: '#527d76',
    light: '#e6eeb0',
    fragment(p, [x, y], s, a, k) {
      ellFill(p, [x, y], s, s * 0.76, '#477874', k * 0.7);
      ellFill(p, [x + s * 0.26, y - s * 0.21], s * 0.75, s * 0.68, '#b6cd81', k * 0.8);
      p.col('#eced9f', k);
      p.dot(x + Math.cos(a) * s * 0.4, y - s * 0.5);
    },
    mark(p, [x, y], s, a, k) {
      oval(p, [x, y], s * 0.85, 1 + s * 0.22, '#9cc7ae', k);
      for (let i = 0; i < 3; i++) {
        const u = (i - 1) * s * 0.54;
        p.lineS(x + u, y, x + u, y - 2 - s * 0.22, '#b6cd81', k);
        ellFill(p, [x + u, y - 2 - s * 0.22], 1 + s * 0.18, 1 + s * 0.08, '#eced9f', k);
      }
    },
  },
  coins: {
    source: 'coin_dragon/tech_rain',
    edge: '#91683f',
    light: '#fff4bc',
    fragment(p, [x, y], s, a, k) {
      const rx = 0.6 + s * Math.abs(Math.cos(a));
      ellFill(p, [x, y], rx, s, '#775033', k);
      oval(p, [x, y], rx, s, '#f2d48f', k);
      if (rx > 1.4) p.lineS(x, y - s * 0.55, x, y + s * 0.55, '#fff4bc', k);
    },
    mark(p, [x, y], s, a, k) {
      oval(p, [x, y], s, s * 0.3 + 1, '#c6a168', k);
      p.lineS(x - 2, y, x + 3, y - 1, '#fff4bc', k);
      ellFill(p, [x + s * 0.53, y + 1], s * 0.33, 1.2, '#e8bb75', k);
    },
  },
  'silk-wind': {
    source: 'silk_dragon/tech_kites',
    edge: '#b97873',
    light: '#f6deb0',
    fragment(p, [x, y], s, a, k) {
      const dx = s * Math.cos(a),
        dy = s * Math.sin(a);
      p.col('#d25d52', k);
      fillPoly(p, [x - dx, y - dy, x - dy * 0.7, y + dx * 0.7, x + dx, y + dy, x + dy * 0.38, y - dx * 0.38]);
      p.lineS(x - dx, y - dy, x + dx, y + dy, '#f6deb0', k);
      p.lineS(x - dx, y - dy, x - dx - dy, y - dy + dx, '#f5b05f', k * 0.8);
    },
    mark(p, [x, y], s, a, k) {
      oval(p, [x, y], s, 1 + s * 0.32, '#e7d9bb', k, a, a + 4.3);
      oval(p, [x + 2, y - 1], s * 0.67, 1 + s * 0.2, '#f5b05f', k, a + 2, a + 5.4);
    },
  },
  thorns: {
    source: 'bramble_warden/tech_volley',
    edge: '#856a48',
    light: '#ecbd7d',
    fragment(p, [x, y], s, a, k) {
      const dx = s * Math.cos(a),
        dy = s * Math.sin(a);
      p.lineS(x - dx, y - dy, x + dx, y + dy, '#744528', k);
      p.lineS(x, y, x + dx, y + dy, '#ecbd7d', k);
      p.lineS(x, y, x - dy * 0.68, y + dx * 0.68, '#d9ae77', k);
    },
    mark(p, pt, s, a, k) {
      for (let i = 0; i < 4; i++) branch(p, pt, a + i * 1.5, s, '#a78b64', k);
      branch(p, pt, a + 0.7, s * 0.74, '#ecbd7d', k);
    },
  },
} satisfies Record<EffectId, Material>;
export type PresetId = keyof typeof effectPresets;
