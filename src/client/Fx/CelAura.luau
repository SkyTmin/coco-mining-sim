--!strict
-- Rarity aura around a cel model [владелец 11.11: «эффект ужасный… крутятся в ряд… перерисовывай»].
-- Replaces the flat comic sprites that spun as one rigid ring. Built like item auras in games: nothing moves as a block.
--   • twinkle — a ParticleEmitter on an invisible sphere round the head: sparkles appear at random spots, swell and
--     fade (size 0 → s → 0), glow (LightEmission 1); the family decides how they move: storm flickers fast, dynamite
--     embers rise, rift chips drift out, frost flakes fall slowly
--   • motes — small glowing comets, each on its own tilted orbit with its own speed and start angle, a Trail behind;
--     they use CelMesh's spinner (SpinCentre / SpinAxis / SpinSpeed per part), so every mote turns about its own axis
-- Counts grow with rarity (level 0 … 3). Textures are Roblox built-ins, nothing uploaded.
local CelAura = {}

local SPARKLE = "rbxasset://textures/particles/sparkles_main.dds"
local FIRE = "rbxasset://textures/particles/fire_main.dds"

export type Spec = {
	centre: Vector3, -- model space
	radius: number, -- model units
	level: number, -- 0 … 3
	style: string, -- "storm" | "dynamite" | "rift" | "frost" | "chest"
	colors: { Color3 }, -- light, main, deep
	moteColors: { Color3 }?, -- one colour per mote (the pickaxe chest: the four families)
	axis: Vector3?, -- model space: the motes circle round this axis (each tilted a little its own way); nil = any
	box: Vector3?, -- model space: the sparkles fill this box round the centre instead of a sphere (a pick head)
}

local TWINKLE_RATE = { 0, 2, 4, 7 }
local MOTES = { 0, 1, 2, 3 }

local function sequence(a: Color3, b: Color3): ColorSequence
	return ColorSequence.new({ ColorSequenceKeypoint.new(0, a), ColorSequenceKeypoint.new(1, b) })
end

local function twinkle(holder: BasePart, spec: Spec, size: number)
	local level = math.clamp(spec.level, 0, 3)
	local rate = TWINKLE_RATE[level + 1]
	if rate <= 0 then
		return
	end
	local light, main = spec.colors[1], spec.colors[2]
	local e = Instance.new("ParticleEmitter")
	e.Name = "Twinkle"
	e.Texture, e.LightEmission, e.LightInfluence, e.ZOffset = SPARKLE, 1, 0, 0.5
	e.Shape, e.ShapeStyle, e.ShapeInOut =
		Enum.ParticleEmitterShape.Sphere,
		Enum.ParticleEmitterShapeStyle.Volume,
		Enum.ParticleEmitterShapeInOut.Outward
	e.LockedToPart, e.Rate = true, rate
	e.Rotation, e.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-120, 120)
	e.Color = sequence(light, main)
	e.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0),
		NumberSequenceKeypoint.new(0.35, size),
		NumberSequenceKeypoint.new(1, 0),
	})
	e.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.2),
		NumberSequenceKeypoint.new(0.6, 0),
		NumberSequenceKeypoint.new(1, 0.4),
	})
	e.Lifetime, e.Speed = NumberRange.new(0.7, 1.3), NumberRange.new(0.05, size * 0.6)
	if spec.style == "storm" then
		e.Lifetime, e.RotSpeed = NumberRange.new(0.25, 0.5), NumberRange.new(-360, 360)
		e.Rate = rate * 1.6
	elseif spec.style == "dynamite" then
		-- embers: fire texture, rising and shrinking
		e.Texture = FIRE
		e.Acceleration = Vector3.new(0, size * 6, 0)
		e.Color = sequence(light, spec.colors[3])
		e.Lifetime = NumberRange.new(0.5, 0.9)
	elseif spec.style == "rift" then
		e.Speed = NumberRange.new(size * 0.8, size * 1.6)
		e.Drag = 3
	elseif spec.style == "frost" then
		e.Acceleration = Vector3.new(0, -size * 2.5, 0)
		e.Lifetime, e.RotSpeed = NumberRange.new(1.2, 2), NumberRange.new(-40, 40)
	end
	e.Parent = holder
end

-- `place(v)` maps a model-space point to template space, `direction(v)` a model-space direction; `unit` = studs/unit
function CelAura.build(
	m: Model,
	spec: Spec,
	place: (Vector3) -> Vector3,
	direction: (Vector3) -> Vector3,
	unit: number
)
	local level = math.clamp(spec.level, 0, 3)
	local centre = place(spec.centre)
	local radius = spec.radius * unit
	local holder = Instance.new("Part")
	holder.Name, holder.Transparency = "CelAura", 1
	holder.Anchored, holder.CanCollide, holder.CanTouch, holder.CanQuery, holder.Massless, holder.CastShadow =
		true, false, false, false, true, false
	local sparkle = radius * 0.32
	if spec.box then
		-- a box laid along the model axes: the emitter's Box shape fills the part's volume
		holder.Size = spec.box * unit
		holder.CFrame =
			CFrame.fromMatrix(centre, direction(Vector3.xAxis), direction(Vector3.yAxis))
		sparkle = math.min(holder.Size.X, holder.Size.Y, holder.Size.Z) * 0.45
	else
		holder.Shape = Enum.PartType.Ball
		holder.Size = Vector3.one * radius * 2
		holder.CFrame = CFrame.new(centre)
	end
	holder.Parent = m
	twinkle(holder, spec, sparkle)
	if spec.box then
		local e = holder:FindFirstChild("Twinkle") :: ParticleEmitter?
		if e then
			e.Shape = Enum.ParticleEmitterShape.Box
		end
	end

	local count = if spec.moteColors then #spec.moteColors else MOTES[level + 1]
	for i = 1, count do
		-- each orbit has its own tilt, size, speed (some go the other way) and start angle
		local tiltA = math.rad(25 + (i - 1) * 67)
		local tiltB = math.rad(-35 + (i - 1) * 41)
		local axis = if spec.axis
			-- round a given axis: ±10…22° off it, each mote another way, so they never move as one ring
			then direction(
				(CFrame.fromAxisAngle(spec.axis, (i - 1) * 2.1) * CFrame.Angles(
					math.rad(10 + ((i * 29) % 13)),
					0,
					0
				)):VectorToWorldSpace(spec.axis)
			).Unit
			else direction(
				Vector3.new(math.sin(tiltA) * 0.6, math.cos(tiltA), math.sin(tiltB) * 0.5)
			).Unit
		local helper = if math.abs(axis.Y) < 0.9 then Vector3.yAxis else Vector3.xAxis
		local out = axis:Cross(helper).Unit
		local phase = (i - 1) * 2.4
		local r = radius * (0.95 + 0.18 * ((i * 37) % 5) / 4)
		local start = centre + CFrame.fromAxisAngle(axis, phase):VectorToWorldSpace(out) * r
		local color = if spec.moteColors then spec.moteColors[i] else spec.colors[1 + (i - 1) % 2]
		-- the comet's head is a glint (a short-lived sparkle locked to an invisible part), not a neon ball: the balls
		-- read as white snowballs flying round the pick [владелец 12.11]
		local mote = Instance.new("Part")
		mote.Name, mote.Shape, mote.Transparency, mote.Color =
			"CelMote", Enum.PartType.Ball, 1, color
		mote.Size = Vector3.one * radius * 0.1
		mote.Anchored, mote.CanCollide, mote.CanTouch, mote.CanQuery, mote.Massless, mote.CastShadow =
			true, false, false, false, true, false
		mote.CFrame = CFrame.new(start)
		local a0, a1 = Instance.new("Attachment"), Instance.new("Attachment")
		local w = radius * 0.06
		-- the trail's width lies along the orbit axis, which stays fixed as the mote turns about it
		a0.Position, a1.Position = axis * w, -axis * w
		a0.Parent, a1.Parent = mote, mote
		local trail = Instance.new("Trail")
		trail.Attachment0, trail.Attachment1 = a0, a1
		trail.Lifetime, trail.LightEmission, trail.LightInfluence, trail.FaceCamera =
			0.32, 1, 0, true
		trail.Color = sequence(Color3.new(1, 1, 1), color)
		trail.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.1),
			NumberSequenceKeypoint.new(1, 1),
		})
		trail.WidthScale = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 1),
			NumberSequenceKeypoint.new(1, 0),
		})
		trail.Parent = mote
		-- glitter left behind the comet (a part orbiting with an emitter on it, the usual Roblox way)
		local dust = Instance.new("ParticleEmitter")
		dust.Texture, dust.LightEmission, dust.LightInfluence = SPARKLE, 1, 0
		dust.Rate, dust.Lifetime, dust.Speed =
			9, NumberRange.new(0.4, 0.7), NumberRange.new(0, 0.05)
		dust.SpreadAngle, dust.LockedToPart = Vector2.new(180, 180), false
		dust.Rotation, dust.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-90, 90)
		dust.Color = sequence(Color3.new(1, 1, 1), color)
		dust.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, radius * 0.1),
			NumberSequenceKeypoint.new(1, 0),
		})
		dust.Parent = mote
		local glint = Instance.new("ParticleEmitter")
		glint.Name, glint.Texture, glint.LightEmission, glint.LightInfluence =
			"Glint", SPARKLE, 1, 0
		glint.Rate, glint.Lifetime, glint.Speed = 40, NumberRange.new(0.12, 0.2), NumberRange.new(0)
		glint.LockedToPart, glint.ZOffset = true, 0.6
		glint.Rotation, glint.RotSpeed = NumberRange.new(0, 360), NumberRange.new(-200, 200)
		glint.Color = sequence(Color3.new(1, 1, 1), color)
		glint.Size = NumberSequence.new({
			NumberSequenceKeypoint.new(0, radius * 0.2),
			NumberSequenceKeypoint.new(1, radius * 0.05),
		})
		glint.Parent = mote
		local speed = (1.6 + ((i * 53) % 7) * 0.22) * (if i % 2 == 0 then -1 else 1)
		mote:SetAttribute("SpinCentre", centre)
		mote:SetAttribute("SpinAxis", axis)
		mote:SetAttribute("SpinSpeed", speed)
		mote.Parent = m
	end
end

return CelAura
