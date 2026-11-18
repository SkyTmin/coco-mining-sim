import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCamp, validateSocial } from "./camp-config.mjs";
const config = Object.fromEntries(["camp","social","mine","plots"].map(name => [name, JSON.parse(readFileSync(new URL("../src/shared/Config/"+name+".json", import.meta.url)))]));
for (const [section, validate, invalid] of [
  ["camp", validateCamp, {archWidth:55, lampCount:17, ambience:.3, rimMax:1, rankColors:[]}],
  ["social", validateSocial, {guests:3, viewers:5, writeSeconds:1, boardSize:300, keyChance:2, reactions:["other"]}],
]) {
  assert.deepEqual(validate(config[section], config), []);
  for (const [key,value] of Object.entries(invalid)) assert.ok(validate({...config[section],[key]:value},config).length, key);
}
console.log("11 invalid camp/social configurations rejected");
