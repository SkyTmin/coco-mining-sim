--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Strings = require(Shared.Strings)
local Sfx = require(Shared.Sfx)
local ProfileState = require(script.Parent.Parent.ProfileState)

local SettingsPanel = {}
local INK = Color3.fromRGB(36, 57, 83)
local CREAM = Color3.fromRGB(255, 243, 220)
local FILL = Color3.fromRGB(234, 226, 212)
local SELECTED = Color3.fromRGB(178, 222, 247)

local function round(parent: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius, corner.Parent = UDim.new(0, radius), parent
end

local function button(
	parent: Instance,
	name: string,
	x: number,
	y: number,
	w: number,
	h: number
): TextButton
	local b = Instance.new("TextButton")
	b.Name, b.Position, b.Size = name, UDim2.fromOffset(x, y), UDim2.fromOffset(w, h)
	b.Font, b.TextSize, b.TextColor3 = Enum.Font.GothamMedium, 14, INK
	b.BackgroundColor3, b.BorderSizePixel, b.Parent = FILL, 0, parent
	round(b, 7)
	return b
end

local function label(
	parent: Instance,
	name: string,
	x: number,
	y: number,
	w: number,
	h: number
): TextLabel
	local t = Instance.new("TextLabel")
	t.Name, t.Position, t.Size = name, UDim2.fromOffset(x, y), UDim2.fromOffset(w, h)
	t.Font, t.TextSize, t.TextColor3 = Enum.Font.GothamBold, 15, INK
	t.TextXAlignment, t.BackgroundTransparency, t.Parent = Enum.TextXAlignment.Left, 1, parent
	return t
end

function SettingsPanel.start(
	player: Player,
	parent: Instance,
	gear: TextButton,
	translate: (string, ...any) -> string
): () -> ()
	local gui = Instance.new("ScreenGui")
	gui.Name, gui.DisplayOrder, gui.Enabled, gui.ResetOnSpawn = "MineSettings", 15, false, false
	gui.IgnoreGuiInset, gui.ScreenInsets = true, Enum.ScreenInsets.DeviceSafeInsets
	local panel = Instance.new("Frame")
	panel.Name, panel.AnchorPoint, panel.Position, panel.Size =
		"Panel", Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(276, 208)
	panel.BackgroundColor3, panel.BorderSizePixel, panel.Active, panel.Parent = CREAM, 0, true, gui
	round(panel, 12)
	local title = label(panel, "Title", 12, 5, 196, 33)
	title.TextSize = 18
	local close = button(panel, "Close", 235, 6, 30, 29)
	local languages: { [string]: TextButton } = {}
	for i, language in Config.game.languages do
		languages[language] = button(
			panel,
			"Language_" .. language,
			12 + ((i - 1) % 2) * 128,
			43 + ((i - 1) // 2) * 34,
			124,
			29
		)
	end
	local volume = label(panel, "Sound", 12, 111, 166, 27)
	local down, up =
		button(panel, "SoundDown", 193, 111, 32, 27), button(panel, "SoundUp", 232, 111, 32, 27)
	local vibration = label(panel, "Vibration", 12, 142, 180, 27)
	local haptics = button(panel, "Haptics", 193, 142, 71, 27)
	local shake = label(panel, "Shake", 12, 173, 180, 27)
	local motion = button(panel, "ReducedMotion", 193, 173, 71, 27)

	local function refresh()
		title.Text, close.Text = translate("mine_settings"), translate("mine_settings_close")
		volume.Text =
			translate("mine_settings_sfx", math.round(ProfileState.preference("sfx") * 100))
		down.Text, up.Text = translate("mine_settings_down"), translate("mine_settings_up")
		vibration.Text, shake.Text =
			translate("mine_settings_haptics"), translate("mine_settings_motion")
		for key, control in { haptics = haptics, reducedMotion = motion } do
			local enabled = ProfileState.preference(key)
			control.Text = translate(if enabled then "mine_settings_on" else "mine_settings_off")
			control.BackgroundColor3 = if enabled then SELECTED else FILL
		end
		local current = Strings.localeOf(player)
		for language, control in languages do
			control.Text = translate("mine_language_" .. language)
			control.BackgroundColor3 = if language == current then SELECTED else FILL
		end
	end

	local function setOpen(open: boolean)
		gui.Enabled = open
		player:SetAttribute("MineSettingsOpen", open)
		if open then
			refresh()
		end
	end
	local function change(key: string, value: any)
		ProfileState.setPreference(key, value)
		Sfx.level(ProfileState.preference("sfx"))
		Sfx.play("ui_tap", 0.28)
		refresh()
	end
	for language, control in languages do
		control.Activated:Connect(function()
			change("language", language)
		end)
	end
	local function adjust(step: number)
		local value = math.clamp(math.round(ProfileState.preference("sfx") * 10) + step, 0, 10) / 10
		change("sfx", value)
	end
	down.Activated:Connect(function()
		adjust(-1)
	end)
	up.Activated:Connect(function()
		adjust(1)
	end)
	haptics.Activated:Connect(function()
		change("haptics", not ProfileState.preference("haptics"))
	end)
	motion.Activated:Connect(function()
		change("reducedMotion", not ProfileState.preference("reducedMotion"))
	end)
	gear.Activated:Connect(function()
		Sfx.play("ui_tap", 0.28)
		setOpen(not gui.Enabled)
	end)
	close.Activated:Connect(function()
		Sfx.play("ui_tap", 0.28)
		setOpen(false)
	end)
	player:GetAttributeChangedSignal("language"):Connect(refresh)
	gui.Parent = parent
	return function()
		if gui.Enabled then
			setOpen(false)
		end
	end
end

return SettingsPanel
