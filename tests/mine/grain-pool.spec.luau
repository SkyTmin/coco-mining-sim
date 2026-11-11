--!strict
local Test = require("../lib/expect")
local Pool = require("./fixture").load("GrainPool")
Test.describe("Grain emitter pool", function()
	Test.it("reserves each emitter once per frame and prefers its live color", function()
		local p = Pool.new(4)
		Pool.begin(p, 0)
		local used = {}
		for _ = 1, 4 do
			local index, changed = Pool.take(p, "grey", 0)
			assert(index and changed and not used[index])
			used[index] = true
		end
		assert(Pool.take(p, "grey", 0) == nil)
		Pool.begin(p, 1 / 60)
		for _ = 1, 4 do
			local index, changed = Pool.take(p, "grey", 1 / 60)
			assert(index and not changed)
		end
		assert(Pool.take(p, "blue", 1 / 60) == nil)
	end)
	Test.it("never recolors an emitter within 0.9 seconds of its last emission", function()
		local p = Pool.new(1)
		Pool.begin(p, 0)
		assert(Pool.take(p, "grey", 0) == 1)
		Pool.begin(p, 0.9)
		assert(Pool.take(p, "blue", 0.9) == nil)
		Pool.begin(p, 0.90001)
		local index, changed = Pool.take(p, "blue", 0.90001)
		assert(index == 1 and changed and p.slots[1].color == "blue")
		Pool.clear(p)
		Pool.begin(p, 0.91)
		assert(Pool.take(p, "red", 0.91) == 1)
	end)
	Test.it("preserves all live colors through mixed demand and 200 frames of reuse", function()
		local p = Pool.new(40)
		local last = {}
		for frame = 1, 200 do
			local now = frame / 60
			Pool.begin(p, now)
			local used = {}
			for n = 1, 60 do
				local color = tostring((frame * 13 + n * 7) % 17)
				local index = Pool.take(p, color, now)
				if index then
					assert(not used[index])
					used[index] = true
					local before = last[index]
					assert(not before or before.color == color or now - before.time > 0.9)
					last[index] = { color = color, time = now }
				end
			end
		end
	end)
end)
