--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Copy = Loader.load("src/shared/Persistence.luau").copy
local config = Copy(Loader.load("src/shared/Config"))
config.worlds = {
	{
		id = "uniform",
		length = 1000000,
		hardStart = 1,
		hardEnd = 1,
		ores = { { "rock", 1 } },
		prices = { rock = 1 },
		plate = { hp = 10000, reward = 1, recommendedStrength = 1 },
		specials = { perChunk = 0, kinds = { { "chest", 1 } } },
	},
}
local uniform = {
	rangeHist = function(_seed, _x, _y, a, b, hist)
		hist[65] = (hist[65] or 0) + b - a
	end,
	cellAt = function()
		return 1
	end,
}
local loader = Loader.withOverrides({
	["src/shared/Config"] = config,
	["src/shared/Mine/MineGen.luau"] = uniform,
})
local State = loader.load("src/shared/Mine/MineState.luau")
local Resolve = loader.load("src/shared/Mine/Resolve.luau")
local Perks = loader.load("src/shared/Play/Perks.luau")
local expect = Test.expect
Test.describe("Family perks", function()
	Test.it(
		"centers deep perks on the actual target and keeps base explosions in their named footprint",
		function()
			local st = State.new(7, 7, 3)
			for depth = 0, 9 do
				State.removeCell(st, 0, 1, depth, {})
			end
			State.removeCell(st, 0, 1, 10, {})
			for _, family in { "dynamite", "rift", "storm" } do
				local route = Perks.route(
					st,
					family,
					"legendary",
					0,
					1,
					10,
					if family == "rift" then 24 else 30,
					Perks.new()
				)
				-- [владелец 11.11] up to 30 % of a deep perk clears the nearest leftovers in front of the target
				local count = if family == "rift" then 24 else 30
				local near = 0
				for index, cell in route do
					if cell.d < 10 then
						near += 1
						assert(index == near and State.isExposed(st, cell.x, cell.y, cell.d))
						assert(cell.d == st.front)
						continue
					end
					if family == "dynamite" then
						assert(cell.d < 12 and math.abs(cell.x) <= 2)
					end
					if family == "rift" then
						assert(cell.d < 18 and cell.x == 0)
					end
				end
				assert(near == math.ceil(count * 0.3))
			end
		end
	)
	Test.it(
		"mines the advertised extra blocks over 100000 homogeneous-wall hits per family and rarity",
		function()
			local target = { common = 1.2, rare = 2.1, epic = 3.6, legendary = 6.3 }
			local pick = { strength = 1, shape = "single", ultLayers = 10 }
			local runtime, seed, trials = Perks.new(), 4042026, 100000
			for _, family in config.familyRules.order do
				for _, rarity in config.familyRules.rarities do
					local blocks = 0
					for counter = 1, trials do
						local count = Perks.count(family, rarity, seed, counter, { perkSize = 1 })
						if count == 0 then
							continue
						end
						local st = State.new(seed, 5, 3)
						State.removeCell(st, 0, 1, 0, {})
						local route = Perks.route(st, family, rarity, 0, 1, 0, count, runtime)
						blocks += Resolve.perk(st, pick, route).blocks
					end
					local average = blocks / trials
					print(
						string.format("Perk %s/%s: %.5f extra blocks/hit", family, rarity, average)
					)
					assert(math.abs(average / target[rarity] - 1) <= 0.15, family .. "/" .. rarity)
				end
			end
		end
	)
	Test.it("bounds every route at the plate and window and respects ordinary hardness", function()
		for _, family in config.familyRules.order do
			local st = State.new(1, 5, 3, 999998)
			State.removeCell(st, 0, 1, st.front, {})
			local route = Perks.route(st, family, "legendary", 0, 1, st.front, 100, Perks.new())
			for _, point in route do
				assert(point.d < 999999 and point.d < st.front + config.mine.window)
			end
			local weak = { strength = 0.01, shape = "single", ultLayers = 10 }
			expect(Resolve.perk(st, weak, route).blocks).toBe(0)
		end
	end)
	Test.it(
		"marks frozen cells, removes mined flags and prefers frozen cells at shatter",
		function()
			local st, runtime = State.new(7, 5, 3), Perks.new()
			Perks.freeze(runtime, st, -2, 0, 0)
			expect(#Perks.frozen(runtime, st)).toBe(1)
			local route = Perks.route(st, "frost", "common", 0, 1, 0, 10, runtime)
			expect(route[1]).toEqual({ x = -2, y = 0, d = 0 })
			State.removeCell(st, -2, 0, 0, {})
			expect(#Perks.frozen(runtime, st)).toBe(0)
		end
	)
	Test.it(
		"scales size with skills without changing the chance and exposes all ult modifiers",
		function()
			for _, family in config.familyRules.order do
				for counter = 1, 1000 do
					local a = Perks.count(family, "legendary", 9, counter, { perkSize = 1 })
					local b = Perks.count(family, "legendary", 9, counter, { perkSize = 1.7 })
					expect(a > 0).toBe(b > 0)
					assert(b >= a)
				end
			end
			local runtime = Perks.new()
			Perks.ult("storm", runtime, { stormSeconds = 3 }, 10)
			expect(runtime.stormUntil).toBe(18)
			Perks.ult("rift", runtime, {}, 0)
			expect(runtime.nextPierce).toBe(3)
			expect(Perks.ult("dynamite", runtime, {}, 0).coinMultiplier).toBe(1.5)
			expect(Perks.ult("frost", runtime, {}, 0).plateMultiplier).toBe(2)
		end
	)
end)
return true
