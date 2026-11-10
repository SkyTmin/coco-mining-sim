--!strict

local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Sfx = require(Shared.Sfx)
local Strings = require(Shared.Strings)
local Shapes = require(Shared.Mine.Shapes)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(Shared.Play.Circle)
local Upgrade = require(Shared.Play.Upgrade)
local ProfileState = require(script.Parent.Parent.ProfileState)

local Upgrades = {}
local INK = Color3.fromRGB(36, 57, 83)
local CREAM = Color3.fromRGB(255, 243, 220)
local ROW = Color3.fromRGB(255, 250, 239)
local BLUE = Color3.fromRGB(183, 224, 244)
local MUTED = Color3.fromRGB(226, 223, 216)
local RED = Color3.fromRGB(206, 54, 57)
local progress = Config.progress

local function round(gui: GuiObject, radius: number)
	local corner = gui:FindFirstChildOfClass("UICorner") or Instance.new("UICorner")
	corner.CornerRadius, corner.Parent = UDim.new(0, radius), gui
end

local function frame(parent: Instance, name: string, size: UDim2, at: UDim2, color: Color3): Frame
	local item = Instance.new("Frame")
	item.Name, item.Size, item.Position = name, size, at
	item.BackgroundColor3, item.BorderSizePixel, item.Parent = color, 0, parent
	return item
end

local function text(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	fontSize: number
): TextLabel
	local item = Instance.new("TextLabel")
	item.Name, item.Size, item.Position = name, size, at
	item.Text, item.Font, item.TextSize, item.TextColor3 = "", Enum.Font.GothamBold, fontSize, INK
	item.TextXAlignment, item.BackgroundTransparency = Enum.TextXAlignment.Left, 1
	item.TextScaled = true
	local limits = Instance.new("UITextSizeConstraint")
	limits.MinTextSize, limits.MaxTextSize, limits.Parent = 10, fontSize, item
	item.Parent = parent
	return item
end

local function button(parent: Instance, name: string, size: UDim2, at: UDim2): TextButton
	local item = Instance.new("TextButton")
	item.Name, item.Size, item.Position = name, size, at
	item.BackgroundColor3, item.BorderSizePixel = BLUE, 0
	item.Text, item.Font, item.TextColor3 = "", Enum.Font.GothamBold, INK
	item.TextScaled, item.TextWrapped = true, true
	local limits = Instance.new("UITextSizeConstraint")
	limits.MinTextSize, limits.MaxTextSize, limits.Parent = 9, 15, item
	item.Parent = parent
	round(item, 9)
	return item
end

local function shapeIcon(parent: Instance, x: number): { Frame }
	local icon = frame(parent, "Shape", UDim2.fromOffset(29, 29), UDim2.fromOffset(x, 31), ROW)
	icon.BackgroundTransparency = 1
	local squares = {}
	for y = 0, 2 do
		for col = 0, 2 do
			local square = frame(
				icon,
				"Cell",
				UDim2.fromOffset(8, 8),
				UDim2.fromOffset(10 * col, 10 * y),
				MUTED
			)
			round(square, 2)
			squares[y * 3 + col + 1] = square
		end
	end
	return squares
end

local function paintShape(squares: { Frame }, stage: number)
	for _, square in squares do
		square.BackgroundColor3 = MUTED
	end
	for _, point in
		Shapes.cells(progress.hitSizes[stage].shape, if stage == 2 then -1 else 0, 1, 3, 3)
	do
		squares[point.y * 3 + point.x + 2].BackgroundColor3 = INK
	end
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
	local gui = Instance.new("ScreenGui")
	gui.Name, gui.DisplayOrder, gui.ResetOnSpawn, gui.Enabled = "MineUpgrades", 6, false, false
	gui.IgnoreGuiInset, gui.ScreenInsets, gui.Parent =
		true, Enum.ScreenInsets.DeviceSafeInsets, parent
	local open = button(gui, "OpenUpgrades", UDim2.fromOffset(53, 53), UDim2.new(0, 16, 1, -21))
	open.AnchorPoint, open.BackgroundColor3, open.Text = Vector2.new(0, 1), CREAM, "⬆"
	open.TextScaled, open.TextSize = false, 27
	round(open, 30)
	local openScale = Instance.new("UIScale")
	openScale.Parent = open
	local dot = frame(open, "Affordable", UDim2.fromOffset(12, 12), UDim2.new(1, -10, 0, 0), RED)
	round(dot, 7)
	dot.Visible = false
	local tip = text(gui, "GetStronger", UDim2.fromOffset(154, 28), UDim2.new(0, 12, 1, -81), 14)
	tip.AnchorPoint, tip.BackgroundColor3, tip.Visible = Vector2.new(0, 1), CREAM, false
	tip.TextXAlignment, tip.BackgroundTransparency = Enum.TextXAlignment.Center, 0
	round(tip, 9)

	local panel = frame(gui, "Panel", UDim2.new(1, -20, 0.66, 0), UDim2.fromScale(0.5, 1), CREAM)
	panel.AnchorPoint, panel.Active, panel.Visible = Vector2.new(0.5, 1), true, false
	round(panel, 15)
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize, limit.Parent = Vector2.new(608, 500), panel
	local title = text(panel, "Title", UDim2.new(1, -65, 0, 32), UDim2.fromOffset(14, 2), 20)
	local close = button(panel, "Close", UDim2.fromOffset(32, 29), UDim2.new(1, -40, 0, 5))
	close.Text = "×"
	local pickTab =
		button(panel, "PickaxeTab", UDim2.new(0.5, -15, 0, 30), UDim2.fromOffset(10, 37))
	local cardTab = button(panel, "CardsTab", UDim2.new(0.5, -15, 0, 30), UDim2.new(0.5, 5, 0, 37))
	local function page(name: string): ScrollingFrame
		local scroll = Instance.new("ScrollingFrame")
		scroll.Name, scroll.Size, scroll.Position =
			name, UDim2.new(1, -18, 1, -76), UDim2.fromOffset(9, 71)
		scroll.BackgroundTransparency, scroll.BorderSizePixel, scroll.ScrollBarThickness = 1, 0, 4
		scroll.AutomaticCanvasSize, scroll.CanvasSize = Enum.AutomaticSize.Y, UDim2.fromOffset(0, 0)
		scroll.ScrollingDirection, scroll.Parent = Enum.ScrollingDirection.Y, panel
		local layout = Instance.new("UIListLayout")
		layout.Padding, layout.SortOrder, layout.Parent =
			UDim.new(0, 5), Enum.SortOrder.LayoutOrder, scroll
		return scroll
	end

	local pickPage, cardPage = page("Pickaxe"), page("Cards")
	local stats =
		text(pickPage, "PowerAndHardness", UDim2.new(1, -10, 0, 20), UDim2.fromOffset(0, 0), 13)
	stats.LayoutOrder = 0
	stats.TextXAlignment = Enum.TextXAlignment.Center
	local isCards = false
	local front = 0
	local context: Upgrade.Context? = nil
	local held: any = nil
	local pressed: InputObject? = nil
	local last: any = nil
	local nextRepeat = math.huge
	local hardSince: number? = nil
	local previousStrength: number? = nil
	local remote = Remotes.event("UpgradeIntent")

	local function send(control: any, now: number)
		if not control.available then
			Sfx.play("locked", 0.26)
			return
		end
		last = { control = control, at = now, from = control.level }
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

	local function row(
		pageGui: ScrollingFrame,
		kind: string,
		id: string?,
		order: number,
		height: number,
		counts: { Upgrade.Count }
	): any
		local box =
			frame(pageGui, id or kind, UDim2.new(1, -5, 0, height), UDim2.fromOffset(0, 0), ROW)
		box.LayoutOrder = order
		round(box, 10)
		local name = text(box, "Name", UDim2.new(1, -16, 0, 23), UDim2.fromOffset(8, 1), 17)
		local details = text(box, "Details", UDim2.new(1, -16, 0, 19), UDim2.fromOffset(8, 24), 13)
		local controls = {}
		for i, count in counts do
			local wide = #counts == 1
			local b = button(
				box,
				"Buy" .. tostring(count),
				UDim2.new(if wide then 0.43 else 1 / 3, -7, 0, 38),
				UDim2.new(if wide then 0.57 else (i - 1) / 3, 5, 1, -43)
			)
			local scale = Instance.new("UIScale")
			scale.Parent = b
			local control = {
				button = b,
				scale = scale,
				purchase = { kind = kind, id = id, count = count },
				available = false,
				level = 0,
			}
			control.nameLabel = name
			table.insert(controls, control)
			b.InputBegan:Connect(function(input)
				if
					input.UserInputType ~= Enum.UserInputType.Touch
					and input.UserInputType ~= Enum.UserInputType.MouseButton1
				then
					return
				end
				local now = os.clock()
				send(control, now)
				if count == 1 and control.available then
					held, pressed, nextRepeat = control, input, now + 0.38
				end
			end)
			b.Activated:Connect(function(input)
				if
					input.UserInputType ~= Enum.UserInputType.Touch
					and input.UserInputType ~= Enum.UserInputType.MouseButton1
				then
					send(control, os.clock())
				end
			end)
		end
		return { box = box, name = name, details = details, controls = controls }
	end

	local hit = row(pickPage, "hitSize", nil, 1, 70, { 1 })
	local width = row(pickPage, "width", nil, 2, 66, { 1 })
	local pick = row(pickPage, "pick", nil, 3, 89, { 1, 10, "max" })
	hit.details.Size = UDim2.fromOffset(35, 28)
	hit.details.Position = UDim2.fromOffset(44, 31)
	hit.details.TextXAlignment = Enum.TextXAlignment.Center
	hit.details.Text = "→"
	local oldShape, nextShape = shapeIcon(hit.box, 9), shapeIcon(hit.box, 81)
	width.details.Size = UDim2.new(0.53, -8, 0, 30)
	width.details.Position = UDim2.fromOffset(8, 27)

	local cycleTitle =
		text(cardPage, "Circle", UDim2.new(1, -10, 0, 24), UDim2.fromOffset(0, 0), 17)
	cycleTitle.LayoutOrder = 1
	local cards = {}
	for i, id in Upgrade.cards do
		local card = row(cardPage, "card", id, i + 1, 118, { 1, 10, "max" })
		card.morph = text(card.box, "Morph", UDim2.new(1, -16, 0, 18), UDim2.fromOffset(8, 45), 12)
		local rail =
			frame(card.box, "MorphTrack", UDim2.new(1, -16, 0, 4), UDim2.fromOffset(8, 65), MUTED)
		card.fill = frame(rail, "Fill", UDim2.fromScale(0, 1), UDim2.fromOffset(0, 0), BLUE)
		cards[id] = card
	end
	local family = text(cardPage, "Family", UDim2.new(1, -10, 0, 29), UDim2.fromOffset(0, 0), 16)
	family.LayoutOrder = 8
	local soon = text(cardPage, "Soon", UDim2.new(1, -10, 0, 27), UDim2.fromOffset(0, 0), 14)
	soon.LayoutOrder = 9

	local function price(rowData: any, ctx: Upgrade.Context, level: number)
		for _, control in rowData.controls do
			local quote = Upgrade.quote(ctx, control.purchase)
			local missingQuote = quote
				or (
					if control.purchase.count == "max"
						then Upgrade.quote(ctx, {
							kind = control.purchase.kind,
							id = control.purchase.id,
							count = 1,
						})
						else nil
				)
			local affordable = Upgrade.pay(ctx.coins, quote) ~= nil
			local prefix = if #rowData.controls == 1
				then translate("upgrade_buy")
				elseif control.purchase.count == "max" then translate("upgrade_max")
				else "×" .. tostring(control.purchase.count)
			local value = if affordable and quote
				then translate("upgrade_price", Format.short(quote.price))
				elseif missingQuote then translate(
					"upgrade_missing",
					Format.short(math.max(0, missingQuote.price - ctx.coins))
				)
				elseif control.purchase.kind == "width" and Upgrade.nextWidth(ctx.width) then "🔒"
				else translate("upgrade_cap")
			control.button.Text = prefix .. "\n" .. value
			control.available, control.level = affordable, level
			control.button.BackgroundColor3 = if affordable then BLUE else MUTED
		end
	end

	local function refresh(animate: boolean)
		local p = ProfileState.getProfile()
		local world = Worlds.of(front).index
		context = if p then Circle.context(p, world) else nil
		local ctx = context
		dot.Visible = ctx ~= nil and Upgrade.available(ctx)
		if not p or not ctx or not panel.Visible then
			return
		end
		title.Text, pickTab.Text, cardTab.Text =
			translate("upgrade_title"), translate("upgrade_pickaxe"), translate("upgrade_cards")
		cycleTitle.Text, family.Text, soon.Text =
			translate("upgrade_circle"), translate("upgrade_family"), translate("upgrade_soon")
		pickPage.Visible, cardPage.Visible = not isCards, isCards
		pickTab.BackgroundColor3, cardTab.BackgroundColor3 =
			if isCards then MUTED else BLUE, if isCards then BLUE else MUTED
		hit.name.Text = translate("upgrade_hit_size", ctx.hitSize)
		paintShape(oldShape, ctx.hitSize)
		paintShape(nextShape, math.min(#progress.hitSizes, ctx.hitSize + 1))
		local nextWidth = Upgrade.nextWidth(ctx.width)
		width.name.Text = translate("upgrade_width")
		width.details.Text = tostring(ctx.width)
			.. (if nextWidth then " → " .. tostring(nextWidth.w) else "")
		if nextWidth and ctx.world < (nextWidth.world or 1) then
			width.details.Text ..= " · " .. translate("upgrade_width_lock", nextWidth.world)
		end
		local pickNow = Circle.pick(ctx.pick, p.circle, front)
		local nextCircle = {
			hitSize = p.circle.hitSize,
			cards = p.circle.cards,
			pickLevels = table.clone(p.circle.pickLevels),
		}
		local single = Upgrade.quote(ctx, { kind = "pick", count = 1 })
		nextCircle.pickLevels[ctx.pick] = if single then single.level else ctx.pickLevel
		local pickNext = Circle.pick(ctx.pick, nextCircle, front)
		local locale = Strings.localeOf(player)
		pick.name.Text = translate("upgrade_pick_level", ctx.pickLevel)
		pick.details.Text = translate(
			"upgrade_pick_preview",
			Format.stat(pickNow.strength, locale),
			Format.stat(pickNext.strength, locale),
			Format.grouped(pickNow.ultLayers),
			Format.grouped(pickNext.ultLayers)
		)
		price(hit, ctx, ctx.hitSize)
		price(width, ctx, ctx.width)
		price(pick, ctx, ctx.pickLevel)
		for id, card in cards do
			local level = ctx.cards[id] or 0
			local rule = progress.cards[id]
			local unlocked = ctx.unlockedCards[id]
			local cap = rule.cap or math.huge
			card.name.Text = translate("card_" .. id)
				.. (if unlocked then " · " .. translate("upgrade_level", level) else "  🔒")
			card.details.Text = if unlocked
				then cardValue(id, level, locale) .. " → " .. cardValue(
					id,
					math.min(cap, level + 1),
					locale
				)
				else translate("upgrade_card_lock", rule.world)
			local before, after = 0, nil
			for _, milestone in rule.steps do
				if milestone > level then
					after = milestone
					break
				end
				before = milestone
			end
			card.morph.Visible = unlocked == true
			card.fill.Parent.Visible = unlocked == true
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
			price(card, ctx, level)
			for _, control in card.controls do
				control.button.Visible = unlocked == true
			end
		end
		if animate and last and os.clock() - last.at <= 1 and last.control.level > last.from then
			last.control.jumpAt = os.clock()
			last.control.from = last.from
			hardSince = nil
			feedback("buy", last.control.jumpAt)
			Sfx.play("buy_soft", 0.54)
			last = nil
		end
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
		isCards = false
		refresh(false)
	end)
	cardTab.Activated:Connect(function()
		isCards = true
		refresh(false)
	end)
	UserInputService.InputEnded:Connect(function(input)
		if pressed == input or input.UserInputType == Enum.UserInputType.MouseButton1 then
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
			tip.Text = "↓  " .. translate("upgrade_stronger")
		end
		openScale.Scale = if pulse and not reduced then 1.03 + 0.08 * math.sin(now * 6) else 1
		if held and now >= nextRepeat then
			if held.available and held.button.Visible and panel.Visible then
				nextRepeat = now + 0.125
				send(held, now)
			else
				held, pressed = nil, nil
			end
		end
		if panel.Visible then
			for _, rowData in { hit, width, pick, cards.power, cards.coins, cards.crit } do
				for _, control in rowData.controls do
					if control.jumpAt then
						local t = math.clamp((now - control.jumpAt) / 0.26, 0, 1)
						control.scale.Scale = if reduced
							then 1
							else 1 + 0.11 * math.sin(math.pi * t)
						local level = math.floor(control.from + (control.level - control.from) * t)
						local purchase = control.purchase
						if purchase.kind == "pick" then
							control.nameLabel.Text = translate("upgrade_pick_level", level)
						elseif purchase.kind == "card" then
							control.nameLabel.Text = translate("card_" .. purchase.id)
								.. " · "
								.. translate("upgrade_level", level)
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
end

return Upgrades
