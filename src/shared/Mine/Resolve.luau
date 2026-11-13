--!strict
--!native
--!optimize 2

local Config = require(script.Parent.Parent.Config)
local MineState = require(script.Parent.MineState)
local MineGen = require(script.Parent.MineGen)
local Shapes = require(script.Parent.Shapes)
local Worlds = require(script.Parent.Worlds)
local Power = require(script.Parent.Parent.Play.Power)
local WallChests = require(script.Parent.Parent.Play.WallChests)
type State = MineState.MineState
type Range = MineState.Range

export type Pick = {
	strength: number,
	shape: string,
	ultLayers: number,
	chestFrequency: number?,
	plateMultiplier: number?,
	forcedPierce: number?,
	brittle: boolean?,
	marks: any?,
}
export type HitResult = {
	cells: { { x: number, y: number, d: number, gen: number } },
	runs: { Range },
	hist: { [number]: number },
	finds: { MineGen.Find },
	blocks: number,
	plateHit: number?,
	plateBroken: boolean,
	plateReward: number?,
}

local mine = Config.mine
local DEPTH_END = mine.maxDepth + 1
local Resolve = {}

local function result(): HitResult
	return { cells = {}, runs = {}, hist = {}, finds = {}, blocks = 0, plateBroken = false }
end

local function describeRange(
	res: HitResult,
	windowEnd: number,
	x: number,
	y: number,
	a: number,
	b: number
)
	for d = a, math.min(windowEnd, b) - 1 do
		table.insert(res.cells, { x = x, y = y, d = d, gen = 0 })
	end
	if b > windowEnd then
		table.insert(res.runs, { x = x, y = y, a = math.max(a, windowEnd), b = b })
	end
end

local function markedHP(pick: Pick, x: number, y: number, d: number): number?
	local marks = pick.marks
	if not marks then
		return nil
	end
	if marks.rubble[MineState.cellKey(x, y, d)] then
		return Config.events.bomb.rubbleHits
	end
	local bomb = marks.bomb
	if bomb and bomb.cell.x == x and bomb.cell.y == y and bomb.cell.d == d then
		return 1
	end
	return nil
end

local function tally(st: State, res: HitResult, out: { Range }, pick: Pick?)
	MineState.compact(st, out)
	local windowEnd = st.front + mine.window
	for _, run in out do
		describeRange(res, windowEnd, run.x, run.y, run.a, run.b)
		if pick and pick.marks and next(pick.marks.rubble) then
			local start = run.a
			for d = run.a, run.b - 1 do
				local key = MineState.cellKey(run.x, run.y, d)
				if pick.marks.rubble[key] then
					if start < d then
						MineGen.rangeHist(st.seed, run.x, run.y, start, d, res.hist, res.finds)
					end
					start = d + 1
					pick.marks.rubble[key] = nil
				end
			end
			if start < run.b then
				MineGen.rangeHist(st.seed, run.x, run.y, start, run.b, res.hist, res.finds)
			end
		else
			MineGen.rangeHist(st.seed, run.x, run.y, run.a, run.b, res.hist, res.finds)
		end
		res.blocks += run.b - run.a
	end
	if pick and pick.chestFrequency then
		WallChests.tally(st, out, res, pick.chestFrequency)
	end
end

local function hitPlate(st: State, depth: number, amount: number, res: HitResult)
	-- A caller may issue another hit before advancing; a plate is awarded only once.
	if not MineState.isSolid(st, 0, 0, depth) then
		return
	end
	local world = Worlds.of(depth)
	res.plateHit = amount
	st.plateDamage += amount
	if st.plateDamage >= world.plate.hp * (1 - 1e-12) then
		assert(MineState.breakPlate(st), "A plate must be exposed across the wall before it breaks")
		res.plateBroken, res.plateReward = true, world.plate.reward
		res.blocks += 1
		local radius = (st.width - 1) // 2
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				describeRange(res, st.front + mine.window, x, y, depth, depth + 1)
			end
		end
	end
end

local function damageCell(
	st: State,
	x: number,
	y: number,
	d: number,
	hp: number,
	amount: number,
	out: { Range }
): number?
	local key = MineState.cellKey(x, y, d)
	local left = (1 - (st.damage[key] or 0)) * hp
	if amount >= left * (1 - 1e-12) then
		MineState.removeCell(st, x, y, d, out)
		return math.max(0, amount - left)
	end
	local progress = 1 - (left - amount) / hp
	-- Tiny crack overflow can round to zero at high hardness; zero is not a damaged cell.
	if progress > 0 then
		st.damage[key] = progress
	end
	return nil
end

local neighbors = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }

function Resolve.hit(
	st: State,
	pick: Pick,
	x: number,
	y: number,
	d: number,
	strike: Power.Strike?
): HitResult?
	local strength = if strike then strike.strength else pick.strength
	if
		not (strength > 0 and strength < math.huge)
		or d >= st.front + mine.window
		or not MineState.isExposed(st, x, y, d)
	then
		return nil
	end

	local barrier = MineState.barrier(st)
	local res = result()
	if d >= barrier then
		if d ~= st.front or d ~= barrier then
			return nil
		end
		hitPlate(
			st,
			barrier,
			Power.plate(strength, Worlds.of(barrier).plate.hp, false) * (pick.plateMultiplier or 1),
			res
		)
		return res
	end

	local shape = Shapes.cells(pick.shape, x, y, st.width, st.height)
	if #shape == 0 then
		return nil
	end
	-- A translated cross cannot reach an isolated corner of a three-row wall.
	if pick.shape == "cross5" then
		local hasSolid = false
		for _, cell in shape do
			hasSolid = hasSolid or MineState.isSolid(st, cell.x, cell.y, d)
		end
		if not hasSolid then
			shape = { { x = x, y = y } }
		end
	end
	local out: { Range } = {}
	local hardness = Worlds.durability(d)
	local hp = Power.blockHP(hardness, pick.strength)
	local extra = math.max(Power.pierce(hardness, strength, strike), pick.forcedPierce or 1) - 1
	local overflow: { { x: number, y: number, amount: number } }? = if strike and strike.cracks
		then {}
		else nil
	for _, cell in shape do
		local column, row = cell.x, cell.y
		if MineState.isSolid(st, column, row, d) then
			local chest = pick.chestFrequency
				and WallChests.at(st, column, row, d, pick.chestFrequency)
			local special = markedHP(pick, column, row, d)
			local amount = if chest or special then 1 else if pick.brittle then hp else strength
			local excess = damageCell(
				st,
				column,
				row,
				d,
				if chest then Config.chests.wall.hits else special or hp,
				amount,
				out
			)
			if excess then
				if overflow and excess > 0 then
					table.insert(overflow, { x = column, y = row, amount = excess })
				end
				local nextDepth = d + 1
				for _ = 1, (if chest then 0 else extra) do
					nextDepth = MineState.nextSolid(st, column, row, nextDepth)
					if nextDepth >= barrier then
						break
					end
					local nextChest = pick.chestFrequency
						and WallChests.at(st, column, row, nextDepth, pick.chestFrequency)
					if nextChest then
						break
					end
					MineState.removeRange(st, column, row, nextDepth, nextDepth + 1, out)
					nextDepth += 1
				end
			end
		end
	end
	if overflow then
		for _, spill in overflow do
			for _, offset in neighbors do
				local column, row = spill.x + offset[1], spill.y + offset[2]
				if MineState.isExposed(st, column, row, d) then
					if
						pick.chestFrequency
						and WallChests.at(st, column, row, d, pick.chestFrequency)
					then
						continue
					end
					local special = markedHP(pick, column, row, d)
					damageCell(
						st,
						column,
						row,
						d,
						special or hp,
						if special then 1 else spill.amount,
						out
					)
					break
				end
			end
		end
	end
	tally(st, res, out, pick)
	return res
end

-- Perks hit each requested block once, with ordinary HP and no recursive procs or piercing.
function Resolve.perk(
	st: State,
	pick: Pick,
	points: { { x: number, y: number, d: number } }
): HitResult
	local res, out = result(), {}
	local barrier = MineState.barrier(st)
	for _, cell in points do
		if cell.d >= barrier or not MineState.isExposed(st, cell.x, cell.y, cell.d) then
			continue
		end
		local chest = pick.chestFrequency
			and WallChests.at(st, cell.x, cell.y, cell.d, pick.chestFrequency)
		local hp = Power.blockHP(Worlds.durability(cell.d), pick.strength)
		local special = markedHP(pick, cell.x, cell.y, cell.d)
		damageCell(
			st,
			cell.x,
			cell.y,
			cell.d,
			if chest then Config.chests.wall.hits else special or hp,
			if chest then Config.chests.wall.hits else if special then 1 else pick.strength,
			out
		)
	end
	tally(st, res, out, pick)
	return res
end

-- A blast removes only still-solid cells, without exposure or plate damage.
function Resolve.bomb(st: State, pick: Pick, cells: { any }): HitResult
	local res, out = result(), {}
	local barrier = MineState.barrier(st)
	for _, cell in cells do
		if cell.d < barrier then
			MineState.removeCell(st, cell.x, cell.y, cell.d, out)
		end
	end
	tally(st, res, out, pick)
	return res
end

function Resolve.ult(st: State, pick: Pick): HitResult
	local res = result()
	local layers = pick.ultLayers
	if layers <= 0 or layers % 1 ~= 0 then
		return res
	end
	local out: { Range } = {}
	local barrier = MineState.barrier(st)
	local finish = st.front + layers
	local left = (finish - math.max(st.front, barrier)) / layers
	MineState.removeLayers(st, st.front, finish, out)
	tally(st, res, out, pick)
	if barrier < DEPTH_END and (finish > barrier or st.front == barrier) then
		local hp = Worlds.of(barrier).plate.hp
		hitPlate(
			st,
			barrier,
			Power.plate(pick.strength, hp, true, left) * (pick.plateMultiplier or 1),
			res
		)
	end
	return res
end

return Resolve
