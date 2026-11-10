--!strict

local serde = require("@lune/serde")
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Upgrade = Loader.load("src/shared/Play/Upgrade.luau")
local Format = Loader.load("src/shared/Format.luau")
local Persistence = Loader.load("src/shared/Persistence.luau")
local expect = Test.expect

local function context()
	return {
		coins = 20000,
		hitSize = 1,
		width = 5,
		world = 1,
		pick = "starter",
		pickLevel = 1,
		cards = { crit = 24 },
		unlockedCards = { crit = true },
	}
end

Test.describe("Circle purchases", function()
	Test.it("quotes single, ten and maximum levels, gates worlds and stops at caps", function()
		local ctx = context()
		expect(Upgrade.quote(ctx, { kind = "width", count = 1 })).toBe(nil)
		ctx.world = 2
		expect(Upgrade.quote(ctx, { kind = "width", count = 1 }).price).toBe(5000)
		expect(Upgrade.quote(ctx, { kind = "card", id = "power", count = 1 })).toBe(nil)
		expect(Upgrade.quote(ctx, { kind = "pick", count = 1 })).toEqual({
			amount = 1,
			level = 2,
			price = 30,
		})
		expect(Upgrade.quote(ctx, { kind = "pick", count = 10 }).level).toBe(10)
		expect(Upgrade.quote(ctx, { kind = "card", id = "crit", count = 10 }).level).toBe(25)
		ctx.coins = 65
		local quote = Upgrade.quote(ctx, { kind = "pick", count = "max" })
		expect(quote.amount).toBe(1)
		expect(Upgrade.pay(ctx.coins, quote)).toBe(35)
		expect(Upgrade.pay(ctx.coins, Upgrade.quote(ctx, { kind = "pick", count = 10 }))).toBe(nil)
		expect(Upgrade.quote(ctx, { kind = "pick", count = 99 })).toBe(nil)
		ctx.pickLevel = 10
		expect(Upgrade.quote(ctx, { kind = "pick", count = "max" })).toBe(nil)
	end)

	Test.it("reports every playable transformation crossed by a bulk purchase", function()
		expect(Upgrade.morphs("power", 9, 50)).toEqual({ 10, 25, 50 })
		expect(Upgrade.morphs("coins", 0, 55)).toEqual({ 10 })
		expect(Upgrade.morphs("crit", 10, 25)).toEqual({ 25 })
	end)

	Test.it("accepts at most ten attempts per second and spends large prices in number", function()
		local last, accepted = -math.huge, 0
		for i = 0, 999 do
			local at = Upgrade.nextRequest(last, i / 1000)
			if at then
				last, accepted = at, accepted + 1
			end
		end
		expect(accepted).toBe(10)
		local ctx = context()
		ctx.cards.power, ctx.unlockedCards.power = 130, true
		local large = Upgrade.quote(ctx, { kind = "card", id = "power", count = 1 })
		assert(large.price >= 2 ^ 53)
		expect(Upgrade.pay(large.price, large)).toBe(0)
		expect(Upgrade.pay(large.price - large.price * 2 ^ -51, large)).toBe(nil)
		for i, coins in { 1e15, 1e18, 1e21 } do
			local snapshot = Persistence.copy({ coins = coins })
			assert(Persistence.finiteTree(snapshot))
			expect(serde.decode("json", serde.encode("json", snapshot)).coins).toBe(coins)
			expect(Format.short(coins)).toBe(({ "1.00Qa", "1.00Qi", "1.00Sx" })[i])
		end
	end)
end)

return true
