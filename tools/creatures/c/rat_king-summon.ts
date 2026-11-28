import { effectPresets } from '../fx/presets';
import { oval, progress } from '../fx/field';
import { paintImpact, paintMaterial, paintSocketTrail, projectileAt } from '../technique-fx';
import type { FxInput, XY } from '../types';
import book from './rat_king-keys';

const brass = effectPresets.coins;
const move = book.tech_summon;
const release = move.keys[3].frame / 24;
export function summonSignals(f: FxInput) {
  const hand = move.weapon;
  const start = move.keys[2].frame / 24;
  if (f.t >= start && f.t < release + 0.09)
    paintSocketTrail(f, 'above', hand, start, release, {
      color: brass.light,
      width: 2,
      alpha: 1 - progress(f.t, release + 0.02, release + 0.09),
    });
  const age = f.t - release;
  if (age < 0) return;
  const handAt = f.pointAt(release, hand);
  if (age < 0.24)
    paintImpact(f, 'above', hand, handAt, (p, x, y) => {
      p.col(brass.light, 1 - age / 0.24);
      p.dot(x, y, 2, 2);
      oval(p, [x, y], 1 + 12 * age, 1 + 6 * age, brass.light, 1 - age / 0.24);
    });
  const hole = f.pointAt(release, 'kingletGround');
  for (const [index, contact] of move.contacts!.filter((c) => c.projectile).entries()) {
    const id = contact.projectile!,
      arrival = contact.frame / 24;
    const to: XY = [hole[0] + 3.5 + index * 3.5, hole[1] + 5 + (index % 2) * 3.5];
    if (f.t <= arrival + 1 / 24) {
      const at = projectileAt(f, id, hand, release, arrival, to, 9 + 3 * index);
      if (f.t < arrival)
        paintMaterial(f, 'above', id, at, (pen) => brass.fragment(pen, at, 3, age * 10, 1), to[1]);
    }
    const landed = f.t - arrival;
    if (landed < 0 || landed > 0.37) continue;
    paintImpact(f, 'under', id, to, (p, x, y) => {
      const u = landed / 0.37;
      p.col(brass.light, 1 - u);
      p.dot(x, y, 2, 1);
      brass.mark(p, [x, y], 2 + u * 7, 0.3, 1 - u);
    });
  }
}
