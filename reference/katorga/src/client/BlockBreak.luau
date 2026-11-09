--!strict
-- Minecraft-style block breaking feedback, purely client-side cosmetics:
--   * crack decals in 10 stages on every face of the block being dug (Config.effects.cracks),
--   * block sounds like Minecraft [ваниль]: while digging the block's *step* sound every 4 ticks (0.2 s)
--     at pitch 0.5 / volume 0.25 ("hit"); when the block goes its *dig* sound at pitch 0.8 / volume 1
--     ("break"). Each (material, kind) owns a tiny pool of reusable Sound instances, so rapid digging
--     restarts sounds instead of piling dozens of copies on top of each other.
--   * crumb particles while digging and a burst of block-textured particles on break.
-- Every audio file holds several variants (Config.effects.sounds.files[*].segments); one is picked at
-- random and played with TimePosition, then stopped after its length.
-- The server still owns the dig (DigService); this module only reacts to the local dig state and to
-- "BlockBrokenFx" batches for blocks other players destroy nearby and to "DigCrackFx" (the cracks, crumbs
-- and hit sounds of the block another player is digging).

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)

local BlockBreak = {}

local FACES = Enum.NormalId:GetEnumItems()
local HIT_INTERVAL = 0.2 -- [ваниль] 4 ticks
local HIT_VOLUME, HIT_PITCH = 0.25, 0.5 -- [ваниль] (volume + 1) / 8, pitch × 0.5
local BREAK_VOLUME, BREAK_PITCH = 1, 0.8 -- [ваниль] (volume + 1) / 2, pitch × 0.8
local POOL = 2 -- sounds per (material, kind): at most two overlapping copies
local OTHERS_RANGE = 48 -- hear other players' breaks within this many studs
local particleBudget = 48
local particleAt = os.clock()

type Segment = { number }
type Voice = { sound: Sound, anchor: BasePart, token: number }
type Channel = { segments: { Segment }, voices: { Voice }, next: number }

local current: BasePart? = nil
local decals: { Decal } = {}
local stage = -1
local lastHit = 0
local channels: { [string]: Channel } = {}
local group: SoundGroup? = nil
local random = Random.new()

local function stages(): { string }
	local effects = Config.effects
	return if effects
			and effects.cracks
			and effects.cracks.stages
		then effects.cracks.stages
		else {}
end

local function soundConfig(): any
	local effects = Config.effects
	return if effects then effects.sounds else nil
end

local function materialOf(blockId: string?): string
	local sounds = soundConfig()
	local map = sounds and sounds.blockMaterial
	if blockId and map then
		return map[blockId] or map._default or "stone"
	end
	return "stone"
end

-- File entry resolved to a playable id + segments (uploaded asset or the trimmed fallback).
local function fileFor(name: string): (string?, { Segment }?)
	local sounds = soundConfig()
	local entry = sounds and sounds.files and sounds.files[name]
	if typeof(entry) ~= "table" then
		return nil, nil
	end
	if typeof(entry.id) == "string" and entry.id ~= "" then
		return entry.id, entry.segments
	end
	local fallback = entry.fallback
	if typeof(fallback) == "table" and typeof(fallback.id) == "string" and fallback.id ~= "" then
		return fallback.id, fallback.segments
	end
	return nil, nil
end

local function newAnchor(name: string): BasePart
	local anchor = Instance.new("Part")
	anchor.Name = name
	anchor.Size = Vector3.new(0.2, 0.2, 0.2)
	anchor.Transparency = 1
	anchor.Anchored = true
	anchor.CanCollide, anchor.CanQuery, anchor.CanTouch = false, false, false
	anchor.Parent = workspace
	return anchor
end

local function channel(material: string, kind: "hit" | "break"): Channel?
	local key = material .. ":" .. kind
	local existing = channels[key]
	if existing then
		return existing
	end
	local sounds = soundConfig()
	local materials = sounds and sounds.materials
	local entry = materials and (materials[material] or materials.stone)
	local fileName = entry and entry[kind]
	if typeof(fileName) ~= "string" then
		return nil
	end
	local id, segments = fileFor(fileName)
	if not id or not segments or #segments == 0 then
		return nil
	end
	local voices: { Voice } = {}
	for index = 1, POOL do
		local anchor = newAnchor("BlockSound_" .. key .. "_" .. index)
		local sound = Instance.new("Sound")
		sound.Name = key
		sound.SoundId = id
		sound.RollOffMode = Enum.RollOffMode.InverseTapered
		sound.RollOffMinDistance = 8
		sound.RollOffMaxDistance = 48
		sound.SoundGroup = group
		sound.Parent = anchor
		voices[index] = { sound = sound, anchor = anchor, token = 0 }
	end
	local created: Channel = { segments = segments, voices = voices, next = 1 }
	channels[key] = created
	return created
end

local function play(
	material: string,
	kind: "hit" | "break",
	position: Vector3,
	volume: number,
	pitch: number
)
	local ch = channel(material, kind)
	if not ch then
		return
	end
	local voice = ch.voices[ch.next]
	ch.next = ch.next % #ch.voices + 1
	local segment = ch.segments[random:NextInteger(1, #ch.segments)]
	local start, length = segment[1], segment[2]
	local speed = pitch * (0.95 + random:NextNumber() * 0.1)
	voice.token += 1
	local token = voice.token
	local sound = voice.sound
	sound:Stop()
	voice.anchor.Position = position
	sound.Volume = volume
	sound.PlaybackSpeed = speed
	sound.TimePosition = start
	sound:Play()
	-- stop at the end of this variant (the file continues with the next one)
	task.delay(length / speed, function()
		if voice.token == token then
			sound:Stop()
		end
	end)
end

local function textureOf(blockId: string?): string?
	local textures = Config.textures and Config.textures.textures
	return if blockId and textures then textures[blockId] else nil
end

-- Block-textured particles: 2 per hit / 8 per break, bounded across nearby digs.
local function emit(
	cframe: CFrame,
	size: Vector3,
	color: Color3,
	blockId: string?,
	amount: number,
	strong: boolean
)
	local now = os.clock()
	particleBudget = math.min(48, particleBudget + (now - particleAt) * 48)
	particleAt = now
	amount = math.min(amount, math.floor(particleBudget))
	if amount <= 0 then
		return
	end
	particleBudget -= amount
	local holder = Instance.new("Part")
	holder.Name = "BlockParticles"
	holder.Size = size * 0.9
	holder.Transparency = 1
	holder.Anchored = true
	holder.CanCollide, holder.CanQuery, holder.CanTouch = false, false, false
	holder.CFrame = cframe
	holder.Parent = workspace
	local e = Instance.new("ParticleEmitter")
	local texture = textureOf(blockId)
	e.Texture = texture or "rbxasset://textures/particles/sparkles_main.dds"
	e.Color = if texture then ColorSequence.new(Color3.new(1, 1, 1)) else ColorSequence.new(color)
	e.Size = NumberSequence.new(if strong then 0.45 else 0.3)
	e.Lifetime = NumberRange.new(0.25, 0.55)
	e.Speed = NumberRange.new(if strong then 5 else 2, if strong then 11 else 4)
	e.SpreadAngle = Vector2.new(180, 180)
	e.Acceleration = Vector3.new(0, -45, 0)
	e.Rotation = NumberRange.new(0, 360)
	e.RotSpeed = NumberRange.new(-180, 180)
	e.Drag = 2
	e.Rate = 0
	e.Shape = Enum.ParticleEmitterShape.Box
	e.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
	e.LightInfluence = 1
	e.Parent = holder
	e:Emit(amount)
	Debris:AddItem(holder, 0.65)
end

local function clearDecals()
	for _, d in ipairs(decals) do
		d:Destroy()
	end
	table.clear(decals)
	stage = -1
end

local function blockIdOf(part: BasePart): string?
	local id = part:GetAttribute("Block")
	return if typeof(id) == "string" then id else nil
end

local function crackDecals(part: BasePart, texture: string, into: { Decal })
	for _, face in ipairs(FACES) do
		local d = Instance.new("Decal")
		d.Name = "Crack"
		d.Face = face
		d.Texture = texture
		d.ZIndex = 2
		d.Parent = part
		table.insert(into, d)
	end
end

-- Called every frame while digging with progress k in [0, 1].
function BlockBreak.Update(part: BasePart, k: number)
	local list = stages()
	if part ~= current then
		clearDecals()
		current = part
		lastHit = 0
		if #list > 0 then
			crackDecals(part, list[1], decals)
		end
	end
	if #list > 0 then
		local s = math.clamp(math.floor(k * #list) + 1, 1, #list)
		if s ~= stage then
			stage = s
			for _, d in ipairs(decals) do
				d.Texture = list[s]
			end
		end
	end
	local now = os.clock()
	if now - lastHit >= HIT_INTERVAL then
		lastHit = now
		local blockId = blockIdOf(part)
		play(materialOf(blockId), "hit", part.Position, HIT_VOLUME, HIT_PITCH)
		emit(part.CFrame, part.Size, part.Color, blockId, 2, false)
	end
end

-- Digging stopped before the block broke: Minecraft drops the progress immediately, and the hit sound
-- that is still ringing is left to finish (nothing new is started).
function BlockBreak.Clear()
	clearDecals()
	current = nil
end

local function breakEffects(cframe: CFrame, size: Vector3, color: Color3, blockId: string?)
	play(materialOf(blockId), "break", cframe.Position, BREAK_VOLUME, BREAK_PITCH)
	emit(cframe, size, color, blockId, 8, true)
end

-- The block is about to disappear (local dig finished): burst of particles + break sound.
function BlockBreak.Break(part: BasePart)
	clearDecals()
	current = nil
	breakEffects(part.CFrame, part.Size, part.Color, blockIdOf(part))
end

-- Other players' digs nearby (server "DigCrackFx"): userId → their block, its cracks and timing; the
-- stages, crumbs and hit sounds run here from the dig time, like for our own block.
type OtherDig = {
	part: BasePart,
	decals: { Decal },
	stage: number,
	from: number,
	needed: number,
	lastHit: number,
}
local others: { [number]: OtherDig } = {}

local function dropOther(userId: number)
	local dig = others[userId]
	if dig then
		for _, d in ipairs(dig.decals) do
			d:Destroy()
		end
		others[userId] = nil
	end
end

local function stepOthers()
	if next(others) == nil then
		return
	end
	local list = stages()
	local now = os.clock()
	for userId, dig in pairs(others) do
		local k = (now - dig.from) / dig.needed
		if not dig.part.Parent or k >= 1.1 then
			dropOther(userId) -- broken (the break burst comes by BlockBrokenFx), or the cancel got lost
		elseif k >= 0 and #list > 0 then
			local s = math.clamp(math.floor(k * #list) + 1, 1, #list)
			if s ~= dig.stage then
				dig.stage = s
				if #dig.decals == 0 then
					crackDecals(dig.part, list[s], dig.decals)
				end
				for _, d in ipairs(dig.decals) do
					d.Texture = list[s]
				end
			end
			if now - dig.lastHit >= HIT_INTERVAL then
				dig.lastHit = now
				local blockId = blockIdOf(dig.part)
				play(materialOf(blockId), "hit", dig.part.Position, HIT_VOLUME, HIT_PITCH)
				emit(dig.part.CFrame, dig.part.Size, dig.part.Color, blockId, 2, false)
			end
		end
	end
end

-- Preload the audio so the first hit is not silent, and listen for other players' breaks.
function BlockBreak.Start()
	local sg = Instance.new("SoundGroup")
	sg.Name = "Blocks"
	sg.Volume = 0.3
	sg.Parent = SoundService
	group = sg
	local sounds = soundConfig()
	local materials = sounds and sounds.materials
	if materials then
		local names: { string } = {}
		for name in pairs(materials) do
			table.insert(names, name)
		end
		table.sort(names)
		local toPreload: { Instance } = {}
		for _, name in ipairs(names) do
			for _, kind in ipairs({ "hit", "break" }) do
				local ch = channel(name, kind :: "hit" | "break")
				if ch then
					table.insert(toPreload, ch.voices[1].sound)
				end
			end
		end
		task.spawn(function()
			pcall(function()
				game:GetService("ContentProvider"):PreloadAsync(toPreload)
			end)
		end)
	end
	-- blocks broken by others nearby: one unreliable batch per frame { {position, size, color, id} }
	-- (the server already left out our own breaks and anything beyond its range)
	Remotes.unreliable("BlockBrokenFx").OnClientEvent:Connect(function(batch: any)
		if typeof(batch) ~= "table" then
			return
		end
		local character = Players.LocalPlayer.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		for _, entry in ipairs(batch) do
			local position, size, color, blockId = entry[1], entry[2], entry[3], entry[4]
			if
				typeof(position) == "Vector3"
				and typeof(size) == "Vector3"
				and typeof(color) == "Color3"
				and root
				and root:IsA("BasePart")
				and (root.Position - position).Magnitude <= OTHERS_RANGE
			then
				breakEffects(CFrame.new(position), size, color, blockId)
			end
		end
	end)
	-- { userId, part | false, needed, pause }: false = that player stopped digging
	Remotes.unreliable("DigCrackFx").OnClientEvent:Connect(function(msg: any)
		if typeof(msg) ~= "table" or typeof(msg[1]) ~= "number" then
			return
		end
		local userId, part, needed, pause = msg[1], msg[2], msg[3], msg[4]
		dropOther(userId)
		if
			typeof(part) == "Instance"
			and part:IsA("BasePart")
			and typeof(needed) == "number"
			and needed > 0
			and typeof(pause) == "number"
		then
			others[userId] = {
				part = part,
				decals = {},
				stage = 0,
				from = os.clock() + pause,
				needed = needed,
				lastHit = 0,
			}
		end
	end)
	RunService.Heartbeat:Connect(stepOthers)
end

return BlockBreak
