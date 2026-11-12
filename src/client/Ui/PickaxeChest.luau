--!strict
local TweenService = game:GetService("TweenService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Format = require(Shared.Format)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local ArtModel = require(Shared.Models.ArtModel)
local CelMesh = require(script.Parent.Parent.Fx.CelMesh)
local CelChestData = require(script.Parent.Parent.Fx.CelChestData)
local WallRenderer = require(script.Parent.Parent.Mine.WallRenderer)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)

local Chest = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale
local rules = Config.chests.pick
local shakeSeconds = 0.7
local chestArt = Config.art.chests.pick.model

local function addModel(parent: Frame, model: Model)
	local view = Instance.new("ViewportFrame")
	view.Name, view.BackgroundTransparency = "ChestModel", 1
	view.Size, view.Parent = scale(1, 1), parent
	-- size by the chest body, not by the glow and the sparkles around it [владелец 11.11: сундук мелкий и не по центру]
	local body = model.PrimaryPart
	local size = if body then body.Size else model:GetExtentsSize()
	local maxAxis = math.max(size.X, size.Y, size.Z)
	if maxAxis > 0 then
		model:ScaleTo(model:GetScale() * 2 / maxAxis)
	end
	model:PivotTo(CFrame.identity)
	model.Parent = view
	local camera = Instance.new("Camera")
	camera.FieldOfView = 40
	camera.CFrame, camera.Parent =
		CFrame.lookAt(Vector3.new(1.6, 1.7, 4.1), Vector3.new(0, -0.05, 0)), view
	view.CurrentCamera = camera
	CelMesh.animate(model)
end

local function resultCard(ctx: W.Context, page: Frame, claim: () -> (), again: () -> ())
	local overlay = Candy.frame(page, "ChestReveal", scale(1, 1), scale(0, 0), Candy.ink)
	overlay.ZIndex, overlay.Active, overlay.Visible, overlay.BackgroundTransparency =
		5, true, false, 0.24
	overlay.ClipsDescendants = true
	local rays = Candy.icon(overlay, "chest_rays", scale(1.65, 1.65), scale(0.5, 0.5))
	rays.AnchorPoint, rays.ImageTransparency = Vector2.new(0.5, 0.5), 0.28
	local card = Candy.panel(overlay, "Reward", scale(0.54, 0.92), scale(0.5, 0.49))
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	local tint = W.band(card, "RarityStripe", UDim2.new(1, -4, 0, 8), W.blue)
	local _, badge = W.pill(card, "ResultTag", scale(0.62, 0.105), scale(0.19, 0.085), W.green, 15)
	local pick = Candy.icon(card, "pickaxe", scale(0.70, 0.35), scale(0.15, 0.20))
	local name = Candy.text(card, "Name", scale(0.94, 0.11), scale(0.03, 0.56), 27)
	local rarity = Candy.text(card, "Rarity", scale(0.94, 0.08), scale(0.03, 0.67), 17)
	local hint = Candy.text(card, "NextRun", scale(0.94, 0.07), scale(0.03, 0.75), 12)
	local take = Candy.button(
		card,
		"Claim",
		UDim2.new(0.45, 0, 0, 46),
		UDim2.new(0.035, 0, 1, -51),
		"confirm",
		17
	)
	local repeatBuy = Candy.button(
		card,
		"Again",
		UDim2.new(0.45, 0, 0, 46),
		UDim2.new(0.515, 0, 1, -51),
		"robux",
		16
	)
	local zoom = Instance.new("UIScale")
	zoom.Parent = card
	local rotation: Tween? = nil
	local pop: Tween? = nil
	W.bind(ctx, take, claim)
	W.bind(ctx, repeatBuy, again)

	local function hide()
		overlay.Visible = false
		if rotation then
			rotation:Cancel()
			rotation = nil
		end
		if pop then
			pop:Cancel()
			pop = nil
		end
	end

	-- FamilyFx.chestOpen delivers the server result here. This is the replaceable reveal.
	local function reveal(result: any)
		hide()
		local color = W.rarityColors[result.rarity]
		tint.BackgroundColor3, rays.ImageColor3, rays.Rotation = color, color, 0
		badge.Text = ctx.t(if result.new then "pick_new" else "menu_duplicate")
		W.pickIcon(pick, result.id)
		name.Text = W.pickName(ctx.t, result.id)
		rarity.Text = W.stars(result.rarity) .. " " .. ctx.t("menu_rarity_" .. result.rarity)
		rarity.TextColor3 = W.rarityText[result.rarity]
		hint.Text = if result.nextFamily then ctx.t("family_next") else ""
		overlay.Visible = true
		if ProfileState.preference("reducedMotion") then
			zoom.Scale = 1
			return
		end
		zoom.Scale = 0.22
		pop = TweenService:Create(zoom, TweenInfo.new(0.52, Enum.EasingStyle.Back), { Scale = 1 })
		rotation = TweenService:Create(
			rays,
			TweenInfo.new(9, Enum.EasingStyle.Linear, Enum.EasingDirection.In, -1),
			{ Rotation = 360 }
		)
		pop:Play()
		rotation:Play()
	end

	return { hide = hide, reveal = reveal, claim = take, again = repeatBuy }
end

function Chest.new(ctx: W.Context, page: Frame)
	local t = ctx.t
	-- laid out like the pick screen [владелец 12.11: «пройдись по всему меню»]: the chest card on the left (44 %),
	-- the keys as a chip in its corner; on the right a left-aligned column — the odds as plain rows, the two
	-- guarantees as rows with a bar, and «Открыть» at the bottom, on the same line as «Улучшить» on the pick screen
	local preview, surface = Candy.panel(page, "ChestPreview", scale(0.44, 1), scale(0, 0), true)
	surface.BackgroundColor3 = Color3.fromHex("DDE2FF")
	preview:SetAttribute("ChestModel", chestArt)
	local art = Candy.frame(preview, "ChestArt", scale(0.8, 0.7), scale(0.5, 0.42))
	art.AnchorPoint = Vector2.new(0.5, 0.5)
	local template = CelMesh.template("chest_pickaxe", CelChestData.pickaxe, {
		size = 2,
		axes = "xyz",
		sizeAxes = "all",
		solidBounds = true,
		aura = WallRenderer.chestAura("pickaxe"),
	})
	local model = if template then template:Clone() else ArtModel.clone(chestArt)
	if model then
		addModel(art, model)
	else
		Candy.icon(art, "chest", scale(1, 1), scale(0, 0))
	end
	local keyBox =
		Candy.frame(preview, "Keys", UDim2.new(0.6, 0, 0, 36), UDim2.new(0.2, 0, 1, -48), Candy.ink)
	keyBox.BackgroundTransparency = 0.25
	Candy.round(keyBox, 0)
	Candy.stroke(keyBox, 2)
	Candy.icon(keyBox, "keys", scale(0.26, 0.8), scale(0.06, 0.1))
	local keyLabel =
		Candy.text(keyBox, "Label", scale(0.62, 0.76), scale(0.33, 0.12), 17, Candy.white)

	local right =
		Candy.frame(page, "ChestOdds", UDim2.new(0.56, -12, 1, 0), UDim2.new(0.44, 12, 0, 0))
	local info = Candy.frame(right, "Info", scale(1, 1), scale(0, 0))
	local oddsTitle = Candy.text(info, "Title", scale(0.8, 0.1), scale(0, 0), 19)
	oddsTitle.TextXAlignment = Enum.TextXAlignment.Left
	local ROW = 0.085
	local rows = {}
	for index, rarity in Config.familyRules.rarities do
		local y = 0.115 + (index - 1) * ROW
		local stars = Candy.text(
			info,
			"Stars_" .. rarity,
			scale(0.17, ROW),
			scale(0, y),
			14,
			W.rarityText[rarity]
		)
		stars.TextXAlignment = Enum.TextXAlignment.Left
		stars.Text = W.stars(rarity)
		local name = Candy.text(info, "Name_" .. rarity, scale(0.33, ROW), scale(0.18, y), 14)
		name.TextXAlignment = Enum.TextXAlignment.Left
		local bar = Candy.bar(
			info,
			scale(0.3, ROW * 0.45),
			scale(0.53, y + ROW * 0.275),
			W.rarityColors[rarity]
		)
		bar.Size = scale(rules.odds[rarity], 1)
		local value = Candy.text(info, "Odds_" .. rarity, scale(0.15, ROW), scale(0.85, y), 14)
		value.TextXAlignment = Enum.TextXAlignment.Right
		rows[rarity] = { name = name, value = value }
	end
	local familyText = Candy.text(info, "FamilyOdds", scale(1, 0.07), scale(0, 0.465), 12)
	familyText.TextXAlignment = Enum.TextXAlignment.Left
	familyText.TextColor3 = Color3.fromHex("6B6F8C")
	local pity = {}
	for index, key in { "epic", "legendary" } do
		local y = 0.56 + (index - 1) * 0.1
		local label = Candy.text(info, "Pity_" .. key, scale(0.6, 0.08), scale(0, y), 13)
		label.TextXAlignment = Enum.TextXAlignment.Left
		local bar = Candy.bar(info, scale(0.38, 0.04), scale(0.62, y + 0.02), W.rarityColors[key])
		Candy.stroke(bar.Parent :: Frame, 2)
		pity[key] = { label = label, bar = bar }
	end
	local open = Candy.button(right, "OpenChest", scale(1, 0.22), scale(0, 0.78), "robux", 20)
	Candy.buttonIcon(open, "keys")

	local profile: any
	local pending = false
	local requestAt = -math.huge
	local requestNumber = 0
	local result: any
	local shown = false
	local motion: Tween? = nil
	local refresh: (any) -> ()
	local reward: any

	local function idle()
		if motion then
			motion:Cancel()
			motion = nil
		end
		art.Position, art.Rotation = scale(0.5, 0.42), 0
		if shown and not pending and not ProfileState.preference("reducedMotion") then
			art.Rotation = -2
			motion = TweenService:Create(
				art,
				TweenInfo.new(1.1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
				{ Position = scale(0.5, 0.38), Rotation = 2 }
			)
			motion:Play()
		end
	end

	local function request()
		local now = os.clock()
		if
			not profile
			or profile.keys < 1
			or pending
			or now - requestAt < Config.familyRules.openInterval
		then
			return
		end
		requestAt, pending = now, true
		requestNumber += 1
		local serial = requestNumber
		result = nil
		reward.hide()
		idle()
		if not ProfileState.preference("reducedMotion") then
			art.Rotation = -9
			motion = TweenService:Create(
				art,
				TweenInfo.new(
					shakeSeconds / 8,
					Enum.EasingStyle.Sine,
					Enum.EasingDirection.InOut,
					3,
					true
				),
				{ Rotation = 9 }
			)
			motion:Play()
		end
		refresh(profile)
		Remotes.event("PickaxeIntent"):FireServer("OpenChest")
		task.delay(2.5, function()
			if requestNumber == serial and pending then
				pending = false
				idle()
				refresh(profile)
			end
		end)
	end

	reward = resultCard(ctx, page, function()
		result = nil
		reward.hide()
	end, request)
	W.bind(ctx, open, request, function()
		if profile and profile.pickChestsOpened == 0 then
			return t("pick_chest_first", t("family_" .. (profile.family or "storm")))
		end
		return t("menu_open_tip") .. "\n" .. t("pick_chest_families")
	end)

	refresh = function(current: any)
		profile = current
		local locale = Strings.localeOf(ctx.player)
		keyLabel.Text = t("pick_chest_keys", Format.short(profile.keys))
		oddsTitle.Text, familyText.Text = t("menu_odds"), t("menu_families_equal")
		for rarity, row in rows do
			row.name.Text = t("menu_rarity_" .. rarity)
			row.value.Text = Format.stat(rules.odds[rarity] * 100, locale) .. "%"
		end
		pity.epic.label.Text = t("menu_epic_pity", rules.pityEpic - profile.chestPity.epic)
		pity.legendary.label.Text =
			t("menu_legendary_pity", rules.pityLegendary - profile.chestPity.legendary)
		pity.epic.bar.Size = scale(profile.chestPity.epic / rules.pityEpic, 1)
		pity.legendary.bar.Size = scale(profile.chestPity.legendary / rules.pityLegendary, 1)
		open.text.Text = t(
			if pending
				then "menu_opening"
				elseif profile.keys > 0 then "menu_open_key"
				else "menu_no_keys"
		)
		Candy.paint(open, if profile.keys > 0 and not pending then "robux" else "disabled")
		reward.claim.text.Text, reward.again.text.Text = t("menu_claim"), t("menu_again")
		Candy.paint(reward.again, if profile.keys > 0 and not pending then "robux" else "disabled")
	end
	return {
		refresh = refresh,
		show = function(visible: boolean)
			if shown == visible then
				return
			end
			shown = visible
			idle()
			if shown and result and not pending then
				reward.reveal(result)
			elseif not shown then
				reward.hide()
			end
		end,
		result = function(value: any)
			result = value
			local serial = requestNumber
			local delay = math.max(0, shakeSeconds - (os.clock() - requestAt))
			task.delay(delay, function()
				if result ~= value or requestNumber ~= serial then
					return
				end
				pending = false
				idle()
				if profile then
					refresh(profile)
				end
				if shown then
					reward.reveal(value)
				end
			end)
		end,
	}
end

return Chest
