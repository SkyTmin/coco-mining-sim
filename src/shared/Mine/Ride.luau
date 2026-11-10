--!strict

local Config = require(script.Parent.Parent.Config)
local fx = Config.fx
local Ride = {}

export type Timeline = {
	windup: number,
	fracture: number,
	empty: number,
	approach: number,
	distance: number,
	total: number,
}

function Ride.timeline(layers: number, ultimate: boolean, previousOffset: number?): Timeline
	local scale = math.log10(math.max(1, layers))
	local ult = fx.ult
	local windup = if ultimate then ult.windup else 0
	local fracture = if ultimate
		then math.min(ult.fractureMax, ult.fractureMin + ult.fracturePerLog * scale)
		else 0
	local empty = if ultimate then ult.empty else 0
	local approach = ult.approachBase + ult.approachPerLog * scale
	local reach = fx.fogEnd - Config.mine.blockSize
	local distance = if ultimate
		then math.min(reach, ult.distanceBase + ult.distancePerLog * scale)
		else math.min(reach, layers * Config.mine.blockSize + (previousOffset or 0))
	return {
		windup = windup,
		fracture = fracture,
		empty = empty,
		approach = approach,
		distance = distance,
		total = windup + fracture + empty + approach,
	}
end

function Ride.phase(timeline: Timeline, t: number): (string, number)
	if t < timeline.windup then
		return "windup", math.max(0, t) / timeline.windup
	end
	t -= timeline.windup
	if t < timeline.fracture then
		return "fracture", t / timeline.fracture
	end
	t -= timeline.fracture
	if t < timeline.empty then
		return "empty", t / timeline.empty
	end
	t -= timeline.empty
	if t < timeline.approach then
		return "approach", t / timeline.approach
	end
	return "landed", 1
end

function Ride.offset(timeline: Timeline, progress: number, ultimate: boolean): number
	if ultimate then
		-- Accelerate out of the distance, then brake over the final fifth.
		local remaining = if progress < 0.8 then 1 - 1.25 * progress ^ 2 else 5 * (1 - progress) ^ 2
		return timeline.distance * remaining
	end
	return timeline.distance * (1 - progress) ^ 3
end

function Ride.wave(timeline: Timeline, progress: number, layers: number): (number, number)
	local visible = math.min(layers, Config.mine.window)
	local clear = progress / 0.68
	if clear <= 1 then
		return clear * visible * Config.mine.blockSize, math.floor(clear * visible)
	end
	local depth = visible * Config.mine.blockSize
	return depth + (timeline.distance - depth) * ((progress - 0.68) / 0.32), visible
end

return Ride
