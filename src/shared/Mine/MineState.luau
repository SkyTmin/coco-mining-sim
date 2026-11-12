--!strict
--!native
--!optimize 2

local Config = require(script.Parent.Parent.Config)
local Worlds = require(script.Parent.Worlds)

export type Range = { x: number, y: number, a: number, b: number }
export type MineState = {
	v: number,
	seed: number,
	width: number,
	height: number,
	front: number,
	top: { [number]: number },
	holes: { [number]: { number } },
	holeCount: number,
	damage: { [number]: number },
	plateDamage: number,
	chests: {
		[number]: { x: number, y: number, d: number, tier: number, stage: string?, kind: string },
	},
	chestFrequency: number?,
}

local mine = Config.mine
local RADIUS = (mine.maxWidth - 1) // 2
local ROW_STRIDE = mine.maxHeight + 1
local CELL_STRIDE = mine.maxWidth * ROW_STRIDE
local DEPTH_END = mine.maxDepth + 1
local U32_MAX = 0xffffffff
local MineState = {}
MineState.version = 2

local function integer(value: any, minimum: number, maximum: number): boolean
	return type(value) == "number" and value >= minimum and value <= maximum and value % 1 == 0
end

local function validDimensions(width: number, height: number): boolean
	return integer(width, 1, mine.maxWidth)
		and width % 2 == 1
		and integer(height, 1, mine.maxHeight)
end

local function laneKey(x: number, y: number): number
	return (x + RADIUS) * ROW_STRIDE + y
end
MineState.laneKey = laneKey

function MineState.cellKey(x: number, y: number, d: number): number
	return d * CELL_STRIDE + laneKey(x, y)
end

function MineState.new(seed: number, width: number, height: number, depth: number?): MineState
	assert(integer(seed, 0, U32_MAX), "Seed must be a u32")
	assert(validDimensions(width, height), "Invalid wall dimensions")
	local front = depth or 0
	assert(integer(front, 0, DEPTH_END), "Invalid mine depth")
	local top: { [number]: number } = {}
	local radius = (width - 1) // 2
	for x = -radius, radius do
		for y = 0, height - 1 do
			top[laneKey(x, y)] = front
		end
	end
	return {
		v = MineState.version,
		seed = seed,
		width = width,
		height = height,
		front = front,
		top = top,
		holes = {},
		holeCount = 0,
		damage = {},
		plateDamage = 0,
		chests = {},
	}
end

local function inWall(st: MineState, x: number, y: number): boolean
	local radius = (st.width - 1) // 2
	return integer(x, -radius, radius) and integer(y, 0, st.height - 1)
end
MineState.inWall = inWall

-- First pair whose right endpoint is at least d, including an adjacent interval.
local function firstEndingAt(holes: { number }, d: number): number
	local lo, hi = 0, #holes // 2
	while lo < hi do
		local mid = (lo + hi) // 2
		if holes[mid * 2 + 2] < d then
			lo = mid + 1
		else
			hi = mid
		end
	end
	return lo * 2 + 1
end

local function solidInLane(st: MineState, lane: number, d: number): boolean
	if d < st.top[lane] then
		return false
	end
	local holes = st.holes[lane]
	if not holes then
		return true
	end
	local i = firstEndingAt(holes, d)
	return i > #holes or d < holes[i] or d == holes[i + 1]
end

function MineState.isSolid(st: MineState, x: number, y: number, d: number): boolean
	return inWall(st, x, y)
		and integer(d, st.front, mine.maxDepth)
		and solidInLane(st, laneKey(x, y), d)
end

function MineState.isExposed(st: MineState, x: number, y: number, d: number): boolean
	if not MineState.isSolid(st, x, y, d) then
		return false
	end
	if d == st.front then
		return true
	end
	local lane = laneKey(x, y)
	local radius = (st.width - 1) // 2
	return not solidInLane(st, lane, d - 1)
		or (x > -radius and not solidInLane(st, lane - ROW_STRIDE, d))
		or (x < radius and not solidInLane(st, lane + ROW_STRIDE, d))
		or (y > 0 and not solidInLane(st, lane - 1, d))
		or (y + 1 < st.height and not solidInLane(st, lane + 1, d))
end

function MineState.barrier(st: MineState): number
	local world = Worlds.of(st.front)
	return if st.front < world.finish then world.plateDepth else DEPTH_END
end

-- Used by a piercing hit to skip a cleared prefix or interval in one step.
function MineState.nextSolid(st: MineState, x: number, y: number, d: number): number
	local lane = laneKey(x, y)
	d = math.max(d, st.top[lane])
	local holes = st.holes[lane]
	if holes then
		local i = firstEndingAt(holes, d)
		if i <= #holes and d >= holes[i] then
			return holes[i + 1]
		end
	end
	return d
end

local function record(
	st: MineState,
	lane: number,
	x: number,
	y: number,
	a: number,
	b: number,
	out: { Range }
)
	table.insert(out, { x = x, y = y, a = a, b = b })
	if next(st.damage) then
		for d = a, math.min(b, st.front + mine.window) - 1 do
			st.damage[d * CELL_STRIDE + lane] = nil
		end
	end
end

-- Merge with intervals touching the cut. Only the intervening solid spans go into out.
local function cut(
	st: MineState,
	x: number,
	y: number,
	a: number,
	b: number,
	out: { Range }
): boolean
	local lane = laneKey(x, y)
	local top = st.top[lane]
	a = math.max(a, top)
	if b <= a then
		return false
	end
	local holes = st.holes[lane]
	if not holes then
		record(st, lane, x, y, a, b, out)
		if a == top then
			st.top[lane] = b
		else
			st.holes[lane] = { a, b }
			st.holeCount += 1
		end
		return true
	end

	local first = firstEndingAt(holes, a)
	local oldLength = #holes
	if first <= oldLength and holes[first] <= a and holes[first + 1] >= b then
		return false
	end

	local cursor, left, right, i = a, a, b, first
	while i <= oldLength and holes[i] <= b do
		local start, finish = holes[i], holes[i + 1]
		if cursor < start then
			record(st, lane, x, y, cursor, start, out)
		end
		cursor = math.max(cursor, finish)
		left, right = math.min(left, start), math.max(right, finish)
		i += 2
	end
	if cursor < b then
		record(st, lane, x, y, cursor, b, out)
	end

	local kept = if a == top then 0 else 2
	local sizeChange = kept - (i - first)
	if sizeChange ~= 0 then
		table.move(holes, i, oldLength, first + kept)
		for index = oldLength + sizeChange + 1, oldLength do
			holes[index] = nil
		end
		st.holeCount += sizeChange // 2
	end
	if kept == 0 then
		st.top[lane] = right
		if #holes == 0 then
			st.holes[lane] = nil
		end
	else
		holes[first], holes[first + 1] = left, right
	end
	return true
end

function MineState.removeCell(
	st: MineState,
	x: number,
	y: number,
	d: number,
	out: { Range }
): boolean
	if
		not inWall(st, x, y)
		or not integer(d, st.front, math.min(st.front + mine.window - 1, mine.maxDepth))
		or d >= MineState.barrier(st)
	then
		return false
	end
	return cut(st, x, y, d, d + 1, out)
end

function MineState.removeRange(
	st: MineState,
	x: number,
	y: number,
	a: number,
	b: number,
	out: { Range }
)
	if inWall(st, x, y) and a % 1 == 0 and b % 1 == 0 then
		cut(st, x, y, a, math.min(b, MineState.barrier(st)), out)
	end
end

function MineState.removeLayers(st: MineState, a: number, b: number, out: { Range })
	b = math.min(b, MineState.barrier(st))
	if a % 1 ~= 0 or b % 1 ~= 0 or b <= a then
		return
	end
	local radius = (st.width - 1) // 2
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			cut(st, x, y, a, b, out)
		end
	end
end

-- One plate spans the wall. Its own removal is separate from ore and find accounting.
function MineState.breakPlate(st: MineState): boolean
	local depth = MineState.barrier(st)
	if depth == DEPTH_END then
		return false
	end
	for _, top in st.top do
		if top ~= depth then
			return false
		end
	end
	for lane in st.top do
		st.top[lane] = depth + 1
	end
	st.plateDamage = 0
	return true
end

function MineState.advance(st: MineState): number
	local front = st.front
	local nextFront = DEPTH_END
	for _, top in st.top do
		nextFront = math.min(nextFront, top)
	end
	if nextFront > front then
		if nextFront > MineState.barrier(st) then
			st.plateDamage = 0
		end
		st.front = nextFront
		for key in st.damage do
			if key // CELL_STRIDE < nextFront then
				st.damage[key] = nil
			end
		end
	end
	return nextFront - front
end

function MineState.widen(st: MineState, newWidth: number): boolean
	if newWidth <= st.width or not validDimensions(newWidth, st.height) then
		return false
	end
	local radius = (newWidth - 1) // 2
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			local lane = laneKey(x, y)
			if st.top[lane] == nil then
				st.top[lane] = st.front
			end
		end
	end
	st.width = newWidth
	return true
end

function MineState.narrow(st: MineState, newWidth: number): boolean
	if newWidth >= st.width or not validDimensions(newWidth, st.height) then
		return false
	end
	local oldRadius, radius = (st.width - 1) // 2, (newWidth - 1) // 2
	for x = -oldRadius, oldRadius do
		if math.abs(x) > radius then
			for y = 0, st.height - 1 do
				local lane = laneKey(x, y)
				local holes = st.holes[lane]
				if holes then
					st.holeCount -= #holes // 2
				end
				st.top[lane], st.holes[lane] = nil, nil
			end
		end
	end
	for key in st.damage do
		if st.top[key % CELL_STRIDE] == nil then
			st.damage[key] = nil
		end
	end
	st.width = newWidth
	MineState.advance(st)
	return true
end

function MineState.compact(st: MineState, out: { Range })
	while st.holeCount > mine.maxHoles do
		local lane = math.huge
		local longest: { number } = {}
		for key, holes in st.holes do
			if #holes > #longest or (#holes == #longest and key < lane) then
				lane, longest = key, holes
			end
		end
		assert(#longest >= 4, "Too many holes to compact")
		local gap, pair = math.huge, 1
		for i = 1, #longest - 2, 2 do
			local distance = longest[i + 2] - longest[i + 1]
			if distance < gap then
				gap, pair = distance, i
			end
		end
		local x, y = lane // ROW_STRIDE - RADIUS, lane % ROW_STRIDE
		record(st, lane, x, y, longest[pair + 1], longest[pair + 2], out)
		longest[pair + 1] = longest[pair + 3]
		table.remove(longest, pair + 3)
		table.remove(longest, pair + 2)
		st.holeCount -= 1
	end
end

function MineState.check(st: MineState): (boolean, string?)
	if st.v ~= MineState.version or not integer(st.seed, 0, U32_MAX) then
		return false, "Invalid version or seed"
	end
	if not validDimensions(st.width, st.height) then
		return false, "Invalid wall dimensions"
	end
	if not integer(st.front, 0, DEPTH_END) then
		return false, "Invalid front depth"
	end
	if not integer(st.holeCount, 0, mine.maxHoles) then
		return false, "Invalid hole count"
	end
	if type(st.top) ~= "table" or type(st.holes) ~= "table" or type(st.damage) ~= "table" then
		return false, "Missing mine state tables"
	end
	local barrier = MineState.barrier(st)
	local hp = if barrier == DEPTH_END then 0 else Worlds.of(st.front).plate.hp
	if
		type(st.plateDamage) ~= "number"
		or st.plateDamage < 0
		or not (st.plateDamage == 0 or st.plateDamage < hp)
	then
		return false, "Invalid plate damage"
	end
	local count, lanes, minimum = 0, 0, DEPTH_END
	for lane, top in st.top do
		if
			not integer(lane, 0, CELL_STRIDE - 1)
			or not inWall(st, lane // ROW_STRIDE - RADIUS, lane % ROW_STRIDE)
			or not integer(top, st.front, barrier)
		then
			return false, "Invalid lane top"
		end
		minimum = math.min(minimum, top)
		lanes += 1
	end
	if lanes ~= st.width * st.height or minimum ~= st.front then
		return false, "Front differs from minimum top or missing lanes"
	end
	for lane, holes in st.holes do
		local previous = st.top[lane]
		if previous == nil or type(holes) ~= "table" or #holes == 0 or #holes % 2 ~= 0 then
			return false, "Invalid hole lane or interval list"
		end
		for index in holes do
			if not integer(index, 1, #holes) then
				return false, "Invalid hole list index"
			end
		end
		for i = 1, #holes, 2 do
			local a, b = holes[i], holes[i + 1]
			if not integer(a, previous + 1, barrier - 1) or not integer(b, a + 1, barrier) then
				return false, "Overlapping, adjacent or out-of-bounds interval"
			end
			previous = b
			count += 1
		end
	end
	if count ~= st.holeCount then
		return false, "Hole count differs from interval count"
	end
	local limit = math.min(barrier, st.front + mine.window)
	for key, damage in st.damage do
		if not integer(key, 0, DEPTH_END * CELL_STRIDE - 1) then
			return false, "Invalid damage key"
		end
		local d, lane = key // CELL_STRIDE, key % CELL_STRIDE
		if
			d >= limit
			or st.top[lane] == nil
			or not solidInLane(st, lane, d)
			or not (type(damage) == "number" and damage > 0 and damage < 1)
		then
			return false, "Damage outside a solid ordinary cell in the window"
		end
	end
	return true
end

return MineState
