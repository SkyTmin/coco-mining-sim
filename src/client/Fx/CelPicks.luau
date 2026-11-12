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

-- every pickaxe the same size: a fixed scale, not "fit the bounds" (effects and crowns would shrink the legendaries)
-- [владелец 12.11: кирка мелкая для персонажа] ~2.4 studs from the handle end to the top of the head [решение]
local UNIT_PER_SIZE = 0.38 -- studs per model unit for each stud of `size`
-- the fist in RightHand space: the grip point in the middle of the hand, the handle straight forward out of the fist,
-- the head up (the template handle runs along (0, .71, .71) after the 45° tilt; −135° about X turns it to −Z)
local HAND_FRAME = CFrame.new(0, -0.05, -0.04) * CFrame.Angles(math.rad(-135), 0, 0)
-- model space: the hand holds the handle here, a third of the way up (it runs y −2.3 … 1.3), so the end sticks out
-- of the fist [владелец 12.11: «кирка не в руке, рукоять должна быть в руке»; was −1.95 = the end hidden in the fist]
local GRIP = Vector3.new(0, -1.15, 0)
local FIRST_PERSON_SHRINK = 0.47 -- × the stand-in's own 0.6 (CelSize) = 0.28 of the held size
local hex = Color3.fromHex
local AURA_COLORS = {
	storm = { hex("FFF6A8"), hex("8BE1FF"), hex("1A78D6") },
	dynamite = { hex("FFF1A8"), hex("FF6A2A"), hex("C0241A") },
	rift = { hex("FFE6B0"), hex("FFA51C"), hex("A3560E") },
	frost = { hex("FFFFFF"), hex("BDEFFF"), hex("3A9BE0") },
}
local LEVEL = { common = 0, rare = 1, epic = 2, legendary = 3 }

local function aura(id: string): any
	local family, rarity = string.match(id, "^(%a+)_(%a+)$")
	local colors = family and AURA_COLORS[family]
	local level = rarity and LEVEL[rarity]
	if not colors or not level or level == 0 then
		return nil
	end
	-- round the HEAD, not the handle [владелец 12.11: «крутятся вокруг рукояти»]: the head spans x ±2,
	-- y 0.5 … 1.7 in model space; the motes circle it in its own plane (axis ≈ the handle), the sparkles fill a
	-- flat box over the head
	return {
		centre = Vector3.new(0, 1.15, 0),
		radius = 2.15 + level * 0.1,
		axis = Vector3.yAxis,
		box = Vector3.new(4.6, 1.6, 1.4),
		level = level,
		style = family,
		colors = colors,
	}
end

-- one template per pickaxe (the device allows only so many runtime meshes), origin at the grip, held size;
-- other sizes are scaled clones
function CelPicks.template(id: string): Model?
	local prims = data[id]
	return prims
		and CelMesh.template(id, prims, {
			size = PickModel.HELD_SIZE,
			unit = PickModel.HELD_SIZE * UNIT_PER_SIZE,
			tilt = PickModel.TILT,
			origin = GRIP,
			solidBounds = true,
			noGlow = true, -- [владелец 12.11: «кирка светится, не понятно что это кирка»]
			taper = { from = 0.5, to = 2.1, k = 0.6 },
			aura = aura(id),
		})
end

-- the body centre of a template scaled by `scale`, relative to the grip
function CelPicks.bodyCentre(template: Model, scale: number): Vector3
	local centre = template:GetAttribute("BodyCentre")
	return if typeof(centre) == "Vector3" then centre * scale else Vector3.zero
end

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
	local held = model:GetAttribute("CelMount") == "held"
	local template = CelPicks.template(id :: string)
	if not template or not model.Parent or model:FindFirstChild("CelModel") then
		return
	end
	local scale = (if type(size) == "number" then size else PickModel.HELD_SIZE)
		/ PickModel.HELD_SIZE
	if model:GetAttribute("CelMount") == "first" then
		-- first person: the camera sits right behind the hand, so the full-size pick filled the screen and only the
		-- handle showed; 0.47 keeps the whole head in view, bottom right [решение, checked on a mirror shot 12.11]
		scale *= FIRST_PERSON_SHRINK
	end
	-- held: the grip in the hand; first person / plain: the body centred on the root like the voxel stand-in
	-- held: the grip point in the fist (read the real motor: its C0 places the root in the hand);
	-- first person / plain: the body centred on the root like the voxel stand-in
	local motor = root:FindFirstChild("PickaxeGrip")
	local mount = if held
			and motor
			and motor:IsA("Motor6D")
		then motor.C0:Inverse() * HAND_FRAME
		elseif held then PickModel.HAND_MOUNT
		else CFrame.new(-CelPicks.bodyCentre(template, scale))
	local cel = CelMesh.attach(template, root, mount, scale)
	cel:SetAttribute("CelPick", id) -- QA mirror rebuilds it from this
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
