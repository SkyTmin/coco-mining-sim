// [вики 18 §§3, 4, 7; ТЗ-04] All gameplay numbers come from the balance source.
import { existsSync, readFileSync } from 'node:fs';
import { families, familySkill, familyGameplay, familyTiming, rarities, gold, keysAndChests, cardEffects } from './balance/data.mjs';

export function familyConfig(input) {
  const picks = { ...input.pickaxes };
  for (const family of families) for (const rarity of rarities.slice(1)) {
    const id = `${family.id}_${rarity.id}`;
    picks[id] = { ...picks[id], family: family.id, rarity: rarity.id };
  }
  const runtime = Object.fromEntries(families.map(family => {
    const rule = familyGameplay[family.id];
    return [family.id, {
      color: rule.color, world: family.world, price: family.price, ult: rule.ult,
      perks: Object.fromEntries(rarities.slice(1).map((rarity, i) => [rarity.id, {
        size: rule.sizes[i], chance: rule.chances?.[i] ?? 1, every: rule.every?.[i] ?? 1,
      }])),
      skills: rule.skills.map(([effect, per, deferred], index) => ({
        effect, per, deferred: deferred === true, cap: familySkill.levels, unlock: familySkill.unlockAt[index],
      })),
    }];
  }));
  const { odds, pityEpic, pityLegendary } = keysAndChests.pickaxeChest;
  return {
    pickaxes: picks, families: runtime,
    familyRules: {
      order: families.map(f => f.id), rarities: rarities.slice(1).map(r => r.id),
      skillFirstCost: familySkill.firstCost, skillGrowth: familySkill.costGrowth,
      accountCoins: familySkill.accountCoinsPerLevel, chestFrequencyPerLevel: familySkill.dynChestMore,
      mergeNeed: gold.need, ...familyTiming,
    },
    chests: {
      keyHits: keysAndChests.keyPerHits, wall: keysAndChests.wallChests,
      pick: { odds, pityEpic, pityLegendary },
      // [вики 18 §4] Key card transformations.
      keyEveryChest: cardEffects.keyEveryChest, doubleKeyChance: cardEffects.doubleKeyChance,
    },
  };
}

export function familyArt(pickaxes, runtime, supplied) {
  const file = new URL('../assets/pickaxes/manifest.json', import.meta.url);
  const manifest = supplied ?? (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
  const picks = manifest.pickaxes ?? manifest;
  const generated = {};
  for (const [id, pick] of Object.entries(pickaxes)) {
    if (id.startsWith('_')) continue;
    const entry = picks[id];
    if (entry && (!/^rbxassetid:\/\/[1-9]\d*$/.test(entry.icon) ||
        typeof entry.model !== 'string' || !entry.model.trim())) {
      throw new Error(`Invalid pickaxe art manifest entry: ${id}`);
    }
    generated[id] = entry ?? {
      icon: 'rbxassetid://131511417355722', model: 'wooden_pickaxe', placeholder: true,
      color: runtime[pick.family]?.color ?? '#B58350',
    };
  }
  for (const id of Object.keys(picks)) {
    if (!id.startsWith('_') && !Object.hasOwn(generated, id)) throw new Error(`Unknown pickaxe art ID: ${id}`);
  }
  if (manifest.chests && (!Array.isArray(manifest.chests.wall) || manifest.chests.wall.length !== 4 ||
      [...manifest.chests.wall, manifest.chests.pick].some(entry => typeof entry?.model !== 'string' || !entry.model.trim()))) {
    throw new Error('Chest art must name four wall models and the pickaxe chest model');
  }
  return {
    pickaxes: generated,
    chests: manifest.chests ?? {
      wall: ['wood', 'silver', 'gold', 'crystal'].map(model => ({ model: 'CHEST', kind: model })),
      pick: { model: 'CHEST' },
    },
  };
}

export function validateFamilies(data) {
  const errors = [];
  if (Object.keys(data).length !== 4) errors.push('families must contain four families');
  for (const { id, world, price } of families) {
    const f = data[id];
    if (f?.world !== world || f?.price !== price || f?.skills?.length !== 4) {
      errors.push(`Invalid family ${id}`); continue;
    }
    for (const rarity of rarities.slice(1)) {
      const p = f.perks[rarity.id];
      if (!p || p.size <= 0 || p.chance <= 0 || p.chance > 1 || p.every < 1) errors.push(`Invalid perk ${id}/${rarity.id}`);
    }
    f.skills.forEach((s, i) => {
      if (s.cap !== 10 || s.unlock !== familySkill.unlockAt[i] || !(s.per > 0)) errors.push(`Invalid skill ${id}/${i + 1}`);
    });
  }
  return errors;
}
