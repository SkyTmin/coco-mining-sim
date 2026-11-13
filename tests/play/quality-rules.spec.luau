--!strict
local Test = require("../lib/expect")
local Q = require("../lib/loader").load("src/shared/Play/QualityRules.luau")
local expect = Test.expect
local function feed(s: any, seconds: number, fps: number)
	for _ = 1, seconds * 60 do
		Q.step(s, 1 / 60, true, fps)
	end
end
Test.describe("Adaptive quality", function()
	Test.it(
		"skips warmup, lowers after sustained load, and respects the 300-second cooldown",
		function()
			local s = Q.new(2, 0)
			feed(s, 5, 30)
			expect(s.level).toBe(2)
			feed(s, 17, 30)
			expect(s.level).toBe(1)
			feed(s, 120, 60)
			expect(s.level).toBe(1)
			feed(s, 185, 60)
			expect(s.level).toBe(2)
		end
	)
	Test.it(
		"raises after two healthy minutes, caps ping-pong and ignores suspended frames",
		function()
			local s = Q.new(2, 0)
			feed(s, 128, 60)
			expect(s.level).toBe(3)
			feed(s, 20, 30)
			expect(s.level).toBe(2)
			expect(s.ceiling).toBe(2)
			feed(s, 400, 60)
			expect(s.level).toBe(2)
			s = Q.new(2, 0)
			for _ = 1, 1000 do
				Q.step(s, 1, true, 20)
				Q.step(s, 1 / 60, false, 20)
			end
			expect(s.level).toBe(2)
		end
	)
	Test.it("manual selection disables measurements and persistence is throttled", function()
		local s = Q.new(2, 0)
		assert(Q.select(s, "high"))
		feed(s, 200, 30)
		expect(s.level).toBe(3)
		expect(Q.save(s, 100)).toBe(nil)
		assert(Q.select(s, "auto"))
		expect(s.level).toBe(2)
		feed(s, 23, 30)
		expect(Q.save(s, 59)).toBe(nil)
		expect(Q.save(s, 60)).toBe(1)
		expect(Q.save(s, 100)).toBe(nil)
	end)
end)
return true
