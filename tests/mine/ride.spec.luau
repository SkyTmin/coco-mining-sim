--!strict

local Test = require("../lib/expect")
local Ride = require("../lib/loader").load("src/shared/Mine/Ride.luau")
local expect = Test.expect

Test.describe("Mine ride", function()
	Test.it("moves ordinary ore by the layer size and comes to rest", function()
		for n = 1, 9 do
			local timeline = Ride.timeline(n, false)
			expect(Ride.phase(timeline, 0)).toBe("approach")
			expect(Ride.offset(timeline, 0, false)).toBe(n * 5)
			expect(Ride.offset(timeline, 1, false)).toBe(0)
			expect(Ride.phase(timeline, timeline.total + 0.01)).toBe("landed")
		end
	end)
	Test.it("preserves an empty interval for a blocked, short or long ultimate", function()
		for _, n in { 0, 10, 5000 } do
			local timeline = Ride.timeline(n, true)
			expect(timeline.windup).toBe(0.15)
			assert(timeline.fracture >= 0.5 and timeline.fracture <= 0.9)
			assert(timeline.empty >= 0.25 and timeline.empty <= 0.35)
			expect(timeline.approach).toBe(0.45 + 0.35 * math.log10(math.max(n, 1)))
			local elapsed = 0
			for _, item in
				{
					{ "windup", timeline.windup },
					{ "fracture", timeline.fracture },
					{ "empty", timeline.empty },
					{ "approach", timeline.approach },
				}
			do
				expect(Ride.phase(timeline, elapsed + item[2] / 2)).toBe(item[1])
				elapsed += item[2]
			end
		end
	end)
	Test.it("clears the near window and sends the wave to the distant survivor", function()
		local timeline = Ride.timeline(5000, true)
		local before, first = Ride.wave(timeline, 0.2, 5000)
		local after, last = Ride.wave(timeline, 1, 5000)
		assert(before < after and first > 0 and first < last)
		expect(last).toBe(20)
		assert(math.abs(after - timeline.distance) < 1e-8)
	end)
end)

return true
