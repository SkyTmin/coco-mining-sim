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

local function expectedWithPity()
	local rules = Config.chests.pick
	local odds = rules.odds
	-- A Legendary ends the cycle and resets both counters. Track the surviving
	-- probability by the number of low-rarity draws since the last Epic.
	local alive = table.create(rules.pityEpic, 0)
	alive[1] = 1
	local epicsPerCycle = 0
	for _ = 1, rules.pityLegendary - 1 do
		local nextAlive = table.create(rules.pityEpic, 0)
		for gap, mass in alive do
			local nonLegendary = mass * (1 - odds.legendary)
			local epic = if gap == rules.pityEpic then nonLegendary else mass * odds.epic
			epicsPerCycle += epic
			nextAlive[1] += epic
			if gap < rules.pityEpic then
				nextAlive[gap + 1] += nonLegendary - epic
			end
		end
		alive = nextAlive
	end

	-- One Legendary per cycle, whose length is a capped geometric variable.
	local legendary = odds.legendary / (1 - (1 - odds.legendary) ^ rules.pityLegendary)
	local epic = epicsPerCycle * legendary
	local lowShare = (1 - legendary - epic) / (odds.common + odds.rare)
	return {
		common = odds.common * lowShare,
		rare = odds.rare * lowShare,
		epic = epic,
		legendary = legendary,
	}
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
		"matches the base and post-pity odds in one million draws within 0.3 percentage points",
		function()
			local total, seed = 1000000, 4042026
			local rules = Config.chests.pick
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
				local isLegendary = value.rarity == "legendary"
				local isEpicOrBetter = value.rarity == "epic" or isLegendary
				assert(sinceEpic < rules.pityEpic or isEpicOrBetter, "missed Epic guarantee")
				assert(
					sinceLegendary < rules.pityLegendary or isLegendary,
					"missed Legendary guarantee"
				)
				if isEpicOrBetter then
					sinceEpic = 0
				end
				if isLegendary then
					sinceLegendary = 0
				end
			end
			local expected = expectedWithPity()
			for rarity, count in rarities do
				assert(math.abs(count / total - rules.odds[rarity]) <= 0.003, rarity)
				assert(
					math.abs(actual[rarity] / total - expected[rarity]) <= 0.003,
					rarity .. " with pity"
				)
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
					"Chest 1M: base %.4f/%.4f/%.4f/%.4f%%; with pity %.4f/%.4f/%.4f/%.4f%% (expected %.4f/%.4f/%.4f/%.4f%%)",
					rarities.common / 10000,
					rarities.rare / 10000,
					rarities.epic / 10000,
					rarities.legendary / 10000,
					actual.common / 10000,
					actual.rare / 10000,
					actual.epic / 10000,
					actual.legendary / 10000,
					expected.common * 100,
					expected.rare * 100,
					expected.epic * 100,
					expected.legendary * 100
				)
			)
		end
	)
end)
return true
