--!strict
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local DSS = game:GetService("DataStoreService")
local Tween = game:GetService("TweenService")
local Config = require(RS.Shared.Config)
local CampProfile = require(RS.Shared.Play.CampProfile)
local Persistence = require(RS.Shared.Persistence)
local Art = require(script.Parent.Parent.Camp.CampArt)
local Camp = require(script.Parent.CampService)
local Board = require(script.Parent.LeaderboardService)
local Plots = require(script.Parent.PlotService)
local Profiles = require(script.Parent.ProfileService)
local Pickaxe = require(script.Parent.PickaxeService)
local cfg = Config.social
local Holo = {}
local storeName = "CMS_PublicCards_v1"
	.. (if game:GetService("RunService"):IsStudio() then "_QA" else "")
local function store(): DataStore
	return DSS:GetDataStore(storeName)
end
local written, writing, cache, rigs = {}, {}, {}, {}
local function publicCard(player: Player)
	if player.UserId <= 0 or not Profiles.IsReal(player) then
		return
	end
	return Profiles.Read(player, function(p)
		return CampProfile.card(p, player.DisplayName)
	end)
end
local function save(player: Player, final: any?)
	local card = final or publicCard(player)
	if not card then
		return
	end
	while writing[player] do
		task.wait()
	end
	if Persistence.equal(written[player], card) then
		return
	end
	writing[player] = true
	local snapshot = table.clone(card)
	snapshot.at = os.time()
	local ok, err = pcall(function()
		store():UpdateAsync("U_" .. player.UserId, function(old)
			if old and old.at and old.at > snapshot.at then
				return nil
			end
			return snapshot
		end)
	end)
	if ok then
		written[player] = card
	else
		warn("[CampCards] write: " .. tostring(err))
	end
	writing[player] = nil
end
local function load(id: number): any?
	local entry = cache[id]
	if entry and os.clock() < entry.untilAt then
		return entry
	end
	entry = entry or {}
	local ok, problem = pcall(function()
		local card = store():GetAsync("U_" .. id)
		if
			not card
			or type(card.name) ~= "string"
			or not Config.pickaxes[card.pick]
			or type(card.bestDepth) ~= "number"
			or type(card.showcase) ~= "table"
		then
			entry.card = nil
			return
		end
		entry.description = entry.description or Players:GetHumanoidDescriptionFromUserIdAsync(id)
		entry.card = card
	end)
	entry.untilAt = os.clock() + (if ok and entry.card then cfg.cardSeconds else cfg.writeSeconds)
	cache[id] = entry
	if not ok then
		warn("[CampCards] read: " .. tostring(problem))
	end
	return entry
end
local function clear(i: number, flash: boolean)
	local r = rigs[i]
	if r then
		if flash then
			Art.arrival(r.rig:GetPivot().Position)
		end
		r.rig:Destroy()
		rigs[i] = nil
	end
	Camp.hologram(i, nil)
end
local function display(i: number, row: any, entry: any)
	local old = rigs[i]
	if old and old.id == row.userId and old.at == entry.card.at then
		Camp.hologram(i, { userId = row.userId, place = row.place, card = entry.card })
		return
	end
	local ok, rig = pcall(
		Players.CreateHumanoidModelFromDescriptionAsync,
		Players,
		entry.description,
		Enum.HumanoidRigType.R15
	)
	if not ok then
		warn("[CampHologram] rig: " .. tostring(rig))
		return
	end
	if Plots.owner(i) or Players:GetPlayerByUserId(row.userId) then
		rig:Destroy()
		return
	end
	clear(i, false)
	rig.Name = "WeeklyHologram"
	rig:SetAttribute("CampUser", row.userId)
	local root = rig:FindFirstChild("HumanoidRootPart")
	local hum = rig:FindFirstChildOfClass("Humanoid")
	if not root or not hum then
		rig:Destroy()
		return
	end
	root.Anchored = true
	hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	Art.hologram(rig)
	local frame = Plots.frame(i)
	local z = (Config.plots.platformDepth + Config.plots.spectatorDepth) * Config.mine.blockSize
	rig:PivotTo(
		frame * CFrame.new(0, hum.HipHeight + root.Size.Y / 2, z - 3) * CFrame.Angles(0, math.pi, 0)
	)
	rig.Parent = workspace.Plots["Plot_" .. i]
	Pickaxe.attachDisplay(rig, entry.card.showcase[1] or entry.card.pick, entry.card.golden)
	Camp.hologram(i, { userId = row.userId, place = row.place, card = entry.card })
	rigs[i] = { rig = rig, id = row.userId, at = entry.card.at }
	local shoulder = rig:FindFirstChild("RightShoulder", true)
	if shoulder and shoulder:IsA("Motor6D") then
		local base = shoulder.C0
		task.spawn(function()
			while rig.Parent do
				task.wait(math.random(cfg.holoMin, cfg.holoMax))
				if rig.Parent then
					Tween:Create(
						shoulder,
						TweenInfo.new(
							0.5,
							Enum.EasingStyle.Sine,
							Enum.EasingDirection.InOut,
							0,
							true
						),
						{ C0 = base * CFrame.Angles(-1.18, 0, 0.17) }
					):Play()
				end
			end
		end)
	end
end
local function refresh()
	local rows = Board.weekly()
	local k = 0
	for i = 1, Config.plots.count do
		if Plots.owner(i) then
			clear(i, true)
			continue
		end
		local found = false
		while k < #rows do
			k += 1
			local row = rows[k]
			if Players:GetPlayerByUserId(row.userId) then
				continue
			end
			local entry = load(row.userId)
			if entry and entry.card and entry.description then
				if not Plots.owner(i) then
					display(i, row, entry)
				end
				found = true
				break
			end
		end
		if not found then
			clear(i, false)
		end
	end
	local live = {}
	for _, row in rows do
		live[row.userId] = true
	end
	for id in cache do
		if not live[id] then
			cache[id] = nil
		end
	end
end
function Holo.Start()
	Plots.onAssigned(function(i)
		clear(i, true)
	end)
	Profiles.BeforeRelease(function(p)
		local final = publicCard(p)
		return function()
			if final then
				save(p, final)
			end
			written[p] = nil
		end
	end)
	task.spawn(function()
		while true do
			task.wait(cfg.cardSeconds)
			for _, p in Players:GetPlayers() do
				if not writing[p] then
					task.spawn(save, p)
				end
			end
		end
	end)
	task.spawn(function()
		while true do
			local ok, err = pcall(refresh)
			if not ok then
				warn("[CampHologram] refresh: " .. tostring(err))
			end
			task.wait(Config.camp.scaleSeconds)
		end
	end)
end
return Holo
