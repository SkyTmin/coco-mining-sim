--!strict
local Test = require("../lib/expect")
local Fixture = require("./fixture")
local W = Fixture.load("UltWave")
local State = Fixture.load("MineState")
local Codec = Fixture.load("MineCodec")
Test.describe("Ultimate dome", function()
	Test.it("uses the logarithmic durations of the approved demo", function()
		for _, pair in { { 40, 2 }, { 150, 2.29 }, { 500, 2.55 }, { 5000, 3.05 }, { 50000, 3.5 } } do
			assert(math.abs(W.duration(pair[1]) - pair[2]) < 0.006)
		end
		assert(W.duration(0) == 1.5 and W.duration(1) == 1.5 and W.duration(100000) == 3.5)
	end)
	Test.it("schedules a quadratic seven-layer dome plus at most 40 ms of noise", function()
		local s = W.new(500, 7, 3)
		assert(W.offset(s, 0, 1) == 0 and W.offset(s, 3, 0) == 7)
		assert(math.abs(W.offset(s, 1, 1) - 0.7) < 1e-9)
		assert(math.abs(W.offset(s, 2, 1) - 2.8) < 1e-9)
		for x = -3, 3 do
			for y = 0, 2 do
				for _, d in { 0, 40, 100, 499 } do
					local nominal = W.pause + (d + W.offset(s, x, y)) * W.duration(500) / 507
					local at = W.at(s, x, y, d)
					assert(at >= nominal - 1e-9 and at <= nominal + 0.04 + 1e-9)
				end
			end
		end
	end)
	Test.it("finishes all cells before the separate ride, even at depth 5000", function()
		local s = W.new(5000, 7, 3)
		local rideAt = W.endAt(s) + W.hold
		for x = -3, 3 do
			for y = 0, 2 do
				for d = 4950, 4999 do
					assert(W.at(s, x, y, d) < rideAt)
				end
			end
		end
		assert(math.abs(W.total(5000, 0.8) - rideAt - 0.8) < 1e-9)
		assert(W.fogStart == 110 and W.fogEnd == 300)
	end)
	Test.it("preserves pre-existing holes in the old snapshot, including deep cells", function()
		local st = State.new(57291, 7, 3, 100)
		State.removeRange(st, 0, 1, 170, 180, {})
		State.removeRange(st, -2, 0, 200, 212, {})
		local saved = Codec.encode(st)
		State.removeLayers(st, 100, 300, {})
		State.advance(st)
		local old = assert(Codec.decode(saved))
		assert(old.front == 100)
		assert(State.isSolid(old, 0, 1, 169) and not State.isSolid(old, 0, 1, 175))
		assert(not State.isSolid(old, -2, 0, 209) and State.isSolid(old, -2, 0, 212))
	end)
end)
