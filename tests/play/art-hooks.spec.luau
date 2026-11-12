--!strict
local Test = require("../lib/expect")
local process = require("@lune/process")
local expect = Test.expect
Test.describe("Family art hooks", function()
	Test.it(
		"accepts Claude's manifest without changing logical pickaxe IDs and rejects malformed entries",
		function()
			local result = process.exec("node", {
				"--input-type=module",
				"-e",
				[[
import assert from 'node:assert/strict';
import { familyConfig, familyArt } from './scripts/family-config.mjs';
const config = familyConfig({pickaxes: {starter: {rarity:'wood'}}});
const art = familyArt(config.pickaxes, config.families, {pickaxes: {
  storm_common: {icon:'rbxassetid://123', model:'StormCommon'}
}, chests: {wall:[1,2,3,4].map(i => ({model:'WallChest'+i})), pick:{model:'PickChest'}}});
assert.equal(Object.keys(art.pickaxes).length, 17);
assert.equal(art.pickaxes.storm_common.model, 'StormCommon');
assert.equal(art.pickaxes.frost_legendary.placeholder, true);
assert.equal(art.chests.pick.model, 'PickChest');
assert.throws(() => familyArt(config.pickaxes, config.families, {storm_common:{icon:'bad',model:'x'}}));
assert.throws(() => familyArt(config.pickaxes, config.families, {unknown:{icon:'rbxassetid://1',model:'x'}}));
assert.throws(() => familyArt(config.pickaxes, config.families, {pickaxes:{},chests:{wall:[],pick:{model:'x'}}}));
]],
			})
			expect(result.code).toBe(0)
			assert(result.stderr == "", result.stderr)
		end
	)
end)
return true
