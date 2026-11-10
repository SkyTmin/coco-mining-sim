--!strict

local HapticService = game:GetService("HapticService")
local UserInputService = game:GetService("UserInputService")
local Haptics = {}

local patterns = {
	block = { { 0, 0.18 }, { 13, 0.10 }, { 24, 0 } },
	buy = { { 0, 0.23 }, { 12, 0.16 }, { 23, 0 } },
	morph = { { 0, 0.49 }, { 27, 0.33 }, { 59, 0 } },
	world = { { 0, 0.53 }, { 29, 0.34 }, { 66, 0 } },
	ride = { { 0, 0.38 }, { 28, 0.27 }, { 55, 0 } },
	ultimate = { { 0, 0.84 }, { 34, 0.54 }, { 86, 0 } },
	plate = { { 0, 0.72 }, { 44, 0 }, { 95, 0 }, { 105, 0.66 }, { 155, 0 } },
}

function Haptics.new(parent: Instance)
	if
		not UserInputService.TouchEnabled
		or not HapticService:IsVibrationSupported(Enum.UserInputType.Touch)
	then
		return function(_event: string, _now: number, _enabled: boolean, _reduced: boolean) end
	end
	local effect = Instance.new("HapticEffect")
	effect.Type, effect.Name, effect.Parent = Enum.HapticEffectType.Custom, "MineVibration", parent
	local lastBlock, strongUntil = -math.huge, -math.huge
	return function(event: string, now: number, enabled: boolean, reduced: boolean)
		if not enabled then
			effect:Stop()
			return
		end
		local pattern = patterns[event]
		if not pattern or (now < strongUntil and event ~= "plate") then
			return
		end
		if event == "block" then
			if now - lastBlock < 0.25 then
				return
			end
			lastBlock = now
		else
			strongUntil = now + pattern[#pattern][1] / 1000
		end
		local keys = {}
		for _, key in pattern do
			table.insert(
				keys,
				FloatCurveKey.new(
					key[1],
					key[2] * (if reduced then 0.5 else 1),
					Enum.KeyInterpolationMode.Linear
				)
			)
		end
		effect:Stop()
		effect:SetWaveformKeys(keys)
		effect:Play()
	end
end

return Haptics
