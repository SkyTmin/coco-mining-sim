--!strict

local Lighting = game:GetService("Lighting")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Intensity = {}

function Intensity.new(): any
	local fx = Instance.new("ColorCorrectionEffect")
	fx.Name, fx.Parent = "MineFlash", Lighting
	return {
		fx = fx,
		flashAt = -math.huge,
		flashAmount = 0,
		shakeAt = -math.huge,
		shakeAmount = 0,
		trauma = 0,
		traumaAt = 0,
		frequency = 30,
		decay = 2.5,
	}
end

-- skill shakes [владелец 12.11: «камеру используй осмысленно»]: trauma in 0..1, the offset grows with its square, so
-- a light kick stays a tick and a blast really jolts; it never moves the view direction, only nudges the eye.
-- frequency gives the character: storm high and sharp, dynamite mid, the quake low and long.
function Intensity.trauma(state: any, amount: number, now: number, frequency: number, decay: number)
	local current = math.max(0, state.trauma - (now - state.traumaAt) * state.decay)
	state.trauma = math.min(1, current + amount)
	state.traumaAt = now
	if amount >= current * 0.5 then
		state.frequency, state.decay = frequency, decay
	end
end

function Intensity.flash(state: any, strength: number, color: Color3, now: number)
	if now - state.flashAt >= 1 / 3 then
		state.flashAt, state.flashAmount, state.color = now, math.min(strength, 0.2), color
	end
end

function Intensity.land(state: any, now: number, ultimate: boolean)
	state.shakeAt, state.shakeAmount = now, if ultimate then 0.28 else 0.11
end

function Intensity.sample(
	state: any,
	frame: CFrame,
	now: number,
	reduced: boolean,
	active: boolean
): Vector3
	local flash = if active and not reduced
		then state.flashAmount * math.clamp(1 - (now - state.flashAt) / 0.18, 0, 1)
		else 0
	state.fx.Brightness = flash
	state.fx.TintColor = if flash > 0
		then Color3.new(1, 1, 1):Lerp(state.color, flash * 0.9)
		else Color3.new(1, 1, 1)
	if not active then
		return Vector3.zero
	end
	local decay = math.clamp(1 - (now - state.shakeAt) / Config.fx.impactTime, 0, 1)
	local gain = decay * state.shakeAmount * (if reduced then 0.3 else 1)
	local trauma = math.max(0, state.trauma - (now - state.traumaAt) * state.decay)
	local push = trauma * trauma * 0.9 * (if reduced then 0.25 else 1)
	local f = state.frequency
	return frame:VectorToWorldSpace(
		Vector3.new(math.noise(now * 38, 1), math.noise(now * 38, 2), 0) * gain
			+ Vector3.new(math.noise(now * f, 7.3), math.noise(now * f, 11.1), 0) * push
	)
end

return Intensity
