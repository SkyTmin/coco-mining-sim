--!strict

local grids = require(script.Parent.picks)
local PickModel = {}
local icons: { [string]: number } = {
	starter = 0,
	storm_common = 1,
	plain_common = 1,
	plain_rare = 5,
	plain_epic = 9,
	plain_legendary = 13,
}

function PickModel.icon(id: string): number
	return icons[id] or 0
end

function PickModel.new(icon: number, frame: CFrame, pixel: number, anchored: boolean): (Model, Part)
	local grid = grids[icon + 1]
	local model = Instance.new("Model")
	model.Name = "MinePickaxe"
	local function part(name: string, size: Vector3, at: CFrame): Part
		local piece = Instance.new("Part")
		piece.Name, piece.Size, piece.CFrame = name, size, at
		piece.Anchored, piece.Massless, piece.CastShadow = anchored, true, false
		piece.CanCollide, piece.CanQuery, piece.CanTouch = false, false, false
		piece.Material, piece.Parent = Enum.Material.SmoothPlastic, model
		return piece
	end
	local grip = part("Grip", Vector3.one * 0.2, frame)
	grip.Transparency, model.PrimaryPart = 1, grip
	local head: Part? = nil
	local headArea = 0
	for _, rect in grid.rects do
		local x, y, w, h, rgb = table.unpack(rect)
		local offset =
			CFrame.new((x + w / 2 - grid.grip[1]) * pixel, (grid.grip[2] - y - h / 2) * pixel, 0)
		local voxel = part("Voxel", Vector3.new(w * pixel, h * pixel, pixel), frame * offset)
		voxel.Color = Color3.fromRGB(
			bit32.rshift(rgb, 16),
			bit32.band(bit32.rshift(rgb, 8), 255),
			bit32.band(rgb, 255)
		)
		if y < 9 and w * h > headArea then
			head, headArea = voxel, w * h
		end
		if not anchored then
			local weld = Instance.new("WeldConstraint")
			weld.Part0, weld.Part1, weld.Parent = grip, voxel, voxel
		end
	end
	if head then
		head.Name = "Head"
	end
	return model, grip
end

return PickModel
