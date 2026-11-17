--!strict
local Config = require(script.Parent.Parent.Config)
local cfg = Config.qualityRules
local Quality = {}
function Quality.new(saved: number?, now: number): any
	return {
		level = saved or Config.game.defaultAutoQuality,
		saved = saved or Config.game.defaultAutoQuality,
		mode = "auto",
		ceiling = Config.game.qualityLevels,
		time = 0,
		skipped = 0,
		samples = {},
		frames = 0,
		elapsed = 0,
		good = 0,
		upAt = -math.huge,
		downAt = -math.huge,
		saveAt = now,
	}
end
function Quality.select(s: any, mode: string): boolean
	local manual = { low = 1, normal = 2, high = 3 }
	if mode ~= "auto" and not manual[mode] then
		return false
	end
	s.mode, s.level = mode, manual[mode] or math.min(s.saved, s.ceiling)
	s.samples, s.frames, s.elapsed, s.good, s.skipped = {}, 0, 0, 0, 0
	return true
end
function Quality.step(s: any, dt: number, active: boolean, fps: number?): string?
	if s.mode ~= "auto" or not active or not (dt > 0 and dt < cfg.maxDt) then
		-- Suspended frames do not contribute to a continuous healthy interval.
		s.good = 0
		return nil
	end
	s.time += dt
	if s.skipped < cfg.skipSeconds then
		s.skipped += dt
		return nil
	end
	s.elapsed += dt
	s.frames += (fps or 1 / dt) * dt
	if s.elapsed < 1 then
		return nil
	end
	local rate = s.frames / s.elapsed
	table.insert(s.samples, { time = s.elapsed, frames = s.frames })
	s.frames, s.elapsed = 0, 0
	if #s.samples > cfg.windowSeconds then
		table.remove(s.samples, 1)
	end
	s.good = if rate >= cfg.upFps then s.good + 1 else 0
	local elapsed, frames = 0, 0
	for _, sample in s.samples do
		elapsed += sample.time
		frames += sample.frames
	end
	if elapsed >= cfg.windowSeconds and frames / elapsed < cfg.downFps and s.level > 1 then
		s.level -= 1
		if s.time - s.upAt <= cfg.pingPongSeconds then
			s.ceiling = s.level
		end
		s.downAt, s.good, s.samples = s.time, 0, {}
		return "auto_down"
	elseif
		s.good >= cfg.upSeconds
		and s.time - s.downAt >= cfg.cooldownSeconds
		and s.level < s.ceiling
	then
		s.level += 1
		s.upAt, s.good, s.samples = s.time, 0, {}
		return "auto_up"
	end
	return nil
end
function Quality.save(s: any, now: number): number?
	if s.mode == "auto" and s.level ~= s.saved and now - s.saveAt >= cfg.saveSeconds then
		s.saved, s.saveAt = s.level, now
		return s.level
	end
	return nil
end
return Quality
