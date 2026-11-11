--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Family = require(Shared.Play.Family)
local Power = require(Shared.Play.Power)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Candy = require(script.Parent.Candy)
local Families = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

local function scroll(parent: Instance, name: string, top: number): ScrollingFrame
	local frame = Instance.new("ScrollingFrame")
	frame.Name, frame.BackgroundTransparency, frame.BorderSizePixel = name, 1, 0
	frame.ScrollBarThickness, frame.AutomaticCanvasSize = 5, Enum.AutomaticSize.Y
	frame.CanvasSize = offset(0, 0)
	Candy.fit(frame, UDim2.new(1, -24, 1, -top - 12), offset(12, top))
	frame.Parent = parent
	return frame
end

local function action(parent: Instance, name: string, y: number): Candy.Control
	return Candy.button(parent, name, UDim2.new(1, -10, 0, 32), offset(5, y), "neutral", 13)
end

function Families.new(parent: Instance, player: Player, translate: (string, ...any) -> string)
	local collectionPage = Candy.frame(parent, "Collection", scale(1, 1), offset(0, 0))
	local familyPage = Candy.frame(parent, "Family", scale(1, 1), offset(0, 0))
	local remote = Remotes.event("PickaxeIntent")
	local grid = scroll(collectionPage, "PickaxeGrid", 30)
	local familyScroll = scroll(familyPage, "Skills", 86)
	local collectionTitle =
		Candy.text(collectionPage, "Title", UDim2.new(1, -28, 0, 25), offset(14, 0), 16)
	local familyIcon = Candy.icon(familyPage, nil, offset(44, 44), offset(14, 2))
	local familyTitle = Candy.text(familyPage, "Title", UDim2.new(1, -74, 0, 24), offset(64, 0), 16)
	local familyHint = Candy.text(familyPage, "Hint", UDim2.new(1, -74, 0, 22), offset(64, 25), 13)
	local bonus = Candy.text(familyPage, "Bonus", UDim2.new(1, -203, 0, 26), offset(193, 52), 12)
	familyTitle.TextXAlignment, familyHint.TextXAlignment =
		Enum.TextXAlignment.Left, Enum.TextXAlignment.Left
	local cells, familyButtons, skillRows = {}, {}, {}
	local choiceRows = {}
	local refresh: (any) -> ()
	local currentProfile: any
	local choose = Candy.modal(
		parent,
		"FamilyChoice",
		scale(0.78, 0.70),
		Candy.purple,
		function(show)
			player:SetAttribute("MineMenuOpen", show)
		end
	)
	local choiceScroll = scroll(choose.panel, "OwnedFamilies", 32)
	local changeFamily =
		Candy.button(familyPage, "ChangeFamily", offset(170, 32), offset(14, 49), "neutral", 14)
	changeFamily.input.Activated:Connect(function()
		refresh(currentProfile)
		Candy.show(choose, true)
	end)
	local function cell(id: string, column: number, row: number)
		local box, surface = Candy.panel(
			grid,
			id,
			UDim2.new(0.25, -8, 0, 248),
			UDim2.new(column / 4, 2, 0, row * 256),
			true
		)
		local pick = Config.pickaxes[id]
		local border = surface:FindFirstChildOfClass("UIStroke") :: UIStroke
		local image = Candy.icon(box, "pick", offset(30, 30), offset(4, 4))
		local stars = Candy.text(box, "Stars", UDim2.new(1, -38, 0, 30), offset(36, 4), 15)
		local name = Candy.text(box, "Name", UDim2.new(1, -8, 0, 28), offset(4, 35), 14)
		local count = Candy.text(box, "Count", UDim2.new(1, -8, 0, 27), offset(4, 63), 12)
		local stats = Candy.text(box, "Stats", UDim2.new(1, -8, 0, 33), offset(4, 90), 12)
		local nextCircle =
			Candy.text(box, "NextCircle", UDim2.new(1, -8, 0, 22), offset(4, 124), 11)
		local normal, golden, merge =
			action(box, "Equip", 149), action(box, "Gold", 181), action(box, "Merge", 213)
		local buy = action(box, "Buy", 149)
		normal.input.Activated:Connect(function()
			remote:FireServer("Equip", id, false)
		end)
		golden.input.Activated:Connect(function()
			remote:FireServer("Equip", id, true)
		end)
		merge.input.Activated:Connect(function()
			remote:FireServer("Merge", id)
		end)
		buy.input.Activated:Connect(function()
			if pick.family then
				remote:FireServer("BuyPick", pick.family)
			end
		end)
		cells[id] = {
			image = image,
			stars = stars,
			name = name,
			count = count,
			stats = stats,
			nextCircle = nextCircle,
			border = border,
			normal = normal,
			golden = golden,
			merge = merge,
			buy = buy,
		}
	end
	cell("starter", 0, 0)
	for row, family in Config.familyRules.order do
		for column, rarity in Config.familyRules.rarities do
			cell(family .. "_" .. rarity, column - 1, row)
		end
		local box = Candy.panel(
			choiceScroll,
			family,
			UDim2.new(1, -8, 0, 78),
			offset(2, (row - 1) * 86),
			true
		)
		local title = Candy.text(box, "Name", UDim2.new(0.72, -12, 0, 28), offset(6, 4), 17)
		local hint = Candy.text(box, "Hint", UDim2.new(0.72, -12, 0, 35), offset(6, 35), 13)
		local control = Candy.button(
			box,
			"Choose",
			UDim2.new(0.27, -6, 0, 44),
			UDim2.new(0.72, 0, 0, 16),
			"neutral",
			13
		)
		Candy.buttonIcon(control, "family_" .. family)
		control.input.Activated:Connect(function()
			if currentProfile and currentProfile.family ~= family then
				remote:FireServer("ChangeFamily", family)
				Candy.show(choose, false)
			end
		end)
		choiceRows[family] = { box = box, title = title, hint = hint }
		familyButtons[family] = control
	end
	for index = 1, 4 do
		local box = Candy.panel(
			familyScroll,
			"Skill" .. index,
			UDim2.new(1, -8, 0, 104),
			offset(2, (index - 1) * 112),
			true
		)
		local icon = Candy.icon(box, nil, offset(48, 48), offset(6, 8))
		local title = Candy.text(box, "Title", UDim2.new(0.72, -63, 0, 25), offset(59, 3), 15)
		local benefit = Candy.text(box, "Benefit", UDim2.new(0.72, -63, 0, 24), offset(59, 29), 13)
		local level = Candy.text(box, "Level", UDim2.new(0.72, -16, 0, 20), offset(8, 55), 12)
		local later = Candy.text(box, "Later", UDim2.new(0.72, -16, 0, 20), offset(8, 76), 11)
		local buy = Candy.button(
			box,
			"Buy",
			UDim2.new(0.27, -6, 0, 44),
			UDim2.new(0.72, 0, 0, 32),
			"coin",
			13
		)
		buy.input.Activated:Connect(function()
			if currentProfile and currentProfile.family then
				Remotes.event("UpgradeIntent"):FireServer("BuySkill", currentProfile.family, index)
			end
		end)
		skillRows[index] = {
			box = box,
			icon = icon,
			title = title,
			benefit = benefit,
			level = level,
			later = later,
			buy = buy,
		}
	end

	refresh = function(profile: any)
		currentProfile = profile
		if not profile then
			return
		end
		local locale = Strings.localeOf(player)
		collectionTitle.Text = translate("collection_tab")
			.. " · "
			.. (
				if profile.family
					then translate("family_" .. profile.family)
					else translate("family_none")
			)
		for id, view in cells do
			local pick = Config.pickaxes[id]
			local rarity = Config.progress.rarities[pick.rarity]
			local entry = profile.collection[id] or { count = 0, golden = 0 }
			local level = profile.circle.pickLevels[id] or 1
			local family = pick.family and Config.families[pick.family]
			view.name.Text = if pick.family
				then translate("family_" .. pick.family)
				else translate("pick_starter")
			view.stars.Text = string.rep("★", rarity.stars)
			local art = Config.art.pickaxes[id]
			Candy.setIcon(view.image, "pick")
			if art.placeholder then
				view.image.ImageColor3 = Color3.fromHex(art.color or "B58350")
			else
				view.image.Image, view.image.ImageRectSize, view.image.ImageRectOffset =
					art.icon, Vector2.zero, Vector2.zero
			end
			view.border.Color = if entry.golden > 0
				then Color3.fromHex("FFD23F")
				elseif profile.family == pick.family and family then Color3.fromHex(
					family.color
				)
				else Candy.ink
			view.count.Text = translate("pick_counts", entry.count, entry.golden)
			local strength =
				Power.strength(rarity, math.min(level, Power.cap(rarity)), profile.circle.cards)
			local goldStrength = Power.strength(rarity, level, profile.circle.cards, true)
			view.stats.Text = translate(
				"pick_stats",
				level,
				Format.stat(strength, locale),
				Format.stat(goldStrength, locale)
			)
			view.nextCircle.Text = if profile.nextFamily[id] then translate("family_next") else ""
			local shop = family and pick.rarity == "common" and not profile.boughtPickaxes[id]
			view.normal.box.Visible = entry.count > 0
			view.golden.box.Visible = entry.golden > 0
			view.merge.box.Visible = entry.count >= Config.familyRules.mergeNeed and id ~= "starter"
			view.buy.box.Visible = shop == true and entry.count == 0
			view.normal.text.Text, view.golden.text.Text, view.merge.text.Text =
				translate("pick_take"), translate("pick_gold"), translate("pick_merge")
			view.buy.text.Text = if family
				then translate("pick_buy") .. " " .. Format.short(family.price)
				else ""
			local canBuy = family
				and profile.deepestWorld >= family.world
				and profile.coins >= family.price
			Candy.paint(view.buy, if canBuy then "coin" else "disabled")
			Candy.paint(
				view.normal,
				if Family.canEquip(profile, id, false) then "confirm" else "disabled"
			)
			Candy.paint(
				view.golden,
				if Family.canEquip(profile, id, true) then "coin" else "disabled"
			)
			if shop and entry.count == 0 then
				view.stats.Text = translate("pick_shop", family.world, Format.short(family.price))
			end
		end
		local family = profile.family
		Candy.setIcon(familyIcon, if family then "family_" .. family else nil)
		choose.title.Text = translate("family_tab")
		changeFamily.text.Text = translate("family_change")
		familyTitle.Text = if family
			then translate("family_permanent") .. " · " .. translate(
				"family_level",
				translate("family_" .. family),
				Family.level(profile, family)
			)
			else translate("family_none")
		familyHint.Text = if family
			then translate("family_hint_" .. family)
			else translate("family_permanent")
		bonus.Text =
			translate("family_bonus", Format.stat((Family.coinBonus(profile) - 1) * 100, locale))
		local tomorrow = math.floor(os.time() / Config.familyRules.daySeconds)
			<= profile.familyChangeDay
		local ownedIndex = 0
		if tomorrow then
			changeFamily.text.Text = translate("family_tomorrow")
		end
		for _, id in Config.familyRules.order do
			local control, row = familyButtons[id], choiceRows[id]
			local owned = Family.best(profile, id) ~= nil
			row.box.Visible = owned
			if owned then
				Candy.move(row.box, offset(2, ownedIndex * 86))
				ownedIndex += 1
			end
			row.title.Text, row.hint.Text =
				translate("family_" .. id), translate("family_hint_" .. id)
			control.text.Text = if tomorrow and id ~= family
				then translate("family_tomorrow")
				elseif id == family then translate("family_current")
				else translate("family_change")
			Candy.paint(
				control,
				if id == family
					then "purple"
					elseif owned and not tomorrow then "confirm"
					else "disabled"
			)
		end
		for index, row in skillRows do
			row.box.Visible = family ~= nil
			if not family then
				continue
			end
			local cfg, levels = Config.families[family], profile.skills[family]
			local skill, level = cfg.skills[index], levels[index]
			local after = math.min(skill.cap, level + 1)
			local price = Family.skillPrice(level)
			local unlocked = Family.unlocked(profile, family, index)
			Candy.setIcon(row.icon, "skill_" .. family .. "_" .. index)
			row.title.Text = translate("skill_" .. family .. "_" .. index)
			local factor = if skill.effect == "stormSeconds" then 1 else 100
			row.benefit.Text = translate(
				if factor == 1 then "skill_seconds" else "skill_percent",
				Format.stat(skill.per * level * factor, locale),
				Format.stat(skill.per * after * factor, locale)
			)
			if skill.effect == "treasure" then
				row.benefit.Text = translate(
					"skill_treasure",
					level * skill.per * 100,
					after * skill.per * 100,
					level * Config.familyRules.chestFrequencyPerLevel * 100,
					after * Config.familyRules.chestFrequencyPerLevel * 100
				)
			end
			row.level.Text = if not unlocked
				then translate("skill_lock", skill.unlock)
				else translate("skill_level", level, Format.short(price))
			row.later.Text = if skill.deferred
				then translate("skill_later")
				elseif family == "dynamite" and index == 2 then translate("skill_eggs_later")
				else ""
			row.buy.text.Text = if level >= skill.cap
				then translate("upgrade_cap")
				else translate("pick_buy")
			Candy.paint(
				row.buy,
				if unlocked
						and level < skill.cap
						and profile.coins >= price
					then "coin"
					else "disabled"
			)
		end
	end
	return { collection = collectionPage, family = familyPage, refresh = refresh }
end

return Families
