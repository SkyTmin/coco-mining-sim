// Generate src/shared/Config/*.json from design-decisions.json.
// Usage: node scripts/build-configs.mjs [--input <path>]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

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
const errors = sections.flatMap(({ name, validate }) =>
  isObject(decisions[name]) ? validate(decisions[name]) : [`${name} must be an object`]);
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
