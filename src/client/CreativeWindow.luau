--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local ProfileState = require(script.Parent.ProfileState)
local UserInputService = game:GetService("UserInputService")

type Translate = (string, ...any) -> string
local CreativeWindow = {}

local MAX_LOG_ROWS = 40
local PANEL_COLOR = Color3.fromRGB(18, 32, 60)
local BUTTON_COLOR = Color3.fromRGB(41, 66, 109)
local TEXT_COLOR = Color3.fromRGB(240, 245, 255)

local function button(parent: Instance, size: UDim2, position: UDim2): TextButton
	local item = Instance.new("TextButton")
	item.Size = size
	item.Position = position
	item.BackgroundColor3 = BUTTON_COLOR
	item.BorderSizePixel = 0
	item.Font = Enum.Font.GothamMedium
	item.TextColor3 = TEXT_COLOR
	item.TextSize = 13
	item.TextScaled = true
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize, limit.MaxTextSize, limit.Parent = 9, 14, item
	item.Text = ""
	item.Parent = parent
	return item
end

function CreativeWindow.start(
	player: Player,
	playerGui: Instance,
	translate: Translate,
	creative: RemoteEvent,
	serverLog: RemoteEvent
)
	local gui = Instance.new("ScreenGui")
	gui.Name = "Creative"
	gui.ResetOnSpawn = false
	gui.Enabled = false
	gui.DisplayOrder = 12

	local open = button(gui, UDim2.fromOffset(118, 32), UDim2.new(1, -75, 0, 8))
	open.AnchorPoint = Vector2.new(1, 0)

	local panel = Instance.new("Frame")
	panel.AnchorPoint = Vector2.new(1, 0)
	panel.Position = UDim2.new(1, -12, 0, 48)
	panel.Size = UDim2.new(0.9, 0, 1, -64)
	panel.BackgroundColor3 = PANEL_COLOR
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = gui

	local constraint = Instance.new("UISizeConstraint")
	constraint.MaxSize = Vector2.new(420, 400)
	constraint.Parent = panel
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 8)
	padding.PaddingBottom = UDim.new(0, 8)
	padding.PaddingLeft = UDim.new(0, 8)
	padding.PaddingRight = UDim.new(0, 8)
	padding.Parent = panel

	local controls = Instance.new("ScrollingFrame")
	controls.Size = UDim2.fromScale(1, 0.76)
	controls.BackgroundTransparency, controls.BorderSizePixel = 1, 0
	controls.ScrollBarThickness = 4
	controls.CanvasSize = UDim2.fromOffset(0, 0)
	controls.AutomaticCanvasSize = Enum.AutomaticSize.Y
	controls.Parent = panel
	local function slot(index: number): TextButton
		local column, row = index % 4, index // 4
		return button(controls, UDim2.new(0.25, -5, 0, 31), UDim2.new(column / 4, 0, 0, row * 35))
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
	minus.Text, plus.Text, maxLevel.Text = "−1", "+1", "↑"
	for control, change in { [minus] = -1, [plus] = 1, [maxLevel] = 0 } do
		control.Activated:Connect(function()
			creative:FireServer("mine.level", change)
		end)
	end
	local world, nextWorld, depth, beforePlate = slot(16), slot(17), slot(18), slot(19)
	nextWorld.Text = "↻"
	nextWorld.Activated:Connect(function()
		selectedWorld = selectedWorld % #Config.worlds + 1
		world.Text = translate("creative_depth_world", selectedWorld)
	end)
	depth.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld)
	end)
	beforePlate.Activated:Connect(function()
		creative:FireServer("mine.depth", selectedWorld, true)
	end)
	local performance = Instance.new("TextLabel")
	performance.Position, performance.Size = UDim2.fromScale(0, 0.76), UDim2.new(1, 0, 0, 24)
	performance.BackgroundTransparency, performance.TextColor3, performance.TextSize =
		1, TEXT_COLOR, 13
	performance.Text = ""
	performance.Parent = panel

	local logs = Instance.new("ScrollingFrame")
	logs.Position = UDim2.new(0, 0, 0.76, 24)
	logs.Size = UDim2.new(1, 0, 0.24, -24)
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
		row.Font = Enum.Font.Code
		row.TextXAlignment = Enum.TextXAlignment.Left
		row.TextSize = 14
		row.TextWrapped = true
		row.TextColor3 = if isError
			then Color3.fromRGB(255, 151, 151)
			else Color3.fromRGB(255, 220, 153)
		row.Text = message
		row.Parent = logs
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
		open.Text = translate("creative_title")
		toggle.Text = translate(
			if player:GetAttribute("Creative") == true then "creative_on" else "creative_off"
		)
		coins10.Text, coins1000.Text =
			translate("creative_multiply", 10), translate("creative_multiply", 1000)
		reset.Text = translate("creative_circle")
		world.Text = translate("creative_depth_world", selectedWorld)
		depth.Text, beforePlate.Text =
			translate("creative_depth_start"), translate("creative_depth_plate")
		local profile = ProfileState.getProfile()
		level.Text = translate(
			"creative_pick_level",
			if profile then profile.circle.pickLevels[profile.pickaxe] or 1 else 1
		)
		for i, control in operationButtons do
			control.Text = translate(operations[i][1] :: string)
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
			refresh()
			panel.Visible = not panel.Visible
			player:SetAttribute("MineMenuOpen", panel.Visible)
		end
	end

	open.Activated:Connect(flip)
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
	gui.Parent = playerGui
end

return CreativeWindow
