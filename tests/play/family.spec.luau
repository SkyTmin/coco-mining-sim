--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Family = Loader.load("src/shared/Play/Family.luau")
local Collection = Loader.load("src/shared/Play/Collection.luau")
local expect = Test.expect
local function fresh(): any
	local p = { coins = 1e16, pickaxe = "starter" }
	Circle.initialize(p)
	return p
end

Test.describe("Families and collection", function()
	Test.it(
		"migrates v2 without losing the mine, keeps Storm, and replaces retired picks",
		function()
			for _, id in { "starter", "storm_common", "plain_legendary" } do
				local p = fresh()
				p.v, p.pickaxe, p.mine = 2, id, { unchanged = true }
				p.circle.pickLevels = { plain_legendary = 50 }
				if id == "storm_common" then
					p.circle.pickLevels.storm_common = 7
				end
				assert(Circle.migrate(p))
				expect(p.v).toBe(4)
				expect(p.mine).toEqual({ unchanged = true })
				expect(p.coins).toBe(1e16)
				expect(p.circle.pickLevels.plain_legendary).toBe(nil)
				expect(p.pickaxe).toBe(if id == "storm_common" then id else "starter")
				expect(p.family).toBe(if id == "storm_common" then "storm" else nil)
				assert(Circle.migrate(p))
			end
		end
	)
	Test.it("rejects damaged permanent fields instead of silently overwriting progress", function()
		for _, corrupt in
			{
				function(p)
					p.skills.frost[1] = 11
				end,
				function(p)
					p.keys = -1
				end,
				function(p)
					p.familyChangeDay = nil
				end,
				function(p)
					p.keyHits = 0 / 0
				end,
				function(p)
					p.collection.starter.count = 0
				end,
			}
		do
			local p = fresh()
			corrupt(p)
			expect(Circle.migrate(p)).toBe(false)
		end
	end)
	Test.it("assigns the first Storm, defers other families, and enforces ownership", function()
		local p = fresh()
		expect(p.family).toBe(nil)
		Collection.grant(p, "frost_legendary")
		expect(p.family).toBe(nil)
		expect(p.nextFamily.frost_legendary).toBe(true)
		expect(Family.canEquip(p, "frost_legendary")).toBe(false)
		Collection.grant(p, "storm_common")
		expect(p.family).toBe("storm")
		expect(Family.canEquip(p, "storm_common")).toBe(true)
		expect(Family.canEquip(p, "storm_rare")).toBe(false)
		expect(Family.canEquip(p, "starter")).toBe(true)
	end)
	Test.it(
		"selects the strongest level and gold variant on a once-per-UTC-day transition",
		function()
			local p = fresh()
			Collection.grant(p, "storm_common")
			Collection.grant(p, "rift_common", true)
			Collection.grant(p, "rift_rare")
			p.circle.pickLevels.rift_common = 20
			local id, golden = Family.best(p, "rift")
			expect(id).toBe("rift_common")
			expect(golden).toBe(true)
			assert(Family.change(p, "rift", 123))
			expect(p.pickaxeGolden).toBe(true)
			expect(Circle.context(p, 1).pickLevel).toBe(20)
			Collection.grant(p, "rift_common")
			assert(Collection.equip(p, "rift_common", false))
			expect(Circle.context(p, 1).pickLevel).toBe(10)
			expect(p.circle.pickLevels.rift_common).toBe(20)
			expect(p.nextFamily.rift_common).toBe(nil)
			expect(Family.change(p, "storm", 123)).toBe(false)
			assert(Family.change(p, "storm", 124))
			assert(Family.change(p, "rift", 124, true))
		end
	)
	Test.it("gates skill purchases, retains every family and applies only active skills", function()
		local p = fresh()
		Collection.grant(p, "storm_common")
		expect(Family.buySkill(p, "storm", 2)).toBe(false)
		expect(Family.buySkill(p, "frost", 1)).toBe(false)
		for _ = 1, 3 do
			assert(Family.buySkill(p, "storm", 1))
		end
		assert(Family.unlocked(p, "storm", 2))
		assert(Family.buySkill(p, "storm", 2))
		expect(Family.level(p, "storm")).toBe(4)
		expect(Family.effects(p).coins).toBe(Family.coinBonus(p) * 1.15)
		p.skills.frost = { 10, 10, 10, 10 }
		expect(Family.effects(p).strength).toBe(1)
		Collection.grant(p, "frost_common")
		assert(Family.change(p, "frost", 1))
		expect(Family.effects(p).strength).toBe(2)
		expect(Family.effects(p).plateDamage).toBe(4)
		expect(Family.effects(p).coins).toBe(Family.coinBonus(p))
		p.circle = Circle.new() -- Stage 5 must reset only circle fields.
		expect(Family.level(p, "storm")).toBe(4)
		expect(Family.level(p, "frost")).toBe(40)
	end)
	Test.it(
		"merges three duplicates without resetting their level or losing the equipped pick",
		function()
			local p = fresh()
			Collection.grant(p, "storm_rare")
			p.circle.pickLevels.storm_rare = 12
			expect(Collection.merge(p, "storm_rare")).toBe(false)
			Collection.grant(p, "storm_rare")
			Collection.grant(p, "storm_rare")
			assert(Collection.equip(p, "storm_rare"))
			assert(Collection.merge(p, "storm_rare"))
			expect(p.collection.storm_rare).toEqual({ count = 0, golden = 1 })
			expect(p.pickaxeGolden).toBe(true)
			expect(p.circle.pickLevels.storm_rare).toBe(12)
			expect(p.merges).toBe(1)
			expect(Collection.merge(p, "starter")).toBe(false)
			assert(Circle.migrate(p))
		end
	)
	Test.it("sells each common once forever and checks the unlocked world and balance", function()
		local p = fresh()
		expect(Collection.buy(p, "dynamite")).toBe(nil)
		p.deepestWorld = 3
		assert(Collection.buy(p, "dynamite"))
		expect(Collection.buy(p, "dynamite")).toBe(nil)
		p.coins, p.deepestWorld = 0, 5
		expect(Collection.buy(p, "frost")).toBe(nil)
	end)
end)
return true
