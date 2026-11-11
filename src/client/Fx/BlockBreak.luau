--!strict

local ContentProvider = game:GetService("ContentProvider")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Hash = require(Shared.Mine.Hash)
local Worlds = require(Shared.Mine.Worlds)
local BlockArt = require(script.Parent.Parent.Mine.BlockArt)
local State = require(Shared.Mine.MineState)
local Dissolve = require(script.Parent.Dissolve)
local BlockBreak = {}
local STAGES = Config.art.cracks
local WHITE = Color3.new(1, 1, 1)

type Faces = { [Enum.NormalId]: Decal }
type Active = { [Part]: Faces }
type Fx = {
	parent: Instance,
	free: { Decal },
	active: Active,
	dissolve: Dissolve.Fx,
}

function BlockBreak.new(parent: Instance): Fx
	task.spawn(function()
		local textures = {}
		for _, set in STAGES do
			for _, id in set do
				table.insert(textures, id)
			end
		end
		pcall(ContentProvider.PreloadAsync, ContentProvider, textures)
	end)
	return { parent = parent, free = {}, active = {}, dissolve = Dissolve.new(parent) }
end

local function release(fx: Fx, desired: Active)
	for part, faces in fx.active do
		local keep = desired[part]
		for side, decal in faces do
			if not keep or keep[side] ~= decal then
				decal.Parent = nil
				table.insert(fx.free, decal)
			end
		end
	end
	fx.active = desired
end

function BlockBreak.clear(fx: Fx)
	release(fx, {})
end

local function stageFor(amount: number): number
	return math.clamp(math.ceil(amount * 10 / 255), 0, 10)
end
-- [владелец 11.11] a block with only a sliver of HP left keeps no crack: the last, thickest stages left behind on
-- neighbours spoil the wall. Below this share of HP left the crack is not drawn [решение: 20 %].
local NO_CRACK_LEFT = 0.2

function BlockBreak.cracks(
	fx: Fx,
	renderer: any,
	win: any,
	keyFor: (number, number, number) -> number,
	windup: number?
)
	local nextActive: Active = {}
	local function paint(cell: any, stage: number)
		if not cell or stage == 0 then
			return
		end
		local part: Part = cell.part
		local previous = fx.active[part]
		local faces: Faces = {}
		for _, face in cell.faces do
			local decal = (previous and previous[face]) or table.remove(fx.free)
			if not decal then
				decal = Instance.new("Decal")
				decal.Name = "OreCrack"
				decal.ZIndex = 2
			end
			local set = 1 + (Hash.u32(cell.x, cell.y, cell.d) + face.Value) % #STAGES
			decal.Face, decal.Texture, decal.Color3 = face, STAGES[set][stage], WHITE
			decal.Transparency = 0
			if decal.Parent ~= part then
				decal.Parent = part
			end
			faces[face] = decal
		end
		nextActive[part] = faces
	end
	if windup then
		local front = {}
		for key, cell in renderer.cells do
			if cell.d == win.front then
				table.insert(front, key)
			end
		end
		table.sort(front)
		for i, key in front do
			local progress = windup * 2 - (i - 1) / math.max(1, #front)
			paint(renderer.cells[key], stageFor(math.clamp(progress * 255, 0, 255)))
		end
	else
		for _, damage in win.damage do
			local depth = win.front + damage.dRel
			if damage.amount < 255 * (1 - NO_CRACK_LEFT) then
				paint(renderer.cells[keyFor(damage.x, damage.y, depth)], stageFor(damage.amount))
			end
		end
	end
	release(fx, nextActive)
end

function BlockBreak.snapshot(
	renderer: any,
	win: any,
	x: number,
	y: number,
	relative: number,
	offset: number
): Dissolve.Block?
	local layer = win.layers[relative + 1]
	local radius = (win.width - 1) // 2
	local ore = layer and layer[(x + radius) * win.height + y + 1]
	local art = Config.art.worlds[Worlds.of(win.front + relative).id]
	local tile = art.slots[ore or 0]
	if not tile then
		return nil
	end
	return {
		frame = renderer.frame * CFrame.new(
			x * Config.mine.blockSize,
			(y + 0.5) * Config.mine.blockSize,
			-(relative * Config.mine.blockSize + Config.mine.blockSize / 2 + offset)
		),
		texture = BlockArt.select(tile, x, y, win.front + relative),
		x = x,
		y = y,
		depth = win.front + relative,
		faces = if renderer.cells[State.cellKey(x, y, win.front + relative)]
			then table.clone(renderer.cells[State.cellKey(x, y, win.front + relative)].faces)
			else { Enum.NormalId.Back },
	}
end

return BlockBreak
