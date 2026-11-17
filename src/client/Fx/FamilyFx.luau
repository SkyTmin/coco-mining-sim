--!strict
-- Family skill effects [владелец 12.11: «навыки должны визуально взаимодействовать с блоками… визуал должен точно
-- отражать механику»]. The server decides every outcome; this only draws it. Perk blocks are already gone from the
-- wall when the result arrives, so every struck block is played by a SHELL: a pooled part with the block's own
-- material, standing exactly where the block was. The shell shows the family's reaction to the hit and only then
-- breaks (the controller starts the pixel grains at the time `perk` returns, so grains and shell agree).
--
--   storm    sharp and fast: a thick jagged bolt (from the pick, or from the ceiling in the storm) jumps block to block;
--            each struck block flashes white-hot, crackles with a blue outline and bursts into grains
--            · Цепь молний — blocks past the base count are hit by violet forks splitting off the chain
--            · Золотая искра — struck blocks spit gold sparks with the coins
--            · Грозовой фронт — the storm itself: darker blue air, flickers, every hit draws a bolt from the ceiling
--   dynamite impulse: the blast blocks heat up and tremble around a fuse spark, then one detonation throws them out
--            as tumbling, scorching chunks; smoke, embers, the neighbours scorched for a moment
--            · Заряд — blocks past the base count go off as a second, sympathetic blast a beat later
--            · Счастливый осколок — the key flies out of the rock · Кладоискатель — a found chest bursts with gold
--            · Тайник — the chest the ult hid lands in the new wall
--   rift     heavy: a low rumble builds, the crack runs block after block into the rock — each block jolts, its seams
--            glow and it splits in two halves that slide apart, revealing the next one
--            · Трещина — blocks past the base count split in an aftershock · Сквозняк — a glowing spike drives the
--            hit through to the next layer · Глубокий удар — a longer quake on the ult · Эхо — the second wave
--   frost    cold: every hit freezes its block (glaze + ice spikes, it stays until the shatter); the perk flash-freezes
--            its blocks one by one from the frozen ones, holds, and shatters everything at once into ice and grains
--            · Иней — the rime creeps on to the extra blocks, a second crackle · Ледяная хватка — ice spray on each
--            hit · Ледолом — ice wedges driven into the plate · Хрупкость — the block bursts like glass in one blow
-- Particle textures are Roblox built-ins (rbxasset://); sounds come from the game's own atlas, pitched per family.
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Sfx = require(Shared.Sfx)
local State = require(Shared.Mine.MineState)
local FxFlags = require(Shared.Play.FxFlags)
local Client = script.Parent.Parent
local ProfileState = require(Client.ProfileState)
local Candy = require(Client.Ui.Candy)
local BlockArt = require(Client.Mine.BlockArt)
local FamilyFx = {}

local S = Config.mine.blockSize
local STAGES = Config.art.cracks
local hex = Color3.fromHex
local WHITE = Color3.new(1, 1, 1)
local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"

-- skill order inside each family (families.json skills[]): the level of skill `n` is profile.skills[family][n]
local SKILL = {
	storm = { forks = 1, coins = 2, luck = 3, storm = 4 },
	dynamite = { charge = 1, keys = 2, treasure = 3, stash = 4 },
	rift = { crack = 1, depth = 2, echo = 3, pierce = 4 },
	frost = { rime = 1, grip = 2, plate = 3, brittle = 4 },
}

type Block = {
	frame: CFrame,
	texture: string,
	faces: { Enum.NormalId },
	x: number,
	y: number,
	depth: number,
}
type Extras = {
	bolt: ((Vector3, Vector3, boolean, any?) -> ())?,
	flash: ((Color3, number) -> ())?,
	trauma: ((number, number, number) -> ())?,
}
export type Plan = { [string]: { at: number, grains: boolean } }

local locate: (any, number?) -> BasePart? = function(_cell: any, _front: number?)
	return nil
end
local showResult: (any) -> () = function(_result: any) end
local notice: (string) -> () = function(_key: string) end
local extras: Extras = {}

-- ── budget ───────────────────────────────────────────────────────────────────────────────────────────────────────
-- phones get half of everything; a skill that finds the pools empty simply plays fewer pieces, never queues
local Quality = require(script.Parent.Quality)
local function lite(): boolean
	return UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
end
local function calm(): boolean
	return ProfileState.preference("reducedMotion") == true
end
local SHELLS, DEBRIS, CONES = 64, 160, 160

local function level(family: string, skill: number): number
	local p = ProfileState.getProfile()
	local list = p and p.skills and p.skills[family]
	return if list then (list[skill] or 0) else 0
end

-- ── the pools ────────────────────────────────────────────────────────────────────────────────────────────────────
local folder: Folder? = nil
local anchor: Part? = nil
type Shell = {
	part: Part,
	box: SelectionBox,
	decals: { Decal },
	busy: boolean,
	cones: { ConeHandleAdornment },
}
type Chip = {
	part: Part,
	busy: boolean,
	pos: Vector3,
	vel: Vector3,
	axis: Vector3,
	spin: number,
	angle: number,
	born: number,
	life: number,
	gravity: number,
	size: Vector3,
	color: Color3,
	toColor: Color3?,
	fade: number,
	base: CFrame,
}
local shells: { Shell } = {}
local chips: { Chip } = {}
local cones: { ConeHandleAdornment } = {}
local balls: { { part: Part, light: PointLight, busy: boolean } } = {}
local bars: { { part: Part, busy: boolean } } = {}
local tags: { { gui: BillboardGui, image: ImageLabel, busy: boolean } } = {}
local tracks: { (number) -> boolean } = {}
local movingParts: { BasePart } = {}
local movingFrames: { CFrame } = {}

local function plain(part: BasePart)
	part.Anchored, part.CanCollide, part.CanQuery, part.CanTouch, part.CastShadow =
		true, false, false, false, false
end

local function root(): Part
	if anchor and anchor.Parent then
		return anchor
	end
	local f = Instance.new("Folder")
	f.Name, f.Parent = "FamilyFx", workspace
	local a = Instance.new("Part")
	plain(a)
	a.Name, a.Transparency, a.Size, a.Position, a.Parent = "Anchor", 1, Vector3.one, Vector3.zero, f
	folder, anchor = f, a
	return a
end
local function holder(): Instance
	root()
	return folder :: Folder
end

Quality.observe("debris", function()
	local count = 0
	for _, item in shells do
		if item.busy then
			count += 1
		end
	end
	for _, item in chips do
		if item.busy then
			count += 1
		end
	end
	for _, item in cones do
		if item:GetAttribute("Busy") == true then
			count += 1
		end
	end
	return count
end)

local function takeShell(): Shell?
	if Quality.reserve("debris", 1, Config.fx.qualityRuntime.debrisLeaseSeconds) == 0 then
		return nil
	end
	for _, shell in shells do
		if not shell.busy then
			shell.busy = true
			return shell
		end
	end
	if #shells >= (if lite() then SHELLS // 2 else SHELLS) then
		return nil
	end
	local part = Instance.new("Part")
	plain(part)
	part.Name, part.Size, part.Material = "SkillShell", Vector3.one * S, Enum.Material.SmoothPlastic
	local box = Instance.new("SelectionBox")
	box.Adornee, box.Visible, box.Parent = part, false, holder()
	local decals = {}
	for i = 1, 3 do
		local decal = Instance.new("Decal")
		decal.ZIndex, decal.Transparency = 2, 1
		decal.Parent = part
		decals[i] = decal
	end
	local shell: Shell = { part = part, box = box, decals = decals, busy = true, cones = {} }
	table.insert(shells, shell)
	return shell
end

local function takeCone(): ConeHandleAdornment?
	if Quality.reserve("debris", 1, Config.fx.qualityRuntime.debrisLeaseSeconds) == 0 then
		return nil
	end
	for _, cone in cones do
		if not cone.Visible and cone:GetAttribute("Busy") ~= true then
			cone:SetAttribute("Busy", true)
			return cone
		end
	end
	if #cones >= (if lite() then CONES // 2 else CONES) then
		return nil
	end
	local cone = Instance.new("ConeHandleAdornment")
	cone.Name, cone.Visible, cone.AlwaysOnTop, cone.ZIndex = "IceSpike", false, false, 1
	cone:SetAttribute("Busy", true)
	cone.Parent = holder()
	table.insert(cones, cone)
	return cone
end
local function dropCone(cone: ConeHandleAdornment)
	cone.Visible, cone.Adornee = false, nil
	cone:SetAttribute("Busy", false)
end

local function freeShell(shell: Shell)
	for _, cone in shell.cones do
		dropCone(cone)
	end
	table.clear(shell.cones)
	shell.part.Parent, shell.box.Visible = nil, false
	for _, decal in shell.decals do
		decal.Transparency = 1
	end
	shell.busy = false
end

local function dress(shell: Shell, block: Block)
	local part = shell.part
	part.Size, part.CFrame, part.Transparency = Vector3.one * S, block.frame, 0
	BlockArt.apply(part, block.texture)
	part.Parent = holder()
	shell.box.Visible = false
end

local function takeChip(): Chip?
	if Quality.reserve("debris", 1, Config.fx.qualityRuntime.debrisLeaseSeconds) == 0 then
		return nil
	end
	for _, chip in chips do
		if not chip.busy then
			chip.busy = true
			return chip
		end
	end
	if #chips >= (if lite() then DEBRIS // 2 else DEBRIS) then
		return nil
	end
	local part = Instance.new("Part")
	plain(part)
	part.Name = "SkillChip"
	local chip: Chip = {
		part = part,
		busy = true,
		pos = Vector3.zero,
		vel = Vector3.zero,
		axis = Vector3.xAxis,
		spin = 0,
		angle = 0,
		born = 0,
		life = 1,
		gravity = 0,
		size = Vector3.one,
		color = WHITE,
		toColor = nil,
		fade = 0.3,
		base = CFrame.identity,
	}
	table.insert(chips, chip)
	return chip
end

-- a flying piece; `texture` makes it a piece of the block itself, otherwise `material`/`color`
local function chip(
	now: number,
	at: CFrame,
	size: Vector3,
	vel: Vector3,
	life: number,
	gravity: number,
	look: {
		texture: string?,
		material: Enum.Material?,
		color: Color3?,
		toColor: Color3?,
		alpha: number?,
		axis: Vector3?,
		spin: number?,
	}
)
	local c = takeChip()
	if not c then
		return
	end
	local part = c.part
	if look.texture then
		BlockArt.apply(part, look.texture)
		part.Color = look.color or WHITE
	else
		part.MaterialVariant = ""
		part.Material, part.Color =
			look.material or Enum.Material.SmoothPlastic, look.color or WHITE
	end
	part.Size, part.CFrame, part.Transparency = size, at, look.alpha or 0
	part.Parent = holder()
	c.pos, c.vel, c.born, c.life, c.gravity, c.size = at.Position, vel, now, life, gravity, size
	c.axis = Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5).Unit
	c.spin, c.angle = (math.random() * 2 - 1) * 9, 0
	if look.axis then
		c.axis, c.spin = look.axis, look.spin or c.spin
	end
	c.color, c.toColor, c.fade = part.Color, look.toColor, look.alpha or 0
	c.base = at - at.Position
end

local function takeBall(): { part: Part, light: PointLight, busy: boolean }?
	for _, ball in balls do
		if not ball.busy then
			ball.busy = true
			return ball
		end
	end
	if #balls >= 16 then
		return nil
	end
	local part = Instance.new("Part")
	plain(part)
	part.Shape, part.Material, part.Name = Enum.PartType.Ball, Enum.Material.Neon, "SkillFlash"
	local light = Instance.new("PointLight")
	light.Shadows, light.Parent = false, part
	local ball = { part = part, light = light, busy = true }
	table.insert(balls, ball)
	return ball
end

-- a glowing ball that swells and fades (the light flash of a hit)
local function pop(
	now: number,
	position: Vector3,
	color: Color3,
	size: number,
	time: number,
	bright: number?
)
	local ball = takeBall()
	if not ball then
		return
	end
	local part, light = ball.part, ball.light
	part.Color, part.Position, part.Size, part.Transparency =
		color, position, Vector3.one * size * 0.35, 0.25
	-- the light of a hit stays local: a whole lit-up tunnel washes every block white [стенд 12.11]
	local glow = (bright or 0) * 0.35
	if glow > 0 and Quality.reserve("lights", 1, time) == 0 then
		glow = 0
	end
	light.Color, light.Range, light.Brightness = color, math.min(26, size * 1.8), glow
	light.Enabled = glow > 0
	part.Parent = holder()
	table.insert(tracks, function(t: number): boolean
		local k = math.clamp((t - now) / time, 0, 1)
		local e = 1 - (1 - k) ^ 3
		part.Size = Vector3.one * size * (0.35 + 0.65 * e)
		part.Transparency = 0.25 + 0.75 * k ^ 0.6
		light.Brightness = glow * (1 - k)
		if k >= 1 then
			part.Parent, ball.busy = nil, false
			return false
		end
		return true
	end)
end

-- a neon bar between two points (seams, spikes, light pillars)
local function bar(
	now: number,
	a: Vector3,
	b: Vector3,
	color: Color3,
	width: number,
	grow: number,
	life: number
)
	local length = (b - a).Magnitude
	if length < 0.05 then
		return
	end
	local slot
	for _, item in bars do
		if not item.busy then
			slot = item
			break
		end
	end
	if not slot then
		if #bars >= 24 then
			return
		end
		local part = Instance.new("Part")
		plain(part)
		part.Material, part.Name = Enum.Material.Neon, "SkillBar"
		slot = { part = part, busy = false }
		table.insert(bars, slot)
	end
	slot.busy = true
	local part = slot.part
	part.Color, part.Transparency = color, 0
	part.Parent = holder()
	table.insert(tracks, function(t: number): boolean
		local age = t - now
		local reach = math.clamp(age / math.max(grow, 1e-3), 0, 1)
		local fade = math.clamp((age - grow) / life, 0, 1)
		local l = math.max(0.05, length * (1 - (1 - reach) ^ 2))
		part.Size = Vector3.new(width * (1 - fade * 0.7), width * (1 - fade * 0.7), l)
		part.CFrame = CFrame.lookAt(a, b) * CFrame.new(0, 0, -l / 2)
		part.Transparency = fade
		if fade >= 1 then
			part.Parent, slot.busy = nil, false
			return false
		end
		return true
	end)
end

-- a glowing ring (a real ring: a cylinder adornment with an inner radius) that flies along `dir` and narrows — a
-- shock punching into the rock; seen end-on down a hole it reads as a target being driven in
local rings3d: { CylinderHandleAdornment } = {}
local function ring(
	now: number,
	at: Vector3,
	dir: Vector3,
	color: Color3,
	from: number,
	to: number,
	travel: number,
	life: number
)
	local slot
	for _, item in rings3d do
		if not item.Visible then
			slot = item
			break
		end
	end
	if not slot then
		if #rings3d >= 8 then
			return
		end
		slot = Instance.new("CylinderHandleAdornment")
		slot.Name, slot.AlwaysOnTop, slot.ZIndex = "SkillRing", false, 1
		slot.Parent = holder()
		table.insert(rings3d, slot)
	end
	local item = slot :: CylinderHandleAdornment
	item.Adornee, item.Color3, item.Height, item.Visible = root(), color, 0.25, true
	local base = CFrame.lookAt(at, at + dir)
	table.insert(tracks, function(t: number): boolean
		local k = math.clamp((t - now) / life, 0, 1)
		local e = 1 - (1 - k) ^ 2
		local r = from + (to - from) * e
		item.Radius, item.InnerRadius = r, r * 0.86
		item.CFrame = base + dir.Unit * travel * e
		item.Transparency = 0.1 + 0.9 * k
		if k >= 1 then
			item.Visible = false
			return false
		end
		return true
	end)
end

-- the skill's own icon over its effect for a moment: which skill fired is never a guess
local function tag(now: number, position: Vector3, icon: string)
	local slot
	for _, item in tags do
		if not item.busy then
			slot = item
			break
		end
	end
	if not slot then
		if #tags >= 4 then
			return
		end
		local gui = Instance.new("BillboardGui")
		gui.Name, gui.AlwaysOnTop, gui.LightInfluence = "SkillTag", true, 0
		gui.Size = UDim2.fromOffset(46, 46)
		local image = Instance.new("ImageLabel")
		image.BackgroundTransparency, image.AnchorPoint = 1, Vector2.new(0.5, 0.5)
		image.Position, image.Size = UDim2.fromScale(0.5, 0.5), UDim2.fromScale(1, 1)
		image.Parent = gui
		slot = { gui = gui, image = image, busy = false }
		table.insert(tags, slot)
	end
	slot.busy = true
	local gui, image = slot.gui, slot.image
	Candy.setIcon(image, icon)
	gui.Adornee, gui.Parent = root(), holder()
	table.insert(tracks, function(t: number): boolean
		local age = t - now
		local grow = math.clamp(age / 0.16, 0, 1)
		local scale = if grow < 1
			then 1.25 * math.sin(grow * math.pi * 0.62) / math.sin(math.pi * 0.62)
			else 1
		image.Size = UDim2.fromScale(scale, scale)
		gui.StudsOffsetWorldSpace = position + Vector3.new(0, 1.2 + math.min(age, 0.8) * 2.2, 0)
		image.ImageTransparency = math.clamp((age - 0.6) / 0.25, 0, 1)
		if age >= 0.85 then
			gui.Parent, slot.busy = nil, false
			return false
		end
		return true
	end)
end

-- ── particles: one attachment per burst from a small ring, emitters per look ─────────────────────────────────────
type Look = {
	texture: string,
	colors: { Color3 },
	size: NumberSequence,
	speed: NumberRange,
	life: NumberRange,
	light: number,
	drag: number?,
	accel: Vector3?,
	spread: number?,
}
local LOOKS: { [string]: Look } = {
	spark = {
		texture = SPARKLE,
		colors = { WHITE, hex("8BE1FF") },
		size = NumberSequence.new(0.9, 0),
		speed = NumberRange.new(14, 26),
		life = NumberRange.new(0.15, 0.3),
		light = 1,
		drag = 4,
	},
	ozone = {
		texture = SPARKLE,
		colors = { hex("CFF4FF"), hex("6FC8FF") },
		size = NumberSequence.new(0.35, 0),
		speed = NumberRange.new(1, 3),
		life = NumberRange.new(0.3, 0.6),
		light = 1,
		drag = 1,
	},
	gold = {
		texture = SPARKLE,
		colors = { hex("FFF6C2"), hex("FFC21A") },
		size = NumberSequence.new(0.8, 0.1),
		speed = NumberRange.new(10, 20),
		life = NumberRange.new(0.4, 0.8),
		light = 1,
		drag = 2,
		accel = Vector3.new(0, -26, 0),
	},
	fire = {
		texture = FIRE,
		colors = { hex("FFF1A8"), hex("FF6A2A"), hex("C0241A") },
		size = NumberSequence.new(2.6, 0.4),
		speed = NumberRange.new(6, 14),
		life = NumberRange.new(0.25, 0.45),
		light = 1,
		drag = 5,
	},
	ember = {
		texture = SPARKLE,
		colors = { hex("FFE08A"), hex("FF6A2A") },
		size = NumberSequence.new(0.45, 0),
		speed = NumberRange.new(14, 30),
		life = NumberRange.new(0.4, 0.9),
		light = 1,
		drag = 2,
		accel = Vector3.new(0, -30, 0),
	},
	smoke = {
		texture = SMOKE,
		colors = { hex("6B5A52"), hex("3A302C") },
		size = NumberSequence.new(2, 5),
		speed = NumberRange.new(2, 5),
		life = NumberRange.new(0.8, 1.3),
		light = 0,
		drag = 2,
		accel = Vector3.new(0, 3, 0),
	},
	dust = {
		texture = SMOKE,
		colors = { hex("C9B49A"), hex("8C7A66") },
		size = NumberSequence.new(1.2, 3.4),
		speed = NumberRange.new(2, 6),
		life = NumberRange.new(0.6, 1.1),
		light = 0,
		drag = 3,
		accel = Vector3.new(0, -2, 0),
	},
	pebble = {
		texture = SPARKLE,
		colors = { hex("8C7A66"), hex("5A4A3E") },
		size = NumberSequence.new(0.35, 0.25),
		speed = NumberRange.new(2, 6),
		life = NumberRange.new(0.6, 1),
		light = 0,
		drag = 0.5,
		accel = Vector3.new(0, -40, 0),
	},
	snow = {
		texture = SPARKLE,
		colors = { WHITE, hex("BDEFFF") },
		size = NumberSequence.new(0.6, 0),
		speed = NumberRange.new(5, 12),
		life = NumberRange.new(0.4, 0.8),
		light = 1,
		drag = 3,
		accel = Vector3.new(0, -8, 0),
	},
	mist = {
		texture = SMOKE,
		colors = { hex("F2FCFF"), hex("BDEFFF") },
		size = NumberSequence.new(1.6, 4.2),
		speed = NumberRange.new(1, 4),
		life = NumberRange.new(0.6, 1.1),
		light = 0.3,
		drag = 2,
		accel = Vector3.new(0, -1.5, 0),
	},
}
local rings: { [string]: { list: { { at: Attachment, emitter: ParticleEmitter } }, next: number } } =
	{}
local function emit(name: string, position: Vector3, count: number)
	if count < 1 then
		return
	end
	local ring = rings[name]
	if not ring then
		ring = { list = {}, next = 1 }
		rings[name] = ring
	end
	local item = ring.list[ring.next]
	if not item then
		local look = LOOKS[name]
		local at = Instance.new("Attachment")
		at.Parent = root()
		local e = Instance.new("ParticleEmitter")
		e.Texture, e.Enabled, e.LightEmission, e.LightInfluence = look.texture, false, look.light, 0
		local c = look.colors
		e.Color = if #c == 1
			then ColorSequence.new(c[1])
			elseif #c == 2 then ColorSequence.new(c[1], c[2])
			else ColorSequence.new({
				ColorSequenceKeypoint.new(0, c[1]),
				ColorSequenceKeypoint.new(0.5, c[2]),
				ColorSequenceKeypoint.new(1, c[3]),
			})
		e.Size, e.Speed, e.Lifetime = look.size, look.speed, look.life
		e.SpreadAngle = Vector2.new(look.spread or 180, look.spread or 180)
		e.Rotation, e.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-180, 180)
		e.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(1, 1),
		})
		e.Drag, e.Acceleration = look.drag or 3, look.accel or Vector3.zero
		e.Parent = at
		item = { at = at, emitter = e }
		ring.list[ring.next] = item
	end
	ring.next = ring.next % 8 + 1
	item.at.WorldPosition = position
	local scale = if lite() then 0.5 else 1
	item.emitter:Emit(
		Quality.reserve(
			"particles",
			math.max(1, math.floor(count * scale + 0.5)),
			item.emitter.Lifetime.Max
		)
	)
end

-- ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────
local function key(point: any): string
	return point.x .. "|" .. point.y .. "|" .. point.dRel
end
local function face(block: Block): Vector3
	return block.frame:PointToWorldSpace(Vector3.new(0, 0, S / 2))
end
local function flash(color: Color3, strength: number)
	local f = extras.flash
	if f and not calm() then
		f(color, strength)
	end
end
local function shake(amount: number, frequency: number, decay: number)
	local f = extras.trauma
	if f then
		f(amount, frequency, decay)
	end
end
local function bolt(a: Vector3, b: Vector3, branch: boolean, style: any)
	local f = extras.bolt
	if f then
		f(a, b, branch, style)
	end
end
local function after(now: number, at: number, fn: (number) -> ())
	local done = false
	table.insert(tracks, function(t: number): boolean
		if not done and t >= now + at then
			done = true
			fn(t)
		end
		return not done
	end)
end
local function sound(name: string, gain: number, pitch: number?)
	Sfx.play(name, gain, pitch)
end
local function nominal(family: string, rarity: string): number
	local perk = Config.families[family].perks[rarity]
	return perk and perk.size or 0
end

-- ── frozen cells (frost status) ──────────────────────────────────────────────────────────────────────────────────
-- the ice lives ON the block part (a glaze box + spike adornments), so it moves with the wall for free; it is re-checked
-- every frame against the renderer, so a pooled part reused for another cell never carries someone else's ice
type Ice = {
	part: BasePart,
	cell: any,
	box: SelectionBox,
	cones: { ConeHandleAdornment },
	color: Color3,
	born: number,
}
local frozen: { [number]: Ice } = {}
local frontOf = 0

local SPIKES = {
	{ Vector3.new(-1.4, 1.2, 0), Vector3.new(-0.5, 0.6, 1) },
	{ Vector3.new(1.3, -0.9, 0), Vector3.new(0.6, -0.4, 1) },
	{ Vector3.new(0.2, 1.7, 0), Vector3.new(0.1, 1, 0.6) },
	{ Vector3.new(-0.6, -1.5, 0), Vector3.new(-0.3, -0.7, 1) },
}
local function glaze(box: SelectionBox, adornee: BasePart, strength: number)
	box.Adornee = adornee
	box.Color3, box.SurfaceColor3 = hex("EAFBFF"), hex("A9E6FF")
	box.LineThickness = 0.07
	box.SurfaceTransparency = 1 - 0.32 * strength
	box.Transparency = 1 - strength
	box.Visible = strength > 0
end
-- ice spikes on the face towards the player (+Z of the block frame)
local function spikes(adornee: BasePart, list: { ConeHandleAdornment }, count: number, seed: number)
	for i = 1, count do
		local cone = takeCone()
		if not cone then
			return
		end
		local spot = SPIKES[(seed + i) % #SPIKES + 1]
		local base = Vector3.new(spot[1].X, spot[1].Y, S / 2 - 0.15)
		cone.Adornee = adornee
		cone.CFrame = CFrame.lookAt(base, base + spot[2].Unit)
		cone.Color3, cone.Transparency = hex("E4F8FF"), 0.12
		cone.Radius, cone.Height = 0.42 + (seed + i) % 3 * 0.1, 0
		cone:SetAttribute("Full", 1.3 + (seed * 7 + i * 3) % 5 * 0.22)
		cone.Visible = true
		table.insert(list, cone)
	end
end
local function growSpikes(now: number, list: { ConeHandleAdornment }, time: number)
	table.insert(tracks, function(t: number): boolean
		local k = math.clamp((t - now) / time, 0, 1)
		local over = 1 + 0.25 * math.sin(k * math.pi)
		for _, cone in list do
			if cone.Visible then
				cone.Height = (cone:GetAttribute("Full") or 1.4) * k * over
			end
		end
		return k < 1
	end)
end

local function thaw(entry: Ice)
	if entry.part.Parent then
		entry.part.Color = entry.color
	end
	entry.box.Visible, entry.box.Adornee = false, nil
	entry.box.Parent = nil
	for _, cone in entry.cones do
		dropCone(cone)
	end
end

local function freezeCell(now: number, cell: any, part: BasePart, quiet: boolean)
	local box = Instance.new("SelectionBox")
	box.Parent = holder()
	local entry: Ice =
		{ part = part, cell = cell, box = box, cones = {}, color = part.Color, born = now }
	part.Color = part.Color:Lerp(hex(Config.families.frost.color), 0.3)
	glaze(box, part, 0)
	spikes(part, entry.cones, if lite() then 2 else 3, cell.x * 3 + cell.y * 5 + cell.d)
	frozen[State.cellKey(cell.x, cell.y, cell.d)] = entry
	growSpikes(now, entry.cones, 0.2)
	table.insert(tracks, function(t: number): boolean
		local k = math.clamp((t - now) / 0.2, 0, 1)
		if box.Adornee then
			glaze(box, part, k)
		end
		return k < 1
	end)
	if not quiet then
		local p = part.CFrame:PointToWorldSpace(Vector3.new(0, 0, S / 2))
		emit("snow", p, 8)
		emit("mist", p, 2)
		sound("crit_soft", 0.22, 1.9)
	end
end

function FamilyFx.frozen(cells: { any }, front: number?)
	frontOf = front or frontOf
	local now = os.clock()
	local keep = {}
	for _, cell in cells do
		local depth = cell.d or (frontOf + (cell.dRel or 0))
		local absolute = { x = cell.x, y = cell.y, d = depth }
		local k = State.cellKey(cell.x, cell.y, depth)
		keep[k] = true
		local entry = frozen[k]
		local part = locate(absolute, nil)
		if entry and entry.part ~= part then
			thaw(entry)
			frozen[k], entry = nil, nil
		end
		if not entry and part then
			freezeCell(now, absolute, part, false)
		end
	end
	for k, entry in frozen do
		if not keep[k] then
			thaw(entry)
			frozen[k] = nil
		end
	end
end

-- ── shells: the struck blocks themselves ─────────────────────────────────────────────────────────────────────────
type Struck = {
	shell: Shell,
	block: Block,
	at: number,
	burst: number,
	extra: boolean,
	rank: number,
	iced: boolean?,
}

local function crackFaces(shell: Shell, block: Block, stage: number)
	local set = STAGES[1 + (block.x * 7 + block.y * 3 + block.depth) % #STAGES]
	local n = 0
	for _, f in block.faces do
		n += 1
		local decal = shell.decals[n]
		if not decal then
			break
		end
		decal.Face, decal.Texture, decal.Color3 = f, set[math.clamp(stage, 1, #set)], WHITE
		decal.Transparency = 0
	end
end

-- ═════════════════════════════════════ STORM ═════════════════════════════════════
local CHAIN = {
	core = 0.15,
	halo = 0.55,
	color = hex("6FD2FF"),
	life = 0.2,
	jag = 0.4,
	pieces = 7,
	forks = 2,
}
local FORK = {
	core = 0.09,
	halo = 0.36,
	color = hex("B9A4FF"),
	coreColor = hex("F4EEFF"),
	life = 0.2,
	jag = 0.45,
	pieces = 5,
	forks = 0,
}
local SKY = {
	core = 0.26,
	halo = 1,
	color = hex("9FE6FF"),
	life = 0.32,
	jag = 0.3,
	pieces = 10,
	forks = 3,
}

local function sky(block: Block): Vector3
	return block.frame:PointToWorldSpace(Vector3.new((math.random() - 0.5) * 3, S * 3.4, S * 0.8))
end

local function stormPlay(now: number, event: any, struck: { Struck })
	local forced = bit32.btest(event.flags or 0, FxFlags.stormForced)
	local gold = level("storm", SKILL.storm.coins)
	local from: Vector3 = event.origin or (struck[1] and face(struck[1].block))
	local main: { Struck } = {}
	for _, s in struck do
		if not s.extra then
			table.insert(main, s)
		end
	end
	for i, s in struck do
		local shell, block = s.shell, s.block
		after(now, s.at, function(t: number)
			local target = face(block) + Vector3.new(0, (math.random() - 0.5) * 1.4, 0)
			if s.extra then
				-- «Цепь молний»: the extra blocks are taken by forks off the nearest struck block
				local best, distance = main[#main], math.huge
				for _, m in main do
					local d = (m.block.frame.Position - block.frame.Position).Magnitude
					if d < distance then
						best, distance = m, d
					end
				end
				bolt(if best then face(best.block) else from, target, false, FORK)
			elseif i == 1 and forced then
				bolt(sky(block), target, true, SKY)
				pop(t, target, hex("DFF7FF"), 4, 0.18, 3)
				emit("spark", target, 22)
			else
				bolt(from, target, i == 1, CHAIN)
			end
			if not s.extra then
				from = target
			end
			-- white-hot for a blink (the texture still shows through), then the blue crackle around its edges
			shell.box.Adornee, shell.box.Visible = shell.part, true
			shell.box.Color3 = if s.extra then hex("D2C4FF") else hex("B8F0FF")
			shell.box.SurfaceColor3 = hex("F2FCFF")
			shell.box.LineThickness, shell.box.SurfaceTransparency, shell.box.Transparency =
				0.1, 0.12, 0
			emit("spark", target, if s.extra then 5 else 8)
		end)
		table.insert(tracks, function(t: number): boolean
			local age = t - (now + s.at)
			if age < 0 then
				return true
			end
			if age >= 0.04 then
				shell.part.Color = hex("C4EEFF")
				shell.box.SurfaceColor3 = if s.extra then hex("B9A4FF") else hex("8BE1FF")
				shell.box.SurfaceTransparency = 0.6
				shell.box.Visible = math.floor(age / 0.026) % 2 == 0
			end
			if t >= now + s.burst then
				local center = block.frame.Position
				emit("spark", face(block), 8)
				emit("ozone", face(block), 4)
				if gold > 0 then
					-- «Золотая искра»: the coins of this block, as gold sparks
					emit("gold", face(block), 3 + gold)
				end
				pop(t, center, if gold > 0 then hex("FFE58A") else hex("BDEFFF"), 3, 0.14)
				freeShell(shell)
				return false
			end
			return true
		end)
	end
	sound("bolt_soft", if forced then 0.6 else 0.5, if forced then 0.85 else 1.08)
	after(now, 0.05, function()
		sound("crit_soft", 0.22, 1.7)
	end)
	if gold > 0 then
		after(now, struck[#struck] and struck[#struck].burst or 0.2, function()
			sound("coin", 0.35, 1.3)
		end)
	end
	flash(hex("BDEFFF"), if forced then 0.16 else 0.1)
	shake(if forced then 0.32 else 0.2, 34, 3.2)
end

local function stormPlan(event: any, list: { Struck })
	local forced = bit32.btest(event.flags or 0, FxFlags.stormForced)
	local base = if forced then 0.06 else 0.02
	local main = 0
	for _, s in list do
		if not s.extra then
			main += 1
		end
	end
	local step = math.min(0.024, 0.22 / math.max(1, main - 1))
	local last = base
	local j = 0
	for _, s in list do
		if not s.extra then
			s.at = base + s.rank * step
			last = s.at
		end
	end
	for _, s in list do
		if s.extra then
			j += 1
			s.at = last + 0.04 + (j - 1) * 0.022
		end
		s.burst = s.at + 0.11
	end
end

-- ═════════════════════════════════════ DYNAMITE ═════════════════════════════════════
local FUSE = 0.14

local function centerOf(list: { Struck }): Vector3
	local sum, n = Vector3.zero, 0
	for _, s in list do
		sum += s.block.frame.Position
		n += 1
	end
	return if n > 0 then sum / n else Vector3.zero
end

local function scorch(now: number, list: { Struck })
	-- the surviving neighbours of the blast go dark for a moment and cool down: the blast had an edge
	local blasted, seen = {}, {}
	for _, s in list do
		blasted[State.cellKey(s.block.x, s.block.y, s.block.depth)] = true
	end
	local parts = {}
	for _, s in list do
		for _, o in { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 1, 0 }, { 0, -1, 0 }, { 0, 0, 1 } } do
			local cell = { x = s.block.x + o[1], y = s.block.y + o[2], d = s.block.depth + o[3] }
			local k = State.cellKey(cell.x, cell.y, cell.d)
			if not blasted[k] and not seen[k] then
				seen[k] = true
				local part = locate(cell, nil)
				if part and part.Color == WHITE and part:GetAttribute("ChestTier") == nil then
					table.insert(parts, part)
				end
			end
		end
	end
	if #parts == 0 then
		return
	end
	local dark = hex("5C4438")
	table.insert(tracks, function(t: number): boolean
		local age = t - now
		local k = if age < 0.06 then age / 0.06 else math.max(0, 1 - (age - 0.06) / 1.3)
		local color = WHITE:Lerp(dark, 0.55 * k)
		for _, part in parts do
			if part.Parent and part.Color ~= color then
				part.Color = color
			end
		end
		return age < 1.36
	end)
end

local function detonate(now: number, list: { Struck }, power: number, secondary: boolean)
	if #list == 0 then
		return
	end
	local center = centerOf(list)
	local front = list[1].block.frame
	local toward = front.LookVector * -1 -- +Z of the wall frame: towards the player
	pop(
		now,
		center + toward * 1.5,
		hex("FFE6A8"),
		(5 + power * 4) * (if secondary then 0.7 else 1),
		0.22,
		2.2
	)
	pop(now, center, hex("FF6A2A"), (8 + power * 6) * (if secondary then 0.7 else 1), 0.4)
	emit("fire", center + toward * 2, math.floor(16 * power + 6))
	emit("ember", center + toward * 2, math.floor(18 * power + 8))
	emit("smoke", center + toward * 1, math.floor(6 * power + 3))
	local perShell = if lite() then 2 else 3
	for _, s in list do
		local block = s.block
		local p = block.frame.Position
		local out = p - center
		out = if out.Magnitude < 0.5 then toward else out.Unit
		out = (out + toward * 0.55).Unit
		for c = 1, perShell do
			local size = Vector3.one * (1.7 + math.random() * 1.1)
			local offset = Vector3.new(
				math.random() - 0.5,
				math.random() - 0.5,
				math.random() - 0.5
			) * 2.4
			local speed = 20 + math.random() * 16 + power * 8
			chip(
				now,
				CFrame.new(p + offset) * CFrame.Angles(math.random() * 6, math.random() * 6, 0),
				size,
				out * speed + Vector3.new(0, 8 + math.random() * 10, 0) + offset * 2,
				0.55 + math.random() * 0.25 + c * 0.02,
				70,
				{ texture = block.texture, color = hex("FFC08A"), toColor = hex("3A2A22") }
			)
		end
		if s.rank % 3 == 0 then
			emit("fire", face(block), 3)
		end
		freeShell(s.shell)
	end
	sound("heavy_hit", if secondary then 0.5 else 0.75, if secondary then 0.9 else 0.7)
	sound("ult_whump", if secondary then 0.3 else 0.5, if secondary then 1.5 else 1.25)
	flash(hex("FF8A3A"), if secondary then 0.1 else 0.18)
	shake(if secondary then 0.3 else 0.42 + 0.12 * power, 17, 1.6)
end

local function dynamitePlay(now: number, _event: any, struck: { Struck })
	local main, extra = {}, {}
	for _, s in struck do
		table.insert(if s.extra then extra else main, s)
	end
	local center = centerOf(main)
	local fuse = if struck[1] then face(struck[1].block) else center
	local power = math.clamp(#main / 20, 0.3, 1.2)
	-- the fuse: a spitting spark at the hit, the blast blocks heat up and tremble
	table.insert(tracks, function(t: number): boolean
		local age = t - now
		if age < FUSE then
			emit("ember", fuse, 1)
			local k = age / FUSE
			for _, s in struck do
				if s.shell.busy and s.at >= FUSE then
					local heat = k * k * (if s.extra then 0.5 else 1)
					local jitter = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0)
						* 0.14
						* heat
					s.shell.part.CFrame = s.block.frame + jitter
					s.shell.part.Size = Vector3.one * (S + 0.35 * heat)
					s.shell.part.Color = WHITE:Lerp(hex("FF7A2A"), heat * 0.75)
					s.shell.box.Adornee, s.shell.box.Visible = s.shell.part, true
					s.shell.box.Color3, s.shell.box.SurfaceColor3 = hex("FFB04A"), hex("FF6A2A")
					s.shell.box.LineThickness, s.shell.box.Transparency = 0.05, 1 - heat
					s.shell.box.SurfaceTransparency = 1 - 0.5 * heat
				end
			end
			return true
		end
		return false
	end)
	sound("crit_soft", 0.25, 0.6)
	after(now, FUSE, function(t: number)
		detonate(t, main, power, false)
		scorch(t, main)
	end)
	if #extra > 0 then
		-- «Заряд»: what the bigger charge adds goes off on its own, a beat later
		local extraTime = extra[1].burst
		table.insert(tracks, function(t: number): boolean
			local age = t - now
			if age >= FUSE and age < extraTime then
				local k = (age - FUSE) / (extraTime - FUSE)
				for _, s in extra do
					if s.shell.busy then
						s.shell.part.Color = WHITE:Lerp(hex("FF5A1A"), k)
						s.shell.part.Size = Vector3.one * (S + 0.4 * k)
						s.shell.part.CFrame = s.block.frame
							+ Vector3.new(math.random() - 0.5, math.random() - 0.5, 0)
								* 0.18
								* k
					end
				end
			end
			return age < extraTime
		end)
		after(now, extraTime, function(t: number)
			detonate(t, extra, math.clamp(#extra / 14, 0.25, 0.8), true)
		end)
	end
end

local function dynamitePlan(_event: any, list: { Struck })
	for _, s in list do
		if s.extra then
			s.at, s.burst = 0.3, 0.3
		else
			s.at, s.burst = FUSE, FUSE
		end
	end
end

-- ═════════════════════════════════════ RIFT (quake) ═════════════════════════════════════
-- [владелец 12.11: «Разлом как будто хуже всего»] not a block cut in two any more: the ROCK moves. A low thud, the crack
-- crawls out over the face — onto the blocks that survive too, and stays on them for a while — then block after
-- block heaves up under the pressure and collapses: heavy rubble drops to the floor in a dust cloud, slow and weighty.
local SEAM = hex("FFA51C")
local CRACK = {
	core = 0.13,
	halo = 0.55,
	color = hex("FF7A12"),
	coreColor = hex("FFE2A6"),
	life = 0.95,
	jag = 0.3,
	pieces = 6,
	forks = 1,
	steady = true,
}

-- neighbours of the struck set that survive (same layer around them, and right behind them)
local function survivors(list: { Struck }): { any }
	local hit, out, seen = {}, {}, {}
	for _, s in list do
		hit[State.cellKey(s.block.x, s.block.y, s.block.depth)] = true
	end
	for _, s in list do
		local b = s.block
		for _, o in { { 1, 0, 0 }, { -1, 0, 0 }, { 0, 1, 0 }, { 0, -1, 0 }, { 0, 0, 1 } } do
			local cell = { x = b.x + o[1], y = b.y + o[2], d = b.depth + o[3] }
			local k = State.cellKey(cell.x, cell.y, cell.d)
			if not hit[k] and not seen[k] then
				seen[k] = true
				local part = locate(cell, nil)
				if part and part:GetAttribute("ChestTier") == nil then
					table.insert(out, { cell = cell, part = part })
				end
			end
		end
	end
	return out
end

-- a crack left on a surviving block: a crack decal on its face that fades out (dropped at once if the part moves on)
local function scar(now: number, cell: any, part: BasePart, stage: number, life: number)
	local decal = Instance.new("Decal")
	local set = STAGES[1 + (cell.x * 7 + cell.y * 3 + cell.d) % #STAGES]
	decal.Face, decal.Texture, decal.ZIndex = Enum.NormalId.Back, set[math.clamp(stage, 1, #set)], 3
	decal.Color3, decal.Transparency, decal.Parent = hex("2A1A10"), 0, part
	table.insert(tracks, function(t: number): boolean
		local k = (t - now) / life
		if k >= 1 or locate(cell, nil) ~= part then
			decal:Destroy()
			return false
		end
		decal.Transparency = math.max(0, (k - 0.5) / 0.5)
		return true
	end)
end

local function crackLines(block: Block, from: Vector3?)
	local frame = block.frame
	local z = S / 2 + 0.12
	local center = frame:PointToWorldSpace(
		Vector3.new((math.random() - 0.5) * 1.2, (math.random() - 0.5) * 1.2, z)
	)
	if from then
		bolt(from, center, false, CRACK)
	end
	local angle = math.random() * math.pi * 2
	local edge = frame:PointToWorldSpace(
		Vector3.new(math.cos(angle) * S * 0.5, math.sin(angle) * S * 0.5, z)
	)
	bolt(center, edge, true, CRACK)
end

-- the block gives way: four heavy pieces drop to the floor and tumble slowly, dust rolls out at the bottom
local function split(now: number, s: Struck, strength: number)
	local block = s.block
	local frame = block.frame
	local q = S / 2 - 0.08
	for _, o in { { -1, -1 }, { 1, -1 }, { -1, 1 }, { 1, 1 } } do
		local at = frame
			* CFrame.new(o[1] * S / 4, o[2] * S / 4, 0)
			* CFrame.Angles(0, 0, (math.random() - 0.5) * 0.3)
		local push = frame:VectorToWorldSpace(
			Vector3.new(
				o[1] * (1.5 + math.random() * 1.5),
				1 + (o[2] + 1) * 1.5,
				2 + math.random() * 2 + strength
			)
		)
		chip(now, at, Vector3.new(q, q, S - 0.4), push, 0.85 + math.random() * 0.15, 70, {
			texture = block.texture,
			color = hex("D8C7B2"),
			toColor = hex("8A7766"),
			axis = frame.RightVector * o[2] + frame.LookVector * o[1] * 0.4,
			spin = 1.4 + math.random(),
		})
	end
	local bottom = frame:PointToWorldSpace(Vector3.new(0, -S / 2 + 0.5, S / 2))
	emit("dust", bottom, 7)
	emit("dust", face(block), 3)
	emit("pebble", face(block), 6)
	freeShell(s.shell)
end

local function riftPlay(now: number, event: any, struck: { Struck })
	local first = struck[1]
	if not first then
		return
	end
	local origin: Vector3 = event.origin or face(first.block)
	-- the thud and the rumble come first: the rock is about to move
	shake(0.32, 8, 0.75)
	sound("ult_thud", 0.6, 0.62)
	emit("dust", face(first.block), 5)
	-- the crack crawls out over the face, onto the blocks that will survive, and stays on them
	local around = survivors(struck)
	for n, item in around do
		if n > 10 then
			break
		end
		local target = item.part.CFrame:PointToWorldSpace(
			Vector3.new((math.random() - 0.5) * 3, (math.random() - 0.5) * 3, S / 2 + 0.1)
		)
		after(now, 0.04 + n * 0.025, function(t: number)
			bolt(origin, target, n % 3 == 0, CRACK)
			scar(t, item.cell, item.part, 6 + n % 3, 1.8)
		end)
	end
	local ordered = table.clone(struck)
	table.sort(ordered, function(a, b)
		return a.at < b.at
	end)
	local last, knocks = origin, 0
	for _, s in ordered do
		local from = last
		after(now, s.at, function()
			crackLines(s.block, if s.extra then nil else from)
		end)
		if not s.extra then
			last = face(s.block)
		end
	end
	for _, s in struck do
		local shell, block = s.shell, s.block
		table.insert(tracks, function(t: number): boolean
			local age = t - (now + s.at)
			if age < 0 then
				return shell.busy
			end
			if not shell.busy then
				return false
			end
			-- the heave: pushed up and tipped by the pressure, grinding, the seams glowing hotter
			local k = math.clamp(age / (s.burst - s.at), 0, 1)
			local lift = (1 - (1 - k) ^ 3) * 0.7
			local grind = (math.random() - 0.5) * 0.12
			shell.part.CFrame = block.frame
				* CFrame.new(grind, lift, lift * 0.3)
				* CFrame.Angles(-lift * 0.12, 0, (if block.x % 2 == 0 then 1 else -1) * lift * 0.06)
			crackFaces(shell, block, 4 + math.floor(k * 6))
			shell.part.Color = WHITE:Lerp(hex("BFA992"), k)
			shell.box.Adornee, shell.box.Visible = shell.part, true
			shell.box.Color3, shell.box.LineThickness, shell.box.Transparency =
				SEAM, 0.08, 0.6 - 0.5 * k
			shell.box.SurfaceTransparency = 1
			if t >= now + s.burst then
				split(t, s, if s.extra then 2 else 1)
				if knocks < 5 then
					knocks += 1
					sound("depth_knock", 0.34, 0.55 + knocks * 0.03)
					shake(0.14, 7, 1)
				end
				return false
			end
			return true
		end)
	end
	local lastBurst = 0
	local extraAt: number? = nil
	for _, s in struck do
		lastBurst = math.max(lastBurst, s.burst)
		if s.extra then
			extraAt = math.min(extraAt or math.huge, s.at)
		end
	end
	if extraAt then
		-- «Трещина»: the extra blocks go in an aftershock, a second, harder thump
		after(now, extraAt, function()
			shake(0.42, 6, 0.9)
			sound("ult_thud", 0.55, 0.52)
		end)
	end
	after(now, lastBurst + 0.1, function()
		emit("dust", face(first.block), 6)
		sound("plate_hit", 0.3, 0.5)
	end)
end

local function riftPlan(_event: any, list: { Struck })
	-- the quake runs from the hit outwards: nearest first, then deeper, one heavy beat per block
	local order = table.clone(list)
	local o = list[1] and list[1].block
	local function score(a: Struck): number
		return (a.block.depth - (o and o.depth or 0)) * 10
			+ math.abs(a.block.x - (o and o.x or 0))
			+ math.abs(a.block.y - (o and o.y or 0))
	end
	table.sort(order, function(a, b)
		if a.extra ~= b.extra then
			return not a.extra
		end
		return score(a) < score(b)
	end)
	local main = 0
	for _, s in order do
		if not s.extra then
			main += 1
		end
	end
	local step = math.min(0.07, 0.5 / math.max(1, main))
	local lastMain, j = 0.1, 0
	for r, s in order do
		if not s.extra then
			s.at = 0.1 + (r - 1) * step
			s.burst = s.at + 0.2
			lastMain = s.burst
		end
	end
	for _, s in order do
		if s.extra then
			s.at = lastMain + 0.15 + j * 0.03
			s.burst = s.at + 0.18
			j += 1
		end
	end
end

-- ═════════════════════════════════════ FROST ═════════════════════════════════════
-- [владелец 12.11: «лёд не понятен, быстро появляется и быстро исчезает»] slower and readable: the ice creeps over the
-- blocks one by one, everything holds and creaks with white cracks running over the ice, then it all goes at once;
-- the shards fall slowly and frost stays on the surviving neighbours for a while.
local ICECRACK = {
	core = 0.08,
	halo = 0.32,
	color = hex("BDEFFF"),
	coreColor = WHITE,
	life = 0.4,
	jag = 0.35,
	pieces = 4,
	forks = 1,
	steady = true,
}

-- frost left on a surviving block: a pale glaze that thaws away
local function rime(now: number, cell: any, part: BasePart, life: number)
	local box = Instance.new("SelectionBox")
	box.Parent = holder()
	table.insert(tracks, function(t: number): boolean
		local k = (t - now) / life
		if k >= 1 or locate(cell, nil) ~= part then
			box:Destroy()
			return false
		end
		glaze(box, part, if k < 0.1 then k / 0.1 * 0.7 else 0.7 * (1 - (k - 0.1) / 0.9))
		return true
	end)
end

local function shatter(now: number, list: { Struck }, strength: number)
	if #list == 0 then
		return
	end
	local center = centerOf(list)
	local per = if lite() then 3 else 6
	for _, s in list do
		local block = s.block
		local p = face(block)
		local out = p - center
		out = if out.Magnitude < 0.5 then block.frame.LookVector * -1 else out.Unit
		for _ = 1, per do
			local size = Vector3.new(
				0.3 + math.random() * 0.3,
				1 + math.random() * 1.3,
				0.5 + math.random() * 0.7
			)
			local offset = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * 3.6
			chip(
				now,
				CFrame.new(p + offset)
					* CFrame.Angles(math.random() * 6, math.random() * 6, math.random() * 6),
				size,
				(out + block.frame.LookVector * -0.7).Unit * (14 + math.random() * 12)
					+ Vector3.new(0, 6, 0),
				0.7 + math.random() * 0.3,
				48,
				{ material = Enum.Material.Glass, color = hex("D7F4FF"), alpha = 0.1 }
			)
		end
		emit("snow", p, 7)
		freeShell(s.shell)
	end
	emit("mist", center + list[1].block.frame.LookVector * -2, math.floor(5 + 5 * strength))
	pop(now, center, hex("F2FCFF"), 5 + 5 * strength, 0.2, 1.2)
	-- the frost nova: a white ring races out over the wall from the centre of the shatter
	local normal = list[1].block.frame.LookVector * -1
	ring(now, center + normal * 2.8, normal, WHITE, S * 0.6, S * (2.4 + 2 * strength), 0, 0.3)
	ring(
		now + 0.03,
		center + normal * 2.7,
		normal,
		hex("8FDBFF"),
		S * 0.4,
		S * (1.8 + 1.6 * strength),
		0,
		0.36
	)
	sound("plate_break", 0.55 * (0.6 + 0.4 * strength), 1.6)
	sound("heavy_hit", 0.35, 1.7)
	sound("break_soft", 0.5, 1.4)
	flash(hex("CFF3FF"), 0.16 * strength)
	shake(0.34 * strength + 0.1, 24, 2)
end

local function frostPlay(now: number, _event: any, struck: { Struck })
	local main, extra = {}, {}
	local snap = 0
	for _, s in struck do
		table.insert(if s.extra then extra else main, s)
		if not s.extra then
			snap = s.burst
		end
		local shell = s.shell
		if s.iced then
			-- it was frozen: it starts iced, exactly as the player saw it
			glaze(shell.box, shell.part, 1)
			spikes(
				shell.part,
				shell.cones,
				if lite() then 2 else 3,
				s.block.x * 3 + s.block.y * 5 + s.block.depth
			)
			for _, cone in shell.cones do
				cone.Height = cone:GetAttribute("Full") or 1.4
			end
			shell.part.Color = WHITE:Lerp(hex(Config.families.frost.color), 0.3)
		else
			-- the ice creeps over it: the glaze thickens and the spikes grow out
			after(now, s.at, function(t: number)
				if not shell.busy then
					return
				end
				spikes(
					shell.part,
					shell.cones,
					if lite() then 1 else 2,
					s.block.x + s.block.y + s.block.depth
				)
				growSpikes(t, shell.cones, 0.12)
				emit("snow", face(s.block), 3)
				emit("mist", face(s.block), 1)
				table.insert(tracks, function(t2: number): boolean
					local k = math.clamp((t2 - t) / 0.12, 0, 1)
					if shell.busy then
						glaze(shell.box, shell.part, k)
						shell.part.Color = WHITE:Lerp(hex(Config.families.frost.color), 0.3 * k)
					end
					return k < 1 and shell.busy
				end)
			end)
		end
	end
	-- the hold: everything iced creaks — white cracks run over the ice, the blocks tremble, then the snap
	for n, s in main do
		if n > 8 then
			break
		end
		after(now, snap - 0.13 + n * 0.008, function()
			local f = face(s.block)
			bolt(
				f + Vector3.new(-1.8, 1.5, 0.15),
				f + Vector3.new(1.6 * (if n % 2 == 0 then 1 else -1), -1.7, 0.15),
				true,
				ICECRACK
			)
		end)
	end
	after(now, snap - 0.13, function()
		sound("crit_soft", 0.32, 2.2)
	end)
	table.insert(tracks, function(t: number): boolean
		local age = t - now
		if age >= snap - 0.1 and age < snap then
			-- the ice charges: it trembles and goes bright white for the last moment, then breaks
			local k = (age - (snap - 0.1)) / 0.1
			for _, s in main do
				if s.shell.busy then
					s.shell.part.CFrame = s.block.frame
						+ Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * 0.14
					s.shell.box.SurfaceColor3 = hex("A9E6FF"):Lerp(WHITE, k)
					s.shell.box.SurfaceTransparency = 0.5 - 0.42 * k
					s.shell.box.LineThickness = 0.12
				end
			end
		end
		return age < snap
	end)
	sound("crit_soft", 0.26, 1.9)
	after(now, snap, function(t: number)
		shatter(t, main, math.clamp(#main / 16, 0.4, 1))
		for n, item in survivors(main) do
			if n > 12 then
				break
			end
			rime(t, item.cell, item.part, 1.8)
		end
	end)
	if #extra > 0 then
		-- «Иней»: the rime creeps on past the shattered blocks and takes the extra ones in a second crackle
		after(now, extra[1].burst, function(t: number)
			shatter(t, extra, math.clamp(#extra / 12, 0.3, 0.7))
		end)
	end
end

local function frostPlan(_event: any, list: { Struck })
	-- the ice spreads from the frozen blocks: the iced ones are ready, the others freeze one after another
	local k = 0
	for _, s in list do
		if not s.extra and not s.iced then
			k += 1
		end
	end
	local step = math.min(0.025, 0.18 / math.max(1, k))
	local lastFreeze, n = 0, 0
	for _, s in list do
		if not s.extra then
			s.at = if s.iced then 0 else 0.03 + n * step
			if not s.iced then
				n += 1
			end
			lastFreeze = math.max(lastFreeze, s.at)
		end
	end
	local snap = math.clamp(lastFreeze + 0.12 + 0.16, 0.34, 0.5)
	local j = 0
	for _, s in list do
		if s.extra then
			s.at = snap + 0.04 + math.min(j * 0.015, 0.12)
			s.burst = snap + 0.24
			j += 1
		else
			s.burst = snap
		end
	end
end

local PLANS = { storm = stormPlan, dynamite = dynamitePlan, rift = riftPlan, frost = frostPlan }
local PLAYS = { storm = stormPlay, dynamite = dynamitePlay, rift = riftPlay, frost = frostPlay }
local GRAINS = { storm = true, dynamite = true, rift = false, frost = true }

-- ── the controller's entry points ────────────────────────────────────────────────────────────────────────────────

function FamilyFx.configure(
	find: (any, number?) -> BasePart?,
	result: (any) -> (),
	text: (string) -> (),
	more: Extras?
)
	locate, showResult, notice = find, result, text
	extras = more or {}
end

-- A perk: called BEFORE the controller breaks the blocks. `snapshot(point)` gives the block as it stood. Returns, per
-- point key, when its grains start (seconds from now) and whether this family uses grains at all; points missing
-- from the plan (pool full, no snapshot) break at once as usual.
function FamilyFx.perk(event: any, snapshot: (any) -> Block?): Plan
	local plan: Plan = {}
	local family = event.family
	local play, prepare = PLAYS[family], PLANS[family]
	if not play or not prepare then
		return plan
	end
	local now = os.clock()
	local count = nominal(family, event.rarity)
	local struck: { Struck } = {}
	for i, point in event.points do
		local block = snapshot(point)
		local shell = block and takeShell()
		if block and shell then
			dress(shell, block)
			local k = State.cellKey(block.x, block.y, block.depth)
			local ice = frozen[k]
			if ice then
				-- the frozen block's ice moves to its shell (the block itself is leaving the wall)
				thaw(ice)
				frozen[k] = nil
			end
			table.insert(struck, {
				shell = shell,
				block = block,
				at = 0,
				burst = 0,
				extra = i > count,
				rank = #struck,
				iced = ice ~= nil,
			})
		end
	end
	if #struck == 0 then
		return plan
	end
	prepare(event, struck)
	for _, s in struck do
		plan[s.block.x .. "|" .. s.block.y .. "|" .. (s.block.depth - event.front)] =
			{ at = s.burst, grains = GRAINS[family] }
	end
	play(now, event, struck)
	return plan
end

-- A hand-hit skill proc (FxFlags on a kind-6 event). Points: the hit cell, then the cells the hit drove deeper.
function FamilyFx.proc(event: any, snapshot: (any) -> Block?): Plan
	local plan: Plan = {}
	local flags = event.flags or 0
	local now = os.clock()
	local hit = event.points[1]
	local hitBlock = hit and snapshot(hit)
	local origin: Vector3 = event.origin or (hitBlock and face(hitBlock)) or Vector3.zero
	if bit32.btest(flags, FxFlags.pierce) or bit32.btest(flags, FxFlags.ultPierce) then
		-- «Сквозняк» (and the rift ult's charged hit): a glowing spike drives through to the layers behind
		local big = bit32.btest(flags, FxFlags.ultPierce)
		local deepest: Block? = nil
		local delay = 0.05
		for i = 2, #event.points do
			local point = event.points[i]
			local block = snapshot(point)
			local shell = block and takeShell()
			if block and shell then
				dress(shell, block)
				deepest = block
				local s: Struck = {
					shell = shell,
					block = block,
					at = delay,
					burst = delay + 0.1,
					extra = false,
					rank = i,
				}
				plan[key(point)] = { at = s.burst, grains = false }
				table.insert(tracks, function(t: number): boolean
					local age = t - (now + s.at)
					if age >= 0 then
						crackFaces(shell, block, 4 + math.floor(math.clamp(age / 0.1, 0, 1) * 6))
						shell.box.Adornee, shell.box.Visible, shell.box.Color3 =
							shell.part, true, SEAM
						shell.box.LineThickness, shell.box.SurfaceTransparency = 0.1, 1
					end
					if t >= now + s.burst then
						split(t, s, 1)
						return false
					end
					return true
				end)
				delay += 0.05
			end
		end
		if deepest then
			-- the shock goes INTO the wall along the view, so it is drawn as rings racing down the new hole
			-- (a straight beam along the view axis is a dot on screen) and a hot glow at the bottom of the hole
			local into = (deepest.frame.Position - origin)
			local rings = if big then 3 else 2
			for r = 1, rings do
				after(now, (r - 1) * 0.05, function(t: number)
					ring(
						t,
						origin,
						into,
						if r == 1 then hex("FFE0A0") else SEAM,
						S * 1.1,
						S * 0.45,
						into.Magnitude,
						0.22
					)
				end)
			end
			pop(
				now + 0.1,
				deepest.frame.Position + into.Unit * -2,
				SEAM,
				if big then 4 else 3,
				0.35,
				3
			)
			pop(now, origin, hex("FFD08A"), if big then 3.5 else 2.5, 0.15)
			emit("dust", origin, 6)
			sound("plate_hit", 0.45, if big then 0.9 else 1.25)
			shake(if big then 0.38 else 0.22, 12, 1.4)
			if not big then
				tag(now, origin, "skill_rift_4")
			end
		end
	end
	if bit32.btest(flags, FxFlags.brittle) and hitBlock then
		-- «Хрупкость»: the block went in one blow — it bursts like glass
		local p = face(hitBlock)
		for _ = 1, if lite() then 5 else 10 do
			local size = Vector3.new(
				0.2 + math.random() * 0.3,
				0.8 + math.random() * 1.4,
				0.4 + math.random() * 0.5
			)
			local offset = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * 4
			chip(
				now,
				CFrame.new(p + offset)
					* CFrame.Angles(math.random() * 6, math.random() * 6, math.random() * 6),
				size,
				(offset.Unit + hitBlock.frame.LookVector * -1.2).Unit * (16 + math.random() * 12),
				0.45,
				50,
				{ material = Enum.Material.Glass, color = hex("EAFBFF"), alpha = 0.25 }
			)
		end
		pop(now, p, WHITE, 4.5, 0.14, 4)
		emit("snow", p, 14)
		sound("crit_soft", 0.45, 2.3)
		sound("plate_break", 0.3, 2)
		tag(now, p, "skill_frost_4")
	end
	if bit32.btest(flags, FxFlags.key) and hitBlock then
		-- the key flies out of the rock (for dynamite it is blown out — «Счастливый осколок»)
		local p = face(hitBlock)
		if event.family == "dynamite" then
			pop(now, p, hex("FFB04A"), 3.5, 0.2, 3)
			emit("ember", p, 8)
			emit("smoke", p, 2)
		end
		emit("gold", p, 10)
		tag(now, p, "keys")
		sound("coin", 0.45, 1.6)
		after(now, 0.08, function()
			sound("level_tick", 0.4, 1.3)
		end)
	end
	return plan
end

-- frost hand hits: «Ледяная хватка» (ice spray, sized by its level) and «Ледолом» (wedges into the plate)
function FamilyFx.handHit(family: string, position: Vector3, normal: Vector3, plate: boolean)
	if family ~= "frost" then
		return
	end
	local now = os.clock()
	local grip = level("frost", SKILL.frost.grip)
	if grip > 0 then
		emit("snow", position, 2 + grip)
	end
	local wedge = level("frost", SKILL.frost.plate)
	if plate and wedge > 0 then
		for i = 1, math.min(4, 1 + wedge // 3) do
			local c = takeCone()
			if not c then
				break
			end
			local spot = position + Vector3.new((i - 2.5) * 0.9, (i % 2 - 0.5) * 1.1, 0)
			c.Adornee = root()
			c.CFrame = CFrame.lookAt(spot + normal * 2.2, spot - normal * 0.6)
			c.Color3, c.Transparency, c.Radius, c.Height = hex("E4F8FF"), 0.1, 0.5, 0
			c.Visible = true
			table.insert(tracks, function(t: number): boolean
				local age = t - now
				c.Height = math.min(1, age / 0.06) * 2.6
				if age > 0.55 then
					dropCone(c)
					emit("snow", spot, 4)
					return false
				end
				return true
			end)
		end
		sound("crit_soft", 0.3, 1.5)
	end
end

-- wall chests found by a dynamite player with «Кладоискатель»
function FamilyFx.treasure(position: Vector3)
	local p = ProfileState.getProfile()
	if not p or p.family ~= "dynamite" or level("dynamite", SKILL.dynamite.treasure) <= 0 then
		return
	end
	local now = os.clock()
	emit("gold", position, 24)
	pop(now, position, hex("FFD84A"), 5, 0.3, 4)
	tag(now, position, "skill_dynamite_3")
	sound("coin_rain", 0.45, 1.1)
end

-- ═════════════════════════════════════ ULTS ═════════════════════════════════════
local storm = { untilAt = 0, from = 0, tint = nil :: ColorCorrectionEffect?, nextFlicker = 0 }

local function frontPoints(event: any): ({ Vector3 }, { BasePart })
	local out, parts = {}, {}
	local result = event.result or {}
	local width, height = result.width or 5, result.height or 3
	local radius = (width - 1) // 2
	for y = 0, height - 1 do
		for x = -radius, radius do
			local part = locate({ x = x, y = y, d = event.front }, nil)
			if part then
				table.insert(out, part.CFrame:PointToWorldSpace(Vector3.new(0, 0, S / 2)))
				table.insert(parts, part)
			end
		end
	end
	return out, parts
end

function FamilyFx.ult(family: string, event: any)
	local now = os.clock()
	local flags = event.flags or 0
	local echo = bit32.btest(flags, FxFlags.echo)
	local points, faceParts = frontPoints(event)
	local origin: Vector3 = event.origin or points[1] or Vector3.zero
	if not echo then
		notice("family_ult_" .. family)
	end
	local function pick(n: number): { Vector3 }
		local out = {}
		for i = 1, n do
			local p = points[1 + math.floor((i - 0.5) / n * #points)]
			if p then
				table.insert(out, p)
			end
		end
		return out
	end
	if family == "storm" then
		-- the storm breaks: bolts from the ceiling onto the wall, then «Грозовой фронт» keeps the storm going
		for i, p in pick(3) do
			after(now, 0.05 + i * 0.07, function(t: number)
				local top = p + Vector3.new((math.random() - 0.5) * 4, S * 3.4, S * 0.8)
				bolt(top, p, true, SKY)
				pop(t, p, hex("DFF7FF"), 4.5, 0.2, 3)
				emit("spark", p, 20)
				sound("bolt_soft", 0.55, 0.8 + i * 0.08)
			end)
		end
		flash(hex("BDEFFF"), 0.2)
		shake(0.4, 30, 2)
		local wave = (event.durationMs or 0) / 1000
		local buff = (event.buffMs or 0) / 1000
		if buff > 0 then
			storm.from, storm.untilAt = now + wave, now + wave + buff
			storm.nextFlicker = now + wave
			if level("storm", SKILL.storm.storm) > 0 then
				after(now, wave, function(t: number)
					tag(t, origin, "skill_storm_4")
				end)
			end
		end
	elseif family == "dynamite" then
		-- one huge blast at the wall, gold in it: this ult pays ×1.5
		after(now, 0.08, function(t: number)
			pop(t, origin, hex("FFE6A8"), 8, 0.25, 4)
			pop(t, origin, hex("FF6A2A"), 12, 0.45)
			for _, p in pick(6) do
				emit("fire", p, 10)
				emit("ember", p, 10)
				emit("gold", p, 6)
			end
			emit("smoke", origin, 10)
			sound("heavy_hit", 0.8, 0.6)
			sound("ult_whump", 0.6, 1)
			flash(hex("FF8A3A"), 0.2)
			shake(0.7, 15, 1.2)
		end)
	elseif family == "rift" then
		-- the quake: a long low rumble, dust raining from the roof; «Глубокий удар» makes it longer; the echo is a
		-- second, lower quake
		local depth = level("rift", SKILL.rift.depth)
		local length = 0.8 + depth * 0.06 + (if echo then -0.2 else 0)
		local beat = 0
		table.insert(tracks, function(t: number): boolean
			local age = t - now
			if age >= beat then
				beat += 0.16
				shake(if echo then 0.22 else 0.3, 7, 0.9)
				for _, p in pick(2) do
					emit("pebble", p + Vector3.new((math.random() - 0.5) * 8, S * 2.2, S * 1.5), 4)
					emit("dust", p + Vector3.new(0, S * 2, S), 2)
				end
			end
			return age < length
		end)
		sound("ult_thud", 0.7, if echo then 0.55 else 0.7)
		-- a network of glowing cracks tears across the whole face from the hit, then a second ring of cracks
		local outward = {}
		for i, p in pick(6) do
			table.insert(outward, p)
			after(now, 0.03 * i, function()
				bolt(origin + Vector3.new(0, 0, 0.15), p + Vector3.new(0, 0, 0.15), true, CRACK)
			end)
		end
		after(now, 0.2, function()
			for _, p in outward do
				local edge = p
					+ Vector3.new((math.random() - 0.5) * S * 2, (math.random() - 0.5) * S, 0.15)
				bolt(p + Vector3.new(0, 0, 0.15), edge, false, CRACK)
			end
		end)
		if echo then
			tag(now, origin, "skill_rift_3")
			pop(now, origin, SEAM, 7, 0.4, 2)
		elseif depth > 0 then
			tag(now, origin, "skill_rift_2")
		end
	elseif family == "frost" then
		-- the frost wave: the whole face glazes over from the hit outwards, holds, and breaks off in ice
		local glazes = {}
		for _, part in faceParts do
			local distance = (part.Position - origin).Magnitude
			after(now, math.min(0.18, distance / S * 0.03), function(t: number)
				local box = Instance.new("SelectionBox")
				box.Parent = holder()
				glaze(box, part, 1)
				local spikesOf = {}
				spikes(
					part,
					spikesOf,
					if lite() then 1 else 2,
					math.floor(part.Position.X + part.Position.Y)
				)
				growSpikes(t, spikesOf, 0.08)
				table.insert(glazes, { box = box, cones = spikesOf })
			end)
		end
		after(now, 0.3, function()
			for _, g in glazes do
				g.box:Destroy()
				for _, cone in g.cones do
					dropCone(cone)
				end
			end
		end)
		for _, p in pick(8) do
			emit("mist", p, 3)
			emit("snow", p, 8)
		end
		after(now, 0.3, function(t: number)
			for _, p in pick(10) do
				for _ = 1, if lite() then 1 else 2 do
					chip(
						t,
						CFrame.new(p + Vector3.new(0, 0, 0.3))
							* CFrame.Angles(math.random() * 6, math.random() * 6, 0),
						Vector3.new(0.3, 1.4, 0.8),
						Vector3.new(
							(math.random() - 0.5) * 16,
							6 + math.random() * 8,
							8 + math.random() * 8
						),
						0.6,
						50,
						{ material = Enum.Material.Glass, color = hex("D7F4FF"), alpha = 0.15 }
					)
				end
			end
			sound("plate_break", 0.5, 1.6)
			flash(hex("CFF3FF"), 0.18)
			shake(0.35, 22, 1.8)
		end)
		sound("crit_soft", 0.4, 1.8)
	end
	if bit32.btest(flags, FxFlags.placed) and event.points[1] then
		-- «Тайник»: the chest the ult hid lands in the new wall after the wave
		local point = event.points[1]
		after(now, (event.durationMs or 0) / 1000 + 0.1, function(t: number)
			local part = locate({
				x = point.x,
				y = point.y,
				d = (event.result and event.result.front or event.front) + point.dRel,
			}, nil)
			if part then
				local p = part.CFrame:PointToWorldSpace(Vector3.new(0, 0, S / 2))
				bar(t, p + Vector3.new(0, S * 4, 0), p, hex("FFD84A"), 1.4, 0.08, 0.45)
				pop(t, p, hex("FFD84A"), 4, 0.3, 3)
				emit("dust", p, 8)
				emit("gold", p, 12)
				tag(t, p, "skill_dynamite_4")
				sound("ult_thud", 0.5, 1.25)
			end
		end)
	end
end

function FamilyFx.chestOpen(result: any)
	showResult(result)
	Sfx.play("buy_soft", 0.3)
end

local warned: { [string]: boolean } = {}
local nextSweep = 0
-- ── per frame ────────────────────────────────────────────────────────────────────────────────────────────────────
function FamilyFx.step(now: number, dt: number, stormAt: (() -> Vector3?)?)
	for i = #tracks, 1, -1 do
		local ok, alive = pcall(tracks[i], now)
		if not ok and not warned[tostring(alive)] then
			warned[tostring(alive)] = true
			warn("[FamilyFx] " .. tostring(alive))
		end
		if not ok or not alive then
			table.remove(tracks, i)
		end
	end
	-- flying pieces: simple ballistic motion, moved in one bulk call
	table.clear(movingParts)
	table.clear(movingFrames)
	for _, c in chips do
		if c.busy then
			local age = now - c.born
			if age >= c.life then
				c.part.Parent, c.busy = nil, false
			else
				c.vel += Vector3.new(0, -c.gravity * dt, 0)
				c.pos += c.vel * dt
				c.angle += c.spin * dt
				local k = age / c.life
				table.insert(movingParts, c.part)
				table.insert(
					movingFrames,
					CFrame.new(c.pos) * CFrame.fromAxisAngle(c.axis, c.angle) * c.base
				)
				local shrink = if k > 0.6 then 1 - (k - 0.6) / 0.4 * 0.6 else 1
				c.part.Size = c.size * shrink
				c.part.Transparency = c.fade + (1 - c.fade) * math.clamp((k - 0.55) / 0.45, 0, 1)
				if c.toColor then
					c.part.Color = c.color:Lerp(c.toColor, math.min(1, k * 1.6))
				end
			end
		end
	end
	if #movingParts > 0 then
		workspace:BulkMoveTo(movingParts, movingFrames, Enum.BulkMoveMode.FireCFrameChanged)
	end
	-- a safety net: no spike may outlive the part it sits on
	if now >= nextSweep then
		nextSweep = now + 0.5
		for _, cone in cones do
			local on = cone.Adornee
			if cone.Visible and (not on or not on.Parent) then
				dropCone(cone)
			end
		end
	end
	-- frozen ice must still sit on its own cell
	for k, entry in frozen do
		local part = locate(entry.cell, nil)
		if part ~= entry.part or not entry.part.Parent then
			thaw(entry)
			frozen[k] = nil
		end
	end
	-- the storm buff: bluer, darker air with flickers far down the shaft
	local tint = storm.tint
	if now < storm.untilAt and now >= storm.from then
		if not tint or not tint.Parent then
			local fx = Instance.new("ColorCorrectionEffect")
			fx.Name, fx.Parent = "StormTint", Lighting
			storm.tint, tint = fx, fx
		end
		local left = storm.untilAt - now
		local k = math.clamp((now - storm.from) / 0.3, 0, 1) * math.clamp(left / 0.4, 0, 1)
		local fx = tint :: ColorCorrectionEffect
		fx.Enabled = true
		fx.TintColor = WHITE:Lerp(hex("BFD3FF"), 0.6 * k)
		fx.Saturation, fx.Brightness = -0.15 * k, -0.05 * k
		if now >= storm.nextFlicker then
			storm.nextFlicker = now + 0.6 + math.random() * 0.7
			fx.Brightness = 0.12 * k
			if not calm() then
				sound("bolt_soft", 0.12, 0.6)
			end
			local at = stormAt and stormAt()
			if at then
				local far = at
					+ Vector3.new((math.random() - 0.5) * 10, S * 2.6, -(8 + math.random() * 20))
				bolt(far + Vector3.new(0, S * 1.6, 0), far - Vector3.new(0, S * 1.4, 0), true, FORK)
			end
		end
	elseif tint then
		tint.Enabled = false
	end
end

function FamilyFx.stormActive(now: number): boolean
	return now >= storm.from and now < storm.untilAt
end

function FamilyFx.clear()
	for k, entry in frozen do
		thaw(entry)
		frozen[k] = nil
	end
	for _, shell in shells do
		if shell.busy then
			freeShell(shell)
		end
	end
	for _, c in chips do
		c.part.Parent, c.busy = nil, false
	end
	table.clear(tracks)
	storm.untilAt = 0
end

return FamilyFx
