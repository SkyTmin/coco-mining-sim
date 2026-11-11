--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(Shared.Play.Circle)
local Power = require(Shared.Play.Power)
local Upgrade = require(Shared.Play.Upgrade)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)

local Cards = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local counts: { Upgrade.Count } = { 1, 10, "max" }
local cardColors = {
	power = Color3.fromHex("FF8A65"),
	coins = W.yellow,
	crit = Candy.pink,
	keys = W.blue,
}

local function pickAt(profile: any, front: number, level: number): Circle.Pick
	local nextCircle = table.clone(profile.circle)
	nextCircle.pickLevels = table.clone(nextCircle.pickLevels)
	nextCircle.pickLevels[profile.pickaxe] = level
	return Circle.pick(profile.pickaxe, nextCircle, front, profile)
end

function Cards.summary(profile: any, front: number)
	local context = Circle.context(profile, Worlds.of(front).index)
	local current = Circle.pick(context.pick, profile.circle, front, profile)
	local single = Upgrade.quote(context, { kind = "pick", count = 1 })
	local cardCount = 0
	for _, id in Upgrade.cards do
		if
			Upgrade.pay(
				context.coins,
				Upgrade.quote(context, { kind = "card", id = id, count = 1 })
			)
		then
			cardCount += 1
		end
	end
	return {
		context = context,
		power = current.strength,
		nextPower = if single
			then pickAt(profile, front, single.level).strength
			else current.strength,
		pickCount = if Upgrade.pay(context.coins, single) then 1 else 0,
		cardCount = cardCount,
	}
end

local function quantity(ctx: W.Context, parent: Instance, size: UDim2, at: UDim2, change: () -> ())
	local strip = Candy.frame(parent, "Quantity", size, at)
	local selector = { value = counts[1], buttons = {} :: { Candy.Control } }
	for index, count in counts do
		local button = Candy.button(
			strip,
			"Count" .. index,
			UDim2.new(1 / 3, -4, 1, 0),
			UDim2.new((index - 1) / 3, 2, 0, 0),
			"neutral",
			14
		)
		W.bind(ctx, button, function()
			selector.value = count
			change()
		end)
		selector.buttons[index] = button
	end
	return selector
end

local function cardValue(id: string, level: number, locale: string): string
	local per = Config.progress.cards[id].per
	if id == "power" then
		return "×" .. Format.stat((1 + per) ^ level, locale)
	end
	return "+" .. Format.stat(per * level * 100, locale) .. "%"
end

function Cards.new(ctx: W.Context, pickPage: Frame, cardsPage: Frame)
	local t = ctx.t
	local remote = Remotes.event("UpgradeIntent")
	local refresh: (any, number, boolean) -> ()
	local currentProfile: any
	local currentFront = 0
	local function refreshCurrent()
		if currentProfile then
			refresh(currentProfile, currentFront, false)
		end
	end

	local hero, heroSurface =
		Candy.panel(pickPage, "PickPreview", UDim2.new(0.48, -5, 1, -5), offset(3, 0), true)
	heroSurface.BackgroundColor3 = Color3.fromHex("DDF2FE")
	local image = Candy.icon(hero, "pick", scale(0.68, 0.61), scale(0.16, 0.03))
	local heroName = Candy.text(hero, "Name", scale(0.95, 0.12), scale(0.025, 0.63), 24)
	local details =
		Candy.frame(pickPage, "PickDetails", UDim2.new(0.52, -7, 1, -5), UDim2.new(0.48, 5, 0, 0))
	local levelBox = Candy.panel(details, "Level", scale(1, 0.27), scale(0, 0), true)
	local levelLabel = Candy.text(levelBox, "Title", scale(0.9, 0.32), scale(0.05, 0.05), 15)
	local levelValue = Candy.text(levelBox, "Value", scale(0.9, 0.52), scale(0.05, 0.39), 32)
	local _, strength =
		W.pill(details, "Strength", scale(1, 0.19), scale(0, 0.31), Candy.rowColor, 21)
	local pickCount = quantity(ctx, details, UDim2.new(1, 0, 0, 47), scale(0, 0.55), refreshCurrent)
	local pickBuy = Candy.button(
		details,
		"BuyPick",
		UDim2.new(1, 0, 0, 53),
		UDim2.new(0, 0, 1, -55),
		"coin",
		21
	)
	Candy.buttonIcon(pickBuy, "coin")
	local widthBuy = Candy.button(
		hero,
		"BuyWidth",
		UDim2.new(0.91, 0, 0, 46),
		UDim2.new(0.045, 0, 1, -48),
		"neutral",
		14
	)
	Candy.buttonIcon(widthBuy, "width")
	local pickQuote: Upgrade.Quote? = nil
	local widthQuote: Upgrade.Quote? = nil
	local pickHelp, widthHelp = "", ""
	W.bind(ctx, pickBuy, function()
		if currentProfile and Upgrade.pay(currentProfile.coins, pickQuote) then
			remote:FireServer("BuyPickLevel", pickCount.value)
		end
	end, function()
		return pickHelp
	end)
	W.bind(ctx, widthBuy, function()
		if currentProfile and Upgrade.pay(currentProfile.coins, widthQuote) then
			remote:FireServer("BuyWidth")
		end
	end, function()
		return widthHelp
	end)

	local circle = Candy.text(cardsPage, "Circle", UDim2.new(0.53, 0, 0, 47), offset(2, 0), 20)
	circle.TextXAlignment = Enum.TextXAlignment.Left
	local cardCount =
		quantity(ctx, cardsPage, UDim2.new(0.36, 0, 0, 47), scale(0.64, 0), refreshCurrent)
	local grid = Candy.frame(cardsPage, "UpgradeCards", UDim2.new(1, 0, 1, -55), offset(0, 53))
	local controls = {}
	for index, id in Upgrade.cards do
		local box =
			Candy.panel(grid, id, UDim2.new(0.25, -7, 1, -3), UDim2.new((index - 1) / 4, 3, 0, 0))
		local color = cardColors[id]
		local content = Candy.frame(box, "Content", UDim2.new(1, 0, 1, -52), offset(0, 0))
		W.band(content, "Header", UDim2.new(1, -4, 0.47, -2), color)
		local iconPlate, icon = W.iconCircle(content, id, scale(0.63, 0.39), scale(0.5, 0.237))
		iconPlate.AnchorPoint = Vector2.new(0.5, 0.5)
		local title = Candy.text(content, "Name", scale(0.94, 0.14), scale(0.03, 0.47), 20)
		local hint = Candy.text(content, "Hint", scale(0.94, 0.12), scale(0.03, 0.61), 13)
		local level = Candy.text(content, "Level", scale(0.92, 0.11), scale(0.04, 0.73), 14)
		local _, value =
			W.pill(content, "Change", scale(0.92, 0.135), scale(0.04, 0.85), Candy.rowColor, 15)
		local buy = Candy.button(
			box,
			"BuyCard",
			UDim2.new(0.92, 0, 0, 46),
			UDim2.new(0.04, 0, 1, -48),
			"coin",
			17
		)
		Candy.buttonIcon(buy, "coin")
		local view = {
			icon = icon,
			title = title,
			hint = hint,
			level = level,
			value = value,
			buy = buy,
			quote = nil :: Upgrade.Quote?,
			help = "",
			previous = nil :: number?,
		}
		controls[id] = view
		W.bind(ctx, buy, function()
			if currentProfile and Upgrade.pay(currentProfile.coins, view.quote) then
				remote:FireServer("BuyCard", id, cardCount.value)
			end
		end, function()
			return view.help
		end)
	end

	local previousPick: string? = nil
	local previousLevel: number? = nil
	local previousWidth: number? = nil
	refresh = function(profile: any, front: number, animate: boolean)
		currentProfile, currentFront = profile, front
		local context = Circle.context(profile, Worlds.of(front).index)
		local locale = Strings.localeOf(ctx.player)
		local rarity = Config.progress.rarities[Config.pickaxes[context.pick].rarity]
		local current = Circle.pick(context.pick, profile.circle, front, profile)
		pickQuote = Upgrade.quote(context, { kind = "pick", count = pickCount.value })
		local single = pickQuote or Upgrade.quote(context, { kind = "pick", count = 1 })
		local nextPick = if single then pickAt(profile, front, single.level) else current
		local maxLevel = Power.cap(rarity, context.golden)
		W.pickIcon(image, context.pick)
		heroName.Text = W.pickName(t, context.pick)
			.. " "
			.. W.stars(Config.pickaxes[context.pick].rarity)
		levelLabel.Text = t("menu_pick_level")
		levelValue.Text = t("menu_fraction", context.pickLevel, maxLevel)
		strength.Text = t(
			"menu_strength_change",
			Format.stat(current.strength, locale),
			Format.stat(nextPick.strength, locale)
		)
		pickBuy.text.Text = if single then Format.short(single.price) else t("upgrade_cap")
		Candy.paint(pickBuy, if Upgrade.pay(context.coins, pickQuote) then "coin" else "disabled")
		pickHelp = t(
			"upgrade_pick_preview",
			Format.stat(current.strength, locale),
			Format.stat(nextPick.strength, locale),
			Format.short(current.ultLayers),
			Format.short(nextPick.ultLayers)
		)

		local nextWidth = Upgrade.nextWidth(context.width)
		widthQuote = Upgrade.quote(context, { kind = "width", count = 1 })
		widthBuy.text.Text = if widthQuote
			then Format.short(widthQuote.price)
			else t(
				if nextWidth then "menu_world" else "upgrade_cap",
				nextWidth and nextWidth.world
			)
		widthHelp = t("upgrade_width")
			.. " · "
			.. tostring(context.width)
			.. (if nextWidth then " → " .. tostring(nextWidth.w) else "")
		Candy.paint(widthBuy, if Upgrade.pay(context.coins, widthQuote) then "coin" else "disabled")
		if animate and pickPage.Visible then
			if
				previousPick == context.pick
				and previousLevel
				and context.pickLevel > previousLevel
			then
				W.bump(image, ctx, true)
			elseif previousWidth and context.width > previousWidth then
				W.bump(widthBuy.image, ctx, true)
			end
		end
		previousPick, previousLevel, previousWidth = context.pick, context.pickLevel, context.width
		circle.Text = t("menu_circle")

		for _, strip in { pickCount, cardCount } do
			for index, button in strip.buttons do
				local count = counts[index]
				button.text.Text = if count == "max"
					then t("upgrade_max")
					else "×" .. tostring(count)
				Candy.paint(button, if strip.value == count then "coin" else "neutral")
			end
		end
		for id, view in controls do
			local level = context.cards[id] or 0
			local rule = Config.progress.cards[id]
			local unlocked = context.unlockedCards[id] == true
			view.quote = Upgrade.quote(context, { kind = "card", id = id, count = cardCount.value })
			local price = view.quote
				or Upgrade.quote(context, { kind = "card", id = id, count = 1 })
			view.title.Text, view.hint.Text = t("card_" .. id), t("menu_card_" .. id)
			view.level.Text = t("upgrade_level", level)
			view.value.Text = cardValue(id, level, locale)
				.. (if price then " → " .. cardValue(id, price.level, locale) else "")
			view.buy.text.Text = if not unlocked
				then t("menu_world", rule.world)
				elseif price then Format.short(price.price)
				else t("upgrade_cap")
			Candy.buttonIcon(view.buy, if unlocked then "coin" else "lock")
			Candy.paint(
				view.buy,
				if Upgrade.pay(context.coins, view.quote) then "coin" else "disabled"
			)
			view.help = view.hint.Text .. " · " .. t("menu_circle_tip")
			for i, milestone in rule.steps do
				if milestone > level then
					local name = t(
						if id == "coins" and i > 2
							then "upgrade_soon"
							else "morph_" .. id .. "_" .. milestone
					)
					view.help = t("upgrade_morph_at", milestone, name)
						.. "\n"
						.. t("menu_circle_tip")
					break
				end
			end
			if animate and cardsPage.Visible and view.previous and level > view.previous then
				W.bump(view.icon, ctx, true)
			end
			view.previous = level
		end
	end

	return { refresh = refresh }
end

return Cards
