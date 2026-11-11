--!strict
-- [владелец] TZ-03g §4. Depths are measured in blocks from the old front.
local Wave = {}
Wave.pause = 0.25
Wave.lag = 0.14
export type Sweep = {
	depth: number,
	width: number,
	height: number,
	duration: number,
	radius: number,
	speed: number,
}
function Wave.radius(x: number, y: number, height: number): number
	return math.sqrt(x * x + (y - (height - 1) / 2) ^ 2)
end
function Wave.new(depth: number, width: number, height: number, duration: number): Sweep
	local radius = Wave.radius((width - 1) / 2, 0, height)
	return {
		depth = depth,
		width = width,
		height = height,
		duration = duration,
		radius = radius,
		speed = if depth > 0 then depth / (duration - Wave.pause - Wave.lag * radius) else 0,
	}
end
function Wave.at(s: Sweep, x: number, y: number, depth: number): number
	return Wave.pause
		+ Wave.lag * Wave.radius(x, y, s.height)
		+ (if s.speed > 0 then depth / s.speed else 0)
end
function Wave.cleared(s: Sweep, x: number, y: number, time: number): number
	local age = time - Wave.pause - Wave.lag * Wave.radius(x, y, s.height)
	return if age < 0 or s.speed == 0
		then 0
		else math.clamp(math.floor(age * s.speed) + 1, 0, s.depth)
end
function Wave.camera(s: Sweep, time: number): number
	return math.clamp((time - Wave.pause - Wave.lag * s.radius) * s.speed, 0, s.depth) - 2
end
return Wave
