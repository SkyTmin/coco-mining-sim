--!strict

local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Queue = Loader.load("src/shared/Play/DepthQueue.luau")
local Format = Loader.load("src/shared/Format.luau")
local expect = Test.expect

Test.describe("Depth counter", function()
	Test.it("skips stale values and starts no more than eight changes a second", function()
		local q = Queue.new(0)
		local shown, lastAt = 0, -math.huge
		local count = 0
		for i = 1, 100 do
			local now = i / 100
			local nextDepth = Queue.step(q, now, i, false)
			if nextDepth then
				expect(nextDepth).toBe(i)
				assert(now - lastAt >= 0.125 - 1e-9)
				shown, lastAt = nextDepth, now
				count += 1
			end
		end
		assert(count > 1 and count <= 8 and shown < 100)
	end)
	Test.it("keeps the final number until there is room to display it", function()
		local q = Queue.new(10)
		expect(Queue.step(q, 0, 130, false)).toBe(130)
		expect(Queue.step(q, 0.04, 5010, true)).toBe(nil)
		expect(Queue.step(q, 0.08, 5012, false)).toBe(nil)
		local depth, punch = Queue.step(q, 0.125, 5014, false)
		expect(depth).toBe(5010)
		expect(punch).toBe(true)
		expect(Queue.step(q, 0.25, 5014, false)).toBe(5014)
	end)
	Test.it("groups nearby depths and uses a decimal comma in Russian", function()
		expect(Format.depth(1234, "ru")).toBe("1\u{202F}234")
		expect(Format.depth(12400, "ru")).toBe("12,4K")
	end)
end)

return true
