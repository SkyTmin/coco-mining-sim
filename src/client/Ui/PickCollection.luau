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
local TweenService = game:GetService("TweenService")
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
local ProfileState = require(script.Parent.Parent.ProfileState)
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
		return ctx.t("pick_starter_lore")
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
	dim: Frame,
	stars: TextLabel,
	rarity: TextLabel,
	level: TextLabel,
	count: TextLabel,
	ribbon: Frame,
	ribbonText: TextLabel,
	badge: Frame,
	badgeText: TextLabel,
	lock: ImageLabel,
	border: UIStroke,
	tween: Tween?,
}

function Collection.new(ctx: W.Context, page: Frame, showChest: () -> ())
	local t = ctx.t
	local intent = Remotes.event("PickaxeIntent")
	-- start building every pick's model now, long before the player opens the collection
	W.warmPicks(ids)
	local tab: string? = nil -- a family id or "starter"
	local selected: string? = nil
	local detailOpen = false
	local profile: any
	local refresh: (any, number?, boolean?, boolean?) -> ()
	local front = 0
	local previousPick: string? = nil
	local previousLevel: number? = nil
	local canEquip, canGold, canMerge, canBuy = false, false, false, false
	local primaryGold = false
	local mergeHelp, purchaseHelp, equipHelp = "", "", ""
	local mergeNeed = Config.familyRules.mergeNeed

	-- ── the list ─────────────────────────────────────────────────────────────────────────────────────────────────
	-- [владелец 13.11: «карточки слиплись, взгляд цепляется за всё сразу»] hierarchy, top to bottom:
	--   tabs   quiet labels on the panel, only the chosen one is a solid pill (navigation must not compete with items)
	--   cards  white cards on the darker window, 12 apart: the pick on its rarity stage is the whole message; under it
	--          one line — level and copies. Found / missing reads at once: a missing pick is a dark silhouette on a
	--          dimmed stage with a lock (the shape promises, the colours reward). Actions show only when they exist:
	--          «Слить!» on the stage when three copies wait, a gold rim for a golden copy, «✓ В руке» for the held one
	--   «Кремнёвка», the starter, is not a family: its tab opens its own screen, with its story
	local list = Candy.frame(page, "PickList", scale(1, 1), offset(0, 0))
	local tabKeys = table.clone(families)
	table.insert(tabKeys, "starter")
	local tabs = {}
	local tabBoxes = {}
	-- the row stops short of the window's close button in the top-right corner
	local tabRow = Candy.frame(list, "Tabs", UDim2.new(1, -W.CLOSE, W.HEAD, 0), offset(0, 0))
	for _, key in tabKeys do
		local control =
			Candy.button(tabRow, "Tab_" .. key, scale(0.2, 1), scale(0, 0), "neutral", 15)
		local dot = Candy.frame(
			control.face,
			"Dot",
			offset(12, 12),
			scale(0.08, 0.5),
			if key == "starter" then W.rarityColors.starter else W.familyColors[key]
		)
		dot.AnchorPoint = Vector2.new(0, 0.5)
		Candy.round(dot, 0)
		Candy.stroke(dot, 2)
		Candy.fit(control.text, scale(0.74, 0.8), scale(0.22, 0.1))
		tabs[key] = control
		table.insert(tabBoxes, control.box)
		W.bind(ctx, control, function()
			if not profile then
				return
			end
			if key == "starter" then
				selected, detailOpen = "starter", true
				refresh(profile)
			elseif tab ~= key then
				tab = key
				refresh(profile, nil, nil, true)
			end
		end)
	end
	-- «Кремнёвка» is the longest name: its tab gets a little more room so every label keeps one size
	W.row(tabBoxes, UDim.new(0, 0), UDim.new(1, 0), { 1, 1, 1, 1, 1.3 })

	local CARD_GAP = W.CARD_GAP
	local chain = Candy.frame(list, "Chain", UDim2.new(1, 0, 1 - W.BODY, -24), scale(0, W.BODY))
	local hint = Candy.text(list, "Hint", UDim2.new(1, 0, 0, 18), UDim2.new(0, 0, 1, -18), 13)
	hint.TextColor3 = Color3.fromHex("6A6480")

	local cards: { Card } = {}
	for c = 1, 4 do
		local control = Candy.button(chain, "Card" .. c, scale(0.25, 1), scale(0, 0), "neutral", 12)
		control.text.Visible = false
		local stage =
			Candy.frame(control.face, "StageHolder", UDim2.new(1, -12, 0.8, -8), offset(6, 6))
		local image = Candy.icon(stage, "pickaxe", scale(0.94, 0.72), scale(0.03, 0.04))
		image.ZIndex = 2
		local dim = Candy.frame(stage, "Dim", scale(1, 1), scale(0, 0), Candy.ink)
		dim.BackgroundTransparency, dim.ZIndex = 0.45, 2
		Candy.round(dim, 10)
		local stars =
			Candy.text(stage, "Stars", scale(0.94, 0.1), scale(0.03, 0.74), 14, Candy.white)
		stars.ZIndex = 3
		Candy.stroke(stars, 2, true)
		local rarity =
			Candy.text(stage, "Rarity", scale(0.94, 0.14), scale(0.03, 0.84), 14, Candy.white)
		rarity.ZIndex = 3
		Candy.stroke(rarity, 2, true)
		local ribbon =
			Candy.frame(stage, "InHand", UDim2.new(0.62, 0, 0, 24), offset(6, 6), W.green)
		Candy.round(ribbon, 0)
		Candy.stroke(ribbon, 2)
		ribbon.ZIndex = 3
		local ribbonText =
			Candy.text(ribbon, "Label", scale(0.86, 0.8), scale(0.07, 0.1), 13, Candy.white)
		ribbonText.ZIndex = 4
		-- an action waiting: three copies → «Слить!» (top-right of the stage, gold, it is the one thing to do here)
		local badge = Candy.frame(
			stage,
			"Action",
			UDim2.new(0.5, 0, 0, 24),
			UDim2.new(0.5, -6, 0, 6),
			W.yellow
		)
		Candy.round(badge, 0)
		Candy.stroke(badge, 2)
		badge.ZIndex = 3
		local badgeText = Candy.text(badge, "Label", scale(0.86, 0.8), scale(0.07, 0.1), 13)
		badgeText.ZIndex = 4
		local lock = Candy.icon(stage, "lock", offset(30, 30), UDim2.new(0.5, -15, 0.38, -15))
		lock.ZIndex = 3
		local level = Candy.text(control.face, "Level", scale(0.55, 0.13), scale(0.07, 0.83), 15)
		level.TextXAlignment = Enum.TextXAlignment.Left
		local count = Candy.text(control.face, "Count", scale(0.36, 0.13), scale(0.57, 0.83), 15)
		count.TextXAlignment = Enum.TextXAlignment.Right
		count.TextColor3 = Color3.fromHex("6A6480")
		local card: Card = {
			control = control,
			stage = stage,
			image = image,
			dim = dim,
			stars = stars,
			rarity = rarity,
			level = level,
			count = count,
			ribbon = ribbon,
			ribbonText = ribbonText,
			badge = badge,
			badgeText = badgeText,
			lock = lock,
			border = control.face:FindFirstChildOfClass("UIStroke") :: UIStroke,
			tween = nil,
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
	local function layCards()
		local boxes = {}
		for _, card in cards do
			table.insert(boxes, card.control.box)
		end
		W.row(boxes, UDim.new(0, 0), UDim.new(1, 0), nil, CARD_GAP)
	end
	layCards()
	-- a new family slides in: the cards rise a few units one after another (≈ 0.25 s in all); a fast second tap cancels
	-- the first motion and starts from the final places, so nothing ever stacks or lags behind
	local function arrive()
		local calm = ProfileState.preference("reducedMotion")
		for c, card in cards do
			if card.tween then
				card.tween:Cancel()
				card.tween = nil
			end
			local box = card.control.box
			local target = box.Position
			if not calm and box.Visible then
				box.Position = target + UDim2.fromOffset(0, 14)
				local tween = TweenService:Create(
					box,
					TweenInfo.new(
						0.2,
						Enum.EasingStyle.Quad,
						Enum.EasingDirection.Out,
						0,
						false,
						(c - 1) * 0.035
					),
					{ Position = target }
				)
				card.tween = tween
				tween:Play()
			end
		end
	end

	-- ── the pick screen ──────────────────────────────────────────────────────────────────────────────────────────
	-- [владелец 12.11: «неровно, неуклюже, негармонично… это объединить можно»] one screen for a pick, on one grid:
	--   left   the picture card (44 %): round «←» top-left, «×N» top-right (same height, same inset), «✓ В руке» bottom
	--   right  one left-aligned column: name, rarity, one facts card split in two equal halves (level | power), the perk
	--          line, then two button rows of the same rhythm — [×1][Улучшить price] or [В руку], and [Слить][Без золота]
	-- every vertical block is a share of the height (gaps included), every row splits its width with 8-unit gaps
	local GRID = 8
	local details = Candy.frame(page, "SelectedPick", scale(1, 1), offset(0, 0))
	details.Visible = false
	local top = Candy.frame(details, "Overview", scale(0.44, 1), scale(0, 0))
	local icon = Candy.icon(top, "pickaxe", scale(0.86, 0.66), scale(0.07, 0.15))
	icon.ZIndex = 2
	local function chip(name: string, color: Color3, size: UDim2, at: UDim2): (Frame, TextLabel)
		local frame = Candy.frame(top, name, size, at, color)
		Candy.round(frame, 0)
		Candy.stroke(frame, 2)
		frame.ZIndex = 3
		local label =
			Candy.text(frame, "Label", scale(0.84, 0.76), scale(0.08, 0.12), 15, Candy.white)
		label.ZIndex = 4
		return frame, label
	end
	local ribbon, ribbonText =
		chip("InHand", W.green, UDim2.new(0.56, 0, 0, 32), UDim2.new(0.22, 0, 1, -44))
	local copiesBadge, copiesText =
		chip("Copies", Candy.ink, UDim2.fromOffset(60, 32), UDim2.new(1, -72, 0, 12))
	copiesBadge.BackgroundTransparency = 0.25
	local back = Candy.button(details, "Back", offset(40, 40), offset(8, 8), "neutral", 20)
	W.bind(ctx, back, function()
		detailOpen = false
		if profile then
			refresh(profile)
		end
	end, function()
		return t("menu_all_picks")
	end)

	local info = Candy.frame(details, "Info", UDim2.new(0.56, -12, 1, 0), UDim2.new(0.44, 12, 0, 0))
	local function left(label: TextLabel): TextLabel
		label.TextXAlignment = Enum.TextXAlignment.Left
		return label
	end
	local title = left(Candy.text(info, "Name", scale(1, 0.12), scale(0, 0), 26))
	local rarityText = left(Candy.text(info, "Rarity", scale(1, 0.07), scale(0, 0.125), 15))
	rarityText.RichText = true
	-- the facts card: two equal halves, a small grey caption over a bold value
	local facts = Candy.frame(info, "Facts", scale(1, 0.21), scale(0, 0.225), Candy.panelColor)
	Candy.round(facts, 12)
	Candy.stroke(facts, 2)
	local divider =
		Candy.frame(facts, "Divider", UDim2.new(0, 2, 0.64, 0), scale(0.38, 0.18), Candy.ink)
	divider.BackgroundTransparency = 0.8
	local function fact(x: number, w: number): (TextLabel, TextLabel)
		local caption = Candy.text(facts, "Caption", scale(w - 0.08, 0.3), scale(x + 0.04, 0.1), 12)
		caption.TextColor3 = Color3.fromHex("6B6F8C")
		local value = Candy.text(facts, "Value", scale(w - 0.08, 0.46), scale(x + 0.04, 0.42), 19)
		return caption, value
	end
	local levelCaption, levelPill = fact(0, 0.38)
	local powerCaption, powerPill = fact(0.38, 0.62)
	local perkText = left(Candy.text(info, "Perk", scale(1, 0.11), scale(0, 0.455), 14))
	perkText.TextColor3 = Color3.fromHex("4A4E6E")

	-- the two button rows
	local MAIN = { y = 0.585, h = 0.22 }
	local SUB = { y = 0.84, h = 0.16 }
	local function lay(
		row: { y: number, h: number },
		buttons: { Candy.Control },
		weights: { number }?
	)
		local sum = 0
		for index in buttons do
			sum += if weights then weights[index] else 1
		end
		local x = 0
		for index, button in buttons do
			local w = (if weights then weights[index] else 1) / sum
			local last = index == #buttons
			Candy.fit(
				button.box,
				UDim2.new(w, if last then 0 else -GRID, row.h, 0),
				UDim2.new(x, 0, row.y, 0)
			)
			x += w
		end
	end
	local amount = 1 -- index into UpgradeCards.counts: ×1 → ×10 → max, one tap each
	local quantity =
		Candy.button(info, "Quantity", scale(0.24, MAIN.h), scale(0, MAIN.y), "neutral", 17)
	local improve =
		Candy.button(info, "BuyPick", scale(0.76, MAIN.h), scale(0.24, MAIN.y), "coin", 19)
	-- a caption over the price (like a shop button): «Улучшить» small on top, the price big below, the coin on the left
	Candy.buttonIcon(improve, "coin")
	Candy.fit(improve.image, scale(0.2, 0.7), scale(0.05, 0.15))
	Candy.fit(improve.text, scale(0.7, 0.5), scale(0.27, 0.42))
	local improveCaption =
		Candy.text(improve.face, "Caption", scale(0.7, 0.32), scale(0.27, 0.1), 15)
	improveCaption.ZIndex = improve.text.ZIndex
	local equip = Candy.button(info, "Equip", scale(1, MAIN.h), scale(0, MAIN.y), "confirm", 19)
	local gold = Candy.button(info, "EquipGold", scale(0.5, MAIN.h), scale(0.5, MAIN.y), "coin", 17)
	local fromChest =
		Candy.button(info, "FindInChest", scale(1, MAIN.h), scale(0, MAIN.y), "robux", 17)
	local merge = Candy.button(info, "Merge", scale(1, SUB.h), scale(0, SUB.y), "coin", 15)
	local swap = Candy.button(info, "Swap", scale(1, SUB.h), scale(0, SUB.y), "coin", 15)
	local width = Candy.button(info, "BuyWidth", scale(1, SUB.h), scale(0, SUB.y), "neutral", 15)
	Candy.buttonIcon(width, "width")
	local buy = Candy.button(info, "Buy", scale(1, SUB.h), scale(0, SUB.y), "coin", 15)
	Candy.buttonIcon(buy, "coin")
	local mainRow = { quantity, improve, equip, gold, fromChest }
	-- the starter's way forward: better picks come from the chest [владелец 13.11: «развитие должно вызывать интерес»]
	local find = Candy.button(info, "FindBetter", scale(1, SUB.h), scale(0, SUB.y), "robux", 15)
	Candy.buttonIcon(find, "chest")
	W.bind(ctx, find, showChest)
	local bottomRow = { merge, swap, width, buy, find }

	local upgradeRemote = Remotes.event("UpgradeIntent")
	local pickQuote: Upgrade.Quote? = nil
	local widthQuote: Upgrade.Quote? = nil
	local improveHelp, widthHelp = "", ""
	W.bind(ctx, quantity, function()
		amount = amount % #UpgradeCards.counts + 1
		if profile then
			refresh(profile)
		end
	end)
	W.bind(ctx, improve, function()
		if profile and Upgrade.pay(profile.coins, pickQuote) then
			upgradeRemote:FireServer("BuyPickLevel", UpgradeCards.counts[amount])
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

	local generation = 0
	refresh = function(current: any, newFront: number?, animate: boolean?, switched: boolean?)
		profile = current
		W.warmPicks(ids)
		generation += 1
		local mine = generation
		front = newFront or front
		local locale = Strings.localeOf(ctx.player)
		if not tab then
			local held = Config.pickaxes[profile.pickaxe]
			tab = if held and held.family then held.family else (profile.family or families[1])
		end
		list.Visible, details.Visible = not detailOpen, detailOpen

		-- tabs: one solid pill for the chosen family; the starter tab is never «chosen» (it opens a screen)
		for key, control in tabs do
			control.text.Text = t(if key == "starter" then "pick_starter" else "family_" .. key)
			W.tab(control, tab == key)
		end
		hint.Text = t("menu_tap_pick")

		-- the four rarities of the chosen family
		for c, card in cards do
			local id = (tab :: string) .. "_" .. rarities[c]
			local entry = profile.collection[id] or { count = 0, golden = 0 }
			local owned = entry.count + entry.golden > 0
			-- the pick first (its first build may wait on the engine); if a newer refresh started meanwhile, this
			-- one stops here, so a card is always repainted whole — stage, pick and texts of one family
			card.image:SetAttribute("Silhouette", not owned)
			card.image.ImageTransparency = 0
			W.pickIcon(card.image, id)
			if mine ~= generation then
				return
			end
			card.control.box:SetAttribute("Pick", id)
			local config = Config.pickaxes[id]
			local inHand = profile.pickaxe == id
			PickStage.apply(
				card.stage,
				tone(config.rarity),
				config.family,
				scale(1, 1),
				scale(0, 0),
				UDim.new(0, 10)
			)
			card.dim.Visible, card.lock.Visible = not owned, not owned
			card.stars.Text = W.stars(config.rarity)
			card.stars.TextColor3 = Color3.fromHex("FFD84A")
			card.rarity.Text = t("menu_rarity_" .. config.rarity)
			card.rarity.TextColor3 = W.rarityColors[tone(config.rarity)]:Lerp(Candy.white, 0.45)
			card.ribbon.Visible = inHand
			card.ribbonText.Text = "✓ " .. t("menu_in_hand")
			local canMergeHere = entry.count >= mergeNeed
			card.badge.Visible = canMergeHere
			card.badgeText.Text = t("menu_merge_go")
			local level = levelOf(id, entry)
			card.level.Text = if owned then t("upgrade_level", level) else t("menu_missing")
			card.level.TextColor3 = if owned then Candy.ink else Color3.fromHex("8A8499")
			-- copies in one short token; a golden copy shows as the gold rim and a star
			card.count.Text = if owned
				then (if entry.golden > 0 then "★ ×" else "×") .. Format.short(
					entry.count + entry.golden
				)
				else ""
			card.count.TextColor3 = if entry.golden > 0
				then Color3.fromHex("C98A00")
				else Color3.fromHex("6A6480")
			card.border.Color = if entry.golden > 0 then Color3.fromHex("E0A21A") else Candy.ink
			card.border.Thickness = if entry.golden > 0 then 4 else 2
		end
		if switched and not detailOpen then
			layCards()
			arrive()
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
		icon:SetAttribute("Silhouette", not owned)
		W.pickIcon(icon, id)
		if mine ~= generation then
			return
		end
		back.text.Text = "←"
		ribbon.Visible = equipped
		ribbonText.Text = "✓ " .. t("menu_in_hand")
		copiesBadge.Visible = owned and id ~= "starter"
		copiesText.Text = "×" .. Format.short(count)

		-- the facts
		title.Text = W.pickName(t, id)
		rarityText.Text = (
			if family
				then W.stars(rarity) .. " " .. t("menu_rarity_" .. rarity)
				else t("menu_starter_tag")
		)
			.. (
				if displayGold
					then '   <font color="#D08A00">★ ' .. t("menu_gold") .. "</font>"
					else ""
			)
		rarityText.TextColor3 = W.rarityText[tone(rarity)]
		levelCaption.Text, powerCaption.Text = t("menu_level_caption"), t("menu_strength")
		levelPill.Text = if owned then t("menu_fraction", level, cap) else t("menu_missing")
		equipHelp = t("pick_counts", entry.count, entry.golden) .. "\n" .. perk(ctx, id)
		if otherFamily then
			equipHelp = t("family_next") .. " · " .. equipHelp
		end
		perkText.Text = if otherFamily and owned then t("family_next") else perk(ctx, id)

		-- in the hand: the level is bought here
		local nextWidth: any = nil
		if equipped then
			local context = Circle.context(profile, Worlds.of(front).index)
			local current = Circle.pick(context.pick, profile.circle, front, profile)
			pickQuote =
				Upgrade.quote(context, { kind = "pick", count = UpgradeCards.counts[amount] })
			local single = pickQuote or Upgrade.quote(context, { kind = "pick", count = 1 })
			local nextPick = if single
				then UpgradeCards.pickAt(profile, front, single.level)
				else current
			powerPill.Text = Format.stat(current.strength, locale)
				.. " → "
				.. Format.stat(nextPick.strength, locale)
			improve.text.Text = if single then Format.short(single.price) else t("upgrade_cap")
			improveCaption.Text = t("menu_improve")
			Candy.paint(
				improve,
				if Upgrade.pay(context.coins, pickQuote) then "coin" else "disabled"
			)
			improveCaption.TextColor3 = improve.text.TextColor3
			improveHelp = t(
				"upgrade_pick_preview",
				Format.stat(current.strength, locale),
				Format.stat(nextPick.strength, locale),
				Format.short(current.ultLayers),
				Format.short(nextPick.ultLayers)
			)
			local count = UpgradeCards.counts[amount]
			quantity.text.Text = if count == "max"
				then t("upgrade_max")
				else "×" .. tostring(count)
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
			powerPill.Text = Format.stat(power, locale)
			widthQuote = nil
		end

		-- not in the hand: «В руку» (and the golden copy beside it), or «из сундука» when missing
		local showMain = if equipped
			then { quantity, improve }
			elseif not owned then { fromChest }
			elseif twoVariants then { equip, gold }
			else { equip }
		for _, button in mainRow do
			button.box.Visible = table.find(showMain, button) ~= nil
		end
		lay(MAIN, showMain, if equipped then { 0.22, 0.78 } else nil)
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
		find.box.Visible = id == "starter"
		find.text.Text = t("menu_find_better")
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
		lay(SUB, shown)
	end
	return {
		refresh = refresh,
		-- QA (Studio hook QaMenuPage = "collectiontab/<family>"): the same as tapping a family tab
		showTab = function(family: string)
			if profile and table.find(families, family) then
				detailOpen = false
				tab = family
				refresh(profile, nil, nil, true)
			end
		end,
		-- back to the cards (entering «Кирки» from the rail or the hub)
		showList = function()
			detailOpen = false
		end,
		-- open the pick screen of one pick (the dock button opens the one in the hand; QA)
		open = function(id: string)
			if Config.pickaxes[id] then
				tab, selected, detailOpen = Config.pickaxes[id].family or tab, id, true
				if profile then
					refresh(profile)
				end
			end
		end,
	}
end

return Collection
