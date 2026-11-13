--!strict
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Rebirth = require(Shared.Play.Rebirth)
local Ranks = require(Shared.Play.Ranks)
local Pace = require(Shared.Play.Pace)
local Collection = require(Shared.Play.Collection)
local Worlds = require(Shared.Mine.Worlds)
local Profile = require(script.Parent.ProfileService)
local Mine = require(script.Parent.MineService)
local Events = require(script.Parent.EventService)
local Pickaxe = require(script.Parent.PickaxeService)
local Analytics = require(script.Parent.Analytics)
local Service = {}
local busy, last, hints = {}, {}, {}
local response = Remotes.event("RebirthResult")
local function reply(player: Player, ok: boolean, reason: string?, data: any?)
	response:FireClient(player, ok, reason, data)
	if not ok and RunService:IsStudio() then
		warn("[Rebirth] rejected: " .. tostring(reason))
	end
end
local function integer(n: any): boolean
	return type(n) == "number" and n % 1 == 0 and n >= 0 and n <= Config.game.maxExactInteger
end
function Service.hint(player: Player)
	local s = Mine.get(player)
	if not s then
		return
	end
	local world = Worlds.of(s.state.front)
	local eta = Pace.eta(
		s.pace,
		s.state.front,
		world.plateDepth,
		world.index == #Config.worlds and s.state.front >= world.plateDepth
	)
	local q = Profile.Read(player, function(p)
		return Rebirth.quote(p, eta)
	end)
	local hint = if not q
			or not Profile.IsReal(player)
			or not q.available
		then 0
		elseif q.profitable then 2
		else 1
	if player:GetAttribute("RebirthHint") ~= hint then
		player:SetAttribute("RebirthHint", hint)
	end
end
local function confirm(player: Player, s: any, choice: any): (boolean, string?, any?)
	local plan, reason, before, oldRank
	local fromWorld = Worlds.of(s.state.front).index
	local oldPlate, circleSeconds, profitable
	local prepared
	local ok, failure = pcall(function()
		Profile.Read(player, function(p)
			reason = Rebirth.validate(p, choice)
			if reason then
				return
			end
			oldPlate = p.circleDeepestPlate
			circleSeconds = Profile.PlaySeconds(player) - p.circleStartedAt
			local world = Worlds.of(s.state.front)
			profitable = Rebirth.quote(
				p,
				Pace.eta(
					s.pace,
					s.state.front,
					world.plateDepth,
					world.index == #Config.worlds and s.state.front >= world.plateDepth
				)
			).profitable
			before = p.cups
			oldRank = Ranks.of(before)
			local seed = s.rng:NextInteger(1, Config.rebirth.seedMax)
			if seed == s.state.seed then
				seed = seed % Config.rebirth.seedMax + 1
			end
			choice.playSeconds = Profile.PlaySeconds(player)
			plan, reason = Rebirth.plan(p, choice, seed, Worlds.at(choice.start).start)
			if plan then
				prepared = Mine.prepareAdopt(plan.state, workspace:GetServerTimeNow())
			end
		end)
	end)
	if not ok then
		warn("[Rebirth] Plan failed: " .. tostring(failure))
		return false, "unavailable"
	end
	if not plan then
		return false, reason or "unavailable", Profile.Read(player, Rebirth.quote)
	end
	-- Neither call allocates, yields, encodes or validates. Save sees one complete version.
	Profile.Mutate(player, function(p)
		Rebirth.commit(p, plan)
		Mine.adopt(s, prepared)
	end)
	Events.onRebirth(player)
	player:SetAttribute("MineReturnAfter", 0)
	Profile.Replicate(player, true)
	Mine.window(s)
	Pickaxe.refresh(player)
	Service.hint(player)
	local rank = Ranks.of(plan.values.cups)
	local data = {
		fromWorld = fromWorld,
		serial = plan.values.rebirths,
		gain = choice.gain,
		cups = plan.values.cups,
		start = choice.start,
		family = choice.family,
		master = plan.values.rewards.masterEpic == "pending",
		rank = if rank then rank.id else "",
		newRank = rank ~= nil and (not oldRank or rank.id ~= oldRank.id),
	}
	Analytics.event(
		player,
		"rebirth",
		data.serial,
		string.format("gain=%d;plate=%d;seconds=%d", choice.gain, oldPlate, circleSeconds),
		string.format(
			"family=%s;start=%d;profitable=%s",
			choice.family,
			choice.start,
			tostring(profitable)
		)
	)
	if choice.start > 1 then
		Analytics.event(player, "lift_use", choice.start, choice.family)
	end
	if data.serial == 1 then
		Analytics.firstRebirth(player)
	end
	if data.newRank then
		Remotes.event("Toast"):FireClient(player, "rank_up_" .. data.rank)
		Analytics.event(player, "rank_up", data.cups, data.rank)
	end
	task.spawn(function()
		if not Profile.SaveNow(player) then
			warn("[Rebirth] Save failed; in-memory transaction remains dirty")
		end
	end)
	return true, nil, data
end
function Service.handle(player: Player, op: any, serial: any, gain: any, family: any, start: any)
	if op == "Confirm" then
		if
			not integer(serial)
			or not integer(gain)
			or not integer(start)
			or type(family) ~= "string"
		then
			return
		end
	elseif op == "ClaimMaster" then
		if type(serial) ~= "string" or not table.find(Config.familyRules.order, serial) then
			return
		end
	else
		return
	end
	local now = os.clock()
	if busy[player] or now - (last[player] or -math.huge) < Config.rebirth.requestSeconds then
		reply(player, false, "busy")
		return
	end
	last[player] = now
	local s = Mine.get(player)
	if not s or not Profile.IsReal(player) then
		reply(player, false, "unavailable")
		return
	end
	if
		op == "Confirm"
		and (
			now < (s.ultUntil or 0)
			or workspace:GetServerTimeNow() < (player:GetAttribute("MineReturnAfter") or 0)
		)
	then
		reply(player, false, "busy")
		return
	end
	busy[player] = true
	if op == "ClaimMaster" then
		local allowed = Profile.Read(player, function(p)
			return p.rewards.masterEpic == "pending"
		end)
		if not allowed then
			busy[player] = nil
			reply(player, false, "unavailable")
			return
		end
		local pick
		Profile.Mutate(player, function(p)
			pick = Collection.grant(p, serial .. "_epic")
			p.rewards.masterEpic = "claimed"
		end)
		busy[player] = nil
		Pickaxe.refresh(player)
		reply(player, true, "claimed", pick)
		Analytics.event(player, "pick_get", 1, "master", pick.id)
		Analytics.event(player, "master_epic", 1, serial)
		return
	end
	local ok, reason, data =
		confirm(player, s, { serial = serial, gain = gain, family = family, start = start })
	busy[player] = nil
	reply(player, ok, reason, data)
end
function Service.Creative(player: Player, op: string, value: any): boolean
	if player:GetAttribute("CreativeAllowed") ~= true then
		return false
	end
	local s = Mine.get(player)
	if not s then
		return false
	end
	if op == "rebirth.cups" and integer(value) then
		Profile.Mutate(player, function(p)
			p.cups = value
		end)
	elseif
		op == "rebirth.plate"
		and RunService:IsStudio()
		and integer(value)
		and value <= #Config.worlds
	then
		Profile.Mutate(player, function(p)
			p.circleDeepestPlate = value
		end)
	elseif op == "rebirth.masterReset" and RunService:IsStudio() then
		Profile.Mutate(player, function(p)
			p.rewards.masterEpic = "none"
		end)
	elseif op == "streak.tier" and integer(value) and value <= #Config.events.streak.tiers then
		local now = workspace:GetServerTimeNow()
		s.streak.gauge = Config.events.streak.tiers[value] or 0
		s.streak.at, s.streak.lastHit = now, now
		s.streak.maximum = math.max(s.streak.maximum, value)
		player:SetAttribute("QaStreakGauge", s.streak.gauge)
		player:SetAttribute("QaStreakAt", now)
	else
		return false
	end
	Service.hint(player)
	return true
end

function Service.Start()
	Remotes.event("WorldTime")
	Remotes.event("RebirthIntent").OnServerEvent:Connect(Service.handle)
	Profile.OnLoaded(Service.hint)
	RunService.Heartbeat:Connect(function()
		local now = os.clock()
		for _, player in Players:GetPlayers() do
			if now >= (hints[player] or 0) then
				hints[player] = now + Config.rebirth.hintSeconds
				Service.hint(player)
			end
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		busy[player], last[player], hints[player] = nil, nil, nil
	end)
end
return Service
