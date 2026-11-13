--!strict

local GroupService = game:GetService("GroupService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage.Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local ProfileService = require(script.Parent.ProfileService)
local HitService = require(script.Parent.HitService)
local RebirthService = require(script.Parent.RebirthService)
local EventService = require(script.Parent.EventService)
local CollectionService = require(script.Parent.CollectionService)

local studio = RunService:IsStudio()
local creatorId: number? = if game.CreatorType == Enum.CreatorType.User then game.CreatorId else nil
local REQUESTS_PER_SECOND = 5

local CreativeService = {}
local buckets: { [Player]: { tokens: number, at: number } } = {}

local function setAccess(player: Player)
	local allowed = studio
		or player.UserId == creatorId
		or table.find(Config.creative.admins, player.UserId) ~= nil
	player:SetAttribute("CreativeAllowed", allowed)
	if not allowed or player:GetAttribute("Creative") == nil then
		player:SetAttribute("Creative", false)
	end
end

local function withinRate(player: Player): boolean
	local now = os.clock()
	local bucket = buckets[player]
	if not bucket then
		bucket = { tokens = REQUESTS_PER_SECOND, at = now }
		buckets[player] = bucket
	end
	bucket.tokens =
		math.min(REQUESTS_PER_SECOND, bucket.tokens + (now - bucket.at) * REQUESTS_PER_SECOND)
	bucket.at = now
	if bucket.tokens < 1 then
		return false
	end
	bucket.tokens -= 1
	return true
end

function CreativeService.Start()
	local creative = Remotes.event("Creative")
	local toast = Remotes.event("Toast")
	creative.OnServerEvent:Connect(function(player: Player, op: any, delta: any, b: any, c: any)
		if player:GetAttribute("CreativeAllowed") ~= true or not withinRate(player) then
			return
		end
		if op == "toggle" then
			local enabled = player:GetAttribute("Creative") ~= true
			player:SetAttribute("Creative", enabled)
			toast:FireClient(player, if enabled then "creative_on" else "creative_off")
		elseif op == "coins" and (delta == 10 or delta == 1000) then
			ProfileService.Mutate(player, function(profile)
				local balance = math.max(1, profile.coins) * delta
				if balance < math.huge then
					profile.coins = balance
				end
			end)
		elseif type(op) == "string" and op:sub(1, 7) == "events." then
			EventService.Creative(player, op:sub(8))
		elseif type(op) == "string" and (op:sub(1, 8) == "rebirth." or op == "streak.tier") then
			RebirthService.Creative(player, op, delta)
		elseif type(op) == "string" and op:sub(1, 5) == "mine." then
			if not CollectionService.Creative(player, op, delta, b, c) then
				HitService.Creative(player, op, delta, b, c)
			end
		end
	end)

	Players.PlayerAdded:Connect(setAccess)
	Players.PlayerRemoving:Connect(function(player)
		buckets[player] = nil
	end)
	for _, player in Players:GetPlayers() do
		setAccess(player)
	end

	if not studio and game.CreatorType == Enum.CreatorType.Group then
		task.spawn(function()
			for attempt = 1, 3 do
				local ok, info = pcall(GroupService.GetGroupInfoAsync, GroupService, game.CreatorId)
				if ok then
					creatorId = if info.Owner then info.Owner.Id else nil
					for _, player in Players:GetPlayers() do
						setAccess(player)
					end
					return
				end
				if attempt < 3 then
					task.wait(2)
				else
					warn("[CreativeService] could not resolve the group owner: " .. tostring(info))
				end
			end
		end)
	end
end

return CreativeService
