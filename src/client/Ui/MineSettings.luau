--!strict

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Strings = require(Shared.Strings)
local Sfx = require(Shared.Sfx)
local ProfileState = require(script.Parent.Parent.ProfileState)
local Kit = require(script.Parent.Kit)
local SettingsPanel = {}

function SettingsPanel.start(
	player: Player,
	parent: Instance,
	gear: TextButton,
	translate: (string, ...any) -> string
): () -> ()
	local gui = Kit.gui(parent, "MineSettings", 15, false)
	local panel = Kit.image(
		gui,
		"Panel",
		UDim2.fromOffset(304, 313),
		UDim2.fromScale(0.5, 0.5),
		"frame-wood",
		Vector2.new(0.5, 0.5)
	)
	panel.Active = true
	local titlePlate = Kit.image(
		panel,
		"TitlePlate",
		UDim2.fromOffset(222, 44),
		UDim2.fromOffset(11, 7),
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
		UDim2.fromOffset(248, 7),
		"red",
		nil,
		"i-x"
	)
	local languages: { [string]: TextButton } = {}
	for i, language in Config.game.languages do
		languages[language] = Kit.button(
			panel,
			"Language_" .. language,
			UDim2.fromOffset(138, 44),
			UDim2.fromOffset(11 + ((i - 1) % 2) * 143, 58 + ((i - 1) // 2) * 49),
			"iron"
		)
	end
	local function label(name: string, y: number): TextLabel
		local text = Kit.label(panel, name, UDim2.fromOffset(165, 44), UDim2.fromOffset(17, y), 15)
		text.TextXAlignment = Enum.TextXAlignment.Left
		return text
	end
	local volume = label("Sound", 156)
	local down = Kit.button(
		panel,
		"SoundDown",
		UDim2.fromOffset(44, 44),
		UDim2.fromOffset(199, 156),
		"iron",
		nil,
		"i-minus"
	)
	local up = Kit.button(
		panel,
		"SoundUp",
		UDim2.fromOffset(44, 44),
		UDim2.fromOffset(248, 156),
		"iron",
		nil,
		"i-plus"
	)
	local vibration = label("Vibration", 205)
	local haptics =
		Kit.button(panel, "Haptics", UDim2.fromOffset(92, 44), UDim2.fromOffset(200, 205), "iron")
	local shake = label("Shake", 254)
	local motion = Kit.button(
		panel,
		"ReducedMotion",
		UDim2.fromOffset(92, 44),
		UDim2.fromOffset(200, 254),
		"iron"
	)

	local function refresh()
		title.Text = translate("mine_settings")
		volume.Text =
			translate("mine_settings_sfx", math.round(ProfileState.preference("sfx") * 100))
		vibration.Text, shake.Text =
			translate("mine_settings_haptics"), translate("mine_settings_motion")
		for key, control in { haptics = haptics, reducedMotion = motion } do
			local enabled = ProfileState.preference(key)
			Kit.caption(
				control,
				translate(if enabled then "mine_settings_on" else "mine_settings_off")
			)
			Kit.state(control, if enabled then "green" else "iron")
		end
		local current = Strings.localeOf(player)
		for language, control in languages do
			Kit.caption(control, translate("mine_language_" .. language))
			Kit.state(control, if language == current then "gold" else "iron")
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
	return function()
		if gui.Enabled then
			setOpen(false)
		end
	end
end

return SettingsPanel
