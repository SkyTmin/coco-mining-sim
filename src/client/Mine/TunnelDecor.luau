--!strict

local Lighting = game:GetService("Lighting")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Worlds = require(Shared.Mine.Worlds)

local S = Config.mine.blockSize
local WIDTH = Config.mine.startWidth * S + 0.6
local HEIGHT = Config.mine.height * S
local depthConfig = Config.fx.depth
local LENGTH = depthConfig.fogEnd
local SIMPLE_FROM = depthConfig.simpleFrom
local NEAR_SPACING = depthConfig.lampSpacing
local FAR_SPACING = depthConfig.distantSpacing
local LAMP = Color3.fromRGB(255, 215, 166)
local Tunnel = {}

local function part(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material?
): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Size, p.CFrame, p.Color, p.Material =
		size, cframe, color, material or Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

local function colorOf(world: Worlds.World): Color3
	return Color3.fromRGB(world.color[1], world.color[2], world.color[3])
end

function Tunnel.new(parent: Instance, frame: CFrame): any
	local model = Instance.new("Folder")
	model.Name, model.Parent = "MineTunnel", parent
	local gray, trim = Color3.fromRGB(64, 66, 72), Color3.fromRGB(98, 107, 120)
	local function fixed(
		name: string,
		size: Vector3,
		x: number,
		y: number,
		depth: number,
		color: Color3,
		neon: boolean?
	): Part
		return part(
			model,
			name,
			size,
			frame * CFrame.new(x, y, -depth),
			color,
			if neon then Enum.Material.Neon else nil
		)
	end
	fixed("Floor", Vector3.new(WIDTH, 1, LENGTH), 0, -0.55, LENGTH / 2, gray)
	fixed("Ceiling", Vector3.new(WIDTH, 1, LENGTH), 0, HEIGHT + 0.5, LENGTH / 2, gray)
	local entranceWidth = Config.plots.frameWidth * S
	local sideWidth = (entranceWidth - WIDTH) / 2
	for _, side in { -1, 1 } do
		fixed(
			"Wall",
			Vector3.new(1, HEIGHT, LENGTH),
			side * (WIDTH / 2 + 0.5),
			HEIGHT / 2,
			LENGTH / 2,
			gray
		)
		fixed(
			"Wall",
			Vector3.new(sideWidth, HEIGHT, 1.1),
			side * (WIDTH + sideWidth) / 2,
			HEIGHT / 2,
			0.55,
			gray
		)
	end
	fixed("Wall", Vector3.new(entranceWidth, HEIGHT, 1.1), 0, HEIGHT * 1.5, 0.55, gray)
	local lamps, lights = {}, {}
	local function addSupport(depth: number, spacing: number)
		fixed("Arch", Vector3.new(WIDTH, 0.55, 1.1), 0, HEIGHT - 0.25, depth, trim)
		local lamp = fixed("Lamp", Vector3.new(3, 0.3, 0.65), 0, HEIGHT - 0.7, depth, LAMP, true)
		table.insert(lamps, { part = lamp, depth = depth, spacing = spacing })
		if #lights < 4 then
			local light = Instance.new("PointLight")
			light.Color, light.Range, light.Brightness, light.Parent = LAMP, 24, 1.35, lamp
			table.insert(lights, light)
		end
	end
	for depth = 7, SIMPLE_FROM - 1, NEAR_SPACING do
		for _, side in { -1, 1 } do
			fixed("Arch", Vector3.new(0.55, HEIGHT, 1.1), side * WIDTH / 2, HEIGHT / 2, depth, trim)
		end
		addSupport(depth, NEAR_SPACING)
	end
	for depth = SIMPLE_FROM + FAR_SPACING / 2, LENGTH - 6, FAR_SPACING do
		addSupport(depth, FAR_SPACING)
	end
	local glow = fixed(
		"DepthGlow",
		Vector3.new(WIDTH * 0.8, HEIGHT * 0.8, 0.2),
		0,
		HEIGHT / 2,
		LENGTH - 7,
		LAMP,
		true
	)
	glow.Transparency = 0.4
	local moving = Instance.new("Folder")
	moving.Name, moving.Parent = "MineDepth", parent
	local mass = part(moving, "FarOreMass", Vector3.one, frame, gray, Enum.Material.Slate)
	local face = part(moving, "SurvivorFace", Vector3.one, frame, LAMP, Enum.Material.Neon)
	local tape = part(moving, "DepthTape", Vector3.one, frame, trim, Enum.Material.Metal)
	local ticks = {}
	local tickCount = math.ceil((SIMPLE_FROM + 2) / (10 * S))
		+ math.ceil((LENGTH - SIMPLE_FROM) / (100 * S))
	for _ = 1, tickCount do
		local marker = part(moving, "DepthMark", Vector3.new(4, 0.09, 5), frame, gray)
		local surface = Instance.new("SurfaceGui")
		surface.Face, surface.CanvasSize, surface.LightInfluence, surface.Parent =
			Enum.NormalId.Back, Vector2.new(200, 80), 0, marker
		local text = Instance.new("TextLabel")
		text.Name, text.Size, text.BackgroundTransparency = "DepthNumber", UDim2.fromScale(1, 1), 1
		text.Font, text.TextScaled, text.TextColor3, text.Parent =
			Enum.Font.GothamBold, true, Color3.fromRGB(44, 34, 29), surface
		table.insert(ticks, { part = marker, text = text })
	end

	local wave = {}
	for i = 1, 10 do
		wave[i] = part(moving, "FractureRing", Vector3.one, frame, LAMP, Enum.Material.Neon)
		wave[i].Transparency = 1
	end

	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	return {
		frame = frame,
		mass = mass,
		face = face,
		tape = tape,
		ticks = ticks,
		wave = wave,
		lamps = lamps,
		lights = lights,
		glow = glow,
		active = false,
		original = {
			Lighting.Ambient,
			Lighting.OutdoorAmbient,
			Lighting.Brightness,
			Lighting.FogStart,
			Lighting.FogEnd,
			Lighting.FogColor,
		},
		atmosphere = atmosphere,
		density = if atmosphere then atmosphere.Density else 0,
	}
end

function Tunnel.atmosphere(t: any, active: boolean, front: number, quality: number)
	if not active then
		if t.active then
			local old = t.original
			Lighting.Ambient, Lighting.OutdoorAmbient, Lighting.Brightness = old[1], old[2], old[3]
			Lighting.FogStart, Lighting.FogEnd, Lighting.FogColor = old[4], old[5], old[6]
			if t.atmosphere then
				t.atmosphere.Density = t.density
			end
		end
		t.active = false
		return
	end
	local world = Worlds.of(front)
	if t.active and t.world == world and t.quality == quality then
		return
	end
	t.active, t.world, t.quality = true, world, quality
	t.glow.Color = colorOf(Worlds.of(world.finish))
	Lighting.Ambient = Color3.fromRGB(107, 102, 101)
	Lighting.OutdoorAmbient = Color3.fromRGB(126, 116, 111)
	Lighting.Brightness = 1.8
	Lighting.FogStart, Lighting.FogEnd, Lighting.FogColor =
		depthConfig.fogStart, LENGTH, colorOf(world):Lerp(Color3.fromRGB(34, 37, 51), 0.65)
	if t.atmosphere then
		t.atmosphere.Density = 0
	end
	for i, light in t.lights do
		light.Enabled = i <= (if quality == 1 then 2 else 4)
	end
end

function Tunnel.moves(
	t: any,
	win: any,
	offset: number,
	visible: number,
	survivor: boolean,
	plateDistance: number?,
	parts: { BasePart },
	frames: { CFrame }
)
	local function move(p: BasePart, x: number, y: number, depth: number)
		table.insert(parts, p)
		table.insert(frames, t.frame * CFrame.new(x, y, -depth))
	end
	local world = Worlds.of(win.front)
	local rock = colorOf(world):Lerp(Color3.fromRGB(70, 65, 62), 0.46)
	local width, height = win.width * S, win.height * S
	local start = offset + visible * S
	if plateDistance and math.abs(plateDistance - start) < S then
		start = plateDistance + S
	end
	start = math.min(LENGTH - 1, start)
	t.mass.Color, t.mass.Size = rock, Vector3.new(width, height - 0.06, LENGTH - start)
	move(t.mass, 0, height / 2, (start + LENGTH) / 2)
	local showFace = survivor and plateDistance ~= offset
	t.face.Transparency = if showFace then 0.16 else 1
	if showFace then
		t.face.Size, t.face.Color =
			Vector3.new(width - 0.4, height - 0.4, 0.14), rock:Lerp(LAMP, 0.55)
		move(t.face, 0, height / 2, offset - 0.1)
	end

	local markerSpacing = 10 * S
	local tapeStart = (offset - (win.front % 10) * S) % markerSpacing - markerSpacing - 2
	t.tape.Size = Vector3.new(4.2, 0.06, LENGTH + markerSpacing + 2)
	move(t.tape, 0, -0.01, tapeStart + t.tape.Size.Z / 2)
	local nextTick = 1
	local function marks(firstDepth: number, limit: number, step: number)
		local n = math.max(0, math.ceil((win.front + (firstDepth - offset) / S) / step) * step)
		local depth = offset + (n - win.front) * S
		while depth < limit do
			local tick = t.ticks[nextTick]
			local distant = step == 100
			tick.part.Transparency, tick.text.Parent.Enabled = 0, distant
			tick.part.Size = if distant
				then Vector3.new(4, 1.55, 0.14)
				else Vector3.new(4, 0.06, 0.35)
			tick.part.Color = if distant then LAMP else Color3.fromRGB(127, 145, 161)
			tick.part.Material = if distant then Enum.Material.Neon else Enum.Material.Metal
			if distant then
				tick.text.Text = Format.depth(n)
			end
			move(tick.part, 0, if distant then 0.8 else 0.045, depth)
			nextTick += 1
			n += step
			depth += step * S
		end
	end
	marks(-2, SIMPLE_FROM, 10)
	marks(SIMPLE_FROM, LENGTH - 4, 100)
	for i = nextTick, #t.ticks do
		local tick = t.ticks[i]
		tick.part.Transparency, tick.text.Parent.Enabled = 1, false
	end
end

function Tunnel.wave(t: any, depth: number?, strength: number, color: Color3)
	for i, piece in t.wave do
		piece.Transparency = if depth then 0.18 + (1 - strength) * 0.63 else 1
		if depth then
			local angle = (i - 1) * 2 * math.pi / #t.wave
			local nextAngle = i * 2 * math.pi / #t.wave
			local function point(a: number): Vector3
				return Vector3.new(
					math.cos(a) * WIDTH * 0.47,
					HEIGHT * (0.5 + 0.47 * math.sin(a)),
					-depth
				)
			end
			local a, b = point(angle), point(nextAngle)
			local span = (b - a).Magnitude
			piece.Color, piece.Size = color, Vector3.new(0.34, 0.34, span + 0.12)
			piece.CFrame = t.frame * CFrame.lookAt((a + b) / 2, b)
		end
	end
	for _, lamp in t.lamps do
		local flash = if depth
			then math.clamp(1 - math.abs(depth - lamp.depth) / (lamp.spacing * 1.25), 0, 1) * strength
			else 0
		lamp.part.Color = LAMP:Lerp(color:Lerp(Color3.new(1, 1, 1), 0.52), flash)
	end
end

return Tunnel
