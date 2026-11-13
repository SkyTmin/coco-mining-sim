--!strict
local SoundService = game:GetService("SoundService")
local ContentProvider = game:GetService("ContentProvider")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local cfg = require(Shared.Config).music
local Rules = require(Shared.Play.MusicRules)
local Sfx = require(Shared.Sfx)
local Music = {}
function Music.new(player: Player): any
	local state = Rules.new()
	local muteUntil = 0
	local banks = {}
	local syncAt, lastLog, warned = 0, "", false
	local function warnOnce()
		if RunService:IsStudio() and not warned then
			warned = true
			warn("[Music] No loaded music assets; silent until owner uploads the stems")
		end
	end
	local function bank(world: number)
		if banks[world] then
			return banks[world]
		end
		local ids = cfg.worlds[world] or cfg.worlds[1]
		if ids.base == "" then
			ids = cfg.worlds[1]
		end
		local b = { ready = false, sounds = {} }
		banks[world] = b
		if ids.base == "" or ids.full == "" or ids.fever == "" then
			warnOnce()
			return b
		end
		for _, stem in { "base", "full", "fever" } do
			local sound = Instance.new("Sound")
			sound.Name, sound.SoundId, sound.Looped, sound.Volume, sound.Parent =
				"Music_" .. world .. "_" .. stem, ids[stem], true, 0, SoundService
			b.sounds[stem] = sound
		end
		local done = false
		task.delay(cfg.preloadSeconds, function()
			if not done then
				done = true
				warnOnce()
			end
		end)
		task.spawn(function()
			local all = {}
			for _, s in b.sounds do
				table.insert(all, s)
			end
			local ok = pcall(ContentProvider.PreloadAsync, ContentProvider, all)
			if done then
				return
			end
			done = true
			for _, s in all do
				ok = ok and s.IsLoaded
			end
			if not ok then
				warnOnce()
				return
			end
			for _, s in all do
				s:Play()
				s.TimePosition = os.clock() % cfg.loopSeconds
			end
			b.ready = true
		end)
		return b
	end
	local api = {}
	function api.step(input: any, now: number)
		if now < muteUntil then
			input.transition = true
		end
		local out = Rules.step(state, input, now)
		bank(input.world)
		for world, b in banks do
			if b.ready then
				for stem, sound in b.sounds do
					sound.Volume = out.volumes[tostring(world) .. ":" .. stem] or 0
				end
				if now >= syncAt then
					local target = now % cfg.loopSeconds
					for _, sound in b.sounds do
						local delta = math.abs(sound.TimePosition - target)
						if math.min(delta, cfg.loopSeconds - delta) > cfg.syncTolerance then
							sound.TimePosition = target
						end
					end
				end
			end
		end
		if now >= syncAt then
			syncAt = now + cfg.syncSeconds
		end
		local label = tostring(out.world) .. ":" .. out.mode .. ":" .. tostring(input.duck == true)
		if
			label ~= lastLog
			and RunService:IsStudio()
			and player:GetAttribute("QaMusicLog") == true
		then
			print(string.format("[Music] %s at=%.3f fade=%.3f", label, out.at, out.duration))
		end
		lastLog = label
	end
	function api.sting(name: string, gain: number)
		if name == "rebirth_sting" then
			muteUntil = os.clock() + require(Shared.Config).sounds.eventSynthesis.rebirthSeconds
		end
		task.delay(Rules.stingDelay(os.clock()), function()
			Sfx.play(name, gain)
		end)
	end
	return api
end
return Music
