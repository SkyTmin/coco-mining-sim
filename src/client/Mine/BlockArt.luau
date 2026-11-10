--!strict

local MaterialService = game:GetService("MaterialService")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local BlockArt = {}
local variants: { [string]: string } = {}

function BlockArt.apply(part: BasePart, material: string)
	local name = variants[material]
	if not name then
		name = "COCOMine_" .. material
		local variant = Instance.new("MaterialVariant")
		variant.Name, variant.BaseMaterial = name, Enum.Material.SmoothPlastic
		variant.ColorMap = Config.art.materials[material]
		variant.StudsPerTile = Config.mine.blockSize
		variant.Parent = MaterialService
		variants[material] = name
	end
	part.Material, part.MaterialVariant = Enum.Material.SmoothPlastic, name
	part.Color = Color3.new(1, 1, 1)
end

return BlockArt
