--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(Shared.Play.Circle)
local Upgrade = require(Shared.Play.Upgrade)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)

local Cards = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local counts: { Upgrade.Count } = { 1, 10, "max" }
Cards.counts = counts
local cardColors = {
	power = Color3.fromHex("FF8A65"),
	coins = W.yellow,
	crit = Candy.pink,
	keys = W.blue,
}

function Cards.pickAt(profile: any, front: number, level: number): Circle.Pick
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
			then Cards.pickAt(profile, front, single.level).strength
			else current.strength,
		pickCount = if Upgrade.pay(context.coins, single) then 1 else 0,
		cardCount = cardCount,
	}
end

function Cards.quantity(ctx: W.Context, parent: Instance, size: UDim2, at: UDim2, change: () -> ())
	local strip = Candy.frame(parent, "Quantity", size, at)
	local selector = { value = counts[1], buttons = {} :: { Candy.Control }, frame = strip }
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

-- the cards page; the pick level lives on the pick screen of the collection (PickCollection) [владелец 12.11:
-- «это объединить можно»]
function Cards.new(ctx: W.Context, cardsPage: Frame)
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

	local circle = Candy.text(cardsPage, "Circle", UDim2.new(0.53, 0, 0, 47), offset(2, 0), 20)
	circle.TextXAlignment = Enum.TextXAlignment.Left
	local cardCount =
		Cards.quantity(ctx, cardsPage, UDim2.new(0.36, 0, 0, 47), scale(0.64, 0), refreshCurrent)
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

	refresh = function(profile: any, front: number, animate: boolean)
		currentProfile, currentFront = profile, front
		local context = Circle.context(profile, Worlds.of(front).index)
		local locale = Strings.localeOf(ctx.player)
		circle.Text = t("menu_circle")

		for _, strip in { cardCount } do
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
