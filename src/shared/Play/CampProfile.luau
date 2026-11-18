--!strict
local Config = require(script.Parent.Parent.Config)
local Worlds = require(script.Parent.Parent.Mine.Worlds)
local Ranks = require(script.Parent.Ranks)
local Camp = {}

function Camp.day(now: number): number
	return math.floor(now / Config.familyRules.daySeconds)
end

-- The ISO year is the calendar year of the Thursday in the same UTC week.
function Camp.week(now: number): string
	local date = os.date("!*t", now) :: any
	local thursday =
		os.date("!*t", now + (3 - (date.wday + 5) % 7) * Config.familyRules.daySeconds) :: any
	return string.format("%04dW%02d", thursday.year, 1 + (thursday.yday - 1) // 7)
end

local function count(value: any): boolean
	return type(value) == "number"
		and value >= 0
		and value <= Config.game.maxExactInteger
		and value % 1 == 0
end

function Camp.initialize(p: any, now: number)
	local best = if count(p.deepestWorld)
			and p.deepestWorld >= 1
			and p.deepestWorld <= #Config.worlds
		then Worlds.at(p.deepestWorld).start
		else 0
	for _, depth in
		{
			p.bestDepth,
			p.recordDepth,
			p.maxDepth,
			type(p.stats) == "table" and p.stats.bestDepth,
			type(p.mine) == "table" and p.mine.front,
		}
	do
		if count(depth) then
			best = math.max(best, depth)
		end
	end
	p.bestDepth, p.likes, p.duelWins = best, 0, 0
	p.likesGiven = { day = Camp.day(now), ids = {} }
	p.duelRewardsToday = { day = Camp.day(now), count = 0 }
	p.weekBest = { week = Camp.week(now), depth = 0 }
	p.settings.guests, p.settings.hideOthersFx, p.settings.hideReactions = "friends", false, false
end

function Camp.valid(p: any): boolean
	if
		not count(p.bestDepth)
		or not count(p.likes)
		or not count(p.duelWins)
		or type(p.likesGiven) ~= "table"
		or not count(p.likesGiven.day)
		or type(p.likesGiven.ids) ~= "table"
		or type(p.duelRewardsToday) ~= "table"
		or not count(p.duelRewardsToday.day)
		or not count(p.duelRewardsToday.count)
		or type(p.weekBest) ~= "table"
		or type(p.weekBest.week) ~= "string"
		or not p.weekBest.week:match("^%d%d%d%dW%d%d$")
		or not count(p.weekBest.depth)
		or type(p.settings) ~= "table"
		or not table.find({ "none", "friends", "all" }, p.settings.guests)
		or type(p.settings.hideOthersFx) ~= "boolean"
		or type(p.settings.hideReactions) ~= "boolean"
	then
		return false
	end
	for id, value in p.likesGiven.ids do
		if type(id) ~= "string" or not id:match("^%-?%d+$") or value ~= true then
			return false
		end
	end
	return true
end

function Camp.advance(p: any, front: number, week: string)
	p.bestDepth = math.max(p.bestDepth, front)
	if p.weekBest.week ~= week then
		p.weekBest = { week = week, depth = 0 }
	end
	p.weekBest.depth = math.max(p.weekBest.depth, front)
end

function Camp.card(p: any, name: string): any
	local picks = {}
	for id, item in p.collection do
		if item.count + item.golden > 0 then
			table.insert(picks, id)
		end
	end
	local function order(id: string): number
		local pick = Config.pickaxes[id]
		local rarity = Config.progress.rarities[pick.rarity].stars
		local family = table.find(Config.familyRules.order, pick.family)
			or (#Config.familyRules.order + 1)
		return rarity * 100 + (if p.collection[id].golden > 0 then 10 else 0) - family
	end
	table.sort(picks, function(a, b)
		return order(a) > order(b)
	end)
	while #picks > 3 do
		table.remove(picks)
	end
	local rank = Ranks.of(p.cups)
	return {
		name = name,
		rank = if rank then rank.id else "none",
		bestDepth = p.bestDepth,
		likes = p.likes,
		duelWins = p.duelWins,
		pick = p.pickaxe,
		golden = p.pickaxeGolden,
		showcase = picks,
	}
end
return Camp
