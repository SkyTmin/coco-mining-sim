--!strict

local fs = require("@lune/fs")
local Test = require("./lib/expect")
local Loader = require("./lib/loader")
local Config = Loader.load("src/shared/Config")
local AudioRules = Loader.load("src/shared/AudioRules.luau")
local expect = Test.expect

Test.describe("Mining sounds", function()
	Test.it("caps playback at the levels in the specification", function()
		local rules = Config.sounds.rules
		expect(rules.defaultSfx).toBe(0.6)
		expect(rules.voices).toEqual({ hit_soft = 2, break_soft = 3, coin = 1 })
		expect(rules.pitchSpread).toBe(0.08)
		for _, name in { "hit_soft", "break_soft", "coin" } do
			expect(AudioRules.volume(name, 2)).toBe(0.25)
		end
		expect(AudioRules.volume("link_note", 2)).toBe(0.12)
		expect(AudioRules.volume("ult_thud", 2)).toBe(0.5)
		expect(AudioRules.volume("depth_knock", 2)).toBe(0.10)
		expect(AudioRules.volume("buy_soft", 2)).toBe(0.25)
	end)
	Test.it("has five distinct, non-repeating hit and break variants", function()
		for _, name in { "hit_soft", "break_soft" } do
			local clips = Config.sounds.clips[name]
			assert(#clips >= 5)
			local offsets = {}
			for previous, segment in clips do
				assert(not offsets[segment[1]])
				offsets[segment[1]] = true
				for roll = 1, #clips - 1 do
					assert(AudioRules.variant(#clips, previous, roll) ~= previous)
				end
			end
		end
	end)
	Test.it("uses the uploaded atlas and the complete set of clips", function()
		assert(Config.sounds.atlasId:match("^rbxassetid://[1-9]%d*$"))
		for name, count in
			{
				buy_soft = 3,
				crit_soft = 2,
				depth_knock = 3,
				level_tick = 1,
				card_morph = 1,
				heavy_hit = 1,
				coin_rain = 1,
				world_enter = 1,
				locked = 1,
				step_dirt = 2,
				step_stone = 2,
			}
		do
			expect(#Config.sounds.clips[name]).toBe(count)
		end
	end)
	Test.it("quietens sustained digging and recovers during a pause", function()
		local gain, first, last = 1, 0, 0
		for i = 1, 32 do
			local now = i * 0.25
			gain, first = AudioRules.hitGain(now, first, last, gain)
			last = now
			if now < 3 then
				expect(gain).toBe(1)
			end
		end
		assert(gain >= 0.6 and gain < 0.61)
		local recovered = AudioRules.hitGain(last + 2, first, last, gain)
		assert(recovered > 0.99)
	end)
	Test.it("uses no harsh built-in audio", function()
		local generated = fs.readFile("src/shared/Config/sounds.json")
		local player = fs.readFile("src/shared/Sfx.luau")
		for _, name in { "impact_explosion_03", "action_falling", "volume_slider" } do
			assert(not generated:find(name, 1, true) and not player:find(name, 1, true))
		end
	end)
end)

return true
