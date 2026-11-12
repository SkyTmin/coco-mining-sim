--!strict
-- Functional event hooks. All deadlines and outcomes come from the server.
local Lighting = game:GetService("Lighting")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Profile = require(script.Parent.Parent.ProfileState)
local Sfx = require(Shared.Sfx)
local Candy = require(script.Parent.Parent.Ui.Candy)
local Fx = {}
function Fx.new(
	parent: Instance,
	world: Instance,
	position: (any) -> Vector3,
	translate: (string, ...any) -> string,
	toast: (string, ...any) -> ()
): any
	local cfg = Config.events.visual
	local layer = Candy.layer(parent, "MineEvents", cfg.layer)
	local holders = {}
	local vein, bomb, feverUntil = nil, nil, 0
	local fadeAt: number? = nil
	local overlay = Instance.new("ColorCorrectionEffect")
	overlay.Name, overlay.Enabled, overlay.Parent = "MineFever", false, Lighting
	local edges = {}
	for _, edge in cfg.edges do
		local box = Candy.frame(
			layer,
			"FeverEdge",
			UDim2.fromScale(edge[1], edge[2]),
			UDim2.fromScale(edge[3], edge[4]),
			Color3.fromHex(cfg.gold)
		)
		box.Visible = false
		table.insert(edges, box)
	end
	local fever = Candy.text(
		layer,
		"FeverClock",
		UDim2.fromScale(cfg.feverWidth, cfg.labelHeight),
		UDim2.fromScale(cfg.feverX, cfg.feverY),
		cfg.fontSize,
		Color3.fromHex(cfg.gold)
	)
	local arrow = Candy.text(
		layer,
		"EventArrow",
		UDim2.fromOffset(cfg.arrowSize, cfg.arrowSize),
		UDim2.fromScale(0.5, 0.5),
		cfg.fontSize,
		Color3.fromHex(cfg.gold)
	)
	fever.Visible, arrow.Visible = false, false
	local function clearMarkers()
		for _, holder in holders do
			holder.part:Destroy()
		end
		table.clear(holders)
		fadeAt = nil
	end
	local function markers(cells: { any }, color: string)
		clearMarkers()
		for _, cell in cells do
			local part = Instance.new("Part")
			part.Name = "EventMarker"
			part.Size = Vector3.one * Config.mine.blockSize
			part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery = true, false, false, false
			part.Transparency = 1
			part.Parent = world
			local box = Instance.new("SelectionBox")
			box.Adornee, box.Color3, box.LineThickness, box.Parent =
				part, Color3.fromHex(color), cfg.outline, part
			local gui = Instance.new("BillboardGui")
			gui.Size, gui.AlwaysOnTop, gui.Parent =
				UDim2.fromOffset(cfg.timerSize, cfg.timerSize), true, part
			local label = Candy.text(
				gui,
				"Timer",
				UDim2.fromScale(1, 1),
				UDim2.fromScale(0, 0),
				cfg.fontSize,
				Candy.white
			)
			local ticks = {}
			for i = 1, cfg.ringSegments do
				local angle = (i - 1) * math.pi * 2 / cfg.ringSegments
				local tick = Candy.frame(
					gui,
					"Countdown",
					UDim2.fromOffset(cfg.ringWidth, cfg.ringWidth),
					UDim2.fromScale(
						0.5 + math.sin(angle) * cfg.ringRadius,
						0.5 - math.cos(angle) * cfg.ringRadius
					),
					Color3.fromHex(color)
				)
				tick.AnchorPoint = Vector2.new(0.5, 0.5)
				table.insert(ticks, tick)
			end
			table.insert(
				holders,
				{ part = part, cell = cell, label = label, ticks = ticks, box = box }
			)
		end
	end
	local api = {}
	function api.veinStart(cells: { any }, deadline: number)
		vein = { cells = cells, deadline = deadline }
		bomb = nil
		markers(cells, cfg.gold)
		toast("vein_toast")
		Sfx.play("level_tick", cfg.gain)
	end
	function api.veinEnd(reason: number)
		vein = nil
		if reason == 0 then
			fadeAt = workspace:GetServerTimeNow()
		else
			clearMarkers()
		end
	end
	function api.feverStart(untilTime: number, source: string)
		feverUntil = untilTime
		toast(if source == "gift" then "gift_fever" else "fever_label")
	end
	function api.feverEnd(total: number)
		feverUntil = 0
		toast("fever_total", require(Shared.Format).short(total))
	end
	function api.bombStart(cell: any, deadline: number)
		bomb = { cell = cell, deadline = deadline }
		vein = nil
		markers({ cell }, cfg.red)
		toast("bomb_toast")
	end
	function api.bombDefused(points: { any })
		bomb = nil
		clearMarkers()
		toast("bomb_blast")
		for _, cell in points do
			local part = Instance.new("Part")
			part.Name = "BlastFact"
			part.Size = Vector3.one * Config.mine.blockSize
			part.Anchored, part.CanCollide, part.CanTouch, part.CanQuery = true, false, false, false
			part.Material, part.Color, part.Transparency =
				Enum.Material.Neon, Color3.fromHex(cfg.gold), cfg.blastTransparency
			part.Position, part.Parent = cell.position or position(cell), world
			task.delay(cfg.blastSeconds, function()
				part:Destroy()
			end)
		end
		Sfx.play("break_soft", cfg.gain)
	end
	function api.bombFizzle(cells: { any })
		bomb = nil
		clearMarkers()
		toast("rubble_toast")
	end
	function api.rubble(cells: { any }) end
	local transition: any = nil
	local transitionUi = Config.rebirth.ui
	local scene = Candy.layer(parent, "RebirthTransition", Config.rebirth.ui.transitionLayer)
	scene.Visible = false
	local backdrop = Instance.new("TextButton")
	backdrop.Name, backdrop.Text, backdrop.AutoButtonColor = "RebirthBackdrop", "", false
	backdrop.Size, backdrop.BackgroundColor3, backdrop.Parent =
		UDim2.fromScale(1, 1), Color3.new(), scene
	local trails = {}
	for i = 1, transitionUi.flightBars do
		local bar = Candy.frame(
			scene,
			"WorldFlight",
			UDim2.fromScale(transitionUi.flightBarWidth, transitionUi.flightBarHeight),
			UDim2.fromScale((i - 0.5) / transitionUi.flightBars, 0),
			Candy.white
		)
		bar.BackgroundTransparency = transitionUi.flightAlpha
		table.insert(trails, bar)
	end
	local flash = Candy.frame(
		scene,
		"SmallFlash",
		UDim2.fromScale(Config.rebirth.ui.flashWidth, Config.rebirth.ui.flashHeight),
		UDim2.fromScale(0.5, 0.5),
		Color3.fromHex(Config.rebirth.ui.transitionGold)
	)
	flash.AnchorPoint = Vector2.new(0.5, 0.5)
	local title = Candy.text(
		scene,
		"Multiplier",
		UDim2.fromScale(transitionUi.transitionTitleSize[1], transitionUi.transitionTitleSize[2]),
		UDim2.fromScale(transitionUi.transitionTitleAt[1], transitionUi.transitionTitleAt[2]),
		Config.rebirth.ui.transitionFont,
		Candy.white
	)
	local detail = Candy.text(
		scene,
		"Reward",
		UDim2.fromScale(transitionUi.transitionRewardSize[1], transitionUi.transitionRewardSize[2]),
		UDim2.fromScale(transitionUi.transitionRewardAt[1], transitionUi.transitionRewardAt[2]),
		Config.rebirth.ui.transitionSmallFont,
		Candy.white
	)
	local skip = Candy.text(
		scene,
		"Skip",
		UDim2.fromScale(transitionUi.transitionSkipSize[1], transitionUi.transitionSkipSize[2]),
		UDim2.fromScale(transitionUi.transitionSkipAt[1], transitionUi.transitionSkipAt[2]),
		cfg.fontSize,
		Candy.white
	)
	local function finishTransition()
		local old = transition
		transition = nil
		scene.Visible = false
		if old then
			old.done()
		end
	end
	backdrop.Activated:Connect(function()
		if
			transition
			and workspace:GetServerTimeNow() - transition.at >= Config.rebirth.skipSeconds
		then
			finishTransition()
		end
	end)
	function api.rebirthTransition(data: any, onDone: () -> ())
		api.clear()
		transition = { at = workspace:GetServerTimeNow(), data = data, done = onDone }
		scene.Visible = true
		title.Text = translate("rebirth_forever", data.cups + 1)
		detail.Text = translate("rebirth_gain", data.gain)
			.. "\n"
			.. (
				if data.serial == 1
					then translate("rebirth_wow")
					elseif data.newRank then translate(
						"rank_up",
						translate("rank_" .. data.rank)
					)
					else ""
			)
		skip.Text = translate("rebirth_skip")
	end
	function api.clear()
		vein, bomb, feverUntil = nil, nil, 0
		clearMarkers()
		overlay.Enabled = false
		fever.Visible = false
		arrow.Visible = false
		for _, edge in edges do
			edge.Visible = false
		end
	end
	function api.step(now: number, dt: number, active: boolean?, reduced: boolean?)
		if transition then
			local age = now - transition.at
			local calm = Profile.preference("reducedMotion") == true
			local ratio = math.clamp(age / Config.rebirth.transitionSeconds, 0, 1)
			local worlds = Config.worlds
			local index = math.max(1, math.ceil((transition.data.fromWorld or 1) * (1 - ratio)))
			local color = worlds[index].color
			backdrop.BackgroundColor3 = if calm
				then Color3.new()
				else Color3.fromRGB(color[1], color[2], color[3])
			backdrop.BackgroundTransparency = Config.rebirth.ui.dimAlpha
			for i, bar in trails do
				bar.Visible = not calm
				bar.Position = UDim2.fromScale(
					(i - 0.5) / transitionUi.flightBars,
					(age * transitionUi.flightSpeed + i / transitionUi.flightBars)
							% (1 + transitionUi.flightBarHeight)
						- transitionUi.flightBarHeight
				)
			end
			flash.Visible = not calm
				and age >= Config.rebirth.ui.flashAt
				and age < Config.rebirth.ui.flashAt + Config.rebirth.ui.flashSeconds
			skip.Visible = age >= Config.rebirth.skipSeconds
			if ratio >= 1 then
				finishTransition()
			end
		end
		local lit = feverUntil > now and active ~= false
		overlay.Enabled = lit
		overlay.Saturation = cfg.saturation
		for _, edge in edges do
			edge.Visible = lit
			edge.BackgroundTransparency = cfg.edgeTransparency
		end
		fever.Visible = lit
		if lit then
			fever.Text = translate("fever_clock", math.ceil(feverUntil - now))
		end
		local event = vein or bomb
		arrow.Visible = false
		for i, holder in holders do
			holder.part.Position = position(holder.cell)
			local left = if event then math.max(0, event.deadline - now) else 0
			holder.label.Text = if i == 1 then tostring(math.ceil(left)) else ""
			local ratio = math.clamp(
				left
					/ (
						if bomb
							then Config.events.bomb.fuseSeconds
							else Config.events.vein.windowSeconds
					),
				0,
				1
			)
			for index, tick in holder.ticks do
				tick.Visible = index <= math.ceil(ratio * cfg.ringSegments)
			end
			holder.box.Transparency = if reduced
				then 0
				else cfg.pulseBase + math.sin(now * cfg.pulseSpeed) * cfg.pulseRange
			if fadeAt then
				holder.box.Transparency = math.clamp((now - fadeAt) / cfg.fadeSeconds, 0, 1)
				holder.label.TextTransparency = holder.box.Transparency
			end
		end
		if fadeAt and now - fadeAt >= cfg.fadeSeconds then
			clearMarkers()
		end
		local camera = workspace.CurrentCamera
		if event and holders[1] and camera and active ~= false then
			local screen, visible = camera:WorldToViewportPoint(holders[1].part.Position)
			if not visible then
				local viewport = camera.ViewportSize
				local direction = Vector2.new(screen.X, screen.Y) - viewport / 2
				if screen.Z < 0 then
					direction = -direction
				end
				if direction.Magnitude > 0 then
					direction = direction.Unit
				end
				arrow.Position = UDim2.fromOffset(
					viewport.X / 2 + direction.X * viewport.X * cfg.arrowRadius,
					viewport.Y / 2 + direction.Y * viewport.Y * cfg.arrowRadius
				)
				arrow.Text = translate("event_arrow")
				arrow.Rotation = math.deg(math.atan2(direction.Y, direction.X))
				arrow.Visible = true
			end
		end
	end
	return api
end
return Fx
