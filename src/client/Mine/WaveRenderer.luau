--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local State = require(Shared.Mine.MineState)
local Gen = require(Shared.Mine.MineGen)
local Worlds = require(Shared.Mine.Worlds)
local Wire = require(Shared.Mine.MineWire)
local Wave = require(Shared.Mine.UltWave)
local Rules = require(Shared.Mine.DissolveRules)
local Break = require(script.Parent.Parent.Fx.BlockBreak)
local Dissolve = require(script.Parent.Parent.Fx.Dissolve)
local Wall = require(script.Parent.WallRenderer)

local S = Config.mine.blockSize
local Render = {}
type Shrink = { part: Part, x: number, y: number, d: number, at: number }
export type Sweep = {
	state: State.MineState,
	rule: Wave.Sweep,
	at: number,
	processed: { [number]: number },
	cache: { [number]: { number } },
	shrinking: { Shrink },
	after: any,
}
function Render.new(state: State.MineState, after: any, duration: number, at: number): Sweep
	return {
		state = state,
		rule = Wave.new(after.front - state.front, state.width, state.height, duration),
		at = at,
		processed = {},
		cache = {},
		shrinking = {},
		after = after,
	}
end
local function ore(s: Sweep, x: number, y: number, d: number): number
	local st = s.state
	if d >= s.after.front then
		return Wall.ore(s.after, x, y, d - s.after.front)
	end
	if not State.isSolid(st, x, y, d) then
		return 0
	end
	if d == Worlds.of(d).plateDepth then
		return Wire.PLATE
	end
	local index, kind = Gen.cellAt(st.seed, x, y, d)
	return if kind then Wire.CHEST else index
end
local function layer(s: Sweep, d: number): { number }
	local saved = s.cache[d]
	if saved then
		return saved
	end
	local out = {}
	local radius = (s.state.width - 1) // 2
	for x = -radius, radius do
		for y = 0, s.state.height - 1 do
			table.insert(out, ore(s, x, y, d))
		end
	end
	s.cache[d] = out
	return out
end
function Render.clear(s: Sweep, r: Wall.Renderer)
	for _, item in s.shrinking do
		r.pool.release(item.part)
	end
	table.clear(s.shrinking)
end
function Render.step(
	s: Sweep,
	r: Wall.Renderer,
	fx: any,
	age: number,
	now: number,
	reduced: boolean
): (any, number)
	local st, rule = s.state, s.rule
	local slow = Wave.camera(rule, age)
	local lo, hi = rule.depth, 0
	local radius = (st.width - 1) // 2
	local cleared = {}
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			local lane = State.laneKey(x, y)
			local count = Wave.cleared(rule, x, y, age)
			cleared[lane] = count
			lo, hi = math.min(lo, count), math.max(hi, count)
		end
	end
	-- Detach only blocks which were actually visible. Distant blocks shrink in the same pool.
	for key, cell in r.cells do
		local d = cell.d - st.front
		if d >= 0 and d < rule.depth and d < cleared[State.laneKey(cell.x, cell.y)] then
			local t = Wave.at(rule, cell.x, cell.y, d)
			local distance = d - Wave.camera(rule, t)
			if distance > Rules.nearLayers then
				r.cells[key], r.lookup[cell.part], r.sparkles[cell.part] = nil, nil, nil
				table.insert(
					s.shrinking,
					{ part = cell.part, x = cell.x, y = cell.y, d = d, at = s.at + t }
				)
			end
		end
	end
	local first = st.front + lo
	local win = {
		front = first,
		width = st.width,
		height = st.height,
		damage = {},
		plateDamage = st.plateDamage,
		layers = {},
	}
	local finish = math.min(s.after.front + #s.after.layers, st.front + hi + Config.mine.window)
	for d = first, finish - 1 do
		local raw = layer(s, d)
		local row = table.clone(raw)
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				if d - st.front < cleared[State.laneKey(x, y)] then
					row[(x + radius) * st.height + y + 1] = 0
				end
			end
		end
		table.insert(win.layers, row)
	end
	-- Admission follows the wave time, including holes, rather than the small network result preview.
	local due = {}
	for x = -radius, radius do
		for y = 0, st.height - 1 do
			local lane = State.laneKey(x, y)
			for d = s.processed[lane] or 0, cleared[lane] - 1 do
				local at = Wave.at(rule, x, y, d)
				if d - Wave.camera(rule, at) <= Rules.nearLayers then
					table.insert(due, { x = x, y = y, d = d, at = at })
				end
			end
			s.processed[lane] = cleared[lane]
		end
	end
	table.sort(due, function(a, b)
		return a.at < b.at
	end)
	for _, cell in due do
		local d = st.front + cell.d
		local raw = layer(s, d)
		local blockWin = { front = d, width = st.width, height = st.height, layers = { raw } }
		local block = Break.snapshot(r, blockWin, cell.x, cell.y, 0, 0)
		if block then
			block.frame = r.frame
				* CFrame.new(cell.x * S, (cell.y + 0.5) * S, -(cell.d + 0.5 - slow) * S)
			block.faces = { Enum.NormalId.Back }
			local sides = {
				{ Enum.NormalId.Left, -1, 0 },
				{ Enum.NormalId.Right, 1, 0 },
				{ Enum.NormalId.Top, 0, 1 },
				{ Enum.NormalId.Bottom, 0, -1 },
			}
			for _, side in sides do
				local x, y = cell.x + side[2], cell.y + side[3]
				if
					State.inWall(st, x, y)
					and (
						not State.isSolid(st, x, y, d)
						or cell.d < Wave.cleared(rule, x, y, cell.at)
					)
				then
					table.insert(block.faces, side[1])
				end
			end
			local hit = block.frame:PointToWorldSpace(Vector3.new(0, 0, S / 2))
			Dissolve.block(fx, block, s.at + cell.at, hit, reduced, true)
		end
	end
	for i = #s.shrinking, 1, -1 do
		local item = s.shrinking[i]
		local scale = 1 - math.clamp((now - item.at) / Rules.farShrink, 0, 1)
		if scale <= 0 then
			r.pool.release(item.part)
			table.remove(s.shrinking, i)
		else
			item.part.Size = Vector3.one * S * scale
			item.part.CFrame = r.frame
				* CFrame.new(item.x * S, (item.y + 0.5) * S, -(item.d + 0.5 - slow) * S)
		end
	end
	-- The snapshot is bounded by the moving render window.
	for d in s.cache do
		if d < first - 1 then
			s.cache[d] = nil
		end
	end
	return win, (lo - slow) * S
end
return Render
