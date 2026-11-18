--!strict
local Players = game:GetService("Players")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Circle = require(Shared.Play.Circle)
local Duel = require(Shared.Play.Duel)
local Camp = require(Shared.Play.CampProfile)
local Profiles = require(script.Parent.ProfileService)
local Mines = require(script.Parent.MineService)
local Plots = require(script.Parent.PlotService)
local Social = require(script.Parent.SocialService)
local Guest = require(script.Parent.GuestService)
local Visit = require(script.Parent.VisitService)
local Analytics = require(script.Parent.Analytics)
local Pickaxe = require(script.Parent.PickaxeService)
local Builder = require(script.Parent.Parent.Camp.CampBuilder)
local Service = {}
local active, cooldowns = {}, {}
local cfg = Config.social
local function ready(p: Player): boolean
	local s = Mines.get(p)
	return s ~= nil
		and not active[p]
		and not p:GetAttribute("GuestPlot")
		and not p:GetAttribute("MineRebirthTransition")
		and not (s.ultUntil and os.clock() < s.ultUntil)
		and Plots.onOwnPlatform(p)
		and (p.UserId < 0 or p.Parent == Players)
end
local function signal(p: Player, ...: any)
	if p.Parent == Players then
		Remotes.event("CampSignal"):FireClient(p, ...)
	end
end
local function finish(gameplay: any, quit: Player?)
	if gameplay.finished then
		return
	end
	gameplay.finished = true
	local a, b = gameplay.a, gameplay.b
	local scores = { gameplay.walls[a].state.front, gameplay.walls[b].state.front }
	local left, right =
		Duel.outcome(scores[1], scores[2], if quit == a then "a" elseif quit == b then "b" else nil)
	for _, conn in gameplay.connections do
		conn:Disconnect()
	end
	for i, p in { a, b } do
		local label = if i == 1 then left else right
		active[p] = nil
		Mines.duelView(p, nil)
		p:SetAttribute("InDuel", nil)
		if p.Character then
			Pickaxe.attachDisplay(
				p.Character,
				p:GetAttribute("MinePickaxe") or "starter",
				p:GetAttribute("MinePickaxeGolden") == true
			)
		end
		local s = Mines.get(p)
		if s then
			Mines.window(s, "reset")
			local entrance = Builder.get(s.plot)
			if entrance then
				entrance.setDuel(nil, nil)
			end
		end
		local coins = 0
		if not quit then
			Profiles.Mutate(p, function(profile)
				coins = Duel.reward(
					profile,
					label,
					false,
					Camp.day(os.time()),
					gameplay.rates[p],
					math.random()
				)
			end)
		end
		signal(p, "duelEnd", label, scores[i], scores[3 - i], coins, quit ~= nil)
		if p.Parent == Players then
			Analytics.event(p, "duel_end", scores[i], if quit then "aborted" else label)
		end
	end
end
function Service.abort(p: Player)
	if active[p] then
		finish(active[p], p)
	end
end
local function start(a: Player, b: Player)
	if not ready(a) or not ready(b) then
		return
	end
	local at = workspace:GetServerTimeNow() + cfg.countdown
	local match = {
		a = a,
		b = b,
		walls = {},
		rates = {},
		connections = {},
		start = at,
		stop = at + cfg.duelSeconds,
		finished = false,
	}
	local seed = math.random(1, Config.rebirth.seedMax)
	for _, p in { a, b } do
		local s = Mines.get(p)
		local wall = {
			state = Duel.wall(seed),
			player = p,
			plot = s.plot,
			charge = 0,
			perks = s.perks,
			duel = true,
			nextHit = 0,
		}
		match.walls[p] = wall
		match.rates[p] = Profiles.Read(p, function(profile)
			return Circle.coinsPerMinute(profile, s.state.front)
		end) or 0
		active[p] = match
		Visit.clear(s.plot)
		Visit.leave(p)
		p.Character:PivotTo(Plots.digFrame(p))
		p:SetAttribute("InDuel", true)
		Pickaxe.attachDisplay(p.Character, "starter", false)
		Mines.duelView(p, wall)
		Mines.window(wall, "reset")
		local hum = p.Character:FindFirstChildOfClass("Humanoid")
		if hum then
			table.insert(
				match.connections,
				hum.Died:Connect(function()
					Service.abort(p)
				end)
			)
		end
		if p.Parent == Players then
			table.insert(
				match.connections,
				p.OnTeleport:Connect(function(state)
					if state ~= Enum.TeleportState.Failed then
						Service.abort(p)
					end
				end)
			)
			table.insert(
				match.connections,
				p.CharacterRemoving:Connect(function()
					Service.abort(p)
				end)
			)
			Analytics.event(p, "duel_start", 1, "")
		end
		signal(p, "duelStart", a.DisplayName, b.DisplayName, at, match.stop)
	end
	task.spawn(function()
		while not match.finished do
			local now = workspace:GetServerTimeNow()
			for _, p in { a, b } do
				if not Plots.onOwnPlatform(p) then
					finish(match, p)
					return
				end
			end
			local x, y = match.walls[a].state.front, match.walls[b].state.front
			for _, p in { a, b } do
				local entrance = Builder.get(match.walls[p].plot)
				if entrance then
					entrance.setDuel(x, y, a.DisplayName, b.DisplayName)
				end
				signal(p, "score", x, y)
			end
			if now >= match.stop then
				finish(match, nil)
				break
			end
			task.wait(cfg.scoreSeconds)
		end
	end)
end
function Service.intent(p: Player, intent: any): boolean
	local match = active[p]
	if not match then
		return false
	end
	local wall = match.walls[p]
	local now = workspace:GetServerTimeNow()
	if intent.op == "Resync" then
		if now >= (wall.resyncAt or 0) and p.Parent == Players then
			wall.resyncAt = now + 0.5
			Mines.window(wall, nil, p)
		end
		return true
	end
	if intent.op == "DigStop" then
		return true
	end
	local res = nil
	if
		intent.op == "Hit"
		and now >= match.start
		and now < match.stop
		and now >= wall.nextHit
		and Plots.onOwnPlatform(p)
	then
		res = Duel.hit(wall.state, intent.x, intent.y, intent.dRel)
	end
	if res then
		wall.nextHit = now + Config.progress.hitSizes[1].interval
		res.seq, res.plot = intent.seq, wall.plot
		Mines.result(wall, res)
	elseif p.Parent == Players then
		Mines.reject(p, wall, intent.seq)
	end
	return true
end
function Service.Start()
	Social.handle("duel", function(from, to)
		if
			not to
			or to == from
			or not ready(from)
			or not ready(to)
			or os.clock() < (cooldowns[from] or 0)
		then
			return
		end
		cooldowns[from] = os.clock() + cfg.challengeCooldown
		from:SetAttribute("DuelReadyAt", workspace:GetServerTimeNow() + cfg.challengeCooldown)
		Guest.offer(from, to, "duel", function()
			start(from, to)
		end)
	end)
	Players.PlayerRemoving:Connect(function(p)
		Service.abort(p)
		cooldowns[p] = nil
	end)
end
return Service
