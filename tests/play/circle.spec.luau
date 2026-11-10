--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local State = Loader.load("src/shared/Mine/MineState.luau")
local Codec = Loader.load("src/shared/Mine/MineCodec.luau")
local expect = Test.expect

Test.describe("Circle profiles", function()
	Test.it("migrates an old mine once while preserving coins and preferences", function()
		local old = {
			v = 1,
			coins = 1e21,
			pickaxe = "storm_common",
			settings = { language = "ru" },
			mine = { v = 1, front = 387 },
			stats = { layers = 387 },
		}
		assert(Circle.migrate(old))
		expect(old.v).toBe(2)
		expect(old.coins).toBe(1e21)
		expect(old.settings.language).toBe("ru")
		expect(old.mine).toBe(nil)
		expect(old.circle.hitSize).toBe(1)
		expect(old.width).toBe(5)
		expect(Codec.decode({ v = 1 })).toBe(nil)
		local st = State.new(11, 5, 3)
		expect(Codec.encode(st).v).toBe(2)
		expect(Codec.decode(Codec.encode(st)).front).toBe(0)
		assert(Circle.migrate(old))
		old.circle.hitSize = 7
		expect(Circle.migrate(old)).toBe(false)
	end)

	Test.it("unlocks cards and worlds permanently and mutates only affordable purchases", function()
		local profile = { coins = 100, pickaxe = "starter" }
		Circle.initialize(profile)
		expect(Circle.buy(profile, 1, { kind = "hitSize", count = 1 })).toBe(nil)
		expect(profile.coins).toBe(100)
		expect(Circle.reach(profile, 2)).toEqual({ "power", "coins" })
		expect(Circle.buy(profile, 2, { kind = "card", id = "power", count = 1 }).level).toBe(1)
		expect(profile.coins).toBe(0)
		expect(Circle.reach(profile, 3)).toEqual({ "crit" })
		expect(Circle.reach(profile, 2)).toEqual({})
		profile.circle = Circle.new()
		expect(profile.unlocked.cards.power).toBe(true)
		expect(profile.deepestWorld).toBe(3)
		expect(profile.unlocked.worlds["3"]).toBe(true)
		expect(Circle.pick("starter", profile.circle, 500).ultLayers).toBe(1)
	end)
end)

return true
