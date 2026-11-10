--!strict

local Lighting = game:GetService("Lighting")
local Intensity = {}
local levels = {
	{ shake = 0, flash = 0, fov = 0, freeze = 0 },
	{ shake = 0.05, flash = 0, fov = 0, freeze = 0 },
	{ shake = 0.15, flash = 0.08, fov = 8, freeze = 0.06 },
	{ shake = 0.3, flash = 0.15, fov = 15, freeze = 0.09 },
	{ shake = 0.4, flash = 0.20, fov = 25, freeze = 0.12 },
}

function Intensity.new(gui: ScreenGui): any
	local fx = Instance.new("ColorCorrectionEffect")
	fx.Name, fx.Parent = "MineFlash", Lighting
	local edges = {}
	for i = 1, 4 do
		local edge = Instance.new("Frame")
		edge.BorderSizePixel, edge.BackgroundTransparency, edge.ZIndex = 0, 1, 10
		edge.Size = if i <= 2 then UDim2.new(1, 0, 0, 18) else UDim2.new(0, 18, 1, 0)
		edge.Position = if i == 2
			then UDim2.new(0, 0, 1, -18)
			elseif i == 4 then UDim2.new(1, -18, 0, 0)
			else UDim2.fromOffset(0, 0)
		edge.Parent = gui
		edges[i] = edge
	end
	return {
		fx = fx,
		edges = edges,
		flashAt = -math.huge,
		flashEnd = 0,
		flashAmount = 0,
		color = Color3.new(1, 1, 1),
		queue = {},
		current = nil,
	}
end

function Intensity.flash(state: any, strength: number, color: Color3, now: number)
	if now - state.flashAt < 1 / 3 then
		return
	end
	state.flashAt, state.flashEnd, state.flashAmount, state.color =
		now, now + 0.18, math.min(strength, 0.2), color
end

function Intensity.push(state: any, tier: number, duration: number, lead: number, color: Color3)
	local event = {
		tier = tier,
		duration = duration,
		lead = lead,
		color = color,
		at = os.clock(),
		struck = false,
	}
	local current = state.current
	if current and current.tier >= 3 and event.at < current.at + current.duration then
		if tier >= 3 then
			table.insert(state.queue, event)
		end
		return
	end
	state.current = event
end

function Intensity.sample(
	state: any,
	now: number,
	reduced: boolean,
	active: boolean
): (number, Vector3, number)
	local event = state.current
	if event and now >= event.at + event.duration then
		event = table.remove(state.queue, 1)
		if event then
			event.at = now
		end
		state.current = event
	end
	local fov, pull, shake, dim = 70, 0, Vector3.zero, 0
	if active and event then
		local config = levels[event.tier + 1]
		local t = now - event.at
		if t < event.lead then
			fov -= 5 * math.clamp(t / math.max(event.lead, 0.01), 0, 1)
			dim = -0.1
		else
			local elapsed = t - event.lead
			if not event.struck then
				event.struck = true
				if config.flash > 0 then
					Intensity.flash(state, config.flash, event.color, now)
				end
			end
			local decay = math.max(0, 1 - elapsed / (event.duration - event.lead))
			local kick = math.min(1, elapsed / 0.15) * decay
			fov += config.fov * kick
			pull = if event.tier >= 2 then 1.5 * kick else 0
			shake = Vector3.new(math.noise(now * 21, 1), math.noise(now * 21, 2), 0)
				* config.shake
				* decay
		end
	end
	local flash = if active
		then state.flashAmount * math.clamp((state.flashEnd - now) / 0.18, 0, 1)
		else 0
	state.fx.Brightness = dim + (if reduced then 0 else flash)
	state.fx.TintColor = Color3.new(1, 1, 1):Lerp(state.color, if reduced then 0 else flash * 0.9)
	for _, edge in state.edges do
		edge.BackgroundColor3 = state.color
		edge.BackgroundTransparency = if reduced then 1 - flash else 1
	end
	if reduced then
		return 70 + (fov - 70) * 0.5, shake * 0.3, pull * 0.5
	end
	return fov, shake, pull
end

return Intensity
