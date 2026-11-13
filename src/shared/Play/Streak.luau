--!strict
local Config = require(script.Parent.Parent.Config)
local cfg = Config.events.streak
local Streak = {}
function Streak.new(now: number): any
	return { gauge = 0, at = now, lastHit = now, maximum = 0 }
end
function Streak.tier(state: any): number
	local tier = 0
	for i, threshold in cfg.tiers do
		if state.gauge >= threshold then
			tier = i
		end
	end
	return tier
end
function Streak.multiplier(state: any): number
	return cfg.multipliers[Streak.tier(state)] or 1
end
function Streak.decay(state: any, now: number, frozen: boolean?)
	if now <= state.at then
		return
	end
	local dt = now - state.at
	if frozen then
		state.lastHit += dt
	else
		local elapsed = math.max(0, now - math.max(state.at, state.lastHit + cfg.grace))
		state.gauge = math.max(0, state.gauge - elapsed * cfg.decay)
	end
	state.at = now
end
function Streak.add(state: any, now: number, credit: number, source: string?)
	if source ~= nil and source ~= "hand" then
		return
	end
	state.gauge = math.min(cfg.cap, state.gauge + credit)
	state.at, state.lastHit = now, now
	state.maximum = math.max(state.maximum, Streak.tier(state))
end
return Streak
