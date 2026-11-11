--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Family = require(Shared.Play.Family)
local Collection = require(Shared.Play.Collection)
local Chest = require(Shared.Play.Chest)
local Keys = require(Shared.Play.Keys)
local Perks = require(Shared.Play.Perks)
local WallChests = require(Shared.Play.WallChests)
local ProfileService = require(script.Parent.ProfileService)
local MineService = require(script.Parent.MineService)
local PickaxeService = require(script.Parent.PickaxeService)
local Analytics = require(script.Parent.Analytics)
local ServerLog = require(script.Parent.ServerLog)
local CollectionService = {}
local lastAt: { [Player]: number } = {}
local openAt: { [Player]: number } = {}

local function changed(player: Player, familyChanged: boolean?)
	PickaxeService.refresh(player)
	local session = MineService.get(player)
	if session and familyChanged then
		session.perks = Perks.new()
		session.perkFamily = ProfileService.Read(player, function(p)
			return p.family
		end)
		if workspace:GetServerTimeNow() >= (player:GetAttribute("MineReturnAfter") or 0) then
			MineService.window(session)
		end
	end
end

local function result(player: Player, value: any, source: string)
	if not value then
		return
	end
	Remotes.event("PickaxeResult"):FireClient(player, value)
	Analytics.event(player, "pick_get", 1, source, value.id)
end

function CollectionService.Start()
	Remotes.event("PickaxeResult")
	Remotes.event("PickaxeIntent").OnServerEvent
		:Connect(function(player: Player, op: any, a: any, b: any)
			local now = os.clock()
			if now - (lastAt[player] or -math.huge) < 0.1 - 1e-9 then
				return
			end
			lastAt[player] = now
			local session = MineService.get(player)
			if not session then
				return
			end
			local value, success = nil, false
			if op == "Equip" and type(a) == "string" and type(b) == "boolean" then
				PickaxeService.equip(player, a, b)
				return
			elseif op == "OpenChest" then
				if
					now - (openAt[player] or -math.huge)
					< Config.familyRules.openInterval - 1e-9
				then
					return
				end
				openAt[player] = now
				ProfileService.Mutate(player, function(p)
					value = Chest.open(p, session.state.seed)
				end)
				if value then
					result(player, value, "chest")
					Analytics.event(player, "chest_open", 1, value.rarity, value.family)
				end
			elseif op == "BuyPick" and type(a) == "string" and Config.families[a] then
				ProfileService.Mutate(player, function(p)
					value = Collection.buy(p, a)
				end)
				result(player, value, "shop")
			elseif op == "Merge" and type(a) == "string" and Config.pickaxes[a] then
				ProfileService.Mutate(player, function(p)
					success = Collection.merge(p, a)
				end)
				if success then
					Analytics.event(player, "merge", 1, a)
					Analytics.event(player, "pick_get", 1, "merge", a)
				end
			elseif op == "ChangeFamily" and type(a) == "string" and Config.families[a] then
				ProfileService.Mutate(player, function(p)
					success =
						Family.change(p, a, math.floor(os.time() / Config.familyRules.daySeconds))
				end)
				if success then
					Analytics.event(player, "family_change", 1, a)
				end
				changed(player, success)
				return
			end
			changed(player)
		end)
	Players.PlayerRemoving:Connect(function(player)
		lastAt[player], openAt[player] = nil, nil
	end)
end

function CollectionService.Creative(player: Player, op: string, a: any, b: any, c: any): boolean
	if player:GetAttribute("CreativeAllowed") ~= true then
		return false
	end
	local session = MineService.get(player)
	if not session then
		return false
	end
	if
		op == "mine.grant"
		and type(a) == "string"
		and Config.pickaxes[a]
		and type(b) == "boolean"
	then
		ProfileService.Mutate(player, function(p)
			Collection.grant(p, a, b)
		end)
	elseif op == "mine.keys" then
		local awarded = 0
		ProfileService.Mutate(player, function(p)
			awarded = Keys.add(p, 10, session.state.seed)
		end)
		Remotes.event("Toast"):FireClient(player, "key_received", { awarded })
	elseif op == "mine.family" and type(a) == "string" and Config.families[a] then
		ProfileService.Mutate(player, function(p)
			if not Family.best(p, a) then
				Collection.grant(p, a .. "_common")
			end
			Family.change(p, a, 0, true)
		end)
		changed(player, true)
	elseif
		op == "mine.skill"
		and type(a) == "string"
		and Config.families[a]
		and type(b) == "number"
		and b % 1 == 0
		and b >= 1
		and b <= 4
		and type(c) == "number"
		and c % 1 == 0
		and c >= 0
		and c <= 10
	then
		ProfileService.Mutate(player, function(p)
			p.skills[a][b] = c
		end)
	elseif op == "mine.collectionReset" then
		ProfileService.Mutate(player, function(p)
			p.pickaxe = "starter"
			p.circle.pickLevels = {}
			p.collection, p.family, p.pickaxeGolden =
				{ starter = { count = 1, golden = 0 } }, nil, false
			p.nextFamily, p.boughtPickaxes, p.staged = {}, {}, {}
		end)
		session.state.chests, session.perks = {}, Perks.new()
		changed(player, true)
	elseif op == "mine.chests100" then
		local counts = { common = 0, rare = 0, epic = 0, legendary = 0 }
		ProfileService.Mutate(player, function(p)
			p.keys += 100
			for _ = 1, 100 do
				local reward = assert(Chest.open(p, session.state.seed))
				counts[reward.rarity] += 1
			end
		end)
		ServerLog.analytics(
			string.format(
				"[Creative] 100 chests: common=%d%% rare=%d%% epic=%d%% legendary=%d%% (includes pity)",
				counts.common,
				counts.rare,
				counts.epic,
				counts.legendary
			),
			false
		)
	elseif op == "mine.staged" and (a == "firstStorm" or a == "firstKey") then
		ProfileService.Mutate(player, function(p)
			p.staged[a] = nil
		end)
		WallChests.place(session.state, a)
		MineService.window(session)
	else
		return false
	end
	changed(player)
	return true
end

return CollectionService
