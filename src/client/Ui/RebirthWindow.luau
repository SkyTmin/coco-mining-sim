--!strict
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rebirth = require(Shared.Play.Rebirth)
local Family = require(Shared.Play.Family)
local Hold = require(Shared.Play.RebirthHold)
local Remotes = require(Shared.Remotes)
local Format = require(Shared.Format)
local Profile = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local Window = {}
function Window.new(
	parent: Instance,
	player: Player,
	translate: (string, ...any) -> string,
	toast: (string, { any }?) -> (),
	closeOthers: () -> (),
	transition: (any, () -> ()) -> ()
): any
	local cfg = Config.rebirth.ui
	local layer = Candy.layer(parent, "RebirthHUD", cfg.worldTimeLayer)
	local fire = Candy.button(
		layer,
		"RebirthFire",
		UDim2.fromOffset(cfg.fireSize, cfg.fireSize),
		UDim2.new(0, cfg.fireX, 1, -cfg.fireBottom),
		"purple",
		cfg.font
	)
	fire.box.AnchorPoint = Vector2.new(0, 1)
	local badge = Candy.text(
		fire.box,
		"WorthIt",
		UDim2.fromOffset(cfg.badgeWidth, cfg.lineHeight),
		UDim2.new(0.5, 0, 0, -cfg.lineHeight),
		cfg.smallFont,
		Candy.purple
	)
	badge.AnchorPoint = Vector2.new(0.5, 0)
	local hold = Hold.new()
	local changedAt = -math.huge
	local masterMode = false
	local quote, family, start = nil, "", 1
	local refresh: () -> ()
	local modal = Candy.modal(
		parent,
		"Rebirth",
		UDim2.fromScale(cfg.width, cfg.height),
		Candy.purple,
		function(open)
			player:SetAttribute("MineRebirthOpen", open)
			Hold.cancel(hold)
		end
	)
	local panel = modal.panel
	local function text(name: string, y: number, height: number, font: number): TextLabel
		return Candy.text(
			panel,
			name,
			UDim2.new(1, -cfg.padding * 2, 0, height),
			UDim2.fromOffset(cfg.padding, y),
			font
		)
	end
	local stats = text("Stats", cfg.statsY, cfg.statsHeight, cfg.font)
	local keep = text("Keep", cfg.keepY, cfg.lineHeight, cfg.smallFont)
	local reset = text("Reset", cfg.resetY, cfg.lineHeight, cfg.smallFont)
	local notice = text("Notice", cfg.noticeY, cfg.noticeHeight, cfg.smallFont)
	local familyRow = Candy.frame(
		panel,
		"Families",
		UDim2.new(1, -cfg.padding * 2, 0, cfg.familyHeight),
		UDim2.fromOffset(cfg.padding, cfg.familyY)
	)
	local familyButtons = {}
	for i, f in Config.familyRules.order do
		local button = Candy.button(
			familyRow,
			f,
			UDim2.new(1 / #Config.familyRules.order, -cfg.padding, 1, 0),
			UDim2.new((i - 1) / #Config.familyRules.order, cfg.padding / 2, 0, 0),
			"neutral",
			cfg.smallFont
		)
		button.input.Activated:Connect(function()
			if hold.sent then
				return
			end
			if masterMode then
				hold.sent = os.clock()
				Remotes.event("RebirthIntent"):FireServer("ClaimMaster", f)
			else
				family = f
				refresh()
			end
		end)
		familyButtons[f] = button
	end
	local startRow = Candy.frame(
		panel,
		"Start",
		UDim2.new(1, 0, 0, cfg.buttonHeight),
		UDim2.fromOffset(0, cfg.startY)
	)
	local world = Candy.text(
		startRow,
		"World",
		UDim2.fromOffset(cfg.startWidth, cfg.buttonHeight),
		UDim2.new(0.5, -cfg.startWidth / 2, 0, 0),
		cfg.font
	)
	for _, direction in { -1, 1 } do
		local button = Candy.button(
			startRow,
			if direction < 0 then "Previous" else "Next",
			UDim2.fromOffset(cfg.arrowWidth, cfg.buttonHeight),
			UDim2.new(
				0.5,
				if direction < 0 then -cfg.startWidth / 2 - cfg.arrowWidth else cfg.startWidth / 2,
				0,
				0
			),
			"neutral",
			cfg.font
		)
		button.text.Text = translate(if direction < 0 then "rebirth_prev" else "rebirth_next")
		button.input.Activated:Connect(function()
			if quote and not hold.sent then
				start = (start - 1 + direction) % quote.liftMax + 1
				refresh()
			end
		end)
	end
	local confirm = Candy.button(
		panel,
		"Confirm",
		UDim2.new(cfg.holdWidth, 0, 0, cfg.buttonHeight),
		UDim2.new(cfg.holdX, 0, 0, cfg.holdY),
		"confirm",
		cfg.font
	)
	local fill = Candy.frame(
		confirm.face,
		"HoldProgress",
		UDim2.fromScale(0, 1),
		UDim2.fromScale(0, 0),
		Candy.green
	)
	fill.BackgroundTransparency = cfg.pulseGain
	fill.ZIndex = confirm.face.ZIndex
	confirm.text.ZIndex = fill.ZIndex + 1
	local function resetQuote()
		local p = Profile.getProfile()
		if p then
			quote = Rebirth.quote(p)
			family, start = quote.family, quote.start
		end
	end
	refresh = function()
		local p = Profile.getProfile()
		if not p or not quote then
			return
		end
		modal.title.Text = translate(if masterMode then "master_epic_title" else "rebirth_title")
		stats.Text = if masterMode
			then translate("master_epic_title")
			else translate(
				"rebirth_stats",
				Format.short(quote.cups),
				Format.short(quote.after),
				Format.short(quote.gain),
				Format.short(1 + quote.cups),
				Format.short(1 + quote.after)
			) .. (if quote.rank then " · " .. translate("rank_" .. quote.rank.id) else "")
		keep.Text, reset.Text = translate("rebirth_keep"), translate("rebirth_reset")
		keep.Visible, reset.Visible = not masterMode, not masterMode
		local list = if masterMode then Config.familyRules.order else quote.families
		familyRow.Visible = masterMode or #list >= 2
		for f, button in familyButtons do
			local index = table.find(list, f)
			button.box.Visible = index ~= nil
			if index then
				Candy.fit(
					button.box,
					UDim2.new(1 / #list, -cfg.padding, 1, 0),
					UDim2.new((index - 1) / #list, cfg.padding / 2, 0, 0)
				)
				local best = Family.best(p, f)
				local stars = if masterMode
					then table.find(Config.familyRules.rarities, "epic")
					else best and table.find(
						Config.familyRules.rarities,
						Config.pickaxes[best].rarity
					) or 0
				button.text.Text = translate("family_" .. f)
					.. " "
					.. string.rep("★", stars or 0)
					.. "\n"
					.. translate("family_hint_" .. f)
				Candy.paint(button, if f == family and not masterMode then "purple" else "neutral")
			end
		end
		startRow.Visible = not masterMode and quote.liftMax > 1
		world.Text = translate("rebirth_start") .. ": " .. translate("rebirth_world", start)
		confirm.box.Visible = not masterMode and quote.available
		confirm.text.Text = translate(if hold.sent then "rebirth_wait" else "rebirth_hold_hint")
		notice.Text = if masterMode
			then ""
			elseif not quote.available then translate(
				"rebirth_need_plate",
				math.max(Config.rebirth.firstAfterWorld, p.circleStartWorld)
			)
			elseif player:GetAttribute("RebirthHint") == 2 then translate("rebirth_profitable")
			else translate("rebirth_deeper")
		if #list == 1 and not masterMode then
			keep.Text ..= " · " .. translate("rebirth_family") .. ": " .. translate(
				"family_" .. list[1]
			)
		end
	end
	local function open(master: boolean?)
		if player:GetAttribute("MineRebirthTransition") == true or hold.sent then
			return
		end
		closeOthers()
		resetQuote()
		masterMode = master == true
		refresh()
		Candy.show(modal, true)
	end
	fire.input.Activated:Connect(function()
		open()
	end)
	confirm.input.InputBegan:Connect(function(input)
		if Candy.pointer(input) and modal.open and quote and quote.available and not hold.sent then
			Hold.begin(hold, os.clock())
		end
	end)
	UIS.InputEnded:Connect(function(input)
		if Candy.pointer(input) then
			Hold.cancel(hold)
		end
	end)
	confirm.input.MouseLeave:Connect(function()
		Hold.cancel(hold)
	end)
	UIS.WindowFocusReleased:Connect(function()
		Hold.cancel(hold)
	end)
	Remotes.event("RebirthResult").OnClientEvent:Connect(function(ok, reason, data)
		Hold.reply(hold)
		if ok then
			Candy.show(modal, false)
			if reason == "claimed" then
				toast("master_epic_entry")
				return
			end
			player:SetAttribute("MineRebirthTransition", true)
			transition(data, function()
				player:SetAttribute("MineRebirthTransition", false)
				toast("gift_fever")
				if data.master then
					open(true)
				end
			end)
		else
			if reason == "changed" then
				changedAt = os.clock()
				if data then
					quote = data
					family, start = quote.family, quote.start
				else
					resetQuote()
				end
			end
			local key = if reason == "family"
				then "rebirth_family_error"
				elseif reason == "start" then "rebirth_start_error"
				else "rebirth_" .. tostring(reason)
			toast(key)
			refresh()
		end
	end)
	Profile.changed:Connect(function()
		if modal.open then
			refresh()
		end
	end)
	local timeLabel = Candy.text(
		layer,
		"WorldTime",
		UDim2.fromScale(cfg.worldTimeWidth, cfg.worldTimeHeight),
		UDim2.fromScale((1 - cfg.worldTimeWidth) / 2, cfg.worldTimeY),
		cfg.font,
		Candy.white
	)
	local timeUntil = 0
	local function clock(seconds: number): string
		local n = math.floor(seconds)
		return string.format("%d:%02d", n // cfg.secondsPerMinute, n % cfg.secondsPerMinute)
	end
	Remotes.event("WorldTime").OnClientEvent:Connect(function(data)
		timeLabel.Text = if data.previous
			then translate("world_time", data.world, clock(data.seconds), clock(data.previous))
			else translate("world_time_first", data.world, clock(data.seconds))
		timeUntil = os.clock() + Config.rebirth.worldTimeSeconds
	end)
	local function step(now: number, dt: number, active: boolean, reduced: boolean)
		local hint = player:GetAttribute("RebirthHint") or 0
		fire.box.Visible = active
			and hint > 0
			and not modal.open
			and not player:GetAttribute("MineRebirthTransition")
		fire.text.Text = translate("rebirth_flame")
		badge.Visible = hint == 2
		badge.Text = translate("rebirth_profitable")
		fire.face.BackgroundColor3 = Candy.purple:Lerp(
			Candy.white,
			if hint == 2 and not reduced
				then cfg.pulseGain * (1 + math.sin(now * cfg.pulseSpeed))
				else 0
		)
		timeLabel.Visible = active and now < timeUntil and not modal.open
		local action = Hold.step(hold, now, dt)
		fill.Size = UDim2.fromScale(hold.ratio, 1)
		stats.TextColor3 = if now - changedAt < cfg.changedFlashSeconds
			then Candy.purple
			else Candy.ink
		if action == "send" and quote then
			Remotes.event("RebirthIntent")
				:FireServer("Confirm", quote.serial, quote.gain, family, start)
			refresh()
		elseif action == "timeout" then
			toast("rebirth_no_link")
			refresh()
		end
	end
	if RunService:IsStudio() then
		player:GetAttributeChangedSignal("QaRebirthOpen"):Connect(function()
			if player:GetAttribute("QaRebirthOpen") then
				open()
			end
		end)
	end
	return {
		open = open,
		step = step,
		close = function()
			Candy.show(modal, false)
		end,
	}
end
return Window
