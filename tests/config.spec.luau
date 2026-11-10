--!strict

local fs = require("@lune/fs")
local serde = require("@lune/serde")
local process = require("@lune/process")
local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local expect = Test.expect

Test.describe("Config", function()
	Test.it("loads both generated sections without notes", function()
		local config = Loader.load("src/shared/Config")
		expect(config.game.defaultLanguage).toBe("en")
		expect(config.game.languages).toEqual({ "en", "ru", "es", "fr" })
		local interval = config.game.autosaveSeconds
		assert(typeof(interval) == "number" and interval >= 30 and interval <= 600)
		assert(typeof(config.creative.admins) == "table")
		for _, userId in config.creative.admins do
			assert(typeof(userId) == "number" and userId % 1 == 0)
		end
		expect(config.game._note).toBe(nil)
		expect(config.creative._note).toBe(nil)
	end)
	Test.it("generates canonical balance without editable duplicates", function()
		local config = Loader.load("src/shared/Config")
		local decisions = serde.decode("json", fs.readFile("scripts/design-decisions.json"))
		expect(config.worlds[2].length).toBe(1100)
		expect(config.progress.hitSizes[5].price).toBe(90000)
		expect(config.mine.ultCharge).toBe(45)
		expect(decisions.worlds[2].length).toBe(nil)
		expect(decisions.progress).toBe(nil)
		expect(decisions.mine.ultCharge).toBe(nil)
	end)
	Test.it("ships the prison texture IDs, ten cracks and all fifty ore slots", function()
		local config = Loader.load("src/shared/Config")
		local textures = serde.decode("json", fs.readFile("assets/textures/ids.json"))
		assert(textures.atlas:match("^rbxassetid://[1-9]%d*$"))
		expect(config.art.atlas).toBe(textures.atlas)
		expect(#textures.cracks).toBe(10)
		expect(config.art.cracks).toEqual(textures.cracks)
		for name, id in textures.materials do
			assert(id:match("^rbxassetid://[1-9]%d*$"), name)
			expect(config.art.materials[name]).toBe(id)
		end
		local map = serde.decode("json", fs.readFile("assets/textures/blocks/map.json"))
		local newTiles = 0
		for i, world in config.worlds do
			expect(map.worlds[i].world).toBe(world.id)
			expect(#config.art.ores[world.id]).toBe(5)
			expect(config.art.lining[world.id]).toBe(map.worlds[i].lining)
			for j, slot in map.worlds[i].slots do
				expect(slot.ore).toBe(world.ores[j][1])
				local actual = config.art.ores[world.id][j]
				if slot.texture then
					newTiles += 1
					local png =
						fs.readFile("assets/textures/blocks/prison/" .. slot.texture .. ".png")
					expect(png:sub(17, 24)).toBe(string.char(0, 0, 0, 16, 0, 0, 0, 16))
					expect(actual.rect).toEqual(slot.rect)
				else
					expect(actual.material).toBe(slot.material)
				end
			end
		end
		expect(newTiles).toBe(14)
		local atlas = fs.readFile("assets/textures/prison-1024.png")
		expect(atlas:sub(17, 24)).toBe(string.char(0, 0, 4, 0, 0, 0, 4, 0))
		expect(config.plots.frameWidth).toBe(7)
		expect(#config.progress.widths).toBe(2)
		expect(config.progress.widths[2].w).toBe(7)
	end)
	Test.it("rejects simulation overrides for production config", function()
		for _, name in { "G", "V", "HARD", "CUPS", "ULT" } do
			local result = process.exec(
				"node",
				{ "scripts/build-configs.mjs" },
				{ env = { [name] = "18" } }
			)
			expect(result.code).toBe(1)
			assert(result.stderr:find("Clear balance simulation overrides", 1, true), result.stderr)
		end
	end)
	Test.it("reports all invalid sections and exits with code one", function()
		fs.writeDir("build")
		local input = string.format("build/invalid-config-%d.json", math.random(1, 1000000000))
		fs.writeFile(
			input,
			[[{
			"game": { "defaultLanguage": "en", "languages": ["ru"], "autosaveSeconds": 5 },
			"creative": { "admins": [1.5] }
		}]]
		)
		local ok, result =
			pcall(process.exec, "node", { "scripts/build-configs.mjs", "--input", input })
		fs.removeFile(input)
		assert(ok, tostring(result))
		expect(result.code).toBe(1)
		for _, field in { "game.languages", "game.autosaveSeconds", "creative.admins" } do
			assert(result.stderr:find(field, 1, true), "Missing diagnostic for " .. field)
		end
	end)
end)

return true
