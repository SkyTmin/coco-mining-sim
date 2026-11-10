--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local ProfileState = require(script.Parent.ProfileState)
local Kit = require(script.Parent.Ui.Kit)
local UserInputService = game:GetService("UserInputService")

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
	local gui = Kit.gui(playerGui, "Creative", 12, false)
	local open = Kit.button(
		gui,
		"CreativeButton",
		UDim2.fromOffset(106, 44),
		UDim2.new(1, -12, 0, 57),
		"iron",
		Vector2.new(1, 0)
	)
	local panel = Kit.image(
		gui,
		"Panel",
		UDim2.new(0.9, 0, 1, -30),
		UDim2.new(1, -12, 0.5, 0),
		"frame-wood",
		Vector2.new(1, 0.5)
	)
	panel.Visible, panel.Active = false, true
	local constraint = Instance.new("UISizeConstraint")
	constraint.MaxSize, constraint.Parent = Vector2.new(440, 430), panel
	local titlePlate = Kit.image(
		panel,
		"TitlePlate",
		UDim2.new(1, -67, 0, 44),
		UDim2.fromOffset(10, 7),
		"frame-iron"
	)
	local title = Kit.label(
		titlePlate,
		"Title",
		UDim2.new(1, -12, 1, -6),
		UDim2.fromOffset(6, 3),
		19,
		true,
		Kit.gold
	)
	local close = Kit.button(
		panel,
		"Close",
		UDim2.fromOffset(44, 44),
		UDim2.new(1, -10, 0, 7),
		"red",
		Vector2.new(1, 0),
		"i-x"
	)
	local controls =
		Kit.scroll(panel, "Controls", UDim2.new(1, -20, 0.73, -54), UDim2.fromOffset(10, 54))
	local function slot(index: number): TextButton
		local column, row = index % 4, index // 4
		return Kit.button(
			controls,
			"Control" .. index,
			UDim2.new(0.25, -5, 0, 44),
			UDim2.new(column / 4, 0, 0, row * 48),
			"iron"
		)
	end
	local toggle, coins10, coins1000, reset = slot(0), slot(1), slot(2), slot(3)
	toggle.Activated:Connect(function()
		creative:FireServer("toggle")
	end)
	coins10.Activated:Connect(function()
		creative:FireServer("coins", 10)
	end)
	coins1000.Activated:Connect(function()
		creative:FireServer("coins", 1000)
	end)
	reset.Activated:Connect(function()
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
	local operationButtons: { TextButton } = {}
	for i, op in operations do
		local control = slot(i + 3)
		control.Activated:Connect(function()
			creative:FireServer(table.unpack(op, 2))
		end)
		operationButtons[i] = control
	end

	local selectedWorld = 1
	local level, minus, plus, maxLevel = slot(12), slot(13), slot(14), slot(15)
	Kit.caption(minus, "−1")
	Kit.caption(plus, "+1")
	for control, change in { [minus] = -1, [plus] = 1, [maxLevel] = 0 } do
		control.Activated:Connect(function()
			creative:FireServer("mine.level", change)
		end)
	end
	local world, nextWorld, depth, beforePlate = slot(16), slot(17), slot(18), slot(19)
	Kit.caption(nextWorld, "→")
	nextWorld.Activated:Connect(function()
		selectedWorld = selectedWorld % #Config.worlds + 1
		Kit.caption(world, translate("creative_depth_world", selectedWorld))
	end)
	depth.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld)
	end)
	beforePlate.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld, true)
	end)

	local performance = Kit.label(
		panel,
		"Performance",
		UDim2.new(1, -20, 0, 24),
		UDim2.new(0, 10, 0.73, 0),
		13,
		true
	)
	local logs = Kit.scroll(panel, "Log", UDim2.new(1, -20, 0.27, -34), UDim2.new(0, 10, 0.73, 24))
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
		local color = if isError then Color3.fromRGB(255, 151, 151) else Kit.gold
		local row = Kit.label(
			logs,
			"Entry",
			UDim2.new(1, -8, 0, 0),
			UDim2.fromOffset(0, 0),
			13,
			false,
			color
		)
		row.AutomaticSize, row.LayoutOrder = Enum.AutomaticSize.Y, serial
		row.TextScaled, row.TextSize, row.TextWrapped = false, 13, true
		row.TextXAlignment, row.Text = Enum.TextXAlignment.Left, message
		table.insert(rows, row)
		if #rows > MAX_LOG_ROWS then
			table.remove(rows, 1):Destroy()
		end
	end)
	local function refresh()
		gui.Enabled = player:GetAttribute("CreativeAllowed") == true
		if not gui.Enabled then
			panel.Visible = false
			player:SetAttribute("MineMenuOpen", false)
		end
		title.Text = translate("creative_title")
		Kit.caption(open, title.Text)
		open.Visible = not panel.Visible
		local testing = player:GetAttribute("Creative") == true
		Kit.caption(toggle, translate(if testing then "creative_on" else "creative_off"))
		Kit.state(toggle, if testing then "green" else "iron")
		Kit.caption(coins10, translate("creative_multiply", 10))
		Kit.caption(coins1000, translate("creative_multiply", 1000))
		Kit.caption(reset, translate("creative_circle"))
		Kit.caption(maxLevel, translate("upgrade_max"))
		Kit.caption(world, translate("creative_depth_world", selectedWorld))
		Kit.caption(depth, translate("creative_depth_start"))
		Kit.caption(beforePlate, translate("creative_depth_plate"))
		local profile = ProfileState.getProfile()
		Kit.caption(
			level,
			translate(
				"creative_pick_level",
				if profile then profile.circle.pickLevels[profile.pickaxe] or 1 else 1
			)
		)
		for i, control in operationButtons do
			Kit.caption(control, translate(operations[i][1] :: string))
		end
		performance.Text = translate(
			"mine_perf",
			player:GetAttribute("MineFPS") or 0,
			player:GetAttribute("MineParts") or 0,
			player:GetAttribute("MineHitMs") or 0
		)
	end

	local function flip()
		if gui.Enabled then
			panel.Visible = not panel.Visible
			refresh()
			player:SetAttribute("MineMenuOpen", panel.Visible)
		end
	end

	open.Activated:Connect(flip)
	close.Activated:Connect(flip)
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
