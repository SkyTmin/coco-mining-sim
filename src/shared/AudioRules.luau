--!strict

local rules = require(script.Parent.Config).sounds.rules
local AudioRules = {}
local frequent: { [string]: boolean } = {
	hit_soft = true,
	break_soft = true,
	coin = true,
	buy_soft = true,
	level_tick = true,
	heavy_hit = true,
	crit_soft = true,
	coin_rain = true,
	locked = true,
}

function AudioRules.volume(name: string, gain: number): number
	local cap = if name == "link_note"
		then rules.linkVolume
		elseif name == "depth_knock" then rules.depthVolume
		elseif frequent[name] then rules.frequentVolume
		else rules.maxVolume
	return cap * math.clamp(gain, 0, 1)
end

function AudioRules.variant(count: number, last: number?, roll: number): number
	if count == 1 or not last then
		return roll
	end
	return if roll < last then roll else roll + 1
end

function AudioRules.hitGain(
	now: number,
	first: number,
	previous: number,
	gain: number
): (number, number)
	local gap = now - previous
	if gap >= 0.75 then
		return 1 - (1 - gain) * math.exp(-(gap - 0.5) * 4), now
	elseif now - first >= rules.fatigueDelay then
		return rules.fatigueGain + (gain - rules.fatigueGain) * math.exp(-gap * 1.8), first
	end
	return 1 - (1 - gain) * math.exp(-gap * 2), first
end

return AudioRules
