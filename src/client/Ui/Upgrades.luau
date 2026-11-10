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
local PickModel = require(Shared.Models.PickModel)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Kit = require(script.Parent.Kit)

local Upgrades = {}
local progress = Config.progress
local cardIcons = { power = "st-power", coins = "hud-coin", crit = "i-star" }

local function green(text: string): string
	return '<font color="#B4FF79">' .. text .. "</font>"
end

local function cardValue(id: string, level: number, locale: string): string
	local rule = progress.cards[id]
	local amount = if id == "power" then (1 + rule.per) ^ level else rule.per * level * 100
	return if id == "power"
		then "×" .. Format.stat(amount, locale)
		else tostring(math.round(amount)) .. "%"
end

function Upgrades.new(
	parent: Instance,
	player: Player,
	translate: (string, ...any) -> string,
	feedback: (string, number) -> ()
)
	local gui = Kit.gui(parent, "MineUpgrades", 6, false)
	local open = Kit.button(
		gui,
		"OpenUpgrades",
		UDim2.fromOffset(147, 48),
		UDim2.new(0, 13, 1, -12),
		"green",
		Vector2.new(0, 1)
	)
	Kit.image(open, "Pick", UDim2.fromOffset(26, 26), UDim2.fromOffset(10, 11), "pick-0")
	Kit.image(open, "Arrow", UDim2.fromOffset(13, 13), UDim2.fromOffset(27, 8), "i-up")
	local openCaption = Kit.caption(open, translate("upgrade_title"))
	openCaption.Size, openCaption.Position = UDim2.new(1, -46, 1, -8), UDim2.fromOffset(40, 4)
	local openScale = Instance.new("UIScale")
	openScale.Parent = open
	local dot =
		Kit.image(open, "Affordable", UDim2.fromOffset(12, 12), UDim2.new(1, -10, 0, 0), "badge")
	dot.Visible = false
	local tip = Kit.image(
		gui,
		"GetStronger",
		UDim2.fromOffset(154, 28),
		UDim2.new(0, 11, 1, -67),
		"frame-iron",
		Vector2.new(0, 1)
	)
	tip.Visible = false
	local tipText = Kit.label(
		tip,
		"Caption",
		UDim2.new(1, -10, 1, -4),
		UDim2.fromOffset(5, 2),
		14,
		true,
		Kit.gold
	)

	local panel = Kit.image(
		gui,
		"Panel",
		UDim2.new(1, -16, 2 / 3, 0),
		UDim2.fromScale(0.5, 1),
		"frame-wood",
		Vector2.new(0.5, 1)
	)
	panel.Active, panel.Visible = true, false
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize, limit.Parent = Vector2.new(680, 520), panel
	local titlePlate = Kit.image(
		panel,
		"TitlePlate",
		UDim2.new(0.33, -12, 0, 44),
		UDim2.fromOffset(9, 6),
		"frame-iron"
	)
	local title = Kit.label(
		titlePlate,
		"Title",
		UDim2.new(1, -12, 1, -4),
		UDim2.fromOffset(6, 2),
		19,
		true,
		Kit.gold
	)
	local pickTab = Kit.button(
		panel,
		"PickaxeTab",
		UDim2.new(0.32, -23, 0, 44),
		UDim2.new(0.33, 3, 0, 6),
		"gold"
	)
	local cardTab = Kit.button(
		panel,
		"CardsTab",
		UDim2.new(0.35, -43, 0, 44),
		UDim2.new(0.65, -15, 0, 6),
		"iron"
	)
	local close = Kit.button(
		panel,
		"Close",
		UDim2.fromOffset(44, 44),
		UDim2.new(1, -8, 0, 6),
		"red",
		Vector2.new(1, 0),
		"i-x"
	)
	local function page(name: string): ScrollingFrame
		local scroll = Kit.scroll(panel, name, UDim2.new(1, -18, 1, -57), UDim2.fromOffset(9, 54))
		local layout = Instance.new("UIListLayout")
		layout.Padding, layout.SortOrder, layout.Parent =
			UDim.new(0, 3), Enum.SortOrder.LayoutOrder, scroll
		return scroll
	end
	local pickPage, cardPage = page("Pickaxe"), page("Cards")
	local stats =
		Kit.label(pickPage, "PowerAndHardness", UDim2.new(1, -5, 0, 20), UDim2.fromOffset(0, 0), 13)
	stats.LayoutOrder = 0

	local selected = "power"
	local isCards = false
	local front = 0
	local held: any = nil
	local pressed: InputObject? = nil
	local repeated: InputObject? = nil
	local last: any = nil
	local nextRepeat = math.huge
	local hardSince: number? = nil
	local previousStrength: number? = nil
	local remote = Remotes.event("UpgradeIntent")
	local controls = {}

	local function send(control: any, now: number)
		if not control.available then
			Sfx.play("locked", 0.26)
			return
		end
		last = { control = control, at = now, from = control.level, id = control.purchase.id }
		local purchase = control.purchase
		if purchase.kind == "card" then
			remote:FireServer("BuyCard", purchase.id, purchase.count)
		elseif purchase.kind == "pick" then
			remote:FireServer("BuyPickLevel", purchase.count)
		elseif purchase.kind == "width" then
			remote:FireServer("BuyWidth")
		else
			remote:FireServer("BuyHitSize")
		end
	end

	local function priceRow(
		row: GuiObject,
		kind: string,
		counts: { Upgrade.Count },
		name: TextLabel,
		area: UDim2,
		at: UDim2
	): any
		local group = Kit.block(row, "Price", area, at, Kit.ink)
		group.BackgroundTransparency = 1
		local cap = Kit.image(
			group,
			"Max",
			UDim2.fromOffset(84, 28),
			UDim2.fromScale(0.5, 0.5),
			"frame-iron",
			Vector2.new(0.5, 0.5)
		)
		local capText = Kit.label(
			cap,
			"Caption",
			UDim2.fromScale(1, 1),
			UDim2.fromOffset(0, 0),
			14,
			true,
			Kit.gold
		)
		local lock = Kit.image(
			group,
			"Lock",
			UDim2.fromOffset(18, 18),
			UDim2.new(0.5, -41, 0.5, -9),
			"i-lock"
		)
		local lockText = Kit.label(
			group,
			"UnlockWorld",
			UDim2.new(1, -25, 1, 0),
			UDim2.fromOffset(25, 0),
			13,
			true,
			Kit.gold
		)
		local buttons = {}
		for i, count in counts do
			local n = #counts
			local column = Kit.block(
				group,
				"Offer",
				UDim2.new(1 / n, -3, 1, 0),
				UDim2.fromScale((i - 1) / n, 0),
				Kit.ink
			)
			column.BackgroundTransparency = 1
			local button = Kit.button(
				column,
				"Buy" .. tostring(count),
				UDim2.new(1, 0, 0, 44),
				UDim2.fromOffset(0, 0),
				"iron"
			)
			local icon = Kit.image(
				button,
				"Coin",
				UDim2.fromOffset(14, 14),
				UDim2.new(0, 6, 0.5, if n == 1 then -7 else 1),
				"hud-coin"
			)
			local caption = Kit.caption(button, "")
			caption.Size, caption.Position =
				UDim2.new(1, -24, 0, if n == 1 then 36 else 22),
				UDim2.fromOffset(21, if n == 1 then 4 else 17)
			local multiplier = Kit.label(
				button,
				"Count",
				UDim2.new(1, -4, 0, 17),
				UDim2.fromOffset(2, 2),
				12,
				true
			)
			multiplier.Visible = n > 1
			local missing = Kit.label(
				column,
				"Missing",
				UDim2.new(1, 0, 0, 15),
				UDim2.fromOffset(0, 44),
				11,
				false,
				Kit.gold
			)
			local scale = Instance.new("UIScale")
			scale.Parent = button
			local control = {
				button = button,
				caption = caption,
				multiplier = multiplier,
				icon = icon,
				column = column,
				scale = scale,
				missing = missing,
				name = name,
				available = false,
				level = 0,
				purchase = { kind = kind, count = count },
			}
			table.insert(buttons, control)
			table.insert(controls, control)
			button.InputBegan:Connect(function(input)
				local pointer = input.UserInputType == Enum.UserInputType.Touch
					or input.UserInputType == Enum.UserInputType.MouseButton1
				if pointer then
					repeated = nil
					if count == 1 and control.available then
						held, pressed, nextRepeat = control, input, os.clock() + 0.38
					end
				end
			end)
			button.Activated:Connect(function(input)
				if input ~= repeated then
					send(control, os.clock())
				end
			end)
		end
		return { cap = cap, capText = capText, lock = lock, lockText = lockText, buttons = buttons }
	end

	local function row(kind: string, icon: string, order: number, counts: { Upgrade.Count }): any
		local box = Kit.image(
			pickPage,
			kind,
			UDim2.new(1, -5, 0, 57),
			UDim2.fromOffset(0, 0),
			"frame-parch"
		)
		box.LayoutOrder = order
		local picture =
			Kit.image(box, "Icon", UDim2.fromOffset(48, 48), UDim2.fromOffset(6, 4), icon)
		local fraction = if #counts > 1 then 0.53 else 0.32
		local name = Kit.label(
			box,
			"Title",
			UDim2.new(1 - fraction, -62, 0, 24),
			UDim2.fromOffset(58, 5),
			16,
			true
		)
		local details = Kit.label(
			box,
			"Preview",
			UDim2.new(1 - fraction, -62, 0, 25),
			UDim2.fromOffset(58, 29),
			13
		)
		name.TextXAlignment, details.TextXAlignment, details.RichText =
			Enum.TextXAlignment.Left, Enum.TextXAlignment.Left, true
		local prices = priceRow(
			box,
			kind,
			counts,
			name,
			UDim2.new(fraction, -7, 1, -3),
			UDim2.new(1 - fraction, 0, 0, 3)
		)
		return { picture = picture, name = name, details = details, prices = prices }
	end
	local hit = row("hitSize", "i-grid", 1, { 1 })
	local width = row("width", "i-left", 2, { 1 })
	local pick = row("pick", "pick-0", 3, { 1, 10, "max" })

	local cardShelf =
		Kit.block(cardPage, "Cards", UDim2.new(1, -5, 0, 107), UDim2.fromOffset(0, 0), Kit.ink)
	cardShelf.LayoutOrder, cardShelf.BackgroundTransparency = 1, 1
	local cards = {}
	for i, id in Upgrade.cards do
		local button = Kit.button(
			cardShelf,
			id,
			UDim2.new(1 / 3, -4, 1, 0),
			UDim2.fromScale((i - 1) / 3, 0),
			"iron"
		)
		local art = Kit.image(
			button,
			"Paper",
			UDim2.new(1, -12, 1, -14),
			UDim2.fromOffset(6, 6),
			"frame-parch"
		)
		Kit.image(art, "Icon", UDim2.fromOffset(33, 33), UDim2.new(0.5, -16, 0, 6), cardIcons[id])
		local lock =
			Kit.image(art, "Lock", UDim2.fromOffset(19, 19), UDim2.new(1, -24, 0, 7), "i-lock")
		local name =
			Kit.label(art, "Name", UDim2.new(1, -6, 0, 18), UDim2.fromOffset(3, 39), 15, true)
		local level = Kit.label(art, "Level", UDim2.new(1, -6, 0, 17), UDim2.fromOffset(3, 55), 12)
		local morph = Kit.label(
			art,
			"Morph",
			UDim2.new(1, -8, 0, 14),
			UDim2.fromOffset(4, 71),
			11,
			false,
			Kit.gold
		)
		local fill =
			Kit.bar(art, "MorphTrack", UDim2.new(1, -16, 0, 4), UDim2.new(0, 8, 1, -6), Kit.green)
		cards[id] =
			{ button = button, name = name, level = level, morph = morph, fill = fill, lock = lock }
	end
	local cardOffer = Kit.image(
		cardPage,
		"SelectedCard",
		UDim2.new(1, -5, 0, 62),
		UDim2.fromOffset(0, 0),
		"frame-iron"
	)
	cardOffer.LayoutOrder = 2
	local cardDetails = Kit.label(
		cardOffer,
		"Preview",
		UDim2.new(0.26, -8, 1, -8),
		UDim2.fromOffset(6, 4),
		14,
		true
	)
	cardDetails.RichText = true
	local cardPrices = priceRow(
		cardOffer,
		"card",
		{ 1, 10, "max" },
		cardDetails,
		UDim2.new(0.73, -5, 1, -4),
		UDim2.new(0.27, 0, 0, 3)
	)

	local function price(
		offers: any,
		ctx: Upgrade.Context,
		level: number,
		unlock: number?,
		capped: boolean,
		id: string?
	)
		local locale = Strings.localeOf(player)
		offers.lock.Visible, offers.lockText.Visible, offers.cap.Visible =
			unlock ~= nil, unlock ~= nil, capped
		offers.lockText.Text = if unlock then translate("upgrade_width_lock", unlock) else ""
		offers.capText.Text = translate("upgrade_cap")
		for _, control in offers.buttons do
			control.purchase.id = id
			local quote = Upgrade.quote(ctx, control.purchase)
			local one = if control.purchase.count == "max" and not quote
				then Upgrade.quote(ctx, { kind = control.purchase.kind, id = id, count = 1 })
				else nil
			local cost = quote or one
			local affordable = Upgrade.pay(ctx.coins, quote) ~= nil
			control.available, control.level = affordable, level
			control.column.Visible = not unlock and not capped
			control.caption.Text = if cost then Format.stat(cost.price, locale) else "—"
			control.icon.Visible = cost ~= nil
			control.multiplier.Text = if control.purchase.count == "max"
				then translate("upgrade_max")
				else "×" .. tostring(control.purchase.count)
			control.missing.Text = if cost and not affordable
				then translate(
					"upgrade_missing",
					Format.stat(math.max(0, cost.price - ctx.coins), locale)
				)
				else ""
			Kit.state(control.button, if affordable then "green" else "iron", cost ~= nil)
		end
	end

	local function refresh(animate: boolean)
		local p = ProfileState.getProfile()
		local ctx = if p then Circle.context(p, Worlds.of(front).index) else nil
		dot.Visible = ctx ~= nil and Upgrade.available(ctx)
		Kit.caption(open, translate("upgrade_title"))
		if not p or not ctx or not panel.Visible then
			return
		end
		title.Text = translate("upgrade_title")
		Kit.caption(pickTab, translate("upgrade_pickaxe"))
		Kit.caption(cardTab, translate("upgrade_cards"))
		pickPage.Visible, cardPage.Visible = not isCards, isCards
		Kit.state(pickTab, if isCards then "iron" else "gold")
		Kit.state(cardTab, if isCards then "gold" else "iron")
		local nextWidth = Upgrade.nextWidth(ctx.width)
		local locked = if nextWidth and ctx.world < (nextWidth.world or 1)
			then nextWidth.world
			else nil
		local locale = Strings.localeOf(player)
		hit.name.Text = translate("upgrade_hit_size", ctx.hitSize)
		hit.details.Text = tostring(ctx.hitSize)
			.. (
				if ctx.hitSize < #progress.hitSizes
					then " → " .. green(tostring(ctx.hitSize + 1))
					else ""
			)
		width.name.Text = translate("upgrade_width")
		width.details.Text = tostring(ctx.width)
			.. (if nextWidth then " → " .. green(tostring(nextWidth.w)) else "")
		local pickNow = Circle.pick(ctx.pick, p.circle, front)
		local nextCircle = {
			hitSize = p.circle.hitSize,
			cards = p.circle.cards,
			pickLevels = table.clone(p.circle.pickLevels),
		}
		local single = Upgrade.quote(ctx, { kind = "pick", count = 1 })
		nextCircle.pickLevels[ctx.pick] = if single then single.level else ctx.pickLevel
		local pickNext = Circle.pick(ctx.pick, nextCircle, front)
		pick.name.Text = translate("upgrade_pick_level", ctx.pickLevel)
		Kit.paint(pick.picture, "pick-" .. PickModel.icon(ctx.pick))
		pick.details.Text = if single
			then translate(
				"upgrade_pick_preview",
				Format.stat(pickNow.strength, locale),
				green(Format.stat(pickNext.strength, locale)),
				Format.grouped(pickNow.ultLayers),
				green(Format.grouped(pickNext.ultLayers))
			)
			else ""
		price(hit.prices, ctx, ctx.hitSize, nil, ctx.hitSize >= #progress.hitSizes)
		price(width.prices, ctx, ctx.width, locked, nextWidth == nil)
		price(pick.prices, ctx, ctx.pickLevel, nil, single == nil)
		for id, card in cards do
			local level = ctx.cards[id] or 0
			local rule = progress.cards[id]
			local unlocked = ctx.unlockedCards[id] == true
			Kit.state(card.button, if id == selected then "gold" else "iron")
			card.name.Text = translate("card_" .. id)
			card.level.Text = if unlocked
				then translate("upgrade_level", level)
				else translate("upgrade_width_lock", rule.world)
			card.lock.Visible = not unlocked
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
						if id == "coins" and after > rule.steps[1]
							then "upgrade_soon"
							else "morph_" .. id .. "_" .. after
					)
				)
				else translate("upgrade_morph_done")
			card.fill.Size =
				UDim2.fromScale(if after then (level - before) / (after - before) else 1, 1)
		end
		if animate and last and os.clock() - last.at <= 1 then
			local purchase = last.control.purchase
			local level = if purchase.kind == "card"
				then ctx.cards[last.id] or 0
				else last.control.level
			if level > last.from then
				last.control.jumpAt = os.clock()
				last.control.from = last.from
				last.control.to = level
				last.control.card = last.id
				hardSince = nil
				feedback("buy", last.control.jumpAt)
				Sfx.play("buy_soft", 0.54)
				last = nil
			end
		end
		local level = ctx.cards[selected] or 0
		local rule = progress.cards[selected]
		local unlock = if ctx.unlockedCards[selected] then nil else rule.world
		local cap = rule.cap or math.huge
		cardDetails.Text = if unlock
			then translate("card_" .. selected)
			else cardValue(selected, level, locale) .. " → " .. green(
				cardValue(selected, math.min(cap, level + 1), locale)
			)
		price(cardPrices, ctx, level, unlock, level >= cap, selected)
	end

	local function setOpen(value: boolean)
		panel.Visible, open.Visible = value, not value
		held, pressed = nil, nil
		player:SetAttribute("MineUpgradesOpen", value)
		if value then
			refresh(false)
		end
	end
	open.Activated:Connect(function()
		setOpen(true)
	end)
	close.Activated:Connect(function()
		setOpen(false)
	end)
	pickTab.Activated:Connect(function()
		isCards, held, pressed = false, nil, nil
		refresh(false)
	end)
	cardTab.Activated:Connect(function()
		isCards, held, pressed = true, nil, nil
		refresh(false)
	end)
	for id, card in cards do
		card.button.Activated:Connect(function()
			selected, held, pressed = id, nil, nil
			refresh(false)
		end)
	end
	UserInputService.InputEnded:Connect(function(input)
		if pressed == input then
			held, pressed = nil, nil
		end
	end)
	UserInputService.WindowFocusReleased:Connect(function()
		held, pressed = nil, nil
	end)
	ProfileState.changed:Connect(function()
		refresh(true)
	end)
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(function()
			refresh(false)
		end)
	end

	return function(
		now: number,
		active: boolean,
		depth: number,
		need: number,
		strength: number,
		hardness: number,
		reduced: boolean
	)
		gui.Enabled = active
		if not active and panel.Visible then
			setOpen(false)
		end
		if depth ~= front then
			front = depth
			refresh(false)
		end
		if panel.Visible then
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
			and not panel.Visible
			and hardSince ~= nil
			and now - hardSince >= 10
			and dot.Visible
		tip.Visible = pulse
		if pulse then
			tipText.Text = "↓  " .. translate("upgrade_stronger")
		end
		openScale.Scale = if pulse and not reduced then 1.03 + 0.08 * math.sin(now * 6) else 1
		if held and now >= nextRepeat then
			if held.available and panel.Visible then
				nextRepeat, repeated = now + 0.125, pressed
				send(held, now)
			else
				held, pressed = nil, nil
			end
		end
		if panel.Visible then
			for _, control in controls do
				if control.jumpAt then
					local t = math.clamp((now - control.jumpAt) / 0.26, 0, 1)
					control.scale.Scale = if reduced then 1 else 1 + 0.11 * math.sin(math.pi * t)
					local level = math.floor(control.from + (control.to - control.from) * t)
					if control.purchase.kind == "pick" then
						control.name.Text = translate("upgrade_pick_level", level)
					elseif control.card then
						cards[control.card].level.Text = translate("upgrade_level", level)
					end
					if level ~= control.tick then
						control.tick = level
						Sfx.play("level_tick", 0.4)
					end
					if t == 1 then
						control.jumpAt = nil
					end
				end
			end
		end
	end
end

return Upgrades
