--!strict
--!native
--!optimize 2

local Hash = {}
local band, bxor, lshift, rshift = bit32.band, bit32.bxor, bit32.lshift, bit32.rshift
local MASK = 0xffffffff
local SCALE = 1 / 4294967296
local STEP = 3

function Hash.u32(a: number?, b: number?, c: number?, d: number?, e: number?, f: number?): number
	local h = 0x9e3779b9
	-- Each fold stays below the exact integer limit before reducing modulo 2^32.
	if a ~= nil then
		h = band(h * 65599 + band(a, MASK), MASK)
	end
	if b ~= nil then
		h = band(h * 65599 + band(b, MASK), MASK)
	end
	if c ~= nil then
		h = band(h * 65599 + band(c, MASK), MASK)
	end
	if d ~= nil then
		h = band(h * 65599 + band(d, MASK), MASK)
	end
	if e ~= nil then
		h = band(h * 65599 + band(e, MASK), MASK)
	end
	if f ~= nil then
		h = band(h * 65599 + band(f, MASK), MASK)
	end
	-- A 16-bit half times a 32-bit constant is still exact in a double.
	h = bxor(h, rshift(h, 16))
	h = band(band(h, 0xffff) * 0x85ebca6b + lshift(rshift(h, 16) * 0xca6b, 16), MASK)
	h = bxor(h, rshift(h, 13))
	h = band(band(h, 0xffff) * 0xc2b2ae35 + lshift(rshift(h, 16) * 0xae35, 16), MASK)
	return bxor(h, rshift(h, 16))
end

local u32 = Hash.u32

-- Same hash for two already-unsigned inputs; the range histogram calls this once per chunk.
function Hash.pair(a: number, b: number): number
	local h = band(0x9e3779b9 * 65599 + a, MASK)
	h = band(h * 65599 + b, MASK)
	h = bxor(h, rshift(h, 16))
	h = band(band(h, 0xffff) * 0x85ebca6b + lshift(rshift(h, 16) * 0xca6b, 16), MASK)
	h = bxor(h, rshift(h, 13))
	h = band(band(h, 0xffff) * 0xc2b2ae35 + lshift(rshift(h, 16) * 0xae35, 16), MASK)
	return bxor(h, rshift(h, 16))
end

function Hash.unit(a: number?, b: number?, c: number?, d: number?, e: number?, f: number?): number
	return u32(a, b, c, d, e, f) * SCALE
end

-- Advance a stream starting at a hashed word. The full product fits in 53 bits.
function Hash.step(word: number): number
	return (word * 1664525 + 1013904223) % 4294967296
end

local function lerp(a: number, b: number, t: number): number
	return a + (b - a) * t
end

local function plane(seed: number, x: number, y: number, z: number, tx: number, ty: number): number
	local a = u32(seed, x, y, z, 100)
	if tx ~= 0 then
		a = lerp(a, u32(seed, x + 1, y, z, 100), tx)
	end
	if ty == 0 then
		return a * SCALE
	end
	local b = u32(seed, x, y + 1, z, 100)
	if tx ~= 0 then
		b = lerp(b, u32(seed, x + 1, y + 1, z, 100), tx)
	end
	return lerp(a, b, ty) * SCALE
end

function Hash.noise(seed: number, x: number, y: number, d: number): number
	local gx, gy, gz = x // STEP, y // STEP, d // STEP
	local tx, ty, tz = x % STEP / STEP, y % STEP / STEP, d % STEP / STEP
	return lerp(plane(seed, gx, gy, gz, tx, ty), plane(seed, gx, gy, gz + 1, tx, ty), tz)
end

-- Adjacent depths share lattice samples. Evaluate each plane once for the whole line.
function Hash.noiseLine(
	seed: number,
	x: number,
	y: number,
	start: number,
	count: number
): { number }
	local gx, gy, gz = x // STEP, y // STEP, start // STEP
	local tx, ty, offset = x % STEP / STEP, y % STEP / STEP, start % STEP
	local lo = plane(seed, gx, gy, gz, tx, ty)
	local hi = plane(seed, gx, gy, gz + 1, tx, ty)
	local scores = table.create(count) :: { number }
	for i = 1, count do
		scores[i] = lerp(lo, hi, offset / STEP)
		offset += 1
		if offset == STEP and i < count then
			gz += 1
			offset = 0
			lo, hi = hi, plane(seed, gx, gy, gz + 1, tx, ty)
		end
	end
	return scores
end

return Hash
