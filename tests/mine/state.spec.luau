--!strict

local Test = require("../lib/expect")
local Fixture = require("./fixture")
local State = Fixture.load("MineState")
local Codec = Fixture.load("MineCodec")
local MineGen = Fixture.load("MineGen")
local expect = Test.expect

local function check(st: any)
	local ok, problem = State.check(st)
	assert(ok, problem)
end

Test.describe("Mine state", function()
	Test.it("waits for the final intact cell even beside a 5,000-layer cut", function()
		local st, out = State.new(2, 5, 3), {}
		State.removeRange(st, 2, 1, 0, 5000, out)
		expect(State.advance(st)).toBe(0)
		for x = -2, 2 do
			for y = 0, 2 do
				if x ~= -2 or y ~= 0 then
					State.removeCell(st, x, y, 0, out)
				end
			end
		end
		expect(State.advance(st)).toBe(0)
		expect(State.removeCell(st, -2, 0, 0, out)).toBe(true)
		expect(State.advance(st)).toBe(1)
		expect(st.top[State.laneKey(2, 1)]).toBe(5000)
		check(st)
	end)

	Test.it(
		"passes pre-cleared layers 101–103 in one advance after clearing layer 100",
		function()
			local st, out = State.new(5, 5, 3), {}
			State.removeLayers(st, 0, 100, out)
			expect(State.advance(st)).toBe(100)
			State.removeLayers(st, 101, 104, out)
			expect(State.advance(st)).toBe(0)
			State.removeLayers(st, 100, 101, out)
			expect(State.advance(st)).toBe(4)
			expect(st.front).toBe(104)
			check(st)
		end
	)

	Test.it("preserves a deep hole and centered lanes after movement and widening", function()
		local st, out = State.new(17, 5, 3), {}
		State.removeRange(st, 2, 1, 5000, 5010, out)
		State.removeLayers(st, 0, 50, out)
		expect(State.advance(st)).toBe(50)
		expect(State.widen(st, 6)).toBe(false)
		expect(State.widen(st, 7)).toBe(true)
		expect(State.widen(st, 5)).toBe(false)
		expect(st.top[State.laneKey(3, 1)]).toBe(50)
		expect(State.isSolid(st, 2, 1, 4999)).toBe(true)
		expect(State.isSolid(st, 2, 1, 5000)).toBe(false)
		expect(State.isSolid(st, 2, 1, 5009)).toBe(false)
		expect(State.isSolid(st, 2, 1, 5010)).toBe(true)
		expect(State.isSolid(st, 3, 1, 5000)).toBe(true)
		check(st)
	end)

	Test.it("keeps invariants through 100,000 randomized operations and 100 round trips", function()
		local rand = Fixture.random(111093)
		local st = State.new(1, 3, 2)
		for i = 1, 100000 do
			if i % 200 == 1 or st.front >= 5001 then
				st = State.new(i, 3, 2)
			end
			local radius = (st.width - 1) // 2
			local x, y = rand(-radius, radius), rand(0, st.height - 1)
			local a, action = rand(st.front, 5000), rand(1, 7)
			local out = {}
			if action == 1 then
				State.removeCell(st, x, y, rand(st.front, math.min(st.front + 19, 5000)), out)
			elseif action == 2 then
				State.removeRange(st, x, y, a, math.min(a + rand(1, 350), 5001), out)
			elseif action == 3 then
				State.removeLayers(st, st.front, math.min(st.front + rand(1, 75), 5001), out)
			elseif action == 4 then
				State.advance(st)
			elseif action == 5 then
				State.widen(st, math.min(st.width + 2, 9))
			elseif action == 6 then
				State.removeRange(st, x, y, a, a + 1, out)
			else
				State.removeLayers(st, a, math.min(a + rand(1, 50), 5001), out)
			end
			State.advance(st)
			check(st)
			if i % 1000 == 0 then
				local decoded = assert(Codec.decode(Codec.encode(st)))
				expect(decoded).toEqual(st)
				st = decoded
			end
		end
	end)

	Test.it("matches removed ranges and the front against an independent 3×2 cell grid", function()
		local rand = Fixture.random(18753)
		for cycle = 1, 20 do
			local st = State.new(cycle, 3, 2)
			local grid, credited = {}, {}
			local claimed = 0
			for _ = 1, 80 do
				local front = st.front
				if front == 301 then
					break
				end
				local x, y = rand(-1, 1), rand(0, 1)
				local a, b = rand(front, 300), rand(front, 301)
				local out = {}
				local action = rand(1, 3)
				local function clear(cx: number, cy: number)
					for d = a, b - 1 do
						grid[(cx + 1) * 602 + cy * 301 + d] = true
					end
				end
				if action == 1 then
					a, b = rand(front, math.min(front + 19, 300)), 0
					b = a + 1
					State.removeCell(st, x, y, a, out)
					clear(x, y)
				elseif action == 2 then
					State.removeRange(st, x, y, a, b, out)
					clear(x, y)
				else
					State.removeLayers(st, a, b, out)
					for cx = -1, 1 do
						for cy = 0, 1 do
							clear(cx, cy)
						end
					end
				end
				for _, span in out do
					for d = span.a, span.b - 1 do
						local key = (span.x + 1) * 602 + span.y * 301 + d
						assert(
							grid[key] and not credited[key],
							"Unexpected or duplicate credited cell"
						)
						credited[key] = true
						claimed += 1
					end
				end
				State.advance(st)
				check(st)
				local empty, first = 0, 301
				for cx = -1, 1 do
					for cy = 0, 1 do
						for d = 0, 300 do
							local key = (cx + 1) * 602 + cy * 301 + d
							if grid[key] then
								empty += 1
								assert(not State.isSolid(st, cx, cy, d))
							else
								first = math.min(first, d)
								assert(State.isSolid(st, cx, cy, d))
							end
						end
					end
				end
				expect(claimed).toBe(empty)
				expect(st.front).toBe(first)
			end
		end
	end)

	Test.it("compacts 5,000 holes by crediting solid gaps without filling old holes", function()
		local st, out = State.new(815, 3, 2), {}
		for i = 1, 3000 do
			State.removeRange(st, -1, 0, i * 2 - 1, i * 2, out)
		end
		for i = 1, 2000 do
			State.removeRange(st, 0, 0, i * 2 - 1, i * 2, out)
		end
		expect(st.holeCount).toBe(5000)
		table.clear(out)
		State.compact(st, out)
		expect(st.holeCount).toBe(4000)
		expect(out[1]).toEqual({ x = -1, y = 0, a = 2, b = 3 })
		for i = 1, 3000 do
			assert(not State.isSolid(st, -1, 0, i * 2 - 1))
		end
		for i = 1, 2000 do
			assert(not State.isSolid(st, 0, 0, i * 2 - 1))
		end
		local hist, finds = {}, {}
		for _, span in out do
			assert(not State.isSolid(st, span.x, span.y, span.a))
			MineGen.rangeHist(st.seed, span.x, span.y, span.a, span.b, hist, finds)
		end
		local count = #finds
		for _, amount in hist do
			count += amount
		end
		expect(count).toBe(1000)
		check(st)
	end)
end)

return true
