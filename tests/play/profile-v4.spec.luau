--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local fs = require("@lune/fs")
local serde = require("@lune/serde")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local Defaults = Loader.load("src/shared/Play/ProfileDefaults.luau")
local Persistence = Loader.load("src/shared/Persistence.luau")
local expect = Test.expect
Test.describe("Profile v4", function()
	Test.it("migrates the stage 4 fixture and preserves every old field", function()
		local p = serde.decode("json", fs.readFile("tests/fixtures/profile-v3.json"))
		local before = Persistence.copy(p)
		assert(Circle.migrate(p))
		expect(p.v).toBe(4)
		expect(p.cups).toBe(0)
		expect(p.rebirths).toBe(0)
		expect(p.circleDeepestPlate).toBe(4)
		expect(p.circleStartWorld).toBe(1)
		expect(p.circleStartedAt).toBe(0)
		expect(p.circleWorldAt).toBe(1234)
		expect(p.liftChoice).toBe(nil)
		expect(p.worldBest).toEqual({})
		expect(p.rewards).toEqual({ masterEpic = "none" })
		expect(p.settings.autoQuality).toBe(2)
		for key, value in before do
			if key ~= "v" and key ~= "settings" then
				expect(p[key]).toEqual(value)
			end
		end
		before = Persistence.copy(p)
		assert(Circle.migrate(p))
		expect(p).toEqual(before)
	end)
	Test.it("accepts the real default factory and normalizes only legacy quality", function()
		local p = Defaults.new(1000)
		local before = Persistence.copy(p)
		assert(Circle.migrate(p))
		expect(p).toEqual(before)
		p.v, p.settings.effects = 3, "retired"
		assert(Circle.migrate(p))
		expect(p.settings.effects).toBe("auto")
	end)
	Test.it("rejects damaged v4 fields without filling them from defaults", function()
		local cases = {
			{ "cups", -1 },
			{ "cups", 1.5 },
			{ "cups", math.huge },
			{ "cups", 0 / 0 },
			{ "rebirths", -1 },
			{ "circleDeepestPlate", 11 },
			{ "circleStartWorld", 0 },
			{ "circleStartedAt", -1 },
			{ "circleWorldAt", math.huge },
			{ "liftChoice", 11 },
			{ "worldBest", { ["3"] = 0 } },
			{ "worldBest", { ["11"] = 10 } },
			{ "worldBest", { [3] = 10 } },
			{ "rewards", { masterEpic = "paid" } },
		}
		for _, case in cases do
			local p = Defaults.new(1000)
			p[case[1]] = case[2]
			expect(Circle.migrate(p)).toBe(false)
		end
		for _, value in { 0, 4, 1.5, math.huge } do
			local p = Defaults.new(1000)
			p.settings.autoQuality = value
			expect(Circle.migrate(p)).toBe(false)
		end
		local p = Defaults.new(1000)
		p.cups = nil
		expect(Circle.migrate(p)).toBe(false)
		p = Defaults.new(1000)
		p.settings.effects = "unknown"
		expect(Circle.migrate(p)).toBe(false)
	end)
end)
return true
