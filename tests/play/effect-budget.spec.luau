--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local B = Loader.load("src/shared/Play/EffectBudget.luau")
local Config = Loader.load("src/shared/Config")
local Settings = Loader.load("src/shared/Play/SettingsPatch.luau")
local expect = Test.expect
Test.describe("Quality budgets", function()
	Test.it(
		"caps simultaneous particles and debris emission for every level and releases expired leases",
		function()
			for level = 1, 3 do
				local particles = {}
				local cap = Config.fx.quality.particles[level]
				expect(B.take(particles, 0, cap + 50, 0.5, cap)).toBe(cap)
				expect(B.take(particles, 0.2, 1, 0.5, cap)).toBe(0)
				expect(B.take(particles, 0.5, 1, 0.5, cap)).toBe(1)
				local debris = {}
				local concurrent, perSecond =
					Config.fx.quality.debris[level], Config.fx.quality.debrisPerSecond[level]
				local first = B.take(debris, 0, concurrent, 0.5, concurrent, perSecond)
				expect(first).toBe(math.min(concurrent, perSecond))
				expect(B.take(debris, 0.5, concurrent, 0.5, concurrent, perSecond)).toBe(
					math.max(0, perSecond - first)
				)
				assert(B.take(debris, 1, 1, 0.5, concurrent, perSecond) > 0)
				local count = B.usage(debris, 3)
				expect(count).toBe(0)
				expect(debris).toEqual({})
			end
		end
	)
	Test.it(
		"validates every manual mode and saved level, rejecting invalid mixed patches atomically",
		function()
			for _, mode in { "auto", "high", "normal", "low" } do
				expect(Settings.parse({ effects = mode }).effects).toBe(mode)
			end
			for level = 1, 3 do
				expect(Settings.parse({ autoQuality = level }).autoQuality).toBe(level)
			end
			for _, value in { 0, 4, 0.5, math.huge, 0 / 0, "2" } do
				expect(Settings.parse({ autoQuality = value, music = 0.5 })).toBe(nil)
			end
			expect(Settings.parse({ effects = "ultra" })).toBe(nil)
		end
	)
end)
return true
