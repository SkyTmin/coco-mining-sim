--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Family = require(Shared.Play.Family)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)
local RewardBurst = require(script.Parent.Parent.Fx.RewardBurst)

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
	-- the page grid (W.HEAD / W.BODY) [владелец 12.11: «неровно»]: the families as tabs in the header row (as in the
	-- collection, no second column beside the rail); below it one strip with the family level and «Выбрать»; then
	-- the four skills as the same upgrade cards as the circle cards
	local header = Candy.frame(page, "FamilyTabs", UDim2.new(1, -W.CLOSE, W.HEAD, 0), scale(0, 0))
	local tiles = {}
	local tabBoxes = {}
	for _, id in order do
		local button = Candy.button(header, id, scale(0.25, 1), scale(0, 0), "neutral", 15)
		local dot =
			Candy.frame(button.face, "Dot", offset(12, 12), scale(0.1, 0.5), W.familyColors[id])
		dot.AnchorPoint = Vector2.new(0, 0.5)
		Candy.round(dot, 0)
		Candy.stroke(dot, 2)
		Candy.fit(button.text, scale(0.72, 0.8), scale(0.24, 0.1))
		table.insert(tabBoxes, button.box)
		tiles[id] = { button = button }
		W.bind(ctx, button, function()
			if profile then
				selected = id
				refresh(profile, false)
			end
		end, function()
			return t("family_hint_" .. id) .. "\n" .. t("menu_master_tip")
		end)
	end
	W.row(tabBoxes, UDim.new(0, 0), UDim.new(1, 0))

	local STRIP = 0.19
	-- the family level lies straight on the window (no box round it: one frame less between the eye and the skills)
	local levelPanel = Candy.frame(page, "FamilyLevel", scale(1, STRIP), scale(0, W.BODY))
	local title = Candy.text(levelPanel, "Title", scale(0.42, 0.42), scale(0, 0.06), 16)
	title.TextXAlignment = Enum.TextXAlignment.Left
	local levelText = Candy.text(levelPanel, "Level", scale(0.22, 0.42), scale(0.42, 0.06), 15)
	levelText.TextXAlignment = Enum.TextXAlignment.Right
	local fill =
		Candy.bar(levelPanel, UDim2.new(0.64, -12, 0.2, 0), UDim2.new(0, 2, 0.6, 0), W.blue)
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
	local choose =
		Candy.button(levelPanel, "Choose", scale(0.32, 0.8), scale(0.68, 0.1), "confirm", 15)
	local current, currentText =
		W.pill(levelPanel, "Current", scale(0.32, 0.8), scale(0.68, 0.1), W.green, 15)
	currentText.TextColor3 = Candy.white
	local switchEnabled = false
	local switchHelp = ""
	W.bind(ctx, choose, function()
		if switchEnabled and selected then
			pickaxe:FireServer("ChangeFamily", selected)
		end
	end, function()
		return switchHelp
	end)

	local skillTop = W.BODY + STRIP + 0.035
	local skillGrid = Candy.frame(page, "Skills", scale(1, 1 - skillTop), scale(0, skillTop))
	local skills = {}
	local cardBoxes = {}
	for index = 1, 4 do
		local card = W.upgradeCard(
			skillGrid,
			"Skill" .. index,
			W.familyColors.storm,
			"skill_storm_" .. index
		)
		table.insert(cardBoxes, card.box)
		local view = {
			band = card.band,
			circle = card.circle,
			icon = card.icon,
			name = card.name,
			level = card.level,
			value = card.value,
			buy = card.buy,
			locked = card.locked,
			surface = card.surface,
			shadow = card.box:FindFirstChild("Shadow") :: Frame,
			affordable = false,
			help = "",
		}
		skills[index] = view
		local function help(): string
			return view.help
		end
		W.bind(ctx, card.buy, function()
			if selected and view.affordable then
				upgrades:FireServer("BuySkill", selected, index)
			end
		end, help)
		W.bind(ctx, card.locked, function() end, help)
	end
	W.row(cardBoxes, UDim.new(0, 0), UDim.new(1, 0), nil, W.CARD_GAP)

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
			-- the family of this circle carries a tick
			tile.button.text.Text = (if profile.family == id then "✓ " else "")
				.. t("family_" .. id)
			W.tab(tile.button, id == family)
		end

		local isCurrent = family == profile.family
		local hasPick = Family.best(profile, family) ~= nil
		local now = os.time()
		local daySeconds = Config.familyRules.daySeconds
		local waitTime = math.floor(now / daySeconds) <= profile.familyChangeDay
		switchEnabled = not isCurrent and hasPick and not waitTime
		switchHelp = if not hasPick then t("menu_choose_needs_pick") else t("menu_choose_tip")
		choose.box.Visible, current.Visible = not isCurrent, isCurrent
		currentText.Text = "✓ " .. t("menu_this_run")
		local minutes =
			math.max(0, math.ceil(((profile.familyChangeDay + 1) * daySeconds - now) / 60))
		choose.text.Text = if hasPick and waitTime
			then t("menu_choose_wait", minutes // 60, minutes % 60)
			else t("menu_choose")
		Candy.paint(choose, if switchEnabled then "confirm" else "disabled")
		title.Text = t("menu_family_" .. family)
		levelText.Text = t("upgrade_level", t("menu_fraction", familyLevel, maxFamilyLevel))
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
			view.band.BackgroundColor3 = color
			view.icon.ImageTransparency = if closed then 0.42 else 0
			-- a closed skill steps back (flat, see-through) so the eye goes to what can be bought now
			view.surface.BackgroundColor3 = if closed then Candy.rowColor else Candy.panelColor
			view.surface.BackgroundTransparency = if closed then 0.45 else 0
			view.shadow.Visible = not closed
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
			view.level.Text = t("upgrade_level", t("menu_fraction", level, skill.cap))
			view.buy.box.Visible, view.locked.box.Visible = not closed, closed
			view.buy.text.Text = if level < skill.cap then Format.short(price) else t("upgrade_cap")
			view.locked.text.Text = t("menu_unlock_level", skill.unlock)
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
				RewardBurst.show({
					icon = "skill_" .. family .. "_" .. index,
					palette = RewardBurst.palettes[family],
					kicker = t("burst_skill_up"),
					title = t("skill_" .. family .. "_" .. index),
					subtitle = t("burst_level", level),
				})
			end
		end
		previous[family] = table.clone(levels)
	end

	return { refresh = refresh }
end

return Families
