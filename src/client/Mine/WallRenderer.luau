--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Wire = require(Shared.Mine.MineWire)
local Hash = require(Shared.Mine.Hash)
local Ride = require(Shared.Mine.Ride)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local BlockPool = require(script.Parent.BlockPool)
local PlateLook = require(script.Parent.PlateLook)

local S = Config.mine.blockSize
local BlockArt = require(script.Parent.BlockArt)
local ArtModel = require(game:GetService("ReplicatedStorage").Shared.Models.ArtModel)
local CelMesh = require(script.Parent.Parent.Fx.CelMesh)
local CelChestData = require(script.Parent.Parent.Fx.CelChestData)
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
	plateLook: PlateLook.Look,
	pulse: Highlight,
	limits: Model,
	sparkles: { [Part]: Sparkle },
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
	local plateBody = platePart("PlateFace", Enum.Material.Slate)
	local plateEdges = {}
	for i = 1, 4 do
		plateEdges[i] = platePart("GateEdge", Enum.Material.SmoothPlastic)
	end
	local plateOutline = Instance.new("Highlight")
	plateOutline.Adornee, plateOutline.DepthMode, plateOutline.Parent =
		plateBody, Enum.HighlightDepthMode.AlwaysOnTop, plateModel
	plateOutline.FillTransparency, plateOutline.OutlineTransparency = 1, 0.33
	local plateLook = PlateLook.new(model, plateBody)
	return {
		sparkles = {},
		model = model,
		frame = frame,
		pool = BlockPool.new(model),
		cells = {},
		lookup = {},
		plateModel = plateModel,
		plateBody = plateBody,
		plateEdges = plateEdges,
		plateOutline = plateOutline,
		plateLook = plateLook,
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

function WallRenderer.sparkles(r: Renderer, now: number)
	for _, glow in r.sparkles do
		if now >= glow.nextAt then
			glow.emitter:Emit(if glow.interval >= 1.5 then 3 else 2)
			glow.nextAt = now + glow.interval
		end
	end
end

local hex = Color3.fromHex
local CHEST_AURA: { [string]: { level: number, colors: { Color3 }, moteColors: { Color3 }? } } = {
	silver = { level = 1, colors = { hex("FFFFFF"), hex("CFE6FF"), hex("7A8BA6") } },
	gold = { level = 2, colors = { hex("FFF6A8"), hex("FFC83D"), hex("B46B00") } },
	crystal = { level = 3, colors = { hex("F2D9FF"), hex("B066FF"), hex("5F239F") } },
	-- the pickaxe chest: one comet per family
	pickaxe = {
		level = 2,
		colors = { hex("E3E8FF"), hex("7E8BFF"), hex("2A3CA8") },
		moteColors = { hex("45CFFF"), hex("FF6A2A"), hex("FFA51C"), hex("BDEFFF") },
	},
}
-- the chest aura (twinkles and orbiting comets) in chest model space; nil for the plain wooden chest
function WallRenderer.chestAura(kind: string): any
	local a = CHEST_AURA[kind]
	return a
		and {
			centre = Vector3.new(0, 0.05, 0),
			radius = if kind == "pickaxe" then 0.85 else 0.72,
			level = a.level,
			style = "chest",
			colors = a.colors,
			moteColors = a.moteColors,
		}
end

-- [владелец 11.11: «закинь все что ты сделал»] wall chests are the cel chests (CelChestData), front towards the player
-- the cel chest template of `kind` (also used by the QA mirror)
function WallRenderer.chestTemplate(kind: string): Model?
	local prims = CelChestData[kind]
	return prims
		and CelMesh.template("chest_" .. kind, prims, {
			size = S * 0.96,
			axes = "xyz",
			sizeAxes = "all",
			solidBounds = true,
			aura = WallRenderer.chestAura(kind),
		})
end

local function chestModel(kind: string?, part: BasePart): Model?
	local template = if kind then WallRenderer.chestTemplate(kind) else nil
	if not template then
		return nil
	end
	local model = CelMesh.attach(template, part, CFrame.new(0, -S * 0.02, 0))
	model.Name = "ArtModel"
	model:SetAttribute("CelChest", kind) -- QA mirror rebuilds it from this
	model.Parent = part
	return model
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
	local eventCell = ore == Wire.VEIN or ore == Wire.BOMB or ore == Wire.RUBBLE
	local tile = art.slots[if eventCell then 1 else ore]
	local texture = if tile then BlockArt.select(tile, x, y, d) else art.lining
	local tier = Wire.chestTier(ore)
	local previousArt = part:GetAttribute("ChestTier")
	if previousArt ~= tier then
		local old = part:FindFirstChild("ArtModel")
		if old then
			old:Destroy()
		end
		part:SetAttribute("ChestTier", tier)
		if tier then
			local entry = Config.art.chests.wall[tier]
			local model = entry
				and (chestModel(entry.kind, part) or ArtModel.mount(entry.model, part))
			part.Transparency = if model then 1 else 0
		else
			part.Transparency = 0
		end
	end
	if part.MaterialVariant ~= "COCOMine_" .. texture then
		BlockArt.apply(part, texture)
	end
	if eventCell then
		part.Color = Color3.fromHex(
			if ore == Wire.VEIN
				then Config.events.visual.gold
				elseif ore == Wire.BOMB then Config.events.visual.red
				else Config.events.visual.gray
		)
	else
		part.Color = Color3.new(1, 1, 1)
	end
	if tier and not part:FindFirstChild("ArtModel") then
		part.MaterialVariant = ""
		part.Color = Color3.fromHex(({ "B9855A", "C7D3DF", "FFD23F", "AA8CF4" })[tier])
	end
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
	local body = r.plateBody
	if not display then
		r.plateModel.Parent = nil
		r.lookup[body] = nil
		r.plateLook.gui.Enabled = false
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
		-- a chunky frame, not a thin neon line: the plate reads as a gate
		edge.Size = if vertical then Vector3.new(1.3, height, 0.7) else Vector3.new(width, 1.3, 0.7)
		local x = if vertical then (if i == 1 then -1 else 1) * (width / 2 - 0.65) else 0
		local y = if vertical then 0 else (if i == 3 then -1 else 1) * (height / 2 - 0.65)
		edge.CFrame, edge.Color = face * CFrame.new(x, y, 0.19), gateColor:Lerp(white, flash)
	end
	local near = relative == 0 and distance < S + 1
	r.plateOutline.Enabled, r.plateOutline.OutlineColor = not near, gateColor:Lerp(white, flash)
	r.plateModel.Parent = r.model
	PlateLook.update(r.plateLook, world, display.depth, display.damage, strength, near, translate)
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
