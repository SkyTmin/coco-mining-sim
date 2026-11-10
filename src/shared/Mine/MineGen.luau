--!strict
--!native
--!optimize 2

local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Hash)
local Worlds = require(script.Parent.Worlds)
type World = Worlds.World

export type Find = { x: number, y: number, d: number, kind: string }
type Special = { d: number, kind: string }
type Entry = {
	key: number,
	cells: { number },
	kinds: { [number]: string },
	previous: Entry?,
	next: Entry?,
}

local CHUNK = Config.mine.chunk
local CACHE_SIZE = 256
local u32 = Hash.u32
local unit = Hash.unit
local step = Hash.step
local SCALE = 1 / 4294967296
local floor = math.floor
local MineGen = {}

local function chooseKind(key: number, salt: number, world: World): string
	local kinds = world.specials.kinds
	if #kinds == 1 then
		return kinds[1][1] :: string
	end
	local total = 0
	for _, pair in kinds do
		total += pair[2] :: number
	end
	local roll = unit(key, salt) * total
	for _, pair in kinds do
		roll -= pair[2] :: number
		if roll < 0 then
			return pair[1] :: string
		end
	end
	return kinds[#kinds][1] :: string
end

-- The chance applies to the first find; a second independent roll can add one more.
local function specialSlots(key: number, world: World): (number, number)
	local chance = world.specials.perChunk
	if key * SCALE >= chance then
		return 0, 0
	end
	local first = floor(unit(key, 2) * CHUNK) + 1
	if unit(key, 3) >= chance then
		return first, 0
	end
	local second = floor(unit(key, 4) * (CHUNK - 1)) + 1
	if second >= first then
		return first, second + 1
	end
	return second, first
end

local function fillQuota(key: number, world: World, reserved: number, counts: { number })
	local weights = world.weights
	local rareFrom = world.rareFrom
	local roll = step(key)
	local rich = 1 + world.richness * (2 * roll * SCALE - 1)
	local remaining = CHUNK
	for ore = #weights, 2, -1 do
		local expected = CHUNK * weights[ore]
		if ore >= rareFrom then
			expected *= rich
		end
		local amount = floor(expected)
		roll = step(roll)
		if roll * SCALE < expected - amount then
			amount += 1
		end
		amount = math.min(amount, remaining)
		counts[ore] = amount
		remaining -= amount
	end
	counts[1] = remaining
	-- Reserve special slots before ranking the ore slots, taking from the cheapest ore first.
	for ore = 1, #weights do
		if reserved == 0 then
			break
		end
		local amount = math.min(reserved, counts[ore])
		counts[ore] -= amount
		reserved -= amount
	end
end

function MineGen.quota(seed: number, x: number, y: number, c: number): { number }
	local world = Worlds.of(c * CHUNK)
	local key = u32(u32(seed, x, y), c)
	local first, second = specialSlots(key, world)
	local counts = table.create(#world.weights) :: { number }
	fillQuota(key, world, if second ~= 0 then 2 elseif first ~= 0 then 1 else 0, counts)
	return counts
end

function MineGen.specials(seed: number, x: number, y: number, c: number): { Special }
	local start = c * CHUNK
	local world = Worlds.of(start)
	local key = u32(u32(seed, x, y), c)
	local first, second = specialSlots(key, world)
	if first == 0 then
		return {}
	end
	local a = { d = start + first - 1, kind = chooseKind(key, 5, world) }
	if second == 0 then
		return { a }
	end
	local b = { d = start + second - 1, kind = chooseKind(key, 6, world) }
	return { a, b }
end

local function buildChunk(seed: number, x: number, y: number, c: number, key: number): Entry
	local start = c * CHUNK
	local world = Worlds.of(start)
	local word = u32(u32(seed, x, y), c)
	local first, second = specialSlots(word, world)
	local counts = table.create(#world.weights) :: { number }
	fillQuota(word, world, if second ~= 0 then 2 elseif first ~= 0 then 1 else 0, counts)
	local cells = table.create(CHUNK, 0)
	local kinds: { [number]: string } = {}
	if first ~= 0 then
		kinds[first] = chooseKind(word, 5, world)
	end
	if second ~= 0 then
		kinds[second] = chooseKind(word, 6, world)
	end
	local scores = Hash.noiseLine(seed, x, y, start, CHUNK)
	local order = table.create(CHUNK) :: { number }
	for i = 1, CHUNK do
		if i ~= first and i ~= second then
			table.insert(order, i)
		end
	end
	table.sort(order, function(a, b)
		if scores[a] ~= scores[b] then
			return scores[a] > scores[b]
		end
		return a < b
	end)
	local cursor = 1
	for ore = #world.weights, 1, -1 do
		for _ = 1, counts[ore] do
			cells[order[cursor]] = ore
			cursor += 1
		end
	end
	return { key = key, cells = cells, kinds = kinds }
end

local cache: { [number]: Entry } = {}
local activeSeed: number? = nil
local firstEntry: Entry? = nil
local lastEntry: Entry? = nil
local cacheSize = 0
local ROW_STRIDE = Config.mine.maxHeight + 1
local WIDTH_RADIUS = (Config.mine.maxWidth - 1) // 2
local CHUNK_STRIDE = Config.mine.maxWidth * ROW_STRIDE

local function unlink(entry: Entry)
	local previous, nextEntry = entry.previous, entry.next
	if previous then
		previous.next = nextEntry
	else
		firstEntry = nextEntry
	end
	if nextEntry then
		nextEntry.previous = previous
	else
		lastEntry = previous
	end
	entry.previous, entry.next = nil, nil
end

local function getChunk(seed: number, x: number, y: number, c: number): Entry
	if activeSeed ~= seed then
		table.clear(cache)
		activeSeed, firstEntry, lastEntry, cacheSize = seed, nil, nil, 0
	end
	local key = c * CHUNK_STRIDE + (x + WIDTH_RADIUS) * ROW_STRIDE + y
	local entry = cache[key]
	if entry then
		if entry == firstEntry then
			return entry
		end
		unlink(entry)
	else
		entry = buildChunk(seed, x, y, c, key)
		cache[key] = entry
		cacheSize += 1
		local oldest = lastEntry
		if cacheSize > CACHE_SIZE and oldest then
			cache[oldest.key] = nil
			unlink(oldest)
			cacheSize -= 1
		end
	end
	local head = firstEntry
	if head then
		head.previous = entry
	else
		lastEntry = entry
	end
	entry.next, firstEntry = head, entry
	return entry
end

function MineGen.cells(seed: number, x: number, y: number, c: number): { number }
	return table.clone(getChunk(seed, x, y, c).cells)
end

function MineGen.cellAt(seed: number, x: number, y: number, d: number): (number, string?)
	local entry = getChunk(seed, x, y, d // CHUNK)
	local offset = d % CHUNK + 1
	return entry.cells[offset], entry.kinds[offset]
end

function MineGen.rangeHist(
	seed: number,
	x: number,
	y: number,
	a: number,
	b: number,
	hist: { [number]: number },
	finds: { Find }
)
	if b <= a then
		return
	end
	local world = Worlds.of(a)
	local counts: { number } = {}
	local laneSeed: number? = nil
	for c = a // CHUNK, (b - 1) // CHUNK do
		local start = c * CHUNK
		if start == world.finish then
			world = Worlds.of(start)
		end
		local baseKey = world.index * 64
		local finish = start + CHUNK
		if a <= start and finish <= b then
			laneSeed = laneSeed or u32(seed, x, y)
			local word = u32(laneSeed, c)
			local first, second = specialSlots(word, world)
			fillQuota(word, world, if second ~= 0 then 2 elseif first ~= 0 then 1 else 0, counts)
			for ore = 1, #world.weights do
				local amount = counts[ore]
				if amount > 0 then
					local key = baseKey + ore
					hist[key] = (hist[key] or 0) + amount
				end
			end
			if first ~= 0 then
				table.insert(
					finds,
					{ x = x, y = y, d = start + first - 1, kind = chooseKind(word, 5, world) }
				)
				if second ~= 0 then
					table.insert(finds, {
						x = x,
						y = y,
						d = start + second - 1,
						kind = chooseKind(word, 6, world),
					})
				end
			end
		else
			local entry = getChunk(seed, x, y, c)
			for d = math.max(a, start), math.min(b, finish) - 1 do
				local offset = d - start + 1
				local ore = entry.cells[offset]
				if ore == 0 then
					table.insert(finds, { x = x, y = y, d = d, kind = entry.kinds[offset] })
				else
					local key = baseKey + ore
					hist[key] = (hist[key] or 0) + 1
				end
			end
		end
	end
end

return MineGen
