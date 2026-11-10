--!strict

local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

type Translate = (string, ...any) -> string
local CreativeWindow = {}

local COIN_STEP = 100
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
	item.TextSize = 14
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
	panel.Size = UDim2.new(0.9, 0, 0, 310)
	panel.BackgroundColor3 = PANEL_COLOR
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = gui

	local constraint = Instance.new("UISizeConstraint")
	constraint.MaxSize = Vector2.new(420, 310)
	constraint.Parent = panel
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 8)
	padding.PaddingBottom = UDim.new(0, 8)
	padding.PaddingLeft = UDim.new(0, 8)
	padding.PaddingRight = UDim.new(0, 8)
	padding.Parent = panel

	local studio = RunService:IsStudio()
	local columns = if studio then 3 else 2
	local toggle = button(panel, UDim2.new(1 / columns, -4, 0, 32), UDim2.fromOffset(0, 0))
	local coins = button(panel, UDim2.new(1 / columns, -4, 0, 32), UDim2.fromScale(1 / columns, 0))
	toggle.Activated:Connect(function()
		creative:FireServer("toggle")
	end)
	coins.Activated:Connect(function()
		creative:FireServer("coins", COIN_STEP)
	end)
	local reset: TextButton? = nil
	if studio then
		reset = button(panel, UDim2.new(1 / columns, -4, 0, 32), UDim2.fromScale(2 / columns, 0))
		reset.Activated:Connect(function()
			creative:FireServer("reset")
		end)
	end

	local operations = {
		{ "mine_equip_starter", "mine.equip", "starter" },
		{ "mine_equip_storm", "mine.equip", "storm_common" },
		{ "mine_drill", "mine.drill", 0, 1, 5000 },
		{ "mine_layers", "mine.layers", 100 },
		{ "mine_to_plate", "mine.toPlate" },
		{ "mine_charge", "mine.charge" },
		{ "mine_stats", "mine.stats" },
	}
	if studio then
		table.insert(operations, { "mine_reset", "mine.reset" })
	end
	local operationButtons: { TextButton } = {}
	for i, op in operations do
		local col, row = (i - 1) % 3, (i - 1) // 3
		local control =
			button(panel, UDim2.new(1 / 3, -4, 0, 31), UDim2.new(col / 3, 0, 0, 37 + row * 35))
		control.Activated:Connect(function()
			creative:FireServer(table.unpack(op, 2))
		end)
		operationButtons[i] = control
	end

	local performance = Instance.new("TextLabel")
	performance.Position, performance.Size = UDim2.fromOffset(0, 143), UDim2.new(1, 0, 0, 24)
	performance.BackgroundTransparency, performance.TextColor3, performance.TextSize =
		1, TEXT_COLOR, 13
	performance.Text = ""
	performance.Parent = panel

	local logs = Instance.new("ScrollingFrame")
	logs.Position = UDim2.fromOffset(0, 170)
	logs.Size = UDim2.new(1, 0, 1, -170)
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
		coins.Text = translate("creative_coins", COIN_STEP)
		if reset then
			reset.Text = translate("creative_reset")
		end
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
		{ "CreativeAllowed", "Creative", "language", "MineFPS", "MineParts", "MineHitMs" }
	do
		player:GetAttributeChangedSignal(attribute):Connect(refresh)
	end
	refresh()
	gui.Parent = playerGui
end

return CreativeWindow
