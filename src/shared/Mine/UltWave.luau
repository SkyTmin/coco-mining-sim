--!strict
-- [владелец] TZ-03g §4, amended 11.11: the wedge lag is measured in layers.
local Wave = {}
Wave.pause = 0.25
Wave.lag = 2
Wave.gap = 3
export type Sweep =
	{ depth: number, width: number, height: number, duration: number, radius: number }
function Wave.radius(x: number, y: number, height: number): number
	return math.sqrt(x * x + (y - (height - 1) / 2) ^ 2)
end
function Wave.new(depth: number, width: number, height: number, duration: number): Sweep
	return {
		depth = depth,
		width = width,
		height = height,
		duration = duration,
		radius = Wave.radius((width - 1) / 2, 0, height),
	}
end
function Wave.front(s: Sweep, time: number): number
	local t = math.clamp((time - Wave.pause) / (s.duration - Wave.pause), 0, 1)
	return (s.depth + Wave.lag * s.radius) * t * t * (3 - 2 * t)
end
function Wave.at(s: Sweep, x: number, y: number, depth: number): number
	local target = (depth + Wave.lag * Wave.radius(x, y, s.height))
		/ (s.depth + Wave.lag * s.radius)
	local t = 0.5 - math.sin(math.asin(1 - 2 * math.clamp(target, 0, 1)) / 3)
	return Wave.pause + t * (s.duration - Wave.pause)
end
function Wave.cleared(s: Sweep, x: number, y: number, time: number): number
	if time < Wave.pause or s.depth == 0 then
		return 0
	end
	local boundary = Wave.front(s, time) - Wave.lag * Wave.radius(x, y, s.height)
	return if boundary < 0 then 0 else math.clamp(math.floor(boundary) + 1, 0, s.depth)
end
function Wave.camera(s: Sweep, time: number): number
	return math.max(0, Wave.front(s, time) - Wave.lag * s.radius - Wave.gap)
end
return Wave
