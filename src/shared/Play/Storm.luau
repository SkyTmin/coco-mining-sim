--!strict

local Shared = script.Parent.Parent
local Config = require(Shared.Config)
local State = require(Shared.Mine.MineState)
local Gen = require(Shared.Mine.MineGen)
local Worlds = require(Shared.Mine.Worlds)
local Storm = {}

type Point = { x: number, y: number, d: number }
type Rng = { range: (Rng, number, number) -> number }
type Settings = { jumps: { number }, pickRareWithin: number }

function Storm.chain(
	st: State.MineState,
	rng: Rng,
	x: number,
	y: number,
	d: number,
	cfg: Settings
): { Point }
	local candidates: { Point } = {}
	local radius = (st.width - 1) // 2
	local stop = math.min(st.front + Config.mine.window, State.barrier(st))
	for depth = st.front, stop - 1 do
		for column = -radius, radius do
			for row = 0, st.height - 1 do
				if
					(column ~= x or row ~= y or depth ~= d)
					and State.isExposed(st, column, row, depth)
				then
					table.insert(candidates, { x = column, y = row, d = depth })
				end
			end
		end
	end
	local out: { Point } = {}
	local count = math.min(rng:range(cfg.jumps[1], cfg.jumps[2]), Config.cascade.maxCells - 1)
	for _ = 1, count do
		local nearest, nearestDistance, bestRare, rareDistance = nil, math.huge, nil, math.huge
		for i, point in candidates do
			local distance = math.abs(point.x - x) + math.abs(point.y - y) + math.abs(point.d - d)
			if distance < nearestDistance then
				nearest, nearestDistance = i, distance
			end
			if distance <= cfg.pickRareWithin and distance < rareDistance then
				local ore = Gen.cellAt(st.seed, point.x, point.y, point.d)
				if Worlds.isRare(ore) then
					bestRare, rareDistance = i, distance
				end
			end
		end
		local index = bestRare or nearest
		if not index then
			break
		end
		local point = table.remove(candidates, index)
		table.insert(out, point)
		x, y, d = point.x, point.y, point.d
	end
	return out
end

return Storm
