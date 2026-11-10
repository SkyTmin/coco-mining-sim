--!strict

local fs = require("@lune/fs")
local serde = require("@lune/serde")
local process = require("@lune/process")
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local expect = Test.expect

Test.describe("Mine config generation", function()
	Test.it("emits the ten canonical worlds, five slots and localized names", function()
		local config = Loader.load("src/shared/Config")
		local strings = Loader.load("src/shared/Strings")
		local lengths = { 500, 1100, 2400, 5300, 11650, 25650, 56450, 124200, 273250, 601150 }
		expect(#config.worlds).toBe(#lengths)
		for i, world in config.worlds do
			expect(world.length).toBe(lengths[i])
			expect(world._note).toBe(nil)
			expect(world.hardStart).toBe(20 ^ (i - 1))
			expect(world.hardEnd).toBe(world.hardStart * 1.5)
			expect(world.plate.hp).toBe(world.hardEnd * 20)
			expect(world.plate.reward).toBe(world.rockValue * 500)
			expect(#world.ores).toBe(5)
			for _, locale in { "en", "ru", "es", "fr" } do
				assert(strings.has("world_" .. world.id, locale))
				for _, ore in world.ores do
					assert(strings.has("ore_" .. ore[1], locale))
				end
			end
		end
	end)

	Test.it("rejects duplicated balance and missing ore or world strings", function()
		local broken = serde.decode("json", fs.readFile("scripts/design-decisions.json"))
		broken.worlds[1].length = 120
		broken.worlds[2].id = "missing_world"
		broken.worlds[2].oreIds[3] = "not_an_ore"
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
				"worlds[0].length comes from balance/data.mjs",
				"mine.startWidth comes from balance/data.mjs",
				"world_missing_world in fr",
				"unknown or repeated ore: not_an_ore",
			}
		do
			assert(result.stderr:find(errorText, 1, true), result.stderr)
		end
	end)
end)

return true
