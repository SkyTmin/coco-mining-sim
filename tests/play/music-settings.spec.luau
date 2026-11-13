--!strict
local Test = require("../lib/expect")
local Loader = require("../lib/loader")
local M = Loader.load("src/shared/Play/MusicRules.luau")
local Settings = Loader.load("src/shared/Play/SettingsPatch.luau")
local Config = Loader.load("src/shared/Config")
local D = Loader.load("src/shared/Play/ProfileDefaults.luau")
local Circle = Loader.load("src/shared/Play/Circle.luau")
local expect = Test.expect
Test.describe("Adaptive music and preferences", function()
	Test.it(
		"fades into base, quantizes full to a beat, fever/world to a bar and ducks without restarting",
		function()
			local s = M.new()
			local input = { active = true, world = 1, tier = 0, lastHit = 0, volume = 1 }
			local out = M.step(s, input, 0)
			expect(out.at).toBe(0)
			expect(out.duration).toBe(2)
			out = M.step(s, input, 2)
			expect(out.volumes["1:base"]).toBeCloseTo(Config.music.musicGain, 1e-12)
			input.tier = 2
			input.lastHit = 2.1
			out = M.step(s, input, 2.1)
			expect(out.at).toBe(2.5)
			expect(out.duration).toBe(0.5)
			expect(out.volumes["1:full"]).toBe(0)
			out = M.step(s, input, 3)
			expect(out.volumes["1:full"]).toBeCloseTo(Config.music.musicGain, 1e-12)
			input.fever = true
			out = M.step(s, input, 3.1)
			expect(out.at).toBe(4)
			expect(out.duration).toBe(2)
			out = M.step(s, input, 6)
			expect(out.volumes["1:base"]).toBe(0)
			expect(out.volumes["1:fever"]).toBeCloseTo(Config.music.musicGain, 1e-12)
			input.duck = true
			out = M.step(s, input, 6.1)
			expect(out.volumes["1:fever"]).toBeCloseTo(
				Config.music.musicGain * Config.music.duckGain,
				1e-12
			)
			input.world = 2
			out = M.step(s, input, 6.2)
			expect(out.at).toBe(8)
			out = M.step(s, input, 10)
			expect(out.volumes["1:fever"]).toBe(0)
			assert(out.volumes["2:fever"] > 0)
		end
	)
	Test.it(
		"returns to base on tier loss or sixty idle seconds, supports silence and stinger quantization",
		function()
			local s = M.new()
			local input = { active = true, world = 1, tier = 2, lastHit = 0, volume = 0.7 }
			M.step(s, input, 0)
			M.step(s, input, 3)
			expect(M.step(s, input, 60).mode).toBe("base")
			expect(M.step(s, input, 64).volumes["1:full"]).toBe(0)
			input.lastHit = 64
			input.tier = 1
			expect(M.step(s, input, 64).mode).toBe("base")
			input.volume = 0
			expect(M.step(s, input, 65).volumes["1:base"]).toBe(0)
			input.volume = 1
			input.transition = true
			expect(M.step(s, input, 66).mode).toBe("silent")
			expect(M.step(s, input, 70).volumes["1:base"]).toBe(0)
			expect(M.stingDelay(0.4)).toBeCloseTo(0.1, 1e-12)
			expect(M.stingDelay(0.2)).toBe(0)
		end
	)
	Test.it(
		"accepts music endpoints, preserves them across profile migration and rejects a whole malformed patch",
		function()
			for _, music in { 0, 0.7, 1 } do
				local patch = assert(Settings.parse({ music = music }))
				local p = D.new(0)
				p.settings.music = patch.music
				assert(Circle.migrate(p))
				expect(p.settings.music).toBe(music)
			end
			for _, music in { -1, 1.1, 0 / 0, math.huge, "0", false } do
				expect(Settings.parse({ music = music, sfx = 0.5 })).toBe(nil)
			end
			expect(Settings.parse({ unknown = 1 })).toBe(nil)
			expect(Settings.parse({})).toBe(nil)
			expect(Settings.parse({
				music = 0.7,
				language = "ru",
				haptics = false,
				reducedMotion = true,
			})).toEqual({ music = 0.7, language = "ru", haptics = false, reducedMotion = true })
		end
	)
end)
return true
