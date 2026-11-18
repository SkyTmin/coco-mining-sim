--!strict
-- Studio actors use the real plot, mining, guest and duel code. Their profiles live only in memory.
local Players = game:GetService("Players")
local Run = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Defaults = require(Shared.Play.ProfileDefaults)
local State = require(Shared.Mine.MineState)
local Power = require(Shared.Play.Power)
local Worlds = require(Shared.Mine.Worlds)
local Strings = require(Shared.Strings)
local Wire = require(Shared.Mine.MineWire)
local Profiles = require(script.Parent.ProfileService)
local Mines = require(script.Parent.MineService)
local Plots = require(script.Parent.PlotService)
local Hit = require(script.Parent.HitService)
local Pickaxe = require(script.Parent.PickaxeService)
local Visit = require(script.Parent.VisitService)
local Duel = require(script.Parent.DuelService)
local Guest = require(script.Parent.GuestService)
local Bots = {}
local bots = {}
local wanted = 0
local reconciling = false
local function remove()
	local b = table.remove(bots)
	if not b then
		return
	end
	Duel.abort(b)
	Visit.leave(b)
	Visit.clear(Plots.get(b))
	Mines.closeBot(b)
	Plots.release(b)
	Profiles.bot(b, nil)
	b.Character:Destroy()
end
local function create(i: number, locale: string): boolean
	local desc = Instance.new("HumanoidDescription")
	local rgb = Config.worlds[i].color
	desc.TorsoColor = Color3.fromRGB(rgb[1], rgb[2], rgb[3])
	local ok, rig = pcall(
		Players.CreateHumanoidModelFromDescriptionAsync,
		Players,
		desc,
		Enum.HumanoidRigType.R15
	)
	desc:Destroy()
	if not ok then
		warn("[CampBots] " .. tostring(rig))
		return false
	end
	if #bots + 1 ~= i or wanted < i then
		rig:Destroy()
		return false
	end
	local name = Strings.t("camp_bot", locale, i)
	local id = -1000 - i
	local actor = {
		UserId = id,
		DisplayName = name,
		Name = "CampBot_" .. i,
		Character = rig,
		GetAttribute = function(_, k)
			return rig:GetAttribute(k)
		end,
		SetAttribute = function(_, k, v)
			rig:SetAttribute(k, v)
		end,
	}
	rig.Name = actor.Name
	rig:SetAttribute("CampBot", true)
	rig:SetAttribute("CampUser", id)
	rig:SetAttribute("CampName", name)
	local plot = Plots.assign(actor :: any)
	if not plot then
		rig:Destroy()
		return false
	end
	rig.Parent = workspace.Camp
	rig.HumanoidRootPart.Anchored = true
	rig.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	rig:PivotTo(Plots.digFrame(actor :: any))
	local p = Defaults.new(os.time())
	local family = Config.familyRules.order[(i - 1) % #Config.familyRules.order + 1]
	local rarity = Config.familyRules.rarities[(i - 1) % #Config.familyRules.rarities + 1]
	p.family, p.pickaxe, p.cups = family, family .. "_" .. rarity, Config.rebirth.ranks[i].cups
	for j = 1, #Config.familyRules.rarities do
		local f = Config.familyRules.order[(i + j - 2) % #Config.familyRules.order + 1]
		local id = f .. "_" .. Config.familyRules.rarities[j]
		p.collection[id] = { count = 1, golden = if i == j then 1 else 0 }
	end
	p.pickaxeGolden = i % 3 == 0
	p.collection[p.pickaxe] = { count = 1, golden = if p.pickaxeGolden then 1 else 0 }
	p.deepestWorld, p.circle.hitSize = i, math.min(i, #Config.progress.hitSizes)
	p.circle.pickLevels[p.pickaxe] =
		math.min(1 + 3 * (i - 1), Power.cap(Config.progress.rarities[rarity], p.pickaxeGolden))
	p.settings.guests = "all"
	p.bestDepth = Worlds.at(i).start
	Profiles.bot(actor, p)
	rig:SetAttribute("MinePickaxe", p.pickaxe)
	local state = State.new(601 + i, p.width, Config.mine.height, p.bestDepth)
	Mines.openBot(actor, p, state, plot)
	rig:SetAttribute("MinePickaxeGolden", p.pickaxeGolden)
	Pickaxe.attachDisplay(rig, p.pickaxe, p.pickaxeGolden)
	table.insert(bots, actor)
	game:GetService("CollectionService"):AddTag(rig, "CampBot")
	return true
end
function Bots.set(n: any, locale: string)
	if
		not Run:IsStudio()
		or type(n) ~= "number"
		or n % 1 ~= 0
		or n < 0
		or n >= Config.plots.count
	then
		return
	end
	wanted = math.min(n, Config.plots.count - #Players:GetPlayers())
	if reconciling then
		return
	end
	reconciling = true
	task.spawn(function()
		while #bots ~= wanted do
			if #bots > wanted then
				remove()
			elseif not create(#bots + 1, locale) then
				break
			end
		end
		reconciling = false
	end)
end
function Bots.helper(host: Player)
	if not Run:IsStudio() then
		return
	end
	for _, b in bots do
		if not Visit.get(b) and not b:GetAttribute("InDuel") then
			Guest.request(b, host)
			return
		end
	end
end
local function step(b: any)
	local visit = Visit.get(b)
	local s = if visit and visit.role == "guest" then Mines.get(visit.owner) else Mines.display(b)
	if not s then
		return
	end
	local st = s.state
	local best = nil
	for x = -(st.width - 1) // 2, (st.width - 1) // 2 do
		for y = 0, st.height - 1 do
			if
				State.isSolid(st, x, y, st.front) and (not best or math.abs(x) < math.abs(best.x))
			then
				best = { x = x, y = y }
			end
		end
	end
	if not best then
		return
	end
	local ability = not visit and not s.duel and s.charge >= Config.mine.ultCharge
	Hit.botIntent(b, Wire.encodeIntent(if ability then "Ability" else "Hit", 0, best.x, best.y, 0))
	local shoulder = b.Character:FindFirstChild("RightShoulder", true)
	if shoulder and shoulder:IsA("Motor6D") then
		local base = shoulder:GetAttribute("Rest") or shoulder.C0
		shoulder:SetAttribute("Rest", base)
		shoulder.C0 = base * CFrame.Angles(-0.85, 0, -0.12)
		game:GetService("TweenService"):Create(shoulder, TweenInfo.new(0.32), { C0 = base }):Play()
	end
end
function Bots.Start()
	if not Run:IsStudio() then
		return
	end
	Plots.evictBot = function()
		if #bots > 0 then
			wanted = math.min(wanted, #bots - 1)
			remove()
			return true
		end
		return false
	end
	task.spawn(function()
		while true do
			for _, b in bots do
				step(b)
			end
			task.wait(Config.social.botSeconds)
		end
	end)
end
return Bots
