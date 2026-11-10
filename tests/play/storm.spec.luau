--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Fixture = require("../mine/fixture")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Gen = Loader.load("src/shared/Mine/MineGen.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Storm = Loader.load("src/shared/Play/Storm.luau")
local Config = Loader.load("src/shared/Config")
local expect = Test.expect

Test.describe("Storm", function()
	Test.it("uses a repeatable route of unique exposed solids within the cascade budget", function()
		local st = State.new(7073, 5, 3)
		State.removeRange(st, 0, 1, 0, 10, {})
		local cfg = Config.pickaxes.storm_common.storm
		local function route()
			local rand = Fixture.random(98721)
			return Storm.chain(st, {
				range = function(_, a, b)
					return rand(a, b)
				end,
			}, 0, 1, 0, cfg)
		end
		local a = route()
		expect(route()).toEqual(a)
		assert(#a >= 3 and #a <= 5 and #a + 1 <= Config.cascade.maxCells)
		local visited = {}
		for _, point in a do
			assert(point.d >= st.front and point.d < st.front + Config.mine.window)
			assert(
				State.isSolid(st, point.x, point.y, point.d)
					and State.isExposed(st, point.x, point.y, point.d)
			)
			local key = State.cellKey(point.x, point.y, point.d)
			assert(not visited[key])
			visited[key] = true
		end
	end)

	Test.it("prefers a rare ore within two cells over a closer common ore", function()
		local selected = nil
		for seed = 1, 150 do
			local st = State.new(seed, 5, 3)
			local close = Gen.cellAt(seed, 0, 0, 0)
			local far = Gen.cellAt(seed, 2, 1, 0)
			if close > 0 and not Worlds.isRare(close) and Worlds.isRare(far) then
				selected = st
				break
			end
		end
		local st = assert(selected)
		local route = Storm.chain(st, {
			range = function()
				return 3
			end,
		}, 0, 1, 0, Config.pickaxes.storm_common.storm)
		local p = route[1]
		assert(p and math.abs(p.x) + math.abs(p.y - 1) + p.d <= 2)
		assert(Worlds.isRare(Gen.cellAt(st.seed, p.x, p.y, p.d)))
	end)
end)

return true
