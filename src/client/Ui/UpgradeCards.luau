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

	-- the page grid (W.HEAD / W.BODY): the title on the left of the header row, ×1 / ×10 / max on its right; four
	-- upgrade cards below
	local circle = Candy.text(cardsPage, "Circle", scale(0.5, W.HEAD), scale(0, 0), 20)
	circle.TextXAlignment = Enum.TextXAlignment.Left
	local header = Candy.frame(cardsPage, "Header", UDim2.new(1, -W.CLOSE, W.HEAD, 0), scale(0, 0))
	local cardCount = Cards.quantity(ctx, header, scale(0.4, 1), scale(0.6, 0), refreshCurrent)
	Candy.fit(cardCount.frame, scale(0.42, 1), scale(0.58, 0))
	local countBoxes = {}
	for _, button in cardCount.buttons do
		table.insert(countBoxes, button.box)
	end
	W.row(countBoxes, UDim.new(0, 0), UDim.new(1, 0))
	local grid = Candy.frame(cardsPage, "UpgradeCards", scale(1, 1 - W.BODY), scale(0, W.BODY))
	local controls = {}
	local boxes = {}
	for _, id in Upgrade.cards do
		local card = W.upgradeCard(grid, id, cardColors[id], id)
		table.insert(boxes, card.box)
		local view = {
			icon = card.icon,
			title = card.name,
			hint = "",
			level = card.level,
			value = card.value,
			buy = card.buy,
			quote = nil :: Upgrade.Quote?,
			help = "",
			previous = nil :: number?,
		}
		controls[id] = view
		W.bind(ctx, card.buy, function()
			if currentProfile and Upgrade.pay(currentProfile.coins, view.quote) then
				remote:FireServer("BuyCard", id, cardCount.value)
			end
		end, function()
			return view.help
		end)
	end
	W.row(boxes, UDim.new(0, 0), UDim.new(1, 0), nil, W.CARD_GAP)

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
			view.title.Text, view.hint = t("card_" .. id), t("menu_card_" .. id)
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
			view.help = view.hint .. " · " .. t("menu_circle_tip")
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
