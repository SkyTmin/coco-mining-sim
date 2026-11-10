--!strict

local Lighting = game:GetService("Lighting")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Worlds = require(Shared.Mine.Worlds)

local S = Config.mine.blockSize
local segmentDepth = S * 2
local WIDTH = Config.plots.frameWidth * S
local HEIGHT = Config.mine.height * S
local SEGMENTS = 16
local Tunnel = {}

local function part(parent: Instance, size: Vector3, color: Color3, material: Enum.Material?): Part
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
		true, false, false, false, false
	p.Size, p.Color, p.Material, p.Parent =
		size, color, material or Enum.Material.SmoothPlastic, parent
	return p
end

function Tunnel.new(parent: Instance, frame: CFrame): any
	local model = Instance.new("Folder")
	model.Name, model.Parent = "MineTunnel", parent
	local gray, trim = Color3.fromRGB(48, 52, 59), Color3.fromRGB(83, 90, 101)
	local segments, lights, streaks = {}, {}, {}
	for i = 1, SEGMENTS do
		local group = {}
		local function piece(
			size: Vector3,
			at: Vector3,
			color: Color3,
			material: Enum.Material?
		): Part
			local p = part(model, size, color, material)
			table.insert(group, { part = p, at = CFrame.new(at) })
			return p
		end
		piece(Vector3.new(WIDTH, 1, segmentDepth), Vector3.new(0, -0.52, 0), gray)
		piece(Vector3.new(WIDTH, 1, segmentDepth), Vector3.new(0, HEIGHT + 0.5, 0), gray)
		for _, side in { -1, 1 } do
			piece(
				Vector3.new(1, HEIGHT, segmentDepth),
				Vector3.new(side * (WIDTH / 2 + 0.5), HEIGHT / 2, 0),
				gray
			)
			piece(
				Vector3.new(1.2, HEIGHT, 1.1),
				Vector3.new(side * (WIDTH / 2 - 0.35), HEIGHT / 2, segmentDepth / 2 - 0.5),
				trim
			)
		end
		piece(
			Vector3.new(WIDTH, 1, 1.1),
			Vector3.new(0, HEIGHT - 0.42, segmentDepth / 2 - 0.5),
			trim
		)
		if i % 3 == 0 then
			local lamp = piece(
				Vector3.new(3, 0.35, 0.68),
				Vector3.new(0, HEIGHT - 0.95, segmentDepth / 2 - 0.5),
				Color3.fromRGB(255, 215, 166),
				Enum.Material.Neon
			)
			table.insert(streaks, lamp)
			if #lights < 4 then
				local light = Instance.new("PointLight")
				light.Color, light.Range, light.Brightness, light.Parent =
					lamp.Color, 22, 1.45, lamp
				table.insert(lights, light)
			end
		end
		segments[i] = group
	end
	local glow =
		part(model, Vector3.new(0.2, 9, 9), Color3.fromRGB(255, 188, 121), Enum.Material.Neon)
	glow.Shape = Enum.PartType.Cylinder
	glow.CFrame = frame
		* CFrame.new(0, HEIGHT / 2, -(SEGMENTS * segmentDepth - 8))
		* CFrame.Angles(0, math.pi / 2, 0)
	local sparks = Instance.new("ParticleEmitter")
	sparks.Rate, sparks.Speed, sparks.Lifetime =
		5, NumberRange.new(0.5, 1.8), NumberRange.new(2.5, 3.6)
	sparks.Size, sparks.LightEmission, sparks.Parent = NumberSequence.new(0.12), 0.7, glow
	local fake = {}
	for i = 1, 20 do
		local p =
			part(model, Vector3.new(WIDTH * 0.55, HEIGHT * 0.8, 0.12), trim, Enum.Material.Neon)
		p.Transparency = 1
		fake[i] = p
	end
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	return {
		frame = frame,
		segments = segments,
		lights = lights,
		streaks = streaks,
		glow = glow,
		sparks = sparks,
		fake = fake,
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
	if t.active and t.front == front and t.quality == quality then
		return
	end
	t.active, t.front, t.quality = true, front, quality
	local w = Worlds.of(front)
	local color = Color3.fromRGB(w.color[1], w.color[2], w.color[3])
	local nextWorld = Worlds.of(w.finish)
	t.glow.Color = Color3.fromRGB(nextWorld.color[1], nextWorld.color[2], nextWorld.color[3])
	t.glow.Transparency = if w.plateDepth - front <= 10 then 0.12 else 0.54
	t.sparks.Color = ColorSequence.new(t.glow.Color)
	Lighting.Ambient = Color3.fromRGB(100, 90, 87)
	Lighting.OutdoorAmbient = Color3.fromRGB(126, 111, 101)
	Lighting.Brightness = 1.8
	Lighting.FogStart, Lighting.FogEnd, Lighting.FogColor =
		30, 110, color:Lerp(Color3.fromRGB(22, 23, 35), 0.48)
	if t.atmosphere then
		t.atmosphere.Density = 0
	end
	for i, light in t.lights do
		light.Enabled = i <= (if quality == 1 then 2 else 4)
	end
end

function Tunnel.moves(
	t: any,
	travel: number,
	hyper: boolean,
	parts: { BasePart },
	frames: { CFrame }
)
	local phase = travel % segmentDepth
	for i, group in t.segments do
		local depth = (i - 0.5) * segmentDepth - phase
		for _, piece in group do
			table.insert(parts, piece.part)
			table.insert(frames, t.frame * CFrame.new(0, 0, -depth) * piece.at)
		end
	end
	for _, lamp in t.streaks do
		lamp.Size = Vector3.new(3, 0.35, if hyper then 5 else 0.68)
	end
	for i, p in t.fake do
		p.Transparency = if hyper then 0.92 else 1
		if hyper then
			table.insert(parts, p)
			table.insert(frames, t.frame * CFrame.new(0, HEIGHT / 2, -(i * S - travel % S)))
		end
	end
end

return Tunnel
