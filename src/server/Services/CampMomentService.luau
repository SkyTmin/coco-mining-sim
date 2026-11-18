--!strict
local Shared = game:GetService("ReplicatedStorage").Shared
local Messaging = game:GetService("MessagingService")
local Run = game:GetService("RunService")
local Config = require(Shared.Config)
local Remotes = require(Shared.Remotes)
local Moments = {}
local queue = {}
local stream = nil
local topic = "CMS_Core"
local source = ""
local rarityColors =
	{ wood = "BB986D", common = "A9DB93", rare = "69BBEE", epic = "C78EFF", legendary = "FFCB59" }
function Moments.emit(s: any, kind: string, color: string?, pick: string?)
	if not stream then
		return
	end
	table.insert(
		queue,
		{ kind = kind, plot = s.plot, id = s.player.UserId, color = color, pick = pick }
	)
end
function Moments.pick(s: any, id: string, opened: boolean)
	local pick = Config.pickaxes[id]
	if not pick then
		return
	end
	if opened then
		Moments.emit(s, "pickChest", rarityColors[pick.rarity], id)
	end
	if pick.rarity == "legendary" then
		Moments.emit(s, "legendary", rarityColors.legendary, id)
	end
end
function Moments.hit(s: any, outcome: any, ability: boolean)
	if not stream then
		return
	end
	Moments.emit(s, "swing")
	if ability then
		Moments.emit(s, "ult", "B4DDFF")
	elseif #outcome.events > 0 and outcome.pick and outcome.pick.family == "storm" then
		Moments.emit(s, "spark", "9EE7FF")
	end
	if outcome.res.plateBroken then
		local color = Config.art.worlds[Config.worlds[outcome.world].id].light
		Moments.emit(s, "plate", color)
		if outcome.oldWorld == #Config.worlds then
			Moments.emit(s, "core", color)
			Remotes.event("CampSignal"):FireAllClients("core", s.player.DisplayName)
			local data = { name = s.player.DisplayName, source = source }
			task.spawn(function()
				local ok, err = pcall(Messaging.PublishAsync, Messaging, topic, data)
				if not ok then
					warn("[CampCore] publish: " .. tostring(err))
				end
			end)
		end
	end
	for _, reward in outcome.rewards do
		if reward.pick then
			Moments.pick(s, reward.pick.id, false)
		end
	end
end
function Moments.Start()
	if Run:IsStudio() then
		topic = "CMS_Core_QA"
	end
	source = game:GetService("HttpService"):GenerateGUID(false)
	stream = Remotes.unreliable("CampMoments")
	Remotes.event("CampSignal")
	task.spawn(function()
		while true do
			local ok, err = pcall(Messaging.SubscribeAsync, Messaging, topic, function(message)
				local d = message.Data
				if type(d) == "table" and d.source ~= source and type(d.name) == "string" then
					Remotes.event("CampSignal"):FireAllClients("core", d.name)
				end
			end)
			if ok then
				break
			end
			warn("[CampCore] subscribe: " .. tostring(err))
			task.wait(Config.social.boardSeconds)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(0.15)
			local batch = queue
			queue = {}
			-- Leave headroom under the unreliable remote's 1000-byte payload limit.
			for i = 1, #batch, 4 do
				stream:FireAllClients(table.move(batch, i, math.min(i + 3, #batch), 1, {}))
			end
		end
	end)
end
return Moments
