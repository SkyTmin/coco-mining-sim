--!strict
local RS = game:GetService("ReplicatedStorage")
local DSS = game:GetService("DataStoreService")
local Users = game:GetService("UserService")
local Players = game:GetService("Players")
local Http = game:GetService("HttpService")
local Profiles = require(script.Parent.ProfileService)
local Config = require(RS.Shared.Config)
local CampProfile = require(RS.Shared.Play.CampProfile)
local Mines = require(script.Parent.MineService)
local Builder = require(script.Parent.Parent.Camp.CampBuilder)
local Rules = require(RS.Shared.Play.CampRules)
local Board = {}
local cfg = Config.social
local suffix = if game:GetService("RunService"):IsStudio() then "_QA" else ""
local sent: { [Player]: any } = {}
local cache: Folder
local weekly = {}
local names = {}
local function store(period: string): OrderedDataStore
	local base = if period == "All" then "CMS_DepthAll_v1" else "CMS_DepthWeek_v1_" .. period
	return DSS:GetOrderedDataStore(base .. suffix)
end
function Board.weekly(): { any }
	return weekly
end
local pending = {}
local function depths(player: Player)
	if player.UserId <= 0 or not Profiles.IsReal(player) then
		return nil
	end
	return Profiles.Read(player, function(p)
		return { All = p.bestDepth, [p.weekBest.week] = p.weekBest.depth }
	end)
end
local function flush(player: Player, final: any?)
	local snapshot = final or depths(player)
	if not snapshot then
		return
	end
	local record = sent[player]
	if not record then
		record = { busy = false, values = {} }
		sent[player] = record
	end
	while record.busy do
		task.wait()
	end
	for week, depth in pending[player] or {} do
		snapshot[week] = math.max(snapshot[week] or 0, depth)
	end
	record.busy = true
	for period, depth in snapshot do
		if depth > (record.values[period] or 0) then
			local ok, err = pcall(function()
				store(period):UpdateAsync(tostring(player.UserId), function(old)
					return if old and old >= depth then nil else depth
				end)
			end)
			if ok then
				record.values[period] = depth
			else
				warn("[CampBoard] write: " .. tostring(err))
			end
		end
		if pending[player] and (pending[player][period] or 0) <= (record.values[period] or 0) then
			pending[player][period] = nil
		end
	end
	record.busy = false
end

local function read(period: string): { any }
	local rows, missing = {}, {}
	local pages = store(period):GetSortedAsync(false, cfg.boardSize, 1)
	for _, entry in pages:GetCurrentPage() do
		local id = tonumber(entry.key)
		if id and id > 0 then
			table.insert(rows, { userId = id, depth = entry.value, place = #rows + 1 })
			if not names[id] then
				table.insert(missing, id)
			end
		end
	end
	if #missing > 0 then
		local ok, users = pcall(Users.GetUserInfosByUserIdsAsync, Users, missing)
		if ok then
			for _, user in users do
				names[user.Id] = user.DisplayName
			end
		else
			warn("[CampBoard] names: " .. tostring(users))
		end
	end
	for _, row in rows do
		row.name = names[row.userId] or ("#" .. row.userId)
	end
	return rows
end
local function reload()
	local week = CampProfile.week(os.time())
	if cache:GetAttribute("WeekKey") ~= week then
		weekly = {}
		cache:SetAttribute("Week", "[]")
		cache:SetAttribute("WeekKey", week)
		Builder.scale.setRecord(nil, nil, nil)
	end
	for _, period in { "Week", "All" } do
		local ok, rows = pcall(read, if period == "Week" then week else period)
		if ok then
			cache:SetAttribute(period, Http:JSONEncode(rows))
			if period == "Week" then
				weekly = rows
				local highest = rows[1]
				local world, fraction = Rules.depth(if highest then highest.depth else 0)
				Builder.scale.setRecord(
					if highest then world else nil,
					fraction,
					highest and highest.depth
				)
			end
		else
			warn("[CampBoard] read: " .. tostring(rows))
		end
	end
end
function Board.Start()
	cache = Instance.new("Folder")
	cache.Name, cache.Parent = "Leaderboard", RS
	Mines.OnWeekEnded(function(player, week, depth)
		if player.UserId > 0 then
			local previous = pending[player] or {}
			pending[player] = previous
			previous[week] = math.max(previous[week] or 0, depth)
		end
	end)
	Profiles.BeforeRelease(function(player)
		local final = depths(player)
		return function()
			if final then
				flush(player, final)
			end
			sent[player], pending[player] = nil, nil
		end
	end)
	task.spawn(function()
		while true do
			reload()
			task.wait(cfg.boardSeconds)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(cfg.writeSeconds)
			for _, p in Players:GetPlayers() do
				if not sent[p] or not sent[p].busy then
					task.spawn(flush, p)
				end
			end
		end
	end)
end
return Board
