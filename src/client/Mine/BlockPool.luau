--!strict

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local capacity = Config.mine.window * Config.plots.frameWidth * Config.mine.height
local BlockPool = {}
export type Pool = { take: () -> Part?, release: (Part) -> (), used: () -> number }

function BlockPool.new(parent: Instance, limit: number?): Pool
	local free: { Part } = {}
	local maximum = limit or capacity
	local allocated = 0
	local function make()
		local part = Instance.new("Part")
		part.Name = "Ore"
		part.Anchored, part.CanCollide, part.CanTouch, part.CastShadow = true, false, false, false
		part.CanQuery = true
		part.Material = Enum.Material.SmoothPlastic
		allocated += 1
		return part
	end
	if not limit then
		for i = 1, maximum do
			free[i] = make()
		end
	end
	return {
		take = function()
			local part = table.remove(free)
			if not part and allocated < maximum then
				part = make()
			end
			if part then
				part.Parent = parent
			end
			return part
		end,
		release = function(part)
			part.Parent = nil
			table.insert(free, part)
		end,
		used = function()
			return allocated - #free
		end,
	}
end

return BlockPool
