--!strict

local Test = require("../lib/expect")
local Fixture = require("./fixture")
local State = Fixture.load("MineState")
local Resolve = Fixture.load("Resolve")
local Codec = Fixture.load("MineCodec")
local Shapes = Fixture.load("Shapes")
local Worlds = Fixture.load("Worlds")
local expect = Test.expect

local function pick(strength: number, shape: string?, layers: number?)
	return { strength = strength, shape = shape or "single", ultLayers = layers or 0 }
end

Test.describe("Mining hits", function()
	Test.it("uses independent hit counters, rounding up and capping at eight", function()
		local st = State.new(15, 5, 3)
		for _ = 1, 7 do
			expect(Resolve.hit(st, pick(1 / 20), 0, 0, 0).blocks).toBe(0)
		end
		expect(Resolve.hit(st, pick(1 / 20), 0, 0, 0).blocks).toBe(1)
		expect(st.damage[State.cellKey(0, 0, 0)]).toBe(nil)

		local shaped = State.new(15, 5, 3)
		expect(Resolve.hit(shaped, pick(1 / 2.5), 0, 0, 0).blocks).toBe(0)
		expect(Resolve.hit(shaped, pick(1 / 2.5, "pair"), 0, 0, 0).blocks).toBe(0)
		expect(Resolve.hit(shaped, pick(1 / 2.5, "pair"), 0, 0, 0).blocks).toBe(1)
		expect(shaped.damage[State.cellKey(0, 1, 0)]).toBe(2)
		expect(Resolve.hit(shaped, pick(1 / 2.5), 0, 1, 0).blocks).toBe(1)
	end)

	Test.it("pierces 2, 3 and 4 layers at the exact thresholds", function()
		for _, example in
			{ { 9.99, 1 }, { 10, 2 }, { 99.99, 2 }, { 100, 3 }, { 999.99, 3 }, { 1000, 4 } }
		do
			local st = State.new(98, 5, 3)
			local res = assert(Resolve.hit(st, pick(example[1], "pair"), 0, 1, 0))
			expect(res.blocks).toBe(2 * example[2])
			expect(#res.cells).toBe(res.blocks)
			expect(#res.runs).toBe(0)
			expect(st.front).toBe(0)
		end
	end)

	Test.it(
		"rejects hidden or out-of-window targets and skips an existing 4,999-layer hole",
		function()
			local st, out = State.new(68, 5, 3), {}
			expect(Resolve.hit(st, pick(10), -2, 0, 1)).toBe(nil)
			State.removeRange(st, 0, 0, 1, 5000, out)
			expect(State.isExposed(st, 1, 0, 5)).toBe(true)
			expect(Resolve.hit(st, pick(10), 0, 0, 5000)).toBe(nil)
			expect(State.removeCell(st, 0, 0, 5000, out)).toBe(false)
			local res = assert(Resolve.hit(st, pick(10), 0, 0, 0))
			expect(res.cells).toEqual({ { x = 0, y = 0, d = 0, gen = 0 } })
			expect(res.runs).toEqual({ { x = 0, y = 0, a = 5000, b = 5001 } })
			expect(res.blocks).toBe(2)
			expect(State.isSolid(st, 0, 0, 5001)).toBe(true)
		end
	)

	Test.it(
		"clips ordinary cuts, persists plate damage and grants the plate reward once",
		function()
			local st, out = State.new(77, 5, 3), {}
			State.removeLayers(st, 0, 9998, out)
			expect(State.advance(st)).toBe(9998)
			table.clear(out)
			State.removeRange(st, 0, 0, 9998, 10050, out)
			expect(out).toEqual({ { x = 0, y = 0, a = 9998, b = 9999 } })
			expect(State.barrier(st)).toBe(9999)
			expect(Resolve.hit(st, pick(500), 0, 0, 9999)).toBe(nil)
			local ult = Resolve.ult(st, pick(1, nil, 5000))
			expect(ult.blocks).toBe(14)
			expect(ult.plateHit).toBe(30)
			expect(ult.plateBroken).toBe(false)
			expect(st.front).toBe(9998)
			expect(State.advance(st)).toBe(1)
			st = assert(Codec.decode(Codec.encode(st)))
			expect(st.plateDamage).toBe(30)
			local plate = assert(Resolve.hit(st, pick(90), -2, 2, 9999))
			expect(plate.plateHit).toBe(90)
			expect(plate.plateBroken).toBe(true)
			expect(plate.plateReward).toBe(500)
			expect(plate.blocks).toBe(1)
			expect(#plate.cells).toBe(15)
			expect(next(plate.hist)).toBe(nil)
			expect(#plate.finds).toBe(0)
			expect(Resolve.ult(st, pick(1, nil, 5000)).plateReward).toBe(nil)
			expect(State.advance(st)).toBe(1)
			expect(Worlds.of(st.front).index).toBe(2)
			expect(st.plateDamage).toBe(0)
			assert(State.check(st))
		end
	)

	Test.it(
		"does not cross a plate on a piercing hit or create a second plate in the tail",
		function()
			local st, out = State.new(41, 1, 1), {}
			State.removeLayers(st, 0, 9998, out)
			State.advance(st)
			local hit = assert(Resolve.hit(st, pick(10000), 0, 0, 9998))
			expect(hit.blocks).toBe(1)
			expect(hit.plateHit).toBe(nil)
			expect(State.advance(st)).toBe(1)
			expect(Resolve.ult(st, pick(1, nil, 1)).plateHit).toBe(30)

			st.front, st.plateDamage = 29999, 0
			st.top[State.laneKey(0, 0)] = 29999
			local lastPlate = Resolve.ult(st, pick(1, nil, 1))
			expect(lastPlate.plateHit).toBe(30)
			expect(Resolve.hit(st, pick(330), 0, 0, 29999).plateBroken).toBe(true)
			State.advance(st)
			expect(st.front).toBe(30000)
			expect(State.barrier(st)).toBe(2147483648)
			local tail = Resolve.ult(st, pick(1, nil, 51))
			expect(tail.blocks).toBe(51)
			expect(tail.plateHit).toBe(nil)
			expect(State.advance(st)).toBe(51)

			st.front, st.top[State.laneKey(0, 0)] = 2147483647, 2147483647
			expect(Resolve.ult(st, pick(1, nil, 51)).blocks).toBe(1)
			expect(State.advance(st)).toBe(1)
			expect(st.front).toBe(2147483648)
			assert(Codec.decode(Codec.encode(st)))
		end
	)
end)

Test.describe("Mining shapes", function()
	Test.it(
		"contains each target and returns the correct cells at every edge and corner",
		function()
			for _, width in { 5, 7, 9 } do
				local radius = (width - 1) // 2
				for x = -radius, radius do
					for y = 0, 2 do
						local cross = 1
							+ (if math.abs(x) == radius then 1 else 2)
							+ (if y == 1 then 2 else 1)
						for kind, count in
							{
								single = 1,
								pair = 2,
								column3 = 3,
								cross = cross,
								square3 = 9,
								row = width,
								column = 3,
								wall = width * 3,
							}
						do
							local cells, seen = Shapes.cells(kind, x, y, width, 3), {}
							expect(#cells).toBe(count)
							for _, cell in cells do
								assert(
									cell.x >= -radius
										and cell.x <= radius
										and cell.y >= 0
										and cell.y < 3
								)
								local key = State.laneKey(cell.x, cell.y)
								assert(not seen[key], "Duplicate cell in " .. kind)
								seen[key] = true
							end
							assert(seen[State.laneKey(x, y)])
							if kind == "pair" then
								assert(seen[State.laneKey(x, if y == 2 then 1 else y + 1)])
							elseif kind == "square3" then
								local left = math.clamp(x - 1, -radius, radius - 2)
								assert(
									seen[State.laneKey(left, 0)]
										and seen[State.laneKey(left + 2, 2)]
								)
							end
						end
					end
				end
			end
		end
	)
end)

return true
