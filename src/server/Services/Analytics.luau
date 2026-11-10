--!strict

local AnalyticsService = game:GetService("AnalyticsService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Shared = game:GetService("ReplicatedStorage").Shared
local Upgrade = require(Shared.Play.Upgrade)
local ProfileService = require(script.Parent.ProfileService)
local MineService = require(script.Parent.MineService)
local ServerLog = require(script.Parent.ServerLog)

local studio = RunService:IsStudio()
local field01 = Enum.AnalyticsCustomFieldKeys.CustomField01.Name
local field02 = Enum.AnalyticsCustomFieldKeys.CustomField02.Name
local steps = {
	"First Hit",
	"First Block",
	"First Ride",
	"First Ultimate",
	"Hit Size 2",
	"Hit Size 3",
	"First Pickaxe Level",
	"Slab 1",
	"First Card",
	"Width 7",
	"Hit Size 5",
	"Slab 2",
	"First Transformation",
	"Slab 3",
}
local scheduled: { [Player]: boolean } = {}
local failed: { [Player]: boolean } = {}
local Analytics = {}

local function logCustom(
	player: Player,
	event: string,
	value: number,
	first: string,
	second: string?
)
	local ok = true
	if not studio then
		ok = pcall(function()
			AnalyticsService:LogCustomEvent(
				player,
				event,
				value,
				{ [field01] = first, [field02] = second }
			)
		end)
	end
	if studio or not ok then
		ServerLog.analytics(
			string.format(
				"%s value=%s field1=%s field2=%s",
				event,
				tostring(value),
				first,
				second or "-"
			),
			not ok
		)
	end
end

local function flush(player: Player)
	for step, name in steps do
		local key, seen = tostring(step), "seen:" .. step
		local state = ProfileService.Read(player, function(profile)
			return if profile.funnel[key]
				then "sent"
				elseif profile.funnel[seen] then "ready"
				else "wait"
		end)
		if state == "sent" then
			continue
		end
		if state ~= "ready" then
			break
		end
		local ok = true
		if not studio then
			ok = pcall(function()
				AnalyticsService:LogOnboardingFunnelStepEvent(player, step, name)
			end)
		end
		if studio or not ok then
			ServerLog.analytics(string.format("onboarding step=%d %s", step, name), not ok)
		end
		if not ok then
			failed[player] = true
			break
		end
		ProfileService.Mutate(player, function(profile)
			profile.funnel[key], profile.funnel[seen] = true, nil
		end)
	end
end

local function reached(player: Player, milestones: { number })
	if #milestones == 0 then
		return
	end
	local hasNew = ProfileService.Read(player, function(profile)
		for _, step in milestones do
			if not profile.funnel[tostring(step)] and not profile.funnel["seen:" .. step] then
				return true
			end
		end
		return false
	end)
	if hasNew then
		ProfileService.Mutate(player, function(profile)
			for _, step in milestones do
				if not profile.funnel[tostring(step)] then
					profile.funnel["seen:" .. step] = true
				end
			end
		end)
		if not scheduled[player] and not failed[player] then
			scheduled[player] = true
			task.defer(function()
				flush(player)
				scheduled[player] = nil
			end)
		end
	end
end

function Analytics.mined(
	player: Player,
	ability: boolean,
	blocks: number,
	delta: number,
	oldWorld: number,
	world: number,
	plateBroken: boolean
)
	local milestones = {}
	if ability then
		table.insert(milestones, 4)
	else
		table.insert(milestones, 1)
		if blocks > 0 then
			table.insert(milestones, 2)
		end
		if delta > 0 then
			table.insert(milestones, 3)
		end
	end
	if plateBroken and oldWorld <= 3 then
		table.insert(milestones, ({ 8, 12, 14 })[oldWorld])
	end
	reached(player, milestones)
	if world > oldWorld then
		task.defer(
			logCustom,
			player,
			"world_reach",
			ProfileService.Elapsed(player),
			tostring(world)
		)
	end
end

function Analytics.purchase(
	player: Player,
	purchase: Upgrade.Purchase,
	quote: Upgrade.Quote,
	morphed: boolean
)
	local kind, level = purchase.kind, quote.level
	local milestone = if kind == "hitSize"
		then ({ [2] = 5, [3] = 6, [5] = 11 })[level]
		elseif kind == "pick" then 7
		elseif kind == "card" then 9
		elseif kind == "width" and level == 7 then 10
		else nil
	local milestones = if milestone then { milestone } else {}
	if morphed then
		table.insert(milestones, 13)
	end
	reached(player, milestones)
	task.defer(logCustom, player, "upgrade_buy", level, kind)
	if purchase.id then
		task.defer(logCustom, player, "card_level", level, purchase.id)
	end
end

function Analytics.Start()
	ProfileService.OnLoaded(function(player)
		flush(player)
	end)
	ProfileService.BeforeRelease(function(player)
		local session = MineService.get(player)
		local coins = ProfileService.Read(player, function(profile)
			return profile.coins
		end)
		if not failed[player] then
			flush(player)
		end
		logCustom(
			player,
			"session_end",
			ProfileService.Elapsed(player),
			tostring(if session then session.state.front else 0),
			tostring(coins or 0)
		)
	end)
	Players.PlayerRemoving:Connect(function(player)
		task.defer(function()
			scheduled[player], failed[player] = nil, nil
		end)
	end)
end

return Analytics
