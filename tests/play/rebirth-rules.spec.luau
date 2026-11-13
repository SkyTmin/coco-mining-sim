--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local R = Loader.load("src/shared/Play/Rebirth.luau")
local Ranks = Loader.load("src/shared/Play/Ranks.luau")
local D = Loader.load("src/shared/Play/ProfileDefaults.luau")
local C = Loader.load("src/shared/Play/Collection.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local P = Loader.load("src/shared/Persistence.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local expect = Test.expect
local function ready(cups: number?, plate: number?): any
	local p = D.new(1000)
	p.cups, p.circleDeepestPlate, p.deepestWorld = cups or 0, plate or 3, 5
	return p
end
Test.describe("Rebirth rules", function()
	Test.it(
		"matches every gain and recommendation boundary including exactly ten percent",
		function()
			for _, row in
				{
					{ 0, 3, 1, true },
					{ 1, 3, 1, true },
					{ 9, 3, 1, true },
					{ 10, 3, 1, false },
					{ 29, 4, 3, true },
					{ 30, 4, 3, false },
					{ 250, 6, 25, false },
					{ 250, 7, 90, true },
				}
			do
				local q = R.quote(ready(row[1], row[2]), 901)
				expect(q.gain).toBe(row[3])
				expect(q.profitable).toBe(row[4])
				expect(R.quote(ready(row[1], row[2]), 900).profitable).toBe(false)
			end
			for i, gain in { 0, 0, 1, 3, 8, 25, 90, 370, 1500, 6000 } do
				expect(R.cupsFor(i)).toBe(gain)
			end
			expect(R.quote(ready(0, 2)).available).toBe(false)
			expect(R.quote(ready()).profitable).toBe(true)
		end
	)
	Test.it("matches all lift examples and keeps size rewards disabled", function()
		for _, row in
			{ { 1, 4, 1 }, { 10, 4, 3 }, { 12, 7, 3 }, { 30, 4, 3 }, { 30, 5, 4 }, { 260, 7, 6 } }
		do
			expect(Ranks.liftMax(row[1], row[2])).toBe(row[3])
		end
		expect(Ranks.of(0)).toBe(nil)
		for _, row in
			{
				{ 1, "digger" },
				{ 3, "tunneler" },
				{ 10, "driller" },
				{ 30, "master" },
				{ 250, "grandmaster" },
				{ 1000, "legend" },
				{ 4000, "conqueror" },
				{ 16000, "core_heart" },
			}
		do
			expect(Ranks.of(row[1]).id).toBe(row[2])
			expect(Ranks.startSize(row[1])).toBe(1)
		end
	end)
	Test.it(
		"plans without writes and applies the complete field-by-field reset contract",
		function()
			local p = ready(9, 4)
			C.grant(p, "storm_common")
			C.grant(p, "storm_rare")
			C.grant(p, "frost_common")
			C.grant(p, "frost_rare", true)
			p.circle.pickLevels.frost_common = 10
			p.circle.cards = { coins = 9, power = 14 }
			p.coins = 2100000
			p.keys = 7
			p.keyHits = 12
			p.rebirths = 3
			p.familyChangeDay = 100
			p.skills.storm = { 3, 2, 0, 0 }
			p.worldBest = { ["1"] = 90 }
			Circle.reach(p, 5)
			local before = P.copy(p)
			local choice = { serial = 3, gain = 3, family = "frost", start = 3, playSeconds = 1234 }
			local plan = assert(R.plan(p, choice, 777, Worlds.at(3).start))
			expect(p).toEqual(before)
			R.commit(p, plan)
			local expected = P.copy(before)
			expected.coins, expected.cups, expected.rebirths = 0, 12, 4
			expected.circle = { hitSize = 1, pickLevels = {}, cards = {} }
			expected.circleDeepestPlate, expected.circleStartWorld = 0, 3
			expected.circleStartedAt, expected.circleWorldAt, expected.liftChoice = 1234, 1234, 3
			expected.family, expected.pickaxe, expected.pickaxeGolden = "frost", "frost_rare", true
			expected.nextFamily = {}
			expected.mine = Codec.encode(plan.state)
			expect(p).toEqual(expected)
			expect(plan.state.front).toBe(Worlds.at(3).start)
			expect(Codec.decode(p.mine).seed).toBe(777)
			expect(R.quote(p).available).toBe(false)
			expect(R.validate(p, choice)).toBe("stale")
		end
	)
	Test.it("validates choices and cannot claim skipped lift plates", function()
		local p = ready(29, 4)
		C.grant(p, "storm_common")
		local choice = { serial = 0, gain = 3, family = "storm", start = 4, playSeconds = 2000 }
		for _, row in
			{
				{ "serial", 1, "stale" },
				{ "gain", 90, "changed" },
				{ "family", "frost", "family" },
				{ "start", 5, "start" },
			}
		do
			local bad = table.clone(choice)
			bad[row[1]] = row[2]
			expect(R.validate(p, bad)).toBe(row[3])
		end
		local plan = assert(R.plan(p, choice, 991, Worlds.at(4).start))
		R.commit(p, plan)
		expect(p.rewards.masterEpic).toBe("pending")
		expect(R.quote(p).available).toBe(false)
		p.circleDeepestPlate = 4
		p.rewards.masterEpic = "claimed"
		choice.serial = 1
		R.commit(p, assert(R.plan(p, choice, 992, Worlds.at(4).start)))
		expect(p.rewards.masterEpic).toBe("claimed")
	end)
	Test.it("handles no family, one family, defaults, and damaged profiles atomically", function()
		local p = ready()
		local choice = { serial = 0, gain = 1, family = "", start = 1, playSeconds = 5 }
		local plan = assert(R.plan(p, choice, 91, 0))
		R.commit(p, plan)
		expect(p.family).toBe(nil)
		expect(p.pickaxe).toBe("starter")
		p = ready(9, 3)
		p.liftChoice = 2
		expect(R.quote(p).start).toBe(2)
		p.liftChoice = nil
		expect(R.quote(p).start).toBe(3)
		for _, damage in
			{
				function(q)
					q.cups = -1
				end,
				function(q)
					q.width = 4
				end,
				function(q)
					q.skills = nil
				end,
				function(q)
					q.rewards = {}
				end,
			}
		do
			p = ready()
			damage(p)
			local before = P.copy(p)
			local result, why = R.plan(p, choice, 91, 0)
			expect(result).toBe(nil)
			expect(why).toBe("unavailable")
			expect(p).toEqual(before)
		end
	end)
end)
return true
