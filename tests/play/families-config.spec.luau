--!strict
local Test = require("../lib/expect")
local Config = require("../lib/loader").load("src/shared/Config")
local expect = Test.expect

Test.describe("Family data", function()
	Test.it("defines sixteen picks, four perks and four permanent skills per family", function()
		local count = 0
		for _ in Config.pickaxes do
			count += 1
		end
		expect(count).toBe(17)
		for _, family in Config.familyRules.order do
			local cfg = Config.families[family]
			expect(#cfg.skills).toBe(4)
			for i, skill in cfg.skills do
				expect(skill.cap).toBe(10)
				expect(skill.unlock).toBe(({ 0, 3, 8, 15 })[i])
			end
			for _, rarity in Config.familyRules.rarities do
				local id = family .. "_" .. rarity
				expect(Config.pickaxes[id].family).toBe(family)
				expect(Config.pickaxes[id].rarity).toBe(rarity)
				assert(cfg.perks[rarity].size > 0)
				assert(Config.art.pickaxes[id].model)
			end
		end
		for level = 1, 10 do
			expect(Config.familyRules.skillFirstCost * Config.familyRules.skillGrowth ^ (level - 1)).toBe(
				100000 * 10 ^ (level - 1)
			)
		end
	end)
end)
return true
