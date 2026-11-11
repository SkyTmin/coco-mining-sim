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
type Event = { x: number, y: number, d: number, at: number }
export type Sweep = { rule: Wave.Sweep, window: any, events: { Event }, cursor: number }
local directions = {
	{ face = Enum.NormalId.Back, x = 0, y = 0, d = -1 },
	{ face = Enum.NormalId.Front, x = 0, y = 0, d = 1 },
	{ face = Enum.NormalId.Left, x = -1, y = 0, d = 0 },
	{ face = Enum.NormalId.Right, x = 1, y = 0, d = 0 },
	{ face = Enum.NormalId.Top, x = 0, y = 1, d = 0 },
	{ face = Enum.NormalId.Bottom, x = 0, y = -1, d = 0 },
}
function Render.new(st: State.MineState, after: any): Sweep
	local rule = Wave.new(after.front - st.front, st.width, st.height)
	local radius = (st.width - 1) // 2
	local win = {
		front = st.front,
		width = st.width,
		height = st.height,
		damage = {},
		plateDamage = st.plateDamage,
		layers = {},
	}
	local events = {}
	-- Only the part of the wave in front of the fog is materialized on the client.
	for d = 0, math.min(rule.depth + #after.layers, Wave.fogEnd) - 1 do
		local layer = {}
		local depth = st.front + d
		for x = -radius, radius do
			for y = 0, st.height - 1 do
				local ore = 0
				if depth >= after.front then
					ore = Wall.ore(after, x, y, depth - after.front)
				elseif State.isSolid(st, x, y, depth) then
					if depth == Worlds.of(depth).plateDepth then
						ore = Wire.PLATE
					else
						local index, kind = Gen.cellAt(st.seed, x, y, depth)
						ore = if kind then Wire.CHEST else index
						table.insert(events, { x = x, y = y, d = d, at = Wave.at(rule, x, y, d) })
					end
				end
				table.insert(layer, ore)
			end
		end
		table.insert(win.layers, layer)
	end
	table.sort(events, function(a, b)
		return a.at < b.at
	end)
	return { rule = rule, window = win, events = events, cursor = 1 }
end
function Render.step(
	s: Sweep,
	r: Wall.Renderer,
	fx: Dissolve.Fx,
	age: number,
	now: number,
	reduced: boolean
): (any, boolean)
	local win, first = s.window, s.cursor
	local radius = (win.width - 1) // 2
	local camera = workspace.CurrentCamera
	while s.events[s.cursor] and s.events[s.cursor].at <= age do
		local cell = s.events[s.cursor]
		local block = Break.snapshot(r, win, cell.x, cell.y, cell.d, 0)
		local distance = if block and camera
			then (block.frame.Position - camera.CFrame.Position).Magnitude
			else math.huge
		local stride, size = Rules.lod(distance)
		local grains = if stride > 0 then (8 // stride) ^ 2 else 0
		if
			block
			and grains > 0
			and fx.admitted + grains <= Rules.maxEmit
			and fx.tail - fx.head + 1 + fx.reserved + grains <= Rules.maxParticles
		then
			block.faces = {}
			for _, side in directions do
				if
					(side.d == -1 and cell.d == 0)
					or Wall.ore(win, cell.x + side.x, cell.y + side.y, cell.d + side.d) == 0
				then
					table.insert(block.faces, side.face)
				end
			end
			local hit = block.frame:PointToWorldSpace(Vector3.new(0, 0, S / 2))
			Dissolve.block(fx, block, now, hit, reduced, true, { stride = stride, size = size })
		end
		win.layers[cell.d + 1][(cell.x + radius) * win.height + cell.y + 1] = 0
		s.cursor += 1
	end
	return win, s.cursor ~= first
end
return Render
