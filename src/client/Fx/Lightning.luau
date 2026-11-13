--!strict
-- Pooled lightning made of Beam segments (core + halo). A bolt is a jagged polyline: midpoint displacement, the
-- classic lightning construction (each pass splits the longest piece and pushes its middle sideways by a share of
-- its length). The old fixed widths (0.15 core on 5-stud blocks) were invisible [владелец 11.11: «эффект молнии не
-- вижу»]; widths, colour and life now come from a style, so the wave links stay thin and skill bolts are thick.
local Quality = require(script.Parent.Quality)
local Lightning = {}
local rng = Random.new()
local BLUE = Color3.fromRGB(139, 225, 255)
local SEGMENTS = 160

export type Style = {
	core: number?, -- width of the white core, studs
	halo: number?, -- width of the coloured glow
	color: Color3?, -- glow colour
	coreColor: Color3?,
	life: number?, -- seconds a segment lives (the flicker is scaled to it)
	jag: number?, -- sideways displacement, share of a piece's length
	pieces: number?, -- polyline pieces of the main stroke
	forks: number?, -- side forks that split off the stroke
	steady: boolean?, -- no flicker: a glowing crack rather than a discharge
}

local LINK: Style =
	{ core = 0.15, halo = 0.8, color = BLUE, life = 0.24, jag = 0.3, pieces = 4, forks = 1 }

function Lightning.new(parent: Instance): any
	local anchor = Instance.new("Part")
	anchor.Anchored, anchor.CanCollide, anchor.CanQuery, anchor.CanTouch, anchor.Transparency =
		true, false, false, false, 1
	anchor.Name, anchor.Parent = "LightningPool", parent
	local attachments, segments, lights = {}, {}, {}
	for i = 1, SEGMENTS * 2 do
		local point = Instance.new("Attachment")
		point.Parent = anchor
		attachments[i] = point
	end
	for i = 1, SEGMENTS do
		local core, halo = Instance.new("Beam"), Instance.new("Beam")
		for _, beam in { core, halo } do
			beam.Enabled, beam.FaceCamera, beam.LightEmission, beam.Parent = false, true, 1, anchor
			beam.LightInfluence, beam.Segments = 0, 1
		end
		core.ZOffset, halo.ZOffset = 0.05, 0
		segments[i] = { core = core, halo = halo, untilAt = 0, at = 0, life = 0.24 }
	end
	for i = 1, 6 do
		local flare = Instance.new("Part")
		flare.Shape, flare.Size, flare.Material, flare.Color =
			Enum.PartType.Ball, Vector3.one * 0.48, Enum.Material.Neon, BLUE
		flare.Anchored, flare.CanCollide, flare.CanQuery, flare.CanTouch, flare.CastShadow =
			true, false, false, false, false
		flare.Transparency, flare.Parent = 1, parent
		lights[i] = { part = flare, untilAt = 0, at = 0, size = 0.48 }
	end
	return { attachments = attachments, segments = segments, lights = lights, cursor = 1 }
end

local function free(state: any, now: number): number
	local count = 0
	for _, s in state.segments do
		if s.untilAt <= now then
			count += 1
		end
	end
	return math.min(count, Quality.available("links"))
end

local function segment(
	state: any,
	a: Vector3,
	b: Vector3,
	now: number,
	style: Style,
	taper: number
): boolean
	if Quality.reserve("links", 1, style.life or LINK.life) == 0 then
		return false
	end
	local n = #state.segments
	for step = 0, n - 1 do
		local i = (state.cursor + step - 1) % n + 1
		local s = state.segments[i]
		if s.untilAt <= now then
			state.cursor = i % n + 1
			local a0, a1 = state.attachments[i * 2 - 1], state.attachments[i * 2]
			a0.WorldPosition, a1.WorldPosition = a, b
			s.core.Attachment0, s.core.Attachment1, s.halo.Attachment0, s.halo.Attachment1 =
				a0, a1, a0, a1
			local core, halo = (style.core or 0.15) * taper, (style.halo or 0.8) * taper
			s.core.Width0, s.core.Width1 = core, core * 0.85
			s.halo.Width0, s.halo.Width1 = halo, halo * 0.85
			s.core.Color = ColorSequence.new(style.coreColor or Color3.fromRGB(240, 252, 255))
			s.halo.Color = ColorSequence.new(style.color or BLUE)
			s.core.Transparency, s.halo.Transparency =
				NumberSequence.new(0), NumberSequence.new(0.5)
			s.core.Enabled, s.halo.Enabled = true, true
			s.life = style.life or 0.24
			s.steady = style.steady == true
			s.at, s.untilAt = now, now + s.life
			return true
		end
	end
	return false
end

-- the jagged polyline from a to b
local function jagged(a: Vector3, b: Vector3, pieces: number, jag: number): { Vector3 }
	local points = { a, b }
	while #points <= pieces do
		local longest, index = 0, 1
		for i = 1, #points - 1 do
			local length = (points[i + 1] - points[i]).Magnitude
			if length > longest then
				longest, index = length, i
			end
		end
		local scale = longest * jag
		local along = (points[index + 1] - points[index]).Unit
		local side =
			along:Cross(if math.abs(along.Y) > 0.9 then Vector3.xAxis else Vector3.yAxis).Unit
		local up = along:Cross(side).Unit
		table.insert(
			points,
			index + 1,
			(points[index] + points[index + 1]) / 2
				+ side * rng:NextNumber(-scale, scale)
				+ up * rng:NextNumber(-scale, scale)
		)
	end
	return points
end

-- a bolt from a to b; returns the polyline (callers fork from it)
function Lightning.bolt(
	state: any,
	a: Vector3,
	b: Vector3,
	now: number,
	quality: number,
	branch: boolean,
	style: Style?
): { Vector3 }
	local look: Style = style or LINK
	local available = free(state, now)
	if available == 0 then
		return { a, b }
	end
	local wanted = look.pieces or (if quality > 1 then 6 else 4)
	local points = jagged(a, b, math.min(available, wanted), look.jag or 0.3)
	for i = 1, #points - 1 do
		segment(state, points[i], points[i + 1], now, look, 1)
	end
	local forks = if branch then (look.forks or 1) else 0
	for _ = 1, forks do
		if free(state, now) < 3 or #points < 4 then
			break
		end
		local start = points[rng:NextInteger(2, #points - 1)]
		local length = (b - a).Magnitude * rng:NextNumber(0.18, 0.35)
		local dir = (
			(b - a).Unit
			+ Vector3.new(rng:NextNumber(-1, 1), rng:NextNumber(-0.6, 0.8), rng:NextNumber(-1, 1))
		)
		local ending = start + dir.Unit * math.max(1, length)
		local fork = jagged(start, ending, 2, 0.35)
		for i = 1, #fork - 1 do
			segment(state, fork[i], fork[i + 1], now, look, 0.55 - 0.15 * (i - 1))
		end
	end
	for _, lamp in state.lights do
		if lamp.untilAt <= now then
			lamp.size = math.max(0.48, (look.core or 0.15) * 3.2)
			lamp.part.Size = Vector3.one * lamp.size
			lamp.part.Color = look.color or BLUE
			lamp.part.Position, lamp.part.Transparency = b, 0.05
			lamp.at, lamp.untilAt = now, now + 0.12
			break
		end
	end
	return points
end

function Lightning.step(state: any, now: number)
	for _, s in state.segments do
		if s.core.Enabled then
			if now >= s.untilAt then
				s.core.Enabled, s.halo.Enabled = false, false
			else
				-- the double flicker of real lightning: on, a dip, on again, then a fade (times scale with the life)
				local t = (now - s.at) / s.life
				local power = if s.steady
					then (if t < 0.12 then t / 0.12 elseif t < 0.55 then 1 else (1 - t) / 0.45)
					elseif t < 0.17 then 1
					elseif t < 0.25 then 0.35
					elseif t < 0.38 then 1
					else math.max(0, (1 - t) / 0.62)
				s.core.Transparency, s.halo.Transparency =
					NumberSequence.new(1 - power), NumberSequence.new(1 - power * 0.5)
			end
		end
	end
	for _, lamp in state.lights do
		if lamp.part.Transparency < 1 then
			local t = math.clamp((now - lamp.at) / 0.12, 0, 1)
			lamp.part.Transparency = t
		end
	end
end

return Lightning
