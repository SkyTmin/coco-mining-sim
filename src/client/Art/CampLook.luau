--!strict
-- Client-side look of the camp and of other people. OWNED BY CLAUDE (art); Codex calls it and never edits it
-- [ТЗ-06 §16]. Until Claude's version lands these are plain placeholders with the final signatures.

local Lighting = game:GetService("Lighting")
local Debris = game:GetService("Debris")

local CampLook = {}

export type NameplateData = { name: string, rank: string?, depth: number }
export type MomentKind = "plate" | "ult" | "legendary" | "pickChest" | "core"
export type MomentData = {
	position: Vector3?, -- the entrance of the player it happened to
	color: Color3?, -- world / rarity colour
	userId: number?,
	pickId: string?,
	rarity: string?,
}

-- 0 = in the tunnel (world light from TunnelDecor), 1 = in the camp (evening). Codex computes it from the position
-- (smooth over the platform line, ТЗ-06 §4.2) and calls this every frame it changes.
function CampLook.blend(alpha: number)
	if alpha >= 0.5 then
		Lighting.ClockTime = 18.4
	end
end

-- The line over a player's head (rank badge, name, depth). Returns the updater; destroy with the character.
function CampLook.nameplate(character: Model): (NameplateData) -> ()
	local head = character:FindFirstChild("Head") :: BasePart?
	local gui = Instance.new("BillboardGui")
	gui.Name, gui.Size, gui.StudsOffset, gui.AlwaysOnTop =
		"CampNameplate", UDim2.fromOffset(220, 36), Vector3.new(0, 3, 0), false
	gui.MaxDistance, gui.Adornee, gui.Parent = 120, head, character
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled, label.Parent =
		UDim2.fromScale(1, 1), 1, true, gui
	return function(data: NameplateData)
		label.Text = string.format("%s %s ⛏ %d", data.rank or "", data.name, data.depth)
	end
end

-- A player's token on the depth scale (avatar circle with a rank-coloured ring). Codex moves the returned part.
function CampLook.scaleToken(
	parent: Instance,
	userId: number,
	rankColor: Color3,
	isSelf: boolean
): BasePart
	local p = Instance.new("Part")
	p.Name, p.Size, p.Anchored, p.CanCollide =
		"Token_" .. userId, Vector3.new(1.5, 1.5, 0.2), true, false
	p.Color = if isSelf then Color3.fromRGB(255, 200, 61) else rankColor
	p.Parent = parent
	return p
end

-- One of the six reactions over a character's head for 3 s [ТЗ-06 §9]. id: like|fire|bolt|wow|party|gem.
local EMOJI =
	{ like = "👍", fire = "🔥", bolt = "⚡", wow = "😮", party = "🎉", gem = "💎" }
function CampLook.reaction(character: Model, id: string)
	local head = character:FindFirstChild("Head") :: BasePart?
	if not head then
		return
	end
	local gui = Instance.new("BillboardGui")
	gui.Size, gui.StudsOffset, gui.Adornee = UDim2.fromOffset(60, 60), Vector3.new(0, 5, 0), head
	local label = Instance.new("TextLabel")
	label.Size, label.BackgroundTransparency, label.TextScaled = UDim2.fromScale(1, 1), 1, true
	label.Text, label.Parent = EMOJI[id] or "👍", gui
	gui.Parent = character
	Debris:AddItem(gui, 3)
end

-- A moment everyone sees [ТЗ-06 §12.2]. Codex decides who sees it (hideOthersFx), this only draws and plays it.
function CampLook.moment(kind: MomentKind, data: MomentData)
	if not data.position then
		return
	end
	local beam = Instance.new("Part")
	beam.Anchored, beam.CanCollide, beam.CanQuery, beam.Material =
		true, false, false, Enum.Material.Neon
	beam.Size, beam.Color = Vector3.new(2, 200, 2), data.color or Color3.new(1, 1, 1)
	beam.CFrame = CFrame.new(data.position + Vector3.new(0, 100, 0))
	beam.Name = "Moment_" .. kind
	beam.Parent = workspace
	Debris:AddItem(beam, 3)
end

return CampLook
