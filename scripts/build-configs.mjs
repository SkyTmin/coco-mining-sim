// Generate src/shared/Config/*.json from design-decisions.json.
// Usage: node scripts/build-configs.mjs [--input <path>]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  mine as balanceMine, worlds as balanceWorlds, oreSlots, hitSizes, rarities,
  pickLevel, gold, cards, cardGrowth, cardEffects,
} from "./balance/data.mjs";

const whatIf = ["G", "V", "HARD", "CUPS", "ULT"].filter((name) => process.env[name]);
if (whatIf.length) {
  console.error("Clear balance simulation overrides before building configs: " + whatIf.join(", "));
  process.exit(1);
}

const readArt = (file) => JSON.parse(readFileSync(new URL("../assets/" + file, import.meta.url), "utf8"));
const textureIds = readArt("textures/ids.json");
const uiIds = readArt("ui/ids.json");
const sprites = readArt("ui/rects.json");
const oreMap = readArt("textures/blocks/map.json");
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPositive = (n) => Number.isFinite(n) && n > 0;
const isPositiveInteger = (n) => Number.isSafeInteger(n) && n > 0;
const isFraction = (n) => Number.isFinite(n) && n >= 0 && n <= 1;
const isId = (id) => typeof id === "string" && /^[a-z][a-z0-9_]*$/.test(id);
const isColor = (color) => Array.isArray(color) && color.length === 3 &&
  color.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
const isWidth = (width) => isPositiveInteger(width) && width % 2 === 1;

function validateMine(data) {
  const errors = [];
  if (data.maxWidth !== 15 || data.maxHeight !== 7 || data.maxDepth !== 2 ** 31 - 1) {
    errors.push("mine.maxWidth, maxHeight and maxDepth must match the 15×7 format with 31-bit depths");
  }
  if (!isWidth(data.startWidth) || data.startWidth > data.maxWidth) {
    errors.push("mine.startWidth must be positive, odd and at most mine.maxWidth");
  }
  if (!isPositiveInteger(data.height) || data.height > data.maxHeight) {
    errors.push("mine.height must be between 1 and mine.maxHeight");
  }
  if (!isPositiveInteger(data.chunk) || data.chunk < 2) {
    errors.push("mine.chunk must be an integer of at least 2");
  }
  if (!Number.isInteger(data.window) || data.window < 60 || data.window > 100 ||
      data.nearWindow !== 25 || !isPositiveInteger(data.layerBatch) || data.layerBatch > 16) {
    errors.push("mine must have a 60–100 layer window, 25 near layers and bounded distant batches");
  }
  for (const field of ["maxHoles", "maxHitsPerBlock", "blockSize"]) {
    if (!isPositiveInteger(data[field])) errors.push(`mine.${field} must be a positive integer`);
  }
  if (!Array.isArray(data.passThrough) || data.passThrough.length !== 3 ||
      !data.passThrough.every((n, i, levels) => Number.isFinite(n) && n >= 1 && (!i || n > levels[i - 1]))) {
    errors.push("mine.passThrough must contain three increasing thresholds of at least 1");
  }
  if (![data.plate?.hits, data.plate?.cap, data.plate?.ultMultiplier, data.ultCharge].every(isPositiveInteger)) {
    errors.push("mine must have positive plate and ultimate rules");
  }
  return errors;
}

function validateOres(data) {
  const errors = [];
  const ids = new Set();
  for (const [i, ore] of data.entries()) {
    if (!isId(ore?.id) || ids.has(ore.id)) {
      errors.push(`ores[${i}].id must be a unique ore ID`);
    } else {
      ids.add(ore.id);
    }
    if (!isColor(ore?.color)) errors.push(`ores[${i}].color must contain three RGB bytes`);
  }
  return errors;
}

function validRect(rect) {
  return Array.isArray(rect) && rect.length === 4 && rect.every(Number.isInteger) &&
    rect[0] >= 0 && rect[1] >= 0 && rect[2] > 0 && rect[3] > 0 &&
    rect[0] + rect[2] <= 1024 && rect[1] + rect[3] <= 1024;
}

function validateArt(_art, decisions) {
  const errors = [];
  for (const [file, ids, keys] of [
    ["textures/ids.json", textureIds, ["ores", "oreVariants", "mineFx"]],
    ["ui/ids.json", uiIds, ["kit"]],
  ]) {
    if (!isObject(ids) || Object.keys(ids).length !== keys.length ||
        !keys.every((key) => typeof ids[key] === "string" && /^rbxassetid:\/\/[1-9]\d*$/.test(ids[key]))) {
      errors.push(`assets/${file} must list a nonempty Roblox ID for ${keys.join(", ")}`);
    }
  }
  for (const [name, sprite] of Object.entries(sprites)) {
    if (!validRect(sprite?.rect)) {
      errors.push(`Invalid UI sprite rectangle: ${name}`);
    } else if (sprite.slice !== undefined &&
        (!Array.isArray(sprite.slice) || sprite.slice.length !== 4 ||
         !sprite.slice.every(Number.isInteger) || sprite.slice[0] < 0 || sprite.slice[1] < 0 ||
         sprite.slice[2] <= sprite.slice[0] || sprite.slice[3] <= sprite.slice[1] ||
         sprite.slice[2] > sprite.rect[2] || sprite.slice[3] > sprite.rect[3])) {
      errors.push(`Invalid UI slice center: ${name}`);
    }
  }
  const sliced = ["frame-iron", "frame-wood", "frame-parch", "frame-well",
    ...["gold", "green", "iron", "red"].flatMap((color) => ["n","h","p","d"].map((state) => `btn-${color}-${state}`))];
  for (const name of sliced) {
    if (!sprites[name]?.slice) errors.push(`Missing sliced sprite: ${name}`);
  }
  for (const name of ["hud-coin", "badge", "i-gear", "i-bolt", "i-lock", "icon-lens", "icon-pick",
    ...Array.from({length:17}, (_, i) => "pick-" + i)]) {
    if (!sprites[name]) errors.push(`Missing UI sprite: ${name}`);
  }
  if (!Array.isArray(oreMap.worlds) || oreMap.worlds.length !== balanceWorlds.length) {
    errors.push("assets/textures/blocks/map.json must map all ten worlds");
  } else if (Array.isArray(decisions.worlds)) {
    for (const [i, world] of decisions.worlds.entries()) {
      const mapped = oreMap.worlds[i];
      if (mapped?.world !== world?.id || !Array.isArray(world?.ores) ||
          mapped?.slots?.length !== world.ores.length ||
          !mapped.slots.every((slot, j) => slot?.ore === world.ores[j]?.[0] &&
            ["ores", "oreVariants"].includes(slot.atlas) && validRect(slot.rect) &&
            slot.rect[2] === 64 && slot.rect[3] === 64 && /^b(?:[0-9]|[12][0-9]|30)\.png$/.test(slot.source))) {
        errors.push(`Invalid ore art for worlds[${i}]`);
      }
    }
  }
  return errors;
}

function validateWorlds(data, decisions) {
  const errors = [];
  const oreIds = new Set(Array.isArray(decisions.ores) ? decisions.ores.map((ore) => ore?.id) : []);
  const ids = new Set();
  const chunk = decisions.mine?.chunk;
  let totalDepth = 0;
  if (data.length !== balanceWorlds.length) errors.push("worlds must match all ten balance worlds");
  for (const [i, world] of data.entries()) {
    const prefix = `worlds[${i}]`;
    if (!isObject(world)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!isId(world.id) || ids.has(world.id)) errors.push(`${prefix}.id must be a unique world ID`);
    ids.add(world.id);
    if (!isPositiveInteger(world.length) || (isPositiveInteger(chunk) && world.length % chunk !== 0)) {
      errors.push(`${prefix}.length must be positive and a multiple of mine.chunk (${chunk})`);
    } else {
      totalDepth += world.length;
    }
    if (!Array.isArray(world.ores) || world.ores.length < 1 || world.ores.length > 63) {
      errors.push(`${prefix}.ores must contain 1–63 ore shares`);
    } else {
      let sum = 0;
      const seen = new Set();
      for (const entry of world.ores) {
        if (!Array.isArray(entry) || entry.length !== 2 || !isId(entry[0]) || !isFraction(entry[1])) {
          errors.push(`${prefix}.ores must contain [oreId, share] pairs with shares in [0, 1]`);
          continue;
        }
        const [id, share] = entry;
        if (!oreIds.has(id) || seen.has(id)) errors.push(`${prefix}.ores has an unknown or repeated ore: ${id}`);
        seen.add(id);
        if (!Object.hasOwn(world.prices ?? {}, id) || !isPositive(world.prices[id])) {
          errors.push(`${prefix}.prices.${id} must be a positive price`);
        }
        sum += share;
      }
      if (Math.abs(sum - 1) > 1e-9) errors.push(`${prefix}.ores shares must sum to 1 (got ${sum})`);
      if (world.ores.length !== oreSlots.length) errors.push(`${prefix}.ores must contain the five balance slots`);
    }
    if (!isPositive(world.hardStart) || !isPositive(world.hardEnd) || world.hardEnd < world.hardStart) {
      errors.push(`${prefix} must have increasing positive hardness`);
    }
    if (!isPositive(world.plate?.recommendedStrength) || !isPositive(world.plate?.hp) || !isPositive(world.plate?.reward)) {
      errors.push(`${prefix}.plate must have positive recommendedStrength, hp and reward`);
    }
    const specials = world.specials;
    if (!isFraction(specials?.perChunk) || !Array.isArray(specials.kinds) || specials.kinds.length === 0 ||
        !specials.kinds.every((pair) => Array.isArray(pair) && pair.length === 2 && pair[0] === "chest" && isPositive(pair[1]))) {
      errors.push(`${prefix}.specials must have a perChunk probability and weighted chest kinds`);
    }
    if (!isColor(world.color)) errors.push(`${prefix}.color must contain three RGB bytes`);
    if (i < 3 && (!["Ground", "Sandstone", "Limestone"].includes(world.look?.material) ||
      ![world.look?.wall, world.look?.fog, world.look?.lamp, world.look?.glow, world.look?.decor].every(isColor))) {
      errors.push(`${prefix}.look must define the material and five palette colors`);
    }
  }
  if (totalDepth > decisions.mine?.maxDepth + 1) errors.push("worlds exceed the supported depth");
  return errors;
}

function validateMineStrings(decisions) {
  const source = readFileSync(new URL("../src/shared/Strings/Mine.luau", import.meta.url), "utf8")
    .replace(/--[^\n]*/g, "");
  const entries = new Map();
  for (const [, key, fields] of source.matchAll(/\b((?:world|ore)_[a-z0-9_]+)\s*=\s*\{([^{}]*)\}/g)) {
    const locales = new Map();
    for (const [, locale, text] of fields.matchAll(/\b(en|ru|es|fr)\s*=\s*"([^"\n]*)"/g)) {
      locales.set(locale, text.trim());
    }
    entries.set(key, locales);
  }
  const errors = [];
  for (const [section, prefix] of [["worlds", "world_"], ["ores", "ore_"]]) {
    if (!Array.isArray(decisions[section])) continue;
    for (const item of decisions[section]) {
      if (!isId(item?.id)) continue;
      const key = prefix + item.id;
      for (const language of ["en", "ru", "es", "fr"]) {
        if (!entries.get(key)?.get(language)) errors.push(`Strings/Mine.luau is missing ${key} in ${language}`);
      }
    }
  }
  for (const [i, world] of (Array.isArray(decisions.worlds) ? decisions.worlds : []).entries()) {
    const canonical = balanceWorlds[i];
    if (!canonical || !isId(world?.id) || !Array.isArray(world.ores)) continue;
    if (entries.get("world_" + world.id)?.get("ru") !== canonical.name) {
      errors.push(`world_${world.id} must use the Russian name from balance/data.mjs`);
    }
    for (const [slot, pair] of world.ores.entries()) {
      const id = pair?.[0];
      if (id && entries.get("ore_" + id)?.get("ru") !== canonical.ores[slot]) {
        errors.push(`ore_${id} must use the Russian name from balance/data.mjs`);
      }
    }
  }
  return errors;
}

function validatePickaxes(data) {
  const errors = [];
  for (const [id, family] of [["starter", null], ["storm_common", "storm"]]) {
    const pick = data[id];
    if (pick?.family !== family || pick?.rarity !== (id === "starter" ? "wood" : "common")) {
      errors.push(`pickaxes.${id} must reference its balance rarity`);
    }
  }
  const storm = data.storm_common?.storm;
  if (storm?.jumps?.[0] !== 3 || storm.jumps[1] !== 5 || storm.pickRareWithin !== 2) {
    errors.push("pickaxes.storm_common.storm must specify 3–5 jumps and radius 2");
  }
  return errors;
}

function withBalance(input) {
  const shapes = ["single", "wide2", "wide3", "cross5", "square3", "square3"];
  const progress = {
    widths: balanceMine.widths.filter(({ w }) => w <= (input.plots?.frameWidth ?? 7)),
    hitSizes: hitSizes.map(({ id, blocks, interval, price }, index) => ({ id, shape: shapes[index], blocks, interval, price })),
    rarities: Object.fromEntries(rarities.map(({ id, stars, power, cap, ult, lvlC0 }) => [id, { stars, power, cap, ult, lvlC0 }])),
    pickLevel,
    gold,
    cards: Object.fromEntries(cards.map(({ id, name, ...rule }) => [id, rule])),
    cardGrowth,
    cardEffects,
  };
  const mine = !isObject(input.mine) ? input.mine : {
    ...input.mine,
    startWidth: balanceMine.widths[0].w,
    height: balanceMine.height,
    maxHitsPerBlock: balanceMine.maxHitsPerBlock,
    passThrough: balanceMine.pierce.map((level) => level.ratio),
    plate: { hits: balanceMine.plateHits, cap: balanceMine.plateCap, ultMultiplier: balanceMine.plateUltMultiplier },
    ultCharge: balanceMine.ultCharge,
  };
  const worlds = !Array.isArray(input.worlds) ? input.worlds : input.worlds.map((palette, index) => {
    const world = balanceWorlds[index];
    if (!world || !isObject(palette) || !Array.isArray(palette.oreIds)) return palette;
    return {
      id: palette.id,
      color: palette.color,
      look: palette.look,
      length: world.length,
      rockValue: world.rockValue,
      hardStart: world.hardStart,
      hardEnd: world.hardEnd,
      ores: palette.oreIds.map((id, slot) => [id, oreSlots[slot]?.share]),
      prices: Object.fromEntries(palette.oreIds.map((id, slot) => [id, world.rockValue * oreSlots[slot]?.mult])),
      plate: { recommendedStrength: world.hardEnd, hp: balanceMine.plateHits * world.hardEnd, reward: balanceMine.plateReward * world.rockValue },
      specials: { perChunk: 0, kinds: [["chest", 1]] },
    };
  });
  const pickaxes = !isObject(input.pickaxes) ? input.pickaxes : {
    ...input.pickaxes,
    ...Object.fromEntries(rarities.slice(1).map(({ id }) => ["plain_" + id, { rarity: id }])),
  };
  const art = {
    textures: textureIds,
    ui: uiIds.kit,
    sprites,
    ores: Object.fromEntries(oreMap.worlds.map(({ world, slots }) => [world, slots.map(({ atlas, rect }) => ({ atlas, rect }))])),
  };
  return { ...input, mine, worlds, pickaxes, progress, art };
}

function duplicateBalance(input) {
  const errors = [];
  const check = (value, fields, label) => {
    if (!isObject(value)) return;
    for (const field of fields) {
      if (Object.hasOwn(value, field)) errors.push(`${label}.${field} comes from balance/data.mjs`);
    }
  };
  check(input, ["progress"], "config");
  check(input.mine, ["startWidth", "height", "maxHitsPerBlock", "passThrough", "plate", "ultCharge"], "mine");
  for (const [index, world] of (Array.isArray(input.worlds) ? input.worlds : []).entries()) {
    check(world, ["length", "ores", "prices", "rareFrom", "richness", "durability", "hardStart", "hardEnd", "rockValue", "plate", "specials"], `worlds[${index}]`);
  }
  for (const [id, pick] of Object.entries(isObject(input.pickaxes) ? input.pickaxes : {})) {
    check(pick, ["strength", "shape", "interval", "ultLayers", "ultCharge"], "pickaxes." + id);
  }
  return errors;
}

function withoutNotes(value) {
  if (Array.isArray(value)) return value.map(withoutNotes);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, child]) => [key, withoutNotes(child)]));
}

const sections = [
  {
    name: "game",
    validate(data) {
      const errors = [];
      if (typeof data.defaultLanguage !== "string" || !data.defaultLanguage) {
        errors.push("game.defaultLanguage must be a nonempty string");
      }
      if (!Array.isArray(data.languages) || !data.languages.every((language) => typeof language === "string" && language)) {
        errors.push("game.languages must be an array of nonempty strings");
      } else if (!data.languages.includes(data.defaultLanguage)) {
        errors.push("game.languages must contain game.defaultLanguage");
      }
      if (!Number.isFinite(data.autosaveSeconds) || data.autosaveSeconds < 30 || data.autosaveSeconds > 600) {
        errors.push("game.autosaveSeconds must be between 30 and 600");
      }
      return errors;
    },
    emit: withoutNotes,
  },
  {
    name: "creative",
    validate(data) {
      return Array.isArray(data.admins) && data.admins.every(Number.isSafeInteger)
        ? []
        : ["creative.admins must be an array of integer user IDs"];
    },
    emit: withoutNotes,
  },
  { name: "mine", validate: validateMine, emit: withoutNotes },
  {
    name: "plots",
    validate: (data) => data.count === 8 && [5, 7].includes(data.frameWidth) &&
      [data.entranceRadius, data.platformDepth, data.spectatorDepth].every(isPositiveInteger) &&
      data.retiredWidth?.width === 9 && data.retiredWidth?.refund === 500000
      ? [] : ["plots must specify eight radial plots, a 5- or 7-block frame and the retired width refund"],
    emit: withoutNotes,
  },
  { name: "pickaxes", validate: validatePickaxes, emit: withoutNotes },
  { name: "progress", validate: () => [], emit: withoutNotes },
  {
    name: "fx",
    validate: ({ ult, depth, impactTime, swing }) =>
      swing?.windup === 0.08 && swing.contact === 0.14 && swing.hold === 0.17 && swing.finish === 0.26 &&
      swing.windupDegrees === 35 && swing.travelDegrees === 70 && swing.recoilDegrees === 12 && swing.handNear === 0.06 &&
      ult?.windup === 0.15 && ult.fractureMin === 0.5 && ult.fractureMax === 0.9 &&
      ult.empty >= 0.25 && ult.empty <= 0.35 &&
      ult.approachBase === 0.45 && ult.approachPerLog === 0.35 &&
      [ult.fracturePerLog, ult.distanceBase, ult.distancePerLog, ult.distanceDeep, impactTime].every(isPositive) &&
      depth?.fogStart === 1500 && depth.fogEnd === 4000 && depth.simpleFrom === 300 && depth.distantSpacing === 80 &&
      [depth.lampSpacing, depth.middleSpacing].every(isPositiveInteger) &&
      depth.middleSpacing >= depth.lampSpacing && impactTime <= 0.15
      ? [] : ["fx must specify the ultimate timing and stage 3b tunnel distances"],
    emit: withoutNotes,
  },
  {
    name: "sounds",
    validate({ atlasId, clips, rules }) {
      const counts = {
        hit_soft: 5, break_soft: 5, coin: 1, link_note: 1, bolt_soft: 2, ride_stop: 2,
        ult_windup: 1, ult_whump: 1, ult_rumble_away: 1, ult_rumble_near: 1, ult_thud: 1,
        plate_hit: 2, plate_break: 1, ui_tap: 1,
        buy_soft: 3, level_tick: 1, card_morph: 1, heavy_hit: 1, crit_soft: 2,
        coin_rain: 1, world_enter: 1, depth_knock: 3, locked: 1,
      };
      const errors = [];
      if (atlasId !== null && (typeof atlasId !== "string" || !/^rbxassetid:\/\/\d+$/.test(atlasId))) {
        errors.push("sounds.atlasId must be null or a Roblox audio asset ID");
      }
      if (rules?.maxVolume !== 0.5 || rules.frequentVolume !== 0.25 || rules.linkVolume !== 0.12 ||
          rules.depthVolume !== 0.10 || rules.defaultSfx !== 0.6 || rules.frequentLufs !== -26 || rules.rareLufs !== -20 ||
          rules.lowpassHz !== 9000 || rules.fadeSeconds !== 0.01 || rules.pitchSpread !== 0.08 ||
          rules.fatigueDelay !== 3 || rules.fatigueGain !== 0.6 ||
          rules.voices?.hit_soft !== 2 || rules.voices?.break_soft !== 3 || rules.voices?.coin !== 1) {
        errors.push("sounds.rules must match stage 2b volume, mastering and polyphony limits");
      }
      for (const [name, count] of Object.entries(counts)) {
        const segments = clips?.[name];
        if (!Array.isArray(segments) || segments.length < count ||
            !segments.every((pair) => Array.isArray(pair) && pair.length === 2 &&
              Number.isFinite(pair[0]) && pair[0] >= 0 && isPositive(pair[1])) ||
            new Set(segments.map(([start]) => start)).size !== segments.length) {
          errors.push(`sounds.clips.${name} requires ${count} distinct atlas segments`);
        }
      }
      if (Object.keys(clips ?? {}).some((name) => !Object.hasOwn(counts, name))) {
        errors.push("sounds.clips contains an unknown clip");
      }
      return errors;
    },
    emit: withoutNotes,
  },
  {
    name: "cascade",
    validate: (data) => data.maxGen === 3 && data.maxCells === 400 && data.maxRuns === 8
      ? [] : ["cascade must specify the 3/400/8 stage 2 budget"],
    emit: withoutNotes,
  },
  { name: "art", validate: validateArt, emit: withoutNotes },
  { name: "ores", list: true, validate: validateOres, emit: withoutNotes },
  { name: "worlds", list: true, validate: validateWorlds, emit: withoutNotes },
];

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--input" || !args[1])) {
  console.error("Usage: node scripts/build-configs.mjs [--input <path>]");
  process.exit(1);
}

const input = args[1] ?? fileURLToPath(new URL("design-decisions.json", import.meta.url));
let decisions;
try {
  decisions = JSON.parse(readFileSync(input, "utf8"));
} catch (error) {
  console.error(`${input}: ${error.message}`);
  process.exit(1);
}

if (!isObject(decisions)) {
  console.error(`${input}: expected a JSON object`);
  process.exit(1);
}
const errors = duplicateBalance(decisions);
decisions = withBalance(decisions);
errors.push(...sections.flatMap(({ name, list, validate }) => {
  const data = decisions[name];
  if (list ? Array.isArray(data) && data.length > 0 : isObject(data)) return validate(data, decisions);
  return [`${name} must be ${list ? "a nonempty array" : "an object"}`];
}));
errors.push(...validateMineStrings(decisions));
if (errors.length > 0) {
  for (const error of errors) console.error(`${input}: ${error}`);
  process.exit(1);
}

const output = new URL("../src/shared/Config/", import.meta.url);
mkdirSync(output, { recursive: true });
for (const { name, emit } of sections) {
  writeFileSync(new URL(`${name}.json`, output), JSON.stringify(emit(decisions[name]), null, 2) + "\n");
  console.log(`wrote src/shared/Config/${name}.json`);
}
