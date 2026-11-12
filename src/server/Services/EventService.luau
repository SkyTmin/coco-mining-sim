--!strict
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Events = require(Shared.Play.MineEvents)
local Income = require(Shared.Play.Income)
local Family = require(Shared.Play.Family)
local Streak = require(Shared.Play.Streak)
local Mine = require(script.Parent.MineService)
local Profile = require(script.Parent.ProfileService)
local Analytics = require(script.Parent.Analytics)
local Service = {}
function Service.ensure(s: any, now: number): any
	if not s.events then
		s.events = Events.new(now, function()
			return s.rng:NextNumber()
		end)
		s.eventQueue = {}
	end
	return s.events
end
local function append(s: any, events: { any })
	for _, event in events do
		table.insert(s.eventQueue, event)
	end
end
local function attributes(player: Player, e: any)
	player:SetAttribute("FeverUntil", e.feverUntil)
	player:SetAttribute("FeverSource", e.feverSource or "")
end
function Service.income(s: any, profile: any, now: number, ability: boolean): any
	local e = Service.ensure(s, now)
	local fever = if e.giftAt and not ability
		then now + Config.events.fever.giftSeconds
		else e.feverUntil
	return Income.context(
		profile,
		Family.effects(profile),
		{ Streak.multiplier(s.streak) },
		now,
		fever
	)
end
function Service.after(player: Player, s: any, outcome: any, request: any)
	local e = Service.ensure(s, request.now)
	append(s, Events.after(e, s.state, request, outcome.coins))
	attributes(player, e)
end
function Service.flush(player: Player, s: any)
	local queue = s.eventQueue or {}
	if #queue == 0 then
		return
	end
	-- Color-only windows do not interrupt a pending swing or wall ride on the client.
	Mine.window(s, "events")
	for _, event in queue do
		event.plot, event.front = s.plot, s.state.front
		Mine.event(s, event)
		if event.type == 1 then
			Profile.Mutate(player, function(p)
				p.staged.firstVein = true
			end)
			Analytics.event(player, "vein_spawn", 1, "")
		elseif event.type == 2 then
			Analytics.event(
				player,
				if event.reason == 1 then "vein_hit" else "vein_miss",
				1,
				event.source or "hand"
			)
		elseif event.type == 3 then
			Analytics.event(player, "fever_start", 1, if event.reason == 1 then "gift" else "vein")
		end
	end
	table.clear(queue)
end
function Service.reset(player: Player, s: any, gift: boolean?)
	local now = workspace:GetServerTimeNow()
	s.events = Events.new(now, function()
		return s.rng:NextNumber()
	end)
	s.eventQueue = {}
	if gift then
		s.events.giftAt = now + Config.rebirth.giftStartSeconds
	end
	attributes(player, s.events)
end
function Service.onRebirth(player: Player)
	local s = Mine.get(player)
	if s then
		Service.reset(player, s, true)
	end
end
function Service.Creative(player: Player, kind: string): boolean
	if player:GetAttribute("CreativeAllowed") ~= true then
		return false
	end
	local s = Mine.get(player)
	if not s then
		return false
	end
	local now = workspace:GetServerTimeNow()
	local e = Service.ensure(s, now)
	local events = Events.start(e, s.state, kind, now, function()
		return s.rng:NextNumber()
	end)
	if not events then
		return false
	end
	append(s, events)
	attributes(player, e)
	Service.flush(player, s)
	return true
end
function Service.Start()
	Mine.OnReset(function(player, s)
		Service.reset(player, s)
	end)
	RunService.Heartbeat:Connect(function()
		local now = workspace:GetServerTimeNow()
		for _, player in Players:GetPlayers() do
			local s = Mine.get(player)
			if not s then
				continue
			end
			local e = Service.ensure(s, now)
			local seen = Profile.Read(player, function(p)
				return p.staged.firstVein == true
			end)
			local blocked = now < (player:GetAttribute("MineReturnAfter") or 0)
				or os.clock() < (s.ultUntil or 0)
			append(
				s,
				Events.tick(
					e,
					s.state,
					now,
					Profile.PlaySeconds(player),
					seen == true,
					blocked,
					function()
						return s.rng:NextNumber()
					end
				)
			)
			attributes(player, e)
			Service.flush(player, s)
		end
	end)
end
return Service
