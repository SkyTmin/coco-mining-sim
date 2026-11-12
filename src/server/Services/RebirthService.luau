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
	local prepared
	local ok, failure = pcall(function()
		Profile.Read(player, function(p)
			reason = Rebirth.validate(p, choice)
			if reason then
				return
			end
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
	Analytics.event(player, "rebirth", choice.gain, tostring(choice.start), choice.family)
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
		response:FireClient(player, false, "busy")
		return
	end
	last[player] = now
	local s = Mine.get(player)
	if not s or not Profile.IsReal(player) then
		response:FireClient(player, false, "unavailable")
		return
	end
	if
		op == "Confirm"
		and (
			now < (s.ultUntil or 0)
			or workspace:GetServerTimeNow() < (player:GetAttribute("MineReturnAfter") or 0)
		)
	then
		response:FireClient(player, false, "busy")
		return
	end
	busy[player] = true
	if op == "ClaimMaster" then
		local allowed = Profile.Read(player, function(p)
			return p.rewards.masterEpic == "pending"
		end)
		if not allowed then
			busy[player] = nil
			response:FireClient(player, false, "unavailable")
			return
		end
		local pick
		Profile.Mutate(player, function(p)
			pick = Collection.grant(p, serial .. "_epic")
			p.rewards.masterEpic = "claimed"
		end)
		busy[player] = nil
		Pickaxe.refresh(player)
		response:FireClient(player, true, "claimed", pick)
		Analytics.event(player, "pick_get", 1, "master", pick.id)
		return
	end
	local ok, reason, data =
		confirm(player, s, { serial = serial, gain = gain, family = family, start = start })
	busy[player] = nil
	response:FireClient(player, ok, reason, data)
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
