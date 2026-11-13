--!strict

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Quality = require(script.Parent.Quality)
local TravelDebris = {}
local rng = Random.new()
local DUST = "rbxasset://textures/particles/smoke_main.dds"
local SPARK = "rbxasset://textures/particles/sparkles_main.dds"

local function emitter(
	parent: Instance,
	texture: string,
	color: Color3,
	size: number,
	light: number
): ParticleEmitter
	local p = Instance.new("ParticleEmitter")
	p.Texture, p.Color, p.LightEmission = texture, ColorSequence.new(color), light
	p.Rate, p.Lifetime, p.Speed = 0, NumberRange.new(0.24, 0.5), NumberRange.new(4, 9)
	p.SpreadAngle, p.RotSpeed, p.Drag = Vector2.new(60, 40), NumberRange.new(-60, 60), 3
	p.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, size * 0.36),
		NumberSequenceKeypoint.new(1, size),
	})
	p.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.15),
		NumberSequenceKeypoint.new(1, 1),
	})
	p.Parent = parent
	return p
end

function TravelDebris.new(parent: Instance, frame: CFrame): any
	local root = Instance.new("Part")
	root.Name, root.Size, root.Transparency = "OreFriction", Vector3.one, 1
	root.Anchored, root.CanCollide, root.CanQuery, root.CanTouch, root.Parent =
		true, false, false, false, parent
	local anchors = {}
	for _ = 1, 3 do
		local a = Instance.new("Attachment")
		a.Parent = root
		table.insert(anchors, {
			at = a,
			dust = emitter(a, DUST, Color3.fromRGB(153, 127, 105), 3.2, 0),
			sparks = emitter(a, SPARK, Color3.fromRGB(255, 207, 135), 0.6, 0.7),
		})
	end
	local stones = {}
	for _ = 1, 6 do
		local p = Instance.new("Part")
		p.Name, p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow =
			"RollingPebble", true, false, false, false, false
		p.Material, p.Color = Enum.Material.Slate, Color3.fromRGB(128, 105, 87)
		p.Size = Vector3.one * rng:NextNumber(0.25, 0.52)
		table.insert(
			stones,
			{ part = p, x = rng:NextNumber(-0.42, 0.42), lead = rng:NextNumber(0.8, 4.8) }
		)
	end
	Quality.observe("debris", function()
		local count = 0
		for _, stone in stones do
			if stone.part.Parent then
				count += 1
			end
		end
		return count
	end)
	return {
		parent = parent,
		root = root,
		frame = frame,
		anchors = anchors,
		stones = stones,
		last = -math.huge,
	}
end

function TravelDebris.step(
	d: any,
	now: number,
	depth: number,
	width: number,
	speed: number,
	quality: number
)
	d.root.CFrame = d.frame * CFrame.new(0, 0.32, -depth)
	for i, edge in d.anchors do
		local side = if i == 1 then -1 elseif i == 3 then 1 else 0
		edge.at.Position =
			Vector3.new(side * (width / 2 - 0.3), if side == 0 then 0 else 0.55, 0.25)
		if speed > 1 and now - d.last >= 0.085 then
			edge.dust:Emit(
				Quality.reserve("particles", if quality == 1 then 1 else 2, edge.dust.Lifetime.Max)
			)
			if side ~= 0 and speed > 8 then
				edge.sparks:Emit(Quality.reserve("particles", 1, edge.sparks.Lifetime.Max))
			end
		end
	end
	if speed > 1 and now - d.last >= 0.085 then
		d.last = now
	end
	for index, stone in d.stones do
		local show = speed > 1 and index <= Quality.budget().debris
		if show and not stone.part.Parent then
			show = Quality.reserve("debris", 1, Config.fx.qualityRuntime.debrisLeaseSeconds) > 0
		end
		stone.part.Parent = if show then d.parent else nil
		if speed > 1 then
			stone.part.CFrame = d.frame
				* CFrame.new(stone.x * width, stone.part.Size.Y / 2, -depth + stone.lead)
				* CFrame.Angles(-depth * 3.3, 0, depth * 0.9)
		end
	end
end

function TravelDebris.land(d: any, now: number, width: number, ultimate: boolean)
	TravelDebris.step(d, now, 0, width, 0, 1)
	for _, edge in d.anchors do
		edge.dust:Emit(
			Quality.reserve("particles", if ultimate then 9 else 5, edge.dust.Lifetime.Max)
		)
	end
end

function TravelDebris.settle(d: any, depth: number)
	d.root.CFrame = d.frame * CFrame.new(0, 0.4, -depth)
	for _, edge in d.anchors do
		edge.dust:Emit(Quality.reserve("particles", 2, edge.dust.Lifetime.Max))
	end
end

function TravelDebris.plateImpact(d: any, depth: number, width: number, height: number)
	d.root.CFrame = d.frame * CFrame.new(0, height * 0.52, -depth + 0.4)
	for i, edge in d.anchors do
		edge.at.Position = Vector3.new((i - 2) * width * 0.36, 0, 0)
		edge.sparks:Emit(Quality.reserve("particles", 7, edge.sparks.Lifetime.Max))
		edge.dust:Emit(Quality.reserve("particles", 3, edge.dust.Lifetime.Max))
	end
end

return TravelDebris
