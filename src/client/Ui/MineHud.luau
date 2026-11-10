--!strict

local GuiService = game:GetService("GuiService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Format = require(Shared.Format)
local Worlds = require(Shared.Mine.Worlds)
local Candy = require(script.Parent.Candy)
local Hud = {}

local yellow = Color3.fromHex("FFC83D")
local center = Vector2.new(0.5, 0.5)
local right = Vector2.new(1, 0)
local bottom = Vector2.new(1, 1)
local offset, scale = UDim2.fromOffset, UDim2.fromScale

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
	local worldCard =
		Candy.panel(gui, "WorldCard", UDim2.new(0.30, -4, 0, 64), UDim2.new(0.5, 0, 0, 16))
	worldCard.AnchorPoint = Vector2.new(0.5, 0)
	local world = Candy.text(worldCard, "WorldProgress", UDim2.new(1, -10, 0, 22), offset(5, 4), 16)
	local fill = Candy.bar(worldCard, UDim2.new(1, -22, 0, 9), offset(11, 29), yellow)
	local remaining =
		Candy.text(worldCard, "PlateRemaining", UDim2.new(1, -10, 0, 20), offset(5, 39), 12)

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

	local bannerBox = Candy.panel(gui, "MineReward", offset(254, 56), scale(0.5, 0.76))
	bannerBox.AnchorPoint, bannerBox.Visible = center, false
	local banner = Candy.text(bannerBox, "Reward", UDim2.new(1, -12, 0, 27), offset(6, 24), 20)
	local layers = Candy.text(bannerBox, "FractureLayers", UDim2.new(1, 0, 0, 25), offset(0, 0), 17)
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
end

function Hud.finishUltimate(h: any, now: number)
	if h.ultimate then
		h.ultimate.progress, h.ultimate.ended = 1, now
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

function Hud.show(
	h: any,
	delta: number,
	blocks: number,
	coins: number,
	ultimate: boolean,
	now: number
)
	if ultimate or delta >= 10 then
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
	local gain = h.ultimate
	h.ultimateGain.Visible = active and gain ~= nil
	if gain then
		if now >= gain.nextAt then
			gain.amount = math.floor(gain.total * gain.progress)
			h.ultimateGain.Text = h.translate("mine_coin_gain", Format.short(gain.amount))
			gain.nextAt = now + 0.1
		end
		h.ultimateGain.TextSize = 34 + 10 * gain.progress
		local camera = workspace.CurrentCamera
		if camera then
			local start = h.cross.AbsolutePosition + h.cross.AbsoluteSize / 2 + Vector2.new(0, 48)
			local fly = if gain.ended then math.clamp((now - gain.ended - 0.6) / 0.35, 0, 1) else 0
			local target = h.coins.Parent.AbsolutePosition + h.coins.Parent.AbsoluteSize / 2
			h.ultimateGain.Position = Candy.point(start:Lerp(target, fly * fly))
			h.ultimateGain.TextTransparency, h.ultimateStroke.Transparency = fly, fly
			if fly == 1 then
				h.ultimate, h.coinAt, h.ultimateGain.Visible = nil, now, false
			end
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
	Candy.move(h.bannerBox, scale(0.5, if gain then 0.32 else 0.76))
	h.bannerBox.Visible = reward ~= nil and now - reward.at < 1.55
	if h.bannerBox.Visible then
		local progress = if reward.ultimate
			then h.fractureProgress
			else math.clamp((now - reward.at) / 0.63, 0, 1)
		h.layers.Visible = reward.ultimate
		h.layers.Text =
			h.translate("mine_ult_layers", Format.grouped(math.floor(reward.delta * progress)))
		Candy.move(h.banner, offset(6, if h.layers.Visible then 24 else 14))
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
			item.text.TextTransparency, item.icon.ImageTransparency, item.stroke.Transparency =
				t / 0.7, t / 0.7, t / 0.7
		end
	end
end

return Hud
