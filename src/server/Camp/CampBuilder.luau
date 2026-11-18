--!strict
local Art = require(script.Parent.CampArt)
local Builder = {}
function Builder.build(): Folder
	local root = Instance.new("Folder")
	root.Name = "Camp"
	Art.crater(root)
	root.Parent = workspace
	return root
end
return Builder
