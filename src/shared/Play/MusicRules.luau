--!strict
local cfg = require(script.Parent.Parent.Config).music
local Rules = {}
function Rules.beat(now: number, bar: boolean?): number
	local interval = cfg.secondsPerMinute / cfg.bpm * (if bar then cfg.beatsPerBar else 1)
	return math.ceil(now / interval) * interval
end
function Rules.stingDelay(now: number): number
	local wait = Rules.beat(now) - now
	return if wait < cfg.quantizeSeconds then wait else 0
end
function Rules.new(): any
	return { weights = {}, mode = "silent", world = 1 }
end
local function sample(s: any, now: number)
	local move = s.move
	if not move then
		return
	end
	local alpha = math.clamp((now - move.at) / move.seconds, 0, 1)
	for key, from in move.from do
		s.weights[key] = from + ((move.to[key] or 0) - from) * alpha
	end
	for key, to in move.to do
		if move.from[key] == nil then
			s.weights[key] = to * alpha
		end
	end
	if alpha >= 1 then
		s.move = nil
	end
end
function Rules.step(s: any, input: any, now: number): any
	sample(s, now)
	local mode = if not input.active or input.transition
		then "silent"
		elseif input.fever then "fever"
		elseif input.tier >= cfg.fullTier and now - input.lastHit < cfg.idleSeconds then "full"
		else "base"
	local world = input.world
	if mode ~= s.mode or world ~= s.world then
		local previous = s.mode
		local swap = world ~= s.world or mode == "fever" or previous == "fever"
		local at = if previous == "silent" or mode == "silent" then now else Rules.beat(now, swap)
		local duration = if previous == "silent"
			then cfg.enterSeconds
			elseif swap then cfg.crossfadeSeconds
			elseif mode == "full" then cfg.layerInSeconds
			else cfg.layerOutSeconds
		local target = {}
		if mode ~= "silent" then
			target[tostring(world) .. ":base"] = if mode == "fever" then 0 else 1
			target[tostring(world) .. ":full"] = if mode == "full" then 1 else 0
			target[tostring(world) .. ":fever"] = if mode == "fever" then 1 else 0
		end
		s.move = { at = at, seconds = duration, from = table.clone(s.weights), to = target }
		s.mode, s.world = mode, world
		sample(s, now)
	end
	local volumes = {}
	local gain = (
		if input.transition then 0 else math.clamp(input.volume or cfg.defaultVolume, 0, 1)
	)
		* cfg.musicGain
		* (if input.duck then cfg.duckGain else 1)
	for key, weight in s.weights do
		volumes[key] = weight * gain
	end
	return {
		volumes = volumes,
		mode = mode,
		world = world,
		at = if s.move then s.move.at else now,
		duration = if s.move then s.move.seconds else 0,
	}
end
return Rules
