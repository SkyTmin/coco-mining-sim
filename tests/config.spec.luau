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
	Test.it("ships fourteen original 16 by 16 block images with manifest entries", function()
		local config = Loader.load("src/shared/Config")
		local manifest = serde.decode("json", fs.readFile("assets/textures/ids.json"))
		local seen = {}
		local count = 0
		for i = 1, 3 do
			for _, slot in config.worlds[i].ores do
				local id = slot[1]
				if not seen[id] then
					seen[id] = true
					count += 1
					local png = fs.readFile("assets/textures/blocks/" .. id .. ".png")
					expect(png:sub(17, 24)).toBe(string.char(0, 0, 0, 16, 0, 0, 0, 16))
				end
			end
		end
		expect(count).toBe(14)
		local listed = 0
		for id in manifest do
			assert(seen[id], "Unexpected block texture " .. id)
			listed += 1
		end
		-- Lune decodes JSON null as nil, so also count the manifest's keys in its source.
		local _, keys = fs.readFile("assets/textures/ids.json"):gsub('"[%w_]+"%s*:', "")
		expect(keys).toBe(14)
		assert(listed <= keys)
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
