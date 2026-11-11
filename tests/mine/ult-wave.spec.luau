--!strict
local Test = require("../lib/expect")
local Fixture = require("./fixture")
local W = Fixture.load("UltWave")
local State = Fixture.load("MineState")
local Codec = Fixture.load("MineCodec")
Test.describe("Ultimate wedge", function()
	Test.it("keeps a short six-layer wedge independently of ultimate depth", function()
		for _, depth in { 10, 460, 5000, 25000 } do
			local s = W.new(depth, 7, 3, 2.8)
			assert(W.cleared(s, 0, 1, 0.249) == 0)
			assert(W.cleared(s, 0, 1, 0.25) == 1)
			for _, time in { 0.45, 0.8, 1.4, 2.1 } do
				local center = W.front(s, time)
				local edge = center - W.lag * s.radius
				assert(math.abs(center - edge - 2 * math.sqrt(10)) < 1e-9)
				assert(W.cleared(s, 0, 1, time) >= W.cleared(s, 3, 0, time))
			end
			assert(W.cleared(s, 3, 0, 2.8) == depth)
		end
	end)
	Test.it(
		"inverts smoothstep at each block break and stops three layers behind the edge",
		function()
			local s = W.new(460, 7, 3, 2.8)
			for x = -3, 3 do
				for y = 0, 2 do
					for _, d in { 0, 1, 100, 459 } do
						local t = W.at(s, x, y, d)
						assert(t >= 0.25 and t < 2.8)
						assert(math.abs(W.front(s, t) - 2 * W.radius(x, y, 3) - d) < 1e-7)
					end
				end
			end
			for _, t in { 0, 0.25, 0.45, 0.8, 1.4, 2.1, 2.8, 3 } do
				local expected = math.max(0, W.front(s, t) - 2 * s.radius - 3)
				assert(math.abs(W.camera(s, t) - expected) < 1e-9)
			end
			assert(W.camera(s, 0) == 0 and math.abs(W.camera(s, 2.8) - 457) < 1e-9)
			assert(W.cleared(W.new(0, 7, 3, 0.7), 0, 1, 1) == 0)
			assert(W.front(s, 0.25 + 0.001) < 0.001)
			assert(W.front(s, 2.8) - W.front(s, 2.8 - 0.001) < 0.001)
		end
	)
	Test.it("uses a pre-ultimate snapshot which preserves old holes at distant depths", function()
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
