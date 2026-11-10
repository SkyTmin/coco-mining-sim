--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Queue = Loader.load("src/shared/Play/DepthQueue.luau")
local Format = Loader.load("src/shared/Format.luau")
local expect = Test.expect

Test.describe("Depth counter", function()
	Test.it("moves only changed digits and settles after 150 milliseconds", function()
		local q = Queue.new(149, "149")
		assert(Queue.step(q, 1, 150, "150", false, false))
		expect(q.columns[1].changes).toBe(false)
		expect(q.columns[2].changes).toBe(true)
		expect(q.columns[3].changes).toBe(true)
		local old, new, yOld, yNew = Queue.pose(q, 1.03, 2)
		expect(old).toBe("4")
		expect(new).toBe("5")
		assert(yOld > 0 and yNew < 0)
		local _, _, _, rebound = Queue.pose(q, 1.13, 2)
		assert(rebound > 0 and rebound <= 0.081)
		local _, final, _, settled = Queue.pose(q, 1.151, 2)
		expect(final).toBe("5")
		expect(settled).toBe(0)
	end)

	Test.it(
		"always lands on the final number after fast rolling, with and without motion",
		function()
			local q = Queue.new(49, "49")
			for i = 1, 30 do
				expect(Queue.step(q, i / 100, i + 49, tostring(i + 49), true, false)).toBe(false)
			end
			local a, b = Queue.pose(q, 0.32, 2)
			assert(a ~= "" and a ~= b)
			assert(Queue.step(q, 0.32, 5010, "5 010", false, false))
			expect(q.shown).toBe(5010)
			expect(q.text).toBe("5 010")
			expect(q.columns[2].changes).toBe(false)
			assert(Queue.step(q, 0.34, 5011, "5 011", true, true))
			local _, final, _, offset = Queue.pose(q, 0.34, 5)
			expect(final).toBe("1")
			expect(offset).toBe(0)
		end
	)

	Test.it("groups nearby depths and uses a decimal comma in Russian", function()
		expect(Format.depth(1234, "ru")).toBe("1\u{202F}234")
		expect(Format.depth(12400, "ru")).toBe("12,4K")
	end)
end)

return true
