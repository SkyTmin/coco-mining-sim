--!strict
-- The Plate's own look [владелец 13.11: «плиты выглядят ужасно и непонятно, текст на плите ужасный, ульта не наносит
-- урон»]. Before: a flat plastic slab, three neon sticks and a navy label «ОЗ 600 · Сила 6.6/30». Now, in the Candy style:
--   · on the stone: a big padlock (the gate to the next world) and block-sized cracks that grow with the damage, so every
--     hit and the ult visibly break it;
--   · over it: a cream card — «Плита мира 2», «Ударов: ~94», a thick health bar «540 / 600» coloured by your strength
--     (red / yellow / green, as in 01 §3) and «Твоя сила 6,4 · нужно 30»;
--   · every hit pops its damage off the stone («−6,4»; the ult's big yellow number), so the ult's share is seen.
-- Numbers are not changed here: the damage comes from the server (window.plateDamage).
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Strings = require(Shared.Strings)
local Candy = require(script.Parent.Parent.Ui.Candy)
local PlateLook = {}

local INK = Color3.fromHex("1E2140")
local PAPER = Color3.fromHex("FFF8EC")
local ROW = Color3.fromHex("F2E6D2")
local TRACK = Color3.fromHex("E4D6BD")
local RED, AMBER, GREEN =
	Color3.fromHex("E5484D"), Color3.fromHex("F5A524"), Color3.fromHex("22C55E")
local RED_TEXT, AMBER_TEXT, GREEN_TEXT = "#B3202E", "#B45309", "#15803D"
local FONT = Font.fromEnum(Enum.Font.GothamBlack)
local CRACKS = Config.art.cracks[1]
local S = Config.mine.blockSize
local CARD_W, CARD_H = 270, 86
local POPS = 8

export type Look = {
	gui: BillboardGui,
	title: TextLabel,
	hits: TextLabel,
	fill: Frame,
	hp: TextLabel,
	power: TextLabel,
	face: SurfaceGui,
	lock: ImageLabel,
	cracks: Texture,
	pops: { BillboardGui },
	nextPop: number,
	depth: number,
	damage: number,
	body: Part,
}

local function corner(gui: GuiObject, radius: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = if radius == 0 then UDim.new(0.5, 0) else UDim.new(0, radius)
	c.Parent = gui
end

local function stroke(gui: GuiObject, thickness: number, contextual: boolean?)
	local s = Instance.new("UIStroke")
	s.Color, s.Thickness = INK, thickness
	s.ApplyStrokeMode = if contextual
		then Enum.ApplyStrokeMode.Contextual
		else Enum.ApplyStrokeMode.Border
	s.Parent = gui
	return s
end

local function text(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	maxSize: number,
	color: Color3?
): TextLabel
	local l = Instance.new("TextLabel")
	l.Name, l.BackgroundTransparency, l.FontFace, l.TextColor3 = name, 1, FONT, color or INK
	l.Size, l.Position, l.TextScaled = size, at, true
	local limit = Instance.new("UITextSizeConstraint")
	limit.MaxTextSize, limit.MinTextSize, limit.Parent = maxSize, 9, l
	l.Parent = parent
	return l
end

function PlateLook.new(model: Instance, body: Part): Look
	-- the card over the plate
	local gui = Instance.new("BillboardGui")
	gui.Name, gui.Size, gui.StudsOffsetWorldSpace =
		"Guardian", UDim2.fromOffset(CARD_W, CARD_H), Vector3.new(0, S * 1.9, 0)
	gui.Enabled, gui.AlwaysOnTop, gui.Adornee, gui.Parent = false, true, body, model
	local card = Instance.new("Frame")
	card.Name, card.BackgroundColor3, card.BorderSizePixel = "Card", PAPER, 0
	card.Size, card.Position = UDim2.new(1, -6, 1, -8), UDim2.fromOffset(3, 2)
	corner(card, 14)
	stroke(card, 3)
	card.Parent = gui
	-- built by hand, not with Candy.icon: Candy scales offsets for the screen canvas, a billboard is in plain pixels
	local lock = Instance.new("ImageLabel")
	lock.Name, lock.BackgroundTransparency, lock.ScaleType = "Lock", 1, Enum.ScaleType.Fit
	lock.Size, lock.Position, lock.Parent = UDim2.fromOffset(24, 24), UDim2.fromOffset(9, 6), card
	Candy.setIcon(lock, "lock")
	local title = text(card, "Title", UDim2.new(1, -150, 0, 22), UDim2.fromOffset(38, 7), 17)
	title.TextXAlignment = Enum.TextXAlignment.Left
	local chip = Instance.new("Frame")
	chip.Name, chip.BackgroundColor3, chip.BorderSizePixel = "Hits", ROW, 0
	chip.AnchorPoint, chip.Size, chip.Position =
		Vector2.new(1, 0), UDim2.fromOffset(104, 22), UDim2.new(1, -8, 0, 7)
	corner(chip, 0)
	chip.Parent = card
	local hits = text(chip, "Label", UDim2.new(1, -12, 1, -4), UDim2.fromOffset(6, 2), 13)
	local track = Instance.new("Frame")
	track.Name, track.BackgroundColor3, track.BorderSizePixel = "Track", TRACK, 0
	track.Size, track.Position = UDim2.new(1, -18, 0, 20), UDim2.fromOffset(9, 35)
	corner(track, 0)
	stroke(track, 2.5)
	track.ClipsDescendants = false
	track.Parent = card
	local fill = Instance.new("Frame")
	fill.Name, fill.BorderSizePixel, fill.Size = "Fill", 0, UDim2.fromScale(1, 1)
	corner(fill, 0)
	fill.Parent = track
	local hp =
		text(track, "Hp", UDim2.new(1, -8, 1, -2), UDim2.fromOffset(4, 1), 14, Color3.new(1, 1, 1))
	hp.ZIndex = 2
	stroke(hp, 2, true)
	local power = text(card, "Power", UDim2.new(1, -18, 0, 17), UDim2.fromOffset(9, 59), 13)
	power.RichText = true

	-- on the stone: the padlock and the cracks
	local face = Instance.new("SurfaceGui")
	face.Name, face.Face, face.Adornee = "PlateFace", Enum.NormalId.Back, body
	face.SizingMode, face.PixelsPerStud, face.LightInfluence =
		Enum.SurfaceGuiSizingMode.PixelsPerStud, 24, 0.6
	face.Parent = model
	local big = Instance.new("ImageLabel")
	big.Name, big.BackgroundTransparency, big.ScaleType = "Padlock", 1, Enum.ScaleType.Fit
	big.Size, big.Position, big.AnchorPoint =
		UDim2.fromScale(0.5, 0.42), UDim2.fromScale(0.5, 0.5), Vector2.new(0.5, 0.5)
	big.Parent = face
	Candy.setIcon(big, "lock")
	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.Parent = big
	local cracks = Instance.new("Texture")
	cracks.Name, cracks.Face, cracks.StudsPerTileU, cracks.StudsPerTileV =
		"Cracks", Enum.NormalId.Back, S, S
	cracks.Transparency, cracks.Color3 = 1, Color3.new(0, 0, 0)
	cracks.Parent = body

	-- damage numbers
	local pops = {}
	for i = 1, POPS do
		local pop = Instance.new("BillboardGui")
		pop.Name, pop.Size, pop.AlwaysOnTop, pop.Enabled =
			"PlatePop", UDim2.fromOffset(160, 44), true, false
		pop.Adornee, pop.Parent = body, model
		local l = text(
			pop,
			"Label",
			UDim2.fromScale(1, 1),
			UDim2.fromScale(0, 0),
			30,
			Color3.new(1, 1, 1)
		)
		stroke(l, 2.5, true)
		pops[i] = pop
	end
	return {
		gui = gui,
		title = title,
		hits = hits,
		fill = fill,
		hp = hp,
		power = power,
		face = face,
		lock = big,
		cracks = cracks,
		pops = pops,
		nextPop = 1,
		depth = -1,
		damage = 0,
		body = body,
	}
end

local function pop(look: Look, amount: number, big: boolean, reduced: boolean)
	local gui = look.pops[look.nextPop]
	look.nextPop = look.nextPop % POPS + 1
	local label = gui:FindFirstChild("Label") :: TextLabel
	label.Text = "−" .. Format.stat(amount, Strings.localeOf(Players.LocalPlayer))
	label.TextColor3 = if big then Color3.fromHex("FFC83D") else Color3.new(1, 1, 1)
	local limit = label:FindFirstChildOfClass("UITextSizeConstraint")
	if limit then
		limit.MaxTextSize = if big then 44 else 28
	end
	local size = look.body.Size
	local start = Vector3.new(
		(math.random() - 0.5) * math.min(size.X * 0.5, S * 3),
		(math.random() - 0.3) * size.Y * 0.3,
		0
	)
	gui.StudsOffsetWorldSpace, label.TextTransparency = start, 0
	gui.Enabled = true
	local seconds = if big then 1.1 else 0.7
	if not reduced then
		TweenService
			:Create(gui, TweenInfo.new(seconds, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				StudsOffsetWorldSpace = start + Vector3.new(0, S * (if big then 1.4 else 0.9), 0),
			})
			:Play()
	end
	TweenService:Create(
		label,
		TweenInfo.new(
			seconds * 0.5,
			Enum.EasingStyle.Quad,
			Enum.EasingDirection.In,
			0,
			false,
			seconds * 0.5
		),
		{
			TextTransparency = 1,
		}
	):Play()
	task.delay(seconds, function()
		if label.TextTransparency >= 0.99 then
			gui.Enabled = false
		end
	end)
end

-- `near` = the plate is the wall in front of the player (the card shows); the stone and its cracks show always
function PlateLook.update(
	look: Look,
	world: any,
	depth: number,
	damage: number,
	strength: number,
	near: boolean,
	translate: (string, ...any) -> string,
	reduced: boolean?
)
	local hpMax = world.plate.hp
	local ratio = math.clamp(damage / hpMax, 0, 1)
	local stage = math.clamp(math.ceil(ratio * #CRACKS), 0, #CRACKS)
	look.cracks.Transparency = if stage > 0 then 0.1 else 1
	if stage > 0 then
		look.cracks.Texture = CRACKS[stage]
	end
	-- the padlock darkens as the plate gives way
	look.lock.ImageColor3 = Color3.new(1, 1, 1):Lerp(Color3.fromHex("FF9A9A"), ratio)

	-- damage numbers: any rise of the server's damage on the same plate
	if depth == look.depth and damage > look.damage + 1e-9 then
		local amount = damage - look.damage
		pop(
			look,
			amount,
			amount > math.max(strength, hpMax / Config.mine.plate.cap) * 2.5,
			reduced == true
		)
	end
	look.depth, look.damage = depth, damage

	look.gui.Enabled = near
	if not near then
		return
	end
	local locale = Strings.localeOf(Players.LocalPlayer)
	local left = math.max(0, hpMax - damage)
	local perHit = math.max(strength, hpMax / Config.mine.plate.cap)
	local power = strength / world.plate.recommendedStrength
	local color = if power >= 1 then GREEN elseif power >= 0.5 then AMBER else RED
	local tone = if power >= 1 then GREEN_TEXT elseif power >= 0.5 then AMBER_TEXT else RED_TEXT
	look.title.Text = translate("plate_title", world.index)
	look.hits.Text = translate("plate_hits", Format.short(math.ceil(left / perHit)))
	look.fill.Size = UDim2.fromScale(left / hpMax, 1)
	look.fill.BackgroundColor3 = color
	look.hp.Text = Format.short(math.ceil(left)) .. " / " .. Format.short(hpMax)
	look.power.Text = translate(
		"plate_power",
		string.format('<font color="%s">%s</font>', tone, Format.stat(strength, locale)),
		Format.stat(world.plate.recommendedStrength, locale)
	)
end

return PlateLook
