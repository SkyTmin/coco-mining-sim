--!strict
-- Deterministic family mechanics. Visual timing is returned as event data.
local Config = require(script.Parent.Parent.Config)
local Hash = require(script.Parent.Parent.Mine.Hash)
local State = require(script.Parent.Parent.Mine.MineState)
local Perks = {}
export type Point = { x: number, y: number, d: number }
export type Runtime = { frozen: { [number]: Point }, stormUntil: number, nextPierce: number }

function Perks.new(): Runtime
	return { frozen = {}, stormUntil = 0, nextPierce = 0 }
end

function Perks.count(
	family: string,
	rarity: string,
	seed: number,
	counter: number,
	effects: any,
	forced: boolean?
): number
	local cfg = Config.families[family]
	if not cfg then
		return 0
	end
	local perk = cfg.perks[rarity]
	if not perk then
		return 0
	end
	if
		not forced and (counter % perk.every ~= 0 or Hash.unit(seed, counter, 501) >= perk.chance)
	then
		return 0
	end
	local size = perk.size * effects.perkSize
	return math.floor(size) + (if Hash.unit(seed, counter, 503) < size % 1 then 1 else 0)
end

function Perks.freeze(runtime: Runtime, st: State.MineState, x: number, y: number, d: number)
	if d < State.barrier(st) and State.isSolid(st, x, y, d) then
		runtime.frozen[State.cellKey(x, y, d)] = { x = x, y = y, d = d }
	end
end

function Perks.frozen(runtime: Runtime, st: State.MineState): { Point }
	local points = {}
	for key, cell in runtime.frozen do
		if State.isSolid(st, cell.x, cell.y, cell.d) and cell.d < st.front + Config.mine.window then
			table.insert(points, cell)
		else
			runtime.frozen[key] = nil
		end
	end
	table.sort(points, function(a, b)
		return State.cellKey(a.x, a.y, a.d) < State.cellKey(b.x, b.y, b.d)
	end)
	return points
end

-- share of a perk spent on the nearest leftover blocks when it starts behind the front [решение 30 %]
local NEAR_SHARE = 0.3

function Perks.route(
	st: State.MineState,
	family: string,
	rarity: string,
	x: number,
	y: number,
	d: number,
	count: number,
	runtime: Runtime
): { Point }
	if count <= 0 or d >= State.barrier(st) then
		return {}
	end
	local radius = (st.width - 1) // 2
	local stop = math.min(st.front + Config.mine.window, State.barrier(st))
	local width = if family == "dynamite"
		then math.min(if rarity == "common" or rarity == "rare" then 3 else 5, st.width)
		else st.width
	local start = if family == "frost" then st.front else math.max(st.front, d)
	local nominal = Config.families[family].perks[rarity].size
	-- [вики 18 §3.2] Base explosions have their named footprint; skill growth may extend it.
	if family == "dynamite" and count <= nominal then
		stop = math.min(stop, start + (if rarity == "common" then 1 else 2))
	elseif family == "rift" and rarity == "legendary" and count <= nominal then
		stop = math.min(stop, start + 8)
	end
	local cx = math.clamp(x, -radius + (width - 1) // 2, radius - (width - 1) // 2)
	local positions = {}
	for column = -radius, radius do
		for row = 0, st.height - 1 do
			if family == "rift" and (column ~= x or (rarity ~= "legendary" and row ~= y)) then
				continue
			end
			if family == "dynamite" and math.abs(column - cx) > (width - 1) // 2 then
				continue
			end
			table.insert(
				positions,
				{ x = column, y = row, score = math.abs(column - x) * 3 + math.abs(row - y) }
			)
		end
	end
	table.sort(positions, function(a, b)
		return if a.score == b.score
			then State.laneKey(a.x, a.y) < State.laneKey(b.x, b.y)
			else a.score < b.score
	end)
	local route, seen = {}, {}
	local limit = math.min(count, Config.cascade.maxCells)
	local function add(column: number, row: number, depth: number)
		local key = State.cellKey(column, row, depth)
		if not seen[key] and depth < stop and State.isSolid(st, column, row, depth) then
			seen[key] = true
			table.insert(route, { x = column, y = row, d = depth })
		end
	end
	if family == "frost" then
		for _, cell in Perks.frozen(runtime, st) do
			if #route >= limit then
				return route
			end
			add(cell.x, cell.y, cell.d)
		end
	end
	-- [владелец 11.11: «все навыки частью должны бить ближайшие блоки в первом ряду»] every perk first spends a share on
	-- the front-most exposed leftovers: the shallowest layer first, closest to the hit first, so the wall keeps moving
	local near = math.min(limit, math.max(1, math.ceil(limit * NEAR_SHARE)))
	local leftovers = {}
	for depth = st.front, stop - 1 do
		if #leftovers >= near then
			break
		end
		for column = -radius, radius do
			for row = 0, st.height - 1 do
				if
					State.isSolid(st, column, row, depth)
					and State.isExposed(st, column, row, depth)
				then
					table.insert(leftovers, {
						x = column,
						y = row,
						d = depth,
						score = (depth - st.front) * 1000 + math.abs(column - x) * 3 + math.abs(
							row - y
						),
					})
				end
			end
		end
	end
	table.sort(leftovers, function(a, b)
		return if a.score == b.score
			then State.cellKey(a.x, a.y, a.d) < State.cellKey(b.x, b.y, b.d)
			else a.score < b.score
	end)
	for i = 1, math.min(near, #leftovers) do
		add(leftovers[i].x, leftovers[i].y, leftovers[i].d)
	end
	for depth = start, stop - 1 do
		local layerStart = #route
		for _, position in positions do
			-- [решение ТЗ-04 §4] Reserve a quarter of legendary lightning for the next layer.
			if
				family == "storm"
				and rarity == "legendary"
				and depth == start
				and #route - layerStart >= math.ceil(limit * 0.75)
			then
				break
			end
			if #route >= limit then
				return route
			end
			add(position.x, position.y, depth)
		end
	end
	return route
end

function Perks.ult(family: string?, runtime: Runtime, effects: any, now: number): any
	local cfg = family and Config.families[family]
	local ult = if cfg then cfg.ult else {}
	if ult.stormSeconds then
		runtime.stormUntil = now + ult.stormSeconds + effects.stormSeconds
	end
	if ult.nextPierce then
		runtime.nextPierce = ult.nextPierce
	end
	return { coinMultiplier = ult.coinMultiplier or 1, plateMultiplier = ult.plateMultiplier or 1 }
end

return Perks
