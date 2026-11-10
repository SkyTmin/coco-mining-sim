--!strict

local Config = require(script.Parent.Parent.Config)
local fx = Config.fx
local S = Config.mine.blockSize
local REACH = fx.depth.fogEnd - S
local Ride = {}

export type Barrier = {
	depth: number,
	distance: number,
	layers: number,
	beforeDamage: number,
	afterDamage: number,
	holds: boolean,
}

export type PlateDisplay = { depth: number, distance: number, damage: number }

export type Timeline = {
	windup: number,
	fracture: number,
	empty: number,
	approach: number,
	distance: number,
	waveDistance: number,
	total: number,
}

function Ride.barrier(
	before: number,
	after: number,
	plate: number,
	beforeDamage: number,
	afterDamage: number
): Barrier?
	if before > plate or after < plate then
		return nil
	end
	local layers = plate - before
	return {
		depth = plate,
		distance = math.min(REACH, layers * S),
		layers = layers,
		beforeDamage = beforeDamage,
		afterDamage = afterDamage,
		holds = after == plate,
	}
end

function Ride.timeline(
	layers: number,
	ultimate: boolean,
	previousOffset: number?,
	barrier: Barrier?
): Timeline
	local scale = math.log10(math.max(1, layers))
	local ult = fx.ult
	local windup = if ultimate then ult.windup else 0
	local fracture = if ultimate
		then math.min(ult.fractureMax, ult.fractureMin + ult.fracturePerLog * scale)
		else 0
	local atPlate = barrier ~= nil and barrier.layers == 0
	local empty = if ultimate and not atPlate then ult.empty else 0
	local approach = if atPlate then 0 else ult.approachBase + ult.approachPerLog * scale
	local deep = ult.distanceDeep * math.max(0, scale - 1) ^ 2
	local distance = if ultimate
		then math.min(REACH, ult.distanceBase + ult.distancePerLog * scale + deep)
		else math.min(REACH, layers * S + (previousOffset or 0))
	if barrier and (barrier.holds or atPlate) then
		distance = barrier.distance
	end
	return {
		windup = windup,
		fracture = fracture,
		empty = empty,
		approach = approach,
		distance = distance,
		waveDistance = if barrier then barrier.distance else distance,
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
		return clear * visible * S, math.floor(clear * visible)
	end
	local depth = visible * S
	return depth + (timeline.waveDistance - depth) * ((progress - 0.68) / 0.32), visible
end

function Ride.plate(
	front: number,
	plate: number,
	damage: number,
	offset: number,
	barrier: Barrier?,
	phase: string,
	struck: boolean
): PlateDisplay?
	if barrier and (barrier.holds or phase == "windup" or phase == "fracture") then
		return {
			depth = barrier.depth,
			distance = if phase == "approach" or phase == "landed"
				then offset
				else barrier.distance,
			damage = if struck then barrier.afterDamage else barrier.beforeDamage,
		}
	end
	local layers = plate - front
	local distance = layers * S + offset
	if layers >= 0 and layers <= 100 and distance <= REACH then
		return { depth = plate, distance = distance, damage = damage }
	end
	return nil
end

return Ride
