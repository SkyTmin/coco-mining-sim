--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Social = require(script.Parent.SocialService)
local Profiles = require(script.Parent.ProfileService)
local Mines = require(script.Parent.MineService)
local Plots = require(script.Parent.PlotService)
local Visit = require(script.Parent.VisitService)
local Guest = {}
local pending, friends = {}, {}
local serial = 0

-- Token and recipient identify one expiring offer; acceptance always rechecks current state.
function Guest.offer(from: Player, to: Player, kind: string, accept: () -> ())
	if pending[to] then
		return
	end
	serial += 1
	local item = {
		from = from,
		id = serial,
		untilAt = os.clock() + Config.social.askSeconds,
		accept = accept,
	}
	pending[to] = item
	if to:GetAttribute("CampBot") then
		task.delay(Config.social.botAcceptSeconds, function()
			if pending[to] == item then
				pending[to] = nil
				accept()
			end
		end)
	else
		Remotes.event("CampSignal"):FireClient(to, "offer", kind, from.DisplayName, item.id)
	end
	task.delay(Config.social.askSeconds, function()
		if pending[to] == item then
			pending[to] = nil
		end
	end)
end

local function allowed(from: Player, to: Player): string?
	if
		to == from
		or not Mines.get(from)
		or not Mines.get(to)
		or to:GetAttribute("InDuel")
		or from:GetAttribute("InDuel")
		or to:GetAttribute("GuestPlot")
		or from:GetAttribute("GuestPlot")
	then
		return nil
	end
	local mode = Profiles.Read(to, function(p)
		return p.settings.guests
	end)
	if mode == "all" then
		return mode
	end
	if mode ~= "friends" then
		return nil
	end
	if to:GetAttribute("CampBot") or from:GetAttribute("CampBot") then
		return mode
	end
	local list = friends[to] or {}
	friends[to] = list
	if list[from] == nil then
		local ok, value = pcall(to.IsFriendsWith, to, from.UserId)
		if not ok then
			return nil
		end
		list[from] = value
	end
	return if list[from] then mode else nil
end
function Guest.request(from: Player, to: Player?)
	if not to then
		return
	end
	local mode = allowed(from, to)
	if not mode then
		return
	end
	local function start()
		if not allowed(from, to) then
			return
		end
		local plot = Plots.get(to)
		if plot and Plots.owner(plot) == to then
			Visit.move(from, plot, "guest")
		end
	end
	if mode == "all" and not to:GetAttribute("CampBot") then
		start()
	else
		Guest.offer(from, to, "guest", start)
	end
end
function Guest.Start()
	Social.handle("help", Guest.request)
	Social.handle("leave", function(p)
		local visit = Visit.get(p)
		if not visit or visit.role ~= "guest" then
			return
		end
		Visit.leave(p)
		local frame = Plots.digFrame(p)
		if p.Character and frame then
			p.Character:PivotTo(frame)
		end
	end)
	Social.handle("answer", function(p, _, reply)
		local item = pending[p]
		if
			not item
			or type(reply) ~= "table"
			or item.id ~= reply.id
			or os.clock() > item.untilAt
		then
			return
		end
		pending[p] = nil
		if reply.yes == true then
			item.accept()
		end
	end)
	Players.PlayerRemoving:Connect(function(p)
		pending[p], friends[p] = nil, nil
		for other, item in pending do
			if item.from == p then
				pending[other] = nil
			end
		end
		for _, list in friends do
			list[p] = nil
		end
	end)
end
return Guest
