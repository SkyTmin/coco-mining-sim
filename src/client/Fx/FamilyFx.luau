--!strict
-- Family effects [владелец 11.11: «не забывай эффекты», «эффект молнии не вижу»]. Outcomes and timing come from the
-- server; this only draws. A perk breaks its blocks before the effect plays, so effects work from the world positions
-- the controller attaches to the event (`event.positions`, `event.origin`), never from the block parts.
--   storm    — a chain of lightning from the hit through every struck block, a white flash at each link
--   dynamite — a fireball at every block: flash ball, fire, sparks, smoke, a short orange screen flash
--   rift     — a glowing orange crack from the hit to each block, stone chips flying out
--   frost    — an ice burst: a pale flash, snow sparkles and ice shards
-- Particle textures are Roblox built-ins (rbxasset://), nothing uploaded.
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Sfx = require(Shared.Sfx)
local FamilyFx = {}

type Extras = {
	bolt: ((Vector3, Vector3, boolean) -> ())?,
	flash: ((Color3, number) -> ())?,
}

local locate: (any, number?) -> BasePart? = function(_cell: any, _front: number?)
	return nil
end
local showResult: (any) -> () = function(_result: any) end
local notice: (string) -> () = function(_key: string) end
local extras: Extras = {}
local frozen: { [BasePart]: Color3 } = {}

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"
local hex = Color3.fromHex
local PALETTE = {
	storm = { hex("FFFFFF"), hex("8BE1FF"), hex("FFE14D") },
	dynamite = { hex("FFF1A8"), hex("FF6A2A"), hex("C0241A") },
	rift = { hex("FFE6B0"), hex("FFA51C"), hex("7D6A58") },
	frost = { hex("FFFFFF"), hex("BDEFFF"), hex("3A9BE0") },
}

local folder: Folder? = nil
local anchor: Part? = nil
local function root(): Part
	if anchor and anchor.Parent then
		return anchor
	end
	local f = Instance.new("Folder")
	f.Name, f.Parent = "FamilyFx", workspace
	local a = Instance.new("Part")
	a.Name, a.Anchored, a.CanCollide, a.CanQuery, a.CanTouch, a.Transparency =
		"Anchor", true, false, false, false, 1
	a.Size, a.Position, a.Parent = Vector3.one, Vector3.zero, f
	folder, anchor = f, a
	return a
end

local function emitter(
	parent: Attachment,
	texture: string,
	colors: { Color3 },
	size: NumberSequence,
	speed: NumberRange,
	life: NumberRange,
	light: number
): ParticleEmitter
	local e = Instance.new("ParticleEmitter")
	e.Texture, e.Enabled, e.LightEmission, e.LightInfluence = texture, false, light, 0
	e.Color = if #colors == 1
		then ColorSequence.new(colors[1])
		else ColorSequence.new({
			ColorSequenceKeypoint.new(0, colors[1]),
			ColorSequenceKeypoint.new(0.5, colors[2]),
			ColorSequenceKeypoint.new(1, colors[#colors]),
		})
	e.Size, e.Speed, e.Lifetime = size, speed, life
	e.SpreadAngle, e.Rotation, e.RotSpeed =
		Vector2.new(180, 180), NumberRange.new(0, 360), NumberRange.new(-180, 180)
	e.Transparency =
		NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) })
	e.Drag, e.Parent = 3, parent
	return e
end

-- one attachment with all of a family's emitters, re-used from a small ring
type Burst = { at: Attachment, emitters: { ParticleEmitter }, counts: { number } }
local rings: { [string]: { list: { Burst }, next: number } } = {}
local function burst(family: string): Burst
	local ring = rings[family]
	if not ring then
		ring = { list = {}, next = 1 }
		rings[family] = ring
	end
	local item = ring.list[ring.next]
	if not item then
		local at = Instance.new("Attachment")
		at.Parent = root()
		local c = PALETTE[family]
		local small = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.5),
			NumberSequenceKeypoint.new(1, 0),
		})
		local emitters, counts
		if family == "dynamite" then
			emitters = {
				emitter(
					at,
					FIRE,
					c,
					NumberSequence.new(1.6, 0.2),
					NumberRange.new(4, 9),
					NumberRange.new(0.25, 0.45),
					1
				),
				emitter(
					at,
					SPARKLE,
					{ c[1], c[2] },
					small,
					NumberRange.new(12, 22),
					NumberRange.new(0.3, 0.6),
					1
				),
				emitter(
					at,
					SMOKE,
					{ hex("5A4A44") },
					NumberSequence.new(1, 2.6),
					NumberRange.new(2, 4),
					NumberRange.new(0.6, 1),
					0
				),
			}
			counts = { 14, 16, 6 }
		elseif family == "rift" then
			emitters = {
				emitter(
					at,
					SPARKLE,
					{ c[1], c[2] },
					small,
					NumberRange.new(8, 14),
					NumberRange.new(0.3, 0.5),
					1
				),
				emitter(
					at,
					SMOKE,
					{ hex("B3A08C") },
					NumberSequence.new(0.6, 1.6),
					NumberRange.new(2, 5),
					NumberRange.new(0.4, 0.7),
					0
				),
			}
			counts = { 12, 5 }
		elseif family == "frost" then
			emitters = {
				emitter(
					at,
					SPARKLE,
					c,
					NumberSequence.new(0.7, 0),
					NumberRange.new(6, 12),
					NumberRange.new(0.4, 0.8),
					1
				),
				emitter(
					at,
					SMOKE,
					{ hex("E3F7FF") },
					NumberSequence.new(0.8, 2),
					NumberRange.new(1, 3),
					NumberRange.new(0.5, 0.8),
					0.4
				),
			}
			counts = { 18, 5 }
		else
			emitters = {
				emitter(
					at,
					SPARKLE,
					c,
					NumberSequence.new(0.9, 0),
					NumberRange.new(8, 16),
					NumberRange.new(0.2, 0.4),
					1
				),
			}
			counts = { 14 }
		end
		emitters[1].Acceleration = if family == "frost" then Vector3.new(0, -6, 0) else Vector3.zero
		item = { at = at, emitters = emitters, counts = counts }
		ring.list[ring.next] = item
	end
	ring.next = ring.next % 12 + 1
	return item
end

local function emit(family: string, position: Vector3, scale: number)
	local b = burst(family)
	b.at.WorldPosition = position
	for i, e in b.emitters do
		e:Emit(math.max(1, math.floor(b.counts[i] * scale + 0.5)))
	end
end

-- a glowing ball that swells and fades
local function pop(position: Vector3, color: Color3, size: number, time: number)
	local ball = Instance.new("Part")
	ball.Shape, ball.Material, ball.Color = Enum.PartType.Ball, Enum.Material.Neon, color
	ball.Anchored, ball.CanCollide, ball.CanQuery, ball.CanTouch, ball.CastShadow =
		true, false, false, false, false
	ball.Size, ball.Position, ball.Transparency = Vector3.one * size * 0.3, position, 0.05
	ball.Parent = folder or root().Parent
	TweenService:Create(
		ball,
		TweenInfo.new(time, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ Size = Vector3.one * size, Transparency = 1 }
	):Play()
	local light = Instance.new("PointLight")
	light.Color, light.Range, light.Brightness, light.Parent = color, size * 4, 3, ball
	TweenService:Create(light, TweenInfo.new(time), { Brightness = 0 }):Play()
	Debris:AddItem(ball, time + 0.05)
end

-- small solid chunks flying out under gravity
local function chips(position: Vector3, colors: { Color3 }, count: number, material: Enum.Material)
	for _ = 1, count do
		local chip = Instance.new("Part")
		chip.Size = Vector3.one * (0.18 + math.random() * 0.22)
		chip.Color, chip.Material = colors[math.random(1, #colors)], material
		chip.CanCollide, chip.CanQuery, chip.CanTouch, chip.CastShadow, chip.Massless =
			false, false, false, false, true
		chip.CFrame = CFrame.new(position)
			* CFrame.Angles(math.random() * 6, math.random() * 6, math.random() * 6)
		chip.AssemblyLinearVelocity =
			Vector3.new(math.random() * 14 - 7, 6 + math.random() * 8, math.random() * 8)
		chip.AssemblyAngularVelocity =
			Vector3.new(math.random() * 20 - 10, math.random() * 20 - 10, 0)
		chip.Parent = folder or root().Parent
		TweenService
			:Create(chip, TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				Transparency = 1,
				Size = chip.Size * 0.4,
			})
			:Play()
		Debris:AddItem(chip, 0.75)
	end
end

-- a glowing crack: a thin neon bar between two points
local function crack(a: Vector3, b: Vector3, color: Color3, time: number)
	local length = (b - a).Magnitude
	if length < 0.05 then
		return
	end
	local bar = Instance.new("Part")
	bar.Material, bar.Color = Enum.Material.Neon, color
	bar.Anchored, bar.CanCollide, bar.CanQuery, bar.CanTouch, bar.CastShadow =
		true, false, false, false, false
	bar.Size = Vector3.new(0.16, 0.16, length)
	bar.CFrame = CFrame.lookAt((a + b) / 2, b)
	bar.Parent = folder or root().Parent
	TweenService:Create(bar, TweenInfo.new(time, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
		Transparency = 1,
		Size = Vector3.new(0.02, 0.02, length),
	}):Play()
	Debris:AddItem(bar, time + 0.05)
end

function FamilyFx.configure(
	find: (any, number?) -> BasePart?,
	result: (any) -> (),
	text: (string) -> (),
	more: Extras?
)
	locate, showResult, notice = find, result, text
	extras = more or {}
end

local function flash(family: string, strength: number)
	local f = extras.flash
	if f then
		f(PALETTE[family][2], strength)
	end
end

local function play(family: string, origin: Vector3?, positions: { Vector3 }, scale: number)
	local c = PALETTE[family]
	if family == "storm" then
		local from = origin or positions[1]
		for i, p in positions do
			task.delay((i - 1) * 0.045, function()
				local bolt = extras.bolt
				if bolt then
					bolt(from, p, i == 1)
				end
				pop(p, c[1], 2.2 * scale, 0.22)
				emit(family, p, scale)
				from = p
			end)
		end
		Sfx.play("bolt_soft", 0.5)
		flash(family, 0.12 * scale)
	elseif family == "dynamite" then
		for i, p in positions do
			task.delay((i - 1) * 0.03, function()
				pop(p, c[2], 3.4 * scale, 0.3)
				emit(family, p, scale)
			end)
		end
		Sfx.play("heavy_hit", 0.55, 0.8)
		flash(family, 0.16 * scale)
	elseif family == "rift" then
		local from = origin or positions[1]
		for i, p in positions do
			task.delay((i - 1) * 0.04, function()
				crack(from, p, c[2], 0.45)
				pop(p, c[2], 1.8 * scale, 0.25)
				emit(family, p, scale)
				chips(p, { c[3], hex("B3A08C"), hex("4E4036") }, 4, Enum.Material.Slate)
			end)
		end
		Sfx.play("plate_hit", 0.45, 1.2)
		flash(family, 0.1 * scale)
	elseif family == "frost" then
		for i, p in positions do
			task.delay((i - 1) * 0.035, function()
				pop(p, c[2], 2.4 * scale, 0.3)
				emit(family, p, scale)
				chips(p, { c[1], c[2] }, 3, Enum.Material.Ice)
			end)
		end
		Sfx.play("crit_soft", 0.5, 1.4)
		flash(family, 0.1 * scale)
	end
end

function FamilyFx.perk(event: any)
	if not Config.families[event.family] or not PALETTE[event.family] then
		return
	end
	local positions = event.positions or {}
	if #positions == 0 then
		return
	end
	task.delay(event.delayMs / 1000, function()
		play(event.family, event.origin, positions, 1)
	end)
end

function FamilyFx.ult(family: string, event: any)
	task.delay(event.delayMs / 1000, function()
		notice("family_ult_" .. family)
		if not PALETTE[family] then
			return
		end
		local positions = event.positions or {}
		-- the ult is big: a few strong bursts along its blocks, the wave itself is drawn by the controller
		local picked = {}
		local step = math.max(1, #positions // 8)
		for i = 1, #positions, step do
			table.insert(picked, positions[i])
		end
		if event.origin then
			table.insert(picked, 1, event.origin)
		end
		play(family, event.origin, picked, 1.5)
		flash(family, 0.25)
	end)
end

function FamilyFx.frozen(cells: { any })
	for part, color in frozen do
		if part.Parent then
			part.Color = color
			part:SetAttribute("FamilyFrozen", nil)
		end
	end
	table.clear(frozen)
	for _, cell in cells do
		local part = locate(cell, nil)
		if part then
			frozen[part] = part.Color
			part.Color = part.Color:Lerp(Color3.fromHex(Config.families.frost.color), 0.45)
			part:SetAttribute("FamilyFrozen", true)
			emit("frost", part.Position, 0.4)
		end
	end
end

function FamilyFx.chestOpen(result: any)
	showResult(result)
	Sfx.play("buy_soft", 0.3)
end

return FamilyFx
