--!strict
local Hash = require(script.Parent.Hash)

-- [владелец] TZ-03g §§2–4 and the approved 4x4 demo.
local Rules = {
	grid = 8,
	size = 0.625,
	smallSize = 0.3125,
	release = 0.14,
	shrinkAt = 0.45,
	fadeAt = 0.55,
	lifeMin = 0.50,
	lifeMax = 0.87,
	speedMin = 1.4,
	speedMax = 2.8,
	rise = 4.06,
	relax = 2.5,
	drag = 2.5 / math.log(2),
	surfaceOffset = 0.02,
	pool = 400,
	recolorAfter = 0.9,
	waitFrames = 2,
	maxEmit = 400,
	maxParticles = 6000,
	nearLayers = 10,
	farShrink = 0.12,
}
local function smooth(t: number): number
	return t * t * (3 - 2 * t)
end
function Rules.noise(x: number, y: number, seed: number): number
	local ix, iy = math.floor(x), math.floor(y)
	local u, v = smooth(x - ix), smooth(y - iy)
	local a = Hash.unit(ix, iy, seed, 307)
	local b = Hash.unit(ix + 1, iy, seed, 307)
	local c = Hash.unit(ix, iy + 1, seed, 307)
	local d = Hash.unit(ix + 1, iy + 1, seed, 307)
	return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
end
function Rules.delay(distance: number, noise: number): number
	return Rules.release * (0.65 * math.min(1, distance / 3.75) + 0.35 * noise)
end
function Rules.stride(faces: number, available: number, reduced: boolean): number
	if faces == 0 then
		return 0
	end
	if not reduced and faces * 64 <= available then
		return 1
	end
	return if faces * 16 <= available then 2 else 0
end
-- [Claude 11.11] the ult wave must stay readable far down the tunnel, as in the approved 3D demo: near blocks
-- give 16 grains of 0.625, the middle distance 4 grains of 1.25, the far tunnel one grain of 2.5 (half a block) —
-- a far grain is a pixel or two on screen, so fewer but bigger grains keep the dust trail visible within budget.
-- [владелец 11.11] longer: the wave now runs to 300 layers (1 500 studs); the farthest blocks turn into one grain of
-- a whole face, still a few pixels on screen in the haze.
Rules.bands = {
	{ reach = 60, stride = 2, size = 0.625 },
	{ reach = 220, stride = 4, size = 1.25 },
	{ reach = 600, stride = 8, size = 2.5 },
	{ reach = 1600, stride = 8, size = 5 },
}
function Rules.lod(distance: number): (number, number)
	for _, band in Rules.bands do
		if distance <= band.reach then
			return band.stride, band.size
		end
	end
	return 0, 0
end
function Rules.position(t: number, vx: number, vy: number, vz: number): (number, number, number)
	local drift = (1 - math.exp(-Rules.relax * t)) / Rules.relax
	return vx * drift, Rules.rise * t + (vy - Rules.rise) * drift, vz * drift
end
return table.freeze(Rules)
