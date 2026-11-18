--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Rules = require(Shared.Play.CampRules)
local Remotes = require(Shared.Remotes)
local Plots = require(script.Parent.PlotService)
local Mines = require(script.Parent.MineService)
local Analytics = require(script.Parent.Analytics)
local Visit = {}
local assignments: { [Player]: any } = {}
local roles: { [number]: { [Player]: string } } = {}
local denied: { [Player]: number } = {}
local social = Config.social
local function countViewers(plot: number)
	local n = 0
	for _, role in roles[plot] or {} do
		if role == "viewer" then
			n += 1
		end
	end
	local owner = Plots.owner(plot)
	if owner then
		owner:SetAttribute("CampViewers", n)
	end
end
function Visit.get(player: Player): any?
	return assignments[player]
end
function Visit.leave(player: Player)
	local visit = assignments[player]
	if not visit then
		return
	end
	assignments[player] = nil
	roles[visit.plot][player] = nil
	Mines.unsubscribe(player, visit.plot)
	player:SetAttribute("GuestPlot", nil)
	player:SetAttribute("WatchingPlot", nil)
	if player:GetAttribute("CampBot") and visit.role == "guest" and player.Character then
		local home = Plots.digFrame(player)
		if home then
			player.Character:PivotTo(home)
		end
	end
	countViewers(visit.plot)
	Analytics.event(
		player,
		if visit.role == "guest" then "guest_end" else "spectate_end",
		math.floor(os.clock() - visit.at),
		""
	)
end
function Visit.clear(plot: number)
	for player in roles[plot] or {} do
		Visit.leave(player)
	end
end

function Visit.join(player: Player, plot: number, role: string): boolean
	local owner = Plots.owner(plot)
	if not owner or player == owner or not Mines.get(owner) then
		return false
	end
	local current = assignments[player]
	if current and current.plot == plot and current.owner == owner and current.role == role then
		return true
	end
	local list = roles[plot] or {}
	roles[plot] = list
	if not Rules.space(list, role) then
		if denied[player] ~= plot and player.Parent == Players then
			Remotes.event("Toast"):FireClient(player, "camp_full")
		end
		denied[player] = plot
		return false
	end
	Visit.leave(player)
	denied[player] = nil
	list[player] = role
	assignments[player] = { plot = plot, owner = owner, role = role, at = os.clock() }
	player:SetAttribute("WatchingPlot", plot)
	player:SetAttribute("GuestPlot", if role == "guest" then plot else nil)
	Mines.subscribe(player, Mines.get(owner))
	countViewers(plot)
	if role == "viewer" and owner.Parent == Players then
		Remotes.event("CampNotice"):FireClient(owner, "viewer", player.UserId)
	end
	Analytics.event(player, if role == "guest" then "guest_start" else "spectate_start", 1, "")
	return true
end

function Visit.move(player: Player, plot: number, role: string): boolean
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	local frame = Plots.frame(plot)
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	if
		not root
		or not frame
		or not hum
		or hum.Health <= 0
		or not Visit.join(player, plot, role)
	then
		return false
	end
	local x = 0
	local z = Config.plots.platformDepth + Config.plots.spectatorDepth / 2
	if role == "guest" then
		local occupied = {}
		for other in roles[plot] do
			local visit = assignments[other]
			if visit.slot then
				occupied[visit.slot] = true
			end
		end
		local slot = if occupied[1] then 2 else 1
		assignments[player].slot = slot
		x = if slot == 1 then -1.5 else 1.5
		z = Config.plots.platformDepth * 0.6
	end
	player.Character:PivotTo(
		frame * CFrame.new(x * Config.mine.blockSize, 3.5, z * Config.mine.blockSize)
	)
	return true
end

local function update(player: Player)
	local current = assignments[player]
	if current then
		if
			current.role == "guest"
			and require(script.Parent.ProfileService).Read(current.owner, function(p)
					return p.settings.guests
				end)
				== "none"
		then
			Visit.leave(player)
			return
		end
		if
			Plots.owner(current.plot) == current.owner
			and Plots.inZone(
				player,
				current.plot,
				current.role,
				if current.role == "guest"
					then social.guestExitBlocks
					else social.spectatorExitBlocks
			)
		then
			return
		end
		Visit.leave(player)
	end
	for i = 1, Config.plots.count do
		local owner = Plots.owner(i)
		if owner and owner ~= player and Plots.inZone(player, i, "viewer", 0) then
			Visit.join(player, i, "viewer")
			return
		end
	end
	denied[player] = nil
end
function Visit.Start()
	Remotes.event("CampNotice")
	local rates = {}
	Remotes.event("CampWatch").OnServerEvent:Connect(function(player, plot)
		if
			type(plot) ~= "number"
			or plot % 1 ~= 0
			or os.clock() < (rates[player] or 0)
			or player:GetAttribute("GuestPlot")
			or player:GetAttribute("InDuel")
		then
			return
		end
		rates[player] = os.clock() + 1
		Visit.move(player, plot, "viewer")
	end)
	Players.PlayerRemoving:Connect(function(player)
		Visit.leave(player)
		for other, v in assignments do
			if v.owner == player then
				Visit.leave(other)
			end
		end
		denied[player], rates[player] = nil, nil
	end)
	task.spawn(function()
		while true do
			for _, player in Players:GetPlayers() do
				update(player)
			end
			for actor in assignments do
				if actor:GetAttribute("CampBot") then
					update(actor)
				end
			end
			task.wait(social.positionSeconds)
		end
	end)
end
return Visit
