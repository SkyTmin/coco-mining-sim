--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Power = Loader.load("src/shared/Play/Power.luau")
local Worlds = Loader.load("src/shared/Mine/Worlds.luau")
local Shapes = Loader.load("src/shared/Mine/Shapes.luau")
local Config = Loader.load("src/shared/Config")
local expect = Test.expect

Test.describe("Circle power", function()
	Test.it("interpolates only by depth and derives capped hits, pierce and ultimate", function()
		local common = Config.progress.rarities.common
		expect(Worlds.durability(500)).toBe(20)
		expect(Worlds.durability(1599)).toBe(30)
		expect(Power.hits(20, 3)).toBe(7)
		expect(Power.hits(20, 0.1)).toBe(8)
		expect(Power.ult(common, 1, 20, 3)).toBe(3)
		expect(Power.ult(Config.progress.rarities.wood, 1, 20, 0.1)).toBe(1)
		for _, example in { { 199, 1 }, { 200, 2 }, { 2000, 3 }, { 20000, 4 } } do
			expect(Power.pierce(20, example[1])).toBe(example[2])
		end
		expect(Power.plate(30, 600, true)).toBe(90)
		expect(Power.plate(0.01, 600, false) * 160).toBe(600)
		expect(Power.coins(1.5, 1)).toBe(1)
		expect(Power.coins(5, 3, 3)).toBe(24)
		expect(Power.strength(common, 2, { power = 1 }, true)).toBe(2 * 1.03 * 1.2 * 1.5)
	end)

	Test.it("derives heavy hits, rain and each tenth critical hit deterministically", function()
		local seed, crits, rains, megas = 9031, 0, 0, 0
		local cards = { power = 50, coins = 10, crit = 25 }
		for i = 1, 1000 do
			local hit = Power.strike(seed, i, crits, 100, cards)
			expect(hit).toEqual(Power.strike(seed, i, crits, 100, cards))
			expect(hit.heavy).toBe(i % 10 == 0)
			expect(hit.cracks).toBe(true)
			if hit.crit then
				crits += 1
			end
			if hit.rain then
				rains += 1
			end
			expect(hit.critPierce).toBe(hit.crit)
			expect(hit.mega).toBe(hit.crit and crits % 10 == 0)
			if hit.mega then
				megas += 1
				expect(hit.coinMultiplier).toBe(if hit.rain then 100 else 10)
			end
		end
		assert(rains > 0 and megas > 0)
		local noCritical = Power.strike(seed, 1, 0, 200, { power = 50 })
		expect(Power.pierce(20, noCritical.strength, noCritical)).toBe(3)
		expect(Power.pierce(21, noCritical.strength, noCritical)).toBe(1)
	end)

	Test.it("shifts the whole row, cross and square in at the edge", function()
		expect(Shapes.cells("wide2", 2, 2, 5, 3)).toEqual({ { x = 1, y = 2 }, { x = 2, y = 2 } })
		expect(Shapes.cells("wide3", -2, 0, 5, 3)).toEqual({
			{ x = -2, y = 0 },
			{ x = -1, y = 0 },
			{ x = 0, y = 0 },
		})
		expect(Shapes.cells("cross5", -2, 0, 5, 3)).toEqual({
			{ x = -1, y = 1 },
			{ x = -2, y = 1 },
			{ x = 0, y = 1 },
			{ x = -1, y = 0 },
			{ x = -1, y = 2 },
		})
		expect(#Shapes.cells("square3", 4, 2, 9, 3)).toBe(9)
	end)
end)

return true
