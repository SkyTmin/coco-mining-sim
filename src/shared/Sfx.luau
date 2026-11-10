--!strict
-- Local segmented playback adapted from the VoxeLibre sound atlas player.

local SoundService = game:GetService("SoundService")
local ContentProvider = game:GetService("ContentProvider")
local Config = require(script.Parent.Config)
local Sfx = {}
local rng = Random.new()

function Sfx.preload()
	local ids: { [string]: boolean } = {}
	local assets: { Instance } = {}
	for _, clip in Config.sounds do
		for _, id in { clip.id, clip.fallback } do
			if id and not ids[id] then
				ids[id] = true
				local sound = Instance.new("Sound")
				sound.SoundId = id
				table.insert(assets, sound)
			end
		end
	end
	task.spawn(function()
		pcall(ContentProvider.PreloadAsync, ContentProvider, assets)
		for _, sound in assets do
			sound:Destroy()
		end
	end)
end

function Sfx.play(name: string, volume: number, pitch: number?)
	local clip = Config.sounds[name]
	if not clip or volume <= 0 then
		return
	end
	local segment = clip.segments[rng:NextInteger(1, #clip.segments)]
	local speed = pitch or 1
	local function play(id: string, start: number, duration: number, fallback: string?)
		local sound = Instance.new("Sound")
		sound.SoundId, sound.Volume, sound.PlaybackSpeed = id, volume, speed
		sound.Parent = SoundService
		local connection: RBXScriptConnection?
		local function begin()
			if connection then
				connection:Disconnect()
			end
			sound.TimePosition = start
			sound:Play()
			task.delay(duration / speed + 0.02, function()
				sound:Destroy()
			end)
		end
		if sound.IsLoaded then
			begin()
			return
		end
		connection = sound.Loaded:Connect(begin)
		task.delay(0.45, function()
			if connection and connection.Connected then
				connection:Disconnect()
				sound:Destroy()
				if fallback then
					play(fallback, 0, duration, nil)
				end
			end
		end)
	end
	play(clip.id, segment[1], segment[2], clip.fallback)
end

return Sfx
