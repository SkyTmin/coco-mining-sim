--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Keys = Loader.load("src/shared/Play/Keys.luau")
local expect = Test.expect
local function fresh(): any
	local p = { coins = 0, pickaxe = "starter" }
	Circle.initialize(p)
	return p
end
Test.describe("Keys", function()
	Test.it(
		"carries fractional hits, applies the card and active skill, and awards at exactly 8000",
		function()
			local p = fresh()
			for _ = 1, 7999 do
				expect(Keys.hit(p, 1, 9)).toBe(0)
			end
			expect(Keys.hit(p, 1, 9)).toBe(1)
			expect(p.keyHits).toBe(0)
			p.circle.cards.keys = 10
			for _ = 1, 8000 do
				Keys.hit(p, 1.8, 9)
			end
			expect(p.keys).toBe(3)
			assert(math.abs(p.keyHits - 5600) < 1e-6)
		end
	)
	Test.it(
		"doubles ten percent only at card level twenty and never reuses a spent-key roll",
		function()
			local p = fresh()
			expect(Keys.add(p, 1000, 17)).toBe(1000)
			p.keys = 0
			p.circle.cards.keys = 20
			local total = Keys.add(p, 100000, 17)
			assert(math.abs(total - 110000) <= 300)
			expect(p.keySerial).toBe(101000)
		end
	)
end)
return true
