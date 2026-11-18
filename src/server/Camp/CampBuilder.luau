--!strict
local Art = require(script.Parent.CampArt)
local Builder = {}
local entrances: { [number]: Art.Entrance } = {}
function Builder.entrance(index: number, model: Model, frame: CFrame)
	entrances[index] = Art.entrance(model, frame)
end
function Builder.get(index: number): Art.Entrance?
	return entrances[index]
end
function Builder.build(): Folder
	local root = Instance.new("Folder")
	root.Name = "Camp"
	Art.crater(root)
	root.Parent = workspace
	return root
end
return Builder
