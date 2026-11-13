--!strict
-- The rebirth window, take 2 [владелец 13.11: «по твоему это красиво????»]. Built from the phone mockup
-- (docs/reports/stage-05/shots/rebirth-mockup.png, 666 × 374 — design units are the mockup's CSS pixels) in the style of the
-- accepted Families menu: big coloured emblems, bold short words, the chosen tile yellow, one bright card for the prize.
--   left  — «Выбери семью на этот круг»: four tiles (emblem, name, short benefit; no pick = grey with a lock), a speech
--           bubble under the chosen tile that says in plain words what it does, then «Останется / С нуля» icon chips;
--   right — the prize card (purple → pink: «Монеты — навсегда», the new multiplier huge and yellow, «было ×…», Trophies
--           and rank pills, a «Выгодно!» sticker), the start world with yellow arrows, the big green hold button.
-- The logic (quote, hold, master claim, server replies) is the stage-5 one; only the layout changed.
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rebirth = require(Shared.Play.Rebirth)
local Ranks = require(Shared.Play.Ranks)
local Hold = require(Shared.Play.RebirthHold)
local Remotes = require(Shared.Remotes)
local Format = require(Shared.Format)
local Profile = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)
local Window = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

-- layout in design units (= the mockup's pixels)
local SIDE, TOP, BOTTOM, GAP = 14, 24, 14, 12
local RIGHT = 228 -- the prize column
-- vertical: shares of the column height, so a wide phone (only ≈ 237 units tall) shrinks every part evenly
local V = {
	title = { 0, 0.075 },
	tiles = { 0.1, 0.46 },
	bubble = { 0.6, 0.15 },
	keep = { 0.79, 0.21 },
	prize = { 0, 0.5 },
	start = { 0.54, 0.2 },
	go = { 0.78, 0.21 },
	-- master mode: no keep rows, no start or button
	masterTiles = { 0.1, 0.66 },
	masterBubble = { 0.82, 0.18 },
	masterPrize = { 0, 1 },
}
local function vsize(v: { number }): UDim2
	return UDim2.fromScale(1, v[2])
end
local function vat(v: { number }): UDim2
	return UDim2.fromScale(0, v[1])
end
local QUIET = Color3.fromHex("6B6F8C")
local LOCKED = Color3.fromHex("EDE4D3")
local LOCKED_INK = Color3.fromHex("8D8AA0")
local GREY_BUTTON = Color3.fromHex("D9D3C7")
local HOLD_FILL = Color3.fromHex("15803D")
local KEEP = {
	{ "pickaxe", "rebirth_keep_picks" },
	{ "crit", "rebirth_keep_skills" },
	{ "keys", "rebirth_keep_keys" },
	{ "width", "rebirth_keep_width" },
}
local LOSE = {
	{ "coins", "rebirth_lose_coins" },
	{ "upgrades", "rebirth_lose_levels" },
	{ "skill_rift_4", "rebirth_lose_depth" },
}

local function label(
	parent: Instance,
	name: string,
	size: UDim2,
	at: UDim2,
	font: number,
	color: Color3?,
	align: Enum.TextXAlignment?
): TextLabel
	local l = Candy.text(parent, name, size, at, font, color)
	l.TextXAlignment = align or Enum.TextXAlignment.Center
	return l
end

local function square(image: GuiObject)
	local aspect = Instance.new("UIAspectRatioConstraint")
	aspect.Parent = image
end

local function strokeColor(gui: GuiObject, color: Color3)
	local stroke = gui:FindFirstChildOfClass("UIStroke")
	if stroke then
		stroke.Color = color
	end
end

-- «Останется: [⛏ Кирки] [★ Навыки] …» — the chips share the row width equally
local function chipRow(
	parent: Frame,
	title: string,
	color: Color3,
	items: { { string } },
	y: number,
	keyed: { { any } }
)
	local head = label(
		parent,
		"Title",
		UDim2.new(0, 78, 0.47, 0),
		UDim2.fromScale(0, y),
		12,
		color,
		Enum.TextXAlignment.Left
	)
	table.insert(keyed, { head, title })
	local row = Candy.frame(parent, "Chips", UDim2.new(1, -80, 0.47, 0), UDim2.new(0, 80, y, 0))
	local boxes = {}
	for _, item in items do
		local chip = Candy.frame(row, "Chip", scale(0.25, 1), scale(0, 0), Candy.rowColor)
		Candy.round(chip, 8)
		square(Candy.icon(chip, item[1], UDim2.new(0, 18, 0.76, 0), UDim2.new(0, 3, 0.12, 0)))
		local text = label(
			chip,
			"Label",
			UDim2.new(1, -26, 0.7, 0),
			UDim2.new(0, 23, 0.15, 0),
			12,
			nil,
			Enum.TextXAlignment.Left
		)
		table.insert(keyed, { text, item[2] })
		table.insert(boxes, chip)
	end
	W.row(boxes, UDim.new(0, 0), UDim.new(1, 0), nil, 5)
end

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
	-- «Выгодно!» as a green sticker above the 🔥 button
	local badgeBox, badge =
		W.pill(fire.box, "WorthIt", offset(86, 22), UDim2.new(0.5, 0, 0, -28), W.green, 13)
	badgeBox.AnchorPoint = Vector2.new(0.5, 0)
	badge.TextColor3 = Candy.white
	local hold = Hold.new()
	local changedAt = -math.huge
	local masterMode = false
	local quote, family, start = nil, "", 1
	local inspect: string? = nil -- a locked tile the player just tapped: the bubble says «no pickaxe»
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
	-- labels whose text is a fixed key: set on every refresh (the locale is known only once the profile loads)
	local keyed: { { any } } = {}

	local left = Candy.frame(
		panel,
		"Choices",
		UDim2.new(1, -(SIDE * 2 + RIGHT + GAP), 1, -(TOP + BOTTOM)),
		offset(SIDE, TOP)
	)
	local right = Candy.frame(
		panel,
		"Prize",
		UDim2.new(0, RIGHT, 1, -(TOP + BOTTOM)),
		UDim2.new(1, -SIDE - RIGHT, 0, TOP)
	)

	-- left: the family tiles
	local familyTitle =
		label(left, "Title", vsize(V.title), vat(V.title), 15, nil, Enum.TextXAlignment.Left)
	local tileRow = Candy.frame(left, "Tiles", vsize(V.tiles), vat(V.tiles))
	local tiles = {}
	local tileBoxes = {}
	for _, f in Config.familyRules.order do
		local button = Candy.button(tileRow, f, scale(0.25, 1), scale(0, 0), "neutral", 15)
		local face = button.face
		local emblem = Candy.icon(face, "family_" .. f, scale(0.9, 0.42), scale(0.5, 0.06))
		emblem.AnchorPoint = Vector2.new(0.5, 0)
		square(emblem)
		local lock = Candy.icon(face, "lock", scale(0.3, 0.2), scale(0.6, 0.3))
		square(lock)
		Candy.fit(button.text, scale(0.92, 0.18), scale(0.04, 0.5))
		table.insert(keyed, { button.text, "family_" .. f })
		local hint = label(face, "Hint", scale(0.88, 0.25), scale(0.06, 0.69), 11, QUIET)
		local check, checkText = W.badge(button.box, W.green)
		checkText.Text, checkText.TextColor3 = "✓", Candy.white
		button.input.Activated:Connect(function()
			if hold.sent or not quote then
				return
			end
			if masterMode then
				hold.sent = os.clock()
				Remotes.event("RebirthIntent"):FireServer("ClaimMaster", f)
			elseif table.find(quote.families, f) then
				family, inspect = f, nil
			else
				inspect = f
			end
			refresh()
		end)
		tiles[f] = { button = button, emblem = emblem, lock = lock, hint = hint, check = check }
		table.insert(tileBoxes, button.box)
	end
	W.row(tileBoxes, UDim.new(0, 0), UDim.new(1, 0), nil, 8)

	-- the speech bubble under the chosen tile
	local bubble = Candy.frame(left, "Bubble", vsize(V.bubble), vat(V.bubble), Candy.rowColor)
	Candy.round(bubble, 12)
	local beak =
		Candy.frame(left, "Beak", offset(14, 14), UDim2.new(0, 0, V.bubble[1], -6), Candy.rowColor)
	beak.Rotation = 45
	local bubbleIcon = Candy.icon(bubble, nil, offset(24, 24), UDim2.new(0, 8, 0.5, -12))
	local explain = label(
		bubble,
		"Explain",
		UDim2.new(1, -46, 0.86, 0),
		UDim2.new(0, 38, 0.07, 0),
		13,
		nil,
		Enum.TextXAlignment.Left
	)

	-- what stays and what starts from zero
	local keepRows = Candy.frame(left, "Keep", vsize(V.keep), vat(V.keep))
	chipRow(keepRows, "rebirth_keep_title", Candy.green, KEEP, 0, keyed)
	chipRow(keepRows, "rebirth_lose_title", Candy.red, LOSE, 0.53, keyed)

	-- right: the prize card
	local prizeBox, prize = Candy.panel(right, "Card", vsize(V.prize), vat(V.prize))
	prize.BackgroundColor3 = Candy.white
	local gradient = Instance.new("UIGradient")
	gradient.Color, gradient.Rotation = ColorSequence.new(Candy.purple, Candy.pink), 35
	gradient.Parent = prize
	local captionIcon = Candy.icon(prize, "coins", offset(18, 18), UDim2.new(0, 9, 0.07, 0))
	-- master mode: the epic pickaxe itself, big, under the title
	local prizePick = Candy.icon(prize, "pickaxe", scale(0.9, 0.46), scale(0.5, 0.48))
	prizePick.AnchorPoint = Vector2.new(0.5, 0)
	square(prizePick)
	local caption = label(
		prize,
		"Caption",
		UDim2.new(1, -40, 0.15, 0),
		UDim2.new(0, 32, 0.07, 0),
		13,
		Candy.white,
		Enum.TextXAlignment.Left
	)
	local big = label(
		prize,
		"Multiplier",
		scale(0.62, 0.34),
		scale(0.05, 0.23),
		34,
		W.yellow,
		Enum.TextXAlignment.Left
	)
	Candy.stroke(big, 2, true)
	local was = label(
		prize,
		"Was",
		scale(0.34, 0.2),
		scale(0.63, 0.32),
		13,
		Candy.white,
		Enum.TextXAlignment.Right
	)
	local cupsBox, cupsText =
		W.pill(prize, "Cups", scale(0.66, 0.17), scale(0.05, 0.59), W.yellow, 13)
	local rankBox, rankText =
		W.pill(prize, "Rank", scale(0.86, 0.17), scale(0.05, 0.79), Candy.white, 13)
	local stickerBox, sticker =
		W.pill(prizeBox, "WorthIt", offset(94, 26), UDim2.new(1, -26, 0, -14), W.green, 15)
	stickerBox.AnchorPoint, stickerBox.Rotation, stickerBox.ZIndex = Vector2.new(1, 0), 6, 5
	sticker.TextColor3, sticker.ZIndex = Candy.white, 5
	Candy.stroke(sticker, 1.5, true)

	-- the start world
	local startBox = Candy.frame(right, "Start", vsize(V.start), vat(V.start), Candy.rowColor)
	Candy.round(startBox, 14)
	local startTitle = label(startBox, "Title", scale(0.5, 0.24), scale(0.25, 0.04), 11, QUIET)
	table.insert(keyed, { startTitle, "rebirth_start_title" })
	local world = label(startBox, "World", scale(0.5, 0.4), scale(0.25, 0.28), 22)
	local worldName = label(startBox, "WorldName", scale(0.56, 0.26), scale(0.22, 0.69), 11, QUIET)
	local arrows = {}
	for _, direction in { -1, 1 } do
		local button = Candy.button(
			startBox,
			if direction < 0 then "Previous" else "Next",
			scale(0.2, 0.72),
			scale(if direction < 0 then 0.03 else 0.97, 0.14),
			"coin",
			22
		)
		button.box.AnchorPoint = Vector2.new(if direction < 0 then 0 else 1, 0)
		square(button.box)
		table.insert(
			keyed,
			{ button.text, if direction < 0 then "rebirth_prev" else "rebirth_next" }
		)
		button.input.Activated:Connect(function()
			if quote and not hold.sent and quote.liftMax > 1 then
				start = (start - 1 + direction) % quote.liftMax + 1
				refresh()
			end
		end)
		table.insert(arrows, button)
	end

	-- the hold button
	local confirm = Candy.button(right, "Confirm", vsize(V.go), vat(V.go), "confirm", 18)
	local fill = Candy.frame(confirm.face, "HoldProgress", scale(0, 1), scale(0, 0), HOLD_FILL)
	Candy.round(fill)
	fill.ZIndex = confirm.face.ZIndex
	confirm.text.ZIndex = fill.ZIndex + 1
	confirm.image.ZIndex = fill.ZIndex + 1
	local confirmStroke = Candy.stroke(confirm.text, 2, true)

	local function resetQuote()
		local p = Profile.getProfile()
		if p then
			quote = Rebirth.quote(p)
			family, start = quote.family, quote.start
		end
	end

	-- under the world when the arrows are hidden: why the lift is not there yet
	local function liftText(): string
		if Ranks.lift(quote.after) <= 1 then
			for _, rank in Config.rebirth.ranks do
				if (rank.lift or 1) > 1 then
					return translate("rebirth_lift_locked", translate("rank_" .. rank.id))
				end
			end
			return ""
		end
		return translate("rebirth_lift_depth")
	end

	local function layout()
		local master = masterMode
		local prizeV = if master then V.masterPrize else V.prize
		local tilesV = if master then V.masterTiles else V.tiles
		local bubbleV = if master then V.masterBubble else V.bubble
		Candy.fit(prizeBox, vsize(prizeV), vat(prizeV))
		Candy.fit(tileRow, vsize(tilesV), vat(tilesV))
		Candy.fit(bubble, vsize(bubbleV), vat(bubbleV))
		startBox.Visible = not master
		confirm.box.Visible = not master
		keepRows.Visible = not master
	end

	refresh = function()
		local p = Profile.getProfile()
		if not p or not quote then
			return
		end
		layout()
		for _, entry in keyed do
			entry[1].Text = translate(entry[2])
		end
		modal.title.Text = translate(if masterMode then "rank_master" else "rebirth_title")

		-- the prize
		local worth = not masterMode and quote.available and player:GetAttribute("RebirthHint") == 2
		stickerBox.Visible = worth
		sticker.Text = translate("rebirth_profitable")
		if masterMode then
			caption.Text = translate("rebirth_master_reward")
			big.Text = translate("master_epic_title")
			Candy.fit(big, scale(0.9, 0.28), scale(0.05, 0.18))
			Candy.setIcon(captionIcon, "chest")
			prizePick.Visible = true
			big.TextColor3 = W.yellow
			was.Visible, cupsBox.Visible, rankBox.Visible = false, false, false
		else
			caption.Text = translate("rebirth_coins_forever")
			Candy.setIcon(captionIcon, "coins")
			prizePick.Visible = false
			Candy.fit(big, scale(0.62, 0.34), scale(0.05, 0.23))
			local gain = quote.available and quote.gain > 0
			big.Text = "×" .. Format.short(1 + (if gain then quote.after else quote.cups))
			big.TextColor3 = if gain then W.yellow else Candy.white
			was.Visible = gain
			was.Text = translate("rebirth_was", Format.short(1 + quote.cups))
			-- nothing to gain yet: the pill says where Trophies come from
			cupsBox.Visible = true
			cupsText.Text = if gain
				then translate("rebirth_cups_gain", Format.short(quote.gain))
				else translate("rebirth_plate_gives")
			Candy.fit(cupsBox, scale(if gain then 0.66 else 0.9, 0.17), scale(0.05, 0.59))
			local before = Ranks.of(quote.cups)
			rankBox.Visible = quote.rank ~= nil
			if quote.rank then
				local promoted = gain and (not before or before.id ~= quote.rank.id)
				rankText.Text = translate(
					if promoted then "rebirth_new_rank" else "rebirth_rank",
					translate("rank_" .. quote.rank.id)
				)
				rankBox.BackgroundColor3 = if promoted then W.yellow else Candy.white
			end
		end

		-- the tiles
		familyTitle.Text =
			translate(if masterMode then "rebirth_master_choose" else "rebirth_family_title")
		local chosenIndex = 1
		for index, f in Config.familyRules.order do
			local tile = tiles[f]
			local has = masterMode or table.find(quote.families, f) ~= nil
			local chosen = not masterMode and f == family
			if chosen then
				chosenIndex = index
			end
			local button = tile.button
			W.tone(button, if chosen then W.yellow elseif has then Candy.white else LOCKED)
			strokeColor(button.face, if has then Candy.ink else LOCKED_INK)
			button.text.TextColor3 = if has then Candy.ink else LOCKED_INK
			tile.emblem.ImageColor3 = if has then Candy.white else Color3.fromHex("9A97AA")
			tile.emblem.ImageTransparency = if has then 0 else 0.45
			tile.lock.Visible = not has
			tile.check.Visible = chosen
			tile.hint.Text = translate(if has then "family_hint_" .. f else "rebirth_no_pick")
			tile.hint.TextColor3 = if not has then Candy.red elseif chosen then Candy.ink else QUIET
		end

		-- the bubble points at the chosen (or the inspected) tile
		local about = inspect or (if family ~= "" then family else nil)
		local pointIndex = if inspect
			then table.find(Config.familyRules.order, inspect) or 1
			else chosenIndex
		local n = #Config.familyRules.order
		beak.Visible = not masterMode and about ~= nil
		Candy.fit(beak, offset(14, 14), UDim2.new((pointIndex - 0.5) / n, -7, V.bubble[1], -6))
		Candy.setIcon(bubbleIcon, if about and not masterMode then "family_" .. about else "chest")
		explain.TextColor3 = Candy.ink
		if masterMode then
			explain.Text = translate("rebirth_master_hint")
		elseif inspect then
			explain.Text = translate("family_" .. inspect) .. ": " .. translate("rebirth_no_pick")
			explain.TextColor3 = Candy.red
		elseif family ~= "" then
			-- the icon and the beak already name the family: the line only says what it does
			explain.Text = translate("family_explain_" .. family)
		else
			explain.Text = translate("family_explain_none")
		end

		-- the start world
		world.Text = translate("rebirth_world", start)
		local info = Config.worlds[start]
		local lift = quote.liftMax > 1
		for _, arrow in arrows do
			arrow.box.Visible = lift
		end
		-- without arrows the line under the world gets the whole width
		Candy.fit(
			worldName,
			scale(if lift then 0.56 else 0.92, 0.26),
			scale(if lift then 0.22 else 0.04, 0.69)
		)
		worldName.Text = if lift
			then (if info then translate("world_" .. info.id) else "")
			else liftText()

		-- the button
		if quote.available then
			W.tone(confirm, W.green, Candy.white)
			Candy.buttonIcon(confirm, nil)
			confirmStroke.Enabled = true
			confirm.text.Text = translate(if hold.sent then "rebirth_wait" else "rebirth_hold_hint")
		else
			W.tone(confirm, GREY_BUTTON, Candy.ink)
			Candy.buttonIcon(confirm, "lock")
			confirmStroke.Enabled = false
			confirm.text.Text = translate(
				"rebirth_need_plate",
				math.max(Config.rebirth.firstAfterWorld, p.circleStartWorld)
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
		inspect = nil
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
			-- the gift fever announces itself in the HUD pill under the wallet, no toast over the wall
			transition(data, function()
				player:SetAttribute("MineRebirthTransition", false)
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
		badgeBox.Visible = hint == 2
		badge.Text = translate("rebirth_profitable")
		fire.gradient.Enabled = hint == 2
		fire.face.BackgroundColor3 = (if hint == 2 then Candy.white else Candy.purple):Lerp(
			if hint == 2 then Candy.purple else Candy.white,
			if hint == 2 and not reduced
				then cfg.pulseGain * (1 + math.sin(now * cfg.pulseSpeed))
				else 0
		)
		timeLabel.Visible = active and now < timeUntil and not modal.open
		local action = Hold.step(hold, now, dt)
		fill.Size = UDim2.fromScale(hold.ratio, 1)
		-- the Trophies pill blinks when the server answered with a fresh quote
		local flash = now - changedAt < cfg.changedFlashSeconds
		cupsBox.BackgroundColor3 = if flash
				or not (quote and quote.available and quote.gain > 0)
			then Candy.white
			else W.yellow
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
				open(player:GetAttribute("QaRebirthMaster") == true)
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
