--!strict
-- Named game sounds from the VoxeLibre atlas (assets/sounds/ids.json → Config.effects.sounds.files):
-- each name has segments [start, length] inside one uploaded audio asset (or a fallback clip until the
-- owner uploads it). A random segment plays with Sound.TimePosition and is stopped after its length.
-- The server never plays sounds itself (a replicated TimePosition is unreliable): it asks clients with
-- the Sfx remote — everyone near a point (Sfx.broadcast) or one player (Sfx.toPlayer) — and each client
-- plays the segment locally (Sfx.listen, started by the client script).

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")

local Config = require(script.Parent.Config)
local Remotes = require(script.Parent.Remotes)

local Sfx = {}

local HEAR_DISTANCE = 64 -- studs: broadcast sounds reach players this close
local random = Random.new()

-- id + segments for a sound name: the uploaded atlas, else the trimmed fallback clip, else nil
function Sfx.resolve(name: string): (string?, { { number } }?)
	local effects = Config.effects
	local files = effects and effects.sounds and effects.sounds.files
	local entry = files and files[name]
	if not entry then
		return nil, nil
	end
	if typeof(entry.id) == "string" and entry.id ~= "" and typeof(entry.segments) == "table" then
		return entry.id, entry.segments
	end
	local fallback = entry.fallback
	if fallback and typeof(fallback.id) == "string" and fallback.id ~= "" then
		return fallback.id, fallback.segments
	end
	return nil, nil
end

-- Client: plays one variant of `name` at `parent` (a part = positional, nil = 2D for this player).
function Sfx.play(name: string, parent: Instance?, volume: number?, pitch: number?): Sound?
	local id, segments = Sfx.resolve(name)
	if not id or not segments or #segments == 0 then
		return nil
	end
	local segment = segments[random:NextInteger(1, #segments)]
	local start, length = segment[1] or 0, segment[2] or 0.5
	local speed = pitch or 1
	local sound = Instance.new("Sound")
	sound.SoundId = id
	sound.Volume = volume or 0.6
	sound.PlaybackSpeed = speed
	sound.RollOffMaxDistance = HEAR_DISTANCE
	sound.Parent = parent or SoundService
	-- a fresh Sound is not loaded yet, and seeking an unloaded sound can be ignored (it would play the
	-- atlas from 0 — the wrong sound): seek and play once it has loaded (the atlas is preloaded, so fast)
	local function begin()
		sound.TimePosition = start
		sound:Play()
		task.delay(length / speed + 0.02, function()
			sound:Stop()
			sound:Destroy()
		end)
	end
	if sound.IsLoaded then
		begin()
	else
		local loaded: RBXScriptConnection
		loaded = sound.Loaded:Connect(function()
			loaded:Disconnect()
			begin()
		end)
		task.delay(2, function()
			if loaded.Connected then -- never loaded: drop it silently
				loaded:Disconnect()
				sound:Destroy()
			end
		end)
	end
	return sound
end

-- Client: fetch every sound file once at start so later sounds load instantly.
local function preload()
	local effects = Config.effects
	local files = effects and effects.sounds and effects.sounds.files
	local seen: { [string]: boolean } = {}
	local sounds: { Instance } = {}
	for name in pairs(files or {}) do
		local id = Sfx.resolve(name)
		if id and not seen[id] then
			seen[id] = true
			local sound = Instance.new("Sound")
			sound.SoundId = id
			table.insert(sounds, sound)
		end
	end
	task.spawn(function()
		pcall(function()
			game:GetService("ContentProvider"):PreloadAsync(sounds)
		end)
	end)
end

-- Server: everyone within HEAR_DISTANCE of `anchor` hears `name` there.
function Sfx.broadcast(
	name: string,
	anchor: BasePart,
	volume: number?,
	pitch: number?,
	exclude: Player?
)
	for _, player in ipairs(Players:GetPlayers()) do
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if
			player ~= exclude
			and root
			and root:IsA("BasePart")
			and (root.Position - anchor.Position).Magnitude <= HEAR_DISTANCE
		then
			Remotes.event("Sfx"):FireClient(player, name, anchor, volume, pitch)
		end
	end
end

-- Server: only this player hears it (menus, level up, upgrades).
function Sfx.toPlayer(player: Player, name: string, volume: number?, pitch: number?)
	Remotes.event("Sfx"):FireClient(player, name, nil, volume, pitch)
end

-- Server start: create the remote before clients wait for it. Client start: play what the server asks.
function Sfx.listen()
	if RunService:IsServer() then
		Remotes.event("Sfx")
		return
	end
	preload()
	Remotes.event("Sfx").OnClientEvent
		:Connect(function(name: any, anchor: any, volume: any, pitch: any)
			if typeof(name) ~= "string" then
				return
			end
			local parent = if typeof(anchor) == "Instance" and anchor:IsA("BasePart")
				then anchor
				else nil
			Sfx.play(
				name,
				parent,
				if typeof(volume) == "number" then volume else nil,
				if typeof(pitch) == "number" then pitch else nil
			)
		end)
end

return Sfx
