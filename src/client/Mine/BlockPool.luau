--!strict

local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local capacity = Config.mine.window * Config.plots.frameWidth * Config.mine.height
local BlockPool = {}
export type Pool = { take: () -> Part?, release: (Part) -> (), used: () -> number }

function BlockPool.new(parent: Instance): Pool
	local free: { Part } = {}
	for i = 1, capacity do
		local part = Instance.new("Part")
		part.Name = "Ore"
		part.Anchored, part.CanCollide, part.CanTouch, part.CastShadow = true, false, false, false
		part.CanQuery = true
		part.Material = Enum.Material.SmoothPlastic
		free[i] = part
	end
	return {
		take = function()
			local part = table.remove(free)
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
			return capacity - #free
		end,
	}
end

return BlockPool
