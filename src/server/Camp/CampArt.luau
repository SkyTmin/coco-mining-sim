--!strict
-- The look of the camp: everything a player sees in the world around the eight entrances. OWNED BY CLAUDE (art).
-- Codex calls these functions from the camp logic and never edits this file [ТЗ-06 §16]; until Claude's version lands it
-- builds plain grey placeholders with the right sizes and attachment points, so the logic can be written and tested.
--
-- Coordinates: `frame` is a plot frame exactly as PlotService makes it — at the mining wall, LookVector pointing out of
-- the camp, +Z (object space) towards the camp centre. The entrance line (arch) is at Z = platform + spectator depth.

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

-- The crater around the floor (rock rim, paths, lanterns, tents, crates). The floor disc itself stays in PlotService.
function CampArt.crater(root: Folder)
	local radius = Cfg.plots.entranceRadius
	for i = 1, Cfg.plots.count do
		local angle = (i - 0.5) * math.pi * 2 / Cfg.plots.count
		local outward = Vector3.new(math.sin(angle), 0, -math.cos(angle))
		local at = outward * (radius + 40)
		part(
			root,
			"RimPlaceholder",
			Vector3.new(30, 60, 30),
			CFrame.lookAt(at + Vector3.new(0, 30, 0), Vector3.new(0, 30, 0))
		)
	end
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
