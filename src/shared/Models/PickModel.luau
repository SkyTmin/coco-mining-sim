--!strict

local CollectionService = game:GetService("CollectionService")
local data = require(script.Parent.wooden_pickaxe)
local Config = require(script.Parent.Parent.Config)
local ArtModel = require(script.Parent.ArtModel)
local PickModel = {}
local xSize, ySize, zSize = table.unpack(data.size)
local middle = Vector3.new(ySize / 2, zSize / 2, xSize / 2)
local turn = CFrame.Angles(math.rad(data.tilt), 0, 0)
local low, high = Vector3.one * math.huge, -Vector3.one * math.huge

for _, box in data.b do
	local x, z, w, h = box[1], box[3], box[4], box[6]
	for _, dx in { 0, w } do
		for _, dz in { 0, h } do
			local corner = turn:VectorToWorldSpace(Vector3.new(0, z + dz, x + dx) - middle)
			low, high = low:Min(corner), high:Max(corner)
		end
	end
end

local span = math.max(high.Y - low.Y, high.Z - low.Z)
local centre = Vector3.new(0, (low.Y + high.Y) / 2, (low.Z + high.Z) / 2)
local colors = {}
for index, hex in data.p do
	local packed = assert(tonumber(hex, 16))
	colors[index] = Color3.fromRGB(
		bit32.rshift(packed, 16),
		bit32.band(bit32.rshift(packed, 8), 255),
		bit32.band(packed, 255)
	)
end

local HELD_SIZE = 1.45
-- PickaxeService still owns the root and motor. Adapt its existing grip to the owner's item frame.
local legacyGrip = CFrame.new(0, -0.17 * 0.3, -0.10)
	* CFrame.Angles(math.rad(-77), 0, math.rad(-13))
local handGrip = CFrame.new(0.3, -0.3, -0.2)
	* CFrame.Angles(math.rad(-105), math.pi, 0)
	* CFrame.new(0, HELD_SIZE * 0.45, HELD_SIZE * 0.45)
local heldTemplate: Model? = nil
-- the client swaps the voxel stand-in for the cel model (src/client/Fx/CelPicks.luau) using these
PickModel.HELD_SIZE, PickModel.TILT, PickModel.HELD_MOUNT =
	HELD_SIZE, data.tilt, legacyGrip:Inverse() * handGrip
-- the hand itself in the grip root's space: the cel model puts its handle grip point exactly here
PickModel.HAND_MOUNT = legacyGrip:Inverse()
	* CFrame.new(0.3, -0.3, -0.2)
	* CFrame.Angles(math.rad(-105), math.pi, 0)

local function build(size: number, anchored: boolean, mount: CFrame): (Model, Part)
	local pixel = size / span
	local model = Instance.new("Model")
	model.Name = "MinePickaxe"
	local function part(name: string, dimensions: Vector3, frame: CFrame): Part
		local voxel = Instance.new("Part")
		voxel.Name, voxel.Size, voxel.CFrame = name, dimensions, frame
		voxel.Massless, voxel.CastShadow = true, false
		voxel.CanCollide, voxel.CanTouch, voxel.CanQuery = false, false, false
		voxel.Material, voxel.Parent = Enum.Material.SmoothPlastic, model
		return voxel
	end
	local root = part("Grip", Vector3.new(ySize * pixel, size, size), CFrame.identity)
	root.Anchored, root.Transparency, model.PrimaryPart = anchored, 1, root
	local head: Part? = nil
	local headSize = 0
	for _, box in data.b do
		local x, y, z, w, d, h, color = table.unpack(box)
		local at = Vector3.new(y + d / 2, z + h / 2, x + w / 2) - middle
		local relative = mount * CFrame.new(-centre * pixel) * turn * CFrame.new(at * pixel)
		local voxel = part("Voxel", Vector3.new(d, h, w) * pixel, relative)
		voxel.Color = colors[color + 1]
		local weld = Instance.new("Weld")
		weld.Part0, weld.Part1, weld.C0, weld.Parent = root, voxel, relative, voxel
		if z > zSize * 0.7 and w * d * h > headSize then
			head, headSize = voxel, w * d * h
		end
	end
	if head then
		head.Name = "Head"
	end
	return model, root
end

function PickModel.icon(_id: string): number
	return 0
end

function PickModel.new(
	_icon: number,
	frame: CFrame,
	_pixel: number,
	anchored: boolean
): (Model, Part)
	if anchored then
		local model, root = build(HELD_SIZE, true, CFrame.identity)
		model:PivotTo(frame)
		return model, root
	end
	if not heldTemplate then
		heldTemplate = build(HELD_SIZE, false, legacyGrip:Inverse() * handGrip)
	end
	local model = heldTemplate:Clone()
	model:PivotTo(frame)
	return model, model.PrimaryPart :: Part
end

function PickModel.view(): (Model, Part)
	return build(HELD_SIZE * 0.6, true, CFrame.identity)
end

-- [владелец 11.11: «кирки поменяй»] each client draws the cel model of this pick over the stand-in
local function celTag(model: Model, id: string, anchored: boolean, first: boolean?)
	model:SetAttribute("CelPick", id)
	model:SetAttribute("CelSize", if first then HELD_SIZE * 0.6 else HELD_SIZE)
	model:SetAttribute("CelMount", if first then "first" elseif anchored then "plain" else "held")
	CollectionService:AddTag(model, "CelPick")
end

function PickModel.forPick(
	id: string,
	frame: CFrame,
	anchored: boolean,
	first: boolean?
): (Model, BasePart)
	local art = Config.art.pickaxes[id] or Config.art.pickaxes.starter
	local model = ArtModel.clone(art.model)
	if model then
		local root = model.PrimaryPart or model:FindFirstChild("Grip", true)
		if root and root:IsA("BasePart") then
			model.PrimaryPart = root
			local size = model:GetExtentsSize()
			model:ScaleTo(
				model:GetScale()
					* HELD_SIZE
					* (if first then 0.6 else 1)
					/ math.max(size.X, size.Y, size.Z)
			)
			for _, part in model:GetDescendants() do
				if part:IsA("BasePart") then
					part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery, part.Massless =
						false, false, false, false, true
					if part ~= root then
						local weld = Instance.new("WeldConstraint")
						weld.Part0, weld.Part1, weld.Parent = root, part, part
					end
				end
			end
			root.Anchored = anchored
			model:PivotTo(frame)
			-- the art model was returned here without the tag: first person kept the voxel pick [найдено 12.11]
			celTag(model, id, anchored, first)
			return model, root
		end
		model:Destroy()
	end
	local model, root
	if first then
		model, root = PickModel.view()
		model:PivotTo(frame)
	else
		model, root = PickModel.new(PickModel.icon(id), frame, 0.056, anchored)
	end
	celTag(model, id, anchored, first)
	return model, root
end

function PickModel.appearance(model: Model, id: string, golden: boolean)
	local art = Config.art.pickaxes[id] or Config.art.pickaxes.starter
	if art.placeholder and id ~= "starter" then
		local color = Color3.fromHex(art.color or "FFD23F")
		for _, part in model:GetDescendants() do
			if part:IsA("BasePart") and part.Name ~= "Grip" then
				local original = part:GetAttribute("PickBaseColor")
				if typeof(original) ~= "Color3" then
					original = part.Color
					part:SetAttribute("PickBaseColor", original)
				end
				part.Color = original:Lerp(color, 0.55)
			end
		end
	end
	local outline = model:FindFirstChild("GoldenOutline")
	if golden and not outline then
		local highlight = Instance.new("Highlight")
		highlight.Name, highlight.Adornee, highlight.FillTransparency = "GoldenOutline", model, 1
		highlight.OutlineColor, highlight.OutlineTransparency = Color3.fromHex("FFD23F"), 0
		highlight.DepthMode, highlight.Parent = Enum.HighlightDepthMode.Occluded, model
	elseif not golden and outline then
		outline:Destroy()
	end
end

return PickModel
