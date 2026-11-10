--!strict

local data = require(script.Parent.wooden_pickaxe)
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

return PickModel
