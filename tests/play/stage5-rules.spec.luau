--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local S = Loader.load("src/shared/Play/Streak.luau")
local Pace = Loader.load("src/shared/Play/Pace.luau")
local Income = Loader.load("src/shared/Play/Income.luau")
local E = Loader.load("src/shared/Play/MineEvents.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Chests = Loader.load("src/shared/Play/WallChests.luau")
local expect = Test.expect
Test.describe("Rush, pace and income", function()
	Test.it(
		"reaches each tier with accepted hand hits and preserves its old multiplier for the hit",
		function()
			local s = S.new(0)
			local reached = {}
			for i = 1, 300 do
				S.decay(s, i * 0.35, false)
				local old = S.tier(s)
				S.add(s, i * 0.35, 0.35)
				local tier = S.tier(s)
				if tier > old then
					reached[tier] = i * 0.35
				end
			end
			for i, t in { 10, 25, 50, 90 } do
				assert(reached[i] >= t and reached[i] < t + 0.35)
			end
			expect(s.gauge).toBe(100)
			for _, row in { { 5, 3 }, { 15, 2 }, { 60, 1.5 }, { 120, 1 } } do
				local copy = table.clone(s)
				S.decay(copy, s.at + row[1], false)
				expect(S.multiplier(copy)).toBe(row[2])
			end
			local copy = table.clone(s)
			S.decay(copy, s.at + 100, true)
			expect(copy.gauge).toBe(100)
			S.add(copy, copy.at, 0.35, "auto")
			expect(copy.gauge).toBe(100)
			copy = S.new(0)
			S.add(copy, 1, 0.35, "ult")
			expect(copy.gauge).toBe(0)
		end
	)
	Test.it("decays identically in many frames or one frame", function()
		local a = S.new(0)
		a.gauge = 100
		local b = table.clone(a)
		for i = 1, 1500 do
			S.decay(a, i / 100, false)
		end
		S.decay(b, 15, false)
		expect(a.gauge).toBeCloseTo(b.gauge, 1e-9)
	end)
	Test.it(
		"uses active seconds, coalesces same-second actions and drops old active buckets",
		function()
			local p = Pace.new()
			for i = 1, 29 do
				Pace.record(p, i, 2)
			end
			expect(Pace.eta(p, 0, 1000)).toBe(nil)
			Pace.record(p, 500, 2)
			Pace.record(p, 500.5, 2)
			expect(Pace.rate(p)).toBe(62 / 30)
			for i = 501, 620 do
				Pace.record(p, i, 1)
			end
			expect(#p.seconds).toBe(120)
			expect(Pace.rate(p)).toBe(1)
			expect(Pace.eta(p, 10, 1000)).toBe(990)
			expect(Pace.eta(p, 10, 1000, true)).toBe(math.huge)
		end
	)
	Test.it("matches every income example and rejects nonfinite multipliers", function()
		expect(Income.multiplier(Income.context({ cups = 0 }, { coins = 1 }))).toBe(1)
		expect(Income.multiplier(Income.context({ cups = 1 }, { coins = 1 }, { 1.5 }))).toBe(3)
		expect(Income.multiplier(Income.context({ cups = 1 }, { coins = 1 }, { 1.5 }, 10, 40))).toBe(
			15
		)
		local ctx = Income.context({ cups = 10 }, { coins = 1.12 * 1.3 }, { 3 }, 10, 40)
		expect(120 * Income.multiplier(ctx, 3)).toBeCloseTo(86486.4, 1e-8)
		expect(27 * 4 * Income.multiplier(Income.context({ cups = 1 }, { coins = 1 }, { 2 }), 2)).toBe(
			864
		)
		expect(Income.temporary({ 3, 2, 2, 2 })).toBe(6)
		expect(Income.temporary({ 3, 10, 10 })).toBe(10)
		expect(Income.multiplier(Income.context({ cups = 0 }, { coins = 1 }, { 10, 10 }, 1, 30))).toBe(
			50
		)
		expect(Income.valid({ P = 0 / 0, T = 1, F = 1 })).toBe(false)
		expect(Income.valid({ P = math.huge, T = 1, F = 1 })).toBe(false)
	end)
end)
Test.describe("Mine event rules", function()
	Test.it("selects a connected vein of ordinary exposed cells, never chests or rubble", function()
		for seed = 1, 100 do
			local st = State.new(seed, 5, 3)
			local e = E.new(0, function()
				return 0.5
			end)
			e.rubble[State.cellKey(0, 1, 0)] = true
			local cells = E.veinCells(st, e, function()
				return 0.5
			end)
			assert(#cells >= 3 and #cells <= 5)
			for i, cell in cells do
				assert(State.isExposed(st, cell.x, cell.y, cell.d))
				assert(not Chests.at(st, cell.x, cell.y, cell.d))
				assert(not e.rubble[E.key(cell)])
				if i > 1 then
					local prev = cells[i - 1]
					expect(math.abs(cell.x - prev.x) + math.abs(cell.y - prev.y)).toBe(1)
				end
			end
		end
		local st = State.new(1, 5, 3, Worlds.at(1).plateDepth)
		expect(E.veinCells(
			st,
			E.new(0, function()
				return 0
			end),
			function()
				return 0
			end
		)).toEqual({})
	end)
	Test.it("accepts the inclusive latency deadline and either a hand hit or removal", function()
		local st = State.new(1, 5, 3)
		local e = { vein = { cells = { { x = 0, y = 0, d = 0 } }, deadline = 10 } }
		expect(E.hitVein(e, st, { x = 0, y = 0, d = 0, now = 10.25 })).toBe(true)
		expect(E.hitVein(e, st, { x = 0, y = 0, d = 0, now = 10.251 })).toBe(false)
		State.removeCell(st, 0, 0, 0, {})
		for _, source in { "hand", "perk", "ult", "bomb" } do
			expect(E.hitVein(e, st, { now = 10, ability = true, source = source })).toBe(true)
		end
	end)
	Test.it("clips blast and rubble to wall and plate and counts each coordinate once", function()
		local st = State.new(1, 5, 3, Worlds.at(3).plateDepth - 1)
		local cells = E.blastCells(st, { x = 2, y = 0, d = st.front })
		expect(#cells).toBe(4)
		for _, cell in cells do
			expect(cell.d).toBe(st.front)
		end
		for _, cell in E.rubbleCells(st) do
			assert(not Chests.at(st, cell.x, cell.y, cell.d))
			expect(cell.d).toBe(st.front)
		end
	end)
end)
return true
