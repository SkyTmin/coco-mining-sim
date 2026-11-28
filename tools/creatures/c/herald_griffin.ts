import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './herald_griffin-fx';
import book from './herald_griffin-keys';
import { clips, gesture } from './herald_griffin-poses';
import { griffinFrame } from './herald_griffin-rig';
const card = readCreatureCard('herald_griffin');
const frame = griffinFrame(card, card.life, gesture);
export default withTechniques(
  {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations: {
      ...clips,
      ...Object.fromEntries(Object.entries(book).map(([name, m]) => [name, { seconds: m.seconds! }])),
    },
    frame(...args) {
      const body = frame(...args),
        [anim, t] = args,
        n = t * 24;
      if (anim === 'tech_post_dive' && n > 19 && n < 32) {
        const alpha = 0.38 * Math.sin((Math.PI * (n - 19)) / 13);
        body.ghost = { dx: -13, dy: -7, alpha };
      }
      return body;
    },
    effects,
  },
  book,
);
