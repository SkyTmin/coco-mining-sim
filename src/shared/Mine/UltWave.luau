--!strict
-- [владелец 11.11] TZ-03g §4: the stationary camera sees a dome run down the tunnel.
local Wave = {}
Wave.pause = 0.25
Wave.lag = 7
Wave.jitter = 0.04
Wave.hold = 0.35
Wave.fogStart = 60
Wave.fogEnd = 190
export type Sweep = {
	depth: number,
	width: number,
	height: number,
	radius2: number,
	duration: number,
	step: number,
}
function Wave.duration(depth: number): number
	return math.clamp(1.2 + 0.5 * math.log10(math.max(1, depth)), 1.5, 3.5)
end
function Wave.new(depth: number, width: number, height: number): Sweep
	local duration = Wave.duration(depth)
	return {
		depth = depth,
		width = width,
		height = height,
		radius2 = ((width - 1) / 2) ^ 2 + ((height - 1) / 2) ^ 2,
		duration = duration,
		step = duration / (depth + Wave.lag),
	}
end
function Wave.offset(s: Sweep, x: number, y: number): number
	local r2 = x * x + (y - (s.height - 1) / 2) ^ 2
	return if s.radius2 > 0 then Wave.lag * r2 / s.radius2 else 0
end
function Wave.noise(s: Sweep, x: number, y: number, d: number): number
	local v = math.sin((x + (s.width - 1) / 2) * 127.1 + (y + d * 7) * 311.7) * 43758.5453
	return v - math.floor(v)
end
function Wave.at(s: Sweep, x: number, y: number, d: number): number
	return Wave.pause + (d + Wave.offset(s, x, y)) * s.step + Wave.jitter * Wave.noise(s, x, y, d)
end
function Wave.front(s: Sweep, time: number): number
	return math.clamp((time - Wave.pause) / s.step, 0, s.depth)
end
function Wave.endAt(s: Sweep): number
	return Wave.pause + s.duration
end
function Wave.total(depth: number, approach: number): number
	return Wave.pause + Wave.duration(depth) + Wave.hold + approach
end
return Wave
