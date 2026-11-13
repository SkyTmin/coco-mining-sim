--!strict

local SoundService = game:GetService("SoundService")
local ContentProvider = game:GetService("ContentProvider")
local Config = require(script.Parent.Config)
local AudioRules = require(script.Parent.AudioRules)
local Sfx = {}
local config = Config.sounds
local rules = config.rules
local rng = Random.new()
local group: SoundGroup? = nil
local variants: { [string]: number } = {}
local voices: { [string]: { Sound } } = {}
local firstHit, lastHit, hitGain = 0, -math.huge, 1
local lastCoin, coinPitch = -math.huge, 1

function Sfx.preload()
	local id = config.atlasId
	if not id or group then
		return
	end
	local bus = Instance.new("SoundGroup")
	bus.Name, bus.Volume, bus.Parent = "MineSfx", rules.defaultSfx, SoundService
	group = bus
	task.spawn(function()
		local sound = Instance.new("Sound")
		sound.SoundId = id
		pcall(ContentProvider.PreloadAsync, ContentProvider, { sound })
		sound:Destroy()
	end)
end

function Sfx.level(volume: number)
	if group then
		group.Volume = math.clamp(volume, 0, 1)
	end
end

function Sfx.play(name: string, gain: number, pitch: number?): Sound?
	local id = config.atlasId
	if config.eventFallback and config.eventFallback[name] then
		if config.eventAtlasId and config.eventAtlasId ~= "" then
			id = config.eventAtlasId
		else
			name = config.eventFallback[name]
		end
	end
	local segments = config.clips[name]
	local bus = group
	if not id or not bus or not segments or gain <= 0 or bus.Volume <= 0 then
		return nil
	end
	local active = voices[name]
	if not active then
		active = {}
		voices[name] = active
	end
	if #active >= (rules.voices[name] or (if name == "link_note" then 3 else 1)) then
		return nil
	end
	local last = variants[name]
	local choices = if last then math.max(1, #segments - 1) else #segments
	local variant = AudioRules.variant(#segments, last, rng:NextInteger(1, choices))
	variants[name] = variant
	local segment = segments[variant]
	local speed = pitch or 1
	if name == "hit_soft" or name == "break_soft" then
		speed *= rng:NextNumber(1 - rules.pitchSpread, 1 + rules.pitchSpread)
	end
	local sound = Instance.new("Sound")
	sound.SoundId, sound.Volume, sound.PlaybackSpeed = id, AudioRules.volume(name, gain), speed
	sound.PlaybackRegionsEnabled = true
	sound.PlaybackRegion = NumberRange.new(segment[1], segment[1] + segment[2])
	sound.SoundGroup, sound.Parent = bus, SoundService
	table.insert(active, sound)
	local removed = false
	local loaded: RBXScriptConnection?
	local function remove()
		if removed then
			return
		end
		removed = true
		if loaded then
			loaded:Disconnect()
		end
		local index = table.find(active, sound)
		if index then
			table.remove(active, index)
		end
		sound:Destroy()
	end
	local function begin()
		if removed then
			return
		end
		if loaded then
			loaded:Disconnect()
		end
		sound:Play()
		sound.TimePosition = segment[1]
		task.delay(segment[2] / math.min(sound.PlaybackSpeed, speed) + 0.09, remove)
	end
	sound.Ended:Once(remove)
	if sound.IsLoaded then
		begin()
	else
		loaded = sound.Loaded:Connect(begin)
		task.delay(0.42, function()
			if loaded and loaded.Connected then
				remove()
			end
		end)
	end
	return sound
end

function Sfx.hit(now: number)
	hitGain, firstHit = AudioRules.hitGain(now, firstHit, lastHit, hitGain)
	lastHit = now
	Sfx.play("hit_soft", hitGain * 0.76)
end

function Sfx.coin(now: number, discovery: boolean?)
	coinPitch = if now - lastCoin <= 0.6 then math.min(1.48, coinPitch + 0.075) else 1
	lastCoin = now
	local current = voices.coin and voices.coin[1]
	if current then
		current.PlaybackSpeed = coinPitch
	else
		Sfx.play("coin", if discovery then 0.9 else 0.68, coinPitch)
	end
end

return Sfx
