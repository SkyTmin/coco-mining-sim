--!strict

local Lightning = {}
local rng = Random.new()
local color = Color3.fromRGB(139, 225, 255)

function Lightning.new(parent: Instance): any
	local anchor = Instance.new("Part")
	anchor.Anchored, anchor.CanCollide, anchor.CanQuery, anchor.CanTouch, anchor.Transparency =
		true, false, false, false, 1
	anchor.Name, anchor.Parent = "LightningPool", parent
	local attachments, segments, lights = {}, {}, {}
	for i = 1, 64 do
		local point = Instance.new("Attachment")
		point.Parent = anchor
		attachments[i] = point
	end
	for i = 1, 32 do
		local core, halo = Instance.new("Beam"), Instance.new("Beam")
		for _, beam in { core, halo } do
			beam.Enabled, beam.FaceCamera, beam.LightEmission, beam.Parent = false, true, 1, anchor
		end
		core.Color, core.Width0, core.Width1 =
			ColorSequence.new(Color3.fromRGB(227, 250, 255)), 0.15, 0.13
		halo.Color, halo.Width0, halo.Width1 = ColorSequence.new(color), 0.8, 0.69
		segments[i] = { core = core, halo = halo, untilAt = 0 }
	end
	for i = 1, 2 do
		local flare = Instance.new("Part")
		flare.Shape, flare.Size, flare.Material, flare.Color =
			Enum.PartType.Ball, Vector3.one * 0.48, Enum.Material.Neon, color
		flare.Anchored, flare.CanCollide, flare.CanQuery, flare.CanTouch, flare.CastShadow =
			true, false, false, false, false
		flare.Transparency, flare.Parent = 1, parent
		local light = Instance.new("PointLight")
		light.Color, light.Range, light.Brightness, light.Parent = color, 15, 0, flare
		lights[i] = { part = flare, light = light, untilAt = 0 }
	end
	return { attachments = attachments, segments = segments, lights = lights }
end

local function segment(state: any, a: Vector3, b: Vector3, now: number): boolean
	for i, s in state.segments do
		if s.untilAt <= now then
			local a0, a1 = state.attachments[i * 2 - 1], state.attachments[i * 2]
			a0.WorldPosition, a1.WorldPosition = a, b
			s.core.Attachment0, s.core.Attachment1, s.halo.Attachment0, s.halo.Attachment1 =
				a0, a1, a0, a1
			s.core.Transparency, s.halo.Transparency =
				NumberSequence.new(0), NumberSequence.new(0.68)
			s.core.Enabled, s.halo.Enabled = true, true
			s.at, s.untilAt = now, now + 0.24
			return true
		end
	end
	return false
end

function Lightning.bolt(
	state: any,
	a: Vector3,
	b: Vector3,
	now: number,
	quality: number,
	branch: boolean
)
	local available = 0
	for _, s in state.segments do
		if s.untilAt <= now then
			available += 1
		end
	end
	if available == 0 then
		return
	end
	local points = { a, b }
	local segments = math.min(available, if quality > 1 then 6 else 4)
	while #points <= segments do
		local longest, index = 0, 1
		for i = 1, #points - 1 do
			local length = (points[i + 1] - points[i]).Magnitude
			if length > longest then
				longest, index = length, i
			end
		end
		local scale = longest * 0.3
		table.insert(
			points,
			index + 1,
			(points[index] + points[index + 1]) / 2
				+ Vector3.new(
					rng:NextNumber(-scale, scale),
					rng:NextNumber(-scale, scale),
					rng:NextNumber(-scale, scale)
				)
		)
	end
	for i = 1, #points - 1 do
		segment(state, points[i], points[i + 1], now)
	end
	if branch and available >= #points + 1 and #points > 3 then
		local start = points[(#points + 1) // 2]
		local ending = start
			+ Vector3.new(rng:NextNumber(-2, 2), rng:NextNumber(-1, 2), rng:NextNumber(-1, 1))
		segment(state, start, start:Lerp(ending, 0.5) + Vector3.new(0, 0.45, 0), now)
		segment(state, start:Lerp(ending, 0.5) + Vector3.new(0, 0.45, 0), ending, now)
	end
	for _, lamp in state.lights do
		if lamp.untilAt <= now then
			lamp.part.Position, lamp.part.Transparency = b, 0.05
			lamp.light.Brightness = if quality > 1 then 6 else 0
			lamp.at, lamp.untilAt = now, now + 0.12
			break
		end
	end
end

function Lightning.step(state: any, now: number)
	for _, s in state.segments do
		if s.core.Enabled then
			if now >= s.untilAt then
				s.core.Enabled, s.halo.Enabled = false, false
			else
				local t = now - s.at
				local power = if t < 0.04
					then 1
					elseif t < 0.06 then 0.4
					elseif t < 0.09 then 1
					else math.max(0, (0.24 - t) / 0.15)
				s.core.Transparency, s.halo.Transparency =
					NumberSequence.new(1 - power), NumberSequence.new(1 - power * 0.32)
			end
		end
	end
	for _, lamp in state.lights do
		if lamp.part.Transparency < 1 then
			local t = math.clamp((now - lamp.at) / 0.12, 0, 1)
			lamp.part.Transparency = t
			if lamp.light.Brightness > 0 then
				lamp.light.Brightness = math.sin(t * math.pi) * 6
			end
		end
	end
end

return Lightning
