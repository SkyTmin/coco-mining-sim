--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Wire = require(Shared.Mine.MineWire)
local Hash = require(Shared.Mine.Hash)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local BlockPool = require(script.Parent.BlockPool)

local S = Config.mine.blockSize
local WallRenderer = {}
local colors: { [string]: Color3 } = {}
for _, ore in Config.ores do
	colors[ore.id] = Color3.fromRGB(ore.color[1], ore.color[2], ore.color[3])
end

type Cell = { part: Part, x: number, y: number, d: number, ore: number, plate: boolean }
export type Renderer = {
	model: Model,
	frame: CFrame,
	pool: BlockPool.Pool,
	cells: { [number]: Cell },
	lookup: { [BasePart]: Cell },
	runes: { Part },
	plateLabel: TextLabel,
	plateFill: Frame,
	pulse: Highlight,
	limits: Model,
}
local function layerValue(win: any, x: number, y: number, relative: number): number
	local radius = (win.width - 1) // 2
	if x < -radius or x > radius or y < 0 or y >= win.height then
		return -1
	end
	local layer = win.layers[relative + 1]
	return if layer then layer[(x + radius) * win.height + y + 1] else -1
end
WallRenderer.ore = layerValue

function WallRenderer.exposed(win: any, x: number, y: number, relative: number): boolean
	if layerValue(win, x, y, relative) <= 0 then
		return false
	end
	return relative == 0
		or layerValue(win, x, y, relative - 1) == 0
		or layerValue(win, x + 1, y, relative) == 0
		or layerValue(win, x - 1, y, relative) == 0
		or layerValue(win, x, y + 1, relative) == 0
		or layerValue(win, x, y - 1, relative) == 0
end

function WallRenderer.new(parent: Instance, frame: CFrame): Renderer
	local model = Instance.new("Model")
	model.Name, model.Parent = "MineOre", parent
	local limits = Instance.new("Model")
	limits.Name, limits.Parent = "LastCells", model
	local pulse = Instance.new("Highlight")
	pulse.DepthMode, pulse.FillColor, pulse.OutlineColor =
		Enum.HighlightDepthMode.Occluded,
		Color3.fromRGB(255, 218, 149),
		Color3.fromRGB(255, 238, 191)
	pulse.Adornee, pulse.Parent = limits, model
	local plateGui = Instance.new("BillboardGui")
	plateGui.Name, plateGui.Size, plateGui.StudsOffsetWorldSpace =
		"Guardian", UDim2.fromOffset(252, 58), Vector3.new(0, S * 1.76, 0)
	plateGui.Enabled, plateGui.AlwaysOnTop, plateGui.Parent = false, true, model
	local plateLabel = Instance.new("TextLabel")
	plateLabel.BackgroundColor3, plateLabel.TextColor3 =
		Color3.fromRGB(34, 45, 66), Color3.fromRGB(255, 234, 216)
	plateLabel.Font, plateLabel.TextSize, plateLabel.TextWrapped = Enum.Font.GothamBold, 15, true
	plateLabel.Size, plateLabel.Parent = UDim2.fromScale(1, 0.82), plateGui
	local bar = Instance.new("Frame")
	bar.BackgroundColor3, bar.BorderSizePixel = Color3.fromRGB(40, 44, 58), 0
	bar.Position, bar.Size, bar.Parent =
		UDim2.fromScale(0, 0.85), UDim2.fromScale(1, 0.15), plateGui
	local fill = Instance.new("Frame")
	fill.BackgroundColor3, fill.BorderSizePixel, fill.Parent = Color3.fromRGB(117, 205, 253), 0, bar
	local runes = {}
	for i = 1, 3 do
		local part = Instance.new("Part")
		part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery, part.CastShadow =
			true, false, false, false, false
		part.Material, part.Color = Enum.Material.Neon, Color3.fromRGB(136, 204, 255)
		part.Size = Vector3.new(0.25, 4 + i % 2, 0.08)
		runes[i] = part
	end
	return {
		model = model,
		frame = frame,
		pool = BlockPool.new(model),
		cells = {},
		lookup = {},
		runes = runes,
		plateLabel = plateLabel,
		plateFill = fill,
		pulse = pulse,
		limits = limits,
	}
end

local function tint(ore: number, x: number, y: number, d: number): Color3
	local world = Worlds.of(d)
	if ore == Wire.CHEST then
		return Color3.fromRGB(255, 184, 86)
	end
	if ore == Wire.PLATE then
		return Color3.fromRGB(world.color[1], world.color[2], world.color[3])
			:Lerp(Color3.new(0.1, 0.12, 0.18), 0.42)
	end
	local entry = world.ores[ore]
	local color = if entry then colors[entry[1] :: string] else Color3.fromRGB(139, 147, 159)
	local factor = 0.96 + 0.08 * Hash.unit(x, y, d)
	return Color3.new(
		math.min(1, color.R * factor),
		math.min(1, color.G * factor),
		math.min(1, color.B * factor)
	)
end

local function addCell(
	r: Renderer,
	key: number,
	x: number,
	y: number,
	d: number,
	ore: number,
	plate: boolean,
	win: any
): Cell?
	local cell = r.cells[key]
	if not cell then
		local part = r.pool.take()
		if not part then
			return nil
		end
		cell = { part = part, x = x, y = y, d = d, ore = ore, plate = plate }
		r.cells[key], r.lookup[part] = cell, cell
	end
	cell.ore = ore
	cell.part.Size = if plate
		then Vector3.new(win.width * S, win.height * S, S)
		else Vector3.one * (S - 0.045)
	cell.part.Color = tint(ore, x, y, d)
	cell.part.Material = if ore == Wire.CHEST
		then Enum.Material.Neon
		else Enum.Material.SmoothPlastic
	local depth = d - win.front
	cell.part.Transparency = if depth >= 15 then math.min(0.42, (depth - 14) * 0.07) else 0
	return cell
end

function WallRenderer.update(
	r: Renderer,
	win: any,
	visible: number,
	hidden: number?,
	translate: (string, ...any) -> string,
	strength: number
)
	local radius = (win.width - 1) // 2
	local used: { [number]: boolean } = {}
	local frontCells: { Cell } = {}
	local plate: Cell? = nil
	for rel = 0, visible - 1 do
		for x = -radius, radius do
			for y = 0, win.height - 1 do
				local d = win.front + rel
				local key, ore = State.cellKey(x, y, d), layerValue(win, x, y, rel)
				if rel == 0 and ore == Wire.PLATE then
					if not plate then
						local plateKey = -d - 1
						plate = addCell(r, plateKey, 0, 0, d, ore, true, win)
						used[plateKey] = true
					end
				elseif key ~= hidden and WallRenderer.exposed(win, x, y, rel) then
					local cell = addCell(r, key, x, y, d, ore, false, win)
					if cell and rel == 0 then
						table.insert(frontCells, cell)
					end
					used[key] = true
				end
			end
		end
	end
	for key, cell in r.cells do
		if not used[key] then
			r.lookup[cell.part], r.cells[key] = nil, nil
			r.pool.release(cell.part)
		elseif cell.part.Parent ~= r.model then
			cell.part.Parent = r.model
		end
	end
	if #frontCells > 0 and #frontCells <= 3 and not plate then
		for _, cell in frontCells do
			cell.part.Parent = r.limits
		end
	end
	r.pulse.Enabled = #frontCells > 0 and #frontCells <= 3 and not plate
	local gui = r.plateLabel.Parent :: BillboardGui
	gui.Enabled, gui.Adornee = plate ~= nil, if plate then plate.part else nil
	for _, rune in r.runes do
		rune.Parent = if plate then r.model else nil
	end
	if plate then
		local world = Worlds.of(win.front)
		local hp = math.max(0, world.plate.hp - win.plateDamage)
		r.plateFill.Size = UDim2.fromScale(hp / world.plate.hp, 1)
		local ratio = strength / world.plate.recommendedStrength
		r.plateLabel.TextColor3 = if ratio >= 1
			then Color3.fromRGB(145, 250, 173)
			elseif ratio >= 0.5 then Color3.fromRGB(255, 220, 144)
			else Color3.fromRGB(255, 163, 161)
		r.plateLabel.Text =
			translate("mine_plate", math.ceil(hp), world.plate.recommendedStrength, strength)
	end
end

function WallRenderer.moves(
	r: Renderer,
	win: any,
	shift: number,
	parts: { BasePart },
	frames: { CFrame }
)
	for _, cell in r.cells do
		local y = if cell.plate then win.height * S / 2 else (cell.y + 0.5) * S
		local localFrame = CFrame.new(cell.x * S, y, -((cell.d - win.front + 0.5) * S + shift))
		table.insert(parts, cell.part)
		table.insert(frames, r.frame * localFrame)
		if cell.plate then
			for i, rune in r.runes do
				table.insert(parts, rune)
				table.insert(
					frames,
					r.frame
						* localFrame
						* CFrame.new((i - 2) * 3.2, 0, S / 2 + 0.08)
						* CFrame.Angles(0, 0, if i % 2 == 0 then 0.45 else -0.45)
				)
			end
		end
	end
end

function WallRenderer.position(
	r: Renderer,
	x: number,
	y: number,
	relative: number,
	shift: number
): Vector3
	return r.frame:PointToWorldSpace(
		Vector3.new(x * S, (y + 0.5) * S, -(relative * S + S / 2 + shift))
	)
end

return WallRenderer
