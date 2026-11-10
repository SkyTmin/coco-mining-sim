// Generate src/shared/Config/*.json from design-decisions.json.
// Usage: node scripts/build-configs.mjs [--input <path>]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  for (const field of ["window", "maxHoles", "maxHitsPerBlock", "blockSize"]) {
    if (!isPositiveInteger(data[field])) errors.push(`mine.${field} must be a positive integer`);
  }
  if (!Array.isArray(data.passThrough) || data.passThrough.length !== 3 ||
      !data.passThrough.every((n, i, levels) => Number.isFinite(n) && n >= 1 && (!i || n > levels[i - 1]))) {
    errors.push("mine.passThrough must contain three increasing thresholds of at least 1");
  }
  if (!isPositive(data.plate?.ultPlateHits) || !isPositive(data.plate?.ultMultiplier)) {
    errors.push("mine.plate must have positive ultPlateHits and ultMultiplier");
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

function validateWorlds(data, decisions) {
  const errors = [];
  const oreIds = new Set(Array.isArray(decisions.ores) ? decisions.ores.map((ore) => ore?.id) : []);
  const ids = new Set();
  const chunk = decisions.mine?.chunk;
  let totalDepth = 0;
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
      if (!isPositiveInteger(world.rareFrom) || world.rareFrom > world.ores.length) {
        errors.push(`${prefix}.rareFrom must index one of the world's ores`);
      }
    }
    if (!isFraction(world.richness)) errors.push(`${prefix}.richness must be in [0, 1]`);
    if (!isPositive(world.durability?.base) || !isPositive(world.durability?.growthInWorld)) {
      errors.push(`${prefix}.durability must have positive base and growthInWorld`);
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
  return errors;
}

function validatePickaxes(data, decisions) {
  const errors = [];
  for (const [id, family] of [["starter", null], ["storm_common", "storm"]]) {
    const pick = data[id];
    if (pick?.family !== family || pick.shape !== "single" || !isPositive(pick.strength) ||
        !isPositive(pick.interval) || !isPositiveInteger(pick.ultLayers) ||
        pick.ultLayers > decisions.mine?.window || pick.ultCharge !== 45) {
      errors.push(`pickaxes.${id} has invalid stage 2 settings`);
    }
  }
  const storm = data.storm_common?.storm;
  if (storm?.jumps?.[0] !== 3 || storm.jumps[1] !== 5 || storm.pickRareWithin !== 2) {
    errors.push("pickaxes.storm_common.storm must specify 3–5 jumps and radius 2");
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
    validate: (data) => data.count === 8 && data.frameWidth === 9 &&
      [data.entranceRadius, data.platformDepth, data.spectatorDepth].every(isPositiveInteger)
      ? [] : ["plots must specify eight radial plots, a 9-block frame and positive dimensions"],
    emit: withoutNotes,
  },
  { name: "pickaxes", validate: validatePickaxes, emit: withoutNotes },
  {
    name: "fx",
    validate: ({ ult, fogStart, fogEnd, lampSpacing, impactTime }) =>
      ult?.windup === 0.15 && ult.fractureMin === 0.5 && ult.fractureMax === 0.9 &&
      ult.empty >= 0.25 && ult.empty <= 0.35 &&
      ult.approachBase === 0.45 && ult.approachPerLog === 0.35 &&
      [ult.fracturePerLog, ult.distanceBase, ult.distancePerLog, fogStart, fogEnd, lampSpacing, impactTime].every(isPositive) &&
      fogStart < fogEnd && impactTime <= 0.15 ? [] : ["fx must specify the stage 2b timing and tunnel distances"],
    emit: withoutNotes,
  },
  {
    name: "sounds",
    validate({ atlasId, clips, rules }) {
      const counts = {
        hit_soft: 5, break_soft: 5, coin: 1, link_note: 1, bolt_soft: 2, ride_stop: 2,
        ult_windup: 1, ult_whump: 1, ult_rumble_away: 1, ult_rumble_near: 1, ult_thud: 1,
        plate_hit: 2, plate_break: 1, ui_tap: 1,
      };
      const errors = [];
      if (atlasId !== null && (typeof atlasId !== "string" || !/^rbxassetid:\/\/\d+$/.test(atlasId))) {
        errors.push("sounds.atlasId must be null or a Roblox audio asset ID");
      }
      if (rules?.maxVolume !== 0.5 || rules.frequentVolume !== 0.25 || rules.linkVolume !== 0.12 ||
          rules.defaultSfx !== 0.6 || rules.frequentLufs !== -26 || rules.rareLufs !== -20 ||
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
const errors = sections.flatMap(({ name, list, validate }) => {
  const data = decisions[name];
  if (list ? Array.isArray(data) && data.length > 0 : isObject(data)) return validate(data, decisions);
  return [`${name} must be ${list ? "a nonempty array" : "an object"}`];
});
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
