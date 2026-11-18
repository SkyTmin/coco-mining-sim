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
	setLight: (color: Color3?, dim: boolean?) -> (),
	-- 4 pedestals: [1] the held pickaxe, [2..4] the rarest ones; Codex parents pickaxe models to these attachments
	showcase: { Attachment },
	-- where ТЗ-06б puts flying chests (left of the arch, seen from the camp)
	chestShelf: Attachment,
	-- the board above the arch for a duel score; nil left/right hides it
	setDuel: (left: number?, right: number?, a: string?, b: string?) -> (),
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

local Format = require(game:GetService("ReplicatedStorage").Shared.Format)
local function lettering(parent: BasePart, face: Enum.NormalId): (SurfaceGui, TextLabel)
	local gui = Instance.new("SurfaceGui")
	gui.Face, gui.SizingMode, gui.PixelsPerStud, gui.LightInfluence, gui.Parent =
		face, Enum.SurfaceGuiSizingMode.PixelsPerStud, 26, 0.1, parent
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled, label.Font =
		UDim2.fromScale(0.96, 0.88), 1, true, Enum.Font.GothamBold
	label.Position, label.TextColor3, label.TextStrokeTransparency, label.Text, label.Parent =
		UDim2.fromScale(0.02, 0.06), hex("FFF5DE"), 0.58, "", gui
	return gui, label
end

function CampArt.entrance(model: Model, frame: CFrame): Entrance
	local line = frame * F(0, 0, DEPTH + SPECTATORS)
	local arch = group(model, "Arch")
	local trim = group(arch, "RankTrim")
	local w, h = camp.archWidth, camp.archHeight
	local posts, bulbs = {}, {}
	for _, side in { -1, 1 } do
		local x = side * (w / 2 - 3)
		block(arch, "Foundation", line * F(x, 1.1, 0), V(6, 2.2, 6), iron, Enum.Material.Slate)
		table.insert(
			posts,
			block(
				arch,
				"Pier",
				line * F(x, h / 2, 0),
				V(4.6, h, 4.4),
				wood,
				Enum.Material.WoodPlanks
			)
		)
		table.insert(
			bulbs,
			lantern(
				arch,
				line * F(side * (w / 2 - 6), 0, 2) * A(0, if side < 0 then 0 else math.pi, 0),
				false
			)
		)
	end
	table.insert(
		posts,
		block(
			arch,
			"Lintel",
			line * F(0, h - 1.5, 0),
			V(w, 3.5, 4.6),
			wood,
			Enum.Material.WoodPlanks
		)
	)
	local plaque = block(
		arch,
		"Plaque",
		line * F(0, h + 2.4, 1),
		V(29, 5.6, 1),
		hex("534879"),
		Enum.Material.SmoothPlastic
	)
	block(
		arch,
		"GiltEdge",
		line * F(0, h + 2.4, 0.65),
		V(29.7, 6.15, 1),
		hex("E1BD78"),
		Enum.Material.Metal
	)
	local _, label = lettering(plaque, Enum.NormalId.Back)
	local source =
		part(arch, "WorldLight", V(OPENING_W, OPENING_H, 0.15), frame * F(0, OPENING_H / 2, 2))
	source.Transparency, source.CanCollide, source.CanQuery = 1, false, false
	local light = Instance.new("SurfaceLight")
	light.Face, light.Range, light.Angle, light.Brightness, light.Enabled, light.Parent =
		Enum.NormalId.Back, 42, 112, 1.6, false, source
	local showcase = {}
	for i, offset in { V(-15, 0, 5), V(15, 0, 5), V(-19, 0, 8), V(19, 0, 8) } do
		local base = line * F(offset)
		disc(model, "Plinth", base * F(0, 0.3, 0), 2, 0.6, iron, Enum.Material.Slate)
		local stand = disc(
			model,
			"Pedestal" .. i,
			base * F(0, 1.45, 0),
			1.55,
			2.2,
			stone,
			Enum.Material.Marble
		)
		disc(model, "Rim", base * F(0, 2.59, 0), 1.72, 0.18, hex("CEAA67"), Enum.Material.Metal)
		local a = Instance.new("Attachment")
		a.Name, a.CFrame, a.Parent = "Item", stand.CFrame:ToObjectSpace(base * F(0, 4.6, 0)), stand
		showcase[i] = a
	end
	local shelf =
		part(model, "ChestShelf", V(4 * S, 0.1, 2 * S), line * F(-OPENING_W / 2 - 2 * S, 0.05, -S))
	shelf.Transparency, shelf.CanCollide, shelf.CanQuery = 1, false, false
	local slot = Instance.new("Attachment")
	slot.Name, slot.Parent = "Shelf", shelf
	local duel = block(
		arch,
		"DuelBoard",
		line * F(0, h + 8, 0),
		V(28, 4, 0.6),
		hex("442D53"),
		Enum.Material.SmoothPlastic
	)
	duel.CanCollide, duel.Transparency = false, 1
	local duelGui, score = lettering(duel, Enum.NormalId.Back)
	duelGui.Enabled = false
	local lastLook = ""
	local function setLook(look: string, occupied: boolean)
		for _, bulb in bulbs do
			bulb.Material = if occupied then Enum.Material.Neon else Enum.Material.Glass
			bulb.Color = if occupied then amber else iron
		end
		if look == lastLook then
			return
		end
		lastLook = look
		trim:ClearAllChildren()
		local tier = 0
		for i, rank in Cfg.rebirth.ranks do
			if rank.id == look then
				tier = i
			end
		end
		local tint = hex(camp.rankColors[tier + 1])
		local mat = if tier == 0
			then Enum.Material.WoodPlanks
			elseif tier < 3 then Enum.Material.Slate
			elseif tier == 7 then Enum.Material.Basalt
			else Enum.Material.Metal
		for _, p in posts do
			p.Material, p.Color =
				mat,
				if tier == 6 or tier == 8
					then hex("DBAC52")
					elseif tier == 7 then hex("352E41")
					else tint
		end
		for _, side in { -1, 1 } do
			local x = side * (w / 2 - 3)
			local function detail(
				n: string,
				pos: CFrame,
				size: Vector3,
				c: Color3,
				m: Enum.Material
			)
				return block(trim, n, line * pos, size, c, m)
			end
			detail(
				"Knee",
				F(x - side * 2.6, h - 5.1, 0) * A(0, 0, -side * 0.75),
				V(1.55, 8, 2.4),
				posts[1].Color,
				mat
			)
			if tier > 0 then
				for j = 1, 3 do
					detail(
						"Collar",
						F(x, h * j / 4, 0),
						V(5.05, 0.64, 4.9),
						if tier == 1 then iron elseif tier == 2 then hex("C48753") else hex("F2D69D"),
						mat
					)
				end
			end
			if tier >= 3 then
				for j = 1, 4 do
					detail(
						"Rivet",
						F(x, h * j / 5, 2.3),
						V(0.66, 0.66, 0.4),
						iron,
						Enum.Material.Metal
					).Shape =
						Enum.PartType.Ball
				end
			end
			if tier >= 4 then
				detail(
					"Flute",
					F(x, h / 2, 2.27),
					V(0.48, h - 2, 0.4),
					if tier == 4 then hex("EFF5FF") else hex("FFD37E"),
					Enum.Material.Metal
				)
			end
			if tier == 6 or tier == 8 then
				local jewel = detail(
					"Crest",
					F(x, h + 1.3, 0) * A(0, math.pi / 4, side * 0.22),
					V(1.8, 4.8, 1.8),
					if tier == 6 then hex("72DAFF") else hex("F8A454"),
					Enum.Material.Glass
				)
				if tier == 8 then
					local fire = Instance.new("Fire")
					fire.Size, fire.Heat, fire.Color, fire.SecondaryColor, fire.Parent =
						4, 3, hex("FFAD53"), hex("D94E4E"), jewel
				else
					detail(
						"CrystalCore",
						F(x, h + 1.6, 0) * A(0, 0.7, side * 0.22),
						V(0.77, 4.9, 0.77),
						hex("9FF4FF"),
						Enum.Material.Neon
					)
				end
			elseif tier == 7 then
				for _, edge in { -1, 1 } do
					detail(
						"ObsidianRib",
						F(x + edge * 2, h / 2, 2.3),
						V(0.3, h, 0.3),
						hex("EEC767"),
						Enum.Material.Metal
					)
				end
			end
		end
	end
	setLook("none", false)
	return {
		model = model,
		showcase = showcase,
		chestShelf = slot,
		setLook = setLook,
		setLight = function(color: Color3?, dim: boolean?)
			light.Enabled = color ~= nil
			light.Color, light.Brightness = color or amber, if dim then 0.5 else 1.6
		end,
		setPlaque = function(data: PlaqueData)
			plaque.Transparency = if data.name then 0 else 0.15
			label.Text = if data.name
				then string.format(
					"%s  %s    ⛏ %s    %s",
					if data.hologram then "🏆 " .. tostring(data.place) else "◆",
					data.name,
					Format.short(data.depth or 0),
					if data.hologram then "" else "♥ " .. Format.short(data.likes or 0)
				)
				else ""
			for i, rank in Cfg.rebirth.ranks do
				if rank.id == data.rank then
					label.TextColor3 = hex(camp.rankColors[i + 1])
					return
				end
			end
			label.TextColor3 = hex("FFF5DE")
		end,
		setDuel = function(left: number?, right: number?, a: string?, b: string?)
			duelGui.Enabled = left ~= nil and right ~= nil
			duel.Transparency = if duelGui.Enabled then 0 else 1
			score.Text = if left and right
				then string.format("%s  %d : %d  %s", a or "", left, right, b or "")
				else ""
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
