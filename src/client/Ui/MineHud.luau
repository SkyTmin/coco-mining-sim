--!strict

local GuiService = game:GetService("GuiService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Format = require(Shared.Format)
local Worlds = require(Shared.Mine.Worlds)
local Candy = require(script.Parent.Candy)
local Sfx = require(Shared.Sfx)
local Hud = {}

local yellow = Color3.fromHex("FFC83D")
local center = Vector2.new(0.5, 0.5)
local right = Vector2.new(1, 0)
local bottom = Vector2.new(1, 1)
local offset, scale = UDim2.fromOffset, UDim2.fromScale
-- [владелец 11.11] the reward banner is a fighting-game «knock-out» title: heavy italic letters with a gold → red
-- gradient and a dark outline that slam onto a slanted band, shake once and fade
local KO_FONT = Font.new(Candy.font.Family, Enum.FontWeight.Heavy, Enum.FontStyle.Italic)
local KO_TILT = -4
local KO_SLAM, KO_LIFE, KO_FADE = 0.16, 1.55, 0.3
-- [владелец 11.11] combo tiers: the title's colours climb with the layers counted so far; crossing a threshold
-- flashes and pops the title into the next colour [пороги и цвета — решение]
local function gradient(...: string): ColorSequence
	local colors = { ... }
	local keys = {}
	for i, hex in colors do
		table.insert(keys, ColorSequenceKeypoint.new((i - 1) / (#colors - 1), Color3.fromHex(hex)))
	end
	return ColorSequence.new(keys)
end
local KO_TIERS: { { from: number, colors: ColorSequence, edge: Color3, shimmer: boolean? } } = {
	{ from = 0, colors = gradient("FFFFFF", "DCE6F5", "8FA6C9"), edge = Color3.fromHex("8FA6C9") }, -- silver
	{
		from = 100,
		colors = gradient("F2FFE0", "8CF06A", "1FAE5B"),
		edge = Color3.fromHex("1FAE5B"),
	}, -- green
	{
		from = 500,
		colors = gradient("FFF7C2", "FFC83D", "FF9A1A"),
		edge = Color3.fromHex("FFA51F"),
	}, -- gold
	{
		from = 2000,
		colors = gradient("FFF1A8", "FF7A1A", "D61F2C"),
		edge = Color3.fromHex("E8352B"),
	}, -- fire
	{
		from = 5000,
		colors = gradient("FFE0F4", "FF4FA3", "9B1BD6"),
		edge = Color3.fromHex("C026D3"),
	}, -- magenta
	{
		from = 10000,
		colors = gradient("6BF2FF", "8B5CFF", "FF4FD8", "FFD23F", "6BF2FF"),
		edge = Color3.fromHex("8B5CFF"),
		shimmer = true,
	}, -- cosmic: the colours run through the letters
}
local function tierOf(layers: number): number
	local tier = 1
	for i, t in KO_TIERS do
		if layers >= t.from then
			tier = i
		end
	end
	return tier
end
local KO_TIER_POP = 0.16

-- after the ult lands: the title pops, holds, then fades while the coins fly to the wallet (the same 0.6 s + 0.35 s)
local KO_HOLD, KO_POP = 0.6, 0.18

function Hud.new(
	guiParent: Instance,
	worldParent: Instance,
	translate: (string, ...any) -> string
): any
	local gui = Candy.layer(guiParent, "MineHUD", 4)
	gui.Visible = false
	local coins = Candy.coin(gui, "Wallet", offset(118, 42), offset(15, 20), 21)
	local walletSurface = coins.Parent:FindFirstChild("Surface")
	local wallet = coins.Parent :: Frame
	local function positionWallet()
		local ok, inset = pcall(function()
			return GuiService.TopbarInset.Max.Y
		end)
		local top = if ok then inset else GuiService:GetGuiInset().Y
		wallet.Position = Candy.point(Vector2.new(15, top + 8) - GuiService:GetGuiInset())
	end
	pcall(function()
		GuiService:GetPropertyChangedSignal("TopbarInset"):Connect(positionWallet)
	end)
	gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		task.defer(positionWallet)
	end)
	task.defer(positionWallet)
	-- [владелец 11.11] compact: the world name, then one bar with «to the slab» written inside it
	local worldCard =
		Candy.panel(gui, "WorldCard", UDim2.new(0.30, -4, 0, 41), UDim2.new(0.5, 0, 0, 16))
	worldCard.AnchorPoint = Vector2.new(0.5, 0)
	local world = Candy.text(worldCard, "WorldProgress", UDim2.new(1, -12, 0, 18), offset(6, 3), 15)
	local fill = Candy.bar(worldCard, UDim2.new(1, -16, 0, 14), offset(8, 23), yellow)
	local remaining = Candy.text(
		fill.Parent :: Frame,
		"PlateRemaining",
		UDim2.new(1, -10, 1, -2),
		offset(5, 1),
		11
	)
	remaining.ZIndex = 3

	local focus =
		Candy.button(gui, "FaceWall", offset(144, 45), UDim2.new(0.5, 0, 1, -20), "neutral", 17)
	focus.box.AnchorPoint, focus.box.Visible = Vector2.new(0.5, 1), false
	focus.box.Parent = Candy.layer(guiParent, "MineReturn", 6)
	local fade = Candy.frame(
		Candy.layer(guiParent, "ReturnFade", 30),
		"Fade",
		scale(1, 1),
		scale(0, 0),
		Color3.new()
	)
	fade.BackgroundTransparency = 1
	local eye = Candy.button(
		gui,
		"MineCameraButton",
		offset(43, 43),
		UDim2.new(1, -69, 0, 20),
		"neutral",
		19,
		true
	)
	local gear = Candy.button(
		gui,
		"MineSettingsButton",
		offset(43, 43),
		UDim2.new(1, -15, 0, 20),
		"neutral",
		19,
		true
	)
	eye.box.AnchorPoint, gear.box.AnchorPoint = right, right
	Candy.buttonIcon(eye, "eye", true)
	Candy.buttonIcon(gear, "settings", true)

	local ult = Candy.button(
		gui,
		"MineUltButton",
		offset(74, 74),
		UDim2.new(1, -23, 1, -22),
		"special",
		29,
		true
	)
	ult.box.AnchorPoint = bottom
	Candy.buttonIcon(ult, "ult", true)
	local halo = Candy.frame(ult.face, "ChargeRing", scale(1.13, 1.13), scale(0.5, 0.5))
	halo.AnchorPoint = center
	Candy.round(halo, 0)
	local haloStroke = Candy.stroke(halo, 5)
	haloStroke.Color, haloStroke.Transparency = Candy.white, 0.69
	local ring = {}
	for i = 1, 48 do
		local angle = (i - 1) * math.pi * 2 / 48
		local tick = Candy.frame(
			ult.face,
			"Charge",
			offset(5, 4),
			scale(0.5 + math.sin(angle) * 0.565, 0.5 - math.cos(angle) * 0.565),
			yellow
		)
		tick.AnchorPoint, tick.Rotation, tick.Visible = center, math.deg(angle), false
		Candy.round(tick, 2)
		ring[i] = tick
	end
	local cross = Candy.frame(gui, "Crosshair", offset(5, 5), scale(0.5, 0.5), Candy.white)
	cross.AnchorPoint = center
	Candy.round(cross, 0)
	local arrow = Candy.text(gui, "LastCellsArrow", offset(42, 42), offset(0, 0), 32, yellow)
	arrow.Text, arrow.AnchorPoint, arrow.Visible = translate("mine_arrow"), center, false
	Candy.stroke(arrow, 2, true)

	local bannerBox = Candy.frame(gui, "MineReward", offset(340, 96), scale(0.5, 0.76))
	bannerBox.AnchorPoint, bannerBox.Visible = center, false
	local koScale = Instance.new("UIScale")
	koScale.Parent = bannerBox
	local band = Candy.frame(
		bannerBox,
		"KoBand",
		UDim2.new(1.1, 0, 0, 54),
		UDim2.new(-0.05, 0, 0, 6),
		Color3.fromHex("15142A")
	)
	band.Rotation = KO_TILT
	local bandEdge = Candy.frame(
		band,
		"Edge",
		UDim2.new(1, 0, 0, 5),
		UDim2.new(0, 0, 1, -5),
		Color3.fromHex("E8352B")
	)
	local layers = Candy.text(
		bannerBox,
		"FractureLayers",
		UDim2.new(1, -8, 0, 58),
		offset(4, 4),
		50,
		Candy.white
	)
	layers.FontFace, layers.Rotation, layers.ZIndex = KO_FONT, KO_TILT, 3
	local koGradient = Instance.new("UIGradient")
	koGradient.Rotation = 90
	koGradient.Parent = layers
	local layersStroke = Candy.stroke(layers, 3.5, true)
	layersStroke.Color = Color3.fromHex("1A0B08")
	-- tier effects: a coloured aura behind the letters (stronger each tier) and a shockwave frame on every tier-up
	local aura =
		Candy.text(bannerBox, "KoAura", UDim2.new(1, -8, 0, 58), offset(4, 4), 50, Candy.white)
	aura.FontFace, aura.Rotation, aura.ZIndex = KO_FONT, KO_TILT, 2
	local auraStroke = Candy.stroke(aura, 9, true)
	local koRing =
		Candy.frame(bannerBox, "KoRing", UDim2.new(1.06, 0, 0, 58), UDim2.new(0.5, 0, 0, 33))
	koRing.AnchorPoint, koRing.Rotation, koRing.ZIndex = center, KO_TILT, 1
	local ringScale = Instance.new("UIScale")
	ringScale.Parent = koRing
	local ringStroke = Candy.stroke(koRing, 5)
	ringStroke.Transparency = 1
	local banner =
		Candy.text(bannerBox, "Reward", UDim2.new(1, -16, 0, 26), offset(8, 66), 22, Candy.white)
	banner.FontFace, banner.Rotation, banner.ZIndex = KO_FONT, KO_TILT, 3
	local bannerStroke = Candy.stroke(banner, 2.5, true)
	bannerStroke.Color = Color3.fromHex("1A0B08")
	local worldBanner = Candy.panel(gui, "WorldEntered", offset(284, 59), UDim2.new(0.5, 0, 0, 109))
	worldBanner.AnchorPoint, worldBanner.Visible = Vector2.new(0.5, 0), false
	local newWorld, worldRibbon = Candy.ribbon(
		worldBanner,
		"WorldRibbon",
		UDim2.new(1, -22, 0, 32),
		offset(11, -8),
		Candy.purple
	)
	Candy.stroke(newWorld, 2, true)
	local plateReward =
		Candy.text(worldBanner, "PlateReward", UDim2.new(1, -12, 0, 25), offset(6, 27), 15)
	local snapFlash = Candy.frame(
		Candy.layer(guiParent, "SnapFlash", 29),
		"GoldFlash",
		scale(1, 1),
		scale(0, 0),
		Color3.fromHex("FFD36B")
	)
	snapFlash.BackgroundTransparency = 1
	local ultimateGain =
		Candy.text(gui, "UltimateGain", offset(260, 58), scale(0.5, 0.5), 44, Candy.white)
	ultimateGain.AnchorPoint, ultimateGain.Visible = center, false
	ultimateGain.TextScaled, ultimateGain.TextSize = false, 34
	local ultimateStroke = Candy.stroke(ultimateGain, 3, true)
	local money = {}
	for i = 1, 10 do
		local anchor = Instance.new("Part")
		anchor.Size, anchor.Transparency = Vector3.one * 0.1, 1
		anchor.Anchored, anchor.CanQuery, anchor.CanCollide, anchor.CanTouch =
			true, false, false, false
		anchor.Parent = worldParent
		local badge = Instance.new("BillboardGui")
		badge.Size, badge.AlwaysOnTop, badge.Enabled, badge.Parent =
			offset(145, 42), true, false, anchor
		local icon = Candy.icon(badge, "coin", offset(20, 20), UDim2.new(0, 8, 0.5, -10))
		local text =
			Candy.text(badge, "Value", UDim2.new(1, -37, 1, 0), offset(34, 0), 31, Candy.white)
		text.TextXAlignment = Enum.TextXAlignment.Left
		local stroke = Candy.stroke(text, 2.5, true)
		money[i] = {
			anchor = anchor,
			badge = badge,
			text = text,
			icon = icon,
			stroke = stroke,
			at = -math.huge,
		}
	end
	return {
		gui = gui,
		fade = fade,
		snapFlash = snapFlash,
		ultimateGain = ultimateGain,
		ultimateStroke = ultimateStroke,
		eye = eye.input,
		gear = gear.input,
		focus = focus.box,
		focusInput = focus.input,
		focusText = focus.text,
		ult = ult.input,
		halo = haloStroke,
		ring = ring,
		world = world,
		worldCard = worldCard,
		fill = fill,
		remaining = remaining,
		coins = coins,
		walletSurface = walletSurface,
		cross = cross,
		arrow = arrow,
		bannerBox = bannerBox,
		worldBanner = worldBanner,
		worldRibbon = worldRibbon,
		newWorld = newWorld,
		plateReward = plateReward,
		banner = banner,
		layers = layers,
		koScale = koScale,
		band = band,
		bandEdge = bandEdge,
		koGradient = koGradient,
		aura = aura,
		auraStroke = auraStroke,
		ringScale = ringScale,
		ringStroke = ringStroke,
		layersStroke = layersStroke,
		bannerStroke = bannerStroke,
		money = money,
		translate = translate,
		amount = -1,
		coinAt = 0,
		lastCharge = -1,
		lastCap = -1,
		gainIndex = 0,
	}
end

function Hud.set(h: any, front: number, coins: number, charge: number, cap: number)
	local world = Worlds.of(front)
	local ratio = math.clamp((front - world.start) / world.length, 0, 1)
	h.world.Text = h.translate("mine_world_enter", world.index, h.translate("world_" .. world.id))
	h.fill.Size = UDim2.fromScale(ratio, 1)
	h.fill.BackgroundColor3 = Color3.fromRGB(world.color[1], world.color[2], world.color[3])
	local remaining = math.max(0, world.plateDepth - front)
	local progress = if h.plateRoll then math.clamp(os.clock() - h.plateRoll.at, 0, 1) else 1
	if progress < 1 then
		remaining = math.round(remaining + (h.plateRoll.from - remaining) * (1 - progress) ^ 3)
	else
		h.plateRoll = nil
	end
	h.remaining.Text = h.translate("mine_plate_remaining", Format.grouped(remaining))
	h.remaining.TextColor3 = Color3.fromRGB(155, 88, 22):Lerp(Candy.ink, progress)
	h.coins.Text = h.translate("mine_coins", Format.short(coins))
	if coins ~= h.amount then
		if coins > h.amount and h.amount >= 0 then
			h.coinAt = os.clock()
		end
		h.amount = coins
	end
	if charge ~= h.lastCharge or cap ~= h.lastCap then
		for i, tick in h.ring do
			tick.Visible = i <= math.floor(charge / math.max(1, cap) * #h.ring)
		end
		h.lastCharge, h.lastCap = charge, cap
	end
end

function Hud.rollPlate(h: any, oldFront: number, newFront: number, now: number)
	local world = Worlds.of(newFront)
	h.plateRoll = { at = now, from = world.plateDepth - math.max(world.start, oldFront) }
end

function Hud.snap(h: any, now: number)
	h.snapAt = now
end

function Hud.ultimate(h: any, coins: number, now: number)
	h.ultimate = { total = coins, amount = -1, progress = 0, nextAt = now }
	h.reward = nil -- a new ult replaces the previous title at once (it would count from zero again)
end

function Hud.finishUltimate(h: any, now: number)
	if h.ultimate then
		h.ultimate.progress, h.ultimate.ended = 1, now
	end
	if h.reward and h.reward.ultimate then
		h.reward.ended = now
	end
end

function Hud.enterWorld(h: any, now: number, world: Worlds.World, reward: number)
	h.worldEntered = { at = now, world = world, reward = reward }
	h.worldRibbon.BackgroundColor3 = Color3.fromRGB(world.color[1], world.color[2], world.color[3])
end

function Hud.coin(h: any, position: Vector3, amount: number)
	if amount <= 0 then
		return
	end
	h.gainIndex = h.gainIndex % #h.money + 1
	local item = h.money[h.gainIndex]
	item.anchor.Position, item.at = position, os.clock()
	item.text.Text = h.translate("mine_coin_gain", Format.short(amount))
	local height = math.clamp(21 + 4 * math.log10(amount), 22, 39)
	item.badge.Size = offset(145, height)
	item.badge.Enabled = true
end

local TextService = game:GetService("TextService")
local function fitOnce(label: TextLabel, text: string)
	local limit = label:FindFirstChildOfClass("UITextSizeConstraint")
	local width = label.AbsoluteSize.X
	if not limit or width <= 0 then
		return
	end
	local size = math.round(label.AbsoluteSize.Y)
	local ok, bounds = pcall(function()
		return TextService:GetTextSize(text, size, Enum.Font.GothamBlack, Vector2.new(1e5, 1e5))
	end)
	local fitted = if ok and bounds.X > 0 then size * math.min(1, width * 0.94 / bounds.X) else size
	limit.MaxTextSize = math.max(10, math.floor(fitted))
end

function Hud.show(
	h: any,
	delta: number,
	blocks: number,
	coins: number,
	ultimate: boolean,
	now: number
)
	if ultimate or delta >= 10 then
		-- the letters keep one size while the numbers count: fit the final text once
		local final = if ultimate
			then h.translate("mine_ult_layers", Format.grouped(delta))
			else h.translate("mine_layers_gain", delta)
		fitOnce(h.layers, final)
		if ultimate then
			fitOnce(
				h.banner,
				h.translate("mine_ult_value", Format.grouped(blocks), Format.short(coins))
			)
		end
		h.reward = {
			at = now,
			delta = delta,
			blocks = blocks,
			coins = coins,
			ultimate = ultimate,
		}
	end
end

function Hud.step(
	h: any,
	now: number,
	active: boolean,
	crosshair: boolean,
	hint: Vector3?,
	reduced: boolean
)
	h.gui.Visible = active
	h.snapFlash.BackgroundTransparency = if h.snapAt
		then 0.85 + 0.15 * math.clamp((now - h.snapAt) / 0.2, 0, 1)
		else 1
	-- [владелец 11.11: «два раза дублируются монеты»] the ult's coins are counted only on the knock-out title; when
	-- the ult is over, that sum leaves the title and flies into the wallet
	local gain = h.ultimate
	local flying = gain ~= nil and gain.ended ~= nil and now - gain.ended >= KO_HOLD
	h.ultimateGain.Visible = active and flying
	if gain and flying then
		h.ultimateGain.Text = h.translate("mine_coin_gain", Format.short(gain.total))
		local fly = math.clamp((now - gain.ended - KO_HOLD) / KO_FADE, 0, 1)
		h.ultimateGain.TextSize = 34 - 12 * fly
		local start = h.banner.AbsolutePosition + h.banner.AbsoluteSize / 2
		local target = h.coins.Parent.AbsolutePosition + h.coins.Parent.AbsoluteSize / 2
		h.ultimateGain.Position = Candy.point(start:Lerp(target, fly * fly))
		local fade = math.max(0, fly - 0.6) / 0.4
		h.ultimateGain.TextTransparency, h.ultimateStroke.Transparency = fade, fade
		if fly == 1 then
			h.ultimate, h.coinAt, h.ultimateGain.Visible = nil, now, false
		end
	end
	h.cross.Visible = crosshair
	h.walletSurface.BackgroundColor3 = Candy.panelColor:Lerp(
		yellow,
		if reduced then 0 else 0.32 * math.max(0, 1 - (now - h.coinAt) / 0.24)
	)
	local ready = h.lastCharge >= h.lastCap and h.lastCap > 0
	h.halo.Transparency = if ready
		then (if reduced then 0.18 else 0.18 + 0.14 * math.sin(now * 6))
		else 0.69
	h.arrow.Visible = false
	local camera = workspace.CurrentCamera
	if active and camera and hint then
		local projected, visible = camera:WorldToViewportPoint(hint)
		if not visible then
			local center = camera.ViewportSize / 2
			local direction = Vector2.new(projected.X, projected.Y) - center
			if projected.Z < 0 then
				direction = -direction
			end
			if direction.Magnitude > 0 then
				local p = center + direction.Unit * math.min(center.X, center.Y) * 0.78
				h.arrow.Position, h.arrow.Rotation, h.arrow.Visible =
					Candy.point(p), math.deg(math.atan2(direction.Y, direction.X)), true
			end
		end
	end
	local entered = h.worldEntered
	h.worldBanner.Visible = entered ~= nil and now - entered.at < 3
	if h.worldBanner.Visible then
		h.newWorld.Text = h.translate(
			"mine_world_enter",
			entered.world.index,
			h.translate("world_" .. entered.world.id)
		)
		h.plateReward.Text = h.translate("mine_plate_reward", Format.short(entered.reward))
	end
	local reward = h.reward
	h.bannerBox.Visible = reward ~= nil
		and (
			if reward.ultimate
				then reward.ended == nil or now - reward.ended < KO_HOLD + KO_FADE
				else now - reward.at < KO_LIFE
		)
	if reward and not h.bannerBox.Visible then
		h.reward = nil
	end
	if reward and h.bannerBox.Visible then
		local age = now - reward.at
		local progress = if reward.ultimate
			then h.fractureProgress or 1
			else math.clamp(age / 0.63, 0, 1)
		if reward.ultimate then
			h.layers.Text =
				h.translate("mine_ult_layers", Format.grouped(math.floor(reward.delta * progress)))
			h.banner.Text = h.translate(
				"mine_ult_value",
				Format.grouped(math.floor(reward.blocks * progress)),
				Format.short(math.floor(reward.coins * progress))
			)
		else
			h.layers.Text = h.translate("mine_layers_gain", math.floor(reward.delta * progress))
		end
		h.banner.Visible = reward.ultimate
		local tier = tierOf(math.floor(reward.delta * progress))
		if tier ~= reward.tier then
			local t = KO_TIERS[tier]
			h.koGradient.Color, h.bandEdge.BackgroundColor3 = t.colors, t.edge
			h.koGradient.Rotation = if t.shimmer then 0 else 90
			reward.tierAt = if reward.tier then now else nil
			reward.tier = tier
			h.aura.TextColor3, h.auraStroke.Color, h.ringStroke.Color = t.edge, t.edge, t.edge
			if reward.tierAt then
				Sfx.play("level_tick", 0.6, 0.85 + 0.12 * tier)
				if tier >= 4 then
					Sfx.play("crit_soft", 0.4 + 0.05 * tier, 0.9 + 0.05 * tier)
				end
			end
		end
		-- the aura: none at the first tier, then brighter each tier, breathing from the fourth on
		h.aura.Text = h.layers.Text
		local auraLimit = h.aura:FindFirstChildOfClass("UITextSizeConstraint")
		local layersLimit = h.layers:FindFirstChildOfClass("UITextSizeConstraint")
		if auraLimit and layersLimit then
			auraLimit.MaxTextSize = layersLimit.MaxTextSize
		end
		local glow = if tier <= 1 then 1 else 0.82 - 0.1 * (tier - 2)
		if tier >= 4 and not reduced then
			glow += 0.12 * math.sin(now * (4 + tier))
		end
		if KO_TIERS[tier].shimmer then
			h.koGradient.Offset = Vector2.new(if reduced then 0 else math.sin(now * 2.4) * 0.35, 0)
		else
			h.koGradient.Offset = Vector2.zero
		end
		local tierPop = if reward.tierAt
			then math.clamp((now - reward.tierAt) / KO_TIER_POP, 0, 1)
			else 1
		-- the shockwave: the slanted frame grows out of the band and fades, wider for higher tiers
		local wave = if reward.tierAt then math.clamp((now - reward.tierAt) / 0.4, 0, 1) else 1
		h.ringScale.Scale = 1 + (0.25 + 0.08 * tier) * (1 - (1 - wave) ^ 2)
		h.ringStroke.Transparency = if reduced then 1 else wave
		-- slam: from 2.3x down to 1 with a small overshoot (ease-out-back), then one short shake
		local slam = math.clamp(age / KO_SLAM, 0, 1)
		local back = 1 + 2.70158 * (slam - 1) ^ 3 + 1.70158 * (slam - 1) ^ 2
		local pop = if reward.ended then math.clamp((now - reward.ended) / KO_POP, 0, 1) else 1
		h.koScale.Scale = if reduced
			then 1
			else (2.3 + (1 - 2.3) * back)
				* (1 + 0.18 * (1 - pop))
				* (1 + (0.08 + 0.03 * tier) * (1 - tierPop))
		-- shake: once on the slam, again on each tier-up (harder each tier), and a constant tremor from the fifth
		local strength = 0
		if age >= KO_SLAM and age <= KO_SLAM + 0.18 then
			strength = 6 * (1 - (age - KO_SLAM) / 0.18)
		end
		if reward.tierAt and now - reward.tierAt < 0.22 then
			strength = math.max(strength, (2 + 2 * tier) * (1 - (now - reward.tierAt) / 0.22))
		end
		if tier >= 5 and not reward.ended then
			strength = math.max(strength, 1.2 + 0.6 * (tier - 5))
		end
		local shake = if reduced
			then Vector2.zero
			else Vector2.new(math.random() - 0.5, math.random() - 0.5) * strength
		h.bannerBox.Position = UDim2.new(0.5, shake.X, if gain then 0.32 else 0.76, shake.Y)
		h.band.Position = UDim2.new(-0.05 - 1.2 * (1 - math.clamp(age / 0.12, 0, 1)) ^ 2, 0, 0, 6)
		-- a white flash on impact and again on the final pop
		h.koGradient.Enabled = reduced or (age > 0.07 and pop > 0.4 and tierPop > 0.35)
		local fade = if reward.ultimate
			then (if reward.ended
				then math.clamp((now - reward.ended - KO_HOLD) / KO_FADE, 0, 1)
				else 0)
			else math.clamp((age - (KO_LIFE - KO_FADE)) / KO_FADE, 0, 1)
		h.layers.TextTransparency, h.layersStroke.Transparency = fade, fade
		local auraFade = math.clamp(glow, 0, 1) + (1 - math.clamp(glow, 0, 1)) * fade
		h.aura.TextTransparency, h.auraStroke.Transparency = auraFade, auraFade
		h.banner.TextTransparency, h.bannerStroke.Transparency = fade, fade
		h.band.BackgroundTransparency = 0.2 + 0.8 * fade
		h.bandEdge.BackgroundTransparency = fade
	end
	for _, item in h.money do
		local t = now - item.at
		item.badge.Enabled = active and t < 0.7
		if item.badge.Enabled then
			item.badge.StudsOffsetWorldSpace = Vector3.new(0, 0.8 + 2.6 * t / 0.7, 0)
			item.text.TextTransparency, item.icon.ImageTransparency, item.stroke.Transparency =
				t / 0.7, t / 0.7, t / 0.7
		end
	end
end

return Hud
