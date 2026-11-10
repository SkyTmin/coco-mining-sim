--!strict

local Test = require("../lib/expect")
local Fixture = require("./fixture")
local State = Fixture.load("MineState")
local Resolve = Fixture.load("Resolve")

local function median(run: (number) -> number): number
	local samples = {}
	for i = 1, 5 do
		samples[i] = run(i)
	end
	table.sort(samples)
	return samples[3] * 1000
end

local function benchmarkUlt(layers: number, width: number, front: number, limit: number)
	local pick = { shape = "single", strength = 1, ultLayers = layers }
	local ms = median(function(seed)
		local st = State.new(seed, width, 3)
		st.front = front
		for lane in st.top do
			st.top[lane] = front
		end
		local start = os.clock()
		local result = Resolve.ult(st, pick)
		local elapsed = os.clock() - start
		local blocks = layers * width * 3
		assert(result.blocks == blocks and not result.plateHit)
		local accounted = #result.finds
		for _, amount in result.hist do
			accounted += amount
		end
		assert(accounted == blocks, "Large run did not account for every cell")
		return elapsed
	end)
	print(
		string.format(
			"Mine speed: %d layers × %d lanes = %.3f ms (limit %d ms)",
			layers,
			width * 3,
			ms,
			limit
		)
	)
	assert(ms < limit, "Ultimate exceeded its time budget")
end

Test.describe("Mine performance", function()
	Test.it("removes and tallies 5,000 layers across 15 lanes in under 5 ms", function()
		benchmarkUlt(5000, 5, 0, 5)
	end)

	Test.it("removes and tallies 25,000 layers across 45 lanes in under 50 ms", function()
		-- The fixture worlds end every 10,000 layers. Start beyond their final plate.
		benchmarkUlt(25000, 15, 30000, 50)
	end)

	Test.it("processes 10,000 ordinary hits in under 200 ms", function()
		local pick = { shape = "single", strength = 2.5, ultLayers = 0 }
		local ms = median(function(seed)
			local st = State.new(seed, 5, 3)
			local blocks = 0
			local start = os.clock()
			for i = 0, 9999 do
				local lane = i % 15
				local result = Resolve.hit(st, pick, lane // 3 - 2, lane % 3, st.front)
				assert(result)
				blocks += result.blocks
				State.advance(st)
			end
			local elapsed = os.clock() - start
			assert(blocks == 10000 and st.front == 666)
			return elapsed
		end)
		print(string.format("Mine speed: 10,000 hits = %.3f ms (limit 200 ms)", ms))
		assert(ms < 200, "Ordinary hits exceeded their time budget")
	end)
end)

return true
