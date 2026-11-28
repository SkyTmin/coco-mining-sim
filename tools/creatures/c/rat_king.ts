import { readCreatureCard } from '../bodies/card-data';
import { armedFrame } from '../bodies/armed-biped';
import { buildEffects } from '../fx/presets';
import { paintMaterial } from '../technique-fx';
import { fillPoly } from '../fx/pen';
import { oval } from '../fx/field';
import { techniqueContacts, techniquePoseAt, withTechniques } from '../technique';
import type { Creature } from '../types';
import book from './rat_king-keys';
import { floorDamage } from './rat_king-floor';
import { summonSignals } from './rat_king-summon';
import { clips, gesture } from './rat_king-poses';
import { kingFigure } from './rat_king-skin';

const card = readCreatureCard('rat_king');
const metal = buildEffects(card, book);
// Keep root travel on the scene floor, so trails, historical socket queries
// and the independent foot registration all share the moving origin.
const actions = Object.fromEntries(
  Object.entries(book).map(([id, move]) => [
    id,
    {
      seconds: move.seconds!,
      groundOffset(t: number): [number, number] {
        const frame = Math.round(t * 24);
        const hold = Math.round((move.stop ?? 0) * 24);
        const contact = techniqueContacts(move).findLast((hit) => frame >= hit.frame && frame - hit.frame <= hold);
        return [techniquePoseAt(move, contact ? contact.frame / 24 : t).dx ?? 0, 0];
      },
    },
  ]),
);
const draw = armedFrame(card, card.life, { pose: gesture, figure: kingFigure });
const king: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: [120, 148],
  animations: { ...clips, ...actions },
  frame(anim, t, side, variant, motion) {
    const fr = draw(anim, t, side, variant, motion);
    if (book[anim]) fr.dx = 0;
    return fr;
  },
  props(f) {
    if (f.anim !== 'tech_roll') return;
    const hit = book.tech_roll.keys[3].frame / 24;
    const tip = f.pointAt(hit, 'shoulderR'),
      floor = f.pointAt(hit, 'shoulderRGround');
    const after = Math.max(0, Math.min(1, (f.t - hit) * 3));
    const fade = Math.min(1, f.t * 9, Math.max(0, 1 - (f.t - hit - 0.2) * 3));
    if (fade <= 0) return;
    for (const sign of [-1, 1]) {
      const x = tip[0] + sign * (3 + after * 9),
        y = floor[1] + after * 2;
      paintMaterial(
        f,
        'under',
        'slag-' + sign,
        [x, y],
        (pen) => {
          const high = Math.max(5, (floor[1] - tip[1]) * (1 - after));
          pen.col('#5c4741', fade);
          fillPoly(pen, [x - 5, y, x - 4, y - high * 0.65, x + 1, y - high, x + 6, y - 2]);
          pen.lineS(x - 4, y - high * 0.65, x + 1, y - high, '#c48e53', fade);
        },
        y,
      );
    }
  },
  effects(f) {
    if (f.anim === 'tech_summon') summonSignals(f);
    else metal.effects?.(f);
    floorDamage(f);
    const cue = f.anim === 'happy' ? 17 : f.anim === 'phase' ? 24 : f.anim === 'show' ? 62 : -1;
    if (cue < 0) return;
    const u = (f.t - cue / 24) / 0.43;
    if (u < 0 || u > 1) return;
    const origin = f.pointAt(cue / 24, f.anim === 'phase' ? 'handR' : 'crown');
    for (let i = 0; i < 5; i++) {
      const x = origin[0] + (i - 2) * (2 + 6 * u),
        y = origin[1] - 4 - (5 + (i % 3) * 3) * Math.sin(u * Math.PI);
      oval(f.above, [x, y], 1.4, 0.8, '#e4bb70', 1 - u);
    }
  },
};
export default withTechniques(king, book);
