--!strict
local UIS = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Strings = require(Shared.Strings)
local Sfx = require(Shared.Sfx)
local Profile = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local Settings = {}
function Settings.start(
	player: Player,
	parent: Instance,
	gear: TextButton,
	translate: (string, ...any) -> string
): () -> ()
	local cfg = Config.music.settingsUi
	local refresh: () -> ()
	local modal = Candy.modal(
		parent,
		"MineSettings",
		UDim2.fromScale(cfg.width, cfg.height),
		Candy.purple,
		function(show)
			player:SetAttribute("MineSettingsOpen", show)
			if show then
				refresh()
			end
		end
	)
	local panel = modal.panel
	local languages, volumes, toggles = {}, {}, {}
	local function change(key: string, value: any)
		Profile.setPreference(key, value)
		Sfx.level(Profile.preference("sfx"))
		refresh()
	end
	for i, language in Config.game.languages do
		local control = Candy.button(
			panel,
			"Language_" .. language,
			UDim2.new(1 / #Config.game.languages, -cfg.padding, 0, cfg.button),
			UDim2.new((i - 1) / #Config.game.languages, cfg.padding / 2, 0, cfg.languageY),
			"neutral",
			cfg.font
		)
		languages[language] = control
		control.input.Activated:Connect(function()
			change("language", language)
			Sfx.play("ui_tap", cfg.dragGain)
		end)
	end
	local qualities = {}
	for i, mode in { "auto", "high", "normal", "low" } do
		local control = Candy.button(
			panel,
			"Quality_" .. mode,
			UDim2.new(1 / #Config.game.languages, -cfg.padding, 0, cfg.button),
			UDim2.new((i - 1) / #Config.game.languages, cfg.padding / 2, 0, cfg.qualityY),
			"neutral",
			cfg.font
		)
		qualities[mode] = control
		control.input.Activated:Connect(function()
			change("effects", mode)
		end)
	end
	local dragging = nil
	for i, key in { "sfx", "music" } do
		local row = Candy.frame(
			panel,
			key,
			UDim2.new(0.5, -cfg.padding * 2, 0, cfg.volumeHeight),
			UDim2.new((i - 1) / 2, cfg.padding, 0, cfg.volumeY)
		)
		local label = Candy.text(
			row,
			"Label",
			UDim2.new(1, 0, 0, cfg.labelHeight),
			UDim2.fromOffset(0, 0),
			cfg.font
		)
		local input = Instance.new("TextButton")
		input.Name, input.Text, input.BackgroundTransparency, input.AutoButtonColor =
			"VolumeSlider", "", 1, false
		input.Size, input.Position, input.Parent =
			UDim2.new(1, 0, 0, cfg.button), UDim2.fromOffset(0, cfg.labelHeight), row
		local rail = Candy.frame(
			input,
			"Rail",
			UDim2.new(1, 0, 0, cfg.railHeight),
			UDim2.fromScale(0, 0.5),
			Candy.rowColor
		)
		rail.AnchorPoint = Vector2.new(0, 0.5)
		local fill =
			Candy.frame(rail, "Fill", UDim2.fromScale(0, 1), UDim2.fromScale(0, 0), Candy.purple)
		local thumb = Candy.frame(
			input,
			"Thumb",
			UDim2.fromOffset(cfg.knobSize, cfg.knobSize),
			UDim2.fromScale(0, 0.5),
			Candy.purple
		)
		thumb.AnchorPoint = Vector2.new(0.5, 0.5)
		Candy.round(thumb, 0)
		local function slide(x: number)
			local ratio =
				math.clamp((x - input.AbsolutePosition.X) / math.max(1, input.AbsoluteSize.X), 0, 1)
			local value = math.round(ratio / Config.music.volumeStep) * Config.music.volumeStep
			change(key, math.clamp(value, 0, 1))
		end
		input.InputBegan:Connect(function(event)
			if Candy.pointer(event) then
				dragging = { input = event, slide = slide }
				slide(event.Position.X)
			end
		end)
		volumes[key] = { label = label, fill = fill, thumb = thumb }
	end
	UIS.InputChanged:Connect(function(event)
		if
			dragging
			and (event == dragging.input or event.UserInputType == Enum.UserInputType.MouseMovement)
		then
			dragging.slide(event.Position.X)
		end
	end)
	UIS.InputEnded:Connect(function(event)
		if dragging and Candy.pointer(event) then
			dragging = nil
		end
	end)
	UIS.WindowFocusReleased:Connect(function()
		dragging = nil
	end)
	for i, key in { "haptics", "reducedMotion" } do
		local control = Candy.button(
			panel,
			key,
			UDim2.new(0.5, -cfg.padding * 2, 0, cfg.button),
			UDim2.new((i - 1) / 2, cfg.padding, 0, cfg.togglesY),
			"neutral",
			cfg.font
		)
		toggles[key] = control
		control.input.Activated:Connect(function()
			change(key, not Profile.preference(key))
			Sfx.play("ui_tap", cfg.dragGain)
		end)
	end
	local credits = Candy.text(
		panel,
		"Credits",
		UDim2.new(1, -cfg.padding * 2, 0, cfg.creditsHeight),
		UDim2.fromOffset(cfg.padding, cfg.creditsY),
		cfg.smallFont
	)
	refresh = function()
		modal.title.Text = translate("mine_settings")
		credits.Text = translate("credits_cracks")
		for mode, control in qualities do
			control.text.Text = translate("quality_" .. mode)
			Candy.paint(
				control,
				if mode == Profile.preference("effects") then "purple" else "neutral"
			)
		end
		local language = Strings.localeOf(player)
		for key, control in languages do
			control.text.Text = translate("mine_language_" .. key)
			Candy.paint(control, if key == language then "purple" else "neutral")
		end
		for key, row in volumes do
			local value = Profile.preference(key)
			row.label.Text = translate(
				if key == "music" then "settings_music" else "mine_settings_sfx",
				math.round(value * Config.rebirth.percentScale)
			)
			row.fill.Size = UDim2.fromScale(value, 1)
			row.thumb.Position = UDim2.fromScale(value, 0.5)
		end
		for key, control in toggles do
			local enabled = Profile.preference(key)
			control.text.Text = translate(
				if key == "haptics" then "mine_settings_haptics" else "mine_settings_motion"
			) .. " · " .. translate(if enabled then "mine_settings_on" else "mine_settings_off")
			Candy.paint(control, if enabled then "confirm" else "neutral")
		end
	end
	gear.Activated:Connect(function()
		if
			player:GetAttribute("MineRebirthOpen") or player:GetAttribute("MineRebirthTransition")
		then
			return
		end
		Sfx.play("ui_tap", cfg.dragGain)
		Candy.show(modal, not modal.open)
	end)
	for _, key in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(key):Connect(refresh)
	end
	return function()
		dragging = nil
		Candy.show(modal, false)
	end
end
return Settings
