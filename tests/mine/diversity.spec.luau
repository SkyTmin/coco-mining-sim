--!strict
local Test = require("../lib/expect")
local Fixture = require("./fixture")
local Gen = Fixture.load("MineGen")
local Hash = Fixture.load("Hash")
local Worlds = Fixture.load("Worlds")

Test.describe("Wall diversity", function()
	Test.it("mixes 2000 deterministic 7x3 faces per world without ore sheets", function()
		for index = 1, 3 do
			local world = Worlds.at(index)
			local total, sheets = 0, 0
			for sample = 1, 2000 do
				local seed = Hash.u32(sample, index, 8702)
				local depth = world.start + Hash.u32(seed, 17) % (world.length - 1)
				local counts = {}
				for x = -3, 3 do
					for y = 0, 2 do
						local ore = Gen.cellAt(seed, x, y, depth)
						counts[ore] = (counts[ore] or 0) + 1
					end
				end
				local types, sheet = 0, false
				for ore, count in counts do
					if ore > 0 then
						types += 1
					end
					if ore > 1 and count >= 15 then
						sheet = true
					end
				end
				total += types
				if sheet then
					sheets += 1
				end
			end
			print(
				string.format(
					"Diversity world %d: %.4f types, %.3f%% ore sheets",
					index,
					total / 2000,
					sheets / 20
				)
			)
			assert(total / 2000 >= 2.6, "insufficient diversity")
			assert(sheets <= 20, "too many ore sheets")
		end
	end)
end)
