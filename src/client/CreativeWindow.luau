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
			UDim2.new(0.25, -9, 0, 32),
			UDim2.new(column / 4, 2, 0, row * 37),
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
		{ "pick_plain_common", "mine.equip", "plain_common" },
		{ "pick_plain_rare", "mine.equip", "plain_rare" },
		{ "pick_plain_epic", "mine.equip", "plain_epic" },
		{ "pick_plain_legendary", "mine.equip", "plain_legendary" },
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

	local selectedWorld = 1
	local level, minus, plus, maxLevel = slot(12), slot(13), slot(14), slot(15)
	minus.text.Text, plus.text.Text = "−1", "+1"
	for control, change in { [minus] = -1, [plus] = 1, [maxLevel] = 0 } do
		control.input.Activated:Connect(function()
			creative:FireServer("mine.level", change)
		end)
	end
	local world, nextWorld, depth, beforePlate = slot(16), slot(17), slot(18), slot(19)
	nextWorld.text.Text = "→"
	nextWorld.input.Activated:Connect(function()
		selectedWorld = selectedWorld % #Config.worlds + 1
		world.text.Text = translate("creative_depth_world", selectedWorld)
	end)
	depth.input.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld)
	end)
	beforePlate.input.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld, true)
	end)
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
		modal.title.Text = translate("creative_title")
		open.text.Text = translate("creative_title")
		toggle.text.Text = translate(
			if player:GetAttribute("Creative") == true then "creative_on" else "creative_off"
		)
		coins10.text.Text, coins1000.text.Text =
			translate("creative_multiply", 10), translate("creative_multiply", 1000)
		reset.text.Text = translate("creative_circle")
		maxLevel.text.Text = translate("upgrade_max")
		world.text.Text = translate("creative_depth_world", selectedWorld)
		depth.text.Text, beforePlate.text.Text =
			translate("creative_depth_start"), translate("creative_depth_plate")
		local profile = ProfileState.getProfile()
		level.text.Text = translate(
			"creative_pick_level",
			if profile then profile.circle.pickLevels[profile.pickaxe] or 1 else 1
		)
		for i, control in operationButtons do
			control.text.Text = translate(operations[i][1] :: string)
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
		}
	do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	ProfileState.changed:Connect(refresh)
	refresh()
end

return CreativeWindow
