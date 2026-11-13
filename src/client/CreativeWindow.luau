--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local ProfileState = require(script.Parent.ProfileState)
local UserInputService = game:GetService("UserInputService")
local Candy = require(script.Parent.Ui.Candy)

type Translate = (string, ...any) -> string
local CreativeWindow = {}

local MAX_LOG_ROWS = 40
function CreativeWindow.start(
	player: Player,
	playerGui: Instance,
	translate: Translate,
	creative: RemoteEvent,
	serverLog: RemoteEvent
)
	local gui = Candy.layer(playerGui, "CreativeHUD", 6)
	gui.Visible = false
	local open = Candy.button(
		gui,
		"OpenCreative",
		UDim2.fromOffset(102, 23),
		UDim2.new(1, -15, 0, 73),
		"neutral",
		12
	)
	open.box.AnchorPoint = Vector2.new(1, 0)
	local modal = Candy.modal(
		playerGui,
		"Creative",
		UDim2.fromScale(0.78, 0.77),
		Candy.purple,
		function(show)
			player:SetAttribute("MineMenuOpen", show)
		end
	)
	local panel = modal.panel

	local controls = Instance.new("ScrollingFrame")
	Candy.fit(controls, UDim2.new(1, -24, 0.67, 0), UDim2.fromOffset(12, 25))
	controls.BackgroundTransparency, controls.BorderSizePixel = 1, 0
	controls.ScrollBarThickness = 4
	controls.CanvasSize = UDim2.fromOffset(0, 0)
	controls.AutomaticCanvasSize = Enum.AutomaticSize.Y
	controls.Parent = panel
	local function slot(index: number): Candy.Control
		local column, row = index % 4, index // 4
		return Candy.button(
			controls,
			"CreativeControl" .. index,
			UDim2.new(0.25, -9, 0, Config.creative.stage5.controlHeight),
			UDim2.new(column / 4, 2, 0, row * Config.creative.stage5.rowStep),
			"neutral",
			14
		)
	end
	local toggle, coins10, coins1000, reset = slot(0), slot(1), slot(2), slot(3)
	toggle.input.Activated:Connect(function()
		creative:FireServer("toggle")
	end)
	coins10.input.Activated:Connect(function()
		creative:FireServer("coins", 10)
	end)
	coins1000.input.Activated:Connect(function()
		creative:FireServer("coins", 1000)
	end)
	reset.input.Activated:Connect(function()
		creative:FireServer("mine.reset")
	end)
	local operations = {
		{ "pick_starter", "mine.equip", "starter" },
		{ "pick_storm_common", "mine.equip", "storm_common" },
		{ "mine_charge", "mine.charge" },
		{ "mine_stats", "mine.stats" },
	}
	local operationButtons: { Candy.Control } = {}
	for i, op in operations do
		local control = slot(i + 3)
		control.input.Activated:Connect(function()
			creative:FireServer(table.unpack(op, 2))
		end)
		operationButtons[i] = control
	end

	local level, minus, plus, maxLevel = slot(12), slot(13), slot(14), slot(15)
	minus.text.Text, plus.text.Text = "−1", "+1"
	for control, change in { [minus] = -1, [plus] = 1, [maxLevel] = 0 } do
		control.input.Activated:Connect(function()
			creative:FireServer("mine.level", change)
		end)
	end
	-- [владелец 11.11] one button per world moves straight to its start; «30 before slab» uses the current world
	local beforePlate = slot(16)
	beforePlate.input.Activated:Connect(function()
		creative:FireServer("mine.depth", 0, true)
	end)
	local worldButtons: { Candy.Control } = {}
	for index = 1, #Config.worlds do
		local control = slot(23 + index)
		control.input.Activated:Connect(function()
			creative:FireServer("mine.depth", index)
		end)
		worldButtons[index] = control
	end
	-- QA [владелец 11.11]: endless ult and a forced ult depth, both kept by the server as player attributes
	local ultEndless, ultLayers = slot(20), slot(21)
	ultEndless.input.Activated:Connect(function()
		creative:FireServer("mine.ultEndless")
	end)
	ultLayers.input.Activated:Connect(function()
		creative:FireServer("mine.ultLayers")
	end)
	local equipMode = false
	local grantMode = slot(34)
	grantMode.input.Activated:Connect(function()
		equipMode = not equipMode
		grantMode.text.Text = translate(if equipMode then "pick_take" else "pick_grant")
	end)
	local familyControls = {}
	local extras = {
		{ "creative_keys", "mine.keys" },
		{ "creative_collection_reset", "mine.collectionReset" },
		{ "creative_chests_100", "mine.chests100" },
		{ "creative_first_storm", "mine.staged", "firstStorm" },
		{ "creative_first_key", "mine.staged", "firstKey" },
	}
	for i, op in extras do
		local control = slot(34 + i)
		control.input.Activated:Connect(function()
			creative:FireServer(table.unpack(op, 2))
		end)
		table.insert(familyControls, { control = control, key = op[1] })
	end
	local grants, skills = {}, {}
	for familyIndex, family in Config.familyRules.order do
		local change = slot(40 + familyIndex - 1)
		change.input.Activated:Connect(function()
			creative:FireServer("mine.family", family)
		end)
		table.insert(familyControls, { control = change, key = "family_" .. family })
		for rarityIndex, rarity in Config.familyRules.rarities do
			for goldIndex = 0, 1 do
				local golden = goldIndex == 1
				local id = family .. "_" .. rarity
				local control = slot(44 + (familyIndex - 1) * 8 + (rarityIndex - 1) * 2 + goldIndex)
				Candy.buttonIcon(control, "family_" .. family)
				control.input.Activated:Connect(function()
					creative:FireServer(
						if equipMode then "mine.equip" else "mine.grant",
						id,
						golden
					)
				end)
				table.insert(
					grants,
					{ control = control, family = family, stars = rarityIndex, golden = golden }
				)
			end
		end
		for index = 1, 4 do
			local control = slot(76 + (familyIndex - 1) * 4 + index - 1)
			Candy.buttonIcon(control, "skill_" .. family .. "_" .. index)
			control.input.Activated:Connect(function()
				local profile = ProfileState.getProfile()
				if profile then
					creative:FireServer(
						"mine.skill",
						family,
						index,
						(profile.skills[family][index] + 1) % 11
					)
				end
			end)
			table.insert(skills, { control = control, family = family, index = index })
		end
	end
	local stageControls = {}
	local stageOps = {
		{ "creative_rebirth_cups", "rebirth.cups", Config.creative.stage5.cups },
		{ "creative_rebirth_plate", "rebirth.plate", Config.creative.stage5.plates },
		{ "vein_toast", "events.vein" },
		{ "bomb_toast", "events.bomb" },
		{ "fever_label", "events.fever" },
		{ "creative_streak", "streak.tier" },
		{ "creative_master_reset", "rebirth.masterReset" },
	}
	for i, op in stageOps do
		local control = slot(Config.creative.stage5.firstSlot + i - 1)
		local index = 0
		control.input.Activated:Connect(function()
			local value = nil
			if op[3] then
				index = index % #op[3] + 1
				value = op[3][index]
			elseif op[2] == "streak.tier" then
				index = (index + 1) % (#Config.events.streak.tiers + 1)
				value = index
			end
			creative:FireServer(op[2], value)
		end)
		table.insert(stageControls, { control = control, key = op[1] })
	end
	local performance =
		Candy.text(panel, "Performance", UDim2.new(1, -24, 0, 22), UDim2.new(0, 12, 0.75, 0), 14)

	local logs = Instance.new("ScrollingFrame")
	Candy.fit(logs, UDim2.new(1, -24, 0.24, -24), UDim2.new(0, 12, 0.75, 24))
	logs.BackgroundTransparency = 1
	logs.BorderSizePixel = 0
	logs.ScrollBarThickness = 5
	logs.ScrollingDirection = Enum.ScrollingDirection.Y
	logs.CanvasSize = UDim2.fromOffset(0, 0)
	logs.AutomaticCanvasSize = Enum.AutomaticSize.Y
	logs.Parent = panel
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 4)
	layout.Parent = logs
	logs:GetPropertyChangedSignal("AbsoluteCanvasSize"):Connect(function()
		logs.CanvasPosition =
			Vector2.new(0, math.max(0, logs.AbsoluteCanvasSize.Y - logs.AbsoluteWindowSize.Y))
	end)

	local rows: { TextLabel } = {}
	local serial = 0
	serverLog.OnClientEvent:Connect(function(message: string, isError: boolean)
		serial += 1
		local row = Instance.new("TextLabel")
		row.Size = UDim2.new(1, -8, 0, 0)
		row.AutomaticSize = Enum.AutomaticSize.Y
		row.BackgroundTransparency = 1
		row.LayoutOrder = serial
		row.FontFace = Candy.font
		row.TextXAlignment = Enum.TextXAlignment.Left
		row.TextSize = 14
		row.TextWrapped = true
		row.TextColor3 = if isError then Candy.red else Candy.ink
		row.Text = message
		row.Parent = logs
		table.insert(rows, row)
		if #rows > MAX_LOG_ROWS then
			table.remove(rows, 1):Destroy()
		end
	end)

	local function refresh()
		gui.Visible = player:GetAttribute("CreativeAllowed") == true
		if not gui.Visible then
			Candy.show(modal, false)
		end
		for _, row in stageControls do
			row.control.text.Text = translate(row.key)
		end
		modal.title.Text = translate("creative_title")
		open.text.Text = translate("creative_title")
		toggle.text.Text = translate(
			if player:GetAttribute("Creative") == true then "creative_on" else "creative_off"
		)
		coins10.text.Text, coins1000.text.Text =
			translate("creative_multiply", 10), translate("creative_multiply", 1000)
		reset.text.Text = translate("creative_circle")
		maxLevel.text.Text = translate("upgrade_max")
		for index, control in worldButtons do
			control.text.Text = translate("creative_depth_world", index)
		end
		beforePlate.text.Text = translate("creative_depth_plate")
		ultEndless.text.Text = translate(
			if player:GetAttribute("CreativeUltEndless") == true
				then "creative_ult_endless_on"
				else "creative_ult_endless_off"
		)
		local forced = player:GetAttribute("CreativeUltLayers")
		ultLayers.text.Text = if type(forced) == "number" and forced > 0
			then translate("creative_ult_layers", forced)
			else translate("creative_ult_auto")
		local profile = ProfileState.getProfile()
		level.text.Text = translate(
			"creative_pick_level",
			if profile then profile.circle.pickLevels[profile.pickaxe] or 1 else 1
		)
		for i, control in operationButtons do
			control.text.Text = translate(operations[i][1] :: string)
		end
		grantMode.text.Text = translate(if equipMode then "pick_take" else "pick_grant")
		for _, row in familyControls do
			row.control.text.Text = translate(row.key)
		end
		for _, row in grants do
			row.control.text.Text = string.rep("★", row.stars)
				.. (if row.golden then " ✦" else "")
		end
		for _, row in skills do
			row.control.text.Text = translate(
				"creative_skill",
				translate("family_" .. row.family):sub(
					1,
					(utf8.offset(translate("family_" .. row.family), 2) or 2) - 1
				),
				row.index,
				if profile then profile.skills[row.family][row.index] else 0
			)
		end
		performance.Text = translate(
			"mine_perf",
			player:GetAttribute("MineFPS") or 0,
			player:GetAttribute("MineParts") or 0,
			player:GetAttribute("MineHitMs") or 0
		)
	end

	local function flip()
		if gui.Visible then
			refresh()
			Candy.show(modal, not modal.open)
		end
	end

	open.input.Activated:Connect(flip)
	UserInputService.InputBegan:Connect(function(input, processed)
		if not processed and input.KeyCode == Enum.KeyCode.K then
			flip()
		end
	end)
	for _, attribute in
		{
			"CreativeAllowed",
			"Creative",
			"language",
			"MineLanguage",
			"MineFPS",
			"MineParts",
			"MineHitMs",
			"CreativeUltEndless",
			"CreativeUltLayers",
		}
	do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	ProfileState.changed:Connect(refresh)
	refresh()
end

return CreativeWindow
