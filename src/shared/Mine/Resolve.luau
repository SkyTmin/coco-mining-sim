--!strict
--!native
--!optimize 2

local Config = require(script.Parent.Parent.Config)
local MineState = require(script.Parent.MineState)
local MineGen = require(script.Parent.MineGen)
local Shapes = require(script.Parent.Shapes)
local Worlds = require(script.Parent.Worlds)
local Power = require(script.Parent.Parent.Play.Power)
type State = MineState.MineState
type Range = MineState.Range

export type Pick = { strength: number, shape: string, ultLayers: number }
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

local function tally(st: State, res: HitResult, out: { Range })
	MineState.compact(st, out)
	local windowEnd = st.front + mine.window
	for _, run in out do
		describeRange(res, windowEnd, run.x, run.y, run.a, run.b)
		MineGen.rangeHist(st.seed, run.x, run.y, run.a, run.b, res.hist, res.finds)
		res.blocks += run.b - run.a
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
	st.damage[key] = 1 - (left - amount) / hp
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
		hitPlate(st, barrier, Power.plate(strength, Worlds.of(barrier).plate.hp, false), res)
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
	local extra = Power.pierce(hardness, strength, strike) - 1
	local overflow: { { x: number, y: number, amount: number } }? = if strike and strike.cracks
		then {}
		else nil
	for _, cell in shape do
		local column, row = cell.x, cell.y
		if MineState.isSolid(st, column, row, d) then
			local excess = damageCell(st, column, row, d, hp, strength, out)
			if excess then
				if overflow and excess > 0 then
					table.insert(overflow, { x = column, y = row, amount = excess })
				end
				local nextDepth = d + 1
				for _ = 1, extra do
					nextDepth = MineState.nextSolid(st, column, row, nextDepth)
					if nextDepth >= barrier then
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
					damageCell(st, column, row, d, hp, spill.amount, out)
					break
				end
			end
		end
	end
	tally(st, res, out)
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
	tally(st, res, out)
	if barrier < DEPTH_END and (finish > barrier or st.front == barrier) then
		local hp = Worlds.of(barrier).plate.hp
		hitPlate(st, barrier, Power.plate(pick.strength, hp, true, left), res)
	end
	return res
end

return Resolve
