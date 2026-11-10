--!strict

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Sfx = require(Shared.Sfx)
local Wire = require(Shared.Mine.MineWire)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local Ride = require(Shared.Mine.Ride)

local Client = script.Parent.Parent
local ProfileState = require(Client.ProfileState)
local Wall = require(script.Parent.WallRenderer)
local Tunnel = require(script.Parent.TunnelDecor)
local Aim = require(script.Parent.Aim)
local Camera = require(script.Parent.Camera)
local Input = require(script.Parent.Input)
local Hud = require(Client.Ui.MineHud)
local Settings = require(Client.Ui.MineSettings)
local Intensity = require(Client.Fx.Intensity)
local Break = require(Client.Fx.BlockBreak)
local Lightning = require(Client.Fx.Lightning)
local TravelDebris = require(Client.Fx.TravelDebris)
local Haptics = require(Client.Fx.Haptics)

local Controller = {}
local mine = Config.mine
local S = mine.blockSize
local PENTATONIC = { 1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2 }
local STORM = Color3.fromRGB(139, 225, 255)
local WARM = Color3.fromRGB(255, 207, 144)
local RENDER_DEPTH = { 12, 16, 20 }

local function oldWindow(win: any): any
	local copy = table.clone(win)
	copy.layers = table.clone(win.layers)
	for i, layer in copy.layers do
		copy.layers[i] = table.clone(layer)
	end
	return copy
end

local function slice(win: any, cleared: number): any
	local copy = table.clone(win)
	copy.front += cleared
	copy.layers, copy.damage = {}, {}
	for i = cleared + 1, #win.layers do
		copy.layers[i - cleared] = win.layers[i]
	end
	return copy
end

function Controller.start(guiParent: Instance, translate: (string, ...any) -> string)
	local player = Players.LocalPlayer
	local intent = Remotes.event("MineIntent")
	local windowRemote = Remotes.event("MineWindow")
	local resultRemote = Remotes.event("MineResult")
	local studio = RunService:IsStudio()
	local world = Instance.new("Folder")
	world.Name, world.Parent = "LocalMine", workspace
	local hud = Hud.new(guiParent, world, translate)
	local closeSettings = Settings.start(player, guiParent, hud.gear, translate)
	local vibrate = Haptics.new(world)
	local intensity = Intensity.new()
	local view: Camera.View? = nil
	local renderer: Wall.Renderer? = nil
	local tunnel: any, breaking: any, lightning: any, debris: any
	local window: any, ride: any, pending: any
	local events: { any } = {}
	local parts: { BasePart } = {}
	local moves: { CFrame } = {}
	local lastShown: any, lastVisible: number?, lastPlateHud: boolean?
	local seq, quality, maxParts = 0, 2, 0
	local dirty, active = true, false
	local nextHit, lastRequest = -math.huge, -math.huge
	local lastCharge = -1
	local fpsAt, frames = os.clock(), 0
	local autoFrames, autoTime = 0, 0
	local measured, savedView = false, false
	local jumpButton: GuiObject? = nil
	local lastPhase = "idle"
	local waveShowing = false
	local hapticsOn = true

	local function profile(): any
		return ProfileState.getProfile()
	end
	local function pick(): Config.PickaxeConfig
		local p = profile()
		local id = player:GetAttribute("MinePickaxe") or (p and p.pickaxe) or "starter"
		return Config.pickaxes[id] or Config.pickaxes.starter
	end
	local function need(depth: number): number
		return math.clamp(
			math.ceil(Worlds.durability(depth) / pick().strength),
			1,
			mine.maxHitsPerBlock
		)
	end
	local function currentOffset(now: number): number
		if not ride then
			return 0
		end
		local phase, progress = Ride.phase(ride.timeline, now - ride.at)
		return if phase == "approach" then Ride.offset(ride.timeline, progress, ride.ability) else 0
	end
	local function haptic(kind: string, now: number)
		if active then
			vibrate(
				kind,
				now,
				ProfileState.preference("haptics"),
				ProfileState.preference("reducedMotion")
			)
		end
	end
	local function resync()
		pending, dirty = nil, true
		local now = os.clock()
		if now - lastRequest >= 0.52 then
			lastRequest = now
			intent:FireServer(Wire.encodeIntent("Resync"))
		end
	end

	local function setup(plot: number)
		if renderer then
			return
		end
		local plots = workspace:WaitForChild("Plots", 8)
		local model = plots and plots:WaitForChild("Plot_" .. plot, 8)
		local origin = model and model:WaitForChild("Origin", 8)
		if renderer or not origin or not origin:IsA("BasePart") then
			return
		end
		local frame = origin.CFrame
		renderer = Wall.new(world, frame)
		tunnel = Tunnel.new(world, frame)
		breaking = Break.new(world)
		lightning = Lightning.new(world)
		debris = TravelDebris.new(world, frame)
		view = Camera.new(player, frame)
		dirty = true
	end

	local function targetPosition(point: any, offset: number): Vector3
		local r = renderer
		return if r then Wall.position(r, point.x, point.y, point.dRel, offset) else Vector3.zero
	end
	local function menuOpen(): boolean
		return player:GetAttribute("MineMenuOpen") == true
			or player:GetAttribute("MineSettingsOpen") == true
	end
	local function canHit(): boolean
		return active and window ~= nil and not menuOpen() and (not ride or not ride.ability)
	end
	local function aim(screen: Vector2, nearby: boolean): any?
		local r = renderer
		return if r and canHit() then Aim.at(r, window, screen, nearby) else nil
	end
	local function toggle()
		if not view or not active or menuOpen() then
			return
		end
		view.mode = if view.mode == "first" then "third" else "first"
		Remotes.event("CameraView"):FireServer(view.mode)
	end

	local function request(kind: string, target: any?)
		local v = view
		local now = os.clock()
		if not v or not canHit() or pending or now < nextHit then
			return
		end
		local settings = pick()
		local ability = kind == "Ability"
		if ability and window.charge < settings.ultCharge then
			return
		end
		local cell = target or { x = 0, y = 0, dRel = 0 }
		seq = seq % 65535 + 1
		local position = cell.position or targetPosition(cell, currentOffset(now))
		local expected = { seq = seq, at = now, position = position }
		if not ability then
			local depth = window.front + cell.dRel
			local plate = Wall.ore(window, cell.x, cell.y, cell.dRel) == Wire.PLATE
			local hits = 1
			for _, damage in window.damage do
				if damage.x == cell.x and damage.y == cell.y and damage.dRel == cell.dRel then
					hits += damage.amount
					break
				end
			end
			if not plate then
				if hits >= need(depth) then
					expected.hidden = State.cellKey(cell.x, cell.y, depth)
				else
					expected.damage = { x = cell.x, y = cell.y, dRel = cell.dRel, amount = hits }
				end
			end
			Break.hit(breaking, position, cell.color or WARM, S, expected.hidden ~= nil, quality)
			if plate then
				Sfx.play("plate_hit", 0.64)
			else
				Sfx.hit(now)
				if expected.hidden then
					Sfx.play("break_soft", 0.7)
				end
			end
		end
		Camera.swing(v, if ability then Config.fx.ult.windup * 2 else settings.interval, ability)
		pending, dirty, nextHit = expected, true, now + settings.interval
		intent:FireServer(Wire.encodeIntent(kind, seq, cell.x, cell.y, cell.dRel))
	end

	windowRemote.OnClientEvent:Connect(function(packet)
		local win = Wire.decodeWindow(packet)
		if
			not win
			or (player:GetAttribute("Plot") ~= nil and win.plot ~= player:GetAttribute("Plot"))
		then
			return
		end
		window, pending, ride, dirty = win, nil, nil, true
		table.clear(events)
		setup(win.plot)
	end)

	resultRemote.OnClientEvent:Connect(function(packet)
		local res = Wire.decodeResult(packet)
		local r = renderer
		if not r or not res or not window or res.plot ~= window.plot then
			return
		end
		local expected = pending
		if res.seq ~= 0 and (not expected or expected.seq ~= res.seq) then
			resync()
			return
		end
		pending, dirty = nil, true
		if not res.accepted then
			if res.front ~= window.front then
				resync()
			end
			return
		end
		if window.front + res.delta ~= res.front then
			resync()
			return
		end
		local now = os.clock()
		local oldOffset = currentOffset(now)
		local oldFront = window.front
		local old = if res.ability then oldWindow(window) else nil
		local target = if expected
			then expected.position
			else targetPosition({ x = 0, y = 1, dRel = 0 }, oldOffset)
		local oldPlate = Worlds.of(oldFront).plateDepth
		local plateBroken = res.front > oldPlate and oldFront <= oldPlate
		for _, cell in res.cells do
			local layer = window.layers[cell.dRel + 1]
			local radius = (window.width - 1) // 2
			if layer then
				layer[(cell.x + radius) * window.height + cell.y + 1] = 0
			end
		end
		if res.delta > 0 then
			local fresh = {}
			local keep = math.max(0, mine.window - res.delta)
			for i = 1, keep do
				fresh[i] = window.layers[i + res.delta]
			end
			for i, layer in res.layers do
				fresh[keep + i] = layer
			end
			window.layers, window.front = fresh, res.front
		end
		window.charge, window.damage, window.plateDamage = res.charge, res.damage, res.plateDamage
		if res.ability or res.delta > 0 then
			local timeline = Ride.timeline(res.delta, res.ability, oldOffset)
			ride = {
				at = now,
				timeline = timeline,
				old = old,
				oldFront = oldFront,
				cleared = 0,
				offset = timeline.distance,
				delta = res.delta,
				ability = res.ability,
				blocks = res.blocks,
				coins = res.coins,
				plateBroken = plateBroken or (ride and ride.plateBroken),
				color = if pick().family == "storm" then STORM else WARM,
				frames = 0,
			}
			if res.ability and view then
				Camera.swing(view, timeline.windup * 2, true)
			end
		end
		for i, event in res.events do
			local a, b = event.points[1], event.points[2]
			if a and b then
				local at = now + event.delayMs / 1000
				local start = targetPosition(a, oldOffset)
				local finish = targetPosition(b, oldOffset)
				if res.ability then
					local t = 0.06 + 0.87 * (i - 1) / math.max(1, #res.events - 1)
					local depth = Ride.wave(ride.timeline, t, res.delta)
					at = now + ride.timeline.windup + t * ride.timeline.fracture
					local localA = r.frame:PointToObjectSpace(start)
					local localB = r.frame:PointToObjectSpace(finish)
					start = r.frame:PointToWorldSpace(Vector3.new(localA.X, localA.Y, -depth + 1.2))
					finish =
						r.frame:PointToWorldSpace(Vector3.new(localB.X, localB.Y, -depth - 3.4))
				end
				table.insert(events, { at = at, a = start, b = finish, i = i })
			end
		end
		table.sort(events, function(a, b)
			return a.at < b.at
		end)
		if not res.ability then
			if res.blocks > 0 and not plateBroken then
				if not expected or not expected.hidden or res.blocks > 1 then
					Sfx.play("break_soft", 0.7)
				end
				haptic("block", now)
			end
			if res.coins > 0 then
				Hud.coin(hud, target, res.coins)
				Sfx.coin(now, #res.finds > 0)
			end
		end
		if studio then
			player:SetAttribute("Stage02LastBlocks", res.blocks)
			player:SetAttribute("Stage02LastLinks", #res.events)
			if expected then
				player:SetAttribute("Stage02LastFeedbackMs", (now - expected.at) * 1000)
			end
		end
	end)

	local function enterPhase(phase: string, now: number)
		if not ride then
			return
		end
		if phase == "windup" then
			Sfx.play("ult_windup", 0.58)
		elseif phase == "fracture" then
			Hud.show(hud, ride.delta, ride.blocks, ride.coins, true)
			Sfx.play("ult_whump", 0.68)
			Sfx.play("ult_rumble_away", 0.42)
		elseif phase == "empty" then
			TravelDebris.settle(debris, math.min(ride.timeline.distance, 24))
		elseif phase == "approach" then
			if ride.ability then
				Sfx.play(
					"ult_rumble_near",
					0.64,
					Config.sounds.clips.ult_rumble_near[1][2] / ride.timeline.approach
				)
			else
				Hud.show(hud, ride.delta, ride.blocks, ride.coins, false)
			end
		elseif phase == "landed" then
			TravelDebris.land(debris, now, window.width * S, ride.ability)
			Sfx.play(
				if ride.ability then "ult_thud" else "ride_stop",
				if ride.ability then 0.76 else 0.53
			)
			if ride.plateBroken then
				Sfx.play("plate_break", 0.78)
			end
			haptic(
				if ride.plateBroken then "plate" elseif ride.ability then "ultimate" else "ride",
				now
			)
			Intensity.land(intensity, now, ride.ability)
			if ride.ability then
				Hud.rollPlate(hud, ride.oldFront, window.front, now)
				if ride.coins > 0 then
					Sfx.coin(now)
				end
				if studio then
					player:SetAttribute("Stage02UltFPS", ride.frames / (now - ride.at))
				end
			end
			ride = nil
		end
	end

	local function fracture(
		r: Wall.Renderer,
		progress: number,
		override: number
	): (any, number, number?)
		local depth, cleared = Ride.wave(ride.timeline, progress, ride.delta)
		local broken = math.min(ride.delta, mine.window)
		local old = ride.old
		if cleared > ride.cleared then
			for layer = ride.cleared, cleared - 1 do
				local radius = (old.width - 1) // 2
				for x = -radius, radius, math.max(1, radius) do
					if Wall.ore(old, x, 0, layer) > 0 then
						local position = Wall.position(r, x, (layer + x) % old.height, layer, 0)
						Break.hit(
							breaking,
							position,
							ride.color,
							S,
							true,
							override,
							-r.frame.LookVector
						)
					end
				end
			end
			ride.cleared, ride.slice = cleared, slice(old, cleared)
		end
		if ride.delta == 0 then
			return if progress < 0.35 then old else nil, 1, depth
		end
		if cleared >= broken then
			return nil, 0, depth
		end
		return ride.slice or old,
			math.min(RENDER_DEPTH[override], broken - cleared),
			cleared * S + 0.03
	end

	hud.eye.Activated:Connect(toggle)
	hud.ult.Activated:Connect(function()
		request("Ability", nil)
	end)
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(function()
			dirty = true
		end)
	end
	Input.start({
		active = canHit,
		first = function()
			return view ~= nil and view.mode == "first"
		end,
		aim = aim,
		hit = function(target)
			request("Hit", target)
		end,
		toggle = toggle,
		ult = function()
			request("Ability", nil)
		end,
		pan = function(delta)
			if view and active and not menuOpen() then
				Camera.pan(view, delta)
			end
		end,
	})
	Sfx.preload()
	resync()

	RunService:BindToRenderStep("MineFrame", Enum.RenderPriority.Camera.Value + 1, function(dt)
		local now = os.clock()
		local r, v = renderer, view
		if not r or not v or not window then
			if now - lastRequest >= 1 then
				resync()
			end
			return
		end
		local current = profile()
		if current and not savedView then
			v.mode, savedView = current.settings.camera, true
		end
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		local p = if root and root:IsA("BasePart")
			then r.frame:PointToObjectSpace(root.Position)
			else Vector3.new(0, 0, math.huge)
		active = math.abs(p.X) <= Config.plots.frameWidth * S / 2
			and p.Z >= 0
			and p.Z <= Config.plots.platformDepth * S
			and p.Y >= -1
			and p.Y <= mine.height * S + 6
		if not active then
			closeSettings()
		end
		local settings = current and current.settings
		local reduced = ProfileState.preference("reducedMotion")
		Sfx.level(ProfileState.preference("sfx"))
		local hapticsEnabled = ProfileState.preference("haptics")
		if hapticsOn and not hapticsEnabled then
			vibrate("off", now, false, reduced)
		end
		hapticsOn = hapticsEnabled
		if active and not measured then
			autoFrames += 1
			autoTime += dt
			if autoTime >= 15 then
				measured = true
				if autoFrames / autoTime < 40 then
					quality, dirty = 1, true
				end
			end
		end
		local override = if settings and settings.effects == "low"
			then 1
			elseif settings and settings.effects == "high" then 3
			else quality
		if pending and now - pending.at > 0.85 then
			resync()
		end

		local phase, progress = "idle", 0
		if ride then
			ride.frames += 1
			phase, progress = Ride.phase(ride.timeline, now - ride.at)
		end
		if phase ~= lastPhase or (ride and ride.entered ~= phase) then
			lastPhase, dirty = phase, true
			if ride then
				ride.entered = phase
			end
			enterPhase(phase, now)
			if studio then
				player:SetAttribute("Stage02bPhase", phase)
			end
		end
		local shown, visible, offset = window, RENDER_DEPTH[override], 0
		local waveDepth, survivor = nil, false
		local color = if ride then ride.color else WARM
		if phase == "windup" then
			shown = ride.old
		elseif phase == "fracture" then
			shown, visible, waveDepth = fracture(r, progress, override)
			offset = if shown then ride.cleared * S else ride.timeline.distance
			survivor = shown == nil
		elseif phase == "empty" then
			shown, offset, survivor = nil, ride.timeline.distance, true
		elseif phase == "approach" then
			offset = Ride.offset(ride.timeline, progress, ride.ability)
			local speed = math.max(0, (ride.offset - offset) / math.max(dt, 0.001))
			TravelDebris.step(debris, now, offset, window.width * S, speed, override)
			ride.offset = offset
			if ride.ability and offset > (mine.window - 1) * S then
				shown, survivor = nil, true
			end
		end
		Camera.glow(v, if phase == "windup" and active then color else nil)
		Tunnel.atmosphere(tunnel, active, if shown then shown.front else window.front, override)
		if waveDepth or waveShowing then
			Tunnel.wave(tunnel, waveDepth, if reduced then 0.50 else 1 - 0.42 * progress, color)
			waveShowing = waveDepth ~= nil
		end

		local plateHud = offset < 6 and phase ~= "windup" and phase ~= "fracture"
		local layout = dirty
			or shown ~= lastShown
			or visible ~= lastVisible
			or plateHud ~= lastPlateHud
		if layout then
			if shown then
				local renderWindow = shown
				if shown == window and pending and pending.damage then
					renderWindow = table.clone(window)
					renderWindow.damage = table.clone(window.damage)
					table.insert(renderWindow.damage, pending.damage)
				end
				Wall.update(
					r,
					renderWindow,
					visible,
					pending and pending.hidden,
					translate,
					pick().strength,
					plateHud
				)
				Break.cracks(breaking, r, renderWindow, need, State.cellKey)
			else
				Wall.clear(r)
			end
			lastShown, lastVisible, lastPlateHud = shown, visible, plateHud
		end
		if phase == "windup" then
			Break.cracks(breaking, r, shown, need, State.cellKey, progress, color)
		end
		if layout or phase == "approach" then
			table.clear(parts)
			table.clear(moves)
			if shown then
				Wall.moves(r, shown, offset, parts, moves)
			end
			local farLayers = if survivor
				then 0
				elseif phase == "fracture" then visible
				else mine.window
			Tunnel.moves(tunnel, shown or window, offset, farLayers, survivor, parts, moves)
			workspace:BulkMoveTo(parts, moves, Enum.BulkMoveMode.FireCFrameChanged)
			dirty = false
		end
		while events[1] and now >= events[1].at do
			local event = table.remove(events, 1)
			Lightning.bolt(lightning, event.a, event.b, now, override, event.i == 1)
			Intensity.flash(intensity, 0.08, STORM, now)
			if event.i == 1 then
				Sfx.play("bolt_soft", 0.38)
			end
			Sfx.play("link_note", 0.77, PENTATONIC[(event.i - 1) % #PENTATONIC + 1])
		end
		Lightning.step(lightning, now)
		Break.step(breaking, now)
		Camera.step(v, active, Intensity.sample(intensity, r.frame, now, reduced, active))
		local cap = pick().ultCharge
		if lastCharge >= 0 and lastCharge < cap and window.charge >= cap then
			Sfx.play("link_note", 0.85, 1.65)
		end
		lastCharge = window.charge
		Hud.set(
			hud,
			if ride and ride.ability then ride.oldFront else window.front,
			if current then current.coins else 0,
			window.charge,
			cap
		)
		local hint = nil
		if r.pulse.Enabled then
			r.pulse.FillTransparency = 0.60 + math.sin(now * 6) * 0.19
			local child = r.limits:FindFirstChildWhichIsA("BasePart")
			if child then
				hint = child.Position
			end
		end
		hud.fractureProgress = if phase == "fracture" then progress else 1
		Hud.step(
			hud,
			now,
			active,
			v.mode == "first" and not UserInputService.TouchEnabled and canHit(),
			hint
		)
		if not jumpButton then
			local touchGui = guiParent:FindFirstChild("TouchGui")
			local candidate = touchGui and touchGui:FindFirstChild("JumpButton", true)
			if candidate and candidate:IsA("GuiObject") then
				jumpButton = candidate
			end
		end
		if jumpButton then
			jumpButton.Visible = not active
		end
		frames += 1
		maxParts = math.max(maxParts, r.pool.used())
		if now - fpsAt >= 1 then
			player:SetAttribute("MineFPS", math.floor(frames / (now - fpsAt) + 0.5))
			player:SetAttribute("MineParts", r.pool.used())
			if studio then
				player:SetAttribute("Stage02MaxPool", maxParts)
				player:SetAttribute("Stage02Front", window.front)
				player:SetAttribute("Stage02PlateDamage", window.plateDamage)
			end
			fpsAt, frames = now, 0
		end
	end)
end

return Controller
