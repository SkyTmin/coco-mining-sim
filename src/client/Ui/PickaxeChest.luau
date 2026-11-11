--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Strings = require(Shared.Strings)
local Format = require(Shared.Format)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local ArtModel = require(Shared.Models.ArtModel)
local PickaxeChest = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

function PickaxeChest.new(
	parent: Instance,
	player: Player,
	translate: (string, ...any) -> string,
	wallet: Frame
)
	local open =
		Candy.button(wallet, "Keys", UDim2.new(1, 0, 0, 36), UDim2.new(0, 0, 1, 8), "coin", 15)
	Candy.buttonIcon(open, "keys")
	local refresh: () -> ()
	local modal = Candy.modal(
		parent,
		"PickaxeChest",
		scale(0.78, 0.77),
		Candy.purple,
		function(show)
			player:SetAttribute("MineMenuOpen", show)
			if show then
				refresh()
			end
		end
	)
	local panel = modal.panel
	panel:SetAttribute("ChestModel", Config.art.chests.pick.model)
	local preview = Instance.new("ViewportFrame")
	preview.Name, preview.BackgroundTransparency = "ChestModel", 1
	Candy.fit(preview, offset(44, 44), offset(12, 24))
	local model = ArtModel.clone(Config.art.chests.pick.model)
	if not model then
		model = Instance.new("Model")
		local cube = Instance.new("Part")
		cube.Size, cube.Color, cube.Anchored, cube.Parent =
			Vector3.one * 2, Color3.fromHex("FFD23F"), true, model
	end
	local size = model:GetExtentsSize()
	model:ScaleTo(model:GetScale() * 2 / math.max(size.X, size.Y, size.Z))
	model:PivotTo(CFrame.identity)
	model.Parent = preview
	local camera = Instance.new("Camera")
	camera.CFrame, camera.Parent = CFrame.lookAt(Vector3.new(4, 3, 4), Vector3.zero), preview
	preview.CurrentCamera, preview.Parent = camera, panel
	local keys =
		Candy.text(panel, "Keys", UDim2.new(1, -30, 0.10, 0), UDim2.new(0, 15, 0.10, 0), 18)
	local odds =
		Candy.text(panel, "Odds", UDim2.new(1, -30, 0.16, 0), UDim2.new(0, 15, 0.22, 0), 14)
	local familyOdds =
		Candy.text(panel, "FamilyOdds", UDim2.new(1, -30, 0.10, 0), UDim2.new(0, 15, 0.39, 0), 12)
	local pity =
		Candy.text(panel, "Pity", UDim2.new(1, -30, 0.10, 0), UDim2.new(0, 15, 0.50, 0), 14)
	local resultCard = Candy.panel(
		panel,
		"ResultCard",
		UDim2.new(1, -30, 0.14, 0),
		UDim2.new(0, 15, 0.61, 0),
		true
	)
	local resultText = Candy.text(resultCard, "Result", scale(0.96, 0.92), scale(0.02, 0.04), 16)
	local buy = Candy.button(
		panel,
		"Open",
		UDim2.new(0, 180, 0.17, 0),
		UDim2.new(0.5, -90, 0.80, 0),
		"coin",
		17
	)
	local lastAt, lastResult = -math.huge, nil
	refresh = function()
		local profile = ProfileState.getProfile()
		local locale = Strings.localeOf(player)
		modal.title.Text = translate("pick_chest_title")
		open.text.Text = Format.short(if profile then profile.keys else 0)
		if not profile then
			return
		end
		keys.Text = translate("pick_chest_keys", Format.short(profile.keys))
		local values = {}
		for _, rarity in Config.familyRules.rarities do
			table.insert(values, Format.stat(Config.chests.pick.odds[rarity] * 100, locale))
		end
		odds.Text = translate("pick_chest_odds", table.unpack(values))
		familyOdds.Text = translate("pick_chest_families")
		pity.Text = translate(
			"pick_chest_pity",
			Config.chests.pick.pityEpic - profile.chestPity.epic,
			Config.chests.pick.pityLegendary - profile.chestPity.legendary
		)
		buy.text.Text = translate("pick_chest_open")
		Candy.paint(buy, if profile.keys >= 1 then "coin" else "disabled")
		if lastResult then
			local result = lastResult
			resultText.Text = translate("family_" .. result.family)
				.. " "
				.. string.rep("★", Config.progress.rarities[result.rarity].stars)
				.. " · "
				.. translate(if result.new then "pick_new" else "pick_duplicate")
				.. (if result.nextFamily then " · " .. translate("family_next") else "")
		elseif profile.pickChestsOpened == 0 then
			resultText.Text =
				translate("pick_chest_first", translate("family_" .. (profile.family or "storm")))
		end
	end
	open.input.Activated:Connect(function()
		Candy.show(modal, true)
	end)
	buy.input.Activated:Connect(function()
		local now = os.clock()
		if now - lastAt < Config.familyRules.openInterval then
			return
		end
		lastAt = now
		Remotes.event("PickaxeIntent"):FireServer("OpenChest")
	end)
	ProfileState.changed:Connect(refresh)
	for _, name in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(name):Connect(refresh)
	end
	refresh()
	return {
		result = function(result: any)
			lastResult = result
			refresh()
			Candy.show(modal, true)
		end,
	}
end

return PickaxeChest
