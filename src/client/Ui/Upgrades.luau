--!strict
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rebirth = require(Shared.Play.Rebirth)
local Family = require(Shared.Play.Family)
local Format = require(Shared.Format)
local Strings = require(Shared.Strings)
local Upgrade = require(Shared.Play.Upgrade)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)
local UpgradeCards = require(script.Parent.UpgradeCards)
local Collection = require(script.Parent.PickCollection)
local Families = require(script.Parent.Families)
local PickaxeChest = require(script.Parent.PickaxeChest)

local Upgrades = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
-- [владелец 12.11: «это объединить можно»] no separate «Кирка» page any more: the pick in the hand is upgraded on its
-- own screen inside «Кирки» (PickCollection)
local sections = {
	{
		id = "rebirth",
		title = "rebirth_title",
		icon = "ult",
		color = Candy.purple,
		action = "menu_open",
	},
	{
		id = "cards",
		title = "upgrade_cards",
		icon = "cards",
		color = Candy.pink,
		action = "menu_open",
	},
	{
		id = "collection",
		title = "collection_tab",
		icon = "pickaxe",
		color = W.blue,
		action = "menu_browse",
	},
	{
		id = "family",
		title = "family_tab",
		icon = "lock",
		color = W.familyColors.storm,
		action = "menu_skills",
	},
	{
		id = "chest",
		title = "pick_chest_title",
		icon = "chest",
		color = W.navy,
		action = "menu_open",
	},
}

local function total(set: { [string]: boolean }): number
	local count = 0
	for _ in set do
		count += 1
	end
	return count
end

local function dockButton(
	parent: Frame,
	name: string,
	key: string,
	width: number,
	x: number,
	kind: string
)
	-- icon-only, one compact row bottom-left [владелец 11.11: «нижние кнопки все влево кроме ульты и уменьшить»]
	local control =
		Candy.button(parent, name, offset(width, width), UDim2.new(0, x, 1, -18), kind, 17)
	control.box.AnchorPoint = Vector2.new(0, 1)
	Candy.buttonIcon(control, key, true)
	return control
end

function Upgrades.new(
	parent: Instance,
	player: Player,
	translate: (string, ...any) -> string,
	feedback: (string, number) -> (),
	wallet: Frame,
	openRebirth: ((boolean?) -> ())?
)
	local hud = Candy.layer(parent, "UpgradesHUD", 5)
	hud.Visible = false
	local upgradeButton = dockButton(hud, "OpenUpgrades", "upgrades", 50, 16, "purple")
	local picksButton = dockButton(hud, "OpenCollection", "pickaxe", 50, 80, "confirm")
	local familyButton = dockButton(hud, "OpenFamily", "lock", 50, 144, "neutral")
	local upgradeDot, collectionDot, familyDot =
		Candy.dot(upgradeButton.face), Candy.dot(picksButton.face), Candy.dot(familyButton.face)
	-- [владелец 11.11: «небрежно»] small dots tucked into the corner, never over the next button
	for _, dot in { upgradeDot, collectionDot, familyDot } do
		Candy.fit(dot, offset(12, 12), UDim2.new(1, -14, 0, 2))
	end
	local stronger = Candy.panel(hud, "GetStronger", offset(150, 29), UDim2.new(0, 16, 1, -78))
	stronger.AnchorPoint, stronger.Visible = Vector2.new(0, 1), false
	local strongerText = Candy.text(stronger, "Hint", scale(0.95, 0.88), scale(0.025, 0.06), 14)
	local chestButton = Candy.button(
		hud,
		"OpenPickaxeChest",
		offset(50, 50),
		UDim2.new(0, 208, 1, -18),
		"neutral",
		17
	)
	chestButton.box.AnchorPoint = Vector2.new(0, 1)
	W.tone(chestButton, W.navy)
	Candy.buttonIcon(chestButton, "chest", true)
	local chestBadge, chestCount = W.badge(chestButton.face, W.yellow)
	Candy.fit(chestBadge, offset(20, 20), UDim2.new(1, -15, 0, -7))
	local chestZoom = Instance.new("UIScale")
	chestZoom.Parent = chestButton.box
	local pulse: Tween? = nil
	local keyPill, keyAmount =
		W.pill(wallet, "Keys", offset(68, 27), UDim2.new(0, 10, 1, 8), Candy.panelColor, 15)
	Candy.round(keyPill, 0)
	Candy.icon(keyPill, "keys", scale(0.38, 0.88), scale(0.06, 0.06))
	Candy.fit(keyAmount, scale(0.48, 0.84), scale(0.46, 0.08))

	local refresh: (boolean) -> ()
	local visibleChanged: (boolean) -> ()
	local navigate: (string) -> ()
	local modal = Candy.modal(
		parent,
		"MineUpgrades",
		scale(0.925, 0.85),
		Candy.purple,
		function(show)
			player:SetAttribute("MineUpgradesOpen", show)
			visibleChanged(show)
		end
	)
	Candy.move(modal.close.box, UDim2.new(1, -8, 0, 0))
	modal.close.input.Activated:Connect(W.click)
	local ctx = W.context(modal.panel, player, translate, feedback)
	-- [владелец 12.11: «неровно»] the same 14-unit margin on every side; no title ribbon — the highlighted rail item
	-- already says where you are, and the ribbon ran into Roblox's top-bar buttons on phones
	local body = Candy.frame(modal.panel, "Body", UDim2.new(1, -28, 1, -28), offset(14, 14))
	modal.ribbon.Visible = false
	-- the window a shade darker than the cards on it [владелец 13.11: «карточки слиплись»]: white-cream cards then
	-- stand out as separate objects without heavier outlines
	local windowSurface = modal.panel:FindFirstChild("Surface") :: Frame?
	if windowSurface then
		windowSurface.BackgroundColor3 = Color3.fromHex("E3D1B3")
	end
	local hub = Candy.frame(body, "Hub", scale(1, 1), offset(0, 0))
	-- the hub on the page grid too: its title in the header row, the section cards below
	local hubTitle = Candy.text(hub, "Title", scale(0.6, W.HEAD), scale(0, 0), 20)
	hubTitle.TextXAlignment = Enum.TextXAlignment.Left
	local hubCards = Candy.frame(hub, "Cards", scale(1, 1 - W.BODY), scale(0, W.BODY))
	local hubBoxes = {}
	-- [владелец 12.11: «сбоку толстые кнопки, всё слиплось»] a slimmer rail and a clear gap before the page
	local rail = Candy.frame(body, "Sections", UDim2.new(0, 68, 1, 0), offset(0, 0))
	local content = Candy.frame(body, "SectionsBody", UDim2.new(1, -82, 1, 0), offset(82, 0))
	local cards, rails, pages = {}, {}, {}
	for index, section in sections do
		local card = Candy.button(
			hubCards,
			section.id,
			UDim2.new(1 / #sections, -8, 1, -5),
			UDim2.new((index - 1) / #sections, 4, 0, 0),
			"neutral",
			15
		)
		card.text.Visible = false
		local head = W.band(card.face, "Header", UDim2.new(1, -4, 0.38, -2), section.color)
		local icon = Candy.icon(head, section.icon, scale(0.82, 0.91), scale(0.09, 0.045))
		local title = Candy.text(card.face, "Name", scale(0.94, 0.112), scale(0.03, 0.39), 21)
		local hint = Candy.text(card.face, "Hint", scale(0.93, 0.094), scale(0.035, 0.50), 14)
		local _, status =
			W.pill(card.face, "Status", scale(0.91, 0.111), scale(0.045, 0.61), Candy.rowColor, 16)
		-- one look for one role: every action is the same yellow button, no extra bar [владелец 12.11]
		local fill: Frame? = nil
		local action, actionText = W.pill(
			card.face,
			"Action",
			UDim2.new(0.88, 0, 0, 44),
			UDim2.new(0.06, 0, 1, -50),
			W.yellow,
			17
		)
		Candy.round(action, 10)
		local badge, amount =
			W.badge(head, if section.id == "chest" then W.yellow else Color3.fromHex("FF4D5E"))
		amount.TextColor3 = if section.id == "chest" then Candy.ink else Candy.white
		cards[section.id] = {
			head = head,
			icon = icon,
			title = title,
			hint = hint,
			status = status,
			fill = fill,
			action = actionText,
			badge = badge,
			count = amount,
		}
		W.lift(card)
		table.insert(hubBoxes, card.box)
		W.bind(ctx, card, function()
			navigate(section.id)
		end, function()
			return title.Text .. "\n" .. hint.Text .. " · " .. status.Text
		end)

		local tab = Candy.button(
			rail,
			section.id,
			-- equal items, an 8-unit gap between them, flush with the top and the bottom of the page
			UDim2.new(1, 0, 1 / #sections, -8 * (#sections - 1) / #sections),
			UDim2.new(0, 0, (index - 1) / #sections, (index - 1) * 8 / #sections),
			"neutral",
			12
		)
		Candy.buttonIcon(tab, section.icon)
		Candy.fit(tab.image, scale(0.5, 0.5), scale(0.25, 0.07))
		Candy.fit(tab.text, scale(0.95, 0.28), scale(0.025, 0.62))
		local railBadge, railCount = W.badge(tab.face, Color3.fromHex("FF4D5E"))
		Candy.fit(railBadge, offset(21, 21), UDim2.new(1, -17, 0, -6))
		railCount.TextColor3 = Candy.white
		rails[section.id] = { button = tab, badge = railBadge, count = railCount }
		W.bind(ctx, tab, function()
			navigate(section.id)
		end)
		pages[section.id] = Candy.frame(content, section.id, scale(1, 1), offset(0, 0))
	end
	W.row(hubBoxes, UDim.new(0, 0), UDim.new(1, 0), nil, W.CARD_GAP)

	local upgrades = UpgradeCards.new(ctx, pages.cards)
	local collection = Collection.new(ctx, pages.collection, function()
		navigate("chest")
	end)
	local families = Families.new(ctx, pages.family)
	local chest = PickaxeChest.new(ctx, pages.chest)
	local page = "hub"
	local front = 0
	local active = false
	local reduced = false
	local owned: { [string]: boolean }? = nil
	local newPicks: { [string]: boolean } = {}
	local keys = 0
	local hardSince: number? = nil
	local previousStrength: number? = nil
	local lastMinute = -1

	local function pulseChest()
		local want = active and not modal.open and not reduced and keys > 0
		if want and not pulse then
			pulse = TweenService:Create(
				chestZoom,
				TweenInfo.new(0.6, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
				{ Scale = 1.08 }
			)
			pulse:Play()
		elseif not want and pulse then
			pulse:Cancel()
			pulse, chestZoom.Scale = nil, 1
		end
	end

	local function layout()
		hub.Visible, rail.Visible, content.Visible = page == "hub", page ~= "hub", page ~= "hub"
		for id, frame in pages do
			frame.Visible = page == id
		end
		chest.show(modal.open and page == "chest")
	end

	refresh = function(animate: boolean)
		local profile = ProfileState.getProfile()
		upgradeButton.text.Text = translate("menu_dock_upgrades")
		picksButton.text.Text = translate("collection_tab")
		familyButton.text.Text = translate("family_tab")
		strongerText.Text = "↓  " .. translate("upgrade_stronger")
		if not profile then
			return
		end
		local locale = Strings.localeOf(player)
		local family = profile.family
		local familyIcon = if family then "family_" .. family else "lock"
		local familyColor = if family then W.familyColors[family] else Candy.panelColor
		Candy.setIcon(familyButton.image, familyIcon)
		W.tone(familyButton, familyColor)
		keys = profile.keys
		keyAmount.Text = Format.short(keys)
		chestBadge.Visible, chestCount.Text = keys > 0, Format.short(keys)
		pulseChest()

		local latest = Collection.owned(profile)
		if owned then
			for id in latest do
				if not owned[id] then
					newPicks[id] = true
				end
			end
		end
		for id in newPicks do
			if not latest[id] or (modal.open and page == "collection") then
				newPicks[id] = nil
			end
		end
		owned = latest
		local fresh, ownedCount = total(newPicks), total(latest)
		local skillCount = Families.affordable(profile)
		local summary = UpgradeCards.summary(profile, front)
		upgradeDot.Visible, collectionDot.Visible, familyDot.Visible =
			Upgrade.available(summary.context), fresh > 0, skillCount > 0
		chest.refresh(profile)
		if not modal.open then
			return
		end

		local q = Rebirth.quote(profile)
		local pendingMaster = profile.rewards.masterEpic == "pending"
		local statuses = {
			rebirth = if pendingMaster
				then translate("master_epic_entry")
				elseif not q.available then translate(
					"rebirth_need_plate",
					math.max(Config.rebirth.firstAfterWorld, profile.circleStartWorld)
				)
				else translate("rebirth_gain", q.gain),
			cards = translate("menu_affordable", summary.cardCount),
			collection = translate(
				"menu_strength_change",
				Format.stat(summary.power, locale),
				Format.stat(summary.nextPower, locale)
			),
			family = if family
				then translate(
					"upgrade_level",
					translate("menu_fraction", Family.level(profile, family), 40)
				)
				else translate("family_none"),
			chest = translate("pick_chest_keys", Format.short(keys)),
		}
		local counts = {
			rebirth = if pendingMaster or player:GetAttribute("RebirthHint") == 2 then 1 else 0,
			cards = summary.cardCount,
			collection = fresh + summary.pickCount,
			family = skillCount,
			chest = keys,
		}
		for _, section in sections do
			local id = section.id
			local card, tab = cards[id], rails[id]
			local title = translate(section.title)
			local icon = if id == "rebirth"
					and not q.available
					and not pendingMaster
				then "lock"
				elseif id == "family" then familyIcon
				else section.icon
			local count = counts[id]
			card.title.Text = title
			card.hint.Text = translate("menu_" .. id .. "_hint")
			card.status.Text, card.action.Text = statuses[id], translate(section.action)
			Candy.setIcon(card.icon, icon)
			card.head.BackgroundColor3 = if id == "family" then familyColor else section.color
			card.badge.Visible, card.count.Text =
				count > 0, if id == "rebirth" then translate("rebirth_up") else Format.short(count)
			if card.fill then
				card.fill.Size = scale(ownedCount / Collection.total, 1)
			end
			tab.button.text.Text = if id == "chest" then translate("menu_chest") else title
			Candy.setIcon(tab.button.image, icon)
			W.tab(tab.button, page == id)
			tab.badge.Visible, tab.count.Text = id ~= "chest" and count > 0, Format.short(count)
			if page == id then
				modal.title.Text = if id == "family" then translate("family_permanent") else title
				modal.ribbon.BackgroundColor3 = if id == "family"
					then Candy.purple
					else section.color
			end
		end
		if page == "hub" then
			modal.title.Text, modal.ribbon.BackgroundColor3 = translate("menu_title"), Candy.purple
			hubTitle.Text = translate("menu_title")
		elseif page == "cards" then
			upgrades.refresh(profile, front, animate)
		elseif page == "collection" then
			collection.refresh(profile, front, animate)
		elseif page == "family" then
			families.refresh(profile, animate)
		end
	end

	visibleChanged = function(show: boolean)
		hud.Visible = active and not show
		W.hideHint(ctx)
		layout()
		refresh(false)
	end
	navigate = function(target: string)
		if target == "rebirth" and openRebirth then
			Candy.show(modal, false)
			local p = ProfileState.getProfile()
			openRebirth(p and p.rewards.masterEpic == "pending")
			return
		end
		page = target
		if target == "collection" then
			collection.showList()
		end
		W.hideHint(ctx)
		if not modal.open then
			Candy.show(modal, true)
		else
			layout()
			refresh(false)
		end
	end
	W.bind(ctx, upgradeButton, function()
		navigate("hub")
	end)
	-- the pick button opens the pick in the hand: its level is the thing bought most often
	W.bind(ctx, picksButton, function()
		local profile = ProfileState.getProfile()
		navigate("collection")
		if profile then
			collection.open(profile.pickaxe)
		end
	end)
	W.bind(ctx, familyButton, function()
		navigate("family")
	end)
	W.bind(ctx, chestButton, function()
		navigate("chest")
	end, function()
		return translate("pick_chest_title")
	end)
	Candy.fit(modal.ribbon, offset(200, 34), offset(17, -17))
	layout()
	player:GetAttributeChangedSignal("RebirthHint"):Connect(function()
		refresh(false)
	end)
	ProfileState.changed:Connect(function()
		refresh(true)
	end)
	-- QA (Studio only): the player attribute QaMenuPage = "collection" | "hub" | … opens that page, so the relay
	-- can check a window without real clicks
	if game:GetService("RunService"):IsStudio() then
		player:GetAttributeChangedSignal("QaMenuPage"):Connect(function()
			local target = player:GetAttribute("QaMenuPage")
			if type(target) == "string" and target ~= "" then
				local section, pick = string.match(target, "^(%w+)/(.+)$")
				navigate(section or target)
				if section == "collection" and pick then
					collection.open(pick)
				elseif section == "collectiontab" and pick then
					navigate("collection")
					collection.showTab(pick)
				end
			end
		end)
	end
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(function()
			refresh(false)
		end)
	end
	refresh(false)

	return {
		close = function()
			Candy.show(modal, false)
		end,
		chestResult = chest.result,
		step = function(
			now: number,
			onPlatform: boolean,
			depth: number,
			need: number,
			strength: number,
			calm: boolean
		)
			if active ~= onPlatform or reduced ~= calm then
				active, reduced = onPlatform, calm
				hud.Visible = active and not modal.open
				pulseChest()
				if not active and modal.open then
					Candy.show(modal, false)
				end
			end
			local minute = math.floor(os.time() / 60)
			if depth ~= front or (modal.open and page == "family" and minute ~= lastMinute) then
				front, lastMinute = depth, minute
				refresh(false)
			end
			if not active or need < 5 or (previousStrength and strength > previousStrength) then
				hardSince = nil
			elseif not hardSince then
				hardSince = now
			end
			previousStrength = strength
			local guide = active
				and not modal.open
				and hardSince ~= nil
				and now - hardSince >= 10
				and upgradeDot.Visible
			stronger.Visible = guide
			upgradeButton.face.BackgroundColor3 = Candy.purple:Lerp(
				Candy.white,
				if guide and not calm then 0.10 + 0.08 * math.sin(now * 6) else 0
			)
		end,
	}
end

return Upgrades
