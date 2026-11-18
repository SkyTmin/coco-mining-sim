--!strict
-- Runtime scenery in plot-local coordinates (+Z faces the camp).
local Config = game:GetService("ReplicatedStorage").Shared.Config
local Cfg = require(Config)

local CampArt = {}

local S = Cfg.mine.blockSize
local DEPTH = Cfg.plots.platformDepth * S
local SPECTATORS = Cfg.plots.spectatorDepth * S
local OPENING_W = Cfg.plots.frameWidth * S
local OPENING_H = Cfg.mine.height * S
local GREY = Color3.fromRGB(120, 120, 128)

export type PlaqueData = {
	name: string?, -- nil = free entrance (no plaque text)
	rank: string?, -- Config.rebirth.ranks[i].id or nil (no rank)
	depth: number?, -- best depth in layers
	likes: number?,
	hologram: boolean?, -- a weekly-top hologram stands here
	place: number?, -- weekly place of that hologram (№3 недели)
}

export type Entrance = {
	model: Model,
	-- 9 looks: "none" or a rank id from Config.rebirth.ranks; "none" + occupied = false → lanterns off
	setLook: (look: string, occupied: boolean) -> (),
	setPlaque: (data: PlaqueData) -> (),
	-- colour of the owner's current world, nil = dark entrance
	setLight: (color: Color3?) -> (),
	-- 4 pedestals: [1] the held pickaxe, [2..4] the rarest ones; Codex parents pickaxe models to these attachments
	showcase: { Attachment },
	-- where ТЗ-06б puts flying chests (left of the arch, seen from the camp)
	chestShelf: Attachment,
	-- the board above the arch for a duel score; nil left/right hides it
	setDuel: (left: number?, right: number?) -> (),
	destroy: () -> (),
}

export type DepthScale = {
	pillar: BasePart,
	-- world-space height of a depth on the pillar (worlds take equal shares [ТЗ-06 §5, P-5]); 0..1 inside the world
	pointAt: (worldIndex: number, fraction: number) -> Vector3,
	-- the weekly record mark; nil hides it
	setRecord: (worldIndex: number?, fraction: number?, depth: number?) -> (),
}

export type Board = {
	model: Model,
	-- the SurfaceGui frame Codex fills with rows made by CampArt.boardRow
	content: Frame,
	-- the «Неделя / Всё время» switch part (ClickDetector + ProximityPrompt are added by Codex)
	switch: BasePart,
}

export type BoardEntry = {
	place: number,
	userId: number,
	name: string,
	depth: number,
	self: boolean?,
}

local function part(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3?
): Part
	local p = Instance.new("Part")
	p.Name, p.Size, p.CFrame, p.Color = name, size, cframe, color or GREY
	p.Anchored, p.CanTouch, p.TopSurface, p.BottomSurface =
		true, false, Enum.SurfaceType.Smooth, Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

local camp = Cfg.camp
local hex = Color3.fromHex
local stone, wood, iron = hex("AD9780"), hex("76503B"), hex("38424F")
local amber = hex(camp.lampColor)
local V, F, A = Vector3.new, CFrame.new, CFrame.Angles
local function group(parent: Instance, name: string): Model
	local m = Instance.new("Model")
	m.Name = name
	if workspace.StreamingEnabled then
		m.ModelStreamingMode = Enum.ModelStreamingMode.Atomic
	end
	m.Parent = parent
	return m
end

local function block(
	parent: Instance,
	name: string,
	frame: CFrame,
	size: Vector3,
	color: Color3,
	material: Enum.Material
): Part
	local p = part(parent, name, size, frame, color)
	p.Material = material
	return p
end

local function disc(
	parent: Instance,
	name: string,
	frame: CFrame,
	radius: number,
	height: number,
	color: Color3,
	material: Enum.Material
): Part
	local p = block(
		parent,
		name,
		frame * A(0, 0, math.pi / 2),
		V(height, 2 * radius, 2 * radius),
		color,
		material
	)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local function lantern(root: Instance, frame: CFrame, lit: boolean): Part
	local m = group(root, "Lantern")
	disc(m, "Foot", frame * F(0, 0.35, 0), 1.25, 0.7, stone, Enum.Material.Slate)
	block(m, "Post", frame * F(0, 3.6, 0), V(0.75, 7, 0.75), wood, Enum.Material.Wood)
	block(m, "Crossarm", frame * F(0.7, 7.25, 0), V(2.3, 0.45, 0.5), iron, Enum.Material.Metal)
	block(
		m,
		"Brace",
		frame * F(0.5, 6.6, 0) * A(0, 0, -0.72),
		V(0.28, 1.7, 0.35),
		wood,
		Enum.Material.Wood
	)
	local bulb =
		block(m, "Opal", frame * F(1.45, 6.2, 0), V(0.94, 1.4, 0.94), amber, Enum.Material.Neon)
	for _, y in { 5.43, 6.98 } do
		disc(m, "Cap", frame * F(1.45, y, 0), 0.84, 0.18, iron, Enum.Material.Metal)
	end
	for _, x in { -0.5, 0.5 } do
		block(
			m,
			"Cage",
			frame * F(1.45 + x, 6.2, 0.48),
			V(0.11, 1.5, 0.11),
			iron,
			Enum.Material.Metal
		)
	end
	if lit then
		local light = Instance.new("PointLight")
		light.Color, light.Range, light.Brightness, light.Shadows, light.Parent =
			amber, 22, 1.4, false, bulb
	end
	return bulb
end

local function supplies(root: Instance, f: CFrame, tent: boolean, index: number)
	local m = group(root, "Supplies")
	local function box(
		name: string,
		x: number,
		y: number,
		z: number,
		w: number,
		h: number,
		d: number,
		color: Color3
	)
		return block(m, name, f * F(x, y, z), V(w, h, d), color, Enum.Material.WoodPlanks)
	end
	for i = 1, 2 do
		local x, z = i * 3.8 - 4, i % 2 * 2
		box("Crate", x, 1.65, z, 3.5, 3.3, 3.3, wood)
		for _, dx in { -1.36, 1.36 } do
			box("Batten", x + dx, 1.65, z + 1.7, 0.35, 3.35, 0.24, stone)
		end
		block(
			m,
			"Diagonal",
			f * F(x, 1.65, z + 1.85) * A(0, 0, -0.8),
			V(0.38, 4, 0.2),
			stone,
			Enum.Material.Wood
		)
	end
	local barrel = f * F(-4.8, 1.55, 2.1)
	disc(m, "Cask", barrel, 1.25, 3.1, wood, Enum.Material.WoodPlanks)
	for _, y in { -0.95, 0.95 } do
		disc(m, "Hoop", barrel * F(0, y, 0), 1.28, 0.22, iron, Enum.Material.Metal)
	end
	if tent then
		local canopy = if index % 2 == 0 then hex("C29951") else hex("4E6959")
		for _, s in { -1, 1 } do
			block(
				m,
				"Canvas",
				f * F(s * 2.2, 2.7, -6) * A(0, 0, s * 0.83),
				V(0.22, 6.5, 8.5),
				canopy,
				Enum.Material.Fabric
			)
			block(
				m,
				"TentPole",
				f * F(0, 2.45, -6 + s * 4.4),
				V(0.3, 4.9, 0.3),
				wood,
				Enum.Material.Wood
			)
		end
		box("Ridge", 0, 4.93, -6, 0.4, 0.45, 9, wood)
	elseif index % 2 == 0 then
		local reel = f * F(-1, 2, -5) * A(0, 0, math.pi / 2)
		disc(m, "Cable", reel, 1.55, 2.8, iron, Enum.Material.Metal)
		for _, s in { -1, 1 } do
			disc(m, "Reel", reel * F(0, s * 1.48, 0), 2, 0.3, wood, Enum.Material.Wood)
		end
	else
		for _, x in { -1.4, 1.4 } do
			block(m, "Rail", f * F(x, 0.35, -6), V(0.24, 0.35, 8), iron, Enum.Material.Metal)
		end
		for j = -1, 1 do
			box("Sleeper", 0, 0.13, -6 + j * 2.8, 4.2, 0.26, 0.64, wood)
		end
	end
end

function CampArt.crater(root: Folder)
	local rng = Random.new(706)
	local radius = Cfg.plots.entranceRadius
	disc(root, "CommonFloor", F(0, -0.55, 0), radius + 2, 1.1, hex("886D52"), Enum.Material.Ground)
	disc(
		root,
		"FlagstoneCourt",
		F(0, 0.05, 0),
		camp.centreRadius,
		0.2,
		stone,
		Enum.Material.Cobblestone
	)
	local segments = Cfg.plots.count
	for i = 1, segments do
		local f = A(0, (i - 1) * math.pi * 2 / segments, 0)
		local sector = group(root, "Rim_" .. i)
		-- The keystones span the roof; the corridor below remains open down its entire axis.
		for col = -3, 3 do
			local x = col * 8.8
			local floor = if math.abs(x) < OPENING_W / 2 + 5 then camp.archHeight + 4 else 0
			local top = rng:NextInteger(camp.rimMin, camp.rimMax)
			local y = floor
			while y < top do
				local h = math.min(top - y, rng:NextNumber(camp.rockMin, camp.rockMax))
				block(
					sector,
					"Stratum",
					f
						* F(x, y + h / 2, -radius - 10 - rng:NextNumber(0, 3))
						* A(0, rng:NextNumber(-0.09, 0.09), rng:NextNumber(-0.08, 0.08)),
					V(rng:NextNumber(11, 15), h + 1.5, rng:NextNumber(11, 18)),
					hex(camp.rockColors[rng:NextInteger(1, #camp.rockColors)]),
					Enum.Material.Rock
				)
				y += h
			end
		end
		local length = radius - camp.centreRadius
		block(
			sector,
			"Path",
			f * F(0, 0.04, -camp.centreRadius - length / 2),
			V(camp.pathWidth, 0.18, length + 2),
			stone,
			Enum.Material.Cobblestone
		)
		for _, side in { -1, 1 } do
			block(
				sector,
				"Kerb",
				f * F(side * (camp.pathWidth / 2 + 0.12), 0.13, -camp.centreRadius - length / 2),
				V(0.26, 0.22, length),
				hex("CEB695"),
				Enum.Material.Slate
			)
		end
		local between = f * A(0, math.pi / segments, 0)
		supplies(sector, between * F(0, 0, -radius * 0.77), i <= camp.tentCount, i)
	end
	for i = 1, camp.lampCount do
		local angle = (i - 0.5) * math.pi * 2 / camp.lampCount
		lantern(root, A(0, angle, 0) * F(0, 0, -camp.lampRadius), true)
	end
	disc(root, "TradingPad", F(22, 0.09, 22), 5, 0.24, hex("967E66"), Enum.Material.Cobblestone)
end

function CampArt.entrance(model: Model, frame: CFrame): Entrance
	local line = frame * CFrame.new(0, 0, DEPTH + SPECTATORS)
	local arch = Instance.new("Model")
	arch.Name = "Arch"
	arch.Parent = model
	for _, side in { -1, 1 } do
		part(
			arch,
			"Pillar",
			Vector3.new(4, 24, 4),
			line * CFrame.new(side * (OPENING_W / 2 + 4), 12, 0)
		)
	end
	part(arch, "Beam", Vector3.new(OPENING_W + 12, 4, 4), line * CFrame.new(0, OPENING_H + 7, 0))
	local plaquePart =
		part(arch, "Plaque", Vector3.new(24, 6, 0.5), line * CFrame.new(0, OPENING_H + 12, 1.5))
	local gui = Instance.new("SurfaceGui")
	gui.Face, gui.PixelsPerStud, gui.Parent = Enum.NormalId.Back, 20, plaquePart
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled = UDim2.fromScale(1, 1), 1, true
	label.Text, label.Parent = "", gui
	local light = Instance.new("SurfaceLight")
	light.Face, light.Range, light.Brightness, light.Enabled = Enum.NormalId.Back, 30, 2, false
	light.Parent = part(
		arch,
		"LightSource",
		Vector3.new(OPENING_W, OPENING_H, 0.2),
		frame * CFrame.new(0, OPENING_H / 2, 2)
	)
	local showcase = {}
	for i, offset in
		{
			Vector3.new(-20, 0, 6),
			Vector3.new(20, 0, 6),
			Vector3.new(-27, 0, 6),
			Vector3.new(27, 0, 6),
		}
	do
		local pedestal = part(
			model,
			"Pedestal" .. i,
			Vector3.new(4, 3, 4),
			line * CFrame.new(offset + Vector3.new(0, 1.5, 0))
		)
		local a = Instance.new("Attachment")
		a.Name, a.Position, a.Parent = "Item", Vector3.new(0, 3.5, 0), pedestal
		showcase[i] = a
	end
	local shelfPart = part(
		model,
		"ChestShelf",
		Vector3.new(10, 1, 6),
		line * CFrame.new(-(OPENING_W / 2 + 7), 0.5, -6)
	)
	local shelf = Instance.new("Attachment")
	shelf.Name, shelf.Position, shelf.Parent = "Shelf", Vector3.new(0, 0.5, 0), shelfPart
	local duel =
		part(arch, "DuelBoard", Vector3.new(16, 4, 0.5), line * CFrame.new(0, OPENING_H + 18, 1.5))
	duel.Transparency = 1
	local duelGui = Instance.new("SurfaceGui")
	duelGui.Face, duelGui.Enabled, duelGui.Parent = Enum.NormalId.Back, false, duel
	local duelLabel = label:Clone()
	duelLabel.Parent = duelGui
	return {
		model = model,
		setLook = function(_look: string, _occupied: boolean) end,
		setPlaque = function(data: PlaqueData)
			label.Text = if data.name
				then string.format(
					"%s · %s · %s",
					data.name,
					tostring(data.depth or 0),
					tostring(data.likes or 0)
				)
				else ""
		end,
		setLight = function(color: Color3?)
			light.Enabled = color ~= nil
			light.Color = color or Color3.new(1, 1, 1)
		end,
		showcase = showcase,
		chestShelf = shelf,
		setDuel = function(left: number?, right: number?)
			duelGui.Enabled = left ~= nil and right ~= nil
			duelLabel.Text = if left and right then string.format("%d : %d", left, right) else ""
		end,
		destroy = function()
			arch:Destroy()
		end,
	}
end

function CampArt.depthScale(root: Folder, centre: CFrame): DepthScale
	local height = 25
	local pillar =
		part(root, "DepthScale", Vector3.new(5, height, 5), centre * CFrame.new(0, height / 2, 0))
	local mark =
		part(root, "WeekRecord", Vector3.new(6, 0.4, 6), centre, Color3.fromRGB(255, 200, 61))
	mark.Transparency = 1
	local worlds = #Cfg.worlds
	local function pointAt(worldIndex: number, fraction: number): Vector3
		local share = (math.clamp(worldIndex, 1, worlds) - 1 + math.clamp(fraction, 0, 1)) / worlds
		return (centre * CFrame.new(0, share * height, 0)).Position
	end
	return {
		pillar = pillar,
		pointAt = pointAt,
		setRecord = function(worldIndex: number?, fraction: number?, _depth: number?)
			mark.Transparency = if worldIndex then 0 else 1
			if worldIndex then
				mark.CFrame = CFrame.new(pointAt(worldIndex, fraction or 0))
			end
		end,
	}
end

function CampArt.board(root: Folder, frame: CFrame): Board
	local model = Instance.new("Model")
	model.Name, model.Parent = "TopBoard", root
	local face = part(model, "Face", Vector3.new(16, 20, 1), frame * CFrame.new(0, 11, 0))
	local gui = Instance.new("SurfaceGui")
	gui.Face, gui.PixelsPerStud, gui.Parent = Enum.NormalId.Front, 25, face
	local content = Instance.new("Frame")
	content.Name, content.Size, content.BackgroundTransparency, content.Parent =
		"Content", UDim2.fromScale(1, 1), 1, gui
	local switch = part(
		model,
		"Switch",
		Vector3.new(6, 2, 1),
		frame * CFrame.new(0, 2.5, -0.5),
		Color3.fromRGB(255, 200, 61)
	)
	return { model = model, content = content, switch = switch }
end

-- One row of the top board (place, avatar, name, depth); Codex lays rows out in `content`.
function CampArt.boardRow(parent: Instance, entry: BoardEntry): Frame
	local row = Instance.new("Frame")
	row.Name, row.Size, row.BackgroundTransparency = "Row", UDim2.new(1, 0, 0, 40), 1
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled = UDim2.fromScale(1, 1), 1, true
	label.Text = string.format("%d. %s — %d", entry.place, entry.name, entry.depth)
	label.Parent = row
	row.Parent = parent
	return row
end

-- Turns a rig Codex built from a HumanoidDescription into a weekly-top hologram (material, shimmer).
function CampArt.hologram(rig: Model)
	for _, d in rig:GetDescendants() do
		if d:IsA("BasePart") then
			d.Material, d.Color, d.Transparency =
				Enum.Material.ForceField, Color3.fromRGB(120, 200, 255), 0.3
		end
	end
end

return CampArt
