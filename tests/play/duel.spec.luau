--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Duel = Loader.load("src/shared/Play/Duel.luau")
local Defaults = Loader.load("src/shared/Play/ProfileDefaults.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local P = Loader.load("src/shared/Persistence.luau")
Test.describe("Duel", function()
	Test.it("keeps two equal temporary walls separate from the persistent mine", function()
		local mine = State.new(7, 7, 3, 80)
		State.removeCell(mine, 0, 1, 81, {})
		mine.damage[State.cellKey(0, 1, 80)] = 0.4
		local before = P.copy(mine)
		local a, b = Duel.wall(9), Duel.wall(9)
		for _, st in { a, b } do
			assert(Duel.hit(st, -2, 1, 0).blocks == 9)
			assert(Duel.hit(st, 2, 1, 0).delta == 1)
		end
		assert(
			P.equal(a, b)
				and P.equal(mine, before)
				and P.equal(Codec.encode(mine), Codec.encode(before))
		)
		assert(Duel.outcome(a.front, b.front, nil) == "draw")
	end)
	Test.it("scores, forfeits, and limits rewards independently by UTC day", function()
		local p = Defaults.new(0)
		local a, b = Duel.outcome(8, 6, nil)
		assert(a == "win" and b == "loss")
		assert(Duel.outcome(8, 6, "a") == "loss")
		assert(Duel.reward(p, "win", true, 1, 10, 0) == 0 and p.duelWins == 0)
		assert(Duel.reward(p, "draw", false, 1, 10, 0) == 0)
		for _ = 1, 10 do
			assert(Duel.reward(p, "win", false, 1, 10, 0) == 50)
		end
		assert(Duel.reward(p, "win", false, 1, 10, 0) == 0 and p.duelWins == 11 and p.keys == 10)
		assert(Duel.reward(p, "loss", false, 2, 10, 1) == 10)
	end)
end)
return true
