--!strict

local fs = require("@lune/fs")
local serde = require("@lune/serde")
local process = require("@lune/process")
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local expect = Test.expect

Test.describe("Mine config generation", function()
	Test.it(
		"emits the ten documented lengths, placeholder scaling, and all localized names",
		function()
			local config = Loader.load("src/shared/Config")
			local strings = Loader.load("src/shared/Strings")
			local lengths = { 500, 1100, 2400, 5300, 11650, 25650, 56450, 124200, 273250, 601150 }
			expect(#config.worlds).toBe(#lengths)
			for i, world in config.worlds do
				expect(world.length).toBe(lengths[i])
				expect(world._note).toBe(nil)
				expect(world.durability.base).toBe(2.5 ^ (i - 1))
				expect(world.plate.recommendedStrength).toBe(world.durability.base * 5)
				expect(world.plate.hp).toBe(world.plate.recommendedStrength * 40)
				for _, locale in { "en", "ru", "es", "fr" } do
					assert(strings.has("world_" .. world.id, locale))
					for _, ore in world.ores do
						assert(strings.has("ore_" .. ore[1], locale))
					end
				end
			end
		end
	)

	Test.it(
		"rejects a 120-layer world, 0.9 ore share sum, invalid width, and missing strings",
		function()
			local broken = serde.decode("json", fs.readFile("scripts/design-decisions.json"))
			broken.worlds[1].length = 120
			broken.worlds[1].ores[1][2] = 0.45
			broken.worlds[2].id = "missing_world"
			broken.worlds[2].rareFrom = 5
			broken.worlds[2].prices.tin = nil
			broken.mine.startWidth = 6
			fs.writeDir("build")
			local input = string.format("build/invalid-mine-%d.json", math.random(1, 1000000000))
			fs.writeFile(input, serde.encode("json", broken))
			local ok, result =
				pcall(process.exec, "node", { "scripts/build-configs.mjs", "--input", input })
			fs.removeFile(input)
			assert(ok, tostring(result))
			expect(result.code).toBe(1)
			for _, errorText in
				{
					"multiple of mine.chunk",
					"shares must sum to 1",
					"mine.startWidth",
					"world_missing_world in fr",
					"rareFrom",
					"prices.tin",
				}
			do
				assert(result.stderr:find(errorText, 1, true), result.stderr)
			end
		end
	)
end)

return true
