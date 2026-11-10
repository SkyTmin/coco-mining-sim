--!strict

local Lighting = game:GetService("Lighting")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Intensity = {}

function Intensity.new(): any
	local fx = Instance.new("ColorCorrectionEffect")
	fx.Name, fx.Parent = "MineFlash", Lighting
	return { fx = fx, flashAt = -math.huge, flashAmount = 0, shakeAt = -math.huge, shakeAmount = 0 }
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
	return frame:VectorToWorldSpace(
		Vector3.new(math.noise(now * 38, 1), math.noise(now * 38, 2), 0) * gain
	)
end

return Intensity
