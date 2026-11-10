--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Wire = require(Shared.Mine.MineWire)
local Hash = require(Shared.Mine.Hash)
local Ride = require(Shared.Mine.Ride)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local BlockPool = require(script.Parent.BlockPool)
local Kit = require(script.Parent.Parent.Ui.Kit)

local S = Config.mine.blockSize
local FACE_BUDGET = 176
local WallRenderer = {}
local colors: { [string]: Color3 } = {}
for _, ore in Config.ores do
	colors[ore.id] = Color3.fromRGB(ore.color[1], ore.color[2], ore.color[3])
end

type Cell = {
	part: Part,
	x: number,
	y: number,
	d: number,
	ore: number,
	plate: boolean,
	primary: SurfaceGui?,
	side: SurfaceGui?,
}
type Face = { gui: SurfaceGui, part: Part, point: Vector3, score: number }
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
	glint: ImageLabel,
	glintAt: number,
	faceCamera: CFrame?,
	faceShift: number,
	faces: { Face },
	faceRay: RaycastParams,
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
	Kit.image(plateGui, "PlatePanel", UDim2.fromScale(1, 1), UDim2.fromOffset(0, 0), "frame-iron")
	local plateLabel = Kit.label(
		plateGui,
		"PlateLabel",
		UDim2.new(1, -16, 0, 33),
		UDim2.fromOffset(8, 5),
		15,
		true
	)
	plateLabel.TextWrapped = true
	local fill = Kit.bar(
		plateGui,
		"PlateHealth",
		UDim2.new(1, -24, 0, 7),
		UDim2.fromOffset(12, 42),
		Color3.fromRGB(117, 205, 253)
	)
	local runes = {}
	for i = 1, 3 do
		local part = platePart("Rune", Enum.Material.Neon)
		part.Color = Color3.fromRGB(136, 204, 255)
		part.Size = Vector3.new(0.25, 4 + i % 2, 0.08)
		runes[i] = part
	end
	local star = Config.art.sprites["i-star"].rect
	local glint = Instance.new("ImageLabel")
	glint.Name, glint.Size, glint.AnchorPoint =
		"TreasureGlint", UDim2.fromOffset(15, 15), Vector2.new(0.5, 0.5)
	glint.Position, glint.BackgroundTransparency = UDim2.fromScale(0.73, 0.27), 1
	glint.Image, glint.ResampleMode = Config.art.ui, Enum.ResamplerMode.Pixelated
	glint.ImageRectOffset, glint.ImageRectSize =
		Vector2.new(star[1], star[2]), Vector2.new(star[3], star[4])
	glint.ZIndex = 2
	local faceRay = RaycastParams.new()
	faceRay.FilterType, faceRay.FilterDescendantsInstances =
		Enum.RaycastFilterType.Include, { model }
	return {
		faceShift = 0,
		faceRay = faceRay,
		faces = {},
		glint = glint,
		glintAt = os.clock() + 2,
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

local function showTexture(
	part: Part,
	name: string,
	tile: { atlas: string, rect: { number } }?,
	face: Enum.NormalId?,
	treasure: boolean
): SurfaceGui?
	local surface = part:FindFirstChild(name) :: SurfaceGui?
	if not tile or not face then
		if surface then
			surface.Enabled = false
		end
		return nil
	end
	if not surface then
		surface = Instance.new("SurfaceGui")
		surface.Name, surface.SizingMode = name, Enum.SurfaceGuiSizingMode.FixedSize
		surface.CanvasSize = Vector2.new(64, 64)
		local pixels = Instance.new("ImageLabel")
		pixels.Name, pixels.Size, pixels.BackgroundTransparency = "Pixels", UDim2.fromScale(1, 1), 1
		pixels.ResampleMode, pixels.Parent = Enum.ResamplerMode.Pixelated, surface
		surface.Parent = part
	end
	local pixels = surface:FindFirstChild("Pixels") :: ImageLabel
	local rect = tile.rect
	pixels.Image = Config.art.textures[tile.atlas]
	pixels.ImageRectOffset, pixels.ImageRectSize =
		Vector2.new(rect[1], rect[2]), Vector2.new(rect[3], rect[4])
	surface.Face, surface.LightInfluence = face, if treasure then 0.12 else 0.42
	return surface
end

local directions = {
	{ face = Enum.NormalId.Back, x = 0, y = 0, d = -1 },
	{ face = Enum.NormalId.Left, x = -1, y = 0, d = 0 },
	{ face = Enum.NormalId.Right, x = 1, y = 0, d = 0 },
	{ face = Enum.NormalId.Top, x = 0, y = 1, d = 0 },
	{ face = Enum.NormalId.Bottom, x = 0, y = -1, d = 0 },
}

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
		cell = { part = part, x = x, y = y, d = d, ore = ore, plate = false }
		r.cells[key], r.lookup[part] = cell, cell
	end
	cell.ore = ore
	cell.part.Size = Vector3.one * (S - 0.045)
	cell.part.Color = tint(ore, x, y, d)
	local world = Worlds.of(d)
	local depth = d - win.front
	local treasure = ore == #world.ores
	cell.part.Material = if treasure then Enum.Material.Neon else Enum.Material.SmoothPlastic
	local first, second: Enum.NormalId? = nil, nil
	for _, side in directions do
		if
			(depth == 0 and side.d == -1)
			or layerValue(win, x + side.x, y + side.y, depth + side.d) == 0
		then
			if not first then
				first = side.face
			else
				second = side.face
				break
			end
		end
	end
	local tile = Config.art.ores[world.id][ore]
	cell.primary = showTexture(cell.part, "OrePixels", tile, first, treasure)
	cell.side = showTexture(
		cell.part,
		"OreSide",
		tile,
		if depth < Config.mine.nearWindow then second else nil,
		treasure
	)
	return cell
end

function WallRenderer.update(r: Renderer, win: any, visible: number, hidden: number?)
	r.faceCamera = nil
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

function WallRenderer.textures(r: Renderer, camera: Camera, shift: number)
	local count = r.pool.used()
	if count == 0 then
		return
	end
	local eye = camera.CFrame
	local previous = r.faceCamera
	local small = count * 2 <= FACE_BUDGET
	if
		previous
		and (
			small
			or (
				(eye.Position - previous.Position).Magnitude < 0.65
				and eye.LookVector:Dot(previous.LookVector) > 0.997
				and math.abs(shift - r.faceShift) < S / 2
			)
		)
	then
		return
	end
	r.faceCamera, r.faceShift = eye, shift
	local faces = r.faces
	table.clear(faces)
	local viewport = camera.ViewportSize
	local function consider(part: Part, gui: SurfaceGui?)
		if not gui then
			return
		end
		gui.Enabled = small
		if small then
			return
		end
		local normal = part.CFrame:VectorToWorldSpace(Vector3.FromNormalId(gui.Face))
		local point = part.Position + normal * (S / 2 - 0.045)
		local ray = eye.Position - point
		local incidence = normal:Dot(ray)
		if incidence <= 0 then
			return
		end
		local projected = camera:WorldToViewportPoint(point)
		if projected.Z <= 0 then
			return
		end
		local border = viewport.Y * S / math.max(1, projected.Z)
		if
			projected.X < -border
			or projected.X > viewport.X + border
			or projected.Y < -border
			or projected.Y > viewport.Y + border
		then
			return
		end
		local score = incidence / math.max(1, ray.Magnitude ^ 3)
		table.insert(faces, { gui = gui, part = part, point = point, score = score })
	end
	for _, cell in r.cells do
		consider(cell.part, cell.primary)
		consider(cell.part, cell.side)
	end
	if small then
		return
	end

	-- Give the texture budget to faces with visible screen area first.
	table.sort(faces, function(a, b)
		return a.score > b.score
	end)
	local enabled = 0
	for _, face in faces do
		local hit = workspace:Raycast(eye.Position, face.point - eye.Position, r.faceRay)
		if hit and hit.Instance == face.part then
			face.gui.Enabled = true
			enabled += 1
			if enabled == FACE_BUDGET then
				return
			end
		end
	end
	-- A face with its center covered can still show along the edge of a narrow opening.
	for _, face in faces do
		if not face.gui.Enabled then
			face.gui.Enabled = true
			enabled += 1
			if enabled == FACE_BUDGET then
				break
			end
		end
	end
end

function WallRenderer.glint(r: Renderer, front: number, now: number, enabled: boolean)
	local image = r.glint
	if image.Parent then
		local t = (now - r.glintAt + 0.38) / 0.38
		if not enabled or t >= 1 or not image:IsDescendantOf(r.model) then
			image.Parent = nil
			r.glintAt = now + 3.5
		else
			image.ImageTransparency = 1 - math.sin(math.pi * math.max(0, t))
		end
	elseif enabled and now >= r.glintAt then
		r.glintAt = now + 3.5
		for _, cell in r.cells do
			if cell.d < front + 4 and cell.ore == #Worlds.of(cell.d).ores then
				local face = cell.primary
				if face and face.Enabled then
					image.ImageTransparency, image.Parent = 1, face
					r.glintAt = now + 0.38
					break
				end
			end
		end
	end
end

function WallRenderer.clear(r: Renderer)
	r.faceCamera = nil
	table.clear(r.faces)
	for key, cell in r.cells do
		r.cells[key], r.lookup[cell.part] = nil, nil
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
	body.Color = tint(Wire.PLATE, 0, 0, display.depth):Lerp(white, flash * 0.55)
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
