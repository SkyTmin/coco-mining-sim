--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Wire = require(Shared.Mine.MineWire)
local Hash = require(Shared.Mine.Hash)
local Ride = require(Shared.Mine.Ride)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local BlockPool = require(script.Parent.BlockPool)

local S = Config.mine.blockSize
local BlockArt = require(script.Parent.BlockArt)
local WallRenderer = {}
local SPARK_LAYERS = Config.mine.nearWindow

type Cell = {
	part: Part,
	x: number,
	y: number,
	d: number,
	ore: number,
	plate: boolean,
	faces: { Enum.NormalId },
}
type Sparkle = { emitter: ParticleEmitter, interval: number, nextAt: number }
export type Renderer = {
	model: Model,
	frame: CFrame,
	pool: BlockPool.Pool,
	cells: { [number]: Cell },
	lookup: { [BasePart]: Cell },
	plateModel: Model,
	plateBody: Part,
	plateEdges: { Part },
	plateOutline: Highlight,
	runes: { Part },
	plateLabel: TextLabel,
	plateFill: Frame,
	pulse: Highlight,
	limits: Model,
	sparkles: { [Part]: Sparkle },
	snapFace: Model,
	snapOutline: Highlight,
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
		or layerValue(win, x, y, relative + 1) == 0
		or layerValue(win, x + 1, y, relative) == 0
		or layerValue(win, x - 1, y, relative) == 0
		or layerValue(win, x, y + 1, relative) == 0
		or layerValue(win, x, y - 1, relative) == 0
end

function WallRenderer.new(parent: Instance, frame: CFrame): Renderer
	local snapFace = Instance.new("Model")
	snapFace.Name = "SnapFace"
	local snapOutline = Instance.new("Highlight")
	snapOutline.Name, snapOutline.Adornee = "SnapOutline", snapFace
	snapOutline.FillTransparency, snapOutline.OutlineColor, snapOutline.OutlineTransparency =
		1, Color3.fromHex("FFD36B"), 0.15
	snapOutline.Enabled = false
	local model = Instance.new("Model")
	model.Name, model.Parent = "MineOre", parent
	snapFace.Parent, snapOutline.Parent = model, snapFace
	local limits = Instance.new("Model")
	limits.Name, limits.Parent = "LastCells", model
	local pulse = Instance.new("Highlight")
	pulse.DepthMode, pulse.FillColor, pulse.OutlineColor =
		Enum.HighlightDepthMode.Occluded,
		Color3.fromRGB(255, 218, 149),
		Color3.fromRGB(255, 238, 191)
	pulse.Adornee, pulse.Parent = limits, model
	local plateModel = Instance.new("Model")
	plateModel.Name = "MinePlate"
	local function platePart(name: string, material: Enum.Material): Part
		local p = Instance.new("Part")
		p.Name, p.Material = name, material
		p.Anchored, p.CanCollide, p.CanTouch, p.CanQuery, p.CastShadow =
			true, false, false, false, false
		p.Parent = plateModel
		return p
	end
	local plateBody = platePart("PlateFace", Enum.Material.SmoothPlastic)
	local plateEdges = {}
	for i = 1, 4 do
		plateEdges[i] = platePart("GateEdge", Enum.Material.Neon)
	end
	local plateOutline = Instance.new("Highlight")
	plateOutline.Adornee, plateOutline.DepthMode, plateOutline.Parent =
		plateBody, Enum.HighlightDepthMode.AlwaysOnTop, plateModel
	plateOutline.FillTransparency, plateOutline.OutlineTransparency = 1, 0.33
	local plateGui = Instance.new("BillboardGui")
	plateGui.Name, plateGui.Size, plateGui.StudsOffsetWorldSpace =
		"Guardian", UDim2.fromOffset(252, 58), Vector3.new(0, S * 1.76, 0)
	plateGui.Enabled, plateGui.AlwaysOnTop, plateGui.Parent = false, true, model
	plateGui.Adornee = plateBody
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
		local part = platePart("Rune", Enum.Material.Neon)
		part.Color = Color3.fromRGB(136, 204, 255)
		part.Size = Vector3.new(0.25, 4 + i % 2, 0.08)
		runes[i] = part
	end
	return {
		sparkles = {},
		snapFace = snapFace,
		snapOutline = snapOutline,
		model = model,
		frame = frame,
		pool = BlockPool.new(model),
		cells = {},
		lookup = {},
		plateModel = plateModel,
		plateBody = plateBody,
		plateEdges = plateEdges,
		plateOutline = plateOutline,
		runes = runes,
		plateLabel = plateLabel,
		plateFill = fill,
		pulse = pulse,
		limits = limits,
	}
end

local directions = {
	{ face = Enum.NormalId.Back, x = 0, y = 0, d = -1 },
	{ face = Enum.NormalId.Front, x = 0, y = 0, d = 1 },
	{ face = Enum.NormalId.Left, x = -1, y = 0, d = 0 },
	{ face = Enum.NormalId.Right, x = 1, y = 0, d = 0 },
	{ face = Enum.NormalId.Top, x = 0, y = 1, d = 0 },
	{ face = Enum.NormalId.Bottom, x = 0, y = -1, d = 0 },
}

local function sparkle(r: Renderer, cell: Cell, enabled: boolean)
	local part = cell.part
	if not enabled then
		local old = r.sparkles[part]
		if old then
			old.emitter:Clear()
			r.sparkles[part] = nil
		end
		return
	end
	if r.sparkles[part] then
		return
	end
	local emitter = part:FindFirstChildOfClass("ParticleEmitter")
	if not emitter then
		emitter = Instance.new("ParticleEmitter")
		emitter.Name = "OreSparkles"
		emitter.Texture = "rbxasset://textures/particles/sparkles_main.dds"
		emitter.Rate, emitter.LightInfluence, emitter.LightEmission = 0, 0, 0.72
		emitter.Size, emitter.Lifetime, emitter.Speed =
			NumberSequence.new(0.14), NumberRange.new(0.38, 0.75), NumberRange.new(0.9, 2.1)
		emitter.SpreadAngle, emitter.LockedToPart = Vector2.new(180, 180), true
		emitter.Shape, emitter.ShapeStyle, emitter.ShapeInOut =
			Enum.ParticleEmitterShape.Box,
			Enum.ParticleEmitterShapeStyle.Surface,
			Enum.ParticleEmitterShapeInOut.Outward
		emitter.Parent = part
	end
	local interval = 1 + Hash.unit(cell.x, cell.y, cell.d)
	r.sparkles[part] = { emitter = emitter, interval = interval, nextAt = os.clock() + interval }
end

function WallRenderer.snapGlow(r: Renderer, enabled: boolean)
	r.snapOutline.Enabled = enabled
	local front = math.huge
	for _, cell in r.cells do
		front = math.min(front, cell.d)
	end
	for _, cell in r.cells do
		if enabled and cell.d == front then
			cell.part.Parent = r.snapFace
		elseif cell.part.Parent == r.snapFace then
			cell.part.Parent = r.model
		end
	end
end

function WallRenderer.sparkles(r: Renderer, now: number)
	for _, glow in r.sparkles do
		if now >= glow.nextAt then
			glow.emitter:Emit(if glow.interval >= 1.5 then 3 else 2)
			glow.nextAt = now + glow.interval
		end
	end
end

local function addCell(
	r: Renderer,
	key: number,
	x: number,
	y: number,
	d: number,
	ore: number,
	win: any
): Cell?
	local cell = r.cells[key]
	if not cell then
		local part = r.pool.take()
		if not part then
			return nil
		end
		cell = { part = part, x = x, y = y, d = d, ore = ore, plate = false, faces = {} }
		r.cells[key], r.lookup[part] = cell, cell
	end
	cell.ore = ore
	local part = cell.part
	part.Size = Vector3.one * S
	local art = Config.art.worlds[Worlds.of(d).id]
	local tile = art.slots[ore]
	BlockArt.apply(part, if tile then BlockArt.select(tile, x, y, d) else art.lining)
	local rel = d - win.front
	sparkle(r, cell, tile ~= nil and tile.glow and rel < SPARK_LAYERS)
	table.clear(cell.faces)
	for _, side in directions do
		if
			(rel == 0 and side.d == -1)
			or layerValue(win, x + side.x, y + side.y, rel + side.d) == 0
		then
			table.insert(cell.faces, side.face)
		end
	end
	return cell
end

function WallRenderer.update(r: Renderer, win: any, visible: number, hidden: number?)
	local radius = (win.width - 1) // 2
	local used: { [number]: boolean } = {}
	local frontCells: { Cell } = {}
	for rel = 0, visible - 1 do
		for x = -radius, radius do
			for y = 0, win.height - 1 do
				local d = win.front + rel
				local key, ore = State.cellKey(x, y, d), layerValue(win, x, y, rel)
				if ore ~= Wire.PLATE and key ~= hidden and WallRenderer.exposed(win, x, y, rel) then
					local cell = addCell(r, key, x, y, d, ore, win)
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
			sparkle(r, cell, false)
			r.pool.release(cell.part)
		elseif cell.part.Parent ~= r.model then
			cell.part.Parent = r.model
		end
	end
	if #frontCells > 0 and #frontCells <= 3 then
		for _, cell in frontCells do
			cell.part.Parent = r.limits
		end
	end
	r.pulse.Enabled = #frontCells > 0 and #frontCells <= 3
end

function WallRenderer.clear(r: Renderer)
	for key, cell in r.cells do
		r.cells[key], r.lookup[cell.part] = nil, nil
		sparkle(r, cell, false)
		r.pool.release(cell.part)
	end
	r.pulse.Enabled = false
end

function WallRenderer.plate(
	r: Renderer,
	win: any,
	display: Ride.PlateDisplay?,
	translate: (string, ...any) -> string,
	strength: number,
	flash: number
)
	local gui = r.plateLabel.Parent :: BillboardGui
	local body = r.plateBody
	if not display then
		r.plateModel.Parent = nil
		r.lookup[body] = nil
		gui.Enabled = false
		return
	end
	local distance = display.distance
	local world = Worlds.of(display.depth)
	local nextColor = Worlds.of(world.finish).color
	local gateColor = Color3.fromRGB(nextColor[1], nextColor[2], nextColor[3])
		:Lerp(Color3.new(1, 1, 1), 0.26)
	local white = Color3.new(1, 1, 1)
	local width, height = win.width * S, win.height * S
	local face = r.frame * CFrame.new(0, height / 2, -distance)
	body.CFrame, body.Size = face * CFrame.new(0, 0, -S / 2), Vector3.new(width, height, S)
	local color = Worlds.of(display.depth).color
	body.Color = Color3.fromRGB(color[1], color[2], color[3])
		:Lerp(Color3.new(0.1, 0.12, 0.18), 0.42)
		:Lerp(white, flash * 0.55)
	local relative = display.depth - win.front
	body.CanQuery = relative >= 0 and relative < Config.mine.window
	r.lookup[body] = if body.CanQuery
		then { part = body, x = 0, y = 0, d = display.depth, ore = Wire.PLATE, plate = true }
		else nil
	for i, edge in r.plateEdges do
		local vertical = i <= 2
		edge.Size = if vertical
			then Vector3.new(0.63, height, 0.3)
			else Vector3.new(width, 0.65, 0.3)
		local x = if vertical then (if i == 1 then -1 else 1) * (width / 2 - 0.4) else 0
		local y = if vertical then 0 else (if i == 3 then -1 else 1) * (height / 2 - 0.4)
		edge.CFrame, edge.Color = face * CFrame.new(x, y, 0.19), gateColor:Lerp(white, flash)
	end
	local near = relative == 0 and distance < S + 1
	for i, rune in r.runes do
		rune.Transparency = if near then 0 else 1
		if near then
			rune.CFrame = face
				* CFrame.new((i - 2) * 3.2, 0, 0.08)
				* CFrame.Angles(0, 0, if i % 2 == 0 then 0.45 else -0.45)
		end
	end
	r.plateOutline.Enabled, r.plateOutline.OutlineColor = not near, gateColor:Lerp(white, flash)
	r.plateModel.Parent = r.model
	gui.Enabled = near
	if not near then
		return
	end
	local hp = math.max(0, world.plate.hp - display.damage)
	r.plateFill.Size = UDim2.fromScale(hp / world.plate.hp, 1)
	local ratio = strength / world.plate.recommendedStrength
	r.plateLabel.TextColor3 = if ratio >= 1
		then Color3.fromRGB(145, 250, 173)
		elseif ratio >= 0.5 then Color3.fromRGB(255, 220, 144)
		else Color3.fromRGB(255, 163, 161)
	r.plateLabel.Text =
		translate("mine_plate", math.ceil(hp), world.plate.recommendedStrength, strength)
end

function WallRenderer.moves(
	r: Renderer,
	win: any,
	shift: number,
	parts: { BasePart },
	frames: { CFrame }
)
	for _, cell in r.cells do
		local y = (cell.y + 0.5) * S
		local localFrame = CFrame.new(cell.x * S, y, -((cell.d - win.front + 0.5) * S + shift))
		table.insert(parts, cell.part)
		table.insert(frames, r.frame * localFrame)
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
