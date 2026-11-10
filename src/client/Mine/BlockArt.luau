--!strict

local BlockArt = {}

function BlockArt.apply(part: BasePart, material: string)
	part.Material, part.MaterialVariant = Enum.Material.SmoothPlastic, "COCOMine_" .. material
	part.Color = Color3.new(1, 1, 1)
end

return BlockArt
