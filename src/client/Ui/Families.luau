--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Family = require(Shared.Play.Family)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)

local Families = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local order = Config.familyRules.order
local maxFamilyLevel = 40

function Families.affordable(profile: any): number
	local family = profile.family
	if not family then
		return 0
	end
	local count = 0
	for i, skill in Config.families[family].skills do
		local level = profile.skills[family][i]
		if
			Family.unlocked(profile, family, i)
			and level < skill.cap
			and profile.coins >= Family.skillPrice(level)
		then
			count += 1
		end
	end
	return count
end

function Families.new(ctx: W.Context, page: Frame)
	local t = ctx.t
	local profile: any
	local selected: string? = nil
	local refresh: (any, boolean) -> ()
	local pickaxe = Remotes.event("PickaxeIntent")
	local upgrades = Remotes.event("UpgradeIntent")
	local list = Candy.frame(page, "FamilyList", UDim2.new(0.26, -4, 1, 0), offset(2, 0))
	local tiles = {}
	for index, id in order do
		local button = Candy.button(
			list,
			id,
			UDim2.new(1, -4, 0.225, -3),
			UDim2.new(0, 0, (index - 1) * 0.249, 1),
			"neutral",
			16
		)
		Candy.buttonIcon(button, "family_" .. id)
		Candy.fit(button.image, scale(0.30, 0.84), scale(0.04, 0.08))
		Candy.fit(button.text, scale(0.62, 0.37), scale(0.35, 0.12))
		button.text.TextXAlignment = Enum.TextXAlignment.Left
		local hint = Candy.text(button.face, "Hint", scale(0.60, 0.39), scale(0.35, 0.51), 12)
		hint.TextXAlignment = Enum.TextXAlignment.Left
		local current, currentText = W.pill(
			button.face,
			"Current",
			UDim2.new(0.67, 0, 0, 16),
			UDim2.new(0.35, 0, 0, -7),
			W.green,
			10
		)
		tiles[id] = { button = button, hint = hint, current = current, currentText = currentText }
		W.bind(ctx, button, function()
			if profile then
				selected = id
				refresh(profile, false)
			end
		end, function()
			return t("family_hint_" .. id) .. "\n" .. t("menu_master_tip")
		end)
	end

	local detail =
		Candy.frame(page, "FamilyDetails", UDim2.new(0.74, -7, 1, 0), UDim2.new(0.26, 5, 0, 0))
	local levelPanel =
		Candy.panel(detail, "FamilyLevel", UDim2.new(1, -3, 0, 74), offset(1, 0), true)
	local title = Candy.text(levelPanel, "Title", UDim2.new(0.94, 0, 0, 20), offset(8, 4), 17)
	title.TextXAlignment = Enum.TextXAlignment.Left
	local levelText = Candy.text(levelPanel, "Level", UDim2.new(0.94, 0, 0, 14), offset(8, 24), 12)
	levelText.TextXAlignment = Enum.TextXAlignment.Left
	local fill = Candy.bar(levelPanel, UDim2.new(1, -32, 0, 12), offset(12, 48), W.blue)
	local track = fill.Parent :: Frame
	Candy.stroke(track, 2)
	local marks = {}
	for _, level in { 3, 8, 15, maxFamilyLevel } do
		local box, text = W.pill(
			track,
			"Milestone" .. level,
			offset(21, 21),
			scale(level / maxFamilyLevel, 0.5),
			Candy.panelColor,
			11
		)
		Candy.round(box, 0)
		box.AnchorPoint = Vector2.new(0.5, 0.5)
		text.Text = tostring(level)
		marks[level] = box
	end
	local choose = Candy.button(
		levelPanel,
		"Choose",
		UDim2.new(0.33, -5, 0, 47),
		UDim2.new(0.66, 0, 0.5, -23),
		"confirm",
		15
	)
	local switchEnabled = false
	local switchHelp = ""
	W.bind(ctx, choose, function()
		if switchEnabled and selected then
			pickaxe:FireServer("ChangeFamily", selected)
		end
	end, function()
		return switchHelp
	end)

	local skillGrid = Candy.frame(detail, "Skills", UDim2.new(1, 0, 1, -85), offset(0, 82))
	local skills = {}
	for index = 1, 4 do
		local card, surface = Candy.panel(
			skillGrid,
			"Skill" .. index,
			UDim2.new(0.25, -6, 1, -3),
			UDim2.new((index - 1) / 4, 2, 0, 0)
		)
		local content = Candy.frame(card, "Content", UDim2.new(1, 0, 1, -50), offset(0, 0))
		local circle, icon =
			W.iconCircle(content, "skill_storm_" .. index, scale(0.66, 0.46), scale(0.5, 0.245))
		circle.AnchorPoint = Vector2.new(0.5, 0.5)
		local name = Candy.text(content, "Name", scale(0.94, 0.23), scale(0.03, 0.48), 16)
		local pips = {}
		for pip = 1, 10 do
			local cell = Candy.frame(
				content,
				"Pip" .. pip,
				scale(0.075, 0.052),
				scale(0.048 + (pip - 1) * 0.092, 0.72),
				Candy.rowColor
			)
			Candy.round(cell, 3)
			Candy.stroke(cell, 1)
			pips[pip] = cell
		end
		local _, value =
			W.pill(content, "Benefit", scale(0.91, 0.17), scale(0.045, 0.80), Candy.rowColor, 13)
		local at = UDim2.new(0.04, 0, 1, -49)
		local buy = Candy.button(card, "BuySkill", UDim2.new(0.92, 0, 0, 46), at, "coin", 16)
		local locked = Candy.button(card, "Locked", UDim2.new(0.92, 0, 0, 46), at, "neutral", 11)
		locked.shadow.Visible = false
		locked.face.BackgroundTransparency = 1
		local outline = locked.face:FindFirstChildOfClass("UIStroke")
		if outline then
			outline.Enabled = false
		end
		W.dashes(locked.face)
		Candy.buttonIcon(locked, "lock")
		Candy.buttonIcon(buy, "coin")
		local view = {
			circle = circle,
			icon = icon,
			name = name,
			pips = pips,
			value = value,
			buy = buy,
			locked = locked,
			surface = surface,
			affordable = false,
			help = "",
		}
		skills[index] = view
		local function help(): string
			return view.help
		end
		W.bind(ctx, buy, function()
			if selected and view.affordable then
				upgrades:FireServer("BuySkill", selected, index)
			end
		end, help)
		W.bind(ctx, locked, function() end, help)
	end

	local previous: { [string]: { number } } = {}
	refresh = function(current: any, animate: boolean)
		profile = current
		local family = selected or profile.family or order[1]
		selected = family
		local config = Config.families[family]
		local color = W.familyColors[family]
		local familyLevel = Family.level(profile, family)
		local levels = profile.skills[family]
		local before = previous[family]
		local locale = Strings.localeOf(ctx.player)
		for id, tile in tiles do
			tile.button.text.Text = t("family_" .. id)
			tile.hint.Text = t("menu_family_" .. id)
			tile.currentText.Text = t("family_current")
			tile.current.Visible = profile.family == id
			Candy.paint(tile.button, if id == family then "coin" else "neutral")
		end

		local isCurrent = family == profile.family
		local hasPick = Family.best(profile, family) ~= nil
		local now = os.time()
		local daySeconds = Config.familyRules.daySeconds
		local waitTime = math.floor(now / daySeconds) <= profile.familyChangeDay
		switchEnabled = not isCurrent and hasPick and not waitTime
		switchHelp = if not hasPick then t("menu_choose_needs_pick") else t("menu_choose_tip")
		choose.box.Visible = not isCurrent
		local minutes =
			math.max(0, math.ceil(((profile.familyChangeDay + 1) * daySeconds - now) / 60))
		choose.text.Text = if hasPick and waitTime
			then t("menu_choose_wait", minutes // 60, minutes % 60)
			else t("menu_choose")
		Candy.paint(choose, if switchEnabled then "confirm" else "disabled")
		title.Text = t("family_" .. family) .. " · " .. t("menu_family_" .. family)
		levelText.Text = t("upgrade_level", t("menu_fraction", familyLevel, maxFamilyLevel))
		local width = if isCurrent then 1 else 0.63
		Candy.fit(title, UDim2.new(width, -12, 0, 20), offset(8, 4))
		Candy.fit(levelText, UDim2.new(width, -12, 0, 14), offset(8, 24))
		Candy.fit(track, UDim2.new(width, -28, 0, 12), offset(12, 48))
		fill.BackgroundColor3, fill.Size = color, scale(familyLevel / maxFamilyLevel, 1)
		for milestone, mark in marks do
			mark.BackgroundColor3 = if familyLevel >= milestone then W.yellow else Candy.panelColor
		end

		for index, view in skills do
			local skill, level = config.skills[index], levels[index]
			local nextLevel = math.min(level + 1, skill.cap)
			local closed = familyLevel < skill.unlock
			local price = Family.skillPrice(level)
			view.affordable = Family.unlocked(profile, family, index)
				and level < skill.cap
				and profile.coins >= price
			Candy.setIcon(view.icon, "skill_" .. family .. "_" .. index)
			view.circle.BackgroundColor3 = color
			view.icon.ImageTransparency = if closed then 0.42 else 0
			view.surface.BackgroundColor3 = if closed then Candy.rowColor else Candy.panelColor
			view.name.Text = t("skill_" .. family .. "_" .. index)
			view.name.TextTransparency = if closed then 0.27 else 0
			local seconds = skill.effect == "stormSeconds"
			local factor = if seconds then 1 else 100
			local value = Format.stat(skill.per * level * factor, locale)
			local nextValue = Format.stat(skill.per * nextLevel * factor, locale)
			local beforeValue = if seconds then t("menu_seconds", value) else "+" .. value .. "%"
			local afterValue = if seconds
				then t("menu_seconds", nextValue)
				else "+" .. nextValue .. "%"
			view.value.Text = beforeValue
				.. (if level < skill.cap then " → " .. afterValue else "")
			for pip, cell in view.pips do
				cell.BackgroundColor3 = if pip <= level then color else Candy.rowColor
			end
			view.buy.box.Visible, view.locked.box.Visible = not closed, closed
			view.buy.text.Text = if level < skill.cap then Format.short(price) else t("upgrade_cap")
			view.locked.text.Text = t("menu_unlock_skill", skill.unlock)
			Candy.paint(view.buy, if view.affordable then "coin" else "disabled")
			view.help = if skill.effect == "treasure"
				then t(
					"skill_treasure",
					value,
					nextValue,
					Format.stat(level * Config.familyRules.chestFrequencyPerLevel * 100, locale),
					Format.stat(nextLevel * Config.familyRules.chestFrequencyPerLevel * 100, locale)
				)
				else t(
					if seconds then "skill_seconds" else "skill_percent",
					t("skill_effect_" .. skill.effect),
					value,
					nextValue
				)
			if closed then
				view.help = t("menu_unlock_skill", skill.unlock) .. "\n" .. view.help
			elseif not isCurrent then
				view.help = t("menu_choose_skill") .. "\n" .. view.help
			elseif skill.deferred or (family == "dynamite" and index == 2) then
				view.help ..= "\n" .. t(
					if skill.deferred then "skill_later" else "skill_eggs_later"
				)
			end
			if animate and before and level > before[index] then
				W.bump(view.icon, ctx, true)
			end
		end
		previous[family] = table.clone(levels)
	end

	return { refresh = refresh }
end

return Families
