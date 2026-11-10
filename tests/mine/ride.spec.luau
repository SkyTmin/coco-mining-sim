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
	Test.it("preserves an empty interval for a short or long ultimate", function()
		for _, n in { 10, 5000 } do
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
		assert(timeline.distance >= 1300 and timeline.distance < 1500)
		local before, first = Ride.wave(timeline, 0.2, 5000)
		local after, last = Ride.wave(timeline, 1, 5000)
		assert(before < after and first > 0 and first < last)
		expect(last).toBe(20)
		assert(math.abs(after - timeline.distance) < 1e-8)
	end)
	Test.it("keeps the same plate visible at its depth until it starts approaching", function()
		local barrier = assert(Ride.barrier(440, 499, 499, 0, 30))
		local timeline = Ride.timeline(59, true, nil, barrier)
		expect(timeline.distance).toBe(295)
		assert(timeline.empty > 0 and timeline.approach > 0)
		local waveEnd = Ride.wave(timeline, 1, 59)
		assert(math.abs(waveEnd - 295) < 1e-8)
		for _, phase in { "windup", "fracture", "empty", "approach", "landed" } do
			local offset = if phase == "approach" then Ride.offset(timeline, 0.5, true) else 0
			local display =
				assert(Ride.plate(499, 499, 30, offset, barrier, phase, phase ~= "windup"))
			expect(display.depth).toBe(499)
			expect(display.distance).toBe(
				if phase == "landed" or phase == "approach" then offset else 295
			)
		end
	end)
	Test.it("strikes an adjacent plate in place and reveals damage at impact", function()
		local barrier = assert(Ride.barrier(499, 499, 499, 11, 41))
		local timeline = Ride.timeline(0, true, nil, barrier)
		expect(timeline.empty).toBe(0)
		expect(timeline.approach).toBe(0)
		expect(Ride.phase(timeline, 0)).toBe("windup")
		expect(Ride.phase(timeline, timeline.windup + 0.1)).toBe("fracture")
		expect(Ride.phase(timeline, timeline.total + 0.01)).toBe("landed")
		for _, state in
			{
				{ "windup", false, 11 },
				{ "fracture", false, 11 },
				{ "fracture", true, 41 },
				{ "landed", true, 41 },
			}
		do
			local display = assert(Ride.plate(499, 499, 41, 0, barrier, state[1], state[2]))
			expect(display.distance).toBe(0)
			expect(display.damage).toBe(state[3])
		end
		expect(assert(Ride.plate(499, 499, 42, 0, nil, "idle", false)).damage).toBe(42)
	end)
end)

return true
