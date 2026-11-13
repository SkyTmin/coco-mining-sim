--!strict
-- The rebirth window [владелец 13.11: «сделай также, понятно и ясно … что за мягкая и твёрдая стена?»]. Three bands of
-- cards with air between them, read top to bottom the way a first-time player asks:
--   1. «What do I get?»  — the hero card: «Coins forever ×1 → ×1.5K» in big letters, the Trophies and the rank as chips,
--      a green «Worth it!» sticker when the hint says so.
--   2. «What do I choose?» — the family tiles (emblem, name, short benefit; no pick = dimmed with a lock) with one plain
--      line under them that says what the chosen family does, and the start world with ‹ › arrows.
--   3. «What do I lose?» — two rows of icon chips (kept / starts over) and the big green hold button.
-- The logic (quote, hold, master claim, server replies) is the one Codex wrote in stage 5; only the layout changed.
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rebirth = require(Shared.Play.Rebirth)
local Ranks = require(Shared.Play.Ranks)
local Family = require(Shared.Play.Family)
local Hold = require(Shared.Play.RebirthHold)
local Remotes = require(Shared.Remotes)
local Format = require(Shared.Format)
local Profile = require(script.Parent.Parent.ProfileState)
local Candy = require(script.Parent.Candy)
local W = require(script.Parent.MenuWidgets)
local Window = {}
local offset, scale = UDim2.fromOffset, UDim2.fromScale

-- layout in design units: the body starts under the title ribbon, cards sit CARD_GAP apart
local SIDE, TOP, BOTTOM = 14, 26, 12
local GAP = W.CARD_GAP
local ROWS = { 0.25, 0.46, 0.29 } -- hero, choices, keep + button (shares of the free height)
local QUIET = Color3.fromHex("6B6F8C")
local LOCKED = Color3.fromHex("E9E1D3")
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

local function hex(c: Color3): string
	return "#" .. c:ToHex()
end

-- one band of the body: full width, its share of the height left after the fixed margins and gaps
-- the geometry of bands first..last as one block: full width, their share of the height left after margins and gaps
local function span(first: number, last: number): (UDim2, UDim2)
	local fixed = TOP + BOTTOM + GAP * (#ROWS - 1)
	local y, h = 0, 0
	for i = 1, last do
		if i < first then
			y += ROWS[i]
		else
			h += ROWS[i]
		end
	end
	local gaps = GAP * (last - first)
	return UDim2.new(1, -SIDE * 2, h, gaps - h * fixed),
		UDim2.new(0, SIDE, y, TOP + GAP * (first - 1) - y * fixed)
end

local function band(parent: Instance, name: string, index: number): Frame
	local size, at = span(index, index)
	return Candy.frame(parent, name, size, at)
end

local function card(parent: Instance, name: string): (Frame, Frame)
	return Candy.panel(parent, name, scale(1, 1), scale(0, 0))
end

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

-- a row of icon chips: «Останется: [кирки] [навыки] …»
local function chips(
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
		scale(0.24, 0.36),
		scale(0.03, y),
		13,
		color,
		Enum.TextXAlignment.Left
	)
	table.insert(keyed, { head, title })
	local row = Candy.frame(parent, "Chips", scale(0.71, 0.36), scale(0.27, y))
	local boxes = {}
	for _, item in items do
		local chip = Candy.frame(row, "Chip", scale(0.25, 1), scale(0, 0), Candy.rowColor)
		Candy.round(chip, 8)
		Candy.icon(chip, item[1], UDim2.fromOffset(16, 16), UDim2.new(0, 3, 0.5, -8))
		local text = label(
			chip,
			"Label",
			UDim2.new(1, -24, 0.78, 0),
			UDim2.new(0, 22, 0.11, 0),
			12,
			nil,
			Enum.TextXAlignment.Left
		)
		table.insert(keyed, { text, item[2] })
		table.insert(boxes, chip)
	end
	W.row(boxes, UDim.new(0, 0), UDim.new(1, 0), nil, 6)
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
	-- «Выгодно!» as a green sticker above the 🔥 button (it used to be bare purple text that slid under the button)
	local badgeBox, badge =
		W.pill(fire.box, "WorthIt", offset(86, 22), UDim2.new(0.5, 0, 0, -28), W.green, 13)
	badgeBox.AnchorPoint = Vector2.new(0.5, 0)
	badge.TextColor3 = Candy.white
	local hold = Hold.new()
	local changedAt = -math.huge
	local masterMode = false
	local quote, family, start = nil, "", 1
	local inspect: string? = nil -- a locked tile the player just tapped: its line says «no pickaxe»
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
	-- labels whose text is a fixed string key: set on every refresh, the locale is known only after the profile loads
	local keyed: { { any } } = {}

	-- 1. hero: what the rebirth gives
	local heroBand = band(panel, "HeroBand", 1)
	local _, hero = card(heroBand, "Hero")
	local caption = label(
		hero,
		"Caption",
		scale(0.55, 0.26),
		scale(0.035, 0.08),
		14,
		QUIET,
		Enum.TextXAlignment.Left
	)
	local multiplier = label(
		hero,
		"Multiplier",
		scale(0.56, 0.6),
		scale(0.035, 0.32),
		40,
		nil,
		Enum.TextXAlignment.Left
	)
	multiplier.RichText = true
	local cupsBox, cupsText =
		W.pill(hero, "Cups", scale(0.36, 0.36), scale(0.61, 0.1), W.yellow, 16)
	local rankBox, rankText =
		W.pill(hero, "Rank", scale(0.36, 0.36), scale(0.61, 0.54), Candy.purple, 14)
	rankText.TextColor3 = Candy.white
	local stickerBox, sticker =
		W.pill(heroBand, "WorthIt", offset(96, 26), UDim2.new(0.5, 0, 0, -10), W.green, 15)
	stickerBox.AnchorPoint, stickerBox.Rotation, stickerBox.ZIndex = Vector2.new(0.5, 0), -6, 4
	sticker.TextColor3, sticker.ZIndex = Candy.white, 4

	-- 2. choices: family + start world
	local middle = band(panel, "Choices", 2)
	local familyBox, familyCard = card(middle, "FamilyCard")
	local familyTitle = label(
		familyCard,
		"Title",
		scale(0.92, 0.18),
		scale(0.04, 0.05),
		14,
		nil,
		Enum.TextXAlignment.Left
	)
	local tileRow = Candy.frame(familyCard, "Tiles", scale(0.94, 0.48), scale(0.03, 0.27))
	local explain = label(
		familyCard,
		"Explain",
		scale(0.92, 0.18),
		scale(0.04, 0.78),
		13,
		QUIET,
		Enum.TextXAlignment.Left
	)
	local tiles = {}
	local tileBoxes = {}
	for _, f in Config.familyRules.order do
		local button = Candy.button(tileRow, f, scale(0.25, 1), scale(0, 0), "neutral", 15)
		local face = button.face
		local emblem, emblemIcon =
			W.iconCircle(face, "family_" .. f, scale(0.9, 0.56), scale(0.5, 0.06))
		emblem.AnchorPoint = Vector2.new(0.5, 0)
		local lock = Candy.icon(emblem, "lock", scale(0.6, 0.6), scale(0.6, 0.5))
		Candy.fit(button.text, scale(0.92, 0.32), scale(0.04, 0.64))
		table.insert(keyed, { button.text, "family_" .. f })
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
		tiles[f] = { button = button, emblem = emblemIcon, lock = lock, check = check }
		table.insert(tileBoxes, button.box)
	end
	W.row(tileBoxes, UDim.new(0, 0), UDim.new(1, 0), nil, 8)

	local startBox, startCard = card(middle, "StartCard")
	local startTitle = label(
		startCard,
		"Title",
		scale(0.88, 0.18),
		scale(0.06, 0.05),
		14,
		nil,
		Enum.TextXAlignment.Left
	)
	local world = label(startCard, "World", scale(0.56, 0.32), scale(0.22, 0.25), 26)
	local worldName = label(startCard, "WorldName", scale(0.8, 0.17), scale(0.1, 0.57), 12, QUIET)
	local liftNote = label(startCard, "Lift", scale(0.88, 0.18), scale(0.06, 0.78), 11, QUIET)
	local arrows = {}
	for _, direction in { -1, 1 } do
		local button = Candy.button(
			startCard,
			if direction < 0 then "Previous" else "Next",
			scale(0.17, 0.42),
			scale(if direction < 0 then 0.03 else 0.8, 0.23),
			"neutral",
			24
		)
		button.text.Text = translate(if direction < 0 then "rebirth_prev" else "rebirth_next")
		button.input.Activated:Connect(function()
			if quote and not hold.sent and quote.liftMax > 1 then
				start = (start - 1 + direction) % quote.liftMax + 1
				refresh()
			end
		end)
		table.insert(arrows, button)
	end

	-- 3. what stays, what starts over, and the hold button
	local bottom = band(panel, "Commit", 3)
	local keepBox, keepCard = card(bottom, "KeepCard")
	chips(keepCard, "rebirth_keep_title", Candy.green, KEEP, 0.1, keyed)
	chips(keepCard, "rebirth_lose_title", Candy.red, LOSE, 0.54, keyed)
	local holdColumn = Candy.frame(bottom, "HoldColumn", scale(1, 1), scale(0, 0))
	local confirm = Candy.button(holdColumn, "Confirm", scale(1, 0.7), scale(0, 0), "confirm", 17)
	local fill = Candy.frame(
		confirm.face,
		"HoldProgress",
		scale(0, 1),
		scale(0, 0),
		Color3.fromHex("15803D")
	)
	Candy.round(fill)
	fill.ZIndex = confirm.face.ZIndex
	confirm.text.ZIndex = fill.ZIndex + 1
	local notice = label(holdColumn, "Notice", scale(1, 0.26), scale(0, 0.74), 12, QUIET)

	local function layout()
		-- the master reward has no start or keep rows: its family tiles take the whole lower part
		Candy.fit(middle, span(2, if masterMode then 3 else 2))
		if masterMode then
			W.row({ familyBox }, UDim.new(0, 0), UDim.new(1, 0))
		else
			W.row({ familyBox, startBox }, UDim.new(0, 0), UDim.new(1, 0), { 0.64, 0.36 }, GAP)
		end
		W.row({ keepBox, holdColumn }, UDim.new(0, 0), UDim.new(1, 0), { 0.64, 0.36 }, GAP)
		startBox.Visible = not masterMode
		bottom.Visible = not masterMode
	end

	local function resetQuote()
		local p = Profile.getProfile()
		if p then
			quote = Rebirth.quote(p)
			family, start = quote.family, quote.start
		end
	end

	local function liftText(): string
		local rankLift = Ranks.lift(quote.after)
		if rankLift <= 1 then
			for _, rank in Config.rebirth.ranks do
				if (rank.lift or 1) > 1 then
					return translate("rebirth_lift_locked", translate("rank_" .. rank.id))
				end
			end
			return ""
		elseif quote.liftMax > 1 then
			return translate("rebirth_lift_cap", quote.liftMax)
		end
		return translate("rebirth_lift_depth")
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
		local worth = not masterMode and quote.available and player:GetAttribute("RebirthHint") == 2
		stickerBox.Visible = worth
		sticker.Text = translate("rebirth_profitable")
		if masterMode then
			caption.Text = translate("rebirth_master_hint")
			multiplier.Text = translate("master_epic_title")
			cupsBox.Visible, rankBox.Visible = false, false
			Candy.fit(multiplier, scale(0.93, 0.6), scale(0.035, 0.32))
		else
			caption.Text = translate("rebirth_coins_forever")
			multiplier.Text = string.format(
				'<font color="%s">×%s</font>  →  <font color="%s">×%s</font>',
				hex(QUIET),
				Format.short(1 + quote.cups),
				hex(Candy.purple),
				Format.short(1 + quote.after)
			)
			Candy.fit(multiplier, scale(0.56, 0.6), scale(0.035, 0.32))
			-- nothing to gain yet: only the current multiplier, no «+0»
			cupsBox.Visible = quote.gain > 0
			cupsText.Text = translate("rebirth_cups_gain", Format.short(quote.gain))
			if quote.gain <= 0 then
				multiplier.Text = string.format(
					'<font color="%s">×%s</font>',
					hex(Candy.purple),
					Format.short(1 + quote.cups)
				)
			end
			local before = Ranks.of(quote.cups)
			rankBox.Visible = quote.rank ~= nil
			if quote.rank then
				local name = translate("rank_" .. quote.rank.id)
				local promoted = not before or before.id ~= quote.rank.id
				rankText.Text =
					translate(if promoted then "rebirth_new_rank" else "rebirth_rank", name)
				rankBox.BackgroundColor3 = if promoted then Candy.purple else Candy.rowColor
				rankText.TextColor3 = if promoted then Candy.white else Candy.ink
			end
		end

		-- family tiles
		familyTitle.Text =
			translate(if masterMode then "rebirth_master_choose" else "rebirth_family_title")
		for f, tile in tiles do
			local has = masterMode or table.find(quote.families, f) ~= nil
			local chosen = not masterMode and f == family
			local button = tile.button
			if chosen then
				W.tone(button, W.familyColors[f])
			else
				W.tone(button, if has then Candy.white else LOCKED)
			end
			button.text.TextColor3 = if has then Candy.ink else QUIET
			tile.emblem.ImageTransparency = if has then 0 else 0.55
			tile.lock.Visible = not has
			tile.check.Visible = chosen
		end
		explain.TextColor3 = QUIET
		if masterMode then
			explain.Text = ""
		elseif inspect then
			explain.Text = translate("family_" .. inspect) .. ": " .. translate("rebirth_no_pick")
			explain.TextColor3 = Candy.red
		elseif family ~= "" then
			explain.Text = translate("family_" .. family)
				.. ": "
				.. translate("family_explain_" .. family)
		else
			explain.Text = translate("family_explain_none")
		end

		-- start world
		startTitle.Text = translate("rebirth_start_title")
		world.Text = translate("rebirth_world", start)
		local info = Config.worlds[start]
		worldName.Text = if info then translate("world_" .. info.id) else ""
		for _, arrow in arrows do
			arrow.box.Visible = quote.liftMax > 1
		end
		liftNote.Text = liftText()

		-- the button
		if quote.available then
			W.tone(confirm, W.green, Candy.white)
			Candy.buttonIcon(confirm, nil)
			confirm.text.Text = translate(if hold.sent then "rebirth_wait" else "rebirth_hold_hint")
			notice.Text = if worth then "" else translate("rebirth_deeper")
		else
			Candy.paint(confirm, "disabled")
			Candy.buttonIcon(confirm, "lock")
			confirm.text.Text = translate(
				"rebirth_need_plate",
				math.max(Config.rebirth.firstAfterWorld, p.circleStartWorld)
			)
			notice.Text = ""
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
		-- the Trophies chip blinks when the server answered with a fresh quote
		cupsBox.BackgroundColor3 = if now - changedAt < cfg.changedFlashSeconds
			then Candy.purple
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
