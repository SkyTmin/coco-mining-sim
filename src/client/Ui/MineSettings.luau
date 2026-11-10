--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Strings = require(Shared.Strings)
local Sfx = require(Shared.Sfx)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)

local SettingsPanel = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

function SettingsPanel.start(
	player: Player,
	parent: Instance,
	gear: TextButton,
	translate: (string, ...any) -> string
): () -> ()
	local refresh: () -> ()
	local modal = Candy.modal(
		parent,
		"MineSettings",
		scale(0.59, 0.64),
		Candy.purple,
		function(show)
			player:SetAttribute("MineSettingsOpen", show)
			if show then
				refresh()
			end
		end
	)
	local panel = modal.panel
	local languages: { [string]: Candy.Control } = {}
	for i, language in Config.game.languages do
		languages[language] = Candy.button(
			panel,
			"Language_" .. language,
			UDim2.new(0.25, -15, 0, 38),
			UDim2.new((i - 1) * 0.25, 14, 0.14, 0),
			"neutral",
			15
		)
	end

	local function row(name: string, y: number): (Frame, TextLabel)
		local box =
			Candy.panel(panel, name, UDim2.new(1, -26, 0.19, 0), UDim2.new(0, 13, y, 0), true)
		local label = Candy.text(box, "Label", scale(0.61, 0.92), scale(0.035, 0.04), 17)
		label.TextXAlignment = Enum.TextXAlignment.Left
		return box, label
	end
	local soundRow, volume = row("Sound", 0.35)
	local down = Candy.button(
		soundRow,
		"SoundDown",
		offset(41, 34),
		UDim2.new(1, -99, 0.5, -17),
		"neutral",
		20
	)
	local up = Candy.button(
		soundRow,
		"SoundUp",
		offset(41, 34),
		UDim2.new(1, -48, 0.5, -17),
		"neutral",
		20
	)
	local vibrationRow, vibration = row("Vibration", 0.56)
	local haptics = Candy.button(
		vibrationRow,
		"Haptics",
		offset(92, 34),
		UDim2.new(1, -99, 0.5, -17),
		"neutral",
		16
	)
	local motionRow, shake = row("ReducedMotionRow", 0.77)
	local motion = Candy.button(
		motionRow,
		"ReducedMotion",
		offset(92, 34),
		UDim2.new(1, -99, 0.5, -17),
		"neutral",
		16
	)

	refresh = function()
		modal.title.Text = translate("mine_settings")
		volume.Text =
			translate("mine_settings_sfx", math.round(ProfileState.preference("sfx") * 100))
		down.text.Text, up.text.Text =
			translate("mine_settings_down"), translate("mine_settings_up")
		vibration.Text, shake.Text =
			translate("mine_settings_haptics"), translate("mine_settings_motion")
		for key, control in { haptics = haptics, reducedMotion = motion } do
			local enabled = ProfileState.preference(key)
			control.text.Text =
				translate(if enabled then "mine_settings_on" else "mine_settings_off")
			Candy.paint(control, if enabled then "confirm" else "neutral")
		end
		local current = Strings.localeOf(player)
		for language, control in languages do
			control.text.Text = translate("mine_language_" .. language)
			Candy.paint(control, if language == current then "purple" else "neutral")
		end
	end

	local function change(key: string, value: any)
		ProfileState.setPreference(key, value)
		Sfx.level(ProfileState.preference("sfx"))
		Sfx.play("ui_tap", 0.28)
		refresh()
	end
	for language, control in languages do
		control.input.Activated:Connect(function()
			change("language", language)
		end)
	end
	local function adjust(step: number)
		local value = math.clamp(math.round(ProfileState.preference("sfx") * 10) + step, 0, 10) / 10
		change("sfx", value)
	end
	down.input.Activated:Connect(function()
		adjust(-1)
	end)
	up.input.Activated:Connect(function()
		adjust(1)
	end)
	haptics.input.Activated:Connect(function()
		change("haptics", not ProfileState.preference("haptics"))
	end)
	motion.input.Activated:Connect(function()
		change("reducedMotion", not ProfileState.preference("reducedMotion"))
	end)
	gear.Activated:Connect(function()
		Sfx.play("ui_tap", 0.28)
		Candy.show(modal, not modal.open)
	end)
	for _, key in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(key):Connect(refresh)
	end
	return function()
		Candy.show(modal, false)
	end
end

return SettingsPanel
