--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Rules = require(Shared.Play.CampRules)
local CampProfile = require(Shared.Play.CampProfile)
local Profiles = require(script.Parent.ProfileService)
local Plots = require(script.Parent.PlotService)
local Analytics = require(script.Parent.Analytics)
local Validate = require(Shared.Mine.Validate)
local Social = {}
local handlers = {}
local buckets, reactions = {}, {}
function Social.handle(op: string, fn: any)
	handlers[op] = fn
end
function Social.Start()
	local signals = Remotes.event("CampSignal")
	Remotes.event("CampAction").OnServerEvent:Connect(function(player, op, id, arg)
		if type(op) ~= "string" then
			return
		end
		local now = os.clock()
		local bucket = buckets[player] or Validate.bucket(now)
		buckets[player] = bucket
		if not Validate.take(bucket, now, 0.18) then
			return
		end
		if op == "react" then
			if
				type(id) ~= "string"
				or not table.find(Config.social.reactions, id)
				or now < (reactions[player] or 0)
			then
				return
			end
			reactions[player] = now + Config.social.reactionSeconds
			signals:FireAllClients("reaction", player.UserId, id)
			Analytics.event(player, "react", 1, id)
			return
		elseif op == "board" then
			Analytics.event(player, "board_open", 1, "")
			return
		end
		local target = nil
		if type(id) == "number" and id % 1 == 0 then
			for i = 1, Config.plots.count do
				local candidate = Plots.owner(i)
				if candidate and candidate.UserId == id then
					target = candidate
					break
				end
			end
		end
		if op == "card" then
			Analytics.event(player, "camp_card_open", 1, if target then "live" else "weekly")
		elseif op == "like" then
			if
				not target
				or target == player
				or not Profiles.IsReal(player)
				or not (Profiles.IsReal(target) or target.UserId < 0)
			then
				return
			end
			local given = false
			Profiles.Mutate(player, function(p)
				given = Rules.like(p, player.UserId, target.UserId, CampProfile.day(os.time()))
			end)
			if given then
				Profiles.Mutate(target, function(p)
					p.likes += 1
				end)
				if target.Parent == Players then
					Remotes.event("CampNotice"):FireClient(target, "like", player.UserId)
				end
				Analytics.event(player, "like_give", 1, "")
			end
		elseif handlers[op] then
			handlers[op](player, target, arg)
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		buckets[player], reactions[player] = nil, nil
	end)
end
return Social
