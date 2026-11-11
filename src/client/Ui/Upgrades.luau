--!strict

local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Sfx = require(Shared.Sfx)
local Strings = require(Shared.Strings)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(Shared.Play.Circle)
local Upgrade = require(Shared.Play.Upgrade)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local Families = require(script.Parent.Families)

local Upgrades = {}
local progress = Config.progress
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local counts: { Upgrade.Count } = { 1, 10, "max" }
local shapeIcons = { "shape1", "shape2", "shape4", "shape3", "shape5", "shape5" }

type PurchaseControl = {
	button: Candy.Control,
	status: Frame,
	statusIcon: ImageLabel,
	statusText: TextLabel,
	purchase: Upgrade.Purchase,
	available: boolean,
	level: number,
}
type Quantity = { buttons: { Candy.Control }, count: Upgrade.Count }
local function green(value: string): string
	return '<font color="#16A34A">' .. value .. "</font>"
end

local function setShape(image: ImageLabel, stage: number)
	Candy.setIcon(image, shapeIcons[stage])
	image.Rotation = if stage == 2 then 90 else 0
end

local function cardValue(id: string, level: number, locale: string): string
	local rule = progress.cards[id]
	local amount = if id == "power" then (1 + rule.per) ^ level else rule.per * level * 100
	return if id == "power"
		then "×" .. Format.stat(amount, locale)
		else tostring(math.round(amount)) .. "%"
end

local function purchase(parent: Instance, kind: string, size: UDim2, at: UDim2): PurchaseControl
	local button = Candy.button(parent, "Buy", size, at, "coin", 17)
	Candy.buttonIcon(button, "coin")
	local status = Candy.frame(parent, "PurchaseStatus", size, at, Candy.green)
	Candy.round(status, 12)
	Candy.stroke(status)
	local icon = Candy.icon(status, "lock", scale(0.25, 0.76), scale(0.05, 0.12))
	local text =
		Candy.text(status, "Status", scale(0.91, 0.88), scale(0.045, 0.06), 13, Candy.white)
	return {
		button = button,
		status = status,
		statusIcon = icon,
		statusText = text,
		purchase = { kind = kind, count = 1 },
		available = false,
		level = 0,
	}
end

local function quantity(parent: Instance, at: UDim2, change: () -> ()): Quantity
	local strip = Candy.frame(parent, "Quantity", offset(193, 38), at)
	local selection: Quantity = { buttons = {}, count = 1 }
	for i, count in counts do
		local button = Candy.button(
			strip,
			"Count" .. tostring(count),
			offset(56, 33),
			offset((i - 1) * 64, 0),
			"neutral",
			15
		)
		button.input.Activated:Connect(function()
			selection.count = count
			change()
		end)
		selection.buttons[i] = button
	end
	return selection
end

function Upgrades.new(
	parent: Instance,
	player: Player,
	translate: (string, ...any) -> string,
	feedback: (string, number) -> ()
)
	local hud = Candy.layer(parent, "UpgradesHUD", 5)
	hud.Visible = false
	local open =
		Candy.button(hud, "OpenUpgrades", offset(171, 45), UDim2.new(0, 15, 1, -23), "purple", 18)
	open.box.AnchorPoint = Vector2.new(0, 1)
	Candy.buttonIcon(open, "upgrades")
	local dot = Candy.dot(open.face)
	local tip = Candy.panel(hud, "GetStronger", offset(172, 31), UDim2.new(0, 15, 1, -79))
	tip.AnchorPoint, tip.Visible = Vector2.new(0, 1), false
	local tipLabel = Candy.text(tip, "Hint", scale(0.95, 0.88), scale(0.025, 0.06), 15)

	local front, isCards, selectedCard = 0, false, "power"
	local pageIndex = 1
	local held: PurchaseControl?
	local pressed: InputObject?
	local nextRepeat = math.huge
	local last: { control: PurchaseControl, at: number, level: number }?
	local hardSince: number?
	local previousStrength: number?
	local refresh: (boolean) -> ()
	local modal = Candy.modal(
		parent,
		"MineUpgrades",
		scale(0.78, 0.69),
		Candy.purple,
		function(show)
			held, pressed = nil, nil
			player:SetAttribute("MineUpgradesOpen", show)
			open.box.Visible = not show
			if show then
				refresh(false)
			end
		end
	)
	local panel = modal.panel
	local tabs = {}
	for i, key in { "upgrade_pickaxe", "upgrade_cards", "collection_tab", "family_tab" } do
		local tab = Candy.button(
			panel,
			if i == 1 then "PickaxeTab" else "CardsTab",
			UDim2.new(0.23, -3, 0, 30),
			UDim2.new(0.04 + (i - 1) * 0.23, 0, 0, 25),
			"neutral",
			16
		)
		tab.face.Rotation, tab.shadow.Rotation = -2, -2
		tab.input.Activated:Connect(function()
			isCards = i == 2
			pageIndex = i
			held, pressed = nil, nil
			refresh(false)
		end)
		tabs[key] = { control = tab, index = i }
	end
	local body = Candy.frame(panel, "Body", UDim2.new(1, 0, 1, -60), offset(0, 60))
	local pickPage = Candy.frame(body, "Pickaxe", scale(1, 1), offset(0, 0))
	local cardPage = Candy.frame(body, "Cards", scale(1, 1), offset(0, 0))
	local familyPages = Families.new(body, player, translate)
	local function row(key: string, icon: string, index: number, kind: string)
		local box = Candy.panel(
			pickPage,
			key,
			UDim2.new(1, -28, 0.21, 0),
			UDim2.new(0, 14, 0.104 + (index - 1) * 0.233, 0),
			true
		)
		local sticker = Candy.iconCell(box, icon, offset(37, 37), UDim2.new(0, 7, 0.5, -18.5))
		local title =
			Candy.text(box, "Name", UDim2.new(0.65, -54, 0.46, 0), UDim2.new(0, 52, 0.03, 0), 16)
		local details =
			Candy.text(box, "Details", UDim2.new(0.65, -54, 0.43, 0), UDim2.new(0, 52, 0.48, 0), 13)
		title.TextXAlignment, details.TextXAlignment, details.RichText =
			Enum.TextXAlignment.Left, Enum.TextXAlignment.Left, true
		local control = purchase(box, kind, UDim2.new(0.30, -10, 0.76, 0), scale(0.70, 0.07))
		return { box = box, sticker = sticker, name = title, details = details, buy = control }
	end
	-- [владелец 11.11] «Размер удара» is hidden while Upgrade.hitSizeEnabled is off
	local shift = if Upgrade.hitSizeEnabled then 0 else 1
	local hit = row("HitSize", "shape1", 1, "hitSize")
	hit.box.Visible = Upgrade.hitSizeEnabled
	local width = row("Width", "width", 2 - shift, "width")
	local pick = row("Level", "pick", 3 - shift, "pick")
	local oldShape = Candy.icon(hit.box, "shape1", offset(25, 25), UDim2.new(0, 53, 0.52, 0))
	local nextShape = Candy.icon(hit.box, "shape2", offset(25, 25), UDim2.new(0, 109, 0.52, 0))
	Candy.fit(hit.details, offset(25, 22), UDim2.new(0, 81, 0.52, 0))
	hit.details.Text, hit.details.TextXAlignment = "→", Enum.TextXAlignment.Center

	local function onQuantity()
		held, pressed = nil, nil
		refresh(false)
	end
	local pickQuantity = quantity(pickPage, UDim2.new(1, -205, 0.82, 0), onQuantity)
	local stats = Candy.text(
		pickPage,
		"PowerAndHardness",
		UDim2.new(1, -231, 0.16, 0),
		UDim2.new(0, 17, 0.80, 0),
		13
	)
	stats.TextXAlignment = Enum.TextXAlignment.Left

	local cards = {}
	for i, id in Upgrade.cards do
		local box, surface = Candy.panel(
			cardPage,
			id,
			UDim2.new(1 / 4, -16, 0.59, 0),
			UDim2.new((i - 1) / 4, 11, 0.12, 0),
			true
		)
		local border = surface:FindFirstChildOfClass("UIStroke")
		Candy.iconCell(box, id, offset(44, 44), UDim2.new(0.5, -22, 0.06, 0))
		local title = Candy.text(box, "Name", scale(0.94, 0.19), scale(0.03, 0.37), 16)
		local level = Candy.text(box, "Level", scale(0.94, 0.14), scale(0.03, 0.54), 13)
		local fill = Candy.bar(box, scale(0.86, 0.052), scale(0.07, 0.75), Candy.purple)
		local morph = Candy.text(box, "Morph", scale(0.92, 0.14), scale(0.04, 0.82), 11)
		local lock = Candy.icon(box, "lock", offset(20, 20), UDim2.new(1, -27, 0, 7))
		local target = Instance.new("TextButton")
		target.Name, target.Text, target.Size, target.BackgroundTransparency =
			"Select", "", scale(1, 1), 1
		target.Parent = box
		target.Activated:Connect(function()
			selectedCard = id
			held, pressed, last = nil, nil, nil
			refresh(false)
		end)
		cards[id] = {
			box = box,
			border = border,
			title = title,
			level = level,
			fill = fill,
			morph = morph,
			lock = lock,
		}
	end
	local cardQuantity = quantity(cardPage, UDim2.new(0, 14, 0.80, 0), onQuantity)
	local cardDetails = Candy.text(
		cardPage,
		"CardPreview",
		UDim2.new(0.44, -30, 0.15, 0),
		UDim2.new(0.39, 9, 0.79, 0),
		15
	)
	cardDetails.RichText = true
	local cardBuy =
		purchase(cardPage, "card", UDim2.new(0.24, -7, 0.15, 0), UDim2.new(0.76, -4, 0.79, 0))
	local remote = Remotes.event("UpgradeIntent")

	local function send(control: PurchaseControl, now: number)
		if not control.available then
			Sfx.play("locked", 0.26)
			return
		end
		last = { control = control, at = now, level = control.level }
		local command = control.purchase
		if command.kind == "card" then
			remote:FireServer("BuyCard", command.id, command.count)
		elseif command.kind == "pick" then
			remote:FireServer("BuyPickLevel", command.count)
		elseif command.kind == "width" then
			remote:FireServer("BuyWidth")
		else
			remote:FireServer("BuyHitSize")
		end
	end

	for _, control in { hit.buy, width.buy, pick.buy, cardBuy } do
		control.button.input.InputBegan:Connect(function(input)
			if Candy.pointer(input) then
				local now = os.clock()
				send(control, now)
				if control.purchase.count == 1 and control.available then
					held, pressed, nextRepeat = control, input, now + 0.38
				end
			end
		end)
		control.button.input.Activated:Connect(function(input)
			if not Candy.pointer(input) then
				send(control, os.clock())
			end
		end)
	end
	UserInputService.InputEnded:Connect(function(input)
		if pressed == input or input.UserInputType == Enum.UserInputType.MouseButton1 then
			held, pressed = nil, nil
		end
	end)
	UserInputService.WindowFocusReleased:Connect(function()
		held, pressed = nil, nil
	end)

	local function price(
		control: PurchaseControl,
		ctx: Upgrade.Context,
		level: number,
		locked: number?
	)
		local command = control.purchase
		local quote = Upgrade.quote(ctx, command)
		local single = quote
			or Upgrade.quote(ctx, { kind = command.kind, id = command.id, count = 1 })
		control.available, control.level = Upgrade.pay(ctx.coins, quote) ~= nil, level
		local forSale = locked == nil and single ~= nil
		control.button.box.Visible, control.status.Visible = forSale, not forSale
		control.status.BackgroundColor3 = if locked then Candy.rowColor else Candy.green
		control.statusIcon.Visible = locked ~= nil
		Candy.fit(
			control.statusText,
			scale(if locked then 0.69 else 0.9, 0.88),
			scale(if locked then 0.28 else 0.05, 0.06)
		)
		control.statusText.TextColor3 = if locked then Candy.ink else Candy.white
		control.statusText.Text = if locked
			then translate("upgrade_width_lock", locked)
			else translate("upgrade_cap")
		if single then
			control.button.text.Text = Format.short(single.price)
		end
		Candy.paint(control.button, if control.available then "coin" else "disabled")
	end

	refresh = function(animate: boolean)
		open.text.Text = translate("upgrade_title")
		local profile = ProfileState.getProfile()
		local world = Worlds.of(front).index
		local ctx = if profile then Circle.context(profile, world) else nil
		dot.Visible = ctx ~= nil and Upgrade.available(ctx)
		if not profile or not ctx or not modal.open then
			return
		end
		modal.title.Text = translate("upgrade_title")
		for key, entry in tabs do
			entry.control.text.Text = translate(key)
			Candy.paint(entry.control, if pageIndex == entry.index then "purple" else "neutral")
		end
		for _, strip in { pickQuantity, cardQuantity } do
			for i, control in strip.buttons do
				local count = counts[i]
				control.text.Text = if count == "max"
					then translate("upgrade_max")
					else "×" .. tostring(count)
				Candy.paint(control, if count == strip.count then "purple" else "neutral")
			end
		end
		pickPage.Visible, cardPage.Visible = pageIndex == 1, pageIndex == 2
		familyPages.collection.Visible, familyPages.family.Visible = pageIndex == 3, pageIndex == 4
		familyPages.refresh(profile)
		local locale = Strings.localeOf(player)
		hit.name.Text = translate("upgrade_hit_size", ctx.hitSize)
		local afterShape = math.min(#shapeIcons, ctx.hitSize + 1)
		setShape(hit.sticker, ctx.hitSize)
		setShape(oldShape, ctx.hitSize)
		setShape(nextShape, afterShape)
		local nextWidth = Upgrade.nextWidth(ctx.width)
		local widthLock = nextWidth
				and nextWidth.world
				and ctx.world < nextWidth.world
				and nextWidth.world
			or nil
		width.name.Text = translate("upgrade_width")
		width.details.Text = tostring(ctx.width)
			.. (if nextWidth then " → " .. green(tostring(nextWidth.w)) else "")
		pick.name.Text = translate("upgrade_pick_level", ctx.pickLevel)
		pick.buy.purchase.count = pickQuantity.count
		local quote = Upgrade.quote(ctx, pick.buy.purchase)
		local nextCircle = {
			hitSize = profile.circle.hitSize,
			cards = profile.circle.cards,
			pickLevels = table.clone(profile.circle.pickLevels),
		}
		nextCircle.pickLevels[ctx.pick] = if quote then quote.level else ctx.pickLevel
		local currentPick = Circle.pick(ctx.pick, profile.circle, front, profile)
		local nextPick = Circle.pick(ctx.pick, nextCircle, front, profile)
		pick.details.Text = translate(
			"upgrade_pick_preview",
			Format.stat(currentPick.strength, locale),
			green(Format.stat(nextPick.strength, locale)),
			Format.short(currentPick.ultLayers),
			green(Format.short(nextPick.ultLayers))
		)
		price(hit.buy, ctx, ctx.hitSize)
		price(width.buy, ctx, ctx.width, widthLock)
		price(pick.buy, ctx, ctx.pickLevel)
		for id, card in cards do
			local level = ctx.cards[id] or 0
			local rule = progress.cards[id]
			local unlocked = ctx.unlockedCards[id] == true
			card.title.Text = translate("card_" .. id)
			card.level.Text = if unlocked
				then translate("upgrade_level", level)
				else translate("upgrade_width_lock", rule.world)
			card.lock.Visible = not unlocked
			if card.border then
				card.border.Color = if id == selectedCard then Candy.purple else Candy.ink
			end
			local before, after = 0, nil
			for _, milestone in rule.steps do
				if milestone > level then
					after = milestone
					break
				end
				before = milestone
			end
			card.morph.Visible, card.fill.Parent.Visible = unlocked, unlocked
			card.morph.Text = if after
				then translate(
					"upgrade_morph_at",
					after,
					translate(
						if id == "coins" and after > rule.steps[2]
							then "upgrade_soon"
							else "morph_" .. id .. "_" .. after
					)
				)
				else translate("upgrade_morph_done")
			card.fill.Size = scale(if after then (level - before) / (after - before) else 1, 1)
		end
		local level = ctx.cards[selectedCard] or 0
		cardBuy.purchase.id, cardBuy.purchase.count = selectedCard, cardQuantity.count
		local cardQuote = Upgrade.quote(ctx, cardBuy.purchase)
		cardDetails.Text = cardValue(selectedCard, level, locale)
			.. " → "
			.. green(cardValue(selectedCard, if cardQuote then cardQuote.level else level, locale))
		local unlocked = ctx.unlockedCards[selectedCard] == true
		cardDetails.Visible = unlocked
		for _, control in cardQuantity.buttons do
			control.box.Visible = unlocked
		end
		price(cardBuy, ctx, level, if unlocked then nil else progress.cards[selectedCard].world)
		if animate and last and os.clock() - last.at <= 1 and last.control.level > last.level then
			feedback("buy", os.clock())
			Sfx.play("buy_soft", 0.54)
			Sfx.play("level_tick", 0.4)
			hardSince, last = nil, nil
		end
	end

	open.input.Activated:Connect(function()
		Candy.show(modal, true)
	end)
	ProfileState.changed:Connect(function()
		refresh(true)
	end)
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(function()
			refresh(false)
		end)
	end
	refresh(false)

	return function(
		now: number,
		active: boolean,
		depth: number,
		need: number,
		strength: number,
		hardness: number,
		reduced: boolean
	)
		hud.Visible = active
		if not active and modal.open then
			Candy.show(modal, false)
		end
		if depth ~= front then
			front = depth
			refresh(false)
		end
		if modal.open and not isCards then
			local locale = Strings.localeOf(player)
			stats.Text = translate(
				"mine_power_hardness",
				Format.stat(strength, locale),
				Format.stat(hardness, locale)
			)
		end
		if not active or need < 5 or (previousStrength and strength > previousStrength) then
			hardSince = nil
		elseif not hardSince then
			hardSince = now
		end
		previousStrength = strength
		local pulse = active
			and not modal.open
			and hardSince ~= nil
			and now - hardSince >= 10
			and dot.Visible
		tip.Visible = pulse
		if pulse then
			tipLabel.Text = "↓  " .. translate("upgrade_stronger")
		end
		open.face.BackgroundColor3 = Candy.purple:Lerp(
			Candy.white,
			if pulse and not reduced then 0.10 + 0.08 * math.sin(now * 6) else 0
		)
		if held and now >= nextRepeat then
			if held.available and held.button.box.Visible and modal.open then
				nextRepeat = now + 0.125
				send(held, now)
			else
				held, pressed = nil, nil
			end
		end
	end
end

return Upgrades
