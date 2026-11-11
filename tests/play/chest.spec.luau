--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Config = Loader.load("src/shared/Config")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Chest = Loader.load("src/shared/Play/Chest.luau")
local expect = Test.expect
local function fresh(): any
	local p = { coins = 0, pickaxe = "starter" }
	Circle.initialize(p)
	return p
end

Test.describe("Pickaxe chest", function()
	Test.it(
		"spends exactly one key, rejects empty wallets and guarantees the first Rare family",
		function()
			for _, family in { "none", "storm", "dynamite", "rift", "frost" } do
				local p = fresh()
				p.family = if family == "none" then nil else family
				expect(Chest.open(p, 77)).toBe(nil)
				expect(p.pickChestsOpened).toBe(0)
				p.keys = 1
				local value = assert(Chest.open(p, 77))
				expect(value.rarity).toBe("rare")
				expect(value.family).toBe(if family == "none" then "storm" else family)
				expect(p.keys).toBe(0)
				expect(p.collection[value.id].count).toBe(1)
				expect(Chest.open(p, 77)).toBe(nil)
			end
		end
	)
	Test.it(
		"samples one million base rolls within 0.3 percentage points and never violates either pity",
		function()
			local total, seed = 1000000, 4042026
			local rarities = { common = 0, rare = 0, epic = 0, legendary = 0 }
			local families = { storm = 0, dynamite = 0, rift = 0, frost = 0 }
			local actual = table.clone(rarities)
			local actualFamilies = table.clone(families)
			local p = fresh()
			p.keys = total
			local sinceEpic, sinceLegendary = 0, 0
			for serial = 1, total do
				local rarity, family = Chest.roll(seed, serial)
				rarities[rarity] += 1
				families[family] += 1
				local value = assert(Chest.open(p, seed))
				actual[value.rarity] += 1
				actualFamilies[value.family] += 1
				sinceEpic += 1
				sinceLegendary += 1
				assert(sinceEpic <= 10 and sinceLegendary <= 60)
				if value.rarity == "epic" or value.rarity == "legendary" then
					sinceEpic = 0
				end
				if value.rarity == "legendary" then
					sinceLegendary = 0
				end
			end
			for rarity, count in rarities do
				assert(math.abs(count / total - Config.chests.pick.odds[rarity]) <= 0.003, rarity)
			end
			for family, count in families do
				assert(math.abs(count / total - 0.25) <= 0.003, family)
				assert(
					math.abs(actualFamilies[family] / total - 0.25) <= 0.003,
					family .. " with pity"
				)
			end
			expect(p.keys).toBe(0)
			expect(p.pickChestsOpened).toBe(total)
			print(
				string.format(
					"Chest 1M: base %.4f/%.4f/%.4f/%.4f%%; with pity %.4f/%.4f/%.4f/%.4f%%",
					rarities.common / 10000,
					rarities.rare / 10000,
					rarities.epic / 10000,
					rarities.legendary / 10000,
					actual.common / 10000,
					actual.rare / 10000,
					actual.epic / 10000,
					actual.legendary / 10000
				)
			)
		end
	)
end)
return true
