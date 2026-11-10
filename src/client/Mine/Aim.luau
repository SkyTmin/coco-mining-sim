--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Renderer = require(script.Parent.WallRenderer)
local S = Config.mine.blockSize
local Aim = {}

function Aim.at(r: Renderer.Renderer, win: any, screen: Vector2, nearby: boolean): any?
	local camera = workspace.CurrentCamera
	if not camera then
		return nil
	end
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	params.FilterDescendantsInstances = { r.model }
	local ray = camera:ViewportPointToRay(screen.X, screen.Y)
	local hit = workspace:Raycast(ray.Origin, ray.Direction * 240, params)
	local cell = if hit then r.lookup[hit.Instance] else nil
	if not cell and nearby then
		local best = math.huge
		for _, candidate in r.lookup do
			local pos, visible = camera:WorldToViewportPoint(candidate.part.Position)
			if not visible then
				continue
			end
			local distance = (Vector2.new(pos.X, pos.Y) - screen).Magnitude
			local edge = camera:WorldToViewportPoint(
				candidate.part.Position + camera.CFrame.RightVector * S / 2
			)
			if distance < best and distance <= math.abs(edge.X - pos.X) * 2 then
				local rayTo = candidate.part.Position - ray.Origin
				local surface = workspace:Raycast(ray.Origin, rayTo, params)
				if surface and surface.Instance == candidate.part then
					best, cell = distance, candidate
				end
			end
		end
	end
	if not cell then
		return nil
	end
	local x, y = cell.x, cell.y
	if cell.plate and hit then
		local p = r.frame:PointToObjectSpace(hit.Position)
		local radius = (win.width - 1) // 2
		x, y =
			math.clamp(math.floor(p.X / S + 0.5), -radius, radius),
			math.clamp(math.floor(p.Y / S), 0, win.height - 1)
	end
	local relative = cell.d - win.front
	if not Renderer.exposed(win, x, y, relative) then
		return nil
	end
	return { x = x, y = y, dRel = relative, position = cell.part.Position, color = cell.part.Color }
end

return Aim
