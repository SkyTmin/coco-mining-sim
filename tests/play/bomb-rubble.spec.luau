--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local A = Loader.load("src/shared/Play/MiningAction.luau")
local E = Loader.load("src/shared/Play/MineEvents.luau")
local R = Loader.load("src/shared/Mine/Resolve.luau")
local S = Loader.load("src/shared/Mine/MineState.luau")
local W = Loader.load("src/shared/Mine/Worlds.luau")
local D = Loader.load("src/shared/Play/ProfileDefaults.luau")
local C = Loader.load("src/shared/Play/Collection.luau")
local P = Loader.load("src/shared/Play/Perks.luau")
local Economy = Loader.load("src/shared/Mine/Economy.luau")
local Config = Loader.load("src/shared/Config")
local expect = Test.expect
local function random()
	return 0.5
end
local function mine()
	local st, e, p = S.new(17, 5, 3, W.at(3).start), E.new(0, random), D.new(0)
	e.bomb = { cell = { x = 0, y = 1, d = st.front }, deadline = 5 }
	return st, e, p
end
Test.describe("Bomb and rubble transactions", function()
	Test.it(
		"uses one hit at high hardness, pays blast alone at x2 and counts no cell twice",
		function()
			for _, family in { "starter", "storm", "dynamite", "rift", "frost" } do
				local st, e, p = mine()
				if family ~= "starter" then
					C.grant(p, family .. "_epic")
					p.family, p.pickaxe = family, family .. "_epic"
				end
				local out = assert(
					A.perform(st, p, P.new(), { now = 5.25, marks = e, x = 0, y = 1, d = st.front })
				)
				assert(out.blast)
				local unique = {}
				for _, cell in out.res.cells do
					local key = S.cellKey(cell.x, cell.y, cell.d)
					assert(not unique[key], "duplicate destroyed coordinate")
					unique[key] = true
				end
				expect(#out.res.cells).toBe(out.res.blocks)
				local nonBlast = table.clone(out.res.hist)
				for key, count in out.blast.hist do
					nonBlast[key] -= count
				end
				local expected = Economy.coinsFor(nonBlast, 0, out.strike.coinMultiplier)
					+ Economy.coinsFor(out.blast.hist, 0, 2)
				for _, reward in out.rewards do
					expected += reward.coins
				end
				expect(out.coins).toBe(expected)
				expect(e.bomb).toBe(nil)
				expect(out.events[#out.events].kind).toBe(7)
				expect(#out.events[#out.events].points).toBe(#out.blast.cells)
			end
		end
	)
	Test.it(
		"an ultimate cannot pay twice for its removed cells, and a blast chest gives no key or x2",
		function()
			local st, e, p = mine()
			local key = S.cellKey(1, 1, st.front + 1)
			st.chests = {
				[key] = {
					x = 1,
					y = 1,
					d = st.front + 1,
					kind = "chest",
					tier = 1,
					stage = "firstKey",
				},
			}
			local out = assert(
				A.perform(st, p, P.new(), { now = 1, marks = e, ability = true, ultLayers = 1 })
			)
			assert(out.blast and out.blast.blocks > 0)
			expect(p.wallChestKeyCounter).toBe(0)
			expect(#out.rewards).toBe(1)
			expect(out.rewards[1].keys).toBe(0)
			local chestFind
			for _, find in out.res.finds do
				if find.kind == "chest" then
					chestFind = find
				end
			end
			expect(chestFind.source).toBe("bomb")
			local Chests = Loader.load("src/shared/Play/WallChests.luau")
			local F = Loader.load("src/shared/Play/Family.luau")
			expect(out.rewards[1].coins).toBe(
				Chests.reward(D.new(0), chestFind, false, 17, F.effects(p), 1).coins
			)
			st, e, p = mine()
			out = assert(
				A.perform(st, p, P.new(), { now = 1, marks = e, ability = true, ultLayers = 3 })
			)
			expect(out.blast.blocks).toBe(0)
		end
	)
	Test.it(
		"expires after grace into two empty layers, excludes chests and plates, and pays nothing by any source",
		function()
			for _, source in { "hand", "perk", "ult" } do
				local st, e, p = mine()
				local old = st.front
				expect(#E.tick(e, st, 5.25, 0, false, false, random)).toBe(0)
				local events = E.tick(e, st, 5.251, 0, false, false, random)
				expect(events[1].type).toBe(6)
				expect(events[2].type).toBe(7)
				expect(#events[1].points).toBe(30)
				local pick =
					{ strength = 1, shape = "single", ultLayers = 2, marks = e, chestFrequency = 1 }
				local res
				if source == "hand" then
					res = R.hit(st, pick, 0, 1, old)
				elseif source == "perk" then
					res = R.perk(st, pick, { { x = 0, y = 1, d = old } })
				else
					res = R.ult(st, pick)
				end
				assert(res and res.blocks > 0)
				expect(res.hist).toEqual({})
				expect(res.finds).toEqual({})
				expect(e.rubble[S.cellKey(0, 1, old)]).toBe(nil)
			end
			local st, e = mine()
			st.front = W.at(3).plateDepth - 1
			local cells = E.rubbleCells(st)
			for _, cell in cells do
				expect(cell.d).toBe(st.front)
			end
		end
	)
	Test.it("respects world three, deadline and a single shared slot", function()
		local st, e, p = mine()
		e.bomb = nil
		expect(E.start(e, S.new(1, 5, 3), "bomb", 0, random)).toBe(nil)
		local out = E.start(e, st, "bomb", 0, random)
		expect(out[1].type).toBe(5)
		expect(E.start(e, st, "vein", 0, random)).toBe(nil)
		local cell = e.bomb.cell
		local hit = assert(
			A.perform(
				st,
				p,
				P.new(),
				{ now = 5.251, marks = e, x = cell.x, y = cell.y, d = cell.d }
			)
		)
		expect(hit.blast).toBe(nil)
		local after = E.tick(e, st, 5.252, 0, false, false, random)
		expect(after[1].type).toBe(6)
	end)
end)
return true
