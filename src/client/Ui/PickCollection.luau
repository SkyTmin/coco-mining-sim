--!strict
-- The pickaxe collection [владелец 12.11: «всё слиплось, ребёнку непонятно… нужно полное переосмысление»].
-- Rethought along common collection-screen rules: on a small screen show the list OR the details, not both; give each
-- item more room rather than showing more items; keep found and missing items together so the whole set is visible;
-- one clear main action in the details.
--   list    family tabs on top (Гроза · Динамит · Разлом · Мороз · Дерево); the chosen family's four rarities as four
--           big cards, ★ to ★★★★ left to right; each card: the pick on its rarity stage, level, copies, the way to the
--           golden one (three identical picks merge into one golden), «В руке» ribbon, a lock when missing
--   pick    tap a card: the whole page — the big pick on the left; name, rarity, level, power, what its perk does
--           and the actions on the right (in the hand: buy levels; otherwise «В руку»); «Все кирки» returns to the cards
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Family = require(Shared.Play.Family)
local Power = require(Shared.Play.Power)
local Format = require(Shared.Format)
local Strings = require(Shared.Strings)
local Remotes = require(Shared.Remotes)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)
local PickStage = require(script.Parent.PickStage)
local UpgradeCards = require(script.Parent.UpgradeCards)
local Circle = require(Shared.Play.Circle)
local Upgrade = require(Shared.Play.Upgrade)
local Worlds = require(Shared.Mine.Worlds)
local RewardBurst = require(script.Parent.Parent.Fx.RewardBurst)
-- burst size by pickaxe rarity [решение]
local RARITY_POWER = { common = 0.35, rare = 0.55, epic = 0.78, legendary = 1 }

local Collection = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local rarities = Config.familyRules.rarities
local families = Config.familyRules.order
local ids = {}
for _, family in families do
	for _, rarity in rarities do
		table.insert(ids, family .. "_" .. rarity)
	end
end
local total = #ids
table.insert(ids, "starter")

function Collection.owned(profile: any): { [string]: boolean }
	local owned = {}
	for _, id in ids do
		local entry = profile.collection[id]
		if id ~= "starter" and entry and entry.count + entry.golden > 0 then
			owned[id] = true
		end
	end
	return owned
end

Collection.total = total

local function perk(ctx: W.Context, id: string): string
	local pick = Config.pickaxes[id]
	if not pick.family then
		return ctx.t("pick_starter")
	end
	local rule = Config.families[pick.family].perks[pick.rarity]
	local first = if pick.family == "frost"
		then rule.every
		else Format.stat(rule.chance * 100, Strings.localeOf(ctx.player))
	return ctx.t("menu_perk_" .. pick.family, first, rule.size)
end

-- the wooden starter is rarity "wood" in the config and "starter" in the colour tables
local function tone(rarity: string): string
	return if rarity == "wood" then "starter" else rarity
end

type Card = {
	control: Candy.Control,
	stage: Frame,
	image: ImageLabel,
	stars: TextLabel,
	rarity: TextLabel,
	level: TextLabel,
	count: TextLabel,
	ribbon: Frame,
	ribbonText: TextLabel,
	lock: ImageLabel,
	track: Frame,
	bar: Frame,
	barText: TextLabel,
	border: UIStroke,
}

function Collection.new(ctx: W.Context, page: Frame, showChest: () -> ())
	local t = ctx.t
	local intent = Remotes.event("PickaxeIntent")
	local GAP = 8
	local tab: string? = nil -- a family id or "starter"
	local selected: string? = nil
	local detailOpen = false
	local profile: any
	local refresh: (any, number?, boolean?) -> ()
	local front = 0
	local previousPick: string? = nil
	local previousLevel: number? = nil
	local canEquip, canGold, canMerge, canBuy = false, false, false, false
	local primaryGold = false
	local mergeHelp, purchaseHelp, equipHelp = "", "", ""
	local mergeNeed = Config.familyRules.mergeNeed

	-- ── the list ─────────────────────────────────────────────────────────────────────────────────────────────────
	local list = Candy.frame(page, "PickList", scale(1, 1), offset(0, 0))
	local tabKeys = table.clone(families)
	table.insert(tabKeys, "starter")
	local tabs = {}
	for index, key in tabKeys do
		local control = Candy.button(
			list,
			"Tab_" .. key,
			UDim2.new(1 / #tabKeys, -GAP, 0.13, 0),
			UDim2.new((index - 1) / #tabKeys, GAP / 2, 0, 0),
			"neutral",
			15
		)
		local dot = Candy.frame(
			control.face,
			"Dot",
			offset(12, 12),
			scale(0.1, 0.5),
			if key == "starter" then W.rarityColors.starter else W.familyColors[key]
		)
		dot.AnchorPoint = Vector2.new(0, 0.5)
		Candy.round(dot, 0)
		Candy.stroke(dot, 2)
		Candy.fit(control.text, scale(0.72, 0.8), scale(0.24, 0.1))
		tabs[key] = control
		W.bind(ctx, control, function()
			if profile and tab ~= key then
				tab = key
				refresh(profile)
			end
		end)
	end

	local chain =
		Candy.frame(list, "Chain", UDim2.new(1, 0, 0.87, -GAP - 22), UDim2.new(0, 0, 0.13, GAP))
	local hint = Candy.text(list, "Hint", UDim2.new(1, 0, 0, 20), UDim2.new(0, 0, 1, -20), 13)
	hint.TextColor3 = Color3.fromHex("6B6F8C")

	local cards: { Card } = {}
	for c = 1, 4 do
		local control = Candy.button(
			chain,
			"Card" .. c,
			UDim2.new(0.25, -GAP, 1, 0),
			UDim2.new((c - 1) / 4, GAP / 2, 0, 0),
			"neutral",
			12
		)
		control.text.Visible = false
		local stage =
			Candy.frame(control.face, "StageHolder", UDim2.new(1, -10, 0.72, -5), offset(5, 5))
		local image = Candy.icon(stage, "pickaxe", scale(0.94, 0.78), scale(0.03, 0.02))
		image.ZIndex = 2
		-- stars and the rarity name on two lines: «★★★★ Легендарная» on one line shrank to unreadable
		local stars =
			Candy.text(stage, "Stars", scale(0.94, 0.11), scale(0.03, 0.69), 14, Candy.white)
		stars.ZIndex = 3
		Candy.stroke(stars, 2, true)
		local rarity =
			Candy.text(stage, "Rarity", scale(0.94, 0.15), scale(0.03, 0.81), 14, Candy.white)
		rarity.ZIndex = 3
		Candy.stroke(rarity, 2, true)
		local ribbon = Candy.frame(stage, "InHand", scale(0.62, 0.13), scale(0.03, 0.03), W.green)
		Candy.round(ribbon, 8)
		Candy.stroke(ribbon, 2)
		ribbon.ZIndex = 3
		local ribbonText =
			Candy.text(ribbon, "Label", scale(0.9, 0.86), scale(0.05, 0.07), 13, Candy.white)
		ribbonText.ZIndex = 4
		local lock = Candy.icon(stage, "lock", offset(34, 34), UDim2.new(0.5, -17, 0.4, -17))
		lock.ZIndex = 3
		local level = Candy.text(control.face, "Level", scale(0.5, 0.1), scale(0.06, 0.745), 15)
		level.TextXAlignment = Enum.TextXAlignment.Left
		local count = Candy.text(control.face, "Count", scale(0.4, 0.1), scale(0.54, 0.745), 15)
		count.TextXAlignment = Enum.TextXAlignment.Right
		-- the way to the golden pick: three identical merge into one golden
		local track = Candy.frame(
			control.face,
			"ToGold",
			scale(0.88, 0.1),
			scale(0.06, 0.865),
			Color3.fromHex("E4D6BD")
		)
		Candy.round(track, 0)
		Candy.stroke(track, 2)
		local bar = Candy.frame(track, "Fill", scale(0, 1), scale(0, 0), Color3.fromHex("FFC83D"))
		Candy.round(bar, 0)
		local barText = Candy.text(track, "Label", scale(0.96, 0.86), scale(0.02, 0.07), 12)
		barText.ZIndex = 3
		local card: Card = {
			control = control,
			stage = stage,
			image = image,
			stars = stars,
			rarity = rarity,
			level = level,
			count = count,
			ribbon = ribbon,
			ribbonText = ribbonText,
			lock = lock,
			track = track,
			bar = bar,
			barText = barText,
			border = control.face:FindFirstChildOfClass("UIStroke") :: UIStroke,
		}
		cards[c] = card
		W.bind(ctx, control, function()
			local id = control.box:GetAttribute("Pick")
			if profile and type(id) == "string" then
				selected, detailOpen = id, true
				refresh(profile)
			end
		end, function()
			local id = control.box:GetAttribute("Pick")
			return if type(id) == "string"
				then W.pickName(t, id) .. " · " .. perk(ctx, id)
				else nil
		end)
	end

	-- ── the pick screen ──────────────────────────────────────────────────────────────────────────────────────────
	-- [владелец 12.11: «тут ужасно… это объединить можно»] one screen for a pick: the old «Кирка» upgrade page and the
	-- collection details are the same thing — a big picture on the left, facts and actions on the right. When the pick
	-- is in the hand, its level is bought right here; otherwise the main action is «В руку». Everything on the right is
	-- laid out in shares of the height, so a short phone page never pushes buttons over the text.
	local details = Candy.frame(page, "SelectedPick", scale(1, 1), offset(0, 0))
	details.Visible = false
	local top = Candy.frame(details, "Overview", scale(0.44, 1), scale(0, 0))
	local icon = Candy.icon(top, "pickaxe", scale(0.9, 0.74), scale(0.05, 0.12))
	icon.ZIndex = 2
	local ribbon = Candy.frame(top, "InHand", scale(0.5, 0.12), scale(0.25, 0.85), W.green)
	Candy.round(ribbon, 8)
	Candy.stroke(ribbon, 2)
	ribbon.ZIndex = 3
	local ribbonText =
		Candy.text(ribbon, "Label", scale(0.9, 0.86), scale(0.05, 0.07), 14, Candy.white)
	ribbonText.ZIndex = 4
	local copiesBadge =
		Candy.frame(top, "Copies", offset(54, 28), UDim2.new(1, -60, 0, 6), Candy.panelColor)
	Candy.round(copiesBadge, 0)
	Candy.stroke(copiesBadge, 2)
	copiesBadge.ZIndex = 3
	local copiesText = Candy.text(copiesBadge, "Label", scale(0.9, 0.84), scale(0.05, 0.08), 15)
	copiesText.ZIndex = 4
	local back = Candy.button(details, "Back", offset(122, 34), offset(6, 6), "neutral", 14)
	W.bind(ctx, back, function()
		detailOpen = false
		if profile then
			refresh(profile)
		end
	end)

	local info = Candy.frame(details, "Info", UDim2.new(0.56, -10, 1, 0), UDim2.new(0.44, 10, 0, 0))
	local function at(x: number, y: number, w: number, h: number): (UDim2, UDim2)
		return UDim2.new(w, -4, h, -4), UDim2.new(x, 2, y, 2)
	end
	local title = Candy.text(info, "Name", scale(1, 0.13), scale(0, 0), 26)
	local rarityText = Candy.text(info, "Rarity", scale(1, 0.08), scale(0, 0.13), 15)
	local levelBox, levelPill =
		W.pill(info, "Level", scale(0.38, 0.12), scale(0, 0.23), Candy.panelColor, 15)
	local powerBox, powerPill =
		W.pill(info, "Power", scale(0.6, 0.12), scale(0.4, 0.23), Candy.panelColor, 15)
	Candy.fit(levelBox, at(0, 0.22, 0.38, 0.13))
	Candy.fit(powerBox, at(0.38, 0.22, 0.62, 0.13))
	local perkText = Candy.text(info, "Perk", scale(1, 0.12), scale(0, 0.36), 14)
	perkText.TextWrapped = true

	-- in the hand: how many levels (×1 / ×10 / max) and the big «Улучшить»
	local quantity = UpgradeCards.quantity(ctx, info, scale(1, 0.13), scale(0, 0.49), function()
		if profile then
			refresh(profile)
		end
	end)
	Candy.fit(quantity.frame, at(0, 0.49, 1, 0.14))
	local improve = Candy.button(info, "BuyPick", scale(1, 0.2), scale(0, 0.63), "coin", 19)
	Candy.fit(improve.box, at(0, 0.63, 1, 0.21))
	Candy.buttonIcon(improve, "coin")
	-- not in the hand: one big «В руку» (with the golden copy beside it), or «из сундука» when missing
	local equip = Candy.button(info, "Equip", scale(1, 0.3), scale(0, 0.52), "confirm", 19)
	local gold = Candy.button(info, "EquipGold", scale(0.5, 0.3), scale(0.5, 0.52), "coin", 17)
	local fromChest = Candy.button(info, "FindInChest", scale(1, 0.3), scale(0, 0.52), "robux", 17)
	Candy.fit(fromChest.box, at(0, 0.5, 1, 0.33))
	-- the small row at the bottom: merge into golden, swap plain / golden, width, buy in the shop
	local merge = Candy.button(info, "Merge", scale(1, 0.15), scale(0, 0.85), "coin", 14)
	local swap = Candy.button(info, "Swap", scale(1, 0.15), scale(0, 0.85), "coin", 14)
	local width = Candy.button(info, "BuyWidth", scale(1, 0.15), scale(0, 0.85), "neutral", 14)
	Candy.buttonIcon(width, "width")
	local buy = Candy.button(info, "Buy", scale(1, 0.15), scale(0, 0.85), "coin", 14)
	Candy.buttonIcon(buy, "coin")
	local bottomRow = { merge, swap, width, buy }

	local upgradeRemote = Remotes.event("UpgradeIntent")
	local pickQuote: Upgrade.Quote? = nil
	local widthQuote: Upgrade.Quote? = nil
	local improveHelp, widthHelp = "", ""
	W.bind(ctx, improve, function()
		if profile and Upgrade.pay(profile.coins, pickQuote) then
			upgradeRemote:FireServer("BuyPickLevel", quantity.value)
		end
	end, function()
		return improveHelp
	end)
	W.bind(ctx, width, function()
		if profile and Upgrade.pay(profile.coins, widthQuote) then
			upgradeRemote:FireServer("BuyWidth")
		end
	end, function()
		return widthHelp
	end)
	W.bind(ctx, equip, function()
		if canEquip and selected then
			intent:FireServer("Equip", selected, primaryGold)
		end
	end, function()
		return equipHelp
	end)
	W.bind(ctx, gold, function()
		if canGold and selected then
			intent:FireServer("Equip", selected, true)
		end
	end, function()
		return t("menu_gold") .. " · " .. equipHelp
	end)
	W.bind(ctx, swap, function()
		if selected and profile then
			local golden = not profile.pickaxeGolden
			if Family.canEquip(profile, selected, golden) then
				intent:FireServer("Equip", selected, golden)
			end
		end
	end)
	W.bind(ctx, fromChest, showChest)
	W.bind(ctx, merge, function()
		if canMerge and selected then
			intent:FireServer("Merge", selected)
		end
	end, function()
		return mergeHelp
	end)
	W.bind(ctx, buy, function()
		if canBuy and selected then
			intent:FireServer("BuyPick", Config.pickaxes[selected].family)
		end
	end, function()
		return purchaseHelp
	end)

	local function levelOf(id: string, entry: any): (number, number)
		local config = Config.pickaxes[id]
		local rarityRule = Config.progress.rarities[config.rarity]
		local equipped = profile.pickaxe == id
		local displayGold = entry.golden > 0 and (not equipped or profile.pickaxeGolden == true)
		local level =
			math.min(profile.circle.pickLevels[id] or 1, Power.cap(rarityRule, displayGold))
		return level, Power.strength(rarityRule, level, profile.circle.cards, displayGold)
	end

	refresh = function(current: any, newFront: number?, animate: boolean?)
		profile = current
		front = newFront or front
		local locale = Strings.localeOf(ctx.player)
		if not tab then
			local held = Config.pickaxes[profile.pickaxe]
			tab = if held and held.family then held.family else (profile.family or families[1])
		end
		list.Visible, details.Visible = not detailOpen, detailOpen

		-- tabs
		for key, control in tabs do
			control.text.Text = t(if key == "starter" then "menu_wooden" else "family_" .. key)
			Candy.paint(control, if tab == key then "coin" else "neutral")
		end
		hint.Text = t("menu_tap_pick")

		-- the four cards of the chosen family (one centred card for the wooden starter)
		local shown = {}
		if tab == "starter" then
			table.insert(shown, "starter")
		else
			for _, rarity in rarities do
				table.insert(shown, (tab :: string) .. "_" .. rarity)
			end
		end
		for c, card in cards do
			local id = shown[c]
			card.control.box.Visible = id ~= nil
			if not id then
				continue
			end
			Candy.move(
				card.control.box,
				UDim2.new(if tab == "starter" then 0.375 else (c - 1) / 4, GAP / 2, 0, 0)
			)
			card.control.box:SetAttribute("Pick", id)
			local config = Config.pickaxes[id]
			local entry = profile.collection[id] or { count = 0, golden = 0 }
			local owned = entry.count + entry.golden > 0 or id == "starter"
			local inHand = profile.pickaxe == id
			PickStage.apply(
				card.stage,
				tone(config.rarity),
				config.family,
				scale(1, 1),
				scale(0, 0),
				UDim.new(0, 10)
			)
			W.pickIcon(card.image, id)
			card.image.ImageTransparency = if owned then 0 else 0.62
			card.lock.Visible = not owned
			card.stars.Text = if config.family then W.stars(config.rarity) else ""
			card.stars.TextColor3 = Color3.fromHex("FFD84A")
			card.rarity.Text = if config.family
				then t("menu_rarity_" .. config.rarity)
				else t("menu_wooden")
			card.rarity.TextColor3 = W.rarityColors[tone(config.rarity)]:Lerp(Candy.white, 0.45)
			card.ribbon.Visible = inHand
			card.ribbonText.Text = "✓ " .. t("menu_in_hand")
			local level = levelOf(id, entry)
			card.level.Text = if owned then t("upgrade_level", level) else t("menu_missing")
			card.count.Text = if owned and id ~= "starter"
				then "×" .. Format.short(entry.count + entry.golden)
				else ""
			local toGold = if id == "starter" then 0 else math.min(entry.count, mergeNeed)
			card.track.Visible = id ~= "starter"
			Candy.fit(card.bar, scale(toGold / mergeNeed, 1), scale(0, 0))
			card.barText.Text = if toGold >= mergeNeed
				then t("menu_merge_ready")
				elseif entry.golden > 0 then "★ " .. t("menu_gold") .. " ×" .. Format.short(
					entry.golden
				)
				else t("menu_to_gold", toGold)
			card.border.Color = if entry.golden > 0 then Color3.fromHex("E0A21A") else Candy.ink
			card.border.Thickness = if entry.golden > 0 then 4 else 2
		end

		if not detailOpen or not selected then
			return
		end
		-- the pick screen
		local id = selected :: string
		local config = Config.pickaxes[id]
		local family, rarity = config.family, config.rarity
		local entry = profile.collection[id] or { count = 0, golden = 0 }
		local count = entry.count + entry.golden
		local owned, equipped = count > 0 or id == "starter", profile.pickaxe == id
		local goldenInHand = equipped and profile.pickaxeGolden == true
		local otherFamily = family ~= nil and family ~= profile.family
		local shop = family and rarity == "common" and not profile.boughtPickaxes[id]
		local shopRule = family and Config.families[family]
		local twoVariants = entry.count > 0 and entry.golden > 0
		primaryGold = entry.count == 0 and entry.golden > 0
		canEquip = Family.canEquip(profile, id, primaryGold)
		canGold = Family.canEquip(profile, id, true)
		canMerge = id ~= "starter" and entry.count >= mergeNeed
		canBuy = shop == true
			and profile.deepestWorld >= shopRule.world
			and profile.coins >= shopRule.price
		local level, power = levelOf(id, entry)
		local displayGold = entry.golden > 0 and (not equipped or goldenInHand)
		local cap = Power.cap(Config.progress.rarities[rarity], displayGold)

		-- the picture
		PickStage.apply(top, tone(rarity), family, scale(1, 1), scale(0, 0), UDim.new(0, 12))
		W.pickIcon(icon, id)
		icon.ImageTransparency = if owned then 0 else 0.5
		back.text.Text = "← " .. t("menu_all_picks")
		ribbon.Visible = equipped
		ribbonText.Text = "✓ " .. t("menu_in_hand")
		copiesBadge.Visible = owned and id ~= "starter"
		copiesText.Text = "×" .. Format.short(count)

		-- the facts
		title.Text = W.pickName(t, id)
		rarityText.Text = (
			if family then W.stars(rarity) .. " " .. t("menu_rarity_" .. rarity) else ""
		) .. (if displayGold then "  · ★ " .. t("menu_gold") else "")
		rarityText.TextColor3 = W.rarityText[tone(rarity)]
		levelPill.Text = if owned
			then t("upgrade_level", t("menu_fraction", level, cap))
			else t("menu_missing")
		equipHelp = t("pick_counts", entry.count, entry.golden) .. "\n" .. perk(ctx, id)
		if otherFamily then
			equipHelp = t("family_next") .. " · " .. equipHelp
		end
		perkText.Text = if otherFamily and owned then t("family_next") else perk(ctx, id)

		-- in the hand: the level is bought here
		quantity.frame.Visible, improve.box.Visible = equipped, equipped
		local nextWidth: any = nil
		if equipped then
			local context = Circle.context(profile, Worlds.of(front).index)
			local current = Circle.pick(context.pick, profile.circle, front, profile)
			pickQuote = Upgrade.quote(context, { kind = "pick", count = quantity.value })
			local single = pickQuote or Upgrade.quote(context, { kind = "pick", count = 1 })
			local nextPick = if single
				then UpgradeCards.pickAt(profile, front, single.level)
				else current
			powerPill.Text = t(
				"menu_strength_change",
				Format.stat(current.strength, locale),
				Format.stat(nextPick.strength, locale)
			)
			improve.text.Text = if single
				then t("menu_improve") .. "  " .. Format.short(single.price)
				else t("upgrade_cap")
			Candy.paint(
				improve,
				if Upgrade.pay(context.coins, pickQuote) then "coin" else "disabled"
			)
			improveHelp = t(
				"upgrade_pick_preview",
				Format.stat(current.strength, locale),
				Format.stat(nextPick.strength, locale),
				Format.short(current.ultLayers),
				Format.short(nextPick.ultLayers)
			)
			for index, button in quantity.buttons do
				local amount = UpgradeCards.counts[index]
				button.text.Text = if amount == "max"
					then t("upgrade_max")
					else "×" .. tostring(amount)
				Candy.paint(button, if quantity.value == amount then "coin" else "neutral")
			end
			nextWidth = Upgrade.nextWidth(context.width)
			widthQuote = Upgrade.quote(context, { kind = "width", count = 1 })
			width.text.Text = if widthQuote
				then Format.short(widthQuote.price)
				else t("menu_world", nextWidth and nextWidth.world)
			widthHelp = t("upgrade_width")
				.. " · "
				.. tostring(context.width)
				.. (if nextWidth then " → " .. tostring(nextWidth.w) else "")
			Candy.paint(
				width,
				if Upgrade.pay(context.coins, widthQuote) then "coin" else "disabled"
			)
			-- a level bought: the same burst as the skills, sized by rarity [владелец 11.11]
			if
				animate
				and previousPick == id
				and previousLevel
				and context.pickLevel > previousLevel
			then
				W.bump(icon, ctx, true)
				RewardBurst.show({
					icon = "pickaxe",
					palette = RewardBurst.palettes[rarity] or RewardBurst.palettes.common,
					power = RARITY_POWER[rarity] or 0.35,
					kicker = t("burst_pick_up"),
					title = W.pickName(t, id),
					subtitle = t("burst_level", context.pickLevel),
					decorate = function(slot: ImageLabel)
						W.pickIcon(slot, id)
					end,
				})
			end
			previousPick, previousLevel = id, context.pickLevel
		else
			powerPill.Text = t("menu_strength") .. " " .. Format.stat(power, locale)
			widthQuote = nil
		end

		-- not in the hand: «В руку» (and the golden copy beside it), or «из сундука» when missing
		local showEquip = owned and not equipped
		equip.box.Visible = showEquip
		gold.box.Visible = showEquip and twoVariants
		fromChest.box.Visible = not owned
		Candy.fit(equip.box, at(0, 0.5, if twoVariants then 0.5 else 1, 0.33))
		Candy.fit(gold.box, at(0.5, 0.5, 0.5, 0.33))
		equip.text.Text = t("menu_equip")
		gold.text.Text = "★ " .. t("menu_gold")
		Candy.paint(equip, if canEquip then "confirm" else "disabled")
		Candy.paint(gold, if canGold then "coin" else "disabled")
		fromChest.text.Text = t("menu_from_chest")

		-- the bottom row: only what applies, sharing the width
		merge.box.Visible = owned and id ~= "starter"
		merge.text.Text = t("menu_merge_count", math.min(entry.count, mergeNeed))
		mergeHelp = t("menu_merge_tip") .. "\n" .. t("pick_counts", entry.count, entry.golden)
		Candy.paint(merge, if canMerge then "coin" else "disabled")
		swap.box.Visible = equipped and twoVariants
		swap.text.Text = if goldenInHand then t("menu_not_gold") else "★ " .. t("menu_gold")
		Candy.paint(swap, if goldenInHand then "neutral" else "coin")
		width.box.Visible = equipped and (widthQuote ~= nil or nextWidth ~= nil)
		buy.box.Visible = shop == true
		if shop then
			buy.text.Text = Format.short(shopRule.price)
			purchaseHelp = t("pick_shop", shopRule.world, Format.short(shopRule.price))
			Candy.paint(buy, if canBuy then "coin" else "disabled")
		end
		local shown = {}
		for _, button in bottomRow do
			if button.box.Visible then
				table.insert(shown, button)
			end
		end
		for index, button in shown do
			Candy.fit(button.box, at((index - 1) / #shown, 0.85, 1 / #shown, 0.15))
		end
	end
	return {
		refresh = refresh,
		-- back to the cards (entering «Кирки» from the rail or the hub)
		showList = function()
			detailOpen = false
		end,
		-- open the pick screen of one pick (the dock button opens the one in the hand; QA)
		open = function(id: string)
			if Config.pickaxes[id] then
				tab, selected, detailOpen = Config.pickaxes[id].family or "starter", id, true
				if profile then
					refresh(profile)
				end
			end
		end,
	}
end

return Collection
