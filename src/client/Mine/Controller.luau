--!strict

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Sfx = require(Shared.Sfx)
local Upgrade = require(Shared.Play.Upgrade)
local Wire = require(Shared.Mine.MineWire)
local State = require(Shared.Mine.MineState)
local Worlds = require(Shared.Mine.Worlds)
local Circle = require(Shared.Play.Circle)
local Power = require(Shared.Play.Power)
local Shapes = require(Shared.Mine.Shapes)
local Ride = require(Shared.Mine.Ride)

local Client = script.Parent.Parent
local ProfileState = require(Client.ProfileState)
local Wall = require(script.Parent.WallRenderer)
local Tunnel = require(script.Parent.TunnelDecor)
local DepthSign = require(script.Parent.DepthSign)
local Aim = require(script.Parent.Aim)
local Camera = require(script.Parent.Camera)
local Input = require(script.Parent.Input)
local Hud = require(Client.Ui.MineHud)
local Kit = require(Client.Ui.Kit)
local Settings = require(Client.Ui.MineSettings)
local Upgrades = require(Client.Ui.Upgrades)
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
	local studio = RunService:IsStudio()
	local world = Instance.new("Folder")
	world.Name, world.Parent = "LocalMine", workspace
	local hud = Hud.new(guiParent, world, translate)
	local closeSettings = Settings.start(player, guiParent, hud.gear, translate)
	local vibrate = Haptics.new(world)
	local intensity = Intensity.new()
	local view: Camera.View? = nil
	local renderer: Wall.Renderer? = nil
	local depthSign: DepthSign.Sign? = nil
	local spectatorSigns: { [BasePart]: DepthSign.Sign } = {}
	local tunnel: any, breaking: any, lightning: any, debris: any
	local window: any, ride: any, pending: any
	local events: { any } = {}
	local parts: { BasePart } = {}
	local moves: { CFrame } = {}
	local lastShown: any, lastVisible: number?
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
	local defaultCircle = Circle.new()
	local function pick(): Circle.Pick
		local p = profile()
		local id = player:GetAttribute("MinePickaxe") or (p and p.pickaxe) or "starter"
		return Circle.pick(
			id,
			(p and p.circle) or defaultCircle,
			if window then window.front else 0
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
	local stepUpgrades = Upgrades.new(guiParent, player, translate, haptic)
	local previousCards: { [string]: number }? = nil
	ProfileState.changed:Connect(function()
		local p = ProfileState.getProfile()
		if p then
			local cards = p.circle.cards
			if previousCards and cards ~= previousCards then
				for _, id in Upgrade.cards do
					if #Upgrade.morphs(id, previousCards[id] or 0, cards[id] or 0) > 0 then
						local now = os.clock()
						Intensity.flash(intensity, 0.2, WARM, now)
						haptic("morph", now)
						Sfx.play("card_morph", 0.68)
					end
				end
			end
			previousCards = cards
		end
	end)
	local lastTarget: any = nil
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
		depthSign = DepthSign.new(world, frame, window.front, model)
		spectatorSigns = DepthSign.spectators(world, plots :: Instance, plot)
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
	local function canControl(): boolean
		return active and not menuOpen()
	end
	local function canHit(): boolean
		return canControl() and window ~= nil and ride == nil
	end
	local function aim(screen: Vector2): any?
		local r = renderer
		return if r and canHit() then Aim.at(r, window, screen) else nil
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
		if target then
			lastTarget = { x = target.x, y = target.y, depth = window.front + target.dRel }
		end
		seq = seq % 65535 + 1
		local position = cell.position or targetPosition(cell, currentOffset(now))
		local expected = { seq = seq, at = now, position = position }
		if not ability then
			local depth = window.front + cell.dRel
			local ore = Wall.ore(window, cell.x, cell.y, cell.dRel)
			local plate = ore == Wire.PLATE
			expected.ore = ore
			expected.impactAt = now + Config.fx.swing.contact
			expected.color, expected.plate = cell.color or WARM, plate
			local progress = 0
			for _, damage in window.damage do
				if damage.x == cell.x and damage.y == cell.y and damage.dRel == cell.dRel then
					progress = damage.amount / 255
					break
				end
			end
			if not plate then
				local shape =
					Shapes.cells(settings.shape, cell.x, cell.y, window.width, window.height)
				for _, point in shape do
					if point.x == cell.x and point.y == cell.y then
						local hp = Power.blockHP(Worlds.durability(depth), settings.strength)
						local after = progress + settings.strength / hp
						if after >= 1 - 0.5 / 255 then
							expected.hidden = State.cellKey(cell.x, cell.y, depth)
						else
							expected.damage = {
								x = cell.x,
								y = cell.y,
								dRel = cell.dRel,
								amount = Power.packDamage(after),
							}
						end
						break
					end
				end
			end
		end
		Camera.swing(v, now, Config.fx.ult.windup * 2, ability)
		pending, dirty, nextHit = expected, true, now + settings.interval
		intent:FireServer(Wire.encodeIntent(kind, seq, cell.x, cell.y, cell.dRel))
	end

	local function onWindow(packet: any)
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
	end

	local function applyLayers(part: any)
		if
			not part
			or not window
			or part.plot ~= window.plot
			or part.front ~= window.front
			or part.width ~= window.width
			or part.height ~= window.height
		then
			return
		end
		for i, layer in part.layers do
			window.layers[part.offset + i] = layer
		end
		dirty = true
	end

	local function applyResult(res: any)
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
		local oldWorld = Worlds.of(oldFront)
		local oldPlate = oldWorld.plateDepth
		local plateBroken = res.front > oldPlate and oldFront <= oldPlate
		local barrier = if res.ability
			then Ride.barrier(
				oldFront,
				res.front,
				oldPlate,
				window.plateDamage,
				if plateBroken then oldWorld.plate.hp else res.plateDamage
			)
			else nil
		for _, cell in res.cells do
			local layer = window.layers[cell.dRel + 1]
			local radius = (window.width - 1) // 2
			if layer then
				layer[(cell.x + radius) * window.height + cell.y + 1] = 0
			end
		end
		if res.delta > 0 then
			window.layers, window.front = res.layers, res.front
		end
		window.charge, window.damage, window.plateDamage = res.charge, res.damage, res.plateDamage
		if res.ability or res.delta > 0 then
			local timeline = Ride.timeline(res.delta, res.ability, oldOffset, barrier)
			ride = {
				at = now,
				timeline = timeline,
				old = old,
				oldFront = oldFront,
				cleared = 0,
				offset = timeline.distance,
				delta = res.delta,
				fractureLayers = if barrier then barrier.layers else res.delta,
				barrier = barrier,
				ability = res.ability,
				blocks = res.blocks,
				coins = res.coins,
				plateBroken = plateBroken or (ride and ride.plateBroken),
				color = if pick().family == "storm" then STORM else WARM,
				frames = 0,
			}
			if res.ability and view then
				Camera.swing(view, now, timeline.windup * 2, true)
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
					local depth = Ride.wave(ride.timeline, t, ride.fractureLayers)
					local endDepth = if barrier
						then math.min(depth + 3.4, barrier.distance - 0.15)
						else depth + 3.4
					at = now + ride.timeline.windup + t * ride.timeline.fracture
					local localA = r.frame:PointToObjectSpace(start)
					local localB = r.frame:PointToObjectSpace(finish)
					start = r.frame:PointToWorldSpace(Vector3.new(localA.X, localA.Y, -depth + 1.2))
					finish = r.frame:PointToWorldSpace(Vector3.new(localB.X, localB.Y, -endDepth))
				end
				table.insert(events, { at = at, a = start, b = finish, i = i })
			end
		end
		table.sort(events, function(a, b)
			return a.at < b.at
		end)
		if not res.ability then
			if res.heavy or res.crit or res.rain then
				Intensity.flash(intensity, if res.heavy or res.mega then 0.2 else 0.10, WARM, now)
				if res.heavy then
					Sfx.play("heavy_hit", 0.7)
				elseif res.crit then
					Sfx.play("crit_soft", 0.64)
				end
				if res.rain then
					Sfx.play("coin_rain", 0.63)
				end
			end
			if res.blocks > 0 and not plateBroken then
				if not expected or not expected.hidden or res.blocks > 1 then
					Sfx.play("break_soft", 0.7)
				end
				haptic("block", now)
			end
			if res.coins > 0 then
				Hud.coin(hud, target, res.coins, expected and expected.ore)
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
	end

	local function impact(now: number, r: Wall.Renderer, effects: number)
		local expected = pending
		if
			not expected
			or not expected.impactAt
			or expected.impacted
			or now < expected.impactAt
		then
			return
		end
		expected.impacted, dirty = true, true
		Break.hit(
			breaking,
			expected.position,
			expected.color,
			S,
			expected.hidden ~= nil,
			effects,
			-r.frame.LookVector
		)
		if expected.plate then
			Sfx.play("plate_hit", 0.64)
		else
			Sfx.hit(now)
			if expected.hidden then
				Sfx.play("break_soft", 0.7)
			end
		end
		if expected.result then
			applyResult(expected.result)
			for _, layers in expected.tail do
				applyLayers(layers)
			end
		end
	end

	windowRemote.OnClientEvent:Connect(function(kind, packet)
		if kind == "window" then
			onWindow(packet)
		elseif kind == "layers" then
			local part = Wire.decodeLayers(packet)
			local result = pending and pending.result
			if part and result and result.delta > 0 and part.front == result.front then
				table.insert(pending.tail, part)
			else
				applyLayers(part)
			end
		elseif kind == "result" then
			local res = Wire.decodeResult(packet)
			local expected = pending
			if
				res
				and res.accepted
				and expected
				and expected.seq == res.seq
				and expected.impactAt
				and not expected.impacted
			then
				expected.result, expected.tail = res, {}
			else
				applyResult(res)
			end
		end
	end)

	local function strikePlate(now: number)
		if not ride.barrier or ride.hitAt then
			return
		end
		ride.hitAt, dirty = now, true
		TravelDebris.plateImpact(debris, ride.barrier.distance, window.width * S, window.height * S)
		Intensity.flash(intensity, 0.16, ride.color, now)
		Sfx.play("plate_hit", 0.67)
	end

	local function enterPhase(phase: string, now: number)
		if not ride then
			return
		end
		local atPlate = ride.barrier and ride.barrier.layers == 0
		if phase == "windup" then
			Sfx.play("ult_windup", 0.58)
		elseif phase == "fracture" then
			Hud.show(hud, ride.delta, ride.blocks, ride.coins, true)
			Sfx.play("ult_whump", 0.68)
			if not atPlate then
				Sfx.play("ult_rumble_away", 0.42)
			end
		elseif phase == "empty" then
			strikePlate(now)
			if not ride.barrier then
				TravelDebris.settle(debris, math.min(ride.timeline.distance, 24))
			end
		elseif phase == "approach" then
			strikePlate(now)
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
			strikePlate(now)
			if not atPlate then
				TravelDebris.land(debris, now, window.width * S, ride.ability)
				Sfx.play(
					if ride.ability then "ult_thud" else "ride_stop",
					if ride.ability then 0.76 else 0.53
				)
				Intensity.land(intensity, now, ride.ability)
			end
			if ride.plateBroken then
				Sfx.play("plate_break", 0.78)
				haptic("plate", now)
				local nextWorld = Worlds.of(window.front)
				local oldWorld = Worlds.of(ride.oldFront)
				if nextWorld.index > oldWorld.index then
					local rgb = nextWorld.color
					Intensity.flash(intensity, 0.2, Color3.fromRGB(rgb[1], rgb[2], rgb[3]), now)
					Hud.enterWorld(hud, now, nextWorld, oldWorld.plate.reward)
					Sfx.play("world_enter", 0.66)
					task.delay(0.17, function()
						haptic("world", os.clock())
					end)
				end
			elseif not atPlate then
				haptic(if ride.ability then "ultimate" else "ride", now)
			end
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
		override: number,
		now: number
	): (any, number, number?)
		local depth, cleared = Ride.wave(ride.timeline, progress, ride.fractureLayers)
		local broken = math.min(ride.fractureLayers, mine.window)
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
							-r.frame.LookVector,
							true
						)
					end
				end
			end
			ride.cleared, ride.slice = cleared, slice(old, cleared)
		end
		local barrier = ride.barrier
		if
			barrier
			and cleared >= broken
			and depth >= barrier.distance - 0.2
			and (barrier.layers > 0 or progress >= 0.5)
		then
			strikePlate(now)
		end
		local waveDepth = if ride.hitAt then nil elseif barrier then depth - 0.14 else depth
		if ride.delta == 0 and not barrier then
			return if progress < 0.35 then old else nil, 1, depth
		end
		if cleared >= broken then
			return nil, 0, waveDepth
		end
		return ride.slice or old, math.min(mine.window, broken - cleared), cleared * S + 0.03
	end

	local function faceWall()
		if view and canControl() then
			Camera.faceWall(view, os.clock())
		end
	end
	hud.eye.Activated:Connect(toggle)
	hud.focus.Activated:Connect(faceWall)
	hud.ult.Activated:Connect(function()
		request("Ability", nil)
	end)
	for _, attribute in { "language", "MineLanguage" } do
		player:GetAttributeChangedSignal(attribute):Connect(function()
			dirty = true
			if depthSign then
				DepthSign.refresh(depthSign)
			end
			for _, sign in spectatorSigns do
				DepthSign.refresh(sign)
			end
		end)
	end
	Input.start({
		active = canControl,
		canHit = canHit,
		first = function()
			return view ~= nil
				and view.mode == "first"
				and player:GetAttribute("MineUpgradesOpen") ~= true
		end,
		aim = aim,
		hit = function(target)
			request("Hit", target)
		end,
		toggle = toggle,
		focus = faceWall,
		ult = function()
			request("Ability", nil)
		end,
		pan = function(delta)
			if view then
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

		impact(now, r, override)

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
		if depthSign then
			local display = if not ride
				then window.front
				elseif phase == "approach" then ride.oldFront + math.floor(
					ride.delta * progress
				)
				else ride.oldFront
			local rolling = ride ~= nil and (ride.ability or ride.delta >= 5)
			DepthSign.step(depthSign, now, display, rolling, reduced, active)
		end
		for origin, sign in spectatorSigns do
			local depth = origin:GetAttribute("MineFront")
			if typeof(depth) == "number" then
				DepthSign.step(sign, now, depth, false, reduced, false)
			end
		end
		local shown, visible, offset = window, #window.layers, 0
		local waveDepth, survivor = nil, false
		local color = if ride then ride.color else WARM
		if phase == "windup" then
			shown = ride.old
		elseif phase == "fracture" then
			shown, visible, waveDepth = fracture(r, progress, override, now)
			offset = if shown
				then ride.cleared * S
				elseif ride.barrier then ride.barrier.distance
				else ride.timeline.distance
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
		Tunnel.width(tunnel, window.width)
		Tunnel.atmosphere(
			tunnel,
			active,
			if ride and ride.plateBroken
				then ride.oldFront
				elseif shown then shown.front
				else window.front,
			override
		)
		if waveDepth or waveShowing then
			Tunnel.wave(tunnel, waveDepth, if reduced then 0.50 else 1 - 0.42 * progress, color)
			waveShowing = waveDepth ~= nil
		end

		local layout = dirty or shown ~= lastShown or visible ~= lastVisible
		if layout then
			if shown then
				local renderWindow = shown
				if shown == window and pending and pending.impacted and pending.damage then
					renderWindow = table.clone(window)
					renderWindow.damage = table.clone(window.damage)
					table.insert(renderWindow.damage, pending.damage)
				end
				Wall.update(
					r,
					renderWindow,
					visible,
					pending and pending.impacted and pending.hidden or nil
				)
				Break.cracks(breaking, r, renderWindow, State.cellKey)
			else
				Wall.clear(r)
			end
			lastShown, lastVisible = shown, visible
		end
		if phase == "windup" then
			Break.cracks(breaking, r, shown, State.cellKey, progress, color)
		end
		local sceneWindow = shown or window
		local plate = Ride.plate(
			sceneWindow.front,
			Worlds.of(sceneWindow.front).plateDepth,
			sceneWindow.plateDamage,
			offset,
			ride and ride.barrier,
			phase,
			ride ~= nil and ride.hitAt ~= nil
		)
		if layout or phase == "approach" or (ride and ride.barrier) then
			local flash = if ride and ride.hitAt
				then math.max(0, 1 - (now - ride.hitAt) / 0.2) * (if reduced then 0.55 else 1)
				else 0
			Wall.plate(r, sceneWindow, plate, translate, pick().strength, flash)
		end
		if layout or phase == "approach" then
			table.clear(parts)
			table.clear(moves)
			if shown then
				Wall.moves(r, shown, offset, parts, moves)
			end
			local farLayers = if survivor then 0 else visible
			Tunnel.moves(
				tunnel,
				sceneWindow,
				offset,
				farLayers,
				survivor,
				plate and plate.distance,
				parts,
				moves
			)
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
		hud.focus.Visible = canControl() and Camera.away(v)
		if hud.focus.Visible then
			local keyHint = if UserInputService.TouchEnabled or v.mode ~= "first"
				then ""
				else " · R"
			Kit.caption(hud.focus, translate("mine_face_wall") .. keyHint)
		end
		local equipped = pick()
		local cap = equipped.ultCharge
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
		local camera = workspace.CurrentCamera
		if camera then
			Wall.textures(r, camera, offset)
		end
		Wall.glint(r, window.front, now, active and phase == "idle" and not reduced)
		local aimed: any = nil
		if camera and canHit() then
			if UserInputService.TouchEnabled then
				local tap = lastTarget
				if tap and Wall.exposed(window, tap.x, tap.y, tap.depth - window.front) then
					aimed = {
						x = tap.x,
						y = tap.y,
						dRel = tap.depth - window.front,
						position = targetPosition(
							{ x = tap.x, y = tap.y, dRel = tap.depth - window.front },
							0
						),
					}
				end
			else
				local point = if v.mode == "first"
						and player:GetAttribute("MineUpgradesOpen") ~= true
					then camera.ViewportSize / 2
					else UserInputService:GetMouseLocation()
				aimed = Aim.at(r, window, point)
			end
		end
		local depth = if aimed then window.front + aimed.dRel else window.front
		local hardness = Worlds.durability(depth)
		local need = Power.hits(hardness, equipped.strength)
		local left = need
		if aimed and need >= 2 then
			for _, damage in window.damage do
				if damage.x == aimed.x and damage.y == aimed.y and damage.dRel == aimed.dRel then
					local hp = Power.blockHP(hardness, equipped.strength)
					left = math.clamp(
						math.ceil((1 - damage.amount / 255 - 0.5 / 255) * hp / equipped.strength),
						1,
						need
					)
					break
				end
			end
		end
		local plate = aimed and Wall.ore(window, aimed.x, aimed.y, aimed.dRel) == Wire.PLATE
		Hud.hits(hud, if need >= 2 and not plate then left else 0, aimed and aimed.position)
		stepUpgrades(now, active, window.front, need, equipped.strength, hardness, reduced)
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
			hint,
			reduced
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
