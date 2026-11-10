--!strict

local ContentProvider = game:GetService("ContentProvider")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)

local BlockArt = {}
local WHITE = Color3.new(1, 1, 1)
local requested: { [string]: boolean } = {}

function BlockArt.preload(worldId: string, timber: boolean)
	if requested[worldId] then
		return
	end
	requested[worldId] = true
	local world = Config.art.worlds[worldId]
	local textures = { Config.art.blocks[world.lining] }
	for _, slot in world.slots do
		table.insert(textures, Config.art.blocks[slot.texture])
	end
	if timber then
		table.insert(textures, Config.art.blocks.beam)
		table.insert(textures, Config.art.blocks.planks)
	end
	task.spawn(function()
		pcall(ContentProvider.PreloadAsync, ContentProvider, textures)
	end)
end

function BlockArt.apply(part: BasePart, texture: string)
	part.Material, part.MaterialVariant = Enum.Material.SmoothPlastic, "COCOMine_" .. texture
	part.Color = WHITE
end

return BlockArt
