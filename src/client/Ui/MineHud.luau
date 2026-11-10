--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Format = require(Shared.Format)
local Worlds = require(Shared.Mine.Worlds)
local Hud = {}

local ink = Color3.fromRGB(36, 57, 83)
local cream = Color3.fromRGB(255, 243, 220)
local blue = Color3.fromRGB(116, 208, 255)
local yellow = Color3.fromRGB(255, 211, 112)

local function round(gui: GuiObject, radius: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = gui
end

local function label(parent: Instance, size: UDim2, color: Color3, textSize: number): TextLabel
	local t = Instance.new("TextLabel")
	t.Size, t.TextColor3, t.TextSize, t.Text, t.Font =
		size, color, textSize, "", Enum.Font.GothamBold
	t.BackgroundTransparency, t.Parent = 1, parent
	return t
end

local function card(parent: Instance, size: UDim2, position: UDim2, anchor: Vector2): Frame
	local f = Instance.new("Frame")
	f.Size, f.Position, f.AnchorPoint, f.BackgroundColor3 = size, position, anchor, cream
	f.BorderSizePixel, f.Parent = 0, parent
	round(f, 13)
	local outline = Instance.new("UIStroke")
	outline.Color, outline.Thickness, outline.Transparency, outline.Parent =
		Color3.fromRGB(181, 205, 220), 2, 0.16, f
	return f
end

local function button(parent: Instance, size: number, at: UDim2, anchor: Vector2): TextButton
	local b = Instance.new("TextButton")
	b.Size, b.Position, b.AnchorPoint = UDim2.fromOffset(size, size), at, anchor
	b.Text, b.BackgroundColor3, b.BorderSizePixel, b.Parent = "", cream, 0, parent
	round(b, size)
	return b
end

local function coinIcon(parent: Instance, x: number, size: number): Frame
	local icon = Instance.new("Frame")
	icon.AnchorPoint, icon.Position, icon.Size =
		Vector2.new(0, 0.5), UDim2.new(0, x, 0.5, 0), UDim2.fromOffset(size, size)
	icon.BackgroundColor3, icon.BorderSizePixel, icon.Parent =
		Color3.fromRGB(255, 197, 67), 0, parent
	round(icon, size)
	local ring = Instance.new("UIStroke")
	ring.Color, ring.Thickness, ring.Parent = Color3.fromRGB(199, 129, 38), 2, icon
	local mark = Instance.new("Frame")
	mark.AnchorPoint, mark.Position, mark.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.fromScale(0.24, 0.54)
	mark.BackgroundColor3, mark.BorderSizePixel, mark.Parent = cream, 0, icon
	round(mark, 3)
	return icon
end

function Hud.new(
	guiParent: Instance,
	worldParent: Instance,
	translate: (string, ...any) -> string
): any
	local gui = Instance.new("ScreenGui")
	gui.Name, gui.DisplayOrder, gui.ResetOnSpawn, gui.Enabled = "MineHUD", 4, false, false
	gui.IgnoreGuiInset, gui.ScreenInsets = true, Enum.ScreenInsets.DeviceSafeInsets
	gui.Parent = guiParent
	local wallet = card(gui, UDim2.fromOffset(122, 44), UDim2.fromOffset(14, 54), Vector2.zero)
	coinIcon(wallet, 13, 21)
	local coins = label(wallet, UDim2.new(1, -37, 1, 0), ink, 23)
	coins.Position = UDim2.fromOffset(36, 0)
	local coinScale = Instance.new("UIScale")
	coinScale.Parent = wallet
	local worldCard =
		card(gui, UDim2.new(0.30, 0, 0, 58), UDim2.new(0.5, 0, 0, 10), Vector2.new(0.5, 0))
	local world = label(worldCard, UDim2.new(1, -12, 0, 27), ink, 16)
	world.Name, world.Position, world.TextScaled = "WorldProgress", UDim2.fromOffset(6, 2), true
	local worldLimit = Instance.new("UITextSizeConstraint")
	worldLimit.MinTextSize, worldLimit.MaxTextSize, worldLimit.Parent = 9, 16, world
	local rail = Instance.new("Frame")
	rail.BackgroundColor3, rail.Position, rail.Size =
		Color3.fromRGB(213, 221, 230), UDim2.fromOffset(11, 31), UDim2.new(1, -22, 0, 5)
	rail.BorderSizePixel, rail.Parent = 0, worldCard
	round(rail, 5)
	local fill = Instance.new("Frame")
	fill.BackgroundColor3, fill.BorderSizePixel, fill.Parent = blue, 0, rail
	round(fill, 5)
	local endMark = Instance.new("Frame")
	endMark.AnchorPoint, endMark.Position, endMark.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(1, 0.5), UDim2.fromOffset(4, 9)
	endMark.BackgroundColor3, endMark.BorderSizePixel, endMark.Parent = ink, 0, rail
	round(endMark, 2)
	local remaining = label(worldCard, UDim2.new(1, 0, 0, 19), ink, 12)
	remaining.Name, remaining.Position = "PlateRemaining", UDim2.fromOffset(0, 38)
	local hits = Instance.new("Frame")
	hits.Name, hits.Size, hits.AnchorPoint, hits.BackgroundTransparency =
		"HitsRemaining", UDim2.fromOffset(76, 8), Vector2.new(0.5, 0.5), 1
	hits.Parent = gui
	local dots = {}
	for i = 1, 8 do
		local dot = Instance.new("Frame")
		dot.Size, dot.Position, dot.BackgroundColor3, dot.BorderSizePixel =
			UDim2.fromOffset(6, 6), UDim2.fromOffset((i - 1) * 10, 1), yellow, 0
		dot.Parent = hits
		round(dot, 6)
		dots[i] = dot
	end
	local focus = button(gui, 46, UDim2.new(0.5, 0, 1, -15), Vector2.new(0.5, 1))
	focus.Name, focus.Size, focus.Visible = "FaceWall", UDim2.fromOffset(134, 46), false
	focus.Font, focus.TextSize, focus.TextColor3 = Enum.Font.GothamBold, 15, ink
	local eye = button(gui, 51, UDim2.new(1, -15, 0, 48), Vector2.new(1, 0))
	eye.Name = "MineCameraButton"
	local gear = button(gui, 39, UDim2.new(1, -20, 0, 107), Vector2.new(1, 0))
	gear.Name, gear.Text, gear.TextSize, gear.TextColor3, gear.Font =
		"MineSettingsButton", translate("mine_settings_icon"), 25, ink, Enum.Font.GothamBold
	local iris = Instance.new("Frame")
	iris.AnchorPoint, iris.Position, iris.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(29, 16)
	iris.BackgroundColor3, iris.BorderSizePixel, iris.Parent = ink, 0, eye
	round(iris, 16)
	local pupil = Instance.new("Frame")
	pupil.AnchorPoint, pupil.Position, pupil.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(10, 10)
	pupil.BackgroundColor3, pupil.BorderSizePixel, pupil.Parent = cream, 0, iris
	round(pupil, 10)
	local ult = button(gui, 86, UDim2.new(1, -23, 1, -22), Vector2.one)
	ult.Name = "MineUltButton"
	ult.Text, ult.TextSize, ult.TextColor3, ult.Font =
		translate("mine_ult_icon"), 35, ink, Enum.Font.GothamBold
	local ring = {}
	for i = 1, 36 do
		local angle = (i - 1) * math.pi * 2 / 36
		local p = Instance.new("Frame")
		p.AnchorPoint, p.Position, p.Size =
			Vector2.new(0.5, 0.5),
			UDim2.fromScale(0.5 + math.sin(angle) * 0.43, 0.5 - math.cos(angle) * 0.43),
			UDim2.fromOffset(5, 6)
		p.Rotation, p.BackgroundColor3, p.BorderSizePixel, p.Parent =
			math.deg(angle), Color3.fromRGB(198, 210, 218), 0, ult
		round(p, 3)
		ring[i] = p
	end
	local cross = Instance.new("Frame")
	cross.AnchorPoint, cross.Position, cross.Size =
		Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(5, 5)
	cross.BackgroundColor3, cross.BorderSizePixel, cross.Parent = Color3.new(1, 1, 1), 0, gui
	round(cross, 4)
	local arrow = label(gui, UDim2.fromOffset(42, 42), yellow, 32)
	arrow.Text, arrow.AnchorPoint, arrow.Visible =
		translate("mine_arrow"), Vector2.new(0.5, 0.5), false
	local bannerBox =
		card(gui, UDim2.fromOffset(254, 56), UDim2.fromScale(0.5, 0.76), Vector2.new(0.5, 0.5))
	bannerBox.Visible = false
	local banner = label(bannerBox, UDim2.new(1, -12, 0, 27), ink, 20)
	banner.Name, banner.Position = "Reward", UDim2.fromOffset(6, 24)
	banner.TextScaled = true
	local bannerSize = Instance.new("UITextSizeConstraint")
	bannerSize.MinTextSize, bannerSize.MaxTextSize, bannerSize.Parent = 12, 20, banner
	local layers = label(bannerBox, UDim2.new(1, 0, 0, 25), ink, 17)
	layers.Name = "FractureLayers"
	local worldBanner =
		card(gui, UDim2.fromOffset(274, 52), UDim2.new(0.5, 0, 0, 92), Vector2.new(0.5, 0))
	worldBanner.Name, worldBanner.Visible = "WorldEntered", false
	local newWorld = label(worldBanner, UDim2.new(1, -12, 0, 28), ink, 17)
	newWorld.Position, newWorld.TextScaled = UDim2.fromOffset(6, 2), true
	local nameLimit = Instance.new("UITextSizeConstraint")
	nameLimit.MinTextSize, nameLimit.MaxTextSize, nameLimit.Parent = 10, 17, newWorld
	local plateReward = label(worldBanner, UDim2.fromScale(1, 0.39), ink, 14)
	plateReward.Position = UDim2.fromOffset(0, 29)
	local money = {}
	for i = 1, 10 do
		local anchor = Instance.new("Part")
		anchor.Size, anchor.Transparency = Vector3.one * 0.1, 1
		anchor.Anchored, anchor.CanQuery, anchor.CanCollide, anchor.CanTouch =
			true, false, false, false
		anchor.Parent = worldParent
		local badge = Instance.new("BillboardGui")
		badge.Size, badge.AlwaysOnTop, badge.Enabled, badge.Parent =
			UDim2.fromOffset(150, 36), true, false, anchor
		coinIcon(badge, 35, 15)
		local text = label(badge, UDim2.new(1, -56, 1, 0), yellow, 23)
		text.Position, text.TextXAlignment = UDim2.fromOffset(56, 0), Enum.TextXAlignment.Left
		text.TextStrokeColor3, text.TextStrokeTransparency = ink, 0.25
		money[i] = { anchor = anchor, badge = badge, text = text, at = -math.huge }
	end
	return {
		gui = gui,
		eye = eye,
		focus = focus,
		gear = gear,
		ult = ult,
		ring = ring,
		world = world,
		hits = hits,
		dots = dots,
		fill = fill,
		remaining = remaining,
		coins = coins,
		coinScale = coinScale,
		cross = cross,
		arrow = arrow,
		bannerBox = bannerBox,
		worldBanner = worldBanner,
		newWorld = newWorld,
		plateReward = plateReward,
		banner = banner,
		layers = layers,
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
	h.remaining.TextColor3 = Color3.fromRGB(155, 88, 22):Lerp(ink, progress)
	h.coins.Text = h.translate("mine_coins", Format.short(coins))
	if coins ~= h.amount then
		if coins > h.amount and h.amount >= 0 then
			h.coinAt = os.clock()
		end
		h.amount = coins
	end
	if charge ~= h.lastCharge or cap ~= h.lastCap then
		for i, tick in h.ring do
			tick.BackgroundColor3 = if i <= math.floor(charge / cap * #h.ring)
				then Color3.fromRGB(58, 168, 223)
				else Color3.fromRGB(198, 210, 218)
		end
		h.lastCharge, h.lastCap = charge, cap
	end
end

function Hud.hits(h: any, count: number, point: Vector3?)
	local camera = workspace.CurrentCamera
	h.hits.Visible = false
	if camera and point and count > 0 then
		local p, visible = camera:WorldToViewportPoint(point)
		h.hits.Visible = visible
		h.hits.Size = UDim2.fromOffset(count * 10 - 4, 8)
		h.hits.Position = UDim2.fromOffset(p.X, p.Y + 14)
		for i, dot in h.dots do
			dot.Visible = i <= count
		end
	end
end

function Hud.rollPlate(h: any, oldFront: number, newFront: number, now: number)
	local world = Worlds.of(newFront)
	h.plateRoll = { at = now, from = world.plateDepth - math.max(world.start, oldFront) }
end

function Hud.enterWorld(h: any, now: number, world: Worlds.World, reward: number)
	h.worldEntered = { at = now, world = world, reward = reward }
	h.worldBanner.BackgroundColor3 =
		cream:Lerp(Color3.fromRGB(world.color[1], world.color[2], world.color[3]), 0.22)
end

function Hud.coin(h: any, position: Vector3, amount: number)
	if amount <= 0 then
		return
	end
	h.gainIndex = h.gainIndex % #h.money + 1
	local item = h.money[h.gainIndex]
	item.anchor.Position, item.at = position, os.clock()
	item.text.Text = h.translate("mine_coin_gain", Format.short(amount))
	item.badge.Enabled = true
end

function Hud.show(h: any, delta: number, blocks: number, coins: number, ultimate: boolean)
	if ultimate or delta >= 10 then
		h.reward = {
			at = os.clock(),
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
	h.gui.Enabled = active
	h.cross.Visible = crosshair
	h.coinScale.Scale = if reduced then 1 else 1 + 0.13 * math.max(0, 1 - (now - h.coinAt) / 0.24)
	h.ult.BackgroundColor3 = if h.lastCharge >= h.lastCap and h.lastCap > 0
		then cream:Lerp(yellow, 0.52 + 0.24 * math.sin(now * 6))
		else cream
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
					UDim2.fromOffset(p.X, p.Y), math.deg(math.atan2(direction.Y, direction.X)), true
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
	h.bannerBox.Visible = reward ~= nil and now - reward.at < 1.55
	if h.bannerBox.Visible then
		local progress = if reward.ultimate
			then h.fractureProgress
			else math.clamp((now - reward.at) / 0.63, 0, 1)
		h.layers.Visible = reward.ultimate
		h.layers.Text =
			h.translate("mine_ult_layers", Format.grouped(math.floor(reward.delta * progress)))
		h.banner.Position = UDim2.fromOffset(6, if h.layers.Visible then 24 else 14)
		h.banner.Text = if reward.ultimate
			then h.translate(
				"mine_ult_value",
				Format.grouped(math.floor(reward.blocks * progress)),
				Format.short(math.floor(reward.coins * progress))
			)
			else h.translate("mine_layers_gain", math.floor(reward.delta * progress))
	end
	for _, item in h.money do
		local t = now - item.at
		item.badge.Enabled = active and t < 0.7
		if item.badge.Enabled then
			item.badge.StudsOffsetWorldSpace = Vector3.new(0, 0.8 + 2.6 * t / 0.7, 0)
			item.text.TextTransparency, item.text.TextStrokeTransparency =
				t / 0.7, 0.25 + 0.75 * t / 0.7
		end
	end
end

return Hud
