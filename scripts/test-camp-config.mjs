import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCamp, validateSocial } from "./camp-config.mjs";

const config = {};
for (const name of ["camp", "social", "mine", "plots"]) {
  const path = new URL(`../src/shared/Config/${name}.json`, import.meta.url);
  config[name] = JSON.parse(readFileSync(path, "utf8"));
}
const trials = [
  ["camp", validateCamp, [
    ["archWidth", 55], ["lampCount", 17], ["ambience", 0.3], ["rimMax", 1],
    ["rankColors", []], ["rockColors", "grey"], ["lightBudget", 15.5],
  ]],
  ["social", validateSocial, [
    ["guests", 3], ["viewers", 5], ["writeSeconds", 1], ["boardSize", 300],
    ["keyChance", 2], ["reactions", ["other"]], ["reactions", "like"],
  ]],
];
let rejected = 0;
for (const [section, validate, invalid] of trials) {
  assert.deepEqual(validate(config[section], config), []);
  for (const [key, value] of invalid) {
    assert.ok(validate({ ...config[section], [key]: value }, config).length, key);
    rejected += 1;
  }
}
console.log(`${rejected} invalid camp/social configurations rejected`);
