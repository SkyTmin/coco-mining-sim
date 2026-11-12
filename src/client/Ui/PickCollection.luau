--!strict
-- The pickaxe collection [владелец 12.11: «всё слиплось, ребёнку непонятно… нужно полное переосмысление»].
-- Rethought along common collection-screen rules: on a small screen show the list OR the details, not both; give each
-- item more room rather than showing more items; keep found and missing items together so the whole set is visible;
-- one clear main action in the details.
--   list    family tabs on top (Гроза · Динамит · Разлом · Мороз · Дерево); the chosen family's four rarities as four
--           big cards, ★ to ★★★★ left to right; each card: the pick on its rarity stage, level, copies, the way to the
--           golden one (three identical picks merge into one golden), «В руке» ribbon, a lock when missing
--   details tap a card: the whole page — the big pick on the left; name, rarity, power, what its perk does and one
--           main button on the right; «Назад» returns to the cards
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
	local refresh: (any) -> ()
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

	-- ── the details ──────────────────────────────────────────────────────────────────────────────────────────────
	local details = Candy.panel(page, "SelectedPick", scale(1, 1), offset(0, 0), true)
	details.Visible = false
	local back =
		Candy.button(details, "Back", UDim2.new(0.2, 0, 0, 36), offset(8, 8), "neutral", 15)
	W.bind(ctx, back, function()
		detailOpen = false
		if profile then
			refresh(profile)
		end
	end)
	local top = Candy.frame(details, "Overview", UDim2.new(0.47, -8, 1, -60), offset(8, 52))
	local icon = Candy.icon(top, "pickaxe", scale(0.94, 0.86), scale(0.03, 0.04))
	icon.ZIndex = 2
	local ribbon = Candy.frame(top, "InHand", scale(0.4, 0.09), scale(0.03, 0.03), W.green)
	Candy.round(ribbon, 8)
	Candy.stroke(ribbon, 2)
	ribbon.ZIndex = 3
	local ribbonText =
		Candy.text(ribbon, "Label", scale(0.9, 0.86), scale(0.05, 0.07), 14, Candy.white)
	ribbonText.ZIndex = 4

	local info =
		Candy.frame(details, "Info", UDim2.new(0.53, -16, 1, -16), UDim2.new(0.47, 8, 0, 8))
	local title = Candy.text(info, "Name", scale(1, 0.13), scale(0, 0.02), 28)
	local rarityText = Candy.text(info, "Rarity", scale(1, 0.08), scale(0, 0.16), 17)
	local _, strength =
		W.pill(info, "Power", scale(0.485, 0.11), scale(0, 0.27), Candy.panelColor, 15)
	local _, copies =
		W.pill(info, "Owned", scale(0.485, 0.11), scale(0.515, 0.27), Candy.panelColor, 15)
	local perkText = Candy.text(info, "Perk", scale(1, 0.2), scale(0, 0.41), 15)
	perkText.TextWrapped = true

	-- one main button (equip; the golden variant beside it when both exist; «from chest» when missing), one smaller
	-- below (merge into golden, or buy in the shop)
	local MAIN_Y, SUB_Y = -94, -44
	local equip = Candy.button(
		info,
		"Equip",
		UDim2.new(1, 0, 0, 44),
		UDim2.new(0, 0, 1, MAIN_Y),
		"confirm",
		17
	)
	local gold = Candy.button(
		info,
		"EquipGold",
		UDim2.new(0.49, 0, 0, 44),
		UDim2.new(0.51, 0, 1, MAIN_Y),
		"coin",
		16
	)
	local fromChest = Candy.button(
		info,
		"FindInChest",
		UDim2.new(1, 0, 0, 44),
		UDim2.new(0, 0, 1, MAIN_Y),
		"robux",
		16
	)
	local merge =
		Candy.button(info, "Merge", UDim2.new(1, 0, 0, 38), UDim2.new(0, 0, 1, SUB_Y), "coin", 15)
	local buy =
		Candy.button(info, "Buy", UDim2.new(1, 0, 0, 38), UDim2.new(0, 0, 1, SUB_Y), "coin", 15)
	Candy.buttonIcon(buy, "coin")
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

	refresh = function(current: any)
		profile = current
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
		-- details of the selected pick
		local id = selected :: string
		local config = Config.pickaxes[id]
		local family, rarity = config.family, config.rarity
		local entry = profile.collection[id] or { count = 0, golden = 0 }
		local count = entry.count + entry.golden
		local owned, equipped = count > 0 or id == "starter", profile.pickaxe == id
		local otherFamily = family ~= nil and family ~= profile.family
		local shop = family and rarity == "common" and not profile.boughtPickaxes[id]
		local shopRule = family and Config.families[family]
		primaryGold = entry.count == 0 and entry.golden > 0
		local _, power = levelOf(id, entry)
		canEquip = Family.canEquip(profile, id, primaryGold)
		canGold = Family.canEquip(profile, id, true)
		canMerge = id ~= "starter" and entry.count >= mergeNeed
		canBuy = shop == true
			and profile.deepestWorld >= shopRule.world
			and profile.coins >= shopRule.price

		PickStage.apply(top, tone(rarity), family, scale(1, 1), scale(0, 0), UDim.new(0, 12))
		W.pickIcon(icon, id)
		icon.ImageTransparency = if owned then 0 else 0.5
		back.text.Text = "← " .. t("menu_back")
		title.Text = W.pickName(t, id)
		rarityText.Text = if family
			then W.stars(rarity) .. " " .. t("menu_rarity_" .. rarity)
			else ""
		rarityText.TextColor3 = W.rarityText[tone(rarity)]
		strength.Text = t("menu_strength") .. " " .. Format.stat(power, locale)
		copies.Text = t("menu_have") .. " " .. Format.short(count)
		equipHelp = t("pick_counts", entry.count, entry.golden) .. "\n" .. perk(ctx, id)
		if otherFamily then
			equipHelp = t("family_next") .. " · " .. equipHelp
		end
		perkText.Text = if otherFamily and owned then t("family_next") else perk(ctx, id)

		-- «В руке» is a state, not an action: a ribbon on the picture, and no button saying it
		local twoVariants = entry.count > 0 and entry.golden > 0
		local inHandNow = equipped and profile.pickaxeGolden == primaryGold
		ribbon.Visible = equipped
		ribbonText.Text = "✓ " .. t("menu_in_hand")
		Candy.fit(
			equip.box,
			UDim2.new(if twoVariants then 0.49 else 1, 0, 0, 44),
			UDim2.new(0, 0, 1, MAIN_Y)
		)
		equip.box.Visible = owned and (twoVariants or not inHandNow)
		gold.box.Visible, fromChest.box.Visible = twoVariants, not owned
		equip.text.Text = if inHandNow then t("menu_in_hand") else t("menu_equip")
		gold.text.Text = (if equipped and profile.pickaxeGolden then "✓ " else "★ ")
			.. t("menu_gold")
		Candy.paint(
			equip,
			if not canEquip then "disabled" elseif inHandNow then "neutral" else "confirm"
		)
		Candy.paint(gold, if canGold then "coin" else "disabled")
		fromChest.text.Text = t("menu_from_chest")

		local showMerge, showShop = owned and id ~= "starter", shop == true
		merge.box.Visible, buy.box.Visible = showMerge, showShop
		local split = showMerge and showShop
		Candy.fit(
			merge.box,
			UDim2.new(if split then 0.49 else 1, 0, 0, 38),
			UDim2.new(0, 0, 1, SUB_Y)
		)
		Candy.fit(
			buy.box,
			UDim2.new(if split then 0.49 else 1, 0, 0, 38),
			UDim2.new(if split then 0.51 else 0, 0, 1, SUB_Y)
		)
		merge.text.Text = t("menu_merge_count", math.min(entry.count, mergeNeed))
		mergeHelp = t("menu_merge_tip") .. "\n" .. t("pick_counts", entry.count, entry.golden)
		Candy.paint(merge, if canMerge then "coin" else "disabled")
		if showShop then
			buy.text.Text = Format.short(shopRule.price)
			purchaseHelp = t("pick_shop", shopRule.world, Format.short(shopRule.price))
			Candy.paint(buy, if canBuy then "coin" else "disabled")
		end
	end
	return {
		refresh = refresh,
		-- QA: open the details of one pick
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
