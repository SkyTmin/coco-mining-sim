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

local Client = script.Parent.Parent
local ProfileState = require(Client.ProfileState)
local Wall = require(script.Parent.WallRenderer)
local Tunnel = require(script.Parent.TunnelDecor)
local Aim = require(script.Parent.Aim)
local Camera = require(script.Parent.Camera)
local Input = require(script.Parent.Input)
local Hud = require(Client.Ui.MineHud)
local Intensity = require(Client.Fx.Intensity)
local Break = require(Client.Fx.BlockBreak)
local Lightning = require(Client.Fx.Lightning)

local Controller = {}
local mine = Config.mine
local S = mine.blockSize
local PENTATONIC = { 1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2 }
local STORM = Color3.fromRGB(139, 225, 255)
local WARM = Color3.fromRGB(255, 207, 144)
local RENDER_DEPTH = { 12, 16, 20 }
local rng = Random.new()

function Controller.start(guiParent: Instance, translate: (string, ...any) -> string)
	local player = Players.LocalPlayer
	local intent = Remotes.event("MineIntent")
	local windowRemote = Remotes.event("MineWindow")
	local resultRemote = Remotes.event("MineResult")
	local studio = RunService:IsStudio()
	local world = Instance.new("Folder")
	world.Name, world.Parent = "LocalMine", workspace
	local hud = Hud.new(guiParent, world, translate)
	local intensity = Intensity.new(hud.gui)
	local view: Camera.View? = nil
	local renderer: Wall.Renderer? = nil
	local tunnel: any = nil
	local breaking: any = nil
	local lightning: any = nil
	local window: any = nil
	local ride: any = nil
	local pending: any = nil
	local events: { any } = {}
	local seq, quality, maxParts = 0, 2, 0
	local dirty = true
	local active = false
	local nextHit, lastRequest, lastGain = -math.huge, -math.huge, -math.huge
	local lastCharge = -1
	local fpsAt, frames = os.clock(), 0
	local autoFrames, autoTime = 0, 0
	local measured = false
	local savedView = false
	local ultMeasure: any = nil
	local jumpButton: GuiObject? = nil

	local function profile(): any
		return ProfileState.getProfile()
	end
	local function pick(): Config.PickaxeConfig
		local p = profile()
		local id = player:GetAttribute("MinePickaxe") or (p and p.pickaxe) or "starter"
		return Config.pickaxes[id] or Config.pickaxes.starter
	end
	local function volume(): number
		local p = profile()
		return if p then p.settings.sfx else 1
	end
	local function need(depth: number): number
		return math.clamp(
			math.ceil(Worlds.durability(depth) / pick().strength),
			1,
			mine.maxHitsPerBlock
		)
	end
	local function shift(now: number): number
		if not ride then
			return 0
		end
		local t = math.clamp((now - ride.at) / ride.duration, 0, 1)
		return ride.offset * (1 - t) ^ 3
	end
	local function resync()
		pending = nil
		dirty = true
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
		view = Camera.new(player, frame)
		dirty = true
	end

	local function targetPosition(point: any, now: number): Vector3
		local r = renderer
		if not r then
			return Vector3.zero
		end
		return Wall.position(r, point.x, point.y, point.dRel, shift(now))
	end
	local function updateProfile()
		local p = profile()
		if p and view and not savedView then
			view.mode = p.settings.camera
			savedView = true
		end
	end
	local function canHit(): boolean
		return active
			and window ~= nil
			and player:GetAttribute("MineMenuOpen") ~= true
			and (not ride or os.clock() >= ride.at)
	end
	local function aim(screen: Vector2, nearby: boolean): any?
		local r = renderer
		if not r or not window or not canHit() then
			return nil
		end
		return Aim.at(r, window, screen, nearby)
	end
	local function toggle()
		if not view or not active then
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
		local position = cell.position or targetPosition(cell, now)
		local expected =
			{ seq = seq, at = now, position = position, front = window.front, ability = ability }
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
			local ore = Wall.ore(window, cell.x, cell.y, cell.dRel)
			local entry = Worlds.of(depth).ores[ore]
			local material = if entry and entry[1] == "dirt" then "gravel" else "stone"
			Sfx.play(material .. "_hit", 0.45 * volume())
			if expected.hidden then
				Sfx.play(material .. "_break", 0.64 * volume(), rng:NextNumber(0.95, 1.05))
			end
		else
			Sfx.play("wind", 0.45 * volume(), 0.78)
		end
		Camera.swing(v, if ability then 0.70 else settings.interval, ability)
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
		pending = nil
		if not res.accepted then
			dirty = true
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
		local oldShift = shift(now)
		local target = if expected
			then expected.position
			else targetPosition({ x = 0, y = 1, dRel = 0 }, now)
		local finalEvent = 0
		for i, event in res.events do
			local a, b = event.points[1], event.points[2]
			if a and b then
				table.insert(events, {
					at = now + event.delayMs / 1000,
					a = targetPosition(a, now) - r.frame.LookVector * S / 2,
					b = targetPosition(b, now) - r.frame.LookVector * S / 2,
					i = i,
					last = i == #res.events,
				})
				finalEvent = math.max(finalEvent, event.delayMs / 1000)
			end
		end
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
			local lead = if res.ability
				then math.max(0.6, finalEvent + 0.12)
				else math.max(0.04, finalEvent + 0.04)
			local duration = 0.45 + 0.35 * math.log10(res.delta)
			ride = {
				at = now + lead,
				offset = math.min(res.delta, mine.window) * S + oldShift,
				duration = duration,
				delta = res.delta,
				ability = res.ability,
				blocks = res.blocks,
				coins = res.coins,
				started = false,
			}
			local tier = if res.ability or res.delta >= 100
				then 3
				elseif res.delta >= 10 then 2
				else 1
			Intensity.push(
				intensity,
				tier,
				duration + lead,
				if res.ability then 0.6 else lead,
				if pick().family == "storm" then STORM else WARM
			)
			dirty = false
			if res.ability then
				ultMeasure = { at = now, untilAt = now + lead + duration, frames = 0 }
			end
		else
			dirty = true
			if res.ability then
				Intensity.push(intensity, 3, 1.4, 0.6, WARM)
				task.delay(0.6, function()
					Hud.show(hud, 0, res.blocks, res.coins, true)
				end)
				ultMeasure = { at = now, untilAt = now + 1.4, frames = 0 }
			end
		end
		window.charge, window.damage, window.plateDamage = res.charge, res.damage, res.plateDamage
		if res.coins > 0 then
			Hud.coin(hud, target, res.coins)
			if now - lastGain >= 0.3 then
				Sfx.play("note", 0.48 * volume())
				lastGain = now
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

	hud.eye.Activated:Connect(toggle)
	hud.ult.Activated:Connect(function()
		request("Ability", nil)
	end)
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
			if view and active and player:GetAttribute("MineMenuOpen") ~= true then
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
		updateProfile()
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		local p = if root and root:IsA("BasePart")
			then r.frame:PointToObjectSpace(root.Position)
			else Vector3.new(0, 0, math.huge)
		active = math.abs(p.X) <= Config.plots.frameWidth * S / 2
			and p.Z >= 0
			and p.Z <= Config.plots.platformDepth * S
			and p.Y >= -1
			and p.Y <= mine.height * S + 6
		local settings = profile() and profile().settings
		local reduced = settings and settings.reducedMotion == true
		if active and not measured then
			autoFrames += 1
			autoTime += dt
			if autoTime >= 15 then
				measured = true
				if autoFrames / autoTime < 40 then
					quality = 1
					dirty = true
				end
			end
		end
		local override = if settings and settings.effects == "low"
			then 1
			elseif settings and settings.effects == "high" then 3
			else quality
		Tunnel.atmosphere(tunnel, active, window.front, override)
		local offset = shift(now)
		if pending and now - pending.at > 0.85 then
			resync()
		end
		local moving = ride and now >= ride.at
		if moving and not ride.started then
			ride.started, dirty = true, true
			Hud.show(hud, ride.delta, ride.blocks, ride.coins, ride.ability)
			Sfx.play(if ride.delta >= 10 then "wind" else "stone_hit", 0.55 * volume(), 0.73)
		end
		local hyper = moving and offset > 0 and ride.delta > 20 and not reduced
		local speed = if moving
				and offset > 0
				and ride.delta >= 10
			then (if ride.delta >= 100 then 24 else 10)
			else 0
		if dirty then
			local shown = window
			if pending and pending.damage then
				shown = table.clone(window)
				shown.damage = table.clone(window.damage)
				table.insert(shown.damage, pending.damage)
			end
			Wall.update(
				r,
				shown,
				RENDER_DEPTH[override],
				pending and pending.hidden,
				translate,
				pick().strength
			)
			Break.cracks(breaking, r, shown, need, State.cellKey)
		end
		if dirty or moving then
			local parts: { BasePart } = {}
			local framesTo: { CFrame } = {}
			Wall.moves(r, window, offset, parts, framesTo)
			Tunnel.moves(tunnel, window.front * S - offset, hyper, parts, framesTo)
			workspace:BulkMoveTo(parts, framesTo, Enum.BulkMoveMode.FireCFrameChanged)
			dirty = false
		end
		if moving and offset <= 0 then
			if ride.delta >= 10 then
				Sfx.play("thunder", 0.36 * volume())
				Break.hit(
					breaking,
					r.frame:PointToWorldSpace(Vector3.new(0, 0.4, 0)),
					WARM,
					0.6,
					true,
					override
				)
			end
			ride = nil
		end
		while events[1] and now >= events[1].at do
			local event = table.remove(events, 1)
			Lightning.bolt(lightning, event.a, event.b, now, override, event.i == 1)
			Intensity.flash(intensity, 0.08, STORM, now)
			Sfx.play("note", 0.56 * volume(), PENTATONIC[(event.i - 1) % #PENTATONIC + 1])
			if event.last then
				task.delay(0.12, function()
					Sfx.play("thunder", 0.48 * volume())
				end)
			end
		end
		Lightning.step(lightning, now)
		Break.step(breaking, now)
		local fov, shake, pull = Intensity.sample(intensity, now, reduced, active)
		Camera.step(v, active, fov, shake, pull)
		local current = profile()
		local cap = pick().ultCharge
		if lastCharge >= 0 and lastCharge < cap and window.charge >= cap then
			Sfx.play("note", 0.65 * volume(), 1.65)
		end
		lastCharge = window.charge
		Hud.set(hud, window.front, if current then current.coins else 0, window.charge, cap)
		local hint = nil
		if r.pulse.Enabled then
			r.pulse.FillTransparency = 0.60 + math.sin(now * 6) * 0.19
			local child = r.limits:FindFirstChildWhichIsA("BasePart")
			if child then
				hint = child.Position
			end
		end
		Hud.step(
			hud,
			now,
			active,
			v.mode == "first" and not UserInputService.TouchEnabled,
			speed,
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
		if ultMeasure then
			ultMeasure.frames += 1
			if now >= ultMeasure.untilAt then
				if studio then
					player:SetAttribute("Stage02UltFPS", ultMeasure.frames / (now - ultMeasure.at))
				end
				ultMeasure = nil
			end
		end
	end)
end

return Controller
