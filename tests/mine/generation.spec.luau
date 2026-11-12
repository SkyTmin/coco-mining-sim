--!strict

local Test = require("../lib/expect")
local Fixture = require("./fixture")
local Hash = Fixture.load("Hash")
local MineGen = Fixture.load("MineGen")
local Worlds = Fixture.load("Worlds")
local Economy = Fixture.load("Economy")
local expect = Test.expect

Test.describe("Mine generation", function()
	Test.it("keeps the unsigned pair fast path identical to the canonical hash", function()
		for i = 0, 10000 do
			local a = (i * 429491) % 4294967296
			local b = (i * 214741) % 4294967296
			expect(Hash.pair(a, b)).toBe(Hash.u32(a, b))
		end
	end)
	Test.it(
		"hash is deterministic, treats signed inputs as u32, and distributes 100,000 samples",
		function()
			local hash = Hash.u32(11, -5, 2, 9999, 31, 4)
			expect(hash).toBe(829401618)
			expect(Hash.u32(11, -5, 2, 9999, 31, 4)).toBe(hash)
			expect(Hash.u32(11, 4294967291, 2, 9999, 31, 4)).toBe(hash)
			local deciles = table.create(10, 0)
			for i = 1, 100000 do
				local unit = Hash.unit(517, i)
				assert(unit >= 0 and unit < 1)
				deciles[math.floor(unit * 10) + 1] += 1
			end
			for i, count in deciles do
				assert(
					math.abs(count - 10000) <= 500,
					string.format("Decile %d has %d samples", i, count)
				)
			end
			for i, value in Hash.noiseLine(81, -2, 1, 47, 50) do
				expect(value).toBe(Hash.noise(81, -2, 1, 46 + i))
				assert(value >= 0 and value < 1)
			end
		end
	)

	Test.it("uses world boundaries, price indices and capped durability in the tail", function()
		local first = Worlds.of(0)
		expect(first.index).toBe(1)
		expect(first.plateDepth).toBe(9999)
		expect(Worlds.of(10000).start).toBe(10000)
		expect(Worlds.of(20000).index).toBe(3)
		expect(Worlds.of(30000).index).toBe(3)
		expect(Worlds.durability(5000)).toBeCloseTo(1 + 1.5 * 5000 / 9999, 1e-12)
		expect(Worlds.durability(10000)).toBe(2.5)
		expect(Worlds.durability(200000)).toBe(Worlds.durability(29999))
		expect(Economy.coinsFor({ [65] = 3, [130] = 2 })).toBe(25)
	end)

	Test.it("preserves chunk quotas and replaces ore at both distinct special slots", function()
		local seed, x, y, c = 77, -2, 1, 200
		local quota = MineGen.quota(seed, x, y, c)
		local cells = MineGen.cells(seed, x, y, c)
		local specials = MineGen.specials(seed, x, y, c)
		expect(#cells).toBe(50)
		expect(#specials).toBe(2)
		assert(specials[1].d < specials[2].d)
		local remaining = table.clone(quota)
		for i, ore in cells do
			if ore ~= 0 then
				remaining[ore] -= 1
			else
				local d = c * 50 + i - 1
				assert(d == specials[1].d or d == specials[2].d)
				local _, kind = MineGen.cellAt(seed, x, y, d)
				expect(kind).toBe("chest")
			end
		end
		expect(remaining).toEqual({ 0, 0, 0, 0 })
	end)

	Test.it("rangeHist matches a cell-by-cell scan for 10,000 ranges", function()
		local rand = Fixture.random(712039)
		local seed = 3246251
		for i = 1, 10000 do
			local x, y = rand(-4, 4), rand(0, 2)
			local a = if i % 5 == 0 then rand(1, 3) * 10000 - rand(1, 49) else rand(0, 31000)
			local b = a + rand(1, 400)
			local hist, finds = {}, {}
			MineGen.rangeHist(seed, x, y, a, b, hist, finds)

			local slowHist, slowFinds = {}, {}
			for d = a, b - 1 do
				local ore, kind = MineGen.cellAt(seed, x, y, d)
				if kind then
					table.insert(slowFinds, { x = x, y = y, d = d, kind = kind })
				else
					local key = Worlds.of(d).index * 64 + ore
					slowHist[key] = (slowHist[key] or 0) + 1
				end
			end
			expect(hist).toEqual(slowHist)
			expect(finds).toEqual(slowFinds)
		end
	end)

	Test.it("repeats 1,000 cells across evictions and changes generation with the seed", function()
		local rand = Fixture.random(51683)
		local points, values = {}, {}
		for i = 1, 1000 do
			local point = { rand(-4, 4), rand(0, 2), rand(0, 31000) }
			points[i] = point
			values[i] = { MineGen.cellAt(745, point[1], point[2], point[3]) }
		end
		local differences = 0
		for i, point in points do
			local ore, kind = MineGen.cellAt(746, point[1], point[2], point[3])
			if ore ~= values[i][1] or kind ~= values[i][2] then
				differences += 1
			end
		end
		assert(differences > 0)
		for i, point in points do
			expect({ MineGen.cellAt(745, point[1], point[2], point[3]) }).toEqual(values[i])
		end
	end)
end)

return true
