--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Action = Loader.load("src/shared/Play/MiningAction.luau")
local Old = Loader.load("tests/fixtures/stage4-mining-action.luau")
local D = Loader.load("src/shared/Play/ProfileDefaults.luau")
local C = Loader.load("src/shared/Play/Collection.luau")
local Family = Loader.load("src/shared/Play/Family.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Perks = Loader.load("src/shared/Play/Perks.luau")
local P = Loader.load("src/shared/Persistence.luau")
local Hash = Loader.load("src/shared/Mine/Hash.luau")
local Income = Loader.load("src/shared/Play/Income.luau")
local expect = Test.expect
Test.describe("Income regression", function()
	Test.it("matches frozen stage 4 to the coin on 10,000 seeded hand hits", function()
		local a, b, pa, pb, ra, rb
		local families = { "storm", "dynamite", "rift", "frost" }
		for i = 1, 10000 do
			if i % 100 == 1 then
				local world = Worlds.at(math.floor(i / 100) % 10 + 1)
				a = State.new(
					1223 + i,
					5,
					3,
					if i % 1000 == 1 then world.plateDepth else world.start
				)
				b = P.copy(a)
				pa = D.new(0)
				local family = families[math.floor(i / 100) % 4 + 1]
				C.grant(pa, family .. "_epic")
				pa.family, pa.pickaxe = family, family .. "_epic"
				pa.circle.cards = { coins = i % 51, crit = i % 26, power = 90, keys = 20 }
				pa.skills[family] = { i % 11, i % 7, i % 5, i % 3 }
				pb = P.copy(pa)
				ra, rb = Perks.new(), Perks.new()
			end
			local candidates = {}
			for x = -2, 2 do
				for y = 0, 2 do
					if State.isSolid(a, x, y, a.front) then
						table.insert(candidates, { x = x, y = y })
					end
				end
			end
			local cell = candidates[math.floor(Hash.unit(987, i, 91) * #candidates) + 1]
			local request = { now = i * 0.35, x = cell.x, y = cell.y, d = a.front }
			local fresh = assert(Action.perform(a, pa, ra, request))
			local old = assert(Old.perform(b, pb, rb, request))
			expect(fresh.coins).toBe(old.coins)
			expect(pa.coins).toBe(pb.coins)
			expect(a.front).toBe(b.front)
			expect(fresh.res.hist).toEqual(old.res.hist)
		end
	end)
	Test.it(
		"applies cups, temporary bonuses and fever exactly once including chests and plates",
		function()
			for _, depth in { 0, Worlds.at(1).plateDepth } do
				local p = D.new(0)
				C.grant(p, "dynamite_common")
				p.family, p.pickaxe = "dynamite", "dynamite_common"
				p.circle.cards.power = 50
				local q = P.copy(p)
				q.cups = 1
				local base = assert(
					Action.perform(
						State.new(4, 5, 3, depth),
						p,
						Perks.new(),
						{ ability = true, now = 0, ultLayers = 10 }
					)
				)
				local ctx = Income.context(q, Family.effects(q), { 3 }, 0, 30)
				local boosted = assert(
					Action.perform(
						State.new(4, 5, 3, depth),
						q,
						Perks.new(),
						{ ability = true, now = 0, ultLayers = 10, income = ctx }
					)
				)
				expect(boosted.coins).toBeCloseTo(base.coins * 30, 1e-7)
			end
		end
	)
	Test.it("rejects NaN, infinity and overflowing totals before mutating any input", function()
		for _, value in { 0 / 0, math.huge, 1e308 } do
			local p, st, runtime = D.new(0), State.new(4, 5, 3), Perks.new()
			local oldP, oldSt, oldRuntime = P.copy(p), P.copy(st), P.copy(runtime)
			local result, why = Action.perform(
				st,
				p,
				runtime,
				{ x = 0, y = 0, d = 0, now = 0, income = { P = value, T = 1, F = 1 } }
			)
			expect(result).toBe(nil)
			expect(why).toBe("income")
			expect(p).toEqual(oldP)
			expect(st).toEqual(oldSt)
			expect(runtime).toEqual(oldRuntime)
		end
	end)
end)
return true
