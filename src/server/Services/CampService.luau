--!strict
local RS = game:GetService("ReplicatedStorage")
local Http = game:GetService("HttpService")
local Config = require(RS.Shared.Config)
local CampProfile = require(RS.Shared.Play.CampProfile)
local Worlds = require(RS.Shared.Mine.Worlds)
local Persistence = require(RS.Shared.Persistence)
local Builder = require(script.Parent.Parent.Camp.CampBuilder)
local Profiles = require(script.Parent.ProfileService)
local Mines = require(script.Parent.MineService)
local Plots = require(script.Parent.PlotService)
local Camp = {}
local walkSpeeds: { [Humanoid]: number } = setmetatable({}, { __mode = "k" })
local function movement(player: Player)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	local outside = not Plots.onOwnPlatform(player) and not player:GetAttribute("GuestPlot")
	if outside then
		if walkSpeeds[hum] == nil and hum.WalkSpeed > 0 then
			walkSpeeds[hum] = hum.WalkSpeed
			hum.WalkSpeed = Config.camp.walkSpeed
		end
	elseif walkSpeeds[hum] then
		if hum.WalkSpeed == Config.camp.walkSpeed then
			hum.WalkSpeed = walkSpeeds[hum]
		end
		walkSpeeds[hum] = nil
	end
end
local previous: { [number]: any } = {}
local holograms: { [number]: any } = {}

function Camp.hologram(plot: number, data: any?)
	holograms[plot] = data
end

local function rootSettings(owner: Player, model: Model)
	model:SetAttribute(
		"CampGuests",
		Profiles.Read(owner, function(p)
			return p.settings.guests
		end)
	)
	model:SetAttribute("AtWall", Plots.onOwnPlatform(owner))
	model:SetAttribute(
		"Busy",
		owner:GetAttribute("InDuel") == true or owner:GetAttribute("GuestPlot") ~= nil
	)
end
local function update(i: number)
	local entry = Builder.get(i)
	if not entry then
		return
	end
	local owner = Plots.owner(i)
	local session = owner and Mines.get(owner)
	local holo = if owner then nil else holograms[i]
	local gilded = {}
	local card = if owner
		then Profiles.Read(owner, function(p)
			local live = CampProfile.card(p, owner.DisplayName)
			for _, id in live.showcase do
				gilded[id] = p.collection[id].golden > 0
			end
			return live
		end)
		else holo and holo.card
	local depth = if session then session.state.front else card and card.bestDepth or 0
	local world = Worlds.of(depth)
	if owner then
		rootSettings(owner, entry.model)
	end
	local id = if owner then owner.UserId else holo and holo.userId
	local root = entry.model
	if owner then
		owner:SetAttribute("CampRank", card and card.rank)
		owner:SetAttribute("CampBest", card and card.bestDepth)
	end
	root:SetAttribute("CampFront", if session then depth else nil)
	local data =
		{ card = card, id = id, world = world.index, place = holo and holo.place, gilded = gilded }
	if Persistence.equal(previous[i], data) then
		return
	end
	previous[i] = data
	root:SetAttribute("CampUser", id)
	root:SetAttribute("CampRank", card and card.rank)
	root:SetAttribute("Hologram", holo ~= nil)
	root:SetAttribute("WeekPlace", holo and holo.place)
	root:SetAttribute("CampCard", if card then Http:JSONEncode(card) else nil)
	entry.setLook(if card then card.rank else "none", owner ~= nil)
	entry.setLight(
		if card then Color3.fromHex(Config.art.worlds[world.id].light) else nil,
		holo ~= nil
	)
	entry.setPlaque({
		name = card and card.name,
		rank = card and card.rank,
		depth = card and card.bestDepth,
		likes = card and card.likes,
		hologram = holo ~= nil,
		place = holo and holo.place,
	})
	for j, a in entry.showcase do
		local pick = if not card then nil elseif j == 1 then card.pick else card.showcase[j - 1]
		a:SetAttribute("Pick", pick)
		a:SetAttribute(
			"Golden",
			card ~= nil and (if j == 1 then card.golden else gilded[pick] == true)
		)
	end
end

function Camp.Start()
	task.spawn(function()
		while true do
			for i = 1, Config.plots.count do
				update(i)
			end
			local record = 0
			for i = 1, Config.plots.count do
				local owner = Plots.owner(i)
				if owner then
					record = math.max(record, owner:GetAttribute("CampBest") or 0)
				end
			end
			local crown = Builder.scale.pillar.Parent:FindFirstChild("BestWorld")
			local world = Worlds.of(record)
			crown.Color = Color3.fromHex(Config.art.worlds[world.id].light)
			if crown:GetAttribute("World") ~= world.index then
				crown:SetAttribute("World", world.index)
				crown.WorldBadge.World.Text = "🌐 " .. tostring(world.index)
			end
			for _, player in game:GetService("Players"):GetPlayers() do
				movement(player)
			end
			task.wait(Config.social.positionSeconds)
		end
	end)
end
return Camp
