--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Renderer = require(script.Parent.WallRenderer)
local S = require(Shared.Config).mine.blockSize
local Aim = {}

-- [владелец 11.11] lone blocks left over are hard to hit: every exposed block has an invisible margin. When the ray
-- misses or slips through a hole to a deeper block, the nearest exposed block whose margin the ray crosses wins.
local MARGIN = S * 0.4 -- [решение] beyond the block's half size
local REACH = 240

local function result(
	r: Renderer.Renderer,
	win: any,
	cell: any,
	x: number,
	y: number,
	at: Vector3?
): any
	return {
		x = x,
		y = y,
		dRel = cell.d - win.front,
		position = cell.part.Position,
		hitPosition = at,
		color = cell.part.Color,
	}
end

-- nearest (along the ray) exposed block whose enlarged box the ray passes through; returns it and its distance
local function nearby(r: Renderer.Renderer, win: any, origin: Vector3, dir: Vector3): (any?, number)
	local best, bestT = nil, math.huge
	local reach = S * 0.5 + MARGIN
	for _, cell in r.cells do
		if not cell.plate and cell.part.Transparency < 1 then
			local offset = cell.part.Position - origin
			local t = offset:Dot(dir)
			if t > 0 and t < REACH and t < bestT then
				local miss = (offset - dir * t).Magnitude
				if miss <= reach and Renderer.exposed(win, cell.x, cell.y, cell.d - win.front) then
					best, bestT = cell, t
				end
			end
		end
	end
	return best, bestT - S * 0.5
end

function Aim.at(r: Renderer.Renderer, win: any, screen: Vector2): any?
	local camera = workspace.CurrentCamera
	if not camera then
		return nil
	end
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	params.FilterDescendantsInstances = { r.model }
	local ray = camera:ViewportPointToRay(screen.X, screen.Y)
	local dir = ray.Direction.Unit
	local hit = workspace:Raycast(ray.Origin, dir * REACH, params)
	local cell = if hit then r.lookup[hit.Instance] else nil
	if cell and cell.plate and hit then
		local p = r.frame:PointToObjectSpace(hit.Position)
		local radius = (win.width - 1) // 2
		local x, y =
			math.clamp(math.floor(p.X / S + 0.5), -radius, radius),
			math.clamp(math.floor(p.Y / S), 0, win.height - 1)
		return if Renderer.exposed(win, x, y, cell.d - win.front)
			then result(r, win, cell, x, y, hit.Position)
			else nil
	end
	local direct = if cell
			and hit
			and Renderer.exposed(win, cell.x, cell.y, cell.d - win.front)
		then cell
		else nil
	local near, nearT = nearby(r, win, ray.Origin, dir)
	-- the block actually under the cursor wins unless a margin block sits a whole layer nearer the camera
	if direct and hit and not (near and nearT < hit.Distance - S * 0.5) then
		return result(r, win, direct, direct.x, direct.y, hit.Position)
	end
	if near then
		return result(r, win, near, near.x, near.y, ray.Origin + dir * math.max(nearT, 0))
	end
	return nil
end

return Aim
