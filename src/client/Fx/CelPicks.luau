--!strict
-- Swaps every pickaxe stand-in (tag `CelPick`, set by PickModel.forPick on the server or the client) for the cel model
-- from CelPickData: the voxel parts are hidden locally, the cel mesh is welded to the same root with the same mount.
-- If EditableMesh is unavailable the voxel stand-in simply stays.
local CollectionService = game:GetService("CollectionService")
local Shared = game:GetService("ReplicatedStorage").Shared
local PickModel = require(Shared.Models.PickModel)
local CelMesh = require(script.Parent.CelMesh)
local data = require(script.Parent.CelPickData)

local CelPicks = {}

local function hide(model: Model, keep: Model?)
	for _, part in model:GetDescendants() do
		if part:IsA("BasePart") and not (keep and part:IsDescendantOf(keep)) then
			part.Transparency = 1
		end
	end
end

local function apply(model: Instance)
	if not model:IsA("Model") or model:FindFirstChild("CelModel") then
		return
	end
	local id = model:GetAttribute("CelPick")
	local prims = if type(id) == "string" then data[id] else nil
	if not prims then
		return
	end
	local root = model.PrimaryPart or model:WaitForChild("Grip", 5)
	if not root or not root:IsA("BasePart") or not model.Parent then
		return
	end
	local size = model:GetAttribute("CelSize")
	local template = CelMesh.template(id :: string, prims, {
		size = if type(size) == "number" then size else PickModel.HELD_SIZE,
		tilt = PickModel.TILT,
	})
	if not template or not model.Parent or model:FindFirstChild("CelModel") then
		return
	end
	local mount = if model:GetAttribute("CelMount") == "held"
		then PickModel.HELD_MOUNT
		else CFrame.identity
	local cel = CelMesh.attach(template, root, mount)
	cel.Parent = model
	hide(model, cel)
	-- streamed or late voxels stay hidden too
	model.DescendantAdded:Connect(function(part)
		if part:IsA("BasePart") and not part:IsDescendantOf(cel) then
			part.Transparency = 1
		end
	end)
end

function CelPicks.start()
	CollectionService:GetInstanceAddedSignal("CelPick"):Connect(function(model)
		task.spawn(apply, model)
	end)
	for _, model in CollectionService:GetTagged("CelPick") do
		task.spawn(apply, model)
	end
end

return CelPicks
