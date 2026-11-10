--!strict

local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Format = require(Shared.Format)
local Strings = require(Shared.Strings)
local Worlds = require(Shared.Mine.Worlds)
local Kit = require(script.Parent.Kit)
local Hud = {}

local anchorCenter = Vector2.new(0.5, 0.5)
local ringDark = Color3.fromRGB(78, 64, 63)
local ringCharged = Color3.fromRGB(96, 220, 251)
local rarity = {
	Kit.light,
	Color3.fromRGB(166, 238, 132),
	Color3.fromRGB(137, 217, 255),
	Color3.fromRGB(221, 162, 255),
	Color3.fromRGB(255, 213, 110),
}

function Hud.new(
	guiParent: Instance,
	worldParent: Instance,
	translate: (string, ...any) -> string
): any
	local gui = Kit.gui(guiParent, "MineHUD", 4, false)
	local wallet =
		Kit.image(gui, "Wallet", UDim2.fromOffset(124, 44), UDim2.fromOffset(12, 54), "frame-iron")
	local coins = Kit.number(wallet, UDim2.new(1, -40, 1, -6), UDim2.fromScale(1, 0.5), "hud-coin")
	coins.AnchorPoint, coins.Position = anchorCenter, UDim2.new(0.5, 16, 0.5, 0)
	local coinScale = Instance.new("UIScale")
	coinScale.Parent = coins

	local worldCard = Kit.image(
		gui,
		"World",
		UDim2.new(0.42, 0, 0, 58),
		UDim2.new(0.5, 0, 0, 9),
		"frame-iron",
		Vector2.new(0.5, 0)
	)
	local width = Instance.new("UISizeConstraint")
	width.MaxSize, width.Parent = Vector2.new(264, 58), worldCard
	local world = Kit.label(
		worldCard,
		"WorldProgress",
		UDim2.new(1, -16, 0, 23),
		UDim2.fromOffset(8, 4),
		17,
		true
	)
	local fill = Kit.bar(
		worldCard,
		"Progress",
		UDim2.new(1, -24, 0, 7),
		UDim2.fromOffset(12, 29),
		ringCharged
	)
	local remaining = Kit.label(
		worldCard,
		"PlateRemaining",
		UDim2.new(1, -12, 0, 16),
		UDim2.fromOffset(6, 37),
		13
	)

	local rightTop = Vector2.new(1, 0)
	local eye = Kit.button(
		gui,
		"MineCameraButton",
		UDim2.fromOffset(44, 44),
		UDim2.new(1, -60, 0, 9),
		"iron",
		rightTop,
		"icon-lens"
	)
	local gear = Kit.button(
		gui,
		"MineSettingsButton",
		UDim2.fromOffset(44, 44),
		UDim2.new(1, -12, 0, 9),
		"iron",
		rightTop,
		"i-gear"
	)
	local focus = Kit.button(
		gui,
		"FaceWall",
		UDim2.fromOffset(142, 44),
		UDim2.new(0.5, 0, 1, -14),
		"gold",
		Vector2.new(0.5, 1)
	)
	focus.Visible = false

	local ult, ring = Kit.dial(gui, UDim2.new(1, -13, 1, -12))
	local hits =
		Kit.block(gui, "HitsRemaining", UDim2.fromOffset(76, 8), UDim2.fromScale(0.5, 0.5), Kit.ink)
	hits.AnchorPoint, hits.BackgroundTransparency, hits.Visible = anchorCenter, 1, false
	local dots = {}
	for i = 1, 8 do
		dots[i] = Kit.block(
			hits,
			"Dot",
			UDim2.fromOffset(5, 5),
			UDim2.fromOffset((i - 1) * 9, 1),
			Kit.gold
		)
	end
	local cross =
		Kit.block(gui, "Crosshair", UDim2.fromOffset(4, 4), UDim2.fromScale(0.5, 0.5), Kit.light)
	cross.AnchorPoint = anchorCenter
	local arrow = Kit.image(
		gui,
		"AimArrow",
		UDim2.fromOffset(24, 24),
		UDim2.fromScale(0.5, 0.5),
		"i-right",
		anchorCenter
	)
	arrow.Visible = false

	local bannerBox = Kit.image(
		gui,
		"RideReward",
		UDim2.fromOffset(246, 53),
		UDim2.fromScale(0.5, 0.77),
		"frame-iron",
		anchorCenter
	)
	bannerBox.Visible = false
	local banner =
		Kit.label(bannerBox, "Reward", UDim2.new(1, -12, 0, 23), UDim2.fromOffset(6, 24), 16)
	local layers = Kit.label(
		bannerBox,
		"FractureLayers",
		UDim2.new(1, -12, 0, 21),
		UDim2.fromOffset(6, 4),
		16,
		true,
		Kit.gold
	)
	local worldBanner = Kit.image(
		gui,
		"WorldEntered",
		UDim2.fromOffset(274, 52),
		UDim2.new(0.5, 0, 0, 72),
		"frame-iron",
		Vector2.new(0.5, 0)
	)
	worldBanner.Visible = false
	local newWorld = Kit.label(
		worldBanner,
		"WorldName",
		UDim2.new(1, -12, 0, 24),
		UDim2.fromOffset(6, 3),
		17,
		true
	)
	local plateReward = Kit.label(
		worldBanner,
		"PlateReward",
		UDim2.new(1, -12, 0, 20),
		UDim2.fromOffset(6, 27),
		14,
		false,
		Kit.gold
	)

	local money = {}
	for i = 1, 10 do
		local anchor = Instance.new("Part")
		anchor.Size, anchor.Transparency = Vector3.one * 0.1, 1
		anchor.Anchored, anchor.CanQuery, anchor.CanCollide, anchor.CanTouch, anchor.CastShadow =
			true, false, false, false, false
		anchor.Parent = worldParent
		local badge = Instance.new("BillboardGui")
		badge.Size, badge.AlwaysOnTop, badge.Enabled, badge.Parent =
			UDim2.fromOffset(122, 36), true, false, anchor
		local icon =
			Kit.image(badge, "Coin", UDim2.fromOffset(16, 16), UDim2.fromOffset(16, 10), "hud-coin")
		local text =
			Kit.label(badge, "Gain", UDim2.new(1, -37, 1, 0), UDim2.fromOffset(37, 0), 23, true)
		text.TextXAlignment = Enum.TextXAlignment.Left
		money[i] = {
			anchor = anchor,
			badge = badge,
			icon = icon,
			text = text,
			stroke = text:FindFirstChildOfClass("UIStroke"),
			at = -math.huge,
		}
	end
	return {
		gui = gui,
		eye = eye,
		gear = gear,
		focus = focus,
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
	h.remaining.TextColor3 = Kit.gold:Lerp(Kit.light, progress)
	h.coins.Text = Format.stat(coins, Strings.localeOf(Players.LocalPlayer))
	if coins ~= h.amount then
		if coins > h.amount and h.amount >= 0 then
			h.coinAt = os.clock()
		end
		h.amount = coins
	end
	h.lastCharge, h.lastCap = charge, cap
end

function Hud.hits(h: any, count: number, point: Vector3?)
	local camera = workspace.CurrentCamera
	h.hits.Visible = false
	if camera and point and count > 0 then
		local p, visible = camera:WorldToViewportPoint(point)
		h.hits.Visible = visible
		h.hits.Size = UDim2.fromOffset(math.min(count, #h.dots) * 9 - 4, 8)
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
	h.newWorld.TextColor3 =
		Kit.light:Lerp(Color3.fromRGB(world.color[1], world.color[2], world.color[3]), 0.46)
end

function Hud.coin(h: any, position: Vector3, amount: number, ore: number?)
	if amount <= 0 then
		return
	end
	h.gainIndex = h.gainIndex % #h.money + 1
	local item = h.money[h.gainIndex]
	item.anchor.Position, item.at = position, os.clock()
	item.text.Text =
		h.translate("mine_coin_gain", Format.stat(amount, Strings.localeOf(Players.LocalPlayer)))
	item.text.TextColor3 = rarity[ore or 1] or Kit.gold
	item.badge.Enabled = true
end

function Hud.show(h: any, delta: number, blocks: number, coins: number, ultimate: boolean)
	if ultimate or delta >= 10 then
		h.reward =
			{ at = os.clock(), delta = delta, blocks = blocks, coins = coins, ultimate = ultimate }
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
	local jump = math.clamp((now - h.coinAt) / 0.10, 0, 1)
	h.coinScale.Scale = if reduced then 1 else 1 + 0.06 * math.sin(jump * math.pi)
	local charge = if h.lastCap > 0 then h.lastCharge / h.lastCap else 0
	local pulse = if reduced then 0.7 else 0.65 + 0.25 * math.sin(now * 6)
	local color = if charge >= 1
		then Color3.fromRGB(219, 131, 38):Lerp(Kit.gold, pulse)
		else ringCharged
	for i, tick in h.ring do
		tick.BackgroundColor3 = if i <= math.floor(charge * #h.ring) then color else ringDark
	end
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
		h.plateReward.Text = h.translate(
			"mine_plate_reward",
			Format.stat(entered.reward, Strings.localeOf(Players.LocalPlayer))
		)
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
				Format.stat(
					math.floor(reward.coins * progress),
					Strings.localeOf(Players.LocalPlayer)
				)
			)
			else h.translate("mine_layers_gain", math.floor(reward.delta * progress))
	end
	for _, item in h.money do
		local t = now - item.at
		item.badge.Enabled = active and t < 0.7
		if item.badge.Enabled then
			item.badge.StudsOffsetWorldSpace =
				Vector3.new(0, 0.8 + (if reduced then 0 else 2.6 * t / 0.7), 0)
			item.text.TextTransparency, item.stroke.Transparency, item.icon.ImageTransparency =
				t / 0.7, t / 0.7, t / 0.7
		end
	end
end

return Hud
