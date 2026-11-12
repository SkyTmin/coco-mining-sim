--!strict
-- Manifest model names resolve under Shared.Models. The logical cell or grip owns placement.
local ArtModel = {}
function ArtModel.clone(name: string): Model?
	local source = script.Parent:FindFirstChild(name)
	return if source and source:IsA("Model") then source:Clone() else nil
end

function ArtModel.mount(name: string, root: BasePart): Model?
	local model = ArtModel.clone(name)
	if not model then
		return nil
	end
	model.Name = "ArtModel"
	model:PivotTo(root.CFrame)
	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") then
			part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery =
				false, false, false, false
			part.Massless = true
			local weld = Instance.new("WeldConstraint")
			weld.Part0, weld.Part1, weld.Parent = root, part, part
		end
	end
	model.Parent = root
	return model
end
return ArtModel
