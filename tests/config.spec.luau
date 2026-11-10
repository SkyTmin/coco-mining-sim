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
	Test.it(
		"ships verified Claude PNG IDs, four cracks and all world slots and variants",
		function()
			local config = Loader.load("src/shared/Config")
			local strings = Loader.load("src/shared/Strings")
			local assets = serde.decode("json", fs.readFile("assets/blocks/ids.json")).assets
			local manifest = serde.decode("json", fs.readFile("assets/blocks/manifest.json"))
			local count = 0
			local function checkTexture(name: string)
				local file = name .. ".png"
				local receipt = assets[file]
				assert(receipt and receipt.id:match("^rbxassetid://[1-9]%d*$"), file)
				assert(receipt.sha256:match("^[a-f0-9]+$") and #receipt.sha256 == 64, file)
				expect(config.art.blocks[name]).toBe(receipt.id)
				local png = fs.readFile("assets/blocks/upload/" .. file)
				local size = if name == "beam"
						or name == "planks"
						or name == "fx_dust"
					then 64
					else 128
				expect(png:sub(17, 24)).toBe(string.char(0, 0, 0, size, 0, 0, 0, size))
			end
			for file in assets do
				checkTexture(file:sub(1, -5))
				count += 1
			end
			expect(count).toBe(353)
			expect(#config.art.cracks).toBe(4)
			for set, ids in config.art.cracks do
				expect(#ids).toBe(10)
				for stage, id in ids do
					expect(id).toBe(
						config.art.blocks["crack_" .. string.char(96 + set) .. "_" .. stage]
					)
				end
			end
			expect(config.art.dustTexture).toBe(config.art.blocks.fx_dust)
			expect(config.art.variantOdds).toEqual(manifest.variants)
			for i, world in config.worlds do
				local source = manifest.worlds[i]
				expect(world.id).toBe(source.id)
				expect(strings.t("world_" .. world.id, "ru")).toBe(source.name)
				local art = config.art.worlds[world.id]
				expect(art.lining).toBe(source.lining)
				expect(art.light).toBe(source.light)
				expect(#art.slots).toBe(5)
				checkTexture(art.lining)
				local blocks = { source.rock, table.unpack(source.ores) }
				for slot, block in blocks do
					expect(world.ores[slot][1]).toBe(block.id)
					expect(strings.t("ore_" .. block.id, "ru")).toBe(block.name)
					local entry = art.slots[slot]
					expect(entry.texture).toBe(block.texture)
					expect(entry.alts).toEqual(block.alts)
					expect(entry.dust).toEqual(block.dust)
					for _, alt in entry.alts do
						checkTexture(alt)
					end
					expect(entry.variants).toEqual(block.variants)
					expect(entry.glow).toBe(block.glow == true)
					checkTexture(entry.texture)
					for _, variant in entry.variants do
						checkTexture(variant)
					end
				end
			end
			expect(config.worlds[10].id).toBe("magma_springs")
			expect(config.art.worlds.meadow.slots[4].texture).toBe("copper")
			expect(config.art.worlds.copper_caves.slots[2].texture).toBe("copper_w2")
			expect(config.plots.frameWidth).toBe(7)
			expect(#config.progress.widths).toBe(2)
			expect(config.progress.widths[2].w).toBe(7)
		end
	)
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
