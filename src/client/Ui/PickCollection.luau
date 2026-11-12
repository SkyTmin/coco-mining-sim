--!strict
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

function Collection.new(ctx: W.Context, page: Frame, showChest: () -> ())
	local t = ctx.t
	local intent = Remotes.event("PickaxeIntent")
	local filter = "all"
	local selected: string? = nil
	local profile: any
	local refresh: (any) -> ()
	local canEquip, canGold, canMerge, canBuy = false, false, false, false
	local primaryGold = false
	local mergeHelp, purchaseHelp, equipHelp = "", "", ""

	local list = Candy.frame(page, "PickList", UDim2.new(0.675, -5, 1, 0), offset(1, 0))
	local filters = {}
	local grid = W.scroll(list, "PickGrid", UDim2.new(1, 0, 1, -54), offset(0, 53))
	local content = Candy.frame(grid, "Tiles", UDim2.new(1, -5, 0, 0), offset(0, 1))
	local filterKeys = { "all" }
	for _, family in families do
		table.insert(filterKeys, family)
	end
	for index, family in filterKeys do
		local control = Candy.button(
			list,
			"Filter_" .. family,
			UDim2.new(0.2, -4, 0, 46),
			UDim2.new((index - 1) / 5, 2, 0, 0),
			"neutral",
			14
		)
		if family ~= "all" then
			local mark = Candy.frame(
				control.face,
				"FamilyColor",
				offset(8, 8),
				scale(0.075, 0.5),
				W.familyColors[family]
			)
			mark.AnchorPoint = Vector2.new(0, 0.5)
			Candy.round(mark, 0)
			Candy.stroke(mark, 1)
			Candy.fit(control.text, scale(0.81, 0.84), scale(0.16, 0.08))
		end
		filters[family] = control
		W.bind(ctx, control, function()
			if not profile or filter == family then
				return
			end
			filter = family
			local pick = selected and Config.pickaxes[selected]
			if filter ~= "all" and (not pick or pick.family ~= filter) then
				selected = Family.best(profile, filter) or (filter .. "_common")
			end
			grid.CanvasPosition = Vector2.zero
			refresh(profile)
		end)
	end

	local tiles = {}
	for _, id in ids do
		local pick = Config.pickaxes[id]
		local rarity = pick.rarity
		local tile =
			Candy.button(content, id, UDim2.new(0.25, -6, 0, 49), offset(0, 0), "neutral", 12)
		tile.text.Visible = false
		local stripe = W.band(tile.face, "Rarity", UDim2.new(1, -4, 0, 6), W.rarityColors[rarity])
		Candy.round(stripe, 3)
		-- a square cell on the left with a small rarity backdrop; the pick fills it [владелец 12.11: «мелкие»]
		local cell = Candy.frame(tile.face, "Cell", scale(0.3, 0.86), scale(0.02, 0.1))
		local square = Instance.new("UIAspectRatioConstraint")
		square.Parent = cell
		PickStage.apply(cell, rarity, pick.family, scale(1, 1), scale(0, 0), UDim.new(0, 8), true)
		local image = Candy.icon(cell, "pickaxe", scale(1, 1), scale(0, 0))
		image.ZIndex = 2
		W.pickIcon(image, id, 1.1)
		local stars = Candy.text(
			tile.face,
			"Stars",
			scale(0.61, 0.22),
			scale(0.34, 0.17),
			13,
			W.rarityText[rarity]
		)
		local name = Candy.text(tile.face, "Name", scale(0.63, 0.28), scale(0.34, 0.37), 13)
		local state = Candy.text(tile.face, "State", scale(0.57, 0.26), scale(0.34, 0.65), 11)
		stars.Text = W.stars(rarity)
		for _, label in { stars, name, state } do
			label.TextXAlignment = Enum.TextXAlignment.Left
		end
		local lock = Candy.icon(tile.face, "lock", offset(15, 15), UDim2.new(1, -17, 1, -16))
		local badge, count = W.badge(tile.face, W.green)
		-- [владелец 11.11: «стоит не ровно»] the count sits in the bottom-right corner, never over the pickaxe
		Candy.fit(badge, offset(27, 17), UDim2.new(1, -30, 1, -20))
		count.TextColor3 = Candy.ink
		tiles[id] = {
			control = tile,
			image = image,
			name = name,
			state = state,
			lock = lock,
			badge = badge,
			count = count,
			border = tile.face:FindFirstChildOfClass("UIStroke") :: UIStroke,
		}
		W.bind(ctx, tile, function()
			if profile then
				selected = id
				refresh(profile)
			end
		end, function()
			return W.pickName(t, id) .. " · " .. perk(ctx, id)
		end)
	end

	local details = Candy.panel(
		page,
		"SelectedPick",
		UDim2.new(0.325, -4, 1, -4),
		UDim2.new(0.675, 5, 0, 0),
		true
	)
	local top = Candy.frame(details, "Overview", UDim2.new(1, -10, 1, -133), offset(5, 3))
	local stripe = W.band(top, "Rarity", UDim2.new(1, -4, 0, 7), W.yellow)
	-- a card: the stage takes most of the height, the name and rarity sit on its dark bottom in white
	-- [владелец 12.11: «выглядит так себе» — the stage was a thin strip with a tiny pick]
	stripe.Visible = false
	local icon = Candy.icon(top, "pickaxe", scale(0.92, 0.6), scale(0.04, 0.02))
	icon.ZIndex = 2
	local title = Candy.text(top, "Name", scale(0.94, 0.12), scale(0.03, 0.6), 22, Candy.white)
	local rarityText = Candy.text(top, "Rarity", scale(0.94, 0.08), scale(0.03, 0.715), 15)
	for _, label in { title, rarityText } do
		label.ZIndex = 3
		Candy.stroke(label, 2.2, true)
	end
	local _, strength =
		W.pill(top, "Power", scale(0.47, 0.14), scale(0.02, 0.84), Candy.panelColor, 15)
	local _, copies =
		W.pill(top, "Owned", scale(0.47, 0.14), scale(0.51, 0.84), Candy.panelColor, 15)
	local perkText =
		Candy.text(details, "Perk", UDim2.new(0.93, 0, 0, 24), UDim2.new(0.035, 0, 1, -128), 13)
	local equip = Candy.button(
		details,
		"Equip",
		UDim2.new(0.94, 0, 0, 46),
		UDim2.new(0.03, 0, 1, -99),
		"confirm",
		16
	)
	local gold = Candy.button(
		details,
		"EquipGold",
		UDim2.new(0.45, 0, 0, 46),
		UDim2.new(0.52, 0, 1, -99),
		"coin",
		15
	)
	local fromChest = Candy.button(
		details,
		"FindInChest",
		UDim2.new(0.94, 0, 0, 46),
		UDim2.new(0.03, 0, 1, -99),
		"robux",
		15
	)
	local merge = Candy.button(
		details,
		"Merge",
		UDim2.new(0.94, 0, 0, 46),
		UDim2.new(0.03, 0, 1, -49),
		"coin",
		15
	)
	local buy = Candy.button(
		details,
		"Buy",
		UDim2.new(0.94, 0, 0, 46),
		UDim2.new(0.03, 0, 1, -49),
		"coin",
		15
	)
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

	refresh = function(current: any)
		profile = current
		local id = selected or profile.pickaxe
		selected = id
		local locale = Strings.localeOf(ctx.player)
		for family, control in filters do
			control.text.Text = t(if family == "all" then "menu_all" else "family_" .. family)
			Candy.paint(control, if filter == family then "coin" else "neutral")
		end
		local visible = 0
		for _, pickId in ids do
			local tile, config = tiles[pickId], Config.pickaxes[pickId]
			local show = filter == "all" or filter == config.family
			tile.control.box.Visible = show
			if not show then
				continue
			end
			Candy.move(
				tile.control.box,
				UDim2.new((visible % 4) / 4, 3, 0, (visible // 4) * 54 + 2)
			)
			visible += 1
			local entry = profile.collection[pickId]
			local count = if entry then entry.count + entry.golden else 0
			tile.name.Text = if pickId == "starter" then t("menu_wooden") else W.pickName(t, pickId)
			tile.state.Text = if count == 0
				then t("menu_missing")
				elseif profile.pickaxe == pickId then t("menu_in_hand")
				else t("upgrade_level", profile.circle.pickLevels[pickId] or 1)
			tile.image.ImageTransparency = if count == 0 then 0.55 else 0
			tile.lock.Visible, tile.badge.Visible = count == 0, count > 1
			tile.count.Text = "×" .. Format.short(count)
			tile.border.Color = if pickId == id
				then W.yellow
				elseif entry and entry.golden > 0 then Color3.fromHex("C48516")
				else Candy.ink
		end
		Candy.fit(content, UDim2.new(1, -5, 0, math.ceil(visible / 4) * 54 + 4), offset(0, 1))

		local config = Config.pickaxes[id]
		local family, rarity = config.family, config.rarity
		local entry = profile.collection[id] or { count = 0, golden = 0 }
		local count = entry.count + entry.golden
		local owned, equipped = count > 0, profile.pickaxe == id
		local otherFamily = family ~= nil and family ~= profile.family
		local shop = family and rarity == "common" and not profile.boughtPickaxes[id]
		local shopRule = family and Config.families[family]
		local mergeNeed = Config.familyRules.mergeNeed
		local rarityRule = Config.progress.rarities[rarity]
		primaryGold = entry.count == 0 and entry.golden > 0
		local displayGold = entry.golden > 0 and (not equipped or profile.pickaxeGolden == true)
		local level =
			math.min(profile.circle.pickLevels[id] or 1, Power.cap(rarityRule, displayGold))
		local power = Power.strength(rarityRule, level, profile.circle.cards, displayGold)
		canEquip = Family.canEquip(profile, id, primaryGold)
		canGold = Family.canEquip(profile, id, true)
		canMerge = id ~= "starter" and entry.count >= mergeNeed
		canBuy = shop == true
			and profile.deepestWorld >= shopRule.world
			and profile.coins >= shopRule.price

		W.pickIcon(icon, id)
		icon.ImageTransparency = if owned then 0 else 0.46
		PickStage.apply(
			top,
			rarity,
			family,
			UDim2.fromScale(1, 0.81),
			UDim2.fromScale(0, 0),
			UDim.new(0, 12)
		)
		stripe.BackgroundColor3 = W.rarityColors[rarity]
		title.Text = W.pickName(t, id)
		rarityText.Text = if family
			then W.stars(rarity) .. " " .. t("menu_rarity_" .. rarity)
			else ""
		rarityText.TextColor3 = W.rarityColors[rarity]:Lerp(Candy.white, 0.35)
		strength.Text = t("menu_strength") .. " " .. Format.stat(power, locale)
		copies.Text = t("menu_have") .. " " .. Format.short(count)
		equipHelp = t("pick_counts", entry.count, entry.golden) .. "\n" .. perk(ctx, id)
		if otherFamily then
			equipHelp = t("family_next") .. " · " .. equipHelp
		end
		perkText.Text = if otherFamily and owned then t("family_next") else perk(ctx, id)
		local twoVariants = entry.count > 0 and entry.golden > 0
		Candy.fit(
			equip.box,
			UDim2.new(if twoVariants then 0.45 else 0.94, 0, 0, 46),
			UDim2.new(0.03, 0, 1, -99)
		)
		equip.box.Visible, gold.box.Visible, fromChest.box.Visible = owned, twoVariants, not owned
		equip.text.Text = if equipped and profile.pickaxeGolden == primaryGold
			then t("menu_in_hand")
			else t("menu_equip")
		gold.text.Text = if equipped and profile.pickaxeGolden
			then t("menu_in_hand")
			else t("menu_gold")
		Candy.paint(
			equip,
			if not canEquip
				then "disabled"
				elseif equipped and profile.pickaxeGolden == primaryGold then "robux"
				else "confirm"
		)
		Candy.paint(gold, if canGold then "coin" else "disabled")
		fromChest.text.Text = t("menu_from_chest")

		local showMerge, showShop = owned and id ~= "starter", shop == true
		merge.box.Visible, buy.box.Visible = showMerge, showShop
		local split = showMerge and showShop
		Candy.fit(
			merge.box,
			UDim2.new(if split then 0.45 else 0.94, 0, 0, 46),
			UDim2.new(0.03, 0, 1, -49)
		)
		Candy.fit(
			buy.box,
			UDim2.new(if split then 0.45 else 0.94, 0, 0, 46),
			UDim2.new(if split then 0.52 else 0.03, 0, 1, -49)
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
	return { refresh = refresh }
end

return Collection
